import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { AndroidDevice, AndroidDeviceDocument } from '../../database/schemas/android-device.schema';
import {
  DevicePairingSession,
  DevicePairingSessionDocument,
} from '../../database/schemas/device-pairing-session.schema';
import {
  DeviceStatus,
  SimState,
  ClaimDevicePairingDto,
  DeviceHeartbeatDto,
} from '@dayaar/shared';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectModel(AndroidDevice.name) private deviceModel: Model<AndroidDeviceDocument>,
    @InjectModel(DevicePairingSession.name)
    private pairingModel: Model<DevicePairingSessionDocument>,
  ) {}

  private hashSecret(secret: string): string {
    const pepper = process.env.PAIRING_PEPPER || process.env.JWT_SECRET || 'pairing-pepper-not-configured';
    return crypto.createHmac('sha256', pepper).update(secret).digest('hex');
  }

  /**
   * Generates a short-lived (5 min) single-use pairing session.
   * Cryptographic PIN and Token hashes are stored in the database.
   */
  async createPairingSession(userId: string, organizationId: string) {
    // Generate secure 6-digit random PIN (crypto.randomInt min inclusive, max exclusive)
    const randomDigits = crypto.randomInt(100000, 1000000).toString().padStart(6, '0');
    const randomToken = crypto.randomUUID();

    const pairingCodeHash = this.hashSecret(randomDigits);
    const pairingTokenHash = this.hashSecret(randomToken);

    // 5 minutes expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate prior unclaimed sessions for this user
    await this.pairingModel.deleteMany({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
      isClaimed: false,
    });

    const session = new this.pairingModel({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
      pairingCodeHash,
      pairingTokenHash,
      expiresAt,
      isClaimed: false,
    });

    await session.save();

    return {
      pairingCode: randomDigits,
      pairingToken: randomToken,
      expiresAt,
    };
  }

  /**
   * Claim pairing session from Android device.
   * Enforces single-use, hash verification, and expiry checks.
   */
  async claimPairing(dto: ClaimDevicePairingDto) {
    const hashedCode = this.hashSecret(dto.pairingCode);
    const hashedPairingToken = this.hashSecret(dto.pairingToken);

    // Throttle: look up by token first to enforce per-session attempt lockout
    const probe = await this.pairingModel.findOne({
      pairingTokenHash: hashedPairingToken,
      isClaimed: false,
      expiresAt: { $gt: new Date() },
    });
    if (probe?.lockedUntil && probe.lockedUntil.getTime() > Date.now()) {
      throw new BadRequestException({
        success: false,
        code: 'PAIRING_LOCKED',
        message: 'Too many incorrect attempts. Generate a new code from Web CRM.',
      });
    }

    const session = await this.pairingModel.findOneAndUpdate(
      {
        pairingCodeHash: hashedCode,
        pairingTokenHash: hashedPairingToken,
        isClaimed: false,
        expiresAt: { $gt: new Date() },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lte: new Date() } }],
      },
      { $set: { isClaimed: true }, $inc: { attempts: 1 }, $setOnInsert: {} },
      { new: true },
    );

    if (!session) {
      // Increment attempt counter on token match to enable lockout after 5 fails
      if (probe) {
        const attempts = (probe.attempts || 0) + 1;
        await this.pairingModel.updateOne(
          { _id: probe._id },
          {
            $set: {
              attempts,
              lastAttemptAt: new Date(),
              ...(attempts >= 5 ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}),
            },
          },
        );
      }
      throw new BadRequestException({
        success: false,
        code: 'INVALID_OR_EXPIRED_PAIRING_CODE',
        message: 'Invalid, expired, or already claimed pairing code. Generate a new code from Web CRM.',
      });
    }

    const deviceAuthToken = crypto.randomBytes(32).toString('base64url');
    const authTokenHash = this.hashSecret(deviceAuthToken);
    const rollbackClaim = async (error: unknown): Promise<never> => {
      try {
        await this.pairingModel.updateOne(
          { _id: session._id, isClaimed: true },
          { $set: { isClaimed: false } },
        );
      } catch (rollbackError) {
        this.logger.error('Failed to release pairing session after device persistence failed.', rollbackError);
      }
      throw error;
    };

    await this.deviceModel.updateMany(
      {
        organizationId: session.organizationId,
        userId: session.userId,
        isPrimaryCallingDevice: true,
        deviceId: { $ne: dto.deviceId },
      },
      { $set: { isPrimaryCallingDevice: false } },
    ).catch(rollbackClaim);

    // Create or update device record — scoped to session org/user to prevent cross-tenant takeover.
    // A device bound to another org/user must be explicitly unpaired there first.
    const foreign = await this.deviceModel
      .exists({
        deviceId: dto.deviceId,
        $or: [
          { organizationId: { $ne: session.organizationId } },
          { userId: { $ne: session.userId } },
        ],
      })
      .catch(rollbackClaim);
    if (foreign) {
      await rollbackClaim(
        new BadRequestException({
          success: false,
          code: 'DEVICE_ALREADY_PAIRED_ELSEWHERE',
          message: 'This device is paired to another organization or user. Revoke it there first.',
        }),
      );
    }
    let device = await this.deviceModel.findOne({
      deviceId: dto.deviceId,
      organizationId: session.organizationId,
      userId: session.userId,
    }).select('+authTokenHash').catch(rollbackClaim);

    if (device) {
      device.deviceName = dto.deviceName;
      device.manufacturer = dto.manufacturer || device.manufacturer;
      device.set('model', dto.model || device.get('model'));
      device.appVersion = dto.appVersion || device.appVersion;
      device.fcmToken = dto.fcmToken || device.fcmToken;
      device.authTokenHash = authTokenHash;
      device.simState = dto.simState || device.simState;
      device.simOperator = dto.simOperator || device.simOperator;
      device.status = DeviceStatus.ONLINE;
      device.capabilities = dto.capabilities || device.capabilities;
      device.lastSeenAt = new Date();
      device.pairedAt = new Date();
      device.revokedAt = null;
      device.isPrimaryCallingDevice = true;
      await device.save().catch(rollbackClaim);
    } else {
      device = new this.deviceModel({
        organizationId: session.organizationId,
        userId: session.userId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        manufacturer: dto.manufacturer || 'Android',
        model: dto.model || 'Device',
        appVersion: dto.appVersion || '1.0.0',
        fcmToken: dto.fcmToken || null,
        authTokenHash,
        simState: dto.simState || SimState.READY,
        simOperator: dto.simOperator || 'Airtel',
        status: DeviceStatus.ONLINE,
        capabilities: dto.capabilities || { canPlaceCalls: true, canReadCallLogs: false, canSyncRecordings: false },
        isPrimaryCallingDevice: true,
        lastSeenAt: new Date(),
        pairedAt: new Date(),
      });
      await device.save().catch(rollbackClaim);
    }

    return {
      deviceId: device.deviceId,
      userId: session.userId.toString(),
      organizationId: session.organizationId.toString(),
      deviceAuthToken,
      deviceName: device.deviceName,
      status: device.status,
      simState: device.simState,
      pairedAt: device.pairedAt,
      lastSeenAt: device.lastSeenAt,
      capabilities: device.capabilities,
    };
  }

  /**
   * Process periodic device heartbeat (~15s interval).
   * Updates lastSeenAt, battery, and SIM state.
   */
  async processHeartbeat(dto: DeviceHeartbeatDto, principal: DevicePrincipal) {
    if (dto.deviceId !== principal.deviceId) {
      throw new UnauthorizedException('Device identity does not match authenticated device.');
    }

    const device = await this.deviceModel.findOne({
      _id: new Types.ObjectId(principal.id),
      organizationId: new Types.ObjectId(principal.organizationId),
      userId: new Types.ObjectId(principal.userId),
      deviceId: principal.deviceId,
      status: { $ne: DeviceStatus.REVOKED },
    });
    if (!device) {
      throw new NotFoundException('Device not found. Please re-pair device.');
    }

    const now = new Date();
    // Anti-spoof: minimum heartbeat interval 5s, monotonic check
    if (device.lastSeenAt && now.getTime() - new Date(device.lastSeenAt).getTime() < 5000) {
      // Still return success but don't advance clock on flood
      return {
        success: true,
        deviceId: device.deviceId,
        status: device.status,
        simState: device.simState,
        lastSeenAt: device.lastSeenAt,
      };
    }
    device.lastSeenAt = now;
    device.status = DeviceStatus.ONLINE;
    if (dto.simState) device.simState = dto.simState;
    if (dto.simOperator) device.simOperator = dto.simOperator;
    if (dto.capabilities) device.capabilities = { ...device.capabilities, ...dto.capabilities };

    await device.save();

    return {
      success: true,
      deviceId: device.deviceId,
      status: device.status,
      simState: device.simState,
      lastSeenAt: device.lastSeenAt,
    };
  }

  async updateFcmToken(fcmToken: string, principal: DevicePrincipal) {
    // Validate format; do NOT flip ONLINE here — heartbeat is authoritative for presence
    if (!/^[A-Za-z0-9:_-]{20,4096}$/.test(fcmToken)) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_FCM_TOKEN',
        message: 'Invalid FCM registration token format.',
      });
    }
    const result = await this.deviceModel.updateOne(
      {
        _id: new Types.ObjectId(principal.id),
        organizationId: new Types.ObjectId(principal.organizationId),
        userId: new Types.ObjectId(principal.userId),
        deviceId: principal.deviceId,
        status: { $ne: DeviceStatus.REVOKED },
      },
      { $set: { fcmToken, fcmTokenUpdatedAt: new Date() } },
    );
    if (!result.matchedCount) throw new NotFoundException('Active paired device not found.');
    return { updated: true };
  }

  /**
   * Computes dynamic presence state from lastSeenAt timestamp:
   * ONLINE: < 45s
   * STALE: 45s - 120s
   * OFFLINE: > 120s
   */
  getDynamicStatus(device: AndroidDeviceDocument): DeviceStatus {
    if (device.status === DeviceStatus.REVOKED) {
      return DeviceStatus.REVOKED;
    }
    const diffMs = Date.now() - new Date(device.lastSeenAt).getTime();
    if (diffMs < 45 * 1000) {
      return DeviceStatus.ONLINE;
    }
    if (diffMs < 120 * 1000) {
      return DeviceStatus.STALE;
    }
    return DeviceStatus.OFFLINE;
  }

  /**
   * Finds the primary calling device for a user and calculates dynamic presence and SIM readiness.
   */
  async getPrimaryDeviceForUser(userId: string, organizationId: string) {
    const device = await this.deviceModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
      isPrimaryCallingDevice: true,
      status: { $ne: DeviceStatus.REVOKED },
      authTokenHash: { $ne: null },
    });

    if (!device) {
      return null;
    }

    const dynamicStatus = this.getDynamicStatus(device);
    const isSimReady = device.simState === SimState.READY;
    const canCall = dynamicStatus === DeviceStatus.ONLINE && device.capabilities?.canPlaceCalls && isSimReady;

    return {
      id: device._id.toString(),
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      manufacturer: device.manufacturer,
      model: device.get('model') || 'Smartphone',
      appVersion: device.appVersion,
      simState: device.simState,
      simOperator: device.simOperator,
      isSimReady,
      status: dynamicStatus,
      rawStatus: device.status,
      capabilities: device.capabilities,
      isCallReady: canCall,
      lastSeenAt: device.lastSeenAt,
      pairedAt: device.pairedAt,
    };
  }

  async listDevicesForOrg(organizationId: string) {
    const devices = await this.deviceModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .populate('userId', 'name email employeeCode');

    return devices.map((d) => ({
      id: d._id.toString(),
      user: d.userId,
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      manufacturer: d.manufacturer,
      model: d.get('model') || 'Smartphone',
      simState: d.simState,
      simOperator: d.simOperator,
      status: this.getDynamicStatus(d),
      capabilities: d.capabilities,
      lastSeenAt: d.lastSeenAt,
      pairedAt: d.pairedAt,
    }));
  }

  async authenticateDevice(
    deviceId: string,
    deviceToken: string,
  ): Promise<DevicePrincipal> {
    const device = await this.deviceModel
      .findOne({
        deviceId,
        authTokenHash: this.hashSecret(deviceToken),
        status: { $ne: DeviceStatus.REVOKED },
      })
      .select('+authTokenHash');

    if (!device) {
      throw new UnauthorizedException({
        success: false,
        code: 'INVALID_DEVICE_CREDENTIALS',
        message: 'Device credentials are invalid or revoked.',
      });
    }

    return {
      id: device._id.toString(),
      deviceId: device.deviceId,
      userId: device.userId.toString(),
      organizationId: device.organizationId.toString(),
    };
  }

  async getDevicePrincipalForUser(
    deviceId: string,
    userId: string,
    organizationId: string,
  ): Promise<DevicePrincipal> {
    const device = await this.deviceModel.findOne({
      deviceId,
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
      status: { $ne: DeviceStatus.REVOKED },
    });
    if (!device) {
      throw new NotFoundException('Active device not found for this user.');
    }
    return {
      id: device._id.toString(),
      deviceId: device.deviceId,
      userId: device.userId.toString(),
      organizationId: device.organizationId.toString(),
    };
  }

  async unpairDevice(
    deviceId: string,
    organizationId: string,
    requestingUserId: string,
    isAdmin: boolean,
  ) {
    const filter: Record<string, unknown> = {
      deviceId,
      organizationId: new Types.ObjectId(organizationId),
    };
    if (!isAdmin) {
      filter.userId = new Types.ObjectId(requestingUserId);
    }

    const result = await this.deviceModel.findOneAndUpdate(
      filter,
      {
        $set: {
          status: DeviceStatus.REVOKED,
          revokedAt: new Date(),
          authTokenHash: null,
          isPrimaryCallingDevice: false,
        },
      },
      { new: true },
    );
    return {
      success: !!result,
      userId: result?.userId?.toString(),
    };
  }
}

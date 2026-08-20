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
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Generates a short-lived (5 min) single-use pairing session.
   * Cryptographic PIN and Token hashes are stored in the database.
   */
  async createPairingSession(userId: string, organizationId: string) {
    // Generate secure 6-digit random PIN
    const randomDigits = Math.floor(100000 + crypto.randomInt(900000)).toString();
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

    const session = await this.pairingModel.findOneAndUpdate(
      {
        pairingCodeHash: hashedCode,
        pairingTokenHash: hashedPairingToken,
        isClaimed: false,
        expiresAt: { $gt: new Date() },
      },
      { $set: { isClaimed: true } },
      { new: true },
    );

    if (!session) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_OR_EXPIRED_PAIRING_CODE',
        message: 'Invalid, expired, or already claimed pairing code. Generate a new code from Web CRM.',
      });
    }

    const deviceAuthToken = crypto.randomBytes(32).toString('base64url');
    const authTokenHash = this.hashSecret(deviceAuthToken);

    await this.deviceModel.updateMany(
      {
        organizationId: session.organizationId,
        userId: session.userId,
        isPrimaryCallingDevice: true,
        deviceId: { $ne: dto.deviceId },
      },
      { $set: { isPrimaryCallingDevice: false } },
    );

    // Create or update device record
    let device = await this.deviceModel.findOne({
      deviceId: dto.deviceId,
    }).select('+authTokenHash');

    if (device) {
      device.organizationId = session.organizationId;
      device.userId = session.userId;
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
      await device.save();
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
      await device.save();
    }

    return {
      deviceId: device.deviceId,
      userId: session.userId.toString(),
      organizationId: session.organizationId.toString(),
      deviceAuthToken,
      deviceName: device.deviceName,
      status: device.status,
      simState: device.simState,
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

    device.lastSeenAt = new Date();
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
    const result = await this.deviceModel.updateOne(
      {
        _id: new Types.ObjectId(principal.id),
        organizationId: new Types.ObjectId(principal.organizationId),
        userId: new Types.ObjectId(principal.userId),
        deviceId: principal.deviceId,
        status: { $ne: DeviceStatus.REVOKED },
      },
      { $set: { fcmToken, lastSeenAt: new Date(), status: DeviceStatus.ONLINE } },
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

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CallAttempt,
  CallAttemptDocument,
} from '../../database/schemas/call-attempt.schema';
import {
  CallCommand,
  CallCommandDocument,
} from '../../database/schemas/call-command.schema';
import {
  CallEvent,
  CallEventDocument,
} from '../../database/schemas/call-event.schema';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import { AndroidDevice, AndroidDeviceDocument } from '../../database/schemas/android-device.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { AndroidSimCallingProvider } from './android-sim-calling.provider';
import { StorageService } from '../storage/storage.service';
import { DevicesGateway } from '../devices/devices.gateway';
import { AuditService } from '../audit/audit.service';
import {
  CallAttemptStatus,
  CallCommandStatus,
  CallEventType,
  RecordingStatus,
  LeadStatus,
  Role,
  IAuthUser,
  SimState,
  DeviceStatus,
} from '@dayaar/shared';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';
import { extension } from 'mime-types';

@Injectable()
export class CallingService {
  private readonly logger = new Logger(CallingService.name);

  constructor(
    @InjectModel(CallAttempt.name)
    private callAttemptModel: Model<CallAttemptDocument>,
    @InjectModel(CallCommand.name)
    private callCommandModel: Model<CallCommandDocument>,
    @InjectModel(CallEvent.name)
    private callEventModel: Model<CallEventDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(AndroidDevice.name)
    private deviceModel: Model<AndroidDeviceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly simCallingProvider: AndroidSimCallingProvider,
    private readonly storageService: StorageService,
    private readonly devicesGateway: DevicesGateway,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Initiates a call from Web CRM by leadId.
   * Resolves phone number server-side, validates paired device presence & SIM readiness.
   */
  async initiateCall(leadId: string, user: IAuthUser) {
    const lead = await this.leadModel.findOne({
      _id: new Types.ObjectId(leadId),
      organizationId: new Types.ObjectId(user.organizationId),
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.assertLeadAccess(lead, user);

    // Find user's primary Android device
    const device = await this.deviceModel.findOne({
      organizationId: new Types.ObjectId(user.organizationId),
      userId: new Types.ObjectId(user.id),
      isPrimaryCallingDevice: true,
      status: { $ne: DeviceStatus.REVOKED },
      authTokenHash: { $ne: null },
    });

    if (!device) {
      throw new BadRequestException({
        success: false,
        code: 'NO_CALLING_DEVICE_CONNECTED',
        message: 'No paired company Android calling device found. Please pair your Android device first.',
      });
    }

    // Dynamic presence check
    const diffMs = Date.now() - new Date(device.lastSeenAt).getTime();
    if (diffMs > 45 * 1000) {
      throw new BadRequestException({
        success: false,
        code: 'CALLING_DEVICE_OFFLINE',
        message: `${device.deviceName} is offline or stale. Ensure the Android app is open and sending heartbeats.`,
      });
    }

    // Device capability & SIM readiness check
    if (!device.capabilities?.canPlaceCalls) {
      throw new BadRequestException({
        success: false,
        code: 'DEVICE_CALLING_DISABLED',
        message: 'Calling capability is disabled on your paired Android device.',
      });
    }

    if (device.simState !== SimState.READY) {
      throw new BadRequestException({
        success: false,
        code: 'SIM_NOT_READY',
        message: `Company SIM card is not ready (State: ${device.simState}). Please verify physical SIM insertion.`,
      });
    }

    // Server-side phone number resolution
    const phoneNumber = lead.phone;
    if (!phoneNumber) {
      throw new BadRequestException('Lead does not have a valid phone number');
    }

    // Create append-only CallAttempt record
    const callAttempt = new this.callAttemptModel({
      organizationId: new Types.ObjectId(user.organizationId),
      leadId: lead._id,
      employeeId: new Types.ObjectId(user.id),
      deviceId: device._id,
      provider: this.simCallingProvider.providerId,
      status: CallAttemptStatus.INITIATING,
      phoneNumberDialed: phoneNumber,
      countsAsAttempt: false,
      startedAt: new Date(),
    });

    await callAttempt.save();

    // Create call command via provider
    const result = await this.simCallingProvider.initiateCall({
      organizationId: user.organizationId,
      employeeId: user.id,
      leadId: lead._id.toString(),
      deviceRecordId: device._id.toString(),
      deviceId: device.deviceId,
      phoneNumber,
      callAttemptId: callAttempt._id.toString(),
    });

    // Link command ID back to attempt
    callAttempt.callCommandId = new Types.ObjectId(result.commandId) as any;
    await callAttempt.save();

    // Record CallEvent
    await this.logCallEvent({
      organizationId: user.organizationId,
      callAttemptId: callAttempt._id.toString(),
      employeeId: user.id,
      deviceId: device._id.toString(),
      type: CallEventType.CALL_COMMAND_CREATED,
      metadata: { commandId: result.commandId, phoneNumber },
    });

    // Update lead status to CALLING if currently NEW
    if (lead.status === LeadStatus.NEW) {
      lead.status = LeadStatus.CALLING;
      await lead.save();
    }

    return {
      callAttemptId: callAttempt._id.toString(),
      commandId: result.commandId,
      status: CallAttemptStatus.INITIATING,
      phoneNumber: lead.phone,
      leadName: lead.name,
    };
  }

  /**
   * Updates call state progression (DIALING -> CONNECTED -> ENDED)
   */
  async updateCallStatus(
    commandId: string,
    callAttemptId: string,
    status: CallAttemptStatus,
    device: DevicePrincipal,
    rawStatus?: string,
    durationSeconds = 0,
  ) {
    const attempt = await this.callAttemptModel.findOne({
      _id: new Types.ObjectId(callAttemptId),
      organizationId: new Types.ObjectId(device.organizationId),
      employeeId: new Types.ObjectId(device.userId),
      deviceId: new Types.ObjectId(device.id),
      callCommandId: new Types.ObjectId(commandId),
      reconciledAt: null,
    });
    const command = await this.callCommandModel.findOne({
      _id: new Types.ObjectId(commandId),
      organizationId: new Types.ObjectId(device.organizationId),
      employeeId: new Types.ObjectId(device.userId),
      deviceId: new Types.ObjectId(device.id),
      callAttemptId: new Types.ObjectId(callAttemptId),
      expiresAt: { $gt: new Date() },
    });
    if (!attempt || !command) {
      throw new NotFoundException('Active call command was not found for this device.');
    }

    attempt.status = status;
    if (rawStatus) attempt.rawStatus = rawStatus;
    if (status === CallAttemptStatus.CONNECTED && !attempt.connectedAt) {
      attempt.connectedAt = new Date();
    }
    if (durationSeconds > 0) {
      attempt.durationSeconds = durationSeconds;
    }
    await attempt.save();

    // Update command status
    const commandStatus =
      status === CallAttemptStatus.CONNECTED
        ? CallCommandStatus.CONNECTED
        : status === CallAttemptStatus.DIALING
        ? CallCommandStatus.DIALING
        : CallCommandStatus.COMPLETED;

    command.status = commandStatus;
    await command.save();

    // Emit event
    const eventType =
      status === CallAttemptStatus.DIALING
        ? CallEventType.DIALING_STARTED
        : status === CallAttemptStatus.CONNECTED
        ? CallEventType.CALL_CONNECTED
        : CallEventType.CALL_ENDED;

    await this.logCallEvent({
      organizationId: attempt.organizationId.toString(),
      callAttemptId: attempt._id.toString(),
      employeeId: attempt.employeeId.toString(),
      deviceId: attempt.deviceId ? attempt.deviceId.toString() : null,
      type: eventType,
      metadata: { rawStatus, durationSeconds },
    });

    // Broadcast to web CRM room in realtime
    this.devicesGateway.emitCallProgressToUser(attempt.employeeId.toString(), {
      callAttemptId: attempt._id.toString(),
      commandId,
      status,
      durationSeconds,
      timestamp: new Date().toISOString(),
    });

    return attempt;
  }

  /**
   * Completes a call and enforces the 4-Attempt Business Rule:
   * Only genuine customer-side failures increment attemptCount.
   * At 4 attempts, automatically transitions lead to NOT_PICKED_UP.
   */
  async completeCall(params: {
    callAttemptId: string;
    status: CallAttemptStatus;
    rawStatus?: string;
    durationSeconds?: number;
    startedAt?: Date | string;
    connectedAt?: Date | string;
    endedAt?: Date | string;
    hasRecording?: boolean;
    recordingBytes?: number;
    recordingMimeType?: string;
  }, device: DevicePrincipal) {
    const duration = params.durationSeconds || 0;
    const rawStatus = params.rawStatus || params.status;
    const normalized = this.simCallingProvider.normalizeOutcome(rawStatus, duration);
    const scope = {
      _id: new Types.ObjectId(params.callAttemptId),
      organizationId: new Types.ObjectId(device.organizationId),
      employeeId: new Types.ObjectId(device.userId),
      deviceId: new Types.ObjectId(device.id),
    };
    const now = new Date();
    const attempt = await this.callAttemptModel.findOneAndUpdate(
      { ...scope, reconciledAt: null },
      {
        $set: {
          status: normalized.status,
          rawStatus,
          countsAsAttempt: normalized.countsAsAttempt,
          durationSeconds: duration,
          endedAt: params.endedAt ? new Date(params.endedAt) : now,
          connectedAt: params.connectedAt ? new Date(params.connectedAt) : null,
          ...(params.hasRecording
            ? { recordingStatus: RecordingStatus.PENDING }
            : {}),
          reconciledAt: now,
        },
      },
      { new: true },
    );

    if (!attempt) {
      const existing = await this.callAttemptModel.findOne(scope);
      if (!existing) {
        throw new NotFoundException('Call attempt was not found for this device.');
      }
      const existingLead = await this.leadModel.findOne({
        _id: existing.leadId,
        organizationId: existing.organizationId,
      });
      return {
        success: true,
        duplicate: true,
        callAttempt: existing,
        leadAttemptCount: existingLead?.attemptCount,
        leadStatus: existingLead?.status,
      };
    }

    if (attempt.callCommandId) {
      await this.callCommandModel.updateOne(
        {
          _id: attempt.callCommandId,
          organizationId: attempt.organizationId,
          employeeId: attempt.employeeId,
          deviceId: attempt.deviceId,
          callAttemptId: attempt._id,
        },
        {
          $set: {
            status:
              normalized.status === CallAttemptStatus.FAILED
                ? CallCommandStatus.FAILED
                : CallCommandStatus.COMPLETED,
          },
        },
      );
    }

    // Log call event
    await this.logCallEvent({
      organizationId: attempt.organizationId.toString(),
      callAttemptId: attempt._id.toString(),
      employeeId: attempt.employeeId.toString(),
      deviceId: attempt.deviceId ? attempt.deviceId.toString() : null,
      type: CallEventType.CALL_LOG_RECEIVED,
      metadata: {
        status: normalized.status,
        durationSeconds: duration,
        countsAsAttempt: normalized.countsAsAttempt,
      },
    });

    // Lead Attempt Automation
    let lead = await this.leadModel.findOne({
      _id: attempt.leadId,
      organizationId: attempt.organizationId,
    });
    if (lead) {
      if (normalized.countsAsAttempt && normalized.status !== CallAttemptStatus.CONNECTED) {
        lead = await this.leadModel.findOneAndUpdate(
          { _id: attempt.leadId, organizationId: attempt.organizationId },
          { $inc: { attemptCount: 1 } },
          { new: true },
        );

        // Auto-transition to NOT_PICKED_UP upon 4 genuine unsuccessful attempts
        if (
          lead &&
          lead.attemptCount >= 4 &&
          [LeadStatus.NEW, LeadStatus.CALLING, LeadStatus.FOLLOW_UP].includes(lead.status)
        ) {
          lead.status = LeadStatus.NOT_PICKED_UP;
          this.logger.log(
            `Lead ${lead._id} reached 4 unsuccessful attempts. Automatically moved to NOT_PICKED_UP.`,
          );
        }
      }

      if (lead?.isModified()) {
        await lead.save();
      }
    }

    // Broadcast completion to web CRM
    this.devicesGateway.emitCallProgressToUser(attempt.employeeId.toString(), {
      callAttemptId: attempt._id.toString(),
      status: normalized.status,
      durationSeconds: duration,
      attemptCount: lead?.attemptCount || 0,
      leadStatus: lead?.status,
      hasRecording: params.hasRecording,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      callAttempt: attempt,
      leadAttemptCount: lead?.attemptCount,
      leadStatus: lead?.status,
    };
  }

  /**
   * Uploads an audio recording binary and attaches it to the CallAttempt.
   */
  async uploadRecording(
    callAttemptId: string,
    fileBuffer: Buffer,
    mimeType: string,
    device: DevicePrincipal,
  ) {
    const attempt = await this.callAttemptModel.findOne({
      _id: new Types.ObjectId(callAttemptId),
      organizationId: new Types.ObjectId(device.organizationId),
      employeeId: new Types.ObjectId(device.userId),
      deviceId: new Types.ObjectId(device.id),
    });
    if (!attempt) {
      throw new NotFoundException('Call attempt not found');
    }

    const fileExtension = extension(mimeType) || 'bin';
    const objectKey = `recordings/${attempt.organizationId.toString()}/${attempt._id.toString()}_${Date.now()}.${fileExtension}`;
    const saved = await this.storageService.save(objectKey, fileBuffer, mimeType);

    attempt.recordingStatus = RecordingStatus.AVAILABLE;
    attempt.recordingObjectKey = saved.objectKey;
    attempt.recordingBytes = saved.byteSize;
    attempt.recordingMimeType = saved.mimeType;
    await attempt.save();

    await this.logCallEvent({
      organizationId: attempt.organizationId.toString(),
      callAttemptId: attempt._id.toString(),
      employeeId: attempt.employeeId.toString(),
      deviceId: attempt.deviceId ? attempt.deviceId.toString() : null,
      type: CallEventType.RECORDING_AVAILABLE,
      metadata: { objectKey: saved.objectKey, byteSize: saved.byteSize },
    });

    // Notify CRM
    this.devicesGateway.emitCallProgressToUser(attempt.employeeId.toString(), {
      event: 'RECORDING_AVAILABLE',
      callAttemptId: attempt._id.toString(),
      recordingObjectKey: saved.objectKey,
    });

    return {
      success: true,
      recordingStatus: RecordingStatus.AVAILABLE,
      objectKey: saved.objectKey,
      byteSize: saved.byteSize,
    };
  }

  /**
   * Secure stream retrieval of call recording with RBAC checks and audit logging.
   */
  async getRecordingStream(callAttemptId: string, user: IAuthUser) {
    const attempt = await this.callAttemptModel.findById(callAttemptId);
    if (!attempt || !attempt.recordingObjectKey) {
      throw new NotFoundException('Recording not found for this call');
    }

    // Tenant check
    if (attempt.organizationId.toString() !== user.organizationId) {
      throw new ForbiddenException('Unauthorized organization');
    }

    // Role check: Employees can only listen to their own calls, Managers to team calls, Admin to all
    if (user.role === Role.EMPLOYEE && attempt.employeeId.toString() !== user.id) {
      throw new ForbiddenException('You can only listen to recordings of your own calls');
    }
    if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);
      if (!teamIds.some((id) => id.toString() === attempt.employeeId.toString())) {
        throw new ForbiddenException('You can only listen to recordings from your team');
      }
    }

    // Audit log recording playback
    await this.auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'CallAttempt',
      entityId: attempt._id.toString(),
      action: 'PLAY_RECORDING',
      metadata: { recordingObjectKey: attempt.recordingObjectKey },
    });

    return this.storageService.getStream(attempt.recordingObjectKey);
  }

  async getCallHistoryForLead(leadId: string, user: IAuthUser) {
    const lead = await this.leadModel.findOne({
      _id: new Types.ObjectId(leadId),
      organizationId: new Types.ObjectId(user.organizationId),
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    await this.assertLeadAccess(lead, user);

    const filter: Record<string, unknown> = {
        leadId: new Types.ObjectId(leadId),
        organizationId: new Types.ObjectId(user.organizationId),
    };
    if (user.role === Role.EMPLOYEE) {
      filter.employeeId = new Types.ObjectId(user.id);
    } else if (user.role === Role.MANAGER) {
      filter.employeeId = { $in: await this.getManagerTeamIds(user) };
    }

    return this.callAttemptModel
      .find(filter)
      .populate('employeeId', 'name email employeeCode')
      .populate('deviceId', 'deviceName model')
      .sort({ startedAt: -1 });
  }

  async getRecentCalls(
    organizationId: string,
    user: IAuthUser,
    limit = 50,
    page = 1,
  ) {
    limit = Math.min(100, Math.max(1, Number.isFinite(limit) ? limit : 50));
    page = Math.max(1, Number.isFinite(page) ? page : 1);
    const filter: any = { organizationId: new Types.ObjectId(organizationId) };
    if (user.role === Role.EMPLOYEE) {
      filter.employeeId = new Types.ObjectId(user.id);
    } else if (user.role === Role.MANAGER) {
      filter.employeeId = { $in: await this.getManagerTeamIds(user) };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.callAttemptModel
        .find(filter)
        .populate('leadId', 'name phone project status')
        .populate('employeeId', 'name email employeeCode')
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit),
      this.callAttemptModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async logCallEvent(event: {
    organizationId: string;
    callAttemptId: string;
    employeeId: string;
    deviceId?: string | null;
    type: CallEventType;
    metadata?: Record<string, any>;
  }) {
    try {
      const entry = new this.callEventModel({
        organizationId: new Types.ObjectId(event.organizationId),
        callAttemptId: new Types.ObjectId(event.callAttemptId),
        employeeId: new Types.ObjectId(event.employeeId),
        deviceId: event.deviceId ? new Types.ObjectId(event.deviceId) : null,
        type: event.type,
        metadata: event.metadata || {},
        timestamp: new Date(),
      });
      await entry.save();
    } catch (err: any) {
      this.logger.error(`Failed to record call event: ${err?.message}`, err?.stack);
    }
  }

  private async getManagerTeamIds(user: IAuthUser): Promise<Types.ObjectId[]> {
    const team = await this.userModel
      .find({
        organizationId: new Types.ObjectId(user.organizationId),
        managerId: new Types.ObjectId(user.id),
        isActive: true,
      })
      .select('_id');
    return [new Types.ObjectId(user.id), ...team.map((member) => member._id)];
  }

  private async assertLeadAccess(lead: LeadDocument, user: IAuthUser) {
    const assignedEmployeeId = lead.assignedEmployeeId?.toString();
    if (user.role === Role.EMPLOYEE && assignedEmployeeId !== user.id) {
      throw new ForbiddenException({
        success: false,
        code: 'LEAD_NOT_ASSIGNED',
        message: 'You can only access leads assigned directly to you.',
      });
    }

    if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);
      const isTeamLead = teamIds.some(
        (id) => id.toString() === assignedEmployeeId,
      );
      const isManagedDirectly = lead.assignedManagerId?.toString() === user.id;
      if (!isTeamLead && !isManagedDirectly) {
        throw new ForbiddenException('You can only access leads assigned to your team.');
      }
    }
  }
}

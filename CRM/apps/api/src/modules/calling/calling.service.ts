import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CallAttemptStatus,
  CallCommandStatus,
  CallDisposition,
  CallDispositionDto,
  CallEventType,
  CallOrigin,
  CallProviderType,
  CallSyncStatus,
  FollowUpStatus,
  IAuthUser,
  LeadStatus,
  normalizePhoneToE164,
  NotInterestedReason,
  RecordingStatus,
  Role,
  Temperature,
} from '@dayaar/shared';
import { AndroidDevice, AndroidDeviceDocument } from '../../database/schemas/android-device.schema';
import { CallAttempt, CallAttemptDocument } from '../../database/schemas/call-attempt.schema';
import { CallCommand, CallCommandDocument } from '../../database/schemas/call-command.schema';
import { CallEvent, CallEventDocument } from '../../database/schemas/call-event.schema';
import { FollowUp, FollowUpDocument } from '../../database/schemas/follow-up.schema';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';
import { StorageService } from '../storage/storage.service';
import { DevicesGateway } from '../devices/devices.gateway';
import { AndroidDialProvider } from './android-dial.provider';

@Injectable()
export class CallingService {
  constructor(
    @InjectModel(CallAttempt.name) private readonly attemptModel: Model<CallAttemptDocument>,
    @InjectModel(CallCommand.name) private readonly commandModel: Model<CallCommandDocument>,
    @InjectModel(CallEvent.name) private readonly eventModel: Model<CallEventDocument>,
    @InjectModel(Lead.name) private readonly leadModel: Model<LeadDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(AndroidDevice.name) private readonly deviceModel: Model<AndroidDeviceDocument>,
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUpDocument>,
    private readonly dialProvider: AndroidDialProvider,
    private readonly storage: StorageService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  async initiateCall(leadId: string, origin: CallOrigin, authUser: IAuthUser) {
    const [lead, employee] = await Promise.all([
      this.leadModel.findOne({
        _id: new Types.ObjectId(leadId),
        organizationId: new Types.ObjectId(authUser.organizationId),
      }),
      this.userModel.findOne({
        _id: new Types.ObjectId(authUser.id),
        organizationId: new Types.ObjectId(authUser.organizationId),
        isActive: true,
      }),
    ]);
    if (!lead) throw new NotFoundException('Lead not found.');
    if (!employee) throw new ForbiddenException('Employee account is inactive.');
    if (!employee.callingEnabled) {
      throw new ForbiddenException({
        code: 'CALLING_NOT_ENABLED',
        message: 'This user does not have an active calling seat.',
      });
    }
    await this.assertLeadAccess(lead, authUser);
    const phoneNumber = normalizePhoneToE164(lead.phone);
    const employeePhoneNumber = normalizePhoneToE164(employee.phone);
    if (!phoneNumber || !employeePhoneNumber) {
      throw new BadRequestException('Lead and employee calling numbers must be valid.');
    }

    const redialGapSeconds = Math.max(0, Number(process.env.MIN_REDIAL_GAP_SECONDS || 180));
    const recentPending = await this.attemptModel.exists({
      organizationId: employee.organizationId,
      employeeId: employee._id,
      phoneNumber,
      providerCallId: null,
      dialedAt: { $gte: new Date(Date.now() - redialGapSeconds * 1000) },
      status: { $nin: [CallAttemptStatus.CANCELLED, CallAttemptStatus.FAILED] },
    });
    if (recentPending) {
      throw new BadRequestException({
        code: 'REDIAL_GAP_ACTIVE',
        message: `Wait ${redialGapSeconds} seconds before redialling the same lead.`,
      });
    }

    let device: AndroidDeviceDocument | null = null;
    if (origin === CallOrigin.WEB) {
      device = await this.deviceModel.findOne({
        organizationId: employee.organizationId,
        userId: employee._id,
        isPrimaryCallingDevice: true,
        status: { $ne: 'REVOKED' },
        authTokenHash: { $ne: null },
        fcmToken: { $type: 'string', $ne: '' },
      });
      if (!device?.fcmToken) {
        throw new BadRequestException({
          code: 'NO_FCM_CALLING_DEVICE',
          message: 'Pair an Android device with a valid FCM token before calling from web.',
        });
      }
    }

    const attempt = await this.attemptModel.create({
      organizationId: employee.organizationId,
      leadId: lead._id,
      employeeId: employee._id,
      deviceId: device?._id || null,
      provider: CallProviderType.CALLYZER_SIM,
      origin,
      status: CallAttemptStatus.INITIATING,
      syncStatus: CallSyncStatus.PENDING,
      phoneNumber,
      employeePhoneNumber,
      dialedAt: new Date(),
      recordingStatus: RecordingStatus.PENDING,
      countsAsAttempt: false,
    });
    await this.logEvent(attempt, CallEventType.CALL_ATTEMPT_CREATED, { origin });

    if (origin === CallOrigin.WEB && device?.fcmToken) {
      try {
        const command = await this.dialProvider.initiateCall({
          organizationId: authUser.organizationId,
          employeeId: authUser.id,
          leadId: lead._id.toString(),
          deviceRecordId: device._id.toString(),
          fcmToken: device.fcmToken,
          phoneNumber,
          callAttemptId: attempt._id.toString(),
        });
        attempt.callCommandId = new Types.ObjectId(command.commandId) as any;
        await attempt.save();
        await this.logEvent(attempt, CallEventType.CALL_COMMAND_CREATED, {
          commandId: command.commandId,
          expiresAt: command.expiresAt,
        });
        return {
          callAttemptId: attempt._id.toString(),
          commandId: command.commandId,
          origin,
          status: attempt.status,
          commandStatus: command.status,
          expiresAt: command.expiresAt,
          leadName: lead.name,
        };
      } catch (error) {
        attempt.status = CallAttemptStatus.FAILED;
        await attempt.save();
        throw error;
      }
    }

    return {
      callAttemptId: attempt._id.toString(),
      commandId: null,
      origin,
      status: attempt.status,
      phoneNumber,
      leadName: lead.name,
    };
  }

  async updateDeviceStatus(
    callAttemptId: string,
    commandId: string | undefined,
    status: CallAttemptStatus,
    device: DevicePrincipal,
    occurredAt?: string,
  ) {
    const attempt = await this.attemptModel.findOne({
      _id: new Types.ObjectId(callAttemptId),
      organizationId: new Types.ObjectId(device.organizationId),
      employeeId: new Types.ObjectId(device.userId),
      deviceId: new Types.ObjectId(device.id),
      providerCallId: null,
    });
    if (!attempt) throw new NotFoundException('Pending call attempt not found for this device.');
    if (commandId && attempt.callCommandId?.toString() !== commandId) {
      throw new ForbiddenException('Command does not belong to this call attempt.');
    }
    const allowed = [
      CallAttemptStatus.DIALING,
      CallAttemptStatus.CANCELLED,
      CallAttemptStatus.FAILED,
      CallAttemptStatus.COMPLETED,
    ];
    if (!allowed.includes(status)) throw new BadRequestException('Unsupported device call state.');
    attempt.status = status;
    if (status === CallAttemptStatus.DIALING && !attempt.connectedAt) {
      attempt.connectedAt = null;
    }
    if ([CallAttemptStatus.COMPLETED, CallAttemptStatus.CANCELLED, CallAttemptStatus.FAILED].includes(status)) {
      attempt.endedAt = occurredAt ? new Date(occurredAt) : new Date();
    }
    await attempt.save();
    if (attempt.callCommandId) {
      const commandStatus = status === CallAttemptStatus.DIALING
        ? CallCommandStatus.DIALING
        : status === CallAttemptStatus.FAILED
          ? CallCommandStatus.FAILED
          : CallCommandStatus.COMPLETED;
      await this.commandModel.updateOne(
        { _id: attempt.callCommandId, deviceId: attempt.deviceId, expiresAt: { $gt: new Date() } },
        { $set: { status: commandStatus, acknowledgedAt: new Date() } },
      );
    }
    await this.logEvent(
      attempt,
      status === CallAttemptStatus.DIALING ? CallEventType.DIALING_STARTED : CallEventType.CALL_ENDED,
      { status, source: 'ANDROID_DEVICE' },
    );
    this.devicesGateway.emitCallProgressToUser(device.userId, {
      callAttemptId: attempt._id.toString(),
      commandId,
      status,
      timestamp: new Date().toISOString(),
    });
    return { accepted: true, authoritativeOutcomePending: true };
  }

  async recordDisposition(callAttemptId: string, dto: CallDispositionDto, user: IAuthUser) {
    const attempt = await this.attemptModel.findOne({
      _id: new Types.ObjectId(callAttemptId),
      organizationId: new Types.ObjectId(user.organizationId),
      employeeId: new Types.ObjectId(user.id),
    });
    if (!attempt?.leadId) throw new NotFoundException('Call attempt not found for this employee.');
    if (attempt.dispositionAt) {
      throw new BadRequestException('This call already has a disposition.');
    }
    attempt.disposition = dto.disposition;
    attempt.reason = dto.reason.trim();
    attempt.notes = dto.notes?.trim() || null;
    attempt.hotDetails = dto.hotDetails || null;
    attempt.followUpAt = dto.followUpAt ? new Date(dto.followUpAt) : null;
    attempt.dispositionAt = new Date();
    await attempt.save();

    const leadUpdate: Record<string, unknown> = {
      employeeNotes: dto.notes?.trim() || dto.reason.trim(),
    };
    const dispositionMap: Record<CallDisposition, { status: LeadStatus; temperature?: Temperature }> = {
      [CallDisposition.HOT]: { status: LeadStatus.HOT, temperature: Temperature.HOT },
      [CallDisposition.WARM]: { status: LeadStatus.WARM, temperature: Temperature.WARM },
      [CallDisposition.COLD]: { status: LeadStatus.COLD, temperature: Temperature.COLD },
      [CallDisposition.NOT_INTERESTED]: { status: LeadStatus.NOT_INTERESTED, temperature: Temperature.COLD },
      [CallDisposition.FOLLOW_UP]: { status: LeadStatus.FOLLOW_UP, temperature: Temperature.WARM },
    };
    const mapped = dispositionMap[dto.disposition];
    leadUpdate.status = mapped.status;
    if (mapped.temperature) leadUpdate.temperature = mapped.temperature;
    if (dto.disposition === CallDisposition.NOT_INTERESTED) {
      leadUpdate.notInterestedReason = NotInterestedReason.OTHER;
      leadUpdate.notInterestedReasonDetails = dto.reason.trim();
    } else {
      leadUpdate.notInterestedReason = null;
      leadUpdate.notInterestedReasonDetails = null;
    }
    if (dto.disposition === CallDisposition.FOLLOW_UP && dto.followUpAt) {
      leadUpdate.nextFollowUpAt = new Date(dto.followUpAt);
      await this.followUpModel.create({
        organizationId: attempt.organizationId,
        leadId: attempt.leadId,
        employeeId: attempt.employeeId,
        scheduledAt: new Date(dto.followUpAt),
        reason: dto.reason,
        notes: dto.notes || null,
        status: FollowUpStatus.PENDING,
      });
    }
    await this.leadModel.updateOne(
      { _id: attempt.leadId, organizationId: attempt.organizationId },
      { $set: leadUpdate },
    );
    await this.logEvent(attempt, CallEventType.DISPOSITION_RECORDED, {
      disposition: dto.disposition,
      reason: dto.reason,
    });
    return { success: true, callAttemptId, dispositionAt: attempt.dispositionAt };
  }

  async getCallHistoryForLead(leadId: string, user: IAuthUser) {
    const lead = await this.leadModel.findOne({
      _id: new Types.ObjectId(leadId),
      organizationId: new Types.ObjectId(user.organizationId),
    });
    if (!lead) throw new NotFoundException('Lead not found.');
    await this.assertLeadAccess(lead, user);
    const filter: Record<string, unknown> = {
      leadId: lead._id,
      organizationId: lead.organizationId,
    };
    if (user.role === Role.EMPLOYEE) filter.employeeId = new Types.ObjectId(user.id);
    if (user.role === Role.MANAGER) filter.employeeId = { $in: await this.getManagerTeamIds(user) };
    const calls = await this.attemptModel
      .find(filter)
      .select('-recordingB2Key -recordingVpsPath')
      .populate('employeeId', 'name employeeCode')
      .sort({ dialedAt: -1 })
      .lean();
    return calls.map((call) => this.serialize(call, user.role));
  }

  async getRecentCalls(user: IAuthUser, limit = 50, page = 1) {
    limit = Math.min(100, Math.max(1, limit));
    page = Math.max(1, page);
    const filter: Record<string, unknown> = { organizationId: new Types.ObjectId(user.organizationId) };
    if (user.role === Role.EMPLOYEE) filter.employeeId = new Types.ObjectId(user.id);
    if (user.role === Role.MANAGER) filter.employeeId = { $in: await this.getManagerTeamIds(user) };
    const [calls, total] = await Promise.all([
      this.attemptModel
        .find(filter)
        .select('-recordingB2Key -recordingVpsPath')
        .populate('leadId', 'name phone project status')
        .populate('employeeId', 'name employeeCode')
        .sort({ dialedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.attemptModel.countDocuments(filter),
    ]);
    return {
      data: calls.map((call) => this.serialize(call, user.role)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Resolves an authorised call attempt for recording access. Employees are
   * refused outright (spec 9) and managers are held to their own team.
   */
  private async assertRecordingAccess(callAttemptId: string, user: IAuthUser) {
    if (user.role === Role.EMPLOYEE) throw new ForbiddenException('Employees cannot access recordings.');
    const attempt = await this.attemptModel
      .findOne({
        _id: new Types.ObjectId(callAttemptId),
        organizationId: new Types.ObjectId(user.organizationId),
        recordingStatus: RecordingStatus.ARCHIVED,
      })
      .select('+recordingB2Key +recordingVpsPath +recordingUrl');
    if (!attempt || (!attempt.recordingB2Key && !attempt.recordingVpsPath && !attempt.recordingUrl)) {
      throw new NotFoundException('Archived recording not found.');
    }
    if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);
      if (!attempt.employeeId || !teamIds.some((id) => id.equals(attempt.employeeId as any))) {
        throw new ForbiddenException('Managers can only access recordings for their team.');
      }
    }
    return attempt;
  }

  async getRecordingUrl(callAttemptId: string, user: IAuthUser) {
    const attempt = await this.assertRecordingAccess(callAttemptId, user);
    // Signed URLs need a bucket. Without durable storage, hand back the
    // authenticated stream route instead of exposing any raw path.
    if (!attempt.recordingB2Key || !this.storage.primaryIsDurable()) {
      return {
        url: null,
        streamPath: `/calls/${callAttemptId}/recording-stream`,
        expiresInSeconds: null,
      };
    }
    return {
      url: await this.storage.getSignedUrl(attempt.recordingB2Key, 300),
      streamPath: null,
      expiresInSeconds: 300,
    };
  }

  async getRecordingStream(callAttemptId: string, user: IAuthUser) {
    const attempt = await this.assertRecordingAccess(callAttemptId, user);
    let buffer: Buffer;
    try {
      buffer = await this.storage.getArchivedBuffer(attempt.recordingB2Key, attempt.recordingVpsPath);
    } catch (error) {
      // If local backup was lost on ephemeral host (e.g. after a Render restart/redeploy), stream directly from provider recording URL
      if (attempt.recordingUrl) {
        const response = await fetch(attempt.recordingUrl, {
          headers: { Accept: 'audio/*,application/octet-stream' },
          signal: AbortSignal.timeout(60_000),
        });
        if (!response.ok) throw new NotFoundException('Recording could not be retrieved from provider.');
        buffer = Buffer.from(await response.arrayBuffer());
      } else {
        throw error;
      }
    }
    return {
      buffer,
      mimeType: attempt.recordingMimeType || 'audio/mpeg',
    };
  }

  private serialize(call: any, role: Role) {
    const output = { ...call };
    // Denylist both canonical and pre-refactor storage fields. Playback is URL-endpoint only.
    for (const field of [
      'recordingB2Key',
      'recordingVpsPath',
      'recordingObjectKey',
      'recordingUrl',
      'recordingPath',
      'recordingLocalPath',
      'recordingUploadUrl',
    ]) {
      delete output[field];
    }
    if (role === Role.EMPLOYEE) {
      delete output.recordingStatus;
      delete output.recordingBytes;
      delete output.recordingMimeType;
      delete output.archivedAt;
      delete output.purgedAt;
    }
    return output;
  }

  private async logEvent(attempt: CallAttemptDocument, type: CallEventType, metadata: Record<string, unknown>) {
    await this.eventModel.create({
      organizationId: attempt.organizationId,
      callAttemptId: attempt._id,
      employeeId: attempt.employeeId,
      deviceId: attempt.deviceId,
      type,
      metadata,
      timestamp: new Date(),
    });
  }

  private async getManagerTeamIds(user: IAuthUser): Promise<Types.ObjectId[]> {
    const members = await this.userModel
      .find({
        organizationId: new Types.ObjectId(user.organizationId),
        managerId: new Types.ObjectId(user.id),
        isActive: true,
      })
      .select('_id');
    return [new Types.ObjectId(user.id), ...members.map((member) => member._id)];
  }

  private async assertLeadAccess(lead: LeadDocument, user: IAuthUser) {
    const assignedEmployeeId = lead.assignedEmployeeId?.toString();
    if (user.role === Role.EMPLOYEE && assignedEmployeeId !== user.id) {
      throw new ForbiddenException('Employees can only access assigned leads.');
    }
    if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);
      const permitted = teamIds.some((id) => id.toString() === assignedEmployeeId)
        || lead.assignedManagerId?.toString() === user.id;
      if (!permitted) throw new ForbiddenException('Managers can only access their team leads.');
    }
  }
}

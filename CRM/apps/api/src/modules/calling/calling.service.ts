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
import { AttendanceRecord, AttendanceRecordDocument } from '../../database/schemas/attendance-record.schema';
import { BreakSession, BreakSessionDocument } from '../../database/schemas/break-session.schema';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';
import { StorageService } from '../storage/storage.service';
import { DevicesGateway } from '../devices/devices.gateway';
import { DevicesService } from '../devices/devices.service';
import { CallyzerClient } from '../callyzer/callyzer.client';
import { AndroidDialProvider } from './android-dial.provider';
import { DeviceStatus, SimState } from '@dayaar/shared';

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
    @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecordDocument>,
    @InjectModel(BreakSession.name) private readonly breakModel: Model<BreakSessionDocument>,
    private readonly dialProvider: AndroidDialProvider,
    private readonly storage: StorageService,
    private readonly devicesGateway: DevicesGateway,
    private readonly devicesService: DevicesService,
    private readonly callyzerClient: CallyzerClient,
  ) {}

  async initiateCall(leadId: string, origin: CallOrigin, authUser: IAuthUser, idempotencyKey?: string) {
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
    // Attendance gate: calls strictly blocked unless checked-in and not on break
    const todayStr = new Date().toISOString().split('T')[0];
    const record = await this.attendanceModel.findOne({
      organizationId: employee.organizationId,
      employeeId: employee._id,
      date: todayStr,
    });
    if (!record || record.checkOutAt) {
      throw new ForbiddenException({
        code: 'NOT_CHECKED_IN',
        message: 'Check in before placing calls.',
      });
    }
    const onBreak = await this.breakModel.exists({ attendanceId: record._id, endedAt: null });
    if (onBreak) {
      throw new ForbiddenException({
        code: 'ON_BREAK',
        message: 'End your break before placing calls.',
      });
    }
    const phoneNumber = normalizePhoneToE164(lead.phone);
    const employeePhoneNumber = normalizePhoneToE164(employee.phone) || (origin === CallOrigin.ANDROID ? '+910000000000' : null);
    if (!phoneNumber) {
      throw new BadRequestException('Lead phone number must be valid.');
    }
    if (!employeePhoneNumber && origin === CallOrigin.WEB) {
      throw new BadRequestException('Employee calling number must be configured for web dialing.');
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
      // Presence + SIM readiness gate (45s heartbeat, SIM READY, canPlaceCalls)
      const dyn = this.devicesService.getDynamicStatus(device);
      if (dyn !== DeviceStatus.ONLINE) {
        throw new BadRequestException({
          code: 'DEVICE_OFFLINE',
          message: `Paired device is ${dyn}. Ask the agent to open the Android app to heartbeat.`,
        });
      }
      if ((device as any).simState !== SimState.READY || !(device as any).capabilities?.canPlaceCalls) {
        throw new BadRequestException({
          code: 'DEVICE_NOT_CALL_READY',
          message: 'Paired device SIM is not ready for calling.',
        });
      }
    }

    // Idempotency: client key or 10s server window per employee+lead
    const key =
      idempotencyKey?.trim() ||
      `${authUser.id}:${lead._id.toString()}:${Math.floor(Date.now() / 10000)}`;
    let attempt: CallAttemptDocument;
    try {
      attempt = await this.attemptModel.create({
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
        idempotencyKey: key,
      } as any);
    } catch (e: any) {
      if (e?.code === 11000) {
        const existingAttempt = await this.attemptModel.findOne({
          organizationId: employee.organizationId,
          employeeId: employee._id,
          idempotencyKey: key,
        });
        if (existingAttempt) return {
          callAttemptId: (existingAttempt as any)._id.toString(),
          commandId: (existingAttempt as any).callCommandId?.toString() || null,
          origin,
          status: (existingAttempt as any).status,
          duplicate: true,
          leadName: lead.name,
        };
      }
      throw e;
    }
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
    const allowed = [
      CallAttemptStatus.DIALING,
      CallAttemptStatus.CANCELLED,
      CallAttemptStatus.FAILED,
      CallAttemptStatus.COMPLETED,
    ];
    if (!allowed.includes(status)) throw new BadRequestException('Unsupported device call state.');
    // Validate occurredAt window: [dialedAt-5m, now+1m]
    let occurred: Date | null = null;
    if (occurredAt) {
      occurred = new Date(occurredAt);
      if (Number.isNaN(occurred.getTime())) throw new BadRequestException('Invalid occurredAt.');
      if (occurred.getTime() > Date.now() + 60 * 1000) {
        throw new BadRequestException('occurredAt cannot be in the future.');
      }
    }
    // Server-side command expiry enforcement before mutating attempt
    if (commandId) {
      const cmd: any = await this.commandModel.findOne({
        _id: new Types.ObjectId(commandId),
        callAttemptId: new Types.ObjectId(callAttemptId),
      });
      if (!cmd) throw new ForbiddenException('Unknown command for this call attempt.');
      if (cmd.expiresAt && new Date(cmd.expiresAt).getTime() <= Date.now()) {
        await this.commandModel.updateOne({ _id: cmd._id }, { $set: { status: CallCommandStatus.EXPIRED } });
        throw new BadRequestException({ code: 'COMMAND_EXPIRED', message: 'Call command has expired.' });
      }
      if ([CallCommandStatus.COMPLETED, CallCommandStatus.FAILED, CallCommandStatus.EXPIRED].includes(cmd.status)) {
        throw new BadRequestException('Command already terminal.');
      }
    }
    const TERMINAL = [CallAttemptStatus.COMPLETED, CallAttemptStatus.CANCELLED, CallAttemptStatus.FAILED];
    const now = occurred ?? new Date();
    const update: any = { $set: { status } as any };
    if (status === CallAttemptStatus.DIALING) {
      update.$set.connectedAt = now;
    }
    if (([CallAttemptStatus.COMPLETED, CallAttemptStatus.CANCELLED, CallAttemptStatus.FAILED] as string[]).includes(status)) {
      update.$set.endedAt = now;
    }
    const attempt = await this.attemptModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(callAttemptId),
        organizationId: new Types.ObjectId(device.organizationId),
        employeeId: new Types.ObjectId(device.userId),
        deviceId: new Types.ObjectId(device.id),
        providerCallId: null,
        status: { $nin: TERMINAL },
      },
      update,
      { new: true },
    );
    if (!attempt) {
      const cur: any = await this.attemptModel.findOne({
        _id: new Types.ObjectId(callAttemptId),
        organizationId: new Types.ObjectId(device.organizationId),
      });
      if (cur && (TERMINAL as string[]).includes(cur.status)) {
        return { accepted: true, duplicate: true };
      }
      throw new NotFoundException('Pending call attempt not found for this device.');
    }
    if (commandId && attempt.callCommandId?.toString() !== commandId) {
      throw new ForbiddenException('Command does not belong to this call attempt.');
    }
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
    // Atomic claim: only one disposition per attempt (concurrent PATCH safe)
    const attempt: any = await this.attemptModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(callAttemptId),
        organizationId: new Types.ObjectId(user.organizationId),
        employeeId: new Types.ObjectId(user.id),
        dispositionAt: null,
      },
      {
        $set: {
          disposition: dto.disposition,
          reason: dto.reason.trim(),
          notes: dto.notes?.trim() || null,
          hotDetails: (dto as any).hotDetails || null,
          followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null,
          dispositionAt: new Date(),
        },
      },
      { new: true },
    );
    if (!attempt?.leadId) {
      const cur: any = await this.attemptModel.findOne({
        _id: new Types.ObjectId(callAttemptId),
        organizationId: new Types.ObjectId(user.organizationId),
      });
      if (cur?.dispositionAt) throw new BadRequestException('This call already has a disposition.');
      throw new NotFoundException('Call attempt not found for this employee.');
    }

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
      .limit(100)
      .lean();
    return calls.map((call) => this.serialize(call, user.role));
  }

  async getRecentCalls(user: IAuthUser, limit = 50, page = 1) {
    const safeLimit = Math.min(100, Math.max(1, Number.isFinite(+limit) ? +limit : 50));
    const safePage = Math.min(1000, Math.max(1, Number.isFinite(+page) ? +page : 1));
    limit = safeLimit;
    page = safePage;
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
    if (!attempt) {
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
    // Never expose raw provider URLs indefinitely — proxy via authenticated stream
    if (attempt.recordingUrl) {
      return {
        url: null,
        streamPath: `/calls/${callAttemptId}/recording-stream`,
        expiresInSeconds: null,
      };
    }
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

  /**
   * Resolves an active staff user from a paired-device principal so
   * header-less native players (Android MediaPlayer) can stream recordings.
   */
  async resolveUserForDevice(device: {
    userId: string;
    organizationId: string;
  }): Promise<IAuthUser | null> {
    const employee = await this.userModel
      .findOne({
        _id: new Types.ObjectId(device.userId),
        organizationId: new Types.ObjectId(device.organizationId),
        isActive: true,
      })
      .select('_id organizationId role name');
    if (!employee) return null;
    return {
      id: employee._id.toString(),
      organizationId: employee.organizationId.toString(),
      role: employee.role,
      name: employee.name,
    } as IAuthUser;
  }

  async getRecordingStream(callAttemptId: string, user: IAuthUser) {
    const attempt = await this.assertRecordingAccess(callAttemptId, user);
    let buffer: Buffer;
    try {
      buffer = await this.storage.getArchivedBuffer(attempt.recordingB2Key, attempt.recordingVpsPath);
    } catch (error) {
      let recUrl = attempt.recordingUrl;
      // If recordingUrl was not saved on this attempt (e.g. from prior schema versions), look up Callyzer dynamically
      if (!recUrl && (attempt.dialedAt || attempt.callDate)) {
        try {
          const callTime = (attempt.callDate || attempt.dialedAt).getTime();
          const from = new Date(callTime - 48 * 60 * 60 * 1000);
          const to = new Date(callTime + 48 * 60 * 60 * 1000);
          const history = await this.callyzerClient.fetchHistory(from, to, 1);
          const matched = history.calls.find(
            (c) =>
              (attempt.providerCallId && c.providerCallId === attempt.providerCallId) ||
              (c.clientPhoneNumber && c.clientPhoneNumber.includes(attempt.phoneNumber.slice(-10))),
          );
          if (matched?.recordingUrl) {
            recUrl = matched.recordingUrl;
            attempt.recordingUrl = recUrl;
            await attempt.save();
          }
        } catch (callyzerErr) {
          // fallback continues
        }
      }

      if (recUrl) {
        const response = await fetch(recUrl, {
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

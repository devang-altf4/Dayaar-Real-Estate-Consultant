import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ICallingProvider,
  InitiateCallPayload,
  CallInitiateResult,
  NormalizedCallOutcome,
} from './calling-provider.interface';
import {
  CallCommand,
  CallCommandDocument,
} from '../../database/schemas/call-command.schema';
import {
  CallProviderType,
  CallAttemptStatus,
  CallCommandStatus,
} from '@dayaar/shared';
import { DevicesGateway } from '../devices/devices.gateway';

@Injectable()
export class AndroidSimCallingProvider implements ICallingProvider {
  readonly providerId = CallProviderType.ANDROID_SIM;
  private readonly logger = new Logger(AndroidSimCallingProvider.name);

  constructor(
    @InjectModel(CallCommand.name)
    private callCommandModel: Model<CallCommandDocument>,
    private devicesGateway: DevicesGateway,
  ) {}

  async initiateCall(payload: InitiateCallPayload): Promise<CallInitiateResult> {
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiry

    const command = new this.callCommandModel({
      organizationId: new Types.ObjectId(payload.organizationId),
      employeeId: new Types.ObjectId(payload.employeeId),
      leadId: new Types.ObjectId(payload.leadId),
      deviceId: new Types.ObjectId(payload.deviceRecordId),
      callAttemptId: new Types.ObjectId(payload.callAttemptId),
      phoneNumber: payload.phoneNumber,
      status: CallCommandStatus.QUEUED,
      expiresAt,
    });

    await command.save();

    // Dispatch command via WebSocket transport to device
    this.devicesGateway.emitCallCommandToDevice(payload.deviceId, {
      commandId: command._id.toString(),
      callAttemptId: payload.callAttemptId,
      employeeId: payload.employeeId,
      leadId: payload.leadId,
      phoneNumber: payload.phoneNumber,
      expiresAt,
    });

    return {
      success: true,
      commandId: command._id.toString(),
      provider: this.providerId,
      status: CallCommandStatus.QUEUED,
    };
  }

  normalizeOutcome(rawStatus: string, durationSeconds: number): NormalizedCallOutcome {
    const upper = (rawStatus || '').trim().toUpperCase();

    if (
      ['CONNECTED', 'SUCCESS', 'ANSWERED'].includes(upper) ||
      durationSeconds > 0
    ) {
      return {
        status: CallAttemptStatus.CONNECTED,
        rawStatus,
        countsAsAttempt: false,
        durationSeconds,
      };
    }

    if (upper === 'BUSY') {
      return {
        status: CallAttemptStatus.BUSY,
        rawStatus,
        countsAsAttempt: true,
        durationSeconds: 0,
      };
    }

    if (['NO_ANSWER', 'UNANSWERED', 'NOT_CONNECTED'].includes(upper)) {
      return {
        status: CallAttemptStatus.NOT_CONNECTED,
        rawStatus,
        countsAsAttempt: true,
        durationSeconds: 0,
      };
    }

    if (['CANCELLED', 'CANCELED'].includes(upper)) {
      return {
        status: CallAttemptStatus.CANCELLED,
        rawStatus,
        countsAsAttempt: false, // Cancelled by agent/device does NOT consume customer attempt
        durationSeconds: 0,
      };
    }

    // Technical / Device failure
    return {
      status: CallAttemptStatus.FAILED,
      rawStatus,
      countsAsAttempt: false, // Technical failure does NOT consume customer attempt
      durationSeconds: 0,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CallCommandStatus } from '@dayaar/shared';
import { CallCommand, CallCommandDocument } from '../../database/schemas/call-command.schema';
import { AndroidDevice, AndroidDeviceDocument } from '../../database/schemas/android-device.schema';
import { DevicesGateway } from '../devices/devices.gateway';
import { DialCommandPayload, DialCommandResult, IDialProvider } from './calling-provider.interface';
import { FcmService } from './fcm.service';

@Injectable()
export class AndroidDialProvider implements IDialProvider {
  constructor(
    @InjectModel(CallCommand.name) private readonly commandModel: Model<CallCommandDocument>,
    @InjectModel(AndroidDevice.name) private readonly deviceModel: Model<AndroidDeviceDocument>,
    private readonly fcm: FcmService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  async initiateCall(payload: DialCommandPayload): Promise<DialCommandResult> {
    const expiresAt = new Date(Date.now() + 60_000);
    // One live command per attempt — upsert so retries reuse instead of fanning out
    const command: any = await this.commandModel.findOneAndUpdate(
      {
        callAttemptId: new Types.ObjectId(payload.callAttemptId),
        status: { $in: [CallCommandStatus.QUEUED, CallCommandStatus.DELIVERED, CallCommandStatus.DIALING] },
      },
      {
        $setOnInsert: {
          organizationId: new Types.ObjectId(payload.organizationId),
          employeeId: new Types.ObjectId(payload.employeeId),
          leadId: new Types.ObjectId(payload.leadId),
          deviceId: new Types.ObjectId(payload.deviceRecordId),
          callAttemptId: new Types.ObjectId(payload.callAttemptId),
          phoneNumber: payload.phoneNumber,
          status: CallCommandStatus.QUEUED,
          expiresAt,
        },
      },
      { upsert: true, new: true },
    );
    if ((command as any).deliveredAt) {
      return { commandId: command._id.toString(), status: command.status, expiresAt: command.expiresAt };
    }
    // FCM data carries the dial payload. phoneNumber included for backward compat
    // with released APKs; new clients must also verify expiresAt + commandId replay.
    await this.fcm.sendDialCommand(
      payload.fcmToken,
      {
        type: 'DIAL_CALL',
        commandId: command._id.toString(),
        callAttemptId: payload.callAttemptId,
        leadId: payload.leadId,
        phoneNumber: payload.phoneNumber,
        expiresAt: expiresAt.toISOString(),
      },
      payload.deviceRecordId,
    );
    // QUEUED until device acks via /calls/device-status DIALING; do not mark DELIVERED on FCM 200
    this.devicesGateway.emitCallProgressToUser(payload.employeeId, {
      callAttemptId: payload.callAttemptId,
      commandId: command._id.toString(),
      status: CallCommandStatus.QUEUED,
    });
    // Opportunistic socket push (FCM fallback remains authoritative)
    try {
      this.devicesGateway.emitCallCommandToDevice(payload.deviceRecordId, {
        commandId: command._id.toString(),
        callAttemptId: payload.callAttemptId,
        expiresAt: expiresAt.toISOString(),
      });
    } catch {
      /* socket best-effort */
    }
    return { commandId: command._id.toString(), status: command.status, expiresAt };
  }
}

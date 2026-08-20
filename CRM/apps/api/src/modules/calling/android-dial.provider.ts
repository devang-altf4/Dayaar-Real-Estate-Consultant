import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CallCommandStatus } from '@dayaar/shared';
import { CallCommand, CallCommandDocument } from '../../database/schemas/call-command.schema';
import { DevicesGateway } from '../devices/devices.gateway';
import { DialCommandPayload, DialCommandResult, IDialProvider } from './calling-provider.interface';
import { FcmService } from './fcm.service';

@Injectable()
export class AndroidDialProvider implements IDialProvider {
  constructor(
    @InjectModel(CallCommand.name) private readonly commandModel: Model<CallCommandDocument>,
    private readonly fcm: FcmService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  async initiateCall(payload: DialCommandPayload): Promise<DialCommandResult> {
    const expiresAt = new Date(Date.now() + 60_000);
    const command = await this.commandModel.create({
      organizationId: new Types.ObjectId(payload.organizationId),
      employeeId: new Types.ObjectId(payload.employeeId),
      leadId: new Types.ObjectId(payload.leadId),
      deviceId: new Types.ObjectId(payload.deviceRecordId),
      callAttemptId: new Types.ObjectId(payload.callAttemptId),
      phoneNumber: payload.phoneNumber,
      status: CallCommandStatus.QUEUED,
      expiresAt,
    });
    await this.fcm.sendDialCommand(payload.fcmToken, {
      type: 'DIAL_CALL',
      commandId: command._id.toString(),
      callAttemptId: payload.callAttemptId,
      leadId: payload.leadId,
      phoneNumber: payload.phoneNumber,
      expiresAt: expiresAt.toISOString(),
    });
    command.status = CallCommandStatus.DELIVERED;
    command.deliveredAt = new Date();
    await command.save();
    this.devicesGateway.emitCallProgressToUser(payload.employeeId, {
      callAttemptId: payload.callAttemptId,
      commandId: command._id.toString(),
      status: CallCommandStatus.DELIVERED,
    });
    return { commandId: command._id.toString(), status: command.status, expiresAt };
  }
}

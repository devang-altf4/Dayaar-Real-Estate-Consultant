import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CallCommandStatus } from '@dayaar/shared';

export type CallCommandDocument = CallCommand & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'callCommands' })
export class CallCommand {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', required: true, index: true })
  leadId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'AndroidDevice', required: true, index: true })
  deviceId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CallAttempt', required: true, index: true })
  callAttemptId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ type: String, enum: Object.values(CallCommandStatus), default: CallCommandStatus.QUEUED, required: true })
  status: CallCommandStatus;

  @Prop({ type: Date, default: null })
  deliveredAt: Date | null;

  @Prop({ type: Date, default: null })
  acknowledgedAt: Date | null;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const CallCommandSchema = SchemaFactory.createForClass(CallCommand);
CallCommandSchema.index({ deviceId: 1, status: 1 });

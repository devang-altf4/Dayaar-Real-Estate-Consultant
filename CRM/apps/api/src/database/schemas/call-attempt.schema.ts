import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CallProviderType, CallAttemptStatus, RecordingStatus } from '@dayaar/shared';

export type CallAttemptDocument = CallAttempt & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'callAttempts' })
export class CallAttempt {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', required: true, index: true })
  leadId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'AndroidDevice', default: null })
  deviceId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CallCommand', default: null })
  callCommandId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(CallProviderType), default: CallProviderType.ANDROID_SIM, required: true })
  provider: CallProviderType;

  @Prop({ type: String, enum: Object.values(CallAttemptStatus), default: CallAttemptStatus.INITIATING, required: true, index: true })
  status: CallAttemptStatus;

  @Prop({ type: String, default: null })
  rawStatus: string | null;

  @Prop({ type: Boolean, default: false })
  countsAsAttempt: boolean; // True ONLY for genuine customer failures

  @Prop({ type: Date, default: Date.now, index: true })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  connectedAt: Date | null;

  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  @Prop({ default: 0 })
  durationSeconds: number;

  @Prop({ required: true })
  phoneNumberDialed: string;

  @Prop({ type: String, enum: Object.values(RecordingStatus), default: RecordingStatus.NONE })
  recordingStatus: RecordingStatus;

  @Prop({ type: String, default: null })
  recordingObjectKey: string | null;

  @Prop({ type: Number, default: null })
  recordingBytes: number | null;

  @Prop({ type: String, default: null })
  recordingMimeType: string | null;

  @Prop({ type: Date, default: null })
  reconciledAt: Date | null;
}

export const CallAttemptSchema = SchemaFactory.createForClass(CallAttempt);
CallAttemptSchema.index({ organizationId: 1, leadId: 1, startedAt: -1 });
CallAttemptSchema.index({ organizationId: 1, employeeId: 1, startedAt: -1 });

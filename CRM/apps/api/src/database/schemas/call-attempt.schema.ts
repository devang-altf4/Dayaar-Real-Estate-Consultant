import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  CallAttemptStatus,
  CallDisposition,
  CallOrigin,
  CallProviderType,
  CallSyncStatus,
  ProviderCallType,
  RecordingStatus,
} from '@dayaar/shared';

export type CallAttemptDocument = CallAttempt & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: true }, collection: 'callAttempts' })
export class CallAttempt {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', default: null, index: true })
  leadId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, index: true })
  employeeId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'AndroidDevice', default: null })
  deviceId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CallCommand', default: null })
  callCommandId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(CallProviderType), default: CallProviderType.CALLYZER_SIM, required: true })
  provider: CallProviderType;

  @Prop({ type: String, enum: Object.values(CallOrigin), required: true, index: true })
  origin: CallOrigin;

  @Prop({ type: String, enum: Object.values(CallAttemptStatus), default: CallAttemptStatus.INITIATING, required: true, index: true })
  status: CallAttemptStatus;

  @Prop({ type: String, enum: Object.values(CallSyncStatus), default: CallSyncStatus.PENDING, required: true, index: true })
  syncStatus: CallSyncStatus;

  @Prop({ required: true, index: true })
  phoneNumber: string;

  @Prop({ type: String, default: null, index: true })
  employeePhoneNumber: string | null;

  @Prop({ type: Date, default: Date.now, required: true, index: true })
  dialedAt: Date;

  @Prop({ type: Date, default: null })
  connectedAt: Date | null;

  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  @Prop({ type: Number, default: null })
  duration: number | null;

  @Prop({ type: String, default: null })
  rawStatus: string | null;

  @Prop({ type: Boolean, default: false })
  countsAsAttempt: boolean;

  @Prop({ type: String, default: null, index: true })
  providerCallId: string | null;

  @Prop({ type: String, enum: Object.values(ProviderCallType), default: null })
  callType: ProviderCallType | null;

  @Prop({ type: Boolean, default: null })
  connected: boolean | null;

  @Prop({ type: Date, default: null })
  callDate: Date | null;

  @Prop({ type: Date, default: null })
  syncedAt: Date | null;

  @Prop({ type: String, enum: Object.values(CallDisposition), default: null, index: true })
  disposition: CallDisposition | null;

  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  hotDetails: Record<string, unknown> | null;

  @Prop({ type: Date, default: null, index: true })
  followUpAt: Date | null;

  @Prop({ type: Date, default: null })
  dispositionAt: Date | null;

  @Prop({ type: String, enum: Object.values(RecordingStatus), default: RecordingStatus.PENDING, required: true, index: true })
  recordingStatus: RecordingStatus;

  @Prop({ type: String, default: null, select: false })
  recordingB2Key: string | null;

  @Prop({ type: String, default: null, select: false })
  recordingVpsPath: string | null;

  @Prop({ type: String, default: null, select: false })
  recordingUrl: string | null;

  @Prop({ type: Number, default: null })
  recordingBytes: number | null;

  @Prop({ type: String, default: null })
  recordingMimeType: string | null;

  @Prop({ type: Date, default: null })
  archivedAt: Date | null;

  @Prop({ type: Date, default: null })
  providerRecordingDeletedAt: Date | null;

  @Prop({ type: Date, default: null })
  purgedAt: Date | null;

  @Prop({ type: String, default: null, index: true })
  idempotencyKey: string | null;
}

export const CallAttemptSchema = SchemaFactory.createForClass(CallAttempt);
CallAttemptSchema.index({ organizationId: 1, leadId: 1, dialedAt: -1 });
CallAttemptSchema.index({ organizationId: 1, employeeId: 1, dialedAt: -1 });
CallAttemptSchema.index({ organizationId: 1, employeePhoneNumber: 1, phoneNumber: 1, dialedAt: 1 });
CallAttemptSchema.index({ organizationId: 1, dialedAt: -1 });
CallAttemptSchema.index({ organizationId: 1, employeeId: 1, status: 1, dialedAt: -1 });
CallAttemptSchema.index(
  { organizationId: 1, providerCallId: 1 },
  { unique: true, partialFilterExpression: { providerCallId: { $type: 'string' } } },
);
CallAttemptSchema.index(
  { organizationId: 1, employeeId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

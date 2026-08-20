import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type IntegrationJobDocument = IntegrationJob & Document;

@Schema({ timestamps: true, collection: 'integrationJobs' })
export class IntegrationJob {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', default: null, index: true })
  organizationId: MongooseSchema.Types.ObjectId | null;

  @Prop({ required: true, index: true })
  type: 'PROCESS_WEBHOOK' | 'CALLYZER_RECONCILE' | 'ARCHIVE_RECORDING' | 'RETENTION' | 'RECORDING_EXPORT';

  @Prop({ type: MongooseSchema.Types.Mixed, default: () => ({}) })
  payload: Record<string, unknown>;

  @Prop({ default: 'QUEUED', index: true })
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: 8 })
  maxAttempts: number;

  @Prop({ type: Date, default: Date.now, index: true })
  runAfter: Date;

  @Prop({ type: Date, default: null, index: true })
  lockedUntil: Date | null;

  @Prop({ type: String, default: null })
  lockedBy: string | null;

  @Prop({ type: String, default: null })
  lastError: string | null;
}

export const IntegrationJobSchema = SchemaFactory.createForClass(IntegrationJob);
IntegrationJobSchema.index({ status: 1, runAfter: 1, lockedUntil: 1 });

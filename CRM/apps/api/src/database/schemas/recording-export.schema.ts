import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type RecordingExportDocument = RecordingExport & Document;

@Schema({ timestamps: true, collection: 'recordingExports' })
export class RecordingExport {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  requestedBy: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  from: Date;

  @Prop({ required: true })
  to: Date;

  @Prop({ default: 'QUEUED', index: true })
  status: 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED' | 'PURGED';

  @Prop({ type: String, default: null, select: false })
  objectKey: string | null;

  @Prop({ default: 0 })
  fileCount: number;

  @Prop({ default: 0 })
  totalBytes: number;

  @Prop({ type: String, default: null })
  error: string | null;

  @Prop({ type: Date, default: null })
  readyAt: Date | null;

  @Prop({ type: Date, default: null })
  downloadConfirmedAt: Date | null;

  @Prop({ type: Date, default: null })
  purgedAt: Date | null;
}

export const RecordingExportSchema = SchemaFactory.createForClass(RecordingExport);
RecordingExportSchema.index({ organizationId: 1, from: 1, to: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CallyzerWebhookEventDocument = CallyzerWebhookEvent & Document;

@Schema({ timestamps: true, collection: 'callyzerWebhookEvents' })
export class CallyzerWebhookEvent {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  dedupeKey: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload: unknown;

  @Prop({ default: 'RECEIVED', index: true })
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED';

  @Prop({ type: String, default: null })
  error: string | null;

  @Prop({ type: Date, default: null })
  processedAt: Date | null;
}

export const CallyzerWebhookEventSchema = SchemaFactory.createForClass(CallyzerWebhookEvent);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { CallEventType } from '@dayaar/shared';

export type CallEventDocument = CallEvent & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'callEvents' })
export class CallEvent {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CallAttempt', required: true, index: true })
  callAttemptId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  employeeId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'AndroidDevice', default: null })
  deviceId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(CallEventType), required: true, index: true })
  type: CallEventType;

  @Prop({ type: MongooseSchema.Types.Mixed, default: () => ({}) })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: Date.now, index: true })
  timestamp: Date;
}

export const CallEventSchema = SchemaFactory.createForClass(CallEvent);
CallEventSchema.index({ callAttemptId: 1, timestamp: 1 });

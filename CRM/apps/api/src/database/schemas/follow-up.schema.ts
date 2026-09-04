import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { FollowUpStatus } from '@dayaar/shared';

export type FollowUpDocument = FollowUp & Document;

@Schema({ timestamps: true, collection: 'followUps' })
export class FollowUp {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', required: true, index: true })
  leadId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  scheduledAt: Date;

  @Prop({ default: 'Follow-up Call' })
  reason: string;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: String, enum: Object.values(FollowUpStatus), default: FollowUpStatus.PENDING, index: true })
  status: FollowUpStatus;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);
FollowUpSchema.index({ organizationId: 1, employeeId: 1, status: 1, scheduledAt: 1 });
FollowUpSchema.index({ organizationId: 1, status: 1, scheduledAt: 1 });

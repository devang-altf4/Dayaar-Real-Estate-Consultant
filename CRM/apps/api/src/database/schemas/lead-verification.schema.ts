import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { VerificationStatus, MismatchSeverity, MismatchType } from '@dayaar/shared';

export type LeadVerificationDocument = LeadVerification & Document;

@Schema({ timestamps: true, collection: 'leadVerifications' })
export class LeadVerification {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', required: true, index: true })
  leadId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  originalEmployeeId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  originalDisposition: string;

  @Prop({ type: String, default: null })
  originalReason: string | null;

  @Prop({ type: String, default: null })
  originalReasonDetails: string | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, index: true })
  verificationEmployeeId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: String, default: null })
  verificationDisposition: string | null;

  @Prop({ type: String, default: null })
  verificationReason: string | null;

  @Prop({ type: String, default: null })
  verificationReasonDetails: string | null;

  @Prop({ type: String, enum: Object.values(VerificationStatus), default: VerificationStatus.PENDING_ASSIGNMENT, index: true })
  status: VerificationStatus;

  @Prop({ default: false, index: true })
  isMismatch: boolean;

  @Prop({ type: String, enum: Object.values(MismatchType), default: null })
  mismatchType: MismatchType | null;

  @Prop({ type: String, enum: Object.values(MismatchSeverity), default: null })
  mismatchSeverity: MismatchSeverity | null;

  @Prop({ type: String, default: null })
  verifierNotes: string | null;

  @Prop({ type: String, default: null })
  managerReviewNotes: string | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

export const LeadVerificationSchema = SchemaFactory.createForClass(LeadVerification);
LeadVerificationSchema.index({ organizationId: 1, isMismatch: 1 });
LeadVerificationSchema.index({ organizationId: 1, verificationEmployeeId: 1, status: 1 });

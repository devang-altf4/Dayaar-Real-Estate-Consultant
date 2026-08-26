import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  LeadStatus,
  Temperature,
  NotInterestedReason,
  PropertyType,
  BhkType,
  PurchasePurpose,
  PurchaseTimeline,
  FinancingType,
} from '@dayaar/shared';

export type LeadDocument = Lead & Document;

@Schema({ _id: false })
export class LeadQualification {
  @Prop({ type: Number })
  budgetMin: number;

  @Prop({ type: Number })
  budgetMax: number;

  @Prop({ type: String, enum: Object.values(PropertyType) })
  propertyType: PropertyType;

  @Prop({ type: String, enum: Object.values(BhkType) })
  bhk: BhkType;

  @Prop({ type: [String], default: [] })
  preferredLocations: string[];

  @Prop({ type: String, enum: Object.values(PurchasePurpose), default: PurchasePurpose.UNKNOWN })
  purpose: PurchasePurpose;

  @Prop({ type: String, enum: Object.values(PurchaseTimeline) })
  purchaseTimeline: PurchaseTimeline;

  @Prop({ type: String, enum: Object.values(FinancingType), default: FinancingType.UNDECIDED })
  financing: FinancingType;

  @Prop({ type: String })
  loanStatus: string;

  @Prop({ type: Boolean, default: false })
  siteVisitInterested: boolean;

  @Prop({ type: Date, default: null })
  siteVisitDate: Date | null;

  @Prop({ type: String })
  notes: string;
}

@Schema({ timestamps: true, collection: 'leads' })
export class Lead {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, index: true })
  phone: string; // Normalized clean phone

  @Prop({ trim: true })
  alternatePhone: string;

  @Prop({ lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, default: 'Website' })
  source: string;

  @Prop({ type: String, default: null })
  consentSource: string | null;

  @Prop({ type: Date, default: null })
  consentDate: Date | null;

  @Prop({ trim: true })
  campaign: string;

  @Prop({ required: true, default: 'General Inquiry' })
  project: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, index: true })
  assignedEmployeeId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, index: true })
  assignedManagerId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(LeadStatus), default: LeadStatus.NEW, required: true, index: true })
  status: LeadStatus;

  @Prop({ type: String, enum: Object.values(NotInterestedReason), default: null })
  notInterestedReason: NotInterestedReason | null;

  @Prop({ type: String, default: null })
  notInterestedReasonDetails: string | null;

  @Prop({ default: 0, min: 0 })
  attemptCount: number;

  @Prop({ type: String, enum: Object.values(Temperature), default: Temperature.UNQUALIFIED, index: true })
  temperature: Temperature;

  @Prop({ type: LeadQualification, default: () => ({}) })
  qualification: LeadQualification;

  @Prop({ type: Date, default: null, index: true })
  nextFollowUpAt: Date | null;

  @Prop({ type: String })
  employeeNotes: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ organizationId: 1, phone: 1 });
// Lead-only call tracking resolves every ingested Callyzer call with an $or over
// phone and alternatePhone. MongoDB only builds an index-union plan when every
// $or branch is indexed, so without this index each call scans the whole lead
// book for the organisation.
LeadSchema.index({ organizationId: 1, alternatePhone: 1 });
LeadSchema.index({ organizationId: 1, assignedEmployeeId: 1, status: 1 });
LeadSchema.index({ organizationId: 1, status: 1, temperature: 1 });
LeadSchema.index({ organizationId: 1, nextFollowUpAt: 1 });

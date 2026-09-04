import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'auditLogs' })
export class AuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  actorId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String })
  actorName: string;

  @Prop({ type: String })
  actorRole: string;

  @Prop({ required: true, index: true })
  entityType: string;

  @Prop({ required: true, index: true })
  entityId: string;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: () => ({}) })
  metadata: Record<string, any>;

  @Prop({ type: String, default: null })
  ip: string | null;

  @Prop({ type: String, default: null })
  userAgent: string | null;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ organizationId: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, entityType: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, actorId: 1, createdAt: -1 });

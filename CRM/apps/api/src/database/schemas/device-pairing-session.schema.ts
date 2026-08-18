import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DevicePairingSessionDocument = DevicePairingSession & Document;

@Schema({ timestamps: true, collection: 'devicePairingSessions' })
export class DevicePairingSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, index: true })
  pairingCodeHash: string; // SHA-256 / bcrypt hash of 6-digit PIN

  @Prop({ required: true, index: true })
  pairingTokenHash: string; // SHA-256 hash of random token

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isClaimed: boolean;
}

export const DevicePairingSessionSchema = SchemaFactory.createForClass(DevicePairingSession);
DevicePairingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL auto-cleanup
DevicePairingSessionSchema.index({ organizationId: 1, userId: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { DeviceStatus, SimState } from '@dayaar/shared';

export type AndroidDeviceDocument = AndroidDevice & Document;

@Schema({ _id: false })
export class DeviceCapabilities {
  @Prop({ default: true })
  canPlaceCalls: boolean;

  @Prop({ default: false })
  canReadCallLogs: boolean;

  @Prop({ default: false })
  canSyncRecordings: boolean;
}

@Schema({ timestamps: true, collection: 'androidDevices' })
export class AndroidDevice {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  deviceId: string;

  @Prop({ required: true })
  deviceName: string;

  @Prop({ default: 'Android' })
  manufacturer: string;

  @Prop({ default: 'Smartphone' })
  model: string;

  @Prop({ default: '1.0.0' })
  appVersion: string;

  @Prop({ type: String, default: null })
  fcmToken: string | null;

  @Prop({ type: String, default: null, select: false })
  authTokenHash: string | null;

  @Prop({ type: String, enum: Object.values(SimState), default: SimState.READY })
  simState: SimState;

  @Prop({ type: String, default: 'Airtel' })
  simOperator: string;

  @Prop({ type: String, enum: Object.values(DeviceStatus), default: DeviceStatus.ONLINE })
  status: DeviceStatus;

  @Prop({ type: DeviceCapabilities, default: () => ({}) })
  capabilities: DeviceCapabilities;

  @Prop({ default: true })
  isPrimaryCallingDevice: boolean;

  @Prop({ type: Date, default: Date.now })
  lastSeenAt: Date;

  @Prop({ type: Date, default: Date.now })
  pairedAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ type: Date, default: null })
  fcmTokenUpdatedAt: Date | null;
}

export const AndroidDeviceSchema = SchemaFactory.createForClass(AndroidDevice);
AndroidDeviceSchema.index({ organizationId: 1, userId: 1 });
AndroidDeviceSchema.index({ deviceId: 1 }, { unique: true });
AndroidDeviceSchema.index({ organizationId: 1, lastSeenAt: -1 });

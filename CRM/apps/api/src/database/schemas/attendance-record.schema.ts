import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { AttendanceStatus } from '@dayaar/shared';

export type AttendanceRecordDocument = AttendanceRecord & Document;

@Schema({ _id: false })
export class GpsLocation {
  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ required: true })
  accuracy: number;

  @Prop({ required: true })
  distanceFromOfficeMeters: number;
}

@Schema({ timestamps: true, collection: 'attendanceRecords' })
export class AttendanceRecord {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, index: true })
  date: string; // YYYY-MM-DD

  @Prop({ type: Date, required: true })
  checkInAt: Date;

  @Prop({ type: GpsLocation, required: true })
  checkInLocation: GpsLocation;

  @Prop({ type: Date, default: null })
  checkOutAt: Date | null;

  @Prop({ type: GpsLocation, default: null })
  checkOutLocation: GpsLocation | null;

  @Prop({ default: 0 })
  totalWorkingSeconds: number;

  @Prop({ default: 0 })
  totalBreakSeconds: number;

  @Prop({ type: String, enum: Object.values(AttendanceStatus), default: AttendanceStatus.PRESENT, required: true })
  status: AttendanceStatus;
}

export const AttendanceRecordSchema = SchemaFactory.createForClass(AttendanceRecord);
AttendanceRecordSchema.index({ organizationId: 1, employeeId: 1, date: 1 }, { unique: true });
AttendanceRecordSchema.index({ organizationId: 1, date: 1 });
AttendanceRecordSchema.index({ organizationId: 1, date: 1, checkOutAt: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BreakSessionDocument = BreakSession & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'breakSessions' })
export class BreakSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'AttendanceRecord', required: true, index: true })
  attendanceId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  @Prop({ default: 0 })
  durationSeconds: number;

  @Prop({ default: 'Short Break' })
  reason: string;
}

export const BreakSessionSchema = SchemaFactory.createForClass(BreakSession);
BreakSessionSchema.index({ attendanceId: 1, endedAt: 1 });

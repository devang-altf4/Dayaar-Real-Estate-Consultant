import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Lead, LeadSchema } from '../../database/schemas/lead.schema';
import {
  CallAttempt,
  CallAttemptSchema,
} from '../../database/schemas/call-attempt.schema';
import {
  AndroidDevice,
  AndroidDeviceSchema,
} from '../../database/schemas/android-device.schema';
import {
  AttendanceRecord,
  AttendanceRecordSchema,
} from '../../database/schemas/attendance-record.schema';
import {
  LeadVerification,
  LeadVerificationSchema,
} from '../../database/schemas/lead-verification.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: CallAttempt.name, schema: CallAttemptSchema },
      { name: AndroidDevice.name, schema: AndroidDeviceSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: LeadVerification.name, schema: LeadVerificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

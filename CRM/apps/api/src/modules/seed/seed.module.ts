import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import {
  Organization,
  OrganizationSchema,
} from '../../database/schemas/organization.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Lead, LeadSchema } from '../../database/schemas/lead.schema';
import {
  AndroidDevice,
  AndroidDeviceSchema,
} from '../../database/schemas/android-device.schema';
import {
  CallAttempt,
  CallAttemptSchema,
} from '../../database/schemas/call-attempt.schema';
import {
  AttendanceRecord,
  AttendanceRecordSchema,
} from '../../database/schemas/attendance-record.schema';
import {
  FollowUp,
  FollowUpSchema,
} from '../../database/schemas/follow-up.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: AndroidDevice.name, schema: AndroidDeviceSchema },
      { name: CallAttempt.name, schema: CallAttemptSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: FollowUp.name, schema: FollowUpSchema },
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}

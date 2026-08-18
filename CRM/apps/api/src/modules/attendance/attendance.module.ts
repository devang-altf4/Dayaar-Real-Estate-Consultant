import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import {
  AttendanceRecord,
  AttendanceRecordSchema,
} from '../../database/schemas/attendance-record.schema';
import {
  BreakSession,
  BreakSessionSchema,
} from '../../database/schemas/break-session.schema';
import {
  Organization,
  OrganizationSchema,
} from '../../database/schemas/organization.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: BreakSession.name, schema: BreakSessionSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

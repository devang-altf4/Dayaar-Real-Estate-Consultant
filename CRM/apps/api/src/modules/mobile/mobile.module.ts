import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallAttempt, CallAttemptSchema } from '../../database/schemas/call-attempt.schema';
import { FollowUp, FollowUpSchema } from '../../database/schemas/follow-up.schema';
import { Lead, LeadSchema } from '../../database/schemas/lead.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CallingModule } from '../calling/calling.module';
import { DevicesModule } from '../devices/devices.module';
import { LeadQueueModule } from '../lead-queue/lead-queue.module';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

@Module({
  imports: [
    DevicesModule,
    AnalyticsModule,
    LeadQueueModule,
    CallingModule,
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: User.name, schema: UserSchema },
      { name: CallAttempt.name, schema: CallAttemptSchema },
      { name: FollowUp.name, schema: FollowUpSchema },
    ]),
  ],
  controllers: [MobileController],
  providers: [MobileService],
})
export class MobileModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadQueueService } from './lead-queue.service';
import { LeadQueueController } from './lead-queue.controller';
import { Lead, LeadSchema } from '../../database/schemas/lead.schema';
import {
  CallAttempt,
  CallAttemptSchema,
} from '../../database/schemas/call-attempt.schema';
import {
  Organization,
  OrganizationSchema,
} from '../../database/schemas/organization.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: CallAttempt.name, schema: CallAttemptSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  controllers: [LeadQueueController],
  providers: [LeadQueueService],
  exports: [LeadQueueService],
})
export class LeadQueueModule {}

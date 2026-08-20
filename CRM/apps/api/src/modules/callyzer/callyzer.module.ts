import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallAttempt, CallAttemptSchema } from '../../database/schemas/call-attempt.schema';
import { CallEvent, CallEventSchema } from '../../database/schemas/call-event.schema';
import { CallyzerWebhookEvent, CallyzerWebhookEventSchema } from '../../database/schemas/callyzer-webhook-event.schema';
import { IntegrationJob, IntegrationJobSchema } from '../../database/schemas/integration-job.schema';
import { Lead, LeadSchema } from '../../database/schemas/lead.schema';
import { Organization, OrganizationSchema } from '../../database/schemas/organization.schema';
import { ProviderThrottle, ProviderThrottleSchema } from '../../database/schemas/provider-throttle.schema';
import { RecordingExport, RecordingExportSchema } from '../../database/schemas/recording-export.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { CallyzerClient } from './callyzer.client';
import { CallyzerIngestionService } from './callyzer-ingestion.service';
import { CallyzerWebhookController } from './callyzer-webhook.controller';
import { IntegrationJobsService } from './integration-jobs.service';
import { IntegrationMaintenanceController } from './integration-maintenance.controller';
import { IntegrationWorkerService } from './integration-worker.service';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CallAttempt.name, schema: CallAttemptSchema },
      { name: CallEvent.name, schema: CallEventSchema },
      { name: CallyzerWebhookEvent.name, schema: CallyzerWebhookEventSchema },
      { name: IntegrationJob.name, schema: IntegrationJobSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: ProviderThrottle.name, schema: ProviderThrottleSchema },
      { name: RecordingExport.name, schema: RecordingExportSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CallyzerWebhookController, IntegrationMaintenanceController, RecordingsController],
  providers: [
    CallyzerClient,
    CallyzerIngestionService,
    IntegrationJobsService,
    IntegrationWorkerService,
    RecordingsService,
  ],
  exports: [CallyzerClient, IntegrationJobsService, RecordingsService],
})
export class CallyzerModule {}

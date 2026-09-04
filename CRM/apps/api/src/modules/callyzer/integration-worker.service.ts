import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { hostname } from 'os';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from '../../database/schemas/organization.schema';
import { CallyzerIngestionService } from './callyzer-ingestion.service';
import { IntegrationJobsService } from './integration-jobs.service';
import { RecordingsService } from './recordings.service';

@Injectable()
export class IntegrationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrationWorkerService.name);
  private readonly workerId = `${hostname()}:${process.pid}`;
  private timer: NodeJS.Timeout | null = null;
  private maintenanceTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
    private readonly jobs: IntegrationJobsService,
    private readonly ingestion: CallyzerIngestionService,
    private readonly recordings: RecordingsService,
  ) {}

  onModuleInit() {
    if (process.env.BACKGROUND_JOBS_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.tick(), 2000);
    this.timer.unref();
    this.maintenanceTimer = setInterval(() => void this.scheduleMaintenanceSafely(), 6 * 60 * 60 * 1000);
    this.maintenanceTimer.unref();
    void this.scheduleMaintenanceSafely();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.maintenanceTimer) clearInterval(this.maintenanceTimer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const job = await this.jobs.claim(this.workerId);
      if (!job) return;
      await this.runJob(job);
    } finally {
      this.running = false;
    }
  }

  private async runJob(job: Awaited<ReturnType<IntegrationJobsService['claim']>>) {
    if (!job) return;
    {
      // Heartbeat so long jobs (>120s) aren't stolen; cleared on complete/retry
      const heartbeat = setInterval(() => {
        void this.jobs.renew((job as any)._id, this.workerId, 120_000).catch(() => undefined);
      }, 30_000);
      try {
        const payload = (job as any).payload || {};
        switch ((job as any).type) {
          case 'PROCESS_WEBHOOK':
            await this.ingestion.processWebhookEvent(String(payload.eventId));
            break;
          case 'CALLYZER_RECONCILE':
            if (!(job as any).organizationId) throw new Error('Reconciliation job has no organization.');
            await this.ingestion.reconcile(
              (job as any).organizationId.toString(),
              new Date(String(payload.from)),
              new Date(String(payload.to)),
            );
            break;
          case 'ARCHIVE_RECORDING':
            await this.recordings.archive(
              String(payload.callAttemptId),
              String(payload.recordingUrl),
              (job as any).organizationId?.toString(),
            );
            break;
          case 'PURGE_PROVIDER_RECORDING':
            await this.recordings.purgeProviderRecording(String(payload.providerCallId));
            break;
          case 'RETENTION':
            if ((job as any).organizationId) await this.recordings.runRetention((job as any).organizationId.toString());
            break;
          case 'RECORDING_EXPORT':
            await this.recordings.buildExport(String(payload.exportId));
            break;
        }
        await this.jobs.complete(job);
      } catch (error: any) {
        if (error?.name === 'StaleLockError') {
          this.logger.warn(`Integration job ${(job as any).key} lock stolen — skipping completion`);
          return;
        }
        this.logger.error(`Integration job ${(job as any).key} failed: ${error instanceof Error ? error.message : error}`);
        try {
          await this.jobs.retry(job, error);
        } catch (retryErr: any) {
          if (retryErr?.name !== 'StaleLockError') throw retryErr;
        }
      } finally {
        clearInterval(heartbeat);
      }
    }
  }

  /**
   * Runs one maintenance sweep and drains queued jobs. Exposed so an external
   * scheduler (Render Cron, a platform timer, curl) can drive the pipeline on
   * hosts where an in-process interval cannot be relied on — free instances
   * that sleep, or containers that scale to zero.
   */
  async runMaintenanceNow(maxJobs = 25): Promise<{ scheduled: boolean; processed: number }> {
    await this.ensureMaintenanceJobs();
    let processed = 0;
    for (let index = 0; index < maxJobs; index += 1) {
      const before = this.running;
      if (before) break;
      const job = await this.jobs.claim(this.workerId);
      if (!job) break;
      await this.runJob(job);
      processed += 1;
    }
    return { scheduled: true, processed };
  }

  async ensureMaintenanceJobs() {
    const organizations = await this.orgModel.find({ isActive: true }).select('_id');
    const day = new Date().toISOString().slice(0, 10);
    for (const organization of organizations) {
      const organizationId = organization._id.toString();
      await this.jobs.enqueue({
        key: `retention:${organizationId}:${day}`,
        organizationId,
        type: 'RETENTION',
        runAfter: new Date(Date.now() + 60_000),
      });
      if (process.env.CALLYZER_INTEGRATION_ENABLED === 'true') {
        const to = new Date();
        const from = new Date(to.getTime() - 48 * 60 * 60 * 1000);
        await this.jobs.enqueue({
          key: `reconcile:${organizationId}:${day}`,
          organizationId,
          type: 'CALLYZER_RECONCILE',
          payload: { from: from.toISOString(), to: to.toISOString() },
          runAfter: new Date(Date.now() + 120_000),
        });
      }
    }
  }

  private async scheduleMaintenanceSafely() {
    try {
      await this.ensureMaintenanceJobs();
    } catch (error) {
      this.logger.error(
        `Unable to schedule maintenance jobs: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}

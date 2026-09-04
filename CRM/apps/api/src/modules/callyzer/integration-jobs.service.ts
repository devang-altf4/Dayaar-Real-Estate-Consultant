import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IntegrationJob, IntegrationJobDocument } from '../../database/schemas/integration-job.schema';

export class StaleLockError extends Error {
  constructor(public readonly key: string) {
    super(`Stale lock for job ${key}`);
    this.name = 'StaleLockError';
  }
}

@Injectable()
export class IntegrationJobsService {
  constructor(
    @InjectModel(IntegrationJob.name) private readonly jobModel: Model<IntegrationJobDocument>,
  ) {}

  async enqueue(params: {
    key: string;
    organizationId?: string | null;
    type: IntegrationJob['type'];
    payload?: Record<string, unknown>;
    runAfter?: Date;
    maxAttempts?: number;
    force?: boolean;
  }): Promise<void> {
    const update: any = {
      $setOnInsert: {
        key: params.key,
        organizationId: params.organizationId ? new Types.ObjectId(params.organizationId) : null,
        type: params.type,
        payload: params.payload || {},
        status: 'QUEUED',
        attempts: 0,
        maxAttempts: params.maxAttempts || 8,
        runAfter: params.runAfter || new Date(),
      },
    };
    // Explicit re-drive (e.g. FAILED webhook retry or archive-on-URL-change) — previous
    // $setOnInsert-only permanently blocked re-drive after terminal state
    if (params.force) {
      update.$set = {
        status: 'QUEUED',
        runAfter: params.runAfter || new Date(),
        lockedBy: null,
        lockedUntil: null,
        lastError: null,
      };
    }
    await this.jobModel.updateOne({ key: params.key }, update, { upsert: true });
  }

  async claim(workerId: string): Promise<IntegrationJobDocument | null> {
    const now = new Date();
    // Only QUEUED jobs are claimable — never steal RUNNING without heartbeat expiry.
    // A reaper (see renew/markStale) returns RUNNING jobs with expired heartbeats to QUEUED.
    return this.jobModel.findOneAndUpdate(
      {
        status: 'QUEUED',
        runAfter: { $lte: now },
        $expr: { $lt: ['$attempts', '$maxAttempts'] },
        $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
      },
      {
        $set: { status: 'RUNNING', lockedBy: workerId, lockedUntil: new Date(now.getTime() + 120_000) },
        $inc: { attempts: 1 },
      },
      { new: true, sort: { runAfter: 1 } },
    );
  }

  async renew(jobId: unknown, workerId: string, ttlMs = 120_000): Promise<void> {
    await this.jobModel.updateOne(
      { _id: jobId, lockedBy: workerId, status: 'RUNNING' },
      { $set: { lockedUntil: new Date(Date.now() + ttlMs) } },
    );
  }

  /** Reaper: return RUNNING jobs with expired heartbeats to QUEUED for re-drive. */
  async markStaleRunningAsQueued(staleAfterMs = 180_000): Promise<number> {
    const res: any = await this.jobModel.updateMany(
      { status: 'RUNNING', lockedUntil: { $lte: new Date(Date.now() - staleAfterMs) } },
      { $set: { status: 'QUEUED', lockedBy: null, lockedUntil: null } },
    );
    return res.modifiedCount ?? 0;
  }

  async complete(job: IntegrationJobDocument): Promise<void> {
    const res: any = await this.jobModel.updateOne(
      { _id: job._id, lockedBy: job.lockedBy },
      { $set: { status: 'COMPLETED', lockedUntil: null, lockedBy: null } },
    );
    if (!res.matchedCount) throw new StaleLockError((job as any).key || String((job as any)._id));
  }

  async retry(job: IntegrationJobDocument, error: unknown): Promise<void> {
    if (error instanceof StaleLockError) return; // lock stolen — don't touch
    const retryAfterSeconds = Number((error as any)?.retryAfterSeconds || 0);
    const delay = retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : Math.min(60 * 60 * 1000, 2 ** Math.min(job.attempts, 10) * 1000);
    const terminal = job.attempts >= job.maxAttempts;
    const res: any = await this.jobModel.updateOne(
      { _id: job._id, lockedBy: job.lockedBy },
      {
        $set: {
          status: terminal ? 'FAILED' : 'QUEUED',
          runAfter: new Date(Date.now() + delay),
          lockedUntil: null,
          lockedBy: null,
          lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
        },
      },
    );
    if (!res.matchedCount) throw new StaleLockError((job as any).key || String((job as any)._id));
  }
}

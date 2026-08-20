import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IntegrationJob, IntegrationJobDocument } from '../../database/schemas/integration-job.schema';

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
  }): Promise<void> {
    await this.jobModel.updateOne(
      { key: params.key },
      {
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
      },
      { upsert: true },
    );
  }

  async claim(workerId: string): Promise<IntegrationJobDocument | null> {
    const now = new Date();
    return this.jobModel.findOneAndUpdate(
      {
        status: { $in: ['QUEUED', 'RUNNING'] },
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

  async complete(job: IntegrationJobDocument): Promise<void> {
    await this.jobModel.updateOne(
      { _id: job._id, lockedBy: job.lockedBy },
      { $set: { status: 'COMPLETED', lockedUntil: null, lockedBy: null } },
    );
  }

  async retry(job: IntegrationJobDocument, error: unknown): Promise<void> {
    const retryAfterSeconds = Number((error as any)?.retryAfterSeconds || 0);
    const delay = retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : Math.min(60 * 60 * 1000, 2 ** Math.min(job.attempts, 10) * 1000);
    const terminal = job.attempts >= job.maxAttempts;
    await this.jobModel.updateOne(
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
  }
}

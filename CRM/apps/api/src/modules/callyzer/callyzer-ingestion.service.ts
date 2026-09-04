import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CallAttemptStatus,
  CallEventType,
  CallOrigin,
  CallProviderType,
  CallSyncStatus,
  LeadStatus,
  normalizePhoneToE164,
  ProviderCallType,
  RecordingStatus,
} from '@dayaar/shared';
import { CallAttempt, CallAttemptDocument } from '../../database/schemas/call-attempt.schema';
import { CallEvent, CallEventDocument } from '../../database/schemas/call-event.schema';
import { CallyzerWebhookEvent, CallyzerWebhookEventDocument } from '../../database/schemas/callyzer-webhook-event.schema';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import { Organization, OrganizationDocument } from '../../database/schemas/organization.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { NormalizedProviderCall } from '../calling/calling-provider.interface';
import { CallyzerClient } from './callyzer.client';
import { IntegrationJobsService } from './integration-jobs.service';

@Injectable()
export class CallyzerIngestionService {
  private readonly logger = new Logger(CallyzerIngestionService.name);

  constructor(
    @InjectModel(CallyzerWebhookEvent.name) private readonly eventModel: Model<CallyzerWebhookEventDocument>,
    @InjectModel(CallAttempt.name) private readonly attemptModel: Model<CallAttemptDocument>,
    @InjectModel(CallEvent.name) private readonly callEventModel: Model<CallEventDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Lead.name) private readonly leadModel: Model<LeadDocument>,
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
    private readonly callyzer: CallyzerClient,
    private readonly jobs: IntegrationJobsService,
  ) {}

  async processWebhookEvent(eventId: string): Promise<void> {
    // Atomic claim — concurrent workers can't both process RECEIVED
    const event: any = await this.eventModel.findOneAndUpdate(
      { _id: new Types.ObjectId(eventId), status: { $in: ['RECEIVED', 'FAILED'] } },
      { $set: { status: 'PROCESSING' } },
      { new: true },
    );
    if (!event) return; // already claimed/processed
    try {
      const rawCalls = this.flattenPayload(event.payload);
      const failures: string[] = [];
      for (const raw of rawCalls) {
        try {
          await this.ingest(event.organizationId.toString(), this.callyzer.normalize(raw));
        } catch (e: any) {
          failures.push(String((raw as any)?.id || 'unknown'));
          this.logger.error(`Webhook ${eventId} call failed: ${e?.message || e}`);
        }
      }
      if (failures.length === 0) {
        event.status = 'PROCESSED';
      } else if (failures.length === rawCalls.length && rawCalls.length > 0) {
        event.status = 'FAILED';
        event.error = `All ${failures.length} calls failed: ${failures.slice(0, 5).join(',')}`;
        await event.save();
        throw new Error(event.error);
      } else {
        (event.status as any) = 'PARTIAL';
        event.error = `Partial: ${failures.length}/${rawCalls.length} failed`;
      }
      event.processedAt = new Date();
      if (failures.length === 0) event.error = null;
      await event.save();
    } catch (error) {
      if ((event as any).status !== 'FAILED') {
        event.status = 'FAILED';
        event.error = error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000);
        await event.save();
      }
      throw error;
    }
  }

  async reconcile(organizationId: string, from: Date, to: Date): Promise<void> {
    let page = 1;
    let processed = 0;
    do {
      const result = await this.callyzer.fetchHistory(from, to, page);
      for (const call of result.calls) await this.ingest(organizationId, call);
      processed += result.calls.length;
      page += 1;
      if (!result.calls.length || processed >= result.totalRecords) break;
    } while (page <= 1000);
  }

  async ingest(organizationId: string, call: NormalizedProviderCall): Promise<CallAttemptDocument | null> {
    if (!call.providerCallId) throw new Error('Callyzer call is missing its unique id.');
    const duplicate = await this.attemptModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      providerCallId: call.providerCallId,
    });
    if (duplicate) {
      let changed = false;
      // Rows created before lead-only tracking can have no lead. They are left in
      // place deliberately, but must not pull further audio into durable storage.
      if (call.recordingUrl && duplicate.leadId) {
        duplicate.recordingUrl = call.recordingUrl;
        if (!duplicate.recordingStatus || duplicate.recordingStatus === RecordingStatus.NO_RECORDING) {
          duplicate.recordingStatus = RecordingStatus.PENDING;
          changed = true;
          const { createHash } = await import('crypto');
          const urlHash = createHash('sha256').update(call.recordingUrl).digest('hex').slice(0, 12);
          await this.jobs.enqueue({
            key: `archive:${call.providerCallId}:${urlHash}`,
            organizationId,
            type: 'ARCHIVE_RECORDING',
            payload: { callAttemptId: duplicate._id.toString(), recordingUrl: call.recordingUrl },
          });
        }
      }
      if (call.duration && duplicate.duration !== call.duration) {
        duplicate.duration = call.duration;
        duplicate.connected = call.duration > 2;
        duplicate.status = this.status(call.callType, duplicate.connected);
        changed = true;
      }
      if (changed) await duplicate.save();
      return duplicate;
    }

    const employee = await this.resolveEmployee(organizationId, call.employeePhoneNumber);
    const candidates = employee
      ? await this.attemptModel.find({
          organizationId: new Types.ObjectId(organizationId),
          employeeId: employee._id,
          phoneNumber: call.clientPhoneNumber,
          providerCallId: null,
          dialedAt: {
            $gte: new Date(call.callDate.getTime() - 5 * 60_000),
            $lte: new Date(call.callDate.getTime() + 5 * 60_000),
          },
        })
      : [];
    candidates.sort(
      (left, right) =>
        Math.abs(left.dialedAt.getTime() - call.callDate.getTime()) -
        Math.abs(right.dialedAt.getTime() - call.callDate.getTime()),
    );

    // Spec 5.6: on multiple candidates take the closest by timestamp and flag
    // the collision. Creating a fresh attempt instead would orphan the dialled
    // attempt, leaving it matchable by a later webhook and splitting the
    // disposition away from the call record.
    const collision = candidates.length > 1;
    let attempt = candidates[0] || null;

    // Lead-only tracking: Callyzer reports every call the handset makes,
    // including the telecaller's personal ones. Only a number that exists in
    // this organisation's lead book may be tracked or recorded — assignment is
    // deliberately not consulted, so covering a colleague's lead or dialling an
    // unassigned one still counts. A dialled attempt that already carries a lead
    // is trusted even when the number no longer resolves, so editing a lead's
    // phone after dialling cannot discard a call the CRM itself placed.
    const lead = await this.resolveLead(organizationId, call.clientPhoneNumber);
    const trackedLeadId = lead?._id || attempt?.leadId || null;
    if (!trackedLeadId) {
      await this.discardNonLeadCall(organizationId, call);
      return null;
    }

    if (!attempt) {
      try {
        attempt = await this.attemptModel.create({
          organizationId: new Types.ObjectId(organizationId),
          leadId: trackedLeadId,
          employeeId: employee?._id || null,
          provider: CallProviderType.CALLYZER_SIM,
          origin: CallOrigin.ANDROID,
          status: CallAttemptStatus.UNKNOWN,
          syncStatus: CallSyncStatus.UNMATCHED,
          phoneNumber: call.clientPhoneNumber,
          employeePhoneNumber: call.employeePhoneNumber,
          dialedAt: call.callDate,
          providerCallId: call.providerCallId,
        } as any);
      } catch (e: any) {
        if (e?.code === 11000) {
          // Lost race: another worker created the provider row — reload duplicate path, don't double-inc
          return this.attemptModel.findOne({
            organizationId: new Types.ObjectId(organizationId),
            providerCallId: call.providerCallId,
          });
        }
        throw e;
      }
    } else {
      // Atomic match claim: only winner with providerCallId==null proceeds to increment
      const matched: any = await this.attemptModel.findOneAndUpdate(
        { _id: attempt._id, providerCallId: null },
        { $set: { providerCallId: call.providerCallId } },
        { new: true },
      );
      if (!matched) {
        // Lost race — another worker already matched; reload without side-effects
        return this.attemptModel.findOne({
          organizationId: new Types.ObjectId(organizationId),
          providerCallId: call.providerCallId,
        });
      }
      attempt = matched;
    }

    const connected = call.duration > 2;
    const countsAsAttempt = !!employee && call.callType === ProviderCallType.OUTGOING && !connected;
    attempt.employeePhoneNumber = call.employeePhoneNumber;
    attempt.duration = call.duration;
    attempt.callType = this.callType(call.callType);
    attempt.connected = connected;
    attempt.callDate = call.callDate;
    attempt.syncedAt = call.syncedAt || new Date();
    // Callyzer provides the call date and duration, but not a guaranteed answer timestamp.
    attempt.connectedAt = null;
    attempt.endedAt = new Date(call.callDate.getTime() + call.duration * 1000);
    attempt.status = this.status(call.callType, connected);
    attempt.countsAsAttempt = countsAsAttempt;
    attempt.syncStatus = candidates.length ? (collision ? CallSyncStatus.COLLISION : CallSyncStatus.MATCHED) : CallSyncStatus.UNMATCHED;
    attempt.recordingStatus = call.recordingUrl ? RecordingStatus.PENDING : RecordingStatus.NO_RECORDING;
    await attempt.save();

    await this.callEventModel.create({
      organizationId: attempt.organizationId,
      callAttemptId: attempt._id,
      employeeId: attempt.employeeId,
      deviceId: attempt.deviceId,
      type: collision
        ? CallEventType.CALLYZER_MATCH_COLLISION
        : candidates.length
          ? CallEventType.CALLYZER_CALL_MATCHED
          : CallEventType.CALLYZER_CALL_UNMATCHED,
      metadata: {
        providerCallId: call.providerCallId,
        candidateCount: candidates.length,
        timestampDeltaMs: candidates.length
          ? Math.abs(candidates[0].dialedAt.getTime() - call.callDate.getTime())
          : null,
      },
    });

    if (countsAsAttempt && attempt.leadId) await this.incrementLeadAttempt(attempt);
    if (call.recordingUrl) {
      attempt.recordingUrl = call.recordingUrl;
      await attempt.save();
      const { createHash } = await import('crypto');
      const urlHash = createHash('sha256').update(call.recordingUrl).digest('hex').slice(0, 12);
      await this.jobs.enqueue({
        key: `archive:${call.providerCallId}:${urlHash}`,
        organizationId,
        type: 'ARCHIVE_RECORDING',
        payload: { callAttemptId: attempt._id.toString(), recordingUrl: call.recordingUrl },
      });
    }
    return attempt;
  }

  private flattenPayload(payload: unknown): Array<Record<string, unknown>> {
    const calls: Array<Record<string, unknown>> = [];
    const visit = (value: unknown, inherited: Record<string, unknown> = {}) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => visit(entry, inherited));
        return;
      }
      if (!value || typeof value !== 'object') return;
      const object = value as Record<string, unknown>;
      if (Array.isArray(object.call_logs)) {
        const employee = {
          emp_name: object.emp_name,
          emp_code: object.emp_code,
          emp_country_code: object.emp_country_code,
          emp_number: object.emp_number,
          emp_tags: object.emp_tags,
        };
        visit(object.call_logs, { ...inherited, ...employee });
        return;
      }
      if (object.id && object.client_number) calls.push({ ...inherited, ...object });
    };
    visit(payload);
    return calls;
  }

  private async resolveEmployee(organizationId: string, phone: string) {
    const users = await this.userModel.find({
      organizationId: new Types.ObjectId(organizationId),
      callingEnabled: true,
      isActive: true,
    });
    return users.find((user) => normalizePhoneToE164(user.phone) === phone) || null;
  }

  private async resolveLead(organizationId: string, phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    const local = digits.slice(-10);
    const variants = Array.from(new Set([phone, digits, local, `91${local}`, `+91${local}`]));
    // An imported lead's alternate number is normalised and stored alongside the
    // primary one, so a call to it is still a lead call. Matching only `phone`
    // would let the lead-only gate delete that recording.
    return this.leadModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      $or: [{ phone: { $in: variants } }, { alternatePhone: { $in: variants } }],
    });
  }

  /**
   * Drops a call that belongs to no lead. Nothing is written to the CRM, and the
   * provider's copy of the audio is queued for deletion so personal call
   * recordings do not linger on Callyzer. Deletion goes through the queue rather
   * than a direct call because removeRecording sits behind Callyzer's global
   * request throttle and can rate-limit; failing inline would abort ingestion for
   * every other call in the same webhook batch.
   */
  private async discardNonLeadCall(organizationId: string, call: NormalizedProviderCall): Promise<void> {
    if (!call.recordingUrl) return;
    // A wrong CALLYZER_ORGANIZATION_ID points at an organisation with an empty
    // lead book, which would classify every call as personal and delete every
    // recording the provider holds. Withhold the purge until a lead exists;
    // dropping the call is recoverable, deleting the audio is not.
    const hasLeads = await this.leadModel.exists({
      organizationId: new Types.ObjectId(organizationId),
    });
    if (!hasLeads) {
      this.logger.warn(
        `Skipped the provider recording purge for call ${call.providerCallId}: organisation ` +
          `${organizationId} has no leads, which usually means CALLYZER_ORGANIZATION_ID is wrong.`,
      );
      return;
    }
    await this.jobs.enqueue({
      key: `purge-provider:${call.providerCallId}`,
      organizationId,
      type: 'PURGE_PROVIDER_RECORDING',
      payload: { providerCallId: call.providerCallId },
    });
  }

  private async incrementLeadAttempt(attempt: CallAttemptDocument) {
    const organization = await this.orgModel.findById(attempt.organizationId).select('maxUnsuccessfulAttempts');
    const threshold = organization?.maxUnsuccessfulAttempts || 4;
    const lead = await this.leadModel.findOneAndUpdate(
      { _id: attempt.leadId, organizationId: attempt.organizationId },
      { $inc: { attemptCount: 1 } },
      { new: true },
    );
    if (
      lead &&
      lead.attemptCount >= threshold &&
      [LeadStatus.NEW, LeadStatus.CALLING, LeadStatus.FOLLOW_UP].includes(lead.status)
    ) {
      lead.status = LeadStatus.NOT_PICKED_UP;
      await lead.save();
    }
  }

  private callType(value: string): ProviderCallType {
    return (Object.values(ProviderCallType) as string[]).includes(value)
      ? (value as ProviderCallType)
      : ProviderCallType.OUTGOING;
  }

  private status(callType: string, connected: boolean): CallAttemptStatus {
    if (connected) return CallAttemptStatus.COMPLETED;
    if (callType === ProviderCallType.MISSED) return CallAttemptStatus.MISSED;
    if (callType === ProviderCallType.REJECTED) return CallAttemptStatus.REJECTED;
    return CallAttemptStatus.NOT_CONNECTED;
  }
}

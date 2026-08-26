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
    const event = await this.eventModel.findById(eventId);
    if (!event || event.status === 'PROCESSED') return;
    try {
      const rawCalls = this.flattenPayload(event.payload);
      for (const raw of rawCalls) {
        await this.ingest(event.organizationId.toString(), this.callyzer.normalize(raw));
      }
      event.status = 'PROCESSED';
      event.processedAt = new Date();
      event.error = null;
      await event.save();
    } catch (error) {
      event.status = 'FAILED';
      event.error = error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000);
      await event.save();
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

  async ingest(organizationId: string, call: NormalizedProviderCall): Promise<CallAttemptDocument> {
    if (!call.providerCallId) throw new Error('Callyzer call is missing its unique id.');
    const duplicate = await this.attemptModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      providerCallId: call.providerCallId,
    });
    if (duplicate) {
      let changed = false;
      if (call.recordingUrl) {
        duplicate.recordingUrl = call.recordingUrl;
        if (!duplicate.recordingStatus || duplicate.recordingStatus === RecordingStatus.NO_RECORDING) {
          duplicate.recordingStatus = RecordingStatus.PENDING;
          changed = true;
          await this.jobs.enqueue({
            key: `archive:${call.providerCallId}`,
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
    if (!attempt) {
      const lead = await this.resolveLead(organizationId, call.clientPhoneNumber);
      attempt = await this.attemptModel.create({
        organizationId: new Types.ObjectId(organizationId),
        leadId: lead?._id || null,
        employeeId: employee?._id || null,
        provider: CallProviderType.CALLYZER_SIM,
        origin: CallOrigin.ANDROID,
        status: CallAttemptStatus.UNKNOWN,
        syncStatus: CallSyncStatus.UNMATCHED,
        phoneNumber: call.clientPhoneNumber,
        employeePhoneNumber: call.employeePhoneNumber,
        dialedAt: call.callDate,
      });
    }

    const connected = call.duration > 2;
    const countsAsAttempt = !!employee && call.callType === ProviderCallType.OUTGOING && !connected;
    attempt.providerCallId = call.providerCallId;
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
      await this.jobs.enqueue({
        key: `archive:${call.providerCallId}`,
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

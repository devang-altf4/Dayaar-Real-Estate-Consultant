import { Types } from 'mongoose';
import {
  CallAttemptStatus,
  CallEventType,
  CallSyncStatus,
  ProviderCallType,
  RecordingStatus,
} from '@dayaar/shared';
import { CallyzerIngestionService } from '../src/modules/callyzer/callyzer-ingestion.service';

/**
 * Spec 5.6: a provider call must attach to the closest dialled attempt, and an
 * ambiguous match is flagged rather than turned into a second record.
 */
describe('Callyzer call matching', () => {
  const organizationId = new Types.ObjectId().toString();
  const employeeId = new Types.ObjectId();
  const leadId = new Types.ObjectId();
  const callDate = new Date('2026-08-20T10:00:00.000Z');

  const buildCandidate = (offsetMs: number) => ({
    _id: new Types.ObjectId(),
    organizationId: new Types.ObjectId(organizationId),
    employeeId,
    leadId,
    deviceId: null,
    dialedAt: new Date(callDate.getTime() + offsetMs),
    providerCallId: null as string | null,
    syncStatus: CallSyncStatus.PENDING,
    save: jest.fn().mockResolvedValue(undefined),
  });

  const buildCall = () => ({
    providerCallId: 'provider-call-1',
    employeePhoneNumber: '+919876543210',
    clientPhoneNumber: '+919812345678',
    duration: 42,
    callType: ProviderCallType.OUTGOING,
    callDate,
    syncedAt: callDate,
    recordingUrl: undefined,
    raw: {},
  });

  const buildService = (
    candidates: any[],
    created: any[],
    lead: any = { _id: leadId },
    duplicate: any = null,
  ) => {
    const attemptModel: any = {
      findOne: jest.fn().mockResolvedValue(duplicate),
      find: jest.fn().mockResolvedValue(candidates),
      create: jest.fn().mockImplementation(async (doc: any) => {
        const record = { ...doc, _id: new Types.ObjectId(), save: jest.fn().mockResolvedValue(undefined) };
        created.push(record);
        return record;
      }),
    };
    const events: any[] = [];
    const enqueue = jest.fn();
    const service = new CallyzerIngestionService(
      {} as any,
      attemptModel,
      { create: jest.fn().mockImplementation(async (e: any) => events.push(e)) } as any,
      {
        find: jest.fn().mockResolvedValue([
          { _id: employeeId, phone: '9876543210', callingEnabled: true, isActive: true },
        ]),
      } as any,
      {
        findOne: jest.fn().mockResolvedValue(lead),
        exists: jest.fn().mockResolvedValue({ _id: leadId }),
      } as any,
      { findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }) } as any,
      { normalize: (raw: any) => raw } as any,
      { enqueue } as any,
    );
    return { service, attemptModel, events, enqueue };
  };

  it('attaches a single match to the dialled attempt', async () => {
    const candidate = buildCandidate(30_000);
    const created: any[] = [];
    const { service, attemptModel, events } = buildService([candidate], created);

    const result = await service.ingest(organizationId, buildCall() as any);

    expect(attemptModel.create).not.toHaveBeenCalled();
    expect(created).toHaveLength(0);
    expect(result).toBe(candidate);
    expect(candidate.providerCallId).toBe('provider-call-1');
    expect(candidate.syncStatus).toBe(CallSyncStatus.MATCHED);
    expect(events[0].type).toBe(CallEventType.CALLYZER_CALL_MATCHED);
  });

  it('takes the closest attempt on a collision instead of creating a duplicate', async () => {
    const far = buildCandidate(240_000);
    const near = buildCandidate(15_000);
    const created: any[] = [];
    const { service, attemptModel, events } = buildService([far, near], created);

    const result = await service.ingest(organizationId, buildCall() as any);

    // The orphaned-duplicate bug showed up here as an extra create() call.
    expect(attemptModel.create).not.toHaveBeenCalled();
    expect(created).toHaveLength(0);
    expect(result).toBe(near);
    expect(near.providerCallId).toBe('provider-call-1');
    expect(near.syncStatus).toBe(CallSyncStatus.COLLISION);
    expect(events[0].type).toBe(CallEventType.CALLYZER_MATCH_COLLISION);
    expect(events[0].metadata.candidateCount).toBe(2);
  });

  it('records an unmatched lead call without discarding it', async () => {
    const created: any[] = [];
    const { service, attemptModel, events } = buildService([], created);

    const result = await service.ingest(organizationId, buildCall() as any);

    expect(attemptModel.create).toHaveBeenCalledTimes(1);
    expect(result.syncStatus).toBe(CallSyncStatus.UNMATCHED);
    expect(result.providerCallId).toBe('provider-call-1');
    expect(result.leadId).toBe(leadId);
    expect(events[0].type).toBe(CallEventType.CALLYZER_CALL_UNMATCHED);
  });

  it('queries both phone and alternatePhone with deduplicated number variants', async () => {
    const filters: any[] = [];
    const created: any[] = [];
    const { service } = buildService([], created);
    (service as any).leadModel.findOne = jest.fn().mockImplementation(async (filter: any) => {
      filters.push(filter);
      return { _id: new Types.ObjectId() };
    });

    await service.ingest(organizationId, buildCall() as any);

    const variants = ['+919812345678', '919812345678', '9812345678'];
    expect(filters[0].$or).toEqual([
      { phone: { $in: variants } },
      { alternatePhone: { $in: variants } },
    ]);
  });
});

/**
 * Callyzer reports every call on the handset, including the telecaller's
 * personal ones. Only a number in the organisation's lead book may be tracked
 * or recorded; anything else is dropped and its provider audio deleted.
 */
describe('Callyzer lead-only tracking', () => {
  const organizationId = new Types.ObjectId().toString();
  const employeeId = new Types.ObjectId();
  const leadId = new Types.ObjectId();
  const callDate = new Date('2026-08-20T10:00:00.000Z');

  const buildCall = (overrides: Record<string, unknown> = {}) => ({
    providerCallId: 'provider-call-7',
    employeePhoneNumber: '+919876543210',
    clientPhoneNumber: '+919812345678',
    duration: 42,
    callType: ProviderCallType.OUTGOING,
    callDate,
    syncedAt: callDate,
    recordingUrl: 'https://callyzer.example/recording-7.mp3',
    raw: {},
    ...overrides,
  });

  const buildService = (options: {
    lead?: any;
    candidates?: any[];
    hasLeads?: boolean;
    duplicate?: any;
  } = {}) => {
    const created: any[] = [];
    const enqueue = jest.fn();
    const events: any[] = [];
    const attemptModel: any = {
      findOne: jest.fn().mockResolvedValue(options.duplicate ?? null),
      find: jest.fn().mockResolvedValue(options.candidates ?? []),
      create: jest.fn().mockImplementation(async (doc: any) => {
        const record = { ...doc, _id: new Types.ObjectId(), save: jest.fn().mockResolvedValue(undefined) };
        created.push(record);
        return record;
      }),
    };
    const service = new CallyzerIngestionService(
      {} as any,
      attemptModel,
      { create: jest.fn().mockImplementation(async (e: any) => events.push(e)) } as any,
      {
        find: jest.fn().mockResolvedValue([
          { _id: employeeId, phone: '9876543210', callingEnabled: true, isActive: true },
        ]),
      } as any,
      {
        findOne: jest.fn().mockResolvedValue(options.lead ?? null),
        exists: jest.fn().mockResolvedValue(options.hasLeads === false ? null : { _id: leadId }),
      } as any,
      { findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }) } as any,
      { normalize: (raw: any) => raw } as any,
      { enqueue } as any,
    );
    return { service, attemptModel, enqueue, created };
  };

  it('discards a call that matches no lead and queues the provider recording for deletion', async () => {
    const { service, attemptModel, enqueue } = buildService();

    const result = await service.ingest(organizationId, buildCall() as any);

    expect(result).toBeNull();
    expect(attemptModel.create).not.toHaveBeenCalled();
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith({
      key: 'purge-provider:provider-call-7',
      organizationId,
      type: 'PURGE_PROVIDER_RECORDING',
      payload: { providerCallId: 'provider-call-7' },
    });
  });

  it('discards a non-lead call with no recording without queueing any job', async () => {
    const { service, attemptModel, enqueue } = buildService();

    const result = await service.ingest(
      organizationId,
      buildCall({ recordingUrl: undefined }) as any,
    );

    expect(result).toBeNull();
    expect(attemptModel.create).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('tracks and archives a call that matches a lead', async () => {
    const { service, attemptModel, enqueue, created } = buildService({ lead: { _id: leadId } });

    const result = await service.ingest(organizationId, buildCall() as any);

    expect(result).not.toBeNull();
    expect(attemptModel.create).toHaveBeenCalledTimes(1);
    expect(created[0].leadId).toBe(leadId);
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ARCHIVE_RECORDING' }),
    );
  });

  it('keeps a dialled attempt that already carries a lead even when the number no longer resolves', async () => {
    const candidate = {
      _id: new Types.ObjectId(),
      organizationId: new Types.ObjectId(organizationId),
      employeeId,
      leadId,
      deviceId: null,
      dialedAt: new Date(callDate.getTime() + 20_000),
      providerCallId: null as string | null,
      syncStatus: CallSyncStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const { service, attemptModel } = buildService({ lead: null, candidates: [candidate] });

    const result = await service.ingest(organizationId, buildCall() as any);

    expect(result).toBe(candidate);
    expect(attemptModel.create).not.toHaveBeenCalled();
    expect(candidate.providerCallId).toBe('provider-call-7');
  });

  it('refuses to purge when the organisation has no leads at all', async () => {
    const { service, enqueue } = buildService({ hasLeads: false });

    const result = await service.ingest(organizationId, buildCall() as any);

    expect(result).toBeNull();
    expect(enqueue).not.toHaveBeenCalled();
  });

  const buildDuplicate = (attemptLeadId: any) => ({
    _id: new Types.ObjectId(),
    leadId: attemptLeadId,
    duration: null,
    recordingUrl: null,
    recordingStatus: RecordingStatus.NO_RECORDING,
    connected: null,
    status: CallAttemptStatus.UNKNOWN,
    save: jest.fn().mockResolvedValue(undefined),
  });

  it('does not archive new audio for a legacy attempt that has no lead', async () => {
    const duplicate = buildDuplicate(null);
    const { service, enqueue } = buildService({ duplicate });

    const result = await service.ingest(organizationId, buildCall() as any);

    expect(result).toBe(duplicate);
    expect(enqueue).not.toHaveBeenCalled();
    expect(duplicate.recordingStatus).toBe(RecordingStatus.NO_RECORDING);
  });

  it('still archives new audio for an existing attempt that has a lead', async () => {
    const duplicate = buildDuplicate(leadId);
    const { service, enqueue } = buildService({ duplicate });

    await service.ingest(organizationId, buildCall() as any);

    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ARCHIVE_RECORDING' }),
    );
    expect(duplicate.recordingStatus).toBe(RecordingStatus.PENDING);
  });
});

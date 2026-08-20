import { Types } from 'mongoose';
import { CallEventType, CallSyncStatus, ProviderCallType } from '@dayaar/shared';
import { CallyzerIngestionService } from '../src/modules/callyzer/callyzer-ingestion.service';

/**
 * Spec 5.6: a provider call must attach to the closest dialled attempt, and an
 * ambiguous match is flagged rather than turned into a second record.
 */
describe('Callyzer call matching', () => {
  const organizationId = new Types.ObjectId().toString();
  const employeeId = new Types.ObjectId();
  const callDate = new Date('2026-08-20T10:00:00.000Z');

  const buildCandidate = (offsetMs: number) => ({
    _id: new Types.ObjectId(),
    organizationId: new Types.ObjectId(organizationId),
    employeeId,
    leadId: null,
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

  const buildService = (candidates: any[], created: any[]) => {
    const attemptModel: any = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue(candidates),
      create: jest.fn().mockImplementation(async (doc: any) => {
        const record = { ...doc, _id: new Types.ObjectId(), save: jest.fn().mockResolvedValue(undefined) };
        created.push(record);
        return record;
      }),
    };
    const events: any[] = [];
    const service = new CallyzerIngestionService(
      {} as any,
      attemptModel,
      { create: jest.fn().mockImplementation(async (e: any) => events.push(e)) } as any,
      {
        find: jest.fn().mockResolvedValue([
          { _id: employeeId, phone: '9876543210', callingEnabled: true, isActive: true },
        ]),
      } as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      { findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }) } as any,
      { normalize: (raw: any) => raw } as any,
      { enqueue: jest.fn() } as any,
    );
    return { service, attemptModel, events };
  };

  it('attaches a single match to the dialled attempt', async () => {
    const candidate = buildCandidate(30_000);
    const created: any[] = [];
    const { service, attemptModel, events } = buildService([candidate], created);

    const result = await service.ingest(organizationId, buildCall() as any);

    expect(attemptModel.create).not.toHaveBeenCalled();
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

  it('records an unmatched call without discarding it', async () => {
    const created: any[] = [];
    const { service, attemptModel, events } = buildService([], created);

    const result = await service.ingest(organizationId, buildCall() as any);

    expect(attemptModel.create).toHaveBeenCalledTimes(1);
    expect(result.syncStatus).toBe(CallSyncStatus.UNMATCHED);
    expect(result.providerCallId).toBe('provider-call-1');
    expect(events[0].type).toBe(CallEventType.CALLYZER_CALL_UNMATCHED);
  });
});

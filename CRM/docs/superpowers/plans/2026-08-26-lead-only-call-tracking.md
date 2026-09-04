# Lead-Only Call Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the CRM track and record a Callyzer call only when its client number belongs to a lead in that organization, and delete the provider-side recording for every call that does not.

**Architecture:** Callyzer reports *every* call on a telecaller's handset, and `CallyzerIngestionService.ingest()` currently persists all of them — creating a `CallAttempt` with `leadId: null` for personal calls and archiving their audio to Backblaze B2. This plan adds a single gate inside `ingest()`, immediately after candidate matching, that resolves the client number against the organization's lead book. A hit proceeds down the existing path unchanged. A miss returns `null` before any write, and enqueues a new `PURGE_PROVIDER_RECORDING` job that asks Callyzer to delete its copy of the audio. Both entry points (webhook processing and history reconciliation) funnel through `ingest()`, so one gate covers everything.

**Tech Stack:** NestJS 10, TypeScript 5.7, Mongoose 8, Jest 29 + ts-jest, pnpm 11 workspaces.

## Global Constraints

- Before Task 1, create a working branch off the current `main` (which is at `b05d254`) and commit every task onto it:

```bash
git checkout -b feat/lead-only-call-tracking
```

  Do not commit onto `main` — pushing `main` auto-deploys to Render, and this change begins irreversibly deleting provider recordings the moment it is live.
- API package is `@dayaar/api`, rooted at `apps/api`. All file paths below are repo-relative.
- Run tests with `pnpm --filter @dayaar/api test`. Type-check with `pnpm --filter @dayaar/api lint` (this runs `tsc --noEmit`, it is not ESLint).
- Tests are **pure unit tests with hand-built mocks**. There is no MongoDB test instance, no `@nestjs/testing` module compilation, and no `mongodb-memory-server`. Follow the existing style in `apps/api/test/callyzer-matching.spec.ts`: construct the service directly with `new`, passing mock objects positionally and casting each with `as any`.
- `apps/api/tsconfig.json:18` sets `"strictNullChecks": false`, overriding the root `tsconfig.base.json`. Widening `ingest()` to `Promise<CallAttemptDocument | null>` therefore breaks **no** existing caller or test: `result.syncStatus` on a possibly-null value still compiles. Do not add `!` assertions to work around a null check that this package does not perform, and do not turn `strictNullChecks` on — that is a repo-wide change far outside this plan.
- Jest `testRegex` is `.*\.spec\.ts$` with roots `apps/api/src` and `apps/api/test`. New tests go in `apps/api/test/`.
- **Do not** change `apps/mobile`, `apps/web`, or `packages/shared`. Because non-lead calls are never persisted, the Telecalling Logs views on both clients filter themselves with no query or UI edits.
- **Do not** add a feature flag or environment variable. This ships enforcing from the first webhook after deploy — that was an explicit product decision.
- **Do not** delete, hide, or migrate `CallAttempt` rows that already exist, and do not touch anything already in B2. Existing non-lead call logs stay visible. Only calls arriving after deploy are filtered.
- The match rule is **organization lead membership, not assignment**. A call to a lead assigned to a different employee, and a call to a lead nobody is assigned to yet, are both tracked and recorded. Never compare `lead.assignedEmployeeId` in the gate.
- Deleting a provider recording is **irreversible**. Every guard in Task 3 exists for that reason; do not simplify them away.
- Preserve the existing comment style: comments explain *why* a decision was made, not what the line does. Match the surrounding density — sparse, only where a reader would otherwise be puzzled.

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `apps/api/src/database/schemas/integration-job.schema.ts` | Job queue document shape | Modify: add `'PURGE_PROVIDER_RECORDING'` to the `type` union (line 15) |
| `apps/api/src/modules/callyzer/recordings.service.ts` | Recording archive / export / retention lifecycle | Modify: add `purgeProviderRecording(providerCallId)` |
| `apps/api/src/modules/callyzer/integration-worker.service.ts` | Job queue consumer, dispatches by job type | Modify: add `case 'PURGE_PROVIDER_RECORDING'` to the switch (line 56) |
| `apps/api/src/modules/callyzer/callyzer-ingestion.service.ts` | Normalizes and persists provider calls | Modify: `resolveLead()` matches `alternatePhone`; `ingest()` gains the lead gate and returns `\| null`; new private `discardNonLeadCall()`; `duplicate` branch stops archiving lead-less attempts |
| `apps/api/test/provider-recording-purge.spec.ts` | Unit tests for the purge service method | **Create** |
| `apps/api/test/callyzer-matching.spec.ts` | Unit tests for provider-call matching | Modify: mocks must supply a lead; add a `describe` block for the gate |

No module registration changes are needed. `CallyzerIngestionService` already injects `leadModel` and `jobs`, and `IntegrationWorkerService` already injects `RecordingsService`.

---

### Task 1: Provider-recording purge capability

Builds the mechanism that deletes a recording from Callyzer, and wires it into the job queue. Nothing calls it yet — Task 3 does. This lands first because `IntegrationJobsService.enqueue()` types its `type` parameter as `IntegrationJob['type']`, so Task 3's `enqueue` call will not compile until the union member exists.

**Files:**
- Modify: `apps/api/src/database/schemas/integration-job.schema.ts:15`
- Modify: `apps/api/src/modules/callyzer/recordings.service.ts`
- Modify: `apps/api/src/modules/callyzer/integration-worker.service.ts:56-77`
- Test: `apps/api/test/provider-recording-purge.spec.ts` (create)

**Interfaces:**
- Consumes: `CallyzerClient.removeRecording(providerCallId: string): Promise<void>` — already exists at `apps/api/src/modules/callyzer/callyzer.client.ts:42`. It resolves when Callyzer confirms deletion *or* reports the recording was already absent, and throws otherwise.
- Produces:
  - `IntegrationJob['type']` gains the literal `'PURGE_PROVIDER_RECORDING'`.
  - `RecordingsService.purgeProviderRecording(providerCallId: string): Promise<void>`.
  - Job contract: `{ key: 'purge-provider:<providerCallId>', type: 'PURGE_PROVIDER_RECORDING', payload: { providerCallId: string } }`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/test/provider-recording-purge.spec.ts`:

```ts
import { RecordingsService } from '../src/modules/callyzer/recordings.service';

/**
 * A call the lead-only policy discards never reaches durable storage, so the
 * provider copy is the only one that exists. Removing it is the whole cleanup.
 */
describe('RecordingsService.purgeProviderRecording', () => {
  const buildService = (removeRecording: jest.Mock) =>
    new RecordingsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { removeRecording } as any,
      { enqueue: jest.fn() } as any,
      { log: jest.fn() } as any,
    );

  it('asks Callyzer to delete the provider recording', async () => {
    const removeRecording = jest.fn().mockResolvedValue(undefined);

    await buildService(removeRecording).purgeProviderRecording('provider-call-9');

    expect(removeRecording).toHaveBeenCalledWith('provider-call-9');
  });

  it('ignores an empty provider id instead of calling the provider', async () => {
    const removeRecording = jest.fn().mockResolvedValue(undefined);

    await buildService(removeRecording).purgeProviderRecording('');

    expect(removeRecording).not.toHaveBeenCalled();
  });

  it('propagates provider failures so the queue retries the job', async () => {
    const removeRecording = jest.fn().mockRejectedValue(new Error('Callyzer rate limit reached.'));

    await expect(
      buildService(removeRecording).purgeProviderRecording('provider-call-9'),
    ).rejects.toThrow('Callyzer rate limit reached.');
  });
});
```

The eight positional mocks match the constructor at `recordings.service.ts:19-28` in order: `attemptModel`, `eventModel`, `orgModel`, `exportModel`, `storage`, `callyzer`, `jobs`, `audit`. Only `callyzer` is exercised.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dayaar/api test -- provider-recording-purge`

Expected: FAIL. ts-jest reports `Property 'purgeProviderRecording' does not exist on type 'RecordingsService'`.

- [ ] **Step 3: Add the job type**

In `apps/api/src/database/schemas/integration-job.schema.ts`, replace line 15:

```ts
  type: 'PROCESS_WEBHOOK' | 'CALLYZER_RECONCILE' | 'ARCHIVE_RECORDING' | 'RETENTION' | 'RECORDING_EXPORT';
```

with:

```ts
  type:
    | 'PROCESS_WEBHOOK'
    | 'CALLYZER_RECONCILE'
    | 'ARCHIVE_RECORDING'
    | 'PURGE_PROVIDER_RECORDING'
    | 'RETENTION'
    | 'RECORDING_EXPORT';
```

- [ ] **Step 4: Add the service method**

In `apps/api/src/modules/callyzer/recordings.service.ts`, insert this method immediately after `archive()` ends (after the closing brace on line 93, before `createExport`):

```ts
  /**
   * Deletes a recording that exists only at the provider. Used for calls the
   * lead-only policy discards: nothing was archived, so the provider copy is
   * the sole copy and removing it is the entire cleanup. Failures propagate so
   * the queue retries behind Callyzer's global request throttle.
   */
  async purgeProviderRecording(providerCallId: string): Promise<void> {
    if (!providerCallId) return;
    await this.callyzer.removeRecording(providerCallId);
    this.logger.log(`Deleted the provider recording for non-lead call ${providerCallId}.`);
  }
```

`this.logger` already exists at line 17. `this.callyzer` already exists at line 25.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @dayaar/api test -- provider-recording-purge`

Expected: PASS, 3 tests.

- [ ] **Step 6: Wire the worker case**

In `apps/api/src/modules/callyzer/integration-worker.service.ts`, inside the `switch (job.type)` block, add this case directly after the `ARCHIVE_RECORDING` case (which ends on line 70):

```ts
          case 'PURGE_PROVIDER_RECORDING':
            await this.recordings.purgeProviderRecording(String(payload.providerCallId));
            break;
```

`this.recordings` is already injected at line 22. Do not add a dedicated worker test — `IntegrationWorkerService` has no existing spec, and the switch is exhaustively type-checked against the union from Step 3, which `tsc --noEmit` verifies in Step 7.

- [ ] **Step 7: Type-check the whole API**

Run: `pnpm --filter @dayaar/api lint`

Expected: exits 0, no output.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/database/schemas/integration-job.schema.ts apps/api/src/modules/callyzer/recordings.service.ts apps/api/src/modules/callyzer/integration-worker.service.ts apps/api/test/provider-recording-purge.spec.ts
git commit -m "feat(calling): add provider-recording purge job for non-lead calls"
```

---

### Task 2: Lead resolution covers alternatePhone

`resolveLead()` matches only the `phone` field. Leads carry a normalized `alternatePhone` too — `lead-import.service.ts:367` and `leads.service.ts:312` both write it through `normalizePhoneNumber`. Today missing it is harmless; once Task 3's gate is live it would classify a call to a lead's second number as personal and **permanently delete that recording**. Fix the matcher before the gate depends on it.

**Files:**
- Modify: `apps/api/src/modules/callyzer/callyzer-ingestion.service.ts:230-237`
- Test: `apps/api/test/callyzer-matching.spec.ts`

**Interfaces:**
- Consumes: `Lead.alternatePhone: string` — declared at `apps/api/src/database/schemas/lead.schema.ts:66-67`, stored as bare local digits.
- Produces: `resolveLead(organizationId: string, phone: string)` now returns a lead matched on `phone` **or** `alternatePhone`, and returns `null` for an empty/undialable number. It stays `private`; it is exercised through `ingest()`.

- [ ] **Step 1: Write the failing test**

In `apps/api/test/callyzer-matching.spec.ts`, add this test at the end of the existing `describe('Callyzer call matching')` block, after the `'records an unmatched call without discarding it'` test (which closes on line 108):

```ts
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
```

`buildCall()` reports `clientPhoneNumber: '+919812345678'`, so the variant set is the E.164 form, the bare digits, and the last ten digits — three distinct values after deduplication.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dayaar/api test -- callyzer-matching`

Expected: FAIL on the new test. The received value is `undefined` because the current filter uses a top-level `phone` key with no `$or`.

- [ ] **Step 3: Rewrite resolveLead**

In `apps/api/src/modules/callyzer/callyzer-ingestion.service.ts`, replace the whole method at lines 230-237:

```ts
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
```

The `if (!digits) return null;` guard matters: without it an empty client number collapses the variant list to `['', '91', '+91']`, which could match an unrelated lead whose `alternatePhone` holds a stray value.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @dayaar/api test -- callyzer-matching`

Expected: PASS, 4 tests. The three pre-existing tests still pass — this task does not change control flow, only the query shape.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/callyzer/callyzer-ingestion.service.ts apps/api/test/callyzer-matching.spec.ts
git commit -m "fix(calling): resolve leads by alternate phone during Callyzer ingestion"
```

---

### Task 3: Gate ingestion on lead membership

The core change. A call whose client number resolves to no lead is discarded before any write, and its provider recording is queued for deletion.

**Files:**
- Modify: `apps/api/src/modules/callyzer/callyzer-ingestion.service.ts` (`ingest()` signature and lines 103-142; new private method after `resolveLead`)
- Test: `apps/api/test/callyzer-matching.spec.ts` (update the shared harness, add a new `describe`)

**Interfaces:**
- Consumes: `RecordingsService.purgeProviderRecording` indirectly, via the `PURGE_PROVIDER_RECORDING` job contract from Task 1. `resolveLead` from Task 2.
- Produces:
  - `ingest(organizationId: string, call: NormalizedProviderCall): Promise<CallAttemptDocument | null>` — `null` means the call was discarded as non-lead.
  - `private discardNonLeadCall(organizationId: string, call: NormalizedProviderCall): Promise<void>`.
- Callers need no change: `processWebhookEvent` (line 46) and `reconcile` (line 65) both discard the return value already.

- [ ] **Step 1: Update the shared test harness**

The existing harness mocks `leadModel.findOne` to resolve `null` and builds candidates with `leadId: null`. Neither is reachable in production — `initiateCall` at `apps/api/src/modules/calling/calling.service.ts:56-68` throws `NotFoundException` unless it loads a real lead, so every dialled attempt carries a `leadId`. Make the harness realistic first, otherwise every existing test falls into the new discard path.

In `apps/api/test/callyzer-matching.spec.ts`:

Add a `leadId` constant beside the existing ids (after line 11's `employeeId`):

```ts
  const leadId = new Types.ObjectId();
```

Give candidates a lead — in `buildCandidate`, replace `leadId: null,` with:

```ts
    leadId,
```

Replace the whole `buildService` function (lines 38-64) with:

```ts
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
```

The eight positional mocks match the constructor at `callyzer-ingestion.service.ts:29-38`: `eventModel`, `attemptModel`, `callEventModel`, `userModel`, `leadModel`, `orgModel`, `callyzer`, `jobs`.

Rename the third existing test so its premise stays true, replacing line 98's title:

```ts
  it('records an unmatched lead call without discarding it', async () => {
```

and add one assertion to that test's body, after the existing `expect(result.providerCallId)` line (line 106):

```ts
    expect(result.leadId).toBe(leadId);
```

Leave lines 105-106 exactly as they are. `ingest` becomes nullable in Step 4, but this package compiles with `strictNullChecks: false`, so their property access on `result` stays valid.

- [ ] **Step 2: Write the failing tests for the gate**

In the same file, add a second top-level `describe` block after the closing `});` of `describe('Callyzer call matching')` (line 109). It reuses nothing from the first block, so restate the fixtures:

```ts
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
});
```

The new block's candidate uses `CallAttemptStatus`, which the file does not import yet. Replace line 2:

```ts
import { CallAttemptStatus, CallEventType, CallSyncStatus, ProviderCallType } from '@dayaar/shared';
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @dayaar/api test -- callyzer-matching`

Expected: FAIL. The five new tests fail because `ingest` still creates a `CallAttempt` for every call — `expect(result).toBeNull()` receives a document, and `enqueue` is never called with the purge job.

- [ ] **Step 4: Change the ingest return type**

In `apps/api/src/modules/callyzer/callyzer-ingestion.service.ts`, change the signature on line 72:

```ts
  async ingest(organizationId: string, call: NormalizedProviderCall): Promise<CallAttemptDocument> {
```

to:

```ts
  async ingest(organizationId: string, call: NormalizedProviderCall): Promise<CallAttemptDocument | null> {
```

- [ ] **Step 5: Insert the gate**

Still in `ingest()`. The current code between the candidate sort and the create call reads (lines 116-142):

```ts
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
```

Replace everything from `const collision` through the closing brace of `if (!attempt) { ... }` with:

```ts
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
      });
    }
```

Two details that matter:
- `resolveLead` now runs on every call, not only unmatched ones. That is required — the gate cannot decide without it.
- `trackedLeadId` is what gets written to `leadId`, replacing `lead?._id || null`. After the early return it is always truthy, so no new attempt can ever be created with a null lead again.

- [ ] **Step 6: Add the discard handler**

In the same file, insert this method immediately after `resolveLead` ends (after its closing brace, before `incrementLeadAttempt`):

```ts
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
```

`this.logger` already exists at line 27. The `purge-provider:<id>` key makes the job idempotent under webhook replay, because `IntegrationJobsService.enqueue` upserts with `$setOnInsert`.

A lead lookup that *throws* must never be read as a miss. Both `resolveLead` and `leadModel.exists` propagate their errors up through `ingest` to `processWebhookEvent`, which marks the event `FAILED` and rethrows so the job retries. Do not wrap either call in a `try/catch` that swallows.

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter @dayaar/api test -- callyzer-matching`

Expected: PASS, 9 tests across both describe blocks.

- [ ] **Step 8: Type-check**

Run: `pnpm --filter @dayaar/api lint`

Expected: exits 0. If it reports an unused `RecordingStatus` or similar in the ingestion service, leave the import alone — it is still used by the `duplicate` branch and by line 159.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/callyzer/callyzer-ingestion.service.ts apps/api/test/callyzer-matching.spec.ts
git commit -m "feat(calling): track and record only calls to lead numbers"
```

---

### Task 4: Stop re-archiving legacy lead-less attempts

Non-lead `CallAttempt` rows already in Mongo carry a `providerCallId`, so a later webhook for the same call hits the `duplicate` short-circuit at line 78 — above the new gate — and would keep pulling fresh audio into B2. Leaving history alone means not deleting those rows; it does not mean continuing to archive new audio for them.

**Files:**
- Modify: `apps/api/src/modules/callyzer/callyzer-ingestion.service.ts:78-101`
- Test: `apps/api/test/callyzer-matching.spec.ts`

**Interfaces:**
- Consumes: the `duplicate: any` option added to the new block's `buildService` in Task 3, Step 2.
- Produces: no new API. Behaviour change only.

- [ ] **Step 1: Write the failing tests**

Add these two tests inside the `describe('Callyzer lead-only tracking')` block created in Task 3, before its closing `});`:

```ts
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
```

Extend the file's `@dayaar/shared` import on line 2 to add `RecordingStatus`, which `buildDuplicate` needs (`CallAttemptStatus` arrived in Task 3). The line should end up as:

```ts
import {
  CallAttemptStatus,
  CallEventType,
  CallSyncStatus,
  ProviderCallType,
  RecordingStatus,
} from '@dayaar/shared';
```

- [ ] **Step 2: Run tests to verify one fails**

Run: `pnpm --filter @dayaar/api test -- callyzer-matching`

Expected: FAIL on `'does not archive new audio for a legacy attempt that has no lead'` — `enqueue` was called with an `ARCHIVE_RECORDING` job. The second new test already passes; it is the regression guard for Step 3.

- [ ] **Step 3: Guard the duplicate branch**

In `apps/api/src/modules/callyzer/callyzer-ingestion.service.ts`, change line 80 from:

```ts
      if (call.recordingUrl) {
```

to:

```ts
      // Rows created before lead-only tracking can have no lead. They are left in
      // place deliberately, but must not pull further audio into durable storage.
      if (call.recordingUrl && duplicate.leadId) {
```

Change nothing else in that branch.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @dayaar/api test -- callyzer-matching`

Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/callyzer/callyzer-ingestion.service.ts apps/api/test/callyzer-matching.spec.ts
git commit -m "fix(calling): stop archiving audio for legacy lead-less call attempts"
```

---

### Task 5: Full verification

**Files:** none modified.

**Interfaces:** none.

- [ ] **Step 1: Run the whole API suite**

Run: `pnpm --filter @dayaar/api test`

Expected: PASS. Every spec under `apps/api/test` and `apps/api/src` is green, including `business-rules.spec.ts`, `security-hardening.spec.ts`, and `recording-durability.spec.ts`. None of those construct `CallyzerIngestionService`, so none should need edits — if one fails, read it before changing it.

- [ ] **Step 2: Type-check both packages**

Run: `pnpm lint`

Expected: exits 0. This runs `tsc --noEmit` for `@dayaar/shared` then `@dayaar/api`.

- [ ] **Step 3: Production build**

Run: `pnpm build:api`

Expected: `nest build` succeeds and emits to `apps/api/dist`. This is the check that matters most — Render runs this build, and a missing import here is what broke the previous deploy.

- [ ] **Step 4: Confirm the blast radius**

Run: `git diff --stat b05d254`

Diff against the starting commit, not against `main` — all five commits land on the working branch and `main` has not moved.

Expected: only these six files.

```
apps/api/src/database/schemas/integration-job.schema.ts
apps/api/src/modules/callyzer/callyzer-ingestion.service.ts
apps/api/src/modules/callyzer/integration-worker.service.ts
apps/api/src/modules/callyzer/recordings.service.ts
apps/api/test/callyzer-matching.spec.ts
apps/api/test/provider-recording-purge.spec.ts
```

If `apps/mobile`, `apps/web`, or `packages/shared` appear, something went out of scope — revert it.

- [ ] **Step 5: Report, do not deploy**

Stop here and report status. Leave the work on the branch — do not merge or push to `main`, and do not open a PR unless asked. Merging auto-deploys to Render, which starts irreversibly deleting provider recordings, and the human owner wants to audit the diff first.

---

## Post-Deploy Expectations

State these plainly when reporting, so nobody reads them as bugs:

- Call logs already in the CRM — including the `+1737…` entries currently visible in the mobile Telecalling Logs — **remain**. Only calls arriving after deploy are filtered. A cleanup migration was explicitly deferred.
- The first few hours produce `Deleted the provider recording for non-lead call …` log lines at a rate matching the telecallers' personal call volume. That is the feature working.
- A `Skipped the provider recording purge … has no leads` warning means `CALLYZER_ORGANIZATION_ID` is pointing at the wrong organization. Treat it as a configuration alarm, not a nuisance.
- Raw webhook payloads in the `callyzerWebhookEvents` collection still contain personal numbers; that field is the dedupe key's source and was left untouched. Redaction or a TTL is a separate decision.

## Deliberately Out of Scope

Do not fix these, even though they sit in the files being edited. Each is a real issue; each needs its own decision.

- **`recordings.service.ts:75-81` early-returns before deleting the provider copy** when no durable archive exists. Correct as written, but it means provider recordings accumulate whenever B2 is unconfigured.
- **`callyzer-ingestion.service.ts` line 81 assigns `duplicate.recordingUrl` without setting `changed`**, so the refreshed URL is not persisted when `recordingStatus` is already `PENDING`. This is a latent bug that plausibly contributes to recording playback failures, but fixing it changes behaviour beyond this plan's scope.
- **The `HTTP 400 while loading audio` playback error** on the mobile Telecalling Logs screen is unrelated to lead filtering and is not addressed here.

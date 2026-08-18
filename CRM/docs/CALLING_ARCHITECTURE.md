# Calling Architecture & Cellular Bridge

## Overview
Traditional cloud telephony providers (e.g. Exotel, Twilio) charge per-minute double-leg PSTN fees (Provider -> Agent, Provider -> Customer). For an enterprise with 30-50 telecallers making ~300 calls/day (~9,000 to 15,000 calls daily), this approach creates unsustainable operational overhead.

Dayaar CRM utilizes **Company Android Devices with Unlimited Corporate SIMs** as cellular calling gateways.

---

## End-to-End Call Execution Flow

```
Web CRM (Agent)                  Backend API / WSS                Paired Android Device             Customer Phone
      |                                  |                                  |                             |
      | 1. Click [ CALL ]                |                                  |                             |
      |    (leadId ONLY)                 |                                  |                             |
      |--------------------------------->|                                  |                             |
      |                                  | 2. Authenticate & Resolve Phone  |                             |
      |                                  |    Verify Device Online & SIM    |                             |
      |                                  |    Create CallAttempt & Command  |                             |
      |                                  |                                  |                             |
      |                                  | 3. Dispatch CallCommand (WSS/FCM)|                             |
      |                                  |--------------------------------->|                             |
      |                                  |                                  | 4. Acknowledge Command      |
      |                                  |<---------------------------------|                             |
      | 5. Realtime "DIALING" Status     |                                  |                             |
      |<---------------------------------|                                  | 5. Dial Cellular SIM        |
      |                                  |                                  |---------------------------->|
      |                                  |                                  |                             | 6. Phone Rings
      |                                  |                                  |                             |    & Connects
      |                                  |                                  | 7. Cellular Call Connected  |
      |                                  | 8. Telephony Connected Event     |<----------------------------|
      | 9. Realtime "CONNECTED" Timer    |<---------------------------------|                             |
      |<---------------------------------|                                  |                             |
      |                                  |                                  | 10. Call Concludes          |
      |                                  |                                  |<----------------------------|
      |                                  | 11. Sync Call Log & Outcome      |                             |
      |                                  |<---------------------------------|                             |
      |                                  | 12. Evaluate 4-Attempt Rule      |                             |
      | 13. Call Complete & Quick Disp   |                                  | 13. Request Upload URL      |
      |<---------------------------------|                                  |<----------------------------|
      |                                  |                                  | 14. Provide Presigned URL   |
      |                                  |                                  |---------------------------->|
      |                                  |                                  | 15. Upload Binary Audio     |
      |                                  |                                  |----------------------------> Storage (S3/Local)
      |                                  | 16. Audio Upload Complete Event  |                             |
      | 17. Waveform Audio Player Ready  |<---------------------------------|                             |
      |<---------------------------------|                                  |                             |
```

---

## Telephony Abstraction Layer

```typescript
export interface CallingProvider {
  readonly providerId: CallProviderType; // ANDROID_SIM | EXOTEL | SIP
  initiateCall(command: CallCommandEntity): Promise<CallInitiateResult>;
  normalizeCallResult(rawStatus: string, durationSeconds: number): NormalizedCallResult;
  cancelCall(commandId: string): Promise<boolean>;
}
```

The CRM business layer interacts solely through `CallingProvider`. The default provider `AndroidSimCallingProvider` queues and dispatches commands to the employee's active device.

---

## 4-Attempt Rule Specification
- Unsuccessful genuine customer outcomes: `NOT_CONNECTED`, `BUSY`, `NO_ANSWER`, `UNANSWERED`.
  - Increments `attemptCount += 1`.
  - If `attemptCount >= 4` and lead status is not already converted, lead automatically transitions to `NOT_PICKED_UP`.
- Technical failures: `FAILED`, `DEVICE_OFFLINE`, `CANCELLED`, `NETWORK_ERROR`.
  - `countsAsAttempt = false`.
  - `attemptCount` is NOT incremented.

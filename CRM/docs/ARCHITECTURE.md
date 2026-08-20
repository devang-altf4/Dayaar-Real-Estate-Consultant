# Architecture

## Boundaries

The CRM API owns identity, tenancy, lead access, calling seats, dial intents, dispositions, archives, retention, and audit events. The Android app owns only secure device pairing and company-SIM dialing. Callyzer owns call capture and the source recording. Backblaze B2 is the primary private archive; the configured VPS path is the disaster-recovery copy.

```text
Web CRM --JWT--> NestJS API --FCM data command--> paired Android --company SIM--> customer
                         ^                              |
                         |                              | device status only
                         +------------------------------+

Callyzer Biz/Cloud --signed webhook + reconciliation--> durable Mongo jobs
                                                          |
                                                          +--> B2 primary
                                                          +--> VPS backup
                                                          +--> delete Callyzer recording after both verify
```

No client-provided phone number is trusted. The server resolves lead and employee numbers, normalizes them to E.164, enforces assignment/team access, checks `callingEnabled`, and applies the redial gap.

## Async processing

Callyzer webhook bodies are stored before processing. Mongo-backed jobs use leases, retry with backoff, and idempotency keys. A daily reconciliation covers missed webhook events. Archive, retention, and export work is asynchronous.

## Recording lifecycle

1. Callyzer call is matched by provider ID or employee/customer/time window.
2. Recording is downloaded with size limits.
3. A deterministic object key and SHA-256 hash are produced.
4. B2 and VPS copies are written and verified.
5. Only then is the Callyzer recording deleted.
6. User purge removes the B2 copy but preserves the VPS recovery copy.
7. Retention removes both copies after the organization retention period.

## Security invariants

- Every database/API query is scoped by `organizationId`.
- Employees see only their assigned leads and their own calls.
- Managers see their team; admins see their organization.
- Recording storage keys are excluded from API serialization.
- Employees cannot call the signed-recording endpoint.
- Device credentials are hashed server-side and encrypted at rest on Android.
- FCM commands contain a server-resolved E.164 number, command/attempt IDs, and a 60-second expiry.
- Callyzer webhook authentication uses a timing-safe secret comparison.

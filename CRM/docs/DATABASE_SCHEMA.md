# Calling data model

All operational documents are tenant-scoped by `organizationId` and indexed for their access path.

## Organization and user

- Organization: calling seat limit, unsuccessful-attempt threshold, daily target, B2 retention months (6-12), timezone, and attendance settings.
- User: organization/manager relationship, normalized company SIM phone, role, active status, and `callingEnabled` seat assignment.

## Android device and command

- Android device: user/organization binding, hashed auth token, Firebase token, SIM state/operator, primary flag, presence timestamps, and dial-only capabilities.
- Pairing session: hashed code/token, five-minute expiry, and single-use claim state.
- Call command: employee, lead, device, attempt, server-resolved E.164 number, delivery/ack state, and expiry.

## Call attempt

Canonical fields include provider/origin/status/sync status, nullable lead/employee for unmatched provider events, normalized client/employee phones, provider call ID/type, connectivity, duration, provider timestamps, attempt-count decision, per-call disposition/reason/notes/follow-up, recording lifecycle metadata, and hidden B2/VPS keys.

Provider call ID is unique when present. Matching indexes cover organization, employee/client phones, dial time, and pending sync state.

## Integration durability

- Callyzer webhook event stores the raw body, dedupe hash, processing status, and error.
- Integration job stores type, idempotency key, payload, run time, lease, attempts, and terminal state.
- Provider throttle coordinates the Callyzer one-request-per-two-seconds limit across API instances.
- Recording export stores organization, requester, range, job status, private export key, download confirmation, and expiry.

## Storage policy

`recordingB2Key` and `recordingVpsPath` are selected out by default and stripped again at the serializer boundary. Employees receive no recording lifecycle metadata. Provider recordings are deleted only after both archive copies verify.

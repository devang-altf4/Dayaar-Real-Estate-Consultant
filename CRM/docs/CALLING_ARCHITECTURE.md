# Calling and recording flow

## Web-origin call

1. Employee clicks Call with `leadId` only.
2. API validates tenant/lead access, active calling seat, employee number, paired primary device, FCM token, and redial gap.
3. API creates a `CallAttempt` with `origin=WEB`, `provider=CALLYZER_SIM`, and `syncStatus=PENDING`.
4. API persists a `CallCommand`, sends a high-priority FCM data message, then marks delivery.
5. Android validates the type, E.164 phone, command ID, duplicate state, and expiry before using `ACTION_CALL`.
6. Android reports only device workflow status. It does not determine the final call outcome.
7. Callyzer webhook/reconciliation supplies the authoritative record and recording.

## Android-origin call

The signed-in Android app loads the employee queue, calls `POST /calls/initiate` with `origin=ANDROID`, receives the server-resolved phone number, and launches the company SIM dialer. Callyzer matches the resulting call in the same way as a web-origin call.

## Matching

- Primary idempotency key: Callyzer provider call ID.
- Employee match: normalized employee SIM phone within the same organization and with an enabled calling seat.
- Lead match: normalized client number.
- Pending-attempt match: employee + client + dial timestamp within five minutes.
- No candidate creates an unmatched record; multiple candidates create a collision record. Neither is silently assigned.

## Outcomes and attempts

Callyzer `call_type`, `duration`, and connectivity drive normalized status. Customer-side unsuccessful calls count toward the organization threshold; technical delivery failures do not. Each attempt has a separate mandatory disposition/reason, and follow-up creates a scheduled follow-up record.

## Recording access

Archived recordings remain private. The API returns a short-lived B2 signed URL only to an admin or an authorized manager. Employees receive neither recording metadata nor storage paths.

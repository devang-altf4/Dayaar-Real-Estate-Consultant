# Android companion setup and contract

The implementation is in `apps/mobile`. It is a React Native UI with a Kotlin native bridge and native Firebase/telephony services.

## Firebase setup

1. Create/register Android app package `com.dayaar.calling` in the same Firebase project used by the API service account.
2. Place the real file at `apps/mobile/android/app/google-services.json` (gitignored).
3. Set API `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, and `FCM_PRIVATE_KEY`.
4. Build with JDK 17+ and Android SDK 35.

## Pairing

Web creates a five-minute, single-use code/token pair. The QR contains:

```text
dayaarcrm://pair?code=123456&token=<uuid>&api=<public-api-url>
```

Android claims `POST /devices/pair` with the device/Firebase/SIM details. The returned device token is encrypted locally. Device requests use `X-Device-Id` and `X-Device-Token`. The app sends a 30-second heartbeat and updates the server if Firebase rotates its token.

Capabilities are deliberately:

```json
{ "canPlaceCalls": true, "canReadCallLogs": false, "canSyncRecordings": false }
```

## FCM data command

```json
{
  "type": "DIAL_CALL",
  "commandId": "...",
  "callAttemptId": "...",
  "leadId": "...",
  "phoneNumber": "+919876543210",
  "expiresAt": "2026-08-20T12:00:00.000Z"
}
```

The native service rejects malformed, expired, or already processed commands. It uses `ACTION_CALL` only after `CALL_PHONE` permission. `PHONE_STATE` reports DIALING/COMPLETED/CANCELLED device workflow state to `POST /calls/device-status`. Callyzer remains authoritative.

Android background-start policy may require the employee to tap the high-priority fallback notification on some OEM/OS combinations. Physical acceptance testing must cover the exact demo handsets and battery-optimization settings.

## Never implemented in this app

- audio recording
- call-log scraping
- recording upload
- SIP/PBX/WebRTC
- client-supplied arbitrary dialing numbers

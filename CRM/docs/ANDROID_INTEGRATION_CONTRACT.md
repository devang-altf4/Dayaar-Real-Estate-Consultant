# Android Native Integration Contract (Phase 2 Specification)

This specification defines the exact API contracts, authentication lifecycles, WebSocket events, and recording sync protocol that the future React Native / Kotlin Android application must implement.

---

## 1. Device Pairing Lifecycle

### 1.1 Generation on Web CRM
Web CRM requests a pairing session via `POST /devices/pairing-session`.
Backend creates a 5-minute session with:
- 6-digit PIN (e.g. `839102`)
- Secure token UUID (e.g. `d7a1b...`)
- SHA-256 hashes are stored in the database (`pairingCodeHash`, `pairingTokenHash`).

### 1.2 Claiming by Android Device
The Android app prompts the employee to enter the 6-digit PIN or scan the QR code.
Device sends:
```http
POST /devices/pair
Content-Type: application/json

{
  "pairingCode": "839102",
  "deviceId": "android-uuid-hardware-id-12345",
  "deviceName": "Samsung Galaxy A15",
  "manufacturer": "Samsung",
  "model": "SM-A155F",
  "appVersion": "1.0.0",
  "fcmToken": "optional-fcm-token",
  "capabilities": {
    "canPlaceCalls": true,
    "canReadCallLogs": true,
    "canSyncRecordings": true
  },
  "simState": "READY",
  "simOperator": "Airtel"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deviceAuthToken": "jwt-device-token",
    "deviceId": "android-uuid-hardware-id-12345",
    "userId": "user-mongo-id",
    "organizationId": "org-mongo-id"
  }
}
```

---

## 2. Heartbeat & Presence Protocol

To maintain `ONLINE` status, the Android app sends a heartbeat every 15 seconds:
```http
POST /devices/heartbeat
Authorization: Bearer <deviceAuthToken>
Content-Type: application/json

{
  "deviceId": "android-uuid-hardware-id-12345",
  "batteryLevel": 88,
  "isCharging": false,
  "networkType": "WIFI",
  "simState": "READY",
  "simOperator": "Airtel",
  "capabilities": {
    "canPlaceCalls": true,
    "canReadCallLogs": true,
    "canSyncRecordings": true
  }
}
```
### Presence Intervals
- **ONLINE**: `lastSeenAt` within 45 seconds.
- **STALE**: `lastSeenAt` between 45 and 120 seconds.
- **OFFLINE**: `lastSeenAt` older than 120 seconds.

---

## 3. Realtime Call Command Protocol

Android connects to WebSocket endpoint `/devices/ws` with auth header.

### 3.1 Inbound Event: `CALL_COMMAND`
```json
{
  "event": "CALL_COMMAND",
  "data": {
    "commandId": "cmd-mongo-id",
    "callAttemptId": "attempt-mongo-id",
    "phoneNumber": "+919876543210",
    "leadId": "lead-mongo-id",
    "expiresAt": "2026-08-18T10:00:00.000Z"
  }
}
```

### 3.2 Outbound Event: `ACKNOWLEDGE_COMMAND`
```json
{
  "event": "COMMAND_ACKNOWLEDGED",
  "data": {
    "commandId": "cmd-mongo-id",
    "status": "ACKNOWLEDGED",
    "timestamp": "2026-08-18T09:55:01.000Z"
  }
}
```

### 3.3 Outbound Event: `CALL_STATUS_UPDATE`
As the Android telephony framework transitions states, emit:
- `DIALING`
- `CONNECTED`
- `COMPLETED` / `NOT_CONNECTED` / `FAILED`

```json
{
  "event": "CALL_STATUS_UPDATE",
  "data": {
    "commandId": "cmd-mongo-id",
    "callAttemptId": "attempt-mongo-id",
    "status": "CONNECTED",
    "rawTelephonyStatus": "OFFHOOK",
    "timestamp": "2026-08-18T09:55:05.000Z"
  }
}
```

---

## 4. Call Completion & Recording Upload Protocol

### 4.1 Post Call Summary
```http
POST /calls/complete
Authorization: Bearer <deviceAuthToken>
Content-Type: application/json

{
  "callAttemptId": "attempt-mongo-id",
  "status": "CONNECTED",
  "rawStatus": "NORMAL_CLEARING",
  "startedAt": "2026-08-18T09:55:00.000Z",
  "connectedAt": "2026-08-18T09:55:05.000Z",
  "endedAt": "2026-08-18T09:57:35.000Z",
  "durationSeconds": 150,
  "hasRecording": true,
  "recordingBytes": 1204850,
  "recordingMimeType": "audio/mp4"
}
```

### 4.2 Request Upload Destination
```http
POST /calls/:callAttemptId/recording-upload-url
Authorization: Bearer <deviceAuthToken>
```
**Response (200 OK):**
```json
{
  "uploadUrl": "https://...",
  "objectKey": "recordings/org123/attempt456.m4a",
  "headers": { "Content-Type": "audio/mp4" }
}
```

### 4.3 Notify Upload Complete
```http
POST /calls/:callAttemptId/recording-complete
Authorization: Bearer <deviceAuthToken>
Content-Type: application/json

{
  "objectKey": "recordings/org123/attempt456.m4a",
  "fileSizeBytes": 1204850
}
```

# Database Schema Specification (Mongoose / MongoDB)

All collections feature `organizationId` compound indexing to enforce strict multi-tenant isolation.

---

## Collections & Schemas

### 1. `organizations`
- `_id`: ObjectId
- `name`: String (Required)
- `slug`: String (Unique)
- `officeLatitude`: Number (Required, e.g. 28.4595)
- `officeLongitude`: Number (Required, e.g. 77.0266)
- `allowedRadiusMeters`: Number (Default: 100)
- `maxAllowedGpsAccuracyMeters`: Number (Default: 50)
- `maxUnsuccessfulAttempts`: Number (Default: 4)
- `dailyCallTarget`: Number (Default: 300)
- `isActive`: Boolean (Default: true)
- `createdAt`, `updatedAt`: Date

### 2. `users`
- `_id`: ObjectId
- `organizationId`: ObjectId (Indexed)
- `name`: String (Required)
- `email`: String (Required, lowercase)
- `phone`: String (Required)
- `employeeCode`: String (Unique per org)
- `passwordHash`: String (Bcrypt)
- `role`: Enum (`ADMIN`, `MANAGER`, `EMPLOYEE`)
- `managerId`: ObjectId (Ref: User, Nullable)
- `isActive`: Boolean (Default: true)
- `createdAt`, `updatedAt`: Date

### 3. `androidDevices`
- `_id`: ObjectId
- `organizationId`: ObjectId (Indexed)
- `userId`: ObjectId (Ref: User, Indexed)
- `deviceId`: String (Unique hardware/app UUID)
- `deviceName`: String
- `manufacturer`: String
- `model`: String
- `appVersion`: String
- `fcmToken`: String (Nullable)
- `simState`: Enum (`READY`, `ABSENT`, `UNKNOWN`, `LOCKED`)
- `simOperator`: String
- `status`: Enum (`ONLINE`, `STALE`, `OFFLINE`, `REVOKED`)
- `capabilities`:
  - `canPlaceCalls`: Boolean (Default: true)
  - `canReadCallLogs`: Boolean (Default: true)
  - `canSyncRecordings`: Boolean (Default: true)
- `isPrimaryCallingDevice`: Boolean (Default: true)
- `lastSeenAt`: Date
- `pairedAt`: Date
- `createdAt`, `updatedAt`: Date

### 4. `devicePairingSessions`
- `_id`: ObjectId
- `organizationId`: ObjectId
- `userId`: ObjectId
- `pairingCodeHash`: String (SHA-256 / Bcrypt hash of 6-digit PIN)
- `pairingTokenHash`: String (SHA-256 hash of random token)
- `expiresAt`: Date (5 minutes from creation)
- `isClaimed`: Boolean (Default: false)
- `createdAt`: Date

### 5. `leads`
- `_id`: ObjectId
- `organizationId`: ObjectId (Indexed)
- `name`: String (Required)
- `phone`: String (Required, Normalized E.164, Indexed)
- `alternatePhone`: String (Normalized)
- `email`: String
- `source`: String (e.g. `Meta Ads`, `Google Ads`, `Referral`, `99acres`, `MagicBricks`)
- `campaign`: String
- `project`: String (e.g. `Dayaar Heights`, `Emerald Residency`, `Godrej Palm Retreat`)
- `assignedEmployeeId`: ObjectId (Ref: User, Indexed)
- `assignedManagerId`: ObjectId (Ref: User, Indexed)
- `status`: Enum (`NEW`, `CALLING`, `FOLLOW_UP`, `NOT_PICKED_UP`, `NOT_INTERESTED`, `INTERESTED`, `COLD`, `WARM`, `HOT`, `SITE_VISIT`, `NEGOTIATION`, `BOOKED`, `CLOSED`, `INVALID_NUMBER`)
- `notInterestedReason`: Enum (`BUDGET`, `ALREADY_PURCHASED`, `NOT_LOOKING`, `WRONG_LOCATION`, `LOAN_ISSUE`, `JUST_BROWSING`, `WRONG_NUMBER`, `OTHER`)
- `notInterestedReasonDetails`: String
- `attemptCount`: Number (Default: 0, Auto-incremented on genuine failures)
- `temperature`: Enum (`HOT`, `WARM`, `COLD`, `UNQUALIFIED`)
- `qualification`:
  - `budgetMin`: Number
  - `budgetMax`: Number
  - `propertyType`: String (`Apartment`, `Villa`, `Plot`, `Commercial`)
  - `bhk`: String (`1BHK`, `2BHK`, `3BHK`, `4BHK`, `Penthouse`)
  - `preferredLocations`: [String]
  - `purpose`: Enum (`SELF_USE`, `INVESTMENT`, `RENTAL`, `UNKNOWN`)
  - `purchaseTimeline`: String (`Immediate`, `1-3 Months`, `3-6 Months`, `6+ Months`)
  - `financing`: Enum (`CASH`, `LOAN`, `UNDECIDED`)
  - `loanStatus`: String
  - `siteVisitInterested`: Boolean
  - `siteVisitDate`: Date
  - `notes`: String
- `nextFollowUpAt`: Date (Indexed)
- `isUnderSecretVerification`: Boolean (Default: false)
- `createdAt`, `updatedAt`: Date

### 6. `callAttempts`
- `_id`: ObjectId
- `organizationId`: ObjectId (Indexed)
- `leadId`: ObjectId (Ref: Lead, Indexed)
- `employeeId`: ObjectId (Ref: User, Indexed)
- `deviceId`: ObjectId (Ref: AndroidDevice)
- `callCommandId`: ObjectId (Ref: CallCommand)
- `provider`: Enum (`ANDROID_SIM`, `EXOTEL`, `SIP`)
- `status`: Enum (`INITIATING`, `DIALING`, `CONNECTED`, `NOT_CONNECTED`, `FAILED`, `CANCELLED`, `UNKNOWN`)
- `rawStatus`: String
- `countsAsAttempt`: Boolean (True ONLY for genuine customer failures)
- `startedAt`: Date
- `connectedAt`: Date
- `endedAt`: Date
- `durationSeconds`: Number (Default: 0)
- `phoneNumberDialed`: String
- `recordingStatus`: Enum (`NONE`, `PENDING`, `AVAILABLE`, `FAILED`)
- `recordingObjectKey`: String
- `recordingBytes`: Number
- `recordingMimeType`: String
- `createdAt`: Date

### 7. `callCommands`
- `_id`: ObjectId
- `organizationId`: ObjectId
- `employeeId`: ObjectId
- `leadId`: ObjectId
- `deviceId`: ObjectId
- `callAttemptId`: ObjectId
- `phoneNumber`: String
- `status`: Enum (`QUEUED`, `DELIVERED`, `ACKNOWLEDGED`, `DIALING`, `CONNECTED`, `COMPLETED`, `FAILED`, `EXPIRED`)
- `deliveredAt`: Date
- `acknowledgedAt`: Date
- `expiresAt`: Date
- `createdAt`: Date

### 8. `callEvents` (Append-Only Audit)
- `_id`: ObjectId
- `organizationId`: ObjectId
- `callAttemptId`: ObjectId (Indexed)
- `employeeId`: ObjectId
- `deviceId`: ObjectId
- `type`: Enum (`CALL_COMMAND_CREATED`, `DEVICE_ACKNOWLEDGED`, `DIALING_STARTED`, `CALL_CONNECTED`, `CALL_ENDED`, `CALL_LOG_RECEIVED`, `RECORDING_UPLOAD_STARTED`, `RECORDING_AVAILABLE`, `RECORDING_FAILED`)
- `metadata`: Schema.Types.Mixed
- `timestamp`: Date

### 9. `leadVerifications` (Secret QA)
- `_id`: ObjectId
- `organizationId`: ObjectId (Indexed)
- `leadId`: ObjectId (Ref: Lead, Indexed)
- `originalEmployeeId`: ObjectId (Ref: User)
- `originalDisposition`: String
- `originalReason`: String
- `originalReasonDetails`: String
- `verificationEmployeeId`: ObjectId (Ref: User, Indexed)
- `verificationDisposition`: String
- `verificationReason`: String
- `verificationReasonDetails`: String
- `status`: Enum (`PENDING_ASSIGNMENT`, `ASSIGNED`, `COMPLETED`, `REVIEW_REQUIRED`, `CLOSED`)
- `isMismatch`: Boolean (Default: false)
- `mismatchType`: String (e.g. `DISPOSITION_MISMATCH`)
- `mismatchSeverity`: Enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- `createdAt`, `completedAt`: Date

### 10. `attendanceRecords`
- `_id`: ObjectId
- `organizationId`: ObjectId (Indexed)
- `employeeId`: ObjectId (Ref: User, Indexed)
- `date`: String (Format: `YYYY-MM-DD`, Indexed)
- `checkInAt`: Date
- `checkInLocation`:
  - `latitude`: Number
  - `longitude`: Number
  - `accuracy`: Number
  - `distanceFromOfficeMeters`: Number
- `checkOutAt`: Date
- `checkOutLocation`:
  - `latitude`: Number
  - `longitude`: Number
  - `accuracy`: Number
  - `distanceFromOfficeMeters`: Number
- `totalWorkingSeconds`: Number (Default: 0)
- `totalBreakSeconds`: Number (Default: 0)
- `status`: Enum (`PRESENT`, `ABSENT`, `HALF_DAY`, `INCOMPLETE`)
- `createdAt`, `updatedAt`: Date

### 11. `breakSessions`
- `_id`: ObjectId
- `attendanceId`: ObjectId (Ref: AttendanceRecord, Indexed)
- `employeeId`: ObjectId (Ref: User, Indexed)
- `startedAt`: Date
- `endedAt`: Date
- `durationSeconds`: Number (Default: 0)
- `reason`: String (e.g. `Lunch`, `Tea Break`, `Meeting`)

### 12. `followUps`
- `_id`: ObjectId
- `organizationId`: ObjectId (Indexed)
- `leadId`: ObjectId (Ref: Lead, Indexed)
- `employeeId`: ObjectId (Ref: User, Indexed)
- `scheduledAt`: Date (Indexed)
- `reason`: String
- `notes`: String
- `status`: Enum (`PENDING`, `COMPLETED`, `MISSED`, `CANCELLED`)
- `createdAt`, `completedAt`: Date

### 13. `auditLogs` (Immutable)
- `_id`: ObjectId
- `organizationId`: ObjectId (Indexed)
- `actorId`: ObjectId (Ref: User, Indexed)
- `entityType`: String
- `entityId`: String
- `action`: String
- `metadata`: Schema.Types.Mixed
- `ip`: String
- `userAgent`: String
- `createdAt`: Date (Indexed)

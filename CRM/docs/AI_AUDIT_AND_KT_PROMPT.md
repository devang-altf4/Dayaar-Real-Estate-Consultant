# Dayaar CRM - Complete Architecture KT & External AI Bug-Hunting Audit Prompt

> **CONFIDENTIAL & AUTHORITATIVE SYSTEM SPECIFICATION**  
> **Target Audience:** Engineering Leads, QA Engineers, Security Auditors, and LLM Auditing Agents.  
> **System Purpose:** Enterprise Multi-Tenant Real Estate CRM with Android SIM-Gateway Calling, Callyzer Webhook Reconciliation, Backblaze B2 Audio Archival, and Strict Shift-Based Telephony Compliance.

---

## PART 1: MASTER KNOWLEDGE TRANSFER (KT)

### 1. High-Level System Architecture & Philosophy

```
+---------------------------------------------------------------------------------------+
|                                    CLIENTS                                            |
|                                                                                       |
|   +------------------------------------+     +------------------------------------+   |
|   |  Next.js 14 Web App (CRM Portal)   |     |  React Native Android Agent        |   |
|   |  Role-Based UI: Admin/Mgr/Agent    |     |  Background Gateway + SIM Dialer   |   |
|   +-----------------+------------------+     +-----------------+------------------+   |
+---------------------|------------------------------------------|----------------------+
                      | HTTPS / WSS                              | HTTPS / FCM
                      v                                          v
+---------------------------------------------------------------------------------------+
|                                 NESTJS 10 API CORE                                    |
|                                                                                       |
|   [Auth & RBAC]      [Leads Module]      [Attendance Module]      [Follow-ups Module] |
|   - Multi-tenant     - Assignment        - Geofencing/IP          - Due / Overdue     |
|   - JWT + Refresh    - Stage Pipelines   - Strict Breaks          - Notifications     |
|                                                                                       |
|   [Calls Module]     [Devices Gateway]   [Analytics Engine]       [Audit Trail]       |
|   - Intent Dispatch  - FCM Push Relay    - Manager Pacing         - Tamper-Evident    |
|   - Presigned URLs   - 45s Heartbeat     - Admin Aggregations     - SHA-256 Storage   |
+---------------------|-----------------------------------------------------------------+
                      |
                      +-------------------+--------------------+
                      |                   |                    |
                      v                   v                    v
+---------------------------+   +-------------------+   +-------------------------------+
|     MongoDB Replica       |   |  Backblaze B2 S3  |   |     Callyzer Cloud API        |
|  - Multi-tenant schemas   |   |  - Audio Storage  |   |  - Signed Ingest Webhook      |
|  - Leased Background Jobs |   |  - Presigned GET  |   |  - Reconciliation Scraper     |
+---------------------------+   +-------------------+   +-------------------------------+
```

#### The Golden Architectural Invariants:
1. **Never Trust Client-Provided Phone Numbers**: The web client only submits a `leadId`. The API resolves the real lead document, verifies tenant boundary (`organizationId`), checks employee assignment/calling permissions (`callingEnabled`), normalizes the number to E.164, checks anti-spam redial gap timers, and dispatches the call command down to the agent's paired Android device.
2. **Strict Multi-Tenant Isolation**: Every MongoDB model incorporates `organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true }`. Every controller query or mutation is filtered by `req.user.organizationId`.
3. **Hardware Gateway Pattern**: Telephony is executed over physical carrier SIM cards installed in employee Android handsets via a background React Native service listening for Firebase Cloud Messaging (FCM) high-priority data payloads.
4. **Zero Audio Stored on Application Servers**: Audio recordings are fetched from Callyzer Biz/Cloud API, validated for file size and MIME type, assigned a deterministic object key, SHA-256 hashed, uploaded to Backblaze B2 (with secondary VPS cold-backup), and purged from Callyzer once verified.

---

### 2. Monorepo Repository Structure

The repository is managed with `pnpm` workspaces:

```text
CRM/
├── apps/
│   ├── api/                    # NestJS 10 backend application
│   │   ├── src/
│   │   │   ├── common/         # Guards (JWT, Roles), Decorators, Interceptors, Pipes
│   │   │   ├── database/       # Mongoose Schemas (User, Lead, Call, Device, Audit, etc.)
│   │   │   └── modules/        # Domain Modules:
│   │   │       ├── analytics/  # Admin and Manager team dashboards & personal pacing
│   │   │       ├── attendance/ # Clock-in/out, break sessions, shift compliance
│   │   │       ├── audit/      # Immutable audit trail (/audit-logs)
│   │   │       ├── auth/       # JWT auth, refresh tokens, password hashing (bcrypt)
│   │   │       ├── calls/      # Web/mobile call dispatch, presigned playback URLs
│   │   │       ├── callyzer/   # Ingest webhooks, reconciliation jobs, worker leases
│   │   │       ├── devices/    # Device pairing (QR/code), heartbeats, FCM registration
│   │   │       ├── followups/  # Callbacks, meetings, scheduling
│   │   │       ├── leads/      # Lead directory, stage pipelines, CSV import/export
│   │   │       ├── mobile/     # Dedicated endpoints consumed by Android agent
│   │   │       └── users/      # Employee & manager user management
│   │   └── package.json
│   ├── web/                    # Next.js 14 App Router (Tailwind CSS, React Query)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/     # /login, /register
│   │   │   │   └── (dashboard)/# Authenticated CRM pages:
│   │   │   │       ├── admin/  # /admin/users, /admin/audit-logs, /admin/settings
│   │   │   │       ├── attendance/ # /attendance (Check-in/out, breaks)
│   │   │   │       ├── calls/  # /calls (Call history, audio player modal)
│   │   │   │       ├── device/ # /device (Android device pairing & status)
│   │   │   │       ├── follow-ups/ # /follow-ups (Callbacks & reminders)
│   │   │   │       ├── leads/  # /leads, /leads/[id] (Profile, calls, scheduling)
│   │   │   │       └── manager/# /manager/team (Live calling monitor)
│   │   │   ├── components/     # Luxury UI system (Obsidian & Champagne gold theme)
│   │   │   ├── context/        # AuthContext, SocketContext
│   │   │   └── lib/            # api client (Axios wrapper with auto-refresh), utils
│   │   └── package.json
│   └── mobile/                 # React Native / Expo Android gateway app
│       ├── src/
│       │   ├── services/       # FCM background service, Heartbeat, Call listener
│       │   └── screens/        # Pairing screen, Agent status, SIM selector
│       └── package.json
├── packages/
│   └── shared/                 # Shared TypeScript models, Enums, Zod validation DTOs
│       ├── src/
│       │   ├── dtos/           # attendance.dto, followup.dto, lead.dto, call.dto, etc.
│       │   ├── enums/          # Role, LeadStage, CallStatus, DeviceStatus, BreakType
│       │   └── interfaces/     # IAuthUser, ILead, IDevice, ICallAttempt
│       └── package.json
└── docs/                       # Architectural documentation and runbooks
```

---

### 3. End-to-End Core Workflows

#### A. Web-to-SIM Call Dispatch
1. Agent clicks "Call" on `/leads/[id]` or `/leads`.
2. Web client sends `POST /calls/initiate` with `{ leadId, origin: 'WEB' }`.
3. Server executes `CallsService.initiateCall()`:
   - Validates agent is currently clocked in (`attendance.checkOutAt == null`).
   - Validates agent's paired Android device is active (`Device.status === 'ONLINE'`, `lastSeenAt < 45s ago`).
   - Normalizes lead phone number to E.164.
   - Creates a pending `CallAttempt` record in MongoDB.
   - Creates an FCM high-priority data message containing `{ commandId, callAttemptId, phoneNumber, expiresAt }`.
   - Sends message to device FCM registration token.
4. Android agent's background service receives FCM payload:
   - Verifies command expiry (`expiresAt > Date.now()`).
   - Dispatches Telecom intent specifying employee company SIM slot.
   - Pings server with call initiated event.
5. Callyzer records call audio on Android and syncs to Callyzer Cloud.

#### B. Callyzer Ingest & B2 Recording Archival
1. Callyzer sends signed HTTP webhook to `POST /callyzer/webhook`.
2. Server validates HMAC timing-safe signature.
3. Raw webhook is persisted into `WebhookLog` collection for zero-data-loss auditability.
4. Leased job worker polls pending webhook logs:
   - Matches call by provider call ID or agent phone + customer phone + timestamp window.
   - Downloads recording MP3 from temporary Callyzer URL.
   - Calculates SHA-256 hash of audio stream.
   - Uploads to Backblaze B2 S3 bucket: `recordings/{orgId}/{year}/{month}/{callAttemptId}.mp3`.
   - Saves storage key and hash to `CallAttempt` document.
   - Dispatches command to Callyzer API to delete source recording.

#### C. Role-Based Access Control (RBAC) Matrix
- **`EMPLOYEE` (Calling Agent)**:
  - Can view and edit only leads assigned to them (`assignedTo === user._id`).
  - Can view only their own call history.
  - Can clock in/out and take breaks.
  - Can pair their personal Android device.
  - **CANNOT** view team analytics, org settings, audit logs, or download unpresigned audio.
- **`MANAGER` (Team Lead)**:
  - Can view all leads and calls of employees assigned under their team (`managerId === user._id`).
  - Access to `/manager/team` Live Monitor (team attendance, device status, call quotas).
  - Can reassign leads within team.
- **`ADMIN` (Tenant Owner)**:
  - Full organization-level access.
  - Can manage users (`/admin/users`), view immutable audit logs (`/admin/audit-logs`), configure business working hours and retention rules (`/admin/settings`).

---

### 4. Comprehensive API Routes Catalog

| Method | Endpoint | Allowed Roles | Request Body / Query Params | Expected Response / Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | `{ email, password }` | `{ user, accessToken, refreshToken }` |
| `POST` | `/auth/refresh` | Public | `{ refreshToken }` | `{ accessToken }` |
| `GET` | `/attendance/today` | All | None | Current user's shift record and active breaks |
| `POST` | `/attendance/check-in` | All | `{ latitude?, longitude? }` | Starts employee work shift |
| `POST` | `/attendance/check-out` | All | None | Closes shift, records total active hours |
| `POST` | `/attendance/break/start`| All | `{ reason: string }` *(strict)* | Sets active break (Lunch, Tea, etc.) |
| `POST` | `/attendance/break/end` | All | None | Resumes active working shift |
| `GET` | `/leads` | All | `?page=&limit=&stage=&search=` | Paginated leads scoped to user's role |
| `GET` | `/leads/:id` | All | Lead MongoDB ObjectId | Detailed lead profile with activity & calls |
| `POST` | `/leads` | All | `CreateLeadSchema` | Creates new lead in tenant org |
| `PATCH`| `/leads/:id` | All | `UpdateLeadSchema` | Updates lead attributes/stage |
| `POST` | `/calls/initiate` | All | `{ leadId, origin }` | Dispatches FCM call intent to phone |
| `GET` | `/calls` | All | `?page=&limit=&employeeId=` | Paginated call attempts |
| `GET` | `/calls/:id/playback` | Admin, Mgr | None | Generates 15-min presigned B2 URL |
| `GET` | `/follow-ups` | All | `?type=today\|overdue\|upcoming`| Filtered follow-up callbacks |
| `POST` | `/follow-ups` | All | `{ leadId, scheduledAt, reason?, notes? }` | Schedules reminder (ISO 8601) |
| `PATCH`| `/follow-ups/:id/complete`| All | None | Marks follow-up as fulfilled |
| `GET` | `/devices/my-device` | All | None | Paired device telemetry & status |
| `POST` | `/devices/pair` | All | `{ pairingCode }` | Pairs Android phone to agent seat |
| `GET` | `/analytics/manager-dashboard` | Admin, Mgr | None | `{ teamSize, teamCheckedInCount, teamTodayCalls, teamMembers: [...] }` |
| `GET` | `/analytics/admin-dashboard` | Admin | None | Organization-wide call volumes & stages |
| `GET` | `/audit-logs` | Admin | `?page=&limit=&entityType=` | Immutable compliance audit trail |

---

### 5. Post-Mortem: 5 Verified Bugs Fixed in Previous Sprint

The following 5 bugs were audited, tested with live API calls, and resolved:

1. **Attendance Break Schema Strictness Failure (`attendance/page.tsx`)**:
   - *Bug*: Frontend submitted `{ breakType: 'LUNCH' }`. Backend `StartBreakSchema` used `.strict()` and required `{ reason: string }`, causing a 400 Bad Request.
   - *Fix*: Frontend now maps `breakType` into `{ reason: 'Lunch Break' }` to satisfy the strict schema.
2. **Audit Logs Route 404 (`admin/audit-logs/page.tsx`)**:
   - *Bug*: Frontend queried `/audit`, but NestJS controller was `@Controller('audit-logs')`, returning 404 Not Found.
   - *Fix*: Route corrected to `/audit-logs`.
3. **Manager Team Live Monitor Permanently Empty (`manager/team/page.tsx` & `analytics.service.ts`)**:
   - *Bug*: Backend returned `teamMembers: [...]`, but frontend read `managerData?.teamActivity` and referenced `callsMadeToday`, leaving table completely blank. Furthermore, device status was unmapped.
   - *Fix*: Wired frontend to `managerData.teamMembers`, mapped `callsToday` / `connectedToday`, added luxury summary KPI stat cards, and enhanced `analytics.service.ts` to attach device telemetry.
4. **Follow-ups Filter Query Ignored (`follow-ups/page.tsx`)**:
   - *Bug*: Frontend sent `{ filter: 'today' }`, but controller expected `@Query('type')`. Server fell back to `'all'` for every filter tab.
   - *Fix*: Changed request params to `{ type: filter }`.
5. **Lead Detail Follow-up Submission 400 Zod Error (`leads/[id]/page.tsx`)**:
   - *Bug*: HTML `<input type="datetime-local">` outputs non-offset local strings (`YYYY-MM-DDTHH:mm`), which fails Zod's `scheduledAt: z.string().datetime({ offset: true })`. Also sending empty strings for optional `reason` failed `min(1)`.
   - *Fix*: Converted value to `new Date(val).toISOString()` and omitted empty optional strings from payload.

---

## PART 2: PROMPT FOR EXTERNAL AI AUDITING AGENT

*Copy and paste the entire prompt block below into another AI model (Claude 3.7 Sonnet, GPT-4o, DeepSeek R1, or Gemini Pro) to initiate an exhaustive bug hunt on the codebase:*

```markdown
# MISSION: ULTRA-DEEP PRODUCTION CODEBASE AUDIT & BUG HUNT

You are an Elite Principal Software Security and Reliability Engineer tasked with performing an exhaustive code audit of the "Dayaar CRM" multi-tenant real estate CRM and Android telephony gateway platform.

## REPOSITORY CONTEXT & ARCHITECTURE
- **Backend**: NestJS 10, MongoDB (Mongoose), TypeScript, Zod Validation Pipes, JWT RBAC (Admin, Manager, Employee), Backblaze B2 Audio Storage, Callyzer Webhook Processor.
- **Frontend**: Next.js 14 App Router, React Query (@tanstack/react-query), Tailwind CSS, Lucide Icons, Axios API wrapper with automated refresh tokens.
- **Mobile**: React Native / Expo Android Hardware Calling Gateway, Firebase Cloud Messaging (FCM) high-priority data payloads, Carrier SIM dialing.
- **Shared Package**: `@dayaar/shared` containing DTOs, Zod Schemas (`.strict()`), Enums, and TypeScript interfaces.

## YOUR TASK
Conduct a forensic line-by-line inspection across the codebase. Hunt down subtle, hidden bugs, race conditions, type mismatches, security vulnerabilities, or logic flaws that could break in a live production environment with real paying users.

Specifically analyze and report findings in the following 8 Critical Vectors:

### 1. Zod Schema vs. Frontend Payload Mismatches
- Inspect all schemas in `packages/shared/src/dtos/*.dto.ts` that use `.strict()`.
- Check every `api.post` / `api.patch` / `api.put` call in `apps/web/src/app/(dashboard)/**` to verify that the payload matches the Zod schema exactly.
- Verify date-time fields: Ensure `<input type="datetime-local">` or date pickers do not pass un-offset strings to `z.string().datetime({ offset: true })`.
- Check optional strings with `min(1)`: Ensure frontend does not pass empty strings `""` which fail validation.

### 2. Multi-Tenant Data Leakage & RBAC Bypass
- Review NestJS controller endpoints in `apps/api/src/modules/**`.
- Verify every database query (`find`, `findOne`, `findOneAndUpdate`, `aggregate`) explicitly includes `organizationId`.
- Verify that `EMPLOYEE` users cannot access leads or calls belonging to other agents by manipulating IDs in the URL.
- Verify that `MANAGER` users cannot see leads or agents outside their assigned team or outside their organization.
- Verify that presigned audio URLs (`/calls/:id/playback`) cannot be generated by standard employees.

### 3. Asynchronous Race Conditions & Distributed State
- Inspect `CallsService.initiateCall` and device dispatch logic:
  - What happens if two agents dial simultaneously?
  - What happens if an agent clicks "Call" repeatedly in rapid succession? Is there an idempotency guard or debounce mechanism?
- Check Callyzer webhook processing in `apps/api/src/modules/callyzer`:
  - Are webhook events processed idempotently? Can duplicate webhook deliveries result in double call counting or duplicate database writes?
  - Check lease locking on background jobs (`JobLease`). Can leases get permanently stuck if a worker process crashes?

### 4. Attendance & Telephony Enforcement
- Inspect the relationship between `Attendance` and `CallsService`:
  - Does the backend strictly reject call initiation if the agent is not clocked in or is currently on a break?
  - What happens if an agent's shift is automatically closed or past working hours while a call is active?
- Inspect break transitions:
  - Can an agent start a break when already on a break?
  - Can an agent check out without ending an active break?

### 5. Android Gateway & FCM Dispatch Vulnerabilities
- Inspect `Device` model, heartbeat tracking, and pairing:
  - Heartbeat expiry is 45 seconds. Are timezone offsets handled UTC-consistently?
  - Can a malicious client spoof another agent's device `pairingCode` or `deviceId`?
  - How are FCM token refresh events handled? What happens if an FCM token expires while an agent is active?

### 6. React Query State Invalidation & UI Stale Data
- Review `apps/web/src/app/(dashboard)/**`:
  - After mutations (`POST`, `PATCH`, `DELETE`), does the component trigger `queryClient.invalidateQueries` or `refetch()`?
  - Are query keys properly scoped with filter parameters (e.g. `['leads', { stage, page }]`) so changing filters updates the view immediately?
  - Are error states handled gracefully? If an API returns 400 or 403, does the UI show an informative alert or does it fail silently?

### 7. Pagination, Aggregations & Performance Bottlenecks
- Check MongoDB aggregation pipelines and `find().skip().limit()` queries in `apps/api/src/modules/analytics` and `apps/api/src/modules/leads`.
- Are appropriate indexes defined on compound queries (e.g. `{ organizationId: 1, assignedTo: 1, createdAt: -1 }`)?
- Does `countDocuments` run efficiently without table scanning?

### 8. Authentication, Token Expiry & Silent Refresh
- Inspect `apps/web/src/lib/api.ts` Axios interceptors:
  - What happens when an access token expires while multiple parallel API requests are firing? Does it trigger multiple refresh requests or queue them cleanly?
  - Is there an infinite loop possibility if the refresh token itself is expired or invalid?

---

## OUTPUT REPORT FORMAT

For every bug or issue you uncover, structure your findings in this format:

### [SEVERITY: CRITICAL / HIGH / MEDIUM / LOW] - Issue Title
- **Location**: Exact file path and line numbers.
- **The Problem**: Concrete technical description of why the code fails or behaves unexpectedly.
- **Proof / Trigger Scenario**: Step-by-step reproduction or payload example that triggers the bug.
- **Risk / Impact**: Real-world consequence for users, data, or security.
- **Recommended Code Fix**: Exact TypeScript/React code diff showing how to fix it cleanly without adding mock data or breaking existing wiring.

Begin your deep audit now.
```

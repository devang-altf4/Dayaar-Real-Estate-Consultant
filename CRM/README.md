# Dayaar CRM

Dayaar CRM is a multi-tenant real-estate sales CRM whose calling module uses employee company SIMs for dialing and Callyzer for authoritative call logs and recordings.

## Chosen calling architecture

- Web call: CRM creates a pending attempt, then sends a 60-second high-priority FCM data command to the employee's paired Android phone.
- Android call: the mobile app creates the attempt through the authenticated API and dials through the same company SIM.
- Capture: Callyzer supplies the final call type, connectivity, duration, timestamps, and recording asynchronously.
- Archive: the worker copies recordings to private Backblaze B2 and to an independent VPS path, verifies them, then removes the Callyzer copy.
- Access: employees never receive recording fields or URLs. Managers can access only their team; admins can access the organization.
- Disposition: every call attempt needs its own outcome and mandatory reason. Follow-up also requires a date/time.

There is no PBX, SIP, WebRTC, Twilio, Exotel, GSM gateway, device recording upload, or development call simulator in this design.

## Workspace

```text
CRM/
  apps/api       NestJS API, Socket.IO, workers, Callyzer, B2/VPS archive
  apps/web       Next.js CRM
  apps/mobile    React Native Android SIM-dial companion
  packages/shared
  docs
  render.yaml    CRM-only Render blueprint; the parent repository file is separate
```

## Local setup

Requirements: Node.js 20.19.4+, pnpm 11, MongoDB, Android Studio/JDK 17+ for the handset app.

```powershell
corepack pnpm install
Copy-Item .env.example .env
corepack pnpm dev
```

The destructive demo seed is blocked in production and requires `ALLOW_DESTRUCTIVE_SEED=true` locally.

For an existing pre-refactor database, first run the read-only report and then explicitly apply it:

```powershell
corepack pnpm --filter @dayaar/api migrate:callyzer-sim
corepack pnpm --filter @dayaar/api migrate:callyzer-sim -- --apply
```

The migration preserves legacy fields/data and defaults existing calling seats to disabled for admin review.

## Validation

```powershell
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @dayaar/mobile typecheck
Set-Location apps/mobile/android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat :app:compileDebugKotlin
```

## Credentials needed for live testing

- Callyzer API token, webhook secret, and organization MongoDB ID
- A bucket-scoped Backblaze B2 application key ID and application key (do not use the Master Application Key). The Render blueprint already targets the private `dayyar` bucket in `us-east-005`; add both credentials as secret environment variables and never commit the application key.
- Firebase service-account values on the API
- matching `apps/mobile/android/app/google-services.json` for the Android package `com.dayaar.calling`
- a physical Android phone with the employee company SIM, Callyzer Biz configured, and runtime phone/notification permissions

See [architecture](docs/ARCHITECTURE.md), [calling flow](docs/CALLING_ARCHITECTURE.md), and [Android setup](docs/ANDROID_INTEGRATION_CONTRACT.md).

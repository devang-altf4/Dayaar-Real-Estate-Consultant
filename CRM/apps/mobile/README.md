# Dayaar Calling Android app

This app is a dial-only companion for the employee company SIM. Callyzer Biz must be installed/configured separately on the handset for recording and cloud synchronization.

## Configure

1. Add Firebase Android package `com.dayaar.calling`.
2. Copy the real `google-services.json` to `android/app/google-services.json`.
3. Use JDK 17+ and Android SDK 35.
4. In the CRM root run `corepack pnpm install`.

## Validate/build

```powershell
corepack pnpm --filter @dayaar/mobile typecheck
Set-Location apps/mobile/android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat :app:compileDebugKotlin
.\gradlew.bat :app:assembleDebug
```

The app requests `CALL_PHONE`, `READ_PHONE_STATE`, and notifications. Test FCM receipt, background behavior, OEM battery restrictions, dual-SIM selection, call completion, and Callyzer matching on the exact demo handset.

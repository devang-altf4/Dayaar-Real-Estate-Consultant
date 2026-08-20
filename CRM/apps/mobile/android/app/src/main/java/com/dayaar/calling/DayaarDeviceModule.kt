package com.dayaar.calling

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject

class DayaarDeviceModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "DayaarDevice"

    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful || task.result.isNullOrBlank()) {
                promise.reject("FCM_UNAVAILABLE", task.exception ?: IllegalStateException("FCM token unavailable. Add google-services.json."))
                return@addOnCompleteListener
            }
            val telephony = context.getSystemService(TelephonyManager::class.java)
            val simState = when (telephony?.simState) {
                TelephonyManager.SIM_STATE_READY -> "READY"
                TelephonyManager.SIM_STATE_ABSENT -> "ABSENT"
                TelephonyManager.SIM_STATE_PIN_REQUIRED,
                TelephonyManager.SIM_STATE_PUK_REQUIRED,
                TelephonyManager.SIM_STATE_NETWORK_LOCKED -> "LOCKED"
                else -> "UNKNOWN"
            }
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            SecurePrefs.get(context).edit().putString(SecurePrefs.FCM_TOKEN, task.result).apply()
            promise.resolve(Arguments.createMap().apply {
                putString("deviceId", deviceId)
                putString("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}")
                putString("manufacturer", Build.MANUFACTURER)
                putString("model", Build.MODEL)
                putString("appVersion", packageInfo.versionName ?: "1.0.0")
                putString("fcmToken", task.result)
                putString("simState", simState)
                putString("simOperator", telephony?.simOperatorName.orEmpty())
            })
        }
    }

    @ReactMethod
    fun getPairingState(promise: Promise) {
        try {
            val prefs = SecurePrefs.get(context)
            val deviceId = prefs.getString(SecurePrefs.DEVICE_ID, null)
            val apiBaseUrl = prefs.getString(SecurePrefs.API_BASE_URL, null)
            promise.resolve(Arguments.createMap().apply {
                putBoolean("paired", !deviceId.isNullOrBlank() && !prefs.getString(SecurePrefs.DEVICE_TOKEN, null).isNullOrBlank())
                if (deviceId != null) putString("deviceId", deviceId)
                if (apiBaseUrl != null) putString("apiBaseUrl", apiBaseUrl)
            })
        } catch (error: Exception) {
            promise.reject("SECURE_STORAGE_FAILED", error)
        }
    }

    @ReactMethod
    fun saveDeviceCredentials(apiBaseUrl: String, deviceId: String, deviceToken: String, promise: Promise) {
        try {
            SecurePrefs.get(context).edit()
                .putString(SecurePrefs.API_BASE_URL, apiBaseUrl.trimEnd('/'))
                .putString(SecurePrefs.DEVICE_ID, deviceId)
                .putString(SecurePrefs.DEVICE_TOKEN, deviceToken)
                .apply()
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("SECURE_STORAGE_FAILED", error)
        }
    }

    @ReactMethod
    fun clearDeviceCredentials(promise: Promise) {
        try {
            SecurePrefs.get(context).edit().clear().apply()
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("SECURE_STORAGE_FAILED", error)
        }
    }

    @ReactMethod
    fun sendHeartbeat(promise: Promise) {
        val prefs = SecurePrefs.get(context)
        val deviceId = prefs.getString(SecurePrefs.DEVICE_ID, null)
        if (deviceId.isNullOrBlank()) {
            promise.reject("NOT_PAIRED", "Device is not paired.")
            return
        }
        val telephony = context.getSystemService(TelephonyManager::class.java)
        val simState = if (telephony?.simState == TelephonyManager.SIM_STATE_READY) "READY" else "UNKNOWN"
        DeviceApi.post(
            context,
            "/devices/heartbeat",
            JSONObject()
                .put("deviceId", deviceId)
                .put("simState", simState)
                .put("simOperator", telephony?.simOperatorName.orEmpty())
                .put("capabilities", JSONObject()
                    .put("canPlaceCalls", ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED)
                    .put("canReadCallLogs", false)
                    .put("canSyncRecordings", false)),
        ) { result ->
            result.fold(onSuccess = { promise.resolve(true) }, onFailure = { promise.reject("HEARTBEAT_FAILED", it) })
        }
    }

    @ReactMethod
    fun placeCall(phoneNumber: String, promise: Promise) {
        try {
            CallLauncher.placeManual(context, phoneNumber)
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("CALL_FAILED", error)
        }
    }
}

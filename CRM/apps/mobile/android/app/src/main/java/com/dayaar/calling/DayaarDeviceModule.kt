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
import com.facebook.react.bridge.UiThreadUtil
import com.google.firebase.messaging.FirebaseMessaging
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class DayaarDeviceModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "DayaarDevice"

    @ReactMethod
    fun scanPairingQr(promise: Promise) {
        val activity = context.currentActivity
        if (activity == null) {
            promise.reject("SCANNER_UNAVAILABLE", "The QR scanner requires the app to be open.")
            return
        }

        val options = GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .enableAutoZoom()
            .build()

        activity.runOnUiThread {
            GmsBarcodeScanning.getClient(activity, options)
                .startScan()
                .addOnSuccessListener { barcode ->
                    val value = barcode.rawValue
                    if (value.isNullOrBlank()) {
                        promise.reject("INVALID_QR", "The scanned QR code is empty.")
                    } else {
                        promise.resolve(value)
                    }
                }
                .addOnCanceledListener {
                    promise.reject("SCAN_CANCELLED", "QR scanning was cancelled.")
                }
                .addOnFailureListener { error ->
                    promise.reject("SCAN_FAILED", error)
                }
        }
    }

    @ReactMethod
    fun getMobileDashboard(promise: Promise) {
        DeviceApi.request(context, "GET", "/mobile/dashboard") { result ->
            result.fold(
                onSuccess = { promise.resolve(it) },
                onFailure = { promise.reject("MOBILE_DASHBOARD_FAILED", it) },
            )
        }
    }

    @ReactMethod
    fun initiateMobileCall(leadId: String, promise: Promise) {
        DeviceApi.request(
            context,
            "POST",
            "/mobile/calls",
            JSONObject().put("leadId", leadId),
        ) { result ->
            result.fold(
                onSuccess = { promise.resolve(it) },
                onFailure = { promise.reject("MOBILE_CALL_FAILED", it) },
            )
        }
    }

    @ReactMethod
    fun recordDisposition(payloadJson: String, promise: Promise) {
        val json = try {
            JSONObject(payloadJson)
        } catch (e: Exception) {
            promise.reject("INVALID_JSON", e)
            return
        }
        DeviceApi.request(
            context,
            "POST",
            "/mobile/disposition",
            json,
        ) { result ->
            result.fold(
                onSuccess = { promise.resolve(it) },
                onFailure = { promise.reject("DISPOSITION_FAILED", it) },
            )
        }
    }

    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        try {
            val telephony = context.getSystemService(TelephonyManager::class.java)
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            if (deviceId.isNullOrBlank()) {
                promise.reject("DEVICE_ID_UNAVAILABLE", "Android device ID is unavailable.")
                return
            }
            promise.resolve(Arguments.createMap().apply {
                putString("deviceId", deviceId)
                putString("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}")
                putString("manufacturer", Build.MANUFACTURER)
                putString("model", Build.MODEL)
                putString("appVersion", packageInfo.versionName ?: "1.0.0")
                putString("simState", getSimState(telephony))
                putString("simOperator", telephony?.simOperatorName.orEmpty())
            })
        } catch (error: Exception) {
            promise.reject("DEVICE_INFO_FAILED", error)
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
    fun pairDevice(apiBaseUrl: String, pairingCode: String, pairingToken: String, promise: Promise) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful || task.result.isNullOrBlank()) {
                promise.reject(
                    "FCM_UNAVAILABLE",
                    task.exception ?: IllegalStateException("FCM token unavailable. Add google-services.json.")
                )
                return@addOnCompleteListener
            }

            try {
                val telephony = context.getSystemService(TelephonyManager::class.java)
                val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
                if (deviceId.isNullOrBlank()) {
                    promise.reject("DEVICE_ID_UNAVAILABLE", "Android device ID is unavailable.")
                    return@addOnCompleteListener
                }
                val body = JSONObject()
                    .put("pairingCode", pairingCode)
                    .put("pairingToken", pairingToken)
                    .put("deviceId", deviceId)
                    .put("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}")
                    .put("manufacturer", Build.MANUFACTURER)
                    .put("model", Build.MODEL)
                    .put("appVersion", packageInfo.versionName ?: "1.0.0")
                    .put("fcmToken", task.result)
                    .put("simState", getSimState(telephony))
                    .put("simOperator", telephony?.simOperatorName.orEmpty())
                    .put(
                        "capabilities", JSONObject()
                            .put(
                                "canPlaceCalls",
                                ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.CALL_PHONE
                                ) == PackageManager.PERMISSION_GRANTED
                            )
                            .put("canReadCallLogs", false)
                            .put("canSyncRecordings", false)
                    )

                DeviceApi.claimPairing(context, apiBaseUrl, body) { result ->
                    result.fold(
                        onSuccess = { savedDeviceId ->
                            promise.resolve(Arguments.createMap().apply {
                                putBoolean("paired", true)
                                putString("deviceId", savedDeviceId)
                                putString("apiBaseUrl", apiBaseUrl.trimEnd('/'))
                            })
                        },
                        onFailure = { promise.reject("PAIRING_FAILED", it) },
                    )
                }
            } catch (error: Exception) {
                promise.reject("PAIRING_FAILED", error)
            }
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

    private fun getSimState(telephony: TelephonyManager?): String = when (telephony?.simState) {
        TelephonyManager.SIM_STATE_READY -> "READY"
        TelephonyManager.SIM_STATE_ABSENT -> "ABSENT"
        TelephonyManager.SIM_STATE_PIN_REQUIRED,
        TelephonyManager.SIM_STATE_PUK_REQUIRED,
        TelephonyManager.SIM_STATE_NETWORK_LOCKED -> "LOCKED"
        else -> "UNKNOWN"
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

    @ReactMethod
    fun saveUserSession(token: String, userJson: String, promise: Promise) {
        try {
            SecurePrefs.get(context).edit()
                .putString(SecurePrefs.USER_AUTH_TOKEN, token)
                .putString(SecurePrefs.USER_AUTH_DATA, userJson)
                .apply()
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("SESSION_SAVE_FAILED", error)
        }
    }

    @ReactMethod
    fun getUserSession(promise: Promise) {
        try {
            val prefs = SecurePrefs.get(context)
            val token = prefs.getString(SecurePrefs.USER_AUTH_TOKEN, null)
            val userJson = prefs.getString(SecurePrefs.USER_AUTH_DATA, null)
            val map = Arguments.createMap().apply {
                if (token != null) putString("token", token)
                if (userJson != null) putString("user", userJson)
            }
            promise.resolve(map)
        } catch (error: Exception) {
            promise.reject("SESSION_GET_FAILED", error)
        }
    }

    @ReactMethod
    fun clearUserSession(promise: Promise) {
        try {
            SecurePrefs.get(context).edit()
                .remove(SecurePrefs.USER_AUTH_TOKEN)
                .remove(SecurePrefs.USER_AUTH_DATA)
                .apply()
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("SESSION_CLEAR_FAILED", error)
        }
    }

    private var mediaPlayer: android.media.MediaPlayer? = null

    @ReactMethod
    fun playAudio(url: String, promise: Promise) {
        Thread {
            try {
                mediaPlayer?.release()
                mediaPlayer = null

                val prefs = SecurePrefs.get(context)
                val token = prefs.getString(SecurePrefs.USER_AUTH_TOKEN, null)

                val audioFile = if (url.startsWith("http://") || url.startsWith("https://")) {
                    val hash = Math.abs(url.hashCode()).toString()
                    val cacheFile = File(context.cacheDir, "rec_$hash.mp3")
                    if (!cacheFile.exists() || cacheFile.length() == 0L) {
                        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                            requestMethod = "GET"
                            connectTimeout = 15000
                            readTimeout = 30000
                            if (!token.isNullOrBlank() && !url.contains("token=")) {
                                setRequestProperty("Authorization", "Bearer $token")
                            }
                            instanceFollowRedirects = true
                        }
                        val responseCode = connection.responseCode
                        if (responseCode in 200..299) {
                            connection.inputStream.use { input ->
                                FileOutputStream(cacheFile).use { output ->
                                    input.copyTo(output)
                                }
                            }
                        } else {
                            throw IllegalStateException("Server returned HTTP $responseCode while loading audio")
                        }
                    }
                    cacheFile
                } else {
                    File(url)
                }

                val mp = android.media.MediaPlayer().apply {
                    setAudioAttributes(
                        android.media.AudioAttributes.Builder()
                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_MUSIC)
                            .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                            .build()
                    )
                    setDataSource(audioFile.absolutePath)
                    prepare()
                }

                mediaPlayer = mp

                UiThreadUtil.runOnUiThread {
                    try {
                        mp.start()
                        promise.resolve(Arguments.createMap().apply {
                            putInt("duration", mp.duration)
                        })
                    } catch (e: Exception) {
                        promise.reject("AUDIO_START_FAILED", e)
                    }
                }
            } catch (error: Exception) {
                UiThreadUtil.runOnUiThread {
                    promise.reject("PLAYBACK_ERROR", error.message ?: "Audio playback failed")
                }
            }
        }.start()
    }

    @ReactMethod
    fun pauseAudio(promise: Promise) {
        try {
            if (mediaPlayer?.isPlaying == true) {
                mediaPlayer?.pause()
            }
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("AUDIO_PAUSE_FAILED", error)
        }
    }

    @ReactMethod
    fun resumeAudio(promise: Promise) {
        try {
            if (mediaPlayer != null && !mediaPlayer!!.isPlaying) {
                mediaPlayer?.start()
            }
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("AUDIO_RESUME_FAILED", error)
        }
    }

    @ReactMethod
    fun stopAudio(promise: Promise) {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("AUDIO_STOP_FAILED", error)
        }
    }

    @ReactMethod
    fun getAudioPosition(promise: Promise) {
        try {
            val pos = mediaPlayer?.currentPosition ?: 0
            val dur = mediaPlayer?.duration ?: 0
            val isPlaying = mediaPlayer?.isPlaying ?: false
            promise.resolve(Arguments.createMap().apply {
                putInt("position", pos)
                putInt("duration", dur)
                putBoolean("isPlaying", isPlaying)
            })
        } catch (error: Exception) {
            promise.reject("AUDIO_POS_FAILED", error)
        }
    }
}

package com.dayaar.calling

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject

class DayaarFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        CallCommandHandler.handle(applicationContext, message.data)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val prefs = SecurePrefs.get(applicationContext)
        prefs.edit().putString(SecurePrefs.FCM_TOKEN, token).apply()
        if (!prefs.getString(SecurePrefs.DEVICE_TOKEN, null).isNullOrBlank()) {
            // Durable sync with exponential backoff (fire-and-forget drops tokens offline)
            syncTokenWithRetry(token, 0)
        }
    }

    private fun syncTokenWithRetry(token: String, attempt: Int) {
        DeviceApi.post(applicationContext, "/devices/fcm-token", JSONObject().put("fcmToken", token)) { result ->
            result.onFailure {
                if (attempt < 5) {
                    val delayMs = (1 shl attempt) * 10_000L
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        syncTokenWithRetry(token, attempt + 1)
                    }, delayMs)
                }
            }
        }
    }
}

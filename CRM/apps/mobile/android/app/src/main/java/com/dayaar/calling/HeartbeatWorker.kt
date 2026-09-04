package com.dayaar.calling

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume

/**
 * Periodic heartbeat (~15min minimum via WorkManager) + expedited foreground
 * ping while call-ready. Keeps server 45s/120s presence from going permanently
 * STALE/OFFLINE when the app is backgrounded.
 */
class HeartbeatWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val prefs = SecurePrefs.get(applicationContext)
        if (prefs.getString(SecurePrefs.DEVICE_TOKEN, null).isNullOrBlank()) return Result.success()
        return suspendCancellableCoroutine { cont ->
            try {
                DeviceApi.request(applicationContext, "POST", "/devices/heartbeat", JSONObject()) { result ->
                    result.fold(
                        onSuccess = { cont.resume(Result.success()) },
                        onFailure = {
                            // Retry on 5xx/network, fail (no retry storm) on 4xx
                            val msg = it.message ?: ""
                            if (msg.contains("(5")) cont.resume(Result.retry())
                            else cont.resume(Result.success())
                        },
                    )
                }
            } catch (_: Exception) {
                cont.resume(Result.retry())
            }
        }
    }

    companion object {
        private const val UNIQUE = "dayaar-heartbeat";

        fun schedule(context: Context) {
            val req = PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
                .setConstraints(
                    androidx.work.Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .addTag(UNIQUE)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE,
                ExistingPeriodicWorkPolicy.KEEP,
                req,
            )
        }

        fun syncFcmTokenIfNeeded(context: Context) {
            try {
                val prefs = SecurePrefs.get(context)
                val local = prefs.getString(SecurePrefs.FCM_TOKEN, null)
                if (!local.isNullOrBlank() && !prefs.getString(SecurePrefs.DEVICE_TOKEN, null).isNullOrBlank()) {
                    DeviceApi.post(context, "/devices/fcm-token", JSONObject().put("fcmToken", local))
                }
            } catch (_: Exception) {
            }
        }
    }
}

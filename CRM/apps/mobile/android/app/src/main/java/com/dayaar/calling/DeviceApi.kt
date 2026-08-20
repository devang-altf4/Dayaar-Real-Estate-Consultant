package com.dayaar.calling

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

object DeviceApi {
    private val executor = Executors.newSingleThreadExecutor()

    fun post(context: Context, path: String, body: JSONObject, callback: (Result<Unit>) -> Unit = {}) {
        val prefs = SecurePrefs.get(context)
        val apiBaseUrl = prefs.getString(SecurePrefs.API_BASE_URL, null)
        val deviceId = prefs.getString(SecurePrefs.DEVICE_ID, null)
        val deviceToken = prefs.getString(SecurePrefs.DEVICE_TOKEN, null)
        if (apiBaseUrl.isNullOrBlank() || deviceId.isNullOrBlank() || deviceToken.isNullOrBlank()) {
            callback(Result.failure(IllegalStateException("Device is not paired.")))
            return
        }

        executor.execute {
            var connection: HttpURLConnection? = null
            try {
                connection = URL("${apiBaseUrl.trimEnd('/')}$path").openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 10_000
                connection.readTimeout = 10_000
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("X-Device-Id", deviceId)
                connection.setRequestProperty("X-Device-Token", deviceToken)
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                val responseCode = connection.responseCode
                if (responseCode !in 200..299) {
                    val detail = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                    throw IllegalStateException("Device API rejected request ($responseCode): ${detail.take(300)}")
                }
                callback(Result.success(Unit))
            } catch (error: Exception) {
                callback(Result.failure(error))
            } finally {
                connection?.disconnect()
            }
        }
    }

    fun postCallStatus(
        context: Context,
        commandId: String,
        callAttemptId: String,
        status: String,
    ) {
        post(
            context,
            "/calls/device-status",
            JSONObject()
                .put("commandId", commandId)
                .put("callAttemptId", callAttemptId)
                .put("status", status)
                .put("occurredAt", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.US).format(java.util.Date())),
        )
    }
}

package com.dayaar.calling

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

object DeviceApi {
    private val executor = Executors.newSingleThreadExecutor()

    fun request(
        context: Context,
        method: String,
        path: String,
        body: JSONObject? = null,
        callback: (Result<String>) -> Unit,
    ) {
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
                connection.requestMethod = method
                connection.connectTimeout = 15_000
                connection.readTimeout = 15_000
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("X-Device-Id", deviceId)
                connection.setRequestProperty("X-Device-Token", deviceToken)
                if (body != null) {
                    connection.doOutput = true
                    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                }

                val responseCode = connection.responseCode
                val responseBody = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
                    ?.bufferedReader()
                    ?.use { it.readText() }
                    .orEmpty()
                if (responseCode !in 200..299) {
                    val message = runCatching { JSONObject(responseBody).optString("message") }
                        .getOrNull()
                        .takeUnless { it.isNullOrBlank() }
                        ?: responseBody.take(300)
                    throw IllegalStateException("Device API rejected request ($responseCode): $message")
                }
                callback(Result.success(responseBody))
            } catch (error: Exception) {
                callback(Result.failure(error))
            } finally {
                connection?.disconnect()
            }
        }
    }

    fun claimPairing(
        context: Context,
        apiBaseUrl: String,
        body: JSONObject,
        callback: (Result<String>) -> Unit,
    ) {
        val normalizedApiBaseUrl = apiBaseUrl.trimEnd('/')
        // Reject insecure pairing URLs (QR injection → MITM). Allow http only for local dev.
        require(normalizedApiBaseUrl.startsWith("https://") || normalizedApiBaseUrl.contains("10.0.2.2") || normalizedApiBaseUrl.contains("localhost")) {
            "Insecure pairing URL rejected"
        }
        executor.execute {
            var connection: HttpURLConnection? = null
            try {
                connection = URL("$normalizedApiBaseUrl/devices/pair").openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 15_000
                connection.readTimeout = 15_000
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }

                val responseCode = connection.responseCode
                val responseBody = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
                    ?.bufferedReader()
                    ?.use { it.readText() }
                    .orEmpty()
                if (responseCode !in 200..299) {
                    val message = runCatching { JSONObject(responseBody).optString("message") }
                        .getOrNull()
                        .takeUnless { it.isNullOrBlank() }
                        ?: responseBody.take(300)
                    throw IllegalStateException("Device API rejected pairing ($responseCode): $message")
                }

                val envelope = JSONObject(responseBody)
                val pairing = envelope.optJSONObject("data") ?: envelope
                val deviceId = pairing.optString("deviceId")
                val deviceToken = pairing.optString("deviceAuthToken")
                if (deviceId.isBlank() || deviceToken.isBlank()) {
                    throw IllegalStateException("Device API returned incomplete pairing credentials.")
                }

                val saved = SecurePrefs.get(context).edit()
                    .putString(SecurePrefs.API_BASE_URL, normalizedApiBaseUrl)
                    .putString(SecurePrefs.DEVICE_ID, deviceId)
                    .putString(SecurePrefs.DEVICE_TOKEN, deviceToken)
                    .putString(SecurePrefs.FCM_TOKEN, body.optString("fcmToken"))
                    .commit()
                if (!saved) {
                    throw IllegalStateException("Unable to persist encrypted device credentials.")
                }
                callback(Result.success(deviceId))
            } catch (error: Exception) {
                callback(Result.failure(error))
            } finally {
                connection?.disconnect()
            }
        }
    }

    fun post(context: Context, path: String, body: JSONObject, callback: (Result<Unit>) -> Unit = {}) {
        request(context, "POST", path, body) { result ->
            result.fold(
                onSuccess = { callback(Result.success(Unit)) },
                onFailure = { callback(Result.failure(it)) },
            )
        }
    }

    fun postCallStatus(
        context: Context,
        commandId: String,
        callAttemptId: String,
        status: String,
    ) {
        val fmt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }
        post(
            context,
            "/calls/device-status",
            JSONObject()
                .put("commandId", commandId)
                .put("callAttemptId", callAttemptId)
                .put("status", status)
                .put("occurredAt", fmt.format(java.util.Date())),
        )
    }
}

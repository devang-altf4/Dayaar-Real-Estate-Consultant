package com.dayaar.calling

import android.content.Context
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

object CallCommandHandler {
    @Synchronized
    fun handle(context: Context, data: Map<String, String>) {
        if (data["type"] != "DIAL_CALL") return
        val commandId = data["commandId"] ?: return
        val callAttemptId = data["callAttemptId"] ?: return
        val phoneNumber = data["phoneNumber"] ?: return
        val expiresAt = data["expiresAt"] ?: return
        if (!phoneNumber.matches(Regex("^\\+[1-9]\\d{7,14}$"))) return
        if (isExpired(expiresAt)) return

        val prefs = SecurePrefs.get(context)
        val processed = prefs.getStringSet(SecurePrefs.PROCESSED_COMMANDS, emptySet())?.toMutableSet()
            ?: mutableSetOf()
        if (processed.contains(commandId)) return
        // LRU: drop oldest instead of clearing all (prevents replay after 200)
        if (processed.size >= 200) {
            val iterator = processed.iterator()
            var toRemove = processed.size - 199
            while (toRemove-- > 0 && iterator.hasNext()) {
                iterator.next()
                iterator.remove()
            }
        }
        processed.add(commandId)
        prefs.edit().putStringSet(SecurePrefs.PROCESSED_COMMANDS, processed).apply()

        CallLauncher.placeTracked(context, phoneNumber, commandId, callAttemptId, expiresAt)
    }

    fun isExpired(value: String): Boolean {
        // Accept both SSSX (legacy) and ISO_INSTANT (toISOString, with millis + Z)
        try {
            return java.time.Instant.parse(value).toEpochMilli() <= System.currentTimeMillis()
        } catch (_: Exception) {
        }
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val expiresAt = parser.parse(value)?.time ?: return true
            expiresAt <= System.currentTimeMillis()
        } catch (_: Exception) {
            true
        }
    }
}

package com.dayaar.calling

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object SecurePrefs {
    const val API_BASE_URL = "apiBaseUrl"
    const val DEVICE_ID = "deviceId"
    const val DEVICE_TOKEN = "deviceToken"
    const val FCM_TOKEN = "fcmToken"
    const val ACTIVE_COMMAND_ID = "activeCommandId"
    const val ACTIVE_ATTEMPT_ID = "activeAttemptId"
    const val ACTIVE_SAW_OFFHOOK = "activeSawOffhook"
    const val PROCESSED_COMMANDS = "processedCommands"
    const val USER_AUTH_TOKEN = "userAuthToken"
    const val USER_AUTH_DATA = "userAuthData"

    fun get(context: Context): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            context,
            "dayaar_calling_secure",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }
}

package com.dayaar.calling

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

class CallStateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val prefs = SecurePrefs.get(context)
        val commandId = prefs.getString(SecurePrefs.ACTIVE_COMMAND_ID, null) ?: return
        val callAttemptId = prefs.getString(SecurePrefs.ACTIVE_ATTEMPT_ID, null) ?: return

        when (state) {
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                prefs.edit().putBoolean(SecurePrefs.ACTIVE_SAW_OFFHOOK, true).apply()
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                if (prefs.getBoolean(SecurePrefs.ACTIVE_SAW_OFFHOOK, false)) {
                    DeviceApi.postCallStatus(context, commandId, callAttemptId, "COMPLETED")
                } else {
                    DeviceApi.postCallStatus(context, commandId, callAttemptId, "CANCELLED")
                }
                prefs.edit()
                    .remove(SecurePrefs.ACTIVE_COMMAND_ID)
                    .remove(SecurePrefs.ACTIVE_ATTEMPT_ID)
                    .remove(SecurePrefs.ACTIVE_SAW_OFFHOOK)
                    .apply()
            }
        }
    }
}

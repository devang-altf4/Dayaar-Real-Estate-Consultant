package com.dayaar.calling

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class DialActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val phoneNumber = intent.getStringExtra("phoneNumber") ?: return
        val commandId = intent.getStringExtra("commandId") ?: return
        val callAttemptId = intent.getStringExtra("callAttemptId") ?: return
        CallLauncher.placeTracked(context, phoneNumber, commandId, callAttemptId)
    }
}

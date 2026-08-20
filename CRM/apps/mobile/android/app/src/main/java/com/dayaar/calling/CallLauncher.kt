package com.dayaar.calling

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

object CallLauncher {
    private const val CHANNEL_ID = "dayaar_dial_commands"

    fun placeTracked(context: Context, phoneNumber: String, commandId: String, callAttemptId: String) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            DeviceApi.postCallStatus(context, commandId, callAttemptId, "FAILED")
            showOpenAppNotification(context, "Call permission is required to dial $phoneNumber")
            return
        }
        val prefs = SecurePrefs.get(context)
        prefs.edit()
            .putString(SecurePrefs.ACTIVE_COMMAND_ID, commandId)
            .putString(SecurePrefs.ACTIVE_ATTEMPT_ID, callAttemptId)
            .putBoolean(SecurePrefs.ACTIVE_SAW_OFFHOOK, false)
            .apply()
        try {
            launchCallIntent(context, phoneNumber)
            DeviceApi.postCallStatus(context, commandId, callAttemptId, "DIALING")
        } catch (error: Exception) {
            prefs.edit()
                .remove(SecurePrefs.ACTIVE_COMMAND_ID)
                .remove(SecurePrefs.ACTIVE_ATTEMPT_ID)
                .remove(SecurePrefs.ACTIVE_SAW_OFFHOOK)
                .apply()
            DeviceApi.postCallStatus(context, commandId, callAttemptId, "FAILED")
            showDialNotification(context, phoneNumber, commandId, callAttemptId)
        }
    }

    fun placeManual(context: Context, phoneNumber: String) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            throw SecurityException("Phone-call permission has not been granted.")
        }
        require(phoneNumber.matches(Regex("^\\+[1-9]\\d{7,14}$"))) { "Server returned an invalid E.164 phone number." }
        launchCallIntent(context, phoneNumber)
    }

    private fun launchCallIntent(context: Context, phoneNumber: String) {
        val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber")).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    private fun showDialNotification(context: Context, phoneNumber: String, commandId: String, callAttemptId: String) {
        ensureChannel(context)
        val action = Intent(context, DialActionReceiver::class.java).apply {
            putExtra("phoneNumber", phoneNumber)
            putExtra("commandId", commandId)
            putExtra("callAttemptId", callAttemptId)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            commandId.hashCode(),
            action,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setContentTitle("Dayaar call ready")
            .setContentText("Tap to dial $phoneNumber using the company SIM")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .addAction(android.R.drawable.sym_action_call, "Dial", pendingIntent)
            .build()
        if (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            NotificationManagerCompat.from(context).notify(commandId.hashCode(), notification)
        }
    }

    private fun showOpenAppNotification(context: Context, message: String) {
        ensureChannel(context)
        val openApp = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context,
            91,
            openApp,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setContentTitle("Dayaar Calling needs attention")
            .setContentText(message)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        if (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            NotificationManagerCompat.from(context).notify(92, notification)
        }
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "SIM dial commands", NotificationManager.IMPORTANCE_HIGH),
            )
        }
    }
}

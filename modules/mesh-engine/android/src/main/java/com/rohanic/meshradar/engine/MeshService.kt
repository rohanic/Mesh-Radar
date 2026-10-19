package com.rohanic.meshradar.engine

import android.app.Notification
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.util.Log

/**
 * Foreground service (section 8) with types connectedDevice and location. Started only while the
 * app is on screen (section 9: no background location permission), it keeps the mesh alive with
 * the screen off. The persistent notification doubles as the quick-action bar.
 */
class MeshService : Service() {
    private val battery = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
            val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
            if (level >= 0 && scale > 0) {
                val pct = level * 100 / scale
                Engine.handler.post { Engine.onBattery(pct, plugged) }
            }
        }
    }

    private val shutdown = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            // Runs on the main thread; the crumb must go out before power is cut.
            Engine.onShutdown()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Engine.init(this)
        Engine.service = this
        val notification = Engine.statusNotification()
        try {
            startInForeground(notification)
        } catch (e: Exception) {
            Log.e(TAG, "cannot start foreground", e)
            stopSelf()
            return
        }
        registerReceiver(battery, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        registerReceiver(shutdown, IntentFilter(Intent.ACTION_SHUTDOWN))
        Engine.onServiceStarted(this)
    }

    private fun startInForeground(notification: Notification) {
        if (Build.VERSION.SDK_INT >= 29) {
            var types = ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
            // The location type needs the location permission granted (Android 14 rules).
            if (Radios.hasLocation(this)) types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            startForeground(Notifier.STATUS_ID, notification, types)
        } else {
            startForeground(Notifier.STATUS_ID, notification)
        }
    }

    fun updateNotification(notification: Notification) {
        getSystemService(NotificationManager::class.java).notify(Notifier.STATUS_ID, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Not sticky: after a reboot or kill, the person taps Start again (section 9 consequence).
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(battery)
            unregisterReceiver(shutdown)
        } catch (e: IllegalArgumentException) {
            // never registered
        }
        Engine.service = null
        Engine.onServiceStopped()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "MeshService"
    }
}

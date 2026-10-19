package com.rohanic.meshradar.engine

import android.Manifest
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability

/**
 * Radio and capability checks. Nearby Connections will stop switching radios on by itself (DEC-012),
 * so the app checks them and asks the person to turn them on.
 */
object Radios {
    fun state(context: Context): Map<String, Any?> {
        val bt = context.getSystemService(BluetoothManager::class.java)?.adapter
        val wifi = context.applicationContext.getSystemService(WifiManager::class.java)
        val lm = context.getSystemService(LocationManager::class.java)
        val pm = context.packageManager
        return mapOf(
            "bluetooth" to (bt?.isEnabled == true),
            "wifi" to (wifi?.isWifiEnabled == true),
            "location" to (if (Build.VERSION.SDK_INT >= 28) lm.isLocationEnabled else lm.isProviderEnabled(LocationManager.GPS_PROVIDER)),
            "bleExtended" to (bt?.isLeExtendedAdvertisingSupported == true),
            "playServices" to (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS),
            "uwb" to pm.hasSystemFeature("android.hardware.uwb"),
            "barometer" to pm.hasSystemFeature(PackageManager.FEATURE_SENSOR_BAROMETER),
            "compass" to pm.hasSystemFeature(PackageManager.FEATURE_SENSOR_COMPASS),
            "sdk" to Build.VERSION.SDK_INT,
            "manufacturer" to Build.MANUFACTURER,
            "permissions" to permissions(context),
        )
    }

    /** Runtime permissions the mesh needs on this Android version (section 9). */
    fun required(): List<String> = buildList {
        add(Manifest.permission.ACCESS_FINE_LOCATION)
        add(Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= 31) {
            add(Manifest.permission.BLUETOOTH_SCAN)
            add(Manifest.permission.BLUETOOTH_ADVERTISE)
            add(Manifest.permission.BLUETOOTH_CONNECT)
        }
        if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.NEARBY_WIFI_DEVICES)
    }

    /** Mesh permissions plus notifications (Android 13+) and UWB (Android 12+, C8). */
    fun permissions(context: Context): Map<String, Boolean> {
        val extra = buildList {
            if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
            if (Build.VERSION.SDK_INT >= 31) add("android.permission.UWB_RANGING")
        }
        return (required() + extra).associateWith { context.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }
    }

    fun hasMeshPermissions(context: Context): Boolean = required().all { context.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }

    fun hasLocation(context: Context): Boolean =
        context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    /** Settings screen for a radio: bluetooth, wifi, location, dnd, fullscreen, notifications. */
    fun settingsIntent(context: Context, kind: String): Intent {
        val action = when (kind) {
            "bluetooth" -> Settings.ACTION_BLUETOOTH_SETTINGS
            "wifi" -> if (Build.VERSION.SDK_INT >= 29) Settings.Panel.ACTION_WIFI else Settings.ACTION_WIFI_SETTINGS
            "location" -> Settings.ACTION_LOCATION_SOURCE_SETTINGS
            "dnd" -> Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS
            "fullscreen" -> if (Build.VERSION.SDK_INT >= 34) Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT else Settings.ACTION_APP_NOTIFICATION_SETTINGS
            "notifications" -> Settings.ACTION_APP_NOTIFICATION_SETTINGS
            else -> Settings.ACTION_APPLICATION_DETAILS_SETTINGS
        }
        val intent = Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        when (action) {
            Settings.ACTION_APP_NOTIFICATION_SETTINGS -> intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS -> intent.data = android.net.Uri.parse("package:" + context.packageName)
        }
        if (Build.VERSION.SDK_INT >= 34 && action == Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT) {
            intent.data = android.net.Uri.parse("package:" + context.packageName)
        }
        return intent
    }

    fun dndAccess(context: Context): Boolean =
        context.getSystemService(android.app.NotificationManager::class.java).isNotificationPolicyAccessGranted
}

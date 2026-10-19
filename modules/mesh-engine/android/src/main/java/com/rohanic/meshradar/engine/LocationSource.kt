package com.rohanic.meshradar.engine

import android.annotation.SuppressLint
import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

/**
 * GPS works without internet (section 1). Fused Location Provider when Google Play services is
 * present; the platform GPS provider otherwise (section 9, device compatibility).
 */
@SuppressLint("MissingPermission")
class LocationSource(private val context: Context, private val looper: Looper, private val onFix: (Location) -> Unit) {
    private val playServices: Boolean =
        GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS
    private var fused: FusedLocationProviderClient? = null
    private var running = false

    private val fusedCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let(onFix)
        }
    }

    private val platformListener = LocationListener { loc -> onFix(loc) }

    /** [intervalMs] from the power mode (H1); [highAccuracy] in Radar mode. */
    fun start(intervalMs: Long, highAccuracy: Boolean) {
        stop()
        try {
            if (playServices) {
                val priority = if (highAccuracy) Priority.PRIORITY_HIGH_ACCURACY else Priority.PRIORITY_BALANCED_POWER_ACCURACY
                val request = LocationRequest.Builder(priority, intervalMs)
                    .setMinUpdateIntervalMillis(intervalMs / 2)
                    .setWaitForAccurateLocation(false)
                    .build()
                val client = LocationServices.getFusedLocationProviderClient(context)
                client.requestLocationUpdates(request, fusedCallback, looper)
                fused = client
            } else {
                val lm = context.getSystemService(LocationManager::class.java)
                val provider = if (highAccuracy || !lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) LocationManager.GPS_PROVIDER else LocationManager.NETWORK_PROVIDER
                lm.requestLocationUpdates(provider, intervalMs, 0f, platformListener, looper)
            }
            running = true
        } catch (e: SecurityException) {
            Log.w(TAG, "no location permission", e)
        } catch (e: IllegalArgumentException) {
            Log.w(TAG, "no provider", e)
        }
    }

    fun stop() {
        if (!running) return
        fused?.removeLocationUpdates(fusedCallback)
        fused = null
        try {
            context.getSystemService(LocationManager::class.java).removeUpdates(platformListener)
        } catch (e: SecurityException) {
            Log.w(TAG, "removeUpdates", e)
        }
        running = false
    }

    fun locationEnabled(): Boolean {
        val lm = context.getSystemService(LocationManager::class.java)
        return if (android.os.Build.VERSION.SDK_INT >= 28) lm.isLocationEnabled else lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
    }

    companion object {
        private const val TAG = "MeshLocation"
    }
}

/**
 * Compass heading from the rotation-vector sensor (C1), corrected to true north, and barometric
 * pressure for floor estimates (C3).
 */
class Sensors(context: Context, private val handler: Handler, private val onHeading: (Double, Int) -> Unit, private val onPressure: (Float) -> Unit) :
    SensorEventListener {
    private val sm = context.getSystemService(SensorManager::class.java)
    private val rotation: Sensor? = sm.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR) ?: sm.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR)
    private val pressure: Sensor? = sm.getDefaultSensor(Sensor.TYPE_PRESSURE)
    private val rot = FloatArray(9)
    private val orient = FloatArray(3)
    private var declination = 0f
    private var accuracy = SensorManager.SENSOR_STATUS_UNRELIABLE
    private var lastHeadingAt = 0L
    private var lastHeading = -1.0
    private var lastPressureAt = 0L
    private var headingOn = false

    val hasBarometer: Boolean get() = pressure != null
    val hasCompass: Boolean get() = rotation != null

    /** Heading only while the UI shows the radar or Find mode, to save battery. */
    fun setHeadingEnabled(on: Boolean) {
        if (on == headingOn || rotation == null) return
        headingOn = on
        if (on) sm.registerListener(this, rotation, SensorManager.SENSOR_DELAY_UI, handler) else sm.unregisterListener(this, rotation)
    }

    fun startPressure() {
        pressure?.let { sm.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL, handler) }
    }

    fun stop() {
        sm.unregisterListener(this)
        headingOn = false
    }

    fun updateDeclination(loc: Location) {
        declination = GeomagneticField(loc.latitude.toFloat(), loc.longitude.toFloat(), loc.altitude.toFloat(), System.currentTimeMillis()).declination
    }

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ROTATION_VECTOR, Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR -> {
                SensorManager.getRotationMatrixFromVector(rot, event.values)
                SensorManager.getOrientation(rot, orient)
                val heading = ((Math.toDegrees(orient[0].toDouble()) + declination + 360) % 360)
                val now = System.currentTimeMillis()
                // At most 20 updates a second, and only when it moved by a degree.
                if (now - lastHeadingAt < 50 || Math.abs(angleDiff(heading, lastHeading)) < 1.0) return
                lastHeadingAt = now
                lastHeading = heading
                onHeading(heading, accuracy)
            }
            Sensor.TYPE_PRESSURE -> {
                val now = System.currentTimeMillis()
                if (now - lastPressureAt < 2_000) return
                lastPressureAt = now
                onPressure(event.values[0])
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor, acc: Int) {
        if (sensor.type == Sensor.TYPE_ROTATION_VECTOR || sensor.type == Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR) {
            accuracy = acc
            if (lastHeading >= 0) onHeading(lastHeading, accuracy)
        }
    }

    private fun angleDiff(a: Double, b: Double): Double {
        if (b < 0) return 360.0
        var d = (a - b) % 360
        if (d > 180) d -= 360
        if (d < -180) d += 360
        return d
    }
}

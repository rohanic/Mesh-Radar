package com.rohanic.meshradar.engine

import android.content.Context
import android.content.SharedPreferences
import android.location.Location
import android.os.BatteryManager
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import com.goterl.lazysodium.LazySodiumAndroid
import com.goterl.lazysodium.SodiumAndroid
import com.rohanic.meshradar.core.crypto.Crypto
import com.rohanic.meshradar.core.engine.Clock
import com.rohanic.meshradar.core.engine.CoreConfig
import com.rohanic.meshradar.core.engine.EventSink
import com.rohanic.meshradar.core.engine.Licences
import com.rohanic.meshradar.core.engine.Link
import com.rohanic.meshradar.core.engine.MeshCore
import com.rohanic.meshradar.core.model.PowerMode
import com.rohanic.meshradar.core.protocol.CrumbReason
import com.rohanic.meshradar.core.protocol.Position
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Process-wide engine (section 8): owns the mesh core, the radios and the sensors. The foreground
 * service starts and stops the radios; JS calls go straight to the core, so the UI can be swiped
 * away while the engine keeps scanning, relaying and beaconing.
 */
object Engine {
    private const val TAG = "MeshEngine"
    private const val PREFS = "mesh_engine"

    private val thread = HandlerThread("mesh-engine").apply { start() }
    val handler = Handler(thread.looper)

    private lateinit var app: Context
    @Volatile private var coreRef: MeshCore? = null
    private val listeners = CopyOnWriteArrayList<(String, Map<String, Any?>) -> Unit>()
    val strings = ConcurrentHashMap<String, String>()

    @Volatile var appInForeground = false
    @Volatile var running = false
        private set

    var nearby: NearbyTransport? = null
        private set
    var ble: BleBeacons? = null
        private set
    private var location: LocationSource? = null
    private var sensors: Sensors? = null
    private var notifier: Notifier? = null
    var photos: PhotoStore? = null
        private set
    private var relay: InternetRelay? = null
    var uwb: UwbRanging? = null
        private set

    private var lastPressurePa: Int? = null
    private var lastHeading: Double? = null
    private var battery: Int? = null
    private var charging = false
    private var ownLocation: Map<String, Any?>? = null
    private var lastStatusAt = 0L
    private var lastBeaconAt = 0L
    private var lastDutyAt = 0L
    private var lastCircleAt = 0L
    private var lastHealthEmitAt = 0L

    val core: MeshCore
        get() = coreRef ?: init(app)

    fun prefs(): SharedPreferences = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    @Synchronized
    fun init(context: Context): MeshCore {
        coreRef?.let { return it }
        app = context.applicationContext
        prefs().getString("strings", null)?.let { loadStrings(it) }
        val licenceKey = Licences.publicKeyFromHex(prefs().getString("licencePublicKey", ""))
        val seed = KeyVault(app).loadOrCreateSeed()
        val db = EngineDb(app)
        val crypto = Crypto(LazySodiumAndroid(SodiumAndroid()))
        val core = MeshCore(
            crypto = crypto,
            seed = seed,
            stateStore = FileStateStore(app),
            packetStore = SqlPacketStore(db),
            messages = SqlMessageLog(db),
            breadcrumbs = SqlBreadcrumbLog(db),
            link = link,
            events = EventSink { name, payload -> dispatch(name, payload) },
            clock = Clock { System.currentTimeMillis() },
            config = CoreConfig(licencePublicKey = licenceKey, appVersion = prefs().getInt("appVersion", 1)),
        )
        seed.fill(0)
        coreRef = core
        notifier = Notifier(app).also { it.createChannels() }
        photos = PhotoStore(app)
        relay = InternetRelay(app)
        uwb = UwbRanging(app)
        sensors = Sensors(app, handler, ::onHeading, ::onPressure)
        return core
    }

    /** JS passes public config at startup; the licence key is the Worker's Ed25519 public key. */
    fun configure(context: Context, licencePublicKey: String, apiBaseUrl: String, appVersion: Int) {
        app = context.applicationContext
        val changed = prefs().getString("licencePublicKey", "") != licencePublicKey
        prefs().edit().putString("licencePublicKey", licencePublicKey).putString("apiBaseUrl", apiBaseUrl).putInt("appVersion", appVersion).apply()
        if (changed && coreRef != null) Log.i(TAG, "licence key changes take effect on next start")
    }

    fun setStrings(json: String) {
        prefs().edit().putString("strings", json).apply()
        loadStrings(json)
        notifier?.createChannels()
    }

    private fun loadStrings(json: String) {
        try {
            val o = JSONObject(json)
            strings.clear()
            o.keys().forEach { k -> strings[k] = o.getString(k) }
        } catch (e: org.json.JSONException) {
            Log.w(TAG, "bad strings", e)
        }
    }

    fun addListener(l: (String, Map<String, Any?>) -> Unit) {
        listeners.add(l)
    }

    fun removeListener(l: (String, Map<String, Any?>) -> Unit) {
        listeners.remove(l)
    }

    fun emit(name: String, payload: Map<String, Any?>) {
        for (l in listeners) {
            try {
                l(name, payload)
            } catch (e: Exception) {
                Log.w(TAG, "listener failed", e)
            }
        }
    }

    private fun dispatch(name: String, payload: Map<String, Any?>) {
        if (name == "ownPosition") ownLocation = payload
        if (name == "health") {
            // Throttle: the mesh health pill does not need more than one update a second.
            val now = System.currentTimeMillis()
            if (now - lastHealthEmitAt < 1_000) return
            lastHealthEmitAt = now
        }
        when (name) {
            "photoRequest" -> photos?.onRequest(payload["endpoint"] as String, payload["photoId"] as String)
            "photoMeta" -> photos?.onMeta(payload["photoId"] as String, (payload["payloadId"] as Number).toLong())
            "uwb" -> uwb?.onSignal(payload)
        }
        notifier?.onEvent(name, payload, ownLocation, appInForeground)
        emit(name, payload)
    }

    fun memberName(groupId: String?, memberId: String?): String {
        if (groupId == null || memberId == null) return "?"
        return try {
            @Suppress("UNCHECKED_CAST")
            val members = core.groupDetail(groupId)["members"] as List<Map<String, Any?>>
            members.firstOrNull { it["id"] == memberId }?.get("name") as? String ?: "?"
        } catch (e: Exception) {
            "?"
        }
    }

    // ---------------------------------------------------------------- radios

    private val link = object : Link {
        override fun neighbours(): List<String> = nearby?.connected() ?: emptyList()
        override fun send(endpoint: String, frame: ByteArray) {
            nearby?.send(endpoint, frame)
        }
        override fun density(): Int {
            val now = System.currentTimeMillis()
            return maxOf(nearby?.density(now) ?: 0, ble?.density(now) ?: 0)
        }
    }

    private val transportListener = object : NearbyTransport.Listener {
        override fun onLinkUp(endpoint: String) = core.onLinkUp(endpoint)
        override fun onLinkDown(endpoint: String) = core.onLinkDown(endpoint)
        override fun onFrame(endpoint: String, bytes: ByteArray) = core.onFrame(endpoint, bytes)
        override fun onFile(endpoint: String, payloadId: Long, payload: com.google.android.gms.nearby.connection.Payload) {
            photos?.onFile(payloadId, payload)
        }
        override fun onFileDone(endpoint: String, payloadId: Long, success: Boolean) {
            photos?.onFileDone(payloadId, success)
        }
    }

    /** Called by [MeshService] once it is in the foreground. */
    fun onServiceStarted(service: MeshService) {
        init(service)
        if (running) return
        running = true
        handler.post {
            if (Radios.hasMeshPermissions(app)) {
                try {
                    nearby = NearbyTransport(app, handler, transportListener).also { it.start() }
                } catch (e: Exception) {
                    // No Google Play services: BLE-only mode (section 9).
                    Log.w(TAG, "nearby unavailable", e)
                }
                ble = BleBeacons(app, handler) { bytes -> core.onBeacon(bytes) }.also { it.start(scanMode()) }
            }
            location = LocationSource(app, thread.looper, ::onFix).also { startLocation(it) }
            sensors?.startPressure()
            handler.post(ticker)
            emit("engineState", state())
        }
    }

    fun onServiceStopped() {
        running = false
        handler.removeCallbacks(ticker)
        handler.post {
            nearby?.stop()
            nearby = null
            ble?.stop()
            ble = null
            location?.stop()
            location = null
            sensors?.stop()
            coreRef?.flush()
            emit("engineState", state())
        }
    }

    fun state(): Map<String, Any?> = mapOf(
        "running" to running,
        "powerMode" to (coreRef?.powerMode()?.name?.lowercase() ?: "balanced"),
        "radios" to Radios.state(app),
        "bleBeacons" to (ble?.supported == true),
        "nearby" to (nearby != null),
        "lockScreenCard" to prefs().getBoolean("lockScreenCard", false),
        "dndAccess" to Radios.dndAccess(app),
    )

    fun setPowerMode(mode: PowerMode) {
        core.setPowerMode(mode)
        handler.post {
            location?.let { startLocation(it) }
            ble?.setScanMode(scanMode())
        }
    }

    fun setEventDay(on: Boolean, eventId: String) {
        core.setEventDay(on, eventId)
        handler.post { ble?.setScanMode(scanMode()) }
    }

    private fun eventDay(): Boolean = (core.health()["eventDay"] as? Boolean) == true

    private fun startLocation(src: LocationSource) {
        val mode = core.powerMode()
        // F3: event day raises the scan rate; Radar stays at 5 s, others at least 30 s.
        val interval = if (eventDay() && mode == PowerMode.STANDBY) 30_000L else mode.positionIntervalSec * 1000
        src.start(interval, highAccuracy = mode == PowerMode.RADAR || eventDay())
    }

    private fun scanMode(): Int = when {
        eventDay() || core.powerMode() == PowerMode.RADAR -> android.bluetooth.le.ScanSettings.SCAN_MODE_BALANCED
        else -> android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_POWER
    }

    /** Nearby discovery duty cycle per power mode (section 8 table). */
    private fun duty(): Pair<Long, Long> = when {
        eventDay() || core.powerMode() == PowerMode.RADAR -> 1L to 1L
        core.powerMode() == PowerMode.BALANCED -> 9_000L to 30_000L
        core.powerMode() == PowerMode.STANDBY -> 6_000L to 60_000L
        else -> 6_000L to 120_000L
    }

    private val ticker = object : Runnable {
        override fun run() {
            if (!running) return
            val now = System.currentTimeMillis()
            try {
                core.tick()
                if (now - lastDutyAt >= 1_000) {
                    lastDutyAt = now
                    val (on, period) = duty()
                    nearby?.dutyCycle(now, on, period)
                }
                val beaconEvery = if (core.powerMode() == PowerMode.RADAR) 2_000L else 10_000L
                if (now - lastBeaconAt >= beaconEvery) {
                    lastBeaconAt = now
                    ble?.update(core.beaconPackets())
                }
                if (now - lastStatusAt >= 5_000) {
                    lastStatusAt = now
                    updateStatusNotification()
                }
                if (now - lastCircleAt >= 60_000) {
                    lastCircleAt = now
                    val groups = prefs().getStringSet("circleGroups", emptySet()) ?: emptySet()
                    relay?.sync(prefs().getString("apiBaseUrl", "") ?: "", groups)
                }
            } catch (e: Exception) {
                Log.e(TAG, "tick failed", e)
            }
            handler.postDelayed(this, 250)
        }
    }

    var service: MeshService? = null

    fun updateStatusNotification() {
        val s = service ?: return
        val n = notifier ?: return
        @Suppress("UNCHECKED_CAST")
        val card = core.profile()["card"] as? Map<String, Any?>
        s.updateNotification(n.status(core.health(), card, prefs().getBoolean("lockScreenCard", false)))
    }

    fun statusNotification(): android.app.Notification {
        init(app)
        @Suppress("UNCHECKED_CAST")
        val card = core.profile()["card"] as? Map<String, Any?>
        return notifier!!.status(core.health(), card, prefs().getBoolean("lockScreenCard", false))
    }

    fun setLockScreenCard(on: Boolean) {
        prefs().edit().putBoolean("lockScreenCard", on).apply()
        updateStatusNotification()
    }

    fun setFamilyCircle(groupId: String, on: Boolean) {
        val set = HashSet(prefs().getStringSet("circleGroups", emptySet()) ?: emptySet())
        if (on) set.add(groupId) else set.remove(groupId)
        prefs().edit().putStringSet("circleGroups", set).apply()
    }

    fun familyCircleGroups(): List<String> = (prefs().getStringSet("circleGroups", emptySet()) ?: emptySet()).toList()

    fun setHeadingActive(on: Boolean) {
        handler.post { sensors?.setHeadingEnabled(on) }
    }

    // ---------------------------------------------------------------- sensors

    private fun onFix(loc: Location) {
        sensors?.updateDeclination(loc)
        var flags = 0
        if (charging) flags = flags or Position.FLAG_CHARGING
        if (core.powerMode() == PowerMode.ULTRA_SAVER) flags = flags or Position.FLAG_ULTRA_SAVER
        val pos = Position(
            lat = loc.latitude,
            lon = loc.longitude,
            altM = if (loc.hasAltitude()) loc.altitude.toInt() else null,
            pressurePa = lastPressurePa,
            accuracyM = if (loc.hasAccuracy()) loc.accuracy.toDouble() else 0.0,
            heading = lastHeading ?: if (loc.hasBearing()) loc.bearing.toDouble() else null,
            battery = battery,
            flags = flags,
            fixTime = loc.time / 1000,
        )
        core.onLocalPosition(pos)
    }

    private fun onHeading(heading: Double, accuracy: Int) {
        lastHeading = heading
        emit("heading", mapOf("heading" to heading, "accuracy" to accuracy))
    }

    private fun onPressure(hPa: Float) {
        lastPressurePa = (hPa * 100).toInt()
        emit("pressure", mapOf("pressurePa" to lastPressurePa))
    }

    fun onBattery(level: Int, plugged: Int) {
        battery = level
        charging = plugged != 0
        core.onBattery(level, charging)
        emit("battery", mapOf("level" to level, "charging" to charging))
    }

    fun onShutdown() {
        // E3: final beacon on shutdown, flushed before the phone goes down.
        core.sendCrumb(CrumbReason.SHUTDOWN, battery)
        ble?.update(core.beaconPackets())
        core.tick()
        core.flush()
    }

    fun batteryLevel(context: Context): Int {
        val bm = context.getSystemService(BatteryManager::class.java)
        return bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
    }

    /** Delete everything (H4): keys, groups, messages, photos. */
    fun wipe(context: Context) {
        context.stopService(android.content.Intent(context, MeshService::class.java))
        coreRef?.wipe()
        EngineDb(context.applicationContext).wipe()
        photos?.wipe()
        KeyVault(context.applicationContext).wipe()
        prefs().edit().clear().apply()
        coreRef = null
    }
}

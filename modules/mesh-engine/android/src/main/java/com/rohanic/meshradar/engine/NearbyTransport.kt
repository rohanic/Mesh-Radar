package com.rohanic.meshradar.engine

import android.content.Context
import android.os.Handler
import android.util.Log
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap

/**
 * Transport 1 (section 8): Google Nearby Connections with the P2P_CLUSTER strategy, M-to-N within
 * radio range. Every connected endpoint is a mesh link. Endpoint names are random and rotate every
 * hour so strangers cannot track a phone (section 8, privacy).
 *
 * All callbacks are re-posted to the engine thread ([handler]).
 */
class NearbyTransport(
    context: Context,
    private val handler: Handler,
    private val listener: Listener,
) {
    interface Listener {
        fun onLinkUp(endpoint: String)
        fun onLinkDown(endpoint: String)
        fun onFrame(endpoint: String, bytes: ByteArray)
        fun onFile(endpoint: String, payloadId: Long, payload: Payload)
        fun onFileDone(endpoint: String, payloadId: Long, success: Boolean)
    }

    private val client: ConnectionsClient = Nearby.getConnectionsClient(context)
    private val connected = ConcurrentHashMap<String, Long>()
    private val pending = ConcurrentHashMap<String, Long>()
    /** endpointId -> last seen time (ms); the crowd-density estimate (DEC-010). */
    private val discovered = ConcurrentHashMap<String, Long>()
    private val names = ConcurrentHashMap<String, String>()
    private var localName = newName()
    private var nameSetAt = 0L
    @Volatile private var advertising = false
    @Volatile private var discovering = false
    @Volatile var running = false
        private set

    fun connected(): List<String> = connected.keys.toList()

    fun density(nowMs: Long): Int = (discovered.filterValues { nowMs - it < 60_000 }.keys + connected.keys).size

    fun start() {
        running = true
        nameSetAt = System.currentTimeMillis()
        startAdvertising()
        startDiscovery()
    }

    fun stop() {
        running = false
        client.stopAdvertising()
        client.stopDiscovery()
        client.stopAllEndpoints()
        advertising = false
        discovering = false
        connected.clear()
        pending.clear()
        discovered.clear()
    }

    /** Duty cycling per power mode (H1): discovery on for [onMs] of every [periodMs]. */
    fun dutyCycle(nowMs: Long, onMs: Long, periodMs: Long) {
        if (!running) return
        // Hourly endpoint name rotation.
        if (nowMs - nameSetAt > ROTATE_MS) {
            nameSetAt = nowMs
            localName = newName()
            client.stopAdvertising()
            advertising = false
        }
        val phase = nowMs % periodMs
        val on = onMs >= periodMs || phase < onMs
        if (on) {
            if (!advertising) startAdvertising()
            if (!discovering) startDiscovery()
        } else {
            // Keep existing links; only stop looking for new ones.
            if (discovering) {
                client.stopDiscovery()
                discovering = false
            }
            if (advertising && connected.isNotEmpty()) {
                client.stopAdvertising()
                advertising = false
            }
        }
        discovered.entries.removeIf { nowMs - it.value > 120_000 }
        pending.entries.removeIf { nowMs - it.value > 30_000 }
        rotateLinks(nowMs)
    }

    private var lastRotate = 0L

    /** Every 3 minutes, when full, drop the oldest link so packets spread through more of the crowd. */
    private fun rotateLinks(nowMs: Long) {
        if (nowMs - lastRotate < 180_000 || connected.size < MAX_LINKS) return
        val unlinked = discovered.keys.count { !connected.containsKey(it) }
        if (unlinked == 0) return
        lastRotate = nowMs
        connected.minByOrNull { it.value }?.key?.let { disconnect(it) }
    }

    fun send(endpoint: String, frame: ByteArray) {
        if (!connected.containsKey(endpoint)) return
        if (frame.size > ConnectionsClient.MAX_BYTES_DATA_SIZE) return
        client.sendPayload(endpoint, Payload.fromBytes(frame)).addOnFailureListener { e -> Log.w(TAG, "send failed", e) }
    }

    fun sendFile(endpoint: String, payload: Payload) {
        if (!connected.containsKey(endpoint)) return
        client.sendPayload(endpoint, payload)
    }

    private fun disconnect(endpoint: String) {
        client.disconnectFromEndpoint(endpoint)
        if (connected.remove(endpoint) != null) handler.post { listener.onLinkDown(endpoint) }
    }

    private fun startAdvertising() {
        val opts = AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        client.startAdvertising(localName, SERVICE_ID, lifecycle, opts)
            .addOnSuccessListener { advertising = true }
            .addOnFailureListener { e -> advertising = isAlready(e); Log.w(TAG, "advertising failed", e) }
    }

    private fun startDiscovery() {
        val opts = DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()
        client.startDiscovery(SERVICE_ID, discovery, opts)
            .addOnSuccessListener { discovering = true }
            .addOnFailureListener { e -> discovering = isAlready(e); Log.w(TAG, "discovery failed", e) }
    }

    private fun isAlready(e: Exception): Boolean {
        val code = (e as? com.google.android.gms.common.api.ApiException)?.statusCode ?: return false
        return code == ConnectionsStatusCodes.STATUS_ALREADY_ADVERTISING || code == ConnectionsStatusCodes.STATUS_ALREADY_DISCOVERING
    }

    private val discovery = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            if (info.serviceId != SERVICE_ID) return
            discovered[endpointId] = System.currentTimeMillis()
            names[endpointId] = info.endpointName
            maybeConnect(endpointId, info.endpointName)
        }

        override fun onEndpointLost(endpointId: String) {
            discovered.remove(endpointId)
        }
    }

    /**
     * Only the phone with the smaller name asks, so two phones do not request each other at once;
     * the larger one asks too if nothing happened after 10 seconds.
     */
    private fun maybeConnect(endpointId: String, theirName: String) {
        if (connected.containsKey(endpointId) || pending.containsKey(endpointId)) return
        if (connected.size >= MAX_LINKS) return
        if (localName > theirName) {
            handler.postDelayed({
                if (running && !connected.containsKey(endpointId) && discovered.containsKey(endpointId)) request(endpointId)
            }, 10_000)
            return
        }
        request(endpointId)
    }

    private fun request(endpointId: String) {
        if (connected.size >= MAX_LINKS || pending.containsKey(endpointId)) return
        pending[endpointId] = System.currentTimeMillis()
        client.requestConnection(localName, endpointId, lifecycle)
            .addOnFailureListener { pending.remove(endpointId) }
    }

    private val lifecycle = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            // Content is end-to-end encrypted, so any app phone may relay (D1). Accept up to the cap.
            if (connected.size >= MAX_LINKS + 1) {
                client.rejectConnection(endpointId)
                return
            }
            client.acceptConnection(endpointId, payloads)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            pending.remove(endpointId)
            if (result.status.statusCode == ConnectionsStatusCodes.STATUS_OK) {
                connected[endpointId] = System.currentTimeMillis()
                handler.post { listener.onLinkUp(endpointId) }
            }
        }

        override fun onDisconnected(endpointId: String) {
            if (connected.remove(endpointId) != null) handler.post { listener.onLinkDown(endpointId) }
        }
    }

    private val payloads = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            when (payload.type) {
                Payload.Type.BYTES -> payload.asBytes()?.let { bytes -> handler.post { listener.onFrame(endpointId, bytes) } }
                Payload.Type.FILE -> handler.post { listener.onFile(endpointId, payload.id, payload) }
                else -> {}
            }
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            when (update.status) {
                PayloadTransferUpdate.Status.SUCCESS -> handler.post { listener.onFileDone(endpointId, update.payloadId, true) }
                PayloadTransferUpdate.Status.FAILURE, PayloadTransferUpdate.Status.CANCELED ->
                    handler.post { listener.onFileDone(endpointId, update.payloadId, false) }
                else -> {}
            }
        }
    }

    private fun newName(): String {
        val b = ByteArray(6).also { SecureRandom().nextBytes(it) }
        return "MR1" + b.joinToString("") { "%02x".format(it.toInt() and 0xFF) }
    }

    companion object {
        private const val TAG = "MeshNearby"
        const val SERVICE_ID = "com.rohanic.meshradar.mesh"
        const val MAX_LINKS = 6
        const val ROTATE_MS = 60 * 60_000L
    }
}

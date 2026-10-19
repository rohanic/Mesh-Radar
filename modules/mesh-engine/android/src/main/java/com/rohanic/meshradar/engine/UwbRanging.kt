package com.rohanic.meshradar.engine

import android.content.Context
import android.util.Log
import androidx.core.uwb.RangingParameters
import androidx.core.uwb.RangingResult
import androidx.core.uwb.UwbAddress
import androidx.core.uwb.UwbClientSessionScope
import androidx.core.uwb.UwbComplexChannel
import androidx.core.uwb.UwbControllerSessionScope
import androidx.core.uwb.UwbDevice
import androidx.core.uwb.UwbManager
import com.rohanic.meshradar.core.protocol.UwbBody
import com.rohanic.meshradar.core.protocol.UwbOp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.security.SecureRandom
import java.util.Base64

/**
 * UWB fine-find under 10 m (C8). Session parameters travel over the mesh as a direct UWB packet:
 * the finder is the controller, the found phone the controlee. Hidden on phones without UWB.
 */
class UwbRanging(private val context: Context) {
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var manager: UwbManager? = null
    private var controller: UwbControllerSessionScope? = null
    private var pending: Triple<Int, ByteArray, String>? = null
    private var job: Job? = null

    val supported: Boolean get() = context.packageManager.hasSystemFeature("android.hardware.uwb")

    private fun manager(): UwbManager? {
        if (!supported) return null
        return manager ?: UwbManager.createInstance(context).also { manager = it }
    }

    /** Finder side: become controller and offer a session to [memberId]. */
    fun start(groupId: String, memberId: String) {
        val m = manager() ?: throw IllegalStateException("uwb_unsupported")
        scope.launch {
            try {
                val c = m.controllerSessionScope()
                controller = c
                val sessionId = SecureRandom().nextInt()
                val key = ByteArray(8).also { SecureRandom().nextBytes(it) }
                pending = Triple(sessionId, key, memberId)
                val body = UwbBody(UwbOp.OFFER, sessionId, c.localAddress.address, c.uwbComplexChannel.channel, c.uwbComplexChannel.preambleIndex, key, RangingParameters.CONFIG_UNICAST_DS_TWR)
                Engine.handler.post { Engine.core.sendUwb(groupId, memberId, body) }
            } catch (e: Exception) {
                Log.w(TAG, "controller failed", e)
                Engine.emit("uwbState", mapOf("state" to "error", "reason" to (e.message ?: "error")))
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
        controller = null
        pending = null
        Engine.emit("uwbState", mapOf("state" to "stopped"))
    }

    /** Engine event "uwb" from a group member. */
    fun onSignal(p: Map<String, Any?>) {
        val m = manager() ?: return
        val groupId = p["groupId"] as? String ?: return
        val from = p["senderId"] as? String ?: return
        val dec = Base64.getDecoder()
        val address = dec.decode(p["address"] as? String ?: return)
        when (p["op"]) {
            "offer" -> scope.launch {
                try {
                    val c = m.controleeSessionScope()
                    val reply = UwbBody(UwbOp.ACCEPT, (p["sessionId"] as Number).toInt(), c.localAddress.address, 0, 0, ByteArray(0), (p["configType"] as Number).toInt())
                    Engine.handler.post { Engine.core.sendUwb(groupId, from, reply) }
                    range(
                        c,
                        (p["sessionId"] as Number).toInt(),
                        dec.decode(p["sessionKey"] as String),
                        UwbComplexChannel((p["channel"] as Number).toInt(), (p["preamble"] as Number).toInt()),
                        address,
                        from,
                    )
                } catch (e: Exception) {
                    Log.w(TAG, "controlee failed", e)
                }
            }
            "accept" -> {
                val c = controller ?: return
                val (sessionId, key, memberId) = pending ?: return
                if (memberId != from) return
                range(c, sessionId, key, c.uwbComplexChannel, address, from)
            }
            "stop" -> stop()
        }
    }

    private fun range(session: UwbClientSessionScope, sessionId: Int, key: ByteArray, channel: UwbComplexChannel, peer: ByteArray, memberId: String) {
        val params = RangingParameters(
            uwbConfigType = RangingParameters.CONFIG_UNICAST_DS_TWR,
            sessionId = sessionId,
            subSessionId = 0,
            sessionKeyInfo = key,
            subSessionKeyInfo = null,
            complexChannel = channel,
            peerDevices = listOf(UwbDevice(UwbAddress(peer))),
            updateRateType = RangingParameters.RANGING_UPDATE_RATE_AUTOMATIC,
        )
        job?.cancel()
        job = scope.launch {
            Engine.emit("uwbState", mapOf("state" to "ranging", "memberId" to memberId))
            try {
                session.prepareSession(params).collect { result ->
                    when (result) {
                        is RangingResult.RangingResultPosition -> Engine.emit(
                            "uwbRange",
                            mapOf(
                                "memberId" to memberId,
                                "distanceM" to result.position.distance?.value?.toDouble(),
                                "azimuth" to result.position.azimuth?.value?.toDouble(),
                                "elevation" to result.position.elevation?.value?.toDouble(),
                            ),
                        )
                        is RangingResult.RangingResultPeerDisconnected -> Engine.emit("uwbState", mapOf("state" to "lost", "memberId" to memberId))
                        else -> {}
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "ranging failed", e)
                Engine.emit("uwbState", mapOf("state" to "error", "reason" to (e.message ?: "error")))
            }
        }
    }

    companion object {
        private const val TAG = "MeshUwb"
    }
}

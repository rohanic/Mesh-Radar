package com.rohanic.meshradar.core

import com.goterl.lazysodium.LazySodiumJava
import com.goterl.lazysodium.SodiumJava
import com.rohanic.meshradar.core.crypto.Crypto
import com.rohanic.meshradar.core.engine.Clock
import com.rohanic.meshradar.core.engine.CoreConfig
import com.rohanic.meshradar.core.engine.EventSink
import com.rohanic.meshradar.core.engine.Link
import com.rohanic.meshradar.core.engine.MeshCore
import com.rohanic.meshradar.core.model.MemoryBreadcrumbLog
import com.rohanic.meshradar.core.model.MemoryMessageLog
import com.rohanic.meshradar.core.model.MemoryStateStore
import com.rohanic.meshradar.core.protocol.EmergencyCard
import com.rohanic.meshradar.core.protocol.Position
import com.rohanic.meshradar.core.routing.MemoryPacketStore
import java.security.SecureRandom
import kotlin.random.Random

object Sodium {
    val crypto: Crypto by lazy { Crypto(LazySodiumJava(SodiumJava())) }
}

class VirtualClock(var now: Long = 1_760_000_000_000L) : Clock {
    override fun nowMs(): Long = now
}

/** A recorded engine event. */
data class Ev(val name: String, val payload: Map<String, Any?>)

/**
 * In-memory radio network for multi-phone tests. Links are explicit and symmetric; frames are
 * queued and delivered on [step], so the test controls time exactly.
 */
class TestNet(seed: Long = 1, val config: CoreConfig = CoreConfig()) {
    val clock = VirtualClock()
    private val rnd = Random(seed)
    val nodes = linkedMapOf<String, Node>()
    private val links = HashMap<String, MutableSet<String>>()
    private val queue = ArrayDeque<Triple<String, String, ByteArray>>()
    var framesSent = 0L

    inner class Node(val name: String) {
        val events = mutableListOf<Ev>()
        val state = MemoryStateStore()
        val store = MemoryPacketStore()
        val messages = MemoryMessageLog()
        val crumbs = MemoryBreadcrumbLog()
        val seed: ByteArray = ByteArray(32).also { rnd.nextBytes(it) }
        var alive = true
        val link = object : Link {
            override fun neighbours(): List<String> = if (!alive) emptyList() else links[name].orEmpty().filter { nodes[it]?.alive == true }
            override fun send(endpoint: String, frame: ByteArray) {
                if (!alive) return
                if (links[name]?.contains(endpoint) != true) return
                framesSent++
                queue.addLast(Triple(name, endpoint, frame))
            }
        }
        val core = MeshCore(
            Sodium.crypto, seed, state, store, messages, crumbs, link,
            EventSink { n, p -> events.add(Ev(n, p)) }, clock, config, Random(rnd.nextLong()), SecureRandom(),
        )

        fun ev(name: String) = events.filter { it.name == name }
        fun last(name: String) = ev(name).lastOrNull()
        fun clearEvents() = events.clear()

        fun profile(n: String) = core.setProfile(n, 0, 1, ByteArray(0), EmergencyCard(name = n, bloodGroup = "O+"))

        fun at(lat: Double, lon: Double, battery: Int? = 80, pressurePa: Int? = null) =
            core.onLocalPosition(Position(lat, lon, altM = 10, pressurePa = pressurePa, accuracyM = 5.0, heading = 0.0, battery = battery, fixTime = clock.now / 1000))
    }

    fun add(name: String): Node = Node(name).also { nodes[name] = it; links[name] = mutableSetOf() }

    fun connect(a: String, b: String) {
        links.getValue(a).add(b)
        links.getValue(b).add(a)
        if (nodes.getValue(a).alive && nodes.getValue(b).alive) {
            nodes.getValue(a).core.onLinkUp(b)
            nodes.getValue(b).core.onLinkUp(a)
        }
    }

    fun disconnect(a: String, b: String) {
        links.getValue(a).remove(b)
        links.getValue(b).remove(a)
        nodes.getValue(a).core.onLinkDown(b)
        nodes.getValue(b).core.onLinkDown(a)
    }

    /** Line topology a - b - c - ... */
    fun chain(vararg names: String) {
        for (i in 0 until names.size - 1) connect(names[i], names[i + 1])
    }

    fun deliverAll() {
        var guard = 0
        while (queue.isNotEmpty() && guard++ < 1_000_000) {
            val (from, to, frame) = queue.removeFirst()
            val target = nodes[to] ?: continue
            if (!target.alive) continue
            if (links[from]?.contains(to) != true) continue
            target.core.onFrame(from, frame)
        }
    }

    /** Advance virtual time in [stepMs] steps, ticking every node and delivering frames. */
    fun run(ms: Long, stepMs: Long = 50) {
        var t = 0L
        while (t < ms) {
            clock.now += stepMs
            t += stepMs
            deliverAll()
            for (n in nodes.values) if (n.alive) n.core.tick()
            deliverAll()
        }
    }

    operator fun get(name: String): Node = nodes.getValue(name)
}

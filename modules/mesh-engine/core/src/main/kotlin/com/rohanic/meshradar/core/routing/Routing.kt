package com.rohanic.meshradar.core.routing

import com.rohanic.meshradar.core.protocol.ByteKey
import com.rohanic.meshradar.core.protocol.Packet
import com.rohanic.meshradar.core.protocol.PacketType
import kotlin.random.Random

/** Fixed-size LRU of seen message IDs (PRD section 8: last 20,000 IDs). */
class DedupeCache(private val capacity: Int = DEFAULT_CAPACITY) {
    private val map = object : LinkedHashMap<ByteKey, Unit>(capacity, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<ByteKey, Unit>?): Boolean = size > capacity
    }

    /** Returns true if [id] was new (and records it). */
    @Synchronized
    fun add(id: ByteKey): Boolean {
        if (map.containsKey(id)) {
            map[id] = Unit // touch
            return false
        }
        map[id] = Unit
        return true
    }

    @Synchronized
    fun contains(id: ByteKey): Boolean = map.containsKey(id)

    @Synchronized
    fun size(): Int = map.size

    @Synchronized
    fun clear() = map.clear()

    companion object {
        const val DEFAULT_CAPACITY = 20_000
    }
}

/** Tunables (validated by the simulator; DEC-010). */
data class RoutingConfig(
    val crowdThreshold: Int = 8,
    val minProbability: Double = 0.5,
    val maxProbability: Double = 0.7,
    val minJitterMs: Long = 50,
    val maxJitterMs: Long = 300,
    val calmJitterMs: Long = 30,
)

sealed interface RouteDecision {
    data object Duplicate : RouteDecision
    data object Expired : RouteDecision
    /** Process locally; relay after [relayDelayMs] if non-null. */
    data class Accept(val relayDelayMs: Long?) : RouteDecision
}

/**
 * Managed flooding (PRD section 8). Every phone rebroadcasts packets it has not seen, up to the hop
 * limit, until they expire. With more than [RoutingConfig.crowdThreshold] neighbours, damped packet
 * types are rebroadcast with probability 0.5 to 0.7 after 50 to 300 ms of jitter, which stops
 * broadcast storms in dense crowds. Safety packets (SOS, Last-Crumb, lost child) are never damped.
 */
class Router(
    private val config: RoutingConfig = RoutingConfig(),
    private val random: Random = Random.Default,
    val seen: DedupeCache = DedupeCache(),
) {
    fun onReceive(packet: Packet, nowSec: Long, neighbours: Int, relayEnabled: Boolean): RouteDecision {
        if (!seen.add(packet.id)) return RouteDecision.Duplicate
        if (isExpired(packet, nowSec)) return RouteDecision.Expired
        return RouteDecision.Accept(relayDelay(packet, neighbours, relayEnabled))
    }

    /** Marks our own packet as seen so echoes are dropped. */
    fun onOriginate(packet: Packet) {
        seen.add(packet.id)
    }

    fun relayDelay(packet: Packet, neighbours: Int, relayEnabled: Boolean): Long? {
        if (!relayEnabled) return null
        val h = packet.header
        // hop counts relays so far; a packet may cross at most ttl links (DEC-002).
        if (h.hop + 1 >= h.ttl) return null
        val type = h.type
        if (neighbours > config.crowdThreshold && type.damped) {
            if (random.nextDouble() >= probability(neighbours)) return null
            return random.nextLong(config.minJitterMs, config.maxJitterMs + 1)
        }
        if (type.priority == 0) return 0
        return random.nextLong(0, config.calmJitterMs + 1)
    }

    /** Probability falls from 0.7 at the threshold to 0.5 at 3x the threshold. */
    fun probability(neighbours: Int): Double {
        if (neighbours <= config.crowdThreshold) return 1.0
        val span = (config.crowdThreshold * 2).toDouble()
        val t = ((neighbours - config.crowdThreshold) / span).coerceIn(0.0, 1.0)
        return config.maxProbability - t * (config.maxProbability - config.minProbability)
    }

    companion object {
        /** Allow two minutes of clock skew between phones. */
        const val SKEW_SEC = 120L

        fun isExpired(packet: Packet, nowSec: Long): Boolean {
            val h = packet.header
            if (h.created > nowSec + SKEW_SEC) return true
            return nowSec > h.expiresAt()
        }
    }
}

/** Store-and-forward entry. */
class StoredPacket(val packet: Packet, val receivedAt: Long, val own: Boolean = false) {
    val id: ByteKey get() = packet.id
    val type: PacketType get() = packet.header.type
    val expiresAt: Long get() = packet.header.expiresAt()
}

/**
 * Persistent store-and-forward queue (D4: messages wait up to 6 hours; SOS and Last-Crumb 24 hours).
 * Implementations: [MemoryPacketStore] for tests and the simulator, SQLite on Android.
 */
interface PacketStore {
    fun put(entry: StoredPacket)
    fun get(id: ByteKey): StoredPacket?
    fun contains(id: ByteKey): Boolean
    fun remove(id: ByteKey)
    /** Highest priority first, then newest first. */
    fun ordered(limit: Int): List<StoredPacket>
    fun pruneExpired(nowSec: Long): Int
    fun count(): Int
    fun clear()
}

class MemoryPacketStore(private val maxEntries: Int = 5_000) : PacketStore {
    private val map = LinkedHashMap<ByteKey, StoredPacket>()

    @Synchronized
    override fun put(entry: StoredPacket) {
        map[entry.id] = entry
        if (map.size > maxEntries) evict()
    }

    @Synchronized
    override fun get(id: ByteKey): StoredPacket? = map[id]

    @Synchronized
    override fun contains(id: ByteKey): Boolean = map.containsKey(id)

    @Synchronized
    override fun remove(id: ByteKey) {
        map.remove(id)
    }

    @Synchronized
    override fun ordered(limit: Int): List<StoredPacket> =
        map.values.sortedWith(ORDER).take(limit)

    @Synchronized
    override fun pruneExpired(nowSec: Long): Int {
        val dead = map.values.filter { nowSec > it.expiresAt }.map { it.id }
        dead.forEach { map.remove(it) }
        return dead.size
    }

    @Synchronized
    override fun count(): Int = map.size

    @Synchronized
    override fun clear() = map.clear()

    /** Drop the lowest-priority, oldest packet. SOS is evicted last. */
    private fun evict() {
        val victim = map.values.maxWithOrNull(ORDER) ?: return
        map.remove(victim.id)
    }

    companion object {
        val ORDER: Comparator<StoredPacket> =
            compareBy<StoredPacket> { it.type.priority }.thenByDescending { it.packet.header.created }
    }
}

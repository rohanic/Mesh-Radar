package com.rohanic.meshradar.core

import com.rohanic.meshradar.core.protocol.Header
import com.rohanic.meshradar.core.protocol.Packet
import com.rohanic.meshradar.core.protocol.PacketType
import com.rohanic.meshradar.core.routing.MemoryPacketStore
import com.rohanic.meshradar.core.routing.RouteDecision
import com.rohanic.meshradar.core.routing.Router
import com.rohanic.meshradar.core.routing.RoutingConfig
import com.rohanic.meshradar.core.routing.StoredPacket
import java.io.File
import java.util.PriorityQueue
import kotlin.math.hypot
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * Mesh simulator (PRD section 12, test plan item 1): 500 virtual phones moving through a crowd,
 * running the real [Router] (dedupe, hop limit, expiry, crowd damping) and store-and-forward on
 * link-up. It compares damping on and off with the same seed and traffic.
 *
 * Model (assumptions, to be replaced by week-8 field data):
 * - 500 phones in 400 x 400 m, random waypoint at 0.3 to 1.2 m/s.
 * - Radio range 60 m (bodies absorb 2.4 GHz); each phone keeps at most 6 Nearby connections to
 *   phones it discovered in range (in random order, as discovery is), re-evaluated every 5 s.
 *   Crowd density (for damping) counts every phone in range.
 * - Each frame takes 20 to 80 ms and is lost with probability 5 %. Priority-0 packets (SOS) are
 *   sent twice, 300 ms apart, as the engine does (DEC-011).
 * - 50 groups of 10. Positions every 60 s, about 30 chats a minute, 30 SOS during the run.
 */
class SimulatorTest {
    private data class Result(val chatRate: Double, val sosRate: Double, val transmissionsPerNodeMin: Double, val avgHops: Double, val chatPairs: Int, val sosPairs: Int)

    private class SimNode(val id: Int, val group: Int, var x: Double, var y: Double, config: RoutingConfig, seed: Long) {
        val router = Router(config, Random(seed))
        val store = MemoryPacketStore(maxEntries = 5_000)
        var tx = x
        var ty = y
        var speed = 0.0
        val links = HashSet<Int>()
        var density = 0
    }

    private sealed interface Event { val at: Long }
    private data class Arrival(override val at: Long, val to: Int, val packet: Packet) : Event
    private data class Relay(override val at: Long, val node: Int, val packet: Packet) : Event
    private data class Resend(override val at: Long, val node: Int, val packet: Packet) : Event

    private fun simulate(config: RoutingConfig, seed: Long): Result {
        val rnd = Random(seed)
        val n = 500
        val area = 400.0
        val range = 60.0
        val maxLinks = 6
        val durationMs = 5 * 60_000L
        val nodes = List(n) { i -> SimNode(i, i / 10, rnd.nextDouble() * area, rnd.nextDouble() * area, config, rnd.nextLong()) }
        val queue = PriorityQueue<Event>(compareBy { it.at })
        val baseSec = 1_760_000_000L
        var now = 0L
        var transmissions = 0L

        // Delivery bookkeeping: packetId -> (type, origin, created ms, targets, delivered target -> hops)
        class Track(val type: PacketType, val createdMs: Long, val targets: Set<Int>) {
            val deliveredAt = HashMap<Int, Long>()
            val hops = HashMap<Int, Int>()
        }
        val tracks = HashMap<String, Track>()
        val groupOf = HashMap<String, Int>()

        fun send(from: SimNode, packet: Packet) {
            for (to in from.links) {
                transmissions++
                if (rnd.nextDouble() < 0.05) continue
                queue.add(Arrival(now + rnd.nextLong(20, 81), to, packet))
            }
        }

        fun reachable(origin: Int, maxHops: Int): Set<Int> {
            val seen = hashSetOf(origin)
            var frontier = listOf(origin)
            repeat(maxHops) {
                val next = mutableListOf<Int>()
                for (u in frontier) for (v in nodes[u].links) if (seen.add(v)) next.add(v)
                frontier = next
            }
            return seen - origin
        }

        fun originate(node: SimNode, type: PacketType) {
            val id = ByteArray(16).also { rnd.nextBytes(it) }
            val packet = Packet(Header(1, type, id, ByteArray(8), 0, type.maxTtl, baseSec + now / 1000), ByteArray(0))
            node.router.onOriginate(packet)
            node.store.put(StoredPacket(packet, baseSec + now / 1000, own = true))
            val key = packet.id.hex()
            groupOf[key] = node.group
            if (type != PacketType.POSITION) {
                val members = nodes.filter { it.group == node.group && it.id != node.id }.map { it.id }.toSet()
                tracks[key] = Track(type, now, members intersect reachable(node.id, type.maxTtl))
            }
            send(node, packet)
            if (type.priority == 0) queue.add(Resend(now + 300, node.id, packet))
        }

        fun relinkAll() {
            val old = nodes.map { it.links.toSet() }
            nodes.forEach { it.links.clear() }
            // Grid for neighbour search.
            val cell = range
            val grid = HashMap<Pair<Int, Int>, MutableList<SimNode>>()
            nodes.forEach { grid.getOrPut((it.x / cell).toInt() to (it.y / cell).toInt()) { mutableListOf() }.add(it) }
            for (u in nodes) {
                val cx = (u.x / cell).toInt()
                val cy = (u.y / cell).toInt()
                val near = mutableListOf<Pair<Double, SimNode>>()
                for (dx in -1..1) for (dy in -1..1) {
                    grid[(cx + dx) to (cy + dy)]?.forEach { v ->
                        if (v.id != u.id) {
                            val d = hypot(u.x - v.x, u.y - v.y)
                            if (d <= range) near.add(d to v)
                        }
                    }
                }
                u.density = near.size
                near.shuffle(rnd)
                for ((_, v) in near) {
                    if (u.links.size >= maxLinks) break
                    if (v.links.size >= maxLinks) continue
                    u.links.add(v.id)
                    v.links.add(u.id)
                }
            }
            // Store-and-forward on every new link (summary exchange).
            for (u in nodes) for (v in u.links) {
                if (v in old[u.id]) continue
                val other = nodes[v]
                var sent = 0
                for (sp in u.store.ordered(2_000)) {
                    if (sent >= 500) break
                    if (other.store.contains(sp.id)) continue
                    val h = sp.packet.header
                    val out = if (sp.own) sp.packet else {
                        if (h.hop + 1 >= h.ttl) continue
                        Packet(h.withHop(h.hop + 1), sp.packet.payload)
                    }
                    transmissions++
                    queue.add(Arrival(now + rnd.nextLong(20, 81), v, out))
                    sent++
                }
            }
        }

        fun move(dtSec: Double) {
            for (u in nodes) {
                val d = hypot(u.tx - u.x, u.ty - u.y)
                if (d < 1 || u.speed == 0.0) {
                    u.tx = rnd.nextDouble() * area
                    u.ty = rnd.nextDouble() * area
                    u.speed = 0.3 + rnd.nextDouble() * 0.9
                    continue
                }
                val step = minOf(d, u.speed * dtSec)
                u.x += (u.tx - u.x) / d * step
                u.y += (u.ty - u.y) / d * step
            }
        }

        relinkAll()
        val positionPhase = List(n) { rnd.nextLong(0, 60_000) }
        val sosTimes = List(30) { rnd.nextLong(10_000, durationMs - 60_000) }.sorted().toMutableList()
        var nextChat = 0L
        var nextRelink = 5_000L
        var nextPositionCheck = 0L
        while (now < durationMs) {
            val next = queue.peek()
            val stepTo = minOf(next?.at ?: Long.MAX_VALUE, nextRelink, nextChat, nextPositionCheck, sosTimes.firstOrNull() ?: Long.MAX_VALUE)
            if (stepTo > durationMs) break
            now = stepTo
            if (now == nextRelink) {
                move(5.0)
                relinkAll()
                nextRelink += 5_000
                continue
            }
            if (now == nextPositionCheck) {
                for (u in nodes) if ((now - positionPhase[u.id]) % 60_000 in 0 until 1_000) originate(u, PacketType.POSITION)
                nextPositionCheck += 1_000
                continue
            }
            if (now == nextChat) {
                originate(nodes[rnd.nextInt(n)], PacketType.CHAT)
                nextChat += rnd.nextLong(1_000, 3_000)
                continue
            }
            if (sosTimes.isNotEmpty() && now == sosTimes.first()) {
                sosTimes.removeAt(0)
                originate(nodes[rnd.nextInt(n)], PacketType.SOS)
                continue
            }
            when (val ev = queue.poll()) {
                is Arrival -> {
                    val u = nodes[ev.to]
                    val d = u.router.onReceive(ev.packet, baseSec + now / 1000, u.density, true)
                    if (d is RouteDecision.Accept) {
                        u.store.put(StoredPacket(ev.packet, baseSec + now / 1000))
                        val key = ev.packet.id.hex()
                        tracks[key]?.let { t ->
                            if (u.id in t.targets && !t.deliveredAt.containsKey(u.id)) {
                                t.deliveredAt[u.id] = now
                                t.hops[u.id] = ev.packet.header.hop + 1
                            }
                        }
                        d.relayDelayMs?.let { queue.add(Relay(now + it, u.id, ev.packet)) }
                    }
                }
                is Relay -> {
                    val h = ev.packet.header
                    val out = Packet(h.withHop(h.hop + 1), ev.packet.payload)
                    send(nodes[ev.node], out)
                    if (h.type.priority == 0) queue.add(Resend(now + 300, ev.node, out))
                }
                is Resend -> send(nodes[ev.node], ev.packet)
                null -> {}
            }
        }

        fun rate(type: PacketType, withinMs: Long): Pair<Double, Int> {
            var pairs = 0
            var ok = 0
            for (t in tracks.values) {
                if (t.type != type || t.createdMs > durationMs - withinMs) continue
                pairs += t.targets.size
                ok += t.deliveredAt.values.count { it - t.createdMs <= withinMs }
            }
            return (if (pairs == 0) 1.0 else ok.toDouble() / pairs) to pairs
        }
        val (chat, chatPairs) = rate(PacketType.CHAT, 60_000)
        val (sos, sosPairs) = rate(PacketType.SOS, 30_000)
        val hops = tracks.values.flatMap { it.hops.values }
        return Result(chat, sos, transmissions.toDouble() / n / (durationMs / 60_000.0), hops.average(), chatPairs, sosPairs)
    }

    @Test
    fun `500 phones in a crowd deliver chat and SOS, and damping cuts radio load`() {
        val damped = simulate(RoutingConfig(), seed = 42)
        val flooded = simulate(RoutingConfig(crowdThreshold = Int.MAX_VALUE), seed = 42)
        val report = buildString {
            appendLine("Mesh simulator: 500 phones, 400 x 400 m, 60 m range, max 6 links, 5 % frame loss, 5 minutes")
            for ((name, r) in listOf("damped (default)" to damped, "plain flooding" to flooded)) {
                appendLine(
                    "%-18s chat <=60 s: %.1f %% of %d pairs | SOS <=30 s: %.1f %% of %d pairs | %.0f transmissions per phone per minute | avg hops %.2f"
                        .format(name, r.chatRate * 100, r.chatPairs, r.sosRate * 100, r.sosPairs, r.transmissionsPerNodeMin, r.avgHops),
                )
            }
        }
        println(report)
        File("build/simulator-report.txt").apply { parentFile.mkdirs() }.writeText(report)
        // Targets from section 12: over 90 % mesh delivery within 60 s; over 98 % SOS within 30 s when a path exists.
        assertTrue(damped.chatRate > 0.90, report)
        assertTrue(damped.sosRate > 0.98, report)
        assertTrue(damped.transmissionsPerNodeMin < flooded.transmissionsPerNodeMin * 0.85, report)
    }
}

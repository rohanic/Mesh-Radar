package com.rohanic.meshradar.core

import com.rohanic.meshradar.core.protocol.Envelope
import com.rohanic.meshradar.core.protocol.Header
import com.rohanic.meshradar.core.protocol.Packet
import com.rohanic.meshradar.core.protocol.PacketType
import com.rohanic.meshradar.core.protocol.key
import com.rohanic.meshradar.core.routing.DedupeCache
import com.rohanic.meshradar.core.routing.MemoryPacketStore
import com.rohanic.meshradar.core.routing.RouteDecision
import com.rohanic.meshradar.core.routing.Router
import com.rohanic.meshradar.core.routing.StoredPacket
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CryptoRoutingTest {
    private val crypto = Sodium.crypto
    private val envelope = Envelope(crypto)

    @Test
    fun `aead seals and opens, and fails on wrong key or tampering`() {
        val key = crypto.newGroupKey()
        val nonce = ByteArray(24) { 1 }
        val sealed = crypto.seal(key, nonce, "hello".toByteArray(), byteArrayOf(7))
        assertContentEquals("hello".toByteArray(), crypto.open(key, nonce, sealed, byteArrayOf(7)))
        assertNull(crypto.open(crypto.newGroupKey(), nonce, sealed, byteArrayOf(7)))
        assertNull(crypto.open(key, nonce, sealed, byteArrayOf(8)))
        val tampered = sealed.copyOf().also { it[0] = (it[0] + 1).toByte() }
        assertNull(crypto.open(key, nonce, tampered, byteArrayOf(7)))
    }

    @Test
    fun `identity is deterministic from the seed and signatures verify`() {
        val seed = ByteArray(32) { 3 }
        val a = crypto.identityFromSeed(seed)
        val b = crypto.identityFromSeed(seed)
        assertContentEquals(a.signPublic, b.signPublic)
        assertContentEquals(a.boxPublic, b.boxPublic)
        val sig = crypto.sign("msg".toByteArray(), a.signSecret)
        assertTrue(crypto.verify(sig, "msg".toByteArray(), a.signPublic))
        assertFalse(crypto.verify(sig, "msh".toByteArray(), a.signPublic))
    }

    @Test
    fun `pair keys agree on both sides`() {
        val a = crypto.newIdentity()
        val b = crypto.newIdentity()
        val ab = crypto.pairKey(a.boxSecret, a.boxPublic, b.boxPublic)
        val ba = crypto.pairKey(b.boxSecret, b.boxPublic, a.boxPublic)
        assertNotNull(ab)
        assertContentEquals(ab, ba)
    }

    @Test
    fun `relays see only the header, and a hop change does not break the seal`() {
        val key = crypto.newGroupKey()
        val id = crypto.newIdentity()
        val header = envelope.header(PacketType.CHAT, key, 1_760_000_000)
        val body = "secret plan at Gate 7".toByteArray()
        val packet = envelope.sealGroup(header, key, ByteArray(8) { 1 }, ByteArray(8), body, id.signSecret)
        assertFalse(String(packet.encode(), Charsets.ISO_8859_1).contains("Gate 7"))
        val relayed = Packet(packet.header.withHop(3), packet.payload)
        val inner = envelope.openGroup(Packet.decode(relayed.encode()), key)
        assertNotNull(inner)
        assertContentEquals(body, inner.body)
        assertTrue(crypto.verify(inner.signature, inner.signedBytes, id.signPublic))
        assertNull(envelope.openGroup(relayed, crypto.newGroupKey()))
    }

    @Test
    fun `a body cannot be moved under another header`() {
        val key = crypto.newGroupKey()
        val id = crypto.newIdentity()
        val p = envelope.sealGroup(envelope.header(PacketType.CHAT, key, 100), key, ByteArray(8), ByteArray(8), byteArrayOf(1), id.signSecret)
        val h = p.header
        val forged = Packet(Header(h.version, PacketType.SOS, h.msgId, h.tag, 0, h.ttl, h.created), p.payload)
        assertNull(envelope.openGroup(forged, key))
    }

    @Test
    fun `dedupe cache keeps the last 20,000 ids`() {
        val cache = DedupeCache()
        repeat(20_001) { i -> assertTrue(cache.add(ByteArray(16).also { b -> b[0] = (i shr 16).toByte(); b[1] = (i shr 8).toByte(); b[2] = i.toByte() }.key())) }
        assertEquals(20_000, cache.size())
        assertFalse(cache.add(ByteArray(16).also { b -> b[2] = 5 }.key()))
        // The very first id was evicted, so it counts as new again.
        assertTrue(cache.add(ByteArray(16).key()))
    }

    private fun packet(type: PacketType, hop: Int, created: Long = 1_000, ttl: Int = type.maxTtl) =
        Packet(Header(1, type, ByteArray(16).also { Random.nextBytes(it) }, ByteArray(8), hop, ttl, created), ByteArray(4))

    @Test
    fun `router drops duplicates and expired packets and honours the hop limit`() {
        val router = Router(random = Random(1))
        val p = packet(PacketType.CHAT, 0)
        assertIs<RouteDecision.Accept>(router.onReceive(p, 1_000, 2, true))
        assertEquals(RouteDecision.Duplicate, router.onReceive(p, 1_000, 2, true))
        assertEquals(RouteDecision.Expired, router.onReceive(packet(PacketType.CHAT, 0, created = 1_000), 1_000 + 6 * 3600 + 1, 2, true))
        // Chat lives 6 h, SOS 24 h (D4, section 8).
        assertIs<RouteDecision.Accept>(router.onReceive(packet(PacketType.SOS, 0, created = 1_000), 1_000 + 23 * 3600, 2, true))
        // hop 5 of 7 relays (reaches 7 links); hop 6 does not.
        assertNotNull((router.onReceive(packet(PacketType.CHAT, 5), 1_000, 2, true) as RouteDecision.Accept).relayDelayMs)
        assertNull((router.onReceive(packet(PacketType.CHAT, 6), 1_000, 2, true) as RouteDecision.Accept).relayDelayMs)
        // Relay off (Ultra-saver) still accepts locally but never forwards.
        assertNull((router.onReceive(packet(PacketType.CHAT, 0), 1_000, 2, false) as RouteDecision.Accept).relayDelayMs)
        // Packets from the future beyond clock skew are dropped.
        assertEquals(RouteDecision.Expired, router.onReceive(packet(PacketType.CHAT, 0, created = 2_000), 1_000, 2, true))
    }

    @Test
    fun `join packets never leave radio range`() {
        val router = Router(random = Random(1))
        val d = router.onReceive(packet(PacketType.JOIN_REQUEST, 0), 1_000, 2, true) as RouteDecision.Accept
        assertNull(d.relayDelayMs)
    }

    @Test
    fun `crowd damping applies probability 0_5 to 0_7 and 50 to 300 ms jitter, never to SOS`() {
        val router = Router(random = Random(7))
        assertEquals(1.0, router.probability(8))
        assertEquals(0.7, router.probability(9), 0.02)
        assertEquals(0.5, router.probability(40), 1e-9)
        var relayed = 0
        val n = 4_000
        repeat(n) {
            val delay = router.relayDelay(packet(PacketType.CHAT, 0), 12, true)
            if (delay != null) {
                relayed++
                assertTrue(delay in 50..300)
            }
        }
        val rate = relayed.toDouble() / n
        assertTrue(rate in 0.5..0.7, "rate $rate")
        repeat(500) { assertNotNull(router.relayDelay(packet(PacketType.SOS, 0), 50, true)) }
        repeat(500) { assertNotNull(router.relayDelay(packet(PacketType.CRUMB, 0), 50, true)) }
    }

    @Test
    fun `store evicts low priority first and orders SOS first`() {
        val store = MemoryPacketStore(maxEntries = 3)
        val sos = StoredPacket(packet(PacketType.SOS, 0, created = 10), 10)
        val chat = StoredPacket(packet(PacketType.CHAT, 0, created = 20), 20)
        val thumb = StoredPacket(packet(PacketType.THUMBNAIL, 0, created = 30), 30)
        val pos = StoredPacket(packet(PacketType.POSITION, 0, created = 40), 40)
        listOf(thumb, chat, sos, pos).forEach { store.put(it) }
        assertEquals(3, store.count())
        assertFalse(store.contains(thumb.id))
        assertEquals(PacketType.SOS, store.ordered(10).first().type)
        assertEquals(1, store.pruneExpired(40 + 601))
    }
}

package com.rohanic.meshradar.core

import com.rohanic.meshradar.core.crypto.Tags
import com.rohanic.meshradar.core.protocol.ByteReader
import com.rohanic.meshradar.core.protocol.ByteWriter
import com.rohanic.meshradar.core.protocol.ChatBody
import com.rohanic.meshradar.core.protocol.ChatKind
import com.rohanic.meshradar.core.protocol.CheckinBody
import com.rohanic.meshradar.core.protocol.CheckinKind
import com.rohanic.meshradar.core.protocol.Checkpoint
import com.rohanic.meshradar.core.protocol.CrowdAlertBody
import com.rohanic.meshradar.core.protocol.CrowdKind
import com.rohanic.meshradar.core.protocol.CrumbBody
import com.rohanic.meshradar.core.protocol.CrumbReason
import com.rohanic.meshradar.core.protocol.EmergencyCard
import com.rohanic.meshradar.core.protocol.Envelope
import com.rohanic.meshradar.core.protocol.Frame
import com.rohanic.meshradar.core.protocol.GroupInvite
import com.rohanic.meshradar.core.protocol.Header
import com.rohanic.meshradar.core.protocol.MalformedPacketException
import com.rohanic.meshradar.core.protocol.MemberBody
import com.rohanic.meshradar.core.protocol.Packet
import com.rohanic.meshradar.core.protocol.PacketType
import com.rohanic.meshradar.core.protocol.PinBody
import com.rohanic.meshradar.core.protocol.Position
import com.rohanic.meshradar.core.protocol.PositionBody
import com.rohanic.meshradar.core.protocol.ReceiptBody
import com.rohanic.meshradar.core.protocol.ReceiptKind
import com.rohanic.meshradar.core.protocol.SosBody
import com.rohanic.meshradar.core.protocol.SosKind
import com.rohanic.meshradar.core.protocol.decodeBody
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class ProtocolTest {
    private val crypto = Sodium.crypto
    private val envelope = Envelope(crypto)
    private val pos = Position(21.4225, 39.8262, altM = 277, pressurePa = 98_000, accuracyM = 4.5, heading = 271.25, battery = 64, flags = 1, fixTime = 1_760_000_000)

    @Test
    fun `header is exactly 32 bytes and round trips`() {
        val h = Header(1, PacketType.CHAT, ByteArray(16) { it.toByte() }, ByteArray(8) { 9 }, 3, 7, 1_760_000_123)
        val bytes = h.encode()
        assertEquals(32, bytes.size)
        val back = Header.decode(ByteReader(bytes))
        assertEquals(PacketType.CHAT, back.type)
        assertEquals(3, back.hop)
        assertEquals(7, back.ttl)
        assertEquals(1_760_000_123, back.created)
        assertContentEquals(h.msgId, back.msgId)
        assertContentEquals(h.tag, back.tag)
    }

    @Test
    fun `header rejects bad versions, hop counts and unknown types`() {
        val good = Header(1, PacketType.CHAT, ByteArray(16), ByteArray(8), 0, 7, 1).encode()
        val badVersion = good.copyOf().also { it[0] = 2 }
        val badHop = good.copyOf().also { it[26] = 7 }
        val badTtl = good.copyOf().also { it[27] = 9 }
        val badType = good.copyOf().also { it[1] = 99 }
        listOf(badVersion, badHop, badTtl, badType).forEach {
            assertFailsWith<MalformedPacketException> { Header.decode(ByteReader(it)) }
        }
        assertFailsWith<MalformedPacketException> { Packet.decode(ByteArray(10)) }
    }

    @Test
    fun `position body is 24 bytes and keeps 1e-7 degree precision`() {
        val bytes = PositionBody(pos).encode()
        assertEquals(Position.SIZE, bytes.size)
        val back = (decodeBody(PacketType.POSITION, bytes) as PositionBody).position
        assertEquals(pos.lat, back.lat, 1e-7)
        assertEquals(pos.lon, back.lon, 1e-7)
        assertEquals(277, back.altM)
        assertEquals(98_000, back.pressurePa)
        assertEquals(4.5, back.accuracyM, 0.05)
        assertEquals(271.25, back.heading!!, 0.01)
        assertEquals(64, back.battery)
        assertEquals(1, back.flags)
    }

    @Test
    fun `a sealed position packet fits one BLE extended advertisement`() {
        val key = crypto.newGroupKey()
        val id = crypto.newIdentity()
        val header = envelope.header(PacketType.POSITION, key, 1_760_000_000)
        val packet = envelope.sealGroup(header, key, ByteArray(8), ByteArray(8), PositionBody(pos).encode(), id.signSecret)
        // 32 header + 8 sender + 8 recipient + 24 body + 64 signature + 16 tag = 152 bytes.
        assertEquals(152, packet.size())
        // Android LE extended advertising carries up to 251 bytes of data in one advertisement (DEC-008).
        assertTrue(packet.size() + 18 <= 251)
    }

    @Test
    fun `unknown position fields round trip as null`() {
        val p = Position(1.0, 2.0, fixTime = 5)
        val back = (decodeBody(PacketType.POSITION, PositionBody(p).encode()) as PositionBody).position
        assertEquals(null, back.altM)
        assertEquals(null, back.pressurePa)
        assertEquals(null, back.heading)
        assertEquals(null, back.battery)
    }

    @Test
    fun `every body type round trips`() {
        val bodies = listOf(
            ChatBody(ChatKind.QUICK, "Wait for me", 2, 21.0, 39.0, ByteArray(16) { 1 }),
            SosBody(ByteArray(16) { 2 }, SosKind.MEDICAL, true, 4, pos, EmergencyCard("Ammi", "B+", "Diabetes", "Insulin", "Abdul", "+92 300 0000000", "Tent 42")),
            CrumbBody(CrumbReason.BATTERY_5, pos),
            CheckinBody(CheckinKind.PLAN_SET, deadline = 1_760_003_600, checkpoints = listOf(Checkpoint("Camp 1", 35.4, 74.6, 80))),
            MemberBody(ByteArray(32) { 3 }, ByteArray(32) { 4 }, "Karim", 2, 7, ByteArray(4000) { 5 }, 1, 1_760_000_000),
            PinBody(ByteArray(16) { 6 }, false, "Gate 7", 21.42, 39.82, -1, 3, 1_760_000_000),
            ReceiptBody(ReceiptKind.READ, listOf(ByteArray(16) { 7 }, ByteArray(16) { 8 })),
            CrowdAlertBody(ByteArray(16) { 9 }, "durga-puja", CrowdKind.CRUSH_RISK, "Gate 4", 22.6, 88.36),
        )
        for (b in bodies) {
            val back = decodeBody(b.type, b.encode())
            assertEquals(b.type, back.type)
            assertContentEquals(b.encode(), back.encode())
        }
    }

    @Test
    fun `bodies with trailing bytes are rejected`() {
        val bytes = PositionBody(pos).encode() + byteArrayOf(0)
        assertFailsWith<MalformedPacketException> { decodeBody(PacketType.POSITION, bytes) }
    }

    @Test
    fun `avatar photos over 4 KB are refused`() {
        assertFailsWith<IllegalArgumentException> {
            MemberBody(ByteArray(32), ByteArray(32), "x", 0, 0, ByteArray(4097), 1, 0).encode()
        }
    }

    @Test
    fun `utf8 truncation never splits a character`() {
        val urdu = "انتظار کرو".repeat(100)
        val cut = ByteWriter.utf8Truncate(urdu, 101)
        assertTrue(cut.size <= 101)
        val decoded = String(cut, Charsets.UTF_8)
        assertTrue(urdu.startsWith(decoded))
    }

    @Test
    fun `invites round trip`() {
        val inv = GroupInvite(ByteArray(16) { 1 }, "Hajj family", ByteArray(32) { 2 }, ByteArray(32) { 3 }, 100, 200, "hajj", 25)
        val back = GroupInvite.decode(inv.encode())
        assertEquals("Hajj family", back.name)
        assertEquals(25, back.maxMembers)
        assertContentEquals(inv.key, back.key)
    }

    @Test
    fun `frames round trip`() {
        val packet = Packet(Header(1, PacketType.CHAT, ByteArray(16) { 1 }, ByteArray(8), 0, 7, 9), byteArrayOf(1, 2, 3))
        val f = Frame.decode(Frame.PacketFrame(packet).encode()) as Frame.PacketFrame
        assertContentEquals(packet.encode(), f.packet.encode())
        val s = Frame.decode(Frame.Summary(listOf(ByteArray(16) { 4 })).encode()) as Frame.Summary
        assertContentEquals(ByteArray(8) { 4 }, s.prefixes.single())
        val a = Frame.decode(Frame.Ack(listOf(ByteArray(8) { 5 })).encode()) as Frame.Ack
        assertEquals(1, a.prefixes.size)
        assertFailsWith<MalformedPacketException> { Frame.decode(byteArrayOf(42)) }
    }

    @Test
    fun `group tag rotates every 15 minutes and differs between groups`() {
        val k1 = crypto.newGroupKey()
        val k2 = crypto.newGroupKey()
        val t0 = 1_760_000_400L - (1_760_000_400L % Tags.WINDOW_SEC)
        assertContentEquals(Tags.tag(k1, t0), Tags.tag(k1, t0 + 899))
        assertTrue(!Tags.tag(k1, t0).contentEquals(Tags.tag(k1, t0 + 900)))
        assertTrue(!Tags.tag(k1, t0).contentEquals(Tags.tag(k2, t0)))
        assertNotNull(Tags.tag(k1, t0))
    }
}

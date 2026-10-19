package com.rohanic.meshradar.core.protocol

/**
 * Wire header, exactly 32 bytes (PRD section 8):
 *
 * | offset | size | field |
 * | 0  | 1  | version |
 * | 1  | 1  | type |
 * | 2  | 16 | message ID (random) |
 * | 18 | 8  | rotating group tag |
 * | 26 | 1  | hop count (relays increment it) |
 * | 27 | 1  | TTL (hop limit) |
 * | 28 | 4  | created time, unix seconds (unsigned) |
 *
 * Relays see only this header. The hop count is the one field a relay changes, so it is left out of
 * the authenticated data ([authenticatedHeader]).
 */
class Header(
    val version: Int,
    val type: PacketType,
    val msgId: ByteArray,
    val tag: ByteArray,
    val hop: Int,
    val ttl: Int,
    val created: Long,
) {
    init {
        require(msgId.size == MSG_ID_BYTES) { "msgId must be $MSG_ID_BYTES bytes" }
        require(tag.size == TAG_BYTES) { "tag must be $TAG_BYTES bytes" }
        require(hop in 0..255 && ttl in 0..255) { "hop/ttl out of range" }
    }

    fun encode(): ByteArray = ByteWriter(SIZE)
        .u8(version)
        .u8(type.code)
        .bytes(msgId)
        .bytes(tag)
        .u8(hop)
        .u8(ttl)
        .u32(created)
        .toByteArray()

    /** Header bytes with the hop count zeroed: signed and used as AEAD associated data. */
    fun authenticatedHeader(): ByteArray = withHop(0).encode()

    fun withHop(newHop: Int) = Header(version, type, msgId, tag, newHop, ttl, created)

    /** 24-byte XChaCha20 nonce derived from the header, so packets carry no separate nonce (DEC-005). */
    fun nonce(): ByteArray = ByteWriter(24)
        .bytes(msgId)
        .u32(created)
        .u8(version)
        .u8(type.code)
        .u8(ttl)
        .u8(0)
        .toByteArray()

    fun expiresAt(): Long = created + type.lifetimeSec

    companion object {
        const val SIZE = 32
        const val VERSION = 1
        const val MSG_ID_BYTES = 16
        const val TAG_BYTES = 8

        fun decode(r: ByteReader): Header {
            val version = r.u8()
            if (version != VERSION) throw MalformedPacketException("unsupported version $version")
            val type = PacketType.of(r.u8())
            val msgId = r.bytes(MSG_ID_BYTES)
            val tag = r.bytes(TAG_BYTES)
            val hop = r.u8()
            val ttl = r.u8()
            val created = r.u32()
            if (ttl < 1 || ttl > MAX_HOPS || hop >= ttl) throw MalformedPacketException("bad hop $hop/$ttl")
            return Header(version, type, msgId, tag, hop, ttl, created)
        }
    }
}

/** A packet as carried by transports: header plus opaque (encrypted) payload. */
class Packet(val header: Header, val payload: ByteArray) {
    fun encode(): ByteArray = header.encode() + payload

    val id: ByteKey get() = header.msgId.key()

    fun size(): Int = Header.SIZE + payload.size

    companion object {
        /** Largest packet we accept (a thumbnail of 8 KB plus overhead fits; Nearby BYTES max is 32 KB). */
        const val MAX_SIZE = 24 * 1024

        fun decode(bytes: ByteArray): Packet {
            if (bytes.size < Header.SIZE) throw MalformedPacketException("short packet")
            if (bytes.size > MAX_SIZE) throw MalformedPacketException("oversize packet")
            val r = ByteReader(bytes)
            val header = Header.decode(r)
            return Packet(header, r.rest())
        }
    }
}

package com.rohanic.meshradar.core.protocol

/**
 * Link frames exchanged between two directly connected phones (Nearby Connections BYTES payloads).
 *
 * PACKET  carries one mesh packet.
 * SUMMARY lists 8-byte ID prefixes of packets the sender already holds, sent when a link opens,
 *         so each side forwards only what the other is missing (store-and-forward, D4).
 * ACK     confirms packets received over this link; the originator marks them "In the mesh" (D3).
 * PHOTO_REQUEST asks a direct neighbour for a full photo (D6); the photo itself goes as a FILE payload.
 * PHOTO_META    names the FILE payload that follows.
 */
sealed interface Frame {
    fun encode(): ByteArray

    class PacketFrame(val packet: Packet) : Frame {
        override fun encode(): ByteArray = byteArrayOf(T_PACKET) + packet.encode()
    }

    class Summary(val prefixes: List<ByteArray>) : Frame {
        override fun encode(): ByteArray {
            val ids = prefixes.take(MAX_SUMMARY)
            val w = ByteWriter(3 + ids.size * PREFIX).u8(T_SUMMARY.toInt()).u16(ids.size)
            ids.forEach { w.fixed(it.copyOf(PREFIX), PREFIX) }
            return w.toByteArray()
        }
    }

    class Ack(val prefixes: List<ByteArray>) : Frame {
        override fun encode(): ByteArray {
            val ids = prefixes.take(MAX_ACK)
            val w = ByteWriter(3 + ids.size * PREFIX).u8(T_ACK.toInt()).u16(ids.size)
            ids.forEach { w.fixed(it.copyOf(PREFIX), PREFIX) }
            return w.toByteArray()
        }
    }

    class PhotoRequest(val photoId: ByteArray) : Frame {
        override fun encode(): ByteArray = ByteWriter(17).u8(T_PHOTO_REQUEST.toInt()).fixed(photoId, 16).toByteArray()
    }

    class PhotoMeta(val photoId: ByteArray, val payloadId: Long, val size: Long) : Frame {
        override fun encode(): ByteArray =
            ByteWriter(33).u8(T_PHOTO_META.toInt()).fixed(photoId, 16).i64(payloadId).i64(size).toByteArray()
    }

    companion object {
        const val T_PACKET: Byte = 1
        const val T_SUMMARY: Byte = 2
        const val T_ACK: Byte = 3
        const val T_PHOTO_REQUEST: Byte = 4
        const val T_PHOTO_META: Byte = 5
        const val PREFIX = 8
        /** 2,000 prefixes is 16 KB, inside the 32 KB Nearby BYTES limit. */
        const val MAX_SUMMARY = 2_000
        const val MAX_ACK = 256

        fun decode(bytes: ByteArray): Frame {
            if (bytes.isEmpty()) throw MalformedPacketException("empty frame")
            val r = ByteReader(bytes, 1)
            return when (bytes[0]) {
                T_PACKET -> PacketFrame(Packet.decode(bytes.copyOfRange(1, bytes.size)))
                T_SUMMARY -> {
                    val n = r.u16()
                    if (n > MAX_SUMMARY) throw MalformedPacketException("summary too long")
                    Summary(List(n) { r.bytes(PREFIX) })
                }
                T_ACK -> {
                    val n = r.u16()
                    if (n > MAX_ACK) throw MalformedPacketException("ack too long")
                    Ack(List(n) { r.bytes(PREFIX) })
                }
                T_PHOTO_REQUEST -> PhotoRequest(r.bytes(16))
                T_PHOTO_META -> PhotoMeta(r.bytes(16), r.i64(), r.i64())
                else -> throw MalformedPacketException("unknown frame ${bytes[0]}")
            }
        }
    }
}

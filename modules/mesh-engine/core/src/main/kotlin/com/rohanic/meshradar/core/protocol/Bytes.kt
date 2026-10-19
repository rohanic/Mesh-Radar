package com.rohanic.meshradar.core.protocol

import java.io.ByteArrayOutputStream

/** Thrown when bytes from the air do not parse. Callers drop the packet. */
class MalformedPacketException(message: String) : Exception(message)

/** Big-endian writer for packet bodies. */
class ByteWriter(initial: Int = 64) {
    private val out = ByteArrayOutputStream(initial)

    fun u8(v: Int) = apply { out.write(v and 0xFF) }

    fun u16(v: Int) = apply {
        out.write((v ushr 8) and 0xFF)
        out.write(v and 0xFF)
    }

    fun i16(v: Int) = u16(v.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()) and 0xFFFF)

    fun i32(v: Int) = apply {
        out.write((v ushr 24) and 0xFF)
        out.write((v ushr 16) and 0xFF)
        out.write((v ushr 8) and 0xFF)
        out.write(v and 0xFF)
    }

    fun u32(v: Long) = i32((v and 0xFFFFFFFFL).toInt())

    fun i64(v: Long) = apply {
        i32((v ushr 32).toInt())
        i32(v.toInt())
    }

    fun bytes(b: ByteArray) = apply { out.write(b) }

    /** Fixed-size field; shorter input is zero padded, longer input is an error. */
    fun fixed(b: ByteArray, size: Int) = apply {
        require(b.size <= size) { "field too long: ${b.size} > $size" }
        out.write(b)
        repeat(size - b.size) { out.write(0) }
    }

    /** Length-prefixed (u16) blob. */
    fun blob(b: ByteArray) = apply {
        require(b.size <= 0xFFFF) { "blob too long" }
        u16(b.size)
        out.write(b)
    }

    /** Length-prefixed UTF-8 string, truncated on a character boundary to [maxBytes]. */
    fun str(s: String, maxBytes: Int = 2000) = blob(utf8Truncate(s, maxBytes))

    fun size(): Int = out.size()

    fun toByteArray(): ByteArray = out.toByteArray()

    companion object {
        fun utf8Truncate(s: String, maxBytes: Int): ByteArray {
            val full = s.toByteArray(Charsets.UTF_8)
            if (full.size <= maxBytes) return full
            var end = maxBytes
            // Step back past UTF-8 continuation bytes (10xxxxxx) so we never cut a character.
            while (end > 0 && (full[end].toInt() and 0xC0) == 0x80) end--
            return full.copyOf(end)
        }
    }
}

/** Big-endian reader; every read is bounds checked. */
class ByteReader(private val data: ByteArray, private var pos: Int = 0, private val end: Int = data.size) {
    fun remaining(): Int = end - pos

    private fun need(n: Int) {
        if (n < 0 || pos + n > end) throw MalformedPacketException("truncated: need $n at $pos of $end")
    }

    fun u8(): Int {
        need(1)
        return data[pos++].toInt() and 0xFF
    }

    fun u16(): Int {
        need(2)
        val v = ((data[pos].toInt() and 0xFF) shl 8) or (data[pos + 1].toInt() and 0xFF)
        pos += 2
        return v
    }

    fun i16(): Int = u16().toShort().toInt()

    fun i32(): Int {
        need(4)
        val v = ((data[pos].toInt() and 0xFF) shl 24) or
            ((data[pos + 1].toInt() and 0xFF) shl 16) or
            ((data[pos + 2].toInt() and 0xFF) shl 8) or
            (data[pos + 3].toInt() and 0xFF)
        pos += 4
        return v
    }

    fun u32(): Long = i32().toLong() and 0xFFFFFFFFL

    fun i64(): Long = (i32().toLong() shl 32) or (i32().toLong() and 0xFFFFFFFFL)

    fun bytes(n: Int): ByteArray {
        need(n)
        val b = data.copyOfRange(pos, pos + n)
        pos += n
        return b
    }

    fun blob(max: Int = 0xFFFF): ByteArray {
        val n = u16()
        if (n > max) throw MalformedPacketException("blob $n over limit $max")
        return bytes(n)
    }

    fun str(maxBytes: Int = 2000): String = String(blob(maxBytes), Charsets.UTF_8)

    fun rest(): ByteArray = bytes(remaining())
}

fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it.toInt() and 0xFF) }

fun hexToBytes(hex: String): ByteArray {
    require(hex.length % 2 == 0) { "odd hex length" }
    return ByteArray(hex.length / 2) { i -> hex.substring(i * 2, i * 2 + 2).toInt(16).toByte() }
}

/** Value wrapper so byte arrays can be map keys. */
class ByteKey(val bytes: ByteArray) {
    private val hash = bytes.contentHashCode()
    override fun equals(other: Any?): Boolean = other is ByteKey && other.bytes.contentEquals(bytes)
    override fun hashCode(): Int = hash
    override fun toString(): String = bytes.toHex()
    fun hex(): String = bytes.toHex()
}

fun ByteArray.key(): ByteKey = ByteKey(this)

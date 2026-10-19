package com.rohanic.meshradar.core.crypto

import com.rohanic.meshradar.core.protocol.ByteWriter
import com.rohanic.meshradar.core.protocol.Header

/**
 * Rotating tags and derived keys (PRD section 8, privacy).
 *
 * The group tag is HMAC-SHA256(key, "mr-tag" || window) truncated to 8 bytes, where window is the
 * 15-minute slot of the packet's created time. Strangers see a tag that changes every 15 minutes, so
 * they cannot follow a group across a venue.
 */
object Tags {
    const val WINDOW_SEC = 15 * 60L

    fun window(unixSec: Long): Long = unixSec / WINDOW_SEC

    fun tag(key: ByteArray, createdSec: Long): ByteArray {
        val data = ByteWriter(16).bytes("mr-tag".toByteArray()).i64(window(createdSec)).toByteArray()
        return Crypto.hmac(key, data).copyOf(Header.TAG_BYTES)
    }

    /** Key that only lets a finder of a lost-child card alert the family (E6). */
    fun finderKey(groupKey: ByteArray): ByteArray = derive(groupKey, "mr-finder")

    /** Mailbox ID for Family Circle online relay: stable per group, reveals nothing (G6). */
    fun mailboxId(groupKey: ByteArray): ByteArray = derive(groupKey, "mr-mailbox").copyOf(16)

    /** Public event key: everyone at the event can compute it from the pack ID (F4, E8). */
    fun eventKey(eventId: String): ByteArray = Crypto.hmac("mr-event-v1".toByteArray(), eventId.toByteArray())

    /** Key for the "help needed nearby" public SOS: known to every app user (E1). */
    val publicSosKey: ByteArray = Crypto.hmac("mr-public-v1".toByteArray(), "public-sos".toByteArray())

    /** Join-by-code key derived from the 6-digit code (B1). Low entropy by design; see DEC-006. */
    fun joinKey(code: String): ByteArray = Crypto.hmac("mr-join-v1".toByteArray(), code.toByteArray())

    fun derive(key: ByteArray, label: String): ByteArray = Crypto.hmac(key, label.toByteArray())
}

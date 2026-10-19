package com.rohanic.meshradar.core.protocol

import com.rohanic.meshradar.core.crypto.Crypto
import com.rohanic.meshradar.core.crypto.Tags
import java.security.SecureRandom

/** Sender of a group packet is identified by an 8-byte member ID: BLAKE2b-64 of its signing key. */
const val MEMBER_ID_BYTES = 8
val BROADCAST: ByteArray = ByteArray(MEMBER_ID_BYTES)

/** Opened group packet. The signature is checked by the caller once it has found the sender's key. */
class GroupInner(
    val senderId: ByteArray,
    val recipientId: ByteArray,
    val body: ByteArray,
    val signature: ByteArray,
    val signedBytes: ByteArray,
) {
    val isDirect: Boolean get() = !recipientId.contentEquals(BROADCAST)
}

/** Opened public packet, signature already verified against [senderPk]. */
class PublicInner(val senderPk: ByteArray, val body: ByteArray)

/**
 * Sign-then-encrypt envelopes (PRD section 8: XChaCha20-Poly1305 with the group key, Ed25519 signed).
 *
 * Group:  seal(key, nonce(header), senderId(8) | recipientId(8) | body | sig(64), ad = header without hop)
 * Public: seal(eventKey, nonce(header), senderPk(32) | body | sig(64), ad = header without hop)
 *
 * The signature covers the authenticated header, so a relay cannot move a body to another packet.
 * Signing inside the encryption keeps sender identity hidden from relays.
 */
class Envelope(private val crypto: Crypto, private val random: SecureRandom = SecureRandom()) {

    fun newMsgId(): ByteArray = ByteArray(Header.MSG_ID_BYTES).also { random.nextBytes(it) }

    fun header(type: PacketType, tagKey: ByteArray, createdSec: Long, ttl: Int = type.maxTtl): Header =
        Header(Header.VERSION, type, newMsgId(), Tags.tag(tagKey, createdSec), 0, ttl.coerceAtMost(type.maxTtl), createdSec)

    fun sealGroup(
        header: Header,
        key: ByteArray,
        senderId: ByteArray,
        recipientId: ByteArray,
        body: ByteArray,
        signSecret: ByteArray,
    ): Packet {
        val ad = header.authenticatedHeader()
        val signed = ad + senderId + recipientId + body
        val sig = crypto.sign(signed, signSecret)
        val inner = senderId + recipientId + body + sig
        return Packet(header, crypto.seal(key, header.nonce(), inner, ad))
    }

    fun openGroup(packet: Packet, key: ByteArray): GroupInner? {
        val ad = packet.header.authenticatedHeader()
        val inner = crypto.open(key, packet.header.nonce(), packet.payload, ad) ?: return null
        if (inner.size < MEMBER_ID_BYTES * 2 + Crypto.SIGNATURE_BYTES) return null
        val sender = inner.copyOfRange(0, MEMBER_ID_BYTES)
        val recipient = inner.copyOfRange(MEMBER_ID_BYTES, MEMBER_ID_BYTES * 2)
        val body = inner.copyOfRange(MEMBER_ID_BYTES * 2, inner.size - Crypto.SIGNATURE_BYTES)
        val sig = inner.copyOfRange(inner.size - Crypto.SIGNATURE_BYTES, inner.size)
        return GroupInner(sender, recipient, body, sig, ad + sender + recipient + body)
    }

    fun sealPublic(header: Header, key: ByteArray, signPk: ByteArray, signSecret: ByteArray, body: ByteArray): Packet {
        val ad = header.authenticatedHeader()
        val sig = crypto.sign(ad + signPk + body, signSecret)
        return Packet(header, crypto.seal(key, header.nonce(), signPk + body + sig, ad))
    }

    fun openPublic(packet: Packet, key: ByteArray): PublicInner? {
        val ad = packet.header.authenticatedHeader()
        val inner = crypto.open(key, packet.header.nonce(), packet.payload, ad) ?: return null
        if (inner.size < 32 + Crypto.SIGNATURE_BYTES) return null
        val pk = inner.copyOfRange(0, 32)
        val body = inner.copyOfRange(32, inner.size - Crypto.SIGNATURE_BYTES)
        val sig = inner.copyOfRange(inner.size - Crypto.SIGNATURE_BYTES, inner.size)
        if (!crypto.verify(sig, ad + pk + body, pk)) return null
        return PublicInner(pk, body)
    }

    /** Direct-message layer inside the group layer: only the recipient can read the body (D1). */
    fun sealDirect(pairKey: ByteArray, header: Header, senderId: ByteArray, recipientId: ByteArray, body: ByteArray): ByteArray =
        crypto.seal(pairKey, header.nonce(), body, senderId + recipientId)

    fun openDirect(pairKey: ByteArray, header: Header, senderId: ByteArray, recipientId: ByteArray, sealed: ByteArray): ByteArray? =
        crypto.open(pairKey, header.nonce(), sealed, senderId + recipientId)

    fun memberId(signPk: ByteArray): ByteArray = crypto.hash(signPk, MEMBER_ID_BYTES)
}

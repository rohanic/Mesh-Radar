package com.rohanic.meshradar.core.crypto

import com.goterl.lazysodium.LazySodium
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/** Ed25519 signing key pair plus the X25519 key pair used for direct messages and join replies. */
class IdentityKeys(
    val signPublic: ByteArray,
    val signSecret: ByteArray,
    val boxPublic: ByteArray,
    val boxSecret: ByteArray,
)

/**
 * libsodium primitives only (PRD section 14 risk mitigation). The same class runs on the JVM
 * (lazysodium-java, tests) and on Android (lazysodium-android); both extend [LazySodium].
 */
class Crypto(private val sodium: LazySodium) {

    fun random(n: Int): ByteArray = sodium.randomBytesBuf(n)

    fun newIdentity(): IdentityKeys = identityFromSeed(random(SEED_BYTES))

    /** Deterministic identity from a 32-byte seed; the Android layer stores only the seed (wrapped). */
    fun identityFromSeed(seed: ByteArray): IdentityKeys {
        require(seed.size == SEED_BYTES)
        val pk = ByteArray(32)
        val sk = ByteArray(64)
        check(sodium.cryptoSignSeedKeypair(pk, sk, seed)) { "sign keypair failed" }
        val boxSk = hash(seed, 32, "mr-x25519".toByteArray())
        val boxPk = ByteArray(32)
        check(sodium.cryptoScalarMultBase(boxPk, boxSk)) { "x25519 base failed" }
        return IdentityKeys(pk, sk, boxPk, boxSk)
    }

    /** Ephemeral X25519 pair (join replies). */
    fun newBoxPair(): Pair<ByteArray, ByteArray> {
        val sk = random(32)
        val pk = ByteArray(32)
        check(sodium.cryptoScalarMultBase(pk, sk)) { "x25519 base failed" }
        return pk to sk
    }

    fun sign(message: ByteArray, signSecret: ByteArray): ByteArray {
        val sig = ByteArray(SIGNATURE_BYTES)
        check(sodium.cryptoSignDetached(sig, message, message.size.toLong(), signSecret)) { "sign failed" }
        return sig
    }

    fun verify(signature: ByteArray, message: ByteArray, signPublic: ByteArray): Boolean {
        if (signature.size != SIGNATURE_BYTES || signPublic.size != 32) return false
        return sodium.cryptoSignVerifyDetached(signature, message, message.size, signPublic)
    }

    /** XChaCha20-Poly1305 (IETF). Output is ciphertext followed by the 16-byte tag. */
    fun seal(key: ByteArray, nonce: ByteArray, plain: ByteArray, ad: ByteArray): ByteArray {
        require(key.size == KEY_BYTES && nonce.size == NONCE_BYTES)
        val out = ByteArray(plain.size + MAC_BYTES)
        val outLen = LongArray(1)
        check(
            sodium.cryptoAeadXChaCha20Poly1305IetfEncrypt(
                out, outLen, plain, plain.size.toLong(), ad, ad.size.toLong(), null, nonce, key,
            ),
        ) { "seal failed" }
        return out.copyOf(outLen[0].toInt())
    }

    /** Returns null when the key is wrong or the packet was tampered with. */
    fun open(key: ByteArray, nonce: ByteArray, sealed: ByteArray, ad: ByteArray): ByteArray? {
        if (sealed.size < MAC_BYTES || key.size != KEY_BYTES) return null
        val out = ByteArray(sealed.size - MAC_BYTES)
        val outLen = LongArray(1)
        val ok = sodium.cryptoAeadXChaCha20Poly1305IetfDecrypt(
            out, outLen, null, sealed, sealed.size.toLong(), ad, ad.size.toLong(), nonce, key,
        )
        return if (ok) out.copyOf(outLen[0].toInt()) else null
    }

    /** X25519 shared secret hashed with both public keys (order independent), for direct messages. */
    fun pairKey(mySecret: ByteArray, myPublic: ByteArray, theirPublic: ByteArray): ByteArray? {
        val shared = ByteArray(32)
        if (!sodium.cryptoScalarMult(shared, mySecret, theirPublic)) return null
        val (a, b) = if (compare(myPublic, theirPublic) <= 0) myPublic to theirPublic else theirPublic to myPublic
        return hash(shared + a + b, 32, "mr-pair".toByteArray())
    }

    /** BLAKE2b, optionally keyed (key 16..64 bytes). Outputs under 16 bytes are truncated BLAKE2b-128. */
    fun hash(input: ByteArray, outLen: Int = 32, key: ByteArray? = null): ByteArray {
        val len = outLen.coerceAtLeast(16)
        val out = ByteArray(len)
        val k = key?.let { padKey(it) }
        val ok = if (k == null) {
            sodium.cryptoGenericHash(out, len, input, input.size.toLong())
        } else {
            sodium.cryptoGenericHash(out, len, input, input.size.toLong(), k, k.size)
        }
        check(ok) { "hash failed" }
        return if (len == outLen) out else out.copyOf(outLen)
    }

    fun newGroupKey(): ByteArray = random(KEY_BYTES)

    companion object {
        const val KEY_BYTES = 32
        const val NONCE_BYTES = 24
        const val MAC_BYTES = 16
        const val SIGNATURE_BYTES = 64
        const val SEED_BYTES = 32

        /** HMAC-SHA256 from the platform (javax.crypto exists on the JVM and on Android). */
        fun hmac(key: ByteArray, data: ByteArray): ByteArray {
            val mac = Mac.getInstance("HmacSHA256")
            mac.init(SecretKeySpec(key, "HmacSHA256"))
            return mac.doFinal(data)
        }

        fun compare(a: ByteArray, b: ByteArray): Int {
            for (i in 0 until minOf(a.size, b.size)) {
                val d = (a[i].toInt() and 0xFF) - (b[i].toInt() and 0xFF)
                if (d != 0) return d
            }
            return a.size - b.size
        }

        /** Constant-time equality for tags and IDs. */
        fun constantTimeEquals(a: ByteArray, b: ByteArray): Boolean {
            if (a.size != b.size) return false
            var r = 0
            for (i in a.indices) r = r or (a[i].toInt() xor b[i].toInt())
            return r == 0
        }

        private fun padKey(k: ByteArray): ByteArray = when {
            k.size < 16 -> k.copyOf(16)
            k.size > 64 -> k.copyOf(64)
            else -> k
        }
    }
}

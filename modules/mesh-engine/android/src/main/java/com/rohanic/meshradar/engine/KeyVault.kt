package com.rohanic.meshradar.engine

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.File
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Identity seed storage (A1, DEC-007). The 32-byte seed is encrypted with an AES-256-GCM key that
 * never leaves the Android Keystore. No account, SIM or network is involved.
 */
class KeyVault(private val context: Context) {
    private val file: File get() = File(context.noBackupFilesDir, "identity.bin")

    fun loadOrCreateSeed(): ByteArray {
        if (file.exists()) {
            val blob = file.readBytes()
            if (blob.size > IV_BYTES) {
                val iv = blob.copyOfRange(0, IV_BYTES)
                val ct = blob.copyOfRange(IV_BYTES, blob.size)
                val cipher = Cipher.getInstance(TRANSFORM)
                cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
                return cipher.doFinal(ct)
            }
        }
        val seed = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance(TRANSFORM)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val out = cipher.iv + cipher.doFinal(seed)
        val tmp = File(file.parentFile, "identity.bin.tmp")
        tmp.writeBytes(out)
        tmp.renameTo(file)
        return seed
    }

    fun exists(): Boolean = file.exists()

    /** Delete everything (H4): the wrapped seed and the Keystore key. */
    fun wipe() {
        file.delete()
        val ks = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        if (ks.containsAlias(ALIAS)) ks.deleteEntry(ALIAS)
    }

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (ks.getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
        gen.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return gen.generateKey()
    }

    companion object {
        private const val KEYSTORE = "AndroidKeyStore"
        private const val ALIAS = "mesh_radar_identity_v1"
        private const val TRANSFORM = "AES/GCM/NoPadding"
        private const val IV_BYTES = 12
    }
}

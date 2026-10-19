package com.rohanic.meshradar.engine

import android.content.Context
import android.net.Uri
import android.util.Log
import com.google.android.gms.nearby.connection.Payload
import com.rohanic.meshradar.core.protocol.Frame
import com.rohanic.meshradar.core.protocol.hexToBytes
import java.io.File
import java.io.FileInputStream

/**
 * Full photos (D6) travel only between directly connected phones over the Nearby high-bandwidth
 * link, never through the multi-hop mesh. They are encrypted with the group key before they leave
 * the phone; phones that hold the encrypted copy can serve it to others nearby.
 */
class PhotoStore(private val context: Context) {
    private val dir = File(context.filesDir, "photos").apply { mkdirs() }
    private val openDir = File(context.cacheDir, "photos").apply { mkdirs() }
    private val wanted = HashMap<String, String>()
    private val incomingMeta = HashMap<Long, String>()
    private val incomingPayload = HashMap<Long, Payload>()

    private fun sealedFile(photoId: String) = File(dir, "$photoId.bin")

    /** Our own full photo: encrypt and keep it so neighbours can ask for it. */
    fun saveOwn(groupId: String, photoId: String, uri: String) {
        val bytes = context.contentResolver.openInputStream(Uri.parse(uri))?.use { it.readBytes() } ?: return
        if (bytes.size > MAX_BYTES) throw IllegalArgumentException("photo too large")
        sealedFile(photoId).writeBytes(Engine.core.sealBlob(groupId, bytes))
        File(openDir, "$photoId.jpg").writeBytes(bytes)
    }

    fun localUri(photoId: String): String? = File(openDir, "$photoId.jpg").takeIf { it.exists() }?.let { Uri.fromFile(it).toString() }

    fun request(groupId: String, photoId: String) {
        wanted[photoId] = groupId
        val frame = Frame.PhotoRequest(hexToBytes(photoId)).encode()
        Engine.nearby?.connected()?.forEach { Engine.nearby?.send(it, frame) }
    }

    fun onRequest(endpoint: String, photoId: String) {
        val f = sealedFile(photoId)
        if (!f.exists()) return
        try {
            val payload = Payload.fromFile(f)
            Engine.nearby?.send(endpoint, Frame.PhotoMeta(hexToBytes(photoId), payload.id, f.length()).encode())
            Engine.nearby?.sendFile(endpoint, payload)
        } catch (e: java.io.FileNotFoundException) {
            Log.w(TAG, "photo vanished", e)
        }
    }

    fun onMeta(photoId: String, payloadId: Long) {
        incomingMeta[payloadId] = photoId
    }

    fun onFile(payloadId: Long, payload: Payload) {
        incomingPayload[payloadId] = payload
    }

    fun onFileDone(payloadId: Long, success: Boolean) {
        val payload = incomingPayload.remove(payloadId) ?: return
        val photoId = incomingMeta.remove(payloadId) ?: return
        if (!success) return
        val pfd = payload.asFile()?.asParcelFileDescriptor() ?: return
        val sealed = FileInputStream(pfd.fileDescriptor).use { it.readBytes() }
        pfd.close()
        if (sealed.size > MAX_BYTES + 64) return
        sealedFile(photoId).writeBytes(sealed)
        val groupId = wanted.remove(photoId) ?: return
        val plain = Engine.core.openBlob(groupId, sealed) ?: return
        val out = File(openDir, "$photoId.jpg").apply { writeBytes(plain) }
        Engine.emit("photoReceived", mapOf("photoId" to photoId, "groupId" to groupId, "uri" to Uri.fromFile(out).toString()))
    }

    fun wipe() {
        dir.deleteRecursively()
        openDir.deleteRecursively()
        dir.mkdirs()
        openDir.mkdirs()
    }

    companion object {
        private const val TAG = "MeshPhotos"
        const val MAX_BYTES = 8 * 1024 * 1024
    }
}

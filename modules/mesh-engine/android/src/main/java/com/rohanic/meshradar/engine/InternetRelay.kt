package com.rohanic.meshradar.engine

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Base64
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Family Circle online mode (G6, DEC-026): when the phone has internet, the same encrypted packets
 * go through the Worker mailbox; when the network fails, the mesh carries them as usual.
 * The Worker stores ciphertext keyed by an HMAC of the group key and never sees location.
 */
class InternetRelay(private val context: Context) {
    private val io = Executors.newSingleThreadExecutor()
    @Volatile private var busy = false

    fun online(): Boolean {
        val cm = context.getSystemService(ConnectivityManager::class.java) ?: return false
        val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    /** Upload our packets for each enabled group and fetch everyone else's. */
    fun sync(baseUrl: String, groupIds: Set<String>) {
        if (busy || baseUrl.isBlank() || groupIds.isEmpty() || !online()) return
        busy = true
        io.execute {
            try {
                for (groupId in groupIds) syncGroup(baseUrl, groupId)
            } catch (e: Exception) {
                Log.w(TAG, "circle sync failed", e)
            } finally {
                busy = false
            }
        }
    }

    private fun syncGroup(baseUrl: String, groupId: String) {
        val core = Engine.core
        val mailbox = try {
            core.mailboxId(groupId)
        } catch (e: Exception) {
            return
        }
        val prefs = Engine.prefs()
        val cursorKey = "circle.cursor.$groupId"
        val sentKey = "circle.sent.$groupId"
        val since = prefs.getLong(sentKey, 0)
        val outgoing = core.internetOutbox(groupId, since)
        val body = JSONObject()
            .put("mailbox", mailbox)
            .put("cursor", prefs.getString(cursorKey, "") ?: "")
            .put("packets", JSONArray(outgoing.map { Base64.encodeToString(it, Base64.NO_WRAP) }))
        val conn = (URL(baseUrl.trimEnd('/') + "/v1/circle/sync").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 10_000
            readTimeout = 15_000
            doOutput = true
            setRequestProperty("content-type", "application/json")
        }
        conn.outputStream.use { it.write(body.toString().toByteArray()) }
        if (conn.responseCode != 200) {
            conn.disconnect()
            return
        }
        val res = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
        conn.disconnect()
        val arr = res.optJSONArray("packets") ?: JSONArray()
        val packets = (0 until arr.length()).map { Base64.decode(arr.getString(it), Base64.NO_WRAP) }
        Engine.handler.post { core.onInternetPackets(packets) }
        prefs.edit().putString(cursorKey, res.optString("cursor")).putLong(sentKey, System.currentTimeMillis() / 1000).apply()
    }

    companion object {
        private const val TAG = "MeshCircle"
    }
}

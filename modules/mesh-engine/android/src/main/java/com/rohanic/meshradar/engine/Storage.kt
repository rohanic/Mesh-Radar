package com.rohanic.meshradar.engine

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.AtomicFile
import com.rohanic.meshradar.core.model.Breadcrumb
import com.rohanic.meshradar.core.model.BreadcrumbLog
import com.rohanic.meshradar.core.model.ChatMessage
import com.rohanic.meshradar.core.model.MemoryBreadcrumbLog
import com.rohanic.meshradar.core.model.MessageLog
import com.rohanic.meshradar.core.model.StateStore
import com.rohanic.meshradar.core.model.chatMessageFromJson
import com.rohanic.meshradar.core.model.toJson
import com.rohanic.meshradar.core.protocol.ByteKey
import com.rohanic.meshradar.core.protocol.MalformedPacketException
import com.rohanic.meshradar.core.protocol.Packet
import com.rohanic.meshradar.core.routing.PacketStore
import com.rohanic.meshradar.core.routing.StoredPacket
import org.json.JSONObject
import java.io.File

/**
 * Engine database (DEC-017): store-and-forward queue, message log and breadcrumbs. Lives in
 * no-backup storage; it survives restarts so queued packets keep their 6 h / 24 h lifetimes (D4).
 */
class EngineDb(context: Context) : SQLiteOpenHelper(context, NAME, null, VERSION) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE packets (id BLOB PRIMARY KEY, priority INTEGER NOT NULL, created INTEGER NOT NULL, " +
                "expires INTEGER NOT NULL, own INTEGER NOT NULL, received INTEGER NOT NULL, bytes BLOB NOT NULL)",
        )
        db.execSQL("CREATE INDEX packets_order ON packets (priority, created DESC)")
        db.execSQL("CREATE INDEX packets_expires ON packets (expires)")
        db.execSQL(
            "CREATE TABLE messages (msg_id TEXT PRIMARY KEY, group_id TEXT NOT NULL, sender_id TEXT NOT NULL, " +
                "recipient_id TEXT, created_at INTEGER NOT NULL, json TEXT NOT NULL)",
        )
        db.execSQL("CREATE INDEX messages_group ON messages (group_id, created_at DESC)")
        db.execSQL(
            "CREATE TABLE breadcrumbs (group_id TEXT NOT NULL, member_id TEXT NOT NULL, at INTEGER NOT NULL, " +
                "lat REAL NOT NULL, lon REAL NOT NULL)",
        )
        db.execSQL("CREATE INDEX breadcrumbs_member ON breadcrumbs (group_id, member_id, at)")
        db.execSQL("CREATE INDEX breadcrumbs_at ON breadcrumbs (at)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // v1 only. Future migrations go here, one step per version.
    }

    fun wipe() {
        writableDatabase.apply {
            delete("packets", null, null)
            delete("messages", null, null)
            delete("breadcrumbs", null, null)
        }
    }

    companion object {
        const val NAME = "mesh_engine.db"
        const val VERSION = 1
    }
}

class SqlPacketStore(private val db: EngineDb, private val maxEntries: Int = 20_000) : PacketStore {
    override fun put(entry: StoredPacket) {
        val v = ContentValues().apply {
            put("id", entry.packet.header.msgId)
            put("priority", entry.type.priority)
            put("created", entry.packet.header.created)
            put("expires", entry.expiresAt)
            put("own", if (entry.own) 1 else 0)
            put("received", entry.receivedAt)
            put("bytes", entry.packet.encode())
        }
        val w = db.writableDatabase
        w.insertWithOnConflict("packets", null, v, SQLiteDatabase.CONFLICT_IGNORE)
        if (count() > maxEntries) {
            // Evict the lowest-priority, oldest packets; SOS goes last.
            w.execSQL(
                "DELETE FROM packets WHERE id IN (SELECT id FROM packets ORDER BY priority DESC, created ASC LIMIT ?)",
                arrayOf(count() - maxEntries),
            )
        }
    }

    // IDs are bound as hex blob literals; ByteKey.hex() yields only [0-9a-f].
    override fun get(id: ByteKey): StoredPacket? = query("WHERE id = x'${id.hex()}'", 1).firstOrNull()

    override fun contains(id: ByteKey): Boolean =
        db.readableDatabase.rawQuery("SELECT 1 FROM packets WHERE id = x'${id.hex()}' LIMIT 1", null).use { it.moveToFirst() }

    override fun remove(id: ByteKey) {
        db.writableDatabase.execSQL("DELETE FROM packets WHERE id = x'${id.hex()}'")
    }

    override fun ordered(limit: Int): List<StoredPacket> = query("ORDER BY priority ASC, created DESC", limit)

    override fun pruneExpired(nowSec: Long): Int =
        db.writableDatabase.delete("packets", "expires < ?", arrayOf(nowSec.toString()))

    override fun count(): Int =
        db.readableDatabase.rawQuery("SELECT COUNT(*) FROM packets", null).use { c -> if (c.moveToFirst()) c.getInt(0) else 0 }

    override fun clear() {
        db.writableDatabase.delete("packets", null, null)
    }

    private fun query(tail: String, limit: Int): List<StoredPacket> {
        val out = ArrayList<StoredPacket>()
        db.readableDatabase.rawQuery("SELECT bytes, received, own FROM packets $tail LIMIT $limit", null).use { c ->
            while (c.moveToNext()) {
                try {
                    out.add(StoredPacket(Packet.decode(c.getBlob(0)), c.getLong(1), c.getInt(2) == 1))
                } catch (e: MalformedPacketException) {
                    // A row from an older protocol version; skip it.
                }
            }
        }
        return out
    }
}

class SqlMessageLog(private val db: EngineDb) : MessageLog {
    override fun add(message: ChatMessage) {
        db.writableDatabase.insertWithOnConflict("messages", null, values(message), SQLiteDatabase.CONFLICT_IGNORE)
    }

    override fun get(msgId: String): ChatMessage? =
        db.readableDatabase.rawQuery("SELECT json FROM messages WHERE msg_id = ?", arrayOf(msgId)).use { c ->
            if (c.moveToFirst()) chatMessageFromJson(JSONObject(c.getString(0))) else null
        }

    override fun update(message: ChatMessage) {
        db.writableDatabase.insertWithOnConflict("messages", null, values(message), SQLiteDatabase.CONFLICT_REPLACE)
    }

    override fun list(groupId: String, peerId: String?, beforeMs: Long, limit: Int): List<ChatMessage> {
        val (where, args) = if (peerId == null) {
            "group_id = ? AND recipient_id IS NULL AND created_at < ?" to arrayOf(groupId, beforeMs.toString())
        } else {
            "group_id = ? AND recipient_id IS NOT NULL AND (sender_id = ? OR recipient_id = ?) AND created_at < ?" to
                arrayOf(groupId, peerId, peerId, beforeMs.toString())
        }
        return read("SELECT json FROM messages WHERE $where ORDER BY created_at DESC LIMIT $limit", args)
    }

    override fun all(groupId: String): List<ChatMessage> =
        read("SELECT json FROM messages WHERE group_id = ? ORDER BY created_at ASC", arrayOf(groupId))

    override fun deleteGroup(groupId: String) {
        db.writableDatabase.delete("messages", "group_id = ?", arrayOf(groupId))
    }

    override fun clear() {
        db.writableDatabase.delete("messages", null, null)
    }

    private fun read(sql: String, args: Array<String>): List<ChatMessage> {
        val out = ArrayList<ChatMessage>()
        db.readableDatabase.rawQuery(sql, args).use { c ->
            while (c.moveToNext()) out.add(chatMessageFromJson(JSONObject(c.getString(0))))
        }
        return out
    }

    private fun values(m: ChatMessage) = ContentValues().apply {
        put("msg_id", m.msgId)
        put("group_id", m.groupId)
        put("sender_id", m.senderId)
        if (m.recipientId != null) put("recipient_id", m.recipientId) else putNull("recipient_id")
        put("created_at", m.createdAt)
        put("json", m.toJson().toString())
    }
}

/** Breadcrumbs (C7): last 2 hours, at most 125,000 rows (about 5 MB). */
class SqlBreadcrumbLog(private val db: EngineDb) : BreadcrumbLog {
    private var lastTrimCheck = 0L
    private val lastPoint = HashMap<String, Breadcrumb>()

    override fun add(groupId: String, crumb: Breadcrumb) {
        // Keep a point only if the member moved 5 m or 30 s passed, to stay well under 5 MB.
        val key = groupId + crumb.memberId
        lastPoint[key]?.let { prev ->
            val moved = com.rohanic.meshradar.core.geo.Geo.distanceM(prev.lat, prev.lon, crumb.lat, crumb.lon)
            if (moved < 5 && crumb.atSec - prev.atSec < 30) return
        }
        lastPoint[key] = crumb
        db.writableDatabase.insert(
            "breadcrumbs",
            null,
            ContentValues().apply {
                put("group_id", groupId)
                put("member_id", crumb.memberId)
                put("at", crumb.atSec)
                put("lat", crumb.lat)
                put("lon", crumb.lon)
            },
        )
        if (crumb.atSec - lastTrimCheck > 60) {
            lastTrimCheck = crumb.atSec
            db.writableDatabase.execSQL(
                "DELETE FROM breadcrumbs WHERE rowid IN (SELECT rowid FROM breadcrumbs ORDER BY at DESC LIMIT -1 OFFSET ?)",
                arrayOf(MemoryBreadcrumbLog.MAX_POINTS),
            )
        }
    }

    override fun list(groupId: String, memberId: String, sinceSec: Long): List<Breadcrumb> {
        val out = ArrayList<Breadcrumb>()
        db.readableDatabase.rawQuery(
            "SELECT at, lat, lon FROM breadcrumbs WHERE group_id = ? AND member_id = ? AND at >= ? ORDER BY at ASC",
            arrayOf(groupId, memberId, sinceSec.toString()),
        ).use { c -> while (c.moveToNext()) out.add(Breadcrumb(memberId, c.getLong(0), c.getDouble(1), c.getDouble(2))) }
        return out
    }

    override fun prune(beforeSec: Long) {
        db.writableDatabase.delete("breadcrumbs", "at < ?", arrayOf(beforeSec.toString()))
    }

    override fun deleteGroup(groupId: String) {
        db.writableDatabase.delete("breadcrumbs", "group_id = ?", arrayOf(groupId))
    }

    override fun clear() {
        db.writableDatabase.delete("breadcrumbs", null, null)
        lastPoint.clear()
    }
}

/** Engine state as one JSON file, written atomically. */
class FileStateStore(context: Context) : StateStore {
    private val file = AtomicFile(File(context.noBackupFilesDir, "mesh_state.json"))

    override fun load(): String? = try {
        String(file.readFully(), Charsets.UTF_8)
    } catch (e: java.io.FileNotFoundException) {
        null
    }

    override fun save(json: String) {
        val out = file.startWrite()
        try {
            out.write(json.toByteArray(Charsets.UTF_8))
            file.finishWrite(out)
        } catch (e: java.io.IOException) {
            file.failWrite(out)
        }
    }

    override fun clear() {
        file.delete()
    }
}

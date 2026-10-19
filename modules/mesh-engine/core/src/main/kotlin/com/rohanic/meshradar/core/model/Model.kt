package com.rohanic.meshradar.core.model

import com.rohanic.meshradar.core.protocol.Checkpoint
import com.rohanic.meshradar.core.protocol.EmergencyCard
import com.rohanic.meshradar.core.protocol.Position
import com.rohanic.meshradar.core.protocol.Role
import com.rohanic.meshradar.core.protocol.SosKind
import com.rohanic.meshradar.core.protocol.hexToBytes
import com.rohanic.meshradar.core.protocol.toHex
import org.json.JSONArray
import org.json.JSONObject
import java.util.Base64

/** Power modes (H1). Intervals are in seconds. */
enum class PowerMode(val positionIntervalSec: Long, val scanDuty: Double, val relay: Boolean) {
    RADAR(5, 1.0, true),
    BALANCED(30, 0.3, true),
    STANDBY(300, 0.1, true),
    ULTRA_SAVER(300, 0.05, false),
}

/** How a packet reached us. */
enum class Via { NEARBY, BLE, INTERNET, SELF }

data class Profile(
    var name: String = "",
    var colour: Int = 0,
    var avatarPreset: Int = 0,
    var avatarPhoto: ByteArray = ByteArray(0),
    var card: EmergencyCard = EmergencyCard(),
)

data class Member(
    val id: String,
    val signPk: ByteArray,
    val boxPk: ByteArray,
    var name: String,
    var colour: Int,
    var avatarPreset: Int,
    var avatarPhoto: ByteArray,
    var role: Role,
    var joinedAt: Long,
    var position: Position? = null,
    var lastHeardMs: Long = 0,
    var hops: Int = 0,
    var via: Via = Via.NEARBY,
    var separated: Boolean = false,
)

data class Pin(
    val id: String,
    var name: String,
    var lat: Double,
    var lon: Double,
    var floor: Int,
    var icon: Int,
    var updated: Long,
    var deleted: Boolean = false,
)

/** Check-in timers and plans (E7, flow 5). Deadlines are unix seconds. */
data class CheckinState(
    var planCheckpoints: List<Checkpoint> = emptyList(),
    var planDeadline: Long = 0,
    /** memberId -> personal timer deadline. */
    val timers: MutableMap<String, Long> = mutableMapOf(),
    /** memberId -> highest checkpoint index reached, or -1. */
    val progress: MutableMap<String, Int> = mutableMapOf(),
    /** memberId -> last check-in time. */
    val lastCheckin: MutableMap<String, Long> = mutableMapOf(),
    /** Timers and plans already alerted, so each fires once. */
    val alerted: MutableSet<String> = mutableSetOf(),
)

class Group(
    val id: String,
    var name: String,
    val key: ByteArray,
    var leaderSignPk: ByteArray,
    val createdAt: Long,
    var expiresAt: Long,
    val eventId: String,
    var maxMembers: Int,
    var colour: Int = 0,
    var archived: Boolean = false,
    var separationM: Int = DEFAULT_SEPARATION_M,
    val members: MutableMap<String, Member> = linkedMapOf(),
    val pins: MutableMap<String, Pin> = linkedMapOf(),
    var checkin: CheckinState = CheckinState(),
    val licences: MutableList<String> = mutableListOf(),
) {
    companion object {
        const val DEFAULT_SEPARATION_M = 150
    }
}

data class SosRecord(
    val sosId: String,
    val groupId: String,
    val memberId: String,
    val kind: SosKind,
    val silent: Boolean,
    var position: Position,
    var card: EmergencyCard,
    val startedAt: Long,
    var lastAt: Long,
    var hops: Int,
    var resolved: Boolean = false,
    var resolvedBy: String = "",
)

data class OwnSos(val sosId: String, val kind: SosKind, val silent: Boolean, val startedAt: Long, var seq: Int, var lastSentMs: Long)

data class CrumbRecord(
    val groupId: String,
    val memberId: String,
    val reason: String,
    val position: Position,
    val receivedAt: Long,
)

data class PublicSosRecord(
    val sosId: String,
    val kind: SosKind,
    val lat: Double,
    val lon: Double,
    val radiusM: Int,
    var lastAt: Long,
    var active: Boolean,
)

data class CrowdReport(
    val alertId: String,
    val eventId: String,
    val senderPk: String,
    val kind: String,
    val label: String,
    val lat: Double,
    val lon: Double,
    val receivedAt: Long,
    val organiser: String,
)

data class EventPost(
    val msgId: String,
    val eventId: String,
    val senderPk: String,
    val text: String,
    val at: Long,
    val mine: Boolean,
)

data class Stats(
    var relayedForOthers: Long = 0,
    val relayedByEvent: MutableMap<String, Long> = mutableMapOf(),
    var messagesSent: Long = 0,
    var sosSent: Long = 0,
    var packetsReceived: Long = 0,
)

/** Everything the engine keeps between restarts, apart from the message log and packet store. */
class CoreState {
    var profile = Profile()
    val groups: MutableMap<String, Group> = linkedMapOf()
    var ownSos: OwnSos? = null
    val sos: MutableMap<String, SosRecord> = linkedMapOf()
    val crumbs: MutableList<CrumbRecord> = mutableListOf()
    val publicSos: MutableMap<String, PublicSosRecord> = linkedMapOf()
    val crowd: MutableList<CrowdReport> = mutableListOf()
    val eventPosts: MutableList<EventPost> = mutableListOf()
    val lastEventPostBySender: MutableMap<String, Long> = mutableMapOf()
    val blockedSenders: MutableSet<String> = mutableSetOf()
    val ownLicences: MutableList<String> = mutableListOf()
    var stats = Stats()
    var powerMode = PowerMode.BALANCED
    var relayEnabled = true
    var eventDay = false
    var activeEventId = ""
    var ownPosition: Position? = null
    var lastBatteryCrumb = 101

    fun toJson(): JSONObject = JSONObject().apply {
        put("v", 1)
        put("profile", JSONObject().apply {
            put("name", profile.name)
            put("colour", profile.colour)
            put("avatarPreset", profile.avatarPreset)
            put("avatarPhoto", b64(profile.avatarPhoto))
            put("card", cardJson(profile.card))
        })
        put("groups", JSONArray().apply { groups.values.forEach { put(groupJson(it)) } })
        ownSos?.let { s ->
            put("ownSos", JSONObject().apply {
                put("sosId", s.sosId); put("kind", s.kind.name); put("silent", s.silent)
                put("startedAt", s.startedAt); put("seq", s.seq)
            })
        }
        put("sos", JSONArray().apply { sos.values.forEach { put(sosJson(it)) } })
        put("crumbs", JSONArray().apply {
            crumbs.forEach { c ->
                put(JSONObject().apply {
                    put("groupId", c.groupId); put("memberId", c.memberId); put("reason", c.reason)
                    put("position", posJson(c.position)); put("receivedAt", c.receivedAt)
                })
            }
        })
        put("crowd", JSONArray().apply {
            crowd.forEach { c ->
                put(JSONObject().apply {
                    put("alertId", c.alertId); put("eventId", c.eventId); put("senderPk", c.senderPk); put("kind", c.kind)
                    put("label", c.label); put("lat", c.lat); put("lon", c.lon); put("receivedAt", c.receivedAt)
                    put("organiser", c.organiser)
                })
            }
        })
        put("eventPosts", JSONArray().apply {
            eventPosts.forEach { p ->
                put(JSONObject().apply {
                    put("msgId", p.msgId); put("eventId", p.eventId); put("senderPk", p.senderPk)
                    put("text", p.text); put("at", p.at); put("mine", p.mine)
                })
            }
        })
        put("blocked", JSONArray(blockedSenders.toList()))
        put("ownLicences", JSONArray(ownLicences.toList()))
        put("stats", JSONObject().apply {
            put("relayedForOthers", stats.relayedForOthers)
            put("relayedByEvent", JSONObject(stats.relayedByEvent as Map<*, *>))
            put("messagesSent", stats.messagesSent)
            put("sosSent", stats.sosSent)
            put("packetsReceived", stats.packetsReceived)
        })
        put("powerMode", powerMode.name)
        put("relayEnabled", relayEnabled)
        put("eventDay", eventDay)
        put("activeEventId", activeEventId)
        ownPosition?.let { put("ownPosition", posJson(it)) }
        put("lastBatteryCrumb", lastBatteryCrumb)
    }

    companion object {
        fun fromJson(o: JSONObject): CoreState = CoreState().apply {
            o.optJSONObject("profile")?.let { p ->
                profile = Profile(
                    name = p.optString("name"),
                    colour = p.optInt("colour"),
                    avatarPreset = p.optInt("avatarPreset"),
                    avatarPhoto = unb64(p.optString("avatarPhoto")),
                    card = p.optJSONObject("card")?.let(::cardFrom) ?: EmergencyCard(),
                )
            }
            o.optJSONArray("groups")?.let { arr -> for (i in 0 until arr.length()) groupFrom(arr.getJSONObject(i)).let { groups[it.id] = it } }
            o.optJSONObject("ownSos")?.let { s ->
                ownSos = OwnSos(s.getString("sosId"), SosKind.valueOf(s.getString("kind")), s.optBoolean("silent"), s.getLong("startedAt"), s.optInt("seq"), 0)
            }
            o.optJSONArray("sos")?.let { arr -> for (i in 0 until arr.length()) sosFrom(arr.getJSONObject(i)).let { sos[it.sosId] = it } }
            o.optJSONArray("crumbs")?.let { arr ->
                for (i in 0 until arr.length()) {
                    val c = arr.getJSONObject(i)
                    crumbs.add(CrumbRecord(c.getString("groupId"), c.getString("memberId"), c.getString("reason"), posFrom(c.getJSONObject("position")), c.getLong("receivedAt")))
                }
            }
            o.optJSONArray("crowd")?.let { arr ->
                for (i in 0 until arr.length()) {
                    val c = arr.getJSONObject(i)
                    crowd.add(CrowdReport(c.getString("alertId"), c.getString("eventId"), c.getString("senderPk"), c.getString("kind"), c.getString("label"), c.getDouble("lat"), c.getDouble("lon"), c.getLong("receivedAt"), c.optString("organiser")))
                }
            }
            o.optJSONArray("eventPosts")?.let { arr ->
                for (i in 0 until arr.length()) {
                    val p = arr.getJSONObject(i)
                    eventPosts.add(EventPost(p.getString("msgId"), p.getString("eventId"), p.getString("senderPk"), p.getString("text"), p.getLong("at"), p.optBoolean("mine")))
                }
            }
            o.optJSONArray("blocked")?.let { arr -> for (i in 0 until arr.length()) blockedSenders.add(arr.getString(i)) }
            o.optJSONArray("ownLicences")?.let { arr -> for (i in 0 until arr.length()) ownLicences.add(arr.getString(i)) }
            o.optJSONObject("stats")?.let { s ->
                stats = Stats(
                    relayedForOthers = s.optLong("relayedForOthers"),
                    messagesSent = s.optLong("messagesSent"),
                    sosSent = s.optLong("sosSent"),
                    packetsReceived = s.optLong("packetsReceived"),
                )
                s.optJSONObject("relayedByEvent")?.let { m -> m.keys().forEach { k -> stats.relayedByEvent[k] = m.getLong(k) } }
            }
            powerMode = runCatching { PowerMode.valueOf(o.optString("powerMode")) }.getOrDefault(PowerMode.BALANCED)
            relayEnabled = o.optBoolean("relayEnabled", true)
            eventDay = o.optBoolean("eventDay")
            activeEventId = o.optString("activeEventId")
            ownPosition = o.optJSONObject("ownPosition")?.let(::posFrom)
            lastBatteryCrumb = o.optInt("lastBatteryCrumb", 101)
        }

        fun b64(b: ByteArray): String = Base64.getEncoder().encodeToString(b)
        fun unb64(s: String?): ByteArray = if (s.isNullOrEmpty()) ByteArray(0) else Base64.getDecoder().decode(s)

        fun cardJson(c: EmergencyCard) = JSONObject().apply {
            put("name", c.name); put("bloodGroup", c.bloodGroup); put("conditions", c.conditions); put("medicines", c.medicines)
            put("contactName", c.contactName); put("contactPhone", c.contactPhone); put("stay", c.stay)
        }

        fun cardFrom(o: JSONObject) = EmergencyCard(
            o.optString("name"), o.optString("bloodGroup"), o.optString("conditions"), o.optString("medicines"),
            o.optString("contactName"), o.optString("contactPhone"), o.optString("stay"),
        )

        fun posJson(p: Position) = JSONObject().apply {
            put("lat", p.lat); put("lon", p.lon); put("fixTime", p.fixTime); put("accuracyM", p.accuracyM); put("flags", p.flags)
            p.altM?.let { put("altM", it) }
            p.pressurePa?.let { put("pressurePa", it) }
            p.heading?.let { put("heading", it) }
            p.battery?.let { put("battery", it) }
        }

        fun posFrom(o: JSONObject) = Position(
            lat = o.getDouble("lat"),
            lon = o.getDouble("lon"),
            altM = if (o.has("altM")) o.getInt("altM") else null,
            pressurePa = if (o.has("pressurePa")) o.getInt("pressurePa") else null,
            accuracyM = o.optDouble("accuracyM", 0.0),
            heading = if (o.has("heading")) o.getDouble("heading") else null,
            battery = if (o.has("battery")) o.getInt("battery") else null,
            flags = o.optInt("flags"),
            fixTime = o.getLong("fixTime"),
        )

        private fun groupJson(g: Group) = JSONObject().apply {
            put("id", g.id); put("name", g.name); put("key", g.key.toHex()); put("leader", g.leaderSignPk.toHex())
            put("createdAt", g.createdAt); put("expiresAt", g.expiresAt); put("eventId", g.eventId); put("maxMembers", g.maxMembers)
            put("colour", g.colour); put("archived", g.archived); put("separationM", g.separationM)
            put("members", JSONArray().apply {
                g.members.values.forEach { m ->
                    put(JSONObject().apply {
                        put("id", m.id); put("signPk", m.signPk.toHex()); put("boxPk", m.boxPk.toHex()); put("name", m.name)
                        put("colour", m.colour); put("avatarPreset", m.avatarPreset); put("avatarPhoto", b64(m.avatarPhoto))
                        put("role", m.role.name); put("joinedAt", m.joinedAt); put("lastHeardMs", m.lastHeardMs); put("hops", m.hops)
                        put("via", m.via.name)
                        m.position?.let { put("position", posJson(it)) }
                    })
                }
            })
            put("pins", JSONArray().apply {
                g.pins.values.forEach { p ->
                    put(JSONObject().apply {
                        put("id", p.id); put("name", p.name); put("lat", p.lat); put("lon", p.lon); put("floor", p.floor)
                        put("icon", p.icon); put("updated", p.updated); put("deleted", p.deleted)
                    })
                }
            })
            put("checkin", JSONObject().apply {
                val c = g.checkin
                put("planDeadline", c.planDeadline)
                put("checkpoints", JSONArray().apply {
                    c.planCheckpoints.forEach { cp -> put(JSONObject().apply { put("name", cp.name); put("lat", cp.lat); put("lon", cp.lon); put("radiusM", cp.radiusM) }) }
                })
                put("timers", JSONObject(c.timers as Map<*, *>))
                put("progress", JSONObject(c.progress as Map<*, *>))
                put("lastCheckin", JSONObject(c.lastCheckin as Map<*, *>))
                put("alerted", JSONArray(c.alerted.toList()))
            })
            put("licences", JSONArray(g.licences))
        }

        private fun groupFrom(o: JSONObject): Group {
            val g = Group(
                id = o.getString("id"),
                name = o.getString("name"),
                key = hexToBytes(o.getString("key")),
                leaderSignPk = hexToBytes(o.getString("leader")),
                createdAt = o.getLong("createdAt"),
                expiresAt = o.optLong("expiresAt"),
                eventId = o.optString("eventId"),
                maxMembers = o.optInt("maxMembers", 6),
                colour = o.optInt("colour"),
                archived = o.optBoolean("archived"),
                separationM = o.optInt("separationM", Group.DEFAULT_SEPARATION_M),
            )
            o.optJSONArray("members")?.let { arr ->
                for (i in 0 until arr.length()) {
                    val m = arr.getJSONObject(i)
                    val member = Member(
                        id = m.getString("id"),
                        signPk = hexToBytes(m.getString("signPk")),
                        boxPk = hexToBytes(m.getString("boxPk")),
                        name = m.optString("name"),
                        colour = m.optInt("colour"),
                        avatarPreset = m.optInt("avatarPreset"),
                        avatarPhoto = unb64(m.optString("avatarPhoto")),
                        role = runCatching { Role.valueOf(m.optString("role")) }.getOrDefault(Role.MEMBER),
                        joinedAt = m.optLong("joinedAt"),
                        position = m.optJSONObject("position")?.let(::posFrom),
                        lastHeardMs = m.optLong("lastHeardMs"),
                        hops = m.optInt("hops"),
                        via = runCatching { Via.valueOf(m.optString("via")) }.getOrDefault(Via.NEARBY),
                    )
                    g.members[member.id] = member
                }
            }
            o.optJSONArray("pins")?.let { arr ->
                for (i in 0 until arr.length()) {
                    val p = arr.getJSONObject(i)
                    g.pins[p.getString("id")] = Pin(p.getString("id"), p.getString("name"), p.getDouble("lat"), p.getDouble("lon"), p.optInt("floor"), p.optInt("icon"), p.optLong("updated"), p.optBoolean("deleted"))
                }
            }
            o.optJSONObject("checkin")?.let { c ->
                val state = CheckinState()
                state.planDeadline = c.optLong("planDeadline")
                c.optJSONArray("checkpoints")?.let { arr ->
                    state.planCheckpoints = List(arr.length()) { i ->
                        val cp = arr.getJSONObject(i)
                        Checkpoint(cp.getString("name"), cp.getDouble("lat"), cp.getDouble("lon"), cp.optInt("radiusM", 50))
                    }
                }
                c.optJSONObject("timers")?.let { t -> t.keys().forEach { k -> state.timers[k] = t.getLong(k) } }
                c.optJSONObject("progress")?.let { t -> t.keys().forEach { k -> state.progress[k] = t.getInt(k) } }
                c.optJSONObject("lastCheckin")?.let { t -> t.keys().forEach { k -> state.lastCheckin[k] = t.getLong(k) } }
                c.optJSONArray("alerted")?.let { a -> for (i in 0 until a.length()) state.alerted.add(a.getString(i)) }
                g.checkin = state
            }
            o.optJSONArray("licences")?.let { arr -> for (i in 0 until arr.length()) g.licences.add(arr.getString(i)) }
            return g
        }

        private fun sosJson(s: SosRecord) = JSONObject().apply {
            put("sosId", s.sosId); put("groupId", s.groupId); put("memberId", s.memberId); put("kind", s.kind.name)
            put("silent", s.silent); put("position", posJson(s.position)); put("card", cardJson(s.card))
            put("startedAt", s.startedAt); put("lastAt", s.lastAt); put("hops", s.hops); put("resolved", s.resolved)
            put("resolvedBy", s.resolvedBy)
        }

        private fun sosFrom(o: JSONObject) = SosRecord(
            sosId = o.getString("sosId"),
            groupId = o.getString("groupId"),
            memberId = o.getString("memberId"),
            kind = SosKind.valueOf(o.getString("kind")),
            silent = o.optBoolean("silent"),
            position = posFrom(o.getJSONObject("position")),
            card = o.optJSONObject("card")?.let(::cardFrom) ?: EmergencyCard(),
            startedAt = o.getLong("startedAt"),
            lastAt = o.getLong("lastAt"),
            hops = o.optInt("hops"),
            resolved = o.optBoolean("resolved"),
            resolvedBy = o.optString("resolvedBy"),
        )
    }
}

/** Chat, quick replies, thumbnails and moments, as kept in the message log. */
data class ChatMessage(
    val msgId: String,
    val groupId: String,
    val senderId: String,
    val recipientId: String?,
    val outgoing: Boolean,
    val kind: String,
    val text: String,
    val quickCode: Int,
    val lat: Double?,
    val lon: Double?,
    val pinId: String?,
    val image: ByteArray?,
    val fullSize: Long,
    val createdAt: Long,
    var state: MessageState,
    val deliveredTo: MutableSet<String> = mutableSetOf(),
    val readBy: MutableSet<String> = mutableSetOf(),
    var hops: Int = 0,
)

/** D3 delivery states. RECEIVED is used for incoming messages. */
enum class MessageState { SENDING, IN_MESH, DELIVERED, READ, RECEIVED }

/** Message log (Android: SQLite; tests: memory). */
interface MessageLog {
    fun add(message: ChatMessage)
    fun get(msgId: String): ChatMessage?
    fun update(message: ChatMessage)
    fun list(groupId: String, peerId: String?, beforeMs: Long, limit: Int): List<ChatMessage>
    fun all(groupId: String): List<ChatMessage>
    fun deleteGroup(groupId: String)
    fun clear()
}

class MemoryMessageLog : MessageLog {
    private val map = LinkedHashMap<String, ChatMessage>()
    @Synchronized override fun add(message: ChatMessage) { map.putIfAbsent(message.msgId, message) }
    @Synchronized override fun get(msgId: String) = map[msgId]
    @Synchronized override fun update(message: ChatMessage) { map[message.msgId] = message }
    @Synchronized override fun list(groupId: String, peerId: String?, beforeMs: Long, limit: Int): List<ChatMessage> =
        map.values.filter { it.groupId == groupId && it.createdAt < beforeMs && matchesPeer(it, peerId) }
            .sortedByDescending { it.createdAt }.take(limit)
    @Synchronized override fun all(groupId: String) = map.values.filter { it.groupId == groupId }
    @Synchronized override fun deleteGroup(groupId: String) { map.values.removeAll { it.groupId == groupId } }
    @Synchronized override fun clear() = map.clear()

    private fun matchesPeer(m: ChatMessage, peerId: String?): Boolean =
        if (peerId == null) m.recipientId == null else m.recipientId != null && (m.senderId == peerId || m.recipientId == peerId)
}

data class Breadcrumb(val memberId: String, val atSec: Long, val lat: Double, val lon: Double)

/** Breadcrumb trail (C7): last 2 hours per member, capped in size. */
interface BreadcrumbLog {
    fun add(groupId: String, crumb: Breadcrumb)
    fun list(groupId: String, memberId: String, sinceSec: Long): List<Breadcrumb>
    fun prune(beforeSec: Long)
    fun deleteGroup(groupId: String)
    fun clear()
}

class MemoryBreadcrumbLog(private val maxPoints: Int = MAX_POINTS) : BreadcrumbLog {
    private val points = ArrayDeque<Pair<String, Breadcrumb>>()
    @Synchronized override fun add(groupId: String, crumb: Breadcrumb) {
        points.addLast(groupId to crumb)
        while (points.size > maxPoints) points.removeFirst()
    }
    @Synchronized override fun list(groupId: String, memberId: String, sinceSec: Long) =
        points.filter { it.first == groupId && it.second.memberId == memberId && it.second.atSec >= sinceSec }.map { it.second }
    @Synchronized override fun prune(beforeSec: Long) { points.removeAll { it.second.atSec < beforeSec } }
    @Synchronized override fun deleteGroup(groupId: String) { points.removeAll { it.first == groupId } }
    @Synchronized override fun clear() = points.clear()

    companion object {
        /** About 40 bytes per point on disk: 125,000 points keep the log under 5 MB (C7). */
        const val MAX_POINTS = 125_000
        const val WINDOW_SEC = 2 * 3_600L
    }
}

/** Persistence for [CoreState] (Android: an atomic file). */
interface StateStore {
    fun load(): String?
    fun save(json: String)
    fun clear()
}

class MemoryStateStore : StateStore {
    var value: String? = null
    override fun load() = value
    override fun save(json: String) { value = json }
    override fun clear() { value = null }
}

fun ByteArray.hex(): String = toHex()

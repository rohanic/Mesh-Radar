package com.rohanic.meshradar.core.engine

import com.rohanic.meshradar.core.geo.Geo
import com.rohanic.meshradar.core.model.ChatMessage
import com.rohanic.meshradar.core.model.CheckinState
import com.rohanic.meshradar.core.model.CrowdReport
import com.rohanic.meshradar.core.model.CrumbRecord
import com.rohanic.meshradar.core.model.EventPost
import com.rohanic.meshradar.core.model.Group
import com.rohanic.meshradar.core.model.Member
import com.rohanic.meshradar.core.model.OwnSos
import com.rohanic.meshradar.core.model.Pin
import com.rohanic.meshradar.core.model.PublicSosRecord
import com.rohanic.meshradar.core.model.SosRecord
import com.rohanic.meshradar.core.model.hex
import com.rohanic.meshradar.core.protocol.DrillBody
import com.rohanic.meshradar.core.protocol.EmergencyCard
import com.rohanic.meshradar.core.protocol.Position
import com.rohanic.meshradar.core.protocol.UwbBody
import java.util.Base64

/**
 * JS-facing shapes. Keys and types must match modules/mesh-engine/src/MeshEngine.types.ts.
 * Times are milliseconds since the epoch; IDs are lowercase hex; images are base64.
 */
object Maps {
    private fun b64(b: ByteArray?): String? = b?.takeIf { it.isNotEmpty() }?.let { Base64.getEncoder().encodeToString(it) }

    fun position(p: Position): Map<String, Any?> = mapOf(
        "lat" to p.lat,
        "lon" to p.lon,
        "altM" to p.altM,
        "pressurePa" to p.pressurePa,
        "accuracyM" to p.accuracyM,
        "heading" to p.heading,
        "battery" to p.battery,
        "charging" to (p.flags and Position.FLAG_CHARGING != 0),
        "sos" to (p.flags and Position.FLAG_SOS != 0),
        "ultraSaver" to (p.flags and Position.FLAG_ULTRA_SAVER != 0),
        "fixTimeMs" to p.fixTime * 1000,
    )

    fun card(c: EmergencyCard): Map<String, Any?> = mapOf(
        "name" to c.name,
        "bloodGroup" to c.bloodGroup,
        "conditions" to c.conditions,
        "medicines" to c.medicines,
        "contactName" to c.contactName,
        "contactPhone" to c.contactPhone,
        "stay" to c.stay,
    )

    fun member(m: Member, myId: String): Map<String, Any?> = mapOf(
        "id" to m.id,
        "name" to m.name,
        "colour" to m.colour,
        "avatarPreset" to m.avatarPreset,
        "avatarPhoto" to b64(m.avatarPhoto),
        "role" to m.role.name.lowercase(),
        "joinedAtMs" to m.joinedAt * 1000,
        "position" to m.position?.let { position(it) },
        "lastHeardMs" to m.lastHeardMs,
        "hops" to m.hops,
        "via" to m.via.name.lowercase(),
        "isSelf" to (m.id == myId),
        "signPk" to m.signPk.hex(),
    )

    fun group(g: Group, myId: String, tier: Tier): Map<String, Any?> = mapOf(
        "id" to g.id,
        "name" to g.name,
        "eventId" to g.eventId,
        "colour" to g.colour,
        "archived" to g.archived,
        "createdAtMs" to g.createdAt * 1000,
        "expiresAtMs" to g.expiresAt * 1000,
        "memberCount" to g.members.size,
        "maxMembers" to g.maxMembers.coerceAtMost(Tier.ORGANISER.maxMembers),
        "isLeader" to (g.members[myId]?.let { it.signPk.contentEquals(g.leaderSignPk) } ?: false),
        "myRole" to (g.members[myId]?.role?.name?.lowercase() ?: "member"),
        "separationM" to g.separationM,
        "tier" to tier.name.lowercase(),
    )

    fun pin(p: Pin): Map<String, Any?> = mapOf(
        "id" to p.id,
        "name" to p.name,
        "lat" to p.lat,
        "lon" to p.lon,
        "floor" to p.floor,
        "icon" to p.icon,
        "updatedMs" to p.updated * 1000,
    )

    fun checkin(c: CheckinState): Map<String, Any?> = mapOf(
        "planDeadlineMs" to c.planDeadline * 1000,
        "checkpoints" to c.planCheckpoints.map { mapOf("name" to it.name, "lat" to it.lat, "lon" to it.lon, "radiusM" to it.radiusM) },
        "timers" to c.timers.mapValues { it.value * 1000 },
        "progress" to c.progress.toMap(),
        "lastCheckinMs" to c.lastCheckin.mapValues { it.value * 1000 },
    )

    fun message(m: ChatMessage): Map<String, Any?> = mapOf(
        "msgId" to m.msgId,
        "groupId" to m.groupId,
        "senderId" to m.senderId,
        "recipientId" to m.recipientId,
        "outgoing" to m.outgoing,
        "kind" to m.kind,
        "text" to m.text,
        "quickCode" to m.quickCode,
        "lat" to m.lat,
        "lon" to m.lon,
        "refId" to m.pinId,
        "image" to b64(m.image),
        "fullSize" to m.fullSize,
        "createdAtMs" to m.createdAt,
        "state" to m.state.name.lowercase(),
        "delivered" to m.deliveredTo.size,
        "read" to m.readBy.size,
        "hops" to m.hops,
    )

    fun ownSos(s: OwnSos): Map<String, Any?> = mapOf(
        "sosId" to s.sosId,
        "kind" to s.kind.name.lowercase(),
        "silent" to s.silent,
        "startedAtMs" to s.startedAt * 1000,
        "broadcasts" to s.seq,
    )

    fun sos(s: SosRecord, member: Map<String, Any?>?): Map<String, Any?> = mapOf(
        "sosId" to s.sosId,
        "groupId" to s.groupId,
        "memberId" to s.memberId,
        "member" to member,
        "kind" to s.kind.name.lowercase(),
        "silent" to s.silent,
        "position" to position(s.position),
        "card" to card(s.card),
        "startedAtMs" to s.startedAt * 1000,
        "lastAtMs" to s.lastAt,
        "hops" to s.hops,
        "resolved" to s.resolved,
    )

    /** Strangers get a rough direction and "within about X m", never an exact location (E1). */
    fun publicSos(s: PublicSosRecord, own: Position?): Map<String, Any?> {
        val base = mapOf("sosId" to s.sosId, "kind" to s.kind.name.lowercase(), "lastAtMs" to s.lastAt, "active" to s.active)
        if (own == null) return base + mapOf("direction" to null, "withinM" to null)
        val d = Geo.distanceM(own.lat, own.lon, s.lat, s.lon)
        val b = Geo.bearingDeg(own.lat, own.lon, s.lat, s.lon)
        val within = (Math.ceil((d + s.radiusM) / 50.0) * 50).toInt()
        return base + mapOf("direction" to Geo.compass8(b), "bearing" to Math.round(b / 45.0) * 45.0 % 360, "withinM" to within)
    }

    fun crumb(c: CrumbRecord, member: Map<String, Any?>?): Map<String, Any?> = mapOf(
        "groupId" to c.groupId,
        "memberId" to c.memberId,
        "member" to member,
        "reason" to c.reason,
        "position" to position(c.position),
        "receivedAtMs" to c.receivedAt,
        "expiresAtMs" to c.receivedAt + 24 * 3_600_000L,
    )

    fun post(p: EventPost): Map<String, Any?> = mapOf(
        "msgId" to p.msgId,
        "eventId" to p.eventId,
        "sender" to p.senderPk.take(8),
        "text" to p.text,
        "atMs" to p.at,
        "mine" to p.mine,
    )

    fun drill(groupId: String, senderId: String, d: DrillBody): Map<String, Any?> = mapOf(
        "groupId" to groupId,
        "senderId" to senderId,
        "kind" to d.kind.name.lowercase(),
        "drillId" to d.drillId.hex(),
        "hiderId" to d.hiderId.hex(),
        "durationSec" to d.durationSec,
        "startedAtMs" to d.startedAt * 1000,
    )

    fun uwb(groupId: String, senderId: String, u: UwbBody): Map<String, Any?> = mapOf(
        "groupId" to groupId,
        "senderId" to senderId,
        "op" to u.op.name.lowercase(),
        "sessionId" to u.sessionId,
        "address" to Base64.getEncoder().encodeToString(u.address),
        "channel" to u.channel,
        "preamble" to u.preamble,
        "sessionKey" to Base64.getEncoder().encodeToString(u.sessionKey),
        "configType" to u.configType,
    )

    fun licence(l: Licence): Map<String, Any?> = mapOf(
        "id" to l.id,
        "tier" to l.tier.name.lowercase(),
        "expiresAtMs" to l.expiresAt * 1000,
        "issuedAtMs" to l.issuedAt * 1000,
    )

    fun tier(t: Tier): Map<String, Any?> = mapOf(
        "tier" to t.name.lowercase(),
        "maxMembers" to t.maxMembers,
        "maxActiveGroups" to t.maxActiveGroups,
        "allPacks" to t.allPacks,
        "breadcrumbs" to t.breadcrumbs,
        "separationAlerts" to t.separationAlerts,
        "memories" to t.memories,
        "familyCircle" to t.familyCircle,
        "organiser" to t.organiser,
    )

    fun crowd(r: CrowdReport): Map<String, Any?> = mapOf(
        "alertId" to r.alertId,
        "kind" to r.kind.lowercase(),
        "label" to r.label,
        "lat" to r.lat,
        "lon" to r.lon,
        "atMs" to r.receivedAt,
        "organiser" to r.organiser,
    )
}

/** Crowd alert verification (E8). */
object CrowdVerifier {
    const val RADIUS_M = 200.0
    const val WINDOW_MS = 5 * 60_000L
    const val REPORTS_NEEDED = 3

    /**
     * Groups reports of the same kind that lie within [RADIUS_M] of the cluster's first report and
     * arrived within [WINDOW_MS] of it. Verified when 3 independent senders agree, or an organiser
     * signed one of them. Reports older than an hour are ignored.
     */
    fun clusters(reports: List<CrowdReport>, nowMs: Long): List<Map<String, Any?>> {
        val recent = reports.filter { nowMs - it.receivedAt <= 3_600_000L }.sortedBy { it.receivedAt }
        val used = HashSet<String>()
        val out = mutableListOf<Map<String, Any?>>()
        for (anchor in recent) {
            if (anchor.alertId in used) continue
            val members = recent.filter {
                it.alertId !in used && it.kind == anchor.kind &&
                    it.receivedAt - anchor.receivedAt in 0..WINDOW_MS &&
                    Geo.distanceM(anchor.lat, anchor.lon, it.lat, it.lon) <= RADIUS_M
            }
            members.forEach { used.add(it.alertId) }
            val senders = members.map { it.senderPk }.toSet()
            val organiser = members.firstOrNull { it.organiser.isNotBlank() }?.organiser ?: ""
            val verified = senders.size >= REPORTS_NEEDED || organiser.isNotBlank()
            out.add(
                mapOf(
                    "clusterId" to anchor.alertId,
                    "kind" to anchor.kind.lowercase(),
                    "label" to (members.firstOrNull { it.organiser.isNotBlank() }?.label ?: anchor.label),
                    "lat" to members.map { it.lat }.average(),
                    "lon" to members.map { it.lon }.average(),
                    "reports" to senders.size,
                    "verified" to verified,
                    "organiser" to organiser,
                    "firstAtMs" to anchor.receivedAt,
                    "lastAtMs" to members.maxOf { it.receivedAt },
                ),
            )
        }
        return out
    }
}

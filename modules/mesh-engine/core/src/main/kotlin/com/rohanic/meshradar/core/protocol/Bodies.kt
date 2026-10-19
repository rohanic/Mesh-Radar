package com.rohanic.meshradar.core.protocol

import kotlin.math.roundToInt
import kotlin.math.roundToLong

/** Common limits (PRD D5, A3). */
object Limits {
    const val TEXT_CHARS = 500
    const val TEXT_BYTES = 2_000
    const val NAME_BYTES = 64
    const val AVATAR_BYTES = 4 * 1024
    const val THUMB_BYTES = 8 * 1024
    const val PACK_BYTES = 16 * 1024
    const val EVENT_TEXT_CHARS = 280
    const val LICENCE_BYTES = 1_024
    const val RECEIPT_IDS = 32
    const val CHECKPOINTS = 20
}

/**
 * A position fix, 24 bytes on the wire (PRD section 8: lat/lon as int32 x 1e7, altitude, pressure,
 * accuracy, heading, battery, timestamp).
 */
data class Position(
    val lat: Double,
    val lon: Double,
    val altM: Int? = null,
    val pressurePa: Int? = null,
    val accuracyM: Double = 0.0,
    val heading: Double? = null,
    val battery: Int? = null,
    val flags: Int = 0,
    val fixTime: Long,
) {
    fun write(w: ByteWriter) {
        w.i32((lat * 1e7).roundToLong().toInt())
        w.i32((lon * 1e7).roundToLong().toInt())
        w.i16(altM ?: ALT_UNKNOWN)
        w.u32((pressurePa ?: 0).toLong())
        w.u16((accuracyM * 10).roundToInt().coerceIn(0, 0xFFFF))
        w.u16(heading?.let { (((it % 360) + 360) % 360 * 100).roundToInt().coerceIn(0, 35_999) } ?: 0xFFFF)
        w.u8(battery?.coerceIn(0, 100) ?: 0xFF)
        w.u8(flags)
        w.u32(fixTime)
    }

    companion object {
        const val SIZE = 24
        const val ALT_UNKNOWN = Short.MIN_VALUE.toInt()
        const val FLAG_CHARGING = 1
        const val FLAG_ULTRA_SAVER = 2
        const val FLAG_SOS = 4

        fun read(r: ByteReader): Position {
            val lat = r.i32() / 1e7
            val lon = r.i32() / 1e7
            if (lat !in -90.0..90.0 || lon !in -180.0..180.0) throw MalformedPacketException("bad coordinates")
            val alt = r.i16()
            val pressure = r.u32()
            val acc = r.u16() / 10.0
            val heading = r.u16()
            val battery = r.u8()
            val flags = r.u8()
            val fix = r.u32()
            return Position(
                lat = lat,
                lon = lon,
                altM = if (alt == ALT_UNKNOWN) null else alt,
                pressurePa = if (pressure == 0L) null else pressure.toInt(),
                accuracyM = acc,
                heading = if (heading == 0xFFFF) null else heading / 100.0,
                battery = if (battery == 0xFF) null else battery,
                flags = flags,
                fixTime = fix,
            )
        }
    }
}

fun ByteWriter.latLon(lat: Double, lon: Double) = apply {
    i32((lat * 1e7).roundToLong().toInt())
    i32((lon * 1e7).roundToLong().toInt())
}

fun ByteReader.latLon(): Pair<Double, Double> {
    val lat = i32() / 1e7
    val lon = i32() / 1e7
    if (lat !in -90.0..90.0 || lon !in -180.0..180.0) throw MalformedPacketException("bad coordinates")
    return lat to lon
}

/** Emergency card (A4). Sent to the group inside SOS so rescuers and family can see it. */
data class EmergencyCard(
    val name: String = "",
    val bloodGroup: String = "",
    val conditions: String = "",
    val medicines: String = "",
    val contactName: String = "",
    val contactPhone: String = "",
    val stay: String = "",
) {
    fun write(w: ByteWriter) {
        w.str(name, 64).str(bloodGroup, 8).str(conditions, 300).str(medicines, 300)
            .str(contactName, 64).str(contactPhone, 32).str(stay, 120)
    }

    companion object {
        fun read(r: ByteReader) = EmergencyCard(
            name = r.str(64),
            bloodGroup = r.str(8),
            conditions = r.str(300),
            medicines = r.str(300),
            contactName = r.str(64),
            contactPhone = r.str(32),
            stay = r.str(120),
        )
    }
}

/** Every packet body knows its type and how to write itself. */
sealed interface Body {
    val type: PacketType
    fun write(w: ByteWriter)
    fun encode(): ByteArray = ByteWriter().also { write(it) }.toByteArray()
}

data class PositionBody(val position: Position) : Body {
    override val type get() = PacketType.POSITION
    override fun write(w: ByteWriter) = position.write(w)
}

enum class ChatKind { TEXT, QUICK, LOCATION, SYSTEM }

/** Group chat or direct message content (D1, D2, D5). Quick replies travel as codes (section 11). */
data class ChatBody(
    val kind: ChatKind,
    val text: String = "",
    val quickCode: Int = 0,
    val lat: Double? = null,
    val lon: Double? = null,
    val pinId: ByteArray? = null,
) : Body {
    override val type get() = PacketType.CHAT
    override fun write(w: ByteWriter) {
        var flags = 0
        if (lat != null && lon != null) flags = flags or 1
        if (pinId != null) flags = flags or 2
        w.u8(kind.ordinal).u8(flags).str(text, Limits.TEXT_BYTES).u16(quickCode)
        if (flags and 1 != 0) w.latLon(lat!!, lon!!)
        if (flags and 2 != 0) w.fixed(pinId!!, 16)
    }

    companion object {
        fun read(r: ByteReader): ChatBody {
            val kind = ChatKind.entries.getOrNull(r.u8()) ?: throw MalformedPacketException("chat kind")
            val flags = r.u8()
            val text = r.str(Limits.TEXT_BYTES)
            val quick = r.u16()
            val loc = if (flags and 1 != 0) r.latLon() else null
            val pin = if (flags and 2 != 0) r.bytes(16) else null
            return ChatBody(kind, text, quick, loc?.first, loc?.second, pin)
        }
    }
}

enum class SosKind { GENERAL, MEDICAL, LOST, DANGER }

/** Group SOS with exact location and the emergency card (E1, E2). Re-sent every 30 s with seq+1. */
data class SosBody(
    val sosId: ByteArray,
    val kind: SosKind,
    val silent: Boolean,
    val seq: Int,
    val position: Position,
    val card: EmergencyCard,
) : Body {
    override val type get() = PacketType.SOS
    override fun write(w: ByteWriter) {
        w.fixed(sosId, 16).u8(kind.ordinal).u8(if (silent) 1 else 0).u16(seq)
        position.write(w)
        card.write(w)
    }

    companion object {
        fun read(r: ByteReader) = SosBody(
            sosId = r.bytes(16),
            kind = SosKind.entries.getOrNull(r.u8()) ?: SosKind.GENERAL,
            silent = r.u8() and 1 == 1,
            seq = r.u16(),
            position = Position.read(r),
            card = EmergencyCard.read(r),
        )
    }
}

enum class ResolveReason { SAFE, FOUND, FALSE_ALARM }

data class SosResolveBody(val sosId: ByteArray, val reason: ResolveReason) : Body {
    override val type get() = PacketType.SOS_RESOLVE
    override fun write(w: ByteWriter) {
        w.fixed(sosId, 16).u8(reason.ordinal)
    }

    companion object {
        fun read(r: ByteReader) = SosResolveBody(r.bytes(16), ResolveReason.entries.getOrNull(r.u8()) ?: ResolveReason.SAFE)
    }
}

/**
 * "Someone nearby needs help" for every app user in range (E1). Carries only a coarse cell and a
 * radius, never the exact location (privacy commitment 5).
 */
data class PublicSosBody(
    val sosId: ByteArray,
    val kind: SosKind,
    val coarseLat: Double,
    val coarseLon: Double,
    val radiusM: Int,
    val active: Boolean = true,
) : Body {
    override val type get() = PacketType.PUBLIC_SOS
    override fun write(w: ByteWriter) {
        w.fixed(sosId, 16).u8(kind.ordinal).latLon(coarseLat, coarseLon).u16(radiusM.coerceIn(0, 0xFFFF)).u8(if (active) 1 else 0)
    }

    companion object {
        fun read(r: ByteReader): PublicSosBody {
            val id = r.bytes(16)
            val kind = SosKind.entries.getOrNull(r.u8()) ?: SosKind.GENERAL
            val (lat, lon) = r.latLon()
            return PublicSosBody(id, kind, lat, lon, r.u16(), r.u8() == 1)
        }
    }
}

/** Sent by anyone who scans a lost-child card; only the family can read it (E6). */
data class LostChildBody(
    val alertId: ByteArray,
    val childName: String,
    val note: String,
    val position: Position?,
) : Body {
    override val type get() = PacketType.LOST_CHILD
    override fun write(w: ByteWriter) {
        w.fixed(alertId, 16).str(childName, Limits.NAME_BYTES).str(note, 400).u8(if (position != null) 1 else 0)
        position?.write(w)
    }

    companion object {
        fun read(r: ByteReader): LostChildBody {
            val id = r.bytes(16)
            val name = r.str(Limits.NAME_BYTES)
            val note = r.str(400)
            val pos = if (r.u8() == 1) Position.read(r) else null
            return LostChildBody(id, name, note, pos)
        }
    }
}

enum class CrumbReason(val percent: Int) { BATTERY_15(15), BATTERY_5(5), BATTERY_2(2), SHUTDOWN(0), MANUAL(-1) }

/** Last-Crumb beacon (E3): final position, altitude and battery; relays keep it 24 h. */
data class CrumbBody(val reason: CrumbReason, val position: Position) : Body {
    override val type get() = PacketType.CRUMB
    override fun write(w: ByteWriter) {
        w.u8(reason.ordinal)
        position.write(w)
    }

    companion object {
        fun read(r: ByteReader) = CrumbBody(CrumbReason.entries.getOrNull(r.u8()) ?: CrumbReason.MANUAL, Position.read(r))
    }
}

data class Checkpoint(val name: String, val lat: Double, val lon: Double, val radiusM: Int)

enum class CheckinKind { CHECKED_IN, TIMER_SET, TIMER_CANCEL, MISSED, PLAN_SET }

/** Trek check-ins (E7, flow 5). PLAN_SET carries the leader's checkpoints and deadline. */
data class CheckinBody(
    val kind: CheckinKind,
    val checkpoint: Int = -1,
    val deadline: Long = 0,
    val position: Position? = null,
    val checkpoints: List<Checkpoint> = emptyList(),
    val forMember: ByteArray? = null,
) : Body {
    override val type get() = PacketType.CHECKIN
    override fun write(w: ByteWriter) {
        w.u8(kind.ordinal).u8(if (checkpoint < 0) 0xFF else checkpoint).u32(deadline)
        w.u8(if (position != null) 1 else 0)
        position?.write(w)
        val list = checkpoints.take(Limits.CHECKPOINTS)
        w.u8(list.size)
        list.forEach { w.str(it.name, 60).latLon(it.lat, it.lon).u16(it.radiusM.coerceIn(0, 0xFFFF)) }
        w.u8(if (forMember != null) 1 else 0)
        forMember?.let { w.fixed(it, 8) }
    }

    companion object {
        fun read(r: ByteReader): CheckinBody {
            val kind = CheckinKind.entries.getOrNull(r.u8()) ?: throw MalformedPacketException("checkin kind")
            val cp = r.u8().let { if (it == 0xFF) -1 else it }
            val deadline = r.u32()
            val pos = if (r.u8() == 1) Position.read(r) else null
            val n = r.u8()
            if (n > Limits.CHECKPOINTS) throw MalformedPacketException("too many checkpoints")
            val list = List(n) {
                val name = r.str(60)
                val (lat, lon) = r.latLon()
                Checkpoint(name, lat, lon, r.u16())
            }
            val forMember = if (r.u8() == 1) r.bytes(8) else null
            return CheckinBody(kind, cp, deadline, pos, list, forMember)
        }
    }
}

/** Member announcement: keys and profile (A3: avatar photo under 4 KB). */
data class MemberBody(
    val signPk: ByteArray,
    val boxPk: ByteArray,
    val name: String,
    val colour: Int,
    val avatarPreset: Int,
    val avatarPhoto: ByteArray,
    val appVersion: Int,
    val joinedAt: Long,
) : Body {
    override val type get() = PacketType.MEMBER
    override fun write(w: ByteWriter) {
        require(avatarPhoto.size <= Limits.AVATAR_BYTES) { "avatar over 4 KB" }
        w.fixed(signPk, 32).fixed(boxPk, 32).str(name, Limits.NAME_BYTES).u8(colour).u16(avatarPreset)
            .blob(avatarPhoto).u16(appVersion).u32(joinedAt)
    }

    companion object {
        fun read(r: ByteReader) = MemberBody(
            signPk = r.bytes(32),
            boxPk = r.bytes(32),
            name = r.str(Limits.NAME_BYTES),
            colour = r.u8(),
            avatarPreset = r.u16(),
            avatarPhoto = r.blob(Limits.AVATAR_BYTES),
            appVersion = r.u16(),
            joinedAt = r.u32(),
        )
    }
}

enum class Role { LEADER, MEMBER, ELDER, CHILD }

enum class RoleOp { SET_ROLE, SETTINGS, TRANSFER_LEADER, REMOVE }

/** Leader-only changes (B3, B6, E9). Receivers ignore ROLE packets not signed by the leader. */
data class RoleBody(
    val op: RoleOp,
    val memberId: ByteArray = ByteArray(8),
    val role: Role = Role.MEMBER,
    val separationM: Int = 0,
    val expiresAt: Long = 0,
    val groupName: String = "",
) : Body {
    override val type get() = PacketType.ROLE
    override fun write(w: ByteWriter) {
        w.u8(op.ordinal).fixed(memberId, 8).u8(role.ordinal).u16(separationM.coerceIn(0, 0xFFFF)).u32(expiresAt)
            .str(groupName, Limits.NAME_BYTES)
    }

    companion object {
        fun read(r: ByteReader) = RoleBody(
            op = RoleOp.entries.getOrNull(r.u8()) ?: throw MalformedPacketException("role op"),
            memberId = r.bytes(8),
            role = Role.entries.getOrNull(r.u8()) ?: Role.MEMBER,
            separationM = r.u16(),
            expiresAt = r.u32(),
            groupName = r.str(Limits.NAME_BYTES),
        )
    }
}

/** Meeting point (C6). */
data class PinBody(
    val pinId: ByteArray,
    val deleted: Boolean,
    val name: String,
    val lat: Double,
    val lon: Double,
    val floor: Int,
    val icon: Int,
    val updated: Long,
) : Body {
    override val type get() = PacketType.PIN
    override fun write(w: ByteWriter) {
        w.fixed(pinId, 16).u8(if (deleted) 1 else 0).str(name, 120).latLon(lat, lon).i16(floor).u8(icon).u32(updated)
    }

    companion object {
        fun read(r: ByteReader): PinBody {
            val id = r.bytes(16)
            val deleted = r.u8() == 1
            val name = r.str(120)
            val (lat, lon) = r.latLon()
            return PinBody(id, deleted, name, lat, lon, r.i16(), r.u8(), r.u32())
        }
    }
}

enum class ReceiptKind { DELIVERED, READ }

/** Delivery and read receipts (D3). */
data class ReceiptBody(val kind: ReceiptKind, val msgIds: List<ByteArray>) : Body {
    override val type get() = PacketType.RECEIPT
    override fun write(w: ByteWriter) {
        val ids = msgIds.take(Limits.RECEIPT_IDS)
        w.u8(kind.ordinal).u8(ids.size)
        ids.forEach { w.fixed(it, 16) }
    }

    companion object {
        fun read(r: ByteReader): ReceiptBody {
            val kind = ReceiptKind.entries.getOrNull(r.u8()) ?: ReceiptKind.DELIVERED
            val n = r.u8()
            if (n > Limits.RECEIPT_IDS) throw MalformedPacketException("too many receipts")
            return ReceiptBody(kind, List(n) { r.bytes(16) })
        }
    }
}

/** A server-signed licence shared to the group so one payer unlocks everyone (section 10 rule 2). */
data class LicenceBody(val token: ByteArray) : Body {
    override val type get() = PacketType.LICENCE
    override fun write(w: ByteWriter) {
        w.blob(token)
    }

    companion object {
        fun read(r: ByteReader) = LicenceBody(r.blob(Limits.LICENCE_BYTES))
    }
}

enum class DrillKind { START, FOUND, END }

/** Regroup Drill game control (G4). */
data class DrillBody(val kind: DrillKind, val drillId: ByteArray, val hiderId: ByteArray, val durationSec: Int, val startedAt: Long) : Body {
    override val type get() = PacketType.DRILL
    override fun write(w: ByteWriter) {
        w.u8(kind.ordinal).fixed(drillId, 16).fixed(hiderId, 8).u16(durationSec).u32(startedAt)
    }

    companion object {
        fun read(r: ByteReader) = DrillBody(
            DrillKind.entries.getOrNull(r.u8()) ?: DrillKind.END,
            r.bytes(16),
            r.bytes(8),
            r.u16(),
            r.u32(),
        )
    }
}

/** Public event channel post (F4). */
data class EventChannelBody(val eventId: String, val text: String) : Body {
    override val type get() = PacketType.EVENT_CHANNEL
    override fun write(w: ByteWriter) {
        w.str(eventId, 64).str(text, Limits.EVENT_TEXT_CHARS * 4)
    }

    companion object {
        fun read(r: ByteReader) = EventChannelBody(r.str(64), r.str(Limits.EVENT_TEXT_CHARS * 4))
    }
}

enum class CrowdKind { CRUSH_RISK, GATE_CLOSED, FIRE, MEDICAL, FLOOD, OTHER }

/** Crowd alert report (E8). [organiserCert] is empty unless an organiser signed it. */
data class CrowdAlertBody(
    val alertId: ByteArray,
    val eventId: String,
    val kind: CrowdKind,
    val label: String,
    val lat: Double,
    val lon: Double,
    val organiserCert: ByteArray = ByteArray(0),
) : Body {
    override val type get() = PacketType.CROWD_ALERT
    override fun write(w: ByteWriter) {
        w.fixed(alertId, 16).str(eventId, 64).u8(kind.ordinal).str(label, 120).latLon(lat, lon).blob(organiserCert)
    }

    companion object {
        fun read(r: ByteReader): CrowdAlertBody {
            val id = r.bytes(16)
            val ev = r.str(64)
            val kind = CrowdKind.entries.getOrNull(r.u8()) ?: CrowdKind.OTHER
            val label = r.str(120)
            val (lat, lon) = r.latLon()
            return CrowdAlertBody(id, ev, kind, label, lat, lon, r.blob(Limits.LICENCE_BYTES))
        }
    }
}

/** Moment: a short note, optional thumbnail, pinned to a place (G2). */
data class MomentBody(
    val momentId: ByteArray,
    val note: String,
    val lat: Double?,
    val lon: Double?,
    val thumbnail: ByteArray,
    val createdAt: Long,
) : Body {
    override val type get() = PacketType.MOMENT
    override fun write(w: ByteWriter) {
        require(thumbnail.size <= Limits.THUMB_BYTES) { "thumbnail over 8 KB" }
        w.fixed(momentId, 16).str(note, Limits.TEXT_BYTES).u8(if (lat != null && lon != null) 1 else 0)
        if (lat != null && lon != null) w.latLon(lat, lon)
        w.blob(thumbnail).u32(createdAt)
    }

    companion object {
        fun read(r: ByteReader): MomentBody {
            val id = r.bytes(16)
            val note = r.str(Limits.TEXT_BYTES)
            val loc = if (r.u8() == 1) r.latLon() else null
            return MomentBody(id, note, loc?.first, loc?.second, r.blob(Limits.THUMB_BYTES), r.u32())
        }
    }
}

/** Chat thumbnail under 8 KB (D5). [fullSize] above 0 means a full photo is available nearby (D6). */
data class ThumbnailBody(val imageId: ByteArray, val caption: String, val image: ByteArray, val fullSize: Long) : Body {
    override val type get() = PacketType.THUMBNAIL
    override fun write(w: ByteWriter) {
        require(image.size <= Limits.THUMB_BYTES) { "thumbnail over 8 KB" }
        w.fixed(imageId, 16).str(caption, 400).blob(image).u32(fullSize)
    }

    companion object {
        fun read(r: ByteReader) = ThumbnailBody(r.bytes(16), r.str(400), r.blob(Limits.THUMB_BYTES), r.u32())
    }
}

/** Community-made event pack shared to the group (v1.2). JSON, gzip compressed. */
data class PackBody(val packId: String, val gzipJson: ByteArray) : Body {
    override val type get() = PacketType.PACK
    override fun write(w: ByteWriter) {
        w.str(packId, 64).blob(gzipJson)
    }

    companion object {
        fun read(r: ByteReader) = PackBody(r.str(64), r.blob(Limits.PACK_BYTES))
    }
}

enum class UwbOp { OFFER, ACCEPT, STOP }

/** UWB session parameters exchanged over the mesh (C8). */
data class UwbBody(
    val op: UwbOp,
    val sessionId: Int,
    val address: ByteArray,
    val channel: Int,
    val preamble: Int,
    val sessionKey: ByteArray,
    val configType: Int,
) : Body {
    override val type get() = PacketType.UWB
    override fun write(w: ByteWriter) {
        w.u8(op.ordinal).i32(sessionId).blob(address).u8(channel).u8(preamble).blob(sessionKey).u8(configType)
    }

    companion object {
        fun read(r: ByteReader) = UwbBody(
            UwbOp.entries.getOrNull(r.u8()) ?: UwbOp.STOP,
            r.i32(),
            r.blob(8),
            r.u8(),
            r.u8(),
            r.blob(32),
            r.u8(),
        )
    }
}

/** Join request by 6-digit code (B1). Self-signed by the joiner. */
data class JoinRequestBody(
    val requestId: ByteArray,
    val signPk: ByteArray,
    val boxPk: ByteArray,
    val name: String,
    val colour: Int,
    val avatarPreset: Int,
) : Body {
    override val type get() = PacketType.JOIN_REQUEST
    override fun write(w: ByteWriter) {
        w.fixed(requestId, 16).fixed(signPk, 32).fixed(boxPk, 32).str(name, Limits.NAME_BYTES).u8(colour).u16(avatarPreset)
    }

    companion object {
        fun read(r: ByteReader) = JoinRequestBody(r.bytes(16), r.bytes(32), r.bytes(32), r.str(Limits.NAME_BYTES), r.u8(), r.u16())
    }
}

/** Creator's reply: the invite sealed to the joiner's X25519 key with an ephemeral key (B2). */
data class JoinAcceptBody(val requestId: ByteArray, val ephemeralPk: ByteArray, val sealedInvite: ByteArray) : Body {
    override val type get() = PacketType.JOIN_ACCEPT
    override fun write(w: ByteWriter) {
        w.fixed(requestId, 16).fixed(ephemeralPk, 32).blob(sealedInvite)
    }

    companion object {
        fun read(r: ByteReader) = JoinAcceptBody(r.bytes(16), r.bytes(32), r.blob(4_096))
    }
}

/** Everything a phone needs to join a group. Carried by the QR code or sealed in a join reply. */
data class GroupInvite(
    val groupId: ByteArray,
    val name: String,
    val key: ByteArray,
    val leaderSignPk: ByteArray,
    val createdAt: Long,
    val expiresAt: Long,
    val eventId: String,
    val maxMembers: Int,
) {
    fun encode(): ByteArray = ByteWriter(160)
        .u8(INVITE_VERSION)
        .fixed(groupId, 16)
        .str(name, Limits.NAME_BYTES)
        .fixed(key, 32)
        .fixed(leaderSignPk, 32)
        .u32(createdAt)
        .u32(expiresAt)
        .str(eventId, 64)
        .u16(maxMembers)
        .toByteArray()

    companion object {
        const val INVITE_VERSION = 1

        fun decode(bytes: ByteArray): GroupInvite {
            val r = ByteReader(bytes)
            if (r.u8() != INVITE_VERSION) throw MalformedPacketException("invite version")
            return GroupInvite(r.bytes(16), r.str(Limits.NAME_BYTES), r.bytes(32), r.bytes(32), r.u32(), r.u32(), r.str(64), r.u16())
        }
    }
}

/** Decode a body for [type]. Throws [MalformedPacketException] on bad input. */
fun decodeBody(type: PacketType, bytes: ByteArray): Body {
    val r = ByteReader(bytes)
    val body: Body = when (type) {
        PacketType.POSITION -> PositionBody(Position.read(r))
        PacketType.CHAT -> ChatBody.read(r)
        PacketType.SOS -> SosBody.read(r)
        PacketType.SOS_RESOLVE -> SosResolveBody.read(r)
        PacketType.PUBLIC_SOS -> PublicSosBody.read(r)
        PacketType.LOST_CHILD -> LostChildBody.read(r)
        PacketType.CRUMB -> CrumbBody.read(r)
        PacketType.CHECKIN -> CheckinBody.read(r)
        PacketType.MEMBER -> MemberBody.read(r)
        PacketType.ROLE -> RoleBody.read(r)
        PacketType.PIN -> PinBody.read(r)
        PacketType.RECEIPT -> ReceiptBody.read(r)
        PacketType.LICENCE -> LicenceBody.read(r)
        PacketType.DRILL -> DrillBody.read(r)
        PacketType.EVENT_CHANNEL -> EventChannelBody.read(r)
        PacketType.CROWD_ALERT -> CrowdAlertBody.read(r)
        PacketType.MOMENT -> MomentBody.read(r)
        PacketType.THUMBNAIL -> ThumbnailBody.read(r)
        PacketType.PACK -> PackBody.read(r)
        PacketType.UWB -> UwbBody.read(r)
        PacketType.JOIN_REQUEST -> JoinRequestBody.read(r)
        PacketType.JOIN_ACCEPT -> JoinAcceptBody.read(r)
    }
    if (r.remaining() != 0) throw MalformedPacketException("trailing bytes in ${type.name}")
    return body
}

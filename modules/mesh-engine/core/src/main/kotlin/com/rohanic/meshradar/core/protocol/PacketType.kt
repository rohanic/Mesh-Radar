package com.rohanic.meshradar.core.protocol

/**
 * Who can open a packet.
 * GROUP: group key (or a key derived from it). PUBLIC: anyone running the app (event channel,
 * crowd alerts, public SOS). LINK: one-hop handshakes between phones in radio range (join by code).
 */
enum class Scope { GROUP, PUBLIC, LINK }

/**
 * Packet types, priority (0 = highest) and lifetime (PRD section 8: SOS, then Last-Crumb, then
 * Position, then Check-in, then Chat, then Thumbnail; 6 h chat, 24 h SOS and Last-Crumb).
 * [maxTtl] is the hop limit (7 for the mesh, 3 for the event channel and public SOS, 1 for joins).
 * [damped] packets are subject to crowd damping; safety packets are always relayed (DEC-010).
 */
enum class PacketType(
    val code: Int,
    val priority: Int,
    val lifetimeSec: Long,
    val scope: Scope,
    val maxTtl: Int,
    val damped: Boolean,
) {
    SOS(1, 0, HOURS_24, Scope.GROUP, 7, false),
    SOS_RESOLVE(2, 0, HOURS_24, Scope.GROUP, 7, false),
    PUBLIC_SOS(3, 0, 3_600, Scope.PUBLIC, 3, false),
    LOST_CHILD(4, 0, HOURS_24, Scope.GROUP, 7, false),
    CRUMB(5, 1, HOURS_24, Scope.GROUP, 7, false),
    CROWD_ALERT(6, 1, 3_600, Scope.PUBLIC, 7, true),
    POSITION(7, 2, 600, Scope.GROUP, 7, true),
    UWB(8, 2, 120, Scope.GROUP, 7, true),
    CHECKIN(9, 3, HOURS_24, Scope.GROUP, 7, true),
    MEMBER(10, 3, HOURS_24, Scope.GROUP, 7, true),
    ROLE(11, 3, HOURS_24, Scope.GROUP, 7, true),
    PIN(12, 3, HOURS_24, Scope.GROUP, 7, true),
    CHAT(13, 4, HOURS_6, Scope.GROUP, 7, true),
    RECEIPT(14, 4, HOURS_6, Scope.GROUP, 7, true),
    LICENCE(15, 4, HOURS_24, Scope.GROUP, 7, true),
    DRILL(16, 4, HOURS_6, Scope.GROUP, 7, true),
    EVENT_CHANNEL(17, 4, 3_600, Scope.PUBLIC, 3, true),
    MOMENT(18, 5, HOURS_6, Scope.GROUP, 7, true),
    THUMBNAIL(19, 5, HOURS_6, Scope.GROUP, 7, true),
    PACK(20, 5, HOURS_24, Scope.GROUP, 7, true),
    JOIN_REQUEST(30, 3, 600, Scope.LINK, 1, false),
    JOIN_ACCEPT(31, 3, 600, Scope.LINK, 1, false),
    ;

    companion object {
        private val byCode = entries.associateBy { it.code }
        fun of(code: Int): PacketType = byCode[code] ?: throw MalformedPacketException("unknown type $code")
    }
}

const val HOURS_6: Long = 6 * 3_600
const val HOURS_24: Long = 24 * 3_600

/** Mesh-wide hop limit (D4: up to 7 hops; DEC-002 resolves the 5 vs 7 conflict in the PRD). */
const val MAX_HOPS = 7

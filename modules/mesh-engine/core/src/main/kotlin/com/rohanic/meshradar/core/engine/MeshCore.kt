package com.rohanic.meshradar.core.engine

import com.rohanic.meshradar.core.crypto.Crypto
import com.rohanic.meshradar.core.crypto.Tags
import com.rohanic.meshradar.core.geo.Geo
import com.rohanic.meshradar.core.model.Breadcrumb
import com.rohanic.meshradar.core.model.BreadcrumbLog
import com.rohanic.meshradar.core.model.ChatMessage
import com.rohanic.meshradar.core.model.CoreState
import com.rohanic.meshradar.core.model.CrowdReport
import com.rohanic.meshradar.core.model.CrumbRecord
import com.rohanic.meshradar.core.model.EventPost
import com.rohanic.meshradar.core.model.Group
import com.rohanic.meshradar.core.model.Member
import com.rohanic.meshradar.core.model.MemoryBreadcrumbLog
import com.rohanic.meshradar.core.model.MessageLog
import com.rohanic.meshradar.core.model.MessageState
import com.rohanic.meshradar.core.model.OwnSos
import com.rohanic.meshradar.core.model.Pin
import com.rohanic.meshradar.core.model.PowerMode
import com.rohanic.meshradar.core.model.PublicSosRecord
import com.rohanic.meshradar.core.model.SosRecord
import com.rohanic.meshradar.core.model.StateStore
import com.rohanic.meshradar.core.model.Via
import com.rohanic.meshradar.core.model.hex
import com.rohanic.meshradar.core.protocol.BROADCAST
import com.rohanic.meshradar.core.protocol.Body
import com.rohanic.meshradar.core.protocol.ChatBody
import com.rohanic.meshradar.core.protocol.ChatKind
import com.rohanic.meshradar.core.protocol.CheckinBody
import com.rohanic.meshradar.core.protocol.CheckinKind
import com.rohanic.meshradar.core.protocol.Checkpoint
import com.rohanic.meshradar.core.protocol.CrowdAlertBody
import com.rohanic.meshradar.core.protocol.CrowdKind
import com.rohanic.meshradar.core.protocol.CrumbBody
import com.rohanic.meshradar.core.protocol.CrumbReason
import com.rohanic.meshradar.core.protocol.DrillBody
import com.rohanic.meshradar.core.protocol.DrillKind
import com.rohanic.meshradar.core.protocol.Envelope
import com.rohanic.meshradar.core.protocol.EventChannelBody
import com.rohanic.meshradar.core.protocol.Frame
import com.rohanic.meshradar.core.protocol.GroupInner
import com.rohanic.meshradar.core.protocol.GroupInvite
import com.rohanic.meshradar.core.protocol.Header
import com.rohanic.meshradar.core.protocol.JoinAcceptBody
import com.rohanic.meshradar.core.protocol.JoinRequestBody
import com.rohanic.meshradar.core.protocol.LicenceBody
import com.rohanic.meshradar.core.protocol.Limits
import com.rohanic.meshradar.core.protocol.LostChildBody
import com.rohanic.meshradar.core.protocol.MalformedPacketException
import com.rohanic.meshradar.core.protocol.MemberBody
import com.rohanic.meshradar.core.protocol.MomentBody
import com.rohanic.meshradar.core.protocol.PackBody
import com.rohanic.meshradar.core.protocol.Packet
import com.rohanic.meshradar.core.protocol.PacketType
import com.rohanic.meshradar.core.protocol.PinBody
import com.rohanic.meshradar.core.protocol.Position
import com.rohanic.meshradar.core.protocol.PositionBody
import com.rohanic.meshradar.core.protocol.PublicSosBody
import com.rohanic.meshradar.core.protocol.ReceiptBody
import com.rohanic.meshradar.core.protocol.ReceiptKind
import com.rohanic.meshradar.core.protocol.ResolveReason
import com.rohanic.meshradar.core.protocol.Role
import com.rohanic.meshradar.core.protocol.RoleBody
import com.rohanic.meshradar.core.protocol.RoleOp
import com.rohanic.meshradar.core.protocol.Scope
import com.rohanic.meshradar.core.protocol.SosBody
import com.rohanic.meshradar.core.protocol.SosKind
import com.rohanic.meshradar.core.protocol.SosResolveBody
import com.rohanic.meshradar.core.protocol.ThumbnailBody
import com.rohanic.meshradar.core.protocol.UwbBody
import com.rohanic.meshradar.core.protocol.decodeBody
import com.rohanic.meshradar.core.protocol.hexToBytes
import com.rohanic.meshradar.core.routing.PacketStore
import com.rohanic.meshradar.core.routing.RouteDecision
import com.rohanic.meshradar.core.routing.Router
import com.rohanic.meshradar.core.routing.RoutingConfig
import com.rohanic.meshradar.core.routing.StoredPacket
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.security.SecureRandom
import java.util.Base64
import java.util.PriorityQueue
import java.util.zip.GZIPInputStream
import java.util.zip.GZIPOutputStream
import kotlin.random.Random

/** Directly connected neighbours (Nearby Connections endpoints on Android, virtual links in tests). */
interface Link {
    fun neighbours(): List<String>
    fun send(endpoint: String, frame: ByteArray)

    /** Phones discovered in radio range, connected or not (crowd damping input, DEC-010). */
    fun density(): Int = neighbours().size
}

/** Engine events, forwarded to JS and to Android notifications. Payloads are JS-friendly maps. */
fun interface EventSink {
    fun emit(name: String, payload: Map<String, Any?>)
}

fun interface Clock {
    fun nowMs(): Long
}

class CoreConfig(
    val licencePublicKey: ByteArray? = null,
    val appVersion: Int = 1,
    val routing: RoutingConfig = RoutingConfig(),
)

/** Error with a stable code the UI can translate. */
class MeshException(val code: String, message: String = code) : Exception(message)

/**
 * The mesh engine's platform-free core. Android drives it from a foreground service; tests and the
 * simulator drive it with virtual links and a virtual clock. All public methods are synchronized:
 * radio callbacks, timers and JS calls arrive on different threads.
 */
class MeshCore(
    private val crypto: Crypto,
    seed: ByteArray,
    private val stateStore: StateStore,
    private val packetStore: PacketStore,
    private val messages: MessageLog,
    private val breadcrumbs: BreadcrumbLog,
    private val link: Link,
    private val events: EventSink,
    private val clock: Clock,
    private val config: CoreConfig = CoreConfig(),
    random: Random = Random.Default,
    secureRandom: SecureRandom = SecureRandom(),
) {
    private val envelope = Envelope(crypto, secureRandom)
    private val router = Router(config.routing, random)
    private val licences = Licences(crypto, config.licencePublicKey)
    private val identity = crypto.identityFromSeed(seed)
    private val seedHash = crypto.hash(seed, 32, "mr-pseudonym-v1".toByteArray())
    private val rng = random

    val myId: String = envelope.memberId(identity.signPublic).hex()
    private val myIdBytes: ByteArray = hexToBytes(myId)
    val signPublicHex: String = identity.signPublic.hex()

    private var state: CoreState = loadState()

    private data class PendingRelay(val dueMs: Long, val packet: Packet, val forOthers: Boolean, val eventId: String, val repeat: Boolean = false)
    private val relayQueue = PriorityQueue<PendingRelay>(compareBy { it.dueMs })

    private data class JoinWindow(val groupId: String, val code: String, val expiresMs: Long)
    private data class IncomingJoin(val body: JoinRequestBody, val code: String, val groupId: String, val atMs: Long)
    private data class OutgoingJoin(val requestId: ByteArray, val code: String, val startedMs: Long, var lastSentMs: Long, var done: Boolean = false)

    private val joinWindows = LinkedHashMap<String, JoinWindow>()
    private val joinsIn = LinkedHashMap<String, IncomingJoin>()
    private val joinsOut = LinkedHashMap<String, OutgoingJoin>()
    private val pendingAcks = HashMap<String, MutableList<ByteArray>>()
    private val pendingDelivered = HashMap<String, MutableList<ByteArray>>()
    private val pendingRead = HashMap<String, MutableList<ByteArray>>()
    private val ownPrefixes = HashMap<String, String>()
    private val ownByGroup = HashMap<String, ArrayDeque<Pair<Long, ByteArray>>>()
    private val tagCache = HashMap<String, ByteArray>()
    private val lastReannounce = HashMap<String, Long>()
    private val recentHops = ArrayDeque<Pair<Long, Int>>()
    private val publicSender = HashMap<String, Long>()
    private val verifiedCrowd = HashSet<String>()
    /** Packets from senders we have not met yet, replayed when their MEMBER announcement arrives. */
    private val unknownSender = LinkedHashMap<String, MutableList<Pair<Packet, Via>>>()

    private var lastPositionSentMs = 0L
    private var lastAnnounceMs = 0L
    private var lastReceiptFlushMs = 0L
    private var lastPruneMs = 0L
    private var lastPacketMs = 0L
    private var lastSyncMs = 0L
    private var dirty = false
    private var lastSaveMs = 0L
    private var latestPositionPacket: ByteArray? = null
    private var latestSosPacket: ByteArray? = null
    private var latestCrumbPacket: Pair<Long, ByteArray>? = null

    // ---------------------------------------------------------------- time and persistence

    private fun nowMs(): Long = clock.nowMs()
    private fun nowSec(): Long = clock.nowMs() / 1000

    private fun loadState(): CoreState {
        val raw = stateStore.load() ?: return CoreState()
        return try {
            CoreState.fromJson(JSONObject(raw))
        } catch (e: org.json.JSONException) {
            CoreState()
        }
    }

    private fun markDirty() {
        dirty = true
    }

    @Synchronized
    fun flush() {
        stateStore.save(state.toJson().toString())
        dirty = false
        lastSaveMs = nowMs()
    }

    // ---------------------------------------------------------------- identity, profile, settings

    @Synchronized
    fun identityInfo(): Map<String, Any?> = mapOf("memberId" to myId, "signPk" to signPublicHex)

    @Synchronized
    fun setProfile(name: String, colour: Int, avatarPreset: Int, avatarPhoto: ByteArray, card: com.rohanic.meshradar.core.protocol.EmergencyCard) {
        if (avatarPhoto.size > Limits.AVATAR_BYTES) throw MeshException("avatar_too_large")
        val p = state.profile
        p.name = name.take(40)
        p.colour = colour
        p.avatarPreset = avatarPreset
        p.avatarPhoto = avatarPhoto
        p.card = card
        state.groups.values.forEach { g ->
            g.members[myId]?.let { m ->
                m.name = p.name; m.colour = colour; m.avatarPreset = avatarPreset; m.avatarPhoto = avatarPhoto
            }
        }
        markDirty()
        activeGroups().forEach { announce(it) }
    }

    @Synchronized
    fun profile(): Map<String, Any?> = mapOf(
        "name" to state.profile.name,
        "colour" to state.profile.colour,
        "avatarPreset" to state.profile.avatarPreset,
        "card" to Maps.card(state.profile.card),
    )

    @Synchronized
    fun setPowerMode(mode: PowerMode) {
        state.powerMode = mode
        markDirty()
        emitStatus()
    }

    @Synchronized
    fun powerMode(): PowerMode = state.powerMode

    @Synchronized
    fun setRelay(on: Boolean) {
        state.relayEnabled = on
        markDirty()
        emitStatus()
    }

    @Synchronized
    fun setEventDay(on: Boolean, eventId: String) {
        state.eventDay = on
        state.activeEventId = if (on) eventId else state.activeEventId
        markDirty()
        emitStatus()
    }

    @Synchronized
    fun setActiveEvent(eventId: String) {
        state.activeEventId = eventId
        markDirty()
    }

    private fun relayEnabled(): Boolean = state.relayEnabled && state.powerMode.relay

    // ---------------------------------------------------------------- groups

    private fun activeGroups(): List<Group> = state.groups.values.filter { !it.archived }

    private fun group(groupId: String): Group = state.groups[groupId] ?: throw MeshException("no_group")

    private fun selfMember(now: Long, role: Role): Member = Member(
        id = myId,
        signPk = identity.signPublic,
        boxPk = identity.boxPublic,
        name = state.profile.name,
        colour = state.profile.colour,
        avatarPreset = state.profile.avatarPreset,
        avatarPhoto = state.profile.avatarPhoto,
        role = role,
        joinedAt = now,
        position = state.ownPosition,
        lastHeardMs = nowMs(),
        via = Via.SELF,
    )

    /** The tier that applies to a group: the best valid licence bought by its leader (section 10). */
    @Synchronized
    fun tierOf(groupId: String): Tier = tierOf(group(groupId))

    private fun tierOf(g: Group): Tier {
        val now = nowSec()
        val leader = g.leaderSignPk.hex()
        return g.licences.mapNotNull { licences.verify(it, now) }
            .filter { it.sub == leader }
            .maxByOrNull { it.tier.rank }?.tier ?: Tier.FREE
    }

    /** My own tier, from licences bought with my key (decides how many groups I may be in). */
    @Synchronized
    fun myTier(): Tier {
        val now = nowSec()
        return state.groups.values.flatMap { it.licences }.distinct()
            .mapNotNull { licences.verify(it, now) }
            .filter { it.sub == signPublicHex }
            .maxByOrNull { it.tier.rank }?.tier ?: storedOwnTier(now)
    }

    private val ownLicences: MutableList<String> get() = state.ownLicences

    private fun storedOwnTier(now: Long): Tier =
        ownLicences.mapNotNull { licences.verify(it, now) }.maxByOrNull { it.tier.rank }?.tier ?: Tier.FREE

    @Synchronized
    fun createGroup(name: String, eventId: String, expiresAtSec: Long, colour: Int): Map<String, Any?> {
        if (activeGroups().size >= myTier().maxActiveGroups) throw MeshException("group_limit")
        val now = nowSec()
        val g = Group(
            id = crypto.random(16).hex(),
            name = name.take(40),
            key = crypto.newGroupKey(),
            leaderSignPk = identity.signPublic,
            createdAt = now,
            expiresAt = expiresAtSec,
            eventId = eventId,
            maxMembers = myTier().maxMembers,
            colour = colour,
        )
        g.members[myId] = selfMember(now, Role.LEADER)
        ownLicences.forEach { if (licences.verify(it, now) != null) g.licences.add(it) }
        state.groups[g.id] = g
        markDirty()
        announce(g)
        emitGroups()
        return Maps.group(g, myId, tierOf(g))
    }

    /** QR payload (B2): the invite carries the group key, so no server is ever needed. */
    @Synchronized
    fun invitePayload(groupId: String): String {
        val g = group(groupId)
        val invite = GroupInvite(hexToBytes(g.id), g.name, g.key, g.leaderSignPk, g.createdAt, g.expiresAt, g.eventId, g.maxMembers)
        return INVITE_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(invite.encode())
    }

    @Synchronized
    fun joinByInvite(payload: String): Map<String, Any?> {
        val raw = payload.trim().removePrefix(INVITE_PREFIX)
        val invite = try {
            GroupInvite.decode(Base64.getUrlDecoder().decode(raw))
        } catch (e: IllegalArgumentException) {
            throw MeshException("bad_invite")
        } catch (e: MalformedPacketException) {
            throw MeshException("bad_invite")
        }
        return addGroupFromInvite(invite)
    }

    private fun addGroupFromInvite(invite: GroupInvite): Map<String, Any?> {
        val id = invite.groupId.hex()
        state.groups[id]?.let { existing ->
            existing.archived = false
            return Maps.group(existing, myId, tierOf(existing))
        }
        if (activeGroups().size >= myTier().maxActiveGroups) throw MeshException("group_limit")
        if (invite.expiresAt in 1 until nowSec()) throw MeshException("group_expired")
        val now = nowSec()
        val g = Group(
            id = id,
            name = invite.name,
            key = invite.key,
            leaderSignPk = invite.leaderSignPk,
            createdAt = invite.createdAt,
            expiresAt = invite.expiresAt,
            eventId = invite.eventId,
            maxMembers = invite.maxMembers.coerceIn(1, Tier.ORGANISER.maxMembers),
        )
        val role = if (invite.leaderSignPk.contentEquals(identity.signPublic)) Role.LEADER else Role.MEMBER
        g.members[myId] = selfMember(now, role)
        state.groups[id] = g
        markDirty()
        announce(g)
        emitGroups()
        return Maps.group(g, myId, tierOf(g))
    }

    /** Creator side of join by 6-digit code (B1, B2). The code works for 10 minutes. */
    @Synchronized
    fun openJoinWindow(groupId: String): String {
        val g = group(groupId)
        if (g.members.size >= g.maxMembers) throw MeshException("group_full")
        joinWindows.values.removeAll { it.groupId == groupId || it.expiresMs < nowMs() }
        var code: String
        do {
            code = (rng.nextInt(0, 1_000_000)).toString().padStart(6, '0')
        } while (joinWindows.containsKey(code))
        joinWindows[code] = JoinWindow(groupId, code, nowMs() + JOIN_WINDOW_MS)
        return code
    }

    @Synchronized
    fun closeJoinWindow(groupId: String) {
        joinWindows.values.removeAll { it.groupId == groupId }
    }

    /** Joiner side: broadcast a one-hop join request until the creator answers (B2). */
    @Synchronized
    fun requestJoinByCode(code: String): String {
        if (!code.matches(Regex("\\d{6}"))) throw MeshException("bad_code")
        val requestId = crypto.random(16)
        val out = OutgoingJoin(requestId, code, nowMs(), 0)
        joinsOut[requestId.hex()] = out
        sendJoinRequest(out)
        return requestId.hex()
    }

    @Synchronized
    fun cancelJoin(requestId: String) {
        joinsOut.remove(requestId)
    }

    private fun sendJoinRequest(out: OutgoingJoin) {
        val key = Tags.joinKey(out.code)
        val body = JoinRequestBody(out.requestId, identity.signPublic, identity.boxPublic, state.profile.name, state.profile.colour, state.profile.avatarPreset)
        val header = envelope.header(PacketType.JOIN_REQUEST, key, nowSec())
        originate(envelope.sealPublic(header, key, identity.signPublic, identity.signSecret, body.encode()), null)
        out.lastSentMs = nowMs()
    }

    @Synchronized
    fun answerJoin(requestId: String, accept: Boolean) {
        val req = joinsIn.remove(requestId) ?: throw MeshException("no_request")
        val g = group(req.groupId)
        val key = Tags.joinKey(req.code)
        val sealed: ByteArray
        val eph: ByteArray
        if (accept) {
            if (g.members.size >= g.maxMembers) throw MeshException("group_full")
            val invite = GroupInvite(hexToBytes(g.id), g.name, g.key, g.leaderSignPk, g.createdAt, g.expiresAt, g.eventId, g.maxMembers)
            val (ephPk, ephSk) = crypto.newBoxPair()
            val shared = crypto.pairKey(ephSk, ephPk, req.body.boxPk) ?: throw MeshException("crypto")
            sealed = crypto.seal(shared, joinNonce(req.body.requestId, ephPk), invite.encode(), req.body.requestId)
            eph = ephPk
        } else {
            sealed = ByteArray(0)
            eph = ByteArray(32)
        }
        val body = JoinAcceptBody(req.body.requestId, eph, sealed)
        // Send twice; the joiner may miss one while switching radios.
        repeat(2) {
            val header = envelope.header(PacketType.JOIN_ACCEPT, key, nowSec())
            originate(envelope.sealPublic(header, key, identity.signPublic, identity.signSecret, body.encode()), null)
        }
    }

    private fun joinNonce(requestId: ByteArray, ephPk: ByteArray): ByteArray = crypto.hash(requestId + ephPk, 24)

    @Synchronized
    fun leaveGroup(groupId: String) {
        state.groups.remove(groupId) ?: return
        messages.deleteGroup(groupId)
        breadcrumbs.deleteGroup(groupId)
        state.crumbs.removeAll { it.groupId == groupId }
        state.sos.values.removeAll { it.groupId == groupId }
        markDirty()
        emitGroups()
    }

    @Synchronized
    fun setArchived(groupId: String, archived: Boolean) {
        val g = group(groupId)
        if (!archived && activeGroups().size >= myTier().maxActiveGroups && g.archived) throw MeshException("group_limit")
        g.archived = archived
        markDirty()
        emitGroups()
    }

    @Synchronized
    fun setGroupColour(groupId: String, colour: Int) {
        group(groupId).colour = colour
        markDirty()
        emitGroups()
    }

    private fun isLeader(g: Group): Boolean = g.leaderSignPk.contentEquals(identity.signPublic)

    private fun requireLeader(g: Group) {
        if (!isLeader(g)) throw MeshException("not_leader")
    }

    /** Leader sets roles (B3). */
    @Synchronized
    fun setRole(groupId: String, memberId: String, role: Role) {
        val g = group(groupId)
        requireLeader(g)
        if (role == Role.LEADER) throw MeshException("use_transfer")
        val m = g.members[memberId] ?: throw MeshException("no_member")
        m.role = role
        sendGroup(g, RoleBody(RoleOp.SET_ROLE, hexToBytes(memberId), role))
        markDirty()
        emitGroup(g)
    }

    @Synchronized
    fun transferLeader(groupId: String, memberId: String) {
        val g = group(groupId)
        requireLeader(g)
        val m = g.members[memberId] ?: throw MeshException("no_member")
        sendGroup(g, RoleBody(RoleOp.TRANSFER_LEADER, hexToBytes(memberId), Role.LEADER))
        g.members[myId]?.role = Role.MEMBER
        m.role = Role.LEADER
        g.leaderSignPk = m.signPk
        markDirty()
        emitGroup(g)
    }

    @Synchronized
    fun removeMember(groupId: String, memberId: String) {
        val g = group(groupId)
        requireLeader(g)
        if (memberId == myId) throw MeshException("cannot_remove_self")
        g.members.remove(memberId)
        sendGroup(g, RoleBody(RoleOp.REMOVE, hexToBytes(memberId)))
        markDirty()
        emitGroup(g)
    }

    /** Leader settings: separation distance (E9), expiry (B6), name. */
    @Synchronized
    fun updateGroup(groupId: String, name: String?, separationM: Int?, expiresAtSec: Long?) {
        val g = group(groupId)
        requireLeader(g)
        name?.let { g.name = it.take(40) }
        separationM?.let { g.separationM = it.coerceIn(20, 5_000) }
        expiresAtSec?.let { g.expiresAt = it }
        sendGroup(g, RoleBody(RoleOp.SETTINGS, ByteArray(8), Role.MEMBER, g.separationM, g.expiresAt, g.name))
        markDirty()
        emitGroup(g)
    }

    @Synchronized
    fun groups(): List<Map<String, Any?>> = state.groups.values.map { Maps.group(it, myId, tierOf(it)) }

    @Synchronized
    fun groupDetail(groupId: String): Map<String, Any?> {
        val g = group(groupId)
        return Maps.group(g, myId, tierOf(g)) + mapOf(
            "members" to g.members.values.map { Maps.member(it, myId) },
            "pins" to g.pins.values.filter { !it.deleted }.map { Maps.pin(it) },
            "checkin" to Maps.checkin(g.checkin),
            "mailboxId" to Tags.mailboxId(g.key).hex(),
        )
    }

    private fun announce(g: Group) {
        val p = state.profile
        val me = g.members[myId]
        val body = MemberBody(identity.signPublic, identity.boxPublic, p.name, p.colour, p.avatarPreset, p.avatarPhoto, config.appVersion, me?.joinedAt ?: nowSec())
        sendGroup(g, body)
        lastReannounce[g.id] = nowMs()
    }

    // ---------------------------------------------------------------- sending

    private fun tagFor(key: ByteArray, createdSec: Long, label: String): ByteArray {
        val k = label + ":" + Tags.window(createdSec)
        return tagCache.getOrPut(k) { Tags.tag(key, createdSec) }
    }

    private fun groupPacket(g: Group, body: Body, recipient: Member?): Packet {
        val header = envelope.header(body.type, g.key, nowSec())
        var bytes = body.encode()
        val recipientId = recipient?.let { hexToBytes(it.id) } ?: BROADCAST
        if (recipient != null) {
            val pk = crypto.pairKey(identity.boxSecret, identity.boxPublic, recipient.boxPk) ?: throw MeshException("crypto")
            bytes = envelope.sealDirect(pk, header, myIdBytes, recipientId, bytes)
        }
        return envelope.sealGroup(header, g.key, myIdBytes, recipientId, bytes, identity.signSecret)
    }

    private fun sendGroup(g: Group, body: Body, recipient: Member? = null): Packet {
        val packet = groupPacket(g, body, recipient)
        originate(packet, g.id)
        return packet
    }

    private fun originate(packet: Packet, groupId: String?) {
        router.onOriginate(packet)
        if (packet.header.type.scope != Scope.LINK) packetStore.put(StoredPacket(packet, nowSec(), own = true))
        if (groupId != null) {
            val q = ownByGroup.getOrPut(groupId) { ArrayDeque() }
            q.addLast(packet.header.created to packet.encode())
            while (q.size > OWN_BUFFER) q.removeFirst()
        }
        broadcastFrame(Frame.PacketFrame(packet).encode(), null)
        // Safety packets go out twice, 300 ms apart, to ride out radio loss (DEC-011).
        if (packet.header.type.priority == 0) relayQueue.add(PendingRelay(nowMs() + SAFETY_REPEAT_MS, packet, false, "", repeat = true))
    }

    private fun broadcastFrame(frame: ByteArray, except: String?) {
        for (n in link.neighbours()) if (n != except) link.send(n, frame)
    }

    // ---------------------------------------------------------------- link layer

    /** A new neighbour: tell it what we hold so it sends only what we lack (store-and-forward). */
    @Synchronized
    fun onLinkUp(endpoint: String) {
        val prefixes = packetStore.ordered(Frame.MAX_SUMMARY).map { it.packet.header.msgId.copyOf(Frame.PREFIX) }
        link.send(endpoint, Frame.Summary(prefixes).encode())
        emitStatus()
    }

    @Synchronized
    fun onLinkDown(endpoint: String) {
        pendingAcks.remove(endpoint)
        emitStatus()
    }

    @Synchronized
    fun onFrame(endpoint: String, bytes: ByteArray) {
        val frame = try {
            Frame.decode(bytes)
        } catch (e: MalformedPacketException) {
            return
        }
        when (frame) {
            is Frame.PacketFrame -> {
                pendingAcks.getOrPut(endpoint) { mutableListOf() }.add(frame.packet.header.msgId.copyOf(Frame.PREFIX))
                receive(frame.packet, Via.NEARBY)
            }
            is Frame.Summary -> onSummary(endpoint, frame)
            is Frame.Ack -> onAck(frame)
            is Frame.PhotoRequest -> events.emit("photoRequest", mapOf("endpoint" to endpoint, "photoId" to frame.photoId.hex()))
            is Frame.PhotoMeta -> events.emit(
                "photoMeta",
                mapOf("endpoint" to endpoint, "photoId" to frame.photoId.hex(), "payloadId" to frame.payloadId, "size" to frame.size),
            )
        }
    }

    private fun onSummary(endpoint: String, summary: Frame.Summary) {
        lastSyncMs = nowMs()
        val theirs = summary.prefixes.map { it.hex() }.toHashSet()
        val now = nowSec()
        var sent = 0
        for (sp in packetStore.ordered(Frame.MAX_SUMMARY)) {
            if (sent >= MAX_SYNC_SEND) break
            if (theirs.contains(sp.packet.header.msgId.copyOf(Frame.PREFIX).hex())) continue
            if (now > sp.expiresAt) continue
            val out = if (sp.own) sp.packet else {
                if (!relayEnabled()) continue
                val h = sp.packet.header
                if (h.hop + 1 >= h.ttl) continue
                Packet(h.withHop(h.hop + 1), sp.packet.payload)
            }
            link.send(endpoint, Frame.PacketFrame(out).encode())
            sent++
        }
    }

    private fun onAck(ack: Frame.Ack) {
        for (prefix in ack.prefixes) {
            val msgId = ownPrefixes.remove(prefix.hex()) ?: continue
            val m = messages.get(msgId) ?: continue
            if (m.state == MessageState.SENDING) {
                m.state = MessageState.IN_MESH
                messages.update(m)
                emitMessageState(m)
            }
        }
    }

    /** BLE beacon received (connectionless; transport 2). */
    @Synchronized
    fun onBeacon(bytes: ByteArray) {
        val packet = try {
            Packet.decode(bytes)
        } catch (e: MalformedPacketException) {
            return
        }
        receive(packet, Via.BLE)
    }

    /** Packets fetched from the Family Circle relay (G6). */
    @Synchronized
    fun onInternetPackets(list: List<ByteArray>) {
        for (bytes in list) {
            val packet = try {
                Packet.decode(bytes)
            } catch (e: MalformedPacketException) {
                continue
            }
            receive(packet, Via.INTERNET)
        }
    }

    /** Our own packets for a group created after [sinceSec], for upload to the Family Circle relay. */
    @Synchronized
    fun internetOutbox(groupId: String, sinceSec: Long): List<ByteArray> =
        ownByGroup[groupId]?.filter { it.first > sinceSec }?.map { it.second } ?: emptyList()

    @Synchronized
    fun mailboxId(groupId: String): String = Tags.mailboxId(group(groupId).key).hex()

    /** Packets for the BLE advertiser to rotate through: SOS first, then Last-Crumb, then position. */
    @Synchronized
    fun beaconPackets(): List<ByteArray> {
        val out = mutableListOf<ByteArray>()
        if (state.ownSos != null) latestSosPacket?.let { out.add(it) }
        latestCrumbPacket?.let { (at, bytes) -> if (nowMs() - at < 10 * 60_000) out.add(bytes) }
        latestPositionPacket?.let { out.add(it) }
        return out
    }

    // ---------------------------------------------------------------- receiving

    private enum class Local { MINE, OTHER, VETO }

    private fun receive(packet: Packet, via: Via) {
        val now = nowSec()
        val decision = router.onReceive(packet, now, link.density(), relayEnabled())
        if (decision !is RouteDecision.Accept) return
        lastPacketMs = nowMs()
        state.stats.packetsReceived++
        var eventId = ""
        val local = try {
            processLocal(packet, via) { eventId = it }
        } catch (e: MalformedPacketException) {
            Local.VETO
        }
        if (local == Local.VETO) return
        if (packet.header.type.scope != Scope.LINK) packetStore.put(StoredPacket(packet, now))
        val delay = decision.relayDelayMs ?: return
        if (via == Via.INTERNET && packet.header.type == PacketType.POSITION) return
        relayQueue.add(PendingRelay(nowMs() + delay, packet, local != Local.MINE, eventId))
    }

    private fun processLocal(packet: Packet, via: Via, setEvent: (String) -> Unit): Local {
        val h = packet.header
        return when (h.type.scope) {
            Scope.GROUP -> {
                if (h.type == PacketType.LOST_CHILD) {
                    for (g in activeGroups()) {
                        val fk = Tags.finderKey(g.key)
                        if (Crypto.constantTimeEquals(h.tag, tagFor(fk, h.created, "f" + g.id))) {
                            val inner = envelope.openPublic(packet, fk) ?: return Local.VETO
                            onLostChild(g, LostChildBody.read(com.rohanic.meshradar.core.protocol.ByteReader(inner.body)), inner.senderPk, h)
                            return Local.MINE
                        }
                    }
                    return Local.OTHER
                }
                for (g in activeGroups()) {
                    if (!Crypto.constantTimeEquals(h.tag, tagFor(g.key, h.created, g.id))) continue
                    val inner = envelope.openGroup(packet, g.key) ?: continue
                    return onGroupPacket(g, inner, packet, via)
                }
                Local.OTHER
            }
            Scope.PUBLIC -> onPublicPacket(packet, setEvent)
            Scope.LINK -> onLinkPacket(packet)
        }
    }

    private fun onGroupPacket(g: Group, inner: GroupInner, packet: Packet, via: Via): Local {
        val h = packet.header
        val senderId = inner.senderId.hex()
        if (senderId == myId) return Local.MINE
        if (h.type == PacketType.MEMBER) {
            val body = MemberBody.read(com.rohanic.meshradar.core.protocol.ByteReader(inner.body))
            if (envelope.memberId(body.signPk).hex() != senderId) return Local.VETO
            if (!crypto.verify(inner.signature, inner.signedBytes, body.signPk)) return Local.VETO
            onMember(g, senderId, body, h, via)
            replayUnknownSender(g, senderId)
            return Local.MINE
        }
        val sender = g.members[senderId]
        if (sender == null) {
            holdForUnknownSender(g.id + ":" + senderId, packet, via)
            return Local.MINE
        }
        if (!crypto.verify(inner.signature, inner.signedBytes, sender.signPk)) return Local.VETO
        var bodyBytes = inner.body
        if (inner.isDirect) {
            if (inner.recipientId.hex() != myId) return Local.MINE
            val pk = crypto.pairKey(identity.boxSecret, identity.boxPublic, sender.boxPk) ?: return Local.VETO
            bodyBytes = envelope.openDirect(pk, h, inner.senderId, inner.recipientId, bodyBytes) ?: return Local.VETO
        }
        val body = decodeBody(h.type, bodyBytes)
        heard(sender, h, via)
        val direct = inner.isDirect
        when (body) {
            is PositionBody -> onPosition(g, sender, body.position)
            is ChatBody -> onChat(g, sender, body, h, direct)
            is ThumbnailBody -> onThumbnail(g, sender, body, h, direct)
            is MomentBody -> onMoment(g, sender, body, h)
            is ReceiptBody -> onReceipt(sender, body)
            is SosBody -> onSos(g, sender, body, h)
            is SosResolveBody -> onSosResolve(g, sender, body)
            is CrumbBody -> onCrumb(g, sender, body)
            is CheckinBody -> onCheckin(g, sender, body)
            is RoleBody -> onRole(g, sender, body)
            is PinBody -> onPin(g, sender, body)
            is LicenceBody -> onLicence(g, body)
            is DrillBody -> events.emit("drill", Maps.drill(g.id, sender.id, body))
            is UwbBody -> events.emit("uwb", Maps.uwb(g.id, sender.id, body))
            is PackBody -> onPack(g, sender, body)
            else -> {}
        }
        return Local.MINE
    }

    private fun holdForUnknownSender(key: String, packet: Packet, via: Via) {
        val list = unknownSender.getOrPut(key) { mutableListOf() }
        if (list.size < UNKNOWN_PER_SENDER) list.add(packet to via)
        while (unknownSender.size > UNKNOWN_SENDERS) unknownSender.remove(unknownSender.keys.first())
    }

    private fun replayUnknownSender(g: Group, senderId: String) {
        val held = unknownSender.remove(g.id + ":" + senderId) ?: return
        if (g.members[senderId] == null) return
        for ((packet, via) in held.sortedBy { it.first.header.created }) {
            if (Router.isExpired(packet, nowSec())) continue
            val inner = envelope.openGroup(packet, g.key) ?: continue
            try {
                onGroupPacket(g, inner, packet, via)
            } catch (e: MalformedPacketException) {
                // ignore
            }
        }
    }

    private fun heard(m: Member, h: Header, via: Via) {
        m.lastHeardMs = nowMs()
        m.hops = h.hop + 1
        m.via = via
        if (via != Via.INTERNET) {
            recentHops.addLast(nowMs() to h.hop + 1)
            while (recentHops.size > 500) recentHops.removeFirst()
        }
        markDirty()
    }

    private fun onMember(g: Group, senderId: String, body: MemberBody, h: Header, via: Via) {
        val existing = g.members[senderId]
        if (existing == null) {
            if (g.members.size >= g.maxMembers) {
                events.emit("groupFull", mapOf("groupId" to g.id, "name" to body.name))
                return
            }
            val role = if (body.signPk.contentEquals(g.leaderSignPk)) Role.LEADER else Role.MEMBER
            val m = Member(senderId, body.signPk, body.boxPk, body.name, body.colour, body.avatarPreset, body.avatarPhoto, role, body.joinedAt)
            g.members[senderId] = m
            heard(m, h, via)
            // Let the newcomer learn about us, at most every 30 s per group.
            if (nowMs() - (lastReannounce[g.id] ?: 0) > 30_000) announce(g)
            // Share licences so the newcomer gets the group's tier.
            g.licences.forEach { sendGroup(g, LicenceBody(it.toByteArray())) }
            events.emit("memberJoined", mapOf("groupId" to g.id, "member" to Maps.member(m, myId)))
        } else {
            existing.name = body.name
            existing.colour = body.colour
            existing.avatarPreset = body.avatarPreset
            existing.avatarPhoto = body.avatarPhoto
            heard(existing, h, via)
        }
        markDirty()
        emitGroup(g)
    }

    // ---------------------------------------------------------------- positions and radar

    /** A new fix from the platform location provider. */
    @Synchronized
    fun onLocalPosition(position: Position) {
        state.ownPosition = position
        val now = nowMs()
        for (g in activeGroups()) {
            g.members[myId]?.let { it.position = position; it.lastHeardMs = now }
            addBreadcrumb(g, myId, position)
            checkSeparation(g)
            autoCheckin(g, position)
        }
        val interval = state.powerMode.positionIntervalSec * 1000
        if (now - lastPositionSentMs >= interval - 250) {
            lastPositionSentMs = now
            val p = if (state.ownSos != null) position.copy(flags = position.flags or Position.FLAG_SOS) else position
            for (g in activeGroups()) {
                val packet = sendGroup(g, PositionBody(p))
                latestPositionPacket = packet.encode()
            }
        }
        markDirty()
        events.emit("ownPosition", Maps.position(position))
    }

    private fun onPosition(g: Group, m: Member, p: Position) {
        val prev = m.position
        if (prev != null && p.fixTime < prev.fixTime) return
        m.position = p
        addBreadcrumb(g, m.id, p)
        checkSeparation(g)
        events.emit("position", mapOf("groupId" to g.id, "member" to Maps.member(m, myId)))
    }

    private fun addBreadcrumb(g: Group, memberId: String, p: Position) {
        breadcrumbs.add(g.id, Breadcrumb(memberId, p.fixTime, p.lat, p.lon))
    }

    @Synchronized
    fun breadcrumbs(groupId: String, memberId: String, sinceSec: Long): List<Map<String, Any?>> {
        val g = group(groupId)
        if (!tierOf(g).breadcrumbs) throw MeshException("needs_pass")
        val since = maxOf(sinceSec, nowSec() - MemoryBreadcrumbLog.WINDOW_SEC)
        return breadcrumbs.list(groupId, memberId, since).map { mapOf("atMs" to it.atSec * 1000, "lat" to it.lat, "lon" to it.lon) }
    }

    /** Separation alert for Elders and Children (E9), computed on the leader's phone. */
    private fun checkSeparation(g: Group) {
        if (!isLeader(g) || !tierOf(g).separationAlerts) return
        val me = state.ownPosition ?: return
        for (m in g.members.values) {
            if (m.id == myId || (m.role != Role.ELDER && m.role != Role.CHILD)) continue
            val p = m.position ?: continue
            if (nowSec() - p.fixTime > 600) continue
            val d = Geo.distanceM(me.lat, me.lon, p.lat, p.lon)
            if (!m.separated && d > g.separationM) {
                m.separated = true
                events.emit(
                    "separation",
                    mapOf("groupId" to g.id, "member" to Maps.member(m, myId), "distanceM" to d, "bearing" to Geo.bearingDeg(me.lat, me.lon, p.lat, p.lon), "thresholdM" to g.separationM),
                )
            } else if (m.separated && d < g.separationM * 0.8) {
                m.separated = false
                events.emit("separationCleared", mapOf("groupId" to g.id, "memberId" to m.id))
            }
        }
    }

    // ---------------------------------------------------------------- chat, receipts, media

    @Synchronized
    fun sendChat(groupId: String, recipientId: String?, kind: ChatKind, text: String, quickCode: Int, lat: Double?, lon: Double?, pinId: String?): Map<String, Any?> {
        val g = group(groupId)
        if (text.codePointCount(0, text.length) > Limits.TEXT_CHARS) throw MeshException("text_too_long")
        val recipient = recipientId?.let { g.members[it] ?: throw MeshException("no_member") }
        val body = ChatBody(kind, text, quickCode, lat, lon, pinId?.let { hexToBytes(it) })
        val packet = sendGroup(g, body, recipient)
        val m = ChatMessage(
            msgId = packet.header.msgId.hex(),
            groupId = g.id,
            senderId = myId,
            recipientId = recipientId,
            outgoing = true,
            kind = kind.name.lowercase(),
            text = text,
            quickCode = quickCode,
            lat = lat,
            lon = lon,
            pinId = pinId,
            image = null,
            fullSize = 0,
            createdAt = nowMs(),
            state = MessageState.SENDING,
        )
        trackOwn(packet, m)
        return Maps.message(m)
    }

    @Synchronized
    fun sendThumbnail(groupId: String, recipientId: String?, caption: String, image: ByteArray, fullSize: Long, imageId: String?): Map<String, Any?> {
        val g = group(groupId)
        if (image.size > Limits.THUMB_BYTES) throw MeshException("thumbnail_too_large")
        val recipient = recipientId?.let { g.members[it] ?: throw MeshException("no_member") }
        val id = imageId?.let { hexToBytes(it) } ?: crypto.random(16)
        val packet = sendGroup(g, ThumbnailBody(id, caption, image, fullSize), recipient)
        val m = ChatMessage(packet.header.msgId.hex(), g.id, myId, recipientId, true, "image", caption, 0, null, null, id.hex(), image, fullSize, nowMs(), MessageState.SENDING)
        trackOwn(packet, m)
        return Maps.message(m)
    }

    @Synchronized
    fun sendMoment(groupId: String, note: String, lat: Double?, lon: Double?, thumbnail: ByteArray): Map<String, Any?> {
        val g = group(groupId)
        if (thumbnail.size > Limits.THUMB_BYTES) throw MeshException("thumbnail_too_large")
        val id = crypto.random(16)
        val packet = sendGroup(g, MomentBody(id, note, lat, lon, thumbnail, nowSec()))
        val m = ChatMessage(packet.header.msgId.hex(), g.id, myId, null, true, "moment", note, 0, lat, lon, id.hex(), thumbnail.takeIf { it.isNotEmpty() }, 0, nowMs(), MessageState.SENDING)
        trackOwn(packet, m)
        return Maps.message(m)
    }

    private fun trackOwn(packet: Packet, m: ChatMessage) {
        ownPrefixes[packet.header.msgId.copyOf(Frame.PREFIX).hex()] = m.msgId
        messages.add(m)
        state.stats.messagesSent++
        markDirty()
        events.emit("message", Maps.message(m))
    }

    private fun onChat(g: Group, sender: Member, body: ChatBody, h: Header, direct: Boolean) {
        val m = ChatMessage(
            msgId = h.msgId.hex(),
            groupId = g.id,
            senderId = sender.id,
            recipientId = if (direct) myId else null,
            outgoing = false,
            kind = body.kind.name.lowercase(),
            text = body.text,
            quickCode = body.quickCode,
            lat = body.lat,
            lon = body.lon,
            pinId = body.pinId?.hex(),
            image = null,
            fullSize = 0,
            createdAt = h.created * 1000,
            state = MessageState.RECEIVED,
            hops = h.hop + 1,
        )
        deliver(g, m, h)
    }

    private fun onThumbnail(g: Group, sender: Member, body: ThumbnailBody, h: Header, direct: Boolean) {
        val m = ChatMessage(h.msgId.hex(), g.id, sender.id, if (direct) myId else null, false, "image", body.caption, 0, null, null, body.imageId.hex(), body.image, body.fullSize, h.created * 1000, MessageState.RECEIVED, hops = h.hop + 1)
        deliver(g, m, h)
    }

    private fun onMoment(g: Group, sender: Member, body: MomentBody, h: Header) {
        val m = ChatMessage(h.msgId.hex(), g.id, sender.id, null, false, "moment", body.note, 0, body.lat, body.lon, body.momentId.hex(), body.thumbnail.takeIf { it.isNotEmpty() }, 0, body.createdAt * 1000, MessageState.RECEIVED, hops = h.hop + 1)
        deliver(g, m, h)
    }

    private fun deliver(g: Group, m: ChatMessage, h: Header) {
        if (messages.get(m.msgId) != null) return
        messages.add(m)
        pendingDelivered.getOrPut(g.id) { mutableListOf() }.add(h.msgId)
        events.emit("message", Maps.message(m))
    }

    @Synchronized
    fun markRead(groupId: String, msgIds: List<String>) {
        val list = pendingRead.getOrPut(groupId) { mutableListOf() }
        for (id in msgIds) {
            val m = messages.get(id) ?: continue
            if (m.outgoing || m.groupId != groupId) continue
            list.add(hexToBytes(id))
        }
    }

    private fun onReceipt(sender: Member, body: ReceiptBody) {
        for (id in body.msgIds) {
            val m = messages.get(id.hex()) ?: continue
            if (!m.outgoing) continue
            if (body.kind == ReceiptKind.READ) {
                m.readBy.add(sender.id)
                m.deliveredTo.add(sender.id)
                m.state = MessageState.READ
            } else {
                m.deliveredTo.add(sender.id)
                if (m.state != MessageState.READ) m.state = MessageState.DELIVERED
            }
            messages.update(m)
            emitMessageState(m)
        }
    }

    @Synchronized
    fun messages(groupId: String, peerId: String?, beforeMs: Long, limit: Int): List<Map<String, Any?>> =
        messages.list(groupId, peerId, beforeMs, limit.coerceIn(1, 200)).map { Maps.message(it) }

    @Synchronized
    fun moments(groupId: String): List<Map<String, Any?>> =
        messages.all(groupId).filter { it.kind == "moment" }.sortedBy { it.createdAt }.map { Maps.message(it) }

    private fun emitMessageState(m: ChatMessage) {
        events.emit(
            "messageState",
            mapOf("msgId" to m.msgId, "groupId" to m.groupId, "state" to m.state.name.lowercase(), "delivered" to m.deliveredTo.size, "read" to m.readBy.size),
        )
    }

    /** Encrypt a full photo with the group key before it leaves the phone (D6). Nonce is prepended. */
    @Synchronized
    fun sealBlob(groupId: String, plain: ByteArray): ByteArray {
        val g = group(groupId)
        val nonce = crypto.random(24)
        return nonce + crypto.seal(g.key, nonce, plain, "mr-photo".toByteArray())
    }

    @Synchronized
    fun openBlob(groupId: String, sealed: ByteArray): ByteArray? {
        val g = state.groups[groupId] ?: return null
        if (sealed.size < 24 + Crypto.MAC_BYTES) return null
        return crypto.open(g.key, sealed.copyOf(24), sealed.copyOfRange(24, sealed.size), "mr-photo".toByteArray())
    }

    /** Quick reply to every active group (notification action "I'm OK"). */
    @Synchronized
    fun quickReplyAll(code: Int) {
        for (g in activeGroups()) sendChat(g.id, null, ChatKind.QUICK, "", code, null, null, null)
    }

    // ---------------------------------------------------------------- meeting points

    @Synchronized
    fun setPin(groupId: String, pinId: String?, name: String, lat: Double, lon: Double, floor: Int, icon: Int): Map<String, Any?> {
        val g = group(groupId)
        requireLeader(g)
        val id = pinId ?: crypto.random(16).hex()
        val pin = Pin(id, name.take(60), lat, lon, floor, icon, nowSec())
        g.pins[id] = pin
        sendGroup(g, PinBody(hexToBytes(id), false, pin.name, lat, lon, floor, icon, pin.updated))
        markDirty()
        events.emit("pins", mapOf("groupId" to g.id, "pins" to g.pins.values.filter { !it.deleted }.map { Maps.pin(it) }))
        return Maps.pin(pin)
    }

    @Synchronized
    fun deletePin(groupId: String, pinId: String) {
        val g = group(groupId)
        requireLeader(g)
        val pin = g.pins[pinId] ?: return
        pin.deleted = true
        pin.updated = nowSec()
        sendGroup(g, PinBody(hexToBytes(pinId), true, pin.name, pin.lat, pin.lon, pin.floor, pin.icon, pin.updated))
        markDirty()
        events.emit("pins", mapOf("groupId" to g.id, "pins" to g.pins.values.filter { !it.deleted }.map { Maps.pin(it) }))
    }

    private fun onPin(g: Group, sender: Member, body: PinBody) {
        if (!sender.signPk.contentEquals(g.leaderSignPk)) return
        val id = body.pinId.hex()
        val existing = g.pins[id]
        if (existing != null && existing.updated > body.updated) return
        g.pins[id] = Pin(id, body.name, body.lat, body.lon, body.floor, body.icon, body.updated, body.deleted)
        markDirty()
        events.emit("pins", mapOf("groupId" to g.id, "pins" to g.pins.values.filter { !it.deleted }.map { Maps.pin(it) }))
    }

    private fun onRole(g: Group, sender: Member, body: RoleBody) {
        if (!sender.signPk.contentEquals(g.leaderSignPk)) return
        val target = body.memberId.hex()
        when (body.op) {
            RoleOp.SET_ROLE -> g.members[target]?.role = body.role
            RoleOp.TRANSFER_LEADER -> g.members[target]?.let { m ->
                g.leaderSignPk = m.signPk
                sender.role = Role.MEMBER
                m.role = Role.LEADER
            }
            RoleOp.REMOVE -> {
                if (target == myId) {
                    events.emit("removedFromGroup", mapOf("groupId" to g.id, "name" to g.name))
                    g.archived = true
                } else {
                    g.members.remove(target)
                }
            }
            RoleOp.SETTINGS -> {
                if (body.groupName.isNotBlank()) g.name = body.groupName
                if (body.separationM > 0) g.separationM = body.separationM
                g.expiresAt = body.expiresAt
            }
        }
        markDirty()
        emitGroup(g)
    }

    // ---------------------------------------------------------------- SOS (E1, E2)

    @Synchronized
    fun startSos(kind: SosKind, silent: Boolean): Map<String, Any?> {
        val existing = state.ownSos
        val sos = existing ?: OwnSos(crypto.random(16).hex(), kind, silent, nowSec(), 0, 0)
        state.ownSos = sos
        state.stats.sosSent++
        broadcastSos(sos)
        markDirty()
        flush()
        return Maps.ownSos(sos)
    }

    private fun broadcastSos(sos: OwnSos) {
        val pos = state.ownPosition ?: Position(0.0, 0.0, accuracyM = 0.0, fixTime = 0)
        sos.seq++
        sos.lastSentMs = nowMs()
        val body = SosBody(hexToBytes(sos.sosId), sos.kind, sos.silent, sos.seq, pos.copy(flags = pos.flags or Position.FLAG_SOS), state.profile.card)
        for (g in activeGroups()) {
            latestSosPacket = sendGroup(g, body).encode()
        }
        if (state.ownPosition != null) {
            val (cLat, cLon) = Geo.coarse(pos.lat, pos.lon)
            sendPublicSos(PublicSosBody(hexToBytes(sos.sosId), sos.kind, cLat, cLon, Geo.PUBLIC_CELL_M.toInt(), true))
        }
    }

    private fun sendPublicSos(body: PublicSosBody) {
        val key = Tags.publicSosKey
        val (pk, sk) = pseudonym("public:" + (nowSec() / 86_400))
        val header = envelope.header(PacketType.PUBLIC_SOS, key, nowSec())
        originate(envelope.sealPublic(header, key, pk, sk, body.encode()), null)
    }

    /** Resolve our own SOS, or (as leader) a member's SOS. */
    @Synchronized
    fun resolveSos(sosId: String, reason: ResolveReason) {
        val own = state.ownSos
        if (own != null && own.sosId == sosId) {
            state.ownSos = null
            latestSosPacket = null
            for (g in activeGroups()) sendGroup(g, SosResolveBody(hexToBytes(sosId), reason))
            state.ownPosition?.let { p ->
                val (cLat, cLon) = Geo.coarse(p.lat, p.lon)
                sendPublicSos(PublicSosBody(hexToBytes(sosId), own.kind, cLat, cLon, Geo.PUBLIC_CELL_M.toInt(), false))
            }
            events.emit("sosResolved", mapOf("sosId" to sosId, "by" to myId, "own" to true))
        } else {
            val rec = state.sos[sosId] ?: throw MeshException("no_sos")
            val g = group(rec.groupId)
            requireLeader(g)
            rec.resolved = true
            rec.resolvedBy = myId
            sendGroup(g, SosResolveBody(hexToBytes(sosId), reason))
            events.emit("sosResolved", mapOf("sosId" to sosId, "by" to myId, "own" to false))
        }
        markDirty()
        flush()
    }

    @Synchronized
    fun sosState(): Map<String, Any?> = mapOf(
        "own" to state.ownSos?.let { Maps.ownSos(it) },
        "incoming" to state.sos.values.filter { !it.resolved }.map { Maps.sos(it, memberOf(it)) },
        "publicNearby" to state.publicSos.values.filter { it.active && nowMs() - it.lastAt < 15 * 60_000 }.map { Maps.publicSos(it, state.ownPosition) },
    )

    private fun memberOf(rec: SosRecord): Map<String, Any?>? = state.groups[rec.groupId]?.members?.get(rec.memberId)?.let { Maps.member(it, myId) }

    private fun onSos(g: Group, sender: Member, body: SosBody, h: Header) {
        val id = body.sosId.hex()
        val rec = state.sos[id]
        if (body.position.fixTime > 0) sender.position = body.position
        if (rec == null) {
            val r = SosRecord(id, g.id, sender.id, body.kind, body.silent, body.position, body.card, h.created, nowMs(), h.hop + 1)
            state.sos[id] = r
            markDirty()
            events.emit("sos", Maps.sos(r, Maps.member(sender, myId)) + mapOf("first" to true))
        } else if (!rec.resolved) {
            rec.position = body.position
            rec.lastAt = nowMs()
            rec.hops = h.hop + 1
            markDirty()
            events.emit("sos", Maps.sos(rec, Maps.member(sender, myId)) + mapOf("first" to false))
        }
    }

    private fun onSosResolve(g: Group, sender: Member, body: SosResolveBody) {
        val id = body.sosId.hex()
        val own = state.ownSos
        val fromLeader = sender.signPk.contentEquals(g.leaderSignPk)
        if (own != null && own.sosId == id && fromLeader) {
            state.ownSos = null
            latestSosPacket = null
            events.emit("sosResolved", mapOf("sosId" to id, "by" to sender.id, "own" to true))
        }
        val rec = state.sos[id] ?: return
        if (rec.memberId != sender.id && !fromLeader) return
        rec.resolved = true
        rec.resolvedBy = sender.id
        markDirty()
        events.emit("sosResolved", mapOf("sosId" to id, "by" to sender.id, "own" to false))
    }

    private fun onPublicSos(body: PublicSosBody) {
        val id = body.sosId.hex()
        if (state.sos.containsKey(id) || state.ownSos?.sosId == id) return
        val existing = state.publicSos[id]
        if (existing == null) {
            val r = PublicSosRecord(id, body.kind, body.coarseLat, body.coarseLon, body.radiusM, nowMs(), body.active)
            state.publicSos[id] = r
            if (body.active) events.emit("publicSos", Maps.publicSos(r, state.ownPosition))
        } else {
            existing.lastAt = nowMs()
            if (existing.active && !body.active) {
                existing.active = false
                events.emit("publicSosEnded", mapOf("sosId" to id))
            }
        }
        while (state.publicSos.size > 50) state.publicSos.remove(state.publicSos.keys.first())
        markDirty()
    }

    // ---------------------------------------------------------------- Last-Crumb (E3, E4)

    /** Battery updates from the platform. Fires Last-Crumb at 15, 5 and 2 percent. */
    @Synchronized
    fun onBattery(level: Int, charging: Boolean) {
        if (charging && level > 20) {
            state.lastBatteryCrumb = 101
            markDirty()
            return
        }
        val threshold = when {
            level <= 2 -> 2
            level <= 5 -> 5
            level <= 15 -> 15
            else -> return
        }
        if (threshold >= state.lastBatteryCrumb) return
        state.lastBatteryCrumb = threshold
        val reason = when (threshold) {
            15 -> CrumbReason.BATTERY_15
            5 -> CrumbReason.BATTERY_5
            else -> CrumbReason.BATTERY_2
        }
        sendCrumb(reason, level)
        if (threshold == 15) events.emit("lowBattery", mapOf("level" to level))
        markDirty()
    }

    @Synchronized
    fun sendCrumb(reason: CrumbReason, battery: Int?) {
        val p = state.ownPosition ?: return
        val pos = p.copy(battery = battery ?: p.battery, fixTime = maxOf(p.fixTime, 1))
        for (g in activeGroups()) {
            latestCrumbPacket = nowMs() to sendGroup(g, CrumbBody(reason, pos)).encode()
        }
        flush()
    }

    private fun onCrumb(g: Group, sender: Member, body: CrumbBody) {
        val rec = CrumbRecord(g.id, sender.id, body.reason.name.lowercase(), body.position, nowMs())
        state.crumbs.removeAll { it.groupId == g.id && it.memberId == sender.id }
        state.crumbs.add(rec)
        if (sender.position == null || body.position.fixTime >= (sender.position?.fixTime ?: 0)) sender.position = body.position
        markDirty()
        events.emit("crumb", Maps.crumb(rec, Maps.member(sender, myId)))
    }

    @Synchronized
    fun crumbs(): List<Map<String, Any?>> = state.crumbs.map { c ->
        Maps.crumb(c, state.groups[c.groupId]?.members?.get(c.memberId)?.let { Maps.member(it, myId) })
    }

    // ---------------------------------------------------------------- check-ins (E7, flow 5)

    @Synchronized
    fun setCheckinTimer(groupId: String, deadlineSec: Long) {
        val g = group(groupId)
        if (deadlineSec <= nowSec()) throw MeshException("deadline_past")
        g.checkin.timers[myId] = deadlineSec
        g.checkin.alerted.remove("timer:$myId")
        sendGroup(g, CheckinBody(CheckinKind.TIMER_SET, deadline = deadlineSec, position = state.ownPosition))
        markDirty()
        emitCheckin(g)
    }

    @Synchronized
    fun cancelCheckinTimer(groupId: String) {
        val g = group(groupId)
        g.checkin.timers.remove(myId)
        sendGroup(g, CheckinBody(CheckinKind.TIMER_CANCEL))
        markDirty()
        emitCheckin(g)
    }

    @Synchronized
    fun checkIn(groupId: String, checkpoint: Int) {
        val g = group(groupId)
        applyCheckin(g, myId, checkpoint)
        sendGroup(g, CheckinBody(CheckinKind.CHECKED_IN, checkpoint = checkpoint, position = state.ownPosition))
        markDirty()
        emitCheckin(g)
    }

    @Synchronized
    fun setCheckinPlan(groupId: String, checkpoints: List<Checkpoint>, deadlineSec: Long) {
        val g = group(groupId)
        requireLeader(g)
        if (checkpoints.size > Limits.CHECKPOINTS) throw MeshException("too_many_checkpoints")
        g.checkin.planCheckpoints = checkpoints
        g.checkin.planDeadline = deadlineSec
        g.checkin.progress.clear()
        g.checkin.alerted.removeAll { it.startsWith("plan:") }
        sendGroup(g, CheckinBody(CheckinKind.PLAN_SET, deadline = deadlineSec, checkpoints = checkpoints))
        markDirty()
        emitCheckin(g)
    }

    private fun applyCheckin(g: Group, memberId: String, checkpoint: Int) {
        g.checkin.lastCheckin[memberId] = nowSec()
        g.checkin.timers.remove(memberId)
        if (checkpoint >= 0) g.checkin.progress[memberId] = maxOf(g.checkin.progress[memberId] ?: -1, checkpoint)
    }

    private fun onCheckin(g: Group, sender: Member, body: CheckinBody) {
        body.position?.let { if (it.fixTime > (sender.position?.fixTime ?: 0)) sender.position = it }
        when (body.kind) {
            CheckinKind.CHECKED_IN -> applyCheckin(g, sender.id, body.checkpoint)
            CheckinKind.TIMER_SET -> {
                g.checkin.timers[sender.id] = body.deadline
                g.checkin.alerted.remove("timer:${sender.id}")
            }
            CheckinKind.TIMER_CANCEL -> g.checkin.timers.remove(sender.id)
            CheckinKind.PLAN_SET -> if (sender.signPk.contentEquals(g.leaderSignPk)) {
                g.checkin.planCheckpoints = body.checkpoints
                g.checkin.planDeadline = body.deadline
                g.checkin.progress.clear()
                g.checkin.alerted.removeAll { it.startsWith("plan:") }
            }
            CheckinKind.MISSED -> {}
        }
        markDirty()
        emitCheckin(g)
    }

    private fun autoCheckin(g: Group, p: Position) {
        val plan = g.checkin.planCheckpoints
        if (plan.isEmpty()) return
        val reached = g.checkin.progress[myId] ?: -1
        val next = reached + 1
        if (next >= plan.size) return
        val cp = plan[next]
        if (Geo.distanceM(p.lat, p.lon, cp.lat, cp.lon) <= cp.radiusM) {
            applyCheckin(g, myId, next)
            sendGroup(g, CheckinBody(CheckinKind.CHECKED_IN, checkpoint = next, position = p))
            events.emit("checkedIn", mapOf("groupId" to g.id, "checkpoint" to next, "name" to cp.name, "auto" to true))
            emitCheckin(g)
        }
    }

    /** Deadlines fire on every phone that knows them, so the alert works offline (E7). */
    private fun checkDeadlines(nowS: Long) {
        for (g in activeGroups()) {
            val c = g.checkin
            for ((memberId, deadline) in c.timers.toMap()) {
                val key = "timer:$memberId"
                if (nowS > deadline && key !in c.alerted) {
                    c.alerted.add(key)
                    markDirty()
                    events.emit("checkinMissed", missedPayload(g, memberId, "timer", deadline))
                }
            }
            if (c.planDeadline > 0 && nowS > c.planDeadline && c.planCheckpoints.isNotEmpty()) {
                val last = c.planCheckpoints.size - 1
                for (m in g.members.values) {
                    val key = "plan:${m.id}"
                    if ((c.progress[m.id] ?: -1) < last && key !in c.alerted) {
                        c.alerted.add(key)
                        markDirty()
                        events.emit("checkinMissed", missedPayload(g, m.id, "plan", c.planDeadline))
                    }
                }
            }
        }
    }

    private fun missedPayload(g: Group, memberId: String, kind: String, deadline: Long): Map<String, Any?> = mapOf(
        "groupId" to g.id,
        "memberId" to memberId,
        "kind" to kind,
        "deadlineMs" to deadline * 1000,
        "member" to g.members[memberId]?.let { Maps.member(it, myId) },
        "self" to (memberId == myId),
    )

    private fun emitCheckin(g: Group) = events.emit("checkin", mapOf("groupId" to g.id, "checkin" to Maps.checkin(g.checkin)))

    // ---------------------------------------------------------------- lost child (E6)

    /** QR payload for a child's lost card: lets any app user alert the family, nothing more. */
    @Synchronized
    fun lostChildPayload(groupId: String, memberId: String): String {
        val g = group(groupId)
        val m = g.members[memberId] ?: throw MeshException("no_member")
        val fk = Base64.getUrlEncoder().withoutPadding().encodeToString(Tags.finderKey(g.key))
        val name = Base64.getUrlEncoder().withoutPadding().encodeToString(m.name.toByteArray())
        return "$FOUND_PREFIX$fk.$name"
    }

    @Synchronized
    fun reportFoundChild(payload: String, note: String): String {
        val raw = payload.trim().removePrefix(FOUND_PREFIX)
        val parts = raw.split('.')
        if (parts.size != 2) throw MeshException("bad_card")
        val fk: ByteArray
        val name: String
        try {
            fk = Base64.getUrlDecoder().decode(parts[0])
            name = String(Base64.getUrlDecoder().decode(parts[1]))
        } catch (e: IllegalArgumentException) {
            throw MeshException("bad_card")
        }
        if (fk.size != 32) throw MeshException("bad_card")
        val alertId = crypto.random(16)
        val body = LostChildBody(alertId, name, note.take(300), state.ownPosition)
        val header = envelope.header(PacketType.LOST_CHILD, fk, nowSec())
        val (pk, sk) = pseudonym("finder:" + (nowSec() / 86_400))
        originate(envelope.sealPublic(header, fk, pk, sk, body.encode()), null)
        flush()
        return alertId.hex()
    }

    private fun onLostChild(g: Group, body: LostChildBody, finderPk: ByteArray, h: Header) {
        events.emit(
            "lostChildFound",
            mapOf(
                "groupId" to g.id,
                "alertId" to body.alertId.hex(),
                "childName" to body.childName,
                "note" to body.note,
                "position" to body.position?.let { Maps.position(it) },
                "finder" to finderPk.copyOf(4).hex(),
                "hops" to h.hop + 1,
                "atMs" to h.created * 1000,
            ),
        )
    }

    // ---------------------------------------------------------------- public: event channel, crowd alerts

    /** Per-event pseudonymous signing key, so public posts cannot be linked across events. */
    private fun pseudonym(label: String): Pair<ByteArray, ByteArray> {
        val k = crypto.identityFromSeed(crypto.hash(label.toByteArray(), 32, seedHash))
        return k.signPublic to k.signSecret
    }

    @Synchronized
    fun eventPublicKey(eventId: String): String = pseudonym("event:$eventId").first.hex()

    @Synchronized
    fun postEvent(eventId: String, text: String): Map<String, Any?> {
        if (text.isBlank() || text.codePointCount(0, text.length) > Limits.EVENT_TEXT_CHARS) throw MeshException("text_too_long")
        val (pk, sk) = pseudonym("event:$eventId")
        val last = state.lastEventPostBySender[pk.hex()] ?: 0
        if (nowSec() - last < EVENT_POST_INTERVAL_SEC) throw MeshException("rate_limited")
        state.lastEventPostBySender[pk.hex()] = nowSec()
        val key = Tags.eventKey(eventId)
        val header = envelope.header(PacketType.EVENT_CHANNEL, key, nowSec())
        val packet = envelope.sealPublic(header, key, pk, sk, EventChannelBody(eventId, text).encode())
        originate(packet, null)
        val post = EventPost(packet.header.msgId.hex(), eventId, pk.hex(), text, nowMs(), true)
        state.eventPosts.add(post)
        trimPosts()
        markDirty()
        return Maps.post(post)
    }

    @Synchronized
    fun eventPosts(eventId: String): List<Map<String, Any?>> =
        state.eventPosts.filter { it.eventId == eventId && it.senderPk !in state.blockedSenders }.map { Maps.post(it) }

    /** Spam report (F4): hide the sender and stop relaying their posts. */
    @Synchronized
    fun reportPost(msgId: String) {
        val post = state.eventPosts.firstOrNull { it.msgId == msgId } ?: return
        if (post.mine) return
        state.blockedSenders.add(post.senderPk)
        markDirty()
    }

    @Synchronized
    fun reportCrowd(eventId: String, kind: CrowdKind, label: String, lat: Double, lon: Double, organiserCert: String?): String {
        val (pk, sk) = pseudonym("event:$eventId")
        val last = publicSender["crowd:" + pk.hex()] ?: 0
        if (nowSec() - last < CROWD_REPORT_INTERVAL_SEC) throw MeshException("rate_limited")
        publicSender["crowd:" + pk.hex()] = nowSec()
        val alertId = crypto.random(16)
        val body = CrowdAlertBody(alertId, eventId, kind, label.take(60), lat, lon, organiserCert?.toByteArray() ?: ByteArray(0))
        val key = Tags.eventKey(eventId)
        val header = envelope.header(PacketType.CROWD_ALERT, key, nowSec())
        originate(envelope.sealPublic(header, key, pk, sk, body.encode()), null)
        val org = organiserCert?.let { licences.verifyOrganiserCert(it.toByteArray(), nowSec()) }?.takeIf { it.pk == pk.hex() }
        addCrowdReport(CrowdReport(alertId.hex(), eventId, pk.hex(), kind.name, body.label, lat, lon, nowMs(), org?.name ?: ""))
        return alertId.hex()
    }

    /**
     * Crowd alerts are verified only after 3 independent reports of the same kind within 200 m and
     * 5 minutes, or one report carrying a valid organiser certificate (E8).
     */
    @Synchronized
    fun crowdAlerts(eventId: String): List<Map<String, Any?>> = CrowdVerifier.clusters(
        state.crowd.filter { it.eventId == eventId && it.senderPk !in state.blockedSenders },
        nowMs(),
    )

    private fun addCrowdReport(r: CrowdReport) {
        if (state.crowd.any { it.alertId == r.alertId }) return
        state.crowd.add(r)
        state.crowd.removeAll { nowMs() - it.receivedAt > 3_600_000 }
        markDirty()
        for (c in CrowdVerifier.clusters(state.crowd.filter { it.eventId == r.eventId }, nowMs())) {
            val id = c["clusterId"] as String
            if (c["verified"] == true && verifiedCrowd.add(id)) events.emit("crowdAlert", c + mapOf("eventId" to r.eventId))
        }
    }

    private fun onPublicPacket(packet: Packet, setEvent: (String) -> Unit): Local {
        val h = packet.header
        if (h.type == PacketType.PUBLIC_SOS) {
            if (!Crypto.constantTimeEquals(h.tag, tagFor(Tags.publicSosKey, h.created, "public"))) return Local.OTHER
            val inner = envelope.openPublic(packet, Tags.publicSosKey) ?: return Local.VETO
            onPublicSos(PublicSosBody.read(com.rohanic.meshradar.core.protocol.ByteReader(inner.body)))
            return Local.OTHER
        }
        val eventIds = (listOf(state.activeEventId) + activeGroups().map { it.eventId }).filter { it.isNotBlank() }.distinct()
        for (eventId in eventIds) {
            val key = Tags.eventKey(eventId)
            if (!Crypto.constantTimeEquals(h.tag, tagFor(key, h.created, "e:$eventId"))) continue
            val inner = envelope.openPublic(packet, key) ?: return Local.VETO
            val sender = inner.senderPk.hex()
            if (sender in state.blockedSenders) return Local.VETO
            setEvent(eventId)
            when (val body = decodeBody(h.type, inner.body)) {
                is EventChannelBody -> {
                    if (body.eventId != eventId) return Local.VETO
                    val last = publicSender["post:$sender"] ?: 0
                    if (h.created - last < EVENT_POST_INTERVAL_SEC - 5) return Local.VETO
                    publicSender["post:$sender"] = h.created
                    val post = EventPost(h.msgId.hex(), eventId, sender, body.text, h.created * 1000, false)
                    state.eventPosts.add(post)
                    trimPosts()
                    markDirty()
                    events.emit("eventPost", Maps.post(post))
                }
                is CrowdAlertBody -> {
                    if (body.eventId != eventId) return Local.VETO
                    val last = publicSender["crowd:$sender"] ?: 0
                    if (h.created - last < CROWD_REPORT_INTERVAL_SEC - 5) return Local.VETO
                    publicSender["crowd:$sender"] = h.created
                    val org = licences.verifyOrganiserCert(body.organiserCert, nowSec())?.takeIf { it.pk == sender && it.eventId == eventId }
                    addCrowdReport(CrowdReport(body.alertId.hex(), eventId, sender, body.kind.name, body.label, body.lat, body.lon, h.created * 1000, org?.name ?: ""))
                }
                else -> return Local.VETO
            }
            return Local.OTHER
        }
        return Local.OTHER
    }

    private fun trimPosts() {
        while (state.eventPosts.size > 500) state.eventPosts.removeAt(0)
    }

    // ---------------------------------------------------------------- join handshake (LINK scope)

    private fun onLinkPacket(packet: Packet): Local {
        val h = packet.header
        when (h.type) {
            PacketType.JOIN_REQUEST -> {
                joinWindows.values.removeAll { it.expiresMs < nowMs() }
                for (w in joinWindows.values) {
                    val key = Tags.joinKey(w.code)
                    if (!Crypto.constantTimeEquals(h.tag, Tags.tag(key, h.created))) continue
                    val inner = envelope.openPublic(packet, key) ?: return Local.VETO
                    val body = JoinRequestBody.read(com.rohanic.meshradar.core.protocol.ByteReader(inner.body))
                    if (!inner.senderPk.contentEquals(body.signPk)) return Local.VETO
                    val rid = body.requestId.hex()
                    val g = state.groups[w.groupId] ?: return Local.MINE
                    val memberId = envelope.memberId(body.signPk).hex()
                    if (g.members.containsKey(memberId) || joinsIn.containsKey(rid)) return Local.MINE
                    joinsIn[rid] = IncomingJoin(body, w.code, w.groupId, nowMs())
                    events.emit(
                        "joinRequest",
                        mapOf("requestId" to rid, "groupId" to w.groupId, "name" to body.name, "colour" to body.colour, "avatarPreset" to body.avatarPreset, "memberId" to memberId),
                    )
                    return Local.MINE
                }
            }
            PacketType.JOIN_ACCEPT -> {
                for ((rid, out) in joinsOut) {
                    if (out.done) continue
                    val key = Tags.joinKey(out.code)
                    if (!Crypto.constantTimeEquals(h.tag, Tags.tag(key, h.created))) continue
                    val inner = envelope.openPublic(packet, key) ?: return Local.VETO
                    val body = JoinAcceptBody.read(com.rohanic.meshradar.core.protocol.ByteReader(inner.body))
                    if (!body.requestId.contentEquals(out.requestId)) continue
                    out.done = true
                    if (body.sealedInvite.isEmpty()) {
                        events.emit("joinResult", mapOf("requestId" to rid, "ok" to false, "reason" to "declined"))
                        return Local.MINE
                    }
                    val shared = crypto.pairKey(identity.boxSecret, identity.boxPublic, body.ephemeralPk)
                    val plain = shared?.let { crypto.open(it, joinNonce(out.requestId, body.ephemeralPk), body.sealedInvite, out.requestId) }
                    if (plain == null) {
                        events.emit("joinResult", mapOf("requestId" to rid, "ok" to false, "reason" to "invalid"))
                        return Local.MINE
                    }
                    val result = try {
                        addGroupFromInvite(GroupInvite.decode(plain))
                    } catch (e: MeshException) {
                        events.emit("joinResult", mapOf("requestId" to rid, "ok" to false, "reason" to e.code))
                        return Local.MINE
                    }
                    events.emit("joinResult", mapOf("requestId" to rid, "ok" to true, "group" to result))
                    return Local.MINE
                }
            }
            else -> {}
        }
        return Local.OTHER
    }

    // ---------------------------------------------------------------- licences, drills, UWB, packs

    @Synchronized
    fun importLicence(token: String): Map<String, Any?> {
        val lic = licences.verify(token, nowSec()) ?: throw MeshException("bad_licence")
        if (lic.sub != signPublicHex) throw MeshException("licence_not_mine")
        if (token !in ownLicences) ownLicences.add(token)
        for (g in state.groups.values) {
            if (isLeader(g) && token !in g.licences) {
                g.licences.add(token)
                g.maxMembers = maxOf(g.maxMembers, tierOf(g).maxMembers)
                if (!g.archived) sendGroup(g, LicenceBody(token.toByteArray()))
            }
        }
        markDirty()
        emitGroups()
        return Maps.licence(lic)
    }

    /** Event packs and other server files are signed with the licence key (F2, DEC-031). */
    @Synchronized
    fun verifyServerSignature(message: ByteArray, signature: ByteArray): Boolean =
        config.licencePublicKey?.let { crypto.verify(signature, message, it) } ?: false

    @Synchronized
    fun restoreLicences(tokens: List<String>) {
        tokens.forEach { if (it !in ownLicences && licences.verify(it, nowSec())?.sub == signPublicHex) ownLicences.add(it) }
    }

    private fun onLicence(g: Group, body: LicenceBody) {
        val token = String(body.token, Charsets.UTF_8)
        if (token in g.licences) return
        val lic = licences.verify(token, nowSec()) ?: return
        if (lic.sub != g.leaderSignPk.hex()) return
        g.licences.add(token)
        g.maxMembers = maxOf(g.maxMembers, lic.tier.maxMembers)
        markDirty()
        events.emit("licence", mapOf("groupId" to g.id, "tier" to tierOf(g).name.lowercase()))
        emitGroup(g)
    }

    @Synchronized
    fun entitlements(groupId: String?): Map<String, Any?> {
        val tier = groupId?.let { state.groups[it]?.let(::tierOf) } ?: myTier()
        val best = if (tier.rank >= myTier().rank) tier else myTier()
        return Maps.tier(best) + mapOf("groupTier" to tier.name.lowercase(), "myTier" to myTier().name.lowercase())
    }

    @Synchronized
    fun sendDrill(groupId: String, kind: DrillKind, drillId: String?, hiderId: String, durationSec: Int): String {
        val g = group(groupId)
        val id = drillId?.let { hexToBytes(it) } ?: crypto.random(16)
        sendGroup(g, DrillBody(kind, id, hexToBytes(hiderId), durationSec, nowSec()))
        return id.hex()
    }

    @Synchronized
    fun sendUwb(groupId: String, memberId: String, body: UwbBody) {
        val g = group(groupId)
        val m = g.members[memberId] ?: throw MeshException("no_member")
        sendGroup(g, body, m)
    }

    @Synchronized
    fun sharePack(groupId: String, packId: String, json: String) {
        val g = group(groupId)
        val gz = gzip(json.toByteArray())
        if (gz.size > Limits.PACK_BYTES) throw MeshException("pack_too_large")
        sendGroup(g, PackBody(packId, gz))
    }

    private fun onPack(g: Group, sender: Member, body: PackBody) {
        val json = try {
            String(gunzip(body.gzipJson, 256 * 1024), Charsets.UTF_8)
        } catch (e: java.io.IOException) {
            return
        }
        events.emit("pack", mapOf("groupId" to g.id, "from" to sender.id, "fromName" to sender.name, "packId" to body.packId, "json" to json))
    }

    // ---------------------------------------------------------------- status and housekeeping

    @Synchronized
    fun health(): Map<String, Any?> {
        val cutoff = nowMs() - 10 * 60_000
        val hops = recentHops.filter { it.first >= cutoff }.map { it.second }
        return mapOf(
            "neighbours" to link.neighbours().size,
            "maxHops" to (hops.maxOrNull() ?: 0),
            "lastPacketMs" to lastPacketMs,
            "lastSyncMs" to lastSyncMs,
            "stored" to packetStore.count(),
            "seen" to router.seen.size(),
            "relayEnabled" to relayEnabled(),
            "powerMode" to state.powerMode.name.lowercase(),
            "eventDay" to state.eventDay,
            "activeEventId" to state.activeEventId,
            "relayedForOthers" to state.stats.relayedForOthers,
            "relayedByEvent" to state.stats.relayedByEvent.toMap(),
            "messagesSent" to state.stats.messagesSent,
            "sosSent" to state.stats.sosSent,
        )
    }

    private fun emitStatus() = events.emit("health", health())
    private fun emitGroups() = events.emit("groups", mapOf("groups" to state.groups.values.map { Maps.group(it, myId, tierOf(it)) }))
    private fun emitGroup(g: Group) = events.emit("group", groupDetail(g.id))

    /** Called by the platform every 250 ms or so. */
    @Synchronized
    fun tick() {
        val now = nowMs()
        val nowS = now / 1000
        // Relays whose jitter has elapsed.
        while (true) {
            val next = relayQueue.peek() ?: break
            if (next.dueMs > now) break
            relayQueue.poll()
            val h = next.packet.header
            if (nowS > h.expiresAt()) continue
            if (next.repeat) {
                broadcastFrame(Frame.PacketFrame(next.packet).encode(), null)
                continue
            }
            val out = Packet(h.withHop(h.hop + 1), next.packet.payload)
            broadcastFrame(Frame.PacketFrame(out).encode(), null)
            if (h.type.priority == 0) relayQueue.add(PendingRelay(now + SAFETY_REPEAT_MS, out, false, "", repeat = true))
            if (next.forOthers) {
                state.stats.relayedForOthers++
                if (next.eventId.isNotBlank() || state.activeEventId.isNotBlank()) {
                    val ev = next.eventId.ifBlank { state.activeEventId }
                    state.stats.relayedByEvent[ev] = (state.stats.relayedByEvent[ev] ?: 0) + 1
                }
                markDirty()
            }
        }
        // Link acks (D3 "In the mesh").
        if (pendingAcks.isNotEmpty()) {
            for ((endpoint, ids) in pendingAcks) if (ids.isNotEmpty()) link.send(endpoint, Frame.Ack(ids.toList()).encode())
            pendingAcks.clear()
        }
        // Receipts, batched every 3 s.
        if (now - lastReceiptFlushMs > RECEIPT_FLUSH_MS) {
            lastReceiptFlushMs = now
            flushReceipts(pendingDelivered, ReceiptKind.DELIVERED)
            flushReceipts(pendingRead, ReceiptKind.READ)
        }
        // SOS re-broadcast every 30 s until resolved (flow 3).
        state.ownSos?.let { if (now - it.lastSentMs >= SOS_REPEAT_MS) broadcastSos(it) }
        // Join requests: retry every 3 s for 60 s.
        for ((rid, out) in joinsOut.toMap()) {
            if (out.done) continue
            if (now - out.startedMs > JOIN_TIMEOUT_MS) {
                out.done = true
                events.emit("joinResult", mapOf("requestId" to rid, "ok" to false, "reason" to "timeout"))
            } else if (now - out.lastSentMs > 3_000) {
                sendJoinRequest(out)
            }
        }
        // Member announcements every 10 minutes help phones that joined late.
        if (now - lastAnnounceMs > ANNOUNCE_MS) {
            lastAnnounceMs = now
            activeGroups().forEach { announce(it) }
        }
        checkDeadlines(nowS)
        // Event groups auto-archive after the event (B6).
        for (g in activeGroups()) {
            if (g.expiresAt in 1 until nowS) {
                g.archived = true
                markDirty()
                events.emit("groupArchived", mapOf("groupId" to g.id, "name" to g.name))
            }
        }
        if (now - lastPruneMs > PRUNE_MS) {
            lastPruneMs = now
            packetStore.pruneExpired(nowS)
            breadcrumbs.prune(nowS - MemoryBreadcrumbLog.WINDOW_SEC)
            state.crumbs.removeAll { now - it.receivedAt > 24 * 3_600_000L }
            state.sos.values.removeAll { it.resolved && now - it.lastAt > 24 * 3_600_000L }
            joinsIn.values.removeAll { now - it.atMs > JOIN_WINDOW_MS }
            joinsOut.values.removeAll { it.done && now - it.startedMs > JOIN_TIMEOUT_MS * 2 }
            unknownSender.values.forEach { l -> l.removeAll { Router.isExpired(it.first, nowS) } }
            unknownSender.values.removeAll { it.isEmpty() }
            tagCache.clear()
            markDirty()
        }
        if (dirty && now - lastSaveMs > SAVE_MS) flush()
    }

    private fun flushReceipts(pending: HashMap<String, MutableList<ByteArray>>, kind: ReceiptKind) {
        for ((groupId, ids) in pending) {
            val g = state.groups[groupId] ?: continue
            ids.chunked(Limits.RECEIPT_IDS).forEach { chunk -> sendGroup(g, ReceiptBody(kind, chunk)) }
        }
        pending.clear()
    }

    /** Delete everything (H4): keys are wiped by the platform; this clears all stored data. */
    @Synchronized
    fun wipe() {
        state = CoreState()
        stateStore.clear()
        packetStore.clear()
        messages.clear()
        breadcrumbs.clear()
        router.seen.clear()
        relayQueue.clear()
        joinWindows.clear(); joinsIn.clear(); joinsOut.clear()
        unknownSender.clear()
        latestPositionPacket = null; latestSosPacket = null; latestCrumbPacket = null
    }

    companion object {
        const val INVITE_PREFIX = "meshradar://join/"
        const val FOUND_PREFIX = "meshradar://found/"
        const val JOIN_WINDOW_MS = 10 * 60_000L
        const val JOIN_TIMEOUT_MS = 60_000L
        const val SOS_REPEAT_MS = 30_000L
        const val SAFETY_REPEAT_MS = 300L
        const val ANNOUNCE_MS = 10 * 60_000L
        const val RECEIPT_FLUSH_MS = 3_000L
        const val PRUNE_MS = 60_000L
        const val SAVE_MS = 2_000L
        const val MAX_SYNC_SEND = 500
        const val OWN_BUFFER = 200
        const val UNKNOWN_PER_SENDER = 50
        const val UNKNOWN_SENDERS = 200
        const val EVENT_POST_INTERVAL_SEC = 5 * 60L
        const val CROWD_REPORT_INTERVAL_SEC = 2 * 60L

        fun gzip(b: ByteArray): ByteArray {
            val bos = ByteArrayOutputStream()
            GZIPOutputStream(bos).use { it.write(b) }
            return bos.toByteArray()
        }

        /** Gunzip with an output cap (a small packet must not inflate into a memory bomb). */
        fun gunzip(b: ByteArray, max: Int): ByteArray {
            GZIPInputStream(ByteArrayInputStream(b)).use { input ->
                val out = ByteArrayOutputStream()
                val buf = ByteArray(4096)
                while (true) {
                    val n = input.read(buf)
                    if (n < 0) break
                    out.write(buf, 0, n)
                    if (out.size() > max) throw java.io.IOException("too large")
                }
                return out.toByteArray()
            }
        }
    }
}

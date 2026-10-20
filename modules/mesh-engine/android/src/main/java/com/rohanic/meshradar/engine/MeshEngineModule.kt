package com.rohanic.meshradar.engine

import android.content.Context
import android.content.Intent
import com.rohanic.meshradar.core.engine.MeshException
import com.rohanic.meshradar.core.model.PowerMode
import com.rohanic.meshradar.core.protocol.ChatKind
import com.rohanic.meshradar.core.protocol.Checkpoint
import com.rohanic.meshradar.core.protocol.CrowdKind
import com.rohanic.meshradar.core.protocol.DrillKind
import com.rohanic.meshradar.core.protocol.EmergencyCard
import com.rohanic.meshradar.core.protocol.ResolveReason
import com.rohanic.meshradar.core.protocol.Role
import com.rohanic.meshradar.core.protocol.SosKind
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Base64

/**
 * JS bridge (Expo Modules API). Shapes match modules/mesh-engine/src/MeshEngine.types.ts.
 * Times cross the bridge as milliseconds; binary data as base64.
 */
class MeshEngineModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw CodedException("no_context", "React context is gone", null)

    private val forward: (String, Map<String, Any?>) -> Unit = { name, payload -> sendEvent(name, payload) }

    private inline fun <T> guard(block: () -> T): T = try {
        block()
    } catch (e: MeshException) {
        throw CodedException(e.code, e.message, e)
    } catch (e: IllegalArgumentException) {
        throw CodedException("invalid_argument", e.message, e)
    } catch (e: IllegalStateException) {
        throw CodedException(e.message ?: "invalid_state", e.message, e)
    }

    private fun b64(s: String?): ByteArray = if (s.isNullOrEmpty()) ByteArray(0) else Base64.getDecoder().decode(s)

    private fun str(m: Map<String, Any?>, k: String): String = (m[k] as? String) ?: ""
    private fun optStr(m: Map<String, Any?>, k: String): String? = (m[k] as? String)?.takeIf { it.isNotEmpty() }
    private fun num(m: Map<String, Any?>, k: String): Double? = (m[k] as? Number)?.toDouble()
    private fun int(m: Map<String, Any?>, k: String, d: Int = 0): Int = (m[k] as? Number)?.toInt() ?: d

    override fun definition() = ModuleDefinition {
        Name("MeshEngine")

        Events(
            "engineState", "health", "groups", "group", "position", "ownPosition", "heading", "pressure", "battery",
            "message", "messageState", "pins", "sos", "sosResolved", "publicSos", "publicSosEnded", "crumb", "lowBattery",
            "checkin", "checkedIn", "checkinMissed", "separation", "separationCleared", "lostChildFound", "joinRequest",
            "joinResult", "memberJoined", "groupFull", "groupArchived", "removedFromGroup", "licence", "eventPost",
            "crowdAlert", "drill", "uwb", "uwbRange", "uwbState", "pack", "photoReceived", "photoRequest", "photoMeta",
        )

        OnCreate {
            appContext.reactContext?.let { Engine.init(it) }
            Engine.addListener(forward)
        }

        OnDestroy { Engine.removeListener(forward) }

        OnActivityEntersForeground { Engine.appInForeground = true }

        OnActivityEntersBackground {
            Engine.appInForeground = false
            Engine.setHeadingActive(false)
        }

        // ------------------------------------------------------------ setup and lifecycle

        AsyncFunction("configure") { licencePublicKey: String, apiBaseUrl: String, appVersion: Int ->
            Engine.configure(context, licencePublicKey, apiBaseUrl, appVersion)
        }

        AsyncFunction("setStrings") { json: String -> Engine.setStrings(json) }

        AsyncFunction("identity") { guard { Engine.core.identityInfo() } }

        AsyncFunction("state") { Engine.init(context); Engine.state() }

        AsyncFunction("requiredPermissions") { Radios.required() + listOfNotNull(if (android.os.Build.VERSION.SDK_INT >= 33) "android.permission.POST_NOTIFICATIONS" else null) }

        AsyncFunction("start") {
            Engine.appInForeground = true
            context.startForegroundService(Intent(context, MeshService::class.java))
        }

        AsyncFunction("stop") { context.stopService(Intent(context, MeshService::class.java)) }

        AsyncFunction("setPowerMode") { mode: String ->
            guard { Engine.setPowerMode(PowerMode.valueOf(mode.uppercase())) }
        }

        AsyncFunction("setRelay") { on: Boolean -> Engine.core.setRelay(on) }

        AsyncFunction("setEventDay") { on: Boolean, eventId: String -> Engine.setEventDay(on, eventId) }

        AsyncFunction("setActiveEvent") { eventId: String -> Engine.core.setActiveEvent(eventId) }

        AsyncFunction("setHeadingActive") { on: Boolean -> Engine.setHeadingActive(on) }

        AsyncFunction("health") { Engine.core.health() }

        AsyncFunction("openSettings") { kind: String -> context.startActivity(Radios.settingsIntent(context, kind)) }

        AsyncFunction("wipe") { Engine.wipe(context) }

        // ------------------------------------------------------------ profile (A3, A4)

        AsyncFunction("setProfile") { p: Map<String, Any?> ->
            guard {
                @Suppress("UNCHECKED_CAST")
                val c = (p["card"] as? Map<String, Any?>) ?: emptyMap()
                Engine.core.setProfile(
                    str(p, "name"),
                    int(p, "colour"),
                    int(p, "avatarPreset"),
                    b64(optStr(p, "avatarPhoto")),
                    EmergencyCard(str(c, "name"), str(c, "bloodGroup"), str(c, "conditions"), str(c, "medicines"), str(c, "contactName"), str(c, "contactPhone"), str(c, "stay")),
                )
                Engine.updateStatusNotification()
            }
        }

        AsyncFunction("profile") { Engine.core.profile() }

        AsyncFunction("setLockScreenCard") { on: Boolean -> Engine.setLockScreenCard(on) }

        // ------------------------------------------------------------ groups (B1 to B6)

        AsyncFunction("createGroup") { p: Map<String, Any?> ->
            guard { Engine.core.createGroup(str(p, "name"), str(p, "eventId"), ((num(p, "expiresAtMs") ?: 0.0) / 1000).toLong(), int(p, "colour")) }
        }

        AsyncFunction("invitePayload") { groupId: String -> guard { Engine.core.invitePayload(groupId) } }

        AsyncFunction("joinByInvite") { payload: String -> guard { Engine.core.joinByInvite(payload) } }

        AsyncFunction("openJoinWindow") { groupId: String -> guard { Engine.core.openJoinWindow(groupId) } }

        AsyncFunction("closeJoinWindow") { groupId: String -> Engine.core.closeJoinWindow(groupId) }

        AsyncFunction("requestJoinByCode") { code: String -> guard { Engine.core.requestJoinByCode(code) } }

        AsyncFunction("cancelJoin") { requestId: String -> Engine.core.cancelJoin(requestId) }

        AsyncFunction("answerJoin") { requestId: String, accept: Boolean -> guard { Engine.core.answerJoin(requestId, accept) } }

        AsyncFunction("leaveGroup") { groupId: String -> guard { Engine.core.leaveGroup(groupId); Engine.setFamilyCircle(groupId, false) } }

        AsyncFunction("setArchived") { groupId: String, archived: Boolean -> guard { Engine.core.setArchived(groupId, archived) } }

        AsyncFunction("setGroupColour") { groupId: String, colour: Int -> guard { Engine.core.setGroupColour(groupId, colour) } }

        AsyncFunction("setRole") { groupId: String, memberId: String, role: String ->
            guard { Engine.core.setRole(groupId, memberId, Role.valueOf(role.uppercase())) }
        }

        AsyncFunction("transferLeader") { groupId: String, memberId: String -> guard { Engine.core.transferLeader(groupId, memberId) } }

        AsyncFunction("removeMember") { groupId: String, memberId: String -> guard { Engine.core.removeMember(groupId, memberId) } }

        AsyncFunction("updateGroup") { groupId: String, p: Map<String, Any?> ->
            guard {
                Engine.core.updateGroup(groupId, optStr(p, "name"), num(p, "separationM")?.toInt(), num(p, "expiresAtMs")?.let { (it / 1000).toLong() })
            }
        }

        AsyncFunction("groups") { Engine.core.groups() }

        AsyncFunction("groupDetail") { groupId: String -> guard { Engine.core.groupDetail(groupId) } }

        // ------------------------------------------------------------ messaging (D1 to D6, G2)

        AsyncFunction("sendChat") { p: Map<String, Any?> ->
            guard {
                Engine.core.sendChat(
                    str(p, "groupId"),
                    optStr(p, "recipientId"),
                    ChatKind.valueOf(str(p, "kind").uppercase()),
                    str(p, "text"),
                    int(p, "quickCode"),
                    num(p, "lat"),
                    num(p, "lon"),
                    optStr(p, "refId"),
                )
            }
        }

        AsyncFunction("sendThumbnail") { p: Map<String, Any?> ->
            guard {
                val groupId = str(p, "groupId")
                val imageId = optStr(p, "imageId") ?: java.util.UUID.randomUUID().toString().replace("-", "")
                var fullSize = 0L
                optStr(p, "photoUri")?.let { uri ->
                    Engine.photos?.saveOwn(groupId, imageId, uri)
                    fullSize = num(p, "fullSize")?.toLong() ?: 1L
                }
                Engine.core.sendThumbnail(groupId, optStr(p, "recipientId"), str(p, "caption"), b64(optStr(p, "image")), fullSize, imageId)
            }
        }

        AsyncFunction("requestPhoto") { groupId: String, photoId: String -> Engine.handler.post { Engine.photos?.request(groupId, photoId) } }

        AsyncFunction("localPhoto") { photoId: String -> Engine.photos?.localUri(photoId) }

        AsyncFunction("sendMoment") { p: Map<String, Any?> ->
            guard { Engine.core.sendMoment(str(p, "groupId"), str(p, "note"), num(p, "lat"), num(p, "lon"), b64(optStr(p, "thumbnail"))) }
        }

        AsyncFunction("markRead") { groupId: String, msgIds: List<String> -> Engine.core.markRead(groupId, msgIds) }

        AsyncFunction("messages") { groupId: String, peerId: String?, beforeMs: Double, limit: Int ->
            Engine.core.messages(groupId, peerId?.takeIf { it.isNotEmpty() }, beforeMs.toLong(), limit)
        }

        AsyncFunction("moments") { groupId: String -> Engine.core.moments(groupId) }

        AsyncFunction("quickReplyAll") { code: Int -> Engine.core.quickReplyAll(code) }

        // ------------------------------------------------------------ meeting points (C6)

        AsyncFunction("setPin") { p: Map<String, Any?> ->
            guard { Engine.core.setPin(str(p, "groupId"), optStr(p, "pinId"), str(p, "name"), num(p, "lat") ?: 0.0, num(p, "lon") ?: 0.0, int(p, "floor"), int(p, "icon")) }
        }

        AsyncFunction("deletePin") { groupId: String, pinId: String -> guard { Engine.core.deletePin(groupId, pinId) } }

        // ------------------------------------------------------------ safety (E1 to E9)

        AsyncFunction("startSos") { kind: String, silent: Boolean ->
            guard {
                val r = Engine.core.startSos(SosKind.valueOf(kind.uppercase()), silent)
                Engine.handler.post { Engine.ble?.update(Engine.core.beaconPackets()) }
                r
            }
        }

        AsyncFunction("resolveSos") { sosId: String, reason: String -> guard { Engine.core.resolveSos(sosId, ResolveReason.valueOf(reason.uppercase())) } }

        AsyncFunction("sosState") { Engine.core.sosState() }

        AsyncFunction("crumbs") { Engine.core.crumbs() }

        AsyncFunction("batteryLevel") { Engine.batteryLevel(context) }

        AsyncFunction("setCheckinTimer") { groupId: String, deadlineMs: Double -> guard { Engine.core.setCheckinTimer(groupId, (deadlineMs / 1000).toLong()) } }

        AsyncFunction("cancelCheckinTimer") { groupId: String -> guard { Engine.core.cancelCheckinTimer(groupId) } }

        AsyncFunction("checkIn") { groupId: String, checkpoint: Int -> guard { Engine.core.checkIn(groupId, checkpoint) } }

        AsyncFunction("setCheckinPlan") { groupId: String, checkpoints: List<Map<String, Any?>>, deadlineMs: Double ->
            guard {
                Engine.core.setCheckinPlan(
                    groupId,
                    checkpoints.map { Checkpoint(str(it, "name"), num(it, "lat") ?: 0.0, num(it, "lon") ?: 0.0, int(it, "radiusM", 80)) },
                    (deadlineMs / 1000).toLong(),
                )
            }
        }

        AsyncFunction("breadcrumbs") { groupId: String, memberId: String, sinceMs: Double ->
            guard { Engine.core.breadcrumbs(groupId, memberId, (sinceMs / 1000).toLong()) }
        }

        AsyncFunction("lostChildPayload") { groupId: String, memberId: String -> guard { Engine.core.lostChildPayload(groupId, memberId) } }

        AsyncFunction("reportFoundChild") { payload: String, note: String -> guard { Engine.core.reportFoundChild(payload, note) } }

        AsyncFunction("setLockWallpaper") { uri: String -> Wallpaper.setLockScreen(context, uri) }

        // ------------------------------------------------------------ events (F3, F4, E8)

        AsyncFunction("postEvent") { eventId: String, text: String -> guard { Engine.core.postEvent(eventId, text) } }

        AsyncFunction("eventPosts") { eventId: String -> Engine.core.eventPosts(eventId) }

        AsyncFunction("reportPost") { msgId: String -> Engine.core.reportPost(msgId) }

        AsyncFunction("reportCrowd") { p: Map<String, Any?> ->
            guard {
                Engine.core.reportCrowd(str(p, "eventId"), CrowdKind.valueOf(str(p, "kind").uppercase()), str(p, "label"), num(p, "lat") ?: 0.0, num(p, "lon") ?: 0.0, optStr(p, "organiserCert"))
            }
        }

        AsyncFunction("crowdAlerts") { eventId: String -> Engine.core.crowdAlerts(eventId) }

        AsyncFunction("eventPublicKey") { eventId: String -> Engine.core.eventPublicKey(eventId) }

        AsyncFunction("signForEvent") { eventId: String, message: String ->
            Base64.getEncoder().encodeToString(Engine.core.signForEvent(eventId, message.toByteArray(Charsets.UTF_8)))
        }

        AsyncFunction("sharePack") { groupId: String, packId: String, json: String -> guard { Engine.core.sharePack(groupId, packId, json) } }

        // ------------------------------------------------------------ licences (section 10)

        AsyncFunction("importLicence") { token: String -> guard { Engine.core.importLicence(token) } }

        AsyncFunction("restoreLicences") { tokens: List<String> -> Engine.core.restoreLicences(tokens) }

        AsyncFunction("verifySignature") { message: String, signatureB64: String ->
            try {
                Engine.core.verifyServerSignature(message.toByteArray(Charsets.UTF_8), Base64.getDecoder().decode(signatureB64))
            } catch (e: IllegalArgumentException) {
                false
            }
        }

        AsyncFunction("entitlements") { groupId: String? -> Engine.core.entitlements(groupId?.takeIf { it.isNotEmpty() }) }

        // ------------------------------------------------------------ social (G4, G6)

        AsyncFunction("sendDrill") { p: Map<String, Any?> ->
            guard {
                Engine.core.sendDrill(str(p, "groupId"), DrillKind.valueOf(str(p, "kind").uppercase()), optStr(p, "drillId"), str(p, "hiderId"), int(p, "durationSec", 300))
            }
        }

        AsyncFunction("setFamilyCircle") { groupId: String, on: Boolean -> Engine.setFamilyCircle(groupId, on) }

        AsyncFunction("familyCircleGroups") { Engine.familyCircleGroups() }

        // ------------------------------------------------------------ UWB (C8)

        AsyncFunction("uwbSupported") { Engine.uwb?.supported == true }

        AsyncFunction("startUwb") { groupId: String, memberId: String -> guard { Engine.uwb?.start(groupId, memberId) ?: throw IllegalStateException("uwb_unsupported") } }

        AsyncFunction("stopUwb") { Engine.uwb?.stop() }
    }
}

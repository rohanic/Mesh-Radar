package com.rohanic.meshradar.engine

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import com.rohanic.meshradar.core.geo.Geo
import kotlin.math.roundToInt

/**
 * Notifications posted by the engine, so safety alerts arrive with the UI closed (section 8).
 * Text comes from the JS i18n bundle (setStrings) with English fallbacks.
 */
class Notifier(private val context: Context) {
    private val nm = context.getSystemService(NotificationManager::class.java)

    fun createChannels() {
        val alarm = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val channels = listOf(
            NotificationChannel(CH_STATUS, s("channel.status", "Mesh status"), NotificationManager.IMPORTANCE_LOW).apply {
                setShowBadge(false)
            },
            NotificationChannel(CH_SOS, s("channel.sos", "SOS alerts"), NotificationManager.IMPORTANCE_HIGH).apply {
                setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), alarm)
                enableVibration(true)
                vibrationPattern = SOS_VIBRATION
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                // Takes effect only if the person granted Do Not Disturb access (section 6, global).
                setBypassDnd(true)
            },
            NotificationChannel(CH_ALERTS, s("channel.alerts", "Safety alerts"), NotificationManager.IMPORTANCE_HIGH).apply {
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400)
            },
            NotificationChannel(CH_MESSAGES, s("channel.messages", "Group messages"), NotificationManager.IMPORTANCE_HIGH).apply {
                enableVibration(true)
                // Double pulse for a new message (section 7, haptics).
                vibrationPattern = longArrayOf(0, 80, 100, 80)
            },
        )
        nm.createNotificationChannels(channels)
    }

    // ---------------------------------------------------------------- persistent status (H1, A4)

    fun status(health: Map<String, Any?>, card: Map<String, Any?>?, showCard: Boolean): Notification {
        val n = (health["neighbours"] as? Int) ?: 0
        val hops = (health["maxHops"] as? Int) ?: 0
        val title = s("status.title", "Mesh Radar is on")
        val text = s("status.text", "{n} phones nearby, {hops} hops").replace("{n}", n.toString()).replace("{hops}", hops.toString())
        val b = Notification.Builder(context, CH_STATUS)
            .setSmallIcon(icon())
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setContentIntent(open("meshradar://radar"))
            .addAction(Notification.Action.Builder(null, s("action.ok", "I'm OK"), broadcast(ActionReceiver.ACTION_OK, 1)).build())
            .addAction(Notification.Action.Builder(null, s("action.sos", "SOS"), open("meshradar://sos?from=notification", 2)).build())
            .addAction(Notification.Action.Builder(null, s("action.stop", "Stop"), broadcast(ActionReceiver.ACTION_STOP, 3)).build())
        if (showCard && card != null && cardHasContent(card)) {
            // A4: readable from the lock screen without unlocking, only when the person opted in (DEC-025).
            val body = cardText(card)
            b.setStyle(Notification.BigTextStyle().bigText(body))
            b.setVisibility(Notification.VISIBILITY_PUBLIC)
            b.setPublicVersion(
                Notification.Builder(context, CH_STATUS).setSmallIcon(icon()).setContentTitle(s("card.title", "Emergency card"))
                    .setStyle(Notification.BigTextStyle().bigText(body)).setContentText(body).build(),
            )
        } else {
            b.setVisibility(Notification.VISIBILITY_PRIVATE)
        }
        return b.build()
    }

    private fun cardHasContent(c: Map<String, Any?>) = listOf("bloodGroup", "conditions", "medicines", "contactPhone", "stay").any { !(c[it] as? String).isNullOrBlank() }

    private fun cardText(c: Map<String, Any?>): String = buildList {
        (c["name"] as? String)?.takeIf { it.isNotBlank() }?.let { add(it) }
        (c["bloodGroup"] as? String)?.takeIf { it.isNotBlank() }?.let { add(s("card.blood", "Blood group") + ": " + it) }
        (c["conditions"] as? String)?.takeIf { it.isNotBlank() }?.let { add(s("card.conditions", "Conditions") + ": " + it) }
        (c["medicines"] as? String)?.takeIf { it.isNotBlank() }?.let { add(s("card.medicines", "Medicines") + ": " + it) }
        (c["contactPhone"] as? String)?.takeIf { it.isNotBlank() }?.let { add(s("card.contact", "Contact") + ": " + ((c["contactName"] as? String).orEmpty() + " " + it).trim()) }
        (c["stay"] as? String)?.takeIf { it.isNotBlank() }?.let { add(s("card.stay", "Hotel or tent") + ": " + it) }
    }.joinToString("\n")

    // ---------------------------------------------------------------- event alerts

    fun onEvent(name: String, p: Map<String, Any?>, own: Map<String, Any?>?, appInForeground: Boolean) {
        when (name) {
            "sos" -> if (p["first"] == true) sos(p, own)
            "publicSos" -> post(
                CH_ALERTS,
                ("pub:" + p["sosId"]).hashCode(),
                s("publicSos.title", "Someone nearby needs help"),
                s("publicSos.text", "Roughly {direction}, within about {within} m").replace("{direction}", dir(p["direction"] as? String)).replace("{within}", (p["withinM"] ?: "?").toString()),
                "meshradar://alert?type=publicSos&id=${p["sosId"]}",
            )
            "crumb" -> {
                val m = p["member"] as? Map<*, *>
                post(
                    CH_ALERTS,
                    ("crumb:" + p["memberId"]).hashCode(),
                    s("crumb.title", "{name}'s last location saved").replace("{name}", (m?.get("name") as? String) ?: "?"),
                    s("crumb.text", "Battery low or phone off. The pin stays on your radar for 24 hours."),
                    "meshradar://radar",
                )
            }
            "lostChildFound" -> post(
                CH_SOS,
                ("lost:" + p["alertId"]).hashCode(),
                s("lostChild.title", "{name} was found").replace("{name}", (p["childName"] as? String) ?: "?"),
                (p["note"] as? String)?.takeIf { it.isNotBlank() } ?: s("lostChild.text", "Open Mesh Radar to see where."),
                "meshradar://alert?type=lostChild&id=${p["alertId"]}",
                insistent = false,
            )
            "checkinMissed" -> {
                val m = p["member"] as? Map<*, *>
                post(
                    CH_ALERTS,
                    ("missed:" + p["groupId"] + p["memberId"] + p["kind"]).hashCode(),
                    s("checkin.title", "{name} missed a check-in").replace("{name}", (m?.get("name") as? String) ?: "?"),
                    s("checkin.text", "See their last known position."),
                    "meshradar://alert?type=checkin&group=${p["groupId"]}&member=${p["memberId"]}",
                )
            }
            "separation" -> {
                val m = p["member"] as? Map<*, *>
                val d = ((p["distanceM"] as? Double) ?: 0.0).roundToInt()
                post(
                    CH_ALERTS,
                    ("sep:" + p["groupId"] + (m?.get("id") ?: "")).hashCode(),
                    s("separation.title", "{name} is {distance} m away").replace("{name}", (m?.get("name") as? String) ?: "?").replace("{distance}", d.toString()),
                    s("separation.text", "Tap to find them."),
                    "meshradar://find?group=${p["groupId"]}&member=${m?.get("id")}",
                )
            }
            "crowdAlert" -> post(
                CH_ALERTS,
                ("crowd:" + p["clusterId"]).hashCode(),
                s("crowd.title", "Verified crowd alert"),
                (p["label"] as? String) ?: "",
                "meshradar://alert?type=crowd&id=${p["clusterId"]}",
            )
            "lowBattery" -> post(
                CH_ALERTS,
                "lowBattery".hashCode(),
                s("battery.title", "Battery at 15 percent"),
                s("battery.text", "Switch to Ultra-saver and tell your group?"),
                "meshradar://battery",
            )
            "joinRequest" -> if (!appInForeground) post(
                CH_ALERTS,
                ("join:" + p["requestId"]).hashCode(),
                s("join.title", "{name} wants to join").replace("{name}", (p["name"] as? String) ?: "?"),
                s("join.text", "Open Mesh Radar to accept."),
                "meshradar://groups",
            )
            "message" -> if (!appInForeground && p["outgoing"] != true) message(p)
            "sosResolved" -> nm.cancel(("sos:" + p["sosId"]).hashCode())
        }
    }

    private fun sos(p: Map<String, Any?>, own: Map<String, Any?>?) {
        val m = p["member"] as? Map<*, *>
        val pos = p["position"] as? Map<*, *>
        var where = ""
        val oLat = own?.get("lat") as? Double
        val oLon = own?.get("lon") as? Double
        val lat = pos?.get("lat") as? Double
        val lon = pos?.get("lon") as? Double
        if (oLat != null && oLon != null && lat != null && lon != null && (lat != 0.0 || lon != 0.0)) {
            val d = Geo.distanceM(oLat, oLon, lat, lon).roundToInt()
            where = s("sos.where", "{distance} m {direction}").replace("{distance}", d.toString())
                .replace("{direction}", dir(Geo.compass8(Geo.bearingDeg(oLat, oLon, lat, lon))))
        }
        val kind = s("sos.kind." + (p["kind"] as? String ?: "general"), (p["kind"] as? String ?: "general"))
        val id = ("sos:" + p["sosId"]).hashCode()
        val uri = "meshradar://alert?type=sos&id=${p["sosId"]}"
        val b = Notification.Builder(context, CH_SOS)
            .setSmallIcon(icon())
            .setContentTitle(s("sos.title", "SOS from {name}").replace("{name}", (m?.get("name") as? String) ?: "?"))
            .setContentText(listOf(kind, where).filter { it.isNotBlank() }.joinToString(". "))
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(open(uri, id))
            .setAutoCancel(true)
        if (canFullScreen()) b.setFullScreenIntent(open(uri, id + 1), true)
        val n = b.build()
        n.flags = n.flags or Notification.FLAG_INSISTENT
        nm.notify(id, n)
    }

    private fun message(p: Map<String, Any?>) {
        val kind = p["kind"] as? String
        val text = when (kind) {
            "quick" -> s("quick." + p["quickCode"], s("message.quick", "Quick reply"))
            "image" -> s("message.image", "Photo")
            "moment" -> s("message.moment", "New moment")
            "location" -> s("message.location", "Shared a location")
            else -> (p["text"] as? String).orEmpty()
        }
        post(CH_MESSAGES, ("msg:" + p["groupId"]).hashCode(), Engine.memberName(p["groupId"] as? String, p["senderId"] as? String), text, "meshradar://chat/${p["groupId"]}", insistent = false)
    }

    private fun canFullScreen(): Boolean =
        if (Build.VERSION.SDK_INT >= 34) nm.canUseFullScreenIntent() else true

    private fun post(channel: String, id: Int, title: String, text: String, uri: String, insistent: Boolean = false) {
        val n = Notification.Builder(context, channel)
            .setSmallIcon(icon())
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(open(uri, id))
            .build()
        if (insistent) n.flags = n.flags or Notification.FLAG_INSISTENT
        nm.notify(id, n)
    }

    private fun open(uri: String, requestCode: Int = 0): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun broadcast(action: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, ActionReceiver::class.java).setAction(action)
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun icon(): Int {
        val res = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
        return if (res != 0) res else context.applicationInfo.icon
    }

    private fun dir(d: String?): String = if (d == null) "?" else s("dir.$d", d)

    private fun s(key: String, fallback: String): String = Engine.strings[key] ?: fallback

    companion object {
        const val CH_STATUS = "mesh_status"
        const val CH_SOS = "mesh_sos"
        const val CH_ALERTS = "mesh_alerts"
        const val CH_MESSAGES = "mesh_messages"
        const val STATUS_ID = 1001
        /** Long repeating pattern for incoming SOS (section 7). */
        val SOS_VIBRATION = longArrayOf(0, 800, 300, 800, 300, 800, 300, 1600)
    }
}

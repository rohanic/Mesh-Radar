package com.rohanic.meshradar.core.engine

import com.rohanic.meshradar.core.crypto.Crypto
import com.rohanic.meshradar.core.protocol.hexToBytes
import org.json.JSONObject
import java.util.Base64

/**
 * Paid tiers and what they unlock (PRD section 10). Safety features are never gated (rule 1), and
 * separation alerts for Elders and Children are free in every tier (DEC-027).
 */
enum class Tier(
    val rank: Int,
    val maxMembers: Int,
    val maxActiveGroups: Int,
    val allPacks: Boolean,
    val breadcrumbs: Boolean,
    val separationAlerts: Boolean,
    val memories: Boolean,
    val familyCircle: Boolean,
    val organiser: Boolean,
) {
    FREE(0, 6, 1, false, false, true, false, false, false),
    EVENT_PASS(1, 25, 1, true, true, true, true, false, false),
    FAMILY_PLUS(2, 25, 5, true, true, true, true, true, false),
    ORGANISER(3, 500, 5, true, true, true, true, false, true),
    ;

    companion object {
        fun parse(s: String): Tier? = when (s) {
            "event_pass" -> EVENT_PASS
            "family_plus" -> FAMILY_PLUS
            "organiser" -> ORGANISER
            else -> null
        }
    }
}

/**
 * A verified licence. [sub] is the purchaser's signing key (hex). [members] is the group size it
 * allows: the tier maximum, or less for organiser plans sold by roster size (DEC-035).
 */
data class Licence(val id: String, val tier: Tier, val sub: String, val issuedAt: Long, val expiresAt: Long, val token: String, val members: Int)

/** A verified organiser certificate (E8: one signed organiser report verifies an alert). */
data class OrganiserCert(val pk: String, val name: String, val eventId: String, val expiresAt: Long)

/**
 * Licence tokens are `base64url(json).base64url(ed25519 signature over the json bytes)`, issued by the
 * purchase-verification Worker after Google Play confirms the purchase. They verify offline with the
 * public key built into the app, so a pass bought online works fully offline (section 10 rule 2).
 */
class Licences(private val crypto: Crypto, private val publicKey: ByteArray?) {

    fun verify(token: String, nowSec: Long): Licence? {
        val o = open(token) ?: return null
        if (o.optString("kind", "licence") != "licence") return null
        val tier = Tier.parse(o.optString("tier")) ?: return null
        val exp = o.optLong("exp")
        if (exp <= nowSec) return null
        val sub = o.optString("sub")
        if (sub.length != 64) return null
        val members = o.optInt("members", tier.maxMembers).coerceIn(Tier.FREE.maxMembers, tier.maxMembers)
        return Licence(o.optString("lid"), tier, sub.lowercase(), o.optLong("iat"), exp, token, members)
    }

    fun verifyOrganiserCert(token: ByteArray, nowSec: Long): OrganiserCert? {
        if (token.isEmpty()) return null
        val o = open(String(token, Charsets.UTF_8)) ?: return null
        if (o.optString("kind") != "organiser_cert") return null
        val exp = o.optLong("exp")
        if (exp <= nowSec) return null
        return OrganiserCert(o.optString("pk").lowercase(), o.optString("name"), o.optString("eventId"), exp)
    }

    private fun open(token: String): JSONObject? {
        val pk = publicKey ?: return null
        val parts = token.trim().split('.')
        if (parts.size != 2) return null
        return try {
            val dec = Base64.getUrlDecoder()
            val payload = dec.decode(parts[0])
            val sig = dec.decode(parts[1])
            if (!crypto.verify(sig, payload, pk)) return null
            JSONObject(String(payload, Charsets.UTF_8))
        } catch (e: IllegalArgumentException) {
            null
        } catch (e: org.json.JSONException) {
            null
        }
    }

    companion object {
        fun publicKeyFromHex(hex: String?): ByteArray? =
            if (hex.isNullOrBlank() || hex.length != 64) null else hexToBytes(hex)
    }
}

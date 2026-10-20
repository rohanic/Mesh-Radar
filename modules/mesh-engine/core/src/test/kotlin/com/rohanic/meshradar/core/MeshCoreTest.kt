package com.rohanic.meshradar.core

import com.rohanic.meshradar.core.engine.CoreConfig
import com.rohanic.meshradar.core.engine.MeshCore
import com.rohanic.meshradar.core.engine.MeshException
import com.rohanic.meshradar.core.model.PowerMode
import com.rohanic.meshradar.core.protocol.ChatKind
import com.rohanic.meshradar.core.protocol.Checkpoint
import com.rohanic.meshradar.core.protocol.CrowdKind
import com.rohanic.meshradar.core.protocol.CrumbReason
import com.rohanic.meshradar.core.protocol.ResolveReason
import com.rohanic.meshradar.core.protocol.Role
import com.rohanic.meshradar.core.protocol.SosKind
import com.rohanic.meshradar.core.protocol.hexToBytes
import com.rohanic.meshradar.core.protocol.toHex
import org.json.JSONObject
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MeshCoreTest {

    /** Leader creates a group; the others join by QR while linked; positions are known. */
    private fun family(net: TestNet, vararg names: String): String {
        names.forEach { net.add(it).profile(it) }
        val leader = net[names[0]]
        val g = leader.core.createGroup("Family", "", 0, 0)["id"] as String
        val invite = leader.core.invitePayload(g)
        names.drop(1).forEach { net[it].core.joinByInvite(invite) }
        return g
    }

    private fun upgrade(net: TestNet, node: TestNet.Node, tier: String, licenceKey: com.rohanic.meshradar.core.crypto.IdentityKeys, members: Int? = null) {
        val json = JSONObject().put("kind", "licence").put("lid", "L1").put("tier", tier).put("sub", node.core.signPublicHex)
            .put("iat", net.clock.now / 1000).put("exp", net.clock.now / 1000 + 14 * 86_400)
        members?.let { json.put("members", it) }
        val payload = json.toString().toByteArray()
        val sig = Sodium.crypto.sign(payload, licenceKey.signSecret)
        val enc = Base64.getUrlEncoder().withoutPadding()
        node.core.importLicence(enc.encodeToString(payload) + "." + enc.encodeToString(sig))
    }

    @Test
    fun `members join by QR offline and discover each other`() {
        val net = TestNet()
        val g = family(net, "abdul", "ammi", "sara")
        net.chain("abdul", "ammi", "sara")
        net.run(5_000)
        for (n in listOf("abdul", "ammi", "sara")) {
            @Suppress("UNCHECKED_CAST")
            val members = net[n].core.groupDetail(g)["members"] as List<Map<String, Any?>>
            assertEquals(setOf("abdul", "ammi", "sara"), members.map { it["name"] }.toSet(), "roster on $n")
        }
    }

    @Test
    fun `chat crosses three hops, relays cannot read it, and states move to delivered and read`() {
        val net = TestNet()
        val g = family(net, "a", "b")
        net.add("r1"); net.add("r2")
        net.chain("a", "r1", "r2", "b")
        net.run(3_000)
        val sent = net["a"].core.sendChat(g, null, ChatKind.TEXT, "Meet at Gate 7", 0, null, null, null)
        val id = sent["msgId"] as String
        net.run(8_000)
        val got = net["b"].ev("message").map { it.payload }.single { it["msgId"] == id }
        assertEquals("Meet at Gate 7", got["text"])
        assertEquals(3, got["hops"])
        // Relays hold no group, so they never see message content.
        assertTrue(net["r1"].ev("message").isEmpty())
        assertTrue(net["r2"].ev("message").isEmpty())
        val states = net["a"].ev("messageState").filter { it.payload["msgId"] == id }.map { it.payload["state"] }
        assertTrue("in_mesh" in states, "states $states")
        assertTrue("delivered" in states, "states $states")
        net["b"].core.markRead(g, listOf(id))
        net.run(5_000)
        assertEquals("read", net["a"].ev("messageState").last { it.payload["msgId"] == id }.payload["state"])
    }

    @Test
    fun `direct messages are readable only by the recipient`() {
        val net = TestNet()
        val g = family(net, "a", "b", "c")
        net.chain("a", "c", "b")
        net.run(3_000)
        val bId = net["b"].core.myId
        net["a"].core.sendChat(g, bId, ChatKind.TEXT, "private", 0, null, null, null)
        net.run(2_000)
        assertEquals("private", net["b"].ev("message").single().payload["text"])
        assertTrue(net["c"].ev("message").isEmpty())
    }

    @Test
    fun `quick replies travel as codes so each phone shows its own language`() {
        val net = TestNet()
        val g = family(net, "a", "b")
        net.connect("a", "b")
        net.run(2_000)
        net["a"].core.sendChat(g, null, ChatKind.QUICK, "", 2, null, null, null)
        net.run(1_000)
        val m = net["b"].ev("message").single().payload
        assertEquals("quick", m["kind"])
        assertEquals(2, m["quickCode"])
    }

    @Test
    fun `store and forward delivers when the recipient reappears`() {
        val net = TestNet()
        val g = family(net, "a", "b")
        net.add("relay")
        net.connect("a", "b")
        net.run(2_000)
        net.disconnect("a", "b")
        net.connect("a", "relay")
        net.run(1_000)
        net["a"].core.sendChat(g, null, ChatKind.TEXT, "where are you", 0, null, null, null)
        net.run(1_000)
        net.disconnect("a", "relay")
        net.run(60 * 60_000L, stepMs = 1_000)
        assertTrue(net["b"].ev("message").isEmpty())
        // Two hours later b walks past the relay phone.
        net.connect("relay", "b")
        net.run(2_000)
        assertEquals("where are you", net["b"].ev("message").single().payload["text"])
    }

    @Test
    fun `SOS reaches the group within 30 seconds over 3 hops and repeats until resolved`() {
        val net = TestNet()
        val g = family(net, "child", "mother")
        net.add("x"); net.add("y")
        net.chain("child", "x", "y", "mother")
        net.run(3_000)
        net["child"].at(21.4225, 39.8262)
        net["mother"].at(21.4230, 39.8270)
        val start = net.clock.now
        net["child"].core.startSos(SosKind.LOST, silent = false)
        net.run(1_000)
        val first = net["mother"].ev("sos").first()
        assertTrue(net.clock.now - start <= 30_000)
        assertEquals(true, first.payload["first"])
        assertEquals("lost", first.payload["kind"])
        @Suppress("UNCHECKED_CAST")
        assertEquals("O+", (first.payload["card"] as Map<String, Any?>)["bloodGroup"])
        net.run(65_000)
        assertTrue(net["mother"].ev("sos").size >= 3, "re-broadcast every 30 s")
        // Strangers on the path get only "someone nearby needs help" with rough direction.
        val pub = net["x"].ev("publicSos").firstOrNull()
        assertNotNull(pub)
        assertNull(pub.payload["lat"])
        // The leader (child created the group, so mother is not leader); child resolves own SOS.
        net["child"].core.resolveSos(net["child"].core.sosState()["own"].let { (it as Map<*, *>)["sosId"] as String }, ResolveReason.SAFE)
        net.run(1_000)
        assertTrue(net["mother"].ev("sosResolved").isNotEmpty())
        val count = net["mother"].ev("sos").size
        net.run(65_000)
        assertEquals(count, net["mother"].ev("sos").size)
        assertNotNull(g)
    }

    @Test
    fun `a leader can resolve a member's SOS and it stops on the sender's phone`() {
        val net = TestNet()
        val g = family(net, "leader", "member")
        net.connect("leader", "member")
        net.run(2_000)
        net["member"].at(1.0, 1.0)
        net["member"].core.startSos(SosKind.MEDICAL, silent = true)
        net.run(1_000)
        val sosId = net["leader"].ev("sos").first().payload["sosId"] as String
        net["leader"].core.resolveSos(sosId, ResolveReason.FOUND)
        net.run(1_000)
        assertNull(net["member"].core.sosState()["own"])
        assertNotNull(g)
    }

    @Test
    fun `last crumb is received even if the sender dies a minute later`() {
        val net = TestNet()
        val g = family(net, "ammi", "abdul")
        net.add("relay")
        net.chain("ammi", "relay")
        net.run(2_000)
        net["ammi"].at(21.41, 39.89, battery = 6, pressurePa = 97_000)
        net["ammi"].core.onBattery(15, false)
        net["ammi"].core.onBattery(5, false)
        net.run(60_000)
        net["ammi"].alive = false
        // abdul reaches the relay two hours later; relays keep Last-Crumb for 24 h.
        net.run(2 * 60 * 60_000L, stepMs = 5_000)
        net.connect("relay", "abdul")
        net.run(3_000)
        val crumbs = net["abdul"].ev("crumb")
        assertTrue(crumbs.isNotEmpty())
        assertEquals("battery_5", crumbs.last().payload["reason"])
        assertEquals(1, net["ammi"].ev("lowBattery").size)
        assertNotNull(g)
    }

    @Test
    fun `missed check-in fires on other phones even when the trekker's phone is dead`() {
        val net = TestNet()
        val g = family(net, "guide", "trekker")
        net.connect("guide", "trekker")
        net.run(2_000)
        net["trekker"].core.setCheckinTimer(g, net.clock.now / 1000 + 600)
        net.run(1_000)
        net["trekker"].alive = false
        net.run(11 * 60_000L, stepMs = 1_000)
        val missed = net["guide"].ev("checkinMissed")
        assertEquals(1, missed.size)
        assertEquals(net["trekker"].core.myId, missed.single().payload["memberId"])
    }

    @Test
    fun `checking in at a checkpoint cancels the timer, and geofence check-in works`() {
        val net = TestNet()
        val g = family(net, "guide", "trekker")
        net.connect("guide", "trekker")
        net.run(2_000)
        net["guide"].core.setCheckinPlan(g, listOf(Checkpoint("Camp 1", 35.0, 74.0, 100), Checkpoint("Camp 2", 35.1, 74.1, 100)), net.clock.now / 1000 + 3_600)
        net.run(1_000)
        net["trekker"].at(35.0003, 74.0003)
        net.run(1_000)
        assertTrue(net["trekker"].ev("checkedIn").isNotEmpty())
        @Suppress("UNCHECKED_CAST")
        val progress = (net["guide"].core.groupDetail(g)["checkin"] as Map<String, Any?>)["progress"] as Map<String, Int>
        assertEquals(0, progress[net["trekker"].core.myId])
        net.run(61 * 60_000L, stepMs = 2_000)
        // Camp 2 not reached by the deadline: both phones alert for the trekker; the guide for itself too.
        assertTrue(net["guide"].ev("checkinMissed").any { it.payload["memberId"] == net["trekker"].core.myId })
    }

    @Test
    fun `join by code needs the creator's phone in radio range`() {
        val net = TestNet()
        net.add("creator").profile("creator")
        net.add("far").profile("far")
        net.add("near").profile("near")
        net.add("mid")
        val g = net["creator"].core.createGroup("Trip", "", 0, 0)["id"] as String
        val code = net["creator"].core.openJoinWindow(g)
        net.connect("creator", "near")
        net.chain("creator", "mid", "far")
        val nearReq = net["near"].core.requestJoinByCode(code)
        val farReq = net["far"].core.requestJoinByCode(code)
        net.run(5_000)
        val reqs = net["creator"].ev("joinRequest")
        assertEquals(1, reqs.size, "only the phone in range is heard")
        net["creator"].core.answerJoin(reqs.single().payload["requestId"] as String, true)
        net.run(2_000)
        val res = net["near"].ev("joinResult").single().payload
        assertEquals(true, res["ok"])
        assertEquals(nearReq, res["requestId"])
        net.run(60_000)
        assertEquals(false, net["far"].ev("joinResult").single().payload["ok"])
        assertNotNull(farReq)
    }

    @Test
    fun `free groups are limited to 6 members and paid passes raise the limit`() {
        val licenceKey = Sodium.crypto.newIdentity()
        val net = TestNet(config = CoreConfig(licencePublicKey = licenceKey.signPublic))
        val names = (1..8).map { "p$it" }
        val g = family(net, *names.toTypedArray())
        names.zipWithNext().forEach { (a, b) -> net.connect(a, b) }
        net.run(5_000)
        assertEquals(6, net["p1"].core.groupDetail(g)["memberCount"])
        assertTrue(net["p1"].ev("groupFull").isNotEmpty())
        upgrade(net, net["p1"], "event_pass", licenceKey)
        net.run(3_000)
        assertEquals("event_pass", net["p2"].core.groupDetail(g)["tier"], "licence shared over the mesh")
        assertEquals(25, net["p2"].core.groupDetail(g)["maxMembers"])
        // A forged licence is rejected.
        assertFailsWith<MeshException> { net["p3"].core.importLicence("e30.AAAA") }
    }

    @Test
    fun `separation alerts for elders need a pass and fire past the set distance`() {
        val licenceKey = Sodium.crypto.newIdentity()
        val net = TestNet(config = CoreConfig(licencePublicKey = licenceKey.signPublic))
        val g = family(net, "leader", "nana")
        net.connect("leader", "nana")
        net.run(2_000)
        net["leader"].core.setRole(g, net["nana"].core.myId, Role.ELDER)
        net["leader"].at(21.4225, 39.8262)
        net["nana"].core.setPowerMode(PowerMode.RADAR)
        net["nana"].at(21.4245, 39.8262) // about 220 m north
        net.run(2_000)
        assertTrue(net["leader"].ev("separation").isEmpty(), "free tier has no separation alerts")
        upgrade(net, net["leader"], "event_pass", licenceKey)
        net.run(6_000)
        net["nana"].at(21.4246, 39.8262)
        net.run(1_000)
        val alert = net["leader"].ev("separation").single().payload
        assertTrue((alert["distanceM"] as Double) > 150)
        assertEquals(150, alert["thresholdM"])
    }

    @Test
    fun `meeting points sync over the mesh and only the leader can drop them`() {
        val net = TestNet()
        val g = family(net, "leader", "m")
        net.connect("leader", "m")
        net.run(2_000)
        net["leader"].core.setPin(g, null, "Gate 7", 21.42, 39.82, 0, 1)
        net.run(1_000)
        @Suppress("UNCHECKED_CAST")
        val pins = net["m"].core.groupDetail(g)["pins"] as List<Map<String, Any?>>
        assertEquals("Gate 7", pins.single()["name"])
        assertFailsWith<MeshException> { net["m"].core.setPin(g, null, "Fake", 0.0, 0.0, 0, 0) }
    }

    @Test
    fun `a stranger who scans a lost-child card alerts only the family`() {
        val net = TestNet()
        val g = family(net, "parent", "kid")
        net.add("finder").profile("finder")
        net.add("other")
        net.connect("parent", "kid")
        net.chain("finder", "other", "parent")
        net.run(2_000)
        val card = net["parent"].core.lostChildPayload(g, net["kid"].core.myId)
        assertTrue(card.startsWith(MeshCore.FOUND_PREFIX))
        net["finder"].at(22.0, 88.0)
        net["finder"].core.reportFoundChild(card, "With me at the blue stall")
        net.run(1_000)
        val alert = net["parent"].ev("lostChildFound").single().payload
        assertEquals("kid", alert["childName"])
        assertEquals("With me at the blue stall", alert["note"])
        assertTrue(net["other"].ev("lostChildFound").isEmpty())
    }

    @Test
    fun `event channel is rate limited to one post per 5 minutes and reportable`() {
        val net = TestNet()
        listOf("a", "b").forEach { net.add(it).profile(it) }
        net.connect("a", "b")
        net["a"].core.setEventDay(true, "psl-lahore")
        net["b"].core.setEventDay(true, "psl-lahore")
        net["a"].core.postEvent("psl-lahore", "Gate 3 queue is short")
        assertFailsWith<MeshException> { net["a"].core.postEvent("psl-lahore", "again") }
        net.run(1_000)
        val post = net["b"].ev("eventPost").single().payload
        assertEquals("Gate 3 queue is short", post["text"])
        net["b"].core.reportPost(post["msgId"] as String)
        assertTrue(net["b"].core.eventPosts("psl-lahore").isEmpty())
    }

    @Test
    fun `crowd alerts verify after 3 independent reports within 200 m and 5 minutes`() {
        val net = TestNet()
        val names = listOf("a", "b", "c", "d")
        names.forEach { net.add(it).profile(it); net[it].core.setEventDay(true, "durga-puja") }
        names.zipWithNext().forEach { (x, y) -> net.connect(x, y) }
        net["a"].core.reportCrowd("durga-puja", CrowdKind.CRUSH_RISK, "Gate 4", 22.6000, 88.3600, null)
        net.run(1_000)
        net["b"].core.reportCrowd("durga-puja", CrowdKind.CRUSH_RISK, "Gate 4", 22.6005, 88.3601, null)
        net.run(1_000)
        assertTrue(net["d"].ev("crowdAlert").isEmpty(), "two reports are not enough")
        net["c"].core.reportCrowd("durga-puja", CrowdKind.CRUSH_RISK, "Gate 4 exit", 22.6003, 88.3598, null)
        net.run(1_000)
        val alert = net["d"].ev("crowdAlert").single().payload
        assertEquals(true, alert["verified"])
        assertEquals(3, alert["reports"])
    }

    @Test
    fun `an organiser-signed report verifies an alert on its own`() {
        val licenceKey = Sodium.crypto.newIdentity()
        val net = TestNet(config = CoreConfig(licencePublicKey = licenceKey.signPublic))
        listOf("org", "fan").forEach { net.add(it).profile(it); net[it].core.setEventDay(true, "kumbh") }
        net.connect("org", "fan")
        val pk = net["org"].core.eventPublicKey("kumbh")
        val payload = JSONObject().put("kind", "organiser_cert").put("pk", pk).put("name", "Mela Committee").put("eventId", "kumbh")
            .put("exp", net.clock.now / 1000 + 86_400).toString().toByteArray()
        val enc = Base64.getUrlEncoder().withoutPadding()
        val cert = enc.encodeToString(payload) + "." + enc.encodeToString(Sodium.crypto.sign(payload, licenceKey.signSecret))
        net["org"].core.reportCrowd("kumbh", CrowdKind.GATE_CLOSED, "Sector 5 bridge closed", 25.43, 81.88, cert)
        net.run(1_000)
        val alert = net["fan"].ev("crowdAlert").single().payload
        assertEquals("Mela Committee", alert["organiser"])
    }

    @Test
    fun `relay counts strangers' packets for Relay Hero badges`() {
        val net = TestNet()
        val g = family(net, "a", "b")
        net.add("hero")
        net["hero"].core.setActiveEvent("kumbh")
        net.chain("a", "hero", "b")
        net.run(2_000)
        net["a"].core.sendChat(g, null, ChatKind.TEXT, "hi", 0, null, null, null)
        net.run(2_000)
        val h = net["hero"].core.health()
        assertTrue((h["relayedForOthers"] as Long) > 0)
        @Suppress("UNCHECKED_CAST")
        assertTrue(((h["relayedByEvent"] as Map<String, Long>)["kumbh"] ?: 0) > 0)
    }

    @Test
    fun `ultra-saver turns relaying off`() {
        val net = TestNet()
        val g = family(net, "a", "b")
        net.add("saver")
        net["saver"].core.setPowerMode(PowerMode.ULTRA_SAVER)
        net.chain("a", "saver", "b")
        net.run(2_000)
        net["a"].core.sendChat(g, null, ChatKind.TEXT, "hi", 0, null, null, null)
        net.run(2_000)
        assertTrue(net["b"].ev("message").isEmpty())
    }

    @Test
    fun `state survives a restart and wipe deletes everything`() {
        val net = TestNet()
        val g = family(net, "a", "b")
        net.connect("a", "b")
        net.run(3_000)
        net["a"].core.flush()
        val saved = net["a"].state.value
        assertNotNull(saved)
        assertTrue(saved.contains(g))
        net["a"].core.wipe()
        assertNull(net["a"].state.value)
        assertTrue(net["a"].core.groups().isEmpty())
    }

    @Test
    fun `groups auto-archive after the event`() {
        val net = TestNet()
        net.add("a").profile("a")
        val g = net["a"].core.createGroup("Umrah", "umrah", net.clock.now / 1000 + 60, 0)["id"] as String
        net.run(61_000, stepMs = 1_000)
        assertEquals(g, net["a"].ev("groupArchived").single().payload["groupId"])
        assertEquals(true, net["a"].core.groups().single()["archived"])
    }

    @Test
    fun `member ids are 8 bytes of the signing key hash`() {
        val net = TestNet()
        val a = net.add("a")
        assertEquals(16, a.core.myId.length)
        assertFalse(a.core.myId == ByteArray(8).toHex())
    }

    @Test
    fun `event community signatures verify with the event key only`() {
        val net = TestNet()
        val a = net.add("a")
        val msg = "post:hajj:Meet at Gate 79".toByteArray()
        val sig = a.core.signForEvent("hajj", msg)
        assertTrue(Sodium.crypto.verify(sig, msg, hexToBytes(a.core.eventPublicKey("hajj"))))
        assertFalse(Sodium.crypto.verify(sig, msg, hexToBytes(a.core.eventPublicKey("umrah"))))
    }

    @Test
    fun `organiser licences cap the roster at the size bought`() {
        val licenceKey = Sodium.crypto.newIdentity()
        val net = TestNet(config = CoreConfig(licencePublicKey = licenceKey.signPublic))
        val org = net.add("org").also { it.profile("org") }
        upgrade(net, org, "organiser", licenceKey, members = 50)
        val g = org.core.createGroup("School trip", "", 0, 0)["id"] as String
        assertEquals(50, org.core.groupDetail(g)["maxMembers"])
        assertEquals(50, org.core.entitlements(g)["maxMembers"])
        assertEquals(true, org.core.entitlements(null)["organiser"])
    }
}

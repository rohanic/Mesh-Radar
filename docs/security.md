# Security notes

A summary of the protocol and the threats it is designed for, for the external review the PRD requires before v1.1 (section 12, item 7). Details and reasons are in [decisions.md](decisions.md); the code is in `modules/mesh-engine/core`.

## Keys

- Each phone has a 32-byte identity seed from libsodium. Ed25519 (signing) comes from the seed; X25519 (sealing) is derived from the seed with BLAKE2b (DEC-007).
- The seed is encrypted with an AES-256-GCM key held in the Android Keystore (non-exportable). App backup is off. Delete everything (H4) removes both.
- A group key (32 bytes) is created by the leader and travels only in person: inside the QR code, or sealed to the joiner's X25519 key after the leader approves a 6-digit code request (DEC-006).

## Packets

- 32-byte header: version, type, random 16-byte message ID, 8-byte group tag, hop count, TTL, created time.
- Sign then encrypt: the sender's Ed25519 signature and member ID are inside the XChaCha20-Poly1305 ciphertext. The associated data is the header with the hop count zeroed, so relays can increase it. The nonce is derived from the header (DEC-005).
- The group tag is an HMAC of the group key over a 15-minute window, truncated to 8 bytes, so outsiders cannot link packets to a group over time.
- Public packets (event channel, crowd reports, public SOS) are signed with per-event or daily pseudonymous keys, so they cannot be linked to a person or their group (DEC-013).

## Relaying

- Managed flooding with a 20,000-entry dedupe cache, at most 7 hops, crowd damping above 8 neighbours. Safety packets are never damped and are sent twice (DEC-010, DEC-011).
- Relays cannot read group packets. They check signatures and rate limits on public packets and stop relaying keys that break them.

## Server

- The Worker never sees location or messages in readable form. Family Circle mailboxes hold the same ciphertext, keyed by an HMAC of the group key, for 24 hours (DEC-026).
- Licences and pack updates are signed with an Ed25519 key that exists only as a Worker secret; phones verify offline with the public key in the app (DEC-016, DEC-031).
- Community posts and reports are signed with per-event keys; the Worker verifies them and rate limits per key (DEC-036).

## Known limits

- **Join codes:** 6 digits can be brute forced offline. Mitigated by one-hop range, leader approval and sealing to the joiner's key (DEC-006).
- **Crowd alert verification:** one person with several phones counts as several reporters (DEC-014). The week-8 drill measures false alerts.
- **Metadata:** radio neighbours can see that Mesh Radar is running, packet sizes and timing. Endpoint names rotate hourly.
- **Lost phones:** an unlocked phone shows the group. Android screen lock is the protection.
- **First-pilgrimage pass:** a new identity can claim it again (DEC-034).

## Before release

- [ ] External review of the protocol and crypto (Bridgefy's early protocol had published flaws; PRD section 12).
- [ ] `npm run check:secrets` passes and no secrets are in the Worker config.
- [ ] Licence signing seed backed up offline, and the Worker's `ADMIN_TOKEN` rotated after setup.
- [ ] Dependency audit (`npm audit` in the root and in `worker/`).

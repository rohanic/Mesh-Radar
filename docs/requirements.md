# Requirements map

Where each PRD requirement (section 5) lives in the code. Generated from the requirement IDs in code comments; [decisions.md](decisions.md) records every change to a requirement (for example A2 ships without flags, DEC-029).

| ID | Requirement | Priority | Main files |
| --- | --- | --- | --- |
| A1 | No account. On first launch the app generates an Ed25519/X25519 key pair stored in Android Keystore | P0 | `android/KeyVault.kt` |
| A2 | Language picker as the very first screen, with flags and native script names | P0 | `app/onboarding/language.tsx` |
| A3 | Profile: display name, avatar (preset illustrations or photo), colour | P0 | `src/state/profile.ts`, `src/ui/components/Avatar.tsx`, `src/features/profile/avatarPhoto.ts`, `src/features/profile/ProfileEditor.tsx` |
| A4 | Emergency card: blood group, conditions, medicines, home contact, hotel/tent number | P0 | `src/state/profile.ts`, `src/features/profile/CardEditor.tsx`, `android/Notifier.kt`, `core/protocol/Bodies.kt` |
| A5 | Guided permission flow explaining why each permission is needed | P0 | `app/onboarding/permissions.tsx`, `src/features/permissions/permissions.ts` |
| A6 | 60-second interactive tutorial ending with a practice SOS | P1 | `app/onboarding/tutorial.tsx` |
| B1 | Create a group; join by scanning a QR code or typing a 6-digit code while nearby | P0 | `app/group/new.tsx`, `app/group/join.tsx`, `app/group/invite.tsx`, `app/join/[payload].tsx` |
| B2 | Group key is exchanged in person (QR carries it), so no server is ever needed | P0 | `app/group/join.tsx`, `app/group/invite.tsx`, `core/protocol/Bodies.kt`, `core/engine/MeshCore.kt` |
| B3 | Roles: Leader, Member, Elder, Child. Elders and Children get a simplified UI and stricter alerts | P0 | `core/protocol/Bodies.kt`, `core/engine/MeshCore.kt` |
| B4 | Free groups up to 6; paid up to 25; organiser up to 500 | P0 / P1 / P2 | `src/core/engine/tiers.ts`, `core/engine/Licences.kt` |
| B5 | Multiple groups at once (family + friends) with a colour per group | P1 | `app/me/groups.tsx`, `app/group/new.tsx` |
| B6 | Group expiry: event groups auto-archive after the event | P1 | `app/group/new.tsx`, `core/protocol/Bodies.kt`, `core/engine/MeshCore.kt`, `android/MeshEngineModule.kt` |
| C1 | Radar view: each member is a blip with avatar, direction and distance, rotated by compass heading | P0 | `src/core/engine/geo.ts`, `src/core/engine/radar.ts`, `src/features/radar/RadarCanvas.tsx`, `android/LocationSource.kt` |
| C2 | Each blip shows freshness ("now", "2 min", "lost signal 9 min") and an accuracy ring from GPS accuracy | P0 | `src/core/engine/radar.ts`, `src/core/engine/freshness.ts`, `src/features/radar/RadarCanvas.tsx` |
| C3 | Floor estimate: barometric altitude relative to the leader ("2 floors above you") | P1 | `src/core/engine/floors.ts`, `android/LocationSource.kt` |
| C4 | Find mode: tap a member to get a full-screen arrow, distance and haptic pulses that speed up as you get closer | P0 | `app/find.tsx`, `src/core/engine/geo.ts`, `src/core/engine/find.ts` |
| C5 | List view for accessibility and for groups over 10 | P0 | `src/state/settings.ts`, `src/core/engine/geo.ts`, `src/core/engine/list.ts` |
| C6 | Meeting points: leader drops named pins ("Gate 7", "Tent 42"); arrows to them work like members | P0 | `app/pins.tsx`, `core/protocol/Bodies.kt`, `android/MeshEngineModule.kt` |
| C7 | Breadcrumbs: last 2 hours of each member's path | P1 | `app/group/trail.tsx`, `android/Storage.kt`, `core/model/Model.kt` |
| C8 | UWB fine-find under 10 m on supported phones | P2 | `src/features/permissions/permissions.ts`, `modules/mesh-engine/android/src/main/AndroidManifest.xml`, `android/Radios.kt`, `android/UwbRanging.kt` |
| D1 | Group chat and direct messages, end-to-end encrypted | P0 | `app/chat/[groupId].tsx`, `core/protocol/Bodies.kt`, `core/protocol/Envelope.kt`, `android/NearbyTransport.kt` |
| D2 | Quick replies in every language: "I'm OK", "Wait for me", "Come to me", "Meet at \[pin\]", "Need water", ... | P0 | `app/chat/[groupId].tsx`, `src/core/engine/quickReplies.ts`, `src/ui/components/QuickReplyTray.tsx`, `core/protocol/Bodies.kt` |
| D3 | Delivery states: Sending, In the mesh, Delivered, Read | P0 | `app/chat/[groupId].tsx`, `src/features/chat/MessageBubble.tsx`, `core/model/Model.kt`, `core/protocol/Bodies.kt` |
| D4 | Store-and-forward: messages wait up to 6 hours and hop up to 7 times | P0 | `android/Storage.kt`, `core/routing/Routing.kt`, `core/protocol/Frames.kt`, `core/protocol/PacketType.kt` |
| D5 | Text up to 500 characters; location pins; tiny thumbnails (under 8 KB) | P0 | `app/chat/[groupId].tsx`, `src/features/profile/avatarPhoto.ts`, `core/protocol/Bodies.kt` |
| D6 | Full photos sent only over Wi-Fi Direct/Nearby high-bandwidth links between nearby phones | P1 | `app/chat/[groupId].tsx`, `src/features/profile/avatarPhoto.ts`, `android/PhotoStore.kt`, `core/protocol/Bodies.kt` |
| E1 | SOS: hold the red button for 3 s (or the notification action). Sends exact location to the group and a ... | P0 | `app/sos.tsx`, `src/ui/components/SosButton.tsx`, `core/geo/Geo.kt`, `core/crypto/Tags.kt` |
| E2 | SOS screen: loud siren, screen strobe, emergency card shown full-screen for rescuers | P0 | `app/sos.tsx`, `src/features/sound/sound.ts`, `core/engine/MeshCore.kt`, `core/protocol/Bodies.kt` |
| E3 | Last-Crumb beacon: at 15%, 5% and 2% battery, and on shutdown, broadcast final position, altitude and ... | P0 | `android/Engine.kt`, `core/protocol/Bodies.kt`, `core/engine/MeshCore.kt` |
| E4 | Ultra-saver mode auto-offered at 15%: radar every 5 min, relay off, screen dark theme | P0 | `app/battery.tsx`, `src/core/engine/power.ts`, `core/engine/MeshCore.kt` |
| E5 | Offline emergency numbers by country and event (e.g. Saudi Red Crescent, Rescue 1122, Indian 112) | P0 | `app/me/numbers.tsx`, `src/core/engine/numbers.ts`, `src/features/numbers/numbers.ts` |
| E6 | Lost-child card: lock-screen wallpaper and printable card with the guardian's code; any app user who scans ... | P1 | `app/me/lost-child.tsx`, `app/found/[payload].tsx`, `src/ui/components/QRCode.tsx`, `src/features/groups/handleScan.ts` |
| E7 | Check-in timer: "If I don't check in by 5 pm, alert my group" (for treks) | P1 | `app/group/checkin.tsx`, `core/geo/Geo.kt`, `core/model/Model.kt`, `core/protocol/Bodies.kt` |
| E8 | Crowd alerts: users can report "Crush risk at Gate 4". Shown as verified only after 3 independent reports ... | P2 | `app/event/day.tsx`, `worker/src/licence.ts`, `src/state/purchases.ts`, `src/features/billing/billing.ts` |
| E9 | Separation alert: the leader is warned when an Elder or Child moves more than a set distance away | P1 | `core/geo/Geo.kt`, `core/protocol/Bodies.kt`, `core/engine/MeshCore.kt`, `android/MeshEngineModule.kt` |
| F1 | 12 launch event packs (Hajj, Umrah, Arbaeen, Raiwind Ijtema, Muharram, Kumbh/Magh Mela, Durga Puja, Rath ... | P0 | `src/core/packs/schema.ts`, `src/features/packs/packs.ts` |
| F2 | Pack contents: meeting-point suggestions, emergency numbers, do's and don'ts, ritual or schedule guide, ... | P0 | `app/event/[id].tsx`, `worker/src/router.ts`, `src/core/packs/schema.ts`, `src/features/packs/packs.ts` |
| F3 | "Event day" switch: raises scan rate, enables the event channel, sets reminders | P0 | `app/event/day.tsx`, `src/features/reminders/reminders.ts`, `android/Engine.kt`, `android/MeshEngineModule.kt` |
| F4 | Public event channel: short broadcast messages to everyone nearby, rate-limited to 1 per 5 min per user, 3 ... | P2 | `app/event/day.tsx`, `core/crypto/Tags.kt`, `core/protocol/Bodies.kt`, `core/engine/MeshCore.kt` |
| F5 | Event calendar with countdowns and "Prepare your group" checklist | P1 | `src/state/packs.ts` |
| G1 | Trip memories: after each event, an auto-made card with route, distance walked, places, group photo and ... | P1 | `app/me/memories.tsx`, `src/core/engine/memories.ts`, `src/features/profile/MemoryCard.tsx` |
| G2 | Moments: short notes and photos pinned to places during the trip, shared with the group | P1 | `app/me/memories.tsx`, `core/protocol/Bodies.kt`, `android/MeshEngineModule.kt` |
| G3 | Relay Hero badges: "You relayed 1,000 messages for strangers at Kumbh" | P1 | `app/me/badges.tsx`, `src/core/engine/badges.ts` |
| G4 | Regroup Drill game: a weekly 5-minute hide-and-seek using the radar, played with friends or family | P1 | `app/group/drill.tsx`, `src/core/engine/drill.ts`, `core/protocol/Bodies.kt`, `android/MeshEngineModule.kt` |
| G5 | Safety Ready score: profile completeness, drill done, emergency card filled, pack downloaded | P1 | `app/me/ready.tsx`, `src/core/engine/safetyScore.ts` |
| G6 | Family Circle (online mode): daily location sharing over the internet, switching to mesh automatically ... | P2 | `worker/src/router.ts`, `worker/src/mailbox.ts`, `core/crypto/Tags.kt`, `core/engine/MeshCore.kt` |
| G7 | Event communities: opt-in pages per event to find your city's group, share tips and arrange meetups | P2 | `app/event/community.tsx`, `src/state/packs.ts`, `worker/src/router.ts`, `worker/src/community.ts` |
| G8 | Offline invite: share the app phone to phone with Android's Quick Share, plus a QR to the Play Store page | P0 | `app/me/invite.tsx`, `src/ui/components/QRCode.tsx` |
| G9 | Streaks only for positive safety habits (weekly check-in with family), never for time spent | P2 | `src/state/social.ts`, `src/core/engine/badges.ts` |
| H1 | Power modes: Radar (live, 5 s updates), Balanced (30 s), Standby relay (relay only), Ultra-saver (5 min) | P0 | `app/me/power.tsx`, `src/core/engine/power.ts`, `core/model/Model.kt`, `android/Notifier.kt` |
| H2 | Theme: System, Light, Dark, plus a high-contrast Sunlight theme | P0 | `app/me/settings.tsx`, `src/core/theme/tokens.ts` |
| H3 | Elder mode: larger text, three big buttons (Find family, Call for help, I'm OK) | P0 | `app/elder.tsx`, `app/me/settings.tsx`, `src/state/settings.ts` |
| H4 | Delete everything: wipes keys, groups and history | P0 | `app/me/privacy.tsx`, `android/Engine.kt`, `android/KeyVault.kt`, `core/engine/MeshCore.kt` |

`core/` is `modules/mesh-engine/core/src/main/kotlin/com/rohanic/meshradar/core/` and `android/` is `modules/mesh-engine/android/src/main/java/com/rohanic/meshradar/engine/`.

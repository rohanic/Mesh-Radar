# Mesh Radar — Product Requirements Document

Oct 19, 2026 · @Rohan Ahmad

## 1. Overview

**Mesh Radar keeps groups together and reachable when the network fails: in crowds, on trails, and in blackouts.** It turns nearby Android phones into an encrypted relay network and shows every group member as a live direction-and-distance blip, with no internet, SIM or map download required.

**One-line pitch:** "Never lose your people, even when the network does."

**Vision:** become the default app people open before any mass gathering, trek or storm, the way they check the weather today. Safety is the reason to install; the event community is the reason to keep it.

### The problem

Cell networks fail exactly when people need them most:

- **Crowds:** 50,000 to 3 million people in one place overload towers. Messages queue, calls fail, and families get separated at gates, stampede-risk choke points and transport hubs.
- **Trails:** mountains and forests have no coverage at all. Groups spread out over hundreds of metres and lose sight of each other.
- **Blackouts:** floods, earthquakes, storms and government shutdowns take towers down for hours or days.

In all three, every cloud app (WhatsApp, Google Maps, Uber, Find My Device) stops working at the moment people are frightened and separated.

### What exists that makes this possible now

- GPS works with no internet. Only map tiles need data, and Mesh Radar doesn't use them.
- Android phones ship Bluetooth Low Energy, Wi-Fi Direct and, on Android 8+, Wi-Fi Aware. Google's Nearby Connections API wraps these into one peer-to-peer channel.
- Phones already carry the magnetometer, barometer and, on flagships, Ultra-Wideband chips needed for a radar view.

### Product name

"Mesh Radar" is the working name. Store-name candidates that work across English, Urdu, Arabic and Indonesian: **Qareeb** ("near" in Urdu/Arabic), **Huddle**, **Kumpul** ("gather" in Indonesian/Malay). Final choice is an open question (section 14).

## 2. Why now, users and events

**Crowd crushes are frequent, recent and concentrated in the markets we launch in.** Two days before this PRD, a crush at the exit gate of a Durga Puja pandal in Kolkata's Girish Park killed at least 17 people after heavy rain pushed crowds out at once ([Reuters via US News](https://www.usnews.com/news/world/articles/2026-10-17/festival-crush-in-indian-city-of-kolkata-kills-at-least-17-local-media-say); Wikipedia's running list now records 19 ([list](https://en.wikipedia.org/wiki/List_of_human_stampedes_in_Hindu_temples))).

| Date | Event | Deaths | What it teaches us |
| --- | --- | --- | --- |
| 17 Oct 2026 | Durga Puja pandal, Kolkata | 17 to 19 | Exits are the danger; rain changes crowd flow in minutes ([source](https://www.usnews.com/news/world/articles/2026-10-17/festival-crush-in-indian-city-of-kolkata-kills-at-least-17-local-media-say)) |
| 27 Sep 2025 | Political rally, Karur, Tamil Nadu | 41 | Turnout was about 27,000 against an expected 10,000 ([source](https://www.tribuneindia.com/news/india/karur-stampede-sc-to-pronounce-order-on-monday-on-petitions-seeking-independent-probe)) |
| 2025 (full year) | India, eight stampedes | 100+ | Includes Tirupati, Kumbh, New Delhi station, Bengaluru stadium ([source](https://www.freepressjournal.in/amp/india/year-ender-2025-from-mahakumbh-to-karur-major-stampedes-that-shook-india)) |
| 29 Jan 2025 | Maha Kumbh Mela, Prayagraj | 30 official | A second crush happened at an exit as people fled the first ([source](https://en.wikipedia.org/wiki/2025_Prayag_Maha_Kumbh_Mela_crowd_crush)) |
| Jun 2024 | Hajj, Makkah (extreme heat) | 1,000+ | Egyptian officials alone logged 1,400 missing-pilgrim reports; families searched hospitals for days ([source](https://www.al-monitor.com/originals/2024/06/loved-ones-search-missing-hajj-death-toll-passes-900)) |

Mesh Radar does not prevent crushes; venue design and policing do. What it does: keeps families from splitting up, lets people find each other without pushing back into a crowd, spreads verified "avoid this gate" alerts phone to phone, and gives searchers a last known location.

### Personas

| Persona | Context | Core need | Biggest fear |
| --- | --- | --- | --- |
| **Abdul Rehman, 58, Hajj group leader** (Pakistan) | Leads 12 relatives, three over 65; basic Android, Urdu UI | See where every member is in Mina and Muzdalifah | An elderly parent gets lost and can't explain where they are |
| **Ananya, 21, pandal-hopper** (Kolkata) | Five friends, 10+ pandals a night, Bengali/English | Regroup after the crowd splits them | Being trapped near a packed exit |
| **Karim, 34, trek guide** (Gilgit-Baltistan) | Leads 8 to 15 trekkers, no coverage for days | Know who has fallen behind, and where | A trekker injured off-trail with a dead phone |
| **Siti, 29, flood-zone volunteer** (Indonesia/Pakistan) | Towers down, many families, rotating volunteers | Reach households and coordinate rescue | Messages that never arrive |
| **Rahul, 26, concert/cricket fan** | Stadium, 40,000 people, network jammed | Find friends at half-time, meet at a gate | Losing the group after the event |

A sixth, paying-later persona: **the organiser** (tour operator, trek company, puja committee, school), who wants every member of 50 to 500 people on one roster.

### Events the app is built for

Every event below gets a ready-made **Event Mode** pack in the app: named meeting points, local emergency numbers, language defaults, safety tips, and a public "event channel" (section 5).

| Category | Events | Region |
| --- | --- | --- |
| Islamic pilgrimage and gatherings | Hajj, Umrah (Ramadan peak), Arbaeen walk to Karbala, Raiwind Ijtema, Bishwa Ijtema (Tongi), Eid prayers, Muharram/Ashura processions, Urs at Data Darbar and other shrines | Saudi Arabia, Iraq, Pakistan, Bangladesh, India |
| Hindu festivals | Durga Puja, Kumbh and Magh Mela, Rath Yatra (Puri), Ganesh Chaturthi, Chhath, Navratri garba, Sabarimala, Tirupati | India, Nepal, Bangladesh |
| Other faith gatherings | Easter and Christmas mass, Vaisakhi, Black Nazarene procession, papal events | South Asia, Philippines, worldwide |
| Sport and entertainment | Cricket (PSL, IPL, World Cups), football, concerts, music festivals, marathons, New Year's Eve | Worldwide |
| Political and civic | Rallies, marches, protests, election days | South Asia, worldwide |
| Outdoors | Treks (K2 and Nanga Parbat base camps, Fairy Meadows, Everest base camp, Rinjani), camping, school trips, desert safaris | Pakistan, Nepal, Indonesia |
| Emergencies | Monsoon floods, earthquakes, cyclones, heatwaves, network shutdowns | Pakistan, India, Bangladesh, Indonesia, Philippines |

## 3. Competitive landscape

**Nobody combines offline mesh, a group radar and event-specific packs in one consumer app.** Existing tools are either chat-first mesh apps, hardware-dependent radios, or flagship-only satellite SOS.

| Product | How it works | Strength | Gap we exploit |
| --- | --- | --- | --- |
| [Bridgefy](https://techcrunch.com/?p=2067907) | Bluetooth mesh, about 100 m per hop; also sells an SDK | 12M+ downloads, known brand in protests and disasters ([source](https://www.alchemistaccelerator.com/blog/bridgefy-the-offline-messaging-app-revolutionizing-crisis-communication-worldwide)) | Chat-first; no group radar, no event packs, weak South Asian localisation |
| Briar | Bluetooth, Wi-Fi and Tor messaging, open source | Strong privacy, activist trust | Technical UX; no location or group finding |
| [Meshtastic](https://meshtastic.org/docs/software/android/user/) | LoRa radios (separate hardware) paired over Bluetooth | Range of several km, AES-256, open source ([source](https://mythos.one/me/brianswichkow/e09722)) | Needs a $20 to $40 radio per person; hobbyist setup |
| goTenna | Proprietary LoRa-style hardware | Rugged, long range | Expensive hardware, aimed at professionals |
| Satellite SOS (Pixel, Samsung, iPhone) | Phone talks to satellites | Works anywhere under open sky | Flagships only; emergency texts, not group finding; fails under roofs and in dense crowds |
| WhatsApp / Google Maps live location | Cloud | Everyone already has it | Dies the moment the network does |

### Our differentiation

1. **Group-first, not chat-first.** The home screen is your people on a radar, not an inbox.
2. **Works on the phones people actually carry.** Mid-range Androids, no extra hardware for crowds and blackouts.
3. **Event intelligence.** Ready packs for Hajj, Kumbh, Durga Puja, PSL and more, with meeting points and local SOS numbers that load before the network fails.
4. **Built for South Asia and the Muslim world from day one.** Urdu, Arabic, Bengali, Hindi, Indonesian and more, with right-to-left layouts and elderly-friendly modes.
5. **A reason to open it every week.** Social and memory features (section 5) keep the app installed between emergencies, which is what makes the mesh dense when it matters.
6. **LoRa upgrade path.** Phase 3 pairs with Meshtastic-compatible radios for treks, so we don't compete with Meshtastic; we ride it.

## 4. Product principles and scope

**v1 serves all three use cases (crowds, trails, blackouts) with one shared core, and ships in 12 weeks by cutting breadth, not safety.** The social layer and organiser tools come in v1.1 and v1.2.

### Principles

1. **Offline is the default, not a fallback.** Every safety feature must work in airplane mode with Bluetooth on. Internet only adds extras (sync, backups, event downloads).
2. **One thumb, three seconds.** A panicked person must reach "Where's my group?" and "SOS" within three seconds, with one hand, in sunlight.
3. **Battery is a feature.** The app must use less than 6% battery per hour in Radar mode and less than 2% per hour in Standby relay mode. It never makes things worse for a phone that's already low.
4. **Honest range.** We show real signal quality and "last seen 2 min ago", never fake precision.
5. **Private by default.** End-to-end encrypted, no account required, location visible only to your group unless you send SOS.
6. **Elders, children and first-time smartphone users are primary users,** not edge cases.
7. **Engagement serves safety.** Every social feature must either grow the mesh or rehearse the safety flow. No infinite feeds, no dark patterns.

### What ships when

| Area | v1.0 (week 12) | v1.1 (+6 weeks) | v1.2 (+12 weeks) | Later |
| --- | --- | --- | --- | --- |
| Groups | Create/join by QR or 6-digit code, up to 6 free | Groups up to 25 (paid) | Organiser rosters up to 500 | Org dashboard (web) |
| Radar | GPS + compass radar, distance, floor estimate, last seen | Breadcrumb trail, meeting-point arrows | UWB fine-find on supported phones | AR finder |
| Mesh | Nearby Connections + BLE fallback, 5-hop relay, store-and-forward | Adaptive power, delivery receipts | Public event channels | LoRa radio pairing |
| Safety | SOS, Last-Crumb beacon, offline emergency numbers | Lost-child cards, check-in timer | Verified crowd alerts | Satellite SOS hand-off |
| Events | 12 event packs, offline download | Event calendar, countdowns | Community-made packs | Organiser-published packs |
| Social | Profiles, avatars, group chat | Moments (photos/notes per trip), badges, streaks | Trip memories, "Who I met" | Event communities |
| Languages | 8 languages incl. RTL | +6 | +6 | Community translation |
| Platform | Android 8+ (Play Store) |  |  | iOS |

### Explicitly out of v1

- iOS (its background Bluetooth limits need a separate design).
- Voice notes and calls over mesh (bandwidth).
- Offline map tiles (we may add small vector map packs per event in v1.2).
- Any AI features.

## 5. Feature requirements

**Eight modules; P0 ships in v1.0, P1 in v1.1, P2 in v1.2.** Each requirement has a testable acceptance criterion.

### A. Onboarding and identity

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| A1 | No account. On first launch the app generates an Ed25519/X25519 key pair stored in Android Keystore | P0 | Works with no SIM, no internet |
| A2 | Language picker as the very first screen, with flags and native script names | P0 | All 8 v1 languages selectable before any text appears |
| A3 | Profile: display name, avatar (preset illustrations or photo), colour | P0 | Avatar is under 4 KB when sent over mesh |
| A4 | Emergency card: blood group, conditions, medicines, home contact, hotel/tent number | P0 | Visible from the lock screen notification without unlocking |
| A5 | Guided permission flow explaining why each permission is needed | P0 | Grant rate above 80% in usability tests |
| A6 | 60-second interactive tutorial ending with a practice SOS | P1 | Over 60% of new users complete it |

### B. Groups

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| B1 | Create a group; join by scanning a QR code or typing a 6-digit code while nearby | P0 | Join completes offline in under 10 s |
| B2 | Group key is exchanged in person (QR carries it), so no server is ever needed | P0 | Joining by code requires the creator's phone within range |
| B3 | Roles: Leader, Member, Elder, Child. Elders and Children get a simplified UI and stricter alerts | P0 | Leader can set roles |
| B4 | Free groups up to 6; paid up to 25; organiser up to 500 | P0 / P1 / P2 | Limit enforced locally |
| B5 | Multiple groups at once (family + friends) with a colour per group | P1 | Up to 5 active groups |
| B6 | Group expiry: event groups auto-archive after the event | P1 | Archive keeps chat and trip memory |

### C. Radar (the home screen)

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| C1 | Radar view: each member is a blip with avatar, direction and distance, rotated by compass heading | P0 | Bearing error under 15° after compass calibration |
| C2 | Each blip shows freshness ("now", "2 min", "lost signal 9 min") and an accuracy ring from GPS accuracy | P0 | Stale blips fade after 2 min, turn grey after 10 min |
| C3 | Floor estimate: barometric altitude relative to the leader ("2 floors above you") | P1 | Correct floor in 80% of mall/stadium tests |
| C4 | Find mode: tap a member to get a full-screen arrow, distance and haptic pulses that speed up as you get closer | P0 | Usable with screen brightness at 100% in sunlight |
| C5 | List view for accessibility and for groups over 10 | P0 | Screen reader reads "Ammi, 85 metres, ahead right" |
| C6 | Meeting points: leader drops named pins ("Gate 7", "Tent 42"); arrows to them work like members | P0 | Pins sync over mesh |
| C7 | Breadcrumbs: last 2 hours of each member's path | P1 | Stored locally, max 5 MB |
| C8 | UWB fine-find under 10 m on supported phones | P2 | Auto-detected; hidden on phones without UWB |

### D. Mesh messaging

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| D1 | Group chat and direct messages, end-to-end encrypted | P0 | Relays cannot read content |
| D2 | Quick replies in every language: "I'm OK", "Wait for me", "Come to me", "Meet at \[pin\]", "Need water", "Need medical help" | P0 | Sendable in 2 taps |
| D3 | Delivery states: Sending, In the mesh, Delivered, Read | P0 | States accurate in field tests |
| D4 | Store-and-forward: messages wait up to 6 hours and hop up to 7 times | P0 | Delivered when the recipient reappears |
| D5 | Text up to 500 characters; location pins; tiny thumbnails (under 8 KB) | P0 |  |
| D6 | Full photos sent only over Wi-Fi Direct/Nearby high-bandwidth links between nearby phones | P1 |  |

### E. Safety

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| E1 | **SOS:** hold the red button for 3 s (or the notification action). Sends exact location to the group and a "help needed nearby" signal with rough direction to all app users within range | P0 | Reaches group within 30 s in a 3-hop test |
| E2 | SOS screen: loud siren, screen strobe, emergency card shown full-screen for rescuers | P0 | Siren is optional and off for silent SOS |
| E3 | **Last-Crumb beacon:** at 15%, 5% and 2% battery, and on shutdown, broadcast final position, altitude and battery to the group; relays store it for 24 h | P0 | Received by group even if the sender's phone dies 1 minute later |
| E4 | Ultra-saver mode auto-offered at 15%: radar every 5 min, relay off, screen dark theme | P0 | Battery drain under 1% per hour |
| E5 | Offline emergency numbers by country and event (e.g. Saudi Red Crescent, Rescue 1122, Indian 112) | P0 | Works with no data |
| E6 | **Lost-child card:** lock-screen wallpaper and printable card with the guardian's code; any app user who scans it alerts the family over mesh | P1 | Alert arrives in under 60 s |
| E7 | **Check-in timer:** "If I don't check in by 5 pm, alert my group" (for treks) | P1 | Fires offline |
| E8 | **Crowd alerts:** users can report "Crush risk at Gate 4". Shown as verified only after 3 independent reports within 200 m and 5 min, or one signed organiser report | P2 | False-alert rate under 5% in drills |
| E9 | Separation alert: the leader is warned when an Elder or Child moves more than a set distance away | P1 | Default 150 m, adjustable |

### F. Event Mode

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| F1 | 12 launch event packs (Hajj, Umrah, Arbaeen, Raiwind Ijtema, Muharram, Kumbh/Magh Mela, Durga Puja, Rath Yatra, PSL/IPL stadium, concerts, Trekking, Flood/Blackout) | P0 | Each pack under 2 MB |
| F2 | Pack contents: meeting-point suggestions, emergency numbers, do's and don'ts, ritual or schedule guide, phrasebook | P0 | Downloadable before the event; works offline after |
| F3 | "Event day" switch: raises scan rate, enables the event channel, sets reminders | P0 |  |
| F4 | Public event channel: short broadcast messages to everyone nearby, rate-limited to 1 per 5 min per user, 3 hops max | P2 | Spam-reportable |
| F5 | Event calendar with countdowns and "Prepare your group" checklist | P1 |  |

### G. Social and engagement layer

The mesh only works if many people keep the app installed and relaying. These features give people reasons to open it weekly, and every one of them strengthens the network or rehearses the safety flow.

| ID | Feature | Priority | Why it matters |
| --- | --- | --- | --- |
| G1 | **Trip memories:** after each event, an auto-made card with route, distance walked, places, group photo and members | P1 | Shareable to WhatsApp and Instagram, which drives installs |
| G2 | **Moments:** short notes and photos pinned to places during the trip, shared with the group | P1 | Makes the group space feel alive |
| G3 | **Relay Hero badges:** "You relayed 1,000 messages for strangers at Kumbh" | P1 | Rewards leaving relay on, which makes the mesh dense |
| G4 | **Regroup Drill game:** a weekly 5-minute hide-and-seek using the radar, played with friends or family | P1 | Practising the real flow; fun, repeatable |
| G5 | **Safety Ready score:** profile completeness, drill done, emergency card filled, pack downloaded | P1 | Turns preparation into progress |
| G6 | **Family Circle (online mode):** daily location sharing over the internet, switching to mesh automatically when the network fails | P2 | Daily use without an event; biggest retention lever |
| G7 | **Event communities:** opt-in pages per event to find your city's group, share tips and arrange meetups | P2 | Year-round reason to return |
| G8 | **Offline invite:** share the app phone to phone with Android's Quick Share, plus a QR to the Play Store page | P0 | Growth inside crowds with no internet |
| G9 | Streaks only for positive safety habits (weekly check-in with family), never for time spent | P2 | Principle 7 |

### H. Settings and power

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| H1 | Power modes: **Radar** (live, 5 s updates), **Balanced** (30 s), **Standby relay** (relay only), **Ultra-saver** (5 min) | P0 | Drain targets in section 8 |
| H2 | Theme: System, Light, Dark, plus a high-contrast **Sunlight** theme | P0 |  |
| H3 | Elder mode: larger text, three big buttons (Find family, Call for help, I'm OK) | P0 | Tested with users over 60 |
| H4 | Delete everything: wipes keys, groups and history | P0 | One tap plus confirmation |

## 6. User flows and screens

**Four tabs (Radar, Chat, Events, Me) plus a red SOS button that floats on every screen.** Radar opens by default because finding people is the job.

### Screen inventory (v1.0)

| Tab | Screens | Notes |
| --- | --- | --- |
| Onboarding | Language → Welcome (3 slides) → Name and avatar → Emergency card → Permissions → Create or join group → Practice tutorial | Skippable after Permissions, but nudged daily until done |
| Radar | Radar, List view, Find mode (full-screen arrow), Member sheet, Meeting-point editor, Mesh health sheet | Mesh health shows phones in range, hops, last sync |
| Chat | Group list, Group chat, Direct chat, Quick-reply tray, Pin picker |  |
| Events | Event list and calendar, Event pack detail, Download manager, Event day dashboard |  |
| Me | Profile, Emergency card, Groups manager, Power modes, Theme and language, Privacy, Subscription, Badges and memories (v1.1) |  |
| Global | SOS hold overlay, SOS active screen, Incoming SOS alert, Last-Crumb received, Low-battery prompt, QR scanner | Incoming SOS overrides Do Not Disturb (with permission) |

### Key flows

**1. First run to first group (target: under 2 minutes)**

1. Pick language.
2. Enter name, pick avatar.
3. Fill emergency card (can skip, nudged later).
4. Grant Nearby devices, Location and Notifications, each with a one-line reason.
5. "Create group" shows a big QR; others scan it from "Join group".
6. Everyone appears on the radar; the app suggests a 30-second practice regroup.

**2. Separated in a crowd**

1. User opens app (or taps the persistent notification).
2. Radar shows the group; the missing member's blip is grey with "last seen 6 min, 240 m north".
3. User taps "Wait for me" quick reply, or taps the blip for Find mode.
4. Find mode gives arrow, distance and haptic pulses; when under 10 m the phone vibrates continuously and plays a soft chime on both phones.
5. If the member is unreachable for 15 minutes, the app suggests going to the nearest meeting point instead of pushing through the crowd.

**3. SOS**

1. Hold SOS for 3 seconds (progress ring, haptic tick each second; release cancels).
2. Choose: Medical, Lost, Danger, or just send (auto-sends after 5 s).
3. Group gets a full-screen alert with direction and distance; strangers' phones within range get "Someone nearby needs help" with rough direction.
4. Sender's screen shows the emergency card large, plus local emergency numbers.
5. SOS stays active, re-broadcasting every 30 s, until the sender or a group leader marks it resolved.

**4. Last-Crumb**

1. Battery hits 15%: prompt to switch to Ultra-saver and to share "low battery" with group.
2. At 5% and 2%, and on shutdown, the beacon fires automatically.
3. Group members see a battery-skull pin: "Ammi's last location, 14:32, 3rd floor", which stays on their radar for 24 hours.

**5. Trek check-in**

1. Leader sets checkpoints and a time limit.
2. Members tap "Checked in" at each point (or auto by geofence).
3. A missed check-in alerts the group and starts a search pattern view showing each member's last position.

## 7. Design system: "Beacon"

**Calm, deep-navy dark mode with a glowing teal signal colour; clean, airy light mode; red is reserved for SOS only.** The look should feel like a trustworthy instrument, not a toy, while the social layer adds warmth with violet and illustrated avatars.

### Colour tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | #F6F8FB | #070C17 | App background |
| `surface` | #FFFFFF | #0F1626 | Cards, sheets |
| `surface-raised` | #EEF2F7 | #172036 | Raised cards, inputs |
| `border` | #DCE2EA | #25304A | Dividers, outlines |
| `text` | #0B1220 | #EAF0FA | Primary text |
| `text-muted` | #5A6478 | #96A3BC | Secondary text |
| `primary` (Signal Teal) | #00987F | #2EE6C5 | Brand, radar sweep, primary buttons |
| `on-primary` | #FFFFFF | #04251F | Text on primary |
| `accent` (Circle Violet) | #6350F5 | #9A8CFF | Social features, badges, memories |
| `sos` | #D91F36 | #FF4D5E | SOS only, never decoration |
| `warning` | #C77700 | #FFB547 | Low battery, stale signal |
| `success` | #148A45 | #3DDC84 | Delivered, checked in |
| `sunlight-bg` / `sunlight-text` | #FFFFFF / #000000 | same | High-contrast Sunlight theme |

**Group colours** (8, colour-blind-checked, each also paired with a shape so colour is never the only cue): Teal ●, Violet ▲, Amber ■, Rose ◆, Sky ●, Lime ▲, Coral ■, Slate ◆.

All text pairs meet WCAG AA (4.5:1) in both themes; verify with a contrast checker during implementation.

### Typography

| Script | Font | Notes |
| --- | --- | --- |
| Latin, Indonesian, Malay, Turkish | Inter (variable) | Tabular numbers for distances |
| Urdu | Noto Nastaliq Urdu | Line height 1.9×; Nastaliq is tall, so cards need extra vertical padding |
| Arabic, Persian | Noto Naskh Arabic or IBM Plex Sans Arabic |  |
| Hindi, Marathi | Noto Sans Devanagari |  |
| Bengali | Noto Sans Bengali |  |
| Tamil, Telugu | Noto Sans Tamil / Telugu | v1.1 |

Type scale (sp): 12 caption · 14 body-small · 16 body · 20 title · 24 headline · 32 distance readout · 56 Find-mode distance. Elder mode adds +4 sp to every step. Support system font scaling up to 200%.

### Shape, space and elevation

- 4 dp grid; standard padding 16 dp; section gaps 24 dp.
- Radius: 12 dp chips and inputs, 20 dp cards, 28 dp bottom sheets, full pill for buttons.
- Elevation by tone, not shadow, in dark mode (raised = lighter surface). Light mode uses one soft shadow (0 4 16, 8% black).
- Touch targets at least 48 dp; 56 dp in Elder mode; SOS button 72 dp.

### Signature components

- **Radar canvas** (React Native Skia): concentric rings at 25/50/100/250 m with auto-zoom, a slow 4-second sweep in primary with a soft glow trail, avatar blips with a direction tick and accuracy halo. Sweep stops in Ultra-saver.
- **Find-mode arrow:** a single large arrow that rotates smoothly with the compass, distance in 56 sp, background pulses faster as distance falls.
- **SOS button:** red pill, bottom centre, hold-to-fire ring that fills over 3 seconds with a haptic tick each second.
- **Quick-reply chips:** pill chips in a horizontal tray, icons plus text, localised.
- **Mesh health pill:** top bar shows "12 phones nearby · 3 hops" with a small signal glyph.
- **Event cards:** soft gradient backgrounds per event category (e.g. Hajj in white and gold, Durga Puja in vermilion and marigold, Trekking in glacier blue), with a countdown.

### Motion and haptics

- React Native Reanimated for 60 fps animations on the UI thread; Lottie for onboarding and badge celebrations.
- Durations: 150 ms micro, 250 ms standard, 400 ms sheets. Easing: standard decelerate.
- Respect the system "Remove animations" setting: sweep and pulses become static.
- Haptics: light tick for taps, double pulse for new message, long repeating pattern for incoming SOS.

### Illustration and imagery

Inclusive illustrated avatars: hijab, turban, saree, ihram, elders, children, wheelchair users. Flat illustration with soft grain texture, never stock photos.

### Right-to-left

Urdu and Arabic flip the layout with `I18nManager`. The radar itself does not mirror (north is north), but chevrons, back arrows and list alignment do. Numbers stay in the user's chosen numeral system (Western or Eastern Arabic).

## 8. Technical architecture

**React Native draws the UI; a native Kotlin "Mesh Engine" inside an Android foreground service does all radio, crypto, location and relaying, so the mesh keeps working when the UI is closed or the JS runtime is killed.** This split is the single most important technical decision.

&#91;embedded content: app architecture · UI, engine, relays\]

The UI can be swiped away; the engine keeps scanning, relaying and beaconing, and nothing in the safety path touches the cloud.

### Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App framework | React Native (New Architecture) with Expo SDK, development builds, EAS Build | Fast solo development; native code still allowed |
| Language | TypeScript (UI), Kotlin (engine) |  |
| Native bridge | Expo Modules API (Kotlin) | Typed, simpler than raw TurboModules |
| Navigation | Expo Router | File-based, deep links for QR joins |
| UI rendering | React Native Skia (radar), Reanimated 3, Gesture Handler, Lottie | 60 fps radar on mid-range phones |
| State | Zustand (UI state), engine events streamed from Kotlin |  |
| Local database | SQLite (expo-sqlite) with Drizzle ORM on the JS side; Room inside the engine | Engine owns the message queue |
| Crypto | Lazysodium (libsodium) in Kotlin; keys in Android Keystore | Audited primitives |
| Transport 1 | Google Nearby Connections, `P2P_CLUSTER` strategy | M-to-N clusters within about 100 m radio range ([docs](https://developers.google.com/android/reference/com/google/android/gms/nearby/connection/Strategy)) |
| Transport 2 | Raw BLE extended advertising (Android 8+) | Connectionless, low-power position beacons |
| Location | Fused Location Provider (GPS works offline), rotation-vector sensor, barometer |  |
| UWB (v1.2) | Jetpack `androidx.core.uwb` | Fine-find on supported phones |
| i18n | i18next + ICU plurals; `I18nManager` for RTL |  |
| Payments | Google Play Billing (react-native-iap) |  |
| Crash and analytics | Sentry; opt-in, offline-queued analytics (PostHog) |  |
| Backend (minimal) | Cloudflare R2 for signed event packs; one Cloudflare Worker for purchase verification | No server needed for safety features |

### Mesh protocol (v1)

**Packet header (32 bytes):** version, type, message ID (16 random bytes), rotating group tag (8 bytes), hop count, TTL, created time.

**Payload:** encrypted with the group key using XChaCha20-Poly1305 and signed with the sender's Ed25519 key. Relays see only the header.

**Packet types and priority (highest first):** SOS → Last-Crumb → Position → Check-in → Chat → Thumbnail.

**Position packet:** about 60 bytes (lat/lon as int32 × 1e7, altitude, pressure, accuracy, heading, battery, timestamp), small enough for a single BLE advertisement.

**Routing:** managed flooding.

- Every phone rebroadcasts packets it hasn't seen (dedupe cache of the last 20,000 IDs).
- Max 7 hops, 6-hour expiry for chat, 24-hour expiry for SOS and Last-Crumb.
- **Crowd damping:** with more than 8 neighbours, rebroadcast with probability 0.5 to 0.7 and random 50 to 300 ms jitter, to stop broadcast storms in dense crowds.
- Store-and-forward queue persists across restarts; SOS always jumps the queue.

**Privacy:** the group tag rotates every 15 minutes (HMAC of group key and time window), and device IDs rotate hourly, so strangers can't track a group across a venue. Public SOS reveals only rough direction and "within \~X m", never exact location, to non-members.

### Power management

| Mode | Location | Radio scan | Relay | Target drain |
| --- | --- | --- | --- | --- |
| Radar | 5 s, high accuracy | Continuous | On | Under 6% per hour |
| Balanced | 30 s | 30% duty cycle | On | Under 3% per hour |
| Standby relay | 5 min | 10% duty cycle | On | Under 2% per hour |
| Ultra-saver | 5 min, low power | 5% duty cycle | Off | Under 1% per hour |

Targets are hypotheses to validate in week 2 on three reference phones (one budget, one mid-range, one flagship).

**Staying alive in the background:** foreground service with types `connectedDevice` and `location`, plus a persistent notification (which doubles as a quick-action bar). Many OEM Android skins (Xiaomi, Oppo, Vivo, Realme, Samsung) still kill background apps, so onboarding includes a per-brand "keep Mesh Radar running" guide with deep links to the right settings screen.

**Battery and shutdown hooks:** a battery-level receiver triggers Last-Crumb at 15/5/2%, and `ACTION_SHUTDOWN` fires a final beacon.

## 9. Play Store compliance, permissions and privacy

**We avoid background-location permission entirely by only starting the mesh service while the app is on screen; this removes the hardest Play review.** Everything else is standard but must be declared carefully.

### Permissions

| Permission | Why | When asked |
| --- | --- | --- |
| `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT` | Find and talk to nearby phones | Onboarding |
| `NEARBY_WIFI_DEVICES` (Android 13+) | Wi-Fi high-bandwidth links | Onboarding |
| `ACCESS_FINE_LOCATION` | Radar positions; required by Nearby on older Android | Onboarding |
| `FOREGROUND_SERVICE_CONNECTED_DEVICE`, `FOREGROUND_SERVICE_LOCATION` | Keep mesh alive with screen off | Manifest only |
| `POST_NOTIFICATIONS` | Messages, SOS, persistent status | Onboarding |
| `CAMERA` | Scan group QR codes | First QR scan |
| `ACCESS_NOTIFICATION_POLICY` | Let SOS alerts ring through Do Not Disturb | Optional, after first group |
| **Not used:** `ACCESS_BACKGROUND_LOCATION`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Both trigger strict review |  |

Consequence: the mesh does not auto-start after a reboot. The user taps "Start" once; we remind them with a scheduled notification on event days.

### Play Console declarations

- **Foreground service types:** apps targeting Android 14+ must declare each type and its use case on the App content page ([Play policy](https://support.google.com/googleplay/android-developer/answer/13392821)). We declare `location` (user-initiated location sharing, which Google lists as an example use) and `connectedDevice`, with a short demo video.
- **Data safety form:** location and messages are end-to-end encrypted and sent peer to peer, never to our servers. Declare conservatively and have the wording reviewed.
- **Target audience:** 13+. Children appear as group members managed by a guardian; they never create accounts.
- **Target API level:** always the level Google Play currently requires for new apps and updates (check at build time).
- **Health and safety claims:** store listing says "helps you stay connected", never "guarantees rescue". In-app notice: not a replacement for emergency services.

### Privacy commitments

1. No account, phone number or email needed.
2. We never receive location, messages or contacts.
3. Analytics are opt-in, anonymous, and contain no location.
4. Delete-everything works offline and is instant.
5. Public SOS shares only rough direction and distance with strangers.
6. Publish a plain-language privacy policy in every supported language.

### Device compatibility

Nearby Connections needs Google Play Services. Phones without it (for example, recent Huawei models) fall back to BLE-only mode with fewer features. Minimum Android 8.0 for BLE extended advertising.

## 10. Monetization

**Relaying and every safety feature are free forever; people pay for bigger groups, longer trips and memories.** One payer unlocks the whole group, so a family or tour leader buys once and everyone benefits. No ads: ads need internet and erode trust in a safety app.

### Tiers

| Tier | Price (USD base) | Who pays | What it unlocks |
| --- | --- | --- | --- |
| **Free** | $0 |  | Relay for everyone, SOS, Last-Crumb, Find mode, emergency numbers, 1 active group up to 6 people, 3 event packs |
| **Event Pass** | $3.99 per 14 days | Group leader | Group up to 25, all event packs, breadcrumbs, separation alerts, trip memories |
| **Family Plus** | $14.99 per year | One person | Up to 5 groups, up to 25 each, all Event Pass features all year, Family Circle (v1.2), premium avatars and radar themes |
| **Organiser** (v1.2) | $0.20 per member per event, $10 minimum | Tour operators, trek companies, puja committees, schools | Rosters up to 500, organiser-signed alerts, custom event packs, roster export |
| **Cosmetics** | $0.99 to $2.99 | Anyone | Avatar packs, radar skins, badge frames |

### Local pricing

Use Google Play's local price tiers rather than straight currency conversion. Starting points to test (approximate):

| Market | Event Pass | Family Plus |
| --- | --- | --- |
| Pakistan | PKR 349 | PKR 1,499 |
| India | INR 149 | INR 699 |
| Bangladesh | BDT 199 | BDT 899 |
| Indonesia | IDR 29,000 | IDR 129,000 |
| Saudi Arabia / UAE | SAR 14.99 / AED 14.99 | SAR 54.99 / AED 54.99 |
| US / UK / EU | $3.99 / £3.49 / €3.99 | $14.99 / £12.99 / €14.99 |

### Rules

1. Never paywall anything that helps someone in danger.
2. A pass bought online works fully offline for its whole period (signed licence cached on the device and shared to group members over mesh).
3. Offer a free 14-day Event Pass for a user's first Hajj, Umrah, Kumbh or other major pilgrimage, to seed density where it matters most.
4. Target: 3% of monthly active users paying by month 6; revisit tiers after the first major event season.

## 11. Localization

**20 languages within six months, starting with 8 at launch chosen by where the largest gatherings are.** Safety strings (SOS, quick replies, alerts) are professionally translated and native-speaker tested; everything else can go through community translation.

| Wave | Languages | Driven by |
| --- | --- | --- |
| v1.0 (8) | English, Urdu, Arabic, Hindi, Bengali, Indonesian, Malay, Turkish | Hajj/Umrah, Kumbh, Durga Puja, Ijtemas, PSL/IPL |
| v1.1 (+6) | Persian, Punjabi (Shahmukhi and Gurmukhi), Pashto, Tamil, Telugu, Marathi | Arbaeen, Muharram, South Indian festivals, Vaisakhi |
| v1.2 (+6) | French, Hausa, Swahili, Nepali, Sindhi, Spanish | West and East African pilgrims, Himalayan treks, Latin America |

### Requirements

- **Right-to-left** for Urdu, Arabic, Persian, Pashto, Sindhi and Shahmukhi Punjabi, tested screen by screen.
- **Audio quick replies:** each quick reply also plays a short recorded voice clip in the sender's language, for low-literacy users and elders.
- **Translated quick replies across languages:** because quick replies are coded phrases, an Urdu "Wait for me" arrives as Indonesian on an Indonesian phone, with no internet.
- **Calendars:** Gregorian plus Hijri (Hajj/Umrah dates) and local festival calendars in event packs.
- **Numerals:** Western or Eastern Arabic digits per user setting.
- **Units:** metres by default; feet and miles available.
- **Tooling:** i18next with ICU message format; Crowdin for community translation; a pseudo-locale build to catch clipped and hard-coded text.

## 12. Metrics, testing and QA

**North-star metric: successful regroups per week** (a Find-mode session that ends with the two phones within 10 m). It measures the one thing the product exists to do.

### Metrics and targets (month 6)

| Metric | Target | Why |
| --- | --- | --- |
| Successful regroups per week | 10,000 | North star |
| Mesh delivery rate (3 hops, crowd) | Over 90% within 60 s | Core reliability |
| SOS delivery to group | Over 98% within 30 s when any path exists | Safety |
| Battery drain, Balanced mode | Under 3% per hour | Keeps people relaying |
| Day-30 retention | Over 25% | Engagement layer working |
| Weekly users with relay on | Over 40% of installs | Mesh density |
| Onboarding completion (to first group) | Over 70% | Activation |
| Paying users | 3% of monthly actives | Business |
| Crash-free sessions | Over 99.5% | Trust |
| Play Store rating | 4.5+ | Growth |

All metrics come from opt-in analytics or on-device counters synced later; none include location.

### Test plan

1. **Mesh simulator** (Kotlin unit tests): 500 virtual nodes moving through a crowd model, to tune rebroadcast probability, TTL and dedupe before touching real phones.
2. **Device lab:** at least 6 phones covering budget to flagship and the brands common in launch markets (Samsung, Xiaomi/Redmi, Tecno/Infinix, Oppo/Vivo/Realme, a Pixel). Buy used where possible.
3. **Battery soak:** 8 hours per power mode per phone, screen off, logged automatically.
4. **Field tests:**
   - Week 4: 6 phones on a university campus, open ground and buildings.
   - Week 8: 15 to 20 volunteers in a busy market or mosque Friday crowd (with permission), measuring hop counts and delivery.
   - Week 10: a day hike with a trekking club, testing check-ins and Last-Crumb.
   - Week 11: airplane-mode-only day (simulated blackout) with a family group.
5. **Usability:** 5 sessions with users over 60 and 5 with first-time smartphone users, in Urdu and Bengali.
6. **Accessibility:** TalkBack pass on every screen, 200% font scale, Sunlight theme outdoors.
7. **Security review:** external review of the crypto and protocol design before v1.1 (Bridgefy's early protocol had published flaws; we cannot afford the same).

### Release process

- Play Console internal track → closed testing → production with staged rollout (10% → 50% → 100%).
- New personal Play developer accounts must run a closed test with a minimum number of testers for 14 days before production access. Recruit testers in week 6 so this doesn't delay launch.

## 13. Roadmap and 12-week build plan

**The mesh is built and proven first; if it fails the week-4 gate, the UI work waits.** Everything after that is known React Native work.

&#91;embedded content: 12-week build plan and post-launch updates\]

The closed test starts in week 10 because Play requires 14 days of testing before a new personal account can publish; trek and blackout tests run in parallel with it.

## 14. Risks, open questions and sources

**The biggest risk is technical: whether a phone mesh stays reliable and battery-friendly in a real crowd.** That's why weeks 1 to 4 are a mesh spike, and why the go/no-go gate sits at week 4.

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Mesh unreliable in dense crowds (broadcast storms, 2.4 GHz absorbed by bodies) | High | High | Simulator tuning, crowd damping, BLE beacons for positions, week-8 crowd test |
| OEM battery killers stop the service | High | High | Per-brand setup guide, persistent notification, health check that warns users |
| Battery drain makes users switch it off | Medium | High | Power modes, honest drain display, Ultra-saver default under 15% |
| Too few installs at an event for the mesh to work | High | High | Free relay, offline Quick Share invites, free first-pilgrimage pass, organiser deals |
| Scope too big for one developer in 12 weeks | High | Medium | Strict P0 list, social layer moved to v1.1, reuse Expo and libraries |
| Play review rejects foreground service or Data safety wording | Medium | High | No background location, demo video, conservative declarations, submit early |
| False or malicious crowd alerts cause panic | Medium | High | Alerts only in v1.2, 3-report verification, organiser signatures, rate limits |
| Encryption or protocol flaw | Low | High | libsodium primitives only, external review before v1.1 |
| Local regulation of encrypted mesh or radio use in some countries | Low | Medium | Legal check for Saudi Arabia, India, Pakistan before marketing there |
| No Google Play Services on some phones | Low | Low | BLE-only fallback |

### Open questions

- [ ] Final store name: Mesh Radar, Qareeb, Huddle or Kumpul?
- [ ] Should Family Circle (online daily location) move earlier, given it's the strongest retention lever?
- [ ] Which first event do we launch around: Umrah season, Raiwind Ijtema, PSL, or the next Kumbh/Magh Mela?
- [ ] Partner with a Hajj/Umrah tour operator for the week-8 field test?
- [ ] Brand identity: commission a logo and avatar set, or start with an open illustration library?

### Sources

- [Festival crush in Kolkata kills at least 17 (Reuters via US News), 17 Oct 2026](https://www.usnews.com/news/world/articles/2026-10-17/festival-crush-in-indian-city-of-kolkata-kills-at-least-17-local-media-say)
- [List of human stampedes in Hindu temples (Wikipedia)](https://en.wikipedia.org/wiki/List_of_human_stampedes_in_Hindu_temples)
- [Karur stampede, 41 deaths (Tribune India)](https://www.tribuneindia.com/news/india/karur-stampede-sc-to-pronounce-order-on-monday-on-petitions-seeking-independent-probe)
- [Year Ender 2025: major stampedes in India (Free Press Journal)](https://www.freepressjournal.in/amp/india/year-ender-2025-from-mahakumbh-to-karur-major-stampedes-that-shook-india)
- [2025 Prayag Maha Kumbh Mela crowd crush (Wikipedia)](https://en.wikipedia.org/wiki/2025_Prayag_Maha_Kumbh_Mela_crowd_crush)
- [Loved ones search for missing as Hajj death toll passes 900 (AFP via Al-Monitor)](https://www.al-monitor.com/originals/2024/06/loved-ones-search-missing-hajj-death-toll-passes-900)
- [Bridgefy end-to-end encryption launch (TechCrunch)](https://techcrunch.com/?p=2067907)
- [Bridgefy growth to 12M+ downloads (Alchemist Accelerator)](https://www.alchemistaccelerator.com/blog/bridgefy-the-offline-messaging-app-revolutionizing-crisis-communication-worldwide)
- [Meshtastic Android user guide](https://meshtastic.org/docs/software/android/user/)
- [Meshtastic overview](https://mythos.one/me/brianswichkow/e09722)
- [Nearby Connections Strategy reference (Google)](https://developers.google.com/android/reference/com/google/android/gms/nearby/connection/Strategy)
- [Foreground service requirements (Google Play Console Help)](https://support.google.com/googleplay/android-developer/answer/13392821)

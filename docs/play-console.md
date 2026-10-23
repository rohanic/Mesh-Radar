# Play Console: everything to fill in

Copy-ready values for publishing Mesh Radar. Policy pages change, so read Play Console's own help text for each form as you fill it. The permission list below is from the app's real merged Android manifest (2026-10-23). Related: [play-checklist.md](play-checklist.md), [setup.md](setup.md).

## 1. Create the app

| Field | Value |
| --- | --- |
| App name | Mesh Radar: Find Group Offline |
| Default language | English (United Kingdom) or English (United States) |
| App or game | App |
| Free or paid | Free (with in-app purchases) |
| Package (set by the first upload) | `com.meshradar.findgroupoffline` |
| Developer account | Personal, created March 2023, so the 12-tester, 14-day closed test rule does not apply |

## 2. Store listing (Grow, Store presence, Main store listing)

| Field | Value |
| --- | --- |
| App name (30) | Mesh Radar: Find Group Offline |
| Short description (80) | See your group on a radar, chat and send SOS with no internet or signal. |
| App icon 512 x 512 | `assets/store/play-icon-512.png` |
| Feature graphic 1024 x 500 | `assets/store/feature-graphic-1024x500.png` |
| Phone screenshots | 4 to 8, from an Android phone: Radar, Find mode, Chat with quick replies, SOS, Event pack, Elder mode. Make them in English, Urdu, Arabic, Hindi and Bengali when you can |
| Category | Maps & Navigation (alternative: Travel & Local) |
| Tags | Pick those closest to: offline, family safety, location sharing, group travel, navigation |
| Email | creaeza7@gmail.com |
| Website | https://creaeza.com |
| Privacy policy | https://creaeza.com/mesh-radar-privacy/ |

Full description (under 4000 characters):

```text
Mesh Radar keeps your group together when the mobile network fails: in crowds, on trails and in blackouts.

Phones talk to each other directly over Bluetooth and Wi-Fi and pass messages along for each other, so your family can see where everyone is, send messages and ask for help with no signal, no SIM and no internet.

FIND YOUR PEOPLE
- A live radar shows each member of your group with direction and distance.
- Find mode gives a big arrow, the distance and vibrations that speed up as you get closer.
- Floor estimates in malls and stadiums.
- Meeting points: the leader drops named pins like "Gate 7" or "Tent 42".

STAY IN TOUCH WITHOUT SIGNAL
- Group chat and direct messages, end-to-end encrypted.
- Quick replies such as "I'm OK", "Wait for me" and "Need water", in your language.
- Messages hop through nearby phones and wait until the other person is back in range.

SAFETY FEATURES ARE FREE, ALWAYS
- Hold SOS for 3 seconds to send your exact location to your group.
- Last-Crumb sends your last location when your battery runs low.
- Separation alerts tell the leader when an elder or a child moves too far away.
- Offline emergency numbers for 10 countries.
- An emergency card for rescuers and a lost-child card for families.

MADE FOR BIG GATHERINGS
Ready packs for Hajj, Umrah, Arbaeen, Raiwind Ijtema, Muharram, Kumbh and Magh Mela, Durga Puja, Rath Yatra, cricket stadiums, concerts, trekking, and floods and blackouts, with meeting point ideas, tips and phrases.

PRIVATE BY DESIGN
- No account, no phone number, no email.
- Your location and messages go only to your group, encrypted end to end.
- Delete everything in one tap, even offline.

8 LANGUAGES
English, Urdu, Arabic, Hindi, Bengali, Indonesian, Malay and Turkish, with right-to-left layouts and an Elder mode with larger text and three big buttons.

PLANS
Relaying and every safety feature are free. Optional Event Pass and Family Plus plans add bigger groups, all event packs, trails and trip memories. One person pays and the whole group benefits.

Mesh Radar works best when people around you have it too. Share it phone to phone from the app, even without internet.

Mesh Radar helps your group stay connected. It is not an emergency service and does not replace calling one. Delivery depends on nearby phones running the app.
```

Never write "guarantees rescue" or "replaces emergency services" anywhere in the listing (PRD section 9).

## 3. App content (Policy, App content)

| Section | Answer |
| --- | --- |
| Privacy policy | https://creaeza.com/mesh-radar-privacy/ (also linked in the app: Me, Privacy) |
| App access | All functionality is available without special access (no login). Note for reviewers: "The mesh needs two Android phones near each other. Create a group on one phone and scan its QR code from the other." |
| Ads | No, the app does not contain ads |
| Advertising ID | No. The app does not use the advertising ID (the manifest has no AD_ID permission) |
| Content rating | Fill the questionnaire: no violence, sexual content, profanity, drugs or gambling. Yes to users interacting or exchanging content (group chat, event channel), yes to sharing the user's location with other users, yes to digital purchases |
| Target audience | 13 to 15, 16 to 17, and 18 and over. Not under 13. Does not appeal to children |
| News app | No |
| COVID-19 apps | No |
| Government app | No |
| Financial features | None (in-app purchases are not a financial feature) |
| Health | No health features. The emergency card holds only what the person types for rescuers |
| Data safety | See section 4 |
| Foreground service | See section 5 |
| Full-screen intent | See section 5 |

## 4. Data safety

General answers:

| Question | Answer |
| --- | --- |
| Does the app collect or share any of the required user data types? | Yes |
| Is all user data encrypted in transit? | Yes (HTTPS to the server, end-to-end encryption phone to phone) |
| Can users request that their data is deleted? | Yes: Me, Privacy, Delete everything in the app, and https://creaeza.com/mesh-radar-delete-data/ |
| Account creation | The app does not let users create an account |

Declare conservatively (draft; have it reviewed with the privacy policy):

| Data type | Collected | Shared | Required or optional | Purpose |
| --- | --- | --- | --- | --- |
| Location: precise | Yes | No | Required | App functionality |
| Location: approximate | Yes | No | Required | App functionality |
| Personal info: name | Yes | No | Required | App functionality |
| Personal info: user IDs (the app's public key, for licences) | Yes | No | Optional | App functionality |
| Health info (emergency card) | Yes | No | Optional | App functionality |
| Messages: other in-app messages | Yes | No | Optional | App functionality |
| Photos | Yes | No | Optional | App functionality |
| Financial info: purchase history | Yes | No | Optional | App functionality |
| App activity: app interactions | Yes | No | Optional (opt-in) | Analytics |
| App info and performance: crash logs, diagnostics | Yes | No | Optional (opt-in) | App functionality |
| Device or other IDs (random analytics ID) | Yes | No | Optional (opt-in) | Analytics |

"Shared" is No because data goes to the person's own group at their request (which Play does not count as sharing) and to service providers (Cloudflare, Google Play, Sentry, PostHog) that process it for us.

## 5. Permissions and declarations

From the release manifest. Not requested: background location, battery optimisation exemption, exact alarms, microphone, boot receiver, media files, advertising ID, change system settings, push messaging.

| Permission | Why (use these words) | Declaration |
| --- | --- | --- |
| Nearby devices: `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT`, `NEARBY_WIFI_DEVICES`, `UWB_RANGING` | Find nearby phones and pass encrypted messages between them with no internet | None |
| Location: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | Show the group on the radar; only while the person has started the mesh | None (foreground only) |
| `FOREGROUND_SERVICE_CONNECTED_DEVICE` | Keeps the connection to nearby phones while the screen is off | Foreground service form: "Connected device". Video: start the mesh, lock the phone, a message from a second phone still arrives |
| `FOREGROUND_SERVICE_LOCATION` | User-started location sharing with the group | Foreground service form: user-initiated location sharing, same video |
| `USE_FULL_SCREEN_INTENT` | Incoming SOS from a family member | Full-screen intent form. Mesh Radar is not a calling or alarm-clock app, so Play may not grant it on Android 14+; the app then shows a high-priority alert instead (DEC-024) |
| `POST_NOTIFICATIONS` | Messages, SOS alerts and the mesh status | None |
| `ACCESS_NOTIFICATION_POLICY` | Optional: let an SOS ring through Do Not Disturb | None |
| `CAMERA` | Scan group and lost-child QR codes, take a profile photo | None |
| `SET_WALLPAPER` | Lost-child card on the lock screen, only when the guardian taps it | None |
| `com.android.vending.BILLING` | In-app purchases | None |

## 6. In-app products (Monetize, Products)

Needs a payments profile (merchant account) in Play Console first.

| Product ID | Type | Base price (USD) | Local price examples |
| --- | --- | --- | --- |
| `event_pass_14d` | One-time | 3.99 | PKR 349, INR 149, BDT 199, IDR 29,000, SAR 14.99 |
| `family_plus_yearly` | Subscription, one yearly base plan | 14.99 | PKR 1,499, INR 699, BDT 899, IDR 129,000, SAR 54.99 |
| `organiser_50` | One-time | 10 | |
| `organiser_100` | One-time | 20 | |
| `organiser_250` | One-time | 50 | |
| `organiser_500` | One-time | 100 | |

Then link purchases to the Worker: Google Cloud service account with the Google Play Android Developer API, invited in Users and permissions with "View financial data" and "Manage orders and subscriptions", then:

```sh
npm run setup:worker -- --service-account ~/Downloads/play-service-account.json
```

## 7. Countries and release

- Countries: start with Pakistan, India, Bangladesh, Saudi Arabia, UAE, Iraq, Indonesia, Malaysia, Turkey and Nepal (the countries with emergency numbers in the app), then widen. PRD section 14: check local rules on encrypted mesh radio apps for Saudi Arabia, India and Pakistan before marketing there.
- First release: Testing, Internal testing, create release, upload the `.aab` by hand (Play needs the first upload in the browser), add testers by email, roll out.
- Production: after `npm run check:release` passes, build with the `production` profile, upload to Production, staged rollout 10 percent, then 50, then 100.

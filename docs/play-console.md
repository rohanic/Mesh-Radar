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
| Content rating | See section 4b |
| Target audience | 13 to 15, 16 to 17, and 18 and over. Not under 13. Does not appeal to children |
| News app | No |
| COVID-19 apps | No |
| Government app | No |
| Financial features | None (in-app purchases are not a financial feature) |
| Health | No health features. The emergency card holds only what the person types for rescuers |
| Data safety | See section 4 |
| Foreground service | See section 5 |
| Full-screen intent | See section 5 |

## 4. Data safety (Policy, App content, Data safety)

Google's rule: "collected" means data that leaves the phone. Data encrypted end to end, so that only the sender and the recipient can read it, does not need to be declared, and neither does data that stays on the phone. In Mesh Radar that covers group positions, chat, photos, the emergency card, names and Family Circle: relays and our server cannot read any of them. Only what leaves the phone readable is declared below. Transfers to service providers (Cloudflare, Google Play, PostHog, Sentry) and transfers the person starts themselves are not "sharing".

**Step 1, Data collection and security**

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | Yes |
| Is all of the user data collected by your app encrypted in transit? | Yes (HTTPS to our server, and Nearby Connections encrypts every link; Bluetooth broadcasts carry only group-encrypted packets) |
| Which methods of account creation does your app support? | My app does not allow users to create an account |
| Do you provide a way for users to request that their data is deleted? | Yes. In the app: Me, Privacy, Delete everything. Web: https://creaeza.com/mesh-radar-delete-data/ |
| Independent security review | No (not yet) |

**Step 2, Data types:** tick exactly these 10, nothing else.

| Category | Data type | Where it comes from |
| --- | --- | --- |
| Location | Approximate location | Public SOS sends a 150 m area to app users nearby |
| Location | Precise location | A crowd report carries the spot being reported |
| Personal info | User IDs | The app's public key, sent with purchases and with the free pilgrimage pass |
| Financial info | Purchase history | The Google Play purchase token, sent to issue the licence |
| Messages | Other in-app messages | Event channel posts and event community posts |
| App activity | App interactions | Optional analytics (off until the person turns it on) |
| App info and performance | Crash logs | Optional crash reports (off until turned on) |
| App info and performance | Diagnostics | Optional crash reports (off until turned on) |
| Device or other IDs | Device or other IDs | The random analytics and crash report ID (optional) |
| App activity | Other user-generated content | The city a person may add to an event community post |

**Step 3, Data usage and handling:** the same answers for every type unless the table says otherwise.

| Data type | Collected | Shared | Processed ephemerally | Required or optional | Purposes |
| --- | --- | --- | --- | --- | --- |
| Approximate location | Yes | No | No | Optional | App functionality |
| Precise location | Yes | No | No | Optional | App functionality |
| User IDs | Yes | No | No | Optional | App functionality, Fraud prevention, security and compliance |
| Purchase history | Yes | No | No | Optional | App functionality |
| Other in-app messages | Yes | No | No | Optional | App functionality |
| Other user-generated content | Yes | No | No | Optional | App functionality |
| App interactions | Yes | No | No | Optional | Analytics |
| Crash logs | Yes | No | No | Optional | Analytics |
| Diagnostics | Yes | No | No | Optional | Analytics |
| Device or other IDs | Yes | No | No | Optional | Analytics |

**Step 4:** check the store listing preview, then Save and Submit. If a feature changes what leaves the phone, update this form and the privacy policy together.

## 4b. Content rating (Policy, App content, Content rating)

1. Start, enter **creaeza7@gmail.com** (the rating body writes to this address).
2. Category: the one for utility, productivity, communication or other apps (not Game, not Social networking).
3. Answer:

| Topic | Answer | Why |
| --- | --- | --- |
| Violence, blood, fear or horror | No | Crowd alerts are short text warnings |
| Sexuality or nudity | No | |
| Profanity or crude humour | No | |
| Drugs, alcohol or tobacco | No | The emergency card's medicines field is the person's own medical info |
| Gambling or simulated gambling | No | |
| Users can interact or communicate with each other | Yes | Group chat and photos, the public event channel and event communities |
| Users can share content they create, including photos | Yes | Photos and messages in groups, posts in event communities |
| Shares the user's current location with other users | Yes | The radar and SOS share location with the group |
| Digital purchases | Yes | Event Pass, Family Plus, organiser plans |
| Unrestricted internet access or web browsing | No | |
| Promotes age-restricted products | No | |

4. Review the ratings on the summary page and Submit. Expect a low age rating with notices like "Users interact", "Shares location" and "In-app purchases". Redo the questionnaire if a feature changes these answers.

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

# Translation review notes

All 7 non-English UI files (`src/i18n/locales/*.json`) are machine-drafted and unverified (DEC-004). Native speakers review them before release, safety strings first (`src/i18n/safety-keys.ts`). `npm run check:release` fails until `src/i18n/status.json` marks a language verified.

Below are the drafters' open questions, by language. Strike each one when a reviewer settles it.

## Indonesian (id)

Terms used throughout: Event Pass = Pas Acara, Family Plus = Keluarga Plus, Family Circle = Lingkar Keluarga, Last-Crumb = Titik Terakhir, Relay Hero = Pahlawan Penerus Pesan, Sunlight theme = Sinar matahari, Check-ins = Lapor diri, Checkpoints = pos, Meeting points = Titik kumpul, Elder = Lansia, I'm OK = Saya aman.

- "pack" strings use "panduan acara" (event guide), because "paket" already means plans ("Lihat paket").
- `settings.themes.sunlight`: "Sinar matahari" may not fit the segmented control; "Matahari" or "Terik" are shorter.
- `plans.event_pass`: "Pas Acara" may read oddly; consider keeping "Event Pass".
- `badges.relayHero`: long; the name is the drafter's choice.
- `power.standby`: "Siaga penerus" sounds unnatural.
- `find.stale`: awkward with the "lost signal" value inserted (as in English).
- `events.crowdKinds.crush_risk`: check "Bahaya terhimpit" is the right crowd-crush term.
- `plans.organiserBody`: "signed crowd alerts" written as "peringatan kerumunan resmi" (official).
- `mesh.bleUnsupported`: "long Bluetooth beacons" read as long-range ("jarak jauh").
- `mesh.pill`, `native.status_text`: "lompatan" for hops is literal.
- `events.categories.pilgrimage`, `plans.firstPilgrimage`: "Perjalanan ibadah" so it covers Kumbh and Arbaeen too.
- `invite.quickShareSteps`, all `oem.*`: Play Store and phone menu labels must be checked against real Indonesian device screens, including "Tidak dibatasi" and "Tanpa batasan" in `oem.generic`.
- `onboarding.namePlaceholder`: example names changed to "Umi atau Budi".

## Malay (ms)

Terms used throughout: mesh = mesh, check-in = lapor diri, checkpoint = titik semak, meeting point = tempat pertemuan, Last-Crumb = Jejak Terakhir, Relay Hero = Wira Penyampai, Event Pass = Pas Acara, Family Circle = Lingkaran Keluarga, Sunlight theme = Matahari.

- All `oem.*`: settings menu names translated by the drafter; check against each phone's Malay screens.
- `invite.quickShareSteps`: "Urus apl dan peranti" must match the Play Store's Malay label; Malay Android may show "Gedung Play".
- `mesh.bleUnsupported`: "isyarat Bluetooth panjang" may be unclear.
- `power.standby`: "Penyampai siap sedia" is a little awkward.
- `plans.family_plus` (and `plans.locked`, `memories.locked`, `errors.needs_pass`): "Keluarga Plus"; may need to stay "Family Plus" to match the store product name.
- `events.categories.pilgrimage`, `plans.firstPilgrimage`: "Ziarah" is broad; Malaysian Muslims may expect "haji/umrah".
- `me.safetyReady`, `readiness.title`, `badges.safetyReady`: "Sedia Selamat" is a coined name.
- `onboarding.namePlaceholder`: example names changed to "Mak atau Amir".
- `find.uwbOn`, `errors.uwb_unsupported`: "ultra-wideband" kept in English.
- `sos.incomingWhere`: reads "50 m timur laut" without "ke"; `native.sos_where` has "ke".

## Urdu (ur)

Terms used throughout: Event Pass = ایونٹ پاس, Family Plus = فیملی پلس, Family Circle = خاندانی حلقہ, Last-Crumb = آخری نشان, Relay Hero = پیغام رساں ہیرو, Sunlight = دھوپ, Find mode = تلاش موڈ, Ultra-saver = انتہائی بچت, check-in = حاضری.

- `oem.*`, `invite.quickShareSteps`: phone and Play Store menu labels left in English; they match only when the phone itself is in English. Check the Urdu labels on real devices.
- `radar.calibrate`: "انگریزی کے 8 کی شکل" uses the Western digit 8 on purpose (the Urdu ۸ looks like a V and would show the wrong movement).
- `tabs.me`, `me.title`: میرا صفحہ ("my page"), because میں clashes with میں meaning "in".
- `mesh.pill_*`, `native.status_text`, `member.hops`: hops written as "فون دور تک" (up to N phones away).
- `power.standby`: اسٹینڈ بائی ریلے; "relay" is not an everyday word but the hint explains it.
- `events.schedule`: شیڈول اور رسومات; for Hajj, مناسک or ارکان may suit better.
- `events.crowdKinds.crush_risk`: بھگدڑ کا خطرہ (stampede), the everyday word, not exactly "crush".
- `onboarding.namePlaceholder`: example name changed to علی.
- `groups.inviteBody`, `onboarding.languageHint`: button and menu names appear inside sentences without quotes; check they read clearly.
- Eastern digits: Urdu now uses Extended Arabic-Indic digits (۰۱۲۳) in the app and in `settings.eastern_arabic`.

## Turkish (tr)

Terms used throughout: Event Pass = Etkinlik Pasosu, Family Plus = Aile Plus, Easy mode (Elder mode) = Kolay mod, check-in = durum bildirimi, memories = hatıra, moments = anı.

- `invite.quickShareSteps`, all `oem.*`: Play Store and phone menu labels ("Uygulamaları ve cihazı yönetin", "Kısıtlanmamış", Samsung "Uyuyan uygulamalar") are best guesses; check on devices.
- `me.elderMode`, `settings.elder`, `elder.exit`: "Kolay mod" chosen over "Yaşlı modu" as kinder; the role `member.roles.elder` stays "Yaşlı".
- `mesh.pill_*`, `native.status_text`: "atlama" for hops is technical.
- `events.schedule`: "ritüeller" may not be the best word.
- `mesh.bleUnsupported`: "long beacons" read as BLE extended advertising ("genişletilmiş").
- Fixed in source after this draft: the incoming SOS screen now shows `native.sos_kind_*` ("Needs help") instead of the sender's button label, and Hijri month names come from `events.hijriMonths`.

## Arabic (ar), Hindi (hi), Bengali (bn)

The drafters of these three files stopped before reporting their open questions, so there are no notes. Review the whole file, with the same focus as above: phone and Play Store menu labels in `oem.*` and `invite.quickShareSteps`, the crowd-crush term in `events.crowdKinds.crush_risk`, feature names, and every safety string. Arabic plural forms (zero, one, two, few, many, other) were drafted for every counted string.

## Hijri month names (all languages)

`events.hijriMonths` was drafted separately from the files above, using common spellings in each language. Check them with the rest.

## Event pack text (`packs/src`)

Pack text is drafted into each pack's own languages (`languages` in the pack file). Review it with the pack's facts (docs/event-packs.md).

Indonesian and Malay:
- Hajj camp terms use "kemah" (id) and "kem" (ms) to match `card.stay`; pilgrims from both countries often say "maktab".
- "Arafat" is written "Arafah", the usual spelling in both countries.
- "Day of Sacrifice" is "Hari Nahar (Hari Kurban)" (id) and "Hari Nahar (Hari Korban)" (ms).
- Indonesian uses "Jumrah Aqabah" and "ketiga jumrah"; Malay uses "jamrah".
- "The Ministry" is named in full ("Kementerian Haji dan Umrah Saudi" / "... Arab Saudi") so readers do not take it as their own government.
- Mosque gates use "Pintu" ("Pintu 79"), not the app's generic "Gerbang".
- "Mashaer metro" is "kereta Masyair" (id) and "tren Masyair" (ms); "mataf" carries a short gloss in umrah/dos[3].
- "Water, please" is "Minta air"; Malay "relief camp" is "Pusat pemindahan terdekat"; "power bank" kept as is.

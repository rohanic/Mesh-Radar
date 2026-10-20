# Mesh Radar

Mesh Radar keeps groups together and reachable when the network fails: in crowds, on trails and in blackouts. Phones talk to each other directly over Bluetooth and Wi-Fi and relay for each other, so a family can see where everyone is, message, and send an SOS with no signal and no internet.

The product source of truth is [docs/PRD.md](docs/PRD.md). Every approved change and clarification is in [docs/decisions.md](docs/decisions.md). Rules for coding agents are in [CLAUDE.md](CLAUDE.md).

## What is in this repository

| Path | What it is |
| --- | --- |
| `app/` | Expo Router screens (React Native, Android only). Screens are thin and call into `src/features`. |
| `src/core/engine` | Pure TypeScript logic: radar maths, freshness, find mode, floors, list view, tiers, Safety Ready score, badges, memories, Hijri dates. Unit tested. |
| `src/features`, `src/state`, `src/ui` | Feature modules, Zustand stores, and the Beacon design system. |
| `src/i18n` | 8 languages (English, Urdu, Arabic, Hindi, Bengali, Indonesian, Malay, Turkish). |
| `modules/mesh-engine/core` | The mesh in pure Kotlin: packet format, libsodium crypto, managed flooding, store and forward, and a 500-phone simulator. Runs on the JVM. |
| `modules/mesh-engine/android` | The Android side: foreground service, Nearby Connections, BLE beacons, location and sensors, Keystore, SQLite, notifications, UWB. |
| `packs/src` | The 12 launch event packs. |
| `config/emergency-numbers.json` | Offline emergency numbers for 10 countries, with sources. |
| `worker/` | Cloudflare Worker: Play purchase checks and licences, signed pack updates, Family Circle mailboxes, event communities. |
| `scripts/` | Repository checks and the pack pipeline. |

## Status

All the code and content is written. The JavaScript app, the Kotlin mesh core (with its simulator) and the Worker pass their checks and tests. What is left before a Play release:

1. **Verify safety content.** Emergency numbers ([docs/emergency-numbers.md](docs/emergency-numbers.md)), the 12 event packs ([docs/event-packs.md](docs/event-packs.md)) and all 7 translations ([docs/translation-review.md](docs/translation-review.md)) are drafts marked unverified. `npm run check:release` blocks a production build until each is verified.
2. **Decide two open questions** marked NEEDS ROHAN in [docs/decisions.md](docs/decisions.md): DEC-027 (separation alerts are paid) and DEC-029 (language picker without flags).
3. **Record voice clips** for the 7 quick replies in each language (DEC-032).
4. **Build on a laptop and test on phones** ([docs/build-android.md](docs/build-android.md)). The JavaScript app, the Kotlin mesh core and the Worker are checked in CI; the full Android build has not yet completed anywhere, so the first laptop build is also the first full compile of the native module.
5. **Field tests and device lab** from PRD section 12, an external security review of the protocol ([docs/security.md](docs/security.md)), and the Play Console steps in [docs/play-checklist.md](docs/play-checklist.md).

## Quick start

Requirements: Node 22, JDK 21, and Android Studio with SDK 37 for device builds. Step-by-step laptop instructions: [docs/build-android.md](docs/build-android.md).

```sh
npm ci
npm run typecheck && npm run lint && npm test
npm run core:test          # Kotlin mesh core and the 500-phone simulator
npx expo run:android       # dev build on a connected phone
```

Without the native module (for example in Expo Go or tests) the app runs on an in-memory fake engine, so screens can be developed without two phones.

Building on a laptop and making a release: [docs/build-android.md](docs/build-android.md). Worker, Play Console products and keys: [docs/setup.md](docs/setup.md).

## Commands

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Typecheck, lint, tests | `npm run typecheck`, `npm run lint`, `npm test` |
| Engine coverage | `npm run test:coverage` |
| Kotlin core and simulator | `npm run core:test` |
| Copy rules (no emojis, no em dashes) | `npm run check:copy` |
| Every language has every key | `npm run check:i18n` |
| No secrets in client code | `npm run check:secrets` |
| Event packs | `npm run packs:validate`, `npm run packs:build`, `npm run packs:publish` |
| Release gate | `npm run check:release` |
| Worker typecheck | `npm run worker:check` |

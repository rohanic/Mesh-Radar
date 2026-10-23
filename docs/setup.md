# Setup

How to run Mesh Radar locally, deploy the Worker, set up Play Console products and make a release build. Decisions referenced here are in [decisions.md](decisions.md).

## 1. Local development

Requirements: Node 22, JDK 21, Android Studio with SDK 37, a phone with Android 8.0 or later (two phones to test the mesh). The full step-by-step laptop guide, including release builds, is [build-android.md](build-android.md).

```sh
npm ci
npm run typecheck && npm run lint && npm test
npm run core:test             # Kotlin core and the 500-phone simulator (JDK 21; Gradle comes from the wrapper)
npx expo run:android          # builds the native module and installs a dev build
```

Copy `.env.example` to `.env` and fill in the public values (section 3). Everything with `EXPO_PUBLIC_` is bundled into the app, so never put a secret there.

The Kotlin core (`modules/mesh-engine/core`) is a plain JVM project. The Android build compiles the same sources into the Expo module (`modules/mesh-engine/android/build.gradle`).

## 2. Licence signing key

Licences, organiser certificates and pack updates are signed with one Ed25519 key (DEC-016, DEC-031). The private key lives only in the Worker; the public key is built into the app.

Generate a key pair once and keep the seed somewhere safe (a password manager):

```sh
node -e "const c=require('crypto');const k=c.generateKeyPairSync('ed25519');console.log('LICENCE_SIGNING_SEED='+k.privateKey.export({format:'der',type:'pkcs8'}).subarray(16).toString('hex'));console.log('EXPO_PUBLIC_LICENCE_PUBLIC_KEY='+k.publicKey.export({format:'der',type:'spki'}).subarray(12).toString('hex'))"
```

If the seed is lost, every licence issued so far stops verifying in new app builds, so back it up.

## 3. App configuration

| Variable | Where | Value |
| --- | --- | --- |
| `EXPO_PUBLIC_LICENCE_PUBLIC_KEY` | `.env`, EAS environment | 64 hex characters from step 2 |
| `EXPO_PUBLIC_API_BASE_URL` | `.env`, EAS environment | The Worker URL, for example `https://mesh-radar.<account>.workers.dev` |
| `EXPO_PUBLIC_SENTRY_DSN` | optional | Crash reports, sent only after the person opts in |
| `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` | optional | Analytics, sent only after the person opts in |
| `EAS_PROJECT_ID` | EAS | From `eas init` |

## 4. Cloudflare Worker

The Worker verifies purchases and signs licences, serves signed event pack updates, relays Family Circle packets and hosts event communities (DEC-038). Nothing in the safety path depends on it.

**Guided way.** One script does sections 2 to 4: it creates the KV namespace, deploys, generates the licence key pair, sets the three secrets (never replacing one that exists), checks the live Worker and writes the two public values into `.env`. It prints the licence seed and the admin token once for your password manager.

```sh
npm ci && (cd worker && npm ci)
npx wrangler login
npm run setup:worker -- --service-account /path/to/play-service-account.json
```

The service account flag can be left out and added on a later run. The manual steps below do the same thing.

```sh
npm ci                              # the Worker imports shared code (and zod) from the app
cd worker && npm ci
npx wrangler login
npx wrangler kv namespace create KV # paste the id into wrangler.toml
npx wrangler secret put LICENCE_SIGNING_SEED          # from step 2
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON   # from section 5, the whole JSON file
npx wrangler secret put ADMIN_TOKEN                   # a long random string, for pack uploads
npm run check
npx wrangler deploy
curl https://<worker-url>/v1/licence/public-key       # must print the public key from step 2
```

Routes:

| Route | Purpose |
| --- | --- |
| `GET /v1/health` | Liveness |
| `GET /v1/licence/public-key` | The public key the app must ship with |
| `POST /v1/licence` | Exchange a Play purchase for a licence |
| `POST /v1/licence/first-pilgrimage` | The free first-pilgrimage Event Pass (DEC-034) |
| `POST /v1/organiser/cert` | Organiser certificate for signed crowd alerts (DEC-035) |
| `GET /v1/packs/:id.json`, `GET /v1/packs/:id.sig` | Signed pack updates |
| `PUT /v1/admin/packs/:id` | Upload a pack (bearer `ADMIN_TOKEN`); the Worker signs it |
| `POST /v1/circle/sync` | Family Circle mailbox (DEC-026) |
| `GET/POST /v1/community/:eventId/posts`, `POST /v1/community/:eventId/report` | Event communities (DEC-036) |

## 5. Google Play Console

1. Create the app with package `com.rohanic.meshradar` (permanent after the first upload, DEC-001).
2. Create these products with exactly these IDs (`src/core/engine/tiers.ts`):
   - One-time: `event_pass_14d`, `organiser_50`, `organiser_100`, `organiser_250`, `organiser_500`.
   - Subscription: `family_plus_yearly` (one yearly base plan).
   - Set local prices per PRD section 10.
3. Purchase checks: in Google Cloud, create a service account, enable the Google Play Android Developer API, download a JSON key, and invite the service account's email in Play Console (Users and permissions) with permission to view financial data and manage orders. Store the JSON as the Worker secret `GOOGLE_SERVICE_ACCOUNT_JSON`.
4. Work through [play-checklist.md](play-checklist.md) before the first closed test.

## 6. Event packs

Sources are in `packs/src/<id>.json` and ship inside the app (F1). To change one:

```sh
npm run packs:validate
npm run packs:build                      # updates src/features/packs/bundled.json
MR_API_BASE_URL=<worker-url> MR_ADMIN_TOKEN=<token> npm run packs:publish   # optional: push to phones already installed
```

Raise `version` when you change a pack so phones replace their copy. Set `verified: true` only after a person has checked it against [event-packs.md](event-packs.md).

## 7. Release builds

```sh
npx eas-cli build --platform android --profile production
```

The production profile sets `MR_RELEASE_GATE=1`, so `npm run check:release` runs in the build (DEC-040) and fails it until:

- every emergency number in `config/emergency-numbers.json` is verified,
- every language in `src/i18n/status.json` is reviewed, with safety strings verified,
- every event pack is verified and the bundled copy is current,
- the licence public key and Worker URL are set,
- no decision in `decisions.md` is marked NEEDS ROHAN.

Run `npm run check:release` locally to see the current list. Then follow PRD section 12: internal track, a closed test with testers for 14 days, then a staged rollout.

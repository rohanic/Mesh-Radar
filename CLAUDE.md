# CLAUDE.md

Rules for any coding agent working on Mesh Radar. The product source of truth is /docs/PRD.md; every approved change and clarification is in /docs/decisions.md.

1. Read /docs/PRD.md, /docs/decisions.md and this file before any task.
2. Work in vertical slices that reference requirement IDs (A1, C4, E3 ...). State the plan, implement, test, and report against the acceptance criteria.
3. Engine logic first, with unit tests: Kotlin mesh core (`npm run core:test`) and pure TypeScript engines (`npm test`). Run typecheck, lint and tests before saying done.
4. Never invent facts, emergency numbers, sources, library APIs or package versions. Verify against current documentation or the package itself. When unsure, say so and ask.
5. Add no dependency without recording the reason in /docs/decisions.md. Pin exact versions.
6. Ask before deviating from the PRD. Record every approved change in decisions.md.
7. No secrets in the repo or the app bundle. Licence signing keys and store credentials stay in the Worker.
8. Offline is the default: nothing in the safety path (SOS, Last-Crumb, Find mode, emergency numbers, check-ins) may touch the network.
9. Never paywall anything that helps someone in danger (PRD section 10, rule 1).
10. UI copy: plain, calm, short. No emojis. No em dashes. Safety strings are flagged for professional translation.
11. Small commits that reference IDs. No unrelated refactors.
12. If a task touches privacy, safety or Play compliance, stop and flag it first.

## Commands

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests (TS engines, UI) | `npm test` |
| Engine coverage | `npm run test:coverage` |
| Kotlin mesh core + 500-phone simulator (JDK 21, Gradle wrapper) | `npm run core:test` |
| Copy rules (no emojis, no em dashes) | `npm run check:copy` |
| Every language has every key | `npm run check:i18n` |
| No secrets in client code | `npm run check:secrets` |
| Event packs: validate / build (under 2 MB, signed) | `npm run packs:validate` / `npm run packs:build` |
| Release gate (numbers and translations verified) | `npm run check:release` |
| Worker typecheck | `npm run worker:check` |
| Dev build on a device (see docs/build-android.md) | `npx expo run:android` |

## Layout

- `/app` Expo Router routes only. Screens are thin and call into `/src/features`.
- `/src/core/engine` pure TypeScript logic (radar maths, freshness, find mode, floors, scores, tiers). No React, no platform imports (lint enforced).
- `/src/state` Zustand stores; the engine bridge store subscribes to native events.
- `/src/ui` Beacon design system. Tokens in `/src/core/theme`, icons only through `/src/ui/icons`.
- `/src/i18n` 8 v1 languages. Safety strings are marked in `src/i18n/safety-keys.ts`.
- `/modules/mesh-engine` Expo module. `core/` is pure Kotlin (protocol, crypto, routing, simulator) built and tested on the JVM; `android/` is the foreground service, Nearby Connections, BLE, sensors, Keystore and SQLite.
- `/config` emergency numbers and tunables. `/packs` event pack sources.
- `/worker` Cloudflare Worker: purchase verification and licence signing, signed event packs, Family Circle relay, event communities.

# Play Console checklist

PRD section 9 is the source. Tick each item before the first closed test. Policy pages change, so read the current Play Console help for each declaration when you file it.

## Permissions and declarations

| Item | What to declare | Notes |
| --- | --- | --- |
| Foreground service, `connectedDevice` | Keeps the mesh connected to nearby phones with the screen off | Short demo video: start the mesh, lock the phone, a message still arrives |
| Foreground service, `location` | User-started location sharing with the group | Google lists user-initiated location sharing as an example use |
| `USE_FULL_SCREEN_INTENT` | Incoming SOS from a family member (DEC-024) | On Android 14+ the app checks `canUseFullScreenIntent()` and otherwise shows a high-priority notification |
| Location | Foreground only. Background location is blocked in `app.config.ts` | The mesh runs only while the person has started it |
| Nearby devices (`BLUETOOTH_*`, `NEARBY_WIFI_DEVICES`) | Finding and talking to nearby phones | |
| `ACCESS_NOTIFICATION_POLICY` | Optional: let SOS ring through Do Not Disturb | Asked after the first group |
| `SET_WALLPAPER` | The lost-child lock-screen card (E6), only when the guardian taps it | |
| `CAMERA` | Scanning group QR codes and taking an avatar photo | |

Not requested: `ACCESS_BACKGROUND_LOCATION`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, exact alarms, microphone, boot receiver.

## Data safety form

Draft answers, to be checked with [privacy-policy.md](privacy-policy.md) and reviewed before submission:

- **Location:** collected on the device and shared with group members end to end encrypted, phone to phone. With Family Circle on, the same encrypted packets pass through our server, which cannot read them. Declare conservatively: "Approximate and precise location, shared, encrypted in transit, required for core features".
- **Messages:** same as location.
- **Photos:** avatar and moment photos stay on the device or go phone to phone.
- **App activity and diagnostics:** only after the person opts in to analytics or crash reports. No location in either.
- **Purchase history:** Play purchase tokens go to our Worker to issue a licence.
- **No account, phone number or email.** Data can be deleted on the device at any time (Me, Settings, Delete everything).

## Store listing

- Say "helps your group stay connected". Never "guarantees rescue" or "replaces emergency services" (PRD section 9).
- The listing and in-app text say it is not a replacement for emergency services.
- Screenshots in at least English, Urdu, Arabic, Hindi and Bengali.
- Privacy policy URL: publish [privacy-policy.md](privacy-policy.md) after legal review, in every supported language.

## Testing and release

- [ ] Target API level is the one Play currently requires (check when building).
- [ ] Content rating questionnaire done; target audience 13+ (children appear only as members managed by a guardian).
- [ ] Closed test with the required number of testers for 14 days (recruit in week 6, PRD section 12).
- [ ] `npm run check:release` passes in the production build (DEC-040).
- [ ] Staged rollout: 10 percent, then 50 percent, then 100 percent.

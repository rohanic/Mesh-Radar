# Build and run on your laptop

Step by step, from a fresh laptop to Mesh Radar running on two phones, and then a release build for Google Play. Works on Windows, macOS and Linux. Worker and Play Console setup are in [setup.md](setup.md).

## 1. Install the tools (once)

| Tool | Version | Notes |
| --- | --- | --- |
| Git | any recent | Windows: during install, allow long paths |
| Node.js | 22 LTS | `node -v` should print v22 |
| JDK | 21 (Temurin or the JDK bundled with Android Studio) | Set `JAVA_HOME` to it |
| Android Studio | latest | Used for the SDK, NDK and the emulator tools |

In Android Studio, open **Settings, Languages and Frameworks, Android SDK**:

- **SDK Platforms:** Android API 37.
- **SDK Tools:** Android SDK Build-Tools 37, NDK (Side by side) 27.1.12297006, CMake 3.22.1, Android SDK Platform-Tools.

Set the environment variables (restart the terminal afterwards):

- macOS or Linux, in `~/.zshrc` or `~/.bashrc`:
  ```sh
  export ANDROID_HOME="$HOME/Library/Android/sdk"     # Linux: $HOME/Android/Sdk
  export PATH="$ANDROID_HOME/platform-tools:$PATH"
  ```
- Windows: add `ANDROID_HOME` = `C:\Users\<you>\AppData\Local\Android\Sdk`, and add `%ANDROID_HOME%\platform-tools` to `Path`.

Windows only: React Native's native build has very long file paths. Clone into a short folder such as `C:\dev\mr`, and run once in an administrator terminal:

```sh
git config --system core.longpaths true
```

## 2. Get the code

```sh
git clone https://github.com/rohanic/Mesh-Radar.git mr
cd mr
git checkout claude/brave-wright-oxgy46
npm ci
```

Copy `.env.example` to `.env`. For a first local run you can leave it empty: purchases, pack updates and Family Circle need the Worker, but everything offline (the mesh, radar, chat, SOS) works without it.

## 3. Check the code before building

```sh
npm run typecheck
npm run lint
npm test
npm run core:test      # Kotlin mesh core and the 500-phone simulator (downloads Gradle the first time)
```

All four should pass. `core:test` prints the simulator results in `modules/mesh-engine/core/build/simulator-report.txt`.

## 4. Run on a phone (debug build)

The mesh needs real phones (emulators have no Bluetooth). Use Android 8.0 or later; two phones to see each other.

1. On each phone: **Settings, About phone**, tap **Build number** 7 times, then in **Developer options** turn on **USB debugging**.
2. Connect a phone by USB and accept the prompt on the phone. `adb devices` should list it.
3. Build and install:
   ```sh
   npx expo run:android
   ```
   The first build takes 10 to 30 minutes (it compiles native code). Later builds are much faster. The command starts Metro (the JavaScript server) and opens the app.
4. For the second phone, connect it and run `npx expo run:android --device`, then pick it from the list.

Faster debug builds: most phones are 64-bit ARM, so build only that architecture:

```sh
npx expo prebuild --platform android
cd android
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a     # Windows: gradlew.bat
adb install app/build/outputs/apk/debug/app-debug.apk
cd ..
npx expo start --dev-client
```

### A first test with two phones

1. Phone A: pick a language, make a profile, allow the permissions, create a group.
2. Phone B: same, then **Join group** and scan phone A's QR code.
3. Both: tap **Start mesh**. Each phone should appear on the other's radar within a minute.
4. Turn on airplane mode on both, then turn Bluetooth and Wi-Fi back on. Send a quick reply and a message: they should still arrive.
5. Hold the SOS button for 3 seconds on phone A: phone B should alarm and show the direction.
6. Walk apart and back together to try Find mode.

## 5. Release build for Google Play

Before any release build, check the release gate. It lists what people still need to verify (numbers, translations, packs, open decisions):

```sh
npm run check:release
```

### Option A: EAS (recommended)

EAS keeps your upload key safe and runs the release gate automatically (DEC-040).

```sh
npm install -g eas-cli
eas login
eas init                                   # once; links the project
eas build --platform android --profile production          # builds in Expo's cloud
eas build --platform android --profile production --local  # or builds on this laptop
```

Set the public values (`EXPO_PUBLIC_LICENCE_PUBLIC_KEY`, `EXPO_PUBLIC_API_BASE_URL`) in the EAS project environment for `production`, or in `.env` for a local build. The result is an `.aab` file to upload in Play Console.

### Option B: Gradle on this laptop

1. Create an upload key once and keep it, and its passwords, safe and out of the repo:
   ```sh
   keytool -genkeypair -v -storetype PKCS12 -keystore mesh-radar-upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Put the paths and passwords in your user Gradle file (`~/.gradle/gradle.properties`, never in the project):
   ```properties
   MR_UPLOAD_STORE_FILE=/full/path/to/mesh-radar-upload.keystore
   MR_UPLOAD_KEY_ALIAS=upload
   MR_UPLOAD_STORE_PASSWORD=...
   MR_UPLOAD_KEY_PASSWORD=...
   ```
3. Generate the native project and add a release signing config to `android/app/build.gradle` (inside `android { signingConfigs { ... } }`, and set `buildTypes.release.signingConfig signingConfigs.release`):
   ```groovy
   release {
       storeFile file(MR_UPLOAD_STORE_FILE)
       storePassword MR_UPLOAD_STORE_PASSWORD
       keyAlias MR_UPLOAD_KEY_ALIAS
       keyPassword MR_UPLOAD_KEY_PASSWORD
   }
   ```
   `npx expo prebuild --clean` regenerates `android/` and removes this edit, so redo it after a clean prebuild.
4. Build:
   ```sh
   npx expo prebuild --platform android
   cd android && ./gradlew bundleRelease
   ```
   The bundle is in `android/app/build/outputs/bundle/release/app-release.aab`.

Then follow [play-checklist.md](play-checklist.md): internal track, a closed test for 14 days, staged rollout.

## 6. If something goes wrong

| Problem | Fix |
| --- | --- |
| `SDK location not found` | Set `ANDROID_HOME`, or create `android/local.properties` with `sdk.dir=/path/to/Android/sdk` |
| Build stops with "out of memory" or the laptop freezes | In `android/gradle.properties` set `org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g`, close other apps, add `--max-workers=2` and `-PreactNativeArchitectures=arm64-v8a` |
| `requires ... compile against version 37` | The SDK Platform for API 37 is missing; install it in Android Studio, then `npx expo prebuild --clean` |
| `incompatible version of Kotlin ... metadata` for play-services-nearby | Keep `play-services-nearby` at 19.3.0 in `modules/mesh-engine/android/build.gradle` (DEC-023) |
| NDK or CMake not found | Install NDK 27.1.12297006 and CMake 3.22.1 in Android Studio's SDK Tools |
| Windows: `Filename longer than 260 characters` | Move the project to a short path like `C:\dev\mr` and enable long paths (section 1) |
| The app opens but the mesh never starts | You are in Expo Go, which has no native module. Use the dev build from `npx expo run:android` |
| Phones do not see each other | Bluetooth, Wi-Fi and Location must be on (Android 13+ may also ask for Nearby devices). See the mesh health screen in the app |
| A compile error inside `modules/mesh-engine/android` | That code has not yet been compiled against the full Android SDK. Copy the error lines (they start with `e:` and name a `.kt` file and line) and share them so they can be fixed |

To run the full Android build on GitHub instead, open the repository's **Actions** tab, choose **CI**, and **Run workflow**.

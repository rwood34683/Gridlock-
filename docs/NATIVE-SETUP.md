# Native projects

The existing Android and CocoaPods iOS projects wrap the complete `web/` app. Both use Capacitor **8.5.2**, with version 8 App, Preferences, Share, StatusBar and Filesystem plugins, plus Capgo Speech Recognition **8.2.0**. Project settings, GRIDLOCK assets, class links and release signing configuration have been preserved.

## iOS

Use [XCODE.md](XCODE.md) for Mac setup and remaining device checks. Copy the entire project to a Mac and run:

```sh
bash OPEN-IN-XCODE.command
```

The preflight requires Node 22+, CocoaPods, Xcode 26+, and an iOS 26+ simulator SDK. Dependencies are installed only after the checks pass. Setup opens `ios/App/App.xcworkspace`; it never configures a signing identity.

```sh
npm run ios:preflight       # read-only toolchain checks
npm run ios:setup           # npm ci, sync, pods, source checks, open workspace
npm run build:ios:simulator # unsigned simulator compilation after setup
```

All project/target deployment settings are iOS 15.0. The scene lifecycle uses the installed Capacitor 8.5 template. Preferences access remains declared as `CA92.1`; native JSON export adds Filesystem's `C617.1` timestamp declaration. Both entries are in the privacy manifest registered with the App target.

## Android

One command says what this machine is missing, all of it at once, with the fix
for each — it changes nothing and downloads nothing:

```sh
npm run android:preflight
```

Install Android Studio Otter 2025.2.1 or newer, JDK 21 and Android SDK platform 36. The included wrapper uses Gradle 8.14.3 and Android Gradle Plugin 8.13.0. These versions and SDK settings follow the [Capacitor 8 migration guide](https://capacitorjs.com/docs/updating/8-0).

```sh
npm ci
npm run android:setup
npm run build:android:debug
```

Android now targets SDK 36 with minimum SDK 24. SystemBars provides safe-area CSS values for modern edge-to-edge displays. The debug APK goes under `android/app/build/outputs/apk/debug/`.

For release builds, copy `android/keystore.properties.example` to `android/keystore.properties` and provide your upload keystore. Relative paths start in `android/`; use forward slashes on Windows.

```sh
npm run build:android
npm run bundle:android
```

Release signing is required. Credentials and keystores are git-ignored. No SDK compilation or signed release build was performed in this Windows delivery.

## Files, links and updates

Voice scouting requests microphone/speech permission only when Start is tapped. iOS includes both usage descriptions; Android declares microphone permission, an optional microphone feature, and the speech-recognition service query. The adapter stops when the app is backgrounded. Speech may use the device's speech service and an internet connection; GRIDLOCK does not record or retain audio. Native callbacks commit only finalized results; partial browser transcripts are previews. The native adapter uses the [Capgo plugin's final-result promise](https://github.com/Cap-go/capacitor-speech-recognition) with `partialResults: false` and waits for native teardown before starting the next utterance. It does not use the plugin's experimental continuous-PTT mode.

`npm ci` applies a small, version-checked Android dependency source patch to exclude `UNSTABLE_TEXT` from finalized results. See [the dependency source notice](SPEECH-PLUGIN-NOTICE.md) for the exact change and source-license details. Native synchronization reapplies the patch if dependencies were installed with scripts disabled.

`npm run sync` copies all current web files and updates native plugin references. `npm run native:check` parses the Xcode project and plists, verifies plugin versions, checks source/resource registrations, and compares the bundled app against `web/`. These checks do not replace compilation.

Native JSON exports are written to `CACHE/gridlock-exports/` and handed to the system through `Share.files`. Android's FileProvider exposes only that cache subfolder. Browser downloads remain separate. Preferences continues to mirror season and account data to app storage.

The `gridlock://` class scheme is registered on both platforms. Android HTTPS app links are added only after you set `npm run contact -- --domain your-domain.example`. Configure the release certificate with `--sha256` and host the generated association file before relying on verified links. Other release values are independent `--email`, `--play`, and `--appstore` settings.

`npm run native:setup` generates a missing native folder using the existing CocoaPods approach for iOS. Run `npm run icons` if regenerating a folder. Preserve any custom native settings before removing a project.

## Web and CI

`npm run build` produces the static website, installable app and standalone HTML under `dist/`; `npm run preview` serves that output. Native apps package `web/` directly. The web workflow runs browser tests; the macOS workflow builds an unsigned simulator app. Neither workflow has been dispatched in this delivery, and no store submission or deployment has been performed.

# Open GRIDLOCK in Xcode

Copy the **entire project folder** to your Mac, including `web/`, `scripts/`, `package.json`, `package-lock.json`, and `ios/`. The archive includes the Xcode project and web app. CocoaPods dependencies are installed on the Mac.

## First setup

Install these tools first:

- Xcode **26 or newer**, with the iOS 26 or newer platform and simulator components. Open Xcode once to finish setup and accept its license.
- Node.js **22 or newer**, including npm.
- CocoaPods (`pod --version` should work in Terminal).

These requirements follow the [Capacitor 8 migration guide](https://capacitorjs.com/docs/updating/8-0).

Double-click **OPEN-IN-XCODE.command**, or run this from the project folder in Terminal:

```sh
bash OPEN-IN-XCODE.command
```

The launcher checks the installed tools before changing or downloading anything. When those checks pass, it runs `npm ci`, syncs the current app and plugins, installs pods, verifies source packaging, and opens **ios/App/App.xcworkspace**. It never changes your development team or signing credentials.

Choose an iPhone simulator in Xcode and press Run. Open the `.xcworkspace`, which includes the pods. Opening only the `.xcodeproj` omits those dependencies.

## After editing the app

```sh
npm run sync
npm run open:ios
```

To verify a simulator compilation from Terminal after setup:

```sh
npm run build:ios:simulator
```

This uses the shared App scheme and builds with signing disabled. Its output is under `ios/DerivedData/Build/Products/Debug-iphonesimulator/`. It does not create an App Store archive.

## What is prepared

The existing CocoaPods project has been upgraded to Capacitor **8.5.2**, with an iOS **15.0** deployment target. SceneDelegate is registered in the target, creates the app window, and forwards class links through Capacitor's scene proxy, following its [scene migration guide](https://capacitorjs.com/docs/updating/8-5). The app retains bundle identifier `com.upra.gridlock.coach`.

Save a copy now writes a UTF-8 JSON file into the app cache and presents the native file share sheet. Choose Save to Files or another destination there. The sheet can be cancelled without changing your season. Preferences still maintains its separate durable copy. The privacy manifest declares UserDefaults (`CA92.1`) and FileTimestamp (`C617.1`) access, as specified by the installed [Preferences](https://capacitorjs.com/docs/apis/preferences) and [Filesystem](https://capacitorjs.com/docs/apis/filesystem) plugins.

The macOS workflow `.github/workflows/ios.yml` compiles an unsigned simulator app when run in GitHub Actions. It has not been executed as part of this Windows delivery.

## Remaining Mac verification

Source structure, plugin registration, JavaScript and web behavior were checked on Windows. An Xcode compilation and device run still need the Mac toolchain. Before distributing a device build, select your team under App → Signing & Capabilities, then verify:

1. Launch, rotate, background and reopen the app; saved season data remains intact.
2. Open `gridlock://class/GL-7K2M` both with the app running and after closing it.
3. Save a copy to Files, cancel a share, and load the saved JSON again.
4. Use “How did they get there?” on a field and confirm the controls remain above the system bars.
5. Start voice scouting, grant microphone and speech permissions, speak one observation, then stop. Verify cancellation, backgrounding and denied permission leave the microphone off. Confirm finalized observations appear once and can be corrected. Speech may require the device's speech service and internet connection; no audio is retained by GRIDLOCK.

For distribution, set an appropriate build number and use Product → Archive with a device destination. Signing, provisioning, App Store records and publication remain account-specific steps.

## If setup stops

- **Xcode command-line tools only:** select the full Xcode installation in Xcode → Settings → Locations → Command Line Tools.
- **Platform or first-launch setup missing:** finish Xcode's component installation, then rerun the launcher.
- **`pod` missing:** install CocoaPods, open a new Terminal, confirm `pod --version`, and retry.
- **Pod download failure:** restore network access and rerun setup. Filesystem also resolves its native `IONFilesystemLib` dependency through CocoaPods.
- **A source change is absent on the phone:** run `npm run sync` before rebuilding.

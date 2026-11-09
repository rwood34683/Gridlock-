# Open Gridlock in Xcode

Copy the **entire project folder** to your Mac, including `web/`, `scripts/`, `package.json`, `package-lock.json`, and `ios/`. The archive includes the Xcode project and web app. CocoaPods dependencies are installed on the Mac.

## First setup

Install these tools first:

- Xcode **26 or newer**, with the iOS 26 or newer platform and simulator components. Open Xcode once to finish setup and accept its license.
- Node.js **22 or newer**, including npm.
- CocoaPods (`pod --version` should work in Terminal).

These requirements follow the [Capacitor 8 migration guide](https://capacitorjs.com/docs/updating/8-0).

Once the project is on the Mac, one command tells you everything that is
missing, all of it at once, with the command that fixes each:

```sh
npm run ios:preflight
```

It changes nothing and downloads nothing — it only looks. A Mac carrying last
year's tools gets back something like:

```
Gridlock cannot open Xcode yet. 2 things need fixing:

  1. Node 22 or newer
     now: you have 20.18.1
     fix: brew install node

  2. CocoaPods
     now: not installed
     fix: brew install cocoapods
```

Before the project is copied across, these are the same three readings by hand:

```sh
node -v          # must be 22 or newer
pod --version    # must print a version
xcodebuild -version
```

**Node 20 is not enough.** `package.json` sets `engines.node >= 22`, the
Capacitor 8 CLI requires the same, and `scripts/xcode.js` refuses to go further
— a Mac carrying the Node 20 that was current last year fails here, and the
message says only "Install Node.js 22 or newer".

Homebrew covers the first two together:

```sh
brew install node cocoapods
```

If `brew` itself is missing, install it from [brew.sh](https://brew.sh). Its
installer asks for your Mac login password; Terminal shows nothing at all as
you type it, which is normal — type it blind, or paste it, and press Return.

## Export compliance

`Info.plist` declares `ITSAppUsesNonExemptEncryption` as `false`, so App Store
Connect stops asking on every upload. That answer is accurate for this app and
worth understanding rather than trusting. The app's own cryptography is
SHA-256 hashing of the staff password with a random salt, on the device, and
hashing is not covered encryption. A store build is the cloud build, which
signs in and syncs with the account server over HTTPS. HTTPS through the
system's web view is encryption within Apple's operating system, which is
exempt. If the app ever implements encryption of its own, this key has to be
revisited.

## Privacy manifest and label

`PrivacyInfo.xcprivacy` is written by `scripts/configure-native.js`. A brand
with an account server (the `cloud` block in its contact file) declares three
collected data types, each linked to the coach, none used for tracking, and
all for app functionality:

- the email address;
- the account's user ID;
- other user content: the season, only when the coach turns on League sync.

A brand without an account server declares none. App Store Connect's privacy
label is filled in by hand and must say the same. Google Play's Data safety
form needs the same three, plus encryption in transit and the account and
upload deletion paths.

Double-click **OPEN-IN-XCODE.command**, or run this from the project folder in Terminal:

```sh
bash OPEN-IN-XCODE.command
```

The launcher checks the installed tools before changing or downloading anything. When those checks pass, it runs `npm ci`, syncs the current app and plugins, installs pods, verifies source packaging, and opens **ios/App/App.xcworkspace**. It never changes your development team or signing credentials.

Choose an iPhone simulator in Xcode and press Run. Open the `.xcworkspace`, which includes the pods. Opening only the `.xcodeproj` omits those dependencies.

## Real accounts on the iPhone (the cloud build)

`OPEN-IN-XCODE.command` packages the offline app. Its sign-in is a lock kept on
that phone, so your gridlockpb.com account does not exist there. To run the
iPhone app against the real account server, the one app.gridlockpb.com uses,
use the cloud launcher instead.

1. The project's two **public** values come from `site/contact.json`
   (`cloud`), so nothing is needed here. To point at another project instead,
   create a file named `.env.cloud` in the project folder
   (Supabase › Project Settings › API Keys):

   ```text
   GRINDX_SUPABASE_URL=https://<your project>.supabase.co
   GRINDX_SUPABASE_ANON_KEY=sb_publishable_...
   ```

   Never put the secret or service_role key here; the build refuses one.
   `.env.cloud` is git-ignored.
2. In Supabase › Authentication › URL Configuration › Redirect URLs, add
   `gridlock://auth/callback`. Without it, confirm-email and password-reset
   links cannot come back to the app.
3. Double-click **OPEN-IN-XCODE-CLOUD.command**, or run
   `bash OPEN-IN-XCODE-CLOUD.command` (same as `npm run ios:cloud`).

It runs the same tool checks, then `npm ci`, builds the cloud app into
`dist/cloud-ios/` with the callback `gridlock://auth/callback`, syncs that into
`ios/`, checks the shell holds the adapter and the callback and no secret, and
opens the workspace. `capacitor.config.json` is pointed at the cloud build only
for the sync and put back afterwards. While the shell holds the cloud build,
`git status` shows `ios/App/App/public/index.html` and `sw.js` as changed; that
is expected. `npm run sync` (or the ordinary launcher) puts the offline build
back; run it before `git pull`, or the pull refuses to overwrite those two
files. If a run is interrupted, the launcher still puts `capacitor.config.json`
back; should it ever be left pointing anywhere but `web`, `npm run sync`
refuses and says to run `git checkout -- capacitor.config.json`. Accounts made in the offline build stay on that simulator and are not
moved to the server.

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
5. Start voice scouting, grant microphone and speech permissions, speak one observation, then stop. Verify cancellation, backgrounding and denied permission leave the microphone off. Confirm finalized observations appear once and can be corrected. Speech may require the device's speech service and internet connection; no audio is retained by Gridlock.

For distribution, run `npm run ios:cloud` first, set an appropriate build number and use Product → Archive with a device destination. The App target's first build step refuses to archive the offline build, so a store build always signs in with gridlockpb.com accounts; see [NATIVE-SIGN-IN.md](NATIVE-SIGN-IN.md), which also covers offering passwords saved on the website. Signing, provisioning, App Store records and publication remain account-specific steps.

## If setup stops

- **Xcode command-line tools only:** select the full Xcode installation in Xcode → Settings → Locations → Command Line Tools.
- **Platform or first-launch setup missing:** finish Xcode's component installation, then rerun the launcher.
- **`pod` missing:** install CocoaPods, open a new Terminal, confirm `pod --version`, and retry.
- **Pod download failure:** restore network access and rerun setup. Filesystem also resolves its native `IONFilesystemLib` dependency through CocoaPods.
- **A source change is absent on the phone:** run `npm run sync` before rebuilding.

# Getting GRIDLOCK Coach into Xcode

The `ios/` folder in this repo is a real Xcode project, not a placeholder. What it
is *not* is self-contained: two things it needs are git-ignored on purpose, so a
fresh clone opens to an app with no content in it. Generate them first and the
rest is ordinary.

- `ios/App/App/public/` — the web app. `npx cap sync` copies `web/` into it.
- `ios/App/Pods/` — CocoaPods dependencies. `pod install` fetches them.

Neither belongs in git: the first is a build product of `web/index.html`, the
second is a dependency tree. Both are one command.

## What you need on the Mac

| | |
|---|---|
| macOS | Recent enough for the Xcode below |
| Xcode | 16 or newer — the App Store rejects builds made with older SDKs |
| Node | 20 or newer |
| CocoaPods | `sudo gem install cocoapods`, or `brew install cocoapods` |

Apple Developer Program membership ($99/yr) is needed to upload, but **not** to
build and run on your own device or the simulator. You can see the app working
before you pay anything.

## First run

```bash
git clone <this repo>
cd Gridlock-
npm run ios:setup
```

That installs the dependencies, copies `web/` into the app, fetches the pods and
opens the right file in Xcode. If you would rather do it by hand:

```bash
npm install                 # pulls Capacitor and the test tooling
npx cap sync ios            # copies web/ into the app and wires the plugins
cd ios/App && pod install   # fetches Capacitor's pods
```

Then open **`ios/App/App.xcworkspace`**.

> Open the **`.xcworkspace`**, never `App.xcodeproj`. With CocoaPods the project
> alone does not know about its dependencies and the build fails with missing
> Capacitor headers. This is the single most common way to lose an hour here.

Or let Capacitor open it for you, which picks the right one:

```bash
npm run open:ios
```

## Signing

Select the **App** target → **Signing & Capabilities**.

1. Tick **Automatically manage signing**.
2. Pick your Team. With a paid account that is your developer team; without one,
   your personal Apple ID works for device builds.
3. The bundle identifier is already `com.upra.gridlock.coach`.

Unlike Android there is no keystore to make or protect. Apple issues and holds
the certificates; Xcode fetches them. Nothing to lose.

## Run it

Pick a simulator — iPhone 16 or similar — and press Run. You should get the promo
gate, then the app. If the screen is white, `npx cap sync ios` was not run: the
web assets are missing.

Run on a real phone at least once before submitting. The simulator does not tell
you the truth about touch targets, the safe area under a notch, or how the field
reads outdoors.

## After you change `web/index.html`

```bash
npx cap sync ios     # or: npm run sync   (does iOS and Android)
```

Then build again. Xcode does not watch `web/`, and a stale `public/` folder is
the reason a change you know you made is not on screen.

## Uploading to App Store Connect

1. Create the app record at appstoreconnect.apple.com. Bundle ID
   `com.upra.gridlock.coach`, name **GRIDLOCK Coach**.
2. In Xcode set the destination to **Any iOS Device (arm64)** — you cannot archive
   against a simulator.
3. **Product → Archive**, then **Distribute App → App Store Connect**.
4. Fill the listing from `docs/STORE-LISTING.md`. Every field is pre-written
   inside its character limit. Screenshots are in `store/app-store/`, already at
   the exact sizes each device class needs.
5. Once App Store Connect assigns the app an ID, put it in the landing page:

   ```bash
   npm run contact -- --appstore 6501234567
   ```

## Already handled

- **Privacy manifest.** `ios/App/App/PrivacyInfo.xcprivacy` is written and
  registered in the project — no tracking, no collected data, one required-reason
  API (`UserDefaults`, reason `CA92.1`) because the app stores everything locally.
  Apple rejects a submission without this.
- **Version.** `MARKETING_VERSION` 1.0.0, `CURRENT_PROJECT_VERSION` 1. Bump the
  build number on every upload; App Store Connect refuses a repeat.
- **Deep link.** `gridlock://class/<code>` is registered in `Info.plist`.
- **Deployment target.** iOS 14, which covers every phone from 2015 on.

## When it goes wrong

**White screen on launch** — `public/` is empty. Run `npx cap sync ios`.

**"Module 'Capacitor' not found"** — you opened `App.xcodeproj`. Close it and open
`App.xcworkspace`.

**`pod install` fails on Apple silicon** — `sudo gem install ffi` first, or install
CocoaPods through Homebrew instead of the system Ruby.

**Signing errors after cloning to a second Mac** — clear the derived data
(`~/Library/Developer/Xcode/DerivedData`) and let Xcode re-fetch the profiles.

**A change to the app is not showing** — `npx cap sync ios`, every time.

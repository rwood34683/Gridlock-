# Getting GRIDLOCK Coach into Xcode

The `ios/` folder is a real Xcode project and the app itself is committed with
it, so what you open is the actual product, not a shell.

One thing is still missing from a fresh clone: `ios/App/Pods/`, the CocoaPods
dependency tree. Capacitor cannot build without it and it does not belong in git.
That is the one command below.

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
cd ios/App && pod install
open App.xcworkspace
```

Then press Run. That is the whole thing.

`npm run ios:setup` does the same from a clean clone if you also want the test
tooling and a fresh sync — it installs, syncs, pods and opens Xcode for you.

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

## The first run on a real phone

Everything in the test suites is a headless browser at phone-sized viewports.
That is honest about geometry and silent about the list below, every item of
which is a real risk in this app and none of which can be checked from here.
Go through it once, on the phone, in daylight.

- [ ] **Sunlight.** Take it outside. The whole design is a black field with red
      and blue bunkers; if it washes out on a bright sideline the product does
      not work, and nothing else on this list matters.
- [ ] **Scroll position holds.** On Scout, scroll down to a player and tap a
      threat star. The screen should stay where it is. This was broken until
      recently — every tap rebuilds the screen — so it is worth confirming that
      the fix survives WKWebView.
- [ ] **Rubber-banding.** Drag past the top and bottom of a long tab. The page
      should scroll; the whole web view should not bounce as one sheet.
      `contentInset: never` and `scrollEnabled: false` in `capacitor.config.json`
      are what stop that.
- [ ] **The keyboard.** Open Scout → Notes and type. Check the box is not hidden
      behind the keyboard, and that you can dismiss it and still reach the tab bar.
- [ ] **Safe areas.** Under a Dynamic Island, the header must clear it. At the
      bottom, the tab bar must sit above the home indicator, and a swipe up must
      not fire a tab.
- [ ] **Rotate it.** Playbook should go to two columns, call left, field right.
      Rotate back. Then rotate on Scout and Tally too.
- [ ] **Kill and reopen.** Log a few outs on Tally, swipe the app away, reopen.
      Everything should still be there. This is localStorage surviving an app
      kill, which is not the same as surviving a page reload.
- [ ] **Gloves on.** Every tap target is at least 44px by measurement. That is
      the floor, not proof — try it the way you would use it between points.
- [ ] **The break animation.** Play the break a few times. It runs at 57fps in a
      throttled desktop browser; a phone is a different machine.

Anything that misbehaves, tell me what you saw and on which screen — that is
worth more than any test I can write in here.

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

**White screen on launch** — the copy of the app in the shell went missing. Run
`npm run sync`. `npm run store:check` also tells you when it has drifted from
`web/index.html`.

**"Module 'Capacitor' not found"** — you opened `App.xcodeproj`. Close it and open
`App.xcworkspace`.

**`pod install` fails on Apple silicon** — `sudo gem install ffi` first, or install
CocoaPods through Homebrew instead of the system Ruby.

**Signing errors after cloning to a second Mac** — clear the derived data
(`~/Library/Developer/Xcode/DerivedData`) and let Xcode re-fetch the profiles.

**A change to the app is not showing** — `npx cap sync ios`, every time.

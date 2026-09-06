# GRIDLOCK

**GRIDLOCK System · powered by UPRA · Coach Edition**

Call the break. Direct the five. Own the point.

A sideline tool for paintball coaches and league staff — pick the event, call the
break, direct all five players, read the other pit, run a clinic, and blast the
league. One codebase ships to the App Store and Google Play.

## Layout

| Path | What it is |
|---|---|
| `web/` | **The app.** One self-contained page. This is the source of truth for behaviour and UI. |
| `ios/` | Capacitor Xcode project. Generated — edit `web/`, then `npm run sync`. |
| `android/` | Capacitor Gradle project. Generated — edit `web/`, then `npm run sync`. |
| `site/` | The landing page. Static, no build step. See `site/README.md`. |
| `brand/` | Icon and splash SVGs plus the generator that renders every store size. |
| `layouts/` | The 2026 layout pack — catalog, schema, one JSON per event, and the official stills that are the ground truth. |
| `tools/` | Layout digitizer and emitter. See `docs/LAYOUTS.md`. |
| `docs/` | Product spec, the Overskill import prompt, scaling notes and the layout pipeline. |
| `ios-native/` | The original SwiftUI snapshot, kept for the native track. Not built. |
| `scripts/` | Dev server, screenshot capture, artifact build. |

`CLAUDE.md` holds the product rules — palette, copy tone, roles, and the hard
constraints. Read it before changing anything user-facing.

## Run it

```bash
npm install
npm run serve          # http://localhost:5173
```

That is the whole development loop. `web/index.html` has no build step and no
dependencies; `web/native.js` bridges to the device and no-ops in a browser.

## Build for the stores

```bash
npm run sync           # copy web/ into both native projects
npm run open:ios       # Xcode  — needs macOS
npm run open:android   # Android Studio
```

### iOS

Set your team under **Signing & Capabilities**, then Product → Archive.

- Bundle ID `com.upra.gridlock.coach`
- Deployment target iOS 14
- `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` live in the Xcode build
  settings; the app icon and splash come from `Assets.xcassets`.
- CocoaPods must be installed — `npx cap sync ios` runs `pod install`.

### Android

```bash
cp android/keystore.properties.example android/keystore.properties
# fill it in, then:
npm run bundle:android          # → android/app/build/outputs/bundle/release/
```

Create the upload keystore once and keep it safe — Play ties the app to it
permanently:

```bash
keytool -genkey -v -keystore gridlock-release.jks -keyalg RSA \
        -keysize 2048 -validity 10000 -alias gridlock
```

`keystore.properties` and `*.jks` are git-ignored. Release builds are unsigned
until that file exists, so a missing keystore fails loudly instead of shipping
a debug-signed bundle.

### Assets

```bash
npm run icons          # regenerate every launcher icon and splash from brand/*.svg
```

Edit the three SVGs in `brand/`, run that, then `npm run sync`. It writes iOS
app icons, Android launcher icons at five densities (legacy, round and adaptive
foreground), splash screens portrait and landscape, and the 512/1024 store
listing icons into `brand/out/`.

## Deep links

`gridlock://class/GL-7K2M` opens Classes with the code filled in, on both
platforms. The web build accepts `?c=GL-7K2M` for the same thing.

The Android manifest also declares an `https://gridlocksystem.app` app link with
`autoVerify`. That will not verify until you host
`/.well-known/assetlinks.json` on that domain with the release signing
certificate's SHA-256 fingerprint — until then it is inert, not broken. Change
the host to your real domain if it differs.

## What ships today

Working: the promo gate and staff login; Playbook (five breaks with per-break
paths, Face and Shot lanes, layout switching, and the call surfaced against the
opponent's logged tendency); Tally as a point sheet you tap through; Scout
(dual-pit cards, tendency, threat, notes, sim bar, anticipate cards, a
counter-picker derived from the opponent read and the match state, division
board); Sightlines with real blocking geometry; the NXL 2026 Midwest Open
layout digitized from the official labeled 2D (58 bunkers); Walk, Lineups, Team, Codes,
Messages; Classes with join codes and participant forms; League groups with
blasts and a blast log; and Nexus.

Roadmap, per `CLAUDE.md` — not built, and deliberately not advertised on the
landing page:

1. Scout 1:1 with the dual-pit screenshots in the spec
2. Playbook 8-way face/shot pad, P|S roles, erase and smooth path editing
3. Per-layout unique paths for every seeded break
4. Bunker naming on the field, plus bunker stats heat
5. QR generation for class codes
6. SwiftUI parity in `ios-native/`, then Android Compose

Movement, Assess and Bunker stats are present as destinations but hold
placeholder copy rather than real data — they need movement capture first.
Tally records the point number and who went out on each side, but not yet the
shot-at bunker or the moved-to bunker the spec calls for.

## House rules

- Never use the banned shot-tool name anywhere — in the UI, in code, in commits.
  The control is **Shot lanes**.
- Coach-simple copy. Short labels. No developer jargon on screen.
- Heuristic scout reads are a training aid, not a prediction. Officials govern
  the live call — say so on Playbook and Scout.
- Joining a class never requires an account. Creating one always requires staff
  login.

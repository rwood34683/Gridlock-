# Store listing — GRIDLOCK Coach

Everything App Store Connect and Google Play Console ask for, written out so a
submission is copy-and-paste rather than an afternoon of drafting. Field limits
are noted; `npm run store:check` re-counts them if you edit the copy.

> **One rule for everything below.** The listing may only describe what the build
> actually does. Both stores check marketing against the binary, and a claim the
> app cannot back up is a rejection. Features still on the roadmap — a second
> event layout, path editing, QR codes for join codes, any kind of sync — are
> deliberately absent. Keep them out until they ship.

---

## Before you submit — four values only you can fill in

1. **Support email.** `site/privacy.html` and `site/support.html` both carry
   `support@your-domain.example` as a placeholder. Replace it with a real address
   you monitor. Both stores email that address, and Apple rejects a support page
   with a dead contact.
2. **The two page URLs.** Deploy `site/` and note where `privacy.html` and
   `support.html` land. Both stores require the privacy URL; Apple also requires
   the support URL.
3. **App Store ID.** App Store Connect assigns it. Then replace `id0000000000` in
   `site/index.html` (hero and closing CTA).
4. **Official store badges.** The inline badges on the landing page are stand-ins.
   Swap in Apple's and Google's own artwork before launch.

---

## Shared identity

| | |
|---|---|
| App name | **GRIDLOCK Coach** |
| Bundle / application id | `com.upra.gridlock.coach` |
| Version | `1.0.0` (build 1) |
| Primary category | Sports |
| Secondary category | Utilities *(App Store only)* |
| Age rating | 4+ (Apple) · Everyone (Play) |
| Price | Free, no in-app purchases, no ads |
| Privacy policy URL | `https://<your-domain>/privacy.html` |
| Support URL | `https://<your-domain>/support.html` |
| Marketing URL | `https://<your-domain>/` |

---

## App Store

### Name — 30 char limit
```
GRIDLOCK Coach
```

### Subtitle — 30 char limit
```
Paintball sideline playbook
```

### Promotional text — 170 char limit (editable without a new build)
```
Every bunker on the field is measured off the official NXL map, not drawn from memory. Call the break, direct all five, and read the other pit between points.
```

### Keywords — 100 char limit, comma separated, no spaces
```
paintball,coach,xball,nxl,speedball,breakout,sideline,layout,bunker,scrimmage,league,tournament
```

### Description — 4000 char limit
```
GRIDLOCK Coach is the sideline tool for paintball coaches and league staff. Pick the event, call the break, direct all five players, and read the other pit — between points, on a phone, with gloves on.

MEASURED, NOT DRAWN
The field is the NXL 2026 Midwest Open, digitized from the official labeled 2D map against its printed 10-ft grid. Every one of the 58 bunkers matches that map to within a hundredth of a foot, and the app ships a check that proves it on every build. A field that is nearly right is worse than no field at all when you are calling a break off it.

PLAYBOOK
Five breakouts, each one drawn as real routes to real bunkers — routed around the snake and everything else, because nobody runs through an inflatable. Direct all five: set primary and secondary roles, point a player's face any of eight ways, and give them a named bunker to lane. Play the break and watch it develop, with each chevron and shot cone travelling with its player.

SCOUT
Read both pits side by side. Record how a team tends to break, how much of a threat they are, and what your own film says. A counter-picker ranks your breaks against what you just saw and whether you can afford to be patient. Heuristic scout reads are a training aid, not a prediction — officials govern the live call.

TALLY
Log a point in two taps. Who went out, which side, which point. No signal required.

SIGHTLINES
Stand behind any bunker and see which lanes are actually open. Every lane is tested against every measured footprint on the field, so a lane that reads clear is clear.

AND UNDER MORE
Walk the field and keep notes. Set lineups. Track rotations. Grade a player after a point. Give your team its own name for a bunker and see it overlay the official code everywhere. Tint the field by where you are winning and losing. Run a clinic off a join code — joining never requires an account. Message your group. Organise league ops into groups, send a blast, and keep a log of what you sent.

WORKS WITH NO SIGNAL
The app makes no network requests at all. Airplane mode changes nothing. There is no account to create, nothing to sign into, and no waiting on a bar of service in a field in the middle of nowhere.

WE COLLECT NOTHING
No analytics, no advertising, no tracking, no server. Everything you enter is written to storage on your own device and stays there. The flip side is worth knowing before you start: because nothing leaves the phone, there is no backup and no sync. Your work lives on one device. Treat it the way you would treat a paper notebook.

GRIDLOCK System · powered by UPRA
```

### What's New — 4000 char limit
```
First release.
```

### App Privacy answers
- **Data collected:** none. Select *Data Not Collected*.
- **Tracking:** no. `NSPrivacyTracking` is `false` and there are no tracking domains.
- The privacy manifest at `ios/App/App/PrivacyInfo.xcprivacy` declares one
  required-reason API: `NSPrivacyAccessedAPICategoryUserDefaults`, reason
  `CA92.1` (the app's own settings on this device), used by
  `@capacitor/preferences`.

### Export compliance
`ITSAppUsesNonExemptEncryption` is already `false` in `Info.plist`. The only
cryptography is a salted SHA-256 hash of the local staff password via the Web
Crypto API, which is exempt. No compliance documentation is required.

### Review notes
```
No account is required to use the app or to join a class. A staff login gates
creating a class and sending a league blast; it is created on-device and its
password never leaves the phone, so there is no demo account to provide — tap
Staff, then create one with any email and password.

The app makes no network requests. It works fully in airplane mode.

The break paths and scout ranks are a coaching aid computed on-device from the
official published layout. They are not live scores and are not a prediction;
the app says so on screen.
```

### Screenshots
`store/app-store/iphone-6.9/` (1290 × 2796, required) and
`store/app-store/iphone-6.5/` (1242 × 2688). Six panels, in order: Playbook,
Scout, Tally, Sightlines, Classes, League. Regenerate with `npm run store`.

### Icon
`brand/out/app-store-icon-1024.png` (1024 × 1024, no alpha). `npm run icons`.

---

## Google Play

### App name — 30 char limit
```
GRIDLOCK Coach
```

### Short description — 80 char limit
```
Call the break, direct all five, and read the other pit between points.
```

### Full description — 4000 char limit
Same body as the App Store description above. Play renders plain text, so keep
the section headings in caps and leave a blank line between blocks.

### Data safety
- **Does your app collect or share any required user data types?** No.
- **Is all of the user data collected by your app encrypted in transit?** Not
  applicable — no data is transmitted.
- **Do you provide a way for users to request that their data be deleted?**
  Data never leaves the device; uninstalling the app deletes it. Point the
  answer at `https://<your-domain>/privacy.html`, which says so.

### Content rating questionnaire
Sports/utility app. No violence, no sexual content, no profanity, no gambling,
no user-generated content shared publicly, no location sharing, no purchases.
Expected result: **Everyone**.

### Ads
No ads. Answer *No* to "contains ads".

### Target audience
13+. The app is a tool for coaches and league staff, not a children's app, and
is not designed for or directed to children.

### Permissions
`INTERNET` only, required by the Android WebView platform. The app makes no
requests with it. No sensitive or restricted permissions are declared, so no
permissions declaration form is needed.

### Graphics
| Asset | Size | File |
|---|---|---|
| Phone screenshots | 1080 × 1920 | `store/play/phone/*.png` (6) |
| Feature graphic | 1024 × 500 | `store/play/feature-graphic.png` |
| App icon | 512 × 512 | `brand/out/play-store-icon-512.png` |

### Signing
Release signing reads `android/keystore.properties`, which is git-ignored along
with `*.jks` and `*.keystore`. Copy `android/keystore.properties.example`, fill
it in, and keep the keystore somewhere you will still have it in five years —
losing it means you can never update the listing. Then:

```bash
npm run bundle:android      # android/app/build/outputs/bundle/release/app-release.aab
```

---

## Regenerating everything

```bash
npm run serve      # terminal 1
npm run store      # store/ — every screenshot and the feature graphic
npm run icons      # brand/out/ — both store icons and the splash
npm run store:check   # re-count the character-limited fields
```

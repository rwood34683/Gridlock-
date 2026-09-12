# Store listing draft — GRIDLOCK Coach

This is editable release copy for the supplied local app, not confirmation of a store listing or an approved submission. `npm run store:check` checks the copy limits and generated image dimensions configured in this project. Check the current store-console requirements against the final signed binary before submitting.

## Values the owner must supply

`site/contact.json` contains null values until they are explicitly configured. No domain, support inbox, App Store ID, Google Play listing or release certificate was supplied. The static site displays that state without linking to nonexistent apps.

1. Configure a monitored support email: `npm run contact -- --email YOUR_SUPPORT_EMAIL`.
2. Configure an owned domain: `npm run contact -- --domain YOUR_DOMAIN`. This does not create an email inbox. Publish the finished site separately and verify the live support and privacy pages.
3. After creating the actual store listings, set `--appstore YOUR_NUMERIC_ID` and `--play YOUR_GOOGLE_PLAY_APP_URL`. These create ordinary text links on the site.
4. Configure the SHA-256 release signing certificate using `--sha256 YOUR_COLON_SEPARATED_FINGERPRINT` if using Android verified app links.
5. Review pricing, distribution, content rating, age targeting, privacy disclosures, signing and support ownership in the actual store consoles. They are release decisions, not values inferred by this code.

`npm run site:check -- --release` and `npm run store:check -- --release` fail while required local release configuration remains unset. They do not verify domain ownership, mailbox delivery, store approval or certificate ownership.

## Shared identity

| Field | Draft value |
|---|---|
| App name | GRIDLOCK Coach |
| Bundle / application ID | `com.upra.gridlock.coach` |
| Version | `1.0.0` |
| Suggested category | Sports / Utilities |
| Pricing | Owner to choose; this build implements no purchase flow |
| Age rating and target audience | Owner to complete in the consoles |
| Privacy URL | **Not configured** — publish `privacy.html` on the owned domain |
| Support URL | **Not configured** — publish `support.html` on the owned domain |
| Marketing URL | **Not configured** — publish the static site on the owned domain |

## App Store

### Name — 30 char limit
```
GRIDLOCK Coach
```

### Subtitle — 30 char limit
```
Paintball sideline playbook
```

### Promotional text — 170 char limit
```
Call the break, direct all five and keep your read on the other pit. Playbook, point sheets and team notes together on your device.
```

### Keywords — 100 char limit
```
paintball,coach,xball,nxl,speedball,breakout,sideline,layout,bunker,scrimmage,league,tournament
```

### Description — 4000 char limit
```
GRIDLOCK Coach keeps a paintball coach's playbook, point sheets and scouting notes together on the sideline.

PLAYBOOK
Pick one of the three included 2026 event layouts: Lone Star Open, Tampa Bay Open or Midwest Open. Choose a breakout, set the five players' routes and roles, point their faces and assign shot lanes. Play the break or share a set of player cards.

SCOUT
Keep film notes and player reads against each team. Log the calls you see, compare the two pits and review your own counter choices. Scout reads and sightlines are coaching aids, not predictions. Officials govern the live call.

TALLY
Log outs as the point develops. Keep the point sheet with its match and review earlier games. Connect the out with a player and a bunker when you know where it happened.

SIGHTLINES
Explore lanes from the bunkers on the included field layouts. Use the layout geometry to prepare a plan, then check real conditions on the field.

YOUR SQUAD
Edit the roster, set lineups, record movements, grade players and keep field-walk notes. Give a bunker the name your team uses. Review player cards and bunker statistics built from your records.

CLINICS AND LEAGUE NOTES
Run a clinic sign-in sheet on the device that created it. Joining that local sheet needs no account. A local staff login gates creating a class and recording a league notice. Organize contacts into groups, keep notices and use your own messaging apps to share them. A saved notice is not a delivered message. Class codes do not sync a class to another device.

LOCAL FIRST
The coaching tools calculate and save on your device without a cloud account. Installed native builds work without signal. A browser needs an initial load and an available local copy. There is no live event feed, cloud sync or remote recovery service.

KEEP A COPY
Use Save a copy to export your season to a file you control. Load a copy to merge with the current season or deliberately replace it. Keep a backup before changing devices, clearing browser data or uninstalling. Exported files may contain roster and participant information, so share them only with the people you intend.

The app includes no analytics, advertising or tracking SDK. Native device backups and services you choose for sharing have their own behavior and policies.

GRIDLOCK System · powered by UPRA
```

### What's New — 4000 char limit
```
Initial release candidate: local playbook, scouting, point sheets, field notes, rosters, clinic sign-ins, league notices and season backup tools.
```

### Privacy and encryption review

The supplied app has no cloud database, analytics or advertising SDK. It keeps season data and the local staff account on the device, and provides exports and optional sharing through user-chosen services. The native privacy manifest and platform configuration must be reviewed alongside the final plugins and binary. If distribution adds analytics, a server, payments or other services, revise the disclosures and privacy notice before release. Device backups, hosting logs and copies shared by the user should be considered when completing the consoles' questionnaires.

Optional **Scout → Voice log** uses microphone and speech-recognition permissions, requested only after Start listening. The device or browser's speech provider may process audio remotely and require internet. GRIDLOCK retains finalized transcripts and event metadata locally, including original text after correction, but does not store audio. Full season exports include this history. Typed entry works without microphone permission. Include this feature and the final speech provider behavior when completing privacy and Data safety disclosures; do not describe the entire build as transmitting no audio. The supplied privacy page explains the feature.

Local staff authentication hashes passwords using the platform cryptographic API. Review the final build's encryption declaration and the applicable console questions; this draft does not determine export-compliance treatment.

### Review notes
```
Guest tools and signing in to a clinic sheet do not need a cloud account. Staff tools use an account created on the current device: choose Staff and create a local account with your own test credentials.

The clinic sheet lives on the device that created it and can be passed around for sign-ins. A class code is not a remote invitation and does not sync to another phone. League notices are local records; the user must finish sharing in a separate app to send them.

The installed coaching tools calculate locally. There is no live event feed or cross-device account. Save a copy exports the local season; Load a copy imports it.

Break paths, scout reads and sightlines are training aids from the included layout geometry and entered observations. The UI identifies them as aids rather than live predictions.
```

### Screenshots and icon

The configured screenshot outputs are `store/app-store/iphone-6.9/` (1290 × 2796) and `store/app-store/iphone-6.5/` (1242 × 2688). Each has six actual app captures with example data: Playbook, Scout, Tally, Sightlines, Classes and League. Generate with `npm run store` after starting the app server. Verify the upload slots in the current console.

The opaque icon is `brand/out/app-store-icon-1024.png` (1024 × 1024). Generate with `npm run icons`.

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

Use the same description above. Review the actual Data safety, content rating, target audience, permissions, ads and pricing questions against the signed release. The supplied code implements no ads, purchases, remote messaging or public profile service. Personal information entered by a coach can still appear in local files and copies the coach chooses to share. The supplied privacy page explains the local storage and deletion behavior; configure and publish its real URL before submission.

### Graphics

| Output | Size | File |
|---|---|---|
| Phone screenshots | 1080 × 1920 | `store/play/phone/*.png` (6) |
| Feature graphic | 1024 × 500 | `store/play/feature-graphic.png` |
| App icon | 512 × 512 | `brand/out/play-store-icon-512.png` |

### Signing

The restored Android shell reads `android/keystore.properties` when configured. Copy `android/keystore.properties.example` and enter your own signing values. Keep keystores and passwords out of source control. Run `npm run bundle:android` only with a configured Android SDK/JDK and signing environment. A generated screenshot package or a passing local check is not a signed binary or a store submission.

## Regenerate and check

```sh
npm run serve             # leave the app server running
npm run icons
npm run shots
npm run store
npm run sync              # platform tooling may require macOS / Android SDK
npm run store:check
npm run app:artifact
npm run site:artifact
npm run site:check
```

Before publishing, configure the real release values and repeat both checks with `-- --release`. Publish or submit separately when authorized.

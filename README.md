# GRIDLOCK Coach

**GRIDLOCK System · powered by UPRA · Coach Edition**

Call the break. Direct the five. Own the point.

A device-local paintball coaching app with a shared web interface and Capacitor iOS/Android projects. The archive's coaching tools and measured geometry are retained. Missing distribution assets, native shells, portable tooling and offline browser support have been restored.

## Open it

On Windows, double-click **START-GRIDLOCK.cmd**. Keep its terminal open while using the app.

Or use Node.js 22 or newer:

~~~sh
node scripts/serve.js
~~~

Open **http://localhost:5173/**. The web app needs no dependency installation. Choose **Continue as guest**, or create a local staff account for class and league tools. There is no default password.

After its first successful load on localhost or HTTPS, the browser app caches its public files and can reopen offline. Your season lives separately in browser storage. **More → Nexus → Save a copy** creates a backup you control.

For access from another device on your LAN, set HOST=0.0.0.0 before starting. Staff sign-in, sharing, wake lock and installation depend on secure-context support; use HTTPS for normal hosted use.

## Included features

- Playbook: three measured fields, twelve breaks, five editable player routes, face directions, shot lanes, primary/secondary roles, assignment cards and recognition practice.
- Tally and matches: outs and causes, bunker traffic, point results, score, history and lineups.
- Scout: two pits, team-specific notes/players, observed breakouts, matchup reads, counters, historical layers, replay and division lists. **How did they get there?** adds saved opponent sightings, possible routes around bunkers and step/play controls. See [the feature guide](docs/HOW-DID-THEY-GET-THERE.md).
- **Voice log:** scouts can dictate player observations; completed phrases save automatically with team, field, match, point and timestamp. Review or correct unclear events, undo mistakes, and use confirmed bunker observations in the route viewer. Typed entry is always available. See [the voice guide](docs/VOICE-LOG.md).
- Field tools: blocking geometry for sightlines, walk notes, movement, bunker names and traffic summaries.
- Team tools: roster editing/import, assessments, code words and local messages.
- Classes and league: local staff gate, pass-the-device participant forms, session management, groups and notices shared through available device apps.
- Data: validated season/squad imports, merge or replace, exports, recovery of unreadable saves and a second app-storage copy in native builds.
- Distribution: browser offline shell/icons, static landing/support/privacy pages, store-asset generation and restored iOS/Android project source.

Published team and roster information is the snapshot supplied in the archive, not a live feed or independently refreshed data. Scout reads are training aids; officials govern the live call.

## Development and checks

Install dependencies for tests, asset generation or native work:

~~~sh
npm ci
npm run browser:install
npm run check
npm run build
~~~

The check runner owns its temporary server. It covers functions, responsive layouts, bunker geometry, season-size performance, offline reopening, arrival routes, speech parsing and simulated dictation, platform bridge behavior and HTTP server behavior. Individual commands include test, test:devices, verify:bunkers, loadtest, test:offline, test:server, test:arrival, test:arrival-custom, test:voice-parser, test:voice and test:platform.

CHROME_PATH selects an existing Chromium executable. PLAYWRIGHT_BROWSERS_PATH selects a browser installation directory. Tests use isolated contexts, not your personal browser profile.

~~~sh
npm run icons          # web, native and store icon assets
npm run shots          # screenshots of the actual app
npm run store          # store screenshot panels
npm run store:check    # listing and image checks
npm run site:check     # static page/link checks
npm run build          # static distribution and standalone app
npm run preview        # serve dist/ locally
~~~

Release helpers report missing support contacts, domains and store IDs. None are invented.

## Mobile projects

For Xcode, transfer the full folder to your Mac and run **OPEN-IN-XCODE.command**.
It checks the Mac tools, installs the pinned dependencies, syncs the interface,
and opens the CocoaPods workspace. Follow [the Xcode guide](docs/XCODE.md) for
simulator and device signing steps.

The maintained interface is web/. Both mobile projects bundle it:

~~~sh
npm run native:setup
npm run sync
npm run open:android
npm run open:ios
~~~

Android compilation requires Android Studio, the Android SDK and the JDK required by the generated Gradle project. build:android:debug creates a debug APK when those tools are installed. Release APK/AAB commands require signing configuration.

iOS compilation and signing require macOS, Xcode, CocoaPods and an Apple development team. The generated project includes the custom URL scheme and privacy manifest. Windows can prepare the source but cannot compile an iOS binary.

No signed store binary or submission is included. See **docs/NATIVE-SETUP.md** for platform setup and **docs/STORE-LISTING.md** for listing copy.

## Source map

| Folder | Purpose |
| --- | --- |
| web/ | Coaching interface, native bridge and offline browser shell |
| ios/, android/ | Capacitor projects and platform configuration |
| site/, brand/ | Static pages, app artifact and reproducible identity assets |
| layouts/, tools/ | Supplied field measurements, references and geometry tools |
| test/, scripts/ | Checks, build, preview and release helpers |
| docs/ | Product references, setup and implementation notes |
| ios-native/ | Archived early SwiftUI prototype; not the maintained app |
| dist/ | Generated browser distribution |

## Product boundaries

This is an offline-first, device-local app. Accounts, sessions, messages and groups do not synchronize between devices. Sharing opens a device share flow; GRIDLOCK has no email, SMS or push-delivery server. A class code identifies a session already on that device, including one imported from a copy.

Optional speech recognition depends on a supported browser or native speech service and may use an internet connection. Permission is requested only after Start listening. GRIDLOCK keeps the transcript, not audio; the speech provider may process audio remotely. Real-device microphone accuracy and native compilation require testing on the target devices.

Cloud authentication, remote class joining and live feeds require a separately configured backend and are not simulated. The early SwiftUI tree remains reference material; the shared interface ships through Capacitor instead of a separate SwiftUI/Compose rewrite.

The supplied CLAUDE.md and Overskill documents contain historical instructions and aspirational features. This README describes the runnable package delivered here.

# Implementation and validation — September 11, 2026

The supplied archive already contained the coaching interface, geometry,
layout references and substantial functional tests. This delivery completes
the missing runnable distribution around that interface and fixes concrete
data-loss and interaction defects found during review.

## Application fixes

- **Scout → How did they get there?** reconstructs possible routes for a
  selected opponent and destination. Ordered sightings persist by team, player,
  field, match and point; exports/merges retain them without duplicates.
  The viewer supports either starting end, an optional starting bunker,
  available wire alternatives, field selection and step/play controls.
  Recorded positions are distinct from inferred paths; no timing or video
  tracking is claimed. Failed route searches show an explanation.
- Custom opponent teams and players can be added directly from that viewer.
  Entries are immediately selected, saved to the shared team/scout records,
  retained in full and squad backups, and reused without duplicate names or
  player numbers. Adding a jersey number to a previously named player preserves
  their recorded sightings. Empty or stale forms cannot create records.
- Saved seasons and imports work without `Object.hasOwn`, avoiding invalid
  recovery on older supported WebKit versions. Native backups now write a
  UTF-8 JSON file and share its URI, with explicit cancellation and a usable
  text fallback if the file or share operation fails.
- Safe-area spacing accepts Capacitor's Android system-bar insets while
  retaining the browser/iOS inset fallback.

- Selecting a backup file retains its contents through rendering. Invalid
  imports retain the draft for correction and cannot partially alter the season.
- Import validation limits accepted data to known structures and rejects
  prototype keys, malformed records and incompatible content.
- Full and squad exports include custom teams. Merges preserve nested scouting,
  group members, aliases and notes, deduplicate repeated records, and keep the
  active local sheet. Legacy point records get stable, openable match identities.
- Unreadable stored data is kept as recoverable text instead of silently lost.
- Names containing quotes, backslashes or HTML-like text work in interactive
  controls. The Add team control has an accessible name and page zoom is enabled.
- Native app-storage writes are serialized, retried and retain newer pending
  values. Failure is visible. Sharing has a copy fallback, cold-start class links
  are handled, and wake-lock/back-button races are corrected.

## Restored distribution

- Dependency-free, portable local server and Windows launch shortcut.
- Server path containment, malformed URL handling, MIME types, directory
  redirects, HEAD support and explicit error responses.
- Automatically managed test server and portable Chromium discovery.
- Browser manifest, PNG/touch icons and a service worker that caches only the
  public application shell. Season/account data is not part of that cache.
- Static landing, support and privacy pages using actual app screenshots.
- Reproducible brand and store asset generators, honest contact configuration,
  standalone HTML export and a static build with content hashes.
- Generated Capacitor iOS/Android projects using the maintained shared interface.
- Capacitor 8 native dependencies and a Mac launcher for installing pinned
  dependencies, syncing the latest interface and opening the Xcode workspace.

## Verification

- Custom opponent entry: browser integration covers real form submission,
  validation, name/number combinations, duplicate prevention, safe rendering,
  team isolation, history preservation, reload, backup restore/merge and
  320/390-pixel phone layouts (`test:arrival-custom`).

- Arrival reconstruction: **46 destination/start-end scenarios**, **123
  routes**, **64,751 independent samples** against all three measured layouts,
  including **36 detours**. Integration covers player shortcuts, field taps,
  observation order, playback, context isolation, reload, merge/replace,
  undo/clear and phone controls.
- Platform contract: **18/18 assertions**, including older-WebKit API
  compatibility, real-file export parameters, concurrent taps, cancellation,
  write/share failures and squad scope. Native plugins are stubbed in this
  browser suite; it is not an iOS simulator test.
- Native source: **36/36 structural checks**, including parsed Xcode project
  and property lists, scene registration, shared scheme, plugin versions,
  privacy reasons, Android tool versions and byte-for-byte web asset parity.
  The Mac preflight refuses Windows before installing or modifying anything.
  The included macOS workflow builds an unsigned iOS simulator app when run;
  that workflow has not been executed from this environment.

- Functional suite: **563/563 assertions**, no page errors.
- Responsive suite: **93/93 checks across 17 emulated device sizes**, no horizontal
  overflow, visible navigation and minimum 44-pixel tap targets.
- Rendered geometry: **173/173 bunkers across three layouts** match the supplied
  measured records within the suite's 0.05-foot tolerance.
- Server suite: **7/7 tests**, including Windows short-path handling, encoded
  traversal containment and malformed requests without a crash.
- Offline browser check: cached installation, saved-session reload, all five
  destinations and a class-code query work with the browser set offline.
- Season stress test: all hard budgets passed with no page errors at 4× CPU
  throttling. The seeded season used 389 KB, cold start took 482 ms, sideline
  taps had a 184 ms 95th percentile, and animation averaged 44 fps. Several
  render/frame measurements exceeded the suite's softer smoothness targets;
  this is not a claim of 60 fps on every device.
- Distribution: **15/15 static-site checks** and **16/16 store asset/copy
  checks** pass. A clean `npm ci` and image-library load were verified in an
  isolated directory. Both native shells contain the current web build.
- The built distribution also passed the offline test from its nested `/app/`
  route, validating the installed service worker's path scope.

The tests use Chromium on Windows. Responsive emulation is not physical-device
testing. Native bridge behavior is exercised with plugin stubs; actual iOS and
Android compilation, signing and physical-device checks require their SDKs.
The layout tests compare against supplied measurements; they do not independently
remeasure the official source images or verify current league registrations.

## Deliberate boundaries

This package stores data on the device. Cloud identity, cross-device sync,
remote class joining, live event feeds and server delivery of notices are not
implemented. The early SwiftUI snapshot is preserved as reference. Mobile parity
comes from Capacitor sharing the maintained web interface.

Store contacts, deployed domains, app-store IDs and release signing credentials
must be supplied by the owner. The project has not been published or submitted
to a store. No signed native binary is claimed.

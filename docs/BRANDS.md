# Two builds, one source

The app ships under two names. **Gridlock** is the default — the committed
`web/`, `site/`, `ios/` and `android/` read Gridlock, `npm run build` and the
Pages workflow publish Gridlock to gridlockpb.com, and every test asserts
Gridlock. **Grind X** is a variant produced from the same source by
`scripts/brand.js`. Nothing is forked: there is one app, and a build step that
re-labels it.

| | Gridlock (default) | Grind X |
|---|---|---|
| On screen | Gridlock · Gridlock Coach | Grind X · Grind X Coach |
| Bundle / application id | `com.upra.gridlock.coach` | `com.upra.grindx.coach` |
| Class join link | `gridlock://class/…` | `grindx://class/…` |
| Support contact | `site/contact.json` | `site/contact.grindx.json` |
| Site output | `dist/` | `dist/brand/grindx/` |

Both are defined once, in **`brand/brands.json`**. That file is the only place
a brand's name, id, scheme or contact file is written down.

## The rule that makes this safe

The code is full of the word `gridlock` in lowercase, and **none of it is the
brand**. `window.gridlockKeep`, `gridlockShare`, `gridlockCloud` and the rest
are the native bridge; `gridlock.coach.v2` and `gridlock.staff.v2` are the
storage keys a coach's season and account live under; `gridlock.coach.copy` is
the format tag every saved copy is checked against on import; `gridlock-shell`
and `gridlock:` name the service-worker cache; `GridlockVoiceParser` is a code
namespace. Rename any of them in one build and that build silently orphans every
season saved by the other, refuses every backup file the other wrote, and
breaks every deep link already printed on a class card.

So the transform is a table, not a search-and-replace:

| Changes per build | Never changes |
|---|---|
| The capital word **Gridlock** (`\bGridlock\b`, not `GridlockVoiceParser`) | every lowercase `gridlock` token |
| the deep link `gridlock://` | `window.gridlock*` |
| `appId` and `appName` in `capacitor.config.json` and the shells | storage keys, `COPY_FORMAT`, the SW cache |
| the support block and `CNAME`, from the brand's own contact file | the export folder `gridlock-exports/` |

Before it writes a single file the build counts every namespace token in the
source and in the output and refuses, in one sentence, if any count moved. It
also refuses if the variant still shows the default name anywhere, or if the
default build would differ from the source by a byte. `test/brands.js` pins all
of it, and `npm run check` runs it.

`web/index.html` carries `<meta name="brand" content="gridlock">`. The build
rewrites it, the checkers read it, and a file that already carries another
brand's marker is refused rather than branded twice.

## Using it

```sh
npm run brand                       # the guided version — pick a brand, pick a job
npm run brand status                # both brands, their ids, contacts, and which one the phones hold
npm run brand build grindx          # → dist/brand/grindx/  (site + app/ + GrindX.html + capacitor.config.json)
npm run brand build -- --all
npm run brand contact grindx -- --email support@example.com --domain example.com
npm run brand native grindx         # point the committed ios/ and android/ shells at Grind X
npm run brand check grindx
```

Add `--dry-run` to any of them to see exactly what would change and write
nothing; `--yes` skips the confirmation on `native`. Every refusal is one
sentence naming the thing wrong. Every success ends with **Next:** and the
command that follows.

### The phone shells

There is one `ios/` and one `android/`, and they are pointed at a brand rather
than duplicated. `npm run brand native grindx` rewrites, in place: the bundle
identifier in the Xcode project; the display name, URL name and URL scheme in
`Info.plist`; `applicationId` in `build.gradle`; the app name, package name and
scheme in `strings.xml`; the scheme and app-link host in the Android manifest;
and both `public/` folders, which receive the transformed web build. It is a
byte-identical round trip — switch back with `npm run brand native gridlock`.

On Android only `applicationId` moves. `namespace` and the Java package
(`com/upra/gridlock/coach/MainActivity.java`) stay where they are, which Android
allows and which keeps the switch to text edits with no file moves. Play
identifies the app by `applicationId`, so the two builds are two listings.

`npm run sync`, `native-check` and `store-check` all read the brand the shells
hold and compare against the source transformed to that brand, so a shell
pointed at Grind X is *in step*, not stale. The committed state is Gridlock;
switch, archive in Xcode or Android Studio, switch back before committing.

## Finishing Grind X

The infrastructure is done; the Grind X build passes every check today. What it
does not have is an owner's details, and the tool never invents them:

1. **Domain and support email** — `npm run brand contact grindx -- --email … --domain …`.
   Until then the support page says a contact has not been configured, and the
   build has no `CNAME`.
2. **Store accounts** — an App Store Connect app and a Play listing under
   `com.upra.grindx.coach`; then `--appstore` and `--play` on the same command.
3. **Android signing** — its own upload key, then `--sha256` so the app-link
   association is written for its package.
4. **Listing copy, icons and screenshots** — `docs/STORE-LISTING.md` is the
   Gridlock listing. Copy it for Grind X and run `npm run store:check` against
   the copy; the name is one character longer and still inside every limit.
5. **Publish the site** — `npm run brand build grindx` and put `dist/brand/grindx/`
   wherever that domain is served. The Pages workflow publishes `dist/`, which
   is Gridlock; a second workflow or a second host carries Grind X.

## Adding a third

One entry in `brand/brands.json` (unique short name, id and scheme, its own
contact file under `site/`) and it is built, checked and switchable with the
same commands. Nothing in `web/` changes.

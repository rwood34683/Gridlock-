# Grok website copy — reviewed source overlay

These five files update the owner's actual Grok marketing-site export,
downloaded from the open **Build Marketing Website for Gridlock Coach App**
workspace on 3 November 2026. This is an overlay, not a standalone website.
The original framework, assets, styles, routes and hosting stay in Grok.

Copy these files to the same paths in a fresh export:

- src/cloud-copy.ts
- src/routes/index.tsx
- src/routes/privacy.tsx
- src/routes/support.tsx
- src/components/site-chrome.tsx

Compare them with the current workspace first. Keep src/app-url.ts: its
APP_URL already points to https://app.gridlockpb.com/. Privacy and Support
use /privacy and /support. The support email and footer fixes are retained.

The copy explains Supabase account records, opt-in full-season upload,
administrator review, pausing without deleting, restore, upload deletion
and Delete account. Support explains same-account sign-in across devices
and password resets. Platform labels say Browser beta for iPhone/iPad,
Android and PC/Mac. The design, logos and social section are preserved.

src/cloud-copy.ts is generated from scripts/site-live.js:

    node scripts/site-live.js --grok-copy

The owner-authorized update was applied to the existing Grok workspace and
published on 3 November 2026. Live Home, Privacy and Support were checked
at https://gridlockpb.com, including phone width, app links and disclosures.
No domains, access rules, database or hosting configuration were changed.

Validation: TypeScript and the production Vite compile passed. All three
routes rendered without overflow or console errors on phone and desktop
in development and built previews. Original logos decoded before captures.

For local built-preview QA only, the locked PGLite package's pglite.data,
pglite.wasm and initdb.wasm were copied into the generated __server.func/_libs/
directory because the export's fallback could not find them. This overlay
does not change the framework or database configuration. Grok also reported
passing typecheck/build and phone/desktop development and built previews.

For a future update, compare a fresh export, inspect its diff, typecheck,
build and review all three pages before an owner-authorized publication
through the existing Grok project.

## Password sharing files

The phone apps ask iOS and Android to treat gridlockpb.com as theirs, so a
password saved there can be offered in the app. The site has to say the same
back. Copy `site/.well-known/apple-app-site-association` and
`site/.well-known/assetlinks.json` from this repo into the export's static
`public/.well-known/` folder, with the same names, and publish. Then check that
`https://gridlockpb.com/.well-known/apple-app-site-association` returns the JSON
without a redirect. Re-copy them after `npm run contact -- --appleTeam` or
`--sha256` changes them. See `docs/NATIVE-SIGN-IN.md`.

## 10 Nov 2026: Coming soon

`src/routes/index.tsx` adds a **Coming soon** section (`ComingSoon`, id
`coming`) between the coaching-aid note and the closing call. It says the
coach app is the first of three, names Gridlock Team and Gridlock Player in
the same words as `site/index.html`, and says neither is available yet. It
uses only classes the page already has, with no new imports, routes or
assets. Apply it like the rest of the overlay: copy the file over the
workspace's own, compare first, publish from Grok.


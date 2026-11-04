# Grok website copy update — source overlay for review

These four files update the owner's actual Grok marketing-site export,
downloaded from the open **Build Marketing Website for Gridlock Coach App**
workspace on 3 November 2026. They are not a replacement website or a standalone
app. The original export's framework, assets, styles, shared header/footer,
routes and deployment configuration are intentionally left with that project.

Copy `src/cloud-copy.ts` and the three `src/routes/*.tsx` files over the same
paths in that Grok export. Review their diff against the current workspace
first if it has changed since the export. Keep its existing `src/app-url.ts`:
`APP_URL` already points to `https://app.gridlockpb.com/`, and the shared CTA
and Support link use it. Privacy and Support already route to `/privacy` and
`/support`. The existing support email/footer fixes are retained.

The update removes “nobody else reads your scouting” and the unconditional
device-only promise. It explains the Supabase account records, opt-in
full-season upload, administrator review, pausing without deleting, restore,
upload deletion and Delete account. It keeps the original design, hero,
logos, iOS/Android marks and Facebook/Instagram section.

`src/cloud-copy.ts` is generated from the confirmed wording in
`scripts/site-live.js` in the Gridlock repo:

```powershell
node scripts/site-live.js --grok-copy
```

After applying this reviewed overlay in Grok, build and typecheck the website,
then inspect Home, Privacy and Support at phone and desktop sizes. Prepare a
preview for the owner. **Do not click Publish Changes as part of this PR.**

The Grok workspace and the public website were not modified or published by
this PR. The edited export was checked locally; see the PR's validation notes.

Local verification: TypeScript and the production Vite compile passed. Home,
Privacy and Support rendered on desktop and phone in both development and
built previews. The final built check also checked console errors and waited
for the original logo images to decode before screenshots.

The downloaded export's built preview initially stopped because its local
PGLite fallback could not find `pglite.data`, `pglite.wasm` and `initdb.wasm`.
For local QA only, those existing files were copied from the locked
`@electric-sql/pglite` package into the build's `__server.func/_libs/` directory.
This source overlay does not change the Grok scaffold, database configuration
or deployment settings. Recheck the prepared preview in Grok before publishing.

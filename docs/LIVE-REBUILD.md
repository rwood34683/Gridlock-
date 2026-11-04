# Owner rebuild and upload

Use the reviewed, tested main commit for a release. This workflow preserves
Supabase, Cloudflare, Vercel, domains and access settings.

The owner confirmed that the live app is uploaded through **Sites in this
chat**, not the public website's old GitHub Pages instructions. Read-only
Sites inspection on 3 November 2026 confirmed the existing project:

- Title: Gridlock Staging (its existing title, even though it serves the app).
- Project: `appgprj_6ae3e6056c408191845a684abeffcb8b`.
- Current live address: https://app.gridlockpb.com/.
- Latest recorded app release before the sign-in polish: version 12, from
  main `bb97dd9` (PR #277), published on 3 November 2026.

## Build the app after reviewing and merging the PR

1. In a fresh checkout of the reviewed commit, run `npm ci`.
2. In PowerShell run the following. These are the **public project URL and
   publishable key**, also recorded in `site/contact.json`. Never substitute
   a service-role key, `sb_secret_` key or database password.

   ```powershell
   $env:GRINDX_SUPABASE_URL = 'https://tldgxtrvbzlnydlysdln.supabase.co'
   $env:GRINDX_SUPABASE_ANON_KEY = 'sb_publishable_06JZ1yePx_pl22MXZfVF2Q_ye_LQ0Os'
   $env:GRINDX_AUTH_REDIRECT_URL = 'https://app.gridlockpb.com/'
   npm run cloud:build
   ```

3. Output is `dist/cloud/`. Check `gridlock-config.js` names the intended
   project and has `privacyUrl: https://gridlockpb.com/privacy` and
   `supportUrl: https://gridlockpb.com/support`. Both page URLs are generated
   from the contact domain. They never need to be typed into `web/index.html`.
4. For an iPhone cloud web export, run `npm run ios:cloud` with the same
   environment. Output is `dist/ios-cloud/` with the same links. This does not
   compile, sign, or upload an iOS app. Native compilation requires a Mac.

## Upload using the existing Sites project, only when the owner asks

There is no standalone manual upload dashboard documented in this repo.
Sites publishing is a connected-tool workflow in this chat:

1. Ask this chat: “Publish the reviewed commit from this PR to the existing
   Gridlock Sites project at app.gridlockpb.com. Keep its current domain,
   access and admin routes. Show me the build and version first.”
2. The publishing agent reads the current Sites project and opens its source
   with `create_source_repository_write_credential` and the Sites source
   helper. It must reuse the project above, never create another Site. Do
   not enable publish-on-push while preparing files.
3. Build the reviewed Gridlock commit using the command above. Overlay the
   contents of `dist/cloud/` into the **existing app's static root** in that
   Sites source checkout. Preserve its existing `/admin/` assets, host
   manifest, routing and any other host-owned files. Do not replace the whole
   Site with `dist/`, `site/`, or the offline preview. Verify the current
   source's static-directory setting rather than guessing a directory.
4. Package that source with the Sites source helper, retaining its returned
   commit SHA and archive. Save a version with `save_site_version` for the
   same project and exact archive/commit, then deploy that saved version with
   `deploy_site_version`. Preserve the current audience. Record the returned
   version and deployment status; keep the previous version available.
5. Test https://app.gridlockpb.com/ in a fresh browser: sign-in, password
   reset, Nexus sync disclosure, Help/Nexus page links, and admin access.
   Test a phone and tablet too. Enter passwords and MFA codes only in the app.

Follow these steps only for an owner-authorized release. Keep its returned
version and deployment identifiers in the release record.

## Public website built in Grok

The live website is https://gridlockpb.com. The owner pointed to the open Grok
workspace, and its source was downloaded for review. The five reviewed source
files are in `marketing/grok/` with instructions for applying them to that
export while retaining its design and deployment configuration. The
owner-authorized copy update was applied to the existing Grok workspace
and published on 3 November 2026. Live Home, Privacy and Support were checked
after publication.

`scripts/site-live.js`
holds the confirmed wording and generates a separate **review export** with
`npm run site:live` into `dist/site-live/`. It fixes the repo templates' app
links and cloud claims, supplies `/privacy` and `/support` directory pages,
and leaves the committed offline site and app unchanged.

Use the `marketing/grok/` overlay to apply the wording to the existing Grok
pages. Its existing app CTAs already point to https://app.gridlockpb.com/;
Privacy routes to `/privacy` and Support to `/support`. Support remains
support@gridlockpb.com. Review a fresh edited export and prepared preview
before each
owner-authorized publish. Do not upload this template export over the
Grok design without reviewing that design change with the owner.

# Publishing the site — gridlockpb.com

**Current owner-confirmed setup (3 November 2026):** the live app at
https://app.gridlockpb.com/ is uploaded through Sites in this chat; the public
website at https://gridlockpb.com is built in Grok. Follow
[LIVE-REBUILD.md](LIVE-REBUILD.md) for the current app rebuild/upload steps and
the reviewed Grok copy overlay. The GitHub Pages procedure below describes the
repository's separate static/offline-site export. Do not apply its DNS or
hosting steps to the existing live sites as part of this PR.

The landing, support and privacy pages in `site/` are built by `npm run build`
into `dist/` and published by the **Publish Gridlock site** workflow
(`.github/workflows/site.yml`). It is run by hand from the Actions tab, never
on push, so a half-finished page is never live by accident.

Two steps belong to the owner and cannot be done from the repository or from a
Claude Code session. Until both are done the site shows nothing, on the custom
domain and on the github.io address alike.

## 1. Enable GitHub Pages, once

On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions.**

The workflow's own token is not allowed to turn Pages on for this repository,
so the one run so far (30 Sep 2026) stopped at `configure-pages`. The workflow
now checks first and says this sentence in its summary instead of failing three
steps later. After Pages is enabled, re-run **Publish Gridlock site** from the
Actions tab; it deploys `dist/` and sets the custom domain from `site/CNAME`.

## 2. Point the domain at GitHub Pages

`gridlockpb.com` resolves to the registrar's parking addresses today. At the
registrar, replace them with GitHub's four Pages addresses and point `www` at
the github.io host:

```
A      @     185.199.108.153
A      @     185.199.109.153
A      @     185.199.110.153
A      @     185.199.111.153
CNAME  www   rwood34683.github.io
```

DNS takes up to a day to settle. Once it has, GitHub issues the certificate
itself; **Enforce HTTPS** under Settings → Pages is set by the workflow.

## Checking it

- `npm run site:check` — the copy, the contact block and the links.
- Open `https://gridlockpb.com/support` and `/privacy`: both are what the
  store listings point at, so they have to be live before a build is submitted
  (`docs/STORE-LISTING.md`).

## Where "Open the app" goes

`site/contact.json` names the live app (`"app": "https://app.gridlockpb.com/"`,
set with `npm run contact -- --app …`). `npm run build` points the three
"Open the app" buttons on the home page, and the one on support and privacy,
at it, so a coach lands in the app his gridlockpb.com account lives in rather
than the offline copy. Take the setting out and the home page opens the offline
copy at `/app/` again. `test/site-links.cjs` holds both.

The committed pages describe the offline copy: no server, an account that is a
lock on the phone. That is still true of `site/app.html`, the Claude preview and
the Grind X and Lockdown builds, so it stays. Beside a live app's button it
would be false, so with `"app"` set the build swaps each passage marked
`<!-- live:name -->…<!-- /live -->` for its text in `scripts/site-live.js`:
the account server, what it keeps, League sync, and Delete account. The build
refuses if a published page still says an offline-only thing, and
`site:check` refuses a marked passage with no live text. Change what the live
app sends up (`docs/SERVER.md`) and change `scripts/site-live.js` with it.

Nothing about the app changes with the site. The app makes no network calls and
never reads the site.

# Publishing the site — gridlockpb.com

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

Nothing about the app changes with the site. The app makes no network calls and
never reads the site.

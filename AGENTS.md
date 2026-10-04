# Gridlock Coach — agent instructions

This file is for coding agents that read `AGENTS.md` (Codex and others).
**`CLAUDE.md` is the full rulebook for this repository and every rule in it
applies to you.** Read it before changing anything; the "Hard rules" and
"Do not" sections are the ones most often broken.

## What this is

A paintball sideline app for coaches and league staff: Playbook, Tally, Scout,
Sightlines and More. Offline-first — the app makes no network calls.

- `web/index.html` — the whole app (one file: state `S`, `set()` / `save()` /
  `render()`). This is the source of truth for the working UI.
- `web/*.js` — native bridge, speech, voice parser, service worker.
- `ios/`, `android/` — generated Capacitor shells. Edit `web/`, then `npm run sync`.
- `site/` — the landing page. `docs/` — the product spec and switch-on notes.
- `layouts/bunkers.json` — measured bunker footprints. `tools/plants.js`
  generates `BREAK_PLANTS`; never hand-edit that block.
- `brand/brands.json` + `scripts/brand.js` — the Gridlock and Grind X builds.

## Run it

```bash
npm install
npm run serve        # http://localhost:5173
```

## Check it

```bash
npm run check        # every suite (functions, devices, offline, brands, …)
node scripts/run-checks.js functions   # one suite
npm run build && npm run site:check
```

The suites drive Chromium through `playwright-core`. Point `CHROME_PATH` at a
Chromium binary if one is not found on its own.

Every change ships with a check in `test/functions.js` (or the suite it
belongs to) and, when it adds a rule, a line in `CLAUDE.md`. A passing suite is
not proof a screen is right — take the screenshot.

## Never

- Use the word `CLAUDE.md`'s first hard rule forbids, anywhere. That
  control is **Shot lanes**.
- Rename a lowercase `gridlock` token (storage keys, `window.gridlock*`,
  `COPY_FORMAT`, the service-worker cache). A coach's season lives under them.
- Add a `fetch`, a credential or an API key to the app.
- Print a percentage or a prediction nobody counted — every read is a count of
  what was logged, with the sample on the line.
- Ship the league's rulebook text inside the app.

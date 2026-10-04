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
- `brand/brands.json` + `scripts/brand.js` — the Gridlock, Grind X and Lockdown builds.

## Working beside Claude

Two agents work on this repository: Claude (Claude Code) and you. To stay on
the same page:

1. **Start from the latest `main`, never from a downloaded zip.** `git fetch
   origin main` and branch from `origin/main` for every task. A zip is a
   snapshot and goes stale within the hour; work built on one has to be redone.
2. **One branch and one pull request per task.** Claude works on
   `claude/…` branches and you on `codex/…` branches; neither pushes to the
   other's branch or to `main` directly. A PR is merged only with `npm run
   check` green in CI.
3. **Read `CLAUDE.md` first, then the newest numbered item under "What to
   build next"** — that list is the record of what was built and why, newest
   last. A rule you add goes in `CLAUDE.md` too, in the same PR.
4. **If a PR of yours is still a draft, say so in its body.** Claude preserves
   open drafts' changes rather than overwriting them, and asks the owner before
   merging one.

### Where things stand (keep this current when you change one)

- **Three builds, one source** (`brand/brands.json`): Gridlock is the default
  and everything committed reads Gridlock; Grind X and Lockdown are generated
  by `npm run brand build <key>`. Never write "Grind X" or "Lockdown" into
  `web/` or `site/` — the build refuses a build that says another build's name.
- **Dependencies** (from Codex, PR #180, merged): Sharp `^0.35.5`,
  brace-expansion 5.0.12, and a scoped `uuid` 11.1.1 override for `xcode` that
  must stay until Xcode's own dependency carries the buffer-bounds fix.
  `test/dependencies.js` pins them; run `npm run test:dependencies` and
  `npm audit` after any dependency change.
- **Tally charts the break in two steps** (CLAUDE.md item 39): 1 · tap where
  each man went (`placeAt`, rows carry `todo`), 2 · tell what happened to each
  (`editBreakout`, `tellBacklog()` walks every untold man on the sheet, the
  point he is on first). Their men placed on Tally feed Scout's five for that
  point (`syncTallyFive`, rows marked `tallied`).
- **The phone shells** (`ios/`, `android/`) are generated: edit `web/`, then
  `npm run sync`, and commit the synced shells with the change — CI checks
  they match `web/` byte for byte.

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

# Handoff verification report

Verified Thursday, Nov 12, 2026, about 3:05 PM America/New_York, against a read-only clone of [rwood34683/Gridlock-](https://github.com/rwood34683/Gridlock-) `main` at `15cd139e` (Merge PR #345, 2:38 PM ET). No push, no PR, no edits to that repo's tracked files.

The handoff **works** in Codex, Claude, and GitHub Actions if they run the checks below against the public repo (and, for the UI proof, a local Chromium). Nothing in our exports had to be fixed.

## How to recheck

From this package:

```sh
git clone --depth 1 --branch main https://github.com/rwood34683/Gridlock-.git /path/to/Gridlock-
python3 tools/verify_handoff.py --repo /path/to/Gridlock-
# Optional UI proof (needs the clone's npm ci and a Chrome/Chromium):
#   cd /path/to/Gridlock- && npm ci
#   GRIDLOCK_REPO=/path/to/Gridlock- node tools/verify_handoff_ui.cjs
```

`tools/verify_handoff.py` checks schema, counts, ID uniqueness, no duplicate games vs the app seed, and no invented jerseys. With `--repo` it also reruns the app's `worldcup_pack.py` (byte diff) and evaluates the app's own `evdUnpack` / `readCopy` / `copyDataError` extracted from `web/index.html`. A sample workflow is in `.github/workflows/verify-handoff.yml` (for this package, not for pushing to Gridlock).

## 1. App loaders (their functions, not a reimplementation)

Extracted from `/workspace/gridlock-verify/web/index.html` and evaluated in Node: `evdUnpack`, `readCopy`, `copyDataError`.

| Check | Result |
|---|---|
| `evdUnpack(event-data.json)` | PASS, `refused=0` |
| Entries / people / observations | PASS 680 / 4,381 / 12,569 |
| Event id | PASS `9322` |
| No `jersey_number` in unpacked data | PASS |
| `readCopy(season-copy-games.json)` | PASS |
| `copyDataError` on `data.games` | PASS |
| Each of 646 game rows | PASS |
| Rejected fields | none |

Report: `verify/app-loaders-report.json`.

## 2. Official packer and importer vs our files

| Tool | Result |
|---|---|
| `python3 -I tools/worldcup_pack.py` on `world-cup-2026/` | Byte-identical to `export/gridlock/event-data.json` (3,606,779 bytes) |
| `node scripts/import-world-cup.js world-cup-2026` | Produced `web/world-cup-data.js` **byte-identical** to the file already shipped in the app (`output_sha256` `4095caeb…`). Decoded event/divisions/entries/locations match our `public_directory` exactly (36 / 680 / 680). Manifest differs only in `built_from` (`handoff` vs `bundle`) and `input_sha256` (source files vs a prior bundle hash). Importer outputs in the clone were restored after the diff. |

## 3. Gridlock test suite / build

`npm ci`, then (no changes to their code; world-cup tests already exercise a bundle identical to importing our package):

| Command | Result |
|---|---|
| `npm test` (dependencies, functions, arrival, arrival-custom, platform, voice-parser, voice, speech-native) | PASS (exit 0). functions 1302/1302; arrival geometry + integration; platform 35/35; voice-parser 40/40; speech-native 18/18 |
| `npm run build` | PASS, 43 files in `dist/` |
| `npm run site:check` | 23/23 passed (store listing IDs still pending, as the app's own check already notes) |
| `node scripts/run-checks.js world-cup` | 19 passed, 0 failed — 680 entries, 592 team IDs, 36 divisions, no people in the public bundle |
| `node scripts/run-checks.js event-data` | 12 passed, 0 failed — packer + `#evd-file` UI path |
| `node scripts/run-checks.js schedule-audit` | 11/11 passed |

Full `npm run check` (every suite in `scripts/run-checks.js`, what `.github/workflows/check.yml` runs) was **not** executed end-to-end. The suites that validate our files and the default `npm test` + build + site check all passed.

## 4. Headless UI import (real `#evd-file` and `loadCopy('merge')`)

Playwright + the app's `scripts/serve.js` against `web/`, seeded season, local Chromium.

| Check | Result |
|---|---|
| Event data via More › Account & backups › `#evd-file` | "Loaded NXL World Cup 2026: 680 entries (680 new, 0 updated), 4381 people (4381 new, 0 updated), 12569 new history rows." |
| `EVD` in the running app | 680 entries, 4,381 people, 592 team IDs, 572 folded names |
| `loadCopy('merge')` of `season-copy-games.json` | "Merged in a copy — new here: 646 games added" |
| `S.games` / `allGames()` | 646 imported; 78 seed + 646 = **724** |
| Schedule UI | 449 team names; "735 things" on the calendar (724 games plus the seeded season's other calendar items) |
| San Diego Dynasty | 9 games; "Play and scout, by the clock" shows next game vs Los Angeles Collision, Fri 8:30 AM, NXL Pro · Pit 1 |
| Page errors | none |

Screenshots (phone viewport 390×844):

- `verify/01-event-data-loaded.png` — Event data card and the Loaded… line
- `verify/02-season-copy-merged.png` — "646 games added" and the Loaded… line
- `verify/03-schedule.png` — Schedule, next game on the full board (Beerkats v Trance)
- `verify/04-schedule-dynasty.png` — Dynasty's day, 9 games, Watch

Also `verify/ui-report.json`.

## 5. Exports

No mismatches. Our files were left unchanged. Recheck command:

`python3 tools/verify_handoff.py --repo /workspace/gridlock-verify` → **35 passed, 0 failed**.

The clone used for this run lives at `/workspace/gridlock-verify` (scratch only; do not commit).

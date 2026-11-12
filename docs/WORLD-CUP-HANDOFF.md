# World Cup schedule and Lone Star film suggestions

Input: `worldcup-2026-handoff` at `ea9320a1e00726bda43c56a36704c14f82b9cdea`.
Read its README, MAPPING and GRIDLOCK-AI-HANDOFF before preparing this import.
That branch stays unchanged. Its private roster/history pack is not added to
this PR, main, a release or a season copy. `gridlock-handoff/` is git-ignored.

## Load it on a coach's device

1. Save a copy of the coach's current season.
2. Download `data/worldcup-2026-season-copy.json` from this PR after review.
3. In the updated app, open **More → Account & backups → Load a copy**.
   Choose that JSON file and tap **Merge it in**. Do not use Replace everything.
4. Open **More → Schedule**, choose **Schedule division**, then the team under **Your team's day**.
   The full list has 722 games unless the coach previously hid some rows or
   added other games. Scout's team cards show the imported suggestions.
5. If League sync is enabled, wait for the account save before opening that
   saved season on another device. This file import grants no new permissions.

This is an explicit import, not a new default season. The release does not
silently add film observations to every coach. The existing event-data loader
is separate: use the private ZIP's `event-data.json` under **Event data**, not
Load a copy. Its loader is unchanged. Never commit that private JSON.

## What maps

- **Schedule:** all 646 supplied additional rows remain in `data.games`.
  The built-in seed actually has 78 rows, with 76 already current. Its Wed
  08:00 Lone Wolf Pit 1 and 09:30 NXL Pro Pit 1 rows now name Rejects.
  Those two are also in the 646-row file. The displayed union is exactly
  **722**, with neither duplication nor deletion of imported source records.
  Seed IDs stay stable for saved sheets and hidden rows; `imp:<game_id>`
  aliases still open the corrected games. Reimport adds nothing.
- **Divisions:** the imported schedule contains 17 published divisions. The
  saved Schedule division filters its team picker, fixtures, calendar games,
  day plan and scouting opportunities. A club's 3v3 and X-Ball fixtures stay
  apart using event/division IDs. All divisions restores the full list;
  unknown divisions stay under Division not recorded. Typed/pasted games use
  the division the coach selected. The selection travels in the season copy.
  The public team directory is also grouped under division headings, keeping
  all 680 entry IDs distinct across its 36 division packages (34 with entries).
  All 680 team/entry/division IDs and names match this handoff. The absence of
  games for another division means its games were not in this schedule pack,
  not that the division has no matches.
  These are public entries, not new Scout rosters. Lone Star film notes keep
  their source team names; no World Cup division is invented for them.
- **Provenance:** each visible fixture retains all original public schedule
  scalars, including `game_id`, event/division/entry/team IDs, null slots,
  source URL, retrieval time, score and status. Original `srcId` and import
  IDs stay intact. No result, out, player check or match is created by import.
- **Scout:** 49 source tendencies become **39 suggested players and 10 team
  notes**, across 20 source team names. Player `name`, `wire` and note use the
  source text. The note includes bunker, usual out/kill, late-point read,
  source games, original jersey text and confidence. `sourceId` is explicitly
  the source canvas ID plus a one-based row ordinal, not a person ID.
  The source contains **21 confidence=VERIFY rows**, plus two other rows with
  VERIFY in their text: **23 rows with VERIFY anywhere**. All wording stays.
- **Numbers:** an unambiguous `#12` becomes `num:"12"` (leading zeros retained).
  `#unknown`, `unknown`, `team`, and `#88 (#08 VERIFY)` never become jersey
  numbers. Their exact source text remains in the note and `sourceJersey`.
  Numbers from other-event match-stat files are not imported.
- **Existing work:** suggestions never replace a coach's player number,
  wire, threat, plant or notes. Matching suggestions append their note once.
  Same jersey alone never joins different people. Team notes append once.
  No threat rating or tendency category is invented.

## Fields not promoted into an app model

| Source | Kept as reference / not mapped |
| --- | --- |
| Schedule `game_id`, `event_id`, `division_id`, `home_entry_id`, `home_team_id`, `away_entry_id`, `away_team_id` | Retained as scalars; the existing schedule still opens by game ID and team name, not a new relational player/team database. |
| Schedule `round`, `score`, `status`, `source_url`, `retrieved_at`, original `date/time/day/field/pit/division/home_name/away_name` | Retained verbatim as reference. The snapshot is Nov 12, 2026, 2:06 PM Eastern, not live scores. Only coach-entered results count in Tally and Reports. |
| 167 playoff slot sides | Names/labels and null IDs retained. Excluded from the Your team chooser; never resolved to an invented club. |
| Rejects sides | `4071649` home, `4071637` away, `4047264` away remain unmatched: entry/team IDs are null. Kept as Rejects, not New Jersey Leverage or a guessed registration. |
| Lone Star `preferredBunker`, `usualOut`, `usualKill`, `latePointClutch`, `sourceGames`, `confidence` | Retained in suggested notes, not measured plants, predictions, ratings or current match observations. |
| Team-level tendency rows | Ten notes on the team; never ten fictitious players named after tactics. |
| Team spelling | Source names stay as supplied. In particular, `Paintball FIT` is not silently joined to `PaintballFIT`; the owner must confirm aliases. D1/Semi-Pro source teams remain separate from the World Cup Pro board. |
| Lone Star elims | All 2,382 rows remain in the original pack only. `row_id`, match/game, point, timestamp, player/playerOut, jersey, team, how/elimType, where/area, break bunker, movement, notes, score and VERIFY fields are not converted into Tally. The pack's original source IDs/VERIFY flags remain untouched. |
| Sat Set 6 field-layout tendencies and movement | Reference only. No replacement of measured layouts, no invented bunker IDs or movement records. |
| Private WC/LSO rosters, people, memberships, profiles, histories, contacts and jersey notes | Not copied into this import or the public app. Event data remains a separate phone-only file. Missing hometowns/profiles/numbers remain missing. |

## Rebuild and verification

`data/worldcup-handoff-2026.json` contains only the public schedule and the
owner-supplied film-tendency source, with its original URLs and read times.
No private roster, history, contact or elimination table is read by this tool.

For the supplied verifier in a clean review checkout, retrieve the original
ignored pack without merging its branch or staging its private files:

```sh
git fetch origin worldcup-2026-handoff
git archive ea9320a1e00726bda43c56a36704c14f82b9cdea gridlock-handoff | tar -xf -
```

```sh
node scripts/import-worldcup-handoff.js --source gridlock-handoff --stamp-seed
node scripts/import-worldcup-handoff.js --check
node scripts/run-checks.js worldcup-handoff
npm run sync
npm run app:artifact
npm run check
npm run build
npm run site:check
python3 scripts/prepare-worldcup-verification.py
python3 gridlock-handoff/tools/verify_handoff.py --repo .
```

The final command belongs to the supplied data pack and also requires its
private `export/gridlock/event-data.json` and `world-cup-2026/people.json`.
They were intentionally omitted from its GitHub branch. The preparation script
recreates the missing people export from the supplied read-only SQLite using
the pack's own `audit_coverage.py` export rules, then uses the app's packer.
It checks the original recorded checksum prefix before accepting that input.
Both files must be git-ignored. No older package is substituted.

Recreated private event-data SHA-256:
`fcb0e23c728bda754384c1b8636b7dde72c8f1ab9a181bdebb2790d089e2d02d`.
The app packer now explicitly reads/writes UTF-8, including under isolated
Python on Windows. A synthetic Unicode name guards that behavior. The app's
event-data loader did not need a change.

## Verification on 12 November 2026

- `npm ci`: passed.
- All 83 repository suites passed across the full run and resumed checks;
  main app 1,302/1,302 and devices 235/235 across 20 devices. The division
  addition initially broke two presentation assertions (the existing coach
  instruction and legacy seed display labels). Both original texts were
  restored, the failed suites rerun unchanged, and all remaining suites run.
  No test or performance limit was weakened.
- Initial handoff regression: 11/11; expanded division regression: 15/15,
  including all 17 division counts, same-club entries, saved division choices,
  reimport, game aliases, explicit reschedules and coach-note preservation.
- `npm run sync`, `npm run app:artifact`, `npm run build`: passed.
- `npm run site:check`: 23/23; existing store listing/signing items remain pending.
- Supplied `verify_handoff.py --repo .`: 35/35; its app-loader harness: 11/11.
- The actual ignored event file loaded through the Event data file input at
  390×844 and 1024×768: 680 entries, 4,381 people and 12,569 history rows, retained
  after reload with no page errors. No live account or service was used.
- The throttled load test stayed within all hard budgets. Final advisory
  `slow` measurements were Tally p95 191.4 ms, Scout p95 113.7 ms,
  Sightlines p95 104.4 ms and sideline taps p50 104 ms.
- The private verification inputs were rebuilt from scratch and both their
  SHA-256 hashes matched the originals. They remain ignored, including backups.

Screenshots in `docs/review/worldcup-handoff/` cover Schedule and Scout at
390×844, 768×1024 and 1024×768. These are browser viewport checks, not physical
device or native store-build tests. Nothing was merged or deployed.

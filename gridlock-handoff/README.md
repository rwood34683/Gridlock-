# Paintball data handoff for Gridlock

Packed Thursday, Nov 12, 2026, afternoon America/New_York, for Rob to give to Gridlock (Scout and Tally, and Gridlock overall). This is the data as we have it, plus a small adapter and a copy-paste prompt so they can fit it into *their* models. It is not a Gridlock app change and not an upload to Claude or Codex.

The proposed scout/tally table under `optional/` is a reference only. It is not the answer, and it is not required.

## What’s in this folder

| Folder or file | What it is |
| --- | --- |
| `world-cup-2026/` | NXL World Cup 2026 (PBLeagues event 9322, Nov 11–15, 2026, Kissimmee, FL, times Eastern). Divisions, team entries, rosters, people, profiles, scored-event history, team locations, sources, coverage/missing audits, schema, SQLite, and the latest public schedule. `coaches.md` is also copied here. |
| `lone-star-open-2026/` | Lone Star Open 2026 (event 9321) film-room data: every elimination row and player list from the Elim Page, player-tendency rows, Sat Set 6 field-layout tendencies, Pro roster allowlist, movement summaries, and the Pro completion table. |
| `shared/` | Jersey-number notes (with the caveat below), public Pro team contacts, and the coaches list. |
| `MAPPING.md` | Field-by-field map onto Gridlock Coach (public repo `rwood34683/Gridlock-`, app `app.gridlockpb.com`). |
| `verify/VERIFY-REPORT.md` | Proof the pack loads in Gridlock's own functions, packer, tests, and UI. Recheck with `python3 tools/verify_handoff.py --repo /path/to/Gridlock-`. |
| `tools/gridlock_adapter.py` | Loader/exporter. `FIELD_MAP` uses Gridlock's names; run it to rebuild both the as-is dump and the matched export. |
| `export/` | As-is: `gridlock-import.json` + `csv/`. Matched: `gridlock-matched.json`, `gridlock-csv/`, and `gridlock/season-copy-games.json`. `export/gridlock/event-data.json` ships in this zip only. It is loaded on the phone from the zip (More > Account & backups > Event data), not from the repo. |
| `optional/` | Our optional proposed tally schema. Use only if it helps after you inspect Gridlock’s models. |
| `live-schedule/` | Saturday, Nov 14, 2026, 6:34 AM ET PBLeagues pull: 1,379 games, standings, and brackets. See [Live schedule](#live-schedule-sat-nov-14-2026). |
| `GRIDLOCK-AI-HANDOFF.md` | Copy-paste prompt for Claude web or Codex desktop. |

## Counts (this pack)

World Cup 2026, from the Nov 8, 2026 data package plus the Thursday, Nov 12, 2026, 2:06 PM ET schedule pull:

- 36 division/package records (34 competition packages with entries + 2 empty College packages on related event 9508)
- 680 team entries (592 distinct club team IDs — the same club can appear in more than one division; don’t collapse 680 to 592)
- 4,381 people; 3,619 current players
- 5,925 roster memberships (Player 4,495 / Staff 1,195 / Coach 208 / Media 27)
- 722 scheduled games (event 9322)
- 1,274 game sides resolved to `entry_id` + `team_id`; 167 playoff/consolation slot labels left unresolved on purpose; 3 real names still unresolved (all “Rejects” in Pro 3v3)
- Player profiles: 1,136 with scored-event history imported, 37 imported with zero rows, **2,446 current players not retrieved**. An earlier start-here note in the same package said 2,645 not retrieved / 974 imported; the later coverage audit in this folder (Nov 8, 8:43 PM ET) is the one to trust.
- 0 published jersey numbers on World Cup rosters (all `jersey_number` values are null; nothing was guessed)
- 0 player hometowns published on retrieved classification pages; 2,446 hometowns also sit in the not-retrieved bucket. Team hometown is a *team* field (671 of 680 entries) and must not be copied onto a player.

Lone Star Open 2026, exported from the published Pages on Thursday, Nov 12, 2026 (Pages themselves last edited the weekend of Nov 1):

- 2,382 elimination rows across 57 matches (51 Pro + a few D1 / Semi-Pro)
- 203 players listed on the Elim Page
- 49 player-tendency rows
- 4 teams on the Sat Set 6 field-layout / tendencies Page
- 753 elim rows have VERIFY in the core film fields (player, jersey, notes, score, how, where). Movement text marks VERIFY on 2,168 rows — most movement is VERIFY. Fri Sets 1–5 (including Fri dual-feed and Fri Set 5) are VERIFY by standing rule (408 of those rows).

## Where each piece came from

**World Cup teams, rosters, people, profiles, history, locations, sources, coverage.** Collected from public and authenticated PBLeagues pages for event 9322, packed Nov 8, 2026. Authoritative current coverage is `world-cup-2026/coverage-audit.json` and `coverage-audit.md`. The SQLite file `world-cup-2026/world-cup-2026.sqlite` is the normalized database (`schema.sql` is the DDL). Schedule rows were added later from the public schedule page.

**World Cup schedule.** Public PBLeagues event page https://pbleagues.com/event/9322/schedule. This pack uses the completed refresh from Thursday, Nov 12, 2026, 2:06 PM ET (`schedule.json`, the spreadsheet and CSV under `world-cup-2026/schedule/`, and the `games` table in SQLite). A 15-minute routine also runs that refresh, so this pack copied the finished files rather than kicking off a second run. Scores are a snapshot, not a live feed.

**Coaches.** `shared/coaches.md` and `world-cup-2026/coaches.md` — names only, as listed on PBLeagues. PBLeagues does not publish coach emails there.

**LSO elims.** Exported from the published Page [Lone Star Open 2026 — Elim Database](https://cursor.com/canvas/store-24ed7f4b-1ee1-4c10-bd00-2f369baa9125/a9406542-765e-4ada-a15f-fbfc39c469cf) (canvas `a9406542-765e-4ada-a15f-fbfc39c469cf`, last updated Sunday, Nov 1, 2026, 11:53 PM ET). JSON/CSV are under `lone-star-open-2026/elims.json` and `elims.csv`. Prefer those over `LSO-2026-Pro-Elims.xlsx`, which is an earlier spreadsheet kept for reference.

**LSO tendencies.** [Lone Star Open 2026 — Player Tendencies](https://cursor.com/canvas/store-24ed7f4b-1ee1-4c10-bd00-2f369baa9125/892f0e63-84f9-4379-b5dd-28b0b07bbdf7) (49 rows; Saturday, Oct 31, 2026, 10:34 PM ET) and [LSO Sat Set 6 — Field Layout & Tendencies](https://cursor.com/canvas/store-24ed7f4b-1ee1-4c10-bd00-2f369baa9125/d5d82279-71bd-47a8-b7a0-8c357cee36b5) (4 teams; Saturday, Oct 31, 2026, 11:01 AM ET).

**LSO rosters.** `lone-star-open-2026/rosters/pro-allowlist.json`, parsed from PBLeagues `showteams` / per-team roster pages for event 9321. Jersey is null in that source.

**LSO movement.** Written summaries and notes under `lone-star-open-2026/movement/` (`fri-summary.md`, `sat-summary.md`, `sunday-summary.md`, plus `notes/`). These are mostly VERIFY. The raw match video is not in this pack (many gigabytes).

**Jersey numbers.** `shared/rosters-numbers.md`. Names for LSO Pro come from the allowlist. The `#` values come only from public 2026 NXL Pro match-stat pages (Tampa Bay Open event 9198 and Mid-Atlantic Open event 9319) that actually printed a number. Players with no printed `#` are marked `no #`. Nothing was guessed.

**Public contacts.** `shared/pro-team-contacts.csv` / `.xlsx` — public emails and social links only, looked up Nov 10, 2026.

## Verified vs VERIFY

- World Cup source hashes and foreign keys were audited (`coverage-audit.json`, SQLite integrity ok). Coverage is still incomplete where we say so.
- World Cup game scores are whatever PBLeagues had posted at 2:06 PM ET on Nov 12, 2026 (Final, unofficial, forfeit, or “no score posted”).
- LSO elim rows that we could read cleanly on film and that are not under a standing VERIFY rule can be treated as film-supported. Rows stay flagged VERIFY when the notes, name, jersey, score, how, or where contain VERIFY, when movement could not be tied cleanly, or when the match is Fri Sets 1–5 (standing rule in `pro-completion-table.md`).
- Movement fields are VERIFY on almost every row that has them. Do not promote movement to verified without a new film pass.
- Tendency `confidence` is either `film-only` or `VERIFY` as published on that Page.

## Known gaps

- **No World Cup jersey numbers.** Every WC `jersey_number` is null. Do not fill them from LSO, from match-stat numbers for other events, or by guessing.
- **2,446 World Cup current-player profiles not retrieved** (use this figure; an older 2,645 count is stale). Hometown is also unpublished or not retrieved; never copy a team hometown onto a player.
- **Playoff slot labels** on the World Cup schedule (for example “WNXL Semifinals - 2”) are placeholders: `entry_id` and `team_id` are null, and `home_slot_label` / `away_slot_label` keep the slot text.
- **“Rejects” in Pro 3v3** is a real team name on three games (4071649 home, 4071637 away, 4047264 away) that we could not match to a Nov 8 `teams.json` entry in that division. Left unresolved on purpose.
- **16 World Cup schedule filters still have no games posted:** Referee Open 3v3 X-Ball, Division 3/4/5 5v5, Female - WNXL Amateur 5v5, Amateur 10v10, Mounds - Open 10v10, Mounds - Open 7v7, Youth Advanced 5v5, Female - WNXL 3v3, Open 3v3, Amateur 3v3, Intermediate 3v3, Novice 3v3, Youth 3v3, Intermediate 3v3 X-Ball. College packages in `teams.json` are empty related event 9508 records, not missing schedule rows.
- **LSO Fri Sets 1–5** (Fri dual-feed + Fri Set 5) ship as VERIFY by rule, even when a final score is on the Page.
- **LSO movement is mostly VERIFY.**
- Practice event 9510 is not in the World Cup schedule workbook.

## Live schedule (Sat Nov 14, 2026)

`live-schedule/` is the Saturday field/time grid and team lookup from the PBLeagues pull at 2026-11-14 06:34 ET (`games.json`, 1,379 games). Brackets (`brackets.json`) keep placeholder slots pending until PBLeagues fills them. Standings (`standings.json`) are computed from posted prelim Finals only: 2 points for a win, 1 for a tie, and they are unofficial. The scoresheet export uses the Gridlock Tally out shape `{pt, side, name, at, m, script, layout:'nwc', vs, how?, by?}`. Keep PBLeagues game IDs, because Saturday 5v5 was reticketed. Never invent jersey numbers or hometowns.

## How to join the IDs

- World Cup: `division_id` → `entry_id` (a registration row in that division) → roster members → `person_id`. `team_id` is the club and can appear in more than one division.
- World Cup games: `game_id` → `home_entry_id` / `away_entry_id`. If those are null, use the slot label; don’t invent a team.
- LSO elims: one row is one elimination (or a marked gap/summary row). Join on `match` + `player` + `team`/`jersey`. Tendencies point back at games via `sourceGames`.

## How Gridlock should load this

1. Read `GRIDLOCK-AI-HANDOFF.md` and paste it into Claude or Codex with this folder attached.
2. Inspect Gridlock’s existing Scout and Tally models first.
3. Recheck against the app: `python3 tools/verify_handoff.py --repo /path/to/Gridlock-` (see `verify/VERIFY-REPORT.md`). Then run `python3 tools/gridlock_adapter.py` to rebuild the as-is dump and the Gridlock-shaped files. `export/gridlock/event-data.json` is loaded on the phone from the zip (More > Account & backups > Event data), not from the repo. Import `export/gridlock/season-copy-games.json` as a season copy for the schedule rows the app does not already seed.
4. Write an importer into *their* models. Keep our source IDs and VERIFY flags. Report unmapped fields. Do not invent numbers or hometowns.

## In the zip, not in the git repo

These three files stay in the zip only:

- `export/gridlock/event-data.json` is loaded on the phone from the zip (More > Account & backups > Event data), not from the repo.
- `export/gridlock-import.json` (over 25 MB).
- `world-cup-2026/people.json` (over 25 MB).

## What is not in this pack

- Lone Star and World Cup match video, broadcast files, and clip chunks (many GB).
- Raw World Cup browser captures and original PDFs (`authenticated/`, `sources/`, `pdf-sources/`). Sanitized HTML source views are in `world-cup-2026/clean-source-views/`.
- The older standalone `world-cup-2026.zip` / `world-cup-2026-gridlock-web.zip` (this pack replaces them for Gridlock).
- An earlier SQLite backup from before the schedule was added.

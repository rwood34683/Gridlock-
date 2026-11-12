# Gridlock AI handoff prompt

Copy everything under the line into Claude (web) or Codex (desktop) with this folder attached or extracted next to your Gridlock project.

---

You are working in Gridlock (including the Scout and Tally side). I am handing you paintball data as we already have it. Fit this data into Gridlock however you see fit. Do not treat any proposed schema in this pack as Gridlock’s schema or as a requirement.

## What’s in the pack

The folder is a Gridlock handoff dated Thursday, Nov 12, 2026 (America/New_York).

- `README.md` — plain-English inventory, counts, sources, verified vs VERIFY, and known gaps. Read it first.
- `world-cup-2026/` — NXL World Cup 2026, PBLeagues event 9322 (Nov 11–15, 2026, Kissimmee, FL, Eastern times). Teams, rosters, people, profiles, scored-event history, team locations, sources, coverage/missing audits, `schema.sql`, `world-cup-2026.sqlite`, and the latest public schedule (`schedule.json`, spreadsheet/CSV under `schedule/`, `games` table in SQLite). Schedule snapshot: Thursday, Nov 12, 2026, 2:06 PM ET, 722 games.
- `lone-star-open-2026/` — Lone Star Open 2026 (event 9321) film-room exports: `elims.json` / `elims.csv` (2,382 rows), player-tendency JSON/CSV (49 rows), Sat Set 6 field-layout tendencies (4 teams), `rosters/pro-allowlist.json`, movement summaries under `movement/`, and `pro-completion-table.md`.
- `shared/` — `rosters-numbers.md` (jersey numbers with a hard caveat), public Pro contacts, coaches names.
- `tools/gridlock_adapter.py` — dependency-free Python that loads the pack into one structure and can export `export/gridlock-import.json` plus per-entity CSVs. It has a clearly marked `FIELD_MAP` you can edit.
- `optional/` — an optional proposed scout/tally table and template. Reference only. Ignore it if Gridlock already has models that cover this.

## ID keys and join paths

World Cup (stable IDs; preserve them):

- `event_id` 9322.
- `division_id` → `event_entries.entry_id` (a registration row in that division; there are 680 entries and 592 distinct `team_id` clubs — never collapse those).
- `entry_id` → roster (`rosters.json` / `roster_memberships`) → `person_id` → `people`.
- `games.game_id` → `home_entry_id` / `away_entry_id` (and `home_team_id` / `away_team_id`). When a playoff placeholder is still on the board, those IDs are null and `home_slot_label` / `away_slot_label` holds the slot text (for example “WNXL Semifinals - 2”). Do not invent a team for a slot.
- Role is a first-class field (Player / Coach / Staff / Media). Don’t mix staff into player counts.
- `classification_score_as_published` is a classification score, not a game score.
- Team location is a team field, not a player hometown.

Lone Star Open elims:

- One row is one elimination (or a clearly marked gap/summary row). Keys are `match` (also aliased as `game`), `point`, `timestamp`, `player` (from `playerOut`), `jersey`, derived `team` when a known club name could be read from the jersey/team string, `how` (`elimType`), `where` (`area`), `break_bunker`, `moves`, `notes`, plus `verify_flag` / `verify_reasons`.
- Join an elim row to a player, a team, and a match using those fields. Tendencies join on player/team/jersey and `sourceGames`.
- Keep VERIFY flags. Fri Sets 1–5 (Fri dual-feed and Fri Set 5) are VERIFY by standing rule. Movement is mostly VERIFY.

## What I want you to do

1. Inspect Gridlock’s existing Scout and Tally models (and any related schedule, roster, or film models) first. Use those as the target.
2. Write an importer that maps this data into *those* models. You may run `python3 tools/gridlock_adapter.py` and edit `FIELD_MAP` in that script so exported field names match yours. `export/gridlock-import.json` is a convenient combined dump; the original files remain the source of truth if anything conflicts.
3. Keep our source IDs (`entry_id`, `team_id`, `person_id`, `game_id`, LSO `row_id`, source URLs, `retrieved_at`).
4. Keep VERIFY flags, confidence values, nulls, and slot labels. Do not silently drop them.
5. Never invent jersey numbers or hometowns. World Cup rosters have no published jersey numbers (all null). Numbers in `shared/rosters-numbers.md` come only from other 2026 NXL Pro match-stat pages and must stay attributed to those sources, not copied onto World Cup or LSO roster records as if they were published there. Never copy a team hometown onto a player.
6. Do not invent scout/tally events or fill empty optional tally templates. Those templates are empty on purpose.
7. After mapping, report every unmapped field (ours that you did not place, and any Gridlock field you could not fill). `export/unmapped-fields.json` is a starting list from the adapter, not the final report.
8. If a value cannot be matched — including the three “Rejects” Pro 3v3 World Cup sides, playoff slot labels, and not-retrieved profiles — leave it unmatched and list it. Do not guess.

## Optional reference (ignore if not useful)

`optional/proposed-game-tallies.sql` and `optional/proposed-scout-tally-template.json` sketch a game → entry → person tally row (`game_id`, `entry_id`, `point_no`, `player_person_id`, `event_type`, `bunker`, `timestamp`, `source`, `confidence`). This was drafted only as a possible shape. Prefer Gridlock’s own Scout and Tally models.

## Known gaps to preserve, not “fix”

- No World Cup jersey numbers.
- 2,446 current-player profiles not retrieved (trust `coverage-audit.json`, not any older 2,645 figure).
- Playoff slot labels; “Rejects” unmatched in Pro 3v3; 16 World Cup schedule filters still have no games posted (listed in README.md).
- LSO Fri Sets 1–5 VERIFY; LSO movement mostly VERIFY.

Work from this folder. Don’t scrape logins or cookies. Don’t claim Gridlock already understands a schema it hasn’t adopted.

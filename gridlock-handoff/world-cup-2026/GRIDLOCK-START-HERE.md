# Gridlock handoff — NXL World Cup 2026

Standalone start file for Rob. Attach this folder or ZIP next to your Gridlock work in **Claude (web)** and **Codex (desktop)**. This is a portable data handoff, not a repository change and not an upload to either service.

Generated: 2026-11-08T20:22:05-05:00 (America/New_York). Authoritative current coverage is `coverage-audit.json` / `coverage-audit.md`. Historical process notes remain in `IMPORTING.md`; do not treat older snapshots there as current.

## What this package is

Event: **NXL World Cup**, **November 11–15, 2026**, Kissimmee, Florida. PBLeagues event **9322**. Related empty NCPA packages: event **9508**. Practice event 9510 excluded.

This dataset is for presenting and querying:

**divisions → team entries → rosters → player details / scored-event history / sources / missing flags**

Stable IDs, source URLs, retrieval timestamps, nulls, and access/status values must be preserved. Do not invent hometowns, jersey numbers, transfers, attendance, or career history.

## Presentation model (use this order)

1. **Event** — `events` / `teams.json` → `event` (id 9322, dates, timezone).

2. **Divisions / packages** — `divisions` / `teams.json` → `divisions` (36 records: 34 competition divisions with entries + 2 empty college packages on 9508).

3. **Team entries** — `event_entries` / `teams.json` → `teams` (**680** registration rows; **592** distinct source team IDs). Same club can appear in multiple divisions; never collapse 680 into 592 unique “clubs” as if they were one entry each.

4. **Team location** — `team_locations.json` / `team_location_observations` (published team hometown / home field when present). This is **team** location, not a player hometown.

5. **Rosters** — `rosters.json` / `roster_memberships` + `roster_access`. Roles are separate: Player / Coach / Staff / Media. Empty authenticated roster ≠ blocked access; blocked/missing must stay explicit.

6. **People** — `people.json` / `people` (**4381** people). Keep display vs legal/name variants; do not overwrite one with the other.

7. **Player details & history** — `player_profiles.json`, `person_event_history.json`. Classification scored-event tables only; **not** full career, **not** verified attendance. `classification_score_as_published` is a classification score, **not** a game score.

8. **Sources & missing** — `sources.json`, `coverage-audit.*`, `missing-items.json`, `validation.json`. Every claim should stay source-linked; unfinished fields stay flagged.

## Authoritative current coverage (live DB + audit)

| Metric | Count |
| --- | ---: |
| Competition divisions with entries (9322) | 34 |
| Division/package records including empty college | 36 |
| Registration entries | 680 |
| Distinct source team IDs | 592 |
| People | 4381 |
| Memberships (all roles) | 5925 |
| Player memberships | 4495 |
| Staff / Coach / Media memberships | 1195 / 208 / 27 |
| Distinct current players | 3619 |
| Modern roster views audited | 680 |
| Legacy roster views audited | 680 |
| Roster access: authenticated_event_roster | 602 |
| Roster access: authenticated_empty_roster | 78 |
| Player profiles imported (this snapshot) | 974 (950 with rows + 24 explicit zero-event) |
| Player profiles not retrieved | 2645 |
| Canonical structured evidence profiles | 828 |
| History observations | 10501 |
| Participation index rows (source-deduped) | 7389 |
| Unresolved event/team history cells | 0 |
| PDF ancillary cells still NULL | 0 |
| Team hometown observations (nonempty raw) | 671 |
| Team home-field name observations (nonempty) | 453 |
| Player hometown published in retrieved profiles | 0 (status: not published / not retrieved) |

Audit overall: `source_checks_pass_but_requested_enrichment_incomplete`. Issues: none.

Warnings retained:
- Not every current player has supplied scored-event profile history.
- Player hometown coverage is incomplete/unpublished; no hometown inferred.

Jersey numbers are NULL wherever unpublished. Player hometown is never copied from team hometown.

## Files to prefer

Full package (Codex desktop / any local tool):

- `GRIDLOCK-START-HERE.md` — this file
- `README.md` — broader package docs (may contain older narrative sections; prefer this file + `coverage-audit.*` for current counts)
- `schema.sql` — DDL / relationships
- `world-cup-2026.sqlite` — normalized DB
- `teams.json`, `rosters.json`, `people.json`, `player_profiles.json`, `person_event_history.json`, `team_locations.json`, `sources.json`
- `coverage-audit.json`, `coverage-audit.md`, `missing-items.json`, `validation.json`
- `schedule.json`, `scout-tally-template.json` — World Cup schedule + proposed scout/tally template (see Scout & tally below)
- `clean-source-views/` + `clean-source-views.json` — sanitized portable source views (not raw session captures)

JSON-first / smaller web-oriented subset (same provenance fields, no SQLite binary, no clean-source-views bulk): `world-cup-2026-gridlock-web.zip`.

## How to supply to Claude (web) vs Codex (desktop)

Do **not** assume either product accepts a ZIP or SQLite upload in every UI. Capabilities and upload limits change; inspect what your current session actually allows.

**Claude (web)** — practical approach:

1. Extract the ZIP on your computer (or use the smaller JSON-first ZIP).
2. Attach or paste what the session accepts: prefer `GRIDLOCK-START-HERE.md`, `schema.sql`, `coverage-audit.md`, `teams.json`, and other JSON exports you need. If the session accepts folder/file uploads, give the extracted folder. If SQLite cannot be attached, use the JSON exports + schema; do not invent a converter that drops provenance.
3. Use the Claude prompt below. Tell Claude the real names of the files you attached.

**Codex (desktop)** — practical approach:

1. Extract the full ZIP to a stable local folder.
2. Point Codex at that folder path.
3. Use the Codex prompt below with the absolute path filled in.
4. Prefer read-only SQLite access when available; otherwise use the JSON files. Do not modify the handoff files unless Rob asks.

Neither prompt should claim the app already understands this schema. Inspect the actual Gridlock app/code first, then map.

---

## Copy/paste prompt — Claude (web)

````text
You are helping integrate the attached NXL World Cup 2026 paintball dataset into the existing Gridlock app that is already open in this Claude project/session.

Rules:
- First inspect the files I attached (especially GRIDLOCK-START-HERE.md, schema.sql, coverage-audit.md/json, teams.json, and any roster/people/history JSON). Then inspect the actual Gridlock app/code available here before mapping anything.
- Presentation order: divisions → team entries → rosters → player details / scored-event history / sources / missing flags.
- Preserve all stable IDs, source URLs, retrieval timestamps, nulls, and status/access fields. Do not invent or fill missing data.
- Never guess player hometown or jersey numbers. Never copy team hometown onto a player. Jersey is NULL unless published.
- classification_score_as_published is a classification score, not a game score. person_event_history is classification scored-event participation only — not a full career, not verified attendance, not inferred transfers.
- Keep Player / Coach / Staff / Media distinct. Keep display vs legal/name variants distinct.
- Multi-entry relationships matter: one team_id can appear in multiple divisions; use entry_id for a specific registration row.
- If you write queries or integration code, use parameterized queries and preserve provenance on every record.
- Treat coverage-audit.* and missing-items.json as authoritative for what is imported vs remaining. Do not mark enrichment complete while profiles remain not_retrieved or fields are unpublished.
- If a needed file was not attached, ask for it instead of reconstructing from memory.
````

---

## Copy/paste prompt — Codex (desktop)

````text
Local handoff folder: REPLACE_WITH_ABSOLUTE_PATH/world-cup-2026

Integrate this NXL World Cup 2026 dataset into the existing Gridlock app on this machine.

Steps:
1. Read REPLACE_WITH_ABSOLUTE_PATH/world-cup-2026/GRIDLOCK-START-HERE.md and coverage-audit.md.
2. Inspect schema.sql and, if usable, open world-cup-2026.sqlite read-only (or use the JSON exports).
3. Inspect the actual Gridlock app/code in this workspace before mapping fields.
4. Map into Gridlock using: divisions → team entries → rosters → player details / history / sources / missing flags.
5. Preserve IDs, source URLs, timestamps, nulls, and status enums exactly. No guessed hometowns or jerseys. Do not treat classification scores as game scores. Do not treat classification history as full career or attendance.
6. Maintain multi-entry relationships (entry_id vs team_id). Keep roles and name variants separate.
7. Use parameterized queries for any DB/API integration. Cite source/provenance fields in outputs.
8. Use missing-items.json / coverage-audit.json for unfinished coverage; do not claim completeness beyond those files.

Do not upload this data anywhere and do not modify the handoff folder unless I explicitly ask.
````

---

## Quick local checks (optional)

```sh
sqlite3 -readonly world-cup-2026.sqlite "SELECT history_status, COUNT(*) FROM person_profile_observations p WHERE EXISTS(SELECT 1 FROM roster_memberships r WHERE r.person_id=p.person_id AND r.role='Player') GROUP BY 1;"
```

```sh
python3 - <<'PY'
import json
print(json.load(open('coverage-audit.json'))['player_history_statuses'])
PY
```


## Scout & tally

Added 2026-11-12 from the public PBLeagues schedule (event 9322). This is a data handoff into Gridlock, not a claim that Gridlock already has scout/tally code.

**Schedule.** `schedule.json` (and the `games` table in `world-cup-2026.sqlite`) lists every posted World Cup game. Refresh with:

```sh
python3 schedule/refresh.py
```

That re-fetches `https://pbleagues.com/event/9322/schedule` (no login), rewrites `schedule.json`, the `games` table, `schedule/games.json`, and the spreadsheet/CSV under `schedule/`.

**Game → entry → roster join.** Each game has `home_entry_id` / `away_entry_id` and `home_team_id` / `away_team_id` resolved against `teams.json` **within the game's division** (schedule names like "Pro X-Ball" map to packages like "Pro X-Ball (Thu-Sun)"; Championship packages that play inside a parent division are also tried). `entry_id` is the registration row for that division; `team_id` is the club and can appear in more than one division. From an entry, join `rosters.json` (or `roster_memberships`) for coaches and players (`person_id`). The `game_teams` view is one row per side for that join.

Playoff placeholders such as "WNXL Semifinals - 2" or "Division 3 Consolation A" stay unresolved: `entry_id` and `team_id` are null, and `home_slot_label` / `away_slot_label` holds the published slot text. Do not invent a team for those rows.

A scheduled-job refresh of the public schedule will not invent hometowns, jerseys, or tally events.

**Proposed scout/tally schema.** `scout-tally-template.json` is keyed by `game_id` and includes empty `tallies` arrays. `schema.sql` defines a `game_tallies` table (`game_id`, `entry_id`, `point_no`, `player_person_id`, `event_type` such as elim / kill / point_won / penalty, `bunker`, `timestamp`, `source`, `confidence`). **This is a proposed schema only.** This package does not include Gridlock's own scout/tally code, and `refresh.py` does not populate tally rows. When you record a tally, store `game_id` plus the side's `entry_id` and, when known, `player_person_id` from that entry's roster.

## Safety

Portable ZIPs exclude raw authenticated browser captures, raw PDFs, cookies, and session artifacts. Sanitized derivatives live under `clean-source-views/`. Do not ship credential material.

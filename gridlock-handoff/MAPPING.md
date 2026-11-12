# Gridlock field mapping

This maps our handoff onto **Gridlock Coach** as it actually stores and loads data — not a guessed schema, and not PB Scout / Breakout / Bunker Buddy.

Sources read (2026-11-12, America/New_York), all read-only:

- Public repo [rwood34683/Gridlock-](https://github.com/rwood34683/Gridlock-) (`main`, commit `c9e6166e` / PR #344 “tally-scout-field”, pushed later the same afternoon).
- Live app [https://app.gridlockpb.com/](https://app.gridlockpb.com/) (Gridlock System · Coach Edition). Public HTML/JS only; no sign-in.
- In-repo tools the app already uses: `scripts/import-world-cup.js`, `tools/worldcup_pack.py`, `tools/worldcup_2026.py`.
- Season validator `copyDataError` / `KEEP_ALL` / `defaultState` in `web/index.html`.
- Cloud copy format `gridlock.coach.copy` (`public.seasons.payload`); table/column **names** only from `supabase/migrations/202610300001_safe_season_sync.sql`.

What did not have the model: Cursor Origin namespace `rob-3` (no repos); user-Vercel MCP (`list_teams` empty; `list_projects` 403 on default team `clear-cue1`, not retried); GitHub MCP and Supabase MCP both `needsAuth`. No env **values** were read.

## How data lands in the app

Gridlock keeps three stores. They are not interchangeable.

| Store | Kind / key | What goes here | How to load from this pack |
|---|---|---|---|
| Public World Cup directory | Bundled `web/world-cup-data.js` (and the older `WCUP` block) | Event, divisions, entries, team locations. **No people.** | Already in `world-cup-2026/teams.json` + `team_locations.json`. In the Gridlock repo: `node scripts/import-world-cup.js world-cup-2026`. |
| Event data (rosters, people, history) | `kind: "gridlock.event.data"` `v: 1` · IndexedDB `gridlock.coach.eventdata` | Entry rosters, people, scored-event history. Never part of a season copy or an app release. | Load `export/gridlock/event-data.json` on a phone: **More › Account & backups › Event data**. Packed with the app's own `tools/worldcup_pack.py`. |
| Coach season (Scout + Tally + schedule he adds) | `format: "gridlock.coach.copy"` `v: 1` · `gridlock.coach.v2` | Roster, `scout`, `tally`, `matches`, `games`, calls, breakouts, etc. | Import a season copy, or paste games. A fragment with only `data.games` is valid. The app already **seeds 78** Pro / Sat Semi-Pro championship rows (print schedule, Wed 11–Sat 14 Nov, cut off Sat 3:30 PM, read 1 Nov). Our 722-game pull is the full live board (retrieved 12 Nov 2026, 2:06 PM ET). |

Do not dump login-only rosters into the public directory or into a season copy. The app's own rule (10 Nov 2026): those records are for the coach's event-data file only.

---

## 1. Public directory (`import-world-cup.js` `PUBLIC` allowlist)

`entries` are read from `teams.json` → `teams` (not a key named `entries`). `locations` are read from `team_locations.json` → `observations`.

### event

| Our field (`teams.json` `event`) | Gridlock field | Transform / gap |
|---|---|---|
| `name` | `name` | identity |
| `year` | `year` | identity |
| `event_id` | `event_id` | identity (`"9322"`) |
| `start_date` | `start_date` | identity |
| `end_date` | `end_date` | identity |
| `timezone` | `timezone` | identity (`America/New_York`) |
| `source_urls` | `source_urls` | identity; only public `pbleagues.com/event/…` or `nxlpaintball.com/…` URLs are accepted |
| `related_events[]` | `related_events[]` | each picked to the related-event allowlist below |
| `practice_event_excluded` | `practice_event_excluded` | identity |

Related event: `event_id`, `name`, `start_date`, `end_date`, `source_url`, `team_list_url`, `listed_team_count`.

### divisions

| Our field | Gridlock field | Transform / gap |
|---|---|---|
| `event_id` | `event_id` | identity |
| `division_id` | `division_id` | identity |
| `name` | `name` | identity |
| `group` | `group` | identity |
| `classification` | `classification` | identity |
| `signed_up` | `signed_up` | identity |
| `limit` | `limit` | identity |
| `format_rules` | `format_rules` | identity |
| `listed_count` | `listed_count` | must equal the number of entries in that division |
| `source_url` | `source_url` | public event URL only |
| `retrieved_at` | `retrieved_at` | identity |
| `paid` | — | **gap:** present on our rows, not in `PUBLIC`; left out of the shipped directory |

The WCUP block (`tools/worldcup_2026.py`) is a coarser committed list: `{id: "wcup-"+division_id, name, teams: [[team_name, REG]]}` with `REG` = Payment Accepted→`PAID`, Pending - Pay→`PEND`, Pay Entry Fee→`DUE`, Registration Deadline Passed→`LATE`. A club in two divisions is **one team name** in that block (name is the key). Prefer the `world-cup-data.js` importer for IDs.

### entries (from `teams[]`)

| Our field | Gridlock field | Transform / gap |
|---|---|---|
| `event_id` | `event_id` | identity |
| `division_id` | `division_id` | identity |
| `division` | `division` | identity |
| `format` | `format` | identity |
| `format_rules` | `format_rules` | identity |
| `bracket` | `bracket` | identity |
| `team_name` | `team_name` | identity |
| `team_id` | `team_id` | identity |
| `entry_id` | `entry_id` | identity (unique) |
| `registration_status` | `registration_status` | identity in the directory (`Payment Accepted`, etc.). The WCUP block maps to `PAID`/`PEND`/`DUE`/`LATE`. |
| `source_url` | `source_url` | must be a public event/team-list URL, **not** a roster-page URL |
| `retrieved_at` | `retrieved_at` | identity |
| `event_roster_token`, `roster_url`, `bracket_source_url`, `bracket_retrieved_at`, `team_location` | — | **gap / excluded on purpose.** Roster links and tokens are login-only. Location is a separate table. |

### locations (from `team_locations.observations`)

| Our field | Gridlock field | Transform / gap |
|---|---|---|
| `entry_id` | `entry_id` | identity; must exist in entries |
| `team_id` | `team_id` | identity |
| `hometown_raw` | `hometown_raw` | identity |
| `hometown_city` | `hometown_city` | identity |
| `hometown_region` | `hometown_region` | identity |
| `hometown_country` | `hometown_country` | identity |
| `home_field_name` | `home_field_name` | identity |
| `home_field_location_raw` | `home_field_location_raw` | identity |
| `location_status` | `location_status` | identity |
| `retrieved_at` | `retrieved_at` | identity |
| `source_url`, `source_file` | — | **gap:** not in `PUBLIC.locations` |

---

## 2. Event data (`gridlock.event.data` v1)

Packed file: `export/gridlock/event-data.json`. Load on the device; do not commit it to the Gridlock repo.

Top-level: `kind`, `v`, `event`, `coverage`, `str` (interned strings), `src`, `divs`, `entries`, `members`, `people`, `obs`.

### event (packed)

| Our field | Packed field | Notes |
|---|---|---|
| `event.event_id` | `event.id` | string |
| `"NXL World Cup " + year` | `event.name` | constructed |
| `event.start_date` / `end_date` | `event.start` / `event.end` | identity |
| `teams.retrieved_at` | `event.read` | identity |

### divs

`[division_id, name, event_id, signed_up]` per division.

### entries[entry_id]

| Our field | Packed field | Notes |
|---|---|---|
| `team_id` | `team` | identity |
| `division_id` | `div` | identity |
| `team_name` | `name` | identity |
| `registration_status` | `reg` | full published wording, not `PAID` |
| `roster_url` | `url` | kept in the **private** event-data file only |
| `source_url` | `src` | identity |
| `retrieved_at` | `at` | identity |
| `team_location.hometown_raw` | `loc.town` | |
| `.hometown_city` / `_region` / `_country` | `loc.city` / `region` / `country` | |
| `.home_field_name` | `loc.field` | |
| `.home_field_location_raw` | `loc.fieldAt` | |
| `.location_status` | `loc.status` | default `not_retrieved` |
| location `source_url` / `retrieved_at` | `loc.src` / `loc.at` | |
| `rosters[].status` | `roster.status` | required on every entry |
| roster `source_url` / `retrieved_at` | `roster.src` / `roster.at` | |

Unpacked on the phone (what Scout / pit cards read): `id, event, team, div, divName, name, reg, url, src, at, loc, roster, members`.

### members (rows)

`[entry_id, person_id, str(name), str(role), str(classification), str(checked_in), source_id]`

Unpacked member: `{pid, name, role, cls, inn, src}`.

| Our field | Gridlock | Gap |
|---|---|---|
| `person_id` | `pid` | identity |
| `name` | `name` | interned |
| `role` | `role` | expected: Player, Coach, Staff, Media |
| `classification` | `cls` | interned |
| `checked_in` | `inn` | interned |
| `source_id` | `src` | only if cited in `sources` |
| `jersey_number` | — | **gap:** packer leaves jerseys out (all WC values are null). Use `shared/rosters-numbers.md` separately; those numbers are from 2026 NXL Pro match-stat pages (TBO 9198, MAO 9319), not WC/LSO rosters. |
| `age_as_published`, `registration_fee_paid`, `person_event_link`, `event_person_token`, `section`, local paths | — | **excluded on purpose** |

### people[person_id]

Packed array: `[str(name), is_current_event_player 0/1, str(history.status), str(hometown.status), hometown-or-null, history source_id, variants[]]`.

Unpacked: `{id, name, player, hist, home, town:{raw,city,region,country,src}, histSrc, variants:[{name,kind,src}], obs:[]}`.

A hometown is included only when that person's own page published `hometown.raw`. Never copy the team's hometown onto the person.

### obs[observation_id]

Packed: `[person_id, date, event_name, event_id, event_url, team_name, division, place, classification_score, classification_context, role, participation_basis, source_id]`.

Unpacked: `{id, date, event, eventId, url, team, div, place, score, ctx, role, basis, src}`.

Classification scores are not match scores.

### src

`source_id → [str(url), retrieved_at]`, only sources something cites.

---

## 3. Season schedule games (`S.games` / `SCHEDULE.games`)

Gridlock game row (required by `copyDataError`): non-empty strings `id`, `d`, `t`, `h`, `a`. Other values must be scalars. The UI also reads `f` (field · pit), `dv` (division), `g` (A–D prelim group only), `layout`, and `seed` (league rows only).

League seed ids are `sch:{d}|{t}|{foldName(h)}|{foldName(a)}` with `foldName` = lowercased, collapsed whitespace. Coach-added rows in this pack use `imp:{game_id}`.

`layout` for this event is `nwc` (NXL World Cup · Kissimmee).

| Our field (`schedule.json` games) | Gridlock field | Transform / gap |
|---|---|---|
| `date` | `d` | identity (`YYYY-MM-DD`) |
| `time` | `t` | `"7:00 AM"` → `"07:00"` (same clock rules as `clockOf` in the app) |
| `home_name` | `h` | if empty, `home_slot_label`; a row with no name and no slot is omitted |
| `away_name` | `a` | same with `away_slot_label` |
| `field` + `pit` | `f` | `"NXL Pro · Pit 1"` (field · Pit N), matching the seed's spelling |
| `division` | `dv` | identity |
| `round` | `g` | only if the text is an A–D prelim group; otherwise `""`. Putting `"Prelims"` in `g` would print as "Prelims Prelims". |
| `game_id` | `id` | `imp:{game_id}` on coach-added rows |
| — | `layout` | always `nwc` for this event |
| `score`, `status` | `score`, `status` | **extra scalars allowed by the validator, not read by the current UI.** Scores live on a match sheet (`results`), not the schedule list. |
| `home_entry_id`, `home_team_id`, `away_entry_id`, `away_team_id` | — | **gap:** schedule rows are keyed by team **name**, not entry/team id. IDs stay on the public directory / event-data entries. |
| `home_slot_label` / `away_slot_label` | used as `h`/`a` when the name is empty | placeholder sides; not a registered team |
| `day`, `event_id`, `division_id`, `source_url`, `retrieved_at` | — | not on a game row. Event/division ids live on the directory. |
| `game_id` vs seed | overlap | The app seeds **78** Pro / Sat Semi-Pro championship rows (print schedule, read 1 Nov). Our 12 Nov 2:06 PM ET pull matches **76** of them on day+clock+both names. The other two seed rows are stale names: Wed 11 Nov 8:00 AM Lone Wolf Pit 1 seed `New Jersey Leverage v ZuriCaos` is live `Rejects v ZuriCaos`; Wed 11 Nov 9:30 AM NXL Pro Pit 1 seed `New Jersey Jesters v New Jersey Leverage` is live `New Jersey Jesters v Rejects`. Import **`games_not_in_app_seed`** (646 rows) to avoid doubling the 76 still-current seed games. Replacing `SCHEDULE.games` in the app source was not done. |

A season fragment is in `export/gridlock/season-copy-games.json`:

```json
{"format":"gridlock.coach.copy","v":1,"app":"Gridlock Coach","data":{"games":[...]},"at":"..."}
```

Importing it merges into the coach's season. It does not replace the 78 seeded `SCHEDULE` rows; it only adds `S.games`. Use the de-duplicated list.

Watch / We play them opens a **match sheet** (`S.matches`), it does not turn a schedule row into a tally by itself.

---

## 4. Scout and Tally (season records — live coaching)

These are what the coach logs on the sideline. They are **not** filled from the World Cup package automatically. Event data can pre-fill a pit-card roster (`from: "published"`); published names are not treated as film.

### Season copy envelope

`{format:"gridlock.coach.copy", v:1, data:{...}}`. Optional `at`, `app`, `scope`. `data` may only use keys in `KEEP_ALL`. Cloud RPC also requires this format, `data` as an object, label ≤ 60 chars, payload ≤ 2 MB.

Kept keys: `roster`, `scout`, `teams`, `division`, `left`, `right`, `tally`, `breakouts`, `calls`, `moves`, `assessments`, `walk`, `codes`, `arrivalSightings`, `arrivalShots`, `voiceEvents`, `playerChecks`, `lineups`, `matches`, `matchId`, `results`, `pens`, `timeouts`, `bunkerCalls`, `playerCalls`, `breakCalls`, `jobCalls`, `plays`, `offPlays`, `games`, `gamesOff`, `teamCode`, `direct`, `pathEdits`, `classes`, `responses`, `groups`, `blasts`, `blastTo`, `messages`, `point`, `layoutKey`, `script`, `callPicked`, `matchState`, `playGone`, `fields`, `renamedMen`, `renamedTeams`, `fmt`, `fmts`, `calEvents`, `calKinds`, `myTeam`, `fmtDone`.

### scout (map keyed by team name)

Default profile: `{tend, threat, notes, players[], breaks[], answers{}, unscored}`. Tendency is `Snake` / `Dorito` / `Balanced`. `threat` is 1–5 when scored; unscored reads as a dash, not a guessed 3.

Scout player: `{name, wire, note, threat, num, plant{}}`. `num` may be string or number. `plant` is a string map.

Scout break (logged opponent break): `{plants[str], at, pt, ...scalars}` including `m` (match id).

Pits: `left` / `right` `{name}`. A name is required before anything is logged against a team.

### tally (list of outs)

Written as `{pt, side, name, at, m, script, layout, vs, how?, by?, ...}`.

| Field | Meaning |
|---|---|
| `pt` | finite number; point of this sheet |
| `side` | `"us"` or `"them"` |
| `name` | man out (roster name, or `#N` for an unnamed opponent) |
| `at` | epoch ms |
| `m` | `matchId` |
| `script` | the break that was called |
| `layout` | layout key (`nwc`, `lso`, …) |
| `vs` | opponent team name (`matchVs()`) |
| `how` | optional; UI values: Laned, Traded, Run-through, Snake crawl, Bounce, Unknown |
| `by` | optional; who got them |

One man may be out only once a point. This is **not** a film-elim table.

### matches

`{id, at, vs, layout, watch?, home?, away?, sched?, when?, bracket?, raceTo, breakClock, splitDeck, deckClock, gameTime, mercy, size, game, div, end, swapEnds, flips[]}`. `sched` links back to a game `id`. `watch:true` is a game the coach is not in.

### results

`{m, pt, won}` with `won` ∈ `us`/`them`.

### breakouts

Required: `id`, `m`, `layout`, `bunker` (non-empty strings), `side` ∈ `us`/`them`, integer `pt` > 0, `at`, optional `alive` boolean, optional `route:[{x,y}]`.

### roster (your squad)

`{name, p?, s?}` plus other scalars (`num`, etc.).

### Other season entities (no source in this pack)

`calls`, `moves`, `assessments` (score 1–5), `pens` (`cost` 1–4, `who`, `why`), `timeouts`, `arrivalSightings` / `arrivalShots`, `voiceEvents` (`kind` ∈ out/move/hit/note), `playerChecks`, `lineups` (key `matchId|point`), `plays`, `fields`, `calEvents`, `fmt` / `fmts`, `myTeam`, `teamCode`. See `copyDataError` in `web/index.html`.

Cloud tables (column **names** only): `public.seasons` (`owner`, `label`, `payload`, `updated_at`, `revision`, `deleted_at`); `public.entitlements` (`user_id`, `plan`, `expires_at`, `source`, `updated_at`); `public.gridlock_admin_audit`. Writes go through `gridlock_write_season`.

---

## 5. Lone Star film (not a Gridlock import format)

There is **no** LSO elim or tendencies importer in the app. The layout key `lso` exists for the field. The rows below are suggested alignments only. They are **not** a valid season copy and must not be merged silently. Many LSO elims are VERIFY / film-only; player is often `"unknown"`.

### elims → not tally

| Our field | Closest Gridlock field | Gap |
|---|---|---|
| `point` | `tally.pt` / `breakouts.pt` | ours can be a string (`"1"`) |
| `player` / `playerOut` | `tally.name` / `breakouts.player` | often `"unknown"` |
| `team` | `tally.vs` or a pit name | no `side` (`us`/`them`) |
| `how` / `elimType` | `tally.how` | ours is lowercase (`lane`); UI expects `Laned`, `Traded`, … |
| `where` / `area`, `break_bunker` | `breakouts.bunker` | free text / 5-wide team break, not a layout bunker id |
| `timestamp` | `tally.at` | film clock text (`file ~0:56 \| clock 10:00`), not epoch ms |
| `match` / `game` | `matches` / `tally.m` | a label, not a Gridlock match id |
| `score_after` | `results` | in-progress text, not a point winner |
| `jersey` | `scout.players[].num` | sometimes holds a team name in this export |
| `verify_flag`, `moves`, `notes` | — | no equivalent required field; notes could be appended |

Missing to mint a real tally row: `side`, `m` (match id), `layout`, `script`, `at` as a number, and a named man.

### tendencies → scout.players (suggested only)

| Our field | Gridlock field | Gap |
|---|---|---|
| `team` | `scout` map key (team name) | must match a pit / board name |
| `player` | `players[].name` | identity |
| `jersey` | `players[].num` | e.g. `"#1"` |
| `roleLane` | `players[].wire` | free text, not a controlled wire enum |
| `notes` + `usualOut` / `usualKill` / `latePointClutch` / `preferredBunker` / `sourceGames` / `confidence` | `players[].note` (concatenated) or profile `notes` | no first-class fields. `confidence: film-only` is not a Gridlock value (`unscored` is the closest idea). Do not invent `threat` or `tend`. |

### field layout

Sat Set 6 field-layout canvas (4 teams, 11 seeds) is not `fields[]` / `LAYOUTS.lso`. The app already has a measured LSO layout. **Gap.**

---

## 6. Files this mapping produced

| File | What |
|---|---|
| `export/gridlock-matched.json` | Public directory tables, Gridlock-shaped games (all + not-in-seed), load instructions, gaps, LSO suggestions (no invented outs). |
| `export/gridlock/event-data.json` | `gridlock.event.data` v1, ready to load on a phone. |
| `export/gridlock/season-copy-games.json` | `gridlock.coach.copy` with de-duplicated `data.games` only. |
| `export/gridlock-csv/*.csv` | Per-entity CSVs in Gridlock field names. |
| `tools/worldcup_pack.py` | Copy of the app's packer, for a later package refresh. |
| `tools/gridlock_adapter.py` | `FIELD_MAP` now names Gridlock fields; `--matched` export is the default extra output. |

`export/gridlock-import.json` remains the as-is (our-shaped) dump.

## 7. Still not in Gridlock's model

- Our `schedule.json` entry/team ids on each side of a game.
- Playoff placeholder sides as real teams.
- Live scores/status on the schedule UI.
- Sunday and non-Pro games in the **built-in** seed (they are in our 722 and in `S.games`).
- LSO elims / tendencies as a first-class import.
- Jersey numbers on WC or LSO Pro rosters (none published).
- A public API under `/api` (the coach web app makes no `fetch` from `index.html`; cloud is a native adapter).

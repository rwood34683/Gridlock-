# NXL World Cup 2026 public team and event-roster database

## Event and scope
The actual upcoming event is **November 11–15, 2026**, Kissimmee, Florida, PBLeagues **9322**, not the 2025 event. Authoritative NXL page: https://www.nxlpaintball.com/world-cup . PBLeagues event: https://pbleagues.com/event/9322 ; team list: https://pbleagues.com/event/9322/teams .

All **680 registrations across 34 competition divisions** have been extracted, including Championship groups, Pro, WNXL, all divisional X-Ball and small formats, Classic Mounds, Commander's Cup and youth. There are **592 distinct source team IDs**, because teams can enter multiple divisions. Do not call 680 unique clubs.

The separate NCPA @ NXL World Cup event **9508**, November 14–15, is included as event/division metadata: https://pbleagues.com/event/9508 and https://pbleagues.com/event/9508/teams . Both College X-Ball entry-package divisions show zero registrations; its team page has no teams. Practice event 9510 is excluded: practice slots are not competing team entries. The NXL marketing page mentions Veterans International, but no separate Veterans International division appears among event 9322's published registration divisions; do not infer its participants or equate it to Commander's Cup.

## Files
- `world-cup-2026.sqlite`: normalized SQLite database; no dependencies required to read it with Python's sqlite3.
- `schema.sql`: schema and `player_rosters` view.
- `teams.json`: event metadata, 36 division/package records (34 main + 2 empty college), and 680 event registration entries in `teams`.
- `rosters.json`: one access/result record per event entry, including source URL, timestamp, access status, and members when publicly visible.
- `teams.md`: readable complete team list and division totals.
- `sources.json`: exact URLs, retrieval timestamps (America/New_York, explicit offset), local HTML paths, HTTP status and SHA-256 hashes.
- `sources/`: saved public HTML, no photos downloaded.
- `validation.json`: totals, source status counts, duplicate checks and database checks.
- `collect.py`, `build_database.py`: local extraction/build scripts, not a repository integration. Collector uses cached pages and sequential requests with a 0.65-second minimum pause between new requests; it never signs in or follows player/profile/payment links. Re-running the collector reuses the existing source cache, not a fresh event snapshot; run the builder afterward to restore college metadata.

## Roster access / limitations
Roster outcome counts: `{"public_event_roster": 30, "public_empty_roster": 24, "login_required": 626}`. Roles across available rosters: `{"Coach": 36, "Player": 271, "Staff": 159}`; 429 distinct published person IDs. All 680 roster links were checked. Of 54 publicly readable event-roster pages, 30 contain published members and 24 explicitly show zero members in visible roster tables (`public_empty_roster`). These are empty published snapshots, not proof the teams have no players. Login-gated/denied/otherwise unreadable results have `members: null`, `member_count: null`, and an explicit status, **not an empty roster**. `no_public_members_visible` means the HTML has no public member table; it is not proof that the team has no players.

Available records are the **event-specific roster pages linked directly from this event's team list**, not a season list or a substitute. They are pre-event roster listings, not proof the people attended: `checked_in` is copied literally. Coach/Staff/Player roles remain separate. No jerseys are published in the parsed member tables; `jersey_number` is NULL everywhere. No name, jersey or player identity is inferred from film, namesakes, legacy pages or previous events. No individual player profiles, addresses, emails or pictures are collected.

Registration labels preserved exactly: `{"Payment Accepted": 562, "Pending - Pay": 13, "Registration Deadline Passed": 21, "Pay Entry Fee": 84}`. The event summary reports 575 paid while 562 entry rows say Payment Accepted and 13 say Pending - Pay; both source representations are retained rather than silently treating pending as accepted. Registration Deadline Passed is preserved, not relabeled withdrawn. No published withdrawal label was observed in this team list. Some formats remain open for registration near/during the event, so this is a timestamped public snapshot and can change; it is not final attendance or guaranteed complete private rosters.

Each of the 34 main-division row counts was checked against its advertised Signed Up count; total matches 680. College totals match zero. Duplicate checks are in `validation.json`; entries are never silently merged by team name. Stable IDs: `teams.team_id` is the page's published opaque `data-etid`/ETID; `event_entries.entry_id` is the numeric registration-row `data-id`; `roster_token` is the event-roster ERID in its URL; `people.person_id` is the numeric public roster row's `data-id`. Never substitute an ERID for a team ID. Division IDs are the team page's published IDs, with the two college IDs from event 9508. Names as published are retained in event entries and memberships even if one source ID appears with spelling differences. `teams.name`/`people.name` use the first observed label, not an independent canonical identity assertion. `bracket` contains only distinct nonempty published `data-group` labels from that entry's own event-roster schedule; NULL if absent. Its separate source URL/time (or database `bracket_source_id`) cites that roster page; no match scores or schedule times were extracted. `format_group` and `format_rules` copy the registration summary, not inferred match rules.

## Claude Code and Codex
Download/extract the ZIP into a directory those tools can access. This box path is **not automatically available on your own computer**. No installation, cloud upload or repository modification has been done. In either tool, give the actual local path, for example:

> Read `/absolute/local/path/world-cup-2026/README.md` and query `/absolute/local/path/world-cup-2026/world-cup-2026.sqlite` read-only. Use `player_rosters` for players only. Show access status before declaring a roster empty, preserve source citations and timestamps, and never invent missing jerseys.

If the SQLite CLI is installed:
```sh
sqlite3 -readonly world-cup-2026.sqlite
```
Example SQL:
```sql
-- Count all entries by division, including zero-entry college packages.
SELECT d.event_id,d.name,COUNT(e.entry_id) AS entries
FROM divisions d LEFT JOIN event_entries e USING(division_id)
GROUP BY d.division_id ORDER BY d.event_id,d.name;

-- Players only, with provenance.
SELECT * FROM player_rosters WHERE team_name='San Diego Dynasty';

-- Access limitations, not "empty rosters".
SELECT e.team_name_as_published,d.name,a.status,s.url,s.retrieved_at
FROM roster_access a JOIN event_entries e USING(entry_id)
JOIN divisions d USING(division_id)
LEFT JOIN sources s ON s.source_id=a.source_id
WHERE a.status<>'public_event_roster';

-- Preserve players, coaches and staff separately.
SELECT e.team_name_as_published,r.name_as_published,r.role,r.jersey_number
FROM roster_memberships r JOIN event_entries e USING(entry_id)
WHERE e.team_name_as_published='Edmonton Impact';
```
Python standard-library example:
```python
import sqlite3
con = sqlite3.connect('file:world-cup-2026.sqlite?mode=ro', uri=True)
print(con.execute('SELECT COUNT(*) FROM event_entries').fetchone()[0])
```

## Current authenticated import status

{"authenticated_event_roster": 602, "authenticated_empty_roster": 78}

This section supersedes the initial public-only counts above. See `validation.json`, `import-report.json`, and `IMPORTING.md` for live coverage, legacy Media limitations and offline importing. The original public snapshot remains in `public-snapshot/`.

## Scored-event history checkpoint

1173 current players have imported scored-event classification profiles; 2446 remain without imported history. This is not complete career history. See coverage-audit.json for source-linked status.

## Coverage audit status

source_checks_pass_but_requested_enrichment_incomplete

Modern coverage 680/680; legacy 680/680. **Do not claim every requested field is complete.** Player hometown/history coverage and all open limitations are in `coverage-audit.md`, `coverage-audit.json` and `missing-items.json`. `people.json` explicitly includes actual source-linked history observations and hometown/status fields per person.

## Portable source safety

Raw browser captures remain unchanged on the box and are NOT included in this portable ZIP. `clean-source-views/` contains source views with scripts, form controls, iframes and event handlers removed. `clean-source-views.json` maps every original source ID/URL/time/hash to its separately hashed sanitized derivative. SQLite source paths/hashes document original captures; use this mapping for portable source viewing. No cookies, session files, credentials, hidden form controls or browser transport PDFs are packaged.

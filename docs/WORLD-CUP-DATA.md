# NXL World Cup 2026 data package in Gridlock

The owner's package (PBLeagues event 9322, read 8 Nov 2026) has two parts,
and the two go to different places.

| Package | Where it lands in Gridlock | How |
|---|---|---|
| `teams.json`: divisions, entries, registration | Scout › Division › NXL World Cup 2026 (`WCUP`, committed) | `python3 -I tools/worldcup_2026.py <pkg> --write` |
| `rosters.json`: event roster per entry | Pit card › the team's entries › Show the roster | `tools/worldcup_pack.py`, then loaded on the phone |
| `people.json`: person IDs, name variants, hometown/history status | Pit card › a person | same file |
| `person_event_history.json`: published scored-event rows | Pit card › a person › history table | same file |
| `sources.json`: URL and read time | the Source line under each record | same file |
| `coverage-audit.json`: counts and statuses | More › Account & backups › Event data | same file |

Team names are published registration data and are committed. Rosters,
people and histories come from login-only pages and include minors, so they
are **never committed and never part of the app's source or a season copy**.
They live only in the file the coach packs and loads onto his own phone.

```sh
python3 -I tools/worldcup_pack.py /path/to/world-cup-2026 ~/wc-event-data.json
```

On the phone, go to More › Account & backups › Event data and choose that
file. To update it, pack a newer package and load that file the same way.

## Rules the import keeps

- **IDs.** Entry, team, division, person, source and observation IDs are kept
  exactly as published. Records are keyed by these IDs, so loading a file
  again updates records in place. It never adds a second copy.
- **Entries in two divisions.** A team entered in two divisions has two
  entries. Each is shown separately with its own roster. They are linked by
  name and by team ID.
- **Name matches.** People are never matched by name alone. Putting players on
  a card matches by person ID only. A card man with the same name and no ID is
  left alone, and the app says so.
- **Hometowns.** A person's hometown is shown only when that person's own page
  published one. The team's location is labelled as the team's.
- **Missing data stays missing.** No jersey numbers are published, so none
  are shown. Where a roster or history was not read, the app says "unknown". It
  never shows that as an empty roster or as no history.
- **History.** History is published classification and scored-event
  participation. It is not a complete career and not a record of transfers.
- **Classification scores** are not match scores.
- **Newer files.** If a newer file has not read something that an older file
  had, the older reading stays. An entry missing from the newer file is kept
  and marked.
- **Left out of the file.** Ages, a person's payment state, personal roster
  links and tokens, and local file paths and hashes.

The SQLite database named in the package README is not in the zip. The JSON
exports hold the same records, and the packer reads those.

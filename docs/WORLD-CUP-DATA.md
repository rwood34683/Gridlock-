# World Cup 2026 team directory

More › World Cup teams lists who entered the NXL World Cup 2026 (PBLeagues
event 9322), from the owner's supplied snapshot. Scout › Division has the same
shortcut. Narrow the division, search a team, division or team hometown, and
open an entry. Back keeps the list and search. The directory is reference
data: it does not replace a coach's roster, opponent, schedule, notes or
season.

## What ships

Only public team and event fields, named one by one in `PUBLIC` in
`scripts/import-world-cup.js`:

| Table | Rows | Fields |
|---|---|---|
| `divisions` | 36 (34 with entries, 2 empty NCPA packages) | event and division ID, name, group, classification, signed up, limit, format rules, listed count, the event page and its read time |
| `entries` | 680 entries from 592 team IDs | event and division, format, bracket, team name, team ID, entry ID, registration status, the event's team-list page and its read time |
| `locations` | 680 | team hometown, home field and location status, with the read time |
| `event` | 1 | event name, dates, time zone, the public event pages and the related NCPA event |

A club entered in two divisions keeps two entries. Counts are unchanged from
the snapshot: no entry was merged or deduplicated.

## What does not ship

**Player rosters are not included.** The owner confirmed on 10 November 2026
that there is no written permission to redistribute the imported PBLeagues
player records. So the app's files carry none of the following:

- player names or individual profiles;
- roster memberships linking people to teams;
- player histories, classifications, ages or birth information;
- person IDs, name variants, profile-access records or roster comparisons;
- login-only source records, roster-page links and tokens (`/team/roster/…`,
  `EPID`), local file paths, or registration or payment details about a person.

The importer reads `teams.json` and `team_locations.json` only. It copies a
field only when `PUBLIC` names it, so a field added to a future handoff stays
out until someone adds it on purpose. It refuses an address in a public field
that is not a public event page.

The entry screen says "Player rosters are not included." It never shows an
omitted roster as an empty team. To scout a team's players, a coach adds them
on the pit card from what he sees, or pastes a roster he has.

Earlier builds and older downloaded copies did carry those records. This
change stops them shipping from now on. It does not erase copies already
downloaded, or the repository's history.

## Refreshing the snapshot

Extract a new owner-supplied handoff to a separate folder and run:

```sh
node scripts/import-world-cup.js /path/to/world-cup-2026
npm run sync
npm run app:artifact
npm run check
```

When the handoff is not on this machine, the public file can be rebuilt from
an existing bundle, through the same allowlist:

```sh
node scripts/import-world-cup.js --from-bundle web/world-cup-data.js
```

The current file was made this way on 10 November 2026, from the earlier
bundle. Input hashes, the allowlist, row counts and the output hash are in
`data/world-cup-2026-manifest.json`. The owner's original handoff is never
modified and is never part of the app.

The file uses column tables, exact string references and a deterministic gzip
stream, decoded with the bundled [fflate 0.8.3](https://github.com/101arrowz/fflate/releases/tag/v0.8.3)
(MIT, notice in `web/fflate-LICENSE.txt`). It is decoded once, when the
directory opens. It never goes into localStorage, the native season mirror,
season exports or League sync. It is cached with the app shell for offline use.

## Tests

`test/world-cup.cjs` decodes the shipped bundle and checks every row against
the allowlist. It confirms that no person table or roster link remains, and
that the counts above hold. It also checks that a rebuild reproduces the
file. It runs the importer on a synthetic handoff full of made-up people and
checks that none of them reach the output. Then it drives the directory on
phone and tablet sizes, offline and in the one-file app.
`test/league-badges.cjs` checks that no league badge ships.

# World Cup 2026 team directory

More › World Cup teams opens the owner's supplied PBLeagues snapshot. Scout ›
Division has the same shortcut. Search a team, person or team hometown, narrow
the division, then open a registration entry and a roster member. Back keeps
the list and search. The directory is reference data: it does not replace a
coach's roster, opponent, schedule, notes or season.

The input was `world-cup-2026-gridlock-web (1).zip`, SHA256
`6a3e3d47bc9f5db2bb8131ea7e1e0b09e33a05464ecd664482f5fb744f29134d`.
The package's coverage audit is dated 8 November 2026 at 20:21:19 Eastern.
This is the supplied snapshot, not a fresh scrape or a claim that an entry
will attend. No database or account service is changed.

The directory preserves 680 entries, 592 distinct team IDs, 36 division/package
records (34 with entries), 5,925 memberships and 4,381 people. Player, Coach,
Staff and Media are distinct. The roster union retains names seen in either
source view, with both source IDs. 602 rosters contain names and 78 were empty
when read. Empty is not withdrawn or access denied.

It also retains all 10,501 history observations, 7,389 participation-index
rows, 12,417 name variants, 1,177 profile-access records, 3,231 sources,
6,500 missing-field records and the per-entry roster comparison records.
Repeated copies of the same classification event record are grouped only
for display, retaining every observation and source. Classification scores
are labeled as such. 950 players have history rows, 24 have retrieved pages
with zero scored events and 2,645 have not been retrieved. No jersey or
player hometown is invented; team locations remain team locations.

Four roster fields read from login-only pages are not shipped:
`age_as_published`, `registration_fee_paid`, `person_event_link` and
`event_person_token`. The importer drops them (`PRIVATE_FIELDS`) and takes
the person token (`EPID=`) out of every source address, keeping the entry's
own (`ERID=`). The bundle is public to anyone who loads the app, and the
snapshot includes minors. `test/world-cup.cjs` fails if any of them returns.

## Refreshing the supplied snapshot

Extract a new owner-supplied handoff to a separate directory and run:

```sh
node scripts/import-world-cup.js /path/to/world-cup-2026
npm run sync
npm run app:artifact
npm run check
npm run build
npm run site:check
```

The importer reads JSON only and does not run anything from the handoff. It
checks IDs, foreign references, division counts and role totals against the
coverage audit. Input hashes, output hash and table counts are recorded in
`data/world-cup-2026-manifest.json`. The original handoff remains unchanged.
Raw captures, SQL, PDFs and handoff instructions are not executable app code.
Historical process reports are not presented as newer coverage evidence.

The generated file uses column tables, exact string references and a
deterministic gzip stream. The pinned [fflate 0.8.3](https://github.com/101arrowz/fflate/releases/tag/v0.8.3) decoder is bundled locally
with its MIT license. Decode/index construction happens once, on opening the
directory. Neither the dataset nor its indexes go into localStorage, the
native season mirror, season exports or League sync. Only the temporary
search/view state is attached to `S`, through `clearScratch`.

All source URLs are displayed only as user-activated HTTPS links to PBLeagues
or NXL, with no embedded credentials and `noopener noreferrer`. Source sites
may require sign-in. The app makes no roster requests. Static files are
cached with the app shell, and the standalone and offline-preview packagers
inline them. The encoded source names remain exact in all brand builds.

The screenshot and device checks use synthetic local accounts. No live coach
account, Supabase setting, hosting setting or production deployment is needed
to verify this directory.

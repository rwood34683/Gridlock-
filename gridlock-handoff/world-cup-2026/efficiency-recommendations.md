# Efficient World Cup enrichment — public research and offline audit

## Best potential shortcut: authorized promoter export

PBLeagues explicitly advertises to **league promoters**: “Download a complete copy of your player data, anytime!” It also describes restricting private contact data and classification sharing. Source opened this turn: https://pbleagues.com/linfo.html .

That is a documented supported bulk-download capability, but **not proof Rob's participant account has it**, not a published endpoint, and not proof the export includes cross-league history or player hometown. The most valuable next step is an authorized normal export from NXL/the promoter or PBLeagues, limited to required player IDs, names, event memberships, hometown city/region/country if lawfully shareable, and participation history if included. No one was contacted and no access requested or purchased.

Three public web searches and three page reads did not establish a published PBLeagues participant-facing history API, all-players history view, or self-service bulk history export. This is a research result, not a claim that no vendor API exists. https://pblidb.org/ advertises a queryable API but the opened landing page provides no endpoint documentation, official affiliation, access scope or World Cup/history coverage; it is not a verified authoritative replacement.

PBLeagues' official contact guidance says classification rules vary by league and roster/history entries can be wrong; it lacks paper attendance records for all leagues: https://mlpb.pbleagues.com/contacts . Thus classification scored-event tables must not be represented as complete careers or verified attendance. No contacts were sent.

## What the existing queue already avoids

- 3,619 unique people, unique primary URLs and unique EPIDs: zero duplicate primary requests.
- 1,337 observed alternate URLs are retained as provenance, not automatically requested again.
- 146 current-player profiles already imported, leaving 3,473 at this snapshot.
- `efficiency-remaining-queue.json` is a separate inspection snapshot, NOT a replacement for the actively owned browser queue. Do not assign its in-flight next-200 entries to another worker.
- Importer skips unchanged successful source hashes, gates new regular files on the browser manifest's status=ok, and reads browser manifests/remaining lists without writing them.
- Saved native combined Event/Team and normalized split-column tables both parse; exact ERID/EPID bindings avoid name guessing.
- Three offline saved-page tests produced 12, 12 and 6 rows with linked events and required fields, in about 0.12 seconds total. This tiny sample is not a full-run benchmark, but suggests browser collection, not table parsing, is the bottleneck.

## Next best plan while export availability is unresolved

1. Leave the active browser's next-200 batch alone; retain one owner per queue item and respectful existing request pacing.
2. Capture each remaining player's already observed normal page only once. Retry an alternate observed URL only for a genuine failed/unreadable result, not to duplicate successful people across divisions.
3. Import completed batches incrementally, rather than reimporting all 680 roster sources. Use `import_player_histories.py`; run the complete audit/package at batch milestones, not after each individual page. All raw provenance stays preserved.
4. Keep profile capture outcome separate from parsing outcome. A successful page capture is not successful extraction until schema/identity/zero-event checks pass.
5. Player hometown is absent from all 146 imported classification views. Fetching more copies of that view must not be presented as a hometown solution. An authorized different source/export is needed; otherwise keep hometown unpublished/not retrieved.
6. Do not claim “all teams ever played on”: these pages contain scored-event classification contexts, not documented full-career histories.

## Realistic timing

The supplied observed end-to-end pace is 25 profiles in 9 minutes. At that unchanged pace, 3,473 remaining profiles take about **20 hours 50 minutes**, and a 200-profile batch about **72 minutes**. This is an illustrative extrapolation from one batch, including overhead—not a promised ETA or a measured intrinsic site limit. Recalculate from the next completed batch before promising completion. A normal authorized bulk export is the only researched supported path with potential to remove the thousands-of-pages bottleneck; its availability and included fields remain unverified.

No browser, cookies, session files, credentials or undocumented APIs were accessed. No browser manifests were modified.

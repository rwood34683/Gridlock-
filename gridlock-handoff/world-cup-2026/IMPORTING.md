# Offline authenticated roster importing

No browser/session/cookie access or network requests are performed by this importer. It consumes only ordinary browser-saved pages or normal exports supplied to the package directory.

## Parent: final/checkpoint command

```sh
python3 /workspace/paintball/world-cup-2026/import_saved_rosters.py --directory /workspace/paintball/world-cup-2026/authenticated --package
```

Run this at checkpoints and at 6:10 PM ET, after completed saves. Do NOT run collect.py or build_database.py after authenticated imports: those public-only tools now refuse to overwrite the enrichment. SQLite, JSON, schema, validation and ZIP are updated by the importer. Re-running with the same files is idempotent: it replaces each affected entry's combined roster, rather than adding duplicate memberships. New source documents are retained by content hash in authenticated/archive/. Previous complementary modern/legacy views are retained even when a partial manifest is supplied.

Recognized default filenames:
- `roster-<ERID>.html` — modern event roster DOM
- `legacy-roster-<ERID>.html` — legacy event roster DOM

ERIDs must match registered team-list links. Unknown filenames are ignored, not guessed. Do not import a page still being saved. Original public records are preserved under public-snapshot/, with the public sources unchanged under sources/.

## Other HTML/text/PDF/normal export files

Use `--manifest /absolute/path/manifest.json`. All artifacts must reside under this package folder. Example:

```json
{"files":[{"file":"authenticated/roster-NjOIyMLK8WSac4M1.html","entry_id":"236224","source_url":"https://pbleagues.com/team/roster/NjOIyMLK8WSac4M1","retrieved_at":"2026-11-08T17:32:00-05:00","kind":"modern"}]}
```

This example entry_id matches the saved Baltimore sample; for other teams use their IDs from login-required-queue.json. Relative paths resolve against the manifest's directory. `source_url` must equal that entry's actual modern URL or observed legacy URL, not a made-up export endpoint. Timestamps must carry an offset. The default filename scan uses file-save mtime, explicitly labeled `saved_file_mtime` rather than claiming a separately observed retrieval time.

Supported table exports: JSON list (or `{ "members": [...] }`) with name and role; CSV with name and role headers; tab-delimited or two-or-more-spaces-separated text/PDF tables with explicit Name and Role columns. PDF uses installed `pdftotext -layout`. Person IDs, checked_in, registration_fee_paid, jersey_number and person_event_link are optional and copied only if present. Plain flowing browser text with ambiguous row boundaries is rejected: supply HTML or a normalized JSON export instead of guessing. Missing source person IDs produce explicitly `local:` entry-scoped IDs; names are never used to merge people between teams. Player/Coach/Staff/Media roles must be explicit. A login wall or a page without recognizable roster tables is rejected, never treated as an empty roster.

## Identity, modern versus legacy coverage

Modern display names remain the primary membership labels. Legacy longer names are stored as `legacy_name_as_published` plus `person_name_variants.variant_kind='legacy_full_name'`; the source does not independently certify they are legal names. Numeric public person IDs and EPID links bind observations, never approximate name matching. Legacy classification and age are copied literally; age is not converted to birthdate. Jersey numbers remain NULL unless explicitly present in a supplied export.

The modern event view exposes Coach/Player/Staff but can omit Media. Modern-only imports mark `source_coverage.media='not_retrieved_in_modern_roster'`; this does not assert no Media exist. Legacy imports add published Media rows and preserve separate source provenance. A successful import uses `authenticated_event_roster`; explicitly visible empty tables use `authenticated_empty_roster`. Public login status remains in public-snapshot/ and the original 626-entry queue.

## Location and history enrichment

`team_locations.json`, `teams.json[].team_location`, and `team_location_observations` contain location observations parsed from ALL 680 cached public pages, not inferred from nationality or player addresses. Home Town raw text is preserved; comma-separated city/region fields are structural parses, not geocoded/validated locations. Country is the published flag title inside the Home Town row, not independent residence verification. Home field name and location come from the Field row.

Coverage: 671 entries publish hometown; 453 publish a home field; 9 publish neither. Missing values are NULL with `not_published_in_retrieved_page`. Player hometown and historical teams were NOT retrieved from individual profiles: `person_profile_observations` has explicit `not_retrieved` statuses and NULL hometown fields; `person_team_history` has no asserted records. Current World Cup memberships are not a claim about prior team history. Never copy team hometown to player hometown.

Example SQL:
```sql
SELECT e.team_name_as_published,l.hometown_raw,l.hometown_country,
       l.home_field_name,l.home_field_location_raw,s.url,s.retrieved_at
FROM team_location_observations l JOIN event_entries e USING(entry_id)
JOIN sources s ON s.source_id=l.source_id;

SELECT r.name_as_published,r.legacy_name_as_published,r.role,
       r.classification,r.age_as_published
FROM roster_memberships r JOIN event_entries e USING(entry_id)
WHERE e.team_name_as_published='Baltimore Nevermores';
```

## Individual-player public-link check

One actual player link (Brandon Cornell) was tested without authentication; it leads to a Player Classification login wall, not a publicly readable hometown/history page. See `player-profile-research.json` and `person_profile_access`. No further profile requests or guessed profile endpoints were attempted. Player hometown/history remain not_retrieved, not absent. This one sample does not prove every individual profile is blocked. The authenticated roster browser was not accessed.

## Updated batch naming and final command

Both `roster-<numeric_entry_id>.html` and `legacy-roster-<numeric_entry_id>.html` are recognized, in addition to the earlier ERID filenames. Numeric entry-ID files take precedence over duplicate early ERID samples. Captured URL/time comments are used for retrieval time when present. `saved_at` is accepted in collection manifests. All entry IDs and links are checked against the original team list.

Final/checkpoint command, including roster import, history import, refreshed validation and ZIP:
```sh
python3 /workspace/paintball/world-cup-2026/finalize_checkpoint.py
```

`import_player_histories.py` reads only supplied `authenticated/person-*.html` and `profile-*.html` files with an actual rosterclass source URL comment. The ERID/EPID must bind to an observed roster membership. It parses only classTable event rows, not nested scoring-detail tables. It retains classification contexts and score strings, which are classification points—not game scores. Repeated event/team participation across contexts is deduplicated in `person_team_history`; full source-context observations remain in `person_event_history`. These are scored-event participation records, not a complete career, transfer chronology, historical role assertion or hometown source. No hometown is inferred from a historical team. These commands make no network requests.

`person-profile-queue.json` is an object with `count` and `people`: one observed profile URL per distinct current-event Player, plus observed alternatives. `person-profile-other-roles-queue.json` separately holds people with only Coach/Staff/Media roles. Someone with Player plus another role remains in the player queue, with all roles explicit. The queue regenerates as new legacy Media/person links arrive.

## Full coverage audit and explicit people export

`finalize_checkpoint.py` now runs `audit_coverage.py` before packaging. It independently re-parses every available modern/legacy source, validates published section counts, compares the source union against database memberships, checks division registration totals and source hashes, and spot-checks Baltimore, Pro, D4 and 3v3 entries. Name/role differences are preserved in modern-legacy-differences.json, not silently treated as corrections. Missing legacy views continue to mark Media/full-name coverage incomplete.

`people.json` contains actual source-linked scored-event observations per person, plus explicit hometown/history status and current roles. It does not merely define empty history tables. `missing-items.json` differentiates actionable unfinished retrievals from data not published in the retrieved page. Home field/team hometown remain separate from every individual player's hometown.

History pages with recognizable but zero-row scored-event tables, or an explicit no-events statement, receive `scored_event_history_imported_zero_rows`. Pages lacking both positive table evidence and an explicit zero statement are rejected—not called zero-event profiles. This remains a statement about that classification view, not proof of no career events.

## Incremental player-only checkpoints

While browser collection continues, without reimporting any roster pages:
```sh
python3 import_player_histories.py
python3 audit_coverage.py
python3 package_clean.py
```
The history importer recognizes native combined Event/Team tables and the browser's normalized split Event and Team columns. It binds exact observed ERID/EPID links, preserves table captions/headings as classification contexts, and never substitutes team hometown for a player location. Unchanged source hashes with successful prior imports are skipped. When a browser profile manifest exists, only its status=ok saved files (plus explicit initial samples) are eligible; unfinished files wait for a later checkpoint. Browser manifests and remaining queues under authenticated/ are read only and never overwritten. Sanitized source-view packaging reuses hash-validated cached derivatives.

## PDF-layout profile captures: explicit partial extraction

The newer browser-print captures contain escaped source URLs and a `<pre>` of `pdftotext -layout`, not DOM tables. The importer decodes HTML entities before matching the exact ERID/EPID and cross-checks the published numeric person-id when provided.

`pdf_text_history.py` preserves every literal numbered/date row anchor and its observed classification context, including across page breaks. Full raw layout is retained in `profile_text_sources` / profile_text_sources.json and the sanitized source views. Event/team names, division, place and score remain NULL where the layout lacks reliable cell boundaries; no wrapped text is guessed into a team or event name. These profiles are marked `scored_event_history_imported_columns_unresolved`, and missing-items.json explicitly queues event/team extraction. They are NOT fully normalized participation histories. Empty printed profiles require both actual classification contexts to show None (0), plus a printed Event/Team header and no numbered rows; a future-results note is not zero-history evidence.

For the first 200 PDF-derived profiles, independent source inspection found 2,065 dated rows and 9 explicit zero profiles. The batch's 2,018 reported row annotations cover only the 194 files carrying row-count metadata: six earlier files lacked that field and contribute another 47 visible rows. See pdf-batch-200-validation.json. No rows were dropped to force the lower total.

To resolve the cell fields faithfully, retain normal original DOM tables or the actual browser-exported PDFs with positioning, when available through the supported workflow. The saved preformatted text alone does not reliably preserve wrapped Event/Team cell boundaries. No new network collection is performed by the importer.

## Exact PDF annotation recovery and native PDF-only manifests

The PDF limitation above is resolved when the **actual PDF** is retained. `pdf_annotation_history.py` uses URI link rectangles to distinguish event-label text from team-roster-label text, associates each pair with exactly one dated row, and reads division/place/classification score using actual drawn cell borders. It verifies all dated rows are covered exactly once. Cross-page event/team labels are joined from their own URI rectangles. Ancillary cells are reconstructed from actual same-column drawn border segments on each page, with URI rectangle centers locating the continuation row. Ambiguous or missing grid bounds remain NULL and are queued. All 18 initially withheld page-boundary cases now pass this coordinate-only reconstruction; see pdf-pagebreak-18-test.json. No lexical name splitting, guessed transfers or jersey numbers occur. PDF line-wrap whitespace is normalized, without inventing hyphen corrections.

All ten representative tests passed (two zero, two short, six long/wrapped; 74 dated rows). A 12-row DOM/PDF sample cross-check also compared exact field values; see dom-pdf-field-crosscheck.json.

Fast future batch command, without roster reimport:
```sh
python3 /workspace/paintball/world-cup-2026/checkpoint_histories.py
```
For integration only, without audit/ZIP:
```sh
python3 /workspace/paintball/world-cup-2026/import_structured_histories.py
```
The established import_player_histories.py command now also invokes exact-evidence integration after ordinary saved-HTML imports. It never downgrades an already canonical DOM/PDF profile back to flattened PDF text. Unchanged exact captures are skipped by SHA-256. PDF/DOM upgrades supersede placeholder rows while keeping original raw layouts, source documents and provenance.

Accepted completed PDF manifest record (append to authenticated/person-profile-manifest.jsonl; the importer only READS it):
```json
{"person_id":"157234","epid":"BDdA2acEy6G8RhTt","source_url":"https://pbleagues.com/cgi-bin/rosterclass.cgi?ERID=W9mEuzppJS8OEdJX&EPID=BDdA2acEy6G8RhTt","retrieved_at":"2026-11-08T19:02:19-05:00","status":"ok","pdf_path":"/workspace/paintball/world-cup-2026/authenticated/person-BDdA2acEy6G8RhTt.pdf"}
```
No synthetic HTML is required. The numeric person ID must match the exact observed ERID/EPID roster link, and the PDF must contain the matching player-profile EPID hyperlink annotation. Existing transport_pdf basenames are accepted only as supplied associations to /workspace/browser-pdfs/; transport_pdf_source/actual_path/pdf_path can identify associated files under that directory or authenticated/. Arbitrary paths, network addresses and browser/session files are not read. Original PDFs remain unchanged, and immutable hash-named evidence copies are retained in pdf-sources/.

Supported DOM exports: person_id, epid, source_url, retrieved_at, tables[].matrix[][] with cells `{text,links:[{text,href}]}`. Keep context heading rows and scored seven-cell rows; nested scoring-detail matrices can be omitted for speed. Event/Team must retain the two actual labeled links. DOM evidence takes precedence over a PDF of the same profile when both are supplied.

Portable ZIPs exclude raw PDFs. Separately hashed safe text derivatives of source PDFs are included, linked through clean-source-views.json; the database retains the actual PDF hash, captured URL/time and original artifact association in profile_capture_evidence.

## Recovery checkpoint (November 8, 2026, 7:18 PM ET)

All 191 previously partial profiles / 2,065 placeholder rows were repaired using actual associated PDFs. Across the 374-profile capture snapshot, 363 have scored-event rows and 11 have explicit zero-event evidence; 3,245 current players remain without imported profiles. There are 3,963 source-linked classification-history observations and 2,845 source-deduplicated participation-index rows. No row currently has unresolved event/team cells or withheld ancillary cells. Classification history is not a complete career or verified attendance record; player hometown remains unpublished in these sources. `structured-history-recovery-228-report.json` preserves the recovery batch report before the targeted 18-page-break repair.

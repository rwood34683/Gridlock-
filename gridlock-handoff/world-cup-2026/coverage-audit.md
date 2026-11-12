# Coverage audit

source_checks_pass_but_requested_enrichment_incomplete

680 registered entries / 592 team IDs. Modern sources checked: 680/680; legacy sources checked: 680/680.
Current players: 3619; all people including other roles: 4381.
Memberships by role: {"Player": 4495, "Staff": 1195, "Coach": 208, "Media": 27}
Player history coverage: {"scored_event_history_imported": 1136, "not_retrieved": 2446, "scored_event_history_imported_zero_rows": 37}
Player hometown coverage: {"not_published_in_retrieved_classification_page": 1173, "not_retrieved": 2446}
Published team hometown: 671/680; home field: 453/680.
Non-NULL jerseys: 0; none guessed.
Source hash checks: 3431; issues: 0; SQLite: ok.

## Open limitations
- Not every current player has supplied scored-event profile history.
- Player hometown coverage is incomplete/unpublished; no hometown inferred.

## Representative source-to-database checks
- Baltimore: Baltimore Nevermores / WNXL X-Ball (Thu-Sun) / entry 236224: modern 16, legacy 17, preserved database union 17.
- Pro: ALA Warsaw / Pro X-Ball (Thu-Sun) / entry 236252: modern 10, legacy 10, preserved database union 10.
- D4: 302 DESTROYERS / Division 4 X-Ball (Thu-Sun) / entry 237025: modern 11, legacy 11, preserved database union 11.
- 3v3: Beerkats / Amateur 3v3 X-Ball (Wed) / entry 236427: modern 10, legacy 10, preserved database union 10.

## Audit detail files
- coverage-audit.json: division totals, checks and spot-check provenance
- roster-source-coverage.json: per-entry source section/role counts
- modern-legacy-differences.json: exact role/name/count differences, not silently erased
- missing-items.json: machine-readable unfinished versus unpublished fields
- people.json: source-linked hometown/history statuses and actual scored-event observations

## Claude Code / Codex local-use prompt
Download and extract the package into a local directory those tools can access, then use:

> Read `<LOCAL_PATH>/world-cup-2026/README.md` and `coverage-audit.md`. Open `world-cup-2026.sqlite` read-only. Query current players using role=Player or player_rosters; do not mix staff into player counts. Use people.json/person_event_history for source-linked scored-event participation, not inferred transfers or complete careers. Report missing-items.json coverage, cite source URLs and retrieval times, and never infer hometowns or jerseys.

Nothing has been installed or copied into either coding environment.

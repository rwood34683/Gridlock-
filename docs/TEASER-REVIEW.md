# Team and Player preview review — 11 November 2026

Reviewed Claude's branch at `a1cd9cdfb7060952543931cc5da7f06e0d1dc208`
against main `b55d70f96f94fcdb9d3ff84f96ad7ebc86bdab12`. The branch has
eight non-merge commits plus the merge of main. The independent fixes are
on `codex/teaser-review-fixes`, based on that exact Claude head; the PR targets
Claude's branch so it contains only the review fixes. Nothing was pushed to
Claude's branch or main, merged, published or deployed.

During the review Claude's remote branch advanced to
`6d1f17899b4a39190167c5f97002a114b1162286`. That commit changes only
`docs/preview-manifest.json`; the reviewed preview code is unchanged and the
PR preserves that manifest update.

## Findings in the reviewed branch

Line numbers in this table refer to the original `a1cd9cd`, before regeneration.

| Check | Original result | Evidence and fix |
| --- | --- | --- |
| No league logos or badges | PASS | Source/assets and all navigation screenshots show Gridlock marks, no league badges. Public event/team names remain. |
| No PBLeagues player records | PASS | Generated `COACH_DIVS` contains 863 public team entries, names/registration only. Both previews match coach entries; no player histories, IDs or age data were found. |
| No forbidden third-party tool name | PASS | Both complete HTML bundles pass the existing forbidden-name assertion. |
| No fetch or network-send code | FAIL | Player `index.html:3205,3974` and Team `index.html:3431,4196` still bundled inactive service-worker/update fetch code. Removed through `tools/teaser_rules.js`; the new static assertion checks the whole bundle. No external request was observed before or after the fix. |
| No prices or licence sales | PASS | Existing static assertions, source inspection and all reachable screens show no sale controls. |
| No league rulebook text | FAIL | Hidden `REFS`/`REFPH` datasets at Player `:488,:504` and Team `:489,:505`, plus hidden `renderRef()` at Player `:2451` and Team `:2677`, still carried referee/rule text. Removed through the generator. |
| Coach colours | PASS | Ground is computed `rgb(11,12,13)`; red secondary text, white clear lanes, left wire `#e5342f`, right wire `#3d8bff`. Theme check reports already themed for both. The fix also removes gold from Scout's threat control. |
| Measured bunker footprints | PASS | Each app: seven layouts, 397 bunker records and rendered SVG footprints match coach source; 420 break destinations also match. Drawing tolerance is 0.021 ft, allowing SVG rounding. |
| No automatic tutorial | PASS | No tutorial opens in any fresh context; existing tour guard and browser assertion pass. |
| Minimum 44 px targets | FAIL | Player Scout board buttons measured S 23.2 px, Bal 33.8 px and D 23.8 px wide, all 44 px high, at every requested size. Both HTML files `:125` set height without width. Added minimum width in the generator. |
| Accessible, keyboard-operable controls | FAIL | Selecting a Scout team exposes clickable star spans without button semantics/names: Player `:2707,:2717`, Team `:2933,:2943`. Replaced through the generator with named 44 px buttons, pressed state, visible focus and keyboard activation. |
| No browser dialogs | FAIL | Hidden tendency reset uses native confirm at Player `:1272`, Team `:1273`. Replaced with the existing two-tap confirmation; first tap retains history, second clears only the captured layout. Navigation itself raised no dialogs. |
| No page-wide sideways scroll | PASS | Document width never exceeds any requested viewport. Contained horizontal scrolling is listed below; it is not silently counted as absent. |
| Separate apps and coach storage | PASS | No `gridlock.coach.*` keys in either preview. Coach app/site/builds do not load previews. `web/`, `site/`, `ios/`, `android/` are unchanged from main. |

## Browser coverage after fixes

Chromium with fresh browser contexts at each requested viewport. Player joins
with `IMPACT-7QX2`. Player's Tally, Scout, Sightlines, Walk and More tabs all
open; all ten More items open (Practice, Nexus, locked Team, My line, Messages,
Playbook, Lineups, Movement, Assess and Codes). Team's Team, Lineups, Schedule,
Tournament Prep, Messages and Nexus tabs all open; Team has no More menu.
The test additionally opens a Tally bunker, selects a Scout team, uses the
threat buttons by keyboard and verifies the two-tap tendency reset.

| Preview | Viewport | Screens checked | Page/console errors | External requests / browser dialogs | Targets and names | Page overflow |
| --- | --- | ---: | ---: | --- | --- | --- |
| Player | 390×844 | 19 | 0 | 0 / 0 | PASS | none |
| Player | 768×1024 | 19 | 0 | 0 / 0 | PASS | none |
| Player | 1024×768 | 19 | 0 | 0 / 0 | PASS | none |
| Team | 390×844 | 7 | 0 | 0 / 0 | PASS | none |
| Team | 768×1024 | 7 | 0 | 0 / 0 | PASS | none |
| Team | 1024×768 | 7 | 0 | 0 / 0 | PASS | none |

Each navigation context makes exactly one local GET to load its HTML document,
and no subsequent requests. Computed accessibility-tree names are checked,
not just text or placeholder presence. There are no controls below 44 px in
either dimension on the visited screens after the fix.

Contained horizontal scrolling at 390 px: Player's Scout table is 484 px in
a 368 px panel; Team's tab strip is 525 px in a 358 px container. Both remain
operable, and all entries/tabs were reached. Neither container overflows the
document. At both tablet sizes no horizontal scrolling container was found.

Screenshots:

- [Player Scout before](screenshots/teaser-review/player-scout-before.png)
- [Player Scout after](screenshots/teaser-review/player-scout-after.png)
- [Player Scout selected-team controls](screenshots/teaser-review/player-scout-controls.png)
- [Team tablet](screenshots/teaser-review/team-tablet.png)
- [Player landscape](screenshots/teaser-review/player-landscape.png)

## Commands and results

- `npm ci`: PASS in the clean review worktree; zero audit vulnerabilities.
- `node tools/teaser_fields.js --check`: PASS, both files up to date.
- `node tools/teaser_rules.js --check`: PASS, both files up to date.
- `python3 tools/teaser_theme.py --check teasers/player/index.html teasers/team/index.html`: PASS, both already themed.
- `node test/teasers.cjs`: PASS, 65 assertions on the original branch and 71 after fixes; existing assertions retained.
- `node test/teaser-browser.cjs`: PASS, 10 checks, including 78 navigation screens.
- Rerunning all three generators without `--check`: PASS, both HTML SHA-256 values unchanged.
- `npm run check`: PASS, all 61 suites, exit 0. Main browser suite 1302/1302, devices 235/235 across 20 devices, bunker checks 173/173, brands 82/82. No tests or limits weakened.
- `npm run build`: PASS, 43 files built; no tracked source files changed.
- `npm run site:check`: PASS, 23/23. Existing store listing IDs, Android signing fingerprint and Apple Team ID remain PENDING; no settings changed.
- Implementation commit `ea17ad0ed180a729dfca1c0a2840a83d0a7f8635`: GitHub [Check Gridlock](https://github.com/rwood34683/Gridlock-/actions/runs/43115960088) PASS and [Build iOS simulator](https://github.com/rwood34683/Gridlock-/actions/runs/43115960215) PASS.

All hard-rule failures listed above are fixed in the proposed branch. The
final full run's performance measurements all passed without slow advisories:
Tally p95 78.8 ms, Playbook p95 53.2 ms, worst animation frame 23.4 ms,
sideline-tap median 54.9 ms and p95 101.6 ms.

The first full check on unchanged Claude source stopped at the load suite:

```text
Render Playbook (p95)              114.4 ms     slow
Render Tally (p95)                 278.1 ms     fail
Render Scout (p95)                 69.9 ms      pass
Render Sightlines (p95)            121 ms       slow
Break animation, worst frame       103.3 ms     slow
1 measurement(s) need attention.
```

A separate local browser audit was running concurrently. An isolated rerun
on the same unchanged source passed: Tally p95 158.6 ms (slow advisory, below
the unchanged 250 ms failure limit), worst animation frame 32.6 ms, and
sideline-tap p95 152.5 ms. Sideline-tap median 89.6 ms also retained its slow
advisory. No threshold or test was weakened. The final full check ran alone
and passed, as recorded above.

Full browser evidence and screenshots are generated under
`work/teaser-browser/`; `npm run check` now includes that suite. Physical
phones/tablets, native app interaction, an Android build, Safari and the
published Claude artifact viewer are NOT TESTED in this review. The iOS
simulator build succeeded in CI; it is not a physical-device interaction test.

## Keeping the previews in sync

The requested two-line note is in AGENTS.md's Where things stand. Change
generator sources, never the generated coachfields/coachwalk blocks. After
changing coach measured fields, BREAK_PLANTS or the team board, run both
generators and commit the regenerated preview HTML in the same PR. Keep
previews outside coach builds and away from coach storage keys.

# Validation and limits

Base: main `d984aa1a56ac6ed9a03052001797f6c18896ad65` (rebased from the initial
`5af4bb6` baseline after upstream PR #276 landed). Work is on
`codex/cloud-copy-links-layout`. No merge, publication, service settings or
live account/data changes are part of this PR.

## Final checks

Windows, Node 24.22.1, system Microsoft Edge, locked npm dependencies:

| Command | Result |
| --- | --- |
| `npm run check` | All 37 suites passed; no failed or skipped suite checks |
| Function suite | 1,301/1,301 |
| Device suite | 235/235 across 20 viewports |
| Brand suite | 71/71, including native round-trip and both legal-name/domain checks |
| `npm run site:check` | 23/23 |
| `npm audit` | 0 vulnerabilities |
| `git diff --check` | Passed |

The site check still lists owner-held App Store/Play listing IDs and Android
signing fingerprint as pending. Those are release configuration, not skipped
tests or changes made in this PR. No signed native binary was built.

## What failed during the work

- Four function assertions still expected “my league”, “Sent to your league”,
  “being sent to your league” and “removed from the league”. Their wording
  was updated while retaining checks on actual payloads, successful sends,
  offline timestamps and deletion. All 1,301 function checks then passed.
- The strict default-brand identity check failed on Windows CRLF bytes in
  `site/.well-known/assetlinks.json`, leaving the test shells temporarily at
  Grind X. The builder now retains original default-source bytes when only
  line endings differ. It still rejects content differences. Both shells
  were restored to Gridlock, and the brand suite passed all 71 checks.
- Complete load runs exceeded the unchanged 250ms render limit: one measured
  Tally at 390.5ms and Scout at 303.7ms. Earlier measurements were 285.1ms /
  348.6ms, and an isolated Tally run was 292.8ms. A quiet pass was too close
  to the limit to treat this as resolved. Profiling identified a redundant
  `scrollTop = 0` write that forced layout on each newly built screen. That
  write is now skipped; actual scrolled positions are still restored. The
  focused load run after the fix measured Tally 85.7ms and Scout 104.2ms and
  passed every budget. The following complete run measured Tally 139.2ms and
  Scout 74.8ms and also passed every budget. No thresholds, throttling or
  sample counts changed.

- After rebasing onto main, Windows CRLF checkout exposed three more test
  portability failures: the Grok generated-copy equality check; the plants
  generated-block equality check (1,300/1,301 functions passed); and the
  account-entitlement VM extraction, whose LF-only end marker let it consume
  closing HTML. Comparisons/extraction now normalize newlines; exact content
  and all account assertions remain checked. Missing extraction boundaries
  fail explicitly. The iPhone launcher executable check also failed because
  NTFS does not expose a POSIX execute bit; on Windows it now verifies Git
  records mode 100755, while other hosts still check the filesystem bit.

## Website export

The owner identified the open Grok workspace. Its exported source was used for
the four-file overlay in `marketing/grok/`, preserving its design and shared
app links. TypeScript and the production Vite compile passed. Home, Privacy
and Support rendered on desktop and phone in development and built previews;
the final built run checked console errors and waited for image decoding.
Privacy screenshots are in `docs/qa/grok-copy/`.

The downloaded Grok scaffold's built local preview initially stopped on missing
PGLite package assets. Local QA supplied `pglite.data`, `pglite.wasm` and
`initdb.wasm` from its locked npm package to the generated runtime directory.
This does not change Grok's source scaffold, database or hosting settings.
Apply the reviewed copy overlay and recheck inside Grok before publishing.

## Verification boundaries

The device evidence and non-reproducing Scout report are explained in
`README.md`. Viewport checks are browser checks, not physical-device or signed
native binary tests. iOS compilation still needs a Mac. The preview package
was rebuilt locally; its old published manifest was not changed or republished.
Owner uploads are documented in `docs/LIVE-REBUILD.md`.

## Separate latest-main publication

At the owner’s later explicit request, main `d984aa1` was built with the
existing public Supabase values and published through the existing Sites
project as version 11. This PR’s changes were not deployed. Fresh read-only
phone (390 × 844) and tablet (820 × 1180) checks at the custom domain passed
cloud adapter loading, sign-in/reset controls, admin sign-in and no horizontal
overflow or page errors. The service worker and public configuration match
the saved build byte for byte; the host only adds its script to the HTML.
A real signed-in admin/MFA test remains with the owner. No service settings
or live account/season data changed.

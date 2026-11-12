# Rules in Coach, Team and Player

The Rules entry offers these official source pages. The owner supplied the
three 2026 PDFs on 11 November 2026; their filenames, page counts and SHA-256
fingerprints are recorded in `docs/rulebooks.json`.

| Book | Covers | Official source |
| --- | --- | --- |
| Match play, 2026 | 3v3, 5v5, 7v7, 10v10, Classic and Pump | https://www.nxlpaintball.com/match-play-rulebook |
| Divisional X-Ball, 2026 | Divisional X-Ball | https://www.nxlpaintball.com/divisional-x-ball-rulebook |
| Pro X-Ball, 2026 | Professional division | https://www.nxlpaintball.com/pro-x-ball-rulebook |

Coach: **More > Rules**. Team and Player previews: **Rules** in the header.
Opening a source needs a connection and a deliberate tap. The source opens in
a new tab with no opener or referrer. Save its PDF to the device before an
event if it is needed without signal. These are reference links, not a claim
that every book applies to every event. Check event amendments with organizers.

No league PDF, rulebook text, badge, remote embed or automatic request is added
to the builds. The app's format values and match decisions are unchanged.
The Team and Player apps stay separate previews marked Coming soon.

## Updating and handing off to Claude

Markdown is enough for this catalog and implementation instructions. It is
not a substitute for reading a source PDF when checking a rule. Claude can
open the official source links; attach the three original PDFs too if Claude
cannot retrieve them, or if a particular historical edition must be checked.
Do not invent a rule from a summary or embed a copied book into an app build.

Edit `docs/rulebooks.json` and `tools/rulebook-links.js`, then run:

```sh
node tools/rulebook-links.js
node tools/teaser_rules.js
node tools/rulebook-links.js --check
node tools/teaser_rules.js --check
npm run sync
npm run app:artifact
node scripts/run-checks.js rulebooks coach-home teaser-browser teasers
npm run check
npm run build
npm run site:check
npm run preview:package
npm run test:preview
```

Commit generated Coach/native/site and preview files together. Never edit the
generated rulebook-links, coachfields or coachwalk blocks directly. Tests allow
exactly these three explicit official links in the previews; video, course and
arbitrary external links and all network-send APIs remain forbidden.

# GRIDLOCK Coach — Claude Code instructions

You are working on **GRIDLOCK System · powered by UPRA · Coach Edition**.
Paintball sideline app for coaches and league staff.

## How to use this repo in Claude Code

```bash
npm install
npm run serve   # http://localhost:5173
```

Source of truth for *behavior*: `docs/GRIDLOCK-OVERSKILL-SPEC.md`
Source of truth for *working UI*: `web/index.html` (open in a browser)
Legacy native snapshot: `ios-native/GRIDLOCK-Coach/` (early SwiftUI, missing later tabs).
`ios/` and `android/` are the generated Capacitor projects — edit `web/`, then `npm run sync`.
Do not treat Overskill `.txt` as compiled code. It is the product prompt.

## Hard rules

- Never use the word GunzUp anywhere (UI, comments, filenames, git). Label that control **Shot lanes**.
- Coach-simple copy. Short labels. No developer jargon in the UI.
- Dark stadium look. Black `#0b0c0d` ground, red `#ad1515` fills, `#e5252a` for small
  accents, off-white `#efedeb` type. Not cartoon. Not a golf course.
- A bunker type is one inflatable. Footprints come from `layouts/bunkers.json`,
  positions from the event's own official map. Never hand-size a bunker.
- The field is the same dark ground, not green turf. Bunkers carry the red and blue
  the official layout paints them, sampled from the map — never picked by hand. A
  layout whose colour was never sampled stays neutral grey rather than guessing.
- Bunker reds and blues sit a step darker than the wires, and every path runs over a
  black casing, so the break still leads the eye on a field of the same two colours.
- Wires are semantic and never change: left pit red `#e5342f`, right pit blue `#3d8bff`.
  Shot lanes are white, so they read against both.
- Promo first. Do not auto-open the tutorial.
- Staff login required to create a class or send a league blast.
- Joining a class does **not** require an account.
- Heuristic scout reads are a training aid, not a prediction. Officials govern the live call.
- Changing the event changes the layout on every tab.
- Face chevron and shot cone travel **with** the player along the path.

## Roles

Guest · Staff/Coach · League Admin · Participant (form only)

## Tabs

Phone: Playbook, Tally, Scout, Sightlines, More.
Scout: Matchup, Breakouts, Anticipate, Counter, Layers, Games, Division.
More: Walk, Lineups, Movement, Assess, Codes, Bunker stats, Team, Messages, Classes, League, Nexus.

## What is already coded here

- `web/index.html` — runnable coach web app: promo gate, staff login, playbook field + paths, dual-pit scout, tally, classes + join code, league groups + blast log, team, messages, nexus.
- `ios-native/GRIDLOCK-Coach/` — original SwiftUI snapshot (Playbook, Tally, Scout v1, field canvas, layouts, security). Incomplete vs spec.
- `ios/`, `android/` — Capacitor shells around `web/`, ready for the App Store and Google Play.
- `site/` — the landing page.
- `docs/` — full product spec + Overskill import prompt.

## What to build next (in order)

1. ~~Match Scout 1:1 to the dual-pit screenshots in the spec.~~ Done — all seven
   sub-tabs: Matchup, Breakouts, Anticipate, Counter, Layers, Games, Division.
   What you learn about a team is stored against the team (`S.scout[teamName]`),
   including their five and the calls you have seen them run. Every number is
   counted from what was logged; nothing is modelled.
2. ~~Playbook 8-way face/shot pad + P|S roles.~~ Done — Face opens the eight, Shot
   targets a named bunker, P|S are real toggles, all stored per layout per break.
   Path editing is done too — see 6.
3. ~~Per-layout unique paths for every seeded break.~~ Done on all three fields —
   breaks are written as the bunker each player plants on, in `BREAK_PLANTS`,
   which `tools/plants.js` generates from the measured layout. Never hand-edit
   that block; run the tool.
4. ~~Bunker naming on the field + bunker stats heat.~~ Done — Team sets the call,
   it overlays the official code everywhere, and Bunker stats tints the field.
5. ~~QR generation for class codes.~~ Done — a class card carries a scannable
   code for `gridlock://class/<code>`, the deep link both platforms register.
   The encoder is hand-written (the app has no network) and its output is
   pinned in the suite against a matrix verified by an outside decoder.
6. ~~Path erase / smooth / aim drag on Playbook.~~ Done — Edit path turns every
   corner into a handle: drag to move, tap to take out, tap the line to add one,
   drag a player to point him, and reset one path or all of them back to the
   routed line. Corners are rounded so a run reads like a run; the suite samples
   the drawn curve and checks it still clears every bunker.
7. ~~Bunkers exact.~~ Done — the shaded face of a bunker is part of the bunker,
   and reading colour alone was measuring the lit half of everything and putting
   every centre a foot toward the light. Footprints now come from
   `layouts/bunkers.json`, measured once off the clean high-resolution Midwest
   2D, because one bunker type is one inflatable; positions still come from each
   event's own map. Every bunker keeps what its map drew alongside.
8. ~~All twelve breaks.~~ Done — the seven the spec named and nobody had built
   are in, and none of the sixty plants is typed. `tools/plants.js` reads a
   call the way a coach says it, how many men on which wire and how far up the
   field, and picks the bunker that sits there on that measured layout. Add a
   field and its plants come out of the same rule; the suite fails if the app
   and the rule ever disagree.
9. ~~Log break, and off the buzzer.~~ Done — Playbook logs the call you made
   and counts how predictable you have been on this field, warning when one
   call is half of your last ten; and the five leave in order now, the longest
   run on the buzzer and the short ones holding.
10. Close the rest of the gaps against the spec. `docs/SPEC-COVERAGE.md` walks
    `docs/GRIDLOCK-OVERSKILL-SPEC.md` line by line and says what is built, what
    is deliberately different and what is missing. Top of that list now: Cards /
    Opp / Rep, then the tablet side rail and the blast group picker.
11. Bring iOS SwiftUI up to web parity, then Android Compose.

## Data (persist in localStorage for web; SwiftData/Room later)

User, Team, Player, Event, Layout/Bunker, PathEdit, TallyEntry, ScoutEntry, ScoutTeamProfile, BunkerCall, ClassSession, ClassResponse, LeagueGroup, LeagueMember, LeagueBlast, Message, AssessmentEntry.

## Do not

- Rebuild custom cloud auth in the first pass. (There is still no server. Nexus →
  Save a copy is the offline answer to backup and moving between phones.)
- Scrape player face photos.
- Invent live official scores. (The pro board carries team names only. Points,
  registration, tendency and threat are the coach's to enter — a team nobody has
  scored reads as a dash, never as a guess.)
- Add a team to the pro board without a source. Every name carries `src`:
  `page` if the league publishes a team page under it, `event` if it was read
  off coverage of a real event. The league site and PBLeagues are both blocked
  by the egress proxy here, so the board says it cannot be called complete
  rather than pretending otherwise.
- Hand-edit `BREAK_PLANTS`. Run `node tools/plants.js --write`; the suite fails
  if the app and the rule disagree.
- Open the tutorial on launch.

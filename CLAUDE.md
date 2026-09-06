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
- The field is the same dark ground, not green turf. Bunkers are one neutral grey
  material so the wires stay the loudest thing on it.
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
More: Walk, Lineups, Movement, Assess, Codes, Bunker stats, Team, Messages, Classes, League, Nexus.

## What is already coded here

- `web/index.html` — runnable coach web app: promo gate, staff login, playbook field + paths, dual-pit scout, tally, classes + join code, league groups + blast log, team, messages, nexus.
- `ios-native/GRIDLOCK-Coach/` — original SwiftUI snapshot (Playbook, Tally, Scout v1, field canvas, layouts, security). Incomplete vs spec.
- `ios/`, `android/` — Capacitor shells around `web/`, ready for the App Store and Google Play.
- `site/` — the landing page.
- `docs/` — full product spec + Overskill import prompt.

## What to build next (in order)

1. Match Scout 1:1 to the dual-pit screenshots in the spec (anticipate cards, counter-picker, division board already sketched in web).
2. Playbook 8-way face/shot pad + P|S roles + erase/smooth path edit.
3. Per-layout unique paths for every seeded break.
4. Bunker naming on the field + bunker stats heat.
5. QR generation for class codes.
6. Bring iOS SwiftUI up to web parity, then Android Compose.

## Data (persist in localStorage for web; SwiftData/Room later)

User, Team, Player, Event, Layout/Bunker, PathEdit, TallyEntry, ScoutEntry, ScoutTeamProfile, BunkerCall, ClassSession, ClassResponse, LeagueGroup, LeagueMember, LeagueBlast, Message, AssessmentEntry.

## Do not

- Rebuild custom cloud auth in the first pass.
- Scrape player face photos.
- Invent live official scores.
- Open the tutorial on launch.

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

Phone: Playbook, Tally, Scout, Sightlines, More — a bar along the bottom.
Tablet, and any screen past 900 px: the same five in a rail down the left.
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
   event's own map. Every bunker keeps what its map drew alongside. The fill runs
   to that measurement and the outline is drawn *inside* it: a stroke straddles
   its path, so insetting the whole shape left the outer half-stroke reading as
   field and put a stripe of black between two bunkers that touch — most visibly
   where the snake beams butt the giant plus. Angled beam ends are squared for
   the same reason.
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
10. ~~Cards, Opp and Rep.~~ Done — Cards is one card a man with a Share the
    five; Opp is the opponent library on Scout → Counter, your answer to each
    of their calls stored against the team and shown beside the call on
    Playbook; Rep is the recognition drill, the field drawing one of the twelve
    with nothing naming it and a clock that holds you to two seconds.
11. ~~Close the rest of the gaps against the spec.~~ Done — `docs/SPEC-COVERAGE.md`
    walks `docs/GRIDLOCK-OVERSKILL-SPEC.md` line by line, and nothing it asks
    for is unbuilt. The last eight went in together: the tablet rail past
    900 px, the blast group picker, class start time / notes / open-close /
    share, division search and press-and-hold for the left pit, the squad code
    and one player's own word for a bunker, the Nexus field list, X-for-out and
    gunfight rings on the Scout field, and the Smooth chip. Two things stay
    deliberately different and say so on screen: there is no event feed, because
    there is no network; and "how to anticipate" is a sub-tab, not a menu.
12. ~~A match, so a point number means something.~~ Done — the point counted up
    forever and nothing marked where one game ended, so a mis-tap on Next point
    was permanent and your second tournament opened on point 63 with the sheet
    showing outs from March. Every out, lineup, rotation, grade and logged call
    now carries the match it belongs to, and the point counts from one inside
    it. There is always exactly one match in play, so nothing has to handle
    "no match". A save from before this is adopted whole into one match rather
    than orphaned. More → Matches keeps every sheet.
13. ~~Storage that survives.~~ Done — everything was in `localStorage` inside a
    web view, which iOS may clear when the device is short of space and which is
    not in the device backup, while `@capacitor/preferences` sat in
    `package.json` with nothing calling it. Every save now also writes a durable
    copy to the phone's own storage, and a launch that finds nothing locally
    reads it back and says so. It is a mirror, not a move: `save()` is
    synchronous and called from every handler, so localStorage stays the working
    store. Restoring is timid on purpose — only when there is no usable local
    state at all. `save()` is wrapped too: a refused write used to escape
    through `set()` before `render()` and freeze the screen with nothing said.
14. ~~Keep the screen awake on a sideline.~~ Done — the Screen Wake Lock API
    rather than a plugin, so the phone app and the browser behave the same with
    no new native dependency. The system drops the lock whenever the page stops
    being visible, so it holds while the coach is looking at the app and costs
    nothing in a pocket; it is taken again on the way back. A switch on Nexus,
    on by default, shown only where the phone can do it.
15. ~~Their five on the field.~~ Done — pick a team and you get whatever roster
    is known, published ones flagged as published; place each man where you have
    seen him set up and the Scout field draws him at that bunker, per field,
    square rather than circle so he is never taken for a break runner. Only San
    Diego Dynasty has a published roster: `PRO_ROSTERS` is names actually read
    somewhere, and a team without one stays empty.
16. ~~The pro board off the registration page.~~ Done — the twenty teams entered
    in Pro X-Ball at Lone Star, read off PBLeagues on 10 Sep 2026 from a
    screenshot, with payment state and the date it was read. It replaced a list
    sourced from search metadata that had five teams that had not entered and
    two names wrong: Infamous is Detroit, not Los Angeles, and the Hurricanes
    entered as CK. The coach confirmed the list runs Atlanta Jungle Cats to
    TonTon Arsenal with nothing below, so it is the whole entry and the board
    says so rather than hedging about a list it has all of.
17. ~~The score.~~ Done — the app tallied who went out and never recorded who
    won the point, so the one number a coach lives by was not in it. A point has
    a winner now: one tap, We won it or They won it, and the score is the count.
    It rides in the header beside the Staff chip, sits on the point sheet, and
    shows against each sheet in Matches. Ahead / Even / Must-score follows it
    instead of being a toggle he has to remember to flip, and he can still say
    otherwise. Back a point takes its result with it, or Back becomes a way to
    score the same point twice.
18. ~~The call, on the sheet.~~ Done — the loop on a sideline is: point ends,
    who won it, what are we calling, play it, tally the outs. Three of those
    five lived on Tally and the call lived a tab away, so every point of a long
    day cost two tab switches to read a name the coach was about to shout. The
    call now sits on the point sheet between the score and the five, where it is
    read: change it there and it is the same `script` Playbook is on, so the
    field follows. Logging is there too, because a coach who never opened
    Playbook was never logging and self-scout is only worth having if the calls
    are in it.
19. Rosters for the rest of the pro teams. They cannot be fetched from here —
    the league site and PBLeagues are both blocked by the egress proxy — so they
    arrive either off a screenshot the coach pastes, or as a data file written
    by a script run somewhere with reach. Never typed from memory.
20. Bring iOS SwiftUI up to web parity, then Android Compose.

## Data (localStorage is the working store; `@capacitor/preferences` mirrors it)

User, Team, Player, Event, Layout/Bunker, PathEdit, Match, TallyEntry, ScoutEntry, ScoutTeamProfile, BunkerCall, ClassSession, ClassResponse, LeagueGroup, LeagueMember, LeagueBlast, Message, AssessmentEntry.

A **Match** is `{id, at, vs, layout}` and every row logged on a sideline carries
its id in `m`. A **result** is `{m, pt, won}` — one per point, and the score is
the count of them. Point numbers are per match and start at one. Lineups are keyed
`<matchId>|<point>` — never by point alone.

## Do not

- Rebuild custom cloud auth in the first pass. (There is still no server. Nexus →
  Save a copy is the offline answer to backup and moving between phones.)
- Scrape player face photos.
- Invent live official scores. Points, tendency and threat are the coach's to
  enter — a team nobody has scored reads as a dash, never as a guess. Who has
  entered an event is different: it is published by the league, so the pro board
  carries it when it has been read off the registration page, with the event and
  the date it was read shown on the board. Read it, or leave it blank.
- Add a team to the pro board without a source. Every name carries `src`:
  `reg` if it entered the event and the league's registration page lists it —
  the strongest — `page` if the league publishes a team page under it, `event`
  if it was read off coverage. The league site and PBLeagues are both blocked by
  the egress proxy here, so anything sourced arrives from the coach: a
  screenshot, or a file written where there is reach. The board says what it was
  read from and when, and says when it cannot be called complete.
- Hand-edit `BREAK_PLANTS`. Run `node tools/plants.js --write`; the suite fails
  if the app and the rule disagree.
- Open the tutorial on launch.
- Log a row on a sideline without stamping `m: S.matchId`, or key anything by
  point number alone. Point 3 exists in every match ever played.
- Put a team in a pit the coach did not pick. Both pits start empty and
  `pitOf()` returns no name, because the app shipped with two real teams already
  loaded and every out a coach tallied was stamped with a team he had never
  played. `pitNamed(side)` is what to branch on; a match refuses to start
  without an opponent.
- Keep anything on the phone in `localStorage` alone. The season and the staff
  account are both mirrored through `window.gridlockKeep(text, key)`; a season
  restored onto a phone the coach can no longer sign in to is half a rescue.
- Let a write to storage throw out of `save()`. It escapes through `set()`
  before `render()` and the screen freezes mid-tap saying nothing.
- Tell the browser build it has a durable second copy. It does not — only the
  phone app does. `window.gridlockDurable` says which you are on.
- Reach into `BREAKS[S.script]` directly. Use `breakName()` / `curBreak()`. A
  saved state naming a break this build does not have — an older copy, a
  hand-edited file, a key renamed later — made that throw, and one of the seven
  places reading it was the header, which is on every screen. The app went
  white, and the bad key was already in `localStorage`, so relaunching did it
  again. `layoutKey` had been guarded at every door since the fabricated layouts
  were pulled; `script` never was. `fixBreak()` guards the same doors now.
- Work out where a match got to from the tally alone. A coach who taps who won
  every point without tallying an out — most of a blowout — has a sheet with
  results and no outs, and reopening it put him back on point 1, where his next
  result overwrote point 1's, then point 2's. The score walked backwards and
  nothing said so. `lastPoint()` asks every list; a point that already has a
  winner is finished, so open on the next one.
- Recompute `matchState` wherever the match changes, not only in `endPoint`.
  A new sheet is 0-0, and Ahead / Must-score is read off the score.
- Assume the web build has what the phone has. `crypto.subtle`, the Wake Lock
  API and the share sheet are secure-context only, so on `http://<laptop-ip>:5173`
  — how anyone tests the web build on a real phone — sign-in refuses and the
  other two fail silently. `contextWarning()` says so on screen; it cannot show
  on the installed app, because that is a secure context.
- Trust a passing suite as proof a screen is right. The tablet rail measured as
  a rail and every check was green while each button was a 146 px slab with its
  label under the marker, because the media block sat above the base rule it
  meant to override. Take the screenshot.
- Assert what is on screen with `document.body.textContent`. The whole app
  sits in a `<script>` inside `<body>`, so that matches any string literal in
  the source and passes whether or not anything rendered. Read
  `document.getElementById("root")` instead. Twelve checks were written that
  way and one of them was a false positive.

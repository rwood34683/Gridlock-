# Gridlock Coach — Claude Code instructions

You are working on **Gridlock System · powered by UPRA · Coach Edition**.
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

## Two builds, one source

The app ships as **Gridlock** (the default — everything committed reads
Gridlock) and **Grind X** (a variant built from the same source). Both are
defined once in `brand/brands.json`; `npm run brand` builds, checks and
switches them, and `docs/BRANDS.md` is the long version. The rule: the capital
word **Gridlock**, the deep link `gridlock://` and the store identity change per
build; every lowercase `gridlock` token — `window.gridlock*`, the storage keys,
`COPY_FORMAT`, the service-worker cache, `GridlockVoiceParser` — is a namespace
shared by both and **never changes**. The build refuses if one moves.

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
- **An account is required to use the app at all.** There is no guest path.
  The one door that does not need one is a class deep link (`?c=CODE`), which
  is a participant signing a clinic sheet rather than the coach.
- Joining a class does **not** require an account.
- Heuristic scout reads are a training aid, not a prediction. Officials govern the live call.
- Changing the event changes the layout on every tab.
- Face chevron and shot cone travel **with** the player along the path.

## Roles

Guest · Staff/Coach · League Admin · Participant (form only)

## Tabs

Phone: Playbook, Tally, Scout, Sightlines, More — a bar along the bottom.
Tablet — any screen at least 740 px wide **and** 600 px tall, which is every iPad
in either orientation and never a phone on its side: the same five in a rail
down the left. On the same screens the field is fitted to the height there is
and the Tally sheet stands beside it.
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
19. ~~The app in the coach's own words.~~ Done — bunker naming had existed
    since item 4 but the twelve calls, and the five jobs inside them, were
    still the app's: a coach reading "Snake Stack · SB · snake wire" when his
    team shouts "Rocket 1" is translating on a sideline. `callName()` and
    `jobName()` are the single doors every screen reads them through. More →
    Team names all twelve beside the app's own name; the Job chip on the man's
    row on Playbook names his job, per call and per slot rather than per field,
    because slot 1 is the same job wherever it is played. The key is what is
    stored, so a rename re-labels every call ever logged and loses nothing.
20. ~~A playbook of his own.~~ Done — the app shipped with twelve calls and a
    coach runs plays it has never heard of, so the twelve were a ceiling. A
    break here is five bunker ids per field and nothing else, so writing one
    is: name it, tap the bunker each man plants on, done. `allPlays()` merges
    `S.plays` over `BREAKS` and every picker, the router, Face, Shot, Job,
    P|S, path edits, logging, self-scout, Cards, Rep and Counter work on it
    unchanged, because all of them already keyed off `S.script`. Plants are
    per field and never guessed: at a new event it says it has no five there
    and offers to build it.
21. Rosters for the rest of the pro teams. They cannot be fetched from here —
    the league site and PBLeagues are both blocked by the egress proxy — so they
    arrive either off a screenshot the coach pastes, or as a data file written
    by a script run somewhere with reach. Never typed from memory.
22. Bring iOS SwiftUI up to web parity, then Android Compose.
23. ~~How are they shooting.~~ Done — Scout → How did they get there? records a
    **shot**: the bunker he was at and the bunker the paint went to. Its own
    observation in `S.arrivalShots`, scoped exactly like a sighting (team,
    player, field, match, point), so it merges by id, clears with the point and
    rides in a full copy but not a squad one. Drawn white over black casing per
    the lane rule; it never feeds the router. Recording a shot from a bunker
    places him there as a sighting, because that is what a coach means. **Their
    lanes** counts the team's from→to pairs on the field across every match —
    `teamLanes()` — a count of what was logged, never a model.
24. ~~The first field test.~~ Done — two coaches with the app in hand, transcribed.
    Three things, in the order they said them. **"I can't even start a new
    match right here"**: Scout had no match controls, so `matchStrip()` puts the
    sheet, the point, Next point and New match under the pits — the same
    handlers Tally uses, one match whichever tab you are on. **"Log a breakout
    without naming the exact players"**: Breakouts opens with the field; tap
    where each of their five ended up, up to five, any order, and `logTheirFive`
    stores them as `plants` on a break record stamped with match, field and
    point — a named call logged while five are picked takes them with it, the
    Scout field draws the five for the current point, and *Where they plant*
    counts bunkers across every logged five. Nameless fives are counted by
    bunker, never as a named call. **"We don't shoot directly at the bunker"**:
    on Sightlines the far end of the asked-about lane is a handle you drag
    anywhere on the field; `aimLane()` judges the lane to that spot in feet,
    solid when clear, dashed when something is in the way, with the blocker
    ringed. The handle renders after the tap surface or it could never be
    grabbed. A new question drops the aim.
25. ~~Tally, bunker first.~~ Done — the sheet was player-first, tap the man who
    went out, and a coach charts the break the other way round, by bunker. Tally
    opens on the field: tap the bunker a man broke to (nearest wins, no dead
    ground) and the breakout sheet opens under it — your player or theirs, who,
    made it or shot on the break and from where, battling in or no pressure,
    the eight-way lane he was shooting and at what, delayed, moved to and
    whether late, and the route traced by tapping the field (up to five points,
    a re-tap marks a hold, drawn dashed). One row a man a point in
    `S.breakouts`, stamped with match, point and field; a named man shot on the
    break is also the out the columns record, at that bunker. Right read /
    wrong read is ticked before We won it and rides on the result. *Where the
    points come from* counts breaks, made-it % and net points per bunker on
    this field from the results, and the field rings the bunkers green (wins),
    amber (costs). Below 900 px the field scrolls to the top when a bunker is
    tapped so the field and the questions share the screen; past it the sheet
    stands beside the field.

26. ~~The schedule, and a game you are not in.~~ Done — a coach scouts the team
    he plays next, and who that is is on a schedule the league publishes; the
    app had no idea any game existed but the one in front of him. More →
    Schedule carries every game at the event, read off PBLeagues on 13 Sep 2026
    from a screenshot and sourced like the pro board — nothing is fetched,
    because there is no network. A row opens three ways. **Watch this game**
    puts the home team in the left pit and the away team in the right (the
    league's own legend says which is which) and starts a sheet flagged
    `watch`: it counts against those two and never against him, so a call
    logged on it is out of `loggedCalls()` and his self-scout is still his.
    **We play** either side starts an ordinary match. A schedule can also be
    pasted — best effort, line by line, and what it read lands as ordinary rows
    he can take off one at a time — or typed a game at a time.

27. ~~The penalty.~~ Done — a point played three against five was recorded
    identically to an even one, so whichever bunker a man happened to break to
    wore a loss that was decided in the box before the buzzer. The point sheet
    has a **Penalty** button between the read and the result, which is where it
    happens: side, how many men, and optionally who and what it was. The app
    never calls a penalty and never will — an official calls it and the coach
    writes down what it cost, the same contract as every other number in here.
    `startUp(side, m, pt)` is what a side actually began the point with, so the
    men-up counts are right; `evenPoint(m, pt)` is what **Even points only**
    filters on. That switch is off by default and says how many breaks it would
    drop, because silently rewriting numbers he has read all day is worse than
    the distortion it fixes.

28. ~~The format.~~ Done — X-Ball and 5-man are both a race to N points, and the
    app never knew N: the score was 1–1 forever, nothing was ever match point
    and nothing ever ended. `raceTo` is on the match, set on the point sheet
    (2 · 4 · 5 · 7 · —) because it is the coach's format and not a rule the
    app carries. The header chip reads `3–3 to 4`, the sheet calls **Match
    point** (yours, theirs, or both ways) and **Match over — you won 4–3**, and
    `derivedState()` reads Must-score at their match point whatever the
    margin. `matchOver()` / `matchPoint()` are the doors. A new sheet carries
    the format over, because it is the event's, not the sheet's. No N means no
    race: the score is just the score.
29. ~~Ends.~~ Done — the two teams break from opposite ends and which end is
    yours changes, at the half or every point; the app drew every break from
    the left end and `sideOfBunker` called every bunker in the left half yours,
    so a point broken from the far end was tallied back to front and its route
    drawn from the wrong goal line. `ourEnd(pt, m)` is the door: `end` is the
    match's point-one end, `swapEnds` alternates it, **Switch ends** flips this
    point and **Swap every point** sets the rule without moving the end he is
    on. Tally's yours/theirs, the breakout sheet's far half, `autoRoute()`'s
    start line and the Scout mirror all read it; `displayPaths()` turns the
    routed break round for the right end with faces and shots mirrored
    (`mirrorDirect`, a lane flips, a bunker becomes its twin), and path edits
    made on the turned field go back through `ownFeet()` so plants, edits and
    directions all stay in the frame they were set in. The field marks your
    end with a bar in your colour.

30. ~~The clock between points.~~ Done — X-Ball gives a coach a set time from
    the hang to the next buzzer to call the break and set his five, and it is
    the only clock in the app he runs himself: the point clock and the match
    clock belong to the official. How long is the event's rule, so it is set
    on the point sheet (Off · 1:00 · 1:30 · 2:00) and never shipped as a
    number. `breakClock` rides on the match like `raceTo`; `S.clockEnd` is
    scratch and never survives a relaunch. `endPoint()` starts it, because the
    hang is when it starts on the field; the chip in the header counts down on
    every tab and a tap stops it. One `setInterval` writes the text of every
    `[data-clock]` element — never a render a second under his thumb.
31. ~~The horn, overtime and 5-man.~~ Done — the match clock ran out and the
    app had no word for it. **Time's up** on the point sheet: ahead, the match
    ends at this score (`timeUp`); level, overtime — the race moves to one past
    the tie, `ot` is set and `raceWas` keeps the real race so the next sheet
    starts from it. `inOvertime()` is the door and the sheet says "Overtime —
    next point wins it" rather than "match point, both ways". **One point ·
    5-man** is `raceTo: 1`: every sheet is one game. And a sheet that is over
    stands its result buttons down — New match leads, Back a point stays — so
    the mis-tap after the hang is not a sixth point on a race to five.

32. ~~The five on the point, and the record.~~ Done — X-Ball rotates nine men
    through five slots between points, and `fiveFor(pt)` fell back to roster
    order the moment a point had no lineup of its own, so a coach who wrote his
    five on point 1 had roster slots 1–5 on point 2 on Tally, Playbook and the
    cards until he went back under More. `lineupAt(pt)` is the door: the five
    written for this point, else the last one written before it on this sheet
    — a five stands until he changes it. **Who's on**, above his five on the
    point sheet whenever the roster is bigger than five: tap a man off, tap a
    man on (`swapOn`), written as this point's own lineup from the five that
    was standing so the other four keep their slots. More › Lineups still sets
    slot order and says when the five was carried. More › Matches opens on the
    record at this event — won, lost, open — counted from `matchOver()` on his
    own finished sheets at this layout, watched games out, open sheets counted
    as open and never guessed at.

33. ~~The rulebook, read.~~ Done — the owner handed over the NXL Divisional
    X-Ball Rules 2026 and `docs/RULES-CHECK.md` walks its structure against the
    app by section. Four things changed: a **mercy rule** on the point sheet
    (`mercy` on the match, set like the race; `matchOver()` ends it at the
    lead and `matchPoint()` calls it one short), ends that switch on **points
    scored** rather than the point number (a no-point moves nobody; overtime
    starts on the pit side, `otFrom`), a **0:45** break, and a penalty that can
    take **four** men with the one-for-one / two-for-one / three-for-one bodies
    explained. Still none of the league's text is in the app, and every number
    is set on the sheet. Open: the one-minute **timeout**, one per team per
    match (9.7).

## Data (localStorage is the working store; `@capacitor/preferences` mirrors it)

User, Team, Player, Event, Layout/Bunker, PathEdit, Match, TallyEntry, Breakout, ScoutEntry, ScoutTeamProfile, BunkerCall, ClassSession, ClassResponse, LeagueGroup, LeagueMember, LeagueBlast, Message, AssessmentEntry.

A **Match** is `{id, at, vs, layout}` and every row logged on a sideline carries
its id in `m`. A **result** is `{m, pt, won}` — one per point, and the score is
the count of them. Point numbers are per match and start at one. Lineups are keyed
`<matchId>|<point>` — never by point alone.

## Do not

- Rename a lowercase `gridlock` token, or write the brand name into one. The
  display word is Gridlock and it changes per build; `gridlock.coach.v2`,
  `gridlock.coach.copy`, `window.gridlockKeep` and the rest are where a coach's
  season lives, and are identical in every build or the other build cannot read
  it. `scripts/brand.js` counts them and refuses. Never `Grind X` in `web/` or
  `site/` either — the variant is generated, and the suite fails on a stray name.
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
- Leave the break animation running when the coach leaves the tab. The loop
  ends by calling `render()`, which rebuilds the screen — right while he is
  watching it, wrong two seconds later on a tab he has moved to. Tap Play, go to
  Messages or Walk or the roster paste box, start typing, and the run finishes
  and wipes it, because nothing is committed until `onchange`. `set()` stops it
  the same way it ends the drill.
- Draw anything a finger has to grab below the `data-pick` surface in
  `fieldSVG`. The tap surface is the top layer on purpose — a bunker is ten
  pixels across and the field takes the tap — so a handle rendered anywhere
  before `${pick}` cannot receive a pointer. The `aimHandle` slot after it is
  where grabbable things go.
- Trust a passing suite as proof a screen is right. The tablet rail measured as
  a rail and every check was green while each button was a 146 px slab with its
  label under the marker, because the media block sat above the base rule it
  meant to override. Take the screenshot.
- Assert what is on screen with `document.body.textContent`. The whole app
  sits in a `<script>` inside `<body>`, so that matches any string literal in
  the source and passes whether or not anything rendered. Read
  `document.getElementById("root")` instead. Twelve checks were written that
  way and one of them was a false positive.
- Open something under the field and call it done. On a phone the field is
  most of the screen, so a sheet that renders beneath it renders below the
  fold: the coach taps a bunker and nothing appears to happen. Scroll the field
  to the top of `.main` when the sheet opens, or put the sheet beside it.
- Add a list to a row without teaching `copyDataError` about it. Rows are
  scalars-only by default, so the `plants` list on a logged break made every
  copy of a season that had one refused as "scout" — a backup that cannot be
  restored. `breakouts` carries `route` the same way; the schema names the
  one non-scalar field and checks its shape.
- Key a drawing cache on the path number and the current call. Their break on
  Scout carries the same numbers under the same call, mirrored, so
  `drawnRun` handed the mirrored curve back for your own path on Playbook
  and the sampled run cut through two bunkers on Lone Star. The key is the
  legs themselves now. The Scout field draws one pit at a time for the same
  reason it draws their call rather than yours turned round: ten lines
  crossing at the fifty said nothing, and a mirror is not a scout.
- Draw the break on a screen that is not about the break. Movement, Bunker
  stats, Team's bunker naming, Scout's layers and Sightlines each drew the five
  red paths over the thing they are actually for, so a coach logging a rotation
  was reading a call nobody made on that screen. `noPaths:true` on every field
  whose subject is something else; Playbook, the Rep drill and Scout's own
  break section keep them. The suite counts runners per screen.
- Ship a screen with no answer behind it. A coach on a sideline has no signal
  and nobody to ask. Every screen has an entry in `HELP`, the header carries a
  `?` that opens the entry for the screen he is standing on, and `HELP_Q`
  answers the questions in the words he asks them. The suite fails when a tab,
  Scout sub-tab or More section has no entry, so a new screen cannot ship
  undocumented. Page hints are dismissible and `showHints()` puts them back.
- Ask a coach to draw what the app already knows. Tally made him trace the run
  by tapping the field — five taps a man, between points — when the sheet
  already told it the bunker he broke to, the bunker he moved to and whether he
  was delayed. `autoRoute()` works it out and the same router that draws the
  twelve takes it round the bunkers in the way, so the line goes *around* rather
  than through. A row traced by hand in an older build keeps its own: what he
  saw beats what the router works out, and `routeOf()` is the door. The router's
  shoulder is tried wide first and tightened only where wide finds nothing,
  because `routeClear` gives up on a walled-in leg and gives back a straight
  line through whatever is there. 342 of 346 runs across three fields clear
  everything; the four that do not are the deep end of the Midwest snake, where
  the only way in is along the snake itself, and the suite pins that number by
  name so it cannot quietly grow.
- Draw something only while it is being filled in. Tally's route was rendered
  from the open draft alone, so the moment a coach tapped Log this breakout the
  run he had just traced vanished — five men charted over a point and the field
  showed five squares. The rows carried `route` the whole time; it was never
  read back. One `routeSVG()` draws both now, logged runs a shade lighter than
  the one in hand so the man he is working on still leads. Ask of anything
  traced or drawn on a sheet: what does the field look like *after* it is
  logged.
- Bury the controls under the field. Playbook's field is most of the tab, so
  anything below it starts a screen and a half down: writing a play was at
  1426 px, which is not shipped, it is hidden. **Change the call** and
  **+ Yours** sit directly under the field now, a thumb from it and from Play
  the break, at ~650 px. They are folded — twelve wrapped buttons are a screen
  of their own — the same shape Tally already uses on the point sheet. Nothing
  goes *above* the field either: on first run the page hint is still there, and
  a button row over the field pushed it past the 55 % line the suite holds.
- Treat the twelve as his playbook. They are a **library**: they ship so day one
  is not an empty tab and so Rep, Counter and self-scout have something to work
  against, but a coach runs six of them and two of his own, and the rest are
  somebody else's plays sitting in his picker between points. `S.offPlays` holds
  the built-ins he does not run and `pickPlays()` is what every picker offers —
  Playbook, the point sheet, the Rep drill, Counter's "we call". `allPlays()`
  stays the whole registry, because a call is still named on the sheet he ran it
  on, `callName()` and `fixBreak()` read through it, and **their** break is never
  limited to what he runs. Turning one off is never a delete: the count behind it
  is untouched and one tap puts it back, the last one standing cannot be turned
  off, and turning off the call he is standing on moves him to one he runs.
- Let the app decide what a penalty is. It does not have the rulebook and must
  never behave as if it does: an official calls it, the coach records what it
  cost, exactly as he records who won the point. A penalty row is side + how
  many men off, stamped with the match and the point it was **served** on —
  which is the point that was actually played short, not the one the flag went
  up on. `startUp()` never returns below one: a side with nobody on the field
  is a typo, not a point.
- Count a short-handed point like an even one. Five against three is not a
  bunker's fault, and *Where the points come from* was marking a bunker down
  for it. `evenPoint(m, pt)` and the **Even points only** switch are the answer,
  and the switch defaults **off** and reports what it would drop: a toggle that
  silently rewrites numbers a coach has been reading all day is worse than the
  distortion it fixes.
- Ship the league's rulebook inside the app. It is the league's document, a
  stale copy is a coach quoting last season's rule at an official, and nothing
  in here adjudicates anyway. Take the structure from it — what a penalty costs,
  the match format — never the text.
- Let a game the coach watched count as a game he played. Scouting Dynasty off
  the fence is the point of a schedule, but every row it logs is stamped with
  `S.matchId` like any other, so without a flag his own self-scout would be
  reading somebody else's playbook back at him and his score would carry points
  he never played. A watched sheet carries `watch:true`, `home` and `away`;
  `watchedMatch(id)` is the door, `loggedCalls()` filters through it, and
  `matchLabel()` / `sideWord()` name the two teams rather than "us" and "them",
  because there is no "us" on that field. Tally says so on screen and sends him
  to Scout, which is where two other teams are actually charted.
- Fetch a schedule, or let the app imply it could. There is not one `fetch` in
  it and that is the whole reason it works in Garland. `SCHEDULE` is read off
  the league the way the pro board is — a screenshot from the coach — and it
  carries `read` (where and when) and `covers` (what the read did *not* reach;
  Sunday was off the bottom of the page). A league row is never edited in
  place: one he does not want goes in `S.gamesOff`, and `S.games` holds only
  what he added, so a re-read replaces the seeded list wholesale.
- Assume there are twelve calls. A coach runs plays the app has never heard
  of, and a break here is only five bunker ids per field — the paths, the
  buzzer order and the job labels all fall out of those five against the
  measured layout. So `S.plays` holds his own, keyed `my:<n>` so it can never
  collide with a built-in, and `allPlays()` / `playKeys()` are what every
  picker and every lookup reads. Never `Object.entries(BREAKS)` on a screen.
  Plants are per field and are never guessed: a play written at one event says
  so at the next and offers to be built there. Team renames the app's twelve
  only — a play already carries the name he gave it, and a second name on top
  of the first is a trap.
- Make a price or account claim on the welcome page. It carried "No account
  needed · nothing ever leaves your phone", which is true — the money runs
  through the coach's Apple ID, so there is never a Gridlock sign-up — but on
  a first screen it read as *this is free*, and a wall on Scout after it would
  be a bait. The owner's call is that the page sells what the app does and
  nothing else. A welcome screen that promises nothing cannot break a promise.
  The price lives on the store listing and on More → Plan; the privacy promise
  lives in the privacy notice, on Nexus and in Help, where a coach goes looking
  for it. The suite fails if "free", "$" or "no account" reappears on the promo.
- Put a wall in front of anything a coach does while a point is on, and never
  in front of **Save a copy**. There is no server: that file is the only thing
  protecting his season, so charging for it makes his own data a hostage. The
  free plan is the whole sideline loop — Playbook, Tally, the score, Sightlines,
  the field screens, his own words for everything, and the match he is on. Team
  is the between-events half: Scout, Cards, Rep, Assess, and opening an older
  sheet. `PAID` names it, `gateKey()` reads the exact screen before falling back
  to its tab, and `BILLING_LIVE` is off until a store is wired up. Nothing is
  ever deleted or hidden to make somebody pay — a locked sheet is still listed.
  `docs/PAYWALL.md` is the switch-on.
- Print the app's name for a job either. A job is written as the bunker and
  the wire — "SB · snake wire" — which is a description, not a play, and a team
  that calls the break "Rocket" calls its five "Rocket 1" through "Rocket 5".
  `jobName(script, id, fallback)` is the door; the Job chip on the man's row on
  Playbook is where it is set. Kept per call and per slot, never per field:
  slot 1 is the same job wherever it is played, though the bunker it plants on
  changes with the layout.
- Print the app's name for a call when the team has its own word for it. A
  coach shouts what his team has always shouted, and an app answering in its
  own vocabulary is one more thing to translate between points. `callName(key)`
  is the only place that decides what a break is called — never
  `BREAKS[k].name` on a screen — and Team names all twelve the way Bunker calls
  already names the field. A rename is a label and never a record: a logged
  call keeps the break's key, so renaming re-labels the whole season at once.
- Paper the field with bunker codes. Forty-five two-letter labels at the same
  weight as the bunkers is a wall of type on a phone, and the break, the outs
  and their five are all read through it. `bunkerLabels` is a layer like every
  other: `S.namesOn` (off by default) drives the **Names** chip on Playbook and
  Scout, and `opts.names` forces it on only where a named bunker is the subject
  — Sightlines, Movement, Bunker stats, the arrival trail, Team's own naming.
  Tally needs none of it: the sheet names the bunker the moment you tap it.
- Hang a form off the bottom of the welcome page, or bottom-align a scrolling
  column. The sign-in panel was appended under the three buttons and the
  footer: off the fold on a phone, with six buttons and two ways to do one
  thing on screen at once. It replaces the choices now — one screen, one job,
  and the pitch goes with them, because a coach filling in the form has already
  decided. And `.promo` used `justify-content:flex-end`, which pushes the first
  child above the scroll origin the moment the content is taller than the box,
  where it can never be scrolled back to — that is how Gridlock ended up under
  the status bar. `margin-top:auto` on the first child does the same job and
  collapses to nothing when it overflows.
- Put a way past the welcome page that is not the account. The owner's call is
  that everyone signs in, so there is no guest button and nothing on that screen
  sets `entered:true` — the suite counts the routes and reads their handlers.
  The page still has to explain the app to somebody who cannot get in yet, so it
  leads with what it does in three lines and **Show me how it works** renders the
  tour *on the promo* without entering. Two things must stay true with it: the
  class deep link is the one exception, and `contextWarning()` is on the promo,
  because on an address the phone calls insecure there is no `crypto.subtle` to
  hash a password with and sign-in refuses — which used to cost one feature and
  now costs the whole app.
- Let the account server stand between a coach and the point he is calling.
  Accounts and purchases go up; **the season never does** — roster, tallies,
  scouting, his words and his plays all stay on the phone, which is what makes
  the promise worth keeping and keeps competitors' data off a machine you own.
  `window.gridlockCloud` is the adapter (Supabase behind it, anon key only —
  the service key never ships). Offline-first is not negotiable: a successful
  cloud sign-in writes the local salt and hash, `offline:true` falls through to
  that copy and says nothing about the network, and only `ok:false` *without*
  `offline` is a real refusal. A field in Garland has no bars, and a server that
  can lock him out between points is worse than no server. `docs/SERVER.md` is
  the switch-on, and its up/stays table and the sign-in panel's copy change in
  the same commit or the app is lying about where the data is.
- Let a restore carry the session. `save()` writes the whole of `S`, so
  `entered`, `role` and `email` ride in the durable copy — and a fresh install
  restoring it opened straight into the app, past the sign-in the app now
  requires, on a device that may hold no account at all. `gridlockRestore` holds
  those three back the same way it holds the screen he is standing on: the
  season restores, the session does not. The recovery notice therefore has to
  render on the **promo**, because that is now where a restore lands — a coach
  whose phone lost its storage must not sign in believing his season is gone.
- Put a credential in the app, or let it make or check a verification code.
  The app makes no network calls — there is not one `fetch` in it, and that is
  why it works on a field with no signal. So identity that needs a network is an
  adapter the native shell fills in: `window.gridlockApple.signIn()` for Sign in
  with Apple, `window.gridlockVerify.start/check` for a phone number. Neither
  screen renders unless its adapter exists, because a button with nothing behind
  it is worse than no button. A Twilio or Apple key inside a bundle is a key
  anyone can pull out and a bill that is yours; and a code this device generated
  and then marked correct proves nothing, because the answer was in its memory
  the whole time. An Apple account is keyed on `sub`, never the email — Apple
  hands back a relay address and withholds it entirely after the first sign-in.
  `docs/IDENTITY.md` is the switch-on, including what 10DLC and SMS pumping cost.
- Tell a coach his password is wrong when the truth is that this phone has
  never heard of him. With no guest path a failed sign-in is a lockout, and
  with no server an account cannot be looked up — so a new phone, a wrong
  password and a different email are three different things and say three
  different sentences, on screen rather than in an alert. Every one of them
  says the season is **not** kept inside the account: it is a separate store,
  so making a new account loses nothing that was logged, and Nexus › Save a
  copy is how a season actually moves between phones.
- Tell a coach an account is optional. The auth panel said "Coaching a match
  needs none", which stopped being true the moment the promo required one. It
  says what the account actually is instead: a lock on this phone, with no
  server to send it to.
- Open a sheet with nobody to log against. Tally's field opened the breakout
  sheet whether or not the match had an opponent, and Log stored the row with
  `vs: ""` — a point charted into a void while the gate above it said to name
  the team first. `tallyTap()` and `logBreakout()` both go through
  `needOpponent()` now: no sheet, the picker scrolled under his thumb and lit,
  and when Scout already has a team in the right pit, **Play ‹team›** is one
  tap (`playPit()`). The first real sheet replaces the blank unnamed one the
  app opened with rather than leaving "No opponent" in his list of matches.
- Land a tab inside one of its screens. `more` defaulted to `"classes"`, so
  the first thing under More was a clinic sign-in form, not the menu of
  fifteen. A tab opens on its menu; the section a coach was on is remembered
  after that.
- Assume your five break from the left end. They break from whichever end the
  format put them at this point, and theirs from the other. Anything that
  decides yours-from-theirs by `x < 75`, starts a route at `x = 3`, or draws a
  break from the left asks `ourEnd()` first; the test is a point broken from
  the right end tallying, routing and drawing the right way round.
- Persist what the coach was in the middle of. `playing` was reset on load and
  nothing else was, so eleven scratch keys rode a relaunch — and two of them
  wrote bad data rather than merely looking odd: a Right read ticked on Saturday
  and never used was recorded against whatever point was ended next, and a
  half-filled breakout sheet came back open on yesterday's bunker, one tap from
  being logged under today's point number. A launch is a fresh start on every
  screen; only what was logged survives it. The block that clears `paste` clears
  all of them now, and the suite reloads the page to check it.
- Keep a clock the official keeps. The point clock and the match clock are
  theirs; the app records what the coach says happened to them — Time's up —
  the same way it records who won the point. The one clock the app runs is
  the one between points, and its length is set on the sheet, never shipped.
- Print a percentage nobody counted. Counter ranked the twelve against their
  tendency and printed the heuristic's score as "52%", which a coach reads as
  odds of winning the point. `fitWord()` says it in words — Strong fit, Good
  fit, Fair, Weak fit, Yours — and the order is the whole claim.
- Leave the result buttons up on a sheet that is over. The tap after the hang
  is reflex, and on a finished race it scored a point nobody played.
  `matchOver()` swaps them for New match and keeps Back a point.
- Fall back to roster order for the five. A lineup set on one point is the
  five until the coach changes it: `lineupAt(pt)` carries the last one written
  forward, and anything that names the five — Tally's column, Playbook's jobs,
  the cards — reads `fiveFor()`, never `S.roster.slice(0, 5)`.
- Make a coach leave the point sheet to rotate. Nine men and a sheet that can
  only name the first five is how an out gets tallied against a man in the
  pit. Rotation is on the sheet (**Who's on**); slot order is under More.
- Teach one screen the format and not the other. The landscape log is the
  point sheet turned sideways — the same `endPoint`, the same call — so it
  reads `raceTo()`, `matchPoint()`, `inOvertime()`, `matchOver()` and the
  break clock exactly as the sheet does, and stands its result buttons down
  when the match is over. A screen that scores points has to know when the
  match has ended.
- Send a coach to Division › Missing a team from the sideline. The opponent
  gate on Tally takes a typed name: `playNamed()` adds it to the division
  when nobody has it and puts it in the right pit through `setPitTeam`, the
  same door the picker uses. An empty roster offers one tap to Team the same
  way, because "add them in Team" with nothing to tap is a scavenger hunt.
- List their five as "#1" to "#5" when Scout has their names. The right pit
  keeps the men a coach has logged — number, name, wire — and Tally asked him
  to forget them between points. `theirNames()` is the door: what is logged,
  numbers filling to five, numbers alone on a watched sheet because those are
  not his men to name.
- Let a season go unsaved in silence. There is no server, so the copy is the
  only thing protecting it, and nothing said how long it had been. `copiedAt`
  is set by Save a copy and Show it as text; `copyNudge()` speaks up on a
  finished sheet and under the record on Matches, only when something is
  logged and the copy is a week old or missing — never while a point is on.
- Count a call twice because a thumb tapped twice. One point has one call:
  `logCall()` replaces what this point already logged, so a double tap and a
  changed mind both leave one row, and self-scout reads what was actually run.
- Make a mis-tapped out a trip to the log. Tap a man and he is out; tap him
  again and he is back in — `markOut()` toggles on the live point. The log's
  Undo is still there for a point that has been left.
- Let a half-picked five ride into the next point. Their bunkers tapped on
  Scout and not yet logged are scratch for *this* point; `endPoint()` and
  `nextPoint()` clear `theirPick` with the rest of the sheet, or they would be
  logged under the next point number.
- Decide what a level horn means. Some formats let a prelim end tied and
  some play on; the app has neither rulebook, so when the clock runs out
  level the sheet asks — **it's a tie** (`timeUp` + `tie`, `matchOver()`
  reads "tie") or **overtime** — and the record counts tied beside won and
  lost. `overWord()` is how a finished sheet is read out everywhere.
- Label both pits "Opponent". A coach asked which one he was playing. The
  right pit is **who you play** — Tally, Counter and the sheet all read it —
  and the left is **a team you watch**: the other side of a game off the
  fence, or someone to read beside them. The empty-pit note says so for each.
- Call a game that was only scored "no game". Scout › Games built its list
  from tallied outs, so a coach who tapped who won every point and never an
  out had games the screen said did not exist. A game is a sheet against
  them with a result *or* an out on it, each chip carries the score and how
  it ended, and the kept list under Matches says won / lost / tie the same
  way, through `overWord()`.
- Gate the breakout sheet and leave the result buttons live. With nobody
  across the tape, We won it, Log it and a tapped out all wrote to the "No
  opponent" sheet while the sheet above refused. `nobodyToPlay()` is the one
  test and `needOpponent()` the one door — `endPoint`, `markOut`, `logCall`
  and the landscape log all go through it; a watched game, with two named
  teams and no "us", never does.
- Offer a bunker as a word in a list when the field is right there. Walk's
  Where box was six wires and fifty-eight bunker codes in a dropdown, with no
  field to tap, on a screen whose whole subject is standing on the field. The
  field is the picker now, like Team's bunker calls and Movement: `S.walkPick`
  is the Where value itself, a wire or `call · id`, so the box and the field
  are two hands on one setting, a dot marks a bunker that already carries a
  note, and a note half-typed when he taps survives the re-render.
- Grade a man from a dropdown of the whole roster. Assess is "after the
  point", and the app knows who was on it: `onPoint(pt)` leads as tap chips,
  the bench follows, the score is five taps rather than a list, a chip carries
  the grade this point already gave him, and Save says what is still missing
  ("Tap the man first", "Tap a score") instead of refusing in silence. An empty
  roster offers one tap to Team.
- Set a slot from a dropdown of the squad, or let one change empty the other
  four. Lineups is tap the slot, tap the man: each row names the job that slot
  plays on the current call, the squad appears under the slot that is open,
  and a man already on another slot swaps rather than doubling up.
  `setSlot()` starts from the five that is standing, written or roster order,
  because a five that was only roster order used to come back as one man and
  four empty slots the moment one was set.
- Put a Send button in an app that cannot send. Messages said "Message the
  squad · Send", and a coach reads that as nine phones buzzing. A note is
  **kept**: it stays on this phone and travels in a squad copy, and the screen
  says so before the box, not only in Help.
- Ask for a jersey number without the number keyboard. Every `rost__num` box
  carries `inputmode="numeric"` — the Team roster rows, the add row, and both
  pits on Scout — and the suite reads the attribute off every one it can find.
- Look a screen key up in a table and call it unguarded. `S.tab`, `S.scoutTab`
  and `S.more` are each dispatched that way, and a saved state naming one this
  build does not have — an older copy, a renamed key, a hand-edited file — threw
  on every render, so the app went white and relaunching did it again, exactly
  the `fixBreak()` bug with three more keys. `fixScreen()` runs at the top of
  `render()`: an unknown tab is Playbook, an unknown sub-tab is Matchup, an
  unknown section is the More menu. The suite writes bad keys into storage and
  reloads.
- Pick the man from a list on any screen that is about this point. Movement
  logs who rotated, and the dropdown of nine asked a coach to find the man he
  was looking at. The five on the point lead as chips, the bench follows, Log
  names the man it will log, and with nobody tapped it says "Tap the man who
  moved" rather than returning in silence. Assess, Movement and the point sheet
  all read `onPoint(pt)` for the same reason.
- Stand the result buttons down and leave the handler live. `endPoint()` is
  reached from the point sheet, the landscape log, the Scout strip and whatever
  a later build wires to it; the sheet hiding its buttons on a finished race
  guarded one of those doors. A scripted match that kept calling it scored a
  race to four 6–0. The handler refuses on `matchOver()` now, and Back a point
  is the one way a finished sheet takes another result.
- Open an empty left pit on every Scout sub-tab. The left pit is optional, and
  unnamed it rendered as a full card with a twenty-row picker above the counter,
  the games and the layers. Off Matchup an empty left pit folds to one line
  reading "Nobody yet · optional"; the empty **right** pit stays open, because
  nothing below works until he says who he is playing.
- Call 900 px a tablet. Every iPad in portrait is narrower than that, so a
  coach holding one got the phone layout stretched: a bottom bar, a field most
  of the screen tall, and Change the call, Play the break and the Tally sheet
  under it. The rail now comes at 740 px wide **and** 600 px tall — every iPad
  either way up, never a phone on its side — and on those screens the field is
  fitted to the height there is; on its side, the call card stands beside the
  field as it does on a sideways phone, so Change the call and Play the break
  are on the screen with it. The devices suite expects the rail on the same
  rule.
- Go two columns off the viewport width. With the rail up, a 744 px iPad has a
  528 px column, and the pits and the Tally sheet both went side by side at a
  720 px *viewport*, squeezing each pit to 250 px: the stars ran off the card
  and a wire picker measured 38 px. `.main` is a container now and those
  layouts read `@container main`: pits two-up from 700 px of column, the sheet
  beside the field from 760 px, because a field at 240 px is a dot a bunker.
- Put the section name last on a line that ellipsizes. The header crumb read
  "event · call · section" and on a phone the ellipsis ate the section, so
  More › Lineups was headed "… · SNAKE …". The section is its own span that
  never shrinks (`.ctx__sec`); the event and the call are what give way. The
  call stays on the line everywhere, because what we are calling is read from
  any tab.
- Hide a table's columns behind a sideways scroll. Division was nine columns
  and 670 px, and on a phone 280 px of it sat past an edge nobody swipes.
  Film, Roster and Read from are `col-opt` and fold away under 620 px of
  column; the pit card says all three anyway.
- Put the one button a sheet exists for at the bottom of a long sheet. Log
  this breakout sat 1300 px below the top of the sheet on a phone — who, made
  it, how, the lane, at what, timing, moved to, route — and a coach logs five
  men a point. `.tsheet__act` is sticky to the bottom of the screen while the
  sheet is open, so Log is never a scroll away from whichever question he is
  on. The suite checks it is on screen before and after scrolling the sheet.
- Draw two fields on one sub-tab. Breakouts has its own field — the one he
  taps where their five ended up — and the shared break field above it put
  that job two screens down on a phone. Breakouts joins Games and Division in
  skipping the shared break section; their drawn call is still on Matchup,
  Counter and Layers. The training-aid line reads *under* every sub-tab, not
  over it: above, it was one more block between the fold and the field.
- Put eight controls between a coach and the field he came to tap. How did
  they get there had the pit, the team, the man, his number, the match, the
  point, the starting end, the start bunker and the destination list all
  above the field, which began 1050 px down a phone. The man leads, the field
  follows, the destination list is the fallback under it, and the pit, match,
  point and end are folded with the summary reading their current values.
- Ship a button whose only name is a picture. The eight lane arrows read as
  eight nameless buttons to VoiceOver; `FACE_PAD` carries the words now and
  both pads say them. A `.fld` is a label followed by its control with no
  `for`, so `render()` ties each control to the label above it in one pass,
  and the suite sweeps the point sheet, Scout, Walk, Movement and Team for
  anything a screen reader could not say.
- Keep an empty sheet. New match replaced the unnamed blank the app opened
  with, but a sheet that had a name and nothing on it — a second tap, or the
  wrong team picked and picked again — was kept, and sat in Matches and in
  every game picker with "0". A sheet with no out, no rotation and no result
  is replaced whoever it was named for. And Games printed "Point undefined ·
  0 of 0" for a sheet with results and no outs; with nothing to step through
  there is no Replay section.
- Hide the quick log at the foot of the point sheet. It was built for a phone
  on its side, and on that shape the tab it lives under is a header, a hint
  and a tab bar with a strip of field between. `.turn-bar` is the first thing
  on Tally and shows only in that one media state; everywhere else the offer
  stays where it was.
- Cap a picture that has a layer the size of its box. The whiteboard is a
  field with an ink layer that fills the wrap, so capping the field's height
  on a tablet letterboxed 525 px of field inside an 858 px wrap. The wrap is
  sized from the same cap (the board is 300 by 240) and the picture fills it;
  the suite checks the ink layer and the picture are the same box and a stroke
  lands.
- Open a sheet through more than one door. New match carried the format and
  replaced an empty sheet; Watch this game and We play on the Schedule did
  neither, so a game opened off the schedule had no race, no clock and left
  the blank sheet behind in every picker. `openSheet(fields)` is the one door:
  it carries the race, the clock, the end and the swap, recomputes the state
  and replaces an empty current sheet whoever it was named for.
- Print a read that nobody made. Anticipate's Likely, Tells and Your counter
  were fixed strings per pit: the right pit always read "snake stack or
  runner" whatever tendency the coach had set and whatever he had logged. The
  read follows the team — the tendency he set is the film read, and the calls
  he has counted on Breakouts lead when there are any ("Blitz — 2 of the 3
  breaks you logged") — and an empty pit gets no card.
- Model a timed match as a race. Divisional X-Ball is a game clock plus a
  mercy lead, and the app only knew first-to-N: the score was never match
  point and the match never ended at a 5-point lead. `mercy` rides on the
  match beside `raceTo`; both are the division's rule and both are set on
  the sheet. `docs/RULES-CHECK.md` is where a rule's structure is checked
  against the rulebook — never its text.
- Switch ends on the point number. Teams switch after a point somebody won;
  a no-point moves nobody, and overtime starts on the pit side. `ourEnd()`
  reads the results through `scoredBefore()`, so "Next point, no result" keeps
  the end and `endSwapped()` is the one place that decides.
- Count a watched game's breakouts as yours. On a watched sheet "us" is the
  home side, not his five, so *Where the points come from* and the uneven
  count both skip `watchedMatch(r.m)` the way `loggedCalls()` already did.
- Hide Time's up until a point has been scored. The horn does not wait for
  one: a long first point can run the match clock out at 0–0, and level is
  still a tie or overtime. The buttons stand whenever a sheet has an opponent
  and is not over.
- Tell a restored phone no copy was ever saved. What just loaded *is* a copy,
  so `loadCopy()` stamps `copiedAt`; the nudge is for a season that has
  never left the phone, not one that just arrived on it.
- Open Sightlines on whichever bunker the digitiser listed first. The
  question a coach walks over with is what his own man can see, so
  `sightDefault()` stands him in his first plant for the call he is on and
  falls back to the list only on a field with no plants.
- Draw both full pit cards above every Scout sub-tab. Matchup is where the
  two pits are read and edited; on Anticipate, Layers, Games or Counter two
  full cards put the screen he came for two screens down on a phone. A named
  pit folds to one line there (`pitLine`, `S.pitOpen` scratch opens it), an
  empty pit never folds because picking a team comes first.
- Make a rotation two 58-row dropdowns. Movement asked for the bunker he left
  and the bunker he went to from lists the length of the field. The field is
  the picker, as on Tally: tap where he left, tap where he went (`moveTap`,
  `S.moveFrom` / `S.moveTo` scratch, ringed on the field); the dropdowns stay
  underneath and follow the taps.
- Leave Bunker stats reading only the old out fields. The break chart is the
  busiest log on the phone and the screen never read it, so a coach who
  charted every point saw "Nothing logged yet". `bunkerTraffic()` counts a
  break to a bunker as a visit, a man shot there on the break as an out there,
  and where he moved to as a visit — watched games out, like everywhere else.
- Stand the result buttons down and leave every other door open. On a
  finished sheet the field still opened a breakout sheet, a tapped man still
  went out, Log it still logged a call and Scout still logged their five, all
  under a point past the end. `sheetOver()` is the one door: it says "Match
  over — New match starts the next sheet" and refuses; `tallyTap`,
  `logBreakout`, `markOut`, `logCall` and `logTheirBreak` all go through it.
- List a man by number and wire when his name is logged. Matchup printed the
  other team's men as "4 snake" with Dill's name a tap away on the pit card,
  and your five as jobs with nobody's name beside them. Names where the app
  has them, everywhere they are listed.
- Ask for a bunker from a 57-row dropdown while the field is on screen. The
  breakout sheet's Shooting at and Moved to take a field tap: arm one
  (`S.tallyPickFor`, scratch), tap the bunker, and `tallyTap` fills the draft
  instead of opening another man's sheet; the two targets are ringed on the
  field while the sheet is open. The dropdowns stay and follow the tap.
- Put the left pit in the coach's place. Counter read "Blast Camp against
  Rejects … and you are even" with Blast Camp the team he was *watching*.
  Only a watched sheet has two named sides; on his own, the line is "Against
  ‹them›'s likely break, and you are ‹state›".
- Draw a head-to-head bar between the left pit and the right on his own
  sheet. Matchup's threat bar read "Blast Camp ★★★★★ · ★★★★ Rejects" with
  Blast Camp the team he was watching. Two sides only on a watched game;
  on his own sheet it is "you" against their stars.
- Trust the overflow check for the header. It clips rather than scrolls, so
  a chip pushed off the right edge never read as overflow: at 320 px with
  the clock and the score up, the Staff chip was gone. Below 360 px the
  brand's second line goes, the chips tighten and the Staff chip steps aside
  (Nexus says who is signed in); the devices suite now measures that every
  header chip's right edge is inside the screen.
- Draw the field under a 58-row bunker dropdown and let it only decorate.
  Team's bunker calls drew the whole field beneath the picker and the picker
  was the only way in. Wherever a field is on screen and a bunker is being
  chosen — Tally, Movement, Team — a tap on the field chooses it, the
  dropdown follows, and the chosen bunker is ringed.
- Tell a coach where to go in a sentence with nothing to tap. Playbook's
  call panel said "Put the other team in the right pit on Scout" as text;
  on first run that is the first thing he has to do. Anything that names a
  screen he should go to is a button that goes there.

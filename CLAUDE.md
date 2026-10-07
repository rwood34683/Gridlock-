# Gridlock Coach — Claude Code instructions

You are working on **Gridlock System · powered by UPRA · Coach Edition**.
Paintball sideline app for coaches and league staff.

## How to use this repo in Claude Code

```bash
npm install
npm run serve   # http://localhost:5173
```

Dependency security handoff (2026-10-04): `sharp` is now `^0.35.5`, the
lockfile resolves `brace-expansion` to 5.0.12, and `xcode` uses UUID 11.1.1
through a scoped override. Keep that override until Xcode's upstream
dependency includes the buffer-bounds fix; UUID 11.1.1 retains its CommonJS API.
The new `test/dependencies.js` checks UUID buffer bounds, Xcode project parsing
and IDs, brace expansion, and Sharp image processing. It runs in `npm run check`.
The brand test also normalizes Windows paths before checking generated files.
Run `npm run test:dependencies` and `npm audit` after dependency changes.
Validation before this handoff: clean install, zero audit vulnerabilities,
build/site checks, and all 18 check suites passed after the Windows test fix;
the native sync check was skipped and native binary builds remain unverified.

Source of truth for *behavior*: `docs/GRIDLOCK-OVERSKILL-SPEC.md`
Source of truth for *working UI*: `web/index.html` (open in a browser)
Legacy native snapshot: `ios-native/GRIDLOCK-Coach/` (early SwiftUI, missing later tabs).
`ios/` and `android/` are the generated Capacitor projects — edit `web/`, then `npm run sync`.
Do not treat Overskill `.txt` as compiled code. It is the product prompt.

## Three builds, one source

The app ships as **Gridlock** (the default — everything committed reads
Gridlock), **Grind X** and **Lockdown** (variants built from the same source,
`lockdown://` and `com.upra.lockdown.coach` for Lockdown). All are
defined once in `brand/brands.json`; `npm run brand` builds, checks and
switches them, and `docs/BRANDS.md` is the long version. The rule: the capital
word **Gridlock**, the deep link `gridlock://` and the store identity change per
build; every lowercase `gridlock` token — `window.gridlock*`, the storage keys,
`COPY_FORMAT`, the service-worker cache, `GridlockVoiceParser` — is a namespace
shared by all and **never changes**. The build refuses if one moves, and
refuses any build that says another build's name.
Gridlock's logo is a picture with the name painted in (`web/logo-gridlock.jpg`,
`site/img/logo-gridlock.jpg`, the owner's artwork trimmed and compressed), so
no word swap can rebrand it: every place that shows it is an
`<img data-logo … alt="Gridlock">` — in the app through `logoMark()`, on the
site's header — and a variant build turns each into that build's name as text,
leaves the `logo-*` files out (`ships()` in `scripts/brand.js`) and refuses
itself if a `data-logo` survives. It is screened (`mix-blend-mode:screen`) so
its black drops out over the red glow on the welcome page; the service worker
caches it when it is there and never fails without it.

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
  is a participant signing a clinic sheet rather than the coach — and it opens
  the join sheet alone (`joinSheet()`, `S.joinOnly` scratch), never the app.
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
    race: the score is just the score. A race the score has already passed is
    a mis-tap, not a format — at 3–2 a race to 2 would have ended points ago
    and `matchOver()` called it for whichever side it checked first — so
    `setRaceTo` refuses it and says the least race that fits, and `setMercy`
    refuses a lead already past the mercy the same way.
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

34. ~~Counted intelligence.~~ Done — the owner asked for adaptive intelligence,
    tendency prediction and player judgement. The answer stays inside the house
    rule: everything is a count of what was logged, and the sample size is on
    every line. `theirReads(side)` joins their named calls with the score
    before the point and the point before, so Anticipate reads what they ran
    **when behind, when ahead, level, after losing a point, after winning one**
    — a bucket under three logged says nothing — and **Lately** compares their
    last five with the season and says "they may have changed" when the two
    disagree. `callRecord(key, team)` joins your logged calls with who won the
    point, so **Counter** ranks a call you have actually run against them by
    what it won ("won 3 of 4") and leaves the heuristic for the ones you never
    have. No model, no odds, no prediction. And the **timeout** from the
    rulebook (9.7): one a team a match, on the sheet, with the point it went on.
    A man is read the same way: `manRead(side, who, team)` counts his breakout
    rows — breaks charted, made it, shot on the break and from where, the
    bunker he breaks to most — and `manLine()` prints it beside their men on
    Anticipate and Matchup and under your man on Assess; *How they get you*
    names the bunker you lose men at most against that team.
    Four more counts sit on the same line, because the other scouting apps
    sell them and every one is already in the chart: **shooting off the
    break** (a lane or target ticked on his row), **took N off the break** (a
    man of the other side shot on that point from the bunker he broke to),
    **alive at the end** (only over points with an out tallied on them — a
    point nobody tallied says nothing about who was standing) and **first
    out**. No extra tap.
    Their team is read by wire the same way (`roleRead`, **By wire off the
    buzzer** on Anticipate): every told breakout row of theirs on this field,
    his sheets and watched games alike, sorted by the band of the bunker the
    man broke to, and counted stop / run (a Moved to) / shoot (a lane or
    target) / run & shoot — PB Scout's per-role read, out of rows already
    charted. A placed man not yet told is never counted.

35. ~~The read for the next point.~~ Done — the owner asked for predictive
    intelligence as strong as it can be made, and the honest ceiling is the
    data: tens of points a team, not thousands. So the read is the most
    specific situation the coach is in *right now* that has three or more
    logged — the score state with who won the last point, then the state, then
    the last point, then the season — and what they ran in it, with the count:
    `nextRead()`. `bestAnswer()` is the call of yours that won most on points
    where they ran that call, from your own record, else the answer you wrote
    on Counter. `nextReadLine()` prints both on the point sheet, the quick log
    and Playbook's call panel, with one tap to call it; thin data says it is
    thin. `likelyPlants()` draws a dashed, counted ghost of where they plant
    most on the Scout field until the real five is tapped in. Counts with the
    sample on every line, never a model or odds. Counter leads with the same
    read — "Rejects's Blitz — 4 of 4 when behind" — and ranks your calls by
    what each won on the points they ran that call (`recordVsCall()`), the
    film tendency standing in only until three are logged.
36. ~~The read, sharper.~~ Done — three moments a coach knows are their own
    were missing from the buckets: the **first point** of a sheet (a scripted
    opener), the point **after a timeout** (`timeoutOn`), and **match point**
    either way (`mpBefore`, read off each sheet's own race and mercy the way
    `matchPoint()` reads the live one). They lead in `nextRead()` when they
    apply and sit in `theirReads()` for Anticipate. The read line also says
    when their **last five** disagree with the bucket, and names **your own
    tell** — `myTell()`, the call you have run half the time or more against
    this team in the same score state, because they chart you too. The ghost
    five is named under the Scout field (`ghostLegend`) with the man usually
    sighted in each bunker (`usualMan`, off How did they get there). Nothing
    under three logged is said anywhere.
37. ~~Lanes off the break.~~ Done — the one thing the app can say about a
    call before it is run that is neither a count nor a guess is geometry:
    your five plant on five bunkers, theirs on five more, and whether the lane
    between two bunkers is clear is a fact of the measured layout, the same
    test Sightlines makes. `theirFiveNow()` is the five they logged on this
    point, else the five they usually plant under the read call; `laneClear()`
    is tried from a foot outside either side of the shooter's bunker and from
    its centre to the centre of the target's, either way round, because a man
    shoots from the edge of his bunker and not through the middle of it;
    `breakLanes(k)` counts how many of your five would have a lane on one of
    theirs off the break and how many of theirs on you, with your plants
    mirrored when you break from the right end. Shown on the call panel, the
    point sheet and under every call on the Counter, and the **Lanes** chip on
    the Scout field draws every clear pair white over black, per the lane
    rule. On a watched game there is no "you": `watchLanes()` runs between the
    home side's five on the left pit card and the away side's on Breakouts, or
    says which five is still missing, and the Counter counts no lanes of his.
    It never ranks anything: where they actually stand off the buzzer is the
    coach's read. **Their shooter** joins three counts and the
    geometry: `opponentRead().who` is the man of theirs who has shot yours
    most (two or more), `usualMan()` the bunker in their five he is usually
    sighted in, and `shooterLane()` names which of your five has a lane on
    that bunker off the break — on the sheet, Playbook and Anticipate, and
    with the Lanes chip on, his usual bunker is ringed and named on the
    Scout field so the lanes drawn on it read as his. Each man's **card**
    carries his own share of it — the bunkers of their five he has a clear
    lane on off the break, and whether one is their shooter's — in the
    share text too, because the card is what he is handed.
38. ~~The playbook is his.~~ Done — the owner asked for a playbook that is
    truly custom, and three things still belonged to the app. **Make it yours**
    (`copyPlay`) on any of the twelve opens the builder as that call — the five
    on every field the app has it on, its read and how hot it runs — and saves
    it as a play of his: move a man and he keeps his number (`playPick` leaves
    his slot open rather than sliding the others up), his Face, Shot, P|S, Go
    and job words on the app's version come across slot for slot, a drawn path
    only where that man still plants on the same bunker, and the app's version
    is turned off unless he says keep it; nothing logged under it moves.
    **Go** on each man's row is when he leaves — Auto (the app's timing: the
    longest run on the buzzer, the short ones held), **On the buzzer**, or
    **Delay** (`GO_DELAY`, later than the app ever holds anyone) — kept beside
    Face and Shot per field per call, drawn by Play the break and printed on
    his card. **Only my plays** (`onlyMine`) takes the twelve out of every
    picker in one tap, on the call picker and Team › Break calls, once he has
    a play of his own; his plays lead every picker (`pickPlays`); deleting the last play he runs
    with the twelve off turns the twelve back on and says so, rather than
    leave a picker with nothing in it. A half-built
    play is dropped on relaunch and on an event change, because its five are
    one field's bunkers. The builder opens under the field and the chips, two
    screens below its button on an iPad mini, so **+ Yours**, **Make it yours**
    and **Edit** all scroll it into view (`showBuilder`). On a 10.2-inch iPad
    on its side the call card is a 340 px column, and **Change the call** broke
    onto two lines inside a button of normal height, which no overflow or
    height check sees: `.callrow` keeps every label on one line and wraps the
    row instead, a red Delete keeps its own width, and the devices suite counts
    each label's lines on twenty devices, the 10.2-inch iPad both ways up and
    the Air on its side among them.
39. ~~Where they went, then what happened.~~ Done — the owner asked for the
    break chart in two steps. Off the buzzer ten men leave at once, and the
    sheet asked for one man's whole story before the next could be placed,
    so by the third man the first two had moved. **1 · Where they went**: a
    tap on the field is a man on that bunker (`placeAt`), yours or theirs by
    the half it lands in unless **By half / Your five / Theirs** says
    otherwise, capped at what the side started the point with
    (`startUp`), and a second tap on a man not yet told takes him off. He is
    an ordinary breakout row from that tap, carrying `todo`. **2 · What
    happened** (`tallyStepTo`) opens the first man still to tell in the same
    sheet as before (`editBreakout`); Save writes over his row by id and
    opens the next, and a field tap on any other bunker still charts one more
    man the old way. `tallyStep`, `tallyEdit` and `tallyPlace` are scratch,
    and a new point starts on step one and by half (`clearPointScratch`:
    Theirs set for one man who broke deep is not the next point's break);
    Take him off on a placed man opens the next one still to tell, as Save
    does — but a man placed and not told
    before the buzzer is never out of reach: `tellBacklog()` is every untold
    man on the sheet, the point he is on first, the list under the field says
    *Point 3 · 2 still to tell*, and the out he is told shot on is written to
    his own point (`outRow` takes `pt`), not the point the coach is on now.
    A finished race does not stop him placing or telling them — the last
    point's men are charted walking off, after We won it, and land on that
    point (`sheetPoint()`); only a sheet on another field refuses. And a
    new sheet does not hide them in silence: New match says how many men on
    the sheet it closes are still to tell (`untoldOn`), and the sheet's row
    under Matches says so until they are told.
    Their men placed on Tally are their
    five on Scout too (`syncTallyFive`): the point's break row for the team on
    the sheet takes their bunkers, marked `tallied`, so Where they plant, the
    ghost, Lanes off the break and their shooter read a five charted once. A
    five he tapped on Scout's Breakouts for that point stands and is never
    written over; naming their call afterwards keeps the row in step. On a
    watched game the sheet names the two teams and offers numbers for both
    sides — the home side is not his five, and a home man filed under one of
    his own names would land in that man's read.

40. ~~A field of his own.~~ Done — the app carried three NXL fields and every
    other paintball app lets a coach use the field he is on: PB Scout puts his
    players on a photo of it, Paintball Coach ships dozens of layouts, Paintball
    Stats picks a field. A coach at a regional event or his home park had
    nothing to stand on. More › Nexus › Events › **Build a field**: name it,
    pick a bunker type (`BUNKER_KINDS`, footprints from `layouts/bunkers.json`),
    tap where it sits; its twin appears across the fifty (`tw` on both), one on
    the fifty stays single. Tap a bunker to pick it, then Turn, move it or take
    it off (asking first when anything logged names it — `bunkerUses`). Ids are
    never reused or renumbered, because a breakout keeps the id of the bunker it
    broke to. Eight bunkers (`FIELD_MIN`) and it registers into `LAYOUTS` under
    a `my:` key (`registerFields()`, run at launch, after a copy loads or a
    restore, and on every change), and the twelve calls plant on it by
    `plantRule` — the rule `tools/plants.js` runs, ported, and the suite holds
    the two together by running the app's copy over the three measured fields
    and expecting `BREAK_PLANTS` back. Fields ride in both copies (`fields` in
    `SAME`, the schema checks the bunker list), and a field a sheet was played
    on cannot be deleted.
41. ~~The map under it.~~ Done — PB Scout's whole field is a photo, and a
    coach building a field by eye off a map held in his other hand was guessing
    twice. **Put the event's map under it** in the builder takes a screenshot
    or photo, downscales it to 1000 px (`FIELD_MAP_MAX`, a JPEG under
    `FIELD_MAP_BYTES`), turns a tall one on its side, and draws it faint under
    the field, stretched to its edges; **Turn the map** turns it a quarter,
    **Hide** and **Take the map off** do what they say. It is a guide and never
    a measurement — the footprints are still the inflatables — but it gives what
    the eye cannot: the paint. `mapPaint()` reads the inner part of each
    bunker's footprint on the map and calls it red or blue only when that
    colour is most of what is there; anything else is grey. The map is kept
    beside the season, not in it — its own key, `gridlock.coach.maps`
    (`FIELD_MAPS`, `keepMaps()`), mirrored to the phone's durable store like
    the season and the account and restored by `gridlockRestoreMaps` — because
    a picture of a few hundred kilobytes inside the season was written again
    on every tap of a sideline. `mapOf(f)` is the one door every screen reads
    a map through; a copy carries each map on its field (`fieldsOut` in Save a
    copy and Send this sheet) and the schema takes only a `data:image` JPEG or
    PNG under the cap; `liftMaps()`, run by `registerFields()`, takes a map
    off any field that arrives with one — a copy, a restore, an older save.
    Deleting a field takes its map; Replace takes only the copy's maps. The
    decoded pixels (`MAP_PIX`) are never saved.
42. ~~Two phones, one match.~~ Done — Breakout Paintball and Scout Pro sell
    one match charted by two people, and here it took a whole-season copy each
    way, which hands an assistant every scouting note you own. **Send this
    sheet to another coach** on Matches › This match writes a copy with scope
    `sheet` (`sheetPayload(id)`): the match row, every row stamped with its id
    (`SHEET_LISTS`), its lineups, their breaks on it and only the profile of
    the team or teams on it, the roster its names are read against, and the
    field if he built it. It goes out through the same share sheet or download
    as Save a copy (`sendSheet`). The other phone merges it through Load a
    copy like any copy — the `SAME` keys join it, so sent back and forth it
    doubles nothing — the team joins his board (`boardTeam`), and **Open** under
    the message takes him to it (`openSentSheet`, `S.copySheet` scratch);
    Replace refuses a sheet. Still no server: the file travels however he
    sends files. Two coaches overlap — both log point 3's call, both tap the
    same man out — and a merge only skips byte-identical rows, so
    `reconcileSheet(mid)` runs after a sheet merge and holds the one-a-point
    rules: one call a point, one out a man, one row a named man, one grade a
    man, one break of theirs a point (the first keeps its row and takes what
    the other had). This phone's row wins; a point the two phones scored
    differently keeps this phone's result and the message names it; and a
    coach standing on that sheet is moved on to the first point with no
    result, or his next tap scores a point twice.
    A whole-season copy can hold the same sheet too — an assistant who
    charted the match and sends his season — so the reconcile and the score
    check run on every sheet both phones hold, not only on a sheet sent alone.
    And a team the other phone typed another way ("dynasty") lands under this
    phone's spelling: the board's, else what this phone already logged them
    as, re-keyed through `rekeyTeam()`, the store-by-store move `renameTeam`
    makes, with the board keeping this phone's spelling on a merge.
    The rows a point can hold more than one of — a penalty, a rotation, a
    sighting, a shot — cannot be held to one a point, so `overlapRows()`
    keeps the larger of the two phones' counts for each (point, side, what),
    never the sum: the same 1-for-1 written on both phones took two men off
    `startUp()`. A timeout is one a team a match and keys on the side alone.
    A man placed and not yet told has no name, so the bunker is what knows
    him: an unnamed row from the other phone goes where this phone already
    has as many men on that bunker on that point, told or not. The match
    row itself is this phone's, but what only the other phone set on it —
    the race, the mercy, the clock, the sheet's name, the horn — fills in
    where this phone's row has nothing, or a race the other phone finished
    never ends here. And a sheet both phones hold is against the team this
    phone says (`alignSheet`): moved with Played against here, the other
    phone's rows on it came back under the team picked by mistake and their
    breaks in that team's book, so they follow the match row now. The
    message says what is **new on this phone** (`COPY_COUNTED` before and
    after), not what was in the file — "Merged in a sheet — new here: 1
    breakout", or "nothing new" on a second sync.

## Data (localStorage is the working store; `@capacitor/preferences` mirrors it)

User, Team, Player, Event, Layout/Bunker, PathEdit, Match, TallyEntry, Breakout, ScoutEntry, ScoutTeamProfile, BunkerCall, ClassSession, ClassResponse, LeagueGroup, LeagueMember, LeagueBlast, Message, AssessmentEntry.

A **Match** is `{id, at, vs, layout}` and every row logged on a sideline carries
its id in `m`. A **result** is `{m, pt, won}` — one per point, and the score is
the count of them. Point numbers are per match and start at one. Lineups are keyed
`<matchId>|<point>` — never by point alone.

## Do not

- Let a coach size a bunker, colour one, or pass his placing off as measured.
  A field he builds keeps every house rule a measured one does: a bunker type
  is one inflatable and its footprint comes from `BUNKER_KINDS`, never a box he
  drags out; its paint is sampled or it is grey — with the event's map under
  the builder (`fieldMapLoad`, stored downscaled beside the season and read
  through `mapOf(f)`) each
  bunker takes the red or blue the map prints under its footprint
  (`mapPaint`), re-sampled whenever it moves or turns or the map is turned,
  and anything else, or no map, is neutral grey; there is never a colour
  picker. Its source line (`FIELD_SOURCE`, `FIELD_SOURCE_MAP` with a map) says
  on the Events list that he placed it by eye and nobody measured it. The map
  is a guide stretched to the field's edges, never a measurement: the app
  still never invents a coordinate — he does, and the field says so.
- Write the plant rule twice and let the copies drift. `plantRule` in the app
  and `tools/plants.js` are the same rule; the suite runs the app's copy over
  the measured fields and expects `BREAK_PLANTS`. Change one, change both.
- Rename a lowercase `gridlock` token, or write the brand name into one. The
  display word is Gridlock and it changes per build; `gridlock.coach.v2`,
  `gridlock.coach.copy`, `window.gridlockKeep` and the rest are where a coach's
  season lives, and are identical in every build or the other build cannot read
  it. `scripts/brand.js` counts them and refuses. Never `Grind X` or `Lockdown`
  in `web/` or `site/` either — the variants are generated, and the suite fails
  on a stray name.
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
  were pulled; `script` never was. `fixBreak()` guards the same doors now —
  and runs at the top of `render()` beside `fixScreen()`, because a key set
  live rather than loaded was repaired only at the next relaunch, and the
  header printed the raw key until then.
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
  Nor does the read line's Call button set one: a best answer that is a play
  he has turned off is still named, with a word that it is off, and never
  offered as the call — `pickPlays()` decides what can be called, everywhere.
- Let the app decide what a penalty is. It does not have the rulebook and must
  never behave as if it does: an official calls it, the coach records what it
  cost, exactly as he records who won the point. A penalty row is side + how
  many men off, stamped with the match and the point it was **served** on —
  which is the point that was actually played short, not the one the flag went
  up on. `startUp()` never returns below one: a side with nobody on the field
  is a typo, not a point. `addPen` refuses a penalty that would leave a side fewer men than are
  already charted or tallied out on that point — four placed and then a
  three-man penalty was a side that broke four from two — and says so.
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
  `matchLabel()` / `sideWord()` name the two teams rather than "us" and "them"
  (and the header's score chip says **watch** in the right pit's blue with the
  two teams in its label, because 2–1 in red beside the Staff chip reads as
  his score),
  because there is no "us" on that field — Tally's scoreboard reads "Blast Camp v
  Rejects" and "Blast Camp up / Rejects up", never "You up". Tally says so on screen and sends him
  to Scout, which is where two other teams are actually charted — and so do
  Lineups, Movement and Assess (`watchedNote()`), which are about his five on
  this point, while Log it is not offered on any screen and `logCall()`
  refuses, because a call on a watched sheet is not a call he made. The sheet
  read "Match over — you won" and "Match point against you" on a game he was
  watching: `overWord()` names the sides on a watched sheet and
  `matchPointWord()` is the one door for match point, read by the sheet and
  the quick log alike, and the ends chip says which team is breaking from
  which end. On Scout the pits are *the home side* and *the away side*, the
  break toggle names the two teams instead of Theirs / Yours, and Breakouts
  carries a switch for whose five is being charted (`S.scoutSide`, scratch),
  because both teams on a watched field are teams he is scouting; Layers
  names the home and away outs; Playbook's call card says he is watching
  the two teams rather than "vs" the right pit. The match strip's label shares the game
  picker's flex basis, so two team names and a date take a line of their own
  above the buttons instead of a five-line column beside them.
- Fetch a schedule, or let the app imply it could. There is not one `fetch` in
  it and that is the whole reason it works in Garland. `SCHEDULE` is read off
  the league the way the pro board is — a screenshot from the coach — and it
  carries `read` (where and when) and `covers` (what the read did *not* reach;
  Sunday was off the bottom of the page). `parseSchedule()` reads a line the
  way a league page prints it: a weekday ahead of the clock is not a team, a
  field column after the teams — "Field 2", "(F3)", "Pit 1" — is not part of
  one, and "vs." leaves no stray period; the suite pastes all three. A league row is never edited in
  place: one he does not want goes in `S.gamesOff`, and `S.games` holds only
  what he added, so a re-read replaces the seeded list wholesale. And a row
  says what he already has on that game — "watched · 1–0", "you played
  Houston Heat · 4–3 · you won" — because a schedule half worked through
  should not make him open every row to find out which.
- Assume there are twelve calls. A coach runs plays the app has never heard
  of, and a break here is only five bunker ids per field — the paths, the
  buzzer order and the job labels all fall out of those five against the
  measured layout. So `S.plays` holds his own, keyed `my:<n>` so it can never
  collide with a built-in, and `allPlays()` / `playKeys()` are what every
  picker and every lookup reads. Never `Object.entries(BREAKS)` on a screen.
  Plants are per field and are never guessed: a play written at one event says
  so at the next and offers to be built there — and the Rep drill never asks
  it there (`repKeys()`), because a call with nothing to draw is not a drill. Team renames the app's twelve
  only — a play already carries the name he gave it, and a second name on top
  of the first is a trap — but Team's Break calls **lists his own plays
  first**, name edited in place (`renamePlay`), with the fields each has a
  five on and one tap to open it on Playbook. The owner asked for the custom
  calls to show; a list of the twelve that mentioned his in a sentence under
  it read as if the app's plays were the real ones.
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
- Open the app off a class deep link. `?c=CODE` set `entered:true` so Classes
  could render, and `save()` kept it: anyone with a `gridlock://class/…` link
  had the whole app on a phone with no account, for good. `openJoin(code)` is
  the one door, for the URL and the native handler alike: a signed-in phone
  opens Classes with the code filled; any other phone gets the join sheet by
  itself, with Back to the welcome page, and a relaunch is the welcome page
  because `joinOnly` is scratch.
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
  the right end tallying, routing and drawing the right way round. That
  includes what is *printed*: his card named the left-end bunker on a
  right-end point while he ran to its twin, and a fixed shot target picked
  from the select on the turned field was stored as the bunker he saw and
  drawn at its twin. `shownBunker(id)` maps a frame id to the bunker on the
  end shown now and back (a mirror is its own inverse); the card, the Shot
  button and the select read it, and `ownShot()` takes a pick back into the
  frame. A lane's name ("up-field, snake side") is the field's and never
  turns — but an *arrow* does: the eight on the Face pad, the Face and Shot
  buttons, the lane options and Tally's "Shooting which way?" read
  `seenGlyph()` / `seenSay()`, the angle as it reads on the end shown now,
  or the arrow he taps points the opposite way to the chevron it draws. The
  value kept is still the field's own lane — and `seenDeg()` stays in the
  pad's own range, -135 to 180: it returned 315 for a mirrored -135, three
  of the eight arrows had no glyph from the right end, and the Shot picker
  printed "undefined back toward the dorito tape". A fuzzer found it, not
  the suite. And a rotation of his own is kept
  as the bunkers he tapped on that point, so **Your rotations** on Layers drew
  the same job from two ends as two mirrored arrows: the arrows read
  `shownBunker(frameId(from, m, pt))`, the frame every other count of his is
  in. Movement's own list stays as tapped, because it names the bunker with
  the point it was seen on. And a frame id is never *printed* raw: *Where the
  points come from* named its rows with the frame id while the ring sat on
  the twin, so the row and the ring were two bunkers; rows read
  `shownBunker(r.id)` like `manLine()` does.
- Persist what the coach was in the middle of. `playing` was reset on load and
  nothing else was, so eleven scratch keys rode a relaunch — and two of them
  wrote bad data rather than merely looking odd: a Right read ticked on Saturday
  and never used was recorded against whatever point was ended next, and a
  half-filled breakout sheet came back open on yesterday's bunker, one tap from
  being logged under today's point number. A launch is a fresh start on every
  screen; only what was logged survives it. The block that clears `paste` clears
  all of them now, and the suite reloads the page to check it. Three more
  were found riding it later: `copyText` — the season shown as text, which is
  the whole season again saved inside the season — the Sightlines tap mode and
  Playbook's Cards / Rep view. Anything new that is a place he is standing or
  a thing half done goes in that block, and the relaunch check names it.
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
  And the rotation is made on what was charted: under the chips, one line a
  man from `manLine("us", name, matchVs())` — breaks charted, made it, shot
  on the break and from where, the bunker he breaks to most — bench men
  marked, a man with nothing charted given no line. A count, never a grade;
  the grade is the coach's, on Assess.
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
- Stand two grades for one man on one point. Save on Assess appended, so a
  changed mind left a 3 and a 5 side by side in the list and the chip read
  whichever was newest. One man has one grade a point: `saveAssess` replaces
  it, the way one point has one call.
- Chart a man twice on one point. The break chart appended, so a coach who
  corrected himself — shot on the break, no, he made it — had two rows for
  one man and a read that counted two breaks on one point. A named man
  charted again on the same point replaces his earlier row, and if that row
  had him shot and this one does not, the out it wrote goes with it; a row
  with no name is one of five he is working through and stays. The flash
  says it replaced. Telling a *placed* man is different: his bunker came from
  the placing tap, so a name already on another bunker this point is the
  wrong name picked, and replacing took the other placed man off the field
  without a word — `logBreakout` refuses it and says which bunker the name is
  on, and the Who chips print that bunker beside a taken name. And step two's
  "one more man" is held to `startUp()` the way placing is: a side never has
  more men charted on a point than it started it with.
- Count their call twice because a thumb tapped twice. `logCall()` kept one
  call a point for yours; theirs appended, so Blitz tapped twice read "Blitz
  2 of 2" for a point they played once, and the five logged first and the
  call named after it were two rows. `logTheirBreak` keeps one break a
  point: a later row takes the earlier one's five or call when it has none
  of its own, and a changed mind replaces. A season row — no point on it —
  is never merged.
- Make a mis-tapped out a trip to the log. Tap a man and he is out; tap him
  again and he is back in — `markOut()` toggles on the live point. The log's
  Undo is still there for a point that has been left.
- Let a half-picked five ride into the next point. Their bunkers tapped on
  Scout and not yet logged are scratch for *this* point; `endPoint()` and
  `nextPoint()` clear `theirPick` with the rest of the sheet, or they would be
  logged under the next point number.
- Leave the horn on a score that was taken back. Time's up at 4–3 ended the
  match; Back a point took the fourth point and left `timeUp` set, so the sheet
  read level with the clock run out and the result buttons up beside Undo
  time's up. `backPoint()` clears `timeUp` and `tie` with the point; overtime
  stays, because the clock did run out level and that point is still to play.
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
  note, and a note half-typed when he taps survives the re-render. And the
  bunker he picks says what the book already knows about it — lanes clear
  from there off the measured layout, how often their five have planted on
  it, men lost at it — with one tap to Sightlines standing in it, so the walk
  is checked against the log and not only against the eye. `bunkerBook(id)`
  is the one line both read; Sightlines prints it under its counts for the
  bunker he is standing in, and its lane table leads with their five —
  tagged, their shooter by name — with a count of how many are clear from
  where he stands, because fifty-seven rows in digitiser order is not an
  answer to "can I see them from here".
- Tap Add with the box empty and have nothing happen. Seven Add and Keep
  buttons returned in silence on an empty box — team, pit man, group, player,
  code word, squad note, walk note — and a coach whose thumb missed the box
  read a screen that had not moved. Every one says what is missing in one
  sentence (`flash`), the way Assess's Save already did. A greyed-out button
  is the same silence: How did they get there's Record buttons were disabled
  until a bunker was tapped, so the handler's own sentence never showed.
  Leave the button live and let the handler speak.
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
- Size a folded pit line off the viewport. "RIGHT PIT · WHO YOU PLAY" and the
  name shared one row by a phone media query, so an iPad in portrait and two
  pits sharing a wide column both cut the name to "Housto…". `.pitline` is its
  own container now: under 520 px of its own width the label takes a row,
  under 360 the read drops under the name, and the name has no basis of its
  own so it ellipsizes before anything wraps. The probe reads the name's
  scroll width on five tablet sizes and three phones.
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
  rule — and walks every Scout sub-tab, More section and open sheet (the
  breakout sheet, the penalty box, Cards) on all twenty devices, not only the
  five tabs: the penalty's 1–4 sat at 41 px on every iPad until it did. On
  a tablet it also fails a label broken to a word a line: "Direct the five"
  put six controls inline on a 520 px *screen*, and the rail leaves an iPad
  mini a 528 px column, so "SB · snake wire" sat in 30 px. The controls go
  inline on the column now (`@container main (min-width:600px)`), the same
  rule as every other two-up layout, and so do Counter's rank rows (the pips
  and the record take a second line under 460 px of column) and their man's
  wire and threat on the pit card (each its own row when the two do not fit).
- Go two columns off the viewport width. With the rail up, a 744 px iPad has a
  528 px column, and the pits and the Tally sheet both went side by side at a
  720 px *viewport*, squeezing each pit to 250 px: the stars ran off the card
  and a wire picker measured 38 px. `.main` is a container now and those
  layouts read `@container main`: pits two-up from 700 px of column, the sheet
  beside the field from 760 px, because a field at 240 px is a dot a bunker.
- Put two team names in a segment that scrolls. `.seg` scrolls sideways by
  design, which is right for twelve calls and wrong for three options: on a
  watched game the break toggle and the whose-five switch carry two long team
  names and Both, and the third option sat past the edge of a phone. `.seg--wrap`
  wraps and ellipsizes instead; the devices suite opens a watched game with two
  long names on every device and measures the options.
- Put the section name last on a line that ellipsizes. The header crumb read
  "event · call · section" and on a phone the ellipsis ate the section, so
  More › Lineups was headed "… · SNAKE …". The section is its own span that
  never shrinks (`.ctx__sec`); the event and the call are what give way. The
  call stays on the line everywhere, because what we are calling is read from
  any tab — and it has its own span (`.ctx__call`): with event and call in
  one span ellipsized at its end, a 28-letter play left "NXL LONE STAR OPEN ·
  GARLAN…" and no call at all on a 320 px phone. The event gives way first,
  down to a stub ("NXL…"), because the call is read between points and the
  event changes twice a season.
- Put one CHANGE ▾ on the header line. It sat at the end, beside the call,
  and moved the whole app to the next event on a single tap, so a coach
  reaching to change the call landed on another field with nothing said. The
  line is two doors now, each with its own ▾: the event (`.ctx__ev`) opens a
  list of the fields (`S.evPick`, scratch) and moves nothing until one is
  picked; the call (`.ctx__call`, `openCallPick()`) opens Change the call on
  the point sheet when Tally is showing it, else on Playbook under the field
  (`[data-callpick]`). The call reads in white and the event quieter, because
  the call changes every point and the event twice a season.
- Pick a call for him. A new phone opened on Snake Stack, printed in white in
  the header and big on The Call card as if he had called it — a name the
  owner read as not even a real call. `S.script` is always a real key, because
  everything that draws reads one, but `S.callPicked` (false on a new phone)
  says whether it is his: until it is, `callSet()` is false and the header, the
  card, the point sheet and the quick log say **Pick the call** with the list
  open, the field draws no five, Play the break, Face/Shot and Direct the five
  wait, `logCall` refuses, the lanes and cards say to pick one, and a row
  charted meanwhile carries no call (`myCall()` is ""). Any `set()` with a
  `script` in it is his pick; the app's own moves — `fixBreak`, a play turned
  off, the drill — write `S.script` directly and pick nothing. A save or a
  copy from before the flag keeps its call when he had made one
  (`adoptCallPicked`: a call logged, a play of his own, or anything but the
  default). And a blank sheet goes with him to another event (`pickEvent`):
  one with nothing on it has no field to belong to yet.
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
- Let a sheet follow the coach to another field. A match carries the layout
  it was started on, and changing the event with a match on left the same
  sheet open at point 4 on the new field, so an out tapped there was stamped
  on Tampa inside a Lone Star match. `sheetField()` names the field the open
  sheet is on when it is not the one on screen; `sheetOver()` refuses through
  it, the point sheet says so and offers Back to that field or New match here,
  and the result buttons stand down the way they do on a finished race; the
  quick log and the Scout strip read the same door, and so do rotations,
  grades, lineups, timeouts, penalties, Time's up and the ends — Lineups,
  Movement and Assess say so (`offFieldNote()`). Opening a sheet from
  Matches brings its field with it (`openMatchNow`).
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
- Count a break from the far end on the bunker he actually stood in. A charted
  break keeps that bunker, rightly, but a job is the same job from either end
  — the third can up the snake wire is Br#5 from the left and Br#6 from the
  right — and a five that swapped ends every point read "+2 on Br#5, −2 on
  Br#6, rethink this break" for one break. `ownBunker(id, side, m, pt)` is
  the side's own-end frame (the left-end frame for his five, where plants
  live); *Where the points come from* and `manRead()` count in it, the table
  says so once ends have moved on this field, and `shownBunker()` maps a row
  back to the bunker under his thumb on the end he breaks from now, so the
  rings travel with the end. Their side turns with his — one point, one
  frame — so `frameId(id, m, pt)` serves both: their fives tapped in from
  either end are one five (`plantCounts`, `likelyPlants`, the ghost, Where
  they plant, `usualMan`, their rotations and their lanes all count in it and
  draw or name through `shownBunker()`), and a five logged on *this* point
  stays physical because it is already on the end they break from now. An
  out is counted the same way — How they get you, the bunker book's men lost
  and a man's shot-from bunker all read `frameId(shotAt, m, pt)`.
  Bunker stats stays physical: it is a heat map of where on the field things
  happened.
- Let Switch ends rewrite the points already played. It flipped point one's
  end, so a switch made at the half turned every earlier point round — their
  outs tallied back to front and their routes drawn from the wrong goal line,
  silently. A switch made after anything was played is kept at its point
  (`flips` on the match, `flippedAt(pt, m)`), the chip says *switched at
  point 4*, and tapping again on that point takes it back; only on point one,
  or before anything is played, does it correct the end the sheet started
  from. The copy schema knows the one list a match row carries.
- Switch ends on the point number. Teams switch after a point somebody won;
  a no-point moves nobody, and overtime starts on the pit side. `ourEnd()`
  reads the results through `scoredBefore()`, so "Next point, no result" keeps
  the end and `endSwapped()` is the one place that decides.
- Print a read without the sample on it. "Blitz when behind" means nothing
  without "3 of 4", and a bucket of two is a coincidence: `theirReads()` hides
  anything under three logged and every line carries its count. The Counter's
  "won x of y" is your record against that team on this field, never a model's
  estimate, and the heuristic word only ranks the calls you have never run.
- Match a team's name by its exact spelling. "houston heat" typed on the
  Tally gate made a second team beside Houston Heat, and Division's Missing a
  team took "HOUSTON HEAT" as a third — and everything keyed on the name, the
  scouting, the calls logged against them, the record, split between them.
  `anyTeam()` folds case and spacing (`foldName`), `playNamed()` puts the team
  already on the list in the pit under its own spelling, and `addTeam()` says
  which name it is already there under.
- Read a heading as a man. The roster paste took "Houston Heat Roster" and
  "Coach Bob Smith" as players because each is capitalised words. A line with
  no number that carries a role or heading word (`ROSTER_ROLE`) or starts
  with a team's name (`teamPrefix`) is skipped and listed as skipped, so the
  coach sees it was read and left out rather than finding a coach on the five.
  A jersey number is one to three digits standing alone — "Roster 2026" is not
  #026 — a number in brackets after the name is his, "D-side" and "S side" are
  wires, and one man pasted three ways is one row that takes the number or
  wire whichever line had it.
- Let two men share a name. A name is the key an out, a lineup slot and a
  grade are written against, so the second Reyes made both rows go out when
  either did. `squadHas()` folds case and spacing; Team refuses the duplicate
  on add and on rename and says so, and a name is capped at 32 characters so
  it fits a card.
- Pass a name into markup raw. `sec(eyebrow, body, note)` took its note as
  HTML and twelve callers handed it `matchLabel()` straight, so a team called
  `<b>x</b>` printed bold on the point sheet and in Matches. The note is text
  and `sec()` escapes it once; a caller never escapes it first or the name
  reads `&amp;`. Anything typed by a coach — a team, a man, a play, a bunker
  word — goes through `esc()` exactly once, at the door it is printed through.
- Let two calls share a name. A play saved as "Snake Stack", a play renamed
  onto another, or a built-in renamed onto his play is one button twice in
  every picker and one word shouted for two breaks. `callTaken(name, except)`
  folds case and spacing like `squadHas()`; `savePlay`, `renamePlay` and
  `setBreakCall` all refuse through it and say so on screen, and the builder's
  Save button reads "Already a call" before the tap. A merge is the other
  way in: an assistant who built "Rocket" on his own phone has it under its
  own key, and the copy added it beside this phone's. `loadCopy` folds a play
  whose name this phone's play already has into that one (`rekeyPlay`: the
  calls, their breaks and answers, Face/Shot/Go, paths, job words, off), its
  fives filling only fields this phone has none on; one named like a
  built-in call here takes a number. The message says which. The team's
  words merge the same way: a map takes the copy's word, so this phone's
  "Rocket" for Snake and the copy's "Rocket" for Blitz were one shout for two
  breaks. `keepWordsUnique()` puts back this phone's word (or none) wherever
  a word the copy brought for a call, a job slot or a bunker now says what
  another already says.
- Sign the same name onto a clinic sheet twice. A phone handed round a
  clinic gets the same kid twice — "Sam", "sam " — and the sheet counted two.
  `submitForm()` folds the name per class code like `squadHas()`: a second
  sign-in updates what he filled in, a box left blank keeps the first, and
  the thank-you says it was an update. The card shows what he filled in —
  level, wire, contact, notes — and every row has Remove (`dropResponse`),
  because a kid who signed the wrong clinic or a name that is not a kid at
  all has to be able to come off the sheet. And a class started twice was a
  card for good — Close sign-ins hid nothing — so Delete (`delClass`) takes
  the class and its sign-ins, asking first only when anyone has signed.
- Write their #7 down twice. Their men are read by number — "#7" is the key
  every sighting, shot and breakout of theirs is counted under — so a second
  #7 in the pit split one man's read in two. `pitDup()` finds the man an
  entry means (the number when one was typed, else the folded name — "Dill"
  typed again with no number is #7 Dill, as the roster paste already read it);
  `addScoutPlayer` fills the first entry in from the second and says so, and
  `editScoutPlayer` refuses to move a number onto another man's.
- Hand out a number in silence. Two men on your own squad can wear one
  number — a borrowed jersey — because the name is the key here, not the
  number; but his card and the other man's both read "#7", so `addPlayer`
  and `editPlayer` take it and say so (`numWorn`). A blank number takes the
  first one nobody has (`freeNum`), not the roster's length, which collided
  the moment anyone had been taken off the list.
- Rename a man and leave his season behind. A name is the key an out, a
  breakout, a grade, a rotation, a penalty, a lineup slot and a bunker word
  are written against, so a rename on Team orphaned all of it under a name no
  longer on the squad and his read went blank. `renamePlayer(from, to)` is
  the one door `editPlayer` goes through; it re-keys his own side's rows
  only, because their men are keyed by number and a name there is somebody
  else's. Taking a man off the squad is different and stays so: what he did
  is history and keeps his name; only his lineup slots empty. Their man has
  the same problem the other way round: he is keyed "number:7" when he has
  a number and by his name when he does not, and "#7 Dill" on the breakout
  sheet, so giving him his number on the pit card orphaned everything seen
  of him under his name. The arrival screen already re-keyed its own rows;
  `rekeyTheirMan(team, before, after)` is that code made the one door the
  pit card, the pit's add row and the arrival screen all go through, and
  `theirTag()` is the one spelling of his breakout-sheet label. A rename is
  also remembered (`renamedMen`), because a
  sheet sent from the assistant's phone still carries the old name in its
  roster and its rows: merged, that was a second man on the squad and his
  rows under a name nobody wears. `loadCopy` lands them on him through
  `renamePlayer`; a man added later under the old name is a new man and
  clears it (`forgetRename`). Both copies carry the map so the assistant's
  phone lands his rows the same way, but a copy's rename is adopted only
  where this phone had the old name and not the new one before the merge —
  never onto a man this phone has under both.
- Leave a typo'd team as a team. "Houston Heet" typed at the Tally gate
  between points made a team, and a sheet, outs, calls, their breaks and
  their men were all keyed on the spelling with no way back but deleting
  the team and losing the point. `renameTeam(from, to)` on the Division
  board's "you added" rows re-keys every store that carries a team's name —
  matches (vs, home, away), outs, breakouts, calls, sightings, shots, voice
  events, his added games, both pits — and a name that folds onto a team
  already on the list merges into it under its own spelling, the scout book
  included (breaks and men add up; a word set on both keeps the one already
  there). Only teams he added can be renamed; the league's are the league's.
  The rename is remembered (`renamedTeams`, `noteTeamRename`) and rides in
  both copies, so a copy from a phone that still has "Houston Heet" lands on
  Houston Heat instead of bringing the typo back as a second team; a team
  added later under the old name clears it (`forgetTeamRename`), and a
  league team's name is never taken for a rename (`leagueTeam`).
- Make Return do nothing in a box with a button beside it. The phone
  keyboard's blue key is how a one-line box is submitted, and only the Tally
  gate's honoured it: a coach typed the team's name on the board, hit it, and
  read the box still full. `onEnter(call)` is the one attribute every such
  box carries — the sign-in panel's email and password, the team, the pit's
  add row, the group, the roster add row, the code word, the message, the
  play's name — and the suite presses it in each. A textarea is multi-line
  and keeps its Return.
- Make a league group's typo a Delete. Groups had a name and a Delete, so
  "Refss" was delete the list and type its members again. The name is a box
  (`renameGroup`), empty keeps the old one, and `groupHas()` folds case and
  spacing so two groups cannot share a name on add or rename — one blast
  sent twice was the other half of that. The same member added twice is
  one member with the number updated, and `reachable()` sends to one
  phone once however many rows carry it: two kids who share a parent's
  number are one message to that parent.
- Leave a sheet against the wrong team. The wrong team picked at the gate
  and three points tallied before anyone noticed had no way back but a new
  sheet and a tally from memory. **Played against** on Matches › This match
  (`setMatchVs`) moves the whole sheet — every row carrying its match id:
  outs, breakouts, calls, sightings, shots, voice events, and their breaks
  out of the wrong team's scout book into the right one — and puts that
  team in the right pit. The picker is the board, with a box beside it for a
  team the board does not have: typed, it joins the division the way the
  Tally gate adds one, and a spelling of a team already there is that team
  (`anyTeam`). A watched game has no "vs" and gets no picker.
- Take a team's name off a schedule row as it was pasted. "dynasty vs impact"
  pasted off a page started a sheet against "dynasty" — a second team split
  from Dynasty on the board, with none of the scouting, the calls or the
  record, and never listed under Division. `boardTeam(name)` is the one door
  a typed or pasted name goes through: a spelling of a team already there is
  that team under its own spelling, and one the board has never heard of
  joins the division. The Tally gate, Played against, We play and Watch this
  game all read it, and the schedule row pairs sheets to games by `foldName`
  so a game played under either spelling still says what he has on it.
- Reopen a sheet and leave the pit on somebody else. Opening a kept sheet
  from Matches brought its field and its point and not its opponent, so the
  point sheet read "This sheet is Rejects; the right pit is Dynasty" and
  asked him to put his own opponent back. Opening a sheet is picking the
  team: `openMatchNow` puts its opponent in the right pit, and a watched
  game's home side left and away side right.
- Take a team off the board in silence. Remove on a team he added dropped
  it from every picker with one tap and no word, and a team with two sheets
  and their calls logged behind it read as a season lost — it was not, the
  profile and the sheets outlive the picker, but nothing said so.
  `teamHas(name)` counts the sheets, the breaks and the men logged against
  them; the row says it, Remove asks first when there is any, and the flash
  says what stays and how to get the team back (type the name again).
- Leave a door off the list. `sheetOver()` and `needOpponent()` guard
  `tallyTap`, `logBreakout`, `markOut`, `logCall` and `logTheirBreak`, and the
  penalty and the timeout were written later and guarded only the off-field
  case: a penalty went on the unnamed sheet with nobody across the tape and
  on a finished race, and a second timeout for the same side returned in
  silence. Both go through the same two doors now, and the timeout says
  which point the first one went on. A new row type takes the same doors
  the day it is written.
- Grade a point nobody played. A grade is written after the point, and after
  the last point of a race the sheet is over and the cursor sits on the point
  after it — so the grades for the final point, the ones a coach writes
  walking off, were stamped on point N+1 of a match that ended at N, and so
  was a rotation. `sheetPoint()` is the door: the point he is on, or on a
  finished sheet the last one played, and Assess and Movement say so above the
  form. With nobody across the tape there is no point at all: both screens
  show the gate (`noOpponentNote`) with one tap to Tally, and `saveAssess` /
  `logMove` send him there rather than writing the row on the unnamed sheet.
- Count the five as a log. A lineup is who is standing, not a thing that
  happened, and `matchSize()` counted it: a coach who rotated a man on before
  naming the other team had an unnamed sheet with "1 entry", kept in Matches
  as No opponent for good and asked about every time he started the real one.
  `loggedSize()` is what was logged; `sheetEmpty()`, `openSheet()`, New match
  and the schedule's gate read it, and the five written on a blank sheet
  moves across as point 1's lineup on the sheet that replaces it.
- Take a man off in silence. Remove on the roster and on the pit card dropped
  him with one tap and no word, and a man with twelve outs and a season of
  grades behind him read as lost — he was not, every row keeps his name, but
  nothing said so. `manHas(name)` and `theirManHas(p)` count what he has on
  the sheets; Remove asks first when there is any and says afterwards what
  stays, the same contract as Remove on a team.
- Throw a season away on one tap. **Replace everything** under Nexus › Load a
  copy was a red button with a sentence above it and no question, on the one
  screen a coach visits when a phone is new or in trouble — and a tap on the
  wrong button replaced three months with an empty copy. When the phone holds
  a season (`seasonHere()`: a sheet with anything logged or scored, a roster,
  a team scouted, a play of his own) Replace asks first and names what it
  would throw away, in the same words Save a copy uses to say what it kept.
  Merge never asks: it only adds. And the horn: `timeUp()` opens the gate
  with nobody across the tape, like every other row.
- Delete on one tap what took an afternoon. A play of his own is five taps a
  field and the calls logged under it are his record; Delete took it with no
  word and left every logged call printing `my:k7f2` where its name had been.
  `dropPlay` asks when the play has a five anywhere or a call logged, and
  `S.playGone` keeps the name so `callName()` still prints it. The same
  question stands in front of **Put the app's names back** (all twelve of
  the team's words at once) and **Delete** on a league group with members;
  a play, a list or a group with nothing behind it still goes with one tap.
  And a play built again under a deleted play's name takes the old key back
  (`savePlay` reads `S.playGone`), so the calls logged under it are its
  record again rather than a second "Rocket" beside the first on self-scout.
  Renaming a play onto that name does the same (`renamePlay` re-keys the
  calls and the job words), and naming one of the twelve with it is refused
  and says why — a built-in's five are not the deleted play's. The read line
  says which of the two it is when it will not offer a call (`offWord`):
  "turned off" sent him looking for a switch a deleted play does not have.
- Hand text over through `prompt()`. Cards, a matchup card, a class link and
  a league blast all fell back to a system dialog when there was no share
  sheet — the browser build on a laptop, or an insecure address — with the
  whole card squeezed into a one-line box, and a dialog is against the house
  rule anyway. `handOff(title, text)` is the one door: the share sheet where
  the phone has one, else a box at the top of the screen with the text, Copy
  and Close. `S.handText` is scratch and the relaunch check names it, and
  the box leaves when he changes tab or section — it is the text he asked
  for on the screen he asked for it on, not a banner that follows him.
- Print `"#"+p.num` and trust the number to be there. A roster row from an
  older copy or a paste can have no number, and "#undefined Reyes" read on
  Playbook, Sightlines, the cards, Lineups and the quick log. `manTag(p)` is
  the one door for his man the way `pitManTag` is for theirs — the hash only
  when there is a number — and the suite walks every tab, sub-tab and section
  with a numberless man on the point looking for undefined, NaN or an object.
- Name a box with its placeholder. The Messages note, a new league group, a
  new member's name and phone and the typed team on Played against had a
  placeholder and nothing else, which a screen reader drops the moment he
  types. Every one carries an `aria-label` now, and the sweep that used to
  read five screens reads every tab, sub-tab and section.
- Put one word on two bunkers, or one job on two men. A bunker's word is
  how it is shouted, and "Snake 1" on two bunkers of one field is one word
  for two places — the trap `callTaken` closes for the twelve calls, left
  open on Team's bunker calls and the Job chip. `bunkerWordTaken()` and
  `jobWordTaken()` fold case and spacing like the rest and say which bunker
  or slot already answers to the word; a man's own word for a bunker is his
  alone, but one man cannot use one word for two bunkers on a field either
  (`setPlayerCall` says which bunker already carries it).
- Log a rotation to nowhere. On the breakout sheet Moved to is where he went
  next and Shot from is where the paint came from; either one tapped onto the
  bunker he broke to is a mis-tap, and logged it was a visit counted twice on
  Bunker stats or a man shot from his own bunker. `logBreakout` refuses both
  and says which box it is, the way Movement refuses two taps on one bunker.
- Keep the same Walk note twice. Add tapped twice put the same sentence on
  the same bunker twice; a note that folds onto one already on that spot is
  refused and said, and a note is capped at 240 characters so a card can
  carry it.
- Take "-5" as a jersey number. `parseInt` did, and so did "1234", and the
  card read "#-5" until it was handed over. `jerseyNum()` is the one door: a
  whole number from 0 to 999, else refused and said, on the add row and in
  place — a blank still takes the first free number.
- Redraw the screen to take a message down. `flash()` cleared itself with a
  full `render()` four seconds on, and a coach who tapped Add with the box
  empty, read the message and started typing had his words wiped, because
  nothing is committed until `onchange`. The timeout takes the one element
  off the page and leaves everything else where his thumb left it.
- Redraw on every tick of a slider. The replay slider under Scout › Games
  called `set()` on `input`, so the slider was rebuilt under the finger
  dragging it and the drag ended after one step. The count follows the thumb
  live through the DOM alone; the list redraws on `change`, when he lets go.
  Anything a finger holds — a slider, a drag handle — never renders mid-touch.
  Nor does a box commit with a redraw when the next tap is the button beside
  it: `onchange` fires on blur, blur happens as the thumb lands on Read it,
  and a redraw there rebuilds the button under the tap. The schedule paste
  box saves without rendering, like the Team rows and the blast body, and so
  do the play builder's name and read boxes, whose next tap is Save, a
  class's notes and start time (Share and Close sign-ins sit under them) and
  the sheet's name on Matches (New match and Played against do).
- Keep the same game twice. One day, one clock, the same two teams is one
  game: typed again on the schedule it is refused and said (`sameGame`,
  `gameOnList`), and a page pasted twice, or one that overlaps the last,
  adds only the rows the list does not have and says how many it already
  had — the league's own rows included.
- Hand two classes one code. A class code is what a kid types to find the
  sheet; four random characters collide rarely, and when they did the second
  class could never be signed in to. `freeClassCode()` draws until the code
  is one no class has, and falls back to a counted one.
- Clear the point on a result and not on Next point. `endPoint()` took the
  ticked read, their picked five and the selected bunker with the point;
  **Next point, no result** moved the cursor and left them, so a Right read
  ticked on a point nobody won was recorded against the next point's result,
  and a half-filled breakout sheet reopened on the wrong point.
  `clearPointScratch()` is the one list both doors run — the read, the draft,
  their pick, the selected bunker, the armed picker and the open penalty box.
  Back a point runs it too, and stops the clock between points: the scratch
  would have landed on the point he was going back to, and the clock was
  counting down to a buzzer for a point that was no longer next. So do a
  new sheet (`openSheet`) and a reopened one (`openMatchNow`): a read ticked
  on one sheet must not land on another's point.
- Remember a league row by its place in the list. The rows he took off the
  schedule were kept by index (`sch3`), so a re-read that added a game above
  them hid the wrong games. A seeded row's id is the game itself — day,
  clock and both teams folded — and survives any order the league's list
  comes back in. And a row taken off by mistake has a way back: the page
  says how many league rows are off and **Put them back** forgets the list.
- Refuse in silence. The last call standing cannot be turned off, and the
  tap used to do nothing at all; `toggleRun` says so now. Every refusal in
  the app says what it refused and why — a tap that does nothing reads as a
  broken button.
- Add a list to the season without a key in `SAME`. `mergeInto()` adds rows
  by that key and, for a list it has no key for, takes the incoming list
  whole — so Merge it in from an assistant's squad copy replaced his plays
  with theirs, and a full copy replaced his penalties, timeouts and the
  games he added. Every list a copy carries has a key now; a new list gets
  one the day it is written, and the merge check carries one of each. And
  the pits, the calls he has turned off, the league rows he took off and the
  groups picked for a blast are his place in the day, not records: `HERE`
  keeps them as his on a merge, the way it keeps the sheet and the point.
- Clear the scratch at launch and not on a restore. The durable copy is the
  whole of `S`, half-done keys included, and `gridlockRestore` brought them
  all back onto a phone that had lost its storage — the read ticked before
  the phone wiped came back ticked. The launch block is one function,
  `clearScratch()`, and the restore runs it too.
- Count a phone number by its spelling. A blast reached one phone once only
  when two rows typed it the same way; "555-0100", "(555) 0100" and "+1 555
  0100" were three texts to one parent. `contactKey()` is the one door: a
  number is its digits with a leading country 1 dropped, an email its
  lower-case self.
- Lose the read on a correction. The read is ticked before the result and
  cleared with the point, so We won it, Back a point, They won it — the
  ordinary way a mis-tap is fixed — recorded the corrected point with no
  read at all. Back a point puts the taken result's read back as ticked, and
  `endPoint()` carries an earlier result's read when none is ticked; the
  winner is what changed, not the read.
- Let the tally and the chart disagree about one man. A man charted shot
  on the break is the out the columns record, and tapping him back in took
  the out off and left the chart saying shot. `releaseOut()` is the one door
  — the tap back in on the live point and Undo on the log both go through
  it: back in means alive on the chart too, with where the paint came from
  cleared, and the sheet says so.
- Stamp a sighting against a team nobody named, or a sheet on another field.
  How did they get there filled an empty pit with "Unidentified opponent" and
  wrote the row against it — a team the coach never typed, which then sat in his
  team list for good — and stamped it with the open sheet whatever field that
  sheet was on. `arrivalRefusal()` is the one door both Record buttons read:
  nobody in the pit says so with one tap to Matchup, a sheet on another field
  says which and offers Back to it or New match here, and Add player refuses
  the same way rather than filing a man under the placeholder. The Voice log
  reads the same door, and its end picker carries the team only when one was
  named (`voiceTeamValue`). Record is never disabled.
- Keep a time the way it was typed. The typed-game form said "24-hour, like
  13:45" and stored whatever was in the box, so "9am" sorted after every real
  clock and printed as itself, and "25:99" was a game. `clockOf()` reads a
  clock the way a coach types it — 13:45, 1:45 PM, 9am, 0900 — to the HH:MM
  the schedule keeps, and Add it refuses anything that is not a time, and a
  team against itself, in a sentence.
- Stamp a sighting with a sheet about somebody else, or leave a rename
  behind in a picker. A sighting carries a sheet and a point, so reading
  Dynasty while the sheet is vs Rejects joined Dynasty's moves to Rejects'
  points: `teamOnSheet()` is the test and `arrivalRefusal()` says so with one
  tap to start a sheet against them; an empty sheet takes the team's name as
  the first row lands (`adoptTeamOnLog`), the way the right pit does. And
  `renameTeam` follows into `S.arrival.team` and `S.voice.team`, because a
  pick left under the old spelling split the season the rename had joined.
- Take typed content off at a tap. The whiteboard's Wipe took every mark on
  the field with no Undo behind it; Remove on a walk note, a squad note, a
  code word, a league member and a class sign-in, and Reset every path, all
  went the same way. Each asks first and names what goes — the note's spot,
  the word, the member, the man who signed — because none of it is kept
  anywhere else. Undo on a tally row or a penalty stays one tap: those are
  one tap to put back.
- Match a class code by its exact spelling. A kid reads "GL-7K2M" off a card
  and types "gl7k2m" or "GL 7K2M", and the sheet said there was no such
  session on this phone. `foldCode()` keeps the letters and digits and
  `classByCode()` is the one lookup; what he fills in is trimmed and capped
  like every other typed box, and Return in the name or contact box submits.
- Skip a pasted man because his number is already on the card. The add row
  has filled in what the first entry lacked since PR 113; the paste still
  dropped him, so a card with "#7" and nothing else never learned his name
  from the league's roster. `keepRoster` fills in a name for a number, a number
  for a name and a wire where there was none, re-keys his sightings through
  `rekeyTheirMan`, and the note counts added, filled in and already logged.
- Log a blast to nobody. A pick with no number or email in it logged a send
  with a count of zero and handed over an empty list; and a coach in two
  groups was on the list twice. `sendBlast` says who has no contact and
  refuses, counts one phone once across every group picked, and caps the
  update at 600 characters.
- Leave Next point live on a sheet that takes nothing. The point sheet and
  the Scout strip hid it on a finished race and on a sheet from another field;
  the quick log did not, and none of the three is the door. `nextPoint()`
  refuses through `needOpponent()` and `sheetOver()` the way `endPoint()`
  does, or a race to four walked on to point 7 with nothing said.
- Read a sheet as blank by his rows alone. `openSheet` replaced a sheet with
  only their five charted on it, so the break rows kept a match id with no
  sheet behind them, and New match closed a sheet he had only scored without
  asking. `sheetSize(m)` counts his rows, the results and their breaks, and
  `sheetEmpty()` is that reading zero; `gameGuard()` is the one question New
  match, Watch this game and We play all ask through it.
- Start the Rep drill into nothing. With every built-in turned off and his
  own plays built on another field, `repKeys()` is empty and Rep returned in
  silence. It says what is missing and the two ways to fix it.
- Add a code word that is already there. A code is a lookup for the player
  who joined last week, and "Rocket", "rocket" and " Rocket " were three rows.
  A word typed again updates what it means (`foldName` match) and says so; an
  empty meaning keeps the old one.
- Bury the read in Scout. Between points the coach is on the point sheet or
  the quick log, so that is where the read for the next point stands, under
  the call, with his best answer and one tap to call it. Scout is where he
  builds it; the sheet is where he uses it.
- Gate the logged five behind an overlay. The Their five overlay places the
  men he named; the five tapped in on Breakouts, and the ghost of where they
  plant most, are the break itself and show whenever their side of the field
  is shown (`theirFive`), not only when a layer is on.
- Read them and forget that they read you. A coach charts the other bench
  the way it charts him, so a read that says what they run when ahead and
  not what *he* has run when ahead is half a read. `myTell()` counts his own
  logged calls against this team in the same score state and the read line
  says it when one call is half of them. And a bucket beats the season only
  when it is the moment he is in: a timeout just spent, match point, the
  first point — `nextRead()` tries those first and only when they apply.
- Stamp a call of theirs with a sheet about somebody else. The right pit is
  who you play, but a coach reading Dynasty on Division while his sheet is vs
  Rejects has Dynasty in the pit and Rejects on the sheet, and a call logged
  against Dynasty with Rejects' point joined Dynasty's breaks to a score
  Rejects made. `pitOnSheet(side)` is the door: off the sheet, the row is a
  **season** row with no match and no point — counted in what they run, never
  joined to a score — and Breakouts, the read line and Tally all say so with
  one tap to start the right sheet or put the right team back. A sheet named
  on New match and never written on is provisional: the first call logged
  against the pit names it for them (`adoptPitOnLog`), while picking a team
  renames only an unnamed sheet. A sheet with anything on it keeps its name.
- Replay the outs and call it the point. Games stepped through tally rows and
  nothing else, so a point that was scored, called, charted and penalised read
  as "no outs". `pointStory()` reads every log back for the point — score
  before, what you called, what they ran and where they planted, who won it
  and whether the read was right, penalty, timeout, and every man charted on
  the break — and the point list is the union of every log, not the tally
  alone. Nothing is reconstructed; the replay stands only where there are outs.
  And a watched game lists there too: it is their film, both sides are named,
  so it sits under whichever of them is in the right pit, flagged watched,
  with the point read back as "Dynasty called" and "Won by Dynasty" rather
  than you and them, both pits' logged calls on it, and the score before the
  point named by team.
- Show a sheet a name it can never be given. The kept list printed `note`
  and nothing set it; Matches › This match has **Name this sheet** now
  (`setMatchNote`, forty characters), so Sunday's quarter is not "vs Dynasty ·
  Oct 3" three times over — and `matchLabel()` numbers a second sheet against
  the same team on the same day ("· game 2") on its own, because four
  one-point 5-man sheets read identically otherwise. `gameNth(m)` is the one
  door, and it reads the whole match row — the kept list, the Scout game chips
  and the schedule row's "you played" line all go through it, the chips with
  `matchById(g.id)` because the game list carries ids and dates, not rows. A
  check that reads the whole screen for "game 2" proves nothing on Scout:
  the match strip above the chips carries the same label, so read the chips.
- Log where their man was and never ask where he went. Every sighting on
  How did they get there is a place, and the next sighting of the same man
  on the same point is a move; the pairs were never counted. `theirMoves()`
  counts them across every match on this field — "MD → T 4 (#7 Dill 3)" —
  as **Their rotations** under the arrival field and **After the break** on
  Anticipate. A repeat sighting is not a move; one sighting is not a move.
  Layers draws them too — **Their rotations**, a blue arrow a move with the
  count on it, beside the green arrows of your own.
- Count how often you called a play and not what it won. Self-scout on
  Playbook ranked the calls by how often they were logged on this field and
  said nothing about the points; `callRecordHere(key)` joins the same rows
  with the results, so each call reads "40% of 10 logged here · won 3 of 4"
  and each recent call says won or lost. The record against one team stays
  on the Counter (`callRecord`); this is the field-wide one.
- Show the film word on the board when the count is in. Division said FILM
  for a team with notes and printed the tendency word you picked for it, and
  nothing about the calls you had logged against it. Film carries the count
  of their calls you have logged; once there are three, the call they ran
  most sits under the team's name with the count ("Blitz 3 of 4 logged"),
  where there is room to wrap — in the Tend column it pushed Threat off a
  phone. Tend stays the film word, and an unscored team still reads as a
  dash on Tend and Threat: a count of what they ran is not a score of how
  good they are. And the board itself was 433 px in a 356 px wrap on every
  phone — the `col-opt` fold from before left six columns that still did not
  fit, `.tbl` carried a 340 px minimum, and Threat sat behind the edge the
  house rule forbids. Under 620 px of column the rank goes (`col-rank`),
  the cells tighten, the team name may wrap (`td.team`) and the stars read
  as `4★` (`.th-num`). The devices suite now measures every `.tblwrap`
  against its table, because `.main` never overflowed and so never said.
- Give a button no room to wrap. `.btn` was `padding:0 16px`, so any label
  that broke onto two lines — Who's on in the half-width column of a phone,
  Time's up on a 320 px screen — sat pressed against the top and bottom
  border. The base rule carries 6 px above and below now, which leaves a
  one-line button at its 44 px and gives a wrapped one room. Who's on is two
  lines on purpose: the word, then the count on the bench.
- Put a 36 px button inside a sentence. The Call button on the read line, Put
  ‹team› in the pit and Lanes from here were all 36 px tall because they sat
  inline in a note, and the devices suite never saw them because they render
  only with data. Every `.read-line__go` is a 44 px target on its own line
  under the sentence, and the suite builds the data and measures all three.
- Write the bunker-name lookup again on every screen. Six functions each
  carried their own four-line "find the bunker, print its call, else its
  code"; `bunkerLabel(id)` beside `callOf()` is the one door, and a screen
  that needs the coach's own word for a man's card still passes `callOf(b,
  name)` itself.
- Draw a ghost nobody can name. The dashed five says where they plant; the
  legend under the field says which bunkers, how many logged fives, and the
  man usually sighted in each — a name only when sightings carry one, never
  the roster order.
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
  falls back to the list only on a field with no plants — the twin bunker
  when his five break from the right end, because plants are kept in the
  left-end frame and the bunker he walks over to is the one he actually
  stands in.
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
- Stand the result buttons down and stamp the rest past the end. On a
  finished sheet the field still opened a breakout sheet, a tapped man still
  went out, Log it still logged a call and Scout still logged their five, all
  under a point past the end — the cursor sits on N+1 once point N is won.
  Refusing them was the first fix and the wrong one: the last point's men are
  charted walking off, after We won it. `sheetPoint()` is the door — the point
  he is on, or on a finished sheet the last one played — and `tallyTap`,
  `placeAt`, `logBreakout`, `markOut`, `outRow`, `logCall`, `logTheirBreak`
  and `theirFiveLogged` all stamp through it, as Assess and Movement already
  did; `ourEnd()` defaults to it too, so the last point is charted from the
  end it was broken from. Who's on and Lineups (`swapOn`, `setSlot`) write
  through it as well: a five written for the point past the end is a row
  `lastPoint()` reads, and it walked `sheetPoint()` — and every chart door
  with it — past the end of the race. Only a sheet on another field refuses them
  (`sheetField()`); a result, Next point, a penalty and a timeout still
  refuse on a finished sheet, because there is no next point to put them on.
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
  on his own sheet it is "you" against their stars. And on a watched game
  Matchup's call panel does not say "Your call is Snake Stack, it puts your
  five here" with his roster under it: it names the two teams, lists the
  home side's logged men in the left column, and says his call and his five
  are not on that field.
- Trust the overflow check for the header. It clips rather than scrolls, so
  a chip pushed off the right edge never read as overflow: at 320 px with
  the clock and the score up, the Staff chip was gone. Below 360 px the
  brand's second line goes, the chips tighten and the Staff chip steps aside
  (Nexus says who is signed in); the devices suite now measures that every
  header chip's right edge is inside the screen. And measures it with the
  clock running: with the break clock up as well — four chips and a 5–6 to 7
  score — a 375 px phone ran the Staff chip 10 px past the edge while the
  suite, which never started the clock, stayed green. `hdr--clock` on the
  header takes the 360 step under 400 px.
- Draw the field under a 58-row bunker dropdown and let it only decorate.
  Team's bunker calls drew the whole field beneath the picker and the picker
  was the only way in. Wherever a field is on screen and a bunker is being
  chosen — Tally, Movement, Team — a tap on the field chooses it, the
  dropdown follows, and the chosen bunker is ringed.
- Tell a coach where to go in a sentence with nothing to tap. Playbook's
  call panel said "Put the other team in the right pit on Scout" as text;
  on first run that is the first thing he has to do. Anything that names a
  screen he should go to is a button that goes there.
- Work out on every draw what only changes when the data does. With a full
  season in (forty sheets, ten men charted a point) a tap on Tally took six
  to seven seconds on a phone-speed CPU: every redraw re-routed every man on
  the point, `segHitsBox` built an array of arrays per call inside a router
  that asks it millions of times, and the fifty-row value table read the
  whole season for the point once a row through `shownBunker()` →
  `ourEnd()` → `sheetPoint()` → `lastPoint()`. A run is now kept by what
  it depends on (`autoRoute` → `autoRouteFresh`, keyed on field, bunker,
  moved to, end and holds; dropped with the other route caches in
  `dropPathCache`), the router rejects a box by the leg's extent before the
  exact test, and `lastPoint()` / `sheetPoint()` are kept for the length of
  one draw only (`_lastPointMemo`, set and cleared around `shell()` in
  `render()`, because nothing is logged mid-draw). The tap is under a second
  at the same throttle. The suite counts the routes and the season reads a
  redraw makes, not the milliseconds, so a slow runner cannot make it lie.
  The same draw-long memo holds each sheet's results for `scoreBefore()` and
  the end each point was broken from for `frameId()`, which the read line and
  the value table ask once a charted row. And the Log's bunker boxes
  (`bunkerPick`) draw only the value they hold — two options instead of
  fifty-nine each — and `fillPick` fills them on the first pointer, touch,
  focus or key, before the phone opens its picker: three men out on a point
  was three hundred and fifty options styled and laid out on every tap. A
  median Tally tap on a full season is about half a second at six times
  slower than a laptop.
- Keep a sheet a coach cannot get rid of. A practice sheet or a game charted
  twice sat in the record, self-scout and every read for good, because there
  was no delete. `delSheet(id)` on This match and on each kept row takes the
  sheet and every row stamped with it (`dropSheetRows`: `SHEET_LISTS`, its
  lineups, their breaks on it), asking first whenever anything is on it, and
  deleting the sheet in play opens a fresh one through `openSheet`. The id goes
  in `sheetsGone` — on this phone only, never in a copy — so a season copy
  merged later leaves it out and says so; the one sheet sent on its own and
  merged on purpose comes back.
- Let Pod Wars reach the sideline. The owner asked for a secret game: seven
  taps on the name in the header, each within a second and a half of the
  last (`podTap`), opens it. It draws on its own layer outside `#root`
  (`#podwars`), so a render underneath never touches it and Close puts the
  coach back exactly where he was; it keeps nothing but `S.podBest`, which is
  not in either copy; it pauses the moment the app is hidden and its loop
  stops on Close, the same contract as the break animation. Nothing else
  names it — no Help entry, no menu row — because it is a secret, and it is
  not a screen a coach needs on a field. `window.podWars` carries a seeded
  step for the suite.

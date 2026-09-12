# What the spec asks for, and what is built

`docs/GRIDLOCK-OVERSKILL-SPEC.md` is the source of truth for behaviour. This
file is the honest reading of it against the app, so nobody has to guess
whether something is done, deliberately different, or simply not built yet.

Three states only:

- **Built** — it is in `web/index.html` and the suite covers it.
- **Differs** — built another way on purpose, with the reason.
- **Not built** — missing. No hedging.

The original feature audit below is retained as project history. The runnable
package was reviewed and completed for its device-local architecture on
September 11, 2026. See `IMPLEMENTATION.md` and the root README for the current
distribution, validation, and explicit cloud/native boundaries.

## Built

**How did they get there?** Scout now has an opponent route viewer with a
shortcut from each pit player. It connects a selected starting position,
ordered recorded sightings and a destination using clear paths around measured
bunkers. Available wire alternatives, playback and step controls are included.
Sightings persist per team, player, layout, match and point and travel in full
backups. Routes are explicitly inferred; there is no automatic video tracking.
See `HOW-DID-THEY-GET-THERE.md` for the workflow.

**Shell and roles.** Promo first, never the tutorial. Staff create / log in,
tutorial, continue as guest. Guest, staff and league admin. Staff login gates
creating a class and opening League; joining a class needs no account. Per-tab
first-run tips that stay dismissed.

**Tabs.** Playbook, Tally, Scout, Sightlines, More on the phone. More carries
Walk, Lineups, Movement, Assess, Codes, Bunker stats, Team, Messages, Classes,
League, Nexus — all eleven.

**The field.** Top-down, DORITO SIDE and SNAKE SIDE labelled, real inflatable
silhouettes rather than circles, official codes on every bunker, team calls
overlaying those codes, and changing the event changing the layout on every tab
that draws one. Three layouts, all measured off official 2D maps: Lone Star,
Tampa Bay, Midwest. The spec asked for one.

A bunker is filled to the footprint that was measured and outlined *inside* that
fill. Insetting the whole shape instead — which is what an SVG stroke wants,
since it straddles the line it sits on — put the outer edge of the paint on the
measurement and left the outer half-stroke reading as field, so two bunkers that
touch showed a stripe of black between them. On the snake that is exactly where
it shows: the beams run into the giant plus on the official map, and on screen
they stopped a third of a foot short of it. The angled beam's ends are squared
for the same reason, because a beam is the one bunker that butts another.
`npm run verify:bunkers` measures the drawn geometry against the layout JSON and
now has nothing to add back for stroke: 173/173 at 0.0000 ft.

**Motion.** Five players, a unique path per layout per break, planting on a
bunker. Ease-out interpolation with exact endpoints. The face chevron and the
shot lane travel with the player rather than jumping to the plant. Editing:
drag a corner, tap one to remove it, tap the line to add one, drag a player to
point him, reset one path or all of them.

**Direct the five.** Per player: Primary | Secondary, Face with the eight-way
pad, and Shot — which takes a named bunker *or* one of the eight lanes, for a
man told to hold a gap rather than aim at something.

**All twelve breaks.** Hold & Read, Conservative, Lock the Lanes, Balanced
Break, Clean / Lane Trade, Tower / Centre, Contain Both Wires, Wire Split,
Counter Break, Snake Stack, Dorito Flood, Blitz — in that order, so the picker
is a dial from patient to must-score. Each has its own five plants on each of
the three fields, and they are not typed: `tools/plants.js` reads the call the
way a coach says it — how many men on which wire, how far up the field — and
picks the bunker that actually sits there. Add a field and its plants come out
of the same rule. The suite checks that the plants in the app are the ones the
rule produces, so a hand edit shows up as a failure rather than on a sideline.

**The bunker key.** More → Codes carries the fifteen-entry key the NXL prints
in the corner of every one of these maps, each code with the bunker it names and
how many are on the field you are on. All three fields carry the same fourteen;
the fifteenth, TCK / Tall Cake, is in the printed key and on none of them, and
the app says so rather than quietly leaving a code out. The suite checks that
every code on every field is in the key and that one code never covers two
different bunkers.

**Log break, and the read it exists for.** The spec's ✓ chip. Playbook logs
the call you actually made against the field, the point and the team you were
on, and counts the share underneath: how often each call has been yours here,
and a warning in amber when one of them is half of your last ten. Nothing is
modelled — it is the arithmetic a team watching your film already does, which
is the argument for seeing it first.

**Off the buzzer.** The five no longer leave together. The man with the
furthest to run goes on the buzzer and everyone else holds in proportion to how
much less ground he has to cover — about half that difference, capped at a
quarter of the break, because a man stood still while the point is on reads as
a mistake rather than a plan.

**Cards, Opp and Rep.** The last three chips the spec puts on Playbook.

*Cards* is one card a man — his number and name, the bunker in big type, the
wire he is on, Primary or Secondary, which way he faces and what he lanes, in
words rather than glyphs. Share the five puts the same text in the squad chat.

*Opp* is the opponent library, on Scout → Counter: your own answer to each of
their twelve calls, written against the team rather than the pit so it follows
them in and out of the slot. The calls you have actually logged them running
sort to the top, and Playbook shows the answer beside the call with a button to
make it. It is the coach's line, not the picker's — the ranking above it is a
heuristic and says so.

*Rep* is the recognition drill: the field draws one of the twelve and nothing
on screen says which — no call card, and a header that reads Name the call
instead of naming it. The clock runs from the moment it is up to the moment he
taps one of the twelve. Right, average and best, and a verdict at two seconds.
The call he was on is put back when he stops, because a drill must not quietly
change what he is about to call.

**Tally, and the match around it.** Point number, your five and theirs, out or
alive, how he went out, who got him, shot-at bunker and moved-to bunker, feeding
Bunker stats.

**The sideline loop, on one screen.** Point ends, who won it, what are we
calling, play it, tally the outs. Three of those lived on Tally and the call
lived a tab away, so every point cost two tab switches. The call is on the point
sheet now, between the score and the five — the order a coach reads them in —
and it is the same call: change it there and Playbook and the field follow.
Logging is there too, so the coach who never opens Playbook still feeds
self-scout.

**The score.** A point has a winner, and it is one tap: We won it or They won
it. The score is the count of them — in the header beside the Staff chip where
nothing crops it, on the point sheet, and against each sheet in Matches. It also
sets Ahead / Even / Must-score, which ranks the counter-picker and used to be a
toggle a coach had to remember to flip; being behind is not something you should
have to tell the app twice, and he can still say otherwise when the clock
disagrees. Back a point takes its result with it, so going back is never a way
to score the same point twice.

A point number only means something inside a game, so there is a match: who it
is against, when it started, and every out, lineup, rotation, grade and logged
call stamped with it. Next point and Back a point, because Next point is one tap
and a sideline is a sideline. New match puts the point back to one and keeps the
old sheet — More → Matches lists every one you have kept and opens it on its last
point. The sheet holds its own opponent while you scout the next team in the
right pit, and says so if the two drift apart. Games picks a sheet before it
picks a point, so playing a team twice does not merge their two point ones.

**The pro board.** Every team entered in Pro X-Ball at Lone Star — all twenty,
Atlanta Jungle Cats through TonTon Arsenal — read off the league's own
registration page on PBLeagues on 10 September 2026, each marked `ENTERED` with
the payment state the page showed. The board says what it was read from, that it
is the whole entry, and when it was read, because entries move and a date is the
only thing that tells a coach whether to look again.

Neither the league site nor PBLeagues is reachable from this machine; both are
blocked by the egress proxy, so anything sourced arrives from the coach. This
came in as a screenshot. It replaced a list built from search metadata that had
five teams which had not entered and two names wrong — Infamous entered as
Detroit, not Los Angeles, and the Hurricanes as CK.

Registration is on the board because the league publishes it. A score is not:
no pro team carries points, tendency or threat, those are the coach's to enter,
and an unscored team reads as a dash. `reg` is only ever present on a team whose
name came off the registration page, and the suite fails if it is not.

**Scout.** Two pit cards, both starting empty — the app does not know who you
are playing and does not guess. Pick a team and the card opens: points, picker,
tendency, threat stars and notes; the shared field underneath with red left and blue right and a legend;
Roles and Shot lanes toggles and Play break. Seven sub-tabs against the spec's
four: Matchup, Breakouts, Anticipate, Counter, Layers, Games, Division. The
counter-picker with Ahead / Even / Must-score and a ranked list. Copy matchup
card. The division board with the fourteen CIN semi-pro teams, tap a row to
load the right pit.

**Their five, on the field.** Pick a team and you get whatever roster is known:
the one the league published where there is one, flagged as published so a name
nobody here has watched is never mistaken for something a coach saw, and
whatever you have logged yourself. Division shows which teams come with one —
green for what you logged, amber for a published roster waiting to be added.
Then place each man where you have seen him set up, and the Scout field draws
him there in his pit's wire colour with his number, as a square rather than a
circle so he is never mistaken for a runner on the break. A plant is kept per
field, because a bunker only means something on one. A man you have not placed
is not guessed onto a bunker, and a team with no published roster says so rather
than being filled in from memory — only San Diego Dynasty has one today.

**Sightlines.** Tap the field where you are standing, tap what you want to see;
lanes tested against real bunker footprints, blockers named.

**Walk, Lineups, Movement, Assess, Codes, Bunker stats, Team, Messages,
Classes, League, Nexus.** All present and working, including the heat overlay
on Bunker stats, rotation arrows on Movement, bunker calls on Team, the class
join code and sign-in form, the four default league groups, the blast log with
its one-line consent note, and sign-out plus show-the-tutorial-again on Nexus.

**On a tablet.** Past 900 px the five destinations leave the bottom of the
screen and stand in a rail down the left, each one a row you can read, with the
header beside them and the field given the room. Below that the bottom bar is
right and stays. A phone turned sideways is wide and very short, so it gets the
rail too — the call sits beside the whole field, and the rail is under the left
thumb.

**Who a blast goes to.** A blast carries a set of groups, so a gate time can go
to Ops and Refs without going to Registration and Vendors. Only members with a
contact on file are counted — the button used to promise a number that included
people there was no way to reach. No pick is no send, not everybody, because a
missed tap must not become a text to two hundred people. The log records who
you addressed and how many could actually be reached, which are not the same
number.

**A class is a session, not a title.** When it starts, what to bring, and
whether the sheet is still taking names. Closing it closes it — the form is
gone, not just the tag. Share the details puts the title, the time, the code and
the notes in the share sheet.

**The board, both pits.** Type a few letters to narrow it. A tap loads the team
you are about to play; press and hold loads the other pit, which is how you set
up a matchup you are not in.

**The squad code, and one man's word.** The squad has a code that travels inside
a squad copy, so a player pasting one on his own phone can see whether he is
adding your team or somebody else's — a merge that mixes two squads says so
rather than quietly stirring their roster into yours. It cannot fetch anything;
nothing here can. And a bunker call can belong to one player instead of the
team: his word shows on his card and never on the field, where five people are
reading the same picture.

**The fields this app carries.** Nexus lists every one with its bunker count and
where its map was read from, marks the one you are on, and switches to another.

**Where the point was decided.** Outs on the Scout field: an X on every bunker a
man was shot at, heavier the more often it happened, and a ring around the ones
that traded both ways — we lost men behind that paint and so did they. That is a
gunfight, and it is the thing worth having off a field drawing rather than a
table. Counted straight off the tally, on this layout; a bunker nobody has been
shot at carries no mark.

**Smooth.** Corners are rounded because a man does not turn on a dime and a
mitre reads as an instruction to stop and pivot. Turn it off and the legs are
drawn as routed, which is what you want when you have dragged a corner to a foot
off a bunker. The plants, the timing and where each man ends up are the same
either way — it is the drawing, not the run.

**The screen stays awake.** A coach makes the call, puts the phone down, and
picks it up on the buzzer — locked. The Screen Wake Lock API rather than a
plugin, so the phone app and the browser behave the same; the system releases it
whenever the app stops being visible, so it costs nothing in a pocket. A switch
on Nexus, on by default, shown only where the phone can do it.

**House rules.** The banned name appears nowhere in the product; the control is
Shot lanes. The training-aid line is on Playbook and Scout. No auto tutorial.
No invented official scores — a team nobody has scored reads as a dash.

## Differs, on purpose

**Where a season lives.** localStorage inside a web view is not a safe place to
keep a coach's year: iOS may clear it when the device is short of space, and it
is not in the device backup. So every save also writes a durable copy to the
phone's own storage through `@capacitor/preferences`, and a launch that finds
nothing locally reads it back and says what it recovered. It is a mirror rather
than a move, because `save()` is synchronous and called from every handler in
the app. In a browser there is no such store and the app says so rather than
promising a safety net it does not have.

**No server.** The spec assumes Overskill's sign-in, database, email and push.
There is none of that here. Coaching calculations and saved records are local;
optional voice dictation may use the device or browser's online speech provider,
and the website host delivers the app files. Staff
sign-in is local, salted and hashed; classes live on the phone that made them;
a blast opens the share sheet with the recipients and body rather than sending;
Nexus → Save a copy is the answer to backup and moving between phones. Google
and Apple sign-in need a backend and are not stubbed.

**Palette.** The spec says dark navy, gold and field green. `CLAUDE.md` says
black `#0b0c0d`, red `#ad1515`, off-white type, and a field that is the same
dark ground rather than turf. `CLAUDE.md` is the newer instruction and wins.

**Bunker sizes.** The spec says draw the footprints. They come from
`layouts/bunkers.json`, measured once off the clean Midwest 2D, because a
bunker type is one inflatable — see `docs/LAYOUTS.md`.

**No event feed.** The spec wants an optional HTTPS feed URL so a schedule can
arrive on its own. This build has no event-feed service or automatic data updates. A
field ships with a release, measured off that event's own official 2D map, and
Nexus says so rather than leaving a dead box on screen.

**How to anticipate.** The spec puts it behind a menu. It is its own sub-tab
under Scout instead, because it is a screen you read rather than a thing you
pick.

**QR.** The encoder runs locally without a remote service, and is
pinned in the suite against a matrix an outside decoder verified. Nothing draws
one on a class card yet, on purpose: a scan opens the app to a session that
does not exist on the scanner's phone, because sessions live on the device that
created them. It ships the day a session can be reached from another device.

## Found by reading, not by the suite

Before the first sideline test, the app was read line by line and its handlers
fuzzed — 4,000 random sequences of the things a coach actually taps — with the
state checked against its invariants after every one. The suite was green
throughout and stayed green; all four of these came out of reading and fuzzing.

- **A break key this build does not have white-screened the app.** `layoutKey`
  was guarded at every door; `script` was not, and the header reads it on every
  screen. Guarded now, and `breakName()` is the only way in.
- **Reopening a match scored but never tallied put the coach back on point 1**,
  where his next result overwrote the first. `lastPoint()` asks every list.
- **Ahead / Must-score carried across a new match**, ranking a 0-0 sheet on the
  last one's result.
- **A non-secure address silently disables sign-in, screen-wake and Share.**
  The app says so on screen where it is true.
- **Playing the break wiped what you typed on the next tab.** The animation ends
  by rebuilding the screen, 2.2 seconds after you left Playbook. Leaving stops
  the run now.

## Not built

The offline coaching interface is implemented. The original Overskill spec
also assumes services that this package does not contain: cloud authentication
(including Google/Apple sign-in), shared sessions and remote class joining,
server-delivered email/push notices, synchronized records, and a live event
feed. These require a backend and are not implemented or simulated here.

The generated iOS and Android Capacitor projects use the complete shared web
interface. The separate early SwiftUI snapshot is archival; an independent
SwiftUI/Android Compose rewrite is not included. Native release binaries still
require platform tooling and signing.

The list that used to sit here — the tablet rail, the blast group picker, class
detail, division search and long-press, the team code and per-player calls, the
Nexus event list, gunfight rings and X-for-out, and the Smooth chip — is now in
**Built**, above.

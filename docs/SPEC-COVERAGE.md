# What the spec asks for, and what is built

`docs/GRIDLOCK-OVERSKILL-SPEC.md` is the source of truth for behaviour. This
file is the honest reading of it against the app, so nobody has to guess
whether something is done, deliberately different, or simply not built yet.

Three states only:

- **Built** — it is in `web/index.html` and the suite covers it.
- **Differs** — built another way on purpose, with the reason.
- **Not built** — missing. No hedging.

Last walked: the commit that added this file. Re-walk it when the spec changes.

## Built

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

**Tally.** Point number, your five and theirs, out or alive, how he went out,
who got him, shot-at bunker and moved-to bunker, feeding Bunker stats.

**The pro board.** Sixteen NXL pro teams, names only, and each one says where
its name was read from: `LEAGUE` if the league publishes a team page under that
name, `EVENT` if it came off coverage of a 2026 NXL event. Neither the league
site nor PBLeagues is reachable from this machine — both are blocked by the
egress proxy — so the list is what could be sourced and the board says out loud
that it cannot be called complete. No pro team carries points, registration,
tendency or threat; those are the coach's to enter, and an unscored team reads
as a dash.

**Scout.** Two pit cards with team, points, picker, tendency, threat stars and
notes; the shared field underneath with red left and blue right and a legend;
Roles and Shot lanes toggles and Play break. Seven sub-tabs against the spec's
four: Matchup, Breakouts, Anticipate, Counter, Layers, Games, Division. The
counter-picker with Ahead / Even / Must-score and a ranked list. Copy matchup
card. The division board with the fourteen CIN semi-pro teams, tap a row to
load the right pit.

**Sightlines.** Tap the field where you are standing, tap what you want to see;
lanes tested against real bunker footprints, blockers named.

**Walk, Lineups, Movement, Assess, Codes, Bunker stats, Team, Messages,
Classes, League, Nexus.** All present and working, including the heat overlay
on Bunker stats, rotation arrows on Movement, bunker calls on Team, the class
join code and sign-in form, the four default league groups, the blast log with
its one-line consent note, and sign-out plus show-the-tutorial-again on Nexus.

**House rules.** The banned name appears nowhere in the product; the control is
Shot lanes. The training-aid line is on Playbook and Scout. No auto tutorial.
No invented official scores — a team nobody has scored reads as a dash.

## Differs, on purpose

**No server.** The spec assumes Overskill's sign-in, database, email and push.
There is none of that here and the app makes no network requests at all. Staff
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

**QR.** The encoder is written, hand-rolled because the app has no network, and
pinned in the suite against a matrix an outside decoder verified. Nothing draws
one on a class card yet, on purpose: a scan opens the app to a session that
does not exist on the scanner's phone, because sessions live on the device that
created them. It ships the day a session can be reached from another device.

## Not built

Ordered by what a coach would miss first.

1. **Cards, Opp and Rep.** Assignment cards to read off or share; an opponent
   library keyed "they run X, we run Y"; the recognition drill that runs the
   break at the coach until the call is under two seconds.
2. **Tablet side rail.** A large screen gets one centred column with the field
   at 860 px, not a rail. Every destination is reachable; it is the phone
   layout, well behaved.
3. **Blast group picker.** A blast goes to every member of every group. The
   spec wants Ops and Refs without Registration and Vendors.
4. **Class detail.** Title only. No notes, no start time, no open / close
   toggle, no share sheet on the class itself.
5. **Division board search, and long-press for the left pit.** Tap loads the
   right pit; that is all.
6. **Team join code and per-player bunker nicknames.** Bunker calls are per
   team, not per player, and there is no code to join a team.
7. **Nexus event feed.** No optional HTTPS event feed URL and no event list —
    Nexus shows the event you are on.
8. **Gunfight rings and X-for-out on the Scout field**, and the "How to
    anticipate" menu as a menu. Anticipate is its own sub-tab instead.
9. **The Smooth chip.** Paths are always smoothed; there is no toggle, and no
    Catmull–Rom alternative.

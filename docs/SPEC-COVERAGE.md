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

**Tally.** Point number, your five and theirs, out or alive, how he went out,
who got him, shot-at bunker and moved-to bunker, feeding Bunker stats.

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

1. **Seven of the twelve breaks.** Built: Hold & Read, Balanced Break, Snake
   Stack, Dorito Flood, Blitz. Missing: Conservative, Counter Break, Wire
   Split, Tower / Center, Clean / Lane Trade, Contain Both Wires, Lock the
   Lanes. Each needs five plants per layout in `BREAK_PLANTS`, and those are
   picked by rule, not off a walk — a coach who has walked the field should
   drag them.
2. **Log break.** The spec's ✓ chip: log the call you actually made, to feed
   self-scout predictability. Outs carry the break they were logged under, so
   the data is half there; the chip and the read off it are not.
3. **Staggered starts.** All five run on one clock. The spec asks for the
   buzzer, then the snake runner, then support.
4. **Cards, Opp and Rep.** Assignment cards to read off or share; an opponent
   library keyed "they run X, we run Y"; the recognition drill that runs the
   break at the coach until the call is under two seconds.
5. **Tablet side rail.** A large screen gets one centred column with the field
   at 860 px, not a rail. Every destination is reachable; it is the phone
   layout, well behaved.
6. **Blast group picker.** A blast goes to every member of every group. The
   spec wants Ops and Refs without Registration and Vendors.
7. **Class detail.** Title only. No notes, no start time, no open / close
   toggle, no share sheet on the class itself.
8. **Division board search, and long-press for the left pit.** Tap loads the
   right pit; that is all.
9. **Team join code and per-player bunker nicknames.** Bunker calls are per
   team, not per player, and there is no code to join a team.
10. **Nexus event feed.** No optional HTTPS event feed URL and no event list —
    Nexus shows the event you are on.
11. **Gunfight rings and X-for-out on the Scout field**, and the "How to
    anticipate" menu as a menu. Anticipate is its own sub-tab instead.
12. **The Smooth chip.** Paths are always smoothed; there is no toggle, and no
    Catmull–Rom alternative.

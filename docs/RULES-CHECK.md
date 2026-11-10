# The rulebook, checked

The owner handed over the **NXL Divisional X-Ball Rules 2026** (31 pages) and
asked whether the app adheres to it. The app carries none of the league's text
— a stale copy is a coach quoting last season's rule at an official, and nothing
in here adjudicates. What it carries is the *structure*: what a match is, when
it ends, what a penalty costs, when ends switch. This page walks that structure
against the rulebook, by section number, so the next reader can check it again
when the league publishes a new edition.

Every number below is a **setting the coach can change** on the format screen
and the point sheet. Picking a division under More › Format fills in that
division's numbers from the rulebook's own tables; he can still change any of
them. **Pro**, **WNXL** and **Masters** are named custom choices, and **Other** is for any
event this rulebook does not cover: none of the three presets anything.

## The divisions and their numbers (read 2 Nov 2026)

8.1.1 says the X-Ball format is played by **Semi-Pro, D2, D3, D4 and D5**, and
section 15 adds **3v3 X-Ball** (Amateur and Intermediate). Those seven are
the divisions with rulebook numbers (`FMT_RULES` in `web/index.html`). The
list also carries **Pro**, **WNXL** and **Masters** as named custom choices
(`FMT_CUSTOM_DIVS`, shown as "· custom"), and **Other**. This rulebook gives
none of those a game time or mercy limit: Pro plays under the league's pro
rules, WNXL (the women's pro division, entered as "WNXL Pro X-Ball" on PBLeagues) appears only in a roster rule — "The WNXL Professional Division is its own separate format" (4.2.5.1) — and its game time, mercy and race are not in this book (re-read 4 Nov 2026), and Masters appears only as a roster rule (4.3.4, 4.7.6). So a custom
choice clears any game time and asks how many a side, the race, the mercy and
the clock, like Other. Division 1, Collegiate and Juniors are off the
list; a saved format or sheet that still carries one keeps the name and shows
under Other.

| Division | Game time | Mercy lead | Break | Split deck | Overtime | Rule |
|---|---|---|---|---|---|---|
| Semi-Pro | 15 min | 5 | 2:00 min | 0:45 | always on a tie (9.12.3) | 8.2, 9.3.12 |
| Division 2 | 15 min | 5 | 2:00 min | 1:00 | playoffs only (9.12.1) | 8.2, 9.3.12 |
| Division 3 | 12 min | 4 | 2:00 min | 1:00 | playoffs only | 8.2, 9.3.12 |
| Division 4 | 12 min | 4 | 2:00 min | 1:00 | playoffs only | 8.2, 9.3.12 |
| Division 5 | 10 min | 3 | 2:00 min | 1:00 | playoffs only | 8.2, 9.3.12 |
| 3v3 Amateur | 6 min | 3 | 2:00 min | — | 2-min 1v1 (15.5) | 15.3.1 |
| 3v3 Intermediate | 6 min | 3 | 2:00 min | — | 2-min 1v1 (15.5) | 15.3.1 |

X-Ball is five a side, 3v3 three. Divisional X-Ball is a game clock and a mercy
lead, not a race, so a rulebook division sets no race. The game time is shown
and never run: it is the official's clock (9.3.13), and the coach taps Time's
up. Race to and how many a side are asked only under Other.

| Rulebook | What it says, structurally | What the app does | State |
|---|---|---|---|
| 8.1, 8.2 | A match is a series of points on a game clock, with a **point-differential mercy rule**; game time and mercy margin vary by division. | **Mercy rule** on the point sheet (Off · 3 · 4 · 5 · 6) ends the match at that lead and calls match point one short of it; **Time's up** records the clock running out. **Race to** stays for formats that race to a score. The clock itself is the official's. | Done |
| 9.3.9, 9.3.11 | First point from the pit side; teams **switch ends after every point scored**; a no-point does not switch them; overtime starts on the pit side. | **Swap every point** switches on scored points, read off the results — "Next point, no result" is a no-point and nobody moves. Overtime points start from the pit-side end. **Switch ends** still overrides this point. | Done |
| 9.3.12, 8.3 | A break period follows every point: standard minimum two minutes; split deck one minute (D2–D5) or 45 seconds (semi-pro). | **Clock between points**: Off · 0:45 · 1:00 · 1:30 · 2:00, started by the hang. | Done |
| 9.7 | One **timeout** of one minute per team per match, called by the designated coach, not in the last ten seconds before a point, usable before overtime. | **Our timeout / Their timeout** on the point sheet: one a side a match, recorded with the point it went on, one tap gives it back. The minute is the official's clock. | Done |
| 9.10 | A coach may **concede** a point; it goes to the other side. | They won it, as any point. The app does not need to know why. | Done |
| 9.11 | In the last 60 seconds a Major or Gross Major penalty is an automatic point to the other team. | The coach records the point as the official awards it; penalties are recorded as what they cost. | Done |
| 9.12, 15.5 | Level at the end of regulation: **overtime** only in playoffs (and semi-pro), 5-minute sudden death, then 1v1s; otherwise the match **stands tied**. | Level at Time's up the sheet asks: **it's a tie** or **overtime**; overtime is sudden death — next point wins. 1v1 shoot-outs are scored as a single deciding point. | Done |
| 9.13, 9.14 | A point ends on a buzzer, a concede, certain penalties, or regulation time running out; the match ends on the horn or the mercy margin. | **We won it / They won it** per point; the match ends on Time's up, the mercy lead, or the race. A finished sheet refuses further results. | Done |
| 11.1 | How points are awarded. | Who won the point is the coach's record of the official's call, every time. | Done |
| 11.3 | Round score: five match points a win, one a tie. | Matches counts won / lost / tied per event. League standings are the league's. | Done |
| 12.1 | **Minor** = the player and one teammate off (one-for-one); **Major** = the player and two (two-for-one); **Gross Major** = the player and three (three-for-one). Penalties after a point is confirmed are served **next point**. | Penalty on the sheet records side and **men off, 1 to 4**, with the one-for-one / two-for-one / three-for-one bodies explained; stamped on the point it is served; `startUp()` counts what each side began with and **Even points only** filters on it. | Done |
| 12.2 | Not enough players to serve a penalty: point to the other side; the short side starts the next point down the balance. | Record the point as awarded and the next point's penalty as served. | Done |
| 9.1.2, 9.1.3 | Nobody on the roster may use an electronic or mechanical device to communicate with anyone during the team's points; no communication from the pit to the field during a point. | The app communicates with nobody — there is not one network call in it. Cards, Messages and the whiteboard are for between points, and Help says so. **Using it to signal the field during a point is on the coach, and the rulebook bars it.** | Noted |
| 4.3 | Roster size limits by division. | The roster is the coach's; the app sets no limit. | n/a |

## Where this leaves the app

Nothing in the app contradicts the rulebook, because nothing in the app decides
a rule: the official calls it, the coach records it. Everything in the table was
either already there or went in with this read, the timeout included.

## When the league publishes a new edition

Re-read 8.2 (game times and mercy margins), 9.3.11 (switching ends), 9.3.12
(break period), 9.7 (timeouts) and 12.1 (what a penalty costs). Those are the
five places where a change in the rule is a change in the structure. Everything
else is the official's to apply.

## Named custom formats

Pro, WNXL and Masters remain visible as custom choices. WNXL fills in **race to 5 and a 5-point mercy**, the owner's setting of 4 Nov 2026 (`FMT_OWNER`), not a published rule; the screen says so, the clock between points is left as the coach set it, and every answer stays editable. Replace it with the league's numbers once its WNXL rules are read. This divisional rulebook supplies no defaults for them. Existing custom answers and legacy division names are preserved. Overwriting a saved preset replaces its format fields rather than retaining an old game-time value.

## The NXL format reference (owner, 4 Nov 2026)

The owner sent a consolidated reference of NXL formats from the league's event
pages. It covers the divisions and formats the divisional rulebook does not
(`FMT_REF` in `web/index.html`). The Format screen names it as "the NXL format
reference (4 Nov 2026), not the divisional rulebook", and every answer stays
editable. The rows the rulebook also covers (Semi-Pro, D2–D5, Amateur and
Intermediate 3-player X-Ball) agree with it and keep their rulebook citation.
The reference gives no clock between points, so a reference preset leaves the
coach's setting alone.

| Division / format | Players | Game clock | Mercy lead | Race to | Bracket |
|---|---|---|---|---|---|
| Professional | 5 (X-Ball) | 15 min | 6 | — | |
| WNXL Professional | 5 (X-Ball) | 15 min | 5 | — | |
| Masters X-Ball | 5 (X-Ball) | 10 min | 3 | — | |
| Pro 3-player X-Ball (World Cup 2026) | 3 | 7 min | 3 | — | |
| 3v3 | 3 | 3 min | — | — | best 2 of 3 in elimination |
| 5v5 | 5 | 5 min | — | — | best 2 of 3 in elimination |
| 7v7 | 7 | 7 min | — | — | win or go home |
| 10v10 | 10 | 10 min | — | — | win or go home |
| Classic 5v5 | 5 | 5 min | — | — | best 2 of 3 in prelims |
| College X-Ball (NCPA) | 5 (X-Ball) | 15 min | — | 5 | |

WNXL was race to 5 with a 5-point mercy from 4 Nov 2026 until this reference
replaced it the same day: 15 minutes, 5-point mercy, no race. The bracket
column is shown on the screen and never scored: it is how a bracket advances,
not the points that win a game. The screen keeps conventional 3v3 and
3-player X-Ball in separate groups.

## Division, then format (9 Nov 2026)

The Format screen asks the division, then what it plays, because NXL runs the
same division in more than one format (the World Cup has Division 4 X-Ball and
Division 4 5v5). A pair takes its numbers from the two tables above only:

- X-Ball and 3-player X-Ball by division, from the rulebook or the reference.
- A timed format (3v3, 5v5, 7v7, 10v10, Classic 5v5) from its reference row,
  which is the same for every division. The card says so.
- Any other pair (Novice X-Ball, Open 3-player X-Ball, and so on) shows "Not
  published" for each value and presets nothing.

The reference gives no clock between points, so a timed format shows it as
not published. Add a number only with its source.


# The rulebook, checked

The owner handed over the **NXL Divisional X-Ball Rules 2026** (31 pages) and
asked whether the app adheres to it. The app carries none of the league's text
— a stale copy is a coach quoting last season's rule at an official, and nothing
in here adjudicates. What it carries is the *structure*: what a match is, when
it ends, what a penalty costs, when ends switch. This page walks that structure
against the rulebook, by section number, so the next reader can check it again
when the league publishes a new edition.

Every number below is a **setting the coach makes on the point sheet**, never a
constant the app ships. Divisions differ (8.2), and the app does not know which
division he is in.

| Rulebook | What it says, structurally | What the app does | State |
|---|---|---|---|
| 8.1, 8.2 | A match is a series of points on a game clock, with a **point-differential mercy rule**; game time and mercy margin vary by division. | **Mercy rule** on the point sheet (Off · 3 · 4 · 5) ends the match at that lead and calls match point one short of it; **Time's up** records the clock running out. **Race to** stays for formats that race to a score. The clock itself is the official's. | Done |
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

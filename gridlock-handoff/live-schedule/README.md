# World Cup 2026 live schedule, brackets, standings, scoresheet

Snapshot from PBLeagues pulled 2026-11-14 06:34:59 ET (1,379 games: Wed 69, Thu 237, Fri 336, Sat 681, Sun 56).

- `games.json`: every game with id, day, time, field/pit, division, home/away, score and status.
- `standings.json`: per division/group from Final and Final (forfeit) prelims. Columns are GP, W, L, T, PF, PA, diff and pts (2 points for a win, 1 for a tie). These are unofficial; PBLeagues seeding can differ.
- `brackets.json`: per division, built from the posted rounds (1/32 through Finals, Consolation and Champions). Placeholder slots such as "Pro Ochos" stay pending until PBLeagues fills them. No matchups are invented.
- `standings_brackets.py`: builds both files from games.json. It is called by `refresh.py`.
- `page-ui.tsx` and `world-cup-2026-live-schedule.canvas.tsx`: reference UI for the Saturday grid, the team lookup, brackets, standings and the scoresheet.
- Scoresheet export uses the Gridlock Tally out shape `{pt, side, name, at, m, script, layout:"nwc", vs, how?, by?}` with `side` set to `us` or `them`. Scoresheets are saved in localStorage under the key `wc2026.scoresheet.v1`.
- Rules: never invent jersey numbers or hometowns. Keep the PBLeagues game IDs, because Saturday 5v5 was reticketed and old IDs were dropped.

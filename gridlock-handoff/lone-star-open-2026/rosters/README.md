# LSO 2026 Pro rosters (PBLeagues event 9321)

Source: `https://mlpb.pbleagues.com/cgi-bin/showteams.cgi?EID=9321&LID=316` → per-team `roster.cgi?ERID=…`

- `pro-allowlist.json` — team → [{jersey,name}] for Elim/Tendencies matching
- `pro-<slug>.json` — full per-team dump
- Jersey is often null on PBLeagues (names only); map #→name only when film/graphics show the number.
- Always require film jersey/graphics/commentary before naming an elim row; VERIFY if ambiguous.

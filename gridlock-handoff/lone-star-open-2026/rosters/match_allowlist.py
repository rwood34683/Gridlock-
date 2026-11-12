#!/usr/bin/env python3
"""LSO Pro allowlist matcher (PBLeagues EID=9321).

Rules (Rob standing + film-room skill):
- Film jersey/graphics/commentary REQUIRED before naming.
- Allowlist narrows candidates by team; never invent a name from roster alone.
- VERIFY if multiple allowlist names could fit, or film is ambiguous.
- Jersey numbers are usually null on PBLeagues — treat as name allowlist per team.
"""
from __future__ import annotations
import json
from pathlib import Path
from typing import Optional

ALLOW_PATH = Path(__file__).with_name("pro-allowlist.json")

def load_allowlist(path: Path = ALLOW_PATH) -> dict:
    return json.loads(path.read_text())

def team_names(team: str, allow: Optional[dict] = None) -> list[str]:
    allow = allow or load_allowlist()
    # fuzzy team key
    if team in allow:
        return [p["name"] for p in allow[team]]
    tl = team.lower()
    for k, rows in allow.items():
        if tl in k.lower() or k.lower() in tl:
            return [p["name"] for p in rows]
    return []

def resolve_name(
    team: str,
    *,
    jersey: Optional[str] = None,
    graphics_name: Optional[str] = None,
    commentary_name: Optional[str] = None,
    film_confident: bool = False,
) -> dict:
    """Return {playerOut, status, note}.
    status: named | unknown | VERIFY
    """
    names = team_names(team)
    # prefer explicit graphics/commentary if in allowlist (or unique close match)
    for candidate in (graphics_name, commentary_name):
        if not candidate:
            continue
        cl = candidate.lower().strip()
        hits = [n for n in names if cl == n.lower() or cl in n.lower() or n.lower() in cl]
        if len(hits) == 1 and film_confident:
            return {"playerOut": hits[0], "status": "named", "note": f"allowlist+film ({candidate})"}
        if len(hits) == 1:
            return {"playerOut": hits[0], "status": "VERIFY", "note": "allowlist match but film not marked confident"}
        if len(hits) > 1:
            return {"playerOut": "unknown", "status": "VERIFY", "note": f"ambiguous allowlist hits for {candidate}: {hits}"}
        # not on allowlist — still use if film confident
        if film_confident:
            return {"playerOut": candidate, "status": "VERIFY", "note": "film name not on PBLeagues allowlist"}
    # jersey alone cannot map (PBLeagues has no numbers); keep unknown
    if jersey:
        return {
            "playerOut": f"#{jersey}" if not str(jersey).startswith("#") else str(jersey),
            "status": "unknown",
            "note": "jersey seen; no PBLeagues #→name — leave until graphics/commentary",
        }
    return {"playerOut": "unknown", "status": "unknown", "note": "no film ID"}

if __name__ == "__main__":
    a = load_allowlist()
    print(f"teams={len(a)} players={sum(len(v) for v in a.values())}")
    print(resolve_name("Tampa Bay Damage", graphics_name="Margott", film_confident=True))

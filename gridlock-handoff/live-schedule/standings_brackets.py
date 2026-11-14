#!/usr/bin/env python3
"""Compute World Cup standings and brackets from a parsed schedule pull.

Writes schedule/standings.json and schedule/brackets.json for Gridlock.
Does not invent matchups or jersey numbers. Standings are computed from
posted Final / Final (forfeit) prelim scores; Unofficial is stored separately.
PBLeagues seeding rules may differ.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
HANDOFF = HERE.parent
EVENT_ID = "9322"

ROUND_ORDER = ["1/32", "1/16", "Ochos", "Ochofinals", "Quarters", "Semifinals", "Finals", "Consolation"]

SLOT_RE = re.compile(
    r"(?:Ochos|Ochofinals|Quarters|Semifinals|Finals|1/16|1/32|Prelims|Consolation)\s*-\s*\d+"
    r"|\bConsolation\s+[AB]\b"
    r"|\bWinner\s+[AB]\b"
    r"|\bBracket\s+[A-Z]\s*#",
    re.I,
)
PRO_SLOT_RE = re.compile(r"^Pro (Ochos|Quarters|Semifinals|Finals)$", re.I)


def is_slot(name: str) -> bool:
    if not name or not str(name).strip():
        return True
    n = str(name).strip()
    if PRO_SLOT_RE.match(n):
        return True
    if SLOT_RE.search(n):
        return True
    return False


def parse_score(score: str) -> tuple[int, int] | None:
    if not score:
        return None
    m = re.match(r"^\s*(-?\d+)\s*[-–]\s*(-?\d+)\s*$", str(score))
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))


def winner_of(home: str, away: str, score: str, status: str) -> str | None:
    if not status or not (status == "Final" or status.startswith("Final")):
        return None
    if is_slot(home) or is_slot(away):
        return None
    pr = parse_score(score)
    if not pr:
        return None
    h, a = pr
    if h > a:
        return home
    if a > h:
        return away
    return None


def _blank_row(name: str) -> dict:
    return {"team": name, "gp": 0, "w": 0, "l": 0, "t": 0, "pf": 0, "pa": 0, "diff": 0, "pts": 0}


def _apply_game(table: dict[str, dict], home: str, away: str, score: str) -> None:
    pr = parse_score(score)
    if pr is None or is_slot(home) or is_slot(away):
        return
    hf, af = pr
    for n in (home, away):
        if n not in table:
            table[n] = _blank_row(n)
    table[home]["gp"] += 1
    table[away]["gp"] += 1
    table[home]["pf"] += hf
    table[home]["pa"] += af
    table[away]["pf"] += af
    table[away]["pa"] += hf
    table[home]["diff"] = table[home]["pf"] - table[home]["pa"]
    table[away]["diff"] = table[away]["pf"] - table[away]["pa"]
    if hf > af:
        table[home]["w"] += 1
        table[away]["l"] += 1
        table[home]["pts"] += 2
    elif af > hf:
        table[away]["w"] += 1
        table[home]["l"] += 1
        table[away]["pts"] += 2
    else:
        table[home]["t"] += 1
        table[away]["t"] += 1
        table[home]["pts"] += 1
        table[away]["pts"] += 1


def _sort_rows(rows: list[dict]) -> list[dict]:
    return sorted(rows, key=lambda r: (-r["pts"], -r["diff"], -r["pf"], r["team"].lower()))


def build_standings(rows: list[dict]) -> dict[str, Any]:
    # rows need division, group, round, home, away, score, status, id
    prelim = [r for r in rows if (r.get("round") or "") == "Prelims"]
    by_div: dict[str, dict[str, dict[str, dict]]] = defaultdict(lambda: defaultdict(lambda: {"official": {}, "unofficial": {}}))
    skipped = 0
    for r in prelim:
        div = r.get("division") or ""
        group = (r.get("group") or "").strip() or "—"
        home, away = r.get("home") or "", r.get("away") or ""
        status = r.get("status") or ""
        if status == "Final" or status.startswith("Final"):
            _apply_game(by_div[div][group]["official"], home, away, r.get("score") or "")
        elif status.startswith("Unofficial"):
            _apply_game(by_div[div][group]["unofficial"], home, away, r.get("score") or "")
        else:
            skipped += 1
        # ensure teams appear even with no finished games
        for n in (home, away):
            if n and not is_slot(n):
                if n not in by_div[div][group]["official"]:
                    by_div[div][group]["official"][n] = _blank_row(n)

    divisions = []
    for div in sorted(by_div):
        groups = []
        for gname in sorted(by_div[div], key=lambda s: (s == "—", s)):
            bucket = by_div[div][gname]
            groups.append({
                "group": gname,
                "official": _sort_rows(list(bucket["official"].values())),
                "unofficial": _sort_rows(list(bucket["unofficial"].values())),
            })
        divisions.append({"division": div, "groups": groups})
    return {
        "note": (
            "Computed from posted prelim scores (Final and Final forfeit). "
            "Unofficial results are listed separately and are not in the official table. "
            "PBLeagues seeding rules may differ."
        ),
        "points": "2 per win, 1 per tie, from posted scores",
        "divisions": divisions,
    }


def _round_key(name: str) -> tuple[int, str]:
    n = name or ""
    if n.lower().startswith("consolation"):
        return (ROUND_ORDER.index("Consolation"), n)
    try:
        return (ROUND_ORDER.index(n), n)
    except ValueError:
        return (50, n)


def build_brackets(rows: list[dict]) -> dict[str, Any]:
    br = [r for r in rows if (r.get("round") or "") and r["round"] != "Prelims"]
    by_div: dict[str, list[dict]] = defaultdict(list)
    for r in br:
        by_div[r.get("division") or ""].append(r)

    divisions = []
    for div in sorted(by_div):
        games = by_div[div]
        # winners already posted on a later ticket
        resolved_names = set()
        for g in games:
            for n in (g.get("home") or "", g.get("away") or ""):
                if n and not is_slot(n):
                    resolved_names.add(n)
        rounds_map: dict[str, list] = defaultdict(list)
        for g in games:
            home, away = g.get("home") or "", g.get("away") or ""
            status = g.get("status") or ""
            score = g.get("score") or ""
            win = winner_of(home, away, score, status)
            home_pending = is_slot(home)
            away_pending = is_slot(away)
            projected = None
            # Only label a projection when this game is final but the winner
            # has not yet been written onto a later-round ticket.
            if win and win not in resolved_names:
                # winner is only on this completed game; later slot still pending
                later = [
                    x for x in games
                    if _round_key(x.get("round") or "")[0] > _round_key(g.get("round") or "")[0]
                ]
                if later and not any(win in ((x.get("home") or ""), (x.get("away") or "")) for x in later):
                    projected = win
            item = {
                "id": str(g.get("match_id") or g.get("id") or ""),
                "day": g.get("day") or "",
                "date": str(g.get("date") or ""),
                "time": g.get("time_label") or (g.get("time") or ""),
                "field": g.get("field") or "",
                "pit": g.get("pit") or 1,
                "round": g.get("round") or "",
                "home": home,
                "away": away,
                "home_pending": home_pending,
                "away_pending": away_pending,
                "score": score,
                "status": status,
                "winner": win,
                "advanced": bool(win and win in resolved_names and not (home_pending or away_pending)),
                "projected_winner": projected,
            }
            # normalize time if compact form already used
            if hasattr(item["time"], "strftime"):
                # shouldn't happen for compact; raw rows use time_label
                pass
            rounds_map[g.get("round") or ""].append(item)
        rounds = []
        for rname, items in sorted(rounds_map.items(), key=lambda kv: _round_key(kv[0])):
            items.sort(key=lambda x: (x["date"], x["time"], x["field"], x["pit"]))
            rounds.append({"round": rname, "games": items})
        divisions.append({"division": div, "rounds": rounds, "games": sum(len(r["games"]) for r in rounds)})
    return {
        "note": (
            "Built only from games PBLeagues has posted. Placeholder sides "
            "(Quarters - 4, Bracket A #1, Pro Ochos, Open Winner A, …) stay pending "
            "until the source resolves them. projected_winner is set only when a "
            "game is final and that winner has not yet been written onto a later ticket; "
            "it is not a posted matchup."
        ),
        "divisions": divisions,
    }


def _stringify_times(rows: list[dict]) -> list[dict]:
    """Accept either raw parse_matches rows or compact games.json rows."""
    out = []
    for r in rows:
        item = dict(r)
        if "match_id" not in item and "id" in item:
            item["match_id"] = item["id"]
        # date/time may be date/time objects
        d = item.get("date")
        if hasattr(d, "isoformat"):
            item["date"] = d.isoformat()
        t = item.get("time")
        if hasattr(t, "strftime"):
            item["time"] = item.get("time_label") or t.strftime("%-I:%M %p").replace("AM", "AM").replace("PM", "PM")
            # %-I may not work; fallback
            if not item.get("time_label"):
                h, m = t.hour, t.minute
                ap = "AM" if h < 12 else "PM"
                h12 = h % 12 or 12
                item["time"] = f"{h12}:{m:02d} {ap}"
        elif item.get("time_label") and not isinstance(item.get("time"), str):
            item["time"] = item["time_label"]
        if isinstance(item.get("day"), str) and len(item["day"]) > 3:
            item["day"] = {
                "Wednesday": "Wed", "Thursday": "Thu", "Friday": "Fri",
                "Saturday": "Sat", "Sunday": "Sun",
            }.get(item["day"], item["day"][:3])
        out.append(item)
    return out


def write_standings_and_brackets(dest_dir: Path, rows: list[dict], pulled_at: datetime) -> dict:
    rows = _stringify_times(rows)
    standings = build_standings(rows)
    brackets = build_brackets(rows)
    payload_s = {
        "schema_version": "1.0",
        "event_id": EVENT_ID,
        "source_url": "https://pbleagues.com/event/9322/schedule",
        "retrieved_at": pulled_at.isoformat() if hasattr(pulled_at, "isoformat") else str(pulled_at),
        "timezone": "America/New_York",
        **standings,
    }
    payload_b = {
        "schema_version": "1.0",
        "event_id": EVENT_ID,
        "source_url": "https://pbleagues.com/event/9322/schedule",
        "retrieved_at": payload_s["retrieved_at"],
        "timezone": "America/New_York",
        **brackets,
    }
    (dest_dir / "standings.json").write_text(json.dumps(payload_s, ensure_ascii=False, indent=2) + "\n")
    (dest_dir / "brackets.json").write_text(json.dumps(payload_b, ensure_ascii=False, indent=2) + "\n")
    # Also sit next to schedule.json for the Gridlock pack.
    (HANDOFF / "standings.json").write_text((dest_dir / "standings.json").read_text())
    (HANDOFF / "brackets.json").write_text((dest_dir / "brackets.json").read_text())
    return {"standings": dest_dir / "standings.json", "brackets": dest_dir / "brackets.json"}


if __name__ == "__main__":
    import sys
    from zoneinfo import ZoneInfo
    import importlib.util
    spec = importlib.util.spec_from_file_location("wcrefresh", str(HERE / "refresh.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    html_path = Path("/tmp/wcsched-fresh.html")
    if not html_path.exists():
        sys.exit("no cached HTML; run refresh.py first")
    pulled = datetime.fromisoformat(json.loads((HERE / "games.json").read_text())["pulled_at"])
    rows = mod.parse_matches(html_path.read_text(errors="replace"), pulled)
    paths = write_standings_and_brackets(HERE, rows, pulled)
    print({k: str(v) for k, v in paths.items()}, "standings bytes", paths["standings"].stat().st_size)

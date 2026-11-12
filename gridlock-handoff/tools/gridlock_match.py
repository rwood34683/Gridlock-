#!/usr/bin/env python3
"""Emit Gridlock Coach-shaped exports from the handoff (see MAPPING.md).

Uses the field names and transforms from the public Gridlock- repo
(web/index.html, scripts/import-world-cup.js, tools/worldcup_pack.py).
Does not invent jersey numbers, sides, match ids, or tally outs.
"""
from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from gridlock_adapter import ET, _write_csv

# Public directory allowlist — scripts/import-world-cup.js PUBLIC
PUBLIC = {
    "event": [
        "name", "year", "event_id", "start_date", "end_date", "timezone",
        "source_urls", "related_events", "practice_event_excluded",
    ],
    "related_events": [
        "event_id", "name", "start_date", "end_date", "source_url",
        "team_list_url", "listed_team_count",
    ],
    "divisions": [
        "event_id", "division_id", "name", "group", "classification",
        "signed_up", "limit", "format_rules", "listed_count", "source_url",
        "retrieved_at",
    ],
    "entries": [
        "event_id", "division_id", "division", "format", "format_rules",
        "bracket", "team_name", "team_id", "entry_id", "registration_status",
        "source_url", "retrieved_at",
    ],
    "locations": [
        "entry_id", "team_id", "hometown_raw", "hometown_city", "hometown_region",
        "hometown_country", "home_field_name", "home_field_location_raw",
        "location_status", "retrieved_at",
    ],
}

# tools/worldcup_2026.py REG map (WCUP block only, not the directory)
REG_SHORT = {
    "Payment Accepted": "PAID",
    "Pending - Pay": "PEND",
    "Pay Entry Fee": "DUE",
    "Registration Deadline Passed": "LATE",
}

WC_LAYOUT = "nwc"


def fold_name(n: Any) -> str:
    return " ".join(str(n or "").lower().split())


def clock_of(text: Any) -> str:
    """Port of Gridlock clockOf(); accepts '7:00 AM' as well as '07:00'."""
    m = re.match(
        r"^\s*(\d{1,2})(?::?(\d{2}))?\s*([ap])?\.?\s*m?\.?\s*$",
        str(text or ""),
        re.I,
    )
    if not m:
        return ""
    h = int(m.group(1))
    mm = 0 if m.group(2) is None else int(m.group(2))
    ap = (m.group(3) or "").lower()
    if mm > 59:
        return ""
    if ap:
        if h < 1 or h > 12:
            return ""
        h = (h % 12) + (12 if ap == "p" else 0)
    elif h > 23:
        return ""
    return f"{h:02d}:{mm:02d}"


def _pick(obj: dict[str, Any] | None, keys: list[str]) -> dict[str, Any]:
    obj = obj or {}
    return {k: obj[k] for k in keys if k in obj}


def public_directory(data: dict[str, Any]) -> dict[str, Any]:
    wc = data["world_cup_2026"]
    event = _pick(wc.get("event") or {}, PUBLIC["event"])
    if isinstance(event.get("related_events"), list):
        event["related_events"] = [
            _pick(r, PUBLIC["related_events"]) for r in event["related_events"]
        ]
    divisions = [_pick(d, PUBLIC["divisions"]) for d in wc["divisions"]]
    entries = [_pick(e, PUBLIC["entries"]) for e in wc["entries"]]
    locations = [_pick(loc, PUBLIC["locations"]) for loc in wc["team_locations"]]
    return {
        "event": event,
        "retrieved_at": wc.get("retrieved_at"),
        "divisions": divisions,
        "entries": entries,
        "locations": locations,
        "coverage": {
            "event_entries": len(entries),
            "distinct_team_ids": len({e.get("team_id") for e in entries}),
            "divisions": len(divisions),
            "divisions_with_entries": sum(1 for d in divisions if (d.get("listed_count") or 0) > 0),
        },
    }


def _bracket_g(round_val: Any) -> str:
    m = re.search(r"\b([A-D])\s*Prelims?\b", str(round_val or ""), re.I)
    return m.group(1).upper() if m else ""


def _field_pit(field: Any, pit: Any) -> str:
    parts = []
    if field:
        parts.append(str(field).strip())
    if pit not in (None, ""):
        parts.append(f"Pit {pit}")
    return " · ".join(parts)


def to_season_game(row: dict[str, Any]) -> dict[str, Any] | None:
    """One schedule.json game → a Gridlock S.games row, or None if no two sides."""
    h = (row.get("home_name") or "").strip() or (row.get("home_slot_label") or "").strip()
    a = (row.get("away_name") or "").strip() or (row.get("away_slot_label") or "").strip()
    t = clock_of(row.get("time"))
    d = row.get("date") or ""
    if not h or not a or not t or not d:
        return None
    out: dict[str, Any] = {
        "id": "imp:" + str(row.get("game_id") or ""),
        "d": d,
        "t": t,
        "h": h[:40],
        "a": a[:40],
        "g": _bracket_g(row.get("round")),
        "f": _field_pit(row.get("field"), row.get("pit")),
        "dv": row.get("division") or "",
        "layout": WC_LAYOUT,
    }
    # Extra scalars the validator allows; the current UI does not read them.
    if row.get("score"):
        out["score"] = row["score"]
    if row.get("status"):
        out["status"] = row["status"]
    if not row.get("home_name") or not row.get("away_name"):
        out["slot"] = True
    # Keep published ids alongside, as extra scalars, for joins — the app ignores them.
    if row.get("game_id"):
        out["srcId"] = str(row["game_id"])
    return out


def seed_keys(seed_path: Path) -> set[tuple[str, str, str, str]]:
    rows = json.loads(seed_path.read_text(encoding="utf-8"))
    return {(g["d"], g["t"], fold_name(g["h"]), fold_name(g["a"])) for g in rows}


def season_games(data: dict[str, Any], seed_path: Path) -> dict[str, Any]:
    skipped: list[dict[str, Any]] = []
    all_rows: list[dict[str, Any]] = []
    for g in data["world_cup_2026"]["games"]:
        row = to_season_game(g)
        if row is None:
            skipped.append({
                "game_id": g.get("game_id"),
                "date": g.get("date"),
                "time": g.get("time"),
                "home_name": g.get("home_name"),
                "away_name": g.get("away_name"),
                "home_slot_label": g.get("home_slot_label"),
                "away_slot_label": g.get("away_slot_label"),
                "reason": "missing two team names/slots or a parseable clock",
            })
            continue
        all_rows.append(row)
    keys = seed_keys(seed_path)
    not_seed = [
        g for g in all_rows
        if (g["d"], g["t"], fold_name(g["h"]), fold_name(g["a"])) not in keys
    ]
    overlapped = len(all_rows) - len(not_seed)
    return {
        "all": all_rows,
        "not_in_app_seed": not_seed,
        "skipped": skipped,
        "app_seed_rows": len(keys),
        "overlap_with_app_seed": overlapped,
    }


def lso_tendencies_as_scout(data: dict[str, Any]) -> dict[str, Any]:
    """Suggested scout.player patches. Not a loadable season copy."""
    book: dict[str, Any] = {}
    for t in data["lone_star_open_2026"]["tendencies"]:
        team = (t.get("team") or "").strip()
        name = (t.get("player") or "").strip()
        if not team or not name:
            continue
        note_bits = [
            ("preferred bunker: " + t["preferredBunker"]) if t.get("preferredBunker") else "",
            ("usual out: " + t["usualOut"]) if t.get("usualOut") else "",
            ("usual kill: " + t["usualKill"]) if t.get("usualKill") else "",
            ("late point: " + t["latePointClutch"]) if t.get("latePointClutch") else "",
            t.get("notes") or "",
            ("source: " + t["sourceGames"]) if t.get("sourceGames") else "",
            ("confidence: " + t["confidence"]) if t.get("confidence") else "",
        ]
        player = {
            "name": name,
            "num": t.get("jersey") or "",
            "wire": t.get("roleLane") or "",
            "note": " · ".join(b for b in note_bits if b),
        }
        prof = book.setdefault(team, {"notes": "LSO film tendencies (suggested only; not auto-merged).", "players": []})
        prof["players"].append(player)
    return book


def lso_elim_gaps(data: dict[str, Any]) -> dict[str, Any]:
    rows = data["lone_star_open_2026"]["elims"]
    unknown = sum(1 for e in rows if str(e.get("player") or e.get("playerOut") or "").strip().lower() in ("", "unknown"))
    verify = sum(1 for e in rows if e.get("verify_flag"))
    return {
        "count": len(rows),
        "unknown_player": unknown,
        "verify_flag_true": verify,
        "note": (
            "LSO elims are film rows, not Gridlock tally outs. Missing side, match id (m), "
            "layout, script, and epoch at. See MAPPING.md §5. Not written into a season copy."
        ),
    }


def season_copy_games(games: list[dict[str, Any]], at_iso: str) -> dict[str, Any]:
    return {
        "format": "gridlock.coach.copy",
        "v": 1,
        "app": "Gridlock Coach",
        "at": at_iso,
        "data": {"games": games},
    }


def export_matched(data: dict[str, Any], root: Path) -> dict[str, Any]:
    tools = Path(__file__).resolve().parent
    seed_path = tools / "gridlock-app-schedule-seed.json"
    out_json = root / "export" / "gridlock-matched.json"
    csv_dir = root / "export" / "gridlock-csv"
    evd_path = root / "export" / "gridlock" / "event-data.json"
    copy_path = root / "export" / "gridlock" / "season-copy-games.json"
    evd_path.parent.mkdir(parents=True, exist_ok=True)
    csv_dir.mkdir(parents=True, exist_ok=True)

    pub = public_directory(data)
    games = season_games(data, seed_path)
    now = datetime.now(ET)
    at_iso = now.isoformat()
    copy = season_copy_games(games["not_in_app_seed"], at_iso)
    copy_path.write_text(json.dumps(copy, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    packer = tools / "worldcup_pack.py"
    evd_info: dict[str, Any] = {"path": str(evd_path.relative_to(root))}
    if evd_path.exists():
        evd_info["bytes"] = evd_path.stat().st_size
        evd_info["kind"] = "gridlock.event.data"
        evd_info["v"] = 1
        evd_info["note"] = "Already packed. Re-run tools/worldcup_pack.py to refresh."
    elif packer.exists():
        proc = subprocess.run(
            [sys.executable, "-I", str(packer), str(root / "world-cup-2026"), str(evd_path)],
            check=True, capture_output=True, text=True,
        )
        evd_info["packer_stdout"] = proc.stdout.strip()
        evd_info["bytes"] = evd_path.stat().st_size

    scout_sugg = lso_tendencies_as_scout(data)
    elim_gaps = lso_elim_gaps(data)

    written = {
        "event": _write_csv(csv_dir / "event.csv", [pub["event"]]),
        "divisions": _write_csv(csv_dir / "divisions.csv", pub["divisions"]),
        "entries": _write_csv(csv_dir / "entries.csv", pub["entries"]),
        "locations": _write_csv(csv_dir / "locations.csv", pub["locations"]),
        "games": _write_csv(csv_dir / "games.csv", games["all"]),
        "games_not_in_app_seed": _write_csv(csv_dir / "games-not-in-app-seed.csv", games["not_in_app_seed"]),
        "games_skipped": _write_csv(csv_dir / "games-skipped.csv", games["skipped"]),
        "lso_scout_players_suggested": _write_csv(
            csv_dir / "lso-scout-players-suggested.csv",
            [
                {"team": team, **p}
                for team, prof in scout_sugg.items()
                for p in prof["players"]
            ],
        ),
    }

    matched = {
        "meta": {
            "handoff": "gridlock-handoff",
            "shape": "gridlock-matched",
            "built_at": at_iso,
            "timezone": "America/New_York",
            "app": {
                "name": "Gridlock Coach",
                "url": "https://app.gridlockpb.com/",
                "repo": "https://github.com/rwood34683/Gridlock-",
                "season_format": "gridlock.coach.copy",
                "event_data_kind": "gridlock.event.data",
                "world_cup_layout": WC_LAYOUT,
                "storage_key": "gridlock.coach.v2",
            },
            "mapping": "MAPPING.md",
            "how_to_load": {
                "public_directory": (
                    "world-cup-2026/teams.json + team_locations.json are already in the "
                    "importer's shape. In the Gridlock repo: "
                    "node scripts/import-world-cup.js world-cup-2026"
                ),
                "event_data": (
                    "On a phone: More › Account & backups › Event data, choose "
                    "export/gridlock/event-data.json. Do not commit that file to the app repo."
                ),
                "games": (
                    "Import export/gridlock/season-copy-games.json as a Gridlock season copy "
                    "(data.games only, rows that are not already in the app's 78-row Pro seed). "
                    "Or paste from export/gridlock-csv/games-not-in-app-seed.csv. "
                    "Replacing SCHEDULE.games in the app source is a separate change and was not done."
                ),
                "scout_tally": (
                    "Live Scout and Tally rows are logged in the app; this pack does not mint them. "
                    "LSO tendencies are suggested scout.player patches only (see lso_scout_suggested)."
                ),
            },
            "counts": {
                **data["meta"]["counts"],
                "public_divisions": len(pub["divisions"]),
                "public_entries": len(pub["entries"]),
                "public_locations": len(pub["locations"]),
                "games_shaped": len(games["all"]),
                "games_not_in_app_seed": len(games["not_in_app_seed"]),
                "games_skipped": len(games["skipped"]),
                "games_overlap_with_app_seed": games["overlap_with_app_seed"],
                "app_seed_rows": games["app_seed_rows"],
                "event_data_bytes": evd_info.get("bytes"),
                "lso_scout_teams_suggested": len(scout_sugg),
            },
        },
        "public_directory": pub,
        "games": {
            "all": games["all"],
            "not_in_app_seed": games["not_in_app_seed"],
            "skipped": games["skipped"],
            "overlap_with_app_seed": games["overlap_with_app_seed"],
            "app_seed_rows": games["app_seed_rows"],
        },
        "event_data_file": evd_info,
        "season_copy_games_file": str(copy_path.relative_to(root)),
        "lso_scout_suggested": scout_sugg,
        "lso_elims_gap": elim_gaps,
        "csv": {k: f"export/gridlock-csv/{p}" for k, p in {
            "event": "event.csv", "divisions": "divisions.csv", "entries": "entries.csv",
            "locations": "locations.csv", "games": "games.csv",
            "games_not_in_app_seed": "games-not-in-app-seed.csv",
            "games_skipped": "games-skipped.csv",
            "lso_scout_players_suggested": "lso-scout-players-suggested.csv",
        }.items()},
    }
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(matched, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return {
        "json_path": str(out_json),
        "json_bytes": out_json.stat().st_size,
        "csv_rows": written,
        "event_data_bytes": evd_info.get("bytes"),
        "season_copy": str(copy_path),
        "counts": matched["meta"]["counts"],
    }


if __name__ == "__main__":
    raise SystemExit("Run tools/gridlock_adapter.py (it calls export_matched).")

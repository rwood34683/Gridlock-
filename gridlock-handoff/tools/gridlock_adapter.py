#!/usr/bin/env python3
"""Load the paintball handoff into one in-memory structure and export JSON/CSVs.

Dependency-free (Python 3.10+). Intended for Gridlock / Scout / Tally (Claude web
or Codex desktop): inspect Gridlock's own models first, edit the MAP section to
rename our fields to yours, then run this script or import `load_handoff()`.

Usage (from this folder or any cwd):

    python3 tools/gridlock_adapter.py
    python3 tools/gridlock_adapter.py --root /path/to/gridlock-handoff
    python3 tools/gridlock_adapter.py --export-json export/gridlock-import.json --export-csv export/csv

Field names in FIELD_MAP are Gridlock Coach's real names (see MAPPING.md).
Transforms (clock, field·pit, event-data packing, seed de-dupe) live in
tools/gridlock_match.py and are applied when writing export/gridlock-matched.json.

This script does not invent jersey numbers, hometowns, sides, match ids, or tally outs.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

# =============================================================================
# MAP
# Our dotted field -> Gridlock Coach field, taken from the public repo
# rwood34683/Gridlock- (web/index.html, import-world-cup.js, worldcup_pack.py).
# See MAPPING.md for transforms, load paths, and gaps. Values are destination
# names only; clock / packing / seed de-dupe run in tools/gridlock_match.py.
# Do not invent values for unmapped fields.
# =============================================================================
FIELD_MAP: dict[str, str] = {
    # Season schedule games (S.games / SCHEDULE.games). Transforms in gridlock_match.py:
    # time -> t via clockOf; field+pit -> f; division -> dv; layout = nwc; id = imp:{game_id}.
    "wc.games.date": "d",
    "wc.games.time": "t",
    "wc.games.home_name": "h",
    "wc.games.away_name": "a",
    "wc.games.field": "f",          # combined with pit as "Field · Pit N"
    "wc.games.pit": "f",
    "wc.games.division": "dv",
    "wc.games.round": "g",          # only A-D prelim groups; else ""
    "wc.games.game_id": "id",       # emitted as imp:{game_id}; also srcId scalar
    "wc.games.score": "score",      # extra scalar; current UI does not read it
    "wc.games.status": "status",    # extra scalar; current UI does not read it
    # Public directory (import-world-cup.js PUBLIC) — identity names
    "wc.event.name": "name",
    "wc.event.year": "year",
    "wc.event.event_id": "event_id",
    "wc.event.start_date": "start_date",
    "wc.event.end_date": "end_date",
    "wc.event.timezone": "timezone",
    "wc.event.source_urls": "source_urls",
    "wc.event.related_events": "related_events",
    "wc.event.practice_event_excluded": "practice_event_excluded",
    "wc.divisions.event_id": "event_id",
    "wc.divisions.division_id": "division_id",
    "wc.divisions.name": "name",
    "wc.divisions.group": "group",
    "wc.divisions.classification": "classification",
    "wc.divisions.signed_up": "signed_up",
    "wc.divisions.limit": "limit",
    "wc.divisions.format_rules": "format_rules",
    "wc.divisions.listed_count": "listed_count",
    "wc.divisions.source_url": "source_url",
    "wc.divisions.retrieved_at": "retrieved_at",
    "wc.entries.event_id": "event_id",
    "wc.entries.division_id": "division_id",
    "wc.entries.division": "division",
    "wc.entries.format": "format",
    "wc.entries.format_rules": "format_rules",
    "wc.entries.bracket": "bracket",
    "wc.entries.team_name": "team_name",
    "wc.entries.team_id": "team_id",
    "wc.entries.entry_id": "entry_id",
    "wc.entries.registration_status": "registration_status",
    "wc.entries.source_url": "source_url",
    "wc.entries.retrieved_at": "retrieved_at",
    "wc.locations.entry_id": "entry_id",
    "wc.locations.team_id": "team_id",
    "wc.locations.hometown_raw": "hometown_raw",
    "wc.locations.hometown_city": "hometown_city",
    "wc.locations.hometown_region": "hometown_region",
    "wc.locations.hometown_country": "hometown_country",
    "wc.locations.home_field_name": "home_field_name",
    "wc.locations.home_field_location_raw": "home_field_location_raw",
    "wc.locations.location_status": "location_status",
    "wc.locations.retrieved_at": "retrieved_at",
    # Event data (gridlock.event.data) packed names — tools/worldcup_pack.py
    "wc.rosters.entry_id": "entry_id",
    "wc.rosters.members.person_id": "pid",
    "wc.rosters.members.name": "name",
    "wc.rosters.members.role": "role",
    "wc.rosters.members.classification": "cls",
    "wc.rosters.members.checked_in": "inn",
    "wc.people.person_id": "id",
    "wc.people.name": "name",
    "wc.people.is_current_event_player": "player",
    # LSO film — suggested only, not a Gridlock import (see MAPPING.md §5)
    "lso.elims.point": "pt",
    "lso.elims.player": "name",
    "lso.elims.team": "vs",
    "lso.elims.how": "how",
    "lso.elims.where": "bunker",
    "lso.elims.match": "match_label",
    "lso.tendencies.player": "name",
    "lso.tendencies.team": "scout_key",
    "lso.tendencies.jersey": "num",
    "lso.tendencies.roleLane": "wire",
    "lso.tendencies.notes": "note",
}

# Our field names that exist on exported rows but are not in FIELD_MAP.
# They still go out under our names and are listed in unmapped-fields.json.
# =============================================================================
# END MAP
# =============================================================================

ET = ZoneInfo("America/New_York")


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _parse_jersey_md(text: str) -> list[dict[str, Any]]:
    """Parse rosters-numbers.md. Numbers come from 2026 NXL Pro match-stat pages, not LSO/WC rosters."""
    rows: list[dict[str, Any]] = []
    team = None
    event_scope = "2026 NXL Pro match-stat numbers (Tampa Bay Open 9198 / Mid-Atlantic Open 9319); names also listed for LSO 9321 Pro"
    for line in text.splitlines():
        if line.startswith("### ") and "Coverage" not in line and "Caveat" not in line:
            team = line[4:].strip()
            continue
        m = re.match(r"^- (no #|#\d+)\s+(.+?)(?:\s+\*(.+?)\*)?\s*$", line)
        if not m or not team:
            continue
        num, name, note = m.group(1), m.group(2).strip(), (m.group(3) or "").strip()
        rows.append({
            "team": team,
            "player": name,
            "jersey": None if num == "no #" else num,
            "has_number": num != "no #",
            "note": note,
            "source": event_scope,
            "caveat": (
                "Jersey numbers are not published on LSO Pro or World Cup 2026 rosters "
                "(all WC jersey_number values are null). These numbers were read from "
                "public 2026 NXL Pro match-stat pages only. Nothing was guessed."
            ),
        })
    return rows


def _parse_coaches_md(text: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    event = ""
    division = ""
    for line in text.splitlines():
        if line.startswith("## "):
            event = line[3:].strip()
            division = ""
            continue
        if line.startswith("### "):
            division = line[4:].strip()
            continue
        m = re.match(r"^- ([^:]+):\s*(.+)$", line)
        if m and division:
            rows.append({
                "event": event,
                "division": division,
                "team": m.group(1).strip(),
                "coaches": m.group(2).strip(),
            })
    return rows


def load_handoff(root: Path) -> dict[str, Any]:
    """Load every structured dataset in the handoff folder."""
    root = root.resolve()
    wc = root / "world-cup-2026"
    lso = root / "lone-star-open-2026"
    shared = root / "shared"

    teams_doc = _load_json(wc / "teams.json")
    rosters_doc = _load_json(wc / "rosters.json")
    people_doc = _load_json(wc / "people.json")
    schedule_doc = _load_json(wc / "schedule.json")
    locations_doc = _load_json(wc / "team_locations.json")
    history_doc = _load_json(wc / "person_event_history.json")
    profiles_doc = _load_json(wc / "player_profiles.json")
    coverage = _load_json(wc / "coverage-audit.json")
    sources = _load_json(wc / "sources.json")

    elims_doc = _load_json(lso / "elims.json")
    tendencies_doc = _load_json(lso / "tendencies.json")
    field_doc = _load_json(lso / "tendencies-sat-set6-field-layout.json")
    allowlist = _load_json(lso / "rosters" / "pro-allowlist.json")

    contacts: list[dict[str, str]] = []
    with (shared / "pro-team-contacts.csv").open(newline="", encoding="utf-8") as f:
        contacts = list(csv.DictReader(f))
    jersey_rows = _parse_jersey_md((shared / "rosters-numbers.md").read_text(encoding="utf-8"))
    coach_rows = _parse_coaches_md((shared / "coaches.md").read_text(encoding="utf-8"))

    now = datetime.now(ET)
    data = {
        "meta": {
            "handoff": "gridlock-handoff",
            "built_for": "Gridlock Scout and Tally (and Gridlock overall)",
            "timezone": "America/New_York",
            "loaded_at": now.isoformat(),
            "root": str(root),
            "note": (
                "As-is data handoff. Map into Gridlock's existing models. "
                "A proposed tally schema lives under optional/ and is reference only. "
                "Do not invent jersey numbers, hometowns, or scout/tally events."
            ),
            "join_paths": {
                "wc_division_to_person": "divisions.division_id -> event_entries.division_id; event_entries.entry_id -> rosters.entry_id -> members.person_id -> people.person_id",
                "wc_game_to_entry": "games.home_entry_id / games.away_entry_id -> event_entries.entry_id (null when home_slot_label / away_slot_label is a playoff placeholder)",
                "wc_game_to_roster": "entry_id -> rosters.json / roster_memberships",
                "lso_elim_to_player_team_match": "elims.match + elims.player + elims.team/jersey; tendencie.s sourceGames may name the same match",
            },
            "counts": {},
        },
        "world_cup_2026": {
            "event": teams_doc.get("event"),
            "retrieved_at": teams_doc.get("retrieved_at"),
            "schedule_retrieved_at": schedule_doc.get("retrieved_at"),
            "schedule_resolution": schedule_doc.get("resolution"),
            "schedule_unresolved": schedule_doc.get("unresolved"),
            "coverage_audit_overall": coverage.get("overall"),
            "coverage_player_history_statuses": coverage.get("player_history_statuses"),
            "divisions": teams_doc.get("divisions") or [],
            "entries": teams_doc.get("teams") or [],
            "rosters": rosters_doc.get("rosters") or [],
            "people": people_doc.get("people") or [],
            "games": schedule_doc.get("games") or [],
            "team_locations": locations_doc.get("observations") or locations_doc,
            "person_event_history": history_doc.get("observations") or [],
            "player_profiles": profiles_doc.get("profiles") or [],
            "sources": sources if isinstance(sources, list) else sources,
            "files": {
                "sqlite": "world-cup-2026/world-cup-2026.sqlite",
                "schema": "world-cup-2026/schema.sql",
                "schedule_xlsx": "world-cup-2026/schedule/world-cup-2026-schedule.xlsx",
                "schedule_csv": "world-cup-2026/schedule/world-cup-2026-schedule.csv",
                "start_here": "world-cup-2026/GRIDLOCK-START-HERE.md",
            },
        },
        "lone_star_open_2026": {
            "event": {"name": "Lone Star Open 2026", "event_id": "9321", "division_focus": "Pro (plus a few D1 / Semi-Pro rows on the Elim Page)"},
            "elims_meta": elims_doc.get("meta"),
            "elims": elims_doc.get("elims") or [],
            "elim_page_players": elims_doc.get("players_on_page") or [],
            "tendencies_meta": {k: tendencies_doc[k] for k in tendencies_doc if k != "tendencies"},
            "tendencies": tendencies_doc.get("tendencies") or [],
            "field_layout": field_doc,
            "pro_allowlist": allowlist,
        },
        "shared": {
            "jersey_numbers": jersey_rows,
            "jersey_numbers_caveat": (
                "No World Cup 2026 jersey numbers are published. LSO Pro roster pages also have jersey: null. "
                "shared/rosters-numbers.md lists # values only where 2026 NXL Pro match-stat pages printed them."
            ),
            "pro_team_contacts": contacts,
            "coaches": coach_rows,
        },
    }

    data["meta"]["counts"] = {
        "wc_divisions": len(data["world_cup_2026"]["divisions"]),
        "wc_entries": len(data["world_cup_2026"]["entries"]),
        "wc_distinct_team_ids": len({e.get("team_id") for e in data["world_cup_2026"]["entries"]}),
        "wc_rosters": len(data["world_cup_2026"]["rosters"]),
        "wc_people": len(data["world_cup_2026"]["people"]),
        "wc_games": len(data["world_cup_2026"]["games"]),
        "wc_history_observations": len(data["world_cup_2026"]["person_event_history"]),
        "wc_player_profiles": len(data["world_cup_2026"]["player_profiles"]),
        "wc_sources": len(data["world_cup_2026"]["sources"]) if isinstance(data["world_cup_2026"]["sources"], list) else None,
        "lso_elims": len(data["lone_star_open_2026"]["elims"]),
        "lso_elim_page_players": len(data["lone_star_open_2026"]["elim_page_players"]),
        "lso_tendencies": len(data["lone_star_open_2026"]["tendencies"]),
        "lso_field_layout_teams": len((field_doc.get("teams") or [])),
        "lso_pro_allowlist_teams": len(allowlist) if isinstance(allowlist, dict) else None,
        "shared_jersey_number_rows": len(jersey_rows),
        "shared_contacts_rows": len(contacts),
        "shared_coach_rows": len(coach_rows),
    }
    return data


def _rename(entity_prefix: str, row: dict[str, Any], used: set[str], *, apply_map: bool = False) -> dict[str, Any]:
    """Optionally apply FIELD_MAP. The as-is dump keeps our names (apply_map=False)."""
    out: dict[str, Any] = {}
    for k, v in row.items():
        our = f"{entity_prefix}.{k}"
        if our in FIELD_MAP:
            used.add(our)
        their = FIELD_MAP.get(our, k) if apply_map else k
        out[their] = v
    return out


def unmapped_report(data: dict[str, Any]) -> dict[str, Any]:
    """Compare FIELD_MAP coverage against fields actually present on export rows."""
    mapped = set(FIELD_MAP)
    present: set[str] = set()

    def add(prefix: str, rows: list[dict[str, Any]], n: int = 25) -> None:
        keys: set[str] = set()
        for row in rows[:n]:
            if isinstance(row, dict):
                keys.update(row.keys())
        for k in keys:
            present.add(f"{prefix}.{k}")

    add("wc.games", data["world_cup_2026"]["games"])
    add("wc.entries", data["world_cup_2026"]["entries"])
    add("wc.people", data["world_cup_2026"]["people"])
    add("lso.elims", data["lone_star_open_2026"]["elims"])
    add("lso.tendencies", data["lone_star_open_2026"]["tendencies"])
    if data["world_cup_2026"]["rosters"]:
        add("wc.rosters", data["world_cup_2026"]["rosters"])
        members = data["world_cup_2026"]["rosters"][0].get("members") or []
        add("wc.rosters.members", members)

    return {
        "note": (
            "FIELD_MAP names Gridlock Coach fields (MAPPING.md). The as-is dump "
            "in gridlock-import.json still uses our names. Matched files use the "
            "Gridlock shape. Unmapped source fields are listed here; do not invent values."
        ),
        "mapped_keys": sorted(mapped),
        "present_unmapped": sorted(present - mapped),
        "mapped_but_not_seen_on_sample_rows": sorted(mapped - present),
    }


def _write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str] | None = None) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return 0
    flat: list[dict[str, Any]] = []
    for row in rows:
        item = {}
        for k, v in row.items():
            if isinstance(v, (list, dict)):
                item[k] = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
            elif v is None:
                item[k] = ""
            else:
                item[k] = v
        flat.append(item)
    names = fieldnames or list(flat[0].keys())
    # union of keys, prefer stated order then leftovers
    extra = [k for r in flat for k in r.keys() if k not in names]
    # unique extras
    seen = set(names)
    for k in extra:
        if k not in seen:
            names.append(k)
            seen.add(k)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=names, extrasaction="ignore")
        w.writeheader()
        for row in flat:
            w.writerow({k: row.get(k, "") for k in names})
    return len(flat)


def export_handoff(data: dict[str, Any], json_path: Path, csv_dir: Path) -> dict[str, Any]:
    used: set[str] = set()
    games = [_rename("wc.games", g, used) for g in data["world_cup_2026"]["games"]]
    entries = [_rename("wc.entries", e, used) for e in data["world_cup_2026"]["entries"]]
    # people: flatten a useful subset plus keep full object in the combined JSON
    people_rows = []
    for p in data["world_cup_2026"]["people"]:
        people_rows.append(_rename("wc.people", {
            "person_id": p.get("person_id"),
            "name": p.get("name"),
            "is_current_event_player": p.get("is_current_event_player"),
            "current_roles": p.get("current_roles"),
            "current_entry_ids": p.get("current_entry_ids"),
            "hometown": p.get("hometown"),
        }, used))
    memberships = []
    for rost in data["world_cup_2026"]["rosters"]:
        for m in rost.get("members") or []:
            memberships.append(_rename("wc.rosters.members", {
                "entry_id": rost.get("entry_id"),
                "team_id": rost.get("team_id"),
                "team_name": rost.get("team_name"),
                "division_id": rost.get("division_id"),
                "division": rost.get("division"),
                "person_id": m.get("person_id"),
                "name": m.get("name"),
                "role": m.get("role"),
                "jersey_number": m.get("jersey_number"),
                "classification": m.get("classification"),
                "checked_in": m.get("checked_in"),
            }, used))
    elims = [_rename("lso.elims", e, used) for e in data["lone_star_open_2026"]["elims"]]
    tendencies = [_rename("lso.tendencies", t, used) for t in data["lone_star_open_2026"]["tendencies"]]

    csv_dir.mkdir(parents=True, exist_ok=True)
    written = {
        "wc_games": _write_csv(csv_dir / "wc-games.csv", games),
        "wc_divisions": _write_csv(csv_dir / "wc-divisions.csv", data["world_cup_2026"]["divisions"]),
        "wc_entries": _write_csv(csv_dir / "wc-entries.csv", entries),
        "wc_people": _write_csv(csv_dir / "wc-people.csv", people_rows),
        "wc_roster_memberships": _write_csv(csv_dir / "wc-roster-memberships.csv", memberships),
        "lso_elims": _write_csv(csv_dir / "lso-elims.csv", elims),
        "lso_tendencies": _write_csv(csv_dir / "lso-tendencies.csv", tendencies),
        "lso_elim_page_players": _write_csv(csv_dir / "lso-elim-page-players.csv", data["lone_star_open_2026"]["elim_page_players"]),
        "shared_jersey_numbers": _write_csv(csv_dir / "shared-jersey-numbers.csv", data["shared"]["jersey_numbers"]),
        "shared_contacts": _write_csv(csv_dir / "shared-pro-team-contacts.csv", data["shared"]["pro_team_contacts"]),
        "shared_coaches": _write_csv(csv_dir / "shared-coaches.csv", data["shared"]["coaches"]),
    }

    combined = {
        "meta": data["meta"],
        "field_map": FIELD_MAP,
        "world_cup_2026": {
            "event": data["world_cup_2026"]["event"],
            "retrieved_at": data["world_cup_2026"]["retrieved_at"],
            "schedule_retrieved_at": data["world_cup_2026"]["schedule_retrieved_at"],
            "schedule_resolution": data["world_cup_2026"]["schedule_resolution"],
            "schedule_unresolved": data["world_cup_2026"]["schedule_unresolved"],
            "coverage_audit_overall": data["world_cup_2026"]["coverage_audit_overall"],
            "coverage_player_history_statuses": data["world_cup_2026"]["coverage_player_history_statuses"],
            "divisions": data["world_cup_2026"]["divisions"],
            "entries": data["world_cup_2026"]["entries"],
            "rosters": data["world_cup_2026"]["rosters"],
            "people": data["world_cup_2026"]["people"],
            "games": games,
            "team_locations": data["world_cup_2026"]["team_locations"],
            "person_event_history": data["world_cup_2026"]["person_event_history"],
            "player_profiles": data["world_cup_2026"]["player_profiles"],
            "sources": data["world_cup_2026"]["sources"],
            "files": data["world_cup_2026"]["files"],
        },
        "lone_star_open_2026": {
            "event": data["lone_star_open_2026"]["event"],
            "elims_meta": data["lone_star_open_2026"]["elims_meta"],
            "elims": elims,
            "elim_page_players": data["lone_star_open_2026"]["elim_page_players"],
            "tendencies_meta": data["lone_star_open_2026"]["tendencies_meta"],
            "tendencies": tendencies,
            "field_layout": data["lone_star_open_2026"]["field_layout"],
            "pro_allowlist": data["lone_star_open_2026"]["pro_allowlist"],
        },
        "shared": data["shared"],
    }

    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(combined, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    report = unmapped_report(data)
    report_path = json_path.parent / "unmapped-fields.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return {
        "json_path": str(json_path),
        "json_bytes": json_path.stat().st_size,
        "csv_rows": written,
        "unmapped_report": str(report_path),
        "unmapped_count": len(report["present_unmapped"]),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Load the paintball Gridlock handoff and export combined JSON/CSVs.")
    parser.add_argument("--root", type=Path, default=None, help="Handoff folder (default: parent of tools/)")
    parser.add_argument("--export-json", type=Path, default=None)
    parser.add_argument("--export-csv", type=Path, default=None)
    args = parser.parse_args(argv)
    root = (args.root or Path(__file__).resolve().parent.parent).resolve()
    if not (root / "world-cup-2026" / "teams.json").exists():
        print(f"error: {root} does not look like the handoff folder (missing world-cup-2026/teams.json)", file=sys.stderr)
        return 2
    data = load_handoff(root)
    json_path = args.export_json or (root / "export" / "gridlock-import.json")
    csv_dir = args.export_csv or (root / "export" / "csv")
    result = export_handoff(data, json_path, csv_dir)
    print("loaded", json.dumps(data["meta"]["counts"], indent=2))
    print("wrote", result["json_path"], f"({result['json_bytes']} bytes)")
    print("csv rows", json.dumps(result["csv_rows"], indent=2))
    print("unmapped field report", result["unmapped_report"], "count", result["unmapped_count"])
    # Matched-to-app export (Gridlock's real shape)
    from gridlock_match import export_matched
    matched = export_matched(data, root)
    print("matched", matched["json_path"], f"({matched['json_bytes']} bytes)")
    print("matched csv rows", json.dumps(matched["csv_rows"], indent=2))
    print("event-data bytes", matched.get("event_data_bytes"))
    print("season copy", matched["season_copy"])
    print("matched counts", json.dumps(matched["counts"], indent=2))
    # sanity
    assert data["meta"]["counts"]["wc_games"] > 0
    assert data["meta"]["counts"]["lso_elims"] > 0
    assert matched["counts"]["games_shaped"] > 0
    print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

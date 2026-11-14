#!/usr/bin/env python3
"""Build an index-preserving, chunked DATA block for the Live Schedule Page.

Keeps existing F/D/T/R/S index order (append-only), maps a few source division
labels onto the names already on the Page, and emits G1–Gn plus optional
TEAM_GROUP and ROSTER_PLAYERS constants (outside DATA-START/END).

Does not invent jersey numbers. Does not talk to the Page by itself — the
caller pastes or EditCanvas-replaces the DATA block.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
HANDOFF = HERE.parent
PAGE_SOURCE_CANDIDATES = [
    Path("/cursor/stores/user/canvases/eafed6f7-274c-4d12-a17a-d94d41ab6183/source.canvas.tsx"),
    HERE / "world-cup-2026-live-schedule.canvas.tsx",
]
CHUNK = 122
# Source pull name -> name already interned on the Page (do not reshuffle D).
DIV_ALIASES = {
    "Classic Mounds 5v5": "Mounds - Open 5v5",
    "WNXL Amateur 5v5": "Female - WNXL Amateur 5v5",
}
ROW_TYPE = "Array<[number, string, string, string, number, number, number, number, number, number, string, number]>"

from standings_brackets import is_slot  # noqa: E402


def parse_ts_array(src: str, name: str) -> list:
    m = re.search(rf"const {name}(?:\s*:\s*[^=\n]+)?\s*=\s*(\[[\s\S]*?\]);", src)
    if not m:
        raise SystemExit(f"could not find const {name}")
    return json.loads(m.group(1))


def parse_existing_page(src: str) -> dict:
    start = src.index("// DATA-START")
    end = src.index("// DATA-END") + len("// DATA-END")
    block = src[start:end]
    pulled = re.search(r'const PULLED_AT = ("[^"]*");', block)
    F = parse_ts_array(block, "F")
    D = parse_ts_array(block, "D")
    T = parse_ts_array(block, "T")
    R = parse_ts_array(block, "R")
    S = parse_ts_array(block, "S")
    games = []
    for m in re.finditer(r"const G\d+[^[]*(Array<\[[^\]]+\]>)?\s*=\s*(\[[\s\S]*?\]);", block):
        games.extend(json.loads(m.group(2)))
    if not games:
        raise SystemExit("no G chunks in page DATA")
    roster = {}
    rm = re.search(r"const ROSTER_COUNTS(?:\s*:\s*[^=\n]+)?\s*=\s*(\{[\s\S]*?\});", block)
    if rm:
        roster = json.loads(rm.group(1))
    return {
        "pulled_at": json.loads(pulled.group(1)) if pulled else "",
        "F": F, "D": D, "T": T, "R": R, "S": S,
        "games": games, "roster": roster,
        "span": (start, end), "source": src,
    }


def intern(arr: list, val) -> int:
    if val not in arr:
        arr.append(val)
    return arr.index(val)


def js_string_array(name: str, arr: list, typ: str | None = None) -> str:
    dumped = json.dumps(arr, ensure_ascii=False, separators=(",", ":"))
    # wrap T (long) into ~8-item lines for readability
    if name == "T":
        items = [json.dumps(x, ensure_ascii=False) for x in arr]
        lines = ["const T = ["]
        for i in range(0, len(items), 8):
            chunk = ",".join(items[i:i + 8])
            comma = "," if i + 8 < len(items) else ""
            lines.append(chunk + comma)
        lines.append("];")
        return "\n".join(lines)
    anno = f": {typ} " if typ else " "
    return f"const {name}{anno}= {dumped};"


def js_games_chunks(rows: list[list]) -> str:
    parts = []
    nchunks = (len(rows) + CHUNK - 1) // CHUNK
    names = []
    for i in range(nchunks):
        chunk = rows[i * CHUNK:(i + 1) * CHUNK]
        name = f"G{i + 1}"
        names.append(name)
        body = ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in chunk)
        parts.append(f"const {name}: {ROW_TYPE} = [\n{body},\n];")
    parts.append("const GAMES = [..." + ", ...".join(names) + "];")
    return "\n".join(parts)


def page_division(src_div: str, D: list[str]) -> str:
    if src_div in DIV_ALIASES and DIV_ALIASES[src_div] in D:
        return DIV_ALIASES[src_div]
    return src_div


def merge_games(page: dict, fresh: list[dict]) -> list[list]:
    F, D, T, R, S = page["F"], page["D"], page["T"], page["R"], page["S"]
    by_id = {}
    order = []
    for row in page["games"]:
        gid = int(row[0])
        by_id[gid] = row
        order.append(gid)
    new_ids = []
    for g in fresh:
        gid = int(g["id"])
        div = page_division(g["division"], D)
        row = [
            gid,
            g["day"],
            g["date"],
            g["time"],
            intern(F, g["field"]),
            int(g["pit"]),
            intern(D, div),
            intern(R, g["round"] or ""),
            intern(T, g["home"]),
            intern(T, g["away"]),
            g["score"] or "",
            intern(S, g["status"]),
        ]
        if gid in by_id:
            by_id[gid] = row
        else:
            by_id[gid] = row
            new_ids.append(gid)
    fresh_ids = {int(g["id"]) for g in fresh}
    keep = [i for i in order if i in fresh_ids]
    return [by_id[i] for i in keep + new_ids]


def rebuild_roster_counts(page: dict, games_rows: list[list], handoff: list[dict]) -> dict:
    """Keep existing counts; add any new keys from the latest handoff."""
    counts = dict(page["roster"])
    T, D = page["T"], page["D"]
    by_entry = {}
    # prefer counts already on the page; fill from handoff resolve + package
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("wcrefresh", str(HERE / "refresh.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        by_entry = mod.load_roster_counts()
    except Exception:
        by_entry = {}
    hid = {str(g.get("game_id") or g.get("id")): g for g in handoff}
    for row in games_rows:
        gid = str(row[0])
        raw = hid.get(gid)
        if not raw:
            continue
        for side in ("home", "away"):
            entry_id = raw.get(f"{side}_entry_id")
            name = raw.get(f"{side}_name") or (T[row[8]] if side == "home" else T[row[9]])
            div = D[row[6]]
            if not entry_id or not name or name not in T or div not in D:
                continue
            key = f"{T.index(name)}|{D.index(div)}"
            if key in counts:
                continue
            c = by_entry.get(entry_id)
            if c:
                counts[key] = {"coaches": c["coaches"], "players": c["players"]}
    return counts


def emit_data_block(page: dict, rows: list[list], pulled_at: str, roster: dict) -> str:
    F, D, T, R, S = page["F"], page["D"], page["T"], page["R"], page["S"]
    return "\n".join([
        "// DATA-START",
        "// GAMES tuples: [id, day, date, time, fieldIdx, pit, divIdx, roundIdx, homeIdx, awayIdx, score, statusIdx]",
        f"const PULLED_AT = {json.dumps(pulled_at)};",
        js_string_array("F", F),
        js_string_array("D", D),
        js_string_array("T", T),
        js_string_array("R", R),
        js_string_array("S", S),
        js_games_chunks(rows),
        js_string_array("ROSTER_COUNTS", roster, typ="Record<string, { coaches: number; players: number }>").replace(
            "const ROSTER_COUNTS: Record<string, { coaches: number; players: number }> = ",
            "const ROSTER_COUNTS: Record<string, { coaches: number; players: number }> = ",
        ) if False else (
            "const ROSTER_COUNTS: Record<string, { coaches: number; players: number }> = "
            + json.dumps(roster, ensure_ascii=False, separators=(",", ":"))
            + ";"
        ),
        "// DATA-END",
    ]) + "\n"


def map_roster_division(raw: str) -> str:
    s = re.sub(r"\s*\((?:Wed|Thu|Fri|Sat|Sun)(?:-(?:Wed|Thu|Fri|Sat|Sun))?\)\s*$", "", raw).strip()
    s = s.replace("Championship - ", "Champions - ")
    s = s.replace("Women - WNXL", "Female - WNXL")
    s = s.replace("WNXL X-Ball", "WNXL Pro X-Ball")
    s = s.replace("Classic Mounds - Open 5v5", "Mounds - Open 5v5")
    s = s.replace("Classic Mounds - Open 10v10", "Classic Mounds 10v10")
    s = s.replace("Classic Mounds - Open 7v7", "Mounds - Open 7v7")
    return s


def build_team_group(rows_raw: list[dict], page: dict) -> dict[str, str]:
    T, D = page["T"], page["D"]
    out: dict[str, str] = {}
    for r in rows_raw:
        if (r.get("round") or "") != "Prelims":
            continue
        group = (r.get("group") or "").strip()
        if not group:
            continue
        div = page_division(r.get("division") or "", D)
        if div not in D:
            continue
        di = D.index(div)
        for name in (r.get("home") or "", r.get("away") or ""):
            if not name or is_slot(name) or name not in T:
                continue
            out[f"{T.index(name)}|{di}"] = group
    return out


def build_roster_players(page: dict) -> dict[str, list[str]]:
    T, D = page["T"], page["D"]
    path = HANDOFF / "rosters.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text())
    rosters = data.get("rosters") or []
    out: dict[str, list[str]] = {}
    # Also try schedule.json for entry_id → names, then name+div
    for rec in rosters:
        div = map_roster_division(rec.get("division") or "")
        div = DIV_ALIASES.get(div, div)
        if div not in D:
            # last-chance: loose contains
            cand = [d for d in D if d.lower() == div.lower() or d.lower() in div.lower() or div.lower() in d.lower()]
            if len(cand) == 1:
                div = cand[0]
            else:
                continue
        name = rec.get("team_name") or ""
        if name not in T:
            continue
        players = []
        seen = set()
        for m in rec.get("members") or []:
            if m.get("role") != "Player":
                continue
            n = (m.get("name") or "").strip()
            if not n or n in seen:
                continue
            seen.add(n)
            players.append(n)
        if not players:
            continue
        key = f"{T.index(name)}|{D.index(div)}"
        # prefer longer list if a club appears twice
        if key not in out or len(players) > len(out[key]):
            out[key] = players
    return out


def emit_derived(team_group: dict, roster_players: dict) -> str:
    return (
        "// Derived from the same pull as DATA. TEAM_GROUP is the prelim group "
        "posted on PBLeagues (stable mid-event). ROSTER_PLAYERS is names only — "
        "no jersey numbers — from the Nov 8 event-roster package.\n"
        "const TEAM_GROUP: Record<string, string> = "
        + json.dumps(team_group, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
        "const ROSTER_PLAYERS: Record<string, string[]> = "
        + json.dumps(roster_players, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )


def main() -> None:
    src_path = next((p for p in PAGE_SOURCE_CANDIDATES if p.exists()), None)
    if not src_path:
        raise SystemExit("no page source found")
    page = parse_existing_page(src_path.read_text())
    fresh_payload = json.loads((HERE / "games.json").read_text())
    fresh = fresh_payload["games"]
    pulled_at = fresh_payload["pulled_at"]
    handoff = []
    sj = HANDOFF / "schedule.json"
    if sj.exists():
        handoff = json.loads(sj.read_text()).get("games") or []
    rows = merge_games(page, fresh)
    roster = rebuild_roster_counts(page, rows, handoff)
    block = emit_data_block(page, rows, pulled_at, roster)
    (HERE / "data-block-chunked.tsx").write_text(block)

    # team groups from the cached HTML parse if present, else games.json has no group —
    # re-parse HTML when available.
    rows_raw = []
    html_path = Path("/tmp/wcsched-fresh.html")
    if html_path.exists():
        import importlib.util
        spec = importlib.util.spec_from_file_location("wcrefresh", str(HERE / "refresh.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        pulled_dt = datetime.fromisoformat(pulled_at)
        rows_raw = mod.parse_matches(html_path.read_text(errors="replace"), pulled_dt)
        # stringify names already on rows
    else:
        rows_raw = fresh
    team_group = build_team_group(rows_raw, page)
    roster_players = build_roster_players(page)
    derived = emit_derived(team_group, roster_players)
    (HERE / "derived-constants.tsx").write_text(derived)
    print(json.dumps({
        "page_source": str(src_path),
        "games_before": len(page["games"]),
        "games_after": len(rows),
        "added": len(rows) - len(page["games"]),
        "F": len(page["F"]), "D": len(page["D"]), "T": len(page["T"]),
        "R": len(page["R"]), "S": len(page["S"]),
        "chunks": (len(rows) + CHUNK - 1) // CHUNK,
        "team_group_keys": len(team_group),
        "roster_player_keys": len(roster_players),
        "data_block_bytes": (HERE / "data-block-chunked.tsx").stat().st_size,
        "derived_bytes": (HERE / "derived-constants.tsx").stat().st_size,
        "pulled_at": pulled_at,
    }))


if __name__ == "__main__":
    main()

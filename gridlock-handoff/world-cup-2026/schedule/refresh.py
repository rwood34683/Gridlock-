#!/usr/bin/env python3
"""Refresh the NXL World Cup 2026 (event 9322) public schedule.

Fetches https://pbleagues.com/event/9322/schedule (no login), parses every
game (including split-deck Pit 2 rows), and writes:

  schedule/world-cup-2026-schedule.xlsx
  schedule/world-cup-2026-schedule.csv
  schedule/games.json            — compact games array + pulled_at
  schedule/data-block.tsx        — // DATA-START .. // DATA-END for EditCanvas
  ../schedule.json               — Gridlock handoff (game ↔ entry_id/team_id)
  ../scout-tally-template.json   — proposed scout/tally schema, keyed by game_id
  ../world-cup-2026.sqlite       — games table + game_teams view + game_tallies
  ../schema.sql                  — kept in sync for those objects
  ../world-cup-2026-gridlock-web.zip — rebuilt with schedule.json + template

Usage:
  python3 /workspace/paintball/world-cup-2026/schedule/refresh.py
"""
from __future__ import annotations

import csv
import html as htmllib
import json
import re
import shutil
import sqlite3
import unicodedata
import urllib.request
import zipfile
from collections import Counter, defaultdict
from datetime import date, datetime, time
from pathlib import Path
from zoneinfo import ZoneInfo

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ET = ZoneInfo("America/New_York")
YEAR = 2026
EVENT_ID = "9322"
SOURCE_URL = "https://pbleagues.com/event/9322/schedule"
STATS_URL = "https://pbleagues.com/event/9322/schedule?action=stats&id={id}"

HERE = Path(__file__).resolve().parent
HANDOFF = HERE.parent
XLSX_NAME = "world-cup-2026-schedule.xlsx"
CSV_NAME = "world-cup-2026-schedule.csv"

MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

DIVISION_ORDER = [
    "Pro X-Ball", "WNXL Pro X-Ball", "Pro 3v3 X-Ball", "Referee Open 3v3 X-Ball",
    "Amateur 3v3 X-Ball", "Champions - Semi-Pro X-Ball",
    "Champions - Division 2 X-Ball", "Champions - Division 3 X-Ball",
    "Champions - Division 4 X-Ball", "Champions - Division 5 X-Ball",
    "Semi-Pro X-Ball", "Division 2 X-Ball", "Division 3 X-Ball",
    "Division 4 X-Ball", "Division 5 X-Ball", "Masters X-Ball",
    "Division 3 5v5", "Division 4 5v5", "Division 5 5v5",
    "Female - WNXL Amateur 5v5", "Amateur 10v10", "Mounds - Open 10v10",
    "Mounds - Open 7v7", "Mounds - Open 5v5", "Commander's Cup X-Ball",
    "Youth Advanced 5v5", "Female - WNXL 3v3", "Open 3v3", "Amateur 3v3",
    "Intermediate 3v3", "Novice 3v3", "Youth 3v3", "Intermediate 3v3 X-Ball",
]

FIELD_ORDER = [
    "NXL Pro", "Lone Wolf", "Infamous", "Defy", "NXL", "Hormesis",
    "G.I. Sportz", "Planet Eclipse", "DYE", "HK*Army", "Mounds",
    "Sup'Air 10v10", "HK*Army 10v10", "Eclipse",
    "Field 19", "Field 20", "Field 21", "Field 22", "Field 23",
    "Field 24", "Field 25", "Field 26", "Field 27", "Field 28",
]

HEADERS = [
    "Day", "Date", "Time", "Field", "Pit", "Division",
    "Group", "Round", "Home", "Away", "Score", "Status",
]

DAY_SUFFIX = re.compile(
    r"\s*\((?:Wed|Thu|Fri|Sat|Sun|Thu-Sun|Thu-Fri|Fri-Sun|Fri-Sat|Sat-Sun)\)\s*$"
)
SLOT_RE = re.compile(
    r"(?:Ochos|Ochofinals|Quarters|Semifinals|Finals|1/16|Prelims|Consolation)\s*-\s*\d+"
    r"|\bConsolation\s+[AB]\b"
    r"|\bWinner\s+[AB]\b",
    re.I,
)

# Schedule page name -> teams.json name with day suffix stripped
SCHED_TO_PACKAGE = {
    "Champions - Semi-Pro X-Ball": "Championship - Semi-Pro X-Ball",
    "Champions - Division 2 X-Ball": "Championship - Division 2 X-Ball",
    "Champions - Division 3 X-Ball": "Championship - Division 3 X-Ball",
    "Champions - Division 4 X-Ball": "Championship - Division 4 X-Ball",
    "Champions - Division 5 X-Ball": "Championship - Division 5 X-Ball",
    "Champions - Pro X-Ball": "Championship - Pro X-Ball",
    "WNXL Pro X-Ball": "WNXL X-Ball",
    "Mounds - Open 5v5": "Classic Mounds - Open 5v5",
    "Mounds - Open 7v7": "Classic Mounds - Open 7v7",
    "Mounds - Open 10v10": "Classic Mounds - Open 10v10",
    "Female - WNXL Amateur 5v5": "WNXL Amateur 5v5",
    "Female - WNXL 3v3": "Women - WNXL 3v3",
}

GAMES_DDL = """
-- Schedule for event 9322. Maintained by schedule/refresh.py from the public
-- PBLeagues schedule page. Playoff slot labels have null entry/team ids.
CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events,
  division_id TEXT REFERENCES divisions,
  division TEXT NOT NULL,
  day TEXT,
  date TEXT,
  time TEXT,
  field TEXT,
  pit INTEGER,
  round TEXT,
  home_entry_id TEXT REFERENCES event_entries,
  home_team_id TEXT REFERENCES teams,
  home_name TEXT NOT NULL,
  home_slot_label TEXT,
  away_entry_id TEXT REFERENCES event_entries,
  away_team_id TEXT REFERENCES teams,
  away_name TEXT NOT NULL,
  away_slot_label TEXT,
  score TEXT,
  status TEXT,
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL
);
""".strip()

GAME_TEAMS_DDL = """
CREATE VIEW IF NOT EXISTS game_teams AS
SELECT g.game_id, g.event_id, g.division_id, g.division, g.day, g.date, g.time,
       g.field, g.pit, g.round, 'home' AS side,
       g.home_entry_id AS entry_id, g.home_team_id AS team_id,
       g.home_name AS team_name, g.home_slot_label AS slot_label,
       g.score, g.status, g.source_url, g.retrieved_at
  FROM games g
UNION ALL
SELECT g.game_id, g.event_id, g.division_id, g.division, g.day, g.date, g.time,
       g.field, g.pit, g.round, 'away' AS side,
       g.away_entry_id AS entry_id, g.away_team_id AS team_id,
       g.away_name AS team_name, g.away_slot_label AS slot_label,
       g.score, g.status, g.source_url, g.retrieved_at
  FROM games g;
""".strip()

# Proposed only — Gridlock's own scout/tally code is not in this package.
TALLIES_DDL = """
-- PROPOSED scout/tally schema. Not populated by refresh.py.
-- event_type examples: elim, kill, point_won, penalty.
CREATE TABLE IF NOT EXISTS game_tallies (
  tally_id INTEGER PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games,
  entry_id TEXT REFERENCES event_entries,
  point_no INTEGER,
  player_person_id TEXT REFERENCES people,
  event_type TEXT NOT NULL,
  bunker TEXT,
  timestamp TEXT,
  source TEXT,
  confidence TEXT
);
""".strip()


def clean_text(s: str) -> str:
    s = htmllib.unescape(s or "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def attr(block: str, name: str, default: str = "") -> str:
    m = re.search(rf'\b{re.escape(name)}="([^"]*)"', block)
    return htmllib.unescape(m.group(1)) if m else default


def parse_date_label(label: str) -> tuple[str, date | None]:
    label = clean_text(label)
    m = re.match(r"([A-Za-z]+),\s+(\d{1,2})\s+([A-Za-z]+)", label)
    if not m:
        return (label.split(",")[0] if label else ""), None
    mon = MONTHS.get(m.group(3).lower())
    if not mon:
        return m.group(1), None
    return m.group(1), date(YEAR, mon, int(m.group(2)))


def parse_time(t: str) -> time | None:
    t = clean_text(t)
    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M"):
        try:
            return datetime.strptime(t, fmt).time()
        except ValueError:
            continue
    return None


def extract_team(block: str, class_name: str) -> str:
    m = re.search(
        rf'<a\b(?=[^>]*\bclass="{re.escape(class_name)}[^"]*")[^>]*>(.*?)</a>',
        block,
        re.S,
    )
    if not m:
        return ""
    tag_end = block.find(">", m.start())
    opening_tag = block[m.start() : tag_end + 1]
    dt = re.search(r'data-team="([^"]*)"', opening_tag)
    name = clean_text(dt.group(1)) if dt else ""
    return name or clean_text(m.group(1))


def parse_score_div(div_html: str | None) -> tuple[str | None, bool]:
    if not div_html:
        return None, False
    first_tag = div_html.split(">", 1)[0]
    approved = "approved" in first_tag
    letters = [clean_text(x) for x in re.findall(
        r"class=['\"]letterScore['\"][^>]*>\s*([^<]+)", div_html
    )]
    letters = [x for x in letters if x]
    if len(letters) >= 2:
        return f"{letters[0]}-{letters[1]}", approved
    spans = [clean_text(x) for x in re.findall(
        r'<span class="s[12][^"]*">\s*([^<]*?)\s*</span>', div_html
    )]
    if len(spans) >= 2:
        return f"{spans[0]}-{spans[1]}", approved
    return None, approved


def status_and_score(score: str | None, approved: bool, start_dt: datetime | None,
                     pulled_at: datetime) -> tuple[str, str]:
    if score and re.match(r"^[A-Za-z]+-[A-Za-z]+$", score):
        return score, "Final (forfeit)" if approved else "Unofficial (forfeit)"
    is_zero = score in (None, "", "0-0")
    if approved and score:
        return score, "Final"
    if score and not is_zero:
        return score, "Unofficial"
    if start_dt is not None and start_dt <= pulled_at:
        return "", "No score posted"
    return "", "Scheduled"


def parse_matches(html: str, pulled_at: datetime) -> list[dict]:
    opens = [m.start() for m in re.finditer(r'<div class="match item', html)]
    if not opens:
        raise SystemExit("No match items found in the schedule HTML")
    end_marker = html.find("noGamesScheduled", opens[-1])
    end_at = end_marker if end_marker != -1 else len(html)
    rows: list[dict] = []
    for i, s in enumerate(opens):
        e = opens[i + 1] if i + 1 < len(opens) else end_at
        b = html[s:e]
        mid = attr(b, "data-id") or attr(b, "id").replace("match-", "")
        dualid = attr(b, "data-dualid").strip()
        ddiv = attr(b, "data-division")
        div_parts = [p.strip() for p in ddiv.split("|")]
        div1 = div_parts[0] if div_parts else ""
        div2 = div_parts[1] if len(div_parts) > 1 else ""
        field = attr(b, "data-field")
        date_label = attr(b, "data-date")
        day_name, dt = parse_date_label(date_label)
        st = re.search(r'<div class="startTime"[^>]*>(.*?)</div>', b, re.S)
        start_time_s = clean_text(st.group(1)) if st else ""
        tm = parse_time(start_time_s)
        start_dt = datetime.combine(dt, tm, tzinfo=ET) if dt and tm else None
        team1 = extract_team(b, "team1_name")
        team2 = extract_team(b, "team2_name")
        dteam1 = extract_team(b, "dual_team1_name")
        dteam2 = extract_team(b, "dual_team2_name")
        s1block = re.search(r'<div class="score1[^"]*"[^>]*>.*?</div>', b, re.S)
        s2block = re.search(r'<div class="score2[^"]*"[^>]*>.*?</div>', b, re.S)
        sc1, ap1 = parse_score_div(s1block.group(0) if s1block else None)
        sc2, ap2 = parse_score_div(s2block.group(0) if s2block else None)
        dround = attr(b, "data-round")
        dgroup = attr(b, "data-group")
        gparts = [clean_text(p) for p in dgroup.split("|")]
        g1 = gparts[0] if gparts else ""
        g2 = gparts[1] if len(gparts) > 1 else ""

        def rec(match_id, pit, division, group, home, away, score, approved):
            disp, status = status_and_score(score, approved, start_dt, pulled_at)
            rows.append({
                "match_id": str(match_id),
                "day": day_name,
                "date": dt,
                "date_label": date_label,
                "time": tm,
                "time_label": start_time_s,
                "field": field,
                "pit": pit,
                "division": division,
                "group": group,
                "round": dround,
                "home": home,
                "away": away,
                "score": disp,
                "raw_score": score or "",
                "approved": approved,
                "status": status,
                "source_row": mid,
            })

        rec(mid, 1, div1, g1, team1, team2, sc1, ap1)
        if dualid:
            rec(dualid, 2, div2 or div1, g2, dteam1, dteam2, sc2, ap2)

    field_index = {f: i for i, f in enumerate(FIELD_ORDER)}

    def sort_key(r):
        d = r["date"] or date.max
        t = r["time"] or time.max
        fi = field_index.get(r["field"], 1000)
        return (d, t, fi, r["field"] or "", r["pit"], r["division"] or "", r["home"] or "")

    rows.sort(key=sort_key)
    return rows


def short_day(day: str) -> str:
    return {
        "Wednesday": "Wed", "Thursday": "Thu", "Friday": "Fri",
        "Saturday": "Sat", "Sunday": "Sun",
    }.get(day, (day or "")[:3])


# ----- Gridlock name resolution ------------------------------------------------

def norm_name(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "")
    s = s.replace("’", "'").replace("`", "'").replace(".", " ")
    s = re.sub(r"\s+", " ", s).strip().lower()
    s = re.sub(r"[^a-z0-9 ']+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def is_slot_label(name: str) -> bool:
    return bool(SLOT_RE.search(name or ""))


def package_key(division_name: str) -> str:
    return DAY_SUFFIX.sub("", division_name).strip()


def schedule_package_key(sched_div: str) -> str:
    return SCHED_TO_PACKAGE.get(sched_div, sched_div)


def load_teams():
    data = json.loads((HANDOFF / "teams.json").read_text())
    by_pkg: dict[str, list[dict]] = defaultdict(list)
    div_id_by_pkg: dict[str, str] = {}
    for t in data["teams"]:
        key = package_key(t["division"])
        by_pkg[key].append(t)
        div_id_by_pkg[key] = t["division_id"]
    # also from divisions list (covers empty packages)
    for d in data.get("divisions") or []:
        key = package_key(d["name"])
        div_id_by_pkg.setdefault(key, d["division_id"])
    return by_pkg, div_id_by_pkg


def candidate_entries(sched_div: str, by_pkg: dict[str, list[dict]]) -> list[dict]:
    key = schedule_package_key(sched_div)
    cands = list(by_pkg.get(key) or [])
    # Championship packages play inside the parent division on the schedule
    # (e.g. Championship Pro teams appear in Pro X-Ball games).
    if key.startswith("Championship - "):
        bare = key[len("Championship - "):]
        cands += by_pkg.get(bare) or []
    else:
        cands += by_pkg.get("Championship - " + key) or []
    return cands


def division_id_for(sched_div: str, div_id_by_pkg: dict[str, str]) -> str | None:
    key = schedule_package_key(sched_div)
    if key in div_id_by_pkg:
        return div_id_by_pkg[key]
    if key.startswith("Championship - "):
        return div_id_by_pkg.get(key)
    return div_id_by_pkg.get("Championship - " + key)


def resolve_name(name: str, sched_div: str, by_pkg: dict[str, list[dict]]) -> dict | None:
    """Return the matching teams.json entry, or None."""
    cands = candidate_entries(sched_div, by_pkg)
    if not cands:
        return None
    nn = norm_name(name)
    primary_key = schedule_package_key(sched_div)

    def prefer(matches: list[dict]) -> dict:
        if len(matches) == 1:
            return matches[0]
        # Prefer the package that matches the schedule label (not the sibling).
        primary = [m for m in matches if package_key(m["division"]) == primary_key]
        return primary[0] if len(primary) == 1 else matches[0]

    exact = [t for t in cands if norm_name(t["team_name"]) == nn]
    if exact:
        return prefer(exact)
    # typo / extra letter (DILLIGAF vs DILIGAF), unique within candidates
    close = [t for t in cands if 0 < levenshtein(norm_name(t["team_name"]), nn) <= 1]
    if len(close) == 1:
        return close[0]
    return None


def load_roster_counts() -> dict[str, dict]:
    """entry_id -> {coaches, players, staff, media, status}."""
    out = {}
    rosters = json.loads((HANDOFF / "rosters.json").read_text())["rosters"]
    for r in rosters:
        members = r.get("members") or []
        counts = Counter((m.get("role") or "") for m in members)
        out[r["entry_id"]] = {
            "coaches": counts.get("Coach", 0),
            "players": counts.get("Player", 0),
            "staff": counts.get("Staff", 0),
            "media": counts.get("Media", 0),
            "status": r.get("status"),
        }
    return out


def resolve_games(rows: list[dict], pulled_at: datetime) -> tuple[list[dict], dict]:
    by_pkg, div_id_by_pkg = load_teams()
    handoff: list[dict] = []
    stats = Counter()
    unresolved_names = []
    for r in rows:
        rec = {
            "game_id": r["match_id"],
            "event_id": EVENT_ID,
            "division_id": division_id_for(r["division"], div_id_by_pkg),
            "division": r["division"],
            "day": r["day"],
            "date": r["date"].isoformat() if r["date"] else None,
            "time": r["time_label"],
            "field": r["field"],
            "pit": r["pit"],
            "round": r["round"],
            "score": r["score"] or None,
            "status": r["status"],
            "source_url": STATS_URL.format(id=r["match_id"]),
            "retrieved_at": pulled_at.isoformat(),
        }
        for side, raw in (("home", r["home"]), ("away", r["away"])):
            slot = is_slot_label(raw)
            entry = None if slot else resolve_name(raw, r["division"], by_pkg)
            rec[f"{side}_name"] = raw
            rec[f"{side}_entry_id"] = entry["entry_id"] if entry else None
            rec[f"{side}_team_id"] = entry["team_id"] if entry else None
            rec[f"{side}_slot_label"] = raw if slot else None
            if slot:
                stats["sides_slot"] += 1
            elif entry:
                stats["sides_resolved"] += 1
            else:
                stats["sides_unresolved"] += 1
                unresolved_names.append({
                    "game_id": r["match_id"], "side": side,
                    "division": r["division"], "name": raw,
                })
        handoff.append(rec)
    stats["games"] = len(handoff)
    return handoff, {"counts": dict(stats), "unresolved": unresolved_names}


# ----- writers ----------------------------------------------------------------

def write_csv(rows: list[dict], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(HEADERS)
        for r in rows:
            w.writerow([
                r["day"],
                r["date"].isoformat() if r["date"] else "",
                r["time_label"],
                r["field"],
                r["pit"],
                r["division"],
                r["group"],
                r["round"],
                r["home"],
                r["away"],
                r["score"],
                r["status"],
            ])


def _style_sheet(ws, rows: list[dict]) -> None:
    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    body_font = Font(name="Calibri", size=11)
    alt = PatternFill("solid", fgColor="F2F2F2")
    thin = Border(
        left=Side(style="thin", color="D9D9D9"),
        right=Side(style="thin", color="D9D9D9"),
        top=Side(style="thin", color="D9D9D9"),
        bottom=Side(style="thin", color="D9D9D9"),
    )
    status_font = {
        "Final": Font(name="Calibri", size=11, color="006600"),
        "Final (forfeit)": Font(name="Calibri", size=11, color="9C5700"),
        "Unofficial": Font(name="Calibri", size=11, color="C65911"),
        "Unofficial (forfeit)": Font(name="Calibri", size=11, color="C65911"),
        "No score posted": Font(name="Calibri", size=11, color="C00000"),
        "Scheduled": Font(name="Calibri", size=11, color="595959"),
    }
    left = Alignment(horizontal="left", vertical="center")
    center = Alignment(horizontal="center", vertical="center")
    for col in range(1, len(HEADERS) + 1):
        cell = ws.cell(1, col)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin
    ws.row_dimensions[1].height = 22
    for i, r in enumerate(rows, start=2):
        values = [
            r["day"], r["date"], r["time"], r["field"], r["pit"], r["division"],
            r["group"], r["round"], r["home"], r["away"], r["score"], r["status"],
        ]
        for col, val in enumerate(values, start=1):
            cell = ws.cell(i, col, val)
            cell.font = body_font
            cell.border = thin
            cell.alignment = center if col in (1, 2, 3, 5, 7, 8, 11, 12) else left
            if i % 2 == 0:
                cell.fill = alt
        if r["date"]:
            ws.cell(i, 2).number_format = "YYYY-MM-DD"
        if r["time"]:
            ws.cell(i, 3).number_format = "h:mm AM/PM"
        ws.cell(i, 12).font = status_font.get(r["status"], body_font)
    widths = {
        "A": 12, "B": 12, "C": 11, "D": 16, "E": 6, "F": 32,
        "G": 10, "H": 14, "I": 32, "J": 32, "K": 10, "L": 18,
    }
    for col, w in widths.items():
        ws.column_dimensions[col].width = w
    last = get_column_letter(len(HEADERS))
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{last}{ws.max_row}"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = "1:1"
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 110


def sheet_name_for(division: str, existing: set[str]) -> str:
    name = division
    for ch in r":\/?*[]":
        name = name.replace(ch, "-")
    name = name[:31]
    base, n = name, 2
    while name in existing:
        name = (base[:28] + f"-{n}")[:31]
        n += 1
    return name


def write_xlsx(rows: list[dict], path: Path, pulled_at: datetime) -> None:
    wb = Workbook()
    ws0 = wb.active
    ws0.title = "All matches"
    ws0.append(HEADERS)
    _style_sheet(ws0, rows)
    ws0.sheet_properties.tabColor = "1F4E79"
    present = set(r["division"] for r in rows)
    ordered = [d for d in DIVISION_ORDER if d in present]
    ordered += sorted(present - set(DIVISION_ORDER))
    existing = {ws0.title}
    for div in ordered:
        subset = [r for r in rows if r["division"] == div]
        name = sheet_name_for(div, existing)
        existing.add(name)
        ws = wb.create_sheet(name)
        ws.append(HEADERS)
        _style_sheet(ws, subset)
    wb.properties.title = "NXL World Cup 2026 Schedule"
    wb.properties.creator = "Grok Bot"
    wb.properties.description = (
        f"Parsed from {SOURCE_URL} pulled {pulled_at.isoformat()}. Times are Eastern."
    )
    wb.save(path)


def compact_game(r: dict) -> dict:
    return {
        "id": r["match_id"],
        "day": short_day(r["day"]),
        "date": r["date"].isoformat() if r["date"] else "",
        "time": r["time_label"],
        "field": r["field"],
        "pit": r["pit"],
        "division": r["division"],
        "round": r["round"] or "",
        "home": r["home"],
        "away": r["away"],
        "score": r["score"] or "",
        "status": r["status"],
    }


def write_games_json(rows: list[dict], path: Path, pulled_at: datetime) -> list[dict]:
    games = [compact_game(r) for r in rows]
    payload = {"pulled_at": pulled_at.isoformat(), "games": games}
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    return games


def intern(arr: list, val):
    if val not in arr:
        arr.append(val)
    return arr.index(val)


def write_data_block(games: list[dict], pulled_at: datetime, handoff: list[dict], path: Path) -> str:
    """Compact interned DATA-START block for the Live Schedule Page.

    GAMES tuples: [id, day, date, time, fieldIdx, pit, divIdx, roundIdx,
                   homeIdx, awayIdx, score, statusIdx]
    ROSTER_COUNTS keys: "{teamIdx}|{divIdx}" -> {coaches, players}
    """
    counts_by_entry = load_roster_counts()
    F, Div, Names, Rounds, Statuses = [], [], [], [], []
    rows = []
    for g in games:
        rows.append([
            int(g["id"]),
            g["day"],
            g["date"],
            g["time"],
            intern(F, g["field"]),
            int(g["pit"]),
            intern(Div, g["division"]),
            intern(Rounds, g["round"] or ""),
            intern(Names, g["home"]),
            intern(Names, g["away"]),
            g["score"] or "",
            intern(Statuses, g["status"]),
        ])
    roster_counts = {}
    for g, raw in zip(games, handoff):
        for side in ("home", "away"):
            entry_id = raw.get(f"{side}_entry_id")
            name = raw.get(f"{side}_name")
            if not entry_id or not name or name not in Names or g["division"] not in Div:
                continue
            key = f"{Names.index(name)}|{Div.index(g['division'])}"
            if key in roster_counts:
                continue
            c = counts_by_entry.get(entry_id)
            if c:
                roster_counts[key] = {"coaches": c["coaches"], "players": c["players"]}
    block = (
        "// DATA-START\n"
        "// GAMES tuples: [id, day, date, time, fieldIdx, pit, divIdx, roundIdx, homeIdx, awayIdx, score, statusIdx]\n"
        f"const PULLED_AT = {json.dumps(pulled_at.isoformat())};\n"
        f"const F = {json.dumps(F, ensure_ascii=False, separators=(',', ':'))};\n"
        f"const D = {json.dumps(Div, ensure_ascii=False, separators=(',', ':'))};\n"
        f"const T = {json.dumps(Names, ensure_ascii=False, separators=(',', ':'))};\n"
        f"const R = {json.dumps(Rounds, ensure_ascii=False, separators=(',', ':'))};\n"
        f"const S = {json.dumps(Statuses, ensure_ascii=False, separators=(',', ':'))};\n"
        f"const GAMES = {json.dumps(rows, ensure_ascii=False, separators=(',', ':'))};\n"
        f"const ROSTER_COUNTS = {json.dumps(roster_counts, ensure_ascii=False, separators=(',', ':'))};\n"
        "// DATA-END"
    )
    path.write_text(block + "\n")
    return block


def write_schedule_json(handoff: list[dict], path: Path, pulled_at: datetime, resolve_stats: dict) -> None:
    payload = {
        "schema_version": "1.0",
        "event_id": EVENT_ID,
        "source_url": SOURCE_URL,
        "retrieved_at": pulled_at.isoformat(),
        "timezone": "America/New_York",
        "resolution": resolve_stats["counts"],
        "unresolved": resolve_stats["unresolved"],
        "games": handoff,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def write_tally_template(handoff: list[dict], path: Path, pulled_at: datetime) -> None:
    # One empty stub per game, clearly proposed / unpopulated.
    stubs = []
    for g in handoff:
        stubs.append({
            "game_id": g["game_id"],
            "division": g["division"],
            "home_entry_id": g["home_entry_id"],
            "away_entry_id": g["away_entry_id"],
            "tallies": [],
        })
    payload = {
        "proposed": True,
        "note": (
            "PROPOSED scout/tally template keyed by game_id. This package does not "
            "contain Gridlock's own scout/tally code, and refresh.py does not invent "
            "tally rows. Join game_id → home_entry_id/away_entry_id → rosters.json "
            "(or roster_memberships.person_id) when recording an event."
        ),
        "event_id": EVENT_ID,
        "retrieved_at": pulled_at.isoformat(),
        "event_types": ["elim", "kill", "point_won", "penalty"],
        "tally_fields": [
            "game_id", "entry_id", "point_no", "player_person_id",
            "event_type", "bunker", "timestamp", "source", "confidence",
        ],
        "games": stubs,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def ensure_schema_sql(path: Path) -> None:
    text = path.read_text()
    # Replace any previous generated block, or append.
    start_mark = "-- BEGIN schedule/refresh.py objects"
    end_mark = "-- END schedule/refresh.py objects"
    block = (
        f"{start_mark}\n"
        f"{GAMES_DDL}\n"
        f"{GAME_TEAMS_DDL}\n"
        f"{TALLIES_DDL}\n"
        f"{end_mark}\n"
    )
    if start_mark in text and end_mark in text:
        pre = text.split(start_mark)[0].rstrip() + "\n"
        post = text.split(end_mark, 1)[1]
        # drop a leading newline from post
        text = pre + "\n" + block + (post if post.startswith("\n") else "\n" + post)
    else:
        text = text.rstrip() + "\n\n" + block
    path.write_text(text)


def update_sqlite(handoff: list[dict], pulled_at: datetime) -> None:
    db = HANDOFF / "world-cup-2026.sqlite"
    con = sqlite3.connect(str(db))
    try:
        con.execute("PRAGMA foreign_keys=ON")
        con.executescript(GAMES_DDL + "\n" + TALLIES_DDL)
        # VIEW can't use IF NOT EXISTS on older sqlite the same way if it exists
        con.execute("DROP VIEW IF EXISTS game_teams")
        con.executescript(GAME_TEAMS_DDL)
        con.execute("DELETE FROM games")
        cols = [
            "game_id", "event_id", "division_id", "division", "day", "date", "time",
            "field", "pit", "round",
            "home_entry_id", "home_team_id", "home_name", "home_slot_label",
            "away_entry_id", "away_team_id", "away_name", "away_slot_label",
            "score", "status", "source_url", "retrieved_at",
        ]
        sql = "INSERT INTO games (" + ",".join(cols) + ") VALUES (" + ",".join(["?"] * len(cols)) + ")"
        for g in handoff:
            con.execute(sql, [g.get(c) for c in cols])
        con.commit()
        n = con.execute("SELECT COUNT(*) FROM games").fetchone()[0]
        v = con.execute("SELECT COUNT(*) FROM game_teams").fetchone()[0]
        print(f"sqlite games={n} game_teams={v}")
    finally:
        con.close()


def rebuild_web_zip() -> None:
    """Rebuild the Claude-web ZIP, preserving existing members, adding schedule files."""
    src = HANDOFF / "world-cup-2026-gridlock-web.zip"
    tmp = HANDOFF / "world-cup-2026-gridlock-web.zip.tmp"
    # Files we replace or add from disk (everything else is copied from the existing zip).
    replace = {
        "world-cup-2026/GRIDLOCK-START-HERE.md": HANDOFF / "GRIDLOCK-START-HERE.md",
        "world-cup-2026/schema.sql": HANDOFF / "schema.sql",
        "world-cup-2026/gridlock-web-manifest.json": HANDOFF / "gridlock-web-manifest.json",
        "world-cup-2026/schedule.json": HANDOFF / "schedule.json",
        "world-cup-2026/scout-tally-template.json": HANDOFF / "scout-tally-template.json",
    }
    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        kept = set()
        for info in zin.infolist():
            if info.filename in replace:
                p = replace[info.filename]
                zout.write(p, info.filename)
                kept.add(info.filename)
            else:
                zout.writestr(info, zin.read(info.filename))
                kept.add(info.filename)
        for name, p in replace.items():
            if name not in kept and p.exists():
                zout.write(p, name)
    with zipfile.ZipFile(tmp) as z:
        assert z.testzip() is None
    tmp.replace(src)
    print(f"web zip {src} {src.stat().st_size} bytes")


def update_manifest(games_n: int, pulled_at: datetime, resolve_stats: dict) -> None:
    path = HANDOFF / "gridlock-web-manifest.json"
    data = json.loads(path.read_text())
    data["schedule"] = {
        "file": "schedule.json",
        "event_id": EVENT_ID,
        "retrieved_at": pulled_at.isoformat(),
        "games": games_n,
        "sides_resolved": resolve_stats["counts"].get("sides_resolved", 0),
        "sides_slot": resolve_stats["counts"].get("sides_slot", 0),
        "sides_unresolved": resolve_stats["counts"].get("sides_unresolved", 0),
        "tally_template": "scout-tally-template.json",
        "note": "Proposed game_tallies schema; not populated.",
    }
    path.write_text(json.dumps(data, indent=2) + "\n")


def fetch(url: str, dest: Path) -> datetime:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; GridlockScheduleRefresh/1.0)"
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())
    pulled = datetime.now(ET)
    return pulled


def main() -> None:
    html_path = Path("/tmp/wcsched-fresh.html")
    print(f"fetching {SOURCE_URL}")
    pulled_at = fetch(SOURCE_URL, html_path)
    html = html_path.read_text(errors="replace")
    rows = parse_matches(html, pulled_at)
    slots = sum(1 for r in rows if r["pit"] == 1)
    duals = sum(1 for r in rows if r["pit"] == 2)
    print(f"parsed {len(rows)} games ({slots} slots, {duals} pit-2) pulled_at={pulled_at.isoformat()}")

    write_csv(rows, HERE / CSV_NAME)
    write_xlsx(rows, HERE / XLSX_NAME, pulled_at)
    games = write_games_json(rows, HERE / "games.json", pulled_at)

    handoff, resolve_stats = resolve_games(rows, pulled_at)
    print("resolution", resolve_stats["counts"])
    if resolve_stats["unresolved"]:
        print("unresolved names:")
        for u in resolve_stats["unresolved"]:
            print(f"  {u['division']}: {u['name']} ({u['side']} game {u['game_id']})")

    write_schedule_json(handoff, HANDOFF / "schedule.json", pulled_at, resolve_stats)
    write_tally_template(handoff, HANDOFF / "scout-tally-template.json", pulled_at)
    write_data_block(games, pulled_at, handoff, HERE / "data-block.tsx")

    ensure_schema_sql(HANDOFF / "schema.sql")
    update_sqlite(handoff, pulled_at)
    update_manifest(len(handoff), pulled_at, resolve_stats)
    rebuild_web_zip()

    summary = {
        "pulled_at": pulled_at.isoformat(),
        "games": len(rows),
        "slots": slots,
        "pit2": duals,
        "resolution": resolve_stats["counts"],
        "unresolved": resolve_stats["unresolved"],
        "xlsx": str(HERE / XLSX_NAME),
        "csv": str(HERE / CSV_NAME),
        "games_json": str(HERE / "games.json"),
        "data_block": str(HERE / "data-block.tsx"),
        "schedule_json": str(HANDOFF / "schedule.json"),
        "tally_template": str(HANDOFF / "scout-tally-template.json"),
        "data_block_bytes": (HERE / "data-block.tsx").stat().st_size,
    }
    (HERE / "refresh-summary.json").write_text(json.dumps(summary, indent=2, default=str) + "\n")
    # compact stdout for scheduled jobs
    print(json.dumps({
        "pulled_at": pulled_at.isoformat(),
        "games": len(rows),
        "resolution": resolve_stats["counts"],
        "data_block_bytes": summary["data_block_bytes"],
        "files": {
            "xlsx": str(HERE / XLSX_NAME),
            "csv": str(HERE / CSV_NAME),
            "games_json": str(HERE / "games.json"),
            "data_block": str(HERE / "data-block.tsx"),
            "schedule_json": str(HANDOFF / "schedule.json"),
            "tally_template": str(HANDOFF / "scout-tally-template.json"),
        },
    }))


if __name__ == "__main__":
    main()

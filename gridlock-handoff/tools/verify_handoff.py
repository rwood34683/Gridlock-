#!/usr/bin/env python3
"""Recheck the Gridlock-matched handoff. Safe to run in Codex, Claude, or GitHub Actions.

Does not push or change the Gridlock repo. Optional --repo points at a local
clone of https://github.com/rwood34683/Gridlock- so the app's own loaders and
packer/importer can be used.

    python3 tools/verify_handoff.py
    python3 tools/verify_handoff.py --root /path/to/gridlock-handoff --repo /path/to/Gridlock-
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

# Official packer leaves these out of event data (tools/worldcup_pack.py).
FORBIDDEN_IN_EVENT_DATA = (
    "age_as_published", "registration_fee_paid", "person_event_link",
    "event_person_token", "jersey_number", "event_roster_token",
)


def fold_name(n: Any) -> str:
    return " ".join(str(n or "").lower().split())


class Report:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0
        self.rows: list[dict[str, Any]] = []

    def check(self, ok: bool, name: str, detail: str = "") -> None:
        self.rows.append({"ok": bool(ok), "name": name, "detail": detail})
        if ok:
            self.passed += 1
            print("PASS", name + (f" — {detail}" if detail else ""))
        else:
            self.failed += 1
            print("FAIL", name + (f" — {detail}" if detail else ""), file=sys.stderr)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def schema_and_counts(root: Path, r: Report) -> dict[str, Any]:
    evd_path = root / "export/gridlock/event-data.json"
    copy_path = root / "export/gridlock/season-copy-games.json"
    matched_path = root / "export/gridlock-matched.json"
    seed_path = root / "tools/gridlock-app-schedule-seed.json"
    teams_path = root / "world-cup-2026/teams.json"
    rosters_path = root / "world-cup-2026/rosters.json"
    coverage_path = root / "world-cup-2026/coverage-audit.json"
    schedule_path = root / "world-cup-2026/schedule.json"

    evd = load_json(evd_path)
    copy = load_json(copy_path)
    matched = load_json(matched_path)
    seed = load_json(seed_path)
    teams = load_json(teams_path)
    rosters = load_json(rosters_path)
    coverage = load_json(coverage_path)
    schedule = load_json(schedule_path)

    r.check(evd.get("kind") == "gridlock.event.data" and evd.get("v") == 1,
            "event-data kind is gridlock.event.data v1",
            f"kind={evd.get('kind')} v={evd.get('v')}")
    r.check(copy.get("format") == "gridlock.coach.copy" and copy.get("v") == 1,
            "season copy format is gridlock.coach.copy v1",
            f"format={copy.get('format')} v={copy.get('v')}")
    r.check(isinstance(copy.get("data"), dict) and isinstance(copy["data"].get("games"), list),
            "season copy data.games is a list")

    entries = evd.get("entries") or {}
    people = evd.get("people") or {}
    obs = evd.get("obs") or {}
    members = evd.get("members") or []
    cov = evd.get("coverage") or {}
    r.check(len(entries) == 680, "event-data has 680 entries", str(len(entries)))
    r.check(len(people) == 4381, "event-data has 4381 people", str(len(people)))
    r.check(len(obs) == 12569, "event-data has 12569 observations", str(len(obs)))
    r.check(len(entries) == cov.get("event_entries"), "entries match packed coverage")
    r.check(len(people) == cov.get("distinct_people"), "people match packed coverage")
    r.check(len({e.get("team") for e in entries.values()}) == cov.get("distinct_team_ids"),
            "team ids match packed coverage")
    r.check(len(entries) == coverage.get("event_entries") or len(entries) == 680,
            "entries match package coverage-audit")

    entry_ids = list(entries)
    r.check(len(entry_ids) == len(set(entry_ids)), "event-data entry ids are unique")
    r.check(len(people) == len(set(people)), "event-data person ids are unique")
    r.check(len(obs) == len(set(obs)), "event-data observation ids are unique")
    r.check(str(evd.get("event", {}).get("id")) == "9322", "event-data event id is 9322")

    # ID uniqueness in the source package too
    src_entries = [e["entry_id"] for e in teams.get("teams") or []]
    r.check(len(src_entries) == len(set(src_entries)) and len(src_entries) == 680,
            "teams.json entry_ids unique and 680")
    games_src = schedule.get("games") or []
    gids = [str(g.get("game_id")) for g in games_src]
    r.check(len(gids) == 722 and len(gids) == len(set(gids)), "schedule.json has 722 unique game_ids")

    # Season games
    games = copy["data"]["games"]
    pub_games = (matched.get("games") or {}).get("all") or []
    r.check(len(pub_games) == 722, "matched games.all is 722", str(len(pub_games)))
    expected_not_seed = len((matched.get("games") or {}).get("not_in_app_seed") or [])
    r.check(len(games) == expected_not_seed,
            "season copy has the de-duplicated not-in-seed list",
            f"{len(games)} vs {expected_not_seed}")

    required = ("id", "d", "t", "h", "a")
    bad_shape = []
    ids = []
    for g in games:
        ids.append(g.get("id"))
        if any(not isinstance(g.get(k), str) or not g.get(k) for k in required):
            bad_shape.append(g.get("id"))
        if g.get("layout") != "nwc":
            bad_shape.append(f"{g.get('id')} layout={g.get('layout')}")
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(g.get("d") or "")):
            bad_shape.append(f"{g.get('id')} bad d")
        if not re.match(r"^\d{2}:\d{2}$", str(g.get("t") or "")):
            bad_shape.append(f"{g.get('id')} bad t")
    r.check(not bad_shape, "season games have required id/d/t/h/a, nwc layout, ISO date, HH:MM",
            "" if not bad_shape else str(bad_shape[:5]))
    r.check(len(ids) == len(set(ids)), "season game ids are unique")

    seed_keys = {(s["d"], s["t"], fold_name(s["h"]), fold_name(s["a"])) for s in seed}
    overlap = [g for g in games if (g["d"], g["t"], fold_name(g["h"]), fold_name(g["a"])) in seed_keys]
    r.check(not overlap, "season copy has no games already in the app's 78-row seed",
            f"{len(overlap)} overlaps" if overlap else "0 overlaps")

    skipped = (matched.get("games") or {}).get("skipped") or []
    r.check(len(skipped) == 0, "no schedule rows were dropped for missing sides/clock",
            str(len(skipped)))

    # Jerseys: none invented, none packed
    evd_text = evd_path.read_text(encoding="utf-8")
    for token in FORBIDDEN_IN_EVENT_DATA:
        r.check(token not in evd_text, f"event-data does not contain {token}")
    jersey_vals = [m.get("jersey_number") for rost in rosters.get("rosters") or [] for m in (rost.get("members") or [])]
    non_null = [j for j in jersey_vals if j not in (None, "", "null")]
    r.check(not non_null, "world-cup rosters have no published jersey numbers (none invented)",
            f"{len(non_null)} non-null of {len(jersey_vals)}")

    # Public directory counts
    pub = matched.get("public_directory") or {}
    r.check(len(pub.get("divisions") or []) == 36, "public directory 36 divisions")
    r.check(len(pub.get("entries") or []) == 680, "public directory 680 entries")
    r.check(len(pub.get("locations") or []) == 680, "public directory 680 locations")

    return {
        "event_data_bytes": evd_path.stat().st_size,
        "season_copy_games": len(games),
        "matched_games_all": len(pub_games),
        "seed_rows": len(seed),
        "overlap_with_seed_in_copy": len(overlap),
    }


def run_packer_diff(root: Path, repo: Path, r: Report) -> None:
    packer = repo / "tools/worldcup_pack.py"
    if not packer.exists():
        r.check(False, "repo has tools/worldcup_pack.py")
        return
    out = Path("/tmp/gridlock-verify-diff/event-data-from-app.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        [sys.executable, "-I", str(packer), str(root / "world-cup-2026"), str(out)],
        capture_output=True, text=True,
    )
    r.check(proc.returncode == 0, "repo worldcup_pack.py ran", proc.stderr[-400:] if proc.returncode else "")
    if proc.returncode != 0:
        return
    ours = root / "export/gridlock/event-data.json"
    r.check(ours.read_bytes() == out.read_bytes(),
            "event-data.json is byte-identical to the app packer's output",
            f"our={sha256(ours)[:16]} app={sha256(out)[:16]}")


def run_app_loaders(root: Path, repo: Path, r: Report) -> dict[str, Any]:
    harness = root / "tools/verify_app_loaders.js"
    if not harness.exists():
        r.check(False, "tools/verify_app_loaders.js is present")
        return {}
    import os
    env = os.environ.copy()
    env["GRIDLOCK_REPO"] = str(repo)
    env["HANDOFF_ROOT"] = str(root)
    proc = subprocess.run(
        ["node", str(harness), str(repo)],
        cwd=str(root),
        env=env,
        capture_output=True, text=True,
    )
    print(proc.stdout, end="" if proc.stdout.endswith("\n") or not proc.stdout else "\n")
    if proc.stderr:
        print(proc.stderr, end="" if proc.stderr.endswith("\n") else "\n", file=sys.stderr)
    r.check(proc.returncode == 0, "app loaders (evdUnpack / readCopy / copyDataError) accept our files")
    report_path = root / "verify/app-loaders-report.json"
    if report_path.exists():
        return json.loads(report_path.read_text(encoding="utf-8"))
    return {"returncode": proc.returncode}


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", type=Path, default=None)
    p.add_argument("--repo", type=Path, default=None, help="Local clone of rwood34683/Gridlock- (read-only)")
    args = p.parse_args(argv)
    root = (args.root or Path(__file__).resolve().parent.parent).resolve()
    repo = args.repo.resolve() if args.repo else None
    if not (root / "export/gridlock/event-data.json").exists():
        print(f"error: {root} is not the handoff package", file=sys.stderr)
        return 2

    r = Report()
    extras: dict[str, Any] = {"root": str(root), "repo": str(repo) if repo else None}
    extras["schema"] = schema_and_counts(root, r)
    if repo and (repo / "tools/worldcup_pack.py").exists():
        run_packer_diff(root, repo, r)
        extras["loaders"] = run_app_loaders(root, repo, r)
    else:
        r.check(True, "skipped app packer/loader checks (pass --repo to enable)")

    extras["passed"] = r.passed
    extras["failed"] = r.failed
    extras["ok"] = r.failed == 0
    out = root / "verify/handoff-verify-report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"checks": r.rows, **extras}, indent=2) + "\n", encoding="utf-8")
    print(f"{r.passed} passed, {r.failed} failed")
    print("report", out)
    return 1 if r.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

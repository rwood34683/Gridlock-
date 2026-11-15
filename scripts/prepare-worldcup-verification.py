#!/usr/bin/env python3
"""Recreate omitted, git-ignored verification inputs from the handoff's SQLite.

Uses the people-export section of the supplied world-cup-2026/audit_coverage.py,
without its unrelated capture audits or writes. No network and no inferred data.
Then runs the app's packer and checks the original handoff's recorded checksum.
"""
import hashlib
import json
import sqlite3
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
pack = repo / "gridlock-handoff"
base = pack / "world-cup-2026"
people_file = base / "people.json"
event_file = pack / "export/gridlock/event-data.json"
for file in (people_file, event_file):
    subprocess.run(["git", "check-ignore", "--quiet", str(file)], cwd=repo, check=True)

if not people_file.exists():
    c = sqlite3.connect((base / "world-cup-2026.sqlite").resolve().as_uri() + "?mode=ro", uri=True)
    c.row_factory = sqlite3.Row
    sources = {r["source_id"]: dict(r) for r in c.execute("select * from sources")}

    def prov(sid):
        s = sources.get(sid)
        return dict(source_id=sid, source_url=s["url"], retrieved_at=s["retrieved_at"], source_file=s["local_file"]) if s else None

    roles, entries = defaultdict(set), defaultdict(set)
    for r in c.execute("select * from roster_memberships"):
        roles[r["person_id"]].add(r["role"])
        entries[r["person_id"]].add(r["entry_id"])
    profiles = {r["person_id"]: dict(r) for r in c.execute("select * from person_profile_observations")}

    def records(table):
        out = defaultdict(list)
        for r in c.execute("select * from " + table):
            row = dict(r)
            row["source"] = prov(row["source_id"])
            out[row["person_id"]].append(row)
        return out

    history, variants, access = (records(t) for t in ("person_event_history", "person_name_variants", "person_profile_access"))
    people = []
    for r in c.execute("select * from people"):
        person = dict(r)
        pid = person["person_id"]
        pr = profiles.get(pid, {})
        person.update(is_current_event_player="Player" in roles[pid], current_roles=sorted(roles[pid]), current_entry_ids=sorted(entries[pid]),
            name_variants=variants[pid], hometown=dict(raw=pr.get("hometown_raw"), city=pr.get("hometown_city"), region=pr.get("hometown_region"),
            country=pr.get("hometown_country"), status=pr.get("hometown_status", "not_retrieved"), source=prov(pr.get("source_id"))),
            history=dict(status=pr.get("history_status", "not_retrieved"), scope="classification_scored_event_history_not_complete_career",
            source=prov(pr.get("source_id")), observations=history[pid]), profile_access=access[pid])
        people.append(person)
    c.close()
    people_file.write_text(json.dumps(dict(scope="All observed people; is_current_event_player separates players from staff/coaches/media",
        people=people), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if not event_file.exists():
    subprocess.run([sys.executable, "-I", str(repo / "tools/worldcup_pack.py"), str(base), str(event_file)], check=True)
digest = hashlib.sha256(event_file.read_bytes()).hexdigest()
if not digest.startswith("fcb0e23c728bda75"):
    raise SystemExit("Private input does not match the original handoff's recorded checksum; do not run verification against substituted data.")
print("Private verification input matches the handoff checksum; remains git-ignored:", digest)

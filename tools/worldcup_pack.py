#!/usr/bin/env python3
"""Pack the NXL World Cup 2026 data package into one event-data file the app loads.

    python3 -I tools/worldcup_pack.py /path/to/world-cup-2026 OUT.json

The package is read off PBLeagues (event 9322). Its team list is already in
the app (tools/worldcup_2026.py). Its rosters, people and published event
histories are names read from login-only pages, some of them minors. Those
names never go in the repo or the app's source: this tool writes them to a
file on the coach's own machine, and the app loads that file on his phone
(More > Account & backups > Event data). Nothing here is committed.

The file keeps every published ID (entry, team, division, person, source,
observation), every source URL with its retrieval time, and every
missing-data status exactly as the package states it. It leaves out what a
coach does not need and should not carry: ages, payment state of a person,
personal roster links and tokens, local file paths and hashes.

Running it again on a newer, more enriched package writes the same IDs, so
loading the new file on the phone updates records in place and adds new
ones; nothing is duplicated.
"""
import json
import sys
from pathlib import Path

KIND = "gridlock.event.data"
VERSION = 1


def load(pkg, name):
    return json.loads((pkg / name).read_text(encoding="utf-8"))


class Strings:
    """One table of repeated text, so an event name or URL is stored once."""

    def __init__(self):
        self.list, self.index = [], {}

    def __call__(self, s):
        if s is None:
            return -1
        s = str(s)
        if s not in self.index:
            self.index[s] = len(self.list)
            self.list.append(s)
        return self.index[s]


def pack(pkg):
    teams = load(pkg, "teams.json")
    event = teams["event"]
    if str(event["event_id"]) != "9322":
        raise SystemExit("This is not the NXL World Cup 2026 package (event 9322).")
    rosters = load(pkg, "rosters.json")["rosters"]
    people = load(pkg, "people.json")["people"]
    history = load(pkg, "person_event_history.json")["observations"]
    sources = load(pkg, "sources.json")
    audit = load(pkg, "coverage-audit.json")
    S = Strings()

    # Sources: id -> [url, retrieved_at]. Only ones something here cites.
    all_src = {str(s["source_id"]): s for s in sources}
    used = set()

    def src(sid):
        if sid is None:
            return None
        sid = str(sid)
        if sid in all_src:
            used.add(sid)
            return sid
        return None

    divs = [[d["division_id"], d["name"], d.get("event_id"), d.get("signed_up")]
            for d in teams["divisions"]]

    entries = {}
    for e in teams["teams"]:
        loc = e.get("team_location") or {}
        entries[e["entry_id"]] = {
            "team": e["team_id"], "div": e["division_id"], "name": e["team_name"],
            "reg": e["registration_status"], "url": e.get("roster_url"),
            "src": e.get("source_url"), "at": e.get("retrieved_at"),
            "loc": {
                "town": loc.get("hometown_raw"), "city": loc.get("hometown_city"),
                "region": loc.get("hometown_region"), "country": loc.get("hometown_country"),
                "field": loc.get("home_field_name"), "fieldAt": loc.get("home_field_location_raw"),
                "status": loc.get("location_status") or "not_retrieved",
                "src": loc.get("source_url"), "at": loc.get("retrieved_at"),
            },
        }

    members = []
    for r in rosters:
        en = entries.get(r["entry_id"])
        if en is None:
            raise SystemExit("Roster for an entry the team list does not have: " + r["entry_id"])
        en["roster"] = {"status": r["status"], "src": r.get("source_url"), "at": r.get("retrieved_at")}
        for m in r.get("members") or []:
            # Never an age, a personal link or token, or whether a person paid.
            members.append([r["entry_id"], m["person_id"], S(m["name"]), S(m["role"]),
                            S(m.get("classification")), S(m.get("checked_in")), src(m.get("source_id"))])

    persons = {}
    for p in people:
        ht, hs = p.get("hometown") or {}, p.get("history") or {}
        variants = []
        seen = set()
        for v in p.get("name_variants") or []:
            key = (v["name"], v.get("variant_kind"), str(v.get("source_id")))
            if key in seen:
                continue
            seen.add(key)
            variants.append([S(v["name"]), S(v.get("variant_kind")), src(v.get("source_id"))])
        persons[p["person_id"]] = [
            S(p["name"]), 1 if p.get("is_current_event_player") else 0,
            S(hs.get("status") or "not_retrieved"), S(ht.get("status") or "not_retrieved"),
            # A hometown only where the person's own page published one.
            [S(ht.get("raw")), S(ht.get("city")), S(ht.get("region")), S(ht.get("country")),
             src((ht.get("source") or {}).get("source_id"))] if ht.get("raw") else None,
            src((hs.get("source") or {}).get("source_id")),
            variants,
        ]

    obs = {}
    for o in history:
        if o["person_id"] not in persons:
            raise SystemExit("History for a person the package does not list: " + o["person_id"])
        obs[o["observation_id"]] = [
            o["person_id"], S(o.get("event_date_iso") or o.get("event_date_as_published")),
            S(o.get("event_name")), S(o.get("event_id")), S(o.get("event_url")),
            S(o.get("team_name")), S(o.get("division_as_published")), S(o.get("place_as_published")),
            S(o.get("classification_score_as_published")), S(o.get("classification_context")),
            S(o.get("role_at_historical_event")), S(o.get("participation_basis")), src(o.get("source_id")),
        ]

    src_out = {sid: [S(all_src[sid]["url"]), all_src[sid].get("retrieved_at")] for sid in sorted(used, key=int)}

    coverage = {k: audit.get(k) for k in (
        "generated_at", "overall", "event_entries", "advertised_signed_up", "distinct_team_ids",
        "distinct_people", "distinct_current_players", "roster_status_counts", "memberships_by_role",
        "player_history_statuses", "player_hometown_statuses", "team_hometown_entries",
        "home_field_entries", "non_null_jersey_memberships")}

    data = {
        "kind": KIND, "v": VERSION,
        "event": {"id": event["event_id"], "name": "NXL World Cup " + str(event.get("year", "")),
                  "start": event.get("start_date"), "end": event.get("end_date"),
                  "read": teams.get("retrieved_at")},
        "coverage": coverage, "str": S.list, "src": src_out, "divs": divs,
        "entries": entries, "members": members, "people": persons, "obs": obs,
    }
    check(data)
    return data


def check(d):
    c = d["coverage"]
    if len(d["entries"]) != c["event_entries"]:
        raise SystemExit("Entries do not match the coverage audit.")
    if len(d["people"]) != c["distinct_people"]:
        raise SystemExit("People do not match the coverage audit.")
    if len({e["team"] for e in d["entries"].values()}) != c["distinct_team_ids"]:
        raise SystemExit("Team IDs do not match the coverage audit.")
    players = sum(1 for p in d["people"].values() if p[1])
    if players != c["distinct_current_players"]:
        raise SystemExit("Current players do not match the coverage audit.")
    for e in d["entries"].values():
        if "roster" not in e:
            raise SystemExit("An entry has no roster record: " + e["name"])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        raise SystemExit(__doc__)
    data = pack(Path(args[0]))
    out = Path(args[1])
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    out.write_text(text, encoding="utf-8")
    roles = {}
    for m in data["members"]:
        r = data["str"][m[3]]
        roles[r] = roles.get(r, 0) + 1
    print(json.dumps({"bytes": len(text.encode()), "entries": len(data["entries"]),
                      "people": len(data["people"]), "memberships": len(data["members"]),
                      "roles": roles, "observations": len(data["obs"]),
                      "sources": len(data["src"])}, indent=1))


if __name__ == "__main__":
    main()

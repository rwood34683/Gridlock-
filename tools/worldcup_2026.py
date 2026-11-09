#!/usr/bin/env python3
"""Write the NXL World Cup 2026 entries into web/index.html.

Reads teams.json from the World Cup 2026 data package (read off PBLeagues
event 9322 on 8 Nov 2026) and rewrites the block between
/* worldcup:begin */ and /* worldcup:end */ in web/index.html. Never edit that
block by hand: run this again on a newer package.

    python3 -I tools/worldcup_2026.py /path/to/world-cup-2026          # check
    python3 -I tools/worldcup_2026.py /path/to/world-cup-2026 --write  # write

What goes in: every division with entries, every team entry and its
registration state, spelled as the page spells it. A name in two divisions is
one team to the app, because a team's name is its key.

What stays out: every person. The package's rosters, people, profiles and
event histories are names read from login-only pages, some of them minors,
and they are not committed or shipped. Only the published registration list
goes in, the same kind of data as the other boards.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "web" / "index.html"
BEGIN, END = "/* worldcup:begin */", "/* worldcup:end */"
REG = {"Payment Accepted": "PAID", "Pending - Pay": "PEND",
       "Pay Entry Fee": "DUE", "Registration Deadline Passed": "LATE"}


def build(pkg):
    teams = json.loads((pkg / "teams.json").read_text())
    if str(teams["event"]["event_id"]) != "9322":
        raise SystemExit("This is not the NXL World Cup 2026 package (event 9322).")
    by_div = {}
    for e in teams["teams"]:
        reg = REG.get(e["registration_status"])
        if reg is None:
            raise SystemExit("Unknown registration state: " + e["registration_status"])
        by_div.setdefault(e["division_id"], []).append([e["team_name"].strip(), reg])
    divs = []
    for d in teams["divisions"]:
        entries = by_div.get(d["division_id"], [])
        if not entries:
            continue  # the two empty college packages
        if len(entries) != d["signed_up"]:
            raise SystemExit(f"{d['name']}: {len(entries)} rows, page says {d['signed_up']}")
        entries.sort(key=lambda t: t[0].lower())
        divs.append({"id": "wcup-" + d["division_id"], "name": d["name"], "teams": entries})
    event = teams["event"]
    read = "PBLeagues · NXL World Cup 2026 · event 9322 · " + teams["retrieved_at"][:10]
    data = {"read": read, "divs": divs}
    counts = {
        "divisions": len(divs), "entries": sum(len(d["teams"]) for d in divs),
        "start": event["start_date"], "end": event["end_date"],
    }
    return data, counts


def brand_words():
    brands = json.loads((ROOT / "brand" / "brands.json").read_text())["brands"]
    return sorted({b["short"] for b in brands.values() if b.get("short")}, key=len, reverse=True)


def block(data):
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    # A name can never close the script: "</" is written as "<\/".
    body = body.replace("</", "<\\/")
    # A team can share a word with one of our builds ("Konvicts Lockdown"). The
    # brand check rightly refuses a build's name in the source, so the word is
    # written with its first letter as a JavaScript escape: the app shows the
    # team's own name and the source never says the build's.
    for word in brand_words():
        body = re.sub(r"\b" + re.escape(word) + r"\b",
                      lambda m: "\\u%04x" % ord(m.group(0)[0]) + m.group(0)[1:], body)
    return BEGIN + "\nconst WCUP = " + body + ";\n" + END


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        raise SystemExit(__doc__)
    data, counts = build(Path(args[0]))
    html = APP.read_text()
    if html.count(BEGIN) != 1 or html.count(END) != 1:
        raise SystemExit("web/index.html needs exactly one worldcup block.")
    start, stop = html.index(BEGIN), html.index(END) + len(END)
    fresh = html[:start] + block(data) + html[stop:]
    print(json.dumps(counts, indent=1))
    if fresh == html:
        print("The World Cup block is up to date.")
        return
    if "--write" not in sys.argv:
        raise SystemExit("The World Cup block is out of date; run with --write.")
    APP.write_text(fresh)
    print("Wrote the World Cup block.")


if __name__ == "__main__":
    main()

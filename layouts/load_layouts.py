"""Load Gridlock / Claude Code paintball layout pack."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def load_index() -> dict:
    return json.loads((ROOT / "index.json").read_text())

def load_event(event_id: str) -> dict:
    path = ROOT / "events" / f"{event_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"No event file for {event_id}: {path}")
    data = json.loads(path.read_text())
    for view in data.get("views", []):
        view["abs_path"] = str(ROOT / view["file"])
    return data

def list_published() -> list[str]:
    idx = load_index()
    out = []
    for eid in idx["events"]:
        ev = load_event(eid)
        if ev.get("status") == "published" and ev.get("views"):
            out.append(eid)
    return out

if __name__ == "__main__":
    print("published:", ", ".join(list_published()))

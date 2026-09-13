"""Load 2026 paintball layout catalog for Gridlock Coach / Claude Code."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent


def load_index(path: str | Path | None = None) -> dict[str, Any]:
    p = Path(path) if path else ROOT / "data" / "index.json"
    return json.loads(p.read_text())


def load_event(event_id_or_path: str | Path) -> dict[str, Any]:
    p = Path(event_id_or_path)
    if p.suffix != ".json":
        p = ROOT / "data" / "events" / f"{event_id_or_path}.json"
    return json.loads(p.read_text())


def published_events() -> list[dict[str, Any]]:
    idx = load_index()
    out = []
    for item in idx["events"]:
        if item.get("status") in {"published", "used_other_event_layout", "image_only"}:
            out.append(load_event(item["id"]))
    return out


def image_path(rel: str) -> Path:
    return ROOT / rel


if __name__ == "__main__":
    idx = load_index()
    print(f"{idx['title']} — {len(idx['events'])} events")
    for e in idx["events"]:
        print(f"  [{e['status']:24}] {e['id']}")

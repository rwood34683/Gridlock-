# Claude Code — Gridlock Coach layout pack

Import these 2026 paintball layouts into Gridlock Coach (or any field visualizer) without inventing bunker coordinates.

## What this folder is

- `index.json` — catalog of every event in the pack
- `schema.json` — JSON Schema (`gridlock.layout.v1`)
- `events/*.json` — one file per event (metadata + image paths + empty `bunkers[]`)
- `bunkers.json` — the standard footprint of each bunker type, measured once
- `images/` — published official stills. These are the ground truth.

## Rules (do not break)

1. **Do not invent bunker x,y.** `bunkers` is empty on purpose unless a later digitize pass filled it from the official labeled 2D.
2. Use the **image** as the map. Place bunkers by reading the 10-ft grid printed on official NXL 2D maps.
3. Standard Xball field unless `field` says otherwise: **150 ft wide × 120 ft long**, **10-ft grid**.
4. Coordinate origin if you digitize: home-left snake corner. +X toward Dorito tape. +Y toward away / midfield.
5. Unreleased events (`status: unreleased`) have no images. Do not generate a fake layout for them.
6. `usxbl_2026_practice` is a practice concept map, not a match layout.
7. **Measure the whole bunker, not the lit half.** These maps are lit from the
   upper left and the shaded face of every bunker is printed near black. It is a
   face of the bunker, not a shadow beside it. Segment on colour alone and every
   footprint comes back short and every centre lands a foot toward the light.
8. **Footprints come from `bunkers.json`, positions come from the event's map.**
   A bunker type is one inflatable and does not change size between events; the
   prints are drawn to different weights, which is a fact about the drawings.
   `tools/bunker_sizes.py` measures the standard once off the unlabeled Midwest
   2D. Do not re-derive a footprint per event, and do not hand-edit that file.
9. A map that disagrees with the standard is kept as a second bunker only when
   **another layout draws it the same way**. One map on its own is a reading
   that ran into a neighbour or its own label. Every bunker keeps what its map
   drew in `drawn_w_ft` / `drawn_h_ft` either way, so nothing is lost.

## How to import (do this)

```text
1. Read layouts/index.json
2. For the event the user named, open events/<id>.json
3. Load every file in views[].file
4. Render the 2D image on a 150×120 / 10-ft grid
5. If the user wants an interactive Gridlock field:
   - trace bunker footprints from the labeled 2D (Midwest first — it is the only official high-res labeled map)
   - name bunkers from the printed labels
   - mirror home/away
   - expose snake / dorito / center layers
6. Keep source URLs on the event so the user can open the publisher's to-scale 3D
```

## Best starting event

`nxl_2026_midwest_open` — official NXL labeled 2D + clean 2D + snake 3D + breakout 3D.

## Event ids

- nxl_2026_midwest_open
- nxl_2026_tampa_bay_open
- nxl_2026_tampa_bay_10v10
- nxleu_2026_czech_cup
- wcppl_2026_defy_opener
- mvps_2026_spring_skirmish   (same map family as Tampa Bay)
- usxbl_2026_practice
- nxl_2026_lone_star          (unreleased as of 2026-09-06)
- nxl_2026_world_cup          (unreleased)
- mvps_2026_southeastern_championship  (drops 2026-09-09)
- wcppl_2026_championship     (unreleased)

## Loader

```python
from layouts.load_layouts import load_index, load_event
idx = load_index()
mwo = load_event("nxl_2026_midwest_open")
```

## If the user says "put this on the Gridlock field"

Use the Midwest labeled 2D first. Draw the grid, snap bunkers to 10-ft cells, label Snake / Doritos / Home / Center. Ask before guessing any bunker that is not readable on the image.

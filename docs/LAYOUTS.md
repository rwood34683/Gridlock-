# Layouts

`layouts/` is the 2026 layout pack, dropped in at the project root as its own
`layouts/CLAUDE.md` asks. It carries the catalog (`index.json`), the schema, one
JSON per event, and the official published stills that are the ground truth.

## The rule

**Bunker coordinates are never invented.** An event ships with `bunkers: []` and
`coordinate_status: "official_image_only"` until someone digitizes it from an
official labeled 2D. Only `nxl_2026_midwest_open` has one, so it is the only
event with coordinates.

| Event | Status | Coordinates | Bunkers |
|---|---|---|---|
| nxl_2026_midwest_open | published | `grid_digitized` | 58 |
| nxl_2026_tampa_bay_open | published | `official_image_only` | 0 |
| nxl_2026_tampa_bay_10v10 | published | `official_image_only` | 0 |
| nxleu_2026_czech_cup | published | `official_image_only` | 0 |
| wcppl_2026_defy_opener | published | `official_image_only` | 0 |
| mvps_2026_spring_skirmish | published | `official_image_only` | 0 |
| usxbl_2026_practice | practice only | `official_image_only` | 0 |
| nxl_2026_lone_star, nxl_2026_world_cup, wcppl_2026_championship, mvps_2026_southeastern_championship | unreleased | `none` | 0 |

## How the Midwest Open was digitized

Source: `layouts/images/nxl_2026_midwest_2d_labeled.jpg` (5698 × 4322), the
official NXL labeled 2D. Run it with:

```bash
python3 tools/digitize_layout.py   # measures -> tools/out/bunkers_measured.json
python3 tools/emit_layout.py       # writes the event JSON + the app layout
```

**1. Find the printed grid.** Grid lines are the dark, colour-neutral pixels
that run most of the image. Peak-finding across rows and columns gives 16
verticals and 13 horizontals — a 15 × 12 cell grid, which is the 150 ft × 120 ft
field at 10 ft per cell that the map itself prints in the margin. That fixes the
field rectangle at px (456, 472)–(5123, 4205) and the scale at **31.113 px/ft on
x, 31.108 px/ft on y**. The two axes agreeing to 0.02% is the first check that
the frame is right.

**2. Segment the paint.** Bunkers are red or blue. Each is rendered in 3D with a
near-black shaded face, so the test has a second clause for dark-but-coloured
pixels — bounded above, or the pale watermark printed under the field gets
counted as paint and stretches every footprint.

**3. Measure each bunker.** Inside a window per bunker, take the largest
connected blob and use its bounding-box centre. Largest-blob, not all-pixels, so
a stray watermark pixel in the window cannot move the answer.

**4. Split the beams objectively.** The snake is not one bar — it is nine 10-ft
sections butted end to end, each printed `SB`, with blue joints between them.
The joints are detected as blue columns inside the red run, at 29.1, 39.2, 49.4,
59.6, 69.9, 80.0, 90.3, 100.5, 110.8 and 120.8 ft. Sections are the gaps between
them, not a division by an assumed length.

**5. Name from the printed labels.** The left half and the centre are labeled;
the right half is an unlabeled mirror. Names come from the text on the map,
never from the shape.

### The check that matters

The layout is mirror-symmetric about the printed 50. Pairing every bunker with
its opposite number and averaging gives an axis of **74.84 ft, sd 0.21 ft**
across 25 pairs, and the eight centre-line bunkers land at 74.9–75.3 ft. The
printed centre line itself measures 75.15 ft. Nothing was snapped or forced to
make that come out — the residual is inside the width of the drawn line, which
is what says the digitization is sound.

`tools/out/` also holds an overlay render for eyeballing: every measured
footprint boxed on the original map.

### What is not asserted

Two cylinders on the sidelines at (1.4, 60.1) and (148.7, 60.1) are **drawn but
never labeled** on the official map. Their position and footprint are measured
like everything else; their name is not. They ship as `name: "UNLABELED"`,
`type: "tall_cylinder"`, with a note. Their footprint is identical to the
labeled `Br`, and the map's legend also lists a `TCK` (Tall Cake) that appears
nowhere labeled — so it is one of those two, and the map does not say which.
`layouts/CLAUDE.md` says to ask rather than guess, so they stay unnamed until
someone who knows the field says.

## Coordinate frame

The pack and the Gridlock field use the same frame, so feet carry across 1:1
with no rescaling:

- x: 0–150 ft, home end to away end, centre line at 75
- y: 0–120 ft, dorito side at 0, snake side at 120

Each app bunker also carries its measured `w`/`h` in feet, and the renderer
draws that footprint rather than a per-type guess. A layout without measured
sizes still falls back to the type table.

## Known gaps

- **The seeded breaks are not Midwest-specific.** Break paths are positions in
  the same 150 × 120 frame, so they draw correctly, but they were not traced
  against this layout's bunkers and do not plant on them. Per-layout paths are
  roadmap item 3 in `CLAUDE.md`.
- **`layouts/schema/layout.schema.json` is stale.** It requires `year`, `sources`
  and `files`; every event in the pack uses `season` and `views`, so that file
  fails all 11 events — including the ones nothing here has touched. The live
  schema is `layouts/schema.json`, which `layouts/CLAUDE.md` points at and which
  the digitized event validates against. Left as found rather than edited.
- Only the Midwest Open has an official labeled 2D. The other published events
  have images but no labeled grid, so they stay at `official_image_only`.

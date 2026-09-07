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

### The one thing the map does not say

Two cylinders on the sidelines at (1.4, 60.1) and (148.7, 60.1) are **drawn but
never labeled**. Their position and footprint are measured like everything else,
but a name cannot be read off the map, and the legend also lists a `TCK` (Tall
Cake) that appears nowhere labeled — so it was one of those two and the map does
not say which. `layouts/CLAUDE.md` says to ask rather than guess, so they shipped
as `UNLABELED` until the field owner confirmed them as **`Br`**, which is what
their 3.5 × 7.8 ft footprint already matched exactly. They now carry
`name: "Br"` with a note recording that the name came from confirmation rather
than from the printed map.

## Coordinate frame

The pack and the Gridlock field use the same frame, so feet carry across 1:1
with no rescaling:

- x: 0–150 ft, home end to away end, centre line at 75
- y: 0–120 ft, dorito side at 0, snake side at 120

Each app bunker also carries its measured `w`/`h` in feet, and the renderer
draws that footprint rather than a per-type guess. A layout without measured
sizes still falls back to the type table.

## Breakouts on a digitized layout

A break is written as **the bunker each player plants on**, not as a typed
coordinate — `BREAK_PLANTS` in `web/index.html` holds five bunker ids per break
per layout, and the position is resolved from the layout at draw time. So a
break stays true to the field even if the map is re-digitized, and a wrong id
falls back to the generic path rather than drawing a player into open turf.

All five leave the back-centre station together. Start slots are handed out in
target order so the fan reads instead of knotting, and anything planting on a
wire (y > 88 snake, y < 22 dorito) gets a via that cuts out early and runs the
tape rather than crossing the field.

The job label a coach reads off — "SB · snake wire", "MD · dorito wire" — comes
from the bunker's own code and its measured y, so it cannot drift out of sync
with the field.

## Team bunker calls

A team can rename any bunker for the event under **Team → Bunker calls**. The
call replaces the official code on every field in the app — Playbook, Scout,
Sightlines, Movement, Bunker stats — and is stored per layout, so naming a
bunker on the Midwest Open does not bleed into Tampa Bay. Clearing a call puts
the printed code back.

## Bunker stats

Marking a player out on Tally is one tap. After that, each log row takes an
optional **shot at** and **moved to** bunker; both are pickers over the current
layout, showing the team call where one is set. Bunker stats aggregates those
into outs and moves-in per bunker, tints each footprint on the field by total
traffic, and lists the table. Nothing is estimated — a bunker with no logged
traffic simply does not appear.

## Is the render exact?

`npm run verify:bunkers` does not take that on trust. It reads the SVG the
browser actually painted, converts each bunker group's bounding box back into
feet, and compares it to the event JSON **by bunker id** — never by whichever
shape happens to be nearest, so a cap or an inset cannot be mistaken for a
bunker of its own.

```
bunkers in the event JSON : 58
bunkers drawn on the field : 58
worst position error : 0.0000 ft  (0.00 in)
worst footprint error: 0.0000 ft  (0.00 in)
58/58 bunkers drawn within tolerance.
```

It caught one real defect when first written: a `ball` was drawn as a circle,
which cannot represent a footprint that is not perfectly square, so a cylinder
measured 4.0 x 3.9 ft came out 0.1 ft narrow. Balls are ellipses now.

Silhouettes follow the map too. Medium doritos point up the field, small
doritos and cakes point back down it, temples carry the inset the map prints,
bricks and snake-beam sections are capped at the ends, mini-Ws are banded,
wings are plain upright bars, and the giant plus is a cross.

### Colour is sampled too

The official map paints every bunker red or blue — that is how it tells a
cylinder from a tree at a glance — and the app now carries that. The colour is
**measured, not chosen**: for each bunker the digitizer samples the paint inside
that bunker's own connected blob, so a neighbour whose bounding box overlaps
cannot colour the answer, and records the dominant colour plus any contrasting
cap, band or inset along with the mean RGB behind the call.

| Type | Body | Detail |
|---|---|---|
| medium dorito, small dorito | red | — |
| tree, giant wing, giant plus, wing | red | — |
| temple, maya temple | red | blue inset |
| brick | red | blue caps |
| snake beam | red | blue joints |
| cylinder, cake, giant brick, mini w | blue | — |

Sampling by blob rather than by bounding box caught a real error: the
centre mini-W crosses the top snake beam, so measured on the combined mask its
blob merged with the beam and it came out 3.5 × 9.0 ft and "blue with a red
detail". Measured on the blue mask alone it is 2.0 × 6.9 ft, exactly like the
other three, and plainly blue.

Snake-beam sections are the one place the colour is carried rather than sampled
directly: a section measured on the red mask cannot see the blue joints printed
either side of it, so it takes the joint colour that was already detected when
the beam was split.

To keep the break readable on a field of the same two colours, the bunker reds
and blues sit a step darker than the wires (`#e5342f` / `#3d8bff`) and every
path runs over a black casing. Bunker stats draws its heat as an amber ring
rather than a red wash, which would vanish on a red bunker. A layout whose
colour was never sampled — the Tampa Bay footprint — stays neutral grey rather
than being guessed into one of the two.

## Known gaps
- **`layouts/schema/layout.schema.json` is stale.** It requires `year`, `sources`
  and `files`; every event in the pack uses `season` and `views`, so that file
  fails all 11 events — including the ones nothing here has touched. The live
  schema is `layouts/schema.json`, which `layouts/CLAUDE.md` points at and which
  the digitized event validates against. Left as found rather than edited.
- Only the Midwest Open has an official labeled 2D. The other published events
  have images but no labeled grid, so they stay at `official_image_only`.

#!/usr/bin/env python3
"""Measure the standard bunker footprints, once, off a clean official 2D.

A bunker type is one inflatable. The same medium dorito is trucked to Garland
that was in Cincinnati; it does not change size between events. What changes
between layouts is where the bunkers stand. So the honest split is: take every
position off the map for that event, and take the footprints from the one
source that can measure them properly.

That source is the unlabeled Midwest Open 2D. It is 5698 px across — 31.1 px
per foot, four times the Lone Star print — and it carries no printed grid, no
labels and no watermark, so the only dark thing anywhere near a bunker is the
bunker. All fourteen types are on it. The labeled Midwest map is the same
render with the annotations added, aligned to a couple of pixels, so the grid
measured there calibrates this one and the positions already read off it say
where to look.

What is measured is the whole silhouette: the lit face and the face the print
takes to black, which is a face of the bunker and not a shadow cast beside it.
Blow up any of these maps far enough and that is plain — a medium dorito is a
pyramid with one side in the light and one side in the dark, and reading the
lit side alone makes it four and a half feet wide instead of six and three
quarters, off centre by the difference, every time in the same direction.

Bunkers that stand against each other are one blob in the paint — the giant
wing sits on the giant brick, the snake runs through the mini Ws. Each reading
is bounded by a window around the bunker, generous enough to hold the whole of
it and too small to hold its neighbour as well; anything that still runs to
the edge of its window is fused and is dropped rather than guessed at. The
figure kept is the median of what is left, and the spread of the instances is
printed and stored, because a type whose instances disagree has been read
wrong.

Output: layouts/bunkers.json
"""
import json

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'layouts/images/nxl_2026_midwest_2d.jpg'
REF = 'tools/out/bunkers_measured.json'
OUT = 'layouts/bunkers.json'
MARGIN = 3.0        # ft of clear map kept around every bunker's own footprint

# The grid measured on the labeled Midwest map; the two renders are aligned.
X0, X1, Y0, Y1 = 456, 5123, 472, 4205
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)
PX, PY = (X1 - X0) / 150.0, (Y1 - Y0) / 120.0
px = lambda f: int(round(X0 + f * PX))
py = lambda f: int(round(Y0 + f * PY))

mx, mn = a.max(axis=2), a.min(axis=2)
SOLID = ((mx - mn) > 40) | (mx < 120)          # any painted face, lit or shaded
R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
LIT = (R > 110) & (R - G > 70) & (R - B > 60)  # the bright red top of a beam

# The snake on this field is drawn as one unbroken bar with the two giant
# pluses hanging off its ends, so no window can cut a section out of it. Those
# two types come off the lit top face, which the blue tick between sections
# does break. A beam's shaded edge is a few pixels on a bar two feet thick,
# and a plus is symmetric, so what the lit face loses on one side it keeps on
# the other.
ON_LIT = {'snake_beam', 'giant_plus', 'wing'}

# Five types stand hard against a bunker of the other colour — the cakes, the
# wings and the mini Ws hang off the red snake, the red giant wing sits on the
# blue giant brick — and no window can cut between them. For those, and only
# for those, each shaded pixel is handed to the colour of the nearest bright
# one and the two are labelled apart. It is not done everywhere because it
# would also cut the bunkers that carry a panel of the other colour: a temple
# is a red cube with a blue face let into it, and a brick has a blue cap.
BRIGHT = (mx - mn) > 60
_, (_iy, _ix) = ndimage.distance_transform_edt(~BRIGHT, return_indices=True)
REDSIDE = SOLID & (R[_iy, _ix] > B[_iy, _ix])
BLUESIDE = SOLID & ~(R[_iy, _ix] > B[_iy, _ix])
BY_COLOUR = {'cake': BLUESIDE, 'mini_w': BLUESIDE,
             'giant_brick': BLUESIDE, 'giant_wing': REDSIDE}


def read(b, m):
    """The bunker at this position in a window this wide, or None if it runs out."""
    hw = b['w_ft'] / 2 + m
    hh = b['h_ft'] / 2 + m
    x0, x1 = px(b['x_ft'] - hw), px(b['x_ft'] + hw)
    y0, y1 = py(b['y_ft'] - hh), py(b['y_ft'] + hh)
    full = LIT if b['type'] in ON_LIT else BY_COLOUR.get(b['type'], SOLID)
    win = full[y0:y1, x0:x1]
    lab, n = ndimage.label(win, np.ones((3, 3)))
    if n == 0:
        raise ValueError(f'no paint at {b["name"]} {b["x_ft"]},{b["y_ft"]}')
    sizes = ndimage.sum(win, lab, range(1, n + 1))
    m = lab == (int(np.argmax(sizes)) + 1)
    ys, xs = np.where(m)
    m = m.copy()
    if (xs.min() == 0 or ys.min() == 0
            or xs.max() == m.shape[1] - 1 or ys.max() == m.shape[0] - 1):
        return None                            # runs out of its own window
    w, h = (xs.max() - xs.min()) / PX, (ys.max() - ys.min()) / PY
    X = (xs - (xs.max() + xs.min()) / 2) / PX
    Y = (ys - (ys.max() + ys.min()) / 2) / PY
    vals, vecs = np.linalg.eigh(np.cov(np.vstack([X, Y])))
    v = vecs[:, int(np.argmax(vals))]
    along, across = X * v[0] + Y * v[1], -X * v[1] + Y * v[0]
    # A giant plus is a cross, and how wide its arms are is most of what it
    # looks like: drawn thin it reads as a spindly X where the map prints a
    # chunky one. Measured as the run across the blob a foot and a half inside
    # the tip, which is along an arm and clear of the middle.
    arm = None
    if b['type'] == 'giant_plus':
        col = xs.min() + int(1.5 * PX)
        rows = np.where(m[:, col])[0] if col < m.shape[1] else []
        if len(rows):
            arm = float((rows.max() - rows.min()) / PY)
    return dict(w=w, h=h, arm=arm, long=float(along.max() - along.min()),
                thick=float(across.max() - across.min()))


def measure(b):
    """The bunker at this position, read through the window that suits it.

    Keeping a neighbour out is what the window is for: a mini W stands under
    the snake and a wing under the beam, and a window drawn wide enough for a
    giant plus takes those in as well. So the bunker is read through several
    windows and the smallest complete blob wins.
    """
    got = [r for r in (read(b, m) for m in (0.8, 1.2, 1.8, 2.4, MARGIN))
           if r is not None]
    if not got:
        return None
    # Every reading here is a blob that fits inside its own window, so each is
    # the whole of something. Fusing only ever adds, so the smallest of them is
    # the one that is this bunker and not this bunker plus its neighbour.
    return min(got, key=lambda r: r['w'] * r['h'])


ref = json.load(open(REF))
seen, fused = {}, {}
for b in ref:
    m = measure(b)
    seen.setdefault(b['type'], [])
    fused.setdefault(b['type'], 0)
    if m is None:
        fused[b['type']] += 1
    else:
        seen[b['type']].append(m)

# Three types stand on the snake on this field and no window can cut them out
# of it. For those the reading comes from the other digitized layouts, whose
# prints are coarser but where the bunker stands on its own. Those readings
# carry the shaded face too, so it is the same measurement, taken further away.
ELSEWHERE = ['tools/out/lonestar_measured.json', 'tools/out/tampa_measured.json']
fallback = {}
for path in ELSEWHERE:
    try:
        rows = json.load(open(path))
    except FileNotFoundError:
        continue
    for b in rows:
        if seen.get(b['type']):
            continue
        fallback.setdefault(b['type'], []).append(
            dict(w=b['w_ft'], h=b['h_ft'],
                 long=b.get('long_ft') or b['w_ft'],
                 thick=b.get('thick_ft') or b['h_ft'], src=path))

table, report = {}, []
for kind in sorted(set(seen) | set(fallback)):
    ms = seen.get(kind) or []
    where = SRC
    if not ms:
        ms = fallback.get(kind) or []
        where = 'other layouts: ' + ', '.join(sorted({m['src'] for m in ms}))
    if not ms:
        print(f'  !! {kind}: every instance fused, and nowhere else to read it')
        continue
    if kind == 'snake_beam':
        # A beam is laid at an angle on some fields, so it is kept as a bar
        # with a length and a thickness rather than as a box.
        pairs = [(m['long'], m['thick']) for m in ms]
    else:
        # Which way a dorito points does not change the box it stands in, so
        # the long side and the short side are what is kept, not w and h.
        pairs = [(max(m['w'], m['h']), min(m['w'], m['h'])) for m in ms]
    hi = sorted(p for p, _ in pairs)
    lo = sorted(q for _, q in pairs)
    # Nothing on this map is cut off, so a reading can only come back too big —
    # a bunker fused to the one standing against it. The smallest instance is
    # therefore the one that is only itself, and with the clean types agreeing
    # to a tenth of a foot it is barely a different answer from their middle.
    best = min(pairs, key=lambda p: p[0] * p[1])
    arms = [m['arm'] for m in ms if m.get('arm')]
    table[kind] = dict(long_ft=round(best[0], 2), short_ft=round(best[1], 2),
                       **({'arm_ft': round(min(arms), 2)} if arms else {}),
                       median_ft=[round(float(np.median(hi)), 2),
                                  round(float(np.median(lo)), 2)],
                       n=len(ms), fused=fused.get(kind, 0), read_from=where)
    report.append((kind, len(ms), fused.get(kind, 0), hi[0], hi[-1], lo[0], lo[-1],
                   '' if where == SRC else '*'))

# ---- a second inflatable under the same printed name ---------------------
# A map that draws a bunker at a size the standard cannot account for is
# usually a measurement that ran into its neighbour or its own label, and the
# standard is the better answer. But not always: both the Lone Star and the
# Tampa Bay maps print a short squat Br in their back corners alongside the
# tall Br everywhere else. What tells the two apart is corroboration — a real
# second bunker is drawn the same on more than one field, a bad reading is
# not. So a variant is kept only when two different layouts draw it alike.
VARIANT_TOL = 0.75
LAYOUTS = {'midwest': REF,
           'lone star': 'tools/out/lonestar_measured.json',
           'tampa bay': 'tools/out/tampa_measured.json'}
odd = {}
for field, path in LAYOUTS.items():
    try:
        rows = json.load(open(path))
    except FileNotFoundError:
        continue
    for b in rows:
        std = table.get(b['type'])
        # A snake is drawn as one bar on some maps and as sections on others,
        # so a beam that reads long or fat has run into the section beside it.
        # There is no second beam to find here and every candidate is fusion.
        if not std or b['type'] == 'snake_beam':
            continue
        hi, lo = max(b['w_ft'], b['h_ft']), min(b['w_ft'], b['h_ft'])
        if (abs(hi - std['long_ft']) <= 1.5 and abs(lo - std['short_ft']) <= 1.5):
            continue
        odd.setdefault(b['type'], []).append((hi, lo, field))

variants = {}
for kind, rows in odd.items():
    for hi, lo, field in rows:
        near = [r for r in rows if abs(r[0] - hi) <= VARIANT_TOL
                and abs(r[1] - lo) <= VARIANT_TOL]
        if len({r[2] for r in near}) < 2:
            continue
        key = (kind, round(np.median([r[0] for r in near]) / VARIANT_TOL),
               round(np.median([r[1] for r in near]) / VARIANT_TOL))
        variants[key] = dict(type=kind,
                             long_ft=round(float(np.median([r[0] for r in near])), 2),
                             short_ft=round(float(np.median([r[1] for r in near])), 2),
                             n=len(near), fields=sorted({r[2] for r in near}))
for v in variants.values():
    table[v['type']].setdefault('variants', []).append(
        {k: v[k] for k in ('long_ft', 'short_ft', 'n', 'fields')})
    print(f"  variant: {v['type']} {v['long_ft']} x {v['short_ft']} ft "
          f"on {', '.join(v['fields'])} ({v['n']} instances)")

json.dump(dict(
    source=SRC,
    method=__doc__.strip(),
    px_per_ft=round((PX + PY) / 2, 3),
    margin_ft=MARGIN,
    spread=[dict(type=k, n=n, fused=f, long_ft=[round(p, 2), round(q, 2)],
                 short_ft=[round(r, 2), round(s, 2)])
            for k, n, f, p, q, r, s, _ in report],
    bunkers=table), open(OUT, 'w'), indent=2)

print(f'{OUT}: {len(table)} bunker types from {len(ref)} instances')
print(f"{'type':14s} {'n':>3s} {'fus':>4s}  {'long ft':>15s}  {'short ft':>15s}")
for k, n, f, p, q, r, s, star in report:
    print(f'{k:14s} {n:3d} {f:4d}  {p:6.2f} - {q:6.2f}  {r:6.2f} - {s:6.2f} {star}')
print('* read off the other layouts: fused to the snake on the clean map')

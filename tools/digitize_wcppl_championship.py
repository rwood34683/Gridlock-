#!/usr/bin/env python3
"""Digitize the WCPPL 2026 Championship (SC Village, Chino CA) from its 2D field map.

The same sheet as the USXBL JT map (tools/digitize_usxbl_jt.py) and the same
discipline: every coordinate is measured from the printed 10-ft grid on the 2D
the coach sent. Nothing is placed by hand. The only human input is which kind of
inflatable a measured blob is, and where a composite is split into its parts.

What is different about this sheet:

  * It is printed with the snake along the top and the doritos along the
    bottom: its numbers count down the left edge and up the right. The
    Gridlock frame has the snake at +y, so every reading is taken in the
    image's own frame and turned over at the end (y = 120 - y). Mirrored
    left-right it is the same field either way.

  * Touching bunkers are split where the drawing joins them:
      - the snake's four sections at the darker joints along the lit band
        (34.9, 45.5, 56.2 ft on the left; 93.8, 104.3, 115.1 on the right);
      - the cube and the two mini-Ws standing on the snake at the beam's
        top edge;
      - the centre beam at the centre line, with its wedge above it;
      - the dorito beam at its joints (65.5, 75.0, 84.5 ft), with the two
        big wedges and the centre wedge below it.

  * It carries no bunker labels. Each name is the kind of inflatable read off
    its shape and measured size against the book (layouts/bunkers.json), as
    on the JT map:
      - the cubes are T;
      - the corner blocks and the two stepped centre blocks are GB;
      - the balls and the small cans are C;
      - the pyramids and the wedges are MD;
      - the pointed caps on the two beams are SD;
      - the end-line uprights are Br;
      - the angled corner blocks on the dorito end are Br, laid at their angle.

Method
  1. Grid: 16 verticals x 13 horizontals, 46-1396 px by 27-1107 px, which is
     9.0 px/ft both ways.
  2. Inside each window, take the bounding box of the largest paint blob and
     use its centre.
  3. Report the mirror residual. The field is drawn symmetric about the
     centre line, so the axis the measurements imply checks the whole pass.
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

os.makedirs('tools/out', exist_ok=True)
SRC = 'layouts/images/wcppl_2026_championship_2d.jpg'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)

# ---- the printed grid: peaks of the grey rules ----------------------------
X0, X1, Y0, Y1 = 46, 1396, 27, 1107
PX, PY = (X1 - X0) / 150.0, (Y1 - Y0) / 120.0

R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
RED = (R > 110) & (R - G > 55) & (R - B > 45)
DARK = a.max(axis=2) < 95
ANY = RED | DARK

fx = lambda p: (p - X0) / PX
fy = lambda p: (p - Y0) / PY
px = lambda f: int(round(X0 + f * PX))
py = lambda f: int(round(Y0 + f * PY))

_blob = {}


def bbox(x0, y0, x1, y1, mask=ANY):
    sub = mask[py(y0):py(y1), px(x0):px(x1)]
    lab, n = ndimage.label(sub, np.ones((3, 3)))
    if n == 0:
        raise ValueError(f'no paint in window {(x0, y0, x1, y1)}')
    sizes = ndimage.sum(sub, lab, range(1, n + 1))
    sub = lab == (int(np.argmax(sizes)) + 1)
    _blob['m'] = sub
    ys, xs = np.where(sub)
    cx0, cx1 = fx(px(x0) + xs.min()), fx(px(x0) + xs.max())
    cy0, cy1 = fy(py(y0) + ys.min()), fy(py(y0) + ys.max())
    X = (fx(px(x0) + xs) - (cx0 + cx1) / 2)
    Y = (fy(py(y0) + ys) - (cy0 + cy1) / 2)
    vals, vecs = np.linalg.eigh(np.cov(np.vstack([X, Y])))
    v = vecs[:, int(np.argmax(vals))]
    ang = float(np.degrees(np.arctan2(v[1], v[0])))
    if ang > 90: ang -= 180
    if ang <= -90: ang += 180
    along = X * v[0] + Y * v[1]
    across = -X * v[1] + Y * v[0]
    return dict(x=round((cx0 + cx1) / 2, 1), y=round((cy0 + cy1) / 2, 1),
                w=round(cx1 - cx0, 1), h=round(cy1 - cy0, 1), a=round(ang, 1),
                long_ft=round(float(along.max() - along.min()), 1),
                thick_ft=round(float(across.max() - across.min()), 1))


def cross_angle():
    """Upright plus or turned on its corner, read off a ring inside the arms."""
    m = _blob['m']
    h, w = m.shape
    cy, cx = (h - 1) / 2, (w - 1) / 2
    r = 0.7 * min(h, w) / 2

    def ray(deg):
        hits = 0
        for d in (deg - 8, deg, deg + 8):
            t = np.radians(d)
            y, x = int(round(cy + r * np.sin(t))), int(round(cx + r * np.cos(t)))
            if 0 <= y < h and 0 <= x < w and m[y, x]:
                hits += 1
        return hits / 3
    axes = (ray(0) + ray(90) + ray(180) + ray(270)) / 4
    diags = (ray(45) + ray(135) + ray(225) + ray(315)) / 4
    return 45.0 if diags > axes else 0.0


B_ = []


def add(name, kind, x0, y0, x1, y1, mask=ANY, note=None):
    m = bbox(x0, y0, x1, y1, mask)
    e = dict(name=name, type=kind, x_ft=m['x'], y_ft=m['y'], w_ft=m['w'], h_ft=m['h'],
             angle_deg=m['a'], long_ft=m['long_ft'], thick_ft=m['thick_ft'],
             cross_deg=cross_angle() if kind == 'giant_plus' else None,
             # Every bunker on this map is printed red, with a near-black cap
             # and shaded face; black is not a pit colour, so no detail.
             body='red', detail=None)
    if note:
        e['note'] = note
    B_.append(e)
    return e


mir = lambda x0, x1: (150 - x1, 150 - x0)


def pair(name, kind, x0, y0, x1, y1, mask=ANY, note=None):
    """The bunker in the window, and the one in the window's mirror — each
    measured off its own paint; only the window is mirrored."""
    add(name, kind, x0, y0, x1, y1, mask, note)
    m0, m1 = mir(x0, x1)
    add(name, kind, m0, y0, m1, y1, mask, note)



# Windows are in the sheet's own frame: x as printed, y down from the snake.
# ---- the snake ---------------------------------------------------------------
pair('GB', 'giant_brick', 11.0, 12.0, 21.0, 25.5)
for x0, x1 in ((24.0, 34.9), (34.9, 45.5), (45.5, 56.2), (56.2, 67.3)):
    pair('SB', 'snake_beam', x0, 18.95, x1, 22.3, RED)
pair('T', 'temple', 33.0, 12.0, 39.6, 18.95)              # the cube on the snake
pair('MW', 'mini_w', 46.0, 9.5, 50.2, 18.95)               # and its two uprights
pair('MW', 'mini_w', 63.2, 9.5, 67.2, 18.95)
add('SD', 'small_dorito', 72.0, 22.0, 78.0, 27.2)          # the cap on the centre beam
add('SB', 'snake_beam', 64.7, 27.2, 75.0, 30.4, RED)
add('SB', 'snake_beam', 75.0, 27.2, 85.3, 30.4, RED)

# ---- the snake side ------------------------------------------------------------
pair('T', 'temple', 54.0, 34.0, 60.5, 40.5)
pair('T', 'temple', 23.5, 36.5, 30.5, 42.5)
pair('C', 'cylinder', 37.3, 47.0, 44.3, 52.5)
add('GB', 'giant_brick', 71.0, 43.0, 79.0, 56.0)           # the stepped centre block

# ---- the centre band -----------------------------------------------------------
pair('Br', 'brick', -5.0, 55.0, 2.5, 65.5,
     note='stands on the end line, half behind the field; measured where the map draws it')
pair('GP', 'giant_plus', 13.5, 54.5, 26.0, 66.0)
pair('T', 'temple', 65.5, 57.5, 70.5, 62.7)                # the two small cubes

# ---- the dorito side -----------------------------------------------------------
add('GB', 'giant_brick', 71.0, 64.5, 79.0, 76.8)           # and its twin across the band
pair('C', 'cylinder', 44.0, 67.5, 50.7, 73.0)
pair('T', 'temple', 25.7, 77.2, 32.5, 83.2)
pair('C', 'cylinder', 58.0, 79.6, 63.0, 84.8)
pair('MD', 'medium_dorito', 13.0, 86.8, 20.2, 93.6)
pair('C', 'cylinder', 44.4, 88.0, 50.0, 93.6)
pair('MD', 'medium_dorito', 25.6, 96.2, 34.2, 104.2)

# ---- the dorito wire -----------------------------------------------------------
for x0, x1 in ((55.0, 65.5), (65.5, 75.0), (75.0, 84.5), (84.5, 95.2)):
    add('SB', 'snake_beam', x0, 100.0, x1, 103.15, RED)
pair('MD', 'medium_dorito', 59.0, 103.25, 69.5, 110.5)     # the two wedges under it
add('SD', 'small_dorito', 71.0, 103.25, 79.0, 110.5)       # and its centre cap
pair('MD', 'medium_dorito', 42.0, 102.6, 51.0, 110.5)
pair('Br', 'brick', 5.5, 104.5, 15.6, 113.3)               # the angled corner block

# The sheet prints the snake along the top; the Gridlock frame has it at +y.
for b in B_:
    b['y_ft'] = round(120 - b['y_ft'], 1)
    if b.get('angle_deg') is not None:
        b['angle_deg'] = round(-b['angle_deg'], 1)
    if b.get('angle_deg') == -90.0:
        b['angle_deg'] = 90.0

# ---- checks -----------------------------------------------------------------
B_.sort(key=lambda b: (b['y_ft'], b['x_ft']))
json.dump(B_, open('tools/out/wcppl_champ_measured.json', 'w'), indent=1)

used, pairs = set(), []
for i, b in enumerate(B_):
    if i in used:
        continue
    best, bd = None, 9e9
    for j, o in enumerate(B_):
        if j == i or j in used or o['name'] != b['name']:
            continue
        d = abs(o['y_ft'] - b['y_ft']) + abs((o['x_ft'] + b['x_ft']) / 2 - 75) * 0.5
        if abs(o['y_ft'] - b['y_ft']) < 2.5 and abs(o['x_ft'] - b['x_ft']) > 4 and d < bd:
            best, bd = j, d
    if best is not None:
        used.add(i); used.add(best)
        pairs.append((b['x_ft'] + B_[best]['x_ft']) / 2)

ax = float(np.mean(pairs)) if pairs else float('nan')
sd = float(np.std(pairs)) if pairs else float('nan')
print(f'{len(B_)} bunkers measured')
print(f'mirror check: {len(pairs)} pairs, axis {ax:.2f} ft, sd {sd:.2f} ft')
print('unpaired:', [(B_[i]['name'], B_[i]['x_ft'], B_[i]['y_ft']) for i in range(len(B_)) if i not in used])
print(f'px per ft: x {PX:.4f}, y {PY:.4f}')

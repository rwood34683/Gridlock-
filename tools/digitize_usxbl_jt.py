#!/usr/bin/env python3
"""Digitize the USXBL 2026 JT Championship layout from its 2D field map.

Same discipline as the NXL passes (tools/digitize_lonestar.py): every
coordinate is measured from the printed 10-ft grid on the map the field owner
published. Nothing is placed by hand — the only human input is which kind of
inflatable a measured blob is, and where a composite is split into its parts.

What is different about this source:

  * It is a white sheet with a light grey grid, not the dark NXL print. Paint
    is red, and every bunker's shaded face and cap are printed near black, so
    the footprint is red paint plus near-black — the grid, the watermark and
    the axis labels are all mid-grey and never reach either test.

  * It carries no printed bunker labels. Names come from the kind of
    inflatable each one is, read off its shape and its measured size against
    the standard book (layouts/bunkers.json). That is a reading of the
    drawing, and the event file says so.

  * Several bunkers touch: the snake's four sections run into the corner
    block and sit over the two blocks and the cake under them, the centre
    beam carries a ball on each end, and the bridge and the two Ls end in a
    mini-W. Those are split where the drawing joins them: beam joints are the
    brightness dips along the lit band (35.3, 46.0, 56.7 ft on the left snake;
    93.2, 103.9, 114.6 on the right; 60.2 on the centre beam), and the bridge
    is split at the field's own centre line, where its joint is drawn — the
    one dip off it, at 70.3 ft, is the watermark under the beam and has no
    mirror.

Method
  1. Detect the printed grid: 16 verticals x 13 horizontals = 15 x 12 cells.
  2. Inside each window, take the bounding box of the largest paint blob and
     use its centre.
  3. Report the mirror residual: the field is drawn symmetric about the
     centre line, so the axis the measurements imply checks the whole pass.
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

os.makedirs('tools/out', exist_ok=True)
SRC = 'layouts/images/usxbl_2026_jt_championship_2d.jpg'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)

# ---- the printed grid (peaks of the grey rules; see the module docstring) --
X0, X1, Y0, Y1 = 48, 1382, 30, 1097
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


# ---- the dorito wire ------------------------------------------------------
add('MD', 'medium_dorito', 70.8, 9.4, 79.4, 17.6)        # on the centre line
add('MD', 'medium_dorito', 70.8, 25.9, 79.4, 34.1)
pair('MD', 'medium_dorito', 51.8, 12.7, 60.8, 20.9)
pair('MD', 'medium_dorito', 35.5, 19.9, 44.3, 28.1)
pair('GB', 'giant_brick', 21.9, 10.4, 30.7, 20.6)
pair('SD', 'small_dorito', 23.6, 36.4, 30.4, 43.2)
pair('T', 'temple', 7.0, 29.1, 15.0, 35.3)
pair('C', 'cylinder', 57.1, 35.1, 62.1, 40.5)
pair('T', 'temple', 37.9, 43.7, 45.7, 50.5)

# ---- the centre band --------------------------------------------------------
pair('GP', 'giant_plus', 7.8, 54.3, 20.4, 65.7)
pair('Br', 'brick', -4.0, 55.2, 1.8, 65.0,
     note='stands on the end line, half behind the field; measured where the map draws it')
pair('C', 'cylinder', 54.6, 57.4, 61.0, 62.6)
add('C', 'cylinder', 72.4, 45.2, 77.6, 49.6)               # the centre beam's top ball
add('C', 'cylinder', 72.4, 70.9, 77.6, 75.3)               # and its bottom one
add('SB', 'snake_beam', 73.2, 49.6, 76.8, 60.2, RED)
add('SB', 'snake_beam', 73.2, 60.2, 76.8, 71.0, RED)
pair('T', 'temple', 35.0, 66.8, 43.2, 73.4)

# ---- the snake side ---------------------------------------------------------
pair('T', 'temple', 23.7, 76.7, 30.1, 84.1)
pair('C', 'cylinder', 58.7, 79.2, 63.5, 84.6)
pair('T', 'temple', 7.3, 85.0, 15.1, 91.2)
pair('SB', 'snake_beam', 36.2, 89.8, 47.6, 92.6, RED)     # the L's arm
pair('MW', 'mini_w', 48.2, 89.6, 50.8, 99.0)               # and its upright
pair('MW', 'mini_w', 60.9, 95.7, 63.6, 105.9)              # the bridge's legs
add('SB', 'snake_beam', 64.2, 96.2, 75.0, 98.8, RED)       # the bridge
add('SB', 'snake_beam', 75.0, 96.2, 85.8, 98.8, RED)

# ---- the snake --------------------------------------------------------------
pair('GB', 'giant_brick', 17.4, 99.4, 25.5, 113.6)
for x0, x1 in ((25.6, 35.3), (35.3, 46.0), (46.0, 56.7), (56.7, 67.9)):
    pair('SB', 'snake_beam', x0, 108.1, x1, 111.2, RED)
pair('T', 'temple', 33.4, 111.3, 38.9, 118.2)
pair('Ck', 'cake', 46.4, 111.3, 52.6, 116.8)
pair('T', 'temple', 63.4, 111.3, 68.3, 118.0)

# ---- checks -----------------------------------------------------------------
B_.sort(key=lambda b: (b['y_ft'], b['x_ft']))
json.dump(B_, open('tools/out/usxbl_jt_measured.json', 'w'), indent=1)

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

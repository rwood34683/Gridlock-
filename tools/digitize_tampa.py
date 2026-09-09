#!/usr/bin/env python3
"""Digitize the NXL 2026 Tampa Bay Open layout from the official labeled 2D.

Same discipline as tools/digitize_layout.py (Midwest): every coordinate is
measured from the printed 10-ft grid on the official map. Nothing is placed by
hand — the only human input is which measured blob carries which printed label.

Two differences from the Midwest pass, both forced by the source:

  * This map is 1080 px wide, not 5123. That is 5.89 px/ft against Midwest's
    31.1, so a one-pixel edge is 0.17 ft here rather than 0.03. Footprints are
    reported to a tenth of a foot and no further.

  * Bunkers are lit from the upper left, so the bright top face sits left of
    the true centre. Segmenting on bright paint alone biases every reading the
    same way — measured on bright paint only, the mirror axis lands at 74.1 ft
    against a printed centre line at 75.0. So bright paint is used only to
    separate neighbours into windows; the footprint itself is measured on the
    full paint, lit face and shaded face together, which is what the printed
    shape actually covers.

Method
  1. Detect the printed grid: 16 verticals x 13 horizontals = 15 x 12 cells.
  2. Segment bright paint to locate each bunker; that fixes a window.
  3. Inside each window, measure the bounding box of the largest full-paint
     blob and take its centre.
  4. Report the mirror residual: this field is drawn symmetric about the centre
     line, so the axis the measurements imply is a check on the whole pass.
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

os.makedirs('tools/out', exist_ok=True)
SRC = 'layouts/images/nxl_2026_tampa_2d.jpg'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)

# ---- the printed grid ----------------------------------------------------
X0, X1, Y0, Y1 = 86, 970, 90, 796
PX, PY = (X1 - X0) / 150.0, (Y1 - Y0) / 120.0

R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
# Full paint: lit face and shaded face. The upper bound on the shaded clause
# keeps the pale watermark printed under the field out of the measurement.
RED = ((R > 90) & (R - G > 55) & (R - B > 45)) | ((R > 34) & (R < 150) & (R - G > 18) & (R - B > 14))
BLUE = ((B > 90) & (B - R > 40) & (B - G > 30)) | ((B > 34) & (B < 160) & (B - R > 16) & (B - G > 12))
ANY = RED | BLUE

fx = lambda p: (p - X0) / PX
fy = lambda p: (p - Y0) / PY
px = lambda f: int(round(X0 + f * PX))
py = lambda f: int(round(Y0 + f * PY))

_blob = {}


def bbox(x0, y0, x1, y1, mask=ANY):
    """Bounding-box centre of the largest paint blob inside a ft window."""
    sub = mask[py(y0):py(y1), px(x0):px(x1)]
    lab, n = ndimage.label(sub, np.ones((3, 3)))
    if n == 0:
        raise ValueError(f'no paint in window {(x0, y0, x1, y1)}')
    sizes = ndimage.sum(sub, lab, range(1, n + 1))
    sub = lab == (int(np.argmax(sizes)) + 1)
    _blob['m'] = sub
    _blob['ox'], _blob['oy'] = px(x0), py(y0)
    ys, xs = np.where(sub)
    cx0, cx1 = fx(px(x0) + xs.min()), fx(px(x0) + xs.max())
    cy0, cy1 = fy(py(y0) + ys.min()), fy(py(y0) + ys.max())
    # Principal axis of the blob, in feet. A bunker drawn square to the field
    # comes back at 0 or 90 degrees and nothing uses this; a beam laid across
    # the field at an angle does not, and its bounding box is a poor model of
    # it — far too fat — for both drawing and for what it blocks.
    X = (fx(px(x0) + xs) - (cx0 + cx1) / 2)
    Y = (fy(py(y0) + ys) - (cy0 + cy1) / 2)
    cov = np.cov(np.vstack([X, Y]))
    vals, vecs = np.linalg.eigh(cov)
    v = vecs[:, int(np.argmax(vals))]
    ang = float(np.degrees(np.arctan2(v[1], v[0])))
    if ang > 90: ang -= 180
    if ang <= -90: ang += 180
    along = X * v[0] + Y * v[1]
    across = -X * v[1] + Y * v[0]
    return dict(x=round((cx0 + cx1) / 2, 1), y=round((cy0 + cy1) / 2, 1),
                w=round(cx1 - cx0, 1), h=round(cy1 - cy0, 1),
                a=round(ang, 1),
                long_ft=round(float(along.max() - along.min()), 1),
                thick_ft=round(float(across.max() - across.min()), 1))


def paint():
    """Which paint the map uses for the bunker just measured."""
    m, ox, oy = _blob['m'], _blob['ox'], _blob['oy']
    h, w = m.shape
    r = RED[oy:oy + h, ox:ox + w] & m
    b = BLUE[oy:oy + h, ox:ox + w] & m
    sub = a[oy:oy + h, ox:ox + w]
    nr, nb = int(r.sum()), int(b.sum())
    if nr + nb == 0:
        return dict(body=None, detail=None)
    mean = lambda k: [int(v) for v in sub[k].mean(axis=0)] if k.sum() else None
    order = sorted([('red', nr, r), ('blue', nb, b)], key=lambda t: -t[1])
    (bn, bc, bm), (dn, dc, dm) = order
    share = dc / (nr + nb)
    return dict(body=bn, body_rgb=mean(bm), detail=(dn if share > 0.04 else None),
                detail_rgb=(mean(dm) if share > 0.04 else None),
                detail_share=round(share, 3))


B_ = []


def add(name, kind, x0, y0, x1, y1, mask=ANY, note=None):
    m = bbox(x0, y0, x1, y1, mask)
    c = paint()
    e = dict(name=name, type=kind, x_ft=m['x'], y_ft=m['y'], w_ft=m['w'], h_ft=m['h'],
             angle_deg=m['a'], long_ft=m['long_ft'], thick_ft=m['thick_ft'],
             body=c['body'], detail=c['detail'],
             body_rgb=c.get('body_rgb'), detail_rgb=c.get('detail_rgb'))
    if note:
        e['note'] = note
    B_.append(e)
    return e


# ---- dorito wire: the row across the top --------------------------------
add('Br', 'brick', 7.0, 13.5, 16.5, 22.5, BLUE)
add('Br', 'brick', 133.5, 13.5, 143.0, 22.5, BLUE)
add('SD', 'small_dorito', 20.5, 8.5, 28.5, 16.5)
add('SD', 'small_dorito', 120.0, 8.5, 128.0, 16.5)
for x in (35.0, 51.5):
    add('MD', 'medium_dorito', x, 8.5, x + 8.0, 17.5)
for x in (87.5, 104.5):
    add('MD', 'medium_dorito', x, 8.5, x + 8.0, 17.5)
add('GP', 'giant_plus', 67.5, 8.5, 82.5, 23.0, RED)

# ---- second band: mini-Ws, the side doritos, the first trees ------------
add('MW', 'mini_w', 27.5, 25.5, 35.0, 35.5, BLUE)
add('MW', 'mini_w', 115.5, 25.5, 123.0, 35.5, BLUE)
add('MD', 'medium_dorito', 12.5, 32.5, 20.5, 41.5)
add('MD', 'medium_dorito', 128.0, 30.5, 137.5, 42.0)
add('Tr', 'tree', 58.0, 28.5, 65.0, 35.5, RED)
add('Tr', 'tree', 85.0, 28.5, 92.0, 35.5, RED)
# The mini-W at the apex of the snake-beam V. Blue-only, or the blob runs
# straight down the beam it sits on.
add('MW', 'mini_w', 72.5, 28.0, 78.0, 38.0, BLUE)
# Maya temples and temples are drawn as a dark cube with a blue inset. The
# inset is what finds them, but the cube is the footprint — measuring the inset
# alone reports a bunker half its real size, which is what it did first time.
add('MT', 'maya_temple', 46.9, 37.2, 53.3, 43.6)
add('MT', 'maya_temple', 96.7, 37.2, 103.1, 43.6)

# ---- the V: four snake-beam sections, split at the printed blue joints ---
add('SB', 'snake_beam', 66.0, 37.5, 75.4, 45.0, RED)
add('SB', 'snake_beam', 75.4, 37.5, 84.5, 45.0, RED)
add('SB', 'snake_beam', 59.5, 44.5, 67.5, 51.6, RED)
add('SB', 'snake_beam', 83.0, 44.5, 91.0, 51.6, RED)
add('Tr', 'tree', 71.5, 45.0, 78.5, 52.0, RED)
add('GW', 'giant_wing', 53.0, 50.5, 62.0, 60.0, RED)
add('GW', 'giant_wing', 88.0, 50.5, 97.0, 60.0, RED)

# ---- the ends: temples and the unlabeled sideline cylinders --------------
add('T', 'temple', 9.3, 57.1, 15.7, 63.5)
add('T', 'temple', 134.4, 57.1, 140.8, 63.5)
add('Br', 'brick', 0.4, 55.5, 6.0, 65.5, RED,
    note='no printed label on the official map; footprint matches the labeled Br')
add('Br', 'brick', 144.5, 55.5, 149.6, 65.5, RED,
    note='no printed label on the official map; footprint matches the labeled Br')

# ---- centre: the four cylinders -----------------------------------------
add('C', 'cylinder', 36.5, 65.0, 43.5, 72.0, BLUE)
add('C', 'cylinder', 106.5, 65.0, 113.5, 72.0, BLUE)
add('C', 'cylinder', 64.5, 66.5, 71.5, 73.5, BLUE)
add('C', 'cylinder', 78.5, 66.5, 85.5, 73.5, BLUE)

# ---- snake side: temples, giant bricks, the lower mini-W ----------------
add('T', 'temple', 14.9, 74.8, 21.3, 81.2)
add('T', 'temple', 128.6, 74.8, 135.0, 81.2)
add('GB', 'giant_brick', 54.5, 79.0, 61.5, 91.0, BLUE)
add('GB', 'giant_brick', 89.0, 79.0, 96.0, 91.0, BLUE)
add('MW', 'mini_w', 72.5, 85.0, 78.0, 95.5, BLUE)
add('MT', 'maya_temple', 9.3, 94.8, 15.7, 101.2)
add('MT', 'maya_temple', 133.8, 94.8, 140.2, 101.2)

# ---- the snake: the bottom V and the long beam each side ----------------
add('SB', 'snake_beam', 62.0, 93.0, 71.0, 101.0, RED)
add('SB', 'snake_beam', 79.0, 93.0, 88.0, 101.0, RED)
add('GP', 'giant_plus', 68.0, 95.0, 82.5, 109.0, RED)
for x in (25.0, 35.2, 45.4, 55.6):
    add('SB', 'snake_beam', x, 100.8, x + 10.2, 103.4, RED)
for x in (84.5, 94.7, 104.9, 115.1):
    add('SB', 'snake_beam', x, 100.8, x + 10.2, 103.4, RED)
add('Ck', 'cake', 31.5, 103.4, 38.5, 108.0, BLUE)
add('Ck', 'cake', 112.0, 103.4, 119.0, 108.0, BLUE)
add('Br', 'brick', 41.5, 103.4, 48.0, 111.0, RED)
add('Br', 'brick', 102.0, 103.4, 108.5, 111.0, RED)
add('Wg', 'wing', 56.5, 103.4, 63.5, 111.0, RED)
add('Wg', 'wing', 86.5, 103.4, 93.5, 111.0, RED)

# ---- checks --------------------------------------------------------------
B_.sort(key=lambda b: (b['y_ft'], b['x_ft']))
json.dump(B_, open('tools/out/tampa_measured.json', 'w'), indent=1)

# This field is drawn symmetric about the centre line. Pairing each bunker
# with its opposite number gives an axis; how tightly those agree is the
# check on the whole pass, and it is not something the windows can fake.
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
print(f'mirror check: {len(pairs)} pairs, axis {ax:.2f} ft, sd {sd:.2f} ft '
      f'(printed centre line measures {fx(528):.2f} ft)')
unpaired = [B_[i]["name"] for i in range(len(B_)) if i not in used]
print(f'unpaired: {unpaired}')
PY_SCALE = dict(x=round(PX, 4), y=round(PY, 4))
print(f'px per ft: {PY_SCALE}')

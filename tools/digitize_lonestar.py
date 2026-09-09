#!/usr/bin/env python3
"""Digitize the NXL 2026 Lone Star Open layout from the official labeled 2D.

Same method as tools/digitize_tampa.py, on a better source: every coordinate is
measured from the printed 10-ft grid on the official map. Nothing is placed by
hand — the only human input is which measured blob carries which printed label.

This map is 1500 px wide — 8.19 px/ft, against Tampa's 5.89 and Midwest's
31.1 — so a one-pixel edge is 0.12 ft. Same lighting caveat as Tampa: the
bright top face sits left of centre, so bright paint only separates neighbours
into windows and the footprint is measured on lit and shaded face together.

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
SRC = 'layouts/images/nxl_2026_lonestar_2d_labeled.jpg'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)

# ---- the printed grid ----------------------------------------------------
X0, X1, Y0, Y1 = 121, 1349, 127, 1110
PX, PY = (X1 - X0) / 150.0, (Y1 - Y0) / 120.0

R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
# Full paint: lit face and shaded face. The upper bound on the shaded clause
# keeps the pale watermark printed under the field out of the measurement.
RED = ((R > 90) & (R - G > 55) & (R - B > 45)) | ((R > 34) & (R < 150) & (R - G > 18) & (R - B > 14))
BLUE = ((B > 90) & (B - R > 40) & (B - G > 30)) | ((B > 34) & (B < 160) & (B - R > 16) & (B - G > 12))
ANY = RED | BLUE
# A beam section physically touches the giant plus it runs into, so any window
# holding both gets one blob and the beam comes back several feet thick. The
# lit faces are separate blobs, so beams are measured on those. On a bar two
# feet thick the lighting bias is a fraction of a foot, and the mirror check
# below is what says whether that held.
RED_LIT = (R > 110) & (R - G > 70) & (R - B > 60)

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
add('Wg', 'wing', 8.0, 13.5, 15.0, 22.5, RED)
add('Wg', 'wing', 134.5, 13.5, 141.5, 22.5, RED)
add('MT', 'maya_temple', 24.0, 18.5, 30.8, 25.4)
add('MT', 'maya_temple', 118.5, 18.5, 125.3, 25.4)
add('SD', 'small_dorito', 35.5, 14.5, 42.5, 21.5)
add('SD', 'small_dorito', 105.5, 14.5, 112.5, 21.5)
for x in (48.5, 61.8, 78.3, 91.7):
    add('MD', 'medium_dorito', x, 9.0, x + 7.0, 17.5)
add('GP', 'giant_plus', 68.5, 18.5, 81.5, 31.0, RED)

# ---- the upper V: four beam sections, the temples and bricks beside it ---
add('SB', 'snake_beam', 63.3, 28.8, 71.2, 36.9, RED_LIT)
add('SB', 'snake_beam', 79.2, 29.0, 86.7, 36.7, RED_LIT)
add('SB', 'snake_beam', 56.2, 36.2, 63.7, 43.9, RED_LIT)
add('SB', 'snake_beam', 86.5, 36.2, 94.0, 43.9, RED_LIT)
add('T', 'temple', 14.4, 33.8, 21.2, 40.6)
add('T', 'temple', 128.4, 34.3, 135.2, 41.1)
add('Br', 'brick', 45.0, 36.0, 51.3, 44.8, RED)
add('Br', 'brick', 98.4, 36.0, 104.7, 44.8, RED)
add('GB', 'giant_brick', 72.5, 39.5, 77.7, 50.7, BLUE)

# ---- the centre band -----------------------------------------------------
add('C', 'cylinder', 35.3, 45.7, 40.7, 51.1, BLUE)
add('C', 'cylinder', 108.9, 45.4, 114.3, 50.8, BLUE)
add('C', 'cylinder', 9.3, 57.2, 14.7, 62.6, BLUE)
add('C', 'cylinder', 135.0, 57.0, 140.4, 62.4, BLUE)
add('Br', 'brick', 0.3, 55.5, 5.0, 65.0, RED,
    note='no printed label on the official map; footprint matches the labeled Br')
add('Br', 'brick', 145.5, 55.5, 149.7, 65.0, RED,
    note='no printed label on the official map; footprint matches the labeled Br')
add('GW', 'giant_wing', 47.5, 56.5, 55.5, 63.5, RED)
add('GW', 'giant_wing', 93.5, 56.5, 101.5, 63.5, RED)
add('Tr', 'tree', 65.5, 57.4, 70.9, 62.8, RED)
add('Tr', 'tree', 78.9, 57.3, 84.3, 62.7, RED)
add('GB', 'giant_brick', 72.3, 69.4, 77.5, 80.6, BLUE)

# ---- the lower V ---------------------------------------------------------
add('MT', 'maya_temple', 34.0, 68.9, 40.8, 75.7)
add('MT', 'maya_temple', 108.4, 68.9, 115.2, 75.7)
add('Tr', 'tree', 65.3, 77.2, 70.7, 82.6, RED)
add('Tr', 'tree', 78.7, 77.3, 84.1, 82.7, RED)
add('SB', 'snake_beam', 56.0, 76.4, 63.5, 84.1, RED_LIT)
add('SB', 'snake_beam', 86.1, 76.4, 93.6, 84.1, RED_LIT)
add('SB', 'snake_beam', 63.0, 83.4, 71.0, 91.5, RED_LIT)
add('SB', 'snake_beam', 78.9, 83.6, 86.4, 91.3, RED_LIT)
add('T', 'temple', 14.4, 78.0, 21.2, 84.8)
add('T', 'temple', 128.1, 78.0, 134.9, 84.8)

# ---- the snake -----------------------------------------------------------
add('MW', 'mini_w', 28.3, 90.5, 33.9, 100.0, BLUE)
add('MW', 'mini_w', 116.2, 90.5, 121.8, 100.0, BLUE)
add('GP', 'giant_plus', 68.5, 89.0, 81.5, 101.0, RED)
for x in (30.3, 45.0, 55.2):
    add('SB', 'snake_beam', x, 98.0, x + 9.4, 100.6, RED_LIT)
for x in (85.0, 95.3, 110.2):
    add('SB', 'snake_beam', x, 98.0, x + 9.4, 100.6, RED_LIT)
add('Ck', 'cake', 34.6, 99.8, 41.2, 104.4, BLUE)
add('Ck', 'cake', 108.8, 99.8, 115.4, 104.4, BLUE)
add('MW', 'mini_w', 52.5, 100.0, 57.3, 107.5, BLUE)
add('MW', 'mini_w', 92.7, 100.0, 97.5, 107.5, BLUE)
add('Br', 'brick', 8.5, 99.5, 15.0, 105.5, BLUE)
add('Br', 'brick', 134.5, 99.5, 141.0, 105.5, BLUE)
add('MD', 'medium_dorito', 62.5, 103.5, 70.3, 108.0, RED)
add('MD', 'medium_dorito', 79.3, 103.5, 87.1, 108.0, RED)

# ---- checks --------------------------------------------------------------
B_.sort(key=lambda b: (b['y_ft'], b['x_ft']))
json.dump(B_, open('tools/out/lonestar_measured.json', 'w'), indent=1)

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
      f'(printed centre line measures {fx(736):.2f} ft)')
unpaired = [B_[i]["name"] for i in range(len(B_)) if i not in used]
print(f'unpaired: {unpaired}')
PY_SCALE = dict(x=round(PX, 4), y=round(PY, 4))
print(f'px per ft: {PY_SCALE}')

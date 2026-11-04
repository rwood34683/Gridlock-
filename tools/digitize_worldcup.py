#!/usr/bin/env python3
"""Digitize the NXL 2026 World Cup layout from the official labeled 2D.

Made from tools/digitize_lonestar.py, as docs/WORLD-CUP-LAYOUT.md says: the
same method on the same style of map. Every coordinate is measured from the
printed 10-ft grid; nothing is placed by hand — the only human input is which
measured blob carries which printed label, and the windows that separate
neighbours.

This map is 2048 px wide — 11.14 px/ft — so a one-pixel edge is 0.09 ft. It is
lit from the upper left like the Lone Star print, so bright paint only
separates neighbours into windows and the footprint is measured on lit and
shaded face together. The snake beams touch the bunkers they run into, so
they are measured on their lit faces alone, as on Lone Star.

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

from mapread import attach_shade, contact_run, open_radius, rules, shadow

os.makedirs('tools/out', exist_ok=True)
SRC = 'layouts/images/nxl_2026_worldcup_2d_labeled.jpg'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)

# ---- the printed grid ----------------------------------------------------
# Detected off this image: the field border and the fifteen by twelve 10-ft
# cells inside it (verticals every 111.4 px, horizontals every 111.4 px).
X0, X1, Y0, Y1 = 167, 1838.5, 171.5, 1508.5
PX, PY = (X1 - X0) / 150.0, (Y1 - Y0) / 120.0

R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
# Full paint: lit face and shaded face. The upper bound on the shaded clause
# keeps the pale watermark printed under the field out of the measurement.
RED = ((R > 90) & (R - G > 55) & (R - B > 45)) | ((R > 34) & (R < 150) & (R - G > 18) & (R - B > 14))
BLUE = ((B > 90) & (B - R > 40) & (B - G > 30)) | ((B > 34) & (B < 160) & (B - R > 16) & (B - G > 12))
ANY = RED | BLUE
# The face in shadow is part of the bunker and the print takes it to black, so
# colour alone measures the lit half of everything; tools/mapread.py has the
# picture that settles it. The grid is masked off first — a rule is black too.
GX = [X0 + i * 10 * PX for i in range(16)] + [X0 + 75 * PX]
GY = [Y0 + j * 10 * PY for j in range(13)]
DARK = shadow(a, rules(a.shape, GX, GY, 3))
OPEN_R = open_radius((PX + PY) / 2)
CONTACT = contact_run((PX + PY) / 2)
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


def bbox(x0, y0, x1, y1, mask=ANY, shade=True):
    """Bounding-box centre of the largest paint blob inside a ft window."""
    sub = mask[py(y0):py(y1), px(x0):px(x1)]
    lab, n = ndimage.label(sub, np.ones((3, 3)))
    if n == 0:
        raise ValueError(f'no paint in window {(x0, y0, x1, y1)}')
    sizes = ndimage.sum(sub, lab, range(1, n + 1))
    sub = lab == (int(np.argmax(sizes)) + 1)
    if shade:
        sub = attach_shade(sub, DARK[py(y0):py(y1), px(x0):px(x1)], OPEN_R, CONTACT)
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


def cross_angle():
    """Is the plus just measured printed upright, or turned on its corner?

    A giant plus is drawn either way on these maps — Tampa prints one of each —
    so it has to be read off the paint rather than assumed. Sampling the corners
    of the bounding box against the middle of its sides would do it, except that
    a snake beam landing on an arm tip sits in exactly those places. So this
    reads a ring well inside the arms instead: at seven tenths of the way out, an
    upright plus has paint along the four axes and none on the diagonals, and a
    plus on its corner has exactly the opposite.
    """
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

    # Only the lower half is read. On both maps the beams land on the two upper
    # arm tips, so anything sampled up there is measuring a beam, not the plus.
    axes = ray(90)
    diags = (ray(45) + ray(135)) / 2
    return 45.0 if diags > axes else 0.0


B_ = []


def add(name, kind, x0, y0, x1, y1, mask=ANY, note=None, cross=None, shade=True,
        pad=1.5):
    # The windows below were drawn around the lit paint. The whole bunker is
    # wider than that, so every window gets a margin; the blob that carries the
    # label is still chosen by its colour, so the margin cannot swap bunkers.
    m = bbox(x0 - pad, y0 - pad, x1 + pad, y1 + pad, mask, shade)
    c = paint()
    e = dict(name=name, type=kind, x_ft=m['x'], y_ft=m['y'], w_ft=m['w'], h_ft=m['h'],
             angle_deg=m['a'], long_ft=m['long_ft'], thick_ft=m['thick_ft'],
             cross_deg=(cross if cross is not None
                        else (cross_angle() if kind == 'giant_plus' else None)),
             body=c['body'], detail=c['detail'],
             body_rgb=c.get('body_rgb'), detail_rgb=c.get('detail_rgb'))
    if note:
        e['note'] = note
    B_.append(e)
    return e



def W(cx, cy, w, h):
    """A window around the lit paint measured at (cx, cy), w by h feet."""
    return (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)


# ---- dorito wire: the row across the top --------------------------------
# The shaded face of a dorito is on its right, so each window reaches well
# past the lit paint on that side.
for cx in (48.7, 65.2, 81.8, 98.6):
    add('MD', 'medium_dorito', *W(cx + 1.4, 13.2, 6.5, 6.4), RED, pad=0.6)
add('SD', 'small_dorito', *W(37.0, 18.1, 4.6, 4.6), RED, pad=0.6)
add('SD', 'small_dorito', *W(111.9, 18.3, 4.6, 4.6), RED, pad=0.6)
# The two corner doritos are printed on their side, pointing in at the 50.
add('MD', 'medium_dorito', *W(22.3, 23.4, 4.3, 6.4), RED, pad=2.0,
    note='printed on its side, pointing toward the 50')
add('MD', 'medium_dorito', *W(126.8, 22.2, 5.7, 3.8), RED, pad=2.0,
    note='printed on its side, pointing toward the 50')
add('MT', 'maya_temple', *W(51.9, 27.7, 4.6, 4.0))
add('MT', 'maya_temple', *W(97.3, 27.7, 4.6, 4.0))
add('Tr', 'tree', *W(75.0, 28.5, 3.4, 3.3), RED)

# ---- the dorito half of the centre -----------------------------------------
add('C', 'cylinder', *W(12.1, 35.3, 3.9, 3.9), BLUE)
add('C', 'cylinder', *W(137.8, 35.3, 3.9, 3.9), BLUE)
add('GB', 'giant_brick', *W(75.0, 40.3, 4.8, 9.9), BLUE)
add('C', 'cylinder', *W(59.9, 48.4, 3.9, 3.9), BLUE)
add('C', 'cylinder', *W(89.9, 48.4, 3.9, 3.9), BLUE)
add('Tr', 'tree', *W(71.6, 50.3, 3.3, 3.3), RED, pad=0.8)
add('Tr', 'tree', *W(78.0, 50.2, 3.3, 3.3), RED, pad=0.8)
add('MT', 'maya_temple', *W(31.9, 50.0, 4.4, 4.0))
add('MT', 'maya_temple', *W(117.3, 49.9, 4.4, 4.0))

# ---- the 50 --------------------------------------------------------------
add('Br', 'brick', *W(1.5, 60.0, 3.3, 7.4), RED, pad=1.0,
    note='no printed label on the official map; stands on the end line like the Lone Star end-line Br')
add('Br', 'brick', *W(148.6, 60.2, 3.3, 7.4), RED, pad=1.0,
    note='no printed label on the official map; stands on the end line like the Lone Star end-line Br')
add('Br', 'brick', *W(11.8, 60.2, 3.5, 4.6), BLUE)
add('Br', 'brick', *W(138.2, 60.2, 3.5, 4.6), BLUE)
add('GB', 'giant_brick', *W(74.9, 65.1, 4.6, 9.9), BLUE)

# ---- the snake half: the V and the giant wings ---------------------------
add('MW', 'mini_w', 39.8, 66.4, 42.6, 73.6, BLUE, pad=0.6)
add('MW', 'mini_w', 107.4, 66.4, 110.2, 73.6, BLUE, pad=0.6)
add('GW', 'giant_wing', *W(57.3, 74.0, 5.5, 8.0), RED)
add('GW', 'giant_wing', *W(92.5, 74.0, 5.5, 8.0), RED)
add('SB', 'snake_beam', 41.5, 73.3, 48.1, 81.9, RED_LIT, pad=0)
add('SB', 'snake_beam', 101.9, 72.8, 108.1, 81.5, RED_LIT, pad=0)
add('SB', 'snake_beam', 47.4, 81.3, 54.2, 89.5, RED_LIT, pad=0)
add('SB', 'snake_beam', 96.0, 81.5, 102.4, 90.1, RED_LIT, pad=0)
add('Wg', 'wing', 52.9, 89.8, 60.4, 93.2, RED_LIT, pad=0)
add('Wg', 'wing', 89.6, 89.9, 97.0, 93.0, RED_LIT, pad=0)
add('T', 'temple', *W(12.2, 82.0, 4.2, 4.2))
add('T', 'temple', *W(137.6, 81.9, 4.2, 4.2))
add('Tr', 'tree', *W(75.0, 88.5, 3.4, 3.4), RED)
add('SB', 'snake_beam', 60.2, 91.9, 68.5, 98.4, RED_LIT, pad=0)
add('SB', 'snake_beam', 81.4, 92.0, 89.7, 98.4, RED_LIT, pad=0)

# ---- the snake -----------------------------------------------------------
add('T', 'temple', 19.8, 95.3, 24.2, 99.9, pad=0.3)
add('T', 'temple', 125.0, 95.5, 129.3, 99.9, pad=0.3)
for x0 in (24.9, 35.1, 104.9, 115.1):
    add('SB', 'snake_beam', x0, 98.5, x0 + 9.7, 100.3, RED_LIT, pad=0)
add('SB', 'snake_beam', 70.2, 98.4, 79.9, 100.1, RED_LIT, pad=0)
add('MW', 'mini_w', 67.8, 98.8, 70.0, 106.2, BLUE, pad=0.3)
add('MW', 'mini_w', 80.0, 98.8, 82.2, 106.2, BLUE, pad=0.3)
add('Br', 'brick', *W(38.3, 102.6, 3.4, 4.7), BLUE)
add('Br', 'brick', *W(111.7, 102.6, 3.4, 4.7), BLUE)
add('GP', 'giant_plus', 47.6, 98.7, 61.2, 110.6, RED, pad=0)
add('GP', 'giant_plus', 88.8, 98.7, 102.4, 110.6, RED, pad=0)

# ---- checks --------------------------------------------------------------
B_.sort(key=lambda b: (b['y_ft'], b['x_ft']))
json.dump(B_, open('tools/out/worldcup_measured.json', 'w'), indent=1)

# This field is drawn symmetric about the centre line. Pairing each bunker
# with its opposite number gives an axis; how tightly those agree is the
# check on the whole pass, and it is not something the windows can fake.
used, pairs = set(), []
for i, b in enumerate(B_):
    if i in used or abs(b['x_ft'] - 75) < 3:
        continue    # a bunker on the centre line is its own mirror
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
      f'(printed centre line measures {fx(1003.5):.2f} ft)')
unpaired = [B_[i]["name"] for i in range(len(B_)) if i not in used]
print(f'unpaired: {unpaired}')
PY_SCALE = dict(x=round(PX, 4), y=round(PY, 4))
print(f'px per ft: {PY_SCALE}')

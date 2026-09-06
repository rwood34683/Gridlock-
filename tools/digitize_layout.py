"""Digitize the NXL 2026 Midwest Open layout from the official labeled 2D.

Every coordinate is measured from images/nxl_2026_midwest_2d_labeled.jpg in the
frame set by the 10-ft grid printed on that map. Nothing is placed by hand.

Method
  1. Detect the printed grid: 16 verticals x 13 horizontals = 15 x 12 cells.
     That fixes the field rect and the ft-per-pixel scale on both axes.
  2. Segment the red and blue bunker paint.
  3. For each bunker, measure the bounding box of its own paint inside a local
     window and take the box centre. Windows come from a coarse pass, so no
     position is asserted by hand — only which blob belongs to which label.
  4. Beam sections are split at the blue joints printed on the beam itself.

Labels come from the text printed on the map (left and centre are labeled; the
right half is an unlabeled mirror).
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage

os.makedirs('tools/out', exist_ok=True)
SRC = 'layouts/images/nxl_2026_midwest_2d_labeled.jpg'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)
X0, X1, Y0, Y1 = 456, 5123, 472, 4205          # from the grid detection
PX, PY = (X1 - X0) / 150.0, (Y1 - Y0) / 120.0
R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
# Bunkers are rendered in 3D with a shaded (near-black) face on one side.
# The bright-paint test alone measures only the lit face and biases every
# footprint toward the light, so the shaded face is included as well.
# The second clause catches the shaded face only: it is bounded above so the
# pale pink/blue watermark printed under the field is not mistaken for paint.
RED  = ((R > 90) & (R - G > 55) & (R - B > 45)) | ((R > 34) & (R < 140) & (R - G > 18) & (R - B > 14))
BLUE = ((B > 90) & (B - R > 40) & (B - G > 30)) | ((B > 34) & (B < 150) & (B - R > 16) & (B - G > 12))
ANY = RED | BLUE

fx = lambda p: (p - X0) / PX
fy = lambda p: (p - Y0) / PY
px = lambda f: int(round(X0 + f * PX))
py = lambda f: int(round(Y0 + f * PY))

def bbox(x0, y0, x1, y1, mask=ANY):
    """Bounding-box centre of the bunker's paint inside a ft window.

    Only the largest connected blob is measured, so a stray pixel of the
    watermark printed under the field cannot stretch the footprint.
    """
    sub = mask[py(y0):py(y1), px(x0):px(x1)]
    lab, n = ndimage.label(sub, np.ones((3, 3)))
    if n == 0:
        raise ValueError(f'no paint in window {(x0, y0, x1, y1)}')
    sizes = ndimage.sum(sub, lab, range(1, n + 1))
    sub = lab == (int(np.argmax(sizes)) + 1)
    ys, xs = np.where(sub)
    cx0, cx1 = fx(px(x0) + xs.min()), fx(px(x0) + xs.max())
    cy0, cy1 = fy(py(y0) + ys.min()), fy(py(y0) + ys.max())
    return dict(x=round((cx0 + cx1) / 2, 1), y=round((cy0 + cy1) / 2, 1),
                w=round(cx1 - cx0, 1), h=round(cy1 - cy0, 1))

B_ = []
def add(name, kind, x0, y0, x1, y1, mask=ANY, note=None):
    m = bbox(x0, y0, x1, y1, mask)
    e = dict(name=name, type=kind, x_ft=m['x'], y_ft=m['y'],
             w_ft=m['w'], h_ft=m['h'])
    if note: e['note'] = note
    B_.append(e)
    return e

# ---- dorito tape: medium doritos, temples, the centre mini-W and its beam ----
for x in (30.0, 43.5, 56.5):  add('MD', 'medium_dorito', x, 9, x + 5.5, 21)
for x in (87.0, 100.0, 113.5): add('MD', 'medium_dorito', x, 9, x + 5.5, 21)
add('MW', 'mini_w', 73.5, 10, 77.0, 21.5)
add('T', 'temple', 15, 17, 20.5, 22.5)
add('T', 'temple', 129, 17, 134.5, 22.5)

# top snake beam: one joint at 75.1 splits it into two sections
add('SB', 'snake_beam', 64.4, 18.8, 75.1, 20.4, RED)
add('SB', 'snake_beam', 75.1, 18.8, 85.7, 20.4, RED)

# ---- bricks, cylinders, trees ----
add('Br', 'brick', 26, 29, 31, 39); add('Br', 'brick', 119, 29, 124, 39)
for x in (10, 39.5, 105.5, 135.5): add('C', 'cylinder', x, 37.5, x + 5, 45)
for x in (58, 68, 78, 88): add('Tr', 'tree', x, 38, x + 4, 43)

# ---- centre spine: giant wing / giant brick / giant wing ----
add('GW', 'giant_wing', 71.0, 47.5, 79.0, 54.6)
add('GB', 'giant_brick', 71.5, 54.8, 78.5, 65.4, BLUE)
add('GW', 'giant_wing', 71.5, 65.0, 78.5, 71.5, RED)

# ---- mid temples, sideline cylinders ----
add('T', 'temple', 25, 57, 30, 62); add('T', 'temple', 119, 57, 124, 62)
# Both sideline cylinders are drawn but carry no printed label on the official
# map. Their footprint and rendering match the labeled Br exactly, and the field
# owner confirmed them as Br.
_note = 'no printed label on the official map; identified as Br by footprint, confirmed by the field owner'
add('Br', 'brick', -1, 55, 4, 65, note=_note)
add('Br', 'brick', 146, 55, 151, 65, note=_note)
add('MT', 'maya_temple', 54.5, 65, 59.5, 70); add('MT', 'maya_temple', 89.5, 65, 94.5, 70)
add('MT', 'maya_temple', 9.5, 75, 14.5, 80);  add('MT', 'maya_temple', 134.5, 75, 139.5, 80)

# ---- the snake: nine sections between the ten printed joints ----
JOINTS = [29.1, 39.2, 49.4, 59.6, 69.9, 80.0, 90.3, 100.5, 110.8, 120.8]
for j0, j1 in zip(JOINTS, JOINTS[1:]):
    add('SB', 'snake_beam', j0, 78.6, j1, 80.1, RED)

# ---- cakes and mini-Ws hanging off the snake ----
add('Ck', 'cake', 35.5, 80.2, 40.5, 84.5, BLUE); add('Ck', 'cake', 109.5, 80.2, 114.5, 84.5, BLUE)
for x in (49.5, 73.7, 97.7): add('MW', 'mini_w', x, 79.8, x + 3, 87.5, BLUE)

# ---- home end: giant plus pair tied by a beam, giant brick, wings, bricks ----
add('GP', 'giant_plus', 57.5, 87.5, 69.2, 99.5, RED)
add('GP', 'giant_plus', 80.6, 87.5, 92.3, 99.5, RED)
add('SB', 'snake_beam', 69.2, 93.4, 80.6, 95.0, RED)
add('SD', 'small_dorito', 14.5, 94.5, 19.5, 99.5); add('SD', 'small_dorito', 129, 94.5, 134.5, 99.5)
add('SB', 'snake_beam', 44.6, 101.2, 55.2, 102.8, RED)
add('SB', 'snake_beam', 94.4, 101.2, 105.0, 102.8, RED)
add('Br', 'brick', 29, 99, 34, 109); add('Br', 'brick', 115.5, 99, 120.5, 109)
add('Wg', 'wing', 46.3, 102.9, 50.5, 110.5, RED)
add('Wg', 'wing', 99.4, 102.9, 103.6, 110.5, RED)
add('GB', 'giant_brick', 72, 100, 78, 111, BLUE)

# ---------------------------------------------------------------- checks
B_.sort(key=lambda b: (b['y_ft'], b['x_ft']))
print(f'{len(B_)} bunkers digitized\n')
print(f"{'name':<10}{'type':<15}{'x_ft':>7}{'y_ft':>7}{'w':>6}{'h':>6}")
for b in B_:
    print(f"{b['name']:<10}{b['type']:<15}{b['x_ft']:>7}{b['y_ft']:>7}{b['w_ft']:>6}{b['h_ft']:>6}")

# Mirror check: the layout is symmetric about the printed centre line.
print('\nmirror check (axis should sit on the printed 50):')
used = [False] * len(B_)
axes, unmatched = [], []
for i, b in enumerate(B_):
    if used[i]: continue
    best, bj = 9e9, None
    for j, c in enumerate(B_):
        if j == i or used[j] or c['type'] != b['type']: continue
        if abs(c['y_ft'] - b['y_ft']) > 1.2: continue
        d = abs((b['x_ft'] + c['x_ft']) / 2 - 75.0)
        if d < best: best, bj = d, j
    if bj is not None and abs(B_[bj]['x_ft'] - b['x_ft']) > 0.5:
        used[i] = used[bj] = True
        axes.append((b['x_ft'] + B_[bj]['x_ft']) / 2)
    else:
        unmatched.append(b)
axes = np.array(axes)
print(f'  {len(axes)} mirrored pairs, axis mean {axes.mean():.2f} ft, sd {axes.std():.2f} ft, '
      f'range {axes.min():.2f}..{axes.max():.2f}')
print(f'  {len(unmatched)} on the centre line or unpaired: '
      + ', '.join(f"{u['name']}@{u['x_ft']}" for u in unmatched))
json.dump(B_, open('tools/out/bunkers_measured.json', 'w'), indent=1)
print('\nwrote tools/out/bunkers_measured.json')

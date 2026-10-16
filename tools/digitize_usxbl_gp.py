#!/usr/bin/env python3
"""Measure the USXBL GP Championship (Paintball Fit, Waxahachie TX) off its 3D render.

The coach sent no 2D for this event: two 3D renders and the event poster. The
end-on render (layouts/images/usxbl_2026_gp_championship_3d.jpg, 1440 x 1024)
prints the field's 10-ft grid on the turf, numbered 10..100 across the width
under the near end line and up the length on the dorito side. That grid is
the measurement:

1. The grid rows were read off the image where they cross the centre line
   (constant across the width, because the camera stands on it), and the
   width lines where they cross two rows. A plane-to-image homography is fitted
   to those 27 points by DLT; it lands every one within a pixel.
2. Each bunker is read at the point where it meets the turf nearest the
   camera — the bottom of its paint, mapped back through the homography. A
   bunker stands up out of the turf, so that point is the near edge of its
   footprint, not its centre.
3. The field is mirrored across the 50 (x = 75). A bunker and its twin are read
   the same way, so each reading is off by the same half-depth and the same
   lean of a raised edge, in the same direction. Averaging the pair cancels
   both: centre = (near - far + 150) / 2. A bunker on the centre line is its own
   twin and sits on x = 75.

Bunker sizes still come from layouts/bunkers.json; the map says only where
they stand. The render prints no labels, so each is named for the nearest
standard kind by its shape: pyramids MD, cubes and squared blocks T, tall
tapered towers MT, the low wide block Wg, the tall slanted block GW, capped
cans C, all-red cans Tr, the X GP, the end-line uprights Br, the W-topped
uprights MW, beams SB and the wedge on the centre beam SD.

    python3 tools/digitize_usxbl_gp.py   # -> tools/out/usxbl_gp_measured.json
"""
import json
import numpy as np

SRC = 'layouts/images/usxbl_2026_gp_championship_3d.jpg'
OUT = 'tools/out/usxbl_gp_measured.json'

# ---- 1. the grid -------------------------------------------------------------
# Rows (length lines) where they cross the centre line y = 60, image u = 776.
ROWS = {150: 957.7, 140: 810.0, 130: 690.4, 120: 592.4, 110: 511.0, 100: 441.5,
        90: 383.0, 80: 331.0, 70: 285.5, 60: 244.5, 50: 208.0, 40: 177.0}
# Width lines read 10 px inside the end row (x = 149.36) and the 100 row (x = 98.30).
NEAR_ROW = (149.36, 947, {10: 44, 20: 189, 30: 336, 40: 482, 50: 629, 70: 922, 80: 1069, 90: 1216, 100: 1361})
MID_ROW = (98.30, 431, {20: 413, 30: 504, 40: 595, 50: 685, 70: 866, 80: 957})

pts = [((x, 60), (776, v)) for x, v in ROWS.items()]
for x, v, cols in (NEAR_ROW, MID_ROW):
    pts += [((x, w), (u, v)) for w, u in cols.items()]
A = []
for (x, y), (u, v) in pts:
    A.append([x, y, 1, 0, 0, 0, -u * x, -u * y, -u])
    A.append([0, 0, 0, x, y, 1, -v * x, -v * y, -v])
_, _, Vt = np.linalg.svd(np.array(A, float))
H = (Vt[-1] / Vt[-1][-1]).reshape(3, 3)
Hi = np.linalg.inv(H)


def to_field(u, v):
    q = Hi @ np.array([u, v, 1.0])
    return q[0] / q[2], q[1] / q[2]


def to_image(x, y):
    q = H @ np.array([x, y, 1.0])
    return q[0] / q[2], q[1] / q[2]


resid = [np.hypot(*(np.array(to_image(*a)) - np.array(b))) for a, b in pts]

# ---- 2. the readings -----------------------------------------------------------
# name, type, near-half point, far-half point (image px, where the paint meets
# the turf nearest the camera), and the footprint's x / y extent before the book.
PAIRS = [
    ('MD', 'medium_dorito', (329.5, 624.2), (532.9, 156.1), 6.69, 6.11),
    ('MD', 'medium_dorito', (353.4, 490.7), (482.4, 206.9), 6.69, 6.11),
    ('MD', 'medium_dorito', (399.3, 378.8), (444.2, 261.0), 6.69, 6.11),
    ('T', 'temple', (504.6, 717.2), (646.0, 126.9), 4.82, 4.69),
    ('T', 'temple', (1042.5, 688.6), (906.2, 130.0), 4.82, 4.69),
    ('Wg', 'wing', (501.5, 521.8), (602.2, 179.0), 3.05, 7.3),
    ('GW', 'giant_wing', (655.3, 456.8), (688.2, 217.1), 5.34, 5.66),
    ('MT', 'maya_temple', (880.5, 550.4), (838.5, 176.0), 4.98, 4.95),
    ('C', 'cylinder', (775.1, 391.1), (775.3, 252.0), 4.27, 4.11),
    ('Tr', 'tree', (947.9, 387.7), (918.5, 248.1), 3.63, 3.57),
    ('Tr', 'tree', (1044.1, 456.8), (966.0, 206.9), 3.63, 3.57),
    ('C', 'cylinder', (144.6, 808.4), (510.1, 105.0), 4.27, 4.11),
    ('GP', 'giant_plus', (766.5, 808.4), (774.9, 121.1), 11.31, 11.09),
    # Snake side. Cubes at the beams' ends, the W-topped uprights on them.
    ('T', 'temple', (1153, 393), (1080, 237), 4.82, 4.69),
    ('T', 'temple', (1197, 347), (1153, 270), 4.82, 4.69),
    ('MW', 'mini_w', (1210, 523), (1047.5, 174.5), 1.93, 7.07),
    ('MW', 'mini_w', (1350, 690), (1045, 123), 1.93, 7.07),
]
# A beam run, read at both tips on both halves: (near tip, far tip) of the
# near-half run and of the far-half run. Laid as standard sections end to end.
RUNS = [
    ('near_long', (1213, 610), (1090, 320), (1075, 280), (1011.25, 132.5)),
    ('near_end', (1320, 780), (1260, 667), (1012.5, 120), (1005, 90)),
]
# On the centre line: its own twin, so x = 75 and only y is read.
CENTRE = [
    ('GB', 'giant_brick', (695, 315), 4.76, 10.09),
    ('GB', 'giant_brick', (856, 317), 4.76, 10.09),
    ('MT', 'maya_temple', (560, 318), 4.98, 4.95),
    ('MT', 'maya_temple', (460, 316), 4.98, 4.95),
    ('SD', 'small_dorito', (1047.5, 310), 4.53, 5.21),
]
# Centre beams: (far tip, near tip) of a run that crosses the 50.
CENTRE_RUNS = [((1117, 257), (1170, 337)), ((1002.5, 252.5), (1037.5, 350))]
# The end-line uprights: the far one stands behind the GP and its foot is
# hidden, so the near one is read alone, its depth taken off the near edge.
BR_NEAR = (776.4, 982)

out = []


def add(name, kind, x, y, w, h, **extra):
    out.append(dict(name=name, type=kind, x_ft=round(x, 1), y_ft=round(y, 1),
                    w_ft=w, h_ft=h, angle_deg=None, long_ft=max(w, h), thick_ft=min(w, h),
                    cross_deg=extra.get('cross_deg'), body='red', detail=extra.get('detail')))


for name, kind, near, far, w, h in PAIRS:
    (xn, yn), (xf, yf) = to_field(*near), to_field(*far)
    x = (xn - xf + 150) / 2
    y = (yn + yf) / 2
    # The caps are printed black, which is shade, not paint: the app's detail
    # colour is the second paint a bunker carries, and every one here is red.
    kw = dict(detail=None)
    if kind == 'giant_plus':
        kw['cross_deg'] = 45.0          # drawn as an X, on its corner
        y = 60.0                        # on the centre line of the width
    add(name, kind, x, y, w, h, **kw)
    add(name, kind, 150 - x, y, w, h, **kw)

SB = json.load(open('layouts/bunkers.json'))['bunkers']['snake_beam']['long_ft']


def lay(x0, x1, y):
    n = max(1, round((x1 - x0) / SB))
    step = (x1 - x0 - SB) / (n - 1) if n > 1 else 0
    start = (x0 + x1) / 2 - step * (n - 1) / 2
    return [(start + i * step, y) for i in range(n)]


for _, n_near, n_far, f_near, f_far in RUNS:
    a, b = to_field(*n_near), to_field(*n_far)
    c, d = to_field(*f_near), to_field(*f_far)
    centre = ((a[0] + b[0]) / 2 - (c[0] + d[0]) / 2 + 150) / 2
    length = ((a[0] - b[0]) + (c[0] - d[0])) / 2
    y = (a[1] + b[1] + c[1] + d[1]) / 4
    for x, yy in lay(centre - length / 2, centre + length / 2, y):
        add('SB', 'snake_beam', x, yy, SB, 1.49)
        add('SB', 'snake_beam', 150 - x, yy, SB, 1.49)

for name, kind, foot, w, h in CENTRE:
    add(name, kind, 75.0, to_field(*foot)[1], w, h)

for far_tip, near_tip in CENTRE_RUNS:
    a, b = to_field(*far_tip), to_field(*near_tip)
    length = b[0] - a[0]
    for x, y in lay(75 - length / 2, 75 + length / 2, (a[1] + b[1]) / 2):
        add('SB', 'snake_beam', x, y, SB, 1.49)

bx, by = to_field(*BR_NEAR)
br = json.load(open('layouts/bunkers.json'))['bunkers']['brick']
x = bx - br['short_ft'] / 2
add('Br', 'brick', x, 60.0, br['short_ft'], br['long_ft'])
add('Br', 'brick', 150 - x, 60.0, br['short_ft'], br['long_ft'])

json.dump(out, open(OUT, 'w'), indent=1)
print(f'{OUT}: {len(out)} bunkers; grid fit max {max(resid):.2f} px, mean {np.mean(resid):.2f} px')

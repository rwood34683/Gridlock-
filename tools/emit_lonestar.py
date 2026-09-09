#!/usr/bin/env python3
"""Write the digitized Lone Star bunkers into the event JSON and the app.

Run tools/digitize_tampa.py first. The Gridlock field uses the same frame as
the layout pack — 150 ft x 120 ft, origin top-left, +x toward the away end,
+y toward the snake side — so feet carry across 1:1 with no rescaling.
"""
import json

EVENT = 'layouts/events/nxl_2026_lone_star.json'
MEASURED = 'tools/out/lonestar_measured.json'

bunkers = json.load(open(MEASURED))
ev = json.load(open(EVENT))


def side(b):
    if b['type'] in ('medium_dorito', 'small_dorito'):
        return 'dorito'
    if b['type'] in ('snake_beam', 'cake', 'wing'):
        return 'snake'
    if abs(b['x_ft'] - 75) < 4:
        return 'center'
    return 'home' if b['x_ft'] < 75 else 'away'


out = []
for b in sorted(bunkers, key=lambda d: (d['y_ft'], d['x_ft'])):
    e = {'name': b['name'], 'type': b['type'], 'side': side(b),
         'x_ft': b['x_ft'], 'y_ft': b['y_ft'], 'w_ft': b['w_ft'], 'h_ft': b['h_ft'],
         'angle_deg': b.get('angle_deg'), 'long_ft': b.get('long_ft'),
         'thick_ft': b.get('thick_ft'),
         'body': b.get('body'), 'detail': b.get('detail'),
         'body_rgb': b.get('body_rgb'), 'detail_rgb': b.get('detail_rgb')}
    if 'note' in b:
        e['note'] = b['note']
    out.append(e)

ev['bunkers'] = out
ev['coordinate_status'] = 'grid_digitized'
ev['digitized'] = {
    'source_view': '2d_labeled',
    'source_file': 'images/nxl_2026_lonestar_2d_labeled.jpg',
    'method': ('Printed 10-ft grid detected in the image (16 verticals x 13 horizontals '
               '= 15 x 12 cells), giving 8.1867 px/ft on x and 8.1917 px/ft on y. Each '
               'bunker is the centre of its own measured paint footprint in that frame. '
               'Bright paint locates a bunker and separates it from its neighbours; the '
               'footprint is then measured on the full paint, lit and shaded face '
               'together, because the map is lit from the upper left and bright paint '
               'alone pulls every reading about a foot toward the light.'),
    'field_rect_px': {'x0': 121, 'y0': 127, 'x1': 1349, 'y1': 1110},
    'px_per_ft': {'x': 8.1867, 'y': 8.1917},
    'precision': ('This map is 1500 px wide — 8.19 px/ft, against Tampa at 5.89 and '
                  'Midwest at 31.1 — so one pixel is 0.12 ft. Coordinates are good to '
                  'about a fifth of a foot, not to the inch.'),
    'mirror_check': ('27 mirrored pairs, axis mean 74.83 ft, sd 0.27 ft; the printed '
                     'centre line measures 75.12 ft. The 0.29 ft residual is the '
                     'lighting bias the windows do not fully remove, and is inside the '
                     'quarter-foot the source supports.'),
    'bunker_count': len(out),
    'unlabeled': ('The two sideline cylinders at the halfway line carry no printed label '
                  'on the official map. Read as Br from their footprint, which matches '
                  'the labeled Br.'),
    'tool': 'tools/digitize_lonestar.py',
}
json.dump(ev, open(EVENT, 'w'), indent=2)
print(f'{EVENT}: {len(out)} bunkers, coordinate_status = grid_digitized')

# ---- the same list, as a Gridlock layout ---------------------------------
def dorito_shape(b):
    # Which way a dorito points is where it sits, not what it is called: the
    # ones on the snake wire are drawn pointing back down the field.
    return 'tridown' if b['y_ft'] > 60 else 'dorito'

SHAPE = {'medium_dorito': 'dorito', 'small_dorito': 'dorito', 'brick': 'can',
         'giant_plus': 'plus', 'mini_w': 'mw', 'maya_temple': 'temple',
         'temple': 'temple', 'snake_beam': 'beam', 'tree': 'ball',
         'giant_wing': 'gwing', 'cylinder': 'ball', 'giant_brick': 'gbrick',
         # Shapes as this map draws them: its cakes point back down the field
         # and its wings are upright bars, not the sideways wedge.
         'cake': 'tridown', 'wing': 'bar'}

counts = {}
def uid(name):
    counts[name] = counts.get(name, 0) + 1
    return f'{name}#{counts[name]}'

rows = []
for b in out:
    ang = b.get('angle_deg') or 0
    # A beam laid across the field carries its own length, thickness and angle;
    # its bounding box says almost nothing about what it is.
    angled = b['type'] == 'snake_beam' and abs(ang) > 5
    d = {'id': uid(b['name']), 'n': b['name'], 'x': b['x_ft'], 'y': b['y_ft'],
         't': dorito_shape(b) if 'dorito' in b['type'] else SHAPE[b['type']],
         'w': b['long_ft'] if angled else b['w_ft'],
         'h': b['thick_ft'] if angled else b['h_ft'],
         'c': 'r' if b['body'] == 'red' else 'b'}
    if angled:
        d['a'] = ang
    if b.get('detail'):
        d['d'] = 'r' if b['detail'] == 'red' else 'b'
    rows.append(d)

def js(d):
    parts = [f'{k}:' + (f'"{v}"' if isinstance(v, str) else str(v)) for k, v in d.items()]
    return '{' + ','.join(parts) + '}'

lines, cur = [], []
for r in rows:
    cur.append(js(r))
    if len(cur) == 2:
        lines.append('  ' + ','.join(cur) + ',')
        cur = []
if cur:
    lines.append('  ' + ','.join(cur) + ',')
body = '\n'.join(lines).rstrip(',')
open('tools/out/lso_layout.js', 'w').write(
    '// Digitized from the official NXL labeled 2D on its printed 10-ft grid.\n'
    '// Written by tools/emit_tampa.py — do not hand-edit.\n'
    f'const LSO = [\n{body}\n];\n')
print(f'tools/out/lso_layout.js: {len(rows)} bunkers')

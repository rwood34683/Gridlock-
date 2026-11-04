#!/usr/bin/env python3
"""Write the digitized World Cup bunkers into the event JSON and the app.

Made from tools/emit_lonestar.py. Run tools/digitize_worldcup.py first. The Gridlock field uses the same frame as
the layout pack — 150 ft x 120 ft, origin top-left, +x toward the away end,
+y toward the snake side — so feet carry across 1:1 with no rescaling.
"""
import json

from bunkerbook import arm as std_arm, beam as std_beam, footprint as std_footprint, provenance

EVENT = 'layouts/events/nxl_2026_world_cup.json'
MEASURED = 'tools/out/worldcup_measured.json'

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
    # Where it stands is this map's to say; how big it is comes from the book,
    # measured once off the print that can measure it. Both are kept: w_ft and
    # h_ft are the bunker, drawn_w_ft and drawn_h_ft are what this map drew.
    # A beam laid across the field is kept as a bar with its own length,
    # thickness and angle; its bounding box says almost nothing about it. The
    # threshold is well clear of the couple of degrees a straight section
    # wanders by, and well under the forty-five a leaning one runs at.
    ang = b.get('angle_deg') or 0
    if b['type'] == 'snake_beam' and abs(ang) > 12:
        w, h, off = std_beam(b['long_ft'], b['thick_ft'])
    else:
        w, h, off = std_footprint(b['type'], b['w_ft'], b['h_ft'])
    e = {'name': b['name'], 'type': b['type'], 'side': side(b),
         'x_ft': b['x_ft'], 'y_ft': b['y_ft'], 'w_ft': w, 'h_ft': h,
         'drawn_w_ft': b['w_ft'], 'drawn_h_ft': b['h_ft'], 'off_ft': off,
         'arm_ft': std_arm(b['type']),
         'angle_deg': b.get('angle_deg'), 'long_ft': b.get('long_ft'),
         'thick_ft': b.get('thick_ft'), 'cross_deg': b.get('cross_deg'),
         'body': b.get('body'), 'detail': b.get('detail'),
         'body_rgb': b.get('body_rgb'), 'detail_rgb': b.get('detail_rgb')}
    if 'note' in b:
        e['note'] = b['note']
    out.append(e)

ev['bunkers'] = out
ev['coordinate_status'] = 'grid_digitized'
ev['digitized'] = {
    'source_view': '2d_labeled',
    'source_file': 'images/nxl_2026_worldcup_2d_labeled.jpg',
    'method': ('Printed 10-ft grid detected in the image (16 verticals x 13 horizontals '
               '= 15 x 12 cells), giving 11.1433 px/ft on x and 11.1417 px/ft on y. Each '
               'bunker is the centre of its own measured paint footprint in that frame. '
               'Bright paint locates a bunker and separates it from its neighbours; the '
               'footprint is then measured on the full paint, lit and shaded face '
               'together, because the map is lit from the upper left and bright paint '
               'alone pulls every reading about a foot toward the light.'),
    'field_rect_px': {'x0': 167, 'y0': 171.5, 'x1': 1838.5, 'y1': 1508.5},
    'px_per_ft': {'x': 11.1433, 'y': 11.1417},
    'precision': ('This map is 2048 px wide — 11.14 px/ft — so one pixel is 0.09 ft. '
                  'Coordinates are good to about a fifth of a foot, not to the inch.'),
    'mirror_check': ('24 mirrored pairs and five bunkers on the centre line; axis mean '
                     '74.91 ft, sd 0.11 ft; the printed centre line measures 75.07 ft.'),
    'bunker_count': len(out),
    'unlabeled': ('The two red bunkers standing on the end lines at the 50 carry no '
                  'printed label on the official map. Read as Br, as the end-line '
                  'bunkers on the Lone Star map were.'),
    'turned': ('The two corner medium doritos are printed on their side, pointing in '
               'toward the 50; the app draws them that way.'),
    'tool': 'tools/digitize_worldcup.py',
    'footprints': provenance(out),
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
    angled = b['type'] == 'snake_beam' and abs(ang) > 12
    # Where the bunkers stand is this map's to say. How big each one is comes
    # from the book, measured once off the print that can measure it; see
    # tools/bunkerbook.py. How far the two disagree is recorded below.
    side_on = 'on its side' in b.get('note', '')
    d = {'id': uid(b['name']), 'n': b['name'], 'x': b['x_ft'], 'y': b['y_ft'],
         # A dorito printed on its side points in at the 50: its long side
         # runs up and down the field, so the book's footprint is turned.
         't': 'triin' if side_on else dorito_shape(b) if 'dorito' in b['type'] else SHAPE[b['type']],
         # Turned whatever way the book's aspect came back: tip to base (the
         # short side) runs along the field, the base across it.
         'w': min(b['w_ft'], b['h_ft']) if side_on else b['w_ft'],
         'h': max(b['w_ft'], b['h_ft']) if side_on else b['h_ft'],
         'c': 'r' if b['body'] == 'red' else 'b'}
    if angled:
        d['a'] = ang
    # A giant plus is printed either upright or turned on its corner, and which
    # is measured off the paint. Drawn as the wrong one it is not that bunker.
    if b['type'] == 'giant_plus' and b.get('cross_deg'):
        d['a'] = b['cross_deg']
    # A cross carries the width of its own arms: drawn thin it reads as a
    # spindly X where the map prints a chunky one.
    if b.get('arm_ft'):
        d['k'] = b['arm_ft']
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
open('tools/out/nwc_layout.js', 'w').write(
    '// Digitized from the official NXL labeled 2D on its printed 10-ft grid.\n'
    '// Written by tools/emit_worldcup.py — do not hand-edit.\n'
    f'const NWC = [\n{body}\n];\n')
print(f'tools/out/nwc_layout.js: {len(rows)} bunkers')

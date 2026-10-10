#!/usr/bin/env python3
"""Write the digitized USXBL JT Championship bunkers into the event JSON and the app.

Run tools/digitize_usxbl_jt.py first. The Gridlock field uses the same frame as
the layout pack — 150 ft x 120 ft, origin top-left, +x toward the away end,
+y toward the snake side — so feet carry across 1:1 with no rescaling.
"""
import json

from bunkerbook import arm as std_arm, beam as std_beam, footprint as std_footprint, provenance

EVENT = 'layouts/events/usxbl_2026_jt_championship.json'
MEASURED = 'tools/out/usxbl_jt_measured.json'

bunkers = json.load(open(MEASURED))
ev = json.load(open(EVENT)) if __import__('os').path.exists(EVENT) else {}


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

ev.update({
    'schema': 'gridlock.layout.v1',
    'field': {'width_ft': 150, 'length_ft': 120, 'grid_ft': 10, 'surface': 'turf',
              'origin': 'home-left snake corner, +X dorito, +Y toward away'},
    'coordinate_status': 'grid_digitized',
    'id': 'usxbl_2026_jt_championship',
    'league': 'US Xball League',
    'league_code': 'USXBL',
    'event': 'JT Championship',
    'season': 2026,
    'dates': '',
    'venue': {'name': '', 'city': '', 'state': '', 'country': 'US'},
    'status': 'published',
    'notes': ['Layout supplied by the coach on 2026-10-10: a 2D field map on a printed '
              '10-ft grid and two 3D renders. Dates and venue were not on it and are left blank.'],
    'views': [
        {'id': '2d', 'kind': 'clean_2d', 'file': 'images/usxbl_2026_jt_championship_2d.jpg'},
        {'id': '3d', 'kind': '3d', 'file': 'images/usxbl_2026_jt_championship_3d.jpg'},
        {'id': 'iso', 'kind': '3d', 'file': 'images/usxbl_2026_jt_championship_iso.jpg'}],
    'sources': [{'type': 'coach', 'note': 'images supplied by the coach, 2026-10-10'}],
})
ev['bunkers'] = out
ev['digitized'] = {
    'source_view': '2d',
    'source_file': 'images/usxbl_2026_jt_championship_2d.jpg',
    'method': ('Printed 10-ft grid detected in the image (16 verticals x 13 horizontals '
               '= 15 x 12 cells), giving 8.8933 px/ft on x and 8.8917 px/ft on y. Each '
               'bunker is the centre of its own measured paint footprint in that frame: red '
               'paint plus the near-black cap and shaded face, which this map prints on a '
               'white sheet under a light grey grid. Touching bunkers are split where the '
               'drawing joins them: beam joints at the brightness dips along the lit band, '
               'the bridge at the centre line.'),
    'field_rect_px': {'x0': 48, 'y0': 30, 'x1': 1382, 'y1': 1097},
    'px_per_ft': {'x': 8.8933, 'y': 8.8917},
    'precision': ('This map is 1440 px wide, 8.89 px/ft, so one pixel is 0.11 ft. '
                  'Coordinates are good to about a fifth of a foot, not to the inch.'),
    'mirror_check': ('26 mirrored pairs, axis mean 74.99 ft, sd 0.05 ft. The six '
                     'unpaired bunkers stand on the centre line.'),
    'bunker_count': len(out),
    'unlabeled': ('The map prints no bunker labels. Every name is the kind of inflatable '
                  'read off its drawn shape and its measured size against the standard '
                  'book: the cubes as T, the corner blocks as GB, the balls as C, the '
                  'end-line uprights as Br. The two Br stand on the end lines, half behind '
                  'the field, and are kept where the map draws them.'),
    'tool': 'tools/digitize_usxbl_jt.py',
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
         # Its cake points back down the field, under the snake.
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
    d = {'id': uid(b['name']), 'n': b['name'], 'x': b['x_ft'], 'y': b['y_ft'],
         't': dorito_shape(b) if 'dorito' in b['type'] else SHAPE[b['type']],
         'w': b['w_ft'], 'h': b['h_ft'],
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
open('tools/out/ujt_layout.js', 'w').write(
    '// Digitized from the USXBL JT Championship 2D on its printed 10-ft grid.\n'
    '// Written by tools/emit_usxbl_jt.py — do not hand-edit.\n'
    f'const UJT = [\n{body}\n];\n')
print(f'tools/out/ujt_layout.js: {len(rows)} bunkers')

#!/usr/bin/env python3
"""Write the digitized bunkers into the event JSON and into the app.

Run tools/digitize_layout.py first — it measures the bunkers from the official
labeled 2D and writes tools/out/bunkers_measured.json.

The Gridlock field uses the same frame as the layout pack (150 ft x 120 ft,
origin top-left, +x toward the away end, +y toward the snake side), so ft
coordinates carry across 1:1 with no rescaling.
"""
import json, os

from bunkerbook import arm as std_arm, footprint as std_footprint, provenance

EVENT = 'layouts/events/nxl_2026_midwest_open.json'
MEASURED = 'tools/out/bunkers_measured.json'

bunkers = json.load(open(MEASURED))
ev = json.load(open(EVENT))

# Which side of the field each bunker sits on, from its measured position.
def side(b):
    if b['type'] in ('medium_dorito', 'small_dorito'): return 'dorito'
    if b['type'] == 'snake_beam' or b['type'] in ('cake', 'mini_w'): return 'snake'
    if abs(b['x_ft'] - 75) < 4: return 'center'
    return 'home' if b['x_ft'] < 75 else 'away'

out = []
for b in sorted(bunkers, key=lambda d: (d['y_ft'], d['x_ft'])):
    e = {
        'name': b['name'],
        'type': b['type'],
        'side': side(b),
        'x_ft': b['x_ft'],
        'y_ft': b['y_ft'],
        # Where it stands is this map's to say; how big it is comes from the
        # book, measured once off the print that can measure it. Both are
        # kept: w_ft and h_ft are the bunker, drawn_* is what this map drew.
        'w_ft': std_footprint(b['type'], b['w_ft'], b['h_ft'])[0],
        'h_ft': std_footprint(b['type'], b['w_ft'], b['h_ft'])[1],
        'drawn_w_ft': b['w_ft'],
        'drawn_h_ft': b['h_ft'],
        'off_ft': std_footprint(b['type'], b['w_ft'], b['h_ft'])[2],
        'arm_ft': std_arm(b['type']),
        # sampled from the official map, not chosen
        'body': b.get('body'),
        'detail': b.get('detail'),
        'body_rgb': b.get('body_rgb'),
        'detail_rgb': b.get('detail_rgb'),
    }
    if 'note' in b: e['note'] = b['note']
    out.append(e)

ev['bunkers'] = out
ev['coordinate_status'] = 'grid_digitized'
ev['digitized'] = {
    'source_view': '2d_labeled',
    'source_file': 'images/nxl_2026_midwest_2d_labeled.jpg',
    'colour': ('Body and detail colour are sampled from the official map inside each '
               'bunker\'s own measured blob, so a neighbour that merely overlaps the '
               'bounding box cannot colour the answer. Snake-beam sections carry the '
               'blue joint colour detected when the beam was split, which a red-masked '
               'section cannot see for itself.'),
    'method': ('Printed 10-ft grid detected in the image (16 verticals x 13 horizontals = '
               '15 x 12 cells), giving 31.113 px/ft on x and 31.108 px/ft on y. Each bunker '
               'is the centre of its own measured paint footprint in that frame. Snake-beam '
               'sections are split at the blue joints printed on the beam.'),
    'field_rect_px': {'x0': 456, 'y0': 472, 'x1': 5123, 'y1': 4205},
    'px_per_ft': {'x': 31.1133, 'y': 31.1083},
    'mirror_check': ('25 mirrored pairs, axis mean 74.84 ft, sd 0.21 ft; the printed centre '
                     'line measures 75.15 ft. Residual is inside the drawing line weight.'),
    'bunker_count': len(out),
    'unlabeled': ('The two sideline cylinders at x 1.4 and 148.7, y 60.1 carry no printed '
                  'label on the official map. Identified as Br from their footprint, which '
                  'matches the labeled Br exactly; confirmed by the field owner.'),
    'tool': 'tools/digitize_layout.py',
    'footprints': provenance(out),
}
json.dump(ev, open(EVENT, 'w'), indent=2)
print(f'{EVENT}: {len(out)} bunkers, coordinate_status = grid_digitized')

# ---- the same list, as a Gridlock layout ----
counts = {}
def uid(b):
    counts[b['name']] = counts.get(b['name'], 0) + 1
    return f"{b['name']}#{counts[b['name']]}"

# Shapes as they are drawn on the official map. Medium doritos point up the
# field; small doritos and cakes point back down it. Wings are upright bars,
# not the sideways wedge the generic renderer uses.
SHAPE = {
    'medium_dorito': 'dorito',  'small_dorito': 'tridown',  'cake': 'tridown',
    'temple': 'temple',         'maya_temple': 'temple',
    'brick': 'can',             'wing': 'bar',
    'cylinder': 'ball',         'tree': 'ball',
    'giant_wing': 'gwing',      'giant_brick': 'gbrick',    'giant_plus': 'plus',
    'mini_w': 'mw',             'snake_beam': 'beam',
}
rows = []
for b in out:
    # c = body colour, d = the contrasting cap/band/inset the map prints.
    # Both come from sampling the official map, never from a choice here.
    c = (b.get('body') or 'red')[0]
    d = (b.get('detail') or '')[:1]
    # Where the bunkers stand is this map's to say. How big each one is comes
    # from the book, measured once off the print that can measure it; see
    # tools/bunkerbook.py. How far the two disagree is recorded below.
    # A cross carries the width of its own arms: drawn thin it reads as a
    # spindly X where the map prints a chunky one.
    k = ',k:%s' % b['arm_ft'] if b.get('arm_ft') else ''
    rows.append('{{id:"{}",n:"{}",x:{},y:{},t:"{}",w:{},h:{},c:"{}"{}{}}}'.format(
        uid(b), b['name'], b['x_ft'], b['y_ft'], SHAPE[b['type']], b['w_ft'], b['h_ft'],
        c, k, ',d:"%s"' % d if d else ''))

os.makedirs('tools/out', exist_ok=True)
with open('tools/out/mwo_layout.js', 'w') as f:
    f.write('// NXL 2026 Midwest Open — digitized from the official labeled 2D.\n')
    f.write('// Generated by tools/emit_layout.py. Do not hand-edit.\n')
    f.write('const MWO = [\n')
    for i in range(0, len(rows), 2):
        f.write('  ' + ','.join(rows[i:i+2]) + ',\n')
    f.write('];\n')
print(f'tools/out/mwo_layout.js: {len(rows)} bunkers')

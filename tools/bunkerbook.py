"""The standard footprint of each bunker, applied to a measured layout.

A medium dorito is the same inflatable in Garland that it was in Cincinnati.
So a layout says where the bunkers stand — that is what changes between events,
and its own map is the only source for it — and layouts/bunkers.json says how
big each one is, measured once off the map that can measure it properly. Read
per map, the same bunker comes back 7.3 ft on one print and 8.2 on another; the
bunker did not change, the drawing did, and the drawings are not equally good.

Two of these fields also print a short squat Br in their back corners next to
the tall Br everywhere else. That is a second inflatable under one name, not a
bad reading, and what says so is that two different maps draw it alike. Those
are carried in the book as variants, and an instance takes whichever standard
it measures closer to.
"""
import json

_book = json.load(open('layouts/bunkers.json'))
STANDARD = _book['bunkers']
SOURCE = _book['source']


def _sizes(kind):
    std = STANDARD.get(kind)
    if not std:
        return []
    return [(std['long_ft'], std['short_ft'])] + [
        (v['long_ft'], v['short_ft']) for v in std.get('variants', [])]


def _pick(kind, hi, lo):
    """The standard size this reading is closest to, and how far off it was."""
    opts = _sizes(kind)
    if not opts:
        return hi, lo, None
    best = min(opts, key=lambda s: abs(s[0] - hi) + abs(s[1] - lo))
    return best[0], best[1], round(max(abs(best[0] - hi), abs(best[1] - lo)), 2)


def footprint(kind, w_ft, h_ft):
    """Standard w, h for a bunker measured this way up, and the residual."""
    hi, lo = max(w_ft, h_ft), min(w_ft, h_ft)
    long_ft, short_ft, off = _pick(kind, hi, lo)
    if h_ft >= w_ft:
        return short_ft, long_ft, off
    return long_ft, short_ft, off


def arm(kind):
    """How wide the arms of a cross are, where the book measured them."""
    return (STANDARD.get(kind) or {}).get('arm_ft')


def beam(long_ft, thick_ft):
    """Standard length and thickness for a snake beam section."""
    return _pick('snake_beam', long_ft, thick_ft)


NOTE = (
    'Positions are measured off this event\'s own official 2D on its printed '
    '10-ft grid. Footprints are not: a bunker type is one inflatable and does '
    'not change size between events, so every footprint comes from '
    'layouts/bunkers.json, measured once off the unlabeled Midwest Open 2D at '
    '31.1 px/ft, where there is no printed grid, no label and no watermark to '
    'read a bunker into. Each bunker keeps what this map drew as drawn_w_ft '
    'and drawn_h_ft, and off_ft is how far the two disagree.'
)


def provenance(rows):
    """The footprint note for an event, with how far this map disagreed."""
    off = sorted((r.get('off_ft') or 0, r['name'], r['x_ft'], r['y_ft'])
                 for r in rows)
    n = len(off)
    return dict(
        source=SOURCE,
        book='layouts/bunkers.json',
        tool='tools/bunkerbook.py',
        note=NOTE,
        residual_ft=dict(
            mean=round(sum(o[0] for o in off) / n, 2),
            median=round(off[n // 2][0], 2),
            worst=round(off[-1][0], 2),
            worst_at=f'{off[-1][1]} at {off[-1][2]}, {off[-1][3]} ft'),
    )

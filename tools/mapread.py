"""Reading a whole bunker off an official 2D map.

These maps are drawn lit from the upper left, and every bunker is a little 3D
render: a bright face, a mid face, and a face in shadow that the print takes
all the way to black. Segment on colour and the black face is not there — a
medium dorito comes back four and a half feet wide instead of six and three
quarters, and it comes back off centre, because the half that is missing is
always the same half. Blow up any of these maps far enough and it is plain:
the black is a face of the bunker, not a shadow cast beside it.

So the footprint is the paint plus the shadow side attached to it. Two things
are also printed black and are not the bunker:

  The rules.  A grid line runs the width of the field, so a window it crosses
  reads out to its own edge. `rules` marks the band each one occupies.

  The label text, and the leader line to it.  Thinner than any bunker face, so
  `attach_shade` opens the black mask first — every letter stroke and leader
  disappears, the faces survive — and then keeps only the pieces touching the
  paint it was given.

`open_r` is the one setting, and it goes with the scale of the print: about a
fifth of a foot, which is thicker than the type and thinner than a face.
"""
import numpy as np
from scipy import ndimage


def _disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r + 1


def rules(shape, xs, ys, half=3):
    """The band each printed rule occupies, as a mask."""
    m = np.zeros(shape[:2], bool)
    h, w = shape[:2]
    for x in xs:
        m[:, max(0, int(round(x - half))):min(w, int(round(x + half)) + 1)] = True
    for y in ys:
        m[max(0, int(round(y - half))):min(h, int(round(y + half)) + 1)] = True
    return m


def shadow(img, rule_mask=None, thr=90):
    """The faces the print has taken to black, with the grid taken out."""
    m = img.max(axis=2) < thr
    if rule_mask is not None:
        m = m & ~rule_mask
    return m


def open_radius(px_per_ft):
    """Thicker than the printed type, thinner than a bunker face."""
    return max(1, int(round(0.2 * px_per_ft)))


def contact_run(px_per_ft):
    """Half a foot of shared edge: a face runs along the paint, type does not."""
    return max(4, int(round(0.5 * px_per_ft)))


def attach_shade(seed, dark, open_r, contact=6):
    """Add to a paint blob the shadow-side faces that belong to it.

    A face and the lit face beside it share a long edge — half a foot of it at
    least. A label that a leader line happens to reach shares a few pixels. So
    the test is how much of the paint each black region actually runs along,
    which is what tells a face from the type set next to it.
    """
    core = ndimage.binary_opening(dark, _disk(open_r))
    if not core.any():
        return seed
    lab, n = ndimage.label(core, np.ones((3, 3)))
    if n == 0:
        return seed
    edge = ndimage.binary_dilation(seed, np.ones((3, 3))) & core
    ids, runs = np.unique(lab[edge], return_counts=True)
    keep = ids[(ids > 0) & (runs >= contact)]
    if not len(keep):
        return seed
    face = np.isin(lab, keep)
    # Opening rounds off the corner of every face it keeps, and a dorito is
    # nothing but corners, so grow each face back into the black it came from.
    # A leader line that survived this far can only creep the same few pixels.
    for _ in range(open_r + 1):
        face = ndimage.binary_dilation(face, np.ones((3, 3))) & dark
    return seed | face

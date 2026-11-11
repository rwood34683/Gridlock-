#!/usr/bin/env python3
"""Put a preview app (teasers/<kind>/index.html) on the coach app's look.

The previews were built on a navy-and-blue theme with a green-turf field.
The coach app is a black stadium: #0b0c0d ground, red #ad1515 fills and
#e5252a accents, off-white #efedeb type, secondary type red rather than grey,
a dark field, and bunker paint from the coach app's own red / blue / neutral
ramps. This rewrites the colours in place; nothing else in the file moves.

    python3 tools/teaser_theme.py teasers/player/index.html
    python3 tools/teaser_theme.py --check teasers/player/index.html   # report only

It is idempotent: a second run changes nothing. Sunlight mode (body.sun) and
the colour-blind mode (body.cb) are left alone, because each is its own
deliberate palette.
"""
import colorsys
import re
import sys

# Exact swaps first: the page ground, the field, the bunker paint and the
# lanes, where the coach app has a named value to match.
EXACT = {
    # page and header ground
    "#06091a": "#0b0c0d", "#0a0f26": "#0b0c0d",
    # field: the coach app's ground, grid, border and side labels
    "#1c4a28": "#101111", "#0b2412": "#33383a", "#2c5a37": "#1d2022",
    "#11331a": "#0b0c0d", "#0d2a16": "#0b0c0d", "#16306a": "#26292a",
    "#bfe9cf": "#8d9092", "#cfd9ff": "#e8e8e8", "#b9c4e6": "#8d9092",
    "#0a1120": "#000000",
    # bunker paint: the coach app's red and blue ramps; purple was never a
    # paint any map printed, so it takes the neutral ramp
    "#d65a62": "#c2453d", "#b0333b": "#a02d27", "#7a1a22": "#7d1512",
    "#5a72e0": "#4a49c4", "#2f47b0": "#37369a", "#1a2775": "#25246e",
    "#1d2f86": "#25246e",
    "#9a4a8c": "#d4d6d7", "#6f1c63": "#b0b3b4", "#4a1240": "#8d9092",
    "#a23a94": "#8d9092",
    # the one accent, three weights
    "#e23b3b": "#e5252a", "#e02a45": "#e5252a", "#b3122a": "#ad1515",
    # the right pit / blue wire
    "#3b7bff": "#3d8bff", "#244a9a": "#244a9a",
}

# Lanes are white, blocked is grey and dashed, as on the coach app's
# Sightlines. The snake run is a bunker, so it is bunker red.
LITERAL = [
    ("cl?'#39d07a':'#c0303a'", "cl?'#ffffff':'#8d9092'"),
    ("stroke:'#39d07a','stroke-width':2.2", "stroke:'#a02d27','stroke-width':2.2"),
    ('background:#39d07a"></i>clear', 'background:#ffffff"></i>clear'),
    ('background:#39d07a"></i>can see', 'background:#ffffff"></i>can see'),
    ('background:#c0303a"></i>blocked', 'background:#8d9092"></i>blocked'),
    ('background:#c0303a"></i>blind', 'background:#8d9092"></i>blind'),
]

RGBA = [
    (re.compile(r"rgba\((3,6,16|4,8,20|8,12,26),"), "rgba(11,12,13,"),
]

SURFACE = [(0.06, "#0b0c0d"), (0.09, "#0f1011"), (0.13, "#161818"),
           (0.17, "#1e2121"), (0.22, "#26292a"), (1.0, "#3a3f40")]
INK, MUTE, DIM, LINE = "#efedeb", "#ff5a52", "#f04a44", "#3a3f40"
KNOWN = set(EXACT.values()) | {INK, MUTE, DIM, LINE} | {c for _, c in SURFACE}

HEX = re.compile(r"(?<![&\w])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
PROP = re.compile(r"(background|border|stroke|fill|stop-color|color|outline|shadow)[a-z-]*\s*['\"]?\s*[:=]",
                  re.I)


def hls(hexv):
    h = hexv if len(hexv) == 6 else "".join(c * 2 for c in hexv)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    return hh * 360, ll, ss


def is_text(prefix):
    """True when the colour is a CSS `color` (type), not a fill or border."""
    props = PROP.findall(prefix[-60:])
    if not props:
        return False
    last = props[-1].lower()
    return last == "color" and not re.search(r"(background|border|stop)-color\s*[:=][^;]*$", prefix[-60:], re.I)


def remap(hexv, prefix):
    if len(hexv) == 8:  # #rrggbbaa: recolour, keep the alpha
        return remap(hexv[:6], prefix) + hexv[6:]
    full = "#" + hexv.lower()
    if full in EXACT:
        return EXACT[full]
    if full in KNOWN:
        return full
    h, l, s = hls(hexv)
    if s < 0.12:
        return full  # neutral greys, white, black: already on palette
    navy = 195 <= h <= 265
    purple = 265 < h <= 300
    if (navy or purple) and l < 0.27:
        return next(c for top, c in SURFACE if l < top)
    if not navy:
        return full  # greens, yellows, oranges, reds: semantic, kept
    if l >= 0.80:
        return INK
    if s >= 0.65 and 205 <= h <= 235:
        return full  # saturated blue: the right pit, the blue wire
    if is_text(prefix) or l >= 0.55:
        return MUTE if l >= 0.6 else DIM
    return LINE


def theme(text):
    for old, new in LITERAL:
        text = text.replace(old, new)
    for rx, new in RGBA:
        text = rx.sub(new, text)
    out = []
    for line in text.split("\n"):
        if "body.sun" in line or "body.cb" in line:
            out.append(line)
            continue
        out.append(HEX.sub(lambda m: remap(m.group(1), line[:m.start()]), line))
    return "\n".join(out)


def main(args):
    dry = "--check" in args
    paths = [a for a in args if a != "--check"]
    for p in paths:
        with open(p, encoding="utf-8") as fh:
            src = fh.read()
        new = theme(src)
        if new != src and not dry:
            with open(p, "w", encoding="utf-8") as fh:
                fh.write(new)
        print(f"{p}: {'already themed' if new == src else ('needs theming' if dry else 'themed')}")


if __name__ == "__main__":
    main(sys.argv[1:] or ["teasers/player/index.html"])

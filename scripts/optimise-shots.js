#!/usr/bin/env node
/* Downscale and quantise the captured screenshots.

   Captures come out at 3x (1170px wide). The page never shows them wider
   than ~320 CSS px, so 640px is plenty, and flat UI quantises to a 256-colour
   palette with no visible loss — about a 5x saving over the raw PNGs. */
const { execFileSync } = require("child_process");
const path = require("path");

const dir = path.join(__dirname, "..", "site", "img", "shots");
execFileSync("python3", ["-c", `
import glob, os
from PIL import Image
total = 0
for f in sorted(glob.glob(os.path.join(${JSON.stringify(dir)}, '*.png'))):
    im = Image.open(f).convert('RGB')
    if im.width > 640:
        im = im.resize((640, round(640 * im.height / im.width)), Image.LANCZOS)
    im.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(f, optimize=True)
    kb = os.path.getsize(f) / 1024
    total += kb
    print('  %-20s %4d KB' % (os.path.basename(f), round(kb)))
print('  total %d KB' % round(total))
`], { stdio: "inherit" });

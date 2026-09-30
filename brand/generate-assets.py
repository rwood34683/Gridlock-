#!/usr/bin/env python3
"""Generate every store/launcher asset from the three brand SVGs.

Run after editing brand/*.svg:   python3 brand/generate-assets.py
"""
import os, shutil, subprocess
from PIL import Image, ImageDraw

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BRAND = os.path.join(ROOT, "brand")
OUT = os.path.join(BRAND, "out")
os.makedirs(OUT, exist_ok=True)


def render(svg_name, png_path, size, transparent=False):
    svg = open(os.path.join(BRAND, svg_name), encoding="utf-8").read()
    bg = "transparent" if transparent else "#0b0c0d"
    html = os.path.join(OUT, "_shot.html")
    with open(html, "w", encoding="utf-8") as f:
        f.write("<!doctype html><meta charset='utf-8'><style>*{margin:0;padding:0}"
                "html,body{background:%s}svg{display:block;width:%dpx;height:%dpx}"
                "</style>%s" % (bg, size, size, svg))
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
        "--default-background-color=00000000", "--force-device-scale-factor=1",
        "--screenshot=%s" % png_path, "--window-size=%d,%d" % (size, size),
        "file://" + html,
    ], check=True, capture_output=True)
    return png_path


def resize(src, dst, size, mode="RGB"):
    im = Image.open(src).convert("RGBA").resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if mode == "RGB":
        flat = Image.new("RGB", im.size, "#0b0c0d")
        flat.paste(im, mask=im.split()[3])
        flat.save(dst)
    else:
        im.save(dst)


def round_mask(src, dst, size):
    im = Image.open(src).convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, mask=mask)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.save(dst)


def letterbox(src, dst, w, h, bg="#0b0c0d"):
    """Centre the square splash art on a w×h canvas without distorting it."""
    art = Image.open(src).convert("RGBA")
    side = int(min(w, h) * 0.92)
    art = art.resize((side, side), Image.LANCZOS)
    canvas = Image.new("RGB", (w, h), bg)
    canvas.paste(art, ((w - side) // 2, (h - side) // 2), art)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    canvas.save(dst)


print("rendering masters…")
icon = render("icon.svg", os.path.join(OUT, "icon-1024.png"), 1024)
fg = render("icon-foreground.svg", os.path.join(OUT, "icon-foreground-1024.png"), 1024, transparent=True)
splash = render("splash.svg", os.path.join(OUT, "splash-2732.png"), 2732)

# ---------- iOS ----------
ios_assets = os.path.join(ROOT, "ios/App/App/Assets.xcassets")
if os.path.isdir(ios_assets):
    # App Store rejects icons with an alpha channel, so this one is flattened.
    resize(icon, os.path.join(ios_assets, "AppIcon.appiconset/AppIcon-512@2x.png"), 1024, "RGB")
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        shutil.copyfile(splash, os.path.join(ios_assets, "Splash.imageset", name))
    print("  ios: app icon + 3 splash slices")

# ---------- Android ----------
res = os.path.join(ROOT, "android/app/src/main/res")
if os.path.isdir(res):
    launcher = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for d, px in launcher.items():
        resize(icon, os.path.join(res, "mipmap-%s/ic_launcher.png" % d), px, "RGBA")
        round_mask(icon, os.path.join(res, "mipmap-%s/ic_launcher_round.png" % d), px)
        # Adaptive foregrounds are drawn on a 108dp canvas (launcher px × 2.25).
        resize(fg, os.path.join(res, "mipmap-%s/ic_launcher_foreground.png" % d), int(px * 2.25), "RGBA")
    print("  android: launcher icons at 5 densities (legacy, round, adaptive fg)")

    # Splash: portrait, landscape, and the density-less fallback.
    port = {"mdpi": (320, 480), "hdpi": (480, 800), "xhdpi": (720, 1280),
            "xxhdpi": (960, 1600), "xxxhdpi": (1280, 1920)}
    for d, (w, h) in port.items():
        letterbox(splash, os.path.join(res, "drawable-port-%s/splash.png" % d), w, h)
        letterbox(splash, os.path.join(res, "drawable-land-%s/splash.png" % d), h, w)
    letterbox(splash, os.path.join(res, "drawable/splash.png"), 480, 800)
    print("  android: splash at 5 densities × portrait/landscape")

# ---------- Store listings + web ----------
resize(icon, os.path.join(OUT, "play-store-icon-512.png"), 512, "RGB")   # Google Play listing
resize(icon, os.path.join(OUT, "app-store-icon-1024.png"), 1024, "RGB")  # App Store listing
print("  store listing icons")

web = os.path.join(ROOT, "web")
shutil.copyfile(os.path.join(BRAND, "icon.svg"), os.path.join(web, "icon.svg"))
resize(icon, os.path.join(web, "apple-touch-icon.png"), 180, "RGB")
for px in (192, 512):
    resize(icon, os.path.join(web, "icon-%d.png" % px), px, "RGB")
print("  web icons")

site = os.path.join(ROOT, "site")
if os.path.isdir(site):
    os.makedirs(os.path.join(site, "img"), exist_ok=True)
    shutil.copyfile(os.path.join(BRAND, "icon.svg"), os.path.join(site, "img/icon.svg"))
    resize(icon, os.path.join(site, "img/icon-512.png"), 512, "RGB")
    resize(icon, os.path.join(site, "img/apple-touch-icon.png"), 180, "RGB")
    print("  landing-page icons")

print("done.")

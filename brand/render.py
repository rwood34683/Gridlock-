import subprocess, os, sys, json, shutil
from PIL import Image

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
ROOT = os.path.abspath(os.path.dirname(__file__))
OUT = os.path.join(ROOT, "out")
os.makedirs(OUT, exist_ok=True)

def render_svg(svg_path, png_path, size, bg="#0b1220"):
    """Rasterize an SVG at `size` px square via headless Chromium."""
    html = os.path.join(OUT, "_shot.html")
    svg = open(svg_path, encoding="utf-8").read()
    with open(html, "w", encoding="utf-8") as f:
        f.write(
            "<!doctype html><html><head><meta charset='utf-8'><style>"
            "*{margin:0;padding:0}html,body{background:%s}"
            "svg{display:block;width:%dpx;height:%dpx}"
            "</style></head><body>%s</body></html>" % (bg, size, size, svg)
        )
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--no-sandbox",
        "--hide-scrollbars", "--default-background-color=00000000",
        "--force-device-scale-factor=1",
        "--screenshot=%s" % png_path,
        "--window-size=%d,%d" % (size, size),
        "file://" + html,
    ], check=True, capture_output=True)
    return png_path

if __name__ == "__main__":
    master = os.path.join(OUT, "icon-1024.png")
    render_svg(os.path.join(ROOT, "icon.svg"), master, 1024)
    im = Image.open(master)
    print(master, im.size, im.mode)

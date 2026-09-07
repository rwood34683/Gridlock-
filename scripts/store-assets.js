#!/usr/bin/env node
/* Build every image the App Store and Google Play ask for.
 *
 *   npm run serve            # terminal 1
 *   node scripts/store-assets.js
 *
 * Writes store/ — one folder per destination, at the exact pixel sizes each
 * store accepts. Nothing here is a mockup: every panel is a real capture of the
 * running app, driven into the demo state in scripts/seed.js, then composed on
 * the brand ground with the caption that panel is making.
 *
 * Sizes (checked against each store's current spec):
 *   App Store  6.9" iPhone   1290 x 2796   (required)
 *   App Store  6.5" iPhone   1242 x 2688   (accepted for older device classes)
 *   Play       phone         1080 x 1920   (min 2, max 8, 9:16)
 *   Play       feature       1024 x 500    (required)
 *   Play       icon           512 x 512    ) both already produced by
 *   App Store  icon          1024 x 1024   ) `npm run icons` into brand/out/
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "..", "node_modules", "playwright-core"));
const SEED = require("./seed");

const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = process.env.APP_URL || "http://localhost:5173/";
const OUT = path.join(__dirname, "..", "store");
const BRAND = path.join(__dirname, "..", "brand", "out");

// Logical viewport x scale = the pixel size the store wants.
const DEVICES = [
  { key: "ios-6.9",    dir: "app-store/iphone-6.9", w: 430, h: 932, dsf: 3 },   // 1290 x 2796
  { key: "ios-6.5",    dir: "app-store/iphone-6.5", w: 414, h: 896, dsf: 3 },   // 1242 x 2688
  { key: "play-phone", dir: "play/phone",           w: 360, h: 640, dsf: 3 },   // 1080 x 1920
];

// Order matters — the first two are what most people ever see.
// Copy states what the panel shows. No claim the build does not back up.
const SCENES = [
  { file: "1-playbook",   go: t => tab(t, "Playbook"), focus: ".field-wrap",
    eyebrow: "Playbook",
    head: "Call the break.\nDirect all five.",
    sub: "Every bunker measured off the official map." },

  { file: "2-scout",      go: t => tab(t, "Scout"),
    eyebrow: "Scout",
    head: "Read the other pit\nbetween points.",
    sub: "A training aid, not a prediction." },

  { file: "3-tally",      go: t => tab(t, "Tally"),
    eyebrow: "Tally",
    head: "Log the point\nwith gloves on.",
    sub: "Two taps. No signal needed." },

  { file: "4-sightlines", go: t => tab(t, "Sightlines"), focus: ".field-wrap",
    eyebrow: "Sightlines",
    head: "See which lanes\nare actually open.",
    sub: "Every lane checked against every footprint." },

  { file: "5-classes",    go: more("Classes"),
    eyebrow: "Classes",
    head: "Run a clinic\noff a join code.",
    sub: "Joining never needs an account." },

  { file: "6-league",     go: more("League"),
    eyebrow: "League",
    head: "Reach ops, refs\nand the gate.",
    sub: "Groups, blasts, and a log of what you sent." },
];

function tab(page, name) {
  return page.locator(".tabs button", { hasText: name }).click();
}
function more(item) {
  return async page => {
    await page.locator(".tabs button", { hasText: "More" }).click();
    await page.waitForTimeout(200);
    await page.locator(".list__row", { hasText: item }).first().click();
  };
}

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* One store panel: caption on the brand ground, the real screen below it.
   The shot is bled off the bottom edge — a whole floating phone wastes the
   panel's height, and the stores show these small. */
function panelHTML(px, py, shotDataURI, scene) {
  const capH = Math.round(py * 0.26);
  const inset = Math.round(px * 0.055);
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Barlow:wght@400;500&display=swap">
<style>
  html,body{margin:0;width:${px}px;height:${py}px;overflow:hidden;background:#000}
  .panel{position:relative;width:${px}px;height:${py}px;
    background:radial-gradient(${px * 1.5}px ${capH * 1.9}px at 50% -6%, rgba(173,21,21,.34) 0%, rgba(173,21,21,0) 66%),
               linear-gradient(#101112,#0b0c0d);}
  .grid{position:absolute;inset:0;pointer-events:none;
    background-image:
      repeating-linear-gradient(to right, rgba(255,255,255,.05) 0 ${Math.max(1, Math.round(px / 700))}px, transparent ${Math.max(1, Math.round(px / 700))}px ${Math.round(px / 9)}px),
      repeating-linear-gradient(to bottom, rgba(255,255,255,.05) 0 ${Math.max(1, Math.round(px / 700))}px, transparent ${Math.max(1, Math.round(px / 700))}px ${Math.round(px / 9)}px);
    -webkit-mask-image:radial-gradient(${px * 1.3}px ${capH * 2.2}px at 50% 0%, #000 0%, transparent 76%);}
  .cap{position:relative;height:${capH}px;display:flex;flex-direction:column;justify-content:center;
    padding:0 ${inset}px;gap:${Math.round(px * 0.022)}px}
  .eyebrow{font-family:Oswald,"Arial Narrow",sans-serif;font-weight:500;
    font-size:${Math.round(px * 0.029)}px;letter-spacing:${px * 0.0095}px;text-transform:uppercase;color:#e5252a;margin:0}
  h1{font-family:Oswald,"Arial Narrow",sans-serif;font-weight:600;
    font-size:${Math.round(px * 0.079)}px;line-height:1.06;letter-spacing:${px * 0.0006}px;
    color:#efedeb;margin:0;white-space:pre-line}
  .sub{font-family:Barlow,Arial,sans-serif;font-weight:400;
    font-size:${Math.round(px * 0.031)}px;line-height:1.35;color:#a4a5a5;margin:0}
  .shotwrap{position:absolute;left:${inset}px;right:${inset}px;top:${capH}px;bottom:0;
    border-radius:${Math.round(px * 0.035)}px ${Math.round(px * 0.035)}px 0 0;overflow:hidden;
    border:${Math.max(1, Math.round(px / 900))}px solid #3a3e3e;border-bottom:0;
    box-shadow:0 ${Math.round(px * 0.03)}px ${Math.round(px * 0.07)}px rgba(0,0,0,.75)}
  .shotwrap img{display:block;width:100%;height:auto}
</style></head><body>
<div class="panel">
  <div class="grid"></div>
  <div class="cap">
    <p class="eyebrow">${esc(scene.eyebrow)}</p>
    <h1>${esc(scene.head)}</h1>
    <p class="sub">${esc(scene.sub)}</p>
  </div>
  <div class="shotwrap"><img src="${shotDataURI}"></div>
</div></body></html>`;
}

/* Play's feature graphic. 1024 x 500, and Play crops it on some surfaces, so
   nothing that matters goes near an edge. */
function featureHTML(iconDataURI) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Barlow:wght@400;500&display=swap">
<style>
  html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:#000}
  /* Play crops this graphic toward the centre on some surfaces, so the lockup
     is centred rather than set against the left edge. */
  .fg{position:relative;width:1024px;height:500px;display:flex;align-items:center;
    justify-content:center;gap:44px;padding:0 64px;
    background:radial-gradient(900px 460px at 22% 6%, rgba(173,21,21,.36) 0%, rgba(173,21,21,0) 64%),
               linear-gradient(#111213,#0b0c0d)}
  .grid{position:absolute;inset:0;
    background-image:
      repeating-linear-gradient(to right, rgba(255,255,255,.055) 0 1px, transparent 1px 64px),
      repeating-linear-gradient(to bottom, rgba(255,255,255,.055) 0 1px, transparent 1px 64px);
    -webkit-mask-image:radial-gradient(760px 460px at 30% 0%, #000 0%, transparent 78%)}
  /* the centre 50, dashed the way it is on a layout */
  .fifty{position:absolute;left:50%;top:0;bottom:0;width:1px;
    background:repeating-linear-gradient(to bottom, rgba(255,255,255,.13) 0 9px, transparent 9px 20px)}
  .icon{position:relative;width:150px;height:150px;border-radius:32px;flex:none;
    box-shadow:0 20px 46px rgba(0,0,0,.66)}
  .copy{position:relative}
  .name{font-family:Oswald,"Arial Narrow",sans-serif;font-weight:700;font-size:78px;line-height:.94;
    letter-spacing:9px;text-transform:uppercase;color:#efedeb;margin:0}
  .sys{font-family:Oswald,"Arial Narrow",sans-serif;font-weight:500;font-size:15px;letter-spacing:7.5px;
    text-transform:uppercase;color:#e5252a;margin:9px 0 0;padding-left:3px}
  .tag{font-family:Oswald,"Arial Narrow",sans-serif;font-weight:400;font-size:27px;letter-spacing:.6px;
    color:#a4a5a5;margin:22px 0 0}
  .wires{display:flex;gap:10px;margin-top:26px}
  .wires i{display:block;height:5px;border-radius:3px}
  .wires i:nth-child(1){width:112px;background:#e5342f}
  .wires i:nth-child(2){width:64px;background:#3d8bff}
</style></head><body>
<div class="fg">
  <div class="grid"></div><div class="fifty"></div>
  <img class="icon" src="${iconDataURI}">
  <div class="copy">
    <p class="name">Gridlock</p>
    <p class="sys">System · Coach Edition</p>
    <p class="tag">Call the break. Direct the five. Own the point.</p>
    <div class="wires"><i></i><i></i></div>
  </div>
</div></body></html>`;
}

const dataURI = f => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const errors = [];
  const written = [];

  const shoot = async (html, px, py, file) => {
    const page = await (await browser.newContext({
      viewport: { width: px, height: py }, deviceScaleFactor: 1,
    })).newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file });
    await page.close();
    written.push([path.relative(OUT, file), `${px}x${py}`]);
  };

  for (const d of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dsf,
    });
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push(`${d.key}: ${e.message}`));
    await page.goto(URL);
    await page.evaluate(s => localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)), SEED);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const px = d.w * d.dsf, py = d.h * d.dsf;
    for (const scene of SCENES) {
      await scene.go(page);
      await page.waitForTimeout(350);
      // Put the thing the caption is talking about at the top of the panel —
      // a store shot that leads with a header sells nothing.
      await page.evaluate(sel => {
        const m = document.querySelector(".main");
        if (!m) return;
        const el = sel && document.querySelector(sel);
        // the header is sticky, so leave room for it or it eats the top of the shot
        m.scrollTop = el ? Math.max(0, el.offsetTop - 104) : 0;
      }, scene.focus || null);
      await page.waitForTimeout(160);
      const raw = path.join(OUT, "_raw", `${d.key}-${scene.file}.png`);
      fs.mkdirSync(path.dirname(raw), { recursive: true });
      await page.screenshot({ path: raw });
      await shoot(panelHTML(px, py, dataURI(raw), scene), px, py,
                  path.join(OUT, d.dir, `${scene.file}.png`));
    }
    await ctx.close();
  }

  // Feature graphic, off the same mark the stores get.
  const icon = path.join(BRAND, "play-store-icon-512.png");
  if (fs.existsSync(icon)) {
    await shoot(featureHTML(dataURI(icon)), 1024, 500, path.join(OUT, "play", "feature-graphic.png"));
  } else {
    console.warn("  brand/out/play-store-icon-512.png missing — run `npm run icons` first");
  }

  await browser.close();

  const bad = written.filter(([f, size]) => {
    const [w, h] = size.split("x").map(Number);
    const im = fs.statSync(path.join(OUT, f));
    return !im.size;
  });
  console.log("GRIDLOCK store assets");
  console.log("=====================\n");
  for (const [f, size] of written) console.log(`  ${size.padEnd(11)} ${f}`);
  console.log(`\n${written.length} images → ${OUT}`);
  console.log("  icons: brand/out/app-store-icon-1024.png, brand/out/play-store-icon-512.png (npm run icons)");
  if (errors.length) { console.error("\napp errors during capture:\n" + errors.join("\n")); process.exit(1); }
  if (bad.length) { console.error("\nempty output: " + bad.join(", ")); process.exit(1); }
})();

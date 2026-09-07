#!/usr/bin/env node
/* Prove the rendered field matches the official map.
 *
 * The app draws each bunker from its measured footprint, so geometry should be
 * exact by construction. This checks that claim rather than assuming it: it
 * reads the drawn SVG back out of the browser, converts every shape's bounding
 * box to feet, and compares it against the digitized event JSON.
 *
 *   npm run serve            # terminal 1
 *   node tools/verify_bunkers.js
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "..", "node_modules", "playwright-core"));

const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = process.env.APP_URL || "http://localhost:5173/";
const EVENT = path.join(__dirname, "..", "layouts", "events", "nxl_2026_midwest_open.json");
const TOL = 0.05;   // ft — a twentieth of a foot, well under the map's line weight

(async () => {
  const want = JSON.parse(fs.readFileSync(EVENT, "utf8")).bunkers;
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("gridlock.coach.v2", JSON.stringify({
    entered: true, role: "staff", tab: "sightlines", layoutKey: "mwo", tips: { sl: 1 },
  })));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // Measure what the browser actually painted, in the field's own units.
  const drawn = await page.evaluate(() => {
    const sx = 300 / 150, sy = 240 / 120;                // svg units per foot
    const out = {};
    document.querySelectorAll("svg.field g.bnk").forEach(el => {
      const b = el.getBBox();
      out[el.dataset.b] = { x: (b.x + b.width / 2) / sx, y: (b.y + b.height / 2) / sy,
                            w: b.width / sx, h: b.height / sy };
    });
    return out;
  });

  // Every bunker in the map must be on the field, matched by its own id —
  // never by "whichever shape happens to be nearest".
  const ids = {};
  want.forEach(b => { ids[b.name] = (ids[b.name] || 0) + 1; });
  const seq = {};
  const rows = [];
  let worstPos = 0, worstSize = 0;
  for (const b of want) {
    seq[b.name] = (seq[b.name] || 0) + 1;
    const id = `${b.name}#${seq[b.name]}`;
    const d = drawn[id];
    if (!d) { rows.push({ name: b.name, id: b.type, missing: id, ok: false }); continue; }
    const dPos = Math.hypot(d.x - b.x_ft, d.y - b.y_ft);
    const dW = Math.abs(d.w - b.w_ft), dH = Math.abs(d.h - b.h_ft);
    worstPos = Math.max(worstPos, dPos);
    worstSize = Math.max(worstSize, dW, dH);
    rows.push({ name: id, id: b.type, dPos, dW, dH, ok: dPos <= TOL && dW <= TOL && dH <= TOL });
  }

  console.log("Rendered field vs digitized map");
  console.log("===============================\n");
  console.log(`bunkers in the event JSON : ${want.length}`);
  console.log(`bunkers drawn on the field : ${Object.keys(drawn).length}`);
  console.log(`tolerance                 : ${TOL} ft\n`);
  const bad = rows.filter(r => !r.ok);
  if (bad.length) {
    console.log("OUT OF TOLERANCE:");
    for (const r of bad) console.log(r.missing ? `  MISSING ${r.missing}` : `  ${r.name.padEnd(8)} ${r.id.padEnd(16)} pos ${r.dPos.toFixed(3)}  w ${r.dW.toFixed(3)}  h ${r.dH.toFixed(3)}`);
  }
  console.log(`worst position error : ${worstPos.toFixed(4)} ft  (${(worstPos * 12).toFixed(2)} in)`);
  console.log(`worst footprint error: ${worstSize.toFixed(4)} ft  (${(worstSize * 12).toFixed(2)} in)`);
  console.log(`\n${rows.length - bad.length}/${rows.length} bunkers drawn within tolerance.`);

  await browser.close();
  process.exit(bad.length || Object.keys(drawn).length !== want.length ? 1 : 0);
})();

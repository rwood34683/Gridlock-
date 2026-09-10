#!/usr/bin/env node
/* Prove the app holds up on the phones and tablets people actually own.
 *
 *   npm run serve            # terminal 1
 *   node test/devices.js
 *
 * Every device Apple has shipped since 2020 that is still supported, plus the
 * iPad line, driven through every tab. Four things are checked on each, because
 * these are the four ways a web app inside a native shell goes wrong:
 *
 *   1. Horizontal overflow — the tell-tale of a layout that assumed one width.
 *   2. The tab bar leaving the viewport, which strands the user.
 *   3. Tap targets under 44 px, which Apple asks for, Android asks 48 dp for,
 *      and a coach in a glove needs more than either.
 *   4. Running text past 80 characters a line, which is what a phone layout
 *      stretched across an iPad looks like.
 *
 * Safe-area handling is asserted separately: Chromium has no notch to emulate,
 * so the CSS rules that pad for one are checked statically.
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "..", "node_modules", "playwright-core"));
const SEED = require(path.join(__dirname, "..", "scripts", "seed.js"));

const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = process.env.APP_URL || "http://localhost:5173/";

const TAP = 44;        // px, short axis
const MEASURE = 80;    // characters a line
const RAIL = 900;      // px wide, the width the bottom bar becomes a left rail
const RAIL_ROW = 96;   // px, the tallest a rail row may be before it is a slab

// Logical CSS px, portrait. Every one of these is a device still taking iOS 17+.
const DEVICES = [
  ["iPhone SE 2 / SE 3",        375, 667],
  ["iPhone 12 / 13 mini",       375, 812],
  ["iPhone 12 / 13 / 14 / 16e", 390, 844],
  ["iPhone 15 / 16 / 17",       393, 852],
  ["iPhone 16 / 17 Pro",        402, 874],
  ["iPhone 14 / 15 Plus",       428, 926],
  ["iPhone 16 / 17 Pro Max",    430, 932],
  ["iPad mini 6",               744, 1133],
  ["iPad 10.9 / Air 11",        820, 1180],
  ["iPad Pro 11",               834, 1194],
  ["iPad Pro 13",              1024, 1366],
  ["iPad Pro 13 landscape",    1366, 1024],
  // A phone turned sideways is the shape the layout most easily gets wrong:
  // wide and very short. Info.plist allows it, so it has to hold up.
  ["iPhone SE landscape",       667, 375],
  ["iPhone 15 / 16 landscape",  852, 393],
  ["iPhone Pro Max landscape",  932, 430],
  ["Pixel 7 / 8",               412, 915],
  ["Galaxy S23 / S24",          360, 780],
];
const TABS = ["Playbook", "Tally", "Scout", "Sightlines", "More"];

const measure = () => {
  const out = { over: 0, tap: null, line: null };

  const doc = document.documentElement;
  const main = document.querySelector(".main");
  out.over = Math.max(doc.scrollWidth - window.innerWidth,
                      main ? main.scrollWidth - main.clientWidth : 0);

  const tabs = document.querySelector(".tabs");
  const r = tabs && tabs.getBoundingClientRect();
  out.tabsIn = !!r && Math.ceil(r.bottom) <= window.innerHeight + 1 && r.top >= 0;

  // Where the five destinations stand, and what shape they are. A rail that
  // lands in the right column but whose buttons still stack icon-over-label and
  // stretch to fill a metre of black is not a rail; the geometry above says
  // nothing about that, so measure the buttons too.
  const btns = [...document.querySelectorAll(".tabs button")].map(b => b.getBoundingClientRect());
  out.rail = !!r && r.width < 320 && r.height > window.innerHeight * 0.5;
  out.btnTall = btns.length ? Math.ceil(Math.max(...btns.map(b => b.height))) : 0;
  out.btnRow = btns.length > 0 && btns.every(b => b.width > b.height);
  out.clash = !!(r && main && r.right > main.left + 1 && r.left < main.right - 1
                          && r.bottom > main.top + 1 && r.top < main.bottom - 1);

  // Smallest interactive target on screen, by its short axis. A horizontal
  // scroller can park a control off-screen; those are not on screen, so skip.
  document.querySelectorAll("button,select,textarea,a[href],input:not([type=hidden])").forEach(el => {
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) return;
    if (b.right < 0 || b.left > window.innerWidth) return;
    const short = Math.ceil(Math.min(b.width, b.height));   // 43.5 css px is 44
    if (!out.tap || short < out.tap.px)
      out.tap = { px: short, what: ((el.textContent || el.tagName).trim() || el.tagName).slice(0, 18) };
  });

  // Longest line of running text, counted for real: how many characters the
  // block holds divided by how many lines it wraps to.
  document.querySelectorAll(".main p, .main li, .main .note, .main td").forEach(el => {
    if (el.children.length) return;                          // leaf text only
    const txt = (el.textContent || "").trim();
    if (txt.length < 70) return;
    const rng = document.createRange();
    rng.selectNodeContents(el);
    const lines = new Set([...rng.getClientRects()].map(x => Math.round(x.top))).size || 1;
    const ch = Math.round(txt.length / lines);
    if (!out.line || ch > out.line.ch) out.line = { ch, what: txt.slice(0, 22) };
  });
  return out;
};

(async () => {
  const results = [];
  const errors = [];
  const check = (group, name, pass, detail) => results.push({ group, name, pass, detail });

  // --- safe areas: static, because there is no notch to emulate ------------
  const css = fs.readFileSync(path.join(__dirname, "..", "web", "index.html"), "utf8");
  check("Safe areas", "the viewport opts into the full screen", /viewport-fit=cover/.test(css));
  for (const [sel, side] of [[".hdr", "top"], [".tabs", "bottom"], [".main", "left"], [".main", "right"]]) {
    const block = new RegExp(`\\${sel}\\{[^}]*safe-area-inset-${side}`, "s");
    check("Safe areas", `${sel} pads for the ${side} inset`, block.test(css));
  }

  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const rows = [];

  for (const [name, w, h] of DEVICES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push(`${name}: ${e.message}`));
    await page.goto(URL);
    await page.evaluate(s => localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)), SEED);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(320);

    const worst = { over: 0, tap: null, line: null, tabsIn: true,
                    rail: true, btnTall: 0, btnRow: true, clash: false };
    for (const tab of TABS) {
      await page.locator(".tabs button", { hasText: tab }).click();
      await page.waitForTimeout(260);
      const m = await page.evaluate(measure);
      worst.over = Math.max(worst.over, m.over);
      worst.tabsIn = worst.tabsIn && m.tabsIn;
      worst.rail = worst.rail && m.rail;
      worst.btnRow = worst.btnRow && m.btnRow;
      worst.clash = worst.clash || m.clash;
      worst.btnTall = Math.max(worst.btnTall, m.btnTall);
      if (m.tap && (!worst.tap || m.tap.px < worst.tap.px)) worst.tap = { ...m.tap, tab };
      if (m.line && (!worst.line || m.line.ch > worst.line.ch)) worst.line = { ...m.line, tab };
    }
    rows.push([name, `${w}x${h}`, worst]);
    await ctx.close();

    const g = "Devices";
    check(g, `${name} — no sideways scroll`, worst.over <= 0, worst.over > 0 ? `${worst.over}px over` : "");
    check(g, `${name} — tab bar on screen`, worst.tabsIn);
    check(g, `${name} — every target ${TAP}px+`, !worst.tap || worst.tap.px >= TAP,
          worst.tap ? `${worst.tap.px}px "${worst.tap.what}" on ${worst.tap.tab}` : "");
    check(g, `${name} — text under ${MEASURE} ch`, !worst.line || worst.line.ch <= MEASURE,
          worst.line ? `${worst.line.ch} ch on ${worst.line.tab}` : "");

    // The five destinations. Wide enough and they stand in a rail down the
    // left, each one a row you can read; narrow and the bottom bar is right.
    if (w >= RAIL) {
      check(g, `${name} — five in a rail down the left`, worst.rail && !worst.clash,
            worst.rail ? (worst.clash ? "rail sits over the page" : "") : "still the bottom bar");
      check(g, `${name} — rail rows read as rows`, worst.btnRow && worst.btnTall <= RAIL_ROW,
            worst.btnRow ? (worst.btnTall > RAIL_ROW ? `${worst.btnTall}px tall` : "") : "label under the marker");
    } else {
      check(g, `${name} — the bottom bar stays`, !worst.rail, worst.rail ? "went to a rail" : "");
    }
  }
  await browser.close();

  console.log("GRIDLOCK device suite");
  console.log("=====================\n");
  console.log("DEVICE                       VIEWPORT     OVERFLOW  TAB BAR  MIN TAP  MAX LINE");
  console.log("-".repeat(80));
  for (const [n, v, x] of rows)
    console.log(`${n.padEnd(28)} ${v.padEnd(12)} ${String(x.over + "px").padEnd(9)} ` +
                `${(x.tabsIn ? "on" : "CUT").padEnd(8)} ${String((x.tap ? x.tap.px : "-") + "px").padEnd(8)} ` +
                `${x.line ? x.line.ch + " ch" : "-"}`);

  let last = "";
  console.log("");
  const failed = results.filter(r => !r.pass);
  for (const r of failed.length ? failed : results.filter(r => r.group === "Safe areas")) {
    if (r.group !== last) { console.log(`\n${r.group}`); console.log("-".repeat(r.group.length)); last = r.group; }
    console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  — " + r.detail : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed across ${DEVICES.length} devices.`);
  if (errors.length) { console.log("\nPAGE ERRORS:"); errors.forEach(e => console.log("  " + e)); }
  else console.log("No page errors during the run.");

  process.exit(failed.length || errors.length ? 1 : 0);
})();

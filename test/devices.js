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
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");
const SEED = require(path.join(__dirname, "..", "scripts", "seed.js"));

const URL = process.env.APP_URL || "http://localhost:5173/";

const TAP = 44;        // px, short axis
const MEASURE = 80;    // characters a line
const RAIL = 740;      // px wide, the width the bottom bar becomes a left rail —
const RAIL_TALL = 600; // — on a screen at least this tall (every iPad; never a phone on its side)
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
  ["iPad 10.2 (9th gen)",       810, 1080],
  ["iPad 10.2 landscape",      1080, 810],
  ["iPad 10.9 / Air 11",        820, 1180],
  ["iPad Air 11 landscape",    1180, 820],
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
  // A table wider than its wrap scrolls sideways and hides its last columns;
  // the page itself never overflows, so this is measured on its own.
  out.tbl = Math.max(0, ...[...document.querySelectorAll(".tblwrap")].map(w => { const t = w.querySelector("table"); return t ? t.scrollWidth - w.clientWidth : 0; }));

  const tabs = document.querySelector(".tabs");
  const r = tabs && tabs.getBoundingClientRect();
  out.tabsIn = !!r && Math.ceil(r.bottom) <= window.innerHeight + 1 && r.top >= 0;
  // Every chip in the header's top row inside the screen. The header clips
  // rather than scrolls, so a chip pushed off the right edge never showed up
  // as overflow — the Staff chip vanished at 320 px with the score chip up.
  out.hdrIn = [...document.querySelectorAll(".hdr__top > *")].every(el => {
    const b = el.getBoundingClientRect(); return !b.width || b.right <= window.innerWidth + 1;
  });

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

  const browser = await chromium.launch(launchOptions());
  const rows = [];

  for (const [name, w, h] of DEVICES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push(`${name}: ${e.message}`));
    await page.goto(URL);
    await page.evaluate(s => localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)), SEED);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(320);

    const worst = { over: 0, tap: null, line: null, tabsIn: true, hdrIn: true,
                    rail: true, btnTall: 0, btnRow: true, clash: false, tbl: 0 };
    for (const tab of TABS) {
      await page.locator(".tabs button", { hasText: tab }).click();
      await page.waitForTimeout(260);
      const m = await page.evaluate(measure);
      worst.over = Math.max(worst.over, m.over);
      worst.tbl = Math.max(worst.tbl, m.tbl || 0);
      worst.tabsIn = worst.tabsIn && m.tabsIn;
      worst.hdrIn = worst.hdrIn && m.hdrIn;
      worst.rail = worst.rail && m.rail;
      worst.btnRow = worst.btnRow && m.btnRow;
      worst.clash = worst.clash || m.clash;
      worst.btnTall = Math.max(worst.btnTall, m.btnTall);
      if (m.tap && (!worst.tap || m.tap.px < worst.tap.px)) worst.tap = { ...m.tap, tab };
      if (m.line && (!worst.line || m.line.ch > worst.line.ch)) worst.line = { ...m.line, tab };
    }
    // Every screen — not only the five tabs. The tab loop above never opened
    // a Scout sub-tab, a More section, the breakout sheet, the penalty box or
    // Cards, and the penalty's 1–4 sat at 41 px on every iPad and phone until
    // an iPad probe walked them. Measured on each device: sideways scroll,
    // anything past the right edge that does not sit in a scroller, and
    // targets under 44 px.
    {
      const everyScreen = await page.evaluate((TAP) => {
        try{
          window.confirm = () => true;
          const bad = [];
          const look = where => {
            const W = window.innerWidth, doc = document.documentElement, main = document.querySelector(".main");
            const over = Math.max(doc.scrollWidth - W, main ? main.scrollWidth - main.clientWidth : 0);
            if (over > 1) bad.push(`${where}: ${over}px sideways`);
            const inScroller = el => { for (let a = el.parentElement; a; a = a.parentElement) { const cs = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) return true; } return false; };
            document.querySelectorAll("#root button, #root select, #root input:not([type=hidden]), #root textarea").forEach(el => {
              const b = el.getBoundingClientRect(); if (b.width <= 2 || b.height <= 2 || b.left > W) return;
              if (b.right > W + 1 && !inScroller(el)) bad.push(`${where}: "${(el.textContent || el.tagName).trim().slice(0, 20)}" past the edge`);
              if (Math.ceil(Math.min(b.width, b.height)) < TAP && !el.closest(".seg")) bad.push(`${where}: ${Math.round(Math.min(b.width, b.height))}px "${(el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 20)}"`);
            });
          };
          SCOUT_TABS.forEach(([k]) => { window.set({ tab: "scout", scoutTab: k }); look("Scout › " + k); });
          MORE_GROUPS.flatMap(([, rows]) => rows.map(r => r[0])).forEach(k => { window.set({ tab: "more", more: k }); look("More › " + k); });
          window.set({ tab: "tally", penOpen: true }); look("the penalty box");
          window.set({ penOpen: false }); window.tallyStepTo("record"); look("the breakout sheet");
          window.tallyStepTo("place");
          window.set({ tab: "playbook", pbView: "cards" }); look("Cards");
          window.set({ pbView: null });
          return bad.length ? [...new Set(bad)].slice(0, 6).join("; ") : true;
        }catch(e){ return "threw " + e.message; }
      }, TAP);
      check("Devices", `${name} — every Scout sub-tab, More section and open sheet holds up`, everyScreen === true, everyScreen === true ? "" : String(everyScreen));
      await page.evaluate(s => { localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, SEED);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(200);
    }
    // The call row under the field. On an iPad on its side the call card is a
    // 340 px column beside the field, and "Change the call" broke onto two
    // lines inside a button of normal height — no overflow, no tall button, so
    // only counting the label's lines catches it. Both shapes of the row: one
    // of the twelve (Make it yours) and one of his own (Edit, Delete).
    const callRow = await page.evaluate(() => {
      try{
        const lines = btn => { const r = document.createRange(); r.selectNodeContents(btn); return new Set([...r.getClientRects()].map(q => Math.round(q.top))).size; };
        const bad = [];
        const L = S.layoutKey, keepPlays = S.plays, keepScript = S.script;
        S.plays = [...(S.plays || []).filter(p => p.k !== "my:dev-row"), { k: "my:dev-row", name: "Rocket Left", read: "", aggr: 3, plants: { [L]: curLayout().bunkers.slice(0, 5).map(b => b.id) }, at: 1 }];
        for (const k of ["snake", "my:dev-row"]) {
          window.set({ tab: "playbook", pbView: null, script: k });
          const row = document.querySelector("#root .callrow"); if(!row){ bad.push("no call row on " + k); continue; }
          row.querySelectorAll("button").forEach(b => { const r = b.getBoundingClientRect();
            if(lines(b) > 1) bad.push(`"${b.textContent.trim()}" on ${lines(b)} lines`);
            if(r.right > window.innerWidth + 1) bad.push(`"${b.textContent.trim()}" past the edge`); });
        }
        S.plays = keepPlays; window.set({ script: keepScript });
        return bad.length ? bad.join("; ") : true;
      }catch(e){ return "threw " + e.message; }
    });
    check("Devices", `${name} — the call row under the field reads on one line a button`, callRow === true, callRow === true ? "" : String(callRow));
    // The header at its fullest: the break clock running, a long race score
    // and the Staff chip. Four chips at 375 px ran the Staff chip off the edge.
    const stressed = await page.evaluate(() => {
      try{
        if(!matchVs()){ S.right = {name: "Houston Heat"}; S.matches = S.matches.map(m => m.id === S.matchId ? {...m, vs: "Houston Heat"} : m); }
        S.matches = S.matches.map(m => m.id === S.matchId ? {...m, raceTo: 7} : m);
        S.results = [...(S.results || []).filter(r => r.m !== S.matchId), ...Array.from({length: 11}, (_, i) => ({m: S.matchId, pt: i + 1, won: i % 2 ? "us" : "them", at: 1}))];
        S.point = 12; S.clockEnd = Date.now() + 90000; render();
        return [...document.querySelectorAll(".hdr__top > *")].every(el => { const b = el.getBoundingClientRect(); return !b.width || b.right <= window.innerWidth + 1; });
      }catch(e){ return "threw " + e.message; }
    });
    check("Devices", `${name} — header chips on screen with the clock and score up`, stressed === true, stressed === true ? "" : String(stressed));
    // Two long team names on a watched game: the Scout break toggle and the
    // whose-five switch wrap rather than pushing the third option off the edge.
    const longNames = await page.evaluate(() => {
      try{
        window.set({ left: { name: "Edmonton Impact Paintball Club" }, right: { name: "San Antonio X-Factor Elite Squad" }, tab: "scout", scoutTab: "matchup" });
        window.openSheet({ vs: "San Antonio X-Factor Elite Squad", watch: true, home: "Edmonton Impact Paintball Club", away: "San Antonio X-Factor Elite Squad" });
        window.set({ scoutTab: "breakouts" }); window.set({ scoutTab: "matchup" });
        const past = [...document.querySelectorAll(".seg--wrap button")].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.right > window.innerWidth + 1; }).length;
        const segs = document.querySelectorAll(".seg--wrap").length;
        // and the two columns on the point sheet, with a long opponent and a long man
        S.roster = [{name: "Bartholomew Fitzgerald-Montgomery", num: 1, p: "", s: ""}, ...S.roster.slice(1)];
        window.set({ tab: "tally", whoOn: true });
        const main = document.querySelector(".main"), tallyOver = Math.max(document.documentElement.scrollWidth - window.innerWidth, main ? main.scrollWidth - main.clientWidth : 0);
        return segs >= 1 && past === 0 && tallyOver <= 1 ? true : `${segs} segments, ${past} options past the edge, Tally ${tallyOver}px over`;
      }catch(e){ return "threw " + e.message; }
    });
    check("Devices", `${name} — long team and player names stay on screen on Scout and Tally`, longNames === true, longNames === true ? "" : String(longNames));
    rows.push([name, `${w}x${h}`, worst]);
    await ctx.close();

    const g = "Devices";
    check(g, `${name} — no sideways scroll`, worst.over <= 0, worst.over > 0 ? `${worst.over}px over` : "");
    check(g, `${name} — no table behind a sideways scroll`, worst.tbl <= 1, worst.tbl > 1 ? `${worst.tbl}px of table past its wrap` : "");
    check(g, `${name} — tab bar on screen`, worst.tabsIn);
    check(g, `${name} — header chips on screen`, worst.hdrIn);
    check(g, `${name} — every target ${TAP}px+`, !worst.tap || worst.tap.px >= TAP,
          worst.tap ? `${worst.tap.px}px "${worst.tap.what}" on ${worst.tap.tab}` : "");
    check(g, `${name} — text under ${MEASURE} ch`, !worst.line || worst.line.ch <= MEASURE,
          worst.line ? `${worst.line.ch} ch on ${worst.line.tab}` : "");

    // The five destinations. Wide enough and they stand in a rail down the
    // left, each one a row you can read; narrow and the bottom bar is right.
    if (w >= RAIL && h >= RAIL_TALL) {
      check(g, `${name} — five in a rail down the left`, worst.rail && !worst.clash,
            worst.rail ? (worst.clash ? "rail sits over the page" : "") : "still the bottom bar");
      check(g, `${name} — rail rows read as rows`, worst.btnRow && worst.btnTall <= RAIL_ROW,
            worst.btnRow ? (worst.btnTall > RAIL_ROW ? `${worst.btnTall}px tall` : "") : "label under the marker");
    } else {
      check(g, `${name} — the bottom bar stays`, !worst.rail, worst.rail ? "went to a rail" : "");
    }
  }
  await browser.close();

  console.log("Gridlock device suite");
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

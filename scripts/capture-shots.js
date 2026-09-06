#!/usr/bin/env node
/* Capture the landing-page screenshots from the running app.

   Requires the dev server (`npm run serve`) and a Chromium that Playwright
   can drive. Overwrites site/img/shots/ in place.

   The seed below puts the app in a realistic mid-session state — a real
   roster, real film notes on both pits — so the shots show what a coach
   actually sees rather than an empty shell. */
const path = require("path");
const fs = require("fs");

const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = process.env.APP_URL || "http://localhost:5173/";
const OUT = path.join(__dirname, "..", "site", "img", "shots");

const SEED = {
  entered: true, role: "staff", email: "coach@team.com",
  tab: "playbook", script: "snake", layoutKey: "mwo",
  faceOn: true, shotOn: true, t: 0.62, matchState: "Even",
  tips: { pb: true, tally: true, scout: true, sl: true, class: true },
  left: {
    name: "Blast Camp", tend: "Balanced", threat: 5, pts: 200,
    notes: "Snake runner is #7, goes on the buzzer every time. Weak on the D-wire when they trade.",
  },
  right: {
    name: "Rejects", tend: "Snake", threat: 4, pts: 186,
    notes: "Two off the break to the snake. Slow to rotate once the front player is out.",
  },
  point: 3,
  tally: [
    { pt: 3, side: "them", name: "#4" },
    { pt: 3, side: "us", name: "Marsh" },
    { pt: 2, side: "us", name: "Reyes" },
    { pt: 2, side: "them", name: "#2" },
  ],
  groups: [
    { id: "ops", name: "Ops", members: [
      { name: "Dana Whitlock", phone: "5550142" }, { name: "Marcus Iyer", phone: "5550188" },
      { name: "Priya Raman", phone: "5550119" }] },
    { id: "refs", name: "Refs", members: [
      { name: "Head ref — Ola", phone: "5550170" }, { name: "Snake side — Tam", phone: "5550171" }] },
    { id: "reg", name: "Registration", members: [{ name: "Front gate", phone: "5550160" }] },
    { id: "vendors", name: "Vendors", members: [] },
  ],
  blasts: [
    { at: "Sat 07:12", n: 6, body: "Pit gate opens 8:00. Chrono is live at 8:30." },
  ],
  roster: [
    { name: "Reyes", num: 7, p: "snake MW", s: "GP" },
    { name: "Okafor", num: 3, p: "MT 50", s: "C lane" },
    { name: "Vance", num: 11, p: "GP", s: "snake" },
    { name: "Marsh", num: 22, p: "D-wire MD", s: "Tr" },
    { name: "Bright", num: 5, p: "back centre", s: "MD hold" },
  ],
};

const top = page => page.evaluate(() => {
  const m = document.querySelector(".main");
  if (m) m.scrollTop = 0;
});

(async () => {
  const { chromium } = require("playwright-core");
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  await page.goto(URL);
  await page.evaluate(s => localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)), SEED);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  for (const [file, tab] of [["playbook", "Playbook"], ["tally", "Tally"], ["scout", "Scout"], ["sightlines", "Sightlines"]]) {
    await page.locator(".tabs button", { hasText: tab }).click();
    await page.waitForTimeout(350);
    await top(page);
    await page.screenshot({ path: path.join(OUT, `${file}.png`) });
  }

  // Scout's sub-tabs: the counter-picker, then the division board.
  await page.locator(".tabs button", { hasText: "Scout" }).click();
  await page.waitForTimeout(300);
  for (const [tab, file, scroll] of [["Counter", "scout-sim", 1180], ["Division", "scout-board", 1180]]) {
    await page.locator(".seg button", { hasText: tab }).click();
    await page.waitForTimeout(300);
    await page.evaluate(y => document.querySelector(".main").scrollTop = y, scroll);
    await page.waitForTimeout(180);
    await page.screenshot({ path: path.join(OUT, `${file}.png`) });
  }

  // Classes and League live under More, which is a list of destinations.
  for (const item of ["Classes", "League"]) {
    await page.locator(".tabs button", { hasText: "More" }).click();
    await page.waitForTimeout(200);
    await page.locator(".list__row", { hasText: item }).first().click();
    await page.waitForTimeout(300);
    await top(page);
    await page.screenshot({ path: path.join(OUT, `${item.toLowerCase()}.png`) });
  }

  // Promo, from a clean slate.
  const fresh = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
  await fresh.goto(URL, { waitUntil: "networkidle" });
  await fresh.waitForTimeout(300);
  await fresh.screenshot({ path: path.join(OUT, "promo.png") });

  await browser.close();
  if (errors.length) {
    console.error("app errors during capture:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("captured →", OUT);
  console.log("now run: node scripts/optimise-shots.js");
})();

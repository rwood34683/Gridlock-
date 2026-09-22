#!/usr/bin/env node
/* Capture the landing-page screenshots from the running app.

   Requires the dev server (`npm run serve`) and a Chromium that Playwright
   can drive. Overwrites site/img/shots/ in place.

   The seed below puts the app in a realistic mid-session state — a real
   roster, real film notes on both pits — so the shots show what a coach
   actually sees rather than an empty shell. */
const path = require("path");
const fs = require("fs");

const { launchOptions } = require('./browser');
const URL = process.env.APP_URL || "http://localhost:5173/";
const OUT = path.join(__dirname, "..", "site", "img", "shots");

const SEED = require("./seed");

const top = page => page.evaluate(() => {
  const m = document.querySelector(".main");
  if (m) m.scrollTop = 0;
});

(async () => {
  const { chromium } = require("playwright-core");
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch(launchOptions());
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

#!/usr/bin/env node
"use strict";
/* The cloud build wires the reference adapter + config into a copy of the app,
 * turns League sync on there, and leaves the committed web/ untouched. */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");
const { build } = require("../scripts/cloud-build.js");

let passed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log("  PASS  " + name); }
  else { console.log("  FAIL  " + name + (extra ? "  — " + extra : "")); process.exitCode = 1; }
}

const CFG = { url: "https://demo-project.supabase.co", anonKey: "anon-public-key-xyz" };
const OUT = path.resolve(__dirname, "..", "dist", "cloud-test");

(async () => {
  // Build with test config.
  const r = build({ ...CFG, outDir: OUT });
  check("the build refuses with no config", (() => { try { build({}); return false; } catch (e) { return /anon|Supabase/i.test(e.message); } })());
  check("the build refuses a service key", (() => { try { build({ url: CFG.url, anonKey: "service_role-abc", outDir: OUT + "-x" }); return false; } catch (e) { return /service key/i.test(e.message); } })());
  check("it emits the adapter and a config next to the app", fs.existsSync(path.join(OUT, "gridlock-cloud.js")) && fs.existsSync(path.join(OUT, "gridlock-config.js")) && fs.existsSync(path.join(OUT, "index.html")));

  const builtIdx = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
  check("index.html loads the config then the adapter, before the app boots", (() => {
    const c = builtIdx.indexOf("gridlock-config.js");
    const a = builtIdx.indexOf("gridlock-cloud.js");
    const app = builtIdx.indexOf('<script>\nconst STORE_KEY') >= 0 ? builtIdx.indexOf('<script>\nconst STORE_KEY') : builtIdx.indexOf("STORE_KEY");
    return c > 0 && a > c && app > a;
  })(), "ordering");

  // The committed app is untouched: no config, no adapter, no fetch.
  const web = fs.readFileSync(path.resolve(__dirname, "..", "web", "index.html"), "utf8");
  check("the committed web/index.html is not modified by the build",
    !/gridlock-config\.js|GRIDLOCK_CLOUD/.test(web) && !/fetch\s*\(/.test(web));

  const browser = await chromium.launch(launchOptions());
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    // Stub fetch so nothing hits a real network on load (the app has none; the
    // adapter only fetches on demand — but keep the run hermetic).
    await page.addInitScript(() => { window.fetch = async () => ({ ok: false, status: 0, json: async () => ({}) }); });
    await page.goto("file://" + path.join(OUT, "index.html"));
    await page.waitForTimeout(200);

    check("the built app is configured for the project", await page.evaluate(cfg =>
      !!window.GRIDLOCK_CLOUD && window.GRIDLOCK_CLOUD.url === cfg.url && window.GRIDLOCK_CLOUD.anonKey === cfg.anonKey, CFG));
    check("the adapter is installed, so the app can sync", await page.evaluate(() =>
      !!(window.gridlockCloud && window.gridlockCloud.pushSeason && window.gridlockCloud.signIn)));
    check("League sync appears in the app now that the adapter exists", await page.evaluate(() => {
      window.set({ entered: true, role: "staff", email: "coach@team.com", tab: "more", more: "nexus" });
      return /League sync/.test(document.getElementById("root").innerText);
    }));
    check("the sign-in panel tells a new coach sync is his to switch on", await page.evaluate(() => {
      window.set({ entered: false, mode: "create", authSaid: "" });
      return /switch on League sync/i.test(document.getElementById("root").innerText);
    }));
    check("no page errors during the run", errors.length === 0, errors.join(" | "));
    console.log(`\nCloud build: ${passed} checks passed.`);
  } finally {
    await browser.close();
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.rmSync(OUT + "-x", { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exitCode = 1; });

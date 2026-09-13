#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");

(async () => {
  const browser = await chromium.launch(launchOptions());
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const url = process.env.APP_URL || "http://localhost:5173/";
    await page.goto(url);
    // An account is the only way past the promo now.
    await page.evaluate(() => window.set({ mode: "create" }));
    await page.waitForTimeout(80);
    await page.fill("#em", "coach@team.com");
    await page.fill("#pw", "sideline1");
    await page.evaluate(async () => { await window.doAuth(); });
    await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) throw new Error("Service worker API unavailable");
      await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error("Offline installation timed out")), 15000))]);
    });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    assert(await page.getByRole("button", { name: "Playbook", exact: true }).isVisible(), "Saved coaching session must reopen offline");
    for (const tab of ["Tally", "Scout", "Sightlines", "More", "Playbook"]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      assert((await page.locator("main").innerText()).trim().length > 30, tab + " renders offline");
    }
    await page.getByRole("button", {name:"Scout",exact:true}).click();
    await page.getByRole("button", {name:"Voice log",exact:true}).click();
    await page.locator("#voice-manual").fill("Number seven is out");
    await page.getByRole("button", {name:"Record text",exact:true}).click();
    assert.equal(await page.locator("[data-voice-id]").count(), 1, "Voice parser and typed fallback work from the cached shell offline");
    await page.reload();
    assert.equal(await page.locator("[data-voice-id]").count(), 1, "Typed voice event survives offline reload");
    const deepLink = new URL(url);
    deepLink.searchParams.set("c", "GL-TEST");
    await page.goto(deepLink.href);
    assert((await page.locator("#root").innerText()).includes("GRIDLOCK"), "Class query opens the cached shell offline");
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log("PASS: install shell, offline reload, saved session, five destinations, typed voice events, class query; no runtime errors.");
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

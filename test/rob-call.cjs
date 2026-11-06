"use strict";
/* The call with Rob of 6 Nov 2026: a tester's beta build, and locked screens
   that show what they unlock. (The admin usage count is in admin-handler.mjs.) */
const assert = require("node:assert/strict"), path = require("node:path"), fs = require("node:fs");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
const cloud = require("../scripts/cloud-build.js");
(async () => {
  let failed = 0, passed = 0;
  const ok = (name, fn) => { try { fn(); passed++; console.log("PASS " + name); } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); } };
  const today = new Date(), iso = d => d.toISOString().slice(0, 10), plus = n => iso(new Date(today.getTime() + n * 86400000));
  ok("a beta takes one named tester and a real last day, and refuses anything else", () => {
    assert.deepEqual(cloud.betaOption("Lucas Haden", plus(30)), { name: "Lucas Haden", until: plus(30) });
    assert.equal(cloud.betaOption("", ""), undefined);
    for (const [n, u] of [["<b>x</b>", plus(5)], ["Lucas", ""], ["Lucas", "2026-02-30"], ["Lucas", plus(-2)], ["Lucas", plus(400)], ["", plus(5)]])
      assert.throws(() => cloud.betaOption(n, u));
  });
  ok("a beta build goes to its own folder with the tester in its config, never over the live build", () => {
    const base = { url: "https://example.supabase.co", anonKey: "sb_publishable_abcdefghijklmnopqrstuvwxyz" };
    const r = cloud.build({ ...base, beta: { name: "Lucas Haden", until: plus(30) } });
    try {
      assert.equal(path.basename(r.outDir), "beta-lucas-haden");
      const cfg = fs.readFileSync(path.join(r.outDir, "gridlock-config.js"), "utf8");
      assert.match(cfg, /"beta":\{"name":"Lucas Haden","until":"\d{4}-\d{2}-\d{2}"\}/);
      assert.throws(() => cloud.build({ ...base, beta: { name: "Lucas", until: plus(3) }, outDir: path.resolve(__dirname, "../dist/cloud") }), /never goes to dist\/cloud/);
    } finally { fs.rmSync(r.outDir, { recursive: true, force: true }); }
    const env = { GRINDX_BETA_NAME: "Lucas", GRINDX_BETA_UNTIL: plus(10) };
    assert.deepEqual(cloud.configuredOptions(env).beta, { name: "Lucas", until: plus(10) });
    assert.equal(cloud.configuredOptions({}).beta, undefined, "no beta unless both are set");
  });

  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  async function check(name, fn, opts = {}) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
    if (opts.beta) await c.addInitScript(b => { window.GRIDLOCK_CLOUD = { beta: b }; }, opts.beta);
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url);
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, { ...SEED, ...(opts.seed || {}) });
      await p.goto(url); await p.waitForFunction(() => typeof S === "object");
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  const root = p => p.evaluate(() => document.getElementById("root").innerText);
  try {
    await check("a beta copy carries the tester's name on every screen and says it is confidential", async p => {
      for (const tab of ["playbook", "tally", "scout", "more"]) {
        await p.evaluate(t => set({ tab: t }), tab);
        const mark = await p.evaluate(() => { const m = document.querySelector(".beta-mark"); return m && getComputedStyle(m).pointerEvents === "none" && m.textContent; });
        assert.match(mark || "", /Beta · Lucas Haden · confidential/, tab);
      }
      await p.getByRole("button", { name: /account and sign out/ }).click();   // a tap still reaches the app under the mark
      assert.equal(await p.evaluate(() => S.more), "nexus");
      await p.evaluate(() => set({ entered: false }));
      assert.match(await root(p), /Beta copy for Lucas Haden.*Confidential — the property of Gridlock PB LLC/s);
    }, { beta: { name: "Lucas Haden", until: plus(30) } });
    await check("after its last day the copy stops, and his season can still be saved", async p => {
      const t = await root(p);
      assert.match(t, /This beta ended on/); assert.match(t, /Everything you logged is still on this phone/);
      assert.equal(await p.locator(".tabs").count(), 0, "the app itself is closed");
      await p.evaluate(() => { window.__saved = null; window.saveCopy = s => { window.__saved = s; }; });
      await p.getByRole("button", { name: "Save everything" }).click();
      assert.equal(await p.evaluate(() => window.__saved), "all");
      assert.ok(await p.evaluate(() => S.matches.length > 0), "nothing was taken off the phone");
    }, { beta: { name: "Lucas Haden", until: plus(-1) } });
    await check("the last day itself still opens", async p => {
      assert.doesNotMatch(await root(p), /This beta ended/);
      assert.equal(await p.locator(".tabs").count(), 1);
    }, { beta: { name: "Lucas Haden", until: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)) } });
    await check("a normal build shows no beta mark and no beta notice", async p => {
      assert.equal(await p.locator(".beta-mark").count(), 0);
      await p.evaluate(() => set({ entered: false }));
      assert.doesNotMatch(await root(p), /Beta copy/);
    });
    await check("a malformed beta config is ignored, never half-shown", async p => {
      assert.equal(await p.locator(".beta-mark").count(), 0);
      assert.doesNotMatch(await root(p), /This beta ended/);
    }, { beta: { name: "<img src=x onerror=alert(1)>", until: "soon" } });
    await check("a locked screen says what it shows and what is already waiting for him", async p => {
      await p.evaluate(() => { S.scout.Rejects.breaks = [{ m: "shot-m1", pt: 1, script: "blitz", layout: "lso", at: 1 }, { m: "shot-m1", pt: 2, script: "snake", layout: "lso", at: 2 }]; set({ preview: true, tab: "scout" }); });
      const t = await root(p);
      assert.match(t, /Scout is part of Team/); assert.match(t, /The read for the next point/);
      assert.match(t, /Waiting for you: 2 calls of theirs logged across 1 team/);
      assert.match(t, /Nothing you have logged is locked away/);
      await p.evaluate(() => set({ tab: "more", more: null }));
      assert.match(await p.evaluate(() => [...document.querySelectorAll(".list__row")].find(r => /Assess/.test(r.innerText)).innerText), /TEAM/i);
      await p.evaluate(() => set({ preview: false }));
      assert.equal(await p.locator(".gate__chip").count(), 0, "with billing off and no preview, nothing is marked");
    });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} Rob-call checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

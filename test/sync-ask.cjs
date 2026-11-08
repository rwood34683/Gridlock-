"use strict";
/* The backup question at first sign-in. A cloud build asks each account once,
   right after sign-in and before the format; nothing leaves the phone until the
   coach taps Yes, and Not now is remembered. A build without League sync never
   asks. Each check signs in through the real sign-in form with a mocked adapter. */
const assert = require("node:assert/strict"), path = require("node:path"), fs = require("node:fs");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let failed = 0, passed = 0;
  // The adapter is put back on every load, as the cloud build's script tag does.
  const cloudMock = () => {
    window.__pushes = window.__pushes || 0;
    window.gridlockCloud = {
      signIn: async email => ({ ok: true, user: { id: "uid-" + email.split("@")[0], email } }),
      signOut: async () => {},
      pushSeason: async () => { window.__pushes++; return { ok: true }; },
    };
  };
  async function check(name, fn, opts = {}) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    if (opts.cloud !== false) await c.addInitScript(cloudMock);
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload();
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  const root = p => p.evaluate(() => document.getElementById("root").innerText);
  async function signIn(p, email = "coach@example.test", mode = "login") {
    await p.evaluate(mode => set({ entered: false, mode }), mode);
    await p.fill("#em", email); await p.fill("#pw", "sample-password");
    await p.evaluate(() => doAuth());
    await p.waitForFunction(() => S.entered === true);
  }
  try {
    await check("a cloud sign-in asks first, sends nothing until Yes, then the format follows", async p => {
      await signIn(p);
      const text = await root(p);
      assert.match(text, /Back up your season/i);
      assert.match(text, /Gridlock PB LLC's administrators can review it/);
      assert.match(text, /including your scouting/);
      assert.doesNotMatch(text, /Your format/i, "the format waits behind the question");
      assert.equal(await p.locator("nav.tabs").count(), 0, "no tabs while asking");
      assert.equal(await p.evaluate(() => [S.syncOn, __pushes]).then(JSON.stringify), "[false,0]", "nothing sent before the answer");
      await p.getByRole("button", { name: "Yes, back it up" }).click();
      await p.waitForFunction(() => __pushes === 1);
      assert.equal(await p.evaluate(() => S.syncOn), true);
      assert.match(await root(p), /Your format/i, "then the format");
    });
    await check("Not now sends nothing and is not asked again on the next sign-in or launch", async p => {
      await signIn(p);
      await p.getByRole("button", { name: "Not now" }).click();
      assert.equal(await p.evaluate(() => JSON.stringify([S.syncOn, __pushes])), "[false,0]");
      assert.match(await root(p), /More › Nexus › League sync/);
      await p.evaluate(() => staffSignOut()); await signIn(p);
      assert.doesNotMatch(await root(p), /Back up your season/i, "not asked twice");
      await p.reload(); await p.waitForFunction(() => typeof S === "object");
      await p.evaluate(() => set({ entered: true, role: "staff", email: "coach@example.test", fmtAsk: false }));
      assert.doesNotMatch(await root(p), /Back up your season/i, "not asked after a relaunch");
      await p.evaluate(() => set({ tab: "more", more: "nexus" }));
      assert.match(await root(p), /Send my season to my account/, "the switch is still on Nexus");
    });
    await check("a second account on the same phone is asked its own question", async p => {
      await signIn(p, "first@example.test");
      await p.getByRole("button", { name: "Not now" }).click();
      await p.evaluate(() => staffSignOut()); await signIn(p, "second@example.test");
      assert.match(await root(p), /Back up your season/i);
    });
    await check("sync going off mid-season never puts the question over the sheet", async p => {
      await signIn(p);
      await p.getByRole("button", { name: "Yes, back it up" }).click();
      await p.waitForFunction(() => __pushes === 1);
      // An account from before the question existed: sharing on, never asked.
      await p.evaluate(() => { localStorage.removeItem("gridlock.coach.syncasked"); localStorage.removeItem("gridlock.coach.syncyes"); set({ fmtAsk: false, tab: "tally" }); });
      await p.evaluate(() => toggleSync());              // paused on Nexus
      assert.equal(await p.evaluate(() => S.syncOn), false);
      assert.doesNotMatch(await root(p), /Back up your season/i);
      assert.ok(await p.locator("nav.tabs").count() > 0, "the tabs stay");
    });
    await check("a conflict on Yes says so, and sign-out then sign-in turns a yes back on", async p => {
      await signIn(p);
      await p.evaluate(() => { window.gridlockCloud.pushSeason = async () => ({ ok: false, conflict: true, said: "Another device has a newer cloud copy." }); });
      await p.getByRole("button", { name: "Yes, back it up" }).click();
      await p.waitForFunction(() => /newer cloud copy/.test(document.getElementById("root").innerText));
      assert.match(await root(p), /Nexus/);
      assert.equal(await p.evaluate(() => S.syncOn), false);
      // A yes that went through comes back on after sign-out and sign-in.
      await p.evaluate(() => { window.gridlockCloud.pushSeason = async () => { __pushes++; return { ok: true }; }; toggleSync(); });
      await p.waitForFunction(() => S.syncAt);
      await p.evaluate(() => staffSignOut()); await signIn(p);
      assert.equal(await p.evaluate(() => S.syncOn), true, "back on");
      assert.doesNotMatch(await root(p), /Back up your season/i);
    });
    await check("cancelling a cloud review leaves sharing on; each restore keeps its own copy", async p => {
      await signIn(p);
      await p.getByRole("button", { name: "Yes, back it up" }).click();
      await p.waitForFunction(() => S.syncAt);
      await p.evaluate(() => {
        const copy = copyPayload("all");
        Object.assign(window.gridlockCloud, { getSeason: async () => ({ ok: true, payload: copy, revision: 3, user: { id: "u" } }), acceptSeason: () => true });
      });
      const page = p; page.removeAllListeners("dialog"); page.once("dialog", d => d.dismiss());
      await p.evaluate(() => reviewCloudSeason());
      assert.equal(await p.evaluate(() => S.syncOn), true, "a cancelled review puts sharing back");
      page.on("dialog", d => d.accept());
      await p.evaluate(() => { S.roster = [{ num: 1, name: "PhoneOnlyMan", pos: "" }]; save(S); });
      await p.evaluate(() => reviewCloudSeason());
      await p.evaluate(() => { S.roster = [{ num: 2, name: "Second", pos: "" }]; save(S); });
      await p.evaluate(() => reviewCloudSeason());
      const kept = await p.evaluate(() => Object.keys(localStorage).filter(k => k.includes("before-cloud-restore")).map(k => localStorage.getItem(k)).join("\n"));
      assert.match(kept, /PhoneOnlyMan/, "the first phone season is still kept");
      await p.evaluate(() => staffSignOut()); await signIn(p);
      assert.equal(await p.evaluate(() => S.syncOn), false, "a restored season stays paused on sign-in");
    });
    await check("Nexus shows a busy review and a late reply cannot undo Remove", async p => {
      await signIn(p); await p.getByRole("button", { name: "Not now" }).click();
      await p.evaluate(() => {
        set({ fmtAsk:false, fmtDone:true, tab:"more", more:"nexus", syncOn:true });
        Object.assign(window.gridlockCloud, {
          getSeason: () => new Promise(resolve => { window.__finishReview = resolve; }),
          deleteSeason: async () => ({ok:true})
        });
      });
      if(process.env.GRIDLOCK_TEST_SHOTS){
        await p.locator(".flash").waitFor({state:"hidden",timeout:6000});
        fs.mkdirSync(process.env.GRIDLOCK_TEST_SHOTS, {recursive:true});
        await p.getByRole("button", {name:"Review or restore cloud season",exact:true}).locator("..").locator("..").screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,"cloud-review-ready.png")});
      }
      await p.getByRole("button", { name: "Review or restore cloud season", exact:true }).click();
      await p.waitForFunction(() => typeof __finishReview === "function");
      assert.equal(await p.getByRole("button", { name: "Loading your cloud copy…", exact:true }).isDisabled(), true);
      if(process.env.GRIDLOCK_TEST_SHOTS){
        fs.mkdirSync(process.env.GRIDLOCK_TEST_SHOTS, {recursive:true});
        const section=p.getByRole("button", {name:"Loading your cloud copy…", exact:true}).locator("..").locator("..");
        await section.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,"cloud-review-loading.png")});
      }
      await p.getByRole("button", { name:"Remove what I sent", exact:true }).click();
      await p.waitForFunction(() => /has been removed/.test(S.syncSaid));
      await p.evaluate(() => __finishReview({ok:false,said:"No signal"}));
      await p.waitForFunction(() => !_syncReviewing);
      assert.equal(await p.evaluate(() => S.syncOn), false);
      assert.match(await root(p), /has been removed/);
      assert.equal(await p.getByRole("button", {name:"Review or restore cloud season",exact:true}).isDisabled(), false);
    });
    await check("a build without League sync never asks", async p => {
      await p.evaluate(() => { window.gridlockCloud = { signIn: async e => ({ ok: true, user: { id: "x", email: e } }), signOut: async () => {} }; });
      await signIn(p);
      assert.doesNotMatch(await root(p), /Back up your season/i);
    });
    await check("the offline build, with no adapter, never asks", async p => {
      await signIn(p, "coach@example.test", "create");
      assert.doesNotMatch(await root(p), /Back up your season/i);
    }, { cloud: false });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} backup-question checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

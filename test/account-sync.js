#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");
let passed = 0;
(async () => {
  const browser = await chromium.launch(launchOptions());
  async function check(name, fn) {
    const context = await browser.newContext({serviceWorkers: "block", viewport: {width: 390, height: 844}});
    const page = await context.newPage(), errors = [];
    page.on("dialog", d => d.accept()); page.on("pageerror", e => errors.push(e.message));
    try {
      await page.goto(process.env.APP_URL || "http://localhost:5173/");
      await fn(page);
      assert.deepEqual(errors, []);
      console.log("  PASS  " + name); passed++;
    } finally { await context.close(); }
  }
  async function auth(page, mode = "login") {
    await page.evaluate(mode => set({entered: false, mode}), mode);
    await page.fill("#em", "coach@example.test"); await page.fill("#pw", "sample-password");
    await page.evaluate(() => doAuth());
  }
  async function refuseWrites(page) {
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "gridlock.staff.v2") throw new DOMException("quota", "QuotaExceededError");
        return original.call(this, key, value);
      };
    });
  }
  async function screenshot(page, name) {
    if (!process.env.GRIDLOCK_TEST_SHOTS) return;
    fs.mkdirSync(process.env.GRIDLOCK_TEST_SHOTS, {recursive: true});
    await page.screenshot({path: path.join(process.env.GRIDLOCK_TEST_SHOTS, name + ".png"), fullPage: true});
  }
  try {
    for (const raw of ["null", "[]", "true", '"text"', '{"email":{}}', '{"kind":"apple","sub":[]}']) {
      await check("malformed account " + raw + " leaves a working sign-in screen", async page => {
        await page.evaluate(raw => { localStorage.setItem("gridlock.staff.v2", raw); localStorage.setItem("gridlock.staff", raw); }, raw);
        await auth(page);
        assert.equal(await page.evaluate(() => S.entered), false);
        assert.match(await page.locator("#root").innerText(), /never had an account/);
      });
    }
    await check("account creation refuses a failed write and preserves the season", async page => {
      const before = await page.evaluate(() => JSON.stringify(S.matches));
      await refuseWrites(page); await auth(page, "create");
      assert.equal(await page.evaluate(() => S.entered), false);
      assert.equal(await page.evaluate(() => localStorage.getItem("gridlock.staff.v2")), null);
      assert.equal(await page.evaluate(() => JSON.stringify(S.matches)), before);
      assert.match(await page.locator("#root").innerText(), /could not save your sign-in/);
      await screenshot(page, "account-storage-refused");
    });
    await check("failed migration retains the legacy credential for a later retry", async page => {
      await page.evaluate(() => localStorage.setItem("gridlock.staff", JSON.stringify({email:"coach@example.test", pass:"sample-password"})));
      await refuseWrites(page); await auth(page);
      assert.equal(await page.evaluate(() => S.entered), false);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("gridlock.staff")).pass), "sample-password");
    });
    await check("successful migration keeps a hashed account and removes the old one", async page => {
      await page.evaluate(() => localStorage.setItem("gridlock.staff", JSON.stringify({email:"coach@example.test", pass:"sample-password"})));
      await auth(page);
      assert.equal(await page.evaluate(() => S.entered), true);
      assert.equal(await page.evaluate(() => localStorage.getItem("gridlock.staff")), null);
      assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem("gridlock.staff.v2")).hash));
    });
    await check("failed cloud account cache signs out of the adapter and preserves legacy credentials", async page => {
      await page.evaluate(() => {
        localStorage.setItem("gridlock.staff", JSON.stringify({email:"coach@example.test", pass:"sample-password"}));
        window.__out = 0;
        window.gridlockCloud = {signIn: async () => ({ok:true, user:{id:"coach"}}), signOut: () => { __out++; }};
      });
      await refuseWrites(page); await auth(page);
      assert.equal(await page.evaluate(() => S.entered), false);
      assert.equal(await page.evaluate(() => __out), 1);
      assert.ok(await page.evaluate(() => localStorage.getItem("gridlock.staff")));
      assert.match(await page.locator("#root").innerText(), /choose Sign in when you retry/);
    });
    await check("Apple tolerates a null cache but refuses unsuccessful storage", async page => {
      await page.evaluate(() => {
        localStorage.setItem("gridlock.staff.v2", "null");
        window.gridlockApple = {signIn: async () => ({sub:"apple-id", email:"coach@example.test"})};
      });
      await refuseWrites(page); await page.evaluate(() => appleSignIn());
      assert.equal(await page.evaluate(() => S.entered), false);
      assert.match(await page.locator("#root").innerText(), /could not save your sign-in/);
    });
    await check("restore refuses an unsuccessful save and preserves an Apple account without email", async page => {
      await page.evaluate(() => localStorage.setItem("gridlock.staff.v2", JSON.stringify({kind:"apple", sub:"kept"})));
      assert.equal(await page.evaluate(() => gridlockRestoreAccount(JSON.stringify({kind:"apple", sub:"other"}))), false);
      await page.evaluate(() => localStorage.removeItem("gridlock.staff.v2")); await refuseWrites(page);
      assert.equal(await page.evaluate(() => gridlockRestoreAccount(JSON.stringify({kind:"apple", sub:"other"}))), false);
    });
    await check("Staff sign out calls the adapter, stops sync, and keeps the season", async page => {
      await page.evaluate(() => {
        window.__out = 0; window.__late = 0;
        window.gridlockCloud = {signOut: () => { __out++; }, pushSeason: async () => { if(!S.entered) __late++; return {ok:true}; }};
        _lastAutoSync = Date.now();
        set({entered:true, role:"staff", email:"coach@example.test", fmtDone:true, fmtAsk:false, tab:"more", more:"nexus", syncOn:true});
      });
      const before = await page.evaluate(() => JSON.stringify(S.matches));
      await page.getByRole("button", {name:"Staff sign out", exact:true}).click();
      await page.evaluate(async () => { _lastAutoSync = 0; save(S); await syncNow(); await _syncTail; });
      assert.deepEqual(await page.evaluate(() => [S.entered, S.syncOn, __out, __late]), [false, false, 1, 0]);
      assert.equal(await page.evaluate(() => JSON.stringify(S.matches)), before);
    });
    await check("logout cancels queued uploads and ignores a late send result", async page => {
      const result = await page.evaluate(async () => {
        let release, pushes = 0;
        window.gridlockCloud = {signOut(){}, pushSeason(){ pushes++; return new Promise(r => { release = r; }); }};
        _lastAutoSync = Date.now(); set({entered:true, role:"staff", syncOn:true, fmtAsk:false});
        const first = syncNow();
        while(!release) await Promise.resolve();
        const second = syncNow();
        staffSignOut(); release({ok:true}); await Promise.all([first, second]);
        return {pushes, entered:S.entered, syncAt:S.syncAt, syncSaid:S.syncSaid};
      });
      assert.deepEqual(result, {pushes:1, entered:false, syncAt:null, syncSaid:""});
    });
    await check("a late cloud sign-in does not reopen the signed-out app", async page => {
      const result = await page.evaluate(async () => {
        let release;
        window.gridlockCloud = {signIn: () => new Promise(r => {release = r;}), signOut(){}};
        set({entered:false, mode:"login"}); document.getElementById("em").value = "coach@example.test"; document.getElementById("pw").value = "sample-password";
        const work = doAuth(); staffSignOut(); release({ok:true, user:{id:"old"}}); await work;
        return {entered:S.entered, kept:localStorage.getItem("gridlock.staff.v2")};
      });
      assert.deepEqual(result, {entered:false, kept:null});
    });
    for (const result of [null, {ok:false}, {ok:false, offline:true}]) {
      await check("unconfirmed removal keeps sync off and leaves a retry button: " + JSON.stringify(result), async page => {
        await page.evaluate(result => {
          window.gridlockCloud = {pushSeason: async () => ({ok:true}), deleteSeason: async () => result};
          _lastAutoSync = Date.now();
          set({entered:true, role:"staff", fmtDone:true, fmtAsk:false, tab:"more", more:"nexus", syncOn:true});
        }, result);
        await page.getByRole("button", {name:"Stop and delete what I sent", exact:true}).click();
        await page.waitForFunction(() => !_syncDeleting);
        assert.equal(await page.evaluate(() => S.syncOn), false);
        assert.doesNotMatch(await page.locator("#root").innerText(), /has been removed/);
        assert.equal(await page.getByRole("button", {name:"Remove what I sent", exact:true}).count(), 1);
        if(result?.offline) await screenshot(page, "removal-retry");
        await page.evaluate(() => { gridlockCloud.deleteSeason = async () => ({ok:true}); });
        await page.getByRole("button", {name:"Remove what I sent", exact:true}).click();
        await page.waitForFunction(() => !_syncDeleting);
        assert.match(await page.locator("#root").innerText(), /has been removed/);
      });
    }
    await check("removal waits for dispatched uploads and prevents queued or new uploads", async page => {
      const result = await page.evaluate(async () => {
        const events = []; let release;
        window.gridlockCloud = {pushSeason(){ events.push("POST"); return new Promise(r => { release = r; }); }, deleteSeason: async () => { events.push("DELETE"); return {ok:true}; }};
        _lastAutoSync = Date.now(); set({entered:true, role:"staff", syncOn:true, fmtAsk:false});
        const first = syncNow(); while(!release) await Promise.resolve();
        const second = syncNow(), removal = deleteSynced();
        toggleSync(); await syncNow();
        const before = events.slice(); release({ok:true});
        await Promise.all([first, second, removal]);
        return {before, events, on:S.syncOn, said:S.syncSaid};
      });
      assert.deepEqual(result.before, ["POST"]); assert.deepEqual(result.events, ["POST", "DELETE"]);
      assert.equal(result.on, false); assert.match(result.said, /has been removed/);
    });
    await check("inherited More keys return to the menu while class and league routes remain", async page => {
      for (const key of ["toString", "constructor", "__proto__"]) {
        await page.evaluate(more => set({entered:true, role:"staff", fmtDone:true, fmtAsk:false, tab:"more", more}), key);
        assert.equal(await page.evaluate(() => S.more), null);
        assert.match(await page.locator(".main").innerText(), /Whiteboard/);
      }
      for (const key of ["classes", "league"]) {
        await page.evaluate(more => set({more}), key);
        assert.equal(await page.evaluate(() => S.more), key);
        assert.ok((await page.locator(".main").innerText()).length > 100);
      }
    });
    console.log(`Account and sync regressions: ${passed} passed.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

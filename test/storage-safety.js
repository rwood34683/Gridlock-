#!/usr/bin/env node
"use strict";
/* Storage safety: two tabs, field maps, offline sign-in and backups.
 *
 * Each check reproduces a defect that was seen on the web build and holds the
 * corrected behaviour:
 *   1. a stale tab overwrote points another tab had saved;
 *   2. a stale tab overwrote a newer field-map image;
 *   3. offline sign-in treated a change of email capitals as another account;
 *   4. Show it as text (and other non-exports) marked a full backup as done;
 *   5. a field map the phone refused to store still went to the native mirror.
 * and the guarantees around them: warnings that outlive older saves, closing
 * with unsaved work, separate recovery copies that keep their own maps and
 * pause cloud sharing, and a map-only change counting as a change to share.
 *
 * Accounts are synthetic, the cloud and the native mirror are mocks, and
 * nothing leaves the machine. Run through `node scripts/run-checks.js
 * storage-safety`, which serves the app on an ephemeral port.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");

const URL = process.env.APP_URL || "http://localhost:5173/";
const STORE = "gridlock.coach.v2", MAPS = "gridlock.coach.maps";
// Two tiny but genuine PNGs, so fieldMapOk() takes them.
const PNG_A = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
const PNG_B = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const PNG_C = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log("PASS " + name); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e && e.message || e).split("\n").join("\n     ")); }
}

// A field of his own, enough bunkers to register, keyed under my:.
const FIELD = key => ({ key, name: "Test " + key, bunkers: Array.from({ length: 8 }, (_, i) =>
  ({ id: "Br#" + (i + 1), n: "Br", t: "can", x: 10 + i * 6, y: 20 + i * 8, w: 3.54, h: 8.04 })) });

(async () => {
  const browser = await chromium.launch(launchOptions());
  const fresh = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const open = async () => {
      const p = await ctx.newPage();
      p.on("dialog", d => d.accept());
      const errs = []; p.on("pageerror", e => errs.push(e.message)); p.errs = errs;
      await p.goto(URL, { waitUntil: "networkidle" });
      return p;
    };
    return { ctx, open };
  };
  const stored = (p, key = STORE) => p.evaluate(k => localStorage.getItem(k), key);

  /* ---------------------------------------------------------------- 1 */
  await test("a stale tab cannot overwrite points another tab saved", async () => {
    const { ctx, open } = await fresh();
    const a = await open(), b = await open();          // both read the same season
    await a.evaluate(() => { S.results = [...S.results, { m: S.matchId, pt: 1, won: "us" }]; save(S); });
    // B never saw that point. Anything it saves now must not roll it back.
    await b.evaluate(() => { S.roster = [...S.roster, { name: "Stale Tab", num: 41 }]; save(S); });
    const season = JSON.parse(await stored(a));
    assert.equal(season.results.length, 1, "the point saved in the other tab survives");
    assert.ok(!season.roster.some(r => r.name === "Stale Tab"), "the stale tab did not write the season");
    // Its own change is not thrown away: it is a separate copy it can be recovered from.
    const kept = await b.evaluate(() => (window.gridlockRecoveryCopies ? window.gridlockRecoveryCopies() : []));
    assert.equal(kept.length, 1, "one recovery copy for the stale tab");
    const copy = JSON.parse(kept[0].text);
    assert.equal(copy.format, "gridlock.coach.copy");
    assert.ok(copy.data.roster.some(r => r.name === "Stale Tab"), "the stale tab's edit is in its recovery copy");
    // And it keeps saving there, never over the newer season.
    await b.evaluate(() => { S.roster = [...S.roster, { name: "Second Edit", num: 42 }]; save(S); });
    assert.equal(JSON.parse(await stored(a)).results.length, 1);
    const again = await b.evaluate(() => window.gridlockRecoveryCopies());
    assert.equal(again.length, 1, "the same tab updates its own copy rather than making another");
    assert.ok(JSON.parse(again[0].text).data.roster.some(r => r.name === "Second Edit"));
    // Said on screen, after the copy was read back, with a way to the newer season.
    const said = await b.evaluate(() => document.getElementById("root").textContent);
    assert.match(said, /another tab/i);
    assert.match(said, /recovery copy/i);
    // A fresh tab opens the newer season, untouched.
    const c = await open();
    assert.equal(await c.evaluate(() => S.results.length), 1);
    assert.equal(await c.evaluate(() => S.roster.some(r => r.name === "Stale Tab")), false);
    assert.deepEqual([...a.errs, ...b.errs, ...c.errs], []);
    await ctx.close();
  });

  await test("the tab that saved last keeps saving; a tab that has caught up is not stale", async () => {
    const { ctx, open } = await fresh();
    const a = await open(), b = await open();
    await a.evaluate(() => { S.results = [{ m: S.matchId, pt: 1, won: "us" }]; save(S); });
    await a.evaluate(() => { S.results = [...S.results, { m: S.matchId, pt: 2, won: "them" }]; save(S); });
    assert.equal(JSON.parse(await stored(a)).results.length, 2, "a tab never conflicts with itself");
    await b.reload({ waitUntil: "networkidle" });
    await b.evaluate(() => { S.results = [...S.results, { m: S.matchId, pt: 3, won: "us" }]; save(S); });
    assert.equal(JSON.parse(await stored(a)).results.length, 3, "a reloaded tab saves normally");
    assert.deepEqual(await b.evaluate(() => window.gridlockRecoveryCopies()), []);
    await ctx.close();
  });

  /* ---------------------------------------------------------------- 2 */
  await test("a stale tab cannot overwrite a newer field-map image", async () => {
    const { ctx, open } = await fresh();
    const a = await open();
    await a.evaluate(([f1, f2, png]) => {
      S.fields = [f1, f2]; FIELD_MAPS["my:1"] = png; keepMaps(); registerFields(); save(S);
    }, [FIELD("my:1"), FIELD("my:2"), PNG_A]);
    const b = await open(), c = await open();               // B and C have map A for my:1
    await a.evaluate(png => { FIELD_MAPS["my:1"] = png; keepMaps(); }, PNG_B);
    // C changes only the other field's map. It must not put its old my:1 back.
    await c.evaluate(png => { FIELD_MAPS["my:2"] = png; keepMaps(); }, PNG_C);
    let maps = JSON.parse(await stored(a, MAPS));
    assert.equal(maps["my:1"], PNG_B, "the newer image for my:1 survives another map's change");
    assert.equal(maps["my:2"], PNG_C);
    // B changes the same map A just changed. The newer one stays.
    await b.evaluate(png => { FIELD_MAPS["my:1"] = png; keepMaps(); }, PNG_C);
    maps = JSON.parse(await stored(a, MAPS));
    assert.equal(maps["my:1"], PNG_B, "the newer image for my:1 survives a stale change to it");
    // B's own picture is kept, with its season, in its recovery copy.
    const kept = await b.evaluate(() => window.gridlockRecoveryCopies().filter(x => x.mine));
    assert.equal(kept.length, 1);
    const fields = JSON.parse(kept[0].text).data.fields;
    assert.equal(fields.find(f => f.key === "my:1").map, PNG_C, "the stale tab's own map rides in its copy");
    await ctx.close();
  });

  await test("two tabs changing different maps both keep their images", async () => {
    const { ctx, open } = await fresh();
    const a = await open();
    await a.evaluate(([f1, f2]) => { S.fields = [f1, f2]; registerFields(); save(S); }, [FIELD("my:1"), FIELD("my:2")]);
    const b = await open();
    await a.evaluate(png => { FIELD_MAPS["my:1"] = png; keepMaps(); }, PNG_A);
    await b.evaluate(png => { FIELD_MAPS["my:2"] = png; keepMaps(); }, PNG_B);
    const maps = JSON.parse(await stored(a, MAPS));
    assert.equal(maps["my:1"], PNG_A);
    assert.equal(maps["my:2"], PNG_B);
    await ctx.close();
  });

  /* ---------------------------------------------------------------- 3 */
  await test("offline sign-in matches the email whatever its capitals", async () => {
    const { ctx, open } = await fresh();
    const p = await open();
    const auth = async (mode, em, pw) => {
      await p.evaluate(m => window.set({ mode: m, authSaid: "", entered: false }), mode);
      await p.fill("#em", em); await p.fill("#pw", pw);
      await p.evaluate(async () => { await window.doAuth(); });
      return p.evaluate(() => ({ in: S.entered, said: S.authSaid }));
    };
    assert.equal((await auth("create", "Coach.Synthetic@Example.TEST", "fixture-pass-1")).in, true);
    await p.evaluate(() => window.staffSignOut());
    const r = await auth("login", "coach.synthetic@example.test", "fixture-pass-1");
    assert.equal(r.in, true, "lower case signs in: " + r.said);
    await p.evaluate(() => window.staffSignOut());
    const wrong = await auth("login", "COACH.SYNTHETIC@EXAMPLE.TEST", "not-the-password");
    assert.equal(wrong.in, false, "a wrong password is still refused");
    assert.match(wrong.said, /password does not match/);
    const other = await auth("login", "someone.else@example.test", "fixture-pass-1");
    assert.equal(other.in, false, "a different address is still another account");
    // Making an account with only the capitals changed is not "replacing" one.
    let asked = 0; p.removeAllListeners("dialog"); p.on("dialog", d => { asked++; d.accept(); });
    const same = await auth("create", "COACH.synthetic@example.test", "fixture-pass-2");
    assert.equal(same.in, true);
    assert.equal(asked, 0, "no warning that another account will be replaced");
    await ctx.close();
  });

  /* ---------------------------------------------------------------- 4 */
  await test("only a successful full-season export counts as a backup", async () => {
    const { ctx, open } = await fresh();
    const p = await open();
    const at = () => p.evaluate(() => S.copiedAt || null);
    await p.evaluate(() => { S.copiedAt = null; S.roster = [{ name: "Reyes", num: 7 }]; save(S); });
    await p.evaluate(() => window.showCopy("all"));
    assert.equal(await at(), null, "showing the text is not a backup");
    await p.evaluate(() => window.showCopy("squad"));
    assert.equal(await at(), null);
    // A share sheet that was cancelled, or failed, is not one either.
    for (const status of ["cancelled", "failed"]) {
      await p.evaluate(s => { window.gridlockExportFile = async () => ({ status: s }); }, status);
      await p.evaluate(() => window.saveCopy("all"));
      assert.equal(await at(), null, status + " export");
    }
    // A squad file is not the season.
    await p.evaluate(() => { window.gridlockExportFile = async () => ({ status: "shared" }); });
    await p.evaluate(() => window.saveCopy("squad"));
    assert.equal(await at(), null, "squad export");
    // Bringing data in is not a backup of this phone.
    const text = await p.evaluate(() => copyPayload("all"));
    await p.evaluate(t => window.loadCopy("merge", t), text);
    assert.equal(await at(), null, "a merge");
    // The full season, shared: that is the one.
    await p.evaluate(() => window.saveCopy("all"));
    assert.equal(typeof (await at()), "number", "a shared full export");
    // And a later import keeps the date of the last real backup.
    const was = await at();
    await p.evaluate(t => window.loadCopy("replace", t), text);
    assert.equal(await at(), was, "replace keeps this phone's backup date");
    await ctx.close();
  });

  await test("a browser download of the full season counts; of the squad it does not", async () => {
    const { ctx, open } = await fresh();
    const p = await open();
    await p.evaluate(() => { delete window.gridlockExportFile; S.copiedAt = null; save(S); });
    await p.evaluate(() => window.saveCopy("squad"));
    assert.equal(await p.evaluate(() => S.copiedAt || null), null);
    await p.evaluate(() => window.saveCopy("all"));
    assert.equal(typeof await p.evaluate(() => S.copiedAt), "number");
    await ctx.close();
  });

  /* ---------------------------------------------------------------- 5 */
  await test("a field map the phone refused to store never reaches the native mirror", async () => {
    const { ctx, open } = await fresh();
    const p = await open();
    const r = await p.evaluate(([f, png, key]) => {
      S.fields = [f]; registerFields(); save(S);
      const sent = []; window.gridlockKeep = (text, k) => sent.push(k || "season");
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === key) { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; }
        return set.call(this, k, v);
      };
      try { FIELD_MAPS["my:1"] = png; keepMaps(); }
      finally { Storage.prototype.setItem = set; }
      render();
      return { sent, warn: document.getElementById("root").textContent };
    }, [FIELD("my:1"), PNG_A, MAPS]);
    assert.ok(!r.sent.includes(MAPS), "nothing sent to the mirror: " + JSON.stringify(r.sent));
    assert.match(r.warn, /storage for the app is full/);
    await ctx.close();
  });

  /* ------------------------------------------------- the guarantees around them */
  await test("a later season save does not clear a newer map storage-full warning", async () => {
    const { ctx, open } = await fresh();
    const p = await open();
    const r = await p.evaluate(([f, png, key]) => {
      S.fields = [f]; registerFields(); save(S);
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === key) { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; }
        return set.call(this, k, v);
      };
      try {
        FIELD_MAPS["my:1"] = png; keepMaps();
        S.roster = [{ name: "After", num: 1 }]; save(S);        // the season itself still fits
      } finally { Storage.prototype.setItem = set; }
      render();
      const kept = document.getElementById("root").textContent;
      FIELD_MAPS["my:1"] = png; keepMaps(); render();        // and once the map fits, it clears
      return { kept, after: document.getElementById("root").textContent };
    }, [FIELD("my:1"), PNG_A, MAPS]);
    assert.match(r.kept, /storage for the app is full/);
    assert.doesNotMatch(r.after, /storage for the app is full/);
    await ctx.close();
  });

  await test("closing with unsaved work warns; closing with everything saved does not", async () => {
    const { ctx, open } = await fresh();
    const p = await open();
    const leave = () => p.evaluate(() => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    });
    await p.evaluate(() => { S.roster = [{ name: "Saved", num: 1 }]; save(S); });
    assert.equal(await leave(), false, "nothing to warn about");
    await p.evaluate(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
      window.__set = set;
      S.roster = [...S.roster, { name: "Unsaved", num: 2 }]; save(S);
    });
    // Still full on the way out: the retry fails too, so the browser is asked to warn.
    assert.equal(await leave(), true, "the browser is asked to warn");
    await p.evaluate(() => { Storage.prototype.setItem = window.__set; });
    await p.evaluate(() => save(S));                            // room again: saved
    assert.equal(await leave(), false);
    await ctx.close();
  });

  await test("a stale tab says it is safe to close only once its copy is read back", async () => {
    const { ctx, open } = await fresh();
    const a = await open(), b = await open();
    await a.evaluate(() => { S.results = [{ m: S.matchId, pt: 1, won: "us" }]; save(S); });
    // B's recovery copy cannot be written: it must not claim to be safe.
    const r = await b.evaluate(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (String(k).includes(".tab.")) { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; }
        return set.call(this, k, v);
      };
      try {
        S.roster = [{ name: "Only Here", num: 9 }]; save(S); render();
        const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e);
        return { text: document.getElementById("root").textContent, warn: e.defaultPrevented,
                 copies: window.gridlockRecoveryCopies().length };
      } finally { Storage.prototype.setItem = set; }
    });
    assert.equal(r.copies, 0);
    assert.doesNotMatch(r.text, /safe to close/i);
    assert.match(r.text, /not saved/i);
    assert.equal(r.warn, true, "closing warns");
    assert.equal(JSON.parse(await stored(a)).results.length, 1, "and the newer season is still untouched");
    // Room again: the copy is written, read back, and only then is it safe.
    const ok = await b.evaluate(() => { save(S); render();
      const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e);
      return { text: document.getElementById("root").textContent, warn: e.defaultPrevented,
               copies: window.gridlockRecoveryCopies().length }; });
    assert.equal(ok.copies, 1);
    assert.match(ok.text, /safe to close/i);
    assert.equal(ok.warn, false);
    await ctx.close();
  });

  await test("a stale tab pauses cloud sharing and never queues its season", async () => {
    const { ctx, open } = await fresh();
    const a = await open(), b = await open();
    const sent = await b.evaluate(() => {
      window.__sent = [];
      window.gridlockCloud = { pushSeason: async (label, payload) => { window.__sent.push(payload); return { ok: true }; } };
      S.entered = true; S.role = "staff"; S.syncOn = true;   // in this tab's memory
      return syncAllowed();
    });
    assert.equal(sent, true, "sharing was on in this tab");
    await a.evaluate(() => { S.results = [{ m: S.matchId, pt: 1, won: "us" }]; save(S); });
    // Even before B saves anything, the other tab's write makes it stale.
    await b.waitForFunction(() => !syncAllowed(), null, { timeout: 3000 });
    await b.evaluate(async () => { S.roster = [{ name: "Stale", num: 3 }]; save(S); await window.syncNow(); });
    assert.equal(await b.evaluate(() => window.__sent.length), 0, "nothing uploaded from the stale tab");
    assert.equal(await b.evaluate(() => window.gridlockRecoveryCopies().length), 1);
    await ctx.close();
  });

  await test("recovery copies are kept per tab and protected while that tab is saving", async () => {
    const { ctx, open } = await fresh();
    const a = await open(), b = await open(), c = await open();
    await a.evaluate(() => { S.results = [{ m: S.matchId, pt: 1, won: "us" }]; save(S); });
    await b.evaluate(() => { S.roster = [{ name: "From B", num: 1 }]; save(S); });
    await c.evaluate(() => { S.roster = [{ name: "From C", num: 2 }]; save(S); });
    const list = await a.evaluate(() => window.gridlockRecoveryCopies());
    assert.equal(list.length, 2, "two stale tabs, two separate copies");
    const names = list.map(x => JSON.parse(x.text).data.roster[0].name).sort();
    assert.deepEqual(names, ["From B", "From C"]);
    // B's copy is in use by B: deleting it from B is refused while B still holds unsaved work.
    const refused = await b.evaluate(() => window.dropRecoveryCopy(window.gridlockRecoveryCopies()
      .find(x => JSON.parse(x.text).data.roster[0].name === "From B").key));
    assert.equal(refused, false);
    assert.equal(await a.evaluate(() => window.gridlockRecoveryCopies().length), 2);
    // A recovery copy can be opened on Nexus and merged in like any copy.
    const merged = await a.evaluate(() => {
      const x = window.gridlockRecoveryCopies().find(y => JSON.parse(y.text).data.roster[0].name === "From C");
      window.loadCopy("merge", x.text);
      return S.roster.map(r => r.name);
    });
    assert.ok(merged.includes("From C"));
    await ctx.close();
  });

  await test("changing only a field-map image is a change to share", async () => {
    const { ctx, open } = await fresh();
    const p = await open();
    const r = await p.evaluate(([f, png]) => {
      window.gridlockCloud = { pushSeason: async () => ({ ok: true }) };
      S.fields = [f]; registerFields();
      S.entered = true; S.role = "staff"; S.syncOn = true; save(S);
      clearSyncRetry();
      const before = _syncDirty;
      FIELD_MAPS["my:1"] = png; keepMaps();
      return { before, after: _syncDirty, timer: !!_syncTimer };
    }, [FIELD("my:1"), PNG_A]);
    assert.equal(r.before, false);
    assert.equal(r.after, true, "the map change is waiting to send");
    assert.equal(r.timer, true);
    await ctx.close();
  });

  await browser.close();

  /* ------------------------------------------- the native mirror, in isolation */
  const native = fs.readFileSync(path.join(__dirname, "..", "web", "native.js"), "utf8");
  function nativeHarness() {
    const writes = [], fail = new Set(), listeners = {}, timers = [];
    const prefs = { set: ({ key, value }) => { const ok = !fail.has(key);
        writes.push({ key, value, ok });
        return ok ? Promise.resolve() : Promise.reject(new Error("full")); },
      get: () => Promise.resolve({}) };
    const window = { Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: { Preferences: prefs } },
      render() {}, addEventListener: (n, f) => (listeners[n] = listeners[n] || []).push(f) };
    const document = { documentElement: { classList: { add() {} } }, visibilityState: "visible", addEventListener: (n, f) => (listeners[n] = listeners[n] || []).push(f) };
    vm.runInNewContext(native, { window, document, navigator: {}, console, Promise,
      setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout: () => {}, location: { search: "" } });
    const run = async () => { for (let i = 0; i < 20; i++) { const t = timers.splice(0); for (const x of t) x.fn(); await new Promise(r => setImmediate(r)); } };
    return { window, document, writes, fail, listeners, run };
  }
  await test("native mirror: one key saving does not clear another key's newer failure", async () => {
    const h = nativeHarness();
    if (!h.window.gridlockKeep) throw new Error("native.js did not install gridlockKeep");
    h.window.gridlockKeep("season-1"); await h.run();      // an older season write, fine
    h.fail.add(MAPS);                                       // then the maps write fails
    h.window.gridlockKeep("maps-1", MAPS);
    h.window.gridlockKeep("season-2");                      // queued with it, and saves
    await h.run();
    assert.ok(h.writes.some(w => w.value === "season-2" && w.ok));
    assert.match(h.window.gridlockDurableError, /could not update/, "the season saving does not clear the maps failure");
    h.window.gridlockKeep("season-3"); await h.run();      // a later season-only flush
    assert.match(h.window.gridlockDurableError, /could not update/, "nor does a later one");
    h.fail.clear();                                         // room again: the retry lands
    h.window.gridlockKeep("maps-2", MAPS); await h.run();
    assert.equal(h.window.gridlockDurableError, "");
  });
  await test("native mirror: backgrounding or closing writes what is queued at once", async () => {
    const h = nativeHarness();
    h.window.gridlockKeep("season-1");
    assert.equal(h.writes.length, 0, "debounced while open");
    h.document.visibilityState = "hidden";
    (h.listeners.visibilitychange || []).forEach(f => f());
    await new Promise(r => setImmediate(r));
    assert.deepEqual(h.writes.map(w => w.value), ["season-1"], "written on the way to the background");
    h.window.gridlockKeep("season-2");
    (h.listeners.pagehide || []).forEach(f => f());
    await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
    assert.ok(h.writes.some(w => w.value === "season-2"), "and on the way out");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });

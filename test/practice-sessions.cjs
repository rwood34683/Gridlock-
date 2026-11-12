"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser"), { createServer } = require("../scripts/serve");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "..") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch(launchOptions());
  const out = path.resolve("work/practice-sessions"); fs.mkdirSync(out, { recursive: true });
  let passed = 0, failed = 0;
  async function check(name, fn, size = [390, 844]) {
    const context = await browser.newContext({ viewport: { width: size[0], height: size[1] } });
    const p = await context.newPage(), errors = [], requests = [], dialogs = [];
    p.setDefaultTimeout(5000);
    p.on("pageerror", e => errors.push(e.message));
    p.on("request", r => requests.push(r.url()));
    p.on("dialog", async d => { dialogs.push(d.message()); await d.dismiss(); });
    await context.route("**/*", r => r.request().url().startsWith(base + "/") ? r.continue() : r.abort());
    try {
      await p.goto(base + "/teasers/player/");
      await p.locator("#joinCode").fill("IMPACT-7QX2"); await p.locator("#joinGo").click();
      await practice(p); await fn(p);
      assert.deepEqual(errors, [], "no page errors"); assert.deepEqual(dialogs, [], "no browser dialogs");
      assert(requests.every(u => u === base + "/teasers/player/"), "only the preview document may be requested");
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.stack); }
    finally { await context.close(); }
  }
  async function practice(p) { await p.locator("#moreBtn").click(); await p.locator('[data-mm="practice"]').click(); }
  async function choose(p, name = "Snap shooting (right)") {
    const options = await p.locator("#prSel option").evaluateAll(es => es.map(e => ({ value: e.value, text: e.textContent })));
    const found = options.find(o => o.text.startsWith(name + " (")); assert(found, name + " exists");
    await p.locator("#prSel").selectOption(found.value); return found.value;
  }
  async function save(p, value, note) {
    await p.locator("#prVal").fill(String(value)); if (note) await p.locator("#prNote").fill(note);
    await p.locator("#prLog").click();
  }
  const entries = p => p.evaluate(() => JSON.parse(localStorage.getItem("gridlock_practice")).e);
  const text = p => p.locator("#practicebox").innerText();
  async function fits(p, name) {
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no sideways page scroll");
    const small = await p.locator('#practicebox button:visible, #practicebox input:visible, #practicebox select:visible, #practicebox summary:visible').evaluateAll(es => es.map(e => ({ id: e.id || e.textContent, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })).filter(r => r.w < 44 || r.h < 44));
    assert.deepEqual(small, [], "44px controls");
    for (const id of ["prVal", "prDt", "prNote"]) {
      const input = p.locator("#" + id);
      assert(await input.evaluate(e => !!(e.labels?.length || e.getAttribute("aria-label"))), id + " has a name");
    }
    await p.screenshot({ path: path.join(out, name + ".png"), fullPage: true });
  }
  try {
    for (const size of [[390, 844], [768, 1024], [1024, 768]]) await check("result to chart, counts and layout " + size.join("x"), async p => {
      await choose(p); assert.match(await text(p), /Session 1 · numbered for you/);
      assert.match(await text(p), /Out of 10 attempts/); assert.equal(await p.locator("#prVal").inputValue(), "");
      await fits(p, "form-" + size.join("x"));
      await save(p, 1, "One clean hit");
      assert.match(await text(p), /Saved: 1 of 10 · 10%/);
      assert.match(await text(p), /Latest: 1 of 10 · 10%/);
      assert.equal(await p.locator('#practicebox svg[role="img"]').count(), 1);
      assert.match(await p.locator('#practicebox svg[role="img"]').getAttribute("aria-label"), /1 logged sessions.*1 of 10 · 10%/);
      assert.match(await text(p), /Session 2 · numbered for you/);
      assert.match(await text(p), /Self-reported/); assert(!/coach-verified results/i.test(await text(p)));
      const e = await entries(p); assert.equal(e.length, 1); assert.equal(e[0].val, 1); assert.equal(e[0].note, "One clean hit");
      const chart = await p.locator('#practicebox svg[role="img"]').boundingBox();
      assert(chart.y >= 0 && chart.y + chart.height <= size[1], "chart is visible after save");
      await fits(p, "chart-" + size.join("x"));
    }, size);
    await check("repeat Save and Enter produce one session; second result updates the same chart", async p => {
      await choose(p); await p.locator("#prVal").fill("2"); await p.locator("#prVal").press("Enter");
      await p.locator("#prLog").click(); assert.equal((await entries(p)).length, 1);
      await save(p, 4); assert.equal((await entries(p)).length, 2);
      assert.match(await text(p), /Latest: 4 of 10 · 40%.*2 sessions in this chart/);
      assert.match(await p.locator('#practicebox svg[role="img"]').getAttribute("aria-label"), /2 logged sessions/);
    });
    await check("hits reject blank, fractions, negative and over-denominator values", async p => {
      await choose(p);
      for (const value of ["", "-1", "1.5", "11", "1e100"]) { await save(p, value); assert.equal((await entries(p)).length, 0, "reject " + value); assert.match(await p.locator("#prMsg").innerText(), /Enter/); }
      await save(p, 0); assert.match(await text(p), /0 of 10 · 0%/);
    });
    await check("units follow the drill; times and ratings keep their meaning", async p => {
      await choose(p, "Bunker sprint"); assert.match(await text(p), /Result \(sec\)/); assert.match(await text(p), /Lower is better/);
      await save(p, 0); assert.equal((await entries(p)).length, 0);
      await save(p, 2.7); assert.match(await text(p), /Latest: 2.7 sec/);
      await practice(p); await choose(p, "Communication");
      assert.match(await text(p), /Rating \(1 to 10\)/); assert.equal(await p.locator("#prVal").inputValue(), "");
      for (const v of [0, 11, 2.5]) { await save(p, v); assert.equal((await entries(p)).length, 1); }
      await save(p, 7); assert.equal((await entries(p)).length, 2);
    });
    await check("date errors keep the result and do not record a fabricated date", async p => {
      await choose(p); await p.locator("#prDt").fill(""); await save(p, 3);
      assert.equal((await entries(p)).length, 0); assert.equal(await p.locator("#prVal").inputValue(), "3");
      await p.locator("#prDt").fill("2099-01-01"); await p.locator("#prLog").click();
      assert.equal((await entries(p)).length, 0); assert.match(await p.locator("#prMsg").innerText(), /valid date/);
      assert.equal(await p.evaluate(() => prValidDate("2026-02-30")), false);
      await p.locator("#prDt").fill("2026-01-02"); await p.locator("#prLog").click(); assert.equal((await entries(p))[0].date, "2026-01-02");
    });
    await check("storage refusal keeps typed work; retry succeeds once", async p => {
      await choose(p);
      await p.evaluate(() => { window.testSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if(k === "gridlock_practice") throw new DOMException("Quota full", "QuotaExceededError"); return window.testSetItem.call(this, k, v); }; });
      await save(p, 5, "Keep this note"); assert.equal((await entries(p)).length, 0);
      assert.match(await p.locator("#prMsg").innerText(), /Not saved/); assert.equal(await p.locator("#prVal").inputValue(), "5"); assert.equal(await p.locator("#prNote").inputValue(), "Keep this note");
      await p.evaluate(() => { Storage.prototype.setItem = window.testSetItem; }); await p.locator("#prLog").click(); assert.equal((await entries(p)).length, 1);
    });
    await check("fresh chart needs two taps, preserves history after reload, and restores without duplication", async p => {
      const id = await choose(p); await save(p, 1); await save(p, 3);
      await p.locator("#prFresh").click(); assert.equal((await entries(p)).filter(x => x.archived).length, 0);
      await p.locator("#prFresh").click(); assert.equal((await entries(p)).length, 2); assert.equal((await entries(p)).filter(x => x.archived).length, 2);
      assert.equal(await p.locator('#practicebox svg[role="img"]').count(), 0); assert.match(await text(p), /Earlier sessions \(2\)/);
      await save(p, 2); await p.reload(); await practice(p); await p.locator("#prSel").selectOption(id); await save(p, 4);
      assert.match(await text(p), /2 sessions in this chart/); assert.match(await text(p), /Earlier sessions \(2\)/);
      await p.locator("#practicebox summary").click(); assert.match(await text(p), /1 of 10 · 10%/);
      await fits(p, "earlier-sessions-phone");
      await p.locator("#prAll").click(); assert.equal((await entries(p)).length, 4); assert.equal((await entries(p)).filter(x => x.archived).length, 0); assert.match(await text(p), /4 sessions in this chart/);
    });
    await check("manual share includes earlier sessions and states its scope without sending", async p => {
      await choose(p); await save(p, 1, "Before reset"); await p.locator("#prFresh").click(); await p.locator("#prFresh").click(); await save(p, 2);
      await practice(p); await p.locator("#ccEntry").click(); await p.locator("#pgEntry").click();
      assert.match(await text(p), /Nothing is sent automatically/); assert.match(await text(p), /including earlier charts/); assert.match(await text(p), /not coach-verified/);
      assert(!/so your coach can see your Practice tab/.test(await text(p)));
      await p.locator("#pgMeIn").fill("Test Player"); await p.locator("#pgMake").click();
      const pl = await p.evaluate(() => pgReadCode(document.getElementById("pgOut").value).pl);
      assert.equal(pl.e.length, 2); assert.deepEqual(pl.e.map(x => x[2]), [1, 2]); assert.equal(pl.e[0][3], "Before reset");
    });
    await check("removal asks twice and refusal keeps history", async p => {
      await choose(p); await save(p, 1); await p.locator("[data-prdel]").click(); assert.equal((await entries(p)).length, 1);
      await p.evaluate(() => { window.testSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v){if(k === "gridlock_practice") throw Error("disk full"); return window.testSetItem.call(this,k,v);}; });
      await p.locator("[data-prdel]").click(); assert.equal((await entries(p)).length, 1); assert.match(await p.locator("#prMsg").innerText(), /not removed/);
    });
    await check("older sessions retain values and notes, no coach store is touched", async p => {
      const id = await choose(p);
      await p.evaluate(id => { const o = JSON.parse(localStorage.getItem("gridlock_practice")); o.e = [{ id:"old1", d:id, date:"2026-01-01", val:2, note:"Older result", ts:1 }]; localStorage.setItem("gridlock_practice",JSON.stringify(o)); }, id);
      await save(p, 5); const es = await entries(p); assert.equal(es[0].val, 2); assert.equal(es[0].note, "Older result"); assert.match(await text(p), /2 sessions in this chart/);
      assert.deepEqual(await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("gridlock.coach."))), []);
    });
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(r => server.close(r)); }
  console.log(`${passed}/${passed + failed} practice session checks passed.`); if(failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });

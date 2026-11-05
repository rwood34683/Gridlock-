"use strict";
/* The Tally loop faults the review of 5 Nov 2026 reproduced: the result bar
   over the field, double taps on New match and Next point, Back's own
   "tap again", an auto call outliving Back, and an auto call beating a tapped
   one on a sheet merge. */
const assert = require("node:assert/strict"), path = require("node:path");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let failed = 0, passed = 0;
  async function check(name, fn, vp = { width: 390, height: 844 }) {
    const c = await browser.newContext({ viewport: vp, hasTouch: true, serviceWorkers: "block" });
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url);
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, SEED);
      await p.reload(); await p.waitForFunction(() => typeof S === "object" && S.entered);
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  try {
    for (const vp of [{ width: 375, height: 667 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 390, height: 844 }])
      await check(`no tap on the Tally field lands on the result bar at ${vp.width}x${vp.height}`, async p => {
        const hits = await p.evaluate(() => {
          set({ tab: "tally" }); document.querySelector(".main").scrollTop = 0;
          const f = document.querySelector("#tally-map svg.field").getBoundingClientRect(); let n = 0;
          for (let y = f.top + 2; y < f.bottom - 2; y += 5) for (let x = f.left + 4; x < f.right - 4; x += 15) {
            const e = document.elementFromPoint(x, y); if (e && e.closest(".resultbar")) n++; }
          return n;
        });
        assert.equal(hits, 0);
      }, vp);
    await check("a double tap on the winning point does not close the sheet", async p => {
      await p.evaluate(() => { set({ tab: "tally" }); tapResult("us"); _lastEnd.at -= RESULT_GUARD_MS + 1; });
      const mid = await p.evaluate(() => S.matchId);
      await p.evaluate(() => { tapResult("us"); });          // 4–1, race over
      assert.ok(await p.evaluate(() => matchOver()), "race over");
      await p.evaluate(() => tapNewMatch());               // the second tap of the double
      assert.equal(await p.evaluate(() => S.matchId), mid, "the sheet stays open");
      assert.match(await p.evaluate(() => document.getElementById("root").innerText), /Tap New match again/);
      await p.evaluate(() => tapNewMatch());
      assert.notEqual(await p.evaluate(() => S.matchId), mid, "the tap it asks for goes through");
    });
    await check("Next point tapped twice moves one point", async p => {
      const pt = await p.evaluate(() => { set({ tab: "tally" }); const a = S.point; tapNext(); tapNext(); return [a, S.point]; });
      assert.equal(pt[1], pt[0] + 1);
    });
    await check("Back's 'tap again' is taken; the call the result wrote goes with it", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally", script: "snake" }); const pt = S.point;
        tapResult("them"); tapBack(); const refused = S.point; tapBack();
        return { pt, refused, back: S.point, call: (S.calls || []).some(c => c.m === S.matchId && c.pt === pt) };
      });
      assert.equal(got.refused, got.pt + 1); assert.equal(got.back, got.pt);
      assert.equal(got.call, false, "no call left on a point with no result");
    });
    await check("on a merged sheet, the call a coach tapped beats one the result wrote", async p => {
      const got = await p.evaluate(() => {
        const pt = S.point;
        set({ script: "hold" }); logCall(); endPoint("us");
        const copy = sheetPayload(S.matchId);
        backPoint(); S.calls = S.calls.filter(c => !(c.m === S.matchId && c.pt === pt)); save(S);
        set({ script: "snake" }); _lastEnd = null; tapResult("us");
        loadCopy("merge", copy);
        return (S.calls || []).filter(c => c.m === S.matchId && c.pt === pt).map(c => [c.script, !!c.auto]);
      });
      assert.deepEqual(got, [["hold", false]]);
    });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} tally review checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

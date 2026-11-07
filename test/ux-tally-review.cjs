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

    await check("the small-phone field fits after layout and after rotating back", async p => {
      await p.evaluate(() => set({ tab: "tally" }));
      async function fitted(){
        await p.waitForFunction(() => {
          const f = document.querySelector("#tally-map svg.field").getBoundingClientRect(),
                b = document.querySelector(".resultbar").getBoundingClientRect(),
                m = document.querySelector(".main").getBoundingClientRect();
          return f.height >= 170 && f.bottom <= b.top && b.bottom <= m.bottom + 1;
        });
      }
      await fitted();
      await p.setViewportSize({ width: 844, height: 390 });
      await p.waitForFunction(() => document.querySelector(".resultbar").classList.contains("resultbar--flow"));
      assert.ok(await p.evaluate(() => document.querySelector("#tally-map svg.field").getBoundingClientRect().bottom
        <= document.querySelector(".resultbar").getBoundingClientRect().top));
      await p.setViewportSize({ width: 375, height: 667 }); await fitted();
      await p.evaluate(() => { set({ tab: "scout" }); set({ tab: "tally" }); });
      await fitted();
    }, { width: 375, height: 667 });
    await check("a bottom bunker tap opens its sheet without changing the result", async p => {
      await p.evaluate(() => set({ tab: "tally" }));
      await p.waitForFunction(() => !document.querySelector(".resultbar").classList.contains("resultbar--flow"));
      const before = await p.evaluate(() => JSON.stringify({ point: S.point, results: S.results }));
      const target = await p.locator("#tally-map .bnk").evaluateAll(nodes => nodes.map(n => {
        const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }).sort((a, b) => b.y - a.y)[0]);
      await p.mouse.click(target.x, target.y);
      assert.ok(await p.locator("#tally-sheet").isVisible(), "opens the bunker sheet");
      assert.equal(await p.evaluate(() => JSON.stringify({ point: S.point, results: S.results })), before);
    }, { width: 375, height: 667 });
    // Filmed on an iPad, 7 Nov 2026: with nobody named, every tap on the field
    // redrew the screen and smooth-scrolled to a box already in view, and the
    // first tap grew the box — the field lurched under each tap.
    for (const vp of [{ width: 820, height: 1180 }, { width: 390, height: 844 }])
      await check(`taps on the field with no opponent hold the screen still at ${vp.width}x${vp.height}`, async p => {
        await p.evaluate(() => { S.matches = [{ id: "blank", at: Date.now(), layout: "lso" }]; S.matchId = "blank";
          S.right = { name: "" }; S.left = { name: "" }; S.point = 1; save(S); set({ tab: "tally" }); });
        await p.waitForTimeout(300);
        const field = () => p.evaluate(() => Math.round(document.querySelector("#root [data-pick]").getBoundingClientRect().top));
        const boxH = () => p.evaluate(() => Math.round(document.getElementById("tally-opp").getBoundingClientRect().height));
        // The iPad taps the field where it stands, under the box; a phone has to scroll down to it.
        const at = await p.evaluate(phone => { if (phone) document.querySelector("#root [data-pick]").scrollIntoView({ block: "center" });
          const r = document.querySelector("#root [data-pick]").getBoundingClientRect();
          window.__renders = 0; const r0 = window.render; window.render = (...a) => { window.__renders++; return r0(...a); };
          return { x: r.x + r.width * 0.3, y: r.y + r.height * 0.6 }; }, vp.width < 600);
        await p.waitForTimeout(150); const top0 = await field(), h0 = await boxH();
        for (let i = 0; i < 3; i++) { await p.touchscreen.tap(at.x + i * 20, at.y); await p.waitForTimeout(700); }
        assert.equal(await boxH(), h0, "the box is the same height lit or not");
        assert.ok(await p.evaluate(() => S.tallyNudge === true && !S.tallySel));
        assert.match(await p.evaluate(() => document.querySelector("#tally-opp .opp-lede").innerText), /^Name them first/);
        assert.ok(await p.evaluate(() => window.__renders) <= 1, "only the first tap redraws");
        if (vp.width > 600) assert.equal(await field(), top0, "the field stays where it was on an iPad, with the box in view");
        const o = await p.evaluate(() => { const b = document.getElementById("tally-opp").getBoundingClientRect(),
          m = document.querySelector(".main").getBoundingClientRect(); return b.top >= m.top - 1 && b.top < m.bottom; });
        assert.ok(o, "the box is on screen");
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

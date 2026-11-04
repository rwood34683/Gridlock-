"use strict";
/* Section 3 of the 4 Nov 2026 usability review: the sideline loop. A point
   cost 28 taps and a dozen scrolls; these hold the changes that cut it, with
   real taps on a phone-sized screen. */
const assert = require("node:assert/strict"), path = require("node:path");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let failed = 0, passed = 0;
  async function check(name, fn, opts = {}) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url);
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, opts.seed || SEED);
      await p.reload(); await p.waitForFunction(() => typeof S === "object" && S.entered);
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  const root = p => p.evaluate(() => document.getElementById("root").innerText);
  try {
    await check("the result is a fixed bar at the foot of Tally, on screen wherever the sheet is scrolled", async p => {
      await p.evaluate(() => set({ tab: "tally" }));
      for (const top of [0, 900, 2000]) {
        await p.evaluate(t => { document.querySelector(".main").scrollTop = t; }, top);
        const box = await p.locator(".resultbar").boundingBox();
        assert.ok(box && box.y + box.height <= 844 && box.y > 500, "bar on screen at scroll " + top);
      }
      const n = await p.locator("button", { hasText: /^We won it$/ }).count();
      assert.equal(n, 1, "one We won it, in the bar");
      await p.locator(".resultbar button", { hasText: "We won it" }).click(); await p.waitForTimeout(250);
      assert.match(await root(p), /Point 4 to you · 3–1/);
      const fl = await p.locator(".flash").boundingBox(), bar = await p.locator(".resultbar").boundingBox();
      assert.ok(fl.y + fl.height <= bar.y + 1, "the message sits above the bar, never over it");
    });
    await check("the bar stands down while a man's sheet is open, and when the match is over", async p => {
      await p.evaluate(() => { set({ tab: "tally" }); const b = curLayout().bunkers[8]; tallyTap([b.x, b.y]); });
      assert.equal(await p.locator(".resultbar").count(), 0);
      await p.evaluate(() => { tallyDone(); S.results = [...S.results, { m: S.matchId, pt: 4, won: "us", at: 5 }, { m: S.matchId, pt: 5, won: "us", at: 6 }]; S.point = 6; save(S); render(); });
      assert.equal(await p.evaluate(() => !!matchOver()), true);
      assert.equal(await p.locator(".resultbar").count(), 0);
    });
    await check("the call he is on is logged with the result, never twice, never on a watched game", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally" });
        const pt = S.point, had = (S.calls || []).filter(c => c.m === S.matchId && c.pt === pt).length;
        tapResult("them");
        const now = S.calls.filter(c => c.m === S.matchId && c.pt === pt);
        backPoint(); _lastEnd = null; tapResult("us");
        const again = S.calls.filter(c => c.m === S.matchId && c.pt === pt).length;
        S.left = { ...S.left, name: "Blast Camp" }; S.right = { ...S.right, name: "Rejects" };
        openSheet({ vs: "Rejects", watch: true, home: "Blast Camp", away: "Rejects" });
        _lastEnd = null; tapResult("us");
        const watched = S.calls.filter(c => c.m === S.matchId).length;
        return { had, now: now.length, script: now[0] && now[0].script, cur: S.script, again, watched };
      });
      assert.equal(got.had, 0); assert.equal(got.now, 1); assert.equal(got.script, "snake");
      assert.equal(got.again, 1, "a corrected result does not log the call twice");
      assert.equal(got.watched, 0, "a watched game's call is not his");
    });
    await check("a man's name with nothing else answered logs him made it in one tap, and the field comes back", async p => {
      await p.evaluate(() => { set({ tab: "tally", tallyStep: "record", tallyMode: "record" }); const b = curLayout().bunkers[8]; tallyTap([b.x, b.y]); });
      const n0 = await p.evaluate(() => (S.breakouts || []).length);
      await p.locator("#tally-sheet button", { hasText: /^Reyes$/ }).click();
      const got = await p.evaluate(() => ({ n: S.breakouts.length, row: S.breakouts[0], open: !!S.tallySel }));
      assert.equal(got.n, n0 + 1); assert.equal(got.row.player, "Reyes"); assert.equal(got.row.alive, true); assert.equal(got.open, false);
      const map = await p.locator("#tally-map").boundingBox();
      assert.ok(map.y < 844 * 0.6, "the field is back under the thumb");
      // With an answer first, the name only names him.
      await p.evaluate(() => { const b = curLayout().bunkers.find(x => x.x < 60 && x.id !== curLayout().bunkers[8].id); tallyTap([b.x, b.y]); setDraft({ alive: false }); });
      await p.locator("#tally-sheet button", { hasText: /^Okafor$/ }).click();
      const still = await p.evaluate(() => ({ open: !!S.tallySel, who: draft().player, alive: draft().alive }));
      assert.deepEqual(still, { open: true, who: "Okafor", alive: false });
    });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} section-three checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

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
      // The field is fitted by ResizeObserver before paint. Wait for that
      // layout pass, then hold the same position and scroll requirements.
      await p.waitForFunction(() => getComputedStyle(document.querySelector(".resultbar")).position === "sticky");
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
    await check("a watched game is scored from Scout, through the same guard", async p => {
      await p.evaluate(() => {
        S.left = { ...S.left, name: "Blast Camp" }; S.right = { ...S.right, name: "Rejects" };
        openSheet({ vs: "Rejects", watch: true, home: "Blast Camp", away: "Rejects" });
        set({ tab: "scout", scoutTab: "breakouts" });
      });
      const btn = p.locator('[aria-label="Who won the point"] button', { hasText: "Rejects won it" });
      await btn.click(); await btn.click().catch(() => {});
      const sc = await p.evaluate(() => matchScore());
      assert.deepEqual([sc.us, sc.them], [0, 1]);
    });
    await check("Layers draws one field, and Record sighting sits under the field it is tapped on", async p => {
      await p.evaluate(() => set({ tab: "scout", scoutTab: "layers" }));
      assert.equal(await p.locator("#root svg.field").count(), 1);
      await p.evaluate(() => { set({ scoutTab: "arrival" }); setArrival({ side: "right" }); });
      const map = await p.locator("#arrival-map").boundingBox();
      const rec = await p.getByRole("button", { name: "Record sighting", exact: true }).boundingBox();
      assert.ok(rec.y - (map.y + map.height) < 40, "Record is right under the field");
    });
    await check("the schedule jumps to the next game in one tap", async p => {
      await p.evaluate(() => set({ tab: "more", more: "schedule" }));
      const jump = p.locator("button", { hasText: /^Next game ·/ });
      assert.equal(await jump.count(), 1);
      await jump.click();
      const open = await p.evaluate(() => S.gameOpen);
      assert.ok(open, "the game opens");
      const row = await p.locator(`[data-game="${open}"]`).boundingBox();
      assert.ok(row.y >= 0 && row.y < 844 / 2, "its row is on screen");
    });
    await check("the squad goes in by paste, and the add row keeps the keyboard up", async p => {
      await p.evaluate(() => { S.roster = []; save(S); set({ tab: "more", more: "team" }); });
      await p.fill("#rPaste", "Houston Heat Roster\n7 Reyes\n12 Okafor\nCoach Bob Smith\n21 Vance");
      await p.getByRole("button", { name: "Add them", exact: true }).click();
      const names = await p.evaluate(() => S.roster.map(r => r.name + "#" + r.num));
      assert.deepEqual(names, ["Reyes#7", "Okafor#12", "Vance#21"]);
      await p.fill("#rNum", "33"); await p.fill("#rName", "Marsh"); await p.press("#rName", "Enter");
      assert.equal(await p.evaluate(() => document.activeElement && document.activeElement.id), "rNum");
      assert.equal(await p.evaluate(() => S.roster.length), 4);
    });
    await check("the format page's scroll does not carry onto Playbook; P and S say what they are", async p => {
      await p.evaluate(() => { S.fmtAsk = true; render(); document.querySelector(".main").scrollTop = 700; set({ flash: "" }); });
      await p.evaluate(() => set({ fmtAsk: false, tab: "playbook" }));
      assert.equal(await p.evaluate(() => document.querySelector(".main").scrollTop), 0);
      assert.ok(await p.locator('button[aria-label="Primary"]').count() >= 1);
      assert.ok(await p.locator('button[aria-label="Secondary"]').count() >= 1);
    });
    await check("a new phone with no squad is told what comes next on Playbook", async p => {
      await p.evaluate(() => { S.roster = []; S.tips.next = false; set({ tab: "playbook" }); });
      await p.getByRole("button", { name: "Add your players ›" }).click();
      assert.deepEqual(await p.evaluate(() => [S.tab, S.more]), ["more", "team"]);
    });
    await check("review: a double tap on point 1 scores point 1 once and never lands on a back button", async p => {
      await p.evaluate(() => { openSheet({ vs: "Rejects" }); set({ tab: "tally" }); });
      const btn = p.locator(".resultbar button", { hasText: "We won it" });
      const box = await btn.boundingBox();
      const x = box.x + 12, y = box.y + box.height / 2;      // its left edge, where ‹ 1 would appear
      await p.mouse.click(x, y); await p.mouse.click(x, y);
      const got = await p.evaluate(() => ({ pt: S.point, n: S.results.filter(r => r.m === S.matchId).length }));
      assert.deepEqual(got, { pt: 2, n: 1 });
    });
    await check("review: tapping a name already charted elsewhere this point only names him; nothing is overwritten", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally", tallyStep: "record", tallyMode: "record" });
        const ours = curLayout().bunkers.filter(x => x.x < 60);
        tallyTap([ours[0].x, ours[0].y]); setDraft({ player: "Reyes", alive: false }); logBreakout();
        const outs0 = S.tally.filter(o => o.m === S.matchId && o.pt === S.point && o.name === "Reyes").length;
        tallyTap([ours[3].x, ours[3].y]); nameMadeIt("Reyes");
        return { outs0, outs1: S.tally.filter(o => o.m === S.matchId && o.pt === S.point && o.name === "Reyes").length,
          rows: S.breakouts.filter(r => r.m === S.matchId && r.pt === S.point && r.player === "Reyes").map(r => [r.bunker, r.alive]),
          open: !!S.tallySel, draft: draft().player, first: ours[0].id };
      });
      assert.equal(got.outs0, 1); assert.equal(got.outs1, 1, "his out stays");
      assert.deepEqual(got.rows, [[got.first, false]], "his row stays"); assert.equal(got.open, true); assert.equal(got.draft, "Reyes");
    });
    await check("review: a point taken back and scored again takes the call standing now; a call he logged himself stays", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally" });
        const pt = S.point, on = () => S.calls.filter(c => c.m === S.matchId && c.pt === pt).map(c => c.script);
        set({ script: "snake" }); tapResult("us"); const a = on();
        _lastEnd = null; backPoint(); set({ script: "blitz" }); tapResult("us"); const b = on();
        _lastEnd = null; backPoint(); set({ script: "hold" }); logCall(); set({ script: "flood" }); tapResult("us"); const c = on();
        return { a, b, c };
      });
      assert.deepEqual(got, { a: ["snake"], b: ["blitz"], c: ["hold"] });
    });
    await check("review: a pasted man who wears a number already worn is added and said", async p => {
      await p.evaluate(() => set({ tab: "more", more: "team" }));
      await p.locator("summary", { hasText: "Paste your roster" }).click();
      await p.fill("#rPaste", "7 Newman");
      await p.getByRole("button", { name: "Add them", exact: true }).click();
      assert.match(await root(p), /#7 is also Reyes's/);
    });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} section-three checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

"use strict";
/* The usability review of 4 Nov 2026 found six things that made the app
   record something false or lose what was logged. Each one is held here
   through the screen a coach uses, with real taps where a tap was the fault. */
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
    await check("a double tap on We won it scores one point, not two", async p => {
      await p.evaluate(() => window.set({ tab: "tally" }));
      const before = await p.evaluate(() => ({ s: matchScore(), pt: S.point }));
      const btn = p.locator("button", { hasText: /won it/ }).first();
      await btn.scrollIntoViewIfNeeded();
      await btn.click(); await btn.click({ timeout: 2000 }).catch(() => {});
      const after = await p.evaluate(() => ({ s: matchScore(), pt: S.point }));
      assert.equal(after.s.us + after.s.them, before.s.us + before.s.them + 1, "one point scored");
      assert.equal(after.pt, before.pt + 1);
      assert.match(await root(p), /already scored/, "the second tap says why it did nothing");
    });
    await check("after the guard window, or after Back a point, the next result is taken", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally" });
        tapResult("us"); const a = matchScore().us;
        backPoint(); tapResult("them"); const b = matchScore();
        _lastEnd.at -= RESULT_GUARD_MS + 1; tapResult("us");
        return { a, b, c: matchScore() };
      });
      assert.equal(got.a, 3); assert.deepEqual([got.b.us, got.b.them], [2, 2]);
      assert.equal(got.c.us + got.c.them, 5);
    });
    await check("every result button on the app goes through the guard", async p => {
      const src = await p.evaluate(() => [...document.scripts].map(s => s.textContent).join("\n"));
      assert.ok(!/onclick="endPoint\(/.test(src), "no button calls endPoint directly");
      assert.ok((src.match(/onclick="tapResult\(/g) || []).length >= 4);
    });
    await check("relaunching on one phone leaves no recovery copies behind; a real fork stays", async p => {
      for (let i = 0; i < 6; i++) {
        await p.evaluate(i => { S.roster = [...S.roster, { num: 60 + i, name: "Relaunch" + i, pos: "" }]; save(S); }, i);
        await p.reload(); await p.waitForFunction(() => typeof S === "object" && S.entered);
      }
      const got = await p.evaluate(() => ({ listed: gridlockRecoveryCopies().length,
        keys: Object.keys(localStorage).filter(k => k.startsWith(TAB_COPY)).length }));
      assert.equal(got.listed, 0, "nothing listed under Recovery copies");
      assert.ok(got.keys <= 1, "at most this tab's own journal is kept, found " + got.keys);
      // A journal whose save the store does not hold is somebody's only record.
      const kept = await p.evaluate(() => {
        const copy = { format: COPY_FORMAT, v: COPY_VERSION, scope: "all", at: new Date().toISOString(), app: "Gridlock Coach", data: {}, journalId: "zz.forked" };
        localStorage.setItem(TAB_COPY + "zz", JSON.stringify(copy, null, 1));
        pruneJournals();
        return !!localStorage.getItem(TAB_COPY + "zz");
      });
      assert.ok(kept, "a forked journal is never pruned");
    });
    await check("a sighting is never filed against a man nobody picked", async p => {
      await p.evaluate(() => { set({ tab: "scout", scoutTab: "arrival" }); setArrival({ side: "right" }); setArrival({ destination: curLayout().bunkers[10].id }); });
      const n0 = await p.evaluate(() => (S.arrivalSightings || []).length);
      assert.equal(await p.evaluate(() => arrivalContext().player), "", "nobody is picked on arrival");
      await p.getByRole("button", { name: "Record sighting", exact: true }).click();
      assert.equal(await p.evaluate(() => (S.arrivalSightings || []).length), n0, "nothing recorded");
      assert.match(await root(p), /Tap the man first/);
      const chips = p.locator('[aria-label="Their man"] button');
      assert.ok(await chips.count() >= 1, "their men are tap chips");
      await chips.first().click();
      await p.evaluate(() => setArrival({ destination: curLayout().bunkers[10].id }));
      await p.getByRole("button", { name: "Record sighting", exact: true }).click();
      const got = await p.evaluate(() => ({ n: S.arrivalSightings.length, who: S.arrivalSightings.at(-1).player, picked: arrivalContext().player }));
      assert.equal(got.n, n0 + 1); assert.equal(got.who, got.picked); assert.ok(got.who);
    });
    await check("on a watched game, switching whose five keeps the men already placed", async p => {
      await p.evaluate(() => {
        S.left = { ...S.left, name: "Blast Camp" }; S.right = { ...S.right, name: "Rejects" };
        openSheet({ vs: "Rejects", watch: true, home: "Blast Camp", away: "Rejects" });
        set({ tab: "scout", scoutTab: "breakouts", scoutSide: "left" });
        const ids = curLayout().bunkers.slice(0, 3).map(b => b.id);
        setPick(ids);
      });
      const placed = await p.evaluate(() => [...S.theirPick]);
      assert.equal(placed.length, 3);
      await p.getByRole("button", { name: "Rejects", exact: true }).first().click();
      assert.deepEqual(await p.evaluate(() => S.theirPick), [], "the away side starts its own five");
      await p.evaluate(() => setPick([curLayout().bunkers[20].id]));
      await p.getByRole("button", { name: "Blast Camp", exact: true }).first().click();
      assert.deepEqual(await p.evaluate(() => S.theirPick), placed, "the home five comes back");
      await p.getByRole("button", { name: "Rejects", exact: true }).first().click();
      assert.equal((await p.evaluate(() => S.theirPick)).length, 1, "and so does the away man");
    });
    await check("a break charted battling in or with no pressure reads back that way", async p => {
      const got = await p.evaluate(() => {
        const m = S.matchId, lay = S.layoutKey, b = curLayout().bunkers[5].id;
        S.breakouts = [...(S.breakouts || []),
          { id: "bx1", m, pt: 3, side: "us", player: "Reyes", bunker: b, alive: true, entry: "battle", layout: lay, vs: "Rejects", at: 1 },
          { id: "bx2", m, pt: 3, side: "us", player: "Okafor", bunker: b, alive: true, entry: "clean", layout: lay, vs: "Rejects", at: 2 }];
        save(S);
        return { story: pointStory(m, 3, "Rejects"), read: manRead("us", "Reyes", "Rejects") };
      });
      assert.match(got.story, /battling in/); assert.match(got.story, /no pressure/);
      assert.equal(got.read.battling, 1, "the battling count counts what the sheet stores");
    });
    await check("Help tells a coach what the app actually does", async p => {
      const got = await p.evaluate(() => {
        const a = q => { const r = HELP_Q.find(x => x[0] === q); return typeof r[1] === "function" ? r[1]() : r[1]; };
        return { chart: a("How do I chart the break?"), assist: a("Can my assistant coach log too?"), cost: a("What does it cost?"),
          live: billingLive(), sight: JSON.stringify(HELP), src: [...document.scripts].map(s => s.textContent).join("") };
      });
      assert.doesNotMatch(got.chart, /second tap takes him off/); assert.match(got.chart, /second man/);
      assert.doesNotMatch(got.assist, /do not sync/); assert.match(got.assist, /Send this sheet/);
      if (!got.live) assert.match(got.cost, /^Nothing is for sale yet/);
      assert.doesNotMatch(got.sight, /red for blocked/);
      assert.doesNotMatch(got.src, /Everything red is clipped/);
    });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} section-one checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

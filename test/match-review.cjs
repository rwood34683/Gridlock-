"use strict";
/* The match review on More › Matches: one sheet read back as counts, and the
   text a coach hands the squad. Every line is counted from rows logged on that
   sheet; grades stay on the phone. */
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
    const c = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url);
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, { ...SEED, ...(opts.seed || {}) });
      await p.goto(url);
      await p.waitForFunction(() => typeof S === "object");
      // The share sheet is the phone's; here the text is caught.
      await p.evaluate(() => { window.__shared = null; window.handOff = (t, x) => { window.__shared = x; }; });
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  const root = p => p.evaluate(() => document.getElementById("root").innerText);
  const review = p => p.evaluate(() => (document.getElementById("match-review") || {}).innerText || "");
  const toMatches = p => p.evaluate(() => set({ tab: "more", more: "matches" }));
  // Three men charted on the seeded sheet: Reyes made it twice, Marsh shot on
  // the break at the bunker he broke to, and one of theirs shot.
  const chart = p => p.evaluate(() => {
    const b = curLayout().bunkers, a = b[2].id, d = b[5].id, f = b[9].id;
    S.breakouts = [
      { id: "r1", m: "shot-m1", pt: 1, side: "us", player: "Reyes", bunker: a, alive: true, layout: "lso", at: 1 },
      { id: "r2", m: "shot-m1", pt: 2, side: "us", player: "Reyes", bunker: a, alive: true, layout: "lso", at: 2 },
      { id: "r3", m: "shot-m1", pt: 3, side: "us", player: "Marsh", bunker: d, alive: false, shotFrom: f, layout: "lso", at: 3 },
      { id: "r4", m: "shot-m1", pt: 3, side: "them", player: "#4 Dill", bunker: f, alive: false, layout: "lso", at: 4 },
    ];
    S.assessments = [{ who: "Reyes", score: 4, pt: 1, m: "shot-m1", at: 5 }];
    save(S); render();
    const nm = id => cardName(curLayout().bunkers.find(x => x.id === id));
    return { a: nm(a), d: nm(d), f: nm(f) };
  });
  try {
    await check("the sheet on now has a review with the score and what each call won", async p => {
      await toMatches(p);
      const t = await review(p);
      assert.match(t, /Match review/i); assert.match(t, /2–1/); assert.match(t, /not finished/);
      assert.match(t, /Right read/i); assert.match(t, /2 of 2/);
      assert.match(t, /Snake Stack[\s\S]*called 2 · won 2 of 2/i);
      assert.match(t, /called 1 · won 0 of 1/);
    });
    await check("each man's breaks, where men were lost, and the grade only on the screen", async p => {
      const n = await chart(p); await toMatches(p);
      const t = await review(p);
      assert.match(t, /Reyes\n?[\s\S]*2 breaks charted · made it 2 of 2/);
      assert.match(t, new RegExp(`broke to ${n.a.replace(/[#.*+?^${}()|[\]\\]/g, "\\$&")} 2 of 2`));
      assert.match(t, /Marsh[\s\S]*shot on the break 1/);
      assert.match(t, /Where you lost men/); assert.match(t, /your grade 4/);
      await p.getByRole("button", { name: "Share the review with the squad" }).click();
      const s = await p.evaluate(() => window.__shared);
      assert.match(s, /^vs Rejects/); assert.match(s, /Our calls:/); assert.match(s, /- Reyes: 2 breaks charted, made it 2 of 2/);
      assert.match(s, /Where we lost men:/);
      assert.doesNotMatch(s, /grade/i, "grades stay on the phone");
    });
    await check("a finished match offers Review this match on the point sheet", async p => {
      await p.evaluate(() => { S.matches[0].raceTo = 3; S.results.push({ m: "shot-m1", pt: 4, won: "us", at: Date.now() }); S.point = 5; save(S); set({ tab: "tally" }); });
      await p.getByRole("button", { name: "Review this match" }).click();
      assert.equal(await p.evaluate(() => S.more), "matches");
      assert.match(await review(p), /You won 3–1/);
    });
    await check("a kept sheet is reviewed from its row, and Back returns to the one on now", async p => {
      await p.evaluate(() => {
        S.matches.push({ id: "old1", at: Date.now() - 86400000, vs: "Dynasty", layout: "lso", raceTo: 2 });
        S.results.push({ m: "old1", pt: 1, won: "them", at: 1 }, { m: "old1", pt: 2, won: "them", at: 2 });
        save(S);
      });
      await toMatches(p);
      await p.getByRole("button", { name: /^Review/ }).first().click();
      const t = await review(p);
      assert.match(t, /Dynasty won 0–2/); assert.equal(await p.evaluate(() => S.matchId), "shot-m1", "reviewing does not open the sheet");
      await p.getByRole("button", { name: "Back to the sheet on now" }).click();
      assert.match(await review(p), /2–1/);
    });
    await check("a watched game names both teams and has no 'you' in it", async p => {
      await p.evaluate(() => {
        S.matches.push({ id: "w1", at: Date.now(), watch: true, home: "Infamous", away: "Heat", vs: "Heat", layout: "lso" });
        S.results.push({ m: "w1", pt: 1, won: "us", at: 1 });
        S.scout.Heat = { breaks: [{ m: "w1", pt: 1, script: "snake", layout: "lso", at: 1 }] };
        S.matchId = "w1"; save(S);
      });
      await toMatches(p);
      const t = await review(p);
      assert.match(t, /Infamous won 1–0|1–0 so far/); assert.match(t, /Infamous v Heat/);
      assert.doesNotMatch(t, /Your calls|Where you lost/);
      assert.match(t, /Heat · Snake Stack[\s\S]*ran 1 · won 0 of 1/i);
      await p.getByRole("button", { name: "Share the review with the squad" }).click();
      const s = await p.evaluate(() => window.__shared);
      assert.match(s, /^Infamous v Heat/); assert.doesNotMatch(s, /Our calls|we lost/i);
    });
    await check("a blank sheet shows no review, and a team's name is printed as text", async p => {
      await p.evaluate(() => { S.matches.push({ id: "b1", at: Date.now(), vs: "<b>x</b>", layout: "lso" }); S.matchId = "b1"; save(S); });
      await toMatches(p);
      assert.equal(await review(p), "", "nothing logged, nothing to review");
      await p.evaluate(() => { S.results.push({ m: "b1", pt: 1, won: "them", at: 1 }); save(S); render(); });
      const html = await p.evaluate(() => document.getElementById("match-review").innerHTML);
      assert.ok(!html.includes("<b>x</b>"), "escaped"); assert.match(await review(p), /<b>x<\/b> won|0–1 so far/);
      assert.match(await review(p), /Only the score is on this sheet/);
    });
    await check("reviewing an old sheet does not survive a relaunch", async p => {
      await p.evaluate(() => { S.matches.push({ id: "old2", at: 1, vs: "Dynasty", layout: "lso" }); S.results.push({ m: "old2", pt: 1, won: "us", at: 1 }); save(S); });
      await p.evaluate(() => openReview("old2"));
      assert.equal(await p.evaluate(() => S.reviewId), "old2");
      await p.reload(); await p.waitForFunction(() => typeof S === "object");
      assert.equal(await p.evaluate(() => S.reviewId), null);
    });
    await check("the share button is a full 44 px target on a phone", async p => {
      await toMatches(p);
      const b = await p.getByRole("button", { name: "Share the review with the squad" }).boundingBox();
      assert.ok(b && b.height >= 44 && b.width >= 200);
    }, { viewport: { width: 320, height: 640 } });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} match review checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

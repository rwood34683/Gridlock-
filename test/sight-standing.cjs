"use strict";
/* Sightlines with both men standing: a bunker with a published height under a
   standing man's eyes (snake beam, cake) no longer blocks a lane; every other
   bunker still does, and nothing outside Sightlines changes. */
const assert = require("node:assert/strict"), path = require("node:path");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let failed = 0, passed = 0;
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
  const p = await c.newPage(), errors = [];
  p.on("pageerror", e => errors.push(e.message));
  async function check(name, fn) { try { await fn(); passed++; console.log("PASS " + name); } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); } }
  try {
    await p.goto(url);
    await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, SEED);
    await p.goto(url); await p.waitForFunction(() => typeof S === "object");

    await check("only the kinds with an agreed height are under a standing man's eyes", async () => {
      const r = await p.evaluate(() => ({ h: BUNKER_HEIGHT_M, eye: EYE_STANDING_M,
        under: BUNKER_KINDS.filter(k => underEyes({ n: k.n })).map(k => k.n) }));
      assert.deepEqual(r.h, { SB: 0.76, Ck: 1.0 });
      assert.equal(r.eye, 1.64);
      assert.deepEqual(r.under, ["SB", "Ck"], "every kind without two sources still blocks");
    });

    await check("on every measured field a lane blocked only by snake beams or cakes opens, and no other lane does", async () => {
      const r = await p.evaluate(() => {
        const out = [];
        for (const key of Object.keys(LAYOUTS).filter(k => !k.startsWith("my:"))) {
          S.layoutKey = key;
          let opened = 0, wrong = [], kept = 0;
          for (const from of curLayout().bunkers) {
            const flat = sightLinesFresh(from.id, 1, 1, false), up = sightLinesFresh(from.id, 1, 1, true);
            flat.lines.forEach((l, i) => {
              const u = up.lines[i];
              const onlyLow = l.by.length && l.by.every(underEyes);
              if (!l.blocked) { if (u.blocked) wrong.push("closed " + from.id + ">" + l.to.id); return; }
              if (onlyLow) { if (u.blocked) wrong.push("still blocked " + from.id + ">" + l.to.id); else opened++; }
              else { if (!u.blocked) wrong.push("opened past a tall bunker " + from.id + ">" + l.to.id); else kept++;
                     if (u.by.some(underEyes)) wrong.push("a low bunker named as blocker " + from.id + ">" + l.to.id); }
            });
          }
          out.push({ key, opened, kept, wrong: wrong.slice(0, 3) });
        }
        return out;
      });
      for (const f of r) assert.deepEqual(f.wrong, [], f.key);
      assert.ok(r.some(f => f.opened > 0), "standing opens lanes over the snake somewhere");
      assert.ok(r.every(f => f.kept > 0), "tall bunkers still block on every field");
    });

    await check("the screen offers it, says what it assumes, and has no kneeling or prone", async () => {
      await p.evaluate(() => { S.layoutKey = "lso"; set({ tab: "sightlines", sightFrom: null, sightTo: null, sightAim: null }); });
      const flat = await p.evaluate(() => document.getElementById("root").innerText);
      assert.match(flat, /Every bunker blocks/); assert.match(flat, /Both standing/);
      assert.doesNotMatch(flat, /lower than a standing man's eyes/);
      const before = await p.evaluate(() => sightLines(S.sightFrom || sightDefault(), 2, 2).clear);
      await p.click("text=Both standing");
      const t = await p.evaluate(() => document.getElementById("root").innerText);
      assert.match(t, /snake beams and cakes stand lower than a standing man's eyes/);
      assert.match(t, /Every other bunker still blocks/);
      assert.match(t, /Kneeling and prone are not here/);
      assert.doesNotMatch(t, /\bKneeling\b(?! and prone are not here)/);
      const after = await p.evaluate(() => sightLines(S.sightFrom || sightDefault(), 2, 2, true).clear);
      assert.ok(after >= before, `${after} clear standing, ${before} flat`);
      assert.equal(await p.evaluate(() => document.querySelector('[aria-pressed="true"]').textContent.trim()), "Both standing");
    });

    await check("nothing outside Sightlines reads the stance: lanes off the break and the bunker book stay flat", async () => {
      const r = await p.evaluate(() => {
        const ids = curLayout().bunkers.map(b => b.id), pairs = [];
        for (let i = 0; i < ids.length; i += 7) for (let j = 1; j < ids.length; j += 11) pairs.push([ids[i], ids[j]]);
        S.sightStand = "standing"; const a = pairs.map(([x, y]) => laneClear(x, y)), ba = bunkerBook(ids[0], true);
        S.sightStand = null; const b = pairs.map(([x, y]) => laneClear(x, y)), bb = bunkerBook(ids[0], true);
        return { same: JSON.stringify(a) === JSON.stringify(b), book: ba === bb };
      });
      assert.ok(r.same); assert.ok(r.book);
    });
    await check("no page errors", async () => assert.deepEqual(errors, []));
  } finally { await browser.close(); server.close(); }
  console.log(`${passed}/${passed + failed} sightline stance checks passed.`);
  process.exit(failed ? 1 : 0);
})();

"use strict";
/* Before you play them, the next step on an empty read, and the messages for
   the team chat. Everything is counted from what was logged, nothing under
   three is said as a read, and lanes are the measured field, never odds. */
const assert = require("node:assert/strict"), path = require("node:path");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let failed = 0, passed = 0;
  async function check(name, fn, viewport = { width: 390, height: 844 }) {
    const c = await browser.newContext({ viewport, hasTouch: true, serviceWorkers: "block" });
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url);
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, SEED);
      await p.goto(url); await p.waitForFunction(() => typeof S === "object");
      // The clock is fixed before the event so every game on the schedule is still to come.
      await p.evaluate(() => { const t = Date.parse("2026-11-10T12:00:00"); Date.now = () => t; });
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  const root = p => p.evaluate(() => document.getElementById("root").innerText);
  // Their breaks on the field the coach is on: n calls and n fives, all one call, planted on the far half.
  const logTheirs = (p, team, n, call) => p.evaluate(([team, n, call]) => {
    const far = curLayout().bunkers.filter(b => b.x > 90).slice(0, 5).map(b => b.id);
    const prof = S.scout[team] = S.scout[team] || { name: team, players: [], breaks: [] };
    prof.breaks = [...(prof.breaks || []), ...Array.from({ length: n }, (_, i) => ({ script: call, plants: far, layout: S.layoutKey, at: Date.now() - i }))];
    save(S); render();
  }, [team, n, call]);
  try {
    await check("your game on the schedule opens the card, which says when and where, and every gap with what to do", async p => {
      await p.evaluate(() => set({ myTeam: "Houston Heat", tab: "more", more: "schedule" }));
      const row = await p.evaluate(() => [...document.querySelectorAll("#root .daylight--play button")].map(b => b.textContent.trim()));
      assert.ok(row.includes("Before you play them") && row.includes("Tell the team"), row.join(" | "));
      await p.evaluate(() => openPrep(teamDay("Houston Heat")[0].opp));
      const t = await root(p);
      assert.match(t, /Before you play LTF/i);
      assert.match(t, /You play LTF Wednesday 7:15 AM, NXL Pro · Pit 1/);
      assert.match(t, /3 more of their breaks logged and the read starts\. Next chance: Texas Hurricanes v LTF/);
      assert.match(t, /What you don't know yet/i);
      assert.match(t, /Read it on NXL World Cup/, "a game on another field says so");
      assert.ok(await p.evaluate(() => [...document.querySelectorAll("#root button")].some(b => /watchGame\(/.test(b.getAttribute("onclick") || ""))));
    });
    await check("two calls logged is not a read: the card says how many more, never their top call", async p => {
      await logTheirs(p, "Rejects", 2, "blitz");
      await p.evaluate(() => openPrep("Rejects"));
      const t = await root(p);
      assert.match(t, /1 more of their break logged and the read starts/);
      assert.doesNotMatch(t, /\b2 of 2 logged\b/);
    });
    await check("with three logged the card counts what they run, where they plant, and ranks calls by lanes on the measured field", async p => {
      await logTheirs(p, "Rejects", 4, "blitz");
      await p.evaluate(() => openPrep("Rejects"));
      const t = await root(p);
      assert.match(t, /4 of 4 logged/);
      assert.match(t, /4 of 4 fives/);
      assert.match(t, /with a lane on them · \d of theirs on you/);
      assert.match(t, /Geometry, not odds/);
      const text = await p.evaluate(() => prepText("Rejects"));
      assert.match(text, /What they run \(4 logged on /); assert.match(text, /Not a prediction/);
    });
    await check("the right pit's card opens the card, and Put them in the right pit goes to Matchup", async p => {
      await p.evaluate(() => { loadPit("Rejects", "right"); set({ tab: "scout", scoutTab: "matchup" }); });
      const b = await p.evaluate(() => [...document.querySelectorAll("#root .pit--r button")].find(x => /Before you play Rejects/.test(x.textContent)) ? 1 : 0);
      assert.equal(b, 1);
      await p.evaluate(() => { openPrep("Detroit Infamous"); prepToPit(); });
      assert.deepEqual(await p.evaluate(() => [S.tab, S.scoutTab, S.right.name]), ["scout", "matchup", "Detroit Infamous"]);
    });
    await check("an empty read on the point sheet and on Anticipate names the next game of theirs to watch", async p => {
      await p.evaluate(() => { loadPit("LTF", "right"); newMatch(); set({ tab: "scout", scoutTab: "anticipate" }); });
      assert.match(await root(p), /to read them[\s\S]*Next chance: Houston Heat v LTF/i);
      await p.evaluate(() => set({ tab: "playbook" }));
      const line = await p.evaluate(() => nextReadLine(false));
      assert.match(line, /no calls logged yet/); assert.match(line, /Next chance/);
    });
    await check("Tell the team gives the game, the field and when to be at the pit — the coach's rule, or none", async p => {
      const r = await p.evaluate(() => {
        set({ myTeam: "Houston Heat" }); const g = teamDay("Houston Heat")[0].g;
        const a = tellText(g); setPitLead("45"); const b = tellText(g); setPitLead("0"); const c = tellText(g);
        setPitLead("30"); setRunLate(g.d + "|" + g.f, "15"); const d = tellText(gameById(g.id));
        return { a, b, c, d };
      });
      assert.equal(r.a, "Houston Heat v LTF — Wednesday 7:15 AM, NXL Pro · Pit 1. At the pit by 6:45 AM.");
      assert.match(r.b, /At the pit by 6:30 AM/);
      assert.doesNotMatch(r.c, /pit by/);
      assert.match(r.d, /7:30 AM \(15 late\).*At the pit by 7:00 AM.*running 15 min late/);
    });
    await check("the day plan lists his games and who is scouting what, and asks who goes to a clash", async p => {
      const t = await p.evaluate(() => { set({ myTeam: "Houston Heat" }); return dayPlanText("Houston Heat"); });
      assert.match(t, /^Houston Heat — Wednesday/);
      assert.match(t, /7:15 AM v LTF · NXL Pro · Pit 1 · at the pit by 6:45 AM/);
      assert.match(t, /Scouting:\n8:15 AM Texas Hurricanes v LTF/);
      assert.match(t, /clashes with our game — who's going\?/);
    });
    await check("the card stays inside a 320 px phone", async p => {
      await logTheirs(p, "Rejects", 4, "blitz");
      await p.evaluate(() => openPrep("Rejects"));
      const wide = await p.evaluate(() => [...document.querySelectorAll("#root *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).length);
      assert.equal(wide, 0);
    }, { width: 320, height: 640 });
  } finally { await browser.close(); server.close(); }
  console.log(`${passed}/${passed + failed} game prep checks passed.`);
  process.exit(failed ? 1 : 0);
})();

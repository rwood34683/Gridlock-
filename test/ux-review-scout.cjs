"use strict";
/* Scout, Playbook and match-format faults the review of 5 Nov 2026
   reproduced, each held through the functions a screen calls. */
const assert = require("node:assert/strict"), path = require("node:path");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let failed = 0, passed = 0;
  async function check(name, fn) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
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
    await check("renaming their man moves his outs with him: one man, one out", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally" });
        const team = pitOf("right").name, i = pitOf("right").players.findIndex(x => x.name);
        const man = pitOf("right").players[i], tag = theirTag(man);
        markOut("them", tag);
        editScoutPlayer("right", i, "name", "Renamed");
        const now = theirTag(pitOf("right").players[i]);
        return { now, old: (S.tally || []).some(o => o.vs === team && o.name === tag), moved: (S.tally || []).some(o => o.vs === team && o.name === now) };
      });
      assert.equal(got.old, false); assert.equal(got.moved, true);
    });
    await check("a man picked on one team is nobody once another team is in the pit", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "scout", scoutTab: "arrival" });
        const man = pitOf("right").players.find(x => x.num);
        setArrival({ player: arrivalPlayerKey(man) });
        const before = arrivalContext().player;
        setPitTeam("right", boardTeam("Houston Heat"));
        return { before, after: arrivalContext().player };
      });
      assert.ok(got.before); assert.equal(got.after, "");
    });
    await check("the first man picked keeps the bunker tapped before him", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "scout", scoutTab: "arrival" }); setArrival({ side: "right" });
        const id = curLayout().bunkers[10].id; setArrival({ destination: id });
        const man = pitOf("right").players.find(x => x.num);
        setArrival({ player: arrivalPlayerKey(man) });
        return { id, dest: S.arrival.destination };
      });
      assert.equal(got.dest, got.id);
    });
    await check("a five placed and not logged does not follow a new team into the pit", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "scout", scoutTab: "breakouts" });
        setPick(curLayout().bunkers.slice(0, 3).map(b => b.id));
        setPitTeam("right", boardTeam("Houston Heat"));
        return (S.theirPick || []).length;
      });
      assert.equal(got, 0);
    });
    await check("Watch this game again reopens the sheet, not game 2 at 0–0", async p => {
      const got = await p.evaluate(() => {
        const g = allGames()[0]; watchGame(g.id); const first = S.matchId; tapResult("us");
        watchGame(g.id);
        return { same: S.matchId === first, n: S.matches.filter(m => m.watch && m.sched === g.id).length, score: matchScore().us };
      });
      assert.equal(got.same, true); assert.equal(got.n, 1); assert.equal(got.score, 1);
    });
    await check("a pasted man keeps his number when a wire word comes after it", async p => {
      const got = await p.evaluate(() => ["Lee #44 (D-side)", "Lee 44 D-side", "Lee 44 snake", "Roster 2026"].map(l => (parseRoster(l).found[0] || {}).num || ""));
      assert.deepEqual(got.slice(0, 3), ["44", "44", "44"]); assert.equal(got[3], "");
    });
    await check("a Walk tap leaves the field and its notes where they are", async p => {
      const got = await p.evaluate(() => {
        pickEvent("nwc"); set({ tab: "more", more: "walk" });
        const m = document.querySelector(".main"); m.scrollTop = 0;
        const b = curLayout().bunkers.find(x => x.y < 30) || curLayout().bunkers[0];
        walkTap([b.x, b.y]); return m.scrollTop;
      });
      assert.equal(got, 0);
    });
    await check("on the World Cup field a run to Tr#2 goes round Tr#3", async p => {
      const ok = await p.evaluate(() => {
        pickEvent("nwc");
        const r = autoRoute({ bunker: "Tr#2", side: "us", layout: "nwc" }).map(q => [q.x, q.y]);
        const t3 = curLayout().bunkers.find(b => b.id === "Tr#3");
        for (let i = 0; i < r.length - 1; i++)
          if (segHitsBox(r[i][0], r[i][1], r[i + 1][0], r[i + 1][1], t3.x, t3.y, t3.w / 2, t3.h / 2)) return false;
        return r.length > 2;
      });
      assert.equal(ok, true);
    });
    await check("a race that ends the match at the score refuses while the point has men charted", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally", tallyMode: "place" });
        const bl = curLayout().bunkers; placeAt(bl[3].id); const sc = matchScore(), hi = Math.max(sc.us, sc.them);
        setRaceTo(hi); return { over: !!matchOver(), said: S.flash };
      });
      assert.equal(got.over, false); assert.match(got.said, /already has men charted/);
    });
    await check("men charted after Next point come back with Back a point", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally", tallyMode: "place" }); _lastEnd = null;
        const from = S.point; nextPoint(); placeAt(curLayout().bunkers[3].id); backPoint();
        return { from, pts: (S.breakouts || []).filter(r => r.m === S.matchId && r.pt > from).length };
      });
      assert.equal(got.pts, 0);
    });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} scout and playbook review checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

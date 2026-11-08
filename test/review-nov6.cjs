"use strict";
/* The review of 6 Nov 2026: each check is a fault a reader reproduced in a
   browser, and the speed of a full season on a phone. */
const assert = require("node:assert/strict"), path = require("node:path"), vm = require("node:vm"), fs = require("node:fs");
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
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, { ...SEED, ...(opts.seed || {}) });
      await p.goto(url); await p.waitForFunction(() => typeof S === "object");
      await fn(p);
      assert.deepEqual(errors.filter(e => !opts.allowErrors), []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  const root = p => p.evaluate(() => document.getElementById("root").innerText);
  try {
    await check("Back to fix a scored point leaves the live point's men where they were charted", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally" }); const b = curLayout().bunkers;
        placeAt(b[40]); placeAt(b[41]);
        const before = S.breakouts.filter(r => r.m === S.matchId && r.pt === 4).length;
        backPoint();
        return { before, on4: S.breakouts.filter(r => r.m === S.matchId && r.pt === 4).length, on3: S.breakouts.filter(r => r.m === S.matchId && r.pt === 3).length, point: S.point };
      });
      assert.equal(got.before, 2); assert.equal(got.on4, 2); assert.equal(got.on3, 0); assert.equal(got.point, 3);
      assert.match(await root(p), /stay on point 4/);
    });
    await check("Next point by mistake and Back still carry the men, and their five on Scout moves with them", async p => {
      const got = await p.evaluate(() => {
        set({ tab: "tally" }); nextPoint();          // point 5, nobody scored point 4
        const b = curLayout().bunkers, far = b.filter(x => x.x > 100);
        S.tallyPlace = "them"; placeAt(far[0]); placeAt(far[1]);
        backPoint();
        const brk = (S.scout.Rejects.breaks || []).filter(x => x.m === S.matchId);
        return { on4: S.breakouts.filter(r => r.m === S.matchId && r.pt === 4).length, five4: brk.some(x => x.pt === 4 && x.tallied), five5: brk.some(x => x.pt === 5 && x.tallied) };
      });
      assert.equal(got.on4, 2); assert.ok(got.five4, "their five is on point 4"); assert.ok(!got.five5, "and not left on point 5");
    });
    await check("a double tap on Undo in the out log takes off one out, not two", async p => {
      await p.evaluate(() => set({ tab: "tally", tallyAllOuts: true }));
      const n = await p.evaluate(() => S.tally.filter(o => o.m === S.matchId).length);
      const html = await p.evaluate(() => [...document.querySelectorAll("#root button")].filter(b => /undoOut\(/.test(b.getAttribute("onclick") || "")).map(b => b.getAttribute("onclick"))[0]);
      assert.ok(html, "an Undo in the log");
      await p.evaluate(h => { (0, eval)(h); (0, eval)(h); }, html);
      assert.equal(await p.evaluate(() => S.tally.filter(o => o.m === S.matchId).length), n - 1);
    });
    await check("Undo on self-scout takes the call it is beside, once", async p => {
      await p.evaluate(() => set({ tab: "playbook" }));
      const n = await p.evaluate(() => S.calls.length);
      const on = await p.evaluate(() => [...document.querySelectorAll("#root button")].map(b => b.getAttribute("onclick") || "").find(h => /unlogCall\(/.test(h)));
      assert.ok(on, "an Undo on self-scout");
      await p.evaluate(h => { (0, eval)(h); (0, eval)(h); }, on);
      assert.equal(await p.evaluate(() => S.calls.length), n - 1);
      await p.evaluate(() => unlogCall("no|such|call"));
      assert.equal(await p.evaluate(() => S.calls.length), n - 1, "a stale button takes nothing");
    });
    await check("the review counts their call only on points that were scored, and names bunkers apart", async p => {
      const t = await p.evaluate(() => {
        S.scout.Rejects.breaks = [{ m: "shot-m1", pt: 4, script: "blitz", layout: "lso", at: 1 }];
        const md = curLayout().bunkers.filter(b => b.n === "MD").slice(0, 2);
        S.tally.push({ m: "shot-m1", pt: 1, side: "us", name: "Okafor", shotAt: md[0].id, layout: "lso", at: 1 },
                     { m: "shot-m1", pt: 2, side: "us", name: "Vance", shotAt: md[1].id, layout: "lso", at: 2 });
        save(S); return reviewText("shot-m1");
      });
      assert.match(t, /Blitz: ran 1\n|Blitz: ran 1$/m); assert.doesNotMatch(t, /Blitz: ran 1, won 0 of 1/);
      const lost = (t.match(/Where we lost men: (.*)/) || [])[1] || "";
      assert.ok(lost && !/MD 1, MD 1|MD 2/.test(lost), "two MD bunkers are not one name: " + lost);
    });
    await check("a match state from a copy is printed as text, never run", async p => {
      await p.evaluate(() => { window.__ran = 0; S.matchState = '<img src=x onerror="window.__ran=1">'; save(S); set({ tab: "scout", scoutTab: "counter" }); });
      await p.waitForTimeout(100);
      assert.equal(await p.evaluate(() => window.__ran), 0);
    });
    await check("Replace keeps this phone's store plan", async p => {
      const plan = await p.evaluate(() => {
        S.billing = { plan: "team", exp: 0, source: "store", at: Date.now() };
        const copy = JSON.stringify({ format: COPY_FORMAT, v: COPY_VERSION, scope: "all", at: new Date().toISOString(), app: "Gridlock Coach", data: { roster: [{ name: "Solo", num: 1 }] } });
        window.loadCopy("replace", copy);
        return (S.billing || {}).plan;
      });
      assert.equal(plan, "team");
    });
    await check("a merge leaves out a play, a field and a calendar entry deleted on this phone, and says what it did bring", async p => {
      const r = await p.evaluate(() => {
        window.confirm = () => true;
        S.plays = [{ k: "my:rk", name: "Rocket", read: "", aggr: 3, plants: { lso: curLayout().bunkers.slice(0, 5).map(b => b.id) }, at: 1 }];
        S.calEvents = [{ id: "ev1", kind: "practice", d: "2026-11-20", t: "", title: "Practice" }];
        const copy = JSON.stringify({ format: COPY_FORMAT, v: COPY_VERSION, scope: "all", at: new Date().toISOString(), app: "Gridlock Coach", data: { plays: S.plays, calEvents: S.calEvents } });
        dropPlay("my:rk"); S.calEvents = S.calEvents.filter(x => x.id !== "ev1"); markGone("calEvents", "ev1");
        set({ tab: "more", more: "nexus" });
        window.loadCopy("merge", copy);
        const back = customPlays().some(x => x.k === "my:rk") || (S.calEvents || []).some(x => x.id === "ev1");
        const said1 = S.copyStatus;
        const copy2 = JSON.stringify({ format: COPY_FORMAT, v: COPY_VERSION, scope: "all", at: new Date().toISOString(), app: "Gridlock Coach", data: { calEvents: [{ id: "ev2", kind: "practice", d: "2026-11-21", t: "", title: "Walk" }] } });
        window.loadCopy("merge", copy2);
        return { back, said1, said2: S.copyStatus };
      });
      assert.equal(r.back, false, "nothing deleted came back");
      assert.match(r.said1, /you deleted on this phone left out/);
      assert.match(r.said2, /1 calendar event/); assert.doesNotMatch(r.said2, /already had all of it/);
    });
    await check("a bunker picked on Codes is dropped when the event changes", async p => {
      const r = await p.evaluate(() => { set({ tab: "more", more: "codes", codePick: curLayout().bunkers[3].id, codeName: "Rocket" }); set({ layoutKey: "tbo" }); return [S.codePick, S.codeName]; });
      assert.deepEqual(r, [null, ""]);
    });
    await check("a word on a bunker taken off a built field is free for another bunker", async p => {
      const r = await p.evaluate(() => {
        const ids = curLayout().bunkers.map(b => b.id);
        S.bunkerCalls = { ...(S.bunkerCalls || {}), lso: { "no-such-bunker": "Rocket" } };
        return [bunkerWordTaken("Rocket", ids[2]), (S.bunkerCalls.lso.x = "Zed", bunkerWordTaken("Zed", ids[2]))];
      });
      assert.deepEqual(r, [null, null]);
    });
    await check("a play edited and renamed onto a deleted play's name takes that play's record", async p => {
      const r = await p.evaluate(() => {
        window.confirm = () => true;
        const five = curLayout().bunkers.slice(0, 5).map(b => b.id), five2 = curLayout().bunkers.slice(5, 10).map(b => b.id);
        S.plays = [{ k: "my:a", name: "Rocket", read: "", aggr: 3, plants: { lso: five }, at: 1 }, { k: "my:b", name: "Blitz Two", read: "", aggr: 3, plants: { lso: five2 }, at: 2 }];
        S.calls.push({ m: S.matchId, pt: 1, script: "my:a", layout: "lso", vs: "Rejects", at: 5 });
        dropPlay("my:a");
        S.building = { k: "my:b", name: "Rocket", read: "", aggr: 3, plants: [...five2], layout: "lso" };
        savePlay();
        return { keys: [...new Set(S.calls.filter(c => /^my:/.test(c.script)).map(c => c.script))], name: callName("my:b") };
      });
      assert.deepEqual(r.keys, ["my:b"]); assert.equal(r.name, "Rocket");
    });
    await check("Your team's day lists his games, who to scout before each, the clashes, and a pit running late moves the times", async p => {
      await p.evaluate(() => set({ tab: "more", more: "schedule" }));
      assert.match(await root(p), /Pick your team and this lists/);
      await p.selectOption("#my-team", "Seattle Uprising");
      const r = await p.evaluate(() => {
        const day = teamDay("Seattle Uprising"), g = day[1];
        const before = gameAt(g.g); setRunLate(g.g.d + "|" + g.g.f, 20);
        return { n: day.length, opp: g.opp, scout: g.scout.length, clash: day.some(d => d.scout.some(x => x.clash)), moved: (gameAt(g.g) - before) / 60000 };
      });
      assert.ok(r.n >= 2 && r.scout >= 1 && r.clash, JSON.stringify(r)); assert.equal(r.moved, 20);
      const t = await root(p);
      assert.match(t, /Scout Los Angeles Collision before then/); assert.match(t, /send someone/i); assert.match(t, /20 late/);
      await p.reload(); await p.waitForFunction(() => typeof S === "object");
      assert.equal(await p.evaluate(() => S.myTeam), "Seattle Uprising", "his team is remembered");
    });
    await check("Who to scout next lists, by the clock, each game of a team he still plays, with its field and pit, once a game", async p => {
      const r = await p.evaluate(() => {
        const L = S.layoutKey, g = (id, t, h, a, f) => ({id, d:"2026-11-12", t, h, a, f, layout:L});
        S.games = [g("t1","09:00","Alpha","Bravo","Field 2 · Pit 1"), g("t2","10:00","Bravo","Charlie",""),
          g("t3","10:30","Test Squad","Alpha","Field 1 · Pit 2"), g("t4","11:00","Alpha","Delta","Field 3"),
          g("t5","11:15","Bravo","Echo","Field 2 · Pit 2"), g("t6","12:00","Test Squad","Bravo","Field 1 · Pit 2")];
        S.runLate = {}; S.myTeam = "Test Squad"; save(S);
        const day = teamDay("Test Squad"), at = t => Date.parse("2026-11-12T" + t);
        const plan = now => scoutPlan(day, at(now)).map(x => [x.g.id, x.for.map(f => f.opp).join("+"), !!x.clash]);
        const early = plan("08:30"), late = plan("11:40");
        const real = Date.now; Date.now = () => at("08:30");
        try { set({ tab:"more", more:"schedule" }); } finally { Date.now = real; }
        const box = document.querySelector(".scout-plan"), text = box ? box.innerText : "";
        return { early, late, text, watch: box ? [...box.querySelectorAll("button")].filter(b => /Watch/.test(b.textContent)).length : 0 };
      });
      // Alpha v Bravo scouts both; Bravo's game with no field still counts; Alpha
      // after you have played them does not; a game about Test Squad never does.
      assert.deepEqual(r.early, [["t1","Alpha+Bravo",false], ["t2","Bravo",true], ["t5","Bravo",true]]);
      assert.deepEqual(r.late, [["t5","Bravo",true]], "games already over drop off");
      assert.match(r.text, /Next: Alpha and Bravo at Thursday 9:00 AM — in 30 min, Field 2 · Pit 1/);
      assert.match(r.text, /Scout Alpha and Bravo/);
      assert.match(r.text, /You play Alpha Thursday 10:30 AM · You play Bravo Thursday 12:00 PM/);
      assert.match(r.text, /Field not printed on the schedule/);
      assert.match(r.text, /Clashes with your 10:30 AM game — send someone/);
      assert.equal(r.watch, 3, "every row has Watch");
      const on = await p.evaluate(() => scoutWhen(gameById("t1"), Date.parse("2026-11-12T09:20")));
      assert.equal(on, "Thursday 9:00 AM — on now", "a game under way says so");
      await p.evaluate(() => { S.games = []; S.myTeam = ""; save(S); });
    });
    await check("the cloud adapter reads a venue's Wi-Fi login page or a server error as no signal, not a refusal", async () => {
      const src = fs.readFileSync(path.resolve(__dirname, "../native/gridlock-cloud.js"), "utf8");
      const run = async res => {
        const data = new Map(), localStorage = { getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
        const sandbox = { window: { GRIDLOCK_CLOUD: { url: "https://example.test", anonKey: "test-only" } }, localStorage, Date, JSON, Promise, TextEncoder, fetch: async () => res };
        vm.runInNewContext(src, sandbox);
        return sandbox.window.gridlockCloud.signIn("a@b.co", "pw");
      };
      const portal = await run({ ok: true, status: 200, text: async () => "<html>Accept the terms</html>" });
      const down = await run({ ok: false, status: 503, text: async () => "<html>down</html>" });
      const refused = await run({ ok: false, status: 400, text: async () => JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }) });
      assert.equal(portal.offline, true, "portal"); assert.equal(down.offline, true, "5xx"); assert.ok(!refused.offline && refused.ok === false, "a real refusal still refuses");
    });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} review checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

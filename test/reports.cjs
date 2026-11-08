"use strict";
/* More › Reports: the season as graphs and as spreadsheets. Every number is a
   count of what was logged on his own sheets; a watched game is never his. */
const assert = require("node:assert/strict"), path = require("node:path"), fs = require("node:fs");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
(async () => {
  let failed = 0, passed = 0;
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  // A small season with known answers. m1 won 4–1 v Rejects, m2 open 1–2 v
  // Dynasty, m3 on another field, m4 a watched game that must never count.
  function season() {
    const b = LAYOUTS.lso.bunkers.map(x => x.id), t = Date.now() - 5 * 86400000;
    S.matches = [
      { id: "m1", at: t, vs: "Rejects", layout: "lso", raceTo: 4, end: "left" },
      { id: "m2", at: t + 86400000, vs: "Dynasty", layout: "lso", raceTo: 4, end: "left" },
      { id: "m3", at: t + 2 * 86400000, vs: "Rejects", layout: "ujt", raceTo: 4, end: "left" },
      { id: "m4", at: t + 3 * 86400000, watch: true, home: "Rejects", away: "Dynasty", layout: "lso", end: "left" },
      { id: "m5", at: t + 4 * 86400000, vs: "=HYPERLINK(\"x\")", layout: "lso", end: "left" }];
    S.matchId = "m2"; S.point = 4;
    S.results = [["m1", 1, "us"], ["m1", 2, "them"], ["m1", 3, "us"], ["m1", 4, "us"], ["m1", 5, "us"],
                 ["m2", 1, "them"], ["m2", 2, "them"], ["m2", 3, "us"], ["m3", 1, "us"], ["m4", 1, "us"], ["m5", 1, "us"]]
      .map(([m, pt, won]) => ({ m, pt, won, at: t + pt }));
    S.results[0].read = "right"; S.results[1].read = "wrong";
    S.calls = [["m1", 1, "snake"], ["m1", 2, "snake"], ["m1", 3, "blitz"], ["m2", 1, "snake"], ["m4", 1, "blitz"]]
      .map(([m, pt, script]) => ({ m, pt, script, layout: "lso", vs: m === "m2" ? "Dynasty" : "Rejects", at: t + pt }));
    S.scout = { ...S.scout, Rejects: { tend: "", threat: 0, players: [], breaks: [
      { m: "m1", pt: 1, script: "blitz", layout: "lso", at: 1, plants: [b[0], b[1], b[2], b[3], b[4]] },
      { m: "m1", pt: 2, script: "blitz", layout: "lso", at: 2, plants: [b[0], b[1], b[2], b[5], b[6]] },
      { m: "m1", pt: 3, script: "snake", layout: "lso", at: 3 },
      { m: "m4", pt: 1, script: "trade", layout: "lso", at: 4 },
      { script: "blitz", layout: "lso", at: 5 }] } };
    const name = S.roster[0].name;
    S.breakouts = [
      { id: "b1", m: "m1", pt: 1, side: "us", player: name, bunker: b[2], alive: true, layout: "lso", vs: "Rejects", at: 1 },
      { id: "b2", m: "m1", pt: 2, side: "us", player: name, bunker: b[2], alive: false, shotFrom: b[8], layout: "lso", vs: "Rejects", at: 2 },
      { id: "b3", m: "m2", pt: 1, side: "us", player: name, bunker: b[3], alive: true, layout: "lso", vs: "Dynasty", at: 3 },
      { id: "b4", m: "m4", pt: 1, side: "us", player: name, bunker: b[3], alive: true, layout: "lso", at: 4 }];
    S.tally = [{ m: "m1", pt: 2, side: "us", name, by: "#7", shotAt: b[2], vs: "Rejects", layout: "lso", script: "snake", at: 5 }];
    S.assessments = [{ m: "m1", pt: 1, who: name, score: 4, at: 1 }];
    S.repAll = false; S.repTab = "team"; S.preview = false;
    save(S); render();
  }
  async function check(name, fn, vp = { width: 390, height: 844 }) {
    const c = await browser.newContext({ viewport: vp, hasTouch: true, serviceWorkers: "block", acceptDownloads: true });
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url);
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, SEED);
      await p.goto(url); await p.waitForFunction(() => typeof S === "object");
      await p.evaluate(season);
      await p.evaluate(() => set({ tab: "more", more: "reports" }));
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  const root = p => p.evaluate(() => document.getElementById("root").innerText);
  const csv = (p, key) => p.evaluate(async k => { let got = null; window.gridlockExportTable = async (text, name) => { got = {text, name}; return {status: "shared"}; };
    await exportReport(k); delete window.gridlockExportTable; return got; }, key);
  const rowsOf = t => t.trim().split("\r\n").map(l => l.split(","));
  try {
    await check("Reports is on the More menu and opens on Your team with the record and the calls", async p => {
      await p.evaluate(() => set({ more: null }));
      assert.match(await root(p), /Reports\s*\n?\s*Graphs and spreadsheets/);
      await p.evaluate(() => set({ more: "reports" }));
      const t = await root(p);
      assert.match(t, /1–0\s*Won–lost/i); assert.match(t, /6–3\s*Points for–against/i, "m1 4–1, m2 1–2, m5 1–0 — m3 is another field, m4 watched");
      assert.match(t, /called 3 · won 1 of 3/, "snake: won m1 pt1, lost m1 pt2 and m2 pt1");
      assert.match(t, /called 1 · won 1 of 1/);
      assert.match(t, /made it 2 of 3 · shot 1/, "his three breaks on his own sheets; the watched one is not his");
      assert.match(t, /your grade 4 \(1\)/);
    });
    await check("Every event reads the sheet on the other field too", async p => {
      await p.getByRole("button", { name: "Every event" }).click();
      assert.match(await root(p), /7–3\s*Points for–against/i);
    });
    await check("Opponent splits their calls by the score from their side, and counts a watched game as their film", async p => {
      await p.evaluate(() => set({ repTab: "opp", repTeam: "Rejects" }));
      const t = await root(p);
      assert.match(t, /ran 3 · won 1 of 2/, "blitz: pt1 lost by them, pt2 won by them, a season row with no sheet");
      assert.match(t, /ahead 0 · level 1 · behind 1 · first point 1/);
      assert.match(t, /ran 1 · won 1 of 1/, "trade on the watched game, where Rejects were the home side and won the point");
      assert.match(t, /Where they plant/i); assert.match(t, /2 of 2 fives/);
      assert.match(t, /#7\s*1 of 1/, "who shot your men");
      const c = rowsOf((await csv(p, "their-calls")).text);
      assert.deepEqual(c[0], ["Team", "Call", "Ran", "Ahead", "Level", "Behind", "First point", "Won", "Decided"]);
      assert.equal(c.length, 4);
    });
    await check("Player reads one man sheet by sheet and shares no grade", async p => {
      await p.evaluate(() => set({ repTab: "player" }));
      const t = await root(p);
      assert.match(t, /Breaks charted/i); assert.match(t, /2 of 3\s*Made it/i);
      const text = await p.evaluate(() => manReportText(repManPicked().name));
      assert.match(text, /3 breaks charted · made it 2 of 3 · shot on the break 1 · out 1/);
      assert.doesNotMatch(text, /grade/i);
      await p.evaluate(() => { window.gridlockShare = () => Promise.resolve("show"); });
      await p.getByRole("button", { name: /report$/ }).click();
      await p.waitForSelector("#handoff-text");
      assert.match(await p.evaluate(() => (document.getElementById("handoff-text") || {}).value || ""), /Counted from what was logged/, "with no share sheet the text is on screen");
    });
    await check("Season draws the points by sheet and the running difference, and exports every point", async p => {
      await p.evaluate(() => set({ repTab: "season" }));
      const t = await root(p);
      assert.match(t, /4–1 · won/); assert.match(t, /1–2 · open/); assert.match(t, /1 of 2\s*Right read/i);
      assert.equal(await p.locator(".rline__path").count(), 1);
      const pts = rowsOf((await csv(p, "points")).text);
      assert.equal(pts.length, 1 + 5 + 3 + 1, "every point of m1, m2 and m5 — not m3 on another field, not the watched m4");
      assert.deepEqual(pts[1].slice(3, 10), ["1", "0", "0", "Snake Stack", "Blitz", "us", "right"]);
      const sh = (await csv(p, "sheets")).text;
      assert.match(sh, /'=HYPERLINK/, "a typed name that looks like a formula is written as text");
      assert.doesNotMatch(sh, /m4|watched/i);
      const bo = rowsOf((await csv(p, "breakouts")).text);
      assert.equal(bo.length, 4); assert.equal(bo[2][7], "shot on the break");
    });
    for(const badDate of [null, "not-a-date", 1e100])
      await check(`an imported sheet with an unreadable date stays usable and exports (${badDate})`, async p => {
        const restored=await p.evaluate(at => {
          const copy=JSON.parse(copyPayload("all"));copy.data.matches[0].at=at;
          return loadCopy("replace",JSON.stringify(copy));
        },badDate);
        assert.equal(restored,true);
        await p.evaluate(() => set({repTab:"season"}));
        assert.match(await root(p),/Date not recorded/);
        const sheets=(await csv(p,"sheets")).text;
        assert.match(sheets,/(?:^|\r\n),Rejects,/);
        assert.doesNotMatch(sheets,/NaN|Invalid Date|1970-01-01/);
        await p.evaluate(() => { S.matchId="m1";window.gridlockExportFile=async(_text,name)=>{window.__sheetName=name;return {status:"shared"};}; });
        await p.evaluate(() => sendSheet());
        assert.match(await p.evaluate(() => __sheetName),/-undated\.json$/);
      });
    await check("in a browser the spreadsheet downloads as a UTF-8 .csv", async p => {
      const [dl] = await Promise.all([p.waitForEvent("download"), p.evaluate(() => exportReport("calls"))]);
      assert.match(dl.suggestedFilename(), /^gridlock-your-calls-\d{4}-\d{2}-\d{2}\.csv$/);
      const buf = fs.readFileSync(await dl.path());
      assert.deepEqual([...buf.slice(0, 3)], [0xef, 0xbb, 0xbf], "byte-order mark for Excel");
      assert.match(buf.toString("utf8"), /Call,Called,Won,Lost,No result\r\nSnake Stack,3,1,2,0/);
    });
    await check("an empty season says what to do, and a list with nothing says so rather than saving an empty file", async p => {
      await p.evaluate(() => { S.matches = [{ id: "z", at: Date.now(), vs: "", layout: "lso" }]; S.matchId = "z"; S.results = []; S.calls = []; S.breakouts = []; S.tally = []; S.assessments = []; S.scout = {}; save(S); render(); });
      for (const tab of ["team", "opp", "player", "season"]) {
        await p.evaluate(t => set({ repTab: t }), tab);
        assert.doesNotMatch(await root(p), /undefined|NaN|\[object/, tab);
      }
      assert.match(await root(p), /No points scored/);
      await p.evaluate(() => exportReport("calls"));
      assert.match(await root(p), /Nothing in that list yet/);
    });
    await check("with Team locked it is a wall that says what it shows", async p => {
      await p.evaluate(() => set({ preview: true }));
      const t = await root(p);
      assert.match(t, /Reports is part of Team/); assert.match(t, /Every list as a spreadsheet/);
      assert.match(t, /Waiting for you: 11 points scored to read/);
    });
    await check("on a 320 px phone nothing runs off the side", async p => {
      for (const tab of ["team", "opp", "player", "season"]) {
        await p.evaluate(t => set({ repTab: t }), tab);
        const over = await p.evaluate(() => { const w = document.documentElement.clientWidth;
          return [...document.querySelectorAll("#root .rchart, #root .rbar, #root .kv__row, #root .btn")].filter(e => e.getBoundingClientRect().right > w + 1).map(e => e.className); });
        assert.deepEqual(over, [], tab);
      }
    }, { width: 320, height: 640 });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} Reports checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

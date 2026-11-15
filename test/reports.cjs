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
    await check("Player counts the points he was on, won and lost, and never from roster order or a watched game", async p => {
      const r = await p.evaluate(() => {
        S.lineups = {}; const a = S.roster[0].name, b = S.roster[1].name, c = S.roster[2].name;
        const charted = repManPoints(a), none = repManPoints(b);
        S.lineups = { "m1|3": [b, c] };   // written on point 3, carried to 4 and 5
        const carried = repManPoints(b), stillA = repManPoints(a);
        set({ repTab: "player", repMan: b });
        return { charted, none, carried, stillA, line: (document.querySelector("#root [data-man-points]") || {}).textContent || "", text: manReportText(b) };
      });
      assert.deepEqual(r.charted, { n: 3, won: 1, lost: 2 }, "charted on m1 pt1, m1 pt2 and m2 pt1; the watched m4 is out");
      assert.deepEqual(r.none, { n: 0, won: 0, lost: 0 }, "no five written and nothing logged says nothing");
      assert.deepEqual(r.carried, { n: 3, won: 3, lost: 0 }, "a written five stands until it is changed");
      assert.deepEqual(r.stillA, { n: 3, won: 1, lost: 2 });
      assert.match(r.line, /3 points played · won 3, lost 0 · \+3 · won 100% \(3 of 3\)/);
      assert.match(r.text, /3 points played · won 3, lost 0/);
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
    await check("Every point includes Scout-only observations without inventing a score", async p => {
      await p.evaluate(() => {
        S.scout.Rejects.breaks.push({m:"m1",pt:9,script:"blitz",layout:"lso",at:9});
        S.arrivalSightings=[{m:"m1",pt:10,team:"Rejects",layout:"lso",at:10}];
        S.arrivalShots=[{m:"m1",pt:11,team:"Rejects",layout:"lso",at:11}];
        S.moves=[{m:"m1",pt:12,at:12}];
        S.assessments.push({m:"m1",pt:13,who:S.roster[0].name,score:4,at:13});
        S.voiceEvents=[{m:"m1",pt:14,at:14}];
        save(S);render();
      });
      const rows=rowsOf((await csv(p,"points")).text).slice(1).filter(r=>r[1]==="Rejects");
      assert.deepEqual(rows.map(r=>Number(r[3])),[1,2,3,4,5,9,10,11,12,13,14]);
      assert.equal(rows.find(r=>r[3]==="9")[7],"Blitz");
      for(const row of rows.filter(r=>Number(r[3])>=9)){
        assert.deepEqual(row.slice(4,6),["4","1"]);
        assert.equal(row[8],"", "an observed point has no invented winner");
      }
    });
    await check("an unscored scouting sheet still offers its spreadsheets", async p => {
      await p.evaluate(() => {
        S.matches=S.matches.filter(m=>m.id==="m1");S.matchId="m1";
        S.results=[];S.calls=[];S.breakouts=[];S.tally=[];S.assessments=[];
        S.scout={Rejects:{breaks:[{m:"m1",pt:1,script:"blitz",layout:"lso",at:1}]}};
        window.gridlockExportTable=async(text,name)=>{window.__csv={text,name};return {status:"shared"};};
        save(S);set({repTab:"season"});
      });
      assert.match(await root(p),/No points scored/);
      await p.getByRole("button",{name:"Every point",exact:true}).click();
      const rows=rowsOf(await p.evaluate(()=>__csv.text));
      assert.equal(rows.length,2);
      assert.deepEqual(rows[1].slice(3,9),["1","0","0","","Blitz",""]);
      assert.equal(await p.locator(".rline__path").count(),0);
    });
    await check("Opponent plants and exported calls use the same team spelling match", async p => {
      await p.evaluate(() => { S.scout.rejects=S.scout.Rejects;delete S.scout.Rejects;set({repTab:"opp",repTeam:"Rejects"}); });
      assert.match(await root(p),/2 of 2 fives/);
      assert.equal(rowsOf((await csv(p,"points")).text)[1][7],"Blitz");
    });
    for(const badDate of [null, "not-a-date", 1e100, 0, -5])
      await check(`an imported undated sheet stays honest in Matches, Reports and exports (${badDate})`, async p => {
        const restored=await p.evaluate(at => {
          const copy=JSON.parse(copyPayload("all"));
          copy.data.matches[0].at=at;copy.data.matches[1].at=at;
          return loadCopy("replace",JSON.stringify(copy));
        },badDate);
        assert.equal(restored,true);
        await p.evaluate(() => set({more:"matches"}));
        const current=p.locator("section.sec").filter({has:p.getByRole("heading",{name:"This match",exact:true})});
        assert.match(await current.locator(".panel > .note").innerText(),/1–2 · Date not recorded ·/,
          "This match must not substitute today, 1970 or Invalid Date");
        const kept=p.locator("section.sec").filter({has:p.getByRole("heading",{name:"Kept",exact:true})});
        for(const label of [/^Rejects.*4–1/,/^Dynasty.*1–2/]){
          const row=kept.locator(".assign").filter({has:p.locator(".assign__job").filter({hasText:label})});
          assert.equal(await row.locator(".assign__who").innerText(),"Date not recorded",
            "both the current and previously kept sheet must keep their date unknown");
        }
        await p.evaluate(() => set({more:"reports"}));
        await p.evaluate(() => set({repTab:"season"}));
        assert.match(await root(p),/Date not recorded/);
        const sheets=(await csv(p,"sheets")).text;
        assert.match(sheets,/(?:^|\r\n),Rejects,/);
        assert.doesNotMatch(sheets,/NaN|Invalid Date|1970-01-01/);
        await p.evaluate(() => { S.matchId="m1";window.gridlockExportFile=async(_text,name)=>{window.__sheetName=name;return {status:"shared"};}; });
        await p.evaluate(() => sendSheet());
        assert.match(await p.evaluate(() => __sheetName),/-undated\.json$/);
      });
    await check("Matches keeps a recorded date and time when a season copy is replaced", async p => {
      const at=Date.UTC(2026,10,3,14,35);
      const restored=await p.evaluate(at => {
        const copy=JSON.parse(copyPayload("all"));
        copy.data.matches[0].at=at;copy.data.matches[1].at=at;
        return loadCopy("replace",JSON.stringify(copy));
      },at);
      assert.equal(restored,true);
      await p.evaluate(() => set({more:"matches"}));
      const expected=await p.evaluate(at => new Date(at).toLocaleString([],
        {weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}),at);
      const current=p.locator("section.sec").filter({has:p.getByRole("heading",{name:"This match",exact:true})});
      assert.ok((await current.locator(".panel > .note").innerText()).includes(expected));
      const kept=p.locator("section.sec").filter({has:p.getByRole("heading",{name:"Kept",exact:true})});
      for(const label of [/^Rejects.*4–1/,/^Dynasty.*1–2/]){
        const row=kept.locator(".assign").filter({has:p.locator(".assign__job").filter({hasText:label})});
        assert.equal(await row.locator(".assign__who").innerText(),expected);
      }
    });
    await check("an imported multiline note counts as one spreadsheet row", async p => {
      for(const note of ['First line\r\nSecond line', 'He said "hold", then\r\n"go"', 'First line\nSecond line']){
        const restored=await p.evaluate(note => {
          const copy=JSON.parse(copyPayload("all"));copy.data.matches[0].note=note;
          return loadCopy("replace",JSON.stringify(copy));
        },note);
        assert.equal(restored,true);
        const sheets=(await csv(p,"sheets")).text;
        assert.ok(sheets.includes('"'+note.replace(/"/g,'""')+'"'),"the note is kept as one quoted cell");
        assert.match(await p.evaluate(()=>S.flash),/Spreadsheet sent · 3 rows\./);
      }
    });
    await check("a downloaded multiline spreadsheet reports its actual number of sheets", async p => {
      await p.evaluate(()=>{S.matches[0].note='Two lines\r\nin one sheet';save(S);});
      const [dl]=await Promise.all([p.waitForEvent("download"),p.evaluate(()=>exportReport("sheets"))]);
      assert.ok(fs.readFileSync(await dl.path(),'utf8').includes('"Two lines\r\nin one sheet"'));
      assert.match(await p.evaluate(()=>S.flash),/ · 3 rows\./);
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

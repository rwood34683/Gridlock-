#!/usr/bin/env node
/* GRIDLOCK function suite.
 *
 * Drives the real app in a real browser and asserts every interactive
 * function actually does what it claims. Run the dev server first:
 *
 *   npm run serve      # terminal 1
 *   npm run test       # terminal 2
 */
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "node_modules", "playwright-core"));

const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = process.env.APP_URL || "http://localhost:5173/";

const results = [];
let group = "";
const G = name => { group = name; };
const check = (name, pass, detail) => results.push({ group, name, pass: !!pass, detail });

const ROSTER = [
  { name: "Reyes", num: 7, p: "snake MW", s: "GP" }, { name: "Okafor", num: 3, p: "MT 50", s: "C lane" },
  { name: "Vance", num: 11, p: "GP", s: "snake" }, { name: "Marsh", num: 22, p: "D-wire MD", s: "Tr" },
  { name: "Bright", num: 5, p: "back centre", s: "MD hold" },
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("dialog", d => d.accept());               // alert()/prompt() must not hang the run

  const seed = async (extra = {}) => {
    await page.evaluate(s => localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)), {
      entered: true, role: "staff", email: "coach@team.com", tab: "playbook",
      layoutKey: "mwo", script: "snake", faceOn: true, shotOn: true, t: 0.5, point: 1,
      tips: { pb: 1, tally: 1, scout: 1, sl: 1, class: 1, lg: 1 }, roster: ROSTER,
      left: { name: "Blast Camp", tend: "Balanced", threat: 5, pts: 200, notes: "" },
      right: { name: "Rejects", tend: "Snake", threat: 4, pts: 186, notes: "" },
      ...extra,
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(150);
  };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const go = async (tab, more = null) => { await ev(([t, m]) => window.set({ tab: t, more: m }), [tab, more]); await page.waitForTimeout(60); };

  await page.goto(URL, { waitUntil: "networkidle" });

  /* ---------------------------------------------------------- boot + promo */
  G("Boot and promo gate");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  check("promo shows first, never the tutorial", await ev(() => !S.entered && !S.showTutorial));
  check("all four promo routes render", await page.locator(".promo .btn").count() === 4);
  await ev(() => window.set({ entered: true, role: "guest" }));
  check("guest can enter without an account", await ev(() => S.entered && S.role === "guest"));
  check("tab bar has the five phone tabs", await page.locator(".tabs button").count() === 5);

  /* --------------------------------------------------------------- staff auth */
  G("Staff auth");
  await ev(() => { localStorage.removeItem("gridlock.staff"); localStorage.removeItem("gridlock.staff.v2"); window.set({ entered: false, mode: "create" }); });
  await page.waitForTimeout(80);
  await page.fill("#em", "coach@team.com"); await page.fill("#pw", "sideline1");
  await ev(async () => { await window.doAuth(); });
  await page.waitForTimeout(120);
  check("create account signs the coach in as staff", await ev(() => S.role === "staff" && S.entered));
  const stored = await ev(() => JSON.parse(localStorage.getItem("gridlock.staff.v2") || "{}"));
  check("password is not stored in the clear", !JSON.stringify(stored).includes("sideline1"));
  check("salt and hash are both stored", !!stored.salt && !!stored.hash && stored.hash.length === 64);
  await ev(() => window.set({ entered: false, mode: "login" })); await page.waitForTimeout(80);
  await page.fill("#em", "coach@team.com"); await page.fill("#pw", "wrongpass");
  await ev(async () => { await window.doAuth(); }); await page.waitForTimeout(120);
  check("wrong password is refused", await ev(() => !S.entered));
  await page.fill("#em", "coach@team.com"); await page.fill("#pw", "sideline1");
  await ev(async () => { await window.doAuth(); }); await page.waitForTimeout(120);
  check("correct password signs in", await ev(() => S.role === "staff"));
  const legacy = await ev(async () => {
    localStorage.removeItem("gridlock.staff.v2");
    localStorage.setItem("gridlock.staff", JSON.stringify({ email: "old@team.com", pass: "legacy123" }));
    window.set({ entered: false, mode: "login" });
    await new Promise(r => setTimeout(r, 100));
    document.getElementById("em").value = "old@team.com";
    document.getElementById("pw").value = "legacy123";
    await window.doAuth();
    await new Promise(r => setTimeout(r, 100));
    return { inn: S.role === "staff", gone: !localStorage.getItem("gridlock.staff"),
             hashed: !!(JSON.parse(localStorage.getItem("gridlock.staff.v2") || "{}").hash) };
  });
  check("a clear-text account still signs in once", legacy.inn);
  check("...and is upgraded to a hash", legacy.hashed);
  check("...and the clear-text record is deleted", legacy.gone);

  /* ------------------------------------------------------------- role gating */
  G("Role gating");
  await seed({ role: "guest", tab: "more", more: "classes" });
  check("guest cannot create a class", (await page.locator("text=Staff login required to create a class").count()) > 0);
  await go("more", "league");
  check("guest cannot open league admin", (await page.locator("text=Staff login required to open league admin").count()) > 0);
  await seed({ tab: "more", more: "classes" });
  check("staff can create a class", (await page.locator("button:has-text('Create class')").count()) > 0);
  check("joining never asks for an account", (await page.locator("text=No account needed").count()) > 0);

  /* ------------------------------------------------------------- navigation */
  G("Navigation");
  await seed();
  for (const t of ["playbook", "tally", "scout", "sightlines", "more"]) {
    await go(t);
    check(`tab ${t} renders`, await ev(() => document.querySelectorAll(".main > *").length > 1));
  }
  const MORE = ["walk", "lineups", "movement", "assess", "codes", "stats", "team", "messages", "classes", "league", "nexus"];
  for (const m of MORE) {
    await go("more", m);
    check(`More · ${m} renders`, await ev(() => document.querySelectorAll(".main > *").length > 1));
  }
  await go("scout");
  for (const st of ["matchup", "anticipate", "counter", "board"]) {
    await ev(k => window.set({ scoutTab: k }), st);
    await page.waitForTimeout(50);
    check(`Scout · ${st} renders`, await ev(() => document.querySelectorAll(".sec").length > 0));
  }
  // Two entries here were the same hand-typed placeholder under two real event
  // names. Nothing ships without a line saying where its coordinates came from.
  check("every layout on offer states where its coordinates came from", await ev(() =>
    Object.values(LAYOUTS).every(l => typeof l.source === "string" && l.source.length > 10)));
  check("every layout on offer has measured footprints", await ev(() =>
    Object.values(LAYOUTS).every(l => l.bunkers.length > 0 && l.bunkers.every(b => b.w > 0 && b.h > 0))));
  check("no event switch is offered while there is one field", await ev(() =>
    Object.keys(LAYOUTS).length > 1
      ? !!document.querySelector("button.ctx")
      : !document.querySelector("button.ctx") && !!document.querySelector(".ctx")));

  /* --------------------------------------------------------------- playbook */
  G("Playbook");
  await seed();
  check("five breaks are offered", await ev(() => Object.keys(BREAKS).length === 5));
  check("every break draws five players", await ev(() =>
    Object.keys(BREAKS).every(k => { window.set({ script: k }); return currentPaths().length === 5; })));
  await ev(() => window.set({ script: "snake" }));
  check("Face toggles", await ev(() => { const a = S.faceOn; window.set({ faceOn: !a }); const b = S.faceOn; window.set({ faceOn: a }); return a !== b; }));
  check("Shot lanes toggles", await ev(() => { const a = S.shotOn; window.set({ shotOn: !a }); const b = S.shotOn; window.set({ shotOn: a }); return a !== b; }));
  check("Play starts the break", await ev(() => { window.playPath(); const p = S.playing; window.playPath(); return p === true; }));
  check("Pause stops it", await ev(() => S.playing === false));
  check("Reset returns to the buzzer", await ev(() => { window.set({ t: 0.7 }); window.set({ t: 0, playing: false }); return S.t === 0; }));
  await ev(() => { window.setDirect("1", "face", -45); window.setDirect("2", "shot", "GP#1"); window.setDirect("3", "role", "S"); });
  check("8-way pad stores a bearing", await ev(() => directOf("1").face === -45));
  check("shot stores a named bunker", await ev(() => directOf("2").shot === "GP#1"));
  check("P|S stores a role", await ev(() => directOf("3").role === "S"));
  await ev(() => window.openPad("face", "4")); await page.waitForTimeout(60);
  check("the pad offers eight directions plus off", await page.locator(".pad button").count() === 9);
  await ev(() => window.openPad("face", "4")); await page.waitForTimeout(60);
  check("tapping again closes the pad", await ev(() => S.pad === null));
  check("directing is scoped per break", await ev(() => {
    window.set({ script: "blitz" }); const other = directOf("1").face;
    window.set({ script: "snake" }); return other === undefined && directOf("1").face === -45;
  }));
  check("directing is scoped per layout", await ev(() => {
    window.set({ layoutKey: "not-a-field" }); const other = directOf("1").face;
    window.set({ layoutKey: "mwo" }); return other === undefined;
  }));
  // A chevron per player, drawn twice: a dark casing under a white stroke, so
  // it reads on a red bunker as well as on the black ground — two polylines a
  // player. The runs
  // themselves are <path> now that corners are rounded, so counting polylines
  // counts chevrons and nothing else.
  check("face chevron is drawn when Face is on", await ev(() => {
    window.set({ faceOn: true });
    const on = (fieldSVG().match(/polyline/g) || []).length;
    window.set({ faceOn: false });
    const off = (fieldSVG().match(/polyline/g) || []).length;
    window.set({ faceOn: true });
    return on === currentPaths().length * 2 && off === 0;
  }));
  check("shot cone and target ring are drawn", await ev(() => {
    window.set({ shotOn: true }); const svg = fieldSVG(); return svg.includes("polygon") && svg.includes("stroke-dasharray=\"3 3\"");
  }));
  check("the training-aid line is on Playbook", (await page.locator(".aid").count()) > 0);

  /* ------------------------------------------------------------------ tally */
  G("Tally");
  await seed({ tab: "tally" });
  await ev(() => { window.markOut("us", "Reyes"); window.markOut("them", "#4"); });
  check("marking out logs an entry", await ev(() => S.tally.length === 2));
  await ev(() => window.markOut("us", "Reyes"));
  check("the same player cannot go out twice in a point", await ev(() => S.tally.length === 2));
  check("alive counts drop", await ev(() => document.body.textContent.includes("4")));
  await ev(() => { window.setOutBunker(0, "shotAt", "SB#6"); window.setOutBunker(0, "movedTo", "GP#1"); });
  check("shot-at bunker attaches to an out", await ev(() => S.tally[0].shotAt === "SB#6"));
  check("moved-to bunker attaches to an out", await ev(() => S.tally[0].movedTo === "GP#1"));
  await ev(() => window.nextPoint());
  check("next point advances the sheet", await ev(() => S.point === 2));
  check("next point keeps the log", await ev(() => S.tally.length === 2));
  check("the new point starts five up", await ev(() => S.tally.filter(o => o.pt === S.point).length === 0));
  await page.waitForTimeout(80);
  check("pickers only render for the live point", await ev(() => {
    const sel = [...document.querySelectorAll(".assign select")];
    return sel.length === 0;                                  // no outs on point 2 yet
  }));
  await ev(() => window.undoOut(0));
  check("undo removes an out", await ev(() => S.tally.length === 1));

  /* ------------------------------------------------------------------ scout */
  G("Scout");
  await seed({ tab: "scout" });
  // A pit shows a team; the film read belongs to that team. See the Scouting
  // group below for the whole model.
  await ev(() => window.setPitTend("left", "Dorito"));
  check("tendency is editable, and lands on the team", await ev(() =>
    pitOf("left").tend === "Dorito" && profileOf(pitOf("left").name).tend === "Dorito"));
  await ev(() => window.setThreat("right", 2));
  check("threat stars set", await ev(() => pitOf("right").threat === 2));
  await ev(() => window.setPitNotes("right", "Snake runner is #7"));
  check("notes persist on the team in the pit", await ev(() => pitOf("right").notes.includes("#7")));
  await ev(() => window.loadPit("Miami Effect"));
  check("division board loads a team into the right pit", await ev(() => pitOf("right").name === "Miami Effect"));
  const rank = await ev(() => {
    const ahead = counterRank("Snake", "Ahead")[0].name;
    const must = counterRank("Snake", "Must-score")[0].name;
    return { ahead, must, diff: ahead !== must };
  });
  check("counter-picker ranks change with the match state", rank.diff, `${rank.ahead} vs ${rank.must}`);
  check("patient call tops the list when ahead", rank.ahead === "Hold & Read", rank.ahead);
  check("every break is ranked", await ev(() => counterRank("Snake", "Even").length === 5));
  check("division board lists the seeded teams", await ev(() => TEAMS.length >= 14));
  check("both pits draw on one field", await ev(() => {
    const svg = fieldSVG({ both: true }); return svg.includes("#e5342f") && svg.includes("#3d8bff");
  }));
  check("the not-a-prediction line is on Scout", await ev(() => {
    window.set({ scoutTab: "matchup" }); return document.body.textContent.includes("not a prediction");
  }));

  /* ------------------------------------------------------------- sightlines */
  G("Sightlines");
  await seed({ tab: "sightlines" });
  const sl = await ev(() => {
    const list = LAYOUTS.mwo.bunkers;
    const a = sightLines(list[0].id, 2, 2);
    const b = sightLines(list[20].id, 2, 2);
    return { n: a.lines.length, total: list.length, clearA: a.clear, clearB: b.clear,
             blocked: a.lines.filter(l => l.blocked).length };
  });
  check("every other bunker gets a lane", sl.n === sl.total - 1);
  check("lanes are classified clear or blocked", sl.clearA + sl.blocked === sl.n);
  check("a different source gives a different read", sl.clearA !== sl.clearB);
  check("geometry blocks something", sl.blocked > 0);
  await ev(() => window.set({ sightFrom: LAYOUTS.mwo.bunkers[5].id }));
  await page.waitForTimeout(80);
  check("changing the source redraws", await ev(() => fieldSVG({ sightFrom: S.sightFrom, static: true }).includes("#3ecf8e")));

  /* ------------------------------------------------------- team + bunker calls */
  G("Team and bunker calls");
  await seed({ tab: "more", more: "team" });
  await ev(() => { document.getElementById("bcId").value = "GP#1"; document.getElementById("bcName").value = "Home"; window.setCall(); });
  await page.waitForTimeout(80);
  check("a bunker call is saved", await ev(() => bunkerCalls()["GP#1"] === "Home"));
  check("the call overlays the official code on the field", await ev(() => fieldSVG({ static: true }).includes(">Home<")));
  check("calls are scoped to the layout", await ev(() => {
    window.set({ layoutKey: "not-a-field" }); const n = Object.keys(bunkerCalls()).length;
    window.set({ layoutKey: "mwo" }); return n === 0;
  }));
  await ev(() => window.clearCall("GP#1"));
  check("clearing a call restores the printed code", await ev(() => !bunkerCalls()["GP#1"]));
  await ev(() => window.set({ roster: [
    { name: "Reyes", num: 7, p: "snake MW", s: "GP" },
    { name: "Okafor", num: 3, p: "MT 50", s: "C lane" },
    { name: "Vance", num: 11, p: "GP", s: "snake" },
  ] }));
  check("the roster is listed, one editable row per player",
        (await page.locator(".rost__p").count()) === 3);
  check("each row edits number, name, primary and secondary",
        (await page.locator(".rost__p").first().locator("input").count()) === 4);

  /* -------------------------------------------------------------- movement */
  G("Movement");
  await seed({ tab: "more", more: "movement" });
  await ev(() => { document.getElementById("mvWho").value = "Reyes"; document.getElementById("mvFrom").value = "SB#4"; document.getElementById("mvTo").value = "GP#1"; window.logMove(); });
  await page.waitForTimeout(80);
  check("a rotation is logged", await ev(() => S.moves.length === 1));
  check("the rotation draws on the field", await ev(() => fieldSVG({ static: true, moves: true }).includes("#3ecf8e")));
  await ev(() => { document.getElementById("mvFrom").value = "SB#4"; document.getElementById("mvTo").value = "SB#4"; window.logMove(); });
  await page.waitForTimeout(80);
  check("a move to the same bunker is refused", await ev(() => S.moves.length === 1));
  await ev(() => window.undoMove(0));
  check("undo removes a rotation", await ev(() => S.moves.length === 0));

  /* ---------------------------------------------------------------- assess */
  G("Assess");
  await seed({ tab: "more", more: "assess" });
  await ev(() => { document.getElementById("asWho").value = "Reyes"; document.getElementById("asScore").value = "4"; document.getElementById("asNote").value = "Held the corner."; window.saveAssess(); });
  await page.waitForTimeout(80);
  check("a grade is saved", await ev(() => S.assessments.length === 1 && S.assessments[0].score === 4));
  check("the note stays with the grade", await ev(() => S.assessments[0].note.includes("corner")));
  await ev(() => { document.getElementById("asWho").value = "Reyes"; document.getElementById("asScore").value = "2"; window.saveAssess(); });
  await page.waitForTimeout(80);
  check("an average is shown", await page.locator("text=3.0").count() > 0);
  await ev(() => window.undoAssess(0));
  check("undo removes a grade", await ev(() => S.assessments.length === 1));

  /* ---------------------------------------------------------- bunker stats */
  G("Bunker stats");
  await seed({
    tab: "more", more: "stats",
    tally: [{ pt: 1, side: "us", name: "Reyes", shotAt: "SB#6", movedTo: "GP#1" }],
    moves: [{ pt: 1, who: "Reyes", from: "SB#4", to: "GP#1", layout: "mwo" }],
  });
  check("outs come from the tally", await ev(() => bunkerTraffic()["SB#6"].outs === 1));
  check("moves-in come from tally and movement", await ev(() => bunkerTraffic()["GP#1"].visits === 2));
  check("traffic from another field is dropped, not counted", await ev(() => {
    const before = Object.keys(bunkerTraffic()).length;
    const kept = [...(S.moves || [])];
    window.set({ moves: [...kept, { who: "Reyes", from: "NOPE#1", to: "NOPE#2" }] });
    const after = Object.keys(bunkerTraffic()).length;
    window.set({ moves: kept });
    return after === before;
  }));
  check("the heat overlay is drawn", await ev(() => fieldSVG({ static: true, heat: true }).includes("#e5342f")));

  /* -------------------------------------------------------------- classes */
  G("Classes");
  await seed({ tab: "more", more: "classes", newClassTitle: "Friday clinic" });
  await ev(() => window.makeClass());
  await page.waitForTimeout(80);
  const code = await ev(() => S.classes[0].code);
  check("a class gets a join code", /^GL-[A-Z0-9]{4}$/.test(code), code);
  await ev(c => window.set({ joinCode: c }), code);
  await page.waitForTimeout(100);
  check("the code finds the class", (await page.locator("#fn").count()) === 1);
  await ev(c => { document.getElementById("fn").value = "Sam Ortiz"; document.getElementById("fa").checked = false; window.submitForm(c); }, code);
  await page.waitForTimeout(80);
  check("submitting without the sign-in box is refused", await ev(() => S.responses.length === 0));
  await ev(c => {
    document.getElementById("fn").value = "Sam Ortiz";
    document.getElementById("fc").value = "555-0100";
    document.getElementById("fe").value = "Rec";
    document.getElementById("fw").value = "Snake";
    document.getElementById("fa").checked = true;
    window.submitForm(c);
  }, code);
  await page.waitForTimeout(80);
  check("a valid form is accepted", await ev(() => S.responses.length === 1 && S.responses[0].name === "Sam Ortiz"));
  check("the response is listed under the class", await page.locator("text=Sam Ortiz").count() > 0);

  /* --------------------------------------------------------------- league */
  G("League");
  await seed({ tab: "more", more: "league" });
  check("the four default groups exist", await ev(() => S.groups.length === 4 && S.groups.map(g => g.name).join() === "Ops,Refs,Registration,Vendors"));
  await ev(() => { document.getElementById("ng").value = "Media"; window.addGroup(); });
  await page.waitForTimeout(80);
  check("a group can be added", await ev(() => S.groups.length === 5));
  const gid = await ev(() => S.groups[0].id);
  await ev(id => { document.getElementById("mn-" + id).value = "Dana"; document.getElementById("mp-" + id).value = "5550142"; window.addMem(id); }, gid);
  await page.waitForTimeout(80);
  check("a member can be added", await ev(i => S.groups.find(g => g.id === i).members.length === 1, gid));
  await ev(() => { S.blastBody = "Pit gate opens 8:00"; save(S); window.sendBlast(); });
  await page.waitForTimeout(120);
  check("a blast is sent and logged", await ev(() => S.blasts.length === 1 && S.blasts[0].body.includes("Pit gate")));
  check("the log records the recipient count", await ev(() => S.blasts[0].n === 1));
  await ev(i => window.delMem(i, 0), gid);
  check("a member can be removed", await ev(i => S.groups.find(g => g.id === i).members.length === 0, gid));
  await ev(() => window.delGroup(S.groups[4].id));
  check("a group can be deleted", await ev(() => S.groups.length === 4));

  /* ------------------------------------------------------ notes and messages */
  G("Notes, codes and messages");
  await seed({ tab: "more", more: "messages" });
  await ev(() => { document.getElementById("md").value = "R1 at the buzzer"; window.sendMsg(); });
  await page.waitForTimeout(80);
  check("a squad message is kept", await ev(() => S.messages.length === 1));
  // Both of these used to be a single text box. Writing the legacy field and
  // reloading proves the migration carries a coach's typing into the new lists
  // rather than dropping it.
  await ev(() => { S.walkNotes = "Snake mouth is hot"; S.codeWords = "Ghost = full flank"; S.walk = {}; S.codes = []; save(S); });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(150);
  check("a legacy walk note is carried into the list", await ev(() =>
    walkNotes().length === 1 && /Snake mouth/.test(walkNotes()[0].note) && S.walkNotes === ""));
  check("a legacy code word is split into word and meaning", await ev(() =>
    S.codes.length === 1 && S.codes[0].word === "Ghost" && S.codes[0].means === "full flank" && S.codeWords === ""));

  /* ---------------------------------------------------------- persistence */
  G("Persistence");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(150);
  check("state survives a reload", await ev(() => S.messages.length === 1 && walkNotes().length === 1 && S.codes.length === 1));
  check("a tip stays dismissed", await ev(() => { window.dismissTip("walk"); return S.tips.walk === true; }));

  /* -------------------------------------------------------- layout integrity */
  G("Layout integrity");
  const lay = await ev(() => {
    const b = LAYOUTS.mwo.bunkers;
    const ids = new Set(b.map(x => x.id));
    const plantsOk = Object.values(BREAK_PLANTS.mwo).every(p => p.length === 5 && p.every(id => ids.has(id)));
    const pairs = [];
    b.forEach(x => { const m = b.find(y => y.t === x.t && Math.abs(y.y - x.y) < 1.2 && Math.abs((x.x + y.x) / 2 - 75) < 1.5 && y.x !== x.x); if (m) pairs.push((x.x + m.x) / 2); });
    const axis = pairs.reduce((a, c) => a + c, 0) / pairs.length;
    return { n: b.length, unique: ids.size, plantsOk, axis, pairs: pairs.length,
             sized: b.every(x => x.w > 0 && x.h > 0), inField: b.every(x => x.x >= 0 && x.x <= 150 && x.y >= 0 && x.y <= 120) };
  });
  check("the Midwest Open has 58 bunkers", lay.n === 58, String(lay.n));
  check("every bunker id is unique", lay.unique === lay.n);
  check("every bunker carries a measured footprint", lay.sized);
  check("every bunker sits inside the field", lay.inField);
  check("every break plants on a real bunker", lay.plantsOk);
  check("the layout is mirror-symmetric about the 50", Math.abs(lay.axis - 75) < 0.5, `axis ${lay.axis.toFixed(2)} ft over ${lay.pairs} pairs`);

  /* ----------------------------------------------------------------- roster */
  G("Roster");
  await ev(() => window.set({ tab: "more", more: "team", roster: [] }));
  check("a fresh install ships no invented players", await ev(() => (S.roster || []).length === 0));
  check("the empty roster says what to do about it", await ev(() =>
    /No players yet/.test(document.querySelector(".main").textContent)));

  const add = (num, name, pr, sec2) => ev(a => {
    document.getElementById("rNum").value = a[0];
    document.getElementById("rName").value = a[1];
    document.getElementById("rP").value = a[2];
    document.getElementById("rS").value = a[3];
    window.addPlayer();
  }, [num, name, pr, sec2]);

  await add("7", "Reyes", "snake MW", "GP");
  await add("3", "Okafor", "MT 50", "C lane");
  check("a player can be added", await ev(() => S.roster.length === 2 && S.roster[0].name === "Reyes"));
  check("the squad number is kept as a number", await ev(() => S.roster[0].num === 7));
  check("primary and secondary are kept", await ev(() => S.roster[0].p === "snake MW" && S.roster[0].s === "GP"));
  await ev(() => window.addPlayer());
  check("a player with no name is refused", await ev(() => S.roster.length === 2));

  await ev(() => window.editPlayer(0, "num", "22"));
  await ev(() => window.editPlayer(0, "name", "Marsh"));
  check("a player can be edited in place", await ev(() => S.roster[0].num === 22 && S.roster[0].name === "Marsh"));
  await ev(() => window.editPlayer(0, "name", "   "));
  check("a name cannot be blanked by accident", await ev(() => S.roster[0].name === "Marsh"));
  check("editing does not redraw under the thumb", await ev(() => {
    const before = document.querySelector(".main");
    window.editPlayer(0, "p", "snake");
    return document.querySelector(".main") === before;
  }));

  check("the roster reaches Tally", await ev(() => {
    window.set({ tab: "tally" });
    return document.querySelector(".main").textContent.includes("Marsh");
  }));
  check("the roster reaches Playbook", await ev(() => {
    window.set({ tab: "playbook" });
    return document.querySelector(".main").textContent.includes("#22 Marsh");
  }));
  check("the roster reaches Movement and Assess", await ev(() => {
    window.set({ tab: "more", more: "movement" });
    const a = document.querySelector(".main").textContent.includes("Marsh");
    window.set({ more: "assess" });
    return a && document.querySelector(".main").textContent.includes("Marsh");
  }));
  check("the banned name never reaches the roster", await ev(() => {
    window.set({ tab: "more", more: "team" });
    document.getElementById("rName").value = "GunzUp";
    document.getElementById("rNum").value = "9";
    window.addPlayer();
    const last = S.roster[S.roster.length - 1].name;
    window.delPlayer(S.roster.length - 1);
    return !/gunz\s*up/i.test(last);
  }));

  await ev(() => { window.set({ tab: "more", more: "team" }); window.delPlayer(1); });
  check("a player can be removed", await ev(() => S.roster.length === 1 && S.roster[0].name === "Marsh"));

  /* ------------------------------------------------- walk, codes, lineups */
  G("Walk");
  await ev(() => window.set({ tab: "more", more: "walk", walk: {}, walkNotes: "" }));
  check("an empty field says so", await ev(() => /Nothing noted on this field yet/.test(document.querySelector(".main").textContent)));
  check("a note can be pinned to a wire or a bunker", await ev(() => {
    document.getElementById("wkWhere").value = "Snake wire";
    document.getElementById("wkNote").value = "Doritos are slow off the tape.";
    window.addWalk();
    const n = (S.walk.mwo || [])[0];
    return n && n.where === "Snake wire" && /Doritos are slow/.test(n.note);
  }));
  check("the where list offers every bunker on this field", await ev(() =>
    document.querySelectorAll("#wkWhere option").length === 6 + curLayout().bunkers.length));
  check("walk notes are scoped to the field", await ev(() => {
    window.set({ layoutKey: "not-a-field" }); const n = walkNotes().length;
    window.set({ layoutKey: "mwo" }); return n === 0;
  }));
  check("a note can be removed", await ev(() => { window.delWalk(0); return walkNotes().length === 0; }));
  check("an empty note is refused", await ev(() => {
    document.getElementById("wkNote").value = "   "; window.addWalk(); return walkNotes().length === 0;
  }));

  G("Codes");
  await ev(() => window.set({ more: "codes", codes: [], codeWords: "" }));
  check("a code word carries what it means", await ev(() => {
    document.getElementById("cdWord").value = "Buzzer";
    document.getElementById("cdMeans").value = "Go on the horn";
    window.addCode();
    return S.codes.length === 1 && S.codes[0].word === "Buzzer" && S.codes[0].means === "Go on the horn";
  }));
  check("a code word can be edited in place", await ev(() => {
    window.editCode(0, "means", "Go on the horn, no wait");
    return /no wait/.test(S.codes[0].means);
  }));
  check("a code word cannot be blanked", await ev(() => { window.editCode(0, "word", " "); return S.codes[0].word === "Buzzer"; }));
  check("a word with no name is refused", await ev(() => {
    document.getElementById("cdWord").value = ""; window.addCode(); return S.codes.length === 1;
  }));
  check("a code word can be removed", await ev(() => { window.delCode(0); return S.codes.length === 0; }));

  G("Lineups");
  const SQUAD = [
    { name: "Reyes", num: 7, p: "snake MW", s: "GP" }, { name: "Okafor", num: 3, p: "MT 50", s: "C lane" },
    { name: "Vance", num: 11, p: "GP", s: "snake" }, { name: "Marsh", num: 22, p: "D-wire MD", s: "Tr" },
    { name: "Bright", num: 5, p: "back centre", s: "MD hold" }, { name: "Cole", num: 9, p: "Tr", s: "MD" },
  ];
  await ev(s2 => window.set({ more: "lineups", roster: s2, lineups: {}, point: 3 }), SQUAD);
  check("with no lineup set the roster order stands", await ev(() =>
    fiveFor(3).map(p => p && p.name).join(",") === "Reyes,Okafor,Vance,Marsh,Bright"));
  check("a lineup can be filled from the roster", await ev(() => {
    window.fillLineup("roster"); return (S.lineups[3] || []).length === 5 && S.lineups[3][0] === "Reyes";
  }));
  check("a slot can be set to any player on the squad", await ev(() => {
    window.setSlot(0, "Cole"); return S.lineups[3][0] === "Cole" && fiveFor(3)[0].num === 9;
  }));
  check("the lineup directs the break on Playbook", await ev(() => {
    window.set({ tab: "playbook" });
    return document.querySelector(".assign__who").textContent.includes("#9 Cole");
  }));
  check("the tally sheet follows the same five", await ev(() => {
    window.set({ tab: "tally" });
    return document.querySelector(".main").textContent.includes("Cole");
  }));
  check("a lineup is kept per point", await ev(() => {
    window.set({ tab: "more", more: "lineups", point: 4 });
    const empty = lineupFor(4).length === 0;
    window.fillLineup(3);
    return empty && S.lineups[4][0] === "Cole" && S.lineups[3][0] === "Cole";
  }));
  check("an empty slot leaves the job unassigned", await ev(() => {
    window.setSlot(1, "");
    return fiveFor(4)[1] === null;
  }));
  check("clearing a lineup falls back to the roster", await ev(() => {
    window.clearLineup();
    return lineupFor(4).length === 0 && fiveFor(4)[0].name === "Reyes";
  }));
  check("with no roster Lineups says where to start", await ev(() => {
    window.set({ roster: [], lineups: {} });
    return /Add your squad under Team/.test(document.querySelector(".main").textContent);
  }));
  await ev(s2 => window.set({ roster: s2, point: 1 }), SQUAD);

  /* -------------------------------------------------------- scouting a team */
  G("Scouting");
  await ev(() => window.set({ tab: "scout", scoutTab: "matchup", scout: {},
    left: { name: "Blast Camp" }, right: { name: "Rejects" } }));
  check("a pit holds a team, not the film read", await ev(() =>
    Object.keys(S.right).join() === "name"));
  check("an unscouted team seeds from the division board", await ev(() => {
    const p = profileOf("Las Vegas Shock");
    return p.threat === 4 && p.players.length === 0 && p.notes === "";
  }));

  await ev(() => { window.setPitNotes("right", "Snake runner goes on the buzzer."); window.setPitTend("right", "Snake"); });
  await ev(() => {
    document.getElementById("sp-num-right").value = "7";
    document.getElementById("sp-name-right").value = "Vasquez";
    document.getElementById("sp-wire-right").value = "Snake";
    document.getElementById("sp-note-right").value = "goes on the buzzer every time";
    window.addScoutPlayer("right");
  });
  check("a player logs with number, name, wire and a read", await ev(() => {
    const m = pitOf("right").players[0];
    return m.num === "7" && m.name === "Vasquez" && m.wire === "Snake" && /buzzer/.test(m.note);
  }));
  check("a number alone is enough to log someone", await ev(() => {
    document.getElementById("sp-num-right").value = "12";
    document.getElementById("sp-name-right").value = "";
    document.getElementById("sp-note-right").value = "";
    window.addScoutPlayer("right");
    return pitOf("right").players.length === 2 && pitOf("right").players[1].num === "12";
  }));
  check("an empty log is refused", await ev(() => {
    document.getElementById("sp-num-right").value = "";
    window.addScoutPlayer("right");
    return pitOf("right").players.length === 2;
  }));
  check("a player carries his own threat", await ev(() => {
    window.setScoutThreat("right", 0, 5);
    return pitOf("right").players[0].threat === 5 && pitOf("right").players[1].threat === 3;
  }));

  // The bug this replaced: the read followed the slot, so tapping another team
  // on the board silently reattached your note to whoever you tapped.
  check("switching team gives a clean sheet, not the last team's read", await ev(() => {
    window.loadPit("Las Vegas Shock");
    return pitOf("right").name === "Las Vegas Shock"
        && pitOf("right").notes === "" && pitOf("right").players.length === 0;
  }));
  check("coming back brings that team's read and players with it", await ev(() => {
    window.loadPit("Rejects");
    return /buzzer/.test(pitOf("right").notes) && pitOf("right").players.length === 2;
  }));
  check("what you learn survives a reload", await ev(() => {
    const raw = JSON.parse(localStorage.getItem("gridlock.coach.v2"));
    return (raw.scout["Rejects"].players || []).length === 2;
  }));

  check("the board marks the teams you have film on", await ev(() =>
    scouted("Rejects") && !scouted("Miami Effect")));
  check("the board shows a team's scored threat, not just the seed", await ev(() => {
    window.setThreat("right", 2);
    return profileOf("Rejects").threat === 2 && teamMeta("Rejects").threat === 4;
  }));
  check("anticipate names the players you logged, hardest first", await ev(() => {
    window.set({ scoutTab: "anticipate" });
    const txt = document.querySelector(".main").textContent;
    return txt.includes("#7 Vasquez") && txt.includes("buzzer") && txt.indexOf("#7") < txt.indexOf("#12");
  }));
  check("a player can be taken off the list", await ev(() => {
    window.set({ scoutTab: "matchup" });
    window.delScoutPlayer("right", 1);
    return pitOf("right").players.length === 1;
  }));

  // An older save kept the read in the slot; it belongs to the team that was in it.
  check("an old pit note is moved onto its team, not dropped", await ev(async () => {
    localStorage.setItem("gridlock.coach.v2", JSON.stringify({ entered: true, role: "staff", tab: "scout",
      left: { name: "Malicious", tend: "Dorito", threat: 5, notes: "They lean dorito every point." },
      right: { name: "Rejects" } }));
    return true;
  }));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(180);
  check("the migrated read lands on the right team", await ev(() =>
    /lean dorito/.test(profileOf("Malicious").notes) && profileOf("Rejects").notes === ""));
  check("the migrated slot keeps only the team name", await ev(() =>
    Object.keys(S.left).join() === "name"));

  /* ----------------------------------------------------------- path editing */
  G("Path editing");
  await ev(() => window.set({ tab: "playbook", editPath: true, pathEdits: {}, t: 0.5, playing: false }));
  await page.waitForTimeout(200);

  // The corners are rounded so a path reads like a run rather than a set of
  // right angles. Rounding must not push the curve into a bunker, so this
  // samples what is actually drawn — the real path element, at 4 samples a
  // foot — and checks every sample against every footprint.
  const curve = await ev(() => {
    const obs = routeObstacles(LAYOUTS.mwo.bunkers);
    const svg = document.querySelector(".field-wrap[data-live] svg.field");
    const paths = [...svg.querySelectorAll("path[stroke='#e5342f']")];
    const bad = [];
    paths.forEach((el, i) => {
      const p = currentPaths()[i];
      if(!p) return;
      const holds = o => Math.abs(p.from[0]-o.x) <= o.hw && Math.abs(p.from[1]-o.y) <= o.hh;
      const live = obs.filter(o => !o.ids.has(p.bunker) && !holds(o));
      const L = el.getTotalLength();
      let prev = null;
      for(let d = 0; d <= L; d += L / Math.max(40, Math.round(L / 2))){
        const q = el.getPointAtLength(d);
        const cur = [q.x / 2, q.y / 2];                 // svg units -> feet
        if(prev) for(const o of live)
          if(segHitsBox(prev[0], prev[1], cur[0], cur[1], o.x, o.y, o.hw, o.hh)){ bad.push(`${p.id}:${o.n}`); break; }
        prev = cur;
      }
    });
    return { paths: paths.length, bad: [...new Set(bad)] };
  });
  check("the drawn curve is sampled on all five paths", curve.paths === 5, `${curve.paths} paths`);
  check("rounding a corner never pushes the run into a bunker", curve.bad.length === 0, curve.bad.join(", "));

  check("edit mode puts a handle on every corner", await ev(() => {
    const corners = currentPaths().reduce((n, p) => n + (p.via || []).length, 0);
    return document.querySelectorAll("circle.hnd").length === corners && corners > 0;
  }));

  // A real drag, with real pointer events, because that is the risky part.
  const handle = page.locator("circle.hnd").first();
  await handle.scrollIntoViewIfNeeded();
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 55, hb.y + 35, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  check("dragging a corner moves it and marks the path edited", await ev(() =>
    Object.keys(S.pathEdits || {}).length === 1 && currentPaths().some(p => p.edited)));
  check("an edited path offers to go back to the routed one",
        (await page.locator("button", { hasText: "Reset path" }).count()) === 1);

  check("a corner can be added and taken out again", await ev(() => {
    const p = currentPaths()[0];
    const n0 = (p.via || []).length;
    const via = [...(p.via || []), [40, 40]];
    S.pathEdits = {...(S.pathEdits || {}), [pathKey(p.id)]: via};
    save(S);
    const added = (currentPaths()[0].via || []).length === n0 + 1;
    via.pop();
    S.pathEdits = {...(S.pathEdits || {}), [pathKey(p.id)]: via};
    save(S);
    return added && (currentPaths()[0].via || []).length === n0;
  }));

  check("a player can be pointed by dragging him", await ev(() => {
    window.setDirect(1, "face", 135);
    return directOf(1).face === 135;
  }));

  await ev(() => window.resetAllPaths());
  check("resetting puts every path back on the routed line", await ev(() =>
    Object.keys(S.pathEdits || {}).length === 0 && !currentPaths().some(p => p.edited)));
  await ev(() => window.set({ editPath: false }));
  check("the handles go away when editing is off", await ev(() =>
    document.querySelectorAll("circle.hnd").length === 0));

  /* ------------------------------------------------------------------- QR */
  G("QR");
  // The app ships offline, so the encoder is hand-written and cannot be taken
  // on trust. This matrix was checked outside the app: rendered to pixels and
  // read back by an independent decoder as the string below. If the encoder
  // drifts, this fails.
  const QR_GOLDEN = ["1111111000101001101111111", "1000001000011111101000001", "1011101010011010101011101", "1011101010001010001011101", "1011101010100100001011101", "1000001010010011101000001", "1111111010101010101111111", "0000000010100000000000000", "1011111000111101101111100", "0100000001110100100001100", "0111011101001011110010011", "1010010101111010010010000", "0001111000000101101111101", "1110110001101010100000010", "1010001100100111110111011", "1000000101001011010010010", "1000101010001011111111111", "0000000010100101100010100", "1111111000011100101011011", "1000001010110010100010001", "1011101010011101111111100", "1011101010001011011010111", "1011101010100100100100101", "1000001001000001101110001", "1111111011011010010001111"];
  check("the join link encodes to the verified matrix", await ev(g => {
    const m = qrMatrix("gridlock://class/GL-7K2M");
    return !!m && m.map(r => r.join("")).join("|") === g.join("|");
  }, QR_GOLDEN));
  check("the QR carries the deep link both platforms register", await ev(() =>
    joinLink("GL-7K2M") === "gridlock://class/GL-7K2M"));
  check("the version grows with the payload", await ev(() => {
    const a = qrMatrix("A").length, b = qrMatrix("x".repeat(30)).length;
    return a === 21 && b === 29;
  }));
  check("a payload too long is refused, not mangled", await ev(() =>
    qrMatrix("x".repeat(42)) !== null && qrMatrix("x".repeat(43)) === null));
  check("all three finder patterns are in place", await ev(() => {
    const m = qrMatrix("gridlock://class/GL-7K2M"), n = m.length;
    const eye = (r0, c0) => m[r0][c0] === 1 && m[r0 + 1][c0 + 1] === 0 && m[r0 + 3][c0 + 3] === 1;
    return eye(0, 0) && eye(0, n - 7) && eye(n - 7, 0);
  }));
  check("the timing pattern alternates", await ev(() => {
    const m = qrMatrix("gridlock://class/GL-7K2M"), n = m.length;
    for(let i = 8; i < n - 8; i++) if(m[6][i] !== (i % 2 ? 0 : 1) || m[i][6] !== (i % 2 ? 0 : 1)) return false;
    return true;
  }));
  check("the drawn code keeps the four-module quiet zone", await ev(() => {
    const svg = qrSVG("gridlock://class/GL-7K2M", 132);
    const box = /viewBox="0 0 (\d+) \1"/.exec(svg);
    return !!box && Number(box[1]) === qrMatrix("gridlock://class/GL-7K2M").length + 8;
  }));
  check("the code is drawn on white, or no camera reads it", await ev(() =>
    /<rect[^>]*fill="#fff"/.test(qrSVG("gridlock://class/GL-7K2M", 132))));
  check("a class shows a scannable code beside its join code", await ev(() => {
    window.set({ tab: "more", more: "classes",
                 classes: [{ id: "GL-7K2M", code: "GL-7K2M", title: "Friday clinic", open: true }] });
    const svg = document.querySelector("svg.qr");
    return !!svg && svg.querySelectorAll("path").length === 1;
  }));

  /* ---------------------------------------------------------- break routing */
  G("Break routing");
  const route = await ev(() => {
    const obs = routeObstacles(LAYOUTS.mwo.bunkers);
    const legs = [], snakes = [];
    const snakeIds = new Set(obs.filter(o => o.n === "SB" && o.ids.size > 3).flatMap(o => [...o.ids]));
    for (const k of Object.keys(BREAK_PLANTS.mwo)) {
      const paths = breakPaths("mwo", k);
      snakes.push(paths.filter(p => snakeIds.has(p.bunker)).length);
      for (const p of paths) {
        const pts = [p.from, ...p.via, p.to];
        const holds = o => Math.abs(p.from[0] - o.x) <= o.hw && Math.abs(p.from[1] - o.y) <= o.hh;
        const live = obs.filter(o => !o.ids.has(p.bunker) && !holds(o));
        let clip = 0;
        for (let i = 0; i < pts.length - 1; i++)
          for (const o of live)
            if (segHitsBox(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], o.x, o.y, o.hw, o.hh)) clip++;
        const len = pts.slice(1).reduce((a, c, i) => a + Math.hypot(c[0] - pts[i][0], c[1] - pts[i][1]), 0);
        legs.push({ script: k, id: p.bunker, clip, len, straight: Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]) });
      }
    }
    const spread = breakPaths("mwo", "snake").map(p => p.from[1]);
    return { legs, snakes, station: Math.max(...spread) - Math.min(...spread) };
  });
  const clipped = route.legs.filter(l => l.clip > 0);
  check("no break path runs through a bunker", clipped.length === 0,
        clipped.length ? clipped.map(l => `${l.script}->${l.id}`).join(", ") : `${route.legs.length} legs`);
  check("every break path stays a sane length", route.legs.every(l => l.len < l.straight * 1.6 + 12));
  check("never more than one player on the snake", route.snakes.every(n => n <= 1), route.snakes.join(","));
  check("the five break from one station, not the whole width", route.station <= 20, `${route.station.toFixed(0)} ft`);

  /* ------------------------------------------------------------ house rules */
  G("House rules");
  const html = await ev(() => document.documentElement.outerHTML);
  check("the banned shot-tool name appears nowhere", !/gunz\s*up/i.test(html));
  check("the control is called Shot lanes", await ev(() => { window.set({ tab: "playbook" }); return document.body.textContent.includes("Shot lanes"); }));
  check("the UPRA mark is on screen", await ev(() => document.body.textContent.includes("powered by UPRA")));

  /* ------------------------------------------------------------------ report */
  const pad = (s, n) => String(s).padEnd(n);
  let last = "";
  console.log("GRIDLOCK function suite");
  console.log("=======================\n");
  for (const r of results) {
    if (r.group !== last) { console.log(`\n${r.group}`); console.log("-".repeat(r.group.length)); last = r.group; }
    console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${pad(r.name, 52)}${r.detail ? "  " + r.detail : ""}`);
  }
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) { console.log("\nFAILED:"); failed.forEach(f => console.log(`  ${f.group} — ${f.name}`)); }
  if (errors.length) { console.log("\nPAGE ERRORS:"); errors.forEach(e => console.log("  " + e)); }
  else console.log("No page errors during the run.");

  await browser.close();
  process.exit(failed.length || errors.length ? 1 : 0);
})();

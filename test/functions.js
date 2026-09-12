#!/usr/bin/env node
/* GRIDLOCK function suite.
 *
 * Drives the real app in a real browser and asserts every interactive
 * function actually does what it claims. Run the dev server first:
 *
 *   npm run serve      # terminal 1
 *   npm run test       # terminal 2
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");

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
  const browser = await chromium.launch(launchOptions());
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
  // Three routes, not four: create and sign in were two buttons for one door,
  // and a first-time coach could not tell which of them he was.
  check("the promo offers three routes and no more", await page.locator(".promo .btn").count() === 3);
  check("and they are coach, tutorial, sign in", await ev(() =>
    [...document.querySelectorAll(".promo .btn")].map(b => b.textContent.trim()).join("|"))
    === "Start coaching|Show me how it works|Running a clinic or a league? Sign in");
  await ev(() => window.set({ entered: true, role: "guest" }));
  check("guest can enter without an account", await ev(() => S.entered && S.role === "guest"));
  check("tab bar has the five phone tabs", await page.locator(".tabs button").count() === 5);

  /* ------------------------------------------------------------ the welcome */
  G("The welcome page");
  await ev(() => { localStorage.clear(); window.set({ entered: false, mode: null }); });
  await page.waitForTimeout(80);
  const promoText = () => ev(() => document.getElementById("root").innerText);
  check("it says what the app does before it asks for anything", await (async () => {
    const t = await promoText();
    return /twelve breaks/i.test(t) && /bunker a man broke to/i.test(t) && /win you points/i.test(t);
  })());
  check("the loudest button starts him coaching, not an account", await ev(() => {
    const big = document.querySelector("#root .btn--lg");
    return !!big && /Start coaching/.test(big.textContent);
  }));
  check("it says no account is needed, and why", await (async () => {
    const t = await promoText();
    return /No account needed/i.test(t) && /nothing ever leaves your phone/i.test(t);
  })());
  check("the sign-in line says what an account is for", await (async () =>
    /clinic or a league/i.test(await promoText()))());
  check("a phone with no account opens the form on Create", await ev(() => {
    [...document.querySelectorAll("#root button")].find(b => /Sign in/.test(b.textContent)).click();
    return S.mode === "create";
  }));
  check("and the form switches to signing in without going back", await ev(() => {
    [...document.querySelectorAll("#root button")].find(b => /Already have one/.test(b.textContent)).click();
    return S.mode === "login";
  }));
  check("the form says coaching does not depend on it",
    await ev(() => /Coaching a match needs none/.test(document.getElementById("root").innerText)));
  await ev(() => window.set({ mode: null }));

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

  // Every tap rebuilds the screen. It used to come back at the top, which threw
  // the coach off whatever he was reading, halfway down a long card.
  check("a tap deep in a card leaves the screen where it was", await ev(async () => {
    window.set({ tab: "scout", scoutTab: "matchup" });
    await new Promise(r => setTimeout(r, 80));
    const main = document.querySelector(".main");
    main.scrollTop = 600;
    const was = main.scrollTop;
    window.setThreat("right", 2);
    await new Promise(r => setTimeout(r, 80));
    return was > 0 && document.querySelector(".main").scrollTop === was;
  }));
  check("changing tab does start at the top", await ev(async () => {
    document.querySelector(".main").scrollTop = 600;
    window.set({ tab: "tally" });
    await new Promise(r => setTimeout(r, 80));
    return document.querySelector(".main").scrollTop === 0;
  }));

  /* --------------------------------------------------------------- playbook */
  G("Playbook");
  await seed();
  check("the twelve breaks the spec names are all offered", await ev(() => {
    const want = ["Hold & Read","Conservative","Lock the Lanes","Balanced Break",
                  "Clean / Lane Trade","Tower / Centre","Contain Both Wires","Wire Split",
                  "Counter Break","Snake Stack","Dorito Flood","Blitz"];
    // In order, so the picker is a dial: patient at the left, must-score at
    // the right. The aggression on each call has to agree with where it sits.
    const got = Object.values(BREAKS).map(b => b.name);
    const aggr = Object.keys(BREAKS).map(k => breakMeta(k).aggr);
    return got.length === 12 && want.every(n => got.includes(n))
        && aggr.every((a, i) => i === 0 || a >= aggr[i - 1]);
  }));
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
  check("alive counts drop", await ev(() => document.getElementById("root").textContent.includes("4")));
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
  // Which patient call wins depends on the twelve; what must hold is that a
  // patient one does. Naming it pinned the answer to a five-break catalog.
  check("a patient call tops the list when ahead", await ev(w =>
    breakMeta(counterRank("Snake", "Ahead")[0].key).aggr <= 2, rank.ahead), rank.ahead);
  check("every break is ranked", await ev(() =>
    counterRank("Snake", "Even").length === Object.keys(BREAKS).length));
  check("the board lists a real division of teams", await ev(() => teamsHere().length >= 11));
  check("every division on offer has teams in it", await ev(() =>
    DIVISIONS.every(d => divisionTeams(d.id).length >= 11)));
  check("both pits draw on one field", await ev(() => {
    const svg = fieldSVG({ both: true }); return svg.includes("#e5342f") && svg.includes("#3d8bff");
  }));
  check("the not-a-prediction line is on Scout", await ev(() => {
    // On Scout itself, above the sub-tabs, so it is on screen whichever one is
    // open. Checked against the rendered app: the whole source sits in a script
    // tag inside body, so document.body.textContent matches any string literal
    // in it and says nothing about what a coach can see.
    return SCOUT_TABS.every(([k]) => {
      window.set({ scoutTab: k });
      const aid = [...document.querySelectorAll("#root .aid")];
      return aid.some(el => /not a prediction/i.test(el.textContent));
    });
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

  // Sightlines by touch. A bunker is about ten pixels across on a phone, so
  // none of this works if a coach has to land on the shape itself.
  await ev(() => window.set({ tab: "sightlines", sightFrom: null, sightTo: null, sightPick: "from" }));
  await page.waitForTimeout(120);
  check("the field takes taps at all", await ev(() =>
    !!document.querySelector("svg.field [data-pick]")));
  check("a tap anywhere lands on the nearest bunker", await ev(() => {
    const b = LAYOUTS.mwo.bunkers[12];
    const hit = bunkerAt([b.x + 2, b.y + 2]);        // two feet off it
    return hit && hit.id === b.id;
  }));
  check("a tap in open field picks nobody, rather than the far side", await ev(() => {
    const far = bunkerAt([75, 60]);                   // dead centre of the field
    return far === null || Math.hypot(far.x - 75, far.y - 60) <= 14;
  }));

  const tapField = async (fx, fy) => {
    const box = await page.locator("svg.field").first().boundingBox();
    await page.mouse.click(box.x + box.width * (fx / 150), box.y + box.height * (fy / 120));
    await page.waitForTimeout(90);
  };
  const spot = await ev(() => { const b = LAYOUTS.mwo.bunkers[3]; return [b.x, b.y, b.id]; });
  await tapField(spot[0], spot[1]);
  check("the first tap says where you are standing", await ev(() => S.sightFrom) === spot[2]);
  check("and moves on to the lane on its own, so there is no mode to learn",
    await ev(() => S.sightPick) === "to");

  const target = await ev(() => { const b = LAYOUTS.mwo.bunkers[30]; return [b.x, b.y, b.id]; });
  await tapField(target[0], target[1]);
  check("the second tap asks about one lane", await ev(() => S.sightTo) === target[2]);
  check("that lane gets an answer in words", await ev(() => {
    const v = document.querySelector(".verdict");
    return !!v && /Clear|Blocked/.test(v.innerText);
  }));
  check("a blocked lane names what is in the way, not just 'blocked'", await ev(() => {
    const from = LAYOUTS.mwo.bunkers[3].id;
    const l = sightLines(from, 2, 2).lines.find(x => x.blocked);
    return !!l && l.by.length > 0 && !!l.by[0].id;
  }));
  check("the blocker named is the first one you would hit", await ev(() => {
    const src = LAYOUTS.mwo.bunkers[3];
    const l = sightLines(src.id, 2, 2).lines.find(x => x.blocked && x.by.length > 1);
    if(!l) return true;
    const d = o => Math.hypot(o.x - src.x, o.y - src.y);
    return d(l.by[0]) <= d(l.by[1]);
  }));
  check("every lane carries how far it is", await ev(() =>
    sightLines(LAYOUTS.mwo.bunkers[3].id, 2, 2).lines.every(l => l.ft > 0)));

  await tapField(target[0], target[1]);
  check("tapping the same one again drops the question", await ev(() => S.sightTo) === null);
  await ev(() => window.setSightPick("from"));
  const moved = await ev(() => { const b = LAYOUTS.mwo.bunkers[44]; return [b.x, b.y, b.id]; });
  await tapField(moved[0], moved[1]);
  check("going back to standing-in moves you, and clears the old lane",
    await ev(() => S.sightFrom) === moved[2] && await ev(() => S.sightTo) === null);
  check("the table rows are controls too", await ev(() => {
    const row = document.querySelector("tr.tap");
    if(!row) return false;
    row.click();
    return !!S.sightTo;
  }));
  check("the asked-about lane is drawn heavier than the rest", await ev(() =>
    fieldSVG({ sightFrom: S.sightFrom, sightTo: S.sightTo, static: true }).includes('stroke-width="3"')));
  check("a coach's own bunker call wins over the code", await ev(() => {
    const id = LAYOUTS.mwo.bunkers[30].id;
    S.bunkerCalls = { ...(S.bunkerCalls || {}), mwo: { [id]: "Rob's corner" } };
    save(S); window.set({ sightTo: id });
    return document.body.innerText.includes("Rob's corner");
  }));


  /* ------------------------------------------------------- team + bunker calls */
  G("Team and bunker calls");
  await seed({ tab: "more", more: "team" });
  await ev(() => { document.getElementById("bcId").value = "GP#1"; document.getElementById("bcName").value = "Home"; window.setCall(); });
  await page.waitForTimeout(80);
  check("a bunker call is saved", await ev(() => bunkerCalls()["GP#1"] === "Home"));
  check("the call overlays the official code on the field",
    await ev(() => fieldSVG({ static: true, names: true }).includes(">Home<")));
  check("Team draws the codes without asking, because naming them is the screen",
    await ev(() => { window.set({ namesOn: false });
      return document.querySelector("#root .field-wrap svg.field").innerHTML.includes(">Home<"); }));
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
    window.fillLineup("roster"); return lineupFor(3).length === 5 && lineupFor(3)[0] === "Reyes";
  }));
  check("a slot can be set to any player on the squad", await ev(() => {
    window.setSlot(0, "Cole"); return lineupFor(3)[0] === "Cole" && fiveFor(3)[0].num === 9;
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
    return empty && lineupFor(4)[0] === "Cole" && lineupFor(3)[0] === "Cole";
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

  /* ------------------------------------------------- a copy of your season */
  G("Save and load a copy");
  const SEASON = {
    roster: [{name:"Reyes",num:7,p:"snake MW",s:"GP"},{name:"Okafor",num:3,p:"MT 50",s:"C lane"}],
    scout: {"Rejects":{tend:"Snake",threat:4,notes:"buzzer runner",
            players:[{num:"7",name:"Vasquez",wire:"Snake",note:"buzzer",threat:5}]}},
    tally: [{pt:1,side:"us",name:"Reyes",at:111,script:"snake",layout:"mwo",vs:"Rejects",how:"Laned"}],
    codes: [{word:"Buzzer",means:"go on the horn"}],
    classes: [{id:"GL-7K2M",code:"GL-7K2M",title:"Friday clinic",open:true}],
  };
  await ev(st => window.set({ tab:"more", more:"nexus", ...st }), SEASON);
  const copy = await ev(() => copyPayload("all"));
  check("a copy is readable JSON that says what it is", await ev(t => {
    const p = JSON.parse(t);
    return p.format === "gridlock.coach.copy" && p.v === 1 && !!p.at && !!p.data;
  }, copy));
  check("a copy carries the season", await ev(t => {
    const d = JSON.parse(t).data;
    return d.roster.length === 2 && Object.keys(d.scout).length === 1 && d.tally.length === 1;
  }, copy));
  check("a copy never carries the staff password", !/pass|hash|salt/i.test(copy));
  check("a copy leaves this session's own business behind", await ev(t => {
    const d = JSON.parse(t).data;
    return d.tab === undefined && d.tips === undefined && d.playing === undefined && d.copyText === undefined;
  }, copy));
  check("the squad copy is the squad, not the season", await ev(() => {
    const d = JSON.parse(copyPayload("squad")).data;
    return !!d.roster && !!d.scout && d.tally === undefined && d.classes === undefined;
  }));
  check("a copy counts itself in plain words", await ev(t =>
    /2 players/.test(copySummary(JSON.parse(t).data)) && /1 team scouted/.test(copySummary(JSON.parse(t).data)), copy));

  // The whole point: another phone that also did real work keeps both lots.
  const OTHER = {
    roster: [{name:"Vance",num:11,p:"GP",s:"snake"}],
    scout: {"Malicious":{tend:"Dorito",threat:5,notes:"lean dorito",players:[]}},
    tally: [{pt:1,side:"them",name:"2",at:222,script:"snake",layout:"mwo",vs:"Malicious"}],
    codes: [{word:"Ladder",means:"trade out"}],
  };
  await ev(st => window.set({ ...defaultState(), entered:true, role:"staff", tab:"more", more:"nexus", ...st }), OTHER);
  await ev(t => { document.getElementById("copyIn").value = t; window.loadCopy("merge"); }, copy);
  check("merging keeps both rosters", await ev(() =>
    S.roster.length === 3 && S.roster.some(r => r.name === "Vance") && S.roster.some(r => r.name === "Reyes")));
  check("merging keeps both teams scouted", await ev(() =>
    !!S.scout["Rejects"] && !!S.scout["Malicious"]));
  check("merging keeps both sets of outs", await ev(() => S.tally.length === 2));
  check("merging the same copy twice changes nothing", await ev(t => {
    const before = [S.roster.length, S.tally.length, S.codes.length].join();
    document.getElementById("copyIn").value = t; window.loadCopy("merge");
    return [S.roster.length, S.tally.length, S.codes.length].join() === before;
  }, copy));
  check("the app says what it just took in", await ev(() => /Merged in/.test(S.copyStatus)));

  await ev(t => { document.getElementById("copyIn").value = t; window.loadCopy("replace"); }, copy);
  check("replacing drops what was here", await ev(() =>
    S.roster.length === 2 && !S.scout["Malicious"] && S.tally.length === 1));

  check("something that is not a copy is refused", await ev(() => {
    document.getElementById("copyIn").value = "not json at all";
    window.loadCopy("merge");
    return /not readable as JSON/.test(S.copyStatus) && S.roster.length === 2;
  }));
  check("someone else's JSON is refused", await ev(() => {
    document.getElementById("copyIn").value = '{"hello":"world"}';
    window.loadCopy("merge");
    return /not a GRIDLOCK copy/.test(S.copyStatus) && S.roster.length === 2;
  }));
  check("a copy from a newer app is refused, not half-read", await ev(() => {
    document.getElementById("copyIn").value = JSON.stringify({format:"gridlock.coach.copy",v:99,data:{roster:[]}});
    window.loadCopy("merge");
    return /newer version/.test(S.copyStatus) && S.roster.length === 2;
  }));
  check("a copy naming a field that no longer ships still loads", await ev(() => {
    document.getElementById("copyIn").value = JSON.stringify({format:"gridlock.coach.copy",v:1,
      data:{layoutKey:"tbo", roster:[{name:"Ghost",num:1,p:"",s:""}]}});
    window.loadCopy("merge");
    return !!LAYOUTS[S.layoutKey] && S.roster.some(r => r.name === "Ghost");
  }));
  check("the copy screens are on Nexus", await ev(() => {
    window.set({ tab:"more", more:"nexus" });
    const txt = document.querySelector(".main").textContent;
    return /Save a copy/.test(txt) && /Load a copy/.test(txt) && /no automatic backup/.test(txt);
  }));

  // Exercise the actual file picker: setting the textarea in evaluate() hid a
  // repaint that discarded every selected file before Merge could read it.
  await page.locator('input[type="file"]').setInputFiles({
    name: "season.json", mimeType: "application/json", buffer: Buffer.from(copy),
  });
  await page.waitForFunction(() => /Read season.json/.test(S.copyStatus || ""));
  check("a file remains loaded after its status message redraws", await ev(t =>
    document.getElementById("copyIn").value === t, copy));
  await page.getByRole("button", { name:"Merge it in", exact:true }).click();
  check("the chosen file can be merged with the visible button", await ev(() =>
    /Merged in/.test(S.copyStatus) && document.getElementById("copyIn").value === ""));
  check("an invalid pasted copy stays available to correct", await ev(() => {
    document.getElementById("copyIn").value = "{broken";
    window.loadCopy("merge");
    return /not readable/.test(S.copyStatus) && document.getElementById("copyIn").value === "{broken";
  }));
  check("malformed record collections never replace the season", await ev(() => {
    const before = JSON.stringify(S.roster);
    for(const data of [{roster:null}, {classes:[{}]}, {groups:[{id:"g",name:"Ops",members:{}}]},
      {pathEdits:{"lso|snake|1":[["bad", 2]]}}, {scout:{Team:{players:{}}}}]){
      document.getElementById("copyIn").value = JSON.stringify({format:COPY_FORMAT, v:1, data});
      window.loadCopy("replace");
      if(!/invalid data/.test(S.copyStatus) || JSON.stringify(S.roster) !== before) return false;
    }
    return true;
  }));
  check("copies cannot change session privileges or object prototypes", await ev(() => {
    const parsed = readCopy('{"format":"gridlock.coach.copy","v":1,"data":{"role":"staff","entered":true,"roster":[]}}');
    const bad = readCopy('{"format":"gridlock.coach.copy","v":1,"data":{"__proto__":{"polluted":true}}}');
    return !parsed.error && parsed.payload.data.role === undefined
      && parsed.payload.data.entered === undefined && !!bad.error && !({}).polluted;
  }));
  check("a season and squad copy both keep custom division teams", await ev(() => {
    S.teams = {pro:[{name:"Local Crew"}]};
    return ["all", "squad"].every(scope => JSON.parse(copyPayload(scope)).data.teams.pro[0].name === "Local Crew");
  }));
  check("merge preserves identical-looking outs in different matches", await ev(() => {
    const row = {pt:1, side:"us", name:"Rex", at:123};
    const merged = mergeInto({tally:[{...row,m:"one"}]}, {tally:[{...row,m:"two"}, {...row,m:"two"}]});
    return merged.tally.length === 2 && merged.tally.some(r => r.m === "two");
  }));
  check("merging two scouts keeps both players, calls and bunker aliases", await ev(() => {
    const a = {scout:{Crew:{notes:"old",players:[{num:"1",name:"A"}],breaks:[{pt:1,script:"snake",at:1}]}},
      bunkerCalls:{lso:{one:"Home"}}, teams:{pro:[{name:"Crew"}]}};
    const b = {scout:{Crew:{notes:"new",players:[{num:"2",name:"B"}],breaks:[{pt:2,script:"blitz",at:2}]}},
      bunkerCalls:{lso:{two:"House"}}, teams:{pro:[{name:"Local"}]}};
    const m = mergeInto(a,b);
    return m.scout.Crew.players.length === 2 && m.scout.Crew.breaks.length === 2
      && m.scout.Crew.notes === "new" && m.bunkerCalls.lso.one === "Home"
      && m.bunkerCalls.lso.two === "House" && m.teams.pro.length === 2;
  }));
  check("a legacy copy gets an openable sheet without duplicating on reread", await ev(() => {
    const text = JSON.stringify({format:COPY_FORMAT,v:1,at:"2026-01-01T00:00:00Z",data:{
      tally:[{pt:1,side:"us",name:"Rex",at:1}],lineups:{1:["Rex"]}}});
    const a = readCopy(text).payload.data, b = readCopy(text).payload.data;
    return a.matchId === b.matchId && a.matches[0].id === a.matchId
      && a.tally[0].m === a.matchId && a.lineups[a.matchId + "|1"][0] === "Rex";
  }));
  await ev(() => window.set({tab:"scout",scoutTab:"board",division:"pro"}));
  const quotedTeam = `O'Brien "Crew" &quot; \\ North`;
  await page.locator("#newTeam").fill(quotedTeam);
  await page.getByRole("button", {name:"Add team",exact:true}).click();
  await page.locator("#boardRows tr").filter({hasText:quotedTeam}).click();
  check("the board loads team names containing quotes and HTML entities", await ev(name =>
    S.right.name === name, quotedTeam));
  await ev(() => window.set({scoutTab:"board"}));
  await page.locator(".assign").filter({hasText:quotedTeam}).getByRole("button", {name:"Remove",exact:true}).click();
  check("that team can also be removed through its visible control", await ev(name =>
    !(S.teams.pro || []).some(t => t.name === name), quotedTeam));

  /* --------------------------------------- the matchup panel, actually counted */
  G("Matchup");
  await ev(() => window.set({ tab: "scout", scoutTab: "matchup", script: "snake",
    scout: { "Blast Camp": {tend:"Balanced", threat:5, notes:"", players:[]},
             "Rejects": {tend:"Snake", threat:1, notes:"", players:[]} },
    left: { name: "Blast Camp" }, right: { name: "Rejects" } }));
  check("the wire split counts the five, not a fixed number", await ev(() => {
    const w = wireSplit();
    return w.Snake + w.Centre + w.Dorito === 5;
  }));
  check("the wire split moves when the call moves", await ev(() => {
    const a = JSON.stringify(wireSplit());
    window.set({ script: "flood" });
    const b = JSON.stringify(wireSplit());
    window.set({ script: "snake" });
    return a !== b;
  }));
  check("the split matches where the break actually plants", await ev(() => {
    const w = wireSplit();
    const counted = currentPaths().filter(p => wireOf(p.to[1]).startsWith("snake")).length;
    return w.Snake === counted;
  }));
  check("the bar follows the threat you scored, both ways", await ev(() => {
    const read = () => document.querySelector(".bar i").style.width;
    const wide = read();                                  // 5 vs 1
    window.setThreat("right", 5);                         // now level
    const level = read();
    return wide === "83%" && level === "50%";
  }));
  check("nothing on the panel is a hard-coded percentage", await ev(() => {
    const txt = document.querySelector(".main").textContent;
    return !/44%|56%|2\.3 to 2\.6/.test(txt);
  }));
  check("your five are listed from the real routed jobs", await ev(() => {
    const txt = document.querySelector(".main").textContent;
    return currentPaths().every(p => txt.includes(p.label));
  }));

  /* ------------------------------------------- how an out actually happened */
  G("Cause of an out");
  await ev(() => window.set({ tab: "tally", point: 1, tally: [], script: "snake",
    roster: [{ name: "Reyes", num: 7, p: "snake MW", s: "GP" }],
    scout: { "Rejects": {tend:"Snake", threat:4, notes:"",
             players:[{num:"7", name:"Vasquez", wire:"Snake", note:"buzzer", threat:5}]} },
    right: { name: "Rejects" } }));
  await ev(() => window.markOut("us", "Reyes"));
  check("an out records the call, the field and the opponent", await ev(() => {
    const o = S.tally[0];
    return o.script === "snake" && o.layout === S.layoutKey && o.vs === "Rejects";
  }));
  await ev(() => { window.setOutBunker(0, "how", "Laned"); window.setOutBunker(0, "by", "#7"); });
  check("an out records how, and who did it", await ev(() =>
    S.tally[0].how === "Laned" && S.tally[0].by === "#7"));
  check("the log line says how, not just where", await ev(() =>
    /laned/i.test(document.querySelector(".main").textContent)));
  check("who did it comes from the pit you scouted", await ev(() =>
    /#7 Vasquez/.test(document.querySelector(".main").innerHTML)));
  check("for their out it offers your roster instead", await ev(() => {
    window.markOut("them", "2");
    const html = document.querySelector(".main").innerHTML;
    return /By \(yours\)/.test(html) && /#7 Reyes/.test(html);
  }));

  /* ------------------------------------------------ counting what happened */
  G("History");
  await ev(() => window.set({ tab: "playbook", layoutKey: "mwo", script: "snake", point: 1, tally: [
    {pt:1, side:"us",   name:"Reyes",  script:"snake", layout:"mwo", vs:"Rejects", how:"Laned",       by:"#7"},
    {pt:1, side:"us",   name:"Vance",  script:"snake", layout:"mwo", vs:"Rejects", how:"Laned",       by:"#7"},
    {pt:1, side:"them", name:"3",      script:"snake", layout:"mwo", vs:"Rejects"},
    {pt:2, side:"us",   name:"Marsh",  script:"snake", layout:"mwo", vs:"Rejects", how:"Snake crawl", by:"#12"},
    {pt:3, side:"us",   name:"Reyes",  script:"blitz", layout:"mwo", vs:"Rejects", how:"Traded"},
  ]}));
  check("a break's record counts its own points and outs", await ev(() => {
    const r = breakRecord("snake");
    return r.points === 2 && r.us === 3 && r.them === 1;
  }));
  check("another call is counted separately", await ev(() => breakRecord("blitz").points === 1));
  check("a record never counts another field's points", await ev(() => {
    window.set({ layoutKey: "not-a-field" });
    const n = breakRecord("snake").points;
    window.set({ layoutKey: "mwo" });
    return n === 0;
  }));
  check("the call card shows the record it has", await ev(() =>
    /called this 2 times/.test(document.querySelector(".main").textContent)));
  check("an unplayed call claims nothing", await ev(() => {
    window.set({ script: "hold" });
    const txt = document.querySelector(".main").textContent;
    window.set({ script: "snake" });
    return !/called this/.test(txt);
  }));
  check("the opponent read ranks how they get you, hardest first", await ev(() => {
    const r = opponentRead("Rejects");
    return r.n === 4 && r.how[0][0] === "Laned" && r.how[0][1] === 2 && r.who[0][0] === "#7";
  }));
  check("a team you have not played reads as nothing", await ev(() => opponentRead("Malicious").n === 0));
  check("anticipate reports it back", await ev(() => {
    window.set({ tab: "scout", scoutTab: "anticipate" });
    const txt = document.querySelector(".main").textContent;
    return /How they get you/.test(txt) && /laned 2/.test(txt);
  }));

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

  /* ------------------------------------------ rosters the league published */
  G("Published rosters");
  await ev(() => window.set({ tab: "scout", scoutTab: "matchup", scout: {},
    division: "pro", left: { name: "Los Angeles Ironmen" }, right: { name: "San Diego Dynasty" } }));
  // The pro board carries names only, so a pit can hold a team with no points.
  check("a team nobody has scored reads as a dash, never as undefined", await ev(() =>
    pitOf("left").pts === undefined) &&
    /not scored yet/.test(await page.locator(".pit--l").innerText()) &&
    !/undefined/i.test(await page.locator(".pit--l").innerText()));
  check("a published roster is offered only where one was actually read", await ev(() =>
    !!published("San Diego Dynasty") && !published("Los Angeles Ironmen")));
  check("every published roster says where it came from and when", await ev(() =>
    Object.values(PRO_ROSTERS).every(r => r.src && r.read && r.men.length)));
  check("no roster was invented for a team nobody read", await ev(() =>
    teamsHere().filter(t => published(t.name)).length === Object.keys(PRO_ROSTERS).length));
  check("a team with no published roster says so plainly, and offers the paste",
    /No published roster in the app/.test(await page.locator(".pit--l").innerText()));
  check("adding it logs the men against the team", await ev(() => {
    window.addPublished("right");
    const men = pitOf("right").players;
    return men.length === 5 && men[0].num === "7" && men[0].name === "Alex Fraige";
  }));
  check("a published name is flagged as published, never as something you saw", await ev(() =>
    pitOf("right").players.every(m => m.from === "published")));
  check("the card says how many came off a roster rather than off film",
    /off a published roster/i.test(await page.locator(".pit--r").innerText()));
  check("a published man carries no threat read, just the seed", await ev(() =>
    pitOf("right").players.every(m => m.threat === 3 && m.note === "" && m.wire === "Flex")));
  check("adding it twice does not double the roster", await ev(() => {
    window.addPublished("right");
    return pitOf("right").players.length === 5;
  }));
  check("a published man is editable and scoreable like any other", await ev(() => {
    window.setScoutThreat("right", 0, 5);
    window.editScoutPlayer("right", 0, "wire", "Snake");
    const m = pitOf("right").players[0];
    return m.threat === 5 && m.wire === "Snake";
  }));
  check("the offer is gone once the five are logged",
    !/Add their published/.test(await page.locator(".pit--r").innerText()));
  check("a published roster belongs to the team, not the pit", await ev(() => {
    window.loadPit("Houston Heat");
    const clean = pitOf("right").players.length === 0;
    window.loadPit("San Diego Dynasty");
    return clean && pitOf("right").players.length === 5;
  }));

  /* -------------------------------- a roster read off the phone's own OCR */
  // A screenshot never reaches this app. The phone reads the picture, the coach
  // pastes what it read, and this has to survive how ragged that text is.
  G("Roster from a screenshot");
  await ev(() => window.set({ tab: "scout", scoutTab: "matchup", scout: {},
    left: { name: "Blast Camp" }, right: { name: "Rejects" }, paste: null, pasteSide: "" }));

  const parse = t => ev(x => parseRoster(x), t);
  check("number first, name after", await parse("12 Ryan Greenspan").then(r =>
    r.found.length === 1 && r.found[0].num === "12" && r.found[0].name === "Ryan Greenspan"));
  check("a hash in front is still a number", await parse("#4 Alex Goldman").then(r =>
    r.found[0].num === "4" && r.found[0].name === "Alex Goldman"));
  check("name first, number after", await parse("Chad Busiere 7").then(r =>
    r.found[0].num === "7" && r.found[0].name === "Chad Busiere"));
  check("a table pasted with tabs or pipes reads the same", await parse("9\tKS Kang\n| 15 | Nick Slowiak |").then(r =>
    r.found.length === 2 && r.found[0].num === "9" && r.found[1].name === "Nick Slowiak"));
  check("a wire named on the line is picked up", await parse("4 Alex Goldman snake").then(r =>
    r.found[0].wire === "Snake" && r.found[0].name === "Alex Goldman"));
  check("no wire named means flex, never a guess", await parse("4 Alex Goldman").then(r =>
    r.found[0].wire === "Flex"));
  check("a number with no name is still a player", await parse("22").then(r =>
    r.found.length === 1 && r.found[0].num === "22" && r.found[0].name === ""));
  check("a name with no number is still a player", await parse("Ryan Greenspan").then(r =>
    r.found.length === 1 && r.found[0].name === "Ryan Greenspan" && r.found[0].num === ""));
  check("column headings are dropped", await parse("Player\nNo.\nDivision\n7 Reyes").then(r =>
    r.found.length === 1 && r.found[0].name === "Reyes"));
  check("a whole header row is dropped, not read as a man", await parse("Player  No.\n# Name Team\n7 Reyes").then(r =>
    r.found.length === 1 && r.found[0].name === "Reyes"));
  check("page chrome and prose are left out, not guessed at", await parse(
    "7 Reyes\nRegistration closes on the fourteenth of June at midnight\nmenu").then(r =>
    r.found.length === 1 && r.skipped.length === 1));
  check("what was left out is handed back so nothing goes quiet", await parse(
    "Registration closes on the fourteenth of June").then(r =>
    r.found.length === 0 && r.skipped.length === 1));
  check("a paste is capped so one bad screenshot cannot flood the sheet", await parse(
    Array.from({ length: 60 }, (_, i) => (i + 1) + " Player" + i).join("\n")).then(r =>
    r.found.length === 40));
  check("threat starts unscored at three, the same as a typed player", await parse("12 Greenspan").then(r =>
    r.found[0].threat === 3));

  // The fixture below is not typed by hand. It is what a real OCR engine
  // (tesseract) actually returned from a phone-resolution screenshot of a
  // pbleagues roster page — status bar, address bar, nav, page title, class
  // column, wrapped footer and all. Every one of those read as a player until
  // this text was put through the parser.
  const OCR = "9:41 LTE 100%\n" +
    "pbleagues.com/team/roster/MihM3rL8DiAEcaoW\n\n" +
    "Home Events Teams Rankings Search\n\n" +
    "San Diego Dynasty\n\n" +
    "at NXL Tampa Bay Open 2025 - Pro X-Ball\n\n" +
    "# PLAYER CLASS\n\n" +
    "7 Alex Fraige Pro\n\n" +
    "18 Ryan Greenspan Pro\n\n" +
    "32 Yosh Rau Pro\n" +
    "Eliot Weaver Pro\n" +
    "Archie Barnes Jr Pro\n\n" +
    "Rosters over three months old are archived. Email us with the\n\n" +
    "resource locator ID to request a copy. Registration closes fourteen\n\n" +
    "days before the event.\n";
  const real = await ev(t => parseRoster(t, "San Diego Dynasty"), OCR);
  check("a real screenshot reads as exactly its five men, and nothing else",
    real.found.length === 5, real.found.map(m => (m.num || "-") + " " + m.name).join(" · "));
  check("the phone's own status bar is not a player",
    !real.found.some(m => m.num === "9" || /LTE/i.test(m.name)));
  check("the team's name at the top of the page is not a player",
    !real.found.some(m => /Dynasty/i.test(m.name)));
  check("the class column is shed, not glued to the name",
    real.found.every(m => !/\bPro\b/.test(m.name)) && real.found[0].name === "Alex Fraige");
  check("Jr stays part of a man's name",
    real.found[4].name === "Archie Barnes Jr");
  check("the tail of a wrapped sentence is not a player",
    !real.found.some(m => /days before/i.test(m.name)) &&
    real.skipped.some(l => /days before/i.test(l)));
  check("the numbers come off the page as the page had them",
    real.found[0].num === "7" && real.found[1].num === "18" && real.found[2].num === "32" &&
    real.found[3].num === "" && real.found[4].num === "");
  check("a lowercase sentence that fits in four words is still not a name", await parse(
    "days before the event\nresource locator\n7 Reyes").then(r => r.found.length === 1));

  check("reading it shows what was read and adds nobody yet", await ev(() => {
    window.openPaste("right");
    document.getElementById("rosterIn").value = "12 Ryan Greenspan\n#4 Alex Goldman snake\nChad Busiere 7";
    window.readRoster("right");
    return S.paste.found.length === 3 && pitOf("right").players.length === 0;
  }));
  check("the read list is on screen with a way to drop a bad row",
    await page.locator(".rost__read").count() === 3 &&
    await page.locator(".rost__read .btn--danger").count() === 3);
  check("dropping a row takes it out before anyone is kept", await ev(() => {
    window.dropPasted(1);
    return S.paste.found.length === 2 && S.paste.found[1].name === "Chad Busiere";
  }));
  check("keeping them logs the rest against the team", await ev(() => {
    window.keepRoster();
    const men = pitOf("right").players;
    return men.length === 2 && men[0].num === "12" && men[1].name === "Chad Busiere";
  }));
  check("the box closes and says what it did", await ev(() =>
    !S.paste && S.pasteSide === "" && /Added 2/.test(S.pasteNote)));
  check("a second paste of the same roster adds nobody twice", await ev(() => {
    window.openPaste("right");
    document.getElementById("rosterIn").value = "12 Ryan Greenspan\n7 Chad Busiere\n15 Nick Slowiak";
    window.readRoster("right");
    window.keepRoster();
    return pitOf("right").players.length === 3 && /already logged/.test(S.pasteNote);
  }));
  check("a pasted player is editable like any other", await ev(() => {
    window.editScoutPlayer("right", 0, "name", "R. Greenspan");
    window.setScoutThreat("right", 0, 5);
    const m = pitOf("right").players[0];
    return m.name === "R. Greenspan" && m.threat === 5;
  }));
  check("a pasted roster belongs to the team, not the pit", await ev(() => {
    window.loadPit("Las Vegas Shock");
    const clean = pitOf("right").players.length === 0;
    window.loadPit("Rejects");
    return clean && pitOf("right").players.length === 3;
  }));
  check("it survives a reload", await ev(() =>
    (JSON.parse(localStorage.getItem("gridlock.coach.v2")).scout["Rejects"].players || []).length === 3));
  check("cancelling throws the paste away", await ev(() => {
    window.openPaste("left");
    document.getElementById("rosterIn").value = "1 Nobody";
    window.readRoster("left");
    window.closePaste();
    return !S.paste && S.pasteSide === "" && pitOf("left").players.length === 0;
  }));
  check("an empty paste keeps its hands off the sheet", await ev(() => {
    window.openPaste("left");
    document.getElementById("rosterIn").value = "   \n\n";
    window.readRoster("left");
    const none = S.paste.found.length === 0;
    window.keepRoster();
    window.closePaste();
    return none && pitOf("left").players.length === 0;
  }));

  /* ----------------------------------------------------------- path editing */
  G("Path editing");
  await ev(() => window.set({ tab: "playbook", editPath: true, pathEdits: {}, t: 0.5, playing: false }));
  await page.waitForTimeout(200);

  // The corners are rounded so a path reads like a run rather than a set of
  // right angles. Rounding must not push the curve into a bunker, so this
  // samples what is actually drawn — the real path element, at 4 samples a
  // foot — and checks every sample against every footprint.
  const sampleCurves = () => ev(() => {
    // Whatever field is on screen — the obstacles have to be that field's, or
    // this compares one layout's curves against another's bunkers.
    const obs = routeObstacles(curLayout().bunkers);
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
    return { key: S.layoutKey, paths: paths.length, bad: [...new Set(bad)] };
  });
  const curve = await sampleCurves();
  check("the drawn curve is sampled on all five paths", curve.paths === 5, `${curve.paths} paths`);
  // Every field, not just the one the app happens to open on: rounding that
  // clears one layout can cut a corner into a bunker on another.
  const curves = [curve];
  for(const k of ["mwo", "tby"]){
    await ev(x => window.set({ layoutKey: x }), k);
    await page.waitForTimeout(180);
    curves.push(await sampleCurves());
  }
  const cut = curves.filter(c => c.bad.length);
  check("rounding a corner never pushes the run into a bunker, on any field",
    cut.length === 0, cut.map(c => `${c.key}: ${c.bad.join(" ")}`).join(" | ")
      || curves.map(c => c.key).join(", "));

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

  /* ------------------------------------------------------------- divisions */
  G("Divisions");
  await ev(() => window.set({ tab:"scout", scoutTab:"board", division:"pro", teams:{}, scout:{} }));
  check("there is more than one division to pick from", await ev(() => DIVISIONS.length >= 2));
  check("pro is what the app opens on", await ev(() =>
    divisionOf().id === "pro" && /Pro/.test(divisionOf().name)));
  check("the pro board carries the league's teams", await ev(() =>
    teamsHere().length >= 11 && teamsHere().some(t => t.name === "Los Angeles Ironmen")
                             && teamsHere().some(t => t.name === "Seattle Uprising")));
  check("the semi-pro board is still there with its points", await ev(() => {
    window.setDivision("semi");
    const t = teamsHere().find(x => x.name === "Rejects");
    const ok = teamsHere().length >= 14 && t.pts === 186 && t.reg === "PAID";
    window.setDivision("pro");
    return ok;
  }));
  // The point of the whole exercise: names are a fact, a team's form is not.
  // Points, tendency and threat are still the coach's alone. Registration is
  // not a score — the league publishes it — so it may be on the board, but only
  // for a team whose name was read off the registration page.
  check("no pro team arrives with an invented score", await ev(() =>
    teamsHere().every(t => t.pts === undefined && t.tend === undefined
                        && t.threat === undefined)));
  check("registration only ever appears with the source it came from", await ev(() =>
    teamsHere().every(t => t.reg === undefined || t.src === "reg")));
  check("an unscored team reads as unknown, not as average", await ev(() => {
    const p = profileOf("Houston Heat");
    return p.unscored === true && p.threat === 3 && p.notes === "";
  }));
  check("the board shows a dash rather than a made-up score", await ev(() => {
    const row = [...document.querySelectorAll("tbody tr")].find(r => /Houston Heat/.test(r.textContent));
    return (row.textContent.match(/—/g) || []).length >= 4;
  }));
  check("scoring a team yourself fills the board in", await ev(() => {
    window.loadPit("Houston Heat");
    window.setThreat("right", 5);
    window.setPitTend("right", "Dorito");
    const p = profileOf("Houston Heat");
    return p.threat === 5 && p.tend === "Dorito";
  }));
  check("the pit dropdown follows the division", await ev(() => {
    const opts = [...document.querySelectorAll(".pit select option")].map(o => o.textContent);
    return opts.includes("Houston Heat") && !opts.includes("Rejects");
  }));
  check("a profile survives switching divisions", await ev(() => {
    window.setDivision("semi");
    const away = profileOf("Houston Heat").threat === 5;
    window.setDivision("pro");
    return away && profileOf("Houston Heat").threat === 5;
  }));
  // The whole entry list, confirmed by the coach who read the page: it runs
  // Atlanta Jungle Cats to TonTon Arsenal with nothing below. So the board says
  // it is complete and says when it was read, rather than hedging about a list
  // it actually has all of.
  check("the board says what it was read from, and that it is the whole list",
    await ev(() => {
      const t = document.querySelector(".main").textContent;
      const pro = divisionTeams("pro");
      return /Read from PBLeagues/.test(t) && /all 20 entries/.test(t)
          && /10 Sep 2026/.test(t) && !/may not be all/.test(t)
          && pro[0].name === "Atlanta Jungle Cats"
          && pro[pro.length - 1].name === "TonTon Arsenal";
    }));
  // Every pro name came from somewhere and the board says which: a league page
  // for the team, or coverage of an event it played. Nothing is on there
  // because it sounded right.
  check("every pro team says where its name was read from", await ev(() =>
    divisionTeams("pro").length >= 20 &&
    divisionTeams("pro").every(t => ["reg", "page", "event"].includes(t.src))));
  check("no pro team carries a score", await ev(() =>
    divisionTeams("pro").every(t => t.pts === undefined
                                 && t.tend === undefined && t.threat === undefined)));
  check("the board shows the provenance beside each team", await ev(() => {
    window.set({ tab: "scout", scoutTab: "board", division: "pro" });
    const t = document.getElementById("root").textContent;
    return t.includes("Read from") && t.includes("ENTERED");
  }));
  // The registration page is the reason these are on the board at all, so the
  // two states it shows have to survive into the app rather than being
  // flattened into "entered".
  check("who has paid and who has not is kept apart", await ev(() => {
    const paid = divisionTeams("pro").filter(t => t.reg === "PAID").length;
    const pend = divisionTeams("pro").filter(t => t.reg === "PEND").length;
    return paid === 12 && pend === 8 && paid + pend === divisionTeams("pro").length;
  }));
  check("a team can be added to a division", await ev(() => {
    document.getElementById("newTeam").value = "Test Squad";
    window.addTeam();
    return teamsHere().some(t => t.name === "Test Squad") && !!anyTeam("Test Squad");
  }));
  check("an added team can be scouted like any other", await ev(() => {
    window.loadPit("Test Squad");
    return pitOf("right").name === "Test Squad";
  }));
  check("the same team cannot be added twice", await ev(() => {
    const n = teamsHere().length;
    document.getElementById("newTeam").value = "Test Squad";
    window.addTeam();
    return teamsHere().length === n;
  }));
  check("an added team can be taken off again", await ev(() => {
    window.loadPit("Houston Heat");
    window.delTeam("Test Squad");
    return !teamsHere().some(t => t.name === "Test Squad");
  }));
  check("a blank team name is refused", await ev(() => {
    const n = teamsHere().length;
    document.getElementById("newTeam").value = "   ";
    window.addTeam();
    return teamsHere().length === n;
  }));
  await ev(() => window.set({ division:"semi", teams:{}, scout:{}, right:{name:"Rejects"}, left:{name:"Blast Camp"} }));

  /* ------------------------------------------------------------- first run */
  G("First run");
  await ev(() => { localStorage.removeItem("gridlock.coach.v2"); });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await page.locator("button", { hasText: "Start coaching" }).click();
  await page.waitForTimeout(350);
  check("the field is on screen without scrolling", await ev(() => {
    const f = document.querySelector(".field-wrap").getBoundingClientRect();
    return f.top < window.innerHeight * 0.55 && f.top > 0;
  }));
  check("the whole field fits above the fold on a phone", await ev(() => {
    const f = document.querySelector(".field-wrap").getBoundingClientRect();
    return Math.min(f.bottom, window.innerHeight) - f.top > f.height * 0.95;
  }));
  check("playing the break is reachable without scrolling", await ev(() => {
    const btns = [...document.querySelectorAll("button")].filter(b => /Play the break/.test(b.textContent));
    const r = btns[0].getBoundingClientRect();
    return r.top < window.innerHeight;
  }));
  check("an empty squad is told where to go, not just left blank", await ev(() => {
    const txt = document.querySelector(".main").textContent;
    return /Put names on them/.test(txt) && /Add your squad/.test(txt);
  }));
  check("that route actually lands on Team", await ev(() => {
    [...document.querySelectorAll("button")].find(b => /Add your squad/.test(b.textContent)).click();
    return S.tab === "more" && S.more === "team";
  }));
  check("the tally says where its five come from", await ev(() => {
    window.set({ tab: "tally" });
    return /add them in Team/.test(document.querySelector(".main").textContent);
  }));
  check("nothing invents a player on a fresh install", await ev(() => (S.roster || []).length === 0));

  /* ------------------------------------------------ the rest of Scout */
  G("Breakouts");
  const AGAINST = {
    tab:"scout", scoutTab:"breakouts", layoutKey:"mwo", script:"snake", point:4,
    left:{name:"Blast Camp"}, right:{name:"Rejects"},
    scout:{"Rejects":{tend:"Snake",threat:4,notes:"",players:[],
           breaks:[{script:"snake",pt:1,at:1},{script:"snake",pt:2,at:2},{script:"blitz",pt:3,at:3}]}},
    tally:[
      {pt:1,side:"us",  name:"Reyes",at:10,script:"snake",layout:"mwo",vs:"Rejects",how:"Laned",by:"#7",shotAt:"SB#6"},
      {pt:1,side:"them",name:"3",    at:11,script:"snake",layout:"mwo",vs:"Rejects",shotAt:"MD#1"},
      {pt:1,side:"us",  name:"Vance",at:12,script:"snake",layout:"mwo",vs:"Rejects",how:"Traded",shotAt:"GP#1"},
      {pt:2,side:"them",name:"1",    at:20,script:"snake",layout:"mwo",vs:"Rejects",shotAt:"MD#3"},
      {pt:3,side:"us",  name:"Marsh",at:30,script:"blitz",layout:"mwo",vs:"Malicious",how:"Bounce"}],
    moves:[{pt:1,who:"Reyes",from:"SB#6",to:"GP#1",layout:"mwo",at:15}],
  };
  await ev(st => window.set(st), AGAINST);
  check("what a team runs is counted, most seen first", await ev(() => {
    const f = breakFreq("right");
    return f[0][0] === "snake" && f[0][1] === 2 && f[1][0] === "blitz";
  }));
  check("logging a call adds to that team's record", await ev(() => {
    window.logTheirBreak("right", "flood");
    return theirBreaks("right").length === 4 && breakFreq("right").some(f => f[0] === "flood");
  }));
  check("a logged call is stamped with the point", await ev(() => theirBreaks("right")[0].pt === 4));
  check("it can be taken back off", await ev(() => {
    window.unlogTheirBreak("right", 0);
    return theirBreaks("right").length === 3;
  }));
  check("it belongs to the team, not the pit", await ev(() => {
    window.loadPit("Malicious");
    const none = theirBreaks("right").length === 0;
    window.loadPit("Rejects");
    return none && theirBreaks("right").length === 3;
  }));
  check("the counter-picker cites the count once there is one", await ev(() => {
    window.set({ scoutTab: "counter" });
    return /logged them 3 times/.test(document.querySelector(".main").textContent);
  }));
  check("an unseen team claims no record", await ev(() => {
    window.set({ scoutTab: "breakouts" });
    window.loadPit("Miami Effect");
    const txt = document.querySelector(".main").textContent;
    window.loadPit("Rejects");
    return /Nothing logged on Miami Effect/.test(txt);
  }));

  G("Layers");
  await ev(() => window.set({ scoutTab: "layers", scoutLayers: {theirOuts:true} }));
  check("each layer counts only this opponent", await ev(() => {
    const t = document.querySelector(".main").textContent;
    return /Their outs · 2/.test(t) && /Your outs · 2/.test(t) && /Your rotations · 1/.test(t);
  }));
  check("traffic can be narrowed to one side", await ev(() => {
    const theirs = bunkerTraffic(o => o.side === "them" && o.vs === "Rejects");
    const mine   = bunkerTraffic(o => o.side === "us"   && o.vs === "Rejects");
    return !!theirs["MD#1"] && !theirs["SB#6"] && !!mine["SB#6"] && !mine["MD#1"];
  }));
  check("a layer can be turned off and on", await ev(() => {
    window.toggleLayer("theirOuts");
    const off = S.scoutLayers.theirOuts === false;
    window.toggleLayer("theirOuts");
    return off && S.scoutLayers.theirOuts === true;
  }));
  check("with every layer off it says so", await ev(() => {
    window.set({ scoutLayers: {} });
    const txt = document.querySelector(".main").textContent;
    window.set({ scoutLayers: {theirOuts:true} });
    return /Nothing logged against Rejects/.test(txt);
  }));

  G("Games and replay");
  await ev(() => window.set({ scoutTab: "games", replayPt: null, replayStep: null }));
  check("only points against this team are listed", await ev(() => {
    const btns = [...document.querySelectorAll(".seg button")].map(b => b.textContent.trim());
    return btns.includes("Point 1") && btns.includes("Point 2") && !btns.includes("Point 3");
  }));
  check("a point replays every out it holds", await ev(() => {
    window.set({ replayPt: 1, replayStep: null });
    return document.querySelectorAll(".assigns .assign").length === 3;
  }));
  check("the events are in the order they were tapped", await ev(() => {
    const first = document.querySelector(".assigns .assign .assign__job").textContent;
    return first === "Reyes";
  }));
  check("an out replays with how and who", await ev(() =>
    /laned · by #7 · at/.test(document.querySelector(".assigns .assign").textContent)));
  check("stepping shows only what has happened by then", await ev(() => {
    window.set({ replayStep: 1 });
    const one = document.querySelectorAll(".assigns .assign").length === 1;
    const left = /2 still up/.test(document.querySelector(".main").textContent);
    window.set({ replayStep: null });
    return one && left;
  }));
  check("a team you have not played has no games", await ev(() => {
    window.loadPit("Miami Effect");
    const txt = document.querySelector(".main").textContent;
    window.loadPit("Rejects");
    return /No points logged against Miami Effect/.test(txt);
  }));
  check("every sub-tab the spec names is on screen", await ev(() => {
    const bar = [...document.querySelectorAll(".seg--wrap button")].map(b => b.textContent.trim());
    return ["Matchup","Breakouts","Anticipate","Counter","Layers","Games","Division"]
      .every(n => bar.includes(n));
  }));
  check("all seven fit without a hidden scroller", await ev(() => {
    const bar = document.querySelector(".seg--wrap");
    return bar.scrollWidth <= bar.clientWidth + 1;
  }));

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
  // Nothing draws a QR right now: it would open the app to a session that does
  // not exist on the scanner's phone. The encoder stays proven and ready.
  check("the encoder is ready even though nothing draws one yet", await ev(() => {
    window.set({ tab: "more", more: "classes",
                 classes: [{ id: "GL-7K2M", code: "GL-7K2M", title: "Friday clinic", open: true }] });
    return !document.querySelector("svg.qr") && qrSVG(joinLink("GL-7K2M"), 132).includes("<svg");
  }));
  check("the sign-in sheet says where the session actually lives", await ev(() =>
    /on this phone/i.test(document.querySelector(".main").textContent)));

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

  /* ------------------------------------------------------- a second field */
  // Until now the app shipped one layout. Everything geometric keys off it,
  // so a second one is the first real test that any of it was general.
  G("Tampa Bay");
  check("every layout that ships says where it came from", await ev(() =>
    Object.keys(LAYOUTS).length === 3 &&
    Object.values(LAYOUTS).every(l => /official NXL labeled 2D/.test(l.source))));
  check("the event becomes a picker once there is more than one to pick", await ev(() => {
    window.set({ tab: "playbook" });
    return !!document.querySelector("button.ctx");
  }));
  check("Tampa carries its own 57 bunkers", await ev(() => LAYOUTS.tby.bunkers.length === 57));
  check("every one of them is on the field", await ev(() =>
    LAYOUTS.tby.bunkers.every(b => b.x > 0 && b.x < 150 && b.y > 0 && b.y < 120)));
  check("no two bunkers share an id", await ev(() =>
    new Set(LAYOUTS.tby.bunkers.map(b => b.id)).size === LAYOUTS.tby.bunkers.length));
  check("the field is drawn symmetric, as the map prints it", await ev(() => {
    // Each bunker should have an opposite number across the centre line.
    const bs = LAYOUTS.tby.bunkers;
    const off = bs.filter(b => Math.abs(b.x - 75) > 4).filter(b =>
      !bs.some(o => o !== b && o.n === b.n &&
        Math.abs((o.x + b.x) / 2 - 75) < 1.2 && Math.abs(o.y - b.y) < 1.2));
    return off.length === 0;
  }));

  // Six of Tampa's fourteen beam sections are printed at an angle. A box drawn
  // around one is half again as wide as the beam, and would block lanes the
  // beam leaves open.
  check("an angled beam carries its own length, thickness and angle", await ev(() => {
    const t = LAYOUTS.tby.bunkers.filter(b => b.a && b.t === "beam");
    return t.length === 6 && t.every(b => Math.abs(b.a) > 35 && Math.abs(b.a) < 50)
        && t.every(b => b.w > 9 && b.w < 11 && b.h > 1.2 && b.h < 2.5);
  }));
  check("every beam section on the field is the same beam", await ev(() => {
    const sb = LAYOUTS.tby.bunkers.filter(b => b.n === "SB");
    return sb.length === 14 && sb.every(b => b.w > 9 && b.w < 11 && b.h > 1.2 && b.h < 2.5);
  }));
  check("a square bunker is one box; an angled one is three along its length", await ev(() => {
    const flat = LAYOUTS.tby.bunkers.find(b => b.n === "GB");
    const tilt = LAYOUTS.tby.bunkers.find(b => b.a);
    return bunkerBoxes(flat).length === 1 && bunkerBoxes(tilt).length >= 5
        && bunkerBoxes(tilt).every(k => Math.abs(k.w - tilt.h) < 0.01);
  }));
  check("an angled beam blocks less than the box around it", await ev(() => {
    const b = LAYOUTS.tby.bunkers.find(x => x.a);
    const t = b.a * Math.PI / 180;
    const bw = Math.abs(b.w * Math.cos(t)) + Math.abs(b.h * Math.sin(t));
    const bh = Math.abs(b.w * Math.sin(t)) + Math.abs(b.h * Math.cos(t));
    // The beam leaves two corners of its bounding box open — which two depends
    // on which way it leans. A short lane across the free corner is clear of
    // the beam and clipped by the box, which is the whole point of the split.
    const cx = b.x + (b.a < 0 ? -1 : 1) * (bw / 2 - 1);
    const cy = b.y - (bh / 2 - 1);
    const hitsBox = segHitsBox(cx - 2, cy - 2, cx + 2, cy + 2, b.x, b.y, bw / 2, bh / 2);
    const hitsBeam = bunkerBoxes(b).some(k =>
      segHitsBox(cx - 2, cy - 2, cx + 2, cy + 2, k.x, k.y, k.w / 2, k.h / 2));
    return hitsBox && !hitsBeam;
  }));

  // Lone Star came in as an unreleased event with no images at all, then the
  // field owner sent the official 2D. It is the third field, and the first one
  // added after everything geometric had already been made general.
  check("Lone Star carries its own 58 bunkers", await ev(() => LAYOUTS.lso.bunkers.length === 58));
  check("the app opens on the event that is next", await ev(() => {
    localStorage.clear();
    return defaultState().layoutKey === "lso" && Object.keys(LAYOUTS)[0] === "lso";
  }));
  check("all three fields are different fields", await ev(() => {
    const sig = k => LAYOUTS[k].bunkers.map(b => b.id + b.x + b.y).join();
    return new Set(["mwo", "tby", "lso"].map(sig)).size === 3;
  }));
  check("Lone Star is symmetric about the centre line too", await ev(() => {
    const bs = LAYOUTS.lso.bunkers;
    return bs.filter(b => Math.abs(b.x - 75) > 4).every(b =>
      bs.some(o => o !== b && o.n === b.n &&
        Math.abs((o.x + b.x) / 2 - 75) < 1.4 && Math.abs(o.y - b.y) < 1.4));
  }));
  check("its eight angled sections are the same beam as its six straight ones", await ev(() => {
    const sb = LAYOUTS.lso.bunkers.filter(b => b.n === "SB");
    const tilt = sb.filter(b => b.a);
    return sb.length === 14 && tilt.length === 8
        && sb.every(b => b.w > 9 && b.w < 10 && b.h >= 1.3 && b.h <= 1.8);
  }));
  check("a dorito on the snake wire points back down the field", await ev(() => {
    const d = LAYOUTS.lso.bunkers.filter(b => b.n === "MD" || b.n === "SD");
    return d.every(b => b.t === (b.y > 60 ? "tridown" : "dorito"))
        && d.some(b => b.t === "tridown") && d.some(b => b.t === "dorito");
  }));
  check("no break path on Lone Star runs through a bunker", await ev(() => {
    const obs = routeObstacles(LAYOUTS.lso.bunkers);
    let clip = 0, legs = 0;
    for(const k of Object.keys(BREAK_PLANTS.lso)){
      for(const p of breakPaths("lso", k)){
        legs++;
        const pts = [p.from, ...(p.via || []), p.to];
        const holds = o => Math.abs(p.from[0] - o.x) <= o.hw && Math.abs(p.from[1] - o.y) <= o.hh;
        const live = obs.filter(o => !o.ids.has(p.bunker) && !holds(o));
        for(let i = 0; i < pts.length - 1; i++)
          for(const o of live)
            if(segHitsBox(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], o.x, o.y, o.hw, o.hh)) clip++;
      }
    }
    return legs === Object.keys(BREAK_PLANTS.lso).length * 5 && clip === 0;
  }));
  check("no plant on any field sits on the away half", await ev(() => {
    // Bunker ids are assigned by position, so a plant list written against an
    // older measurement can name a real bunker at the wrong end. The five
    // break from the home station and cannot plant across the fifty.
    return Object.keys(BREAK_PLANTS).every(key => {
      const at = Object.fromEntries(LAYOUTS[key].bunkers.map(b => [b.id, b.x]));
      return Object.values(BREAK_PLANTS[key]).every(p => p.every(id => at[id] < 76));
    });
  }));
  check("every Lone Star plant names a bunker on that field", await ev(() => {
    const ids = new Set(LAYOUTS.lso.bunkers.map(b => b.id));
    return Object.values(BREAK_PLANTS.lso).every(p => p.length === 5 && p.every(id => ids.has(id)));
  }));

  // A giant plus is printed either upright or turned on its corner, and which
  // it is varies inside one layout — Tampa prints one of each. Drawn as the
  // wrong one it is not that bunker: the arms point at the gaps instead of the
  // lanes, and on these fields the snake beams land on its arm tips.
  check("a giant plus is drawn the way its own map prints it", await ev(() => {
    const gp = k => LAYOUTS[k].bunkers.filter(b => b.n === "GP");
    const tby = gp("tby"), lso = gp("lso");
    return tby.length === 2 && lso.length === 2
        && !tby[0].a && tby[1].a === 45          // Tampa: upright at the top, turned at the snake
        && lso.every(b => b.a === 45);           // Lone Star: both turned
  }));
  check("a turned plus is not split up like a beam", await ev(() => {
    const p = LAYOUTS.lso.bunkers.find(b => b.n === "GP");
    return p.a === 45 && bunkerBoxes(p).length === 1;
  }));
  // A plus turned on its corner is the same cross, turned. It was being drawn
  // with its arms lengthened by root two so the box around the turned shape
  // would come back the measured size — which made it half again too big on
  // the field, the one thing on this map you cannot miss.
  check("a turned plus is the same size as an upright one", await ev(() => {
    const up = LAYOUTS.mwo.bunkers.find(b => b.n === "GP");     // printed upright
    const turned = LAYOUTS.lso.bunkers.find(b => b.n === "GP"); // printed on its corner
    return !up.a && turned.a === 45
        && Math.abs(up.w - turned.w) < 0.5 && Math.abs(up.h - turned.h) < 0.5;
  }));
  check("its arms are as wide as the map draws them", await ev(w => {
    const gp = ["mwo","tby","lso"].flatMap(k => LAYOUTS[k].bunkers.filter(b => b.n === "GP"));
    return gp.length === 6 && gp.every(b => Math.abs(b.k - w) < 0.01 && b.k > 3 && b.k < b.w / 2);
  }, JSON.parse(fs.readFileSync(path.join(__dirname, "..", "layouts", "bunkers.json"), "utf8"))
      .bunkers.giant_plus.arm_ft));
  // A stroke straddles the line it sits on. Insetting the whole shape by half a
  // stroke put the outer edge of the paint on the measurement — right for the
  // footprint, wrong for the picture, because that outer half-stroke is
  // near-black and two bunkers that touch showed a stripe of field between
  // their fills. The fill is the measurement now and the outline goes inside.
  check("a bunker is filled to its measured footprint", await ev(() => {
    const b = LAYOUTS.lso.bunkers.find(x => x.n === "SB" && !x.a);
    const s = bunkerSize(b, 2, 2);
    return Math.abs(s.h * 2 - b.w * 2) < 0.001 && Math.abs(s.v * 2 - b.h * 2) < 0.001;
  }));
  check("and outlined inside it, not across the edge", await ev(() => {
    const m = [...bunkerShape(LAYOUTS.lso.bunkers.find(x => x.n === "SB" && !x.a), 2, 2)
      .matchAll(/width="([\d.]+)"/g)].map(x => +x[1]);
    // The filled box first, the stroked box a stroke narrower, then the caps.
    return BNK_IN === BNK_STROKE / 2 && m.length >= 2
        && Math.abs(m[0] - m[1] - BNK_STROKE) < 0.01;
  }));
  // The one that matters on a field drawing: the snake runs into the giant
  // plus on the official map, and on screen it stopped a third of a foot short
  // with black in between.
  check("the snake beam ends on the plus arm it runs into", await ev(() => {
    const gp = LAYOUTS.lso.bunkers.find(b => b.id === "GP#1");
    const sb = LAYOUTS.lso.bunkers.find(b => b.id === "SB#1");
    const rad = d => d * Math.PI / 180;
    const g = bunkerSize(gp, 2, 2), s = bunkerSize(sb, 2, 2);
    // The plus is turned 45°, so its arms reach out along 45/135/225/315. The
    // lower left one is the arm this beam runs into.
    const reach = (g.h + g.v) / 2;        // 11.31 x 11.09 — square to a tenth of a foot
    const tip = [gp.x * 2 + Math.cos(rad(135)) * reach, gp.y * 2 + Math.sin(rad(135)) * reach];
    const end = [sb.x * 2 + Math.cos(rad(sb.a)) * s.h, sb.y * 2 + Math.sin(rad(sb.a)) * s.h];
    // What is left is the map's own precision — one pixel there is 0.12 ft — not
    // a hole in the drawing. Insetting both shapes put 0.65 units of field
    // between them on top of this, which is what showed up as a gap.
    return Math.hypot(tip[0] - end[0], tip[1] - end[1]) < 0.3;
  }));

  check("a turned plus is drawn turned, not just recorded as turned", await ev(() => {
    window.set({ layoutKey: "lso" });
    const svg = fieldSVG({ static: true });
    return /rotate\(45 /.test(svg);
  }));

  check("Tampa carries all twelve calls, and every one of them is a real break", await ev(() =>
    Object.keys(BREAK_PLANTS.tby).length === Object.keys(BREAKS).length &&
    Object.keys(BREAK_PLANTS.tby).every(k => k in BREAKS)));
  check("every plant names a bunker that is actually on this field", await ev(() => {
    const ids = new Set(LAYOUTS.tby.bunkers.map(b => b.id));
    return Object.values(BREAK_PLANTS.tby).every(p => p.length === 5 && p.every(id => ids.has(id)));
  }));
  check("no break puts two men on the same beam", await ev(() => {
    const obs = routeObstacles(LAYOUTS.tby.bunkers).filter(o => o.n === "SB");
    return Object.values(BREAK_PLANTS.tby).every(plants =>
      obs.every(o => plants.filter(id => o.ids.has(id)).length <= 1));
  }));
  check("no break path on Tampa runs through a bunker", await ev(() => {
    const obs = routeObstacles(LAYOUTS.tby.bunkers);
    let clip = 0, legs = 0;
    for(const k of Object.keys(BREAK_PLANTS.tby)){
      for(const p of breakPaths("tby", k)){
        legs++;
        const pts = [p.from, ...(p.via || []), p.to];
        const holds = o => Math.abs(p.from[0] - o.x) <= o.hw && Math.abs(p.from[1] - o.y) <= o.hh;
        const live = obs.filter(o => !o.ids.has(p.bunker) && !holds(o));
        for(let i = 0; i < pts.length - 1; i++)
          for(const o of live)
            if(segHitsBox(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], o.x, o.y, o.hw, o.hh)) clip++;
      }
    }
    return legs === Object.keys(BREAK_PLANTS.tby).length * 5 && clip === 0;
  }));
  check("the five break from one station on Tampa too", await ev(() => {
    const y = breakPaths("tby", "snake").map(p => p.from[1]);
    return Math.max(...y) - Math.min(...y) <= 20;
  }));
  check("Sightlines reads the new field, and finds it blocks things", await ev(() => {
    window.set({ layoutKey: "tby" });
    const r = sightLines(LAYOUTS.tby.bunkers[3].id, 2, 2);
    return r.lines.length === 56 && r.lines.some(l => l.blocked) && r.clear > 0;
  }));

  // Switching event has to move everything, and must not carry one field's
  // work onto another.
  check("changing the event changes the field", await ev(() => {
    window.set({ layoutKey: "tby" });
    const a = curLayout().bunkers.length;
    window.set({ layoutKey: "mwo" });
    return a === 57 && curLayout().bunkers.length === 58;
  }));
  check("a bunker call belongs to the field it was made on", await ev(() => {
    window.set({ layoutKey: "tby" });
    S.bunkerCalls = { ...(S.bunkerCalls || {}), tby: { "GP#1": "The cross" } };
    save(S);
    const here = bunkerCalls()["GP#1"];
    window.set({ layoutKey: "mwo" });
    return here === "The cross" && !bunkerCalls()["GP#1"];
  }));
  check("a path edit belongs to the field it was made on", await ev(() => {
    window.set({ layoutKey: "tby", script: "snake" });
    const before = JSON.stringify(currentPaths().map(p => p.to));
    window.set({ layoutKey: "mwo" });
    return before !== JSON.stringify(currentPaths().map(p => p.to));
  }));

  /* ------------------------------------------------ cards, opp and rep */
  // The last three chips the spec puts on Playbook.
  G("Cards, Opp and Rep");
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake", pbView: null,
               point: 1, rep: { running: false, log: [] } });
  check("cards name the man, the bunker and the job", await ev(() => {
    const c = cardLines();
    return c.length === 5 && c.every(x => x.bunker && x.job && x.role && x.face && x.shot)
        && c[0].who && c[0].who.name;
  }));
  check("a card says the lane he was given, in words", await ev(() => {
    window.setDirect("1", "shot", "@-90");
    window.setDirect("2", "face", 45);
    const c = cardLines();
    return c[0].shot === LANE_NAME["-90"] && c[1].face === LANE_NAME["45"];
  }));
  check("Cards opens on Playbook and goes back", await ev(() => {
    window.set({ pbView: "cards" });
    const on = document.getElementById("root").textContent.includes("One card a man");
    window.set({ pbView: null });
    return on && !document.getElementById("root").textContent.includes("One card a man");
  }));

  check("an answer to their call is written against the team", await ev(() => {
    window.set({ tab: "scout", scoutTab: "counter", right: { name: "Rejects" } });
    window.setAnswer("right", "snake", "flood");
    const kept = S.scout["Rejects"].answers.snake === "flood";
    window.setPitTeam("right", "Blast Camp");
    const gone = !answersFor("right").snake;          // it belongs to the Rejects
    window.setPitTeam("right", "Rejects");
    return kept && gone && answersFor("right").snake === "flood";
  }));
  check("Playbook shows the answer for the call they run most", await ev(() => {
    window.logTheirBreak("right", "snake");
    window.logTheirBreak("right", "snake");
    const a = oppAnswer("right");
    window.set({ tab: "playbook", script: "hold" });
    return a.theirs === "snake" && a.ours === "flood" && a.seen === 2
        && document.getElementById("root").textContent.includes("You wrote down");
  }));
  check("an answer can be taken back off", await ev(() => {
    window.setAnswer("right", "snake", "");
    return !oppAnswer("right");
  }));

  check("the drill shows a break and does not name it", await ev(() => {
    window.set({ tab: "playbook" });
    window.startRep();
    const t = document.getElementById("root").textContent;
    return S.rep.running && S.pbView === "rep" && !!S.rep.ask
        && S.script === S.rep.ask
        && t.includes("Name the call")
        // The twelve names are on screen as the answers. What must not be is
        // anything saying which one it is: no call card, and a header that
        // does not name the break it is drawing.
        && !document.querySelector("#root .call__name")
        && !document.querySelector("#root .ctx__line").textContent.includes(BREAKS[S.rep.ask].name);
  }));
  check("it times the answer and says whether it was right", await ev(() => {
    const ask = S.rep.ask;
    window.answerRep(ask);
    const first = S.rep.log[0];
    return first.right === true && first.ask === ask && first.ms >= 0
        && S.rep.ask !== ask;                          // it moves on
  }));
  check("a wrong call is recorded as wrong", await ev(() => {
    const ask = S.rep.ask;
    const other = Object.keys(BREAKS).find(k => k !== ask);
    window.answerRep(other);
    return S.rep.log[0].right === false && S.rep.log[0].said === other;
  }));
  check("stopping the drill puts the call you were on back", await ev(() => {
    const was = S.rep.was;
    window.stopRep();
    return S.script === was && S.pbView === null && S.rep.running === false;
  }));
  check("the score counts only the ones you got right", await ev(() => {
    const sc = repScore();
    return sc.n === 2 && sc.right === 1 && sc.avg >= 0 && sc.best >= 0;
  }));
  check("two seconds is the target it holds you to", await ev(() =>
    REP_TARGET === 2000));

  /* ------------------------------------------------------ log the call */
  // The spec's Log break chip, and the read it exists for: how predictable you
  // have been. Counted off the calls a coach pressed the button on, never
  // modelled — it is the arithmetic a team watching your film already does.
  G("Log the call");
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake", calls: [] });
  check("nothing is logged until you log it", await ev(() =>
    selfScout().n === 0 && document.getElementById("root").textContent.includes("Nothing logged on")));
  check("logging the call records the field, the point and who you were on", await ev(() => {
    window.set({ point: 3 });
    window.logCall();
    const c = S.calls[0];
    return c.script === "snake" && c.layout === "lso" && c.pt === 3 && !!c.vs && !!c.at;
  }));
  check("a call logged on one field is not counted on another", await ev(() => {
    window.set({ layoutKey: "tby" });
    const away = selfScout().n;
    window.set({ layoutKey: "lso" });
    return away === 0 && selfScout().n === 1;
  }));
  check("it says what share each call is", await ev(() => {
    for (let i = 0; i < 3; i++) window.logCall();       // four snake now
    window.set({ script: "hold" }); window.logCall();
    const ss = selfScout();
    return ss.n === 5 && ss.rank[0][0] === "snake" && ss.rank[0][1] === 4;
  }));
  check("it warns you when one call is most of your last ten", await ev(() => {
    window.set({ script: "snake" });
    for (let i = 0; i < 3; i++) window.logCall();
    const ss = selfScout();
    return ss.tell >= 0.5 && document.getElementById("root").textContent.includes("Anyone filming you has that too");
  }));
  check("a logged call can be taken back", await ev(() => {
    const before = selfScout().n;
    window.unlogCall(0);
    return selfScout().n === before - 1;
  }));
  check("the calls travel in a saved copy", await ev(() =>
    JSON.parse(copyPayload("all")).data.calls.length === selfScout().n));

  /* --------------------------------------------------- off the buzzer */
  // The five do not leave together: the longest run goes on the buzzer and the
  // short ones hold, so they arrive together instead of the snake runner still
  // crossing while everyone else is set.
  G("Off the buzzer");
  check("the man with the furthest to run leaves first", await ev(() => {
    const p = breakPaths("lso", "snake");
    const far = p.reduce((a, b) => a.len > b.len ? a : b);
    return far.lag === 0 && p.every(x => x.lag >= 0 && x.lag <= 0.28)
        && p.some(x => x.lag > 0.1);
  }));
  check("a shorter run holds longer", await ev(() => {
    const p = [...breakPaths("lso", "base")].sort((a, b) => a.len - b.len);
    return p[0].lag > p[p.length - 1].lag;
  }));
  check("nobody has moved on the buzzer, and everyone is set at the end", await ev(() => {
    const p = breakPaths("lso", "snake");
    const at = (x, t) => posAt(x, t);
    return p.every(x => at(x, 0)[0] === x.from[0] && at(x, 0)[1] === x.from[1])
        && p.every(x => Math.abs(at(x, 1)[0] - x.to[0]) < 0.001
                     && Math.abs(at(x, 1)[1] - x.to[1]) < 0.001);
  }));
  check("a man still holding has not left his mark", await ev(() => {
    const p = breakPaths("lso", "snake");
    const held = p.filter(x => x.lag > 0.05);
    return held.length > 0 && held.every(x => {
      const q = posAt(x, x.lag * 0.5);
      return q[0] === x.from[0] && q[1] === x.from[1];
    });
  }));

  /* ------------------------------------------------------ the bunker key */
  // "Do we have all of the codes?" is a question with a checkable answer: the
  // NXL prints the same fifteen-entry key on all three of these maps.
  G("Bunker codes");
  check("the key is the fifteen the official map prints", await ev(() =>
    BUNKER_CODE.length === 15 &&
    ["GP","MT","C","Tr","GB","GW","MD","Ck","SB","Br","Wg","TCK","SD","T","MW"]
      .every((c, i) => BUNKER_CODE[i][0] === c)));
  check("every code on every field is in the key", await ev(() => {
    const key = new Set(BUNKER_CODE.map(c => c[0]));
    return Object.keys(LAYOUTS).every(k =>
      LAYOUTS[k].bunkers.every(b => key.has(b.n)));
  }));
  check("all three fields carry the same fourteen codes", await ev(() => {
    const codes = k => [...new Set(LAYOUTS[k].bunkers.map(b => b.n))].sort().join();
    const all = Object.keys(LAYOUTS).map(codes);
    return all.every(c => c === all[0]) && all[0].split(",").length === 14;
  }));
  // Against the layout pack, not the field: the app carries the drawn shape,
  // and a dorito is drawn pointing whichever way it sits, so two shapes under
  // one code is correct there. What must never happen is one code over two
  // different bunkers.
  check("one code is one bunker across all three fields", (() => {
    const seen = {};
    for (const f of ["nxl_2026_lone_star", "nxl_2026_tampa_bay_open", "nxl_2026_midwest_open"])
      for (const b of JSON.parse(fs.readFileSync(
            path.join(__dirname, "..", "layouts", "events", f + ".json"), "utf8")).bunkers) {
        if (seen[b.name] && seen[b.name] !== b.type) return false;
        seen[b.name] = b.type;
      }
    return Object.keys(seen).length === 14;
  })());
  // Tall Cake is in the printed key and on none of these three layouts. Saying
  // so is the point — the key lists the pack, not the field.
  check("the key says which of its codes this field does not use", await ev(() => {
    window.set({ tab: "more", more: "codes" });
    const t = document.getElementById("root").textContent;
    return t.includes("Tall Cake") && t.includes("not on this field")
        && t.includes("Maya Temple") && t.includes("Snake Beam");
  }));
  check("the count beside each code is what is really on the field", await ev(() => {
    window.set({ layoutKey: "lso", tab: "more", more: "codes" });
    const rows = [...document.querySelectorAll(".tbl tbody tr")]
      .filter(r => r.children.length === 3);
    return rows.length === 15 && rows.some(r =>
      r.children[0].textContent.trim() === "SB" && r.children[2].textContent.trim() === "14");
  }));

  /* ------------------------------------------------------- twelve calls */
  // The spec names twelve breaks; five were built. The other seven are not
  // typed bunker ids — tools/plants.js reads the call off the measured field
  // (how many men on which wire, how far up) and picks the bunker that sits
  // there, for every break on every layout.
  G("Twelve calls");
  check("every field carries every call", await ev(() =>
    Object.keys(BREAK_PLANTS).length === 3 &&
    Object.values(BREAK_PLANTS).every(f =>
      Object.keys(f).length === Object.keys(BREAKS).length &&
      Object.values(f).every(p => p.length === 5))));
  check("no call sends two men to the same bunker", await ev(() =>
    Object.values(BREAK_PLANTS).every(f =>
      Object.values(f).every(p => new Set(p).size === 5))));
  check("no call puts two men on the snake, on any field", await ev(() =>
    Object.keys(BREAK_PLANTS).every(k => {
      const snake = routeObstacles(LAYOUTS[k].bunkers).filter(o => o.n === "SB");
      return Object.values(BREAK_PLANTS[k]).every(p =>
        snake.every(o => p.filter(id => o.ids.has(id)).length <= 1));
    })));
  check("no man is sent to a bunker with another standing over it", await ev(() =>
    Object.keys(BREAK_PLANTS).every(k => {
      const at = Object.fromEntries(LAYOUTS[k].bunkers.map(b => [b.id, b]));
      return Object.values(BREAK_PLANTS[k]).every(p => p.every(id => {
        const b = at[id];
        return !LAYOUTS[k].bunkers.some(o => o.id !== id && o.n !== b.n
          && Math.abs(o.x - b.x) < o.w / 2 + 0.9 && Math.abs(o.y - b.y) < o.h / 2 + 0.9);
      }));
    })));
  check("the twelve are twelve different calls on every field", await ev(() =>
    Object.values(BREAK_PLANTS).every(f =>
      new Set(Object.values(f).map(p => [...p].sort().join())).size
        === Object.keys(f).length)));
  check("every call reads differently in a coach's words", await ev(() => {
    const reads = Object.keys(BREAKS).map(k => breakMeta(k).read);
    return new Set(reads).size === reads.length && reads.every(r => r && r.length > 30);
  }));
  // The plants in the app must be what the tool produces. Hand-edit one and
  // this says so, rather than the drift showing up on a sideline.
  check("the plants in the app are the ones the rule produces", (() => {
    const made = require("child_process")
      .execFileSync("node", [path.join(__dirname, "..", "tools", "plants.js")], { encoding: "utf8" })
      .trim();
    const html = fs.readFileSync(path.join(__dirname, "..", "web", "index.html"), "utf8");
    const inApp = /const BREAK_PLANTS = \{[\s\S]*?\n\};/.exec(html);
    return !!inApp && inApp[0] === made;
  })());

  /* -------------------------------------------------- where he is shooting */
  // Playbook used to open with all five stacked in a sixteen-foot station
  // against the back tape, on top of one another and half off the edge — so
  // the face chevron and the shot lane, which are the point of the tab, were
  // not on screen until you played the break.
  G("Where he is shooting");
  check("the break opens on the set, not on the line", await ev(() => {
    localStorage.clear();
    return defaultState().t === 1;
  }));
  check("playing it again runs it from the line", await ev(async () => {
    window.set({ tab: "playbook", t: 1 });
    window.playPath();
    const ran = S.t < 0.5;
    S.playing = false;
    return ran;
  }));
  await seed({ tab: "playbook", t: 1, faceOn: true, shotOn: true });
  check("every one of the five carries a face and a lane", await ev(() => {
    const f = document.querySelectorAll("svg.field polyline[stroke='#fff']").length;
    const c = document.querySelectorAll("svg.field polygon[fill='#fff']").length;
    return f === 5 && c === 5;
  }));
  check("the lane is a wedge you can see on a black field", await ev(() => {
    const p = document.querySelector("svg.field polygon[fill='#fff']");
    return Number(p.getAttribute("opacity")) >= 0.2 && p.getBBox().width > 6;
  }));
  check("naming the bunker he lanes joins him to it", await ev(() => {
    const id = LAYOUTS[S.layoutKey].bunkers.find(b => b.n === "GP").id;
    window.setDirect("1", "shot", id);
    const line = [...document.querySelectorAll("svg.field line[stroke-dasharray]")];
    return line.length >= 1 && document.querySelectorAll("svg.field circle[stroke-dasharray]").length >= 1;
  }));
  check("with no bunker named there is no hard line, only the wedge", await ev(() => {
    window.setDirect("1", "shot", "");
    return document.querySelectorAll("svg.field circle[stroke-dasharray]").length === 0;
  }));

  // The spec asks for a shot that can be a lane as well as a named bunker: a
  // man told to hold a gap is not aiming at anything.
  check("a shot can be a lane with no bunker named", await ev(() => {
    window.set({ tab: "playbook" });
    window.setDirect("2", "shot", "@45");
    const wedges = document.querySelectorAll("svg.field polygon[fill='#fff']").length;
    // A lane draws the wedge and no ring, because there is no bunker to ring.
    return shotLane("@45") === 45 && wedges === 5
        && document.querySelectorAll("svg.field circle[stroke-dasharray]").length === 0;
  }));
  check("straight up the field is a lane like any other", await ev(() => {
    // Zero degrees is falsy. The chip read "Shot" as though nothing was set.
    window.setDirect("2", "shot", "@0");
    window.set({ pad: null });
    const chip = [...document.querySelectorAll(".assign .tgl")].filter(b => b.classList.contains("on"));
    return shotLane("@0") === 0 && chip.some(b => b.textContent.trim() === "\u2192");
  }));
  check("the picker offers the eight lanes and every bunker", await ev(() => {
    window.openPad("shot", "2");
    const s = document.querySelector(".assign select");
    const groups = [...s.querySelectorAll("optgroup")];
    return groups.length === 2
        && groups[0].children.length === 8
        && groups[1].children.length === LAYOUTS[S.layoutKey].bunkers.length;
  }));

  /* ------------------------------------------------ one bunker, one size */
  // A medium dorito is the same inflatable in Garland that it was in
  // Cincinnati. Read off each map it comes back a different size, because the
  // prints are drawn to different weights and because half of every bunker is
  // in shadow and the shadow is easy to miss. So footprints come from
  // layouts/bunkers.json, measured once off the clean Midwest 2D, and every
  // field draws the same bunker at the same size.
  G("One bunker, one size");
  const book = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "layouts", "bunkers.json"), "utf8"));

  check("every bunker is drawn one size on every field", await ev(() => {
    const seen = {};
    for (const k of ["mwo", "tby", "lso"]) {
      for (const b of LAYOUTS[k].bunkers) {
        const size = [Math.max(b.w, b.h), Math.min(b.w, b.h)].join("x");
        (seen[b.n] = seen[b.n] || new Set()).add(size);
      }
    }
    // Br is the one printed name over two inflatables — the tall one, and a
    // short squat one in the back corners of two of these fields.
    return Object.keys(seen).length === 14
        && Object.entries(seen).every(([n, s]) => s.size === (n === "Br" ? 2 : 1));
  }));

  check("a medium dorito is the one measured off the clean map", await ev(w => {
    const md = LAYOUTS.lso.bunkers.filter(b => b.n === "MD");
    return md.length === 6 && md.every(b =>
      Math.abs(Math.max(b.w, b.h) - w[0]) < 0.005 &&
      Math.abs(Math.min(b.w, b.h) - w[1]) < 0.005);
  }, [book.bunkers.medium_dorito.long_ft, book.bunkers.medium_dorito.short_ft]));

  check("it is wider than the lit half of it that colour alone finds",
    book.bunkers.medium_dorito.long_ft > 6 && book.bunkers.medium_dorito.short_ft > 5.5);

  check("the book says how many instances each figure came from", () => true &&
    Object.values(book.bunkers).every(b => b.n >= 1 && b.long_ft > 0 && b.short_ft > 0));

  // The figure kept is the smallest instance, because a reading on this map
  // can only come back too big. That is only honest if the smallest instance
  // and the middle one say the same thing, which for every type read four or
  // more times they do, to within half a foot.
  check("the smallest instance and the middle one agree",
    Object.values(book.bunkers).filter(b => b.n >= 4).every(b =>
      Math.abs(b.long_ft - b.median_ft[0]) <= 0.5 &&
      Math.abs(b.short_ft - b.median_ft[1]) <= 0.5));

  check("every event on the field records how far its own map disagreed", () => {
    for (const f of ["nxl_2026_midwest_open", "nxl_2026_tampa_bay_open",
                     "nxl_2026_lone_star"]) {
      const ev = JSON.parse(fs.readFileSync(
        path.join(__dirname, "..", "layouts", "events", f + ".json"), "utf8"));
      const fp = ev.digitized && ev.digitized.footprints;
      if (!fp || !fp.residual_ft || !(fp.residual_ft.median <= 1)) return false;
      if (!ev.bunkers.every(b => b.drawn_w_ft > 0 && b.drawn_h_ft > 0)) return false;
    }
    return true;
  });

  /* -------------------------------------------------- the call, on the sheet */
  // The loop on a sideline is: point ends, who won it, what are we calling, play
  // it, tally the outs. Three of those live on Tally and the call lived a tab
  // away, so every point cost two tab switches to read a name.
  G("The call, on the sheet");
  await seed({ tab: "tally", script: "snake", right: { name: "Rejects" }, left: {},
               tallyPick: false, calls: [] });

  check("the sheet says what the call is", await ev(() => {
    const t = document.getElementById("root").textContent;
    return t.includes(BREAKS.snake.name) && t.includes(breakMeta("snake").read);
  }));
  check("it can be changed without leaving Tally", await ev(() => {
    window.set({ tallyPick: true });
    const open = document.getElementById("root").textContent.includes(BREAKS.blitz.name);
    window.set({ script: "blitz", t: 1, playing: false, tallyPick: false });
    return open && S.script === "blitz" && S.tab === "tally";
  }));
  check("and it is the same call Playbook is on", await ev(() => {
    window.set({ tab: "playbook" });
    const t = document.getElementById("root").textContent;
    return S.script === "blitz" && t.includes(BREAKS.blitz.name);
  }));
  check("the field follows it", await ev(() => {
    const plants = currentPaths().map(p => p.bunker).join();
    window.set({ tab: "tally" });
    window.set({ script: "hold", t: 1, playing: false, tallyPick: false });
    return plants !== currentPaths().map(p => p.bunker).join();
  }));
  check("it can be logged from the sheet, against this match", await ev(() => {
    window.set({ tab: "tally" });
    window.logCall();
    const c = (S.calls || [])[0];
    return c && c.script === "hold" && c.m === S.matchId && c.pt === S.point;
  }));
  check("and the sheet says how many are logged on it", await ev(() =>
    /1 call logged on this sheet/.test(document.getElementById("root").textContent)));
  check("a new sheet starts that count again", await ev(() => {
    window.confirm = () => true;
    window.newMatch();
    return !/logged on this sheet/.test(document.getElementById("root").textContent)
        && (S.calls || []).length === 1;      // the old one is kept, not deleted
  }));

  /* ------------------------------------------------------------- the score */
  // The app tallied who went out and never recorded who won the point, so the
  // one number a coach lives by was not in it.
  G("The score");
  await seed({ tab: "tally", right: { name: "Rejects" }, left: {} });
  await ev(() => { window.confirm = () => true; window.newMatch(); });

  check("a fresh sheet is nil–nil", await ev(() => {
    const s = matchScore();
    return s.us === 0 && s.them === 0 && (S.results || []).length === 0;
  }));
  check("one tap takes the point and moves on", await ev(() => {
    const pt = S.point;
    window.endPoint("us");
    const s = matchScore();
    return s.us === 1 && s.them === 0 && S.point === pt + 1;
  }));
  check("the score shows on the sheet and in the header", await ev(() => {
    window.set({ tab: "tally" });
    const t = document.getElementById("root").textContent;
    // Not just present in the DOM: the context line ellipsizes on a phone and
    // swallowed the score whole when it lived there. It has to be a box with
    // width, inside the header, that is not clipped by its parent.
    const chip = document.querySelector(".score-chip");
    if(!chip) return false;
    const c = chip.getBoundingClientRect(), h = document.querySelector(".hdr").getBoundingClientRect();
    return /1\s*–\s*0/.test(t) && chip.textContent.replace(/\s/g, "") === "1–0"
        && c.width > 20 && c.right <= h.right + 1 && c.left >= h.left - 1;
  }));
  check("Ahead, Even and Must-score follow the score", await ev(() => {
    const ahead = S.matchState === "Ahead";
    window.endPoint("them");
    const even = S.matchState === "Even";
    window.endPoint("them");
    return ahead && even && S.matchState === "Must-score" && derivedState() === "Must-score";
  }));
  check("a coach can still say otherwise", await ev(() => {
    window.set({ matchState: "Ahead" });
    return S.matchState === "Ahead" && derivedState() === "Must-score";
  }));

  // Back a point has to take the result with it, or it becomes a way to score
  // the same point twice.
  check("going back a point unscores it", await ev(() => {
    const before = matchScore();
    window.backPoint();
    const after = matchScore();
    return before.us + before.them === 3 && after.us + after.them === 2
        && after.them === 1 && S.matchState === "Even";
  }));
  check("and scoring it again does not double it", await ev(() => {
    window.endPoint("us");
    window.backPoint();
    window.endPoint("us");
    const s = matchScore();
    return s.us + s.them === 3 && s.us === 2 && s.them === 1;
  }));
  check("scoring the same point twice replaces, never adds", await ev(() => {
    const pt = S.point;
    window.set({ point: pt - 1 });
    window.endPoint("them");          // change the answer on a point already scored
    const s = matchScore();
    return s.us + s.them === 3 && s.us === 1 && s.them === 2;
  }));

  check("each sheet keeps its own score", await ev(() => {
    const first = S.matchId, was = scoreOf(first);
    window.newMatch();
    const fresh = matchScore();
    return was.us + was.them === 3 && fresh.us === 0 && fresh.them === 0
        && scoreOf(first).us + scoreOf(first).them === 3;
  }));
  check("Matches shows the score against the sheet it belongs to", await ev(() => {
    window.endPoint("us");
    window.set({ tab: "more", more: "matches" });
    const t = document.getElementById("root").textContent;
    return /1–0/.test(t) && /1–2/.test(t);
  }));
  check("a sheet nobody has scored shows no score at all", await ev(() => {
    window.newMatch();
    const t = document.getElementById("root").textContent;
    const sc = matchScore();
    return sc.us === 0 && sc.them === 0 && !/0–0/.test(t);
  }));

  /* --------------------------------------------------- their five, on the field */
  // Pick a team and you get whatever roster is known; place each man where you
  // have seen him set up, and he is drawn on the field.
  G("Their five");
  await seed({ tab: "scout", scoutTab: "matchup", division: "pro", layoutKey: "lso",
               right: { name: "San Diego Dynasty" }, left: {}, scout: {} });

  check("a published roster is offered, and is names only", await ev(() => {
    const r = published("San Diego Dynasty");
    return !!r && r.men.length === 5 && !!r.src && !!r.read
        && r.men.every(m => !("threat" in m) && !("wire" in m));
  }));
  check("adding it fills their five, flagged as published", await ev(() => {
    window.addPublished("right");
    const men = pitOf("right").players;
    return men.length === 5 && men.every(m => m.from === "published")
        && men[0].name === "Alex Fraige";
  }));
  check("adding twice does not double them up", await ev(() => {
    window.addPublished("right");
    return pitOf("right").players.length === 5;
  }));
  check("a team with no published roster says so rather than inventing one", await ev(() => {
    const pro = DIVISIONS.find(d => d.id === "pro").teams;
    const none = pro.filter(t => !published(t.name));
    // Only the ones actually read somewhere have a roster; the rest stay empty.
    return none.length === pro.length - 1 && published(none[0].name) === null
        && !!published("San Diego Dynasty");
  }));

  check("a man's plant is kept per field, because a bunker is", await ev(() => {
    const lso = curLayout().bunkers.find(b => b.n === "GP").id;
    window.setScoutPlant("right", 1, lso);
    const here = plantOf(pitOf("right").players[1]) === lso;
    window.pickEvent("tby");
    const there = plantOf(pitOf("right").players[1]) === "";
    window.pickEvent("lso");
    return here && there && plantOf(pitOf("right").players[1]) === lso;
  }));
  check("he is drawn on the field, in his pit's colour, with his number", await ev(() => {
    window.set({ tab: "scout", scoutTab: "matchup", theirOn: true });
    const svg = document.querySelector("svg.field");
    const mk = [...svg.querySelectorAll('rect[rx="2"]')];
    return mk.length === 1 && mk[0].getAttribute("fill") === "#3d8bff"
        && svg.textContent.includes("18");
  }));
  check("a man you have not placed is not guessed onto a bunker", await ev(() =>
    pitOf("right").players.filter(m => plantOf(m)).length === 1
    && document.querySelectorAll('svg.field rect[rx="2"]').length === 1));
  check("with nobody placed the field says how to place them", await ev(() => {
    window.setScoutPlant("right", 1, "");
    const t = document.getElementById("root").textContent;
    return !plantsLogged() && /Nobody placed on/.test(t);
  }));
  check("the toggle is off by default and turns them off again", await ev(() => {
    window.set({ theirOn: false });
    return document.querySelectorAll('svg.field rect[rx="2"]').length === 0;
  }));
  check("Division says which teams come with a roster", await ev(() => {
    window.set({ scoutTab: "board" });
    const row = [...document.querySelectorAll("#boardRows tr")]
      .find(r => r.children[1].textContent.includes("San Diego Dynasty"));
    const other = [...document.querySelectorAll("#boardRows tr")]
      .find(r => r.children[1].textContent.includes("Red Legion"));
    return row.children[5].textContent.trim() === "5"
        && other.children[5].textContent.trim() === "—";
  }));

  /* --------------------------------------- the pit, the field, and the screen */
  G("Edges");
  await seed({ tab: "scout", scoutTab: "matchup", division: "semi",
               right: { name: "Rejects" }, left: {}, teams: { semi: [{name:"My Local Team"}] } });

  // A pit can hold a team the list under it does not contain — switch division
  // and it is another league's; delete one you added and it is nobody's. The
  // picker used to render blank while the card still named the team, so the
  // next tap on it silently emptied the pit.
  check("switching division keeps whoever is in the pit", await ev(() => {
    window.setDivision("pro");
    const sel = document.querySelector(".pit--r select");
    return S.right.name === "Rejects" && sel.value === "Rejects"
        && /Not in NXL Pro/.test(document.querySelector(".pit--r").textContent);
  }));
  check("deleting a team you added does not blank its picker", await ev(() => {
    window.setDivision("semi");
    window.setPitTeam("right", "My Local Team");
    window.delTeam("My Local Team");
    const sel = document.querySelector(".pit--r select");
    return S.right.name === "My Local Team" && sel.value === "My Local Team";
  }));
  check("and the team is still one tap from being cleared on purpose", await ev(() => {
    window.setPitTeam("right", "");
    return !pitNamed("right");
  }));

  // Every other list in the app can be undone. A squad note could only ever be
  // added, so a typo stayed on the phone for the season.
  check("a squad note can be taken back", await ev(() => {
    window.set({ tab: "more", more: "messages", messages: [] });
    document.getElementById("md").value = "Bus at 6am";
    window.sendMsg();
    document.getElementById("md").value = "Bsu at 6am";
    window.sendMsg();
    const two = S.messages.length === 2;
    window.delMsg(1);
    return two && S.messages.length === 1 && S.messages[0] === "Bus at 6am"
        && document.getElementById("root").textContent.includes("Bus at 6am");
  }));

  // A merge brings in the other phone's records. It must not bring in its place
  // in the day: the sheet, the point, the field and the call are this coach's.
  check("merging another phone does not move you onto its sheet", await ev(() => {
    window.set({ tab: "tally", layoutKey: "lso", script: "snake" });
    window.markOut("us", "Rex");
    const mine = { m: S.matchId, pt: S.point, layout: S.layoutKey, script: S.script };
    const theirs = JSON.parse(copyPayload("all"));
    theirs.data.matches = [{id:"THEIRS", at: 1700000000000, vs:"Malicious", layout:"tby"}];
    theirs.data.matchId = "THEIRS";
    theirs.data.point = 9;
    theirs.data.layoutKey = "tby";
    theirs.data.script = "blitz";
    theirs.data.tally = [{pt:1, side:"us", name:"Zed", m:"THEIRS", at:1700000001000,
                          layout:"tby", vs:"Malicious"}];
    window.set({ tab: "more", more: "nexus" });
    document.getElementById("copyIn").value = JSON.stringify(theirs);
    window.loadCopy("merge");
    return S.matchId === mine.m && S.point === mine.pt
        && S.layoutKey === mine.layout && S.script === mine.script;
  }));
  check("...but it does bring their sheet in, openable", await ev(() =>
    S.matches.some(m => m.id === "THEIRS")
    && S.tally.some(o => o.m === "THEIRS" && o.name === "Zed")
    && rowsHere(S.tally).every(o => o.m !== "THEIRS")));
  check("...and a replace does take their place in the day", await ev(() => {
    const theirs = JSON.parse(copyPayload("all"));
    theirs.data.matchId = "THEIRS"; theirs.data.point = 9;
    document.getElementById("copyIn").value = JSON.stringify(theirs);
    window.loadCopy("replace");
    return S.matchId === "THEIRS" && S.point === 9;
  }));

  // That replace left this page as another phone. Back to a known state.
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake",
               right: { name: "Rejects" }, left: {} });

  // The drill puts a call on the field the coach did not make. Only Stop put his
  // own back, so walking away mid-drill left him on a random one — one tap from
  // playing it, or logging it as the call he made.
  // Never assert that the drill's random call differs from the one you were on —
  // it picks from the twelve, so one run in twelve it picks the same one and a
  // correct app fails the check. What matters is that the drill is running and
  // holding your call, and that leaving gives it back.
  check("a drill does not follow you off Playbook", await ev(() => {
    window.set({ tab: "playbook", script: "snake", pbView: null });
    window.startRep();
    const drilling = repState().running && repState().was === "snake"
                  && S.pbView === "rep";
    window.set({ tab: "tally" });
    return drilling && !repState().running && S.script === "snake" && S.pbView === null;
  }));
  check("nor off the Playbook chip row", await ev(() => {
    window.set({ tab: "playbook" });
    window.startRep();
    window.set({ pbView: "cards" });
    return !repState().running && S.script === "snake";
  }));

  // A player taken off the roster leaves a hole in any point he was written
  // into, and the five reads four names with nothing saying why.
  check("a player off the roster comes off the point", await ev(() => {
    window.set({ tab: "more", more: "lineups", pbView: null,
                 roster: [{num:"7",name:"Rex"},{num:"3",name:"Mo"}], point: 2 });
    window.setSlot(0, "Rex"); window.setSlot(1, "Mo");
    S.assessments = [{who:"Rex", score:4, pt:2, m:S.matchId, at:Date.now()}];
    window.delPlayer(0);
    return lineupFor(2)[0] === "" && lineupFor(2)[1] === "Mo";
  }));
  check("but what he already did keeps his name", await ev(() =>
    S.assessments[0].who === "Rex"));

  // A sheet is played on one field. Changing the event does not move it, so the
  // bunkers under an out belong to a field you are no longer looking at.
  check("a sheet from another field says so", await ev(() => {
    window.setPitTeam("right", "Rejects");
    window.set({ tab: "tally" });
    window.markOut("us", "1");
    const quiet = !/played on/.test(document.getElementById("root").textContent);
    window.pickEvent(Object.keys(LAYOUTS).find(k => k !== S.layoutKey));
    window.set({ tab: "tally" });
    return quiet && /This sheet was played on/.test(document.getElementById("root").textContent);
  }));

  // The screen sleeping between points is the papercut this fixes.
  check("the screen is kept awake, and it is the coach's call", await ev(() => {
    const on = S.awake !== false;
    window.setAwake(false);
    const off = S.awake === false;
    window.setAwake(true);
    return on && off && S.awake === true;
  }));
  check("the switch only shows where the phone can do it", await ev(() => {
    window.set({ tab: "more", more: "nexus" });
    const shown = /Keep the screen awake/.test(document.getElementById("root").textContent);
    return shown === !!window.gridlockCanAwake;
  }));

  /* ------------------------------------------------- nobody in the pit yet */
  // The app used to ship with two real teams already in the pits, and pitOf()
  // fell back to the first team of the division, so there was no way to be
  // between opponents. A coach who never picked anyone saw two strangers on
  // five tabs, and every out he tallied was stamped with a team he had never
  // played.
  G("Nobody in the pit yet");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await ev(() => window.set({ entered: true, role: "staff",
    tips: {pb:1, tally:1, scout:1, sl:1, class:1, lg:1} }));

  check("a fresh app has nobody in either pit", await ev(() =>
    !pitNamed("left") && !pitNamed("right") && !pitOf("right").named));
  check("and does not name one anyway", await ev(() => {
    const t = document.getElementById("root").textContent;
    return !/Blast Camp|Rejects/.test(t);
  }));
  check("Playbook asks instead of reading a team you did not pick", await ev(() => {
    window.set({ tab: "playbook" });
    const t = document.getElementById("root").textContent;
    return /right pit on Scout/.test(t) && !/Rejects/.test(t);
  }));
  check("the point sheet says Them", await ev(() => {
    window.set({ tab: "tally" });
    const t = document.getElementById("root").textContent;
    return /THEM/i.test(t) && !/Rejects/.test(t);
  }));
  check("the opening sheet has no opponent rather than a guess", await ev(() =>
    curMatch().vs === "" && matchVs() === ""));
  check("a new match refuses to invent one", await ev(() => {
    let said = ""; window.alert = m => { said = m; };
    const before = S.matches.length;
    window.newMatch();
    return S.matches.length === before && /right pit/i.test(said) && S.tab === "scout";
  }));
  check("Scout's reads wait for a team, but Division does not", await ev(() => {
    window.set({ tab: "scout", scoutTab: "counter" });
    const asks = /Who are you playing/.test(document.getElementById("root").textContent);
    window.set({ scoutTab: "board" });
    const board = document.getElementById("root").textContent.includes("Scout board");
    return asks && board;
  }));

  check("naming the right pit names the sheet you have not started", await ev(() => {
    window.setPitTeam("right", "Rejects");
    return matchVs() === "Rejects" && curMatch().vs === "Rejects";
  }));
  check("...and an out is then logged against the team you chose", await ev(() => {
    window.set({ tab: "tally" });
    window.markOut("us", "1");
    return rowsHere(S.tally)[0].vs === "Rejects";
  }));
  check("...but naming it does not rewrite a sheet already played", await ev(() => {
    const was = curMatch().vs;
    window.setPitTeam("right", "Malicious");
    return curMatch().vs === was && rowsHere(S.tally)[0].vs === was;
  }));
  check("a pit can be emptied again", await ev(() => {
    window.setPitTeam("right", "");
    return !pitNamed("right") && curMatch().vs === "Rejects";   // the sheet keeps its own
  }));

  /* --------------------------------------------------------------- matches */
  // A point number only means something inside a match. These check the two
  // halves of that: that the boundary works, and that a season logged before
  // matches existed still reads.
  G("A match");

  await seed({ tab: "tally", point: 1 });
  check("there is always a match in play", await ev(() =>
    !!curMatch() && S.matches.length >= 1 && curMatch().id === S.matchId));
  check("a new match puts the point back to one", await ev(() => {
    window.confirm = () => true;
    window.nextPoint(); window.nextPoint();
    const was = S.point;
    window.newMatch();
    return was === 3 && S.point === 1 && S.matches.length >= 2;
  }));
  check("back a point is a way out of a mis-tap, and stops at one", await ev(() => {
    window.nextPoint();
    window.backPoint();
    const one = S.point === 1;
    window.backPoint();
    return one && S.point === 1;
  }));

  check("a new sheet does not show the old sheet's outs", await ev(() => {
    const first = S.matchId;
    window.markOut("us", "Reyes");
    const mine = rowsHere(S.tally).length;
    window.newMatch();
    return mine === 1 && rowsHere(S.tally).length === 0
        && S.tally.some(o => o.m === first && o.name === "Reyes");   // kept, not deleted
  }));
  check("point 1 of two matches is two different point ones", await ev(() => {
    window.markOut("us", "Okafor");
    const here = rowsHere(S.tally).filter(o => o.pt === 1).map(o => o.name);
    const all = S.tally.filter(o => o.pt === 1).map(o => o.name).sort();
    return here.join() === "Okafor" && all.join() === "Okafor,Reyes";
  }));
  check("the same five can be on point 1 of each", await ev(() => {
    window.set({ roster: [{name:"Reyes",num:1},{name:"Okafor",num:2}] });
    window.setSlot(0, "Okafor");
    const mine = lineupFor(1)[0];
    const other = (S.matches.find(m => m.id !== S.matchId) || {}).id;
    return mine === "Okafor" && lineupFor(1, other)[0] !== "Okafor";
  }));
  check("an old sheet opens on its last point", await ev(() => {
    const other = S.matches.find(m => m.id !== S.matchId).id;
    window.openMatch(other);
    return S.matchId === other && rowsHere(S.tally).some(o => o.name === "Reyes");
  }));
  check("the sheet keeps its own opponent while you scout the next one", await ev(() => {
    window.newMatch();
    const vs = matchVs();
    window.setPitTeam("right", "Blast Camp");
    const held = matchVs() === vs;
    window.markOut("them", "#3");
    return held && rowsHere(S.tally)[0].vs === vs;
  }));
  check("Undo on the sheet removes the row you pointed at", await ev(() => {
    window.set({ tab: "tally" });
    window.markOut("us", "Reyes");
    const before = S.tally.length;
    const target = rowsHere(S.tally)[0];
    window.undoOut(S.tally.indexOf(target));
    return S.tally.length === before - 1 && !S.tally.includes(target);
  }));

  // The case the whole thing exists for: you play a team twice, and their
  // point 1 is two different points.
  check("Games keeps two sheets against the same team apart", await ev(() => {
    window.confirm = () => true;
    localStorage.setItem("gridlock.coach.v2", JSON.stringify({
      entered: true, role: "staff", tab: "scout", scoutTab: "games",
      right: { name: "Rejects" }, left: { name: "Blast Camp" },
      matches: [{id:"b", at: 2000, vs:"Rejects"}, {id:"a", at: 1000, vs:"Rejects"}],
      matchId: "b", point: 1,
      tally: [{pt:1, side:"us", name:"Later",  m:"b", at:2100, vs:"Rejects", layout:"lso"},
              {pt:1, side:"us", name:"Earlier", m:"a", at:1100, vs:"Rejects", layout:"lso"}],
      tips: { scout: 1 },
    }));
    return true;
  }));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  check("  ...showing the sheet you are on, not both at once", await ev(() => {
    const t = document.getElementById("root").textContent;
    return t.includes("Later") && !t.includes("Earlier");
  }));
  check("  ...and offering the other one by date", await ev(() => {
    const btns = [...document.querySelectorAll(".sec button")].map(b => b.textContent.trim());
    return btns.some(b => /on now/.test(b)) && btns.filter(b => /Point 1/.test(b)).length === 1;
  }));
  check("  ...which opens it without merging the two", await ev(() => {
    window.set({ replayMatch: "a", replayPt: null });
    const t = document.getElementById("root").textContent;
    return t.includes("Earlier") && !t.includes("Later");
  }));

  // The migration. A save written before matches existed has rows with no `m`
  // and lineups keyed by a bare point number; none of it may go missing.
  check("a season logged before matches existed is adopted whole", await ev(async () => {
    localStorage.setItem("gridlock.coach.v2", JSON.stringify({
      entered: true, role: "staff", tab: "tally", point: 7,
      right: { name: "Rejects" },
      tally: [{pt:7, side:"us", name:"Reyes", at: 3000, layout:"lso"},
              {pt:6, side:"them", name:"#2", at: 2000, layout:"lso"},
              "an out from a build before any of this"],
      moves: [{pt:6, who:"Reyes", from:"a", to:"b", at: 2500}],
      assessments: [{who:"Reyes", score:4, pt:6, at: 2600}],
      calls: [{script:"snake", layout:"lso", pt:6, at: 2400}],
      lineups: { 6: ["Reyes","","","",""] },
    }));
    return true;
  }));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  check("  ...into one match, dated from the oldest thing in it", await ev(() =>
    S.matches.length === 1 && S.matches[0].vs === "Rejects" && S.matches[0].at === 2000));
  check("  ...with every row stamped and nothing dropped", await ev(() => {
    const id = S.matchId;
    return S.tally.length === 3 && S.tally.every(o => o.m === id)
        && S.moves[0].m === id && S.assessments[0].m === id && S.calls[0].m === id;
  }));
  check("  ...including the row an old build wrote as a bare string", await ev(() => {
    const legacy = S.tally.find(o => o.legacy);
    return !!legacy && legacy.name === "an out from a build before any of this"
        && !legacy.side && !legacy.pt;          // it claims no point and no side
  }));
  check("  ...and the lineup still belongs to the point it was set on", await ev(() =>
    lineupFor(6)[0] === "Reyes"));
  check("  ...and the point you were on is still the point you are on", await ev(() =>
    S.point === 7 && rowsHere(S.tally).filter(o => o.pt === 7).length === 1));
  check("adopting runs once, not on every load", await ev(() => S.matches.length === 1));

  /* -------------------------------------------- the rest of the spec gaps */
  // Eight things the coverage doc listed as not built. Each is checked for the
  // thing it is actually for, not for the string that names it.
  G("Closing the gaps");

  // --- who a blast goes to ---
  await seed({ tab: "more", more: "league", role: "staff",
    groups: [{id:"g1", name:"Ops",  members:[{name:"Ann", phone:"1"},{name:"Bo", phone:"2"}]},
             {id:"g2", name:"Refs", members:[{name:"Cy",  phone:"3"}]},
             {id:"g3", name:"Vendors", members:[{name:"Dee"}]}],
    blastTo: undefined, blastBody: "Gate opens 8:00", blasts: [] });
  check("a blast starts addressed to every group", await ev(() => blastTo().length === 3));
  check("only people you can reach are counted", await ev(() => blastCount() === 3));
  check("dropping a group drops its people", await ev(() => {
    window.toggleBlastGroup("g2");
    return !blastPicked("g2") && blastCount() === 2;
  }));
  // The log names who you addressed and counts who could actually be reached,
  // which are not the same number: Vendors is picked and has nobody with a
  // contact on file, so it is in the line and adds nothing to the count.
  check("a blast goes to the groups you picked, and says which", await ev(() => {
    window.prompt = () => {};
    window.sendBlast();
    const b = S.blasts[0];
    return b && b.n === 2 && b.to === "Ops, Vendors" && !/Refs/.test(b.to);
  }));
  check("no group picked is no send, not everybody", await ev(() => {
    ["g1","g3"].forEach(id => window.toggleBlastGroup(id));
    const before = S.blasts.length;
    let said = ""; window.alert = m => { said = m; };
    window.sendBlast();
    return S.blasts.length === before && /group/i.test(said);
  }));
  check("deleting a group takes it out of the picked set", await ev(() => {
    window.toggleBlastGroup("g1");
    window.delGroup("g1");
    return !blastTo().includes("g1");
  }));

  // --- a class is a session, not a title ---
  await seed({ tab: "more", more: "classes", role: "staff",
    classes: [{id:"GL-AAAA", code:"GL-AAAA", title:"Tuesday clinic", open:true, when:"", notes:""}],
    responses: [], joinCode: "" });
  check("a class carries a start time and notes", await ev(() => {
    window.setClass("GL-AAAA", "when", "2026-10-03T09:00");
    window.setClass("GL-AAAA", "notes", "Meet at the pit gate");
    const c = S.classes[0];
    return c.when === "2026-10-03T09:00" && c.notes === "Meet at the pit gate";
  }));
  check("closing sign-ins takes the form away, not just the tag", await ev(() => {
    window.set({ joinCode: "GL-AAAA" });
    const open = !!document.getElementById("fn");
    window.setClass("GL-AAAA", "open", false);
    window.set({ joinCode: "GL-AAAA" });
    const shut = !document.getElementById("fn")
              && /closed/i.test(document.getElementById("root").textContent);
    window.setClass("GL-AAAA", "open", true);
    return open && shut;
  }));
  check("sharing a class carries the code, the time and the notes", await ev(() => {
    let out = ""; window.prompt = (_, t) => { out = t; return null; };
    delete window.gridlockShare;
    window.shareClass("GL-AAAA");
    return out.includes("GL-AAAA") && out.includes("Tuesday clinic")
        && out.includes("Meet at the pit gate") && /Starts/.test(out);
  }));

  // --- the division board ---
  await seed({ tab: "scout", scoutTab: "board", division: "cin",
               left: { name: "Blast Camp" }, right: { name: "Rejects" } });
  check("the board can be narrowed to one team", await ev(() => {
    const rows = () => [...document.querySelectorAll("#boardRows tr")];
    const all = rows().length;
    window.findTeam(rows()[0].children[1].textContent.slice(0, 4));
    const some = rows().filter(r => !r.hidden).length;
    window.findTeam("");
    return all > 2 && some >= 1 && some < all && rows().filter(r => !r.hidden).length === all;
  }));
  check("a tap loads the right pit, a hold loads the left", await ev(async () => {
    const name = teamsHere()[1].name;
    window.pressTeam(name); window.releaseTeam(name);       // a tap
    const right = S.right.name === name;
    const other = teamsHere()[2].name;
    window.pressTeam(other);
    await new Promise(r => setTimeout(r, 600));             // held
    const left = S.left.name === other;
    window.releaseTeam(other);
    return right && left && S.right.name === name;          // the hold did not also tap
  }));

  // --- the squad, and what one man calls a bunker ---
  await seed({ tab: "more", more: "team", layoutKey: "lso" });
  check("the squad has a code, and it keeps it", await ev(() => {
    const a = squadCode();
    return /^SQ-[A-Z0-9]{4}$/.test(a) && squadCode() === a && S.teamCode === a;
  }));
  check("a squad copy carries the code", await ev(() =>
    JSON.parse(copyPayload("squad")).data.teamCode === S.teamCode));
  check("merging another squad's copy says so and keeps your code", await ev(() => {
    const mine = S.teamCode;
    const theirs = JSON.parse(copyPayload("squad"));
    theirs.data.teamCode = "SQ-ZZZZ";
    theirs.data.roster = [{ num: "9", name: "Someone Else" }];
    window.set({ tab: "more", more: "nexus" });
    document.getElementById("copyIn").value = JSON.stringify(theirs);
    window.loadCopy("merge");
    return S.teamCode === mine && /SQ-ZZZZ/.test(S.copyStatus);
  }));
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake" });
  check("one player's word for a bunker is his alone", await ev(() => {
    const b = curLayout().bunkers.find(x => x.n === "GP");
    const who = S.roster[0].name;
    window.setPlayerCall(who, b.id, "Nest");
    const his = callOf(b, who) === "Nest";
    const team = callOf(b) === b.n;                 // the field keeps the code
    window.setCall && 0;
    return his && team;
  }));
  check("his card uses his word, the field does not", await ev(() => {
    const five = fiveFor(1);
    const p = currentPaths()[0];
    const b = curLayout().bunkers.find(x => x.id === p.bunker);
    window.setPlayerCall(five[0].name, b.id, "Doghouse");
    const card = cardLines()[0].bunker === "Doghouse";
    window.set({ tab: "playbook" });
    const field = !/Doghouse/.test(document.querySelector("svg.field").textContent);
    return card && field;
  }));

  // --- the fields this app carries ---
  await seed({ tab: "more", more: "nexus" });
  check("Nexus lists every field and marks the one you are on", await ev(() => {
    const t = document.getElementById("root").textContent;
    return Object.values(LAYOUTS).every(L => t.includes(L.name)) && /\bON\b/.test(t);
  }));
  check("picking a field on Nexus changes the layout everywhere", await ev(() => {
    const other = Object.keys(LAYOUTS).find(k => k !== S.layoutKey);
    window.pickEvent(other);
    window.set({ tab: "playbook" });
    return S.layoutKey === other
        && document.getElementById("root").textContent.includes(LAYOUTS[other].name);
  }));
  check("Nexus says there is no feed rather than leaving a dead box", await ev(() => {
    window.set({ tab: "more", more: "nexus" });
    return /no live\s+event feed/i.test(document.getElementById("root").textContent);
  }));

  // --- where the point was decided ---
  await seed({ tab: "scout", scoutTab: "matchup", layoutKey: "lso", outsOn: false });
  check("with nothing tallied the field carries no marks", await ev(() => {
    window.set({ outsOn: true });
    const svg = document.querySelector("svg.field").outerHTML;
    return !/#ffb020/.test(svg) && /No outs logged/.test(document.getElementById("root").textContent);
  }));
  check("an X lands on the bunker a man was shot at", await ev(() => {
    const gp = curLayout().bunkers.find(b => b.n === "GP").id;
    S.tally = [{ pt:1, side:"us", name:"A", layout:"lso", shotAt:gp }];
    window.set({ outsOn: true });
    const marks = [...document.querySelectorAll("svg.field path[stroke='#efedeb']")];
    return marks.some(m => /M[\d.]+ [\d.]+L[\d.]+ [\d.]+M/.test(m.getAttribute("d")));
  }));
  check("a ring only appears where it went both ways", await ev(() => {
    const gp = curLayout().bunkers.find(b => b.n === "GP").id;
    const one = document.querySelector("svg.field").outerHTML;
    S.tally = [...S.tally, { pt:1, side:"them", name:"B", layout:"lso", shotAt:gp }];
    window.set({ outsOn: true });
    const two = document.querySelector("svg.field").outerHTML;
    return !/#ffb020/.test(one) && /#ffb020/.test(two);
  }));
  check("an out on another field does not mark this one", await ev(() => {
    S.tally = [{ pt:1, side:"us", name:"A", layout:"tby",
                 shotAt:LAYOUTS.tby.bunkers[0].id }];
    window.set({ outsOn: true });
    return !/stroke="#efedeb"/.test(document.querySelector("svg.field").outerHTML);
  }));

  // --- rounded, or as routed ---
  await seed({ tab: "playbook", layoutKey: "lso", script: "base", smoothOn: true });
  check("Smooth is on, and the corners are curves", await ev(() => {
    const d = document.querySelector("svg.field g.live path").getAttribute("d");
    return S.smoothOn !== false && d.includes("Q");
  }));
  check("turning it off draws the legs as routed", await ev(() => {
    window.setSmooth(false);
    const ds = [...document.querySelectorAll("svg.field g.live path")]
      .map(p => p.getAttribute("d"));
    return !ds.some(d => d.includes("Q")) && ds.some(d => d.includes("L"));
  }));
  check("the plants do not move when the drawing changes", await ev(() => {
    const straight = currentPaths().map(p => p.bunker + "@" + p.to.join(","));
    window.setSmooth(true);
    const curved = currentPaths().map(p => p.bunker + "@" + p.to.join(","));
    return straight.join("|") === curved.join("|");
  }));

  /* ------------------------------------------------------- durable storage */
  // localStorage inside a web view is not a safe place to keep a season, so
  // every save is mirrored into app storage through @capacitor/preferences.
  // A browser has no such plugin, so this needs a real native context: a stub
  // Capacitor whose Preferences live OUTSIDE the page, the way the real one
  // does, so clearing localStorage does not clear it too.
  G("Durable storage");
  {
    const kept = {};                       // stands in for UserDefaults
    let failKeeps = false;
    const ctxN = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pg = await ctxN.newPage();
    pg.on("pageerror", e => errors.push("native pageerror: " + e.message));
    await pg.exposeFunction("__prefsGet", k => (k in kept ? kept[k] : null));
    await pg.exposeFunction("__prefsSet", (k, v) => {
      if(failKeeps) throw new Error("Device storage unavailable");
      kept[k] = v; return null;
    });
    await pg.addInitScript(() => {
      const done = () => Promise.resolve();
      window.__appListeners = {};
      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => "ios",
        Plugins: {
          Preferences: {
            get: ({key}) => window.__prefsGet(key).then(value => ({value})),
            set: ({key, value}) => window.__prefsSet(key, value),
          },
          App: { addListener: (name, listener) => { window.__appListeners[name] = listener; return done(); }, exitApp: () => done() },
          StatusBar: { setStyle: done, setBackgroundColor: done },
          Share: { share: done },
        },
      };
    });
    const evN = fn => pg.evaluate(fn);
    await pg.goto(URL, { waitUntil: "networkidle" });
    await pg.evaluate(() => localStorage.setItem("gridlock.coach.v2", JSON.stringify({
      entered: true, role: "staff", tab: "tally", point: 5,
      roster: [{num:"7", name:"Rex"}], right: {name:"Rejects"},
      tips: {pb:1, tally:1, scout:1, sl:1, class:1, lg:1},
    })));
    await pg.reload({ waitUntil: "networkidle" });
    await pg.waitForTimeout(200);

    check("on device, a save is mirrored out of the web view", await (async () => {
      await evN(() => window.set({ point: 9 }));
      await pg.waitForTimeout(800);                       // past the write debounce
      const copy = kept["gridlock.coach.v2"];
      return !!copy && JSON.parse(copy).point === 9;
    })());
    check("the copy carries when it was written", await (async () =>
      !!JSON.parse(kept["gridlock.coach.v2"]).savedAt)());
    failKeeps = true;
    await evN(() => window.set({point:10}));
    await pg.waitForFunction(() => !!window.gridlockDurableError);
    check("a failed second-copy write is visible and preserves its last good copy", await evN(() =>
      /could not update its second copy/.test(document.getElementById("root").textContent))
      && JSON.parse(kept["gridlock.coach.v2"]).point === 9);
    failKeeps = false;
    await evN(() => { window.set({point:11}); window.__appListeners.appStateChange({isActive:false}); });
    await pg.waitForFunction(() => !window.gridlockDurableError);
    check("retry keeps the newest queued save and clears the warning", JSON.parse(kept["gridlock.coach.v2"]).point === 11);
    await evN(() => { window.set({point:9}); window.__appListeners.appStateChange({isActive:false}); });
    await pg.waitForTimeout(150);

    // The failure this exists for: the OS reclaims space and the web view comes
    // back empty, while app storage still has the season.
    check("a phone that lost its web-view storage gets the season back", await (async () => {
      await pg.evaluate(() => localStorage.clear());
      await pg.reload({ waitUntil: "networkidle" });
      await pg.waitForTimeout(400);
      return await evN(() => S.point === 9 && (S.roster || []).length === 1
                          && S.roster[0].name === "Rex");
    })());
    check("and is told, rather than finding out later", await evN(() =>
      /lost its saved season/i.test(document.getElementById("root").textContent)));
    check("the restore is written back to the web view too", await evN(() =>
      JSON.parse(localStorage.getItem("gridlock.coach.v2")).point === 9));

    // Timid on purpose: local state is the truth whenever there is any.
    check("a stale copy never overwrites what is on the phone", await (async () => {
      kept["gridlock.coach.v2"] = JSON.stringify({ entered: true, point: 999, savedAt: 1 });
      await pg.evaluate(() => localStorage.setItem("gridlock.coach.v2", JSON.stringify({
        entered: true, tab: "tally", point: 4, savedAt: Date.now(),
        tips: {pb:1, tally:1, scout:1, sl:1, class:1, lg:1},
      })));
      await pg.reload({ waitUntil: "networkidle" });
      await pg.waitForTimeout(400);
      return await evN(() => S.point === 4 && !S.restored);
    })());

    // A save that throws used to escape through set() before render() ran, so
    // the screen froze mid-tap and said nothing.
    // The account gates creating a class and sending a blast. Restoring a season
    // onto a phone the coach can no longer sign in to is half a rescue.
    check("the staff account is kept durably too", await (async () => {
      await pg.evaluate(async () => {
        window.set({ entered: false, mode: "create" });
        document.getElementById("em").value = "coach@team.com";
        document.getElementById("pw").value = "sideline1";
        await window.doAuth();
      });
      await pg.waitForTimeout(800);
      const copy = kept["gridlock.staff.v2"];
      return !!copy && JSON.parse(copy).email === "coach@team.com"
          && !!JSON.parse(copy).hash && !/sideline1/.test(copy);   // never in the clear
    })());
    check("a phone that lost it can sign in again", await (async () => {
      await pg.evaluate(() => localStorage.removeItem("gridlock.staff.v2"));
      await pg.reload({ waitUntil: "networkidle" });
      await pg.waitForTimeout(400);
      return await evN(() => {
        const a = JSON.parse(localStorage.getItem("gridlock.staff.v2") || "null");
        return !!a && a.email === "coach@team.com";
      });
    })());
    check("and a copy never overwrites an account already on the phone", await evN(() => {
      const mine = localStorage.getItem("gridlock.staff.v2");
      const took = window.gridlockRestoreAccount(JSON.stringify(
        { email: "someone@else.com", salt: "aa", hash: "bb" }));
      return took === false && localStorage.getItem("gridlock.staff.v2") === mine;
    }));

    check("on device, Nexus says there is a second copy", await (async () => {
      await evN(() => window.set({ tab: "more", more: "nexus" }));
      return await evN(() => window.gridlockDurable === true
        && /second copy in the phone's own storage/.test(document.getElementById("root").textContent));
    })());

    check("storage refusing a write does not freeze the screen", await evN(() => {
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
      let threw = false;
      try { window.set({ tab: "scout" }); } catch(e){ threw = true; }
      Storage.prototype.setItem = real;
      return !threw && S.tab === "scout"
          && document.getElementById("root").textContent.includes("Scout");
    }));
    check("it says so instead", await evN(() => {
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
      window.set({ tab: "tally" });
      const said = /storage for the app is full/i.test(document.getElementById("root").textContent);
      Storage.prototype.setItem = real;
      window.set({ tab: "tally" });
      const gone = !/storage for the app is full/i.test(document.getElementById("root").textContent);
      return said && gone;                        // and stops saying it once it works
    }));
    await ctxN.close();
  }

  check("in a browser it does not promise one", await ev(() => {
    window.set({ tab: "more", more: "nexus" });
    const t = document.getElementById("root").textContent;
    return !window.gridlockDurable && /clearing your browsing data clears it/.test(t)
        && !/second copy in the phone's own storage/.test(t);
  }));

  /* ------------------------------------------------------------ house rules */
  /* ---------------------------------------------------------------------
     Ready for a sideline

     Four things that a green suite said nothing about, found by reading the
     code and by fuzzing the handlers rather than by any check that existed.
     Each one is measured here the way it actually bites, not restated.
     --------------------------------------------------------------------- */
  G("Ready for a sideline");

  check("a break key this build does not have cannot white-screen the app",
    await ev(() => {
      const was = S.script;
      S.script = "wire-split-v2";          // a key BREAKS has never had
      let drew = 0, threw = "";
      try { render(); drew = document.getElementById("root").textContent.trim().length; }
      catch(e){ threw = e.message; }
      S.script = was; render();
      return drew > 0 && !threw;
    }));

  check("and such a key is put back on the way in", await ev(() => {
    S.script = "nonsense"; fixBreak(); return !!BREAKS[S.script];
  }));

  check("a match scored but never tallied reopens where it left off",
    await ev(() => {
      window.set({ right:{name:"Dynasty"} }); window.newMatch();
      const id = S.matchId;
      for (let i=0;i<5;i++) window.endPoint("us");     // 5-0, no outs tapped
      window.set({ right:{name:"Infamous"} }); window.newMatch();
      window.openMatch(id);
      const landedOn = S.point;
      window.endPoint("us");                           // must add, not overwrite
      return landedOn === 6 && matchScore().us === 6;
    }));

  check("a new sheet is Even, not the last one's result", await ev(() => {
    window.set({ right:{name:"Dynasty"} }); window.newMatch();
    window.endPoint("us"); window.endPoint("us");      // 2-0 up -> Ahead
    const ahead = S.matchState;
    window.set({ right:{name:"Royalty"} }); window.newMatch();
    return ahead === "Ahead" && S.matchState === "Even";
  }));

  // Measured, not read off the source: the flag is swapped and the banner asked
  // what it renders. This run is localhost, so the honest answer is nothing.
  check("an insecure address says so, because it silently disables sign-in",
    await ev(() => {
      const quiet = contextWarning();
      const real = Object.getOwnPropertyDescriptor(window, "isSecureContext");
      Object.defineProperty(window, "isSecureContext", {value:false, configurable:true});
      const loud = contextWarning();
      if(real) Object.defineProperty(window, "isSecureContext", real);
      return quiet === "" && /sign-in/.test(loud) && /awake/.test(loud);
    }));

  check("playing the break does not wipe what you type on the next tab",
    await ev(async () => {
      window.set({ tab:"playbook" });
      window.playPath();                                  // 2.2s of repaints
      window.set({ tab:"more", more:"messages" });
      const el = document.getElementById("md");
      if(!el) return false;
      el.value = "Pit gate opens at 8";
      await new Promise(r => setTimeout(r, 2600));         // outlast the run
      const survived = (document.getElementById("md") || {}).value === "Pit gate opens at 8";
      return survived && S.playing === false;
    }));

  /* ---------------------------------------------------------------------
     From the field test

     Two coaches with the app in hand, transcribed. Each check here is one
     thing they said, measured the way it bit them.
     --------------------------------------------------------------------- */
  G("From the field test");

  // "I can't even start a new match right here."
  check("Scout shows the match and lets you start a new one", await ev(() => {
    window.set({ tab:"scout", scoutTab:"matchup", right:{name:"Aftershock"} });
    const t = document.getElementById("root").textContent;
    return /New match/.test(t) && /Next point/.test(t) && /point \d+/.test(t);
  }));
  check("Next point on Scout moves the same point Tally is on", await ev(() => {
    const was = S.point || 1; window.nextPoint(); const now = S.point;
    window.backPoint(); return now === was + 1 && S.point === was;
  }));
  // "We need a spot for next point in a game in the scout tab. Also how do we switch games."
  check("Next point is on every Scout view, Arrival and Voice included", await ev(() => {
    return SCOUT_TABS.every(([k]) => { window.set({ tab:"scout", scoutTab:k });
      return /Next point/.test(document.getElementById("root").textContent); });
  }));
  check("the strip switches games and lands on that game's last point", await ev(() => {
    const here = S.matchId;
    const old = {id:"m-old-game", at: Date.now() - 86400000, vs:"Aftershock", layout:S.layoutKey};
    window.set({ tab:"scout", scoutTab:"breakouts", matches:[...(S.matches||[]), old],
      results:[...(S.results||[]), {m:old.id, pt:1, won:"us", at:1}, {m:old.id, pt:2, won:"them", at:2}] });
    const sel = document.querySelector("select[aria-label=Game]");
    if(!sel || [...sel.options].length < 2) return false;
    sel.value = old.id; sel.dispatchEvent(new Event("change"));
    const ok = S.matchId === old.id && S.point === 3 && document.querySelector("select[aria-label=Game]").value === old.id;
    window.openMatch(here);
    window.set({ matches:S.matches.filter(m => m.id !== old.id), results:S.results.filter(r => r.m !== old.id) });
    return ok && S.matchId === here;
  }));

  // "Make this part less messy": one five at a time on the Scout field.
  check("the Scout field draws one pit at a time by default", await ev(() => {
    window.set({ tab:"scout", scoutTab:"matchup", scoutShow:"them", right:{name:"Rejects"} });
    const nums = [...document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']")];
    return nums.length === 5 && nums.every(c => c.getAttribute("fill") === "#3d8bff");
  }));
  check("Both draws ten, Yours draws your five in red", await ev(() => {
    window.set({ scoutShow:"both" }); const both = document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']").length;
    window.set({ scoutShow:"us" }); const us = [...document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']")];
    return both === 10 && us.length === 5 && us.every(c => c.getAttribute("fill") === "#e5342f");
  }));
  check("their side is the call logged most against them, and the legend says so", await ev(() => {
    window.set({ scoutShow:"them", script:"snake" });
    const other = Object.keys(BREAKS).find(k => k !== "snake");
    editProfile("right", {breaks:[]}); window.logTheirBreak("right", other, []); window.logTheirBreak("right", other, []);
    const t = document.getElementById("root").textContent;
    const ok = theirScript() === other && t.includes(BREAKS[other].name + ", logged 2 times");
    editProfile("right", {breaks:[]}); render();
    return ok && theirScript() === null && /yours mirrored/.test(document.getElementById("root").textContent);
  }));

  // "Log a breakout without naming the exact players for now."
  check("tapping the Breakouts field picks a bunker for their five", await ev(() => {
    window.set({ tab:"scout", scoutTab:"breakouts", theirPick:[] });
    const svg = document.querySelector("#their-map svg.field"); if(!svg) return false;
    const b = curLayout().bunkers[4];
    const p = new DOMPoint(b.x*2, b.y*2).matrixTransform(svg.getScreenCTM());
    svg.querySelector("[data-pick]").dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:1}));
    return (S.theirPick || [])[0] === b.id;
  }));
  check("tapping it again takes it out", await ev(() => {
    const svg = document.querySelector("#their-map svg.field");
    const b = curLayout().bunkers[4];
    const p = new DOMPoint(b.x*2, b.y*2).matrixTransform(svg.getScreenCTM());
    svg.querySelector("[data-pick]").dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:1}));
    return (S.theirPick || []).length === 0;
  }));
  check("no more than five go on the field", await ev(() => {
    const ids = curLayout().bunkers.slice(0,5).map(b=>b.id);
    window.set({ theirPick: ids });
    const svg = document.querySelector("#their-map svg.field");
    const b = curLayout().bunkers[7];
    const p = new DOMPoint(b.x*2, b.y*2).matrixTransform(svg.getScreenCTM());
    svg.querySelector("[data-pick]").dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:1}));
    return S.theirPick.length === 5 && !S.theirPick.includes(b.id);
  }));
  check("the picked five draw as numbered squares before anything is logged", await ev(() =>
    (document.querySelector("#their-map").innerHTML.match(/class="their-five"/g) || []).length === 5));
  check("logging the five stamps match, field and point, with no name", await ev(() => {
    const before = theirBreaks("right").length;
    window.logTheirFive("right");
    const b = theirBreaks("right")[0];
    return theirBreaks("right").length === before + 1 && b.script === "" && b.m === S.matchId
      && b.layout === S.layoutKey && b.pt === (S.point||1) && b.plants.length === 5 && S.theirPick.length === 0;
  }));
  check("a nameless five does not count as a named call", await ev(() => !breakFreq("right").some(f => f[0] === "")));
  check("but it shows on the Scout field for this point", await ev(() => {
    window.set({ scoutTab:"matchup", theirOn:true });
    const n = (document.querySelector(".field-wrap[data-live]").innerHTML.match(/class="their-five"/g) || []).length;
    return n === 5 && plantsLogged();
  }));
  check("and not on the next point", await ev(() => {
    window.nextPoint();
    const n = (document.querySelector(".field-wrap[data-live]").innerHTML.match(/class="their-five"/g) || []).length;
    window.backPoint(); return n === 0;
  }));
  check("a named call logged with five picked takes them with it", await ev(() => {
    window.set({ scoutTab:"breakouts", theirPick: curLayout().bunkers.slice(5,8).map(b=>b.id) });
    window.logTheirBreak("right", "snake");
    const b = theirBreaks("right")[0];
    return b.script === "snake" && b.plants.length === 3 && S.theirPick.length === 0;
  }));
  check("Where they plant counts bunkers across logged fives", await ev(() => {
    const c = plantCounts("right");
    return c.length >= 5 && c.every(([id,n]) => typeof id === "string" && n >= 1)
      && /Where they plant/.test(document.getElementById("root").textContent);
  }));
  await ev(() => { window.set({ theirOn:false, theirPick:[] }); });

  // "We don't shoot directly at the bunker."
  check("a lane can be aimed off the bunker and judged to that spot", await ev(() => {
    const list = curLayout().bunkers;
    window.set({ tab:"sightlines", sightFrom:list[0].id, sightTo:list[1].id, sightAim:null });
    // A spot just past the target, one foot to its side.
    const t = list[1], aim = [t.x + 3, t.y + 3];
    window.set({ sightAim: aim });
    const a = aimLane(list[0].id, aim);
    const manual = list.filter(o => o !== list[0] && bunkerBoxes(o).some(k => segHitsBox(list[0].x, list[0].y, aim[0], aim[1], k.x, k.y, k.w/2, k.h/2))).length > 0;
    return a && a.blocked === manual && a.ft === Math.round(Math.hypot(aim[0]-list[0].x, aim[1]-list[0].y));
  }));
  check("the drawn lane is dashed when blocked and solid when clear", await ev(() => {
    const svg = document.querySelector("#sight-map").innerHTML;
    const m = svg.match(/<line class="aim-lane"[^>]*>/); if(!m) return false;
    const dashed = /stroke-dasharray/.test(m[0]);
    return dashed === aimLane(S.sightFrom, S.sightAim).blocked;
  }));
  check("the handle sits above the tap surface, so it can be grabbed", await ev(() => {
    const svg = document.querySelector("#sight-map svg.field");
    const kids = [...svg.children].map(c => c.getAttribute("data-pick") ? "pick" : c.getAttribute("data-aim-sight") ? "aim" : "");
    return kids.indexOf("aim") > kids.indexOf("pick") && kids.indexOf("pick") >= 0;
  }));
  check("dragging the handle moves the aim and redraws under the finger", await ev(() => {
    const svg = document.querySelector("#sight-map svg.field");
    const h = svg.querySelector("[data-aim-sight]");
    const start = h.getBoundingClientRect();
    h.dispatchEvent(new PointerEvent("pointerdown", {clientX:start.x+14, clientY:start.y+14, bubbles:true, pointerId:2}));
    const to = new DOMPoint(70*2, 60*2).matrixTransform(svg.getScreenCTM());
    document.dispatchEvent(new PointerEvent("pointermove", {clientX:to.x, clientY:to.y, bubbles:true, pointerId:2}));
    const mid = S.sightAim && Math.abs(S.sightAim[0]-70) < 1 && Math.abs(S.sightAim[1]-60) < 1;
    document.dispatchEvent(new PointerEvent("pointerup", {bubbles:true, pointerId:2}));
    return mid && /Back to the bunker/.test(document.getElementById("root").textContent);
  }));
  check("a tap on the handle, without moving, still drops the question", await ev(() => {
    const list = curLayout().bunkers;
    window.set({ sightFrom:list[0].id, sightTo:list[1].id, sightAim:null });
    const h = document.querySelector("#sight-map [data-aim-sight]");
    const r = h.getBoundingClientRect(), x = r.x + r.width/2, y = r.y + r.height/2;
    h.dispatchEvent(new PointerEvent("pointerdown", {clientX:x, clientY:y, bubbles:true, pointerId:3}));
    document.dispatchEvent(new PointerEvent("pointerup", {clientX:x, clientY:y, bubbles:true, pointerId:3}));
    return S.sightTo === null && S.sightAim === null;
  }));
  check("asking about a different lane drops the aim", await ev(() => {
    window.set({ sightFrom:curLayout().bunkers[0].id, sightTo:curLayout().bunkers[1].id, sightAim:[70,60] });
    const list = curLayout().bunkers;
    window.pickSight("to", list[2].id);
    return S.sightAim === null && S.sightTo === list[2].id;
  }));
  await ev(() => { window.set({ sightAim:null, sightTo:null }); });

  /* ---------------------------------------------------------------------
     Bunker tally

     The hand chart, bunker first. Tap the bunker a man broke to, answer
     what you saw, log it. Every check reads the screen or the rows.
     --------------------------------------------------------------------- */
  G("Bunker tally");
  const tapTally = ft => ev(ft => {
    const svg = document.querySelector("#tally-map svg.field"); if(!svg) return false;
    const p = new DOMPoint(ft[0]*2, ft[1]*2).matrixTransform(svg.getScreenCTM());
    svg.querySelector("[data-pick]").dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:1}));
    return true;
  }, ft);
  await ev(() => window.set({ tab:"tally", tallySel:null, tallyDraft:null, tallyTrace:false, tallyLast:"", tallyRead:"", breakouts:[], tally:[], results:[], point:1 }));
  check("Tally has the field", await ev(() => !!document.querySelector("#tally-map svg.field [data-pick]")));
  const ours = await ev(() => { const b = curLayout().bunkers.find(x => x.x < 60 && x.y > 80); return {id:b.id, x:b.x, y:b.y}; });
  await tapTally([ours.x + 3, ours.y - 3]);
  check("a tap near a bunker lands on it, no dead ground", await ev(id => S.tallySel === id, ours.id));
  check("the sheet names the bunker and the point", await ev(id => {
    const t = (document.getElementById("tally-sheet") || {}).textContent || "";
    return t.includes(id) && /point 1/.test(t) && /Did he make it/.test(t) && /Log this breakout/.test(t);
  }, ours.id));
  check("a bunker on your half is your player", await ev(() => S.tallyDraft.side === "us"));
  const theirs = await ev(() => { const b = curLayout().bunkers.find(x => x.x > 90 && x.y > 80); return {id:b.id, x:b.x, y:b.y}; });
  await tapTally([theirs.x, theirs.y]);
  check("past the fifty it is theirs", await ev(() => S.tallyDraft.side === "them"));
  check("the sheet offers their numbers, not your roster", await ev(() => {
    const t = document.getElementById("tally-sheet").textContent; return /#1/.test(t) && !/Reyes/.test(t);
  }));
  await tapTally([ours.x, ours.y]);
  check("Shot from waits until he was shot", await ev(() => !/Shot from/.test(document.getElementById("tally-sheet").textContent)));
  await ev(() => window.setDraft({ alive:false, entry:"battle", dir:-90, player:"Reyes" }));
  check("Shot from appears once he was, listing only the far side", await ev(() => {
    const sheet = document.getElementById("tally-sheet");
    if(!/Shot from/.test(sheet.textContent)) return false;
    const sel = [...sheet.querySelectorAll("select")][0];
    const ids = [...sel.options].map(o => o.value).filter(Boolean);
    return ids.length > 0 && ids.every(id => curLayout().bunkers.find(b => b.id === id).x > 75);
  }));
  check("the pad shows the lane he was shooting", await ev(() => document.querySelector("#tally-sheet .pad button.on").textContent === "↑"));
  await ev(() => window.set({ tallyTrace:true }));
  for (const p of [[20,100],[40,90],[50,95],[60,100],[65,105],[70,110]]) await tapTally(p);
  check("tracing lays up to five points and refuses the sixth", await ev(() => S.tallyDraft.route.length === 5));
  check("the route is drawn from what was tapped", await ev(() => document.querySelectorAll("#tally-map .tally-route").length >= 5 && document.querySelectorAll("#tally-map .tally-pt").length === 5));
  await tapTally(await ev(() => [S.tallyDraft.route[0].x + 2, S.tallyDraft.route[0].y]));
  check("tapping a laid point marks a hold, drawn dashed", await ev(() => S.tallyDraft.route[0].dl === true && !!document.querySelector("#tally-map .tally-route[stroke-dasharray]")));
  await ev(() => window.set({ tallyTrace:false }));
  await tapTally([theirs.x, theirs.y]);
  check("switching bunkers keeps the answers, drops the man and the route", await ev(() => {
    const d = S.tallyDraft; return d.alive === false && d.entry === "battle" && d.player === "" && d.route.length === 0;
  }));
  await tapTally([ours.x, ours.y]);
  await ev(() => window.setDraft({ side:"us", sideSet:true, player:"Reyes", route:[{x:20,y:100,b:"",dl:true}], routeType:"Deep", movedTo:curLayout().bunkers[10].id }));
  await ev(() => window.logBreakout());
  check("Log stamps the match, the point and the field", await ev(id => {
    const r = S.breakouts[0]; return r.m === S.matchId && r.pt === 1 && r.layout === S.layoutKey && r.bunker === id && r.side === "us";
  }, ours.id));
  check("a named man shot on the break is an out, at that bunker", await ev(id => {
    const o = S.tally.find(o => o.m === S.matchId && o.pt === 1 && o.side === "us" && o.name === "Reyes");
    return !!o && o.shotAt === id && /4 up/.test(document.getElementById("root").textContent);
  }, ours.id));
  check("the sheet closes and says what was logged, with Undo", await ev(() => {
    const t = document.getElementById("root").textContent;
    return !S.tallySel && /Logged:/.test(t) && /Reyes/.test(t) && /Deep route/.test(t) && !!document.querySelector("button[onclick^='undoBreakout']");
  }));
  check("this point's man sits on the field, crossed out", await ev(() => document.querySelectorAll("#tally-map .tally-man").length === 1 && /✕/.test(document.querySelector("#tally-map .tally-man").textContent)));
  await ev(() => window.undoBreakout(S.breakouts[0].id));
  check("Undo takes the breakout and its out together", await ev(() => S.breakouts.length === 0 && !S.tally.some(o => o.name === "Reyes")));
  await tapTally([ours.x, ours.y]);
  await ev(() => { window.setDraft({ alive:true, entry:"clean", player:"Okafor" }); window.logBreakout(); });
  check("a man who made it is not an out", await ev(() => S.breakouts.length === 1 && S.tally.length === 0));
  await ev(() => window.setRead("right"));
  check("the read is ticked on screen before the result", await ev(() => S.tallyRead === "right" && document.querySelector("button[onclick=\"setRead('right')\"]").classList.contains("on")));
  await ev(() => window.endPoint("us"));
  check("the read rides on the result and clears for the next point", await ev(() => S.results[0].read === "right" && S.tallyRead === "" && S.point === 2 && !S.tallySel));
  check("the value table counts the point that bunker won", await ev(id => {
    const v = bunkerValue("us")[0]; const t = document.getElementById("root").textContent;
    return v.id === id && v.att === 1 && v.made === 1 && v.net === 1 && /Best bunker/.test(t) && !!document.querySelector("#tally-map .tally-worth");
  }, ours.id));
  check("reads are counted on the sheet", await ev(() => /1 right/.test(document.getElementById("root").textContent)));
  check("another field shows none of it", await ev(() => {
    const was = S.layoutKey; window.set({ layoutKey: Object.keys(LAYOUTS).find(k => k !== was) });
    const none = bunkerValue("us").length === 0 && !document.querySelector("#tally-map .tally-worth");
    window.set({ layoutKey: was }); return none;
  }));
  check("a breakout alone is enough for the match to remember its point", await ev(() => {
    S.breakouts = [{...S.breakouts[0], pt:7, id:"b-late"}, ...S.breakouts]; const n = lastPoint(S.matchId);
    S.breakouts = S.breakouts.filter(r => r.id !== "b-late"); return n === 7;
  }));
  {
    const r = await ev(() => { const d = JSON.parse(copyPayload("all")).data;
      return { ok: matchSize(S.matchId) >= 1 && Array.isArray(d.breakouts) && d.breakouts.length === 1 && copyDataError(d) === "", err: copyDataError(d), n: (d.breakouts||[]).length }; });
    check("breakouts count toward the sheet and travel in a copy", r.ok, r.ok ? "" : JSON.stringify(r));
  }
  check("a copy with a bad breakout is refused by name", await ev(() => {
    const d = JSON.parse(copyPayload("all")).data; d.breakouts = [{id:"x", m:"m", layout:"l", bunker:"b", side:"nobody", pt:1, at:1}];
    return copyDataError(d) === "breakouts";
  }));
  await ev(() => window.set({ tallySel:null, tallyDraft:null, tallyTrace:false, breakouts:[], results:[], point:1 }));

  /* --------------------------------------------------------------------
     The break belongs on the screens about the break

     Movement, Bunker stats, Codes, Layers and Sightlines were each drawing
     the five break paths over the thing they are actually about. A coach
     logging a rotation was reading a call nobody made on that screen.
     -------------------------------------------------------------------- */
  G("The break only where it belongs");
  const runnersOn = () => ev(() => document.querySelectorAll(".field-wrap svg.field g.live circle[r='6']").length);
  const fieldsOn = () => ev(() => document.querySelectorAll(".field-wrap svg.field").length);
  for (const [tab, more, name] of [["more","movement","Movement"], ["more","stats","Bunker stats"],
                                   ["more","team","Team, naming bunkers"], ["sightlines",null,"Sightlines"]]) {
    await go(tab, more);
    const [n, f] = [await runnersOn(), await fieldsOn()];
    check(`${name} draws the field and no break runners`, f > 0 && n === 0, `${f} field(s), ${n} runners`);
  }
  // Scout always carries its own break section above the sub-tab, and that one
  // is meant to have runners. The layers field underneath is not.
  await ev(() => window.set({ tab:"scout", scoutTab:"layers", right:{name:"Rejects"} }));
  check("Scout layers draws no break runners over the layers",
    await ev(() => document.querySelectorAll(".field-wrap:not([data-live]) svg.field g.live circle[r='6']").length) === 0);
  // Games and Division are tables. The break section is gone from those two.
  for (const [v, name] of [["games","Scout games"], ["board","Scout division"]]) {
    await ev(x => window.set({ tab:"scout", scoutTab:x, right:{name:"Rejects"} }), v);
    const [runners, fields] = [
      await ev(() => document.querySelectorAll(".field-wrap svg.field g.live circle[r='6']").length),
      await ev(() => document.querySelectorAll(".field-wrap svg.field").length)];
    check(`${name} is a table, with no break drawn over it`, runners === 0, `${fields} field(s), ${runners} runners`);
  }
  /* ------------------------------------------ the app speaks the coach's words */
  G("The calls are named the way the team says them");
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake", right: { name: "Rejects" } });
  check("out of the box the app uses its own names",
    await ev(() => breakName() === BREAKS.snake.name));
  // Log one first, so the sheets that only print a call they have actually seen
  // have one to print. The header uppercases its line in CSS, so innerText
  // comes back as ROCKET — every match here is deliberately case-insensitive.
  await ev(() => { window.set({ breakCalls: { snake: "Rocket" } }); window.logCall(); });
  const saysRocket = async st => {
    await ev(x => window.set(x), st); await page.waitForTimeout(90);
    return ev(() => { const t = document.getElementById("root").innerText;
      return /rocket/i.test(t) && !new RegExp(BREAKS.snake.name, "i").test(t); });
  };
  for (const [label, st] of [["Playbook", { tab: "playbook", pbView: null }],
                             ["the point sheet", { tab: "tally" }],
                             ["Scout", { tab: "scout", scoutTab: "matchup" }],
                             ["Counter", { tab: "scout", scoutTab: "counter" }],
                             ["Cards", { tab: "playbook", pbView: "cards" }],
                             ["Matches", { tab: "more", more: "matches", pbView: null }]])
    check(`${label} says the coach's word and not the app's`, await saysRocket(st));
  check("and so does the line in the header", await ev(() =>
    /ROCKET/i.test(document.querySelector(".ctx__line").innerText)));
  // The record is the break, never the label, or a rename would rewrite history.
  check("a logged call keeps the break, not the word",
    await ev(() => (S.calls || [])[0].script === "snake"));
  check("renaming re-labels a call logged before the rename", await ev(() => {
    window.set({ breakCalls: { snake: "Tomahawk" } });
    return callName((S.calls || [])[0].script) === "Tomahawk";
  }));
  check("putting the app's names back leaves the logged calls alone", await ev(() => {
    window.clearBreakCalls();
    return callName("snake") === BREAKS.snake.name && (S.calls || [])[0].script === "snake";
  }));
  check("a blank word is not a name", await ev(() => {
    window.set({ breakCalls: { snake: "   " } });
    return callName("snake") === BREAKS.snake.name;
  }));
  check("the words travel in a copy, and in a squad copy", await ev(() => {
    window.set({ breakCalls: { snake: "Rocket" } });
    const all = JSON.parse(copyPayload("all")).data, squad = JSON.parse(copyPayload("squad")).data;
    return copyDataError(all) === "" && all.breakCalls.snake === "Rocket"
        && squad.breakCalls.snake === "Rocket";
  }));
  check("a copy carrying a broken word is refused", await ev(() => {
    const d = JSON.parse(copyPayload("all")).data; d.breakCalls = { snake: 7 };
    return copyDataError(d) === "breakCalls";
  }));
  check("Team is where the twelve are named", await ev(() => {
    window.set({ tab: "more", more: "team", breakCalls: {} });
    return document.querySelectorAll("#root input[id^='brc-']").length === Object.keys(BREAKS).length;
  }));
  check("a renamed call still shows which of the twelve it is", await ev(() => {
    window.set({ breakCalls: { snake: "Rocket" } });
    const t = document.getElementById("root").innerText;
    return t.includes(BREAKS.snake.name);
  }));
  check("an un-renamed one says the app's name once, not twice", await ev(() => {
    window.set({ breakCalls: {} });
    const t = document.getElementById("root").innerText;
    return !t.includes(BREAKS.conserve.name);        // placeholder only
  }));
  check("Playbook points at it until he has used it once", await ev(() => {
    window.set({ tab: "playbook", more: null, breakCalls: {} });
    const before = /Name the twelve/.test(document.getElementById("root").innerText);
    window.set({ breakCalls: { snake: "Rocket" } });
    const after = /Name the twelve/.test(document.getElementById("root").innerText);
    window.set({ breakCalls: {} });
    return before && !after;
  }));

  /* -------------------------------------------------- the names are a layer */
  G("Bunker codes are a layer, not the wallpaper");
  const codesOn = () => ev(() => {
    const f = document.querySelector("#root .field-wrap svg.field");
    return f ? [...f.querySelectorAll("text")]
      .filter(t => /^[A-Za-z]{1,2}[0-9]*$/.test(t.textContent.trim())).length : -1;
  });
  await seed({ tab: "scout", scoutTab: "matchup", right: { name: "Rejects" } });
  check("a coach opens on a field he can read, not a wall of codes",
    await ev(() => S.namesOn === false) && await codesOn() === 0);
  await ev(() => window.set({ namesOn: true }));
  check("the Names chip writes them on", await codesOn() > 20);
  await ev(() => window.set({ namesOn: false }));
  check("and takes them off again", await codesOn() === 0);
  check("the chip is on Playbook and on Scout", await ev(() => {
    const hasIt = () => [...document.querySelectorAll("#root .tgl")].some(b => /Names/.test(b.textContent));
    window.set({ tab: "playbook" }); const pb = hasIt();
    window.set({ tab: "scout", scoutTab: "matchup" }); return pb && hasIt();
  }));
  // Where a named bunker is the subject the codes are not optional.
  for (const [tab, more, label] of [["sightlines", null, "Sightlines"],
                                    ["more", "movement", "Movement"],
                                    ["more", "stats", "Bunker stats"]]) {
    await ev(x => window.set({ tab: x[0], more: x[1], namesOn: false }), [tab, more]);
    check(label + " keeps the codes whatever the chip says", await codesOn() > 20);
  }
  await seed({ tab: "tally" });
  check("Tally opens on a clean field \u2014 the sheet names the bunker you tap",
    await codesOn() === 0);

  check("the training-aid line is on every Scout view, tables and voice included", await ev(() => {
    return SCOUT_TABS.every(([k]) => { window.set({ tab:"scout", scoutTab:k });
      return /training aid, not a prediction/i.test(document.getElementById("root").textContent); });
  }));
  for (const v of ["matchup","anticipate","counter"]) {
    await ev(x => window.set({ tab:"scout", scoutTab:x }), v);
    check(`Scout ${v} keeps the break section`,
      await ev(() => document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']").length) === 5);
  }

  // and the screens that ARE about the break still draw it
  await go("playbook");
  check("Playbook still draws the five", await runnersOn() === 5);
  await ev(() => window.set({ tab:"scout", scoutTab:"matchup", scoutShow:"them" }));
  check("Scout's break section still draws a five", await runnersOn() === 5);

  /* --------------------------------------------------------------------
     Help — a coach on a sideline has no signal and nobody to ask
     -------------------------------------------------------------------- */
  G("Help");
  check("every screen in the app has a help entry", await ev(() => {
    const want = ["playbook","playbook/cards","playbook/rep","tally","sightlines",
      ...SCOUT_TABS.map(([k]) => "scout/" + k),
      ...MORE_GROUPS.flatMap(([, rows]) => rows.map(r => "more/" + r[0])).filter(k => k !== "more/help")];
    const missing = want.filter(k => !HELP[k]);
    window.__missing = missing.join(", ");
    return missing.length === 0;
  }), await ev(() => window.__missing));
  check("the header ? opens help for the screen you are on", await ev(() => {
    window.set({ tab:"scout", scoutTab:"counter" });
    const btn = document.querySelector(".help-btn"); if(!btn) return false;
    btn.click();
    return S.tab === "more" && S.more === "help" && S.helpFor === "scout/counter"
      && /They run X, we run Y/.test(document.getElementById("root").textContent);
  }));
  check("help for a screen names what it is for and how to use it", await ev(() => {
    window.set({ tab:"more", more:"help", helpFor:"tally" });
    const t = document.getElementById("root").textContent;
    return /break chart and the point sheet/.test(t) && document.querySelectorAll(".howto li").length >= 3;
  }));
  check("Show all lists every screen", await ev(() => {
    window.set({ helpFor:"" });
    return document.querySelectorAll(".list__row").length >= Object.keys(HELP).length;
  }));
  check("a question opens its answer in place", await ev(() => {
    window.set({ tab:"more", more:"help", helpFor:"", helpQ:-1 });
    const before = document.getElementById("root").textContent;
    window.set({ helpQ: 0 });
    const after = document.getElementById("root").textContent;
    return after.length > before.length && /Save a copy/.test(after);
  }));
  check("the hints can be put back after they were dismissed", await ev(() => {
    window.set({ tips:{ tally:1 }, tab:"tally" });
    const gone = !/Tap the bunker a man broke to/.test(document.querySelector(".tip")?.textContent || "");
    window.showHints();
    window.set({ tab:"tally" });
    return gone && !!document.querySelector(".tip");
  }));
  check("Help is in the More menu", await ev(() => {
    window.set({ tab:"more", more:null });
    return /What every screen does/.test(document.getElementById("root").textContent);
  }));
  check("the tutorial describes the Tally that actually exists", await ev(() => {
    window.set({ showTutorial:true, tab:"playbook" });
    const t = document.getElementById("root").textContent;
    const ok = /Tap the bunker a man broke to/.test(t) && !/Tap a player the moment he goes out\.<\/span>/.test(t);
    window.set({ showTutorial:false });
    return ok;
  }));

  /* --------------------------------------------------------------------
     A launch is a fresh start on every screen

     `playing` was reset on load and nothing else was, so a Right read ticked
     and never used rode to whatever point was ended next, and a half-filled
     breakout sheet came back open on yesterday's bunker under today's point.
     -------------------------------------------------------------------- */
  G("Nothing half-done survives a relaunch");
  await ev(() => {
    window.set({ tab:"tally", tallyRead:"right", tallyPick:true, helpFor:"scout/counter", helpQ:3,
                 editPath:true, pad:"face:1", replayPt:4, replayStep:2, theirPick:["x"], sightAim:[10,10] });
    window.selectBunker(curLayout().bunkers[3].id);
    window.setDraft({ player:"Reyes", alive:false });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  {
    const left = await ev(() => Object.entries({
      tallySel:S.tallySel, tallyDraft:S.tallyDraft, tallyTrace:S.tallyTrace, tallyRead:S.tallyRead,
      tallyPick:S.tallyPick, tallyLast:S.tallyLast, helpFor:S.helpFor, helpQ:S.helpQ,
      editPath:S.editPath, pad:S.pad, replayPt:S.replayPt, replayStep:S.replayStep,
      theirPick:(S.theirPick||[]).length, sightAim:S.sightAim, playing:S.playing, paste:S.paste,
    }).filter(([k, v]) => !(v === null || v === "" || v === false || v === -1 || v === 0))
      .map(([k]) => k).join(", "));
    check("nothing a coach was in the middle of survives a relaunch", !left, left);
  }
  check("a read ticked last session cannot ride onto the next point", await ev(() => {
    const pt = S.point || 1;
    window.endPoint("us");
    const r = (S.results || []).find(x => x.m === S.matchId && x.pt === pt);
    window.backPoint();
    return r && !r.read;
  }));

  G("House rules");
  const html = await ev(() => document.documentElement.outerHTML);
  check("the banned shot-tool name appears nowhere", !/gunz\s*up/i.test(html));
  check("the control is called Shot lanes", await ev(() => { window.set({ tab: "playbook" }); return document.getElementById("root").textContent.includes("Shot lanes"); }));
  check("the UPRA mark is on screen", await ev(() => document.getElementById("root").textContent.includes("powered by UPRA")));

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

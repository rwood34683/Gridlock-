#!/usr/bin/env node
"use strict";
/* Voice-log UI/data integration. A deterministic speech double supplies
 * transcripts without opening a microphone or depending on recognition. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");

function installRecognitionDouble() {
  window.__voiceTest = {sessions: [], starts: 0, stops: 0};
  class Recognition extends EventTarget {
    constructor() { super(); this.results = []; this.running = false; window.__voiceTest.sessions.push(this); }
    fire(type, values = {}) {
      const event = new Event(type);
      Object.assign(event, values);
      this.dispatchEvent(event);
      if (typeof this["on" + type] === "function") this["on" + type](event);
    }
    start() {
      this.running = true; window.__voiceTest.starts++;
      queueMicrotask(() => { if (this.running) this.fire("start"); });
    }
    stop() { this.running = false; window.__voiceTest.stops++; queueMicrotask(() => this.fire("end")); }
    abort() { this.stop(); }
    emit(text, final = true, index = this.results.length) {
      const result = [{transcript: text, confidence: 0.98}];
      result.isFinal = final;
      this.results[index] = result;
      this.fire("result", {resultIndex: index, results: this.results.slice()});
    }
    fail(code) { this.fire("error", {error: code, message: code}); }
  }
  window.SpeechRecognition = Recognition;
  window.webkitSpeechRecognition = Recognition;
}

async function run(page) {
  const button = name => page.getByRole("button", {name, exact: true});
  await page.evaluate(() => localStorage.setItem("gridlock.coach.v2", JSON.stringify({
    entered: true, role: "staff", tab: "scout", scoutTab: "matchup", layoutKey: "mwo", point: 3,
    matchId: "voice-match-one", matches: [
      {id: "voice-match-one", at: 100000, vs: "Voice Opponent", layout: "mwo"},
      {id: "voice-match-two", at: 200000, vs: "Other Opponent", layout: "mwo"},
    ],
    teams: {pro: [{name: "Voice Opponent"}, {name: "Other Opponent"}]},
    left: {name: "Other Opponent"}, right: {name: "Voice Opponent"},
    scout: {
      "Voice Opponent": {players: [{num: "7", name: "Alex"}, {num: "12", name: "Jordan"}, {num: "19", name: "Sam"}]},
      "Other Opponent": {players: [{num: "7", name: "Alex"}]},
    },
    bunkerCalls: {mwo: {"GW#1": "Home", "C#4": "Camp"}},
  })));
  await page.reload({waitUntil: "networkidle"});
  await button("Voice log").click();
  await page.locator("#voice-team").selectOption("Voice Opponent");
  await page.locator("#voice-player").selectOption("auto");
  const events = () => page.evaluate(() => S.voiceEvents || []);
  const emit = async (text, final = true, index, session) => page.evaluate(({text, final, index, session}) => {
    const list = window.__voiceTest.sessions, recognizer = session === undefined ? list.at(-1) : list[session];
    if (!recognizer) throw new Error("Speech adapter has not started a recognizer");
    recognizer.emit(text, final, index);
  }, {text, final, index, session});
  const start = async () => {
    const before = await page.evaluate(() => window.__voiceTest.starts);
    await button("Start listening").click();
    await page.waitForFunction(before => window.__voiceTest.starts > before, before);
    await button("Stop listening").waitFor({state: "visible"});
    return page.evaluate(() => window.__voiceTest.sessions.length - 1);
  };

  const firstSession = await start();
  await emit("Alex is", false, 0);
  assert.equal((await events()).length, 0, "Partial recognition is previewed without saving an event");
  assert((await page.locator("main").innerText()).includes("Alex is"), "Live partial transcript appears in the UI");
  await emit("Alex is out", true, 0);
  await page.waitForFunction(() => (S.voiceEvents || []).length === 1);
  const out = (await events())[0];
  assert.equal(out.player, "number:7", "Auto mode identifies a spoken roster player");
  assert.equal(out.kind, "out", "Spoken out is recorded as an out event");
  assert.equal(out.review, false, "A resolved player/action does not require review");
  assert.equal(out.text, "Alex is out", "Finalized transcript is retained");
  assert.equal(out.team, "Voice Opponent");
  assert.equal(out.layout, "mwo");
  assert.equal(out.m, "voice-match-one");
  assert.equal(out.pt, 3, "Final event is stamped with current match/point/layout context");
  assert.equal(await page.evaluate(() => S.tally.length), 0, "Voice observations do not guess a Tally slot or change the score");
  await emit("Alex is out", true, 0);
  assert.equal((await events()).length, 1, "Duplicate final callback does not create a second event");
  await emit("Jordan moved to Home", true, 1);
  await page.waitForFunction(() => S.voiceEvents.length === 2);
  const move = (await events()).find(event => event.player === "number:12");
  assert(move, "The same listening session tracks a second player");
  assert.equal(move.kind, "move");
  assert.equal(move.bunker, "GW#1", "A custom bunker call resolves to its measured bunker");
  assert.equal(move.review, false);
  const linked = await page.evaluate(id => S.arrivalSightings.filter(row => row.voiceId === id), move.id);
  assert.equal(linked.length, 1, "Confident location produces exactly one linked arrival sighting");
  assert.equal(linked[0].player, "number:12");
  assert.equal(linked[0].bunker, "GW#1");
  await emit("Sam was hit at Home", true, 2);
  await page.waitForFunction(() => S.voiceEvents.length === 3);
  const hit = (await events()).find(event => event.player === "number:19");
  assert(hit && hit.kind === "hit" && hit.bunker === "GW#1" && !hit.review, "Hit call is tracked for a third player with its location");
  await emit("they moved to snake", true, 3);
  await page.waitForFunction(() => S.voiceEvents.length === 4);
  const ambiguous = (await events()).find(event => event.text === "they moved to snake");
  assert(ambiguous.review && ambiguous.reason, "Ambiguous speech is preserved with a reason to review it");
  assert.equal(await page.evaluate(id => S.arrivalSightings.filter(row => row.voiceId === id).length, ambiguous.id), 0,
    "An ambiguous observation cannot become a confirmed location");
  const multipleText = "Alex is out and Jordan moved to Home, Sam was hit at Home.";
  await emit(multipleText, true, 4);
  await page.waitForFunction(() => S.voiceEvents.length === 7);
  const multiple = (await events()).filter(event => event.text === multipleText);
  assert.equal(multiple.length, 3, "One finalized utterance can record three different players");
  assert.deepEqual(multiple.map(event => `${event.player}/${event.kind}`).sort(),
    ["number:7/out", "number:12/move", "number:19/hit"].sort(), "Multi-player utterance keeps each action assigned to its speaker-named player");
  assert.equal(new Set(multiple.map(event => event.id)).size, 3, "Split events receive distinct identities for editing and backup merging");
  await emit(multipleText, true, 4);
  assert.equal((await events()).length, 7, "Replayed multi-player callback duplicates none of its events");
  await button("Stop listening").click();
  await button("Start listening").waitFor({state: "visible"});

  const row = id => page.locator(`[data-voice-id="${id}"]`);
  await row(ambiguous.id).getByRole("button", {name: "Edit event", exact: true}).click();
  await page.locator("#voice-edit-player").selectOption("number:19");
  await page.locator("#voice-edit-kind").selectOption("move");
  await page.locator("#voice-edit-bunker").selectOption("C#4");
  await page.locator("#voice-edit-text").fill("Sam moved to C#4 — reviewed by coach");
  await button("Save correction").click();
  const corrected = (await events()).find(event => event.id === ambiguous.id);
  assert.equal(corrected.player, "number:19");
  assert.equal(corrected.bunker, "C#4");
  assert.equal(corrected.review, false, "Review correction resolves the ambiguous observation");
  assert.equal(await page.evaluate(id => S.arrivalSightings.filter(row => row.voiceId === id && row.bunker === "C#4").length, ambiguous.id), 1,
    "Corrected observation receives exactly one linked location");
  await row(move.id).getByRole("button", {name: "Edit event", exact: true}).click();
  await page.locator("#voice-edit-bunker").selectOption("T#1");
  await button("Save correction").click();
  const replacedLink = await page.evaluate(id => S.arrivalSightings.filter(row => row.voiceId === id), move.id);
  assert.equal(replacedLink.length, 1, "Editing a location replaces its link instead of duplicating it");
  assert.equal(replacedLink[0].bunker, "T#1");
  await row(ambiguous.id).getByRole("button", {name: "Undo event", exact: true}).click();
  assert(!(await events()).some(event => event.id === ambiguous.id), "Undo removes the chosen voice event");
  assert.equal(await page.evaluate(id => S.arrivalSightings.filter(row => row.voiceId === id).length, ambiguous.id), 0, "Undo removes only that event's linked location");
  assert.equal(await page.evaluate(id => S.arrivalSightings.filter(row => row.voiceId === id).length, move.id), 1, "Undo preserves another event's linked location");

  const typed = async text => {
    await page.locator("#voice-manual").fill(text);
    if (!text.trim() && await button("Record text").isDisabled()) return;
    await button("Record text").click();
  };
  const countBeforeBlank = (await events()).length;
  await typed("   ");
  assert.equal((await events()).length, countBeforeBlank, "Blank typed fallback is not recorded");
  await typed("Alex moved to Home");
  const manual = (await events()).find(event => event.text === "Alex moved to Home");
  assert(manual && manual.source === "typed" && manual.bunker === "GW#1", "Typed fallback uses the same event and bunker parsing");
  await page.locator("#voice-player").selectOption("number:19");
  await typed("moved to Home");
  const selectedMove = (await events()).find(event => event.text === "moved to Home");
  assert(selectedMove && selectedMove.player === "number:19" && selectedMove.kind === "move" && !selectedMove.review,
    "Selected-player mode supplies the actor when the utterance has no player name");
  await page.locator("#voice-player").selectOption("auto");

  const draftCount = (await events()).length;
  await page.locator("#voice-manual").fill("Jordan moved to Home");
  await page.evaluate(() => set({point: 4}));
  await button("Record text").click();
  assert.equal((await events()).length, draftCount, "A typed draft from an earlier point cannot be silently recorded in the new point");
  await button("Clear draft").click();
  assert.equal(await page.locator("#voice-manual").inputValue(), "", "The stale draft can be explicitly cleared");
  await page.evaluate(() => set({point: 3}));
  await page.locator("#voice-manual").fill("Jordan is out");
  await page.locator("#voice-team").selectOption("Other Opponent");
  await button("Record text").click();
  assert.equal((await events()).length, draftCount, "Changing opponent does not attribute an old typed draft to the new team");
  await page.locator("#voice-manual").fill("Alex is eliminated");
  await button("Record text").click();
  const newlyEdited = (await events()).at(-1);
  assert(newlyEdited.text === "Alex is eliminated" && newlyEdited.team === "Other Opponent" && newlyEdited.player === "number:7",
    "Editing the stale draft explicitly records the revised observation under the current team");
  await page.locator("#voice-team").selectOption("Voice Opponent");

  const protectedCount = (await events()).length;
  for (const change of [{point: 4}, {layoutKey: "tby"}, {matchId: "voice-match-two"}]) {
    await page.evaluate(() => set({layoutKey: "mwo", point: 3, matchId: "voice-match-one", tab: "scout", scoutTab: "voice"}));
    const session = await start();
    const stopsBefore = await page.evaluate(() => window.__voiceTest.stops);
    await emit("Alex moved", false, 0, session);
    await page.evaluate(change => set(change), change);
    await page.waitForFunction(before => window.__voiceTest.stops > before, stopsBefore);
    await emit("Alex moved to Home", true, 0, session);
    assert.equal((await events()).length, protectedCount, "A late result after changing point/field/match is discarded");
  }
  await page.evaluate(() => set({layoutKey: "mwo", point: 3, matchId: "voice-match-one", tab: "scout", scoutTab: "voice"}));
  const teamSession = await start();
  await page.locator("#voice-team").selectOption("Other Opponent");
  await emit("Alex is out", true, 0, teamSession);
  assert.equal((await events()).length, protectedCount, "A late result cannot be assigned to a newly selected team");
  await page.locator("#voice-team").selectOption("Voice Opponent");
  const playerSession = await start();
  await page.locator("#voice-player").selectOption("number:19");
  await emit("Alex is out", true, 0, playerSession);
  assert.equal((await events()).length, protectedCount, "A late result cannot be attributed to a newly selected player");
  await page.locator("#voice-player").selectOption("auto");
  const navigationSession = await start();
  await button("Playbook").click();
  await emit("Alex is out", true, 0, navigationSession);
  assert.equal((await events()).length, protectedCount, "Leaving the voice tab stops capture and ignores late results");
  await button("Scout").click();
  await button("Voice log").click();
  const backgroundSession = await start();
  const beforeBackground = await page.evaluate(() => ({starts: window.__voiceTest.starts, stops: window.__voiceTest.stops}));
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {configurable: true, get: () => true});
    Object.defineProperty(document, "visibilityState", {configurable: true, get: () => "hidden"});
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(before => window.__voiceTest.stops > before, beforeBackground.stops);
  await emit("Alex is out", true, 0, backgroundSession);
  assert.equal((await events()).length, protectedCount, "Backgrounding stops recognition and discards late results");
  await page.evaluate(() => {
    delete document.hidden; delete document.visibilityState;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__voiceTest.starts), beforeBackground.starts, "Returning to the foreground does not restart the microphone automatically");
  const errorSession = await start();
  await page.evaluate(session => window.__voiceTest.sessions[session].fail("not-allowed"), errorSession);
  await button("Start listening").waitFor({state: "visible"});
  assert(/microphone|permission|denied|allow/i.test(await page.locator("main").innerText()), "Microphone error is explained in the UI");
  await typed("Sam is out");
  assert((await events()).some(event => event.text === "Sam is out" && event.source === "typed"), "Typed fallback still works after recognition failure");
  await emit("Alex is out", true, 9, firstSession);
  assert.equal((await events()).filter(event => event.text === "Alex is out").length, 1, "Results from an old stopped session stay ignored");

  for (const text of ["Alex is looking at Home", "Alex is aiming at Home", "number 7 was shot by Morgan at Home"]) {
    await typed(text);
    const recorded = (await events()).filter(event => event.text === text);
    assert(recorded.length > 0, "Uncertain narration is retained for review");
    for (const event of recorded) {
      assert.equal(await page.evaluate(id => S.arrivalSightings.filter(row => row.voiceId === id).length, event.id), 0,
        `Unconfirmed target/shooter location must not become an observed player position: ${text}`);
    }
  }

  await page.locator("#voice-side").selectOption("left");
  await typed("Alex moved to Home");
  const leftEvent = (await events()).at(-1);
  assert.equal(leftEvent.side, "left", "The selected starting end is saved with a voice event");
  await row(leftEvent.id).getByRole("button", {name: "View route", exact: true}).click();
  assert.equal(await page.evaluate(() => S.arrival.startEnd), "left", "View route restores the event's left starting end");
  assert(await page.evaluate(() => arrivalModel().route.points[0][0] < 10), "Left-side voice event opens a route from the left station");
  await button("Voice log").click();
  await page.locator("#voice-side").selectOption("right");

  const pointThreeIds = await page.evaluate(() => S.arrivalSightings.filter(row => row.pt === 3).map(row => row.id));
  await page.evaluate(() => set({point: 8}));
  await typed("Alex moved to Home");
  const older = (await events()).at(-1);
  await typed("Jordan moved to Camp");
  const later = (await events()).at(-1);
  assert(older.at < later.at, "Chronology fixture has distinct observation times");
  await row(older.id).getByRole("button", {name: "Edit event", exact: true}).click();
  await page.locator("#voice-edit-player").selectOption("number:12");
  await button("Save correction").click();
  const correctedOrder = await page.evaluate(() => arrivalSightings({team: "Voice Opponent", player: "number:12", layout: "mwo", m: "voice-match-one", pt: 8}));
  assert.deepEqual(correctedOrder.map(sighting => sighting.voiceId), [older.id, later.id], "Correcting an earlier observation to another player keeps it before that player's later history");
  assert.deepEqual(correctedOrder.map(sighting => sighting.seq), [1, 2], "Reassigned player history is renumbered in chronological order");
  assert.deepEqual(correctedOrder.map(sighting => sighting.bunker), ["GW#1", "C#4"], "Corrected route history travels from the old observation to the later one");
  assert.deepEqual(await page.evaluate(() => S.arrivalSightings.filter(row => row.pt === 3).map(row => row.id)), pointThreeIds, "Correction renumbers only the affected context");
  await page.evaluate(() => set({point: 3}));

  const quotedId = `imported-"quote'<x data-voice-id-injected>`;
  const importedText = "Imported event with a quoted identifier";
  const quotedCopy = await page.evaluate(({id, text}) => {
    const payload = JSON.parse(copyPayload("all"));
    payload.data = {voiceEvents: [{...S.voiceEvents.find(event => !event.review && event.bunker), id, text,
      originalText: text, side: "left", pt: 3, corrected: false}]};
    return JSON.stringify(payload);
  }, {id: quotedId, text: importedText});
  await page.evaluate(() => set({tab: "more", more: "nexus"}));
  await page.locator("#copyIn").fill(quotedCopy);
  await button("Merge it in").click();
  await page.evaluate(() => set({tab: "scout", scoutTab: "voice"}));
  const quotedRow = page.locator("article[data-voice-id]").filter({hasText: importedText});
  assert.equal(await quotedRow.getAttribute("data-voice-id"), quotedId, "Imported identifier is preserved in an escaped attribute");
  assert.equal(await page.locator("[data-voice-id-injected]").count(), 0, "Imported identifier cannot inject markup");
  await quotedRow.getByRole("button", {name: "Edit event", exact: true}).click();
  await page.locator("#voice-edit-text").fill(importedText + " corrected");
  await button("Save correction").click();
  assert((await events()).find(event => event.id === quotedId).corrected, "Edit action safely addresses an imported identifier containing quotes");
  await quotedRow.getByRole("button", {name: "View route", exact: true}).click();
  assert.equal(await page.evaluate(() => S.arrival.startEnd), "left", "View-route action safely handles the quoted identifier");
  await button("Voice log").click();
  await quotedRow.getByRole("button", {name: "Undo event", exact: true}).click();
  assert(!(await events()).some(event => event.id === quotedId), "Undo safely removes only the event with the quoted identifier");
  assert.equal(await page.evaluate(id => S.arrivalSightings.filter(row => row.voiceId === id).length, quotedId), 0, "Undo removes the quoted-ID event's linked sighting");

  await typed(`Unclear <b data-voice-injected>long transcript</b> "quoted" ` + "x".repeat(180));
  assert.equal(await page.locator("[data-voice-injected]").count(), 0, "Transcript is rendered as text, never markup");
  for (const width of [320, 390]) {
    await page.setViewportSize({width, height: 844});
    const fit = await page.evaluate(() => {
      const main = document.querySelector("main");
      return document.documentElement.scrollWidth <= innerWidth + 1 && main.scrollWidth <= main.clientWidth + 1;
    });
    assert(fit, `Voice log and long transcripts fit ${width}px width`);
  }

  const beforeReload = await page.evaluate(() => ({events: S.voiceEvents, sightings: S.arrivalSightings}));
  assert.equal(await page.evaluate(() => copyDataError(JSON.parse(localStorage.getItem("gridlock.coach.v2")))), "", "Voice events satisfy saved-state validation");
  await page.reload({waitUntil: "networkidle"});
  assert.equal(await page.evaluate(() => _recoveryText), "", "Reload accepts the saved voice timeline");
  assert.deepEqual(await page.evaluate(() => ({events: S.voiceEvents, sightings: S.arrivalSightings})), beforeReload,
    "Voice events and linked sightings survive reload");
  assert.equal(await page.evaluate(() => window.__voiceTest.starts), 0, "Reload never automatically opens the microphone");
  const backup = await page.evaluate(() => copyPayload("all"));
  assert.deepEqual(JSON.parse(backup).data.voiceEvents, beforeReload.events, "Full backup includes voice events");
  assert.equal(await page.evaluate(() => JSON.parse(copyPayload("squad")).data.voiceEvents === undefined), true, "Squad-only backup excludes event history");
  await page.evaluate(() => { S.voiceEvents = []; S.arrivalSightings = []; set({tab: "more", more: "nexus"}); });
  await page.locator("#copyIn").fill(backup);
  await button("Merge it in").click();
  assert.deepEqual(await page.evaluate(() => ({events: S.voiceEvents, sightings: S.arrivalSightings})), beforeReload,
    "Import restores voice events and their linked sightings together");
  await page.locator("#copyIn").fill(backup);
  await button("Merge it in").click();
  assert.deepEqual(await page.evaluate(() => ({events: S.voiceEvents, sightings: S.arrivalSightings})), beforeReload,
    "Repeated import duplicates neither events nor linked sightings");
  console.log("PASS voice integration: browser adapter with simulated speech, partial/final and duplicate/stale callbacks, multiple players, review/edit/undo links, chronology, left starting end, quoted imported IDs, safe location inference, background stop, typed fallback/stale drafts, permission errors, 320/390px layout, reload/backup merge.");
}

async function unsupportedRecognition(browser, url) {
  const context = await browser.newContext({viewport: {width: 320, height: 844}, serviceWorkers: "block"});
  try {
    await context.addInitScript(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(url, {waitUntil: "networkidle"});
    await page.evaluate(() => {
      set({entered: true, role: "staff", tab: "scout", scoutTab: "voice", right: {name: "No speech engine"},
        scout: {"No speech engine": {players: [{num: "7", name: "Alex"}]}}});
    });
    await page.waitForFunction(() => _voiceUI.availability && !_voiceUI.availability.available);
    assert(await page.getByRole("button", {name: "Start listening", exact: true}).isDisabled(), "Unavailable recognition disables microphone start");
    assert(/dictation is unavailable/i.test(await page.locator("main").innerText()), "Unsupported browser explains the text fallback");
    await page.locator("#voice-manual").fill("Alex is out");
    await page.getByRole("button", {name: "Record text", exact: true}).click();
    const rows = await page.evaluate(() => S.voiceEvents);
    assert.equal(rows.length, 1, "Typed fallback records an event with no speech engine installed");
    assert.equal(rows[0].source, "typed");
    assert.equal(rows[0].player, "number:7");
    assert.deepEqual(errors, [], "Unsupported speech does not cause browser errors");
    console.log("PASS voice unsupported-engine fallback: microphone disabled, explanation visible, typed event parsed and saved.");
  } finally { await context.close(); }
}

async function main() {
  let server, browser;
  try {
    let url = process.env.APP_URL;
    if (!url) {
      server = createServer();
      await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
      url = `http://127.0.0.1:${server.address().port}/`;
    }
    browser = await chromium.launch(launchOptions());
    const context = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: "block"});
    await context.addInitScript(installRecognitionDouble);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", dialog => dialog.accept());
    await page.goto(url, {waitUntil: "networkidle"});
    await run(page);
    assert.deepEqual(errors, [], "Voice UI produces no uncaught browser errors");
    await context.close();
    await unsupportedRecognition(browser, url);
  } finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

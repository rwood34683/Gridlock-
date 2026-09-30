#!/usr/bin/env node
"use strict";
/* Drive the custom-opponent forms in the real app, including reuse, storage,
 * safe text rendering and the observation identity preserved by roster edits. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");

async function run(page) {
  await page.evaluate(() => localStorage.setItem("gridlock.coach.v2", JSON.stringify({
    entered: true, role: "staff", tab: "scout", scoutTab: "arrival", layoutKey: "mwo", point: 3,
    matchId: "custom-opponent-match", matches: [{id: "custom-opponent-match", at: 100000, vs: "Existing Opponent", layout: "mwo"}],
    left: {name: "Existing Opponent"}, right: {name: "Existing Opponent"},
    teams: {pro: [{name: "Existing Opponent"}]},
    scout: {"Existing Opponent": {notes: "Preserve these scouting notes", players: [{name: "Quinn", num: "7", note: "Known runner", threat: 4}]}},
  })));
  await page.reload({waitUntil: "networkidle"});
  const button = name => page.getByRole("button", {name, exact: true});
  const customTeams = () => page.evaluate(() => Object.values(S.teams || {}).flat().map(t => t.name));
  const players = team => page.evaluate(team => (S.scout[team] || {}).players || [], team);
  const selected = () => page.evaluate(() => arrivalContext());
  const openTeam = async () => { await button("Add team").click(); await page.locator("#arrival-custom-team").waitFor({state: "visible"}); };
  const addTeam = async name => { await openTeam(); await page.locator("#arrival-custom-team").fill(name); await button("Save team").click(); };
  const openPlayer = async () => { await button("Add player").click(); await page.locator("#arrival-custom-name").waitFor({state: "visible"}); };
  const addPlayer = async (name, number = "") => {
    await openPlayer();
    await page.locator("#arrival-custom-name").fill(name);
    await page.locator("#arrival-custom-number").fill(number);
    await button("Save player").click();
  };
  const record = async bunker => {
    await page.locator("#arrival-destination").selectOption(bunker);
    await page.locator("#arrival-sighting").selectOption(bunker);
    await button("Record sighting").click();
    return page.evaluate(() => arrivalSightings().at(-1));
  };

  const initialTeams = await customTeams();
  await openTeam();
  await page.locator("#arrival-custom-team").fill("   ");
  await button("Save team").click();
  assert.deepEqual(await customTeams(), initialTeams, "Blank team does not create a record");
  assert(await page.locator("#arrival-custom-team").isVisible(), "Blank team keeps an editable form");
  await button("Cancel").click();
  for (const reserved of ["__proto__", "constructor", "prototype"]) {
    await addTeam(reserved);
    assert.deepEqual(await customTeams(), initialTeams, `Reserved team key ${reserved} is refused`);
    await button("Cancel").click();
  }

  await addTeam("  existing    OPPONENT  ");
  assert.equal((await selected()).team, "Existing Opponent", "Existing team is reused under its canonical spelling");
  assert.deepEqual(await customTeams(), initialTeams, "Case and repeated whitespace do not create a duplicate team");
  await addTeam("  River   City  ");
  assert.equal((await selected()).team, "River City", "New team is selected immediately with normalized whitespace");
  assert.equal((await customTeams()).filter(name => name === "River City").length, 1, "New team joins the reusable team list once");
  await addTeam("river city");
  assert.equal((await customTeams()).filter(name => name.toLowerCase() === "river city").length, 1, "Repeated custom-team creation reuses the original");

  await openPlayer();
  await page.locator("#arrival-custom-name").fill("  ");
  await page.locator("#arrival-custom-number").fill(" ");
  await button("Save player").click();
  assert.equal((await players("River City")).length, 0, "Blank player is not saved");
  assert(await page.locator("#arrival-custom-name").isVisible(), "Blank player keeps an editable form");
  await button("Cancel").click();
  await addPlayer("  Alex   Morgan  ", " 7 ");
  assert.equal((await selected()).player, "number:7", "Name and number select the new player immediately");
  assert.deepEqual((await players("River City")).map(p => [p.name, String(p.num)]), [["Alex Morgan", "7"]], "Name and number are normalized before storage");
  await addPlayer("ALEX MORGAN", "7");
  await addPlayer("Different typed name", "7");
  assert.equal((await players("River City")).length, 1, "Same number reuses the team player");
  assert.equal((await players("River City"))[0].name, "Alex Morgan", "Duplicate number does not overwrite an existing identity");
  await addPlayer(" alex    morgan ");
  assert.equal((await selected()).player, "number:7", "Name-only lookup reuses a matching numbered player");
  assert.equal((await players("River City")).length, 1, "Name-only reuse does not duplicate the numbered player");
  const alexObservation = await record("GW#1");

  await addPlayer("", "9");
  assert.equal((await selected()).player, "number:9", "Number-only player is supported");
  assert.equal((await players("River City")).length, 2, "Number-only player is saved to this team's roster");
  await addPlayer(" Sam   Rivers ");
  const samKey = (await selected()).player;
  assert.equal(samKey, "name:sam rivers", "Name-only player has a stable normalized identity");
  await addPlayer("sam rivers");
  assert.equal((await players("River City")).length, 3, "Case variant of name-only player reuses the record");
  const samObservation = await record("C#4");
  await addPlayer("  SAM RIVERS ", "12");
  assert.equal((await players("River City")).length, 3, "Learning the number updates the existing name-only record");
  assert.equal((await selected()).player, "number:12", "Promoted name-only player selects the numbered identity");
  assert.deepEqual(await page.evaluate(() => arrivalSightings().map(o => o.id)), [samObservation.id], "Name-to-number promotion preserves the player's observation history");
  assert.equal(await page.evaluate(id => S.arrivalSightings.find(o => o.id === id).player, samObservation.id), "number:12", "Stored observations migrate to the new identity");
  assert.equal(await page.evaluate(id => S.arrivalSightings.find(o => o.id === id).player, alexObservation.id), "number:7", "Promotion leaves other players' observations untouched");

  await addTeam("Desert Team");
  await addPlayer("Alex Morgan", "7");
  assert.equal((await players("Desert Team")).length, 1, "Same player number can be used by another team");
  assert.equal((await players("River City")).length, 3, "Creating another team's player preserves the first roster");
  assert.equal(await page.evaluate(() => arrivalSightings().length), 0, "Another team's same number does not inherit observations");
  await record("MD#1");
  await page.locator("#arrival-team").selectOption("River City");
  await page.locator("#arrival-player").selectOption("number:7");
  assert.deepEqual(await page.evaluate(() => arrivalSightings().map(o => o.id)), [alexObservation.id], "Team switching restores only the selected team's history");

  const quoteTeam = `O'Brien <b data-arrival-injected>Fast</b> "Crew"`;
  const quotePlayer = `Jo <i data-arrival-injected>Wing</i> "Ace"`;
  await addTeam(quoteTeam);
  await addPlayer(quotePlayer, "23");
  assert.equal((await selected()).team, quoteTeam, "Quoted and HTML-looking team text is preserved as a name");
  assert.equal((await players(quoteTeam))[0].name, quotePlayer, "Quoted and HTML-looking player text is preserved as a name");
  assert.equal(await page.locator("[data-arrival-injected]").count(), 0, "Names cannot inject HTML elements");
  assert.equal(await page.locator("#arrival-team option:checked").textContent(), quoteTeam, "Team picker renders literal characters safely");
  assert((await page.locator("#arrival-player option:checked").textContent()).includes(quotePlayer), "Player picker renders literal characters safely");

  for (const width of [320, 390]) {
    await page.setViewportSize({width, height: 844});
    for (const kind of ["team", "player"]) {
      await (kind === "team" ? openTeam() : openPlayer());
      const fit = await page.evaluate(() => {
        const main = document.querySelector("main");
        const inputs = [...document.querySelectorAll('[id^="arrival-custom-"]')].filter(el => el.getBoundingClientRect().height);
        return {
          page: document.documentElement.scrollWidth <= innerWidth + 1,
          main: main.scrollWidth <= main.clientWidth + 1,
          inputs: inputs.every(el => { const r = el.getBoundingClientRect(); return r.width > 44 && r.left >= 0 && r.right <= innerWidth + 1; }),
        };
      });
      assert(fit.page && fit.main && fit.inputs, `${kind} form fits ${width}px viewport: ${JSON.stringify(fit)}`);
      await button("Cancel").click();
    }
  }

  const rosterBeforeStale = await page.evaluate(() => JSON.stringify(S.scout));
  await openPlayer();
  await page.locator("#arrival-custom-name").fill("Stale old team draft");
  await page.locator("#arrival-custom-number").fill("55");
  await page.locator("#arrival-team").selectOption("River City");
  await page.evaluate(() => saveArrivalPlayer());
  assert.equal(await page.evaluate(() => JSON.stringify(S.scout)), rosterBeforeStale, "Changing team cannot save an old draft under the newly selected team");
  for (const change of [{layoutKey: "tby"}, {point: 4}]) {
    await page.evaluate(() => { set({layoutKey: "mwo", point: 3}); setArrival({matchId: "", point: null}); });
    await openPlayer();
    await page.locator("#arrival-custom-name").fill("Stale context draft");
    await page.evaluate(change => set(change), change);
    await page.evaluate(() => saveArrivalPlayer());
    assert.equal(await page.evaluate(() => JSON.stringify(S.scout)), rosterBeforeStale, "Changed field/point context cannot silently submit an earlier player form");
  }
  await page.evaluate(() => set({layoutKey: "mwo", point: 3}));
  await page.locator("#arrival-team").selectOption(quoteTeam);
  await page.locator("#arrival-player").selectOption("number:23");
  const beforeReload = await page.evaluate(() => ({teams: S.teams, scout: S.scout, sightings: S.arrivalSightings, context: arrivalContext()}));
  assert.equal(await page.evaluate(() => copyDataError(JSON.parse(localStorage.getItem("gridlock.coach.v2")))), "", "Custom records satisfy saved-state validation");
  await page.reload({waitUntil: "networkidle"});
  assert.equal(await page.evaluate(() => _recoveryText), "", "Reload does not mistake custom data for a damaged save");
  const afterReload = await page.evaluate(() => ({teams: S.teams, scout: S.scout, sightings: S.arrivalSightings, context: arrivalContext()}));
  assert.deepEqual(afterReload, beforeReload, "Custom teams, player identities, sightings and selected context survive reload");
  assert.equal(await page.locator("[data-arrival-injected]").count(), 0, "Reloaded names remain safely escaped");

  for (const scope of ["all", "squad"]) {
    const exported = await page.evaluate(scope => JSON.parse(copyPayload(scope)), scope);
    assert.deepEqual(exported.data.teams, beforeReload.teams, `${scope} backup includes custom teams`);
    assert.deepEqual(exported.data.scout, beforeReload.scout, `${scope} backup includes custom rosters`);
  }
  const backup = await page.evaluate(() => copyPayload("all"));
  await page.evaluate(() => { S.teams = {}; S.scout = {}; S.arrivalSightings = []; set({tab: "more", more: "nexus"}); });
  await page.locator("#copyIn").fill(backup);
  await button("Merge it in").click();
  const merged = await page.evaluate(() => ({teams: S.teams, scout: S.scout, sightings: S.arrivalSightings}));
  assert.deepEqual(merged, {teams: beforeReload.teams, scout: beforeReload.scout, sightings: beforeReload.sightings}, "Backup import restores custom identities and their sightings");
  await page.locator("#copyIn").fill(backup);
  await button("Merge it in").click();
  assert.deepEqual(await page.evaluate(() => ({teams: S.teams, scout: S.scout, sightings: S.arrivalSightings})), merged, "Repeated merge does not duplicate custom teams, players or observations");
  assert.equal((await players("Existing Opponent"))[0].note, "Known runner", "Existing scouting metadata survives all custom-entry and backup flows");
  console.log("PASS custom opponents: add/reuse, whitespace/case normalization, optional identity fields, number promotion with history, team isolation, literal HTML/quotes, blank validation, stale forms, 320/390px forms, reload/export/repeated merge.");
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
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", dialog => dialog.accept());
    await page.goto(url, {waitUntil: "networkidle"});
    assert(await page.evaluate(() => typeof saveArrivalTeam === "function" && typeof saveArrivalPlayer === "function"), "Custom-opponent handlers must be loaded");
    await run(page);
    assert.deepEqual(errors, [], "No uncaught browser errors");
    await context.close();
  } finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

#!/usr/bin/env node
"use strict";
/* Integration checks for Scout's arrival reconstruction. Geometry is checked
 * against the separately maintained measured event files, not the router's
 * own collision predicate. Run directly or through scripts/run-checks.js. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");

const EVENTS = {
  lso: "nxl_2026_lone_star.json",
  tby: "nxl_2026_tampa_bay_open.json",
  mwo: "nxl_2026_midwest_open.json",
};
const measured = Object.fromEntries(Object.entries(EVENTS).map(([key, name]) => {
  const seq = {};
  const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "../layouts/events", name), "utf8")).bunkers;
  return [key, rows.map(b => ({...b, id: `${b.name}#${seq[b.name] = (seq[b.name] || 0) + 1}`}))];
}));
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Rotated beam rectangles and the two arms of a rotated plus use the event
// dimensions directly. Other routing footprints are conservative rectangles.
// Tiny tolerance only allows rounding in the application's digitized values.
function insideMeasured(point, b) {
  let x = point[0] - b.x_ft, y = point[1] - b.y_ft;
  const angle = (b.type === "snake_beam" && Math.abs(b.angle_deg || 0) > 12 ? b.angle_deg : b.type === "giant_plus" ? b.cross_deg : 0) || 0;
  if (angle) {
    const r = angle * Math.PI / 180;
    [x, y] = [x * Math.cos(r) + y * Math.sin(r), -x * Math.sin(r) + y * Math.cos(r)];
  }
  const w = b.w_ft / 2 - 0.025, h = b.h_ft / 2 - 0.025;
  if (b.type === "giant_plus") {
    const arm = (b.arm_ft || 4) / 2 - 0.025;
    return Math.abs(x) < w && Math.abs(y) < arm || Math.abs(x) < arm && Math.abs(y) < h;
  }
  return Math.abs(x) < w && Math.abs(y) < h;
}

let routeCount = 0, sampleCount = 0, scenarioCount = 0;
function verifyRoute(route, layout, description) {
  assert(Array.isArray(route.points) && route.points.length >= 1, `${description}: route has points`);
  assert(Number.isFinite(route.length) && route.length >= 0, `${description}: finite route length`);
  let length = 0;
  for (let i = 0; i < route.points.length; i++) {
    const point = route.points[i];
    assert(point.length === 2 && point.every(Number.isFinite), `${description}: finite 2D coordinates`);
    assert(point[0] >= 0 && point[0] <= 150 && point[1] >= 0 && point[1] <= 120, `${description}: point remains on field`);
    const previous = i ? route.points[i - 1] : point;
    const len = distance(previous, point);
    length += len;
    const count = Math.max(1, Math.ceil(len / 0.25));
    for (let step = 0; step <= count; step++) {
      const t = step / count;
      const sample = [previous[0] + (point[0] - previous[0]) * t, previous[1] + (point[1] - previous[1]) * t];
      sampleCount++;
      const hit = measured[layout].find(b => insideMeasured(sample, b));
      assert(!hit, `${description}: path crosses measured ${hit && hit.id} at ${sample.map(n => n.toFixed(2))}`);
    }
  }
  assert(Math.abs(length - route.length) < 0.1, `${description}: displayed length matches complete path`);
  routeCount++;
}

async function geometryChecks(page) {
  let detours = 0;
  for (const [layout, bunkers] of Object.entries(measured)) {
    const targets = [...new Set([
      ...[0, 0.2, 0.4, 0.6, 0.8, 1].map(f => bunkers[Math.round((bunkers.length - 1) * f)].id),
      ...bunkers.filter(b => b.type === "snake_beam" && Math.abs(b.angle_deg || 0) > 12 || b.type === "giant_plus" && b.cross_deg).slice(0, 3).map(b => b.id),
    ])];
    for (const startEnd of ["left", "right"]) {
      for (const destination of targets) {
        const result = await page.evaluate(({layout, startEnd, destination}) =>
          arrivalRoutes(layout, {side: "right", startEnd, startBunker: "", destination, sightings: []}),
        {layout, startEnd, destination});
        const description = `${layout}/${startEnd}/${destination}`;
        assert(result.routes.length > 0, `${description}: reachable bunker has a route (${result.warning || ""})`);
        const start = result.routes[0].points[0];
        assert(startEnd === "left" ? start[0] < 10 : start[0] > 140, `${description}: start follows selected end`);
        for (const route of result.routes) verifyRoute(route, layout, `${description}/${route.id}`);
        const shortest = result.routes[0];
        assert(result.routes.every(route => route.length >= shortest.length - 0.1), `${description}: shortest option is shortest among alternatives`);
        if (shortest.length > distance(shortest.points[0], shortest.points.at(-1)) + 0.5) detours++;
        scenarioCount++;
      }
    }
    const destination = bunkers[Math.floor(bunkers.length / 2)].id;
    const observations = [bunkers[0].id, bunkers[Math.floor(bunkers.length / 3)].id];
    const seen = await page.evaluate(({layout, destination, observations}) =>
      arrivalRoutes(layout, {side: "right", startEnd: "right", destination, sightings: observations.map(bunker => ({bunker}))}),
    {layout, destination, observations});
    assert(seen.routes.length > 0, `${layout}: ordered observations can be connected`);
    assert.deepEqual(seen.anchors.filter(a => a.kind === "observed").map(a => a.bunker), observations,
      `${layout}: every observation remains in input order`);
    for (const route of seen.routes) {
      verifyRoute(route, layout, `${layout}/observed/${route.id}`);
      let prior = -1;
      for (const anchor of seen.anchors) {
        const index = route.points.findIndex((p, i) => i >= prior && distance(p, anchor.point) < 0.1);
        assert(index >= prior && index >= 0, `${layout}: route visits every anchor in order`);
        prior = index;
      }
    }
    const same = await page.evaluate(({layout, destination}) =>
      arrivalRoutes(layout, {side: "right", startEnd: "right", startBunker: destination, destination, sightings: []}),
    {layout, destination});
    assert(same.routes.length || same.warning, `${layout}: already at destination yields a usable result or explanation`);
    for (const route of same.routes) verifyRoute(route, layout, `${layout}/same-start-and-destination`);
    const repeated = await page.evaluate(({layout, destination}) =>
      arrivalRoutes(layout, {side: "right", startEnd: "right", destination,
        sightings: [{bunker: destination}, {bunker: destination}]}), {layout, destination});
    assert(repeated.routes.length || repeated.warning, `${layout}: repeated observation yields a usable result or explanation`);
    for (const route of repeated.routes) verifyRoute(route, layout, `${layout}/repeated-observation`);
    const bad = await page.evaluate(layout =>
      arrivalRoutes(layout, {startEnd: "right", destination: "MISSING#999", sightings: []}), layout);
    assert.equal(bad.routes.length, 0, `${layout}: nonexistent destination does not invent a path`);
    assert(bad.warning, `${layout}: invalid destination explains why no path is shown`);
  }
  assert(detours >= 6, "The fixtures exercise multiple real bunker detours rather than only straight runs");
  console.log(`PASS arrival geometry: ${scenarioCount} destination/end scenarios, ${routeCount} paths, ${sampleCount} independently checked samples, ${detours} detours.`);
}

async function integrationChecks(page) {
  await page.evaluate(() => localStorage.setItem("gridlock.coach.v2", JSON.stringify({
    entered: true, role: "staff", tab: "scout", scoutTab: "matchup", layoutKey: "mwo", point: 3, script: "blitz",
    matchId: "arrival-match-one", matches: [
      {id: "arrival-match-one", at: 100000, vs: "Test Opponent", layout: "mwo"},
      {id: "arrival-match-two", at: 200000, vs: "Other Opponent", layout: "mwo"},
    ],
    left: {name: "Other Opponent"}, right: {name: "Test Opponent"},
    scout: {
      "Test Opponent": {players: [
        {num: "7", name: "Known Player", plant: {mwo: "GW#1"}},
        {num: "9", name: "Second Player", plant: {mwo: "MD#1"}},
      ]},
      "Other Opponent": {players: [{num: "7", name: "Different Player", plant: {mwo: "C#1"}}]},
    },
  })));
  await page.reload({waitUntil: "networkidle"});
  await page.locator('button[onclick="openArrival(\'right\',0)"]').click();
  assert.equal(await page.locator("#arrival-player").inputValue(), "number:7", "Pit row opens its own player");
  assert.equal(await page.locator("#arrival-destination").inputValue(), "GW#1", "Existing plant is selected as destination");
  assert.equal(await page.evaluate(() => S.arrivalSightings.length), 0, "A roster plant never becomes an invented observation");
  assert((await page.locator("main").innerText()).includes("Inferred route, not confirmed movement"), "Inferred route is labeled");
  const original = await page.evaluate(() => arrivalContext());
  assert.deepEqual(original, {side: "right", team: "Test Opponent", player: "number:7", layout: "mwo", m: "arrival-match-one", pt: 3},
    "Observation context identifies team/player/layout/match/point");

  await page.locator("details.arrival-context summary").click();
  await page.locator("#arrival-end").selectOption("left");
  assert(await page.evaluate(() => arrivalModel().route.points[0][0] < 10), "Switching ends moves the start to the left station");
  await page.locator("#arrival-end").selectOption("right");
  assert(await page.evaluate(() => arrivalModel().route.points[0][0] > 140), "Switching back restores the right station");
  const clickPoint = await page.evaluate(() => {
    const b = LAYOUTS.mwo.bunkers.find(b => b.id === "C#4");
    const svg = document.querySelector("#arrival-map svg");
    const p = new DOMPoint(b.x * 2, b.y * 2).matrixTransform(svg.getScreenCTM());
    return {x: p.x, y: p.y};
  });
  await page.locator("#arrival-map").scrollIntoViewIfNeeded();
  // Recompute after scrolling, since field coordinates map into the viewport.
  const visiblePoint = await page.evaluate(() => {
    const b = LAYOUTS.mwo.bunkers.find(b => b.id === "C#4");
    const p = new DOMPoint(b.x * 2, b.y * 2).matrixTransform(document.querySelector("#arrival-map svg").getScreenCTM());
    return {x: p.x, y: p.y};
  });
  assert(Number.isFinite(clickPoint.x), "Field exposes a finite touch coordinate transform");
  await page.mouse.click(visiblePoint.x, visiblePoint.y);
  assert.equal(await page.locator("#arrival-destination").inputValue(), "C#4", "Tapping the measured field selects its bunker");
  assert.equal(await page.evaluate(() => S.arrivalSightings.length), 0, "Field selection alone is not evidence");
  await page.locator("#arrival-destination").selectOption("GW#1");
  for (const bunker of ["MD#1", "C#4"]) {
    await page.locator("#arrival-sighting").selectOption(bunker);
    await page.getByRole("button", {name: "Record sighting", exact: true}).click();
    const count = await page.evaluate(() => arrivalSightings().length);
    await page.getByRole("button", {name: "Record sighting", exact: true}).click();
    assert.equal(await page.evaluate(() => arrivalSightings().length), count,
      "Immediate second Record tap neither duplicates the sighting nor invents an observation at the destination");
  }
  const observations = await page.evaluate(() => arrivalSightings());
  assert.deepEqual(observations.map(o => o.bunker), ["MD#1", "C#4"], "Record button preserves observed order");
  assert.deepEqual(observations.map(o => o.seq), [1, 2], "Sightings have persistent sequence numbers");
  assert(observations.every(o => o.team === original.team && o.player === original.player && o.layout === original.layout && o.m === original.m && o.pt === original.pt),
    "Recorded sightings carry the exact selected context");
  assert(/observed sightings\s*·\s*2/i.test(await page.locator("main").innerText()), "Observed count is separate from inferred legs");
  assert.equal(await page.evaluate(() => copyDataError(JSON.parse(localStorage.getItem("gridlock.coach.v2")))), "", "Saved arrival state satisfies the import/reload schema");
  await page.reload({waitUntil: "networkidle"});
  assert.equal(await page.evaluate(() => _recoveryText), "", "Reload does not mistake valid arrival state for a damaged save");
  assert.equal(await page.locator("#arrival-destination").inputValue(), "GW#1", "Chosen destination persists on reload");
  assert.equal(await page.evaluate(() => S.script), "blitz", "Adding arrival data preserves unrelated saved playbook state");
  assert.deepEqual(await page.evaluate(() => arrivalSightings().map(o => o.id)), observations.map(o => o.id), "Sightings persist with selected destination on reload");
  await page.locator("#arrival-sighting").selectOption("C#4");
  await page.getByRole("button", {name: "Record sighting", exact: true}).click();
  assert.equal(await page.evaluate(() => arrivalSightings().length), 2, "Repeated tap does not duplicate the latest observation");

  await page.getByRole("button", {name: "Next stop", exact: true}).click();
  assert(await page.evaluate(() => _arrivalPlayback.t > 0), "Next stop advances the route marker");
  await page.getByRole("button", {name: "Previous stop", exact: true}).click();
  assert.equal(await page.evaluate(() => _arrivalPlayback.t), 0, "Previous stop returns to the start");
  const markerBefore = await page.locator("#arrival-runner").getAttribute("transform");
  await page.getByRole("button", {name: "Play route", exact: true}).click();
  await page.waitForFunction(() => _arrivalPlayback.t > 0.04);
  assert.notEqual(await page.locator("#arrival-runner").getAttribute("transform"), markerBefore, "Play animates the actual marker");
  await page.getByRole("button", {name: "Pause route", exact: true}).click();
  assert.equal(await page.evaluate(() => _arrivalPlayback.running), false, "Pause stops playback");

  await page.locator("#arrival-point").selectOption("2");
  assert.equal(await page.evaluate(() => arrivalSightings().length), 0, "Other point has no observations from point 3");
  await page.locator("#arrival-point").selectOption("3");
  assert.equal(await page.evaluate(() => arrivalSightings().length), 2, "Returning to point 3 restores its observations");
  await page.locator("#arrival-match").selectOption("arrival-match-two");
  assert.equal(await page.evaluate(() => arrivalSightings().length), 0, "Different match is isolated");
  await page.locator("#arrival-match").selectOption("arrival-match-one");
  await page.locator("#arrival-point").selectOption("3");
  await page.locator("#arrival-player").selectOption("number:9");
  assert.equal(await page.evaluate(() => arrivalSightings().length), 0, "Different player is isolated");
  await page.locator("#arrival-player").selectOption("number:7");
  await page.locator("#arrival-team").selectOption("Other Opponent");
  await page.locator("#arrival-player").selectOption("number:7");
  assert.equal(await page.evaluate(() => arrivalSightings().length), 0, "Same number on a different team is isolated");
  await page.locator("#arrival-team").selectOption("Test Opponent");
  await page.locator("#arrival-player").selectOption("number:7");
  assert.equal(await page.evaluate(() => arrivalSightings().length), 2, "Context switches retain the original history");

  await page.locator("#arrival-sighting").selectOption("MD#1");
  await page.evaluate(() => set({layoutKey: "tby"}));
  assert.equal(await page.evaluate(() => arrivalSightings().length), 0, "Another field has a separate history");
  assert.equal(await page.locator("#arrival-sighting").inputValue(), "", "Unrecorded sighting selection does not leak into another field");
  assert(await page.getByRole("button", {name: "Record sighting", exact: true}).isDisabled(), "Changing field requires a new bunker selection before recording");
  const countBefore = await page.evaluate(() => S.arrivalSightings.length);
  await page.evaluate(() => logArrivalSighting());
  assert.equal(await page.evaluate(() => S.arrivalSightings.length), countBefore, "Direct record handler also refuses the stale layout selection");
  await page.evaluate(() => set({layoutKey: "mwo"}));
  assert.equal(await page.evaluate(() => arrivalSightings().length), 2, "Original field history remains intact");
  const staleContexts = await page.evaluate(() => {
    const controls = {...S.arrival}, currentPoint = S.point, currentMatch = S.matchId;
    const count = S.arrivalSightings.length, results = [];
    for (const change of [{point: currentPoint + 1}, {matchId: "arrival-match-two"}]) {
      set({point: currentPoint, matchId: currentMatch});
      setArrival({matchId: "", point: null, destination: "GW#1", sightingBunker: "MD#1"});
      set(change);
      const model = arrivalModel();
      logArrivalSighting();
      results.push(!model.options.destination && !model.options.sightingBunker && S.arrivalSightings.length === count);
    }
    set({point: currentPoint, matchId: currentMatch, arrival: controls});
    return results;
  });
  assert(staleContexts.every(Boolean), "Global point/match switches cannot log stale pending sightings into the new context");
  await page.reload({waitUntil: "networkidle"});
  assert.deepEqual(await page.evaluate(() => arrivalSightings().map(o => o.id)), observations.map(o => o.id), "Reload restores selected context and observations");
  assert.equal(await page.evaluate(() => _arrivalPlayback.running), false, "Reload never resumes a stale animation");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Arrival controls fit a phone viewport");

  const backup = await page.evaluate(() => copyPayload("all"));
  assert.deepEqual(JSON.parse(backup).data.arrivalSightings.map(o => o.id), observations.map(o => o.id), "Full backup includes observations");
  await page.evaluate(() => set({tab: "more", more: "nexus"}));
  await page.locator("#copyIn").fill(backup);
  await page.getByRole("button", {name: "Merge it in", exact: true}).click();
  assert.equal(await page.evaluate(() => S.arrivalSightings.length), 2, "Merging the same backup does not duplicate observations");
  const otherCopy = JSON.parse(backup);
  otherCopy.data.arrivalSightings = [{...observations[0], id: "other-device-observation", seq: 3, bunker: "T#1", at: observations[1].at + 1}];
  await page.locator("#copyIn").fill(JSON.stringify(otherCopy));
  await page.getByRole("button", {name: "Merge it in", exact: true}).click();
  assert.equal(await page.evaluate(() => S.arrivalSightings.length), 3, "Independent observation from another device merges into history");
  await page.locator("#copyIn").fill(backup);
  await page.getByRole("button", {name: "Replace everything", exact: true}).click();
  assert.deepEqual(await page.evaluate(() => S.arrivalSightings.map(o => o.id)), observations.map(o => o.id), "Replace restores exactly the exported observations");
  await page.evaluate(() => openArrival("right", 0));
  const otherPointId = await page.evaluate(() => {
    setArrival({point: 2, destination: "MD#1"});
    logArrivalSighting();
    const id = arrivalSightings()[0].id;
    setArrival({point: 3});
    return id;
  });
  await page.getByRole("button", {name: "Undo last sighting", exact: true}).click();
  assert.deepEqual(await page.evaluate(() => arrivalSightings().map(o => o.id)), [observations[0].id], "Undo removes only the latest sighting");
  await page.getByRole("button", {name: "Clear this point", exact: true}).click();
  assert.equal(await page.evaluate(() => arrivalSightings().length), 0, "Clear removes this context's observations");
  assert.deepEqual(await page.evaluate(() => S.arrivalSightings.map(o => o.id)), [otherPointId], "Undo and clear preserve sightings from other points");
  console.log("PASS arrival integration: pit entry, field selection, observed vs inferred labels, ordered logging, playback, context isolation, reload, backup merge/replace, undo/clear, phone layout.");
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
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", dialog => dialog.accept());
    await page.goto(url, {waitUntil: "networkidle"});
    assert(await page.evaluate(() => typeof arrivalRoutes === "function"), "Arrival feature must be loaded");
    await geometryChecks(page);
    await integrationChecks(page);
    assert.deepEqual(errors, [], "No uncaught browser errors");
    await context.close();
  } finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

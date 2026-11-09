"use strict";
/* Event data loaded from a file: the NXL World Cup package's rosters, people
   and published history, packed by tools/worldcup_pack.py and kept on the
   phone apart from the season. Every record here is made up: no real person
   from the package is in the repo. */
const assert = require("node:assert/strict"), path = require("node:path"), fs = require("node:fs"), os = require("node:os");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");

// A tiny package in the shape the data package ships, made up from scratch.
function writePackage(dir, {enriched = false} = {}) {
  const at = "2026-11-08T17:00:00-05:00", src = n => ({source_id: n, source_url: "https://example.test/src/" + n, retrieved_at: at, source_file: "local/" + n + ".html"});
  const divisions = [
    {division_id: "9001", name: "Test X-Ball", event_id: "9322", signed_up: 2},
    {division_id: "9002", name: "Test 3v3", event_id: "9322", signed_up: enriched ? 2 : 1},
    {division_id: "9003", name: "Test College", event_id: "9508", signed_up: 0},
  ];
  const loc = (e, t, status) => ({entry_id: e, team_id: t, hometown_raw: status === "published" ? "Testville" : null, hometown_city: null,
    hometown_region: null, hometown_country: null, home_field_name: status === "published" ? "Test Park" : null, home_field_location_raw: null,
    location_status: status, source_url: "https://example.test/roster/" + e, retrieved_at: at});
  const team = (e, t, div, name, reg, status) => ({event_id: "9322", division_id: div, division: "", team_name: name, team_id: t, entry_id: e,
    roster_url: "https://example.test/roster/" + e, registration_status: reg, source_url: "https://example.test/teams", retrieved_at: at, team_location: loc(e, t, status)});
  const teams = [
    team("100", "TEAMA", "9001", "Alpha Test", "Payment Accepted", "published"),
    team("101", "TEAMB", "9001", "Bravo Test", "Pay Entry Fee", "not_published"),
    team("102", "TEAMA", "9002", "Alpha Test", "Pending - Pay", "published"),
  ];
  if (enriched) teams.push(team("103", "TEAMC", "9002", "Charlie Test", "Payment Accepted", "not_published"));
  const mem = (pid, name, role) => ({person_id: pid, name, role, classification: "D4", checked_in: "No", jersey_number: null,
    age_as_published: "15", person_event_link: "https://example.test/private/" + pid, event_person_token: "TOK" + pid, registration_fee_paid: "Yes", source_id: 1});
  const rosters = [
    {entry_id: "100", status: "authenticated_event_roster", source_url: "https://example.test/roster/100", retrieved_at: at,
     members: [mem("1", "Test Person One", "Player"), mem("2", "Test Person Two", "Player"), mem("3", "Test Coach", "Coach"), mem("4", "Test Staffer", "Staff")]},
    {entry_id: "101", status: enriched ? "authenticated_event_roster" : "login_required", source_url: "https://example.test/roster/101", retrieved_at: at,
     members: enriched ? [mem("5", "Test Person Five", "Player")] : null},
    {entry_id: "102", status: "authenticated_empty_roster", source_url: "https://example.test/roster/102", retrieved_at: at, members: []},
  ];
  if (enriched) rosters.push({entry_id: "103", status: "authenticated_event_roster", source_url: "https://example.test/roster/103", retrieved_at: at, members: [mem("1", "Test Person One", "Player")]});
  const person = (pid, name, player, hist, home) => ({person_id: pid, name, source_id: 1, is_current_event_player: player, current_roles: [], current_entry_ids: [],
    name_variants: [{person_id: pid, name, variant_kind: "display", source_id: 1, source: src(1)}],
    hometown: {raw: null, city: null, region: null, country: null, status: home, source: null},
    history: {status: hist, scope: "x", source: hist === "not_retrieved" ? null : src(2), observations: []}});
  const people = [
    person("1", "Test Person One", true, "scored_event_history_imported", "not_published_in_retrieved_classification_page"),
    // The newer file has not read person two again: what the first file read stands.
    person("2", "Test Person Two", true, enriched ? "not_retrieved" : "scored_event_history_imported", enriched ? "not_retrieved" : "not_published_in_retrieved_classification_page"),
    person("3", "Test Coach", false, "not_retrieved", "not_retrieved"),
    person("4", "Test Staffer", false, "not_retrieved", "not_retrieved"),
  ];
  if (enriched) people.push(person("5", "Test Person Five", true, "not_retrieved", "not_retrieved"));
  const ob = (id, pid, date) => ({observation_id: id, person_id: pid, event_date_iso: date, event_name: "Test Open", event_id: "1", event_url: "https://example.test/event/1",
    team_name: "Alpha Test", team_roster_url: null, division_as_published: "Test X-Ball", place_as_published: "2nd of 8", classification_score_as_published: "1234*",
    classification_context: "test context", role_at_historical_event: null, participation_basis: "classification_scored_event_history", source_id: 2});
  const history = [ob("obs-a", "1", "2026-01-01"), ...(enriched ? [ob("obs-b", "1", "2026-03-01")] : [ob("obs-c", "2", "2025-06-01")])];
  const players = people.filter(p => p.is_current_event_player).length;
  const files = {
    "teams.json": {event: {event_id: "9322", name: "NXL World Cup", year: 2026, start_date: "2026-11-11", end_date: "2026-11-15"}, retrieved_at: at, divisions, teams},
    "rosters.json": {rosters},
    "people.json": {people},
    "person_event_history.json": {observations: history},
    "sources.json": [{source_id: 1, url: "https://example.test/src/1", retrieved_at: at, local_file: "x", sha256: "y"}, {source_id: 2, url: "https://example.test/src/2", retrieved_at: at}],
    "coverage-audit.json": {generated_at: at, overall: "test", event_entries: teams.length, advertised_signed_up: teams.length, distinct_team_ids: new Set(teams.map(t => t.team_id)).size,
      distinct_people: people.length, distinct_current_players: players, player_history_statuses: {}, player_hometown_statuses: {}},
  };
  fs.mkdirSync(dir, {recursive: true});
  for (const [n, v] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), JSON.stringify(v));
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gridlock-evd-"));
  const pack = (name, opts) => {
    writePackage(path.join(tmp, name), opts);
    execFileSync("python3", ["-I", path.resolve(__dirname, "../tools/worldcup_pack.py"), path.join(tmp, name), path.join(tmp, name + ".json")], {stdio: "pipe"});
    return path.join(tmp, name + ".json");
  };
  const first = pack("first"), later = pack("later", {enriched: true});
  const packed = fs.readFileSync(first, "utf8");
  let failed = 0, passed = 0;
  const note = (ok, name, e) => { if (ok) { passed++; console.log("PASS " + name); } else { failed++; console.error("FAIL " + name + ": " + e.message); } };
  try {
    assert.doesNotMatch(packed, /private|TOK1|"15"|local\//, "no age, personal link, token or local path in the file");
    assert.match(packed, /https:\/\/example\.test\/src\/1/);
    note(true, "the packer keeps IDs and sources and leaves out ages, personal links and local paths");
  } catch (e) { note(false, "the packer keeps IDs and sources and leaves out ages, personal links and local paths", e); }

  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
  const p = await c.newPage(), errors = [];
  p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
  async function check(name, fn) { try { await fn(); note(true, name); } catch (e) { note(false, name, e); } }
  const load = async file => {
    await p.evaluate(() => set({ tab: "more", more: "nexus", evdSaid: "" }));
    await p.setInputFiles("#evd-file", file);
    await p.waitForFunction(() => /^Loaded|^Could|^That/.test(S.evdSaid));
    return p.evaluate(() => S.evdSaid);
  };
  try {
    await p.goto(url);
    await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, SEED);
    await p.goto(url); await p.waitForFunction(() => typeof S === "object");

    await check("loading the file keeps every entry, person and history row, and loading it again doubles nothing", async () => {
      assert.match(await load(first), /3 entries \(3 new, 0 updated\), 4 people \(4 new, 0 updated\), 2 new history rows/);
      assert.match(await load(first), /3 entries \(0 new, 3 updated\), 4 people \(0 new, 4 updated\), 0 new history rows/);
      const n = await p.evaluate(() => [Object.keys(EVD.entries).length, Object.keys(EVD.people).length, EVD.people["1"].obs.length]);
      assert.deepEqual(n, [3, 4, 1]);
    });
    await check("a team in two divisions is two entries, each with its own roster state said plainly", async () => {
      await p.evaluate(() => { boardTeam("Alpha Test"); boardTeam("Bravo Test"); loadPit("Alpha Test", "right"); set({ tab: "scout", scoutTab: "matchup" }); });
      const t = await p.evaluate(() => [...document.querySelectorAll(".pit--r .evd-entry")].map(e => e.innerText));
      assert.equal(t.length, 2);
      assert.match(t.join("\n"), /2 players, 1 coach, 1 staff/);
      assert.match(t.join("\n"), /listed nobody — that is not proof they have no players/);
      assert.match(t.join("\n"), /Entry 100 · team ID TEAMA/);
      await p.evaluate(() => { loadPit("Bravo Test", "right"); });
      assert.match(await p.evaluate(() => document.querySelector(".pit--r .evd-entry").innerText), /not read \(login required\) — unknown, not empty/);
    });
    await check("a person shows published history with its source, and never a jersey, a guessed hometown or a match score", async () => {
      await p.evaluate(() => { loadPit("Alpha Test", "right"); set({ evdOpen: "100", evdPerson: "1" }); });
      const t = await p.evaluate(() => document.querySelector(".evd-person").innerText);
      assert.match(t, /person ID 1/); assert.match(t, /Jersey: not published/);
      assert.match(t, /Hometown not published on the page that was read/);
      assert.doesNotMatch(t, /Testville/, "the team's hometown is never a player's");
      assert.match(t, /not a complete career/); assert.match(t, /not a match score/);
      assert.match(t, /Source: https:\/\/example\.test\/src\/2/);
      await p.evaluate(() => set({ evdPerson: "3" }));
      assert.match(await p.evaluate(() => document.querySelector(".evd-person").innerText), /History not retrieved yet — that does not mean there is none/);
    });
    await check("players go on the card by person ID only; a same-name man without one is not merged", async () => {
      const r = await p.evaluate(() => {
        editProfile("right", { players: [{ num: "7", name: "Test Person Two", wire: "Flex", note: "", threat: 0 }] });
        addEventPlayers("right", "100"); const once = pitOf("right").players.map(m => [m.name, m.pid || ""]);
        addEventPlayers("right", "100"); return { once, twice: pitOf("right").players.length, said: S.flash };
      });
      assert.deepEqual(r.once, [["Test Person Two", ""], ["Test Person One", "1"]]);
      assert.equal(r.twice, 2);
      assert.match(r.said, /already on the card/);
    });
    await check("a newer file updates the same records: new entries and rows come in, what it did not read stays", async () => {
      const said = await load(later);
      assert.match(said, /4 entries \(1 new, 3 updated\), 5 people \(1 new, 4 updated\), 1 new history rows/);
      const r = await p.evaluate(() => ({
        entries: Object.keys(EVD.entries).length, people: Object.keys(EVD.people).length,
        one: EVD.people["1"].obs.map(o => o.id), two: [EVD.people["2"].hist, EVD.people["2"].home, EVD.people["2"].obs.length],
        bravo: EVD.entries["101"].members.length, onTwo: EVD.byPerson["1"].map(x => x.entry).sort(),
      }));
      assert.equal(r.entries, 4); assert.equal(r.people, 5);
      assert.deepEqual(r.one, ["obs-b", "obs-a"], "history merged by observation ID, newest first");
      assert.deepEqual(r.two, ["scored_event_history_imported", "not_published_in_retrieved_classification_page", 1]);
      assert.equal(r.bravo, 1); assert.deepEqual(r.onTwo, ["100", "103"]);
    });
    await check("event data is not in the season or a copy, and survives a relaunch", async () => {
      const inSeason = await p.evaluate(() => /Test Person One|Test Coach/.test(seasonText(S).replace(/"name":"Test Person (One|Two)"/g, "")));
      assert.equal(inSeason, false);
      await p.reload(); await p.waitForFunction(() => typeof S === "object");
      await p.evaluate(() => set({ tab: "more", more: "nexus" }));
      await p.waitForFunction(() => EVD_STATE === "ready");
      assert.match(await p.evaluate(() => document.getElementById("root").innerText), /NXL World Cup 2026[\s\S]*4 entries/);
    });
    await check("the wrong file is refused and says why", async () => {
      fs.writeFileSync(path.join(tmp, "bad.json"), JSON.stringify({ kind: "something else" }));
      assert.match(await load(path.join(tmp, "bad.json")), /not a Gridlock event-data file/);
    });
    await check("a crafted file cannot add markup or change every object in the app", async () => {
      const d = JSON.parse(packed);
      d.str.push("Hostile Person");
      d.members.push(["__proto__", "666", d.str.length - 1]);
      d.entries["constructor"] = { team: "constructor", name: "constructor", div: "constructor" };
      d.people["__proto__"] = [d.str.length - 1, 1];
      d.obs["x1"] = ["__proto__", null];
      d.coverage = { ...(d.coverage || {}), player_history_statuses: { scored_event_history_imported: "<img id=pwn2 src=x>" } };
      fs.writeFileSync(path.join(tmp, "hostile.json"), JSON.stringify(d));
      assert.match(await load(path.join(tmp, "hostile.json")), /^Loaded/);
      const r = await p.evaluate(() => ({ members: ({}).members, obs: ({}).obs, pwn: !!document.getElementById("pwn2"),
        ctor: evdEntriesFor("constructor").map(e => e.name) }));
      assert.equal(r.members, undefined, "Object.prototype untouched");
      assert.equal(r.obs, undefined);
      assert.equal(r.pwn, false, "a coverage count is printed as text");
      assert.deepEqual(r.ctor, ["constructor"], "a team called constructor is an ordinary team");
    });
    await check("taking the data off while a file is still loading leaves it off, on screen and in the store", async () => {
      await p.evaluate(() => set({ tab: "more", more: "nexus", evdSaid: "" }));
      await p.setInputFiles("#evd-file", first);
      await p.waitForFunction(() => /^Reading|^Loaded/.test(S.evdSaid));
      await p.evaluate(() => dropEventData());
      await p.waitForFunction(() => /taken off/.test(S.evdSaid));
      await p.evaluate(() => EVD_Q);
      assert.deepEqual(await p.evaluate(() => [EVD, EVD_STATE]), [null, "none"]);
      assert.equal(await p.evaluate(() => new Promise(ok => { const rq = indexedDB.open(EVD_DB); rq.onsuccess = () => { const db = rq.result;
        const n = db.objectStoreNames.length ? null : 0; if (n === 0) { db.close(); return ok(0); }
        const tx = db.transaction("entries", "readonly"), c = tx.objectStore("entries").count(); c.onsuccess = () => { db.close(); ok(c.result); }; }; })), 0);
      await load(first);
    });
    await check("Take it off the phone empties the store", async () => {
      await p.evaluate(() => dropEventData());
      await p.waitForFunction(() => /taken off/.test(S.evdSaid));
      await p.reload(); await p.waitForFunction(() => typeof S === "object");
      await p.evaluate(() => set({ tab: "more", more: "nexus" }));
      await p.waitForFunction(() => EVD_STATE === "none");
    });
    await check("no page errors", async () => assert.deepEqual(errors, []));
  } finally {
    await browser.close(); server.close(); fs.rmSync(tmp, {recursive: true, force: true});
  }
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();

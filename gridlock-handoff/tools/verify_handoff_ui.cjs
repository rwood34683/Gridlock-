#!/usr/bin/env node
"use strict";
/* Headless-load Gridlock Coach, import our event-data and season copy through
   the real UI path, count games/teams, screenshot. Read-only to the app repo. */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(process.env.HANDOFF_ROOT || path.join(__dirname, ".."));
const repo = process.env.GRIDLOCK_REPO || process.argv[2];
if (!repo || !fs.existsSync(path.join(repo, "scripts/serve.js"))) {
  console.error("Set GRIDLOCK_REPO to a Gridlock clone");
  process.exit(2);
}
const { chromium } = require(path.join(repo, "node_modules/playwright-core"));
const { launchOptions } = require(path.join(repo, "scripts/browser"));
const { createServer } = require(path.join(repo, "scripts/serve"));
const SEED = require(path.join(repo, "scripts/seed.js"));

const evdFile = path.join(root, "export/gridlock/event-data.json");
const copyFile = path.join(root, "export/gridlock/season-copy-games.json");
const shotDir = path.join(root, "verify");
fs.mkdirSync(shotDir, { recursive: true });

(async () => {
  const report = { passed: 0, failed: 0, screenshots: [], counts: {}, notes: [] };
  const note = (ok, name, extra) => {
    const line = name + (extra ? " — " + extra : "");
    if (ok) { report.passed++; console.log("PASS " + line); }
    else { report.failed++; console.error("FAIL " + line); }
  };
  const server = createServer({ root: path.join(repo, "web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", d => d.accept());

  try {
    await page.goto(url);
    await page.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, SEED);
    await page.goto(url);
    await page.waitForFunction(() => typeof S === "object" && S.entered);
    note(true, "app loaded with a seeded season", url);

    await page.evaluate(() => set({ tab: "more", more: "nexus", evdSaid: "" }));
    await page.waitForSelector("#evd-file");
    await page.setInputFiles("#evd-file", evdFile);
    await page.waitForFunction(() => /^Loaded|^Could|^That/.test(S.evdSaid), null, { timeout: 120000 });
    const evdSaid = await page.evaluate(() => S.evdSaid);
    note(/^Loaded/.test(evdSaid), "event data loaded via #evd-file (More › Account & backups)", evdSaid.slice(0, 240));
    const evdCounts = await page.evaluate(() => ({
      state: EVD_STATE,
      entries: EVD ? Object.keys(EVD.entries).length : 0,
      people: EVD ? Object.keys(EVD.people).length : 0,
      names: EVD ? Object.keys(EVD.byName).length : 0,
      teams: EVD ? Object.keys(EVD.byTeam).length : 0,
    }));
    report.counts.event_data = evdCounts;
    note(evdCounts.entries === 680 && evdCounts.people === 4381,
         "EVD has 680 entries and 4381 people", JSON.stringify(evdCounts));
    await page.evaluate(() => {
      const el = document.querySelector(".evd-entry") || document.getElementById("evd-file");
      if (el) el.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(shotDir, "01-event-data-loaded.png"), fullPage: true });
    report.screenshots.push("verify/01-event-data-loaded.png");

    const copyText = fs.readFileSync(copyFile, "utf8");
    await page.evaluate(() => set({ tab: "more", more: "nexus" }));
    // Account backups / copy-in lives on the nexus or a backups screen. Fill #copyIn if present.
    const hasCopy = await page.$("#copyIn");
    if (!hasCopy) {
      // Try the backups / copy section used in functions tests
      await page.evaluate(() => {
        if (typeof showCopy === "function") showCopy();
        else set({ tab: "more", more: "copy" });
      });
    }
    await page.waitForSelector("#copyIn", { timeout: 10000 });
    const mergeResult = await page.evaluate(text => {
      const el = document.getElementById("copyIn");
      if (el) el.value = text;
      copyDraft = text;
      const before = (S.games || []).length;
      window.loadCopy("merge", text);
      return { before, after: (S.games || []).length, status: S.copyStatus, all: typeof allGames === "function" ? allGames().length : null };
    }, copyText);
    report.counts.merge = mergeResult;
    note(!/not a Gridlock copy|invalid data/i.test(mergeResult.status || ""),
         "loadCopy('merge') accepted the season copy", mergeResult.status);
    note(mergeResult.after === 646, "S.games has 646 imported rows after merge", String(mergeResult.after));
    note(mergeResult.all === 78 + 646, "allGames() is 78 seed + 646 imported = 724", String(mergeResult.all));
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("p.note")].find(p => /Merged in/.test(p.textContent || "")) || document.getElementById("copyIn");
      if (el) el.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(shotDir, "02-season-copy-merged.png"), fullPage: true });
    report.screenshots.push("verify/02-season-copy-merged.png");

    await page.evaluate(() => set({ tab: "more", more: "schedule" }));
    await page.waitForTimeout(300);
    const sched = await page.evaluate(() => {
      const games = allGames();
      const teams = new Set(games.flatMap(g => [g.h, g.a].filter(Boolean)));
      const text = (document.getElementById("root") || document.body).innerText;
      return { games: games.length, teamNames: teams.size, hasScheduleWord: /Schedule/i.test(text),
        sample: games.slice(0, 3).map(g => `${g.d} ${g.t} ${g.h} v ${g.a}`),
        rootChars: text.length };
    });
    report.counts.schedule = sched;
    note(sched.games === 724, "schedule view allGames() is 724", String(sched.games));
    note(sched.teamNames > 0, "schedule has team names", String(sched.teamNames));
    await page.screenshot({ path: path.join(shotDir, "03-schedule.png"), fullPage: true });
    report.screenshots.push("verify/03-schedule.png");

    // Pick a World Cup Pro team so "Your team's day" renders imported games
    await page.evaluate(() => {
      if (typeof setMyTeam === "function") setMyTeam("San Diego Dynasty");
      else { S.myTeam = "San Diego Dynasty"; save(S); render(); }
    });
    await page.waitForTimeout(200);
    const day = await page.evaluate(() => {
      const text = (document.getElementById("root") || document.body).innerText;
      const mine = allGames().filter(g => foldName(g.h) === foldName("San Diego Dynasty") || foldName(g.a) === foldName("San Diego Dynasty"));
      return { mine: mine.length, mentionsDynasty: /San Diego Dynasty/i.test(text), textSlice: text.slice(0, 400) };
    });
    report.counts.dynasty_day = day;
    note(day.mine > 0, "San Diego Dynasty has games on the combined schedule", String(day.mine));
    note(day.mentionsDynasty, "Schedule UI shows San Diego Dynasty");
    await page.screenshot({ path: path.join(shotDir, "04-schedule-dynasty.png"), fullPage: true });
    report.screenshots.push("verify/04-schedule-dynasty.png");

    note(errors.length === 0, "no page errors", errors.join(" | "));
  } finally {
    await browser.close();
    server.close();
  }
  report.ok = report.failed === 0;
  fs.writeFileSync(path.join(shotDir, "ui-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`${report.passed} passed, ${report.failed} failed`);
  console.log("screenshots", report.screenshots.join(", "));
  process.exit(report.failed ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });

#!/usr/bin/env node
"use strict";
/* Grind X Admin Portal — aggregation across coaches' season copies. */
const path = require("node:path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");

let passed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log("  PASS  " + name); }
  else { console.log("  FAIL  " + name + (extra ? "  — " + extra : "")); process.exitCode = 1; }
}

// Two coaches' season copies, in the shape Save a copy writes.
const seasonA = { format: "gridlock.coach.copy", v: 1, scope: "all", at: "2026-03-01T00:00:00Z", app: "Grind X Coach",
  data: {
    matches: [ { id: "a1", layout: "lso", vs: "Dynasty" }, { id: "a2", layout: "lso", vs: "Impact" },
               { id: "aw", layout: "lso", vs: "Royalty", watch: true, home: "Dynasty", away: "Royalty" } ],
    results: [ { m: "a1", pt: 1, won: "us" }, { m: "a1", pt: 2, won: "them" }, { m: "a2", pt: 1, won: "us" },
               { m: "aw", pt: 1, won: "us" } ],   // the watched game must not count
    calls: [ { script: "snake", layout: "lso", m: "a1", pt: 1 }, { script: "snake", layout: "lso", m: "a1", pt: 2 },
             { script: "blitz", layout: "lso", m: "a2", pt: 1 }, { script: "snake", layout: "lso", m: "aw", pt: 1 } ],
    pens: [ { side: "them", layout: "lso", m: "a1", pt: 2 } ],
    breakCalls: { snake: "Rocket" } } };

const seasonB = { format: "gridlock.coach.copy", v: 1, scope: "all", at: "2026-04-01T00:00:00Z", app: "Grind X Coach",
  data: {
    matches: [ { id: "b1", layout: "mwo", vs: "Dynasty" } ],
    results: [ { m: "b1", pt: 1, won: "them" }, { m: "b1", pt: 2, won: "them" } ],
    calls: [ { script: "hold", layout: "mwo", m: "b1", pt: 1 } ],
    pens: [] } };

(async () => {
  const browser = await chromium.launch(launchOptions());
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    // The portal is a standalone tool at repo-root admin/, not part of the app
    // bundle the dev server roots on — load it straight off disk.
    await page.goto("file://" + path.resolve(__dirname, "../admin/index.html"));
    await page.evaluate(() => window.__adminReset());
    await page.evaluate(a => window.__adminAdd(JSON.stringify(a), "Coach A"), seasonA);
    await page.evaluate(b => window.__adminAdd(JSON.stringify(b), "Coach B"), seasonB);
    await page.waitForTimeout(60);

    const g = await page.evaluate(() => window.__adminSummary());
    check("both seasons load as two coaches", g.coaches === 2, JSON.stringify(g.coaches));
    check("events are counted across coaches", g.events === 2, "events=" + g.events);
    check("matches exclude the watched game", g.matches === 3, "matches=" + g.matches);
    check("record is counted from results, watched game left out",
      g.wins === 2 && g.losses === 3, `${g.wins}-${g.losses}`);
    check("breaks logged exclude the watched call", g.breaks === 4, "breaks=" + g.breaks);
    check("a coach's own name for a call is used", (g.calls["Rocket"] || 0) === 2, JSON.stringify(g.calls));
    check("a built-in keeps its default name", (g.calls["Blitz"] || 0) === 1 && (g.calls["Hold & Read"] || 0) === 1, JSON.stringify(g.calls));
    check("penalties are totalled", g.penalties === 1, "pens=" + g.penalties);
    check("record by opponent splits Dynasty across both coaches",
      g.byTeam.Dynasty && g.byTeam.Dynasty.wins === 1 && g.byTeam.Dynasty.losses === 3, JSON.stringify(g.byTeam.Dynasty));

    // It actually renders the dashboard, not just computes it.
    const txt = await page.evaluate(() => document.getElementById("root").innerText);
    check("the dashboard renders the record tile", /2\s*[–-]\s*3/.test(txt), txt.slice(0, 120));
    check("the by-event table names the field", /Lone Star Open/.test(txt) && /Midwest Open/.test(txt));

    // A junk file is refused, not crashed on.
    const err = await page.evaluate(() => window.__adminAdd("not json at all", "bad"));
    check("a file that is not a season copy is refused with a message", typeof err === "string" && /json|season/i.test(err), String(err));

    // The live cloud path: sign in for a token, then call the admin-only function.
    const cloud = await page.evaluate(async () => {
      window.__adminReset();
      window.__cloudReqs = [];
      window.fetch = async (u, o) => { o = o || {};
        window.__cloudReqs.push({ u: String(u), m: o.method || "GET", h: o.headers || {} });
        if (/\/auth\/v1\/token\?grant_type=password/.test(u)) return { ok: true, status: 200, json: async () => ({ access_token: "ADMINTOK" }) };
        if (/\/functions\/v1\/admin-seasons/.test(u)) return { ok: true, status: 200, json: async () => ([
          { label: "Garland", payload: { format: "gridlock.coach.copy", data: {
            matches: [{ id: "x", layout: "lso", vs: "Dynasty" }], results: [{ m: "x", pt: 1, won: "us" }] } } },
        ]) };
        return { ok: false, status: 404, json: async () => ({}) };
      };
      document.getElementById("cloudUrl").value = "https://demo.supabase.co";
      document.getElementById("cloudKey").value = "anon-1";
      document.getElementById("cloudEmail").value = "admin@club.com";
      document.getElementById("cloudPass").value = "pw";
      document.getElementById("cloudFn").value = "admin-seasons";
      await window.__adminCloudLoad();
      const g = window.__adminSummary();
      const auth = window.__cloudReqs.find(r => /auth\/v1\/token/.test(r.u));
      const fn = window.__cloudReqs.find(r => /functions\/v1\/admin-seasons/.test(r.u));
      return { coaches: g.coaches, matches: g.matches,
        authPost: !!auth && auth.m === "POST", fnAuthHeader: fn && fn.h.Authorization,
        fnApikey: fn && fn.h.apikey };
    });
    check("cloud connect signs in, then reads through the admin function", cloud.coaches === 1 && cloud.matches === 1, JSON.stringify(cloud));
    check("the token authorises the function call, with the anon apikey alongside",
      cloud.authPost && cloud.fnAuthHeader === "Bearer ADMINTOK" && cloud.fnApikey === "anon-1", JSON.stringify(cloud));

    check("no page errors during the run", errors.length === 0, errors.join(" | "));
    console.log(`\nAdmin portal: ${passed} checks passed.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

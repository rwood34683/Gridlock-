#!/usr/bin/env node
"use strict";
/* Gridlock Admin Portal — aggregation across coaches' season copies. */
const path = require("node:path");
const { chromium } = require("playwright-core");
const { pathToFileURL } = require("node:url");
const root = path.resolve(process.env.GRIDLOCK_TEST_ROOT || path.join(__dirname, ".."));
const { launchOptions } = require(path.join(root, "scripts/browser.js"));

let passed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log("  PASS  " + name); }
  else { console.log("  FAIL  " + name + (extra ? "  — " + extra : "")); process.exitCode = 1; }
}

// Two coaches' season copies, in the shape Save a copy writes.
const seasonA = { format: "gridlock.coach.copy", v: 1, scope: "all", at: "2026-03-01T00:00:00Z", app: "Gridlock Coach",
  data: {
    matches: [ { id: "a1", layout: "lso", vs: "Dynasty" }, { id: "a2", layout: "lso", vs: "Impact" },
               { id: "aw", layout: "lso", vs: "Royalty", watch: true, home: "Dynasty", away: "Royalty" } ],
    results: [ { m: "a1", pt: 1, won: "us" }, { m: "a1", pt: 2, won: "them" }, { m: "a2", pt: 1, won: "us" },
               { m: "aw", pt: 1, won: "us" } ],   // the watched game must not count
    calls: [ { script: "snake", layout: "lso", m: "a1", pt: 1 }, { script: "snake", layout: "lso", m: "a1", pt: 2 },
             { script: "blitz", layout: "lso", m: "a2", pt: 1 }, { script: "snake", layout: "lso", m: "aw", pt: 1 } ],
    pens: [ { side: "them", layout: "lso", m: "a1", pt: 2 } ],
    breakCalls: { snake: "Rocket" } } };

const seasonB = { format: "gridlock.coach.copy", v: 1, scope: "all", at: "2026-04-01T00:00:00Z", app: "Gridlock Coach",
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
    await page.goto(pathToFileURL(path.join(root, "admin/index.html")).href);
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

    // Exercise the sign-in and admin controls against the current API contract.
    // These fixtures never contact Supabase or use real credentials.
    await page.evaluate(() => {
      window.__cloudReqs = [];
      window.fetch = async (u, o = {}) => {
        const url = new URL(String(u));
        const body = o.body ? JSON.parse(o.body) : null;
        window.__cloudReqs.push({ u: String(u), m: o.method || "GET", h: o.headers || {}, body });
        const reply = data => ({ ok: true, status: 200, json: async () => data });
        const caller = { id: "11111111-1111-4111-8111-111111111111", email: "admin@example.test" };
        if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
          return reply({ access_token: "fixture-admin-token", expires_in: 3600 });
        }
        if (url.pathname === "/functions/v1/gridlock-admin") {
          if (url.searchParams.get("action") === "overview") return reply({
            caller, users: [{ ...caller, email_confirmed_at: "2026-10-01T00:00:00Z",
              created_at: "2026-10-01T00:00:00Z", last_sign_in_at: "2026-10-29T00:00:00Z",
              entitlement: { plan: "free", expires_at: null } }],
            page: 1, per_page: 50, has_more: false
          });
          if (url.searchParams.get("action") === "seasons") return reply({
            caller, seasons: [{ owner: caller.id, label: "Cloud Garland",
              updated_at: "2026-10-29T00:00:00Z", payload: { format: "gridlock.coach.copy", data: {
                matches: [{ id: "x", layout: "lso", vs: "Dynasty" }],
                results: [{ m: "x", pt: 1, won: "us" }] } } }],
            page: 1, per_page: 100, has_more: false
          });
          if (o.method === "POST" && body.action === "set_entitlement") return reply({
            ok: true, entitlement: { user_id: body.user_id, plan: body.plan,
              expires_at: body.expires_at, source: "admin" }
          });
        }
        return { ok: false, status: 404, json: async () => ({ error: "Unexpected fixture request" }) };
      };
    });
    await page.locator("#cloudEmail").fill("admin@example.test");
    await page.locator("#cloudPass").fill("fixture-password");
    await page.locator("#adminSignIn button[type=submit]").click();
    await page.waitForFunction(() => document.getElementById("usersTab") &&
      document.querySelector("[role=status]").textContent.includes("permissions were verified"));
    check("sign-in verifies admin access before showing the user list",
      await page.locator(".user-card").count() === 1 &&
      await page.locator("#cloudPass").count() === 0);
    check("connection settings are not editable in the portal",
      await page.locator("#cloudUrl, #cloudKey, #cloudFn").count() === 0);

    await page.locator("#plan-0").selectOption("program");
    await page.locator('form[data-user-index="0"] button[type=submit]').click();
    await page.waitForFunction(() => document.querySelector("[role=status]").textContent.includes("Plan saved"));
    const planWrite = await page.evaluate(() => {
      const req = window.__cloudReqs.find(r => r.body && r.body.action === "set_entitlement");
      return !!req && req.m === "POST" && req.body.user_id === "11111111-1111-4111-8111-111111111111" &&
        req.body.plan === "program" && req.body.expires_at === null;
    });
    check("Save plan writes the selected account and optional expiry", planWrite);

    await page.locator("#seasonsTab").click();
    await page.locator("#cloudSeasons").click();
    await page.waitForFunction(() => document.querySelector("[role=status]").textContent.includes("Loaded 1 synced season"));
    const cloud = await page.evaluate(() => {
      const summary = window.__adminSummary();
      const auth = window.__cloudReqs.find(r => /auth\/v1\/token/.test(r.u));
      const functions = window.__cloudReqs.filter(r => /functions\/v1\/gridlock-admin/.test(r.u));
      const persisted = JSON.stringify(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]));
      return { coaches: summary.coaches, matches: summary.matches,
        authPost: !!auth && auth.m === "POST",
        functionAuth: functions.length === 3 && functions.every(r =>
          r.h.Authorization === "Bearer fixture-admin-token" && /^sb_publishable_/.test(r.h.apikey)),
        fixedProject: window.__cloudReqs.every(r => new URL(r.u).origin === "https://tldgxtrvbzlnydlysdln.supabase.co"),
        privateInStorage: /Cloud Garland|fixture-admin-token|fixture-password/.test(persisted) };
    });
    check("cloud seasons combine with imported copies without replacing them",
      cloud.coaches === 3 && cloud.matches === 4, JSON.stringify(cloud));
    check("verified user token and publishable key authorize admin requests",
      cloud.authPost && cloud.functionAuth && cloud.fixedProject);
    check("cloud records and credentials are not persisted in browser storage", !cloud.privateInStorage);

    // Check the actual signed-in controls in both orientations. The main app's
    // device suite does not visit this standalone portal. Inline prose links
    // (password help and the file chooser label) remain normal running text;
    // the standalone header link and every form/navigation control need 44px.
    const adminLayout = () => {
      const width = window.innerWidth;
      const controls = [...document.querySelectorAll(
        "button, select, textarea, input:not([type=hidden]):not([type=file]), .hdr__note a"
      )].map(el => {
        const rect = el.getBoundingClientRect();
        return { rect, label: (el.textContent || el.getAttribute("aria-label") || el.id || el.tagName).trim().slice(0, 45) };
      }).filter(({ rect }) => rect.width > 0 && rect.height > 0);
      return {
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - width,
        small: controls.filter(({ rect }) => Math.ceil(Math.min(rect.width, rect.height)) < 44)
          .map(({ rect, label }) => `${label}: ${Math.round(rect.width)}x${Math.round(rect.height)}`),
        outside: controls.filter(({ rect }) => rect.left < -1 || rect.right > width + 1)
          .map(({ label }) => label),
        usersReady: !!document.querySelector(".user-card") && !!document.querySelector("form.plan-form select") &&
          !!document.querySelector("form.plan-form input[type=datetime-local]") &&
          document.querySelectorAll("[role=tab]").length === 2,
        importsReady: document.querySelectorAll(".season input[data-id]").length === 2 &&
          document.querySelectorAll("button[data-drop]").length === 2 && !!document.getElementById("clear") &&
          !!document.getElementById("cloudSeasons")
      };
    };
    for (const [name, width, height] of [
      ["phone portrait", 390, 844], ["phone landscape", 844, 390],
      ["tablet portrait", 768, 1024], ["tablet landscape", 1024, 768]
    ]) {
      await page.setViewportSize({ width, height });
      await page.locator("#usersTab").click();
      const account = await page.evaluate(adminLayout);
      check(`${name}: user cards, plan fields and navigation render`, account.usersReady);
      check(`${name}: user controls stay within the page`, account.overflow <= 1 && account.outside.length === 0,
        JSON.stringify({ overflow: account.overflow, outside: account.outside }));
      check(`${name}: user controls have 44px touch targets`, account.small.length === 0, account.small.join("; "));
      await page.locator("#seasonsTab").click();
      const imports = await page.evaluate(adminLayout);
      check(`${name}: season import and cloud controls render`, imports.importsReady);
      check(`${name}: season controls stay within the page`, imports.overflow <= 1 && imports.outside.length === 0,
        JSON.stringify({ overflow: imports.overflow, outside: imports.outside }));
      check(`${name}: season controls have 44px touch targets`, imports.small.length === 0, imports.small.join("; "));
    }
    await page.setViewportSize({ width: 1024, height: 900 });

    await page.locator("#signOut").click();
    const signedOut = await page.evaluate(() => ({
      summary: window.__adminSummary(), text: document.getElementById("root").innerText,
      hasLogin: !!document.getElementById("adminSignIn"), hasUsers: !!document.getElementById("usersTab")
    }));
    check("sign-out removes cloud data and keeps manual imports",
      signedOut.hasLogin && !signedOut.hasUsers && signedOut.summary.coaches === 2 &&
      signedOut.summary.matches === 3 && !signedOut.text.includes("Cloud Garland") &&
      !signedOut.text.includes("admin@example.test"));
    await page.reload();
    const restored = await page.evaluate(() => window.__adminSummary());
    check("reloading restores only manually imported seasons", restored.coaches === 2 && restored.matches === 3);

    check("no page errors during the run", errors.length === 0, errors.join(" | "));
    console.log(`\nAdmin portal: ${passed} checks passed.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });


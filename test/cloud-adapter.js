#!/usr/bin/env node
"use strict";
/* Grind X cloud adapter (native/gridlock-cloud.js) against a mocked Supabase.
 * No live backend: a stubbed fetch records requests and returns canned answers,
 * so the adapter's own logic — sessions, offline fall-through, the upsert
 * payload, delete — is what gets checked. */
const path = require("node:path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");

let passed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log("  PASS  " + name); }
  else { console.log("  FAIL  " + name + (extra ? "  — " + extra : "")); process.exitCode = 1; }
}

// Installed in the page: routes Supabase paths, records every request, and can
// be flipped offline. Returns the shape the adapter expects from fetch().
const MOCK_FETCH = `
window.__reqs = []; window.__netUp = true;
window.fetch = async (url, opts) => {
  opts = opts || {};
  window.__reqs.push({ url: String(url), method: opts.method || "GET", body: opts.body, headers: opts.headers || {} });
  if (!window.__netUp) throw new TypeError("Failed to fetch");
  let status = 200, body = {};
  if (/\\/auth\\/v1\\/token\\?grant_type=password/.test(url)) {
    const b = JSON.parse(opts.body);
    if (b.password === "sideline1") body = { access_token:"AT", refresh_token:"RT", expires_in:3600, user:{ id:"u_1", email:b.email } };
    else { status = 400; body = { msg:"Invalid login credentials" }; }
  } else if (/\\/auth\\/v1\\/signup/.test(url)) {
    body = { access_token:"AT", refresh_token:"RT", expires_in:3600, user:{ id:"u_1", email: JSON.parse(opts.body).email } };
  } else if (/grant_type=refresh_token/.test(url)) {
    body = { access_token:"AT2", refresh_token:"RT2", expires_in:3600, user:{ id:"u_1" } };
  } else if (/\\/auth\\/v1\\/recover/.test(url)) {
    body = {};
  } else if (/\\/rest\\/v1\\/seasons/.test(url)) {
    status = opts.method === "DELETE" ? 204 : 201; body = {};
  }
  return { ok: status < 300, status, json: async () => body };
};`;

(async () => {
  const browser = await chromium.launch(launchOptions());
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    // A real origin, so localStorage works for the session store.
    await page.goto((process.env.APP_URL || "http://localhost:5173/"));
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(MOCK_FETCH);
    await page.addScriptTag({ path: path.resolve(__dirname, "../native/gridlock-cloud.js") });

    check("unconfigured, it does not install", await page.evaluate(() => !window.gridlockCloud));
    check("configure() installs the adapter", await page.evaluate(() => {
      window.gridlockCloudConfigure("https://demo.supabase.co", "anon-key-123");
      return !!(window.gridlockCloud && window.gridlockCloud.pushSeason && window.gridlockCloud.signIn);
    }));

    check("sign-in stores a session and returns the user", await page.evaluate(async () => {
      const r = await window.gridlockCloud.signIn("coach@team.com", "sideline1");
      const last = window.__reqs[window.__reqs.length - 1];
      return r.ok && r.user.id === "u_1"
        && /\/auth\/v1\/token\?grant_type=password/.test(last.url)
        && last.headers.apikey === "anon-key-123";
    }));
    check("session() reports the signed-in user", await page.evaluate(() => {
      const s = window.gridlockCloud.session(); return !!s && s.user.id === "u_1";
    }));
    check("a wrong password is a real refusal, shown as written", await page.evaluate(async () => {
      const r = await window.gridlockCloud.signIn("coach@team.com", "nope");
      return r.ok === false && !r.offline && /Invalid login credentials/.test(r.said);
    }));
    check("no signal is offline, never a refusal", await page.evaluate(async () => {
      window.__netUp = false;
      const r = await window.gridlockCloud.signIn("coach@team.com", "sideline1");
      window.__netUp = true;
      return r.ok === false && r.offline === true && !r.said;
    }));

    // Re-establish a session for the season calls.
    await page.evaluate(async () => { await window.gridlockCloud.signIn("coach@team.com", "sideline1"); window.__reqs = []; });

    check("pushSeason upserts one row keyed on owner, with the season as the payload", await page.evaluate(async () => {
      const copy = JSON.stringify({ format: "gridlock.coach.copy", v: 1, data: { matches: [{ id: "m1" }] } });
      const r = await window.gridlockCloud.pushSeason("Garland Elite", copy);
      const last = window.__reqs[window.__reqs.length - 1];
      const row = JSON.parse(last.body);
      return r.ok
        && last.method === "POST"
        && /\/rest\/v1\/seasons\?on_conflict=owner/.test(last.url)
        && /merge-duplicates/.test(last.headers.Prefer || "")
        && last.headers.Authorization === "Bearer AT"
        && row.owner === "u_1" && row.label === "Garland Elite"
        && row.payload && row.payload.data.matches[0].id === "m1";      // stored as an object, not a string
    }));
    check("pushSeason with no signal is offline and sends nothing durable", await page.evaluate(async () => {
      window.__netUp = false; window.__reqs = [];
      const r = await window.gridlockCloud.pushSeason("Garland Elite", "{}");
      window.__netUp = true;
      return r.offline === true;
    }));
    check("deleteSeason removes only this owner's row", await page.evaluate(async () => {
      window.__reqs = [];
      const r = await window.gridlockCloud.deleteSeason();
      const last = window.__reqs[window.__reqs.length - 1];
      return r.ok && last.method === "DELETE" && /\/rest\/v1\/seasons\?owner=eq\.u_1/.test(last.url);
    }));

    check("pushSeason before sign-in refuses without touching the network", await page.evaluate(async () => {
      window.gridlockCloud.signOut();
      window.__reqs = [];
      const r = await window.gridlockCloud.pushSeason("x", "{}");
      const noRest = !window.__reqs.some(q => /\/rest\/v1\/seasons/.test(q.url));
      return r.ok === false && /Sign in/.test(r.said) && noRest && !window.gridlockCloud.session();
    }));
    check("the service key never appears in the adapter", await page.evaluate(() =>
      !/service_role|service-role|serviceKey/i.test(String(window.gridlockCloud.pushSeason) + String(window.gridlockCloud.signIn))));

    check("no page errors during the run", errors.length === 0, errors.join(" | "));
    console.log(`\nCloud adapter: ${passed} checks passed.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

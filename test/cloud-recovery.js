#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../native/gridlock-cloud.js"), "utf8");
const KEY = "grindx.cloud.session";
const user = {id: "coach-id", email: "coach@example.test"};
const credentials = {access_token: "test-access", refresh_token: "test-refresh", expires_in: 3600, user};
const response = (body = {}, status = 200) => ({ok: status >= 200 && status < 300, status, json: async () => body});
const deferred = () => {let resolve; const promise = new Promise(r => {resolve = r;}); return {promise, resolve};};
const link = (type = "recovery", base = "https://app.example.test/app.html") => base + "#" + new URLSearchParams({access_token: "test-access", refresh_token: "test-refresh", expires_in: "3600", type});
function setup(route = () => response(user), extra = {}) {
  const data = new Map(), requests = [], replaced = [];
  const window = {GRIDLOCK_CLOUD: {url: "https://demo.supabase.co", anonKey: "public-fixture"}, location: {href: "https://app.example.test/app.html"}, history: {replaceState: (_s, _t, value) => replaced.push(value)}, ...extra};
  const localStorage = {getItem: k => data.get(k) || null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k)};
  vm.runInNewContext(source, {window, localStorage, URL, URLSearchParams, Date, JSON, Promise, fetch: async (url, opts) => {requests.push({url, ...opts}); return route(url, opts);}});
  return {api: window.gridlockCloud, configure: window.gridlockCloudConfigure, window, data, requests, replaced, localStorage};
}
let passed = 0;
async function check(name, fn) {await fn(); console.log("  PASS  " + name); passed++;}
(async () => {
  await check("confirmation-required signup never creates a session", async () => {
    const s = setup(() => response(user));
    const r = await s.api.signUp(user.email, "test-password");
    assert.equal(r.ok, true); assert.equal(r.pendingConfirmation, true);
    assert.equal(s.api.session(), null); assert.equal(s.data.size, 0);
    assert.equal(new URL(s.requests[0].url).searchParams.get("redirect_to"), "https://app.example.test/app.html");
  });
  await check("auto-confirmed signup still creates a validated account session", async () => {
    const s = setup(() => response(credentials));
    assert.equal((await s.api.signUp(user.email, "test-password")).user.id, user.id);
    assert.equal(s.api.session().user.id, user.id);
  });
  await check("empty signup responses do not claim success", async () => {
    const s = setup(() => response({})); assert.equal((await s.api.signUp(user.email, "test-password")).ok, false);
  });
  await check("reset emails return to the configured app page", async () => {
    const s = setup(); s.configure("https://demo.supabase.co", "fixture", "gridlock://auth/callback");
    assert.equal((await s.api.sendReset(user.email)).ok, true);
    assert.equal(new URL(s.requests[0].url).searchParams.get("redirect_to"), "gridlock://auth/callback");
  });
  for (const raw of ["https://evil.example/app.html#access_token=x", "https://app.example.test/other#access_token=x", "https://u:p@app.example.test/app.html#access_token=x", "https://app.example.test/app.html?c=GL-123", "garbage"]) {
    await check("unrelated or untrusted URLs do not authenticate: " + raw.split("#")[0], async () => {
      const s = setup(); assert.equal(s.api.isAuthUrl(raw), false); assert.equal(await s.api.handleAuthUrl(raw), null); assert.equal(s.requests.length, 0);
    });
  }
  for (const type of ["recovery", "invite"]) {
    await check(type + " verifies identity and keeps tokens out of storage until a password is set", async () => {
      const s = setup(); s.window.location.href = link(type);
      const r = await s.api.handleAuthUrl(link(type));
      assert.equal(r.recovery, true); assert.equal(r.user.id, user.id);
      assert.deepEqual(s.replaced, ["/app.html"]); assert.equal(s.data.size, 0); assert.equal(s.api.session(), null);
      assert.equal(s.requests[0].headers.Authorization, "Bearer test-access");
      assert.equal((await s.api.pushSeason("forbidden during reset", {})).ok, false);
      assert.equal((await s.api.updatePassword("new-password")).ok, true);
      assert.equal(s.requests.at(-1).method, "PUT"); assert.equal(JSON.parse(s.requests.at(-1).body).password, "new-password");
      assert.equal(s.api.session().user.id, user.id);
      assert.equal([...s.data.values()].some(v => v.includes("new-password")), false);
    });
  }
  await check("signup callback confirms email but requires password sign-in", async () => {
    const s = setup(); const r = await s.api.handleAuthUrl(link("signup"));
    assert.equal(r.confirmed, true); assert.equal(s.data.size, 0); assert.equal(s.api.session(), null);
    assert.equal((await s.api.updatePassword("new-password")).ok, false);
  });
  await check("expired and malformed links are scrubbed without creating sessions", async () => {
    for (const hash of ["#error=access_denied&error_code=otp_expired", "#access_token=x&type=recovery", "#access_token=x&refresh_token=y&type=magiclink"]) {
      const s = setup(); s.window.location.href += hash;
      assert.equal((await s.api.handleAuthUrl(s.window.location.href)).ok, false);
      assert.equal(s.replaced.length, 1); assert.equal(s.requests.length, 0); assert.equal(s.data.size, 0);
    }
    const s = setup(() => response({}, 401)); assert.equal((await s.api.handleAuthUrl(link())).ok, false); assert.equal(s.api.session(), null);
  });
  for (const action of ["signOut", "cancelRecovery", "configure", "otherTab"]) {
    await check("late callback cannot survive " + action, async () => {
      const gate = deferred(), s = setup(() => gate.promise);
      const pending = s.api.handleAuthUrl(link());
      if (action === "configure") s.configure("https://other.supabase.co", "other");
      else if (action === "otherTab") s.data.set(KEY, JSON.stringify({...credentials, user: {id: "other"}, expires_at: Date.now() + 3600000}));
      else s.api[action]();
      gate.resolve(response(user)); assert.equal((await pending).ok, false);
      assert.equal((await s.api.updatePassword("new-password")).ok, false);
    });
  }
  await check("late password update cannot undo cancellation", async () => {
    const gate = deferred(), s = setup((_u,o) => o.method === "PUT" ? gate.promise : response(user));
    await s.api.handleAuthUrl(link()); const pending = s.api.updatePassword("new-password");
    assert.equal((await s.api.updatePassword("duplicate-password")).ok, false);
    s.api.cancelRecovery(); gate.resolve(response(user)); assert.equal((await pending).ok, false); assert.equal(s.api.session(), null);
  });
  await check("failed password save keeps recovery retryable; failed storage never claims login", async () => {
    let refused = true;
    const s = setup((_u,o) => o.method === "PUT" && refused ? response({msg: "Password too weak"}, 422) : response(user));
    await s.api.handleAuthUrl(link()); assert.equal((await s.api.updatePassword("new-password")).ok, false);
    refused = false; s.localStorage.setItem = () => {throw Error("quota");};
    const r = await s.api.updatePassword("new-password"); assert.equal(r.ok, false); assert.match(r.said, /password was changed/); assert.equal(s.api.session(), null);
  });
  await check("native callback defaults to the registered app scheme", async () => {
    const s = setup(undefined, {Capacitor: {isNativePlatform: () => true}, location: {href: "capacitor://localhost/"}});
    assert.equal(s.api.isAuthUrl(link("invite", "gridlock://auth/callback")), true);
    assert.equal((await s.api.handleAuthUrl(link("invite", "gridlock://auth/callback"))).recovery, true);
  });
  await check("explicit unsafe callback configuration does not authorize URLs", async () => {
    for (const redirectTo of ["gridlock://auth:123/callback", "https://app.example.test/app.html?next=evil", "https://app.example.test/app.html#anything", "javascript:alert(1)"]) {
      const s = setup(); s.configure("https://demo.supabase.co", "fixture", redirectTo);
      assert.equal(s.api.isAuthUrl(link()), false);
    }
  });
  console.log(`Cloud recovery regressions: ${passed} passed.`);
})().catch(e => {console.error(e); process.exitCode = 1;});

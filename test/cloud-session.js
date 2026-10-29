#!/usr/bin/env node
"use strict";
// Deterministic request barriers exercise logout/account changes and deletion ordering.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../native/gridlock-cloud.js"), "utf8");
const KEY = "grindx.cloud.session";
const response = (body = {}, status = 200) => ({ok: status < 300, status, json: async () => body});
const credentials = id => ({access_token: "token-" + id, refresh_token: "refresh-" + id, expires_in: 3600, user: {id, email: id + "@example.test"}});
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(route, expired = false) {
  const data = new Map(), requests = [];
  if (expired) data.set(KEY, JSON.stringify({...credentials("old"), expires_at: 1}));
  const localStorage = {getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k)};
  const sandbox = {window: {GRIDLOCK_CLOUD: {url: "https://example.test", anonKey: "test-only"}}, localStorage, Date, JSON, Promise,
    fetch: async (url, opts) => { requests.push({url, ...opts}); return route(url, opts); }};
  vm.runInNewContext(source, sandbox);
  return {api: sandbox.window.gridlockCloud, configure: sandbox.window.gridlockCloudConfigure, data, requests, localStorage};
}
let passed = 0;
async function check(name, fn) { await fn(); console.log("  PASS  " + name); passed++; }
(async () => {
  await check("removal without a session refuses without a request", async () => {
    const s = setup(() => response());
    assert.equal((await s.api.deleteSeason()).ok, false);
    assert.equal(s.requests.length, 0);
  });
  for (const action of ["logout", "account", "configuration"]) {
    await check("a pending refresh cannot outlive " + action, async () => {
      const gate = deferred();
      const s = setup(url => url.includes("refresh_token") ? gate.promise : response(credentials("new")), true);
      const pending = s.api.pushSeason("test", {});
      await tick();
      assert.ok(s.requests.some(r => r.url.includes("refresh_token")));
      if (action === "logout") s.api.signOut();
      if (action === "account") assert.equal((await s.api.signIn("new@example.test", "password")).ok, true);
      if (action === "configuration") s.configure("https://other.example.test", "another-test-key");
      gate.resolve(response(credentials("old")));
      assert.equal((await pending).ok, false);
      assert.equal(s.requests.filter(r => r.url.includes("/rest/")).length, 0);
      assert.equal(s.api.session()?.user.id || null, action === "account" ? "new" : null);
      assert.equal(s.data.has(KEY), action === "account");
    });
  }
  for (const method of ["signIn", "signUp"]) {
    await check("late " + method + " cannot undo logout", async () => {
      const gate = deferred(), s = setup(() => gate.promise);
      const pending = s.api[method]("old@example.test", "password");
      s.api.signOut(); gate.resolve(response(credentials("old")));
      assert.equal((await pending).ok, false);
      assert.equal(s.api.session(), null);
      assert.equal(s.data.has(KEY), false);
    });
  }
  await check("overlapping sign-ins keep only the latest account", async () => {
    const gate = deferred();
    const s = setup((url, opts) => JSON.parse(opts.body).email.startsWith("old") ? gate.promise : response(credentials("new")));
    const pending = s.api.signIn("old@example.test", "password");
    assert.equal((await s.api.signIn("new@example.test", "password")).ok, true);
    gate.resolve(response(credentials("old")));
    assert.equal((await pending).ok, false);
    assert.equal(s.api.session().user.id, "new");
  });
  await check("DELETE follows dispatched POST and drops queued uploads", async () => {
    const gate = deferred();
    const s = setup((url, opts) => url.includes("/rest/") && opts.method === "POST" ? gate.promise : response(credentials("old")));
    await s.api.signIn("old@example.test", "password");
    const upload = s.api.pushSeason("first", {});
    await tick();
    const queued = s.api.pushSeason("queued", {});
    const removal = s.api.deleteSeason();
    assert.equal((await s.api.pushSeason("during removal", {})).ok, false);
    await tick();
    assert.equal(s.requests.filter(r => r.method === "DELETE").length, 0);
    gate.resolve(response({}, 201));
    assert.equal((await upload).ok, false); // stale status must not report a later send
    assert.equal((await queued).ok, false);
    assert.equal((await removal).ok, true);
    assert.deepEqual(s.requests.filter(r => r.url.includes("/rest/")).map(r => r.method), ["POST", "DELETE"]);
    assert.ok(s.requests.at(-1).url.endsWith("owner=eq.old"));
  });
  await check("deletion during refresh cancels the upload and removes with the refreshed token", async () => {
    const gate = deferred(), s = setup(url => url.includes("refresh_token") ? gate.promise : response({}, 204), true);
    const upload = s.api.pushSeason("test", {}); await tick();
    const removal = s.api.deleteSeason();
    gate.resolve(response(credentials("old")));
    assert.equal((await upload).ok, false);
    assert.equal((await removal).ok, true);
    assert.deepEqual(s.requests.filter(r => r.url.includes("/rest/")).map(r => r.method), ["DELETE"]);
    assert.equal(s.requests.at(-1).headers.Authorization, "Bearer token-old");
  });
  await check("a delete queued before an account switch never deletes the new account", async () => {
    const gate = deferred(), s = setup((url, opts) => url.includes("/rest/") && opts.method === "POST" ? gate.promise : response(credentials("new")));
    await s.api.signIn("new@example.test", "password");
    const upload = s.api.pushSeason("test", {}); await tick();
    const removal = s.api.deleteSeason();
    s.api.signOut(); await s.api.signIn("new@example.test", "password");
    gate.resolve(response()); await upload;
    assert.equal((await removal).ok, false);
    assert.equal(s.requests.filter(r => r.method === "DELETE").length, 0);
  });
  await check("failed deletion reports failure and can be retried", async () => {
    let fail = true;
    const s = setup((url, opts) => opts.method === "DELETE" ? response({}, fail ? 500 : 204) : response(credentials("old")));
    await s.api.signIn("old@example.test", "password");
    assert.equal((await s.api.deleteSeason()).ok, false);
    fail = false; assert.equal((await s.api.deleteSeason()).ok, true);
  });
  await check("refused session storage does not report sign-in success", async () => {
    const s = setup(() => response(credentials("old")));
    s.localStorage.setItem = () => { throw Error("quota"); };
    assert.equal((await s.api.signIn("old@example.test", "password")).ok, false);
    assert.equal(s.api.session(), null);
  });
  await check("malformed stored sessions are treated as signed out", async () => {
    for (const value of ["null", "[]", "true", '"text"', '{"user":null}', '{"access_token":{},"user":{"id":"x"}}']) {
      const s = setup(() => response()); s.data.set(KEY, value);
      assert.equal(s.api.session(), null);
      assert.equal((await s.api.pushSeason("x", {})).ok, false);
      assert.equal(s.requests.length, 0);
    }
  });
  console.log(`Cloud session regressions: ${passed} passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });

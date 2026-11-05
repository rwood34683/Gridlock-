#!/usr/bin/env node
"use strict";
/* Google and Apple sign-in through the cloud adapter (PKCE). The adapter runs
   in a sandbox against a scripted account server; no real provider, project
   or email is touched. Each check is a way the callback could be trusted when
   it should not be. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const source = fs.readFileSync(path.join(__dirname, "../native/gridlock-cloud.js"), "utf8");
const SESSION = "grindx.cloud.session", PENDING = "grindx.cloud.oauth";
const APP = "https://app.example.test/";
const response = (body = {}, status = 200) => ({ ok: status < 300, status, json: async () => body });
const creds = id => ({ access_token: "token-" + id, refresh_token: "refresh-" + id, expires_in: 3600, user: { id, email: id + "@example.test" } });

function setup({ providers = ["google", "apple"], route = () => response(), native = false, opener = undefined, now } = {}) {
  const data = new Map(), requests = [], went = [], replaced = [];
  const localStorage = { getItem: k => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) };
  const loc = { href: APP, protocol: "https:", pathname: "/", search: "", assign: u => went.push(u) };
  const clock = { now: now || Date.now };
  const FakeDate = class extends Date { static now() { return clock.now(); } };
  const window = {
    GRIDLOCK_CLOUD: { url: "https://project.example.test", anonKey: "public-test-key", redirectTo: APP, ...(providers ? { providers } : {}) },
    location: loc, history: { replaceState: (a, b, u) => replaced.push(u) },
  };
  if (native) window.Capacitor = { isNativePlatform: () => true };
  if (opener) window.gridlockOpenAuth = opener;
  const sandbox = { window, localStorage, Date: FakeDate, JSON, Promise, TextEncoder, URL, URLSearchParams, crypto: webcrypto, btoa,
    Uint8Array, Uint32Array, setTimeout, clearTimeout,
    fetch: async (url, opts = {}) => { requests.push({ url, ...opts }); return route(url, opts); } };
  vm.runInNewContext(source, sandbox);
  return { api: window.gridlockCloud, data, requests, went, replaced, clock, window };
}
async function challengeOf(v) {
  const d = new Uint8Array(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
  return Buffer.from(d).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const server = (user = "coach") => (url, opts) => {
  if (url.includes("grant_type=pkce")) return response(creds(user));
  if (url.endsWith("/auth/v1/user")) return response({ id: user, email: user + "@example.test" });
  return response({}, 404);
};
let passed = 0;
async function check(name, fn) { await fn(); console.log("  PASS  " + name); passed++; }

(async () => {
  await check("no provider is offered until the owner switches one on, and an unknown name is never offered", async () => {
    assert.deepEqual([...setup({ providers: null }).api.providers()], []);
    assert.deepEqual([...setup({ providers: ["github", "google"] }).api.providers()], ["google"]);
    assert.deepEqual([...setup().api.providers()], ["google", "apple"]);
  });
  await check("a native shell that cannot open the system browser offers no provider button", async () => {
    assert.deepEqual([...setup({ native: true }).api.providers()], []);
    assert.deepEqual([...setup({ native: true, opener: () => {} }).api.providers()], ["google", "apple"]);
  });
  await check("starting Google sends only the code challenge, keeps the verifier here, and makes no request", async () => {
    const s = setup();
    assert.equal((await s.api.startProvider("google", "signin")).ok, true);
    assert.equal(s.requests.length, 0, "the authorize page is a navigation, not a request");
    const flow = JSON.parse(s.data.get(PENDING)), u = new URL(s.went[0]);
    assert.equal(u.origin + u.pathname, "https://project.example.test/auth/v1/authorize");
    assert.equal(u.searchParams.get("provider"), "google");
    assert.equal(u.searchParams.get("redirect_to"), APP);
    assert.equal(u.searchParams.get("code_challenge_method"), "s256");
    assert.equal(u.searchParams.get("code_challenge"), await challengeOf(flow.v));
    assert.ok(!s.went[0].includes(flow.v), "the verifier never leaves the phone before the exchange");
    assert.ok(!/secret|p8|private/i.test(s.went[0]));
  });
  await check("a provider that is not switched on does not start", async () => {
    const s = setup({ providers: ["google"] });
    assert.equal((await s.api.startProvider("apple", "signin")).ok, false);
    assert.equal(s.went.length + s.requests.length, 0);
  });
  await check("the way back exchanges the code with the kept verifier, checks the user with the server and clears the address", async () => {
    const s = setup({ route: server("coach") });
    await s.api.startProvider("apple", "signin");
    const v = JSON.parse(s.data.get(PENDING)).v, back = APP + "?code=one-time";
    assert.equal(s.api.authUrlKind(back), "signin");
    s.window.location.href = back;
    const r = await s.api.handleAuthUrl(back);
    assert.equal(r.ok, true); assert.equal(r.oauth, true); assert.equal(r.provider, "apple"); assert.equal(r.user.id, "coach");
    const ex = s.requests.find(q => q.url.includes("grant_type=pkce"));
    assert.deepEqual(JSON.parse(ex.body), { auth_code: "one-time", code_verifier: v });
    assert.ok(s.requests.some(q => q.url.endsWith("/auth/v1/user") && q.headers.Authorization === "Bearer token-coach"));
    assert.equal(JSON.parse(s.data.get(SESSION)).user.id, "coach");
    assert.equal(s.data.has(PENDING), false, "the verifier is used once");
    assert.deepEqual(s.replaced, ["/"], "the code is out of the address before anything else");
  });
  await check("a callback this phone did not start is refused without a request", async () => {
    const s = setup({ route: server() });
    const r = await s.api.handleAuthUrl(APP + "?code=someone-elses");
    assert.equal(r.ok, false); assert.match(r.said, /not started on this phone/);
    assert.equal(s.requests.length, 0); assert.equal(s.data.has(SESSION), false);
  });
  await check("a reload of the callback cannot replay it", async () => {
    const s = setup({ route: server() });
    await s.api.startProvider("google", "signin");
    assert.equal((await s.api.handleAuthUrl(APP + "?code=c1")).ok, true);
    const n = s.requests.length, again = await s.api.handleAuthUrl(APP + "?code=c1");
    assert.equal(again.ok, false); assert.equal(s.requests.length, n);
  });
  await check("a sign-in left for more than ten minutes has expired", async () => {
    let t = Date.now();
    const s = setup({ route: server(), now: () => t });
    await s.api.startProvider("google", "signin");
    t += 11 * 60 * 1000;
    const r = await s.api.handleAuthUrl(APP + "?code=late");
    assert.equal(r.ok, false); assert.equal(s.requests.length, 0);
  });
  await check("cancelling at Google says so and signs nobody in", async () => {
    const s = setup({ route: server() });
    await s.api.startProvider("google", "signin");
    const back = APP + "?error=access_denied&error_description=The+user+cancelled";
    assert.equal(s.api.isAuthUrl(back), true);
    const r = await s.api.handleAuthUrl(back);
    assert.equal(r.ok, false); assert.match(r.said, /cancelled/);
    assert.equal(s.requests.length, 0); assert.equal(s.data.has(SESSION), false); assert.equal(s.data.has(PENDING), false);
  });
  await check("closed signups on the server stay closed: a new Google or Apple account is told it is not on the beta list", async () => {
    const s = setup({ route: server() });
    await s.api.startProvider("apple", "signin");
    const r = await s.api.handleAuthUrl(APP + "#error=server_error&error_code=signup_disabled&error_description=Signups+not+allowed+for+this+instance");
    assert.equal(r.ok, false); assert.match(r.said, /not on the beta list/); assert.equal(s.data.has(SESSION), false);
  });
  await check("an expired or refused code writes no session", async () => {
    const s = setup({ route: url => url.includes("pkce") ? response({ msg: "invalid flow state" }, 400) : response({}, 404) });
    await s.api.startProvider("google", "signin");
    const r = await s.api.handleAuthUrl(APP + "?code=stale");
    assert.equal(r.ok, false); assert.equal(s.data.has(SESSION), false);
  });
  await check("a token the server does not confirm as the same user is refused", async () => {
    const s = setup({ route: url => url.includes("pkce") ? response(creds("a")) : response({ id: "b", email: "b@example.test" }) });
    await s.api.startProvider("google", "signin");
    assert.equal((await s.api.handleAuthUrl(APP + "?code=x")).ok, false);
    assert.equal(s.data.has(SESSION), false);
  });
  await check("no signal on the way back keeps the phone as it was", async () => {
    const s = setup({ route: () => { throw new Error("offline"); } });
    await s.api.startProvider("google", "signin");
    const r = await s.api.handleAuthUrl(APP + "?code=x");
    assert.equal(r.ok, false); assert.match(r.said, /could not be reached/); assert.equal(s.data.has(SESSION), false);
  });
  await check("linking asks the server for the provider page with the coach's own token, and keeps him signed in", async () => {
    const s = setup({ route: (url, o) => {
      if (url.includes("/user/identities/authorize")) return response({ url: "https://accounts.google.example/o/oauth2?x=1" });
      return server("coach")(url, o);
    } });
    s.data.set(SESSION, JSON.stringify({ ...creds("coach"), expires_at: Date.now() + 3600e3 }));
    const st = await s.api.startProvider("google", "link");
    assert.equal(st.ok, true);
    const ask = s.requests.find(q => q.url.includes("/user/identities/authorize"));
    assert.equal(ask.headers.Authorization, "Bearer token-coach");
    assert.match(ask.url, /skip_http_redirect=true/); assert.match(ask.url, /code_challenge_method=s256/);
    assert.equal(s.went[0], "https://accounts.google.example/o/oauth2?x=1");
    assert.equal(s.api.authUrlKind(APP + "?code=l1"), "link");
    const r = await s.api.handleAuthUrl(APP + "?code=l1");
    assert.equal(r.ok, true); assert.equal(r.linked, true);
    assert.equal(JSON.parse(s.data.get(SESSION)).user.id, "coach", "same account, same season");
  });
  await check("a provider account that belongs to another Gridlock account is not linked and does not take over the session", async () => {
    const s = setup({ route: (url, o) => url.includes("/user/identities/authorize") ? response({ url: "https://appleid.example/auth" }) : server("someone-else")(url, o) });
    s.data.set(SESSION, JSON.stringify({ ...creds("coach"), expires_at: Date.now() + 3600e3 }));
    await s.api.startProvider("apple", "link");
    const r = await s.api.handleAuthUrl(APP + "?code=l2");
    assert.equal(r.ok, false); assert.match(r.said, /different Gridlock account/);
    assert.equal(JSON.parse(s.data.get(SESSION)).user.id, "coach");
  });
  await check("signing out before the provider returns links nothing", async () => {
    const s = setup({ route: (url, o) => url.includes("/user/identities/authorize") ? response({ url: "https://accounts.google.example/x" }) : server("coach")(url, o) });
    s.data.set(SESSION, JSON.stringify({ ...creds("coach"), expires_at: Date.now() + 3600e3 }));
    await s.api.startProvider("google", "link");
    s.api.signOut();
    const n = s.requests.length, r = await s.api.handleAuthUrl(APP + "?code=l3");
    assert.equal(r.ok, false); assert.equal(s.requests.filter(q => q.url.includes("pkce")).length, 0, n && "no exchange");
  });
  await check("linking with the server's manual linking switched off says so and leaves nothing pending", async () => {
    const s = setup({ route: url => url.includes("/user/identities/authorize") ? response({ msg: "Manual linking is disabled" }, 404) : response() });
    s.data.set(SESSION, JSON.stringify({ ...creds("coach"), expires_at: Date.now() + 3600e3 }));
    const r = await s.api.startProvider("google", "link");
    assert.equal(r.ok, false); assert.match(r.said, /Linking is not switched on/); assert.equal(s.data.has(PENDING), false);
    assert.equal(s.went.length, 0);
  });
  await check("a native shell opens the provider through its own browser door, never the app's web view", async () => {
    const opened = [], s = setup({ native: true, opener: u => opened.push(u) });
    await s.api.startProvider("google", "signin");
    assert.equal(opened.length, 1); assert.equal(s.went.length, 0);
  });
  await check("email links keep working beside the new callbacks", async () => {
    const s = setup({ route: () => response({ id: "coach", email: "coach@example.test" }) });
    const link = APP + "#access_token=a&refresh_token=b&type=signup&expires_in=3600";
    assert.equal(s.api.authUrlKind(link), "email");
    const r = await s.api.handleAuthUrl(link);
    assert.equal(r.ok, true); assert.equal(r.confirmed, true);
  });
  const { build, authProviders } = require("../scripts/cloud-build");
  const opts = { url: "https://project.example.test", anonKey: "sb_publishable_abcdefghijklmnopqrstuvwxyz", redirectTo: "https://app.example.test/" };
  await check("the build carries provider names only, and only the ones switched on", async () => {
    const out = path.join(__dirname, "../dist/test-social-a");
    try {
      build({ ...opts, outDir: out, providers: "google, apple" });
      const cfg = fs.readFileSync(path.join(out, "gridlock-config.js"), "utf8");
      assert.match(cfg, /"providers":\["google","apple"\]/);
      assert.doesNotMatch(cfg, /secret|client_secret|\.p8|BEGIN PRIVATE KEY/i);
      build({ ...opts, outDir: out });
      assert.doesNotMatch(fs.readFileSync(path.join(out, "gridlock-config.js"), "utf8"), /providers/);
    } finally { fs.rmSync(out, { recursive: true, force: true }); }
  });
  await check("an unknown provider name stops the build instead of shipping a dead button", async () => {
    assert.throws(() => authProviders("google,facebook"), /Unknown sign-in provider/);
    assert.deepEqual(authProviders(" Apple ,google,apple"), ["apple", "google"]);
    assert.deepEqual(authProviders(undefined), []);
  });
  console.log(`\n${passed} social sign-in adapter checks passed.`);
})().catch(e => { console.error(e); process.exitCode = 1; });

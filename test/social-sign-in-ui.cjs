"use strict";
/* What the coach sees of Google and Apple sign-in, with the cloud adapter
   stood in by a mock. The adapter's own checks are test/social-sign-in.cjs. */
const assert = require("node:assert/strict"), path = require("node:path");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let failed = 0, passed = 0;
  // A stand-in adapter: providers as configured, every call recorded.
  const mock = ({ providers, result, kind }) => {
    window.__calls = [];
    window.gridlockCloud = {
      signIn: async () => ({ ok: false, said: "unused" }), signOut: () => { window.__calls.push(["signOut"]); }, pushSeason: async () => ({ ok: true }),
      providers: () => providers, startProvider: async (p, mode) => { window.__calls.push(["start", p, mode]); return { ok: true, opened: true }; },
      isAuthUrl: raw => /[?#](code|error)=/.test(raw), authUrlKind: () => kind || "signin",
      handleAuthUrl: async () => result, getEntitlement: async () => ({ ok: true, user: { id: "u1" }, entitlement: { plan: "free", exp: 0, source: "account" } }),
    };
  };
  async function check(name, fn, opts = {}) {
    const c = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
    if (opts.cloud) await c.addInitScript(mock, opts.cloud);
    if (opts.apple) await c.addInitScript(() => { window.gridlockApple = { signIn: async () => ({ sub: "apple-sub" }) }; });
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url);
      await p.evaluate(s => { localStorage.clear(); if (s) localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, opts.seed || null);
      await p.goto(url + (opts.query || ""));
      await p.waitForFunction(() => typeof S === "object");
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  const root = p => p.evaluate(() => document.getElementById("root").innerText);
  const signedOut = { ...SEED, entered: false, role: "guest", email: "" };
  try {
    await check("the offline build shows no Google or Apple button anywhere", async p => {
      assert.doesNotMatch(await root(p), /Continue with|Link Google|Link Apple/);
      await p.evaluate(() => set({ mode: "login" }));
      assert.doesNotMatch(await root(p), /Continue with/);
    }, { seed: signedOut });
    await check("a cloud build with no provider switched on shows none either", async p => {
      assert.doesNotMatch(await root(p), /Continue with/);
    }, { seed: signedOut, cloud: { providers: [] } });
    await check("switched on, Continue with Google and Apple sit on the welcome page and the sign-in form, 44 px tall", async p => {
      const t = await root(p);
      assert.match(t, /Continue with Google/); assert.match(t, /Continue with Apple/);
      for (const name of ["Continue with Google", "Continue with Apple"]) {
        const b = await p.getByRole("button", { name }).boundingBox();
        assert.ok(b && b.height >= 44, name + " is a 44 px target");
      }
      await p.getByRole("button", { name: "Continue with Google" }).click();
      assert.deepEqual(await p.evaluate(() => __calls), [["start", "google", "signin"]]);
      await p.evaluate(() => set({ mode: "login" }));
      assert.match(await root(p), /Continue with Apple/);
      await p.evaluate(() => set({ mode: "recovery" }));
      assert.doesNotMatch(await root(p), /Continue with/, "not on the new-password screen");
    }, { seed: signedOut, cloud: { providers: ["google", "apple"] } });
    await check("where the phone has its own Apple button, the cloud Apple button is not shown twice", async p => {
      const t = await root(p);
      assert.match(t, /Sign in with Apple/); assert.doesNotMatch(t, /Continue with Apple/); assert.match(t, /Continue with Google/);
    }, { seed: signedOut, cloud: { providers: ["google", "apple"] }, apple: true });
    await check("a confirmed Google sign-in opens the app on the server's account, with no password kept", async p => {
      await p.waitForFunction(() => S.entered === true);
      const acc = await p.evaluate(() => JSON.parse(localStorage.getItem("gridlock.staff.v2")));
      assert.equal(acc.kind, "oauth"); assert.equal(acc.provider, "google"); assert.equal(acc.uid, "u1"); assert.equal(acc.cloud, true);
      assert.ok(!acc.salt && !acc.hash && !acc.pass);
      assert.equal(await p.evaluate(() => S.email), "coach@example.test");
      assert.ok(await p.evaluate(() => S.matches.length) > 0, "the season on the phone is still there");
    }, { seed: signedOut, query: "?code=one-time", cloud: { providers: ["google"], result: { ok: true, oauth: true, provider: "google", user: { id: "u1", email: "coach@example.test" } } } });
    await check("a refused or cancelled callback stays on the welcome page and says why", async p => {
      await p.waitForFunction(() => /cancelled/.test(document.getElementById("root").innerText));
      assert.equal(await p.evaluate(() => S.entered), false);
      assert.equal(await p.evaluate(() => localStorage.getItem("gridlock.staff.v2")), null);
    }, { seed: signedOut, query: "?error=access_denied", cloud: { providers: ["google"], result: { ok: false, said: "Sign-in with Google was cancelled. Nothing changed." } } });
    await check("an Apple account with a hidden email still signs in, named by its provider", async p => {
      await p.waitForFunction(() => S.entered === true);
      assert.equal(await p.evaluate(() => S.email), "Apple account");
    }, { seed: signedOut, query: "?code=x", cloud: { providers: ["apple"], result: { ok: true, oauth: true, provider: "apple", user: { id: "u2", email: "" } } } });
    await check("Nexus offers Link Google to a signed-in coach, and linking keeps him in with his season", async p => {
      await p.waitForFunction(() => /Google is linked/.test(document.getElementById("root").innerText));
      assert.equal(await p.evaluate(() => S.entered), true);
      assert.ok(await p.evaluate(() => S.matches.length) > 0);
      await p.evaluate(() => set({ tab: "more", more: "nexus" }));
      await p.getByRole("button", { name: "Link Google" }).click();
      assert.deepEqual(await p.evaluate(() => __calls.at(-1)), ["start", "google", "link"]);
    }, { seed: SEED, query: "?code=l1", cloud: { providers: ["google"], kind: "link", result: { ok: true, linked: true, provider: "google", user: { id: "u1" } } } });
    await check("STAFF → Nexus → Sign out still asks first, and Cancel keeps him signed in", async p => {
      await p.getByRole("button", { name: /account and sign out/ }).click();
      p.removeAllListeners("dialog"); p.once("dialog", d => d.dismiss());
      await p.getByRole("button", { name: "Sign out", exact: true }).click();
      assert.equal(await p.evaluate(() => S.entered), true);
      p.once("dialog", d => d.accept());
      await p.getByRole("button", { name: "Sign out", exact: true }).click();
      assert.equal(await p.evaluate(() => S.entered), false);
      assert.ok(await p.evaluate(() => S.matches.length) > 0, "the season stays");
    }, { seed: SEED, cloud: { providers: ["google"] } });
    await check("on a tablet the provider buttons are full-width targets too", async p => {
      const b = await p.getByRole("button", { name: "Continue with Google" }).boundingBox();
      assert.ok(b && b.height >= 44 && b.width >= 200);
    }, { seed: signedOut, cloud: { providers: ["google"] }, viewport: { width: 820, height: 1180 } });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} social sign-in screen checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

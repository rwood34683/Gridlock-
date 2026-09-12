#!/usr/bin/env node
"use strict";
// Browser integration of the native contract; this does not compile an iOS app.
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser");

(async () => {
  const browser = await chromium.launch(launchOptions());
  let server;
  let count = 0;
  const check = (condition, message) => { assert(condition, message); count++; console.log("PASS " + message); };
  const url = process.env.APP_URL || await (async () => {
    server = require("../scripts/serve").createServer();
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${server.address().port}/`;
  })();
  try {
    const errors = [];
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.addInitScript(() => {
      Object.hasOwn = undefined; // The API is absent in the minimum supported iOS version.
      if (!localStorage.getItem("gridlock.coach.v2")) localStorage.setItem("gridlock.coach.v2", JSON.stringify({
        savedAt: 1700000000000, entered: true, roster: [{ name: "Saved coach’s player", num: 14, p: "GP", s: "snake" }],
        layoutKey: "tby", walkNotes: "Keep my season"
      }));
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(url);
    check(await page.evaluate(() => !Object.hasOwn && S.roster[0].name === "Saved coach’s player" && S.layoutKey === "tby"), "existing season loads without Object.hasOwn");
    check(await page.evaluate(() => !localStorage.getItem("gridlock.coach.v2.recovery")), "valid season is not misclassified as damaged on older WebKit");
    check(await page.evaluate(() => {
      const parsed = readCopy(copyPayload("all"));
      return !parsed.error && parsed.payload.data.roster[0].num === 14;
    }), "backup parses without Object.hasOwn");
    await page.evaluate(() => {
      const text = copyPayload("all");
      window.set({ tab: "more", more: "nexus", roster: [] });
      document.getElementById("copyIn").value = text;
      window.loadCopy("merge");
    });
    await page.reload();
    check(await page.evaluate(() => S.roster.some(player => player.num === 14)), "backup import survives reload on older WebKit");
    check(await page.evaluate(() => typeof window.gridlockExportFile === "undefined"), "browser keeps its download path without a native file bridge");
    await context.close();

    const native = await browser.newContext({ serviceWorkers: "block" });
    await native.addInitScript(() => {
      window.__fileCalls = { writes: [], shares: [], mode: "success", blobs: 0, legacyShares: 0 };
      const calls = window.__fileCalls;
      window.Capacitor = {
        isNativePlatform: () => true, getPlatform: () => "ios",
        Plugins: {
          Preferences: { get: async () => ({ value: null }), set: async () => {} },
          Filesystem: {
            writeFile: async args => {
              calls.writes.push(args);
              if (calls.mode === "diskFailure") throw new Error("Cannot write cache file");
              return { uri: "file:///private/cache/" + args.path };
            },
            getUri: async args => ({ uri: "file:///private/cache/" + args.path })
          },
          Share: { share: async args => {
            calls.shares.push(args);
            await new Promise(resolve => setTimeout(resolve, 30));
            if (calls.mode === "cancel") throw Object.assign(new Error("Share cancelled"), { name: "AbortError" });
            if (calls.mode === "shareFailure") throw new Error("Share service unavailable");
            return { activityType: "com.apple.UIKit.activity.SaveToFiles" };
          } }
        }
      };
      URL.createObjectURL = () => { calls.blobs++; throw new Error("Native export must not attempt a blob download"); };
    });
    const phone = await native.newPage();
    phone.on("pageerror", error => errors.push(error.message));
    phone.on("dialog", async dialog => { errors.push("Unexpected dialog: " + dialog.message()); await dialog.dismiss(); });
    await phone.goto(url);
    await phone.evaluate(() => {
      window.set({ entered: true, tab: "more", more: "nexus", roster: [{ name: "José \"Snake\"", num: 7, p: "GP", s: "snake" }] });
      window.gridlockShare = () => { window.__fileCalls.legacyShares++; };
    });
    check(await phone.evaluate(() => typeof window.gridlockExportFile === "function"), "native builds expose the file export contract");
    await phone.evaluate(async () => { await Promise.all([window.saveCopy("all"), window.saveCopy("all")]); });
    const first = await phone.evaluate(() => ({ ...window.__fileCalls, status: S.copyStatus }));
    check(first.writes.length === 1 && first.shares.length === 1, "repeated taps export one file while the share sheet is open");
    check(first.writes[0].directory === "CACHE" && /\.json$/.test(first.writes[0].path), "backup is a JSON file in the native cache");
    check(first.writes[0].encoding === "utf8" && JSON.parse(first.writes[0].data).data.roster[0].name === "José \"Snake\"", "UTF-8 JSON backup preserves names and season data");
    check(first.shares[0].files?.length === 1 && first.shares[0].files[0].startsWith("file:///private/cache/"), "share sheet receives an actual local file URI");
    check(!first.shares[0].text && !first.blobs && !first.legacyShares, "native backup is not duplicated as a text share or blob download");
    check(/share sheet/i.test(first.status), "export status describes the handoff without claiming a confirmed save");
    await phone.evaluate(async () => { window.__fileCalls.mode = "cancel"; await window.saveCopy("all"); });
    check(await phone.evaluate(() => /cancelled/i.test(S.copyStatus) && S.roster.length === 1), "cancelled sharing retains the season and permits retry");
    await phone.evaluate(async () => { window.__fileCalls.mode = "diskFailure"; await window.saveCopy("all"); });
    check(await phone.evaluate(() => /could not share/i.test(S.copyStatus) && !readCopy(S.copyText).error), "cache write failure exposes a usable text backup");
    check(await phone.evaluate(() => window.__fileCalls.shares.length === 2), "failed file writes never launch a share sheet");
    await phone.evaluate(async () => { window.__fileCalls.mode = "shareFailure"; await window.saveCopy("all"); });
    check(await phone.evaluate(() => /could not share/i.test(S.copyStatus) && JSON.parse(S.copyText).data.roster[0].num === 7), "share service failure keeps a complete copy available as text");
    await phone.evaluate(async () => { window.__fileCalls.mode = "success"; await window.saveCopy("squad"); });
    check(await phone.evaluate(() => {
      const data = JSON.parse(window.__fileCalls.writes.at(-1).data).data;
      return /share sheet/i.test(S.copyStatus) && data.roster.length === 1 && data.tally === undefined;
    }), "export retries successfully and respects squad scope");
    await native.close();
    check(!errors.length, "no uncaught page errors or unexpected dialogs: " + errors.join("; "));

    /* The Mac preflight, checked from a machine that has no Mac.
     *
     * It reports every problem at once because it used to report the first and
     * stop: a Mac with last year's tools failed Node, then CocoaPods, then the
     * Xcode version, each an hour and a separate install apart. The logic is a
     * pure function over probe readings precisely so it can be tested here. */
    const { evaluate } = require("../scripts/xcode");
    const { describe } = require("../scripts/toolcheck");
    const ok = { node: "22.22.2", selected: "/Applications/Xcode.app/Contents/Developer",
                 xcode: "Xcode 26.0", sdk: "26.0", pods: "1.16.2", npm: "10.8.2" };
    check(evaluate(ok).length === 0, "a Mac with everything installed reports no problems");

    const stale = evaluate({ ...ok, node: "20.18.1", pods: null });
    check(stale.length === 2, "an old Node and a missing CocoaPods are reported together, not one at a time");
    check(stale.every(p => p.what && p.have && p.fix), "every problem names what, what you have, and the command that fixes it");

    const bare = evaluate({ node: "18.0.0", selected: null, xcode: null, sdk: null, pods: null, npm: null });
    check(bare.length >= 5, "a Mac with nothing installed reports all of it at once, and never throws");
    check(!/undefined|null|NaN/.test(describe("x", bare)), "the report never shows undefined, null or NaN to a coach");

    const tools = evaluate({ ...ok, selected: "/Library/Developer/CommandLineTools" });
    check(tools.length === 1 && /full Xcode/.test(tools[0].what),
      "command line tools selected instead of Xcode is caught, and named in plain words");

    const oldXcode = evaluate({ ...ok, xcode: "Xcode 15.4" });
    check(oldXcode.length === 1 && /26/.test(oldXcode[0].what), "an Xcode older than 26 is caught");

    check(/blind/.test(describe("x", stale)) && /brew\.sh/.test(describe("x", stale)),
      "when a fix needs Homebrew, the report explains its invisible password prompt");
    check(!/brew\.sh/.test(describe("x", oldXcode)),
      "and stays quiet about Homebrew when no fix needs it");

    /* Android had no preflight at all, so Gradle said it instead — after a
     * download, in a stack trace, one cause at a time. "Unsupported class file
     * major version" is not a sentence that tells a coach to install JDK 21. */
    const android = require("../scripts/android");
    const androidOk = { mac: true, node: "22.22.2", java: 'openjdk version "21.0.10" 2026-01-20',
                        sdkRoot: "/Users/c/Library/Android/sdk", sdkExists: true,
                        platforms: ["android-36"], platform36: true };
    check(android.evaluate(androidOk).length === 0, "a machine ready for Android reports no problems");

    // The bug this very check was written after: java -version exits 0 and
    // writes the version to stderr, so a stdout-only probe reads a good JDK as
    // empty and calls it unreadable.
    check(android.evaluate({ ...androidOk, java: 'openjdk version "21.0.10"' }).length === 0,
      "a JDK whose version only ever appears on stderr still reads as installed");
    check(android.evaluate({ ...androidOk, java: 'openjdk version "17.0.9"' })
      .some(p => /21/.test(p.what)), "a JDK older than 21 is caught");
    check(android.evaluate({ ...androidOk, java: null }).length === 1, "no java at all is one problem, not a crash");

    const noSdk = android.evaluate({ ...androidOk, sdkRoot: "", sdkExists: false, platforms: [], platform36: false });
    check(noSdk.length === 1 && /ANDROID_HOME/.test(noSdk[0].have), "a missing Android SDK says which variable is unset");
    const oldApi = android.evaluate({ ...androidOk, platforms: ["android-34"], platform36: false });
    check(oldApi.length === 1 && /36/.test(oldApi[0].what), "an Android SDK without platform 36 is caught");

    const bareMachine = android.evaluate({ mac: false, node: "18.0.0", java: null, sdkRoot: "", sdkExists: false, platforms: [], platform36: false });
    check(bareMachine.length === 3, "a machine with nothing reports all three at once");
    check(!/brew /.test(describe("x", bareMachine)), "and is not told to use Homebrew when it is not a Mac");
    console.log(`Platform contract: ${count}/${count} checks passed (plugin stubs, not an iOS binary).`);
  } finally {
    await browser.close();
    if (server) { server.closeAllConnections(); server.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

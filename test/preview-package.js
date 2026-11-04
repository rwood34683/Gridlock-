#!/usr/bin/env node
"use strict";
/* The offline preview, built and used the way a visitor uses it.
 *
 * Builds the preview with scripts/package-preview.js into dist/preview-test
 * and checks:
 *   - nothing from the cloud build, no keys and no admin page is bundled;
 *   - the build reproduces the recorded one (docs/preview-manifest.json)
 *     whenever its sources and packager are unchanged;
 *   - no live-domain or support-email reference in any bundled page;
 *   - Save a copy and Send this sheet never try to download, show the copy as
 *     usable text, say that no file was saved, and do not count a backup.
 * The live app is never contacted: its address is answered locally.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const cp = require("node:child_process");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist", "preview-test");
const LIVE = "https://app.gridlockpb.com/";
const sha = b => crypto.createHash("sha256").update(b).digest("hex");

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log("PASS " + name); }
  catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e && e.message || e).split("\n").join("\n     ")); }
}

(async () => {
  cp.execFileSync(process.execPath, [path.join(ROOT, "scripts", "package-preview.js"), "--out", "dist/preview-test", "--allow-dirty"], { cwd: ROOT, stdio: "pipe" });
  const built = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
  const artifact = fs.readFileSync(path.join(OUT, "artifact.html"));
  const appFile = path.join(OUT, "site", "app.html");

  await test("the preview bundles no cloud configuration, key or admin page", async () => {
    for (const bad of ["gridlock-config", "supabase", "sb_publishable", "service_role", "gridlock-admin", "admin/index"])
      assert.ok(!artifact.includes(bad), "artifact contains " + bad);
    function inspect(dir) {
      for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
        const file=path.join(dir,entry.name);
        if(entry.isDirectory()) inspect(file);
        else assert.ok(!fs.readFileSync(file).includes("gridlockpb.com"),file+" has no live-domain reference");
      }
    }
    inspect(path.join(OUT,"site"));
    assert.ok(!/GRIDLOCK_CLOUD\s*=/.test(artifact.toString()),"no injected cloud configuration");
  });

  await test("every page has an offline notice without live-domain references; the app handles exports", async () => {
    for (const f of ["index.html", "support.html", "privacy.html", "app.html"]) {
      const h = fs.readFileSync(path.join(OUT, "site", f), "utf8");
      assert.ok(h.includes('class="pv-note"'), f + " has the notice");
      assert.ok(!/gridlockpb\.com|class="pv-link"|GRIDLOCK_CLOUD\s*=/.test(h), f + " has no live domain, link or configuration");
    }
    assert.ok(fs.readFileSync(appFile, "utf8").includes('id="pv-export"'), "app has the export handling");
  });

  await test("the manifest names its sources and matches the files it describes", async () => {
    assert.match(built.sourceCommit, /^[0-9a-f]{40}$/);
    assert.match(built.sourceTrees.web, /^[0-9a-f]{40}$/);
    assert.equal(built.outputs["artifact.html"], sha(artifact));
    for (const f of ["index.html", "support.html", "privacy.html", "app.html"])
      assert.equal(built.outputs["site/" + f], sha(fs.readFileSync(path.join(OUT, "site", f))), f);
  });

  await test("an unchanged source rebuilds the recorded preview byte for byte", async () => {
    const rec = JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "preview-manifest.json"), "utf8"));
    assert.equal(rec.format, "gridlock-preview-manifest");
    assert.match(rec.sourceCommit, /^[0-9a-f]{40}$/);
    assert.equal(rec.dirtyTracked, false, "the recorded build came from a clean checkout");
    assert.ok(rec.published && rec.published.url && rec.published.version, "the recorded build names the published version");
    const same = JSON.stringify(rec.inputs) === JSON.stringify(built.inputs) && rec.script === built.script;
    if (!same) { console.log("     note: sources or packager changed since the recorded build; re-record docs/preview-manifest.json when publishing"); return; }
    assert.equal(built.outputs["artifact.html"], rec.outputs["artifact.html"], "same sources and packager, same file");
  });

  const browser = await chromium.launch(launchOptions());
  const context = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    // The live app is answered locally: nothing leaves the machine.
    await ctx.route(LIVE + "**", r => r.fulfill({ status: 200, contentType: "text/html", body: "<title>live</title>live" }));
    return ctx;
  };

  await test("the bundled landing page opens only the offline app", async () => {
    const ctx = await context(), p = await ctx.newPage();
    await p.goto("file://" + path.join(OUT,"artifact.html"));
    await p.waitForFunction(() => document.getElementById("view")?.contentDocument?.querySelector('a.button[href="app.html"]'));
    const frame=p.frames().find(f=>f!==p.mainFrame());
    await frame.click('a.button[href="app.html"]');
    await p.waitForFunction(() => !!document.getElementById("view")?.contentDocument?.getElementById("pv-export"));
    assert.ok(!/gridlockpb\.com/.test(await p.locator("#view").getAttribute("srcdoc") || ""));
    await ctx.close();
  });

  await test("Save a copy shows the season as copyable text, says no file was saved, and counts no backup", async () => {
    const ctx = await context(), p = await ctx.newPage();
    const downloads = []; p.on("download", d => downloads.push(d.suggestedFilename()));
    await p.goto("file://" + appFile);
    assert.match(await p.locator(".pv-note").textContent(), /Downloads are switched off here too: Save a copy and Send this sheet show the text/);
    for (const label of ["Save everything", "Just the squad"]) {
      await p.evaluate(() => { S.copiedAt = null; S.copyText = ""; window.set({ entered: true, role: "staff", tab: "more", more: "nexus" }); });
      await p.getByRole("button", { name: label, exact: true }).click();
      await p.waitForFunction(() => !!S.copyText);
      const box = p.locator("textarea[readonly]").first();
      assert.equal(await box.isVisible(), true, label + ": the text is on screen");
      const copy = JSON.parse(await box.inputValue());
      assert.equal(copy.format, "gridlock.coach.copy", label + ": the text is a usable copy");
      const said = await p.evaluate(() => document.getElementById("root").textContent);
      assert.match(said, /no file was saved and nothing is counted as a backup/, label);
      assert.equal(await p.evaluate(() => S.copiedAt || null), null, label + ": no backup recorded");
    }
    assert.deepEqual(downloads, [], "nothing was downloaded");
    await ctx.close();
  });

  const sheetSetup = () => {
    S.copiedAt = null; S.entered = true; S.role = "staff"; S.tab = "more"; S.more = "matches";
    const m = S.matches.find(x => x.id === S.matchId); m.vs = "Preview Test";
    S.results = [{ m: S.matchId, pt: 1, won: "us" }]; save(S);
  };
  await test("Send this sheet shows the sheet as text when the clipboard is blocked, and says no file was saved", async () => {
    const ctx = await context(), p = await ctx.newPage();
    const downloads = []; p.on("download", d => downloads.push(d.suggestedFilename()));
    await p.goto("file://" + appFile);
    await p.evaluate(async setup => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) }, configurable: true });
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      new Function(setup)();
      await window.sendSheet();
    }, "(" + sheetSetup.toString() + ")()");
    const box = p.locator("#handoff");
    await box.waitFor({ state: "visible" });
    assert.match(await box.textContent(), /Downloads are switched off in this preview, so no file was saved or sent\. The text is below\./);
    const copy = JSON.parse(await p.locator("#handoff-text").inputValue());
    assert.equal(copy.scope, "sheet", "the text is a usable sheet copy");
    assert.equal(await p.evaluate(() => S.copiedAt || null), null, "no backup recorded");
    assert.deepEqual(downloads, []);
    await ctx.close();
  });

  await test("Send this sheet copied to the clipboard says no file was saved", async () => {
    const ctx = await context(), p = await ctx.newPage();
    const downloads = []; p.on("download", d => downloads.push(d.suggestedFilename()));
    await p.goto("file://" + appFile);
    const r = await p.evaluate(async setup => {
      let copied = "";
      Object.defineProperty(navigator, "clipboard", { value: { writeText: t => { copied = t; return Promise.resolve(); } }, configurable: true });
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      new Function(setup)();
      await window.sendSheet();
      await new Promise(res => setTimeout(res, 200));
      return { copied, flash: S.flash, copiedAt: S.copiedAt || null };
    }, "(" + sheetSetup.toString() + ")()");
    assert.equal(JSON.parse(r.copied).scope, "sheet", "the clipboard holds a usable sheet copy");
    assert.match(r.flash, /Downloads are switched off in this preview, so no file was saved: the sheet was copied to your clipboard instead/);
    assert.equal(r.copiedAt, null);
    assert.deepEqual(downloads, []);
    await ctx.close();
  });

  await browser.close();
  console.log(`\nPreview package: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });

#!/usr/bin/env node
"use strict";
/* Two builds, one source: the Gridlock default and the Grind X variant.
 *
 * What is pinned here: the default build is the source byte for byte; the
 * variant carries the other name and the other deep link and nothing else;
 * every lowercase-gridlock namespace token (storage keys, the copy format, the
 * service-worker cache, window.gridlock*) is untouched in both; the native
 * switch is a clean round trip; and the tool refuses — in one sentence, writing
 * nothing — when a build would break any of that. The variant is also loaded
 * in a browser and read off #root, never document.body.textContent. */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");
const { createServer } = require("../scripts/serve.js");
const brand = require("../scripts/brand.js");

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "web");
let passed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log("  PASS  " + name); }
  else { console.log("  FAIL  " + name + (extra ? "  — " + extra : "")); process.exitCode = 1; }
}
const sha = buf => createHash("sha256").update(buf).digest("hex");
function snapshot(dirs) {
  const out = new Map();
  (function visit(abs) {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const f = path.join(abs, e.name);
      if (e.isDirectory()) { if (!/^(Pods|DerivedData|build|\.gradle)$/.test(e.name)) visit(f); }
      else out.set(path.relative(ROOT, f), sha(fs.readFileSync(f)));
    }
  })(dirs);
  return out;
}
const same = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
const node = (...args) => execFileSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const OTHER = /\bGridlock\b(?!VoiceParser)/;

(async () => {
  const brands = brand.loadBrands();
  const gridlock = brand.brandOf("gridlock", brands), grindx = brand.brandOf("grindx", brands);

  console.log("brands.json");
  check("two brands, Gridlock the default", brands.default === "gridlock" && Object.keys(brands.brands).length === 2);
  check("separate store identities", gridlock.appId !== grindx.appId && gridlock.scheme !== grindx.scheme && grindx.appId === "com.upra.grindx.coach" && grindx.scheme === "grindx");
  check("an unknown brand is refused by name", (() => { try { brand.brandOf("nope", brands); return false; } catch (e) { return /no brand called "nope"/.test(e.message); } })());

  console.log("the transform");
  const t = brand.transformText('Gridlock-backup.json GridlockVoiceParser gridlock://class/X window.gridlockKeep "gridlock.coach.v2"', gridlock, grindx);
  check("renames the display word and the deep link only", t === 'Grind X-backup.json GridlockVoiceParser grindx://class/X window.gridlockKeep "gridlock.coach.v2"', t);
  const identity = brand.stage(gridlock, brands);
  check("the default brand stages as the source, byte for byte", [...identity.web].every(([rel, buf]) => buf.equals(fs.readFileSync(path.join(WEB, rel)))) && !brand.selfCheck(identity).length);
  const staged = brand.stage(grindx, brands);
  check("the variant passes its own check", !brand.selfCheck(staged).length, brand.selfCheck(staged)[0]);
  {
    const broken = { ...staged, web: new Map(staged.web) };
    broken.web.set("index.html", Buffer.from(staged.web.get("index.html").toString("utf8").replace("gridlock.coach.v2", "grindx.coach.v2")));
    const problems = brand.selfCheck(broken);
    check("a moved storage key is refused and named", problems.some(p => p.includes("gridlock.coach.v2")), problems.join(" | "));
  }
  {
    const broken = { ...staged, web: new Map(staged.web) };
    broken.web.set("native.js", Buffer.from(staged.web.get("native.js").toString("utf8").replace("Grind X", "Gridlock")));
    check("a stray default name in the variant is refused", brand.selfCheck(broken).some(p => /still says "Gridlock"/.test(p)));
  }
  for (const token of brand.TECHNICAL) {
    const src = fs.readFileSync(path.join(WEB, "index.html"), "utf8"), out = staged.web.get("index.html").toString("utf8");
    if (src.includes(token)) check(`namespace token ${token} survives the variant`, src.split(token).length === out.split(token).length);
  }

  console.log("dry runs write nothing");
  const before = snapshot(ROOT + "/ios"); const beforeA = snapshot(ROOT + "/android"); const cfg = sha(fs.readFileSync(path.join(ROOT, "capacitor.config.json")));
  const dryN = brand.native("grindx", { dry: true, quiet: true });
  const dryB = brand.build("grindx", { dry: true, quiet: true });
  const dryNPaths = dryN.files.map(file => file.replaceAll("\\", "/"));
  check("a native dry run lists the identity files and the shells", dryN.dry && dryNPaths.includes("ios/App/App.xcodeproj/project.pbxproj") && dryNPaths.includes("android/app/build.gradle") && dryNPaths.some(f => f.endsWith("public/index.html")));
  check("a build dry run lists what would differ", dryB.dry && dryB.changed.includes("web/index.html") && dryB.changed.includes("web/manifest.webmanifest"));
  check("nothing on disk moved", same(before, snapshot(ROOT + "/ios")) && same(beforeA, snapshot(ROOT + "/android")) && cfg === sha(fs.readFileSync(path.join(ROOT, "capacitor.config.json"))));

  console.log("the contact");
  const contactFile = path.join(ROOT, grindx.contact);
  const contactBefore = fs.readFileSync(contactFile, "utf8");
  check("a bad support email is refused in one sentence", (() => { try { brand.contact("grindx", ["--email", "nope"]); return false; } catch (e) { return e.message === "Enter a valid support email address."; } })());
  check("a bad domain is refused in one sentence", (() => { try { brand.contact("grindx", ["--domain", "https://x.com/"]); return false; } catch (e) { return /hostname/.test(e.message); } })());
  const dryC = brand.contact("grindx", ["--email", "help@example.com", "--domain", "Example.com"], { dry: true });
  check("a contact dry run validates and lowercases without writing", dryC.dry && dryC.next.email === "help@example.com" && dryC.next.domain === "example.com" && fs.readFileSync(contactFile, "utf8") === contactBefore);

  console.log("the native switch");
  const shellsBefore = new Map([...snapshot(ROOT + "/ios"), ...snapshot(ROOT + "/android")]);
  let switched = false;
  try {
    const r = brand.native("grindx");
    switched = true;
    check("switching rewrites the identity files and both shells", r.from === "gridlock" && r.to === "grindx" && r.files.length >= 20);
    check("the shells now agree they hold Grind X", brand.nativeState(brands).key === "grindx");
    const pbx = fs.readFileSync(path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
    const gradle = fs.readFileSync(path.join(ROOT, "android/app/build.gradle"), "utf8");
    const plist = fs.readFileSync(path.join(ROOT, "ios/App/App/Info.plist"), "utf8");
    check("iOS bundle id is the Grind X one throughout", !pbx.includes("com.upra.gridlock.coach") && pbx.split("PRODUCT_BUNDLE_IDENTIFIER = com.upra.grindx.coach;").length === 3);
    check("Android applicationId moved and namespace stayed", gradle.includes('applicationId "com.upra.grindx.coach"') && gradle.includes('namespace = "com.upra.gridlock.coach"'));
    check("iOS registers grindx:// and names the app Grind X Coach", plist.includes("<array><string>grindx</string></array>") && /<key>CFBundleDisplayName<\/key>\s*<string>Grind X Coach<\/string>/.test(plist));
    check("the shell web build is the variant", brand.markerOf(fs.readFileSync(path.join(ROOT, "ios/App/App/public/index.html"), "utf8")) === "grindx" && fs.readFileSync(path.join(ROOT, "android/app/src/main/assets/public/native.js")).equals(brand.expected("native.js", "grindx", brands)));
    // native-check reads the config copies that `cap sync` generates into the
    // shells; a plain checkout (CI) has none, so it can only run on a synced tree.
    if (fs.existsSync(path.join(ROOT, "ios/App/App/capacitor.config.json"))) {
      const nc = node("scripts/native-check.js");
      check("native-check passes with the shells at Grind X", /checks passed/.test(nc) && /\(grindx\)/.test(nc), nc.split("\n").slice(-3).join(" | "));
    } else console.log("  SKIP  native-check passes with the shells at Grind X  — needs a synced tree (npm run sync); not run on a plain checkout");
    const sc = node("scripts/store-check.js");
    check("store-check reads the shells as in step with Grind X", /iOS shell carries this web build\s+in step \(grindx\)/.test(sc) && /Android shell carries this web build\s+in step \(grindx\)/.test(sc));
    check("checking Grind X now reports the phones hold it", brand.check("grindx").every(r => r.pass));
  } catch (e) { check("the native switch ran", false, e.message); }
  finally {
    if (switched) brand.native("gridlock");
  }
  const shellsAfter = new Map([...snapshot(ROOT + "/ios"), ...snapshot(ROOT + "/android")]);
  check("switching back is a byte-identical round trip", same(shellsBefore, shellsAfter) && brand.nativeState(brands).key === "gridlock",
    [...shellsBefore].filter(([k, v]) => shellsAfter.get(k) !== v).map(([k]) => k).slice(0, 3).join(", "));

  console.log("the built variant");
  const built = brand.build("grindx");
  const out = built.out;
  const rd = rel => fs.readFileSync(path.join(out, rel), "utf8");
  check("builds to dist/brand/grindx", out.endsWith(path.join("dist", "brand", "grindx")) && fs.existsSync(path.join(out, "app/index.html")) && fs.existsSync(path.join(out, "GrindX.html")));
  check("the built app never shows the default name", !OTHER.test(rd("app/index.html")) && !OTHER.test(rd("app/native.js")) && !OTHER.test(rd("app/manifest.webmanifest")) && !OTHER.test(rd("GrindX.html")));
  check("the built site never shows the default name", !OTHER.test(rd("index.html")) && !OTHER.test(rd("support.html")) && !OTHER.test(rd("privacy.html")));
  check("the deep link is grindx://", rd("app/index.html").includes('"grindx://class/"') && !rd("app/index.html").includes("gridlock://"));
  check("the marker names the brand", brand.markerOf(rd("app/index.html")) === "grindx");
  check("the service-worker cache namespace is untouched", /const VERSION = "gridlock-[0-9a-f]{16}";/.test(rd("app/sw.js")) && rd("app/sw.js").includes('"gridlock:"'));
  const cc = JSON.parse(rd("capacitor.config.json"));
  check("the store identity travels with the build", cc.appId === "com.upra.grindx.coach" && cc.appName === "Grind X Coach" && JSON.parse(rd("brand.json")).key === "grindx");
  check("the support block is stamped from the brand's own contact", rd("support.html").includes("copy of Grind X.") && !fs.existsSync(path.join(out, "CNAME")));
  check("the manifest names the brand", JSON.parse(rd("app/manifest.webmanifest")).short_name === "Grind X");
  check("the default build is left alone", fs.readFileSync(path.join(WEB, "index.html"), "utf8").includes('<meta name="brand" content="gridlock"/>'));

  console.log("in a browser");
  const browser = await chromium.launch(launchOptions());
  const server = createServer({ root: path.join(out, "app") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    const errors = [];
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(url); await page.waitForTimeout(400);
    const root = await page.evaluate(() => document.getElementById("root").innerText);
    check("the Grind X promo reads Grind X", /Grind X/.test(root) && !OTHER.test(root));
    check("the document is titled for the brand", await page.title() === "Grind X System · Coach Edition");
    const link = await page.evaluate(() => joinLink("GL-7K2M"));
    check("a class join link uses the brand's own scheme", link === "grindx://class/GL-7K2M", link);
    const qr = await page.evaluate(() => { const m = qrMatrix(joinLink("GL-7K2M")); return Array.isArray(m) ? m.length : -1; });
    check("the class QR still encodes (22 bytes fit version 2)", qr === 25, String(qr));
    check("storage keys are the shared ones", await page.evaluate(() => typeof STORE_KEY === "string" && STORE_KEY === "gridlock.coach.v2" && COPY_FORMAT === "gridlock.coach.copy"));
    check("no page errors in the variant", errors.length === 0, errors.join(" | "));
    if (process.env.APP_URL) {
      const d = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await d.goto(process.env.APP_URL); await d.waitForTimeout(400);
      const droot = await d.evaluate(() => document.getElementById("root").innerText);
      check("the default promo reads Gridlock", /\bGridlock\b/.test(droot) && !/Grind X/.test(droot));
      check("the default class link is gridlock://", await d.evaluate(() => joinLink("GL-7K2M")) === "gridlock://class/GL-7K2M");
    }
  } finally { await browser.close(); server.close(); }

  console.log("the command");
  const status = node("scripts/brand.js", "status");
  check("status names both brands and the next step", /gridlock/.test(status) && /grindx/.test(status) && /Next:/.test(status) && /Grind X has no support contact yet/.test(status));
  const noArgs = node("scripts/brand.js");
  check("with no terminal it prints the usage instead of a wizard", /npm run brand build/.test(noArgs) && /gridlock/.test(noArgs));
  const bad = (() => { try { node("scripts/brand.js", "build", "nope"); return ""; } catch (e) { return String(e.stderr); } })();
  check("a wrong brand name is one sentence on stderr", /There is no brand called "nope"/.test(bad), bad);

  console.log(`\nBrands: ${passed} checks passed.`);
})().catch(e => { console.error(e); process.exitCode = 1; });

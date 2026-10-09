#!/usr/bin/env node
"use strict";
/* The builds, one source: Gridlock by default, and each variant in brand/brands.json.
 *
 *   npm run brand                        the guided version: pick a brand, pick a job
 *   npm run brand status
 *   npm run brand build <brand> | --all  a branded site + app in dist/brand/<brand>/
 *   npm run brand contact <brand> --email … --domain … [--appstore … --play … --sha256 …]
 *   npm run brand native <brand>         point the committed ios/ and android/ shells at a brand
 *   npm run brand check <brand>
 *   flags: --dry-run (change nothing, say what would change)  --yes (skip the confirmations)
 *
 * The committed source is the default brand. A variant is produced by a strict
 * substitution table, never by editing web/:
 *
 *   display word   \bGridlock\b            → the brand's short name     (what a coach reads)
 *   deep link      gridlock://             → <scheme>://                (the class join link)
 *   store identity appId / appName          in capacitor.config.json and the native shells
 *   support block  re-stamped from the brand's own contact file
 *
 * Everything lowercase-gridlock in the code — window.gridlock*, the storage
 * keys, the copy format, the service-worker cache — is a namespace, not a
 * brand, and is byte-for-byte identical in every build. The build refuses to
 * write anything if a single one of those tokens moved. docs/BRANDS.md has the
 * long version. */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "web");
const SITE = path.join(ROOT, "site");
const DIST = path.join(ROOT, "dist", "brand");
const BRANDS = path.join(ROOT, "brand", "brands.json");
const contactLib = require("./contact");

// Extensions the transform reads as text. Anything else is copied verbatim.
const TEXT = new Set([".html", ".js", ".json", ".webmanifest", ".css", ".svg", ".txt", ".md", ".xml"]);
// The namespace. Each token's count must be identical in source and output.
const TECHNICAL = ["gridlock.coach.v2", "gridlock.staff.v2", "gridlock.coach.maps", "gridlock.coach.copy", "gridlock-shell", "\"gridlock:\"", "window.gridlockKeep", "GridlockVoiceParser", "gridlock-exports/", "gridlock-app-link"];
const MARKER = /<meta name="brand" content="([a-z][a-z0-9]*)"\s*\/?>/;

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const count = (text, token) => text.split(token).length - 1;

/* ---------------------------------------------------------------- brands */

function loadBrands() {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(BRANDS, "utf8")); }
  catch (e) { throw new Error(`brand/brands.json is not readable: ${e.message}`); }
  if (!raw.brands || typeof raw.brands !== "object" || !Object.keys(raw.brands).length) throw new Error("brand/brands.json names no brands.");
  if (!raw.brands[raw.default]) throw new Error(`brand/brands.json default "${raw.default}" is not one of its brands.`);
  const seen = { appId: new Map(), scheme: new Map(), short: new Map() };
  for (const [key, b] of Object.entries(raw.brands)) {
    if (!/^[a-z][a-z0-9]*$/.test(key)) throw new Error(`Brand key "${key}" must be lowercase letters and digits.`);
    for (const f of ["short", "name", "appId", "scheme", "contact"]) if (typeof b[f] !== "string" || !b[f].trim()) throw new Error(`Brand "${key}" is missing ${f}.`);
    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(b.appId)) throw new Error(`Brand "${key}" appId "${b.appId}" must look like com.company.app.`);
    if (!/^[a-z][a-z0-9]*$/.test(b.scheme)) throw new Error(`Brand "${key}" scheme "${b.scheme}" must be lowercase letters and digits.`);
    if (!b.contact.startsWith("site/") || b.contact.includes("..")) throw new Error(`Brand "${key}" contact file must live under site/.`);
    for (const f of Object.keys(seen)) {
      if (seen[f].has(b[f])) throw new Error(`Brands "${seen[f].get(b[f])}" and "${key}" share the same ${f} "${b[f]}".`);
      seen[f].set(b[f], key);
    }
    b.key = key;
  }
  return raw;
}
function brandOf(key, brands = loadBrands()) {
  if (!key) throw new Error(`Say which brand: ${Object.keys(brands.brands).join(", ")}.`);
  const b = brands.brands[key];
  if (!b) throw new Error(`There is no brand called "${key}". The brands are: ${Object.keys(brands.brands).join(", ")}.`);
  return b;
}
const defaultBrand = (brands = loadBrands()) => brands.brands[brands.default];
function contactOf(brand) {
  const file = path.join(ROOT, brand.contact);
  try { return contactLib.readContact(file); }
  catch (e) { throw new Error(`${brand.contact} is not readable: ${e.message}`); }
}
function byAppId(appId, brands = loadBrands()) {
  return Object.values(brands.brands).find(b => b.appId === appId) || null;
}

/* ------------------------------------------------------------- transform */

// The substitution table, from the default brand to `to`. Identity when to is the default.
// The company's legal name — Gridlock PB LLC — is a name and not a brand: it
// owns every build, so a variant never swaps the word inside it. It is
// written once as <span data-company>…</span> and both the swap and the
// stray-name check pass over it.
const COMPANY = /<span data-company>[^<]*<\/span>/g;
function transformText(text, from, to) {
  if (from.key === to.key) return text;
  const held = [];
  text = text.replace(COMPANY, m => { held.push(m); return `\u0000COMPANY${held.length - 1}\u0000`; });
  return swapText(text, from, to).replace(/\u0000COMPANY(\d+)\u0000/g, (_, i) => held[+i]);
}
function swapText(text, from, to) {
  return text
    .replace(new RegExp(`\\b${esc(from.short)}\\b(?!VoiceParser)`, "g"), to.short)
    .replace(new RegExp(`${esc(from.scheme)}://`, "g"), `${to.scheme}://`)
    // The default brand's logo is a picture with its name painted in, so no
    // word swap can rebrand it: in another build every <img data-logo> becomes
    // that build's name as text, and the picture itself is never shipped.
    .replace(/<img\b[^>]*\bdata-logo\b[^>]*>/g, tag => {
      const alt = (/\balt="([^"]*)"/.exec(tag) || [, to.short])[1];
      return `<span class="brand-logo brand-logo--word">${alt}</span>`;
    });
}
// Files that belong to the default brand alone: its logo. Another build leaves
// them out, and every comparison of a build against the source skips them.
const BRAND_ONLY = /(^|\/)logo-[a-z0-9]+\.(?:jpg|png|webp|svg)$/;
function ships(rel, toKey, brands = loadBrands()) {
  return toKey === defaultBrand(brands).key || !BRAND_ONLY.test(rel);
}
function transformIndex(text, from, to) {
  const m = MARKER.exec(text);
  if (!m) throw new Error("web/index.html carries no <meta name=\"brand\"> marker, so the build cannot tell which brand it is.");
  if (m[1] !== from.key) throw new Error(`web/index.html is marked "${m[1]}" but the default brand is "${from.key}"; refusing to brand a file twice.`);
  return transformText(text, from, to).replace(MARKER, `<meta name="brand" content="${to.key}"/>`);
}
// `marked` is true for the app's own index.html, the one file that carries the brand marker.
function transformFile(rel, buf, from, to, marked = false) {
  if (!TEXT.has(path.extname(rel))) return buf;
  const text = buf.toString("utf8");
  const out = marked ? transformIndex(text, from, to) : transformText(text, from, to);
  return Buffer.from(out, "utf8");
}
function walk(dir, skip = () => false) {
  const out = [];
  (function visit(rel) {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (skip(r)) continue;
      if (e.isSymbolicLink()) throw new Error(`Build input cannot contain symbolic links: ${r}`);
      if (e.isDirectory()) visit(r); else out.push(r);
    }
  })("");
  return out;
}
// What a web file should look like once branded `to`. Checks compare shells against this.
function expected(rel, toKey, brands = loadBrands()) {
  const from = defaultBrand(brands), to = brandOf(toKey, brands);
  return transformFile(rel, fs.readFileSync(path.join(WEB, rel)), from, to, rel === "index.html");
}
function markerOf(text) {
  const m = MARKER.exec(String(text));
  return m ? m[1] : null;
}

// Stage both trees in memory. Nothing touches the disk here.
function stage(to, brands = loadBrands()) {
  const from = defaultBrand(brands);
  const contact = contactOf(to);
  const web = new Map();
  for (const rel of walk(WEB)) if (ships(rel, to.key, brands)) web.set(rel, transformFile(rel, fs.readFileSync(path.join(WEB, rel)), from, to, rel === "index.html"));
  const site = new Map();
  const skip = r => r === "README.md" || r === "build" || r.startsWith("build/") || r === "app.html" || r === "CNAME" || /^contact(\.[a-z0-9]+)?\.json$/.test(r) || r === ".well-known/assetlinks.json";
  for (const rel of walk(SITE, skip)) if (ships(rel, to.key, brands)) site.set(rel, transformFile(rel, fs.readFileSync(path.join(SITE, rel)), from, to));
  for (const rel of ["support.html", "privacy.html"]) if (site.has(rel)) site.set(rel, Buffer.from(contactLib.stampSupport(site.get(rel).toString("utf8"), contact, to.short)));
  if (site.has("index.html")) site.set("index.html", Buffer.from(contactLib.stampIndex(site.get("index.html").toString("utf8"), contact)));
  if (contact.domain) site.set("CNAME", Buffer.from(contact.domain + "\n"));
  site.set(".well-known/assetlinks.json", Buffer.from(contactLib.assetLinks(contact, to.appId)));
  site.set("contact.json", Buffer.from(JSON.stringify(contact, null, 2) + "\n"));
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, "capacitor.config.json"), "utf8"));
  config.appId = to.appId; config.appName = to.name;
  // Every other build's display name, so a build can be refused for saying one.
  const others = Object.values(brands.brands).filter(b => b.key !== to.key && b.key !== from.key);
  return { from, to, contact, web, site, config, others };
}

// The refusal. Returns a list of sentences; an empty list is a pass.
function selfCheck(staged) {
  const { from, to, web, site } = staged;
  const problems = [];
  const other = new RegExp(`\\b${esc(from.short)}\\b(?!VoiceParser)`);
  for (const [tree, map] of [["web", web], ["site", site]]) {
    for (const [rel, buf] of map) {
      if (!TEXT.has(path.extname(rel))) continue;
      const out = buf.toString("utf8"), named = out.replace(COMPANY, "");
      const srcFile = path.join(tree === "web" ? WEB : SITE, rel);
      const src = fs.existsSync(srcFile) ? fs.readFileSync(srcFile, "utf8") : null;
      // No build carries another build's name: not the default's in a variant,
      // and no variant's in any build, the source included.
      for (const b of staged.others || []) if (new RegExp(`\\b${esc(b.short)}\\b`).test(named)) problems.push(`${tree}/${rel} says "${b.short}", which is another build's name.`);
      if (from.key !== to.key) {
        if (other.test(named)) problems.push(`${tree}/${rel} still says "${from.short}".`);
        if (/\bdata-logo\b/.test(out)) problems.push(`${tree}/${rel} still shows ${from.short}'s logo.`);
        if (from.scheme !== to.scheme && out.includes(`${from.scheme}://`)) problems.push(`${tree}/${rel} still links ${from.scheme}://.`);
      }
      if (src !== null) for (const token of TECHNICAL) {
        const a = count(src, token), b = count(out, token);
        if (a !== b) problems.push(`${tree}/${rel}: the namespace token ${token} appears ${a} times in the source and ${b} in the build.`);
      }
      if (from.key === to.key && src !== null && src !== out) problems.push(`${tree}/${rel} changed while building the default brand, which must be the source byte for byte.`);
    }
  }
  const index = web.get("index.html")?.toString("utf8") || "";
  if (!index.includes(to.short)) problems.push(`web/index.html never shows the name "${to.short}".`);
  if (markerOf(index) !== to.key) problems.push(`web/index.html is not marked "${to.key}".`);
  return problems;
}

/* ----------------------------------------------------------------- build */

function build(key, { dry = false, quiet = false } = {}) {
  const brands = loadBrands();
  const to = brandOf(key, brands);
  const staged = stage(to, brands);
  const problems = selfCheck(staged);
  if (problems.length) throw new Error(`Refusing to build ${to.short}: ${problems[0]}${problems.length > 1 ? ` (and ${problems.length - 1} more)` : ""}`);
  const out = path.join(DIST, to.key);
  const changed = [...staged.web].filter(([rel, buf]) => !buf.equals(fs.readFileSync(path.join(WEB, rel)))).map(([rel]) => `web/${rel}`)
    .concat([...staged.site].filter(([rel, buf]) => { const f = path.join(SITE, rel); return !fs.existsSync(f) || !buf.equals(fs.readFileSync(f)); }).map(([rel]) => `site/${rel}`));
  if (dry) {
    if (!quiet) {
      console.log(`Dry run — ${to.short} (${to.appId}, ${to.scheme}://) would build to ${path.relative(ROOT, out)}/ and change ${changed.length} files:`);
      for (const c of changed) console.log(`  ${c}`);
      console.log("Nothing was written.");
    }
    return { out, changed, dry: true };
  }
  // Stage on disk, bundle, then hand the trees to the ordinary static build.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gridlock-brand-"));
  try {
    const sw = path.join(tmp, "web"), ss = path.join(tmp, "site");
    for (const [rel, buf] of staged.web) { fs.mkdirSync(path.dirname(path.join(sw, rel)), { recursive: true }); fs.writeFileSync(path.join(sw, rel), buf); }
    for (const [rel, buf] of staged.site) { fs.mkdirSync(path.dirname(path.join(ss, rel)), { recursive: true }); fs.writeFileSync(path.join(ss, rel), buf); }
    fs.writeFileSync(path.join(ss, "app.html"), require("./build-app-artifact").bundle(sw));
    const manifest = require("./build").build({ web: sw, site: ss, out, appName: to.name, short: to.short, brand: to.key });
    fs.writeFileSync(path.join(out, "capacitor.config.json"), JSON.stringify(staged.config, null, 2) + "\n");
    fs.writeFileSync(path.join(out, "brand.json"), JSON.stringify({ key: to.key, short: to.short, name: to.name, appId: to.appId, scheme: to.scheme, contact: staged.contact, builtAt: new Date().toISOString() }, null, 2) + "\n");
    return { out, changed, manifest };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/* ---------------------------------------------------------------- native */

const SHELLS = {
  config: "capacitor.config.json",
  iosConfig: "ios/App/App/capacitor.config.json",
  androidConfig: "android/app/src/main/assets/capacitor.config.json",
  pbxproj: "ios/App/App.xcodeproj/project.pbxproj",
  plist: "ios/App/App/Info.plist",
  gradle: "android/app/build.gradle",
  strings: "android/app/src/main/res/values/strings.xml",
  manifest: "android/app/src/main/AndroidManifest.xml",
  iosPublic: "ios/App/App/public",
  androidPublic: "android/app/src/main/assets/public",
};
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const has = rel => fs.existsSync(path.join(ROOT, rel));

// Which brand the phone shells hold right now. `key` is null when they disagree.
function nativeState(brands = loadBrands()) {
  const st = {};
  if (has(SHELLS.config)) st.config = byAppId(JSON.parse(read(SHELLS.config)).appId, brands)?.key || null;
  for (const [name, dir] of [["ios", SHELLS.iosPublic], ["android", SHELLS.androidPublic]]) {
    const f = path.join(ROOT, dir, "index.html");
    st[name] = fs.existsSync(f) ? markerOf(fs.readFileSync(f, "utf8")) : undefined;
  }
  const seen = [...new Set(Object.values(st).filter(v => v !== undefined))];
  st.key = seen.length === 1 ? seen[0] : null;
  return st;
}

// Every in-place edit the switch makes, as [file, transform]. Each transform
// throws when its anchor is missing, so a half-switched tree is impossible.
function nativeEdits(from, to, contact) {
  const must = (text, needle, rel) => { if (!text.includes(needle)) throw new Error(`${rel} does not carry ${needle}; run \`npm run brand status\` and check the shells by hand.`); return text; };
  const edits = [];
  const jsonFields = rel => text => {
    let t = must(text, `"appId": "${from.appId}"`, rel).replace(`"appId": "${from.appId}"`, `"appId": "${to.appId}"`);
    t = must(t, `"appName": "${from.name}"`, rel).replace(`"appName": "${from.name}"`, `"appName": "${to.name}"`);
    return t;
  };
  edits.push([SHELLS.config, jsonFields(SHELLS.config)]);
  for (const rel of [SHELLS.iosConfig, SHELLS.androidConfig]) if (has(rel)) edits.push([rel, jsonFields(rel)]);
  if (has(SHELLS.pbxproj)) edits.push([SHELLS.pbxproj, text => must(text, `PRODUCT_BUNDLE_IDENTIFIER = ${from.appId};`, SHELLS.pbxproj).replaceAll(`PRODUCT_BUNDLE_IDENTIFIER = ${from.appId};`, `PRODUCT_BUNDLE_IDENTIFIER = ${to.appId};`)]);
  if (has(SHELLS.plist)) edits.push([SHELLS.plist, text => {
    let t = must(text, `<string>${from.appId}</string>`, SHELLS.plist).replace(`<string>${from.appId}</string>`, `<string>${to.appId}</string>`);
    t = must(t, `<array><string>${from.scheme}</string></array>`, SHELLS.plist).replace(`<array><string>${from.scheme}</string></array>`, `<array><string>${to.scheme}</string></array>`);
    t = t.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${to.name}$2`);
    return t;
  }]);
  // applicationId is the store identity; namespace and the Java package stay put (Android allows them to differ).
  if (has(SHELLS.gradle)) edits.push([SHELLS.gradle, text => must(text, `applicationId "${from.appId}"`, SHELLS.gradle).replace(`applicationId "${from.appId}"`, `applicationId "${to.appId}"`)]);
  if (has(SHELLS.strings)) edits.push([SHELLS.strings, text => text
    .replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${to.name}$2`)
    .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${to.name}$2`)
    .replace(/(<string name="package_name">)[^<]*(<\/string>)/, `$1${to.appId}$2`)
    .replace(/(<string name="custom_url_scheme">)[^<]*(<\/string>)/, `$1${to.scheme}$2`)]);
  if (has(SHELLS.manifest)) edits.push([SHELLS.manifest, text => {
    let t = must(text, `android:scheme="${from.scheme}"`, SHELLS.manifest).replace(`android:scheme="${from.scheme}"`, `android:scheme="${to.scheme}"`);
    return require("./configure-native").withAndroidDomain(t, contact.domain);
  }]);
  return edits;
}

function native(key, { dry = false, quiet = false } = {}) {
  const brands = loadBrands();
  const to = brandOf(key, brands);
  const state = nativeState(brands);
  if (!state.config) throw new Error("capacitor.config.json names an appId that is not any brand's; fix it by hand before switching.");
  if (state.key === null) throw new Error(`The shells disagree about their brand (config ${state.config}, iOS ${state.ios}, Android ${state.android}); run \`npm run sync\` first.`);
  const from = brandOf(state.key, brands);
  const staged = stage(to, brands);
  const problems = selfCheck(staged);
  if (problems.length) throw new Error(`Refusing to switch the shells to ${to.short}: ${problems[0]}`);
  const edits = nativeEdits(from, to, staged.contact);
  const writes = new Map();
  for (const [rel, fn] of edits) { const before = read(rel); const after = fn(before); if (after !== before) writes.set(rel, after); }
  const publicWrites = [];
  for (const dir of [SHELLS.iosPublic, SHELLS.androidPublic]) {
    if (!has(dir)) continue;
    for (const [rel, buf] of staged.web) {
      const f = path.join(ROOT, dir, rel);
      if (!fs.existsSync(f) || !fs.readFileSync(f).equals(buf)) publicWrites.push([path.join(dir, rel), buf]);
    }
    for (const rel of walk(path.join(ROOT, dir))) if (!staged.web.has(rel) && !/^cordova(_plugins)?\.js$/.test(rel)) publicWrites.push([path.join(dir, rel), null]);
  }
  if (dry) {
    if (!quiet) {
      console.log(`Dry run — the shells hold ${from.short}; switching to ${to.short} (${to.appId}, ${to.scheme}://) would change:`);
      for (const rel of writes.keys()) console.log(`  ${rel}`);
      for (const [rel, buf] of publicWrites) console.log(`  ${rel}${buf ? "" : " (removed)"}`);
      if (!writes.size && !publicWrites.length) console.log("  nothing — the shells already hold that brand.");
      console.log("Nothing was written.");
    }
    return { from: from.key, to: to.key, files: [...writes.keys(), ...publicWrites.map(([r]) => r)], dry: true };
  }
  for (const [rel, text] of writes) fs.writeFileSync(path.join(ROOT, rel), text);
  for (const [rel, buf] of publicWrites) { if (buf) fs.writeFileSync(path.join(ROOT, rel), buf); else fs.rmSync(path.join(ROOT, rel)); }
  return { from: from.key, to: to.key, files: [...writes.keys(), ...publicWrites.map(([r]) => r)] };
}

/* ---------------------------------------------------------------- contact */

function contact(key, args, { dry = false } = {}) {
  const brands = loadBrands();
  const to = brandOf(key, brands);
  const current = contactOf(to);
  const next = contactLib.apply(current, args);   // throws the one sentence
  if (dry) return { file: to.contact, next, dry: true };
  if (to.key === brands.default) {
    // The default brand's contact is stamped straight into the committed site by the contact CLI.
    const { execFileSync } = require("node:child_process");
    execFileSync(process.execPath, [path.join(__dirname, "contact.js"), ...args], { cwd: ROOT, stdio: "inherit" });
  } else {
    fs.writeFileSync(path.join(ROOT, to.contact), JSON.stringify(next, null, 2) + "\n");
  }
  return { file: to.contact, next };
}

/* ------------------------------------------------------------------ check */

function check(key) {
  const rows = [];
  const ok = (name, pass, detail = "") => rows.push({ name, pass: !!pass, detail });
  let brands, to;
  try { brands = loadBrands(); ok("brand/brands.json is valid", true); } catch (e) { ok("brand/brands.json is valid", false, e.message); return rows; }
  try { to = brandOf(key, brands); ok(`"${key}" is a brand`, true, `${to.short} · ${to.appId} · ${to.scheme}://`); } catch (e) { ok(`"${key}" is a brand`, false, e.message); return rows; }
  let c;
  try { c = contactOf(to); ok(`${to.contact} is readable`, true); } catch (e) { ok(`${to.contact} is readable`, false, e.message); }
  if (c) for (const [k, label] of [["email", "support email"], ["domain", "domain"], ["appstore", "App Store ID"], ["play", "Google Play URL"], ["sha256", "release signing fingerprint"]]) ok(`${to.short} ${label}`, true, c[k] || "not set yet");
  try { const problems = selfCheck(stage(to, brands)); ok("the branded build passes its own check", !problems.length, problems[0] || "namespace tokens intact, no stray names"); }
  catch (e) { ok("the branded build passes its own check", false, e.message); }
  const st = nativeState(brands);
  if (st.key === to.key) {
    let stale = [];
    for (const [name, dir] of [["iOS", SHELLS.iosPublic], ["Android", SHELLS.androidPublic]]) {
      if (!has(dir)) continue;
      for (const rel of walk(WEB).filter(r => ships(r, to.key, brands))) { const f = path.join(ROOT, dir, rel); if (!fs.existsSync(f) || !fs.readFileSync(f).equals(expected(rel, to.key, brands))) stale.push(`${name}/${rel}`); }
    }
    ok("the phone shells carry this brand's web build", !stale.length, stale.length ? `stale: ${stale[0]} — run npm run brand native ${to.key}` : "in step");
  } else if (st.key) ok("the phone shells", true, `hold ${st.key}, not ${to.key} — npm run brand native ${to.key} switches them`);
  else ok("the phone shells agree about their brand", false, `config ${st.config}, iOS ${st.ios}, Android ${st.android} — run npm run sync`);
  return rows;
}

/* ----------------------------------------------------------------- status */

function statusLines() {
  const brands = loadBrands();
  const st = nativeState(brands);
  const rows = [["brand", "name", "app id", "link", "support", "phones", "default"]];
  for (const b of Object.values(brands.brands)) {
    let c; try { c = contactOf(b); } catch { c = null; }
    const support = !c ? "unreadable" : c.email ? `${c.email}${c.domain ? " · " + c.domain : ""}` : "not set yet";
    rows.push([b.key, b.name, b.appId, b.scheme + "://", support, st.key === b.key ? "yes" : "", b.key === brands.default ? "yes" : ""]);
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map(r => [...r[i]].length)) + 2);
  const lines = rows.map(r => r.map((cell, i) => i === r.length - 1 ? cell : cell.padEnd(widths[i])).join("").trimEnd());
  if (st.key === null) lines.push(`\nThe phone shells disagree about their brand (config ${st.config}, iOS ${st.ios}, Android ${st.android}). Run npm run sync.`);
  return lines;
}
function nextSteps() {
  const brands = loadBrands();
  const out = [];
  for (const b of Object.values(brands.brands)) {
    let c; try { c = contactOf(b); } catch { continue; }
    if (!c.email || !c.domain) out.push(`npm run brand contact ${b.key} -- --email support@example.com --domain example.com   (${b.short} has no support contact yet)`);
  }
  out.push("npm run brand build -- --all   (every branded site and app into dist/brand/)");
  return out;
}

/* ----------------------------------------------------------------- wizard */

async function wizard() {
  const rl = require("node:readline/promises").createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q, def) => { const a = (await rl.question(def ? `${q} (${def}): ` : `${q}: `)).trim(); return a || def || ""; };
  const yes = async q => /^y(es)?$/i.test(await ask(`${q} [y/N]`));
  const pickBrand = async () => {
    const brands = loadBrands();
    const keys = Object.keys(brands.brands);
    for (;;) {
      const k = await ask(`Which brand? [${keys.join("/")}]`, brands.default);
      if (brands.brands[k]) return brands.brands[k];
      console.log(`  There is no brand called "${k}".`);
    }
  };
  try {
    console.log(`\n${Object.values(loadBrands().brands).map(b => b.short).join(" / ")} — ${Object.keys(loadBrands().brands).length} builds, one source\n`);
    for (;;) {
      console.log(statusLines().join("\n"));
      console.log("\nWhat would you like to do?");
      console.log("  1  Build a brand's site and app");
      console.log("  2  Build both");
      console.log("  3  Set a brand's support email and domain");
      console.log("  4  Switch the phone shells (ios/, android/) to a brand");
      console.log("  5  Check a brand");
      console.log("  q  Quit");
      const choice = await ask("Choose", "q");
      try {
        if (choice === "q" || choice === "quit") break;
        else if (choice === "1") {
          const b = await pickBrand();
          const r = build(b.key);
          console.log(`\nBuilt ${b.short} → ${path.relative(ROOT, r.out)}/`);
          console.log(`Next: open ${path.relative(ROOT, r.out)}/index.html, or npm run preview -- --root ${path.relative(ROOT, r.out)}`);
        } else if (choice === "2") {
          for (const b of Object.values(loadBrands().brands)) { const r = build(b.key); console.log(`Built ${b.short} → ${path.relative(ROOT, r.out)}/`); }
          console.log("Next: each folder is a complete site with the app under app/. Publish the one whose domain you own.");
        } else if (choice === "3") {
          const b = await pickBrand();
          const c = contactOf(b);
          const email = await ask("Support email", c.email || "");
          const domain = await ask("Domain (just the hostname, e.g. example.com)", c.domain || "");
          const args = [];
          if (email) args.push("--email", email);
          if (domain) args.push("--domain", domain);
          if (!args.length) { console.log("  Nothing entered; nothing changed."); continue; }
          const r = contact(b.key, args);
          console.log(`\nSaved to ${r.file}.`);
          console.log(`Next: npm run brand build ${b.key}   (the support page and CNAME pick it up from there)`);
        } else if (choice === "4") {
          const b = await pickBrand();
          const st = nativeState();
          if (st.key === b.key) { console.log(`  The shells already hold ${b.short}.`); continue; }
          const plan = native(b.key, { dry: true, quiet: true });
          console.log(`\nThis rewrites the committed ios/ and android/ shells from ${st.key || "?"} to ${b.short}: ${plan.files.length} files, bundle id ${b.appId}, link ${b.scheme}://. It is reversible — switch back the same way.`);
          if (!(await yes("Continue?"))) { console.log("  Left as they were."); continue; }
          const r = native(b.key);
          console.log(`\nSwitched ${r.files.length} files to ${b.short}.`);
          console.log(`Next: npm run open:ios (or open:android), archive, then npm run brand native ${loadBrands().default} to go back.`);
        } else if (choice === "5") {
          const b = await pickBrand();
          const rows = check(b.key);
          for (const r of rows) console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ": " + r.detail : ""}`);
        } else console.log(`  "${choice}" is not one of the choices.`);
      } catch (e) { console.log(`\n  ${e.message}`); }
      console.log("");
    }
  } finally { rl.close(); }
}

/* -------------------------------------------------------------------- cli */

function usage() {
  return [
    "npm run brand                       guided",
    "npm run brand status",
    "npm run brand build <brand>|--all   → dist/brand/<brand>/",
    "npm run brand contact <brand> -- --email … --domain … [--appstore … --play … --sha256 …]",
    "npm run brand native <brand>        point ios/ and android/ at a brand (reversible)",
    "npm run brand check <brand>",
    "flags: --dry-run  --yes",
  ].join("\n");
}
async function main(argv) {
  const flags = new Set(argv.filter(a => /^--(dry-run|yes|all|interactive|help)$/.test(a)));
  const rest = argv.filter(a => !flags.has(a));
  const [cmd, key, ...more] = rest;
  const dry = flags.has("--dry-run");
  if (flags.has("--help")) { console.log(usage()); return; }
  if (!cmd || flags.has("--interactive")) {
    if (process.stdin.isTTY && process.stdout.isTTY) return wizard();
    console.log(usage() + "\n");
    console.log(statusLines().join("\n"));
    console.log("\nNext:\n  " + nextSteps().join("\n  "));
    return;
  }
  switch (cmd) {
    case "status": {
      console.log(statusLines().join("\n"));
      console.log("\nNext:\n  " + nextSteps().join("\n  "));
      return;
    }
    case "build": {
      const brands = loadBrands();
      const keys = flags.has("--all") || key === "--all" ? Object.keys(brands.brands) : [key];
      for (const k of keys) {
        const r = build(k, { dry });
        if (!dry) console.log(`${brandOf(k, brands).short}: ${path.relative(ROOT, r.out)}/ (${r.changed.length} files differ from the source)`);
      }
      if (!dry) console.log(`Next: open dist/brand/<brand>/index.html, or npm run brand check <brand>.`);
      return;
    }
    case "contact": {
      const args = more.filter(a => a !== "--");
      const r = contact(key, args, { dry });
      if (dry) { console.log(`Dry run — ${r.file} would become:\n${JSON.stringify(r.next, null, 2)}\nNothing was written.`); return; }
      if (loadBrands().default !== key) console.log(`Saved ${r.file}. Next: npm run brand build ${key}`);
      return;
    }
    case "native": {
      const st = nativeState();
      const to = brandOf(key);
      if (!dry && st.key !== to.key && !flags.has("--yes") && process.stdin.isTTY) {
        const rl = require("node:readline/promises").createInterface({ input: process.stdin, output: process.stdout });
        const a = await rl.question(`This rewrites the committed ios/ and android/ shells from ${st.key || "?"} to ${to.short} (${to.appId}). Continue? [y/N] `);
        rl.close();
        if (!/^y(es)?$/i.test(a.trim())) { console.log("Left as they were."); return; }
      }
      const r = native(key, { dry });
      if (!dry) console.log(`Switched ${r.files.length} files: the shells now hold ${to.short}.\nNext: npm run open:ios or npm run open:android, then \`npm run brand native ${loadBrands().default}\` to go back.`);
      return;
    }
    case "check": {
      const rows = check(key);
      for (const r of rows) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ": " + r.detail : ""}`);
      const bad = rows.filter(r => !r.pass).length;
      console.log(`${rows.length - bad}/${rows.length} checks passed.`);
      if (bad) process.exitCode = 1;
      return;
    }
    default: throw new Error(`"${cmd}" is not a brand command.\n${usage()}`);
  }
}

module.exports = { ships, loadBrands, brandOf, defaultBrand, contactOf, byAppId, transformText, transformFile, expected, markerOf, stage, selfCheck, build, native, nativeState, contact, check, statusLines, TECHNICAL };

if (require.main === module) {
  main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
}

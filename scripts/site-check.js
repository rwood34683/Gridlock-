#!/usr/bin/env node
/* Can this site actually go up, and will it work when it does?
 *
 *   npm run site:check
 *
 * The landing page is four static files and there is no build step, which
 * means nothing between a bad edit and the public internet. The things that
 * break a static deploy are boring and silent:
 *
 *   - a relative link to a file that is not in the upload, which is a 404 the
 *     day you rename something;
 *   - .well-known disappearing, which is Android app links failing forever
 *     with no error anywhere;
 *   - a store badge linking to an app that does not exist yet.
 *
 * None of those throw. So they are checked here, and the deploy workflow runs
 * this before it publishes: a failure stops the upload rather than shipping a
 * broken page.
 *
 * Two things WARN rather than fail, on purpose. The App Store ID and the
 * release signing fingerprint do not exist until Apple and Google issue them,
 * and the site has to be live *before* you submit — Apple checks that the
 * privacy and support URLs resolve. So an unfinished app must not block the
 * page that the submission depends on.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = path.join(ROOT, "site");
const PAGES = ["index.html", "privacy.html", "support.html"];

// Generated for the Claude artifact host, not for the web: nothing on the site
// links to them and together they are the better part of a megabyte.
const NOT_UPLOADED = ["build", "README.md"];

const rows = [];
const ok = (name, pass, detail) => { rows.push([!!pass, name, detail || ""]); return !!pass; };
const warns = [];
const warn = (what, detail) => warns.push([what, detail]);

const read = rel => fs.readFileSync(path.join(SITE, rel), "utf8");
const has = rel => fs.existsSync(path.join(SITE, rel));

/* ---- what gets uploaded ------------------------------------------------ */
const uploaded = new Set();
(function walk(dir, prefix){
  for(const e of fs.readdirSync(dir, {withFileTypes:true})){
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if(NOT_UPLOADED.includes(rel)) continue;
    if(e.isDirectory()) walk(path.join(dir, e.name), rel);
    else uploaded.add(rel);
  }
})(SITE, "");

/* ---- the host has to serve the dot-directory --------------------------- */
// GitHub Pages runs Jekyll on a branch deploy, and Jekyll drops anything
// beginning with a dot — including the one file Android goes looking for.
ok(".nojekyll is there, so .well-known survives", uploaded.has(".nojekyll"));
ok("CNAME names the domain", uploaded.has("CNAME"),
   uploaded.has("CNAME") ? read("CNAME").trim() : "no custom domain — the page lands on github.io");

/* ---- app links --------------------------------------------------------- */
const AL = ".well-known/assetlinks.json";
if(ok("assetlinks.json is in the upload", uploaded.has(AL))){
  let j = null;
  try { j = JSON.parse(read(AL)); } catch(e){}
  ok("assetlinks.json is valid JSON", !!j, j ? "" : "Android reads this literally — a stray comma is a silent failure");
  const pkg = j && j[0] && j[0].target && j[0].target.package_name;
  const manifest = fs.readFileSync(
    path.join(ROOT, "android/app/src/main/AndroidManifest.xml"), "utf8");
  const appId = (manifest.match(/package="([^"]+)"/) || [])[1]
    || (fs.readFileSync(path.join(ROOT, "android/app/build.gradle"), "utf8")
        .match(/applicationId\s+"([^"]+)"/) || [])[1];
  ok("it names the app Android is asked to open", !appId || pkg === appId,
     pkg === appId ? pkg : `${pkg} vs ${appId}`);

  const host = (manifest.match(/android:host="([^"]+)"/) || [])[1];
  const cname = uploaded.has("CNAME") ? read("CNAME").trim() : "";
  ok("the app claims the host this site is deployed to", !host || !cname || host === cname,
     host === cname ? host : `app claims ${host}, site is ${cname}`);

  const fp = j && j[0] && (j[0].target.sha256_cert_fingerprints || [])[0];
  if(!fp || /REPLACE/.test(fp))
    warn("release signing fingerprint",
      "assetlinks.json still has the placeholder — links open in a browser, never the app.\n"
      + "    Play Console → Test and release → App signing → SHA-256, then:\n"
      + "    npm run contact -- --sha256 <32 hex pairs>");
}

/* ---- no dead links ----------------------------------------------------- */
// Every relative href and src on every page has to be a file that is actually
// going up. This is the check that catches excluding build/ by mistake, or a
// renamed screenshot.
const missing = [];
for(const page of PAGES){
  if(!has(page)) { ok(`${page} exists`, false); continue; }
  const src = read(page);
  const refs = [...src.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map(m => m[1]);
  for(const r of refs){
    if(/^(https?:|mailto:|data:|tel:|\/\/)/.test(r)) continue;
    const clean = r.split("?")[0].split("#")[0];
    if(!clean) continue;
    if(!uploaded.has(clean)) missing.push(`${page} → ${clean}`);
  }
}
ok("every relative link points at a file that ships", !missing.length, missing.join(", "));

/* ---- no link to an app that does not exist ----------------------------- */
const index = has("index.html") ? read("index.html") : "";
const dead = /apps\.apple\.com\/app\/id0+["/]/.test(index);
ok("no dead App Store link", !dead, dead ? "the badge still points at id0000000000" : "");
if(/badge--soon/.test(index))
  warn("App Store ID",
    "the badge reads \"Coming to the App Store\" and does not link — correct until Apple issues an ID.\n"
    + "    npm run contact -- --appstore <id>");

/* ---- the support address Apple will test ------------------------------- */
const support = has("support.html") ? read("support.html") : "";
const addr = (support.match(/mailto:([^"?]+)/) || [])[1] || "";
ok("the support page carries a real address", !!addr && !/your-domain\.example/.test(addr), addr);

/* ---- report ------------------------------------------------------------ */
const bad = rows.filter(r => !r[0]).length;
console.log("GRIDLOCK site check");
console.log("===================\n");
for(const [pass, name, detail] of rows)
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name.padEnd(52)}${detail}`);

const bytes = [...uploaded].reduce((n, f) => n + fs.statSync(path.join(SITE, f)).size, 0);
console.log(`\n${rows.length - bad}/${rows.length} checks passed.`);
console.log(`Upload: ${uploaded.size} files, ${(bytes / 1024).toFixed(0)} KB `
  + `(site/build and site/README.md are not part of it).`);

if(warns.length){
  console.log("\nThe site can go up, but these are not finished yet:");
  for(const [what, detail] of warns) console.log(`  ${what}\n    ${detail}`);
}
process.exit(bad ? 1 : 0);

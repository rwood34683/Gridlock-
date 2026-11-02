#!/usr/bin/env node
"use strict";
/* The offline preview of Gridlock published as a Claude artifact.
 *
 * It is the committed site and web app, bundled into one page by
 * scripts/build-artifact-page.js, with a small overlay that the published
 * preview needs and the real app does not:
 *   - a notice on every page that the preview runs offline, with a link to
 *     the live app (https://app.gridlockpb.com/) for sign-in, cloud saves and
 *     admin;
 *   - that link never fails silently: if the viewer will not open a new tab,
 *     the notice prints the address to open instead;
 *   - the viewer never lets a page save a file, so Save a copy and Send this
 *     sheet are told the file share is unavailable. The app already falls
 *     back to showing the text; the overlay says why, and a copy shown as text
 *     is never counted as a backup.
 * No cloud adapter, configuration, keys or admin page is ever bundled; the
 * build refuses if one appears. docs/PREVIEW.md has the steps.
 *
 *   node scripts/package-preview.js                  build into dist/preview/
 *   node scripts/package-preview.js --record docs/preview-manifest.json
 *   node scripts/package-preview.js --out dist/preview-test --allow-dirty   (tests)
 */
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), cp = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const opt = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : null; };
const OUT = path.resolve(ROOT, opt("--out") || path.join("dist", "preview"));
if (!OUT.startsWith(path.join(ROOT, "dist") + path.sep)) throw new Error("The preview is built under dist/ only.");
const SITE = path.join(OUT, "site");
const BETA = "https://app.gridlockpb.com/";
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const git = a => cp.execFileSync("git", a, {cwd: ROOT}).toString().trim();
const manifest = {format: "gridlock-preview-manifest", v: 1,
  sourceCommit: git(["rev-parse", "HEAD"]),
  // The content the preview is made of, by git tree: a later commit that
  // leaves web/ and site/ alone rebuilds the same file.
  sourceTrees: {web: git(["rev-parse", "HEAD:web"]), site: git(["rev-parse", "HEAD:site"])},
  dirtyTracked: git(["status", "--porcelain", "--untracked-files=no"]) !== "",
  liveApp: BETA, edits: [], inputs: {}, outputs: {}};
if (manifest.dirtyTracked && !args.includes("--allow-dirty")) throw new Error("Tracked files are modified; package only a clean checkout.");

function once(html, from, to, label) {
  const n = html.split(from).length - 1;
  if (n !== 1) throw new Error(`${label}: expected exactly one match, found ${n}`);
  manifest.edits.push(label);
  return html.replace(from, to);
}
const NOTE_TEXT = "Runs offline in this browser only: no account sign-in, cloud saves or admin here. Use the live app at app.gridlockpb.com for those.";
const LINK = `<a class="pv-link" href="${BETA}" target="_blank" rel="noopener noreferrer">Open the live app <span aria-hidden="true">↗</span></a>`;
const SITE_CSS = `<style id="pv-style">.pv-note{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:12px max(16px,calc((100% - 1280px)/2));background:#161011;border-bottom:3px solid #ad1515;color:#efedeb;font:15px/1.4 Arial,Helvetica,sans-serif}.pv-note b{font:700 13px Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;color:#ff5a52}.pv-note span{flex:1 1 260px}.pv-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 16px;background:#ad1515;border:1px solid #d12828;border-radius:3px;color:#fff;font-weight:700;text-decoration:none;white-space:nowrap;flex:none}</style>`;
const SITE_NOTE = `<div class="pv-note" role="note" aria-label="Offline preview"><b>Offline preview</b><span>${NOTE_TEXT}</span>${LINK}</div>`;
// The viewer may refuse to open a new tab. The link never fails in silence:
// if no window opened, the notice says so and prints the address to use.
const PV_LINK_SCRIPT = `<style>.pv-fallback{flex:1 1 100%;color:#ffd0cc;font-weight:700}</style><script id="pv-link">(function(){document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a.pv-link");if(!a)return;e.preventDefault();var w=null;try{w=window.open(a.href,"_blank");}catch(x){}if(w){try{w.opener=null;}catch(x){}return;}var n=a.parentNode.querySelector(".pv-fallback");if(!n){n=document.createElement("span");n.className="pv-fallback";n.setAttribute("role","status");a.parentNode.appendChild(n);}n.textContent="This preview window could not open a new tab. Open "+a.href+" in your browser instead.";},true);})();<\/script>`;
// Downloads: the viewer never lets a page save a file, so Save a copy and
// Send this sheet are told the file share is unavailable. The app already
// falls back to the text in that case; this says why, and a shown copy is
// never counted as a backup.
const APP_NOTE_TEXT = NOTE_TEXT + " Downloads are switched off here too: Save a copy and Send this sheet show the text for you to copy instead of saving a file.";
const APP_SCRIPT = `<script id="pv-export">(function(){window.gridlockPreview=true;window.gridlockExportFile=function(){return Promise.resolve({status:"failed",message:"Downloads are switched off in this preview."});};var save0=window.saveCopy;if(typeof save0==="function")window.saveCopy=async function(scope){await save0(scope);try{if(S.copyText){S.copyStatus="Downloads are switched off in this preview, so no file was saved and nothing is counted as a backup. The full copy is in the box below: select it and copy it somewhere safe. To save a file, use the live app at app.gridlockpb.com.";save(S);render();}}catch(e){}};var sheetAt=0,send0=window.sendSheet;if(typeof send0==="function")window.sendSheet=function(){sheetAt=Date.now();return send0.apply(this,arguments);};var flash0=window.flash;if(typeof flash0==="function")window.flash=function(m){if(Date.now()-sheetAt<5000&&/^Copied/.test(String(m)))m="Downloads are switched off in this preview, so no file was saved: the sheet was copied to your clipboard instead. Paste it where it is going.";return flash0(m);};var box0=window.handOffBox;if(typeof box0==="function")window.handOffBox=function(){return String(box0()).replace("No share sheet here, so the text is below.","Downloads are switched off in this preview, so no file was saved or sent. The text is below.");};})();<\/script>`;

// 1. Copy the site (not its build/ outputs), then overlay.
fs.rmSync(SITE, {recursive: true, force: true});
fs.cpSync(path.join(ROOT, "site"), SITE, {recursive: true, filter: s => !s.startsWith(path.join(ROOT, "site", "build"))});
for (const f of ["index.html", "support.html", "privacy.html"]) manifest.inputs["site/" + f] = sha(fs.readFileSync(path.join(ROOT, "site", f)));
manifest.inputs["web/index.html"] = sha(fs.readFileSync(path.join(ROOT, "web", "index.html")));

const edit = (f, fn) => { const p = path.join(SITE, f); fs.writeFileSync(p, fn(fs.readFileSync(p, "utf8"))); };
const addNote = (h, f) => once(once(once(h, "</head>", SITE_CSS + "</head>", f + ": notice style"), '<a class="skip" href="#main">Skip to content</a>', '<a class="skip" href="#main">Skip to content</a>' + SITE_NOTE, f + ": notice"), "</body>", PV_LINK_SCRIPT + "</body>", f + ": link fallback");
edit("index.html", h => {
  h = addNote(h, "index.html");
  h = once(h, "There is no server and no signal needed.", "This offline preview has no server and needs no signal.", "index.html: scope no-server line");
  h = once(h, "There is no cloud service to sync or recover your season for you.", "This offline preview has no cloud service to sync or recover your season; for sign-in and cloud saves, use the live app at app.gridlockpb.com.", "index.html: scope no-cloud line");
  return h;
});
edit("support.html", h => {
  h = addNote(h, "support.html");
  h = once(h, "It is a lock on the device, not a cloud login: there is no server,", "In this offline preview it is a lock on the device, not a cloud login: there is no server,", "support.html: scope account line");
  h = once(h, "Gridlock does not sync through a server.", "This offline preview does not sync through a server; the live app at app.gridlockpb.com has optional cloud saves.", "support.html: scope sync line");
  return h;
});
edit("privacy.html", h => addNote(h, "privacy.html"));

// 2. The app: the committed offline web build, bundled, plus the notice above #root.
const {bundle} = require(path.join(ROOT, "scripts", "build-app-artifact.js"));
let app = bundle();
for (const bad of ["gridlock-config", "GRIDLOCK_CLOUD", "gridlock-cloud.js", "supabase.co", "sb_publishable", "service_role"]) if (app.includes(bad)) throw new Error("Offline app bundle unexpectedly contains " + bad);
const APP_CSS = `<style id="pv-style">body{display:flex;flex-direction:column}#root{flex:1 1 auto;height:auto;min-height:0}.pv-note{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:8px 16px;padding-top:max(8px,env(safe-area-inset-top));background:#161011;border-bottom:2px solid #ad1515;color:#efedeb;font:14px/1.35 Arial,Helvetica,sans-serif}.pv-note b{font:700 12px Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;color:#ff5a52}.pv-note span{flex:1 1 220px}.pv-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 14px;background:#ad1515;border:1px solid #d12828;border-radius:3px;color:#fff;font-weight:700;text-decoration:none;white-space:nowrap;flex:none}</style>`;
app = once(app, "</head>", APP_CSS + "</head>", "app.html: notice style");
app = once(app, '<div id="root"></div>', `<div class="pv-note" role="note" aria-label="Offline preview"><b>Offline preview</b><span>${APP_NOTE_TEXT}</span>${LINK}</div><div id="root"></div>`, "app.html: notice");
app = once(app, "</body>", PV_LINK_SCRIPT + APP_SCRIPT + "</body>", "app.html: link fallback and export handling");
fs.writeFileSync(path.join(SITE, "app.html"), app);

// 3. Bundle the four pages exactly as the existing artifact procedure does.
const artifact = path.join(OUT, "artifact.html");
const log = cp.execFileSync(process.execPath, [path.join(ROOT, "scripts", "build-artifact-page.js"), "--root", path.relative(ROOT, SITE), "--out", path.relative(ROOT, artifact)], {cwd: ROOT}).toString().trim();
const outBuf = fs.readFileSync(artifact);
for (const bad of ["gridlock-config", "GRIDLOCK_CLOUD", "supabase", "sb_publishable", "service_role", "gridlock-admin", "admin/index"]) if (outBuf.includes(bad)) throw new Error("Artifact contains forbidden token " + bad);
for (const f of ["index.html", "support.html", "privacy.html", "app.html"]) manifest.outputs["site/" + f] = sha(fs.readFileSync(path.join(SITE, f)));
manifest.outputs["artifact.html"] = sha(outBuf);
manifest.outputs.bytes = outBuf.length;
manifest.buildLog = log;
manifest.script = sha(fs.readFileSync(__filename));
manifest.packager = path.relative(ROOT, __filename);
manifest.builtAt = new Date().toISOString();
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
// --record writes the manifest where it is committed, so the next rebuild can
// be checked against the build that was published. --published names it.
const record = opt("--record");
if (record) {
  const dest = path.resolve(ROOT, record);
  if (!dest.startsWith(ROOT + path.sep)) throw new Error("--record must name a file in the repository.");
  const pub = opt("--published");
  const out = {...manifest};
  if (pub) {
    const [url, version, versionId] = pub.split(",");
    out.published = {url, version: Number(version), versionId};
  }
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
}
console.log(log);
console.log("artifact.html sha256 " + manifest.outputs["artifact.html"]);

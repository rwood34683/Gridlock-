#!/usr/bin/env node
/* Check the store listing against what the stores will actually accept.
 *
 *   npm run store:check
 *
 * Character limits are the boring way a submission fails: you paste a subtitle,
 * App Store Connect truncates it, and you find out from a reviewer. This reads
 * the copy out of docs/STORE-LISTING.md, counts it, and also checks that the
 * images the listing promises exist at the exact sizes each store wants. */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DOC = path.join(ROOT, "docs", "STORE-LISTING.md");
const md = fs.readFileSync(DOC, "utf8");

// Each entry: the heading in the doc, and the limit the store enforces.
const FIELDS = [
  ["Name — 30 char limit", 30],
  ["Subtitle — 30 char limit", 30],
  ["Promotional text — 170 char limit", 170],
  ["Keywords — 100 char limit", 100],
  ["Description — 4000 char limit", 4000],
  ["What's New — 4000 char limit", 4000],
  ["App name — 30 char limit", 30],
  ["Short description — 80 char limit", 80],
];

// The first fenced block after a heading is that field's copy.
function copyUnder(heading) {
  const at = md.indexOf(`### ${heading}`);
  if (at < 0) return null;
  const open = md.indexOf("```", at);
  if (open < 0) return null;
  const start = md.indexOf("\n", open) + 1;
  const close = md.indexOf("```", start);
  return md.slice(start, close).replace(/\n$/, "");
}

const IMAGES = [
  ["store/app-store/iphone-6.9", 1290, 2796, 6],
  ["store/app-store/iphone-6.5", 1242, 2688, 6],
  ["store/play/phone", 1080, 1920, 6],
];
const SINGLES = [
  ["store/play/feature-graphic.png", 1024, 500],
  ["brand/out/play-store-icon-512.png", 512, 512],
  ["brand/out/app-store-icon-1024.png", 1024, 1024],
];

// PNG dimensions live in the IHDR chunk — no image library needed for this.
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const rows = [];
let bad = 0;
const ok = (name, pass, detail) => { rows.push([pass, name, detail]); if (!pass) bad++; };

for (const [heading, limit] of FIELDS) {
  const copy = copyUnder(heading);
  if (copy === null) { ok(heading.split(" —")[0], false, "not found in the doc"); continue; }
  const n = [...copy].length;                      // count characters, not bytes
  ok(heading.split(" —")[0], n <= limit, `${n}/${limit}`);
}

for (const [dir, w, h, want] of IMAGES) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) { ok(dir, false, "missing — run `npm run store`"); continue; }
  const files = fs.readdirSync(abs).filter(f => f.endsWith(".png")).sort();
  const wrong = files.map(f => [f, pngSize(path.join(abs, f))])
                     .filter(([, s]) => !s || s[0] !== w || s[1] !== h);
  ok(dir, files.length >= want && !wrong.length,
     wrong.length ? `${wrong[0][0]} is ${wrong[0][1] ? wrong[0][1].join("x") : "unreadable"}, want ${w}x${h}`
                  : `${files.length} at ${w}x${h}`);
}

for (const [rel, w, h] of SINGLES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { ok(rel, false, "missing"); continue; }
  const s = pngSize(abs);
  ok(rel, s && s[0] === w && s[1] === h, s ? s.join("x") : "unreadable");
}

// The web app is committed into both native shells so Xcode and Android Studio
// open to something. A stale copy is worse than none: the app runs, and it is
// quietly the wrong version.
const SYNCED = [
  ["ios/App/App/public/index.html", "iOS"],
  ["android/app/src/main/assets/public/index.html", "Android"],
];
{
  const src = fs.readFileSync(path.join(ROOT, "web/index.html"), "utf8");
  for (const [rel, name] of SYNCED) {
    const abs = path.join(ROOT, rel);
    const same = fs.existsSync(abs) && fs.readFileSync(abs, "utf8") === src;
    ok(`${name} shell carries this web build`, same, same ? "in step" : "stale — run npm run sync");
  }
}

// The placeholders that must be replaced before a real submission.
const PLACEHOLDERS = [
  ["site/privacy.html", "support@your-domain.example", "support email"],
  ["site/support.html", "support@your-domain.example", "support email"],
  ["site/index.html", "id0000000000", "App Store ID"],
  ["android/app/src/main/AndroidManifest.xml", "gridlocksystem.app", "app-link domain"],
  ["site/.well-known/assetlinks.json", "REPLACE_WITH_YOUR_RELEASE_SHA256", "release signing fingerprint"],
];
const pending = PLACEHOLDERS.filter(([f, needle]) =>
  fs.existsSync(path.join(ROOT, f)) && fs.readFileSync(path.join(ROOT, f), "utf8").includes(needle));

console.log("GRIDLOCK store listing check");
console.log("============================\n");
for (const [pass, name, detail] of rows)
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name.padEnd(38)}${detail}`);

console.log(`\n${rows.length - bad}/${rows.length} checks passed.`);

if (pending.length) {
  console.log("\nStill to fill in before you submit (not a failure — see docs/STORE-LISTING.md):");
  for (const [f, , what] of pending) console.log(`  ${what.padEnd(16)} ${f}`);
}
process.exit(bad ? 1 : 0);

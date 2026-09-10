#!/usr/bin/env node
/* Stamp the real domain, support address and store IDs into everything that
 * carries them.
 *
 *   npm run contact -- --domain gridlockpb.com     (the usual one)
 *   npm run contact -- --email support@example.com
 *   npm run contact -- --appstore 6501234567
 *   npm run contact -- --sha256 AB:CD:...            (release signing cert)
 *   npm run contact                                 (say what is set now)
 *
 * --domain does the lot: the support address, the https app link Android
 * claims, and the three URLs the stores ask for.
 *
 * These values sit in five places across three files, and Apple rejects a
 * support page with a dead address, so hand-editing them is a way to ship a
 * broken one. This writes them all, refuses an address that is not an address,
 * and is safe to run again when the address changes.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const EMAIL_PLACEHOLDER = "support@your-domain.example";
// Until Apple assigns an ID there is nothing to link to, so the badge is a
// dead-looking "Coming to the App Store" rather than a live link to a 404.
// This is what that state looks like in the markup.
const SOON_BADGE = '<a class="badge badge--soon" aria-disabled="true">';
const SOON_LABEL = '<span class="badge__small">Coming to the</span>';
const LIVE_LABEL = '<span class="badge__small">Download on the</span>';
const SHA_PLACEHOLDER = "REPLACE_WITH_YOUR_RELEASE_SHA256";
// Where each value lives. A file is listed once per value it carries.
const EMAIL_IN = ["site/privacy.html", "site/support.html"];
const APPSTORE_IN = ["site/index.html"];
const SHA_IN = ["site/.well-known/assetlinks.json"];
// Android claims an https link to the site, and refuses to unless the host
// serves an assetlinks.json naming this app. A host nobody owns fails that
// check quietly, so it has to be the real one.
const DOMAIN_PLACEHOLDER = "gridlocksystem.app";
const DOMAIN_IN = ["android/app/src/main/AndroidManifest.xml", "docs/STORE-LISTING.md",
                   "site/.well-known/assetlinks.json"];

const args = process.argv.slice(2);
const flag = name => {
  const i = args.indexOf("--" + name);
  return i === -1 ? null : (args[i + 1] || "").trim();
};

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const write = (rel, s) => fs.writeFileSync(path.join(ROOT, rel), s);

// What is in the files right now, rather than what we think we set last time.
function current(files, placeholder, find) {
  const seen = new Set();
  files.forEach(f => { const hit = find(read(f)); if (hit) seen.add(hit); });
  if (!seen.size) return null;
  if (seen.size > 1) return [...seen].join(" AND ");     // drifted apart
  const only = [...seen][0];
  return only === placeholder ? null : only;
}
const findEmail = s => {
  const m = s.match(/mailto:([^"?]+)/);
  return m ? m[1] : null;
};
const findAppStore = s => {
  const m = s.match(/apps\.apple\.com\/app\/(id\d+)/);
  return m ? m[1] : null;
};

const VALID_EMAIL = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;
const VALID_DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function setDomain(next) {
  if (!VALID_DOMAIN.test(next) || !next.includes(".")) {
    console.error(`  not a domain: ${next}  (expected e.g. gridlockpb.com)`);
    process.exit(1);
  }
  const was = current(["android/app/src/main/AndroidManifest.xml"], DOMAIN_PLACEHOLDER,
    s => (s.match(/android:host="([^"]+)"/) || [])[1]) || DOMAIN_PLACEHOLDER;
  DOMAIN_IN.filter(f => fs.existsSync(path.join(ROOT, f)))
    .forEach(f => write(f, read(f).split(was).join(next).split("<your-domain>").join(next)));
  console.log(`  domain          ${was}  ->  ${next}`);
  return next;
}

function setEmail(next) {
  if (!VALID_EMAIL.test(next)) {
    console.error(`  not an email address: ${next}`);
    process.exit(1);
  }
  const was = current(EMAIL_IN, EMAIL_PLACEHOLDER, findEmail) || EMAIL_PLACEHOLDER;
  EMAIL_IN.forEach(f => {
    // The address appears twice on a page — once as the mailto, once as the
    // words the reader sees — and both have to move together.
    write(f, read(f).split(was).join(next));
  });
  console.log(`  support email   ${was}  ->  ${next}`);
  return next;
}

function setAppStore(next) {
  const id = /^\d+$/.test(next) ? "id" + next : next;
  if (!/^id\d{5,}$/.test(id)) {
    console.error(`  not an App Store ID: ${next}  (expected e.g. 6501234567)`);
    process.exit(1);
  }
  const was = current(APPSTORE_IN, null, findAppStore);
  APPSTORE_IN.forEach(f => {
    let s = read(f);
    // Two states, so two moves: wake the badge up if it is still "coming", and
    // otherwise swap the ID already in the href. Running this twice is a no-op.
    s = s.split(SOON_BADGE).join(`<a class="badge" href="https://apps.apple.com/app/${id}">`)
         .split(SOON_LABEL).join(LIVE_LABEL);
    if (was) s = s.split(was).join(id);
    write(f, s);
  });
  console.log(`  App Store ID    ${was || "not linked yet"}  ->  ${id}`);
  return id;
}

/* The release signing certificate, which is what actually makes an Android app
 * link verify. Play re-signs your upload with its own key, so the fingerprint
 * that belongs here is the one Play shows, not the one your upload keystore
 * has — Play Console → your app → Test and release → App signing → "SHA-256
 * certificate fingerprint". A local keystore gives its own with:
 *
 *   keytool -list -v -keystore release.jks -alias <alias> | grep SHA256
 *
 * Get this wrong and nothing errors: the link just opens in a browser instead
 * of the app, forever, quietly.
 */
function setSha(next) {
  const fp = next.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fp)) {
    console.error(`  not a SHA-256 fingerprint: ${next}`);
    console.error("  expected 32 hex pairs joined by colons, as Play Console prints it");
    process.exit(1);
  }
  const was = current(SHA_IN, SHA_PLACEHOLDER,
    s => (s.match(/"(([0-9A-F]{2}:){31}[0-9A-F]{2})"/i) || [])[1]) || SHA_PLACEHOLDER;
  SHA_IN.forEach(f => write(f, read(f).split(was).join(fp)));
  console.log(`  signing SHA-256 ${was === SHA_PLACEHOLDER ? "not set" : was.slice(0, 17) + "..."}  ->  ${fp.slice(0, 17)}...`);
  return fp;
}

console.log("GRIDLOCK contact details");
console.log("========================\n");

const domain = flag("domain"), email = flag("email"), appstore = flag("appstore"), sha = flag("sha256");
if (!domain && !email && !appstore && !sha) {
  const d = current(["android/app/src/main/AndroidManifest.xml"], DOMAIN_PLACEHOLDER,
    s => (s.match(/android:host="([^"]+)"/) || [])[1]);
  const e = current(EMAIL_IN, EMAIL_PLACEHOLDER, findEmail);
  const a = current(APPSTORE_IN, null, findAppStore);
  const f = current(SHA_IN, SHA_PLACEHOLDER,
    s => (s.match(/"(([0-9A-F]{2}:){31}[0-9A-F]{2})"/i) || [])[1]);
  console.log(`  domain          ${d || "not set — still the placeholder"}`);
  console.log(`  support email   ${e || "not set — still the placeholder"}`);
  console.log(`  App Store ID    ${a || "not set — the badge reads Coming to the App Store"}`);
  console.log(`  signing SHA-256 ${f ? f.slice(0, 17) + "..." : "not set — Android app links will not verify"}`);
  console.log("\n  npm run contact -- --domain gridlockpb.com");
  console.log("  npm run contact -- --email you@example.com");
  console.log("  npm run contact -- --appstore 6501234567");
  console.log("  npm run contact -- --sha256 <32 hex pairs from Play Console>");
  process.exit(0);
}
if (domain) { setDomain(domain); if (!email) setEmail("support@" + domain); }
if (email) setEmail(email);
if (appstore) setAppStore(appstore);
if (sha) setSha(sha);

console.log("\n  Rebuild the pages that inline them:  npm run site:artifact");
console.log("  Then check nothing is left:          npm run store:check");
console.log("  And that the site can go up:         npm run site:check");

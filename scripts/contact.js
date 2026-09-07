#!/usr/bin/env node
/* Stamp the real support address and store IDs into the pages that carry them.
 *
 *   npm run contact -- --email support@example.com
 *   npm run contact -- --appstore 6501234567
 *   npm run contact -- --email … --appstore …      (both at once)
 *   npm run contact                                 (say what is set now)
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
const APPSTORE_PLACEHOLDER = "id0000000000";
// Where each value lives. A file is listed once per value it carries.
const EMAIL_IN = ["site/privacy.html", "site/support.html"];
const APPSTORE_IN = ["site/index.html"];

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
  const was = current(APPSTORE_IN, APPSTORE_PLACEHOLDER, findAppStore) || APPSTORE_PLACEHOLDER;
  APPSTORE_IN.forEach(f => write(f, read(f).split(was).join(id)));
  console.log(`  App Store ID    ${was}  ->  ${id}`);
  return id;
}

console.log("GRIDLOCK contact details");
console.log("========================\n");

const email = flag("email"), appstore = flag("appstore");
if (!email && !appstore) {
  const e = current(EMAIL_IN, EMAIL_PLACEHOLDER, findEmail);
  const a = current(APPSTORE_IN, APPSTORE_PLACEHOLDER, findAppStore);
  console.log(`  support email   ${e || "not set — still the placeholder"}`);
  console.log(`  App Store ID    ${a || "not set — still the placeholder"}`);
  console.log("\n  npm run contact -- --email you@example.com");
  console.log("  npm run contact -- --appstore 6501234567");
  process.exit(0);
}
if (email) setEmail(email);
if (appstore) setAppStore(appstore);

console.log("\n  Rebuild the pages that inline them:  npm run site:artifact");
console.log("  Then check nothing is left:          npm run store:check");

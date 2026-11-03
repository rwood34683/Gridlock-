"use strict";
/* The published site sends a coach to the app his account lives in. With a
 * live app in contact.json, every "Open the app" on the built home, support
 * and privacy pages goes there; without one, the home page opens the offline
 * copy at app/ as it always has. The committed pages keep app.html so a local
 * preview of site/ still opens the single-file copy beside it. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const contact = require("../scripts/contact.js");
const { build } = require("../scripts/build.js");
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }
const links = html => [...html.matchAll(/<a\b[^>]*class="button[^"]*"[^>]*href="([^"]+)"|<a\b[^>]*href="([^"]+)"[^>]*class="button[^"]*"/g)].map(m => m[1] || m[2]);

check("--app takes only an HTTPS address with no query, fragment or login", () => {
  const base = contact.readContact(path.join(ROOT, "site/contact.json"));
  assert.equal(contact.apply(base, ["--app", "https://app.gridlockpb.com"]).app, "https://app.gridlockpb.com/");
  for (const bad of ["http://app.gridlockpb.com/", "app.gridlockpb.com", "https://u:p@app.gridlockpb.com/", "https://app.gridlockpb.com/?x=1", "https://app.gridlockpb.com/#a", "javascript:alert(1)"])
    assert.throws(() => contact.apply(base, ["--app", bad]), /HTTPS address of the live web app/, bad);
});
check("Gridlock's contact names the live app and its own domain", () => {
  const c = contact.readContact(path.join(ROOT, "site/contact.json"));
  assert.equal(c.app, "https://app.gridlockpb.com/");
  assert.equal(c.domain, "gridlockpb.com");
});
check("the committed pages still open the offline copy beside them", () => {
  for (const page of ["index.html", "support.html", "privacy.html"]) {
    const html = fs.readFileSync(path.join(ROOT, "site", page), "utf8");
    assert.ok(html.includes('href="app.html"'), page);
    assert.ok(!html.includes("app.gridlockpb.com"), page);
  }
});

function builtSite(app) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "site-links-"));
  fs.cpSync(path.join(ROOT, "site"), tmp, { recursive: true, filter: src => !src.includes(path.sep + "build") });
  if (!fs.existsSync(path.join(tmp, "app.html"))) fs.writeFileSync(path.join(tmp, "app.html"), "<!doctype html><title>app</title>");
  const c = JSON.parse(fs.readFileSync(path.join(tmp, "contact.json"), "utf8"));
  c.app = app;
  fs.writeFileSync(path.join(tmp, "contact.json"), JSON.stringify(c));
  const out = path.join(ROOT, "dist", "test-site-links-" + process.pid + (app ? "-live" : "-offline"));
  try {
    build({ site: tmp, out });
    return Object.fromEntries(["index.html", "support.html", "privacy.html"].map(p => [p, fs.readFileSync(path.join(out, p), "utf8")]));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
check("a live app: every Open the app on the published pages goes to it", () => {
  const pages = builtSite("https://app.gridlockpb.com/");
  for (const [page, html] of Object.entries(pages)) {
    const buttons = links(html);
    assert.ok(buttons.length >= 1, page + " has an Open the app button");
    assert.deepEqual([...new Set(buttons)], ["https://app.gridlockpb.com/"], page);
    assert.ok(!html.includes('href="app.html"') && !html.includes('href="app/"'), page);
  }
  assert.equal(links(pages["index.html"]).length, 3);
});
check("no live app: the home page opens app/ and the others app.html, as before", () => {
  const pages = builtSite(null);
  assert.deepEqual([...new Set(links(pages["index.html"]))], ["app/"]);
  for (const page of ["support.html", "privacy.html"]) assert.deepEqual([...new Set(links(pages[page]))], ["app.html"], page);
});

console.log(`${passed}/${passed} site link checks passed.`);

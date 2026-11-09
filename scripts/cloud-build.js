#!/usr/bin/env node
"use strict";
/* The cloud build — the ONE build that turns League sync on.
 *
 * It copies the web app verbatim, drops in the reference adapter
 * (native/gridlock-cloud.js) and a generated gridlock-config.js naming your
 * Supabase project, and wires both into index.html BEFORE the app boots, so
 * window.gridlockCloud is present on the first render and the sign-in copy is
 * already truthful. The committed web/ is never touched — it stays fetch-free —
 * so the default and offline builds are exactly as before.
 *
 *   GRINDX_SUPABASE_URL=https://YOUR.supabase.co \
 *   GRINDX_SUPABASE_ANON_KEY=eyJ... \
 *   npm run build:cloud
 *
 * Output: dist/cloud/ — point the Capacitor webDir at it for a native cloud
 * build, or serve it as the web cloud build. The anon key is public by design;
 * the service key never appears here.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "web");
const ADAPTER = path.join(ROOT, "native", "gridlock-cloud.js");
const ANCHOR = '<script src="voice.js"></script>';   // the last lib before the inline app

function publicKey(key) {
  if (typeof key !== "string") return false;
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) return true;
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return false;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    return payload && payload.role === "anon";
  } catch (_) { return false; }
}

function authRedirect(value) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string" || /[\s\\]/.test(value)) throw new Error("Invalid GRINDX_AUTH_REDIRECT_URL.");
  let parsed;
  try { parsed = new URL(value); } catch (_) { throw new Error("Invalid GRINDX_AUTH_REDIRECT_URL."); }
  const web = parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname));
  const native = ["gridlock:", "grindx:", "lockdown:"].includes(parsed.protocol) && parsed.host === "auth" && parsed.pathname === "/callback";
  if ((!web && !native) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("Invalid GRINDX_AUTH_REDIRECT_URL: use an HTTPS callback, localhost, or the app's auth callback.");
  return parsed.href;
}

function outputPath(requested) {
  const out = path.resolve(requested || path.join(ROOT, "dist", "cloud"));
  const dist = path.join(ROOT, "dist");
  // This build only owns a named child of dist, never web/, the repo, or a
  // caller-supplied absolute directory elsewhere on the computer.
  if (!out.startsWith(dist + path.sep)) throw new Error("Cloud output must be a child of dist/.");
  for (let item = out; item !== ROOT; item = path.dirname(item)) {
    if (fs.existsSync(item) && fs.lstatSync(item).isSymbolicLink()) throw new Error("Cloud output must not traverse a symbolic link.");
  }
  return out;
}

function pageUrls(domain) {
  if (domain == null || domain === "") return {};
  if (typeof domain !== "string" || /[\s\\]/.test(domain)) throw new Error("Invalid site domain: use HTTPS without credentials.");
  const origin = new URL(domain.includes("://") ? domain : "https://" + domain);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash)
    throw new Error("Invalid site domain: use an HTTPS origin without credentials.");
  return { privacyUrl: origin.origin + "/privacy", supportUrl: origin.origin + "/support" };
}

/* A tester's beta: one named person and a last day. Both are checked here so a
 * typo never ships: a name of letters, digits, spaces and . ' - up to 40, and a
 * real date from today to 180 days out. The build goes to its own folder, never
 * over dist/cloud/, so the live build and a tester's copy cannot be mixed up. */
function betaOption(name, until, today = new Date()) {
  if ((name == null || name === "") && (until == null || until === "")) return undefined;
  if (typeof name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9 .'-]{0,39}$/.test(name.trim()))
    throw new Error("GRINDX_BETA_NAME: the tester's name, letters, digits, spaces and . ' - only, up to 40.");
  if (typeof until !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(until)) throw new Error("GRINDX_BETA_UNTIL: the last day, as YYYY-MM-DD.");
  const day = new Date(until + "T12:00:00Z");
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== until) throw new Error("GRINDX_BETA_UNTIL is not a real date.");
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12);
  const days = Math.round((day.getTime() - start) / 86400000);
  if (days < 0) throw new Error("GRINDX_BETA_UNTIL is in the past.");
  if (days > 180) throw new Error("GRINDX_BETA_UNTIL is more than 180 days out; a beta is short-lived on purpose.");
  return { name: name.trim(), until };
}
function betaSlug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tester"; }

function build({ url, anonKey, redirectTo, outDir, beta, associations = true } = {}) {
  const contactFile = path.join(ROOT, "site", "contact.json");
  const contact = fs.existsSync(contactFile) ? JSON.parse(fs.readFileSync(contactFile, "utf8")) : {};
  const pages = pageUrls(contact.domain);
  if (!url || !anonKey) {
    throw new Error("Set GRINDX_SUPABASE_URL and GRINDX_SUPABASE_ANON_KEY (the anon / public key, never the service key).");
  }
  let project;
  try { project = new URL(url); } catch (_) { throw new Error("GRINDX_SUPABASE_URL must be an https:// project origin."); }
  if (project.protocol !== "https:" || project.username || project.password || project.pathname !== "/" || project.search || project.hash || /[\s\\]/.test(url)) throw new Error("GRINDX_SUPABASE_URL must be an https:// project origin.");
  url = project.origin;
  if (!publicKey(anonKey)) throw new Error("Use a publishable or legacy anon public key; a service key or secret key must never ship.");
  redirectTo = authRedirect(redirectTo);

  if (beta && !outDir) outDir = path.join(ROOT, "dist", "beta-" + betaSlug(beta.name));
  if (beta && path.resolve(outDir) === path.join(ROOT, "dist", "cloud")) throw new Error("A beta build never goes to dist/cloud/, the live build.");
  outDir = outputPath(outDir);
  // Check all required input before removing any previous successful build.
  let html = fs.readFileSync(path.join(WEB, "index.html"), "utf8");
  if (!html.includes(ANCHOR)) throw new Error("Could not find the injection anchor in index.html; the build layout changed.");
  if (html.includes("gridlock-config.js")) throw new Error("index.html already references the cloud config — refusing to double-inject.");
  const adapter = fs.readFileSync(ADAPTER);
  const workerPath = path.join(WEB, "sw.js");
  const worker = fs.existsSync(workerPath) ? fs.readFileSync(workerPath, "utf8") : null;
  if (worker !== null && !worker.includes('"apple-touch-icon.png"]')) throw new Error("Could not find the service worker's file list; the build layout changed.");
  if (worker !== null && !/const VERSION = ["'][^"']*["'];/.test(worker)) throw new Error("Service worker VERSION declaration was not found.");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // The web app, verbatim.
  fs.cpSync(WEB, outDir, { recursive: true });

  // The adapter, and the config that names the project.
  fs.writeFileSync(path.join(outDir, "gridlock-cloud.js"), adapter);
  fs.writeFileSync(path.join(outDir, "gridlock-config.js"),
    "/* Generated by scripts/cloud-build.js — do not edit; re-run the build. */\n" +
    "window.GRIDLOCK_CLOUD = " + JSON.stringify({ url, anonKey, ...(redirectTo ? { redirectTo } : {}), ...pages, ...(beta ? { beta } : {}) }) + ";\n");

  // The live web app's host is where a coach's browser saved his password, so
  // it serves the same association files as the site — the ones npm run
  // contact keeps in site/.well-known — and the phone apps can offer that
  // password (iCloud Keychain, Google Password Manager). Copied, never
  // regenerated, so the two hosts cannot disagree. A phone shell is not a
  // website, so the native builds leave them out.
  const known = path.join(ROOT, "site", ".well-known");
  if (associations && fs.existsSync(known)) {
    fs.mkdirSync(path.join(outDir, ".well-known"), { recursive: true });
    for (const name of ["apple-app-site-association", "assetlinks.json"])
      if (fs.existsSync(path.join(known, name))) fs.copyFileSync(path.join(known, name), path.join(outDir, ".well-known", name));
  }

  // Wire them in, config first, before the app boots.
  const idx = path.join(outDir, "index.html");
  html = html.replace(ANCHOR, ANCHOR + '\n<script src="gridlock-config.js"></script>\n<script src="gridlock-cloud.js"></script>');
  fs.writeFileSync(idx, html);

  // The service worker caches the shell by name, and these two are not in its
  // list: opened once and then offline, the cloud build came up without its
  // adapter — no cloud sign-in and no offline fallback. They join the list,
  // and the cache gets its own version so the change reaches a phone.
  const sw = path.join(outDir, "sw.js");
  if (fs.existsSync(sw)) {
    const before = fs.readFileSync(sw, "utf8");
    const list = before.replace('"apple-touch-icon.png"]', '"apple-touch-icon.png", "gridlock-config.js", "gridlock-cloud.js"]');
    if (list === before) throw new Error("Could not find the service worker's file list; the build layout changed.");
    const hash = require("node:crypto").createHash("sha256");
    function fingerprint(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) fingerprint(file);
        else { hash.update(path.relative(outDir, file).replace(/\\/g, "/") + "\0"); hash.update(fs.readFileSync(file)); hash.update("\0"); }
      }
    }
    fingerprint(outDir);
    const stamp = hash.digest("hex").slice(0, 12);
    const after = list.replace(/const VERSION = ["'][^"']*["'];/, `const VERSION = "gridlock-cloud-${stamp}";`);
    if (after === list) throw new Error("Service worker VERSION declaration was not found.");
    fs.writeFileSync(sw, after);
  }

  return { outDir, host: url.replace(/\/+$/, "") };
}

function configuredOptions(env = process.env) {
  const cloud = JSON.parse(fs.readFileSync(path.join(ROOT, "site/contact.json"), "utf8")).cloud || {};
  const beta = betaOption(env.GRINDX_BETA_NAME, env.GRINDX_BETA_UNTIL);
  return { url: env.GRINDX_SUPABASE_URL || cloud.url, anonKey: env.GRINDX_SUPABASE_ANON_KEY || cloud.anonKey,
    redirectTo: env.GRINDX_AUTH_REDIRECT_URL || cloud.redirectTo, ...(beta ? { beta } : {}) };
}
module.exports = { build, pageUrls, configuredOptions, betaOption };

if (require.main === module) {
  try {
    const r = build(configuredOptions());
    console.log(`Cloud build → ${path.relative(ROOT, r.outDir)}/  (project ${r.host})`);
    const o = configuredOptions();
    if (o.beta) console.log(`Beta for ${o.beta.name}, last day ${o.beta.until}. Host it at its own address, never over the live app.`);
    console.log("Point Capacitor's webDir at it (or serve it) for a build with League sync on.");
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

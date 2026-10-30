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

function build({ url, anonKey, redirectTo, outDir } = {}) {
  if (!url || !anonKey) {
    throw new Error("Set GRINDX_SUPABASE_URL and GRINDX_SUPABASE_ANON_KEY (the anon / public key, never the service key).");
  }
  let project;
  try { project = new URL(url); } catch (_) { throw new Error("GRINDX_SUPABASE_URL must be an https:// project origin."); }
  if (project.protocol !== "https:" || project.username || project.password || project.pathname !== "/" || project.search || project.hash || /[\s\\]/.test(url)) throw new Error("GRINDX_SUPABASE_URL must be an https:// project origin.");
  url = project.origin;
  if (!publicKey(anonKey)) throw new Error("Use a publishable or legacy anon public key; a service key or secret key must never ship.");
  redirectTo = authRedirect(redirectTo);

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
    "window.GRIDLOCK_CLOUD = " + JSON.stringify({ url, anonKey, ...(redirectTo ? { redirectTo } : {}) }) + ";\n");

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

module.exports = { build };

if (require.main === module) {
  try {
    const r = build({ url: process.env.GRINDX_SUPABASE_URL, anonKey: process.env.GRINDX_SUPABASE_ANON_KEY, redirectTo: process.env.GRINDX_AUTH_REDIRECT_URL });
    console.log(`Cloud build → ${path.relative(ROOT, r.outDir)}/  (project ${r.host})`);
    console.log("Point Capacitor's webDir at it (or serve it) for a build with League sync on.");
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

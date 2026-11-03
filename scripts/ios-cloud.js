#!/usr/bin/env node
"use strict";
/* The iPhone app with real accounts.
 *
 * OPEN-IN-XCODE.command packages the committed web/, which has no account
 * server behind it: its sign-in is a lock kept on that one phone, and a coach's
 * gridlockpb.com account does not exist there. This packages the cloud build
 * instead (scripts/cloud-build.js), the same one the live web app runs, with
 * the native callback gridlock://auth/callback, and syncs it into the iOS shell.
 *
 * It reads the two PUBLIC values from the environment or from .env.cloud in
 * the project folder (git-ignored):
 *
 *   GRINDX_SUPABASE_URL=https://<project>.supabase.co
 *   GRINDX_SUPABASE_ANON_KEY=sb_publishable_...
 *
 * cloud-build.js refuses a secret or service-role key, so none can ship. The
 * committed web/ and capacitor.config.json are left exactly as they were:
 * Capacitor's webDir is pointed at the cloud build only for the length of the
 * sync and put back afterwards, even when the sync fails. `npm run sync` puts
 * the offline build back into the shell.
 *
 *   npm run ios:cloud          # set up, sync the cloud build, open Xcode
 *   npm run ios:cloud -- --no-open   # sync only
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const CONFIG = path.join(ROOT, "capacitor.config.json");
const ENV_FILE = path.join(ROOT, ".env.cloud");
const OUT = path.join(ROOT, "dist", "cloud-ios");
const CALLBACK = "gridlock://auth/callback";
const PUBLIC = path.join(ROOT, "ios", "App", "App", "public");

// KEY=value lines; # comments, trailing " # ..." comments and blank lines are
// skipped, quotes are dropped.
function readEnvFile(file = ENV_FILE) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(line)) continue;
    const m = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    // A quoted value is taken whole; an unquoted one ends at a " #" comment.
    const q = /^(["'])(.*)\1$/.exec(m[2]);
    out[m[1]] = q ? q[2] : m[2].replace(/\s+#.*$/, "");
  }
  return out;
}

function settings(env = process.env, file = readEnvFile()) {
  const pick = key => env[key] || file[key] || "";
  return { url: pick("GRINDX_SUPABASE_URL"), anonKey: pick("GRINDX_SUPABASE_ANON_KEY") };
}

const MISSING = [
  "The iPhone cloud build needs your Supabase project's two public values.",
  "Create a file named .env.cloud in this project folder with these two lines:",
  "",
  "  GRINDX_SUPABASE_URL=https://<your project>.supabase.co",
  "  GRINDX_SUPABASE_ANON_KEY=<the publishable key, starting sb_publishable_>",
  "",
  "Both are in Supabase > Project Settings > API Keys. Use the publishable key,",
  "never the secret or service_role key. Then run this again."
].join("\n");

// Point Capacitor at another web folder for one call, and always put the
// committed file back exactly as it was. A finally block alone does not run
// when the coach presses Ctrl-C or closes the Terminal window mid-sync: the
// signal killed node and left webDir on the cloud build, so the ordinary
// offline launcher would have packaged the cloud app. Handling the signals
// keeps node alive until the sync child returns, then restores and exits.
const SIGNALS = { SIGINT: 2, SIGTERM: 15, SIGHUP: 1 };
function withWebDir(dir, fn, configFile = CONFIG) {
  const before = fs.readFileSync(configFile, "utf8");
  const cfg = JSON.parse(before);
  cfg.webDir = path.relative(path.dirname(configFile), dir).split(path.sep).join("/");
  const restore = () => fs.writeFileSync(configFile, before);
  const handlers = Object.entries(SIGNALS).map(([sig, n]) => {
    const h = () => { restore(); process.exit(128 + n); };
    process.on(sig, h);
    return [sig, h];
  });
  fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2) + "\n");
  try { return fn(); }
  finally {
    restore();
    for (const [sig, h] of handlers) process.removeListener(sig, h);
  }
}

// What the shell must hold after the sync: the cloud adapter, its config with
// the native callback, and no secret.
function verifyShell(dir = PUBLIC) {
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const cfgFile = path.join(dir, "gridlock-config.js");
  const problems = [];
  if (!html.includes('<script src="gridlock-config.js"></script>') || !html.includes('<script src="gridlock-cloud.js"></script>')) problems.push("index.html does not load the cloud config and adapter");
  if (!fs.existsSync(path.join(dir, "gridlock-cloud.js"))) problems.push("gridlock-cloud.js is missing");
  if (!fs.existsSync(cfgFile)) problems.push("gridlock-config.js is missing");
  else {
    const cfg = fs.readFileSync(cfgFile, "utf8");
    if (!cfg.includes(JSON.stringify(CALLBACK).slice(1, -1))) problems.push("gridlock-config.js does not name " + CALLBACK);
    if (/service_role|sb_secret_/.test(cfg)) problems.push("gridlock-config.js carries a secret key");
  }
  return problems;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit", windowsHide: true });
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${path.basename(command)} ${args.join(" ")} failed.`);
}

function main(argv = process.argv.slice(2)) {
  const open = !argv.includes("--no-open");
  const brands = require("./brand").loadBrands();
  const active = require("./configure-native").activeBrand();
  if (active.key !== brands.default) throw new Error(`The cloud iPhone build is for ${brands.brands[brands.default].short}; the shell is switched to ${active.short}. Run npm run brand native ${brands.default} first.`);

  const webDir = JSON.parse(fs.readFileSync(CONFIG, "utf8")).webDir;
  if (webDir !== "web") throw new Error(`capacitor.config.json points webDir at ${webDir}, not web. Put the committed file back first: git checkout -- capacitor.config.json`);

  const { url, anonKey } = settings();
  if (!url || !anonKey) throw new Error(MISSING);

  if (process.platform === "darwin") {
    require("./xcode").preflight();
    run("npm", ["ci"]);
  } else if (open) {
    throw new Error("Opening Xcode requires a Mac. Use --no-open to sync the cloud build into ios/ only.");
  }

  const built = require("./cloud-build").build({ url, anonKey, redirectTo: CALLBACK, outDir: OUT });
  console.log(`Cloud build for the iPhone app: ${path.relative(ROOT, built.outDir)}/ (project ${built.host}, callback ${CALLBACK}).`);

  const cli = path.join(ROOT, "node_modules/@capacitor/cli/bin/capacitor");
  if (!fs.existsSync(cli)) throw new Error("Native dependencies are missing. Run npm ci first.");
  const configure = require("./configure-native").configure;
  configure();
  withWebDir(OUT, () => run(process.execPath, ["--require", path.join(__dirname, "native-env.js"), cli, "sync", "ios"]));
  require("./native").normalisePaths();
  configure();

  const problems = verifyShell();
  if (problems.length) throw new Error("The iPhone shell did not take the cloud build: " + problems.join("; ") + ".");
  console.log("The iPhone shell now holds the cloud build: sign-in uses your gridlockpb.com accounts.");
  console.log(`Add ${CALLBACK} to Supabase > Authentication > URL Configuration > Redirect URLs, or email links will not come back to the app.`);
  console.log("Before git pull, run npm run sync: it puts the offline build back, so the two changed files in ios/ do not block the pull.");

  if (open) {
    run("open", [path.join(ROOT, "ios/App/App.xcworkspace")]);
    console.log("Opened App.xcworkspace. Select an iPhone simulator and press Run.");
  }
}

module.exports = { readEnvFile, settings, withWebDir, verifyShell, CALLBACK, MISSING };

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

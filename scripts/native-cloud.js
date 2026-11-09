#!/usr/bin/env node
"use strict";
/* The phone apps with real accounts, on both platforms.
 *
 * The ordinary sync (npm run sync) packages the committed web/, which has no
 * account server behind it: its sign-in is a lock kept on that one phone, and
 * a coach's gridlockpb.com account does not exist there. This packages the
 * cloud build instead (scripts/cloud-build.js), the same one the live web app
 * runs, with the native callback <scheme>://auth/callback, and syncs it into
 * the iPhone or Android shell. A store build is always this one: the release
 * guards in the shells refuse an offline copy (scripts/configure-native.js).
 *
 * It needs the Supabase project's two PUBLIC values, read in this order:
 * the environment, .env.cloud in the project folder (git-ignored), then the
 * owner-confirmed `cloud` block in site/contact.json. cloud-build.js refuses
 * a secret or service-role key, so none can ship.
 *
 * The committed web/ and capacitor.config.json are left exactly as they were:
 * Capacitor's webDir is pointed at the cloud build only for the length of the
 * sync and put back afterwards, even when the sync fails or is interrupted.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const CONFIG = path.join(ROOT, "capacitor.config.json");
const ENV_FILE = path.join(ROOT, ".env.cloud");
const CONTACT = path.join(ROOT, "site", "contact.json");

const PLATFORMS = {
  ios: {
    label: "iPhone",
    out: path.join(ROOT, "dist", "cloud-ios"),
    shell: path.join(ROOT, "ios", "App", "App", "public"),
    store: "Product > Archive in Xcode",
  },
  android: {
    label: "Android",
    out: path.join(ROOT, "dist", "cloud-android"),
    shell: path.join(ROOT, "android", "app", "src", "main", "assets", "public"),
    store: "npm run bundle:android",
  },
};

// The callback is the default build's scheme: the cloud build is only ever
// made for it, and its scheme is what Supabase's redirect allowlist names.
function callbackFor(scheme = defaultScheme()) { return `${scheme}://auth/callback`; }
function defaultScheme() {
  try {
    const brands = JSON.parse(fs.readFileSync(path.join(ROOT, "brand/brands.json"), "utf8"));
    return brands.brands[brands.default].scheme;
  } catch { return "gridlock"; }
}
const CALLBACK = callbackFor();

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
function contactCloud(file = CONTACT) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")).cloud || {}; } catch { return {}; }
}
// The environment, then .env.cloud, then the confirmed public values in
// site/contact.json. A key is taken from one place only, so a stray URL in
// one file can never be paired with a key from another project.
function settings(env = process.env, file = readEnvFile(), contact = contactCloud()) {
  for (const source of [env, file]) {
    if (source.GRINDX_SUPABASE_URL || source.GRINDX_SUPABASE_ANON_KEY)
      return { url: source.GRINDX_SUPABASE_URL || "", anonKey: source.GRINDX_SUPABASE_ANON_KEY || "" };
  }
  return { url: contact.url || "", anonKey: contact.anonKey || "" };
}

const MISSING = [
  "The cloud phone build needs your Supabase project's two public values.",
  "They normally come from site/contact.json (\"cloud\"). To use another project,",
  "create a file named .env.cloud in this project folder with these two lines:",
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

// What a shell must hold after the sync: the cloud adapter, its config with
// the native callback, and no secret. The release guards in Xcode and Gradle
// check the same three things before a store build.
function verifyShell(dir, callback = CALLBACK) {
  const problems = [];
  const index = path.join(dir, "index.html");
  const html = fs.existsSync(index) ? fs.readFileSync(index, "utf8") : "";
  const cfgFile = path.join(dir, "gridlock-config.js");
  if (!html.includes('<script src="gridlock-config.js"></script>') || !html.includes('<script src="gridlock-cloud.js"></script>')) problems.push("index.html does not load the cloud config and adapter");
  if (!fs.existsSync(path.join(dir, "gridlock-cloud.js"))) problems.push("gridlock-cloud.js is missing");
  if (!fs.existsSync(cfgFile)) problems.push("gridlock-config.js is missing");
  else {
    const cfg = fs.readFileSync(cfgFile, "utf8");
    if (!cfg.includes(JSON.stringify(callback).slice(1, -1))) problems.push("gridlock-config.js does not name " + callback);
    if (/service_role|sb_secret_/.test(cfg)) problems.push("gridlock-config.js carries a secret key");
  }
  return problems;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit", windowsHide: true });
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${path.basename(command)} ${args.join(" ")} failed.`);
}

function buildFor(platform, { url, anonKey } = {}) {
  const p = PLATFORMS[platform];
  if (!p) throw new Error("Platform must be ios or android.");
  return require("./cloud-build").build({ url, anonKey, redirectTo: CALLBACK, outDir: p.out, associations: false });
}

// Build the cloud app and put it in one shell. Throws one sentence naming what
// to fix; leaves capacitor.config.json as it was whatever happens.
function syncCloud(platform, { quiet = false } = {}) {
  const p = PLATFORMS[platform];
  if (!p) throw new Error("Platform must be ios or android.");
  const say = quiet ? () => {} : msg => console.log(msg);
  const brands = require("./brand").loadBrands();
  const active = require("./configure-native").activeBrand();
  if (active.key !== brands.default) throw new Error(`The cloud ${p.label} build is for ${brands.brands[brands.default].short}; the shell is switched to ${active.short}. Run npm run brand native ${brands.default} first. (The ${active.short} build has no account server: to release it as it is, set GRIDLOCK_OFFLINE_RELEASE=1.)`);
  const webDir = JSON.parse(fs.readFileSync(CONFIG, "utf8")).webDir;
  if (webDir !== "web") throw new Error(`capacitor.config.json points webDir at ${webDir}, not web. Put the committed file back first: git checkout -- capacitor.config.json`);
  const { url, anonKey } = settings();
  if (!url || !anonKey) throw new Error(MISSING);

  const built = buildFor(platform, { url, anonKey });
  say(`Cloud build for the ${p.label} app: ${path.relative(ROOT, built.outDir)}/ (project ${built.host}, callback ${CALLBACK}).`);

  const cli = path.join(ROOT, "node_modules/@capacitor/cli/bin/capacitor");
  if (!fs.existsSync(cli)) throw new Error("Native dependencies are missing. Run npm ci first.");
  const configure = require("./configure-native").configure;
  configure();
  withWebDir(p.out, () => run(process.execPath, ["--require", path.join(__dirname, "native-env.js"), cli, "sync", platform]));
  require("./native").normalisePaths();
  configure();

  const problems = verifyShell(p.shell);
  if (problems.length) throw new Error(`The ${p.label} shell did not take the cloud build: ${problems.join("; ")}.`);
  say(`The ${p.label} shell now holds the cloud build: sign-in uses your gridlockpb.com accounts.`);
  say(`Supabase > Authentication > URL Configuration > Redirect URLs must list ${CALLBACK}, or email links will not come back to the app.`);
  return built;
}

// Put the offline build back in one shell, the way npm run sync does.
function syncOffline(platform) {
  run(process.execPath, [path.join(__dirname, "native.js"), "sync", platform]);
}

module.exports = { PLATFORMS, CALLBACK, MISSING, callbackFor, readEnvFile, contactCloud, settings, withWebDir, verifyShell, buildFor, syncCloud, syncOffline, run };

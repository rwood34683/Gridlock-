#!/usr/bin/env node
"use strict";
/* The iPhone app with real accounts. The work is shared with Android in
 * scripts/native-cloud.js; this adds the Mac's own steps — the tool check,
 * npm ci and opening Xcode.
 *
 *   npm run ios:cloud                  # check tools, sync the cloud build, open Xcode
 *   npm run ios:cloud -- --no-open     # sync only (any computer)
 *
 * A store archive must be made from this, never from the offline sync: the
 * release guard in the Xcode project refuses an offline copy.
 */
const path = require("node:path");
const nc = require("./native-cloud");
const ROOT = path.resolve(__dirname, "..");

const buildIOS = (opts = {}) => nc.buildFor("ios", opts);
const verifyShell = (dir = nc.PLATFORMS.ios.shell) => nc.verifyShell(dir);

function main(argv = process.argv.slice(2)) {
  const open = !argv.includes("--no-open");
  if (process.platform === "darwin") {
    require("./xcode").preflight();
    nc.run("npm", ["ci"]);
  } else if (open) {
    throw new Error("Opening Xcode requires a Mac. Use --no-open to sync the cloud build into ios/ only.");
  }
  nc.syncCloud("ios");
  console.log("Before git pull, run npm run sync: it puts the offline build back, so the files changed in ios/ do not block the pull.");
  if (open) {
    nc.run("open", [path.join(ROOT, "ios/App/App.xcworkspace")]);
    console.log("Opened App.xcworkspace. Select an iPhone simulator and press Run; for the App Store, Product > Archive.");
  }
}

module.exports = { buildIOS, readEnvFile: nc.readEnvFile, settings: nc.settings, withWebDir: nc.withWebDir, verifyShell, CALLBACK: nc.CALLBACK, MISSING: nc.MISSING };

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

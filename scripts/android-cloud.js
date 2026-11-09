#!/usr/bin/env node
"use strict";
/* The Android app with real accounts — the same cloud build as the iPhone and
 * the live web app, synced into android/ with the callback gridlock://auth/callback.
 * The work is shared with iOS in scripts/native-cloud.js.
 *
 *   npm run android:cloud              # sync the cloud build, open Android Studio
 *   npm run android:cloud -- --no-open # sync only
 *
 * npm run bundle:android and build:android do this themselves before a store
 * build and put the offline build back afterwards; the release guard in
 * android/app refuses a release built from the offline copy.
 */
const nc = require("./native-cloud");

const buildAndroid = (opts = {}) => nc.buildFor("android", opts);
const verifyShell = (dir = nc.PLATFORMS.android.shell) => nc.verifyShell(dir);

function main(argv = process.argv.slice(2)) {
  const open = !argv.includes("--no-open");
  nc.syncCloud("android");
  console.log("Before git pull, run npm run sync: it puts the offline build back, so the files changed in android/ do not block the pull.");
  if (open) nc.run(process.execPath, [require("node:path").join(__dirname, "native.js"), "open", "android"]);
}

module.exports = { buildAndroid, verifyShell, main };

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

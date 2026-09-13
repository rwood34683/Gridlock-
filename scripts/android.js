#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const ROOT = path.resolve(__dirname, "..");
const { probeCommand, describe } = require("./toolcheck");
const probe1 = (name, args) => probeCommand(name, args, ROOT);

/* What is wrong with this machine for an Android build, all of it, at once.
 *
 * iOS has had this since the Mac cost an evening: Node, then CocoaPods, then
 * the Xcode version, each learned an hour apart. Android had nothing. Gradle
 * says it in its own words instead — after a download, in a wall of stack
 * trace, one cause at a time — and "Unsupported class file major version" is
 * not a sentence that tells a coach to install JDK 21.
 *
 * A pure function over the readings, for the same reason as the iOS one: the
 * machine that needs to test this has no Android SDK either.
 */
function evaluate(probe) {
  const problems = [];
  const need = (what, have, fix) => problems.push({ what, have, fix });
  const studio = "install Android Studio from https://developer.android.com/studio";

  if (Number(String(probe.node).split(".")[0]) < 22)
    need("Node 22 or newer", `you have ${probe.node}`,
      probe.mac ? "brew install node" : "install Node 22 from https://nodejs.org");

  if (probe.java === null)
    need("JDK 21", "no java on this machine",
      probe.mac ? "brew install openjdk@21" : "install JDK 21, or let Android Studio install it");
  else {
    const major = Number((probe.java.match(/version "?(\d+)/) || [])[1]);
    if (!Number.isFinite(major)) need("JDK 21", "java answered something unreadable", studio);
    else if (major < 21) need("JDK 21 or newer", `you have Java ${major}`,
      probe.mac ? "brew install openjdk@21" : "install JDK 21");
  }

  if (!probe.sdkRoot)
    need("the Android SDK", "ANDROID_HOME and ANDROID_SDK_ROOT are both unset",
      `${studio}, open it once so it installs the SDK, then set ANDROID_HOME to that folder`);
  else if (!probe.sdkExists)
    need("the Android SDK folder", `${probe.sdkRoot} does not exist`,
      "point ANDROID_HOME at the SDK folder Android Studio actually created");
  else if (!probe.platform36)
    need("Android SDK platform 36", "installed SDKs: " + (probe.platforms.join(", ") || "none"),
      "Android Studio > Settings > Languages & Frameworks > Android SDK — tick API 36");

  return problems;
}

function probe() {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
    || [path.join(os.homedir(), "Library/Android/sdk"), path.join(os.homedir(), "Android/Sdk"),
        path.join(os.homedir(), "AppData/Local/Android/Sdk")].find(p => fs.existsSync(p)) || "";
  const platformsDir = sdkRoot && path.join(sdkRoot, "platforms");
  let platforms = [];
  try { platforms = fs.readdirSync(platformsDir).filter(n => n.startsWith("android-")); } catch { platforms = []; }
  // java -version writes its version to STDERR and exits 0, so reading stdout
  // alone gets an empty string from a perfectly good JDK — and an empty string
  // is not null, so a ?? fallback never fires. Read both streams, and let
  // "nothing at all" be the only thing that counts as absent.
  const java = (() => {
    const { spawnSync } = require("node:child_process");
    const r = spawnSync("java", ["-version"], { encoding: "utf8", stdio: "pipe" });
    if (r.error) return null;
    return (`${r.stderr || ""}\n${r.stdout || ""}`).trim() || null;
  })();
  return {
    mac: process.platform === "darwin",
    node: process.versions.node,
    java,
    sdkRoot,
    sdkExists: !!sdkRoot && fs.existsSync(sdkRoot),
    platforms,
    platform36: platforms.some(n => Number(n.split("-")[1]) >= 36),
  };
}

function preflight() {
  const readings = probe();
  const problems = evaluate(readings);
  if (problems.length) throw new Error(describe("GRIDLOCK cannot build for Android yet.", problems));
  console.log(`Ready: Node ${readings.node}, ${((readings.java || "").split("\n").find(l => /version/.test(l)) || "java").trim()}, SDK ${readings.sdkRoot}, platforms ${readings.platforms.join(", ")}.`);
}

if (require.main === module) { try { preflight(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { preflight, evaluate };

#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
function command(name, args, capture = false) {
  const result = spawnSync(name, args, { cwd: ROOT, encoding: "utf8", stdio: capture ? "pipe" : "inherit", windowsHide: true });
  if (result.error) throw new Error(`${name} is unavailable. ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${name} ${args.join(" ")} failed. ${(result.stderr || result.stdout || "").trim()}`);
  return (result.stdout || "").trim();
}
const { probeCommand, describe } = require("./toolcheck");
const probe1 = (name, args) => probeCommand(name, args, ROOT);

/* What is wrong with this Mac, all of it, in one answer.
 *
 * This used to throw on the first thing it found, which is the difference
 * between one trip to the kitchen and four. A Mac carrying last year's tools
 * fails Node, then CocoaPods, then the Xcode version — and each one is a
 * separate install, a separate download, a separate attempt at a password
 * prompt that shows nothing as you type. You learned them one at a time, an
 * hour apart, with a copy of the project already sitting on the Mac.
 *
 * So it is a pure function over what was probed: hand it the readings, get
 * back every problem with the command that fixes it. Pure because the useful
 * test for this runs on the machine that cannot run any of these tools.
 */
function evaluate(probe) {
  const problems = [];
  const need = (what, have, fix) => problems.push({ what, have, fix });

  if (Number(String(probe.node).split(".")[0]) < 22)
    need("Node 22 or newer", `you have ${probe.node}`, "brew install node");

  if (probe.pods === null)
    need("CocoaPods", "not installed", "brew install cocoapods");

  if (probe.npm === null)
    need("npm", "not installed", "it comes with Node — brew install node");

  if (probe.selected === null)
    need("Xcode command line tools", "xcode-select found nothing",
      "install Xcode from the App Store, open it once, accept the licence");
  else if (probe.selected.includes("CommandLineTools"))
    need("the full Xcode, not just its command line tools", probe.selected,
      "Xcode > Settings > Locations > Command Line Tools — choose the Xcode entry");

  if (probe.xcode === null) {
    if (probe.selected && !probe.selected.includes("CommandLineTools"))
      need("a working xcodebuild", "it did not answer",
        "open Xcode once and accept its licence, then try again");
  } else {
    const major = Number((probe.xcode.match(/Xcode (\d+)/) || [])[1]);
    if (!(major >= 26))
      need("Xcode 26 or newer", probe.xcode.split("\n")[0],
        "update Xcode in the App Store, then select it in Xcode > Settings > Locations");
  }

  if (probe.sdk === null)
    need("the iOS simulator SDK", "not installed",
      "Xcode > Settings > Components — install an iOS 26 or newer simulator");
  else if (!(Number.parseFloat(probe.sdk) >= 26))
    need("iOS simulator SDK 26 or newer", `you have ${probe.sdk}`,
      "Xcode > Settings > Components — install an iOS 26 or newer simulator");

  return problems;
}

function preflight() {
  if (process.platform !== "darwin") throw new Error("Xcode requires a Mac. Copy this entire project to macOS and open OPEN-IN-XCODE.command; see docs/XCODE.md.");
  const probe = {
    node: process.versions.node,
    selected: probe1("xcode-select", ["-p"]),
    xcode: probe1("xcodebuild", ["-version"]),
    sdk: probe1("xcrun", ["--sdk", "iphonesimulator", "--show-sdk-version"]),
    pods: probe1("pod", ["--version"]),
    npm: probe1("npm", ["--version"]),
  };
  const problems = evaluate(probe);
  if (problems.length) throw new Error(describe("GRIDLOCK cannot open Xcode yet.", problems));
  command("xcodebuild", ["-checkFirstLaunchStatus"], true);
  console.log(`Ready: ${probe.xcode.split("\n")[0]}, iOS simulator SDK ${probe.sdk}, Node ${probe.node}, CocoaPods ${probe.pods}, npm ${probe.npm}.`);
}
function main() {
  const action = process.argv[2] || "setup";
  if (!["preflight", "setup", "build"].includes(action)) throw new Error("Use xcode.js preflight|setup|build.");
  // Nothing is installed or modified until every required local tool is present.
  preflight();
  if (action === "preflight") return;
  if (action === "setup") command("npm", ["ci"]);
  if (!fs.existsSync(path.join(ROOT, "node_modules/@capacitor/cli"))) throw new Error("Run npm ci before building, or use OPEN-IN-XCODE.command for first setup.");
  command(process.execPath, [path.join(__dirname, "native.js"), "sync", "ios"]);
  command(process.execPath, [path.join(__dirname, "native-check.js"), "--ios"]);
  if (action === "setup") {
    command("open", [path.join(ROOT, "ios/App/App.xcworkspace")]);
    console.log("Opened App.xcworkspace. Select an iPhone simulator and press Run. Device signing is configured in Xcode.");
  } else {
    command("xcodebuild", ["-workspace", "ios/App/App.xcworkspace", "-scheme", "App", "-configuration", "Debug", "-sdk", "iphonesimulator", "-destination", "generic/platform=iOS Simulator", "-derivedDataPath", "ios/DerivedData", "CODE_SIGNING_ALLOWED=NO", "build"]);
  }
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { preflight, evaluate };

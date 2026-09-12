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
function preflight() {
  if (process.platform !== "darwin") throw new Error("Xcode requires a Mac. Copy this entire project to macOS and open OPEN-IN-XCODE.command; see docs/XCODE.md.");
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Install Node.js 22 or newer before running setup.");
  const selected = command("xcode-select", ["-p"], true);
  if (selected.includes("CommandLineTools")) throw new Error("Select the full Xcode installation in Xcode > Settings > Locations > Command Line Tools.");
  const version = command("xcodebuild", ["-version"], true);
  const major = Number((version.match(/Xcode (\d+)/) || [])[1]);
  if (!(major >= 26)) throw new Error("GRIDLOCK requires Xcode 26 or newer. Select that installation in Xcode Settings.");
  const sdk = command("xcrun", ["--sdk", "iphonesimulator", "--show-sdk-version"], true);
  if (!(Number.parseFloat(sdk) >= 26)) throw new Error("Install the iOS 26 or newer platform in Xcode Settings > Components.");
  command("xcodebuild", ["-checkFirstLaunchStatus"], true);
  const pods = command("pod", ["--version"], true);
  const npm = command("npm", ["--version"], true);
  console.log(`Ready: ${version.split("\n")[0]}, iOS simulator SDK ${sdk}, Node ${process.versions.node}, CocoaPods ${pods}, npm ${npm}.`);
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
module.exports = { preflight };

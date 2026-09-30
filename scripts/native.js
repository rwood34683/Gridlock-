#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
function run(command, args, cwd = ROOT) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", windowsHide: true });
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status ?? result.signal}).`);
}
function cap(...args) {
  const cli = path.join(ROOT, "node_modules/@capacitor/cli/bin/capacitor");
  if (!fs.existsSync(cli)) throw new Error("Native dependencies are missing. Run npm ci first.");
  run(process.execPath, ["--require", path.join(__dirname, "native-env.js"), cli, ...args]);
}
function requireMac() {
  if (process.platform !== "darwin") throw new Error("Opening or compiling iOS requires macOS, Xcode and CocoaPods. The Xcode source project is included in ios/App.");
}
function normalisePaths() {
  // Capacitor resolves pnpm symlinks when generating project references. The
  // public node_modules paths work after either npm ci or pnpm install.
  for (const relative of ["ios/App/Podfile", "android/capacitor.settings.gradle"]) {
    const file = path.join(ROOT, relative);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8").replace(/node_modules\/\.pnpm\/[^/'"]+\/node_modules\//g, "node_modules/");
    fs.writeFileSync(file, text);
  }
}
function main() {
  const [action = "sync", platform, ...extra] = process.argv.slice(2);
  if (!["sync", "setup", "open", "build"].includes(action)) throw new Error("Use native.js sync|setup|open|build [android|ios].");
  if (platform && !["android", "ios"].includes(platform)) throw new Error("Platform must be android or ios.");
  if (["open", "build"].includes(action) && !platform) throw new Error("Choose android or ios.");
  if (platform === "ios" && (action === "open" || action === "build" || extra.includes("--open"))) requireMac();
  const platforms = platform ? [platform] : ["android", "ios"];
  for (const name of platforms) {
    if (!fs.existsSync(path.join(ROOT, name))) {
      if (action !== "setup") throw new Error(`${name}/ is missing. Run npm run native:setup first.`);
      if (name === "ios") cap("add", name, "--packagemanager", "CocoaPods");
      else cap("add", name);
    }
    if (action === "open") { cap("open", name); continue; }
    require("./configure-native").configure();
    cap("sync", name);
    normalisePaths();
    require("./configure-native").configure();
    if (action === "build") {
      if (name !== "android") throw new Error("Archive the iOS app in Xcode after npm run ios:setup.");
      const task = extra[0] || "assembleDebug";
      if (!["assembleDebug", "assembleRelease", "bundleRelease"].includes(task)) throw new Error("Unsupported Gradle task.");
      if (task.endsWith("Release") && !fs.existsSync(path.join(ROOT, "android/keystore.properties"))) throw new Error("Release signing is not configured. Copy android/keystore.properties.example to keystore.properties and provide your upload keystore. Use npm run build:android:debug for local testing.");
      if (process.platform === "win32") run(process.env.COMSPEC || "cmd.exe", ["/d", "/c", "gradlew.bat", task], path.join(ROOT, "android"));
      else run("sh", ["./gradlew", task], path.join(ROOT, "android"));
    }
    if (extra.includes("--open")) cap("open", name);
  }
  if (platforms.includes("ios") && process.platform !== "darwin") console.log("iOS source synced. Install pods and compile on a Mac using npm run ios:setup.");
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { normalisePaths };

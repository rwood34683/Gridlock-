"use strict";
/* One portable browser choice shared by tests and screenshot generators. */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
function chromePath() {
  if (process.env.CHROME_PATH) {
    if (!fs.existsSync(process.env.CHROME_PATH)) throw new Error(`CHROME_PATH does not exist: ${process.env.CHROME_PATH}`);
    return process.env.CHROME_PATH;
  }
  const { chromium } = require("playwright-core");
  const candidates = [chromium.executablePath()];
  if (process.platform === "win32") {
    for (const base of [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean)) {
      candidates.push(path.join(base, "Google/Chrome/Application/chrome.exe"), path.join(base, "Microsoft/Edge/Application/msedge.exe"));
    }
  } else if (process.platform === "darwin") {
    for (const base of ["/Applications", path.join(os.homedir(), "Applications")]) candidates.push(path.join(base, "Google Chrome.app/Contents/MacOS/Google Chrome"), path.join(base, "Microsoft Edge.app/Contents/MacOS/Microsoft Edge"));
  } else {
    candidates.push("/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/opt/google/chrome/chrome");
  }
  const found = candidates.find(candidate => candidate && fs.existsSync(candidate));
  if (!found) throw new Error("No Chromium browser found. Run npm run browser:install, or set CHROME_PATH to Chrome/Edge.");
  return found;
}
function launchOptions(overrides = {}) {
  return { executablePath: chromePath(), headless: true, ...overrides };
}
module.exports = { chromePath, launchOptions };

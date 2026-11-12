#!/usr/bin/env node
"use strict";
/* Each invocation owns an ephemeral local server; no second terminal required. */
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createServer } = require("./serve");
const ROOT = path.resolve(__dirname, "..");
const SUITES = {
  "code-rollover": "test/code-rollover.cjs",
  "tally-reset": "test/tally-reset.cjs",
  "ask-first": "test/ask-first.cjs",
  "data-audit": "test/data-audit.cjs",
  "interaction-audit": "test/interaction-audit.cjs",
  "daily-bunkers": "test/daily-bunkers.cjs",
  "match-heat": "test/match-heat.cjs",
  "voice-point": "test/voice-point.cjs",
  "split-deck": "test/split-deck.cjs",
  "rulebooks": "test/rulebooks.cjs",
  "coach-home": "test/coach-home.cjs",
  "field-visible": "test/field-visible.cjs",
  "scout-ends": "test/scout-ends.cjs",
  "device-season": "test/device-season.cjs",
  "practice-sessions": "test/practice-sessions.cjs",
  "teaser-browser": "test/teaser-browser.cjs",
  "player-overview": "test/player-overview.cjs",
  "player-percentages": "test/player-percentages.cjs",
  "player-details": "test/player-details.cjs",
  "coach-flow": "test/coach-flow.cjs", "fresh-start": "test/fresh-start.cjs", "schedule-audit": "test/schedule-audit.cjs", "recording-audit": "test/recording-audit.cjs", "tally-depth": "test/tally-depth.cjs",
  "world-cup": "test/world-cup.cjs",
  "pod-wars": "test/pod-wars.cjs",
  "render-performance": "test/render-performance.cjs",
  "cloud-pages": "test/cloud-pages.js",
  "format-regressions": "test/format-regressions.cjs", "ux-section1": "test/ux-section1.cjs", "ux-section3": "test/ux-section3.cjs", "sync-ask": "test/sync-ask.cjs", "ux-players": "test/ux-players.cjs", "match-review": "test/match-review.cjs", "review-nov6": "test/review-nov6.cjs", "event-data": "test/event-data.cjs", "native-sign-in": "test/native-sign-in.cjs", "game-prep": "test/game-prep.cjs", "sight-standing": "test/sight-standing.cjs", "teasers": "test/teasers.cjs", "league-badges": "test/league-badges.cjs", "install-button": "test/install-button.cjs", "rob-call": "test/rob-call.cjs", "reports": "test/reports.cjs", "ux-tally-review": "test/ux-tally-review.cjs", "ux-review-scout": "test/ux-review-scout.cjs", "ios-cloud": "test/ios-cloud.cjs", "site-links": "test/site-links.cjs",
  dependencies: "test/dependencies.js",
  server: "test/server.js", functions: "test/functions.js", devices: "test/devices.js", bunkers: "tools/verify_bunkers.js",
  load: "test/loadtest.js", offline: "test/offline.js", arrival: "test/arrival.js", "arrival-custom": "test/arrival-custom.js", platform: "test/platform.js",
  "voice-parser": "test/voice-parser.js", voice: "test/voice.js", "speech-native": "test/speech-native.js",
  admin: "test/admin.js", cloud: "test/cloud-adapter.js", "cloud-build": "test/cloud-build.js",
  "cloud-session": "test/cloud-session.js", "account-sync": "test/account-sync.js",
  "cloud-recovery": "test/cloud-recovery.js", "account-recovery": "test/account-recovery.js", "auth-native": "test/auth-native.js",
  "cloud-build-security": "test/cloud-build-security.js",
  "account-entitlements": "test/account-entitlements.cjs", "admin-handler": "test/admin-handler.mjs", "admin-portal": "test/admin-portal.cjs",
  "season-safety":"test/season-safety.cjs", "storage-safety":"test/storage-safety.js", "acceptance-lifecycle":"test/acceptance-lifecycle.cjs", "preview":"test/preview-package.js", "account-deletion":"test/account-deletion.mjs",
  billing: "test/billing-adapter.js", "billing-security": "test/billing-security.js", brands: "test/brands.js"
};
async function main() {
  const names = process.argv.slice(2);
  if (!names.length) names.push(...Object.keys(SUITES));
  for (const name of names) if (!SUITES[name]) throw new Error(`Unknown suite ${name}. Choose ${Object.keys(SUITES).join(", ")}.`);
  let server;
  let active;
  const cleanup = () => { if (active) active.kill(); if (server) { server.closeAllConnections(); server.close(); } };
  const onSignal = () => { cleanup(); process.exit(130); };
  process.once("SIGINT", onSignal); process.once("SIGTERM", onSignal);
  try {
    let url = process.env.APP_URL;
    const needsBrowser = names.some(name => !["dependencies", "server", "voice-parser", "speech-native", "cloud-session", "cloud-recovery", "auth-native", "cloud-build-security", "league-badges", "site-links", "billing-security", "account-entitlements", "admin-handler", "admin-portal", "season-safety", "account-deletion"].includes(name));
    if (!url && needsBrowser) {
      server = createServer();
      await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
      url = `http://127.0.0.1:${server.address().port}/`;
    }
    const env = { ...process.env };
    if (needsBrowser) { env.APP_URL = url; env.CHROME_PATH = require("./browser").chromePath(); }
    for (const name of names) {
      console.log(`\nRunning ${name}${url ? " against " + url : ""}`);
      const code = await new Promise((resolve, reject) => {
        active = spawn(process.execPath, [path.join(ROOT, SUITES[name])], { cwd: ROOT, env, stdio: "inherit", windowsHide: true });
        active.once("error", reject); active.once("exit", code => resolve(code ?? 1));
      });
      active = undefined;
      if (code !== 0) { process.exitCode = code; return; }
    }
  } finally { cleanup(); process.removeListener("SIGINT", onSignal); process.removeListener("SIGTERM", onSignal); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });


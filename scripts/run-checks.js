#!/usr/bin/env node
"use strict";
/* Each invocation owns an ephemeral local server; no second terminal required. */
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createServer } = require("./serve");
const ROOT = path.resolve(__dirname, "..");
const SUITES = {
  server: "test/server.js", functions: "test/functions.js", devices: "test/devices.js", bunkers: "tools/verify_bunkers.js",
  load: "test/loadtest.js", offline: "test/offline.js", arrival: "test/arrival.js", "arrival-custom": "test/arrival-custom.js", platform: "test/platform.js",
  "voice-parser": "test/voice-parser.js", voice: "test/voice.js", "speech-native": "test/speech-native.js"
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
    const needsBrowser = names.some(name => !["server", "voice-parser", "speech-native"].includes(name));
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

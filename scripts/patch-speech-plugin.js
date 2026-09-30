#!/usr/bin/env node
"use strict";
// Source modification of @capgo/capacitor-speech-recognition (MPL-2.0).
// See docs/SPEECH-PLUGIN-NOTICE.md for the upstream source and exact change.
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const plugin = path.join(ROOT, "node_modules/@capgo/capacitor-speech-recognition");
const relative = "android/src/main/java/app/capgo/speechrecognition/SpeechRecognitionPlugin.java";
const before = "public void onResults(Bundle results) {\n            if (isStale()) {\n                return;\n            }\n\n            ArrayList<String> matches = buildMatchesWithUnstableText(results);";
const after = "public void onResults(Bundle results) {\n            if (isStale()) {\n                return;\n            }\n\n            // GRIDLOCK: finalized callbacks must exclude speculative UNSTABLE_TEXT.\n            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);";
function patch() {
  const version = JSON.parse(fs.readFileSync(path.join(plugin, "package.json"), "utf8")).version;
  if (version !== "8.2.0") throw new Error("Review GRIDLOCK's confirmed-results speech patch before changing the speech plugin version.");
  const file = path.join(plugin, relative);
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (text.includes(after)) return;
  if (!text.includes(before) || text.indexOf(before) !== text.lastIndexOf(before)) throw new Error("Speech plugin source changed. The confirmed-results patch could not be safely applied.");
  fs.writeFileSync(file, text.replace(before, after));
  console.log("Applied Android confirmed-results speech patch.");
}
if (require.main === module) {
  try { patch(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { patch, relative, after };

"use strict";
/* One shape for "what is missing on this machine".
 *
 * Both platforms ask the same question and used to answer it differently:
 * iOS threw on the first thing it found, Android did not check at all and let
 * Gradle say it in its own words, several minutes and one download later. A
 * person setting up a Mac learns Node, then CocoaPods, then the Xcode version
 * an hour apart, each a separate install, and each message looks like the last
 * word rather than one of four.
 *
 * So a problem is {what, have, fix} and a report lists all of them with the
 * command for each. The judgement stays a pure function over probe readings in
 * each platform's own file, which is what lets a machine with neither Xcode nor
 * the Android SDK test both.
 */
const { spawnSync } = require("node:child_process");

// Answers "not installed" instead of throwing, so one missing tool cannot hide
// the rest of them.
function probeCommand(name, args, cwd) {
  const result = spawnSync(name, args, { cwd, encoding: "utf8", stdio: "pipe", windowsHide: true });
  if (result.error || result.status !== 0) return null;
  return (result.stdout || "").trim();
}

function describe(headline, problems) {
  const lines = [`${headline} ${problems.length} ${problems.length === 1 ? "thing needs" : "things need"} fixing:`, ""];
  problems.forEach((p, i) => {
    lines.push(`  ${i + 1}. ${p.what}`);
    lines.push(`     now: ${p.have}`);
    lines.push(`     fix: ${p.fix}`);
    lines.push("");
  });
  if (problems.some(p => p.fix.startsWith("brew "))) {
    lines.push("  Homebrew installs those in one command. If `brew` itself is missing, get it");
    lines.push("  from https://brew.sh — its installer asks for your Mac login password, and");
    lines.push("  Terminal shows nothing at all as you type it. That is normal: type it blind,");
    lines.push("  or paste it, and press Return.");
    lines.push("");
  }
  lines.push("  Fix them in any order and run this again. docs/NATIVE-SETUP.md has the detail.");
  return lines.join("\n");
}

module.exports = { probeCommand, describe };

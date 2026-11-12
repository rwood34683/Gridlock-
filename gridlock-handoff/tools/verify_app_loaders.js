#!/usr/bin/env node
"use strict";
/* Evaluate Gridlock Coach's own evdUnpack / readCopy / copyDataError against
   this handoff's event-data and season-copy files. No push, no app changes.

   GRIDLOCK_REPO  path to a clone of https://github.com/rwood34683/Gridlock-
   HANDOFF_ROOT   path to this package (default: parent of tools/)
*/
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const toolsDir = __dirname;
const defaultRoot = path.resolve(toolsDir, "..");
const root = path.resolve(process.env.HANDOFF_ROOT || defaultRoot);
const repo = process.env.GRIDLOCK_REPO || process.argv[2];

function fail(msg) { console.error("FAIL " + msg); process.exitCode = 1; }
function pass(msg) { console.log("PASS " + msg); }

function isRegexStart(src, j) {
  let k = j - 1;
  while (k >= 0 && /[ \t\n\r]/.test(src[k])) k--;
  if (k < 0) return true;
  const prev = src[k];
  if ("=([,!&|?:;~+-*%^<>?".includes(prev)) return true;
  // keyword before the slash (return /x/, && /x/)
  const word = src.slice(Math.max(0, k - 9), k + 1);
  return /(?:^|\W)(?:return|case|typeof|new|void|delete|in|of)$/.test(word);
}
function extractStatement(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) throw new Error("Could not find in index.html: " + needle);
  let depth = 0, inStr = null, inRe = false, esc = false;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (inRe) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === "/") inRe = false;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") { inStr = ch; continue; }
    if (ch === "/" && src[j+1] === "/") { while (j < src.length && src[j] !== "\n") j++; continue; }
    if (ch === "/" && src[j+1] === "*") { const end = src.indexOf("*/", j + 2); j = end < 0 ? src.length : end + 1; continue; }
    if (ch === "/" && isRegexStart(src, j)) { inRe = true; continue; }
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === ";" && depth === 0) return src.slice(i, j + 1);
  }
  throw new Error("Unterminated statement: " + needle);
}

function extractFunction(src, needle) {
  const i = src.indexOf(needle);
  if (i < 0) throw new Error("Could not find in index.html: " + needle);
  const brace = src.indexOf("{", i);
  if (brace < 0) throw new Error("No body for " + needle);
  let depth = 0, inStr = null, esc = false;
  for (let j = brace; j < src.length; j++) {
    const ch = src[j];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") { inStr = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(i, j + 1);
    }
  }
  throw new Error("Unterminated function: " + needle);
}

function loadAppLoaders(indexHtml) {
  const html = fs.readFileSync(indexHtml, "utf8");
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const src = scripts.sort((a, b) => b.length - a.length)[0] || "";
  const bundle = [
    extractStatement(src, "const COPY_FORMAT"),
    extractStatement(src, "const COPY_VERSION"),
    extractStatement(src, "const KEEP_ALL"),
    extractStatement(src, "const FIELD_MAP_MAX"),
    extractStatement(src, "const fieldMapOk"),
    extractFunction(src, "function plainRecord"),
    extractFunction(src, "function readCopy"),
    extractFunction(src, "function prepareCopyMatches"),
    extractFunction(src, "function copyDataError"),
    extractStatement(src, "const EVD_KIND"),
    extractStatement(src, "const evdMap"),
    extractFunction(src, "function evdUnpack"),
  ].join("\n");
  const sandbox = { console, JSON, Object, Array, String, Number, Boolean, Date, Math, RegExp, Error };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // const/let bindings are script-scoped in vm; export them onto the context.
  const exported = bundle + `
;Object.assign(globalThis, {
  COPY_FORMAT, COPY_VERSION, KEEP_ALL, FIELD_MAP_MAX, FIELD_MAP_BYTES, fieldMapOk,
  plainRecord, readCopy, prepareCopyMatches, copyDataError, EVD_KIND, evdMap, evdUnpack
});`;
  vm.runInContext(exported, sandbox, { filename: "gridlock-loaders-extract.js" });
  const needed = ["evdUnpack", "readCopy", "copyDataError", "COPY_FORMAT", "COPY_VERSION", "EVD_KIND", "KEEP_ALL"];
  for (const k of needed) {
    if (sandbox[k] === undefined) throw new Error("Extracted loaders are missing " + k);
  }
  return sandbox;
}

function main() {
  const report = { repo: repo || null, index: null, event_data: {}, season_copy: {}, passed: 0, failed: 0, rejected_fields: [] };
  const note = (ok, name, extra) => {
    if (ok) { report.passed++; pass(name + (extra ? " — " + extra : "")); }
    else { report.failed++; fail(name + (extra ? " — " + extra : "")); }
  };

  if (!repo || !fs.existsSync(path.join(repo, "web/index.html"))) {
    note(false, "GRIDLOCK_REPO points at a Gridlock clone with web/index.html", repo || "(not set)");
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  const index = path.join(repo, "web/index.html");
  report.index = index;
  let loaders;
  try {
    loaders = loadAppLoaders(index);
    note(true, "extracted evdUnpack, readCopy, copyDataError from web/index.html");
  } catch (e) {
    note(false, "extract loaders from web/index.html", e.message);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const evdPath = path.join(root, "export/gridlock/event-data.json");
  const copyPath = path.join(root, "export/gridlock/season-copy-games.json");
  const evdText = fs.readFileSync(evdPath, "utf8");
  const copyText = fs.readFileSync(copyPath, "utf8");

  const unpacked = loaders.evdUnpack(evdText);
  if (unpacked.error) {
    note(false, "evdUnpack(event-data.json)", unpacked.error);
    report.event_data = { error: unpacked.error };
  } else {
    const entries = Object.keys(unpacked.entries || {}).length;
    const people = Object.keys(unpacked.people || {}).length;
    const obs = Object.values(unpacked.people || {}).reduce((n, p) => n + ((p.obs || []).length), 0);
    const members = Object.values(unpacked.entries || {}).reduce((n, e) => n + ((e.members || []).length), 0);
    report.event_data = {
      error: null,
      refused: unpacked.refused,
      meta: unpacked.meta,
      entries, people, observations: obs, memberships: members, sources: Object.keys(unpacked.sources || {}).length,
    };
    note(unpacked.refused === 0, "evdUnpack refused no records", "refused=" + unpacked.refused);
    note(entries === 680, "evdUnpack entry count is 680", "got " + entries);
    note(people === 4381, "evdUnpack people count is 4381", "got " + people);
    note(obs === 12569, "evdUnpack observation count is 12569", "got " + obs);
    note(unpacked.meta && String(unpacked.meta.id) === "9322", "event id is 9322", unpacked.meta && unpacked.meta.id);
    note(!JSON.stringify(unpacked).includes("jersey_number"), "unpacked event data has no jersey_number field");
  }

  const copy = loaders.readCopy(copyText);
  report.season_copy = { error: copy.error || null, format_ok: !copy.error };
  if (copy.error) {
    note(false, "readCopy(season-copy-games.json)", copy.error);
    report.rejected_fields.push({ file: "season-copy-games.json", error: copy.error });
  } else {
    note(true, "readCopy accepted season-copy-games.json");
    const data = copy.payload.data;
    const err = loaders.copyDataError(data);
    if (err) {
      note(false, "copyDataError on season data", err);
      report.rejected_fields.push({ file: "season-copy-games.json", field: err });
    } else {
      note(true, "copyDataError accepted data.games");
    }
    const games = data.games || [];
    report.season_copy.games = games.length;
    const bad = [];
    for (const g of games) {
      const e = loaders.copyDataError({ games: [g] });
      if (e) bad.push({ id: g && g.id, field: e, row: g });
    }
    report.season_copy.rejected_games = bad.length;
    if (bad.length) {
      note(false, "every game row passes copyDataError", bad.length + " failed, first " + JSON.stringify(bad[0]));
      report.rejected_fields.push(...bad.slice(0, 20));
    } else {
      note(true, "every game row passes copyDataError", games.length + " rows");
    }
    const extra = Object.keys(data).filter(k => !loaders.KEEP_ALL.includes(k));
    report.season_copy.extra_keys_ignored_by_readCopy = extra;
    note(true, "readCopy keeps only KEEP_ALL keys (extras ignored, not rejected)", extra.length ? extra.join(",") : "none");
  }

  report.ok = report.failed === 0;
  const out = path.join(root, "verify/app-loaders-report.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log("report", out);
  console.log(`${report.passed} passed, ${report.failed} failed`);
  process.exitCode = report.failed ? 1 : 0;
}

main();

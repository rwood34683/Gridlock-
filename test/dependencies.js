#!/usr/bin/env node
"use strict";
// Exercise the native build and image tools affected by security updates.
const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const { spawnSync } = require("node:child_process");
const sharp = require("sharp");
const xcode = require("xcode");
const xcodeRequire = createRequire(require.resolve("xcode/package.json"));
const uuid = xcodeRequire("uuid");
const { braceExpand } = require("minimatch");
const ROOT = path.resolve(__dirname, "..");
let passed = 0;
function pass(label) { passed++; console.log("PASS " + label); }

async function main() {
  for (const version of ["v3", "v5"]) {
    const short = new Uint8Array(15).fill(0x5a);
    assert.throws(() => uuid[version]("gridlock", uuid[version].DNS, short), RangeError);
    assert(short.every(value => value === 0x5a), "Rejected writes must not modify the buffer");
    assert.throws(() => uuid[version]("gridlock", uuid[version].DNS, new Uint8Array(16), 1), RangeError);
  }
  pass("Xcode's UUID dependency rejects short and offset-overflow buffers before writing");

  const project = xcode.project(path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj")).parseSync();
  const existing = new Set(project.allUuids());
  const group = project.addPbxGroup([], "Dependency compatibility");
  assert.match(group.uuid, /^[0-9A-F]{24}$/);
  assert(!existing.has(group.uuid), "New group must not reuse an existing project ID");
  const parsed = xcodeRequire("./lib/parser/pbxproj").parse(project.writeSync());
  assert.equal(parsed.project.objects.PBXGroup[group.uuid].name, "Dependency compatibility");
  pass("Xcode parses the real iOS project, adds a group, and writes a readable project in memory");

  assert.deepEqual(braceExpand("ios/{App,Test}.xcodeproj"), ["ios/App.xcodeproj", "ios/Test.xcodeproj"]);
  const nested = spawnSync(process.execPath, ["-e", [
    "const assert = require('node:assert/strict');",
    "const { braceExpand } = require('minimatch');",
    "const pattern = '{'.repeat(10000) + 'a,b' + '}'.repeat(10000);",
    "const result = braceExpand(pattern);",
    "assert(Array.isArray(result) && result.length > 0);"
  ].join("\n")], { cwd: ROOT, encoding: "utf8", timeout: 10000, windowsHide: true });
  assert.ifError(nested.error);
  assert.equal(nested.status, 0, nested.stderr);
  pass("Brace patterns still expand and deeply nested input does not exhaust the stack");

  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="32" height="16" fill="#ad1515"/></svg>');
  for (const format of ["png", "jpeg", "webp"]) {
    const encoded = await sharp(svg).resize(64, 32).toFormat(format).toBuffer();
    const decoded = await sharp(encoded).metadata();
    assert.equal(decoded.format, format);
    assert.equal(decoded.width, 64);
    assert.equal(decoded.height, 32);
    pass(`Sharp renders SVG, resizes, and round-trips ${format.toUpperCase()} assets`);
  }
  console.log(`Dependency compatibility: ${passed}/${passed} checks passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

#!/usr/bin/env node
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../scripts/cloud-build.js"), "utf8");
const publicKey = "sb_publishable_abcdefghijklmnopqrstuvwxyz";
const jwt = role => Buffer.from('{"alg":"HS256"}').toString("base64url") + "." + Buffer.from(JSON.stringify({ role })).toString("base64url") + ".signature";
function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gridlock-cloud-security-"));
  try {
    for (const dir of ["scripts", "web", "native"]) fs.mkdirSync(path.join(root, dir));
    fs.writeFileSync(path.join(root, "scripts/cloud-build.js"), source);
    fs.writeFileSync(path.join(root, "web/index.html"), '<script src="voice.js"></script><script>const STORE_KEY="fixture";</script>');
    fs.writeFileSync(path.join(root, "web/sw.js"), 'const VERSION = "gridlock-shell-v7";\nconst FILES = ["apple-touch-icon.png"];');
    fs.writeFileSync(path.join(root, "web/native.js"), "// native one");
    fs.writeFileSync(path.join(root, "native/gridlock-cloud.js"), "// adapter one");
    const { build } = require(path.join(root, "scripts/cloud-build.js"));
    const outDir = path.join(root, "dist/cloud");
    const run = options => build({ url: "https://fixture.supabase.co", anonKey: publicKey, outDir, ...options });
    const version = () => fs.readFileSync(path.join(outDir, "sw.js"), "utf8").match(/const VERSION = "([^"]+)"/)[1];
    fn({ root, outDir, run, version });
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith("gridlock-cloud-security-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
}
test("cloud build rejects secret keys, encoded service roles, and malformed public keys before replacing output", () => fixture(({ run, outDir }) => {
  run();fs.writeFileSync(path.join(outDir, "kept.txt"), "previous build");
  for (const anonKey of ["sb_secret_abcdefghijklmnopqrstuvwxyz", jwt("service_role"), jwt("authenticated"), "arbitrary-key-not-public", "eyJ.invalid.signature"]) {
    assert.throws(() => run({ anonKey }), /public key/);
    assert.equal(fs.readFileSync(path.join(outDir, "kept.txt"), "utf8"), "previous build");
  }
  run({ anonKey: jwt("anon") });
}));
test("changed public config, adapter, or shell bytes each invalidate the offline cache", () => fixture(({ run, root, version }) => {
  run();const initial = version();run();assert.equal(version(), initial);
  run({ anonKey: publicKey + "changed" });const keyChanged = version();assert.notEqual(keyChanged, initial);
  run({ redirectTo: "https://gridlock.example/auth/callback" });const redirectChanged = version();assert.notEqual(redirectChanged, initial);
  fs.writeFileSync(path.join(root, "native/gridlock-cloud.js"), "// adapter two");run();const adapterChanged = version();assert.notEqual(adapterChanged, initial);
  fs.writeFileSync(path.join(root, "web/native.js"), "// native two");run();assert.notEqual(version(), adapterChanged);
}));
test("project and auth callback configuration allow only unambiguous safe URL shapes", () => fixture(({ run, outDir }) => {
  for (const url of ["http://fixture.supabase.co", "https://user:password@fixture.supabase.co", "https://fixture.supabase.co/path", "https://fixture.supabase.co?other=1", "https://fixture.supabase.co#fragment"]) assert.throws(() => run({ url }), /project origin/);
  for (const redirectTo of ["https://gridlock.example/auth/callback", "http://localhost:5173/", "http://127.0.0.1:5173/", "gridlock://auth/callback", "grindx://auth/callback", "lockdown://auth/callback"]) {
    run({ redirectTo });assert.ok(fs.readFileSync(path.join(outDir, "gridlock-config.js"), "utf8").includes(JSON.stringify(redirectTo)));
  }
  for (const redirectTo of ["http://gridlock.example/", "javascript:alert(1)", "https://user:pass@gridlock.example/", "https://gridlock.example/?token=x", "https://gridlock.example/#fragment", "gridlock://other/callback", "gridlock://auth/other"]) assert.throws(() => run({ redirectTo }), /REDIRECT/);
}));
test("bad output paths and broken injection anchors preserve source and the last build", () => fixture(({ run, root, outDir }) => {
  run();fs.writeFileSync(path.join(outDir, "kept.txt"), "previous build");
  for (const output of [root, path.join(root, "web"), path.join(root, "dist"), path.join(root, "../outside")]) assert.throws(() => run({ outDir: output }), /child of dist/);
  fs.writeFileSync(path.join(root, "web/index.html"), "missing anchor");
  assert.throws(() => run(), /injection anchor/);
  assert.equal(fs.readFileSync(path.join(outDir, "kept.txt"), "utf8"), "previous build");
  assert.equal(fs.readFileSync(path.join(root, "web/index.html"), "utf8"), "missing anchor");
}));

"use strict";
/* The iPhone cloud build (scripts/ios-cloud.js) without a Mac: the settings it
 * reads, that Capacitor's config always comes back as it was, and that the
 * shell check catches a build without the adapter, the callback or with a
 * secret. The sync itself needs Capacitor and is run by hand on a Mac. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const m = require("../scripts/ios-cloud.js");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ios-cloud-"));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }

check("reads .env.cloud lines, skipping comments and quotes", () => {
  const f = path.join(tmp, ".env.cloud");
  fs.writeFileSync(f, "# public values\nGRINDX_SUPABASE_URL=\"https://x.supabase.co\"\nexport GRINDX_SUPABASE_ANON_KEY='sb_publishable_abc'\n\nnot a line\n");
  assert.deepEqual(m.readEnvFile(f), { GRINDX_SUPABASE_URL: "https://x.supabase.co", GRINDX_SUPABASE_ANON_KEY: "sb_publishable_abc" });
  assert.deepEqual(m.readEnvFile(path.join(tmp, "missing")), {});
});
check("a comment after a value is not part of it, and a quoted value is taken whole", () => {
  const f = path.join(tmp, ".env.trailing");
  fs.writeFileSync(f, "\uFEFFGRINDX_SUPABASE_URL=https://x.supabase.co   # project\r\nGRINDX_SUPABASE_ANON_KEY=\"sb_publishable_a # b\"\r\n");
  assert.deepEqual(m.readEnvFile(f), { GRINDX_SUPABASE_URL: "https://x.supabase.co", GRINDX_SUPABASE_ANON_KEY: "sb_publishable_a # b" });
});
check("Ctrl-C or a closed Terminal during the sync still puts Capacitor's config back", () => {
  const f = path.join(tmp, "capacitor.config.sig.json");
  const before = '{\n  "webDir": "web"\n}\n';
  fs.writeFileSync(f, before);
  for (const sig of ["INT", "HUP", "TERM"]) {
    const code = `const m=require(${JSON.stringify(path.join(ROOT, "scripts/ios-cloud.js"))});const {spawnSync}=require("node:child_process");` +
      `m.withWebDir(${JSON.stringify(path.join(tmp, "dist/cloud-ios"))},()=>{spawnSync("sh",["-c","kill -${sig} "+process.pid+"; sleep 1"]);},${JSON.stringify(f)});`;
    require("node:child_process").spawnSync(process.execPath, ["-e", code], { stdio: "ignore" });
    assert.equal(fs.readFileSync(f, "utf8"), before, "restored after SIG" + sig);
  }
});
check("the environment wins over the file, and nothing set is empty", () => {
  const s = m.settings({ GRINDX_SUPABASE_URL: "https://env.supabase.co" }, { GRINDX_SUPABASE_URL: "https://file.supabase.co", GRINDX_SUPABASE_ANON_KEY: "k" });
  assert.deepEqual(s, { url: "https://env.supabase.co", anonKey: "k" });
  assert.deepEqual(m.settings({}, {}, {}), { url: "", anonKey: "" });
});
check("Capacitor's config is put back exactly, even when the sync throws", () => {
  const f = path.join(tmp, "capacitor.config.json");
  const before = '{\n  "appId": "x",\n  "webDir": "web"\n}\n';
  fs.writeFileSync(f, before);
  let seen = null;
  assert.throws(() => m.withWebDir(path.join(tmp, "dist", "cloud-ios"), () => { seen = JSON.parse(fs.readFileSync(f, "utf8")).webDir; throw new Error("sync failed"); }, f), /sync failed/);
  assert.equal(seen, "dist/cloud-ios");
  assert.equal(fs.readFileSync(f, "utf8"), before);
});
check("the shell check names a missing adapter, a missing callback and a secret", () => {
  const d = path.join(tmp, "public"); fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, "index.html"), "<html></html>");
  assert.equal(m.verifyShell(d).length, 3);
  fs.writeFileSync(path.join(d, "index.html"), '<script src="gridlock-config.js"></script>\n<script src="gridlock-cloud.js"></script>');
  fs.writeFileSync(path.join(d, "gridlock-cloud.js"), "");
  fs.writeFileSync(path.join(d, "gridlock-config.js"), 'window.GRIDLOCK_CLOUD = {"redirectTo":"https://elsewhere"};');
  assert.match(m.verifyShell(d).join(), /gridlock:\/\/auth\/callback/);
  fs.writeFileSync(path.join(d, "gridlock-config.js"), 'window.GRIDLOCK_CLOUD = {"anonKey":"sb_secret_x","redirectTo":"gridlock://auth/callback"};');
  assert.match(m.verifyShell(d).join(), /secret/);
  fs.writeFileSync(path.join(d, "gridlock-config.js"), 'window.GRIDLOCK_CLOUD = {"anonKey":"sb_publishable_x","redirectTo":"gridlock://auth/callback"};');
  assert.deepEqual(m.verifyShell(d), []);
});
check("the missing-settings message says what to write and never asks for a secret key", () => {
  assert.match(m.MISSING, /\.env\.cloud/);
  assert.match(m.MISSING, /sb_publishable_/);
  assert.match(m.MISSING, /never the secret or service_role key/);
});
check("the launcher, the npm script and the ignore rules are in place", () => {
  const launcher = path.join(ROOT, "OPEN-IN-XCODE-CLOUD.command");
  const executable = process.platform === "win32"
    ? require("node:child_process").execFileSync("git", ["ls-files", "--stage", "--", "OPEN-IN-XCODE-CLOUD.command"], {cwd: ROOT, encoding:"utf8"}).startsWith("100755 ")
    : Boolean(fs.statSync(launcher).mode & 0o111);
  assert.ok(executable, "launcher is executable (Git index mode on Windows, filesystem mode elsewhere)");
  assert.match(fs.readFileSync(launcher, "utf8"), /node scripts\/ios-cloud\.js/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).scripts["ios:cloud"], "node scripts/ios-cloud.js");
  const ignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  for (const p of ["ios/App/App/public/gridlock-config.js", "ios/App/App/public/gridlock-cloud.js"]) assert.ok(ignore.includes(p), p + " is ignored");
  assert.ok(/^\.env\.\*$/m.test(ignore), ".env.cloud is ignored");
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, "capacitor.config.json"), "utf8")).webDir, "web", "the committed webDir stays offline");
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`iOS cloud build: ${passed} checks passed.`);

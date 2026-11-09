"use strict";
/* Sign-in on the phone apps the same as on the website, without a Mac or the
 * Android SDK: the shared cloud build for both platforms, the release guards
 * that refuse an offline store build (the Xcode script itself is run here with
 * sh), and password sharing between the website and the apps. Xcode, Gradle
 * and the stores themselves are verified on a Mac and a phone; docs/XCODE.md
 * and docs/NATIVE-SETUP.md list those steps. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const nc = require("../scripts/native-cloud.js");
const cn = require("../scripts/configure-native.js");
const contact = require("../scripts/contact.js");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "native-sign-in-"));
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const FIXTURE = { url: "https://fixture.supabase.co", anonKey: "sb_publishable_abcdefghijklmnopqrstuvwxyz" };
const CONTACT = JSON.parse(read("site/contact.json"));
const APP_ID = JSON.parse(read("capacitor.config.json")).appId;
let passed = 0;
function check(name, fn) { fn(); passed++; console.log("PASS " + name); }

check("the public values come from the environment, else .env.cloud, else site/contact.json — never mixed", () => {
  const env = { GRINDX_SUPABASE_URL: "https://env.supabase.co", GRINDX_SUPABASE_ANON_KEY: "sb_publishable_env" };
  const file = { GRINDX_SUPABASE_URL: "https://file.supabase.co", GRINDX_SUPABASE_ANON_KEY: "sb_publishable_file" };
  const owner = { url: "https://owner.supabase.co", anonKey: "sb_publishable_owner" };
  assert.deepEqual(nc.settings(env, file, owner), { url: env.GRINDX_SUPABASE_URL, anonKey: env.GRINDX_SUPABASE_ANON_KEY });
  assert.deepEqual(nc.settings({}, file, owner), { url: file.GRINDX_SUPABASE_URL, anonKey: file.GRINDX_SUPABASE_ANON_KEY });
  assert.deepEqual(nc.settings({}, {}, owner), owner);
  // A URL in the environment is never paired with a key from somewhere else.
  assert.deepEqual(nc.settings({ GRINDX_SUPABASE_URL: "https://env.supabase.co" }, file, owner), { url: "https://env.supabase.co", anonKey: "" });
  assert.deepEqual(nc.settings({}, {}, {}), { url: "", anonKey: "" });
  assert.deepEqual(nc.contactCloud(), { url: CONTACT.cloud.url, anonKey: CONTACT.cloud.anonKey, redirectTo: CONTACT.cloud.redirectTo });
});

check("the Android cloud build carries the adapter, the app's own callback and no website files", () => {
  const out = nc.buildFor("android", FIXTURE).outDir;
  assert.equal(path.relative(ROOT, out).split(path.sep).join("/"), "dist/cloud-android");
  assert.deepEqual(nc.verifyShell(out), []);
  assert.match(fs.readFileSync(path.join(out, "gridlock-config.js"), "utf8"), /"redirectTo":"gridlock:\/\/auth\/callback"/);
  assert.ok(!fs.existsSync(path.join(out, ".well-known")), "a phone shell is not a website");
  assert.equal(nc.CALLBACK, "gridlock://auth/callback");
  assert.equal(require("../scripts/android-cloud.js").verifyShell.length, 0);
  assert.throws(() => nc.buildFor("windows", FIXTURE), /ios or android/);
});

check("the live web build carries both password-sharing files for its own host", () => {
  const out = require("../scripts/cloud-build.js").build({ ...FIXTURE, outDir: path.join(ROOT, "dist/cloud-signin-test") });
  const apple = JSON.parse(fs.readFileSync(path.join(out.outDir, ".well-known/apple-app-site-association"), "utf8"));
  const links = JSON.parse(fs.readFileSync(path.join(out.outDir, ".well-known/assetlinks.json"), "utf8"));
  assert.deepEqual(apple, JSON.parse(contact.appleAssociation(CONTACT, APP_ID)));
  assert.deepEqual(links, JSON.parse(contact.assetLinks(CONTACT, APP_ID)));
  fs.rmSync(out.outDir, { recursive: true, force: true });
});

check("an Android store build syncs the cloud build; GRIDLOCK_OFFLINE_RELEASE=1 is the only way round it", () => {
  const { buildPlan } = require("../scripts/native.js");
  assert.equal(buildPlan("bundleRelease", {}), "cloud");
  assert.equal(buildPlan("assembleRelease", {}), "cloud");
  assert.equal(buildPlan("assembleDebug", {}), "offline");
  assert.equal(buildPlan(null, {}), "offline");
  assert.equal(buildPlan("bundleRelease", { GRIDLOCK_OFFLINE_RELEASE: "1" }), "offline-release");
  assert.equal(buildPlan("bundleRelease", { GRIDLOCK_OFFLINE_RELEASE: "yes" }), "cloud");
  const scripts = JSON.parse(read("package.json")).scripts;
  assert.equal(scripts["android:cloud"], "node scripts/android-cloud.js");
  assert.equal(scripts["bundle:android"], "node scripts/native.js build android bundleRelease");
  const ignore = read(".gitignore");
  for (const p of ["android/app/src/main/assets/public/gridlock-config.js", "android/app/src/main/assets/public/gridlock-cloud.js"]) assert.ok(ignore.includes(p), p + " is ignored");
});

// The Xcode guard, run with sh exactly as Xcode runs it.
function shell(name, files) {
  const src = path.join(tmp, name), pub = path.join(src, "App/public");
  fs.mkdirSync(pub, { recursive: true });
  for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(pub, f), text);
  return src;
}
function guard(src, env) {
  const r = spawnSync("sh", ["-c", cn.IOS_RELEASE_GUARD], { env: { PATH: process.env.PATH, SRCROOT: src, ...env }, encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}
check("the Xcode guard refuses a device Release of the offline copy and lets everything else through", () => {
  const offline = shell("offline", { "index.html": "<html></html>" });
  const cloud = shell("cloud", { "index.html": '<script src="gridlock-config.js"></script>\n<script src="gridlock-cloud.js"></script>', "gridlock-cloud.js": "", "gridlock-config.js": 'window.GRIDLOCK_CLOUD = {"anonKey":"sb_publishable_x","redirectTo":"gridlock://auth/callback"};' });
  const secret = shell("secret", { "index.html": '<script src="gridlock-cloud.js"></script>', "gridlock-cloud.js": "", "gridlock-config.js": 'window.GRIDLOCK_CLOUD = {"anonKey":"sb_secret_x","redirectTo":"gridlock://auth/callback"};' });
  const web = shell("web", { "index.html": '<script src="gridlock-cloud.js"></script>', "gridlock-cloud.js": "", "gridlock-config.js": 'window.GRIDLOCK_CLOUD = {"redirectTo":"https://app.example.com/"};' });
  assert.equal(guard(offline, { CONFIGURATION: "Debug", PLATFORM_NAME: "iphoneos" }).code, 0, "Debug runs as before");
  assert.equal(guard(offline, { CONFIGURATION: "Release", PLATFORM_NAME: "iphonesimulator" }).code, 0, "a simulator build is not a store build");
  const refused = guard(offline, { CONFIGURATION: "Release", PLATFORM_NAME: "iphoneos" });
  assert.equal(refused.code, 1);
  assert.match(refused.out, /^error: This is the offline build \(gridlock-config\.js is missing\)/m);
  assert.match(refused.out, /npm run ios:cloud/);
  assert.equal(guard(cloud, { CONFIGURATION: "Release", PLATFORM_NAME: "iphoneos" }).code, 0, "the cloud build archives");
  const s = guard(secret, { CONFIGURATION: "Release", PLATFORM_NAME: "iphoneos" });
  assert.equal(s.code, 1); assert.match(s.out, /secret key/);
  const w = guard(web, { CONFIGURATION: "Release", PLATFORM_NAME: "iphoneos" });
  assert.equal(w.code, 1); assert.match(w.out, /sign-in callback/);
  const ok = guard(offline, { CONFIGURATION: "Release", PLATFORM_NAME: "iphoneos", GRIDLOCK_OFFLINE_RELEASE: "1" });
  assert.equal(ok.code, 0); assert.match(ok.out, /^warning: GRIDLOCK_OFFLINE_RELEASE/m);
});

check("the Xcode project runs the guard first, signs with the entitlements, and still parses", () => {
  const text = read("ios/App/App.xcodeproj/project.pbxproj");
  const xcode = require("xcode").project(path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj")); xcode.parseSync();
  const target = xcode.pbxNativeTargetSection()["504EC3031FED79650016851F"];
  assert.equal(target.buildPhases[0].value, cn.RELEASE_GUARD_ID, "the guard is the first phase");
  const phase = xcode.hash.project.objects.PBXShellScriptBuildPhase[cn.RELEASE_GUARD_ID];
  assert.equal(JSON.parse(phase.shellScript), cn.IOS_RELEASE_GUARD, "the project holds the script this suite runs");
  const configs = Object.values(xcode.pbxXCBuildConfigurationSection()).filter(c => c && c.buildSettings && c.buildSettings.PRODUCT_BUNDLE_IDENTIFIER);
  assert.equal(configs.length, 2);
  for (const c of configs) assert.equal(c.buildSettings.CODE_SIGN_ENTITLEMENTS, "App/App.entitlements", c.name);
  assert.equal(text.split(cn.RELEASE_GUARD_ID).length - 1, 2, "one phase, listed once");
});

check("the iPhone app asks for both web hosts' passwords; the sites name the app once a Team ID is set", () => {
  const hosts = contact.credentialHosts(CONTACT);
  assert.deepEqual(hosts, ["gridlockpb.com", "app.gridlockpb.com"]);
  assert.equal(read("ios/App/App/App.entitlements"), cn.entitlementsText(hosts));
  assert.match(read("ios/App/App/App.entitlements"), /<string>webcredentials:gridlockpb\.com<\/string>\s*<string>webcredentials:app\.gridlockpb\.com<\/string>/);
  assert.equal(read("site/.well-known/apple-app-site-association"), contact.appleAssociation(CONTACT, APP_ID));
  assert.deepEqual(JSON.parse(contact.appleAssociation({}, APP_ID)), { webcredentials: { apps: [] } });
  assert.deepEqual(JSON.parse(contact.appleAssociation({ appleTeam: "ABCDE12345" }, APP_ID)), { webcredentials: { apps: ["ABCDE12345." + APP_ID] } });
  assert.equal(contact.apply({}, ["--appleTeam", "abcde12345"]).appleTeam, "ABCDE12345");
  for (const bad of ["ABC", "ABCDE-12345", "ABCDE123456"]) assert.throws(() => contact.apply({}, ["--appleTeam", bad]), /10-character/);
  assert.ok(contact.KEYS.includes("appleTeam"));
});

check("the Android app and the sites link both ways for passwords", () => {
  const links = JSON.parse(contact.assetLinks({ sha256: "AA:".repeat(31) + "AA" }, APP_ID));
  assert.deepEqual(links[0].relation, ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"]);
  assert.deepEqual(JSON.parse(contact.assetLinks({}, APP_ID)), []);
  assert.match(read("android/app/src/main/AndroidManifest.xml"), /<application\b[^>]*>\s*<meta-data android:name="asset_statements" android:resource="@string\/asset_statements" \/>/);
  const m = /<string name="asset_statements" translatable="false">(.*)<\/string>/.exec(read("android/app/src/main/res/values/strings.xml"));
  assert.ok(m, "asset_statements string");
  assert.deepEqual(JSON.parse(m[1].replace(/\\"/g, '"')), [{ include: "https://gridlockpb.com/.well-known/assetlinks.json" }, { include: "https://app.gridlockpb.com/.well-known/assetlinks.json" }]);
});

check("the Gradle guard is applied and holds the same checks as the Xcode one", () => {
  assert.equal(read("android/app/release-guard.gradle"), cn.ANDROID_RELEASE_GUARD);
  assert.match(read("android/app/build.gradle"), /^apply from: 'release-guard\.gradle'$/m);
  const g = cn.ANDROID_RELEASE_GUARD;
  for (const bit of ["gridlock-config.js is missing", "gridlock-cloud.js is missing", "src=\"gridlock-cloud.js\"", "://auth/callback", "sb_secret_|service_role", "GRIDLOCK_OFFLINE_RELEASE", "gridlockOfflineRelease", "throw new GradleException"]) assert.ok(g.includes(bit), bit);
  assert.match(g, /it\.name\.toLowerCase\(\)\.contains\('release'\)/, "only release tasks are checked");
});

check("a build with no domains asks for none, and every edit is undone cleanly", () => {
  const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
  const none = cn.withIOSSignIn(pbx, []);
  assert.ok(!none.includes("CODE_SIGN_ENTITLEMENTS"), "no entitlements without a domain");
  assert.ok(none.includes(cn.RELEASE_GUARD_ID), "the release guard stays");
  assert.equal(cn.withIOSSignIn(none, contact.credentialHosts(CONTACT)), pbx);
  assert.equal(cn.withIOSSignIn(pbx, contact.credentialHosts(CONTACT)), pbx, "a second run changes nothing");
  const mf = read("android/app/src/main/AndroidManifest.xml"), st = read("android/app/src/main/res/values/strings.xml");
  const bare = cn.withAssetStatements(mf, st, []);
  assert.ok(!bare.manifest.includes("asset_statements") && !bare.strings.includes("asset_statements"));
  const back = cn.withAssetStatements(bare.manifest, bare.strings, contact.credentialHosts(CONTACT));
  assert.equal(back.manifest, mf); assert.equal(back.strings, st);
});

check("running the native setup again changes nothing in the committed shells", () => {
  const files = ["ios/App/App.xcodeproj/project.pbxproj", "ios/App/App/App.entitlements", "android/app/build.gradle", "android/app/release-guard.gradle",
    "android/app/src/main/AndroidManifest.xml", "android/app/src/main/res/values/strings.xml", "ios/App/App/Info.plist"];
  const before = files.map(read);
  cn.configure();
  assert.deepEqual(files.map(read), before);
});

check("the brand builds write their own password-sharing file, never this one's app", () => {
  for (const key of ["grindx", "lockdown"]) {
    const brands = require("../scripts/brand.js").loadBrands(), to = { key, ...brands.brands[key] };
    const staged = require("../scripts/brand.js").stage(to, brands);
    const aasa = JSON.parse(staged.site.get(".well-known/apple-app-site-association").toString("utf8"));
    assert.deepEqual(aasa, { webcredentials: { apps: [] } }, key + " has no Team ID configured");
  }
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Native sign-in: ${passed} checks passed.`);

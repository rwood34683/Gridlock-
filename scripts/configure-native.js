"use strict";
/* Idempotent Gridlock additions to freshly generated Capacitor projects. */
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
function update(relative, transform) {
  const file = path.join(ROOT, relative);
  if (fs.existsSync(file)) fs.writeFileSync(file, transform(fs.readFileSync(file, "utf8")));
}
function withAndroidDomain(text, domain) {
  if (domain && !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) throw new Error("Invalid configured Android app-link domain.");
  // Remove the original restored default, or the block managed by this helper.
  text = text.replace(/\s*<!-- gridlock-app-link:start -->[\s\S]*?<!-- gridlock-app-link:end -->/g, "");
  text = text.replace(/\s*<intent-filter android:autoVerify="true">\s*<action android:name="android.intent.action.VIEW" \/>\s*<category android:name="android.intent.category.DEFAULT" \/>\s*<category android:name="android.intent.category.BROWSABLE" \/>\s*<data android:scheme="https" android:host="gridlockpb.com" \/>\s*<\/intent-filter>/g, "");
  if (!domain) return text;
  return text.replace("        </activity>", `            <!-- gridlock-app-link:start -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${domain}" />
            </intent-filter>
            <!-- gridlock-app-link:end -->
        </activity>`);
}
// The brand the shells are pointed at: the one whose appId capacitor.config.json
// names, falling back to the default. scripts/brand.js switches it; this only reads.
function activeBrand() {
  let brands;
  try { brands = JSON.parse(fs.readFileSync(path.join(ROOT, "brand/brands.json"), "utf8")); }
  catch { return { key: "gridlock", short: "Gridlock", name: "Gridlock Coach", appId: "com.upra.gridlock.coach", scheme: "gridlock", contact: "site/contact.json" }; }
  const config = path.join(ROOT, "capacitor.config.json");
  const appId = fs.existsSync(config) ? JSON.parse(fs.readFileSync(config, "utf8")).appId : null;
  const found = Object.entries(brands.brands).find(([, b]) => b.appId === appId);
  const [key, brand] = found || [brands.default, brands.brands[brands.default]];
  return { key, ...brand };
}
function configure() {
  const brand = activeBrand();
  // npm ci applies this too; native builds remain safe after --ignore-scripts.
  const speechPackage = path.join(ROOT, "node_modules/@capgo/capacitor-speech-recognition/package.json");
  if (fs.existsSync(speechPackage)) require("./patch-speech-plugin").patch();
  update("ios/App/App/Info.plist", text => {
    if (!text.includes("NSMicrophoneUsageDescription")) text = text.replace(/<dict>/, '<dict>\n\t<key>NSMicrophoneUsageDescription</key>\n\t<string>Use the microphone only while you turn on voice scouting.</string>');
    if (!text.includes("NSSpeechRecognitionUsageDescription")) text = text.replace(/<dict>/, '<dict>\n\t<key>NSSpeechRecognitionUsageDescription</key>\n\t<string>Turn spoken field observations into scouting notes while you choose to listen.</string>');
    return text;
  });
  update("android/app/src/main/AndroidManifest.xml", text => {
    if (!text.includes('android.permission.RECORD_AUDIO')) text = text.replace('</manifest>', '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n</manifest>');
    if (!text.includes('android.hardware.microphone')) text = text.replace('</manifest>', '    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n</manifest>');
    if (!text.includes('android.speech.RecognitionService')) {
      const intent = '        <intent><action android:name="android.speech.RecognitionService" /></intent>';
      text = text.includes('</queries>') ? text.replace('</queries>', intent + '\n    </queries>') : text.replace('</manifest>', '    <queries>\n' + intent + '\n    </queries>\n</manifest>');
    }
    return text;
  });
  update("ios/App/Podfile", text => text.replace(/platform :ios, '([0-9.]+)'/, (match, version) => Number.parseFloat(version) < 15 ? "platform :ios, '15.0'" : match));
  update("ios/App/App.xcodeproj/project.pbxproj", text => text.replace(/IPHONEOS_DEPLOYMENT_TARGET = ([0-9.]+);/g, (match, version) => Number.parseFloat(version) < 15 ? "IPHONEOS_DEPLOYMENT_TARGET = 15.0;" : match));
  update("android/app/src/main/AndroidManifest.xml", text => text.replace(/android:configChanges="([^"]+)"/, (match, values) => values.split("|").includes("density") ? match : `android:configChanges="${values}|density"`));
  update("android/app/src/main/AndroidManifest.xml", text => text.includes(`android:scheme="${brand.scheme}"`) ? text : text.replace("        </activity>", `            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${brand.scheme}" />
            </intent-filter>
        </activity>`));
  const contactFile = path.join(ROOT, brand.contact);
  const domain = fs.existsSync(contactFile) ? JSON.parse(fs.readFileSync(contactFile, "utf8")).domain : null;
  update("android/app/src/main/AndroidManifest.xml", text => withAndroidDomain(text, domain));
  update("android/app/src/main/res/values/strings.xml", text => text.replace(/(<string name="custom_url_scheme">)[^<]*(<\/string>)/, `$1${brand.scheme}$2`));
  update("android/app/src/main/res/values/ic_launcher_background.xml", text => text.replace("#FFFFFF", "#0b0c0d"));
  const androidApp = path.join(ROOT, "android/app");
  if (fs.existsSync(androidApp)) {
    const colors = path.join(androidApp, "src/main/res/values/colors.xml");
    if (!fs.existsSync(colors)) fs.writeFileSync(colors, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#0b0c0d</color>
    <color name="colorPrimaryDark">#0b0c0d</color>
    <color name="colorAccent">#e5252a</color>
</resources>\n`);
    const signing = path.join(androidApp, "signing.gradle");
    if (!fs.existsSync(signing)) fs.writeFileSync(signing, `// Keep upload credentials in android/keystore.properties (git-ignored).
def signingFile = rootProject.file('keystore.properties')
def signingValues = new Properties()
if (signingFile.exists()) {
    signingFile.withInputStream { signingValues.load(it) }
    ['storeFile', 'storePassword', 'keyAlias', 'keyPassword'].each { key ->
        if (!signingValues[key]) throw new GradleException("Missing " + key + " in keystore.properties")
    }
    android.signingConfigs {
        release {
            storeFile rootProject.file(signingValues['storeFile'])
            storePassword signingValues['storePassword']
            keyAlias signingValues['keyAlias']
            keyPassword signingValues['keyPassword']
        }
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.release
}
gradle.taskGraph.whenReady { graph ->
    if (!signingFile.exists() && graph.allTasks.any { it.project == project && it.name.toLowerCase().contains('release') }) {
        throw new GradleException('Release signing is required. Copy keystore.properties.example to keystore.properties and configure your upload key, or build assembleDebug.')
    }
}
`);
    const example = path.join(ROOT, "android/keystore.properties.example");
    if (!fs.existsSync(example)) fs.writeFileSync(example, "# Paths are relative to android/. On Windows use forward slashes.\nstoreFile=gridlock-release.jks\nstorePassword=REPLACE_ME\nkeyAlias=gridlock\nkeyPassword=REPLACE_ME\n");
    update("android/app/build.gradle", text => text.includes("apply from: 'signing.gradle'") ? text : text + "\napply from: 'signing.gradle'\n");
  }
  update("ios/App/App/Info.plist", text => text.includes("CFBundleURLTypes") ? text : text.replace("\t<key>LSRequiresIPhoneOS</key>", `\t<key>CFBundleURLTypes</key>
\t<array><dict>
\t\t<key>CFBundleURLName</key><string>${brand.appId}</string>
\t\t<key>CFBundleURLSchemes</key><array><string>${brand.scheme}</string></array>
\t</dict></array>
\t<key>LSRequiresIPhoneOS</key>`));
  const iosApp = path.join(ROOT, "ios/App/App");
  if (fs.existsSync(iosApp)) {
    const privacy = path.join(iosApp, "PrivacyInfo.xcprivacy");
    if (!fs.existsSync(privacy)) fs.writeFileSync(privacy, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
    <key>NSPrivacyTracking</key><false/>
    <key>NSPrivacyTrackingDomains</key><array/>
    <key>NSPrivacyCollectedDataTypes</key><array/>
    <key>NSPrivacyAccessedAPITypes</key><array><dict>
        <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array>
    </dict></array>
</dict></plist>\n`);
    update("ios/App/App/PrivacyInfo.xcprivacy", text => text.includes("NSPrivacyAccessedAPICategoryFileTimestamp") ? text : text.replace(/(<key>NSPrivacyAccessedAPITypes<\/key>\s*<array>)/, `$1
    <dict>
        <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
        <key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array>
    </dict>`));
    update("ios/App/App.xcodeproj/project.pbxproj", text => {
      if (text.includes("PrivacyInfo.xcprivacy")) return text;
      return text
        .replace("/* Begin PBXBuildFile section */", '/* Begin PBXBuildFile section */\n\t\t474C50524956414359000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = 474C50524956414359000002 /* PrivacyInfo.xcprivacy */; };')
        .replace("/* Begin PBXFileReference section */", '/* Begin PBXFileReference section */\n\t\t474C50524956414359000002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };')
        .replace("504EC3131FED79650016851F /* Info.plist */,", "504EC3131FED79650016851F /* Info.plist */,\n\t\t\t\t474C50524956414359000002 /* PrivacyInfo.xcprivacy */,")
        .replace("50379B232058CBB4000EE86E /* capacitor.config.json in Resources */,", "50379B232058CBB4000EE86E /* capacitor.config.json in Resources */,\n\t\t\t\t474C50524956414359000001 /* PrivacyInfo.xcprivacy in Resources */,");
    });
  }  configureSignIn(brand);
}
/* ---- Sign-in that is the same as the website's ----
 *
 * Two things a phone needs to sign in the way the web app does. First, a
 * store build has to be the cloud build (npm run ios:cloud / android:cloud):
 * the offline sync packages a sign-in kept on that one phone, and a coach's
 * gridlockpb.com account does not exist there. Xcode and Gradle each refuse a
 * release made from it, unless GRIDLOCK_OFFLINE_RELEASE=1 says it is meant.
 * Second, the password a coach saved on the website should be offered in the
 * app: iCloud Keychain reads the app's associated domains (webcredentials)
 * and the site's apple-app-site-association; Google Password Manager reads the
 * app's asset_statements and the site's assetlinks.json (get_login_creds).
 * Every value here comes from brand/brands.json and the brand's contact file,
 * so a variant build names its own domains, or none. */
const RELEASE_GUARD_ID = "474C50524956414359000003";
const IOS_RELEASE_GUARD = `# Refuse a store build that is the offline copy (scripts/configure-native.js).
if [ "\${CONFIGURATION}" != "Release" ] || [ "\${PLATFORM_NAME}" = "iphonesimulator" ]; then exit 0; fi
if [ "\${GRIDLOCK_OFFLINE_RELEASE}" = "1" ]; then
  echo "warning: GRIDLOCK_OFFLINE_RELEASE = 1, so this release is the offline build: its sign-in is kept on the phone and gridlockpb.com accounts do not work in it."
  exit 0
fi
P="\${SRCROOT}/App/public"
fail() {
  echo "error: This is the offline build ($1). A store build must sign in with gridlockpb.com accounts: run npm run ios:cloud, then archive again. To ship the offline build on purpose, add the build setting GRIDLOCK_OFFLINE_RELEASE = 1."
  exit 1
}
[ -f "$P/gridlock-config.js" ] || fail "gridlock-config.js is missing"
[ -f "$P/gridlock-cloud.js" ] || fail "gridlock-cloud.js is missing"
grep -q 'src="gridlock-cloud.js"' "$P/index.html" || fail "index.html does not load the account adapter"
grep -q '://auth/callback' "$P/gridlock-config.js" || fail "gridlock-config.js does not name the app's sign-in callback"
if grep -Eq 'sb_secret_|service_role' "$P/gridlock-config.js"; then
  echo "error: gridlock-config.js carries a secret key, which must never ship. Rebuild with npm run ios:cloud."
  exit 1
fi
exit 0
`;
const ANDROID_RELEASE_GUARD = `// Refuse a store build that is the offline copy. Generated by
// scripts/configure-native.js; npm run build:android and bundle:android sync
// the cloud build before Gradle and put the offline one back afterwards.
gradle.taskGraph.whenReady { graph ->
    def release = graph.allTasks.any { it.project == project && it.name.toLowerCase().contains('release') }
    if (!release) return
    if (System.getenv('GRIDLOCK_OFFLINE_RELEASE') == '1' || project.hasProperty('gridlockOfflineRelease')) {
        logger.warn('GRIDLOCK_OFFLINE_RELEASE: this release is the offline build. Its sign-in is kept on the phone and gridlockpb.com accounts do not work in it.')
        return
    }
    def pub = file('src/main/assets/public')
    def cfg = new File(pub, 'gridlock-config.js')
    def problems = []
    if (!cfg.exists()) problems << 'gridlock-config.js is missing'
    if (!new File(pub, 'gridlock-cloud.js').exists()) problems << 'gridlock-cloud.js is missing'
    def index = new File(pub, 'index.html')
    if (!index.exists() || !index.getText('UTF-8').contains('src="gridlock-cloud.js"')) problems << 'index.html does not load the account adapter'
    if (cfg.exists()) {
        def text = cfg.getText('UTF-8')
        if (!text.contains('://auth/callback')) problems << "gridlock-config.js does not name the app's sign-in callback"
        if (text =~ /sb_secret_|service_role/) throw new GradleException('gridlock-config.js carries a secret key, which must never ship. Rebuild with npm run android:cloud.')
    }
    if (problems) throw new GradleException('This is the offline build (' + problems.join('; ') + '). A store build must sign in with gridlockpb.com accounts: use npm run bundle:android, or npm run android:cloud first. To ship the offline build on purpose, set GRIDLOCK_OFFLINE_RELEASE=1.')
}
`;
function credentialHostsFor(brand) {
  const file = path.join(ROOT, brand.contact);
  if (!fs.existsSync(file)) return [];
  return require("./contact").credentialHosts(JSON.parse(fs.readFileSync(file, "utf8")));
}
function writeIfChanged(file, text) {
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text) fs.writeFileSync(file, text);
}
function entitlementsText(hosts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
	<key>com.apple.developer.associated-domains</key>
	<array>
${hosts.map(h => `\t\t<string>webcredentials:${h}</string>`).join("\n")}
	</array>
</dict></plist>
`;
}
// The guard phase, first in the App target, and the entitlements setting on
// both of its configurations. Rewritten whole each time, so a changed script
// replaces the old one and a second run changes nothing.
function withIOSSignIn(text, hosts) {
  const phase = `\t\t${RELEASE_GUARD_ID} /* Refuse an offline store build */ = {
\t\t\tisa = PBXShellScriptBuildPhase;
\t\t\talwaysOutOfDate = 1;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\tinputPaths = (
\t\t\t);
\t\t\tname = "Refuse an offline store build";
\t\t\toutputPaths = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t\tshellPath = /bin/sh;
\t\t\tshellScript = ${JSON.stringify(IOS_RELEASE_GUARD)};
\t\t\tshowEnvVarsInLog = 0;
\t\t};
`;
  text = text.replace(new RegExp(`\\t\\t${RELEASE_GUARD_ID} /\\* Refuse an offline store build \\*/ = \\{[\\s\\S]*?\\n\\t\\t\\};\\n`), "");
  text = text.replace("/* Begin PBXShellScriptBuildPhase section */\n", "/* Begin PBXShellScriptBuildPhase section */\n" + phase);
  if (!text.includes(`\t\t\t\t${RELEASE_GUARD_ID} /* Refuse an offline store build */,`))
    text = text.replace(/(504EC3031FED79650016851F \/\* App \*\/ = \{[\s\S]*?buildPhases = \(\n)/, `$1\t\t\t\t${RELEASE_GUARD_ID} /* Refuse an offline store build */,\n`);
  text = text.replace(/\t\t\t\tCODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;\n/g, "");
  if (hosts.length) text = text.replace(/(\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t\tCURRENT_PROJECT_VERSION)/g, "\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n$1");
  return text;
}
function withAssetStatements(manifest, strings, hosts) {
  manifest = manifest.replace(/\s*<meta-data android:name="asset_statements" android:resource="@string\/asset_statements" \/>/g, "");
  strings = strings.replace(/\s*<string name="asset_statements"[^>]*>[\s\S]*?<\/string>/g, "");
  if (!hosts.length) return { manifest, strings };
  manifest = manifest.replace(/(<application\b[^>]*>)/, `$1\n        <meta-data android:name="asset_statements" android:resource="@string/asset_statements" />`);
  const statements = hosts.map(h => `{\\"include\\": \\"https://${h}/.well-known/assetlinks.json\\"}`).join(", ");
  strings = strings.replace("</resources>", `    <string name="asset_statements" translatable="false">[${statements}]</string>\n</resources>`);
  return { manifest, strings };
}
// A build with an account server keeps three things a coach gives it, and
// Apple's privacy manifest has to say so: his email and the account id it
// signs in with, and — only if he turns on League sync — the season he
// uploads (other user content). All linked to him, none for tracking, all for
// the app to work. A brand with no account server collects nothing, so its
// manifest says nothing. The store's privacy label is the owner's to match.
const COLLECTED = ["NSPrivacyCollectedDataTypeEmailAddress", "NSPrivacyCollectedDataTypeUserID", "NSPrivacyCollectedDataTypeOtherUserContent"];
function hasAccounts(brand) {
  try { const c = JSON.parse(fs.readFileSync(path.join(ROOT, brand.contact), "utf8")).cloud; return !!(c && c.url && c.anonKey); }
  catch { return false; }
}
function collectedText(accounts) {
  if (!accounts) return "<key>NSPrivacyCollectedDataTypes</key><array/>";
  return "<key>NSPrivacyCollectedDataTypes</key><array>" + COLLECTED.map(t => `
        <dict>
            <key>NSPrivacyCollectedDataType</key><string>${t}</string>
            <key>NSPrivacyCollectedDataTypeLinked</key><true/>
            <key>NSPrivacyCollectedDataTypeTracking</key><false/>
            <key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
        </dict>`).join("") + "\n    </array>";
}
function withCollectedData(text, accounts) {
  return text.replace(/<key>NSPrivacyCollectedDataTypes<\/key>\s*(?:<array\/>|<array>[\s\S]*?<\/array>(?=\s*<key>NSPrivacyAccessedAPITypes))/, collectedText(accounts));
}
function configureSignIn(brand) {
  const hosts = credentialHostsFor(brand);
  const iosApp = path.join(ROOT, "ios/App/App");
  if (fs.existsSync(iosApp)) {
    update("ios/App/App/PrivacyInfo.xcprivacy", text => withCollectedData(text, hasAccounts(brand)));
    const ent = path.join(iosApp, "App.entitlements");
    if (hosts.length) writeIfChanged(ent, entitlementsText(hosts));
    else if (fs.existsSync(ent)) fs.rmSync(ent);
    update("ios/App/App.xcodeproj/project.pbxproj", text => withIOSSignIn(text, hosts));
  }
  const androidApp = path.join(ROOT, "android/app");
  if (fs.existsSync(androidApp)) {
    writeIfChanged(path.join(androidApp, "release-guard.gradle"), ANDROID_RELEASE_GUARD);
    update("android/app/build.gradle", text => text.includes("apply from: 'release-guard.gradle'") ? text : text.replace(/\s*$/, "") + "\napply from: 'release-guard.gradle'\n");
    const mf = path.join(androidApp, "src/main/AndroidManifest.xml"), st = path.join(androidApp, "src/main/res/values/strings.xml");
    if (fs.existsSync(mf) && fs.existsSync(st)) {
      const out = withAssetStatements(fs.readFileSync(mf, "utf8"), fs.readFileSync(st, "utf8"), hosts);
      writeIfChanged(mf, out.manifest); writeIfChanged(st, out.strings);
    }
  }
}
if (require.main === module) configure();
module.exports = { configure, withAndroidDomain, activeBrand, withIOSSignIn, withCollectedData, hasAccounts, COLLECTED, withAssetStatements, entitlementsText, IOS_RELEASE_GUARD, ANDROID_RELEASE_GUARD, RELEASE_GUARD_ID };

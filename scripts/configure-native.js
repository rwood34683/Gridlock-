"use strict";
/* Idempotent GRIDLOCK additions to freshly generated Capacitor projects. */
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
function configure() {
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
  update("android/app/src/main/AndroidManifest.xml", text => text.includes('android:scheme="gridlock"') ? text : text.replace("        </activity>", `            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="gridlock" />
            </intent-filter>
        </activity>`));
  const contactFile = path.join(ROOT, "site/contact.json");
  const domain = fs.existsSync(contactFile) ? JSON.parse(fs.readFileSync(contactFile, "utf8")).domain : null;
  update("android/app/src/main/AndroidManifest.xml", text => withAndroidDomain(text, domain));
  update("android/app/src/main/res/values/strings.xml", text => text.replace(/(<string name="custom_url_scheme">)[^<]*(<\/string>)/, "$1gridlock$2"));
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
\t\t<key>CFBundleURLName</key><string>com.upra.gridlock.coach</string>
\t\t<key>CFBundleURLSchemes</key><array><string>gridlock</string></array>
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
  }
}
if (require.main === module) configure();
module.exports = { configure, withAndroidDomain };

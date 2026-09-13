#!/usr/bin/env node
"use strict";
// Structural verification is portable; compilation still runs in Xcode/Gradle.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ROOT = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
let count = 0;
function check(value, message) { assert(value, message); count++; console.log("PASS " + message); }
function verify() {
  const cliRequire = createRequire(require.resolve("@capacitor/cli/package.json"));
  const plist = cliRequire("plist");
  const xcode = cliRequire("xcode");
  const project = xcode.project(path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj"));
  project.parseSync();
  const objects = project.hash.project.objects;
  const entries = section => Object.entries(objects[section] || {}).filter(([key]) => !key.endsWith("_comment")).map(([, value]) => value);
  check(entries("PBXNativeTarget").some(target => target.name === "App"), "Xcode project parses and contains App target");
  const configs = entries("XCBuildConfiguration").map(config => config.buildSettings);
  check(configs.length >= 4 && configs.every(settings => Number.parseFloat(settings.IPHONEOS_DEPLOYMENT_TARGET) >= 15), "all project and target configurations support iOS 15 or newer");
  check(configs.filter(settings => settings.PRODUCT_BUNDLE_IDENTIFIER).every(settings => settings.PRODUCT_BUNDLE_IDENTIFIER === "com.upra.gridlock.coach"), "bundle identifier is consistent");
  const refs = objects.PBXFileReference;
  const buildFiles = objects.PBXBuildFile;
  function phaseHas(section, filename) {
    return entries(section).some(phase => phase.files.some(item => {
      const build = buildFiles[item.value];
      const file = build && refs[build.fileRef];
      return file && String(file.path).replace(/^"|"$/g, "") === filename;
    }));
  }
  check(phaseHas("PBXSourcesBuildPhase", "SceneDelegate.swift"), "SceneDelegate is registered in the compile sources phase");
  check(phaseHas("PBXResourcesBuildPhase", "PrivacyInfo.xcprivacy"), "privacy manifest is registered in the resource phase");
  const info = plist.parse(read("ios/App/App/Info.plist"));
  const scenes = info.UIApplicationSceneManifest;
  check(scenes && scenes.UIApplicationSupportsMultipleScenes === false && scenes.UISceneConfigurations.UIWindowSceneSessionRoleApplication.some(scene => scene.UISceneDelegateClassName === "$(PRODUCT_MODULE_NAME).SceneDelegate"), "scene manifest uses the registered delegate");
  check(read("ios/App/App/AppDelegate.swift").includes("config.delegateClass = SceneDelegate.self"), "AppDelegate creates the scene configuration");
  const sceneSource = read("ios/App/App/SceneDelegate.swift");
  check(sceneSource.includes("CAPBridgeViewController()") && sceneSource.includes("SceneDelegateProxy.shared.scene(scene, willConnectTo:") && sceneSource.includes("openURLContexts:") && sceneSource.includes("continue: userActivity"), "scene creates the Capacitor bridge and forwards cold/warm links");
  check(info.CFBundleURLTypes.some(type => type.CFBundleURLSchemes.includes("gridlock")), "iOS class URL scheme is registered");
  check(info.NSMicrophoneUsageDescription && info.NSSpeechRecognitionUsageDescription, "iOS microphone and speech permission descriptions are present");
  const privacy = plist.parse(read("ios/App/App/PrivacyInfo.xcprivacy"));
  for (const [category, reason] of [["UserDefaults", "CA92.1"], ["FileTimestamp", "C617.1"]]) check(privacy.NSPrivacyAccessedAPITypes.some(api => api.NSPrivacyAccessedAPIType === "NSPrivacyAccessedAPICategory" + category && api.NSPrivacyAccessedAPITypeReasons.includes(reason)), category + " privacy reason is declared");
  check(read("ios/App/App.xcworkspace/contents.xcworkspacedata").includes("Pods/Pods.xcodeproj"), "workspace includes CocoaPods project");
  check(read("ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme").includes('BlueprintIdentifier="504EC3031FED79650016851F"'), "App scheme is shared for command-line builds");
  const podfile = read("ios/App/Podfile");
  check(/platform :ios, '15\.0'/.test(podfile) && !podfile.includes(".pnpm/"), "CocoaPods deployment target and portable paths are correct");
  const lock = JSON.parse(read("package-lock.json"));
  const versions = [];
  for (const name of ["core", "cli", "ios", "android", "app", "preferences", "share", "status-bar", "filesystem"]) {
    const installed = JSON.parse(read(`node_modules/@capacitor/${name}/package.json`)).version;
    check(installed.startsWith("8.") && lock.packages[`node_modules/@capacitor/${name}`].version === installed, `Capacitor ${name} matches the version 8 lockfile`);
    if (["core", "cli", "ios", "android"].includes(name)) versions.push(installed);
  }
  check(new Set(versions).size === 1, "core, CLI, iOS and Android versions match");
  const speechVersion = JSON.parse(read("node_modules/@capgo/capacitor-speech-recognition/package.json")).version;
  check(speechVersion === "8.2.0" && lock.packages["node_modules/@capgo/capacitor-speech-recognition"].version === speechVersion, "speech recognizer matches its pinned compatible version");
  const speechPatch = require("./patch-speech-plugin");
  check(read("node_modules/@capgo/capacitor-speech-recognition/" + speechPatch.relative).replace(/\r\n/g, "\n").includes(speechPatch.after), "Android finalized results exclude unstable text");
  check(podfile.includes("pod 'CapgoCapacitorSpeechRecognition'") && podfile.includes("node_modules/@capgo/capacitor-speech-recognition'"), "speech recognizer is included in CocoaPods");
  for (const [name, pod] of [["app", "CapacitorApp"], ["preferences", "CapacitorPreferences"], ["share", "CapacitorShare"], ["status-bar", "CapacitorStatusBar"], ["filesystem", "CapacitorFilesystem"]]) check(podfile.includes(`pod '${pod}'`) && podfile.includes(`node_modules/@capacitor/${name}'`), `${pod} is included in CocoaPods`);
  const iosOnly = process.argv.includes("--ios");
  const destinations = ["ios/App/App/public"];
  if (!iosOnly) destinations.push("android/app/src/main/assets/public");
  function visit(relative = "") {
    for (const entry of fs.readdirSync(path.join(ROOT, "web", relative), { withFileTypes: true })) {
      const file = path.join(relative, entry.name);
      if (entry.isDirectory()) visit(file);
      else for (const destination of destinations) assert(fs.readFileSync(path.join(ROOT, "web", file)).equals(fs.readFileSync(path.join(ROOT, destination, file))), `Stale native file: ${destination}/${file}. Run npm run sync.`);
    }
  }
  visit(); check(true, "every bundled web file matches source");
  const iosConfig = JSON.parse(read("ios/App/App/capacitor.config.json"));
  check(iosConfig.packageClassList.includes("FilesystemPlugin"), "Filesystem is registered in the iOS bridge");
  check(iosConfig.packageClassList.includes("SpeechRecognitionPlugin"), "speech recognizer is registered in the iOS bridge");
  if (!iosOnly) {
    const vars = read("android/variables.gradle");
    check(/minSdkVersion = 24/.test(vars) && /compileSdkVersion = 36/.test(vars) && /targetSdkVersion = 36/.test(vars), "Android SDK levels match Capacitor 8");
    check(read("android/build.gradle").includes("gradle:8.13.0") && read("android/gradle/wrapper/gradle-wrapper.properties").includes("gradle-8.14.3-"), "Android build tools match Capacitor 8");
    check(read("android/app/src/main/AndroidManifest.xml").includes("|density"), "Android configuration handles density changes");
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    check(manifest.includes("android.permission.RECORD_AUDIO") && manifest.includes("android.speech.RecognitionService"), "Android speech permissions and service query are configured");
    check(read("android/capacitor.settings.gradle").includes("capgo-capacitor-speech-recognition"), "speech recognizer is included in Android settings");
    const filePaths = read("android/app/src/main/res/xml/file_paths.xml");
    check(filePaths.includes('path="gridlock-exports/"') && !filePaths.includes("external-path"), "Android file sharing is limited to exported cache files");
    check(read("android/capacitor.settings.gradle").includes("capacitor-filesystem"), "Filesystem is included in Android settings");
  }
  console.log(`Native source: ${count}/${count} checks passed. Xcode/Gradle compilation is a separate platform step.`);
}
try { verify(); } catch (error) { console.error(error.message); process.exitCode = 1; }

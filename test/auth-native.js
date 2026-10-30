#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../web/native.js"), "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const events = {}, auth = [], classes = [], choices = [];
  const recovery = "gridlock://auth/callback#access_token=test&type=recovery";
  const window = {
    S: {mode: "recovery"}, set: () => {}, chooseAuth: mode => choices.push(mode), openJoin: code => classes.push(code),
    gridlockCloud: {isAuthUrl: url => url === recovery}, gridlockHandleAuthUrl: async url => auth.push(url),
    Capacitor: {isNativePlatform: () => true, getPlatform: () => "android", Plugins: {
      App: {getLaunchUrl: async () => ({url: recovery}), addListener: (name, fn) => {events[name] = fn;}, exitApp: () => {throw Error("Unexpected exit");}}
    }}
  };
  const document = {documentElement: {classList: {add() {}}}, addEventListener() {}, visibilityState: "visible"};
  vm.runInNewContext(source, {window, document, navigator: {}, URL, Promise, setTimeout, clearTimeout});
  await tick(); assert.deepEqual(auth, [recovery]); assert.deepEqual(classes, []);
  events.appUrlOpen({url: recovery}); await tick(); assert.equal(auth.length, 2);
  events.appUrlOpen({url: "gridlock://class/GL-123"}); assert.deepEqual(classes, ["GL-123"]);
  events.backButton(); assert.deepEqual(choices, [null]);
  console.log("Native auth routing: 4 checks passed (cold launch, running app, class link, recovery cancellation).");
})().catch(e => {console.error(e); process.exitCode = 1;});

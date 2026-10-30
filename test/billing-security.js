#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../native/gridlock-billing.js"), "utf8");
const now = Date.parse("2026-10-29T00:00:00Z");
class Clock extends Date { static now() { return now; } }
const env = {window:{},module:{exports:{}},Date:Clock};
vm.runInNewContext(source, env);
const {fromInfo} = env.module.exports;
const plan = active => JSON.parse(JSON.stringify(fromInfo({entitlements:{active}})));
let passed = 0;
function check(name, fn) { fn(); console.log("PASS " + name); passed++; }
for (const invalid of ["bad-date", "", 0, true, [], {}, "2026-10-28T00:00:00Z", "2026-10-29T00:00:00Z"]) {
  check("malformed or expired expiry is free: " + JSON.stringify(invalid), () => {
    assert.equal(plan({team:{expirationDate:invalid}}).plan,"free");
  });
}
check("valid future expiry is retained", () => {
  const exp="2026-11-29T00:00:00Z";
  assert.deepEqual(plan({team:{expirationDate:exp}}),{plan:"team",exp:Date.parse(exp),source:"revenuecat"});
});
check("only missing or null expiry grants lifetime", () => {
  for (const e of [{},{expirationDate:null}]) assert.deepEqual(plan({team:e}),{plan:"team",exp:0,source:"revenuecat"});
});
check("malformed entitlement record cannot grant lifetime", () => {
  for (const e of [true,"active",[]]) assert.equal(plan({team:e}).plan,"free");
});
check("invalid second entitlement cannot erase a valid expiry", () => {
  const exp="2026-11-29T00:00:00Z";
  assert.equal(plan({team:{expirationDate:exp},event:{expirationDate:"bad-date"}}).exp,Date.parse(exp));
});
check("valid lifetime survives another invalid entitlement", () => {
  assert.deepEqual(plan({team:{expirationDate:null},event:{expirationDate:"bad-date"}}),{plan:"team",exp:0,source:"revenuecat"});
});
console.log(`${passed} billing security checks passed.`);

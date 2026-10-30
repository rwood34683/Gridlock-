#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");
const { createServer } = require("../scripts/serve.js");
(async () => {
  const server = process.env.APP_URL ? null : createServer();
  if (server) await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = process.env.APP_URL || `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch(launchOptions());
  let passed = 0;
  async function screenshot(page, name) {
    if (!process.env.GRIDLOCK_TEST_SHOTS) return;
    fs.mkdirSync(process.env.GRIDLOCK_TEST_SHOTS, {recursive:true});
    await page.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS, name + ".png"),fullPage:true});
  }
  async function check(name, fn) {
    const context = await browser.newContext({serviceWorkers:"block", viewport:{width:390,height:844}});
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("dialog", d => d.accept());
    try {
      await page.goto(url);
      await fn(page);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } finally { await context.close(); }
  }
  async function auth(page, mode) {
    await page.evaluate(mode => set({entered:false, mode}), mode);
    await page.fill("#em", "coach@example.test"); await page.fill("#pw", "test-password");
    await page.evaluate(() => doAuth());
  }
  async function recovery(page) {
    await page.evaluate(() => {
      window.__updates = 0; window.__out = 0; window.__cancel = 0;
      window.gridlockCloud = {
        isAuthUrl: raw => raw.includes("#type=recovery"),
        handleAuthUrl: async () => ({ok:true, recovery:true, user:{id:"coach", email:"coach@example.test"}}),
        updatePassword: async () => { __updates++; return {ok:true, user:{id:"coach", email:"coach@example.test"}}; },
        cancelRecovery: () => { __cancel++; }, signOut: async () => { __out++; }
      };
      return gridlockHandleAuthUrl(location.origin + "/#type=recovery");
    });
  }
  async function passwords(page, confirm = "test-password") {
    await page.fill("#newpw", "test-password"); await page.fill("#confirmpw", confirm);
  }
  try {
    await check("confirmation-required signup stays signed out without a local credential", async page => {
      await page.evaluate(() => { window.gridlockCloud = {signUp:async()=>({ok:true,pendingConfirmation:true,user:{id:"new"}})}; });
      await auth(page, "create");
      assert.deepEqual(await page.evaluate(() => ({entered:S.entered, account:localStorage.getItem(STAFF_KEY), mode:S.mode})), {entered:false,account:null,mode:"login"});
      assert.match(await page.locator("#root").innerText(), /confirm your email/i);
      await screenshot(page,"signup-confirmation-required");
    });
    await check("failed cloud signup does not manufacture an offline account", async page => {
      await page.evaluate(() => { window.gridlockCloud = {signUp:async()=>({offline:true})}; });
      await auth(page, "create");
      assert.equal(await page.evaluate(() => S.entered || !!localStorage.getItem(STAFF_KEY)), false);
      assert.match(await page.locator("#root").innerText(), /connect to the internet/i);
    });
    await check("irrelevant deep link leaves the current account and sync alone", async page => {
      await recovery(page);
      assert.equal(await page.evaluate(async () => {
        set({entered:true,role:"staff",email:"kept@example.test",syncOn:true});
        const result = await gridlockHandleAuthUrl("gridlock://class/ABC");
        return !result && S.entered && S.syncOn && S.email === "kept@example.test";
      }), true);
    });
    await check("email confirmation returns to sign in without unlocking the app", async page => {
      await recovery(page);
      await page.evaluate(async () => {
        gridlockCloud.handleAuthUrl = async () => ({ok:true,confirmed:true,user:{id:"coach"}});
        await gridlockHandleAuthUrl(location.origin + "/#type=recovery");
      });
      assert.equal(await page.evaluate(() => S.entered), false);
      assert.match(await page.locator("#root").innerText(), /email is confirmed/i);
      await screenshot(page,"email-confirmed-signin");
    });
    await check("expired link stays locked and explains retry", async page => {
      await recovery(page);
      await page.evaluate(async () => {
        gridlockCloud.handleAuthUrl = async () => ({ok:false,said:"That link has expired. Request a new link."});
        await gridlockHandleAuthUrl(location.origin + "/#type=recovery");
      });
      assert.equal(await page.evaluate(() => S.entered), false);
      assert.equal(await page.locator("#newpw").count(), 0);
      assert.match(await page.locator("#root").innerText(), /expired/);
    });
    await check("recovery locks a prior account and saves no passwords or tokens", async page => {
      await page.evaluate(() => set({entered:true,role:"staff",email:"old@example.test",syncOn:true}));
      await recovery(page); await passwords(page);
      assert.deepEqual(await page.evaluate(() => ({entered:S.entered,syncOn:S.syncOn,role:S.role})), {entered:false,syncOn:false,role:"guest"});
      await page.evaluate(() => completePasswordReset());
      assert.equal(await page.evaluate(() => S.entered), true);
      const account = await page.evaluate(() => JSON.parse(localStorage.getItem(STAFF_KEY)));
      assert.equal(account.email,"coach@example.test"); assert.equal(account.cloud,true); assert.ok(account.hash && account.salt);
      assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes("test-password")), false);
    });
    await check("real adapter and UI complete a verified password callback together", async page => {
      await page.evaluate(() => {
        window.GRIDLOCK_CLOUD={url:"https://demo.supabase.co",anonKey:"public-test-fixture",redirectTo:location.origin+location.pathname};
        window.__requests=[];
        window.fetch=async (url,opts={}) => {
          __requests.push({url,method:opts.method,body:opts.body});
          return new Response(JSON.stringify({id:"coach-id",email:"coach@example.test"}),{status:200,headers:{"Content-Type":"application/json"}});
        };
      });
      await page.addScriptTag({path:path.join(__dirname,"../native/gridlock-cloud.js")});
      await page.evaluate(async () => {
        const callback=location.origin+location.pathname+"#"+new URLSearchParams({access_token:"test-access",refresh_token:"test-refresh",type:"recovery",expires_in:"3600"});
        history.replaceState(null,"",callback);
        await gridlockHandleAuthUrl(callback);
      });
      assert.equal(await page.evaluate(() => location.hash),"");
      assert.equal(await page.evaluate(() => gridlockCloud.session()),null);
      assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes("test-access")),false);
      await screenshot(page,"password-recovery-form");
      await passwords(page); await page.evaluate(() => completePasswordReset());
      assert.deepEqual(await page.evaluate(() => ({entered:S.entered,uid:gridlockCloud.session().user.id,method:__requests.at(-1).method,plain:JSON.stringify(localStorage).includes("test-password")})),
        {entered:true,uid:"coach-id",method:"PUT",plain:false});
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(STAFF_KEY)));
      assert.equal(saved.email,"coach@example.test"); assert.ok(saved.hash);
    });
    await check("mismatched passwords never reach the account server", async page => {
      await recovery(page); await passwords(page,"different-password"); await page.evaluate(() => completePasswordReset());
      assert.equal(await page.evaluate(() => __updates),0);
      assert.match(await page.locator("#root").innerText(), /do not match/);
    });
    await check("failed password update remains locked with retry form", async page => {
      await recovery(page); await passwords(page);
      await page.evaluate(() => { gridlockCloud.updatePassword=async()=>({ok:false,said:"Try again with a signal."}); return completePasswordReset(); });
      assert.equal(await page.evaluate(() => S.entered),false);
      assert.equal(await page.locator("#newpw").count(),1);
    });
    await check("failed local save signs out after server accepted new password", async page => {
      await recovery(page); await passwords(page);
      await page.evaluate(() => {
        const orig=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k===STAFF_KEY)throw new DOMException("quota","QuotaExceededError"); return orig.call(this,k,v);};
        return completePasswordReset();
      });
      assert.deepEqual(await page.evaluate(() => ({entered:S.entered,outs:__out})), {entered:false,outs:1});
      assert.match(await page.locator("#root").innerText(), /new password was accepted/i);
    });
    await check("cancelling a pending password update cannot enter later", async page => {
      await recovery(page); await passwords(page);
      await page.evaluate(() => { gridlockCloud.updatePassword=()=>new Promise(r=>window.__finish=r); window.__pending=completePasswordReset(); });
      await page.waitForFunction(() => typeof __finish === "function");
      await page.getByRole("button",{name:"Back to sign in",exact:true}).click();
      await page.evaluate(async () => { __finish({ok:true}); await __pending; });
      assert.deepEqual(await page.evaluate(() => ({entered:S.entered,account:localStorage.getItem(STAFF_KEY),cancel:__cancel})), {entered:false,account:null,cancel:1});
    });
    await check("crypto failure gives feedback without entering or saving an account", async page => {
      await page.evaluate(() => { crypto.subtle.digest = async () => { throw Error("unavailable"); }; });
      await auth(page,"create");
      assert.equal(await page.evaluate(() => S.entered || !!localStorage.getItem(STAFF_KEY)), false);
      assert.match(await page.locator("#root").innerText(), /could not securely/);
    });
    await check("server auth UI does not claim there is no server", async page => {
      await page.evaluate(() => { window.gridlockCloud={signIn:async()=>({ok:false})}; set({mode:"login"}); });
      assert.doesNotMatch(await page.locator("#root").innerText(), /There is no server to send it to/);
    });
    await check("backup rejects executable grades, point numbers and timestamps", async page => {
      const result = await page.evaluate(() => {
        const data = [
          {assessments:[{who:"Coach", score:'<img src=x onerror="window.__injected=1">',pt:1}]},
          {tally:[{pt:'<img src=x onerror="window.__injected=1">'}]},
          {calls:[{pt:1,at:"0);window.__injected=1;//"}]},
          {scout:{opponent:{breaks:[{pt:1,at:"0);window.__injected=1;//",plants:["T1"]}]}}}
        ];
        return data.map(d=>!!readCopy(JSON.stringify({format:COPY_FORMAT,v:1,data:d})).error);
      });
      assert.deepEqual(result,[true,true,true,true]);
    });
    await check("valid grades and recorded breaks still import", async page => {
      assert.equal(await page.evaluate(() => !!readCopy(JSON.stringify({format:COPY_FORMAT,v:1,data:{assessments:[{who:"Coach",score:4,pt:1,at:1}],scout:{opponent:{breaks:[{pt:1,at:1,plants:["T1"]}]}}}})).payload),true);
    });
    await check("free restore revokes a previously cached paid plan", async page => {
      await page.evaluate(async () => { gridlockBilling={buy:async()=>null,restore:async()=>({plan:"free",source:"store"})}; S.billing={plan:"team",exp:0}; await restorePlan(); });
      assert.equal(await page.evaluate(() => planOf()),"free");
      assert.match(await page.evaluate(() => S.billingSaid), /no active purchase/);
    });
    console.log(`${passed} account recovery/security checks passed.`);
  } finally {
    await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(r => server.close(r)); }
  }
})().catch(e => { console.error(e); process.exitCode=1; });

"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(process.env.GRIDLOCK_TEST_ROOT || path.join(__dirname, ".."));
const adapter = fs.readFileSync(path.join(root, "native/gridlock-cloud.js"), "utf8");
const app = fs.readFileSync(path.join(root, "web/index.html"), "utf8");
const KEY = "grindx.cloud.session";
const user = id => ({id, email:id + "@example.test"});
const credentials = id => ({access_token:"token-"+id,refresh_token:"refresh-"+id,expires_in:3600,user:user(id)});
const response = (body, status=200) => ({ok:status>=200&&status<300,status,json:async()=>body});
const deferred = () => {let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:v=>resolve(v)};};
const tick = () => new Promise(r=>setImmediate(r));
function adapterSetup(route) {
  const data = new Map(), requests=[];
  const localStorage = {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const window = {GRIDLOCK_CLOUD:{url:"https://fixture.supabase.co",anonKey:"public-fixture"}};
  const ctx = vm.createContext({window,localStorage,URL,URLSearchParams,Date,JSON,Promise,fetch:async(url,opts)=>{
    requests.push({url,...opts}); return route(url,opts);
  }});
  vm.runInContext(adapter,ctx);
  return {api:window.gridlockCloud,data,requests,configure:window.gridlockCloudConfigure};
}
function between(start,end){return app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));}
function bridgeSetup(getEntitlement) {
  const state={entered:true,email:"a@example.test",billing:{plan:"free",exp:0,source:"store"},tab:"playbook",preview:false};
  let acc={cloud:true,uid:"a",email:state.email}, session={user:user("a")}, renders=0, live=true;
  const cloud={getEntitlement,session:()=>session};
  const ctx=vm.createContext({window:{gridlockCloud:cloud},S:state,Date,Number,Object,String,
    _authAttempt:1,readAccount:()=>acc,render:()=>{renders++;},billingLive:()=>live});
  const plans=app.match(/const PLANS = [^\n]+/)[0]+"\n"+app.match(/const PLAN_NAME = [^\n]+/)[0];
  vm.runInContext(plans+"\n"+between("let _accountGrant =", "const ACCOUNT_SAVE_SAID")+"\n"+between("function planOf(){","function entitled(need)")+"\nthis.test={refreshAccountGrant,clearAccountGrant,accountGrantPlan,planOf};",ctx);
  return {ctx,state,cloud,test:ctx.test,account:v=>{acc=v;},session:v=>{session=v;},live:v=>{live=v;},renders:()=>renders};
}
const grant=(plan="program",id="a",exp=0)=>({ok:true,user:user(id),entitlement:{plan,exp,source:"account"}});
let passed=0;
async function check(name,fn){await fn();console.log("PASS "+name);passed++;}
(async()=>{
  await check("no session cannot query entitlements",async()=>{
    const s=adapterSetup(()=>response([]));assert.equal((await s.api.getEntitlement()).ok,false);assert.equal(s.requests.length,0);
  });
  await check("uses user bearer and exact owner-filtered row, with null expiry allowed",async()=>{
    const s=adapterSetup(url=>response(url.includes("/auth/")?credentials("a"):[{user_id:"a",plan:"program",expires_at:null}]));
    await s.api.signIn("a@example.test","fixture-password");
    const result=await s.api.getEntitlement(); assert.equal(result.entitlement.plan,"program");assert.equal(result.entitlement.exp,0);
    const req=s.requests.at(-1),url=new URL(req.url);assert.equal(url.searchParams.get("user_id"),"eq.a");assert.equal(url.searchParams.get("limit"),"1");
    assert.equal(req.headers.Authorization,"Bearer token-a");assert.equal(req.headers.apikey,"public-fixture");
  });
  for(const [name,row] of [
    ["missing",null],["expired",{user_id:"a",plan:"program",expires_at:"2020-01-01T00:00:00Z"}],
    ["epoch date",{user_id:"a",plan:"program",expires_at:"1970-01-01T00:00:00Z"}]
  ]) await check(name+" grant returns free",async()=>{
    const s=adapterSetup(url=>response(url.includes("/auth/")?credentials("a"):row?[row]:[]));
    await s.api.signIn("a@example.test","fixture-password");assert.equal((await s.api.getEntitlement()).entitlement.plan,"free");
  });
  for(const [name,row] of [
    ["other owner",{user_id:"b",plan:"program",expires_at:null}],
    ["unknown tier",{user_id:"a",plan:"admin",expires_at:null}],
    ["prototype tier",{user_id:"a",plan:"constructor",expires_at:null}],
    ["bad date",{user_id:"a",plan:"program",expires_at:"forever"}],
    ["missing date field",{user_id:"a",plan:"program"}],
    ["numeric zero date",{user_id:"a",plan:"program",expires_at:0}],
    ["date without timezone",{user_id:"a",plan:"program",expires_at:"2099-02-01T10:00:00"}],
    ["nonexistent calendar date",{user_id:"a",plan:"program",expires_at:"2099-02-30T10:00:00Z"}]
  ]) await check(name+" cannot grant access",async()=>{
    const s=adapterSetup(url=>response(url.includes("/auth/")?credentials("a"):[row]));
    await s.api.signIn("a@example.test","fixture-password");assert.equal((await s.api.getEntitlement()).ok,false);
  });
  await check("valid timestamp with UTC offset is honored",async()=>{
    const date="2099-02-01T10:00:00.123+00:00";
    const s=adapterSetup(url=>response(url.includes("/auth/")?credentials("a"):[{user_id:"a",plan:"team",expires_at:date}]));
    await s.api.signIn("a@example.test","fixture-password");assert.equal((await s.api.getEntitlement()).entitlement.exp,Date.parse(date));
  });
  for(const change of ["logout","account","configuration","another-tab"]) await check("late grant cancelled after "+change,async()=>{
    const gate=deferred(),s=adapterSetup(url=>url.includes("/rest/")?gate.promise:response(credentials(url.includes("logout")?"a":"b")));
    await s.api.signIn("b@example.test","fixture-password");const pending=s.api.getEntitlement();await tick();
    if(change==="logout")s.api.signOut();
    if(change==="account")await s.api.signIn("b@example.test","fixture-password");
    if(change==="configuration")s.configure("https://other.supabase.co","other-public");
    if(change==="another-tab")s.data.delete(KEY);
    gate.resolve(response([{user_id:"b",plan:"program",expires_at:null}]));assert.equal((await pending).ok,false);
  });
  await check("offline/error cannot manufacture a free grant response",async()=>{
    const s=adapterSetup(url=>{if(url.includes("/rest/"))throw Error("offline");return response(credentials("a"));});
    await s.api.signIn("a@example.test","fixture-password");const r=await s.api.getEntitlement();assert.equal(r.ok,false);assert.equal(r.offline,true);
  });
  await check("verified account grant supplements store without mutating its cache",async()=>{
    const s=bridgeSetup(async()=>grant());const original=JSON.stringify(s.state.billing);
    await s.test.refreshAccountGrant();assert.equal(s.test.planOf(),"program");assert.equal(JSON.stringify(s.state.billing),original);
    s.cloud.getEntitlement=async()=>grant("free");s.state.billing={plan:"team",exp:0,source:"store"};await s.test.refreshAccountGrant();
    assert.equal(s.test.planOf(),"team");
  });
  await check("staging stays unlocked and Free preview stays available",async()=>{
    const s=bridgeSetup(async()=>grant("free"));await s.test.refreshAccountGrant();s.live(false);assert.equal(s.test.planOf(),"program");
    s.state.preview=true;assert.equal(s.test.planOf(),"free");
  });
  for(const change of ["logout","account","session","adapter","newer-request"]) await check("bridge never applies stale grant after "+change,async()=>{
    const gate=deferred(),s=bridgeSetup(()=>gate.promise),pending=s.test.refreshAccountGrant();
    if(change==="logout"){s.test.clearAccountGrant();s.state.entered=false;}
    if(change==="account")s.account({cloud:true,uid:"b",email:"b@example.test"});
    if(change==="session")s.session({user:user("b")});
    if(change==="adapter")s.ctx.window.gridlockCloud={};
    if(change==="newer-request"){s.cloud.getEntitlement=async()=>grant("free");await s.test.refreshAccountGrant();}
    gate.resolve(grant());await pending;assert.equal(s.test.accountGrantPlan(),"free");assert.equal(s.test.planOf(),"free");
  });
  await check("bridge rejects mismatched owner and invalid adapter plan",async()=>{
    for(const r of [grant("program","b"),grant("constructor"),grant("program","a",NaN),grant("program","a",Date.now()-1)]){
      const s=bridgeSetup(async()=>r);await s.test.refreshAccountGrant();assert.equal(s.test.planOf(),"free");
    }
  });
  await check("refresh failure removes prior account grant but preserves purchases",async()=>{
    const s=bridgeSetup(async()=>grant());await s.test.refreshAccountGrant();s.cloud.getEntitlement=async()=>{throw Error("offline");};
    s.state.billing={plan:"team",exp:0,source:"store"};await s.test.refreshAccountGrant();assert.equal(s.test.planOf(),"team");
  });
  function wireAccountHandlers(s){
    const fields={em:{value:"a@example.test"},pw:{value:"test-password"},newpw:{value:"new-password"},confirmpw:{value:"new-password"}};
    Object.assign(s.ctx,{document:{getElementById:id=>fields[id]},_syncEpoch:0,_recoveryBusy:false,_recoveryUser:user("a"),
      ACCOUNT_SAVE_SAID:"Could not save",newSalt:()=>"fixture-salt",hashPass:async()=>"fixture-hash",save:()=>{},
      writeAccount:value=>{s.account(value);return true;},dropLegacyAccount:()=>{},set:patch=>Object.assign(s.state,patch)});
    s.ctx.window.crypto=s.ctx.crypto={subtle:{}};
    vm.runInContext(between("window.doAuth = async () => {","/* ============================================================\n   League sync")+
      "\n"+between("window.completePasswordReset = async () => {","function accountRecord("),s.ctx);
  }
  await check("real sign-in handler refreshes the newly verified account",async()=>{
    let reads=0;const s=bridgeSetup(async()=>{reads++;return grant();});s.state.entered=false;s.state.mode="login";
    s.cloud.signIn=async()=>({ok:true,user:user("a")});wireAccountHandlers(s);
    await s.ctx.window.doAuth();await tick();assert.equal(s.state.entered,true);assert.equal(reads,1);assert.equal(s.test.planOf(),"program");
  });
  await check("confirmation-required signup does not read access or enter the app",async()=>{
    let reads=0;const s=bridgeSetup(async()=>{reads++;return grant();});s.state.entered=false;s.state.mode="create";
    s.cloud.signUp=async()=>({ok:true,pendingConfirmation:true});wireAccountHandlers(s);
    await s.ctx.window.doAuth();await tick();assert.equal(s.state.entered,false);assert.equal(reads,0);assert.match(s.state.authSaid,/confirm/i);
  });
  await check("real recovery completion refreshes only after account storage succeeds",async()=>{
    let reads=0;const s=bridgeSetup(async()=>{reads++;return grant();});s.state.entered=false;s.state.mode="recovery";
    s.cloud.updatePassword=async()=>({ok:true,user:user("a")});wireAccountHandlers(s);
    await s.ctx.window.completePasswordReset();await tick();assert.equal(s.state.entered,true);assert.equal(reads,1);assert.equal(s.test.planOf(),"program");
  });
  // Compile every inline script; this catches template edits independently of the mocks.
  for(const m of app.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
  console.log(`Account entitlement checks: ${passed} passed; inline scripts parse.`);
})().catch(e=>{console.error(e);process.exitCode=1;});

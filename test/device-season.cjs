"use strict";
// Three independent browser stores share only the authenticated mock account
// server. Exercise the real cloud adapter and the app's sign-in/handoff UI.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const adapter = fs.readFileSync(path.join(__dirname,"../native/gridlock-cloud.js"),"utf8");
(async () => {
  const server=createServer({root:path.join(__dirname,"../web")});
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const url=`http://127.0.0.1:${server.address().port}/`, browser=await chromium.launch(launchOptions());
  const rows=new Map(), requests=[], pages=[], errors=[];
  let passed=0, failed=0;
  const clone=v=>JSON.parse(JSON.stringify(v));
  async function check(name,fn){try{await fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.error("FAIL "+name+": "+e.stack);for(const p of pages)console.error(await p.evaluate(()=>({screen:document.getElementById("root").innerText,syncOn:S.syncOn,said:S.syncSaid,choice:!!_deviceChoice,checking:!!_deviceChecking})));console.error(errors);throw e;}}
  async function device(width,height){
    console.log(`Opening test device ${width}x${height}`);
    const network={online:true};
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:"block"});
    await context.addInitScript({content:'window.GRIDLOCK_CLOUD={url:"https://account.example.test",anonKey:"public-test-only"};\n'+adapter});
    await context.route("https://account.example.test/**",async route=>{
      if(!network.online) return route.abort("internetdisconnected");
      const req=route.request(), u=new URL(req.url());
      const finish=(body,status=200)=>route.fulfill({status,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(body)});
      if(req.method()==="OPTIONS") return finish({});
      const body=req.postDataJSON(), token=(req.headers().authorization||"").replace("Bearer token-","");
      requests.push({path:u.pathname,owner:token,body});
      if(u.pathname==="/auth/v1/token"){
        const email=body.email.toLowerCase();
        return finish({access_token:"token-"+email,refresh_token:"refresh",expires_in:3600,user:{id:email,email}});
      }
      if(u.pathname==="/auth/v1/logout") return finish({});
      if(u.pathname==="/rest/v1/entitlements") return finish([{user_id:token,plan:"program",expires_at:null}]);
      if(u.pathname==="/rest/v1/seasons"){
        assert.equal(u.searchParams.get("owner"),"eq."+token,"reads belong to the signed-in account");
        return finish(rows.has(token)?[rows.get(token)]:[]);
      }
      if(u.pathname==="/rest/v1/rpc/gridlock_write_season"){
        const old=rows.get(token), revision=old?.revision||0;
        if(body.expected_revision!==revision) return finish({ok:false,conflict:true});
        rows.set(token,{revision:revision+1,payload:body.remove_season?null:body.season_payload,label:body.season_label,deleted_at:body.remove_season?new Date().toISOString():null});
        return finish({ok:true,revision:revision+1});
      }
      return finish({error:"Unexpected mock request"},400);
    });
    const p=await context.newPage();p.network=network;p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
    await p.goto(url);console.log(`Ready ${width}x${height}`);pages.push(p);return p;
  }
  async function settled(p){await p.waitForFunction(()=>!_deviceChecking && !_syncSending);}
  async function signIn(p,email="coach@example.test"){
    await p.evaluate(()=>{if(S.entered)staffSignOut();set({mode:"login"});});
    await p.fill("#em",email);await p.fill("#pw","test-password-only");await p.evaluate(()=>doAuth());
    await p.waitForFunction(()=>S.entered);await settled(p);
  }
  async function saved(p){await p.getByRole("button",{name:"Use my saved season",exact:true}).click();await settled(p);}
  async function send(p){await p.evaluate(()=>syncNow());await settled(p);assert.equal(await p.evaluate(()=>S.syncOn),true);}
  const writes=()=>requests.filter(r=>r.path.includes("gridlock_write_season")).length;
  try{
    const laptop=await device(1440,900),tablet=await device(820,1180),phone=await device(390,844);
    await check("laptop opts in before sending; account, team and whole season travel together",async()=>{
      await signIn(laptop);assert.equal(writes(),0);
      await laptop.evaluate(()=>set({myTeam:"Test Paintball",fmtDone:true,fmtAsk:false,roster:[{name:"Test Coach",num:"7",pos:"Back"}],messages:["Walk the field at nine"],games:[{id:"fixture-1",d:"2026-11-11",t:"10:00",h:"Test Paintball",a:"Test Opponent"}]}));
      await laptop.getByRole("button",{name:"Yes, back it up",exact:true}).click();await settled(laptop);
      assert.equal(writes(),0,"Yes checks the account first");
      await laptop.getByRole("button",{name:"Use this device's season",exact:true}).click();await settled(laptop);
      assert.equal(rows.get("coach@example.test").payload.data.myTeam,"Test Paintball");
      assert.equal(rows.get("coach@example.test").payload.data.messages[0],"Walk the field at nine");
    });
    await check("tablet and phone offer the saved season before format questions or any upload",async()=>{
      for(const p of [tablet,phone]){
        const count=writes();await signIn(p);
        assert.match(await p.locator("#root").innerText(),/Continue your season/i);
        assert.doesNotMatch(await p.locator("#root").innerText(),/Your format/i);
        assert.equal(writes(),count,"new device must not overwrite the server");
        if(process.env.GRIDLOCK_TEST_SHOTS){fs.mkdirSync(process.env.GRIDLOCK_TEST_SHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,p===phone?"phone-continue-season.png":"tablet-continue-season.png")});}
        await saved(p);
        assert.deepEqual(await p.evaluate(()=>[S.myTeam,S.messages[0],S.games[0].a,S.fmtDone,S.syncOn]),["Test Paintball","Walk the field at nine","Test Opponent",true,true]);
        assert.equal(await p.evaluate(()=>S.fmtAsk),false);
        assert.equal(await p.evaluate(()=>preRestoreCount()),1);
        assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        if(process.env.GRIDLOCK_TEST_SHOTS) await p.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,p===phone?"phone-season-ready.png":"tablet-season-ready.png")});
      }
    });
    await check("an opted-in laptop picks up phone edits at its next sign-in without another choice",async()=>{
      await phone.evaluate(()=>set({messages:[...S.messages,"Phone scouting note"]}));await send(phone);
      await signIn(laptop);
      assert.equal(await laptop.evaluate(()=>S.messages.includes("Phone scouting note")),true);
      assert.equal(await laptop.evaluate(()=>S.syncOn),true);
      assert.equal(await laptop.getByRole("button",{name:"Use my saved season",exact:true}).count(),0);
    });
    await check("offline edits on two devices pause rather than overwrite either copy",async()=>{
      tablet.network.online=false;
      await tablet.evaluate(()=>set({messages:[...S.messages,"Tablet unsent note"]}));
      const before=clone(rows.get("coach@example.test"));await tablet.evaluate(()=>syncNow());await settled(tablet);
      assert.equal(await tablet.evaluate(()=>S.syncOn),true,"offline keeps the retry queued");
      assert.deepEqual(rows.get("coach@example.test"),before);
      tablet.network.online=true;
      await tablet.evaluate(()=>window.dispatchEvent(new Event("online")));
      await tablet.evaluate(()=>syncNow());await tablet.waitForFunction(()=>S.syncOn===false);
      assert.equal(await tablet.evaluate(()=>S.syncOn),false);
      assert.deepEqual(rows.get("coach@example.test"),before);
      assert.equal(await tablet.evaluate(()=>S.messages.includes("Tablet unsent note")),true);
      await tablet.evaluate(()=>continueDeviceSeason());await settled(tablet);
      assert.equal(await tablet.getByRole("button",{name:"Use my saved season",exact:true}).isVisible(),true);
      await saved(tablet);
      assert.match(await tablet.evaluate(()=>localStorage.getItem(preRestoreKey(0))),/Tablet unsent note/);
    });
    await check("account switching never automatically sends the previous coach's season",async()=>{
      const count=writes();await signIn(phone,"other@example.test");
      assert.equal(writes(),count);assert.equal(rows.has("other@example.test"),false);
      await phone.getByRole("button",{name:"Not now",exact:true}).click();
      assert.equal(writes(),count);await signIn(phone,"other@example.test");
      assert.doesNotMatch(await phone.locator("#root").innerText(),/Back up your season|Continue your season/i);
    });
    await check("refused recovery storage prevents replacing either device's work",async()=>{
      const r=clone(rows.get("coach@example.test"));r.revision++;r.payload.data.messages.push("New server note");rows.set("coach@example.test",r);
      await tablet.evaluate(()=>set({messages:[...S.messages,"Unsent local work"]}));
      await tablet.evaluate(()=>continueDeviceSeason());await settled(tablet);
      const before=await tablet.evaluate(()=>deviceSeasonText()),count=writes();
      await tablet.evaluate(()=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.includes("before-cloud-restore"))return;return __setItem.call(this,k,v);};});
      await saved(tablet);
      assert.equal(await tablet.evaluate(()=>deviceSeasonText()),before);
      assert.equal(await tablet.evaluate(()=>S.syncOn),false);assert.equal(writes(),count);
      assert.match(await tablet.locator("#root").innerText(),/not enough room/);
      await tablet.evaluate(()=>{Storage.prototype.setItem=__setItem;cancelDeviceSeason();});
    });
    await check("an explicit local choice also preserves the server season it replaces",async()=>{
      await tablet.evaluate(()=>continueDeviceSeason());await settled(tablet);
      const old=clone(rows.get("coach@example.test"));
      await tablet.getByRole("button",{name:"Use this device's season",exact:true}).click();await settled(tablet);
      assert.equal(rows.get("coach@example.test").payload.data.messages.includes("Unsent local work"),true);
      const kept=await tablet.evaluate(()=>JSON.parse(localStorage.getItem(STORE_KEY+".before-account-replace")));
      assert.deepEqual(kept,old.payload);
    });
    await check("late saved-season responses cannot restore after sign-out",async()=>{
      await signIn(tablet);
      await tablet.evaluate(()=>{const original=gridlockCloud.deviceSeason;gridlockCloud.deviceSeason=async raw=>{const r=await original(raw);return new Promise(resolve=>window.__finish=()=>resolve(r));};continueDeviceSeason();});
      await tablet.waitForFunction(()=>typeof __finish==="function");
      const before=await tablet.evaluate(()=>deviceSeasonText());
      await tablet.evaluate(()=>{staffSignOut();__finish();});await settled(tablet);
      assert.equal(await tablet.evaluate(()=>S.entered),false);assert.equal(await tablet.evaluate(()=>deviceSeasonText()),before);
    });
    await check("a removed server copy stays deleted until an explicit choice",async()=>{
      const r=rows.get("coach@example.test");rows.set("coach@example.test",{...r,revision:r.revision+1,payload:null,deleted_at:"2026-11-11T12:00:00Z"});
      const count=writes();await signIn(laptop);
      assert.match(await laptop.locator("#root").innerText(),/saved copy was deleted/);
      assert.equal(writes(),count);await laptop.getByRole("button",{name:"Keep working here — sync off",exact:true}).click();
      await signIn(laptop);assert.equal(writes(),count);assert.equal(await laptop.evaluate(()=>S.syncOn),false);
    });
    await check("no errors and checkpoints contain hashes only, never seasons or credentials",async()=>{
      assert.deepEqual(errors,[]);
      const saved=await laptop.evaluate(()=>Object.keys(localStorage).filter(k=>k.endsWith(":device")).map(k=>JSON.parse(localStorage.getItem(k))));
      assert.equal(saved.length,1);assert.deepEqual(Object.keys(saved[0]).sort(),["hash","revision"]);assert.match(saved[0].hash,/^[a-f0-9]{64}$/);
    });
  }catch(e){if(!failed){failed++;console.error(e.stack);}}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
  console.log(`${passed}/${passed+failed} device-season checks passed`);if(failed)process.exitCode=1;
})();

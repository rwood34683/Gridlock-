"use strict";
// Independent browser stores, the real adapter, and an account-bound mock
// server. No real account or coach's season is read or written.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),{createServer}=require("../scripts/serve");
const adapter=fs.readFileSync(path.join(__dirname,"../native/gridlock-cloud.js"),"utf8");
(async()=>{
  const server=createServer({root:path.join(__dirname,"../web")});
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());
  const errors=[],requests=[];let row=null,contexts=[],passed=0,failed=0;
  const clone=v=>JSON.parse(JSON.stringify(v)),writes=()=>requests.filter(r=>r.path.includes("/rpc/")).length;
  async function device(width,height){
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:"block"});contexts.push(context);
    await context.addInitScript({content:`window.GRIDLOCK_CLOUD={url:"https://account.example.test",anonKey:"public-test-only"};
      const originalInterval=window.setInterval;
      window.setInterval=(fn,ms,...args)=>{if(ms===30000 && String(fn).includes("receiveAccountSeason"))window.__receiveTick=fn;return originalInterval(fn,ms,...args);};\n`+adapter});
    let online=true;
    await context.route("https://account.example.test/**",async route=>{
      if(!online)return route.abort("internetdisconnected");
      const req=route.request(),u=new URL(req.url()),body=req.postDataJSON();
      const finish=(data,status=200)=>route.fulfill({status,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(data)});
      if(req.method()==="OPTIONS")return finish({});
      const owner=(req.headers().authorization||"").replace("Bearer token-","");requests.push({path:u.pathname,owner,body});
      if(u.pathname==="/auth/v1/token")return finish({access_token:"token-"+body.email,refresh_token:"refresh",expires_in:3600,user:{id:body.email,email:body.email}});
      if(u.pathname==="/auth/v1/logout")return finish({});
      if(u.pathname==="/rest/v1/entitlements")return finish([{user_id:owner,plan:"program",expires_at:null}]);
      if(u.pathname==="/rest/v1/seasons"){
        assert.equal(u.searchParams.get("owner"),"eq."+owner);
        return finish(owner==="coach@example.test"&&row?[row]:[]);
      }
      if(u.pathname==="/rest/v1/rpc/gridlock_write_season"){
        assert.equal(owner,"coach@example.test");
        if(body.expected_revision!==(row?.revision||0))return finish({ok:false,conflict:true});
        row={revision:(row?.revision||0)+1,payload:body.remove_season?null:body.season_payload,label:body.season_label,deleted_at:body.remove_season?"today":null};
        return finish({ok:true,revision:row.revision});
      }
      return finish({error:"Unexpected test request"},400);
    });
    const p=await context.newPage();p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
    p.online=value=>{online=value;};await p.goto(url);return p;
  }
  async function settled(p){await p.waitForFunction(()=>!_deviceChecking&&!_syncSending&&!_seasonReceiving);}
  async function signIn(p,email="coach@example.test"){
    await p.evaluate(()=>set({mode:"login"}));await p.fill("#em",email);await p.fill("#pw","fixture-password");await p.evaluate(()=>doAuth());await p.waitForFunction(()=>S.entered);await settled(p);
  }
  async function fixture(){
    for(const c of contexts)await c.close();contexts=[];row=null;requests.length=0;
    const a=await device(1440,900),b=await device(390,844);
    await signIn(a);await a.evaluate(()=>set({fmtDone:true,fmtAsk:false,myTeam:"Our team",codes:[{word:"Blue",means:"Hold"}],teamCode:"TEST",roster:[{name:"Coach",num:"7",pos:"Back"}]}));
    await a.getByRole("button",{name:"Yes, back it up",exact:true}).click();await settled(a);
    await a.getByRole("button",{name:"Use this device's season",exact:true}).click();await settled(a);
    await signIn(b);await b.getByRole("button",{name:"Use my saved season",exact:true}).click();await settled(b);
    await b.evaluate(()=>{set({tab:"home",more:null});document.activeElement?.blur();_seasonInputAt=0;});
    return {a,b};
  }
  async function change(a){
    await a.evaluate(()=>{set({codes:[{word:"Rocket",means:"Send the snake"}],bunkerCalls:{[S.layoutKey]:{[curLayout().bunkers[0].id]:"Home"}},breakCalls:{snake:"Blue run"},playerCalls:{[S.layoutKey]:{Coach:{[curLayout().bunkers[0].id]:"Ace"}}},messages:["Meet at the pit"],games:[{id:"sync-game",d:"2026-11-12",t:"10:00",h:"Our team",a:"Other team"}],roster:[{name:"Coach",num:"7",pos:"Back"},{name:"Second",num:"8",pos:"Front"}]});return syncNow();});await settled(a);
  }
  async function receive(b){await b.evaluate(()=>{_seasonInputAt=0;document.activeElement?.blur();return receiveAccountSeason();});await settled(b);}
  async function delay(b){
    await b.evaluate(()=>{window.__read=gridlockCloud.deviceSeason;gridlockCloud.deviceSeason=async raw=>{const r=await __read(raw);return new Promise(resolve=>window.__finish=()=>resolve(r));};_seasonInputAt=0;receiveAccountSeason();});
    await b.waitForFunction(()=>typeof __finish==="function");
  }
  async function check(name,fn){try{await fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.error("FAIL "+name+"\n"+e.stack);throw e;}}
  try{
    await check("already signed-in phone receives the same codes, names, roster and schedule without an upload",async()=>{
      const {a,b}=await fixture();await change(a);const count=writes();await receive(b);
      const keys=["codes","bunkerCalls","breakCalls","playerCalls","roster","games","messages","teamCode","myTeam"];
      assert.deepEqual(await b.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,S[k]])),keys),await a.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,S[k]])),keys));
      assert.equal(writes(),count);assert.equal(await b.evaluate(()=>S.entered&&S.syncOn),true);
      assert.match(await b.evaluate(()=>localStorage.getItem(preRestoreKey(0))),/Blue/);
      await b.reload();await settled(b);assert.equal(await b.evaluate(()=>S.codes[0].word),"Rocket");
    });
    await check("returning to an open tablet checks automatically; Nexus explains the same behavior",async()=>{
      const {a,b}=await fixture();await b.setViewportSize({width:1024,height:768});await change(a);
      await b.evaluate(()=>window.dispatchEvent(new Event("focus")));
      await b.waitForFunction(()=>S.codes[0].word==="Rocket",null,{timeout:12000});
      await b.evaluate(()=>set({tab:"more",more:"nexus"}));
      assert.match(await b.locator("#root").innerText(),/code words, bunker names/);
      assert.match(await b.locator("#root").innerText(),/every 30 seconds/);
      assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(process.env.GRIDLOCK_TEST_SHOTS){fs.mkdirSync(process.env.GRIDLOCK_TEST_SHOTS,{recursive:true});await b.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,"tablet-account-sync.png"),fullPage:true});await b.setViewportSize({width:390,height:844});await b.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,"phone-account-sync.png"),fullPage:true});}
    });
    await check("the visible-device interval receives changes and an unchanged sync does not rewrite the server",async()=>{
      const {a,b}=await fixture();await change(a);const count=writes();
      await b.evaluate(()=>{_seasonInputAt=0;__receiveTick();});await b.waitForFunction(()=>S.codes[0].word==="Rocket");await settled(b);
      await b.evaluate(()=>syncNow());await settled(b);await receive(b);assert.equal(writes(),count);
    });
    await check("a send that discovers a clean newer copy receives it instead of pausing sync",async()=>{
      const {a,b}=await fixture();await change(a);const count=writes();
      await b.evaluate(()=>{_seasonInputAt=0;return syncNow();});await settled(b);
      assert.equal(await b.evaluate(()=>S.codes[0].word),"Rocket");assert.equal(await b.evaluate(()=>S.syncOn),true);assert.equal(writes(),count);
    });
    await check("typing, blurred drafts, recording selections, clocks and voice drafts delay replacement",async()=>{
      const {a,b}=await fixture();await change(a);const before=await b.evaluate(()=>deviceSeasonText());
      await b.evaluate(()=>{const el=document.createElement("textarea");el.id="draft-test";document.body.append(el);el.focus();el.value="Unfinished note";_seasonInputAt=0;return receiveAccountSeason();});
      assert.equal(await b.evaluate(()=>deviceSeasonText()),before);await receive(b);
      assert.equal(await b.locator("#draft-test").inputValue(),"Unfinished note");assert.equal(await b.evaluate(()=>deviceSeasonText()),before);
      await b.locator("#draft-test").evaluate(el=>el.remove());
      for(const [key,value]of [["tallyDraft",{}],["theirPick",["test"]],["building",{}],["clockEnd",Date.now()+60000],["gamePaste","unfinished"]]){
        await b.evaluate(([key,value])=>{S[key]=value;},[key,value]);await receive(b);assert.equal(await b.evaluate(()=>deviceSeasonText()),before,key);
        await b.evaluate(key=>{S[key]=key==="theirPick"?[]:null;},key);
      }
      await b.evaluate(()=>{_voiceUI.draft="Unsent voice note";});await receive(b);assert.equal(await b.evaluate(()=>deviceSeasonText()),before);
      await b.evaluate(()=>{_voiceUI.draft="";});await receive(b);assert.equal(await b.evaluate(()=>S.codes[0].word),"Rocket");
    });
    await check("typing begun while a read waits is not erased by its late response",async()=>{
      const {a,b}=await fixture();await change(a);await delay(b);
      await b.evaluate(()=>{const el=document.createElement("input");el.id="late-draft";document.body.append(el);el.focus();el.value="Keep this";__finish();});await settled(b);
      assert.equal(await b.locator("#late-draft").inputValue(),"Keep this");assert.equal(await b.evaluate(()=>S.codes[0].word),"Blue");
    });
    await check("a pending incoming copy reports waiting without redrawing an unfinished form",async()=>{
      const {a,b}=await fixture();await change(a);
      await b.evaluate(()=>{const el=document.createElement("textarea");el.id="pending-note";document.getElementById("root").append(el);el.value="Keep this draft";_seasonInputAt=0;return sendSeason(false);});await settled(b);
      assert.equal(await b.locator("#pending-note").inputValue(),"Keep this draft");
      assert.equal(await b.evaluate(()=>S.codes[0].word),"Blue");assert.match(await b.evaluate(()=>S.syncSaid),/waiting to open/);
      await b.locator("#pending-note").evaluate(el=>el.remove());await receive(b);assert.equal(await b.evaluate(()=>S.codes[0].word),"Rocket");
    });
    await check("both-edited copies pause, preserve local data and never overwrite the account",async()=>{
      const {a,b}=await fixture();await change(a);await b.evaluate(()=>set({messages:["Unsent phone note"]}));const remote=clone(row),count=writes();
      await receive(b);assert.equal(await b.evaluate(()=>S.syncOn),false);assert.deepEqual(await b.evaluate(()=>S.messages),["Unsent phone note"]);
      assert.deepEqual(row,remote);assert.equal(writes(),count);assert.match(await b.evaluate(()=>S.syncSaid),/Get saved season/);
    });
    await check("saved edits made during a pending read cancel replacement",async()=>{
      const {a,b}=await fixture();await change(a);await delay(b);
      await b.evaluate(()=>{set({messages:["Changed while waiting"]});__finish();});await settled(b);
      assert.deepEqual(await b.evaluate(()=>S.messages),["Changed while waiting"]);assert.equal(await b.evaluate(()=>S.codes[0].word),"Blue");
    });
    await check("offline reads retain sync consent and reconnect receives the newer copy",async()=>{
      const {a,b}=await fixture();await change(a);b.online(false);await receive(b);assert.equal(await b.evaluate(()=>S.syncOn),true);
      b.online(true);await b.evaluate(()=>{_seasonInputAt=0;window.dispatchEvent(new Event("online"));});
      await b.waitForFunction(()=>S.codes[0].word==="Rocket");assert.equal(await b.evaluate(()=>S.syncOn),true);
    });
    for(const action of ["sign out","pause","manual restore","switch account"]){
      await check("a late response cannot replace data after "+action,async()=>{
        const {a,b}=await fixture();await change(a);const before=await b.evaluate(()=>deviceSeasonText());await delay(b);
        await b.evaluate(action=>{
          if(action==="sign out"||action==="switch account")staffSignOut();
          else if(action==="pause")toggleSync();
          else {const raw=copyPayload("all");loadCopy("replace",raw);}
          __finish();
        },action);await settled(b);
        if(action==="switch account"){await b.evaluate(()=>{gridlockCloud.deviceSeason=__read;});await signIn(b,"other@example.test");}
        assert.equal(await b.evaluate(()=>deviceSeasonText()),before);assert.equal(await b.evaluate(()=>S.codes[0].word),"Blue");
      });
    }
    await check("deleted cloud copies are not resurrected; unknown device checkpoints need a choice",async()=>{
      for(const removed of [true,false]){
        const {a,b}=await fixture();await change(a);
        if(removed)row={...row,revision:row.revision+1,payload:null,deleted_at:"today"};
        else await b.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.endsWith(":device"))localStorage.removeItem(k);});
        const before=clone(row),count=writes();await receive(b);assert.equal(await b.evaluate(()=>S.syncOn),false);assert.equal(await b.evaluate(()=>S.codes[0].word),"Blue");assert.deepEqual(row,before);assert.equal(writes(),count);
      }
    });
    await check("a refused recovery write leaves the current season intact",async()=>{
      const {a,b}=await fixture();await change(a);
      await b.evaluate(()=>{const old=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.includes("before-cloud-restore"))return;old.call(this,k,v);};});
      await receive(b);assert.equal(await b.evaluate(()=>S.codes[0].word),"Blue");assert.match(await b.evaluate(()=>S.syncSaid),/not enough room/);
    });
    await check("automatic receiving preserves device-only boards, practice logs and display preferences",async()=>{
      const {a,b}=await fixture();await b.evaluate(()=>{S.wb={boards:{local:[{x:1,y:2}]}};S.rep={running:false,log:[{at:1}]};S.tallyMode="score";save(S);});await change(a);await receive(b);
      assert.deepEqual(await b.evaluate(()=>[S.wb,S.rep.log,S.tallyMode]),[{boards:{local:[{x:1,y:2}]}},[{at:1}],"score"]);
      assert.equal(await b.evaluate(()=>S.codes[0].word),"Rocket");
    });
    await check("hidden and paused devices make no automatic reads; returning visible resumes checks",async()=>{
      const {a,b}=await fixture();await change(a);const count=requests.length;
      await b.evaluate(()=>Object.defineProperty(document,"visibilityState",{configurable:true,value:"hidden"}));await receive(b);assert.equal(requests.length,count);
      await b.evaluate(()=>{Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"});document.dispatchEvent(new Event("visibilitychange"));});
      await b.waitForFunction(()=>S.codes[0].word==="Rocket",null,{timeout:12000});await settled(b);
      await b.evaluate(()=>toggleSync());const paused=requests.length;await receive(b);assert.equal(requests.length,paused);
    });
    await check("account mismatches cannot apply a season and all browser checks are error-free",async()=>{
      const {a,b}=await fixture();await change(a);const before=await b.evaluate(()=>deviceSeasonText());
      await b.evaluate(()=>{const old=gridlockCloud.deviceSeason;gridlockCloud.deviceSeason=async raw=>({...await old(raw),user:{id:"other@example.test"}});});
      await receive(b);assert.equal(await b.evaluate(()=>deviceSeasonText()),before);assert.deepEqual(errors,[]);
    });
  }catch(e){if(!failed){failed++;console.error(e.stack);}}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
  console.log(`${passed}/${passed+failed} automatic-season checks passed`);if(failed)process.exitCode=1;
})();

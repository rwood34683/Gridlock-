"use strict";
// The 12 Nov interaction audit: the five PRs merged that day, used together.
//  - Back a point carries a voice recap and its sightings with the men;
//  - the split-deck turn is in the Quick log, and a refusal is seen over it;
//  - checking the account's saved season never takes the screen mid-match, and
//    leaving the check keeps the coach's yes to sync;
//  - a saved season adopted with a match under way opens on that match.
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve");
const ADAPTER=fs.readFileSync(path.resolve(__dirname,"../native/gridlock-cloud.js"),"utf8");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,fn){
  const contexts=[],errors=[];
  // A plain phone, signed in, with no account server.
  const phone=async()=>{const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});contexts.push(c);
   const p=await c.newPage();p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());await p.goto(url);
   await p.evaluate(()=>{localStorage.clear();});await p.reload();
   await p.evaluate(()=>{S.entered=true;S.role="staff";S.fmtDone=true;S.fmtAsk=false;S.email="c@x.test";render();});return p;};
  // A device with the account adapter in front of a scripted account server.
  const rows=new Map(),ctl={seasonDelay:0};
  const device=async(width=390,height=844)=>{const c=await browser.newContext({viewport:{width,height},serviceWorkers:"block"});contexts.push(c);
   await c.addInitScript({content:'window.GRIDLOCK_CLOUD={url:"https://account.example.test",anonKey:"public-test-only"};\n'+ADAPTER});
   await c.route("https://account.example.test/**",async route=>{
    const req=route.request(),u=new URL(req.url());
    const finish=(body,status=200)=>route.fulfill({status,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(body)});
    if(req.method()==="OPTIONS")return finish({});
    const body=req.postDataJSON(),token=(req.headers().authorization||"").replace("Bearer token-","");
    if(u.pathname==="/auth/v1/token"){const email=body.email.toLowerCase();return finish({access_token:"token-"+email,refresh_token:"refresh",expires_in:3600,user:{id:email,email}});}
    if(u.pathname==="/auth/v1/logout")return finish({});
    if(u.pathname==="/rest/v1/entitlements")return finish([{user_id:token,plan:"program",expires_at:null}]);
    if(u.pathname==="/rest/v1/seasons"){if(ctl.seasonDelay)await new Promise(r=>setTimeout(r,ctl.seasonDelay));return finish(rows.has(token)?[rows.get(token)]:[]);}
    if(u.pathname==="/rest/v1/rpc/gridlock_write_season"){const old=rows.get(token),revision=old?.revision||0;
     if(body.expected_revision!==revision)return finish({ok:false,conflict:true});
     rows.set(token,{revision:revision+1,payload:body.remove_season?null:body.season_payload,label:body.season_label,deleted_at:null});return finish({ok:true,revision:revision+1});}
    return finish({error:"x"},400);});
   const p=await c.newPage();p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());await p.goto(url);return p;};
  const settled=p=>p.waitForFunction(()=>!_deviceChecking&&!_syncSending,null,{timeout:60000});
  const signIn=async p=>{await p.evaluate(()=>{if(S.entered)staffSignOut();set({mode:"login"});});
   await p.fill("#em","coach@example.test");await p.fill("#pw","test-password-only");await p.evaluate(()=>doAuth());await p.waitForFunction(()=>S.entered);};
  // Signed in, backed up, a match vs Dynasty under way and saved to the account.
  const syncedMatch=async p=>{await signIn(p);await settled(p);await p.evaluate(()=>set({fmtDone:true,fmtAsk:false}));
   await p.getByRole("button",{name:"Yes, back it up",exact:true}).click();await settled(p);
   if(await p.getByRole("button",{name:"Use this device's season",exact:true}).count()){await p.getByRole("button",{name:"Use this device's season",exact:true}).click();await settled(p);}
   await p.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"}});newMatch();endPoint("us");endPoint("them");});
   await p.evaluate(()=>syncNow());await settled(p);};
  try{await fn({phone,device,settled,signIn,syncedMatch,ctl});assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);}
  catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}
  finally{for(const c of contexts)await c.close();}
 }
 try{
  await check("Back a point carries a voice recap and its sightings with the men, so no point is left that nobody played",async({phone})=>{
   const p=await phone();
   await p.evaluate(()=>{S.tab="tally";S.layoutKey="mwo";openSheet({vs:"Voice fixture"});S.right={name:"Voice fixture"};
    S.scout={"Voice fixture":{players:[{num:"7",name:"Alex"}]}};S.bunkerCalls={mwo:{"GW#1":"Home"}};render();endPoint("us");});
   await p.waitForTimeout(1600);await p.evaluate(()=>tapNext());
   await p.evaluate(()=>{S.breakouts=[...S.breakouts,{id:"b1",m:S.matchId,pt:3,side:"us",bunker:curLayout().bunkers[0].id,layout:S.layoutKey,player:"Reyes",at:Date.now()}];save(S);openPointVoice(3);});
   await p.locator("#voice-manual").fill("Alex moved to Home");await p.getByRole("button",{name:"Record text",exact:true}).click();
   const r=await p.evaluate(()=>{set({tab:"tally"});backPoint();
    return {pt:S.point,bo:S.breakouts.filter(x=>x.m===S.matchId).map(x=>x.pt),voice:S.voiceEvents.map(e=>e.pt),sight:S.arrivalSightings.map(s=>s.pt),last:lastPointFresh(S.matchId)};});
   assert.equal(r.voice.length>0,true,"the recap was recorded");
   assert.deepEqual([...new Set([...r.bo,...r.voice,...r.sight])],[2]);assert.equal(r.last,2);
   const e=await p.evaluate(()=>{endPoint("us");timeUp();return {over:!!matchOver(),sp:sheetPoint()};});
   assert.equal(e.over,true);assert.equal(e.sp,2,"the finished sheet ends on the point played");
  });
  await check("on a split deck the Quick log carries the turn, and a refused result is seen over it",async({phone})=>{
   const p=await phone();
   await p.evaluate(()=>{S.tab="more";S.more="format";setFmt("div","Division 3");setFmt("splitDeck",1);openSheet({vs:"Dynasty"});S.right={name:"Dynasty"};S.tab="tally";render();openQuick();});
   await p.locator(".qlog").getByRole("button",{name:"We won it"}).click();
   assert.equal(await p.locator(".qlog .deck-panel").count(),1,"the turn is in the Quick log");
   await p.waitForTimeout(1600);
   await p.locator(".qlog").getByRole("button",{name:"They won it"}).click();
   const seen=await p.evaluate(()=>{const f=document.querySelector(".flash");if(!f)return "no message";const b=f.getBoundingClientRect();
    const at=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return f.contains(at)?"seen":"covered by "+(at&&at.className);});
   assert.equal(seen,"seen");assert.deepEqual(await p.evaluate(()=>matchScore()),{us:1,them:0},"the refused tap scored nothing");
   await p.locator(".qlog").getByRole("button",{name:"Our point is starting"}).click();
   await p.locator(".qlog").getByRole("button",{name:"They won it"}).click();
   assert.deepEqual(await p.evaluate(()=>matchScore()),{us:1,them:1},"scoring goes on from the Quick log");
  });
  await check("checking the saved season mid-match leaves the coach on his match, and leaving the check keeps his yes",async({device,syncedMatch,signIn,ctl,settled})=>{
   const a=await device();await syncedMatch(a);
   ctl.seasonDelay=6000;await signIn(a);await a.waitForTimeout(800);
   const mid=await a.evaluate(()=>({checking:!!_deviceChecking,taken:deviceSeasonShown(),tab:S.tab,root:document.getElementById("root").innerText}));
   assert.equal(mid.checking,true);assert.equal(mid.taken,false,"the check does not take the screen");
   assert.doesNotMatch(mid.root,/Checking for your saved season/);
   await settled(a);
   // A blank sheet still waits on the screen, and leaving it keeps the yes.
   await a.evaluate(()=>{openSheet({vs:""});S.right={name:""};});
   await signIn(a);await a.waitForTimeout(800);
   assert.equal(await a.evaluate(()=>deviceSeasonShown()),true);
   await a.getByRole("button",{name:"Not now — check next time I sign in",exact:true}).click();
   const left=await a.evaluate(()=>({yes:localStorage.getItem("gridlock.coach.syncyes"),shown:deviceSeasonShown(),syncOn:S.syncOn}));
   assert.equal(left.shown,false);assert.equal(left.syncOn,false);assert.match(left.yes||"",/coach@example\.test/,"the yes is kept");
  });
  await check("a saved season adopted with a match under way opens on that match, not on Home",async({device,syncedMatch,signIn,settled})=>{
   const a=await device(1440,900);await syncedMatch(a);
   const b=await device(820,1180);await signIn(b);await settled(b);
   assert.equal(await b.evaluate(()=>S.tab),"home");
   await b.getByRole("button",{name:"Use my saved season",exact:true}).click();await settled(b);
   const r=await b.evaluate(()=>({tab:S.tab,vs:matchVs(),sc:matchScore()}));
   assert.equal(r.tab,"tally");assert.equal(r.vs,"Dynasty");assert.deepEqual(r.sc,{us:1,them:1});
  });
  // The phone and tablet journey review, the same day.
  const seeded=async(phone,size)=>{const p=await phone();if(size)await p.setViewportSize(size);
   await p.evaluate(s=>{localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},require("../scripts/seed"));await p.reload();
   await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;set({tab:"tally"});});return p;};
  await check("the Quick log is a real full-screen layer: nothing under it can be reached, and Escape closes it",async({phone})=>{
   const p=await seeded(phone);const before=await p.evaluate(()=>JSON.stringify([matchScore(),!!curMatch().timeUp]));
   await p.getByRole("button",{name:/Quick log/}).first().click();
   for(let i=0;i<40;i++){await p.keyboard.press("Tab");
    const inside=await p.evaluate(()=>{const a=document.activeElement;return !a||a===document.body||!!a.closest(".qlog");});
    assert.equal(inside,true,"focus left the Quick log on Tab "+(i+1));}
   assert.equal(await p.evaluate(()=>JSON.stringify([matchScore(),!!curMatch().timeUp])),before,"nothing under it was used");
   await p.keyboard.press("Escape");
   assert.equal(await p.evaluate(()=>S.quick),false);
   assert.equal(await p.evaluate(()=>document.querySelectorAll("[inert]").length),0,"nothing is left inert");
  });
  await check("a scored point writes the whole season once",async({phone})=>{
   const p=await seeded(phone);
   const n=await p.evaluate(()=>{let writes=0;const set=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k==="gridlock.coach.v2")writes++;return set.call(this,k,v);};
    S.callPicked=true;tapResult("us");Storage.prototype.setItem=set;
    return {writes,call:(S.calls||[]).some(c=>c.m===S.matchId&&c.pt===S.point-1&&c.auto)};});
   assert.equal(n.call,true,"the standing call is still logged with the result");
   assert.equal(n.writes,1,"one whole-season write, not "+n.writes);
  });
  await check("on a small phone a tapped bunker shows the sheet's first questions above its Log bar",async({phone})=>{
   const p=await seeded(phone,{width:375,height:667});
   await p.evaluate(()=>{const b=curLayout().bunkers.find(x=>x.id==="MT#1")||curLayout().bunkers[0];S.tallyStep="tell";tallyTap([b.x,b.y]);});
   await p.waitForTimeout(150);
   const r=await p.evaluate(()=>{const bar=document.querySelector(".tsheet__act").getBoundingClientRect();
    const chips=[...document.querySelectorAll(".tsheet button")].filter(b=>!b.closest(".tsheet__act"));
    const shown=chips.filter(b=>{const q=b.getBoundingClientRect();return q.height&&q.bottom<=bar.top&&q.top>=0;});
    return {shown:shown.length,first:shown[0]&&shown[0].innerText};});
   assert.ok(r.shown>=2,"questions showing above the bar: "+JSON.stringify(r));
  });
  await check("at 375 px the header keeps the call whole and gives way on the event",async({phone})=>{
   const p=await phone();await p.setViewportSize({width:375,height:667});await p.evaluate(()=>set({tab:"home"}));
   const r=await p.evaluate(()=>{const t=document.querySelector(".ctx__call .ctx__t"),sec=document.querySelector(".ctx__sec"),hdr=document.querySelector(".ctx");
    return {cut:t.scrollWidth-t.clientWidth,sec:sec?sec.getBoundingClientRect().right<=hdr.getBoundingClientRect().right+1:true};});
   assert.equal(r.cut,0,"the call is not cut");assert.equal(r.sec,true,"the section stays on the line");
  });
  await check("Bunker stats offers Date not recorded only when something is",async({phone})=>{
   const p=await seeded(phone);
   const r=await p.evaluate(()=>{const has=()=>statDays().some(([k])=>k==="undated");const a=has();
    S.matches=S.matches.map((m,i)=>i===0?{...m,at:0}:m);return [a,has()];});
   assert.deepEqual(r,[false,true]);
  });
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} interaction audit checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

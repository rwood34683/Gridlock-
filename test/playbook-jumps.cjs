"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),SEED=require("../scripts/seed");
const BEFORE=require("./fixtures/playbook-before-jumps.json"),SHOTS=path.resolve("work/playbook-jumps");fs.mkdirSync(SHOTS,{recursive:true});
const hash=s=>crypto.createHash("sha256").update(s).digest("hex"),button=(p,name)=>p.getByRole("button",{name,exact:true});
async function screen(p){
 assert.deepEqual(await p.evaluate(()=>{
  const bad=[];if(document.documentElement.scrollWidth>innerWidth||document.querySelector(".main").scrollWidth>document.querySelector(".main").clientWidth+1)bad.push("sideways scroll");
  for(const el of document.querySelectorAll('.assigns button,.play-jump-pad select')){
   const r=el.getBoundingClientRect();if(!el.checkVisibility({checkVisibilityCSS:true})||!r.width||!r.height)continue;
   const name=el.getAttribute("aria-label")||[...(el.labels||[])].map(l=>l.innerText).join(" ")||el.innerText;
   if(!name.trim())bad.push("unnamed control");if(Math.ceil(Math.min(r.width,r.height))<44)bad.push("small "+name);
  }return bad;
 }),[]);
}
async function choose(p,id,bunker){await button(p,`Jumps for player ${id}`).click();await p.locator(`#jump-${id}`).selectOption(bunker);}
async function routeFacts(p,id=1){return p.evaluate(id=>{
 const r=currentPaths().find(p=>p.id===id),legs=[r.from,...r.via,r.to],bad=[];
 const bs=curLayout().bunkers.filter(b=>b.id!==r.bunker&&!bunkerBoxes(b).some(o=>Math.abs(r.from[0]-o.x)<=o.w/2+0.9&&Math.abs(r.from[1]-o.y)<=o.h/2+0.9));
 for(let i=1;i<legs.length;i++)for(const b of bs){
  if((r.jumps||[]).some(j=>j.bunker===b.id))continue;
  if(bunkerBoxes(b).some(o=>segHitsBox(...legs[i-1],...legs[i],o.x,o.y,o.w/2,o.h/2)))bad.push(b.id);
 }
 return {bad,legs,jumps:r.jumps||[],crossings:(r.jumps||[]).map(j=>{const b=curLayout().bunkers.find(b=>b.id===j.bunker);return bunkerBoxes(b).some(o=>segHitsBox(...j.from,...j.to,o.x,o.y,o.w/2,o.h/2));}),fw:fieldW(),fh:fieldH(),drawn:drawnRun(r,legs,2,2)};
 },id);}
(async()=>{const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,run,viewport={width:390,height:844}){
  const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[],external=[];p.setDefaultTimeout(7000);
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());p.on("request",r=>{if(!r.url().startsWith(process.env.APP_URL)&&!r.url().startsWith("data:"))external.push(r.url());});
  try{await p.goto(process.env.APP_URL);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify({...seed,fmtAsk:false,fmtDone:true,t:1,direct:{},pathEdits:{}}));},SEED);await p.reload();await run(p);await screen(p);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);passed++;console.log("PASS "+name);}
  catch(e){failed++;console.error("FAIL "+name+": "+e.stack);await p.screenshot({path:path.join(SHOTS,`failure-${failed}.png`)}).catch(()=>{});}finally{await c.close();}
 }
 try{
  await check("normal paths and whole measured field drawings remain byte-identical",async p=>{
   for(const b of BEFORE.snapshots){const now=await p.evaluate(layout=>{S.layoutKey=layout;dropPathCache();return {paths:JSON.stringify(currentPaths()),svg:fieldSVG({static:true})};},b.layout);assert.equal(hash(now.paths),b.paths,b.layout+" paths");assert.equal(hash(now.svg),b.svg,b.layout+" SVG");}
  });
  for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1024,height:768}])await check(`choose a jump, play it, and read its card at ${viewport.width}×${viewport.height}`,async p=>{
   const geometry=await p.evaluate(()=>JSON.stringify(curLayout().bunkers)),records=await p.evaluate(()=>JSON.stringify([S.matches,S.results,S.tally,S.breakouts,S.bunkerCalls]));
   await choose(p,1,"MD#1");assert.deepEqual(await p.evaluate(()=>jumpsOf(1)),["MD#1"]);assert.equal(await p.locator(".play-jump").count(),1);
   const r=await routeFacts(p);assert.deepEqual(r.bad,[]);assert.deepEqual(r.crossings,[true]);assert(!r.drawn.includes("Q"),"jump route keeps the checked straight legs");assert(r.legs.every(q=>q[0]>=0&&q[0]<=r.fw&&q[1]>=0&&q[1]<=r.fh));
   await screen(p);await p.locator(".play-jump-pad").scrollIntoViewIfNeeded();await p.screenshot({path:path.join(SHOTS,`controls-${viewport.width}.png`)});
   await button(p,"Done with jumps").click();await button(p,"▶  Play the break").click();await p.waitForFunction(()=>!S.playing);assert.equal(await p.locator(".play-jump").count(),1);
   await p.locator('.field-wrap[data-live]').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(SHOTS,`field-${viewport.width}.png`)});
   await button(p,"Cards · here is your job").click();assert.match(await p.locator(".main").innerText(),/Jump MD/);await p.evaluate(()=>{window.handOff=(title,text)=>window.__shared=text;shareCards();});assert.match(await p.evaluate(()=>__shared),/Jump MD/);
   assert.equal(await p.evaluate(()=>JSON.stringify(curLayout().bunkers)),geometry);assert.equal(await p.evaluate(()=>JSON.stringify([S.matches,S.results,S.tally,S.breakouts,S.bunkerCalls])),records);
  },viewport);
  await check("saved jumps survive relaunch, season restore and repeated merge with codes intact",async p=>{
   await p.evaluate(()=>{S.codes=[{word:"Rocket",means:"Hold"}];S.bunkerCalls={lso:{"MD#1":"Jump test"}};});await choose(p,1,"MD#1");
   await p.reload();assert.deepEqual(await p.evaluate(()=>jumpsOf(1)),["MD#1"]);
   for(const mode of ["replace","merge","merge"]){const result=await p.evaluate(mode=>{const text=copyPayload("all"),data=JSON.parse(text).data;const err=copyDataError(data);if(mode==="replace")S.direct={};const loaded=loadCopy(mode,text);return {err,loaded,jumps:jumpsOf(1),bunker:S.bunkerCalls.lso["MD#1"],codes:S.codes};},mode);assert.equal(result.err,"");assert.equal(result.loaded,true);assert.deepEqual(result.jumps,["MD#1"]);assert.equal(result.bunker,"Jump test");assert.deepEqual(result.codes,[{word:"Rocket",means:"Hold"}]);}
  });
  await check("copy validation rejects malformed jumps without replacing the season",async p=>{
   for(const bad of [null,"MD#1",[7],[{}],["MD#1","MD#1"],[""]]){const r=await p.evaluate(bad=>{const copy=JSON.parse(copyPayload("all"));copy.data.direct={"lso|snake|1":{jumps:bad}};const error=copyDataError(copy.data),before=JSON.stringify(JSON.parse(copyPayload("all")).data);const ok=loadCopy("replace",JSON.stringify(copy));return {ok,error,same:before===JSON.stringify(JSON.parse(copyPayload("all")).data)};},bad);assert.notEqual(r.ok,true);assert(r.error);assert.equal(r.same,true);}
  });
  await check("conflicting imported instructions preserve the drawn path and flag unapplied jumps",async p=>{
   const r=await p.evaluate(()=>{setVia(1,[[20,10],[40,10]]);const copy=JSON.parse(copyPayload("all"));copy.data.direct={[directKey(1)]:{jumps:["MD#1"]}};delete copy.data.pathEdits;const ok=loadCopy("merge",JSON.stringify(copy));return {ok,via:pathEdit(1),jump:jumpsOf(1),issue:currentPaths()[0].jumpIssue,card:cardLines()[0].jump};});
   assert.equal(r.ok,true);assert.deepEqual(r.via,[[20,10],[40,10]]);assert.deepEqual(r.jump,["MD#1"]);assert.equal(r.issue,true);assert.equal(r.card,"Jump route needs checking");assert.match(await p.locator(".main").innerText(),/Jump route needs checking/);assert.equal(await p.locator(".play-jump").count(),0);
  });
  await check("switched ends mirror the whole jump and card without changing the saved choice",async p=>{
   await choose(p,1,"MD#1");const original=await p.evaluate(()=>({p:displayPaths()[0],direct:JSON.stringify(S.direct)}));await button(p,"Switch ends").click();
   const next=await p.evaluate(()=>({p:displayPaths()[0],direct:JSON.stringify(S.direct),width:fieldW()}));assert.equal(next.direct,original.direct);assert.deepEqual(next.p.jumps[0].from,[next.width-original.p.jumps[0].from[0],original.p.jumps[0].from[1]]);assert.deepEqual(next.p.jumps[0].to,[next.width-original.p.jumps[0].to[0],original.p.jumps[0].to[1]]);
   await p.locator('.field-wrap[data-live]').scrollIntoViewIfNeeded();assert.equal(await p.locator(".play-jump").count(),1);assert.equal(await p.evaluate(()=>cardLines()[0].jump),await p.evaluate(()=>"Jump "+jumpName("MD#1")));
  });
  await check("reset and hand-drawn edits replace only that player's jumps",async p=>{
   const normal=await p.evaluate(()=>JSON.stringify(currentPaths()[0]));await choose(p,1,"MD#1");await p.evaluate(()=>setDirect(1,"go","delay"));await p.evaluate(()=>resetPath(1));assert.deepEqual(await p.evaluate(()=>jumpsOf(1)),[]);assert.equal(await p.evaluate(()=>goOf(1)),"delay");
   await p.evaluate(()=>setDirect(1,"go",""));assert.equal(await p.evaluate(()=>JSON.stringify(currentPaths()[0])),normal);
   await choose(p,1,"MD#1");await p.evaluate(()=>setVia(1,[[20,10],[40,10]]));assert.deepEqual(await p.evaluate(()=>jumpsOf(1)),[]);assert.deepEqual(await p.evaluate(()=>pathEdit(1)),[[20,10],[40,10]]);
   p.removeAllListeners("dialog");p.on("dialog",d=>d.dismiss());await p.evaluate(()=>addPlayJump(1,"MD#1"));assert.deepEqual(await p.evaluate(()=>pathEdit(1)),[[20,10],[40,10]]);assert.deepEqual(await p.evaluate(()=>jumpsOf(1)),[]);
   p.removeAllListeners("dialog");p.on("dialog",d=>d.accept());await p.evaluate(()=>addPlayJump(1,"MD#1"));assert.equal(await p.evaluate(()=>pathEdit(1)),null);await p.evaluate(()=>resetAllPaths());assert.equal(await p.evaluate(()=>JSON.stringify(currentPaths()[0])),normal);
  });
  await check("removed bunkers are flagged; impossible jumps leave the old path and season intact",async p=>{
   const before=await p.evaluate(()=>JSON.stringify([S.direct,S.pathEdits]));await p.evaluate(()=>addPlayJump(1,currentPaths()[0].bunker));assert.equal(await p.evaluate(()=>JSON.stringify([S.direct,S.pathEdits])),before);
   await p.evaluate(()=>addPlayJump(1,"Br#3"));assert.equal(await p.evaluate(()=>JSON.stringify([S.direct,S.pathEdits])),before,"edge bunker cannot land outside the field");
   await p.evaluate(()=>{S.direct={[directKey(1)]:{jumps:["missing-bunker"]}};render();});assert.match(await p.locator(".main").innerText(),/Jump route needs checking/);assert.equal(await p.locator(".play-jump").count(),0);await p.evaluate(()=>resetPath(1));assert.deepEqual(await p.evaluate(()=>jumpsOf(1)),[]);
  });
  await check("Make it yours retains jumps only for unchanged destinations; rebuilding clears old jumps",async p=>{
   await choose(p,1,"MD#1");
   const r=await p.evaluate(()=>{copyPlay("snake");setPlayField("name","Jump route test");savePlay();const key=S.script,kept=jumpsOf(1).slice();buildPlay(key);playManOff(1);playPick("MD#2");savePlay();return {key,kept,after:jumpsOf(1),original:S.direct["lso|snake|1"].jumps,plant:myPlants(key)[0]};});
   assert.match(r.key,/^my:/);assert.deepEqual(r.kept,["MD#1"]);assert.deepEqual(r.after,[]);assert.deepEqual(r.original,["MD#1"]);assert.equal(r.plant,"MD#2");
   const changed=await p.evaluate(()=>{S.script="snake";copyPlay("snake");playManOff(1);playPick("MD#2");setPlayField("name","Different destination");savePlay();return jumpsOf(1);});assert.deepEqual(changed,[]);
  });
  await check("ordered jumps on a 10v10 field pass x=150 and reset independently",async p=>{
   await p.evaluate(()=>{
    const k=BUNKER_KINDS.find(b=>b.key==="sd"),key="my:jump-test";
    S.fields=[{key,name:"Jump test field",size:"10v10",at:1,bunkers:[[40,75],[100,75],[170,75],[185,75],[80,25],[80,120],[120,25],[120,120]].map(([x,y],i)=>({...k,id:"j#"+i,x,y}))}];registerFields();S.layoutKey=key;
    S.plays=[{k:"my:jump-play",name:"Jump play",at:1,plants:{[key]:["j#3","j#4","j#5","j#6","j#7"]}}];S.script="my:jump-play";dropPathCache();render();
   });await choose(p,1,"j#0");await p.locator("#jump-1").selectOption("j#2");assert.deepEqual(await p.evaluate(()=>jumpsOf(1)),["j#0","j#2"]);
   const r=await routeFacts(p);assert.equal(r.fw,200);assert.equal(r.fh,150);assert.deepEqual(r.bad,[]);assert.deepEqual(r.crossings,[true,true]);assert(r.jumps[1].from[0]>150);assert(r.legs.some(q=>q[1]!==75),"goes round unchosen middle bunker");assert(r.legs.every(q=>q[0]>=0&&q[0]<=200&&q[1]>=0&&q[1]<=150));
   await button(p,"Remove jump 1 for player 1").click();assert.deepEqual(await p.evaluate(()=>jumpsOf(1)),["j#2"]);await button(p,"Remove jump 1 for player 1").click();assert.deepEqual(await p.evaluate(()=>jumpsOf(1)),[]);
  });
  await check("jump route is cached during animation and does not alter other calls",async p=>{
   await choose(p,1,"MD#1");const r=await p.evaluate(()=>{const a=currentPaths(),other=JSON.stringify(routedFor("base")),stored=JSON.stringify(S.direct);let count=0;const route=jumpRoute;jumpRoute=(...a)=>{count++;return route(...a);};for(let i=0;i<100;i++){S.t=i/100;currentPaths();fieldRunners({});}jumpRoute=route;S.script="base";const jumps=currentPaths().some(p=>p.jumps?.length);S.script="snake";return {count,jumps,stable:currentPaths()===a,otherSame:JSON.stringify(routedFor("base"))===other,stored:JSON.stringify(S.direct)===stored};});assert.deepEqual(r,{count:0,jumps:false,stable:true,otherSame:true,stored:true});
  });
 }finally{await browser.close();}console.log(`\n${passed} PASS, ${failed} FAIL — playbook jumps`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),seed=require("../scripts/seed");
(async()=>{
 const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,fn,viewport={width:390,height:844}){
  const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[];p.setDefaultTimeout(8000);
  p.on("pageerror",e=>errors.push(e.message));
  try{
   await p.goto(process.env.APP_URL);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},seed);await p.reload();
   await p.evaluate(()=>{
    S.layoutKey="mwo";S.fmtAsk=false;S.tab="tally";S.tallySel=null;S.tallyDraft=null;S.tallyEdit=null;S.tallyStep="place";
    S.matches=[{id:"overview",vs:"Test opponents",layout:"mwo",size:5,at:1794409200000}];S.matchId="overview";S.point=2;
    S.left={name:"Home team"};S.right={name:"Test opponents"};S.scout={"Test opponents":{players:[{num:"7",name:"Seven"}],breaks:[]}};
    S.roster=[{name:"Reyes"},{name:"Lane"}];S.lineups={};S.pens=[];S.results=[];S.moves=[];S.arrivalSightings=[];S.arrivalShots=[];S.voiceEvents=[];S.calls=[];S.tally=[];
    const b=curLayout().bunkers[0].id;
    const row=(id,player,side="us")=>({id,player,side,m:"overview",pt:2,layout:"mwo",bunker:b,alive:null,at:1794409200000});
    S.breakouts=[row("reyes","Reyes"),row("seven","#7","them"),row("unnamed","","them")];
    S.playerChecks=[{id:"c-reyes",breakoutId:"reyes",player:"Reyes",side:"us",m:"overview",pt:2,layout:"mwo",alive:true,shooting:true,diving:true,at:1794409201000}];
    syncTallyFive("overview",2);save(S);render();
   });
   await fn(p);assert.deepEqual(errors,[]);console.log("PASS "+name);passed++;
  }catch(e){console.error("FAIL "+name+": "+e.stack);failed++;}finally{await c.close();}
 }
 const roster=(p,n)=>p.locator('button.assign[onclick^="showNamedPlayer"]').filter({hasText:n});
 const chart=(p,id)=>p.locator('[aria-label="Men on this point"] button[onclick^="showPlayerDetails"]').filter({has:p.locator('[data-player-status="'+id+'"]')});
 const popup=p=>p.locator('#player-details');
 const snapshot=p=>p.evaluate(()=>JSON.stringify(S));
 try{
  await check("Tally shows saved status and observations without opening each player",async p=>{
   assert.match(await roster(p,"Reyes").innerText(),/Alive · Shooting · Diving/);
   assert.match(await roster(p,"Lane").innerText(),/Status not recorded/);
   assert.match(await chart(p,"reyes").innerText(),/Alive · Shooting · Diving/);
  });
  await check("Scout shows both named and unnamed players without guessing status",async p=>{
   await p.evaluate(()=>{S.playerChecks.push({...S.playerChecks[0],id:"u",breakoutId:"unnamed",player:"",side:"them",alive:false,shooting:null});set({tab:"scout",scoutTab:"breakouts"});});
   assert.equal(await p.locator('[data-player-status="seven"]').innerText(),"Status not recorded");
   assert.equal(await p.locator('[data-player-status="unnamed"]').innerText(),"Dead · Diving");
  });
  await check("status changes update the list after Close and survive reload",async p=>{
   await roster(p,"Reyes").click();await popup(p).getByRole('button',{name:'Dead',exact:true}).click();await popup(p).getByRole('button',{name:'Close',exact:true}).click();
   assert.match(await roster(p,"Reyes").innerText(),/Dead · Shooting · Diving/);assert.equal(await p.evaluate(()=>S.results.length),0);
   await p.reload();assert.match(await roster(p,"Reyes").innerText(),/Dead · Shooting · Diving/);
  });
  await check("old points and the other side never supply a player's current status",async p=>{
   await p.evaluate(()=>{S.playerChecks=[];S.breakouts[0].alive=true;S.playerChecks.push({id:"old",m:"overview",pt:1,layout:"mwo",player:"Reyes",side:"us",alive:false,at:1794409201000},{id:"other",m:"overview",pt:2,layout:"mwo",player:"Reyes",side:"them",alive:false,at:1794409201000});render();});
   assert.match(await roster(p,"Reyes").innerText(),/Status not recorded/);assert.doesNotMatch(await roster(p,"Reyes").innerText(),/Dead|Alive/);
  });
  await check("popup and percentages both use the newest matching observation",async p=>{
   await p.evaluate(()=>{S.playerChecks.push({...S.playerChecks[0],id:"new",at:1794409202000,shooting:false,diving:false});showPlayerDetails("reyes");});
   assert.equal(await popup(p).getByRole('button',{name:'Shooting',exact:true}).getAttribute('aria-pressed'),"false");
   assert.equal(await popup(p).getByRole('button',{name:'Diving',exact:true}).getAttribute('aria-pressed'),"false");
   await popup(p).getByText('Match percentages',{exact:true}).click();assert.equal(await popup(p).locator('[data-player-share="shooting"] dd').innerText(),"0 of 1 · 0%");
   await popup(p).getByRole('button',{name:'Shooting',exact:true}).click();assert.equal(await p.evaluate(()=>S.playerChecks.length),1);
   assert.equal(await p.evaluate(()=>S.playerChecks[0].diving),false);
  });
  await check("reading the overview does not write data, expose markup or score",async p=>{
   await p.evaluate(()=>{S.breakouts[0].player='<img src=x onerror="window.overviewBad=1">';S.roster[0].name=S.breakouts[0].player;S.playerChecks[0].player=S.breakouts[0].player;render();});
   const before=await snapshot(p);await p.evaluate(()=>{render();set({tab:"scout",scoutTab:"breakouts"});set({tab:"tally"});});
   assert.equal(await p.evaluate(()=>window.overviewBad),undefined);assert.equal(await p.locator('[data-player-status] img').count(),0);
   // Navigation is expected to change scratch state; the season records are unchanged.
   const after=JSON.parse(await snapshot(p)),old=JSON.parse(before);for(const k of ["results","breakouts","tally","playerChecks"])assert.deepEqual(after[k],old[k]);
  });
  await check("all player lists and percentages share one read per side per draw",async p=>{
   const reads=await p.evaluate(()=>{
    const original=playerObservationRowsFresh;let calls=0;
    playerObservationRowsFresh=(...args)=>{calls++;return original(...args);};
    try{render();return calls;}finally{playerObservationRowsFresh=original;}
   });assert.equal(reads,2);
   await p.evaluate(()=>{S.playerChecks[0].alive=false;render();});assert.match(await roster(p,"Reyes").innerText(),/Dead/);
  });
  for(const [name,viewport] of [["phone",{width:390,height:844}],["phone-small",{width:320,height:568}],["tablet",{width:768,height:1024}],["tablet-landscape",{width:1024,height:768}]]){
   await check(name+" shows readable summaries and reachable quick actions",async p=>{
    await roster(p,"Reyes").scrollIntoViewIfNeeded();assert(await roster(p,"Reyes").evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&e.scrollWidth<=e.clientWidth}));
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const out=path.resolve('work/player-overview');fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'-tally.png')});
    await roster(p,"Reyes").click();for(const action of ['Alive','Dead','Shooting','Diving'])assert(await popup(p).getByRole('button',{name:action,exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=innerHeight}));
    await popup(p).getByRole('button',{name:'Close',exact:true}).click();await p.evaluate(()=>set({tab:'scout',scoutTab:'breakouts'}));
    await p.locator('[data-player-status="seven"]').scrollIntoViewIfNeeded();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:path.join(out,name+'-scout.png')});
   },viewport);
  }
 }finally{await browser.close();}
 console.log(`${passed}/${passed+failed} player overview checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

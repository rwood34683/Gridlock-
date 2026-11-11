"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),seed=require("../scripts/seed");
(async()=>{
 const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,fn,viewport={width:390,height:844}){
  const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[];p.setDefaultTimeout(8000);
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{
   await p.goto(process.env.APP_URL);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},seed);await p.reload();
   await p.evaluate(()=>{
    S.layoutKey="mwo";S.fmtAsk=false;S.tab="tally";S.tallySel=null;S.tallyDraft=null;S.tallyEdit=null;S.tallyStep="place";
    S.matches=[{id:"shares",vs:"Other team",layout:"mwo",size:5,at:1794409200000},{id:"elsewhere",vs:"Other team",layout:"mwo",size:5,at:1794300000000}];
    S.matchId="shares";S.point=2;S.left={name:"Home team"};S.right={name:"Other team"};S.scout={"Other team":{players:[],breaks:[]}};
    S.roster=[{name:"Reyes"},{name:"Lane"}];S.lineups={};S.pens=[];S.results=[];S.moves=[];S.arrivalSightings=[];S.arrivalShots=[];S.voiceEvents=[];S.calls=[];S.tally=[];
    const b=curLayout().bunkers[0].id;
    window.shareBreak=(id,player,pt=2,side="us",alive=null)=>({id,m:"shares",pt,side,layout:"mwo",bunker:b,player,alive,at:1794409200000});
    window.shareCheck=(id,player,alive=null,shooting=null,diving=null,pt=2,side="us")=>({id:"c-"+id,breakoutId:id,m:"shares",pt,side,layout:"mwo",player,alive,shooting,diving,at:1794409201000});
    S.breakouts=[shareBreak("a","Reyes"),shareBreak("b","Lane"),shareBreak("c","Jordan"),shareBreak("d","Taylor"),shareBreak("e","Casey")];
    S.playerChecks=[shareCheck("a","Reyes",true,true,true),shareCheck("b","Lane",true,true),shareCheck("c","Jordan",true),shareCheck("d","Taylor",false)];
    syncTallyFive("shares",2);save(S);render();
   });
   await fn(p);assert.deepEqual(errors,[]);console.log("PASS "+name);passed++;
  }catch(e){console.error("FAIL "+name+": "+e.stack);failed++;}finally{await c.close();}
 }
 const team=(p,side="us")=>p.locator('[data-point-shares="'+side+'"]');
 const share=(loc,k)=>loc.locator('[data-player-share="'+k+'"] dd');
 const popup=p=>p.locator('#player-details');
 const history=p=>p.locator('#player-match-percentages');
 const state=p=>p.evaluate(()=>JSON.stringify(S));
 try{
  await check("team percentages show counts, starting players and unknown observations",async p=>{
   await team(p).locator('summary').click();assert.equal(await share(team(p),'alive').innerText(),"3 of 5 · 60%");
   assert.equal(await share(team(p),'dead').innerText(),"1 of 5 · 20%");assert.equal(await share(team(p),'shooting').innerText(),"2 of 5 · 40%");assert.equal(await share(team(p),'diving').innerText(),"1 of 5 · 20%");
   assert.match(await team(p).innerText(),/Status not recorded: 1 of 5/);assert.match(await team(p).innerText(),/Shooting not recorded: 3 of 5/);
  });
  await check("unlogged players remain unknown and penalties set the starting denominator",async p=>{
   await p.evaluate(()=>{S.matches[0].size=3;S.pens=[{id:"pen",m:"shares",pt:2,side:"us",cost:1}];S.breakouts=S.breakouts.slice(0,1);S.playerChecks=S.playerChecks.slice(0,1);render();});
   await team(p).locator('summary').click();assert.equal(await share(team(p),'alive').innerText(),"1 of 2 · 50%");assert.match(await team(p).innerText(),/Status not recorded: 1 of 2/);
  });
  await check("empty data has no percentage and too many players asks for a correction",async p=>{
   await p.evaluate(()=>{S.breakouts=[];S.playerChecks=[];render();});await team(p).locator('summary').click();assert.match(await team(p).innerText(),/No player observations/);assert.doesNotMatch(await team(p).innerText(),/%|NaN|Infinity/);
   await p.evaluate(()=>{S.matches[0].size=3;S.breakouts=[shareBreak("a","A"),shareBreak("b","B"),shareBreak("c","C"),shareBreak("d","D")];render();});
   assert.match(await team(p).innerText(),/4 players recorded for 3 places/);assert.doesNotMatch(await team(p).innerText(),/\d%|NaN|Infinity/);
  });
  await check("chart, quick check and repeated outs count one player with an out taking precedence",async p=>{
   await p.evaluate(()=>{S.breakouts.push({...S.breakouts[0],id:"a-copy"});S.tally=[{m:"shares",pt:2,side:"us",name:"Reyes",layout:"mwo",at:1},{m:"shares",pt:2,side:"us",name:"Reyes",layout:"mwo",at:2}];render();});
   await team(p).locator('summary').click();assert.equal(await share(team(p),'alive').innerText(),"2 of 5 · 40%");assert.equal(await share(team(p),'dead').innerText(),"2 of 5 · 40%");
  });
  await check("other matches, fields, points and sides do not inflate this team's share",async p=>{
   await p.evaluate(()=>{S.breakouts.push({...shareBreak("else","Someone"),m:"elsewhere"},{...shareBreak("field","Field"),layout:"lso"},shareBreak("later","Later",3),shareBreak("opponent","Reyes",2,"them"));S.playerChecks.push({...shareCheck("else","Someone",false),m:"elsewhere"},{...shareCheck("field","Field",false),layout:"lso"},shareCheck("later","Later",false,null,null,3),shareCheck("opponent","Reyes",false,null,null,2,"them"));render();});
   await team(p).locator('summary').click();assert.equal(await share(team(p),'alive').innerText(),"3 of 5 · 60%");assert.equal(await share(team(p),'dead').innerText(),"1 of 5 · 20%");
   await team(p,'them').locator('summary').click();assert.equal(await share(team(p,'them'),'dead').innerText(),"1 of 5 · 20%");
  });
  await check("latest duplicate check wins, cleared observations stay unknown and orphan links are ignored",async p=>{
   await p.evaluate(()=>{S.playerChecks.push({...S.playerChecks[0],id:"new",at:1794409202000,shooting:false,diving:false},{...shareCheck("gone","Ghost",true),at:1794409203000},{...shareCheck("a","Reyes",false,null,null,1),at:1794409204000});render();});
   await team(p).locator('summary').click();assert.equal(await share(team(p),'alive').innerText(),"3 of 5 · 60%");assert.equal(await share(team(p),'shooting').innerText(),"1 of 5 · 20%");assert.equal(await share(team(p),'diving').innerText(),"0 of 5 · 0%");assert.match(await team(p).innerText(),/Diving not recorded: 5 of 5/);
  });
  await check("making the break alone does not count as a current Alive status",async p=>{
   await p.evaluate(()=>{S.playerChecks=[];S.breakouts=S.breakouts.map(r=>({...r,alive:true}));render();});await team(p).locator('summary').click();assert.equal(await share(team(p),'alive').innerText(),"0 of 5 · 0%");assert.match(await team(p).innerText(),/Status not recorded: 5 of 5/);
  });
  await check("player match percentages count distinct logged points with a visible sample",async p=>{
   await p.evaluate(()=>{S.breakouts.push(shareBreak("r1","Reyes",1),shareBreak("r3","Reyes",3),{...shareBreak("r-other","Reyes",4),m:"elsewhere"},shareBreak("r-them","Reyes",4,"them"));S.playerChecks.push(shareCheck("r1","Reyes",false,true,null,1));S.results=[{m:"shares",pt:4,won:"us"},{m:"shares",pt:5,won:"them"}];showPlayerDetails("a");});
   await history(p).locator('summary').click();assert.match(await history(p).innerText(),/3 logged points/);assert.equal(await share(history(p),'alive').innerText(),"1 of 3 · 33.3%");assert.equal(await share(history(p),'dead').innerText(),"1 of 3 · 33.3%");assert.equal(await share(history(p),'shooting').innerText(),"2 of 3 · 66.7%");assert.equal(await share(history(p),'diving').innerText(),"1 of 3 · 33.3%");assert.match(await history(p).innerText(),/Status not recorded: 1 of 3/);
  });
  await check("unnamed players at one bunker stay separate and have no invented cross-point identity",async p=>{
   await p.evaluate(()=>{S.breakouts=[shareBreak("u1",""),shareBreak("u2","")];S.playerChecks=[shareCheck("u1","",true),shareCheck("u2","",false)];render();});await team(p).locator('summary').click();assert.equal(await share(team(p),'alive').innerText(),"1 of 5 · 20%");assert.equal(await share(team(p),'dead').innerText(),"1 of 5 · 20%");
   await p.evaluate(()=>showPlayerDetails("u1"));await history(p).locator('summary').click();assert.match(await history(p).innerText(),/Name this player/);assert.equal(await history(p).locator('[data-player-share]').count(),0);
  });
  await check("reading summaries preserves state and a quick tap updates both without collapsing them",async p=>{
   const before=await state(p);await team(p).locator('summary').click();await p.evaluate(()=>showPlayerDetails("a"));await history(p).locator('summary').click();assert.equal(await state(p),before);
   await popup(p).getByRole('button',{name:'Dead',exact:true}).click();assert.equal(await history(p).evaluate(e=>e.open),true);assert.equal(await share(history(p),'dead').innerText(),"1 of 1 · 100%");await popup(p).getByRole('button',{name:'Close',exact:true}).click();assert.equal(await team(p).evaluate(e=>e.open),true);assert.equal(await share(team(p),'dead').innerText(),"2 of 5 · 40%");
  });
  await check("Scout shows the selected team's percentages and watched teams stay separate",async p=>{
   await p.evaluate(()=>{S.matches[0].watch=true;S.matches[0].home="Home team";S.matches[0].away="Other team";S.breakouts.push(shareBreak("them","Reyes",2,"them"));S.playerChecks.push(shareCheck("them","Reyes",false,true,null,2,"them"));syncTallyFive("shares",2);set({tab:"scout",scoutTab:"breakouts",scoutSide:"right"});});
   await team(p,'them').locator('summary').click();assert.equal(await share(team(p,'them'),'dead').innerText(),"1 of 5 · 20%");assert.equal(await share(team(p,'them'),'alive').innerText(),"0 of 5 · 0%");
  });
  await check("reload and whole-season replace rebuild the same percentages without stored totals",async p=>{
   const copy=await p.evaluate(()=>copyPayload('all'));await p.reload();await team(p).locator('summary').click();assert.equal(await share(team(p),'alive').innerText(),"3 of 5 · 60%");
   await p.evaluate(text=>{set({tab:'more',more:'nexus'});document.getElementById('copyIn').value=text;loadCopy('replace');set({tab:'tally'});},copy);if(!await team(p).evaluate(e=>e.open))await team(p).locator('summary').click();assert.equal(await share(team(p),'alive').innerText(),"3 of 5 · 60%");assert.equal(await p.evaluate(()=>Object.keys(JSON.parse(copyPayload('all')).data).some(k=>/percentage|shares/i.test(k))),false);
  });
  for(const [name,viewport] of [['phone-small',{width:320,height:568}],['phone',{width:390,height:844}],['landscape',{width:844,height:390}],['tablet',{width:820,height:1180}]]){
   await check(name+" keeps all quick buttons visible and expanded percentages readable",async p=>{
    await p.evaluate(()=>showPlayerDetails("a"));for(const name of ['Alive','Dead','Shooting','Diving'])assert(await popup(p).getByRole('button',{name,exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight}));
    await history(p).locator('summary').click();assert(await popup(p).evaluate(e=>e.scrollWidth<=e.clientWidth));assert.match(await history(p).innerText(),/1 of 1 · 100%/);
    await history(p).scrollIntoViewIfNeeded();const out=path.resolve('work/player-percentages');fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'-match.png')});
    await popup(p).getByRole('button',{name:'Close',exact:true}).click();await team(p).locator('summary').click();await team(p).scrollIntoViewIfNeeded();assert(await team(p).evaluate(e=>e.scrollWidth<=e.clientWidth));await p.screenshot({path:path.join(out,name+'-point.png')});
   },viewport);
  }
 }finally{await browser.close();}
 console.log(`${passed}/${passed+failed} player percentage checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

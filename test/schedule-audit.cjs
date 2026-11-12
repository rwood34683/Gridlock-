"use strict";
// The schedule audit of 12 Nov 2026: a pasted weekday lands inside the event,
// a printed field is kept, the day plan lists only what is still to come, and
// games after his last game against a team are not offered as scouting.
const assert=require("node:assert/strict"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,fn){const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",timezoneId:"America/New_York"});const p=await c.newPage(),errors=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{await p.goto(url);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.reload();
   await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}}
 const days=(p,text)=>p.evaluate(text=>parseSchedule(text).map(g=>g.d+" "+g.t+" "+g.h+" v "+g.a+(g.f?" @ "+g.f:"")),text);
 try{
  await check("a pasted weekday with no date lands on that day of the event, never before it starts",async p=>{
   const first=await p.evaluate(()=>SCHEDULE.games[0].d);assert.equal(first,"2026-11-11","the World Cup schedule starts on Wednesday 11 Nov");
   assert.deepEqual(await days(p,"Sun 9:00 AM Houston Heat vs Edmonton Impact"),["2026-11-15 09:00 Houston Heat v Edmonton Impact"]);
   assert.deepEqual(await days(p,"Sunday\n9:00 AM Houston Heat vs Edmonton Impact"),["2026-11-15 09:00 Houston Heat v Edmonton Impact"]);
   assert.deepEqual(await days(p,"Finals Sunday\n9:00 AM Houston Heat vs Edmonton Impact"),["2026-11-15 09:00 Houston Heat v Edmonton Impact"]);
   assert.deepEqual(await days(p,"Thu 9:00 AM Rejects vs Blast Camp\nFri 9:00 AM Rejects vs Dynasty\nThu 1:00 PM Dynasty vs Blast Camp"),
    ["2026-11-12 09:00 Rejects v Blast Camp","2026-11-13 09:00 Rejects v Dynasty","2026-11-12 13:00 Dynasty v Blast Camp"],"after a day is read, the nearest day of that name");
  });
  await check("a date header in numbers, or after a round word, is read",async p=>{
   for(const head of ["11/15/2026","Sunday 11/15","Day 5 - Sunday Nov 15","Sunday, Nov 15"])
    assert.deepEqual(await days(p,head+"\n9:00 AM Houston Heat vs Edmonton Impact"),["2026-11-15 09:00 Houston Heat v Edmonton Impact"],head);
  });
  await check("a team's name on a line of its own is not a weekday header",async p=>{
   assert.deepEqual(await days(p,"Sun Devils\n9:00 AM Houston Heat vs Edmonton Impact"),["2026-11-11 09:00 Houston Heat v Edmonton Impact"]);
   assert.deepEqual(await days(p,"Sat 9:00 AM Sun Devils vs Edmonton Impact"),["2026-11-14 09:00 Sun Devils v Edmonton Impact"]);
  });
  await check("a pasted line keeps the field and pit it printed, and a season with one still loads",async p=>{
   assert.deepEqual(await days(p,"Thu 9:00 AM Rejects vs Blast Camp Field 2"),["2026-11-12 09:00 Rejects v Blast Camp @ Field 2"]);
   assert.deepEqual(await days(p,"Thu 9:00 AM Rejects vs Blast Camp (F3)"),["2026-11-12 09:00 Rejects v Blast Camp @ Field 3"]);
   assert.deepEqual(await days(p,"Thu 9:00 AM Rejects vs Blast Camp Pit 1"),["2026-11-12 09:00 Rejects v Blast Camp @ Pit 1"]);
   assert.deepEqual(await days(p,"Thu 9:00 AM Rejects vs Blast Camp"),["2026-11-12 09:00 Rejects v Blast Camp"]);
   await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;set({tab:"more",more:"schedule",myTeam:"Dynasty",gamePaste:"Thu 9:00 AM Rejects vs Blast Camp Field 2\nThu 11:00 AM Dynasty vs Rejects Field 1"});readSchedule();});
   assert.equal(await p.evaluate(()=>(S.games||[]).filter(g=>g.f==="Field 2").length),1);
   assert.equal(await p.evaluate(()=>copyDataError(JSON.parse(JSON.stringify(S)))||""),"","the copy check takes the field");
   await p.reload();assert.equal(await p.evaluate(()=>(S.games||[]).filter(g=>g.f==="Field 2").length),1,"it survives a relaunch");
   await p.evaluate(()=>{Date.now=()=>Date.parse("2026-11-12T08:00:00");set({tab:"more",more:"schedule"});});
   const root=await p.evaluate(()=>document.getElementById("root").innerText);
   assert.match(root,/Field 2/);
  });
  await check("the day plan lists only the games still to come",async p=>{
   const r=await p.evaluate(()=>{S.myTeam="Houston Heat";const day=teamDay("Houston Heat").filter(x=>x.g.d==="2026-11-12");
    const at=x=>gameAt(x.g);const mid=(at(day[0])+at(day[day.length-1]))/2+45*60000;
    return {n:day.length,early:dayPlanText("Houston Heat",at(day[0])-3600000),late:dayPlanText("Houston Heat",at(day[day.length-1])-60000),
     first:gameClock(day[0].g),last:gameClock(day[day.length-1].g)};});
   assert.ok(r.n>=2,"Heat plays more than once on Thursday");
   assert.ok(r.early.includes(r.first+" v"),"before the first game the plan has it");
   assert.ok(!r.late.includes("\n"+r.first+" v"),"after it is over the plan does not: "+r.late);
   assert.ok(r.late.includes(r.last+" v"));
  });
  await check("a team's games after his last game against them are not offered as scouting",async p=>{
   const r=await p.evaluate(()=>{S.myTeam="Houston Heat";const mine=teamGames("Houston Heat");
    const out=[];for(const g of mine){const opp=across(g,"Houston Heat"),now=gameAt(g)-3*3600000;
     const lastVs=Math.max(...mine.filter(x=>foldName(across(x,"Houston Heat"))===foldName(opp)).map(gameAt));
     const offered=theirGamesToWatch(opp,now);out.push({opp,bad:offered.filter(x=>gameAt(x)>=lastVs).length,n:offered.length});}
    S.myTeam="";const free=theirGamesToWatch(across(mine[0],"Houston Heat"),gameAt(mine[0])-3*3600000).length;return {out,free};});
   assert.ok(r.out.length>0);for(const x of r.out)assert.equal(x.bad,0,x.opp+" is offered after he has played them");
   assert.ok(r.free>=0);
  });
  await check("a scouting game says who is watching it, on the row and in the day plan",async p=>{
   await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;S.myTeam="Houston Heat";const day=teamDay("Houston Heat");
    Date.now=()=>gameAt(day[0].g)-2*3600000;set({tab:"more",more:"schedule"});});
   const box=p.locator("#root input.scout-who").first();await box.scrollIntoViewIfNeeded();
   const h=(await box.boundingBox()).height;assert.ok(h>=44,"the box is a full-size target: "+h);
   await box.fill("  Marsh <b> ");await box.blur();
   const r=await p.evaluate(()=>({who:Object.values(S.scoutWho||{}),plan:dayPlanText("Houston Heat",Date.now()),err:copyDataError(JSON.parse(JSON.stringify(S)))||""}));
   assert.deepEqual(r.who,["Marsh <b>"]);assert.match(r.plan,/Marsh <b> is watching/);assert.equal(r.err,"");
   await p.evaluate(()=>set({tab:"more",more:"schedule"}));
   const root=await p.evaluate(()=>document.getElementById("root"));
   assert.match(await p.evaluate(()=>document.getElementById("root").innerText),/Marsh <b> is watching/,"printed as text");
   assert.equal(await p.locator("#root .scout-plan b b").count(),0,"never as markup");
   await p.reload();assert.deepEqual(await p.evaluate(()=>Object.values(S.scoutWho||{})),["Marsh <b>"],"kept across a relaunch");
   await p.evaluate(()=>setScoutWho(Object.keys(S.scoutWho)[0],""));assert.deepEqual(await p.evaluate(()=>Object.keys(S.scoutWho)),[]);
  });
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} schedule audit checks passed.`);if(failed)process.exit(1);
})();

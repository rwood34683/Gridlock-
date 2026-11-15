"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),seed=require("../scripts/seed");
(async()=>{
 const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,fn,viewport={width:390,height:844}){
  const c=await browser.newContext({viewport,timezoneId:"America/New_York",serviceWorkers:"block"}),p=await c.newPage(),errors=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{
   await p.goto(process.env.APP_URL);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},seed);await p.reload();
   await p.evaluate(()=>{S.fmtAsk=false;S.preview=false;S.quick=false;window.print=()=>{window.printCalls=(window.printCalls||0)+1;};set({tab:"more",more:"schedule"});});
   await fn(p);assert.deepEqual(errors,[]);console.log("PASS "+name);passed++;
  }catch(e){console.error("FAIL "+name+": "+e.stack);failed++;}finally{await c.close();}
 }
 const paper=p=>p.locator("#coach-print");
 const print=async p=>{await p.getByRole("button",{name:"Print / Save PDF",exact:true}).click();assert.equal(await paper(p).count(),1);};
 try{
  await check("schedule printing respects team and division, escapes names and keeps stored data",async p=>{
   await p.evaluate(()=>{
    S.myTeam="Coach <b>x</b>";S.scheduleDivision="name:division 4 x-ball";
    S.games=[{id:"print-a",d:"2026-11-15",t:"9:00 AM",h:S.myTeam,a:"Other <img src=x>",f:"Pit 1",dv:"Division 4 X-Ball",layout:S.layoutKey},
     {id:"print-b",d:"2026-11-15",t:"10:00 AM",h:S.myTeam,a:"Wrong division",f:"Pit 1",dv:"Division 3 X-Ball",layout:S.layoutKey},
     {id:"print-c",d:"2026-11-15",t:"11:00 AM",h:"Other club",a:"Not our game",f:"Pit 1",dv:"Division 4 X-Ball",layout:S.layoutKey}];save(S);render();
   });
   const before=await p.evaluate(()=>[JSON.stringify(S),JSON.stringify(localStorage)]);let sent=0;p.on("request",()=>sent++);
   await print(p);const text=await paper(p).textContent();assert.match(text,/Coach <b>x<\/b>/);assert.match(text,/Other <img src=x>/);assert.doesNotMatch(text,/Wrong division|Not our game/);
   assert.equal(await paper(p).locator("img,b").count(),0);assert.match(text,/snapshot|not live updates/);
   assert.deepEqual(await p.evaluate(()=>[JSON.stringify(S),JSON.stringify(localStorage)]),before);assert.equal(sent,0);
   await p.evaluate(()=>dispatchEvent(new Event("afterprint")));assert.equal(await paper(p).count(),0);
   assert.equal(await p.evaluate(()=>document.body.classList.contains("coach-printing")),false);
  });
  await check("Reports prints the selected view and selected event with charts and no live controls",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"reports",repTab:"team",repAll:false}));
   const before=await p.evaluate(()=>JSON.stringify(S));await print(p);
   assert.match(await paper(p).textContent(),/Your team/);assert.equal(await paper(p).locator("button,input,textarea,select,script").count(),0);
   assert.equal(await p.evaluate(()=>JSON.stringify(S)),before);assert.equal(await paper(p).getByText("Every event",{exact:true}).count(),0);
   await p.emulateMedia({media:"print"});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await paper(p).locator(".fact").count()>0);
   assert(await paper(p).locator(".fact").evaluateAll(cards=>cards.every(e=>getComputedStyle(e).backgroundColor==="rgba(0, 0, 0, 0)" && getComputedStyle(e.querySelector("b")).color==="rgb(17, 17, 17)")));
   const out=path.resolve("work/coach-print");fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,"report-paper.png"),fullPage:true});
   await p.emulateMedia({media:"screen"});
   await p.evaluate(()=>dispatchEvent(new Event("afterprint")));
   await p.evaluate(()=>set({repTab:"season",repAll:true}));await print(p);assert.match(await paper(p).textContent(),/Every event/);
  });
  await check("daily bunker print retains filtered counts, percentages and names",async p=>{
   await p.evaluate(()=>{
    const bunker=curLayout().bunkers[0].id;
    S.matches=[{id:"print",vs:"Other",layout:S.layoutKey,at:Date.parse("2026-11-14T15:00:00Z")}];S.matchId="print";
    S.breakouts=[1,2,3].map(pt=>({id:"p"+pt,m:"print",pt,side:"us",layout:S.layoutKey,bunker,alive:true}));S.tally=[];S.moves=[];
    set({tab:"more",more:"stats",statView:"daily",statDay:"2026-11-14",statSide:"us",statMatch:"",statTeam:"",statMetric:"visits"});
   });
   const rows=await p.locator(".tbl--daily").textContent();const before=await p.evaluate(()=>JSON.stringify(S));await print(p);
   assert.equal(await paper(p).locator("table").textContent(),rows);assert.match(await paper(p).textContent(),/100.0%/);assert.match(await paper(p).textContent(),/2026|Nov/);
   assert.equal(await paper(p).locator("button").count(),0);assert.equal(await p.evaluate(()=>JSON.stringify(S)),before);
  });
  await check("unavailable or refused printing cleans up and never claims a print was sent",async p=>{
   await p.evaluate(()=>{window.print=undefined;printCoachPage("schedule");});assert.equal(await paper(p).count(),0);assert.match(await p.locator(".flash").innerText(),/not available/);
   await p.evaluate(()=>{window.print=()=>{throw Error("refused")};printCoachPage("schedule");});assert.equal(await paper(p).count(),0);assert.match(await p.locator(".flash").innerText(),/could not open/);
  });
  await check("printing refuses wrong screens, signed-out accounts and gated reports",async p=>{
   await p.evaluate(()=>printCoachPage("reports"));assert.equal(await paper(p).count(),0);
   await p.evaluate(()=>{S.entered=false;printCoachPage("schedule")});assert.equal(await paper(p).count(),0);
   const refused=await p.evaluate(()=>{S.entered=true;S.more="reports";const old=gateKey;gateKey=()=>"more/reports";try{printCoachPage("reports");return !document.getElementById("coach-print");}finally{gateKey=old;}});assert.equal(refused,true);
  });
  await check("sign-out discards the temporary print copy without deleting the saved season",async p=>{
   await print(p);const count=await p.evaluate(()=>S.matches.length);await p.evaluate(()=>askSignOut());
   assert.equal(await paper(p).count(),0);assert.equal(await p.evaluate(()=>S.entered),false);assert.equal(await p.evaluate(()=>S.matches.length),count);
  });
  for(const [name,viewport] of [["phone",{width:390,height:844}],["tablet",{width:820,height:1180}],["landscape",{width:1024,height:768}]]){
   await check(name+" print controls and paper fit without sideways scrolling",async p=>{
    await p.evaluate(()=>set({myTeam:"",scheduleDivision:""}));
    const button=p.getByRole("button",{name:"Print / Save PDF",exact:true});assert(await button.evaluate(e=>e.getBoundingClientRect().height>=44));
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const out=path.resolve("work/coach-print");fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+"-screen.png")});
    await print(p);await p.emulateMedia({media:"print"});
    assert.equal(await p.locator("#root").isVisible(),false);assert.equal(await paper(p).isVisible(),true);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await p.screenshot({path:path.join(out,name+"-paper.png")});
   },viewport);
  }
 }finally{await browser.close();}
 console.log(`${passed}/${passed+failed} coach print checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

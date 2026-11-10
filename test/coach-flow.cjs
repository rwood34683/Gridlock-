"use strict";
const assert=require("node:assert/strict"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,fn){const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});const p=await c.newPage(),errors=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{await p.goto(url);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.reload();
   await p.evaluate(()=>{Date.now=()=>Date.parse("2026-11-10T12:00:00");S.fmtAsk=false;S.fmtDone=true;render();});
   await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}}
 try{
  await check("World Cup stays selectable without NXL or MLPB logos",async p=>{
   const fs=require("node:fs"),root=path.resolve(__dirname,"..");
   assert.equal(fs.existsSync(path.join(root,"web/event-nxl-worldcup.jpg")),false,"removed badge must not ship");
   assert.doesNotMatch(fs.readFileSync(path.join(root,"web/sw.js"),"utf8"),/event-nxl-worldcup\.jpg/,"offline cache must not request the removed badge");
   await p.locator("button.ctx__ev").click();
   await p.getByLabel("Event",{exact:true}).selectOption("NXL World Cup · Kissimmee");
   assert.equal(await p.locator(".evpick img").count(),0);
   assert.equal(await p.getByLabel("Layout",{exact:true}).inputValue(),"nwc");
   await p.getByRole("button",{name:"Use layout",exact:true}).click();
   assert.equal(await p.evaluate(()=>LAYOUTS.nwc.bunkers.length),53,"keep the measured field");
   for(const more of ["nexus","codes"]){
    await p.evaluate(more=>set({tab:"more",more}),more);
    assert.equal(await p.locator('#root img[src*="nxl"],#root img[src*="mlpb"]').count(),0);
   }
  });
  await check("season, event and layout dropdowns preview a field before applying it",async p=>{
   await p.locator("button.ctx__ev").click();
   assert.equal(await p.getByLabel("Season",{exact:true}).inputValue(),"2026");
   await p.getByLabel("Event",{exact:true}).selectOption("NXL World Cup · Kissimmee");
   assert.equal(await p.getByLabel("Layout",{exact:true}).inputValue(),"nwc");
   assert.equal(await p.evaluate(()=>S.layoutKey),"lso","browsing never moves the field");
   await p.getByRole("button",{name:"Use layout",exact:true}).click();
   assert.equal(await p.evaluate(()=>S.layoutKey),"nwc");assert.equal(await p.locator(".evpick").count(),0);
   await p.reload();assert.equal(await p.evaluate(()=>S.layoutKey),"nwc");
  });
  await check("past seasons retain every layout and an unknown season is never dated today",async p=>{
   await p.evaluate(()=>{LAYOUTS.oldA={...LAYOUTS.lso,key:"oldA",season:2025,event:"Old event",layoutName:"Prelims"};LAYOUTS.oldB={...LAYOUTS.tby,key:"oldB",season:2025,event:"Old event",layoutName:"Finals"};LAYOUTS.unknown={...LAYOUTS.lso,key:"unknown",season:null,name:"Undated field"};openEventPicker();});
   await p.getByLabel("Season",{exact:true}).selectOption("2025");
   assert.equal(await p.getByLabel("Layout",{exact:true}).isDisabled(),false,"never greyed out");
   assert.equal(await p.getByRole("button",{name:"Use layout",exact:true}).isDisabled(),false,"never greyed out");
   await p.getByRole("button",{name:"Use layout",exact:true}).click();
   assert.match(await p.evaluate(()=>S.flash||""),/Choose an event/);assert.equal(await p.evaluate(()=>S.layoutKey),"lso","an empty pick moves nothing");
   await p.getByLabel("Event",{exact:true}).selectOption("Old event");
   assert.deepEqual(await p.locator("#event-layout option").allTextContents(),["Choose layout","Prelims","Finals"]);
   await p.getByLabel("Layout",{exact:true}).selectOption("oldB");await p.getByRole("button",{name:"Use layout",exact:true}).click();
   assert.equal(await p.evaluate(()=>S.layoutKey),"oldB");
   await p.locator("button.ctx__ev").click();await p.getByLabel("Season",{exact:true}).selectOption("Season not recorded");
   assert.deepEqual(await p.locator("#event-name option").allTextContents(),["Choose event","Undated field"]);
  });
  await check("changing to an older layout leaves an already scored match on its field",async p=>{
   const before=await p.evaluate(()=>{openSheet({vs:"Fixture"});endPoint("us");return{match:curMatch().id,field:curMatch().layout,results:JSON.stringify(S.results)};});
   await p.locator("button.ctx__ev").click();await p.getByLabel("Event",{exact:true}).selectOption("NXL Tampa Bay Open · Tampa");await p.getByRole("button",{name:"Use layout",exact:true}).click();
   assert.deepEqual(await p.evaluate(()=>({match:curMatch().id,field:curMatch().layout,results:JSON.stringify(S.results)})),before);
   assert.equal(await p.evaluate(()=>sheetField()),before.field);
  });
  await check("team names without loaded games stay selected, escaped and remembered",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"schedule",myTeam:""}));
   await p.getByText("Team not listed?",{exact:true}).click();await p.getByLabel("Team name",{exact:true}).fill('<b id="unsafe-team">Our team</b>');
   await p.getByRole("button",{name:"Use this team",exact:true}).click();
   assert.equal(await p.locator("#unsafe-team").count(),0);assert.match(await p.locator(".main").innerText(),/No schedule loaded for/);
   await p.reload();assert.equal(await p.locator("#my-team").inputValue(),'<b id="unsafe-team">Our team</b>');
   assert.equal(await p.locator(".daylight--play,.daylight--scout").count(),0,"do not invent games");
  });
  await check("the team's plan leads with opponents, scouting times and schedule clashes",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"schedule",myTeam:"Seattle Uprising"}));
   const text=await p.locator(".scout-plan").innerText();assert.match(text,/Next game: v Ranger Warsaw/);assert.match(text,/Next to scout:/);assert.match(text,/You play/);assert.match(text,/send someone/);assert.match(text,/NXL Pro/);
   assert.equal(await p.evaluate(()=>document.querySelector(".scout-plan").compareDocumentPosition(document.getElementById("pit-lead"))&Node.DOCUMENT_POSITION_FOLLOWING),4);
   await p.getByText("Game by game",{exact:true}).click();assert.match(await p.locator(".main").innerText(),/Scout Los Angeles Collision before then/);
  });
  await check("scoring from Whiteboard's Quick log returns to the board with marks and one saved point",async p=>{
   await p.evaluate(()=>{openSheet({vs:"Fixture"});S.wb={field:true,tool:"pen",color:"#e5342f",boards:{[S.layoutKey]:[{t:"pen",c:"#e5342f",pts:[[10,10],[20,20]]}]}};set({tab:"more",more:"wb"});});
   const before=await p.evaluate(()=>JSON.stringify(wbMarks()));await p.getByRole("button",{name:"⤢ Quick log",exact:true}).click();
   await p.getByRole("button",{name:"We won it",exact:true}).click();
   assert.equal(await p.locator(".qlog").count(),0);assert.equal(await p.locator("#wb-map").isVisible(),true);
   assert.equal(await p.evaluate(()=>JSON.stringify(wbMarks())),before);
   assert.deepEqual(await p.evaluate(()=>[matchScore().us,matchScore().them,S.point]),[1,0,2]);
   await p.evaluate(()=>tapResult("us"));assert.equal(await p.evaluate(()=>matchScore().us),1,"the second tap must not score twice");
   await p.reload();assert.equal(await p.evaluate(()=>matchScore().us),1);assert.equal(await p.evaluate(()=>JSON.stringify(wbMarks())),before);
  });
  await check("Tally keeps Quick log open, and a refused point never closes Whiteboard's layer",async p=>{
   await p.evaluate(()=>{openSheet({vs:"Fixture"});set({tab:"tally",quick:true});tapResult("them");});
   assert.equal(await p.locator(".qlog").isVisible(),true);assert.equal(await p.evaluate(()=>matchScore().them),1);
   await p.evaluate(()=>{set({tab:"more",more:"wb",quick:true});tapResult("us");});
   assert.equal(await p.locator(".qlog").isVisible(),true);assert.equal(await p.evaluate(()=>matchScore().us),0);
  });
  await check("a sign-in mid-match stays on the sheet; a sign-in with nothing under way opens the team's day",async p=>{
   await p.evaluate(()=>{openSheet({vs:"Fixture"});endPoint("us");set({tab:"tally",more:"",quick:false});afterSignIn();});
   assert.deepEqual(await p.evaluate(()=>[S.tab,S.more]),["tally",""],"a match under way keeps the coach where he was");
   await p.evaluate(()=>{openSheet({vs:"Fresh"});set({tab:"tally"});afterSignIn();});
   assert.deepEqual(await p.evaluate(()=>[S.tab,S.more]),["more","schedule"]);
  });
  await check("event dropdowns and the team plan fit phones and tablets",async p=>{
   for(const size of [{width:375,height:667},{width:820,height:1180},{width:1180,height:820}]){
    await p.setViewportSize(size);await p.evaluate(()=>{set({tab:"more",more:"schedule",myTeam:"Houston Heat",evPick:false});openEventPicker();});
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    const heights=await p.locator(".evpick select").evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert(heights.every(h=>h>=44));
   }
  });
 }finally{await browser.close();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} coach flow checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

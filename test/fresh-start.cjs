"use strict";
// Blank on first use and on New match; an active match always resumes, however
// old; a finished one stays until he starts a new one. Nothing saved is removed.
const assert=require("node:assert/strict"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 // Play `points` results against Dynasty, then age every stamp on the sheet by `ago` ms.
 const play=(p,o)=>p.evaluate(o=>{
  S.fmtAsk=false;S.fmtDone=true;set({tab:"tally",right:{name:"Dynasty"}});newMatch();
  if(o.race)patchMatch({raceTo:o.race});
  for(let i=0;i<o.points;i++){markOut("us",S.roster[0].name);endPoint("us");}
  const id=S.matchId,old=Date.now()-o.ago;
  S.matches=S.matches.map(m=>m.id===id?{...m,at:old}:m);
  ["tally","results","calls","breakouts"].forEach(k=>{S[k]=(S[k]||[]).map(r=>r&&r.m===id?{...r,at:old}:r);});
  save(S);return {id,results:S.results.length,tally:S.tally.length,matches:S.matches.length};
 },o);
 const now=p=>p.evaluate(()=>({id:S.matchId,left:pitNamed("left"),right:pitNamed("right"),vs:matchVs(),point:S.point,
  results:S.results.length,tally:S.tally.length,matches:S.matches.length,empty:sheetEmpty(curMatch()),
  ids:S.matches.map(m=>m.id),root:document.getElementById("root").innerText}));
 async function check(name,fn){const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});const p=await c.newPage(),errors=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{await p.goto(url);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.reload();
   await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}}
 try{
  await check("first use: Tally asks who he plays and both Scout pits ask for a team",async p=>{
   await p.evaluate(()=>localStorage.clear());await p.reload();   // a phone that has never run the app
   await p.evaluate(()=>{set({entered:true,role:"staff",fmtAsk:false,fmtDone:true,tab:"tally"});});const s=await now(p);
   assert.equal(s.left,false);assert.equal(s.right,false);assert.equal(s.vs,"");assert.match(s.root,/Who are you playing\?/i);
   await p.evaluate(()=>set({tab:"scout",scoutTab:"matchup"}));
   assert.equal(await p.locator(".pit__name").evaluateAll(n=>n.filter(x=>/Pick a team/.test(x.innerText)).length),2);
  });
  for(const [word,ago] of [["ten minutes",10*60000],["seven hours",7*3600000],["three days",3*86400000]])
  await check("an unfinished match resumes exactly as it was after "+word,async p=>{
    const was=await play(p,{points:2,ago});await p.reload();const s=await now(p);
    assert.equal(s.id,was.id);assert.equal(s.right,true);assert.equal(s.vs,"Dynasty");assert.equal(s.point,3);
    assert.equal(s.matches,was.matches);assert.equal(s.results,was.results);assert.equal(s.tally,was.tally);
    await p.evaluate(()=>{S.entered=false;save(S);});await p.reload();
    await p.evaluate(()=>{set({entered:true,role:"staff"});afterSignIn();});const t=await now(p);
    assert.equal(t.id,was.id,"a sign-in keeps it too");assert.equal(t.vs,"Dynasty");assert.equal(t.results,was.results);
  });
  await check("a finished match stays on screen with New match leading, and New match starts blank",async p=>{
   const was=await play(p,{points:2,race:2,ago:2*86400000});assert.ok(await p.evaluate(()=>!!matchOver()),"the race is over");
   await p.reload();let s=await now(p);assert.equal(s.id,was.id,"the finished sheet is never closed for him");assert.equal(s.vs,"Dynasty");
   await p.evaluate(()=>set({tab:"tally"}));
   await p.getByRole("button",{name:/^New match/}).first().click();s=await now(p);
   assert.notEqual(s.id,was.id);assert.equal(s.empty,true);assert.equal(s.vs,"");assert.equal(s.left,false);assert.equal(s.right,false);assert.equal(s.point,1);
   assert.ok(s.ids.includes(was.id),"the finished sheet is kept");assert.equal(s.matches,was.matches+1);
   assert.equal(s.results,was.results,"no result is removed");assert.equal(s.tally,was.tally,"no out is removed");
   assert.match(s.root,/Who are you playing\?/i);assert.match(s.root,/kept under More › Matches/);
   await p.evaluate(()=>set({tab:"scout",scoutTab:"matchup"}));
   assert.equal(await p.locator(".pit__name").evaluateAll(n=>n.filter(x=>/Pick a team/.test(x.innerText)).length),2,"both pits ask for a team");
   await p.evaluate(()=>set({tab:"more",more:"matches"}));assert.match((await now(p)).root,/Dynasty/,"the kept sheet is listed");
   await p.reload();const again=await now(p);assert.equal(again.id,s.id);assert.equal(again.right,false,"the blank sheet is still blank after a relaunch");
  });
  await check("New match with the next team already in the right pit starts against them",async p=>{
   const was=await play(p,{points:1,ago:60000});
   await p.evaluate(()=>{setPitTeam("right",teamsHere().find(t=>t.name!=="Dynasty").name);});
   const next=await p.evaluate(()=>S.right.name);assert.notEqual(next,"Dynasty");
   await p.evaluate(()=>freshMatch());const s=await now(p);
   assert.notEqual(s.id,was.id);assert.equal(s.vs,next);assert.equal(s.right,true);assert.ok(s.ids.includes(was.id));assert.equal(s.results,was.results);
  });
  await check("New match with the pit cleared on a played sheet starts blank; on a blank sheet it asks for the team",async p=>{
   const was=await play(p,{points:1,ago:60000});await p.evaluate(()=>{S.right={};save(S);freshMatch();});let s=await now(p);
   assert.notEqual(s.id,was.id);assert.equal(s.vs,"");assert.ok(s.ids.includes(was.id));
   await p.evaluate(()=>freshMatch());const t=await now(p);assert.equal(t.id,s.id,"no second blank sheet");assert.equal(t.matches,s.matches);
   assert.match(t.root,/Pick the team you play next first/);
  });
  for(const [word,width,height] of [["phone",390,844],["tablet",768,1024],["tablet on its side",1024,768]])
  await check("New match tapped low on Tally brings the opponent prompt into view on a "+word,async p=>{
   await p.setViewportSize({width,height});
   await play(p,{points:2,ago:60000});await p.evaluate(()=>set({tab:"tally"}));
   const btn=p.locator('#root button[onclick="freshMatch()"]').first();await btn.scrollIntoViewIfNeeded();
   if(width<740)assert.ok(await p.evaluate(()=>{const m=document.querySelector(".main");return Math.max(m?m.scrollTop:0,scrollY)>100;}),"the button is low on the page");
   await btn.click();await p.waitForTimeout(300);
   assert.equal(await p.evaluate(()=>matchVs()),"");
   const box=await p.locator("#tally-opp").boundingBox();assert.ok(box,"the prompt is drawn");
   assert.ok(box.y>=0&&box.y+Math.min(box.height,120)<=height,"the prompt is on screen: "+JSON.stringify(box));
  });
  await check("New match after a watched game with nothing logged starts blank, not against the away side",async p=>{
   const r=await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;set({tab:"more",more:"schedule"});const g=allGames()[0];watchGame(g.id);
    const before={watch:!!curMatch().watch,left:S.left.name,right:S.right.name,n:S.matches.length,empty:sheetEmpty(curMatch())};freshMatch();
    return {before,vs:matchVs(),left:pitNamed("left"),right:pitNamed("right"),watch:!!curMatch().watch,n:S.matches.length,flash:S.flash};});
   assert.equal(r.before.watch,true);assert.equal(r.before.empty,true);assert.ok(r.before.left&&r.before.right);
   assert.equal(r.vs,"");assert.equal(r.left,false);assert.equal(r.right,false);assert.equal(r.watch,false);
   assert.equal(r.n,r.before.n,"the empty watched sheet is replaced");assert.doesNotMatch(r.flash,/kept under/,"nothing was kept, so it does not say so");
   assert.match(await p.evaluate(()=>document.getElementById("root").innerText),/Who are you playing\?/i);
  });
  await check("a message raised while the breakout sheet is open stands clear of Save",async p=>{
   await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;set({tab:"tally",right:{name:"Dynasty"}});newMatch();
    const b=curLayout().bunkers.filter(b=>b.x<60);tallyStepTo("place");tallyTap([b[3].x,b[3].y]);tallyTap([b[5].x,b[5].y]);tallyStepTo("record");
    setDraft({player:S.roster[0].name,alive:true});logBreakout();setDraft({player:S.roster[0].name,alive:false});logBreakout();});
   await p.waitForTimeout(300);
   const f=await p.locator("#root .flash").boundingBox(),act=await p.locator("#root .tsheet__act").first().boundingBox();
   assert.ok(f,"the refusal is on screen");assert.ok(act,"the sheet is still open");
   assert.ok(f.y+f.height<=act.y||f.y>=act.y+act.height,"the message does not sit over the action bar: "+JSON.stringify({f,act}));
  });
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} fresh-start checks passed.`);if(failed)process.exit(1);
})();

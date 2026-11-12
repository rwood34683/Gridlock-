"use strict";
// The 12 Nov data audit: what was recorded reads back the same on every screen.
//  - a season row (no sheet) is counted where it was tapped, whatever end the
//    sheet in play is on now;
//  - every spreadsheet date is the phone's own calendar day, not UTC's;
//  - Bunker stats offers "As played" whenever its rows came from another end
//    than the one shown, and the match review names a bunker as Reports does.
const assert=require("node:assert/strict"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,fn){
  const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",timezoneId:"America/New_York"});const p=await c.newPage(),errors=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{await p.goto(url);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.reload();
   await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;S.syncAsk=false;save(S);
    window.tell=(bid,patch)=>{const b=curLayout().bunkers.find(x=>x.id===bid);S.tallyStep="tell";tallyTap([b.x,b.y]);setDraft(patch);logBreakout();};});
   await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}}
 try{
  await check("a season five keeps its bunker when the sheet in play switches ends, and Scout agrees with Reports",async p=>{
   const r=await p.evaluate(()=>{
    set({tab:"tally",right:{name:"Dynasty"}});newMatch();tell("Wg#1",{side:"us",player:S.roster[0].name,alive:true});
    setPitTeam("right","Impact");logTheirBreak("right","",["MD#4"]);      // a season row: the sheet is vs Dynasty
    freshMatch();setPitTeam("right","Impact");newMatch();logTheirBreak("right","",["MD#4"]);endPoint("us");
    const read=()=>({counts:plantCounts("right"),rep:repPlants("Impact").rows.map(x=>[x.name,x.n])});
    const left=read();switchEnds();const right=read();return {left,right,endR:ourEnd()};
   });
   assert.equal(r.endR,"right");
   assert.deepEqual(r.left.counts,[["MD#4",2]]);
   assert.deepEqual(r.right.counts,r.left.counts,"switching ends moves no logged five");
   assert.equal(r.right.rep.length,1,"Reports names one bunker");assert.equal(r.right.rep[0][1],2);
  });
  await check("an evening sheet is on its own day in every spreadsheet, not the UTC day after",async p=>{
   const r=await p.evaluate(()=>{
    set({tab:"tally",right:{name:"Dynasty"}});newMatch();const A=S.matchId;
    tell("Wg#1",{side:"us",player:S.roster[0].name,alive:true});endPoint("us");
    const at=Date.parse("2026-11-11T01:30:00Z");                         // 8:30 PM on 10 Nov in New York
    S.matches=S.matches.map(m=>m.id===A?{...m,at}:m);save(S);
    return {stamp:dateStamp(at),day:statDayKey(at),
     sheets:REPORT_CSV.sheets()[1].split("\n").filter(l=>/Dynasty/.test(l)).join("|"),
     breaks:REPORT_CSV.breakouts()[1].split("\n").filter(l=>/Dynasty/.test(l)).join("|")};
   });
   assert.equal(r.stamp,"2026-11-10");assert.equal(r.day,"2026-11-10");
   assert.match(r.sheets,/2026-11-10/);assert.doesNotMatch(r.sheets,/2026-11-11/);
   assert.match(r.breaks,/2026-11-10/);assert.doesNotMatch(r.breaks,/2026-11-11/);
  });
  await check("Bunker stats offers As played when its rows came from the other end, and the review names a bunker as Reports does",async p=>{
   const r=await p.evaluate(()=>{
    set({tab:"tally",right:{name:"Dynasty"}});newMatch();const A=S.matchId;const ro=S.roster.map(x=>x.name);
    tell("Wg#1",{side:"us",player:ro[0],alive:false});endPoint("them");
    freshMatch();set({right:{name:"Impact"}});newMatch();switchEnds();
    S.statSide="us";S.statAsPlayed=false;S.statMatch="";S.statDay="";S.statView="map";
    const rep=repBunkerRows().map(x=>x.name),rev=matchReview(A);
    set({tab:"more",more:"stats"});
    return {end:ourEnd(),moved:statEndsMoved(),rep,revTo:rev.men.us.map(x=>x.to),
     root:document.getElementById("root").innerText};
   });
   assert.equal(r.end,"right");assert.equal(r.moved,true,"the switch shows");
   assert.match(r.root,/As played/);
   assert.ok(r.revTo.length&&r.revTo.every(t=>r.rep.includes(Array.isArray(t)?t[0]:t)),"review "+JSON.stringify(r.revTo)+" vs reports "+JSON.stringify(r.rep));
  });
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} data audit checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

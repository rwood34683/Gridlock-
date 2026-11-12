"use strict";
// How much to record (Full chart / Score and outs / Score only) and the short
// "What happened" sheet. Both hide controls, never data, and both default to
// the app as it was.
const assert=require("node:assert/strict"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,fn,vp={width:390,height:844}){const c=await browser.newContext({viewport:vp,serviceWorkers:"block"});const p=await c.newPage(),errors=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{await p.goto(url);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.reload();
   await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;set({tab:"tally",right:{name:"Dynasty"}});newMatch();
    const b=curLayout().bunkers.filter(b=>b.x<60);S.tallyStep="record";S.tallyMode="record";tallyTap([b[4].x,b[4].y]);setDraft({player:S.roster[0].name,alive:true,movedTo:b[6].id});logBreakout();
    markOut("us",S.roster[1].name);set({tab:"tally",flash:""});});
   await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}}
 const see=p=>p.evaluate(()=>({field:!!document.querySelector("#root #tally-map"),who:!!document.querySelector("#root .who2")&&getComputedStyle(document.querySelector("#root .who2")).display!=="none",
  note:!!document.querySelector("#root [data-depth-note]"),bar:!!document.querySelector("#root .resultbar"),text:document.getElementById("root").innerText,
  rows:[S.breakouts.length,S.tally.length,S.results.length],depth:tallyDepth(),overflow:document.documentElement.scrollWidth>innerWidth}));
 try{
  for(const [word,vp] of [["phone",{width:390,height:844}],["tablet",{width:1024,height:768}]])
  await check("Full chart is the default, and each choice hides controls without removing anything, on a "+word,async p=>{
   let s=await see(p);const rows=s.rows;
   assert.equal(s.depth,"full");assert.equal(s.field,true);assert.equal(s.who,true);assert.equal(s.note,false);assert.match(s.text,/How much to record/i);
   await p.locator('#root button[onclick="setTallyDepth(\'outs\')"]').click();s=await see(p);
   assert.equal(s.depth,"outs");assert.equal(s.field,false,"the break chart is put away");assert.equal(s.who,true,"the players stay");assert.equal(s.note,true);
   assert.doesNotMatch(s.text,/Where the points come from/i);assert.match(s.text,/LOG/);assert.deepEqual(s.rows,rows);assert.equal(s.overflow,false);
   await p.locator("#root .who2 .assign").first().click();assert.ok(await p.locator("#player-details").isVisible(),"a player still opens");await p.evaluate(()=>closePlayerDetails());
   await p.locator('#root button[onclick="setTallyDepth(\'score\')"]').click();s=await see(p);
   assert.equal(s.depth,"score");assert.equal(s.field,false);assert.equal(s.who,false,"the players are put away");assert.equal(s.bar,true,"who won it stays");
   assert.match(s.text,/We won it/i);assert.match(s.text,/Right read/i);assert.deepEqual(s.rows,rows);assert.equal(s.overflow,false);
   await p.getByRole("button",{name:"We won it"}).click();s=await see(p);assert.equal(s.rows[2],rows[2]+1,"the point is scored");assert.equal(await p.evaluate(()=>S.point),2);
   await p.reload();await p.evaluate(()=>set({tab:"tally"}));s=await see(p);assert.equal(s.depth,"score","the choice is kept on this phone");
   await p.getByRole("button",{name:"Show the full chart"}).click();s=await see(p);
   assert.equal(s.depth,"full");assert.equal(s.field,true);assert.equal(s.who,true);assert.equal(s.rows[0],rows[0]);assert.equal(s.rows[1],rows[1]);
   await p.evaluate(()=>set({tab:"more",more:"matches"}));assert.match(await p.evaluate(()=>document.getElementById("root").innerText),/Dynasty/);
  },vp);
  await check("the short sheet asks who and whether he made it, with the rest one tap away",async p=>{
   const open=i=>p.evaluate(i=>{const b=curLayout().bunkers.filter(b=>b.x<60)[i];S.tallyStep="record";S.tallyMode="record";tallyTap([b.x,b.y]);},i);
   await open(7);let t=await p.locator("#tally-sheet").innerText();
   assert.match(t,/Shooting which way\?/i,"every question is the default");assert.match(t,/Ask only who and whether he made it/);
   await p.locator("#tally-sheet [data-short-toggle]").click();t=await p.locator("#tally-sheet").innerText();
   assert.doesNotMatch(t,/Shooting which way\?|How did he get in\?|Second bunker|Delayed break/i);assert.match(t,/Did he make it\?/i);assert.match(t,/More about him/);
   assert.ok(await p.locator("#tally-sheet .tsheet__act").isVisible(),"Save is still there");
   await p.locator("#tally-sheet [data-more-about]").click();assert.match(await p.locator("#tally-sheet").innerText(),/Shooting which way\?/i);
   const n=await p.evaluate(()=>S.breakouts.length);
   await p.evaluate(()=>{setDraft({player:S.roster[2].name,alive:false});logBreakout();});
   assert.equal(await p.evaluate(()=>S.breakouts.length),n+1,"a short answer is logged");
   await open(8);assert.doesNotMatch(await p.locator("#tally-sheet").innerText(),/Shooting which way\?/i,"the next man opens short again");
   await p.evaluate(()=>tallyDone());
   await p.evaluate(()=>editBreakout(S.breakouts.find(r=>r.movedTo).id));
   assert.match(await p.locator("#tally-sheet").innerText(),/Shooting which way\?/i,"a man with more already answered shows it all");
   await p.reload();assert.equal(await p.evaluate(()=>S.tallyShort),true,"the choice is kept");
  });
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} tally depth checks passed.`);if(failed)process.exit(1);
})();

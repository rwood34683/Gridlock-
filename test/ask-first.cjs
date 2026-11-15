"use strict";
// Every "are you sure" goes through askFirst. On a phone and in a browser it is
// the system's question; in the published preview, which may refuse system
// questions silently, it is a second tap on the same button. And a message the
// coach has read does not follow him onto the next screen.
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 const play=p=>p.evaluate(()=>{
  S.fmtAsk=false;S.fmtDone=true;set({tab:"tally",right:{name:"Dynasty"}});newMatch();
  markOut("us",S.roster[0].name);endPoint("us");return S.matchId;
 });
 const state=p=>p.evaluate(()=>({id:S.matchId,vs:matchVs(),matches:S.matches.length,flash:S.flash,
  shown:document.querySelectorAll("#root .flash").length}));
 async function check(name,fn,{preview=false}={}){
  const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});const p=await c.newPage(),errors=[],dialogs=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>{dialogs.push(d.message());d.accept();});
  try{await p.goto(url);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.reload();
   // The sheet is played before the preview flag goes on, the way a coach
   // reaches New match with a match already on it.
   if(preview){const play0=play;await fn(p,dialogs,async q=>{const id=await play0(q);await q.evaluate(()=>{window.gridlockPreview=true;});return id;});}
   else await fn(p,dialogs,play);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}}
 try{
  await check("on a phone or in a browser New match still asks the system's question",async(p,dialogs)=>{
   const was=await play(p);const n=dialogs.length;await p.locator('#root button[onclick="freshMatch()"]').first().click();
   assert.equal(dialogs.length,n+1);assert.match(dialogs[n],/Close the sheet/);
   const s=await state(p);assert.notEqual(s.id,was);assert.equal(s.vs,"");
  });
  await check("in the preview New match asks with a second tap and never a system box",async(p,dialogs,play)=>{
   const was=await play(p);const n=dialogs.length;const btn=p.locator('#root button[onclick="freshMatch()"]').first();
   await btn.click();let s=await state(p);
   assert.equal(dialogs.length,n,"no system question");assert.equal(s.id,was,"the first tap changes nothing");
   assert.match(s.flash,/Close the sheet[\s\S]*Tap the same button again to go ahead/);assert.equal(s.shown,1,"the question is on screen");
   await p.locator('#root button[onclick="freshMatch()"]').first().click();s=await state(p);
   assert.notEqual(s.id,was,"the second tap goes ahead");assert.equal(s.vs,"");assert.equal(dialogs.length,n);
  },{preview:true});
  await check("in the preview a second tap after eight seconds asks again, and a different question is its own",async(p,dialogs,play)=>{
   const was=await play(p);
   const r=await p.evaluate(()=>{const a=askFirst("One?"),b=askFirst("Two?"),c=askFirst("One?");
    _askUntil=Date.now()-1;const d=askFirst("Two?");const e=askFirst("Two?");return [a,b,c,d,e];});
   assert.deepEqual(r,[false,false,false,false,true]);assert.equal((await state(p)).id,was);
  },{preview:true});
  await check("a delete in the preview waits for the second tap too",async(p,dialogs,play)=>{
   const was=await play(p);const n=dialogs.length;await p.evaluate(()=>{set({tab:"more",more:"matches"});});
   const has=()=>p.evaluate(id=>S.matches.some(m=>m.id===id),was);
   await p.evaluate(id=>window.delSheet(id),was);assert.equal(await has(),true,"first tap deletes nothing");
   await p.evaluate(id=>window.delSheet(id),was);assert.equal(await has(),false,"second tap deletes");
   assert.equal(dialogs.length,n);
  },{preview:true});
  await check("the preview never confirms a different note just because its question is the same",async(p,dialogs,play)=>{
   await play(p);const n=dialogs.length;
   const r=await p.evaluate(()=>{
    S.messages=[{text:"Keep A"},{text:"Keep B"}];
    delMsg(0);const first=S.messages.map(m=>m.text);
    delMsg(1);const other=S.messages.map(m=>m.text);
    delMsg(1);return {first,other,last:S.messages.map(m=>m.text)};
   });
   assert.deepEqual(r.first,["Keep A","Keep B"]);
   assert.deepEqual(r.other,["Keep A","Keep B"],"the other note needs its own second tap");
   assert.deepEqual(r.last,["Keep A"]);assert.equal(dialogs.length,n);
  },{preview:true});
  await check("a changed note at the same position needs a fresh preview confirmation",async(p,dialogs,play)=>{
   await play(p);
   const r=await p.evaluate(()=>{
    S.messages=[{text:"Old note"}];delMsg(0);
    S.messages[0]={text:"New note"};delMsg(0);
    const kept=S.messages.map(m=>m.text);delMsg(0);
    return {kept,left:S.messages.length};
   });
   assert.deepEqual(r.kept,["New note"],"the first tap never authorized the replacement note");
   assert.equal(r.left,0);
  },{preview:true});
  await check("preview confirmation is bound to the selected copy, account, match, point and field",async(p,dialogs,play)=>{
   await play(p);
   const r=await p.evaluate(()=>{
    const results=[];const ask=target=>askFirst("Delete this recovery copy?",target);
    results.push(ask(["recovery","A","old"]),ask(["recovery","B","old"]),ask(["recovery","B","new"]));
    S.email="another@example.test";results.push(ask(["recovery","B","new"]));
    S.matchId="another-sheet";results.push(ask(["recovery","B","new"]));
    S.point=99;results.push(ask(["recovery","B","new"]));
    S.layoutKey="another-field";results.push(ask(["recovery","B","new"]));
    results.push(ask(["recovery","B","new"]));return results;
   });
   assert.deepEqual(r,[false,false,false,false,false,false,false,true]);
  },{preview:true});
  await check("a message read and left does not follow the coach to the next screen",async p=>{
   await play(p);await p.evaluate(()=>window.flash("Saved on Tally."));assert.equal((await state(p)).shown,1);
   await p.waitForTimeout(1200);
   await p.evaluate(()=>set({tab:"more",more:null}));const s=await state(p);
   assert.equal(s.flash,"");assert.equal(s.shown,0);
  });
  await check("a message raised on the way to a new screen stays on it",async p=>{
   await play(p);await p.evaluate(()=>{window.flash("New sheet.");set({tab:"more",more:null});});
   let s=await state(p);assert.equal(s.flash,"New sheet.");assert.equal(s.shown,1);
   await p.evaluate(()=>set({tab:"tally",flash:"Back on Tally."}));s=await state(p);assert.equal(s.flash,"Back on Tally.");
  });
  await check("no system question is left outside askFirst",async()=>{
   const src=fs.readFileSync(path.resolve(__dirname,"../web/index.html"),"utf8");
   const calls=[...src.matchAll(/(?<![.\w])confirm\(/g)].length;
   assert.equal(calls,1,"only askFirst itself calls confirm()");
  });
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} ask-first checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

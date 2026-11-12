"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,fn,viewport={width:390,height:844}){
  const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[],requests=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("request",r=>{if(!r.url().startsWith(url)&&!r.url().startsWith("data:"))requests.push(r.url());});
  p.on("dialog",d=>d.accept());
  try{await p.goto(url);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.reload();
   await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;set({tab:"tally",right:{name:"Test Blue"}});newMatch();
    markOut("us",S.roster[0].name);endPoint("us");
    const b=curLayout().bunkers.find(x=>x.id==="SB#3");S.tallyStep="record";S.tallyMode="record";
    tallyTap([b.x,b.y]);setDraft({player:S.roster[1].name,side:"us",sideSet:true,alive:false});logBreakout();
    _lastEnd=null;set({flash:""});});
   await fn(p);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}
 }
 const pointRows=p=>p.evaluate(()=>Object.fromEntries(SHEET_LISTS.map(k=>[k,(S[k]||[]).filter(r=>r.m===S.matchId&&r.pt===sheetPoint())])));
 try{
  await check("Clear point removes this point's entries and Undo restores them",async p=>{
   const before=await pointRows(p);
   assert.equal(await p.locator("[data-clear-point]").count(),1,"Tally offers a whole-point clear");
   await p.locator("[data-clear-point]").click();
   assert.ok(Object.values(await pointRows(p)).every(a=>a.length===0));
   await p.getByRole("button",{name:"Undo clear",exact:true}).click();
   assert.deepEqual(await pointRows(p),before);
  });
  await check("the next point resets earlier-point list filters",async p=>{
   await p.evaluate(()=>{set({tallyAllBreaks:true,tallyAllOuts:true,tallyValueOpen:true});endPoint("them");});
   assert.deepEqual(await p.evaluate(()=>[!!S.tallyAllBreaks,!!S.tallyAllOuts,!!S.tallyValueOpen]),[false,false,false]);
   assert.equal(await p.evaluate(()=>S.point),3);
  });
  await check("every point record, both scouting books and the written five clear without touching other points or teams",async p=>{
   const before=await p.evaluate(()=>{
    const mid=S.matchId,pt=sheetPoint(),base={m:mid,pt,layout:S.layoutKey,at:Date.now(),id:"point-probe",side:"us",player:S.roster[1].name,
     name:S.roster[1].name,who:S.roster[1].name,vs:matchVs(),script:"snake",score:3,won:"them",cost:1,bunker:"SB#3",from:"SB#3",to:"GP#1",team:matchVs(),text:"Point note",kind:"note",point:pt};
    SHEET_LISTS.forEach(k=>{S[k]=[...(S[k]||[]),{...base},{...base,m:"other-match",id:"other-probe"}];});
    for(const team of ["Test Blue","Test Red"]) S.scout[team]={...(S.scout[team]||{}),breaks:[{m:mid,pt,layout:S.layoutKey,script:"snake",plants:["SB#3"],at:123},{m:mid,pt:1,layout:S.layoutKey,script:"hold",plants:[],at:124}]};
    S.lineups={...S.lineups,[lineKey(pt,mid)]:S.roster.slice(0,5).map(r=>r.name)};
    save(S);return JSON.stringify([SHEET_LISTS.map(k=>S[k]),S.scout,S.lineups,S.matches,S.roster,S.bunkerCalls]);
   });
   await p.locator("[data-clear-point]").click();
   assert.equal(await p.evaluate(()=>SHEET_LISTS.every(k=>S[k].some(r=>r.m==="other-match"))),true,"other match survives in every list");
   assert.equal(await p.evaluate(()=>Object.values(S.scout).every(v=>(v.breaks||[]).every(r=>r.m!==S.matchId||r.pt!==2))),true);
   assert.equal(await p.evaluate(()=>S.lineups[lineKey(2)]),undefined);
   assert.equal(await p.evaluate(()=>S.scout["Test Blue"].breaks[0].pt),1,"earlier scouting stays");
   await p.getByRole("button",{name:"Undo clear",exact:true}).click();
   assert.equal(await p.evaluate(()=>JSON.stringify([SHEET_LISTS.map(k=>S[k]),S.scout,S.lineups,S.matches,S.roster,S.bunkerCalls])),before);
  });
  await check("Cancel leaves the point, draft and earlier-point filters untouched",async p=>{
   await p.evaluate(()=>set({tallyAllBreaks:true,tallyAllOuts:true,tallyRead:"right"}));
   const before=await p.evaluate(()=>JSON.stringify([SHEET_LISTS.map(k=>S[k]),S.point,S.tallyRead,S.tallyAllBreaks,S.tallyAllOuts]));
   p.removeAllListeners("dialog");p.on("dialog",d=>d.dismiss());
   await p.locator("[data-clear-point]").click();
   assert.equal(await p.evaluate(()=>JSON.stringify([SHEET_LISTS.map(k=>S[k]),S.point,S.tallyRead,S.tallyAllBreaks,S.tallyAllOuts])),before);
  });
  await check("preview confirmation follows the exact contents, and changes during confirmation refuse the clear",async p=>{
   await p.evaluate(()=>{window.gridlockPreview=true;clearTallyPoint();});
   assert.ok(Object.values(await pointRows(p)).some(a=>a.length));
   await p.evaluate(()=>{markOut("us",S.roster[2].name);clearTallyPoint();});
   assert.ok(Object.values(await pointRows(p)).some(a=>a.length),"changed point needs a new second tap");
   await p.evaluate(()=>clearTallyPoint());
   assert.ok(Object.values(await pointRows(p)).every(a=>a.length===0));
   await p.evaluate(()=>{undoClearTallyPoint();window.gridlockPreview=false;window.confirm=()=>{markOut("us",S.roster[3].name);return true;};clearTallyPoint();});
   assert.ok(Object.values(await pointRows(p)).some(a=>a.length));
   assert.match(await p.locator("#root").innerText(),/point changed/i);
  });
  await check("Undo never overwrites a new entry or a different account",async p=>{
   await p.locator("[data-clear-point]").click();
   await p.evaluate(()=>markOut("us",S.roster[3].name));const after=await pointRows(p);
   await p.evaluate(()=>undoClearTallyPoint());assert.deepEqual(await pointRows(p),after);
   await p.evaluate(()=>clearTallyPoint());
   await p.evaluate(()=>{S.email="different-test@example.invalid";++_syncEpoch;undoClearTallyPoint();});
   assert.ok(Object.values(await pointRows(p)).every(a=>a.length===0));
  });
  await check("a stale tab cannot clear its old copy",async p=>{
   const before=await pointRows(p);
   await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem(STORE_KEY));s.saveId="another-tab.new";s.savedAt+=1;localStorage.setItem(STORE_KEY,JSON.stringify(s));clearTallyPoint();});
   assert.deepEqual(await pointRows(p),before);
  });
  await check("Clear and Undo work on the winning point without renumbering it",async p=>{
   await p.evaluate(()=>{patchMatch({raceTo:2});endPoint("us");});
   assert.equal(await p.evaluate(()=>!!matchOver()),true);
   const before=await p.evaluate(()=>({score:matchScore(),point:S.point,rows:JSON.stringify(SHEET_LISTS.map(k=>S[k]))}));
   await p.locator("[data-clear-point]").click();
   assert.equal(await p.evaluate(()=>sheetPoint()),2);assert.equal(await p.evaluate(()=>!!matchOver()),false);
   await p.getByRole("button",{name:"Undo clear",exact:true}).click();
   assert.deepEqual(await p.evaluate(()=>({score:matchScore(),point:S.point,rows:JSON.stringify(SHEET_LISTS.map(k=>S[k]))})),before);
   assert.equal(await p.evaluate(()=>!!matchOver()),true);
  });
  await check("Reset match starts fresh, preserves the old sheet and keeps the recording preference",async p=>{
   const before=await p.evaluate(()=>({id:S.matchId,rows:JSON.stringify(SHEET_LISTS.map(k=>S[k]))}));
   await p.evaluate(()=>set({tallyDepth:"outs",tallyAllBreaks:true,tallyAllOuts:true,tallyValueOpen:true}));
   await p.locator("[data-reset-match]").click();
   const after=await p.evaluate(()=>({id:S.matchId,point:S.point,vs:matchVs(),depth:S.tallyDepth,old:matchById(S.matches[1].id),rows:JSON.stringify(SHEET_LISTS.map(k=>S[k])),filters:[!!S.tallyAllBreaks,!!S.tallyAllOuts,!!S.tallyValueOpen]}));
   assert.notEqual(after.id,before.id);assert.equal(after.point,1);assert.equal(after.vs,"");assert.equal(after.depth,"outs");
   assert.equal(after.old.id,before.id);assert.equal(after.rows,before.rows);assert.deepEqual(after.filters,[false,false,false]);
   await p.evaluate(id=>openMatchNow(id),before.id);assert.deepEqual(await p.evaluate(()=>JSON.stringify(SHEET_LISTS.map(k=>S[k]))),before.rows);
  });
  await check("reload keeps the clear but never reuses a stale Undo snapshot",async p=>{
   await p.locator("[data-clear-point]").click();await p.reload();await p.evaluate(()=>set({tab:"tally"}));
   assert.ok(Object.values(await pointRows(p)).every(a=>a.length===0));
   assert.equal(await p.getByRole("button",{name:"Undo clear",exact:true}).isDisabled(),true);
  });
  await check("repeated Clear keeps Undo and the point controls stay in place",async p=>{
   const before=await pointRows(p);
   const positions=()=>p.locator("[aria-label='Point controls'] button").evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return [r.x,r.width];}));
   const layout=await positions();
   await p.locator("[data-clear-point]").click();
   await p.locator("[data-clear-point]").click();
   const undo=p.getByRole("button",{name:"Undo clear",exact:true});
   assert.equal(await undo.isEnabled(),true);assert.deepEqual(await positions(),layout);
   await undo.click();assert.deepEqual(await pointRows(p),before);
   assert.equal(await undo.isDisabled(),true);assert.deepEqual(await positions(),layout);
  });
  await check("a refused save retains Undo and says the clear was not saved",async p=>{
   const before=await pointRows(p);
   await p.evaluate(()=>{window._testSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===STORE_KEY)throw new DOMException("Full","QuotaExceededError");return _testSetItem.call(this,k,v);};});
   await p.locator("[data-clear-point]").click();
   assert.match(await p.locator("#root").innerText(),/not saved|Nothing you tap is being saved/i);
   await p.getByRole("button",{name:"Undo clear",exact:true}).click();assert.deepEqual(await pointRows(p),before);
   await p.evaluate(()=>{Storage.prototype.setItem=_testSetItem;save(S);});
  });
  for(const viewport of [{width:375,height:667},{width:390,height:844},{width:768,height:1024},{width:1024,height:768}])
  await check(`point controls fit ${viewport.width}x${viewport.height} and remain usable in each recording mode`,async p=>{
   for(const depth of ["full","outs","score"]){await p.evaluate(d=>setTallyDepth(d),depth);
    for(const sel of ["[data-clear-point]","[data-reset-match]"]){const b=p.locator(sel);await b.scrollIntoViewIfNeeded();const box=await b.boundingBox();assert.ok(box.width>=44&&box.height>=44);}
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await p.evaluate(()=>document.querySelector(".main").scrollWidth>document.querySelector(".main").clientWidth+1),false);
   }
   await p.evaluate(()=>setTallyDepth("full"));await p.locator("[data-clear-point]").click();
   const undo=p.getByRole("button",{name:"Undo clear",exact:true});await undo.scrollIntoViewIfNeeded();assert.ok((await undo.boundingBox()).height>=44);
   if(process.env.TALLY_RESET_SHOTS){fs.mkdirSync(process.env.TALLY_RESET_SHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.TALLY_RESET_SHOTS,`${viewport.width}x${viewport.height}.png`)});}
   await undo.click();assert.ok(Object.values(await pointRows(p)).some(a=>a.length));
  },viewport);
 }finally{await browser.close();await new Promise(r=>server.close(r));console.log(`\n${passed} PASS, ${failed} FAIL`);if(failed)process.exitCode=1;}
})();

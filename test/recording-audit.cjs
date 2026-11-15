"use strict";
// The recording audit of 12 Nov 2026: nothing is written onto the blank sheet,
// an observation follows the man through a two-phone merge, and a new sheet
// never inherits the team How did they get there was pointed at.
const assert=require("node:assert/strict"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function open(){const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});const p=await c.newPage();p.errors=[];
  p.on("pageerror",e=>p.errors.push(e.message));p.on("dialog",d=>d.accept());
  await p.goto(url);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.reload();
  await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;});return p;}
 async function check(name,fn){const pages=[];const page=async()=>{const p=await open();pages.push(p);return p;};
  try{await fn(page);for(const p of pages)assert.deepEqual(p.errors,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{for(const p of pages)await p.context().close();}}
 try{
  await check("a player observation is refused on the blank sheet, and the sheet stays blank",async page=>{
   const p=await page();
   await p.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"}});newMatch();markOut("us",S.roster[0].name);endPoint("us");freshMatch();});
   assert.equal(await p.evaluate(()=>matchVs()),"");
   const before=await p.evaluate(()=>(S.playerChecks||[]).length);
   for(const f of ["shooting","diving","alive"]){
    await p.evaluate(f=>{showNamedPlayer("us",S.roster[1].name);playerQuick(f,true);},f);
    assert.equal(await p.evaluate(()=>(S.playerChecks||[]).length),before,f+" wrote nothing");
   }
   assert.equal(await p.evaluate(()=>sheetEmpty(curMatch())),true);
   assert.match(await p.evaluate(()=>document.getElementById("root").innerText),/Who are you playing\?/i);
   await p.evaluate(()=>setPitTeam("right","Houston Heat"));
   assert.equal(await p.evaluate(()=>matchVs()),"Houston Heat","picking the team still names the blank sheet");
   assert.equal(await p.evaluate(()=>S.matches.filter(m=>!m.vs&&!m.watch).length),0,"no unnamed sheet is left behind");
  });
  for(const named of [true,false])
  await check("a two-phone merge keeps what the other phone saw of "+(named?"a named man":"a man nobody named"),async page=>{
   const A=await page(),B=await page();
   const first=await A.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"}});newMatch();logCall();return sheetPayload(S.matchId);});
   await B.evaluate(t=>{loadCopy("merge",t);openMatchNow(JSON.parse(t).sheet);set({tab:"tally"});},first);
   const chart=p=>p.evaluate(named=>{set({tab:"tally"});const b=curLayout().bunkers.filter(b=>b.x<60)[4];
    if(named){S.tallyStep="record";S.tallyMode="record";tallyTap([b.x,b.y]);setDraft({player:S.roster[0].name,alive:true,side:"us",sideSet:true});logBreakout();}
    else{tallyStepTo("place");tallyTap([b.x,b.y]);}
    return S.breakouts.filter(r=>r.m===S.matchId).length;},named);
   assert.equal(await chart(A),1);assert.equal(await chart(B),1);
   const bid=await B.evaluate(()=>S.breakouts.find(r=>r.m===S.matchId).id);
   await B.evaluate(id=>{showPlayerDetails(id);playerQuick("shooting",true);},bid);
   await B.waitForTimeout(400);await B.evaluate(()=>{playerQuick("diving",true);closePlayerDetails();});
   const back=await B.evaluate(()=>sheetPayload(S.matchId));
   const r=await A.evaluate(t=>{loadCopy("merge",t);const m=S.matchId,rows=S.breakouts.filter(r=>r.m===m),ids=new Set(rows.map(r=>r.id));
    const checks=S.playerChecks.filter(c=>c.m===m);
    return {rows:rows.length,checks:checks.length,orphans:checks.filter(c=>c.breakoutId&&!ids.has(c.breakoutId)).length,
     status:rows.map(r=>playerStatusText(r.side,r.player,r.id))};},back);
   assert.equal(r.rows,1,"the man is kept once");assert.equal(r.orphans,0,"no observation is bound to a row that is gone");
   assert.equal(r.checks,1);assert.match(r.status[0],/Shooting · Diving/,"what the other phone saw shows on this phone");
   const again=await A.evaluate(t=>{loadCopy("merge",t);return S.playerChecks.filter(c=>c.m===S.matchId).length;},back);
   assert.equal(again,1,"merging the same sheet again adds nothing");
  });
  await check("a new sheet against the next team does not keep the last team on How did they get there",async page=>{
   const p=await page();
   await p.evaluate(()=>{set({tab:"tally",right:{name:"San Diego Dynasty"}});newMatch();markOut("us",S.roster[0].name);endPoint("us");
    editProfile("right",{players:[{num:"7",name:"Dill",pos:"snake"}]});set({tab:"scout",scoutTab:"matchup"});openArrival("right",0);});
   const b=await p.evaluate(()=>curLayout().bunkers.filter(b=>b.x>90).slice(0,2).map(b=>b.id));
   await p.evaluate(id=>{pickArrivalBunker(id);logArrivalSighting();},b[0]);
   assert.equal(await p.evaluate(()=>S.arrivalSightings.length),1);
   await p.evaluate(()=>{setPitTeam("right","Houston Heat");newMatch();set({tab:"scout",scoutTab:"arrival"});});
   assert.equal(await p.evaluate(()=>matchVs()),"Houston Heat");
   assert.notEqual(await p.evaluate(()=>(S.arrival||{}).team||""),"San Diego Dynasty");
   await p.evaluate(id=>{pickArrivalBunker(id);logArrivalSighting();},b[1]);
   const r=await p.evaluate(()=>({vs:matchVs(),onNew:S.arrivalSightings.filter(s=>s.m===S.matchId).map(s=>s.team),sheets:S.matches.map(m=>m.vs)}));
   assert.equal(r.vs,"Houston Heat","the new sheet keeps its name");
   assert.ok(!r.onNew.includes("San Diego Dynasty"),"nothing of the last team is stamped on it");
  });
  await check("on a watched game both columns are the two teams by number, and none of his players is on the sheet",async page=>{
   const p=await page();
   await p.evaluate(()=>{set({tab:"more",more:"schedule"});watchGame(allGames()[0].id);set({tab:"tally"});});
   const r=await p.evaluate(()=>({home:curMatch().home,names:[...document.querySelectorAll("#root .who2 .assign__job")].map(e=>e.textContent.trim()),
    roster:S.roster.map(x=>x.name),text:document.querySelector("#root .who2").innerText}));
   assert.ok(r.names.length>=10&&r.names.every(n=>/^#\d+$/.test(n)),"every row is a number: "+r.names.join(","));
   for(const n of r.roster)assert.ok(!r.text.includes(n),n+" is not listed on a game he is not in");
   assert.ok(r.text.toUpperCase().includes(r.home.toUpperCase()),"the left column is named for the home side");
   await p.locator("#root .who2 .assign").first().click();
   assert.match(await p.locator("#player-details").innerText(),/#1/);
   for(const m of ["team","nexus"]){await p.evaluate(m=>{closePlayerDetails();set({tab:"more",more:m});},m);
    assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll("#root summary")].filter(e=>e.offsetParent&&e.getBoundingClientRect().height<44).map(e=>e.innerText)),[],"every fold on "+m+" is a full-size target");}
  });
  await check("the Scout field shares as a picture drawn on the phone, and the picture is never saved with the season",async page=>{
   const p=await page();const requests=[];p.on("request",r=>{if(!/^(data:|http:\/\/127\.0\.0\.1)/.test(r.url()))requests.push(r.url());});
   // Exercise the visible fallback deliberately. Windows Chromium supports
   // native file sharing; otherwise this test opens an OS sheet and waits for
   // an image the app correctly does not show. The native path is checked below.
   await p.evaluate(()=>Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>false}));
   await p.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"}});newMatch();set({tab:"scout",scoutTab:"matchup"});});
   const btn=p.locator("#root [data-field-pic]").first();await btn.scrollIntoViewIfNeeded();
   assert.ok((await btn.boundingBox()).height>=44);await btn.click();
   await p.waitForSelector("#field-pic img");
   const r=await p.evaluate(async()=>{const img=document.querySelector("#field-pic img");await img.decode();
    const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext("2d");g.drawImage(img,0,0);
    const d=g.getImageData(0,0,c.width,c.height).data;const seen=new Set();for(let i=0;i<d.length;i+=4*97)seen.add(d[i]+","+d[i+1]+","+d[i+2]);
    return {w:img.naturalWidth,h:img.naturalHeight,colours:seen.size,alt:img.alt,inSeason:JSON.stringify(S).includes("data:image/png"),stored:(localStorage.getItem("gridlock.coach.v2")||"").includes("data:image/png")};});
   assert.equal(r.w,1200);assert.ok(r.h>600);assert.ok(r.colours>=6,"the field is drawn in its colours, not a blank: "+r.colours);
   assert.match(r.alt,/Dynasty · .+ · counted from what was logged/);
   assert.equal(r.inSeason,false);assert.equal(r.stored,false,"the picture is not written into the season");
   assert.deepEqual(requests,[],"nothing is fetched or sent");
   await p.evaluate(()=>set({scoutTab:"breakouts"}));assert.equal(await p.locator("#field-pic").count(),0,"it leaves with the screen");
  });
  await check("the native picture share hands over a PNG, preserves the season and respects cancellation",async page=>{
   const p=await page();await p.evaluate(()=>{
    set({tab:"tally",right:{name:"Dynasty"}});newMatch();set({tab:"scout",scoutTab:"matchup"});
    window.__shared=[];window.__cancelShare=false;
    Object.defineProperty(navigator,"canShare",{configurable:true,value:data=>data.files.length===1&&data.files[0].type==="image/png"});
    Object.defineProperty(navigator,"share",{configurable:true,value:async data=>{window.__shared.push(data);if(window.__cancelShare)throw new DOMException("Cancelled","AbortError");}});
   });
   const before=await p.evaluate(()=>JSON.stringify({...localStorage}));
   await p.locator("#root [data-field-pic]").first().click();await p.waitForFunction(()=>__shared.length===1);
   const pic=await p.evaluate(async()=>{const x=__shared[0],f=x.files[0],bitmap=await createImageBitmap(f);const r={name:f.name,type:f.type,w:bitmap.width,h:bitmap.height,title:x.title};bitmap.close();return r;});
   assert.equal(pic.name,"gridlock-field-dynasty.png");assert.equal(pic.type,"image/png");assert.equal(pic.w,1200);assert.ok(pic.h>600);assert.match(pic.title,/Dynasty · .+ · counted from what was logged/);
   assert.equal(await p.locator("#field-pic").count(),0,"successful native sharing does not show the fallback");
   await p.evaluate(()=>{window.__cancelShare=true;});await p.locator("#root [data-field-pic]").first().click();await p.waitForFunction(()=>__shared.length===2);
   assert.equal(await p.locator("#field-pic").count(),0,"Cancel does not open another share surface");
   assert.equal(await p.evaluate(()=>JSON.stringify({...localStorage})),before,"sharing never saves the picture or changes the season");
  });
  await check("a man observed by name and then through his chart row keeps both observations as one",async page=>{
   const p=await page();
   await p.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"}});newMatch();showNamedPlayer("us",S.roster[0].name);playerQuick("shooting",true);closePlayerDetails();
    const b=curLayout().bunkers.filter(b=>b.x<60)[4];S.tallyStep="record";S.tallyMode="record";tallyTap([b.x,b.y]);setDraft({player:S.roster[0].name,alive:true});logBreakout();});
   const id=await p.evaluate(()=>S.breakouts.find(r=>r.m===S.matchId).id);
   await p.evaluate(id=>{showPlayerDetails(id);},id);await p.waitForTimeout(400);
   await p.evaluate(()=>{playerQuick("diving",true);closePlayerDetails();});
   const r=await p.evaluate(()=>({n:S.playerChecks.filter(c=>c.m===S.matchId).length,row:S.playerChecks.find(c=>c.m===S.matchId),status:playerStatusText("us",S.roster[0].name,S.breakouts.find(r=>r.m===S.matchId).id)}));
   assert.equal(r.n,1,"one observation for the man");assert.equal(r.row.shooting,true,"what was seen first is kept");assert.equal(r.row.diving,true);
   assert.match(r.status,/Shooting · Diving/);
  });
  await check("a merge folds the other phone's observation into this phone's own on the same man, hiding neither",async page=>{
   const A=await page(),B=await page();
   const first=await A.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"}});newMatch();logCall();return sheetPayload(S.matchId);});
   await B.evaluate(t=>{loadCopy("merge",t);openMatchNow(JSON.parse(t).sheet);set({tab:"tally"});},first);
   const chart=p=>p.evaluate(()=>{set({tab:"tally"});const b=curLayout().bunkers.filter(b=>b.x<60)[4];S.tallyStep="record";S.tallyMode="record";tallyTap([b.x,b.y]);
    setDraft({player:S.roster[0].name,alive:true,side:"us",sideSet:true});logBreakout();return S.breakouts.find(r=>r.m===S.matchId).id;});
   const aid=await chart(A),bid=await chart(B);
   await A.evaluate(id=>{showPlayerDetails(id);playerQuick("diving",true);closePlayerDetails();},aid);
   await B.evaluate(id=>{showPlayerDetails(id);playerQuick("shooting",true);closePlayerDetails();},bid);
   const back=await B.evaluate(()=>sheetPayload(S.matchId));
   const r=await A.evaluate(t=>{loadCopy("merge",t);const m=S.matchId,rows=S.breakouts.filter(r=>r.m===m),ids=new Set(rows.map(r=>r.id)),checks=S.playerChecks.filter(c=>c.m===m);
    return {rows:rows.length,checks:checks.length,orphans:checks.filter(c=>c.breakoutId&&!ids.has(c.breakoutId)).length,status:playerStatusText(rows[0].side,rows[0].player,rows[0].id)};},back);
   assert.equal(r.rows,1);assert.equal(r.orphans,0);assert.equal(r.checks,1,"one observation for the man");
   assert.match(r.status,/Shooting/,"what the other phone saw is there");assert.match(r.status,/Diving/,"and what this phone saw is not hidden");
  });
  await check("a field picture that cannot be made says so",async page=>{
   const p=await page();
   await p.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"}});newMatch();set({tab:"scout",scoutTab:"matchup",flash:""});
    HTMLCanvasElement.prototype.toBlob=function(cb){cb(null);};HTMLCanvasElement.prototype.toDataURL=function(){throw new Error("tainted");};});
   await p.locator("#root [data-field-pic]").first().click();await p.waitForTimeout(600);
   assert.match(await p.evaluate(()=>S.flash||""),/could not make the picture/);assert.equal(await p.locator("#field-pic").count(),0);
  });
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} recording audit checks passed.`);if(failed)process.exit(1);
})();

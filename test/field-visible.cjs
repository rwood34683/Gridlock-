"use strict";
// Keep the actual field on screen, not merely present somewhere below a roster.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),{createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"..")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port,browser=await chromium.launch(launchOptions());
 const out=path.resolve("work/field-visible");fs.mkdirSync(out,{recursive:true});let passed=0,failed=0;const evidence=[];
 async function check(name,vp,fn){const c=await browser.newContext({viewport:vp,hasTouch:true,serviceWorkers:"block"}),p=await c.newPage(),errors=[];
  p.setDefaultTimeout(5000);p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);}
  catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}}
 async function coach(p){await p.goto(base+"/web/");await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.reload();await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;S.tips={...S.tips,tally:false,scout:false};});}
 async function player(p){await p.goto(base+"/teasers/player/");await p.locator("#joinCode").fill("IMPACT-7QX2");await p.locator("#joinGo").click();}
 async function field(p,selector,name){await p.waitForFunction(selector=>{const e=document.querySelector(selector);if(!e)return false;const b=e.getBoundingClientRect(),m=document.querySelector(".main")?.getBoundingClientRect();return b.width>=170&&b.height>=170&&b.top>=(m?.top||0)&&b.bottom<=(m?.bottom||innerHeight)+1;},selector,{timeout:5000});const r=await p.locator(selector).evaluate(e=>{const b=e.getBoundingClientRect(),m=document.querySelector(".main")?.getBoundingClientRect();return {top:b.top,bottom:b.bottom,width:b.width,height:b.height,ceiling:m?.top||0,floor:m?.bottom||innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert(r.width>=170&&r.height>=170,name+": usable field size "+JSON.stringify(r));assert(r.top>=r.ceiling&&r.bottom<=r.floor+1,name+": whole field visible "+JSON.stringify(r));assert.equal(r.overflow,false,name+": no sideways scroll");
  evidence.push({name,...r});await p.screenshot({path:path.join(out,name+".png")});
 }
 try{
 await check("Scout's recording and history views keep one field visible",{width:375,height:667},async p=>{
  await coach(p);await p.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"}});newMatch();});
  for(const view of ["breakouts","layers","games","board"]){await p.evaluate(v=>set({tab:"scout",scoutTab:v}),view);assert.equal(await p.locator(".main .field-wrap svg").count(),1);await field(p,".main .field-wrap svg","coach-scout-"+view);}
  await p.evaluate(()=>{S.left={};S.right={};openSheet({vs:""});});
  for(const view of ["breakouts","layers"]){await p.evaluate(v=>set({tab:"scout",scoutTab:v}),view);assert.equal(await p.locator(".main .field-wrap svg").count(),1);await field(p,".main .field-wrap svg","coach-scout-empty-"+view);}
 });
 await check("Player field taps stay on the intended bunker after choosing a team",{width:1024,height:768},async p=>{
  await player(p);await p.evaluate(()=>setMode("scout"));
  // On the coach-style Player flow a blank Scout field sends the player to
  // this picker. Follow the real path, then tap again without waiting for an
  // animation. The older preview opens its picker directly.
  const ids=await p.evaluate(()=>BUN.filter(b=>b.x>90).slice(0,2).map(b=>b.id));
  const tap=async id=>{const at=await p.locator('#field [data-bid="'+id+'"]').evaluate(e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});await p.touchscreen.tap(at.x,at.y);};
  const coachStyle=await p.evaluate(()=>typeof cpScoutTap==='function');if(coachStyle)await tap(ids[0]);
  await p.locator('#sideR .pickSel').selectOption({index:1});
  if(coachStyle){await tap(ids[0]);assert.deepEqual(await p.evaluate(()=>cpTheirPick.slice()),[ids[0]]);}
  await p.evaluate(()=>setMode("tally"));await field(p,"#field","player-tablet-after-picker");
  for(const id of ids){await tap(id);assert.equal(String(await p.evaluate(()=>typeof cpDraft!=="undefined" ? cpDraft?.bid : tallySel)),id);}
 });
 for(const [width,height] of [[375,667],[390,844],[768,1024],[1024,768]]){const vp={width,height},size=width+"x"+height;
  await check("Coach blank Tally and Scout show the field at "+size,vp,async p=>{
   await coach(p);await p.evaluate(()=>{S.left={};S.right={};openSheet({vs:""});set({tab:"tally",tallyDepth:"full"});});
   await field(p,"#tally-map svg","coach-tally-blank-"+size);
   const before=await p.evaluate(()=>[S.breakouts.length,S.tally.length,S.results.length]);
   await p.locator("#tally-map svg").click({position:{x:60,y:60}});
   assert.deepEqual(await p.evaluate(()=>[S.breakouts.length,S.tally.length,S.results.length]),before,"blank field does not write unnamed records");
   await p.evaluate(()=>set({tab:"scout",scoutTab:"matchup"}));await field(p,".field-wrap svg","coach-scout-blank-"+size);
   await p.getByRole("button",{name:"Choose teams",exact:true}).click();assert(await p.locator(".pits").isVisible());
   assert.equal(await p.locator(".pit__name").evaluateAll(es=>es.filter(e=>/Pick a team/.test(e.textContent)).length),2);
  });
  await check("Coach active fields precede team cards and preserve the sheet at "+size,vp,async p=>{
   await coach(p);await p.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"},tallyDepth:"full"});newMatch();markOut("us",S.roster[0].name);});
   const before=await p.evaluate(()=>({id:S.matchId,tally:S.tally,results:S.results,point:S.point}));
   await field(p,"#tally-map svg","coach-tally-active-"+size);
   await p.evaluate(()=>set({tab:"scout",scoutTab:"matchup"}));await field(p,".field-wrap svg","coach-scout-active-"+size);
   assert(await p.locator(".pits").evaluate(e=>e.getBoundingClientRect().top>document.querySelector(".field-wrap").getBoundingClientRect().bottom));
   await p.getByRole("button",{name:"Team details",exact:true}).click();
   await p.evaluate(()=>set({tab:"tally"}));
   await field(p,"#tally-map svg","coach-tally-return-"+size);
   assert.deepEqual(await p.evaluate(()=>({id:S.matchId,tally:S.tally,results:S.results,point:S.point})),before);
  });
  await check("Player Tally and Scout fit before and after choosing teams at "+size,vp,async p=>{
   await player(p);await p.locator('.tabs [data-m="tally"]').click();await field(p,"#field","player-tally-"+size);
   await p.locator('.tabs [data-m="scout"]').click();await field(p,"#field","player-scout-blank-"+size);
   for(const sel of await p.locator(".pickSel").all()){const value=await sel.locator("option").evaluateAll(es=>es.find(e=>e.value).value);await sel.selectOption(value);}
   const selections=await p.evaluate(()=>[Lsel,Rsel]);await p.locator('.tabs [data-m="tally"]').click();await p.locator('.tabs [data-m="scout"]').click();
   await field(p,"#field","player-scout-selected-"+size);
   assert(await p.locator("#topScout").evaluate(e=>e.getBoundingClientRect().top>document.getElementById("field").getBoundingClientRect().bottom));
   await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));assert(await p.evaluate(()=>scrollY>100));
   await p.evaluate(()=>setMode("tally"));await field(p,"#field","player-tally-return-"+size);
   assert.deepEqual(await p.evaluate(()=>[Lsel,Rsel]),selections,"returning to the field never resets either team");
   const bunker=p.locator('#field [data-bid]').first(),id=await bunker.getAttribute('data-bid');await bunker.click();
   const selected=await p.evaluate(()=>typeof cpDraft!=="undefined" ? cpDraft?.bid : tallySel);
   assert.equal(String(selected),id,"a tap selects the intended bunker after fitting");
  });
 }
 await check("compact Tally keeps a reference field without restoring detailed controls",{width:390,height:844},async p=>{
  await coach(p);await p.evaluate(()=>{set({tab:"tally",right:{name:"Dynasty"}});newMatch();markOut("us",S.roster[0].name);});
  const before=await p.evaluate(()=>S.tally);for(const depth of ["score","outs"]){await p.evaluate(d=>setTallyDepth(d),depth);assert.equal(await p.locator("#tally-map").count(),0);await field(p,"#tally-field-reference svg","coach-"+depth);assert.deepEqual(await p.evaluate(()=>S.tally),before);}
 });
 await check("typed opponent remains reachable and names the same blank sheet",{width:375,height:667},async p=>{
  await coach(p);await p.evaluate(()=>{S.left={};S.right={};openSheet({vs:""});set({tab:"tally",tallyDepth:"full"});});const id=await p.evaluate(()=>S.matchId);
  await p.getByRole("button",{name:"Team not listed? Type their name",exact:true}).click();await p.locator("#oppName").fill("Field test team");await p.getByRole("button",{name:"Play them",exact:true}).click();
  assert.equal(await p.evaluate(()=>matchVs()),"Field test team");assert.equal(await p.evaluate(()=>S.matchId),id);
 });
 }finally{fs.writeFileSync(path.join(out,"evidence.json"),JSON.stringify(evidence,null,2));await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} field visibility checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

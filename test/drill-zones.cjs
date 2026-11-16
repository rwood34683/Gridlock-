"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());
 const shots=path.resolve("work/drill-zones");fs.mkdirSync(shots,{recursive:true});let passed=0,failed=0;
 async function check(name,run,viewport={width:390,height:844}){
  const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[],external=[];
  p.setDefaultTimeout(6000);p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  p.on("request",r=>{if(!r.url().startsWith(url)&&!r.url().startsWith("data:"))external.push(r.url());});
  try{
   await p.goto(url);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify({...seed,fmtAsk:false,fmtDone:true,tab:"more",more:"walk"}));},SEED);await p.reload();
   await run(p);assert.deepEqual(errors,[],"no page errors");assert.deepEqual(external,[],"no network sends");passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}
 }
 const data=p=>p.evaluate(()=>JSON.parse(copyPayload("all")).data);
 const show=p=>p.getByRole("button",{name:"Show drill zones",exact:true}).click();
 try{
  await check("zones start off; showing and hiding them preserves the entire season",async p=>{
   const before=await data(p);assert.equal(await p.locator(".walk-drill-zones").count(),0);
   await show(p);assert.deepEqual(await p.locator(".walk-drill-zones text").allTextContents(),["Q1","Q2","Q3","Q4"]);
   assert.equal(await p.getByRole("button",{name:"Hide drill zones"}).getAttribute("aria-expanded"),"true");
   assert.deepEqual(await data(p),before);await p.getByRole("button",{name:"Hide drill zones"}).click();
   assert.equal(await p.locator(".walk-drill-zones").count(),0);assert.deepEqual(await data(p),before);
  });
  await check("quadrants use fixed field ends and do not move or resize any bunker",async p=>{
   const before=await p.evaluate(()=>JSON.stringify(curLayout().bunkers));await show(p);
   for(const [id,name,x,y] of [["q1","Q1 · Left dorito",1,1],["q2","Q2 · Right dorito",151,1],["q3","Q3 · Left snake",1,121],["q4","Q4 · Right snake",151,121]]){
    await p.locator("#walk-drill-area").selectOption(id);assert.equal(await p.locator("#wkWhere").inputValue(),name);
    assert.deepEqual(await p.locator(".walk-drill-focus").evaluate(e=>["x","y","width","height"].map(k=>Number(e.getAttribute(k)))),[x,y,148,118]);
    assert.equal(await p.evaluate(()=>JSON.stringify(curLayout().bunkers)),before);
   }
   assert.equal(await p.evaluate(()=>{curMatch().end="right";curMatch().swapEnds=false;render();return ourEnd();}),"right");
   assert.equal(await p.locator("#walk-drill-area").inputValue(),"q4");
   assert.equal(await p.locator(".walk-drill-focus").getAttribute("x"),"151");
  });
  await check("unfinished notes survive zone focus and hiding; bunker taps still work",async p=>{
   const draft="Two players hold this lane <b>without losing this draft</b>";await p.locator("#wkNote").fill(draft);
   await show(p);await p.locator("#walk-drill-area").selectOption("q3");assert.equal(await p.locator("#wkNote").inputValue(),draft);
   await p.locator("#walk-map svg").scrollIntoViewIfNeeded();
   const target=await p.locator("#walk-map svg").evaluate(svg=>{const b=curLayout().bunkers.find(b=>b.x>15&&b.x<65&&b.y>15&&b.y<100);const pt=svg.createSVGPoint();pt.x=b.x*2;pt.y=b.y*2;const at=pt.matrixTransform(svg.getScreenCTM());return {id:b.id,x:at.x,y:at.y};});
   await p.mouse.click(target.x,target.y);assert.equal(await p.evaluate(()=>walkPickedBunker()?.id),target.id);
   assert.equal(await p.locator("#wkNote").inputValue(),draft);
   await p.getByRole("button",{name:"Hide drill zones"}).click();assert.equal(await p.locator("#wkNote").inputValue(),draft);
  });
  await check("drill notes use the existing season copy and survive replacement and reload",async p=>{
   const before=await data(p);await show(p);await p.locator("#walk-drill-area").selectOption("q2");
   const note="Hold the gap for 20 seconds <b>then switch</b>";await p.locator("#wkNote").fill(note);await p.getByRole("button",{name:"Add note",exact:true}).click();
   const copy=await p.evaluate(()=>copyPayload("all")),parsed=JSON.parse(copy);assert.equal(await p.evaluate(d=>copyDataError(d),parsed.data),"");
   for(const key of ["matches","results","tally","breakouts","playerChecks"])assert.deepEqual(parsed.data[key],before[key],key+" unchanged");
   assert(!Object.keys(parsed.data).some(k=>/drill/i.test(k)),"display state never enters the season copy");
   assert.equal(await p.evaluate(copy=>loadCopy("replace",copy),copy),true);await p.reload();await p.evaluate(()=>set({tab:"more",more:"walk"}));
   assert.equal(await p.locator(".walk-drill-zones").count(),0,"reload starts without a training overlay");
   assert.match(await p.locator(".main").innerText(),/Q2 · Right dorito/);assert((await p.locator(".main").innerText()).includes(note));
   assert.equal(await p.locator(".assign__job b").count(),0,"note text is not HTML");
  });
  await check("custom fields use the same zones; switching layouts starts without the overlay",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"nexus"}));await p.locator("#field-name").fill("Drill test field");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const key=await p.evaluate(()=>{const key=S.fieldEdit.key;for(const at of [[20,20],[40,40],[60,60],[25,90]])fieldTap(at);fieldDone();return key;});
   await p.evaluate(key=>set({tab:"more",more:"walk",layoutKey:key}),key);assert.equal(await p.locator(".walk-drill-zones").count(),0);await show(p);
   assert.equal(await p.locator(".walk-drill-zones text").count(),4);assert.equal(await p.locator("#walk-map .bnk").count(),8);
   await p.evaluate(()=>set({layoutKey:"lso"}));assert.equal(await p.locator(".walk-drill-zones").count(),0);
  });
  await check("practice overlay stays out of match screens and never changes the score",async p=>{
   const before=await data(p);await show(p);await p.locator("#walk-drill-area").selectOption("q1");
   for(const tab of ["tally","scout","playbook","sightlines"]){await p.evaluate(tab=>set({tab,more:null}),tab);assert.equal(await p.locator(".walk-drill-zones").count(),0);assert.deepEqual(await data(p),before);}
  });
  for(const [width,height] of [[390,844],[768,1024],[1024,768],[1366,900]])await check("zones fit with labelled 44px controls at "+width+"x"+height,async p=>{
   await show(p);await p.locator("#walk-drill-area").selectOption("q1");
   for(const selector of ["#walk-drill-area",'button[aria-controls="walk-drill-controls"]']){
    const rect=await p.locator(selector).boundingBox();assert(rect.height>=44,"44px control "+selector);assert(rect.x>=0&&rect.x+rect.width<=width,"control fits");
   }
   assert.equal(await p.getByLabel("Drill area",{exact:true}).count(),1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await p.locator("#walk-map").scrollIntoViewIfNeeded();await p.screenshot({path:path.join(shots,width+"x"+height+".png")});
  },{width,height});
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} drill zone checks passed.`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exit(1);});

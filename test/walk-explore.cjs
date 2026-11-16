"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),SEED=require("../scripts/seed");
(async()=>{
 const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 const shots=path.resolve("work/walk-explore");fs.mkdirSync(shots,{recursive:true});
 async function check(name,run,viewport={width:390,height:844}){
  const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[],external=[];
  p.setDefaultTimeout(6500);p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  p.on("request",r=>{if(new URL(r.url()).origin!==new URL(process.env.APP_URL).origin&&!r.url().startsWith("data:"))external.push(r.url());});
  try{
   await p.goto(process.env.APP_URL);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify({...seed,fmtAsk:false,fmtDone:true,tab:"more",more:"walk"}));},SEED);await p.reload();
   await run(p);assert.deepEqual(errors,[],"no page errors");assert.deepEqual(external,[],"no outside requests");passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}
 }
 const open=p=>p.getByRole("button",{name:"Explore field",exact:true}).click();
 const data=p=>p.evaluate(()=>JSON.parse(copyPayload("all")).data);
 const action=(p,name)=>p.getByRole("button",{name,exact:true}).click();
 const target=p=>p.locator("#walk-map svg.field").evaluate(svg=>{
  const b=curLayout().bunkers.find(b=>b.x>45&&b.x<85&&b.y>35&&b.y<85),pt=svg.createSVGPoint();pt.x=b.x*2;pt.y=b.y*2;
  const at=pt.matrixTransform((svg.querySelector("#walk-scene")||svg).getScreenCTM());return {id:b.id,x:at.x,y:at.y};
 });
 try{
  await check("Walk starts still; controls neither change geometry nor save the season",async p=>{
   assert.equal(await p.locator("#walk-scene").count(),0);assert.equal(await p.evaluate(()=>_walkFrame),0);
   const before=await data(p),geom=await p.evaluate(()=>JSON.stringify(curLayout().bunkers)),shapes=await p.locator("#walk-map .bnk").evaluateAll(bs=>bs.map(b=>b.outerHTML));await open(p);
   const local=await p.evaluate(()=>localStorage.getItem("gridlock.coach.v2"));
   for(const name of ["Right ↷","↶ Left","Zoom in","Zoom out","Tilt view","Whole field"])await action(p,name);
   assert.deepEqual(await data(p),before);assert.equal(await p.evaluate(()=>JSON.stringify(curLayout().bunkers)),geom);
   assert.equal(await p.evaluate(()=>localStorage.getItem("gridlock.coach.v2")),local,"camera never writes to local storage");
   assert.match(await p.locator(".main").innerText(),/bunker heights are not shown/);
   assert.equal(await p.locator("#walk-map .bnk").count(),await p.evaluate(()=>curLayout().bunkers.length));
   assert.deepEqual(await p.locator("#walk-map .bnk").evaluateAll(bs=>bs.map(b=>b.outerHTML)),shapes,"the exact measured drawing is reused");
  });
  await check("rotated, tilted and zoomed taps pick the actual bunker and retain the note draft",async p=>{
   await p.locator("#wkNote").fill("Remember this gap");await open(p);await action(p,"Right ↷");await action(p,"Tilt view");await action(p,"Zoom in");
   await p.locator("#walk-map").scrollIntoViewIfNeeded();const b=await target(p);await p.mouse.click(b.x,b.y);
   assert.equal(await p.evaluate(()=>walkPickedBunker()?.id),b.id);assert.equal(await p.locator("#wkNote").inputValue(),"Remember this gap");
   await action(p,"Focus bunker");assert.equal(await p.evaluate(()=>_walkView.focus),b.id);
   assert.equal(await p.evaluate(()=>_walkView.zoom),2);await action(p,"Close explore");assert.equal(await p.locator("#wkNote").inputValue(),"Remember this gap");
   await action(p,"Add note");await p.reload();assert.match(await p.locator(".main").innerText(),/Remember this gap/);
   assert.equal(await p.locator("#walk-scene").count(),0,"camera is not saved");
  });
  await check("saved team bunker names and literal notes stay attached after focusing",async p=>{
   const picked=await p.evaluate(()=>{const b=curLayout().bunkers[4];S.bunkerCalls={...S.bunkerCalls,[S.layoutKey]:{[b.id]:"Rocket"}};render();return {id:b.id,where:walkWhereOf(b)};});
   await p.locator("#wkWhere").selectOption(picked.where);await p.locator("#wkNote").fill("<b>Hold the wire</b>");await action(p,"Add note");
   await open(p);await p.locator("#wkWhere").selectOption(picked.where);await action(p,"Focus bunker");await action(p,"Right ↷");
   assert.match(await p.locator("#walk-stickies").innerText(),/<b>Hold the wire<\/b>/);assert.equal(await p.locator(".wnote__text b").count(),0);
   const r=await p.locator("#walk-stickies").boundingBox(),box=await p.locator("#walk-map").boundingBox();
   assert(r.x>=box.x&&r.x+r.width<=box.x+box.width+1&&r.y>=box.y&&r.y+r.height<=box.y+box.height+1);
   assert.equal(await p.evaluate(()=>walkPickedBunker().id),picked.id);
   assert.match(await p.locator("#walk-stickies .wstick__head").innerText(),/Rocket/);assert.match(await p.locator("#walk-scene").textContent(),/Rocket/);
   await p.locator("#wkNote").fill("A second note still being written");await action(p,"Close the notes");assert.equal(await p.locator("#wkNote").inputValue(),"A second note still being written");
  });
  await check("dragging turns the view without selecting or recording a player",async p=>{
   const before=await data(p);await open(p);await p.locator("#walk-map").scrollIntoViewIfNeeded();const b=await target(p);
   await p.mouse.move(b.x,b.y);await p.mouse.down();await p.mouse.move(b.x+55,b.y+2,{steps:6});await p.mouse.up();
   assert.equal(await p.evaluate(()=>S.walkPick),null);assert(await p.evaluate(()=>_walkView.angle>0));assert.deepEqual(await data(p),before);
  });
  await check("keyboard controls zoom and turn; Home fits, Escape stops the tour",async p=>{
   await open(p);const field=p.locator("#walk-map svg.field");await field.focus();await p.keyboard.press("ArrowRight");await p.keyboard.press("ArrowUp");
   assert.equal(await p.evaluate(()=>_walkView.angle),15);assert.equal(await p.evaluate(()=>_walkView.zoom),1.25);
   await p.keyboard.press("Home");assert.equal(await p.evaluate(()=>_walkView.angle),0);assert.equal(await p.evaluate(()=>_walkView.zoom),1);
   await action(p,"Start tour");assert(await p.evaluate(()=>!!_walkFrame));await p.keyboard.press("Escape");assert.equal(await p.evaluate(()=>_walkFrame),0);
   assert.equal(await p.getByRole("button",{name:"Start tour",exact:true}).count(),1);
  });
  await check("tour reuses the field, never renders or saves per frame, and stops on exit",async p=>{
   await open(p);const before=await data(p);await action(p,"Start tour");
   await p.evaluate(()=>{window.__walkCounts={render:0,save:0};window.__walkNode=document.getElementById("walk-scene");const r=render,s=save;render=(...a)=>{__walkCounts.render++;return r(...a);};save=(...a)=>{__walkCounts.save++;return s(...a);};});
   await p.waitForTimeout(750);
   assert.deepEqual(await p.evaluate(()=>__walkCounts),{render:0,save:0});assert(await p.evaluate(()=>__walkNode===document.getElementById("walk-scene")));
   assert(await p.evaluate(()=>_walkView.angle>0));assert.deepEqual(await data(p),before);
   await p.evaluate(()=>set({tab:"tally"}));assert.equal(await p.evaluate(()=>_walkFrame),0);assert.equal(await p.locator("#walk-scene").count(),0);
   await p.evaluate(()=>set({tab:"more",more:"walk"}));assert.equal(await p.locator("#walk-scene").count(),0);
  });
  await check("tour ends after one turn, blur stops it, and reduced motion keeps it manual",async p=>{
   await open(p);await action(p,"Start tour");await p.evaluate(()=>{cancelAnimationFrame(_walkFrame);_walkView.tour.start=1;walkTourFrame(45001);});
   assert.equal(await p.evaluate(()=>_walkFrame),0);await action(p,"Start tour");await p.evaluate(()=>dispatchEvent(new Event("blur")));assert.equal(await p.evaluate(()=>_walkFrame),0);
   await action(p,"Start tour");await p.emulateMedia({reducedMotion:"reduce"});await p.waitForFunction(()=>!_walkFrame);
   assert(await p.getByRole("button",{name:"Start tour",exact:true}).isDisabled());await action(p,"Right ↷");assert.equal(await p.evaluate(()=>_walkFrame),0);
   assert.match(await p.locator(".main").innerText(),/reduced-motion/);
  });
  await check("camera and tour reset on layout, account and replaced season",async p=>{
   await open(p);await action(p,"Start tour");await p.evaluate(()=>set({layoutKey:"nxlwc26"}));
   assert.equal(await p.evaluate(()=>_walkFrame),0);assert.equal(await p.locator("#walk-scene").count(),0);
   await open(p);await action(p,"Start tour");await p.evaluate(()=>{S.email="another-test@example.test";render();});assert.equal(await p.evaluate(()=>_walkFrame),0);assert.equal(await p.locator("#walk-scene").count(),0);
   await open(p);await action(p,"Start tour");assert.equal(await p.evaluate(()=>loadCopy("replace",copyPayload("all"))),true);assert.equal(await p.evaluate(()=>_walkFrame),0);
  });
  await check("custom fields and drill zones use unchanged footprints in Explore",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"nexus"}));await p.locator("#field-name").fill("Walk test field");await action(p,"+ Build a field");
   const key=await p.evaluate(()=>{const key=S.fieldEdit.key;for(const at of [[20,20],[40,40],[60,60],[25,90]])fieldTap(at);fieldDone();set({tab:"more",more:"walk",layoutKey:key});return key;});
   const geometry=await p.evaluate(()=>JSON.stringify(curLayout().bunkers));await open(p);await action(p,"Show drill zones");await p.locator("#walk-drill-area").selectOption("q2");await action(p,"Tilt view");
   assert.equal(await p.locator("#walk-scene .bnk").count(),8);assert.equal(await p.locator("#walk-scene .walk-drill-zones text").count(),4);
   assert.equal(await p.evaluate(()=>JSON.stringify(curLayout().bunkers)),geometry);assert.equal(await p.evaluate(()=>S.layoutKey),key);
  });
  await check("camera has bounded zoom and is discoverable from tool search",async p=>{
   await p.evaluate(()=>set({tab:"more",more:null}));await p.locator("#tool-find").fill("tour");await p.locator('[data-tool="walk"]').click();await open(p);
   await p.evaluate(()=>{for(let i=0;i<30;i++)walkCamera("in");});assert.equal(await p.evaluate(()=>_walkView.zoom),3);
   await p.evaluate(()=>{for(let i=0;i<30;i++)walkCamera("out");});assert.equal(await p.evaluate(()=>_walkView.zoom),1);
  });
  await check("vertical scroll and cancelled multi-touch never select a bunker",async p=>{
   await open(p);await p.locator("#walk-map").scrollIntoViewIfNeeded();const b=await target(p);
   await p.mouse.move(b.x,b.y);await p.mouse.down();await p.mouse.move(b.x+2,b.y+50,{steps:5});await p.mouse.up();
   assert.equal(await p.evaluate(()=>_walkView.angle),0);assert.equal(await p.evaluate(()=>S.walkPick),null);
   await p.locator('#walk-scene [data-pick]').evaluate((el,b)=>{
    const send=(type,id,primary)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,isPrimary:primary,pointerType:"touch",clientX:b.x,clientY:b.y}));
    send("pointerdown",1,true);send("pointerdown",2,false);send("pointerup",2,false);send("pointercancel",1,true);
   },b);
   assert.equal(await p.evaluate(()=>S.walkPick),null);assert.equal(await p.evaluate(()=>_walkGesture),null);
  });
  for(const [width,height] of [[320,667],[390,844],[768,1024],[1024,768]])await check("Explore fits with named 44px controls at "+width+"x"+height,async p=>{
   await open(p);await action(p,"Right ↷");await action(p,"Tilt view");
   for(const b of await p.locator("#walk-explore-controls button").all()){
    const r=await b.boundingBox();assert(r.height>=44&&r.width>=44,"44px control");assert(r.x>=0&&r.x+r.width<=width+1,"control inside screen");
    assert((await b.getAttribute("aria-label"))||(await b.innerText()).trim(),"accessible name");
   }
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await p.locator("#walk-map").scrollIntoViewIfNeeded();await p.screenshot({path:path.join(shots,width+"x"+height+".png")});
  },{width,height});
 }finally{await browser.close();}
 console.log(`${passed}/${passed+failed} field exploration checks passed.`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exit(1);});

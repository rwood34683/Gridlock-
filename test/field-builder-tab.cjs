"use strict";
// More › Field builder (owner, 16 Nov 2026): the builder from Account &
// backups › Events on a menu row of its own. Same builder, same rules.
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),SEED=require("../scripts/seed");
(async()=>{
 const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,run,viewport={width:390,height:844}){
  const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[];
  p.setDefaultTimeout(6500);p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{
   await p.goto(process.env.APP_URL);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify({...seed,fmtAsk:false,fmtDone:true,tab:"more",more:null}));},SEED);await p.reload();
   await run(p);assert.deepEqual(errors,[],"no page errors");passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}
 }
 const root=p=>p.locator("#root").innerText();
 try{
  await check("Field builder is a More row before the game, found by search, with help",async p=>{
   const rows=await p.evaluate(()=>MORE_GROUPS[0][1].map(r=>r[0]));
   assert.equal(rows[rows.indexOf("walk")+1],"fields","right after Walk");
   await p.getByLabel("Find a tool").fill("layout");
   assert.match(await p.locator("#tool-menu .list__row:visible").first().innerText(),/Field builder/);
   await p.locator("#tool-menu .list__row:visible").filter({hasText:"Field builder"}).click();
   assert.equal(await p.evaluate(()=>S.more),"fields");
   assert.match(await root(p),/\+ Build a field/);assert.match(await root(p),/No fields of your own yet/);
   assert.ok(await p.evaluate(()=>!!HELP["more/fields"]),"help entry");
   assert.equal(await p.evaluate(()=>gateKey()),null,"free, like every field screen");
  });
  await check("building from the row makes a field that plays, and Account & backups still lists it",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Home park");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   assert.equal(await p.locator("#fieldbuild-map").count(),1,"builder open on this screen");
   const key=await p.evaluate(()=>S.fieldEdit.key);
   await p.locator("#fieldbuild-map").scrollIntoViewIfNeeded();
   const at=await p.locator("#fieldbuild-map svg").evaluate(svg=>{const pt=svg.createSVGPoint();pt.x=40;pt.y=120;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};});
   await p.mouse.click(at.x,at.y);
   assert.equal(await p.evaluate(k=>fieldOf(k).bunkers.length,key),2,"a real tap places a bunker and its twin across the fifty");
   // The other seven by data, so the test reads the row's own Use / Edit, not tap geometry.
   await p.evaluate(k=>{S.fields=S.fields.map(f=>f.key===k?{...f,bunkers:[...f.bunkers,...Array.from({length:6},(_,i)=>({id:"t"+i,k:"md",x:30+i*6,y:12+i*14}))]}:f);registerFields();render();},key);
   await p.getByRole("button",{name:"Done",exact:true}).click();
   assert.equal(await p.evaluate(()=>S.more),"fields","Done stays on Field builder");
   await p.getByRole("button",{name:"Use this field",exact:true}).click();
   assert.equal(await p.evaluate(()=>S.layoutKey),key,"Use this field puts it on every tab");
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   assert.match(await p.locator(".assign").filter({hasText:"Home park"}).innerText(),/ON/);
   await p.getByRole("button",{name:"Edit",exact:true}).click();assert.equal(await p.locator("#fieldbuild-map").count(),1);
   await p.evaluate(()=>set({more:"nexus"}));assert.match(await root(p),/Home park/,"still listed under Events");
  });
  await check("Undo takes back the last change and Clear all empties the field, Undo bringing it back",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Undo park");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const key=await p.evaluate(()=>S.fieldEdit.key),n=()=>p.evaluate(k=>fieldOf(k).bunkers.length,key);
   const tap=async(x,y)=>{await p.locator("#fieldbuild-map").scrollIntoViewIfNeeded();const at=await p.locator("#fieldbuild-map svg").evaluate((svg,[x,y])=>{const pt=svg.createSVGPoint();pt.x=x;pt.y=y;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);await p.mouse.click(at.x,at.y);};
   const btn=name=>p.getByRole("button",{name,exact:true});
   await btn("↶ Undo").click();assert.match(await root(p),/Nothing to undo yet/);
   await tap(40,120);assert.equal(await n(),2);await tap(30,60);assert.equal(await n(),4);
   const ids=await p.evaluate(k=>fieldOf(k).bunkers.map(b=>b.id),key);
   await btn("↶ Undo").click();assert.equal(await n(),2,"undo takes off the last bunker and its twin");
   await tap(30,60);const again=await p.evaluate(k=>fieldOf(k).bunkers.map(b=>b.id),key);
   assert.ok(!again.slice(2).some(id=>ids.slice(2).includes(id)),"an undone bunker's id is never handed out again");
   assert.equal(await btn("Clear all").isDisabled(),false);
   await btn("Clear all").click();assert.equal(await n(),0,"Clear all takes every bunker off");
   await btn("↶ Undo").click();assert.equal(await n(),4,"Undo brings them back");
   assert.ok(!(await p.evaluate(()=>JSON.stringify(localStorage)).then(t=>t.includes("_fieldHist"))),"history is never saved");
   await btn("Done").click();await btn("Keep building").click();await btn("↶ Undo").click();
   assert.match(await root(p),/Nothing to undo yet/,"Done drops the history");
  });
  await check("Clear all refuses on a field in use, so it stays playable",async p=>{
   const key=await p.evaluate(()=>{const key="my:ftest";S.fields=[{key,name:"Busy park",at:Date.now(),bunkers:Array.from({length:8},(_,i)=>({id:"md#"+(i+1),n:"md",t:"dorito",w:4,h:4,x:20+i*6,y:15+i*12}))}];registerFields();S.layoutKey=key;S.tab="more";S.more="fields";S.fieldEdit={key,kind:"md",sel:null};save(S);render();return key;});
   await p.getByRole("button",{name:"Clear all",exact:true}).click();
   assert.equal(await p.evaluate(k=>fieldOf(k).bunkers.length,key),8);assert.match(await root(p),/is in use/);
  });
  await check("the bunker set counts down as he places, says when he is over it, and travels in a copy",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Set park");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const key=await p.evaluate(()=>S.fieldEdit.key);
   const nxl=await p.evaluate(()=>setFromLayout(LAYOUTS.lso));
   assert.equal(Object.values(nxl).reduce((a,b)=>a+b,0),58,"the NXL fields' set is 58");
   assert.deepEqual(await p.evaluate(k=>fieldOf(k).set,key),nxl,"a new field starts from it");
   const left=()=>p.evaluate(()=>[...document.querySelectorAll('[aria-label="Bunker to place"] button')].find(b=>b.textContent.startsWith("Giant plus")).getAttribute("aria-label"));
   assert.equal(await left(),"Giant plus, 2 left");
   await p.getByRole("button",{name:"Giant plus, 2 left"}).click();
   const tap=async(x,y)=>{await p.locator("#fieldbuild-map").scrollIntoViewIfNeeded();const at=await p.locator("#fieldbuild-map svg").evaluate((svg,[x,y])=>{const pt=svg.createSVGPoint();pt.x=x;pt.y=y;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);await p.mouse.click(at.x,at.y);};
   await tap(60,120);assert.equal(await left(),"Giant plus, 0 left","a bunker and its twin take two");
   await tap(60,40);assert.equal(await p.evaluate(k=>fieldOf(k).bunkers.length,key),4,"past the set it still places — his park may own more");
   assert.equal(await left(),"Giant plus, 2 over your set");assert.match(await root(p),/2 more Giant pluses than your set has/);
   await p.getByRole("button",{name:"↶ Undo",exact:true}).click();await p.getByRole("button",{name:"↶ Undo",exact:true}).click();
   assert.equal(await left(),"Giant plus, 2 left","Undo gives them back");
   await p.locator(".set-fold>summary").click();await p.locator(".set-fold[open]").waitFor();await p.getByLabel("How many Giant pluses in your set").waitFor();
   await p.getByLabel("How many Giant pluses in your set").fill("4");await p.getByLabel("How many Giant pluses in your set").press("Tab");
   assert.equal(await p.evaluate(k=>fieldOf(k).set.gp,key),4);assert.equal(await left(),"Giant plus, 4 left");
   await p.getByLabel("How many Giant pluses in your set").fill("-2");await p.getByLabel("How many Giant pluses in your set").press("Tab");
   assert.equal(await p.evaluate(k=>fieldOf(k).set.gp,key),4,"a count that is not a whole number is refused");
   assert.equal(await p.evaluate(()=>copyDataError(JSON.parse(copyPayload("all")).data)),"","the set travels in a copy");
   await p.reload();assert.deepEqual(await p.evaluate(k=>fieldOf(k)&&fieldOf(k).set.gp,key),4,"a season with a set survives a relaunch");
   await p.evaluate(k=>{S.tab="more";S.more="fields";S.fieldEdit={key:k,kind:"gp",sel:null};render();},key);
   await p.locator(".set-fold>summary").click();await p.locator(".set-fold[open]").waitFor();
   await p.locator("#field-set-from").selectOption({label:"No set — don't count"});
   assert.equal(await p.evaluate(k=>fieldOf(k).set,key),undefined);assert.equal(await left(),null,"no set, no countdown");
  });
  await check("bunkers snap to the grid every 5 ft, the free spots light up, and 10v10 says it is next",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Grid park");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const key=await p.evaluate(()=>S.fieldEdit.key);
   const spots=()=>p.locator("#fieldbuild-map .field-spots circle").count();
   const before=await spots();assert.ok(before>300,"spots light up before anything is placed: "+before);
   assert.equal(await p.locator("#fieldbuild-map .field-spots").getAttribute("pointer-events"),"none","a spot never takes the tap");
   await p.locator("#fieldbuild-map").scrollIntoViewIfNeeded();
   const at=await p.locator("#fieldbuild-map svg").evaluate(svg=>{const pt=svg.createSVGPoint();pt.x=2*41.7;pt.y=2*58.4;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};});
   await p.mouse.click(at.x,at.y);
   const b=await p.evaluate(k=>fieldOf(k).bunkers.map(b=>[b.x,b.y]),key);
   assert.deepEqual(b,[[40,60],[110,60]],"41.7, 58.4 snaps to the 5-ft spot 40, 60 and its twin");
   const after=await spots();assert.ok(after<before,"a placed bunker takes its spots out");
   const free=await p.evaluate(k=>fieldSpots(fieldOf(k),6.69,6.11).some(([x,y])=>x===40&&y===60),key);assert.equal(free,false);
   const coords=await p.evaluate(k=>fieldSpots(fieldOf(k),6.69,6.11).every(([x,y])=>x%5===0&&y%5===0),key);assert.ok(coords,"every spot is on the 5-ft grid");
   await p.locator("#field-size").selectOption("10v10");
   assert.match(await root(p),/10v10 · 200 × 150 ft fields are next/);assert.equal(await p.locator("#field-size").inputValue(),"std");
  });
  for(const [w,h] of [[390,844],[768,1024],[1024,768]])await check(`Field builder fits with named 44px controls at ${w}x${h}`,async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Fit check");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const bad=await p.locator(".main button:visible").evaluateAll(bs=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.height<44||!(b.getAttribute("aria-label")||b.innerText.trim());}).map(b=>b.outerHTML.slice(0,80)));
   assert.deepEqual(bad,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no sideways scroll");
  },{width:w,height:h});
 }finally{await browser.close();}
 console.log(`\nField builder tab: ${passed} passed, ${failed} failed`);process.exit(failed?1:0);
})();

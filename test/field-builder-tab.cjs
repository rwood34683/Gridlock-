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
  await check("building from the row makes a field that plays, chosen from Your fields and never listed with the event fields",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Home park");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   assert.equal(await p.locator("#fieldbuild-map").count(),1,"builder open on this screen");
   const key=await p.evaluate(()=>S.fieldEdit.key);
   await p.locator("#fieldbuild-map").scrollIntoViewIfNeeded();
   const at=await p.locator("#fieldbuild-map svg").evaluate(svg=>{const pt=svg.createSVGPoint();pt.x=40;pt.y=120;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};});
   await p.mouse.click(at.x,at.y);
   assert.equal(await p.evaluate(k=>fieldOf(k).bunkers.length,key),2,"a real tap places a bunker and its twin across the fifty");
   // The other seven by data, so the test reads the row's own Use / Edit, not tap geometry.
   await p.evaluate(k=>{S.fields=S.fields.map(f=>f.key===k?{...f,bunkers:[...f.bunkers,...Array.from({length:6},(_,i)=>({id:"MD#t"+i,n:"MD",t:"dorito",w:6.69,h:6.11,x:30+i*6,y:12+i*14}))]}:f);registerFields();render();},key);
   await p.getByRole("button",{name:"Done",exact:true}).click();
   assert.equal(await p.evaluate(()=>S.more),"fields","Done stays on Field builder");
   await p.getByRole("button",{name:"Use this field",exact:true}).click();
   assert.equal(await p.evaluate(()=>S.layoutKey),key,"Use this field puts it on every tab");
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   assert.match(await p.locator(".assign").filter({hasText:"Home park"}).innerText(),/ON/);
   await p.getByRole("button",{name:"Edit",exact:true}).click();assert.equal(await p.locator("#fieldbuild-map").count(),1);
   // Built fields are kept apart from the event fields (owner, 16 Nov 2026).
   await p.evaluate(()=>set({more:"nexus"}));assert.deepEqual(await p.locator(".assign__job").evaluateAll(es=>es.map(e=>e.textContent).filter(t=>/Home park/.test(t))),[],"not in Account & backups › Events");
   assert.match(await root(p),/your field\s*home park/i,"the status line calls it your field, not an event");
   assert.ok(await p.evaluate(k=>!layoutChoices().some(r=>r.key===k),key),"not in the header's event picker");
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   assert.equal(await p.locator("#my-field").inputValue(),key,"chosen from the Your fields drop-down");
   // Never listed with the event layouts (owner, 18 Nov 2026): not in Codes'
   // event fields, and the header calls it your field, not an event.
   await p.evaluate(()=>set({tab:"more",more:"codes"}));
   assert.deepEqual(await p.getByRole("group",{name:"Event field to read"}).locator("button").evaluateAll(bs=>bs.map(b=>b.textContent).filter(t=>/Home park/.test(t))),[],"Codes lists event fields only");
   assert.match(await p.getByRole("group",{name:"Your field to read"}).innerText(),/Home park · here/,"the field in use sits apart under Your field");
   assert.match(await p.locator(".ctx__ev").innerText(),/Your field · Home park/i);
   await p.locator("button.ctx__ev").click();
   assert.equal(await p.locator("#event-name option",{hasText:"Home park"}).count(),0,"not an event in the header's picker");
   assert.equal(await p.locator("#event-layout option",{hasText:"Home park"}).count(),0);
   // The header's ▾ lists the fields he built as their own group (owner,
   // 18 Nov 2026): Use this field moves to it, and the header names no play.
   assert.equal(await p.locator(".ctx__call").count(),0,"the header names the field, not the play");
   assert.match(await p.locator("#event-myfield option",{hasText:"Home park"}).innerText(),/Home park · in use/);
   await p.evaluate(()=>pickEvent("lso"));await p.locator("button.ctx__ev").click();
   await p.locator("#event-myfield").selectOption(key);
   assert.equal(await p.evaluate(()=>S.layoutKey),"lso","choosing moves nothing until Use");
   await p.getByRole("button",{name:"Use this field",exact:true}).click();
   assert.equal(await p.evaluate(()=>S.layoutKey),key,"Use this field puts it on every tab");
   assert.match(await p.locator(".ctx__ev").innerText(),/Your field · Home park/i);
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
   await btn("Done").click();await btn("Edit").click();await btn("↶ Undo").click();
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
  await check("bunkers snap to the grid every 5 ft, the free spots light up, and 10v10 is chosen before the first bunker",async p=>{
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
   assert.match(await root(p),/Clear all first/,"a field with bunkers on it keeps its size");
   assert.equal(await p.locator("#field-size").inputValue(),"std");assert.equal(await p.evaluate(k=>fieldOf(k).size,key),undefined);
   await p.getByRole("button",{name:"Clear all",exact:true}).click();
   await p.locator("#field-size").selectOption("10v10");
   assert.equal(await p.evaluate(k=>fieldOf(k).size,key),"10v10","an empty field takes the new size");
   assert.equal(await p.locator("#field-size").inputValue(),"10v10");
   assert.equal(await p.locator("#fieldbuild-map svg").getAttribute("viewBox"),"-8 -18 416 336","drawn 200 x 150 ft");
   assert.equal(await p.locator("#fieldbuild-map svg line").count(),20+15+1,"a line every 10 ft both ways, and the fifty");
  });
  await check("a 10v10 field is 200 x 150 ft on every screen: twins, the fifty, plants, routes, ends and Walk",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Big park");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const key=await p.evaluate(()=>S.fieldEdit.key);
   await p.locator("#field-size").selectOption("10v10");
   const tap=async(x,y)=>{await p.locator("#fieldbuild-map").scrollIntoViewIfNeeded();const at=await p.locator("#fieldbuild-map svg").evaluate((svg,[x,y])=>{const pt=svg.createSVGPoint();pt.x=2*x;pt.y=2*y;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);await p.mouse.click(at.x,at.y);};
   // A real tap past where the standard field ends is still on this field.
   await tap(170,140);assert.deepEqual(await p.evaluate(k=>fieldOf(k).bunkers.map(b=>[b.x,b.y]),key),[[170,140],[30,140]],"placed past 150 x 120, its twin across the fifty at 100");
   await p.getByRole("button",{name:"Giant brick",exact:false}).first().click();
   await tap(100.6,75);assert.deepEqual(await p.evaluate(k=>fieldOf(k).bunkers.slice(-1).map(b=>[b.x,b.y,!!b.tw]),key),[[100,75,false]],"one on the fifty at 100 stays single");
   const kinds=["md","t","c","br","sd","ck","sb","mt","tr","gw"];
   await p.evaluate(([k,kinds])=>{kinds.forEach((kind,i)=>{S.fieldEdit={...S.fieldEdit,kind,sel:null};fieldTap([15+i*8,10+i*13]);});},[key,kinds]);
   const L=await p.evaluate(k=>{const L=LAYOUTS[k];return {fw:L.fw,fh:L.fh,n:L.bunkers.length,plants:Object.keys(BREAK_PLANTS[k]).length,
     left:Object.values(BREAK_PLANTS[k]).every(ids=>ids.every(id=>L.bunkers.find(b=>b.id===id).x<=100))};},key);
   assert.deepEqual(L,{fw:200,fh:150,n:23,plants:12,left:true},"registered at its size, and the twelve plant on his half");
   assert.equal(await p.evaluate(()=>LAYOUTS.lso.fw),undefined,"a measured field stays 150 x 120");
   await p.getByRole("button",{name:"Done",exact:true}).click();await p.getByRole("button",{name:"Use this field",exact:true}).click();
   assert.equal(await p.evaluate(()=>S.layoutKey),key);
   assert.match(await p.locator(".assign").filter({hasText:"Big park"}).innerText(),/10v10 · 200 × 150 ft/);
   const geo=await p.evaluate(()=>{const L=curLayout(),b=L.bunkers.find(x=>x.x<100&&x.tw);
     const paths=breakPaths(S.layoutKey,"base");
     return {fifty:fiftyX(),twin:mirrorBunkerId(b.id)===b.tw,goal:goalStart(L,true)[0],side:sideOfBunker(L.bunkers.find(x=>x.x>100),1),
       inside:paths.length===5&&paths.every(r=>[r.from,...r.via,r.to].every(q=>q[0]>=0&&q[0]<=200&&q[1]>=0&&q[1]<=150)),
       wire:wireOf(140),centre:wireOf(75)};});
   assert.deepEqual(geo,{fifty:100,twin:true,goal:197,side:"them",inside:true,wire:"snake wire",centre:"centre"});
   for(const [tab,more,scoutTab] of [["playbook"],["tally"],["scout",null,"matchup"],["scout",null,"breakouts"],["scout",null,"layers"],["sightlines"],["more","walk"],["more","wb"],["more","stats"],["more","team"],["more","codes"]]){
    await p.evaluate(([tab,more,scoutTab])=>set({tab,...(more?{more}:{}),...(scoutTab?{scoutTab}:{})}),[tab,more,scoutTab]);
    const vb=await p.locator("#root svg.field").first().getAttribute("viewBox");
    assert.match(vb||"",/^-?\d+ -18 (428|416|400) (336|300)$/,`${tab}/${more||scoutTab||""} draws the 10v10 field: ${vb}`);
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${tab}/${more||""} no sideways scroll`);
   }
   await p.evaluate(()=>{set({tab:"more",more:"walk"});setWalkDrillZone("q4");});
   assert.match(await p.locator(".walk-drill-zones path").first().getAttribute("d"),/^M200 0V300 M0 150H400$/,"drill quarters split this field");
   assert.equal(await p.locator(".walk-drill-focus").getAttribute("x"),"201");
   assert.ok(await p.evaluate(()=>/^matrix\((-?[\d.]+ ){5}-?[\d.]+\)$/.test(walkMatrix())),"the camera fits the bigger drawing");
   await p.evaluate(()=>set({tab:"more",more:"wb"}));assert.equal(await p.locator("#wb-map").getAttribute("viewBox"),await p.locator(".wb-bg svg").getAttribute("viewBox"),"the ink layer has the picture's own viewBox");assert.deepEqual(await p.locator("#wb-map").evaluate(e=>[e.dataset.fw,e.dataset.fh]),["200","150"]);
   const feet=await p.evaluate(()=>{const svg=document.querySelector("#root svg.field");const r=svg.getBoundingClientRect();return fieldFeet(svg,{clientX:r.right-1,clientY:r.bottom-1});});
   assert.ok(feet[0]>150&&feet[0]<=199&&feet[1]>120&&feet[1]<=149,"a tap reads feet up to this field's edges: "+feet);
   assert.equal(await p.evaluate(()=>copyDataError(JSON.parse(copyPayload("all")).data)),"","the size travels in a copy");
   assert.equal(await p.evaluate(()=>copyDataError({...JSON.parse(copyPayload("all")).data,fields:[{...S.fields[0],size:"huge"}]})),"fields","an unknown size is refused");
   await p.reload();assert.equal(await p.evaluate(k=>LAYOUTS[k]&&LAYOUTS[k].fw,key),200,"a relaunch keeps it 10v10");
  });
  await check("a bunker is turned before it is placed: every tap after places it that way, its twin mirrored",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Turn park");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const key=await p.evaluate(()=>S.fieldEdit.key);
   const tap=async(x,y)=>{await p.locator("#fieldbuild-map").scrollIntoViewIfNeeded();const at=await p.locator("#fieldbuild-map svg").evaluate((svg,[x,y])=>{const pt=svg.createSVGPoint();pt.x=2*x;pt.y=2*y;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);await p.mouse.click(at.x,at.y);};
   await p.getByRole("button",{name:/^Snake beam/}).click();
   const turn=()=>p.getByRole("button",{name:/Rotate the Snake beam before you place it/});
   assert.match(await turn().getAttribute("aria-label"),/go down flat/);
   await turn().click();assert.match(await turn().getAttribute("aria-label"),/go down angled$/);
   await tap(30,50);await tap(30,80);
   await turn().click();await tap(40,20);
   const b=await p.evaluate(k=>fieldOf(k).bunkers.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h,a:b.a||0})),key);
   assert.deepEqual(b.slice(0,4).map(x=>x.a),[45,-45,45,-45],"the turn holds for every tap, and each twin leans the other way");
   assert.deepEqual([b[4].w,b[4].h,b[4].a],[1.49,9.68,0],"turned again it goes down upright");
   await p.getByRole("button",{name:/^Dorito/}).click();
   assert.match(await p.getByRole("button",{name:/Rotate the Dorito/}).getAttribute("aria-label"),/point to the dorito side/,"a new kind starts facing its usual way");
   await p.getByRole("button",{name:/^Cylinder/}).click();
   assert.equal(await p.locator(".turn-next").count(),1,"the one Rotate row is there for every bunker");
   await p.getByRole("button",{name:/^Rotate the Cylinder/}).click();assert.match(await root(p),/is round — it looks the same every way/,"a round bunker says why nothing turned");
   const edge=await p.evaluate(()=>{const k=BUNKER_KINDS.find(x=>x.key==="sb"),s=placeShape(k,1),e=footExt(s);return e.w>k.h&&e.h>k.h;});
   assert.ok(edge,"an angled beam lights spots by the box it really covers");
  });
  await check("one Rotate button turns the bunker chosen — the kind to place or one picked on the field — and the field saves as it goes, Edit opening it again",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("After park");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const key=await p.evaluate(()=>S.fieldEdit.key);
   const tap=async(x,y)=>{await p.locator("#fieldbuild-map").scrollIntoViewIfNeeded();const at=await p.locator("#fieldbuild-map svg").evaluate((svg,[x,y])=>{const pt=svg.createSVGPoint();pt.x=2*x;pt.y=2*y;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);await p.mouse.click(at.x,at.y);};
   assert.match(await root(p),/Saved as you go/,"the builder says it saves itself");
   await p.getByRole("button",{name:/^Snake beam/}).click();
   assert.equal(await p.getByRole("button",{name:/Rotate/}).count(),1,"one Rotate button, whatever is chosen");
   assert.match(await p.locator(".turn-what").innerText(),/Snake beam · next to place/);
   await tap(30,50);
   const bs=()=>p.evaluate(k=>fieldOf(k).bunkers.map(b=>({id:b.id,a:b.a||0,w:b.w,h:b.h})),key);
   const first=(await bs())[0];
   await tap(30,50);assert.equal(await p.evaluate(()=>S.fieldEdit.sel),first.id,"tapping it picks it");
   assert.match(await p.locator(".turn-what").innerText(),new RegExp(first.id.replace("#","\\#")+" · on the field"),"the picture is the bunker picked");
   assert.equal(await p.getByRole("button",{name:/Rotate/}).count(),1,"still one Rotate button");
   await p.getByRole("button",{name:/the bunker picked on the field/}).click();
   let now=await bs();assert.deepEqual([now[0].a,now[1].a],[45,-45],"the picked bunker turns in place, its twin mirrored");
   assert.equal(await p.evaluate(()=>S.fieldEdit.sel),first.id,"it stays picked, so Rotate again turns it again");
   await p.getByRole("button",{name:/the bunker picked on the field/}).click();
   now=await bs();assert.ok(now[0].h>now[0].w&&!now[0].a,"turned again it stands upright");
   assert.equal(await p.evaluate(()=>S.fieldEdit.turn||0),0,"turning a placed bunker leaves the next one as it was");
   await p.reload();
   assert.equal(await p.evaluate(k=>fieldOf(k).bunkers.length,key),2,"no Save button needed: it survives a relaunch");
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   assert.equal(await p.locator("#fieldbuild-map").count(),0);
   await p.getByRole("button",{name:"Edit",exact:true}).click();
   assert.equal(await p.locator("#fieldbuild-map").count(),1,"Edit opens it again");assert.equal(await p.evaluate(()=>S.fieldEdit.key),key);
   assert.match(await p.locator(".assign").filter({hasText:"After park"}).innerText(),/EDITING/);
  });
  for(const [w,h,wide] of [[390,844,false],[768,1024,true],[1180,820,true]])await check(`Field builder and Whiteboard at ${w}x${h}: ${wide?"the field fills the page beside a left pane":"the blocks stack"}`,async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Pane park");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   await p.evaluate(()=>document.querySelector(".main").scrollTo(0,0));
   const box=sel=>p.locator(sel).first().evaluate(e=>{const r=e.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height};});
   const fb={f:await box("#fieldbuild-map svg"),rot:await box(".turn-next"),kinds:await box('[aria-label="Bunker to place"]'),done:await p.getByRole("button",{name:"Done",exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom};})};
   if(wide){
    for(const k of ["rot","kinds","done"])assert.ok(fb[k].r<=fb.f.l+1,k+" stands in the pane left of the field");
    assert.ok(fb.f.w>=w*.5,"the field takes most of the width: "+fb.f.w);assert.ok(fb.f.b<=h+1,"the whole field is on screen");
    assert.ok(fb.rot.t<fb.kinds.t&&fb.kinds.t<fb.done.t,"what is picked and Rotate lead the pane, then the bunkers, then Done");
    assert.ok(fb.done.b<=h,"Done is on screen without scrolling");
   }else assert.ok(fb.kinds.b<=fb.f.t+1&&fb.rot.t>=fb.f.b-1,"on a phone: bunkers, field, then Rotate");
   const at=await p.locator("#fieldbuild-map svg").evaluate(svg=>{const pt=svg.createSVGPoint();pt.x=80;pt.y=120;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};});
   await p.locator("#fieldbuild-map").scrollIntoViewIfNeeded();
   const at2=await p.locator("#fieldbuild-map svg").evaluate(svg=>{const pt=svg.createSVGPoint();pt.x=80;pt.y=120;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};});
   await p.mouse.click(at2.x,at2.y);
   assert.deepEqual(await p.evaluate(()=>fieldOf(S.fieldEdit.key).bunkers.map(b=>[b.x,b.y])),[[40,60],[110,60]],"a tap on the fitted field still lands on its spot");
   await p.evaluate(()=>flash("A message while he builds."));
   const msg=await box("#root .flash"),fnow=await box("#fieldbuild-map svg");
   if(wide)assert.ok(msg.r<=fnow.l+1,"a message stands over the pane, never on the field being tapped");
   await p.evaluate(()=>set({more:"wb"}));await p.evaluate(()=>document.querySelector(".main").scrollTo(0,0));
   const wb={f:await box(".wb-wrap"),tools:await box(".wb-tools"),ink:await box("#wb-map"),pic:await box(".wb-bg svg")};
   if(wide){assert.ok(wb.tools.r<=wb.f.l+1,"the pens stand in the pane left of the board");assert.ok(wb.f.b<=h+1,"the whole board is on screen");assert.ok(wb.f.w>=w*.45,"the board takes most of the width: "+wb.f.w);}
   else assert.ok(wb.tools.t>=wb.f.b-1,"on a phone the pens sit under the board");
   assert.ok(Math.abs(wb.ink.w-wb.pic.w)<1.5&&Math.abs(wb.ink.h-wb.pic.h)<1.5,"the ink layer is the picture's box");
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no sideways scroll");
  },{width:w,height:h});
  for(const [w,h] of [[390,844],[768,1024],[1024,768]])await check(`Field builder fits with named 44px controls at ${w}x${h}`,async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Fit check");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const bad=await p.locator(".main button:visible").evaluateAll(bs=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.height<44||!(b.getAttribute("aria-label")||b.innerText.trim());}).map(b=>b.outerHTML.slice(0,80)));
   assert.deepEqual(bad,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no sideways scroll");
  },{width:w,height:h});
 }finally{await browser.close();}
 console.log(`\nField builder tab: ${passed} passed, ${failed} failed`);process.exit(failed?1:0);
})();

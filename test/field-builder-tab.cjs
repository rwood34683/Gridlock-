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
  for(const [w,h] of [[390,844],[768,1024],[1024,768]])await check(`Field builder fits with named 44px controls at ${w}x${h}`,async p=>{
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   await p.getByLabel("Name of the field").fill("Fit check");await p.getByRole("button",{name:"+ Build a field",exact:true}).click();
   const bad=await p.locator(".main button:visible").evaluateAll(bs=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.height<44||!(b.getAttribute("aria-label")||b.innerText.trim());}).map(b=>b.outerHTML.slice(0,80)));
   assert.deepEqual(bad,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no sideways scroll");
  },{width:w,height:h});
 }finally{await browser.close();}
 console.log(`\nField builder tab: ${passed} passed, ${failed} failed`);process.exit(failed?1:0);
})();

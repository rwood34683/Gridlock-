"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),vm=require("node:vm");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),SEED=require("../scripts/seed");
const SNAPSHOTS=require("./fixtures/field-size-before.json"); // Captured at e0d237b, before this audit's changes.
const DEVICES=vm.runInNewContext(fs.readFileSync(path.join(__dirname,"devices.js"),"utf8").match(/const DEVICES = (\[[\s\S]*?\n\]);/)[1]);
const SHOTS=path.resolve("work/field-10v10");fs.mkdirSync(SHOTS,{recursive:true});
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const button=(p,name)=>p.getByRole("button",{name,exact:true});
// toMainTop() puts a new screen at its top a frame later; a point measured
// before that lands is stale by however far the page then moved.
const go=async(p,tab,more,extra={})=>{await p.evaluate(x=>{set(x);toMainTop();},{tab,more:more||null,...extra});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));};
async function screen(p){
 const bad=await p.evaluate(()=>{
  const main=document.querySelector(".main"),bad=[];
  if(document.documentElement.scrollWidth>innerWidth||main.scrollWidth>main.clientWidth+1)bad.push("sideways scroll");
  for(const el of document.querySelectorAll("button,summary,select,input:not([type=hidden]),textarea,a[href]")){
   const r=el.getBoundingClientRect();if(!el.checkVisibility({checkVisibilityCSS:true})||!r.width||!r.height||r.right<0||r.left>innerWidth||getComputedStyle(el).opacity==="0")continue;
   const labelled=(el.getAttribute("aria-labelledby")||"").split(/\s+/).map(id=>document.getElementById(id)?.innerText||"").join(" ").trim();
   const name=el.getAttribute("aria-label")||labelled||el.getAttribute("title")||[...(el.labels||[])].map(l=>l.innerText).join(" ")||el.innerText;
   if(!name?.trim())bad.push("unnamed "+el.outerHTML.slice(0,100));
   if(Math.ceil(Math.min(r.width,r.height))<44)bad.push("small "+name);
  }return bad;
 });assert.deepEqual(bad,[]);
}
async function point(p,selector,x,y){
 const svg=p.locator(selector);await svg.evaluate(el=>el.scrollIntoView({block:"center",behavior:"instant"}));
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 return svg.evaluate((svg,[x,y])=>{const q=svg.createSVGPoint();q.x=x*2;q.y=y*2;const at=q.matrixTransform(svg.getScreenCTM());return {x:at.x,y:at.y};},[x,y]);
}
async function tap(p,selector,x,y){const q=await point(p,selector,x,y);await p.mouse.click(q.x,q.y);}
async function drag(p,handle,svg,x,y){
 // point() scrolls the field to the middle of the screen, so the handle is
 // measured after it: measured first, a phone's scroll left it elsewhere.
 const q=await point(p,svg,x,y),r=await handle.boundingBox();
 await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(q.x,q.y,{steps:8});await p.mouse.up();
}
async function makeField(p){
 await go(p,"more","fields");await p.getByLabel("Name of the field").fill("10v10 audit");await button(p,"+ Build a field").click();
 await p.locator("#field-size").selectOption("10v10");
 await p.getByRole("button",{name:/^Dorito, /}).click();
 const places=[[20,15],[50,15],[80,15],[20,45],[50,45],[80,45],[20,100],[50,100],[80,100],[25,140],[5,145],[25,75]];
 for(const [x,y]of places)await tap(p,"#fieldbuild-map svg",x,y);
 assert.equal(await p.evaluate(()=>fieldOf(S.fieldEdit.key).bunkers.length),24,"twelve real builder taps make 24 bunkers");
 await button(p,"Done").click();await button(p,"Use this field").click();
 assert.deepEqual(await p.evaluate(()=>[fieldW(),fieldH(),fiftyX()]),[200,150,100]);
 await go(p,"tally");await button(p,"Team not listed? Type their name").click();await p.locator("#oppName").fill("Rejects");await p.locator("#oppName").press("Enter");
 assert.equal(await p.evaluate(()=>matchVs()),"Rejects");
 return p.evaluate(()=>JSON.parse(JSON.stringify(S)));
}
(async()=>{
 const browser=await chromium.launch(launchOptions());let passed=0,failed=0,deviceSeed;
 async function check(name,run,p,errors){try{await run();await screen(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);}catch(e){failed++;console.error("FAIL "+name+": "+e.stack);await p.screenshot({path:path.join(SHOTS,"failure-"+failed+".png")}).catch(()=>{});}}
 async function page(viewport,seed=SEED){const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[];p.setDefaultTimeout(7000);p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());await p.goto(process.env.APP_URL);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify({...seed,fmtAsk:false,fmtDone:true}));},seed);await p.reload();return {c,p,errors};}
 try{
  const base=await page({width:390,height:844});
  await check("all measured fields and the standard built field retain their exact SVG",async()=>{
   const snapshots=await base.p.evaluate(()=>{
    S.fields=[{key:"my:standard-audit",name:"Standard audit",at:1,bunkers:[[20,20],[40,20],[60,20],[20,50],[40,50],[60,50],[20,80],[40,80],[60,80],[20,105]].flatMap(([x,y],i)=>[{...BUNKER_KINDS.find(b=>b.key==="md"),id:"md#"+(i*2+1),x,y,tw:"md#"+(i*2+2)},{...BUNKER_KINDS.find(b=>b.key==="md"),id:"md#"+(i*2+2),x:150-x,y,tw:"md#"+(i*2+1)}])}];registerFields();
    return Object.keys(LAYOUTS).map(k=>{S.layoutKey=k;S.bunkerCalls={};const html=fieldSVG({static:true,noPaths:true,names:true,pick:true}),div=document.createElement("div");div.innerHTML=html;return {key:k,viewBox:div.querySelector("svg").getAttribute("viewBox"),html,bunkers:[...div.querySelectorAll(".bnk")].map(n=>n.outerHTML).join("")};});
   });
   assert.deepEqual(snapshots.map(o=>({key:o.key,viewBox:o.viewBox,svg:hash(o.html),bunkers:hash(o.bunkers)})),SNAPSHOTS);
  },base.p,base.errors);await base.c.close();
  for(const [width,height]of [[390,844],[768,1024],[1024,768]]){
   const {c,p,errors}=await page({width,height});
   await p.evaluate(()=>freshMatch());
   const label=width+"x"+height;
   await check(label+" builds and uses a 24-bunker field, then picks the opponent",async()=>{deviceSeed=await makeField(p);},p,errors);
   if(!deviceSeed){await c.close();continue;}
   const saveShot=async name=>{if(width===390)await p.screenshot({path:path.join(SHOTS,name+"-390x844.png")});};
   await check(label+" Tally places on both halves from both ends and routes around bunkers",async()=>{
    await go(p,"tally",null,{tallyMode:"place",tallyStep:"place"});
    for(const [x,y,side]of [[20,15,"us"],[180,15,"them"]]){await tap(p,"#tally-map svg",x,y);assert.equal(await p.evaluate(()=>S.breakouts[0].side),side);}
    await button(p,"Switch ends").click();assert.equal(await p.evaluate(()=>ourEnd()),"right");
    for(const [x,y,side]of [[20,45,"them"],[180,45,"us"]]){await tap(p,"#tally-map svg",x,y);assert.equal(await p.evaluate(()=>S.breakouts[0].side),side);}
    assert.deepEqual(await p.evaluate(()=>goalStart(curLayout(),true)),[197,75],"back line follows width and proportional back band");
    const routes=await p.evaluate(()=>S.breakouts.map(row=>{const L=curLayout(),start=goalStart(L,rowFromRight(row)),pts=[start,...autoRoute(row).map(p=>[p.x,p.y])],obs=routeObstacles(L.bunkers,.1,L).filter(o=>!o.ids.has(row.bunker)&&!(Math.abs(start[0]-o.x)<=o.hw&&Math.abs(start[1]-o.y)<=o.hh));return {inside:pts.every(([x,y])=>x>=0&&x<=200&&y>=0&&y<=150),clear:pts.every((b,i)=>!i||!obs.some(o=>segHitsBox(...pts[i-1],...b,o.x,o.y,o.hw,o.hh)))};}));
    assert(routes.length>=4);assert(routes.every(r=>r.inside&&r.clear),JSON.stringify(routes));
    const far=await p.evaluate(()=>{const row=S.breakouts.find(r=>r.side==="us"&&curLayout().bunkers.find(b=>b.id===r.bunker).x>100),before={tallySel:S.tallySel,tallyEdit:S.tallyEdit,tallyDraft:S.tallyDraft};S.tallySel=row.bunker;S.tallyEdit=row.id;S.tallyDraft={...row,alive:false};const d=document.createElement("div");d.innerHTML=breakoutSheet();const xs=[...d.querySelectorAll('select[onchange*="shotFrom"] option')].filter(o=>o.value).map(o=>curLayout().bunkers.find(b=>b.id===o.value).x);Object.assign(S,before);return xs;});
    assert(far.length&&far.every(x=>x<100)&&far.includes(80),"right-end Shot from uses the full far half, including 75–100 ft");
    await p.waitForFunction(()=>{const f=document.querySelector("#tally-map svg").getBoundingClientRect(),b=document.querySelector(".resultbar").getBoundingClientRect();return f.bottom<=b.top+1||f.right<=b.left||f.left>=b.right;});
    assert.equal(await p.locator("#tally-map [data-end]").getAttribute("data-end"),"right");await saveShot("tally");
   },p,errors);
   await check(label+" Scout Breakouts logs five, draws ghosts, Games, Layers and lanes",async()=>{
    await go(p,"scout",null,{scoutTab:"breakouts",point:2});
    if(await p.evaluate(()=>ourEnd())!=="left")await p.locator('[onclick="switchEnds()"]:visible').first().click();
    for(let pt=2;pt<=4;pt++){
     await go(p,"scout",null,{scoutTab:"breakouts",point:pt});
     for(const [x,y]of [[180,15],[150,15],[120,45],[175,140],[195,145]])await tap(p,"#their-map svg",x,y);
     assert.equal(await p.locator("#their-map .their-five").count(),5);await saveShot("scout-breakouts");
     await p.locator('[onclick="logTheirFive(\'right\')"]').click();assert.equal(await p.evaluate(()=>theirFiveLogged("right").plants.length),5);
    }
    await go(p,"scout",null,{scoutTab:"layers",point:5,scoutShow:"them"});
    const ghost=await p.evaluate(()=>{const d=document.createElement("div");d.innerHTML=fieldSVG({static:true,noPaths:true,theirFive:true,lanes:true});return {n:d.querySelectorAll(".ghost-plant").length,far:[...d.querySelectorAll(".ghost-plant rect")].some(r=>+r.getAttribute("x")>300),lanes:fieldLanes()};});
    assert.equal(ghost.n,5);assert(ghost.far);assert(ghost.lanes,"the counted five supplies lanes");
    await go(p,"scout",null,{scoutTab:"matchup",scoutFold:false,lanesOn:false,callPicked:true});
    assert.equal(await p.locator(".field-wrap .ghost-plant").count(),5,"the actual Scout field draws the likely five");
    await button(p,"Lanes").click();assert(await p.locator(".break-lane").count()>0,"the Lanes control draws shooting lanes");
    assert(await p.locator(".break-lane line").evaluateAll(lines=>lines.some(l=>+l.getAttribute("x2")>300)&&lines.every(l=>["x1","x2"].every(a=>+l.getAttribute(a)>=0&&+l.getAttribute(a)<=400)&&["y1","y2"].every(a=>+l.getAttribute(a)>=0&&+l.getAttribute(a)<=300))));
    await go(p,"scout",null,{scoutTab:"games"});assert.equal(await p.locator("svg.field").first().getAttribute("data-fw"),"200");
   },p,errors);
   await check(label+" Movement records real taps beyond the standard edges",async()=>{
    await go(p,"more","movement");await p.getByRole("button",{name:/Reyes/}).first().click();
    await tap(p,"#move-map svg",175,140);await tap(p,"#move-map svg",195,145);
    const ids=await p.evaluate(()=>[S.moveFrom,S.moveTo]);assert(ids[0]&&ids[1]&&ids[0]!==ids[1]);
    await p.locator('[onclick="logMove()"]').click();assert.deepEqual(await p.evaluate(()=>[S.moves[0].from,S.moves[0].to]),ids);
   },p,errors);
   await check(label+" Sightlines crosses the fifty and clamps the dragged aim",async()=>{
    await go(p,"sightlines");await tap(p,"#sight-map svg",50,100);await tap(p,"#sight-map svg",175,140);
    assert(await p.evaluate(()=>{const b=id=>curLayout().bunkers.find(b=>b.id===id);return b(S.sightFrom).x<100&&b(S.sightTo).x>100;}));
    await drag(p,p.locator('[data-aim-sight]'),"#sight-map svg",220,170);
    assert.deepEqual(await p.evaluate(()=>S.sightAim),[199,149]);await saveShot("sightlines");
   },p,errors);
   await check(label+" Playbook drags a corner beyond 150/120 and clamps to 200/150",async()=>{
    await go(p,"playbook",null,{editPath:true,callPicked:true,script:"snake",t:0});
    let handle=p.locator("[data-h]").first();
    if(!await handle.count()){const leg=p.locator("[data-leg]").first();await leg.click({position:{x:4,y:4},force:true});handle=p.locator("[data-h]").first();}
    const id=await handle.getAttribute("data-h"),i=await handle.getAttribute("data-i");
    // Past the far corner but still on screen: at 390 px wide, 220 x 170 ft
    // lies beyond the window's edge, where no pointer event is delivered.
    await drag(p,handle,".field-wrap[data-live] svg",205,153);
    assert.deepEqual(await p.evaluate(([id,i])=>pathEdit(+id)[+i],[id,i]),[199,149]);await saveShot("playbook");
   },p,errors);
   await check(label+" Bunker stats stays by the right and bottom bunkers",async()=>{
    await go(p,"more","stats",{editPath:false,statView:"heat",statSide:"both",statAsPlayed:true});
    const result=await p.evaluate(()=>{const b=curLayout().bunkers.find(b=>b.x===195&&b.y===145),t=bunkerTraffic(statKeep()),d=document.createElement("div");S.statPick=b.id;d.innerHTML='<svg>'+statsOverlay({[b.id]:t[b.id]})+'</svg>';const dot=d.querySelector(".stat-n circle");return {count:t[b.id]?.visits,x:+dot?.getAttribute("cx"),y:+dot?.getAttribute("cy")};});
    assert(result.count>0);assert(result.x>390&&result.x<=400);assert(result.y>240&&result.y<=300);
    const labels=await p.evaluate(()=>{const d=document.createElement("div");d.innerHTML='<svg>'+bunkerLabels(curLayout().bunkers,2,2)+'</svg>';return [...d.querySelectorAll("text")].map(n=>+n.getAttribute("y"));});assert(labels.some(y=>y>240));assert(labels.every(y=>y<=300));
   },p,errors);
   await check(label+" Whiteboard aligns ink with the field and reaches the bottom-right corner",async()=>{
    await go(p,"more","wb");const a=await point(p,"#wb-map",185,135),b=await point(p,"#wb-map",199,149);
    await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:4});await p.mouse.up();
    // The stroke is kept on the lift; under a loaded runner that can land a frame later.
    await p.waitForFunction(()=>wbMarks().length>0,null,{timeout:3000}).catch(()=>{});
    const ink=await p.evaluate(()=>wbMarks().at(-1));assert(ink);assert(ink.pts.at(-1)[0]>198&&ink.pts.at(-1)[1]>148);
    const aligned=await p.evaluate(()=>{const a=document.querySelector(".wb-bg svg").getScreenCTM(),b=document.querySelector("#wb-map").getScreenCTM();return ["a","b","c","d","e","f"].every(k=>Math.abs(a[k]-b[k])<.01);});assert(aligned,"ink and field share the same screen transform");
    const box=await p.locator(".wb-wrap").boundingBox();assert(Math.abs((box.width-2)/(box.height-2)-428/336)<.02,"field plus wire margins");
    // Studio view (owner, 20 Nov 2026): the board fills the column right of its pane, fitted to the height.
    if(width>=740)assert(Math.abs(box.width-Math.min(await p.locator(".studio__field").evaluate(e=>e.clientWidth),Math.max(240,height-310)*428/336))<40,"tablet width uses its own aspect");
    await button(p,"Blank").click();const blank=await p.locator(".wb-wrap").boundingBox();assert(Math.abs((blank.width-2)/(blank.height-2)-4/3)<.02,"blank board keeps the field's 4:3 shape");
   },p,errors);
   await check(label+" shared PNG is 4:3 and keeps the whole field",async()=>{
    // Windows Chromium can open an OS share sheet. Exercise both platform paths
    // explicitly, capturing the native file without opening the system dialog.
    await p.evaluate(()=>Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>false}));
    await go(p,"scout",null,{scoutTab:"matchup"});await p.getByRole("button",{name:/Share this field as a picture/}).click();
    await p.waitForFunction(()=>!!_fieldPic);
    const dims=await p.evaluate(async()=>{const i=new Image();i.src=_fieldPic.url;await i.decode();return [i.naturalWidth,i.naturalHeight];});assert.deepEqual(dims,[1200,900]);await p.evaluate(()=>closeFieldPic());
    await p.evaluate(()=>{window.__shared=null;Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>true});Object.defineProperty(navigator,"share",{configurable:true,value:async d=>{window.__shared=d;}});});
    await p.getByRole("button",{name:/Share this field as a picture/}).click();await p.waitForFunction(()=>!!window.__shared);
    const native=await p.evaluate(async()=>{const f=__shared.files[0],b=await createImageBitmap(f),dims=[b.width,b.height,f.type];b.close();return dims;});assert.deepEqual(native,[1200,900,"image/png"]);
   },p,errors);
   await check(label+" Walk notes stay inside the rotated field and tour stops",async()=>{
    await go(p,"more","walk");const id=await p.evaluate(()=>curLayout().bunkers.find(b=>b.x===195&&b.y===145).id);
    await p.locator("#wkWhere").selectOption(await p.evaluate(id=>walkWhereOf(curLayout().bunkers.find(b=>b.id===id)),id));await p.locator("#wkNote").fill("Far corner");await button(p,"Add note").click();
    await p.locator("#wkWhere").selectOption(await p.evaluate(id=>walkWhereOf(curLayout().bunkers.find(b=>b.id===id)),id));
    await button(p,"Explore field").click();await button(p,"Tilt view").click();await button(p,"Right ↷").click();await button(p,"Start tour").click();await p.waitForFunction(()=>_walkView.angle>15);await button(p,"Stop tour").click();assert.equal(await p.evaluate(()=>_walkFrame),0);
    const a=await p.locator("#walk-map").boundingBox(),b=await p.locator("#walk-stickies").boundingBox();assert(b.x>=a.x&&b.x+b.width<=a.x+a.width+1&&b.y>=a.y&&b.y+b.height<=a.y+a.height+1);
   },p,errors);
   await check(label+" map colour sampling uses the turned 200x150 field",async()=>{
    await go(p,"more","fields");await button(p,"Edit").click();
    const src=await p.evaluate(()=>{const c=document.createElement("canvas");c.width=400;c.height=300;const g=c.getContext("2d");g.fillStyle="#000";g.fillRect(0,0,400,300);g.fillStyle="#f00000";g.fillRect(340,260,60,40);g.fillStyle="#0000f0";g.fillRect(340,0,60,60);return c.toDataURL("image/png");});
    await p.getByLabel("Picture of the event's map").setInputFiles({name:"test-map.png",mimeType:"image/png",buffer:Buffer.from(src.split(",")[1],"base64")});
    await p.waitForFunction(()=>!!mapOf(fieldOf(S.fieldEdit.key)));
    const colour=()=>p.evaluate(()=>fieldOf(S.fieldEdit.key).bunkers.find(b=>b.x===195&&b.y===145).c);
    assert.equal(await colour(),"r","loading samples the far corner at 200x150");await button(p,"Turn the map").click();
    await p.waitForFunction(()=>fieldOf(S.fieldEdit.key).bunkers.find(b=>b.x===195&&b.y===145).c==="b");assert.equal(await colour(),"b","turning resamples at 200x150");
   },p,errors);
   await c.close();
  }
  assert.equal(DEVICES.length,20);
  if(deviceSeed)for(const[name,width,height]of DEVICES){const{c,p,errors}=await page({width,height},deviceSeed);await check("10v10 five tabs on "+name,async()=>{
   for(const tab of ["playbook","tally","scout","sightlines","more"]){await go(p,tab,null);await screen(p);if(tab!=="more")assert.equal(await p.locator("svg.field").first().getAttribute("data-fw"),"200");const r=await p.locator(".tabs").boundingBox();assert(r.y>=0&&r.y+r.height<=height+1,"tabs stay on screen");}
  },p,errors);await c.close();}
 }finally{await browser.close();}
 console.log(`Field 10v10: ${passed} passed, ${failed} failed`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});

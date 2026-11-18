"use strict";
// The path in the header (owner, 18 Nov 2026): Home › Scout › Breakouts, like a
// file explorer's address bar. Every step but the last goes back to it, ← goes
// up one, and on a tablet or computer the five tabs run across the top with no
// left pane. A phone keeps its bottom bar.
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),SEED=require("../scripts/seed");
(async()=>{
 const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,run,viewport){
  const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[];
  p.setDefaultTimeout(6500);p.on("pageerror",e=>errors.push(e.message));
  try{
   await p.goto(process.env.APP_URL);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify({...seed,fmtAsk:false,fmtDone:true,tab:"playbook"}));},SEED);await p.reload();
   await run(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}
 }
 const path=p=>p.locator(".crumbs ol").innerText().then(t=>t.replace(/\s+/g," ").trim());
 const crumb=(p,label)=>p.locator(".crumbs").getByRole("button",{name:label,exact:true});
 for(const [w,h,label] of [[390,844,"phone"],[768,1024,"iPad"],[1366,900,"computer"]]){
  await check(`${label}: the path says where you are and every step goes back`,async p=>{
   assert.match(await path(p),/^Home › Playbook$/i);
   await p.evaluate(()=>set({tab:"scout",scoutTab:"breakouts"}));
   assert.match(await path(p),/^Home › Scout › Breakouts$/i);
   assert.match(await p.locator('.crumbs [aria-current="page"]').innerText(),/^breakouts$/i,"the last step is where you are, not a button");
   await crumb(p,"Scout").click();
   assert.deepEqual(await p.evaluate(()=>[S.tab,S.scoutTab]),["scout","matchup"],"Scout goes back to Scout's first view");
   await p.evaluate(()=>set({tab:"more",more:"fields"}));
   assert.match(await path(p),/^Home › More › Field builder$/i);
   await p.getByRole("button",{name:"Back to More"}).click();
   assert.deepEqual(await p.evaluate(()=>[S.tab,S.more]),["more",null],"← goes up one, to the More menu");
   assert.match(await path(p),/^Home › More$/i);
   await crumb(p,"Home").click();
   assert.equal(await p.evaluate(()=>S.tab),"home");
   assert.equal(await p.locator(".ctx__home").getAttribute("aria-current"),"page");
   assert.equal(await p.locator(".crumbs__back").count(),0,"nothing above Home");
   const small=await p.locator(".crumbs button").evaluateAll(bs=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.height<44||r.width<44;}).map(b=>b.textContent));
   assert.deepEqual(small,[],"every step is a 44 px target");
   const tabs=await p.evaluate(()=>{const t=document.querySelector("nav.tabs").getBoundingClientRect(),m=document.querySelector(".main").getBoundingClientRect(),c=document.querySelector(".crumbs").getBoundingClientRect();return {top:t.bottom<=m.top+1&&t.top<c.top,bottom:t.top>=m.bottom-1,wide:t.width>innerWidth*0.8};});
   if(label==="phone")assert.ok(tabs.bottom&&tabs.wide,"a phone keeps the bottom bar");
   else assert.ok(tabs.top&&tabs.wide,"the tabs run across the top, above the path, with no left pane: "+JSON.stringify(tabs));
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no sideways scroll");
  },{width:w,height:h});
 }
 await browser.close();
 console.log(`\nNav path: ${passed} passed, ${failed} failed`);process.exit(failed?1:0);
})();

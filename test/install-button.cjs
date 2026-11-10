"use strict";
// Install on this phone: the button, the browser's own dialog, the steps for
// each phone, and that it never shows once the app runs installed.
const assert=require("node:assert/strict"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve");
const ANDROID="Mozilla/5.0 (Linux; Android 14; SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const IPHONE="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const SAMSUNG="Mozilla/5.0 (Linux; Android 14; SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36";
const INAPP="Mozilla/5.0 (Linux; Android 14; SM-G973U; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 [FBAN/EMA;FBAV/400.0]";
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"../web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch(launchOptions());let passed=0,failed=0;
 async function check(name,ua,fn){const c=await browser.newContext({viewport:{width:390,height:844},userAgent:ua,serviceWorkers:"block"});const p=await c.newPage(),errors=[];
  p.on("pageerror",e=>errors.push(e.message));
  try{await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.reload();await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);}
  catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}}
 const btn=p=>p.getByRole("button",{name:"Install on this phone",exact:true});
 const root=p=>p.locator("#root").innerText();
 try{
  await check("the welcome page offers Install on this phone, live and never greyed out",ANDROID,async p=>{
   assert.equal(await btn(p).count(),1);assert.equal(await btn(p).isDisabled(),false);
   const box=await btn(p).boundingBox();assert(box.height>=44,"a 44 px target");
  });
  await check("with the browser's dialog on offer, a tap opens it once and says what happened",ANDROID,async p=>{
   await p.evaluate(()=>{window.__prompts=0;const e=new Event("beforeinstallprompt",{cancelable:true});
    e.prompt=()=>{window.__prompts++;return Promise.resolve();};e.userChoice=Promise.resolve({outcome:"accepted"});window.dispatchEvent(e);});
   const before=await p.evaluate(()=>localStorage.getItem("gridlock.coach.v2"));
   await btn(p).click();await p.waitForTimeout(50);
   assert.equal(await p.evaluate(()=>window.__prompts),1);assert.match(await root(p),/Installing/);
   await btn(p).click();await p.waitForTimeout(50);
   assert.equal(await p.evaluate(()=>window.__prompts),1,"the dialog is asked for once; the next tap shows the steps");
   assert.match(await root(p),/Tap ⋮ at the top right/);
   assert.equal(await p.evaluate(()=>localStorage.getItem("gridlock.coach.v2")),before,"installing saves nothing to the season");
  });
  await check("a dismissed dialog says it was not installed",ANDROID,async p=>{
   await p.evaluate(()=>{const e=new Event("beforeinstallprompt",{cancelable:true});e.prompt=()=>Promise.resolve();e.userChoice=Promise.resolve({outcome:"dismissed"});window.dispatchEvent(e);});
   await btn(p).click();await p.waitForTimeout(50);assert.match(await root(p),/Not installed/);
  });
  for(const [ua,label,want] of [[ANDROID,"Android Chrome",/Tap ⋮ at the top right[\s\S]*Install app/],[IPHONE,"iPhone Safari",/Share[\s\S]*Add to Home Screen/],
    [SAMSUNG,"Samsung Internet",/Tap ≡[\s\S]*Add page to/],[INAPP,"an in-app browser",/inside another app[\s\S]*Open in Chrome/]])
   await check(`without the dialog, a tap shows the steps for ${label}, and Close puts them away`,ua,async p=>{
    await btn(p).click();assert.match(await root(p),want);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,"no sideways scroll");
    await p.getByRole("button",{name:"Close",exact:true}).click();assert.doesNotMatch(await root(p),/Add to Home|Install app —|Add page to|inside another app/);
   });
  await check("Account & backups carries it too, and Help answers how to install",ANDROID,async p=>{
   await p.evaluate(()=>{S.entered=true;S.role="staff";S.email="coach@example.test";S.fmtAsk=false;S.fmtDone=true;set({tab:"more",more:"nexus"});});
   assert.equal(await btn(p).count(),1);
   assert(await p.evaluate(()=>HELP_Q.some(([q,a])=>/install the app/i.test(q)&&/Install on this phone/.test(a))));
  });
  await check("once installed it is gone: the appinstalled event, a standalone window, the phone app",ANDROID,async p=>{
   await p.evaluate(()=>window.dispatchEvent(new Event("appinstalled")));assert.equal(await btn(p).count(),0);
   await p.reload();
   await p.evaluate(()=>{const mm=window.matchMedia;window.matchMedia=q=>/display-mode: standalone/.test(q)?{matches:true,addListener(){},removeListener(){}}:mm(q);render();});
   assert.equal(await btn(p).count(),0);
   await p.reload();
   await p.evaluate(()=>{document.documentElement.classList.add("is-native");render();});assert.equal(await btn(p).count(),0);
  });
 }finally{await browser.close();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} install button checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

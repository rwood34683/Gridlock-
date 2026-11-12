"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),{createServer}=require("../scripts/serve");
(async()=>{
 const server=createServer({root:path.resolve(__dirname,"..")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port,browser=await chromium.launch(launchOptions());
 const out=path.resolve("work/teaser-browser");fs.mkdirSync(out,{recursive:true});let passed=0,failed=0;const evidence=[];
 async function check(name,fn){try{await fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}}
 try{
 const source=await browser.newPage();await source.goto(base+"/web/");
 // The running coach app has already appended WCUP.divs to DIVISIONS.
 const coach=await source.evaluate(()=>({fields:LAYOUTS,plants:BREAK_PLANTS,teamNames:DIVISIONS.flatMap(d=>d.teams.map(t=>t.name))}));await source.close();
 for(const kind of ["player","team"]){
  await check(kind+": all measured footprints, break plants and public team entries match coach source",async()=>{
   const context=await browser.newContext(),p=await context.newPage();try{await p.goto(base+"/teasers/"+kind+"/");
    const result=await p.evaluate(c=>{
     let count=0,plants=0;const errors=[],host=document.createElementNS("http://www.w3.org/2000/svg","svg");host.style.cssText="position:absolute;left:-10000px;top:0;width:150px;height:120px";document.body.append(host);
     for(const [key,l] of Object.entries(COACH_FIELDS)){
      const original=c.fields[key];if(!original||original.bunkers.length!==l.raw.length){errors.push(key+" bunker count");continue;}
      l.raw.forEach((v,i)=>{const a=original.bunkers[i];count++;
       if(v.x!==a.x||Math.abs(v.y-(120-a.y))>.011||v.w!==a.w||v.h!==a.h||v.t!==a.t||(v.a||0)!==(a.a||0)||v.c!==(a.c||"n"))errors.push(key+" "+i+" measured data");
       host.innerHTML="<g>"+mBunkerSVG(v)+"</g>";const wrap=host.firstElementChild,target=wrap.firstElementChild.tagName==="g"?wrap.firstElementChild:wrap,r=target.getBBox();
       if(Math.abs(r.width-a.w)>.021||Math.abs(r.height-a.h)>.021)errors.push(key+" "+i+" SVG footprint "+r.width+"x"+r.height);
      });
      for(const [call,ids] of Object.entries(c.plants[key]||{})){
       const alias={conserve:"cons",trade:"clean",lock:"lanes"}[call]||call,actual=COACH_PLAYS[key]?.[alias]?.players;
       if(!actual||actual.length!==ids.length){errors.push(key+" "+call+" plants missing");continue;}
       ids.forEach((id,i)=>{plants++;const b=original.bunkers.find(b=>b.id===id);if(!b||actual[i].t[0]!==b.x||Math.abs(actual[i].t[1]-(120-b.y))>.011)errors.push(key+" "+call+" plant "+i);});
      }
     }
     host.remove();const entries=COACH_DIVS.flatMap(d=>d.t);
     if(entries.some(t=>t.length!==4||t[1]!==""||![0,1].includes(t[2])||t[3]!==0))errors.push("non-public team fields");
     if(JSON.stringify(entries.map(t=>t[0]).sort())!==JSON.stringify(c.teamNames.sort()))errors.push("team names differ: "+JSON.stringify({actual:entries.length,expected:c.teamNames.length,extra:entries.map(t=>t[0]).filter(n=>!c.teamNames.includes(n)),missing:c.teamNames.filter(n=>!entries.some(t=>t[0]===n))}));
     return{fields:Object.keys(COACH_FIELDS).length,count,plants,entries:entries.length,errors};
    },coach);assert.deepEqual(result.errors,[]);assert.equal(result.fields,Object.keys(coach.fields).length);assert.equal(result.count,Object.values(coach.fields).reduce((n,l)=>n+l.bunkers.length,0));evidence.push({kind,geometry:result});
   }finally{await context.close();}
  });
  for(const [width,height] of [[390,844],[768,1024],[1024,768]])await check(kind+" navigation, controls and no sends at "+width+"x"+height,async()=>{
   const context=await browser.newContext({viewport:{width,height}}),p=await context.newPage(),errors=[],dialogs=[],requests=[],screens=[];
   p.setDefaultTimeout(5000);p.on("pageerror",e=>errors.push(e.message));p.on("console",m=>{if(m.type()==="error")errors.push(m.text());});p.on("dialog",async d=>{dialogs.push(d.message());await d.dismiss();});p.on("request",r=>requests.push({url:r.url(),method:r.method(),type:r.resourceType()}));
   await context.route("**/*",r=>r.request().url().startsWith(base+"/")?r.continue():r.abort());
   const cdp=await context.newCDPSession(p);await cdp.send("DOM.enable");await cdp.send("Accessibility.enable");
   async function scan(name){
    await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await p.evaluate(()=>document.querySelectorAll('[data-preview-audit]').forEach(e=>e.removeAttribute('data-preview-audit')));
    const controls=await p.evaluate(()=>[...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,a[href],[role=button],[onclick]')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.visibility!=="hidden"&&s.display!=="none"&&!e.closest("[hidden],[inert]");}).map((e,i)=>{e.setAttribute("data-preview-audit",String(i));const r=e.getBoundingClientRect();return{id:String(i),label:e.id||e.textContent.trim().slice(0,50)||e.tagName,width:r.width,height:r.height};}));
    const ax=await cdp.send("Accessibility.getFullAXTree"),dom=await cdp.send("DOM.getDocument",{depth:-1,pierce:true}),ids=new Map();
    function walk(n){const a=n.attributes||[];for(let i=0;i<a.length;i+=2)if(a[i]==="data-preview-audit")ids.set(a[i+1],n.backendNodeId);for(const child of n.children||[])walk(child);}walk(dom.root);
    const names=new Map(ax.nodes.filter(n=>!n.ignored).map(n=>[n.backendDOMNodeId,n.name?.value||""]));
    for(const c of controls){assert(c.width>=44&&c.height>=44,name+": target below 44px "+c.label+" "+c.width+"x"+c.height);assert(names.get(ids.get(c.id)),name+": control has no accessible name: "+c.label);}
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+": sideways scrolling");
    const horizontalContainers=await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.clientWidth&&e.scrollWidth>e.clientWidth+1&&['auto','scroll'].includes(getComputedStyle(e).overflowX)).map(e=>({id:e.id,className:e.className,width:e.clientWidth,scrollWidth:e.scrollWidth})));
    assert.equal(await p.locator("#obGo").count(),0,"tutorial must not open itself");screens.push({name,controls:controls.length,horizontalContainers});
    await p.screenshot({path:path.join(out,kind+"-"+width+"x"+height+"-"+name+".png"),fullPage:true});
   }
   try{
    await p.goto(base+"/teasers/"+kind+"/");await scan("start");assert.equal(await p.evaluate(()=>getComputedStyle(document.body).backgroundColor),"rgb(11, 12, 13)");
    if(kind==="player"){await p.locator("#joinCode").fill("IMPACT-7QX2");await p.locator("#joinGo").click();await scan("joined");}
    const tabs=await p.locator(".tabs button:visible").evaluateAll(es=>es.map(e=>e.dataset.m));
    assert.deepEqual(tabs,kind==="player"?["tally","scout","sight","walk","more"]:["team","lineup","tsched","tprep","msg","nexus"]);
    for(const tab of tabs){await p.locator('.tabs button[data-m="'+tab+'"]').click();await scan("tab-"+tab);
     if(kind==="player"&&tab==="tally"){await p.locator('#field [data-bid]').first().click();await scan('tally-picked');await p.locator('.tabs button[data-m="tally"]').click();}
     if(kind==="player"&&tab==="scout"){
      const pick=p.locator('.pickSel').first(),value=await pick.locator('option').evaluateAll(es=>es.find(e=>e.value).value);await pick.selectOption(value);await scan('scout-picked');
      const rating=p.getByRole('button',{name:'Threat 3 of 5',exact:true});await rating.focus();await p.keyboard.press('Enter');assert.equal(await p.getByRole('button',{name:'Threat 3 of 5',exact:true}).getAttribute('aria-pressed'),'true');
     }
     if(tab==="more"){
      const items=await p.locator("#moreMenu button").evaluateAll(es=>es.map(e=>({attr:e.hasAttribute("data-mm")?"data-mm":"data-lock",value:e.dataset.mm||e.dataset.lock})));
      assert.deepEqual(items.map(i=>i.value),["practice","nexus","team","myline","msg","play","lineup","move","assess","codes"]);
      for(const item of items){if(!await p.locator("#moreMenu").isVisible())await p.locator("#moreBtn").click();await p.locator('#moreMenu ['+item.attr+'="'+item.value+'"]').click();await scan("more-"+item.value);for(const close of await p.getByRole("button",{name:/^(Close|Got it|OK|Back)$/i}).all())if(await close.isVisible())await close.click();}
     }
    }
    assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);
    assert.deepEqual(requests,[{url:base+"/teasers/"+kind+"/",method:"GET",type:"document"}],"only the preview document may be requested");
    evidence.push({kind,width,height,screens,errors,dialogs,requests});
   }finally{await context.close();}
  });
  await check(kind+": tendency reset needs two taps and never a browser dialog",async()=>{
   const c=await browser.newContext(),p=await c.newPage(),dialogs=[];p.on("dialog",async d=>{dialogs.push(d.message());await d.dismiss();});
   try{await p.goto(base+"/teasers/"+kind+"/");if(kind==="player"){await p.locator("#joinCode").fill("IMPACT-7QX2");await p.locator("#joinGo").click();}
    await p.evaluate(()=>{const o=pbL();o.L[layoutKey].hist=[{k:"balanced",at:Date.now()}];pbSave(o);pbTendencyDetail();});
    await p.locator("#pbTendClear").click();assert.equal(await p.evaluate(()=>pbHist().length),1);await p.locator("#pbTendClear").click();assert.equal(await p.evaluate(()=>pbHist().length),0);assert.deepEqual(dialogs,[]);
   }finally{await c.close();}
  });
 }
  await check("Team and Player on one origin keep separate teams, and a Team backup is refused by Player",async()=>{
   const c=await browser.newContext({acceptDownloads:true}),t=await c.newPage(),p=await c.newPage();
   try{
    await t.goto(base+"/teasers/team/");await t.evaluate(()=>localStorage.setItem("gridlock_team",JSON.stringify({code:"IMPACT-YWIX",coach:true})));
    await p.goto(base+"/teasers/player/");await p.locator("#joinCode").fill("IMPACT-7QX2");await p.locator("#joinGo").click();
    const keys=await p.evaluate(()=>Object.keys(localStorage).sort());
    assert.ok(keys.includes("gridlock_team_team")&&keys.includes("gridlock_player_team"),"each app has its own team key: "+keys.join(","));
    assert.ok(keys.every(k=>!k.startsWith("gridlock_")||k.startsWith("gridlock_team_")||k.startsWith("gridlock_player_")),"no shared key: "+keys.join(","));
    await t.reload();assert.equal(await t.evaluate(()=>JSON.parse(localStorage.getItem("gridlock_team")).code),"IMPACT-YWIX","Player joining did not overwrite Team's team");
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem("gridlock_team")).code),"IMPACT-7QX2");
    const backup=await t.evaluate(()=>{const data={_gridlock_backup:1,app:EDITION,ver:APP_VER,date:"x",keys:{}};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf("gridlock_"+EDITION+"_")===0)data.keys["gridlock_"+k.slice(("gridlock_"+EDITION+"_").length)]=localStorage.getItem(k);}return data;});
    assert.equal(backup.app,"team");assert.ok(Object.keys(backup.keys).includes("gridlock_team")&&Object.keys(backup.keys).every(k=>!k.startsWith("gridlock_player_")),"a Team backup holds Team's data only");
    await p.evaluate(()=>setMode("nexus"));
    await p.locator("#bkUp").setInputFiles({name:"gridlock-team-backup.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(backup))});
    await p.waitForTimeout(400);
    assert.match(await p.locator("#bkMsg").innerText(),/from the Gridlock Team app/);
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem("gridlock_team")).code),"IMPACT-7QX2","Player's team is untouched");
   }finally{await c.close();}
  });
 }finally{fs.writeFileSync(path.join(out,"evidence.json"),JSON.stringify(evidence,null,2));await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log(`${passed}/${passed+failed} preview browser checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

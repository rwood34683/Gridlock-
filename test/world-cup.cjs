"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),SEED=require("../scripts/seed");
const d=require("../web/world-cup-data.js").read(), ROOT=path.resolve(__dirname,"..");
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.error("FAIL "+name+"\n"+e.stack);}}
(async()=>{
 await test("the supplied entries, roles, people, history and provenance survive the offline package",()=>{
  assert.equal(d.entries.length,680);assert.equal(new Set(d.entries.map(e=>e.entry_id)).size,680);assert.equal(new Set(d.entries.map(e=>e.team_id)).size,592);
  assert.equal(d.divisions.length,36);assert.equal(d.divisions.filter(e=>e.listed_count).length,34);assert.equal(d.people.length,4381);
  assert.equal(d.memberships.length,5925);const roles={};for(const m of d.memberships)roles[m.role]=(roles[m.role]||0)+1;
  assert.deepEqual(roles,{Coach:208,Player:4495,Staff:1195,Media:27});assert.ok(d.memberships.every(m=>m.jersey_number===null));
  assert.equal(d.history.length,10501);assert.equal(d.participation.length,7389);assert.equal(d.sources.length,3231);assert.equal(d.names.length,12417);
  assert.equal(d.access.length,1177);assert.equal(d.missing.length,6500);assert.equal(d.rosterCoverage.length,680);assert.equal(d.rosterDifferences.length,601);
  const sources=new Set(d.sources.map(s=>s.source_id));for(const h of d.history)assert.ok(sources.has(h.source_id));
  for(const div of d.divisions)assert.equal(d.entries.filter(e=>e.event_id===div.event_id&&e.division_id===div.division_id).length,div.listed_count);
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"data/world-cup-2026-manifest.json")));
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT,"web/world-cup-data.js"))).digest("hex"),manifest.output_sha256);
  const lib=path.dirname(require.resolve("fflate/package.json"));assert.equal(require("fflate/package.json").version,"0.8.3");
  assert.equal(fs.readFileSync(path.join(ROOT,"web/fflate.js"),"utf8"),"/* fflate 0.8.3\n"+fs.readFileSync(path.join(lib,"LICENSE"),"utf8")+"\n*/\n"+fs.readFileSync(path.join(lib,"umd/index.js"),"utf8"));
  assert.ok(fs.readFileSync(path.join(ROOT,"web/fflate-LICENSE.txt")).equals(fs.readFileSync(path.join(lib,"LICENSE"))));
 });
 await test("no person's age, payment, personal link or token is shipped",()=>{
  const {PRIVATE_FIELDS}=require("../scripts/import-world-cup.js");
  assert.deepEqual(PRIVATE_FIELDS,["age_as_published","registration_fee_paid","person_event_link","event_person_token"]);
  for(const k of PRIVATE_FIELDS)assert.ok(d.memberships.every(m=>!Object.hasOwn(m,k)),k+" is in the bundle");
  assert.equal((JSON.stringify(d).match(/[?&]EPID=/gi)||[]).length,0,"a personal token survives in an address");
 });
 const browser=await chromium.launch(launchOptions()),url=process.env.APP_URL||"http://localhost:5173/";
 async function pageTest(name,fn,opts={}){await test(name,async()=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:opts.offline?"allow":"block"});const p=await ctx.newPage(),errors=[],remote=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("request",r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(url))remote.push(r.url());});
  try{
   await p.goto(url);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);await p.goto(url);
   await p.waitForFunction(()=>typeof window.set==="function");await fn(p,ctx);assert.deepEqual(errors,[]);assert.deepEqual(remote,[],"browsing a supplied directory must not contact a source site");
  } finally{await ctx.close();}
 });}
 const open= p=>p.evaluate(()=>set({tab:"more",more:"worldcup"}));
 const personWith=status=>d.people.find(p=>p.history.status===status&&p.current_entry_ids.length);
 const personOpen=(p,person)=>p.evaluate(x=>{WorldCup2026.openEntry(x.current_entry_ids[0]);WorldCup2026.openPerson(x.person_id);},person);
 try{
  await pageTest("More search and Scout Division open the directory without decoding it on other screens",async p=>{
   await p.evaluate(()=>{const read=WorldCup2026Data.read;window.cupReads=0;WorldCup2026Data.read=()=>{cupReads++;return read();};set({tab:"more",more:null});});
   assert.equal(await p.evaluate(()=>cupReads),0);await p.locator("#tool-find").fill("world cup");await p.locator('[data-tool="worldcup"]').click();
   assert.equal(await p.evaluate(()=>cupReads),1);assert.match(await p.locator("main").innerText(),/680 entries/);
   await p.evaluate(()=>set({tab:"scout",scoutTab:"board",more:null}));await p.getByRole("button",{name:"Find World Cup teams",exact:true}).click();assert.ok(await p.locator("#cup-find").isVisible());
  });
  await pageTest("all 36 division packages filter correctly and multi-division team entries remain separate",async p=>{
   await open(p);for(const div of d.divisions){await p.locator("#cup-division").selectOption(div.event_id+":"+div.division_id);
    assert.equal(await p.locator("#cup-results [data-entry]").count(),Math.min(30,div.listed_count));
    assert.match(await p.locator("#cup-results").innerText(),div.listed_count?new RegExp(div.listed_count+" entries"): /No entries found/);
   }
   await p.locator("#cup-division").selectOption("");await p.locator("#cup-find").fill("Edmonton Impact");
   const expected=d.entries.filter(e=>e.team_name==="Edmonton Impact");assert.ok(expected.length>1);
   assert.equal(await p.locator("#cup-results [data-entry]").count(),expected.length);
   assert.deepEqual((await p.locator("#cup-results [data-entry]").evaluateAll(es=>es.map(e=>e.dataset.entry))).sort(),expected.map(e=>e.entry_id).sort());
  });
  await pageTest("team and player search keeps focus, paging is bounded, and Back restores the filtered row",async p=>{
   await open(p);const first=await p.locator("#cup-results [data-entry]").first().getAttribute("data-entry");assert.equal(await p.locator("#cup-results [data-entry]").count(),30);
   assert.equal(await p.getByRole("button",{name:"Previous teams",exact:true}).count(),0);assert.equal(await p.locator(".cup button:disabled").count(),0);
   await p.getByRole("button",{name:"Next teams",exact:true}).click();assert.notEqual(await p.locator("#cup-results [data-entry]").first().getAttribute("data-entry"),first);
   assert.equal(await p.getByRole("button",{name:"Previous teams",exact:true}).count(),1);assert.equal(await p.locator(".cup button:disabled").count(),0);
   await p.locator("#cup-find").fill("Crista Gonzales");assert.ok(await p.locator("#cup-find").evaluate(e=>e===document.activeElement));
   await p.locator('[data-entry="236224"]').click();await p.getByRole("button",{name:/Team list/}).click();
   assert.equal(await p.locator("#cup-find").inputValue(),"Crista Gonzales");assert.equal(await p.evaluate(()=>document.activeElement.dataset.entry),"236224");
   await p.locator("#cup-find").press("Escape");assert.equal(await p.locator("#cup-find").inputValue(),"");
  });
  await pageTest("Baltimore retains the modern/legacy roster union with separate roles and unpublished jerseys",async p=>{
   await open(p);await p.evaluate(()=>WorldCup2026.openEntry("236224"));const t=await p.locator("main").innerText();
   for(const expected of ["Players · 8","Coaches · 1","Staff · 7","Media · 1","Jersey not published"])assert.ok(t.includes(expected),expected);
   assert.equal(await p.locator("[data-person]").count(),17);await p.locator('[data-person="63083"]').click();assert.equal((await p.locator(".cup h2").first().textContent()).trim(),"Crista Gonzales");
   assert.match(await p.locator("main").innerText(),/Player hometown: (Not retrieved|Not published)/);await p.getByRole("button",{name:/roster$/}).click();assert.equal(await p.evaluate(()=>document.activeElement.dataset.person),"63083");
  });
  await pageTest("an empty authenticated roster is explained without calling the team withdrawn",async p=>{
   const empty=d.rosters.find(r=>r.status==="authenticated_empty_roster");await open(p);await p.evaluate(id=>WorldCup2026.openEntry(id),empty.entry_id);
   assert.match(await p.locator("main").innerText(),/roster was empty when read/);assert.equal(await p.locator("[data-person]").count(),0);
  });
  for(const status of ["not_retrieved","scored_event_history_imported_zero_rows","scored_event_history_imported"])
   await pageTest("history status stays explicit: "+status,async p=>{
    await open(p);await personOpen(p,personWith(status));const t=await p.locator("main").innerText();
    assert.match(t,status==="not_retrieved"?/History has not been retrieved/:status.endsWith("zero_rows")?/listed no scored events/:/Classification score:/);
    if(status==="scored_event_history_imported"){
     assert.equal(await p.getByRole("button",{name:"Previous records",exact:true}).count(),0);assert.equal(await p.locator(".cup button:disabled").count(),0);
     assert.ok(await p.locator(".cup-history article").count()<=15);const links=await p.locator(".cup a").evaluateAll(es=>es.map(e=>({href:e.href,target:e.target,rel:e.rel})));
     assert.ok(links.length);for(const l of links){assert.ok(l.href.startsWith("https://pbleagues.com/"));assert.equal(l.target,"_blank");assert.ok(l.rel.includes("noopener"));}
    }
   });
  await pageTest("the directory never changes the season or adds the dataset to a backup",async p=>{
   const before=await p.evaluate(()=>seasonText(S));await open(p);await p.locator("#cup-find").fill("Dynasty");await p.locator("#cup-results [data-entry]").first().click();await p.locator("[data-person]").first().click();
   assert.equal(await p.evaluate(()=>seasonText(S)),before);assert.equal(await p.evaluate(()=>JSON.parse(copyPayload("all")).data.cupView),undefined);
  });
  await pageTest("published text is escaped and unsafe source URLs never become links",async p=>{
   await p.evaluate(()=>{const d=WorldCup2026Data.read(),e=d.entries[0];e.team_name='<img src=x onerror="window.cupXss=1">';e.source_url="javascript:alert(1)";e.roster_url="https://user:password@pbleagues.com/";});
   await open(p);await p.evaluate(()=>WorldCup2026.openEntry("236210"));assert.equal(await p.locator(".cup img").count(),0);assert.equal(await p.evaluate(()=>window.cupXss),undefined);
   assert.equal(await p.locator('.cup a[href^="javascript:"],.cup a[href*="password@"]').count(),0);assert.equal((await p.locator(".cup h2").first().textContent()).trim(),'<img src=x onerror="window.cupXss=1">');
   await p.evaluate(()=>{const m=WorldCup2026Data.read().memberships.find(m=>m.entry_id==="236210");m.name='<img src=x onerror="window.cupXss=2">';WorldCup2026.openPerson(m.person_id);});
   assert.equal(await p.locator(".cup img").count(),0);assert.equal(await p.evaluate(()=>window.cupXss),undefined);assert.equal((await p.locator(".cup h2").first().textContent()).trim(),'<img src=x onerror="window.cupXss=2">');
  });
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:820,height:1180}])
   await pageTest(`directory, roster and history fit ${size.width}×${size.height}`,async p=>{
    await p.setViewportSize(size);await open(p);for(const phase of [0,1,2]){
     if(phase===1)await p.evaluate(()=>WorldCup2026.openEntry("237406"));
     if(phase===2)await personOpen(p,personWith("scored_event_history_imported"));
     assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"no sideways scroll");
    }
   });
  await pageTest("the directory, roster and history reopen from the installed shell with no connection",async(p,ctx)=>{
   await p.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error("offline install timed out")),15000))]);});
   await p.reload();await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await ctx.setOffline(true);await p.reload();
   await open(p);assert.match(await p.locator("main").innerText(),/680 entries/);await personOpen(p,personWith("scored_event_history_imported"));assert.match(await p.locator("main").innerText(),/Classification score:/);
  },{offline:true});
  await pageTest("the standalone app includes the directory without external scripts",async p=>{
   const html=require("../scripts/build-app-artifact").bundle();await p.route("**/standalone.html",r=>r.fulfill({body:html,contentType:"text/html"}));await p.goto(new URL("standalone.html",url).href);await open(p);assert.match(await p.locator("main").innerText(),/680 entries/);
   assert.equal(await p.locator("script[src]").count(),0);await p.evaluate(()=>WorldCup2026.openEntry("236224"));assert.equal(await p.locator("[data-person]").count(),17);
  });
 }finally{await browser.close();}
 console.log(`World Cup: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

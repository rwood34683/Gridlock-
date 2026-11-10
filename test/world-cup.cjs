"use strict";
// The World Cup team directory ships public team and event fields only. These
// checks decode the bundle that is actually shipped, run the importer on a
// synthetic handoff that carries people, and drive the directory screen.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),os=require("node:os");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),SEED=require("../scripts/seed");
const ROOT=path.resolve(__dirname,".."),BUNDLE=path.join(ROOT,"web/world-cup-data.js");
const d=require("../web/world-cup-data.js").read(),{PUBLIC,TABLES,compile,compileFromBundle}=require("../scripts/import-world-cup.js");
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.error("FAIL "+name+"\n"+e.stack);}}
// Every string anywhere in a value, keys included.
const strings=v=>typeof v==="string"?[v]:Array.isArray(v)?v.flatMap(strings):v&&typeof v==="object"?Object.entries(v).flatMap(([k,x])=>[k,...strings(x)]):[];
(async()=>{
 await test("the shipped bundle holds only the allowed tables and fields",()=>{
  assert.deepEqual(Object.keys(d).sort(),["coverage","divisions","entries","event","locations","retrieved_at"]);
  for(const t of TABLES)for(const r of d[t])for(const k of Object.keys(r))assert.ok(PUBLIC[t].includes(k),`${t}.${k} is not an allowed public field`);
  for(const k of Object.keys(d.event))assert.ok(PUBLIC.event.includes(k),"event."+k);
  for(const r of d.event.related_events||[])for(const k of Object.keys(r))assert.ok(PUBLIC.related_events.includes(k),"related_events."+k);
  assert.deepEqual(Object.keys(d.coverage).sort(),["distinct_team_ids","divisions","divisions_with_entries","event_entries"]);
 });
 await test("no player, roster, profile, history, access or private link record is shipped",()=>{
  for(const gone of ["rosters","memberships","people","profiles","names","access","history","participation","sources","missing","rosterCoverage","rosterDifferences"])
   assert.ok(!Object.hasOwn(d,gone),gone+" is in the bundle");
  const all=strings(d).join("\n");
  for(const pattern of [/EPID=/i,/ERID=/i,/\/team\/roster\//i,/rosterclass/i,/person_id/,/event_roster_token/,/roster_url/,/age_as_published/,/registration_fee_paid/,/jersey_number/,/classification_score/,/source_file/,/local_file/])
   assert.ok(!pattern.test(all),pattern+" appears in the decoded bundle");
  const raw=fs.readFileSync(BUNDLE,"utf8");assert.ok(raw.length<200000,"the bundle is team data, not 2.3 MB of people: "+raw.length);
 });
 await test("the public teams and divisions survive: 680 entries, 592 team IDs, 36 divisions (34 with entries)",()=>{
  assert.equal(d.entries.length,680);assert.equal(new Set(d.entries.map(e=>e.entry_id)).size,680);assert.equal(new Set(d.entries.map(e=>e.team_id)).size,592);
  assert.equal(d.divisions.length,36);assert.equal(d.divisions.filter(e=>e.listed_count).length,34);assert.equal(d.locations.length,680);
  assert.deepEqual(d.coverage,{event_entries:680,distinct_team_ids:592,divisions:36,divisions_with_entries:34});
  for(const div of d.divisions)assert.equal(d.entries.filter(e=>e.event_id===div.event_id&&e.division_id===div.division_id).length,div.listed_count);
  assert.ok(d.entries.every(e=>e.team_name&&e.division&&e.registration_status));
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"data/world-cup-2026-manifest.json")));
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(BUNDLE)).digest("hex"),manifest.output_sha256);
  assert.deepEqual(manifest.counts,{divisions:36,entries:680,locations:680});assert.deepEqual(manifest.fields,JSON.parse(JSON.stringify(PUBLIC)));
  const lib=path.dirname(require.resolve("fflate/package.json"));assert.equal(require("fflate/package.json").version,"0.8.3");
  assert.equal(fs.readFileSync(path.join(ROOT,"web/fflate.js"),"utf8"),"/* fflate 0.8.3\n"+fs.readFileSync(path.join(lib,"LICENSE"),"utf8")+"\n*/\n"+fs.readFileSync(path.join(lib,"umd/index.js"),"utf8"));
 });
 await test("rebuilding from the shipped bundle reproduces it byte for byte",()=>{
  assert.equal(compileFromBundle(BUNDLE).js,fs.readFileSync(BUNDLE,"utf8"));
 });
 await test("the importer drops people from a synthetic handoff, even fields it has never seen",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wc-synthetic-"));
  const PERSON="Zebediah Quaranta-Synthetic",ent={event_id:"9322",division_id:"1",division:"Test Div",format:"X",format_rules:"r",bracket:"A",team_name:"Synthetic Squad",team_id:"T1",entry_id:"E1",
   event_roster_token:"TOK123",roster_url:"https://pbleagues.com/team/roster/TOK123",registration_status:"Payment Accepted",source_url:"https://pbleagues.com/event/9322/teams",retrieved_at:"2026-11-08T17:00:00-05:00",
   members:[{name:PERSON,person_id:"P1"}],captain:PERSON,new_personal_field:PERSON};
  fs.writeFileSync(path.join(dir,"teams.json"),JSON.stringify({event:{name:"NXL World Cup",event_id:"9322",year:2026,source_urls:["https://pbleagues.com/event/9322"],organiser_contact:PERSON},retrieved_at:"2026-11-08T17:00:00-05:00",
   divisions:[{event_id:"9322",division_id:"1",name:"Test Div",listed_count:1,paid:1,source_url:"https://pbleagues.com/event/9322"}],teams:[ent]}));
  fs.writeFileSync(path.join(dir,"team_locations.json"),JSON.stringify({observations:[{entry_id:"E1",team_id:"T1",hometown_raw:"Testville",source_url:"https://pbleagues.com/team/roster/TOK123",source_file:"sources/x.html",coach:PERSON}]}));
  for(const f of ["rosters","people","player_profiles","person_event_history"])fs.writeFileSync(path.join(dir,f+".json"),JSON.stringify({people:[{name:PERSON}]}));
  const {js,manifest}=compile(dir);
  assert.deepEqual(Object.keys(manifest.input_sha256).sort(),["team_locations.json","teams.json"],"the importer reads only the team files");
  const m={exports:{}};new Function("module","require","atob",js)(m,require,s=>Buffer.from(s,"base64").toString("binary"));const out=m.exports.read();
  const all=strings(out).join("\n");assert.ok(!all.includes(PERSON),"a person's name reached the output");assert.ok(!/TOK123|team\/roster/.test(all),"a roster link reached the output");
  assert.equal(out.entries[0].team_name,"Synthetic Squad");assert.equal(out.locations[0].hometown_raw,"Testville");assert.ok(!Object.hasOwn(out.divisions[0],"paid"));
  fs.rmSync(dir,{recursive:true,force:true});
 });
 await test("the importer refuses a private address in a public field",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wc-synthetic-"));
  fs.writeFileSync(path.join(dir,"teams.json"),JSON.stringify({event:{event_id:"9322"},divisions:[],teams:[{entry_id:"E1",team_id:"T1",team_name:"X",source_url:"https://pbleagues.com/team/roster/SECRET?EPID=1"}]}));
  fs.writeFileSync(path.join(dir,"team_locations.json"),JSON.stringify({observations:[]}));
  assert.throws(()=>compile(dir),/Not a public event address/);fs.rmSync(dir,{recursive:true,force:true});
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
 try{
  await pageTest("More search and Scout Division open the directory without decoding it on other screens",async p=>{
   await p.evaluate(()=>{const read=WorldCup2026Data.read;window.cupReads=0;WorldCup2026Data.read=()=>{cupReads++;return read();};set({tab:"more",more:null});});
   assert.equal(await p.evaluate(()=>cupReads),0);await p.locator("#tool-find").fill("world cup");await p.locator('[data-tool="worldcup"]').click();
   assert.equal(await p.evaluate(()=>cupReads),1);assert.match(await p.locator("main").innerText(),/680 entries/);assert.match(await p.locator("main").innerText(),/Player rosters are not included\./);
   await p.evaluate(()=>set({tab:"scout",scoutTab:"board",more:null}));assert.match(await p.locator("main").innerText(),/Player rosters are not included\./);
   await p.getByRole("button",{name:"Find World Cup teams",exact:true}).click();assert.ok(await p.locator("#cup-find").isVisible());
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
  await pageTest("team search keeps focus, paging is bounded, and Back restores the filtered row",async p=>{
   await open(p);const first=await p.locator("#cup-results [data-entry]").first().getAttribute("data-entry");assert.equal(await p.locator("#cup-results [data-entry]").count(),30);
   assert.equal(await p.getByRole("button",{name:"Previous teams",exact:true}).count(),0);assert.equal(await p.locator(".cup button:disabled").count(),0);
   await p.getByRole("button",{name:"Next teams",exact:true}).click();assert.notEqual(await p.locator("#cup-results [data-entry]").first().getAttribute("data-entry"),first);
   const e=d.entries.find(x=>x.entry_id==="236224");await p.locator("#cup-find").fill(e.team_name);assert.ok(await p.locator("#cup-find").evaluate(el=>el===document.activeElement));
   await p.locator('[data-entry="236224"]').click();await p.getByRole("button",{name:/Team list/}).click();
   assert.equal(await p.locator("#cup-find").inputValue(),e.team_name);assert.equal(await p.evaluate(()=>document.activeElement.dataset.entry),"236224");
   await p.locator("#cup-find").press("Escape");assert.equal(await p.locator("#cup-find").inputValue(),"");
  });
  await pageTest("an entry shows its team details and says rosters are not included, without names or roster links",async p=>{
   await open(p);await p.evaluate(()=>WorldCup2026.openEntry("236224"));const t=await p.locator("main").innerText();
   assert.match(t,/Player rosters are not included\./);assert.match(t,/Team hometown:/);assert.match(t,/Entry 236224/);
   assert.equal(await p.locator("[data-person]").count(),0);assert.doesNotMatch(t,/roster was empty|Players · |Coaches · |Jersey/);
   const links=await p.locator(".cup a").evaluateAll(es=>es.map(e=>e.href));for(const l of links){assert.ok(!/team\/roster/.test(l),l);assert.ok(l.startsWith("https://pbleagues.com/event/"),l);}
   assert.equal(await p.evaluate(()=>typeof WorldCup2026.openPerson),"undefined");
  });
  await pageTest("a World Cup team on the board still goes in the right pit for scouting",async p=>{
   const id=await p.evaluate(()=>DIVISIONS.find(x=>x.event==="NXL World Cup 2026"&&x.id==="wcup-28302").id);
   await p.evaluate(id=>{setDivision(id);setPitTeam("right","Atlanta Jungle Cats");set({tab:"scout",scoutTab:"matchup"});},id);
   assert.equal(await p.evaluate(()=>pitOf("right").name),"Atlanta Jungle Cats");assert.match(await p.locator("main").innerText(),/Atlanta Jungle Cats/);
  });
  await pageTest("the directory never changes the season or adds the dataset to a backup",async p=>{
   const before=await p.evaluate(()=>seasonText(S));await open(p);await p.locator("#cup-find").fill("Dynasty");await p.locator("#cup-results [data-entry]").first().click();
   assert.equal(await p.evaluate(()=>seasonText(S)),before);assert.equal(await p.evaluate(()=>JSON.parse(copyPayload("all")).data.cupView),undefined);
  });
  await pageTest("published text is escaped and unsafe source URLs never become links",async p=>{
   await p.evaluate(()=>{const d=WorldCup2026Data.read(),e=d.entries[0];e.team_name='<img src=x onerror="window.cupXss=1">';e.source_url="javascript:alert(1)";});
   await open(p);await p.evaluate(()=>WorldCup2026.openEntry("236210"));assert.equal(await p.locator(".cup img").count(),0);assert.equal(await p.evaluate(()=>window.cupXss),undefined);
   assert.equal(await p.locator('.cup a[href^="javascript:"]').count(),0);assert.equal((await p.locator(".cup h2").first().textContent()).trim(),'<img src=x onerror="window.cupXss=1">');
  });
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:820,height:1180}])
   await pageTest(`directory and an entry fit ${size.width}×${size.height}`,async p=>{
    await p.setViewportSize(size);await open(p);for(const phase of [0,1]){
     if(phase===1)await p.evaluate(()=>WorldCup2026.openEntry("237406"));
     assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"no sideways scroll");
    }
   });
  await pageTest("the directory reopens from the installed shell with no connection",async(p,ctx)=>{
   await p.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error("offline install timed out")),15000))]);});
   await p.reload();await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await ctx.setOffline(true);await p.reload();
   await open(p);assert.match(await p.locator("main").innerText(),/680 entries/);await p.evaluate(()=>WorldCup2026.openEntry("236224"));assert.match(await p.locator("main").innerText(),/Player rosters are not included/);
  },{offline:true});
  await pageTest("the standalone app includes the directory without external scripts",async p=>{
   const html=require("../scripts/build-app-artifact").bundle();await p.route("**/standalone.html",r=>r.fulfill({body:html,contentType:"text/html"}));await p.goto(new URL("standalone.html",url).href);await open(p);assert.match(await p.locator("main").innerText(),/680 entries/);
   assert.equal(await p.locator("script[src]").count(),0);
  });
 }finally{await browser.close();}
 console.log(`World Cup: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {execFileSync}=require("node:child_process");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {createServer}=require("../scripts/serve"),SEED=require("../scripts/seed");
const input=require("../data/worldcup-handoff-2026.json"),copy=require("../data/worldcup-2026-season-copy.json");
const raw=JSON.stringify(copy),root=path.resolve(__dirname,"..");
(async()=>{
 const server=createServer({root:path.join(root,"web")});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const browser=await chromium.launch(launchOptions()),url=`http://127.0.0.1:${server.address().port}/`;
 let passed=0,failed=0;
 async function check(name,fn,size={width:390,height:844}){
  const c=await browser.newContext({viewport:size,serviceWorkers:"block",timezoneId:"America/New_York"}),p=await c.newPage(),errors=[];
  p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
  try{await p.goto(url);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify({...seed,scout:{},games:[],gamesOff:[]}));},SEED);await p.reload();
   await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
  }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}}
 const merge=p=>p.evaluate(text=>loadCopy("merge",text),raw);
 try{
  await check("the reviewed generator reproduces the import and seed provenance",async()=>{
   execFileSync(process.execPath,["scripts/import-worldcup-handoff.js","--check"],{cwd:root});
   assert.equal(copy.data.games.length,646);assert.deepEqual(Object.keys(copy.data),["games","scout"]);
   assert.equal(Object.values(copy.data.scout).flatMap(s=>s.players).length,39);
   assert.equal(Object.values(copy.data.scout).filter(s=>s.notes).reduce((n,s)=>n+s.notes.split("\n\n").length,0),10);
   assert(!fs.existsSync(path.join(root,"web/event-data.json")));
  });
  await check("both stale Rejects seed games keep their old IDs and source IDs",async p=>{
   const got=await p.evaluate(()=>allGames().filter(g=>g.srcId==="4071649"||g.srcId==="4071637"));
   assert.equal(got.length,2);assert(got.every(g=>g.h==="Rejects"||g.a==="Rejects"));
   assert(got.every(g=>g.id.includes("new jersey leverage")),"existing links and hidden rows keep stable IDs");
  });
  await check("the 646-row file merges to 722 fixtures and reimport adds nothing",async p=>{
   const before=await p.evaluate(()=>JSON.stringify([S.tally,S.results,S.matches,S.breakouts,S.playerChecks,S.point,S.matchId]));
   assert.equal(await merge(p),true);
   const got=await p.evaluate(()=>({n:allGames().length,unique:new Set(allGames().map(g=>[g.d,g.t,foldName(g.h),foldName(g.a)].join("|"))).size,stored:S.games.length,
     before:JSON.stringify([S.tally,S.results,S.matches,S.breakouts,S.playerChecks,S.point,S.matchId])}));
   assert.equal(got.n,722);assert.equal(got.unique,722);assert.equal(got.stored,646);assert.equal(got.before,before);
   const once=await p.evaluate(()=>JSON.stringify([S.games,S.scout]));await merge(p);assert.equal(await p.evaluate(()=>JSON.stringify([S.games,S.scout])),once);
  });
  await check("every source game ID, unresolved side, null and snapshot survives",async p=>{
   await merge(p);const rows=await p.evaluate(()=>allGames());
   assert.equal(new Set(rows.map(g=>g.game_id)).size,722);
   for(const src of input.schedule){const row=rows.find(g=>g.game_id===src.game_id);assert(row);for(const [k,v] of Object.entries(src))assert.deepEqual(row[k],v,src.game_id+" "+k);}
   assert.equal(rows.reduce((n,g)=>n+["home","away"].filter(s=>g[s+"_slot_label"]&&!g[s+"_entry_id"]).length,0),167);
   for(const [id,side] of [["4071649","home"],["4071637","away"],["4047264","away"]]){
    const row=rows.find(g=>g.game_id===id);assert.equal(row[side+"_name"],"Rejects");assert.equal(row[side+"_entry_id"],null);assert.equal(row[side+"_team_id"],null);
   }
   const kept=await p.evaluate(()=>JSON.parse(copyPayload("everything")).data);assert.equal(kept.games.length,646);
   await p.reload();assert.equal(await p.evaluate(()=>allGames().length),722);
  });
  await check("the original handoff's schedule fragment also imports without duplicates",async p=>{
   const original=JSON.stringify({format:"gridlock.coach.copy",v:1,data:{games:input.games}});
   assert.equal(await p.evaluate(s=>loadCopy("merge",s),original),true);
   assert.equal(await p.evaluate(s=>loadCopy("merge",s),original),true);
   assert.equal(await p.evaluate(()=>allGames().length),722);
   assert.equal(await p.evaluate(()=>S.games.length),646);
  });
  await check("corrected seed and imported IDs open one fixture, including hidden preferences",async p=>{
   await merge(p);const got=await p.evaluate(()=>{
    const g=allGames().find(g=>g.srcId==="4071649"),alias="imp:"+g.srcId;
    const same=gameById(alias).id===g.id;S.gamesOff=[g.id];const hidden=!gameById(alias);
    S.gamesOff=[];watchGame(alias);const count=S.matches.length,mid=S.matchId;
    curMatch().sched=alias;watchGame(g.id);
    return {same,hidden,vs:curMatch().home,away:curMatch().away,kept:count===S.matches.length&&mid===S.matchId};
   });assert.deepEqual(got,{same:true,hidden:true,vs:"Rejects",away:"ZuriCaos",kept:true});
   const moved=await p.evaluate(()=>{
    S.games.find(g=>g.id==="imp:4071649").t="08:05";
    const g=gameById("imp:4071649");return [g.id,g.t,allGames().length];
   });assert.deepEqual(moved,["imp:4071649","08:05",723],"an explicit coach reschedule wins over a legacy seed alias");
  });
  await check("39 player suggestions and ten team notes retain all 49 sources and VERIFY wording",async p=>{
   await merge(p);const scout=await p.evaluate(()=>S.scout);
   input.film.rows.forEach((src,i)=>{
    const pr=scout[src.team],id=input.film.sourceId+":"+(i+1);
    const player=pr.players.find(p=>p.sourceId===id),note=player?player.note:pr.notes;
    assert(note.includes("Source: "+id+" ·"));assert(note.includes(src.confidence));
    for(const f of ["notes","preferredBunker","usualOut","usualKill","latePointClutch","sourceGames","jersey"])if(src[f])assert(note.includes(src[f]),src.player+" "+f);
    if(player){assert.equal(player.sourceTeam,src.team);assert.equal(player.confidence,src.confidence);assert.equal(player.wire,src.roleLane);assert.equal(player.threat,undefined);
     const m=/^#?(\d+)$/.exec(src.jersey);assert.equal(player.num,m?m[1]:"");assert(!("hometown" in player));}
   });
   assert.equal(scout["Tampa Bay Damage"].players.length,2,"unknown jerseys cannot collapse two names");
   assert.equal(scout["Royal City Seadogs"].players.find(p=>p.name==="Nick Campbell").num,"");
  });
  await check("suggestions preserve a coach's players, number, threat, plants and team notes",async p=>{
   await p.evaluate(()=>{S.scout={"San Diego Dynasty":{threat:5,tend:"Dorito",notes:"My read",players:[{name:"Ryan Greenspan",num:"88",wire:"Back",note:"My note",threat:4,plant:{nwc:"own"}},{name:"Different player",num:"1",wire:"Flex",note:"Keep me"}]},"Chicago Aftershock":{notes:"My team note",players:[]}};});
   await merge(p);await merge(p);const got=await p.evaluate(()=>S.scout);
   const pr=got["San Diego Dynasty"],man=pr.players.find(p=>p.name==="Ryan Greenspan");
   assert.equal(pr.players.length,4);assert.equal(pr.threat,5);assert.equal(pr.tend,"Dorito");assert.equal(pr.notes,"My read");
   assert.equal(man.num,"88");assert.equal(man.wire,"Back");assert.equal(man.threat,4);assert.deepEqual(man.plant,{nwc:"own"});assert(man.note.startsWith("My note"));
   assert.equal((man.note.match(/Source: 892f0e63/g)||[]).length,1);
   assert(got["Chicago Aftershock"].notes.startsWith("My team note"));
  });
  await check("all 17 published schedule divisions have only their named teams and exact game counts",async p=>{
   await merge(p);await p.evaluate(()=>set({tab:"more",more:"schedule"}));
   const groups=await p.evaluate(()=>scheduleDivisions());assert.equal(groups.length,17);
   assert.equal(groups.reduce((n,d)=>n+d.count,0),722);
   for(const d of groups){
    await p.locator("#schedule-division").selectOption(d.id);
    const expected=input.schedule.filter(g=>g.event_id+":"+g.division_id===d.id);
    const names=[...new Set(expected.flatMap(g=>[g.home_slot_label&&!g.home_entry_id?"":g.home_name,g.away_slot_label&&!g.away_entry_id?"":g.away_name]).filter(Boolean))].sort();
    assert.deepEqual((await p.locator("#my-team option").allTextContents()).slice(1).sort(),names,d.name);
    assert.equal(await p.evaluate(()=>scheduleGames().length),expected.length,d.name);
    assert.equal(await p.locator("[data-game]").count(),expected.length,d.name);
   }
   await p.locator("#schedule-division").selectOption("");assert.equal(await p.evaluate(()=>allGames().length),722);
  });
  await check("a club's 3v3 and X-Ball entries stay separate in games, scouting, calendar and saved copies",async p=>{
   await merge(p);const unchanged=await p.evaluate(()=>JSON.stringify([S.games,S.tally,S.results,S.matches,S.scout]));
   await p.evaluate(()=>{set({tab:"more",more:"schedule"});setScheduleDivision("9322:28302");setMyTeam("Edmonton Impact");Date.now=()=>Date.parse("2026-11-10T12:00:00");});
   const got=await p.evaluate(()=>({games:teamGames(S.myTeam).map(g=>g.division_id),scout:teamDay(S.myTeam).flatMap(d=>d.scout.map(x=>x.g.division_id)),
    calendar:calItems().filter(i=>i.id.startsWith("g|")).map(i=>gameById(i.id.slice(2)).division_id),plan:dayPlanText(S.myTeam)}));
   assert.deepEqual(got.games,["28302","28302","28302"]);assert(got.scout.length&&got.scout.every(id=>id==="28302"));assert(got.calendar.every(id=>id==="28302"));assert(!got.plan.includes("Wednesday"));
   const saved=await p.evaluate(()=>copyPayload("all"));assert.equal(JSON.parse(saved).data.scheduleDivision,"9322:28302");
   await p.reload();assert.equal(await p.evaluate(()=>S.scheduleDivision),"9322:28302");
   await p.evaluate(()=>setScheduleDivision("9322:28336"));assert.equal(await p.evaluate(()=>S.myTeam),"Edmonton Impact");assert.equal(await p.evaluate(()=>teamGames(S.myTeam).length),6);
   await p.evaluate(()=>setScheduleDivision("9322:28306"));assert.equal(await p.evaluate(()=>S.myTeam),"");
   assert.equal(await p.evaluate(()=>JSON.stringify([S.games,S.tally,S.results,S.matches,S.scout])),unchanged);
   await p.evaluate(raw=>loadCopy("replace",raw),saved);assert.equal(await p.evaluate(()=>S.scheduleDivision),"9322:28302");
   assert.equal(await p.evaluate(()=>teamGames(S.myTeam).length),3);
  });
  await check("typed and pasted games keep the chosen division; unknown divisions stay separate",async p=>{
   await merge(p);await p.evaluate(()=>{
    setScheduleDivision("9322:28306");newGame();setGameField("h","Test squad");setGameField("a","Test opponents");saveGame();
    S.gamePaste="Thu 8:00 AM Test squad vs Other squad";readSchedule();
    setScheduleDivision("9322:28305");newGame();setGameField("h","Test squad");setGameField("a","Test opponents");saveGame();
    setScheduleDivision("");S.gamePaste="Sun 8:00 AM Unassigned team vs Test opponents";readSchedule();
   });
   const rows=await p.evaluate(()=>S.games.filter(g=>g.h==="Test squad"));assert.equal(rows.length,3);
   assert(rows.every(g=>g.layout==="nwc"),"typed and pasted World Cup division games retain the source event's layout");
   assert.equal(rows.filter(g=>g.division_id==="28306").length,2);assert.equal(rows.filter(g=>g.division_id==="28305").length,1);
   await p.evaluate(()=>setScheduleDivision("unrecorded"));const unknown=await p.evaluate(()=>scheduleGames());assert.equal(unknown.length,1);assert.equal(unknown[0].h,"Unassigned team");
   const r=await p.evaluate(()=>({valid:copyDataError(JSON.parse(copyPayload("all")).data)||"",bad:copyDataError({scheduleDivision:{bad:true}})}));assert.equal(r.valid,"");assert(r.bad);
   await p.evaluate(()=>{S.games.push({id:"unknown-division",d:"2026-11-15",t:"09:00",h:"Unknown A",a:"Unknown B",division:{bad:true},event_id:{bad:true},division_id:[]});set({tab:"more",more:"schedule"});});
   assert.equal(await p.evaluate(()=>scheduleGames().length),2,"unreadable extra division metadata stays unassigned without crashing");
   await p.evaluate(()=>{setScheduleDivision("9322:28336");set({tab:"more",more:"schedule"});});assert((await p.locator("#my-team option").allTextContents()).includes("Rejects"));
  });
  await check("the public directory groups entries under the correct division without merging same-name clubs",async p=>{
   await p.evaluate(()=>set({tab:"more",more:"worldcup"}));
   const source=require("../web/world-cup-data.js").read();
   const groups=await p.locator(".cup-division-group").evaluateAll(gs=>gs.map(g=>({id:g.dataset.division,entries:[...g.querySelectorAll("[data-entry]")].map(e=>e.dataset.entry)})));
   assert(groups.length>0);assert.equal(groups.reduce((n,g)=>n+g.entries.length,0),30);
   for(const g of groups)for(const id of g.entries){const e=source.entries.find(e=>e.entry_id===id);assert.equal(g.id,e.event_id+":"+e.division_id);}
   await p.locator("#cup-find").fill("Edmonton Impact");const entries=source.entries.filter(e=>e.team_name==="Edmonton Impact");
   assert.equal(await p.locator(".cup-division-group").count(),new Set(entries.map(e=>e.event_id+":"+e.division_id)).size);
   assert.deepEqual((await p.locator("#cup-results [data-entry]").evaluateAll(es=>es.map(e=>e.dataset.entry))).sort(),entries.map(e=>e.entry_id).sort());
  });
  for(const size of [{width:390,height:844},{width:768,height:1024},{width:1024,height:768}])await check("Nexus import, Schedule and suggested Scout notes fit "+size.width+"×"+size.height,async p=>{
   await p.evaluate(()=>set({tab:"more",more:"nexus"}));
   await p.locator("#copyIn").fill(raw);await p.getByRole("button",{name:"Merge it in",exact:true}).click();
   assert.equal(await p.evaluate(()=>allGames().length),722);
   await p.evaluate(()=>set({tab:"more",more:"schedule"}));
   assert.match(await p.locator("#root").innerText(),/722 games/);assert.match(await p.locator("#root").innerText(),/Sunday,? Nov(?:ember)? 15/i);
   const choices=await p.locator("#my-team option").allTextContents();assert(!choices.some(t=>/WNXL Semifinals/.test(t)));assert(choices.includes("Rejects"));
   await p.locator("#schedule-division").selectOption("9322:28306");
   assert.equal(await p.locator("[data-game]").count(),166);assert.equal(await p.locator("#schedule-division").inputValue(),"9322:28306");
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(process.env.HANDOFF_SHOTS){fs.mkdirSync(process.env.HANDOFF_SHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.HANDOFF_SHOTS,`schedule-${size.width}.png`)});}
   await p.evaluate(()=>{setPitTeam("right","Tampa Bay Damage");set({tab:"scout",scoutTab:"matchup",pitOpen:"right"});});
   const summary=p.locator("summary").filter({hasText:"Suggested film note · VERIFY"}).first();await summary.click();
   assert.match(await p.locator("#root").innerText(),/Confidence: VERIFY/);
   assert.equal(await p.locator('select[onchange*="editScoutPlayer"]').first().inputValue(),"dorito / front");
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const box=await summary.boundingBox();assert(box.height>=44,"film-note toggle is a touch target");
   if(process.env.HANDOFF_SHOTS)await p.screenshot({path:path.join(process.env.HANDOFF_SHOTS,`scout-${size.width}.png`)});
  },size);
 }finally{await browser.close();server.close();}
 console.log(`${passed} passed, ${failed} failed`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});

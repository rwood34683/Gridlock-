"use strict";
const assert = require("node:assert/strict"), path = require("node:path"), fs = require("node:fs");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve"), SEED = require("../scripts/seed");
(async () => {
  const server = createServer({root:path.resolve(__dirname,"../web")});
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let passed=0, failed=0;
  async function check(name, run, size={width:390,height:844}) {
    const c=await browser.newContext({viewport:size,serviceWorkers:"block"}), p=await c.newPage(), errors=[];
    p.on("pageerror", e=>errors.push(e.message));
    try {
      await p.goto(url); await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED); await p.reload();
      await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;render();});
      await run(p); assert.deepEqual(errors,[]); passed++; console.log("PASS "+name);
    } catch(e) {failed++;console.error("FAIL "+name+": "+e.stack);} finally {await c.close();}
  }
  const records=p=>p.evaluate(()=>JSON.stringify({matches:S.matches,matchId:S.matchId,point:S.point,results:S.results,tally:S.tally,breakouts:S.breakouts,playerChecks:S.playerChecks,lineups:S.lineups,scout:S.scout,right:S.right,left:S.left,syncOn:S.syncOn}));
  try {
    await check("empty sign-in opens Home behind format; no automatic tutorial or match",async p=>{
      await p.evaluate(()=>{openSheet({vs:""});S.right={name:""};S.left={name:""};S.fmtAsk=true;afterSignIn();});
      assert.match(await p.locator(".main").innerText(),/Your format/i);
      assert.equal(await p.getByRole("button",{name:"Home",exact:true}).count(),0);
      await p.evaluate(()=>fmtDone());
      assert.equal(await p.evaluate(()=>S.tab),"home");
      assert.equal(await p.locator(".home-match").count(),0);
      assert.match(await p.locator(".main").innerText(),/What do you want to do/);
      assert.equal(await p.evaluate(()=>!!S.showTutorial),false);
      assert.equal(await p.locator(".field-wrap").count(),0);
    });
    await check("Home and all four cards preserve the current sheet and reload resumes Tally",async p=>{
      const before=await records(p);
      for(const [title,tab] of [["Playbook","playbook"],["Tally","tally"],["Scout","scout"],["Sightlines","sightlines"]]) {
        await p.getByRole("button",{name:"Home",exact:true}).click();
        await p.locator(".home-tool").filter({has:p.locator("b",{hasText:title})}).click();
        assert.equal(await p.evaluate(()=>S.tab),tab); assert.equal(await records(p),before);
      }
      await p.getByRole("button",{name:"Tally",exact:true}).click();await p.reload();
      assert.equal(await p.evaluate(()=>S.tab),"tally");assert.equal(await records(p),before);
      await p.evaluate(()=>afterSignIn());assert.equal(await p.evaluate(()=>S.tab),"tally");
    });
    await check("Home is a dashboard: one card a More tool, grouped as the menu, each opening its screen without touching the sheet",async p=>{
      const before=await records(p),rows=await p.evaluate(()=>MORE_GROUPS.map(([t,r])=>[t,r.filter(x=>x[0]!=="home").map(x=>[x[0],x[1]])]));
      await p.getByRole("button",{name:"Home",exact:true}).click();
      assert.deepEqual(await p.locator(".home-group h2").allTextContents(),rows.filter(r=>r[1].length).map(r=>r[0]));
      for(const [,list] of rows) for(const [k,n] of list){
        await p.getByRole("button",{name:"Home",exact:true}).click();
        await p.locator(".home-group .home-tool").filter({has:p.locator("b",{hasText:new RegExp("^"+n.replace(/[.*+?^${}()|[\]\\&]/g,"\\$&")+"$")})}).click();
        assert.deepEqual(await p.evaluate(()=>[S.tab,S.more]),["more",k],n+" card opens its screen");
        assert.equal(await records(p),before,n+" card changes nothing logged");
      }
      await p.getByRole("button",{name:"Home",exact:true}).click();
      assert.equal(await p.locator(".home-group .home-tool").count(),rows.reduce((a,[,l])=>a+l.length,0),"one card a tool, no more");
      assert.doesNotMatch(await p.locator(".main").innerText(),/\bClasses\b|\bLeague\b|Before you play them/,"rows hidden from the menu stay off Home");
    });
    await check("continue match keeps score point and observations",async p=>{
      const before=await records(p);await p.getByRole("button",{name:"Home",exact:true}).click();
      assert.match(await p.locator(".home-match").innerText(),/vs Rejects[\s\S]*2–1 · Point 4/);
      await p.getByRole("button",{name:"Continue match",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.tab),"tally");assert.equal(await records(p),before);
    });
    await check("watched sheet is labelled separately and continues in Scout",async p=>{
      await p.evaluate(()=>{Object.assign(curMatch(),{watch:true,home:"Practice Red",away:"Practice Blue"});openCoachHome();});
      const before=await records(p),text=await p.locator(".home-match").innerText();
      assert.match(text,/Watching another game/);assert.match(text,/Practice Red v Practice Blue/);assert.doesNotMatch(text,/Your match/);
      await p.getByRole("button",{name:"Continue scouting",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.tab),"scout");assert.equal(await records(p),before);
    });
    await check("finished match opens its review and another field requires an explicit tap",async p=>{
      await p.evaluate(()=>{curMatch().timeUp=true;openCoachHome();});
      await p.getByRole("button",{name:"Review match",exact:true}).click();assert.equal(await p.evaluate(()=>S.more),"matches");
      await p.evaluate(()=>{delete curMatch().timeUp;S.layoutKey="tby";openCoachHome();});
      assert.equal(await p.evaluate(()=>S.layoutKey),"tby");
      await p.getByRole("button",{name:"Open match field",exact:true}).click();
      assert.deepEqual(await p.evaluate(()=>[S.tab,S.layoutKey,S.matchId]),["tally","lso","shot-m1"]);
    });
    await check("unknown team has no invented schedule; names render as text",async p=>{
      await p.evaluate(()=>{S.myTeam='<b id="unsafe">Test team</b>';curMatch().vs='<img id="unsafe2">';openCoachHome();});
      assert.equal(await p.locator("#unsafe,#unsafe2").count(),0);
      assert.match(await p.locator(".main").innerText(),/No schedule loaded for <b id="unsafe">Test team<\/b>/);
      assert.doesNotMatch(await p.locator(".main").innerText(),/Next scheduled:/);
      await p.getByRole("button",{name:"Open schedule",exact:true}).click();assert.equal(await p.evaluate(()=>S.more),"schedule");
    });
    await check("next scheduled game is from loaded future games and includes its day",async p=>{
      await p.evaluate(()=>{Date.now=()=>Date.parse("2026-11-10T12:00:00");S.myTeam="Houston Heat";openCoachHome();});
      const expected=await p.evaluate(()=>{const g=teamGames(S.myTeam).find(g=>gameAt(g)>=Date.now());return `${across(g,S.myTeam)} · ${dayName(g.d)} ${gameClock(g)}`;});
      assert.ok((await p.locator(".main").innerText()).includes("Next scheduled: v "+expected));
      await p.evaluate(()=>{Date.now=()=>Date.parse("2099-01-01");render();});
      assert.match(await p.locator(".main").innerText(),/No upcoming game/);
    });
    await check("Home links use existing access gates and account controls",async p=>{
      await p.evaluate(()=>{S.billing={plan:"free"};openCoachHome();});
      const expected=await p.evaluate(()=>!!gateFor("scout"));
      await p.locator(".home-tool").filter({hasText:"Scout"}).click();assert.equal(await p.evaluate(()=>!!gateKey()),expected);
      await p.getByRole("button",{name:"Home",exact:true}).click();await p.locator(".home-tool").filter({hasText:"Reports"}).click();assert.equal(await p.evaluate(()=>S.more),"reports");
      await p.getByRole("button",{name:"Home",exact:true}).click();await p.locator(".home-tool").filter({hasText:"Account & backups"}).click();assert.equal(await p.evaluate(()=>S.more),"nexus");
      await p.getByRole("button",{name:"Home",exact:true}).click();await p.getByRole("button",{name:"Help for this screen"}).click();assert.equal(await p.evaluate(()=>S.helpFor),"home");
    });
    for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1024,height:768}]) await check(`Home fits ${size.width}x${size.height}, named 44px controls, no external requests`,async p=>{
      const requests=[];p.on("request",r=>{if(!r.url().startsWith(url)) requests.push(r.url());});
      await p.getByRole("button",{name:"Home",exact:true}).click();
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const bad=await p.locator("button").evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.width && r.height && (r.width<44 || r.height<44 || !(e.getAttribute("aria-label")||e.textContent).trim());}).map(e=>e.textContent));
      assert.deepEqual(bad,[]);assert.deepEqual(requests,[]);
      assert.equal(await p.locator(".ctx__home").getAttribute("aria-current"),"page");
      if(process.env.CAPTURE_HOME){const dir=path.resolve(__dirname,"../docs/screenshots/coach-home");fs.mkdirSync(dir,{recursive:true});await p.screenshot({path:path.join(dir,`${size.width}x${size.height}.png`)});}
    },size);
  } finally {await browser.close();await new Promise(r=>server.close(r));}
  console.log(`${passed}/${passed+failed} coach home checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

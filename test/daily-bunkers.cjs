"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),seed=require("../scripts/seed");
(async()=>{
  const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
  async function check(name,fn,viewport={width:390,height:844},timezoneId="America/New_York"){
    const c=await browser.newContext({viewport,timezoneId,serviceWorkers:"block"}),p=await c.newPage(),errors=[];
    p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
    try{
      await p.goto(process.env.APP_URL);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},seed);await p.reload();
      await p.evaluate(()=>{
        S.layoutKey="mwo";S.fmtAsk=false;S.tab="more";S.more="reports";S.statMatch="";S.statDay="";S.statView="map";S.statMetric="visits";S.statSide="us";S.statTeam="";S.statAsPlayed=true;
        S.matches=[{id:"a",vs:"First fixture",layout:"mwo",at:Date.parse("2026-11-10T15:00:00Z"),end:"left"},
          {id:"b",vs:"Late fixture",layout:"mwo",at:Date.parse("2026-11-11T04:30:00Z"),end:"left"},
          {id:"c",vs:"Next day fixture",layout:"mwo",at:Date.parse("2026-11-11T15:00:00Z"),end:"left"},
          {id:"unknown",vs:"Unknown day",layout:"mwo",at:null},
          {id:"w",watch:true,home:"Watch A",away:"Watch B",layout:"mwo",at:Date.parse("2026-11-10T15:00:00Z")},
          {id:"foreign",vs:"Other field",layout:"lso",at:Date.parse("2026-11-10T15:00:00Z")}];
        S.matchId="a";S.point=6;S.right={name:"First fixture"};S.results=[{m:"a",pt:1,won:"us"}];
        S.tally=[];S.moves=[];S.breakouts=[];S.calls=[];S.arrivalSightings=[];S.arrivalShots=[];S.voiceEvents=[];S.scout={};
        const bl=curLayout().bunkers, names=["Hot Route","SOB","God","Bingo","Turret","100","200","Dallas"];
        window.dailyIds=bl.slice(0,8).map(b=>b.id);S.bunkerCalls={mwo:Object.fromEntries(dailyIds.map((id,i)=>[id,names[i]]))};
        const row=(id,m,b,side="us",alive=true,pt=1)=>({id,m,pt,side,bunker:dailyIds[b],alive,layout:"mwo",at:Date.parse("2026-11-12T17:00:00Z")});
        [5,2,2,1,1,1,1,1].forEach((n,i)=>{for(let j=0;j<n;j++)S.breakouts.push(row("r"+i+"-"+j,i%2?"b":"a",i,"us",j>=[2,1,0,1,0,1,0,0][i],j+1));});
        S.breakouts.push(row("next","c",0),row("undated","unknown",0),row("watched","w",0),{...row("other","foreign",0),layout:"lso"},row("their","a",1,"them",false));
        save(S);render();
      });
      await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
    }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}
  }
  const open=async p=>{await p.getByRole("button",{name:"Daily bunker table",exact:true}).click();};
  const rows=p=>p.locator(".tbl--daily tbody tr").evaluateAll(rs=>rs.map(r=>[r.cells[0].innerText.trim(),+r.cells[1].innerText,r.cells[2].innerText]));
  const total=p=>p.locator(".tbl--daily tfoot td").nth(1).innerText();
  try{
    await check("daily table matches the photo's 5 of 14, sorted counts and one-decimal shares",async p=>{
      await open(p);assert.equal(await p.locator("#stat-day").inputValue(),"2026-11-10");
      const r=await rows(p);assert.equal(r.length,8);assert.match(r[0][0],/Hot Route/);assert.deepEqual(r.map(x=>x.slice(1)),[[5,"35.7%"],[2,"14.3%"],[2,"14.3%"],...[1,1,1,1,1].map(()=>[1,"7.1%"])]);
      assert.equal(await total(p),"14");assert.match(await p.locator(".tbl--daily thead").textContent(),/Share of 14/);
      assert.doesNotMatch(await p.locator("main").innerText(),/NaN|Infinity|Invalid Date/);
    });
    await check("Shot there is a separate total and does not mix visits into its percentages",async p=>{
      await open(p);await p.getByRole("button",{name:"Shot there",exact:true}).click();
      assert.equal(await total(p),"5");assert.deepEqual((await rows(p)).map(x=>x.slice(1)),[[2,"40.0%"],[1,"20.0%"],[1,"20.0%"],[1,"20.0%"]]);
      assert.match(await p.locator(".tbl--daily thead").textContent(),/Share of 5/);
      await p.getByRole("button",{name:"Went there",exact:true}).click();assert.equal(await total(p),"14");
    });
    await check("a late evening match stays on its local day even when notes were entered two days later",async p=>{
      await open(p);assert.match(await p.locator("#stat-match").textContent(),/Late fixture/);assert.doesNotMatch(await p.locator("#stat-match").textContent(),/Next day fixture|Unknown day|Watch A|Other field/);
      await p.locator("#stat-day").selectOption("2026-11-11");assert.equal(await total(p),"1");assert.doesNotMatch(await p.locator("#stat-match").textContent(),/Late fixture/);
    });
    await check("both sides of the DST fallback stay on the recorded November 1 day",async p=>{
      await p.evaluate(()=>{S.matches[0].at=Date.parse("2026-11-01T05:30:00Z");S.matches[1].at=Date.parse("2026-11-01T06:30:00Z");render();});
      await open(p);assert.equal(await p.locator("#stat-day").inputValue(),"2026-11-01");assert.equal(await total(p),"14");
    });
    await check("all invalid dates and orphan entries remain in Date not recorded, never today",async p=>{
      await p.evaluate(()=>{for(const [i,at] of [null,"not-a-date",1e100,0,-5].entries()){
        S.matches.push({id:"bad"+i,vs:"Bad date "+i,at,layout:"mwo"});S.breakouts.push({id:"bad"+i,m:"bad"+i,pt:1,side:"us",bunker:dailyIds[1],layout:"mwo",alive:true});}
        S.breakouts.push({id:"orphan",m:"no-match",pt:1,side:"us",bunker:dailyIds[0],layout:"mwo",alive:true});render();});
      await open(p);await p.locator("#stat-day").selectOption("undated");assert.equal(await total(p),"7");
      assert.doesNotMatch(await p.locator("#stat-day").innerText(),/1970|Invalid/);assert.match(await p.locator("main").innerText(),/Date not recorded/);
      assert.equal(await p.evaluate(()=>REPORT_CSV["daily-bunkers"]()[1].split("\r\n")[1].startsWith(",")),true,"unknown date is blank in the CSV");
    });
    await check("match, opponent and side filters change the complete denominator and preserve records",async p=>{
      const before=await p.evaluate(()=>JSON.stringify([S.matches,S.results,S.breakouts,S.tally,S.moves,S.matchId,S.point]));
      await open(p);await p.getByRole("button",{name:"Theirs",exact:true}).click();assert.equal(await total(p),"1");
      await p.getByRole("button",{name:"Yours",exact:true}).click();await p.getByText("Match, opponent & ends",{exact:true}).click();
      await p.locator("#stat-team").selectOption("Late fixture");assert.equal(await total(p),"5");
      assert.equal(await p.locator("#stat-filters").evaluate(el=>el.open),true,"changing one filter keeps the other controls open");
      await p.locator("#stat-match").selectOption("a");assert.equal(await total(p),"9");
      await p.getByRole("button",{name:"Daily table",exact:true}).click();assert.equal(await p.locator("#stat-match").inputValue(),"a","reselecting the active view does not reset its filters");
      await p.locator("#stat-day").selectOption("2026-11-11");assert.equal(await p.locator("#stat-match").inputValue(),"");assert.equal(await total(p),"1");
      assert.equal(await p.evaluate(()=>JSON.stringify([S.matches,S.results,S.breakouts,S.tally,S.moves,S.matchId,S.point])),before);
    });
    await check("the table and heat map use identical filtered counts, including a zero-data day",async p=>{
      await open(p);const counts=await p.evaluate(()=>Object.fromEntries(dailyBunkerData().rows.map(r=>[r.id,r.n])));
      await p.getByRole("button",{name:"Heat map",exact:true}).click();assert.deepEqual(await p.locator("#stats-map .stat-heat").evaluateAll(rs=>Object.fromEntries(rs.map(r=>[r.dataset.bunker,+r.dataset.count]))),counts);
      await p.evaluate(()=>{S.statDay="2040-01-01";S.statView="daily";render();});
      assert.equal(await p.locator(".tbl--daily").count(),0);assert.match(await p.locator("#daily-bunker-empty").innerText(),/No bunker visits/);assert.doesNotMatch(await p.locator("main").innerText(),/NaN|Infinity/);
    });
    await check("switching table and map retains the day, match and activity, and filters work by keyboard",async p=>{
      await open(p);const summary=p.locator("#stat-filters summary");await summary.focus();await p.keyboard.press("Enter");
      await p.locator("#stat-match").selectOption("a");await p.getByRole("button",{name:"Shot there",exact:true}).click();
      const before=await rows(p);assert.equal(await total(p),"2");
      await p.getByRole("button",{name:"Heat map",exact:true}).click();await p.getByRole("button",{name:"Daily table",exact:true}).click();
      assert.equal(await p.locator("#stat-match").inputValue(),"a");assert.equal(await p.locator("#stat-day").inputValue(),"2026-11-10");assert.deepEqual(await rows(p),before);
      await summary.focus();await p.keyboard.press("Space");await p.getByRole("button",{name:"Went there",exact:true}).click();
      assert.equal(await p.locator("#stat-filters").evaluate(el=>el.open),false,"a closed filter panel stays closed too");
    });
    await check("all nonzero bunkers stay in the table and denominator, with an explicit All days view",async p=>{
      await p.evaluate(()=>{S.breakouts.push({id:"ninth",m:"a",pt:1,side:"us",bunker:curLayout().bunkers[8].id,layout:"mwo",alive:true});render();});
      await open(p);assert.equal((await rows(p)).length,9);assert.equal(await total(p),"15");assert.equal((await rows(p))[0][2],"33.3%");
      await p.locator("#stat-day").selectOption("");assert.equal(await total(p),"17","all days includes both dated matches and the unknown day");
    });
    await check("relaunch clears daily selections without changing the saved match data",async p=>{
      await open(p);await p.locator("#stat-day").selectOption("undated");const before=await p.evaluate(()=>JSON.stringify([S.matches,S.breakouts]));
      assert.equal(await p.evaluate(()=>!!copyDataError(JSON.parse(localStorage.getItem(STORE_KEY)))),false,"the saved fixture is a valid season");
      await p.reload();assert.deepEqual(await p.evaluate(()=>[S.statDay,S.statMatch,S.statView,S.statFilters]),["","","map",false]);
      assert.equal(await p.evaluate(()=>JSON.stringify([S.matches,S.breakouts])),before);
    });
    await check("shared text and CSV match the day's table, and typed bunker names stay inert",async p=>{
      await open(p);await p.evaluate(()=>{S.bunkerCalls.mwo[dailyIds[0]]='=HYPERLINK("bad") <img src=x onerror="window.dailyBad=1">';window.gridlockShare=undefined;render();});
      assert.equal(await p.locator(".tbl--daily img").count(),0);assert.equal(await p.evaluate(()=>window.dailyBad),undefined);
      const csv=await p.evaluate(()=>REPORT_CSV["daily-bunkers"]()[1]);assert.match(csv,/2026-11-10/);assert.match(csv,/,5,14,35.7/);assert.match(csv,/'=HYPERLINK/);
      assert.equal(await p.evaluate(()=>csvRows(REPORT_CSV["daily-bunkers"]()[1])),8);
      await p.getByRole("button",{name:"Share daily table",exact:true}).click();const text=await p.locator("#handoff-text").inputValue();
      assert.match(text,/5 · 35.7% of 14/);assert.match(text,/Went there: 14 recorded/);assert.doesNotMatch(text,/Next day fixture/);
    });
    await check("a day with only scored points offers no made-up locations or empty export",async p=>{
      await p.evaluate(()=>{S.breakouts=[];render();});await open(p);
      assert.equal(await p.locator(".tbl--daily").count(),0);assert.equal(await p.getByRole("button",{name:"Spreadsheet (CSV)",exact:true}).count(),0);
      assert.equal(await p.evaluate(()=>dailyBunkerData().total),0);
    });
    for(const [name,viewport] of [["phone",{width:390,height:844}],["phone-landscape",{width:844,height:390}],["tablet",{width:820,height:1180}],["laptop",{width:1366,height:900}]]){
      await check(name+" fits all three daily columns without sideways scrolling",async p=>{
        await open(p);await p.locator(".tbl--daily").scrollIntoViewIfNeeded();
        assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert(await p.locator(".tbl--daily").evaluate(el=>el.scrollWidth<=el.parentElement.clientWidth+1));
        const out=path.resolve("work/daily-bunkers");fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+".png")});
        if(name==="phone"){
          await p.getByRole("button",{name:"Shot there",exact:true}).click();await p.locator("#stat-day").scrollIntoViewIfNeeded();
          await p.screenshot({path:path.join(out,"phone-outs.png")});
        }
      },viewport);
    }
  }finally{await browser.close();}
  console.log(`${passed}/${passed+failed} daily bunker checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

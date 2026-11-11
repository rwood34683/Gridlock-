"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const seed=require("../scripts/seed");
(async()=>{
  const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
  async function check(name,fn,viewport={width:390,height:844}){
    const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[];
    p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
    try{
      await p.goto(process.env.APP_URL);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},seed);await p.reload();
      await p.evaluate(()=>{
        S.layoutKey="mwo";S.tab="more";S.more="stats";S.fmtAsk=false;S.statMatch="";S.statSide="both";S.statTeam="";S.statMetric="visits";S.statAsPlayed=true;
        S.matches=[{id:"m1",vs:"First fixture",layout:"mwo",at:1794409200000,end:"left"},{id:"m2",vs:"Second fixture",layout:"mwo",at:null,end:"left"},
          {id:"w",watch:true,home:"Watched A",away:"Watched B",layout:"mwo",at:1794409200000},{id:"away",vs:"Other field",layout:"lso",at:1794409200000}];
        S.matchId="m1";S.point=3;S.right={name:"First fixture"};S.results=[{m:"m1",pt:1,won:"us"},{m:"m1",pt:2,won:"them"}];
        S.tally=[];S.moves=[];S.breakouts=[];S.calls=[];S.arrivalSightings=[];S.arrivalShots=[];S.voiceEvents=[];S.scout={};
        const [a,b]=curLayout().bunkers;window.heatIds=[a.id,b.id];
        const row=(id,m,pt,side,bunker,alive=true)=>({id,m,pt,side,bunker,alive,layout:"mwo",at:1794409200000});
        S.breakouts=[row("a","m1",1,"us",a.id),row("b","m1",2,"us",a.id,false),row("c","m1",1,"them",b.id,false),
          row("d","m2",1,"us",b.id),row("watched","w",1,"us",a.id),{...row("away","away",1,"us",a.id),layout:undefined},
          {...row("wrongfield","m1",1,"us",a.id),layout:"lso"}];
        save(S);render();
      });
      await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
    }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}
  }
  const rings=p=>p.locator("#stats-map .stat-heat").evaluateAll(rows=>Object.fromEntries(rows.map(r=>[r.dataset.bunker,+r.dataset.count])));
  const badges=p=>p.locator("#stats-map .stat-n text").allTextContents();
  try{
    await check("match heat excludes other matches, watched games and foreign fields without changing the match",async p=>{
      const before=await p.evaluate(()=>JSON.stringify([S.matchId,S.point,S.results,S.breakouts,S.tally,S.moves]));
      await p.getByLabel("Match",{exact:true}).selectOption("m1");const ids=await p.evaluate(()=>heatIds);
      assert.deepEqual(await rings(p),{[ids[0]]:2,[ids[1]]:1});assert.match(await p.locator("#heat-sample").innerText(),/2 points across 1 match/);
      assert.equal(await p.evaluate(()=>JSON.stringify([S.matchId,S.point,S.results,S.breakouts,S.tally,S.moves])),before);
      assert.doesNotMatch(await p.locator("#stat-match").innerText(),/Watched A|Other field/);
    });
    await check("Went there and Shot there each drive the map's exact numbers and scale",async p=>{
      await p.getByLabel("Match",{exact:true}).selectOption("m1");const ids=await p.evaluate(()=>heatIds);
      assert.deepEqual(await badges(p),["2","1"]);assert.match(await p.locator("#heat-legend").innerText(),/1–2/);
      await p.getByRole("button",{name:"Shot there",exact:true}).click();
      assert.deepEqual(await rings(p),{[ids[0]]:1,[ids[1]]:1});assert.deepEqual(await badges(p),["1","1"]);
      assert.match(await p.locator("#heat-legend").innerText(),/shot there.*1–1/);
      assert.equal(await p.locator("#stats-map .stat-heat[stroke-dasharray]").count(),2);
    });
    await check("a breakout and its matching tally out count once, including an out without a recorded visit",async p=>{
      await p.evaluate(()=>{const [a,b]=heatIds;S.breakouts=S.breakouts.filter(r=>r.id==="b");S.breakouts[0].player="Alex";
        S.tally=[{m:"m1",pt:2,side:"us",name:"Alex",shotAt:a,layout:"mwo"},{m:"m1",pt:2,side:"us",name:"Sam",shotAt:b,layout:"mwo"}];
        pickStatMatch("m1");set({statMetric:"outs"});});
      const ids=await p.evaluate(()=>heatIds);assert.deepEqual(await rings(p),{[ids[0]]:1,[ids[1]]:1});
      assert.deepEqual(await badges(p),["1","1"]);assert.match(await p.locator("#heat-sample").innerText(),/1 point across 1 match/);
      await p.evaluate(()=>{S.tally[0].layout="lso";render();});
      assert.deepEqual(await rings(p),{[ids[0]]:1,[ids[1]]:1},"an excluded out on another field cannot hide this field's breakout out");
      await p.evaluate(()=>{S.tally[0].layout="mwo";delete S.tally[0].side;render();});
      assert.deepEqual(await rings(p),{[ids[0]]:1,[ids[1]]:1},"an older own-side out without side still matches its breakout");
    });
    await check("side and opponent filters agree with the picked bunker and never append season totals",async p=>{
      await p.getByLabel("Against",{exact:true}).selectOption("Second fixture");
      await p.getByLabel("Match",{exact:true}).selectOption("m1");assert.equal(await p.evaluate(()=>S.statTeam),"");
      await p.getByRole("button",{name:"Yours",exact:true}).click();const ids=await p.evaluate(()=>heatIds);
      assert.deepEqual(await rings(p),{[ids[0]]:2});
      await p.evaluate(()=>statPick(heatIds[0]));const line=await p.locator(".stat-pick").innerText();
      assert.match(line,/your men went there 2 times, shot there 1/);assert.doesNotMatch(line,/you lost|they planted|they lost/);
      await p.getByRole("button",{name:"Theirs",exact:true}).click();assert.deepEqual(await rings(p),{[ids[1]]:1});
      await p.getByLabel("Match",{exact:true}).selectOption("");await p.getByRole("button",{name:"Both",exact:true}).click();
      await p.getByLabel("Against",{exact:true}).selectOption("Second fixture");assert.deepEqual(await rings(p),{[ids[1]]:1});
    });
    await check("switching ends combines the same job or keeps physical locations without rewriting rows",async p=>{
      const data=await p.evaluate(()=>{
        const a=curLayout().bunkers.find(b=>b.x<60).id,b=mirrorBunkerId(a),m=S.matches[0];m.swapEnds=true;
        S.breakouts=[1,2].map(pt=>({id:"end"+pt,m:"m1",pt,side:"us",bunker:ourEnd(pt,m)==="left"?a:b,layout:"mwo",alive:true}));
        pickStatMatch("m1");set({statAsPlayed:false});return {a,b,shown:shownBunker(a),rows:JSON.stringify(S.breakouts)};
      });
      assert.deepEqual(await rings(p),{[data.shown]:2});await p.getByRole("button",{name:"As played",exact:true}).click();
      assert.deepEqual(await rings(p),{[data.a]:1,[data.b]:1});assert.equal(await p.evaluate(()=>JSON.stringify(S.breakouts)),data.rows);
    });
    await check("scores alone draw no heat, and a zero-out selection does not borrow visit counts",async p=>{
      await p.getByLabel("Match",{exact:true}).selectOption("m2");await p.getByRole("button",{name:"Shot there",exact:true}).click();
      assert.deepEqual(await rings(p),{});assert.deepEqual(await badges(p),[]);assert.match(await p.locator("#heat-legend").innerText(),/No shot locations recorded/);
      await p.evaluate(()=>{S.breakouts=[];pickStatMatch("m1");});assert.deepEqual(await rings(p),{});
      assert.match(await p.locator("main").innerText(),/Scores alone cannot fill the heat map/);
    });
    await check("a deleted or invalid selected match stays empty instead of showing the season",async p=>{
      await p.getByLabel("Match",{exact:true}).selectOption("m1");
      await p.evaluate(()=>{S.matches=S.matches.filter(m=>m.id!=="m1");render();});assert.deepEqual(await rings(p),{});
      assert.match(await p.locator("main").innerText(),/match is no longer/);
      await p.evaluate(()=>set({statMatch:"not-a-match"}));assert.deepEqual(await rings(p),{});
      await p.getByLabel("Match",{exact:true}).selectOption("m2");assert.equal(Object.keys(await rings(p)).length,1);
    });
    await check("match names and missing dates stay readable and escaped",async p=>{
      await p.evaluate(()=>{S.matches[1].vs='<img src=x onerror="window.heatBad=1">';S.matches[1].at="not-a-date";render();});
      await p.getByLabel("Match",{exact:true}).selectOption("m2");
      assert.match(await p.locator("#heat-sample").innerText(),/Date not recorded/);assert.doesNotMatch(await p.locator("main").innerText(),/Invalid Date|Jan 1, 1970/);
      assert.equal(await p.evaluate(()=>window.heatBad),undefined);assert.equal(await p.locator('#heat-sample img').count(),0);
    });
    await check("Reports opens the current match's map and reload, restore and field changes clear that pick",async p=>{
      await p.evaluate(()=>set({more:"reports"}));await p.getByRole("button",{name:"Open match heat map",exact:true}).click();
      assert.equal(await p.locator("#stat-match").inputValue(),"m1");assert.equal(await p.evaluate(()=>S.matchId),"m1");
      await p.evaluate(()=>{clearScratch();render();});assert.equal(await p.locator("#stat-match").inputValue(),"");
      await p.evaluate(()=>{pickStatMatch("m1");set({layoutKey:"lso"});});assert.equal(await p.locator("#stat-match").inputValue(),"");
      await p.evaluate(()=>{set({layoutKey:"mwo"});pickStatMatch("m1");save(S);});await p.reload();assert.equal(await p.evaluate(()=>S.statMatch),"");
    });
    for(const [name,viewport] of [["phone",{width:390,height:844}],["tablet",{width:820,height:1180}],["laptop",{width:1366,height:900}]]){
      await check(name+" shows a usable heat map, legend and counts with no sideways scroll",async p=>{
        await p.evaluate(()=>{S.breakouts=[];const bl=curLayout().bunkers;
          [3,6,10,12,15,20,25].forEach((b,i)=>{for(let n=0;n<=i;n++)S.breakouts.push({id:b+"-"+n,m:"m1",pt:n+1,side:"us",bunker:bl[b].id,alive:n%3!==0,layout:"mwo"});});
          pickStatMatch("m1");set({statSide:"us"});});
        await p.locator('#heat-legend').scrollIntoViewIfNeeded();
        assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        const svg=await p.locator('#stats-map svg.field').boundingBox();assert(svg.width>200&&svg.height>180);
        const out=path.resolve("work/match-heat");fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+"-controls.png")});
        await p.locator('#stats-map').evaluate(el=>el.scrollIntoView({block:"center"}));
        await p.screenshot({path:path.join(out,name+".png")});
        await p.locator(".tbl__pick").first().click();assert(await p.locator(".stat-pick").isVisible());
        assert.match(await p.locator(".stat-pick").innerText(),/went there/);
      },viewport);
    }
  }finally{await browser.close();}
  console.log(`${passed}/${passed+failed} match heat checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

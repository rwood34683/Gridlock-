"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),seed=require("../scripts/seed");
(async()=>{
  const browser=await chromium.launch(launchOptions());let passed=0,failed=0;
  async function check(name,fn,viewport={width:390,height:844}){
    const c=await browser.newContext({viewport,serviceWorkers:"block"}),p=await c.newPage(),errors=[];
    p.setDefaultTimeout(8000);
    p.on("pageerror",e=>errors.push(e.message));p.on("dialog",d=>d.accept());
    try{
      await p.goto(process.env.APP_URL);await p.evaluate(s=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},seed);await p.reload();
      await p.evaluate(()=>{
        S.layoutKey="mwo";S.fmtAsk=false;S.tab="tally";S.tallySel=null;S.tallyDraft=null;S.tallyEdit=null;S.tallyStep="place";
        S.matches=[{id:"current",vs:"Test opponents",layout:"mwo",at:1794409200000},{id:"old",vs:"Test opponents",layout:"mwo",at:1794322800000}];
        S.matchId="current";S.point=2;S.right={name:"Test opponents"};S.left={name:"Other test team"};S.results=[{m:"current",pt:1,won:"us"}];
        S.scout={"Test opponents":{players:[{num:"7",name:"Test Seven",wire:"Snake"}],breaks:[]}};
        S.roster=[{name:"Reyes"},{name:"Lane"}];S.lineups={};S.pens=[];S.moves=[];S.arrivalSightings=[];S.arrivalShots=[];S.voiceEvents=[];S.calls=[];S.playerChecks=[];
        const [a,b,c]=curLayout().bunkers;window.detailIds=[a.id,b.id,c.id];
        const row=(id,side,player,bunker,alive,m="current",pt=2)=>({id,m,pt,side,player,bunker,alive,layout:"mwo",at:1794409200000,entry:"battle",movedTo:c.id,shootAt:b.id});
        S.breakouts=[row("p-us","us","Reyes",a.id,true),row("p-them","them","#7",b.id,false),row("p-unknown","them","",c.id,null),row("p-old","them","#9",b.id,true,"old",1)];
        S.tally=[{m:"current",pt:2,side:"us",name:"Reyes",layout:"mwo",at:1794409200100,how:"Traded",by:"#7",shotAt:c.id},
          {m:"current",pt:2,side:"them",name:"#7",layout:"mwo",at:1794409200000,shotAt:b.id}];
        syncTallyFive("current",2);save(S);render();
      });
      await fn(p);assert.deepEqual(errors,[]);passed++;console.log("PASS "+name);
    }catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}finally{await c.close();}
  }
  const state=p=>p.evaluate(()=>JSON.stringify([S.matchId,S.point,S.results,S.matches,S.breakouts,S.tally,S.playerChecks]));
  const popup=p=>p.locator("#player-details");
  const open=p=>p.locator('button.assign[onclick^="showNamedPlayer"]').filter({hasText:"Reyes"}).click();
  try{
    await check("Tally player tap opens recorded details without toggling the out or score",async p=>{
      const before=await state(p);await open(p);assert.equal(await popup(p).evaluate(e=>e.open),true);
      assert.equal(await popup(p).locator("#player-extra").evaluate(e=>e.open),false);await popup(p).getByText("More details",{exact:true}).click();
      const text=await popup(p).innerText();assert.match(text,/Reyes/);assert.match(text,/Dead/);assert.match(text,/Made it/);assert.match(text,/Traded/);assert.match(text,/#7/);assert.match(text,/Point 2/);
      await popup(p).getByRole("button",{name:"Close",exact:true}).click();assert.equal(await state(p),before);assert.equal(await popup(p).innerHTML(),"");
    });
    await check("Scout opens the same player's popup and Close keeps Scout and its match",async p=>{
      await p.evaluate(()=>set({tab:"scout",scoutTab:"breakouts"}));const before=await state(p);
      await p.locator('.assign[onclick^="showPlayerDetails"][onclick*="p-them"]').click();
      assert.match(await popup(p).innerText(),/Dead/);await popup(p).getByText("More details",{exact:true}).click();assert.match(await popup(p).innerText(),/Shot on the break/);
      assert.equal(await p.evaluate(()=>S.tab),"scout");await p.keyboard.press("Escape");assert.equal(await state(p),before);assert.equal(await p.evaluate(()=>S.tab),"scout");
    });
    await check("unnamed and untold players stay unknown instead of being declared alive",async p=>{
      await p.locator('[aria-label="Men on this point"] button[onclick^="showPlayerDetails"][onclick*="p-unknown"]').click();
      assert.match(await popup(p).innerText(),/Status not recorded/);assert.equal(await popup(p).getByRole("button",{name:"Dead",exact:true}).count(),1);
      await popup(p).getByText("More details",{exact:true}).click();assert.equal(await popup(p).getByRole("button",{name:"Edit break details on Tally",exact:true}).count(),1);
    });
    await check("taking back an out keeps the break chart in step and repeated Mark out is idempotent",async p=>{
      await p.evaluate(()=>showPlayerDetails("p-them"));const before=await p.evaluate(()=>JSON.stringify([S.results,S.matchId,S.point]));
      await popup(p).getByRole("button",{name:"Alive",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.breakouts.find(r=>r.id==="p-them").alive),true);assert.match(await popup(p).innerText(),/Alive/);
      await popup(p).getByRole("button",{name:"Dead",exact:true}).dblclick();
      assert.equal(await p.evaluate(()=>S.tally.filter(o=>o.m==="current"&&o.pt===2&&o.side==="them"&&o.name==="#7").length),1);
      assert.equal(await p.evaluate(()=>JSON.stringify([S.results,S.matchId,S.point])),before);
    });
    await check("out details save on the bound player even after another row changes the list order",async p=>{
      await open(p);await popup(p).getByText("More details",{exact:true}).click();await popup(p).getByText("Edit the out",{exact:true}).click();
      await p.evaluate(()=>S.tally.unshift({m:"old",pt:1,side:"us",name:"Reyes",at:1794322800000}));
      await popup(p).getByLabel("How out",{exact:true}).selectOption("Laned");assert.equal(await popup(p).locator("#player-out").evaluate(e=>e.open),true);
      await popup(p).getByLabel("Shot at",{exact:true}).selectOption(await p.evaluate(()=>detailIds[1]));
      const rows=await p.evaluate(()=>S.tally.filter(o=>o.name==="Reyes"));assert.equal(rows[0].how,undefined);assert.equal(rows[1].how,"Laned");
      await p.keyboard.press("Escape");await p.reload();assert.equal(await p.evaluate(()=>S.tally.find(o=>o.m==="current"&&o.name==="Reyes").how),"Laned");
    });
    await check("kept points are read without moving the active match and expose no current-point writes",async p=>{
      const before=await state(p);await p.evaluate(()=>showPlayerDetails("p-old"));
      assert.match(await popup(p).innerText(),/Point 1/);assert.match(await popup(p).innerText(),/Viewing a kept point/);
      assert.equal(await popup(p).getByRole("button",{name:"Dead",exact:true}).count(),0);
      await p.evaluate(()=>playerDetailOut(true));assert.equal(await state(p),before);
    });
    await check("two unnamed players sharing a bunker stay separate and deleted details cannot write",async p=>{
      await p.evaluate(()=>{const r=S.breakouts.find(r=>r.id==="p-unknown");S.breakouts.push({...r,id:"p-second",at:r.at+1});showPlayerDetails("p-unknown");});
      const first=await popup(p).locator("h2").innerText();await p.evaluate(()=>showPlayerDetails("p-second"));
      assert.notEqual(await popup(p).locator("h2").innerText(),first);
      await p.evaluate(()=>{S.breakouts=S.breakouts.filter(r=>r.id!=="p-second");});const before=await state(p);
      await p.evaluate(()=>playerDetailOut(true));assert.equal(await state(p),before);assert.equal(await popup(p).evaluate(e=>e.open),false);
    });
    await check("watched matches keep each team's same-named player on the correct side",async p=>{
      await p.evaluate(()=>{Object.assign(S.matches[0],{watch:true,home:"Other test team",away:"Test opponents"});S.breakouts[1].player="Reyes";S.tally[1].name="Reyes";S.tally[1].how="Laned";set({tab:"scout",scoutTab:"matchup"});});
      await p.locator('.assign[onclick^="showPlayerDetails"][onclick*="p-them"]').click();await popup(p).getByText("More details",{exact:true}).click();assert.match(await popup(p).innerText(),/Laned/);
      await popup(p).getByRole("button",{name:"Alive",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.tally.filter(o=>o.side==="us"&&o.name==="Reyes").length),1);
      assert.equal(await p.evaluate(()=>S.tally.filter(o=>o.side==="them"&&o.name==="Reyes").length),0);
    });
    await check("point, team, field and account changes close stale details and refuse their actions",async p=>{
      for(const change of ["point","team","field","account"]){
        await p.evaluate(()=>{set({tab:"tally",layoutKey:"mwo",point:2,email:"coach@team.com",right:{name:"Test opponents"}});showPlayerDetails("p-us");});
        const before=await p.evaluate(()=>JSON.stringify([S.breakouts,S.tally,S.results]));
        await p.evaluate(what=>{if(what==="point")S.point=3;if(what==="team")S.right={name:"Different team"};if(what==="field")S.layoutKey="lso";if(what==="account")S.email="another@example.test";playerDetailOut(false);},change);
        assert.equal(await popup(p).evaluate(e=>e.open),false);assert.equal(await p.evaluate(()=>JSON.stringify([S.breakouts,S.tally,S.results])),before);
      }
    });
    await check("Escape restores focus, Tab stays in the popup and the backdrop does not score",async p=>{
      await open(p);const before=await state(p);for(let i=0;i<12;i++){await p.keyboard.press("Tab");assert(await popup(p).evaluate(e=>e.contains(document.activeElement)));}
      await p.mouse.click(2,2);assert.equal(await state(p),before);assert(await popup(p).evaluate(e=>e.open));
      await p.keyboard.press("Escape");assert.match(await p.evaluate(()=>document.activeElement.getAttribute("onclick")||""),/showNamedPlayer/);
    });
    await check("typed player and out details are text, and opening never writes a new record",async p=>{
      await p.evaluate(()=>{S.breakouts[0].player='<img src=x onerror="window.detailBad=1">';S.tally[0].name=S.breakouts[0].player;S.tally[0].by='<svg onload="window.detailBad=1">';render();});
      const before=await state(p);await p.evaluate(()=>showPlayerDetails("p-us"));assert.equal(await popup(p).locator("img,svg").count(),0);
      assert.equal(await p.evaluate(()=>window.detailBad),undefined);assert.equal(await state(p),before);
    });
    await check("browsers without native dialogs keep a modal, focus and a working Close",async p=>{
      await popup(p).evaluate(e=>{e.showModal=undefined;e.close=undefined;});const before=await state(p);await open(p);
      assert(await popup(p).isVisible());assert.equal(await p.locator("#player-shade").isVisible(),true);
      assert.equal(await p.locator("#root").getAttribute("aria-hidden"),"true");
      for(let i=0;i<12;i++){await p.keyboard.press(i%2?"Shift+Tab":"Tab");assert(await popup(p).evaluate(e=>e.contains(document.activeElement)));}
      await p.locator('button.assign[onclick^="showNamedPlayer"]').first().evaluate(e=>e.focus());
      assert(await popup(p).evaluate(e=>e.contains(document.activeElement)));await p.mouse.click(2,2);assert.equal(await state(p),before);
      await p.keyboard.press("Escape");assert.equal(await popup(p).isVisible(),false);assert.equal(await p.locator("#root").getAttribute("aria-hidden"),null);
      assert.equal(await p.locator("#player-shade").isVisible(),false);assert.match(await p.evaluate(()=>document.activeElement.getAttribute("onclick")||""),/showNamedPlayer/);
      await open(p);await popup(p).getByRole("button",{name:"Close",exact:true}).click();assert.equal(await popup(p).innerHTML(),"");assert.equal(await state(p),before);
    });
    await check("explicit Edit break details opens the original record without duplicating it",async p=>{
      await p.evaluate(()=>set({tab:"scout",scoutTab:"breakouts"}));await p.evaluate(()=>showPlayerDetails("p-them"));
      await popup(p).getByText("More details",{exact:true}).click();await popup(p).getByRole("button",{name:"Edit break details on Tally",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.tallyEdit),"p-them");assert.equal(await p.evaluate(()=>S.tab),"tally");assert.equal(await popup(p).evaluate(e=>e.open),false);
      assert.equal(await p.evaluate(()=>S.breakouts.filter(r=>r.id==="p-them").length),1);
    });
    await check("quick observations save independently, resist double taps and do not invent a break or location",async p=>{
      await p.evaluate(()=>showPlayerDetails("p-unknown"));const before=await p.evaluate(()=>JSON.stringify([S.results,S.matchId,S.point,S.tally]));
      await popup(p).getByRole("button",{name:"Alive",exact:true}).click();
      await popup(p).getByRole("button",{name:"Shooting",exact:true}).dblclick();
      await popup(p).getByRole("button",{name:"Diving",exact:true}).click();
      const r=await p.evaluate(()=>S.playerChecks[0]);assert.equal(r.alive,true);assert.equal(r.shooting,true);assert.equal(r.diving,true);
      assert.equal(await p.evaluate(()=>S.breakouts.find(r=>r.id==="p-unknown").alive),null);
      assert.equal(await p.evaluate(()=>JSON.stringify([S.results,S.matchId,S.point,S.tally])),before);
      await p.waitForTimeout(360);await popup(p).getByRole("button",{name:"Diving",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.playerChecks[0].diving),false);assert.equal(await p.evaluate(()=>S.playerChecks.length),1);
      await p.reload();await p.evaluate(()=>showPlayerDetails("p-unknown"));assert.equal(await popup(p).getByRole("button",{name:"Shooting",exact:true}).getAttribute("aria-pressed"),"true");
    });
    await check("quick actions report a refused save instead of saying Saved",async p=>{
      await open(p);
      await p.evaluate(()=>{window.originalPlayerStore=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException("full","QuotaExceededError");};});
      await popup(p).getByRole("button",{name:"Shooting",exact:true}).click();
      assert.match(await popup(p).innerText(),/Not saved\. Keep this tab open/);
      assert.equal(await p.evaluate(()=>S.playerChecks[0].shooting),true);
      await p.evaluate(()=>{Storage.prototype.setItem=window.originalPlayerStore;});
      await popup(p).getByRole("button",{name:"Diving",exact:true}).click();
      assert.match(await popup(p).innerText(),/Saved/);assert.doesNotMatch(await popup(p).innerText(),/Not saved/);
    });
    await check("an unplaced named player records current status with no made-up bunker",async p=>{
      await p.evaluate(()=>showNamedPlayer("us","Lane"));const count=await p.evaluate(()=>S.breakouts.length);
      for(const name of ["Alive","Shooting","Diving","Dead"]) await popup(p).getByRole("button",{name,exact:true}).click();
      assert.equal(await p.evaluate(()=>S.breakouts.length),count);assert.equal(await p.evaluate(()=>S.playerChecks[0].breakoutId),"");
      const out=await p.evaluate(()=>S.tally.find(o=>o.name==="Lane"));assert(out);assert.equal(out.shotAt,undefined);
      assert.equal(await p.evaluate(()=>S.results.length),1);
    });
    await check("placing and renaming a checked player keeps one observation and one out",async p=>{
      await p.evaluate(()=>{showNamedPlayer("us","Lane");playerQuick("shooting",true);closePlayerDetails();S.breakouts.push({...S.breakouts[0],id:"p-lane",player:"Lane",alive:null});showPlayerDetails("p-lane");playerQuick("diving",true);});
      assert.equal(await p.evaluate(()=>S.playerChecks.length),1);
      assert.equal(await p.evaluate(()=>S.playerChecks[0].breakoutId),"p-lane");
      assert.equal(await p.evaluate(()=>S.playerChecks[0].shooting),true);
      await p.evaluate(()=>{playerQuick("alive",false);playerDetailField("how","Traded");playerDetailField("shotAt",detailIds[1]);editPlayerBreak();setDraft({player:"Lane Jr"});logBreakout();});
      assert.equal(await p.evaluate(()=>S.tally.filter(o=>o.name==="Lane").length),0);
      assert.equal(await p.evaluate(()=>S.tally.filter(o=>o.name==="Lane Jr").length),1);
      assert.equal(await p.evaluate(()=>S.tally.find(o=>o.name==="Lane Jr").how),"Traded");
      assert.equal(await p.evaluate(()=>S.tally.find(o=>o.name==="Lane Jr").shotAt===detailIds[1]),true);
      assert.equal(await p.evaluate(()=>S.playerChecks.filter(c=>c.player==="Lane Jr"&&c.diving&&c.shooting).length),1);
    });
    await check("Next player keeps the point and the previous player's saved choices",async p=>{
      await open(p);await popup(p).getByRole("button",{name:"Shooting",exact:true}).click();
      const before=await p.evaluate(()=>JSON.stringify([S.matchId,S.point,S.results,S.playerChecks]));
      await popup(p).getByRole("button",{name:"Next player →",exact:true}).click();assert.match(await popup(p).locator("h2").innerText(),/#7/);
      assert.equal(await p.evaluate(()=>JSON.stringify([S.matchId,S.point,S.results,S.playerChecks])),before);
    });
    await check("quick outs and existing Undo agree, and naming an unnamed dead player retains one current out",async p=>{
      await p.evaluate(()=>{showPlayerDetails("p-us");playerQuick("alive",false);closePlayerDetails();markOut("us","Reyes");showPlayerDetails("p-us");});
      assert.equal(await popup(p).getByRole("button",{name:"Alive",exact:true}).getAttribute("aria-pressed"),"true");
      await p.evaluate(()=>{closePlayerDetails();showPlayerDetails("p-unknown");playerQuick("alive",false);playerQuick("shooting",true);editPlayerBreak();setDraft({player:"#8",movedTo:""});logBreakout();});
      assert.equal(await p.evaluate(()=>S.tally.filter(o=>o.m==="current"&&o.pt===2&&o.name==="#8").length),1);
      assert.equal(await p.evaluate(()=>S.tally.find(o=>o.name==="#8").shotAt),undefined);
      assert.equal(await p.evaluate(()=>S.breakouts.find(r=>r.id==="p-unknown").alive),null);
      await p.evaluate(()=>showPlayerDetails("p-unknown"));assert.equal(await popup(p).getByRole("button",{name:"Shooting",exact:true}).getAttribute("aria-pressed"),"true");
      await popup(p).getByRole("button",{name:"Alive",exact:true}).click();
      assert.equal(await p.evaluate(()=>S.playerChecks.filter(c=>c.breakoutId==="p-unknown").length),1);
    });
    await check("quick observations survive whole-season replace and sheet merge without duplicates",async p=>{
      const data=await p.evaluate(()=>{showPlayerDetails("p-unknown");playerQuick("shooting",true);playerQuick("diving",true);return {copy:copyPayload("all"),sheet:sheetPayload(S.matchId)};});
      await p.evaluate(text=>{closePlayerDetails();S.playerChecks=[];set({tab:"more",more:"nexus"});document.getElementById("copyIn").value=text;loadCopy("replace");},data.copy);
      assert.equal(await p.evaluate(()=>S.playerChecks.length),1);assert.equal(await p.evaluate(()=>S.playerChecks[0].diving),true);
      for(let i=0;i<2;i++) await p.evaluate(text=>{set({tab:"more",more:"nexus"});document.getElementById("copyIn").value=text;loadCopy("merge");},data.sheet);
      assert.equal(await p.evaluate(()=>S.playerChecks.length),1);
      const bad=JSON.parse(data.copy);bad.data.playerChecks[0].alive="yes";
      assert(await p.evaluate(d=>!!copyDataError(d),bad.data));
    });
    await check("old point and stale quick actions cannot save and deleting a match removes its checks",async p=>{
      await p.evaluate(()=>{showPlayerDetails("p-old");playerQuick("shooting",true);});assert.equal(await p.evaluate(()=>S.playerChecks.length),0);
      await p.evaluate(()=>{showPlayerDetails("p-us");S.point=3;playerQuick("diving",true);});assert.equal(await p.evaluate(()=>S.playerChecks.length),0);
      await p.evaluate(()=>{S.point=2;showPlayerDetails("p-us");playerQuick("shooting",true);closePlayerDetails();});
      assert.equal(await p.evaluate(()=>JSON.parse(sheetPayload("current")).data.playerChecks.length),1);
      await p.evaluate(()=>delSheet("current"));assert.equal(await p.evaluate(()=>S.playerChecks.length),0);
    });
    for(const [name,viewport] of [["phone-small",{width:320,height:568}],["phone",{width:390,height:844}],["phone-landscape",{width:844,height:390}],["tablet",{width:820,height:1180}]]){
      await check(name+" fits the popup with reachable controls and no sideways scroll",async p=>{
        await open(p);assert(await popup(p).evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth;}));
        for(const name of ["Alive","Dead","Shooting","Diving"]){
          assert(await popup(p).getByRole("button",{name,exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return r.height>=44 && r.top>=0 && r.bottom<=innerHeight;}));
        }
        await popup(p).evaluate(e=>e.scrollTop=0);const out=path.resolve("work/player-details");fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+".png")});
      },viewport);
    }
  }finally{await browser.close();}
  console.log(`${passed}/${passed+failed} player detail checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

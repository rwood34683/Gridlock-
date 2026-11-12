"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const {chromium} = require("playwright-core"), {launchOptions} = require("../scripts/browser");
(async () => {
  const browser = await chromium.launch(launchOptions()), results = [];
  async function check(name, run, viewport = {width:375,height:667}) {
    const context = await browser.newContext({viewport, serviceWorkers:"block"}), p = await context.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(process.env.APP_URL);
      await p.evaluate(() => {
        S.entered=true; S.role="staff"; S.fmtDone=true; S.fmtAsk=false;
        S.tab="more"; S.more="format"; setFmt("div","Division 3");
        openSheet({vs:"Split fixture"}); S.tab="tally"; render();
      });
      await run(p); assert.deepEqual(errors,[]); results.push(true); console.log("PASS "+name);
    } catch(e) { results.push(false); console.error("FAIL "+name+": "+e.stack); }
    finally { await context.close(); }
  }
  async function enable(p, division="Division 3") {
    await p.evaluate(division => {S.tab="more"; S.more="format";setFmt("div",division);},division);
    await p.getByRole("button",{name:"Split deck",exact:true}).click();
    await p.evaluate(()=>{S.tab="tally";render();});
  }
  const state = p => p.evaluate(()=>({point:S.point,score:matchScore(),left:clockLeft(),end:S.clockEnd||0,phase:deckState()?.phase||null}));
  try {
    await check("explicit split mode uses the division's changeover and two-minute own break", async p => {
      for(const [div,seconds] of [["Semi-Pro",45],["Division 2",60],["Division 3",60],["Division 4",60],["Division 5",60]]) {
        await enable(p,div);
        assert.deepEqual(await p.evaluate(()=>[fmt().splitDeck,curMatch().splitDeck,curMatch().deckClock,deckRest()]),[1,1,seconds,120]);
        assert.match(await p.locator(".deck-panel").innerText(),/Which match is on/);
      }
    });
    await check("our result waits; the other point never changes our score or point", async p => {
      await enable(p); await p.getByRole("button",{name:"Our point is starting",exact:true}).click();
      await p.evaluate(()=>tapResult("us"));
      let s=await state(p);assert.equal(s.point,2);assert.equal(s.score.us,1);assert.equal(s.phase,"waiting");assert.equal(s.end,0);
      await p.evaluate(()=>{endPoint("them");nextPoint();});
      s=await state(p);assert.equal(s.point,2);assert.equal(s.score.them,0);assert.equal(s.score.us,1);
      await p.waitForTimeout(1550); await p.getByRole("button",{name:"Other point ended",exact:true}).click();
      s=await state(p);assert.equal(s.point,2);assert.equal(s.score.us,1);assert.equal(s.phase,"ready");assert(s.left>115&&s.left<=120,s.left);
      const end=s.end;await p.evaluate(()=>{deckAction("finished");deckAction("finished");});assert.equal((await state(p)).end,end,"double tap cannot restart the timer");
      await p.waitForTimeout(1550); await p.getByRole("button",{name:"Our point is starting",exact:true}).click();
      assert.equal((await state(p)).end,0);assert.equal((await state(p)).phase,"playing");
      await p.evaluate(()=>endPoint("them"));s=await state(p);assert.equal(s.point,3);assert.equal(s.score.them,1);assert.equal(s.phase,"waiting");
    });
    await check("a long other point gets only the changeover; a short one keeps our minimum", async p => {
      await enable(p,"Semi-Pro");
      await p.evaluate(()=>{endPoint("us");deckTurn.ended=Date.now()-150000;deckAction("finished");});
      assert((await state(p)).left>=44&&(await state(p)).left<=45);
      await p.evaluate(()=>{deckAction("ours");endPoint("them");deckTurn.ended=Date.now()-30000;deckAction("finished");});
      const left=(await state(p)).left;assert(left>=89&&left<=90,left);
      await p.evaluate(()=>{setBreakClock(45);deckAction("ours");endPoint("us");deckAction("finished");});
      assert((await state(p)).left>115,"short custom break cannot violate the published minimum in split mode");
    });
    await check("normal legacy short breaks remain normal until split mode is chosen", async p => {
      await p.evaluate(()=>{setFmt("clock",60);endPoint("us");});
      assert.equal(await p.locator(".deck-panel").count(),0);const s=await state(p);assert(s.left>=59&&s.left<=60);
      assert.equal(await p.evaluate(()=>splitDeck()),false);
    });
    await check("unpublished timing asks the coach and refuses an invented countdown", async p => {
      await enable(p,"Pro");
      assert.equal(await p.evaluate(()=>curMatch().deckClock),0);
      await p.evaluate(()=>{deckAction("waiting");deckAction("finished");});
      assert.equal((await state(p)).end,0);assert.equal((await state(p)).phase,"waiting");
      assert.match(await p.evaluate(()=>S.flash),/Choose your split-deck changeover/);
      await p.evaluate(()=>{setFmt("deckClock",60);deckAction("waiting");deckAction("finished");});
      assert((await state(p)).left>=59);
      await p.evaluate(()=>setFmt("deckClock",1e100));assert.equal(await p.evaluate(()=>curMatch().deckClock),0);
    });
    await check("other match over switches only this sheet to normal breaks", async p => {
      await enable(p);await p.evaluate(()=>{endPoint("us");deckAction("over");});
      assert.equal(await p.evaluate(()=>curMatch().deckEnded),true);assert((await state(p)).left>115);
      await p.evaluate(()=>endPoint("them"));assert((await state(p)).left>115);assert.equal((await state(p)).score.them,1);
      await p.reload();assert.equal(await p.evaluate(()=>curMatch().deckEnded),true);assert.equal((await state(p)).end,0);
      await p.evaluate(()=>openSheet({vs:"Next fixture"}));assert.equal(await p.evaluate(()=>deckActive()),true);assert.equal(await p.evaluate(()=>curMatch().deckEnded),false);
    });
    await check("match end, undo, switching sheets and reload cannot leave a stale turn or timer", async p => {
      await enable(p);await p.evaluate(()=>{setMercy(1);endPoint("us");});
      assert.equal((await state(p)).end,0);assert.equal(await p.locator(".deck-panel").count(),0);
      await p.evaluate(()=>backPoint());assert.equal((await state(p)).phase,null);assert.equal((await state(p)).point,1);
      await p.evaluate(()=>{setMercy(4);endPoint("us");deckAction("finished");});assert((await state(p)).end>0);
      await p.reload();assert.equal((await state(p)).end,0);assert.equal((await state(p)).phase,null);
      await p.evaluate(()=>{deckAction("waiting");const id=S.matchId;openSheet({vs:"Second fixture"});openMatch(id);});
      assert.equal((await state(p)).phase,null);assert.equal((await state(p)).end,0);
    });
    await check("a no-result point hands over without adding a win or loss", async p => {
      await enable(p);await p.evaluate(()=>{tapNext();tapNext();});
      const s=await state(p);assert.equal(s.point,2);assert.equal(s.score.us+s.score.them,0);assert.equal(s.phase,"waiting");assert.equal(s.end,0);
    });
    await check("a double tap on the handoff cannot press the new start button underneath", async p => {
      await enable(p);await p.evaluate(()=>endPoint("us"));
      const button=p.getByRole("button",{name:"Other point ended",exact:true});await button.scrollIntoViewIfNeeded();
      const box=await button.boundingBox();
      await p.mouse.click(box.x+box.width/2,box.y+box.height/2,{clickCount:2,delay:60});
      const s=await state(p);assert.equal(s.phase,"ready");assert(s.end>0);assert.equal(s.score.us,1);assert.equal(s.point,2);
    });
    await check("saved formats and a real season-copy import keep settings, never a running turn", async p => {
      await enable(p,"Semi-Pro");
      const raw=await p.evaluate(()=>{S.tab="more";S.more="format";render();document.getElementById("fmtName").value="Split fixture";saveFmt();const id=S.fmts[0].id;setFmt("div","Division 4");useFmt(id);openSheet({vs:"Backup fixture"});endPoint("us");deckAction("finished");showCopy("all");return S.copyText;});
      assert(raw);await p.evaluate(raw=>{if(!loadCopy("replace",raw))throw Error("copy refused");S.tab="tally";render();},raw);
      assert.deepEqual(await p.evaluate(()=>[curMatch().splitDeck,curMatch().deckClock,fmt().deckClock,S.fmts[0].splitDeck]),[1,45,45,1]);
      assert.equal((await state(p)).phase,null);assert.equal((await state(p)).end,0);
      await p.reload();assert.equal(await p.evaluate(()=>splitDeck()),true);
    });
    await check("watching another game never borrows our split-deck controls", async p => {
      await enable(p);await p.evaluate(()=>{patchMatch({watch:true});render();});
      assert.equal(await p.locator(".deck-panel").count(),0);assert.equal(await p.evaluate(()=>deckActive()),false);
    });
    for(const [label,viewport] of [["phone",{width:375,height:667}],["tablet",{width:820,height:1180}],["tablet-landscape",{width:1180,height:820}]]) {
      await check(label+" fits the split-deck flow and keeps field taps away from scoring",async p=>{
        await enable(p);await p.evaluate(()=>{endPoint("us");render();});
        await p.locator(".deck-panel").scrollIntoViewIfNeeded();
        assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"sideways scroll");
        const panel=await p.locator(".deck-panel").boundingBox();assert(panel.width<=viewport.width);
        const folder=path.resolve("work/split-deck");fs.mkdirSync(folder,{recursive:true});
        await p.screenshot({path:path.join(folder,label+"-waiting.png")});
        await p.getByRole("button",{name:"Other point ended",exact:true}).click();
        await p.screenshot({path:path.join(folder,label+"-next.png")});
        await p.evaluate(()=>{scrollTo(0,0);});await p.waitForTimeout(100);
        const before=await state(p),field=p.locator("#tally-map svg.field");await field.scrollIntoViewIfNeeded();const box=await field.boundingBox();
        const hit=await field.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=Math.min(innerHeight-90,r.bottom-3),h=document.elementFromPoint(x,y);return {x,y,field:!!h?.closest('#tally-map'),score:!!h?.closest('.resultbar')};});
        assert(hit.field&&!hit.score,"field tap reaches something else");assert(box.width<=viewport.width);
        await p.mouse.click(hit.x,hit.y);
        await p.screenshot({path:path.join(folder,label+"-field.png")});
        assert.deepEqual((await state(p)).score,before.score);assert.equal((await state(p)).point,before.point);
      },viewport);
    }
  } finally {await browser.close();}
  console.log(`${results.filter(Boolean).length}/${results.length} split-deck checks passed.`);
  if(results.some(x=>!x))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

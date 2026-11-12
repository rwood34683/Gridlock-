"use strict";
const assert = require("node:assert/strict"), path = require("node:path"), fs = require("node:fs");
const {chromium} = require("playwright-core"), {launchOptions} = require("../scripts/browser");
const {createServer} = require("../scripts/serve"), SEED = require("../scripts/seed");
(async () => {
  const server = createServer({root:path.resolve(__dirname,"../web")});
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let passed=0, failed=0;
  async function check(name, run, size={width:390,height:844}) {
    const context=await browser.newContext({viewport:size,serviceWorkers:"block"}), page=await context.newPage(), errors=[], external=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("request",r=>{if(!r.url().startsWith(url)) external.push(r.url());});
    try {
      await page.goto(url);
      await page.evaluate(s=>{localStorage.setItem("gridlock.coach.v2",JSON.stringify(s));},SEED);
      await page.reload();
      await page.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;set({tab:"scout",scoutTab:"matchup"});});
      await run(page); assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
      passed++;console.log("PASS "+name);
    } catch(e) { failed++;console.error("FAIL "+name+": "+e.stack); }
    finally {await context.close();}
  }
  const switchButton=p=>p.getByRole("button",{name:"Switch ends",exact:true});
  const records=p=>p.evaluate(()=>JSON.stringify({id:S.matchId,point:S.point,results:S.results,tally:S.tally,breakouts:S.breakouts,
    playerChecks:S.playerChecks,lineups:S.lineups,scout:S.scout,left:S.left,right:S.right,team:S.myTeam,codes:S.codes,bunkerCalls:S.bunkerCalls}));
  const watched=p=>p.evaluate(()=>{
    S.left={name:"Practice Red"};S.right={name:"Practice Blue"};
    openSheet({watch:true,home:"Practice Red",away:"Practice Blue",vs:"Practice Blue"});
    set({tab:"scout",scoutTab:"breakouts"});
  });
  try {
    await check("each Scout view offers one working Switch ends control",async p=>{
      await watched(p);
      const views=await p.evaluate(()=>SCOUT_TABS.map(([key])=>key));
      for(const view of views) {
        await p.evaluate(view=>set({scoutTab:view}),view);
        assert.equal(await switchButton(p).count(),1,view);
        const before=await p.evaluate(()=>ourEnd()), data=await records(p);
        await switchButton(p).click();
        assert.equal(await p.evaluate(()=>ourEnd()),before==="left"?"right":"left",view);
        assert.equal(await records(p),data,view+" keeps the sheet and team records");
      }
    });
    await check("a mid-match switch preserves earlier ends and records and survives reopening",async p=>{
      const data=await records(p), past=await p.evaluate(()=>[1,2,3].map(pt=>ourEnd(pt)));
      await switchButton(p).click();
      assert.equal(await p.evaluate(()=>ourEnd()),"right");
      assert.deepEqual(await p.evaluate(()=>[1,2,3].map(pt=>ourEnd(pt))),past);
      assert.equal(await records(p),data);
      assert.equal(await p.locator('svg.field rect[data-end="right"]').count(),1);
      await p.reload();
      assert.equal(await p.evaluate(()=>ourEnd()),"right");assert.equal(await records(p),data);
      await p.evaluate(()=>set({tab:"scout",scoutTab:"matchup"}));
      await switchButton(p).click();
      assert.equal(await p.evaluate(()=>ourEnd()),"left");assert.equal(await records(p),data);
    });
    await check("watched teams keep their identities, score and charted point when ends change",async p=>{
      await watched(p);
      await p.evaluate(()=>{
        S.theirPick=[curLayout().bunkers.find(b=>b.x<30).id];logTheirFive("left");
        S.theirPick=[curLayout().bunkers.find(b=>b.x>120).id];logTheirFive("right");
        endPoint("us");
      });
      const data=await records(p), before=await p.evaluate(()=>ourEnd(1));
      await switchButton(p).click();
      assert.equal(await records(p),data);assert.equal(await p.evaluate(()=>ourEnd(1)),before);
      const ends=await p.getByRole("group",{name:"Field ends",exact:true}).innerText();
      assert.match(ends,/Practice Red: right end/);assert.match(ends,/Practice Blue: left end/);
      assert.deepEqual(await p.evaluate(()=>matchScore()),{us:1,them:0});
      assert.equal(await p.evaluate(()=>sideOfBunker(curLayout().bunkers.find(b=>b.x<30))),"them");
    });
    await check("Swap every point on Scout follows scored points, not no-points",async p=>{
      await watched(p);
      await p.getByRole("button",{name:"Swap every point",exact:true}).click();
      assert.equal(await p.evaluate(()=>ourEnd()),"left");
      await p.evaluate(()=>nextPoint());assert.equal(await p.evaluate(()=>ourEnd()),"left");
      await p.evaluate(()=>endPoint("us"));assert.equal(await p.evaluate(()=>ourEnd()),"right");
      await switchButton(p).click();assert.equal(await p.evaluate(()=>ourEnd()),"left");
    });
    await check("end labels use the watched sheet, escape names and do not follow another pit selection",async p=>{
      await watched(p);
      await p.evaluate(()=>{
        patchMatch({home:'<b id="unsafe-team">Practice Red</b>',away:"Practice Blue"});
        S.left={name:"Another team"};S.right={name:"Someone else"};render();
      });
      const text=await p.getByRole("group",{name:"Field ends",exact:true}).innerText();
      assert.match(text,/<b id="unsafe-team">Practice Red<\/b>: left end/);
      assert.match(text,/Practice Blue: right end/);assert.doesNotMatch(text,/Another team|Someone else/);
      assert.equal(await p.locator("#unsafe-team").count(),0);
    });
    await check("Scout cannot change a sheet's ends while viewing a different field",async p=>{
      await p.evaluate(()=>set({layoutKey:"tby"}));
      const before=await p.evaluate(()=>JSON.stringify(S.matches));
      await switchButton(p).click();
      assert.equal(await p.evaluate(()=>JSON.stringify(S.matches)),before);
    });
    for(const size of [{width:390,height:844},{width:768,height:1024},{width:1024,height:768}]) {
      await check(`field-end controls fit ${size.width}x${size.height} with named 44px targets`,async p=>{
        await watched(p);
        const group=p.getByRole("group",{name:"Field ends",exact:true});
        const buttons=await group.locator("button").evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {name:(e.getAttribute("aria-label")||e.textContent).trim(),width:r.width,height:r.height};}));
        assert.equal(buttons.length,2);
        for(const b of buttons) assert.ok(b.name&&b.width>=44&&b.height>=44,JSON.stringify(b));
        assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        await switchButton(p).click();
        assert.match(await group.innerText(),/Practice Red: right end/);
        if(process.env.CAPTURE_SCOUT_ENDS) {
          const dir=path.resolve(__dirname,"../docs/review/scout-ends");fs.mkdirSync(dir,{recursive:true});
          await switchButton(p).scrollIntoViewIfNeeded();
          await p.screenshot({path:path.join(dir,`${size.width}x${size.height}.png`)});
        }
      },size);
    }
  } finally {await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
  console.log(`${passed}/${passed+failed} Scout ends checks passed.`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

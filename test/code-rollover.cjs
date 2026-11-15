"use strict";
const assert = require("node:assert/strict"), path = require("node:path"), fs = require("node:fs");
const {chromium} = require("playwright-core"), {launchOptions} = require("../scripts/browser");
const {createServer} = require("../scripts/serve"), SEED = require("../scripts/seed");
(async () => {
  const server = createServer({root:path.resolve(__dirname,"../web")});
  await new Promise(r => server.listen(0,"127.0.0.1",r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let passed = 0, failed = 0;
  async function check(name, fn, viewport = {width:390,height:844}) {
    const context = await browser.newContext({viewport,serviceWorkers:"block"}), p = await context.newPage(), errors = [], requests = [];
    p.on("pageerror",e => errors.push(e.message));
    p.on("request",r => {if(!r.url().startsWith(url) && !r.url().startsWith("data:")) requests.push(r.url());});
    p.on("dialog",d => d.accept());
    try {
      await p.goto(url);
      await p.evaluate(seed => {localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify({...seed,
        namesOn:false,bunkerCalls:{},playerCalls:{},codes:[],fmtDone:true,fmtAsk:false}));},SEED);
      await p.reload();
      await fn(p);
      assert.deepEqual(errors,[],"page errors");assert.deepEqual(requests,[],"external requests");
      passed++;console.log("PASS " + name);
    } catch(e) {failed++;console.error("FAIL " + name + ": " + e.stack);}
    finally {await context.close();}
  }
  async function nameBunker(p, word, extra = {}) {
    const id = await p.evaluate(extra => {set({tab:"more",more:"codes",codesField:null,codeWho:"",codePick:"SB#3",...extra});return S.codePick;},extra);
    await p.locator("#codeName").fill(word);
    await p.getByRole("button",{name:"Save name",exact:true}).click();
    return id;
  }
  async function addWord(p, word = "Buzzer", means = "Go on the horn") {
    await p.evaluate(() => set({tab:"more",more:"codes"}));
    await p.locator("#cdWord").fill(word);await p.locator("#cdMeans").fill(means);
    await p.getByRole("button",{name:"Add code word",exact:true}).click();
  }
  async function labels(p, selector = "#root .field-wrap") {
    return p.locator(selector + " svg.field text").allTextContents();
  }
  try {
    await check("a Codes name shows on Tally and Scout fields with Names off, including after reload",async p => {
      await nameBunker(p,"Rocket");
      for(const [tab,scoutTab,selector] of [["tally","matchup","#tally-map"],["scout","matchup","#root .field-wrap"],["scout","breakouts","#their-map"],["scout","arrival","#arrival-map"],["scout","layers","#root .field-wrap"]]) {
        await p.evaluate(s => set(s),{tab,scoutTab});
        assert.ok((await labels(p,selector)).includes("Rocket"),tab+" / "+scoutTab+" shows the saved name");
      }
      await p.reload();await p.evaluate(() => set({tab:"tally"}));
      assert.ok((await labels(p,"#tally-map")).includes("Rocket"));
      assert.equal(await p.evaluate(() => S.namesOn),false,"no global overlay preference changed");
    });
    await check("code words are one live reference on Tally and all nine Scout views",async p => {
      await addWord(p);
      const screens = await p.evaluate(() => [{tab:"tally"},...SCOUT_TABS.map(([scoutTab])=>({tab:"scout",scoutTab}))]);
      for(const s of screens) {
        await p.evaluate(s => set(s),s);
        assert.equal(await p.locator(".team-codes").count(),1);
        await p.locator(".team-codes summary").click();
        assert.match(await p.locator(".team-codes").innerText(),/Buzzer[\s\S]*Go on the horn/);
      }
      await p.reload();await p.evaluate(() => set({tab:"tally"}));
      await p.locator(".team-codes summary").click();
      assert.match(await p.locator(".team-codes").innerText(),/Go on the horn/);
    });
    await check("renaming and clearing a bunker refreshes both cached screens without changing the match",async p => {
      const before = await p.evaluate(() => JSON.stringify([S.matches,S.matchId,S.point,S.results,S.breakouts,S.tally,S.playerChecks]));
      await nameBunker(p,"Rocket");
      for(const tab of ["tally","scout"]) await p.evaluate(tab => set({tab,scoutTab:"breakouts"}),tab);
      await nameBunker(p,"Home");
      for(const tab of ["tally","scout"]) {
        await p.evaluate(tab => set({tab,scoutTab:"breakouts"}),tab);
        const words = await labels(p);assert.ok(words.includes("Home"));assert.ok(!words.includes("Rocket"));
      }
      await p.evaluate(() => set({tab:"more",more:"codes",codePick:"SB#3"}));
      await p.getByRole("button",{name:"Put the code back",exact:true}).click();
      for(const tab of ["tally","scout"]) {
        await p.evaluate(tab => set({tab,scoutTab:"breakouts"}),tab);
        const words = await labels(p);assert.ok(!words.includes("Home"));assert.ok(!words.includes("SB"),"official key stays off");
      }
      assert.equal(await p.evaluate(() => JSON.stringify([S.matches,S.matchId,S.point,S.results,S.breakouts,S.tally,S.playerChecks])),before);
    });
    await check("unsaved text, another layout and a player's private word do not leak onto the current field",async p => {
      await p.evaluate(() => set({tab:"more",more:"codes",codePick:"SB#3"}));
      await p.locator("#codeName").fill("Not saved");
      await p.evaluate(() => set({tab:"tally"}));
      assert.ok(!(await labels(p)).includes("Not saved"));
      const other = await p.evaluate(() => Object.keys(LAYOUTS).find(k => k!==S.layoutKey && LAYOUTS[k].bunkers.some(b=>b.id==="SB#3")));
      assert.ok(other,"fixture has another field with the same bunker id");
      await nameBunker(p,"Other field",{codesField:other});
      const here = await p.evaluate(() => S.layoutKey);
      await nameBunker(p,"Rocket");
      const who = await p.evaluate(() => S.roster[0].name);
      await nameBunker(p,"Private",{codeWho:who});
      for(const tab of ["tally","scout"]) {
        await p.evaluate(tab => set({tab,scoutTab:"breakouts"}),tab);
        const words = await labels(p);assert.ok(words.includes("Rocket"));
        assert.ok(!words.includes("Other field"));assert.ok(!words.includes("Private"));
      }
      assert.equal(await p.evaluate(() => S.layoutKey),here,"reading another Codes field did not switch the event");
      await p.evaluate(layoutKey => set({layoutKey,tab:"scout",scoutTab:"breakouts"}),other);
      assert.ok((await labels(p)).includes("Other field"));assert.ok(!(await labels(p)).includes("Rocket"));
    });
    await check("saved words survive a new match and season replacement and still name the tapped bunker",async p => {
      await nameBunker(p,"Rocket");await addWord(p);
      const copy = await p.evaluate(() => copyPayload("all"));
      await p.evaluate(() => {freshMatch();set({tab:"tally"});});
      assert.ok((await labels(p)).includes("Rocket"));assert.equal(await p.locator(".team-codes").count(),1);
      await p.evaluate(() => {S.bunkerCalls={};S.codes=[];save(S);render();});
      assert.ok(!(await labels(p)).includes("Rocket"));
      await p.evaluate(copy => {loadCopy("replace",copy);set({tab:"tally",tallyStep:"record",tallyMode:"record"});const b=curLayout().bunkers.find(b=>b.id==="SB#3");tallyTap([b.x,b.y]);},copy);
      assert.equal(await p.evaluate(() => selBunker().id),"SB#3");
      assert.match(await p.locator(".main").innerText(),/Rocket/);
      assert.equal(await p.locator(".team-codes").count(),1);
      const match = await p.evaluate(() => JSON.stringify([S.matchId,S.point,S.results,S.bunkerCalls]));
      await p.evaluate(() => {tallyDone();switchEnds();set({tab:"scout",scoutTab:"breakouts"});});
      assert.ok((await labels(p)).includes("Rocket"));
      assert.equal(await p.evaluate(() => JSON.stringify([S.matchId,S.point,S.results,S.bunkerCalls])),match,"end switch changes no score or stored code");
    });
    await check("editing and removing a code word updates both references; HTML is displayed as text",async p => {
      await addWord(p,"<b>Hold</b>","<img src=x onerror=alert(1)>");
      for(const tab of ["tally","scout"]) {
        await p.evaluate(tab => set({tab,scoutTab:"voice"}),tab);
        await p.locator(".team-codes summary").click();
        assert.match(await p.locator(".team-codes").innerText(),/<b>Hold<\/b>/);
        assert.equal(await p.locator(".team-codes img").count(),0);
      }
      await p.locator(".team-codes").getByRole("button",{name:"Edit codes"}).click();
      await p.evaluate(() => editCode(0,"means","Wait for the call"));
      for(const tab of ["tally","scout"]) {
        await p.evaluate(tab => set({tab,scoutTab:"matchup"}),tab);
        await p.locator(".team-codes summary").click();
        assert.match(await p.locator(".team-codes").innerText(),/Wait for the call/);
        assert.doesNotMatch(await p.locator(".team-codes").innerText(),/onerror/);
      }
      await p.evaluate(() => {set({tab:"more",more:"codes"});delCode(0);});
      for(const tab of ["tally","scout"]) {await p.evaluate(tab => set({tab}),tab);assert.equal(await p.locator(".team-codes").count(),0);}
    });
    for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1024,height:768}]) {
      await check(`saved codes fit ${viewport.width}x${viewport.height} with full-size controls`,async p => {
        await nameBunker(p,"Rocket");await addWord(p,"Buzzer","Go on the horn");
        for(const tab of ["tally","scout"]) {
          await p.evaluate(tab => set({tab,scoutTab:"breakouts"}),tab);
          assert.ok((await labels(p)).includes("Rocket"));
          if(process.env.CODE_ROLLOVER_SHOTS) {
            fs.mkdirSync(process.env.CODE_ROLLOVER_SHOTS,{recursive:true});
            await p.waitForTimeout(4100);
            await p.locator(tab==="tally" ? "#tally-map" : "#their-map").scrollIntoViewIfNeeded();
            await p.screenshot({path:path.join(process.env.CODE_ROLLOVER_SHOTS,`${tab}-field-${viewport.width}x${viewport.height}.png`)});
          }
          const summary = p.locator(".team-codes summary");await summary.scrollIntoViewIfNeeded();
          assert.ok((await summary.boundingBox()).height>=44);
          await summary.click();
          assert.ok((await p.locator(".team-codes button").boundingBox()).height>=44);
          assert.match(await p.locator(".team-codes").innerText(),/Go on the horn/);
          assert.equal(await p.evaluate(() => document.documentElement.scrollWidth>innerWidth+1),false);
          assert.equal(await p.evaluate(() => document.querySelector(".main").scrollWidth>document.querySelector(".main").clientWidth+1),false);
          if(process.env.CODE_ROLLOVER_SHOTS) {
            fs.mkdirSync(process.env.CODE_ROLLOVER_SHOTS,{recursive:true});
            await p.screenshot({path:path.join(process.env.CODE_ROLLOVER_SHOTS,`${tab}-${viewport.width}x${viewport.height}.png`)});
          }
        }
        await p.evaluate(() => {S.codes=[{word:"W".repeat(32),means:"M".repeat(600)}];set({tab:"tally"});});
        await p.locator(".team-codes summary").click();
        assert.equal(await p.evaluate(() => document.querySelector(".main").scrollWidth>document.querySelector(".main").clientWidth+1),false,"long words wrap");
      },viewport);
    }
  } finally {
    await browser.close();await new Promise(r => server.close(r));
    console.log(`\n${passed} PASS, ${failed} FAIL`);if(failed)process.exitCode=1;
  }
})();

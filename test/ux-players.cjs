"use strict";
/* What a player sees or is handed: the clinic sign-in sheet off a class link,
   and the cards and matchup text a coach shares. Each check is a fault the
   review of 5 Nov 2026 reproduced. */
const assert = require("node:assert/strict"), path = require("node:path");
const { chromium } = require("playwright-core"), { launchOptions } = require("../scripts/browser");
const { createServer } = require("../scripts/serve");
const SEED = require("../scripts/seed.js");
(async () => {
  const server = createServer({ root: path.resolve(__dirname, "../web") });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`, browser = await chromium.launch(launchOptions());
  let failed = 0, passed = 0;
  const CLASS = { id: "GL-7K2M", code: "GL-7K2M", title: "Saturday clinic", open: true, when: "", notes: "" };
  async function check(name, fn, opts = {}) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
    const p = await c.newPage(), errors = [];
    p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept());
    try {
      await p.goto(url);
      const seed = { ...SEED, classes: [CLASS], responses: [], ...(opts.signedOut ? { entered: false, role: "guest", email: "" } : {}) };
      await p.evaluate(s => { localStorage.clear(); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); }, seed);
      await p.goto(url + (opts.query || ""));
      await p.waitForFunction(() => typeof S === "object");
      await fn(p);
      assert.deepEqual(errors, []);
      passed++; console.log("PASS " + name);
    } catch (e) { failed++; console.error("FAIL " + name + ": " + e.message); }
    finally { await c.close(); }
  }
  const root = p => p.evaluate(() => document.getElementById("root").innerText);
  try {
    await check("the join sheet says why Submit did nothing", async p => {
      assert.equal(await p.evaluate(() => S.joinOnly && !S.entered), true, "the sheet alone");
      await p.getByRole("button", { name: "Submit" }).click();
      assert.match(await root(p), /Name is required/);
      await p.fill("#fn", "Sam");
      await p.getByRole("button", { name: "Submit" }).click();
      assert.match(await root(p), /Tick the sign-in box/);
      assert.equal(await p.inputValue("#fn"), "Sam", "the name is still there");
    }, { signedOut: true, query: "?c=gl%207k2m" });
    await check("signing in again keeps what he left as it was; the code stays for the next kid", async p => {
      await p.fill("#fn", "Sam"); await p.fill("#fc", "a@b"); await p.selectOption("#fe", "Rec"); await p.selectOption("#fw", "Dorito");
      await p.check("#fa"); await p.getByRole("button", { name: "Submit" }).click();
      await p.fill("#fn", "sam "); await p.check("#fa"); await p.getByRole("button", { name: "Submit" }).click();
      const r = await p.evaluate(() => S.responses);
      assert.equal(r.length, 1); assert.equal(r[0].exp, "Rec"); assert.equal(r[0].wire, "Dorito"); assert.equal(r[0].contact, "a@b");
      assert.equal(await p.locator("#fn").count(), 1, "the form is still up for the next one");
    }, { signedOut: true, query: "?c=GL-7K2M" });
    await check("Back from the sheet takes the code out of the address", async p => {
      await p.getByRole("button", { name: /Not signing a sheet/ }).click();
      assert.equal(await p.evaluate(() => location.search), "");
      await p.reload(); await p.waitForFunction(() => typeof S === "object");
      assert.equal(await p.evaluate(() => S.joinOnly), false, "a reload is the welcome page");
    }, { signedOut: true, query: "?c=GL-7K2M" });
    await check("the matchup card prints no read nobody made", async p => {
      const t = await p.evaluate(() => { let t = ""; window.handOff = (a, x) => { t = x; }; setPitTeam("right", boardTeam("Brand New Team")); copyMatchup(); return t; });
      assert.doesNotMatch(t, /They read/); assert.match(t, /No read on them yet/);
    });
    await check("a card names one bunker once, and shows the team's word for the job", async p => {
      const got = await p.evaluate(() => {
        set({ script: "snake", jobCalls: { snake: { "1": "Rocket 1" } } });
        let t = ""; window.handOff = (a, x) => { t = x; }; shareCards();
        set({ tab: "playbook", pbView: "cards" });
        const lay = curLayout(), names = cardLines().map(c => c.bunker);
        const ambiguous = names.filter(n => lay.bunkers.filter(b => b.n === n).length > 1);
        return { t, card: document.getElementById("root").innerText, ambiguous };
      });
      assert.doesNotMatch(got.t, /\b(\w+) · \1\b/, "no bunker twice on a line");
      assert.match(got.t, /Rocket 1/); assert.match(got.card, /Rocket 1/, "the card in his hand says it too");
      assert.deepEqual(got.ambiguous, [], "every bunker on a card is one bunker on this field");
    });
    await check("account and backups are named on the header and More menu", async p => {
      assert.equal((await p.locator('.who-btn').textContent()).trim(), 'Account');
      await p.evaluate(()=>set({tab:'more',more:null}));
      const account=p.getByRole('button',{name:/Account & backups.*Nexus/});
      assert.equal(await account.count(),1);
      await account.click();
      assert.equal(await p.evaluate(()=>S.more),'nexus');
      assert.match(await root(p),/Account & backups/i);
      assert.equal(await p.getByRole('button',{name:'Sign out',exact:true}).count(),1);
    });
    await check("tools can be found by a coach's words without saving or losing the search on Back", async p => {
      await p.evaluate(()=>set({tab:'more',more:null}));
      const before = await p.evaluate(()=>localStorage.getItem('gridlock.coach.v2'));
      await p.getByLabel('Find a tool').fill('sign out');
      assert.equal(await p.locator('#tool-menu .list__row:visible').count(),1);
      assert.match(await p.locator('#tool-menu .list__row:visible').textContent(),/Account & backups/);
      assert.equal(await p.evaluate(()=>localStorage.getItem('gridlock.coach.v2')),before);
      await p.locator('#tool-menu .list__row:visible').click();
      assert.equal(await p.evaluate(()=>S.more),'nexus');
      await p.getByRole('button',{name:'‹ More',exact:true}).click();
      assert.equal(await p.getByLabel('Find a tool').inputValue(),'sign out');
      assert.equal(await p.locator('#tool-menu .list__row:visible').count(),1);
      await p.getByLabel('Find a tool').fill('roster');
      assert.match(await p.locator('#tool-menu .list__row:visible').textContent(),/Team/);
      await p.getByLabel('Find a tool').fill('<img src=x>');
      assert.equal(await p.locator('#tool-menu .list__row:visible').count(),0);
      assert.match(await p.locator('#tool-status').textContent(),/No tools found/);
      assert.equal(await p.locator('#tool-menu img').count(),0);
      await p.getByLabel('Find a tool').press('Escape');
      const keys=await p.evaluate(()=>MORE_GROUPS.flatMap(([,rows])=>rows.map(r=>r[0])));
      assert.equal(await p.locator('#tool-menu .list__row:visible').count(),keys.length);
      assert.equal(new Set(keys).size,keys.length);
      assert.ok(!keys.includes('classes') && !keys.includes('league'));
      await p.getByLabel('Find a tool').fill('reports');
      await p.evaluate(()=>set({tab:'tally'}));
      await p.evaluate(()=>set({tab:'more',more:null}));
      assert.equal(await p.getByLabel('Find a tool').inputValue(),'');
    });
    await check("a coach can find players, the score, League sync and spreadsheets by their everyday names", async p => {
      await p.evaluate(()=>set({tab:'more',more:null}));
      const before=await p.evaluate(()=>localStorage.getItem('gridlock.coach.v2'));
      for(const [words,tool] of [['players','team'],['score','tally'],['league sync','nexus'],['export','reports'],['starting five','lineups'],['shooting lanes','sightlines']]){
        await p.getByLabel('Find a tool').fill(words);
        assert.equal(await p.locator(`#tool-menu [data-tool="${tool}"]:visible`).count(),1,words+' finds '+tool);
        assert.equal(await p.getByLabel('Find a tool').evaluate(el=>el===document.activeElement),true,'typing keeps focus');
      }
      assert.equal(await p.evaluate(()=>localStorage.getItem('gridlock.coach.v2')),before,'finding a tool does not rewrite the season');
      await p.getByLabel('Find a tool').fill('score');
      await p.locator('#tool-menu [data-tool="tally"]').click();
      assert.equal(await p.evaluate(()=>S.tab),'tally');
      await p.locator('.tabs button').filter({hasText:/^More$/}).click();
      assert.equal(await p.getByLabel('Find a tool').inputValue(),'','another main screen clears the query');
      assert.equal(await p.locator('#tool-menu [data-main-tool]:visible').count(),0,'main screens do not clutter the ordinary menu');
    });
    await check("Back to More restores the chosen tool within the visible phone or tablet menu", async p => {
      for(const [width,height] of [[390,844],[1024,768],[667,375]]){
        await p.setViewportSize({width,height});
        await p.evaluate(()=>set({tab:'more',more:null}));
        await p.locator('#tool-menu [data-tool="reports"]').click();
        await p.getByRole('button',{name:'‹ More',exact:true}).click();
        const got=await p.locator('#tool-menu [data-tool="reports"]').evaluate(el=>{
          const r=el.getBoundingClientRect(),m=document.querySelector('.main').getBoundingClientRect();
          return {focused:el===document.activeElement,visible:r.top>=m.top-1 && r.bottom<=m.bottom+1};
        });
        assert.equal(got.focused,true,width+'px: focus returns to Reports');
        assert.equal(got.visible,true,width+'px: the Reports row is in view');
      }
    });
    await check("keyboard navigation announces the chosen screen and leaves typing alone", async p => {
      const more=p.getByRole('navigation',{name:'Main screens'}).getByRole('button',{name:'More',exact:true});
      await more.focus();await more.press('Enter');
      assert.equal(await p.locator('main').getAttribute('aria-label'),'More tools');
      assert.equal(await p.locator('main').evaluate(el=>el===document.activeElement),true);
      await p.getByLabel('Find a tool').fill('score');
      await p.evaluate(()=>flash('A test notice'));
      assert.equal(await p.getByLabel('Find a tool').evaluate(el=>el===document.activeElement),true,'same-screen feedback keeps the input');
      const tally=p.locator('#tool-menu [data-tool="tally"]');await tally.focus();await tally.press('Enter');
      assert.equal(await p.locator('main').getAttribute('aria-label'),'Tally');
      assert.equal(await p.locator('main').evaluate(el=>el===document.activeElement),true);
      assert.equal(await p.locator('.tabs [aria-current="page"]').textContent(),'Tally');
      await p.getByRole('navigation',{name:'Main screens'}).getByRole('button',{name:'Scout',exact:true}).click();
      await p.locator('[aria-label="Scout views"]').getByRole('button',{name:'Breakouts',exact:true}).click();
      assert.equal(await p.locator('main').getAttribute('aria-label'),'Scout · Breakouts');
      assert.equal(await p.locator('[aria-label="Scout views"] [aria-pressed="true"]').textContent(),'Breakouts');
    });
    await check("play-building instructions match the controls on this screen and the saved play", async p => {
      await p.evaluate(()=>{set({tab:'playbook'});newPlay();});
      const text=await root(p);
      assert.match(text,/Tap a bunker for player 1, then players 2–5/);
      assert.match(text,/After saving, use Go/);
      assert.doesNotMatch(text,/first name you tap|row says otherwise/);
      await p.evaluate(()=>{
        const ids=curLayout().bunkers.slice(0,5).map(b=>b.id);
        ids.forEach(id=>playPick(id));
      });
      const takeOff=p.getByRole('button',{name:'Take man 1 off',exact:true});
      await takeOff.click();
      assert.equal(await p.evaluate(()=>S.building.plants[0]),null);
      await p.evaluate(()=>{playPick(curLayout().bunkers[0].id);setPlayField('name','Test breakout');savePlay();});
      assert.equal(await p.evaluate(()=>S.building),null);
      assert.match(await root(p),/Test breakout/);
      assert.ok(await p.getByRole('button',{name:/When he goes:/}).count()>0);
    });
    await check("the account badge opens the account, and Sign out asks before it signs out", async p => {
      await p.getByRole("button", { name: /account and sign out/ }).click();
      assert.equal(await p.evaluate(() => S.more), "nexus");
      const box = await p.getByRole("button", { name: "Sign out", exact: true }).boundingBox();
      assert.ok(box && box.y < 844, "Sign out is on the first screen of Nexus");
      p.removeAllListeners("dialog"); p.once("dialog", d => d.dismiss());
      await p.getByRole("button", { name: "Sign out", exact: true }).click();
      assert.equal(await p.evaluate(() => S.entered), true, "No keeps him signed in");
      p.once("dialog", d => d.accept());
      await p.getByRole("button", { name: "Sign out", exact: true }).click();
      assert.equal(await p.evaluate(() => S.entered), false);
      assert.ok(await p.evaluate(() => S.matches.length) > 0, "the season stays");
    });
  } finally {
    await browser.close(); server.close();
    console.log(`${passed}/${passed + failed} player checks passed.`);
    if (failed) process.exitCode = 1;
  }
})();

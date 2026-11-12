"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {execFileSync}=require("node:child_process");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser"),{createServer}=require("../scripts/serve");
const SEED=require("../scripts/seed"),books=require("../docs/rulebooks.json");
const ROOT=path.resolve(__dirname,"..");
(async()=>{
  execFileSync(process.execPath,["tools/rulebook-links.js","--check"],{cwd:ROOT,stdio:"inherit"});
  const server=createServer({root:ROOT});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch(launchOptions());
  let pass=0,fail=0;
  try{for(const kind of ["coach","team","player"])for(const [width,height] of [[390,844],[1024,768]]){
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:"block"}),p=await context.newPage(),errors=[],external=[];
    p.on("pageerror",e=>errors.push(e.message));
    await context.route("**/*",route=>{const u=route.request().url();if(u.startsWith(base+"/"))return route.continue();external.push(u);return route.fulfill({contentType:"text/html",body:"<title>Official source test response</title>"});});
    try{
      await p.goto(base+(kind==="coach"?"/web/":"/teasers/"+kind+"/"));
      if(kind==="coach"){
        await p.evaluate(seed=>{localStorage.clear();localStorage.setItem("gridlock.coach.v2",JSON.stringify(seed));},SEED);await p.reload();
        await p.evaluate(()=>{S.fmtAsk=false;S.fmtDone=true;set({tab:"more",more:null});});
        assert.equal(await p.locator('#tool-menu').isVisible(),true);
        const columns=await p.locator('#tool-menu .list:visible').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(columns,2);
        await p.locator('#tool-find').fill('rulebook');
        await p.locator('[data-tool="rules"]').click();
      }else{
        if(kind==="player"){await p.locator('#joinCode').fill('IMPACT-7QX2');await p.locator('#joinGo').click();}
        assert.equal(await p.locator('#rulebooksDialog').isVisible(),false,'does not open itself');
        // Rules sits just above Nexus: in Player's More menu, in Team's tab row.
        assert.equal(await p.locator('header > .ld#rulebooksOpen').count(),0,'not a loose header button');
        assert.equal(await p.evaluate(()=>{const r=document.getElementById('rulebooksOpen'),n=r&&r.nextElementSibling;return !!n&&(n.dataset.mm||n.dataset.m)==='nexus';}),true,'Rules sits right above Nexus');
        if(kind==="player"){assert.equal(await p.locator('#rulebooksOpen').isVisible(),false,'inside More until More is opened');await p.locator('#moreBtn').click();}
        await p.getByRole('button',{name:'Rules',exact:true}).click();
      }
      const saved=await p.evaluate(()=>JSON.stringify({...localStorage}));
      const panel=kind==="coach"?p.locator('.main'):p.locator('#rulebooksDialog');
      assert.match(await panel.innerText(),/connection is needed/);
      const links=panel.locator('.rules-book');assert.equal(await links.count(),3);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no sideways scroll');
      assert.deepEqual(external,[],'no requests before the coach chooses a source');
      for(let i=0;i<books.length;i++){
        const a=links.nth(i);assert.equal(await a.getAttribute('href'),books[i].url);assert.equal(await a.getAttribute('target'),'_blank');assert.equal(await a.getAttribute('rel'),'noopener noreferrer');
        const box=await a.boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.ok((await a.innerText()).includes(books[i].name));
        const popup=context.waitForEvent('page');await a.click();const opened=await popup;await opened.waitForLoadState();assert.equal(opened.url(),books[i].url);await opened.close();
      }
      assert.deepEqual(external,books.map(b=>b.url));
      assert.equal(await p.evaluate(()=>JSON.stringify({...localStorage})),saved,'reading Rules never changes saved data');
      if(process.env.CAPTURE_RULES){const out=path.join(ROOT,'docs/screenshots/rules');fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,kind+'-'+width+'x'+height+'.png'),fullPage:true});}
      if(kind==="coach"){
        await p.getByRole('button',{name:'‹ More',exact:true}).click();assert.equal(await p.locator('#tool-find').inputValue(),'rulebook');assert.equal(await p.evaluate(()=>document.activeElement.dataset.tool),'rules');
        await p.locator('#tool-find').focus();await p.keyboard.press('Escape');assert.equal(await p.locator('#tool-find').inputValue(),'');
        if(process.env.CAPTURE_RULES)await p.screenshot({path:path.join(ROOT,'docs/screenshots/rules/more-'+width+'x'+height+'.png'),fullPage:true});
        await context.setOffline(true);await p.locator('[data-tool="rules"]').click();assert.equal(await p.locator('.rules-book').count(),3);
      }else{
        await p.keyboard.press('Escape');assert.equal(await p.locator('#rulebooksDialog').isVisible(),false);assert.equal(await p.evaluate(()=>document.activeElement.id),kind==="player"?'moreBtn':'rulebooksOpen');
        await context.setOffline(true);if(kind==="player")await p.locator('#moreBtn').click();await p.locator('#rulebooksOpen').click();await p.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await p.locator('#rulebooksDialog').isVisible(),false);
      }
      assert.deepEqual(errors,[]);pass++;console.log('PASS '+kind+' Rules, explicit links, unchanged data, navigation and layout '+width+'x'+height);
    }catch(e){fail++;console.error('FAIL '+kind+' '+width+'x'+height+': '+e.stack);}finally{await context.close();}
  }}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
  console.log(`${pass}/${pass+fail} rulebook checks passed.`);if(fail)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

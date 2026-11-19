"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{launchOptions}=require('../scripts/browser'),SEED=require('../scripts/seed');
(async()=>{
  const browser=await chromium.launch(launchOptions());let count=0;
  async function check(name,fn,size={width:390,height:844}){
    const c=await browser.newContext({viewport:size,serviceWorkers:'block'}),p=await c.newPage(),errors=[],requests=[];
    p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
    try{
      await p.goto(process.env.APP_URL);await p.evaluate(seed=>{localStorage.clear();localStorage.setItem('gridlock.coach.v2',JSON.stringify(seed));},SEED);await p.reload();
      await p.evaluate(()=>set({entered:true,tab:'more',more:'home',fmtAsk:false,syncAsk:false}));
      const before=await p.evaluate(()=>JSON.parse(copyPayload('all')).data);requests.length=0;
      await fn(p,requests);assert.deepEqual(await p.evaluate(()=>JSON.parse(copyPayload('all')).data),before,'hunt changed the season');assert.deepEqual(errors,[]);
      console.log('PASS '+name);count++;
    }finally{await c.close();}
  }
  async function open(p){await p.getByRole('button',{name:'Someone left a pod behind…',exact:true}).click();}
  async function finish(p){for(const name of ['A pod','Codes','Scout','Pods'])await p.locator('#pod-hunt').getByRole('button',{name,exact:true}).click();}
  try{
    await check('Home clue is opt-in; full practice hunt solves without sending, scoring, saving or awarding access',async(p,requests)=>{
      assert.equal(await p.locator('#pod-hunt').count(),0);await open(p);
      assert.match(await p.locator('#pod-hunt').innerText(),/Prize to be announced/);
      await p.getByRole('button',{name:'A very tired referee',exact:true}).click();assert.match(await p.locator('#hunt-status').innerText(),/Not that one/);
      await finish(p);await p.locator('#hunt-code').fill('wrong');await p.getByRole('button',{name:'Try the code',exact:true}).click();assert.match(await p.locator('#hunt-status').innerText(),/Join the four/);
      await p.locator('#hunt-code').fill('gridlock runs on pods');await p.getByRole('button',{name:'Try the code',exact:true}).click();
      assert.match(await p.locator('#pod-hunt').innerText(),/Practice complete. No prize claimed/);assert.equal(requests.length,0);
      await p.getByRole('button',{name:'Check prize round',exact:true}).click();assert.match(await p.locator('#hunt-status').innerText(),/not open here/);assert.equal(requests.length,0);
      await p.getByRole('button',{name:'Play again',exact:true}).click();assert.equal(await p.locator('#hunt-title').innerText(),'The missing pod');
    });
    await check('Escape and Tab stay in the hunt and return focus to the Home clue',async p=>{
      await open(p);await p.getByRole('button',{name:'Check prize round',exact:true}).focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Close');
      await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Check prize round');
      assert.equal(await p.locator('#root').getAttribute('aria-hidden'),'true');await p.keyboard.press('Escape');assert.equal(await p.locator('#pod-hunt').count(),0);
      assert.equal(await p.locator('#root').getAttribute('aria-hidden'),null);assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Someone left a pod behind…');
    });
    await check('closing or changing account invalidates a delayed reply; navigation closes the hunt',async p=>{
      await open(p);await p.evaluate(()=>{window.gridlockCloud={huntRequest:()=>new Promise(r=>window.__huntResolve=r)};});
      await p.getByRole('button',{name:'Check prize round',exact:true}).click();await p.keyboard.press('Escape');
      await p.evaluate(()=>__huntResolve({ok:true,state:'winner'}));assert.equal(await p.locator('#pod-hunt').count(),0);
      await open(p);await p.getByRole('button',{name:'Check prize round',exact:true}).click();
      await p.evaluate(()=>{S.email='another@example.test';render();__huntResolve({ok:true,state:'winner'});});assert.equal(await p.locator('#pod-hunt').count(),0);
      await open(p);await p.evaluate(()=>set({tab:'tally',more:null}));assert.equal(await p.locator('#pod-hunt').count(),0);
    });
    await check('server failure, inactive round and forged success never announce a winner',async p=>{
      await open(p);
      for(const reply of [{ok:false,said:'Try later'},{ok:true,state:'inactive'},{ok:true,state:'winner'},{ok:true,state:'claimed'}]){
        await p.evaluate(r=>{window.gridlockCloud={huntRequest:async()=>r};},reply);await p.getByRole('button',{name:'Check prize round',exact:true}).click();
        assert.notEqual(await p.locator('#hunt-title').innerText(),'Claim confirmed');assert.equal(await p.locator('#pod-hunt button:disabled').count(),0);
      }
    });
    await check('live clues bind to the round, escape server text and require a confirmed receipt; duplicate taps send once',async p=>{
      await open(p);
      await p.evaluate(()=>{window.__calls=[];window.__step=0;window.gridlockCloud={huntRequest:async data=>{
        __calls.push(data);if(data.action==='answer')__step++;
        if(data.action==='claim')return new Promise(r=>window.__win=r);
        return {ok:true,state:'open',round:'fixture',step:__step,pieces:['RED','POD','CREW','WINS'].slice(0,__step),prize:'<b>Fixture prize</b>',rules:'Fixture rules only',
          stage:__step<4?{title:'Fixture clue '+__step,clue:'<img src=x onerror=alert(1)>',options:['One','Two','Three']}:null};
      }};});
      await p.getByRole('button',{name:'Check prize round',exact:true}).click();assert.equal(await p.locator('#pod-hunt img').count(),0);assert.match(await p.locator('#pod-hunt').innerText(),/<b>Fixture prize<\/b>/);
      for(let i=0;i<4;i++)await p.getByRole('button',{name:'One',exact:true}).click();
      await p.locator('#hunt-team').fill('Test crew');await p.locator('#hunt-code').fill('REDPODCREWWINS');await p.getByRole('button',{name:'Submit team claim',exact:true}).click();
      await p.evaluate(()=>huntFinish());assert.equal(await p.evaluate(()=>__calls.filter(c=>c.action==='claim').length),1);assert.equal(await p.evaluate(()=>__calls.at(-1).round),'fixture');
      await p.evaluate(()=>__win({ok:true,state:'winner',round:'fixture',step:4,pieces:['RED','POD','CREW','WINS'],prize:'Fixture prize',rules:'Fixture rules',receipt:'fixture-receipt'}));
      await p.waitForFunction(()=>document.getElementById('hunt-title').textContent==='Claim confirmed');assert.match(await p.locator('#pod-hunt').innerText(),/fixture-receipt/);
    });
    await check('a refused code keeps the typed team and code; another winner returns to practice',async p=>{
      await open(p);await p.evaluate(()=>{window.__reply={ok:true,state:'open',round:'fixture',step:4,pieces:['RED','POD','CREW','WINS'],prize:'Fixture prize',rules:'Fixture rules'};window.gridlockCloud={huntRequest:async()=>__reply};});
      await p.getByRole('button',{name:'Check prize round',exact:true}).click();
      await p.locator('#hunt-team').fill('<b>Test crew</b>');await p.locator('#hunt-code').fill('wrong');
      await p.evaluate(()=>__reply.said='Join the pieces.');await p.getByRole('button',{name:'Submit team claim',exact:true}).click();
      assert.equal(await p.locator('#hunt-team').inputValue(),'<b>Test crew</b>');assert.equal(await p.locator('#hunt-code').inputValue(),'wrong');
      await p.evaluate(()=>{__reply={ok:true,state:'claimed'};});await p.getByRole('button',{name:'Submit team claim',exact:true}).click();
      assert.match(await p.locator('#pod-hunt').innerText(),/Another team has already claimed/);assert.equal(await p.getByRole('button',{name:'A pod',exact:true}).count(),1);
    });
    for(const [width,height]of [[390,844],[768,1024],[1024,768]])await check(`hunt at ${width}x${height}: named 44px controls, no horizontal overflow, practice and final code fit`,async p=>{
      await open(p);
      async function fits(){const r=await p.locator('#pod-hunt').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,bad:[...el.querySelectorAll('button,input,summary')].filter(e=>{const r=e.getBoundingClientRect();return r.height<44||r.width<44||(!e.textContent.trim()&&!e.labels?.length&&!e.getAttribute('aria-label'));}).map(e=>e.outerHTML)}));assert.deepEqual(r,{overflow:false,bad:[]});}
      await fits();
      if(process.env.GRIDLOCK_TEST_SHOTS){fs.mkdirSync(process.env.GRIDLOCK_TEST_SHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,`hunt-${width}x${height}.png`)});}
      await finish(p);await fits();
      if(process.env.GRIDLOCK_TEST_SHOTS)await p.screenshot({path:path.join(process.env.GRIDLOCK_TEST_SHOTS,`hunt-code-${width}x${height}.png`)});
    },{width,height});
    console.log(`${count}/${count} pod-hunt browser checks passed.`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

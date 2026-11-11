import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {signAccess} from '../supabase/functions/_shared/web-payments.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core'),{launchOptions}=require('../scripts/browser');
const {createServer}=require('../scripts/serve'),{build}=require('../scripts/cloud-build');
const seed=require('../scripts/seed'),root=path.resolve(import.meta.dirname,'..');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const out=path.join(root,'dist/payment-browser-test');
const evidence=path.join(root,'work/payment-evidence');
await mkdir(out,{recursive:true});
await mkdir(evidence,{recursive:true});
const server=createServer({root:out});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',audience=new URL(url).origin;
const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const privateKey=await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);
const cfg={url:'https://payments-fixture.supabase.co',anonKey:'sb_publishable_abcdefghijklmnopqrstuvwxyz',redirectTo:url,
 payments:{mode:'test',verificationKey:publicKey}};
build({...cfg,outDir:out});
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
const browser=await chromium.launch(launchOptions());
let context,page,errors,response,checkoutCalls=0;
async function receipt({user=A,plan='program',source='day-pass',expires=Date.now()+3600000,aud=audience,mode='test'}={}){
 return signAccess(privateKey,{user,plan,source,expires,audience:aud,mode});
}
async function fresh(viewport={width:390,height:844}){
 if(context)await context.close();
 context=await browser.newContext({viewport,serviceWorkers:'block'});
 page=await context.newPage();errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({seed,A})=>{
  if(localStorage.getItem('payment-fixture'))return;
  localStorage.setItem('payment-fixture','1');
  localStorage.setItem('gridlock.coach.v2',JSON.stringify({...seed,email:'a@example.test',fmtAsk:false,fmtDone:true,syncAsk:false,syncOn:false}));
  localStorage.setItem('gridlock.staff.v2',JSON.stringify({email:'a@example.test',salt:'00'.repeat(16),hash:'fixture',cloud:true,uid:A}));
  localStorage.setItem('grindx.cloud.session',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',
   expires_at:Date.now()+86400000,user:{id:A,email:'a@example.test'}}));
 },{seed,A});
 await page.route('https://payments-fixture.supabase.co/**',async route=>{
  const req=route.request(),body=req.postDataJSON();
  if(req.url().includes('/functions/v1/gridlock-payments')){
   if(body.action==='checkout'){checkoutCalls++;await route.fulfill({json:{ok:true,pending:true}});return;}
   if(response==='offline'){await route.abort();return;}
   if(response==='denied'){await route.fulfill({status:403,json:{error:'Denied'}});return;}
   const r=typeof response==='function'?await response():response;
   await route.fulfill({json:{ok:true,user:{id:A},receipt:r}});return;
  }
  await route.fulfill({json:[]});
 });
 await page.goto(url+'?payment=return');
  await page.waitForFunction(()=>!document.getElementById('root').innerText.includes('Checking account access…'));
}
try{
 await check('build only includes public verification material; native/offline stay unchanged',async()=>{
  const config=await readFile(path.join(out,'gridlock-config.js'),'utf8');
  assert.ok(config.includes(publicKey.x));assert.ok(!config.includes(privateKey.d));
  assert.throws(()=>build({...cfg,payments:{mode:'live',verificationKey:privateKey},outDir:out+'-bad'}),/public P-256/);
  assert.throws(()=>build({...cfg,associations:false,outDir:out+'-bad'}),/native/);
  const offline=await readFile(path.join(root,'web/index.html'),'utf8');
  assert.ok(!offline.includes('gridlock-web-payments.js'));
 });
 await check('return query alone cannot unlock tools; phone paywall has backup and no overflow',async()=>{
  response=await receipt({plan:'free',source:'none',expires:null});await fresh();
  assert.equal(await page.evaluate(()=>planOf()),'free');
  assert.ok(await page.locator('[data-pass-locked]').isVisible());
  assert.ok(await page.getByRole('button',{name:'Save everything',exact:true}).isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(evidence,'paywall-phone.png'),fullPage:true});
  assert.deepEqual(errors,[]);
 });
 await check('verified paid access opens every Coach tool; one checkout click cannot grant access',async()=>{
  await page.getByRole('button',{name:'Buy today’s pass · $19.97',exact:true}).dblclick();
  await page.waitForFunction(()=>!_webPassBusy);
  assert.equal(await page.evaluate(()=>planOf()),'free');assert.equal(checkoutCalls,1);
  response=await receipt();await page.getByRole('button',{name:'Check access',exact:true}).click();
  await page.waitForFunction(()=>planOf()==='program');
  for(const tab of ['playbook','tally','scout','sightlines']){
   await page.evaluate(tab=>set({tab,fmtAsk:false,syncAsk:false}),tab);
   assert.equal(await page.locator('[data-pass-locked]').count(),0);
  }
  assert.deepEqual(errors,[]);
 });
 await check('offline uses only the previously verified same-account receipt',async()=>{
  response='offline';await page.evaluate(()=>window.refreshAccountAccess());
  assert.equal(await page.evaluate(()=>planOf()),'program');
  await page.reload();await page.waitForFunction(()=>planOf()==='program');
  await page.evaluate(B=>{
   const s=JSON.parse(localStorage.getItem('grindx.cloud.session'));s.user.id=B;localStorage.setItem('grindx.cloud.session',JSON.stringify(s));
   const a=JSON.parse(localStorage.getItem('gridlock.staff.v2'));a.uid=B;localStorage.setItem('gridlock.staff.v2',JSON.stringify(a));
   render();
  },B);
  assert.equal(await page.evaluate(()=>planOf()),'free');
 });
 await check('bad signature, other account, other host and other mode cannot unlock',async()=>{
  for(const r of [(await receipt()).slice(0,-3)+'xxx',await receipt({user:B}),await receipt({aud:'https://wrong.example'}),await receipt({mode:'live'})]){
   response=r;await fresh();assert.equal(await page.evaluate(()=>planOf()),'free');
  }
 });
 await check('a missing payment adapter cannot fall back to free access',async()=>{
  response=await receipt();await fresh();await page.waitForFunction(()=>planOf()==='program');
  await page.evaluate(()=>{delete window.gridlockWebPayments;render();});
  assert.equal(await page.evaluate(()=>planOf()),'free');
  assert.ok((await page.locator('#root').innerText()).includes('Access checking did not load'));
  assert.ok(await page.getByRole('button',{name:'Buy today’s pass · $19.97',exact:true}).isDisabled());
 });
 await check('a late paid response cannot grant a different signed-in account',async()=>{
  response=await receipt({plan:'free',source:'none',expires:null});await fresh();
  let release;const pending=new Promise(r=>release=r);response=()=>pending;
  await page.evaluate(()=>{window.pendingPass=window.gridlockWebPayments.refresh(readAccount().uid);});
  await page.evaluate(B=>{
   const s=JSON.parse(localStorage.getItem('grindx.cloud.session'));s.user.id=B;localStorage.setItem('grindx.cloud.session',JSON.stringify(s));
  },B);
  release(await receipt());await page.evaluate(()=>window.pendingPass);
  assert.equal(await page.evaluate(()=>planOf()),'free');
 });
 await check('expiration stops a stale scoring tap and keeps season/export/account available on tablet',async()=>{
  response=await receipt({expires:Date.now()+60000});await fresh({width:820,height:1180});
  await page.waitForFunction(()=>planOf()==='program');
  await page.evaluate(()=>set({tab:'tally'}));
  const before=await page.evaluate(()=>JSON.stringify({score:matchScore(),point:S.point}));
  await page.evaluate(()=>{
   const old=Date.now;Date.now=()=>old()+120000;
   const score=document.querySelector('button[onclick*="tapResult"]');
   if(!score)throw Error('Expected the actual Tally result button');
   score.click();
   render();
  });
  assert.equal(await page.evaluate(()=>planOf()),'free');
  assert.equal(await page.evaluate(()=>JSON.stringify({score:matchScore(),point:S.point})),before);
  await page.getByRole('button',{name:'Account & backups',exact:true}).click();
  assert.ok((await page.locator('.main').innerText()).includes('League sync'));
  assert.ok(await page.getByRole('button',{name:'Match spreadsheet',exact:true}).isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Match spreadsheet',exact:true}).click();
  const csv=await download;
  assert.match(await readFile(await csv.path(),'utf8'),/Opponent/);
  await page.screenshot({path:path.join(evidence,'expired-tablet.png'),fullPage:true});
  assert.deepEqual(errors,[]);
 });
 await check('server refund/refusal replaces cached paid access; beta and admin receipts keep all tools',async()=>{
  for(const source of ['beta','existing']){
   response=await receipt({source,expires:null});await fresh();await page.waitForFunction(()=>planOf()==='program');
  }
  response=await receipt({plan:'free',source:'none',expires:null});
  await page.evaluate(()=>window.refreshAccountAccess());assert.equal(await page.evaluate(()=>planOf()),'free');
  response='offline';await page.evaluate(()=>window.refreshAccountAccess());assert.equal(await page.evaluate(()=>planOf()),'free');
  response=await receipt();await fresh();await page.waitForFunction(()=>planOf()==='program');
  response='denied';await page.evaluate(()=>window.refreshAccountAccess());assert.equal(await page.evaluate(()=>planOf()),'free');
  assert.deepEqual(errors,[]);
 });
 console.log('Web payment browser checks: '+passed+'/'+passed);
}catch(error){console.error('Browser errors:',errors);console.error(await page?.locator('body').innerText());throw error;}
finally{await context?.close();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}

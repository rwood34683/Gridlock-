"use strict";
const assert = require("node:assert/strict"), fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {chromium}=require("playwright-core"),{launchOptions}=require("../scripts/browser");
const {build,pageUrls,configuredOptions}=require("../scripts/cloud-build"),{buildIOS}=require("../scripts/ios-cloud"),{buildSite,ACCOUNT,SYNC,grokCopy}=require("../scripts/site-live");
const ROOT=path.resolve(__dirname,".."),config={url:"https://fixture.supabase.co",anonKey:"sb_publishable_abcdefghijklmnopqrstuvwxyz"};
function generated(out){const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(out,"gridlock-config.js"),"utf8"),sandbox);return sandbox.window.GRIDLOCK_CLOUD;}
(async()=>{
 for(const domain of ['http://example.com','https://coach:password@example.com','coach@example.com','https://example.com/path','https://example.com?x=1','https://example.com/#x','https://example.com\\@evil.test'])assert.throws(()=>pageUrls(domain));
 assert.deepEqual(pageUrls('example.com'),{privacyUrl:'https://example.com/privacy',supportUrl:'https://example.com/support'});
 const out=path.join(ROOT,'dist/cloud-pages');build({...config,outDir:out});
 const contact=JSON.parse(fs.readFileSync(path.join(ROOT,'site/contact.json'),'utf8'));
 assert.deepEqual(configuredOptions({}),contact.cloud);
 assert.equal(generated(out).privacyUrl,`https://${contact.domain}/privacy`);
 assert.equal(generated(out).supportUrl,`https://${contact.domain}/support`);
 const ios=buildIOS(config);assert.equal(generated(ios.outDir).supportUrl,generated(out).supportUrl);
 const live=buildSite();
 for(const page of ['index','privacy','support']){
   const html=fs.readFileSync(path.join(live,page+'.html'),'utf8');
   assert.ok(html.includes('https://app.gridlockpb.com/'),page+' links the actual app');
   assert.ok(!/league operates|league, not Gridlock|Nobody else reads|There is no server|no remote recovery|no cloud database|Your season stays on your device/.test(html),page+' has no stale claim');
   assert.ok(html.includes("administrators"),page+' explains review');
 }
 for(const page of ['privacy','support']){
  const html=fs.readFileSync(path.join(live,page,'index.html'),'utf8');
  assert.ok(html.includes('Supabase')&&html.includes('password hash')&&html.includes('last sign-in')&&html.includes('Delete account'));
 }
 assert.match(ACCOUNT,/Free, Team or Program/);assert.match(SYNC,/one current copy/);
 assert.equal(fs.readFileSync(path.join(ROOT,'marketing/grok/src/cloud-copy.ts'),'utf8').replace(/\r\n/g,'\n'),grokCopy(),'Grok and template website wording stay aligned');
 const websiteChrome=fs.readFileSync(path.join(ROOT,'marketing/grok/src/components/site-chrome.tsx'),'utf8');
 assert.match(websiteChrome,/Browser beta/);assert.match(websiteChrome,/iPhone \/ iPad/);assert.match(websiteChrome,/PC \/ Mac/);
 assert.doesNotMatch(websiteChrome,/Available for/,'the browser beta does not imply a store listing');
 for(const route of ['index','privacy','support']){
   const source=fs.readFileSync(path.join(ROOT,`marketing/grok/src/routes/${route}.tsx`),'utf8');
   assert.ok(source.includes('CLOUD_COPY.'),route+' uses the confirmed wording');
   assert.ok(!/Nobody else reads|nobody else reads|The season stays on the device|Your data stays on your device|The account is the sign-in/.test(source),route+' removes stale claims');
 }
 const browser=await chromium.launch(launchOptions());
 try{
  const page=await browser.newPage();await page.goto(process.env.APP_URL);
  await page.evaluate(()=>set({entered:true,role:'staff',tab:'more',more:'nexus'}));
  assert.ok(await page.evaluate(()=>{
    const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'scrollTop');let zeroWrites=0;
    const previous=document.querySelector('.main');
    Object.defineProperty(Element.prototype,'scrollTop',{...descriptor,set(value){if(this.classList.contains('main')&&value===0)zeroWrites++;return descriptor.set.call(this,value);}});
    try{render();return document.querySelector('.main')!==previous && zeroWrites===0;}
    finally{Object.defineProperty(Element.prototype,'scrollTop',descriptor);}
  }),'a real redraw at the top does not force layout by restoring zero');
  assert.equal(await page.locator('[aria-label="Privacy and support"] a').count(),0);
  await page.evaluate(()=>{window.GRIDLOCK_CLOUD={privacyUrl:'https://example.com/privacy?a=1&b=%22tag%22',supportUrl:'https://example.com/support'};render();});
  for(const more of ['nexus','help']){
   await page.evaluate(more=>set({tab:'more',more}),more);
   const links=page.locator('[aria-label="Privacy and support"] a');assert.equal(await links.count(),2);
   for(const link of await links.all()){assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener');}
   assert.equal(await links.first().getAttribute('href'),'https://example.com/privacy?a=1&b=%22tag%22');
  }
  for(const value of ['http://example.com','https://user:pw@example.com','javascript:alert(1)','//example.com','https://example.com/" onmouseover="alert(1)','https://example.com\\@evil.test']){
   await page.evaluate(value=>{window.GRIDLOCK_CLOUD={privacyUrl:value,supportUrl:value};render();},value);
   assert.equal(await page.locator('[aria-label="Privacy and support"] a').count(),0,value);
  }
  await page.evaluate(()=>{delete window.GRIDLOCK_CLOUD;window.gridlockCloud={pushSeason:async()=>({ok:true})};set({tab:'more',more:'nexus',syncOn:false});});
  let text=await page.locator('#root').innerText();assert.match(text,/Gridlock PB LLC's administrators can review/);assert.match(text,/A copy sent earlier stays/);assert.ok(!/your league|their admin/i.test(text));
  await page.evaluate(()=>set({syncOn:true}));text=await page.locator('#root').innerText();assert.match(text,/one current copy/);assert.match(text,/Pausing does not delete/);
  assert.match(await page.evaluate(()=>{S.mode="create";return authForm();}),/Gridlock PB LLC/);
  assert.match(await page.evaluate(()=>HELP['more/nexus'].how.join(' ')),/full season/);
  assert.match(await page.evaluate(()=>HELP_Q.find(q=>q[0]==='Where did my season go?')[1]()),/Gridlock PB LLC/);
  await page.evaluate(()=>{delete window.gridlockCloud;render();});text=await page.locator('#root').innerText();assert.match(text,/On this device only. Nothing is sent to a server/);
  assert.ok(!/gridlockpb\.com/.test(fs.readFileSync(path.join(ROOT,'web/index.html'),'utf8')));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.gridlockCloud={pushSeason:async()=>({ok:true})};set({entered:false,mode:'login'});});
  const disclosure=page.locator('.auth-data');
  assert.equal(await disclosure.getAttribute('open'),null);
  assert.match(await page.locator('#root').innerText(),/Use your account on any device/);
  assert.doesNotMatch(await page.locator('#root').innerText(),/administrators can review/);
  await page.fill('#em','coach@example.test');await page.fill('#pw','fixture-password');
  const summary=disclosure.locator('summary');
  assert.ok((await summary.boundingBox()).height>=44,'data explanation has a full-size tap target');
  await summary.click();
  const explanation=await disclosure.innerText();
  assert.match(explanation,/full season/);assert.match(explanation,/Gridlock PB LLC's administrators can review/);
  assert.match(explanation,/pause sending, review or restore/);assert.match(explanation,/Delete account removes your login and that copy/);
  assert.equal(await page.inputValue('#em'),'coach@example.test');assert.equal(await page.inputValue('#pw'),'fixture-password');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await summary.click();assert.equal(await disclosure.getAttribute('open'),null);
  console.log('PASS cloud pages: URL rejection, cloud/iPhone config, live wording, escaped links, offline absence and sync disclosure');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{build}=require('../scripts/cloud-build');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'dist/security-check');
const publicKey='sb_publishable_abcdefghijklmnopqrstuvwxyz';let passed=0,browser;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
  build({url:'https://fixture.example.test',anonKey:publicKey,redirectTo:'https://app.example.test/',outDir:OUT,accountSecurity:true});
  await check('required cloud build includes cached shared security and current admin page',async()=>{
    for(const f of ['gridlock-security.js','admin/index.html'])assert(fs.existsSync(path.join(OUT,f)));
    assert(fs.readFileSync(path.join(OUT,'sw.js'),'utf8').includes('"gridlock-security.js"'));
    assert(fs.readFileSync(path.join(OUT,'gridlock-config.js'),'utf8').includes('"accountSecurity":true'));
    assert(fs.readFileSync(path.join(OUT,'admin/index.html'),'utf8').includes('../gridlock-security.js'));
  });
  browser=await chromium.launch({executablePath:require('../scripts/browser').chromePath(),headless:true});
  for(const [width,height]of [[390,844],[768,1024],[1024,768]]){
    const page=await browser.newPage({viewport:{width,height}}),errors=[],network=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>network.push(r.url()));
    await page.setContent('<!doctype html><button id="start">Sign in</button>');
    await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'native/gridlock-security.js'),'utf8')});
    await page.evaluate(()=>{
      window.state={stage:'mfa',devices:[],verified:[],claims:[]};
      window.bridge={
        async status(){return {ok:state.stage==='done',required:true,code:state.stage==='mfa'?'mfa_required':'device_required',devices:state.devices};},
        async factors(){return {ok:true,factors:[{id:'11111111-1111-4111-8111-111111111111',factor_type:'totp',status:'verified',friendly_name:'Authenticator'}]};},
        async verify(factor,code){state.verified.push(code);if(code!=='123456')return {ok:false,said:'Wrong code. Try again.'};state.stage='device';return {ok:true};},
        async claim(label,replace){state.claims.push({label,replace});state.stage='done';return {ok:true};},
        async revoke(id){state.devices=state.devices.filter(d=>d.id!==id);return {ok:true};}
      };
      document.querySelector('#start').onclick=()=>{window.result=null;gridlockSecurityPrompt(bridge).then(r=>window.result=r);};
    });
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await check(`${width}: wrong authenticator code is refused and can be corrected`,async()=>{
      await page.getByLabel('Six-digit authenticator code').fill('000000');await page.getByRole('button',{name:'Verify',exact:true}).click();await page.getByText('Wrong code. Try again.').waitFor();assert.equal(await page.locator('dialog').count(),1);
      await page.getByLabel('Six-digit authenticator code').fill('123456');await page.getByRole('button',{name:'Verify',exact:true}).click();await page.getByRole('heading',{name:'Your devices'}).waitFor();
    });
    await check(`${width}: device screen is named, 44px touch targets and no horizontal overflow`,async()=>{
      const issues=await page.evaluate(()=>[...document.querySelectorAll('dialog button,dialog input,dialog select')].flatMap(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44||(!e.textContent&&!e.labels?.length)?[e.outerHTML]:[];}));assert.deepEqual(issues,[]);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth));
      assert(await page.evaluate(()=>{const r=document.querySelector('dialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),'dialog must stay entirely on screen');
      const screenshots=path.join(ROOT,'dist/security-screenshots');fs.mkdirSync(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,`devices-${width}.png`),fullPage:true});
    });
    await check(`${width}: naming this device completes sign-in`,async()=>{await page.getByLabel('Name this device').fill('My laptop');await page.getByRole('button',{name:'Use this device'}).click();await page.waitForFunction(()=>window.result===true);assert.equal((await page.evaluate(()=>state.claims))[0].label,'My laptop');});
    await check(`${width}: fourth device requires a choice and Cancel preserves the old session`,async()=>{
      await page.evaluate(()=>{state.stage='device';state.devices=['Phone','Tablet','Laptop'].map((label,i)=>({id:String(i),label}));});
      await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:'Your devices'}).waitFor();assert.equal(await page.getByRole('button',{name:'Use this device'}).count(),0);
      page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Replace Tablet'}).click();assert.equal((await page.evaluate(()=>state.claims)).length,1);
      page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Replace Tablet'}).click();await page.waitForFunction(()=>window.result===true);assert.equal((await page.evaluate(()=>state.claims))[1].replace,'1');
    });
    await check(`${width}: keyboard cancel resolves false without a network request`,async()=>{await page.evaluate(()=>state.stage='mfa');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('Six-digit authenticator code').waitFor();await page.keyboard.press('Escape');await page.waitForFunction(()=>window.result===false);assert.deepEqual(errors,[]);assert.deepEqual(network,[]);});
    await page.close();
  }
  console.log(`${passed}/${passed} security browser/build checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});

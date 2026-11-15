'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {chromium}=require('playwright-core'),{build}=require('../scripts/cloud-build');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'dist/security-flow'),PLAYER=path.join(ROOT,'dist/player-cloud');
let browser,passed=0;
async function check(name,fn){await fn();console.log('PASS '+name);passed++;}
(async()=>{
  const config={url:'https://account.example.test',anonKey:'sb_publishable_abcdefghijklmnopqrstuvwxyz',redirectTo:'https://app.example.test/'};
  build({...config,outDir:OUT,accountSecurity:true});require('../scripts/player-cloud').build({...config,redirectTo:'https://app.example.test/player/'});
  browser=await chromium.launch(require('../scripts/browser').launchOptions());
  for(const app of ['coach','player']){
    const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    const uid=randomUUID(),sid=randomUUID(),factor=randomUUID(),email='security-test@example.test';let aal='aal1',enrolled=false,approved=false,revoked=false;const requests=[],errors=[];
    const token=()=> 'fixture.'+Buffer.from(JSON.stringify({sub:uid,session_id:sid,aal})).toString('base64url')+'.signature';
    const session=()=>({access_token:token(),refresh_token:'fixture',expires_in:3600,user:{id:uid,email}});
    await ctx.route('**/*',async route=>{
      const req=route.request(),u=new URL(req.url());
      if(u.origin==='https://app.example.test'){
        const dir=app==='player'?PLAYER:OUT,name=decodeURIComponent(u.pathname.replace(/^\/player\//,'/')).replace(/^\//,'')||'index.html';
        const file=path.resolve(dir,name);assert(file.startsWith(dir+path.sep));
        if(!fs.existsSync(file))return route.fulfill({status:404,body:'Missing test asset'});
        const ext=path.extname(file),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}[ext]||'application/octet-stream';
        return route.fulfill({contentType:type,body:fs.readFileSync(file)});
      }
      assert.equal(u.origin,'https://account.example.test','unexpected external request');requests.push(u.pathname);
      const body=req.postData()?req.postDataJSON():{},send=(value,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(value)});
      if(req.method()==='OPTIONS')return send({});
      if(u.pathname==='/auth/v1/token')return send(session());
      if(u.pathname==='/auth/v1/user')return send({id:uid,email,factors:enrolled?[{id:factor,factor_type:'totp',status:aal==='aal2'?'verified':'unverified'}]:[]});
      if(u.pathname==='/auth/v1/factors'){enrolled=true;return send({id:factor,totp:{secret:'TESTSETUPKEY',qr_code:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100"/></svg>'}});}
      if(u.pathname.endsWith('/challenge'))return send({id:'challenge'});
      if(u.pathname.endsWith('/verify')){if(body.code!=='123456')return send({message:'Wrong code'},400);aal='aal2';return send(session());}
      if(u.pathname.endsWith('/gridlock_security_action')){
        if(aal!=='aal2')return send({ok:false,required:true,code:'mfa_required'});
        if(revoked)return send({ok:false,code:'device_revoked'});
        if(body.action==='claim')approved=true;
        return send({ok:approved,required:true,code:approved?'approved':'device_required',user_id:uid,session_id:sid,devices:approved?[{id:sid,label:'Test phone',current:true}]:[]});
      }
      if(u.pathname.endsWith('/gridlock_team_action')){assert(approved&&aal==='aal2');return send({ok:true,can_create:false,teams:[]});}
      if(u.pathname.endsWith('/entitlements')){assert(approved);return send([{user_id:uid,plan:'program',expires_at:null}]);}
      if(u.pathname.endsWith('/seasons')){assert(approved);return send([]);}
      if(u.pathname==='/auth/v1/logout')return send({});
      return send({error:'Unexpected fixture request'},400);
    });
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('https://app.example.test/'+(app==='player'?'player/':''));
    if(app==='coach'){await page.evaluate(()=>set({mode:'login'}));await page.fill('#em',email);await page.fill('#pw','fixture-password');await page.evaluate(()=>{window.signingIn=doAuth();});}
    else{await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('fixture-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();}
    await check(app+': new account sees authenticator enrollment before private data',async()=>{
      await page.getByRole('button',{name:'Set up authenticator'}).waitFor();assert(!requests.some(p=>p.endsWith('/seasons')||p.endsWith('/gridlock_team_action')));
      await page.getByRole('button',{name:'Set up authenticator'}).click();await page.getByRole('img',{name:'Authenticator setup QR code'}).waitFor();
      await page.getByLabel('Six-digit authenticator code').fill('123456');await page.getByRole('button',{name:'Verify',exact:true}).click();await page.getByRole('heading',{name:'Your devices'}).waitFor();
    });
    await check(app+': real app sign-in waits for explicit device approval',async()=>{
      assert.equal(await page.evaluate(()=>window.gridlockCloud.session()),null);
      await page.getByRole('button',{name:'Use this device'}).click();await page.waitForFunction(()=>window.gridlockCloud.session()?.user?.email==='security-test@example.test');
      if(app==='coach'){await page.waitForFunction(()=>S.entered);await page.getByRole('button',{name:'Not now',exact:true}).click();await page.evaluate(()=>{fmtDone();openAccount();});}
      else await page.getByRole('heading',{name:'Your teams',exact:true}).waitFor();
      try{await page.getByRole('button',{name:'Your devices',exact:true}).waitFor();}
      catch(e){console.error(await page.evaluate(()=>({text:document.body.innerText.slice(0,2200),state:typeof S==='undefined'?null:{entered:S.entered,tab:S.tab,more:S.more,fmtAsk:S.fmtAsk,syncAsk:S.syncAsk},ready:window.gridlockCloud.securityReady()})));throw e;}
      assert(!await page.evaluate(()=>Object.values(localStorage).join('').includes('TESTSETUPKEY')));
    });
    await check(app+': revocation locks the real app on its next server check',async()=>{
      revoked=true;await page.evaluate(()=>window.gridlockCloud.getSeason());
      if(app==='coach'){await page.getByRole('heading',{name:'Verify your sign-in'}).waitFor();await page.getByRole('button',{name:'Save a season copy'}).waitFor();assert(await page.evaluate(()=>S.entered));}
      else await page.getByRole('heading',{name:'Sign in to Gridlock Player'}).waitFor();
      assert.equal(await page.evaluate(()=>window.gridlockCloud.session()),null);assert.deepEqual(errors,[]);
    });
    await ctx.close();
  }
  console.log(`${passed}/${passed} complete Coach/Player security flows passed with mock Auth; hosted MFA remains unverified.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});

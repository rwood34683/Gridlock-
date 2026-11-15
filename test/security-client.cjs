'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../native/gridlock-cloud.js'),'utf8');
const A=randomUUID(),B=randomUUID(),SID=randomUUID(),FACTOR=randomUUID(),KEY='grindx.cloud.session';let passed=0;
const jwt=(uid,aal,sid=SID)=>'test.'+Buffer.from(JSON.stringify({sub:uid,aal,session_id:sid})).toString('base64url')+'.fixture';
const response=(body,status=200)=>({ok:status<300,status,json:async()=>body});
const credentials=(id=A,aal='aal1')=>({access_token:jwt(id,aal),refresh_token:'fixture-refresh',expires_in:3600,user:{id,email:id+'@example.test'}});
function setup(extra={}){
  const store=new Map(),state={requests:[],aal:'aal1',approved:false,user:A,...extra};let prompt;
  const window={dispatchEvent:()=>state.notifications=(state.notifications||0)+1,GRIDLOCK_CLOUD:{url:'https://fixture.example.test',anonKey:'fixture-public',accountSecurity:true},
    gridlockSecurityPrompt:async bridge=>{prompt=bridge;return state.prompt?state.prompt(bridge):false;}};
  const context={window,Event,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},atob:s=>Buffer.from(s,'base64').toString(),Date,JSON,Promise,TextEncoder,setTimeout,clearTimeout,
    fetch:async(url,options)=>{
      state.requests.push({url,options});const body=options.body?JSON.parse(options.body):{};
      if(state.offline)throw Error('offline');
      if(state.route){const r=await state.route(url,options);if(r)return r;}
      if(url.includes('grant_type=password'))return response(credentials(state.user,state.aal));
      if(url.endsWith('/user'))return response({id:state.user,email:state.user+'@example.test',factors:[{id:FACTOR,factor_type:'totp',status:'verified'}]});
      if(url.endsWith('/challenge'))return response({id:'challenge'});
      if(url.endsWith('/verify')){if(body.code!=='123456')return response({message:'Wrong code'},400);state.aal='aal2';return response(credentials(state.user,'aal2'));}
      if(url.includes('gridlock_security_action')){
        if(state.disabled)return response({ok:true,required:false});
        if(state.aal!=='aal2')return response({ok:false,required:true,code:'mfa_required'});
        if(state.revoked)return response({ok:false,required:true,code:'device_revoked'});
        if(body.action==='claim')state.approved=true;
        if(body.action==='revoke')state.approved=false;
        return response({ok:state.approved,required:true,code:state.approved?'approved':'device_required',user_id:state.replyUser||state.user,session_id:SID,devices:[]});
      }
      if(url.includes('/seasons?'))return response([]);
      if(url.includes('/entitlements?'))return response([]);
      if(url.includes('gridlock_team_action'))return response({ok:true,teams:[]});
      return response({});
    }};
  vm.runInNewContext(source,context);
  return {api:window.gridlockCloud,state,store,window,get prompt(){return prompt;}};
}
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
const complete=async b=>{assert.equal((await b.status()).code,'mfa_required');assert.equal((await b.factors()).factors.length,1);assert.equal((await b.verify(FACTOR,'123456')).ok,true);assert.equal((await b.claim('My phone')).ok,true);return true;};
(async()=>{
  await check('password alone neither signs in nor reads a season',async()=>{const h=setup();assert.equal((await h.api.signIn('x','password')).ok,false);assert.equal(h.api.session(),null);assert.equal((await h.api.getSeason()).ok,false);assert(!h.state.requests.some(x=>x.url.includes('/seasons?')));});
  await check('valid second factor and device approval complete sign-in',async()=>{const h=setup({prompt:complete});assert.equal((await h.api.signIn('x','password')).ok,true);assert.equal(h.api.session().user.id,A);assert.equal(h.api.securityReady(),true);assert.equal((await h.api.getSeason()).ok,true);assert(![...h.store.values()].some(x=>x.includes('123456')));});
  await check('wrong code stays in MFA step; retry succeeds',async()=>{const h=setup({prompt:async b=>{assert.equal((await b.verify(FACTOR,'000000')).ok,false);assert.equal((await b.status()).code,'mfa_required');return complete(b);}});assert.equal((await h.api.signIn('x','password')).ok,true);});
  await check('disabled policy is not accepted by a required client',async()=>{const h=setup({disabled:true,prompt:async b=>{assert.equal((await b.status()).ok,false);return true;}});assert.equal((await h.api.signIn('x','password')).ok,false);assert.equal(h.api.session(),null);});
  await check('revoked device blocks cloud reads, writes and membership, retaining its local session for an explanation',async()=>{const h=setup({prompt:complete});await h.api.signIn('x','p');h.state.revoked=true;const before=h.state.requests.length;assert.equal((await h.api.getSeason()).ok,false);assert.equal((await h.api.getEntitlement()).ok,false);assert.equal((await h.api.teamAccess('list')).ok,false);assert.equal(h.api.session(),null);assert(h.store.has(KEY));assert(!h.state.requests.slice(before).some(x=>x.url.includes('/seasons?')||x.url.includes('/entitlements?')||x.url.includes('gridlock_team_action')));});
  await check('signout cancels a pending authenticator result',async()=>{let release;const gate=new Promise(r=>release=r);const h=setup({prompt:async b=>{await gate;assert.equal((await b.verify(FACTOR,'123456')).ok,false);return true;}});const p=h.api.signIn('x','p');await new Promise(r=>setTimeout(r,10));h.api.signOut();release();assert.equal((await p).ok,false);assert.equal(h.api.session(),null);});
  await check('switching accounts during MFA cannot approve the previous user',async()=>{let release;const gate=new Promise(r=>release=r);const h=setup({prompt:async b=>{await gate;return (await b.verify(FACTOR,'123456')).ok;}});const first=h.api.signIn('a','p');await new Promise(r=>setTimeout(r,10));h.state.user=B;h.state.prompt=async()=>false;const second=h.api.signIn('b','p');release();assert.equal((await first).ok,false);assert.equal((await second).ok,false);assert.equal(h.api.session(),null);});
  await check('another-account approval response fails closed',async()=>{const h=setup({aal:'aal2',approved:true,replyUser:B});assert.equal((await h.api.signIn('x','p')).ok,false);assert.equal(h.api.session(),null);});
  await check('offline after verified sign-in preserves local approval but never pretends cloud sync succeeded',async()=>{const h=setup({prompt:complete});await h.api.signIn('x','p');h.state.offline=true;assert.equal(h.api.securityReady(),true);assert.equal((await h.api.getSeason()).ok,false);assert.equal(h.api.securityReady(),true);});
  await check('local signout leaves the other two device sessions alone',async()=>{const h=setup({prompt:complete});await h.api.signIn('x','p');h.api.signOut();assert.equal(h.api.session(),null);assert(h.state.requests.some(x=>x.url.endsWith('/logout?scope=local')));assert(!h.state.requests.some(x=>/logout$/.test(x.url)));});
  await check('unchanged security checks never redraw unfinished code/form edits',async()=>{const h=setup({prompt:complete});await h.api.signIn('x','p');const before=h.state.notifications;await h.api.getSeason();await h.api.getEntitlement();assert.equal(h.state.notifications,before);h.state.revoked=true;await h.api.getSeason();assert.equal(h.state.notifications,before+1);});
  console.log(`${passed}/${passed} security adapter checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});

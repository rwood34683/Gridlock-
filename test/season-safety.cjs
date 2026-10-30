"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto,createHash}=require('node:crypto');
const root=path.resolve(process.env.GRIDLOCK_TEST_ROOT||path.join(__dirname,'..'));
const adapter=fs.readFileSync(path.join(root,'native/gridlock-cloud.js'),'utf8');
const app=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
const response=(body={},status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const copy=(n=1)=>({format:'gridlock.coach.copy',data:{matches:Array.from({length:n},(_,i)=>({id:'m'+i}))}});
const tick=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve;return{promise:new Promise(r=>{resolve=r;}),resolve:v=>resolve(v)};};
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
function server(){let row=null;return{get row(){return row;},async route(url,opts){
  if(url.includes('/rpc/gridlock_write_season')){
    const b=JSON.parse(opts.body),current=row?.revision||0;
    if(b.expected_revision!==current)return response({ok:false,conflict:true,revision:current});
    row={revision:current+1,label:b.season_label,payload:b.remove_season?null:b.season_payload,deleted_at:b.remove_season?'today':null};
    return response({ok:true,revision:row.revision,removed:!!row.deleted_at});
  }return response(row?[row]:[]);
}};}
function device(route,store=new Map()){
  const requests=[],window={GRIDLOCK_CLOUD:{url:'https://fixture.supabase.co',anonKey:'public-fixture'}};
  const credentials={access_token:'fixture',refresh_token:'fixture-refresh',expires_in:3600,user:{id:'owner',email:'owner@example.test'}};
  vm.runInNewContext(adapter,{window,TextEncoder,URL,URLSearchParams,Date,JSON,Promise,
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    fetch:async(url,opts)=>{requests.push({url,...opts});return url.includes('/token?')?response(credentials):route(url,opts);}});
  return{api:window.gridlockCloud,requests,store,login:()=>window.gridlockCloud.signIn('owner@example.test','fixture-password')};
}
function syncHarness(){
  let clock=1000000,nextTimer=0;const timers=new Map(),uploads=[],events=new Map();
  const state={entered:true,role:'staff',email:'owner@example.test',syncOn:true,syncAt:null};
  const cloud={pushSeason:async(_label,payload)=>{uploads.push(payload);return{ok:true};}};
  const context=vm.createContext({window:{gridlockCloud:cloud,addEventListener:(name,fn)=>events.set(name,fn)},S:state,
    Date:{now:()=>clock},Promise,readAccount:()=>({}),clearAccountGrant(){},_authAttempt:0,_recoveryUser:null,_recoveryBusy:false,
    copyPayload:()=>JSON.stringify(copy(uploads.length+1)),pitName:()=>'',render(){},
    setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{at:clock+ms,fn});return id;},clearTimeout:id=>timers.delete(id)});
  const start=app.indexOf('const canSync ='),end=app.indexOf('window.toggleSync =',start);
  vm.runInContext(app.slice(start,end),context);
  context.save=()=>vm.runInContext('maybeSync()',context);
  context.set=values=>Object.assign(state,values);
  return{run:code=>vm.runInContext(code,context),state,cloud,uploads,events,timers,
    async advance(ms){clock+=ms;for(const [id,t]of [...timers])if(t.at<=clock){timers.delete(id);t.fn();}await tick();}};
}
(async()=>{
  await test('stale second device cannot overwrite newer cloud data',async()=>{
    const db=server(),phone=device(db.route),tablet=device(db.route);await phone.login();await tablet.login();
    assert.equal((await phone.api.pushSeason('phone',copy(2))).ok,true);
    assert.equal((await tablet.api.pushSeason('old tablet',copy(1))).conflict,true);assert.equal(db.row.payload.data.matches.length,2);
  });
  await test('an in-flight upload cannot resurrect a deleted cloud row',async()=>{
    const db=server(),phone=device(db.route),tablet=device(db.route);await phone.login();await tablet.login();
    await phone.api.pushSeason('phone',copy());
    const gate=deferred();const delayed=device(async(url,opts)=>{await gate.promise;return db.route(url,opts);},new Map(phone.store));await delayed.login();
    const sending=delayed.api.pushSeason('delayed',copy(2));await tick();
    assert.equal((await tablet.api.deleteSeason()).ok,true);gate.resolve();assert.equal((await sending).conflict,true);assert(db.row.deleted_at);assert.equal(db.row.payload,null);
  });
  await test('restore downloads without accepting a new revision until explicit consent',async()=>{
    const db=server(),a=device(db.route),b=device(db.route);await a.login();await b.login();await a.api.pushSeason('phone',copy(2));
    const loaded=await b.api.getSeason();assert.equal(loaded.revision,1);assert.equal((await b.api.pushSeason('stale',copy())).conflict,true);
    assert.equal(b.api.acceptSeason('other',loaded.revision),false);assert.equal(b.api.acceptSeason('owner',loaded.revision),true);
    assert.equal((await b.api.pushSeason('restored',copy(3))).ok,true);assert.equal(db.row.payload.data.matches.length,3);
  });
  await test('the same device can explicitly resume sharing after deletion',async()=>{
    const db=server(),a=device(db.route);await a.login();await a.api.pushSeason('phone',copy());await a.api.deleteSeason();assert(db.row.deleted_at);
    assert.equal((await a.api.pushSeason('renewed',copy())).ok,true);assert.equal(db.row.deleted_at,null);
  });
  await test('oversized and invalid copies do not reach the write endpoint',async()=>{
    const db=server(),a=device(db.route);await a.login();assert.equal((await a.api.pushSeason('bad',{})).ok,false);
    assert.equal((await a.api.pushSeason('large',{format:'gridlock.coach.copy',data:{large:'x'.repeat(2097152)}})).ok,false);
    assert.equal(a.requests.filter(r=>r.url.includes('/rpc/')).length,0);
  });
  await test('another tab sharing storage retains its own baseline revision',async()=>{
    const db=server(),shared=new Map(),a=device(db.route,shared);await a.login();await a.api.pushSeason('phone',copy());
    const b=device(db.route,shared);assert.equal((await a.api.pushSeason('new',copy(2))).ok,true);
    assert.equal((await b.api.pushSeason('stale tab',copy())).conflict,true);
  });
  await test('last edit inside cooldown is sent after the trailing timer',async()=>{
    const h=syncHarness();h.run('maybeSync()');await h.advance(0);assert.equal(h.uploads.length,1);
    await h.advance(1000);h.run('maybeSync()');assert.equal(h.uploads.length,1);assert.equal(h.timers.size,1);
    await h.advance(89000);assert.equal(h.uploads.length,2);assert.equal(h.timers.size,0);
  });
  await test('offline upload is retained and retried immediately on reconnect',async()=>{
    const h=syncHarness();let online=false;h.cloud.pushSeason=async()=>{h.uploads.push('attempt');return online?{ok:true}:{ok:false,offline:true};};
    h.run('maybeSync()');await h.advance(0);assert.equal(h.timers.size,1);online=true;h.events.get('online')();await h.advance(0);assert.equal(h.uploads.length,2);assert.equal(h.timers.size,0);
  });
  await test('conflict pauses automatic sharing and does not retry stale data',async()=>{
    const h=syncHarness();h.cloud.pushSeason=async()=>({ok:false,conflict:true,said:'Review cloud copy'});h.run('maybeSync()');await h.advance(0);
    assert.equal(h.state.syncOn,false);assert.equal(h.timers.size,0);assert.match(h.state.syncSaid,/Review/);
  });
  await test('logout cancels a pending trailing upload',async()=>{
    const h=syncHarness();h.run('maybeSync()');await h.advance(0);h.run('maybeSync()');assert.equal(h.timers.size,1);h.run('window.staffSignOut()');await h.advance(90000);assert.equal(h.uploads.length,1);
  });
  const start=app.indexOf('async function hashPass('),end=app.indexOf('\nfunction newSalt()',start);
  const ctx=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,parseInt});vm.runInContext(app.slice(start,end),ctx);
  const salt='00112233445566778899aabbccddeeff';let verifier;
  await test('new offline verifier uses PBKDF2 at 600000 iterations',async()=>{
    verifier=await ctx.hashPass('fixture-password',salt);assert.match(verifier,/^pbkdf2-sha256\$600000\$[a-f0-9]{64}$/);
    assert.equal(await ctx.verifyAccountPassword('fixture-password',{salt,hash:verifier}),true);
  });
  await test('wrong password and corrupted verifier are refused',async()=>{
    assert.equal(await ctx.verifyAccountPassword('wrong',{salt,hash:verifier}),false);assert.equal(await ctx.verifyAccountPassword('fixture-password',{salt,hash:'invalid'}),false);
  });
  await test('legacy verifier can be checked only for migration after a correct password',async()=>{
    const legacy=createHash('sha256').update(salt+'|fixture-password').digest('hex');
    assert.equal(await ctx.verifyAccountPassword('fixture-password',{salt,hash:legacy}),true);assert.equal(await ctx.verifyAccountPassword('wrong',{salt,hash:legacy}),false);
    assert(app.includes('if(!acc.hash.startsWith("pbkdf2-sha256$"))'));
  });
  console.log(`${passed} season and password safety checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});

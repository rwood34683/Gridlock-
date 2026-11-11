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
let passed=0,failed=0;async function test(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function server(){let row=null;return{get row(){return row;},async route(url,opts){
  if(url.includes('/rpc/gridlock_write_season')){
    const b=JSON.parse(opts.body),current=row?.revision||0;
    if(b.expected_revision!==current)return response({ok:false,conflict:true,revision:current});
    row={revision:current+1,label:b.season_label,payload:b.remove_season?null:b.season_payload,deleted_at:b.remove_season?'today':null};
    return response({ok:true,revision:row.revision,removed:!!row.deleted_at});
  }return response(row?[row]:[]);
}};}
function device(route,store=new Map()){
  const requests=[],window={crypto:webcrypto,GRIDLOCK_CLOUD:{url:'https://fixture.supabase.co',anonKey:'public-fixture'}};
  const credentials={access_token:'fixture',refresh_token:'fixture-refresh',expires_in:3600,user:{id:'owner',email:'owner@example.test'}};
  vm.runInNewContext(adapter,{window,TextEncoder,URL,URLSearchParams,Date,JSON,Promise,
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    fetch:async(url,opts)=>{requests.push({url,...opts});return url.includes('/token?')?response(credentials):route(url,opts);}});
  return{api:window.gridlockCloud,requests,store,login:()=>window.gridlockCloud.signIn('owner@example.test','fixture-password')};
}
function syncHarness(){
  let clock=1000000,nextTimer=0;const timers=new Map(),uploads=[],events=new Map(),store=new Map(),prompts=[],restores=[];
  const state={entered:true,role:'staff',email:'owner@example.test',syncOn:true,syncAt:null};
  const cloud={pushSeason:async(_label,payload)=>{uploads.push(payload);return{ok:true};},deleteSeason:async()=>({ok:true}),acceptSeason:()=>true};
  const context=vm.createContext({window:{gridlockCloud:cloud,addEventListener:(name,fn)=>events.set(name,fn),loadCopy:(_mode,raw)=>{restores.push(raw);return true;}},S:state,
    Date:{now:()=>clock},Promise,readAccount:()=>({}),clearAccountGrant(){},_authAttempt:0,_stale:false,_recoveryUser:null,_recoveryBusy:false,
    STORE_KEY:'fixture.season',localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    confirm:message=>{prompts.push(message);return true;},readCopy:raw=>({payload:JSON.parse(raw)}),
    copyPayload:()=>JSON.stringify(copy(uploads.length+1)),pitName:()=>'',render(){},curMatch:()=>({id:'m1'}),sheetEmpty:()=>true,
    setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{at:clock+ms,fn});return id;},clearTimeout:id=>timers.delete(id)});
  const start=app.indexOf('const canSync ='),end=app.indexOf('window.deleteCloudAccount =',start);
  vm.runInContext(app.slice(start,end),context);
  Object.assign(context,context.window);
  context.save=()=>vm.runInContext('maybeSync()',context);
  context.set=values=>Object.assign(state,values);
  return{run:code=>vm.runInContext(code,context),state,cloud,uploads,events,timers,store,prompts,restores,
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
  await test('a late review cannot restart sharing after cloud deletion',async()=>{
    const h=syncHarness(),gate=deferred();h.cloud.getSeason=()=>gate.promise;
    const reviewing=h.run('window.reviewCloudSeason()');await tick();
    await h.run('window.deleteSynced()');const removed=h.state.syncSaid;
    gate.resolve({ok:false,said:'Review failed'});await reviewing;
    assert.equal(h.state.syncOn,false);assert.equal(h.state.syncSaid,removed);
    await h.advance(90000);assert.equal(h.uploads.length,0);
  });
  await test('a late review cannot restore data after a newer sync choice',async()=>{
    const h=syncHarness(),gate=deferred();h.cloud.getSeason=()=>gate.promise;
    const reviewing=h.run('window.reviewCloudSeason()');await tick();
    h.run('window.toggleSync();window.toggleSync()');
    gate.resolve({ok:true,payload:copy(),revision:1,user:{id:'owner'}});await reviewing;
    assert.equal(h.state.syncOn,false);assert.equal(h.restores.length,0);assert.equal(h.prompts.length,0);
  });
  await test('repeated review taps load once and restore the original sync choice on failure',async()=>{
    const h=syncHarness(),gate=deferred();let reads=0;
    h.cloud.getSeason=()=>{reads++;return gate.promise;};
    const first=h.run('window.reviewCloudSeason()');await tick();
    const second=h.run('window.reviewCloudSeason()');await tick();
    gate.resolve({ok:false,said:'No signal'});await Promise.all([first,second]);
    assert.equal(reads,1);assert.equal(h.state.syncOn,true);
  });
  await test('restoring a cloud season keeps sharing paused on the next sign-in',async()=>{
    const h=syncHarness();h.run('syncYes(true)');
    h.cloud.getSeason=async()=>({ok:true,payload:copy(),revision:1,user:{id:'owner'}});
    await h.run('window.reviewCloudSeason()');assert.equal(h.restores.length,1);
    h.run('afterSignIn()');assert.equal(h.state.syncOn,false);assert.equal(h.uploads.length,0);
  });
  await test('an upload acknowledges its snapshot, not edits made while it was sending',async()=>{
    const h=syncHarness(),gate=deferred();h.cloud.pushSeason=()=>gate.promise;
    const sentAt=h.run('Date.now()'),sending=h.run('window.syncNow()');await tick();
    await h.advance(5000);h.state.results=[{at:h.run('Date.now()')}];h.run('maybeSync()');
    gate.resolve({ok:true});await sending;
    assert.equal(h.state.syncAt,sentAt);assert(h.state.syncAt<h.state.results[0].at);
    assert.match(h.state.syncSaid,/latest changes are waiting/);assert.equal(h.timers.size,1);
  });
  await test('a silently refused recovery-copy write prevents cloud replacement',async()=>{
    const h=syncHarness();h.cloud.getSeason=async()=>({ok:true,payload:copy(),revision:1,user:{id:'owner'}});
    h.run('localStorage.setItem=()=>{}');await h.run('window.reviewCloudSeason()');
    assert.equal(h.restores.length,0);assert.match(h.state.syncSaid,/preserve this phone/);
  });
  await test('a delayed file share only backs up the season captured when it opened',async()=>{
    let clock=1000000;const gate=deferred(),state={copiedAt:0,results:[]};
    const context=vm.createContext({window:{gridlockExportFile:()=>gate.promise},S:state,
      Date:class extends Date{constructor(){super(clock);}static now(){return clock;}},
      copyPayload:()=>JSON.stringify({data:{results:state.results}}),copySummary:()=>'',save(){},render(){}});
    const start=app.indexOf('let copyExporting = false;'),end=app.indexOf('/* Two phones on one match',start);
    vm.runInContext(app.slice(start,end),context);
    const saving=vm.runInContext('window.saveCopy("all")',context);clock+=5000;state.results.push({at:clock});
    gate.resolve({status:'shared'});await saving;
    assert.equal(state.copiedAt,1000000);assert(state.copiedAt<state.results[0].at);
  });
  await test('Scout-only and other sheet records ask for backup until their snapshot is kept',async()=>{
    const clock=1700000000000,start=app.indexOf('function newestLogged()'),end=app.indexOf('// Is there a season',start);
    for(const key of ['pens','timeouts','arrivalSightings','arrivalShots','voiceEvents','scout']){
      const state={copiedAt:clock-3600000,syncOn:false};
      if(key==='scout') state.scout={Rejects:{breaks:[{m:'a',pt:1,at:clock-1000}]}};
      else state[key]=[{m:'a',pt:1,at:clock-1000}];
      const context=vm.createContext({S:state,Date:{now:()=>clock},SHEET_LISTS:['tally','breakouts','calls','moves','assessments','results','pens','timeouts','arrivalSightings','arrivalShots','voiceEvents']});
      vm.runInContext(app.slice(start,end),context);
      assert.match(vm.runInContext('copyNudge()',context),/since your last copy/,key);
      state.syncOn=true;state.syncAt=clock;
      assert.equal(vm.runInContext('copyNudge()',context),'',key+' is covered by confirmed sync');
      state.syncOn=false;state.copiedAt=clock;
      assert.equal(vm.runInContext('copyNudge()',context),'',key+' is covered by the saved file');
    }
  });
  const start=app.indexOf('async function hashPass('),end=app.indexOf('\nfunction newSalt()',start);
  const completeCopy=()=>({format:'gridlock.coach.copy',v:1,scope:'all',seasonId:'a'.repeat(32),at:'2026-11-11T10:00:00Z',data:{messages:['Field walk'],roster:[]}});
  await test('checkpoint follows only the acknowledged snapshot and ignores export timestamps',async()=>{
    const db=server(),a=device(db.route);await a.login();const snapshot=completeCopy();
    const sent=await a.api.pushSeason('season',snapshot);
    assert.equal(await a.api.rememberSeason(snapshot,'owner',sent.revision),true);
    const same={...snapshot,at:'2026-11-12T10:00:00Z',data:{roster:[],messages:['Field walk']}};
    assert.equal((await a.api.deviceSeason(same)).unchanged,true);
    same.data.messages.push('Edited later');assert.equal((await a.api.deviceSeason(same)).unchanged,false);
  });
  await test('another device has no checkpoint until it explicitly adopts the saved season',async()=>{
    const db=server(),a=device(db.route),b=device(db.route);await a.login();await b.login();
    const p=completeCopy(),sent=await a.api.pushSeason('season',p);await a.api.rememberSeason(p,'owner',sent.revision);
    const read=await b.api.deviceSeason(p);assert.equal(read.known,false);
    assert.equal(await b.api.rememberSeason(p,'owner',read.revision),false,'reading alone never accepts a revision');
    assert.equal((await b.api.pushSeason('stale',p)).conflict,true);
    assert.equal(b.api.acceptSeason('owner',read.revision),true);
    assert.equal(await b.api.rememberSeason(p,'owner',read.revision),true);
    assert.equal((await b.api.deviceSeason(p)).unchanged,true);
  });
  await test('a checkpoint for a different local account cannot authorize sending this season',async()=>{
    const db=server(),a=device(db.route);await a.login();const p=completeCopy(),sent=await a.api.pushSeason('season',p);
    await a.api.rememberSeason(p,'owner',sent.revision);
    a.store.set('grindx.cloud.season.owner:https://fixture.supabase.co','different-account');
    assert.equal((await a.api.deviceSeason(p)).known,false);
    assert.equal(await a.api.rememberSeason(p,'different-account',sent.revision),false);
  });
  await test('an unavailable checkpoint store cannot pretend a device is safe to overwrite',async()=>{
    const db=server(),store=new Map(),a=device(db.route,store);await a.login();const p=completeCopy(),sent=await a.api.pushSeason('season',p);
    const old=store.set.bind(store);store.set=(k,v)=>k.endsWith(':device')?store:old(k,v);
    assert.equal(await a.api.rememberSeason(p,'owner',sent.revision),false);
    assert.equal((await a.api.deviceSeason(p)).known,false);
  });
  await test('a checkpoint keeps its old revision when another device writes or deletes',async()=>{
    const db=server(),a=device(db.route),b=device(db.route);await a.login();await b.login();const p=completeCopy(),sent=await a.api.pushSeason('season',p);
    await a.api.rememberSeason(p,'owner',sent.revision);const r=await b.api.getSeason();b.api.acceptSeason('owner',r.revision);
    await b.api.deleteSeason();const read=await a.api.deviceSeason(p);
    assert.equal(read.known,true);assert.equal(read.unchanged,true);assert.equal(read.base,1);assert.equal(read.revision,2);assert.equal(read.removed,true);
    assert.equal((await a.api.pushSeason('stale',p)).conflict,true);
  });
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
  console.log(`${passed}/${passed+failed} season and password safety checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});

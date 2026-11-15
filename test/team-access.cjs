"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../native/gridlock-cloud.js'),'utf8');
const KEY='grindx.cloud.session';
const creds=id=>({access_token:'token-'+id,refresh_token:'refresh-'+id,expires_in:3600,user:{id,email:id+'@example.test'}});
const response=(body,status=200)=>({ok:status<300,status,json:async()=>body});
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)};};
const tick=()=>new Promise(r=>setImmediate(r));
function setup(route){
  const data=new Map(),requests=[];
  const window={GRIDLOCK_CLOUD:{url:'https://fixture.supabase.co',anonKey:'public-fixture'}};
  const localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  vm.runInNewContext(source,{window,localStorage,Date,JSON,URL,URLSearchParams,Promise,
    fetch:async(url,opts)=>{requests.push({url,...opts});return route(url,opts);}});
  return {api:window.gridlockCloud,configure:window.gridlockCloudConfigure,data,requests};
}
let passed=0;
async function check(name,fn){await fn();console.log('PASS '+name);passed++;}
(async()=>{
  await check('loading the adapter and signed-out actions make no requests',async()=>{
    const s=setup(()=>{throw Error('unexpected request');});assert.equal(s.requests.length,0);
    assert.equal((await s.api.teamAccess('list')).ok,false);assert.equal(s.requests.length,0);
  });
  await check('membership uses the signed-in bearer and existing public config, with no client actor',async()=>{
    const s=setup(url=>response(url.includes('/auth/')?creds('a'):{ok:true,teams:[]}));
    await s.api.signIn('a@example.test','fixture');const r=await s.api.teamAccess('list');
    assert.equal(r.ok,true);assert.equal(r.user.id,'a');
    const req=s.requests.at(-1);assert.equal(req.url,'https://fixture.supabase.co/rest/v1/rpc/gridlock_team_action');
    assert.equal(req.headers.Authorization,'Bearer token-a');assert.equal(req.headers.apikey,'public-fixture');
    assert.deepEqual(JSON.parse(req.body),{action:'list',input:{}});
    assert.deepEqual([...s.data.keys()],[KEY]);assert.equal(Object.hasOwn(s.api.session(),'access_token'),false);
  });
  await check('malformed local requests are refused before transport',async()=>{
    const s=setup(()=>{throw Error('unexpected');});const cyclic={};cyclic.self=cyclic;
    for(const [action,input] of [['admin',{}],['list',null],['list',[]],['list',cyclic],['join',{code:'x'.repeat(9000)}]])assert.equal((await s.api.teamAccess(action,input)).ok,false);
    assert.equal(s.requests.length,0);
  });
  for(const mode of ['signout','signin','other-tab','configuration'])await check('late team response discarded after '+mode,async()=>{
    const gate=deferred();
    const s=setup((url,opts)=>url.includes('/rest/')?gate.promise:response(creds(JSON.parse(opts.body||'{}').email?.startsWith('b')?'b':'a')));
    await s.api.signIn('a@example.test','fixture');const pending=s.api.teamAccess('get',{team_id:'one'});await tick();
    if(mode==='signout')s.api.signOut();
    if(mode==='signin')await s.api.signIn('b@example.test','fixture');
    if(mode==='other-tab')s.data.set(KEY,JSON.stringify({...creds('b'),expires_at:Date.now()+3600000}));
    if(mode==='configuration')s.configure('https://other.example.test','public');
    gate.resolve(response({ok:true,team:{name:'Private A'}}));const r=await pending;
    assert.equal(r.ok,false);assert.ok(!JSON.stringify(r).includes('Private A'));assert.match(r.said,/sign-in changed/);
  });
  await check('switching accounts during token refresh never sends the team operation',async()=>{
    const gate=deferred(),s=setup(url=>url.includes('refresh_token')?gate.promise:response(creds('b')));
    s.data.set(KEY,JSON.stringify({...creds('a'),expires_at:1}));
    const pending=s.api.teamAccess('remove',{team_id:'one',user_id:'two',revision:1});await tick();
    await s.api.signIn('b@example.test','fixture');gate.resolve(response(creds('a')));
    assert.equal((await pending).ok,false);assert.equal(s.requests.filter(r=>r.url.includes('/rest/')).length,0);
  });
  for(const code of ['not_available','owner_required','invalid_code','changed','not_found','try_later','__proto__'])await check('server refusal is retained: '+code,async()=>{
    const s=setup(url=>response(url.includes('/auth/')?creds('a'):{ok:false,code}));
    await s.api.signIn('a@example.test','fixture');const r=await s.api.teamAccess('list');assert.equal(r.ok,false);assert.equal(r.code,code);assert.equal(typeof r.said,'string');assert.ok(r.said);
  });
  for(const kind of ['offline','server','bad-json','bad-envelope','unauthorized'])await check('unconfirmed '+kind+' response neither retries nor grants membership',async()=>{
    const s=setup(url=>{if(url.includes('/auth/'))return response(creds('a'));
      if(kind==='offline')throw Error('offline');if(kind==='bad-json')return {ok:true,status:200,text:async()=>'<html>Wifi login</html>'};
      return response(kind==='bad-envelope'?{team:{role:'owner'}}:{ok:true,team:{}},kind==='server'?503:kind==='unauthorized'?401:200);});
    await s.api.signIn('a@example.test','fixture');const r=await s.api.teamAccess('create',{request_id:'stable-request',name:'Team',display_name:'A'});
    assert.equal(r.ok,false);assert.equal(s.requests.filter(r=>r.url.includes('/rest/')).length,1);assert.deepEqual([...s.data.keys()],[KEY]);
  });
  await check('one-time invite result is not cached and cannot change a Coach plan/season',async()=>{
    const s=setup(url=>response(url.includes('/auth/')?creds('a'):{ok:true,invite:{code:'one-time-code'}}));
    await s.api.signIn('a@example.test','fixture');s.data.set('gridlock.coach.season','preserved');const before=[...s.data];
    const r=await s.api.teamAccess('invite',{team_id:'one',revision:1,role:'player'});assert.equal(r.ok,true);
    assert.equal(r.result.invite.code,'one-time-code');assert.deepEqual([...s.data],before);
    assert.equal(s.requests.some(r=>/entitlements|seasons|gridlock-admin/.test(r.url)),false);
  });
  console.log(`\nTeam access: ${passed}/${passed} passed`);
})().catch(e=>{console.error(e);process.exitCode=1;});

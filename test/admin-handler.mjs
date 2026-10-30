import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as module from 'node:module';

// Load the pure handler without Deno or automatic .ts imports. Node 22.13+
// exposes this API; CI installs the current Node 22 maintenance release.
if (typeof module.stripTypeScriptTypes !== 'function') {
  throw new Error('Admin handler checks require Node 22.13 or newer.');
}
const sourcePath = process.env.GRIDLOCK_TEST_ROOT
  ? resolve(process.env.GRIDLOCK_TEST_ROOT, 'supabase/functions/gridlock-admin/handler.ts')
  : new URL('../supabase/functions/gridlock-admin/handler.ts', import.meta.url);
const handlerSource = module.stripTypeScriptTypes(readFileSync(sourcePath, 'utf8'), { mode: 'strip' });
const { createAdminHandler } = await import('data:text/javascript;base64,' + Buffer.from(handlerSource).toString('base64'));

const ADMIN='00000000-0000-4000-8000-000000000001';
const OTHER='00000000-0000-4000-8000-000000000002';
const TARGET='00000000-0000-4000-8000-000000000003';
const ORIGIN='https://staging.example.test';
const NOW=Date.parse('2026-10-29T12:00:00.000Z');
let passed=0;
const checks=[];
function test(name, fn) { checks.push([name,fn]); }

function harness(overrides={}) {
  const state={calls:[],audits:[],user:{id:ADMIN,email:'admin@example.test',email_confirmed_at:'2026-10-01T00:00:00Z'},
    users:[{id:TARGET,email:'coach@example.test',created_at:'2026-10-01T00:00:00Z',last_sign_in_at:null,email_confirmed_at:null,
      phone:'private-phone',user_metadata:{admin:true},app_metadata:{provider:'email'},encrypted_password:'never-return'}],
    total:1,plans:[{user_id:TARGET,plan:'team',expires_at:null,source:'store',updated_at:'2026-10-02T00:00:00Z'}],seasons:[],...overrides};
  const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-server-secret',ADMIN_USER_IDS:ADMIN,ADMIN_ALLOWED_ORIGINS:ORIGIN,...overrides.env};
  const factory=(url,key,options)=>{
    state.calls.push(['client',url,key,options]);
    return {
      auth:{getClaims:async()=>({data:{claims:{sub:state.user?.id,aal:state.aal||'aal2'}},error:state.claimsError||null}),getUser:async token=>{state.calls.push(['getUser',token]);if(state.authThrow)throw Error('internal secret');return {data:{user:state.user},error:state.authError||null};},
        admin:{listUsers:async args=>{state.calls.push(['listUsers',args]);return {data:{users:state.users,total:state.total,nextPage:state.nextPage},error:state.listError||null};},
          getUserById:async id=>{state.calls.push(['getUserById',id]);return {data:{user:state.missingTarget?null:{id}},error:null};}}},
      rpc:async(name,args)=>{state.calls.push(['rpc',name,args]);state.saved={user_id:args.target,plan:args.new_plan,expires_at:args.new_expiry,source:'admin:'+args.actor,updated_at:new Date(NOW).toISOString()};return {data:state.saved,error:state.saveError||null};},
      from:table=>{
        state.calls.push(['from',table]);
        const chain={is(column,value){state.calls.push(['is',column,value]);return chain;},select(columns){state.calls.push(['select',columns]);return chain;},
          in(column,values){state.calls.push(['in',column,values]);return chain;},
          order(column,options){state.calls.push(['order',column,options]);return chain;},
          range(from,to){state.calls.push(['range',from,to]);return chain;},
          upsert(record,options){state.calls.push(['upsert',record,options]);state.saved=record;return chain;},
          single:async()=>({data:state.saved,error:state.saveError||null}),
          then(resolve,reject){return Promise.resolve({data:table==='seasons'?state.seasons:state.plans,error:state.dbError||null}).then(resolve,reject);}};
        return chain;
      },
    };
  };
  const handler=createAdminHandler({get:name=>env[name]},factory,()=>NOW,event=>{state.audits.push(event);if(state.auditThrow)throw Error('log failure');});
  const request=async (path='',{method='GET',token='valid-user-token',origin=ORIGIN,body,headers={}}={})=>{
    const all={...headers};
    if(token!==null)all.authorization=token.startsWith('Bearer ')?token:'Bearer '+token;
    if(origin!==null)all.origin=origin;
    if(body!==undefined && !Object.hasOwn(all,'content-type'))all['content-type']='application/json';
    const req=new Request('https://project.supabase.co/functions/v1/gridlock-admin'+path,{method,headers:all,...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
    const res=await handler(req);
    return {status:res.status,headers:res.headers,body:res.status===204?null:await res.json()};
  };
  return {state,request};
}
const payload=extra=>({action:'set_entitlement',user_id:TARGET,plan:'program',expires_at:null,...extra});
const noDataCalls=state=>assert.equal(state.calls.filter(c=>['from','listUsers','getUserById'].includes(c[0])).length,0);

test('missing bearer token is denied before creating a client',async()=>{const h=harness();assert.equal((await h.request('',{token:null})).status,401);assert.equal(h.state.calls.length,0);});
test('invalid bearer token is verified and denied without data access',async()=>{const h=harness({authError:{message:'private'}});const r=await h.request();assert.equal(r.status,401);noDataCalls(h.state);assert(!JSON.stringify(r.body).includes('private'));});
test('ordinary verified users cannot list data even if their metadata says admin',async()=>{const h=harness({user:{id:OTHER,email:'admin@example.test',email_confirmed_at:'today',app_metadata:{role:'admin'},user_metadata:{role:'admin'}}});assert.equal((await h.request()).status,403);noDataCalls(h.state);});
test('unconfirmed allowlisted account cannot administer',async()=>{const h=harness({user:{id:ADMIN,email:'admin@example.test',email_confirmed_at:null}});assert.equal((await h.request()).status,403);noDataCalls(h.state);});
test('caller-supplied admin email and UUID do not bypass verified identity',async()=>{const h=harness({user:{id:OTHER,email:'other@example.test',email_confirmed_at:'today'}});assert.equal((await h.request('?action=overview&admin_id='+ADMIN+'&email=admin@example.test')).status,403);noDataCalls(h.state);});
test('empty admin allowlist fails closed',async()=>{const h=harness({env:{ADMIN_USER_IDS:''}});assert.equal((await h.request()).status,503);assert.equal(h.state.calls.length,0);});
test('malformed UUID allowlist fails closed',async()=>{const h=harness({env:{ADMIN_USER_IDS:ADMIN+',admin@example.test'}});assert.equal((await h.request()).status,503);assert.equal(h.state.calls.length,0);});
test('unconfigured origin list fails closed',async()=>{const h=harness({env:{ADMIN_ALLOWED_ORIGINS:''}});assert.equal((await h.request()).status,503);});
test('wildcard origin configuration is rejected',async()=>{const h=harness({env:{ADMIN_ALLOWED_ORIGINS:'*'}});assert.equal((await h.request()).status,503);});
test('foreign browser origin is refused before authentication',async()=>{const h=harness();const r=await h.request('',{origin:'https://evil.example.test'});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);assert.equal(h.state.calls.length,0);});
test('allowlisted preflight is accepted without revealing data',async()=>{const h=harness();const r=await h.request('',{method:'OPTIONS',token:null,headers:{'access-control-request-method':'POST'}});assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),ORIGIN);assert.equal(h.state.calls.length,0);});
test('unsupported preflight method denied',async()=>{const h=harness();assert.equal((await h.request('',{method:'OPTIONS',headers:{'access-control-request-method':'DELETE'}})).status,403);});
test('unsupported write method cannot create client',async()=>{const h=harness();assert.equal((await h.request('',{method:'DELETE'})).status,405);assert.equal(h.state.calls.length,0);});
test('authenticated nonbrowser client still needs a valid admin token',async()=>{const h=harness();assert.equal((await h.request('',{origin:null})).status,200);assert(h.state.calls.find(c=>c[0]==='getUser'));});
test('overview exposes only required user fields and joins plans',async()=>{const h=harness();const r=await h.request('?action=overview');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(Object.keys(r.body.users[0]).sort(),['created_at','email','email_confirmed_at','entitlement','id','last_sign_in_at'].sort());assert.equal(r.body.users[0].entitlement.plan,'team');assert.equal(r.body.caller.id,ADMIN);assert(!JSON.stringify(r.body).includes('never-return'));assert.equal(r.body.has_more,false);});
test('user pagination is bounded and forwarded correctly',async()=>{const h=harness({total:201});const r=await h.request('?page=2&per_page=100');assert.equal(r.status,200);assert.deepEqual(h.state.calls.find(c=>c[0]==='listUsers')[1],{page:2,perPage:100});assert.equal(r.body.has_more,true);});
test('invalid pagination does not query users',async()=>{for(const q of ['?page=0','?page=-1','?per_page=101','?page=1.2','?page=100001']){const h=harness();assert.equal((await h.request(q)).status,400);noDataCalls(h.state);}});
test('empty user page avoids a broad entitlement query',async()=>{const h=harness({users:[],total:0});const r=await h.request();assert.deepEqual(r.body.users,[]);assert.equal(h.state.calls.filter(c=>c[0]==='from').length,0);});
test('season pagination returns selected page and an explicit next flag',async()=>{const rows=Array.from({length:3},(_,i)=>({owner:TARGET,label:'Coach '+i,payload:{safe:i},updated_at:'today',secret:'not-return'}));const h=harness({seasons:rows});const r=await h.request('?action=seasons&page=2&per_page=2');assert.equal(r.status,200);assert.equal(r.body.seasons.length,2);assert.equal(r.body.has_more,true);assert.deepEqual(h.state.calls.find(c=>c[0]==='range'),['range',2,4]);assert(!JSON.stringify(r.body).includes('not-return'));});
test('unknown actions do not query data',async()=>{const h=harness();assert.equal((await h.request('?action=delete_everything')).status,400);noDataCalls(h.state);});
test('nonadmin POST cannot reach mutation',async()=>{const h=harness({user:{id:OTHER,email:'other@example.test',email_confirmed_at:'today'}});assert.equal((await h.request('',{method:'POST',body:payload()})).status,403);noDataCalls(h.state);});
test('entitlement write validates target and records verified actor',async()=>{const h=harness();const r=await h.request('',{method:'POST',body:payload()});assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.equal(h.state.saved.source,'admin:'+ADMIN);assert.equal(h.state.saved.user_id,TARGET);assert.equal(h.state.saved.updated_at,new Date(NOW).toISOString());assert(h.state.calls.findIndex(c=>c[0]==='getUser')<h.state.calls.findIndex(c=>c[0]==='getUserById'));});
test('future UTC expiry is normalized',async()=>{const h=harness();const r=await h.request('',{method:'POST',body:payload({expires_at:'2027-01-01T00:00:00Z'})});assert.equal(r.status,200);assert.equal(h.state.saved.expires_at,'2027-01-01T00:00:00.000Z');});
test('completed changes create a minimal audit event without credentials or emails',async()=>{const h=harness();await h.request('',{method:'POST',body:payload()});assert.deepEqual(h.state.audits,[{event:'gridlock.admin.entitlement.updated',actor_user_id:ADMIN,target_user_id:TARGET,plan:'program',expires_at:null,timestamp:new Date(NOW).toISOString()}]);});
test('failed changes do not emit a success audit event',async()=>{const h=harness({saveError:{message:'write failed'}});assert.equal((await h.request('',{method:'POST',body:payload()})).status,502);assert.deepEqual(h.state.audits,[]);});
test('logger failure does not misreport an already completed plan write',async()=>{const h=harness({auditThrow:true});assert.equal((await h.request('',{method:'POST',body:payload()})).status,200);assert.equal(h.state.saved.plan,'program');});
test('Free plan clears entitlement without introducing expiry',async()=>{const h=harness();assert.equal((await h.request('',{method:'POST',body:payload({plan:'free'})})).status,200);assert.equal(h.state.saved.plan,'free');assert.equal(h.state.saved.expires_at,null);});
test('invalid plan or UUID never invokes user lookup',async()=>{for(const extra of [{plan:'owner'},{user_id:'all'},{plan:'Program'}]){const h=harness();assert.equal((await h.request('',{method:'POST',body:payload(extra)})).status,400);noDataCalls(h.state);}});
test('caller cannot inject source or unexpected action fields',async()=>{const h=harness();assert.equal((await h.request('',{method:'POST',body:payload({source:'store',admin:true})})).status,400);noDataCalls(h.state);});
test('expired, invalid, rollover, and omitted expiry are rejected',async()=>{for(const value of ['2026-10-28T00:00:00Z','not-a-date','2027-02-30T00:00:00Z',123,undefined]){const h=harness();assert.equal((await h.request('',{method:'POST',body:payload({expires_at:value})})).status,400);noDataCalls(h.state);}});
test('free plan cannot carry a paid expiry',async()=>{const h=harness();assert.equal((await h.request('',{method:'POST',body:payload({plan:'free',expires_at:'2027-01-01T00:00:00Z'})})).status,400);noDataCalls(h.state);});
test('missing target prevents entitlement write',async()=>{const h=harness({missingTarget:true});assert.equal((await h.request('',{method:'POST',body:payload()})).status,404);assert.equal(h.state.saved,undefined);});
test('form-urlencoded data is rejected',async()=>{const h=harness();assert.equal((await h.request('',{method:'POST',body:'x=1',headers:{'content-type':'application/x-www-form-urlencoded'}})).status,415);noDataCalls(h.state);});
test('malformed JSON is rejected',async()=>{const h=harness();assert.equal((await h.request('',{method:'POST',body:'{bad'})).status,400);noDataCalls(h.state);});
test('oversized actual body rejected without relying on content-length',async()=>{const h=harness();assert.equal((await h.request('',{method:'POST',body:' '.repeat(4097)})).status,413);noDataCalls(h.state);});
test('oversized declared content-length rejected',async()=>{const h=harness();assert.equal((await h.request('',{method:'POST',body:payload(),headers:{'content-length':'999999'}})).status,413);noDataCalls(h.state);});
test('database, auth service, and write failures do not leak internal errors',async()=>{for(const failure of [{listError:{message:'server-secret'}},{dbError:{message:'server-secret'}},{authThrow:true}]){const h=harness(failure);const r=await h.request();assert.equal(r.status,502);assert(!JSON.stringify(r.body).includes('server-secret'));}const h=harness({saveError:{message:'server-secret'}});const r=await h.request('',{method:'POST',body:payload()});assert.equal(r.status,502);assert(!JSON.stringify(r.body).includes('server-secret'));});

test('password-only admin cannot read records or change plans',async()=>{const h=harness({aal:'aal1'});assert.equal((await h.request()).status,403);noDataCalls(h.state);const identity=await h.request('?action=identity');assert.equal(identity.status,200);assert.equal(identity.body.mfa_required,true);assert.equal(identity.body.users,undefined);});
test('unverified claims fail closed',async()=>{const h=harness({claimsError:{message:'invalid'}});assert.equal((await h.request()).status,401);noDataCalls(h.state);});
test('plan and durable audit use one service-only RPC',async()=>{const h=harness();await h.request('',{method:'POST',body:payload()});assert.equal(h.state.calls.filter(c=>c[0]==='rpc'&&c[1]==='gridlock_admin_set_entitlement').length,1);});
for (const [name,run] of checks) { await run(); passed++; console.log('PASS '+name); }
console.log(`${passed}/${checks.length} admin backend checks passed.`);

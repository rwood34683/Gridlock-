import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/gridlock-hunt/handler.ts',import.meta.url),'utf8'));
const {createHuntHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const db=new PGlite(),A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
let count=0;
async function check(name,fn){await fn();console.log('PASS '+name);count++;}
const stages=['RED','POD','CREW','WINS'].map((piece,i)=>({title:'Clue '+(i+1),clue:'Fixture clue',options:['A','B','C'],answer:i%3,piece,privateNote:'must not ship'}));
async function rpc(id,action='status',extras={}){
  return (await db.query('select public.gridlock_hunt_request($1,$2,$3,$4,$5,$6,$7) as result',
    [id,action,extras.round??'test-round',extras.stage??null,extras.choice??null,extras.code??null,extras.team??null])).rows[0].result;
}
async function setup(){
  await db.exec('truncate public.pod_hunt_winners,public.pod_hunt_entries,public.pod_hunt_rounds');
  await db.query(`insert into public.pod_hunt_rounds(id,status,starts_at,ends_at,prize,rules,stages)
    values('test-round','open',now()-interval '1 day',now()+interval '1 day','Fixture prize','Fixture rules',$1)`,[JSON.stringify(stages)]);
}
async function solve(id){for(let stage=0;stage<4;stage++){const r=await rpc(id,'answer',{stage,choice:stage%3});assert.equal(r.step,stage+1);}}
function handler(extra={}){
  const state={id:A,confirmed:true,aal:'aal1',factors:[],claimsId:A,...extra},calls=[];
  const settings={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-server-only',ADMIN_ALLOWED_ORIGINS:'https://app.example.test'};
  const h=createHuntHandler({get:k=>settings[k]},()=>({auth:{getUser:async()=>({data:{user:{id:state.id,email_confirmed_at:state.confirmed?'yes':null,factors:state.factors}},error:state.authError}),
    getClaims:async()=>({data:{claims:{sub:state.claimsId,aal:state.aal}},error:state.claimsError})},rpc:async(name,args)=>{calls.push({name,args});return state.rpcError?{error:{message:'private internals'}}:{data:{ok:true,state:'inactive'}};}}));
  return {calls,send:(body={action:'status'},headers={},method='POST')=>h(new Request('https://fixture.test/hunt',{method,headers:{origin:'https://app.example.test',authorization:'Bearer fixture','content-type':'application/json',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}))};
}
try{
  await db.exec('create schema auth;create role anon;create role authenticated;create role service_role bypassrls;create table auth.users(id uuid primary key);');
  await db.exec(readFileSync(new URL('../supabase/migrations/202611180001_pod_hunt.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users values($1),($2),($3)',[A,B,C]);
  await check('migration creates no open round; unknown accounts cannot claim',async()=>{
    assert.equal((await rpc(A)).state,'inactive');assert.equal((await rpc('44444444-4444-4444-8444-444444444444')).ok,false);
    await assert.rejects(db.exec("insert into public.pod_hunt_rounds(id,status) values('missing-prize','open')"));
    await assert.rejects(db.query("insert into public.pod_hunt_rounds(id,status,starts_at,prize,rules,stages) values('no-deadline','open',now(),'Fixture','Fixture',$1)",[JSON.stringify(stages)]));
  });
  await check('private answer keys and adjudicator are unavailable to browser roles',async()=>{
    for(const role of ['anon','authenticated']){
      await db.exec('set role '+role);
      for(const table of ['pod_hunt_rounds','pod_hunt_entries','pod_hunt_winners'])await assert.rejects(db.query('select * from public.'+table));
      await assert.rejects(rpc(A));await db.exec('reset role');
    }
    await db.exec('set role service_role');assert.equal((await rpc(A)).state,'inactive');await db.exec('reset role');
  });
  await check('ordered clues expose only earned pieces; wrong, replayed and skipped answers do not advance',async()=>{
    await setup();const s=await rpc(A);assert.equal(s.step,0);assert.deepEqual(s.pieces,[]);assert.deepEqual(Object.keys(s.stage).sort(),['clue','options','title']);
    assert.equal((await rpc(A,'answer',{stage:3,choice:0})).step,0);
    assert.equal((await rpc(A,'answer',{stage:0,choice:2})).step,0);
    assert.equal((await rpc(A,'answer',{stage:0,choice:0})).step,1);
    assert.equal((await rpc(A,'answer',{stage:0,choice:0})).step,1);
    assert.deepEqual((await rpc(A)).pieces,['RED']);assert.equal((await rpc(B)).step,0);
  });
  await check('knowledge of the final code alone cannot skip the game or change the campaign',async()=>{
    await setup();assert.notEqual((await rpc(A,'claim',{code:'REDPODCREWWINS',team:'Test team'})).state,'winner');
    assert.equal((await rpc(A,'answer',{round:'older-round',stage:0,choice:0})).ok,false);
    assert.equal((await rpc(A)).step,0);
  });
  await check('server throttles guesses and resumes after its own minute window',async()=>{
    await setup();for(let i=0;i<8;i++)await rpc(A,'answer',{stage:0,choice:2});
    assert.match((await rpc(A,'answer',{stage:0,choice:0})).said,/Wait a minute/);
    await db.exec("update public.pod_hunt_entries set window_at=now()-interval '61 seconds'");
    assert.equal((await rpc(A,'answer',{stage:0,choice:0})).step,1);
  });
  await check('wrong code and empty team cannot win; two submitted claims yield exactly one immutable winner',async()=>{
    await setup();await solve(A);await solve(B);
    assert.notEqual((await rpc(A,'claim',{code:'WRONG',team:'A'})).state,'winner');
    assert.notEqual((await rpc(A,'claim',{code:'REDPODCREWWINS',team:'  '})).state,'winner');
    const result=await Promise.all([rpc(A,'claim',{code:'RED POD CREW WINS',team:'Test A'}),rpc(B,'claim',{code:'REDPODCREWWINS',team:'Test B'})]);
    assert.equal(result.filter(x=>x.state==='winner').length,1);assert.equal(result.filter(x=>x.state==='claimed').length,1);
    const who=result[0].state==='winner'?A:B,win=result.find(x=>x.state==='winner');
    assert.equal((await rpc(who,'claim',{code:'wrong on retry',team:'Different'})).receipt,win.receipt);
    assert.equal((await db.query('select count(*)::int n from public.pod_hunt_winners')).rows[0].n,1);
    assert.equal((await db.query('select team from public.pod_hunt_winners')).rows[0].team,who===A?'Test A':'Test B');
    assert.deepEqual(await rpc(C),{ok:true,state:'claimed'});
  });
  await check('expired and future rounds cannot accept a win; missing setup fails closed',async()=>{
    await setup();await solve(A);
    await db.exec("update public.pod_hunt_rounds set ends_at=now()-interval '1 hour'");
    assert.equal((await rpc(A,'claim',{code:'REDPODCREWWINS',team:'A'})).state,'inactive');
    await db.exec("update public.pod_hunt_rounds set starts_at=now()+interval '1 hour',ends_at=now()+interval '1 day'");assert.equal((await rpc(A)).state,'inactive');
    await db.query("update public.pod_hunt_rounds set starts_at=now()-interval '1 hour',stages=$1",[JSON.stringify(stages.map(s=>({...s,piece:''})))]);
    assert.equal((await rpc(A)).state,'inactive');assert.equal((await db.query('select count(*)::int n from public.pod_hunt_winners')).rows[0].n,0);
  });
  await check('deleting a winner account cannot reopen the prize',async()=>{
    await setup();await solve(C);assert.equal((await rpc(C,'claim',{code:'REDPODCREWWINS',team:'C'})).state,'winner');
    await db.query('delete from auth.users where id=$1',[C]);assert.equal((await rpc(A)).state,'claimed');
    assert.equal((await db.query('select user_id from public.pod_hunt_winners')).rows[0].user_id,null);
  });
  await check('edge identity comes only from verified Auth, including email confirmation and enrolled MFA',async()=>{
    const h=handler(),res=await h.send();assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(h.calls[0].args.p_user,A);
    for(const extra of [{confirmed:false},{claimsId:B},{authError:{}},{claimsError:{}},{factors:[{status:'verified'}]}]){
      const x=handler(extra);assert([401,403].includes((await x.send()).status));assert.equal(x.calls.length,0);
    }
    assert.equal((await handler({factors:[{status:'verified'}],aal:'aal2'}).send()).status,200);
  });
  await check('edge rejects foreign origins, oversized input, spoofed IDs, unknown fields and invalid choices',async()=>{
    const h=handler();assert.equal((await h.send(undefined,{origin:'https://other.test'})).status,403);assert.equal((await h.send(undefined,{authorization:''})).status,401);
    assert.equal((await h.send('x'.repeat(1025))).status,413);assert.equal((await h.send('{')).status,400);
    for(const b of [{action:'status',user_id:B},{action:'answer',round:'r',stage:0,choice:3},{action:'claim',round:'r',team:'',code:'C'},{action:'claim',round:'r',team:'x\n',code:'C'}])assert.equal((await h.send(b)).status,400);
    assert.equal(h.calls.length,0);assert.equal((await h.send(undefined,{},'GET')).status,405);
    assert.equal((await h.send(undefined,{},'OPTIONS')).status,204);
  });
  await check('edge failures reveal no internal errors and never report a claim',async()=>{
    const r=await handler({rpcError:true}).send();assert.equal(r.status,502);assert(!(await r.text()).includes('private internals'));
  });
  await check('cloud adapter is tap-only and discards a claim reply after account switching or sign-out',async()=>{
    const map=new Map(),requests=[];let resolve;
    const ls={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
    map.set('grindx.cloud.session',JSON.stringify({user:{id:A,email:'a@example.test'},access_token:'fixture',expires_at:Date.now()+3600000}));
    const win={GRIDLOCK_CLOUD:{url:'https://fixture.supabase.co',anonKey:'fixture-public'}};
    const ctx=vm.createContext({window:win,localStorage:ls,URL,TextEncoder,AbortController,setTimeout,clearTimeout,fetch:async(url,o)=>{requests.push([url,o]);return new Promise(r=>resolve=r);}});
    vm.runInContext(readFileSync(new URL('../native/gridlock-cloud.js',import.meta.url),'utf8'),ctx);
    assert.equal(requests.length,0);
    const pending=win.gridlockCloud.huntRequest({action:'status'});await new Promise(r=>setTimeout(r,0));assert.equal(requests.length,1);
    assert.equal(requests[0][1].headers.Authorization,'Bearer fixture');assert(!requests[0][1].body.includes(A));
    map.set('grindx.cloud.session',JSON.stringify({user:{id:B},access_token:'other',expires_at:Date.now()+3600000}));
    resolve({ok:true,status:200,text:async()=>JSON.stringify({ok:true,state:'winner'})});assert.equal((await pending).ok,false);
    map.delete('grindx.cloud.session');assert.equal((await win.gridlockCloud.huntRequest({action:'status'})).ok,false);assert.equal(requests.length,1);
  });
  console.log(`${count}/${count} pod-hunt server checks passed. Isolated PostgreSQL only; no live service calls.`);
}finally{await db.close();}

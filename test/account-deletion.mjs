import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as module from 'node:module';
const source=module.stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/gridlock-account/handler.ts',import.meta.url),'utf8'),{mode:'strip'});
const {createAccountHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const NOW=Date.parse('2026-10-30T12:00:00Z'),ID='11111111-1111-4111-8111-111111111111',ORIGIN='https://staging.example.test';
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name);}
function harness(extra={}){
  const state={deleted:[],user:{id:ID,email_confirmed_at:'today',factors:[]},claims:{sub:ID,aal:'aal1',amr:[{method:'password',timestamp:NOW/1000}]},...extra};
  const settings={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-server',ADMIN_ALLOWED_ORIGINS:ORIGIN};
  const handler=createAccountHandler({get:k=>settings[k]},()=>({auth:{getUser:async()=>({data:{user:state.user},error:state.authError}),getClaims:async()=>({data:{claims:state.claims},error:state.claimsError}),admin:{deleteUser:async(id,soft)=>{state.deleted.push([id,soft]);return{error:state.deleteError};}}}}),()=>NOW);
  const send=async(body={confirmation:'DELETE MY ACCOUNT'},headers={},method='POST')=>{
    const req=new Request('https://fixture.supabase.co/functions/v1/gridlock-account',{method,headers:{origin:ORIGIN,authorization:'Bearer fixture','content-type':'application/json',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
    return handler(req);
  };
  return{state,send};
}
await test('exact confirmation deletes only verified caller, never a body-selected target',async()=>{
  const h=harness();const res=await h.send();assert.equal(res.status,200);assert.deepEqual(h.state.deleted,[[ID,false]]);assert.equal(res.headers.get('cache-control'),'no-store');
});
for(const [label,body]of[['missing',{}],['null',{confirmation:null}],['wrong',{confirmation:'delete'}],['target injection',{confirmation:'DELETE MY ACCOUNT',user_id:'other'}]])await test(label+' confirmation cannot delete an account',async()=>{
  const h=harness();assert.equal((await h.send(body)).status,400);assert.equal(h.state.deleted.length,0);
});
await test('password reauthentication must be recent and cannot come from future timestamps',async()=>{
  for(const timestamp of [NOW/1000-301,NOW/1000+31]){
    const h=harness({claims:{sub:ID,aal:'aal1',amr:[{method:'password',timestamp}]}});assert.equal((await h.send()).status,403);assert.equal(h.state.deleted.length,0);
  }
});
await test('a refreshed token without a fresh password is not enough',async()=>{
  const h=harness({claims:{sub:ID,aal:'aal2',amr:[{method:'totp',timestamp:NOW/1000}]}});assert.equal((await h.send()).status,403);assert.equal(h.state.deleted.length,0);
});
await test('MFA-enrolled accounts must supply a verified second-factor token',async()=>{
  const user={id:ID,email_confirmed_at:'today',factors:[{status:'verified',factor_type:'totp'}]};
  const h=harness({user});assert.equal((await h.send()).status,403);assert.equal(h.state.deleted.length,0);
  const yes=harness({user,claims:{sub:ID,aal:'aal2',amr:[{method:'password',timestamp:NOW/1000}]}});assert.equal((await yes.send()).status,200);
});
await test('unverified tokens and unconfirmed users cannot delete',async()=>{
  for(const extra of [{authError:{message:'bad'}},{claimsError:{message:'bad'}},{claims:{sub:'other'}},{user:{id:ID,email_confirmed_at:null}}]){
    const h=harness(extra);assert([401,403].includes((await h.send()).status));assert.equal(h.state.deleted.length,0);
  }
});
await test('foreign origins and anonymous requests cannot delete',async()=>{
  const h=harness();assert.equal((await h.send(undefined,{origin:'https://other.example.test'})).status,403);assert.equal((await h.send(undefined,{authorization:''})).status,401);assert.equal(h.state.deleted.length,0);
});
await test('invalid JSON, large bodies and form submissions are rejected',async()=>{
  const h=harness();assert.equal((await h.send('{bad')).status,400);assert.equal((await h.send(' '.repeat(513))).status,413);assert.equal((await h.send('a=1',{'content-type':'application/x-www-form-urlencoded'})).status,415);assert.equal(h.state.deleted.length,0);
});
await test('provider refusal never claims deletion succeeded or exposes its details',async()=>{
  const h=harness({deleteError:{message:'private-internal'}}),res=await h.send();assert.equal(res.status,502);assert(!(await res.text()).includes('private-internal'));
});
console.log(`${count} account-deletion safety checks passed. No live accounts were used.`);

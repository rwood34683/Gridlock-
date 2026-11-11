import assert from 'node:assert/strict';
import {test,before,after,beforeEach} from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import Stripe from 'stripe';
import {createPaymentsHandler} from '../supabase/functions/gridlock-payments/handler.mjs';
import {createStripeWebhook} from '../supabase/functions/gridlock-stripe-webhook/handler.mjs';
import {easternMidnight,metadata,STRIPE_API_VERSION} from '../supabase/functions/_shared/web-payments.mjs';

const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const U='33333333-3333-4333-8333-333333333333';
const db=new PGlite(),app='https://payments-test.example/';
// Fixture credentials only: never connect these tests to an account or Stripe.
const sdk=new Stripe('sk_test_fixture_not_a_key',{apiVersion:STRIPE_API_VERSION});
let env,privateKey,publicKey,intents,sessions,charges,creates,refunds,handler,webhook,seq=0;
const query=(sql,args=[])=>db.query(sql,args);
const value=async(sql,args=[])=>Object.values((await query(sql,args)).rows[0])[0];
const rpc=async(name,args={})=> {
  assert.match(name,/^gridlock_[a-z_]+$/);
  const keys=Object.keys(args);keys.forEach(k=>assert.match(k,/^[a-z_]+$/));
  try{return {data:await value('select public.'+name+'('+keys.map((k,i)=>k+' => $'+(i+1)).join(',')+')',
    Object.values(args).map(v=>v && typeof v==='object'?JSON.stringify(v):v)),error:null};}
  catch(error){return {data:null,error};}
};
const client=()=>({rpc,auth:{getUser:async token=>{
  const id=token==='user-a'?A:token==='user-b'?B:token==='unconfirmed'?U:null;
  return {data:{user:id?{id,email:id===A?'a@example.test':'b@example.test',email_confirmed_at:id===U?null:new Date().toISOString()}:null}};
}}});
const envObj=()=>({get:k=>env[k]});
const request=(action,token='user-a',extra={})=>new Request(app,{method:'POST',
 headers:{'content-type':'application/json',origin:new URL(app).origin,authorization:'Bearer '+token,...extra},
 body:JSON.stringify(typeof action==='string'?{action}:action)});
const access=(owner=A,live=false)=>value('select public.gridlock_payment_access($1,$2)',[owner,live]);
const reserve=(owner=A,live=false)=>value('select public.gridlock_reserve_checkout($1,$2)',[owner,live]);
async function pay(order,owner=A,{live=false,when=new Date(),id,refunded=false,disputed=false}={}) {
 const intent=id||'pi_'+(++seq);
 await value('select public.gridlock_apply_payment_event($1,$2,$3,$4,$5,$6,$7,$8,$9)',
 ['evt_'+(++seq),'paid',live,order.id,owner,intent,when.toISOString(),refunded,disputed]);
 return intent;
}
async function event(type,object,options={}) {
 const payload=JSON.stringify({id:options.id||'evt_'+(++seq),type,livemode:options.live??false,
 created:options.created??Math.floor(Date.now()/1000),data:{object}});
 const signature=sdk.webhooks.generateTestHeaderString({payload,secret:env.STRIPE_WEBHOOK_SECRET,
   timestamp:options.signedAt??Math.floor(Date.now()/1000)});
 return webhook(new Request(app,{method:'POST',headers:{'stripe-signature':signature},body:options.tamper?payload+' ':payload}));
}
before(async()=>{
 await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin;"+
  "create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);"+
  "grant usage on schema auth to authenticated,supabase_auth_admin; grant select on auth.users to supabase_auth_admin;"+
  "create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;"+
  "create table public.entitlements(user_id uuid primary key references auth.users(id),plan text,expires_at timestamptz);"+
  "create table public.seasons(owner uuid primary key references auth.users(id),label text,payload jsonb,updated_at timestamptz,revision bigint,deleted_at timestamptz);"+
  "alter table public.entitlements enable row level security; alter table public.seasons enable row level security;"+
  "grant select on public.entitlements,public.seasons to authenticated;"+
  "create policy own_season on public.seasons for select to authenticated using(owner=auth.uid());"+
  "create policy own_plan on public.entitlements for select to authenticated using(user_id=auth.uid());");
 await db.exec(await readFile(new URL('../supabase/migrations/202611100001_web_payments.sql',import.meta.url),'utf8'));
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 privateKey=await crypto.subtle.exportKey('jwk',pair.privateKey);
 publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);
});
beforeEach(async()=>{
 await db.exec("reset role; truncate gridlock_private.payment_events,gridlock_private.payment_orders,gridlock_private.beta_testers,public.entitlements,public.seasons,auth.users cascade;"+
   "update gridlock_private.payment_settings set public_signup_enabled=false,test_checkout_enabled=true,live_checkout_enabled=false;");
 await query("insert into auth.users values($1,'a@example.test',now()),($2,'b@example.test',now()),($3,'u@example.test',null)",[A,B,U]);
 intents=new Map();sessions=new Map();charges=new Map();creates=[];refunds=[];
 env={GRIDLOCK_STRIPE_MODE:'test',PAYMENTS_APP_URL:app,SUPABASE_URL:'https://project.example',
   SUPABASE_SERVICE_ROLE_KEY:'server-test-fixture',GRIDLOCK_ACCESS_PRIVATE_JWK:JSON.stringify(privateKey),
   GRIDLOCK_CHECKOUT_ENABLED:'true',STRIPE_COACH_PRICE_ID:'price_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture_not_a_secret'};
 const stripe={webhooks:sdk.webhooks,prices:{retrieve:async()=>({active:true,type:'one_time',currency:'usd',unit_amount:1997,livemode:false})},
   checkout:{sessions:{retrieve:async id=>sessions.get(id),create:async(args,opts)=>{
     const prior=creates.find(c=>c.opts.idempotencyKey===opts.idempotencyKey);
     if(prior)return prior.session;
     const session={id:'cs_test_'+(++seq),status:'open',livemode:false,url:'https://checkout.stripe.com/c/pay/fixture',...args};
     creates.push({args,opts,session});sessions.set(session.id,session);return session;
   }}},paymentIntents:{retrieve:async id=>intents.get(id)},charges:{retrieve:async id=>charges.get(id)},
   refunds:{create:async(args,opts)=>{refunds.push({args,opts});return {id:'re_fixture'};}}};
 handler=createPaymentsHandler(envObj(),client,stripe);
 webhook=createStripeWebhook(envObj(),client,stripe);
});
after(()=>db.close());

test('confirmed account only, exact origin, no browser-supplied owner or price',async()=>{
 for(const token of ['invalid','unconfirmed'])assert.ok([401,403].includes((await handler(request('checkout',token))).status));
 assert.equal((await handler(request({action:'checkout',owner:B}))).status,400);
 assert.equal((await handler(request('checkout','user-a',{origin:'https://evil.example'}))).status,403);
 assert.equal(creates.length,0);
});
test('new customer signup stays closed until separate switch; email confirmation remains required',async()=>{
 const before=await value('select public.gridlock_beta_before_user_created($1)',[{user:{email:'new@example.test'}}]);
 assert.equal(before.error.http_code,403);
 await db.exec('update gridlock_private.payment_settings set public_signup_enabled=true');
 assert.deepEqual(await value('select public.gridlock_beta_before_user_created($1)',[{user:{email:'new@example.test'}}]),{});
 assert.equal((await value('select public.gridlock_beta_access_token($1)',[{user_id:U,claims:{sub:U}}])).error.http_code,403);
 assert.equal((await value('select public.gridlock_beta_access_token($1)',[{user_id:A,claims:{sub:A}}])).user_id,A);
});
test('concurrent checkout reuses the order and Stripe idempotency key; price/account are server chosen',async()=>{
 const rs=await Promise.all([handler(request('checkout')),handler(request('checkout'))]);
 for(const r of rs)assert.equal(r.status,200);
 assert.equal(creates.length,1);
 assert.equal(await value('select count(*)::int from gridlock_private.payment_orders'),1);
 const c=creates[0];
 assert.deepEqual(c.args.line_items,[{price:'price_fixture',quantity:1}]);
 assert.equal(c.args.mode,'payment');assert.equal(c.args.client_reference_id,A);
 assert.equal(c.args.payment_intent_data.metadata.gridlock_owner,A);
 assert.equal(c.args.payment_method_types,undefined);
 assert.deepEqual(c.args.allowed_payment_method_types,['card','link']);
 assert.equal(c.args.adaptive_pricing.enabled,false);
 assert.equal(c.args.success_url,app+'?payment=return');
 assert.equal((await access()).plan,'free');
});
test('both deployment and database switches keep checkout off; live needs separate approval',async()=>{
 env.GRIDLOCK_CHECKOUT_ENABLED='false';
 assert.equal((await handler(request('checkout'))).status,503);
 env.GRIDLOCK_CHECKOUT_ENABLED='true';
 await db.exec('update gridlock_private.payment_settings set test_checkout_enabled=false');
 assert.equal((await handler(request('checkout'))).status,503);
 env.GRIDLOCK_STRIPE_MODE='live';handler=createPaymentsHandler(envObj(),client,{});
 assert.equal((await handler(request('checkout'))).status,503);
 assert.equal(creates.length,0);
});
test('controlled live pilot is limited to the named test account until public launch approval',async()=>{
 env.GRIDLOCK_STRIPE_MODE='live';env.GRIDLOCK_LIVE_PILOT_UIDS=A;
 await db.exec('update gridlock_private.payment_settings set live_checkout_enabled=true');
 const stripe={prices:{retrieve:async()=>({active:true,type:'one_time',currency:'usd',unit_amount:1997,livemode:true})},
 checkout:{sessions:{create:async args=>({id:'cs_live_pilot',url:'https://checkout.stripe.com/c/pay/pilot',livemode:true,...args})}}};
 handler=createPaymentsHandler(envObj(),client,stripe);
 assert.equal((await handler(request('checkout','user-b'))).status,503);
 assert.equal((await handler(request('checkout','user-a'))).status,200);
 assert.equal((await access(A,true)).plan,'free');
});
test('signed access receipt is verifiable and bound to account, origin, mode and expiration',async()=>{
 await db.exec("insert into gridlock_private.beta_testers(email) values('a@example.test')");
 const response=await handler(request('access'));assert.equal(response.status,200);
 const {receipt}=await response.json(),[h,p,s]=receipt.split('.');
 const key=await crypto.subtle.importKey('jwk',publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 assert.ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,Buffer.from(s,'base64url'),Buffer.from(h+'.'+p)));
 const payload=JSON.parse(Buffer.from(p,'base64url'));assert.equal(payload.sub,A);
 assert.equal(payload.aud,new URL(app).origin);assert.equal(payload.mode,'test');assert.equal(payload.plan,'program');
 assert.ok(payload.exp-payload.iat<=86400);
});
test('successful signed payment grants one account; replay does not extend expiration',async()=>{
 const o=await reserve(),meta=metadata(o.id,A),intent={id:'pi_success',livemode:false,currency:'usd',amount:1997,
 amount_received:1997,status:'succeeded',metadata:meta,latest_charge:null};intents.set(intent.id,intent);
 const id='evt_success';
 assert.equal((await event('payment_intent.succeeded',intent,{id})).status,200);
 const first=await access();assert.equal(first.plan,'program');assert.equal((await access(B)).plan,'free');
 assert.equal((await event('payment_intent.succeeded',intent,{id})).status,200);
 assert.deepEqual(await access(),first);
 assert.equal(Date.parse(first.expires_at),easternMidnight(Math.floor(Date.now()/1000)));
});
test('tampered, old, wrong-mode signatures cannot grant access',async()=>{
 const o=await reserve(),intent={id:'pi_bad',metadata:metadata(o.id,A)};
 for(const opt of [{tamper:true},{signedAt:Math.floor(Date.now()/1000)-1000},{live:true}])
   assert.equal((await event('payment_intent.succeeded',intent,opt)).status,400);
 assert.equal((await access()).plan,'free');
 assert.equal(await value('select count(*)::int from gridlock_private.payment_events'),0);
});
test('Checkout completion and return URL do not grant access; failed/cancelled checkout stays free',async()=>{
 await handler(request('checkout'));const s=creates[0].session;
 s.status='complete';s.payment_intent='pi_pending';
 intents.set('pi_pending',{id:'pi_pending',metadata:s.metadata,livemode:false,currency:'usd',amount:1997,status:'processing'});
 assert.equal((await event('checkout.session.completed',s)).status,200);
 assert.equal((await access()).plan,'free');
 assert.equal((await event('checkout.session.async_payment_failed',s)).status,200);
 assert.equal((await access()).plan,'free');
 await handler(request('checkout'));const s2=creates.at(-1).session;s2.status='expired';
 assert.equal((await event('checkout.session.expired',s2)).status,200);
 assert.equal((await access()).plan,'free');
});
test('mismatched account, amount and mode in retrieved payment fail closed',async()=>{
 const o=await reserve(),signed={id:'pi_mismatch',metadata:metadata(o.id,A)};
 const base={...signed,livemode:false,status:'succeeded',currency:'usd',amount:1997,amount_received:1997};
 for(const patch of [{metadata:metadata(o.id,B)},{amount:1},{livemode:true}]){
   intents.set(signed.id,{...base,...patch});
   assert.equal((await event('payment_intent.succeeded',signed)).status,500);
 }
 assert.equal((await access()).plan,'free');
});
test('full refund revokes pass, partial refund does not; replay cannot resurrect it',async()=>{
 const o=await reserve();await pay(o,A,{id:'pi_refund'});
 const intent={id:'pi_refund',metadata:metadata(o.id,A),livemode:false,currency:'usd',amount:1997,
 amount_received:1997,status:'succeeded'};intents.set(intent.id,intent);
 const charge={id:'ch_refund',payment_intent:intent.id,refunded:false,amount_refunded:100};
 charges.set(charge.id,charge);
 assert.equal((await event('charge.refunded',charge)).status,200);assert.equal((await access()).plan,'program');
 charge.refunded=true;charge.amount_refunded=1997;
 assert.equal((await event('charge.refunded',charge)).status,200);assert.equal((await access()).plan,'free');
 assert.equal((await event('payment_intent.succeeded',intent)).status,200);assert.equal((await access()).plan,'free');
});
test('out-of-order refund and dispute cannot be undone by a later success event',async()=>{
 for(const kind of ['refund','dispute']){
  const owner=kind==='refund'?A:B,order=await reserve(owner);
  await value('select public.gridlock_apply_payment_event($1,$2,false,$3,$4,$5,null,$6,$7)',
   ['evt_'+(++seq),kind,order.id,owner,'pi_'+kind,kind==='refund',kind==='dispute']);
  await pay(order,owner,{id:'pi_'+kind});
  assert.equal((await access(owner)).plan,'free');
 }
});
test('second same-day charge is flagged for an idempotent full refund',async()=>{
 const first=await reserve();await pay(first);
 const second=await value("insert into gridlock_private.payment_orders(owner,live) values($1,false) returning to_jsonb(payment_orders)",[A]);
 const intent={id:'pi_duplicate',metadata:metadata(second.id,A),livemode:false,currency:'usd',amount:1997,
 amount_received:1997,status:'succeeded'};intents.set(intent.id,intent);
 for(let i=0;i<2;i++)assert.equal((await event('payment_intent.succeeded',intent,{id:'evt_duplicate'})).status,200);
 assert.equal(refunds.length,2);assert.equal(refunds[0].opts.idempotencyKey,refunds[1].opts.idempotencyKey);
 assert.equal(refunds[0].args.reason,'duplicate');assert.equal((await access()).plan,'program');
});

test('retried success reconciles a current refund or dispute before its dedicated event arrives',async()=>{
 for(const disputed of [false,true]){
  const owner=disputed?B:A,order=await reserve(owner),id=disputed?'pi_laterdispute':'pi_laterrefund';
  const intent={id,metadata:metadata(order.id,owner),livemode:false,currency:'usd',amount:1997,
   amount_received:1997,status:'succeeded',latest_charge:{refunded:false,amount_refunded:0,disputed:false}};
  intents.set(id,intent);const eventId=disputed?'evt_laterdispute':'evt_laterrefund';
  assert.equal((await event('payment_intent.succeeded',intent,{id:eventId})).status,200);
  const expiry=(await access(owner)).expires_at;
  intent.latest_charge=disputed?{disputed:true}:{refunded:true,amount_refunded:1997};
  assert.equal((await event('payment_intent.succeeded',intent,{id:eventId})).status,200);
  assert.equal((await access(owner)).plan,'free');
  assert.equal(new Date(await value('select expires_at from gridlock_private.payment_orders where id=$1',[order.id])).toISOString(),new Date(expiry).toISOString());
 }
});

test('already-refunded duplicate does not request another refund when the success event retries',async()=>{
 const first=await reserve();await pay(first);
 const duplicate=await value("insert into gridlock_private.payment_orders(owner,live) values($1,false) returning to_jsonb(payment_orders)",[A]);
 const intent={id:'pi_refundedduplicate',metadata:metadata(duplicate.id,A),livemode:false,currency:'usd',amount:1997,
  amount_received:1997,status:'succeeded',latest_charge:{refunded:false,amount_refunded:0}};
 intents.set(intent.id,intent);
 assert.equal((await event('payment_intent.succeeded',intent,{id:'evt_refundedduplicate'})).status,200);
 assert.equal(refunds.length,1);
 intent.latest_charge={refunded:true,amount_refunded:1997};
 assert.equal((await event('payment_intent.succeeded',intent,{id:'evt_refundedduplicate'})).status,200);
 assert.equal(refunds.length,1);assert.equal((await access()).plan,'program');
});
test('midnight/DST boundaries match real PostgreSQL; delayed fulfillment is refunded without access',async()=>{
 for(const date of ['2026-03-08T05:00:00Z','2026-11-01T04:00:00Z','2026-07-01T03:59:59Z','2026-11-10T04:59:59Z']){
  const ms=Date.parse(date),expected=easternMidnight(ms/1000);
  const actual=await value("select (($1::timestamptz at time zone 'America/New_York')::date+1)::timestamp at time zone 'America/New_York'",[date]);
  assert.equal(new Date(actual).getTime(),expected);
 }
 assert.equal(easternMidnight(Date.parse('2026-03-08T05:00:00Z')/1000)-Date.parse('2026-03-08T05:00:00Z'),23*3600000);
 assert.equal(easternMidnight(Date.parse('2026-11-01T04:00:00Z')/1000)-Date.parse('2026-11-01T04:00:00Z'),25*3600000);
 const o=await reserve();await pay(o,A,{when:new Date(Date.now()-3*86400000)});
 assert.equal((await access()).plan,'free');
 assert.equal(await value('select refund_due from gridlock_private.payment_orders where id=$1',[o.id]),'access-not-delivered');
});
test('beta and existing admin/plan access survive refunded payments; test grants never unlock live writes',async()=>{
 await db.exec("insert into gridlock_private.beta_testers values('a@example.test',true,now())");
 await query("insert into public.entitlements values($1,'program',null)",[B]);
 assert.equal((await access(A)).source,'beta');assert.equal((await access(B,true)).source,'existing');
 await db.exec('truncate gridlock_private.beta_testers');
 const o=await reserve();await pay(o);
 assert.equal((await access()).plan,'program');assert.equal((await access(A,true)).plan,'free');
 await query("select set_config('request.jwt.claim.sub',$1,false)",[A]);
 assert.equal(await value('select public.gridlock_coach_authorized()'),false);
});
test('RLS denies cross-account data and payment writes, while expired owner can read and delete season',async()=>{
 await query("insert into public.seasons values($1,'A','{}',now(),1,null),($2,'B','{}',now(),1,null)",[A,B]);
 await query("select set_config('request.jwt.claim.sub',$1,false)",[A]);await db.exec('set role authenticated');
 assert.deepEqual((await query('select label from public.seasons')).rows,[{label:'A'}]);
 await assert.rejects(query('select * from gridlock_private.payment_orders'),/permission denied/);
 await assert.rejects(query('select public.gridlock_reserve_checkout($1,false)',[A]),/permission denied/);
 await assert.rejects(query("select public.gridlock_write_season(1,'x',$1,false)",[{format:'gridlock.coach.copy',data:{}}]),/active Coach pass/);
 const deleted=await value('select public.gridlock_write_season(1,null,null,true)');assert.equal(deleted.removed,true);
 await db.exec('reset role');assert.equal(await value('select label from public.seasons where owner=$1',[B]),'B');
});

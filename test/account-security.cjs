'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto'),{PGlite}=require('@electric-sql/pglite');
const db=new PGlite(),A=randomUUID(),B=randomUUID(),factor=randomUUID(),otherFactor=randomUUID();
const sessions=Array.from({length:6},randomUUID);let n=0;
async function check(name,fn){await fn();console.log('PASS '+name);n++;}
async function claims(sid=sessions[0],aal='aal2',actor=A){await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:actor,session_id:sid,aal})]);}
async function query(sql,args=[],role='authenticated'){await db.exec('set role '+role);try{return await db.query(sql,args);}finally{await db.exec('reset role');}}
async function call(action='status',input={}){return (await query('select public.gridlock_security_action($1,$2) as r',[action,input])).rows[0].r;}
async function allowed(){return (await query('select public.gridlock_session_allowed() as ok')).rows[0].ok;}
async function read(){return (await query('select * from public.seasons')).rows;}
async function write(rev,label='Codes'){return query("select public.gridlock_write_season($1,$2,$3,false)",[rev,label,{format:'gridlock.coach.copy',data:{codes:[{word:'S1',meaning:'Snake one'}]}}]);}
(async()=>{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);
    create table auth.sessions(id uuid primary key,user_id uuid,factor_id uuid,not_after timestamptz);
    create table auth.mfa_factors(id uuid primary key,user_id uuid,status text);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create table public.seasons(owner uuid primary key references auth.users(id),label text,payload jsonb,updated_at timestamptz);
    create table public.entitlements(user_id uuid primary key references auth.users(id),plan text,expires_at timestamptz,source text,updated_at timestamptz);
    alter table public.seasons enable row level security;alter table public.entitlements enable row level security;
    create policy own_season on public.seasons for select to authenticated using(owner=auth.uid());
    create policy own_plan on public.entitlements for select to authenticated using(user_id=auth.uid());
    grant select on public.seasons,public.entitlements to authenticated;`);
  for(const id of [A,B])await db.query('insert into auth.users values($1,now(),null,null)',[id]);
  await db.query("insert into auth.mfa_factors values($1,$2,'verified'),($3,$4,'verified')",[factor,A,otherFactor,B]);
  for(const sid of sessions)await db.query('insert into auth.sessions values($1,$2,$3,null)',[sid,A,factor]);
  for(const file of ['202610300001_safe_season_sync.sql','202611150001_team_membership.sql','202611150002_account_security.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8'));
  await claims();
  await check('installed disabled; existing Coach writes still work',async()=>{assert.equal((await call()).required,false);await write(0);assert.equal((await read()).length,1);});
  await check('anonymous callers cannot enroll a device or spoof service claims',async()=>{
    await assert.rejects(query("select public.gridlock_security_action('claim','{}')",[],'anon'),/permission denied/);
    await assert.rejects(query('select public.gridlock_service_session_allowed($1,$2,$3)',[A,sessions[0],'aal2']),/permission denied/);
  });
  await check('browser cannot read/write policy or device tables',async()=>{for(const t of ['gridlock_security_settings','gridlock_device_sessions']){await assert.rejects(query('select * from public.'+t),/permission denied/);await assert.rejects(query('delete from public.'+t),/permission denied/);}});
  await db.exec('update public.gridlock_security_settings set enabled=true');
  await check('enabled policy refuses password-only sessions for every role',async()=>{for(const role of ['coach','owner','admin','player','beta']){await claims(sessions[0],'aal1');assert.equal((await call()).code,'mfa_required',role);assert.equal(await allowed(),false);assert.equal((await read()).length,0);await assert.rejects(write(1),/Verify two-factor/);}});
  await check('no session and wrong-account session fail closed',async()=>{await claims(null);assert.equal((await call()).code,'sign_in_required');await claims(sessions[0],'aal2',B);assert.equal((await call()).code,'sign_in_required');});
  await claims();
  await check('verified MFA still requires explicit device approval',async()=>{assert.equal((await call()).code,'device_required');assert.equal(await allowed(),false);assert.equal((await call('claim',{label:''})).code,'invalid_request');});
  await check('phone tablet and laptop get exactly three places',async()=>{for(let i=0;i<3;i++){await claims(sessions[i]);const r=await call('claim',{label:['Phone','Tablet','Laptop'][i]});assert.equal(r.ok,true);assert.equal(r.devices.length,i+1);assert.equal(await allowed(),true);}});
  await check('same browser tabs reuse their session without another place',async()=>{const r=await call('claim',{label:'Another tab'});assert.equal(r.ok,true);assert.equal(r.devices.length,3);});
  await check('fourth device cannot read or write before choosing a replacement',async()=>{await claims(sessions[3]);const r=await call('claim',{label:'Fourth'});assert.equal(r.ok,false);assert.equal(r.devices.length,3);assert.equal((await read()).length,0);await assert.rejects(write(1),/Verify two-factor/);});
  await check('all three approved devices share the same codes without changing sync revision rules',async()=>{for(let i=0;i<3;i++){await claims(sessions[i]);const r=await read();assert.equal(r.length,1);assert.equal(r[0].payload.data.codes[0].word,'S1');}await write(1);const stale=await write(1);assert.equal(stale.rows[0].gridlock_write_season.conflict,true);});
  await check('replacement revokes only the chosen session and preserves the season',async()=>{await claims(sessions[3]);const r=await call('claim',{label:'New phone',replace:sessions[0]});assert.equal(r.ok,true);assert.equal(r.devices.length,3);await claims(sessions[0]);assert.equal((await call()).code,'device_revoked');assert.equal(await allowed(),false);assert.equal((await read()).length,0);await claims(sessions[1]);assert.equal((await read())[0].revision,2);});
  await check('revoked token cannot reclaim itself or evict another device',async()=>{await claims(sessions[0]);for(const action of ['status','claim','revoke'])assert.equal((await call(action,{label:'Sneaky',replace:sessions[1],session_id:sessions[1]})).code,'device_revoked');});
  await check('other account cannot list or revoke these devices',async()=>{const s=randomUUID();await db.query('insert into auth.sessions values($1,$2,$3,null)',[s,B,otherFactor]);await claims(s,'aal2',B);assert.deepEqual((await call()).devices,[]);assert.equal((await call('claim',{label:'Other'})).ok,true);assert.equal((await call('revoke',{session_id:sessions[1]})).code,'device_changed');assert.equal((await read()).length,0);});
  await check('approval ignores injected user ids and permissions',async()=>{await claims(sessions[4]);assert.equal((await call('claim',{label:'Bad',user_id:B,role:'admin'})).code,'invalid_request');});
  await check('revoking the current session immediately blocks its next read',async()=>{await claims(sessions[3]);assert.equal((await call('revoke',{session_id:sessions[3]})).ok,false);assert.equal(await allowed(),false);});
  await check('signed-out Auth session frees a place without deleting saved data',async()=>{await db.query('delete from auth.sessions where id=$1',[sessions[2]]);await claims(sessions[2]);assert.equal(await allowed(),false);await claims(sessions[4]);const r=await call('claim',{label:'Replacement'});assert.equal(r.ok,true);assert.equal(r.devices.length,2);assert.equal((await read())[0].revision,2);});
  await check('unverified or removed factor invalidates even an aal2 JWT',async()=>{await db.query("update auth.mfa_factors set status='unverified' where id=$1",[factor]);assert.equal(await allowed(),false);assert.equal((await call()).code,'mfa_required');await db.query("update auth.mfa_factors set status='verified' where id=$1",[factor]);});
  await check('password recovery aal1 cannot bypass protection',async()=>{await claims(sessions[4],'aal1');assert.equal(await allowed(),false);assert.equal((await call('claim',{label:'Reset'})).code,'mfa_required');});
  await check('expired Auth session fails even with a valid access JWT',async()=>{await claims(sessions[4]);await db.query("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[sessions[4]]);assert.equal(await allowed(),false);assert.equal((await call()).code,'sign_in_required');});
  await check('banned and unconfirmed accounts cannot enroll devices',async()=>{await claims(sessions[5]);await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[A]);assert.equal((await call('claim',{label:'Banned'})).code,'sign_in_required');await db.query('update auth.users set banned_until=null,email_confirmed_at=null where id=$1',[A]);assert.equal((await call()).code,'sign_in_required');await db.query('update auth.users set email_confirmed_at=now() where id=$1',[A]);});
  await check('definer RPC originals cannot be called directly by a browser',async()=>{await assert.rejects(query('select gridlock_security_private.gridlock_write_season(2,\'x\',\'{}\',false)'),/permission denied/);await assert.rejects(query("select gridlock_security_private.gridlock_team_action('list','{}')"),/permission denied/);assert.equal((await query("select public.gridlock_team_action('list','{}') r")).rows[0].r.code,'security_required');});
  await check('missing security policy fails closed',async()=>{await db.exec('delete from public.gridlock_security_settings');assert.equal(await allowed(),false);await assert.rejects(call(),/Security policy unavailable/);});
  console.log(`${n}/${n} account-security PostgreSQL checks passed. No live services changed.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.close());

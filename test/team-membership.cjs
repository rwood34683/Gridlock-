"use strict";
// Runs the actual migration and RPC in PostgreSQL, with browser roles rather
// than trusting a mocked permission check. No live service or credentials.
const {PGlite} = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID, createHash} = require('node:crypto');
const db = new PGlite();
const ids = Object.fromEntries(['owner','coach','player','outsider','other','fresh','unconfirmed','banned','nonpilot'].map(k=>[k,randomUUID()]));
const tables = ['gridlock_team_settings','gridlock_team_pilot','gridlock_teams','gridlock_team_members','gridlock_team_invites','gridlock_team_join_limits'];
let passed=0, team, otherTeam, playerCode;
async function check(name,fn){await fn(); console.log('PASS '+name); passed++;}
async function as(user,query,params=[],role='authenticated'){
  await db.exec('SET ROLE '+role);
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[user]||user||'']);
    return await db.query(query,params);
  } finally {await db.exec('RESET ROLE');}
}
async function rpc(user,action,input={}){return (await as(user,'select public.gridlock_team_action($1,$2::jsonb) as result',[action,JSON.stringify(input)])).rows[0].result;}
async function get(user='owner',id=team){return (await rpc(user,'get',{team_id:id})).team;}
async function mutate(action,extra={},user='owner',id=team){const t=await get(user,id);assert.ok(t);return rpc(user,action,{team_id:id,revision:t.revision,...extra});}
async function invite(role='player',user='owner',id=team){const r=await mutate('invite',{role},user,id);assert.equal(r.ok,true);return r.invite;}
async function join(user,code){return rpc(user,'join',{code,display_name:user});}
async function resetAttempts(user){await db.query('delete from public.gridlock_team_join_limits where user_id=$1',[ids[user]]);}
function denied(r,code){assert.equal(r.ok,false);assert.equal(r.code,code);}
(async()=>{
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to authenticated;
    -- Existing Coach records stand in for unrelated production tables. Their
    -- rows and policies must remain untouched by the membership migration.
    create table public.seasons(owner uuid primary key references auth.users(id) on delete cascade,payload jsonb);
    create table public.entitlements(user_id uuid primary key references auth.users(id) on delete cascade,plan text);
    alter table public.seasons enable row level security;
    alter table public.entitlements enable row level security;
    create policy own_season on public.seasons for select to authenticated using(owner=auth.uid());
    create policy own_plan on public.entitlements for select to authenticated using(user_id=auth.uid());
    grant select on public.seasons,public.entitlements to authenticated;
  `);
  for(const [name,id] of Object.entries(ids)){
    await db.query('insert into auth.users(id,email_confirmed_at,banned_until) values($1,$2,$3)',[id,name==='unconfirmed'?null:'2026-01-01T00:00:00Z',name==='banned'?'2099-01-01T00:00:00Z':null]);
    await db.query('insert into public.seasons values($1,$2)',[id,JSON.stringify({codes:{S1:'kept'},saved:name})]);
    await db.query('insert into public.entitlements values($1,$2)',[id,name==='owner'?'program':'free']);
  }
  const policiesBefore=(await db.query("select * from pg_policies where tablename in ('seasons','entitlements') order by tablename")).rows;
  await check('migration installs, disabled with an empty pilot list',async()=>{
    await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/202611150001_team_membership.sql'),'utf8'));
    denied(await rpc('owner','list'),'not_available');
    assert.equal((await db.query('select count(*)::int as n from public.gridlock_team_pilot')).rows[0].n,0);
  });
  await check('anonymous callers cannot execute the RPC',async()=>{
    await assert.rejects(as('',"select public.gridlock_team_action('list')",[],'anon'),/permission denied/);
    denied(await rpc('','list'),'sign_in_required');
  });
  for(const table of tables){
    await check('direct browser reads and writes denied: '+table,async()=>{
      await assert.rejects(as('owner','select * from public.'+table),/permission denied/);
      await assert.rejects(as('owner','delete from public.'+table),/permission denied/);
      assert.equal((await db.query('select relrowsecurity from pg_class where oid=$1::regclass',['public.'+table])).rows[0].relrowsecurity,true);
    });
  }
  await check('private helper cannot impersonate another member',async()=>{
    await assert.rejects(as('outsider','select gridlock_team_private.snapshot($1,$2)',[randomUUID(),ids.owner]),/permission denied/);
    const f=(await db.query("select proconfig,prosecdef from pg_proc where proname in ('snapshot','gridlock_team_action')")).rows;
    assert.equal(f.length,2);assert.ok(f.every(x=>x.prosecdef&&x.proconfig.includes('search_path=""')));
  });
  for(const [name,id] of Object.entries(ids))if(name!=='nonpilot')await db.query('insert into public.gridlock_team_pilot values($1,$2)',[id,['owner','other'].includes(name)]);
  await db.exec('update public.gridlock_team_settings set enabled=true');
  await check('unconfirmed, banned, deleted and non-pilot accounts fail closed',async()=>{
    for(const u of ['unconfirmed','banned',randomUUID()])denied(await rpc(u,'list'),'sign_in_required');
    denied(await rpc('nonpilot','list'),'not_available');
  });
  await check('only an approved creator can create, never a client-supplied role',async()=>{
    denied(await rpc('player','create',{name:'Squad',display_name:'A',request_id:randomUUID()}),'owner_required');
    denied(await rpc('owner','create',{name:'Squad',display_name:'A',request_id:randomUUID(),role:'owner'}),'invalid_request');
  });
  await check('creation is atomic, bound to auth uid, and idempotent',async()=>{
    const input={name:'Test team',display_name:'Owner',request_id:randomUUID()};
    const first=await rpc('owner','create',input), second=await rpc('owner','create',input);
    assert.equal(first.ok,true);assert.deepEqual(first,second);team=first.team.id;
    assert.equal(first.team.role,'owner');assert.equal(first.team.members[0].user_id,ids.owner);
    otherTeam=(await rpc('other','create',{...input,name:'Other team'})).team.id;
    assert.notEqual(otherTeam,team);
  });
  await check('actor spoofing, unknown actions and malformed input are refused',async()=>{
    for(const [action,input] of [['list',{actor:ids.owner}],['grant',{}],['get',{team_id:'bad'}],['list',null],['list',[]],['create',{name:' ',display_name:'A',request_id:randomUUID()}],['create',{name:'ok',display_name:'A\nB',request_id:randomUUID()}],['list',{junk:'x'.repeat(5000)}]])denied(await rpc('owner',action,input),'invalid_request');
  });
  await check('joined teams count toward the creation limit too',async()=>{
    // Add fixture memberships as the DB owner; the actual create runs as the
    // limited caller, who could otherwise bypass the limit by joining first.
    const filler=[];
    for(let i=0;i<19;i++){
      const id=randomUUID();filler.push(id);
      await db.query('insert into public.gridlock_teams(id,owner_id,created_by,request_id,name) values($1,$2,$2,$3,$4)',[id,ids.other,randomUUID(),'Fixture '+i]);
      await db.query("insert into public.gridlock_team_members(team_id,user_id,role,display_name) values($1,$2,'player','Owner elsewhere')",[id,ids.owner]);
    }
    denied(await rpc('owner','create',{name:'Over limit',display_name:'Owner',request_id:randomUUID()}),'limit_reached');
    for(const id of filler)await db.query('delete from public.gridlock_teams where id=$1',[id]);
  });
  await check('foreign teams and their invites cannot be enumerated',async()=>{
    assert.deepEqual((await rpc('outsider','list')).teams,[]);
    for(const action of ['get','invites','invite','role','remove','transfer'])denied(await rpc('outsider',action,{team_id:team}),'not_found');
    assert.equal((await rpc('owner','list')).teams.length,1);
    denied(await rpc('owner','get',{team_id:otherTeam}),'not_found');
  });
  await check('codes have 122 random bits, only hashes are stored; no listing reveals codes',async()=>{
    playerCode=await invite();assert.match(playerCode.code,/^[A-F0-9]{32}$/);
    assert.equal(playerCode.role,'player');
    const row=(await db.query('select * from public.gridlock_team_invites where id=$1',[playerCode.id])).rows[0];
    assert.equal(row.code_hash,createHash('sha256').update(playerCode.code).digest('hex'));
    assert.ok(!JSON.stringify(row).includes(playerCode.code));
    assert.ok(Math.abs((new Date(row.expires_at)-new Date(row.created_at))/86400000-7)<0.01);
    const list=await rpc('owner','invites',{team_id:team});assert.equal(list.invites.length,1);
    assert.ok(!JSON.stringify(list).includes(playerCode.code));assert.ok(!JSON.stringify(list).includes(row.code_hash));
  });
  await check('one code joins one account; retry is safe and another user is refused',async()=>{
    const r=await join('player',playerCode.code.toLowerCase().match(/.{1,8}/g).join('-'));assert.equal(r.ok,true);
    assert.equal(r.team.role,'player');assert.equal(r.team.members.length,1);assert.equal(r.team.members[0].user_id,ids.player);
    assert.deepEqual((await join('player',playerCode.code)).team,r.team);
    denied(await join('outsider',playerCode.code),'invalid_code');
  });
  await check('coach can see membership, not invitation secrets or owner controls',async()=>{
    const code=await invite('coach');assert.equal((await join('coach',code.code)).ok,true);
    assert.equal((await get('coach')).members.length,3);
    for(const action of ['invite','invites','role','remove','revoke','transfer'])denied(await rpc('coach',action,{team_id:team}),'owner_required');
  });
  await check('player cannot use a fresh coach invitation to promote themselves',async()=>{
    const code=await invite('coach');denied(await join('player',code.code),'already_member');
    assert.equal((await get('player')).role,'player');
    denied(await rpc('player','role',{team_id:team,user_id:ids.player,role:'coach',revision:(await get('player')).revision}),'owner_required');
  });
  await check('a stale revision cannot change membership or create another code',async()=>{
    const revision=(await get()).revision;await invite();
    denied(await rpc('owner','invite',{team_id:team,revision,role:'player'}),'changed');
    denied(await rpc('owner','remove',{team_id:team,revision,user_id:ids.player}),'changed');
  });
  await check('revoked, expired, malformed and unknown codes share one refusal',async()=>{
    const revoked=await invite(),expired=await invite();
    assert.equal((await mutate('revoke',{invite_id:revoked.id})).ok,true);
    await db.query("update public.gridlock_team_invites set expires_at=now()-interval '1 second' where id=$1",[expired.id]);
    for(const code of [revoked.code,expired.code,'bad','0'.repeat(32)])denied(await join('fresh',code),'invalid_code');
  });
  await check('failed code attempts are bounded and recover after the window',async()=>{
    await resetAttempts('fresh');for(let i=0;i<10;i++)denied(await join('fresh','bad'),'invalid_code');
    denied(await join('fresh','bad'),'try_later');
    await db.query("update public.gridlock_team_join_limits set started_at=now()-interval '61 seconds' where user_id=$1",[ids.fresh]);
    denied(await join('fresh','bad'),'invalid_code');
  });
  await check('owner promotion and demotion take effect on the next request',async()=>{
    assert.equal((await mutate('role',{user_id:ids.player,role:'coach'})).ok,true);assert.equal((await get('player')).members.length,3);
    assert.equal((await mutate('role',{user_id:ids.player,role:'player'})).ok,true);assert.equal((await get('player')).members.length,1);
    denied(await mutate('role',{user_id:ids.player,role:'owner'}),'invalid_request');
  });
  await check('removal immediately denies access and consumed code cannot rejoin',async()=>{
    assert.equal((await mutate('remove',{user_id:ids.player})).ok,true);
    denied(await rpc('player','get',{team_id:team}),'not_found');denied(await join('player',playerCode.code),'invalid_code');
    assert.deepEqual((await rpc('player','list')).teams,[]);
  });
  await check('new invitation is required after removal and cannot expose a Coach season',async()=>{
    const code=await invite();assert.equal((await join('player',code.code)).ok,true);
    const rows=(await as('coach','select * from public.seasons')).rows;assert.equal(rows.length,1);assert.equal(rows[0].owner,ids.coach);
    assert.equal((await as('player','select * from public.entitlements')).rows[0].plan,'free');
    assert.ok(!JSON.stringify(await get()).includes('payload'));assert.ok(!JSON.stringify(await get()).includes('email'));
  });
  await check('owner cannot leave, remove or demote self without transfer',async()=>{
    for(const [action,input] of [['leave',{}],['remove',{user_id:ids.owner}],['role',{user_id:ids.owner,role:'player'}]])denied(await mutate(action,input),'transfer_first');
  });
  await check('ownership transfer requires an existing active member and revokes outstanding codes',async()=>{
    denied(await mutate('transfer',{user_id:ids.outsider}),'not_found');
    await db.query('update auth.users set deleted_at=now() where id=$1',[ids.coach]);
    denied(await rpc('coach','get',{team_id:team}),'sign_in_required');
    denied(await mutate('transfer',{user_id:ids.coach}),'not_found');
    await db.query('update auth.users set deleted_at=null where id=$1',[ids.coach]);
    const pending=await invite();assert.equal((await mutate('transfer',{user_id:ids.coach})).ok,true);
    assert.equal((await get('coach')).role,'owner');assert.equal((await get('owner')).role,'coach');
    denied(await mutate('invite',{role:'player'}),'owner_required');
    await resetAttempts('fresh');denied(await join('fresh',pending.code),'invalid_code');
  });
  await check('leaving removes only own membership, then the next request is denied',async()=>{
    assert.equal((await mutate('leave',{},'owner')).ok,true);
    denied(await rpc('owner','get',{team_id:team}),'not_found');assert.equal((await get('coach')).members.length,2);
  });
  await check('disabling a pilot or the feature denies existing members immediately',async()=>{
    await db.query('delete from public.gridlock_team_pilot where user_id=$1',[ids.player]);denied(await rpc('player','get',{team_id:team}),'not_available');
    await db.exec('update public.gridlock_team_settings set enabled=false');denied(await rpc('coach','list'),'not_available');
    await db.exec('update public.gridlock_team_settings set enabled=true');
  });
  await check('Coach records, plans and RLS are unchanged',async()=>{
    assert.deepEqual((await db.query("select * from pg_policies where tablename in ('seasons','entitlements') order by tablename")).rows,policiesBefore);
    for(const [name,id] of Object.entries(ids)){
      assert.deepEqual((await db.query('select payload from public.seasons where owner=$1',[id])).rows[0].payload,{codes:{S1:'kept'},saved:name});
      assert.equal((await db.query('select plan from public.entitlements where user_id=$1',[id])).rows[0].plan,name==='owner'?'program':'free');
    }
  });
  await check('deleting a non-owner account removes membership without deleting its team',async()=>{
    await db.query('delete from auth.users where id=$1',[ids.player]);assert.equal((await get('coach')).members.length,1);
    denied(await rpc('player','list'),'sign_in_required');
  });
  await check('deleting an owner removes that team, never another account or season',async()=>{
    await db.query('delete from auth.users where id=$1',[ids.coach]);
    assert.equal((await db.query('select * from public.gridlock_teams where id=$1',[team])).rows.length,0);
    assert.equal((await db.query('select * from public.seasons where owner=$1',[ids.owner])).rows.length,1);
    assert.equal((await get('other',otherTeam)).role,'owner');
  });
  console.log(`\nTeam membership: ${passed}/${passed} passed`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.close());

-- Preparation only. Disabled and pilot allowlist empty until an approved rollout.
-- Never grants a paid plan, beta access, admin access or access to a Coach season.
begin;
create schema if not exists gridlock_team_private;
revoke all on schema gridlock_team_private from public, anon, authenticated;

create table public.gridlock_team_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.gridlock_team_settings(singleton,enabled) values (true,false);
create table public.gridlock_team_pilot (
  user_id uuid primary key references auth.users(id) on delete cascade,
  can_create boolean not null default false
);
create table public.gridlock_teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  request_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  unique(created_by,request_id)
);
create table public.gridlock_team_members (
  team_id uuid not null references public.gridlock_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('coach','player')),
  display_name text not null check (char_length(display_name) between 1 and 80),
  joined_at timestamptz not null default now(),
  primary key(team_id,user_id)
);
create index gridlock_team_members_user on public.gridlock_team_members(user_id,team_id);
create table public.gridlock_team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.gridlock_teams(id) on delete cascade,
  code_hash text not null unique,
  role text not null check (role in ('coach','player')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);
create index gridlock_team_invites_team on public.gridlock_team_invites(team_id);
create table public.gridlock_team_join_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  attempts integer not null
);

-- No browser table access, including via Supabase default grants. All access is
-- through the checked RPC below, under the authenticated caller's verified JWT.
alter table public.gridlock_team_settings enable row level security;
alter table public.gridlock_team_pilot enable row level security;
alter table public.gridlock_teams enable row level security;
alter table public.gridlock_team_members enable row level security;
alter table public.gridlock_team_invites enable row level security;
alter table public.gridlock_team_join_limits enable row level security;
revoke all on public.gridlock_team_settings, public.gridlock_team_pilot,
  public.gridlock_teams, public.gridlock_team_members, public.gridlock_team_invites,
  public.gridlock_team_join_limits from public, anon, authenticated;
grant all on public.gridlock_team_settings, public.gridlock_team_pilot,
  public.gridlock_teams, public.gridlock_team_members, public.gridlock_team_invites,
  public.gridlock_team_join_limits to service_role;

create function gridlock_team_private.snapshot(tid uuid, actor uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',t.id,'name',t.name,'revision',t.revision,
    'role',case when t.owner_id=actor then 'owner' else m.role end,
    'members',coalesce((select jsonb_agg(jsonb_build_object(
      'user_id',p.user_id,'name',p.display_name,
      'role',case when p.user_id=t.owner_id then 'owner' else p.role end)
      order by p.joined_at,p.user_id)
      from public.gridlock_team_members p where p.team_id=t.id
      and (t.owner_id=actor or m.role='coach' or p.user_id=actor)), '[]'::jsonb))
  from public.gridlock_teams t join public.gridlock_team_members m
    on m.team_id=t.id and m.user_id=actor where t.id=tid;
$$;
revoke all on function gridlock_team_private.snapshot(uuid,uuid) from public,anon,authenticated;

create function public.gridlock_team_action(action text, input jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid(); t public.gridlock_teams; inv public.gridlock_team_invites;
  tid uuid; target uuid; reqid uuid; role_name text; code text; digest text;
  display text; allowed text[]; changed boolean := false; attempt_count integer;
  result jsonb; expected bigint;
begin
  -- auth.uid comes from PostgREST's verified JWT, never an input/user-metadata id.
  if actor is null or not exists(select 1 from auth.users u where u.id=actor
    and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= now())) then
    return jsonb_build_object('ok',false,'code','sign_in_required');
  end if;
  if not exists(select 1 from public.gridlock_team_settings where singleton and enabled)
    or not exists(select 1 from public.gridlock_team_pilot where user_id=actor) then
    return jsonb_build_object('ok',false,'code','not_available');
  end if;
  allowed := case action
    when 'list' then array[]::text[]
    when 'create' then array['name','display_name','request_id']
    when 'join' then array['code','display_name']
    when 'get' then array['team_id']
    when 'invites' then array['team_id']
    when 'invite' then array['team_id','revision','role']
    when 'revoke' then array['team_id','revision','invite_id']
    when 'role' then array['team_id','revision','user_id','role']
    when 'remove' then array['team_id','revision','user_id']
    when 'leave' then array['team_id','revision']
    when 'transfer' then array['team_id','revision','user_id']
    else null end;
  if allowed is null or input is null or jsonb_typeof(input)<>'object'
    or octet_length(input::text)>4096 then
    return jsonb_build_object('ok',false,'code','invalid_request');
  end if;
  if exists(select 1 from jsonb_object_keys(input) k where not(k=any(allowed))) then
    return jsonb_build_object('ok',false,'code','invalid_request');
  end if;
  if action='list' then
    select coalesce(jsonb_agg(gridlock_team_private.snapshot(m.team_id,actor) order by m.joined_at,m.team_id),'[]'::jsonb)
      into result from public.gridlock_team_members m where m.user_id=actor;
    return jsonb_build_object('ok',true,'teams',result);
  end if;
  if action in ('create','join') then
    display := btrim(input->>'display_name');
    if jsonb_typeof(input->'display_name') is distinct from 'string'
      or char_length(display) not between 1 and 80 or display ~ '[[:cntrl:]]' then
      return jsonb_build_object('ok',false,'code','invalid_request');
    end if;
    -- Serialize creation/join limits per account, not across all teams.
    perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  end if;
  if action='create' then
    if not exists(select 1 from public.gridlock_team_pilot where user_id=actor and can_create) then
      return jsonb_build_object('ok',false,'code','owner_required');
    end if;
    if jsonb_typeof(input->'name') is distinct from 'string' or char_length(btrim(input->>'name')) not between 1 and 80
      or (input->>'name') ~ '[[:cntrl:]]' or coalesce(input->>'request_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return jsonb_build_object('ok',false,'code','invalid_request');
    end if;
    reqid := (input->>'request_id')::uuid;
    select * into t from public.gridlock_teams where created_by=actor and request_id=reqid;
    if found then
      result:=gridlock_team_private.snapshot(t.id,actor);
      if result is null then return jsonb_build_object('ok',false,'code','not_found'); end if;
      return jsonb_build_object('ok',true,'team',result);
    end if;
    if (select count(*) from public.gridlock_teams where owner_id=actor)>=20
      or (select count(*) from public.gridlock_team_members where user_id=actor)>=20 then
      return jsonb_build_object('ok',false,'code','limit_reached');
    end if;
    insert into public.gridlock_teams(owner_id,created_by,request_id,name)
      values(actor,actor,reqid,btrim(input->>'name')) returning * into t;
    insert into public.gridlock_team_members(team_id,user_id,role,display_name) values(t.id,actor,'coach',display);
    return jsonb_build_object('ok',true,'team',gridlock_team_private.snapshot(t.id,actor));
  end if;
  if action='join' then
    insert into public.gridlock_team_join_limits(user_id,started_at,attempts) values(actor,now(),1)
      on conflict(user_id) do update set
        attempts=case when public.gridlock_team_join_limits.started_at <= now()-interval '1 minute' then 1 else public.gridlock_team_join_limits.attempts+1 end,
        started_at=case when public.gridlock_team_join_limits.started_at <= now()-interval '1 minute' then now() else public.gridlock_team_join_limits.started_at end
      returning attempts into attempt_count;
    if attempt_count>10 then return jsonb_build_object('ok',false,'code','try_later'); end if;
    code:=upper(replace(btrim(input->>'code'),'-',''));
    if jsonb_typeof(input->'code') is distinct from 'string' or code !~ '^[0-9A-F]{32}$' then
      return jsonb_build_object('ok',false,'code','invalid_code');
    end if;
    digest:=encode(sha256(convert_to(code,'UTF8')),'hex');
    -- Discover the team without holding an invite lock; all team writes lock
    -- team first, then invitation, so a revoke/remove/transfer cannot race join.
    select team_id into tid from public.gridlock_team_invites where code_hash=digest;
    select * into t from public.gridlock_teams where id=tid for update;
    if not found then return jsonb_build_object('ok',false,'code','invalid_code'); end if;
    select * into inv from public.gridlock_team_invites where code_hash=digest for update;
    if not found or inv.revoked_at is not null or inv.expires_at<=now()
      or (inv.used_at is not null and inv.used_by is distinct from actor) then
      return jsonb_build_object('ok',false,'code','invalid_code');
    end if;
    if inv.used_at is not null then
      result:=gridlock_team_private.snapshot(t.id,actor);
      if result is null then return jsonb_build_object('ok',false,'code','invalid_code'); end if;
      return jsonb_build_object('ok',true,'team',result);
    end if;
    if exists(select 1 from public.gridlock_team_members where team_id=t.id and user_id=actor) then
      return jsonb_build_object('ok',false,'code','already_member');
    end if;
    if (select count(*) from public.gridlock_team_members where team_id=t.id)>=500
      or (select count(*) from public.gridlock_team_members where user_id=actor)>=20 then
      return jsonb_build_object('ok',false,'code','limit_reached');
    end if;
    insert into public.gridlock_team_members(team_id,user_id,role,display_name) values(t.id,actor,inv.role,display);
    update public.gridlock_team_invites set used_at=now(),used_by=actor where id=inv.id;
    update public.gridlock_teams set revision=revision+1 where id=t.id;
    return jsonb_build_object('ok',true,'team',gridlock_team_private.snapshot(t.id,actor));
  end if;
  if coalesce(input->>'team_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok',false,'code','invalid_request');
  end if;
  tid:=(input->>'team_id')::uuid;
  select * into t from public.gridlock_teams where id=tid for update;
  if not found or not exists(select 1 from public.gridlock_team_members where team_id=tid and user_id=actor) then
    return jsonb_build_object('ok',false,'code','not_found');
  end if;
  if action='get' then return jsonb_build_object('ok',true,'team',gridlock_team_private.snapshot(tid,actor)); end if;
  if action<>'leave' and t.owner_id<>actor then return jsonb_build_object('ok',false,'code','owner_required'); end if;
  if action='invites' then
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'role',role,'expires_at',expires_at,
      'revoked',revoked_at is not null,'used',used_at is not null) order by created_at desc),'[]'::jsonb)
      into result from (select * from public.gridlock_team_invites where team_id=tid order by created_at desc limit 100) i;
    return jsonb_build_object('ok',true,'invites',result);
  end if;
  if jsonb_typeof(input->'revision') is distinct from 'number' or coalesce(input->>'revision','') !~ '^[1-9][0-9]{0,15}$' then
    return jsonb_build_object('ok',false,'code','invalid_request');
  end if;
  expected:=(input->>'revision')::bigint;
  if expected<>t.revision then return jsonb_build_object('ok',false,'code','changed'); end if;
  if action='invite' then
    role_name:=input->>'role';
    if role_name is null or role_name not in ('coach','player') then return jsonb_build_object('ok',false,'code','invalid_request'); end if;
    if (select count(*) from public.gridlock_team_invites where team_id=tid and revoked_at is null and used_at is null and expires_at>now())>=50 then
      return jsonb_build_object('ok',false,'code','limit_reached');
    end if;
    code:=upper(replace(gen_random_uuid()::text,'-',''));
    insert into public.gridlock_team_invites(team_id,code_hash,role,created_by,expires_at)
      values(tid,encode(sha256(convert_to(code,'UTF8')),'hex'),role_name,actor,now()+interval '7 days') returning * into inv;
    update public.gridlock_teams set revision=revision+1 where id=tid;
    return jsonb_build_object('ok',true,'invite',jsonb_build_object('id',inv.id,'code',code,'role',role_name,'expires_at',inv.expires_at),'revision',t.revision+1);
  elsif action='revoke' then
    if coalesce(input->>'invite_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return jsonb_build_object('ok',false,'code','invalid_request'); end if;
    update public.gridlock_team_invites set revoked_at=now() where id=(input->>'invite_id')::uuid and team_id=tid and revoked_at is null;
    changed:=found;
  elsif action='leave' then
    if t.owner_id=actor then return jsonb_build_object('ok',false,'code','transfer_first'); end if;
    delete from public.gridlock_team_members where team_id=tid and user_id=actor;
    changed:=found;
  else
    if coalesce(input->>'user_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return jsonb_build_object('ok',false,'code','invalid_request'); end if;
    target:=(input->>'user_id')::uuid;
    if target=t.owner_id then return jsonb_build_object('ok',false,'code','transfer_first'); end if;
    if not exists(select 1 from public.gridlock_team_members where team_id=tid and user_id=target) then return jsonb_build_object('ok',false,'code','not_found'); end if;
    if action='remove' then
      delete from public.gridlock_team_members where team_id=tid and user_id=target; changed:=true;
    elsif action='role' then
      role_name:=input->>'role';
      if role_name is null or role_name not in ('coach','player') then return jsonb_build_object('ok',false,'code','invalid_request'); end if;
      update public.gridlock_team_members set role=role_name where team_id=tid and user_id=target and role<>role_name; changed:=found;
    elsif action='transfer' then
      if not exists(select 1 from public.gridlock_team_pilot p join auth.users u on u.id=p.user_id where p.user_id=target and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())) then
        return jsonb_build_object('ok',false,'code','not_found');
      end if;
      update public.gridlock_team_members set role='coach' where team_id=tid and user_id=target;
      update public.gridlock_teams set owner_id=target where id=tid;
      update public.gridlock_team_invites set revoked_at=now() where team_id=tid and used_at is null and revoked_at is null;
      changed:=true;
    end if;
  end if;
  if changed then update public.gridlock_teams set revision=revision+1 where id=tid; end if;
  return jsonb_build_object('ok',true,'revision',t.revision+case when changed then 1 else 0 end);
end $$;
revoke all on function public.gridlock_team_action(text,jsonb) from public,anon;
grant execute on function public.gridlock_team_action(text,jsonb) to authenticated;
commit;

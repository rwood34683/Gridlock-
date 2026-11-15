-- Staged rollout: install only after testing, enable only after all clients and
-- privileged handlers use the gate. No role (including admin/beta) is exempt.
begin;
create schema gridlock_security_private;
revoke all on schema gridlock_security_private from public,anon,authenticated;
create table public.gridlock_security_settings (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into public.gridlock_security_settings values(true,false);
create table public.gridlock_device_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check(char_length(label) between 1 and 60),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index gridlock_device_sessions_user on public.gridlock_device_sessions(user_id);
alter table public.gridlock_security_settings enable row level security;
alter table public.gridlock_device_sessions enable row level security;
revoke all on public.gridlock_security_settings,public.gridlock_device_sessions from public,anon,authenticated;
grant all on public.gridlock_security_settings,public.gridlock_device_sessions to service_role;

create function gridlock_security_private.verified(actor uuid, sid uuid, assurance text)
returns boolean language sql stable security definer set search_path='' as $$
  select assurance='aal2' and exists(
    select 1 from auth.sessions s join auth.users u on u.id=s.user_id
    join auth.mfa_factors f on f.id=s.factor_id and f.user_id=u.id
    where s.id=sid and u.id=actor and f.status='verified'
      and u.email_confirmed_at is not null and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=now())
      and (s.not_after is null or s.not_after>now())
  );
$$;
create function gridlock_security_private.allowed(actor uuid,sid uuid,assurance text)
returns boolean language sql stable security definer set search_path='' as $$
  select case when (select not enabled from public.gridlock_security_settings where singleton) then true
    else coalesce(gridlock_security_private.verified(actor,sid,assurance),false)
      and exists(select 1 from public.gridlock_device_sessions d
        where d.user_id=actor and d.session_id=sid and d.revoked_at is null) end;
$$;
create function public.gridlock_session_allowed()
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(gridlock_security_private.allowed(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,auth.jwt()->>'aal'),false);
$$;
-- Privileged Edge handlers pass only claims verified by Auth. Browsers cannot
-- call this overload or supply an identity to the ordinary account RPC.
create function public.gridlock_service_session_allowed(actor uuid,sid uuid,assurance text)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(gridlock_security_private.allowed(actor,sid,assurance),false);
$$;
revoke all on function gridlock_security_private.verified(uuid,uuid,text),
  gridlock_security_private.allowed(uuid,uuid,text),public.gridlock_session_allowed(),
  public.gridlock_service_session_allowed(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.gridlock_session_allowed() to authenticated;
grant execute on function public.gridlock_service_session_allowed(uuid,uuid,text) to service_role;

create function public.gridlock_security_action(action text default 'status', input jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
  target uuid; label_text text; devices jsonb; approved boolean; enabled boolean;
begin
  if actor is null or sid is null or not exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
    where u.id=actor and s.id=sid and u.email_confirmed_at is not null and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=now()) and (s.not_after is null or s.not_after>now())) then
    return jsonb_build_object('ok',false,'code','sign_in_required');
  end if;
  select s.enabled into enabled from public.gridlock_security_settings s where singleton;
  if enabled is null then raise insufficient_privilege using message='Security policy unavailable'; end if;
  if not enabled then return jsonb_build_object('ok',true,'required',false); end if;
  if not coalesce(gridlock_security_private.verified(actor,sid,auth.jwt()->>'aal'),false) then
    return jsonb_build_object('ok',false,'required',true,'code','mfa_required');
  end if;
  if action not in ('status','claim','devices','revoke') or jsonb_typeof(input) is distinct from 'object'
    or octet_length(input::text)>1024 then return jsonb_build_object('ok',false,'code','invalid_request'); end if;
  -- Every mutation serializes on the account, including first registration.
  -- No expired token/session can free a slot and then re-register itself.
  perform pg_advisory_xact_lock(hashtextextended('security:'||actor::text,0));
  if exists(select 1 from public.gridlock_device_sessions where session_id=sid and revoked_at is not null) then
    return jsonb_build_object('ok',false,'code','device_revoked');
  end if;
  update public.gridlock_device_sessions d set revoked_at=now()
    where d.user_id=actor and d.revoked_at is null and not exists(select 1 from auth.sessions s
      where s.id=d.session_id and s.user_id=actor and (s.not_after is null or s.not_after>now()));
  select exists(select 1 from public.gridlock_device_sessions where user_id=actor and session_id=sid and revoked_at is null) into approved;
  if action='claim' and not approved then
    if input-ARRAY['label','replace']::text[] <> '{}'::jsonb then return jsonb_build_object('ok',false,'code','invalid_request'); end if;
    label_text:=btrim(input->>'label');
    if label_text is null or char_length(label_text) not between 1 and 60 then return jsonb_build_object('ok',false,'code','invalid_request'); end if;
    if input ? 'replace' then
      begin target:=(input->>'replace')::uuid; exception when invalid_text_representation then return jsonb_build_object('ok',false,'code','invalid_request'); end;
      if target is null or target=sid or not exists(select 1 from public.gridlock_device_sessions where user_id=actor and session_id=target and revoked_at is null) then
        return jsonb_build_object('ok',false,'code','device_changed');
      end if;
      update public.gridlock_device_sessions set revoked_at=now() where user_id=actor and session_id=target;
    elsif (select count(*) from public.gridlock_device_sessions where user_id=actor and revoked_at is null)>=3 then
      action:='devices';
    end if;
    if action='claim' then
      insert into public.gridlock_device_sessions(session_id,user_id,label) values(sid,actor,label_text);
      approved:=true;
    end if;
  elsif action='revoke' then
    if not approved then return jsonb_build_object('ok',false,'code','device_required'); end if;
    if input-ARRAY['session_id']::text[] <> '{}'::jsonb then return jsonb_build_object('ok',false,'code','invalid_request'); end if;
    begin target:=(input->>'session_id')::uuid; exception when invalid_text_representation then return jsonb_build_object('ok',false,'code','invalid_request'); end;
    if not exists(select 1 from public.gridlock_device_sessions where user_id=actor and session_id=target and revoked_at is null) then
      return jsonb_build_object('ok',false,'code','device_changed');
    end if;
    update public.gridlock_device_sessions set revoked_at=now() where user_id=actor and session_id=target;
    approved:=target<>sid;
  end if;
  if approved then update public.gridlock_device_sessions set last_seen_at=now() where session_id=sid and last_seen_at<now()-interval '5 minutes'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',session_id,'label',label,'current',session_id=sid,
    'created_at',created_at,'last_seen_at',last_seen_at) order by created_at),'[]'::jsonb) into devices
    from public.gridlock_device_sessions where user_id=actor and revoked_at is null;
  return jsonb_build_object('ok',approved,'required',true,'code',case when approved then 'approved' else 'device_required' end,
    'user_id',actor,'session_id',sid,'limit',3,'devices',devices);
end $$;
revoke all on function public.gridlock_security_action(text,jsonb) from public,anon;
grant execute on function public.gridlock_security_action(text,jsonb) to authenticated;

-- Restrictive policies AND the existing owner/beta policies, never replace them.
create policy gridlock_security_seasons on public.seasons as restrictive for all to authenticated
  using(public.gridlock_session_allowed()) with check(public.gridlock_session_allowed());
create policy gridlock_security_entitlements on public.entitlements as restrictive for all to authenticated
  using(public.gridlock_session_allowed()) with check(public.gridlock_session_allowed());

-- Security-definer RPCs bypass RLS; move the originals to an unexposed schema,
-- revoke every browser grant, and publish checked wrappers with the same ABI.
alter function public.gridlock_write_season(bigint,text,jsonb,boolean) set schema gridlock_security_private;
revoke all on function gridlock_security_private.gridlock_write_season(bigint,text,jsonb,boolean) from public,anon,authenticated;
create function public.gridlock_write_season(expected_revision bigint,season_label text,season_payload jsonb,remove_season boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not public.gridlock_session_allowed() then raise insufficient_privilege using message='Verify two-factor sign-in and approve this device'; end if;
  return gridlock_security_private.gridlock_write_season(expected_revision,season_label,season_payload,remove_season);
end $$;
revoke all on function public.gridlock_write_season(bigint,text,jsonb,boolean) from public,anon;
grant execute on function public.gridlock_write_season(bigint,text,jsonb,boolean) to authenticated;
alter function public.gridlock_team_action(text,jsonb) set schema gridlock_security_private;
revoke all on function gridlock_security_private.gridlock_team_action(text,jsonb) from public,anon,authenticated;
create function public.gridlock_team_action(action text,input jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not public.gridlock_session_allowed() then return jsonb_build_object('ok',false,'code','security_required'); end if;
  return gridlock_security_private.gridlock_team_action(action,input);
end $$;
revoke all on function public.gridlock_team_action(text,jsonb) from public,anon;
grant execute on function public.gridlock_team_action(text,jsonb) to authenticated;
commit;

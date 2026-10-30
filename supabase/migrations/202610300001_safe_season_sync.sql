-- Coach staging only. Preserve existing data. Do not apply to the older Codex schema.
begin;
alter table public.seasons add column if not exists revision bigint not null default 1;
alter table public.seasons add column if not exists deleted_at timestamptz;
alter table public.seasons alter column payload drop not null;
-- Reject future direct writes, including from old app builds. All client writes
-- must take the same lock and carry an expected revision through the RPC below.
revoke insert,update,delete on public.seasons from authenticated;
drop policy if exists seasons_own_insert on public.seasons;
drop policy if exists seasons_own_update on public.seasons;
drop policy if exists seasons_own_delete on public.seasons;

create or replace function public.gridlock_write_season(expected_revision bigint, season_label text, season_payload jsonb, remove_season boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  existing public.seasons%rowtype;
  next_revision bigint;
begin
  if caller is null then raise insufficient_privilege using message = 'Sign in first'; end if;
  if expected_revision is null or expected_revision < 0 or expected_revision > 9007199254740990 then
    raise invalid_parameter_value using message = 'Invalid season revision';
  end if;
  if remove_season is null then raise invalid_parameter_value using message = 'Choose an operation'; end if;
  if not remove_season and (season_payload is null or jsonb_typeof(season_payload) <> 'object'
    or season_payload->>'format' is distinct from 'gridlock.coach.copy'
    or jsonb_typeof(season_payload->'data') is distinct from 'object'
    or octet_length(season_payload::text) > 2097152
    or season_label is null or length(season_label) > 60) then
    raise invalid_parameter_value using message = 'Use a Gridlock season copy under 2 MB';
  end if;
  -- Serializes absent-row creation as well as updates/deletes for this owner.
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  select * into existing from public.seasons where owner = caller for update;
  if coalesce(existing.revision,0) <> expected_revision then
    return jsonb_build_object('ok',false,'conflict',true,'revision',coalesce(existing.revision,0),'removed',existing.deleted_at is not null);
  end if;
  next_revision := expected_revision + 1;
  insert into public.seasons(owner,label,payload,updated_at,revision,deleted_at)
  values(caller,case when remove_season then null else season_label end,
    case when remove_season then null else season_payload end,clock_timestamp(),next_revision,
    case when remove_season then clock_timestamp() else null end)
  on conflict(owner) do update set label=excluded.label,payload=excluded.payload,
    updated_at=excluded.updated_at,revision=excluded.revision,deleted_at=excluded.deleted_at;
  return jsonb_build_object('ok',true,'revision',next_revision,'removed',remove_season);
end $$;
revoke all on function public.gridlock_write_season(bigint,text,jsonb,boolean) from public,anon;
grant execute on function public.gridlock_write_season(bigint,text,jsonb,boolean) to authenticated;

create table if not exists public.gridlock_admin_audit(
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  target_user_id uuid,
  plan text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.gridlock_admin_audit enable row level security;
revoke all on public.gridlock_admin_audit from anon,authenticated;
grant select,insert on public.gridlock_admin_audit to service_role;
grant usage,select on sequence public.gridlock_admin_audit_id_seq to service_role;
create or replace function public.gridlock_admin_set_entitlement(actor uuid,target uuid,new_plan text,new_expiry timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.entitlements%rowtype;
begin
  if actor is null or target is null or new_plan is null or new_plan not in ('free','team','program')
    or (new_expiry is not null and (new_plan = 'free' or new_expiry <= now())) then
    raise invalid_parameter_value using message = 'Invalid account grant';
  end if;
  if not exists(select 1 from auth.users where id=actor) then raise insufficient_privilege; end if;
  insert into public.entitlements(user_id,plan,expires_at,source,updated_at)
  values(target,new_plan,new_expiry,'admin:'||actor::text,now())
  on conflict(user_id) do update set plan=excluded.plan,expires_at=excluded.expires_at,source=excluded.source,updated_at=excluded.updated_at
  returning * into saved;
  insert into public.gridlock_admin_audit(actor_user_id,target_user_id,plan,expires_at) values(actor,target,new_plan,new_expiry);
  return to_jsonb(saved);
end $$;
revoke all on function public.gridlock_admin_set_entitlement(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.gridlock_admin_set_entitlement(uuid,uuid,text,timestamptz) to service_role;
create or replace function public.gridlock_anonymize_admin_audit()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.gridlock_admin_audit set
    actor_user_id=case when actor_user_id=old.id then null else actor_user_id end,
    target_user_id=case when target_user_id=old.id then null else target_user_id end
  where actor_user_id=old.id or target_user_id=old.id;
  return old;
end $$;
revoke all on function public.gridlock_anonymize_admin_audit() from public,anon,authenticated;
drop trigger if exists gridlock_account_audit_cleanup on auth.users;
create trigger gridlock_account_audit_cleanup before delete on auth.users
for each row execute function public.gridlock_anonymize_admin_audit();
commit;

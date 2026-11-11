-- Prepared migration, NOT a launch switch. Both checkout modes and public
-- signup start disabled. Existing beta/admin grants are never overwritten.
begin;
create schema if not exists gridlock_private;
revoke all on schema gridlock_private from public, anon, authenticated;
grant usage on schema gridlock_private to service_role, supabase_auth_admin;
create table if not exists gridlock_private.beta_testers (
  email text primary key, enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table gridlock_private.beta_testers enable row level security;
revoke all on gridlock_private.beta_testers from public, anon, authenticated;
grant all on gridlock_private.beta_testers to service_role;
drop policy if exists payment_auth_beta on gridlock_private.beta_testers;
create policy payment_auth_beta on gridlock_private.beta_testers
  for select to supabase_auth_admin using(true);
create table gridlock_private.payment_settings (
  singleton boolean primary key default true check (singleton),
  public_signup_enabled boolean not null default false,
  test_checkout_enabled boolean not null default false,
  live_checkout_enabled boolean not null default false
);
insert into gridlock_private.payment_settings(singleton) values(true);
create table gridlock_private.payment_orders (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete set null,
  live boolean not null,
  state text not null default 'creating'
    check (state in ('creating','open','processing','paid','expired','failed')),
  checkout_id text unique,
  payment_intent text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz,
  amount integer not null default 1997 check (amount = 1997),
  currency text not null default 'usd' check (currency = 'usd'),
  refunded boolean not null default false,
  disputed boolean not null default false,
  refund_due text check (refund_due in ('duplicate','account-deleted','access-not-delivered')),
  check ((paid_at is null) = (expires_at is null))
);
create unique index payment_one_pending on gridlock_private.payment_orders(owner, live)
  where state in ('creating','open','processing') and owner is not null;
create index payment_owner on gridlock_private.payment_orders(owner, live, expires_at);
create table gridlock_private.payment_events (
  id text primary key,
  live boolean not null,
  kind text not null,
  order_id uuid references gridlock_private.payment_orders(id),
  received_at timestamptz not null default now()
);
alter table gridlock_private.payment_settings enable row level security;
alter table gridlock_private.payment_orders enable row level security;
alter table gridlock_private.payment_events enable row level security;
revoke all on gridlock_private.payment_settings, gridlock_private.payment_orders,
  gridlock_private.payment_events from public, anon, authenticated, supabase_auth_admin;
grant all on gridlock_private.payment_settings, gridlock_private.payment_orders,
  gridlock_private.payment_events to service_role;
grant select on gridlock_private.payment_settings, gridlock_private.beta_testers to supabase_auth_admin;
create policy payment_auth_config on gridlock_private.payment_settings
  for select to supabase_auth_admin using(true);

-- Only server code can supply an owner to this function. Browser access is
-- through a verified JWT at the Edge Function, never a user id in a request.
create function public.gridlock_payment_access(p_owner uuid, p_live boolean)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare legacy public.entitlements%rowtype; paid gridlock_private.payment_orders%rowtype;
begin
  if p_live is null then raise invalid_parameter_value; end if;
  if not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null) then
    return jsonb_build_object('plan','free','source','none');
  end if;
  if exists(select 1 from auth.users u join gridlock_private.beta_testers b
    on b.email=lower(btrim(u.email)) and b.enabled where u.id=p_owner) then
    return jsonb_build_object('plan','program','source','beta','expires_at',null);
  end if;
  select * into legacy from public.entitlements where user_id=p_owner;
  if legacy.plan in ('team','program') and (legacy.expires_at is null or legacy.expires_at>now()) then
    return jsonb_build_object('plan','program','source','existing','expires_at',legacy.expires_at);
  end if;
  select * into paid from gridlock_private.payment_orders where owner=p_owner and live=p_live
    and state='paid' and not refunded and not disputed and refund_due is null
    and expires_at>now() order by expires_at desc limit 1;
  if found then
    return jsonb_build_object('plan','program','source','day-pass','expires_at',paid.expires_at);
  end if;
  return jsonb_build_object('plan','free','source','none','expires_at',null);
end $$;

create function public.gridlock_reserve_checkout(p_owner uuid, p_live boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare access jsonb; pending gridlock_private.payment_orders%rowtype; settings gridlock_private.payment_settings%rowtype;
begin
  if not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null) then
    raise insufficient_privilege using message='Confirm your email first';
  end if;
  select * into settings from gridlock_private.payment_settings where singleton;
  if not (case when p_live then settings.live_checkout_enabled else settings.test_checkout_enabled end) then
    raise insufficient_privilege using message='Checkout is not open';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 1997));
  access:=public.gridlock_payment_access(p_owner,p_live);
  if access->>'plan'='program' then return jsonb_build_object('access',access); end if;
  select * into pending from gridlock_private.payment_orders where owner=p_owner and live=p_live
    and state in ('creating','open','processing') for update;
  if not found then
    insert into gridlock_private.payment_orders(owner,live) values(p_owner,p_live) returning * into pending;
  end if;
  return to_jsonb(pending);
end $$;

create function public.gridlock_attach_checkout(p_order uuid, p_session text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_session is null or p_session !~ '^cs_(test_|live_)?[A-Za-z0-9]+$' then raise invalid_parameter_value; end if;
  update gridlock_private.payment_orders set checkout_id=p_session,
    state=case when state='creating' then 'open' else state end
    where id=p_order and (checkout_id is null or checkout_id=p_session);
  if not found then raise invalid_parameter_value using message='Checkout does not match'; end if;
end $$;

-- A single transaction binds payment, event and access. Replaying either
-- Checkout or PaymentIntent notifications cannot move a pass's expiry.
create function public.gridlock_apply_payment_event(
  p_id text, p_kind text, p_live boolean, p_order uuid, p_owner uuid,
  p_intent text, p_paid_at timestamptz default null,
  p_refunded boolean default false, p_disputed boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare item gridlock_private.payment_orders%rowtype; day_end timestamptz; reason text;
begin
  if p_id is null or p_id !~ '^evt_[A-Za-z0-9]+$' or p_live is null or p_owner is null
    or p_kind is null or p_kind not in ('paid','refund','dispute','expired','failed','processing')
    or p_refunded is null or p_disputed is null then raise invalid_parameter_value; end if;
  select * into item from gridlock_private.payment_orders where id=p_order;
  if not found or item.live<>p_live or (item.owner is not null and item.owner<>p_owner) then
    raise invalid_parameter_value using message='Payment does not match';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(item.owner,p_owner)::text,1997));
  select * into item from gridlock_private.payment_orders where id=p_order for update;
  if item.payment_intent is not null and p_intent<>item.payment_intent then
    raise invalid_parameter_value using message='Payment does not match';
  end if;
  if p_intent is null or p_intent !~ '^pi_[A-Za-z0-9]+$' then raise invalid_parameter_value; end if;
  if exists(select 1 from gridlock_private.payment_events where id=p_id) then
    if not exists(select 1 from gridlock_private.payment_events
      where id=p_id and order_id=p_order and live=p_live and kind=p_kind) then
      raise invalid_parameter_value using message='Event does not match'; end if;
    -- A retried event retrieves the payment's current charge at Stripe. Its
    -- newer refund/dispute state may arrive before the dedicated event.
    update gridlock_private.payment_orders set refunded=refunded or p_refunded,
      disputed=disputed or p_disputed where id=p_order returning * into item;
    return jsonb_build_object('refund_due',item.refund_due,'refunded',item.refunded);
  end if;
  if p_kind='paid' and item.paid_at is null then
    if p_paid_at is null or p_paid_at>now()+interval '5 minutes' then raise invalid_parameter_value; end if;
    -- PostgreSQL's IANA timezone rules, not the server timezone or +24 hours.
    day_end:=((p_paid_at at time zone 'America/New_York')::date+1)::timestamp
      at time zone 'America/New_York';
    if item.owner is null then reason:='account-deleted';
    elsif day_end<=now() then reason:='access-not-delivered';
    elsif exists(select 1 from gridlock_private.payment_orders o where o.id<>p_order
      and o.owner=item.owner and o.live=p_live and o.state='paid' and not o.refunded
      and not o.disputed and o.refund_due is null
      and (o.paid_at at time zone 'America/New_York')::date=(p_paid_at at time zone 'America/New_York')::date)
      then reason:='duplicate';
    end if;
    update gridlock_private.payment_orders set payment_intent=p_intent, state='paid',
      paid_at=p_paid_at, expires_at=day_end, refund_due=reason,
      refunded=refunded or p_refunded, disputed=disputed or p_disputed where id=p_order;
  elsif p_kind in ('refund','dispute') then
    update gridlock_private.payment_orders set payment_intent=p_intent,
      refunded=refunded or p_refunded, disputed=disputed or p_disputed where id=p_order;
  elsif p_kind in ('expired','failed') then
    update gridlock_private.payment_orders set state=p_kind
      where id=p_order and state in ('creating','open','processing') and paid_at is null;
  elsif p_kind='processing' then
    update gridlock_private.payment_orders set payment_intent=p_intent,state='processing'
      where id=p_order and state in ('creating','open') and paid_at is null;
  end if;
  update gridlock_private.payment_orders set refunded=refunded or p_refunded,
    disputed=disputed or p_disputed where id=p_order;
  insert into gridlock_private.payment_events(id,live,kind,order_id) values(p_id,p_live,p_kind,p_order);
  select * into item from gridlock_private.payment_orders where id=p_order;
  return jsonb_build_object('refund_due',item.refund_due,'refunded',item.refunded);
end $$;

-- Checkout expiry can precede creation of a PaymentIntent.
create function public.gridlock_expire_checkout(p_order uuid,p_session text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update gridlock_private.payment_orders set state='expired'
    where id=p_order and checkout_id=p_session and state in ('creating','open') and paid_at is null;
end $$;

revoke all on function public.gridlock_payment_access(uuid,boolean),
 public.gridlock_reserve_checkout(uuid,boolean), public.gridlock_attach_checkout(uuid,text),
 public.gridlock_expire_checkout(uuid,text),
 public.gridlock_apply_payment_event(text,text,boolean,uuid,uuid,text,timestamptz,boolean,boolean)
 from public, anon, authenticated, supabase_auth_admin;
grant execute on function public.gridlock_payment_access(uuid,boolean),
 public.gridlock_reserve_checkout(uuid,boolean), public.gridlock_attach_checkout(uuid,text),
 public.gridlock_expire_checkout(uuid,text),
 public.gridlock_apply_payment_event(text,text,boolean,uuid,uuid,text,timestamptz,boolean,boolean)
 to service_role;

-- The same installed hooks remain closed until the separate launch switch.
-- Unconfirmed users cannot obtain account-data access.
create or replace function public.gridlock_beta_before_user_created(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if exists(select 1 from gridlock_private.payment_settings where singleton and public_signup_enabled)
     and coalesce(event->'user'->>'email','')<>'' then return '{}'::jsonb; end if;
  if exists(select 1 from gridlock_private.beta_testers b where b.enabled
     and b.email=lower(btrim(event->'user'->>'email'))) then return '{}'::jsonb; end if;
  return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Account signup is not open yet.'));
end $$;
create or replace function public.gridlock_beta_access_token(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if jsonb_typeof(event->'claims')='object' and exists(
    select 1 from auth.users u where u.id::text=event->>'user_id' and u.email_confirmed_at is not null
    and (exists(select 1 from gridlock_private.payment_settings where singleton and public_signup_enabled)
      or exists(select 1 from gridlock_private.beta_testers b where b.enabled and b.email=lower(btrim(u.email))))
  ) then return event; end if;
  return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Confirm your account email before signing in.'));
end $$;
revoke all on function public.gridlock_beta_before_user_created(jsonb),
 public.gridlock_beta_access_token(jsonb) from public, anon, authenticated;
grant execute on function public.gridlock_beta_before_user_created(jsonb),
 public.gridlock_beta_access_token(jsonb) to supabase_auth_admin;

create function public.gridlock_confirmed_account()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
$$;
create function public.gridlock_coach_authorized()
returns boolean language sql stable security definer set search_path = '' as $$
 select public.gridlock_confirmed_account() and (
   public.gridlock_payment_access(auth.uid(),true)->>'plan'='program'
   -- Test receipts never grant live account-server write access.
 )
$$;
revoke all on function public.gridlock_confirmed_account(),public.gridlock_coach_authorized() from public,anon;
grant execute on function public.gridlock_confirmed_account(),public.gridlock_coach_authorized() to authenticated;
-- Keep original owner-only policies; these are additional restrictive checks.
drop policy if exists seasons_beta_read on public.seasons;
create policy seasons_beta_read on public.seasons as restrictive for select to authenticated
 using ((select public.gridlock_confirmed_account()));
drop policy if exists entitlements_beta_read on public.entitlements;
create policy entitlements_beta_read on public.entitlements as restrictive for select to authenticated
 using ((select public.gridlock_confirmed_account()));

create or replace function public.gridlock_write_season(expected_revision bigint, season_label text,
 season_payload jsonb, remove_season boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid:=auth.uid(); existing public.seasons%rowtype; next_revision bigint;
begin
  if caller is null or not public.gridlock_confirmed_account() then
    raise insufficient_privilege using message='Sign in first'; end if;
  -- Removal and review stay available after expiration. Uploads require access.
  if not remove_season and not public.gridlock_coach_authorized() then
    raise insufficient_privilege using message='An active Coach pass is needed to send a season'; end if;
  if expected_revision is null or expected_revision<0 or expected_revision>9007199254740990 then
    raise invalid_parameter_value using message='Invalid season revision'; end if;
  if remove_season is null then raise invalid_parameter_value using message='Choose an operation'; end if;
  if not remove_season and (season_payload is null or jsonb_typeof(season_payload)<>'object'
    or season_payload->>'format' is distinct from 'gridlock.coach.copy'
    or jsonb_typeof(season_payload->'data') is distinct from 'object'
    or octet_length(season_payload::text)>2097152 or season_label is null or length(season_label)>60) then
    raise invalid_parameter_value using message='Use a Gridlock season copy under 2 MB'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text,0));
  select * into existing from public.seasons where owner=caller for update;
  if coalesce(existing.revision,0)<>expected_revision then
    return jsonb_build_object('ok',false,'conflict',true,'revision',coalesce(existing.revision,0),
      'removed',existing.deleted_at is not null); end if;
  next_revision:=expected_revision+1;
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
commit;

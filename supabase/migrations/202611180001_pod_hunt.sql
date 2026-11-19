-- Prepared only. No open campaign is seeded and no account access is awarded.
-- A campaign's answer keys stay server-side. Public/authenticated roles cannot
-- read these tables or call the adjudicator. The edge function verifies Auth.
create table public.pod_hunt_rounds (
  id text primary key,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  prize text not null default '',
  rules text not null default '',
  stages jsonb not null default '[]'::jsonb check (jsonb_typeof(stages)='array'),
  check (status <> 'open' or (starts_at is not null and ends_at is not null and ends_at > starts_at
    and length(btrim(prize)) between 1 and 500 and length(btrim(rules)) between 1 and 4000
    and jsonb_array_length(stages)=4))
);
create unique index pod_hunt_one_open on public.pod_hunt_rounds ((status)) where status='open';
create table public.pod_hunt_entries (
  round_id text not null references public.pod_hunt_rounds(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  step integer not null default 0 check (step between 0 and 4),
  window_at timestamptz not null default now(),
  attempts integer not null default 0 check(attempts>=0),
  primary key (round_id,user_id)
);
create table public.pod_hunt_winners (
  round_id text primary key references public.pod_hunt_rounds(id),
  user_id uuid references auth.users(id) on delete set null,
  team text not null check(length(btrim(team)) between 1 and 80),
  receipt uuid not null default gen_random_uuid() unique,
  claimed_at timestamptz not null default now()
);
-- Deleting the winner's account removes its account link; it NEVER reopens the round.
alter table public.pod_hunt_rounds enable row level security;
alter table public.pod_hunt_entries enable row level security;
alter table public.pod_hunt_winners enable row level security;
revoke all on public.pod_hunt_rounds,public.pod_hunt_entries,public.pod_hunt_winners from public,anon,authenticated;
grant all on public.pod_hunt_rounds,public.pod_hunt_entries,public.pod_hunt_winners to service_role;

create function public.gridlock_hunt_request(p_user uuid,p_action text,p_round text default null,p_stage integer default null,
  p_choice integer default null,p_code text default null,p_team text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  r public.pod_hunt_rounds%rowtype;
  e public.pod_hunt_entries%rowtype;
  w public.pod_hunt_winners%rowtype;
  s jsonb; pieces jsonb; secret text; note text:=''; stamp timestamptz:=clock_timestamp();
begin
  if p_user is null or not exists(select 1 from auth.users where id=p_user)
    or p_action is null or p_action not in ('status','answer','claim') then
    return jsonb_build_object('ok',false,'said','Sign in online first.');
  end if;
  -- Every answer and claim takes this same lock. Two accounts cannot both win.
  select * into r from public.pod_hunt_rounds where status='open' for update;
  if not found then return jsonb_build_object('ok',true,'state','inactive'); end if;
  if p_action<>'status' and p_round is distinct from r.id then
    return jsonb_build_object('ok',false,'said','The round changed. Close the hunt and check the prize round again.');
  end if;
  -- Take the time after the lock wait, not at the start of a queued request.
  stamp:=clock_timestamp();
  if r.starts_at is null or r.ends_at is null or stamp<r.starts_at or stamp>=r.ends_at then return jsonb_build_object('ok',true,'state','inactive');end if;
  -- Invalid private setup fails closed, without leaking answers or a partial claim.
  for s in select value from jsonb_array_elements(r.stages) loop
    if jsonb_typeof(s)<>'object' or jsonb_typeof(s->'title') is distinct from 'string'
      or jsonb_typeof(s->'clue') is distinct from 'string' or jsonb_typeof(s->'piece') is distinct from 'string'
      or (s->>'piece')!~'^[A-Z0-9]{1,20}$' or jsonb_typeof(s->'options') is distinct from 'array'
      or jsonb_array_length(s->'options')<>3 or (s->>'answer') is null or (s->>'answer')!~'^[0-2]$'
      or exists(select 1 from jsonb_array_elements(s->'options') where jsonb_typeof(value)<>'string') then
      return jsonb_build_object('ok',true,'state','inactive');
    end if;
  end loop;
  select * into w from public.pod_hunt_winners where round_id=r.id;
  if found then
    if w.user_id is distinct from p_user then return jsonb_build_object('ok',true,'state','claimed');end if;
    select jsonb_agg(value->>'piece' order by ord) into pieces from jsonb_array_elements(r.stages) with ordinality as t(value,ord);
    return jsonb_build_object('ok',true,'state','winner','round',r.id,'step',4,'pieces',pieces,'prize',r.prize,'rules',r.rules,'receipt',w.receipt);
  end if;
  insert into public.pod_hunt_entries(round_id,user_id) values(r.id,p_user) on conflict do nothing;
  select * into e from public.pod_hunt_entries where round_id=r.id and user_id=p_user for update;
  if p_action<>'status' then
    if stamp>=e.window_at+interval '1 minute' then e.attempts:=0;e.window_at:=stamp;end if;
    if e.attempts>=8 then return jsonb_build_object('ok',false,'said','Too many tries. Wait a minute, then try again.');end if;
    e.attempts:=e.attempts+1;
    update public.pod_hunt_entries set attempts=e.attempts,window_at=e.window_at where round_id=r.id and user_id=p_user;
    if p_action='answer' then
      if p_stage is null or p_choice is null or p_stage<>e.step or e.step>=4 then
        note:='That clue has changed. Use the clue shown here.';
      elsif p_choice=(r.stages->e.step->>'answer')::integer then
        e.step:=e.step+1;
        update public.pod_hunt_entries set step=e.step where round_id=r.id and user_id=p_user;
        note:='Code piece found.';
      else note:='Not that one. Check the clue and try again.';end if;
    else
      select string_agg(value->>'piece','' order by ord) into secret from jsonb_array_elements(r.stages) with ordinality as t(value,ord);
      if e.step<>4 then note:='Find all four code pieces first.';
      elsif p_team is null or length(btrim(p_team)) not between 1 and 80 or p_team~'[[:cntrl:]]' then note:='Enter your team name.';
      elsif p_code is null or length(p_code)>80 or upper(regexp_replace(p_code,'[^a-zA-Z0-9]','','g'))<>secret then note:='Join the four pieces in order. Try again.';
      else
        insert into public.pod_hunt_winners(round_id,user_id,team) values(r.id,p_user,btrim(p_team)) returning * into w;
      end if;
    end if;
  end if;
  select coalesce(jsonb_agg(value->>'piece' order by ord),'[]'::jsonb) into pieces
    from jsonb_array_elements(r.stages) with ordinality as t(value,ord) where ord<=e.step;
  return jsonb_build_object('ok',true,'state',case when w.receipt is not null then 'winner' else 'open' end,
    'round',r.id,'step',e.step,'pieces',pieces,'stage',case when e.step<4 then jsonb_build_object(
      'title',r.stages->e.step->'title','clue',r.stages->e.step->'clue','options',r.stages->e.step->'options') else null end,
    'prize',r.prize,'rules',r.rules,'said',note,'receipt',w.receipt);
end;
$$;
revoke all on function public.gridlock_hunt_request(uuid,text,text,integer,integer,text,text) from public,anon,authenticated;
grant execute on function public.gridlock_hunt_request(uuid,text,text,integer,integer,text,text) to service_role;

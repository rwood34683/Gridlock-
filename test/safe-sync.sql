-- Disposable test identities and all schema/data changes run inside a rollback.
insert into auth.users(id) values
('89e23f1a-a71c-4d6c-b55f-1c1c00000001'),('89e23f1a-a71c-4d6c-b55f-1c1c00000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','89e23f1a-a71c-4d6c-b55f-1c1c00000001',true);
do $$
declare r jsonb; p jsonb := '{"format":"gridlock.coach.copy","data":{"matches":[{"id":"a"},{"id":"b"}]}}';
begin
  r:=public.gridlock_write_season(0,'Phone',p,false);
  if not (r->>'ok')::boolean or (r->>'revision')::int<>1 then raise exception 'FAIL initial write'; end if;
  r:=public.gridlock_write_season(0,'Old tablet','{"format":"gridlock.coach.copy","data":{"matches":[]}}',false);
  if r->>'conflict'<>'true' then raise exception 'FAIL stale second-device write';end if;
  if jsonb_array_length((select payload->'data'->'matches' from public.seasons))<>2 then raise exception 'FAIL data overwritten';end if;
  r:=public.gridlock_write_season(1,null,null,true);
  if r->>'removed'<>'true' or (r->>'revision')::int<>2 then raise exception 'FAIL deletion marker';end if;
  r:=public.gridlock_write_season(1,'Delayed phone',p,false);
  if r->>'conflict'<>'true' then raise exception 'FAIL delayed upload recreated deletion';end if;
  if exists(select 1 from public.seasons where payload is not null or deleted_at is null) then raise exception 'FAIL deleted payload retained';end if;
  r:=public.gridlock_write_season(2,'Explicit renewed sharing',p,false);
  if r->>'ok'<>'true' or (r->>'revision')::int<>3 then raise exception 'FAIL explicit resume';end if;
  begin
    perform public.gridlock_write_season(3,'Bad','{"data":{}}',false);
    raise exception 'FAIL missing format accepted';
  exception when invalid_parameter_value then null;end;
  begin
    perform public.gridlock_write_season(3,'Oversized',jsonb_build_object('format','gridlock.coach.copy','data',jsonb_build_object('large',repeat('x',2097153))),false);
    raise exception 'FAIL oversized payload accepted';
  exception when invalid_parameter_value then null;end;
  begin
    perform public.gridlock_write_season(null,'Bad',p,false);raise exception 'FAIL null revision';
  exception when invalid_parameter_value then null;end;
  begin
    delete from public.seasons;raise exception 'FAIL old client direct delete';
  exception when insufficient_privilege then null;end;
  begin
    insert into public.seasons(owner,payload) values(auth.uid(),p);raise exception 'FAIL old client direct upload';
  exception when insufficient_privilege then null;end;
  begin
    perform public.gridlock_admin_set_entitlement(auth.uid(),auth.uid(),'program',null);raise exception 'FAIL client self-upgrade';
  exception when insufficient_privilege then null;end;
  begin
    perform 1 from public.gridlock_admin_audit;raise exception 'FAIL client audit access';
  exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','89e23f1a-a71c-4d6c-b55f-1c1c00000002',true);
do $$begin
  if exists(select 1 from public.seasons) then raise exception 'FAIL cross-owner read';end if;
  if (public.gridlock_write_season(0,'Other owner','{"format":"gridlock.coach.copy","data":{}}',false)->>'ok')<>'true' then raise exception 'FAIL second owner';end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin
  begin
    perform public.gridlock_write_season(0,'Anonymous','{"format":"gridlock.coach.copy","data":{}}',false);raise exception 'FAIL anon RPC';
  exception when insufficient_privilege then null;end;
end $$;
set local role service_role;
select public.gridlock_admin_set_entitlement('89e23f1a-a71c-4d6c-b55f-1c1c00000001','89e23f1a-a71c-4d6c-b55f-1c1c00000002','program',null);
reset role;
do $$begin
  if not exists(select 1 from public.gridlock_admin_audit where actor_user_id='89e23f1a-a71c-4d6c-b55f-1c1c00000001' and target_user_id='89e23f1a-a71c-4d6c-b55f-1c1c00000002' and plan='program') then raise exception 'FAIL durable plan audit';end if;
  delete from auth.users where id='89e23f1a-a71c-4d6c-b55f-1c1c00000001';
  if exists(select 1 from public.seasons where owner='89e23f1a-a71c-4d6c-b55f-1c1c00000001') then raise exception 'FAIL account deletion cascade';end if;
  if exists(select 1 from public.gridlock_admin_audit where actor_user_id='89e23f1a-a71c-4d6c-b55f-1c1c00000001') then raise exception 'FAIL audit anonymization';end if;
end $$;
-- The caller wraps this file and the migration in BEGIN/ROLLBACK.

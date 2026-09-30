-- The master admin's test college (fake staff and a fake learner for trying every app). Not a real college.
-- nisia-admin's test_college and test_invite actions make it and its accounts; the portal leaves it out of the
-- real colleges' list and totals.
alter table public.organisations add column if not exists is_test boolean not null default false;
drop function if exists public.nisia_admin_colleges();
create function public.nisia_admin_colleges()
 returns table(id uuid, name text, status text, seats integer, seats_used integer, staff integer, learners integer, contact_name text, contact_email text, licence_ends date, created_at timestamptz, is_test boolean)
 language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not private.is_platform_admin() then raise exception 'Not allowed'; end if;
  return query
    select o.id, o.name, o.status, o.seats, private.seats_used(o.id),
      (select count(*)::int from public.organisation_members om where om.organisation_id = o.id and om.active and not exists (select 1 from public.learners l where l.organisation_member_id = om.id)),
      (select count(*)::int from public.learners l where l.organisation_id = o.id),
      o.contact_name, o.contact_email, o.licence_ends, o.created_at, o.is_test
    from public.organisations o order by o.is_test, o.name;
end $function$;
revoke all on function public.nisia_admin_colleges() from public, anon;
grant execute on function public.nisia_admin_colleges() to authenticated;

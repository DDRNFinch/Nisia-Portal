-- A tutor's Symi saves a new class and asks for it back (insert ... returning), as signed-in Nisia users do.
\set ON_ERROR_STOP 1
grant usage on schema public, private, auth, extensions to authenticated;
grant select, insert, update, delete on public.classes, public.class_learners, public.class_sessions, public.class_attendance to authenticated;
grant select on all tables in schema public to authenticated;
grant execute on all functions in schema private, auth, public to authenticated;
insert into public.organisations values ('00000000-0000-0000-0000-0000000000b1', 'RLS College');
insert into public.organisation_members (id, organisation_id, user_id) values ('20000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b2');
insert into public.organisation_member_roles select '20000000-0000-0000-0000-0000000000b2', id from public.roles where code = 'tutor';
select set_config('test.uid', '10000000-0000-0000-0000-0000000000b2', false), set_config('test.aal', 'aal2', false);
set role authenticated;
insert into public.classes (organisation_id, tutor_member_id, client_ref, title) values ('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b2', 'r1', 'New class')
  on conflict (tutor_member_id, client_ref) do update set title = excluded.title returning id;
\echo NEW CLASS SAVED AND RETURNED

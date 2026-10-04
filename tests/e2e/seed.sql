-- A college with a tutor (Tee Rainer), a learner (Lee Erna, Bricklayer) and their employer (Em Ployer).
insert into public.organisations (id, name) values ('0e2e0000-0000-0000-0000-000000000001', 'E2E College');
insert into auth.users values ('0e2e0000-0000-0000-0000-0000000000a1', 'tee@e2e.test'), ('0e2e0000-0000-0000-0000-0000000000a2', 'lee@e2e.test'), ('0e2e0000-0000-0000-0000-0000000000a3', 'em@e2e.test');
insert into public.profiles (id, display_name) values ('0e2e0000-0000-0000-0000-0000000000a1', 'Tee Rainer'), ('0e2e0000-0000-0000-0000-0000000000a2', 'Lee Erna'), ('0e2e0000-0000-0000-0000-0000000000a3', 'Em Ployer');
insert into public.organisation_members (id, organisation_id, user_id) values
  ('0e2e0000-0000-0000-0000-0000000000b1', '0e2e0000-0000-0000-0000-000000000001', '0e2e0000-0000-0000-0000-0000000000a1'),
  ('0e2e0000-0000-0000-0000-0000000000b2', '0e2e0000-0000-0000-0000-000000000001', '0e2e0000-0000-0000-0000-0000000000a2'),
  ('0e2e0000-0000-0000-0000-0000000000b3', '0e2e0000-0000-0000-0000-000000000001', '0e2e0000-0000-0000-0000-0000000000a3');
insert into public.organisation_member_roles select '0e2e0000-0000-0000-0000-0000000000b1', id from public.roles where code = 'tutor';
insert into public.organisation_member_roles select '0e2e0000-0000-0000-0000-0000000000b2', id from public.roles where code = 'learner';
insert into public.organisation_member_roles select '0e2e0000-0000-0000-0000-0000000000b3', id from public.roles where code = 'employer';
insert into public.learners (id, organisation_id, organisation_member_id) values ('0e2e0000-0000-0000-0000-0000000000c1', '0e2e0000-0000-0000-0000-000000000001', '0e2e0000-0000-0000-0000-0000000000b2');
insert into public.learner_access (organisation_id, learner_id, organisation_member_id) values
  ('0e2e0000-0000-0000-0000-000000000001', '0e2e0000-0000-0000-0000-0000000000c1', '0e2e0000-0000-0000-0000-0000000000b1'),
  ('0e2e0000-0000-0000-0000-000000000001', '0e2e0000-0000-0000-0000-0000000000c1', '0e2e0000-0000-0000-0000-0000000000b3');
insert into public.courses (id, code, title, source_id) values ('0e2e0000-0000-0000-0000-0000000000d1', 'ST0095', 'Bricklayer', 'bricklayer');
insert into public.enrolments (id, organisation_id, learner_id, course_id, start_date, end_date, employer_name, planned_otj_hours) values
  ('0e2e0000-0000-0000-0000-0000000000e1', '0e2e0000-0000-0000-0000-000000000001', '0e2e0000-0000-0000-0000-0000000000c1', '0e2e0000-0000-0000-0000-0000000000d1', current_date - 200, current_date + 400, 'Ployer Builders', 400);

-- The live project's trigger: a new witness testimony tells the learner, their assessor and tutor.
drop trigger if exists notify_on_witness_created on public.witness_testimonies;
create trigger notify_on_witness_created after insert on public.witness_testimonies for each row execute function private.on_witness_created();

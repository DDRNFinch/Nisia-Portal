-- Earlier attendance (attendance-earlier.sql), after registers-test.sql: a learner's totals from the college's old
-- forms, plus the registers finished since, as one percentage in hours. Any failed check stops the run.
\set ON_ERROR_STOP 1
\set org '''00000000-0000-0000-0000-00000000000a'''
\set tutor '''10000000-0000-0000-0000-000000000002'''
\set assessor '''10000000-0000-0000-0000-000000000003'''
\set employer '''10000000-0000-0000-0000-000000000004'''
\set admin '''10000000-0000-0000-0000-000000000001'''
\set e_amy '''40000000-0000-0000-0000-000000000005'''
\set e_ben '''40000000-0000-0000-0000-000000000006'''
\set e_cal '''40000000-0000-0000-0000-000000000007'''
create or replace function pg_temp.ok(p boolean, p_what text) returns void language plpgsql as $$
begin if p is not true then raise exception 'FAILED: %', p_what; end if; raise notice 'ok  %', p_what; end $$;
create or replace function pg_temp.as_user(p uuid, p_aal text default 'aal2') returns void language plpgsql as $$
begin perform set_config('test.uid', coalesce(p::text, ''), false); perform set_config('test.aal', p_aal, false); end $$;
create or replace function pg_temp.fails(p_sql text, p_like text) returns boolean language plpgsql as $$
begin execute p_sql; return false; exception when others then return sqlerrm like p_like; end $$;

-- A second class for Amy and Ben, with three-hour sessions: one before Amy's earlier figures end, two after.
insert into public.classes (id, organisation_id, tutor_member_id, client_ref, title) values
  ('50000000-0000-0000-0000-0000000000e1', :org, '20000000-0000-0000-0000-000000000002', 'earlier-test', 'L2 Brickwork (Tue)');
insert into public.class_learners select '50000000-0000-0000-0000-0000000000e1', e, :org from (values (:e_amy::uuid), (:e_ben::uuid)) x(e);
insert into public.class_sessions (id, organisation_id, class_id, session_date, starts_at, ends_at, status) values
  ('60000000-0000-0000-0000-0000000000e1', :org, '50000000-0000-0000-0000-0000000000e1', '2026-09-20', '2026-09-20 09:00+01', '2026-09-20 12:00+01', 'finished'),
  ('60000000-0000-0000-0000-0000000000e2', :org, '50000000-0000-0000-0000-0000000000e1', '2026-10-10', '2026-10-10 09:00+01', '2026-10-10 12:00+01', 'finished'),
  ('60000000-0000-0000-0000-0000000000e3', :org, '50000000-0000-0000-0000-0000000000e1', '2026-10-12', '2026-10-12 09:00+01', '2026-10-12 12:00+01', 'finished');
insert into public.class_attendance (organisation_id, session_id, enrolment_id, status, minutes, confirmed_at) values
  (:org, '60000000-0000-0000-0000-0000000000e1', :e_amy, 'present', null, now()), (:org, '60000000-0000-0000-0000-0000000000e1', :e_ben, 'present', null, now()),
  (:org, '60000000-0000-0000-0000-0000000000e2', :e_amy, 'present', null, now()), (:org, '60000000-0000-0000-0000-0000000000e2', :e_ben, 'absent', 0, now()),
  (:org, '60000000-0000-0000-0000-0000000000e3', :e_amy, 'absent', 0, now()), (:org, '60000000-0000-0000-0000-0000000000e3', :e_ben, 'present', 120, now());

-- Before anything is typed in: the whole course is the registers alone, in hours.
select pg_temp.as_user(:admin);
select pg_temp.ok((select pct from public.nisia_attendance_whole(:org) where enrolment_id = :e_ben) = 56, 'no earlier figures: Ben is 5 of his 9 hours, 56%');
select pg_temp.ok((select earlier_up_to is null and since_sessions = 3 from public.nisia_attendance_whole(:org) where enrolment_id = :e_amy), 'Amy has no earlier figures yet, 3 registers');

-- Amy's assessor types in her earlier figures from the old forms: 90 of 100 hours up to 30 September.
select pg_temp.as_user(:assessor);
select public.nisia_set_attendance_baseline(:e_amy, '2026-09-30', 90, 100, 'From the old Aptem register');
select pg_temp.as_user(:admin);
select pg_temp.ok((select earlier_up_to = '2026-09-30' and earlier_attended_minutes = 5400 and earlier_expected_minutes = 6000 and earlier_note = 'From the old Aptem register'
  from public.nisia_attendance_whole(:org) where enrolment_id = :e_amy), 'Amy''s earlier figures are kept, in minutes, with the note');
select pg_temp.ok((select since_sessions = 2 and since_attended_minutes = 180 and since_expected_minutes = 360 from public.nisia_attendance_whole(:org) where enrolment_id = :e_amy),
  'the register from before 30 September isn''t counted twice: only the two since');
select pg_temp.ok((select pct from public.nisia_attendance_whole(:org) where enrolment_id = :e_amy) = 88, 'Amy''s whole course: (90 + 3) of (100 + 6) hours, 88%');
select pg_temp.ok((select below_target from public.nisia_attendance_whole(:org) where enrolment_id = :e_amy), 'below the college''s 90% target');
-- Changed, then removed.
select pg_temp.as_user(:tutor);
select public.nisia_set_attendance_baseline(:e_amy, '2026-09-30', 100, 100, null);
select pg_temp.ok((select pct from public.nisia_attendance_whole(:org) where enrolment_id = :e_amy) = 97, 'changed to 100 of 100: (100 + 3) of 106, 97%');
select public.nisia_set_attendance_baseline(:e_amy, null, null, null, null);
select pg_temp.ok((select earlier_up_to is null from public.nisia_attendance_whole(:org) where enrolment_id = :e_amy), 'removed: no earlier figures');

-- Mistakes are explained; people who aren't the learner's staff can't.
select pg_temp.ok(pg_temp.fails($$select public.nisia_set_attendance_baseline('40000000-0000-0000-0000-000000000005', '2026-09-30', 120, 100)$$, '%between 0 and the hours expected%'), 'more hours attended than expected is refused');
select pg_temp.ok(pg_temp.fails($$select public.nisia_set_attendance_baseline('40000000-0000-0000-0000-000000000005', current_date + 5, 10, 100)$$, '%future%'), 'a date in the future is refused');
select pg_temp.as_user(:assessor);
select pg_temp.ok(pg_temp.fails($$select public.nisia_set_attendance_baseline('40000000-0000-0000-0000-000000000006', '2026-09-30', 10, 100)$$, '%Only the learner%'), 'the assessor can''t for Ben, who isn''t theirs');
select pg_temp.as_user(:employer);
select pg_temp.ok(pg_temp.fails($$select public.nisia_set_attendance_baseline('40000000-0000-0000-0000-000000000005', '2026-09-30', 10, 100)$$, '%Only the learner%'), 'an employer can''t');
select pg_temp.ok(pg_temp.fails($$select * from public.nisia_attendance_whole('00000000-0000-0000-0000-00000000000a')$$, '%Not allowed%'), 'nor see the whole-course report');
select pg_temp.as_user(:assessor);
select pg_temp.ok((select count(*) from public.nisia_attendance_whole(:org)) = 2, 'the assessor sees only their own learners (Amy and Cal)');

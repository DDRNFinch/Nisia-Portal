-- Registers, end to end, on the stand-in database. Any failed check stops the run with what went wrong.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
create or replace function pg_temp.ok(p boolean, p_what text) returns void language plpgsql as $$
begin if p is not true then raise exception 'FAILED: %', p_what; end if; raise notice 'ok  %', p_what; end $$;
create or replace function pg_temp.as_user(p uuid, p_aal text default 'aal2') returns void language plpgsql as $$
begin perform set_config('test.uid', coalesce(p::text, ''), false); perform set_config('test.aal', p_aal, false); end $$;
create or replace function pg_temp.live_code(p_session uuid, p_at timestamptz default now()) returns text language sql as $$
  select 'NISI:IN:1:' || p_session || ':' || floor(extract(epoch from p_at) / 20)::bigint || ':' ||
    private.checkin_sig((select secret from private.class_session_keys where session_id = p_session), p_session, floor(extract(epoch from p_at) / 20)::bigint) $$;
create or replace function pg_temp.short_code(p_session uuid, p_at timestamptz default now()) returns text language sql as $$
  select private.checkin_short(private.checkin_sig((select secret from private.class_session_keys where session_id = p_session), p_session, floor(extract(epoch from p_at) / 20)::bigint)) $$;
create or replace function pg_temp.notes(p_type text) returns text language sql as $$
  select coalesce(string_agg(p.display_name, ',' order by p.display_name), '') from public.notifications n join public.profiles p on p.id = n.recipient_user_id where n.notification_type = p_type $$;
set client_min_messages = notice;

-- A college: admin, tutor, assessor, employer, three learners.
insert into public.organisations values ('00000000-0000-0000-0000-00000000000a', 'Test College');
insert into public.profiles values ('10000000-0000-0000-0000-000000000001','Admin'),('10000000-0000-0000-0000-000000000002','Tutor'),('10000000-0000-0000-0000-000000000003','Assessor'),
  ('10000000-0000-0000-0000-000000000004','Employer'),('10000000-0000-0000-0000-000000000005','Amy'),('10000000-0000-0000-0000-000000000006','Ben'),('10000000-0000-0000-0000-000000000007','Cal');
insert into public.organisation_members (id, organisation_id, user_id)
  select ('20000000-0000-0000-0000-00000000000' || i)::uuid, '00000000-0000-0000-0000-00000000000a', ('10000000-0000-0000-0000-00000000000' || i)::uuid from generate_series(1,7) i;
insert into public.organisation_member_roles select ('20000000-0000-0000-0000-00000000000' || x.i)::uuid, r.id from (values (1,'admin'),(2,'tutor'),(3,'assessor'),(4,'employer'),(5,'learner'),(6,'learner'),(7,'learner')) x(i,c) join public.roles r on r.code = x.c;
insert into public.learners select ('30000000-0000-0000-0000-00000000000' || i)::uuid, '00000000-0000-0000-0000-00000000000a', ('20000000-0000-0000-0000-00000000000' || i)::uuid from generate_series(5,7) i;
insert into public.enrolments (id, organisation_id, learner_id, employer_name) select ('40000000-0000-0000-0000-00000000000' || i)::uuid, '00000000-0000-0000-0000-00000000000a', ('30000000-0000-0000-0000-00000000000' || i)::uuid, 'Build Co' from generate_series(5,7) i;
-- The tutor works with all three; the assessor and employer with Amy and Cal.
insert into public.learner_access select '00000000-0000-0000-0000-00000000000a', ('30000000-0000-0000-0000-00000000000' || l)::uuid, ('20000000-0000-0000-0000-00000000000' || m)::uuid
  from (values (5,2),(6,2),(7,2),(5,3),(7,3),(5,4),(7,4)) x(l,m);
insert into public.classes (id, organisation_id, tutor_member_id, client_ref, title) values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000002', 'c1', 'Brickwork L2');
insert into public.class_learners select '50000000-0000-0000-0000-000000000001', ('40000000-0000-0000-0000-00000000000' || i)::uuid, '00000000-0000-0000-0000-00000000000a' from generate_series(5,7) i;
\set org '''00000000-0000-0000-0000-00000000000a'''
\set amy '''10000000-0000-0000-0000-000000000005'''
\set ben '''10000000-0000-0000-0000-000000000006'''
\set cal '''10000000-0000-0000-0000-000000000007'''
\set tutor '''10000000-0000-0000-0000-000000000002'''
\set employer '''10000000-0000-0000-0000-000000000004'''
\set admin '''10000000-0000-0000-0000-000000000001'''
\set e_amy '''40000000-0000-0000-0000-000000000005'''
\set e_ben '''40000000-0000-0000-0000-000000000006'''
\set e_cal '''40000000-0000-0000-0000-000000000007'''

-- ---- College settings ----
select pg_temp.ok((private.att_settings(:org)).late_minutes = 10, 'no settings yet: late after 10 minutes');
insert into public.attendance_settings (organisation_id, late_minutes, target_pct, alert_after) values (:org, 15, 90, 2);
select pg_temp.ok((private.att_settings(:org)).late_minutes = 15, 'college sets late after 15 minutes');

-- ---- Today's class started 20 minutes ago; the tutor's Symi gets the key ----
insert into public.class_sessions (id, organisation_id, class_id, session_date, starts_at) values
  ('60000000-0000-0000-0000-000000000001', :org, '50000000-0000-0000-0000-000000000001', (now() at time zone 'Europe/London')::date, now() - interval '20 minutes');
select pg_temp.as_user(:tutor);
select pg_temp.ok(length(public.symi_session_key('60000000-0000-0000-0000-000000000001')) > 20, 'tutor gets the session key');
select pg_temp.as_user(:tutor, 'aal1');
do $$ begin perform public.symi_session_key('60000000-0000-0000-0000-000000000001'); raise exception 'FAILED: key without authenticator'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  no key without the authenticator app'; end $$;

-- ---- Ben books a day off as ill, from Evia ----
select pg_temp.as_user(:ben, 'aal1');
select pg_temp.ok((public.nisia_book_absence((now() at time zone 'Europe/London')::date, (now() at time zone 'Europe/London')::date, 'ill', null)->>'reason') = 'Ill', 'Ben books today off: ill');
select pg_temp.ok(pg_temp.notes('absence_booked') = 'Ben', 'Ben is told it''s booked');
select pg_temp.ok(pg_temp.notes('absence_booked_staff') = 'Tutor', 'his tutor is told (he has no assessor or employer)');
do $$ begin perform public.nisia_book_absence(current_date, current_date, 'other', '  '); raise exception 'FAILED: other with no words'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  "other" needs words: %', sqlerrm; end $$;
select pg_temp.as_user(:amy, 'aal1');
do $$ begin perform public.nisia_book_absence(current_date, current_date, 'ill', null, '40000000-0000-0000-0000-000000000006'); raise exception 'FAILED: Amy booked for Ben'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  a learner can''t book for someone else'; end $$;

-- ---- Cal's employer books him a work day next week (Paros) ----
delete from public.notifications;
select pg_temp.as_user(:employer);
select public.nisia_book_absence(current_date + 7, current_date + 8, 'work', 'Needed on site at Kings Road', :e_cal);
select pg_temp.ok((select booked_by_role from public.absences where enrolment_id = :e_cal) = 'employer', 'employer books Cal a work absence');
select pg_temp.ok(pg_temp.notes('absence_booked_staff') = 'Assessor,Employer,Tutor', 'Cal''s tutor, assessor and employer all hear about it');
select pg_temp.as_user(:tutor);
select pg_temp.ok((select count(*) from public.symi_absences(current_date, current_date + 14)) = 2, 'Symi sees both booked absences for its learners');
select pg_temp.ok((select reason from public.symi_absences(current_date, current_date + 14) where enrolment_id = :e_cal) = 'Needed on site at Kings Road', 'with the reason in their own words');

-- ---- Checking in ----
select pg_temp.as_user(:amy, 'aal1');
select pg_temp.ok((public.nisia_check_in(pg_temp.live_code('60000000-0000-0000-0000-000000000001'))->>'late')::boolean, 'Amy scans 20 minutes in: late (college says 15)');
update public.attendance_settings set late_minutes = 30 where organisation_id = :org;
select pg_temp.ok(not (public.nisia_check_in(pg_temp.live_code('60000000-0000-0000-0000-000000000001'))->>'again' is null), 'scanning again is fine');
select pg_temp.ok((select late from public.class_attendance where enrolment_id = :e_amy), 'scanning again keeps the first time');
delete from public.class_attendance;
select pg_temp.ok(not (public.nisia_check_in(pg_temp.short_code('60000000-0000-0000-0000-000000000001'))->>'late')::boolean, 'typed code, late after 30: on time');
do $$ begin perform public.nisia_check_in(pg_temp.live_code('60000000-0000-0000-0000-000000000001', now() - interval '2 minutes')); raise exception 'FAILED: old code accepted'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  a 2-minute-old code is turned down live: %', sqlerrm; end $$;
do $$ begin perform public.nisia_check_in('NISI:IN:1:60000000-0000-0000-0000-000000000001:' || floor(extract(epoch from now()) / 20)::bigint || ':madeup'); raise exception 'FAILED: forged code accepted'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  a made-up code is turned down'; end $$;

-- ---- No signal: Cal scanned 4 minutes ago, Evia sends it now ----
select pg_temp.as_user(:cal, 'aal1');
select pg_temp.ok((public.nisia_check_in(pg_temp.live_code('60000000-0000-0000-0000-000000000001', now() - interval '4 minutes'), now() - interval '4 minutes')->>'offline')::boolean, 'Cal''s saved scan is accepted, marked offline');
select pg_temp.ok((select abs(extract(epoch from checked_in_at - (now() - interval '4 minutes'))) < 21 from public.class_attendance where enrolment_id = :e_cal), 'and recorded at the time he scanned, not now');
do $$ begin perform public.nisia_check_in(pg_temp.live_code('60000000-0000-0000-0000-000000000001', now() - interval '20 minutes'), now() - interval '4 minutes'); raise exception 'FAILED: wrong time'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  a saved code that doesn''t match its scan time is turned down'; end $$;
do $$ begin perform public.nisia_check_in('ABC123', now() - interval '4 days'); raise exception 'FAILED: too old'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  a scan over 3 days old is turned down: %', sqlerrm; end $$;

-- ---- Ben's row on the register takes his reason ----
select pg_temp.as_user(:tutor);
insert into public.class_attendance (organisation_id, session_id, enrolment_id) values (:org, '60000000-0000-0000-0000-000000000001', :e_ben);
select pg_temp.ok((select reason from public.class_attendance where enrolment_id = :e_ben) = 'Ill', 'Ben shows on the register as Ill, not missing');

-- ---- Evia: the learner's sessions this week ----
select pg_temp.as_user(:ben, 'aal1');
select pg_temp.ok((select reason from public.nisia_my_sessions() limit 1) = 'Ill', 'Ben''s Evia knows today is booked off');
select pg_temp.as_user(:amy, 'aal1');
select pg_temp.ok((select checked_in_at is not null from public.nisia_my_sessions() limit 1), 'Amy''s Evia knows she''s checked in');

-- ---- Tutor finishes: Amy present, Ben absent (ill), Cal absent with no reason (he left) ----
select pg_temp.as_user(:tutor);
delete from public.notifications;
update public.class_attendance set status = case when enrolment_id = :e_amy then 'present' else 'absent' end,
  minutes = case when enrolment_id = :e_amy then 180 else 0 end, confirmed_at = now(), confirmed_by_member_id = '20000000-0000-0000-0000-000000000002';
update public.class_sessions set status = 'finished', finished_at = now();
select pg_temp.ok((select hours from public.otj_entries) = 3, 'Amy''s 3 hours go into her learning hours');
select pg_temp.ok((select reason from public.class_attendance where enrolment_id = :e_cal) is null, 'Cal: absent, no reason');
select pg_temp.ok(pg_temp.notes('absent_no_reason') = 'Cal', 'Cal is told the same day');
select pg_temp.ok(pg_temp.notes('absent_no_reason_staff') = 'Assessor,Employer,Tutor', 'so are his tutor, assessor and employer');
select pg_temp.ok(pg_temp.notes('absent_no_reason_staff') not like '%Ben%' and (select count(*) from public.notifications where body like 'Ben%') = 0, 'nobody is alarmed about Ben: he had a reason');
select pg_temp.ok(pg_temp.notes('absent_streak') = '', 'one missed session: no alarm yet');

-- ---- Ben's offline scan still counts after the register closed ----
select pg_temp.as_user(:ben, 'aal1');
select pg_temp.ok((public.nisia_check_in(pg_temp.live_code('60000000-0000-0000-0000-000000000001', now() - interval '1 minute' * 15), now() - interval '15 minutes')->>'finished')::boolean, 'an offline scan reaches a finished register (and says so)');
select pg_temp.ok(pg_temp.notes('late_check_in') = 'Tutor', 'the tutor is told it arrived after the register');
select pg_temp.as_user(:tutor);
update public.class_attendance set status = 'present', minutes = 150 where enrolment_id = :e_ben;
select pg_temp.ok((select reason is null and status = 'present' from public.class_attendance where enrolment_id = :e_ben), 'the tutor marks Ben present; the reason goes');
select pg_temp.ok((select after->>'status' from public.attendance_changes) = 'present', 'the change to a finished register is kept');

-- ---- Next session: Cal misses again, no reason: the college's admins hear ----
insert into public.class_sessions (id, organisation_id, class_id, session_date, starts_at, status) values
  ('60000000-0000-0000-0000-000000000002', :org, '50000000-0000-0000-0000-000000000001', (now() at time zone 'Europe/London')::date - 1, now() - interval '1 day', 'finished');
insert into public.class_attendance (organisation_id, session_id, enrolment_id, status, minutes, confirmed_at) values
  (:org, '60000000-0000-0000-0000-000000000002', :e_cal, 'absent', 0, now()),
  (:org, '60000000-0000-0000-0000-000000000002', :e_amy, 'present', 180, now()),
  (:org, '60000000-0000-0000-0000-000000000002', :e_ben, 'absent', 0, now());
select pg_temp.ok(pg_temp.notes('absent_streak') = 'Admin', 'two in a row with no reason: the admin is told');
select pg_temp.ok(pg_temp.notes('absent_streak_staff') = 'Assessor,Tutor', 'and Cal''s tutor and assessor');
select pg_temp.ok(pg_temp.notes('absent_streak_staff') not like '%Employer%', 'the employer only gets the absence, not the college''s concern');

-- ---- Ben says why, after ----
select pg_temp.as_user(:ben, 'aal1');
select public.nisia_book_absence((now() at time zone 'Europe/London')::date - 1, (now() at time zone 'Europe/London')::date - 1, 'appointment', 'Dentist');
select pg_temp.ok((select reason from public.class_attendance where enrolment_id = :e_ben and session_id = '60000000-0000-0000-0000-000000000002') = 'Dentist', 'a reason given afterwards goes onto the finished register');

-- ---- The report ----
select pg_temp.as_user(:admin);
select pg_temp.ok((select pct from public.nisia_attendance_report(:org, current_date - 30, current_date + 1) where name = 'Amy') = 100, 'report: Amy 100%');
select pg_temp.ok((select (sessions, present, with_reason, no_reason, pct, below_target, run) = (2, 0, 0, 2, 0, true, 2) from public.nisia_attendance_report(:org, current_date - 30, current_date + 1) where name = 'Cal'), 'report: Cal 0%, below target, 2 in a row');
select pg_temp.ok((select (present, with_reason, pct, run) = (1, 1, 50, 0) from public.nisia_attendance_report(:org, current_date - 30, current_date + 1) where name = 'Ben'), 'report: Ben 50% with one reason, no run');
select pg_temp.ok((select name from public.nisia_attendance_report(:org, current_date - 30, current_date + 1) limit 1) in ('Ben', 'Cal'), 'below-target learners come first');
select pg_temp.as_user(:amy, 'aal1');
do $$ begin perform * from public.nisia_attendance_report('00000000-0000-0000-0000-00000000000a', current_date - 30, current_date); raise exception 'FAILED: learner saw the report'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  learners can''t see the report'; end $$;
select pg_temp.as_user(:tutor);
select pg_temp.ok((select count(*) from public.nisia_attendance_report(:org, current_date - 30, current_date + 1)) = 3, 'the tutor sees their learners');

-- ---- Paros, Evia history, cancelling ----
select pg_temp.as_user(:employer);
select pg_temp.ok(jsonb_array_length(public.paros_absences(:e_cal)->'marks') = 2 and jsonb_array_length(public.paros_absences(:e_cal)->'absences') = 1, 'Paros: Cal''s marks and booked work days');
do $$ begin perform public.paros_absences('40000000-0000-0000-0000-000000000006'); raise exception 'FAILED: employer saw Ben'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  the employer can''t see someone else''s apprentice'; end $$;
select pg_temp.as_user(:ben, 'aal1');
select pg_temp.ok((select count(*) from public.nisia_my_college() where reason = 'Dentist') = 1, 'Evia''s college history says why Ben was off');
select pg_temp.ok((select count(*) from public.nisia_absences()) = 2, 'Ben sees his own absences');
select public.nisia_cancel_absence((select id from public.absences where reason = 'Dentist'));
select pg_temp.ok((select count(*) from public.nisia_absences()) = 1, 'and can cancel one');
select pg_temp.as_user(:amy, 'aal1');
do $$ begin perform public.nisia_cancel_absence((select id from public.absences where kind = 'work')); raise exception 'FAILED: Amy cancelled Cal''s'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok  nobody else can cancel it'; end $$;
\o
\echo ALL REGISTER CHECKS PASSED

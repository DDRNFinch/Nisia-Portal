-- Clear out the test colleges before the demo. Keeps Brookfield College (Danny, Callum, Amira, Jordan and their
-- work) and the master admin account; removes Nisia Test Organisation, Finch College and Nisia Test College with
-- everything in them, and Brookfield's empty test class "Level 2 brick" (no attendance on it).
-- All in one go: if anything fails, nothing is changed.

begin;

create temp table gone (id uuid primary key) on commit drop;
insert into gone values
  ('85173965-d7a7-4495-86bb-2855b19f223d'),  -- Nisia Test Organisation
  ('7a0ffe36-6521-479b-8881-c05ae305fb92'),  -- Finch College
  ('d804cac9-bd2d-4f37-9dd1-19e9902ca3a9');  -- Nisia Test College

-- Brookfield's empty test class.
delete from public.class_attendance where session_id in (select s.id from public.class_sessions s join public.classes c on c.id = s.class_id
  where c.organisation_id = '82093819-47d8-454f-903c-3bb149c13cd3' and c.title = 'Level 2 brick');
delete from public.class_sessions where class_id in (select id from public.classes where organisation_id = '82093819-47d8-454f-903c-3bb149c13cd3' and title = 'Level 2 brick');
delete from public.class_learners where class_id in (select id from public.classes where organisation_id = '82093819-47d8-454f-903c-3bb149c13cd3' and title = 'Level 2 brick');
delete from public.classes where organisation_id = '82093819-47d8-454f-903c-3bb149c13cd3' and title = 'Level 2 brick';

-- The test colleges: their records first, then their people, then the colleges.
delete from public.review_signoffs     where organisation_id in (select id from gone);
delete from public.reviews             where organisation_id in (select id from gone);
delete from public.targets             where organisation_id in (select id from gone);
delete from public.witness_testimonies where organisation_id in (select id from gone);
delete from public.behaviour_ratings   where organisation_id in (select id from gone);
delete from public.otj_confirmations   where organisation_id in (select id from gone);
delete from public.otj_entries         where organisation_id in (select id from gone);
delete from public.assessments         where organisation_id in (select id from gone);
delete from public.observations        where organisation_id in (select id from gone);
delete from public.evidence_files      where organisation_id in (select id from gone);
delete from public.evidence            where organisation_id in (select id from gone);
delete from public.evia_records        where organisation_id in (select id from gone);
delete from public.game_scores         where organisation_id in (select id from gone);
delete from public.attendance_changes  where organisation_id in (select id from gone);
delete from public.class_attendance    where organisation_id in (select id from gone);
delete from public.class_sessions      where organisation_id in (select id from gone);
delete from public.class_learners      where organisation_id in (select id from gone);
delete from public.classes             where organisation_id in (select id from gone);
delete from public.absences            where organisation_id in (select id from gone);
delete from public.visits              where organisation_id in (select id from gone);
delete from public.evia_pairing_tokens where organisation_id in (select id from gone);
delete from public.invites             where organisation_id in (select id from gone);
delete from public.notifications       where organisation_id in (select id from gone);
delete from public.usage_daily         where organisation_id in (select id from gone);
delete from public.learner_access      where organisation_id in (select id from gone);
delete from public.enrolments          where organisation_id in (select id from gone);
delete from public.learners            where organisation_id in (select id from gone);
delete from public.attendance_settings where organisation_id in (select id from gone);
delete from public.organisation_members where organisation_id in (select id from gone);
delete from public.audit_events        where organisation_id in (select id from gone);
delete from public.organisations       where id in (select id from gone);

commit;

-- What's left: should be Brookfield College only.
select name from public.organisations order by name;

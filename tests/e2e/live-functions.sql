-- Nisia functions copied from the live project that need the private rules (tests/sql/live-helpers.sql) first.
create or replace function public.nisia_my_feedback() returns table(client_reference text, unit text, decision text, feedback text, ksbs text[], assessed_at timestamptz, assessor text)
language sql stable security definer set search_path to '' as $$
  select distinct on (ev.id) ev.client_reference, ev.source_metadata->>'unit', a.decision, a.feedback, a.ksbs, a.created_at, p.display_name
  from public.evidence ev join public.assessments a on a.evidence_id = ev.id left join public.organisation_members m on m.id = a.assessor_member_id
  left join public.profiles p on p.id = m.user_id where private.is_own_enrolment(ev.enrolment_id) order by ev.id, a.created_at desc; $$;


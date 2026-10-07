-- What a learner was taught at college: each register the tutor finished in Symi for a class they're on, with the
-- lesson, the KSBs it covered and whether they were there. For Milos (the assessor's view of a learner) and anyone
-- else who works with the learner.
--
--   nisia_learner_college   a learner's finished college sessions, newest first

create or replace function public.nisia_learner_college(p_enrolment uuid) returns table (
  session_id uuid, session_date date, class text, lesson text, summary text, ksbs text[], status text, late boolean, minutes int, reason text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.session_date, c.title, s.lesson_title, s.lesson_summary, coalesce(s.ksbs, '{}'), a.status, coalesce(a.late, false), a.minutes, a.reason
  from public.class_learners cl
  join public.classes c on c.id = cl.class_id
  join public.class_sessions s on s.class_id = c.id and s.status = 'finished'
  left join public.class_attendance a on a.session_id = s.id and a.enrolment_id = cl.enrolment_id
  where cl.enrolment_id = p_enrolment and private.mfa_ok() and private.can_access_enrolment(p_enrolment)
  order by s.session_date desc
  limit 200;
$$;

grant execute on function public.nisia_learner_college(uuid) to authenticated;

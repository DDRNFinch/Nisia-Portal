-- Paros: the employer's week. One added part, 'signoffs' (when each skill was signed off), so the weekly summary
-- can say exactly which skills were signed off that week. Everything else in paros_learner is unchanged.
create or replace function public.paros_learner(p_enrolment uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.can_employer_enrolment(p_enrolment) then raise exception 'Not allowed'; end if;
  return jsonb_build_object(
    'college', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'date', s.session_date, 'class', c.title, 'lesson', s.lesson_title, 'summary', s.lesson_summary,
        'ksbs', s.ksbs, 'minutes', a.minutes, 'status', a.status, 'late', a.late) order by s.session_date desc)
      from public.class_attendance a join public.class_sessions s on s.id = a.session_id join public.classes c on c.id = s.class_id
      where a.enrolment_id = p_enrolment and a.confirmed_at is not null), '[]'::jsonb),
    'evidence', coalesce((select jsonb_agg(jsonb_build_object('id', ev.id, 'title', ev.title, 'unit', ev.source_metadata ->> 'unit', 'type', ev.evidence_type,
        'at', ev.created_at, 'ksbs', coalesce(ev.source_metadata -> 'ksbs', '[]'::jsonb), 'observation', ev.source_metadata ->> 'collection' = 'observation',
        'decision', (select a.decision from public.assessments a where a.evidence_id = ev.id order by a.created_at desc limit 1),
        'signed', (select to_jsonb(a.ksbs) from public.assessments a where a.evidence_id = ev.id and a.decision = 'accepted' order by a.created_at desc limit 1)) order by ev.created_at desc)
      from public.evidence ev where ev.enrolment_id = p_enrolment), '[]'::jsonb),
    'otj', coalesce((select jsonb_agg(jsonb_build_object('id', ot.id, 'date', ot.activity_date, 'type', ot.activity_type, 'description', ot.description, 'hours', ot.hours,
        'decision', (select oc.decision from public.otj_confirmations oc where oc.otj_entry_id = ot.id order by oc.created_at desc limit 1)) order by ot.activity_date desc)
      from public.otj_entries ot where ot.enrolment_id = p_enrolment), '[]'::jsonb),
    'witness', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'statement', w.statement, 'rating', w.rating, 'at', coalesce(w.signed_at, w.created_at),
        'ksbs', to_jsonb(w.ksbs), 'unit', w.unit) order by w.created_at desc)
      from public.witness_testimonies w where w.enrolment_id = p_enrolment), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(jsonb_build_object('id', br.id, 'ratings', br.ratings, 'comment', br.comment, 'at', br.created_at) order by br.created_at desc)
      from public.behaviour_ratings br where br.enrolment_id = p_enrolment), '[]'::jsonb),
    -- When each skill was signed off (accepted assessments), for the employer's week in Paros.
    'signoffs', coalesce((select jsonb_agg(jsonb_build_object('at', a.created_at, 'ksbs', to_jsonb(a.ksbs)) order by a.created_at)
      from public.assessments a join public.evidence ev on ev.id = a.evidence_id where ev.enrolment_id = p_enrolment and a.decision = 'accepted'), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('id', rv.id, 'at', rv.reviewed_at, 'type', rv.review_type,
        'employer_signed', exists (select 1 from public.review_signoffs so where so.review_id = rv.id and so.signer_role = 'employer')) order by rv.reviewed_at desc)
      from public.reviews rv where rv.enrolment_id = p_enrolment), '[]'::jsonb)
  );
end $$;

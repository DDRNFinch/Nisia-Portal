-- Evia's calendar shows every college day ahead, not only the sessions Symi has already opened: nisia_whats_new
-- carries the learner's class timetable (each class's days, times and start and end dates), and Evia works out the days.
create or replace function public.nisia_whats_new() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_e uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia first.'; end if;
  select e.id into v_e from public.enrolments e join public.learners l on l.id = e.learner_id join public.organisation_members om on om.id = l.organisation_member_id
    where om.user_id = auth.uid() and om.active order by e.created_at desc limit 1;
  return jsonb_build_object(
    'college', coalesce((select jsonb_agg(to_jsonb(c)) from public.nisia_my_college() c), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(to_jsonb(s)) from public.nisia_my_sessions(7) s), '[]'::jsonb),
    'absences', coalesce((select jsonb_agg(to_jsonb(a)) from public.nisia_absences() a), '[]'::jsonb),
    'attendance', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'date', s.session_date, 'class', c.title, 'status', a.status, 'late', a.late, 'minutes', a.minutes,
        'reason', a.reason, 'kind', ab.kind, 'checked_in_at', a.checked_in_at) order by s.session_date, s.starts_at nulls last)
      from public.class_attendance a join public.class_sessions s on s.id = a.session_id join public.classes c on c.id = s.class_id
      left join public.absences ab on ab.id = a.absence_id
      where a.enrolment_id = v_e and a.confirmed_at is not null and s.session_date > current_date - 400), '[]'::jsonb),
    'employer', jsonb_build_object(
      'witness', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'unit', w.unit, 'statement', w.statement, 'rating', w.rating, 'ksbs', to_jsonb(w.ksbs),
          'signed_at', w.signed_at, 'created_at', w.created_at) order by w.created_at desc) from public.witness_testimonies w where w.enrolment_id = v_e), '[]'::jsonb),
      'ratings', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'ratings', b.ratings, 'comment', b.comment, 'created_at', b.created_at) order by b.created_at desc)
        from public.behaviour_ratings b where b.enrolment_id = v_e), '[]'::jsonb)),
    'feedback', coalesce((select jsonb_agg(to_jsonb(f)) from public.nisia_my_feedback() f), '[]'::jsonb),
    'visits', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'starts_at', v.starts_at, 'minutes', v.minutes, 'kind', v.kind, 'place', v.place, 'note', v.note,
        'booked_by', coalesce(p.display_name, '')) order by v.starts_at)
      from public.visits v join public.organisation_members om on om.id = v.booked_by_member_id left join public.profiles p on p.id = om.user_id
      where v.enrolment_id = v_e and v.cancelled_at is null and v.starts_at > now() - interval '31 days'), '[]'::jsonb),
    'timetable', coalesce((select jsonb_agg(jsonb_build_object('class', c.title, 'room', c.room, 'schedule', c.schedule) order by c.title)
      from public.class_learners cl join public.classes c on c.id = cl.class_id where cl.enrolment_id = v_e and c.archived_at is null), '[]'::jsonb));
end $$;

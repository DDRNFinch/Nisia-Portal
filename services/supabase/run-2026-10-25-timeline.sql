-- A learner's timeline: one date-ordered story, the same in Milos, Paros and Symi.
-- College days (from the tutor's registers), evidence and the assessor's decision, learning hours and whether the
-- employer confirmed them, visits, progress reviews, the employer's feedback (witness testimonies and behaviour
-- ratings) and days booked off. Newest first, the last 200, plus visits booked in the next 30 days.
-- Who can see it: anyone who can already see the learner (their assessor, tutor or employer, the learner themselves,
-- an admin) and the tutor of a class they're in. Read only; adds one function. Dates are ISO (2026-10-25 or 2026-10-25T09:00:00+01:00).

create or replace function public.nisia_learner_timeline(p_enrolment uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia Portal first.'; end if;
  if not (private.can_access_enrolment(p_enrolment) or private.can_employer_enrolment(p_enrolment)
      or exists (select 1 from public.class_learners cl where cl.enrolment_id = p_enrolment and private.own_class(cl.class_id))) then
    raise exception 'Not allowed';
  end if;
  select coalesce(jsonb_agg(x order by x ->> 'at' desc), '[]'::jsonb) into v from (
    select x from (
      /* College days. */
      select jsonb_build_object('kind', 'college', 'at', s.session_date::text, 'title', case when a.status = 'absent' then 'Missed college' when a.late then 'At college (late)' else 'At college' end,
        'sub', concat_ws(' · ', c.title, s.lesson_title, case when a.status <> 'absent' and coalesce(a.minutes, 0) > 0 then floor(a.minutes / 60)::int || 'h' || case when a.minutes % 60 > 0 then ' ' || (a.minutes % 60)::int || 'm' else '' end end, case when a.status = 'absent' then a.reason end),
        'tone', case when a.status = 'absent' then 'bad' when a.late then 'warn' else 'good' end) as x
      from public.class_attendance a join public.class_sessions s on s.id = a.session_id join public.classes c on c.id = s.class_id
      where a.enrolment_id = p_enrolment and a.confirmed_at is not null
      union all
      /* Evidence, and what the assessor decided. */
      select jsonb_build_object('kind', 'evidence', 'at', to_jsonb(ev.created_at) #>> '{}', 'title', case when ev.source_metadata ->> 'collection' = 'observation' then 'Observation' else 'Evidence' end || ': ' || coalesce(nullif(ev.source_metadata ->> 'unit', ''), ev.title),
        'sub', case d.decision when 'accepted' then 'Signed off' when 'rejected' then 'Sent back to improve' when 'changes_required' then 'Sent back to improve' else 'Waiting for the assessor' end,
        'tone', case d.decision when 'accepted' then 'good' when 'rejected' then 'warn' when 'changes_required' then 'warn' else '' end)
      from public.evidence ev left join lateral (select a.decision from public.assessments a where a.evidence_id = ev.id order by a.created_at desc limit 1) d on true
      where ev.enrolment_id = p_enrolment
      union all
      /* Learning hours (college hours are the college days above). */
      select jsonb_build_object('kind', 'hours', 'at', ot.activity_date::text, 'title', trim(to_char(ot.hours, 'FM990.0')) || case when ot.hours = 1 then ' hour of learning' else ' hours of learning' end,
        'sub', concat_ws(' · ', left(nullif(ot.description, ''), 90), case d.decision when 'approved' then 'Confirmed' when 'queried' then 'Queried' when 'rejected' then 'Queried' else 'Waiting to be confirmed' end),
        'tone', case d.decision when 'approved' then 'good' when 'queried' then 'warn' when 'rejected' then 'warn' else '' end)
      from public.otj_entries ot left join lateral (select oc.decision from public.otj_confirmations oc where oc.otj_entry_id = ot.id order by oc.created_at desc limit 1) d on true
      where ot.enrolment_id = p_enrolment and ot.activity_type <> 'college'
      union all
      /* Visits: past ones, and those booked in the next 30 days. */
      select jsonb_build_object('kind', 'visit', 'at', to_jsonb(vi.starts_at) #>> '{}', 'title', case vi.kind when 'observation' then 'Observation visit' when 'review' then 'Review visit' else 'Assessor visit' end || case when vi.starts_at > now() then ' (booked)' else '' end,
        'sub', concat_ws(' · ', to_char(vi.starts_at at time zone 'Europe/London', 'HH24:MI'), vi.place), 'tone', '')
      from public.visits vi where vi.enrolment_id = p_enrolment and vi.cancelled_at is null and vi.starts_at < now() + interval '30 days'
      union all
      /* Progress reviews. */
      select jsonb_build_object('kind', 'review', 'at', to_jsonb(rv.reviewed_at) #>> '{}', 'title', 'Progress review', 'sub', case when rv.review_type ilike '%progress%' then 'With the assessor' else initcap(replace(rv.review_type, '_', ' ')) end, 'tone', 'good')
      from public.reviews rv where rv.enrolment_id = p_enrolment
      union all
      /* The employer's feedback. */
      select jsonb_build_object('kind', 'feedback', 'at', to_jsonb(coalesce(w.signed_at, w.created_at)) #>> '{}', 'title', 'Witness testimony', 'sub', coalesce(nullif(w.unit, ''), 'From the employer'), 'tone', 'good')
      from public.witness_testimonies w where w.enrolment_id = p_enrolment
      union all
      select jsonb_build_object('kind', 'feedback', 'at', to_jsonb(br.created_at) #>> '{}', 'title', 'Behaviours rated', 'sub', 'By the employer', 'tone', 'good')
      from public.behaviour_ratings br where br.enrolment_id = p_enrolment
      union all
      /* Days booked off. */
      select jsonb_build_object('kind', 'off', 'at', ab.starts_on::text, 'title', 'Day' || case when ab.ends_on > ab.starts_on then 's' else '' end || ' off: ' || case ab.kind when 'ill' then 'ill' when 'holiday' then 'holiday' when 'appointment' then 'appointment' when 'work' then 'needed at work' else 'other' end,
        'sub', concat_ws(' · ', case when ab.ends_on > ab.starts_on then 'Until ' || to_char(ab.ends_on, 'FMDD Mon') end, 'Booked by the ' || ab.booked_by_role), 'tone', '')
      from public.absences ab where ab.enrolment_id = p_enrolment and ab.cancelled_at is null
    ) t order by x ->> 'at' desc limit 200
  ) y;
  return v;
end $$;

revoke all on function public.nisia_learner_timeline(uuid) from public, anon;
grant execute on function public.nisia_learner_timeline(uuid) to authenticated;

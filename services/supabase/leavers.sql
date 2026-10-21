-- A learner leaves or finishes: the college marks it in Evia Portal, their seat frees up straight away, and they come
-- off the lists (their classes in Symi, their employer's in Paros, their assessor's to-do in Milos). Nothing is
-- deleted: their evidence, hours, reviews and attendance stay, and it can be undone if it was a mistake. Evia tells the
-- learner and lets them keep a copy of their portfolio.
--   enrolments: ended_on, end_reason, ended_at, ended_by, ended_classes (the classes they were on, for undo)
--   nisia_end_enrolment       (admins) mark left (withdrawn) or finished (completed), with the date and a reason
--   nisia_undo_end_enrolment  (admins) put them back as they were, on the same classes
--   nisia_leavers             (admins) who left or finished in a period, for the college's records
-- Also: nisia_my_details says to Evia when the learner has left or finished; paros_learners leaves them out;
-- messages to and from them stop (private.msg_learner_active).

alter table public.enrolments
  add column if not exists ended_on date,
  add column if not exists end_reason text,
  add column if not exists ended_at timestamptz,
  add column if not exists ended_by uuid references public.organisation_members(id) on delete set null,
  add column if not exists ended_classes uuid[];

create or replace function public.nisia_end_enrolment(p_enrolment uuid, p_kind text, p_on date default null, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.enrolments; v_classes uuid[];
begin
  select * into v from public.enrolments where id = p_enrolment;
  if v.id is null or not private.can_manage_org(v.organisation_id) then raise exception 'Only the college’s admins can do this.'; end if;
  if p_kind not in ('left', 'finished') then raise exception 'Say whether they left or finished.'; end if;
  if v.status in ('completed', 'withdrawn') then raise exception 'They’ve already % the course.', case when v.status = 'completed' then 'finished' else 'left' end; end if;
  if coalesce(p_on, current_date) > current_date + 31 then raise exception 'The date can’t be more than a month ahead.'; end if;
  if p_kind = 'left' and nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'Give a reason they left.'; end if;
  select coalesce(array_agg(cl.class_id), '{}') into v_classes from public.class_learners cl where cl.enrolment_id = p_enrolment;
  -- Off the registers from now on (past registers keep their marks).
  delete from public.class_learners where enrolment_id = p_enrolment;
  update public.enrolments set status = case when p_kind = 'left' then 'withdrawn' else 'completed' end,
    ended_on = coalesce(p_on, current_date), end_reason = left(nullif(btrim(coalesce(p_reason, '')), ''), 200), ended_at = now(),
    ended_by = private.current_member_id(v.organisation_id), ended_classes = v_classes
  where id = p_enrolment;
  perform private.notify_assigned_staff_for_enrolment(p_enrolment, v.organisation_id, 'learner_ended',
    private.enrolment_name(p_enrolment) || case when p_kind = 'left' then ' has left the course' else ' has finished the course' end,
    'They’re off your lists now. Their records are kept.', jsonb_build_object('enrolment_id', p_enrolment));
  return jsonb_build_object('enrolment', p_enrolment, 'status', case when p_kind = 'left' then 'withdrawn' else 'completed' end, 'classes', coalesce(array_length(v_classes, 1), 0),
    'seats_used', private.seats_used(v.organisation_id));
end $$;

create or replace function public.nisia_undo_end_enrolment(p_enrolment uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.enrolments; v_back int;
begin
  select * into v from public.enrolments where id = p_enrolment;
  if v.id is null or not private.can_manage_org(v.organisation_id) then raise exception 'Only the college’s admins can do this.'; end if;
  if v.status not in ('completed', 'withdrawn') then raise exception 'They’re still on the course.'; end if;
  if (select seats from public.organisations where id = v.organisation_id) <= private.seats_used(v.organisation_id) then
    raise exception 'All your seats are in use. Free one first, or add seats.'; end if;
  insert into public.class_learners (class_id, enrolment_id, organisation_id)
  select c.id, v.id, v.organisation_id from public.classes c where c.id = any(coalesce(v.ended_classes, '{}')) and c.archived_at is null
  on conflict do nothing;
  get diagnostics v_back = row_count;
  update public.enrolments set status = 'active', ended_on = null, end_reason = null, ended_at = null, ended_by = null, ended_classes = null where id = p_enrolment;
  return jsonb_build_object('enrolment', p_enrolment, 'status', 'active', 'classes', v_back);
end $$;

create or replace function public.nisia_leavers(p_org uuid, p_from date default null, p_to date default null) returns table (
  enrolment_id uuid, name text, course text, status text, ended_on date, reason text, start_date date, end_date date, employer_name text, ended_by text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (private.can_manage_org(p_org) or (private.mfa_ok() and private.has_role(p_org, 'quality'))) then raise exception 'Only the college’s admins can see this.'; end if;
  return query
  select e.id, private.enrolment_name(e.id), coalesce(c.title, ''), e.status, e.ended_on, e.end_reason, e.start_date, e.end_date, e.employer_name,
    (select coalesce(p.display_name, '') from public.organisation_members om left join public.profiles p on p.id = om.user_id where om.id = e.ended_by)
  from public.enrolments e left join public.courses c on c.id = e.course_id
  where e.organisation_id = p_org and e.status in ('completed', 'withdrawn')
    and (p_from is null or e.ended_on >= p_from) and (p_to is null or e.ended_on <= p_to)
  order by e.ended_on desc nulls last;
end $$;

revoke all on function public.nisia_end_enrolment(uuid, text, date, text), public.nisia_undo_end_enrolment(uuid), public.nisia_leavers(uuid, date, date) from public, anon;
grant execute on function public.nisia_end_enrolment(uuid, text, date, text), public.nisia_undo_end_enrolment(uuid), public.nisia_leavers(uuid, date, date) to authenticated;

-- Messages: still on the course (not left or finished), including a break in learning, gateway and the final assessment.
create or replace function private.msg_learner_active(p_learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrolments e where e.learner_id = p_learner and coalesce(e.status, 'active') not in ('completed', 'withdrawn'));
$$;
revoke all on function private.msg_learner_active(uuid) from public, anon, authenticated;

-- Evia: the learner's details from the college, now saying when they've left or finished.
create or replace function public.nisia_my_details() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_l record; v_e record; v_last timestamptz; v_org record; v_assessor text; v_tutor text;
begin
  select l.id, l.organisation_id, p.display_name into v_l
  from public.learners l join public.organisation_members om on om.id = l.organisation_member_id
  join public.profiles p on p.id = om.user_id
  where om.user_id = auth.uid() and om.active order by l.created_at desc limit 1;
  if v_l.id is null then return null; end if;
  select e.id, e.start_date, e.end_date, e.employer_name, e.employer_contact_name, e.planned_otj_hours, e.status, e.ended_on into v_e
  from public.enrolments e where e.learner_id = v_l.id order by e.created_at desc limit 1;
  select max(r.reviewed_at) into v_last from public.reviews r where r.enrolment_id = v_e.id;
  select o.name, o.safeguarding_name, o.safeguarding_phone, o.safeguarding_email into v_org from public.organisations o where o.id = v_l.organisation_id;
  select string_agg(distinct case when r.code = 'assessor' then sp.display_name end, ', '),
         string_agg(distinct case when r.code = 'tutor' then sp.display_name end, ', ')
    into v_assessor, v_tutor
  from public.learner_access la join public.organisation_members sm on sm.id = la.organisation_member_id and sm.active
  join public.profiles sp on sp.id = sm.user_id
  join public.organisation_member_roles omr on omr.organisation_member_id = sm.id join public.roles r on r.id = omr.role_id
  where la.learner_id = v_l.id;
  return jsonb_build_object('name', v_l.display_name, 'college', v_org.name, 'start', v_e.start_date, 'end', v_e.end_date,
    'employer', v_e.employer_name, 'employerContact', v_e.employer_contact_name, 'plannedOtjHours', v_e.planned_otj_hours,
    'assessor', v_assessor, 'tutor', v_tutor, 'lastReview', v_last,
    'reviewDue', (coalesce(v_last::date, v_e.start_date) + 84),
    'status', coalesce(v_e.status, 'active'), 'endedOn', v_e.ended_on,
    'safeguarding', case when v_org.safeguarding_name is null and v_org.safeguarding_phone is null and v_org.safeguarding_email is null then null
      else jsonb_build_object('name', v_org.safeguarding_name, 'phone', v_org.safeguarding_phone, 'email', v_org.safeguarding_email) end);
end $$;

-- Paros: an employer's apprentices still on the course.
create or replace function public.paros_learners() returns table (organisation_id uuid, organisation text, member_id uuid, learner_id uuid, enrolment_id uuid, name text,
  course_code text, course_title text, start_date date, end_date date, employer_name text, planned_otj_hours numeric, evidence integer, evidence_4w integer, signed_off text[],
  otj_hours numeric, to_confirm integer, sessions integer, attended integer, college_minutes integer, last_session date, last_review timestamp with time zone, witness integer,
  last_rating timestamp with time zone)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, me.id, l.id, e.id, p.display_name, c.source_id, c.title, e.start_date, e.end_date, e.employer_name, e.planned_otj_hours,
    (select count(*)::int from public.evidence ev where ev.enrolment_id = e.id),
    (select count(*)::int from public.evidence ev where ev.enrolment_id = e.id and ev.created_at > now() - interval '28 days'),
    (select coalesce(array_agg(distinct k order by k), '{}') from public.assessments a join public.evidence ev on ev.id = a.evidence_id, unnest(a.ksbs) k
       where ev.enrolment_id = e.id and a.decision = 'accepted'),
    (select coalesce(sum(ot.hours), 0) from public.otj_entries ot where ot.enrolment_id = e.id),
    (select count(*)::int from public.otj_entries ot where ot.enrolment_id = e.id and ot.activity_type <> 'college'
       and not exists (select 1 from public.otj_confirmations oc where oc.otj_entry_id = ot.id)),
    (select count(*)::int from public.class_attendance a where a.enrolment_id = e.id and a.confirmed_at is not null),
    (select count(*)::int from public.class_attendance a where a.enrolment_id = e.id and a.confirmed_at is not null and coalesce(a.minutes, 0) > 0),
    (select coalesce(sum(a.minutes), 0)::int from public.class_attendance a where a.enrolment_id = e.id and a.confirmed_at is not null),
    (select max(s.session_date) from public.class_attendance a join public.class_sessions s on s.id = a.session_id where a.enrolment_id = e.id and a.confirmed_at is not null),
    (select max(rv.reviewed_at) from public.reviews rv where rv.enrolment_id = e.id),
    (select count(*)::int from public.witness_testimonies w where w.enrolment_id = e.id),
    (select max(br.created_at) from public.behaviour_ratings br where br.enrolment_id = e.id)
  from public.organisation_members me
  join public.organisations o on o.id = me.organisation_id
  join public.learner_access la on la.organisation_member_id = me.id
  join public.learners l on l.id = la.learner_id
  join public.organisation_members lm on lm.id = l.organisation_member_id
  join public.profiles p on p.id = lm.user_id
  join lateral (select * from public.enrolments e0 where e0.learner_id = l.id order by e0.created_at desc limit 1) e on true
  left join public.courses c on c.id = e.course_id
  where me.user_id = auth.uid() and me.active and private.mfa_ok() and private.has_role(me.organisation_id, 'employer')
    and coalesce(e.status, 'active') not in ('completed', 'withdrawn')
  order by p.display_name;
$$;

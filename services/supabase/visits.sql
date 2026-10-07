-- Visits: an assessor (or tutor) books a visit with a learner, usually on site at work. The learner sees it on their
-- Evia calendar, and the learner and their employer are told. On the day the assessor opens it in Milos and starts an
-- observation from it. Anyone who works with the learner can see it; only the person who booked it (or the college's
-- admins) can move or cancel it.
--
--   nisia_book_visit     book a visit, or move one already booked (p_id)
--   nisia_cancel_visit   cancel one
--   nisia_visits         visits in a date range: a learner's own, or (staff) the learners they work with
--   nisia_whats_new      Evia's one request now carries the learner's visits too

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  booked_by_member_id uuid not null references public.organisation_members(id) on delete restrict,
  starts_at timestamptz not null,
  minutes int not null default 60 check (minutes between 15 and 600),
  kind text not null default 'visit' check (kind in ('visit', 'observation', 'review')),
  place text check (length(place) <= 200),
  note text check (length(note) <= 1000),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists visits_enrolment on public.visits (enrolment_id, starts_at);
create index if not exists visits_booker on public.visits (booked_by_member_id, starts_at);
alter table public.visits enable row level security;
drop policy if exists visits_read on public.visits;
create policy visits_read on public.visits for select using (private.can_access_enrolment(enrolment_id));
grant select on public.visits to authenticated;
revoke all on public.visits from anon;

create or replace function private.visit_text(p_kind text) returns text
language sql immutable set search_path = '' as $$
  select case p_kind when 'observation' then 'observation' when 'review' then 'progress review' else 'visit' end;
$$;

-- Book a visit, or move one (p_id). Assessors, tutors and the college's admins, for learners they work with.
create or replace function public.nisia_book_visit(p_enrolment uuid, p_starts_at timestamptz, p_minutes int default 60,
  p_kind text default 'visit', p_place text default null, p_note text default null, p_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_e public.enrolments; v_old public.visits; v_me uuid; v_id uuid; v_name text; v_when text; v_what text;
begin
  if auth.uid() is null or not private.mfa_ok() then raise exception 'Sign in to Nisia with your authenticator app first.'; end if;
  select * into v_e from public.enrolments where id = p_enrolment;
  if v_e.id is null or not private.can_access_enrolment(v_e.id) or private.is_own_enrolment(v_e.id)
    or not (private.has_role(v_e.organisation_id, 'assessor') or private.has_role(v_e.organisation_id, 'tutor') or private.can_manage_org(v_e.organisation_id))
    then raise exception 'You can’t book a visit with this learner.'; end if;
  if p_starts_at is null then raise exception 'Choose a day and time.'; end if;
  if p_starts_at < now() - interval '1 day' then raise exception 'That day has already gone.'; end if;
  if p_starts_at > now() + interval '400 days' then raise exception 'Book visits up to a year ahead.'; end if;
  if coalesce(p_kind, 'visit') not in ('visit', 'observation', 'review') then raise exception 'Choose what the visit is for.'; end if;
  v_me := private.current_member_id(v_e.organisation_id);
  if p_id is not null then
    select * into v_old from public.visits where id = p_id and enrolment_id = v_e.id and cancelled_at is null;
    if v_old.id is null or not (v_old.booked_by_member_id = v_me or private.can_manage_org(v_e.organisation_id)) then raise exception 'You can’t change this visit.'; end if;
    update public.visits set starts_at = p_starts_at, minutes = coalesce(p_minutes, 60), kind = coalesce(p_kind, 'visit'),
      place = nullif(trim(coalesce(p_place, '')), ''), note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now() where id = p_id;
    v_id := p_id;
  else
    insert into public.visits (organisation_id, enrolment_id, booked_by_member_id, starts_at, minutes, kind, place, note)
    values (v_e.organisation_id, v_e.id, v_me, p_starts_at, coalesce(p_minutes, 60), coalesce(p_kind, 'visit'), nullif(trim(coalesce(p_place, '')), ''), nullif(trim(coalesce(p_note, '')), ''))
    returning id into v_id;
  end if;
  v_name := private.enrolment_name(v_e.id);
  v_when := to_char(p_starts_at at time zone 'Europe/London', 'FMDy FMDD FMMon "at" HH24:MI');
  v_what := private.visit_text(coalesce(p_kind, 'visit'));
  perform private.notify_learner_for_enrolment(v_e.id, v_e.organisation_id, 'visit_booked',
    case when p_id is null then 'Your assessor is visiting' else 'Your visit has moved' end,
    'Your ' || v_what || ' is on ' || v_when || coalesce(' at ' || nullif(trim(coalesce(p_place, '')), ''), '') || '. It’s on your Evia calendar.',
    jsonb_build_object('visit_id', v_id, 'open', 'calendar'));
  perform private.notify_employers_for_enrolment(v_e.id, v_e.organisation_id, 'visit_booked_staff', 'Visit: ' || v_name,
    'The assessor’s ' || v_what || ' with ' || v_name || ' is on ' || v_when || coalesce(' at ' || nullif(trim(coalesce(p_place, '')), ''), '') || '.',
    jsonb_build_object('visit_id', v_id, 'enrolment_id', v_e.id));
  return jsonb_build_object('id', v_id, 'starts_at', p_starts_at);
end $$;

-- Cancel one: the person who booked it, or the college's admins. The learner is told.
create or replace function public.nisia_cancel_visit(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.visits;
begin
  select * into v from public.visits where id = p_id;
  if v.id is null or not private.mfa_ok() or not (v.booked_by_member_id = private.current_member_id(v.organisation_id) or private.can_manage_org(v.organisation_id))
    then raise exception 'You can’t cancel this visit.'; end if;
  update public.visits set cancelled_at = now(), updated_at = now() where id = p_id and cancelled_at is null;
  perform private.notify_learner_for_enrolment(v.enrolment_id, v.organisation_id, 'visit_cancelled', 'Visit cancelled',
    'Your ' || private.visit_text(v.kind) || ' on ' || to_char(v.starts_at at time zone 'Europe/London', 'FMDy FMDD FMMon') || ' is cancelled.', jsonb_build_object('open', 'calendar'));
end $$;

-- Visits between two days: a learner's own, or (staff) every learner they work with. With p_enrolment, one learner.
create or replace function public.nisia_visits(p_from date, p_to date, p_enrolment uuid default null) returns table (
  id uuid, enrolment_id uuid, learner text, starts_at timestamptz, minutes int, kind text, place text, note text, booked_by text, mine boolean)
language sql stable security definer set search_path = '' as $$
  select v.id, v.enrolment_id, private.enrolment_name(v.enrolment_id), v.starts_at, v.minutes, v.kind, v.place, v.note,
    coalesce(p.display_name, ''), v.booked_by_member_id = private.current_member_id(v.organisation_id)
  from public.visits v
  join public.organisation_members om on om.id = v.booked_by_member_id
  left join public.profiles p on p.id = om.user_id
  where v.cancelled_at is null
    and (v.starts_at at time zone 'Europe/London')::date between p_from and least(p_to, p_from + 400)
    and (p_enrolment is null or v.enrolment_id = p_enrolment)
    and private.can_access_enrolment(v.enrolment_id)
  order by v.starts_at limit 500;
$$;
revoke all on function public.nisia_book_visit(uuid, timestamptz, int, text, text, text, uuid) from public, anon;
revoke all on function public.nisia_cancel_visit(uuid) from public, anon;
revoke all on function public.nisia_visits(date, date, uuid) from public, anon;
grant execute on function public.nisia_book_visit(uuid, timestamptz, int, text, text, text, uuid) to authenticated;
grant execute on function public.nisia_cancel_visit(uuid) to authenticated;
grant execute on function public.nisia_visits(date, date, uuid) to authenticated;

-- Evia's one request: everything it had, and the learner's visits from a month back to a year ahead.
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
      where v.enrolment_id = v_e and v.cancelled_at is null and v.starts_at > now() - interval '31 days'), '[]'::jsonb));
end $$;

-- Attendance from before Evia Portal ("earlier attendance"): each learner's totals up to a date, typed in once by the
-- college from its old registers or forms. Evia Portal and Symi add the registers taken since, so one percentage, in
-- hours, covers the whole course. Safe to run more than once.

create table if not exists public.attendance_baselines (
  enrolment_id uuid primary key references public.enrolments(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  up_to date not null,
  attended_minutes integer not null check (attended_minutes >= 0),
  expected_minutes integer not null check (expected_minutes > 0),
  note text,
  entered_by uuid,
  entered_at timestamptz not null default now(),
  check (attended_minutes <= expected_minutes)
);
-- Read and written only through the functions below.
alter table public.attendance_baselines enable row level security;

-- Who may see or change a learner's attendance: the college's admins and quality, and the learner's own tutor or
-- assessor (as for the attendance report).
create or replace function private.att_staff(p_enrolment uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrolments e where e.id = p_enrolment and (
    private.can_manage_org(e.organisation_id) or private.is_platform_admin() or (private.mfa_ok() and private.has_role(e.organisation_id, 'quality'))
    or (private.mfa_ok() and (private.has_role(e.organisation_id, 'tutor') or private.has_role(e.organisation_id, 'assessor')) and exists (
      select 1 from public.learner_access la where la.learner_id = e.learner_id and la.organisation_member_id = private.current_member_id(e.organisation_id)))));
$$;

-- Save (or, with no expected hours, remove) a learner's earlier attendance.
create or replace function public.nisia_set_attendance_baseline(p_enrolment uuid, p_up_to date, p_attended_hours numeric, p_expected_hours numeric, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select organisation_id into v_org from public.enrolments where id = p_enrolment;
  if v_org is null then raise exception 'That learner isn’t in Evia Portal.'; end if;
  if not private.att_staff(p_enrolment) then raise exception 'Only the learner’s tutor or assessor, or the college’s admins, can add earlier attendance.'; end if;
  if p_expected_hours is null then delete from public.attendance_baselines where enrolment_id = p_enrolment; return; end if;
  if p_up_to is null then raise exception 'Say what date the earlier figures go up to.'; end if;
  if p_up_to > current_date then raise exception 'The earlier figures can’t go up to a date in the future.'; end if;
  if p_expected_hours <= 0 then raise exception 'Hours expected must be more than 0.'; end if;
  if p_attended_hours is null or p_attended_hours < 0 or p_attended_hours > p_expected_hours then raise exception 'Hours attended must be between 0 and the hours expected.'; end if;
  insert into public.attendance_baselines (enrolment_id, organisation_id, up_to, attended_minutes, expected_minutes, note, entered_by)
  values (p_enrolment, v_org, p_up_to, round(p_attended_hours * 60)::int, round(p_expected_hours * 60)::int, nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  on conflict (enrolment_id) do update set up_to = excluded.up_to, attended_minutes = excluded.attended_minutes, expected_minutes = excluded.expected_minutes,
    note = excluded.note, entered_by = excluded.entered_by, entered_at = now();
end $$;

-- The whole course, learner by learner: earlier attendance (if any) plus the registers finished since it, in hours.
-- A register counts its session's length as expected, and the learner's minutes there (all of it if they were marked
-- here with no minutes) as attended. Registers on or before the earlier figures' date are already in them.
create or replace function public.nisia_attendance_whole(p_org uuid)
returns table(enrolment_id uuid, earlier_up_to date, earlier_attended_minutes integer, earlier_expected_minutes integer, earlier_note text,
  since_attended_minutes integer, since_expected_minutes integer, since_sessions integer, pct integer, below_target boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_all boolean; v_target int;
begin
  v_all := private.can_manage_org(p_org) or (private.mfa_ok() and private.has_role(p_org, 'quality')) or private.is_platform_admin();
  if not private.mfa_ok() or not (v_all or private.has_role(p_org, 'assessor') or private.has_role(p_org, 'tutor')) then raise exception 'Not allowed'; end if;
  v_target := (private.att_settings(p_org)).target_pct;
  return query
    with m as (
      select a.enrolment_id e, greatest(0, round(extract(epoch from (s.ends_at - s.starts_at)) / 60))::int x,
        case when coalesce(a.status = 'present', a.checked_in_at is not null) then coalesce(a.minutes, round(extract(epoch from (s.ends_at - s.starts_at)) / 60)::int) else 0 end h
      from public.class_attendance a join public.class_sessions s on s.id = a.session_id
      left join public.attendance_baselines b on b.enrolment_id = a.enrolment_id
      where a.organisation_id = p_org and a.confirmed_at is not null and s.starts_at is not null and s.ends_at is not null and s.ends_at > s.starts_at
        and (b.up_to is null or s.session_date > b.up_to)),
    g as (select m.e, sum(least(greatest(m.h, 0), m.x))::int att, sum(m.x)::int exp, count(*)::int n from m group by m.e)
    select en.id, b.up_to, b.attended_minutes, b.expected_minutes, b.note, coalesce(g.att, 0), coalesce(g.exp, 0), coalesce(g.n, 0),
      case when coalesce(b.expected_minutes, 0) + coalesce(g.exp, 0) = 0 then null
        else round(100.0 * (coalesce(b.attended_minutes, 0) + coalesce(g.att, 0)) / (coalesce(b.expected_minutes, 0) + coalesce(g.exp, 0)))::int end,
      coalesce(b.expected_minutes, 0) + coalesce(g.exp, 0) > 0
        and round(100.0 * (coalesce(b.attended_minutes, 0) + coalesce(g.att, 0)) / nullif(coalesce(b.expected_minutes, 0) + coalesce(g.exp, 0), 0)) < v_target
    from public.enrolments en
    join public.learners l on l.id = en.learner_id
    left join public.attendance_baselines b on b.enrolment_id = en.id
    left join g on g.e = en.id
    where en.organisation_id = p_org and en.status not in ('withdrawn', 'completed')
      and (v_all or exists (select 1 from public.learner_access la where la.learner_id = l.id and la.organisation_member_id = private.current_member_id(p_org)));
end $$;

revoke all on function public.nisia_set_attendance_baseline(uuid, date, numeric, numeric, text) from public, anon;
revoke all on function public.nisia_attendance_whole(uuid) from public, anon;
grant execute on function public.nisia_set_attendance_baseline(uuid, date, numeric, numeric, text) to authenticated;
grant execute on function public.nisia_attendance_whole(uuid) to authenticated;

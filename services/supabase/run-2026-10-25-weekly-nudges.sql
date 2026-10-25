-- Friday summaries, gentle nudges and the monthly behaviours prompt. Adds to the daily reminders
-- (private.course_reminders(), 11:50 every day); everything already there stays as it is, except that the Friday
-- "Learning hours this week" becomes part of the learner's "Your week" (so they get one message, not two).
-- Each message has a key, so it's only ever made once, and nisia-push still keeps to quiet hours, no staff or
-- employer messages at the weekend, and at most 4 a day.
--
-- New, on a Friday:
--   Learners (Evia):        "Your week": evidence added, hours logged against this week's share, anything signed off.
--   Assessors/tutors (Milos): "Who needs attention": evidence waiting to assess, reviews overdue, gone quiet (3 weeks).
--   Employers (Paros):      "Your apprentices this week": hours waiting for them to confirm, reviews coming up.
-- New nudges (each at most once a week):
--   Employers (Paros):      learning hours waiting more than 2 weeks for them to confirm.
--   Learners (Evia):        no evidence added for 3 weeks.
--   Employers (Paros):      their apprentice's progress review is in 7 days (the learner already hears).
-- New, on the first Monday of the month:
--   Employers (Paros):      rate how their apprentices are doing at work, if they haven't in the last 4 weeks.
-- Paros phones can now take notifications (device_tokens.app gets 'paros').

alter table public.device_tokens drop constraint if exists device_tokens_app_check;
alter table public.device_tokens add constraint device_tokens_app_check check (app in ('evia', 'milos', 'paros'));

-- It now takes the day to run for (today when left out, as pg_cron calls it), so it can be tried for any day.
drop function if exists private.course_reminders();

create or replace function private.course_reminders(p_today date default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  today date := coalesce(p_today, (now() at time zone 'Europe/London')::date);
  dow int := extract(isodow from today);
  wk text := to_char(today, 'IYYY-IW');
  ago7 timestamptz := (today - 7)::timestamp at time zone 'Europe/London';
  ago21 timestamptz := (today - 21)::timestamp at time zone 'Europe/London';
  ago28 timestamptz := (today - 28)::timestamp at time zone 'Europe/London';
  made int := 0;
  n int;
begin
  -- Learners: their progress review, a week before, the day before and on the day (every 12 weeks from the last one).
  with r as (
    select e.id, e.organisation_id, om.user_id,
      (coalesce((select max(v.reviewed_at) from public.reviews v where v.enrolment_id = e.id)::date, e.start_date) + 84) as due
    from public.enrolments e
    join public.learners l on l.id = e.learner_id
    join public.organisation_members om on om.id = l.organisation_member_id and om.active
    where e.status = 'active' and e.start_date <= today and e.end_date >= today)
  insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
  select r.organisation_id, r.user_id, 'review_due',
    case r.due - today when 7 then 'Progress review next week' when 1 then 'Progress review tomorrow' else 'Progress review today' end,
    case r.due - today
      when 7 then 'It’s on ' || trim(to_char(r.due, 'FMDay FMDD FMMonth')) || '. Add any evidence and learning hours before then so it’s up to date.'
      when 1 then 'Make sure your evidence and learning hours are in Evia so your assessor sees everything.'
      else 'Your assessor will go through your progress with you today. Have Evia with you to show your latest work.' end,
    jsonb_build_object('key', 'review_due:' || r.id || ':' || r.due || ':' || (r.due - today), 'open', 'review', 'enrolment_id', r.id)
  from r where r.due - today in (7, 1, 0)
  on conflict do nothing;
  get diagnostics n = row_count; made := made + n;

  -- Learners: a target due in 3 days, and on the day.
  insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
  select t.organisation_id, om.user_id, 'target_due',
    case when t.due_date = today then 'Target due today' else 'Target due in 3 days' end,
    t.title,
    jsonb_build_object('key', 'target_due:' || t.id || ':' || (t.due_date - today), 'open', 'targets', 'target_id', t.id)
  from public.targets t
  join public.enrolments e on e.id = t.enrolment_id and e.status = 'active'
  join public.learners l on l.id = e.learner_id
  join public.organisation_members om on om.id = l.organisation_member_id and om.active
  where t.status = 'open' and t.due_date - today in (3, 0)
  on conflict do nothing;
  get diagnostics n = row_count; made := made + n;

  -- Learners, on a Friday: "Your week" (evidence, hours against this week's share, anything signed off).
  if dow = 5 then
    with h as (
      select e.id, e.organisation_id, om.user_id,
        case when coalesce(e.planned_otj_hours, 0) > 0 then round(e.planned_otj_hours / greatest(1, (e.end_date - e.start_date) / 7.0), 1) end as target,
        coalesce((select sum(o.hours) from public.otj_entries o where o.enrolment_id = e.id and o.activity_date > today - 7), 0) as done,
        (select count(*) from public.evidence ev where ev.enrolment_id = e.id and ev.created_at > ago7) as added,
        (select count(distinct a.evidence_id) from public.assessments a join public.evidence ev on ev.id = a.evidence_id
           where ev.enrolment_id = e.id and a.decision = 'accepted' and a.created_at > ago7) as signed
      from public.enrolments e
      join public.learners l on l.id = e.learner_id
      join public.organisation_members om on om.id = l.organisation_member_id and om.active
      where e.status = 'active' and e.start_date <= today - 3 and e.end_date >= today)
    insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
    select h.organisation_id, h.user_id, 'week_summary',
      case when h.added = 0 and h.done = 0 then 'Your week: nothing added yet' else 'Your week in Evia' end,
      concat_ws(' ',
        case when h.added = 0 then 'No evidence this week.' when h.added = 1 then '1 piece of evidence.' else h.added || ' pieces of evidence.' end,
        case when h.target is null then case when h.done > 0 then round(h.done, 1) || ' hours of learning.' end
          when h.done = 0 then 'No learning hours yet (your target is ' || h.target || ').'
          else round(h.done, 1) || ' of your ' || h.target || ' hours.' end,
        case when h.signed = 1 then '1 signed off.' when h.signed > 1 then h.signed || ' signed off.' end,
        case when h.added = 0 or (h.target is not null and h.done < h.target) then 'Add anything else from this week before the weekend.' else 'Nice work.' end),
      jsonb_build_object('key', 'week_summary:' || h.id || ':' || today, 'open', case when h.target is not null and h.done < h.target then 'hours' else 'home' end, 'enrolment_id', h.id, 'app', 'evia')
    from h
    on conflict do nothing;
    get diagnostics n = row_count; made := made + n;
  end if;

  -- The people around each active learner: their assessors and tutors, and their employer (by learner_access).
  -- Used below for the staff and employer messages.
  create temporary table if not exists pg_temp.around (user_id uuid, organisation_id uuid, enrolment_id uuid, name text, who text) on commit drop;
  truncate pg_temp.around;
  insert into pg_temp.around
  select distinct om.user_id, e.organisation_id, e.id, coalesce(nullif(btrim(p.display_name), ''), 'A learner'),
    case when ro.code = 'employer' then 'employer' else 'staff' end
  from public.enrolments e
  join public.learners l on l.id = e.learner_id
  join public.organisation_members lm on lm.id = l.organisation_member_id and lm.active
  left join public.profiles p on p.id = lm.user_id
  join public.learner_access la on la.learner_id = e.learner_id and la.organisation_id = e.organisation_id
  join public.organisation_members om on om.id = la.organisation_member_id and om.active
  join public.organisation_member_roles omr on omr.organisation_member_id = om.id
  join public.roles ro on ro.id = omr.role_id and ro.code in ('assessor', 'tutor', 'employer')
  where e.status = 'active' and e.start_date <= today and e.end_date >= today;

  -- Employers: learning hours waiting more than 2 weeks for them to confirm (at most once a week).
  with w as (
    select a.user_id, min(a.organisation_id::text)::uuid as organisation_id, count(*) as entries,
      string_agg(distinct a.name, ', ') as names
    from pg_temp.around a
    join public.otj_entries ot on ot.enrolment_id = a.enrolment_id and ot.activity_type <> 'college' and ot.activity_date < today - 14
    where a.who = 'employer' and not exists (select 1 from public.otj_confirmations oc where oc.otj_entry_id = ot.id)
    group by a.user_id)
  insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
  select w.organisation_id, w.user_id, 'hours_waiting',
    'Learning hours waiting for you',
    case when w.entries = 1 then '1 entry' else w.entries || ' entries' end || ' from ' || w.names || ' ' || case when w.entries = 1 then 'has' else 'have' end ||
      ' been waiting over 2 weeks. It takes a tap to confirm ' || case when w.entries = 1 then 'it' else 'them' end || ' in Paros.',
    jsonb_build_object('key', 'hours_waiting:' || w.user_id || ':' || wk, 'open', 'hours', 'app', 'paros')
  from w
  on conflict do nothing;
  get diagnostics n = row_count; made := made + n;

  -- Learners: no evidence added for 3 weeks (at most once a week; not in their first 3 weeks).
  insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
  select e.organisation_id, om.user_id, 'evidence_quiet',
    'Time to add some evidence?',
    'Nothing new in Evia for 3 weeks. A few photos of this week’s work and a line about what you did is enough.',
    jsonb_build_object('key', 'evidence_quiet:' || e.id || ':' || wk, 'open', 'home', 'enrolment_id', e.id, 'app', 'evia')
  from public.enrolments e
  join public.learners l on l.id = e.learner_id
  join public.organisation_members om on om.id = l.organisation_member_id and om.active
  where e.status = 'active' and e.start_date <= today - 21 and e.end_date >= today
    and not exists (select 1 from public.evidence ev where ev.enrolment_id = e.id and ev.created_at > ago21)
  on conflict do nothing;
  get diagnostics n = row_count; made := made + n;

  -- Employers: their apprentice's progress review is in 7 days.
  with r as (
    select a.user_id, a.organisation_id, a.enrolment_id, a.name,
      (coalesce((select max(v.reviewed_at) from public.reviews v where v.enrolment_id = a.enrolment_id)::date,
        (select e.start_date from public.enrolments e where e.id = a.enrolment_id)) + 84) as due
    from pg_temp.around a where a.who = 'employer')
  insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
  select r.organisation_id, r.user_id, 'review_due_employer',
    r.name || '’s progress review is next week',
    'It’s on ' || trim(to_char(r.due, 'FMDay FMDD FMMonth')) || '. Confirm any learning hours waiting and add any feedback in Paros before then.',
    jsonb_build_object('key', 'review_due_employer:' || r.user_id || ':' || r.enrolment_id || ':' || r.due, 'open', 'apprentices', 'enrolment_id', r.enrolment_id, 'app', 'paros')
  from r where r.due - today = 7
  on conflict do nothing;
  get diagnostics n = row_count; made := made + n;

  -- Employers, on the first Monday of the month: rate how their apprentices are doing at work.
  if dow = 1 and extract(day from today) <= 7 then
    with b as (
      select a.user_id, min(a.organisation_id::text)::uuid as organisation_id, count(*) as total, string_agg(a.name, ', ' order by a.name) as names
      from pg_temp.around a
      where a.who = 'employer'
        and not exists (select 1 from public.behaviour_ratings br where br.enrolment_id = a.enrolment_id and br.created_at > ago28)
      group by a.user_id)
    insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
    select b.organisation_id, b.user_id, 'behaviours_due',
      'How are they doing at work?',
      'A minute in Paros to rate ' || b.names || ' this month. It goes to their assessor and counts towards their apprenticeship.',
      jsonb_build_object('key', 'behaviours_due:' || b.user_id || ':' || to_char(today, 'YYYY-MM'), 'open', 'feedback', 'app', 'paros')
    from b
    on conflict do nothing;
    get diagnostics n = row_count; made := made + n;
  end if;

  -- Fridays: who needs attention (assessors and tutors) and the apprentices' week (employers), one message each.
  if dow = 5 then
    with s as (
      select a.user_id, min(a.organisation_id::text)::uuid as organisation_id,
        count(*) filter (where q.waiting > 0) as to_assess, sum(q.waiting) as pieces,
        string_agg(a.name, ', ' order by a.name) filter (where q.overdue) as overdue,
        string_agg(a.name, ', ' order by a.name) filter (where q.quiet) as quiet
      from pg_temp.around a
      cross join lateral (select
        (select count(*) from public.evidence ev where ev.enrolment_id = a.enrolment_id
           and not exists (select 1 from public.assessments x where x.evidence_id = ev.id)) as waiting,
        (coalesce((select max(v.reviewed_at) from public.reviews v where v.enrolment_id = a.enrolment_id)::date,
           (select e.start_date from public.enrolments e where e.id = a.enrolment_id)) + 84) < today as overdue,
        (select e.start_date from public.enrolments e where e.id = a.enrolment_id) <= today - 21
          and not exists (select 1 from public.evidence ev where ev.enrolment_id = a.enrolment_id and ev.created_at > ago21) as quiet) q
      where a.who = 'staff'
      group by a.user_id)
    insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
    select s.organisation_id, s.user_id, 'staff_week',
      'Who needs attention',
      concat_ws(' ',
        case when s.pieces = 1 then '1 piece of evidence to assess.' when s.pieces > 1 then s.pieces || ' pieces of evidence to assess.' end,
        'Review overdue: ' || s.overdue || '.',
        'Nothing new for 3 weeks: ' || s.quiet || '.'),
      jsonb_build_object('key', 'staff_week:' || s.user_id || ':' || today, 'open', 'today', 'app', 'milos')
    from s where s.pieces > 0 or s.overdue is not null or s.quiet is not null
    on conflict do nothing;
    get diagnostics n = row_count; made := made + n;

    with p as (
      select a.user_id, min(a.organisation_id::text)::uuid as organisation_id,
        sum(q.waiting) as waiting, coalesce(sum(q.week), 0) as week,
        string_agg(a.name, ', ' order by a.name) filter (where q.due between 0 and 14) as reviews
      from pg_temp.around a
      cross join lateral (select
        (select count(*) from public.otj_entries ot where ot.enrolment_id = a.enrolment_id and ot.activity_type <> 'college'
           and not exists (select 1 from public.otj_confirmations oc where oc.otj_entry_id = ot.id)) as waiting,
        (select sum(ot.hours) from public.otj_entries ot where ot.enrolment_id = a.enrolment_id and ot.activity_type <> 'college' and ot.activity_date > today - 7) as week,
        (coalesce((select max(v.reviewed_at) from public.reviews v where v.enrolment_id = a.enrolment_id)::date,
           (select e.start_date from public.enrolments e where e.id = a.enrolment_id)) + 84) - today as due) q
      where a.who = 'employer'
      group by a.user_id)
    insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
    select p.organisation_id, p.user_id, 'employer_week',
      'Your apprentices this week',
      concat_ws(' ',
        case when p.week > 0 then round(p.week, 1) || ' hours of learning logged.' else 'No learning hours logged this week.' end,
        case when p.waiting = 1 then '1 entry waiting for you to confirm.' when p.waiting > 1 then p.waiting || ' entries waiting for you to confirm.' end,
        'Review in the next 2 weeks: ' || p.reviews || '.'),
      jsonb_build_object('key', 'employer_week:' || p.user_id || ':' || today, 'open', case when p.waiting > 0 then 'hours' else 'today' end, 'app', 'paros')
    from p
    on conflict do nothing;
    get diagnostics n = row_count; made := made + n;
  end if;

  -- Assessors and tutors, on a Monday: the reviews overdue or due this week for their learners, in one message.
  if dow = 1 then
    with d as (
      select e.id, e.learner_id, e.organisation_id, coalesce(nullif(btrim(p.display_name), ''), 'A learner') as name,
        (coalesce((select max(v.reviewed_at) from public.reviews v where v.enrolment_id = e.id)::date, e.start_date) + 84) - today as days
      from public.enrolments e
      join public.learners l on l.id = e.learner_id
      join public.organisation_members lm on lm.id = l.organisation_member_id
      left join public.profiles p on p.id = lm.user_id
      where e.status = 'active' and e.start_date <= today),
    s as (
      select distinct om.user_id, d.organisation_id, d.name, d.days
      from d
      join public.learner_access la on la.learner_id = d.learner_id and la.organisation_id = d.organisation_id
      join public.organisation_members om on om.id = la.organisation_member_id and om.active
      join public.organisation_member_roles omr on omr.organisation_member_id = om.id
      join public.roles ro on ro.id = omr.role_id and ro.code in ('assessor', 'tutor')
      where d.days <= 7),
    g as (
      select user_id, min(organisation_id::text)::uuid as organisation_id, count(*) as total,
        string_agg(name, ', ' order by days) filter (where days < 0) as late,
        string_agg(name, ', ' order by days) filter (where days >= 0) as soon
      from s group by user_id)
    insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
    select g.organisation_id, g.user_id, 'reviews_due',
      g.total || case when g.total = 1 then ' progress review' else ' progress reviews' end || ' to book',
      concat_ws(' ', 'Overdue: ' || g.late || '.', 'Due this week: ' || g.soon || '.'),
      jsonb_build_object('key', 'reviews_due:' || g.user_id || ':' || today, 'open', 'reviews')
    from g
    on conflict do nothing;
    get diagnostics n = row_count; made := made + n;
  end if;
  return made;
end;
$$;
revoke all on function private.course_reminders(date) from public, anon, authenticated;

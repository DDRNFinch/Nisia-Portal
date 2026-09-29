-- Push notifications for Evia (learners) and Milos (assessors and tutors): course things only.
-- The phones' subscriptions live in device_tokens (one row per app per phone). The triggers that already write
-- notifications (evidence submitted or assessed, targets, reviews, observations, witness testimony) are the source;
-- private.course_reminders() adds the dated ones once a day (reviews due, targets due, learning hours on a Friday,
-- and the Monday list of reviews for staff). Every 5 minutes, if anything is waiting, pg_cron calls the nisia-push
-- edge function, which groups, words and sends them, outside quiet hours.
-- The VAPID key and the cron key are in the vault (nisia_push_vapid, nisia_push_cron), created separately.

create extension if not exists pg_cron with schema pg_catalog;

alter table public.device_tokens
  add column if not exists app text check (app in ('evia', 'milos')),
  add column if not exists subscription jsonb;

alter table public.notifications
  add column if not exists pushed_at timestamptz,
  add column if not exists push_status text check (push_status in ('sent', 'grouped', 'capped', 'no_device', 'old', 'failed'));
update public.notifications set pushed_at = now(), push_status = 'old' where pushed_at is null;
create index if not exists notifications_push_pending on public.notifications (created_at) where pushed_at is null;
create unique index if not exists notifications_reminder_key on public.notifications ((data ->> 'key')) where data ? 'key';

-- For the edge function only (service role): its keys, what's waiting (with the names and units it needs to word
-- them), and the phones to send to.
create or replace function public.push_config() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'vapid', (select decrypted_secret::jsonb from vault.decrypted_secrets where name = 'nisia_push_vapid'),
    'cron', (select decrypted_secret from vault.decrypted_secrets where name = 'nisia_push_cron'));
$$;

create or replace function public.push_pending() returns table (
  id uuid, recipient_user_id uuid, notification_type text, title text, body text, data jsonb, created_at timestamptz,
  unit text, enrolment_id uuid, decision text, target_title text, learner_name text, sent_today int)
language sql security definer set search_path = '' as $$
  select n.id, n.recipient_user_id, n.notification_type, n.title, n.body, n.data, n.created_at,
    ev.title, ev.enrolment_id, a.decision, t.title, coalesce(nullif(btrim(p.display_name), ''), 'A learner'),
    (select count(*)::int from public.notifications s where s.recipient_user_id = n.recipient_user_id and s.push_status = 'sent'
       and s.pushed_at >= date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London')
  from public.notifications n
  left join public.evidence ev on ev.id = (n.data ->> 'evidence_id')::uuid
  left join public.assessments a on a.id = (n.data ->> 'assessment_id')::uuid
  left join public.targets t on t.id = (n.data ->> 'target_id')::uuid
  left join public.enrolments e on e.id = ev.enrolment_id
  left join public.learners l on l.id = e.learner_id
  left join public.organisation_members om on om.id = l.organisation_member_id
  left join public.profiles p on p.id = om.user_id
  where n.pushed_at is null and n.created_at > now() - interval '3 days'
  order by n.created_at
  limit 500;
$$;

revoke all on function public.push_config() from public, anon, authenticated;
revoke all on function public.push_pending() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;
grant execute on function public.push_pending() to service_role;

-- The dated reminders, once a day (lunchtime, when people on site look at their phones). Each has a key so it is
-- only ever made once.
create or replace function private.course_reminders() returns int
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Europe/London')::date;
  dow int := extract(isodow from (now() at time zone 'Europe/London'));
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

  -- Learners, on a Friday: under this week's share of their planned learning hours.
  if dow = 5 then
    with h as (
      select e.id, e.organisation_id, om.user_id,
        round(e.planned_otj_hours / greatest(1, (e.end_date - e.start_date) / 7.0), 1) as target,
        coalesce((select sum(o.hours) from public.otj_entries o where o.enrolment_id = e.id and o.activity_date > today - 7), 0) as done
      from public.enrolments e
      join public.learners l on l.id = e.learner_id
      join public.organisation_members om on om.id = l.organisation_member_id and om.active
      where e.status = 'active' and e.start_date <= today and e.end_date >= today and coalesce(e.planned_otj_hours, 0) > 0)
    insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
    select h.organisation_id, h.user_id, 'hours_week', 'Learning hours this week',
      case when h.done = 0 then 'Nothing logged yet this week. Your target is ' || h.target || ' hours: add what you’ve done on site or at college.'
        else 'You’ve logged ' || round(h.done, 1) || ' of your ' || h.target || ' hours. Add anything else from this week before the weekend.' end,
      jsonb_build_object('key', 'hours_week:' || h.id || ':' || today, 'open', 'hours', 'enrolment_id', h.id)
    from h where h.done < h.target
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
revoke all on function private.course_reminders() from public, anon, authenticated;

-- The schedule. Sending only calls the edge function when something is waiting.
select cron.unschedule(jobname) from cron.job where jobname in ('nisia-push', 'nisia-reminders');
select cron.schedule('nisia-reminders', '50 11 * * *', $$ select private.course_reminders() $$);
select cron.schedule('nisia-push', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://ffgfigkeeeauzkifopei.supabase.co/functions/v1/nisia-push',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-push-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nisia_push_cron')),
    body := '{"run":"send"}'::jsonb, timeout_milliseconds := 30000)
  where exists (select 1 from public.notifications where pushed_at is null and created_at > now() - interval '3 days')
$$);

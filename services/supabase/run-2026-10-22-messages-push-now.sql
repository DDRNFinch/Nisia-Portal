-- Messages reach the other person's phone straight away, instead of waiting for the 5-minute send
-- (push-notifications.sql). When a message notification is written, the database asks nisia-push to send now.
-- One call per batch (a group message is one call, not one per person). The call is queued by pg_net and only
-- goes after the message is saved; if it ever fails, the 5-minute send still picks the notification up.

create or replace function private.push_now() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from new_rows where notification_type = 'message' and pushed_at is null) then
    begin
      perform net.http_post(
        url := 'https://ffgfigkeeeauzkifopei.supabase.co/functions/v1/nisia-push',
        headers := jsonb_build_object('Content-Type', 'application/json',
          'x-push-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nisia_push_cron')),
        body := '{"run":"send"}'::jsonb, timeout_milliseconds := 30000);
    exception when others then null; -- never stop a message being sent; the 5-minute send is the backstop
    end;
  end if;
  return null;
end $$;
revoke all on function private.push_now() from public, anon, authenticated;

drop trigger if exists notifications_push_now on public.notifications;
create trigger notifications_push_now after insert on public.notifications
  referencing new table as new_rows for each statement execute function private.push_now();

-- Messages don't use up the 4 alerts a day for everything else.
create or replace function public.push_pending() returns table (
  id uuid, recipient_user_id uuid, notification_type text, title text, body text, data jsonb, created_at timestamptz,
  unit text, enrolment_id uuid, decision text, target_title text, learner_name text, sent_today int)
language sql security definer set search_path = '' as $$
  select n.id, n.recipient_user_id, n.notification_type, n.title, n.body, n.data, n.created_at,
    ev.title, ev.enrolment_id, a.decision, t.title, coalesce(nullif(btrim(p.display_name), ''), 'A learner'),
    (select count(*)::int from public.notifications s where s.recipient_user_id = n.recipient_user_id and s.push_status = 'sent'
       and s.notification_type <> 'message'
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
revoke all on function public.push_pending() from public, anon, authenticated;

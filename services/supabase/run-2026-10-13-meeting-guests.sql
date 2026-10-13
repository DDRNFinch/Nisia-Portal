-- Meeting guests: people (investors, visitors) added to a college as learners for one meeting, so they can try Evia on
-- their own phones: check in to the meeting class, take a photo, do the quiz. Each one ends by itself (24 hours after
-- the meeting starts, or sooner from the portal): their account, everything they made (photos included) and their
-- name are deleted, and the meeting class goes with the last of them. Their Evia shows "This demo has ended".
-- Only the server (nisia-admin) writes this table; the college's admins can read their own college's guests.

create table if not exists public.meeting_guests (
  learner_id uuid primary key references public.learners(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null,
  enrolment_id uuid not null,
  class_id uuid,
  name text not null,
  meeting text not null,
  expires_at timestamptz not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.meeting_guests enable row level security;
create index if not exists meeting_guests_expiry on public.meeting_guests (expires_at);

-- Evia: is this learner a meeting guest, and when does their demo end? (null for everyone else)
create or replace function public.nisia_my_demo() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('endsAt', g.expires_at, 'meeting', g.meeting)
  from public.meeting_guests g where g.user_id = auth.uid() order by g.expires_at desc limit 1;
$$;
grant execute on function public.nisia_my_demo() to authenticated;

-- The portal: this college's meeting guests, for its admins (and the master admin).
create or replace function public.nisia_meeting_guests(p_org uuid) returns table (learner_id uuid, name text, meeting text, class_id uuid, expires_at timestamptz, paired boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (private.can_manage_org(p_org) or private.is_platform_admin()) then raise exception 'Only the college’s admins can see meeting guests.'; end if;
  return query select g.learner_id, g.name, g.meeting, g.class_id, g.expires_at,
    exists (select 1 from public.evia_pairing_tokens t where t.learner_id = g.learner_id and t.used_at is not null)
  from public.meeting_guests g where g.organisation_id = p_org order by g.meeting, g.name;
end $$;
grant execute on function public.nisia_meeting_guests(uuid) to authenticated;

-- Every 10 minutes: if any guest's time is up, nisia-admin ends them (it removes their photos through the storage
-- service, then their account, which takes everything else with it). Uses the same key as the push job.
-- (Only where the scheduler is installed: the live Evia Portal, not the test database.)
do $do$ begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then return; end if;
  if exists (select 1 from cron.job where jobname = 'nisia-meeting-guests') then perform cron.unschedule('nisia-meeting-guests'); end if;
  perform cron.schedule('nisia-meeting-guests', '*/10 * * * *', $cron$
  select net.http_post(
    url := 'https://ffgfigkeeeauzkifopei.supabase.co/functions/v1/nisia-admin',
    headers := jsonb_build_object('Content-Type', 'application/json',
      -- the public app key (the function only takes calls with one), and the job's own secret
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ2ZpZ2tlZWVhdXpraWZvcGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTQ5NTgsImV4cCI6MjEwMzY3MDk1OH0.S7HH0SSWMtnC9bwZWAm0F57V7s6RNWhWhBpxODLuG8I',
      'x-push-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nisia_push_cron')),
    body := '{"action":"end_guests"}'::jsonb, timeout_milliseconds := 60000)
  where exists (select 1 from public.meeting_guests where expires_at <= now())
$cron$);
end $do$;

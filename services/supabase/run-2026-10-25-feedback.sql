-- Rate Evia, and clearer usage figures.
-- 1. Learners rate Evia from the bottom of Review: 1 to 5 stars and what they think (both needed), and if they choose, the
--    numbers of their time with Evia week by week (evidence, hours, lessons, tests). No name, photos, write-ups or
--    sign-in: anyone with Evia can send one. A random code made on their phone (fid) means a learner who rates
--    again counts once in the results; it can't be traced to anyone.
-- 2. The testers and the owner's own devices are marked when they send usage or feedback (tester), so the master
--    admin's Usage page can leave them out (it does unless asked, and the test college with them).
-- 3. The Usage page can show everyone, only learners joined to a college (connected), or only those using Evia on
--    their own (not connected).
-- Adds a table, a column and functions; changes no existing data.

alter table public.usage_daily add column if not exists tester boolean not null default false;

CREATE OR REPLACE FUNCTION public.nisia_usage_ping(p jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_day date; v_counts jsonb := '{}'::jsonb; k text; v jsonb; v_org uuid; n int := 0;
begin
  v_day := (p->>'day')::date;
  if v_day is null or v_day > current_date + 1 or v_day < current_date - 14 then return; end if;
  if (p->>'app') not in ('evia','milos','portal','symi','paros') then return; end if;
  for k, v in select * from jsonb_each(coalesce(p->'counts','{}'::jsonb)) loop
    n := n + 1; exit when n > 120;
    if k ~ '^[a-z0-9_.-]{1,48}$' and jsonb_typeof(v) = 'number' and (v::text)::numeric between 1 and 5000 then
      v_counts := v_counts || jsonb_build_object(k, floor((v::text)::numeric)::int);
    end if;
  end loop;
  if auth.uid() is not null then
    select om.organisation_id into v_org from public.organisation_members om where om.user_id = auth.uid() and om.active order by om.created_at limit 1;
  end if;
  insert into public.usage_daily(day, app, version, course, platform, organisation_id, counts, tester)
  values (v_day, p->>'app', left(p->>'version', 24), left(p->>'course', 24), left(p->>'platform', 24), v_org, v_counts,
    coalesce(p->>'tester', '') = 'true');
end $function$;
revoke all on function public.nisia_usage_ping(jsonb) from public;
grant execute on function public.nisia_usage_ping(jsonb) to anon, authenticated;

create table if not exists public.evia_feedback (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  app text not null default 'evia' check (app in ('evia','milos','portal','symi','paros')),
  stars int not null check (stars between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 2000),
  course text, version text, platform text,
  fid text,
  connected boolean,
  tester boolean not null default false,
  usage jsonb);
create index if not exists evia_feedback_at on public.evia_feedback(created_at);
alter table public.evia_feedback enable row level security;
revoke all on public.evia_feedback from anon, authenticated;

CREATE OR REPLACE FUNCTION public.nisia_feedback_send(p jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_stars int; v_comment text := btrim(coalesce(p->>'comment', '')); v_usage jsonb := p->'usage';
begin
  begin v_stars := (p->>'stars')::int; exception when others then return; end;
  if v_stars is null or v_stars not between 1 and 5 or char_length(v_comment) < 10 then return; end if;
  if (p->>'app') is not null and (p->>'app') not in ('evia','milos','portal','symi','paros') then return; end if;
  if v_usage is not null and (jsonb_typeof(v_usage) <> 'object' or octet_length(v_usage::text) > 40000) then v_usage := null; end if;
  -- A flood guard: anyone can send, so no more than 60 a minute between everyone.
  if (select count(*) from public.evia_feedback where created_at > now() - interval '1 minute') >= 60 then return; end if;
  insert into public.evia_feedback(app, stars, comment, course, version, platform, fid, connected, tester, usage)
  values (coalesce(p->>'app', 'evia'), v_stars, left(v_comment, 2000), left(p->>'course', 24), left(p->>'version', 32), left(p->>'platform', 24),
    left(p->>'fid', 40), case p->>'connected' when 'true' then true when 'false' then false end, coalesce(p->>'tester', '') = 'true', v_usage);
end $function$;
revoke all on function public.nisia_feedback_send(jsonb) from public;
grant execute on function public.nisia_feedback_send(jsonb) to anon, authenticated;

-- The master admin's Usage page (nisia_admin_usage_by): the testers and own devices left out unless p_testing.
-- The old nisia_admin_usage stays as it was, for the portal until it updates.
CREATE OR REPLACE FUNCTION private.admin_usage(v_from date, p_testing boolean, p_who text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  with u as (select u.* from public.usage_daily u left join public.organisations o on o.id = u.organisation_id
             where (p_testing or (not coalesce(o.is_test, false) and not u.tester))
               and (p_who = 'all' or (p_who = 'connected') = (u.organisation_id is not null)))
  select jsonb_build_object(
    'from', v_from,
    'apps', (select coalesce(jsonb_agg(jsonb_build_object('app', app, 'device_days', n, 'connected', c, 'days', d) order by app), '[]')
             from (select app, count(*) n, count(organisation_id) c, count(distinct day) d from u where day >= v_from group by app) s),
    'features', (select coalesce(jsonb_agg(jsonb_build_object('app', app, 'feature', key, 'uses', uses, 'device_days', n) order by uses desc), '[]')
             from (select u.app, c.key, sum((c.value::text)::int) uses, count(*) n from u, jsonb_each(u.counts) c where u.day >= v_from group by u.app, c.key) s),
    'weeks', (select coalesce(jsonb_agg(jsonb_build_object('week', w, 'app', app, 'device_days', n) order by w, app), '[]')
             from (select date_trunc('week', day)::date w, app, count(*) n from u where day >= current_date - 84 group by 1, 2) s),
    'platforms', (select coalesce(jsonb_agg(jsonb_build_object('app', app, 'platform', p, 'version', v, 'device_days', n) order by n desc), '[]')
             from (select app, coalesce(platform, '?') p, coalesce(version, '?') v, count(*) n from u where day >= v_from group by 1, 2, 3) s),
    'courses', (select coalesce(jsonb_agg(jsonb_build_object('course', cr, 'device_days', n) order by n desc), '[]')
             from (select coalesce(course, '?') cr, count(*) n from u where day >= v_from and app = 'evia' group by 1) s),
    'left_out', (select count(*) from public.usage_daily x left join public.organisations o on o.id = x.organisation_id
                 where x.day >= v_from and not p_testing and (x.tester or coalesce(o.is_test, false))));
$function$;

CREATE OR REPLACE FUNCTION public.nisia_admin_usage_by(p_days integer DEFAULT 30, p_testing boolean DEFAULT false, p_who text DEFAULT 'all')
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_from date := current_date - greatest(1, least(p_days, 365));
begin
  if not private.is_platform_admin() then raise exception 'Not allowed'; end if;
  return private.admin_usage(v_from, coalesce(p_testing, false), case when p_who in ('connected', 'unconnected') then p_who else 'all' end);
end $function$;
revoke all on function public.nisia_admin_usage_by(integer, boolean, text) from public, anon;
grant execute on function public.nisia_admin_usage_by(integer, boolean, text) to authenticated;

-- The feedback, for the master admin: the latest 1000 in the period.
CREATE OR REPLACE FUNCTION public.nisia_admin_feedback(p_days integer DEFAULT 365, p_testing boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
begin
  if not private.is_platform_admin() then raise exception 'Not allowed'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(f) - 'id' order by f.created_at desc), '[]'::jsonb) from (
    select created_at, app, stars, comment, course, version, platform, fid, connected, tester, usage from public.evia_feedback
    where created_at >= now() - make_interval(days => greatest(1, least(p_days, 3650))) and (coalesce(p_testing, false) or not tester)
    order by created_at desc limit 1000) f);
end $function$;
revoke all on function public.nisia_admin_feedback(integer, boolean) from public, anon;
grant execute on function public.nisia_admin_feedback(integer, boolean) to authenticated;

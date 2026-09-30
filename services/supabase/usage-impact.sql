-- Usage (which features are used, for the master admin) and each college's impact report.
-- Apps send one row a day per device: counts only, no identifier. The college comes from the sign-in, if any.
create table if not exists public.usage_daily (
  id bigserial primary key,
  day date not null,
  app text not null check (app in ('evia','milos','portal','symi','paros')),
  version text, course text, platform text,
  organisation_id uuid references public.organisations(id) on delete set null,
  counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now());
create index if not exists usage_daily_day on public.usage_daily(day);
create index if not exists usage_daily_org on public.usage_daily(organisation_id, day);
alter table public.usage_daily enable row level security;
revoke all on public.usage_daily from anon, authenticated;

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
  insert into public.usage_daily(day, app, version, course, platform, organisation_id, counts)
  values (v_day, p->>'app', left(p->>'version', 24), left(p->>'course', 24), left(p->>'platform', 24), v_org, v_counts);
end $function$;
revoke all on function public.nisia_usage_ping(jsonb) from public;
grant execute on function public.nisia_usage_ping(jsonb) to anon, authenticated;

CREATE OR REPLACE FUNCTION private.admin_usage(v_from date)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  with u as (select u.* from public.usage_daily u left join public.organisations o on o.id = u.organisation_id where not coalesce(o.is_test, false))
  select jsonb_build_object(
    'from', v_from,
    'apps', (select coalesce(jsonb_agg(jsonb_build_object('app', app, 'device_days', n, 'connected', c) order by app), '[]')
             from (select app, count(*) n, count(organisation_id) c from u where day >= v_from group by app) s),
    'features', (select coalesce(jsonb_agg(jsonb_build_object('app', app, 'feature', key, 'uses', uses, 'device_days', n) order by uses desc), '[]')
             from (select u.app, c.key, sum((c.value::text)::int) uses, count(*) n from u, jsonb_each(u.counts) c where u.day >= v_from group by u.app, c.key) s),
    'weeks', (select coalesce(jsonb_agg(jsonb_build_object('week', w, 'app', app, 'device_days', n) order by w, app), '[]')
             from (select date_trunc('week', day)::date w, app, count(*) n from u where day >= current_date - 84 group by 1, 2) s),
    'platforms', (select coalesce(jsonb_agg(jsonb_build_object('app', app, 'platform', p, 'version', v, 'device_days', n) order by n desc), '[]')
             from (select app, coalesce(platform, '?') p, coalesce(version, '?') v, count(*) n from u where day >= v_from group by 1, 2, 3) s),
    'courses', (select coalesce(jsonb_agg(jsonb_build_object('course', cr, 'device_days', n) order by n desc), '[]')
             from (select coalesce(course, '?') cr, count(*) n from u where day >= v_from and app = 'evia' group by 1) s));
$function$;

CREATE OR REPLACE FUNCTION public.nisia_admin_usage(p_days integer DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_from date := current_date - greatest(1, least(p_days, 365));
begin
  if not private.is_platform_admin() then raise exception 'Not allowed'; end if;
  return private.admin_usage(v_from);
end $function$;
revoke all on function public.nisia_admin_usage(integer) from public, anon;
grant execute on function public.nisia_admin_usage(integer) to authenticated;

-- A college's impact report for a period: college admin, quality and the master admin.
CREATE OR REPLACE FUNCTION public.nisia_college_impact(p_org uuid, p_from date, p_to date)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare r jsonb; v_weeks numeric;
begin
  if not private.mfa_ok() or not (private.can_manage_org(p_org) or private.has_role(p_org,'quality') or private.is_platform_admin()) then raise exception 'Not allowed'; end if;
  if p_to <= p_from then raise exception 'The end must be after the start'; end if;
  v_weeks := greatest(1, (p_to - p_from) / 7.0);
  with enr as (
      select e.id, e.start_date, e.end_date, e.planned_otj_hours, l.organisation_member_id m
      from public.enrolments e join public.learners l on l.id = e.learner_id
      where e.organisation_id = p_org and e.start_date < p_to and e.end_date >= p_from),
    ev as (select v.id, v.enrolment_id, v.created_at from public.evidence v join enr on enr.id = v.enrolment_id and v.created_by_member_id = enr.m
           where v.created_at >= p_from and v.created_at < p_to),
    firsta as (select a.evidence_id, min(a.created_at) at from public.assessments a where a.organisation_id = p_org group by a.evidence_id),
    asd as (select a.* from public.assessments a join enr on true join public.evidence v on v.id = a.evidence_id and v.enrolment_id = enr.id
            where a.created_at >= p_from and a.created_at < p_to),
    hrs as (select o.enrolment_id, o.hours from public.otj_entries o join enr on enr.id = o.enrolment_id where o.activity_date >= p_from and o.activity_date < p_to),
    act as (select enrolment_id from ev union select enrolment_id from hrs
            union select r.enrolment_id from public.evia_records r join enr on enr.id = r.enrolment_id where r.updated_at >= p_from and r.updated_at < p_to),
    lastrev as (select enr.id, max(v.reviewed_at) last from enr left join public.reviews v on v.enrolment_id = enr.id and v.reviewed_at < p_to group by enr.id),
    att as (select a.minutes, a.status from public.class_attendance a join enr on enr.id = a.enrolment_id where a.confirmed_at >= p_from and a.confirmed_at < p_to),
    use as (select c.key, sum((c.value::text)::int) n from public.usage_daily u, jsonb_each(u.counts) c
            where u.organisation_id = p_org and u.day >= p_from and u.day < p_to group by c.key)
  select jsonb_build_object(
    'from', p_from, 'to', p_to, 'weeks', round(v_weeks, 1),
    'learners', (select count(*) from enr),
    'engaged', (select count(distinct enrolment_id) from act),
    'evidence', (select count(*) from ev),
    'assessed', (select count(*) from asd),
    'accepted', (select count(*) from asd where decision = 'accepted'),
    'turnaround_days', (select round((percentile_cont(0.5) within group (order by extract(epoch from f.at - ev.created_at) / 86400))::numeric, 1)
                        from ev join firsta f on f.evidence_id = ev.id),
    'waiting_over_7_days', (select count(*) from ev left join firsta f on f.evidence_id = ev.id where f.at is null and ev.created_at < now() - interval '7 days'),
    'hours', (select round(coalesce(sum(hours), 0), 1) from hrs),
    'planned_hours', (select round(coalesce(sum(planned_otj_hours * greatest(0, least(p_to, end_date) - greatest(p_from, start_date)) / nullif(end_date - start_date, 0)), 0), 1) from enr),
    'reviews', (select count(*) from public.reviews v join enr on enr.id = v.enrolment_id where v.reviewed_at >= p_from and v.reviewed_at < p_to),
    'reviews_overdue', (select count(*) from enr join lastrev lr on lr.id = enr.id
                        where enr.start_date < p_to - 84 and coalesce(lr.last, enr.start_date::timestamptz) < p_to - interval '84 days'),
    'attendance', (select count(*) filter (where status = 'present') from att),
    'attendance_minutes', (select coalesce(sum(minutes), 0) from att where status = 'present'),
    'evia', (select coalesce(jsonb_object_agg(key, n), '{}') from use),
    'devices', (select count(*) from public.usage_daily u where u.organisation_id = p_org and u.app = 'evia' and u.day >= p_from and u.day < p_to)
  ) into r;
  return r;
end $function$;
revoke all on function public.nisia_college_impact(uuid, date, date) from public, anon;
grant execute on function public.nisia_college_impact(uuid, date, date) to authenticated;

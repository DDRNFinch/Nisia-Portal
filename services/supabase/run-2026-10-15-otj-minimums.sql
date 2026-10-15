-- Each course's minimum off-the-job training hours (Skills England publishes one per standard; never below 187).
-- New learners on the course start from it, Evia's weekly learning target follows it, and the Portal warns when a
-- learner's planned hours fall below it.
alter table public.courses add column if not exists min_otj_hours numeric;
alter table public.courses drop constraint if exists courses_min_otj_hours_floor;
alter table public.courses add constraint courses_min_otj_hours_floor check (min_otj_hours is null or min_otj_hours >= 187);

create or replace function public.nisia_standards() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_admin boolean := private.is_platform_admin();
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  return jsonb_build_object('courses', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'title', c.title, 'version_id', c.qualification_version_id,
      'option', c.qualification_option, 'min_otj_hours', c.min_otj_hours, 'enrolments', (select count(*) from public.enrolments e where e.course_id = c.id)) order by c.title) from public.courses c), '[]'::jsonb),
    'standards', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'code', q.code, 'kind', q.kind, 'title', q.title, 'awarding_body', q.awarding_body, 'level', q.level,
    'versions', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'version', v.version, 'status', v.status, 'options', v.options, 'source_url', v.source_url,
        'published_at', v.published_at, 'created_at', v.created_at,
        'counts', (select jsonb_object_agg(k, n) from (select r.kind k, count(*) n from public.requirements r where r.version_id = v.id group by r.kind) c),
        'courses', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'title', c.title, 'option', c.qualification_option) order by c.title)
          from public.courses c where c.qualification_version_id = v.id), '[]'::jsonb),
        'enrolments', (select count(*) from public.enrolments e where e.qualification_version_id = v.id))
      order by v.created_at desc) from public.qualification_versions v where v.qualification_id = q.id and (v.status = 'published' or v_admin)), '[]'::jsonb))
    order by q.code) from public.qualifications q where v_admin or exists (select 1 from public.qualification_versions v where v.qualification_id = q.id and v.status = 'published')), '[]'::jsonb));
end $$;

-- The master admin sets a course's minimum (or clears it).
create or replace function public.admin_set_course_min_otj(p_course uuid, p_hours numeric) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'Only the master admin can change a course''s minimum hours.'; end if;
  if p_hours is not null and p_hours < 187 then raise exception 'The minimum can''t be below 187 hours (the funding rules'' floor).'; end if;
  update public.courses set min_otj_hours = p_hours where id = p_course;
  if not found then raise exception 'That course isn''t in Evia.'; end if;
end $$;

-- Every signed-in member: each course's minimum, by course code, for the learner forms.
create or replace function public.nisia_course_minimums() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(c.code, c.min_otj_hours), '{}'::jsonb) from public.courses c
  where auth.uid() is not null and c.min_otj_hours is not null
$$;

revoke all on function public.admin_set_course_min_otj(uuid, numeric), public.nisia_course_minimums() from public, anon;
grant execute on function public.admin_set_course_min_otj(uuid, numeric), public.nisia_course_minimums() to authenticated;

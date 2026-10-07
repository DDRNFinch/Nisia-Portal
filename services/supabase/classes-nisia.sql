-- Classes set up in Nisia. The college's admin makes each class once in the portal: its name, course, tutor, days
-- and times, start and end dates, room and learners. It becomes the tutor's register in Symi (nothing to set up on the
-- phone), every class day in each learner's Evia, and the attendance reports. Tutors can still change their own
-- classes in Symi (symi_save_class); admins can change any class here.
--
--   nisia_save_class      make or change a class, adding its learners (admins; the portal removes any taken off)
--   nisia_add_to_class    put a learner (their current enrolment) on a class (admins)
--   nisia_archive_class   end a class: it leaves Symi and Evia, its registers stay (admins)
--   nisia_classes         a college's classes (admins and quality: all; tutors: their own)
--   symi_my_classes       the tutor's classes, for Symi to keep its registers in step

alter table public.classes add column if not exists course_code text check (length(course_code) <= 60);
alter table public.classes add column if not exists managed boolean not null default false;
alter table public.classes add column if not exists archived_at timestamptz;

create or replace function public.nisia_save_class(p_org uuid, p_title text, p_tutor uuid, p_schedule jsonb, p_course text default null,
  p_room text default null, p_enrolments uuid[] default '{}', p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_ref text; e uuid;
begin
  if auth.uid() is null or not private.mfa_ok() then raise exception 'Sign in to Nisia with your authenticator app first.'; end if;
  if not private.can_manage_org(p_org) then raise exception 'Only the college’s admins can set up classes.'; end if;
  if nullif(trim(coalesce(p_title, '')), '') is null then raise exception 'Give the class a name.'; end if;
  if not exists (select 1 from public.organisation_members m where m.id = p_tutor and m.organisation_id = p_org and m.active)
    then raise exception 'Choose a tutor at this college.'; end if;
  if coalesce(p_schedule->>'start', '') = '' or coalesce(p_schedule->>'end', '') = '' then raise exception 'Choose the start and end times.'; end if;
  if jsonb_array_length(coalesce(p_schedule->'recurrence'->'weekdays', '[]'::jsonb)) = 0 and coalesce(p_schedule->'recurrence'->>'type', '') <> 'once'
    then raise exception 'Choose the day or days the class is on.'; end if;
  foreach e in array coalesce(p_enrolments, '{}') loop
    if not exists (select 1 from public.enrolments en where en.id = e and en.organisation_id = p_org) then raise exception 'A learner on this class isn’t at this college.'; end if;
  end loop;
  if p_id is null then
    v_ref := 'nisia-' || gen_random_uuid()::text;
    insert into public.classes (organisation_id, tutor_member_id, client_ref, title, room, schedule, course_code, managed, updated_at)
    values (p_org, p_tutor, v_ref, left(trim(p_title), 120), left(nullif(trim(coalesce(p_room, '')), ''), 120), coalesce(p_schedule, '{}'::jsonb), nullif(p_course, ''), true, now())
    returning id into v_id;
  else
    update public.classes set title = left(trim(p_title), 120), tutor_member_id = p_tutor, room = left(nullif(trim(coalesce(p_room, '')), ''), 120),
      schedule = coalesce(p_schedule, '{}'::jsonb), course_code = nullif(p_course, ''), updated_at = now()
    where id = p_id and organisation_id = p_org returning id into v_id;
    if v_id is null then raise exception 'That class isn’t at this college.'; end if;
  end if;
  -- Learners taken off the class are removed by the portal itself, under the class_learners rules (admins may).
  insert into public.class_learners (class_id, enrolment_id, organisation_id)
  select v_id, x, p_org from unnest(coalesce(p_enrolments, '{}')) x on conflict do nothing;
  return v_id;
end $$;

create or replace function public.nisia_add_to_class(p_class uuid, p_learner uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_c public.classes; v_e uuid;
begin
  select * into v_c from public.classes where id = p_class;
  if v_c.id is null or not private.mfa_ok() or not private.can_manage_org(v_c.organisation_id) then raise exception 'You can’t change this class.'; end if;
  select e.id into v_e from public.enrolments e where e.learner_id = p_learner and e.organisation_id = v_c.organisation_id order by e.created_at desc limit 1;
  if v_e is null then raise exception 'That learner isn’t at this college.'; end if;
  insert into public.class_learners (class_id, enrolment_id, organisation_id) values (v_c.id, v_e, v_c.organisation_id) on conflict do nothing;
  update public.classes set updated_at = now() where id = v_c.id;
end $$;

create or replace function public.nisia_archive_class(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select organisation_id into v_org from public.classes where id = p_id;
  if v_org is null or not private.mfa_ok() or not private.can_manage_org(v_org) then raise exception 'You can’t end this class.'; end if;
  update public.classes set archived_at = now(), updated_at = now() where id = p_id;
end $$;

create or replace function public.nisia_classes(p_org uuid) returns table (
  id uuid, title text, course_code text, room text, schedule jsonb, managed boolean, tutor_member_id uuid, tutor text, updated_at timestamptz,
  learners jsonb, sessions_done int, last_session date)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.course_code, c.room, c.schedule, c.managed, c.tutor_member_id, coalesce(p.display_name, ''), c.updated_at,
    coalesce((select jsonb_agg(jsonb_build_object('enrolment_id', cl.enrolment_id, 'name', private.enrolment_name(cl.enrolment_id)) order by private.enrolment_name(cl.enrolment_id))
      from public.class_learners cl where cl.class_id = c.id), '[]'::jsonb),
    (select count(*)::int from public.class_sessions s where s.class_id = c.id and s.status = 'finished'),
    (select max(s.session_date) from public.class_sessions s where s.class_id = c.id and s.status = 'finished')
  from public.classes c
  join public.organisation_members m on m.id = c.tutor_member_id
  left join public.profiles p on p.id = m.user_id
  where c.organisation_id = p_org and c.archived_at is null and private.mfa_ok()
    and (private.can_manage_org(p_org) or private.has_role(p_org, 'quality') or c.tutor_member_id = private.current_member_id(p_org))
  order by c.title;
$$;

create or replace function public.symi_my_classes() returns table (
  id uuid, organisation_id uuid, client_ref text, title text, course_code text, room text, schedule jsonb, managed boolean, updated_at timestamptz, learners jsonb)
language sql stable security definer set search_path = '' as $$
  select c.id, c.organisation_id, c.client_ref, c.title, c.course_code, c.room, c.schedule, c.managed, c.updated_at,
    coalesce((select jsonb_agg(jsonb_build_object('enrolment_id', cl.enrolment_id, 'name', private.enrolment_name(cl.enrolment_id)))
      from public.class_learners cl where cl.class_id = c.id), '[]'::jsonb)
  from public.classes c
  join public.organisation_members m on m.id = c.tutor_member_id
  where m.user_id = auth.uid() and m.active and c.archived_at is null and private.mfa_ok()
  order by c.title;
$$;

grant execute on function public.nisia_save_class(uuid, text, uuid, jsonb, text, text, uuid[], uuid) to authenticated;
grant execute on function public.nisia_add_to_class(uuid, uuid) to authenticated;
grant execute on function public.nisia_archive_class(uuid) to authenticated;
grant execute on function public.nisia_classes(uuid) to authenticated;
grant execute on function public.symi_my_classes() to authenticated;

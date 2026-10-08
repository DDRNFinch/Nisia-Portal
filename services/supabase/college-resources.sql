-- The college's own teaching resources, shared by its tutors from Symi or added by its admins in the Nisia portal:
-- slides, quizzes, lesson plans (their content, so any tutor at the college can teach from them) and links to files
-- the college keeps elsewhere (PowerPoints on SharePoint, videos). Every tutor at the college sees them in Symi's
-- Resources › College. Taking one down archives it (whoever shared it, or the college's admins).
--
--   nisia_college_resources   a college's resources (its staff)
--   nisia_share_resource      share one (tutors and admins)
--   nisia_unshare_resource    take one down (who shared it, or admins)

create table if not exists public.college_resources (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  kind text not null check (kind in ('slides', 'quiz', 'lesson', 'link')),
  title text not null check (length(title) between 1 and 200),
  course_code text check (length(course_code) <= 60),
  unit text check (length(unit) <= 200),
  content jsonb not null default '{}'::jsonb,
  url text check (length(url) <= 2000),
  shared_by_member_id uuid references public.organisation_members(id),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists college_resources_org on public.college_resources (organisation_id, created_at desc);
alter table public.college_resources enable row level security;

create or replace function public.nisia_college_resources(p_org uuid) returns table (
  id uuid, kind text, title text, course_code text, unit text, content jsonb, url text, shared_by text, mine boolean, can_remove boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.kind, r.title, r.course_code, r.unit, r.content, r.url, coalesce(p.display_name, ''),
    r.shared_by_member_id = private.current_member_id(p_org),
    r.shared_by_member_id = private.current_member_id(p_org) or private.can_manage_org(p_org), r.created_at
  from public.college_resources r
  left join public.organisation_members m on m.id = r.shared_by_member_id
  left join public.profiles p on p.id = m.user_id
  where r.organisation_id = p_org and r.archived_at is null and private.mfa_ok() and private.current_member_id(p_org) is not null
    and (private.has_role(p_org, 'tutor') or private.has_role(p_org, 'assessor') or private.has_role(p_org, 'quality') or private.can_manage_org(p_org))
  order by r.created_at desc limit 500;
$$;

create or replace function public.nisia_share_resource(p_org uuid, p_kind text, p_title text, p_course text default null, p_unit text default null,
  p_content jsonb default '{}'::jsonb, p_url text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or not private.mfa_ok() then raise exception 'Sign in to Nisia with your authenticator app first.'; end if;
  if not (private.has_role(p_org, 'tutor') or private.can_manage_org(p_org)) then raise exception 'Only the college’s tutors and admins can share resources.'; end if;
  if p_kind not in ('slides', 'quiz', 'lesson', 'link') then raise exception 'That kind of resource can’t be shared yet.'; end if;
  if nullif(trim(coalesce(p_title, '')), '') is null then raise exception 'Give it a name.'; end if;
  if p_kind = 'link' and coalesce(p_url, '') !~* '^https?://' then raise exception 'Add the link, starting https://'; end if;
  if pg_column_size(p_content) > 400000 then raise exception 'That’s too big to share. Take out some pictures and try again.'; end if;
  insert into public.college_resources (organisation_id, kind, title, course_code, unit, content, url, shared_by_member_id)
  values (p_org, p_kind, left(trim(p_title), 200), nullif(p_course, ''), left(nullif(trim(coalesce(p_unit, '')), ''), 200), coalesce(p_content, '{}'::jsonb),
    case when p_kind = 'link' then left(p_url, 2000) end, private.current_member_id(p_org))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.nisia_unshare_resource(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.college_resources;
begin
  select * into v from public.college_resources where id = p_id;
  if v.id is null or not private.mfa_ok() or not (v.shared_by_member_id = private.current_member_id(v.organisation_id) or private.can_manage_org(v.organisation_id))
    then raise exception 'You can’t take this down.'; end if;
  update public.college_resources set archived_at = now() where id = p_id;
end $$;

grant execute on function public.nisia_college_resources(uuid) to authenticated;
grant execute on function public.nisia_share_resource(uuid, text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.nisia_unshare_resource(uuid) to authenticated;

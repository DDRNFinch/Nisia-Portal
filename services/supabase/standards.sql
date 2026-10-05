-- The standards library: the source of truth for what every course is built on (stage 1).
--
--   qualifications           an apprenticeship standard (ST0095) or a qualification (City & Guilds 6570-05)
--   qualification_versions   each published version (ST0095 v1.2), kept for good: learners stay on the version they
--                            started on. A version is a draft until the master admin publishes it; once published,
--                            nothing in it can change (a correction is a new version).
--   requirements             what the version asks for, word for word: KSBs (K1, S1, B1), or for a qualification its
--                            units, learning outcomes and assessment criteria. KSBs that belong to one option of a
--                            standard (Site carpenter, Architectural joiner) say which.
--
-- Courses and enrolments record the version (and option) they follow. Everyone signed in can read published
-- versions; only the master admin sees drafts and adds, publishes or deletes them, through the actions below.
-- (The older course_sections / criteria tables are left as they are; later stages move onto this library.)

create table if not exists public.qualifications (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('standard', 'qualification')),
  title text not null,
  awarding_body text,
  level int check (level between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qualification_versions (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references public.qualifications(id) on delete cascade,
  version text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  options jsonb not null default '[]'::jsonb,        -- [{code, title}] for a standard with options
  source_url text,
  source_note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (qualification_id, version)
);

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.qualification_versions(id) on delete cascade,
  code text not null,
  kind text not null check (kind in ('knowledge', 'skill', 'behaviour', 'unit', 'outcome', 'criterion')),
  parent_id uuid references public.requirements(id) on delete cascade,
  option_code text,                                  -- null: everyone; otherwise only learners on that option
  optional boolean not null default false,           -- an optional unit of a qualification
  level int,
  title text not null,
  position int not null,
  unique (version_id, code)
);
create index if not exists requirements_version on public.requirements (version_id, position);
create index if not exists qualification_versions_qual on public.qualification_versions (qualification_id);

alter table public.courses add column if not exists qualification_version_id uuid references public.qualification_versions(id);
alter table public.courses add column if not exists qualification_option text;
alter table public.enrolments add column if not exists qualification_version_id uuid references public.qualification_versions(id);
alter table public.enrolments add column if not exists qualification_option text;

-- A published version never changes: not its requirements, not its details. Only a draft can be deleted.
create or replace function private.standards_frozen() returns trigger language plpgsql set search_path = '' as $$
declare v_status text;
begin
  if tg_table_name = 'requirements' then
    select status into v_status from public.qualification_versions where id = coalesce(new.version_id, old.version_id);
    if v_status = 'published' then raise exception 'This version is published, so it can’t change. Add a new version instead.'; end if;
    if tg_op = 'UPDATE' and old.version_id is distinct from new.version_id then
      select status into v_status from public.qualification_versions where id = old.version_id;
      if v_status = 'published' then raise exception 'This version is published, so it can’t change. Add a new version instead.'; end if;
    end if;
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    if old.status = 'published' then raise exception 'A published version can’t be deleted: learners may be on it.'; end if;
    return old;
  end if;
  if old.status = 'published' then raise exception 'This version is published, so it can’t change. Add a new version instead.'; end if;
  return new;
end $$;
drop trigger if exists requirements_frozen on public.requirements;
create trigger requirements_frozen before insert or update or delete on public.requirements for each row execute function private.standards_frozen();
drop trigger if exists versions_frozen on public.qualification_versions;
create trigger versions_frozen before update or delete on public.qualification_versions for each row execute function private.standards_frozen();

-- A new enrolment follows its course's version unless it says otherwise.
create or replace function private.enrolment_standard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.qualification_version_id is null or (tg_op = 'UPDATE' and new.course_id is distinct from old.course_id and new.qualification_version_id is not distinct from old.qualification_version_id) then
    select c.qualification_version_id, c.qualification_option into new.qualification_version_id, new.qualification_option from public.courses c where c.id = new.course_id;
  end if;
  return new;
end $$;
drop trigger if exists enrolment_standard on public.enrolments;
create trigger enrolment_standard before insert or update of course_id on public.enrolments for each row execute function private.enrolment_standard();

alter table public.qualifications enable row level security;
alter table public.qualification_versions enable row level security;
alter table public.requirements enable row level security;
drop policy if exists qualifications_read on public.qualifications;
create policy qualifications_read on public.qualifications for select to authenticated using (true);
drop policy if exists qualification_versions_read on public.qualification_versions;
create policy qualification_versions_read on public.qualification_versions for select to authenticated using (status = 'published' or private.is_platform_admin());
drop policy if exists requirements_read on public.requirements;
create policy requirements_read on public.requirements for select to authenticated
  using (exists (select 1 from public.qualification_versions v where v.id = version_id and (v.status = 'published' or private.is_platform_admin())));
revoke insert, update, delete on public.qualifications, public.qualification_versions, public.requirements from anon, authenticated;
grant select on public.qualifications, public.qualification_versions, public.requirements to authenticated;

-- Saves a draft version from {code, kind, title, awarding_body, level, version, options, source_url, source_note,
-- requirements: [{code, kind, title, parent (a code), option, optional, level}]}. A draft of the same version is
-- replaced; a published one is refused. Used by the master admin's action and by the seed.
create or replace function private.save_standard(p jsonb, p_by uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_q uuid; v_v uuid; v_status text; r jsonb; v_kind text; v_code text; v_pos int := 0; v_codes text[] := '{}'; v_opts text[];
begin
  v_kind := p ->> 'kind'; v_code := upper(trim(coalesce(p ->> 'code', '')));
  if v_code = '' or v_code !~ '^[A-Z0-9][A-Z0-9./-]{1,30}$' then raise exception 'Give the standard or qualification its code, like ST0095 or 6570-05.'; end if;
  if v_kind not in ('standard', 'qualification') then raise exception 'Say whether it’s an apprenticeship standard or a qualification.'; end if;
  if nullif(trim(coalesce(p ->> 'title', '')), '') is null then raise exception 'Give it a title.'; end if;
  if nullif(trim(coalesce(p ->> 'version', '')), '') is null or trim(p ->> 'version') !~ '^[0-9A-Za-z][0-9A-Za-z.()\- ]{0,30}$' then raise exception 'Give the version, like 1.2.'; end if;
  if jsonb_typeof(p -> 'requirements') <> 'array' or jsonb_array_length(p -> 'requirements') = 0 then raise exception 'There’s nothing in it yet: add its KSBs, or its units and criteria.'; end if;
  select coalesce(array_agg(o ->> 'code'), '{}') into v_opts from jsonb_array_elements(coalesce(p -> 'options', '[]'::jsonb)) o;

  insert into public.qualifications (code, kind, title, awarding_body, level)
  values (v_code, v_kind, left(trim(p ->> 'title'), 200), left(nullif(trim(p ->> 'awarding_body'), ''), 120), nullif(p ->> 'level', '')::int)
  on conflict (code) do update set title = excluded.title, awarding_body = coalesce(excluded.awarding_body, public.qualifications.awarding_body),
    level = coalesce(excluded.level, public.qualifications.level), updated_at = now()
  returning id into v_q;
  if (select kind from public.qualifications where id = v_q) <> v_kind then raise exception '% is already in the library as a different kind.', v_code; end if;

  select id, status into v_v, v_status from public.qualification_versions where qualification_id = v_q and version = trim(p ->> 'version');
  if v_status = 'published' then raise exception '% version % is already published, so it can’t change. Add it as a new version.', v_code, trim(p ->> 'version'); end if;
  if v_v is not null then delete from public.qualification_versions where id = v_v; end if;
  insert into public.qualification_versions (qualification_id, version, options, source_url, source_note, created_by)
  values (v_q, trim(p ->> 'version'), coalesce(p -> 'options', '[]'::jsonb), left(nullif(trim(p ->> 'source_url'), ''), 500), left(nullif(trim(p ->> 'source_note'), ''), 1000), p_by)
  returning id into v_v;

  for r in select * from jsonb_array_elements(p -> 'requirements') loop
    v_pos := v_pos + 1;
    if nullif(trim(coalesce(r ->> 'code', '')), '') is null or nullif(trim(coalesce(r ->> 'title', '')), '') is null then raise exception 'Item % has no code or no wording.', v_pos; end if;
    if trim(r ->> 'code') = any(v_codes) then raise exception '% is in there twice.', trim(r ->> 'code'); end if;
    if v_kind = 'standard' and (r ->> 'kind' not in ('knowledge', 'skill', 'behaviour') or trim(r ->> 'code') !~ '^[KSB][0-9]{1,3}$') then raise exception '% isn’t a KSB (K1, S1, B1…).', trim(r ->> 'code'); end if;
    if v_kind = 'qualification' and r ->> 'kind' not in ('unit', 'outcome', 'criterion', 'knowledge', 'skill', 'behaviour') then raise exception '% has no kind.', trim(r ->> 'code'); end if;
    if nullif(r ->> 'option', '') is not null and not (r ->> 'option' = any(v_opts)) then raise exception '% belongs to an option (%) that isn’t listed.', trim(r ->> 'code'), r ->> 'option'; end if;
    if nullif(r ->> 'parent', '') is not null and not (r ->> 'parent' = any(v_codes)) then raise exception '% sits under %, which isn’t above it in the list.', trim(r ->> 'code'), r ->> 'parent'; end if;
    insert into public.requirements (version_id, code, kind, parent_id, option_code, optional, level, title, position)
    values (v_v, trim(r ->> 'code'), r ->> 'kind',
      (select id from public.requirements x where x.version_id = v_v and x.code = nullif(r ->> 'parent', '')),
      nullif(r ->> 'option', ''), coalesce((r ->> 'optional')::boolean, false), nullif(r ->> 'level', '')::int, left(trim(r ->> 'title'), 4000), v_pos);
    v_codes := v_codes || trim(r ->> 'code');
  end loop;
  return v_v;
end $$;

create or replace function private.publish_standard(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.requirements where version_id = p_version) then raise exception 'There’s nothing in this version to publish.'; end if;
  update public.qualification_versions set status = 'published', published_at = now() where id = p_version and status = 'draft';
end $$;

-- ---------- Actions ----------

-- The library: every standard and qualification, its versions (drafts only for the master admin) and the courses
-- that follow each version; and every course with what it's built on.
create or replace function public.nisia_standards() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_admin boolean := private.is_platform_admin();
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  return jsonb_build_object('courses', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'title', c.title, 'version_id', c.qualification_version_id,
      'option', c.qualification_option, 'enrolments', (select count(*) from public.enrolments e where e.course_id = c.id)) order by c.title) from public.courses c), '[]'::jsonb),
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

-- One version, with everything it asks for in order.
create or replace function public.nisia_standard(p_version uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.qualification_versions; q public.qualifications;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into v from public.qualification_versions where id = p_version;
  if v.id is null or (v.status <> 'published' and not private.is_platform_admin()) then raise exception 'That version isn’t in the library.'; end if;
  select * into q from public.qualifications where id = v.qualification_id;
  return jsonb_build_object('id', v.id, 'code', q.code, 'kind', q.kind, 'title', q.title, 'awarding_body', q.awarding_body, 'level', q.level,
    'version', v.version, 'status', v.status, 'options', v.options, 'source_url', v.source_url, 'source_note', v.source_note, 'published_at', v.published_at,
    'requirements', coalesce((select jsonb_agg(jsonb_build_object('code', r.code, 'kind', r.kind, 'title', r.title, 'option', r.option_code, 'optional', r.optional, 'level', r.level,
      'parent', (select p.code from public.requirements p where p.id = r.parent_id)) order by r.position) from public.requirements r where r.version_id = v.id), '[]'::jsonb));
end $$;

create or replace function public.admin_save_standard(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'Only the master admin can add to the standards library.'; end if;
  return private.save_standard(p, auth.uid());
end $$;

create or replace function public.admin_publish_standard(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'Only the master admin can publish a standard.'; end if;
  perform private.publish_standard(p_version);
end $$;

create or replace function public.admin_delete_standard_draft(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_q uuid;
begin
  if not private.is_platform_admin() then raise exception 'Only the master admin can delete a draft.'; end if;
  delete from public.qualification_versions where id = p_version and status = 'draft' returning qualification_id into v_q;
  if v_q is null then raise exception 'Only a draft can be deleted.'; end if;
  /* A standard with no versions left goes too. */
  delete from public.qualifications q where q.id = v_q and not exists (select 1 from public.qualification_versions v where v.qualification_id = q.id);
end $$;

-- Which version (and option) a course follows. New enrolments on the course follow it; learners already enrolled
-- stay on the version they started on unless p_move_learners is true.
create or replace function public.admin_set_course_standard(p_course uuid, p_version uuid, p_option text default null, p_move_learners boolean default false) returns int
language plpgsql security definer set search_path = '' as $$
declare v public.qualification_versions; n int := 0;
begin
  if not private.is_platform_admin() then raise exception 'Only the master admin can change what a course is built on.'; end if;
  select * into v from public.qualification_versions where id = p_version;
  if v.id is null or v.status <> 'published' then raise exception 'Choose a published version.'; end if;
  if nullif(p_option, '') is not null and not exists (select 1 from jsonb_array_elements(v.options) o where o ->> 'code' = p_option) then raise exception 'That option isn’t in this version.'; end if;
  if jsonb_array_length(v.options) > 0 and nullif(p_option, '') is null then raise exception 'This standard has options: choose which one the course follows.'; end if;
  update public.courses set qualification_version_id = p_version, qualification_option = nullif(p_option, '') where id = p_course;
  if not found then raise exception 'That course isn’t in Nisia.'; end if;
  if p_move_learners then
    update public.enrolments set qualification_version_id = p_version, qualification_option = nullif(p_option, '') where course_id = p_course;
    get diagnostics n = row_count;
  end if;
  return n;
end $$;

revoke all on function private.save_standard(jsonb, uuid), private.publish_standard(uuid) from public, anon, authenticated;
revoke all on function public.nisia_standards(), public.nisia_standard(uuid), public.admin_save_standard(jsonb), public.admin_publish_standard(uuid),
  public.admin_delete_standard_draft(uuid), public.admin_set_course_standard(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.nisia_standards(), public.nisia_standard(uuid), public.admin_save_standard(jsonb), public.admin_publish_standard(uuid),
  public.admin_delete_standard_draft(uuid), public.admin_set_course_standard(uuid, uuid, text, boolean) to authenticated;

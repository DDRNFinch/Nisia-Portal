-- Course packs (stage 2): the topics a course is taught and evidenced in, each covering KSBs from the standard it's
-- built on. Your packs are Nisia's own (no college); colleges' packs come in stage 3.
--
--   course_packs           a pack: which standard version (and option) it's built on, and the Evia course it's for
--   course_pack_versions   its versions: a draft until published, then never changed (an improvement is a new version).
--                          content: {topics: [{id, name, ksbs: [{code, text}], optional?}]}: each topic's KSBs, in its
--                          own short wording; the full wording stays the standard's. Every KSB is checked against the
--                          standard (and the pack's option) when it's saved.
--
-- Courses say which pack they use (pack_id); an enrolment can use a different one (stage 3), otherwise its course's.
-- Everyone signed in can read published packs (they hold no one's data); only the master admin adds or publishes.

create table if not exists public.course_packs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  course_code text,
  qualification_version_id uuid not null references public.qualification_versions(id),
  qualification_option text,
  organisation_id uuid references public.organisations(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.course_pack_versions (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.course_packs(id) on delete cascade,
  version int not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  content jsonb not null,
  content_hash text not null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (pack_id, version)
);
create index if not exists course_pack_versions_pack on public.course_pack_versions (pack_id, version desc);
alter table public.courses add column if not exists pack_id uuid references public.course_packs(id);
alter table public.enrolments add column if not exists pack_id uuid references public.course_packs(id);

-- A published pack version never changes, and isn't removed.
create or replace function private.packs_frozen() returns trigger language plpgsql set search_path = '' as $$
begin
  if new is null then
    if old.status = 'published' then raise exception 'A published pack can’t be removed: learners may be using it.'; end if;
    return old;
  end if;
  if old.status = 'published' then raise exception 'This pack version is published, so it can’t change. Make a new version instead.'; end if;
  return new;
end $$;
create or replace trigger pack_versions_frozen before update or delete on public.course_pack_versions for each row execute function private.packs_frozen();

alter table public.course_packs enable row level security;
alter table public.course_pack_versions enable row level security;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'course_packs' and policyname = 'course_packs_read') then
    create policy course_packs_read on public.course_packs for select to authenticated
      using (organisation_id is null or private.is_platform_admin() or private.current_member_id(organisation_id) is not null); end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'course_pack_versions' and policyname = 'course_pack_versions_read') then
    create policy course_pack_versions_read on public.course_pack_versions for select to authenticated
      using ((status = 'published' or private.is_platform_admin()) and exists (select 1 from public.course_packs k where k.id = pack_id)); end if;
end $p$;
revoke insert, update, delete, truncate, references, trigger on public.course_packs, public.course_pack_versions from anon, authenticated;
revoke select on public.course_packs, public.course_pack_versions from anon;
grant select on public.course_packs, public.course_pack_versions to authenticated;

-- Saves a pack version as a draft from {code, title, course, standard, version (the standard's), option, content}.
-- Every topic needs an id and a name (both unique in the pack) and its KSBs must be the standard's (and, for a standard
-- with options, the core's or the pack's option's). A draft of the same version is replaced; a published one refused.
create or replace function private.save_pack(p jsonb, p_version int, p_by uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_qv uuid; v_pack uuid; v_id uuid; v_status text; t jsonb; k jsonb; v_ids text[] := '{}'; v_names text[] := '{}'; v_codes text[]; v_opt text; v_content jsonb;
begin
  select v.id into v_qv from public.qualification_versions v join public.qualifications q on q.id = v.qualification_id
    where q.code = upper(trim(p ->> 'standard')) and v.version = trim(p ->> 'version') and v.status = 'published';
  if v_qv is null then raise exception 'Build a pack on a published standard: % v% isn’t in the library.', p ->> 'standard', p ->> 'version'; end if;
  v_opt := nullif(p ->> 'option', '');
  if v_opt is not null and not exists (select 1 from public.qualification_versions v, jsonb_array_elements(v.options) o where v.id = v_qv and o ->> 'code' = v_opt) then
    raise exception 'That option isn’t in the standard.'; end if;
  if nullif(trim(coalesce(p ->> 'code', '')), '') is null or nullif(trim(coalesce(p ->> 'title', '')), '') is null then raise exception 'Give the pack a code and a title.'; end if;
  v_content := p -> 'content';
  if jsonb_typeof(v_content -> 'topics') <> 'array' or jsonb_array_length(v_content -> 'topics') = 0 then raise exception 'A pack needs at least one topic.'; end if;
  for t in select * from jsonb_array_elements(v_content -> 'topics') loop
    if nullif(trim(coalesce(t ->> 'id', '')), '') is null or nullif(trim(coalesce(t ->> 'name', '')), '') is null then raise exception 'Every topic needs a name.'; end if;
    if t ->> 'id' = any(v_ids) then raise exception 'Two topics have the same id (%).', t ->> 'id'; end if;
    if lower(trim(t ->> 'name')) = any(v_names) then raise exception 'Two topics are called “%”.', t ->> 'name'; end if;
    v_ids := v_ids || (t ->> 'id'); v_names := v_names || lower(trim(t ->> 'name'));
    if jsonb_typeof(t -> 'ksbs') <> 'array' then raise exception '“%” has no KSBs listed.', t ->> 'name'; end if;
    v_codes := '{}';
    for k in select * from jsonb_array_elements(t -> 'ksbs') loop
      if k ->> 'code' = any(v_codes) then raise exception '“%” lists % twice.', t ->> 'name', k ->> 'code'; end if;
      v_codes := v_codes || (k ->> 'code');
      if not exists (select 1 from public.requirements r where r.version_id = v_qv and r.code = k ->> 'code' and r.kind in ('knowledge', 'skill', 'behaviour', 'criterion')
          and (r.option_code is null or r.option_code = v_opt)) then
        raise exception '%', format('“%s” lists %s, which isn’t in %s v%s%s.', t ->> 'name', k ->> 'code', upper(p ->> 'standard'), p ->> 'version', case when v_opt is null then '' else ' (' || v_opt || ')' end); end if;
    end loop;
  end loop;

  insert into public.course_packs (code, title, course_code, qualification_version_id, qualification_option)
  values (trim(p ->> 'code'), left(trim(p ->> 'title'), 200), nullif(p ->> 'course', ''), v_qv, v_opt)
  on conflict (code) do update set title = excluded.title, course_code = coalesce(excluded.course_code, public.course_packs.course_code), updated_at = now()
  returning id into v_pack;
  if (select qualification_version_id from public.course_packs where id = v_pack) <> v_qv or (select qualification_option from public.course_packs where id = v_pack) is distinct from v_opt then
    raise exception 'This pack is built on a different standard version or option: make a new pack for it.'; end if;

  select id, status into v_id, v_status from public.course_pack_versions where pack_id = v_pack and version = p_version;
  if v_status = 'published' then raise exception 'Version % of this pack is published, so it can’t change. Make a new version.', p_version; end if;
  if v_id is not null then
    update public.course_pack_versions set content = v_content, content_hash = encode(sha256(convert_to(v_content::text, 'UTF8')), 'hex'), created_by = p_by, created_at = now() where id = v_id;
  else
    insert into public.course_pack_versions (pack_id, version, content, content_hash, created_by)
    values (v_pack, p_version, v_content, encode(sha256(convert_to(v_content::text, 'UTF8')), 'hex'), p_by) returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function private.publish_pack(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.course_pack_versions set status = 'published', published_at = now() where id = p_version and status = 'draft';
end $$;

-- The latest published version of a pack.
create or replace function private.pack_latest(p_pack uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.course_pack_versions where pack_id = p_pack and status = 'published' order by version desc limit 1;
$$;

-- A pack version as the apps use it: its topics, and the full wording of every KSB (or criterion) it could cover.
create or replace function private.pack_json(p_version uuid, p_have text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when v.content_hash = p_have then jsonb_build_object('id', k.id, 'version_id', v.id, 'hash', v.content_hash, 'unchanged', true)
    else jsonb_build_object('id', k.id, 'version_id', v.id, 'code', k.code, 'title', k.title, 'course', k.course_code, 'version', v.version, 'hash', v.content_hash,
      'published_at', v.published_at, 'standard', jsonb_build_object('code', q.code, 'kind', q.kind, 'title', q.title, 'version', qv.version, 'option', k.qualification_option,
        'option_title', (select o ->> 'title' from jsonb_array_elements(qv.options) o where o ->> 'code' = k.qualification_option)),
      'topics', v.content -> 'topics',
      'ksbs', coalesce((select jsonb_agg(jsonb_build_array(r.code, r.title) order by r.position) from public.requirements r
        where r.version_id = qv.id and r.kind in ('knowledge', 'skill', 'behaviour', 'criterion') and (r.option_code is null or r.option_code = k.qualification_option)), '[]'::jsonb)) end
  from public.course_pack_versions v join public.course_packs k on k.id = v.pack_id
    join public.qualification_versions qv on qv.id = k.qualification_version_id join public.qualifications q on q.id = qv.qualification_id
  where v.id = p_version;
$$;

-- ---------- Actions ----------

-- Milos, Paros and the portal: every published pack the signed-in person can use, and which pack each course uses.
-- p_have: {pack id: hash} already on the device; those come back as {unchanged: true} instead of in full.
create or replace function public.nisia_packs(p_have jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  return jsonb_build_object(
    'packs', coalesce((select jsonb_agg(private.pack_json(private.pack_latest(k.id), coalesce(p_have, '{}'::jsonb) ->> k.id::text) order by k.code)
      from public.course_packs k where private.pack_latest(k.id) is not null
        and (k.organisation_id is null or private.is_platform_admin() or private.current_member_id(k.organisation_id) is not null)), '[]'::jsonb),
    'courses', coalesce((select jsonb_object_agg(c.code, c.pack_id) from public.courses c where c.pack_id is not null and c.code is not null), '{}'::jsonb));
end $$;

-- Evia: the learner's own pack (their enrolment's, or their course's). p_have: the hash Evia already has.
create or replace function public.nisia_my_pack(p_have text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_pack uuid; v_ver uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia first.'; end if;
  select coalesce(e.pack_id, c.pack_id) into v_pack from public.enrolments e join public.courses c on c.id = e.course_id
    join public.learners l on l.id = e.learner_id join public.organisation_members om on om.id = l.organisation_member_id
    where om.user_id = auth.uid() and om.active order by e.created_at desc limit 1;
  v_ver := private.pack_latest(v_pack);
  if v_ver is null then return null; end if;
  return private.pack_json(v_ver, p_have);
end $$;

-- The master admin: a pack's versions (drafts too), for the Standards page.
create or replace function public.admin_packs() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'Only the master admin can see every pack.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'code', k.code, 'title', k.title, 'course', k.course_code, 'college', o.name,
      'standard', q.code || ' v' || qv.version, 'option', (select x ->> 'title' from jsonb_array_elements(qv.options) x where x ->> 'code' = k.qualification_option),
      'courses', coalesce((select jsonb_agg(c.title order by c.title) from public.courses c where c.pack_id = k.id), '[]'::jsonb),
      'enrolments', (select count(*) from public.enrolments e join public.courses c on c.id = e.course_id where coalesce(e.pack_id, c.pack_id) = k.id),
      'versions', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'version', v.version, 'status', v.status, 'hash', v.content_hash, 'published_at', v.published_at,
        'topics', jsonb_array_length(v.content -> 'topics')) order by v.version desc) from public.course_pack_versions v where v.pack_id = k.id), '[]'::jsonb)) order by k.organisation_id nulls first, k.code)
    from public.course_packs k join public.qualification_versions qv on qv.id = k.qualification_version_id join public.qualifications q on q.id = qv.qualification_id
    left join public.organisations o on o.id = k.organisation_id), '[]'::jsonb);
end $$;

-- One pack version in full (the master admin, or anyone for a published one).
create or replace function public.nisia_pack(p_version uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.course_pack_versions v join public.course_packs k on k.id = v.pack_id where v.id = p_version
      and (private.is_platform_admin() or (v.status = 'published' and (k.organisation_id is null or private.current_member_id(k.organisation_id) is not null)))) then
    raise exception 'That pack isn’t available.'; end if;
  return private.pack_json(p_version) || jsonb_build_object('status', (select status from public.course_pack_versions where id = p_version));
end $$;

revoke all on function private.save_pack(jsonb, int, uuid), private.publish_pack(uuid), private.pack_latest(uuid), private.pack_json(uuid, text) from public, anon, authenticated;
revoke all on function public.nisia_packs(jsonb), public.nisia_my_pack(text), public.admin_packs(), public.nisia_pack(uuid) from public, anon;
grant execute on function public.nisia_packs(jsonb), public.nisia_my_pack(text), public.admin_packs(), public.nisia_pack(uuid) to authenticated;

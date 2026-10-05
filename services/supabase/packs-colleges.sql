-- College packs (stage 3): a college makes its own packs (from a copy of yours, or from blank), sets which pack each
-- of its courses uses, and can move a learner onto another pack. Your packs and the standards never change.
--
--   course_packs.organisation_id   a college's own pack (null: yours, Nisia's)
--   college_course_packs           a college's pack for a course (null or missing: yours)
--   enrolments.pack_id             a learner's own pack (null: their college's for the course, else yours)
--
-- A pack can only be used for learners on the same standard version and option it's built on, and only by its own
-- college (or yours by everyone). Every KSB in a pack is checked against the standard when it's saved.
-- College packs are for apprenticeship standards; a qualification's units are fixed by the qualification.

create table if not exists public.college_course_packs (
  organisation_id uuid not null references public.organisations(id),
  course_id uuid not null references public.courses(id),
  pack_id uuid references public.course_packs(id),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (organisation_id, course_id)
);
alter table public.college_course_packs enable row level security;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'college_course_packs' and policyname = 'college_course_packs_read') then
    create policy college_course_packs_read on public.college_course_packs for select to authenticated
      using (private.current_member_id(organisation_id) is not null or private.is_platform_admin()); end if;
end $p$;
revoke insert, update, delete, truncate, references, trigger on public.college_course_packs from anon, authenticated;
revoke select on public.college_course_packs from anon;
grant select on public.college_course_packs to authenticated;

-- The standard version and option an enrolment is on (its own, else its course's).
create or replace function private.enrolment_standard_of(p_enrolment uuid, out qv uuid, out opt text)
language sql stable security definer set search_path = '' as $$
  select coalesce(e.qualification_version_id, c.qualification_version_id), case when e.qualification_version_id is not null then e.qualification_option else c.qualification_option end
  from public.enrolments e join public.courses c on c.id = e.course_id where e.id = p_enrolment;
$$;

-- The pack a learner uses: their own, else their college's for the course, else yours.
create or replace function private.effective_pack(p_enrolment uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(e.pack_id, ccp.pack_id, c.pack_id) from public.enrolments e join public.courses c on c.id = e.course_id
    left join public.college_course_packs ccp on ccp.organisation_id = e.organisation_id and ccp.course_id = e.course_id
  where e.id = p_enrolment;
$$;

-- A college may use yours and its own (published) packs.
create or replace function private.pack_usable(p_pack uuid, p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.course_packs k where k.id = p_pack and (k.organisation_id is null or k.organisation_id = p_org)
    and exists (select 1 from public.course_pack_versions v where v.pack_id = k.id and v.status = 'published'));
$$;

-- Checks a pack's topics against its standard: every topic named once, every KSB the standard's (and the option's).
create or replace function private.check_pack_content(p_qv uuid, p_opt text, p_content jsonb) returns void
language plpgsql stable security definer set search_path = '' as $$
declare t jsonb; k jsonb; v_ids text[] := '{}'; v_names text[] := '{}'; v_codes text[]; v_std text;
begin
  select q.code || ' v' || v.version into v_std from public.qualification_versions v join public.qualifications q on q.id = v.qualification_id where v.id = p_qv;
  if jsonb_typeof(p_content -> 'topics') <> 'array' or jsonb_array_length(p_content -> 'topics') = 0 then raise exception 'A pack needs at least one topic.'; end if;
  if jsonb_array_length(p_content -> 'topics') > 60 then raise exception 'That’s too many topics for one pack.'; end if;
  for t in select * from jsonb_array_elements(p_content -> 'topics') loop
    if nullif(trim(coalesce(t ->> 'id', '')), '') is null or nullif(trim(coalesce(t ->> 'name', '')), '') is null then raise exception 'Every topic needs a name.'; end if;
    if length(t ->> 'name') > 120 then raise exception 'Keep “%” under 120 characters.', left(t ->> 'name', 40); end if;
    if t ->> 'id' = any(v_ids) then raise exception 'Two topics have the same id (%).', t ->> 'id'; end if;
    if lower(trim(t ->> 'name')) = any(v_names) then raise exception 'Two topics are called “%”.', trim(t ->> 'name'); end if;
    v_ids := v_ids || (t ->> 'id'); v_names := v_names || lower(trim(t ->> 'name'));
    if jsonb_typeof(t -> 'ksbs') <> 'array' then raise exception '“%” has no KSBs listed.', t ->> 'name'; end if;
    v_codes := '{}';
    for k in select * from jsonb_array_elements(t -> 'ksbs') loop
      if k ->> 'code' = any(v_codes) then raise exception '“%” lists % twice.', t ->> 'name', k ->> 'code'; end if;
      v_codes := v_codes || (k ->> 'code');
      if length(coalesce(k ->> 'text', '')) > 1000 then raise exception 'The wording for % in “%” is too long.', k ->> 'code', t ->> 'name'; end if;
      if not exists (select 1 from public.requirements r where r.version_id = p_qv and r.code = k ->> 'code' and r.kind in ('knowledge', 'skill', 'behaviour', 'criterion')
          and (r.option_code is null or r.option_code = p_opt)) then
        raise exception '%', format('“%s” lists %s, which isn’t in %s%s.', t ->> 'name', k ->> 'code', v_std, case when p_opt is null then '' else ' (' || p_opt || ')' end); end if;
    end loop;
  end loop;
end $$;

-- ---------- What a college sees and does ----------

-- A college's packs page: the packs it can use (yours, and its own with their drafts), and each of its courses with the
-- pack it uses. Any staff member can look; only the college's admins change anything.
create or replace function public.college_packs(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_admin boolean := private.can_manage_org(p_org);
begin
  if not private.mfa_ok() or private.current_member_id(p_org) is null and not private.is_platform_admin() then raise exception 'Not allowed'; end if;
  return jsonb_build_object('admin', v_admin,
    'packs', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'code', k.code, 'title', k.title, 'course', k.course_code, 'mine', k.organisation_id is not null,
        'standard', q.code || ' v' || qv.version, 'kind', q.kind, 'version_id', qv.id, 'option', k.qualification_option,
        'option_title', (select x ->> 'title' from jsonb_array_elements(qv.options) x where x ->> 'code' = k.qualification_option),
        'versions', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'version', v.version, 'status', v.status, 'published_at', v.published_at, 'created_at', v.created_at,
          'topics', jsonb_array_length(v.content -> 'topics')) order by v.version desc) from public.course_pack_versions v
          where v.pack_id = k.id and (v.status = 'published' or (k.organisation_id is not null and v_admin))), '[]'::jsonb),
        'learners', (select count(*) from public.enrolments e where e.organisation_id = p_org and private.effective_pack(e.id) = k.id))
      order by k.organisation_id nulls first, k.title)
      from public.course_packs k join public.qualification_versions qv on qv.id = k.qualification_version_id join public.qualifications q on q.id = qv.qualification_id
      where k.organisation_id is null or k.organisation_id = p_org), '[]'::jsonb),
    'courses', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'title', c.title, 'version_id', c.qualification_version_id, 'option', c.qualification_option,
        'yours', c.pack_id, 'pack', ccp.pack_id, 'learners', (select count(*) from public.enrolments e where e.organisation_id = p_org and e.course_id = c.id),
        'own_pack', (select count(*) from public.enrolments e where e.organisation_id = p_org and e.course_id = c.id and e.pack_id is not null)) order by c.title)
      from public.courses c left join public.college_course_packs ccp on ccp.organisation_id = p_org and ccp.course_id = c.id
      where c.qualification_version_id is not null and (exists (select 1 from public.enrolments e where e.organisation_id = p_org and e.course_id = c.id) or c.pack_id is not null)), '[]'::jsonb));
end $$;

-- Saves a college's pack as a draft (a new pack, or the next version of one of its own). A new pack is built on a
-- published standard version (and option for a standard with options); a college pack is for a standard, not a
-- qualification. Returns the draft's id.
create or replace function public.college_save_pack(p_org uuid, p_pack uuid, p_title text, p_standard_version uuid, p_option text, p_content jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_k public.course_packs; v_qv public.qualification_versions; v_kind text; v_id uuid; v_ver int; v_status text; v_content jsonb;
begin
  if not private.can_manage_org(p_org) then raise exception 'Only the college’s admins can make or change its packs.'; end if;
  if nullif(trim(coalesce(p_title, '')), '') is null then raise exception 'Give the pack a name.'; end if;
  if p_pack is not null then
    select * into v_k from public.course_packs where id = p_pack;
    if v_k.id is null or v_k.organisation_id is distinct from p_org then raise exception 'That isn’t one of the college’s packs. Make a copy instead.'; end if;
    select * into v_qv from public.qualification_versions where id = v_k.qualification_version_id;
  else
    select * into v_qv from public.qualification_versions where id = p_standard_version;
    if v_qv.id is null or v_qv.status <> 'published' then raise exception 'Build the pack on a published standard.'; end if;
    if jsonb_array_length(v_qv.options) > 0 and not exists (select 1 from jsonb_array_elements(v_qv.options) o where o ->> 'code' = p_option) then raise exception 'Choose which option the pack is for.'; end if;
    if jsonb_array_length(v_qv.options) = 0 and nullif(p_option, '') is not null then raise exception 'That standard has no options.'; end if;
  end if;
  select q.kind into v_kind from public.qualifications q where q.id = v_qv.qualification_id;
  if v_kind <> 'standard' then raise exception 'A qualification’s units are set by the qualification, so colleges make packs for apprenticeship standards.'; end if;
  /* Only topics, their names, ids, KSBs (each with its own short wording) and where a copied topic came from. */
  select jsonb_build_object('topics', coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', t ->> 'id', 'name', trim(t ->> 'name'), 'from', nullif(t ->> 'from', ''),
      'ksbs', coalesce((select jsonb_agg(jsonb_build_object('code', k ->> 'code', 'text', coalesce(k ->> 'text', ''))) from jsonb_array_elements(t -> 'ksbs') k), '[]'::jsonb)))), '[]'::jsonb))
    into v_content from jsonb_array_elements(coalesce(p_content -> 'topics', '[]'::jsonb)) t;
  perform private.check_pack_content(v_qv.id, coalesce(v_k.qualification_option, nullif(p_option, '')), v_content);

  if v_k.id is null then
    insert into public.course_packs (code, title, course_code, qualification_version_id, qualification_option, organisation_id)
    values ('college-' || replace(gen_random_uuid()::text, '-', ''), left(trim(p_title), 120),
      /* The Evia course it's for: the one your pack on the same standard and option is for. */
      (select y.course_code from public.course_packs y where y.organisation_id is null and y.qualification_version_id = v_qv.id and y.qualification_option is not distinct from nullif(p_option, '') order by y.code limit 1),
      v_qv.id, nullif(p_option, ''), p_org) returning * into v_k;
  else
    update public.course_packs set title = left(trim(p_title), 120), updated_at = now() where id = v_k.id;
  end if;
  select id, version, status into v_id, v_ver, v_status from public.course_pack_versions where pack_id = v_k.id order by version desc limit 1;
  if v_id is not null and v_status = 'draft' then
    update public.course_pack_versions set content = v_content, content_hash = encode(sha256(convert_to(v_content::text, 'UTF8')), 'hex'), created_by = auth.uid(), created_at = now() where id = v_id;
  else
    insert into public.course_pack_versions (pack_id, version, content, content_hash, created_by)
    values (v_k.id, coalesce(v_ver, 0) + 1, v_content, encode(sha256(convert_to(v_content::text, 'UTF8')), 'hex'), auth.uid()) returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public.college_publish_pack(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select k.organisation_id into v_org from public.course_pack_versions v join public.course_packs k on k.id = v.pack_id where v.id = p_version;
  if v_org is null or not private.can_manage_org(v_org) then raise exception 'Only the college’s admins can publish its packs.'; end if;
  perform private.publish_pack(p_version);
end $$;

-- Which pack a college's course uses (null: yours). Only packs built on the course's standard version and option.
create or replace function public.college_set_course_pack(p_org uuid, p_course uuid, p_pack uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.courses; k public.course_packs;
begin
  if not private.can_manage_org(p_org) then raise exception 'Only the college’s admins can choose a course’s pack.'; end if;
  select * into c from public.courses where id = p_course;
  if c.id is null then raise exception 'That course isn’t in Nisia.'; end if;
  if p_pack is not null then
    select * into k from public.course_packs where id = p_pack;
    if not private.pack_usable(p_pack, p_org) then raise exception 'That pack can’t be used here: publish it first.'; end if;
    if k.qualification_version_id is distinct from c.qualification_version_id or k.qualification_option is distinct from c.qualification_option then
      raise exception 'That pack is built on a different standard or option from the course.'; end if;
  end if;
  insert into public.college_course_packs (organisation_id, course_id, pack_id, updated_by) values (p_org, p_course, p_pack, auth.uid())
  on conflict (organisation_id, course_id) do update set pack_id = excluded.pack_id, updated_by = excluded.updated_by, updated_at = now();
end $$;

-- Moves one learner onto a pack (null: back to their college's pack for the course). The college's admins, or the
-- learner's own assessor or tutor. Only packs built on the learner's standard version and option.
create or replace function public.set_enrolment_pack(p_enrolment uuid, p_pack uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; s record; k public.course_packs;
begin
  select organisation_id into v_org from public.enrolments where id = p_enrolment;
  if v_org is null then raise exception 'That learner isn’t in Nisia.'; end if;
  if not (private.can_manage_org(v_org) or (private.mfa_ok() and private.can_access_enrolment(p_enrolment) and (private.has_role(v_org, 'assessor') or private.has_role(v_org, 'tutor')))) then
    raise exception 'Only the learner’s assessor or tutor, or the college’s admins, can change their pack.'; end if;
  if p_pack is not null then
    select * into k from public.course_packs where id = p_pack;
    s := private.enrolment_standard_of(p_enrolment);
    if not private.pack_usable(p_pack, v_org) then raise exception 'That pack can’t be used here: publish it first.'; end if;
    if k.qualification_version_id is distinct from s.qv or k.qualification_option is distinct from s.opt then raise exception 'That pack is built on a different standard or option from the learner’s.'; end if;
  end if;
  update public.enrolments set pack_id = p_pack where id = p_enrolment;
end $$;

-- ---------- The apps get each learner's pack ----------

-- Evia: the learner's own pack (theirs, else their college's, else yours).
create or replace function public.nisia_my_pack(p_have text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_e uuid; v_ver uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia first.'; end if;
  select e.id into v_e from public.enrolments e join public.learners l on l.id = e.learner_id join public.organisation_members om on om.id = l.organisation_member_id
    where om.user_id = auth.uid() and om.active order by e.created_at desc limit 1;
  v_ver := private.pack_latest(private.effective_pack(v_e));
  if v_ver is null then return null; end if;
  return private.pack_json(v_ver, p_have);
end $$;

-- Milos, Paros and the portal: the packs the signed-in person can use, which pack each course uses, and which pack each
-- learner they work with uses (enrolment id → pack id).
create or replace function public.nisia_packs(p_have jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  return jsonb_build_object(
    'packs', coalesce((select jsonb_agg(private.pack_json(private.pack_latest(k.id), coalesce(p_have, '{}'::jsonb) ->> k.id::text) order by k.code)
      from public.course_packs k where private.pack_latest(k.id) is not null
        and (k.organisation_id is null or private.is_platform_admin() or private.current_member_id(k.organisation_id) is not null)), '[]'::jsonb),
    'courses', coalesce((select jsonb_object_agg(c.code, c.pack_id) from public.courses c where c.pack_id is not null and c.code is not null), '{}'::jsonb),
    'enrolments', coalesce((select jsonb_object_agg(e.id, private.effective_pack(e.id)) from public.enrolments e
      where e.organisation_id in (select om.organisation_id from public.organisation_members om where om.user_id = auth.uid() and om.active)
        and private.effective_pack(e.id) is not null and (private.can_access_enrolment(e.id) or private.can_employer_enrolment(e.id))), '{}'::jsonb));
end $$;

-- One pack version in full: published ones for anyone who can use them, drafts for its college's admins (and you).
create or replace function public.nisia_pack(p_version uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.course_pack_versions v join public.course_packs k on k.id = v.pack_id where v.id = p_version
      and (private.is_platform_admin() or (k.organisation_id is not null and private.can_manage_org(k.organisation_id))
        or (v.status = 'published' and (k.organisation_id is null or private.current_member_id(k.organisation_id) is not null)))) then
    raise exception 'That pack isn’t available.'; end if;
  return private.pack_json(p_version) || jsonb_build_object('status', (select status from public.course_pack_versions where id = p_version),
    'mine', (select k.organisation_id is not null from public.course_pack_versions v join public.course_packs k on k.id = v.pack_id where v.id = p_version));
end $$;

revoke all on function private.enrolment_standard_of(uuid), private.effective_pack(uuid), private.pack_usable(uuid, uuid), private.check_pack_content(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.college_packs(uuid), public.college_save_pack(uuid, uuid, text, uuid, text, jsonb), public.college_publish_pack(uuid), public.college_set_course_pack(uuid, uuid, uuid),
  public.set_enrolment_pack(uuid, uuid), public.nisia_my_pack(text), public.nisia_packs(jsonb), public.nisia_pack(uuid) from public, anon;
grant execute on function public.college_packs(uuid), public.college_save_pack(uuid, uuid, text, uuid, text, jsonb), public.college_publish_pack(uuid), public.college_set_course_pack(uuid, uuid, uuid),
  public.set_enrolment_pack(uuid, uuid), public.nisia_my_pack(text), public.nisia_packs(jsonb), public.nisia_pack(uuid) to authenticated;

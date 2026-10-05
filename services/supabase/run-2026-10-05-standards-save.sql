-- Standards library, last step (5 October 2026): saving and deleting drafts. Run once in the SQL editor; safe to run again.
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

create or replace function public.admin_save_standard(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'Only the master admin can add to the standards library.'; end if;
  return private.save_standard(p, auth.uid());
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

revoke all on function private.save_standard(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.admin_save_standard(jsonb), public.admin_delete_standard_draft(uuid) from public, anon;
grant execute on function public.admin_save_standard(jsonb), public.admin_delete_standard_draft(uuid) to authenticated;

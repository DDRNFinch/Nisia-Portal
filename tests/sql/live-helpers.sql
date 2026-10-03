-- Copied from the live Nisia project (private schema), so the rules run as they do there.
create or replace function private.mfa_ok() returns boolean language sql stable security definer set search_path to '' as $$ select coalesce(auth.jwt()->>'aal','aal1') = 'aal2'; $$;
create or replace function private.current_member_id(p_org_id uuid) returns uuid language sql stable security definer set search_path to '' as $$
  select om.id from public.organisation_members om where om.organisation_id = p_org_id and om.user_id = auth.uid() and om.active limit 1; $$;
create or replace function private.has_role(p_org_id uuid, p_role text) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.organisation_members om join public.organisation_member_roles omr on omr.organisation_member_id = om.id join public.roles r on r.id = omr.role_id
    where om.organisation_id = p_org_id and om.user_id = auth.uid() and om.active and r.code = p_role); $$;
create or replace function private.can_manage_org(p_org_id uuid) returns boolean language sql stable security definer set search_path to '' as $$ select private.mfa_ok() and private.has_role(p_org_id, 'admin'); $$;
create or replace function private.is_platform_admin() returns boolean language sql stable security definer set search_path to '' as $$ select private.mfa_ok() and exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()); $$;
create or replace function private.enrolment_learner_id(p_enrolment_id uuid) returns uuid language sql stable security definer set search_path to '' as $$ select learner_id from public.enrolments where id=p_enrolment_id; $$;
create or replace function private.is_own_learner(p_learner_id uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.learners l join public.organisation_members om on om.id = l.organisation_member_id where l.id = p_learner_id and om.user_id = auth.uid() and om.active); $$;
create or replace function private.can_access_learner(p_learner_id uuid) returns boolean language plpgsql stable security definer set search_path to '' as $$
declare v_org uuid; v_learner_member uuid; v_current_member uuid;
begin
  select l.organisation_id, l.organisation_member_id into v_org, v_learner_member from public.learners l where l.id = p_learner_id;
  if v_org is null then return false; end if;
  v_current_member := private.current_member_id(v_org);
  if v_current_member is null then return false; end if;
  if v_current_member = v_learner_member then return true; end if;
  if not private.mfa_ok() then return false; end if;
  if private.has_role(v_org, 'admin') then return true; end if;
  return exists (select 1 from public.learner_access la where la.organisation_id = v_org and la.learner_id = p_learner_id and la.organisation_member_id = v_current_member)
    and (private.has_role(v_org, 'assessor') or private.has_role(v_org, 'tutor') or private.has_role(v_org, 'employer'));
end; $$;
create or replace function private.can_employer_learner(p_learner_id uuid) returns boolean language plpgsql stable security definer set search_path to '' as $$
declare v_org uuid; v_member uuid;
begin
  select organisation_id into v_org from public.learners where id = p_learner_id;
  if v_org is null or not private.mfa_ok() then return false; end if;
  if private.has_role(v_org,'admin') then return true; end if;
  v_member := private.current_member_id(v_org);
  return private.has_role(v_org,'employer') and exists (select 1 from public.learner_access where organisation_id=v_org and learner_id=p_learner_id and organisation_member_id=v_member);
end; $$;
create or replace function private.can_tutor_learner(p_learner_id uuid) returns boolean language plpgsql stable security definer set search_path to '' as $$
declare v_org uuid; v_member uuid;
begin
  select organisation_id into v_org from public.learners where id = p_learner_id;
  if v_org is null or not private.mfa_ok() then return false; end if;
  if private.has_role(v_org,'admin') then return true; end if;
  v_member := private.current_member_id(v_org);
  return private.has_role(v_org,'tutor') and exists (select 1 from public.learner_access where organisation_id=v_org and learner_id=p_learner_id and organisation_member_id=v_member);
end; $$;
create or replace function private.can_access_enrolment(p_enrolment_id uuid) returns boolean language sql stable security definer set search_path to '' as $$ select private.can_access_learner(private.enrolment_learner_id(p_enrolment_id)); $$;
create or replace function private.can_employer_enrolment(p_enrolment_id uuid) returns boolean language sql stable security definer set search_path to '' as $$ select private.can_employer_learner(private.enrolment_learner_id(p_enrolment_id)); $$;
create or replace function private.can_tutor_enrolment(p_enrolment_id uuid) returns boolean language sql stable security definer set search_path to '' as $$ select private.can_tutor_learner(private.enrolment_learner_id(p_enrolment_id)); $$;
create or replace function private.is_own_enrolment(p_enrolment_id uuid) returns boolean language sql stable security definer set search_path to '' as $$ select private.is_own_learner(private.enrolment_learner_id(p_enrolment_id)); $$;
create or replace function private.notify_learner_for_enrolment(p_enrolment_id uuid, p_org_id uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path to '' as $$
declare v_user uuid;
begin
  select om.user_id into v_user from public.enrolments e join public.learners l on l.id=e.learner_id join public.organisation_members om on om.id=l.organisation_member_id where e.id=p_enrolment_id and e.organisation_id=p_org_id;
  if v_user is not null then insert into public.notifications(organisation_id, recipient_user_id, notification_type, title, body, data) values (p_org_id, v_user, p_type, p_title, p_body, coalesce(p_data,'{}'::jsonb)); end if;
end; $$;
create or replace function private.notify_assigned_staff_for_enrolment(p_enrolment_id uuid, p_org_id uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path to '' as $$
begin
  insert into public.notifications(organisation_id, recipient_user_id, notification_type, title, body, data)
  select distinct p_org_id, om.user_id, p_type, p_title, p_body, coalesce(p_data,'{}'::jsonb)
  from public.enrolments e join public.learner_access la on la.learner_id=e.learner_id and la.organisation_id=e.organisation_id
  join public.organisation_members om on om.id=la.organisation_member_id join public.organisation_member_roles omr on omr.organisation_member_id=om.id
  join public.roles r on r.id=omr.role_id where e.id=p_enrolment_id and e.organisation_id=p_org_id and r.code in ('assessor','tutor');
end; $$;

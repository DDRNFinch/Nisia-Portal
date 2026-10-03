-- Symi couldn't save a new class to Nisia ("new row violates row-level security policy for table classes").
-- Symi saves a class and asks for it back in one step (insert ... returning). The old rules found the class's tutor by
-- looking the class up by its id (private.is_class_tutor(id)), and a class being saved can't be looked up yet in that
-- same step, so a tutor's own new class was refused. The rules now check the row's own tutor and college.
drop policy if exists classes_read on public.classes;
drop policy if exists classes_write on public.classes;
create policy classes_read on public.classes for select
  using (private.mfa_ok() and (tutor_member_id = private.current_member_id(organisation_id) or private.can_manage_org(organisation_id)));
create policy classes_write on public.classes for all
  using (private.mfa_ok() and (tutor_member_id = private.current_member_id(organisation_id) or private.can_manage_org(organisation_id)))
  with check (private.mfa_ok() and tutor_member_id = private.current_member_id(organisation_id)
    and (private.has_role(organisation_id, 'tutor') or private.has_role(organisation_id, 'admin')));

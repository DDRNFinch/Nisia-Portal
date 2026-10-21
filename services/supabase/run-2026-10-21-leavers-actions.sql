-- Learner leaves or finishes: the two actions behind Evia Portal's "Left or finished" and "Undo" buttons
-- (the rest of leavers.sql is already live). Paste all of this into Supabase's SQL editor and press Run.

create or replace function public.nisia_end_enrolment(p_enrolment uuid, p_kind text, p_on date default null, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.enrolments; v_classes uuid[];
begin
  select * into v from public.enrolments where id = p_enrolment;
  if v.id is null or not private.can_manage_org(v.organisation_id) then raise exception 'Only the college’s admins can do this.'; end if;
  if p_kind not in ('left', 'finished') then raise exception 'Say whether they left or finished.'; end if;
  if v.status in ('completed', 'withdrawn') then raise exception 'They’ve already % the course.', case when v.status = 'completed' then 'finished' else 'left' end; end if;
  if coalesce(p_on, current_date) > current_date + 31 then raise exception 'The date can’t be more than a month ahead.'; end if;
  if p_kind = 'left' and nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'Give a reason they left.'; end if;
  select coalesce(array_agg(cl.class_id), '{}') into v_classes from public.class_learners cl where cl.enrolment_id = p_enrolment;
  -- Off the registers from now on (past registers keep their marks).
  delete from public.class_learners where enrolment_id = p_enrolment;
  update public.enrolments set status = case when p_kind = 'left' then 'withdrawn' else 'completed' end,
    ended_on = coalesce(p_on, current_date), end_reason = left(nullif(btrim(coalesce(p_reason, '')), ''), 200), ended_at = now(),
    ended_by = private.current_member_id(v.organisation_id), ended_classes = v_classes
  where id = p_enrolment;
  perform private.notify_assigned_staff_for_enrolment(p_enrolment, v.organisation_id, 'learner_ended',
    private.enrolment_name(p_enrolment) || case when p_kind = 'left' then ' has left the course' else ' has finished the course' end,
    'They’re off your lists now. Their records are kept.', jsonb_build_object('enrolment_id', p_enrolment));
  return jsonb_build_object('enrolment', p_enrolment, 'status', case when p_kind = 'left' then 'withdrawn' else 'completed' end, 'classes', coalesce(array_length(v_classes, 1), 0),
    'seats_used', private.seats_used(v.organisation_id));
end $$;

create or replace function public.nisia_undo_end_enrolment(p_enrolment uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.enrolments; v_back int;
begin
  select * into v from public.enrolments where id = p_enrolment;
  if v.id is null or not private.can_manage_org(v.organisation_id) then raise exception 'Only the college’s admins can do this.'; end if;
  if v.status not in ('completed', 'withdrawn') then raise exception 'They’re still on the course.'; end if;
  if (select seats from public.organisations where id = v.organisation_id) <= private.seats_used(v.organisation_id) then
    raise exception 'All your seats are in use. Free one first, or add seats.'; end if;
  insert into public.class_learners (class_id, enrolment_id, organisation_id)
  select c.id, v.id, v.organisation_id from public.classes c where c.id = any(coalesce(v.ended_classes, '{}')) and c.archived_at is null
  on conflict do nothing;
  get diagnostics v_back = row_count;
  update public.enrolments set status = 'active', ended_on = null, end_reason = null, ended_at = null, ended_by = null, ended_classes = null where id = p_enrolment;
  return jsonb_build_object('enrolment', p_enrolment, 'status', 'active', 'classes', v_back);
end $$;

revoke all on function public.nisia_end_enrolment(uuid, text, date, text), public.nisia_undo_end_enrolment(uuid) from public, anon;
grant execute on function public.nisia_end_enrolment(uuid, text, date, text), public.nisia_undo_end_enrolment(uuid) to authenticated;

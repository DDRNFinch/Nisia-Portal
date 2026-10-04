-- Run once in the Supabase SQL editor (stage 2: employer feedback, witness testimonies, confirming hours and attendance
-- through named actions). Safe to run again.
begin;
-- Feedback, witness testimonies, confirming hours and attendance through named actions (stage 2). Each action checks
-- who is asking; the apps no longer read or write these tables themselves.
--
--   paros_add_witness        the employer's witness testimony (signed as seen first hand)
--   paros_rate_behaviours    the employer's behaviour ratings
--   paros_confirm_hours      the employer confirms or queries the apprentice's own learning hours
--   milos_employer_feedback  the assessor (or tutor) reads what the employer sent
--   nisia_whats_new          Evia's one request, now also: the employer's feedback, the assessor's feedback on
--                            evidence, and every register mark (for the attendance calendar)

create or replace function public.paros_add_witness(p_enrolment uuid, p_statement text, p_rating int, p_unit text default null, p_ksbs text[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_e public.enrolments; v_me uuid; v_id uuid;
begin
  select * into v_e from public.enrolments where id = p_enrolment;
  if v_e.id is null or not private.can_employer_enrolment(p_enrolment) then raise exception 'You can’t write a witness testimony for this apprentice.'; end if;
  v_me := private.current_member_id(v_e.organisation_id);
  if length(trim(coalesce(p_statement, ''))) < 20 then raise exception 'Say a bit more about what you saw (a few sentences).'; end if;
  if p_rating is null or p_rating not between 1 and 3 then raise exception 'Choose how well it was done.'; end if;
  insert into public.witness_testimonies (organisation_id, enrolment_id, course_id, witness_member_id, statement, rating, signed_at, unit, ksbs)
  values (v_e.organisation_id, v_e.id, v_e.course_id, v_me, left(trim(p_statement), 5000), p_rating, now(), left(p_unit, 200), coalesce(p_ksbs, '{}'))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.paros_rate_behaviours(p_enrolment uuid, p_ratings jsonb, p_comment text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_e public.enrolments; v_id uuid; k text; v jsonb;
begin
  select * into v_e from public.enrolments where id = p_enrolment;
  if v_e.id is null or not private.can_employer_enrolment(p_enrolment) then raise exception 'You can’t rate this apprentice.'; end if;
  if jsonb_typeof(p_ratings) <> 'object' or p_ratings = '{}'::jsonb then raise exception 'Rate each behaviour.'; end if;
  for k, v in select * from jsonb_each(p_ratings) loop
    if k !~ '^B[0-9]{1,2}$' or jsonb_typeof(v) <> 'number' or (v::text)::int not between 1 and 4 then raise exception 'Those ratings aren’t right.'; end if;
  end loop;
  insert into public.behaviour_ratings (organisation_id, enrolment_id, rater_member_id, ratings, comment)
  values (v_e.organisation_id, v_e.id, private.current_member_id(v_e.organisation_id), p_ratings, left(nullif(trim(p_comment), ''), 2000))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.paros_confirm_hours(p_otj uuid, p_decision text, p_comment text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_o public.otj_entries;
begin
  select * into v_o from public.otj_entries where id = p_otj;
  if v_o.id is null or not private.can_employer_enrolment(v_o.enrolment_id) then raise exception 'You can’t confirm these hours.'; end if;
  if v_o.activity_type = 'college' then raise exception 'College hours are confirmed by the tutor.'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Confirm the hours or say what’s not right.'; end if;
  if p_decision = 'rejected' and nullif(trim(coalesce(p_comment, '')), '') is null then raise exception 'Say what’s not right.'; end if;
  insert into public.otj_confirmations (organisation_id, otj_entry_id, confirmer_member_id, decision, comment)
  values (v_o.organisation_id, v_o.id, private.current_member_id(v_o.organisation_id), p_decision, left(nullif(trim(p_comment), ''), 1000))
  on conflict (otj_entry_id, confirmer_member_id) do update set decision = excluded.decision, comment = excluded.comment, created_at = now();
end $$;

create or replace function private.enrolment_org(p_enrolment uuid) returns uuid
language sql stable security definer set search_path = '' as $$ select organisation_id from public.enrolments where id = p_enrolment $$;
-- The learner's own assessor or tutor (linked to them at the college).
create or replace function private.can_assess_or_tutor(p_enrolment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrolments e join public.learner_access la on la.learner_id = e.learner_id and la.organisation_id = e.organisation_id
    where e.id = p_enrolment and la.organisation_member_id = private.current_member_id(e.organisation_id))
  and (private.has_role(private.enrolment_org(p_enrolment), 'assessor') or private.has_role(private.enrolment_org(p_enrolment), 'tutor'));
$$;
create or replace function public.milos_employer_feedback(p_enrolment uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  /* College staff only: the learner's own assessor or tutor, or the college's admins and quality team. */
  if not private.mfa_ok() or not (private.can_assess_or_tutor(p_enrolment) or private.can_manage_org(private.enrolment_org(p_enrolment))
    or private.has_role(private.enrolment_org(p_enrolment), 'quality')) then raise exception 'Not allowed'; end if;
  return jsonb_build_object(
    'witness', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'unit', w.unit, 'statement', w.statement, 'rating', w.rating, 'ksbs', to_jsonb(w.ksbs),
        'signed_at', w.signed_at, 'created_at', w.created_at) order by w.created_at desc) from public.witness_testimonies w where w.enrolment_id = p_enrolment), '[]'::jsonb),
    'ratings', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'ratings', b.ratings, 'comment', b.comment, 'created_at', b.created_at) order by b.created_at desc)
      from public.behaviour_ratings b where b.enrolment_id = p_enrolment), '[]'::jsonb));
end $$;

-- Evia's one request: registers (stage 1), and now feedback and every register mark.
create or replace function public.nisia_whats_new() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_e uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia first.'; end if;
  select e.id into v_e from public.enrolments e join public.learners l on l.id = e.learner_id join public.organisation_members om on om.id = l.organisation_member_id
    where om.user_id = auth.uid() and om.active order by e.created_at desc limit 1;
  return jsonb_build_object(
    'college', coalesce((select jsonb_agg(to_jsonb(c)) from public.nisia_my_college() c), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(to_jsonb(s)) from public.nisia_my_sessions(7) s), '[]'::jsonb),
    'absences', coalesce((select jsonb_agg(to_jsonb(a)) from public.nisia_absences() a), '[]'::jsonb),
    /* Every finished register the learner was on: the attendance calendar and percentage. */
    'attendance', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'date', s.session_date, 'class', c.title, 'status', a.status, 'late', a.late, 'minutes', a.minutes,
        'reason', a.reason, 'kind', ab.kind, 'checked_in_at', a.checked_in_at) order by s.session_date, s.starts_at nulls last)
      from public.class_attendance a join public.class_sessions s on s.id = a.session_id join public.classes c on c.id = s.class_id
      left join public.absences ab on ab.id = a.absence_id
      where a.enrolment_id = v_e and a.confirmed_at is not null and s.session_date > current_date - 400), '[]'::jsonb),
    'employer', jsonb_build_object(
      'witness', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'unit', w.unit, 'statement', w.statement, 'rating', w.rating, 'ksbs', to_jsonb(w.ksbs),
          'signed_at', w.signed_at, 'created_at', w.created_at) order by w.created_at desc) from public.witness_testimonies w where w.enrolment_id = v_e), '[]'::jsonb),
      'ratings', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'ratings', b.ratings, 'comment', b.comment, 'created_at', b.created_at) order by b.created_at desc)
        from public.behaviour_ratings b where b.enrolment_id = v_e), '[]'::jsonb)),
    'feedback', coalesce((select jsonb_agg(to_jsonb(f)) from public.nisia_my_feedback() f), '[]'::jsonb));
end $$;

revoke all on function public.paros_add_witness(uuid, text, int, text, text[]) from public, anon;
revoke all on function public.paros_rate_behaviours(uuid, jsonb, text) from public, anon;
revoke all on function public.paros_confirm_hours(uuid, text, text) from public, anon;
revoke all on function public.milos_employer_feedback(uuid) from public, anon;
revoke all on function public.nisia_whats_new() from public, anon;
grant execute on function public.paros_add_witness(uuid, text, int, text, text[]) to authenticated;
grant execute on function public.paros_rate_behaviours(uuid, jsonb, text) to authenticated;
grant execute on function public.paros_confirm_hours(uuid, text, text) to authenticated;
grant execute on function public.milos_employer_feedback(uuid) to authenticated;
grant execute on function public.nisia_whats_new() to authenticated;
commit;

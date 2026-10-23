-- Reopen today's register: a tutor who finished a register early can open it again and carry on.
-- symi_reopen_register takes the finish off the live register (so the tutor's other devices open it too) and puts the
-- session back to open. When it was reopened is kept ("reopenedAt"): a device that still has the old finish (made
-- before then, "doneAt") can't finish it again, and opens it too; finishing it again later counts as normal.
-- The marks already sent stay until the register is finished again, which replaces them.
-- Changes symi_registers_sync to keep "reopenedAt" and honour it; adds one function.

create or replace function public.symi_registers_sync(p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare it jsonb; v_s uuid; inc jsonb; cur jsonb; k text; v jsonb; part text; v_at bigint; out jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia Portal first.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 40 or length(p_items::text) > 400000 then raise exception 'That register is too big to send.'; end if;
  v_at := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  for it in select * from jsonb_array_elements(p_items) loop
    v_s := (it ->> 'session')::uuid;
    if not private.own_class(private.session_class(v_s)) then raise exception 'That class isn’t yours in Evia Portal.'; end if;
    inc := coalesce(it -> 'state', '{}'::jsonb);
    insert into private.register_live (session_id) values (v_s) on conflict do nothing;
    select state into cur from private.register_live where session_id = v_s for update;
    cur := jsonb_build_object('timers', coalesce(cur -> 'timers', '{}'::jsonb), 'marks', coalesce(cur -> 'marks', '{}'::jsonb),
      'startedAt', cur -> 'startedAt', 'finished', cur -> 'finished', 'reopenedAt', cur -> 'reopenedAt');
    if jsonb_typeof(inc) = 'object' and inc <> '{}'::jsonb then
      -- Started: the earliest start any device saw. Finished: the first finish (a finished register stays finished,
      -- unless the tutor opens it again; then only a finish made after that counts).
      if (inc ->> 'startedAt') is not null and ((cur ->> 'startedAt') is null or (inc ->> 'startedAt')::bigint < (cur ->> 'startedAt')::bigint) then
        cur := jsonb_set(cur, '{startedAt}', inc -> 'startedAt'); end if;
      if jsonb_typeof(inc -> 'finished') = 'object' and jsonb_typeof(cur -> 'finished') is distinct from 'object'
        and ((cur ->> 'reopenedAt') is null or coalesce((inc -> 'finished' ->> 'doneAt')::bigint, 0) > (cur ->> 'reopenedAt')::bigint) then
        cur := jsonb_set(cur, '{finished}', (inc -> 'finished') || jsonb_build_object('at', v_at)); end if;
      foreach part in array array['timers', 'marks'] loop
        if jsonb_typeof(inc -> part) = 'object' then
          for k, v in select * from jsonb_each(inc -> part) loop
            if jsonb_typeof(v) = 'object' then cur := jsonb_set(cur, array[part, k], v || jsonb_build_object('at', v_at)); end if;
          end loop;
        end if;
      end loop;
      update private.register_live set state = cur, updated_at = now() where session_id = v_s;
    end if;
    out := out || jsonb_build_array(jsonb_build_object('session', v_s, 'state', cur));
  end loop;
  return out;
end $$;

create or replace function public.symi_reopen_register(p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_s public.class_sessions; cur jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to Evia Portal first.'; end if;
  select * into v_s from public.class_sessions where id = p_session;
  if v_s.id is null or not private.own_class(v_s.class_id) then raise exception 'That class isn’t yours in Evia Portal.'; end if;
  if v_s.session_date < current_date - 1 then raise exception 'Only today’s register can be opened again.'; end if;
  insert into private.register_live (session_id) values (p_session) on conflict do nothing;
  select state into cur from private.register_live where session_id = p_session for update;
  cur := (coalesce(cur, '{}'::jsonb) - 'finished') || jsonb_build_object('reopenedAt', (extract(epoch from clock_timestamp()) * 1000)::bigint);
  update private.register_live set state = cur, updated_at = now() where session_id = p_session;
  update public.class_sessions set status = 'open', finished_at = null where id = p_session;
  return cur;
end $$;

revoke all on function public.symi_reopen_register(uuid) from public, anon;
grant execute on function public.symi_reopen_register(uuid) to authenticated;

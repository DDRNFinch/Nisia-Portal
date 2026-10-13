-- The live register, shared between a tutor's devices.
-- Symi keeps today's register (who's in, each learner's timer, each mark, started and finished) in Evia Portal while
-- the class is on, so a register started on a phone shows as started on the desktop, and a mark made on one shows on
-- the other. Each learner's timer and mark is kept separately and the newest change wins; Evia Portal stamps the time
-- of each change itself, so phones whose clocks differ can't overwrite newer marks with older ones.
-- Additive: one new private table and one function. Nothing existing changes.

create table if not exists private.register_live (
  session_id uuid primary key references public.class_sessions(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- p_items: [{session, state: {startedAt, finished: {endAt, auto} | null, timers: {enrolment_id: {...}}, marks: {enrolment_id: {mark}}}}]
-- Only the parts this device changed are sent; anything sent is stamped "at" now. Returns every item's merged state.
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
      'startedAt', cur -> 'startedAt', 'finished', cur -> 'finished');
    if jsonb_typeof(inc) = 'object' and inc <> '{}'::jsonb then
      -- Started: the earliest start any device saw. Finished: the first finish (a finished register stays finished).
      if (inc ->> 'startedAt') is not null and ((cur ->> 'startedAt') is null or (inc ->> 'startedAt')::bigint < (cur ->> 'startedAt')::bigint) then
        cur := jsonb_set(cur, '{startedAt}', inc -> 'startedAt'); end if;
      if jsonb_typeof(inc -> 'finished') = 'object' and jsonb_typeof(cur -> 'finished') is distinct from 'object' then
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

grant execute on function public.symi_registers_sync(jsonb) to authenticated;

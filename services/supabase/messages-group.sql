-- Group messages: staff (and employers) pick several people and send them all the same message. Each person gets it
-- in their own one-to-one conversation, so replies come back privately and the safeguarding rules stay the same:
-- only people this person may message (private.msg_can), the college can read every conversation.
--   messages.group_id   the messages sent together share one, so the college can see they went as a group
--   msg_send_many       send one message to many people (learners can't; up to 300 people, 20 group sends an hour)

alter table public.messages add column if not exists group_id uuid;

create or replace function public.msg_send_many(p_with uuid[], p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_body text := btrim(coalesce(p_body, '')); v_group uuid := gen_random_uuid(); v_to uuid; v_me uuid; v_t uuid; v_org uuid; v_user uuid; v_app text;
  v_sent int := 0; v_skipped int := 0; v_mine uuid[];
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select coalesce(array_agg(m), '{}') into v_mine from private.msg_mine() m where private.msg_role(m) <> 'learner';
  if cardinality(v_mine) = 0 then raise exception 'Only college staff and employers can send group messages.'; end if;
  if v_body = '' then raise exception 'Type a message first.'; end if;
  if char_length(v_body) > 2000 then raise exception 'That message is too long (2,000 characters at most).'; end if;
  if coalesce(cardinality(p_with), 0) = 0 then raise exception 'Pick who to send it to.'; end if;
  if cardinality(p_with) > 300 then raise exception 'That’s too many people for one message (300 at most).'; end if;
  if (select count(distinct group_id) from public.messages where sender_member_id = any(v_mine) and group_id is not null and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'That’s a lot of group messages in a short time. Wait a while and try again.'; end if;
  foreach v_to in array (select array_agg(distinct x) from unnest(p_with) x) loop
    v_me := private.msg_me_for(v_to);
    if v_me is null or not (v_me = any(v_mine)) or not private.msg_can(v_me, v_to) then v_skipped := v_skipped + 1; continue; end if;
    select organisation_id into v_org from public.organisation_members where id = v_me;
    insert into public.message_threads (organisation_id, member_a, member_b, learner_id)
    values (v_org, least(v_me, v_to), greatest(v_me, v_to), coalesce(private.msg_learner(v_me), private.msg_learner(v_to)))
    on conflict (member_a, member_b) do update set last_at = now() returning id into v_t;
    insert into public.messages (thread_id, organisation_id, sender_member_id, body, group_id) values (v_t, v_org, v_me, v_body, v_group);
    insert into public.message_reads (thread_id, member_id, read_at) values (v_t, v_me, now())
    on conflict (thread_id, member_id) do update set read_at = now();
    select user_id into v_user from public.organisation_members where id = v_to;
    v_app := case when private.msg_role(v_to) = 'learner' then 'evia' else 'milos' end;
    insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
    values (v_org, v_user, 'message', 'Message from ' || private.msg_name(v_me), 'Open ' || case when v_app = 'evia' then 'Evia' else 'Milos' end || ' to read it.',
      jsonb_build_object('open', 'messages', 'app', v_app, 'from', v_me, 'thread', v_t));
    v_sent := v_sent + 1;
  end loop;
  if v_sent = 0 then raise exception 'You can’t message the people you picked.'; end if;
  return jsonb_build_object('sent', v_sent, 'skipped', v_skipped, 'group', v_group);
end $$;

revoke all on function public.msg_send_many(uuid[], text) from public, anon;
grant execute on function public.msg_send_many(uuid[], text) to authenticated;

-- Messages between the people around an apprentice, in every app (Evia, Symi, Milos, Paros and Evia Portal).
-- One conversation for each pair of people. Who can message whom:
--   a learner          their tutor (a class they're on), and the assessor, tutor or employer who works with them
--   staff              learners they work with (admins: any learner), and other staff at the college
--   an employer        their own apprentices, and the college staff who work with them (and admins)
-- Safeguarding: nothing is ever deleted. A sender can remove a message (both people then see "Message removed"), and
-- either person can report one. The college's admins (with their authenticator code) can read every conversation in
-- the college, removed messages included, with reported ones first.
--   message_threads     one for each pair of people, with the learner (if one is in it) for the college's view
--   messages            what was said; removed and reported are marked, never deleted
--   message_reads       when each person last read each conversation
-- The apps only use the actions below; the tables have no grants.
--   msg_contacts        who I can message
--   msg_threads         my conversations, newest first, with what was said last and how many are unread
--   msg_unread          how many unread messages I have (for the badge)
--   msg_open            a conversation with someone (its messages), marked read
--   msg_send            send a message (and a notification to their phone)
--   msg_remove          remove my own message
--   msg_report          report a message to the college's admins
--   msg_college         (admins) every conversation in the college
--   msg_college_thread  (admins) one conversation in full

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  member_a uuid not null references public.organisation_members(id) on delete cascade,
  member_b uuid not null references public.organisation_members(id) on delete cascade,
  learner_id uuid references public.learners(id) on delete set null,
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  check (member_a < member_b),
  unique (member_a, member_b)
);
create index if not exists message_threads_org on public.message_threads (organisation_id, last_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  sender_member_id uuid not null references public.organisation_members(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  reported_at timestamptz,
  reported_by uuid references public.organisation_members(id) on delete set null,
  report_reason text
);
create index if not exists messages_thread on public.messages (thread_id, created_at);
create index if not exists messages_sender_recent on public.messages (sender_member_id, created_at desc);

create table if not exists public.message_reads (
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  member_id uuid not null references public.organisation_members(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (thread_id, member_id)
);

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
revoke all on public.message_threads, public.messages, public.message_reads from anon, authenticated;

-- What someone is, for messages: a learner, or their main staff role (admin, assessor, tutor, quality, employer).
create or replace function private.msg_role(p_member uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.learners l where l.organisation_member_id = p_member) then 'learner'
    else coalesce((select r.code from public.organisation_member_roles omr join public.roles r on r.id = omr.role_id
      where omr.organisation_member_id = p_member and r.code in ('admin', 'assessor', 'tutor', 'quality', 'employer')
      order by array_position(array['admin', 'assessor', 'tutor', 'quality', 'employer'], r.code) limit 1), 'staff') end;
$$;

-- A member of staff (or employer) works with this learner: given access to them, or tutor of a class they're on.
create or replace function private.msg_works_with(p_member uuid, p_learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.learner_access la where la.learner_id = p_learner and la.organisation_member_id = p_member)
    or exists (select 1 from public.classes c join public.class_learners cl on cl.class_id = c.id join public.enrolments e on e.id = cl.enrolment_id
      where e.learner_id = p_learner and c.tutor_member_id = p_member and c.archived_at is null);
$$;

-- The learner behind a member (if they are one) and whether they're still on a course (not left or finished).
create or replace function private.msg_learner(p_member uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select l.id from public.learners l where l.organisation_member_id = p_member limit 1;
$$;
create or replace function private.msg_learner_active(p_learner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrolments e where e.learner_id = p_learner and coalesce(e.status, 'active') not in ('completed', 'withdrawn'));
$$;

-- Can p_from message p_to? Both active in the same college, and the rules at the top.
create or replace function private.msg_can(p_from uuid, p_to uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare a public.organisation_members; b public.organisation_members; ra text; rb text; la uuid; lb uuid;
begin
  if p_from is null or p_to is null or p_from = p_to then return false; end if;
  select * into a from public.organisation_members where id = p_from;
  select * into b from public.organisation_members where id = p_to;
  if a.id is null or b.id is null or not a.active or not b.active or a.organisation_id <> b.organisation_id then return false; end if;
  ra := private.msg_role(a.id); rb := private.msg_role(b.id);
  if ra = 'learner' and rb = 'learner' then return false; end if;
  if ra = 'learner' then la := private.msg_learner(a.id); return private.msg_learner_active(la) and private.msg_works_with(b.id, la); end if;
  if rb = 'learner' then lb := private.msg_learner(b.id); return private.msg_learner_active(lb) and (ra = 'admin' or private.msg_works_with(a.id, lb)); end if;
  if ra = 'employer' and rb = 'employer' then return false; end if;
  if ra = 'employer' or rb = 'employer' then
    return ra = 'admin' or rb = 'admin' or exists (select 1 from public.learner_access x join public.learner_access y on y.learner_id = x.learner_id
      where x.organisation_member_id = a.id and y.organisation_member_id = b.id);
  end if;
  return true;
end $$;

-- The signed-in person's memberships that may use messages: learners always, staff with their authenticator code.
create or replace function private.msg_mine() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select om.id from public.organisation_members om
  where om.user_id = auth.uid() and om.active and (private.msg_role(om.id) = 'learner' or private.mfa_ok());
$$;

create or replace function private.msg_name(p_member uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(btrim(p.display_name), ''), 'Someone') from public.organisation_members om left join public.profiles p on p.id = om.user_id where om.id = p_member;
$$;

-- What the other person is to me, in a few words ("Your assessor", "Tutor", "Apprentice at Smith Builders").
create or replace function private.msg_about(p_me uuid, p_other uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare r text := private.msg_role(p_other); mine text := private.msg_role(p_me); l uuid; emp text;
begin
  -- To a learner, the closest role first: someone who is both their assessor and an admin is "Your assessor".
  if mine = 'learner' and r <> 'learner' then
    r := coalesce((select x.code from public.organisation_member_roles omr join public.roles x on x.id = omr.role_id
      where omr.organisation_member_id = p_other and x.code in ('assessor', 'tutor', 'employer', 'quality', 'admin')
      order by array_position(array['assessor', 'tutor', 'employer', 'quality', 'admin'], x.code) limit 1), r);
  end if;
  if r = 'learner' then
    l := private.msg_learner(p_other);
    select e.employer_name into emp from public.enrolments e where e.learner_id = l order by e.created_at desc limit 1;
    return 'Apprentice' || coalesce(' at ' || nullif(btrim(emp), ''), '');
  end if;
  return case when mine = 'learner' then 'Your ' else '' end || case r
    when 'admin' then case when mine = 'learner' then 'college' else 'Admin' end
    when 'assessor' then 'assessor' when 'tutor' then 'tutor' when 'quality' then 'quality team'
    when 'employer' then 'employer' else 'college' end;
end $$;

create or replace function public.msg_contacts() returns table (member_id uuid, organisation_id uuid, name text, role text, about text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.organisation_id, private.msg_name(o.id), private.msg_role(o.id), initcap(left(private.msg_about(m.id, o.id), 1)) || substr(private.msg_about(m.id, o.id), 2)
  from private.msg_mine() m(id)
  join public.organisation_members me on me.id = m.id
  join public.organisation_members o on o.organisation_id = me.organisation_id and o.active and o.id <> m.id
  where private.msg_can(m.id, o.id)
  order by private.msg_role(o.id) = 'learner', 3;
$$;

create or replace function public.msg_threads() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x->>'last_at' desc), '[]'::jsonb) from (
    select jsonb_build_object('id', t.id, 'with', o.id, 'name', private.msg_name(o.id), 'role', private.msg_role(o.id),
      'about', initcap(left(private.msg_about(m.id, o.id), 1)) || substr(private.msg_about(m.id, o.id), 2),
      'can_send', private.msg_can(m.id, o.id), 'last_at', t.last_at,
      'last', (select jsonb_build_object('body', case when x.removed_at is null then left(x.body, 140) else 'Message removed' end, 'mine', x.sender_member_id = m.id, 'at', x.created_at)
        from public.messages x where x.thread_id = t.id order by x.created_at desc limit 1),
      'unread', (select count(*) from public.messages x where x.thread_id = t.id and x.sender_member_id <> m.id and x.removed_at is null
        and x.created_at > coalesce((select r.read_at from public.message_reads r where r.thread_id = t.id and r.member_id = m.id), '-infinity'))) x
    from private.msg_mine() m(id)
    join public.message_threads t on m.id in (t.member_a, t.member_b)
    join public.organisation_members o on o.id = case when t.member_a = m.id then t.member_b else t.member_a end
  ) s(x);
$$;

create or replace function public.msg_unread() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from private.msg_mine() m(id)
  join public.message_threads t on m.id in (t.member_a, t.member_b)
  join public.messages x on x.thread_id = t.id and x.sender_member_id <> m.id and x.removed_at is null
  where x.created_at > coalesce((select r.read_at from public.message_reads r where r.thread_id = t.id and r.member_id = m.id), '-infinity');
$$;

-- Which of my memberships talks to p_with (the one in the same college).
create or replace function private.msg_me_for(p_with uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from private.msg_mine() m(id) join public.organisation_members me on me.id = m.id
  join public.organisation_members o on o.id = p_with and o.organisation_id = me.organisation_id limit 1;
$$;

create or replace function public.msg_open(p_with uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := private.msg_me_for(p_with); v_t public.message_threads;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if v_me is null then raise exception 'You can’t message this person.'; end if;
  select * into v_t from public.message_threads where member_a = least(v_me, p_with) and member_b = greatest(v_me, p_with);
  if v_t.id is null and not private.msg_can(v_me, p_with) then raise exception 'You can’t message this person.'; end if;
  if v_t.id is not null then
    insert into public.message_reads (thread_id, member_id, read_at) values (v_t.id, v_me, now())
    on conflict (thread_id, member_id) do update set read_at = now();
  end if;
  return jsonb_build_object('thread', v_t.id, 'with', p_with, 'name', private.msg_name(p_with), 'role', private.msg_role(p_with),
    'about', initcap(left(private.msg_about(v_me, p_with), 1)) || substr(private.msg_about(v_me, p_with), 2),
    'can_send', private.msg_can(v_me, p_with),
    'their_read_at', (select r.read_at from public.message_reads r where r.thread_id = v_t.id and r.member_id = p_with),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'mine', x.sender_member_id = v_me, 'at', x.created_at,
        'body', case when x.removed_at is null then x.body end, 'removed', x.removed_at is not null, 'reported', x.reported_at is not null) order by x.created_at)
      from (select * from public.messages where thread_id = v_t.id order by created_at desc limit 300) x), '[]'::jsonb));
end $$;

create or replace function public.msg_send(p_with uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := private.msg_me_for(p_with); v_body text := btrim(coalesce(p_body, '')); v_t uuid; v_org uuid; v_learner uuid;
  v_msg public.messages; v_user uuid; v_app text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if v_me is null or not private.msg_can(v_me, p_with) then raise exception 'You can’t message this person.'; end if;
  if v_body = '' then raise exception 'Type a message first.'; end if;
  if char_length(v_body) > 2000 then raise exception 'That message is too long (2,000 characters at most).'; end if;
  if (select count(*) from public.messages where sender_member_id = v_me and created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'That’s a lot of messages in a short time. Wait a few minutes and try again.'; end if;
  select organisation_id into v_org from public.organisation_members where id = v_me;
  v_learner := coalesce(private.msg_learner(v_me), private.msg_learner(p_with));
  insert into public.message_threads (organisation_id, member_a, member_b, learner_id) values (v_org, least(v_me, p_with), greatest(v_me, p_with), v_learner)
  on conflict (member_a, member_b) do update set last_at = now() returning id into v_t;
  insert into public.messages (thread_id, organisation_id, sender_member_id, body) values (v_t, v_org, v_me, v_body) returning * into v_msg;
  insert into public.message_reads (thread_id, member_id, read_at) values (v_t, v_me, now())
  on conflict (thread_id, member_id) do update set read_at = now();
  -- Their phone: Evia for a learner, Milos for staff (Symi, Paros and Evia Portal show the badge when opened).
  -- The words stay off the lock screen: only who it's from.
  select user_id into v_user from public.organisation_members where id = p_with;
  v_app := case when private.msg_role(p_with) = 'learner' then 'evia' else 'milos' end;
  insert into public.notifications (organisation_id, recipient_user_id, notification_type, title, body, data)
  values (v_org, v_user, 'message', 'Message from ' || private.msg_name(v_me), 'Open ' || case when v_app = 'evia' then 'Evia' else 'Milos' end || ' to read it.',
    jsonb_build_object('open', 'messages', 'app', v_app, 'from', v_me, 'thread', v_t));
  return jsonb_build_object('id', v_msg.id, 'thread', v_t, 'at', v_msg.created_at, 'body', v_msg.body, 'mine', true);
end $$;

create or replace function public.msg_remove(p_message uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.messages;
begin
  select * into v from public.messages where id = p_message;
  if v.id is null or v.sender_member_id not in (select * from private.msg_mine()) then raise exception 'You can only remove your own messages.'; end if;
  update public.messages set removed_at = coalesce(removed_at, now()) where id = p_message;
  return jsonb_build_object('id', p_message, 'removed', true);
end $$;

create or replace function public.msg_report(p_message uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.messages; t public.message_threads; v_me uuid;
begin
  select * into v from public.messages where id = p_message;
  select * into t from public.message_threads where id = v.thread_id;
  select m into v_me from private.msg_mine() m where m in (t.member_a, t.member_b) limit 1;
  if v.id is null or v_me is null then raise exception 'You can’t report that message.'; end if;
  if v.reported_at is null then
    update public.messages set reported_at = now(), reported_by = v_me, report_reason = left(nullif(btrim(p_reason), ''), 500) where id = p_message;
    perform private.notify_org_admins(v.organisation_id, 'message_reported', 'A message was reported',
      private.msg_name(v_me) || ' reported a message. Open Evia Portal → Messages to read it.', jsonb_build_object('open', 'messages', 'thread', t.id));
  end if;
  return jsonb_build_object('id', p_message, 'reported', true);
end $$;

-- The college's view (admins, with their authenticator code): every conversation, reported ones first.
create or replace function public.msg_college(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (private.mfa_ok() and private.has_role(p_org, 'admin')) then raise exception 'Only the college’s admins can see this.'; end if;
  return coalesce((select jsonb_agg(x order by (x->>'reported')::int > 0 desc, x->>'last_at' desc) from (
    select jsonb_build_object('id', t.id, 'a', private.msg_name(t.member_a), 'a_role', private.msg_role(t.member_a),
      'b', private.msg_name(t.member_b), 'b_role', private.msg_role(t.member_b), 'learner', t.learner_id is not null, 'last_at', t.last_at,
      'count', (select count(*) from public.messages x where x.thread_id = t.id),
      'reported', (select count(*) from public.messages x where x.thread_id = t.id and x.reported_at is not null)) x
    from public.message_threads t where t.organisation_id = p_org) s(x)), '[]'::jsonb);
end $$;

create or replace function public.msg_college_thread(p_thread uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t public.message_threads;
begin
  select * into t from public.message_threads where id = p_thread;
  if t.id is null or not (private.mfa_ok() and private.has_role(t.organisation_id, 'admin')) then raise exception 'Only the college’s admins can see this.'; end if;
  return jsonb_build_object('id', t.id, 'a', private.msg_name(t.member_a), 'b', private.msg_name(t.member_b),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'from', private.msg_name(x.sender_member_id), 'side', case when x.sender_member_id = t.member_a then 'a' else 'b' end,
      'at', x.created_at, 'body', x.body, 'removed_at', x.removed_at, 'reported_at', x.reported_at, 'reported_by', case when x.reported_by is not null then private.msg_name(x.reported_by) end,
      'report_reason', x.report_reason) order by x.created_at) from public.messages x where x.thread_id = t.id), '[]'::jsonb));
end $$;

revoke all on function public.msg_contacts(), public.msg_threads(), public.msg_unread(), public.msg_open(uuid), public.msg_send(uuid, text),
  public.msg_remove(uuid), public.msg_report(uuid, text), public.msg_college(uuid), public.msg_college_thread(uuid) from public, anon;
grant execute on function public.msg_contacts(), public.msg_threads(), public.msg_unread(), public.msg_open(uuid), public.msg_send(uuid, text),
  public.msg_remove(uuid), public.msg_report(uuid, text), public.msg_college(uuid), public.msg_college_thread(uuid) to authenticated;
revoke all on function private.msg_role(uuid), private.msg_works_with(uuid, uuid), private.msg_learner(uuid), private.msg_learner_active(uuid),
  private.msg_can(uuid, uuid), private.msg_mine(), private.msg_name(uuid), private.msg_about(uuid, uuid), private.msg_me_for(uuid) from public, anon, authenticated;

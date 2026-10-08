-- Question Battle: two learners at the same college, live, in Evia. Each has 5 HP and a hand of 4 question cards
-- (dealt on the phone from their course's checked questions; a fresh 4 when the hand's used). They take turns: the
-- attacker throws a card, the defender has a few seconds to answer. Right: blocked. Wrong or too slow: hit (a boss
-- card hits for 2, and blocking one heals 1). First to 0 HP loses. The right answer never reaches the defender's phone
-- before they answer. Only first name and initial, and their Evia, are shown; there's no chat.
--
--   evia_battle_find     find an opponent at your college (or wait for one); rejoins a battle you're in
--   evia_battle_state    the battle as you see it (and moves it on when time runs out)
--   evia_battle_attack   throw a card
--   evia_battle_answer   answer the card thrown at you
--   evia_battle_leave    leave (a battle in play is lost)

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  a_enrolment uuid not null references public.enrolments(id) on delete cascade,
  b_enrolment uuid references public.enrolments(id) on delete cascade,
  a_name text, b_name text, a_course text, b_course text,
  a_look jsonb not null default '{}'::jsonb, b_look jsonb not null default '{}'::jsonb,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'done', 'expired')),
  turn text check (turn in ('a', 'b')),
  phase text check (phase in ('pick', 'answer')),
  hp_a int not null default 5, hp_b int not null default 5,
  card jsonb,
  deadline timestamptz,
  last jsonb,
  moves int not null default 0,
  winner text check (winner in ('a', 'b')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists battles_waiting on public.battles (organisation_id, status, created_at desc);
create index if not exists battles_a on public.battles (a_enrolment, status);
create index if not exists battles_b on public.battles (b_enrolment, status);
alter table public.battles enable row level security;

-- Resolve the card in play: p_choice null means time ran out.
create or replace function private.battle_resolve(p_id uuid, p_choice int) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.battles; d text; ok boolean; dmg int; heal int; hp int;
begin
  select * into v from public.battles where id = p_id for update;
  if v.status <> 'playing' or v.phase <> 'answer' then return; end if;
  d := case when v.turn = 'a' then 'b' else 'a' end;
  ok := p_choice is not null and p_choice = (v.card ->> 'a')::int;
  dmg := case when ok then 0 when v.card ->> 'kind' = 'boss' then 2 else 1 end;
  heal := case when ok and v.card ->> 'kind' = 'boss' then 1 else 0 end;
  hp := greatest(0, least(5, (case when d = 'a' then v.hp_a else v.hp_b end) - dmg + heal));
  update public.battles set
    hp_a = case when d = 'a' then hp else hp_a end, hp_b = case when d = 'b' then hp else hp_b end,
    last = jsonb_build_object('seq', v.moves + 1, 'by', v.turn, 'q', v.card ->> 'q', 'opts', v.card -> 'opts', 'kind', v.card ->> 'kind',
      'a', (v.card ->> 'a')::int, 'why', v.card ->> 'why', 'choice', p_choice, 'correct', ok, 'dmg', dmg, 'heal', heal, 'timeout', p_choice is null),
    moves = v.moves + 1, card = null,
    status = case when hp <= 0 then 'done' else 'playing' end, winner = case when hp <= 0 then v.turn else null end,
    turn = case when hp <= 0 then v.turn else d end, phase = case when hp <= 0 then null else 'pick' end,
    deadline = case when hp <= 0 then null else now() + interval '45 seconds' end, updated_at = now()
  where id = p_id;
end $$;

create or replace function private.battle_side(v public.battles, p_e uuid) returns text
language sql immutable set search_path = '' as $$ select case when v.a_enrolment = p_e then 'a' when v.b_enrolment = p_e then 'b' end $$;

create or replace function public.evia_battle_find(p_name text, p_course text, p_look jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_e uuid; v_org uuid; v public.battles; v_name text := left(coalesce(nullif(trim(p_name), ''), 'Player'), 20);
begin
  v_e := private.my_enrolment();
  if v_e is null then raise exception 'Connect Evia to your college to battle.'; end if;
  select organisation_id into v_org from public.enrolments where id = v_e;
  -- Already in one? Back to it.
  select * into v from public.battles where (a_enrolment = v_e or b_enrolment = v_e) and status = 'playing' and updated_at > now() - interval '3 minutes' order by created_at desc limit 1;
  if v.id is not null then return jsonb_build_object('id', v.id, 'side', private.battle_side(v, v_e)); end if;
  -- Someone waiting at the college (the same course first)?
  select * into v from public.battles where organisation_id = v_org and status = 'waiting' and a_enrolment <> v_e and created_at > now() - interval '2 minutes'
    order by (a_course = p_course) desc, created_at limit 1 for update skip locked;
  if v.id is not null then
    update public.battles set b_enrolment = v_e, b_name = v_name, b_course = left(p_course, 40), b_look = coalesce(p_look, '{}'::jsonb), status = 'playing',
      turn = case when random() < .5 then 'a' else 'b' end, phase = 'pick', deadline = now() + interval '45 seconds', updated_at = now() where id = v.id;
    return jsonb_build_object('id', v.id, 'side', 'b');
  end if;
  -- Wait for one (one waiting battle each).
  update public.battles set status = 'expired', updated_at = now() where a_enrolment = v_e and status = 'waiting';
  insert into public.battles (organisation_id, a_enrolment, a_name, a_course, a_look) values (v_org, v_e, v_name, left(p_course, 40), coalesce(p_look, '{}'::jsonb)) returning * into v;
  return jsonb_build_object('id', v.id, 'side', 'a');
end $$;

create or replace function public.evia_battle_state(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_e uuid; v public.battles; me text; them text;
begin
  v_e := private.my_enrolment();
  select * into v from public.battles where id = p_id;
  me := private.battle_side(v, v_e);
  if v.id is null or me is null then raise exception 'That battle isn’t yours.'; end if;
  -- Time's up: an unanswered card is a hit; an unthrown one passes the turn.
  if v.status = 'playing' and v.deadline < now() - interval '2 seconds' then
    if v.phase = 'answer' then perform private.battle_resolve(v.id, null);
    else update public.battles set turn = case when turn = 'a' then 'b' else 'a' end, deadline = now() + interval '45 seconds',
      last = jsonb_build_object('seq', moves + 1, 'by', turn, 'skip', true), moves = moves + 1, updated_at = now() where id = v.id; end if;
    select * into v from public.battles where id = p_id;
  end if;
  if v.status = 'waiting' and v.created_at < now() - interval '2 minutes' then
    update public.battles set status = 'expired', updated_at = now() where id = v.id; v.status := 'expired';
  end if;
  them := case when me = 'a' then 'b' else 'a' end;
  return jsonb_build_object('id', v.id, 'side', me, 'status', v.status, 'turn', v.turn, 'phase', v.phase, 'moves', v.moves, 'winner', v.winner,
    'hp_me', case when me = 'a' then v.hp_a else v.hp_b end, 'hp_them', case when me = 'a' then v.hp_b else v.hp_a end,
    'me', jsonb_build_object('name', case when me = 'a' then v.a_name else v.b_name end, 'look', case when me = 'a' then v.a_look else v.b_look end, 'course', case when me = 'a' then v.a_course else v.b_course end),
    'them', jsonb_build_object('name', case when me = 'a' then v.b_name else v.a_name end, 'look', case when me = 'a' then v.b_look else v.a_look end, 'course', case when me = 'a' then v.b_course else v.a_course end),
    'card', case when v.phase = 'answer' then jsonb_build_object('q', v.card ->> 'q', 'opts', v.card -> 'opts', 'kind', v.card ->> 'kind') end,
    'secs_left', case when v.status = 'playing' then greatest(0, ceil(extract(epoch from v.deadline - now())))::int end,
    'last', v.last);
end $$;

create or replace function public.evia_battle_attack(p_id uuid, p_card jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_e uuid; v public.battles; k text; secs int;
begin
  v_e := private.my_enrolment();
  select * into v from public.battles where id = p_id for update;
  if v.id is null or private.battle_side(v, v_e) is null then raise exception 'That battle isn’t yours.'; end if;
  if v.status <> 'playing' or v.phase <> 'pick' or private.battle_side(v, v_e) <> v.turn then raise exception 'It isn’t your turn.'; end if;
  k := coalesce(p_card ->> 'kind', 'think');
  if k not in ('quick', 'think', 'trap', 'boss') or coalesce(length(p_card ->> 'q'), 0) not between 3 and 600 or jsonb_typeof(p_card -> 'opts') <> 'array'
    or jsonb_array_length(p_card -> 'opts') not between 2 and 6 or (p_card ->> 'a')::int not between 0 and jsonb_array_length(p_card -> 'opts') - 1
    then raise exception 'That card can’t be played.'; end if;
  secs := case k when 'quick' then 15 when 'trap' then 20 when 'boss' then 30 else 25 end;
  update public.battles set card = jsonb_build_object('q', p_card ->> 'q', 'opts', p_card -> 'opts', 'a', (p_card ->> 'a')::int, 'why', left(coalesce(p_card ->> 'why', ''), 600), 'kind', k),
    phase = 'answer', deadline = now() + make_interval(secs => secs), updated_at = now() where id = p_id;
end $$;

create or replace function public.evia_battle_answer(p_id uuid, p_choice int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_e uuid; v public.battles;
begin
  v_e := private.my_enrolment();
  select * into v from public.battles where id = p_id;
  if v.id is null or private.battle_side(v, v_e) is null then raise exception 'That battle isn’t yours.'; end if;
  if v.status <> 'playing' or v.phase <> 'answer' or private.battle_side(v, v_e) = v.turn then raise exception 'Nothing to answer.'; end if;
  perform private.battle_resolve(p_id, case when v.deadline >= now() - interval '2 seconds' then p_choice end);
  return public.evia_battle_state(p_id);
end $$;

create or replace function public.evia_battle_leave(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_e uuid; v public.battles; me text;
begin
  v_e := private.my_enrolment();
  select * into v from public.battles where id = p_id for update;
  me := private.battle_side(v, v_e);
  if me is null then return; end if;
  if v.status = 'waiting' then update public.battles set status = 'expired', updated_at = now() where id = p_id;
  elsif v.status = 'playing' then update public.battles set status = 'done', winner = case when me = 'a' then 'b' else 'a' end, phase = null,
    last = jsonb_build_object('seq', moves + 1, 'left', me), updated_at = now() where id = p_id; end if;
end $$;

grant execute on function public.evia_battle_find(text, text, jsonb) to authenticated;
grant execute on function public.evia_battle_state(uuid) to authenticated;
grant execute on function public.evia_battle_attack(uuid, jsonb) to authenticated;
grant execute on function public.evia_battle_answer(uuid, int) to authenticated;
grant execute on function public.evia_battle_leave(uuid) to authenticated;

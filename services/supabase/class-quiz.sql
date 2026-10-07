-- The class quiz on learners' phones. The tutor runs the quiz from Symi on the classroom screen; learners who are on
-- the class answer each question in Evia; the tutor's screen counts the answers as they come in and, when the answer
-- is shown, how many picked each one. Each learner's score is kept, so it's in their Evia and their assessor sees it
-- in Milos. The right answer never goes to a phone before the tutor shows it.
--
--   symi_quiz_start      the tutor starts a quiz for today's session (its questions, from Symi's teaching plan)
--   symi_quiz_step       the tutor moves it on: question n, the answer shown, or finished
--   symi_quiz_state      what the tutor's screen shows: who's answered, how many picked each answer, the scores
--   evia_quiz_now        the learner's live quiz, if their class has one going: the question (and, once shown, the answer)
--   evia_quiz_answer     the learner's answer to the question on screen (they can change it until it's shown)
--   nisia_learner_quizzes  a learner's class quiz scores (Milos)

create table if not exists public.class_quizzes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  title text check (length(title) <= 200),
  questions jsonb not null default '[]'::jsonb,
  current int not null default 0,
  revealed boolean not null default false,
  finished_at timestamptz,
  created_by_member_id uuid references public.organisation_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists class_quizzes_session on public.class_quizzes (session_id, created_at desc);
alter table public.class_quizzes enable row level security;

create table if not exists public.class_quiz_answers (
  quiz_id uuid not null references public.class_quizzes(id) on delete cascade,
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  q int not null,
  choice int not null,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (quiz_id, enrolment_id, q)
);
create index if not exists class_quiz_answers_enrolment on public.class_quiz_answers (enrolment_id);
alter table public.class_quiz_answers enable row level security;
-- No direct access: everything goes through the functions below.

-- The learner's own current enrolment.
create or replace function private.my_enrolment() returns uuid
language sql stable security definer set search_path = '' as $$
  select e.id from public.enrolments e join public.learners l on l.id = e.learner_id join public.organisation_members om on om.id = l.organisation_member_id
  where om.user_id = auth.uid() and om.active order by e.created_at desc limit 1;
$$;

create or replace function public.symi_quiz_start(p_session uuid, p_title text, p_questions jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_s public.class_sessions; v_id uuid; q jsonb;
begin
  select * into v_s from public.class_sessions where id = p_session;
  if v_s.id is null or not private.is_class_tutor(v_s.class_id) then raise exception 'You can’t run a quiz for this class.'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 or jsonb_array_length(p_questions) > 40 then raise exception 'The quiz needs between 1 and 40 questions.'; end if;
  for q in select * from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(q -> 'opts') <> 'array' or jsonb_array_length(q -> 'opts') < 2 or (q ->> 'a')::int not between 0 and jsonb_array_length(q -> 'opts') - 1
      then raise exception 'Each question needs its answers and which one is right.'; end if;
  end loop;
  -- One quiz going at a time for a session: any earlier one is finished.
  update public.class_quizzes set finished_at = now(), updated_at = now() where session_id = v_s.id and finished_at is null;
  insert into public.class_quizzes (organisation_id, session_id, title, questions, created_by_member_id)
  values (v_s.organisation_id, v_s.id, left(p_title, 200), p_questions, private.current_member_id(v_s.organisation_id)) returning id into v_id;
  return v_id;
end $$;

create or replace function public.symi_quiz_step(p_quiz uuid, p_current int, p_revealed boolean default false, p_finished boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare v_q public.class_quizzes; v_class uuid;
begin
  select * into v_q from public.class_quizzes where id = p_quiz;
  select class_id into v_class from public.class_sessions where id = v_q.session_id;
  if v_q.id is null or not private.is_class_tutor(v_class) then raise exception 'You can’t run this quiz.'; end if;
  update public.class_quizzes set current = greatest(0, least(p_current, jsonb_array_length(questions) - 1)), revealed = coalesce(p_revealed, false),
    finished_at = case when p_finished then coalesce(finished_at, now()) else null end, updated_at = now() where id = p_quiz;
end $$;

create or replace function public.symi_quiz_state(p_quiz uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_q public.class_quizzes; v_class uuid; v_n int;
begin
  select * into v_q from public.class_quizzes where id = p_quiz;
  select class_id into v_class from public.class_sessions where id = v_q.session_id;
  if v_q.id is null or not private.is_class_tutor(v_class) then raise exception 'You can’t see this quiz.'; end if;
  v_n := jsonb_array_length(v_q.questions);
  return jsonb_build_object(
    'current', v_q.current, 'revealed', v_q.revealed, 'finished', v_q.finished_at is not null,
    'learners', (select count(*) from public.class_learners cl where cl.class_id = v_class),
    'answered', (select count(*) from public.class_quiz_answers a where a.quiz_id = v_q.id and a.q = v_q.current),
    'counts', (select coalesce(jsonb_agg(coalesce((select count(*) from public.class_quiz_answers a where a.quiz_id = v_q.id and a.q = v_q.current and a.choice = i), 0) order by i), '[]'::jsonb)
      from generate_series(0, jsonb_array_length(v_q.questions -> v_q.current -> 'opts') - 1) i),
    'scores', coalesce((select jsonb_agg(jsonb_build_object('name', private.enrolment_name(x.enrolment_id), 'right', x.r, 'answered', x.n) order by x.r desc, x.n desc)
      from (select a.enrolment_id, count(*) filter (where a.correct) r, count(*) n from public.class_quiz_answers a where a.quiz_id = v_q.id group by a.enrolment_id) x), '[]'::jsonb),
    'total', v_n);
end $$;

create or replace function public.evia_quiz_now() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_e uuid; v_q public.class_quizzes; v_title text; v_item jsonb; v_mine public.class_quiz_answers; v_right int; v_done int;
begin
  if auth.uid() is null then return null; end if;
  v_e := private.my_enrolment();
  if v_e is null then return null; end if;
  select qz.* into v_q from public.class_quizzes qz
    join public.class_sessions s on s.id = qz.session_id
    join public.class_learners cl on cl.class_id = s.class_id and cl.enrolment_id = v_e
    where qz.updated_at > now() - interval '3 hours' and (qz.finished_at is null or qz.finished_at > now() - interval '10 minutes')
    order by qz.created_at desc limit 1;
  if v_q.id is null then return null; end if;
  select c.title into v_title from public.class_sessions s join public.classes c on c.id = s.class_id where s.id = v_q.session_id;
  v_item := v_q.questions -> v_q.current;
  select * into v_mine from public.class_quiz_answers where quiz_id = v_q.id and enrolment_id = v_e and q = v_q.current;
  select count(*) filter (where correct), count(*) into v_right, v_done from public.class_quiz_answers where quiz_id = v_q.id and enrolment_id = v_e;
  return jsonb_build_object('id', v_q.id, 'class', v_title, 'title', v_q.title, 'current', v_q.current, 'total', jsonb_array_length(v_q.questions),
    'finished', v_q.finished_at is not null, 'revealed', v_q.revealed, 'q', v_item ->> 'q', 'opts', v_item -> 'opts',
    'mine', v_mine.choice, 'a', case when v_q.revealed then (v_item ->> 'a')::int end, 'why', case when v_q.revealed then v_item ->> 'why' end,
    'right', v_right, 'answered', v_done);
end $$;

create or replace function public.evia_quiz_answer(p_quiz uuid, p_q int, p_choice int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_e uuid; v_q public.class_quizzes; v_item jsonb;
begin
  v_e := private.my_enrolment();
  select qz.* into v_q from public.class_quizzes qz join public.class_sessions s on s.id = qz.session_id
    join public.class_learners cl on cl.class_id = s.class_id and cl.enrolment_id = v_e where qz.id = p_quiz;
  if v_e is null or v_q.id is null then raise exception 'That quiz isn’t for your class.'; end if;
  if v_q.finished_at is not null then raise exception 'The quiz has finished.'; end if;
  if v_q.current <> p_q or v_q.revealed then raise exception 'Too late: your tutor has moved on.'; end if;
  v_item := v_q.questions -> p_q;
  if p_choice < 0 or p_choice >= jsonb_array_length(v_item -> 'opts') then raise exception 'Choose one of the answers.'; end if;
  insert into public.class_quiz_answers (quiz_id, enrolment_id, q, choice, correct) values (v_q.id, v_e, p_q, p_choice, p_choice = (v_item ->> 'a')::int)
  on conflict (quiz_id, enrolment_id, q) do update set choice = excluded.choice, correct = excluded.correct, answered_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.nisia_learner_quizzes(p_enrolment uuid) returns table (
  quiz_id uuid, session_date date, class text, title text, total int, answered int, right_answers int)
language sql stable security definer set search_path = '' as $$
  select qz.id, s.session_date, c.title, qz.title, jsonb_array_length(qz.questions),
    (select count(*)::int from public.class_quiz_answers a where a.quiz_id = qz.id and a.enrolment_id = p_enrolment),
    (select count(*)::int from public.class_quiz_answers a where a.quiz_id = qz.id and a.enrolment_id = p_enrolment and a.correct)
  from public.class_quizzes qz join public.class_sessions s on s.id = qz.session_id join public.classes c on c.id = s.class_id
  join public.class_learners cl on cl.class_id = c.id and cl.enrolment_id = p_enrolment
  where private.mfa_ok() and private.can_access_enrolment(p_enrolment)
    and exists (select 1 from public.class_quiz_answers a where a.quiz_id = qz.id and a.enrolment_id = p_enrolment)
  order by qz.created_at desc limit 100;
$$;

grant execute on function public.symi_quiz_start(uuid, text, jsonb) to authenticated;
grant execute on function public.symi_quiz_step(uuid, int, boolean, boolean) to authenticated;
grant execute on function public.symi_quiz_state(uuid) to authenticated;
grant execute on function public.evia_quiz_now() to authenticated;
grant execute on function public.evia_quiz_answer(uuid, int, int) to authenticated;
grant execute on function public.nisia_learner_quizzes(uuid) to authenticated;

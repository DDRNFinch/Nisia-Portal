-- Coin gifts: Nisia can give one learner coins (for testing a demo account, or a reward from the college). Each gift is
-- for one enrolment only and is collected once by that learner's Evia, which adds it to their coins.
--
--   evia_claim_grants   the gifts waiting for me (marked collected as they're returned)

create table if not exists public.coin_grants (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  coins int not null check (coins between 1 and 100000),
  why text not null default 'A gift from your college',
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index if not exists coin_grants_waiting on public.coin_grants (enrolment_id) where claimed_at is null;
alter table public.coin_grants enable row level security;

create or replace function public.evia_claim_grants() returns table(coins int, why text)
language plpgsql security definer set search_path = '' as $$
declare v_e uuid;
begin
  v_e := private.my_enrolment();
  if v_e is null then return; end if;
  return query
    update public.coin_grants g set claimed_at = now()
    where g.enrolment_id = v_e and g.claimed_at is null
    returning g.coins, g.why;
end $$;

grant execute on function public.evia_claim_grants() to authenticated;

-- Evia's Nisia helper sends the enrolment with every call: this version takes it, and only ever returns the signed-in
-- learner's own gifts.
create or replace function public.evia_claim_grants(p_enrolment uuid) returns table(coins int, why text)
language plpgsql security definer set search_path = '' as $$
declare v_e uuid;
begin
  v_e := private.my_enrolment();
  if v_e is null or (p_enrolment is not null and p_enrolment <> v_e) then return; end if;
  return query
    update public.coin_grants g set claimed_at = now()
    where g.enrolment_id = v_e and g.claimed_at is null
    returning g.coins, g.why;
end $$;
grant execute on function public.evia_claim_grants(uuid) to authenticated;

-- To give a learner coins: insert into public.coin_grants (enrolment_id, coins, why) values ('<enrolment id>', 500, 'Why');

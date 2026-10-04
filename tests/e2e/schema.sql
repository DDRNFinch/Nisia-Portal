-- Nisia's tables as they are in the live project (columns from it), enough for Symi, Evia and Paros end to end.
-- Signed-in users are the "authenticated" role, as in Supabase; auth.uid() and the sign-in level come from settings
-- (test.uid, test.aal) that the test server sets for each request from the user's token.
create schema if not exists extensions; create schema if not exists auth; create schema if not exists private;
create extension if not exists pgcrypto schema extensions;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
grant usage on schema public, auth, extensions to authenticated, anon;
grant usage on schema private to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal', coalesce(nullif(current_setting('test.aal', true), ''), 'aal1')) $$;
create table auth.users (id uuid primary key, email text);
create table public.organisations (id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), name text not null, seats int default 10, status text default 'active',
  contact_name text, contact_email text, licence_ends date, notes text, updated_at timestamptz default now(), safeguarding_name text, safeguarding_phone text, safeguarding_email text, is_test boolean not null default false);
create table public.profiles (id uuid primary key, created_at timestamptz default now(), display_name text, updated_at timestamptz default now());
create table public.platform_admins (user_id uuid primary key);
create table public.organisation_members (id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id), user_id uuid not null, active boolean not null default true);
create table public.roles (id serial primary key, code text unique);
insert into public.roles (code) values ('admin'),('assessor'),('tutor'),('employer'),('quality'),('learner');
create table public.organisation_member_roles (organisation_member_id uuid references public.organisation_members(id), role_id int references public.roles(id));
create table public.learners (id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id), organisation_member_id uuid not null references public.organisation_members(id), created_at timestamptz default now());
create table public.learner_access (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, learner_id uuid not null references public.learners(id), organisation_member_id uuid not null references public.organisation_members(id), created_at timestamptz default now());
create table public.courses (id uuid primary key default gen_random_uuid(), code text not null, title text not null, created_at timestamptz default now(), source_system text, source_id text, source_version text,
  source_variant text, source_pointer jsonb, content_hash text, published_at timestamptz, is_published boolean, supersedes_course_id uuid);
create table public.enrolments (id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id), learner_id uuid not null references public.learners(id),
  course_id uuid not null references public.courses(id), start_date date not null, end_date date not null, created_at timestamptz default now(), status text default 'active', planned_otj_hours numeric,
  employer_name text, employer_contact_name text, employer_contact_email text, nvq_optional text[]);
create table public.notifications (id uuid primary key default gen_random_uuid(), organisation_id uuid, recipient_user_id uuid, notification_type text, title text, body text, data jsonb, created_at timestamptz default now());
create table public.otj_entries (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, enrolment_id uuid not null, created_by_member_id uuid not null, activity_date date not null,
  activity_type text not null, subject text, description text not null, hours numeric not null, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.otj_confirmations (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, otj_entry_id uuid not null, confirmer_member_id uuid not null, decision text not null,
  comment text, created_at timestamptz default now(), unique (otj_entry_id, confirmer_member_id));
create table public.evidence (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, enrolment_id uuid not null, course_id uuid not null, created_by_member_id uuid not null,
  evidence_type text not null, title text not null, created_at timestamptz default now(), client_reference text, source_metadata jsonb);
create table public.assessments (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, evidence_id uuid not null, assessor_member_id uuid not null, decision text not null,
  feedback text, created_at timestamptz default now(), ksbs text[]);
create table public.reviews (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, enrolment_id uuid not null, course_id uuid not null, created_by_member_id uuid not null,
  review_type text not null, content jsonb, reviewed_at timestamptz not null, created_at timestamptz default now());
create table public.review_signoffs (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, review_id uuid not null, member_id uuid not null, signer_role text not null, signed_at timestamptz);
create table public.evia_pairing_tokens (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, learner_id uuid not null, created_by_member_id uuid, token_hash text not null,
  expires_at timestamptz not null, used_at timestamptz, created_at timestamptz default now());
create table public.evia_records (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, enrolment_id uuid not null, learner_member_id uuid not null, collection text not null,
  record_id text not null, data jsonb not null, deleted_at timestamptz, updated_at timestamptz default now());
alter table public.evia_records enable row level security;
create table public.witness_testimonies (id uuid primary key default gen_random_uuid(), organisation_id uuid not null, enrolment_id uuid not null, course_id uuid not null, witness_member_id uuid not null,
  statement text not null, rating smallint not null, preferred_contact text, signed_at timestamptz not null, created_at timestamptz default now());
-- From the live project.
create or replace function public.nisia_me() returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('user_id', auth.uid(), 'aal', coalesce(auth.jwt()->>'aal','aal1'),
    'platform_admin', exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('organisation_id', o.id, 'organisation', o.name, 'status', o.status, 'member_id', om.id,
        'roles', (select coalesce(jsonb_agg(r.code), '[]'::jsonb) from public.organisation_member_roles omr join public.roles r on r.id = omr.role_id where omr.organisation_member_id = om.id)))
      from public.organisation_members om join public.organisations o on o.id = om.organisation_id where om.user_id = auth.uid() and om.active), '[]'::jsonb),
    'name', (select display_name from public.profiles where id = auth.uid())); $$;

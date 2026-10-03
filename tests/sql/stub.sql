-- A small stand-in for the Nisia database, enough to run the Symi and registers SQL locally.
-- auth.uid() and the sign-in level come from settings: set test.uid / test.aal.
create schema if not exists extensions; create schema if not exists auth; create schema if not exists private;
create extension if not exists pgcrypto schema extensions;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal', coalesce(nullif(current_setting('test.aal', true), ''), 'aal1')) $$;
create table auth.users (id uuid primary key, email text);
create table public.organisations (id uuid primary key default gen_random_uuid(), name text);
create table public.profiles (id uuid primary key, display_name text);
create table public.organisation_members (id uuid primary key default gen_random_uuid(), organisation_id uuid references public.organisations(id), user_id uuid, active boolean not null default true);
create table public.roles (id serial primary key, code text unique);
insert into public.roles (code) values ('admin'),('assessor'),('tutor'),('employer'),('quality'),('learner');
create table public.organisation_member_roles (organisation_member_id uuid references public.organisation_members(id), role_id int references public.roles(id));
create table public.learners (id uuid primary key default gen_random_uuid(), organisation_id uuid references public.organisations(id), organisation_member_id uuid references public.organisation_members(id));
create table public.learner_access (organisation_id uuid, learner_id uuid references public.learners(id), organisation_member_id uuid references public.organisation_members(id));
create table public.courses (id uuid primary key default gen_random_uuid(), title text, source_id text);
create table public.enrolments (id uuid primary key default gen_random_uuid(), organisation_id uuid references public.organisations(id), learner_id uuid references public.learners(id),
  course_id uuid references public.courses(id), status text not null default 'active', employer_name text, created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), organisation_id uuid, recipient_user_id uuid, notification_type text, title text, body text, data jsonb, created_at timestamptz default now());
create table public.platform_admins (user_id uuid primary key);
create table public.otj_entries (id uuid primary key, organisation_id uuid, enrolment_id uuid, created_by_member_id uuid, activity_date date, activity_type text, subject text, description text, hours numeric, updated_at timestamptz default now());
create table public.otj_confirmations (id uuid primary key default gen_random_uuid(), organisation_id uuid, otj_entry_id uuid, confirmer_member_id uuid, decision text, comment text, created_at timestamptz default now(), unique (otj_entry_id, confirmer_member_id));

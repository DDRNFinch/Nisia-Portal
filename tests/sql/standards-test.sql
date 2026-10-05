-- The standards library (stage 1) on the stand-in database. Any failed check stops the run with what went wrong.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
create or replace function pg_temp.ok(p boolean, p_what text) returns void language plpgsql as $$
begin if p is not true then raise exception 'FAILED: %', p_what; end if; raise notice 'ok  %', p_what; end $$;
create or replace function pg_temp.as_user(p uuid, p_aal text default 'aal2') returns void language plpgsql as $$
begin perform set_config('test.uid', coalesce(p::text, ''), false); perform set_config('test.aal', p_aal, false); end $$;
/* Runs sql as the signed-in user (row security on); returns the error, or null if it worked. */
create or replace function pg_temp.refused(p_sql text) returns text language plpgsql as $$
begin execute p_sql; return null; exception when others then return sqlerrm; end $$;
set client_min_messages = notice;
grant usage on schema public, private, auth to authenticated;
grant select on all tables in schema public to authenticated;

insert into public.platform_admins values ('90000000-0000-0000-0000-000000000001');
insert into public.organisations values ('00000000-0000-0000-0000-0000000000c1', 'Standards College');
insert into public.organisation_members (id, organisation_id, user_id) values ('20000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c2');
insert into public.organisation_member_roles select '20000000-0000-0000-0000-0000000000c2', id from public.roles where code = 'admin';
\set master '''90000000-0000-0000-0000-000000000001'''
\set collegeadmin '''10000000-0000-0000-0000-0000000000c2'''

-- What the seed put in (it was loaded twice: nothing doubled).
select pg_temp.ok((select count(*) from public.qualifications) = 3, 'three in the library: ST0095, ST0264 and 6570-05');
select pg_temp.ok((select count(*) from public.qualification_versions where status = 'published') = 3, 'each with one published version (the seed ran twice, nothing doubled)');
select pg_temp.ok((select count(*) from public.requirements r join public.qualification_versions v on v.id = r.version_id join public.qualifications q on q.id = v.qualification_id where q.code = 'ST0095' and v.version = '1.2') = 59,
  'ST0095 v1.2: 59 KSBs');
select pg_temp.ok((select string_agg(kind || '=' || n, ',' order by kind) from (select r.kind, count(*) n from public.requirements r join public.qualification_versions v on v.id = r.version_id join public.qualifications q on q.id = v.qualification_id where q.code = 'ST0095' group by r.kind) x)
  = 'behaviour=6,knowledge=31,skill=22', 'ST0095: 31 knowledge, 22 skills, 6 behaviours');
select pg_temp.ok((select count(*) filter (where option_code is null) = 39 and count(*) filter (where option_code = 'site_carpenter') = 18 and count(*) filter (where option_code = 'architectural_joiner') = 18
  from public.requirements r join public.qualification_versions v on v.id = r.version_id join public.qualifications q on q.id = v.qualification_id where q.code = 'ST0264' and v.version = '1.4'),
  'ST0264 v1.4: 39 core KSBs, 18 for Site carpenter, 18 for Architectural joiner');
select pg_temp.ok((select count(*) filter (where r.kind = 'unit') = 12 and count(*) filter (where r.kind = 'unit' and r.optional) = 4 and count(*) filter (where r.kind = 'outcome') = 75 and count(*) filter (where r.kind = 'criterion') = 335
  from public.requirements r join public.qualification_versions v on v.id = r.version_id join public.qualifications q on q.id = v.qualification_id where q.code = '6570-05'),
  '6570-05: 12 units (4 optional), 75 learning outcomes, 335 assessment criteria');
select pg_temp.ok((select p.code from public.requirements r join public.requirements p on p.id = r.parent_id where r.code = '102.1.4') = '102.1'
  and (select title from public.requirements where code = '102.1.4') like '%• Personal Protective Equipment (PPE)%', 'a criterion sits under its learning outcome, with its sub-points kept');
select pg_temp.ok((select r.title from public.requirements r join public.qualification_versions v on v.id = r.version_id join public.qualifications q on q.id = v.qualification_id where q.code = 'ST0095' and r.code = 'K2')
  = 'Safety control equipment and how to use personal protective equipment (PPE).', 'KSB wording is word for word');

-- A published version can't change, by anyone.
select pg_temp.ok(pg_temp.refused($$update public.requirements set title = 'x' where code = 'K2'$$) like '%published%', 'a published KSB can’t be reworded (even directly in the database)');
select pg_temp.ok(pg_temp.refused($$delete from public.qualification_versions where version = '1.2'$$) like '%published%', 'a published version can’t be deleted');
select pg_temp.ok(pg_temp.refused($$insert into public.requirements (version_id, code, kind, title, position) select id, 'K99', 'knowledge', 'Extra', 99 from public.qualification_versions where version = '1.2'$$) like '%published%',
  'nothing can be added to a published version');

-- Reading: everyone signed in sees published versions; nobody but the master admin changes anything.
select pg_temp.as_user(:collegeadmin);
set role authenticated;
select pg_temp.ok((select jsonb_array_length(public.nisia_standards() -> 'standards')) = 3, 'a college admin sees the library (not ST9999 while it’s a draft)');
select pg_temp.ok(pg_temp.refused($$insert into public.qualifications (code, kind, title) values ('X1', 'standard', 'X')$$) is not null, 'a college admin can’t write to the library directly');
select pg_temp.ok(pg_temp.refused($$select public.admin_save_standard('{"code":"ST9999","kind":"standard","title":"T","version":"1.0","requirements":[{"code":"K1","kind":"knowledge","title":"K"}]}')$$) like '%Only the master admin%',
  'a college admin can’t add a standard');
reset role;
select pg_temp.as_user(:master, 'aal1');
select pg_temp.ok(pg_temp.refused($$select public.admin_save_standard('{"code":"ST9999","kind":"standard","title":"T","version":"1.0","requirements":[{"code":"K1","kind":"knowledge","title":"K"}]}')$$) like '%Only the master admin%',
  'the master admin must use their authenticator app');

-- The master admin adds a new version as a draft, checks it, then publishes it.
select pg_temp.as_user(:master);
select pg_temp.ok(pg_temp.refused($$select public.admin_save_standard('{"code":"ST9999","kind":"standard","title":"Test","version":"1.0","requirements":[{"code":"K1","kind":"knowledge","title":"A"},{"code":"K1","kind":"knowledge","title":"B"}]}')$$) like '%twice%',
  'a KSB in there twice is refused');
select pg_temp.ok(pg_temp.refused($$select public.admin_save_standard('{"code":"ST9999","kind":"standard","title":"Test","version":"1.0","requirements":[{"code":"X1","kind":"knowledge","title":"A"}]}')$$) like '%isn’t a KSB%',
  'something that isn’t a KSB is refused');
select pg_temp.ok(pg_temp.refused($$select public.admin_save_standard('{"code":"ST9999","kind":"standard","title":"Test","version":"1.0","requirements":[{"code":"K1","kind":"knowledge","title":"A","option":"nope"}]}')$$) like '%option%',
  'a KSB for an option that isn’t listed is refused');
select public.admin_save_standard('{"code":"st9999","kind":"standard","title":"Test standard","version":"1.0","options":[{"code":"a","title":"Option A"}],"requirements":[{"code":"K1","kind":"knowledge","title":"Know it"},{"code":"S1","kind":"skill","title":"Do it","option":"a"},{"code":"B1","kind":"behaviour","title":"Be it"}]}') as draft \gset
select pg_temp.ok((select status from public.qualification_versions where id = :'draft') = 'draft' and exists (select 1 from public.qualifications where code = 'ST9999'), 'saved as a draft (the code in capitals)');
select public.admin_save_standard('{"code":"ST9999","kind":"standard","title":"Test standard","version":"1.0","options":[{"code":"a","title":"Option A"}],"requirements":[{"code":"K1","kind":"knowledge","title":"Know it well"},{"code":"S1","kind":"skill","title":"Do it","option":"a"}]}') as draft \gset
select pg_temp.ok((select count(*) from public.qualification_versions v join public.qualifications q on q.id = v.qualification_id where q.code = 'ST9999') = 1
  and (select title from public.requirements where version_id = :'draft' and code = 'K1') = 'Know it well', 'saving the draft again replaces it');

select pg_temp.as_user(:collegeadmin);
set role authenticated;
select pg_temp.ok((select count(*) from public.qualification_versions where id = :'draft') = 0 and (select count(*) from public.requirements where version_id = :'draft') = 0
  and not (public.nisia_standards()::text like '%ST9999%'), 'a draft can’t be seen by colleges');
select pg_temp.ok(pg_temp.refused(format('select public.nisia_standard(%L)', :'draft')) like '%isn’t in the library%', '…even by asking for it');
reset role;

select pg_temp.as_user(:master);
select public.admin_publish_standard(:'draft');
select pg_temp.as_user(:collegeadmin);
set role authenticated;
select pg_temp.ok((select jsonb_array_length(public.nisia_standard(:'draft') -> 'requirements')) = 2, 'once published, colleges see it');
reset role;
select pg_temp.as_user(:master);
select pg_temp.ok(pg_temp.refused($$select public.admin_save_standard('{"code":"ST9999","kind":"standard","title":"Test","version":"1.0","requirements":[{"code":"K1","kind":"knowledge","title":"Changed"}]}')$$) like '%already published%',
  'a published version can’t be saved over: it needs a new version');
select pg_temp.ok(pg_temp.refused(format('select public.admin_delete_standard_draft(%L)', :'draft')) like '%Only a draft%', 'a published version can’t be deleted, even by the master admin');
select public.admin_save_standard('{"code":"ST9999","kind":"standard","title":"Test","version":"1.1","requirements":[{"code":"K1","kind":"knowledge","title":"New"}]}') as v11 \gset
select public.admin_delete_standard_draft(:'v11');
select pg_temp.ok(not exists (select 1 from public.qualification_versions where id = :'v11') and exists (select 1 from public.qualifications where code = 'ST9999'), 'a draft can be deleted; the standard stays while it has a version');

-- Courses follow a version; new learners follow their course, learners already on it stay where they are.
insert into public.courses (id, title, code) values ('60000000-0000-0000-0000-0000000000c1', 'Carpentry', 'carp');
insert into public.learners (id, organisation_id, organisation_member_id) values ('30000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c2');
insert into public.enrolments (id, organisation_id, learner_id, course_id) values ('40000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-0000000000c3', '60000000-0000-0000-0000-0000000000c1');
select v.id as carp from public.qualification_versions v join public.qualifications q on q.id = v.qualification_id where q.code = 'ST0264' \gset
select pg_temp.ok(pg_temp.refused(format('select public.admin_set_course_standard(%L, %L)', '60000000-0000-0000-0000-0000000000c1', :'carp')) like '%options%', 'a standard with options needs one choosing');
select pg_temp.ok(pg_temp.refused(format('select public.admin_set_course_standard(%L, %L, %L)', '60000000-0000-0000-0000-0000000000c1', :'carp', 'roofer')) like '%option%', '…and it must be one of its options');
select pg_temp.ok(public.admin_set_course_standard('60000000-0000-0000-0000-0000000000c1', :'carp', 'site_carpenter') = 0
  and (select qualification_version_id from public.enrolments where id = '40000000-0000-0000-0000-0000000000c1') is null, 'the course follows ST0264 Site carpenter; the learner already on it stays as they were');
insert into public.enrolments (id, organisation_id, learner_id, course_id) values ('40000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-0000000000c3', '60000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select qualification_version_id = :'carp' and qualification_option = 'site_carpenter' from public.enrolments where id = '40000000-0000-0000-0000-0000000000c2'), 'a new learner on the course follows its version and option');
select pg_temp.ok(public.admin_set_course_standard('60000000-0000-0000-0000-0000000000c1', :'carp', 'site_carpenter', true) = 2, 'and the master admin can move everyone on the course across');
select pg_temp.as_user(:collegeadmin);
select pg_temp.ok(pg_temp.refused(format('select public.admin_set_course_standard(%L, %L, %L)', '60000000-0000-0000-0000-0000000000c1', :'carp', 'architectural_joiner')) like '%Only the master admin%', 'a college admin can’t change what a course is built on');
\echo ALL STANDARDS CHECKS PASSED

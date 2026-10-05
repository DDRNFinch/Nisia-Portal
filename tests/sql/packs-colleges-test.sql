-- College packs (stage 3) on the stand-in database. Any failed check stops the run with what went wrong.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
create or replace function pg_temp.ok(p boolean, p_what text) returns void language plpgsql as $$
begin if p is not true then raise exception 'FAILED: %', p_what; end if; raise notice 'ok  %', p_what; end $$;
create or replace function pg_temp.as_user(p uuid, p_aal text default 'aal2') returns void language plpgsql as $$
begin perform set_config('test.uid', coalesce(p::text, ''), false); perform set_config('test.aal', p_aal, false); end $$;
create or replace function pg_temp.refused(p_sql text) returns text language plpgsql as $$
begin execute p_sql; return null; exception when others then return sqlerrm; end $$;
set client_min_messages = notice;
grant usage on schema public, private, auth to authenticated;
grant select on all tables in schema public to authenticated;

-- Two colleges. Ash: an admin, an assessor (with Amy), a tutor (not with Amy), two learners. Birch: an admin and a learner.
insert into public.organisations values ('00000000-0000-0000-0000-0000000000e1', 'Ash College'), ('00000000-0000-0000-0000-0000000000e2', 'Birch College');
insert into public.organisation_members (id, organisation_id, user_id) values
  ('20000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e1'),
  ('20000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e2'),
  ('20000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e3'),
  ('20000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e4'),
  ('20000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e5'),
  ('20000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-0000000000e6'),
  ('20000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-0000000000e7');
insert into public.organisation_member_roles select ('20000000-0000-0000-0000-0000000000e' || x.i)::uuid, r.id from (values (1,'admin'),(2,'assessor'),(3,'tutor'),(4,'learner'),(5,'learner'),(6,'admin'),(7,'learner')) x(i, code) join public.roles r on r.code = x.code;
insert into public.learners (id, organisation_id, organisation_member_id) values
  ('30000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000e4'),
  ('30000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000e5'),
  ('30000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e2', '20000000-0000-0000-0000-0000000000e7');
insert into public.learner_access values ('00000000-0000-0000-0000-0000000000e1', '30000000-0000-0000-0000-0000000000e4', '20000000-0000-0000-0000-0000000000e2');
insert into public.courses (id, title, code) values ('60000000-0000-0000-0000-0000000000e1', 'Bricklayer', 'brick-e'), ('60000000-0000-0000-0000-0000000000e2', 'Trowel', 'trowel-e');
update public.courses c set pack_id = k.id, qualification_version_id = k.qualification_version_id from public.course_packs k where k.code = 'nisia-bricklayer' and c.id = '60000000-0000-0000-0000-0000000000e1';
update public.courses c set pack_id = k.id, qualification_version_id = k.qualification_version_id from public.course_packs k where k.code = 'nisia-trowel3' and c.id = '60000000-0000-0000-0000-0000000000e2';
insert into public.enrolments (id, organisation_id, learner_id, course_id) values
  ('40000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e1', '30000000-0000-0000-0000-0000000000e4', '60000000-0000-0000-0000-0000000000e1'),
  ('40000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e1', '30000000-0000-0000-0000-0000000000e5', '60000000-0000-0000-0000-0000000000e1'),
  ('40000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e2', '30000000-0000-0000-0000-0000000000e7', '60000000-0000-0000-0000-0000000000e1');
\set ash 00000000-0000-0000-0000-0000000000e1
\set birch 00000000-0000-0000-0000-0000000000e2
\set ashadmin 10000000-0000-0000-0000-0000000000e1
\set assessor 10000000-0000-0000-0000-0000000000e2
\set tutor 10000000-0000-0000-0000-0000000000e3
\set amy 10000000-0000-0000-0000-0000000000e4
\set birchadmin 10000000-0000-0000-0000-0000000000e6
\set bob 10000000-0000-0000-0000-0000000000e7
\set e_amy 40000000-0000-0000-0000-0000000000e4
\set e_ben 40000000-0000-0000-0000-0000000000e5
\set e_bob 40000000-0000-0000-0000-0000000000e7
\set course 60000000-0000-0000-0000-0000000000e1
select k.id as yours, k.qualification_version_id as st from public.course_packs k where k.code = 'nisia-bricklayer' \gset
select v.content as yourcontent from public.course_pack_versions v where v.pack_id = :'yours' \gset
select qv.id as nvq from public.qualification_versions qv join public.qualifications q on q.id = qv.qualification_id where q.code = '6570-05' \gset
select qv.id as carp from public.qualification_versions qv join public.qualifications q on q.id = qv.qualification_id where q.code = 'ST0264' \gset

-- A college's packs page.
select pg_temp.as_user(:'ashadmin');
select public.college_packs(:'ash') as page \gset
select pg_temp.ok(((:'page')::jsonb ->> 'admin')::boolean and jsonb_array_length((:'page')::jsonb -> 'packs') >= 4
  and exists (select 1 from jsonb_array_elements((:'page')::jsonb -> 'courses') c where c ->> 'code' = 'brick-e' and (c ->> 'learners')::int = 2 and c ->> 'pack' is null),
  'a college admin sees your packs and its courses (on your pack)');

-- Making a pack: a copy of yours with a topic renamed and two topics merged; KSBs checked against the standard.
select jsonb_build_object('topics', jsonb_build_array(
    jsonb_set((:'yourcontent')::jsonb -> 'topics' -> 0, '{name}', '"Mortar: mixing and gauging"') || jsonb_build_object('from', (:'yourcontent')::jsonb -> 'topics' -> 0 ->> 'id'),
    jsonb_build_object('id', 'ash/walls', 'name', 'Walls', 'ksbs', (select jsonb_agg(k order by n) from (select distinct on (k ->> 'code') k, n from jsonb_array_elements(((:'yourcontent')::jsonb -> 'topics' -> 3 -> 'ksbs') || ((:'yourcontent')::jsonb -> 'topics' -> 4 -> 'ksbs')) with ordinality x(k, n) order by k ->> 'code', n) d))
  )) as mine \gset
select pg_temp.ok(pg_temp.refused(format('select public.college_save_pack(%L, null, %L, %L, null, %L)', :'ash', 'X', :'st', '{"topics":[{"id":"a","name":"A","ksbs":[{"code":"K99"}]}]}')) like '%K99, which isn’t in ST0095 v1.2%',
  'a KSB that isn’t in the standard is refused');
select pg_temp.ok(pg_temp.refused(format('select public.college_save_pack(%L, null, %L, %L, null, %L)', :'ash', 'X', :'carp', '{"topics":[{"id":"a","name":"A","ksbs":[]}]}')) like '%Choose which option%',
  'a pack on a standard with options must say which');
select pg_temp.ok(pg_temp.refused(format('select public.college_save_pack(%L, null, %L, %L, null, %L)', :'ash', 'X', :'nvq', '{"topics":[{"id":"a","name":"A","ksbs":[]}]}')) like '%qualification’s units are set%',
  'a qualification’s units stay as the qualification sets them');
select pg_temp.as_user(:'assessor');
select pg_temp.ok(pg_temp.refused(format('select public.college_save_pack(%L, null, %L, %L, null, %L)', :'ash', 'X', :'st', :'mine')) like '%Only the college’s admins%', 'an assessor can’t make a college pack');
select pg_temp.as_user(:'ashadmin', 'aal1');
select pg_temp.ok(pg_temp.refused(format('select public.college_save_pack(%L, null, %L, %L, null, %L)', :'ash', 'X', :'st', :'mine')) like '%Only the college’s admins%', 'an admin must use their authenticator app');
select pg_temp.as_user(:'ashadmin');
select public.college_save_pack(:'ash', null, 'Ash bricklaying', :'st', null, :'mine') as draft \gset
select k.id as ashpack from public.course_packs k join public.course_pack_versions v on v.pack_id = k.id where v.id = :'draft' \gset
select pg_temp.ok((select k.organisation_id = :'ash' and v.status = 'draft' and v.version = 1 and k.course_code = 'bricklayer' from public.course_packs k join public.course_pack_versions v on v.pack_id = k.id where v.id = :'draft'),
  'saved as Ash’s own draft (version 1)');
select pg_temp.ok((select content -> 'topics' -> 0 ->> 'from' from public.course_pack_versions where id = :'draft') = 'bricklayer/mixing-mortar'
  and (select v.content from public.course_pack_versions v where v.pack_id = :'yours') = (:'yourcontent')::jsonb, 'the copy remembers where its topics came from; your pack is untouched');
select pg_temp.ok(pg_temp.refused(format('select public.college_set_course_pack(%L, %L, %L)', :'ash', :'course', :'ashpack')) like '%publish it first%', 'a draft can’t be given to a course');

-- Birch can't touch Ash's pack.
select pg_temp.as_user(:'birchadmin');
select pg_temp.ok(pg_temp.refused(format('select public.college_save_pack(%L, %L, %L, null, null, %L)', :'birch', :'ashpack', 'Taken', :'mine')) like '%isn’t one of the college’s packs%', 'another college can’t change it');
select pg_temp.ok(pg_temp.refused(format('select public.college_save_pack(%L, %L, %L, null, null, %L)', :'ash', :'ashpack', 'Taken', :'mine')) like '%Only the college’s admins%', '…or save into Ash');
select pg_temp.ok(pg_temp.refused(format('select public.nisia_pack(%L)', :'draft')) like '%isn’t available%', '…or see its draft');

-- Publish it and give it to the course.
select pg_temp.as_user(:'ashadmin');
select public.college_publish_pack(:'draft');
select public.college_set_course_pack(:'ash', :'course', :'ashpack');
select pg_temp.as_user(:'amy');
select pg_temp.ok((select public.nisia_my_pack() ->> 'title') = 'Ash bricklaying', 'Amy’s Evia now gets Ash’s pack');
select pg_temp.as_user(:'bob');
select pg_temp.ok((select public.nisia_my_pack() ->> 'code') = 'nisia-bricklayer', 'Bob at Birch still gets yours');
select pg_temp.as_user(:'birchadmin');
select pg_temp.ok(pg_temp.refused(format('select public.college_set_course_pack(%L, %L, %L)', :'birch', :'course', :'ashpack')) like '%can’t be used here%', 'Birch can’t use Ash’s pack');

-- One learner moves back to yours: their assessor can; a tutor who doesn't teach them, or another college, can't.
select pg_temp.as_user(:'tutor');
select pg_temp.ok(pg_temp.refused(format('select public.set_enrolment_pack(%L, %L)', :'e_amy', :'yours')) like '%assessor or tutor%', 'a tutor who isn’t Amy’s can’t change her pack');
select pg_temp.as_user(:'birchadmin');
select pg_temp.ok(pg_temp.refused(format('select public.set_enrolment_pack(%L, %L)', :'e_amy', :'yours')) like '%assessor or tutor%', 'another college can’t either');
select pg_temp.as_user(:'assessor');
select pg_temp.ok(pg_temp.refused(format('select public.set_enrolment_pack(%L, (select id from public.course_packs where code = %L))', :'e_amy', 'nisia-site')) like '%different standard%', 'a pack on a different standard is refused');
select public.set_enrolment_pack(:'e_amy', :'yours');
select public.nisia_packs() as seen \gset
select pg_temp.ok(((:'seen')::jsonb -> 'enrolments' ->> :'e_amy') = :'yours' and not (((:'seen')::jsonb -> 'enrolments') ? :'e_bob')
  and exists (select 1 from jsonb_array_elements((:'seen')::jsonb -> 'packs') p where p ->> 'title' = 'Ash bricklaying'),
  'Amy’s assessor moves her back to yours; Milos sees which pack each of their learners is on (not Birch’s), and Ash’s pack');
select pg_temp.as_user(:'amy');
select pg_temp.ok((select public.nisia_my_pack() ->> 'code') = 'nisia-bricklayer', 'Amy’s Evia gets yours again; Ben stays on Ash’s');
select pg_temp.as_user(:'ashadmin');
select pg_temp.ok((select (c ->> 'own_pack')::int = 1 and c ->> 'pack' = :'ashpack' from jsonb_array_elements(public.college_packs(:'ash') -> 'courses') c where c ->> 'code' = 'brick-e'), 'the course page shows Ash’s pack, with one learner on their own');

-- Improving it: the next version is a draft; the published one is fixed.
select public.college_save_pack(:'ash', :'ashpack', 'Ash bricklaying', null, null, :'mine') as v2 \gset
select pg_temp.ok((select version = 2 and status = 'draft' from public.course_pack_versions where id = :'v2') and (select status from public.course_pack_versions where id = :'draft') = 'published',
  'saving again makes version 2 as a draft; version 1 stays as published');
select pg_temp.ok(pg_temp.refused(format('update public.course_pack_versions set notes = %L where id = %L', 'x', :'draft')) like '%published%', 'a published version can’t be changed');
select public.college_set_course_pack(:'ash', :'course', null);
select pg_temp.as_user('10000000-0000-0000-0000-0000000000e5');
select pg_temp.ok((select public.nisia_my_pack() ->> 'code') = 'nisia-bricklayer', 'and the course can go back to yours');
\echo ALL COLLEGE PACK CHECKS PASSED

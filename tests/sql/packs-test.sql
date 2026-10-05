-- Course packs (stage 2) on the stand-in database. Any failed check stops the run with what went wrong.
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

-- What the seed put in (it ran twice: nothing doubled), and the courses that use each pack.
select pg_temp.ok((select count(*) from public.course_packs) = 4 and (select count(*) from public.course_pack_versions where status = 'published') = 4, 'four packs, one published version each (the seed ran twice)');
select pg_temp.ok((select jsonb_array_length(v.content -> 'topics') from public.course_pack_versions v join public.course_packs k on k.id = v.pack_id where k.code = 'nisia-bricklayer') = 10
  and (select v.content -> 'topics' -> 0 ->> 'id' from public.course_pack_versions v join public.course_packs k on k.id = v.pack_id where k.code = 'nisia-bricklayer') = 'bricklayer/mixing-mortar',
  'Bricklayer: 10 topics, each with its permanent id');
select pg_temp.ok((select k.qualification_option from public.course_packs k where k.code = 'nisia-site') = 'site_carpenter' and (select k.qualification_option from public.course_packs k where k.code = 'nisia-joiner') = 'architectural_joiner',
  'Site carpenter and Bench joiner packs are on their own option of ST0264');
select pg_temp.ok((select jsonb_array_length(v.content -> 'topics') from public.course_pack_versions v join public.course_packs k on k.id = v.pack_id where k.code = 'nisia-trowel3') = 12, 'Trowel: its 12 units');

-- Reading: anyone signed in gets the packs, with the standard's full wording; what's already on the phone isn't sent again.
insert into public.organisations values ('00000000-0000-0000-0000-0000000000d1', 'Packs College');
insert into public.organisation_members (id, organisation_id, user_id) values ('20000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-0000000000d2'),
  ('20000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-0000000000d3');
insert into public.organisation_member_roles select '20000000-0000-0000-0000-0000000000d2', id from public.roles where code = 'assessor';
insert into public.organisation_member_roles select '20000000-0000-0000-0000-0000000000d3', id from public.roles where code = 'learner';
insert into public.courses (id, title, code) values ('60000000-0000-0000-0000-0000000000d1', 'Bricklayer', 'bricklayer') on conflict do nothing;
update public.courses c set pack_id = k.id from public.course_packs k where k.code = 'nisia-bricklayer' and c.id = '60000000-0000-0000-0000-0000000000d1';
insert into public.learners (id, organisation_id, organisation_member_id) values ('30000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000d3');
insert into public.enrolments (id, organisation_id, learner_id, course_id) values ('40000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d1', '30000000-0000-0000-0000-0000000000d3', '60000000-0000-0000-0000-0000000000d1');
\set assessor '''10000000-0000-0000-0000-0000000000d2'''
\set learner '''10000000-0000-0000-0000-0000000000d3'''

select pg_temp.as_user(:assessor);
set role authenticated;
select public.nisia_packs() as all_packs \gset
select pg_temp.ok(jsonb_array_length((:'all_packs')::jsonb -> 'packs') = 4 and ((:'all_packs')::jsonb -> 'courses' ->> 'bricklayer') is not null, 'an assessor gets the four packs and which pack each course uses');
select pg_temp.ok((select p -> 'standard' ->> 'code' = 'ST0095' and jsonb_array_length(p -> 'ksbs') = 59 and p -> 'ksbs' -> 0 ->> 0 = 'K1'
  from jsonb_array_elements((:'all_packs')::jsonb -> 'packs') p where p ->> 'code' = 'nisia-bricklayer'), '…each with its standard and the full wording of every KSB (Bricklayer: 59)');
select pg_temp.ok((select jsonb_array_length(p -> 'ksbs') = 57 from jsonb_array_elements((:'all_packs')::jsonb -> 'packs') p where p ->> 'code' = 'nisia-site'),
  '…an option pack gets the core and its own option’s KSBs only (Site carpenter: 57)');
select (select jsonb_object_agg(p ->> 'id', p ->> 'hash') from jsonb_array_elements((:'all_packs')::jsonb -> 'packs') p) as have \gset
select pg_temp.ok((select bool_and((p ->> 'unchanged')::boolean) and bool_and(p -> 'topics' is null) from jsonb_array_elements(public.nisia_packs((:'have')::jsonb) -> 'packs') p),
  'packs already on the device aren’t sent again');
select pg_temp.ok(pg_temp.refused($$insert into public.course_packs (code, title, qualification_version_id) select 'x', 'x', id from public.qualification_versions limit 1$$) is not null, 'nobody writes packs directly');
reset role;

select pg_temp.as_user(:learner);
set role authenticated;
select pg_temp.ok((select public.nisia_my_pack() ->> 'code') = 'nisia-bricklayer', 'Evia: the learner gets their course’s pack');
select pg_temp.ok((select (public.nisia_my_pack((select content_hash from public.course_pack_versions v join public.course_packs k on k.id = v.pack_id where k.code = 'nisia-bricklayer')) ->> 'unchanged')::boolean),
  '…and only when it has changed');
select pg_temp.ok(pg_temp.refused('select public.admin_packs()') like '%Only the master admin%', 'only the master admin sees every pack’s versions');
reset role;

-- Saving a pack: every KSB must be the standard's (and the option's), topics named once; a published version is fixed.
select pg_temp.ok(pg_temp.refused($$select private.save_pack('{"code":"t1","title":"T","standard":"ST0095","version":"1.2","content":{"topics":[{"id":"a","name":"A","ksbs":[{"code":"K99","text":"x"}]}]}}', 1, null)$$) like '%K99, which isn’t in ST0095 v1.2%',
  'a KSB that isn’t in the standard is refused');
select pg_temp.ok(pg_temp.refused($$select private.save_pack('{"code":"t1","title":"T","standard":"ST0264","version":"1.4","option":"site_carpenter","content":{"topics":[{"id":"a","name":"A","ksbs":[{"code":"S24","text":"x"}]}]}}', 1, null)$$) like '%S24, which isn’t in ST0264 v1.4 (site_carpenter)%',
  'a KSB from the other option is refused');
select pg_temp.ok(pg_temp.refused($$select private.save_pack('{"code":"t1","title":"T","standard":"ST0095","version":"1.2","content":{"topics":[{"id":"a","name":"Walls","ksbs":[]},{"id":"b","name":"walls","ksbs":[]}]}}', 1, null)$$) like '%Two topics are called%',
  'two topics with the same name are refused');
select private.save_pack('{"code":"t1","title":"Test pack","standard":"ST0095","version":"1.2","content":{"topics":[{"id":"a","name":"Walls","ksbs":[{"code":"K1","text":"H&S"}]}]}}', 1, null) as d1 \gset
select private.save_pack('{"code":"t1","title":"Test pack","standard":"ST0095","version":"1.2","content":{"topics":[{"id":"a","name":"Walls","ksbs":[{"code":"K1","text":"H&S"},{"code":"S1","text":"Safe"}]}]}}', 1, null) as d1b \gset
select pg_temp.ok(:'d1' = :'d1b' and (select jsonb_array_length(content -> 'topics' -> 0 -> 'ksbs') from public.course_pack_versions where id = :'d1') = 2, 'saving a draft again updates it');
select pg_temp.ok((select count(*) from jsonb_array_elements(public.nisia_packs() -> 'packs') p where p ->> 'code' = 't1') = 0, 'a draft isn’t given to the apps');
select private.publish_pack(:'d1');
select pg_temp.ok(pg_temp.refused($$select private.save_pack('{"code":"t1","title":"Test pack","standard":"ST0095","version":"1.2","content":{"topics":[{"id":"a","name":"Changed","ksbs":[]}]}}', 1, null)$$) like '%published%',
  'a published pack version can’t be saved over');
select pg_temp.ok(pg_temp.refused(format('update public.course_pack_versions set notes = %L where id = %L', 'x', :'d1')) like '%published%', '…or changed in the database');
select private.save_pack('{"code":"t1","title":"Test pack","standard":"ST0095","version":"1.2","content":{"topics":[{"id":"a","name":"Walls v2","ksbs":[]}]}}', 2, null) as d2 \gset
select private.publish_pack(:'d2');
select pg_temp.ok((select p -> 'topics' -> 0 ->> 'name' from jsonb_array_elements(public.nisia_packs() -> 'packs') p where p ->> 'code' = 't1') = 'Walls v2', 'the apps get the newest published version');
select pg_temp.ok(pg_temp.refused($$select private.save_pack('{"code":"t1","title":"Test pack","standard":"ST0264","version":"1.4","option":"site_carpenter","content":{"topics":[{"id":"a","name":"A","ksbs":[]}]}}', 3, null)$$) like '%different standard%',
  'a pack can’t move to a different standard');
\echo ALL PACK CHECKS PASSED

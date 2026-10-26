/* Property Maintenance Operative in Evia Portal (run-2026-10-26-pmo-course.sql): the course, its standard word for word
   and its pack of 10 units, linked together, and safe to run twice.   Run: node tests/e2e/pmo-course.e2e.mjs */
import fs from "node:fs";
import { check, q, root, finish } from "./harness.mjs";
try {
  for (const f of ["standards.sql", "run-2026-10-05-standards-save.sql", "packs.sql"]) await q(fs.readFileSync(root + "/services/supabase/" + f, "utf8"));
  const sql = fs.readFileSync(root + "/services/supabase/run-2026-10-26-pmo-course.sql", "utf8");
  await q(sql); await q(sql);
  const [c] = await q(`select c.code, c.title, c.is_published, q.code std, v.version, v.status,
      (select count(*) from public.requirements r where r.version_id = v.id) ksbs, k.code pack
    from public.courses c left join public.qualification_versions v on v.id = c.qualification_version_id left join public.qualifications q on q.id = v.qualification_id
    left join public.course_packs k on k.id = c.pack_id where c.code = 'pmo'`);
  const n = (await q(`select count(*)::int n from public.courses where code = 'pmo'`))[0].n;
  check("The course is added once, published, following ST0171 v1.1 with all 62 KSBs and its own pack", n === 1 && c && c.is_published && c.std === "ST0171" && c.version === "1.1" && +c.ksbs === 62 && c.pack === "nisia-pmo", JSON.stringify({ n, c }));
  const [p] = await q(`select jsonb_array_length(pv.content->'topics') topics, pv.content->'topics'->2->>'name' third from public.course_pack_versions pv join public.course_packs k on k.id = pv.pack_id where k.code = 'nisia-pmo' order by pv.version desc limit 1`);
  check("The pack has the 10 units, in Evia's order", p && +p.topics === 10 && p.third === "Plumbing repairs", JSON.stringify(p));
} catch (e) { check("The test ran to the end", false, e.stack); }
await finish();

// Builds services/supabase/standards-seed.sql: the standards Evia is built on, word for word from Evia's own data
// (../Evia7/ksb-official.js and nvq-data.js), so Nisia's library and Evia start from the same wording.
//   node tools/build-standards.mjs
// The seed is safe to run again: a version already in the library is left alone (published ones can't change).
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), evia = path.resolve(root, "../Evia7");
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ["ksb-official.js", "nvq-data.js"]) vm.runInContext(fs.readFileSync(path.join(evia, f), "utf8"), ctx, { filename: f });
const K = ctx.window.EVIA_KSB_OFFICIAL, N = ctx.window.EVIA_NVQ;

const KIND = { K: "knowledge", S: "skill", B: "behaviour" };
const order = (a, b) => "KSB".indexOf(a[0]) - "KSB".indexOf(b[0]) || +a.slice(1) - +b.slice(1);
const ksb = (code, title, option) => ({ code, kind: KIND[code[0]], title, ...(option ? { option } : {}) });

const bricklayer = { code: "ST0095", kind: "standard", title: "Bricklayer", level: 2, version: "1.2",
  source_note: "Apprenticeship standard ST0095 v1.2. KSBs word for word, as in Evia.",
  requirements: Object.keys(K.bricklayer).sort(order).map((c) => ksb(c, K.bricklayer[c])) };

/* Carpentry and joinery: the core is in both of Evia's lists, word for word the same; each option adds its own. */
const site = K.site, joiner = K.joiner, all = [...new Set([...Object.keys(site), ...Object.keys(joiner)])].sort(order);
const carpentry = { code: "ST0264", kind: "standard", title: "Carpentry and joinery", level: 2, version: "1.4",
  options: [{ code: "site_carpenter", title: "Site carpenter" }, { code: "architectural_joiner", title: "Architectural joiner" }],
  source_note: "Apprenticeship standard ST0264 v1.4: a shared core, and the Site carpenter and Architectural joiner options. KSBs word for word, as in Evia.",
  requirements: all.map((c) => {
    if (c in site && c in joiner) { if (site[c] !== joiner[c]) throw new Error(c + " differs between Site carpenter and Architectural joiner"); return ksb(c, site[c]); }
    return c in site ? ksb(c, site[c], "site_carpenter") : ksb(c, joiner[c], "architectural_joiner");
  }) };

/* The NVQ: units, then each unit's learning outcomes, then their assessment criteria (with any listed sub-points). */
const nvqReq = [];
for (const u of N.units) {
  nvqReq.push({ code: u.n, kind: "unit", title: u.t, optional: !!u.opt, ...(u.lv ? { level: u.lv } : {}) });
  for (const o of u.o) {
    const oc = u.n + "/" + o.n;
    nvqReq.push({ code: oc, kind: "outcome", title: o.t, parent: u.n });
    for (const c of o.c) nvqReq.push({ code: u.n + "/" + c.n, kind: "criterion", title: c.t + (c.s && c.s.length ? "\n" + c.s.map((x) => "• " + x).join("\n") : ""), parent: oc });
  }
}
const trowel = { code: N.qual, kind: "qualification", title: N.title, awarding_body: "City & Guilds", level: 3, version: "1.1",
  source_note: "City & Guilds qualification handbook, July 2025, v1.1: units, learning outcomes and assessment criteria, word for word, as in Evia.",
  requirements: nvqReq };

/* Which Evia course follows which version (and option). */
const links = [["bricklayer", "ST0095", "1.2", null], ["ST0095-v1.2-4bf187b9", "ST0095", "1.2", null], ["site", "ST0264", "1.4", "site_carpenter"],
  ["joiner", "ST0264", "1.4", "architectural_joiner"], ["trowel3", N.qual, "1.1", null]];

const tag = (s) => { let t = "std"; while (s.includes("$" + t + "$")) t += "x"; return "$" + t + "$"; };
let sql = "-- The standards library's starting point, built by tools/build-standards.mjs from Evia's data. Run after standards.sql.\n" +
  "-- Safe to run again: a version already in the library is left as it is.\n";
for (const s of [bricklayer, carpentry, trowel]) {
  const j = JSON.stringify(s), t = tag(j);
  sql += `do $seed$ declare v uuid; begin
  if not exists (select 1 from public.qualification_versions v join public.qualifications q on q.id = v.qualification_id where q.code = '${s.code}' and v.version = '${s.version}') then
    v := private.save_standard(${t}${j}${t}::jsonb, null);
    perform private.publish_standard(v);
  end if;
end $seed$;\n`;
}
for (const [course, code, version, option] of links)
  sql += `update public.courses c set qualification_version_id = v.id, qualification_option = ${option ? `'${option}'` : "null"} from public.qualification_versions v join public.qualifications q on q.id = v.qualification_id
  where c.code = '${course}' and q.code = '${code}' and v.version = '${version}' and c.qualification_version_id is null;\n`;
sql += "-- Learners already enrolled follow their course's version.\n" +
  "update public.enrolments e set qualification_version_id = c.qualification_version_id, qualification_option = c.qualification_option from public.courses c where c.id = e.course_id and e.qualification_version_id is null and c.qualification_version_id is not null;\n";
fs.writeFileSync(path.join(root, "services/supabase/standards-seed.sql"), sql);
console.log("standards-seed.sql:", bricklayer.requirements.length, "ST0095 KSBs,", carpentry.requirements.length, "ST0264 KSBs (" +
  carpentry.requirements.filter((r) => !r.option).length + " core),", nvqReq.length, "6570-05 items (" + N.units.length + " units)");

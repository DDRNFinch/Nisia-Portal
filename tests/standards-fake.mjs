/* A stand-in for Nisia's standards library, for the portal test: starts from the real seed (Evia's three courses) and
   answers the library's actions the way Nisia does. Also makes a small real PDF, to upload. */
import fs from "node:fs"; import path from "node:path";

export function standardsFake(root) {
  const seed = fs.readFileSync(path.join(root, "services/supabase/standards-seed.sql"), "utf8");
  const payloads = [...seed.matchAll(/save_standard\((\$[a-z]+\$)([\s\S]*?)\1::jsonb/g)].map((m) => JSON.parse(m[2]));
  let n = 0; const id = () => "v" + ++n;
  const S = { quals: [], versions: [], calls: [], courses: [
    { id: "cb", code: "bricklayer", title: "Bricklayer (ST0095)", enrolments: 4 }, { id: "cs", code: "site", title: "Site Carpenter (ST0264)", enrolments: 1 },
    { id: "cj", code: "joiner", title: "Architectural Joiner (ST0264)", enrolments: 0 }, { id: "ct", code: "trowel3", title: "Trowel Occupations L3 (6570-05)", enrolments: 0 },
    { id: "cx", code: "carp", title: "Carpentry", enrolments: 2 }] };
  const save = (p, status) => {
    const code = String(p.code || "").toUpperCase().trim();
    if (!p.requirements || !p.requirements.length) throw new Error("There’s nothing in it yet: add its KSBs, or its units and criteria.");
    let q = S.quals.find((x) => x.code === code);
    if (!q) S.quals.push(q = { id: "q" + S.quals.length, code, kind: p.kind, title: p.title, awarding_body: p.awarding_body || null, level: p.level ? +p.level : null });
    const old = S.versions.find((v) => v.qid === q.id && v.version === p.version);
    if (old && old.status === "published") throw new Error(code + " version " + p.version + " is already published, so it can’t change. Add it as a new version.");
    if (old) S.versions.splice(S.versions.indexOf(old), 1);
    const v = { id: id(), qid: q.id, version: p.version, status, options: p.options || [], source_url: p.source_url || null, source_note: p.source_note || null, requirements: p.requirements,
      published_at: status === "published" ? "2026-10-05T10:00:00Z" : null, created_at: new Date(Date.now() + n * 1000).toISOString() };
    S.versions.push(v); return v;
  };
  for (const p of payloads) save(p, "published");
  const vOf = (code) => S.versions.find((v) => S.quals.find((q) => q.id === v.qid).code === code);
  const link = (cid, code, option) => Object.assign(S.courses.find((c) => c.id === cid), { version_id: vOf(code).id, option: option || null });
  link("cb", "ST0095"); link("cs", "ST0264", "site_carpenter"); link("cj", "ST0264", "architectural_joiner"); link("ct", "6570-05");

  /* The packs, from the real seed. */
  const packSeed = fs.readFileSync(path.join(root, "services/supabase/packs-seed.sql"), "utf8");
  S.packs = [...packSeed.matchAll(/save_pack\((\$[a-z]+\$)([\s\S]*?)\1::jsonb/g)].map((m, i) => ({ ...JSON.parse(m[2]), id: "k" + i, vid: "kv" + i }));
  const course0 = (k) => S.courses.find((c) => c.code === k.course);
  const counts = (v) => v.requirements.reduce((a, r) => (a[r.kind] = (a[r.kind] || 0) + 1, a), {});
  const handlers = {
    nisia_standards: () => ({ courses: S.courses.map((c) => ({ ...c, version_id: c.version_id || null, option: c.option || null })),
      standards: S.quals.map((q) => ({ ...q, versions: S.versions.filter((v) => v.qid === q.id).reverse().map((v) => ({ id: v.id, version: v.version, status: v.status, options: v.options, source_url: v.source_url,
        published_at: v.published_at, created_at: v.created_at, counts: counts(v), enrolments: S.courses.filter((c) => c.version_id === v.id).reduce((a, c) => a + c.enrolments, 0),
        courses: S.courses.filter((c) => c.version_id === v.id).map((c) => ({ id: c.id, code: c.code, title: c.title, option: c.option })) })) })) }),
    nisia_standard: (b) => { const v = S.versions.find((x) => x.id === b.p_version), q = S.quals.find((x) => x.id === v.qid);
      return { id: v.id, code: q.code, kind: q.kind, title: q.title, awarding_body: q.awarding_body, level: q.level, version: v.version, status: v.status, options: v.options, source_url: v.source_url,
        source_note: v.source_note, published_at: v.published_at, requirements: v.requirements }; },
    admin_packs: () => S.packs.map((k) => ({ id: k.id, code: k.code, title: k.title, course: k.course, college: null, standard: k.standard + " v" + k.version,
      option: k.option ? ({ site_carpenter: "Site carpenter", architectural_joiner: "Architectural joiner" })[k.option] : null, courses: course0(k) ? [course0(k).title] : [], enrolments: course0(k) ? course0(k).enrolments : 0,
      versions: [{ id: k.vid, version: 1, status: "published", hash: "h", published_at: "2026-10-06T10:00:00Z", topics: k.content.topics.length }] })),
    nisia_pack: (b) => { const k = S.packs.find((x) => x.vid === b.p_version), v = vOf(k.standard), q = S.quals.find((x) => x.id === v.qid);
      return { id: k.id, version_id: k.vid, code: k.code, title: k.title, course: k.course, version: k.pver || 1, hash: "h" + (k.pver || 1), status: k.status || "published", mine: !!k.org, topics: k.content.topics,
        standard: { code: q.code, kind: q.kind, title: q.title, version: v.version, option: k.option, option_title: k.option ? (v.options.find((o) => o.code === k.option) || {}).title : null },
        ksbs: v.requirements.filter((r) => ["knowledge", "skill", "behaviour", "criterion"].includes(r.kind) && (!r.option || r.option === k.option)).map((r) => [r.code, r.title]) }; },
    /* A college's packs (the college admin's Packs page, the learner page and the apps). */
    college_packs: () => ({ admin: true,
      packs: S.packs.map((k) => ({ id: k.id, code: k.code, title: k.title, course: k.course, mine: !!k.org, kind: vOf(k.standard) && S.quals.find((q) => q.id === vOf(k.standard).qid).kind,
        standard: k.standard + " v" + k.version, version_id: vOf(k.standard).id, option: k.option, option_title: k.option ? (vOf(k.standard).options.find((o) => o.code === k.option) || {}).title : null,
        versions: [{ id: k.vid, version: k.pver || 1, status: k.status || "published", topics: k.content.topics.length }], learners: 0 })),
      courses: [{ id: "cb", code: "bricklayer", title: "Bricklayer (ST0095)", version_id: vOf("ST0095").id, option: null, yours: "k0", pack: S.collegeCourse || null, learners: 1, own_pack: S.enrolPack ? 1 : 0 }] }),
    college_save_pack: (b) => { S.collegeSaved = b;
      const k = { id: "kc", vid: "kcv1", code: "college-1", title: b.p_title, course: "bricklayer", standard: "ST0095", version: "1.2", option: null, content: b.p_content, org: true, status: "draft", pver: 1 };
      S.packs = S.packs.filter((x) => x.id !== "kc").concat([k]); return k.vid; },
    college_publish_pack: (b) => { const k = S.packs.find((x) => x.vid === b.p_version); k.status = "published"; S.collegePublished = b.p_version; return null; },
    college_set_course_pack: (b) => { S.collegeCourse = b.p_pack; S.courseSet3 = b; return null; },
    set_enrolment_pack: (b) => { S.enrolPack = b; return null; },
    nisia_packs: () => ({ packs: S.packs.filter((k) => (k.status || "published") === "published").map((k) => { const v = vOf(k.standard), q = S.quals.find((x) => x.id === v.qid);
        return { id: k.id, code: k.code, title: k.title, course: k.course, version: k.pver || 1, hash: "h" + (k.pver || 1), topics: k.content.topics, standard: { code: q.code, kind: q.kind, version: v.version, option: k.option },
          ksbs: v.requirements.filter((r) => ["knowledge", "skill", "behaviour", "criterion"].includes(r.kind) && (!r.option || r.option === k.option)).map((r) => [r.code, r.title]) }; }),
      courses: Object.fromEntries(S.packs.filter((k) => !k.org).map((k) => [k.course, k.id])),
      enrolments: { e0: S.enrolPack ? S.enrolPack.p_pack : S.collegeCourse || "k0" } }),
    admin_save_standard: (b) => { S.saved = b.p; return save(b.p, "draft").id; },
    admin_publish_standard: (b) => { const v = S.versions.find((x) => x.id === b.p_version); v.status = "published"; v.published_at = "2026-10-05T11:00:00Z"; return null; },
    admin_delete_standard_draft: (b) => { S.versions = S.versions.filter((x) => x.id !== b.p_version || x.status !== "draft"); return null; },
    admin_set_course_standard: (b) => { const v = S.versions.find((x) => x.id === b.p_version);
      if (v.options.length && !b.p_option) throw new Error("This standard has options: choose which one the course follows.");
      S.courseSet = b; Object.assign(S.courses.find((c) => c.id === b.p_course), { version_id: b.p_version, option: b.p_option || null }); return b.p_move_learners ? S.courses.find((c) => c.id === b.p_course).enrolments : 0; },
  };
  return { S, handles: (p) => p.startsWith("/rest/v1/rpc/") && p.slice(13) in handlers,
    answer(p, body) { S.calls.push(p.slice(13)); try { return { status: 200, data: handlers[p.slice(13)](body) }; } catch (e) { return { status: 400, data: { code: "P0001", message: e.message } }; } } };
}

/* A real (if tiny) PDF: one page, a line of text per entry. */
export function tinyPdf(lines) {
  const esc = (s) => s.replace(/[\\()]/g, (c) => "\\" + c);
  const content = "BT /F1 11 Tf 50 780 Td 14 TL " + lines.map((l) => "(" + esc(l) + ") Tj T*").join(" ") + " ET";
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "<< /Length " + Buffer.byteLength(content) + " >>\nstream\n" + content + "\nendstream"];
  let out = "%PDF-1.4\n"; const at = [];
  objs.forEach((o, i) => { at.push(Buffer.byteLength(out)); out += (i + 1) + " 0 obj\n" + o + "\nendobj\n"; });
  const xref = Buffer.byteLength(out);
  out += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n" + at.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("") +
    "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  return Buffer.from(out, "latin1");
}

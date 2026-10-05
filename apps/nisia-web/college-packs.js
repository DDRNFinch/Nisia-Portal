/* A college's packs: the topics its courses are taught and evidenced in.
   - Its courses, each with the pack it uses (yours unless the college chooses one of its own), and how many learners
     are on a pack of their own.
   - The packs it can use: yours (Nisia's) and its own, with drafts. Open one to read it; copy one to start a pack of
     the college's own; edit its own (a published pack's changes become its next version, as a draft).
   - The builder: name the pack, add, rename, reorder or remove topics, choose each topic's KSBs from the standard,
     and see straight away which KSBs no topic covers yet. Save as a draft; publish when it's ready.
   Your packs and the standards are never changed: a college only ever changes its own copy. */
let ui, S = {};
const LBL = { knowledge: "Knowledge", skill: "Skills", behaviour: "Behaviours" };
const kindOf = (c) => ({ K: "knowledge", S: "skill", B: "behaviour" })[c[0]] || "knowledge";
const order = (a, b) => "KSB".indexOf(a[0]) - "KSB".indexOf(b[0]) || +a.slice(1) - +b.slice(1);

export async function collegePacksPage(helpers) {
  ui = helpers;
  const { shell, rpc, esc, org } = ui;
  shell('<p class="loading">Loading packs…</p>');
  /* So the learner pages and the apps' copy include anything just published or chosen. */
  if (ui.refreshPacks) await ui.refreshPacks().catch(() => {});
  let P;
  try { P = await rpc("college_packs", { p_org: org() }); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  S.P = P;
  const byId = Object.fromEntries(P.packs.map((k) => [k.id, k]));
  const fits = (c) => P.packs.filter((k) => k.version_id === c.version_id && (k.option || null) === (c.option || null) && k.versions.some((v) => v.status === "published"));
  shell(
    '<div class="topbar"><div><div class="label">College</div><h1>Packs</h1></div>' + (P.admin ? '<div class="actions"><button class="btn primary" type="button" id="cpNew">Make a pack</button></div>' : "") + '</div>' +
    '<p class="muted" style="max-width:740px;margin:-6px 0 18px">A pack is the topics a course is taught and evidenced in, each covering KSBs from the standard. Learners use yours unless the college chooses its own. Your learners’ evidence and sign-offs are kept by KSB, so changing pack never loses anything.</p>' +
    '<section class="panel"><div class="panel-head"><div><h2>Courses</h2><span class="small muted">The pack each course uses. Learners can be moved onto another pack from their page, or by their assessor in Milos.</span></div></div>' +
      (P.courses.length ? '<div class="table-wrap flat"><table><thead><tr><th>Course</th><th>Pack</th><th>Learners</th></tr></thead><tbody>' + P.courses.map((c) => {
        const opts = fits(c), cur = c.pack || c.yours;
        return '<tr class="static"><td><b>' + esc(c.title) + '</b></td><td>' + (P.admin && opts.length > 1
          ? '<select class="input" data-course="' + c.id + '" aria-label="Pack for ' + esc(c.title) + '">' + opts.map((k) => '<option value="' + k.id + '"' + (k.id === cur ? " selected" : "") + '>' + esc(k.title) + (k.mine ? "" : " (yours)") + '</option>').join("") + '</select>'
          : esc((byId[cur] || {}).title || "Yours")) + '</td><td class="num">' + c.learners + (c.own_pack ? '<br><span class="small muted">' + c.own_pack + ' on their own</span>' : "") + '</td></tr>'; }).join("") + '</tbody></table></div>'
        : '<p class="muted">No courses yet.</p>') + '</section>' +
    '<section class="panel"><div class="panel-head"><div><h2>Packs</h2><span class="small muted">Yours come ready-made; copy one to make the college’s own.</span></div></div>' +
      '<div class="table-wrap flat"><table><thead><tr><th>Pack</th><th>Built on</th><th>Version</th><th>Topics</th><th>Learners</th><th></th></tr></thead><tbody>' +
      P.packs.map((k) => { const v = k.versions[0] || {}, pub = k.versions.find((x) => x.status === "published");
        return '<tr class="static"><td><b>' + esc(k.title) + '</b><br><span class="small muted">' + (k.mine ? "The college’s own" : "Yours (Nisia)") + '</span></td><td>' + esc(k.standard) + (k.option_title ? ' <span class="small muted">· ' + esc(k.option_title) + '</span>' : "") +
          '</td><td>v' + esc(v.version || "") + ' ' + (v.status === "draft" ? '<span class="pill warn">Draft</span>' : '<span class="pill good">Published</span>') + '</td><td class="num">' + (v.topics || 0) + '</td><td class="num">' + k.learners +
          '</td><td style="text-align:right;white-space:nowrap"><button class="btn small" type="button" data-open="' + v.id + '">Open</button>' +
          (P.admin && k.kind === "standard" ? (k.mine ? ' <button class="btn small" type="button" data-edit="' + k.id + '">Edit</button>' : "") + ' <button class="btn small" type="button" data-copy="' + (pub || v).id + '">Copy</button>' : "") +
          (P.admin && k.mine && v.status === "draft" ? ' <button class="btn small primary" type="button" data-publish="' + v.id + '">Publish</button>' : "") + '</td></tr>'; }).join("") +
      '</tbody></table></div></section>');
  const root = document.getElementById("main");
  const nb = root.querySelector("#cpNew"); if (nb) nb.onclick = () => startBlank();
  root.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => view(b.dataset.open));
  root.querySelectorAll("[data-copy]").forEach((b) => b.onclick = () => copyFrom(b.dataset.copy));
  root.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => { const k = byId[b.dataset.edit]; edit(k, k.versions[0].id); });
  root.querySelectorAll("[data-publish]").forEach((b) => b.onclick = () => publish(b.dataset.publish, b));
  root.querySelectorAll("select[data-course]").forEach((sel) => sel.onchange = async () => {
    const c = P.courses.find((x) => x.id === sel.dataset.course), k = byId[sel.value];
    if (!confirm("Move " + c.title + " onto “" + k.title + "”? Learners on the course follow it (except any on a pack of their own). Their evidence and sign-offs are kept by KSB, so nothing is lost.")) { sel.value = c.pack || c.yours; return; }
    try { await rpc("college_set_course_pack", { p_org: org(), p_course: c.id, p_pack: k.mine ? k.id : null }); ui.hit("packs.course"); ui.toast(c.title + " uses “" + k.title + "” now."); collegePacksPage(ui); }
    catch (x) { ui.toast(x.message); sel.value = c.pack || c.yours; }
  });
}

async function publish(id, btn) {
  const { rpc, toast, busy, hit } = ui;
  let p; try { p = await rpc("nisia_pack", { p_version: id }); } catch (x) { toast(x.message); return; }
  const gaps = uncovered(p.topics, p.ksbs);
  if (!confirm("Publish “" + p.title + "” v" + p.version + "?" + (gaps.length ? "\n\n" + gaps.length + " KSB" + (gaps.length === 1 ? " isn’t" : "s aren’t") + " in any topic yet: " + gaps.slice(0, 12).join(", ") + (gaps.length > 12 ? "…" : "") + "." : "") +
    "\n\nOnce published it can’t be changed: improvements become its next version.")) return;
  busy(btn, "Publishing…", async () => { try { await rpc("college_publish_pack", { p_version: id }); hit("packs.publish"); toast("“" + p.title + "” is published. Choose it for a course to use it."); collegePacksPage(ui); } catch (x) { toast(x.message); } });
}
const uncovered = (topics, ksbs) => { const got = new Set(topics.flatMap((t) => t.ksbs.map((k) => k.code))); return (ksbs || []).map(([c]) => c).filter((c) => !got.has(c)); };

/* Read a pack. */
async function view(id) {
  const { rpc, esc, modal, toast } = ui;
  let p; try { p = await rpc("nisia_pack", { p_version: id }); } catch (x) { toast(x.message); return; }
  const full = Object.fromEntries(p.ksbs || []), gaps = uncovered(p.topics, p.ksbs);
  const m = modal(p.title + " v" + p.version, '<p class="small muted" style="margin-top:-4px">Built on ' + esc(p.standard.code + " v" + p.standard.version) + (p.standard.option_title ? " · " + esc(p.standard.option_title) : "") + ' · ' + p.topics.length + ' topics · ' +
    (gaps.length ? '<b>' + gaps.length + ' KSBs not in any topic</b>' : 'every KSB covered') + '</p><div class="std-body">' + p.topics.map((t, i) => '<details class="std-unit"><summary><b class="mono">' + (i + 1) + '</b> ' + esc(t.name) + ' <span class="small muted">· ' + t.ksbs.length + ' KSBs</span></summary>' +
    t.ksbs.map((k) => '<div class="std-row" title="' + esc(full[k.code] || "") + '"><b class="mono">' + esc(k.code) + '</b><span>' + esc(k.text || full[k.code] || "") + '</span></div>').join("") + '</details>').join("") + '</div>');
  m.classList.add("wide-modal");
}

/* Start: a copy of a pack, a college pack to edit, or a blank pack on a standard. */
async function copyFrom(id) {
  let p; try { p = await ui.rpc("nisia_pack", { p_version: id }); } catch (x) { ui.toast(x.message); return; }
  builder({ pack: null, title: p.title + " (" + (ui.collegeName() || "college") + ")", standardVersion: S.P.packs.find((k) => k.id === p.id).version_id, option: p.standard.option, standard: p.standard, ksbs: p.ksbs,
    topics: p.topics.map((t) => ({ id: t.id, from: t.from || t.id, fromName: p.mine ? null : t.name, name: t.name, ksbs: t.ksbs.map((k) => ({ code: k.code, text: k.text || "" })) })) });
}
async function edit(k, versionId) {
  let p; try { p = await ui.rpc("nisia_pack", { p_version: versionId }); } catch (x) { ui.toast(x.message); return; }
  builder({ pack: k.id, title: p.title, standardVersion: k.version_id, option: p.standard.option, standard: p.standard, ksbs: p.ksbs, draftOf: p.status === "published" ? p.version + 1 : p.version,
    topics: p.topics.map((t) => ({ id: t.id, from: t.from, name: t.name, ksbs: t.ksbs.map((x) => ({ code: x.code, text: x.text || "" })) })) });
}
async function startBlank() {
  const { rpc, esc, modal, toast } = ui;
  let L; try { L = await rpc("nisia_standards"); } catch (x) { toast(x.message); return; }
  const choices = L.standards.filter((q) => q.kind === "standard").flatMap((q) => q.versions.filter((v) => v.status === "published").flatMap((v) => (v.options || []).length
    ? v.options.map((o) => ({ v, q, o, label: q.code + " v" + v.version + " · " + q.title + " · " + o.title })) : [{ v, q, o: null, label: q.code + " v" + v.version + " · " + q.title }]));
  const m = modal("Make a pack", '<form id="cpStart" class="form-grid"><label class="field" style="grid-column:1/-1">Name<input name="title" required placeholder="e.g. Bricklaying, our way"></label>' +
    '<label class="field" style="grid-column:1/-1">Built on<select name="std">' + choices.map((c, i) => '<option value="' + i + '">' + esc(c.label) + '</option>').join("") + '</select></label>' +
    '<p class="small muted" style="grid-column:1/-1">Or close this and use Copy on one of your packs to start from its topics.</p>' +
    '<div class="row-actions" style="grid-column:1/-1"><button class="btn primary" type="submit">Start</button></div></form>');
  m.querySelector("#cpStart").onsubmit = async (e) => {
    e.preventDefault(); const f = e.target, c = choices[+f.std.value];
    let v; try { v = await rpc("nisia_standard", { p_version: c.v.id }); } catch (x) { toast(x.message); return; }
    const ksbs = v.requirements.filter((r) => ["knowledge", "skill", "behaviour"].includes(r.kind) && (!r.option || (c.o && r.option === c.o.code))).map((r) => [r.code, r.title]);
    ui.closeModal();
    builder({ pack: null, title: f.title.value.trim(), standardVersion: c.v.id, option: c.o ? c.o.code : null, standard: { code: c.q.code, version: c.v.version, option_title: c.o ? c.o.title : null }, ksbs,
      topics: [{ id: newId(), name: "First topic", ksbs: [] }] });
  };
}
const newId = () => "college/" + Math.random().toString(36).slice(2, 10);

/* The builder. */
function builder(B) {
  const { shell, esc, rpc, toast, busy, hit } = ui;
  const full = Object.fromEntries(B.ksbs || []);
  const draw = () => {
    const gaps = uncovered(B.topics, B.ksbs), total = (B.ksbs || []).length;
    shell('<div class="topbar"><div><div class="label">College · ' + (B.pack ? "Editing" : "New pack") + '</div><h1>' + esc(B.title || "New pack") + '</h1></div><div class="actions"><button class="btn" type="button" id="bCancel">Cancel</button><button class="btn primary" type="button" id="bSave">Save as a draft</button></div></div>' +
      '<div class="grid b-grid"><div>' +
        '<section class="panel"><label class="field">Name<input class="input" id="bTitle" value="' + esc(B.title) + '"></label>' +
          '<p class="small muted" style="margin:8px 0 0">Built on ' + esc(B.standard.code + " v" + B.standard.version) + (B.standard.option_title ? " · " + esc(B.standard.option_title) : "") + (B.draftOf ? ' · saving makes version ' + B.draftOf : "") + '</p></section>' +
        B.topics.map((t, i) => '<section class="panel b-topic" data-i="' + i + '"><div class="b-head"><span class="pf-no">' + (i + 1) + '</span><input class="input b-name" data-i="' + i + '" value="' + esc(t.name) + '" aria-label="Topic name">' +
          '<button class="btn small" type="button" data-up="' + i + '" aria-label="Move up"' + (i ? "" : " disabled") + '>↑</button><button class="btn small" type="button" data-down="' + i + '" aria-label="Move down"' + (i < B.topics.length - 1 ? "" : " disabled") + '>↓</button>' +
          '<button class="btn small danger" type="button" data-rm="' + i + '" aria-label="Remove topic">Remove</button></div>' +
          (t.from ? '<p class="small muted" style="margin:6px 0 0">From your “' + esc(t.fromName || t.from.split("/").pop().replace(/-/g, " ")) + '”: its lessons come with it in Evia.</p>' : '<p class="small muted" style="margin:6px 0 0">A new topic: Evia brings the lessons for the KSBs it covers.</p>') +
          '<div class="chips b-ksbs">' + t.ksbs.map((k) => '<span class="chip" title="' + esc(full[k.code] || "") + '">' + esc(k.code) + ' <button type="button" class="b-x" data-i="' + i + '" data-k="' + esc(k.code) + '" aria-label="Remove ' + esc(k.code) + '">×</button></span>').join("") +
          '<button class="btn small" type="button" data-pick="' + i + '">+ KSBs</button></div></section>').join("") +
        '<button class="btn" type="button" id="bAdd">+ Add a topic</button>' +
      '</div><div><section class="panel b-cover" style="position:sticky;top:12px"><div class="panel-head"><h2>Coverage</h2><span class="small muted">' + (total - gaps.length) + ' of ' + total + ' KSBs</span></div>' +
        '<div class="pbar"><div class="fill" style="width:' + (total ? Math.round((total - gaps.length) / total * 100) : 0) + '%;background:' + (gaps.length ? "var(--warn)" : "var(--good)") + '"></div></div>' +
        (gaps.length ? '<p class="small" style="margin:10px 0 6px"><b>Not in any topic yet:</b></p><div class="chips">' + gaps.map((c) => '<span class="chip" title="' + esc(full[c] || "") + '">' + esc(c) + '</span>').join("") + '</div>' +
          '<p class="small muted" style="margin-top:8px">Every KSB should be in at least one topic, so learners evidence all of them before their end-point assessment.</p>'
          : '<p class="small" style="margin-top:10px">Every KSB is in at least one topic.</p>') + '</section></div></div>');
    const root = document.getElementById("main");
    root.querySelector("#bTitle").oninput = (e) => { B.title = e.target.value; };
    root.querySelectorAll(".b-name").forEach((x) => x.oninput = () => { B.topics[+x.dataset.i].name = x.value; });
    root.querySelectorAll("[data-up]").forEach((x) => x.onclick = () => { const i = +x.dataset.up; [B.topics[i - 1], B.topics[i]] = [B.topics[i], B.topics[i - 1]]; draw(); });
    root.querySelectorAll("[data-down]").forEach((x) => x.onclick = () => { const i = +x.dataset.down; [B.topics[i + 1], B.topics[i]] = [B.topics[i], B.topics[i + 1]]; draw(); });
    root.querySelectorAll("[data-rm]").forEach((x) => x.onclick = () => { const t = B.topics[+x.dataset.rm]; if (B.topics.length > 1 && confirm("Remove “" + t.name + "”? Its KSBs go back to “not in any topic”; learners’ evidence stays, under the topic its KSBs fit best.")) { B.topics.splice(+x.dataset.rm, 1); draw(); } });
    root.querySelectorAll(".b-x").forEach((x) => x.onclick = () => { const t = B.topics[+x.dataset.i]; t.ksbs = t.ksbs.filter((k) => k.code !== x.dataset.k); draw(); });
    root.querySelectorAll("[data-pick]").forEach((x) => x.onclick = () => pick(+x.dataset.pick));
    root.querySelector("#bAdd").onclick = () => { B.topics.push({ id: newId(), name: "New topic " + (B.topics.length + 1), ksbs: [] }); draw(); setTimeout(() => { const n = document.querySelectorAll(".b-name"); n[n.length - 1].select(); }, 0); };
    root.querySelector("#bCancel").onclick = () => { if (confirm("Leave without saving?")) collegePacksPage(ui); };
    root.querySelector("#bSave").onclick = (e) => {
      const names = B.topics.map((t) => t.name.trim().toLowerCase());
      if (!B.title.trim()) return toast("Give the pack a name.");
      if (names.some((n) => !n)) return toast("Every topic needs a name.");
      if (new Set(names).size !== names.length) return toast("Two topics have the same name.");
      busy(e.target, "Saving…", async () => {
        try {
          await rpc("college_save_pack", { p_org: ui.org(), p_pack: B.pack, p_title: B.title.trim(), p_standard_version: B.standardVersion, p_option: B.option || null,
            p_content: { topics: B.topics.map((t) => ({ id: t.id, name: t.name.trim(), from: t.from || null, ksbs: t.ksbs })) } });
          hit("packs.save"); toast("Saved as a draft. Publish it from the Packs page when it’s ready."); collegePacksPage(ui);
        } catch (x) { toast(x.message); }
      });
    };
  };
  /* Choose a topic's KSBs: the standard's (and the option's), with which other topics already cover each. */
  const pick = (i) => {
    const t = B.topics[i], have = new Set(t.ksbs.map((k) => k.code)), where = {};
    B.topics.forEach((x, j) => { if (j !== i) x.ksbs.forEach((k) => (where[k.code] = where[k.code] || []).push(x.name)); });
    const codes = (B.ksbs || []).map(([c]) => c).sort(order);
    const m = ui.modal("KSBs for “" + t.name + "”", '<div class="std-body" style="max-height:60vh;overflow:auto">' + ["knowledge", "skill", "behaviour"].map((g) => {
      const list = codes.filter((c) => kindOf(c) === g); return list.length ? '<h3 class="label" style="margin:12px 0 4px">' + LBL[g] + '</h3>' + list.map((c) => '<label class="std-row b-pick"><input type="checkbox" value="' + esc(c) + '"' + (have.has(c) ? " checked" : "") + '>' +
        '<span><b class="mono">' + esc(c) + '</b> ' + esc(full[c] || "") + (where[c] ? '<br><span class="small muted">Also in: ' + esc(where[c].join(", ")) + '</span>' : '<br><span class="small" style="color:var(--warn)">Not in any other topic</span>') + '</span></label>').join("") : ""; }).join("") + '</div>' +
      '<div class="row-actions" style="margin-top:12px"><button class="btn primary" type="button" id="pkDone">Done</button></div>');
    m.classList.add("wide-modal");
    m.querySelector("#pkDone").onclick = () => {
      const chosen = [...m.querySelectorAll(".b-pick input:checked")].map((x) => x.value), keep = Object.fromEntries(t.ksbs.map((k) => [k.code, k.text]));
      t.ksbs = chosen.sort(order).map((c) => ({ code: c, text: keep[c] || "" })); ui.closeModal(); draw();
    };
  };
  hit("packs.builder"); draw();
}

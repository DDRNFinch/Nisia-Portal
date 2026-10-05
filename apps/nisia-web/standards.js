/* The master admin's standards library: the source of truth every course is built on.
   - Every standard and qualification, its versions (published, or drafts still being checked), and the courses and
     learners following each one.
   - A version opens to show what it asks for, word for word: KSBs (filtered by option), or units, learning outcomes
     and assessment criteria.
   - "Add a standard or version": paste the KSBs or upload the official PDF; Nisia reads it, shows what it found and
     anything to check, and saves it as a draft. Publishing makes it permanent (a published version never changes;
     a correction is a new version).
   - Which version (and option) each course follows. */
import { parseStandard, standardText } from "../../packages/core/standards-text.js";

let ui, S = { open: null, filter: "" };
const LABEL = { knowledge: "Knowledge", skill: "Skills", behaviour: "Behaviours" };

function counts(v, kind) {
  const c = v.counts || {};
  return kind === "standard"
    ? [c.knowledge && c.knowledge + " K", c.skill && c.skill + " S", c.behaviour && c.behaviour + " B"].filter(Boolean).join(" · ") || "Empty"
    : [(c.unit || 0) + " units", (c.outcome || 0) + " outcomes", (c.criterion || 0) + " criteria"].join(" · ");
}
const statusPill = (s) => s === "published" ? '<span class="pill good">Published</span>' : '<span class="pill warn">Draft</span>';
const kindName = (k) => k === "standard" ? "Apprenticeship standard" : "Qualification";

export async function standardsPage(helpers) {
  ui = helpers;
  const { shell, rpc, esc } = ui;
  shell('<p class="loading">Loading the standards library…</p>');
  let L;
  try { L = await rpc("nisia_standards"); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  const versions = L.standards.flatMap((q) => q.versions.map((v) => ({ ...v, q })));
  const vName = (id) => { const v = versions.find((x) => x.id === id); return v ? v.q.code + " v" + v.version : ""; };
  const optName = (id, o) => { const v = versions.find((x) => x.id === id); const t = v && (v.options || []).find((x) => x.code === o); return t ? t.title : o; };
  shell(
    '<div class="topbar"><div><div class="label">Master admin</div><h1>Standards</h1></div><div class="actions"><button class="btn primary" type="button" id="stdAdd">Add a standard or version</button></div></div>' +
    '<p class="muted" style="max-width:720px;margin:-6px 0 18px">The source of truth for every course: each standard and qualification, word for word, kept version by version. Learners stay on the version they started on. A published version can’t change; a correction is a new version.</p>' +
    (L.standards.length ? L.standards.map((q) =>
      '<section class="panel std-q"><div class="panel-head"><div><h2>' + esc(q.code) + ' · ' + esc(q.title) + '</h2><span class="small muted">' + esc([kindName(q.kind), q.awarding_body, q.level && "Level " + q.level].filter(Boolean).join(" · ")) + '</span></div></div>' +
        '<div class="table-wrap flat"><table><thead><tr><th>Version</th><th>Status</th><th>What’s in it</th><th>Courses</th><th>Learners</th><th></th></tr></thead><tbody>' +
        q.versions.map((v) => '<tr class="static"><td><b>v' + esc(v.version) + '</b>' + ((v.options || []).length ? '<br><span class="small muted">Options: ' + esc(v.options.map((o) => o.title).join(", ")) + '</span>' : "") + '</td><td>' + statusPill(v.status) +
          '</td><td style="white-space:nowrap">' + esc(counts(v, q.kind)) + '</td><td>' + (v.courses.length ? v.courses.map((c) => esc(c.title) + (c.option ? ' <span class="small muted">(' + esc(optName(v.id, c.option)) + ')</span>' : "")).join("<br>") : '<span class="muted">None yet</span>') +
          '</td><td class="num">' + v.enrolments + '</td><td style="text-align:right"><button class="btn small" type="button" data-open="' + v.id + '">Open</button></td></tr>').join("") +
        '</tbody></table></div></section>').join("")
      : '<section class="panel"><p class="muted">The library is empty. Add the first standard.</p></section>') +
    '<section class="panel"><div class="panel-head"><div><h2>Courses</h2><span class="small muted">What each course is built on. New learners follow it; learners already enrolled stay on their version unless you move them.</span></div></div>' +
      '<div class="table-wrap flat"><table><thead><tr><th>Course</th><th>Built on</th><th>Learners</th><th></th></tr></thead><tbody>' +
      L.courses.map((c) => '<tr class="static"><td><b>' + esc(c.title) + '</b><br><span class="small muted">' + esc(c.code || "") + '</span></td><td>' +
        (c.version_id ? esc(vName(c.version_id)) + (c.option ? ' <span class="small muted">· ' + esc(optName(c.version_id, c.option)) + '</span>' : "") : '<span class="pill idle">Not set</span>') +
        '</td><td class="num">' + c.enrolments + '</td><td style="text-align:right"><button class="btn small" type="button" data-course="' + c.id + '">Change</button></td></tr>').join("") +
      '</tbody></table></div></section>');
  const root = document.getElementById("main");
  root.querySelector("#stdAdd").onclick = () => addForm();
  root.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => openVersion(b.dataset.open));
  root.querySelectorAll("[data-course]").forEach((b) => b.onclick = () => courseForm(L.courses.find((c) => c.id === b.dataset.course), versions));
}

/* One version, word for word. */
async function openVersion(id) {
  const { rpc, esc, modal, toast, busy, hit } = ui;
  let v;
  try { v = await rpc("nisia_standard", { p_version: id }); } catch (e) { toast(e.message); return; }
  hit("standards.open");
  const opts = v.options || [];
  const ksbList = (filter) => {
    const rows = v.requirements.filter((r) => !filter || (filter === "core" ? !r.option : r.option === filter));
    return ["knowledge", "skill", "behaviour"].map((k) => { const g = rows.filter((r) => r.kind === k); return g.length ? '<h3 class="label" style="margin:16px 0 6px">' + LABEL[k] + ' · ' + g.length + '</h3>' +
      g.map((r) => '<div class="std-row"><b class="mono">' + esc(r.code) + '</b><span>' + esc(r.title) + (r.option ? ' <span class="chip">' + esc((opts.find((o) => o.code === r.option) || {}).title || r.option) + '</span>' : "") + '</span></div>').join("") : ""; }).join("");
  };
  const unitList = () => v.requirements.filter((r) => r.kind === "unit").map((u) => {
    const outs = v.requirements.filter((r) => r.parent === u.code);
    return '<details class="std-unit"><summary><b class="mono">' + esc(u.code) + '</b> ' + esc(u.title) + (u.optional ? ' <span class="chip">Optional</span>' : "") + '</summary>' +
      outs.map((o) => '<div class="std-lo"><b>LO' + esc(o.code.slice(o.code.indexOf(".") + 1)) + '</b> ' + esc(o.title) + '</div>' +
        v.requirements.filter((r) => r.parent === o.code).map((c) => '<div class="std-row"><b class="mono">' + esc(c.code.slice(c.code.indexOf(".") + 1)) + '</b><span style="white-space:pre-line">' + esc(c.title) + '</span></div>').join("")).join("") + '</details>';
  }).join("");
  const m = modal(v.code + " v" + v.version,
    '<p class="small muted" style="margin-top:-4px">' + esc(v.title) + ' · ' + esc(kindName(v.kind)) + (v.awarding_body ? " · " + esc(v.awarding_body) : "") + (v.level ? " · Level " + v.level : "") + '</p>' +
    '<p style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + statusPill(v.status) + (v.published_at ? '<span class="small muted">Published ' + esc(ui.ukDate(v.published_at)) + '</span>' : '<span class="small muted">Only you can see a draft. Check it, then publish.</span>') + '</p>' +
    (v.source_note || v.source_url ? '<p class="small muted">' + esc(v.source_note || "") + (v.source_url ? ' <a href="' + esc(v.source_url) + '" target="_blank" rel="noopener">Source</a>' : "") + '</p>' : "") +
    (v.kind === "standard" && opts.length ? '<div class="seg std-seg" role="group" aria-label="Show" style="margin:6px 0 2px"><button type="button" data-f="" aria-pressed="true">All</button><button type="button" data-f="core" aria-pressed="false">Core</button>' +
      opts.map((o) => '<button type="button" data-f="' + esc(o.code) + '" aria-pressed="false">' + esc(o.title) + '</button>').join("") + '</div>' : "") +
    '<div id="stdBody" class="std-body">' + (v.kind === "standard" ? ksbList("") : unitList()) + '</div>' +
    (v.status === "draft" ? '<div class="row-actions" style="margin-top:16px"><button class="btn primary" type="button" id="stdPublish">Publish</button><button class="btn" type="button" id="stdEdit">Edit</button><button class="btn danger" type="button" id="stdDelete">Delete draft</button></div>' : ""));
  m.classList.add("wide-modal");
  m.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { m.querySelectorAll("[data-f]").forEach((x) => x.setAttribute("aria-pressed", x === b)); m.querySelector("#stdBody").innerHTML = ksbList(b.dataset.f); });
  if (v.status !== "draft") return;
  m.querySelector("#stdPublish").onclick = (e) => {
    if (!confirm("Publish " + v.code + " v" + v.version + "? Once published it can’t be changed or deleted: a correction would be a new version.")) return;
    busy(e.target, "Publishing…", async () => { try { await rpc("admin_publish_standard", { p_version: v.id }); hit("standards.publish"); ui.closeModal(); toast(v.code + " v" + v.version + " is published."); standardsPage(ui); } catch (x) { toast(x.message); } });
  };
  m.querySelector("#stdEdit").onclick = () => addForm({ ...v, text: standardText(v.requirements, v.kind, opts) });
  m.querySelector("#stdDelete").onclick = (e) => {
    if (!confirm("Delete this draft?")) return;
    busy(e.target, "Deleting…", async () => { try { await rpc("admin_delete_standard_draft", { p_version: v.id }); ui.closeModal(); toast("Draft deleted."); standardsPage(ui); } catch (x) { toast(x.message); } });
  };
}

/* Add a standard, or a new version: paste or upload, check what Nisia read, save as a draft. */
function addForm(prev) {
  const { esc, modal, rpc, toast, busy, hit } = ui;
  const p = prev || { kind: "standard" };
  const m = modal(prev ? "Edit " + p.code + " v" + p.version : "Add a standard or version",
    '<form id="stdForm" class="form-grid" autocomplete="off">' +
      '<label class="field" style="grid-column:1/-1">What is it<select name="kind"><option value="standard"' + (p.kind === "standard" ? " selected" : "") + '>Apprenticeship standard (KSBs)</option><option value="qualification"' + (p.kind === "qualification" ? " selected" : "") + '>Qualification (units, learning outcomes, assessment criteria)</option></select></label>' +
      '<label class="field">Code<input name="code" required placeholder="ST0095 or 6570-05" value="' + esc(p.code || "") + '"></label>' +
      '<label class="field">Version<input name="version" required placeholder="1.2" value="' + esc(p.version || "") + '"></label>' +
      '<label class="field" style="grid-column:1/-1">Title<input name="title" required placeholder="Bricklayer" value="' + esc(p.title || "") + '"></label>' +
      '<label class="field">Awarding body <small>(optional)</small><input name="awarding_body" placeholder="City & Guilds" value="' + esc(p.awarding_body || "") + '"></label>' +
      '<label class="field">Level<input name="level" type="number" min="1" max="8" value="' + esc(p.level || "") + '"></label>' +
      '<label class="field" style="grid-column:1/-1">Link to the official page <small>(optional)</small><input name="source_url" type="url" placeholder="https://" value="' + esc(p.source_url || "") + '"></label>' +
      '<div class="field" style="grid-column:1/-1"><span>The official wording</span><small id="stdHow"></small>' +
        '<div class="row-actions" style="margin:4px 0 6px"><label class="btn small" style="cursor:pointer">Upload the PDF<input type="file" id="stdFile" accept="application/pdf,.pdf,.txt,text/plain" hidden></label><span class="small muted" id="stdFileNote"></span></div>' +
        '<textarea class="input" name="text" id="stdText" rows="12" spellcheck="false" style="font-family:ui-monospace,Menlo,monospace;font-size:13px">' + esc(p.text || "") + '</textarea></div>' +
      '<div style="grid-column:1/-1" id="stdCheck"></div>' +
      '<p class="err" id="stdErr" hidden style="grid-column:1/-1"></p>' +
      '<div class="row-actions" style="grid-column:1/-1"><button class="btn primary" type="submit">Save as a draft</button><span class="small muted">Only you can see a draft until you publish it.</span></div>' +
    '</form>');
  m.classList.add("wide-modal");
  const f = m.querySelector("#stdForm"), text = m.querySelector("#stdText"), how = m.querySelector("#stdHow"), check = m.querySelector("#stdCheck");
  let read = { items: [], options: [], warnings: [] };
  const HOW = { standard: "Paste the KSBs (K1, S1, B1…), or upload the standard’s PDF. For a standard with options, put “Option: Site carpenter” above that option’s KSBs, and “Core” above the shared ones.",
    qualification: "Paste the units, or upload the handbook’s PDF: “Unit 102 Title” (add “(optional)”), “LO1 Title” for each learning outcome, “1.1 Wording” for each assessment criterion, and “• point” lines for its listed points." };
  const draw = () => {
    const kind = f.kind.value; how.textContent = HOW[kind];
    read = parseStandard(text.value, kind);
    const its = read.items;
    if (!text.value.trim()) { check.innerHTML = ""; return; }
    const sum = kind === "standard"
      ? ["knowledge", "skill", "behaviour"].map((k) => its.filter((x) => x.kind === k).length + " " + LABEL[k].toLowerCase()).join(", ") + (read.options.length ? " · options: " + read.options.map((o) => o.title + " (" + its.filter((x) => x.option === o.code).length + ")").join(", ") : "")
      : ["unit", "outcome", "criterion"].map((k) => its.filter((x) => x.kind === k).length + " " + { unit: "units", outcome: "learning outcomes", criterion: "assessment criteria" }[k]).join(", ") + (its.some((x) => x.optional) ? " (" + its.filter((x) => x.optional).length + " optional units)" : "");
    check.innerHTML = '<div class="note" style="margin-bottom:8px"><b>Nisia read ' + its.length + ' item' + (its.length === 1 ? "" : "s") + ':</b> ' + esc(sum) + '</div>' +
      (read.warnings.length ? '<div class="err" style="margin-bottom:8px"><b>Check:</b><ul style="margin:4px 0 0 18px;padding:0">' + read.warnings.slice(0, 12).map((w) => '<li>' + esc(w) + '</li>').join("") + (read.warnings.length > 12 ? '<li>…and ' + (read.warnings.length - 12) + ' more</li>' : "") + '</ul></div>' : "") +
      '<details><summary class="small">See everything Nisia read</summary><div class="std-body" style="max-height:320px;overflow:auto">' +
      its.map((x) => '<div class="std-row' + (x.kind === "unit" ? " std-unit-row" : "") + '"><b class="mono">' + esc(x.code) + '</b><span style="white-space:pre-line">' + esc(x.title) + (x.option ? ' <span class="chip">' + esc((read.options.find((o) => o.code === x.option) || {}).title || "") + '</span>' : "") + (x.optional ? ' <span class="chip">Optional</span>' : "") + '</span></div>').join("") +
      '</div></details>';
  };
  let t; text.addEventListener("input", () => { clearTimeout(t); t = setTimeout(draw, 250); });
  f.kind.onchange = draw;
  m.querySelector("#stdFile").onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const note = m.querySelector("#stdFileNote"); note.textContent = "Reading " + file.name + "…";
    try {
      const s = /\.pdf$/i.test(file.name) || file.type === "application/pdf" ? await (await import("../../packages/core/pdf-text.js")).pdfText(file) : await file.text();
      text.value = s; note.textContent = file.name + ": read. Check what Nisia found below, and tidy the text if anything’s wrong."; hit("standards.upload"); draw();
    } catch (x) { note.textContent = "Couldn’t read that file: " + x.message; }
  };
  draw();
  f.onsubmit = (e) => {
    e.preventDefault();
    const err = m.querySelector("#stdErr"); err.hidden = true;
    if (!read.items.length) { err.textContent = "Nothing to save yet: paste the wording or upload the PDF."; err.hidden = false; return; }
    if (read.warnings.length && !confirm("There " + (read.warnings.length === 1 ? "is 1 thing" : "are " + read.warnings.length + " things") + " to check. Save the draft anyway? You can fix it before publishing.")) return;
    const d = Object.fromEntries(new FormData(f).entries());
    const payload = { code: d.code, kind: d.kind, title: d.title, awarding_body: d.awarding_body, level: d.level || null, version: d.version, source_url: d.source_url,
      source_note: prev && prev.source_note || null, options: read.options, requirements: read.items };
    busy(f.querySelector("[type=submit]"), "Saving…", async () => {
      try { const id = await rpc("admin_save_standard", { p: payload }); hit("standards.save"); ui.closeModal(); toast("Saved as a draft. Check it, then publish."); await standardsPage(ui); openVersion(id); }
      catch (x) { err.textContent = x.message; err.hidden = false; }
    });
  };
}

/* What a course is built on. */
function courseForm(c, versions) {
  const { esc, modal, rpc, toast, busy, hit } = ui;
  const pub = versions.filter((v) => v.status === "published");
  const m = modal("What " + c.title + " is built on",
    '<form id="cForm" class="form-grid">' +
      '<label class="field" style="grid-column:1/-1">Standard or qualification<select name="version" required>' + pub.map((v) => '<option value="' + v.id + '"' + (v.id === c.version_id ? " selected" : "") + '>' + esc(v.q.code + " v" + v.version + " · " + v.q.title) + '</option>').join("") + '</select></label>' +
      '<label class="field" style="grid-column:1/-1" id="cOptWrap">Option<select name="option" id="cOpt"></select></label>' +
      (c.enrolments ? '<label class="check" style="grid-column:1/-1"><input type="checkbox" name="move"> Move the ' + c.enrolments + ' learner' + (c.enrolments === 1 ? "" : "s") + ' already on this course to it too</label>' : "") +
      '<p class="small muted" style="grid-column:1/-1">New learners on the course follow it. Learners already on it stay on the version they started on unless you move them.</p>' +
      '<p class="err" id="cErr" hidden style="grid-column:1/-1"></p>' +
      '<div class="row-actions" style="grid-column:1/-1"><button class="btn primary" type="submit">Save</button></div></form>');
  const f = m.querySelector("#cForm");
  const opts = () => { const v = pub.find((x) => x.id === f.version.value), o = (v && v.options) || [];
    m.querySelector("#cOptWrap").hidden = !o.length; f.option.innerHTML = o.map((x) => '<option value="' + esc(x.code) + '"' + (x.code === c.option ? " selected" : "") + '>' + esc(x.title) + '</option>').join(""); };
  f.version.onchange = opts; opts();
  f.onsubmit = (e) => {
    e.preventDefault();
    const err = m.querySelector("#cErr"); err.hidden = true;
    busy(f.querySelector("[type=submit]"), "Saving…", async () => {
      try {
        const n = await rpc("admin_set_course_standard", { p_course: c.id, p_version: f.version.value, p_option: f.option.value || null, p_move_learners: !!(f.move && f.move.checked) });
        hit("standards.course"); ui.closeModal(); toast(c.title + " is built on it now" + (n ? "; " + n + " learner" + (n === 1 ? "" : "s") + " moved." : ".")); standardsPage(ui);
      } catch (x) { err.textContent = x.message; err.hidden = false; }
    });
  };
}

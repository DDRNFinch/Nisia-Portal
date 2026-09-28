/* Milos portfolio: the learner's evidence the way Evia shows it, unit by unit in the course's order, with what's
   new (not yet assessed) highlighted. Each piece opens as a document (learner's account, photos and files, the KSBs
   they mapped) that downloads as a PDF. The assessor accepts it or asks for changes, and confirms the KSBs it meets:
   the learner's mapping is ticked to start with, and can be unticked or added to. Each decision is a new row in
   Nisia's assessments (the latest one stands), so the history is kept. */
import { db, esc, ukDate } from "../../packages/core/nisia.js";
import { COURSE_DATA } from "../../packages/core/courses.js";
import { unitStrength, strengthBars } from "../../packages/core/strength.js";

const TYPE = { photo: "Photos", video: "Video", audio: "Recording", document: "Document", written: "Write-up", note: "Note" };
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const unitOf = (e) => (e.source_metadata && e.source_metadata.unit) || e.title || "";
const isObservation = (e) => (e.source_metadata && e.source_metadata.collection) === "observation";
const accountHead = (e) => isObservation(e) ? "Assessor’s observation" + (e.source_metadata.observedBy ? " (" + e.source_metadata.observedBy + (e.source_metadata.observedOn ? ", " + ukDate(e.source_metadata.observedOn) : "") + ")" : "") : "Learner’s account";
const isSupporting = (e) => (e.source_metadata && e.source_metadata.collection) === "supporting" || /^supporting:/.test(e.client_reference || "");

/* Everything the portfolio needs beyond loadLearner: files per piece of evidence, and the assessments. */
export async function loadPortfolio(L) {
  const ids = L.evidence.map((e) => e.id);
  if (!ids.length) return { files: {}, assessed: {} };
  const [f, a] = await Promise.all([
    db.from("evidence_files").select("evidence_id, storage_path, mime_type, created_at").in("evidence_id", ids).order("created_at"),
    db.from("assessments").select("id, evidence_id, decision, feedback, ksbs, created_at, assessor_member_id").in("evidence_id", ids).order("created_at", { ascending: false }),
  ]);
  if (f.error) throw new Error(f.error.message);
  if (a.error) throw new Error(a.error.message);
  const files = {}, assessed = {};
  f.data.forEach((x) => (files[x.evidence_id] = files[x.evidence_id] || []).push(x));
  a.data.forEach((x) => (assessed[x.evidence_id] = assessed[x.evidence_id] || []).push(x));
  return { files, assessed };
}

/* The course's units in order, each with its evidence (newest first); then other units; then supporting evidence. */
export function groupByUnit(L, P) {
  const code = L.row.course_code, C = COURSE_DATA[code] || { units: [], ksbs: [] };
  const groups = C.units.map(([name, ksbs], i) => ({ key: "u" + i, no: i + 1, name, ksbs, items: [] }));
  const other = { key: "other", name: "Other units", ksbs: [], items: [] }, supporting = { key: "supporting", name: "Supporting evidence", ksbs: [], items: [] };
  L.evidence.forEach((e) => {
    const item = { e, files: P.files[e.id] || [], history: P.assessed[e.id] || [] };
    item.latest = item.history[0] || null;
    if (isSupporting(e)) return supporting.items.push(item);
    const g = groups.find((u) => norm(u.name) === norm(unitOf(e)));
    if (g) return g.items.push(item);
    const elsewhere = Object.entries(COURSE_DATA).find(([k, c]) => k !== code && c.units.some(([n]) => norm(n) === norm(unitOf(e))));
    item.otherCourse = elsewhere ? elsewhere[1].name : "";
    other.items.push(item);
  });
  return groups.concat(other.items.length ? [other] : [], supporting.items.length ? [supporting] : []);
}

const status = (it) => !it.latest ? { cls: "accent", text: "New" } : it.latest.decision === "accepted" ? { cls: "good", text: "Accepted" } : { cls: "warn", text: "Changes needed" };
export const statusPill = (it) => { const s = status(it); return '<span class="pill ' + s.cls + '">' + s.text + '</span>'; };

/* The unit list on the learner page. */
export function portfolioHtml(groups, onlyNew, snap) {
  const newCount = groups.reduce((n, g) => n + g.items.filter((it) => !it.latest).length, 0);
  return '<div class="between"><h2>Portfolio</h2><div class="row">' + (newCount ? '<span class="pill accent">' + newCount + ' new to assess</span>' : '<span class="pill good">All assessed</span>') +
    '<button class="btn ghost" id="pfFilter">' + (onlyNew ? "Show everything" : "Only new") + '</button></div></div>' +
    '<div class="pf">' + groups.map((g) => {
      const items = onlyNew ? g.items.filter((it) => !it.latest) : g.items;
      if (onlyNew && !items.length) return "";
      const fresh = g.items.filter((it) => !it.latest).length, met = new Set();
      g.items.forEach((it) => { if (it.latest && it.latest.decision === "accepted") (it.latest.ksbs || []).forEach((k) => met.add(k)); });
      const covered = g.ksbs.filter((k) => met.has(k)).length;
      return '<details class="card pf-unit' + (fresh ? " has-new" : "") + (g.items.length ? "" : " pf-none") + '"' + (fresh || onlyNew ? " open" : "") + '><summary>' +
        '<span class="pf-no">' + (g.no || "") + '</span><span class="pf-name"><b>' + esc(g.name) + '</b><span class="sub">' +
        (g.items.length ? g.items.length + (g.items.length === 1 ? " piece" : " pieces") : "No evidence yet") + (fresh ? ' · <b class="new-txt">' + fresh + ' new</b>' : "") + '</span></span>' +
        (g.no ? strengthBars(unitStrength(snap, g.name, g.items.map((it) => ({ photos: it.files.filter((f) => /^image\//.test(f.mime_type)).length || ((it.e.source_metadata || {}).photoIds || []).length || (it.e.source_metadata || {}).photoCount || 0, text: (it.e.source_metadata || {}).text })))) : "") +
        (g.ksbs.length ? '<span class="pf-met" title="KSBs signed off">' + covered + '/' + g.ksbs.length + '<small>signed off</small></span>' : "") + '</summary>' +
        (items.length ? '<div class="pf-items">' + items.map((it) => '<button class="pf-item' + (!it.latest ? " is-new" : "") + '" data-ev="' + it.e.id + '">' +
          '<span class="name-cell"><span class="name">' + esc(g.key === "supporting" || g.key === "other" ? it.e.title : ukDate(it.e.created_at)) + '</span>' +
          '<span class="sub">' + esc([g.key === "supporting" || g.key === "other" ? ukDate(it.e.created_at) : "", it.otherCourse, isObservation(it.e) ? "Observation" + (it.e.source_metadata.observedBy ? " by " + it.e.source_metadata.observedBy : "") : TYPE[it.e.evidence_type] || it.e.evidence_type, it.files.length ? it.files.length + (it.files.length === 1 ? " file" : " files") : ""].filter(Boolean).join(" · ")) + '</span></span>' +
          statusPill(it) + '<span class="chev">›</span></button>').join("") + '</div>' : "") + '</details>';
    }).join("") + '</div>';
}

/* ---------- One piece of evidence, as a document ---------- */
async function signed(files) {
  if (!files.length) return [];
  const { data, error } = await db.storage.from("evidence").createSignedUrls(files.map((f) => f.storage_path), 3600);
  if (error) throw error;
  return files.map((f, i) => ({ ...f, url: data[i] && data[i].signedUrl }));
}
const ksbText = (C, code) => ((C.ksbs || []).find((k) => k[0] === code) || [code, ""])[1];

export async function openEvidence(ctx, item, onSaved) {
  const { L, groups, me, college } = ctx, e = item.e, m = e.source_metadata || {}, C = COURSE_DATA[L.row.course_code] || { units: [], ksbs: [] };
  const group = groups.find((g) => g.items.includes(item)), siblings = group ? group.items : [item], at = siblings.indexOf(item);
  const claimed = (m.ksbs || []).filter(Boolean), latest = item.latest;
  const unitKsbs = group && group.ksbs.length ? group.ksbs : [];
  let ticked = new Set(latest ? latest.ksbs || [] : claimed), decision = latest ? latest.decision : "accepted";
  const extra = () => [...new Set([...claimed, ...ticked])].filter((k) => !unitKsbs.includes(k));

  const o = document.createElement("div"); o.className = "rv"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
  o.innerHTML = '<div class="rv-top"><button class="btn ghost" id="evBack">‹ Portfolio</button><span class="spacer" style="flex:1"></span>' +
    (siblings.length > 1 ? '<button class="btn ghost" id="evPrev"' + (at <= 0 ? " disabled" : "") + ' aria-label="Previous">‹</button><span class="small muted">' + (at + 1) + ' of ' + siblings.length + '</span><button class="btn ghost" id="evNext"' + (at >= siblings.length - 1 ? " disabled" : "") + ' aria-label="Next">›</button>' : "") +
    '<button class="btn" id="evPdf">Download PDF</button></div>' +
    '<div class="rv-body ev-body"><article class="paper" id="paper"></article><section class="card assess" id="assess"></section></div>';
  document.body.appendChild(o); document.body.style.overflow = "hidden";
  const close = () => { o.remove(); document.body.style.overflow = ""; };
  o.querySelector("#evBack").onclick = close;
  const step = (d) => { close(); openEvidence(ctx, siblings[at + d], onSaved); };
  if (o.querySelector("#evPrev")) { o.querySelector("#evPrev").onclick = () => step(-1); o.querySelector("#evNext").onclick = () => step(1); }

  /* The document: the same parts, in the same order, as the PDF. */
  const paper = o.querySelector("#paper");
  paper.innerHTML = '<header class="paper-head"><div><p class="label">' + esc(college || "") + '</p><h1>' + esc(isSupporting(e) ? e.title : unitOf(e)) + '</h1>' +
    '<p class="muted small">' + esc(L.row.name) + ' · ' + esc(C.name || L.row.course_code) + (C.std ? " (" + esc(C.std) + ")" : "") + '</p></div>' +
    '<dl class="paper-meta"><div><dt>Added</dt><dd>' + esc(ukDate(e.created_at)) + '</dd></div><div><dt>Type</dt><dd>' + esc(isObservation(e) ? "Observation" : TYPE[e.evidence_type] || e.evidence_type) + '</dd></div>' +
    (item.otherCourse ? '<div><dt>Course</dt><dd>' + esc(item.otherCourse) + '</dd></div>' : "") + '<div><dt>Status</dt><dd>' + statusPill(item) + '</dd></div></dl></header>' +
    (m.text ? '<section><h3>' + esc(accountHead(e)) + '</h3><p class="paper-text">' + esc(m.text) + '</p></section>' : "") +
    (claimed.length ? '<section><h3>' + (L.row.course_code === "trowel3" ? "Criteria" : "KSBs") + (isObservation(e) ? " observed" : " the learner mapped") + '</h3><ul class="paper-ksbs">' + claimed.map((k) => '<li><b>' + esc(k) + '</b> ' + esc(ksbText(C, k)) + '</li>').join("") + '</ul></section>' : "") +
    '<section><h3>Photos and files</h3><div class="paper-media" id="media"><p class="small muted">Loading…</p></div></section>';
  let media = [];
  try {
    media = await signed(item.files);
    const box = paper.querySelector("#media");
    box.innerHTML = media.length ? media.map((f, i) => !f.url ? "" : /^image\//.test(f.mime_type) ? '<a href="' + esc(f.url) + '" target="_blank" rel="noopener"><img src="' + esc(f.url) + '" alt="Photo ' + (i + 1) + '"></a>'
      : /^video\//.test(f.mime_type) ? '<video src="' + esc(f.url) + '" controls playsinline preload="metadata"></video>'
      : /^audio\//.test(f.mime_type) ? '<audio src="' + esc(f.url) + '" controls></audio>'
      : '<a class="btn" href="' + esc(f.url) + '" target="_blank" rel="noopener">Open file ' + (i + 1) + '</a>').join("")
      : '<p class="small muted">' + ((m.photoIds || []).length ? "The photos haven’t arrived yet. Evia sends them when the learner’s phone is on WiFi." : "No photos or files with this one.") + '</p>';
  } catch (x) { paper.querySelector("#media").innerHTML = '<p class="err">' + esc(x.message) + '</p>'; }

  /* The assessment. */
  const box = o.querySelector("#assess");
  const draw = () => {
    const row = (k, from) => '<label class="ksb-row"><input type="checkbox" value="' + esc(k) + '"' + (ticked.has(k) ? " checked" : "") + '><span><b>' + esc(k) + '</b> ' + esc(ksbText(C, k)) +
      (from ? ' <em class="small muted">' + from + '</em>' : "") + '</span></label>';
    const rest = (C.ksbs || []).map((k) => k[0]).filter((k) => !unitKsbs.includes(k) && !extra().includes(k));
    box.innerHTML = '<h2>Your assessment</h2>' +
      (item.history.length ? '<div class="history">' + item.history.map((h) => '<p class="small"><span class="pill ' + (h.decision === "accepted" ? "good" : "warn") + '">' + (h.decision === "accepted" ? "Accepted" : "Changes needed") + '</span> ' + esc(ukDate(h.created_at)) + (h.feedback ? ' · ' + esc(h.feedback) : "") + '</p>').join("") + '</div>' : '<p class="note">New: not assessed yet.</p>') +
      '<div class="seg2" role="radiogroup" aria-label="Decision"><button type="button" data-d="accepted" aria-pressed="' + (decision === "accepted") + '">Accept</button><button type="button" data-d="changes_required" aria-pressed="' + (decision === "changes_required") + '">Changes needed</button></div>' +
      '<p class="label">' + (L.row.course_code === "trowel3" ? "Criteria" : "KSBs") + ' this evidence meets</p><p class="small muted">Ticked from what the learner mapped. Untick any that aren’t met, or add others.</p>' +
      '<div class="ksbs">' + unitKsbs.map((k) => row(k, claimed.includes(k) ? "" : "not mapped by the learner")).join("") + extra().map((k) => row(k, claimed.includes(k) ? "mapped by the learner" : "added")).join("") + '</div>' +
      (rest.length ? '<label class="field">Add another<select id="addKsb"><option value="">Choose…</option>' + rest.map((k) => '<option value="' + esc(k) + '">' + esc(k + " " + ksbText(C, k)).slice(0, 110) + '</option>').join("") + '</select></label>' : "") +
      '<label class="field">Feedback for the learner' + (decision === "accepted" ? ' <small>(optional)</small>' : "") + '<textarea id="fb" placeholder="' + (decision === "accepted" ? "What was good about it" : "What they need to add or change") + '"></textarea></label>' +
      '<p class="err" role="alert"></p><button class="btn primary wide" id="save">' + (decision === "accepted" ? "Accept and sign off " + ticked.size + (ticked.size === 1 ? " KSB" : " KSBs") : "Send back for changes") + '</button>';
    const fb = box.querySelector("#fb"); fb.value = box.dataset.fb || "";
    fb.oninput = () => { box.dataset.fb = fb.value; };
    box.querySelectorAll("[data-d]").forEach((b) => b.onclick = () => { decision = b.dataset.d; draw(); });
    box.querySelectorAll(".ksb-row input").forEach((c) => c.onchange = () => { c.checked ? ticked.add(c.value) : ticked.delete(c.value); draw(); });
    const add = box.querySelector("#addKsb"); if (add) add.onchange = () => { if (add.value) { ticked.add(add.value); draw(); } };
    box.querySelector("#save").onclick = async () => {
      const b = box.querySelector("#save"), err = box.querySelector(".err"), feedback = fb.value.trim();
      if (decision !== "accepted" && !feedback) { err.textContent = "Say what the learner needs to add or change."; fb.focus(); return; }
      if (decision === "accepted" && !ticked.size) { err.textContent = "Tick at least one KSB this evidence meets, or ask for changes."; return; }
      b.disabled = true; b.textContent = "Saving…";
      const { data, error } = await db.from("assessments").insert({ organisation_id: e.organisation_id || L.enrolment.organisation_id, evidence_id: e.id, assessor_member_id: me.member_id, decision, feedback: feedback || null, ksbs: [...ticked] }).select("id, evidence_id, decision, feedback, ksbs, created_at, assessor_member_id").single();
      if (error) { err.textContent = error.message; b.disabled = false; draw(); return; }
      item.history.unshift(data); item.latest = data; box.dataset.fb = "";
      onSaved(item);
      /* On to the next piece still to assess, through the units in order. */
      const all = groups.flatMap((g) => g.items), here = all.indexOf(item);
      const next = all.slice(here + 1).find((x) => !x.latest) || all.slice(0, here).find((x) => !x.latest);
      if (next) { close(); openEvidence(ctx, next, onSaved); } else close();
    };
  };
  draw();
  o.querySelector("#evPdf").onclick = async () => {
    const b = o.querySelector("#evPdf"); b.disabled = true; b.textContent = "Making PDF…";
    try { await evidencePdf({ L, C, e, item, college, media, claimed }); } catch (x) { alert(x.message); }
    b.disabled = false; b.textContent = "Download PDF";
  };
}

/* ---------- The PDF: the same document, for the file or to print ---------- */
const asDataUrl = (url) => fetch(url).then((r) => r.blob()).then((blob) => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(blob); }));
const imgSize = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res([4, 3]); i.src = src; });

export async function evidencePdf({ L, C, e, item, college, media, claimed }) {
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: "mm", format: "a4" }), W = 210, M = 16, full = W - 2 * M;
  let y = M;
  const room = (h) => { if (y + h > 297 - M) { doc.addPage(); y = M; } };
  const text = (s, size = 10, style = "normal", gap = 1.5) => { doc.setFont("helvetica", style); doc.setFontSize(size); doc.splitTextToSize(String(s), full).forEach((line) => { room(size * 0.45); doc.text(line, M, y); y += size * 0.42; }); y += gap; };
  const head = (s) => { y += 3; room(10); doc.setDrawColor(220); doc.line(M, y - 3, W - M, y - 3); text(s, 12, "bold", 1); };
  text(college || "", 9, "normal", 0.5);
  text(isSupporting(e) ? e.title : unitOf(e), 18, "bold", 1);
  text(L.row.name + " · " + (C.name || L.row.course_code) + (C.std ? " (" + C.std + ")" : ""), 10, "normal", 0.5);
  text("Added " + ukDate(e.created_at) + " · " + (isObservation(e) ? "Observation" : TYPE[e.evidence_type] || e.evidence_type), 10, "normal", 2);
  const m = e.source_metadata || {};
  if (m.text) { head(accountHead(e)); text(m.text, 10); }
  if (claimed.length) { head((L.row.course_code === "trowel3" ? "Criteria" : "KSBs") + (isObservation(e) ? " observed" : " the learner mapped")); claimed.forEach((k) => text(k + "  " + ksbText(C, k), 9, "normal", 0.6)); }
  const photos = media.filter((f) => f.url && /^image\//.test(f.mime_type));
  if (photos.length) {
    head("Photos");
    const w = (full - 6) / 2; let col = 0, rowH = 0;
    for (const f of photos) {
      const src = await asDataUrl(f.url), [iw, ih] = await imgSize(src), h = Math.min(w * ih / iw, 110);
      if (col === 0) { room(h + 4); rowH = 0; }
      doc.addImage(src, /png/.test(f.mime_type) ? "PNG" : "JPEG", M + col * (w + 6), y, w, h);
      rowH = Math.max(rowH, h);
      if (col === 1) { y += rowH + 5; col = 0; } else col = 1;
    }
    if (col === 1) y += rowH + 5;
  }
  const others = media.filter((f) => f.url && !/^image\//.test(f.mime_type));
  if (others.length) { head("Other files"); others.forEach((f) => text("• " + f.storage_path.split("/").pop() + " (" + f.mime_type + "), kept in Nisia", 9, "normal", 0.6)); }
  head("Assessment");
  if (item.latest) {
    text((item.latest.decision === "accepted" ? "Accepted" : "Changes needed") + " on " + ukDate(item.latest.created_at), 10, "bold");
    if (item.latest.feedback) text(item.latest.feedback, 10);
    if ((item.latest.ksbs || []).length) { text("KSBs signed off:", 10, "bold", 0.5); item.latest.ksbs.forEach((k) => text(k + "  " + ksbText(C, k), 9, "normal", 0.6)); }
  } else text("Not assessed yet.", 10);
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(140); doc.text(L.row.name + " · " + (isSupporting(e) ? e.title : unitOf(e)) + " · page " + i + " of " + pages, M, 297 - 8); doc.setTextColor(0); }
  doc.save((L.row.name + " " + (isSupporting(e) ? e.title : unitOf(e)) + " " + String(e.created_at).slice(0, 10)).replace(/[^A-Za-z0-9 -]+/g, "").replace(/\s+/g, "-") + ".pdf");
}

/* Evia's picture of the learner, small and dense: evidence strength, write-ups, tests, confidence and Teach me. */
export function insightsHtml(snap) {
  if (!snap) return "";
  const pct = (v) => v == null ? "–" : Math.round(v) + "%";
  const units = (snap.units || []).filter((u) => u.strength), count = (l) => units.filter((u) => u.strength === l).length;
  const tile = (label, body) => '<div class="in-tile"><span class="in-l">' + label + '</span>' + body + '</div>';
  const TNAME = { epa: "EPA mock", maths: "Maths", english: "English" };
  const tests = (snap.tests || []).filter((t) => t.count);
  const conf = (snap.confidence && snap.confidence.scores) || [];
  const subj = ((snap.teach && snap.teach.subjects) || []).map((s) => s.total ? s : { ...s, done: s.areasDone || 0, total: (s.areas || []).length }).filter((s) => s.total);
  return '<section class="card insights" aria-label="From Evia"><div class="in-head"><b>From Evia</b><span class="sub">' + (snap.at ? "updated " + esc(ukDate(snap.at)) : "") + '</span></div><div class="in-grid">' +
    tile("Evidence strength", units.length ? '<span class="in-v">' + ["strong", "good", "weak"].map((l) => count(l) ? '<span class="in-s">' + strengthBars(l) + count(l) + '</span>' : "").join("") + '</span>' : '<span class="in-v muted">No units yet</span>') +
    tile("Write-ups", '<span class="in-v"><b>' + pct(snap.writeupCoverage) + '</b> of things to mention</span>') +
    tile("Tests", tests.length ? '<span class="in-v">' + tests.map((t) => '<span class="in-c">' + esc(TNAME[t.type] || t.name || t.type) + ' <b>' + pct(t.latest ? t.latest.pct : t.best) + '</b>' + (t.best != null && t.latest && t.best !== t.latest.pct ? '<small> best ' + pct(t.best) + '</small>' : "") + '</span>').join("") + '</span>' : '<span class="in-v muted">None taken</span>') +
    tile("Confidence", conf.length ? '<span class="in-v">' + conf.slice().sort((a, b) => a.score - b.score).map((c) => '<span class="in-c' + (c.score <= 2 ? " low" : "") + '" title="' + c.score + ' out of 4">' + esc(c.area) + ' <b>' + c.score + '</b></span>').join("") + '</span>' : '<span class="in-v muted">Not rated yet</span>') +
    tile("Teach me", subj.length ? '<span class="in-v">' + subj.map((s) => '<span class="in-c">' + esc(s.name) + ' <b>' + s.done + '/' + s.total + '</b>' + (s.avg != null ? '<small> ' + s.avg + '%</small>' : "") + '</span>').join("") + '</span>' : '<span class="in-v muted">Not started</span>') +
    tile("Activity", '<span class="in-v"><span class="in-c">Streak <b>' + (snap.streak || 0) + ' wk</b></span><span class="in-c">Last evidence <b>' + (snap.daysSince == null ? "–" : snap.daysSince === 0 ? "today" : snap.daysSince + "d ago") + '</b></span>' + (snap.otj ? '<span class="in-c">This month <b>' + (Math.round((snap.otj.month || 0) * 10) / 10) + ' h</b></span>' : "") + '</span>') +
    '</div></section>';
}

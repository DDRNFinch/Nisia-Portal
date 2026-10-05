/* Milos portfolio: the learner's evidence the way Evia shows it, unit by unit in the course's order, with what's
   new (not yet assessed) highlighted. Each piece opens as a document (learner's account, photos and files, the KSBs
   they mapped) that downloads as a PDF. The assessor accepts it or asks for changes, and confirms the KSBs it meets:
   the learner's mapping is ticked to start with, and can be unticked or added to. Each decision is a new row in
   Nisia's assessments (the latest one stands), so the history is kept. */
import { db, esc, ukDate } from "../../packages/core/nisia.js";
import { coursePack, allCoursePacks, topicFor } from "../../packages/core/packs.js";
import { unitStrength, strengthBars } from "../../packages/core/strength.js";
import { saveAssessment } from "./store.js";
import { analyse, highlighted, statementMarked, draftFeedback } from "./match.js";

const TYPE = { photo: "Photos", video: "Video", audio: "Voice note", document: "Document", written: "Write-up", note: "Note" };
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
  const code = L.row.course_code, C = coursePack(code) || { units: [], ksbs: [] };
  const groups = C.units.map(([name, ksbs], i) => ({ key: "u" + i, no: i + 1, name, ksbs, items: [] }));
  const other = { key: "other", name: "Other units", ksbs: [], items: [] }, supporting = { key: "supporting", name: "Supporting evidence", ksbs: [], items: [] };
  L.evidence.forEach((e) => {
    const item = { e, files: P.files[e.id] || [], history: P.assessed[e.id] || [] };
    item.latest = item.history[0] || null;
    if (isSupporting(e)) return supporting.items.push(item);
    /* By its topic's id, then its name, then the topic its KSBs fit best: renamed or regrouped topics never lose evidence. */
    const t = topicFor(C, e), g = t >= 0 ? groups[t] : null;
    if (g) { if (norm(g.name) !== norm(unitOf(e)) && unitOf(e)) item.movedFrom = unitOf(e); return g.items.push(item); }
    const elsewhere = Object.entries(allCoursePacks()).find(([k, c]) => k !== code && c.units.some(([n]) => norm(n) === norm(unitOf(e))));
    item.otherCourse = elsewhere ? elsewhere[1].name : "";
    other.items.push(item);
  });
  return groups.concat(other.items.length ? [other] : [], supporting.items.length ? [supporting] : []);
}

const status = (it) => !it.latest ? { cls: "accent", text: "New" } : it.latest.decision === "accepted" ? { cls: "good", text: "Accepted" } : { cls: "warn", text: "More asked for" };
export const statusPill = (it) => { const s = status(it); return '<span class="pill ' + s.cls + '">' + s.text + '</span>' + (it.latest && it.latest.pending || it.e.pending ? '<span class="pill idle" title="Saved on this phone, sent when there’s signal">Waiting to send</span>' : ""); };

/* The unit list on the learner page. */
export function portfolioHtml(groups, onlyNew, snap) {
  /* A KSB signed off anywhere in the portfolio counts in every topic that covers it. */
  const met = new Set();
  groups.forEach((g) => g.items.forEach((it) => { if (it.latest && it.latest.decision === "accepted") (it.latest.ksbs || []).forEach((k) => met.add(String(k).replace(/^(\d+\.\d+\.\d+)[a-z]$/, "$1"))); }));
  const newCount = groups.reduce((n, g) => n + g.items.filter((it) => !it.latest).length, 0);
  return '<div class="between"><h2>Portfolio</h2><div class="row">' + (newCount ? '<span class="pill accent">' + newCount + ' new to assess</span>' : '<span class="pill good">All assessed</span>') +
    '<button class="btn ghost" id="pfFilter">' + (onlyNew ? "Show everything" : "Only new") + '</button></div></div>' +
    '<div class="pf">' + groups.map((g) => {
      const items = onlyNew ? g.items.filter((it) => !it.latest) : g.items;
      if (onlyNew && !items.length) return "";
      const fresh = g.items.filter((it) => !it.latest).length;
      const covered = g.ksbs.filter((k) => met.has(k)).length;
      return '<details class="card pf-unit' + (fresh ? " has-new" : "") + (g.items.length ? "" : " pf-none") + '"' + (fresh || onlyNew ? " open" : "") + '><summary>' +
        '<span class="pf-no">' + (g.no || "") + '</span><span class="pf-name"><b>' + esc(g.name) + '</b><span class="sub">' +
        (g.items.length ? g.items.length + (g.items.length === 1 ? " piece" : " pieces") : "No evidence yet") + (fresh ? ' · <b class="new-txt">' + fresh + ' new</b>' : "") + '</span></span>' +
        (g.no ? strengthBars(unitStrength(snap, g.name, g.items.map((it) => ({ photos: it.files.filter((f) => /^image\//.test(f.mime_type)).length || ((it.e.source_metadata || {}).photoIds || []).length || (it.e.source_metadata || {}).photoCount || 0, text: (it.e.source_metadata || {}).text })))) : "") +
        (g.ksbs.length ? '<span class="pf-met" title="KSBs signed off">' + covered + '/' + g.ksbs.length + '<small>signed off</small></span>' : "") + '</summary>' +
        (items.length ? '<div class="pf-items">' + items.map((it) => '<button class="pf-item' + (!it.latest ? " is-new" : "") + '" data-ev="' + it.e.id + '">' +
          '<span class="name-cell"><span class="name">' + esc(g.key === "supporting" || g.key === "other" ? it.e.title : ukDate(it.e.created_at)) + '</span>' +
          '<span class="sub">' + esc([g.key === "supporting" || g.key === "other" ? ukDate(it.e.created_at) : "", it.otherCourse, it.movedFrom ? "Filed as " + it.movedFrom : "", isObservation(it.e) ? "Observation" + (it.e.source_metadata.observedBy ? " by " + it.e.source_metadata.observedBy : "") : TYPE[it.e.evidence_type] || it.e.evidence_type, it.files.length ? it.files.length + (it.files.length === 1 ? " file" : " files") : ""].filter(Boolean).join(" · ")) + '</span></span>' +
          statusPill(it) + '<span class="chev">›</span></button>').join("") + '</div>' : "") + '</details>';
    }).join("") + '</div>';
}

/* ---------- One piece of evidence, as a document ---------- */
/* Photos waiting to be sent are shown from the phone; the rest come from Nisia, so need signal. */
async function signed(files) {
  const here = files.filter((f) => f.blob), there = files.filter((f) => !f.blob);
  const urls = {};
  here.forEach((f) => { urls[f.storage_path] = URL.createObjectURL(f.blob); });
  if (there.length) {
    if (!navigator.onLine) throw new Error("Photos open when there’s signal. Everything else here works offline.");
    const { data, error } = await db.storage.from("evidence").createSignedUrls(there.map((f) => f.storage_path), 3600);
    if (error) throw error;
    there.forEach((f, i) => { urls[f.storage_path] = data[i] && data[i].signedUrl; });
  }
  return files.map((f) => ({ ...f, url: urls[f.storage_path] }));
}
const ksbText = (C, code) => ((C.ksbs || []).find((k) => k[0] === code) || [code, ""])[1];

export async function openEvidence(ctx, item, onSaved) {
  const { L, groups, me, college } = ctx, e = item.e, m = e.source_metadata || {}, C = coursePack(L.row.course_code) || { units: [], ksbs: [] };
  const group = groups.find((g) => g.items.includes(item)), siblings = group ? group.items : [item], at = siblings.indexOf(item);
  const claimed = (m.ksbs || []).filter(Boolean), latest = item.latest;
  /* The learner's words: the write-up, and what Evia wrote down from any video or voice note they recorded. */
  const words = [m.text, m.transcript ? "From the recording: " + m.transcript : ""].filter(Boolean).join("\n\n");
  const unitKsbs = group && group.ksbs.length ? group.ksbs : [];
  let ticked = new Set(latest ? latest.ksbs || [] : claimed), decision = latest ? latest.decision : "accepted";
  const extra = () => [...new Set([...claimed, ...ticked])].filter((k) => !unitKsbs.includes(k) && !suggested.includes(k));
  /* What Evia can see in the write-up (match.js): matched words, per KSB, and a draft of the feedback. */
  const photoCount = item.files.filter((f) => /^image\//.test(f.mime_type)).length || (m.photoIds || []).length || m.photoCount || 0;
  const A = words && !isSupporting(e) ? analyse({ text: words, C, code: L.row.course_code, unit: m.unit || unitOf(e), ksbs: [...new Set([...unitKsbs, ...claimed])], photos: photoCount }) : null;
  /* Other KSBs in the course whose words Evia also found in the write-up: suggested, never ticked, for the assessor
     to decide. Checked separately so "Show what Evia matched" still marks just this unit's words. */
  const unitOfKsb = (k) => { const i = C.units.findIndex(([, ks]) => ks.includes(k)); return i < 0 ? "" : "Unit " + (i + 1) + ": " + C.units[i][0]; };
  const others = A ? (C.ksbs || []).map((k) => k[0]).filter((k) => !unitKsbs.includes(k) && !claimed.includes(k)) : [];
  const O = others.length ? analyse({ text: words, C, code: L.row.course_code, unit: m.unit || unitOf(e), ksbs: others, photos: photoCount }) : null;
  const suggested = O ? others.filter((k) => O.byKsb[k].words.length >= 2).sort((a, b) => O.byKsb[b].words.length - O.byKsb[a].words.length).slice(0, 5) : [];
  suggested.forEach((k) => { A.byKsb[k] = O.byKsb[k]; });
  let showHl = (() => { try { return localStorage.getItem("milos-highlight") !== "off"; } catch (_) { return true; } })(), focusKsb = null;
  const first = String(L.row.name || "").split(" ")[0];
  const feedbackDraft = () => A ? draftFeedback(A, { first, decision, ticked, unitName: group ? group.name : unitOf(e), nvq: L.row.course_code === "trowel3" }) : "";

  const o = document.createElement("div"); o.className = "rv"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
  o.innerHTML = '<div class="rv-top"><button class="btn ghost" id="evBack">‹ Back</button><span class="spacer" style="flex:1"></span>' +
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
    (words ? '<section><div class="between acct-head"><h3>' + esc(accountHead(e)) + '</h3>' + (A ? '<label class="hl-switch"><input type="checkbox" id="hlOn"' + (showHl ? " checked" : "") + '> Show what Evia matched</label>' : "") + '</div>' +
      '<p class="paper-text" id="acct">' + esc(words) + '</p>' + (A ? '<p class="small muted" id="acctNote"></p>' : "") + '</section>' : "") +
    (claimed.length ? '<section><h3>' + (L.row.course_code === "trowel3" ? "Criteria" : "KSBs") + (isObservation(e) ? " observed" : " the learner mapped") + '</h3><ul class="paper-ksbs">' + claimed.map((k) => '<li><b>' + esc(k) + '</b> ' + esc(ksbText(C, k)) + '</li>').join("") + '</ul></section>' : "") +
    '<section><h3>Photos and files</h3><div class="paper-media" id="media"><p class="small muted">Loading…</p></div></section>';
  const drawAcct = () => {
    const el = paper.querySelector("#acct"); if (!el || !A) return;
    el.innerHTML = showHl ? highlighted(A, focusKsb) : esc(words);
    const note = paper.querySelector("#acctNote");
    if (note) note.innerHTML = !showHl ? "" : focusKsb ? "Showing the words for <b>" + esc(focusKsb) + "</b>. <button class='linkish' id='hlAll'>Show all</button>"
      : "Covers " + A.covered.length + " of " + (A.covered.length + A.missing.length) + " things to mention" + (A.missing.length ? ". Not mentioned: " + esc(A.missing.slice(0, 5).join(", ")) : "") + ". A guide only: you decide.";
    const all = paper.querySelector("#hlAll"); if (all) all.onclick = () => { focusKsb = null; drawAcct(); draw(); };
  };
  const hl = paper.querySelector("#hlOn");
  if (hl) hl.onchange = () => { showHl = hl.checked; focusKsb = null; try { localStorage.setItem("milos-highlight", showHl ? "on" : "off"); } catch (_) {} drawAcct(); draw(); };
  drawAcct();
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
    const row = (k, from, spotted) => { const f = A && (showHl || spotted) && A.byKsb[k];
      return '<label class="ksb-row' + (f && f.likely ? " ev-likely" : "") + (focusKsb === k ? " ev-focus" : "") + '"><input type="checkbox" value="' + esc(k) + '"' + (ticked.has(k) ? " checked" : "") + '><span><b>' + esc(k) + '</b> ' + (f ? statementMarked(ksbText(C, k), f.words) : esc(ksbText(C, k))) +
      (from ? ' <em class="small muted">' + from + '</em>' : "") +
      (f && f.words.length ? '<button type="button" class="ev-found" data-focus="' + esc(k) + '">' + (spotted ? "Evia found: " : f.likely ? "Evia thinks this is met: " : "Evia found: ") + esc(f.words.slice(0, 5).join(", ")) + '</button>' : "") + '</span></label>'; };
    const rest = (C.ksbs || []).map((k) => k[0]).filter((k) => !unitKsbs.includes(k) && !extra().includes(k) && !suggested.includes(k));
    box.innerHTML = '<h2>Your assessment</h2>' +
      (item.history.length ? '<div class="history">' + item.history.map((h) => '<p class="small"><span class="pill ' + (h.decision === "accepted" ? "good" : "warn") + '">' + (h.decision === "accepted" ? "Accepted" : "More asked for") + '</span> ' + esc(ukDate(h.created_at)) + (h.feedback ? ' · ' + esc(h.feedback) : "") + '</p>').join("") + '</div>' : '<p class="note">New: not assessed yet.</p>') +
      '<div class="seg2" role="radiogroup" aria-label="Decision"><button type="button" data-d="accepted" aria-pressed="' + (decision === "accepted") + '">Accept</button><button type="button" data-d="changes_required" aria-pressed="' + (decision === "changes_required") + '">Not yet: ask for more</button></div>' +
      '<p class="small muted">Any real evidence can be signed off for the KSBs it shows. Use the feedback to say what to get next time.</p>' +
      '<p class="label">' + (L.row.course_code === "trowel3" ? "Criteria" : "KSBs") + ' this evidence meets</p><p class="small muted">Ticked from what the learner mapped. Untick any that aren’t met, or add others.</p>' +
      '<div class="ksbs">' + unitKsbs.map((k) => row(k, claimed.includes(k) ? "" : "not mapped by the learner")).join("") + extra().map((k) => row(k, claimed.includes(k) ? "mapped by the learner" : "added")).join("") + '</div>' +
      (suggested.length ? '<div class="ev-spotted"><p class="label">Other ' + (L.row.course_code === "trowel3" ? "criteria" : "KSBs") + ' Evia spotted</p><p class="small muted">From other units: Evia found their words in the write-up. Tap the words to see them highlighted, and tick any you agree are met.</p>' +
        '<div class="ksbs">' + suggested.map((k) => row(k, esc(unitOfKsb(k)), true)).join("") + '</div></div>' : "") +
      (rest.length ? '<label class="field">Add another<select id="addKsb"><option value="">Choose…</option>' + rest.map((k) => '<option value="' + esc(k) + '">' + esc(k + " " + ksbText(C, k)).slice(0, 110) + '</option>').join("") + '</select></label>' : "") +
      '<div class="field"><div class="between"><span>Feedback for the learner' + (decision === "accepted" ? ' <small>(optional)</small>' : "") + '</span>' + (A ? '<button type="button" class="btn ghost small-btn" id="fbRedo">Rewrite from Evia</button>' : "") + '</div>' +
      '<textarea id="fb" rows="5" placeholder="' + (decision === "accepted" ? "What was good about it" : "What they need to add or change") + '"></textarea>' + (A ? '<small class="muted">Drafted from what Evia found. Read it and change anything.</small>' : "") + '</div>' +
      '<p class="err" role="alert"></p><button class="btn primary wide" id="save">' + (decision === "accepted" ? "Accept and sign off " + ticked.size + (ticked.size === 1 ? " KSB" : " KSBs") : "Ask for more before signing off") + '</button>';
    /* The feedback is drafted from Evia and follows the decision until the assessor edits it. */
    const fb = box.querySelector("#fb");
    if (box.dataset.fbEdited !== "1") box.dataset.fb = feedbackDraft();
    fb.value = box.dataset.fb || "";
    fb.oninput = () => { box.dataset.fb = fb.value; box.dataset.fbEdited = "1"; };
    const redo = box.querySelector("#fbRedo"); if (redo) redo.onclick = () => { if (box.dataset.fbEdited === "1" && fb.value.trim() && !confirm("Replace your feedback with a fresh draft from Evia?")) return; box.dataset.fbEdited = ""; draw(); };
    box.querySelectorAll("[data-focus]").forEach((b) => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); focusKsb = focusKsb === b.dataset.focus ? null : b.dataset.focus; if (focusKsb && !showHl) { showHl = true; if (hl) hl.checked = true; } drawAcct(); draw(); paper.querySelector("#acct").scrollIntoView({ behavior: "smooth", block: "center" }); });
    box.querySelectorAll("[data-d]").forEach((b) => b.onclick = () => { decision = b.dataset.d; draw(); });
    box.querySelectorAll(".ksb-row input").forEach((c) => c.onchange = () => { c.checked ? ticked.add(c.value) : ticked.delete(c.value); draw(); });
    const add = box.querySelector("#addKsb"); if (add) add.onchange = () => { if (add.value) { ticked.add(add.value); draw(); } };
    box.querySelector("#save").onclick = async () => {
      const b = box.querySelector("#save"), err = box.querySelector(".err"), feedback = fb.value.trim();
      if (decision !== "accepted" && !feedback) { err.textContent = "Say what the learner needs to add or change."; fb.focus(); return; }
      if (decision === "accepted" && !ticked.size) { err.textContent = "Tick at least one KSB this evidence meets, or ask for changes."; return; }
      b.disabled = true; b.textContent = "Saving…";
      const row = { organisation_id: e.organisation_id || L.enrolment.organisation_id, evidence_id: e.id, assessor_member_id: me.member_id, decision, feedback: feedback || null, ksbs: [...ticked] };
      let sent;
      try { sent = await saveAssessment({ enrolmentId: L.enrolment.id, row }); } catch (x) { err.textContent = "Couldn’t save on this phone: " + x.message; b.disabled = false; return; }
      const data = { ...row, created_at: new Date().toISOString(), pending: !sent };
      item.history.unshift(data); item.latest = data; box.dataset.fb = "";
      onSaved(item, sent);
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

export async function evidencePdf({ L, C, e, item, college, media, claimed, asBlob }) {
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
  const words = [m.text, m.transcript ? "From the recording: " + m.transcript : ""].filter(Boolean).join("\n\n");
  if (words) { head(accountHead(e)); text(words, 10); }
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
  const others = media.filter((f) => f.url && !/^image\//.test(f.mime_type) && !/observation\.pdf$/.test(f.storage_path || ""));
  if (others.length) { head("Other files"); others.forEach((f) => text("• " + f.storage_path.split("/").pop() + " (" + f.mime_type + "), kept in Nisia", 9, "normal", 0.6)); }
  head("Assessment");
  if (item.latest) {
    text((item.latest.decision === "accepted" ? (isObservation(e) ? "Observed and signed off" : "Accepted") : "More asked for") + " on " + ukDate(item.latest.created_at) + (isObservation(e) && e.source_metadata.observedBy ? " by " + e.source_metadata.observedBy : ""), 10, "bold");
    if (item.latest.feedback) text(item.latest.feedback, 10);
    if ((item.latest.ksbs || []).length) { text("KSBs signed off:", 10, "bold", 0.5); item.latest.ksbs.forEach((k) => text(k + "  " + ksbText(C, k), 9, "normal", 0.6)); }
  } else text("Not assessed yet.", 10);
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(140); doc.text(L.row.name + " · " + (isSupporting(e) ? e.title : unitOf(e)) + " · page " + i + " of " + pages, M, 297 - 8); doc.setTextColor(0); }
  if (asBlob) return doc.output("blob");
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

/* Consistency over time: which of the last 12 weeks the learner added evidence (their own and observations). */
export function consistencyHtml(evidence) {
  const DAY = 864e5, now = new Date(); now.setHours(0, 0, 0, 0);
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weeks = Array.from({ length: 12 }, (_, i) => { const from = monday.getTime() - (11 - i) * 7 * DAY; return { from, n: 0 }; });
  (evidence || []).forEach((e) => { const t = Date.parse(e.created_at); const w = weeks.find((x) => t >= x.from && t < x.from + 7 * DAY); if (w) w.n++; });
  const active = weeks.filter((w) => w.n).length, runs = weeks.reduce((a, w) => { a.cur = w.n ? a.cur + 1 : 0; a.best = Math.max(a.best, a.cur); return a; }, { cur: 0, best: 0 });
  const say = active >= 8 ? "Steady: evidence most weeks." : active >= 4 ? "Some weeks with evidence, some without." : active ? "Evidence in bursts: encourage a little every week." : "No evidence in the last 12 weeks.";
  return '<section class="card consistency" aria-label="Evidence over the last 12 weeks"><div class="in-head"><b>Consistency</b><span class="sub">last 12 weeks</span></div>' +
    '<div class="cs-strip">' + weeks.map((w) => '<i class="cs-w' + (w.n >= 3 ? " cs3" : w.n === 2 ? " cs2" : w.n === 1 ? " cs1" : "") + '" title="Week of ' + new Date(w.from).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ": " + w.n + (w.n === 1 ? " piece" : " pieces") + '"></i>').join("") + '</div>' +
    '<p class="small"><b>' + active + ' of 12 weeks</b>' + (runs.best > 1 ? ' · longest run ' + runs.best + ' weeks' : "") + ' · ' + say + '</p></section>';
}

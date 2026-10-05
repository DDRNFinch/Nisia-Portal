/* The portfolio pack, for the IQA and the end-point assessor: every KSB (or criterion) with the evidence that covers
   it and who signed it off, when; an index of the evidence with the assessor's decision and feedback; how steadily
   evidence came in over the programme; and the reviews. Built from what's on the phone, so it works offline.
   The learner prepares evidence in Evia, Evia prepares it for Milos, the assessor signs it off in Milos, and this
   hands it on. */
import { esc, ukDate } from "../../packages/core/nisia.js";
import { coursePack } from "../../packages/core/packs.js";

const DAY = 864e5;
const meta = (e) => e.source_metadata || {};
const kindOf = (e) => meta(e).collection === "observation" ? "observation" : meta(e).collection === "supporting" || /^supporting:/.test(e.client_reference || "") ? "supporting" : "evidence";
const PREFIX = { evidence: "E", observation: "O", supporting: "S" };

/* Everything the pack shows, worked out once. me: {name, member_id} of the assessor making it. */
export function buildPack(L, P, me) {
  const C = coursePack(L.row.course_code, L.row.enrolment_id) || { name: L.row.course_code, units: [], ksbs: [] }, nvq = L.row.course_code === "trowel3";
  const names = {}; (L.row.assessors || []).forEach((a) => { names[a.member_id] = a.name; }); if (me && me.member_id) names[me.member_id] = me.name;
  const nameOf = (a, e) => names[a.assessor_member_id] || (kindOf(e) === "observation" && meta(e).observedBy) || "Assessor";
  const unitNo = (u) => { const i = C.units.findIndex(([n]) => n.toLowerCase() === String(u || "").toLowerCase()); return i < 0 ? null : i + 1; };
  /* Evidence, oldest first, numbered E1, O1, S1 by kind. */
  const count = { evidence: 0, observation: 0, supporting: 0 };
  const items = L.evidence.slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).map((e) => {
    const kind = kindOf(e), a = (P.assessed[e.id] || [])[0] || null, files = P.files[e.id] || [];
    return { e, kind, ref: PREFIX[kind] + ++count[kind], unit: meta(e).unit || e.title || "", unitNo: unitNo(meta(e).unit || e.title), at: e.created_at,
      photos: files.filter((f) => /^image\//.test(f.mime_type)).length || (meta(e).photoIds || []).length || 0,
      claimed: (meta(e).ksbs || []).filter(Boolean), text: meta(e).text || "", a, by: a ? nameOf(a, e) : "", decision: a ? a.decision : null };
  });
  /* Each KSB: the evidence signed off for it, and the evidence only mapped to it so far. */
  const ksbs = (C.ksbs || []).map(([code, statement]) => {
    const signed = items.filter((it) => it.decision === "accepted" && (it.a.ksbs || []).includes(code));
    const mapped = items.filter((it) => !signed.includes(it) && it.claimed.includes(code));
    const first = signed.map((it) => it.a.created_at).sort()[0] || null;
    return { code, statement, signed, mapped, first, status: signed.length ? "signed" : mapped.length ? "mapped" : "none" };
  });
  /* Consistency: evidence each month from the start, and the share of weeks with some. */
  const start = Date.parse(L.enrolment.start_date) || Date.parse((items[0] || {}).at) || Date.now(), now = Date.now();
  const months = []; for (let d = new Date(start); d.getTime() <= now || months.length === 0; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const key = d.getFullYear() + "-" + d.getMonth(); months.push({ key, label: d.toLocaleDateString("en-GB", { month: "short" }) + (d.getMonth() === 0 || !months.length ? " " + String(d.getFullYear()).slice(2) : ""), n: 0 });
    if (months.length > 48) break;
  }
  const weeks = new Set();
  items.filter((it) => it.kind !== "supporting").forEach((it) => { const t = new Date(it.at), m = months.find((x) => x.key === t.getFullYear() + "-" + t.getMonth()); if (m) m.n++; weeks.add(Math.floor((t.getTime() - start) / (7 * DAY))); });
  const weeksSoFar = Math.max(1, Math.ceil((now - start) / (7 * DAY)));
  const signedCount = ksbs.filter((k) => k.status === "signed").length;
  return {
    L, C, nvq, word: nvq ? "criteria" : "KSBs", one: nvq ? "criterion" : "KSB", made: new Date().toISOString(), by: (me && me.name) || "",
    learner: L.row.name, employer: L.enrolment.employer_name || L.row.employer_name || "", start: L.enrolment.start_date, end: L.enrolment.end_date,
    items, ksbs, months, weeksActive: weeks.size, weeksSoFar,
    totals: { ksbs: ksbs.length, signed: signedCount, mapped: ksbs.filter((k) => k.status === "mapped").length, pct: ksbs.length ? Math.round(signedCount / ksbs.length * 100) : 0,
      evidence: items.filter((it) => it.kind === "evidence").length, observations: items.filter((it) => it.kind === "observation").length, supporting: items.filter((it) => it.kind === "supporting").length,
      accepted: items.filter((it) => it.decision === "accepted").length, more: items.filter((it) => it.decision === "changes_required").length, waiting: items.filter((it) => !it.decision && it.kind !== "supporting").length },
    reviews: L.reviews.map((v, i) => ({ no: i + 1, at: v.reviewed_at, rag: (v.content && v.content.answers && v.content.answers.overallRag) || "" })),
  };
}

const STATUS = { signed: ["good", "Signed off"], mapped: ["warn", "Mapped, not signed off"], none: ["idle", "No evidence yet"] };
const decisionText = (it) => it.decision === "accepted" ? (it.kind === "observation" ? "Observed and signed off" : "Signed off") : it.decision ? "More asked for" : it.kind === "supporting" ? "Supporting" : "Not assessed yet";

/* On screen, full page, with the PDF button. */
export function openPack(pack, onPdf) {
  const T = pack.totals, max = Math.max(1, ...pack.months.map((m) => m.n));
  const o = document.createElement("div"); o.className = "rv"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
  o.innerHTML = '<div class="rv-top"><button class="btn ghost" id="pkBack">‹ Back</button><span style="flex:1"></span><button class="btn primary" id="pkPdf">Download PDF</button></div>' +
    '<div class="rv-body"><article class="paper pack">' +
      '<header class="paper-head"><div><p class="label">Portfolio pack for IQA and EPA</p><h1>' + esc(pack.learner) + '</h1><p class="muted small">' + esc(pack.C.name || "") + (pack.C.std ? " (" + esc(pack.C.std) + ")" : "") + '</p></div>' +
      '<dl class="paper-meta"><div><dt>Employer</dt><dd>' + esc(pack.employer || "–") + '</dd></div><div><dt>Programme</dt><dd>' + esc(ukDate(pack.start)) + ' to ' + esc(ukDate(pack.end)) + '</dd></div><div><dt>Prepared by</dt><dd>' + esc(pack.by) + ', ' + esc(ukDate(pack.made)) + '</dd></div></dl></header>' +
      '<div class="pk-sum"><div><b>' + T.signed + '/' + T.ksbs + '</b><span>' + pack.word + ' signed off (' + T.pct + '%)</span></div><div><b>' + T.evidence + '</b><span>pieces of evidence</span></div><div><b>' + T.observations + '</b><span>observations</span></div><div><b>' + pack.weeksActive + '/' + pack.weeksSoFar + '</b><span>weeks with evidence</span></div></div>' +
      '<section><h3>Evidence each month</h3><div class="pk-months">' + pack.months.map((m) => '<span title="' + m.n + '"><i style="height:' + Math.round(m.n / max * 100) + '%"></i><small>' + esc(m.label) + '</small></span>').join("") + '</div></section>' +
      '<section><h3>' + (pack.nvq ? "Criteria" : "KSB") + ' coverage</h3><div class="pk-matrix">' + pack.ksbs.map((k) =>
        '<div class="pk-row"><span class="pk-code">' + esc(k.code) + '</span><span class="pk-st"><span class="small">' + esc(k.statement) + '</span>' +
        (k.signed.length ? '<span class="pk-refs">' + k.signed.map((it) => '<span class="pill good">' + it.ref + '</span>').join("") + '<small>' + esc(k.signed[0].by) + ', ' + esc(ukDate(k.first)) + '</small></span>' : "") +
        (k.mapped.length ? '<span class="pk-refs">' + k.mapped.map((it) => '<span class="pill warn">' + it.ref + '</span>').join("") + '<small>mapped by the learner</small></span>' : "") + '</span>' +
        '<span class="pill ' + STATUS[k.status][0] + '">' + STATUS[k.status][1] + '</span></div>').join("") + '</div></section>' +
      '<section><h3>Evidence</h3><div class="pk-ev">' + (pack.items.map((it) =>
        '<div class="pk-item"><div class="between"><b>' + it.ref + ' · ' + esc(it.kind === "supporting" ? it.e.title : it.unit) + '</b><span class="small muted">' + esc(ukDate(it.at)) + '</span></div>' +
        '<p class="small">' + esc(decisionText(it)) + (it.by ? " by " + esc(it.by) + ", " + esc(ukDate(it.a.created_at)) : "") + (it.photos ? " · " + it.photos + " photo" + (it.photos === 1 ? "" : "s") : "") +
        (it.a && (it.a.ksbs || []).length ? " · " + esc(it.a.ksbs.join(", ")) : it.claimed.length ? " · mapped " + esc(it.claimed.join(", ")) : "") + '</p>' +
        (it.a && it.a.feedback ? '<p class="small pk-fb">“' + esc(it.a.feedback) + '”</p>' : "") + '</div>').join("") || '<p class="muted small">No evidence yet.</p>') + '</div></section>' +
      '<section><h3>Progress reviews</h3>' + (pack.reviews.length ? '<ul class="paper-ksbs">' + pack.reviews.map((v) => '<li>Review ' + v.no + ', ' + esc(ukDate(v.at)) + (v.rag ? ": " + esc(v.rag) : "") + '</li>').join("") + '</ul>' : '<p class="muted small">None yet.</p>') + '</section>' +
    '</article></div>';
  o.querySelector("#pkBack").onclick = () => o.remove();
  o.querySelector("#pkPdf").onclick = () => onPdf(pack);
  document.body.appendChild(o);
  return o;
}

/* The PDF: the same pack, with a sampling record for the IQA at the end. */
export function packPdf(pack) {
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: "mm", format: "a4" }), W = 210, H = 297, M = 16, full = W - 2 * M, T = pack.totals;
  let y = M;
  const room = (h) => { if (y + h > H - M - 6) { doc.addPage(); y = M; return true; } return false; };
  const font = (size, style = "normal", grey) => { doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(grey ? 110 : 0); };
  const text = (s, size = 10, style = "normal", gap = 1.5, x = M, width = full, grey) => { font(size, style, grey); doc.splitTextToSize(String(s), width).forEach((line) => { room(size * 0.45); doc.text(line, x, y); y += size * 0.42; }); y += gap; };
  const head = (s) => { y += 3; room(14); doc.setDrawColor(200); doc.line(M, y - 3, W - M, y - 3); text(s, 12, "bold", 1.5); };

  text("Portfolio pack for IQA and EPA", 9, "normal", 5, M, full, true);
  text(pack.learner, 20, "bold", 1);
  text((pack.C.name || "") + (pack.C.std ? " (" + pack.C.std + ")" : ""), 11, "normal", 0.5);
  text((pack.employer ? pack.employer + " · " : "") + ukDate(pack.start) + " to " + ukDate(pack.end), 10, "normal", 0.5, M, full, true);
  text("Prepared by " + pack.by + " on " + ukDate(pack.made) + " from the records in Nisia.", 10, "normal", 3, M, full, true);

  /* Summary boxes. */
  const boxes = [[T.signed + "/" + T.ksbs, pack.word + " signed off (" + T.pct + "%)"], [String(T.evidence), "pieces of evidence"], [String(T.observations), "observations"], [pack.weeksActive + "/" + pack.weeksSoFar, "weeks with evidence"]];
  const bw = (full - 9) / 4; room(20);
  boxes.forEach(([b, s], i) => { const x = M + i * (bw + 3); doc.setDrawColor(215); doc.roundedRect(x, y, bw, 17, 2, 2); font(14, "bold"); doc.text(b, x + 3, y + 7); font(8, "normal", true); doc.text(doc.splitTextToSize(s, bw - 6), x + 3, y + 12); });
  y += 22;
  text(T.accepted + " signed off · " + T.more + " with more asked for · " + T.waiting + " waiting to be assessed · " + T.supporting + " supporting documents.", 9, "normal", 2, M, full, true);

  /* Evidence each month, as bars. */
  head("Evidence each month");
  const max = Math.max(1, ...pack.months.map((m) => m.n)), n = pack.months.length, gap = 1.5, barW = Math.min(12, (full - gap * (n - 1)) / n), chartH = 22;
  room(chartH + 10);
  pack.months.forEach((m, i) => { const x = M + i * (barW + gap), h = m.n / max * chartH;
    doc.setFillColor(235, 238, 243); doc.rect(x, y, barW, chartH, "F"); if (h) { doc.setFillColor(37, 99, 235); doc.rect(x, y + chartH - h, barW, h, "F"); }
    font(6.5, "normal", true); doc.text(m.label, x + barW / 2, y + chartH + 3.5, { align: "center" }); if (m.n) { font(6.5, "bold"); doc.text(String(m.n), x + barW / 2, y + chartH - h - 1, { align: "center" }); } });
  y += chartH + 8;

  /* Coverage matrix. */
  head((pack.nvq ? "Criteria" : "KSB") + " coverage");
  const cCode = 14, cSt = 92, cEv = 38, xSt = M + cCode, xEv = xSt + cSt + 2, xOk = xEv + cEv + 2, cOk = full - (xOk - M);
  const hdr = () => { font(8, "bold", true); doc.text(pack.nvq ? "Criterion" : "KSB", M, y); doc.text("Statement", xSt, y); doc.text("Evidence", xEv, y); doc.text("Signed off", xOk, y); y += 2; doc.setDrawColor(220); doc.line(M, y, W - M, y); y += 3.5; };
  hdr();
  pack.ksbs.forEach((k) => {
    font(8); const st = doc.splitTextToSize(k.statement, cSt), ev = doc.splitTextToSize([...k.signed.map((it) => it.ref), ...k.mapped.map((it) => it.ref + "*")].join(", ") || "–", cEv);
    const ok = doc.splitTextToSize(k.signed.length ? k.signed[0].by + ", " + ukDate(k.first) : k.mapped.length ? "Mapped, not yet" : "No evidence yet", cOk);
    const h = Math.max(st.length, ev.length, ok.length) * 3.4 + 1.6;
    if (room(h)) hdr();
    if (k.status === "signed") { doc.setFillColor(22, 163, 74); doc.circle(M + 1, y - 1, 0.9, "F"); } else if (k.status === "mapped") { doc.setFillColor(217, 119, 6); doc.circle(M + 1, y - 1, 0.9, "F"); } else { doc.setDrawColor(170); doc.circle(M + 1, y - 1, 0.9); }
    font(8, "bold"); doc.text(k.code, M + 3, y); font(8); doc.text(st, xSt, y); doc.text(ev, xEv, y); font(8, "normal", k.status !== "signed"); doc.text(ok, xOk, y);
    y += h; doc.setDrawColor(238); doc.line(M, y - 2.6, W - M, y - 2.6);
  });
  text("* mapped by the learner, not yet signed off. E: learner's evidence · O: assessor's observation · S: supporting document.", 7.5, "normal", 2, M, full, true);

  /* Evidence index. */
  head("Evidence");
  if (!pack.items.length) text("No evidence yet.", 10);
  pack.items.forEach((it) => {
    room(16);
    text(it.ref + "  " + (it.kind === "supporting" ? it.e.title : (it.unitNo ? "Unit " + it.unitNo + ": " : "") + it.unit) + "   " + ukDate(it.at), 10, "bold", 0.6);
    text(decisionText(it) + (it.by ? " by " + it.by + " on " + ukDate(it.a.created_at) : "") + (it.photos ? " · " + it.photos + " photo" + (it.photos === 1 ? "" : "s") : "") +
      (it.a && (it.a.ksbs || []).length ? " · " + pack.word + ": " + it.a.ksbs.join(", ") : it.claimed.length ? " · mapped: " + it.claimed.join(", ") : ""), 8.5, "normal", 0.6, M, full, true);
    if (it.text) text((it.kind === "observation" ? "Observed: " : "Learner: ") + (it.text.length > 420 ? it.text.slice(0, 420).replace(/\s+\S*$/, "") + "…" : it.text), 8.5, "normal", 0.6);
    if (it.a && it.a.feedback) text("Feedback: " + it.a.feedback, 8.5, "italic", 0.6);
    y += 1.8;
  });
  text("Each piece of evidence, with its photos, downloads in full from Milos or Nisia.", 7.5, "normal", 2, M, full, true);

  /* Reviews. */
  head("Progress reviews");
  if (!pack.reviews.length) text("None yet.", 10);
  pack.reviews.forEach((v) => text("Review " + v.no + ", " + ukDate(v.at) + (v.rag ? ": " + v.rag : ""), 9.5, "normal", 0.8));

  /* For the IQA to fill in. */
  head("IQA sampling record");
  const line = (label) => { room(10); font(9, "normal", true); doc.text(label, M, y + 4); doc.setDrawColor(190); doc.line(M + 34, y + 4.5, W - M, y + 4.5); y += 9; };
  ["Sampled by", "Date", "Evidence sampled", "Decision", "Comments", "", "Action for assessor"].forEach(line);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); font(7.5, "normal", true); doc.text(pack.learner + " · portfolio pack · " + ukDate(pack.made) + " · page " + i + " of " + pages, M, H - 8); }
  doc.save((pack.learner + " portfolio pack " + pack.made.slice(0, 10)).replace(/[^A-Za-z0-9 -]+/g, "").replace(/\s+/g, "-") + ".pdf");
}

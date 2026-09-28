/* A completed progress review, as a document: one list of sections for the screen (reviewHtml) and the PDF
   (reviewPdf), so both always match. Staff (Nisia and the assessor) see the signatures; the learner's copy
   ({ signatures: false }) names who signed and when, without the signatures themselves. Handles reviews saved by
   the earlier fourteen-screen form as well as the four-screen one. */
import { esc, ukDate } from "./nisia.js";

const RULES_NAME = "Apprenticeship funding rules 2025 to 2026";
const or = (...xs) => xs.find((x) => x != null && String(x).trim() !== "") || "";
const cap = (k) => k[0].toUpperCase() + k.slice(1);
const SIGNERS = ["apprentice", "employer", "assessor"];

export function reviewSections(c) {
  const F = c.facts, A = c.answers;
  return [
    ["About this review", [["Apprentice", F.learner], ["Employer", F.employer], ["Programme", ukDate(F.start) + " to " + ukDate(F.end)], ["Review period", ukDate(F.periodStart) + " to " + ukDate(F.periodEnd)],
      ["Held", A.method], ["Took part", Object.entries(A.attendees || {}).filter(([, v]) => v).map(([k]) => cap(k)).join(", ") + (A.employerName ? " (employer: " + A.employerName + (A.employerRole ? ", " + A.employerRole : "") + ")" : "")]]],
    ["Progress", [["Time through programme", F.timePct != null ? F.timePct + "%" : "-"], [F.nvq ? "Criteria evidenced" : "KSBs evidenced", F.ksb.met + " of " + F.ksb.total + " (" + F.ksb.pct + "%)"],
      ["Evidence this period", F.evidencePeriod + " (" + F.evidenceTotal + " in total)"],
      ...(A.previous || []).map((t) => ["Previous target: " + t.title, (t.outcome || "Not recorded") + (t.comment ? ". " + t.comment : "")]),
      ["Against the plan", A.progressRag], ["Assessor", A.progressComment], ["Employer", A.employerComment],
      ["Off-the-job hours", F.otj.total + " h logged (" + F.otj.period + " h this period)" + (F.otj.expected != null ? ", " + F.otj.expected + " h expected by now" : "")],
      ["In working hours", A.otjConfirmed ? "Confirmed by the employer" : "Not confirmed. " + (A.otjComment || "")],
      ["Maths", F.maths && F.maths.on ? A.mathsStatus : "Achieved or exempt"], ["English", F.english && F.english.on ? A.englishStatus : "Achieved or exempt"],
      ...(A.fsComment ? [["English and maths", A.fsComment]] : []), ...(A.knowledgeComment ? [["Knowledge discussed", A.knowledgeComment]] : [])]],
    ["Wellbeing, safety and support", [["Feels safe", A.feelsSafe + (A.feelsSafe !== "Yes" && A.safeguardingComment ? ". " + A.safeguardingComment : "")], ["Knows how to raise a concern", A.knowsReporting],
      ["Discussed (Prevent, British values, EDI)", A.topicDiscussed], ["Health and safety", or(A.hsStatus === "Something to record" ? A.healthSafety : A.hsStatus, A.healthSafety)],
      ["Learning support", A.supportInPlace + (A.supportInPlace !== "Not needed" && A.supportNeeds ? ". " + A.supportNeeds : "")],
      ["Changes in circumstances", A.changes + (A.changes === "Yes" && A.changesDetail ? ". " + A.changesDetail : "")]]],
    ["Next steps", [["Apprentice", A.apprenticeComment], ["Careers advice", or(A.iagGiven ? A.iagGiven + (A.iagGiven === "Yes" && A.nextSteps ? ". " + A.nextSteps : "") : "", A.iag, A.nextSteps)],
      ["End-point assessment", A.epaReady + (A.predictedGrade && !/^Too early/.test(A.predictedGrade) ? " (predicted " + A.predictedGrade + ")" : "")],
      ...((c.targets || []).length ? c.targets.map((t, i) => ["Target " + (i + 1) + ": " + t.title, t.how + (t.due ? " By " + ukDate(t.due) + "." : "") + (t.support ? " Support: " + t.support + "." : "")]) : [["Targets", "None."]]),
      ["Next review", ukDate(A.nextReview)]]],
    ["Overall", [["Overall progress", A.overallRag], ["Summary", A.summary]]],
  ];
}
const signedBy = (c) => SIGNERS.filter((k) => c.signatures && c.signatures[k]).map((k) => ({ role: cap(k), ...c.signatures[k] }));

export function reviewHtml(c, o = {}) {
  const show = o.signatures !== false, F = c.facts;
  return '<article class="review-doc"><header><h2>Progress review ' + esc(F.reviewNo) + '</h2><p class="muted small">' + esc(F.learner) + ' · ' + esc(F.course) + ' · ' + esc(ukDate(c.reviewedAt || c.answers.date)) + '</p></header>' +
    reviewSections(c).map(([h, rows]) => '<section><h3>' + esc(h) + '</h3><dl>' + rows.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v || "-") + '</dd>').join("") + '</dl></section>').join("") +
    '<section><h3>Signed</h3><div class="sigs">' + signedBy(c).map((s) => '<div class="sig-box">' + (show && s.image ? '<img src="' + esc(s.image) + '" alt="' + esc(s.role) + '’s signature">' : "") +
      '<span><b>' + esc(s.role) + '</b> ' + esc(s.name) + '<br><span class="small muted">' + esc(new Date(s.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })) + '</span></span></div>').join("") + '</div></section>' +
    '<p class="small muted">' + esc(RULES_NAME) + ' · record ' + esc(c.id || "") + ' · content hash ' + esc((c.hash || "").slice(0, 16)) + '</p></article>';
}

export async function reviewPdf(c, o = {}) {
  const show = o.signatures !== false, { jsPDF } = window.jspdf, F = c.facts, doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 16, T = (s) => String(s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...");
  let y = 18;
  const room = (h) => { if (y + h > 282) { doc.addPage(); y = 18; } };
  const h2 = (t) => { room(14); y += 3; doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(44, 133, 247); doc.text(T(t), M, y); y += 6; doc.setTextColor(23, 32, 51); };
  const kv = (k, v) => { doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); const keys = doc.splitTextToSize(T(k), 54); doc.setFont("helvetica", "normal"); const lines = doc.splitTextToSize(T(v || "-"), W - 2 * M - 58), h = Math.max(keys.length, lines.length) * 4.6 + 1.5;
    room(h); doc.setFont("helvetica", "bold"); doc.setTextColor(102, 112, 133); doc.text(keys, M, y); doc.setFont("helvetica", "normal"); doc.setTextColor(23, 32, 51); doc.text(lines, M + 58, y); y += h; };
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(23, 32, 51); doc.text("Apprenticeship progress review", M, y); y += 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(102, 112, 133);
  doc.text(T(F.learner + "  ·  " + F.course + "  ·  Review " + F.reviewNo + "  ·  " + ukDate(c.reviewedAt || c.answers.date)), M, y); y += 8;
  reviewSections(c).forEach(([h, rows]) => { h2(h); rows.forEach(([k, v]) => kv(k, v)); });
  h2("Signed");
  for (const s of signedBy(c)) {
    if (show && s.image) { room(24); try { doc.addImage(s.image, "PNG", M, y, 60, 17); } catch { /* unreadable image */ } doc.setFontSize(9); doc.setTextColor(102, 112, 133); doc.text(T(s.role + ": " + s.name + "  ·  " + new Date(s.at).toLocaleString("en-GB")), M + 66, y + 10); y += 21; }
    else kv(s.role, s.name + ", " + new Date(s.at).toLocaleString("en-GB"));
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(152, 162, 179); doc.text(T("Nisia · " + RULES_NAME + " · record " + (c.id || "") + " · content hash " + (c.hash || "").slice(0, 16) + " · page " + i + " of " + n), M, 292); }
  doc.save(("Progress review " + F.reviewNo + " " + F.learner + " " + String(c.reviewedAt || c.answers.date).slice(0, 10)).replace(/[^\w .-]/g, "") + ".pdf");
}

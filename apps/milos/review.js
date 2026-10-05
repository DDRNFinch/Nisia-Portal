/* Milos progress review: a three-way review (apprentice, employer, assessor) at least every 12 weeks, covering what
   the apprenticeship funding rules and Ofsted look for, with everything Evia knows filled in first:
   progress against the training plan and KSBs, off-the-job training, English and maths, knowledge and practice,
   safeguarding, Prevent, British values and EDI, support needs, changes in circumstances, the apprentice's and
   employer's comments, EPA readiness, new SMART targets, and three signatures. Facts from Evia can't be edited (so
   the record matches the data); people write the rest. Saved once, when signed, with a hash of its content; a draft
   is kept on this device until then. */
import { db, esc, ukDate } from "../../packages/core/nisia.js";
import { coursePack } from "../../packages/core/packs.js";
import { saveReview } from "./store.js";
import { progressText, otjText, fsText, summaryText, suggestRag } from "./draft.js";
import { reviewPdf } from "../../packages/core/reviewdoc.js";

export const RULES = { id: "apprenticeship-funding-2025-26", intervalWeeks: 12, name: "Apprenticeship funding rules 2025 to 2026" };
const DAY = 864e5;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

/* ---------- Loading everything about one learner ---------- */
export async function loadLearner(row) {
  const e = row.enrolment_id;
  const [enr, recs, reviews, evidence, otj] = await Promise.all([
    db.from("enrolments").select("*").eq("id", e).single(),
    db.from("evia_records").select("collection, record_id, data, deleted_at, updated_at").eq("enrolment_id", e).is("deleted_at", null).in("collection", ["snapshot", "targets", "reviews", "learner", "lessonResults", "tests", "confidence"]),
    db.from("reviews").select("*").eq("enrolment_id", e).order("reviewed_at", { ascending: true }),
    db.from("evidence").select("id, organisation_id, title, evidence_type, created_at, source_metadata, client_reference").eq("enrolment_id", e).order("created_at", { ascending: false }),
    db.from("otj_entries").select("activity_date, hours, description, activity_type").eq("enrolment_id", e),
  ]);
  for (const r of [enr, recs, reviews, evidence, otj]) if (r.error) throw new Error(r.error.message);
  const by = (c) => recs.data.filter((r) => r.collection === c).map((r) => r.data);
  return {
    row, enrolment: enr.data, snapshot: by("snapshot")[0] || null, eviaTargets: by("targets"), eviaReviews: by("reviews"),
    eviaLearner: by("learner")[0] || null, reviews: reviews.data || [], evidence: evidence.data || [], otj: otj.data || [],
  };
}

/* When the next review is due: 12 weeks after the last one (or the start). */
export function reviewDue(start, lastReviewedAt) {
  const from = lastReviewedAt ? Date.parse(lastReviewedAt) : Date.parse(start);
  if (isNaN(from)) return null;
  const due = from + RULES.intervalWeeks * 7 * DAY, days = Math.ceil((due - Date.now()) / DAY);
  return { due: new Date(due), days, overdue: days < 0, soon: days >= 0 && days <= 14 };
}
export const dueText = (d) => !d ? "" : d.overdue ? "Overdue by " + -d.days + " day" + (d.days === -1 ? "" : "s") : d.days === 0 ? "Due today" : "Due in " + d.days + " day" + (d.days === 1 ? "" : "s");

/* ---------- The facts, from Evia and Nisia ---------- */
export function facts(L, now = Date.now()) {
  const en = L.enrolment, row = L.row, snap = L.snapshot || {}, course = coursePack(row.course_code) || { name: row.course_code, ksbs: [], units: [] };
  const start = Date.parse(en.start_date), end = Date.parse(en.end_date);
  const last = L.reviews.length ? L.reviews[L.reviews.length - 1] : null;
  const periodStart = last ? Date.parse(last.reviewed_at) : start;
  const timePct = end > start ? Math.round(clamp((now - start) / (end - start), 0, 1) * 100) : null;
  const planned = en.planned_otj_hours != null ? Number(en.planned_otj_hours) : null;
  const otjTotal = round1(L.otj.reduce((n, x) => n + Number(x.hours || 0), 0));
  const otjPeriod = round1(L.otj.filter((x) => Date.parse(x.activity_date) >= periodStart - DAY).reduce((n, x) => n + Number(x.hours || 0), 0));
  const otjExpected = planned != null && timePct != null ? Math.round(planned * timePct / 100) : null;
  /* A KSB counts once the assessor has signed it off (the latest decision on each piece of evidence). What the
     learner has mapped but isn't signed off yet is "waiting". Without the assessments to hand, Evia's figures. */
  let ksb = snap.ksb || { met: 0, total: course.ksbs.length, pct: 0 };
  if (L.P && course.ksbs.length) {
    const signed = new Set(), mapped = new Set();
    L.evidence.forEach((e) => { const a = (L.P.assessed[e.id] || [])[0]; ((e.source_metadata || {}).ksbs || []).forEach((k) => mapped.add(k)); if (a && a.decision === "accepted") (a.ksbs || []).forEach((k) => signed.add(k)); });
    const codes = course.ksbs.map((k) => k[0]), met = codes.filter((k) => signed.has(k)).length;
    ksb = { met, total: codes.length, pct: Math.round(met / codes.length * 100), waiting: codes.filter((k) => mapped.has(k) && !signed.has(k)).length };
  }
  const missingUnits = (snap.units || []).filter((u) => (u.missing || []).length).map((u) => ({ name: u.name, missing: u.missing.length, codes: u.missing.slice(0, 6), total: u.total, started: u.started, strength: u.strength || null }));
  const subject = (id) => ((snap.teach && snap.teach.subjects) || []).find((s) => s.id === id) || null;
  const test = (type) => (snap.tests || []).find((t) => t.type === type) || null;
  const eviaReview = L.eviaReviews.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0] || null;
  const reflection = (eviaReview && eviaReview.reflection) || {};
  /* Last review's targets, as Evia has been tracking them (how far along each is); older reviews by title only. */
  const tracked = (snap.targets || []).filter((t) => last && t.reviewId === last.id);
  const prevMilos = tracked.length ? tracked.map((t) => ({ source: "evia-tracked", title: t.title, due: t.due, pct: t.pct, text: t.text, met: t.done }))
    : last && last.content && Array.isArray(last.content.targets) ? last.content.targets.map((t) => ({ source: "review", title: t.title, due: t.due })) : [];
  /* Evia's own targets, with how far along each one is as Evia measures it, so each comes marked Met, Partly met or
     Not met. Old-style targets Evia no longer shows the learner are left out. */
  const live = (snap.targets || []).filter((t) => !t.reviewId || !last || t.reviewId !== last.id);
  const prevEvia = live.length ? live.filter((t) => !t.done || !t.doneAt || t.doneAt >= periodStart).map((t) => ({ source: "evia-tracked", title: t.title, due: t.due, pct: t.pct, text: t.text, met: t.done }))
    : L.eviaTargets.filter((t) => t.store !== "legacy" && (t.course === row.course_code || !t.course) && (!t.metAt || Date.parse(t.metAt) >= periodStart))
      .map((t) => ({ source: "evia", title: t.title, due: t.due ? isoDay(t.due) : "", met: !!t.metAt, pct: t.metAt ? 100 : null }));
  return {
    learner: row.name, course: course.name + (course.std ? " (" + course.std + ")" : ""), courseCode: row.course_code, nvq: !!course.nvq,
    employer: en.employer_name || "", employerContact: en.employer_contact_name || "", start: en.start_date, end: en.end_date, status: en.status,
    reviewNo: L.reviews.length + 1, periodStart: isoDay(periodStart), periodEnd: isoDay(now), lastReview: last ? isoDay(last.reviewed_at) : null,
    timePct, ksb: { met: ksb.met || 0, total: ksb.total || course.ksbs.length, pct: ksb.pct || 0, waiting: ksb.waiting || 0 }, missingUnits,
    evidenceTotal: L.evidence.length, evidencePeriod: L.evidence.filter((x) => Date.parse(x.created_at) >= periodStart).length,
    writeupCoverage: snap.writeupCoverage ?? null, lastActive: snap.lastUpload || (L.evidence[0] && L.evidence[0].created_at) || null,
    otj: { planned, expected: otjExpected, total: otjTotal, period: otjPeriod, onTrack: otjExpected == null ? null : otjTotal >= otjExpected * 0.9 },
    maths: { on: !!snap.maths, teach: subject("maths"), test: test("maths") }, english: { on: !!snap.english, teach: subject("english"), test: test("english") },
    teachCourse: subject("course"), edi: subject("edi"), medals: snap.teach ? snap.teach.medals : null,
    mock: test("epa"), confidence: snap.confidence || null,
    reflection: { feedback: reflection.learnerFeedback || "", support: reflection.support || "", nextSteps: reflection.nextSteps || "", at: eviaReview ? eviaReview.date : null },
    previousTargets: tracked.length ? prevMilos : prevMilos.concat(prevEvia), hasEvia: !!L.snapshot,
    checkIn: eviaReview && Date.parse(eviaReview.date) >= periodStart - 14 * DAY ? reflection : {}, checkInAt: eviaReview ? eviaReview.date : null,
    snap: { ksbMet: ksb.met || 0, otjTotal: otjTotal, coverage: snap.writeupCoverage ?? null, edi: ((snap.teach && snap.teach.subjects) || []).find((x) => x.id === "edi") || null, strengthWeak: (snap.units || []).filter((u) => u.strength === "weak").map((u) => u.name) },
  };
}

/* Targets from Evia's data, each with what Evia measures (measure), so Evia tracks them for the learner after the
   review and the next review knows whether they were met. */
export function suggestTargets(F) {
  const due = isoDay(Date.now() + 6 * 7 * DAY), out = [], word = F.nvq ? "criteria" : "KSBs";
  const gap = F.missingUnits.slice().sort((a, b) => b.missing - a.missing)[0];
  if (gap) { const n = Math.min(gap.missing, 6);
    out.push({ title: "Evidence for " + gap.name, how: "A pack in Evia with at least 10 photos from start to finish and a guided write-up, covering " + (gap.codes && gap.codes.length ? gap.codes.join(", ") : "the " + word + " still missing") + ". Evia counts it when " + n + " more " + word + " are evidenced.", due, support: "Employer to give the chance to do this work",
      measure: { kind: "ksb", target: n, baseline: F.snap.ksbMet } }); }
  if (F.otj.onTrack === false) { const perWeek = Math.max(6, Math.ceil((F.otj.expected - F.otj.total) / 6)), goal = perWeek * 6;
    out.push({ title: "Catch up on off-the-job training", how: "Log " + perWeek + " hours a week in Evia (" + goal + " hours in 6 weeks) until back on plan: " + F.otj.expected + " h expected by now, " + F.otj.total + " h logged.", due, support: "Employer to protect training time",
      measure: { kind: "otj", target: goal, baseline: F.snap.otjTotal } }); }
  else if (F.otj.expected != null) out.push({ title: "Keep off-the-job training on plan", how: "Log at least 36 hours in the next 6 weeks in Evia.", due, support: "", measure: { kind: "otj", target: 36, baseline: F.snap.otjTotal } });
  if (F.snap.coverage != null && F.snap.coverage < 70) out.push({ title: "Fuller write-ups", how: "Write-ups covering 70% of each unit's things to mention (" + F.snap.coverage + "% now)" + (F.snap.strengthWeak.length ? ", starting with " + F.snap.strengthWeak.slice(0, 2).join(" and ") : "") + ". Use Evia's guided mode.", due, support: "", measure: { kind: "quality", target: 70, baseline: 0 } });
  if (F.maths.on && !(F.maths.test && F.maths.test.best >= 70)) out.push({ title: "Maths: 70% in a test", how: "Work through the next maths areas in Teach me, then score 70% or more in an Evia maths test" + (F.maths.test ? " (best so far " + F.maths.test.best + "%)" : "") + ".", due, support: "", measure: { kind: "maths", target: 70, baseline: 0 } });
  if (F.english.on && !(F.english.test && F.english.test.best >= 70)) out.push({ title: "English: 70% in a test", how: "Work through the next English areas in Teach me, then score 70% or more in an Evia English test" + (F.english.test ? " (best so far " + F.english.test.best + "%)" : "") + ".", due, support: "", measure: { kind: "english", target: 70, baseline: 0 } });
  const low = F.confidence && (F.confidence.scores || []).filter((x) => x.score <= 2).sort((a, b) => a.score - b.score)[0];
  if (low) out.push({ title: "Build confidence: " + low.area, how: "Practise " + low.area + " at work with support, then re-rate it as Confident in Evia.", due, support: "Supervisor to demonstrate and observe", measure: { kind: "skill", target: 3, baseline: low.score, param: low.area } });
  if (!F.nvq && F.timePct != null && F.timePct >= 60 && !(F.mock && F.mock.best >= 70)) out.push({ title: "Score 70% on a full EPA mock", how: "Take a full mock end-point test in Evia" + (F.mock ? " (best so far " + F.mock.best + "%)" : "") + ".", due, support: "", measure: { kind: "epa", target: 70, baseline: 0 } });
  const edi = F.snap.edi, eTotal = edi ? (edi.total || (Array.isArray(edi.areas) ? edi.areas.length : 0)) : 0, eDone = edi ? (edi.done ?? edi.areasDone ?? 0) : 0;
  if (edi && edi.total && eDone < eTotal) out.push({ title: "Finish the EDI and safeguarding lessons", how: "The short Teach me lessons on staying safe, Prevent, British values and equality.", due, support: "", measure: { kind: "lessons", target: edi.total, baseline: 0, param: "edi" } });
  return out.slice(0, 5);
}

/* Outcome of a target Evia tracked. */
export const outcomeOf = (t) => t.met || t.pct >= 100 ? "Met" : t.pct >= 40 ? "Partly met" : t.pct != null ? "Not met" : "";
/* The learner's check-in in Evia (reviews.js "How things are"), turned into the review's answers. */
const EDI_TOPICS = [[/equality|diversity/i, "Equality and diversity"], [/prevent|safeguard/i, "Prevent"], [/british values/i, "British values"], [/wellbeing|rights/i, "Mental health and wellbeing"]];
function fromCheckIn(F) {
  const c = F.checkIn || {}, o = {};
  if (c.feelsSafe) o.feelsSafe = c.feelsSafe === "Yes" ? "Yes" : "Discussed";
  if (c.feelsSafe && c.feelsSafe !== "Yes") o.safeguardingComment = "In Evia before the review they answered “" + c.feelsSafe + "” to feeling safe. ";
  if (c.knowsReporting) o.knowsReporting = c.knowsReporting === "Yes" ? "Yes" : "No, explained today";
  if (c.changes) { o.changes = c.changes === "Yes" ? "Yes" : "None"; if (c.changesDetail) o.changesDetail = c.changesDetail; }
  if (c.hsIncident) { o.hsStatus = c.hsIncident === "Yes" ? "Something to record" : "No incidents or concerns"; if (c.hsDetail) o.healthSafety = c.hsDetail; }
  const edi = F.snap.edi, areas = edi && Array.isArray(edi.areas) ? edi.areas.filter((a) => a && typeof a === "object" && a.complete).map((a) => a.name) : [];
  const topics = [...new Set(areas.flatMap((n) => EDI_TOPICS.filter(([re]) => re.test(n)).map(([, t]) => t)))];
  if (topics.length) o.topicDiscussed = topics.join(", ");
  return o;
}
function epaSuggest(F) {
  if (F.nvq || F.timePct == null) return "";
  if (F.timePct < 50) return "Too early";
  if (F.ksb.pct >= 90 && F.mock && F.mock.best >= 70 && F.timePct >= 80) return "Ready for gateway";
  return F.ksb.pct >= F.timePct - 15 ? "On track" : "Concerns";
}

/* ---------- The review form ---------- */
const DRAFT = (e) => "milos-draft-" + e;
const blank = (F, me, L) => ({
  date: isoDay(Date.now()), method: "In person", attendees: { apprentice: true, employer: true, assessor: true, tutor: false },
  employerName: F.employerContact, employerRole: "", assessorName: me.name || "",
  previous: F.previousTargets.map((t) => ({ ...t, outcome: outcomeOf(t), comment: t.text ? "Evia: " + t.text : "" })),
  progressRag: (suggestRag(F) || {}).rag || "", progressComment: [progressText(L, F), otjText(F)].filter(Boolean).join(" "), employerComment: "",
  otjConfirmed: false, otjComment: "",
  mathsStatus: F.maths.on ? "Working towards" : "Achieved or exempt", englishStatus: F.english.on ? "Working towards" : "Achieved or exempt", fsComment: fsText(F),
  knowledgeComment: "",
  feelsSafe: "", knowsReporting: "", hsStatus: "", healthSafety: "", topicDiscussed: "", safeguardingComment: "",
  supportNeeds: F.reflection.support, supportInPlace: F.reflection.support ? "Needed: arranging" : F.checkInAt ? "Not needed" : "",
  changes: "None", changesDetail: "",
  apprenticeComment: F.reflection.feedback, iagGiven: F.reflection.nextSteps ? "Yes" : "", nextSteps: F.reflection.nextSteps,
  epaReady: epaSuggest(F), predictedGrade: "", epaComment: "",
  targets: suggestTargets(F),
  ...fromCheckIn(F),
  overallRag: (suggestRag(F) || {}).rag || "", nextReview: isoDay(Date.now() + RULES.intervalWeeks * 7 * DAY), summary: "",
  signatures: {},
});

/* Four screens. Everything the funding rules and Ofsted look for is still here, mostly as ticks and choices; a note
   box only opens when an answer needs one (someone doesn't feel safe, a change in circumstances, support needed). */
const STEPS = [["progress", "Progress"], ["wellbeing", "Wellbeing, safety and support"], ["next", "Next steps"], ["sign", "Overall and signatures"]];
const TOPICS = ["Prevent", "British values", "Equality and diversity", "Online safety", "Mental health and wellbeing", "Health and safety"];
export function openReview(L, me, onDone) {
  const F = facts(L);
  let R; try { R = JSON.parse(localStorage.getItem(DRAFT(L.row.enrolment_id)) || "null"); } catch { R = null; }
  if (!R || R.v !== 2) R = { v: 2, ...blank(F, me, L) };
  /* Written from Evia; a draft left empty is filled in too. The summary follows the targets, so it's written last. */
  if (!String(R.progressComment || "").trim()) R.progressComment = [progressText(L, F), otjText(F)].filter(Boolean).join(" ");
  if (!String(R.fsComment || "").trim()) R.fsComment = fsText(F);
  /* Previous targets always come fresh from Evia, keeping any the assessor has already marked. */
  { const had = Object.fromEntries((R.previous || []).filter((t) => t.outcome && t.picked).map((t) => [t.title, t]));
    R.previous = F.previousTargets.map((t) => had[t.title] ? { ...t, outcome: had[t.title].outcome, comment: had[t.title].comment, picked: true } : { ...t, outcome: outcomeOf(t), comment: t.text ? "Evia: " + t.text : "" }); }
  if (!String(R.summary || "").trim()) R.summary = summaryText(L, F, R);
  const rag = suggestRag(F);
  const redo = { progressComment: () => [progressText(L, F), otjText(F)].filter(Boolean).join(" "), fsComment: () => fsText(F), summary: () => summaryText(L, F, R) };
  let step = 0;
  const save = () => { try { localStorage.setItem(DRAFT(L.row.enrolment_id), JSON.stringify(R)); } catch { /* storage full */ } };
  const root = document.createElement("div"); root.className = "rv"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
  document.body.appendChild(root); document.body.style.overflow = "hidden";
  const close = () => { save(); root.remove(); document.body.style.overflow = ""; };

  const fact = (label, value, note) => '<div class="fact"><span>' + esc(label) + '</span><b>' + esc(value ?? "—") + '</b>' + (note ? '<small>' + esc(note) + '</small>' : "") + '</div>';
  const fromEvia = (html) => '<section class="from"><p class="label">From Evia' + (F.hasEvia ? "" : " (not connected yet)") + '</p><div class="facts">' + html + '</div></section>';
  const choice = (name, opts, val) => '<div class="checks" role="radiogroup">' + opts.map((o) => '<label class="check"><input type="radio" name="' + name + '" value="' + esc(o) + '"' + (val === o ? " checked" : "") + '> ' + esc(o) + '</label>').join("") + '</div>';
  const area = (name, label, val, ph) => '<label class="field">' + esc(label) + '<textarea name="' + name + '" placeholder="' + esc(ph || "") + '">' + esc(val || "") + '</textarea></label>';
  /* A written part: drafted from Evia, edited by the assessor, and rewritten from Evia if they want to start again. */
  const drafted = (name, label, val) => '<div class="field drafted"><div class="between"><span>' + esc(label) + '</span><button class="btn ghost small-btn" type="button" data-redo="' + name + '">Rewrite from Evia</button></div>' +
    '<textarea name="' + name + '" rows="' + Math.min(14, Math.max(4, Math.ceil(String(val || "").length / 70))) + '">' + esc(val || "") + '</textarea><small class="muted">Written from Evia and Nisia. Read it through and change anything.</small></div>';
  const hint = (r) => r ? '<small class="rag-hint">Evia suggests <b>' + esc(r.rag) + '</b>: ' + esc(r.why) + '.</small>' : "";
  const input = (name, label, val, type) => '<label class="field">' + esc(label) + '<input name="' + name + '" type="' + (type || "text") + '" value="' + esc(val || "") + '"></label>';
  const subj = (s) => s ? s.areasDone + " of " + s.areas.length + " areas done" + (s.avg != null ? ", average " + s.avg + "%" : "") : "Not started";

  /* A note that only shows while an answer needs it: data-when="name=value" (or name!=value). */
  const when = (cond, html) => '<div data-when="' + esc(cond) + '">' + html + '</div>';
  const ticks = (name, opts, vals) => '<div class="checks">' + opts.map((o) => '<label class="check"><input type="checkbox" name="' + name + '" value="' + esc(o) + '"' + (vals.includes(o) ? " checked" : "") + '> ' + esc(o) + '</label>').join("") + '</div>';

  function body(id) {
    switch (id) {
      case "progress": return '<details class="card flat about"' + (R.date ? "" : " open") + '><summary><b>About this review</b> <span class="small muted">' + esc(ukDate(R.date)) + ' · ' + esc(R.method) + ' · review ' + F.reviewNo + ' (' + esc(ukDate(F.periodStart)) + ' to ' + esc(ukDate(F.periodEnd)) + ')</span></summary>' +
          '<div class="grid2">' + input("date", "Date", R.date, "date") + '<div class="field">How<select name="method">' + ["In person", "Online", "At the workplace"].map((o) => '<option' + (R.method === o ? " selected" : "") + '>' + o + '</option>').join("") + '</select></div>' + input("employerName", "Employer’s name", R.employerName) + input("employerRole", "Their role", R.employerRole) + '</div>' +
          '<div class="field">Who took part (apprentice and employer must)<div class="checks">' + [["apprentice", "Apprentice"], ["employer", "Employer"], ["assessor", "Assessor"], ["tutor", "Tutor"]].map(([k, t]) => '<label class="check"><input type="checkbox" name="att_' + k + '"' + (R.attendees[k] ? " checked" : "") + '> ' + t + '</label>').join("") + '</div></div></details>' +
        fromEvia(fact("Time through", F.timePct != null ? F.timePct + "%" : "—") + fact(F.nvq ? "Criteria signed off" : "KSBs signed off", F.ksb.met + " of " + F.ksb.total + " (" + F.ksb.pct + "%)", F.timePct != null ? (F.ksb.pct >= F.timePct - 10 ? "On track for time" : "Behind for time") : "") +
          fact("Evidence this period", F.evidencePeriod, F.evidenceTotal + " in total") + fact("Off-the-job hours", F.otj.total + " h", F.otj.expected != null ? F.otj.expected + " h expected by now" : "") +
          (F.maths.on ? fact("Maths", F.maths.test ? "Best " + F.maths.test.best + "%" : subj(F.maths.teach)) : "") + (F.english.on ? fact("English", F.english.test ? "Best " + F.english.test.best + "%" : subj(F.english.teach)) : "") +
          fact(F.nvq ? "Knowledge tests" : "Mock tests", F.mock ? "Best " + F.mock.best + "%" : "None yet") + fact("Last active", F.lastActive ? ukDate(F.lastActive) : "—")) +
        (F.missingUnits.length ? '<details class="card flat"><summary><b>Still to evidence</b> (' + F.missingUnits.length + ' units)</summary><ul class="small">' + F.missingUnits.map((u) => '<li>' + esc(u.name) + ': ' + u.missing + ' of ' + u.total + ' still to do</li>').join("") + '</ul></details>' : "") +
        (R.previous.length ? '<div class="field">Previous targets' + (R.previous.some((t) => t.source === "evia-tracked") ? ' <small class="muted">marked from Evia’s tracking; change any</small>' : "") + R.previous.map((t, i) => '<div class="prev"><span>' + esc(t.title) + (t.text || t.pct != null ? '<small class="evia-note">Evia: ' + esc(t.met ? "done" : (t.pct != null ? t.pct + "% · " : "") + (t.text || "")) + '</small>' : "") + '</span>' + choice("prev_" + i, ["Met", "Partly met", "Not met"], t.outcome) + '</div>').join("") + '</div>' : "") +
        '<div class="field">Progress against the training plan' + choice("progressRag", ["On track", "Slightly behind", "At risk"], R.progressRag) + hint(rag) + '</div>' +
        '<label class="check wide-check"><input type="checkbox" name="otjConfirmed"' + (R.otjConfirmed ? " checked" : "") + '> The employer confirms off-the-job training is happening in paid working hours</label>' +
        when("otjConfirmed!=on", area("otjComment", "Why not, and what happens next", R.otjComment)) +
        (F.maths.on ? '<div class="field">Maths' + choice("mathsStatus", ["Working towards", "Booked to take", "Achieved or exempt"], R.mathsStatus) + '</div>' : "") +
        (F.english.on ? '<div class="field">English' + choice("englishStatus", ["Working towards", "Booked to take", "Achieved or exempt"], R.englishStatus) + '</div>' : "") +
        drafted("progressComment", "Progress this period", R.progressComment) +
        (F.maths.on || F.english.on ? drafted("fsComment", "Maths and English", R.fsComment) : "") +
        input("employerComment", "Employer’s view of their work (optional)", R.employerComment);
      case "wellbeing": return (F.checkInAt && Object.keys(F.checkIn).length ? fromEvia(fact("Feels safe", F.checkIn.feelsSafe || "Not answered") + fact("Knows who to tell", F.checkIn.knowsReporting || "Not answered") +
          fact("Changes at work", F.checkIn.changes || "Not answered", F.checkIn.changesDetail || "") + fact("Health and safety", F.checkIn.hsIncident === "Yes" ? "Something to record" : F.checkIn.hsIncident || "Not answered", F.checkIn.hsDetail || "") +
          fact("Training in paid hours", F.checkIn.otjHappening || "Not answered") + fact("Support needed", F.reflection.support || "None mentioned")) + '<p class="small muted">Their answers in Evia before the review fill in this page. Confirm each with them.</p>' : "") + '<div class="field">Do they feel safe at work and at college?' + choice("feelsSafe", ["Yes", "No, action taken", "Discussed"], R.feelsSafe) + '</div>' +
        when("feelsSafe!=Yes", area("safeguardingComment", "What was said, and what was done (a referral goes to the safeguarding lead today)", R.safeguardingComment)) +
        '<div class="field">Do they know how to raise a concern, and who the safeguarding lead is?' + choice("knowsReporting", ["Yes", "No, explained today"], R.knowsReporting) + '</div>' +
        '<div class="field">Discussed today (Prevent, British values, EDI)' + ticks("topics", TOPICS, String(R.topicDiscussed || "").split(", ").filter(Boolean)) + '</div>' +
        '<div class="field">Health and safety at work' + choice("hsStatus", ["No incidents or concerns", "Something to record"], R.hsStatus) + '</div>' +
        when("hsStatus=Something to record", area("healthSafety", "What happened, and what was done", R.healthSafety)) +
        '<div class="field">Learning support' + choice("supportInPlace", ["Not needed", "In place and working", "Needed: arranging", "Needs reviewing"], R.supportInPlace) + '</div>' +
        when("supportInPlace!=Not needed", area("supportNeeds", "What support, and who’s arranging it", R.supportNeeds, F.reflection.support ? "In Evia they said: " + F.reflection.support : "")) +
        '<div class="field">Any change to job, employer, hours or contract, or a need for a break in learning?' + choice("changes", ["None", "Yes"], R.changes) + '</div>' +
        when("changes=Yes", area("changesDetail", "What’s changed (tell the college straight away)", R.changesDetail));
      case "next": return fromEvia(fact("How it’s going", F.reflection.feedback || "Nothing added") + fact("Future plans", F.reflection.nextSteps || "Nothing added")) +
        area("apprenticeComment", "Apprentice’s comments", R.apprenticeComment, "In their own words") +
        '<div class="field">Careers advice and next steps discussed?' + choice("iagGiven", ["Yes", "Not this time"], R.iagGiven) + '</div>' +
        when("iagGiven=Yes", input("nextSteps", "What was discussed", R.nextSteps)) +
        '<div class="grid2"><div class="field">End-point assessment' + choice("epaReady", ["Too early", "On track", "Ready for gateway", "Concerns"], R.epaReady) + '</div>' +
        '<div class="field">Predicted grade (optional)' + choice("predictedGrade", ["Too early", "Pass", "Merit", "Distinction"], R.predictedGrade) + '</div></div>' +
        '<h3>New SMART targets</h3><p class="small muted">Suggested from Evia; change anything. After the review they appear in the learner’s Evia, which tracks them, and the next review marks them met or not.</p>' +
        R.targets.map((t, i) => '<div class="card flat target"><div class="between"><b>Target ' + (i + 1) + (t.measure ? ' <span class="pill accent small-pill">Evia tracks this</span>' : "") + '</b><button class="btn ghost" type="button" data-del="' + i + '">Remove</button></div>' +
          '<label class="field">What<input name="t_title_' + i + '" value="' + esc(t.title) + '"></label><label class="field">How it will be done and measured<input name="t_how_' + i + '" value="' + esc(t.how) + '"></label>' +
          '<div class="grid2"><label class="field">By<input type="date" name="t_due_' + i + '" value="' + esc(t.due) + '"></label><label class="field">Support from<input name="t_support_' + i + '" value="' + esc(t.support) + '"></label></div></div>').join("") +
        '<button class="btn wide" type="button" id="addT">+ Add a target</button>' + input("nextReview", "Next review (within " + RULES.intervalWeeks + " weeks)", R.nextReview, "date");
      case "sign": return '<div class="field">Overall progress' + choice("overallRag", ["On track", "Slightly behind", "At risk"], R.overallRag) + hint(rag) + '</div>' + drafted("summary", "Summary", R.summary) +
        '<p class="note">Signing confirms this is an accurate record of the review. Each person signs on this screen.</p>' +
        [["apprentice", "Apprentice", F.learner], ["employer", "Employer", R.employerName || "Employer"], ["assessor", "Assessor", R.assessorName]].map(([k, t, n]) =>
          '<div class="card flat sig"><div class="between"><b>' + esc(t) + '</b><span class="small muted">' + esc(n) + '</span></div><canvas data-sig="' + k + '" width="900" height="260" aria-label="' + esc(t) + ' signature"></canvas><button class="btn ghost" type="button" data-clear="' + k + '">Clear</button></div>').join("") +
        '<p class="err" id="signErr"></p>';
    }
    return "";
  }
  function read() {
    const f = root.querySelector("form"); if (!f) return;
    const v = (n) => { const el = f.elements[n]; if (!el) return undefined; if (el.length && el[0] && el[0].type === "radio") { const c = [...el].find((x) => x.checked); return c ? c.value : ""; } return el.type === "checkbox" ? el.checked : el.value; };
    for (const k of ["date", "method", "employerName", "employerRole", "progressRag", "progressComment", "fsComment", "employerComment", "otjComment", "mathsStatus", "englishStatus", "feelsSafe", "knowsReporting", "hsStatus", "healthSafety", "safeguardingComment", "supportNeeds", "supportInPlace", "changes", "changesDetail", "apprenticeComment", "iagGiven", "nextSteps", "epaReady", "predictedGrade", "overallRag", "nextReview", "summary"]) { const x = v(k); if (x !== undefined) R[k] = x; }
    if (f.querySelector("[name=topics]")) R.topicDiscussed = [...f.querySelectorAll("[name=topics]:checked")].map((x) => x.value).join(", ");
    if (f.elements.otjConfirmed) R.otjConfirmed = f.elements.otjConfirmed.checked;
    ["apprentice", "employer", "assessor", "tutor"].forEach((k) => { if (f.elements["att_" + k]) R.attendees[k] = f.elements["att_" + k].checked; });
    R.previous.forEach((t, i) => { const o = v("prev_" + i); if (o !== undefined && o !== t.outcome) { t.outcome = o; t.picked = true; } });
    R.targets.forEach((t, i) => { ["title", "how", "due", "support"].forEach((k) => { const x = v("t_" + k + "_" + i); if (x !== undefined) t[k] = x; }); });
    save();
  }
  /* What must be filled in before moving on (the rules need these). */
  function missing(id) {
    const days = (d) => (Date.parse(d) - Date.parse(R.date)) / DAY;
    if (id === "progress") {
      if (!(R.attendees.apprentice && R.attendees.employer)) return "A progress review needs the apprentice and the employer. If the employer couldn’t take part, rearrange it.";
      if (R.previous.some((t) => !t.outcome)) return "Say whether each previous target was met.";
      if (!R.progressRag) return "Choose how they’re doing against the plan.";
      if (!R.otjConfirmed && !String(R.otjComment || "").trim()) return "Confirm off-the-job training, or say why not.";
      if (!String(R.progressComment || "").trim()) return "Add a few words on what they’ve learnt and achieved.";
    }
    if (id === "wellbeing") {
      if (!R.feelsSafe || !R.knowsReporting) return "Ask both safeguarding questions.";
      if (!R.topicDiscussed) return "Tick at least one topic discussed (Prevent, British values or EDI).";
      if (!R.hsStatus || !R.supportInPlace || !R.changes) return "Answer health and safety, learning support and changes.";
      if (R.changes === "Yes" && !String(R.changesDetail || "").trim()) return "Say what’s changed.";
    }
    if (id === "next") {
      if (!R.iagGiven || !R.epaReady) return "Answer careers advice and end-point assessment.";
      if (!R.targets.filter((t) => t.title.trim()).length) return "Set at least one target.";
      if (!R.nextReview || days(R.nextReview) < 1 || days(R.nextReview) > RULES.intervalWeeks * 7) return "Set the next review within " + RULES.intervalWeeks + " weeks.";
    }
    if (id === "sign" && !R.overallRag) return "Choose the overall progress.";
    return "";
  }
  /* Show or hide the notes that depend on an answer. */
  function toggle() {
    const f = root.querySelector("form"); if (!f) return;
    f.querySelectorAll("[data-when]").forEach((el) => {
      const [, name, not, val] = /^([^!=]+)(!?)=(.*)$/.exec(el.dataset.when), inp = f.elements[name];
      let cur = ""; if (inp) { if (inp.length && inp[0] && inp[0].type === "radio") { const c = [...inp].find((x) => x.checked); cur = c ? c.value : ""; } else cur = inp.type === "checkbox" ? (inp.checked ? "on" : "") : inp.value; }
      el.hidden = not ? cur === val || !cur && name !== "otjConfirmed" : cur !== val;
    });
  }
  function draw() {
    const [id, title] = STEPS[step];
    root.innerHTML = '<header class="rv-top"><button class="x" aria-label="Close and keep the draft">×</button><div class="rv-prog" aria-hidden="true"><i style="width:' + Math.round((step + 1) / STEPS.length * 100) + '%"></i></div><span class="small muted">' + (step + 1) + '/' + STEPS.length + '</span></header>' +
      '<form class="rv-body" novalidate><div class="rv-steps" aria-hidden="true">' + ["Progress", "Wellbeing", "Next steps", "Sign"].map((t, i) => '<span class="' + (i < step ? "done" : i === step ? "on" : "") + '">' + (i < step ? "✓ " : "") + t + '</span>').join("") + '</div>' +
      '<p class="label">Progress review ' + F.reviewNo + ' · ' + esc(F.learner) + '</p><h2>' + esc(title) + '</h2>' + body(id) + '<p class="err" id="stepErr"></p></form>' +
      '<footer class="rv-foot">' + (step ? '<button class="btn" type="button" id="back">Back</button>' : "") + '<button class="btn primary" type="button" id="next">' + (id === "sign" ? "Complete review" : "Next") + '</button></footer>';
    root.querySelector(".x").onclick = () => { read(); close(); };
    const b = root.querySelector("#back"); if (b) b.onclick = () => { read(); step--; draw(); };
    root.querySelector("#next").onclick = () => { read(); const m = missing(id); if (m) { root.querySelector("#stepErr").textContent = m; return; } if (id === "sign") return complete(); step++; draw(); };
    root.querySelectorAll("[data-del]").forEach((x) => x.onclick = () => { read(); R.targets.splice(+x.dataset.del, 1); draw(); });
    root.querySelectorAll("[data-redo]").forEach((x) => x.onclick = () => {
      read(); const k = x.dataset.redo, fresh = redo[k]();
      if (String(R[k] || "").trim() && R[k] !== fresh && !confirm("Replace what’s written with a fresh draft from Evia?")) return;
      R[k] = fresh; save(); draw();
    });
    const add = root.querySelector("#addT"); if (add) add.onclick = () => { read(); R.targets.push({ title: "", how: "", due: isoDay(Date.now() + 42 * DAY), support: "" }); draw(); };
    root.querySelectorAll("canvas[data-sig]").forEach(pad);
    root.querySelectorAll("[data-clear]").forEach((x) => x.onclick = () => { delete R.signatures[x.dataset.clear]; const c = root.querySelector('canvas[data-sig="' + x.dataset.clear + '"]'); c.getContext("2d").clearRect(0, 0, c.width, c.height); save(); });
    root.querySelector(".rv-body").addEventListener("change", toggle); toggle();
    root.querySelector(".rv-body").scrollTop = 0;
  }
  function pad(c) {
    const k = c.dataset.sig, g = c.getContext("2d"); g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#172033";
    if (R.signatures[k]) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0); im.src = R.signatures[k].image; }
    let down = false, drew = false;
    const pos = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
    c.onpointerdown = (e) => { down = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); g.beginPath(); g.moveTo(x, y); };
    c.onpointermove = (e) => { if (!down) return; const [x, y] = pos(e); g.lineTo(x, y); g.stroke(); drew = true; };
    c.onpointerup = () => { down = false; if (drew) { R.signatures[k] = { image: c.toDataURL("image/png"), at: new Date().toISOString() }; save(); } };
  }

  async function complete() {
    const need = ["apprentice", "employer", "assessor"].filter((k) => !R.signatures[k]);
    if (need.length) { root.querySelector("#signErr").textContent = "Still to sign: " + need.join(", ") + "."; return; }
    const btn = root.querySelector("#next"); btn.disabled = true; btn.textContent = "Saving…";
    try {
      const content = { v: 1, rules: RULES.id, facts: F, answers: { ...R, signatures: undefined },
        signatures: Object.fromEntries(Object.entries(R.signatures).map(([k, s]) => [k, { name: k === "apprentice" ? F.learner : k === "employer" ? (R.employerName + (R.employerRole ? ", " + R.employerRole : "")) : R.assessorName, at: s.at, image: s.image }])),
        targets: R.targets.filter((t) => t.title.trim()), completedAt: new Date().toISOString() };
      content.hash = await hash({ ...content, signatures: Object.fromEntries(Object.entries(content.signatures).map(([k, s]) => [k, { name: s.name, at: s.at }])) });
      const en = L.enrolment;
      /* Saved on this phone, then sent to Nisia now or once there's signal (store.js). */
      const sent = await saveReview({ enrolmentId: en.id,
        review: { organisation_id: en.organisation_id, enrolment_id: en.id, course_id: en.course_id, created_by_member_id: me.member_id, review_type: "progress", content, reviewed_at: new Date(R.date + "T12:00:00").toISOString() },
        signoff: { organisation_id: en.organisation_id, member_id: me.member_id, signer_role: ["assessor", "tutor", "admin"].find((x) => (me.roles || []).includes(x)) || "assessor" },
        targets: content.targets.map((t) => ({ organisation_id: en.organisation_id, enrolment_id: en.id, course_id: en.course_id, created_by_member_id: me.member_id, title: t.title, description: [t.how, t.support ? "Support: " + t.support : ""].filter(Boolean).join("\n"), due_date: t.due || null, status: "open", measure: t.measure || null })) });
      localStorage.removeItem(DRAFT(L.row.enrolment_id));
      close(); onDone && onDone(sent);
    } catch (e) { btn.disabled = false; btn.textContent = "Complete review"; root.querySelector("#signErr").textContent = e.message; }
  }
  draw();
}

async function hash(o) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(o)));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- The PDF (staff copy, with signatures) ---------- */
export const downloadPdf = (c) => reviewPdf(c, { signatures: true });

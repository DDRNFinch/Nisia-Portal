/* Milos progress review: a three-way review (apprentice, employer, assessor) at least every 12 weeks, covering what
   the apprenticeship funding rules and Ofsted look for, with everything Evia knows filled in first:
   progress against the training plan and KSBs, off-the-job training, English and maths, knowledge and practice,
   safeguarding, Prevent, British values and EDI, support needs, changes in circumstances, the apprentice's and
   employer's comments, EPA readiness, new SMART targets, and three signatures. Facts from Evia can't be edited (so
   the record matches the data); people write the rest. Saved once, when signed, with a hash of its content; a draft
   is kept on this device until then. */
import { db, esc, ukDate } from "../../packages/core/nisia.js";
import { COURSE_DATA } from "./courses.js";

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
  const en = L.enrolment, row = L.row, snap = L.snapshot || {}, course = COURSE_DATA[row.course_code] || { name: row.course_code, ksbs: [], units: [] };
  const start = Date.parse(en.start_date), end = Date.parse(en.end_date);
  const last = L.reviews.length ? L.reviews[L.reviews.length - 1] : null;
  const periodStart = last ? Date.parse(last.reviewed_at) : start;
  const timePct = end > start ? Math.round(clamp((now - start) / (end - start), 0, 1) * 100) : null;
  const planned = en.planned_otj_hours != null ? Number(en.planned_otj_hours) : null;
  const otjTotal = round1(L.otj.reduce((n, x) => n + Number(x.hours || 0), 0));
  const otjPeriod = round1(L.otj.filter((x) => Date.parse(x.activity_date) >= periodStart - DAY).reduce((n, x) => n + Number(x.hours || 0), 0));
  const otjExpected = planned != null && timePct != null ? Math.round(planned * timePct / 100) : null;
  const ksb = snap.ksb || { met: 0, total: course.ksbs.length, pct: 0 };
  const missingUnits = (snap.units || []).filter((u) => (u.missing || []).length).map((u) => ({ name: u.name, missing: u.missing.length, total: u.total, started: u.started }));
  const subject = (id) => ((snap.teach && snap.teach.subjects) || []).find((s) => s.id === id) || null;
  const test = (type) => (snap.tests || []).find((t) => t.type === type) || null;
  const eviaReview = L.eviaReviews.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0] || null;
  const reflection = (eviaReview && eviaReview.reflection) || {};
  const prevMilos = last && last.content && Array.isArray(last.content.targets) ? last.content.targets.map((t) => ({ source: "review", title: t.title, due: t.due })) : [];
  const prevEvia = L.eviaTargets.filter((t) => !t.metAt && (t.course === row.course_code || !t.course)).map((t) => ({ source: "evia", title: t.title, due: t.due ? isoDay(t.due) : "", met: false }))
    .concat(L.eviaTargets.filter((t) => t.metAt && Date.parse(t.metAt) >= periodStart).map((t) => ({ source: "evia", title: t.title, due: t.due ? isoDay(t.due) : "", met: true })));
  return {
    learner: row.name, course: course.name + (course.std ? " (" + course.std + ")" : ""), courseCode: row.course_code, nvq: !!course.nvq,
    employer: en.employer_name || "", employerContact: en.employer_contact_name || "", start: en.start_date, end: en.end_date, status: en.status,
    reviewNo: L.reviews.length + 1, periodStart: isoDay(periodStart), periodEnd: isoDay(now), lastReview: last ? isoDay(last.reviewed_at) : null,
    timePct, ksb: { met: ksb.met || 0, total: ksb.total || course.ksbs.length, pct: ksb.pct || 0 }, missingUnits,
    evidenceTotal: L.evidence.length, evidencePeriod: L.evidence.filter((x) => Date.parse(x.created_at) >= periodStart).length,
    writeupCoverage: snap.writeupCoverage ?? null, lastActive: snap.lastUpload || (L.evidence[0] && L.evidence[0].created_at) || null,
    otj: { planned, expected: otjExpected, total: otjTotal, period: otjPeriod, onTrack: otjExpected == null ? null : otjTotal >= otjExpected * 0.9 },
    maths: { on: !!snap.maths, teach: subject("maths"), test: test("maths") }, english: { on: !!snap.english, teach: subject("english"), test: test("english") },
    teachCourse: subject("course"), edi: subject("edi"), medals: snap.teach ? snap.teach.medals : null,
    mock: test("epa"), confidence: snap.confidence || null,
    reflection: { feedback: reflection.learnerFeedback || "", support: reflection.support || "", nextSteps: reflection.nextSteps || "", at: eviaReview ? eviaReview.date : null },
    previousTargets: prevMilos.concat(prevEvia), hasEvia: !!L.snapshot,
  };
}

/* Targets Evia's data suggests: the unit with most still to evidence, off-the-job hours, maths and English, practice. */
export function suggestTargets(F) {
  const due = isoDay(Date.now() + 6 * 7 * DAY), out = [];
  const gap = F.missingUnits.slice().sort((a, b) => b.missing - a.missing)[0];
  if (gap) out.push({ title: "Evidence for " + gap.name, how: "Photos and a write-up of a job covering the " + gap.missing + " " + (F.nvq ? "criteria" : "KSBs") + " still missing. Use Evia’s guided mode.", due, support: "Employer to give the chance to do this work" });
  if (F.otj.onTrack === false) out.push({ title: "Catch up on off-the-job training", how: "Log at least " + Math.max(6, Math.ceil((F.otj.expected - F.otj.total) / 6)) + " hours a week in Evia until back on plan (" + F.otj.expected + " h expected by now, " + F.otj.total + " h logged).", due, support: "Employer to protect training time in working hours" });
  if (F.maths.on && !(F.maths.teach && F.maths.teach.areasDone === F.maths.teach.areas.length)) out.push({ title: "Maths practice", how: "Finish the next two maths areas in Teach me and take a maths test.", due, support: "" });
  if (F.english.on && !(F.english.teach && F.english.teach.areasDone === F.english.teach.areas.length)) out.push({ title: "English practice", how: "Finish the next two English areas in Teach me and take an English test.", due, support: "" });
  const low = F.confidence && F.confidence.practise && F.confidence.practise[0];
  if (low) out.push({ title: "Build confidence: " + low, how: "Practise " + low + " at work with support, then re-rate it in Evia.", due, support: "Supervisor to demonstrate and observe" });
  return out.slice(0, 4);
}

/* ---------- The review form ---------- */
const DRAFT = (e) => "milos-draft-" + e;
const blank = (F, me) => ({
  date: isoDay(Date.now()), method: "In person", attendees: { apprentice: true, employer: true, assessor: true, tutor: false },
  employerName: F.employerContact, employerRole: "", assessorName: me.name || "",
  previous: F.previousTargets.map((t) => ({ ...t, outcome: t.met ? "Met" : "", comment: "" })),
  progressRag: "", progressComment: "", employerComment: "",
  otjConfirmed: false, otjComment: "",
  mathsStatus: F.maths.on ? "Working towards" : "Achieved or exempt", englishStatus: F.english.on ? "Working towards" : "Achieved or exempt", fsComment: "",
  knowledgeComment: "",
  feelsSafe: "", knowsReporting: "", healthSafety: "", topicDiscussed: "", safeguardingComment: "",
  supportNeeds: F.reflection.support, supportInPlace: "",
  changes: "None", changesDetail: "",
  apprenticeComment: F.reflection.feedback, nextSteps: F.reflection.nextSteps, iag: "",
  epaReady: "", predictedGrade: "", epaComment: "",
  targets: suggestTargets(F),
  overallRag: "", nextReview: isoDay(Date.now() + RULES.intervalWeeks * 7 * DAY), summary: "",
  signatures: {},
});

const STEPS = [
  ["about", "About this review"], ["previous", "Previous targets"], ["progress", "Progress against the plan"], ["otj", "Off-the-job training"],
  ["fs", "English and maths"], ["knowledge", "Knowledge and practice"], ["safe", "Safeguarding, Prevent, British values and EDI"],
  ["support", "Support needs"], ["changes", "Changes in circumstances"], ["voices", "Apprentice and employer"], ["epa", "End-point assessment"],
  ["targets", "New SMART targets"], ["overall", "Overall"], ["sign", "Sign the review"],
];

export function openReview(L, me, onDone) {
  const F = facts(L);
  let R; try { R = JSON.parse(localStorage.getItem(DRAFT(L.row.enrolment_id)) || "null"); } catch { R = null; }
  if (!R || R.v !== 1) R = { v: 1, ...blank(F, me) };
  let step = 0;
  const save = () => { try { localStorage.setItem(DRAFT(L.row.enrolment_id), JSON.stringify(R)); } catch { /* storage full */ } };
  const root = document.createElement("div"); root.className = "rv"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
  document.body.appendChild(root); document.body.style.overflow = "hidden";
  const close = () => { save(); root.remove(); document.body.style.overflow = ""; };

  const fact = (label, value, note) => '<div class="fact"><span>' + esc(label) + '</span><b>' + esc(value ?? "—") + '</b>' + (note ? '<small>' + esc(note) + '</small>' : "") + '</div>';
  const fromEvia = (html) => '<section class="from"><p class="label">From Evia' + (F.hasEvia ? "" : " (not connected yet)") + '</p><div class="facts">' + html + '</div></section>';
  const choice = (name, opts, val) => '<div class="checks" role="radiogroup">' + opts.map((o) => '<label class="check"><input type="radio" name="' + name + '" value="' + esc(o) + '"' + (val === o ? " checked" : "") + '> ' + esc(o) + '</label>').join("") + '</div>';
  const area = (name, label, val, ph) => '<label class="field">' + esc(label) + '<textarea name="' + name + '" placeholder="' + esc(ph || "") + '">' + esc(val || "") + '</textarea></label>';
  const input = (name, label, val, type) => '<label class="field">' + esc(label) + '<input name="' + name + '" type="' + (type || "text") + '" value="' + esc(val || "") + '"></label>';
  const subj = (s) => s ? s.areasDone + " of " + s.areas.length + " areas done" + (s.avg != null ? ", average " + s.avg + "%" : "") : "Not started";

  function body(id) {
    switch (id) {
      case "about": return fromEvia(fact("Apprentice", F.learner) + fact("Course", F.course) + fact("Employer", F.employer) + fact("Programme", ukDate(F.start) + " to " + ukDate(F.end)) + fact("Review", "Number " + F.reviewNo) + fact("Period", ukDate(F.periodStart) + " to " + ukDate(F.periodEnd))) +
        input("date", "Date of review", R.date, "date") + '<div class="field">How it was held' + choice("method", ["In person", "Online", "At the workplace"], R.method) + '</div>' +
        '<div class="field">Who took part (a progress review is three-way)<div class="checks">' + [["apprentice", "Apprentice"], ["employer", "Employer"], ["assessor", "Assessor"], ["tutor", "Tutor"]].map(([k, t]) => '<label class="check"><input type="checkbox" name="att_' + k + '"' + (R.attendees[k] ? " checked" : "") + '> ' + t + '</label>').join("") + '</div></div>' +
        '<div class="grid2">' + input("employerName", "Employer’s name", R.employerName) + input("employerRole", "Their role", R.employerRole) + '</div>';
      case "previous": return (R.previous.length ? R.previous.map((t, i) => '<div class="card flat"><b>' + esc(t.title) + '</b><p class="small muted">' + (t.source === "evia" ? "Set in Evia" : "Set at the last review") + (t.due ? " · due " + esc(ukDate(t.due)) : "") + '</p>' + choice("prev_" + i, ["Met", "Partly met", "Not met"], t.outcome) + '<label class="field">Comment<input name="prevc_' + i + '" value="' + esc(t.comment) + '"></label></div>').join("")
        : '<p class="note">No targets were set before this review.</p>');
      case "progress": return fromEvia(fact("Time through the programme", F.timePct != null ? F.timePct + "%" : "—") + fact(F.nvq ? "Criteria with evidence" : "KSBs with evidence", F.ksb.met + " of " + F.ksb.total + " (" + F.ksb.pct + "%)", F.timePct != null ? (F.ksb.pct >= F.timePct - 10 ? "On track for time" : "Behind for time") : "") +
        fact("Evidence this period", F.evidencePeriod, F.evidenceTotal + " in total") + fact("Write-ups cover", F.writeupCoverage != null ? F.writeupCoverage + "% of what to mention" : "—") + fact("Last active", F.lastActive ? ukDate(F.lastActive) : "—")) +
        (F.missingUnits.length ? '<details class="card flat"><summary><b>Still to evidence</b> (' + F.missingUnits.length + ' units)</summary><ul class="small">' + F.missingUnits.map((u) => '<li>' + esc(u.name) + ': ' + u.missing + ' of ' + u.total + ' still to do</li>').join("") + '</ul></details>' : "") +
        '<div class="field">Progress against the training plan' + choice("progressRag", ["On track", "Slightly behind", "At risk"], R.progressRag) + '</div>' +
        area("progressComment", "Assessor’s comments on progress (new skills, knowledge and behaviours this period)", R.progressComment, "What they’ve done well, what they’ve learnt, where they need to develop") +
        area("employerComment", "Employer’s comments on performance at work", R.employerComment, "How they’re doing at work, and the chances they’ve had to practise");
      case "otj": return fromEvia(fact("Planned in total", F.otj.planned != null ? F.otj.planned + " h" : "Not set in Nisia") + fact("Expected by now", F.otj.expected != null ? F.otj.expected + " h" : "—") + fact("Logged in total", F.otj.total + " h", F.otj.onTrack == null ? "" : F.otj.onTrack ? "On track" : "Behind") + fact("This period", F.otj.period + " h")) +
        '<label class="check"><input type="checkbox" name="otjConfirmed"' + (R.otjConfirmed ? " checked" : "") + '> The employer confirms off-the-job training is happening in paid working hours</label>' +
        area("otjComment", "Off-the-job training this period, and any barriers", R.otjComment, "e.g. college days, toolbox talks, shadowing; what’s getting in the way");
      case "fs": return fromEvia(fact("Maths in Teach me", F.maths.on ? subj(F.maths.teach) : "Not needed") + fact("Maths test", F.maths.test ? "Best " + F.maths.test.best + "%" : "None yet") + fact("English in Teach me", F.english.on ? subj(F.english.teach) : "Not needed") + fact("English test", F.english.test ? "Best " + F.english.test.best + "%" : "None yet")) +
        '<div class="field">Maths' + choice("mathsStatus", ["Achieved or exempt", "Working towards", "Booked to take"], R.mathsStatus) + '</div>' +
        '<div class="field">English' + choice("englishStatus", ["Achieved or exempt", "Working towards", "Booked to take"], R.englishStatus) + '</div>' + area("fsComment", "English and maths progress", R.fsComment);
      case "knowledge": return fromEvia(fact("Teach me: " + (F.teachCourse ? F.teachCourse.name : "course"), subj(F.teachCourse)) + fact("Medals", F.medals ? F.medals.gold + " gold, " + F.medals.silver + " silver, " + F.medals.bronze + " bronze" : "—") +
        fact(F.nvq ? "Knowledge tests" : "EPA mock tests", F.mock ? "Best " + F.mock.best + "% (" + F.mock.count + " taken)" : "None yet") + fact("Wants more practice in", F.confidence && F.confidence.practise && F.confidence.practise.length ? F.confidence.practise.slice(0, 4).join(", ") : "Nothing rated low")) +
        area("knowledgeComment", "Knowledge, skills and behaviours: what was discussed", R.knowledgeComment, "e.g. questions asked about the standard, and how they answered");
      case "safe": return fromEvia(fact("EDI and safeguarding lessons", subj(F.edi))) +
        '<div class="field">Does the apprentice feel safe at work and at college?' + choice("feelsSafe", ["Yes", "No, action taken", "Discussed"], R.feelsSafe) + '</div>' +
        '<div class="field">Do they know how to raise a concern, and who the safeguarding lead is?' + choice("knowsReporting", ["Yes", "No, explained today"], R.knowsReporting) + '</div>' +
        input("topicDiscussed", "Prevent, British values or EDI topic discussed", R.topicDiscussed) + area("healthSafety", "Health and safety at work (incidents, near misses, concerns)", R.healthSafety, "None, or what happened and what was done") +
        area("safeguardingComment", "Anything else (anything needing a referral goes to the safeguarding lead today, not in this form)", R.safeguardingComment);
      case "support": return fromEvia(fact("What the apprentice said in Evia", F.reflection.support || "Nothing added")) +
        area("supportNeeds", "Learning support needs (e.g. reading, writing, maths, dyslexia, a disability)", R.supportNeeds) +
        '<div class="field">Additional learning support' + choice("supportInPlace", ["Not needed", "In place and working", "Needed: arranging", "Needs reviewing"], R.supportInPlace) + '</div>';
      case "changes": return '<div class="field">Any change to job role, employer, hours, contract, or a need for a break in learning?' + choice("changes", ["None", "Yes"], R.changes) + '</div>' +
        area("changesDetail", "What’s changed, and what happens next (the college must be told straight away)", R.changesDetail);
      case "voices": return fromEvia(fact("How it’s going (Evia)", F.reflection.feedback || "Nothing added") + fact("Future plans (Evia)", F.reflection.nextSteps || "Nothing added")) +
        area("apprenticeComment", "Apprentice’s comments", R.apprenticeComment, "In their own words") + area("nextSteps", "Career plans and next steps", R.nextSteps) + area("iag", "Careers information and advice given", R.iag);
      case "epa": return fromEvia(fact("Time through the programme", F.timePct != null ? F.timePct + "%" : "—") + fact(F.nvq ? "Knowledge tests" : "Mock tests", F.mock ? "Best " + F.mock.best + "%" : "None yet") + fact("Evidence coverage", F.ksb.pct + "%")) +
        '<div class="field">Readiness for gateway' + choice("epaReady", ["Not yet (early in programme)", "On track", "Ready for gateway", "Concerns"], R.epaReady) + '</div>' +
        '<div class="field">Predicted grade' + choice("predictedGrade", ["Too early to say", "Pass", "Merit", "Distinction"], R.predictedGrade) + '</div>' + area("epaComment", "EPA preparation", R.epaComment);
      case "targets": return '<p class="small muted">Specific, measurable, achievable, relevant and time-bound. Suggested from Evia; change anything.</p>' +
        R.targets.map((t, i) => '<div class="card flat target"><div class="between"><b>Target ' + (i + 1) + '</b><button class="btn ghost" type="button" data-del="' + i + '">Remove</button></div>' +
          '<label class="field">What<input name="t_title_' + i + '" value="' + esc(t.title) + '"></label><label class="field">How it will be done and measured<textarea name="t_how_' + i + '">' + esc(t.how) + '</textarea></label>' +
          '<div class="grid2"><label class="field">By<input type="date" name="t_due_' + i + '" value="' + esc(t.due) + '"></label><label class="field">Support from<input name="t_support_' + i + '" value="' + esc(t.support) + '"></label></div></div>').join("") +
        '<button class="btn wide" type="button" id="addT">+ Add a target</button>';
      case "overall": return '<div class="field">Overall progress' + choice("overallRag", ["On track", "Slightly behind", "At risk"], R.overallRag) + '</div>' +
        input("nextReview", "Next review (within " + RULES.intervalWeeks + " weeks)", R.nextReview, "date") + area("summary", "Summary", R.summary);
      case "sign": return '<p class="note">Signing confirms this review is an accurate record of the discussion. Each person signs on this screen.</p>' +
        [["apprentice", "Apprentice", F.learner], ["employer", "Employer", R.employerName || "Employer"], ["assessor", "Assessor", R.assessorName]].map(([k, t, n]) =>
          '<div class="card flat sig"><div class="between"><b>' + esc(t) + '</b><span class="small muted">' + esc(n) + '</span></div><canvas data-sig="' + k + '" width="900" height="260" aria-label="' + esc(t) + ' signature"></canvas><button class="btn ghost" type="button" data-clear="' + k + '">Clear</button></div>').join("") +
        '<p class="err" id="signErr"></p>';
    }
    return "";
  }

  function read() {
    const f = root.querySelector("form"); if (!f) return;
    const v = (n) => { const el = f.elements[n]; if (!el) return undefined; if (el.length && el[0] && el[0].type === "radio") { const c = [...el].find((x) => x.checked); return c ? c.value : ""; } return el.type === "checkbox" ? el.checked : el.value; };
    for (const k of ["date", "method", "employerName", "employerRole", "progressRag", "progressComment", "employerComment", "otjComment", "mathsStatus", "englishStatus", "fsComment", "knowledgeComment", "feelsSafe", "knowsReporting", "healthSafety", "topicDiscussed", "safeguardingComment", "supportNeeds", "supportInPlace", "changes", "changesDetail", "apprenticeComment", "nextSteps", "iag", "epaReady", "predictedGrade", "epaComment", "overallRag", "nextReview", "summary"]) { const x = v(k); if (x !== undefined) R[k] = x; }
    if (f.elements.otjConfirmed) R.otjConfirmed = f.elements.otjConfirmed.checked;
    ["apprentice", "employer", "assessor", "tutor"].forEach((k) => { if (f.elements["att_" + k]) R.attendees[k] = f.elements["att_" + k].checked; });
    R.previous.forEach((t, i) => { const o = v("prev_" + i); if (o !== undefined) t.outcome = o; const c = v("prevc_" + i); if (c !== undefined) t.comment = c; });
    R.targets.forEach((t, i) => { ["title", "how", "due", "support"].forEach((k) => { const x = v("t_" + k + "_" + i); if (x !== undefined) t[k] = x; }); });
    save();
  }
  /* What must be filled in before moving on (the rules need these). */
  function missing(id) {
    if (id === "about" && !(R.attendees.apprentice && R.attendees.employer)) return "A progress review needs the apprentice and the employer. If the employer couldn’t attend, rearrange it.";
    if (id === "progress" && !R.progressRag) return "Choose how they’re doing against the plan.";
    if (id === "safe" && (!R.feelsSafe || !R.knowsReporting)) return "Ask both safeguarding questions.";
    if (id === "targets" && !R.targets.filter((t) => t.title.trim()).length) return "Set at least one target.";
    if (id === "overall" && !R.overallRag) return "Choose the overall progress.";
    return "";
  }

  function draw() {
    const [id, title] = STEPS[step];
    root.innerHTML = '<header class="rv-top"><button class="x" aria-label="Close and keep the draft">×</button><div class="rv-prog" aria-hidden="true"><i style="width:' + Math.round((step + 1) / STEPS.length * 100) + '%"></i></div><span class="small muted">' + (step + 1) + '/' + STEPS.length + '</span></header>' +
      '<form class="rv-body" novalidate><p class="label">Progress review ' + F.reviewNo + ' · ' + esc(F.learner) + '</p><h2>' + esc(title) + '</h2>' + body(id) + '<p class="err" id="stepErr"></p></form>' +
      '<footer class="rv-foot">' + (step ? '<button class="btn" type="button" id="back">Back</button>' : "") + '<button class="btn primary" type="button" id="next">' + (id === "sign" ? "Complete review" : "Next") + '</button></footer>';
    root.querySelector(".x").onclick = () => { read(); close(); };
    const b = root.querySelector("#back"); if (b) b.onclick = () => { read(); step--; draw(); };
    root.querySelector("#next").onclick = () => { read(); const m = missing(id); if (m) { root.querySelector("#stepErr").textContent = m; return; } if (id === "sign") return complete(); step++; draw(); };
    root.querySelectorAll("[data-del]").forEach((x) => x.onclick = () => { read(); R.targets.splice(+x.dataset.del, 1); draw(); });
    const add = root.querySelector("#addT"); if (add) add.onclick = () => { read(); R.targets.push({ title: "", how: "", due: isoDay(Date.now() + 42 * DAY), support: "" }); draw(); };
    root.querySelectorAll("canvas[data-sig]").forEach(pad);
    root.querySelectorAll("[data-clear]").forEach((x) => x.onclick = () => { delete R.signatures[x.dataset.clear]; const c = root.querySelector('canvas[data-sig="' + x.dataset.clear + '"]'); c.getContext("2d").clearRect(0, 0, c.width, c.height); save(); });
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
      const { data: rev, error } = await db.from("reviews").insert({ organisation_id: en.organisation_id, enrolment_id: en.id, course_id: en.course_id, created_by_member_id: me.member_id, review_type: "progress", content, reviewed_at: new Date(R.date + "T12:00:00").toISOString() }).select("id").single();
      if (error) throw new Error(error.message);
      await db.from("review_signoffs").insert({ organisation_id: en.organisation_id, review_id: rev.id, member_id: me.member_id, signer_role: "assessor" });
      if (content.targets.length) await db.from("targets").insert(content.targets.map((t) => ({ organisation_id: en.organisation_id, enrolment_id: en.id, course_id: en.course_id, created_by_member_id: me.member_id, title: t.title, description: [t.how, t.support ? "Support: " + t.support : ""].filter(Boolean).join("\n"), due_date: t.due || null, status: "open" })));
      localStorage.removeItem(DRAFT(L.row.enrolment_id));
      await downloadPdf({ ...content, id: rev.id, reviewedAt: R.date });
      close(); onDone && onDone();
    } catch (e) { btn.disabled = false; btn.textContent = "Complete review"; root.querySelector("#signErr").textContent = e.message; }
  }
  draw();
}

async function hash(o) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(o)));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- The PDF ---------- */
export async function downloadPdf(c) {
  const { jsPDF } = window.jspdf, F = c.facts, A = c.answers, doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 16, T = (s) => String(s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...");
  let y = 18;
  const room = (h) => { if (y + h > 282) { doc.addPage(); y = 18; } };
  const h1 = (t) => { doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(23, 32, 51); doc.text(T(t), M, y); y += 8; };
  const h2 = (t) => { room(14); y += 3; doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(44, 133, 247); doc.text(T(t), M, y); y += 6; doc.setTextColor(23, 32, 51); };
  const kv = (k, v) => { const lines = doc.splitTextToSize(T(v || "-"), W - 2 * M - 58); room(lines.length * 4.6 + 1); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(102, 112, 133); doc.text(T(k), M, y); doc.setFont("helvetica", "normal"); doc.setTextColor(23, 32, 51); doc.text(lines, M + 58, y); y += lines.length * 4.6 + 1; };
  const para = (t) => { if (!String(t || "").trim()) return; doc.setFont("helvetica", "normal"); doc.setFontSize(10); const lines = doc.splitTextToSize(T(t), W - 2 * M); lines.forEach((l) => { room(5); doc.text(l, M, y); y += 4.8; }); y += 1; };
  h1("Apprenticeship progress review");
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(102, 112, 133);
  doc.text(T(F.learner + "  ·  " + F.course + "  ·  Review " + F.reviewNo + "  ·  " + ukDate(c.reviewedAt)), M, y); y += 8;
  h2("About this review");
  kv("Apprentice", F.learner); kv("Employer", F.employer); kv("Programme", ukDate(F.start) + " to " + ukDate(F.end)); kv("Review period", ukDate(F.periodStart) + " to " + ukDate(F.periodEnd));
  kv("Held", A.method); kv("Attended", Object.entries(A.attendees).filter(([, v]) => v).map(([k]) => k[0].toUpperCase() + k.slice(1)).join(", ") + (A.employerName ? " (employer: " + A.employerName + (A.employerRole ? ", " + A.employerRole : "") + ")" : ""));
  h2("Previous targets");
  if (A.previous.length) A.previous.forEach((t) => kv(t.title, (t.outcome || "Not recorded") + (t.comment ? ". " + t.comment : ""))); else para("None set before this review.");
  h2("Progress against the training plan");
  kv("Time through programme", F.timePct != null ? F.timePct + "%" : "-"); kv(F.nvq ? "Criteria evidenced" : "KSBs evidenced", F.ksb.met + " of " + F.ksb.total + " (" + F.ksb.pct + "%)");
  kv("Evidence this period", F.evidencePeriod + " (" + F.evidenceTotal + " in total)"); kv("Progress", A.progressRag); kv("Assessor", A.progressComment); kv("Employer", A.employerComment);
  h2("Off-the-job training");
  kv("Planned / expected by now", (F.otj.planned != null ? F.otj.planned + " h" : "not set") + " / " + (F.otj.expected != null ? F.otj.expected + " h" : "-")); kv("Logged", F.otj.total + " h in total, " + F.otj.period + " h this period");
  kv("In working hours", A.otjConfirmed ? "Confirmed by employer" : "Not confirmed"); kv("Comments", A.otjComment);
  h2("English and maths"); kv("Maths", A.mathsStatus); kv("English", A.englishStatus); kv("Comments", A.fsComment);
  h2("Knowledge and practice"); kv(F.nvq ? "Knowledge tests" : "EPA mocks", F.mock ? "Best " + F.mock.best + "%" : "None yet"); kv("Discussed", A.knowledgeComment);
  h2("Safeguarding, Prevent, British values and EDI");
  kv("Feels safe", A.feelsSafe); kv("Knows how to raise a concern", A.knowsReporting); kv("Topic discussed", A.topicDiscussed); kv("Health and safety", A.healthSafety); kv("Other", A.safeguardingComment);
  h2("Support needs"); kv("Needs", A.supportNeeds); kv("Additional support", A.supportInPlace);
  h2("Changes in circumstances"); kv("Changes", A.changes + (A.changesDetail ? ". " + A.changesDetail : ""));
  h2("Apprentice and employer"); kv("Apprentice", A.apprenticeComment); kv("Next steps", A.nextSteps); kv("Careers advice", A.iag);
  h2("End-point assessment"); kv("Readiness", A.epaReady); kv("Predicted grade", A.predictedGrade); kv("Preparation", A.epaComment);
  h2("New SMART targets");
  if (c.targets.length) c.targets.forEach((t, i) => kv((i + 1) + ". " + t.title, t.how + (t.due ? " By " + ukDate(t.due) + "." : "") + (t.support ? " Support: " + t.support + "." : ""))); else para("None.");
  h2("Overall"); kv("Overall progress", A.overallRag); kv("Next review", ukDate(A.nextReview)); kv("Summary", A.summary);
  h2("Signatures");
  for (const k of ["apprentice", "employer", "assessor"]) {
    const s = c.signatures[k]; if (!s) continue; room(30);
    try { doc.addImage(s.image, "PNG", M, y, 60, 17); } catch { /* bad image */ }
    doc.setFontSize(9); doc.setTextColor(102, 112, 133); doc.text(T(k[0].toUpperCase() + k.slice(1) + ": " + s.name + "  ·  " + new Date(s.at).toLocaleString("en-GB")), M + 66, y + 10); y += 22;
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(152, 162, 179); doc.text(T("Nisia · Milos · " + RULES.name + " · record " + (c.id || "") + " · content hash " + (c.hash || "").slice(0, 16) + " · page " + i + " of " + n), M, 292); }
  doc.save(("Progress review " + F.reviewNo + " " + F.learner + " " + c.reviewedAt).replace(/[^\w .-]/g, "") + ".pdf");
}

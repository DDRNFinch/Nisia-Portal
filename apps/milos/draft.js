/* The review, written from Evia and Nisia: paragraphs the assessor reads, edits and signs, in plain British English,
   in the assessor's voice about the apprentice. Everything is worked out from what's recorded, nothing invented:
   where there's nothing to say, the sentence is left out. No AI and nothing leaves the phone. */

const DAY = 864e5;
const plural = (n, one, many) => n + " " + (n === 1 ? one : many || one + "s");
const list = (xs) => xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
const ukDay = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
const firstName = (n) => String(n || "The apprentice").split(" ")[0];

/* What happened this period beyond the snapshot: evidence by unit, observations, and what the assessor signed off. */
export function periodDetail(L, F) {
  const since = Date.parse(F.periodStart), inPeriod = (d) => Date.parse(d) >= since - DAY;
  const evidence = L.evidence.filter((e) => inPeriod(e.created_at));
  const meta = (e) => e.source_metadata || {};
  const observations = evidence.filter((e) => meta(e).collection === "observation");
  const learnerOwn = evidence.filter((e) => !["observation", "supporting"].includes(meta(e).collection));
  const units = [...new Set(learnerOwn.map((e) => meta(e).unit || e.title).filter(Boolean))];
  const assessed = (L.P && L.P.assessed) || {};
  const signed = new Set(), signedUnits = new Set();
  L.evidence.forEach((e) => (assessed[e.id] || []).filter((a) => a.decision === "accepted" && inPeriod(a.created_at)).forEach((a) => {
    (a.ksbs || []).forEach((k) => signed.add(k)); signedUnits.add(meta(e).unit || e.title);
  }));
  const changes = L.evidence.filter((e) => { const a = (assessed[e.id] || [])[0]; return a && a.decision === "changes_required"; }).map((e) => meta(e).unit || e.title);
  return { evidence, observations, units, signed: [...signed], signedUnits: [...signedUnits].filter(Boolean), changes: [...new Set(changes)] };
}

/* A suggested rating, with the reason, for the assessor to agree with or change. */
export function suggestRag(F) {
  if (F.timePct == null) return null;
  const gap = F.ksb.pct - F.timePct, otjBehind = F.otj.onTrack === false;
  const quiet = F.lastActive && (Date.now() - Date.parse(F.lastActive)) / DAY > 28;
  let rag = gap >= -10 ? "On track" : gap >= -25 ? "Slightly behind" : "At risk";
  if (rag === "On track" && (otjBehind || quiet)) rag = "Slightly behind";
  else if (rag === "Slightly behind" && otjBehind && quiet) rag = "At risk";
  const why = [F.ksb.pct + "% of " + (F.nvq ? "criteria" : "KSBs") + " evidenced at " + F.timePct + "% through"];
  if (otjBehind) why.push("off-the-job hours behind");
  if (quiet) why.push("no evidence for over four weeks");
  return { rag, why: why.join(", ") };
}

export function progressText(L, F) {
  const n = firstName(F.learner), D = periodDetail(L, F), snap = L.snapshot || {}, word = F.nvq ? "criteria" : "KSBs";
  const out = [];
  /* Where they are. */
  if (F.timePct != null) {
    const gap = F.ksb.pct - F.timePct;
    out.push(n + " is " + F.timePct + "% of the way through the programme and has evidence for " + F.ksb.met + " of " + F.ksb.total + " " + word + " (" + F.ksb.pct + "%), " +
      (gap >= 5 ? "which is ahead of where they need to be." : gap >= -10 ? "which is in line with where they should be." : gap >= -25 ? "which is a little behind for this point in the programme." : "which is well behind for this point in the programme."));
  }
  /* This period. */
  const since = F.lastReview ? "Since the last review on " + ukDay(F.lastReview) : "Since starting on " + ukDay(F.start);
  if (D.evidence.length) {
    let s = since + ", " + n + " has added " + plural(D.evidence.length - D.observations.length, "piece") + " of evidence" + (D.units.length ? ", covering " + list(D.units) : "") + ".";
    if (D.observations.length) s += " I observed " + n + " at work " + (D.observations.length === 1 ? "once" : D.observations.length + " times") + " (" + list([...new Set(D.observations.map((e) => (e.source_metadata || {}).unit || e.title))]) + ").";
    out.push(s);
  } else out.push(since + ", " + n + " hasn’t added any new evidence, so this needs to pick up before the next review.");
  if (D.signed.length) out.push("This period I signed off " + plural(D.signed.length, F.nvq ? "criterion" : "KSB", word) + " across " + list(D.signedUnits) + ".");
  if (D.changes.length) out.push("Evidence for " + list(D.changes) + " was sent back for more detail and is still to be resubmitted.");
  /* Quality of the evidence. */
  const strong = (snap.units || []).filter((u) => u.strength === "strong").map((u) => u.name), weak = (snap.units || []).filter((u) => u.strength === "weak").map((u) => u.name);
  if (strong.length) out.push("The strongest evidence is for " + list(strong.slice(0, 3)) + ", with plenty of clear photos and a write-up that covers what the unit asks for.");
  if (weak.length) out.push(list(weak.slice(0, 3)) + (weak.length === 1 ? " needs" : " need") + " more: more photos from the start, middle and end of the job, and a fuller write-up.");
  if (F.writeupCoverage != null) out.push("On average the write-ups cover " + F.writeupCoverage + "% of the points each unit asks them to mention" + (F.writeupCoverage < 50 ? ", so using Evia’s guided mode would help." : "."));
  /* Knowledge. */
  const k = [];
  if (F.teachCourse && F.teachCourse.areas) k.push("has completed " + F.teachCourse.areasDone + " of " + F.teachCourse.areas.length + " Teach me areas for the trade" + (F.teachCourse.avg != null ? " with an average score of " + F.teachCourse.avg + "%" : ""));
  if (F.mock && F.mock.latest) k.push("scored " + F.mock.latest.pct + "% on their latest " + (F.nvq ? "knowledge test" : "mock end-point test") + (F.mock.best > F.mock.latest.pct ? " (best " + F.mock.best + "%)" : "") + " from " + plural(F.mock.count, "attempt"));
  if (k.length) out.push("For knowledge, " + n + " " + list(k) + ".");
  /* Confidence. */
  const c = F.confidence;
  if (c && ((c.confident || []).length || (c.practise || []).length)) {
    const parts = [];
    if ((c.confident || []).length) parts.push("feels most confident with " + list(c.confident.slice(0, 3).map((x) => x.toLowerCase())));
    if ((c.practise || []).length) parts.push("wants more practice with " + list(c.practise.slice(0, 3).map((x) => x.toLowerCase())));
    out.push(n + " " + parts.join(" and ") + ".");
  }
  /* What's next. */
  const gap = F.missingUnits.slice().sort((a, b) => b.missing - a.missing)[0];
  if (gap) out.push("The priority now is " + gap.name + ", which still has " + plural(gap.missing, F.nvq ? "criterion" : "KSB", word) + " to evidence.");
  return out.join(" ");
}

export function otjText(F) {
  if (F.otj.expected == null) return "";
  const n = firstName(F.learner), diff = Math.round(F.otj.total - F.otj.expected);
  return n + " has logged " + F.otj.total + " hours of off-the-job training (" + F.otj.period + " this period) against " + F.otj.expected + " expected by now" +
    (diff >= 0 ? ", so is on plan." : ", which is " + -diff + " hours behind and needs making up with the employer’s support.");
}

export function fsText(F) {
  const n = firstName(F.learner), out = [];
  for (const [key, name] of [["maths", "maths"], ["english", "English"]]) {
    const s = F[key]; if (!s || !s.on) continue;
    const bits = [];
    if (s.teach && s.teach.areas) bits.push(s.teach.areasDone + " of " + s.teach.areas.length + " " + name + " areas done in Teach me");
    if (s.test) bits.push("best " + name + " test score " + s.test.best + "%");
    out.push(bits.length ? n + " is working towards " + name + ": " + bits.join(", ") + "." : n + " is working towards " + name + " but hasn’t started the " + name + " practice in Evia yet.");
  }
  return out.join(" ");
}

export function summaryText(L, F, R) {
  const n = firstName(F.learner), s = suggestRag(F), rag = (R && R.overallRag) || (s && s.rag);
  const focus = ((R && R.targets) || []).map((t) => t.title).filter(Boolean).slice(0, 3);
  return n + (rag ? " is " + rag.toLowerCase() : " is making progress") + (F.timePct != null ? ", with " + F.ksb.pct + "% of " + (F.nvq ? "criteria" : "KSBs") + " evidenced at " + F.timePct + "% of the way through" : "") +
    (F.otj.onTrack === false ? " and off-the-job hours to catch up" : "") + "." + (focus.length ? " Before the next review: " + list(focus.map((t) => t.charAt(0).toLowerCase() + t.slice(1))) + "." : "");
}

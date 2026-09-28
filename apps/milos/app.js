/* Milos, the assessor's app: Evia's look, Milos blue. Your learners (from Nisia), whose review is due, what Evia
   shows about each of them, their past reviews, connecting their Evia, and starting a review that's already filled
   in (review.js). Everything is read from Nisia under the college's own rules. */
import { db, call, rpc, me, signOut, courseName, esc, ukDate, ago, qrSvg } from "../../packages/core/nisia.js";
import { auth } from "../../packages/core/signin.js";
import { loadLearner, reviewDue, dueText, facts, openReview, downloadPdf } from "./review.js";

const root = document.getElementById("app");
let who = null, rows = [], filter = "all";
const start = () => auth(root, { title: "Milos", subtitle: "For assessors", onReady: home });
db.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") start(); });
start();

function toast(msg) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function shell(body, back) {
  root.innerHTML = '<div class="shell"><header class="top">' + (back ? '<button class="btn ghost" id="backBtn">‹ Learners</button>' : '<div class="brand"><span class="av" aria-hidden="true"><i></i><i></i></span><div>Milos<small>' + esc(who && who.name || "") + '</small></div></div>') +
    '<span class="spacer"></span><button class="btn ghost" id="signout">Sign out</button></header><main class="main" id="main">' + body + '</main></div>';
  root.querySelector("#signout").onclick = () => signOut();
  const b = root.querySelector("#backBtn"); if (b) b.onclick = home;
}
const pill = (d) => !d ? "" : d.overdue ? '<span class="pill bad">' + esc(dueText(d)) + '</span>' : d.soon ? '<span class="pill warn">' + esc(dueText(d)) + '</span>' : '<span class="pill good">' + esc(dueText(d)) + '</span>';

/* ---------- Your learners ---------- */
async function home() {
  try { who = await me(); } catch (e) { root.innerHTML = '<div class="auth"><p class="err">' + esc(e.message) + '</p></div>'; return; }
  const orgs = (who.memberships || []).filter((m) => m.roles.some((r) => ["assessor", "tutor", "admin"].includes(r)));
  shell('<p class="muted">Loading your learners…</p>');
  if (!orgs.length) { root.querySelector("#main").innerHTML = '<div class="card"><h2>No learners yet</h2><p class="muted">Milos is for assessors. Ask your college to invite you as an assessor on Nisia.</p></div>'; return; }
  try {
    rows = [];
    for (const o of orgs) {
      const list = await rpc("nisia_college_learners", { p_org: o.organisation_id });
      const mine = o.roles.includes("admin") && !o.roles.includes("assessor") ? list : list.filter((l) => (l.assessors || []).some((a) => a.member_id === o.member_id));
      rows.push(...mine.map((l) => ({ ...l, org: o })));
    }
    const ids = rows.map((r) => r.enrolment_id).filter(Boolean);
    const { data: revs } = ids.length ? await db.from("reviews").select("enrolment_id, reviewed_at").in("enrolment_id", ids) : { data: [] };
    rows.forEach((r) => { const mineRevs = (revs || []).filter((x) => x.enrolment_id === r.enrolment_id).map((x) => x.reviewed_at).sort(); r.lastReview = mineRevs.pop() || null; r.due = reviewDue(r.start_date, r.lastReview); });
    rows.sort((a, b) => (a.due ? a.due.days : 1e9) - (b.due ? b.due.days : 1e9));
  } catch (e) { root.querySelector("#main").innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
  drawHome();
}
function drawHome() {
  const dueSoon = rows.filter((r) => r.due && (r.due.overdue || r.due.soon)), quiet = rows.filter((r) => !r.last_activity || Date.now() - Date.parse(r.last_activity) > 14 * 864e5);
  const shown = filter === "due" ? dueSoon : filter === "quiet" ? quiet : rows;
  root.querySelector("#main").innerHTML =
    '<div><p class="label">' + esc(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })) + '</p><h1>Hi ' + esc((who.name || "").split(" ")[0]) + '</h1></div>' +
    '<div class="grid3">' +
      '<button class="card stat tap" data-f="all"><b>' + rows.length + '</b><span>learners</span></button>' +
      '<button class="card stat tap" data-f="due"><b' + (dueSoon.some((r) => r.due.overdue) ? ' style="color:var(--bad)"' : "") + '>' + dueSoon.length + '</b><span>' + (dueSoon.length === 1 ? "review" : "reviews") + ' due in 2 weeks</span></button>' +
      '<button class="card stat tap" data-f="quiet"><b>' + quiet.length + '</b><span>quiet for 14+ days</span></button></div>' +
    '<div class="between"><h2>' + ({ all: "Your learners", due: "Reviews due", quiet: "Gone quiet" }[filter]) + '</h2>' + (filter !== "all" ? '<button class="btn ghost" data-f="all">Show all</button>' : "") + '</div>' +
    '<div class="card list">' + (shown.length ? shown.map((r) =>
      '<button class="item" style="--cols:3" data-id="' + r.learner_id + '"><span class="name-cell"><span class="name">' + esc(r.name) + '</span><span class="sub">' + esc(courseName(r.course_code)) + (r.employer_name ? " · " + esc(r.employer_name) : "") + '</span><span class="sub due-m">' + pill(r.due) + '</span></span>' +
      '<span class="due-w">' + pill(r.due) + '</span><span class="small">' + (r.paired ? "Evia: " + esc(ago(r.last_activity)) : '<span class="pill warn">Evia not connected</span>') + '</span>' +
      '<span class="small">' + r.evidence + ' evidence · ' + Math.round(Number(r.otj_hours) || 0) + ' h</span><span class="chev">›</span></button>').join("")
      : '<p class="empty">' + (rows.length ? "Nobody here right now." : "No learners are assigned to you yet. Your college assigns them in Nisia.") + '</p>') + '</div>';
  root.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { filter = b.dataset.f; drawHome(); });
  root.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => learner(rows.find((r) => r.learner_id === b.dataset.id)));
}

/* ---------- One learner ---------- */
async function learner(r) {
  shell('<p class="muted">Loading ' + esc(r.name) + '…</p>', true);
  let L;
  try { L = await loadLearner(r); } catch (e) { root.querySelector("#main").innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
  const F = facts(L), d = reviewDue(r.start_date, r.lastReview);
  const stat = (b, s, warn) => '<div class="card stat"><b' + (warn ? ' style="color:var(--warn)"' : "") + '>' + esc(b) + '</b><span>' + esc(s) + '</span></div>';
  root.querySelector("#main").innerHTML =
    '<div class="between"><div><p class="label">' + esc(F.course) + '</p><h1>' + esc(r.name) + '</h1><p class="muted small">' + esc(F.employer || "") + ' · ' + esc(ukDate(F.start)) + ' to ' + esc(ukDate(F.end)) + '</p></div>' + pill(d) + '</div>' +
    (F.hasEvia ? "" : '<p class="note">Evia isn’t connected yet, so the review can’t be filled in from it. Connect it below.</p>') +
    '<div class="grid3">' +
      stat(F.ksb.pct + "%", (F.nvq ? "criteria" : "KSBs") + " evidenced · " + (F.timePct ?? "–") + "% through", F.timePct != null && F.ksb.pct < F.timePct - 10) +
      stat(F.otj.total + " h", "off-the-job" + (F.otj.expected != null ? " · " + F.otj.expected + " h expected" : ""), F.otj.onTrack === false) +
      stat(F.evidencePeriod, "evidence since " + (F.lastReview ? "the last review" : "the start")) + '</div>' +
    '<div class="row"><button class="btn primary" id="rev">' + (localStorage.getItem("milos-draft-" + r.enrolment_id) ? "Carry on with the review" : "Start progress review " + F.reviewNo) + '</button><button class="btn" id="pair">' + (r.paired ? "Connect Evia on a new phone" : "Connect Evia") + '</button></div>' +
    '<h2>Reviews</h2><div class="card list">' + (L.reviews.length ? L.reviews.slice().reverse().map((v, i) =>
      '<button class="item" style="--cols:2" data-rev="' + v.id + '"><span class="name-cell"><span class="name">Review ' + (L.reviews.length - i) + '</span><span class="sub">' + esc(ukDate(v.reviewed_at)) + '</span></span><span class="small">' + esc((v.content && v.content.answers && v.content.answers.overallRag) || "") + '</span><span class="small">Download PDF</span><span class="chev">›</span></button>').join("") : '<p class="empty">No reviews yet.</p>') + '</div>' +
    '<h2>Latest evidence</h2><div class="card list">' + (L.evidence.length ? L.evidence.slice(0, 8).map((e) =>
      '<div class="item" style="--cols:2"><span class="name-cell"><span class="name">' + esc(e.title) + '</span><span class="sub">' + esc(e.evidence_type) + ((e.source_metadata && e.source_metadata.ksbs || []).length ? " · " + esc(e.source_metadata.ksbs.slice(0, 6).join(", ")) : "") + '</span></span><span class="small">' + esc(ago(e.created_at)) + '</span><span></span><span></span></div>').join("") : '<p class="empty">Nothing from Evia yet.</p>') + '</div>';
  root.querySelector("#rev").onclick = () => openReview(L, { name: who.name, member_id: r.org.member_id }, () => { toast("Review saved and downloaded"); home(); });
  root.querySelector("#pair").onclick = () => pairing(r);
  root.querySelectorAll("[data-rev]").forEach((b) => b.onclick = async () => { const v = L.reviews.find((x) => x.id === b.dataset.rev); try { await downloadPdf({ ...v.content, id: v.id, reviewedAt: v.reviewed_at.slice(0, 10) }); } catch (e) { toast(e.message); } });
}
async function pairing(r) {
  const o = document.createElement("div"); o.className = "overlay"; o.innerHTML = '<section class="sheet" role="dialog" aria-modal="true"><p class="muted">Getting a code…</p></section>';
  o.onclick = (e) => { if (e.target === o) o.remove(); }; document.body.appendChild(o);
  const s = o.querySelector(".sheet");
  try {
    const c = await call("nisia-admin", { action: "pairing_code", learner_id: r.learner_id });
    s.innerHTML = '<div class="sheet-head"><h2>Connect ' + esc(r.name.split(" ")[0]) + '’s Evia</h2><button class="x" aria-label="Close">×</button></div><p class="muted">In Evia they tap <b>Scan the QR code</b>, or type the code underneath.</p><div class="qr">' + qrSvg(c.qr) + '</div><p class="code">' + esc(c.code.slice(0, 3) + "-" + c.code.slice(3)) + '</p><p class="small muted" style="text-align:center">Works once, for ' + c.expires_in_minutes + ' minutes.</p>';
    s.querySelector(".x").onclick = () => o.remove();
  } catch (e) { s.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
}

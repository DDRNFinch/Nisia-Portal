/* Paros, for employers: their apprentices' college attendance and what was taught (from the tutor's register in Symi),
   their evidence and what's still needed (from Evia and the assessor in Milos), learning hours to confirm, witness
   testimonies and behaviour ratings. Nisia decides what an employer can see (paros_learners, paros_learner): never the
   apprentice's own records in Evia. The last download is kept on the device, so Paros opens without signal. */
import { db, rpc, me, signOut, esc, ukDate, ago, courseName } from "../../packages/core/nisia.js";
/* Every request to Nisia goes through the shared actions (packages/core/nisia-actions.js, loaded by index.html). */
const A = window.NisiaActions;
A.use(rpc, { app: "paros" });
import { startUsage, hit } from "../../packages/core/usage.js";
import { auth } from "../../packages/core/signin.js";
import { COURSE_DATA } from "../../packages/core/courses.js";
import { mountAbsences } from "../../packages/core/absences.js";

const root = document.getElementById("app");
document.body.classList.add("milos", "paros");
let who = null, rows = [], tab = "today", view = null, lTab = "overview", back = "apprentices", details = {};

/* ---------- Icons, drawn like Evia's ---------- */
const svg = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
const IC = {
  today: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M8.5 14.5l2.2 2.2 4.8-4.8"/>'),
  apprentices: svg('<path d="M4 18.5c.9-3.3 3.6-5.2 6.5-5.2s5.6 1.9 6.5 5.2"/><circle cx="10.5" cy="8" r="3.5"/><path d="M6.5 6.2c1-2.3 2.6-3.4 4-3.4s3 1.1 4 3.4"/><path d="M5.5 6.4h10"/>'),
  hours: svg('<circle cx="12" cy="12.5" r="8"/><path d="M12 8v4.8l3 1.8"/><path d="M9.5 2.5h5"/>'),
  feedback: svg('<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M8.5 10.5l1.8 1.8 3.7-3.7"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'), chev: svg('<path d="M9 5l7 7-7 7"/>'),
  college: svg('<path d="M2.5 9.5L12 4.5l9.5 5-9.5 5z"/><path d="M6.5 11.8v4.4c1.4 1.4 3.3 2.1 5.5 2.1s4.1-.7 5.5-2.1v-4.4"/>'),
  evidence: svg('<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><circle cx="12" cy="12.5" r="3.3"/><path d="M8.5 6l1.4-2h4.2l1.4 2"/>'),
  pen: svg('<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/>'),
  star: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/>'),
  out: svg('<path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3"/><path d="M10 16.5L5.5 12 10 7.5M5.5 12h10"/>'),
  sync: svg('<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v3.7h-3.7M6 21v-3.7h3.7"/>'),
};
const EYES = '<span class="av" aria-hidden="true"><i></i><i></i></span>';
const initials = (n) => String(n || "").trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "P";
const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const face = (name) => '<span class="m-face" style="--h:' + hue(name) + '" aria-hidden="true">' + esc(initials(name)) + '</span>';
const first = (n) => String(n || "").split(" ")[0];
const hm = (mins) => { const m = Math.round(Number(mins) || 0); return Math.floor(m / 60) + "h" + (m % 60 ? " " + (m % 60) + "m" : ""); };
const hrs = (h) => { const n = Math.round((Number(h) || 0) * 10) / 10; return n + (n === 1 ? " hour" : " hours"); };
const day = (d) => { const t = Date.parse(d); return isNaN(t) ? "" : new Date(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); };
const ring = (pct) => { const p = Math.max(0, Math.min(100, Math.round(pct || 0))); return '<span class="m-ring" style="--p:' + p + '"><b>' + p + '<small>%</small></b></span>'; };
const course = (r) => COURSE_DATA[r.course_code] || { name: r.course_title || courseName(r.course_code), units: [], ksbs: [] };
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch (_) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
function toast(msg) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
}
function sheet(html, label) {
  const o = document.createElement("div"); o.className = "overlay";
  o.innerHTML = '<section class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(label || "") + '"><span class="m-grab" aria-hidden="true"></span><button class="x" aria-label="Close">×</button>' + html + '</section>';
  o.onclick = (e) => { if (e.target === o) o.remove(); }; o.querySelector(".x").onclick = () => o.remove();
  document.body.appendChild(o); return o;
}

/* ---------- Opening Paros ---------- */
const AUTH = { title: "Paros", subtitle: "For employers", onReady: () => start(true) };
async function boot() {
  const cached = read("paros-cache", null);
  const { data } = await db.auth.getSession();
  if (cached && data && data.session) { who = cached.who; rows = cached.rows; draw(); return start(false); }
  try { await auth(root, AUTH); }
  catch (e) { root.innerHTML = '<div class="auth"><div class="box"><p class="err">' + esc(navigator.onLine ? "Paros couldn’t reach Nisia: " + e.message : "You’re offline. Connect once to download your apprentices.") + '</p><button class="btn primary wide" id="retry">Try again</button></div></div>'; root.querySelector("#retry").onclick = boot; }
}
async function start(loud) {
  if (!navigator.onLine) { if (!rows.length) root.innerHTML = '<div class="auth"><div class="box"><p class="err">You’re offline. Connect once to download your apprentices.</p></div></div>'; return; }
  try {
    who = await me();
    if (!(who.memberships || []).some((m) => m.roles.includes("employer"))) {
      root.innerHTML = '<div class="auth"><div class="box"><h2>Paros is for employers</h2><p class="muted">This Nisia account isn’t set up as an employer. Ask the college to add you as the employer for your apprentices.</p><button class="btn ghost wide" id="out">Sign out</button></div></div>';
      root.querySelector("#out").onclick = async () => { await signOut(); location.reload(); }; return;
    }
    rows = await rpc("paros_learners");
    write("paros-cache", { who, rows, at: new Date().toISOString() });
    details = {};
    if (loud) toast("Up to date");
    draw();
  } catch (e) { if (rows.length) toast("Couldn’t update: " + e.message); else root.innerHTML = '<div class="auth"><div class="box"><p class="err">' + esc(e.message) + '</p></div></div>'; }
}
db.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") { localStorage.removeItem("paros-cache"); location.reload(); } });

async function detail(r, fresh) {
  if (details[r.enrolment_id] && !fresh) return details[r.enrolment_id];
  const key = "paros-l-" + r.enrolment_id;
  if (navigator.onLine) { try { const d = await rpc("paros_learner", { p_enrolment: r.enrolment_id }); write(key, d); return (details[r.enrolment_id] = d); } catch (e) { const c = read(key, null); if (c) return c; throw e; } }
  const c = read(key, null); if (c) return (details[r.enrolment_id] = c);
  throw new Error("Not on this device yet. Open it once with signal.");
}

/* ---------- The frame: header, the four tabs, Paros in the middle (update) ---------- */
const TABS = [["today", "Today"], ["apprentices", "Apprentices"], ["hours", "Hours"], ["feedback", "Feedback"]];
const toConfirm = () => rows.reduce((n, r) => n + (r.to_confirm || 0), 0);
function frame({ title, sub, backTo, body }) {
  const nb = ([k, t]) => '<button type="button" data-tab="' + k + '" class="' + (tab === k && !view ? "on" : "") + '">' + IC[k] + '<span>' + t + '</span>' + (k === "hours" && toConfirm() ? '<b class="m-badge">' + toConfirm() + '</b>' : "") + '</button>';
  root.innerHTML = '<div class="m-app">' +
    '<header class="m-head">' + (backTo ? '<button type="button" class="m-back" id="backBtn">' + IC.back + '<span>' + esc(backTo) + '</span></button>' : "") +
      '<div class="m-head-row"><div class="m-titles"><h1 class="m-title">' + esc(title) + '</h1>' + (sub ? '<p class="m-sub">' + sub + '</p>' : "") + '</div>' +
      '<button type="button" class="m-me" id="meBtn" aria-label="You and Paros">' + esc(initials(who && who.name)) + '</button></div></header>' +
    '<main class="m-main" id="main">' + body + '</main>' +
    '<nav class="m-nav" aria-label="Paros">' + nb(TABS[0]) + nb(TABS[1]) + '<button type="button" class="m-nav-milos" id="navSync" aria-label="Update from Nisia">' + EYES + '</button>' + nb(TABS[2]) + nb(TABS[3]) + '</nav></div>';
  root.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.tab; view = null; draw(); scrollTo(0, 0); });
  root.querySelector("#navSync").onclick = () => start(true);
  root.querySelector("#meBtn").onclick = account;
  root.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => apprentice(rows.find((r) => r.enrolment_id === b.dataset.id)));
  root.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { tab = b.dataset.go; view = null; draw(); scrollTo(0, 0); });
}
function account() {
  const orgs = [...new Set(rows.map((r) => r.organisation))].join(", ");
  const o = sheet('<div class="m-acct"><span class="m-me lg">' + esc(initials(who && who.name)) + '</span><div><h2>' + esc(who && who.name || "Employer") + '</h2><p class="muted small">' + esc(orgs || "Paros") + '</p></div></div>' +
    '<div class="card m-list"><button type="button" class="m-row" id="acSync"><span class="m-ic">' + IC.sync + '</span><span class="m-row-main"><b>Update from Nisia</b><span class="sub">' + esc((read("paros-cache", {}) || {}).at ? "Last updated " + ago(read("paros-cache", {}).at) : "") + '</span></span></button>' +
    '<button type="button" class="m-row" id="signout"><span class="m-ic bad">' + IC.out + '</span><span class="m-row-main"><b>Sign out</b><span class="sub">Removes your apprentices from this device</span></span></button></div>' +
    '<p class="small muted center">You see your own apprentices’ college attendance, evidence and progress. Their personal notes in Evia stay private to them and the college.</p>', "Account");
  o.querySelector("#acSync").onclick = () => { o.remove(); start(true); };
  o.querySelector("#signout").onclick = async () => { Object.keys(localStorage).filter((k) => k.startsWith("paros-")).forEach((k) => localStorage.removeItem(k)); await signOut(); };
}
const empty = (h, p) => '<section class="card m-empty">' + EYES + '<h2>' + h + '</h2><p class="muted">' + p + '</p></section>';
const mini = (r, right) => '<button type="button" class="m-mini" data-id="' + r.enrolment_id + '">' + face(r.name) + '<span class="m-mini-name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(course(r).name) + '</span></span>' + right + '</button>';
const ksbPct = (r) => { const t = course(r).ksbs.length; return t ? Math.round((r.signed_off || []).length / t * 100) : 0; };
const attPct = (r) => r.sessions ? Math.round(r.attended / r.sessions * 100) : null;
const reviewDue = (r) => { const from = Date.parse(r.last_review || r.start_date); if (isNaN(from)) return null; const due = from + 84 * 864e5, days = Math.ceil((due - Date.now()) / 864e5); return { due, days }; };
const ratingDue = (r) => !r.last_rating || Date.now() - Date.parse(r.last_rating) > 8 * 7 * 864e5;

startUsage("paros", new URL(import.meta.url).searchParams.get("v") || "");
function draw() {
  hit(view ? "apprentice" : "tab." + tab);
  if (view) return apprentice(view, true);
  ({ today: drawToday, apprentices: drawApprentices, hours: drawHours, feedback: drawFeedback })[tab]();
}

/* ---------- Today ---------- */
function drawToday() {
  const hour = new Date().getHours(), hi = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const card = ({ cls = "", label, big, sub, inner = "", go }) => '<section class="card m-card ' + cls + '">' + (go ? '<button type="button" class="m-card-go" data-go="' + go + '" aria-label="' + esc(label) + '">' + IC.chev + '</button>' : "") +
    '<p class="label">' + esc(label) + '</p>' + big + (sub ? '<p class="m-card-sub">' + sub + '</p>' : "") + inner + '</section>';
  const n = toConfirm(), rate = rows.filter(ratingDue), soon = rows.map((r) => ({ r, d: reviewDue(r) })).filter((x) => x.d && x.d.days <= 14).sort((a, b) => a.d.days - b.d.days);
  const lastCollege = rows.filter((r) => r.last_session).sort((a, b) => String(b.last_session).localeCompare(String(a.last_session)));
  frame({ title: hi + " " + first(who && who.name), sub: esc(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })), body:
    (!rows.length ? empty("No apprentices yet", "The college links you to your apprentices in Nisia. They’ll appear here.") :
      card({ cls: "m-hero", label: "Your apprentices", go: "apprentices", big: '<p class="m-big">' + rows.length + '</p>', sub: "Their college attendance, evidence and progress.",
        inner: '<div class="m-minis">' + rows.slice(0, 4).map((r) => mini(r, ring(ksbPct(r)))).join("") + '</div>' }) +
      card({ label: "Learning hours to confirm", go: n ? "hours" : "", big: '<p class="m-big ' + (n ? "warn" : "good") + '">' + (n || "None") + '</p>',
        sub: n ? "Hours your apprentices logged in Evia while working for you. Confirm they’re right." : "Everything your apprentices logged has been confirmed.",
        inner: n ? '<button type="button" class="btn primary wide" data-go="hours">Check hours</button>' : "" }) +
      (lastCollege.length ? card({ label: "At college", big: "", inner: '<div class="m-minis">' + lastCollege.slice(0, 4).map((r) => mini(r, '<span class="small muted">' + esc(day(r.last_session)) + '</span>')).join("") + '</div>',
        sub: "When they were last at college. Open one to see what was taught." }) : "") +
      (soon.length ? card({ label: "Progress reviews", big: '<p class="m-big ' + (soon.some((x) => x.d.days < 0) ? "bad" : "warn") + '">' + soon.length + (soon.length === 1 ? " due" : " due") + '</p>',
        sub: "You join the review and sign it with the assessor and your apprentice.", inner: '<div class="m-minis">' + soon.map((x) => mini(x.r, '<span class="pill ' + (x.d.days < 0 ? "bad" : "warn") + '">' + (x.d.days < 0 ? "Overdue" : x.d.days === 0 ? "Today" : "In " + x.d.days + " days") + '</span>')).join("") + '</div>' }) : "") +
      (rate.length ? card({ label: "Your feedback", go: "feedback", big: '<p class="m-big">' + rate.length + '</p>', sub: "Rate how they’re doing at work (their behaviours). It takes a minute and counts towards their apprenticeship.",
        inner: '<div class="m-minis">' + rate.slice(0, 3).map((r) => mini(r, '<span class="pill accent">Rate</span>')).join("") + '</div>' }) : "")) });
}

/* ---------- Apprentices ---------- */
function drawApprentices() {
  frame({ title: "Apprentices", sub: rows.length + (rows.length === 1 ? " apprentice" : " apprentices"), body:
    (!rows.length ? empty("No apprentices yet", "The college links you to your apprentices in Nisia.") :
      '<div class="card m-list">' + rows.map((r) => { const a = attPct(r);
        return '<button type="button" class="m-row" data-id="' + r.enrolment_id + '">' + face(r.name) + '<span class="m-row-main"><b>' + esc(r.name) + '</b><span class="sub">' + esc(course(r).name) + ' · ' +
          (r.signed_off || []).length + ' of ' + course(r).ksbs.length + ' signed off' + (a != null ? ' · ' + a + '% at college' : "") + '</span></span>' + ring(ksbPct(r)) + '</button>'; }).join("") + '</div>') });
}

/* ---------- Hours to confirm, across apprentices ---------- */
async function drawHours() {
  frame({ title: "Learning hours", sub: "Logged in Evia, confirmed by you", body: '<div class="m-loading">' + EYES + '<p class="muted">Loading hours…</p></div>' });
  let list = [];
  for (const r of rows) { try { const d = await detail(r); (d.otj || []).filter((o) => o.type !== "college" && !o.decision).forEach((o) => list.push({ r, o })); } catch (_) {} }
  if (tab !== "hours" || view) return;
  list.sort((a, b) => String(b.o.date).localeCompare(String(a.o.date)));
  frame({ title: "Learning hours", sub: "Logged in Evia, confirmed by you", body:
    '<p class="muted small m-intro">Off-the-job learning your apprentices did in their working hours: training, research, practising a skill. Confirm the ones that are right; query anything that isn’t.</p>' +
    (!list.length ? empty("All confirmed", "Nothing waiting. New hours appear here as your apprentices log them.") :
      '<div class="card m-list">' + list.map(({ r, o }) => '<div class="m-row p-hour" data-otj="' + o.id + '">' + face(r.name) + '<span class="m-row-main"><b>' + esc(hrs(o.hours)) + ' · ' + esc(first(r.name)) + '</b><span class="sub">' + esc(day(o.date)) + ' · ' + esc(o.description || "") + '</span></span>' +
        '<span class="p-acts"><button type="button" class="btn ghost" data-q="' + o.id + '">Query</button><button type="button" class="btn primary" data-ok="' + o.id + '">Confirm</button></span></div>').join("") + '</div>') });
  const find = (id) => list.find((x) => x.o.id === id);
  root.querySelectorAll("[data-ok]").forEach((b) => b.onclick = () => confirmHours(find(b.dataset.ok), "approved"));
  root.querySelectorAll("[data-q]").forEach((b) => b.onclick = () => {
    const x = find(b.dataset.q);
    const o = sheet('<h2>Query these hours</h2><p class="muted">' + esc(hrs(x.o.hours)) + ' on ' + esc(day(x.o.date)) + ': ' + esc(x.o.description || "") + '</p><label class="field">What’s not right?<textarea id="qWhy" rows="3" placeholder="e.g. This was on a day off"></textarea></label><button type="button" class="btn primary wide" id="qSend">Send to the college</button>', "Query hours");
    o.querySelector("#qSend").onclick = async () => { const why = o.querySelector("#qWhy").value.trim(); if (!why) return o.querySelector("#qWhy").focus(); o.remove(); await confirmHours(x, "rejected", why); };
  });
}
async function confirmHours(x, decision, comment) {
  try { await A.send("confirmHours", { p_otj: x.o.id, p_decision: decision, p_comment: comment || null }); }
  catch (e) { return toast("Couldn’t save: " + e.message); }
  x.o.decision = decision; x.r.to_confirm = Math.max(0, (x.r.to_confirm || 0) - 1); write("paros-cache", { who, rows, at: (read("paros-cache", {}) || {}).at });
  toast(decision === "approved" ? "Confirmed" : "Sent to the college");
  if (view) apprentice(view, true); else drawHours();
}

/* ---------- Feedback: witness testimonies and behaviour ratings, across apprentices ---------- */
function drawFeedback() {
  frame({ title: "Feedback", sub: "Witness testimonies and behaviours", body:
    '<p class="muted small m-intro">What you see your apprentices do at work counts towards their apprenticeship. A witness testimony describes a job you saw; rating their behaviours shows how they work.</p>' +
    (!rows.length ? empty("No apprentices yet", "") : '<div class="card m-list">' + rows.map((r) => '<div class="m-row">' + face(r.name) + '<span class="m-row-main"><b>' + esc(r.name) + '</b><span class="sub">' +
      (r.witness ? r.witness + (r.witness === 1 ? " testimony" : " testimonies") : "No testimonies yet") + ' · ' + (r.last_rating ? "rated " + ago(r.last_rating) : "not rated yet") + '</span></span>' +
      '<span class="p-acts"><button type="button" class="btn ghost" data-w="' + r.enrolment_id + '">Testimony</button><button type="button" class="btn ' + (ratingDue(r) ? "primary" : "ghost") + '" data-b="' + r.enrolment_id + '">Rate</button></span></div>').join("") + '</div>') });
  root.querySelectorAll("[data-w]").forEach((b) => b.onclick = () => witness(rows.find((r) => r.enrolment_id === b.dataset.w)));
  root.querySelectorAll("[data-b]").forEach((b) => b.onclick = () => rateBehaviours(rows.find((r) => r.enrolment_id === b.dataset.b)));
}

/* A witness testimony: the job, the unit it counts for, what they saw, how well it was done, and their KSBs ticked. */
async function witness(r) {
  const C = course(r), units = C.units || [];
  const o = sheet('<h2>Witness testimony</h2><p class="muted">For ' + esc(r.name) + '. Describe a job you saw them do yourself.</p>' +
    '<label class="field">The work it counts for<select id="wUnit">' + units.map(([u], i) => '<option value="' + i + '">' + esc(u) + '</option>').join("") + '<option value="">Something else</option></select></label>' +
    '<label class="field">What you saw<textarea id="wText" rows="5" placeholder="Where and when, what they did, how they did it, and anything they did especially well or safely."></textarea></label>' +
    '<div class="field"><span>What it shows (tick what you saw)</span><div class="m-chips" id="wKsbs"></div></div>' +
    '<div class="field"><span>How well was it done?</span><div class="p-scale" id="wRate">' + [["1", "Getting there"], ["2", "Competent"], ["3", "Excellent"]].map(([v, t]) => '<button type="button" data-v="' + v + '">' + t + '</button>').join("") + '</div></div>' +
    '<label class="p-check"><input type="checkbox" id="wSign"> I saw this work myself, and this is a true account.</label>' +
    '<p class="err" id="wErr"></p><button type="button" class="btn primary wide" id="wSave">Sign and send</button>', "Witness testimony");
  let rating = 0;
  const chips = () => { const i = o.querySelector("#wUnit").value, list = i === "" ? [] : units[+i][1];
    o.querySelector("#wKsbs").innerHTML = list.map((k) => { const t = (C.ksbs.find((x) => x[0] === k) || [k, ""])[1]; return '<button type="button" class="m-chip" data-k="' + esc(k) + '" title="' + esc(t) + '"><b>' + esc(k) + '</b> ' + esc(t.length > 60 ? t.slice(0, 57) + "…" : t) + '</button>'; }).join("") || '<span class="muted small">Describe it fully above.</span>';
    o.querySelectorAll("#wKsbs [data-k]").forEach((c) => c.onclick = () => c.classList.toggle("on")); };
  o.querySelector("#wUnit").onchange = chips; chips();
  o.querySelectorAll("#wRate [data-v]").forEach((b) => b.onclick = () => { rating = +b.dataset.v; o.querySelectorAll("#wRate button").forEach((x) => x.classList.toggle("on", x === b)); });
  o.querySelector("#wSave").onclick = async () => {
    const text = o.querySelector("#wText").value.trim(), err = o.querySelector("#wErr");
    if (text.split(/\s+/).length < 12) return (err.textContent = "Say a bit more about what you saw (a few sentences).");
    if (!rating) return (err.textContent = "Choose how well it was done.");
    if (!o.querySelector("#wSign").checked) return (err.textContent = "Tick to confirm you saw it yourself.");
    const i = o.querySelector("#wUnit").value;
    const b = o.querySelector("#wSave"); b.disabled = true; b.textContent = "Sending…";
    try {
      await A.send("addWitness", { p_enrolment: r.enrolment_id, p_statement: text, p_rating: rating, p_unit: i === "" ? null : units[+i][0], p_ksbs: [...o.querySelectorAll("#wKsbs .on")].map((c) => c.dataset.k) });
      o.remove(); r.witness = (r.witness || 0) + 1; details[r.enrolment_id] = null; toast("Sent. " + first(r.name) + " and their assessor can see it."); draw();
    } catch (e) { b.disabled = false; b.textContent = "Sign and send"; err.textContent = "Couldn’t send: " + e.message; }
  };
}

/* Behaviours: each of the course's behaviours, from "needs support" to "excellent", with a comment. */
async function rateBehaviours(r) {
  const B = course(r).ksbs.filter((k) => /^B\d/.test(k[0]));
  const SCALE = [["1", "Needs support"], ["2", "Developing"], ["3", "Good"], ["4", "Excellent"]];
  const o = sheet('<h2>How is ' + esc(first(r.name)) + ' doing at work?</h2><p class="muted">Rate each behaviour from what you’ve seen lately.</p>' +
    (B.length ? B.map(([k, t]) => '<div class="p-beh" data-k="' + esc(k) + '"><p><b>' + esc(k) + '</b> ' + esc(t) + '</p><div class="p-scale">' + SCALE.map(([v, s]) => '<button type="button" data-v="' + v + '">' + s + '</button>').join("") + '</div></div>').join("")
      : '<p class="muted">This course has no behaviours listed.</p>') +
    '<label class="field">Anything to add?<textarea id="bNote" rows="3" placeholder="What they do well, and what would help them improve."></textarea></label><p class="err" id="bErr"></p><button type="button" class="btn primary wide" id="bSave">Send</button>', "Rate behaviours");
  const got = {};
  o.querySelectorAll(".p-beh").forEach((row) => row.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => { got[row.dataset.k] = +b.dataset.v; row.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); }));
  o.querySelector("#bSave").onclick = async () => {
    if (Object.keys(got).length < B.length) return (o.querySelector("#bErr").textContent = "Rate each one (" + (B.length - Object.keys(got).length) + " to go).");
    const b = o.querySelector("#bSave"); b.disabled = true;
    try { await A.send("rateBehaviours", { p_enrolment: r.enrolment_id, p_ratings: got, p_comment: o.querySelector("#bNote").value.trim() || null }); }
    catch (e) { b.disabled = false; return (o.querySelector("#bErr").textContent = "Couldn’t send: " + e.message); }
    o.remove(); r.last_rating = new Date().toISOString(); details[r.enrolment_id] = null; toast("Thanks. " + first(r.name) + " and their assessor can see it."); draw();
  };
}

/* ---------- One apprentice ---------- */
async function apprentice(r, keep) {
  if (!r) return;
  if (!keep) { back = tab; lTab = "overview"; }
  view = r;
  const C = course(r), head = { title: r.name, sub: esc(C.name) + (r.employer_name ? " · " + esc(r.employer_name) : ""), backTo: ({ today: "Today", apprentices: "Apprentices", hours: "Hours", feedback: "Feedback" })[back] };
  const goBack = () => { view = null; tab = back; draw(); scrollTo(0, 0); };
  if (!keep || !details[r.enrolment_id]) { frame({ ...head, body: '<div class="m-loading">' + EYES + '<p class="muted">Loading ' + esc(first(r.name)) + '…</p></div>' }); root.querySelector("#backBtn").onclick = goBack; }
  let D;
  try { D = await detail(r); } catch (e) { root.querySelector("#main").innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p></div>'; return; }
  if (view !== r) return;
  const signed = new Set(r.signed_off || []), total = C.ksbs.length;
  const inEvidence = new Set(D.evidence.flatMap((e) => (e.ksbs || []).map(String)));
  const unitRows = (C.units || []).map(([u, ks]) => ({ u, ks, done: ks.filter((k) => signed.has(k)).length, ev: D.evidence.filter((e) => (e.unit || e.title) === u).length }));
  const needed = unitRows.filter((x) => x.done < x.ks.length);
  const college = D.college || [], att = college.filter((c) => (c.minutes || 0) > 0 && c.status !== "absent").length;
  const d = reviewDue(r);
  const stat = (b, s, warn) => '<div class="card m-stat"><b' + (warn ? ' class="warn"' : "") + '>' + esc(b) + '</b><span>' + esc(s) + '</span></div>';
  const seg = [["overview", "Overview"], ["college", "College"], ["evidence", "Evidence"], ["feedback", "Feedback"]];
  const pill = (dec) => dec === "accepted" ? '<span class="pill good">Signed off</span>' : dec === "changes_required" ? '<span class="pill warn">More needed</span>' : dec === "rejected" ? '<span class="pill bad">Not accepted</span>' : '<span class="pill">With the assessor</span>';
  frame({ ...head, body:
    '<div class="m-seg" role="tablist">' + seg.map(([k, t]) => '<button type="button" role="tab" data-lt="' + k + '" aria-selected="' + (lTab === k) + '">' + t + '</button>').join("") + '</div>' +
    /* Overview */
    '<div class="m-pane" data-pane="overview"' + (lTab === "overview" ? "" : " hidden") + '>' +
      '<section class="card m-card m-hero"><p class="label">Progress</p><div class="p-prog">' + ring(total ? signed.size / total * 100 : 0) + '<div><p class="m-big">' + signed.size + '<small> of ' + total + '</small></p><p class="m-card-sub">KSBs signed off by the assessor' + (inEvidence.size > signed.size ? ", with more in evidence waiting" : "") + '.</p></div></div></section>' +
      '<div class="m-stats">' + stat(college.length ? Math.round(att / college.length * 100) + "%" : "–", college.length ? "at college (" + att + " of " + college.length + ")" : "no college registers yet", college.length && att / college.length < .9) +
        stat(hrs(r.otj_hours), "learning hours" + (r.planned_otj_hours ? " of " + r.planned_otj_hours : "")) + stat(String(r.evidence), "pieces of evidence") +
        stat(d ? (d.days < 0 ? "Overdue" : d.days === 0 ? "Today" : "In " + d.days + " days") : "–", "next progress review", d && d.days < 0) + '</div>' +
      (needed.length ? '<section class="card m-card"><p class="label">Still needed</p><p class="m-card-sub">Work that would help ' + esc(first(r.name)) + ': jobs on site that cover these units.</p><div class="p-units">' +
        needed.slice(0, 6).map((x) => '<div class="p-unit"><b>' + esc(x.u) + '</b><span>' + x.done + ' of ' + x.ks.length + ' signed off' + (x.ev ? " · " + x.ev + " evidence" : " · no evidence yet") + '</span><i style="--p:' + Math.round(x.done / x.ks.length * 100) + '"></i></div>').join("") + '</div></section>' : "") +
      '<div class="p-acts wide"><button type="button" class="btn primary" id="doWitness">' + IC.pen + ' Witness testimony</button><button type="button" class="btn ghost" id="doRate">' + IC.star + ' Rate behaviours</button></div>' +
    '</div>' +
    /* College */
    '<div class="m-pane" data-pane="college"' + (lTab === "college" ? "" : " hidden") + '>' +
      '<div id="absBox"></div>' +
      (!college.length ? empty("No college registers yet", "When the tutor finishes a register in Symi, it shows here with what was taught.") :
        '<div class="card m-list">' + college.map((c) => { const here = (c.minutes || 0) > 0 && c.status !== "absent";
          return '<div class="m-row p-sess" data-att="' + esc(c.id) + '"><span class="m-ic ' + (here ? "" : "bad") + '">' + IC.college + '</span><span class="m-row-main"><b>' + esc(day(c.date)) + ' · ' + esc(c.class) + '</b><span class="sub">' + esc(c.lesson || "") + '</span>' +
            ((c.ksbs || []).length ? '<span class="m-chips">' + c.ksbs.map((k) => '<span class="m-chip" title="' + esc((C.ksbs.find((x) => x[0] === k) || [k, ""])[1]) + '">' + esc(k) + '</span>').join("") + '</span>' : "") + '</span>' +
            (here ? '<span class="pill good">' + esc(hm(c.minutes)) + (c.late ? " · late" : "") + '</span>' : '<span class="pill bad">Absent</span>') + '</div>'; }).join("") + '</div>') +
    '</div>' +
    /* Evidence */
    '<div class="m-pane" data-pane="evidence"' + (lTab === "evidence" ? "" : " hidden") + '>' +
      '<div class="p-units">' + unitRows.map((x) => '<div class="p-unit"><b>' + esc(x.u) + '</b><span>' + x.done + ' of ' + x.ks.length + ' signed off · ' + (x.ev ? x.ev + " evidence" : "no evidence yet") + '</span><i style="--p:' + Math.round(x.done / x.ks.length * 100) + '"></i></div>').join("") + '</div>' +
      (D.evidence.length ? '<div class="card m-list">' + D.evidence.slice(0, 60).map((e) => '<div class="m-row"><span class="m-ic">' + IC.evidence + '</span><span class="m-row-main"><b>' + esc(e.unit || e.title) + '</b><span class="sub">' + esc(day(e.at)) + (e.observation ? " · assessor’s observation" : "") + '</span></span>' + pill(e.decision) + '</div>').join("") + '</div>' : empty("No evidence yet", "Photos and write-ups from Evia appear here.")) +
    '</div>' +
    /* Feedback */
    '<div class="m-pane" data-pane="feedback"' + (lTab === "feedback" ? "" : " hidden") + '>' +
      '<div class="p-acts wide"><button type="button" class="btn primary" id="doWitness2">' + IC.pen + ' Witness testimony</button><button type="button" class="btn ghost" id="doRate2">' + IC.star + ' Rate behaviours</button></div>' +
      ((D.witness || []).length ? '<p class="label">Your witness testimonies</p><div class="card m-list">' + D.witness.map((w) => '<div class="m-row"><span class="m-ic">' + IC.pen + '</span><span class="m-row-main"><b>' + esc(w.unit || "Witness testimony") + '</b><span class="sub">' + esc(day(w.at)) + ' · ' + esc(["", "Getting there", "Competent", "Excellent"][w.rating] || "") + '</span><span class="p-quote">' + esc(w.statement) + '</span></span></div>').join("") + '</div>' : "") +
      ((D.ratings || []).length ? '<p class="label">Behaviour ratings</p><div class="card m-list">' + D.ratings.map((b) => '<div class="m-row"><span class="m-ic">' + IC.star + '</span><span class="m-row-main"><b>' + esc(day(b.at)) + '</b><span class="m-chips">' + Object.entries(b.ratings || {}).map(([k, v]) => '<span class="m-chip">' + esc(k) + ' · ' + esc(["", "Needs support", "Developing", "Good", "Excellent"][v] || v) + '</span>').join("") + '</span>' + (b.comment ? '<span class="p-quote">' + esc(b.comment) + '</span>' : "") + '</span></div>').join("") + '</div>' : "") +
      ((D.witness || []).length || (D.ratings || []).length ? "" : empty("No feedback yet", "Your witness testimonies and behaviour ratings appear here.")) +
    '</div>' });
  root.querySelector("#backBtn").onclick = goBack;
  root.querySelectorAll("[data-lt]").forEach((b) => b.onclick = () => { lTab = b.dataset.lt; root.querySelectorAll("[data-lt]").forEach((x) => x.setAttribute("aria-selected", x === b)); root.querySelectorAll("[data-pane]").forEach((p) => p.hidden = p.dataset.pane !== lTab); });
  ["doWitness", "doWitness2"].forEach((id) => { const b = root.querySelector("#" + id); if (b) b.onclick = () => witness(r); });
  ["doRate", "doRate2"].forEach((id) => { const b = root.querySelector("#" + id); if (b) b.onclick = () => rateBehaviours(r); });
  /* Days off, and why they weren't at college. */
  mountAbsences(root.querySelector("#absBox"), { enrolment: r.enrolment_id, name: r.name, sheet, toast, hit });
  reasons(r);
}
async function reasons(r) {
  const key = "paros-reasons-" + r.enrolment_id;
  let marks = read(key, null);
  if (navigator.onLine) { try { marks = (await rpc("paros_absences", { p_enrolment: r.enrolment_id })).marks || []; write(key, marks); } catch (_) {} }
  if (view !== r) return;
  (marks || []).forEach((m) => { if (m.here || !m.reason) return; const p = root.querySelector('[data-att="' + m.id + '"] .pill.bad'); if (p) { p.textContent = "Off · " + m.reason; p.className = "pill warn"; } });
}

boot().catch((e) => { root.innerHTML = '<div class="auth"><p class="err">' + esc(e.message) + '</p></div>'; });

/* Symi on Evia Portal. Symi still works on its own, offline, with everything on this device; signing in to Evia Portal adds:
   - Learners: the tutor's learners come from Evia Portal (their enrolments), matched to learners already in Symi by name,
     so existing registers keep their history.
   - Check-in: during a session, "Show check-in code" puts a QR on the classroom screen that changes every 20 seconds,
     with a 6-character code under it for phones without a camera. Learners scan it in Evia; Evia Portal checks it (only
     this Symi holds the session's key) and their timer here starts. A photo sent to a friend has expired before it
     can be used, and it only ticks the learner here: the tutor's register is the record.
   - Hours: when a register is finished (or Symi closes it at the end of the session), each Evia Portal learner's minutes go
     to Evia Portal with what was taught and its KSBs. They become the learner's college hours in Evia, confirmed by the
     tutor, and employers see them in Paros. Sent again later if there's no signal.
   - Marks: each Evia Portal learner's row has one button for their mark: here, late, or not here and why (ill, holiday,
     an appointment, at work, or the tutor's own words), or not here with no reason. Days a learner has booked off (in
     Evia, Symi, Milos or Paros) show on the register before anyone arrives. A finished register can still be changed:
     the change goes to Evia Portal and is kept there.
   - No signal: the next week's sessions and their check-in keys are fetched ahead, so the classroom code works with
     no signal. Learners' phones keep a scan and send it later; Evia Portal records it at the time it was on the screen.
     Anything booked while offline is sent when the signal's back.
   Everything Evia Portal needs is sent from Symi's own records: its history rows and the lesson set for each session. */
import { db, me, rpc, esc, signOut } from "../../packages/core/nisia.js";
/* Every request to Evia Portal goes through the shared actions (packages/core/nisia-actions.js, loaded by index.html). */
const A = window.NisiaActions;
A.use(rpc, { app: "symi" });
import { auth, inviteCode, resetCode } from "../../packages/core/signin.js";
import { startUsage, hit } from "../../packages/core/usage.js";
import "../../packages/core/messages-ui.js";
startUsage("symi", window.SYMI_BUILD || "");

const App = () => window.SamosApp;
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch (_) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
const K = { who: "symi.nisia.who.v1", sessions: "symi.nisia.sessions.v1", sent: "symi.nisia.sent.v1", checked: "symi.nisia.checked.v1",
  marks: "symi.nisia.marks.v1", failed: "symi.nisia.failed.v1", keys: "symi.nisia.keys.v1", absences: "symi.nisia.absences.v1", outbox: "symi.nisia.outbox.v1", ready: "symi.nisia.ready.v1",
  reopen: "symi.nisia.reopen.v1" };
const REASONS = [["ill", "Sickness"], ["holiday", "Holiday"], ["appointment", "Appointment"], ["work", "At work"], ["other", "Other"]];
const LEFT_REASONS = [["family", "Family"], ["appointment", "Appointment"], ["ill", "Sickness"], ["work", "Work"], ["other", "Other"]];
const LIVE = ["open-early", "live", "break"];
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const addDays = (key, n) => { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + n); return dayKey(d); };
const online = () => navigator.onLine !== false;
const first = (name) => String(name || "").split(" ")[0];
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", WINDOW = 20;
const toast = (m) => { try { App().toast(m); } catch (_) {} };
let who = read(K.who, null), signedIn = false;

/* ---------- Signing in ---------- */
const tutorOrgs = () => (who && who.memberships || []).filter((m) => m.roles.some((r) => r === "tutor" || r === "admin"));
async function checkSession() {
  const { data } = await db.auth.getSession();
  signedIn = !!(data && data.session && who);
  chip();
  return signedIn;
}
function openSignIn() {
  const layer = document.createElement("div");
  layer.className = "sn-auth"; layer.setAttribute("role", "dialog"); layer.setAttribute("aria-modal", "true");
  layer.innerHTML = '<button type="button" class="sn-x" aria-label="Close">×</button><div class="sn-auth-root"></div>';
  document.body.appendChild(layer);
  layer.querySelector(".sn-x").onclick = () => layer.remove();
  auth(layer.querySelector(".sn-auth-root"), { title: "Symi", subtitle: "Sign in with your Evia Portal account", onReady: async () => {
    try {
      who = await me(); write(K.who, who);
      if (!tutorOrgs().length) { layer.remove(); await signOut(); who = null; write(K.who, null); toast("That Evia Portal account isn’t a tutor"); return chip(); }
      layer.remove(); signedIn = true; chip();
      write(BACKUP_AT, null); await syncBackup();
      await pullLearners(true); await pullClasses(); sendFinished(); pullAbsences().catch(() => {}); prepareAhead();
    } catch (e) { layer.remove(); toast("Couldn’t reach your college: " + e.message); }
  } }).catch((e) => { layer.querySelector(".sn-auth-root").innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
}
function account() {
  const layer = sheet('<h2>Evia Portal</h2><p class="sn-muted">Signed in as <b>' + esc(who && who.name || "") + '</b> · ' + esc(tutorOrgs().map((o) => o.organisation).join(", ")) + '</p>' +
    '<p class="sn-muted">Your learners come from Evia Portal. Learners check in with Evia, and finished registers become their college hours.</p>' +
    '<div class="sn-actions"><button type="button" class="blue-button" data-pull>Update learners from Evia Portal</button><button type="button" class="soft-button" data-out>Sign out of Evia Portal</button></div>');
  layer.querySelector("[data-pull]").onclick = async () => { layer.remove(); await pullLearners(true); await pullClasses(); };
  layer.querySelector("[data-out]").onclick = async () => { layer.remove(); await syncBackup(); await signOut(); who = null; write(K.who, null); write(BACKUP_AT, null); signedIn = false; chip(); toast("Signed out of Evia Portal. Symi keeps working on this device."); };
}
function sheet(html) {
  const layer = document.createElement("div");
  layer.className = "sn-sheet-layer";
  layer.innerHTML = '<section class="sn-sheet" role="dialog" aria-modal="true"><button type="button" class="sn-x" aria-label="Close">×</button>' + html + '</section>';
  document.body.appendChild(layer);
  layer.onclick = (e) => { if (e.target === layer) layer.remove(); };
  layer.querySelector(".sn-x").onclick = () => layer.remove();
  return layer;
}
/* The Evia Portal button in the header. */
function chip() {
  const nav = document.querySelector(".header-utility-actions");
  if (!nav) return;
  /* The profile button shows the tutor's initials, like Milos and Paros. */
  const pb = document.getElementById("profileButton"), nm = (who && who.name) || ((App() && App().getState().settings) || {}).teacherName || "";
  const ini = nm.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (pb && ini && pb.textContent !== ini) { pb.textContent = ini; pb.classList.add("sy-initials"); pb.setAttribute("aria-label", "Profile"); }
  let b = document.getElementById("nisiaButton");
  if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "nisiaButton"; nav.insertBefore(b, nav.firstChild); }
  b.className = "sn-chip" + (signedIn ? " on" : "");
  b.innerHTML = '<i aria-hidden="true"></i>' + (signedIn ? "Evia Portal" : "Connect to Evia Portal");
  b.onclick = () => (signedIn ? account() : openSignIn());
}

/* ---------- Learners from Evia Portal ---------- */
async function pullLearners(say) {
  if (say) hit("learners.pull");
  if (!signedIn || !navigator.onLine) return;
  const found = [];
  for (const o of tutorOrgs()) {
    const list = await rpc("nisia_college_learners", { p_org: o.organisation_id });
    const mine = o.roles.includes("admin") && !o.roles.includes("tutor") ? list : list.filter((l) => (l.assessors || []).some((a) => a.member_id === o.member_id));
    /* Learners who have left or finished aren't added (Evia Portal takes them off their classes too). */
    found.push(...mine.filter((l) => l.enrolment_id && l.status !== "completed" && l.status !== "withdrawn").map((l) => ({ ...l, org: o.organisation_id })));
  }
  let added = 0;
  App().mutate((st) => {
    const today = App().today();
    for (const l of found) {
      const nisia = { enrolmentId: l.enrolment_id, learnerId: l.learner_id, org: l.org, course: l.course_title || "", linkedAt: today };
      let x = st.learners.find((y) => y.nisia && y.nisia.enrolmentId === l.enrolment_id)
        || st.learners.find((y) => !y.nisia && String(y.name).trim().toLowerCase() === String(l.name).trim().toLowerCase());
      if (x) x.nisia = { ...nisia, linkedAt: (x.nisia && x.nisia.linkedAt) || today };
      else { x = { id: "nisia-" + l.enrolment_id, name: l.name, externalId: "", nisia, attendance: { sessions: 0, expectedMs: 0, attendedMs: 0, percentage: 0 } }; st.learners.push(x); added++; }
      x.name = l.name;
      /* Registers keep their own copy of each learner: bring the link into those too. */
      for (const reg of st.classes || []) for (const rl of reg.learners || []) if (rl.id === x.id) { rl.nisia = x.nisia; rl.name = x.name; }
    }
  });
  if (say) toast(found.length ? found.length + (found.length === 1 ? " learner" : " learners") + " from Evia Portal" + (added ? " (" + added + " new)" : "") : "No learners in Evia Portal for you yet");
}
/* ---------- Classes from Evia Portal ----------
   The college sets classes up in the Evia Portal portal: each one the tutor teaches becomes a register here, with its
   learners, days, times and dates. A class changed in Evia Portal is changed here; one the tutor changes here goes back to
   Evia Portal when its sessions are got ready (symi_save_class). A class Evia Portal has ended, or moved to another tutor, is
   archived here, its registers kept. */
async function pullClasses() {
  if (!signedIn || !online()) return;
  let list;
  try { list = await rpc("symi_my_classes"); } catch (e) { console.warn("Symi: classes from Evia Portal", e.message); return; }
  if (!Array.isArray(list)) return;
  let ended = new Set();
  try { const e = await rpc("symi_my_ended_classes"); if (Array.isArray(e)) ended = new Set(e); } catch (e) { console.warn("Symi: classes ended in Evia Portal", e.message); }
  let made = 0;
  App().mutate((st) => {
    const today = App().today(), mine = new Set();
    st.classes = st.classes || []; st.learners = st.learners || [];
    for (const c of list) {
      mine.add(c.client_ref);
      const s = c.schedule || {}, r = s.recurrence || {};
      const learners = (c.learners || []).map((l) => {
        let x = st.learners.find((y) => y.nisia && y.nisia.enrolmentId === l.enrolment_id);
        if (!x) { x = { id: "nisia-" + l.enrolment_id, name: l.name, externalId: "", nisia: { enrolmentId: l.enrolment_id, org: c.organisation_id, course: "", linkedAt: today }, attendance: { sessions: 0, expectedMs: 0, attendedMs: 0, percentage: 0 } }; st.learners.push(x); }
        return { id: x.id, name: x.name };
      });
      const fromNisia = { name: c.title, room: c.room || "", day: s.day || (r.weekdays || [])[0] || "", start: s.start || "09:00", end: s.end || "16:00", recurrence: r,
        learners, nisiaClassId: c.id, managed: !!c.managed, nisiaUpdatedAt: c.updated_at, archived: false };
      /* The course the college set; a class with none keeps the one the tutor chose in Symi. */
      if (c.course_code) fromNisia.courseCode = c.course_code;
      /* Breaks set in Evia Portal don't count towards the learners' hours. */
      if (Array.isArray(s.breaks)) fromNisia.breaks = s.breaks.filter((x) => x && x.start && x.end).map((x, i) => ({ id: "nb" + i + "-" + x.start, label: "Break " + (i + 1), start: x.start, end: x.end }));
      const reg = st.classes.find((x) => x.id === c.client_ref);
      if (!reg) { st.classes.push(Object.assign({ id: c.client_ref, breaks: [] }, fromNisia)); made++; continue; }
      /* The tutor's own learners (not from Evia Portal) stay on the register: the ones already on it, and the ones on
         its class in Symi (which puts back any an older Symi took off). */
      const own = (id) => { const l = st.learners.find((y) => y.id === id); return l && !l.nisia ? l : null; };
      const tc = reg.teachingClassId && (st.teachingClasses || []).find((t) => t.id === reg.teachingClassId);
      const keep = [...(reg.learners || []).map((x) => own(x.id)), ...(tc && tc.learnerIds || []).map(own)].filter(Boolean);
      if (!reg.nisiaUpdatedAt || String(c.updated_at) > String(reg.nisiaUpdatedAt)) Object.assign(reg, fromNisia);
      reg.learners = reg.learners || [];
      for (const l of keep) if (!reg.learners.some((x) => x.id === l.id)) reg.learners.push({ id: l.id, name: l.name });
    }
    for (const reg of st.classes) if (reg.managed && !reg.archived && !mine.has(reg.id)) reg.archived = true;
    /* Ended in Evia Portal: put away here too, even a register the tutor made in Symi (its history is kept). */
    for (const reg of st.classes) if (!reg.archived && ended.has(reg.id) && !mine.has(reg.id)) reg.archived = true;
  }, true);
  if (made) toast(made === 1 ? "A new class from Evia Portal is in your registers" : made + " new classes from Evia Portal are in your registers");
}
const nisiaOf = (st, learnerId) => { const l = st.learners.find((x) => x.id === learnerId); return l && l.nisia || null; };
const regLearners = (st, reg) => (reg.learners || []).map((l) => ({ id: l.id, name: l.name, nisia: nisiaOf(st, l.id) })).filter((x) => x.nisia);

/* ---------- The session in Evia Portal ---------- */
function lessonFor(st, regId, key) {
  const id = (read("symi.session.lesson.v1", {}) || {})[regId + ":" + key];
  const r = id && (st.resources || []).find((x) => x.id === id);
  if (!r) return null;
  const f = r.fields || {};
  const ksbs = [...new Set((r.linkedKSBs || []).map((k) => typeof k === "string" ? k : k && k.code).filter(Boolean))];
  return { title: String(r.title || f.topic || "").slice(0, 200) || null, summary: String(f.learningOutcomes || f.topic || "").slice(0, 1000) || null, ksbs };
}
/* What's taught that day: the lesson plan the tutor picked, else the session from the class's scheme of work
   (symi-teach.js), so every finished register says what was taught and which KSBs it covered. */
async function lessonOn(st, regId, key) {
  const own = lessonFor(st, regId, key);
  if (own) return own;
  try {
    const T = window.SymiTeach, s = T && await T.sessionFor(regId, key);
    if (!s) return null;
    const lessons = T.lessonsOf(s).map((l) => l.title);
    return { title: (T.titleOf(s) + (lessons.length ? ": " + lessons.join(", ") : " (practical)")).slice(0, 200),
      summary: (lessons.length ? "Taught: " + lessons.join("; ") + "." : "Practical: " + T.titleOf(s) + ".").slice(0, 1000), ksbs: T.codesOf(s) };
  } catch (_) { return null; }
}
async function ensureSession(regId, key) {
  const st = App().getState(), reg = st.classes.find((c) => c.id === regId);
  if (!reg) throw new Error("That register has gone.");
  const people = regLearners(st, reg);
  if (!people.length) throw new Error("Add your Evia Portal learners to this register first.");
  const counts = {}; people.forEach((p) => { counts[p.nisia.org] = (counts[p.nisia.org] || 0) + 1; });
  const org = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0], m = tutorOrgs().find((o) => o.organisation_id === org);
  if (!m) throw new Error("You’re not a tutor at that college in Evia Portal.");
  const classId = await A.send("saveClass", { p_org: org, p_client_ref: reg.id, p_title: String(reg.name || "Class").slice(0, 120), p_room: reg.room || null,
    p_schedule: { day: reg.day, start: reg.start, end: reg.end, breaks: (reg.breaks || []).map((x) => ({ start: x.start, end: x.end })), recurrence: reg.recurrence || null }, p_enrolments: people.filter((p) => p.nisia.org === org).map((p) => p.nisia.enrolmentId) });
  const b = App().bounds(regId, key), lesson = (await lessonOn(st, regId, key)) || {};
  const ses = await A.send("openSession", { p_class: classId, p_date: key, p_starts: b ? new Date(b.start).toISOString() : null, p_ends: b ? new Date(b.end).toISOString() : null,
    p_lesson: lesson.title || null, p_summary: lesson.summary || null, p_ksbs: lesson.ksbs || [] });
  const map = read(K.sessions, {}); map[regId + ":" + key] = { id: ses.id, org, member: m.member_id }; write(K.sessions, map);
  return { id: ses.id, org, member: m.member_id, status: ses.status, people };
}

/* ---------- The changing code ----------
   It follows Evia Portal's clock, not this device's: a classroom laptop or tablet whose clock is out by half a minute
   would otherwise show codes Evia Portal reads as already changed. The difference is measured when the code is shown
   (and kept, for when there's no signal). */
const CLOCK = "symi.nisia.clock.v1";
let clockOff = Number(read(CLOCK, 0)) || 0;
const serverNow = () => Date.now() + clockOff;
async function syncClock() {
  if (!signedIn || !online()) return;
  try {
    const t0 = Date.now(), s = await rpc("nisia_now"), t1 = Date.now(), at = Date.parse(s);
    if (!isFinite(at) || t1 - t0 > 5000) return;
    clockOff = Math.round(at - (t0 + t1) / 2); write(CLOCK, clockOff);
  } catch (e) { console.warn("Symi: Evia Portal's clock", e.message); }
}
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/* Kept on this device (for two weeks), so the code still shows with no signal. */
async function hmacKey(sessionId) {
  const keys = read(K.keys, {});
  let k = keys[sessionId] && keys[sessionId].k;
  if (online()) {
    try { k = await A.send("sessionKey", { p_session: sessionId }); keys[sessionId] = { k, on: App().today() }; }
    catch (e) { if (!k) throw e; }
    const old = addDays(App().today(), -14);
    for (const [id, v] of Object.entries(keys)) if (!v || v.on < old) delete keys[id];
    write(K.keys, keys);
  }
  if (!k) throw new Error("There’s no signal, and this class’s code isn’t on this device yet. Open Symi with a signal once before the class.");
  const raw = Uint8Array.from(atob(k), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
export async function codeFor(sessionId, key, w) {
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sessionId + ":" + w)));
  return { qr: "NISI:IN:1:" + sessionId + ":" + w + ":" + b64u(sig), short: [...sig.slice(0, 6)].map((x) => ALPHA[x % 31]).join("") };
}

/* ---------- Check-ins: tick the learner and start their timer ---------- */
const checked = () => read(K.checked, {});
async function pollCheckIns(regId, key, sessionId, people) {
  const data = await A.send("checkIns", { p_session: sessionId });
  const all = checked(), mine = all[regId + ":" + key] || {};
  const fresh = [];
  for (const row of data || []) {
    const p = people.find((x) => x.nisia.enrolmentId === row.enrolment_id);
    if (!p || mine[p.id]) continue;
    mine[p.id] = { at: row.checked_in_at, late: row.late, offline: !!row.offline, fresh: Date.now() };
    fresh.push(p);
    App().startTimer(regId, p.id);
  }
  all[regId + ":" + key] = mine; write(K.checked, all);
  if (fresh.length) { toast(fresh.map((p) => p.name.split(" ")[0]).join(", ") + " checked in"); decorate(); }
  return mine;
}

/* ---------- Booked absences, marks, and anything waiting for a signal ---------- */
const absences = () => read(K.absences, []);
const bookedFor = (enrolmentId, key) => absences().find((a) => a.enrolment_id === enrolmentId && a.starts_on <= key && a.ends_on >= key) || null;
async function pullAbsences() {
  if (!signedIn || !online()) return;
  const t = App().today();
  const list = await A.send("classAbsences", { p_from: addDays(t, -7), p_to: addDays(t, 42) });
  write(K.absences, (list || []).concat(absences().filter((a) => a.local && A.waiting("absence").length)));
  decorate();
}
const marks = () => read(K.marks, {});
const markOf = (regId, key, id) => (marks()[regId + ":" + key] || {})[id] || null;
function setMark(regId, key, id, m) {
  const all = marks(), one = all[regId + ":" + key] || {};
  if (m) one[id] = { ...m, at: Date.now() }; else delete one[id];
  all[regId + ":" + key] = one;
  /* Kept for past registers (and their spreadsheets) for over a year. */
  const old = addDays(App().today(), -400);
  for (const k of Object.keys(all)) if (k.slice(-10) < old) delete all[k];
  write(K.marks, all);
}
const hm = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const markText = (m) => !m ? "" : (m.kind === "here" ? "Here" : m.kind === "late" ? "Late" : m.reason ? "Absent · " + m.reason : "Absent · no reason") +
  ((m.kind === "here" || m.kind === "late") && m.left ? " · left " + hm(m.left) : "");
const markCls = (m) => m.kind === "absent" ? (m.reason ? "why" : "no") : m.kind;
/* What was kept with no signal (days off booked): sent now there's signal. */
async function flush() {
  if (!signedIn || !online() || !A.waiting().length) return;
  (await A.flush()).filter((x) => !x.ok).forEach((x) => { console.warn("Symi: Evia Portal", x.name, x.error); toast("Evia Portal didn’t accept something saved with no signal: " + x.error); });
  await pullAbsences().catch(() => {});
}
/* The next week's sessions and keys, so the code works in a classroom with no signal (once a day). */
let preparing = false;
async function prepareAhead(force) {
  if (preparing || !signedIn || !online()) return;
  const t = App().today(), st0 = App().getState();
  /* Once a day, and again straight away when a class changes (its times, dates or learners), so Evia sees it. */
  const sig = t + "|" + JSON.stringify((st0.classes || []).map((c) => [c.id, c.name, c.archived, c.day, c.start, c.end, c.recurrence || null, regLearners(st0, c).map((p) => p.nisia.enrolmentId)]));
  if (!force && read(K.ready, "") === sig) return;
  preparing = true;
  try {
    const st = App().getState();
    for (const reg of st.classes || []) {
      if (reg.archived || !regLearners(st, reg).length) continue;
      for (let i = 0; i <= 7; i++) {
        const key = addDays(t, i);
        if (!App().occursOn(reg.id, key) || App().done(reg.id, key)) continue;
        try { const s = await ensureSession(reg.id, key); await hmacKey(s.id); } catch (e) { console.warn("Symi: getting ready", reg.name, key, e.message); }
      }
    }
    write(K.ready, sig);
  } finally { preparing = false; decorate(); }
}
const readyOffline = (regId, key) => { const s = read(K.sessions, {})[regId + ":" + key]; return !!(s && read(K.keys, {})[s.id]); };

/* One tap: here, late, or not here and why. */
function markSheet(regId, learnerId, key = App().today()) {
  const st = App().getState(), reg = st.classes.find((c) => c.id === regId), today = key === App().today();
  const l = reg && (reg.learners || []).find((x) => x.id === learnerId);
  if (!l) return;
  const n = nisiaOf(st, learnerId), m = markOf(regId, key, learnerId), booked = n && bookedFor(n.enrolmentId, key);
  const ci = (checked()[regId + ":" + key] || {})[learnerId], done = App().done(regId, key);
  const now = m ? m.kind : ci ? (ci.late ? "late" : "here") : "";
  const why = m && m.kind === "absent" ? m.reason || "" : "";
  /* Times: once the class has started (or for a finished register), the tutor can put in when the learner really came
     and, if they left early, when and why. */
  const code = today ? App().timing(regId) : null, b = App().bounds(regId, key);
  const canTime = done || (today && ["open-early", "live", "break", "ended"].includes(code));
  const tm = App().times(regId, key, learnerId), tIn = tm.in || (ci ? Date.parse(ci.at) : null), tOut = tm.out && b && tm.out < b.end - 60000 ? tm.out : null;
  const leftWhy = m && m.left ? m.leftReason || "" : "";
  const layer = sheet('<h2>' + esc(l.name) + '</h2>' +
    '<p class="sn-muted">' + (ci ? 'Checked in with Evia at ' + new Date(ci.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + (ci.offline ? ' (with no signal)' : '') + '. ' : '') +
      (booked ? 'Booked off: <b>' + esc(booked.reason) + '</b>' + (booked.booked_by ? ' (' + esc(booked.booked_by) + ')' : '') + '. ' : '') +
      (done ? 'This register is finished: a change goes to Evia Portal and is kept.' : '') + '</p>' +
    '<div class="sn-marks">' +
      '<button type="button" data-m="here" class="' + (now === "here" ? "on" : "") + '"><i aria-hidden="true">✓</i>Here</button>' +
      '<button type="button" data-m="late" class="' + (now === "late" ? "on" : "") + '"><i aria-hidden="true">◷</i>Late</button>' +
      '<button type="button" data-m="absent" class="' + (now === "absent" && !why ? "on" : "") + '"><i aria-hidden="true">✕</i>Absent, no reason</button></div>' +
    (canTime ? '<div class="sn-times"><p class="sn-label">Times</p>' +
      '<div class="sn-dates"><label>Arrived<input type="time" name="in" value="' + (tIn ? hm(tIn) : "") + '"></label><label>Left early at<input type="time" name="out" value="' + (tOut ? hm(tOut) : "") + '"></label></div>' +
      '<div class="sn-left-why"' + (tOut ? "" : " hidden") + '><p class="sn-label">Left early because…</p><div class="sn-reasons">' +
        LEFT_REASONS.map(([k, x]) => '<button type="button" data-l="' + k + '" class="' + (leftWhy === x ? "on" : "") + '">' + x + '</button>').join("") + '</div>' +
        '<input class="sn-input" name="leftwhy" maxlength="200" placeholder="Or type the reason" aria-label="Why they left early" value="' + esc(LEFT_REASONS.some(([, x]) => x === leftWhy) ? "" : leftWhy) + '" style="margin-top:10px;width:100%;box-sizing:border-box"></div>' +
      '<p class="sn-err-line" role="alert"></p><div class="sn-actions"><button type="button" class="blue-button" data-times>Save times</button></div></div>' : '') +
    '<p class="sn-label">Not here because…</p>' +
    '<div class="sn-reasons">' + REASONS.map(([k, t]) => '<button type="button" data-r="' + k + '" class="' + (why === t ? "on" : "") + '">' + t + '</button>').join("") + '</div>' +
    '<form class="sn-why"><input name="why" maxlength="200" placeholder="Or type the reason" value="' + esc(REASONS.some(([, t]) => t === why) ? "" : why) + '" aria-label="Reason"><button type="submit" class="blue-button">Save</button></form>' +
    (m ? '<button type="button" class="sn-link" data-clear>Clear the mark</button>' : '') +
    (n ? '<button type="button" class="sn-link" data-book>Book days off for ' + esc(first(l.name)) + '</button>' : ''));
  /* A past register's page draws itself again with the change. */
  const redraw = () => { if (App().getState().view === "pastRegister") App().mutate(() => {}); };
  const put = (mark, say) => {
    /* Here or late keeps when they left early. */
    if (mark && (mark.kind === "here" || mark.kind === "late") && m && m.left) mark = { ...mark, left: m.left, leftReason: m.leftReason || null, leftWhy: m.leftWhy || null };
    setMark(regId, key, learnerId, mark);
    const run = ((st.attendance || {})[regId + ":" + key] || {})[learnerId];
    const running = !!(run && run.runningSince);
    if (today && mark && (mark.kind === "here" || mark.kind === "late") && !running && LIVE.includes(App().timing(regId))) App().startTimer(regId, learnerId);
    if (today && mark && mark.kind === "absent" && running) { const b = document.querySelector('[data-toggle-timer="' + learnerId + '"]'); if (b) b.click(); }
    layer.remove(); syncLiveSoon();
    if (done) resend(regId, key);
    hit("register.mark");
    toast(say); decorate(); redraw();
  };
  const tf = layer.querySelector(".sn-times");
  if (tf) {
    let leftKey = m && m.left ? m.leftWhy || "" : "";
    const outIn = tf.querySelector("[name=out]"), whyBox = tf.querySelector(".sn-left-why"), err = tf.querySelector(".sn-err-line");
    outIn.oninput = () => { whyBox.hidden = !outIn.value; };
    tf.querySelectorAll("[data-l]").forEach((x) => { x.onclick = () => {
      leftKey = x.dataset.l; tf.querySelectorAll("[data-l]").forEach((y) => y.classList.toggle("on", y === x));
      if (leftKey === "other") tf.querySelector("[name=leftwhy]").focus(); else tf.querySelector("[name=leftwhy]").value = "";
    }; });
    const at = (v) => { const [h, mi] = v.split(":").map(Number), d = new Date(key + "T12:00:00"); d.setHours(h || 0, mi || 0, 0, 0); return d.getTime(); };
    tf.querySelector("[data-times]").onclick = () => {
      const vIn = tf.querySelector("[name=in]").value, vOut = outIn.value, typed = tf.querySelector("[name=leftwhy]").value.trim();
      if (!vIn) { err.textContent = "Put in when " + first(l.name) + " arrived."; return; }
      const inMs = at(vIn), outMs = vOut ? at(vOut) : null;
      if (today && inMs > Date.now() + 60000) { err.textContent = "That arrival time hasn’t happened yet."; return; }
      if (outMs != null && outMs <= inMs) { err.textContent = "They can’t leave before they arrive."; return; }
      if (outMs != null && today && outMs > Date.now() + 60000) { err.textContent = "That leaving time hasn’t happened yet."; return; }
      if (outMs != null && leftKey === "other" && !typed) { err.textContent = "Say why they left."; return; }
      if (!App().setTimes(regId, key, learnerId, inMs, outMs)) { err.textContent = "Times can be changed once the class has started."; return; }
      const reason = outMs == null ? null : typed || (LEFT_REASONS.find(([k]) => k === leftKey) || [])[1] || null;
      const kind = m && (m.kind === "here" || m.kind === "late") ? m.kind : ci && ci.late ? "late" : "here";
      setMark(regId, key, learnerId, { kind, left: outMs, leftReason: reason, leftWhy: outMs == null ? null : typed ? "other" : leftKey || null });
      layer.remove(); syncLiveSoon();
      if (done) resend(regId, key);
      hit("register.times");
      toast(first(l.name) + ": " + hm(inMs) + (outMs != null ? " to " + hm(outMs) + (reason ? " (" + reason + ")" : "") : today && !done ? " onwards" : "") + ". Saved.");
      decorate(); redraw();
    };
  }
  layer.querySelectorAll("[data-m]").forEach((b) => { b.onclick = () => put({ kind: b.dataset.m }, first(l.name) + ": " + markText({ kind: b.dataset.m })); });
  layer.querySelectorAll("[data-r]").forEach((b) => { b.onclick = () => {
    if (b.dataset.r === "other") { layer.querySelector("[name=why]").focus(); return; }
    put({ kind: "absent", reason: b.textContent, why: b.dataset.r }, first(l.name) + ": absent · " + b.textContent);
  }; });
  layer.querySelector(".sn-why").onsubmit = (e) => {
    e.preventDefault();
    const t = layer.querySelector("[name=why]").value.trim();
    if (!t) { layer.querySelector("[name=why]").focus(); return; }
    put({ kind: "absent", reason: t.slice(0, 200), why: "other" }, first(l.name) + ": absent · " + t);
  };
  const c = layer.querySelector("[data-clear]"); if (c) c.onclick = () => put(null, "Mark cleared");
  const bk = layer.querySelector("[data-book]"); if (bk) bk.onclick = () => { layer.remove(); bookSheet(n.enrolmentId, l.name); };
}
/* Days off booked from Symi: everyone with the learner is told. */
function bookSheet(enrolmentId, name) {
  const t = App().today();
  const layer = sheet('<h2>Book days off</h2><p class="sn-muted">' + esc(name) + '. They, their assessor and their employer are told, and it shows on every register those days.</p>' +
    '<div class="sn-dates"><label>First day<input type="date" name="from" value="' + t + '"></label><label>Last day<input type="date" name="to" value="' + t + '"></label></div>' +
    '<div class="sn-reasons">' + REASONS.map(([k, x]) => '<button type="button" data-k="' + k + '">' + x + '</button>').join("") + '</div>' +
    '<input class="sn-input" name="reason" maxlength="200" placeholder="In their words (optional, or needed for Other)" aria-label="Reason">' +
    '<p class="sn-err-line" role="alert"></p><div class="sn-actions"><button type="button" class="blue-button" data-save>Book</button></div>');
  let kind = "";
  layer.querySelectorAll("[data-k]").forEach((b) => { b.onclick = () => { kind = b.dataset.k; layer.querySelectorAll("[data-k]").forEach((x) => x.classList.toggle("on", x === b)); if (kind === "other") layer.querySelector("[name=reason]").focus(); }; });
  layer.querySelector("[data-save]").onclick = async () => {
    const from = layer.querySelector("[name=from]").value, to = layer.querySelector("[name=to]").value, reason = layer.querySelector("[name=reason]").value.trim(), err = layer.querySelector(".sn-err-line");
    if (!from || !to || to < from) return (err.textContent = "Choose the first and last day.");
    if (!kind) return (err.textContent = "Choose a reason.");
    if (kind === "other" && !reason) return (err.textContent = "Say what the reason is.");
    const btn = layer.querySelector("[data-save]"); btn.disabled = true;
    try {
      const sent = await A.send("bookAbsence", { p_from: from, p_to: to, p_kind: kind, p_reason: reason || null, p_enrolment: enrolmentId }, { tag: "absence" }), r = sent && sent.kept ? null : sent;
      const list = absences().filter((a) => !(a.local && a.enrolment_id === enrolmentId && a.starts_on === from));
      list.push({ id: r && r.id || "local-" + Date.now(), local: !r, enrolment_id: enrolmentId, starts_on: from, ends_on: to, kind, reason: reason || REASONS.find(([k]) => k === kind)[1], booked_by: who && who.name || "", booked_by_role: "tutor" });
      write(K.absences, list);
      layer.remove(); hit("absence.book");
      toast(r ? "Booked. " + first(name) + " and everyone with them has been told." : "Booked on this device. It goes to Evia Portal when there’s a signal.");
      decorate();
    } catch (e) { btn.disabled = false; err.textContent = e.message; }
  };
}

/* ---------- The classroom screen ---------- */
let open = null;
async function showCheckIn(regId) {
  hit("check-in.code");
  const key = App().today();
  const layer = document.createElement("div");
  layer.className = "sn-checkin"; layer.setAttribute("role", "dialog"); layer.setAttribute("aria-modal", "true"); layer.setAttribute("aria-label", "Check in");
  layer.innerHTML = '<p class="sn-wait"><span class="sn-spin" aria-hidden="true"></span>Getting the check-in code…</p>';
  document.body.appendChild(layer);
  let s, hk, offline = false;
  try { s = await ensureSession(regId, key); hk = await hmacKey(s.id); }
  catch (e) {
    /* No signal: the session and key fetched ahead still draw the code; learners' phones keep their scans. */
    const saved = read(K.sessions, {})[regId + ":" + key];
    try {
      if (!saved) throw e;
      hk = await hmacKey(saved.id);
      s = { ...saved, people: regLearners(App().getState(), App().getState().classes.find((c) => c.id === regId)) }; offline = true;
    } catch (e2) {
      layer.innerHTML = '<div class="sn-err"><p>' + esc(online() ? e.message : e2.message) + '</p><button type="button" class="blue-button" data-close>Close</button></div>';
      layer.querySelector("[data-close]").onclick = () => layer.remove(); return;
    }
  }
  await syncClock();
  const st = App().getState(), reg = st.classes.find((c) => c.id === regId), lesson = await lessonOn(st, regId, key);
  layer.innerHTML =
    '<header><div><small>CHECK IN · ' + esc(reg.name) + '</small><h2>' + esc(lesson && lesson.title || "Scan to check in") + '</h2></div>' +
      '<p class="sn-signal" hidden>No signal here: scans are kept on phones and sent when they can.</p><button type="button" class="sn-close" aria-label="Close">×</button></header>' +
    '<div class="sn-body"><div class="sn-qr" aria-label="Check-in QR code"></div>' +
      '<div class="sn-side"><ol><li>Open <b>Evia</b> and tap her</li><li>Tap <b>Check in to class</b></li><li>Scan this code</li></ol>' +
        '<p class="sn-or">No camera? Type</p><p class="sn-code" aria-live="polite"></p>' +
        '<div class="sn-timer"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5"/><circle class="sn-left" cx="18" cy="18" r="15.5"/></svg><span>Changes in <b class="sn-secs">20</b>s</span></div>' +
        '<p class="sn-note">It changes so a photo of it can’t be used later. Checking in ticks you on this register; your tutor confirms the hours.</p></div></div>' +
    '<footer><div class="sn-tally"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19"/><circle class="sn-fill" cx="22" cy="22" r="19"/></svg>' +
      '<p class="sn-count" aria-live="polite"></p></div><ul class="sn-names"></ul></footer>';
  const qr = layer.querySelector(".sn-qr"), short = layer.querySelector(".sn-code"), secs = layer.querySelector(".sn-secs"), left = layer.querySelector(".sn-left");
  let lastW = null, stop = false, lastN = -1;
  const tick = async () => {
    if (stop) return;
    const now = serverNow() / 1000, w = Math.floor(now / WINDOW), remain = WINDOW - (now % WINDOW);
    if (w !== lastW) {
      lastW = w;
      const c = await codeFor(s.id, hk, w);
      const size = Math.min(innerWidth * 0.52, innerHeight * 0.58, 460);
      if (window.SamosQR) window.SamosQR.render(qr, c.qr, Math.round(size)); else qr.textContent = c.qr;
      short.textContent = c.short.slice(0, 3) + " " + c.short.slice(3);
      qr.classList.remove("sn-flip"); void qr.offsetWidth; qr.classList.add("sn-flip");
    }
    secs.textContent = Math.ceil(remain);
    left.style.strokeDashoffset = String(97.4 * (1 - remain / WINDOW));
  };
  const names = async () => {
    let mine = {};
    const signal = online();
    try { if (!signal) throw new Error("offline"); mine = await pollCheckIns(regId, key, s.id, s.people); } catch (_) { mine = (checked()[regId + ":" + key]) || {}; }
    layer.querySelector(".sn-signal").hidden = signal && !offline;
    if (signal && offline) offline = false;
    const off = s.people.filter((p) => !mine[p.id] && bookedFor(p.nisia.enrolmentId, key));
    const due = s.people.length - off.length, n = s.people.filter((p) => mine[p.id]).length;
    const count = layer.querySelector(".sn-count");
    count.innerHTML = '<span><b>' + n + '</b> of ' + due + ' checked in</span>' + (off.length ? '<small>' + off.length + ' booked off</small>' : '') + (n >= due && due ? '<em>Everyone’s here</em>' : '');
    if (n !== lastN) { count.classList.remove("sn-bump"); void count.offsetWidth; count.classList.add("sn-bump"); lastN = n; }
    layer.querySelector(".sn-fill").style.strokeDashoffset = String(119.4 * (1 - (due ? Math.min(1, n / due) : 0)));
    layer.classList.toggle("sn-all", n >= due && due > 0);
    const order = [...s.people].sort((a, b) => (mine[a.id] ? 0 : off.includes(a) ? 2 : 1) - (mine[b.id] ? 0 : off.includes(b) ? 2 : 1) || ((mine[a.id] || {}).at || "").localeCompare((mine[b.id] || {}).at || ""));
    layer.querySelector(".sn-names").innerHTML = order.map((p, i) => {
      const x = mine[p.id], b = !x && bookedFor(p.nisia.enrolmentId, key), fresh = x && x.fresh && Date.now() - x.fresh < 6000;
      return '<li class="' + (x ? "on" : b ? "off" : "") + (fresh ? " sn-new" : "") + '" style="--i:' + i + '">' + esc(p.name) +
        (x && x.late ? ' <small>late</small>' : '') + (x && x.offline ? ' <small>no signal</small>' : '') + (b ? ' <small>' + esc(b.reason) + '</small>' : '') + '</li>';
    }).join("");
  };
  const t1 = setInterval(tick, 250), t2 = setInterval(names, 3000);
  const close = () => { stop = true; clearInterval(t1); clearInterval(t2); layer.remove(); open = null; decorate(); };
  layer.querySelector(".sn-close").onclick = close;
  layer.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  open = { regId, close };
  tick(); names();
}

/* ---------- The register: the check-in button, who's checked in, and each learner's mark ---------- */
let decorating = false, bgPoll = null, bgPollFor = "";
const shownMarks = new Map();
function decorate() {
  if (decorating) return; decorating = true;
  try {
    const host = document.querySelector("#registerWorkspace .clean-register-card");
    document.querySelectorAll(".sn-bar").forEach((x) => x.remove());
    if (!host) return;
    const st = App().getState(), regId = App().activeRegisterId(), reg = st.classes.find((c) => c.id === regId);
    if (!reg) return;
    /* A class the college set up in Evia Portal: one badge by its name (not a tag on every learner). */
    const h2 = host.querySelector(".clean-register-head h2");
    if (h2 && reg.managed && !h2.querySelector(".sn-managed")) h2.insertAdjacentHTML("beforeend", ' <span class="sn-managed" title="Set up by your college in Evia Portal. You can still change it.">From Evia Portal</span>');
    const key = App().today(), code = App().timing(regId), people = regLearners(st, reg), sent = read(K.sent, {})[regId + ":" + key];
    const mine = checked()[regId + ":" + key] || {}, off = people.filter((p) => !mine[p.id] && bookedFor(p.nisia.enrolmentId, key));
    const bar = document.createElement("div"); bar.className = "sn-bar"; bar.dataset.n = String(people.length);
    const pills = (off.length ? '<em class="sn-pill">' + off.length + ' booked off</em>' : '') + (readyOffline(regId, key) ? '<em class="sn-pill" title="The code works here with no signal">Ready offline</em>' : '');
    if (!signedIn) bar.innerHTML = '<span>Sign in to Evia Portal so learners can check in with Evia and their hours count.</span><button type="button" class="soft-button" data-sn-connect>Connect to Evia Portal</button>';
    else if (!people.length) bar.innerHTML = '<span>None of this register’s learners are from Evia Portal. Add them with <b>+ Learner</b> so they can check in.</span>';
    else if (LIVE.includes(code)) {
      const n = Object.keys(mine).length;
      bar.innerHTML = '<span><b>' + n + ' of ' + (people.length - off.length) + '</b> checked in with Evia ' + pills + '</span><button type="button" class="blue-button" data-sn-show>Show check-in code</button>';
    } else if (code === "completed") {
      const fail = read(K.failed, {})[regId + ":" + key];
      bar.innerHTML = sent ? '<span class="sn-ok">Sent to Evia Portal. The hours are in your learners’ Evia. Tap a mark to change it.</span>'
        : fail ? '<span class="sn-fail"><b>Not sent to Evia Portal yet.</b> Evia Portal said: ' + esc(fail.message) + '. Symi keeps it and tries again every minute.</span><button type="button" class="soft-button" data-sn-retry>Try again</button>'
        : '<span>Waiting to send to Evia Portal…</span>';
    }
    else if (["early", "not-today"].includes(code) && (off.length || readyOffline(regId, key))) bar.innerHTML = '<span>Today ' + pills + '</span>';
    else if (code === "ended") bar.innerHTML = '<span>Session ended. Check the marks, then Finish.</span>';
    /* Days off booked for this register's coming classes (the next four weeks), so the tutor knows before the day. */
    const ahead = new Map(), day = (k) => { const d = new Date(k + "T12:00:00"); return d.toLocaleDateString("en-GB", { weekday: "short" }) + " " + d.getDate() + " " + d.toLocaleDateString("en-GB", { month: "short" }); };
    if (signedIn) for (let i = 1; i <= 28; i++) {
      const k = addDays(key, i);
      if (!App().occursOn(regId, k)) continue;
      people.forEach((p) => { const b = bookedFor(p.nisia.enrolmentId, k); if (!b) return; const g = p.id + "|" + b.reason; if (!ahead.has(g)) ahead.set(g, { name: first(p.name), reason: b.reason, days: [] }); ahead.get(g).days.push(day(k)); });
    }
    const listed = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
    if (ahead.size) bar.insertAdjacentHTML("beforeend", '<small class="sn-ahead">Coming up: ' + [...ahead.values()].slice(0, 4).map((x) => esc(x.name) + ' off ' + esc(listed(x.days)) + ' (' + esc(x.reason) + ')').join(" · ") + '</small>');
    if (!bar.innerHTML) return;
    host.insertBefore(bar, host.children[1] || null);
    const c = bar.querySelector("[data-sn-connect]"); if (c) c.onclick = openSignIn;
    const sh = bar.querySelector("[data-sn-show]"); if (sh) sh.onclick = () => showCheckIn(regId);
    const rt = bar.querySelector("[data-sn-retry]"); if (rt) rt.onclick = () => { rt.disabled = true; rt.textContent = "Sending…"; sendFinished(); };
    /* Every learner gets a mark (and their times), whether or not they're from Evia Portal: only Evia Portal learners'
       marks go to Evia Portal, but the tutor's register is theirs either way. */
    const marking = ["early", "open-early", "live", "break", "ended", "completed"].includes(code);
    host.querySelectorAll("[data-attendance-learner]").forEach((row) => {
      const id = row.dataset.attendanceLearner, x = mine[id], n = row.querySelector(".attendance-name strong");
      if (!n) return;
      /* Checked in: a tick next to the name. */
      if (x && !n.querySelector(".sn-tick")) n.insertAdjacentHTML("beforeend", ' <span class="sn-tick" title="Checked in with Evia">✓ ' + new Date(x.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + (x.late ? " · late" : "") + (x.offline ? " · no signal" : "") + '</span>');
      const p = people.find((q) => q.id === id) || (reg.learners || []).find((q) => q.id === id);
      /* The mark: one button. Symi draws the register again every second, so the mark only fades in when it's new or
         has changed (fading in every time, it would flicker). */
      const old = [...row.querySelectorAll(".sn-mark")];
      const m = p && marking ? markOf(regId, key, id) : null, b = p && p.nisia && marking ? bookedFor(p.nisia.enrolmentId, key) : null;
      /* No mark yet: someone whose timer ran was here; once the class is over, anyone else was absent. */
      const ran = !m && !x && p && marking && !!App().times(regId, key, id).in;
      const label = !p || !marking ? "" : m ? markText(m) : x ? "" : b ? "Off · " + b.reason : ran ? "Here" : code === "completed" || code === "ended" ? "Absent · no reason" : "Mark";
      const cls = m ? markCls(m) : b ? "why" : ran ? "here" : label === "Mark" ? "" : "no";
      if (old.length === 1 && label && old[0].textContent === label && old[0].className.replace(" sn-still", "") === "sn-mark " + cls && old[0].parentElement === n.parentElement) return;
      old.forEach((o) => o.remove());
      if (!label) return;
      const btn = document.createElement("button");
      const was = shownMarks.get(regId + "|" + id); shownMarks.set(regId + "|" + id, cls + "|" + label);
      btn.type = "button"; btn.className = "sn-mark " + cls + (was === cls + "|" + label ? " sn-still" : ""); btn.textContent = label; btn.setAttribute("aria-label", "Mark for " + p.name + ": " + label);
      btn.onclick = (e) => { e.stopPropagation(); markSheet(regId, id); };
      n.parentElement.appendChild(btn);
    });
    /* Checked in learners: a mark button too (to change it), small. */
    host.querySelectorAll(".sn-tick").forEach((t) => { t.setAttribute("role", "button"); t.tabIndex = 0; const id = t.closest("[data-attendance-learner]").dataset.attendanceLearner; t.onclick = () => markSheet(regId, id); });
    /* While the session's on, keep ticking learners in even with the code closed: straight away when the register
       is shown (after a reload too), then every 15 seconds. The register redraws often, so the timer is only
       restarted when the register or session changes, or it would never get to fire. */
    const s = read(K.sessions, {})[regId + ":" + key], want = s && LIVE.includes(code) && !open ? regId + ":" + key + ":" + s.id : "";
    if (want !== bgPollFor) {
      clearInterval(bgPoll); bgPoll = null; bgPollFor = want;
      if (want) {
        const poll = () => { if (online() && !document.hidden) pollCheckIns(regId, key, s.id, regLearners(App().getState(), App().getState().classes.find((c) => c.id === regId) || reg)).catch(() => {}); };
        setTimeout(poll, 0); bgPoll = setInterval(poll, 15000);
      }
    }
  } finally { decorating = false; }
}

/* ---------- Finished registers → Evia Portal ---------- */
function resend(regId, key) { const sent = read(K.sent, {}); delete sent[regId + ":" + key]; write(K.sent, sent); sendFinished(); }
let sending = false;
async function sendFinished() {
  if (sending || !signedIn || !online()) return;
  sending = true;
  try {
    const st = App().getState(), sent = read(K.sent, {}), cutoff = new Date(Date.now() - 42 * 864e5).toISOString().slice(0, 10);
    for (const row of st.history || []) {
      if (!row || !row.sessionKey || sent[row.sessionKey] || !row.date || row.date < cutoff) continue;
      const reg = st.classes.find((c) => c.id === row.classId);
      if (!reg) continue;
      /* Only learners linked to Evia Portal on or before that day (older history stays in Symi). */
      const rows = Object.entries(row.data || {}).map(([id, d]) => ({ id, d, n: nisiaOf(st, id) })).filter((x) => x.n && x.n.linkedAt <= row.date);
      if (!rows.length) continue;
      try {
        const s = await ensureSession(row.classId, row.date);
        const now = new Date().toISOString(), mk = marks()[row.sessionKey] || {}, b = App().bounds(row.classId, row.date);
        /* What Evia Portal already has: check-ins (some made with no signal, which this Symi may not have seen). */
        const there = await A.send("checkIns", { p_session: s.id });
        const seen = new Map((there || []).map((a) => [a.enrolment_id, a]));
        const up = rows.filter((x) => x.n.org === s.org).map((x) => {
          const m = mk[x.id], a = seen.get(x.n.enrolmentId), inAt = a && a.checked_in_at ? Date.parse(a.checked_in_at) : null;
          let ms = Number(x.d.attendedMs) || 0;
          const here = m ? m.kind === "here" || m.kind === "late" : ms > 0 || !!inAt;
          /* Checked in, but this Symi had no signal to start their timer: from check-in to the end of the session. */
          if (here && !ms && inAt && b) ms = Math.max(0, b.end - Math.max(inAt, b.start));
          /* When they came and, if before the end, when they left (and why). */
          const tm = App().times(row.classId, row.date, x.id), came = here ? tm.in || inAt : null, went = here && tm.out && b && tm.out < b.end - 60000 ? tm.out : null;
          const iso = (v) => v ? new Date(v).toISOString() : null;
          return { enrolment_id: x.n.enrolmentId, minutes: here ? Math.round(ms / 60000) : 0,
            status: here ? "present" : "absent", late: here && (m ? m.kind === "late" : !!(a && a.late)), reason: here ? null : (m && m.reason) || null,
            arrived_at: iso(came), left_at: iso(went), left_reason: went ? (m && m.leftReason) || null : null };
        });
        await A.run("finishRegister", { p_session: s.id, p_marks: up });
        sent[row.sessionKey] = now; write(K.sent, sent); hit("register.sent");
        const fails = read(K.failed, {}); delete fails[row.sessionKey]; write(K.failed, fails);
      } catch (e) {
        console.warn("Symi: Evia Portal", row.sessionKey, e.message);
        /* Said on the register, so a register that can't reach Evia Portal never looks as if it's on its way. */
        const fails = read(K.failed, {}); fails[row.sessionKey] = { at: Date.now(), message: String(e.message || e) }; write(K.failed, fails);
      }
    }
  } finally { sending = false; decorate(); }
}

/* ---------- The same register on every device ----------
   Today's registers are kept in Evia Portal while they're on: when each started, every learner's timer, every mark,
   and whether it's finished. A register started on the phone shows as started on the desktop, and a mark made on
   either shows on both. Each learner's timer and mark is one piece; the newest change to it wins (Evia Portal stamps
   the time, so devices whose clocks differ agree). Only learners from Evia Portal are shared, by their enrolment. */
const LIVE_KEY = "symi.nisia.live.v1";
/* The same thing always gives the same text, whatever order its parts come back in. */
const sig = (x) => JSON.stringify(x, (k, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).sort().reduce((o, n) => (o[n] = v[n], o), {}) : v);
const timerOf = (r) => ({ intervals: (r && Array.isArray(r.intervals) ? r.intervals : []).map((i) => ({ start: Number(i.start), end: Number(i.end) })), runningSince: r && r.runningSince ? Number(r.runningSince) : null });
const markPart = (m) => ({ mark: m ? { kind: m.kind, reason: m.reason || null, why: m.why || null, left: m.left || null, leftReason: m.leftReason || null, leftWhy: m.leftWhy || null } : null });
const NONE = { timers: sig(timerOf(null)), marks: sig(markPart(null)) };
function liveLocal(st, reg, key) {
  const a = (st.attendance || {})[reg.id + ":" + key] || {}, mk = marks()[reg.id + ":" + key] || {}, timers = {}, mks = {};
  for (const p of regLearners(st, reg)) { timers[p.nisia.enrolmentId] = timerOf(a[p.id]); mks[p.nisia.enrolmentId] = markPart(mk[p.id]); }
  const done = (st.history || []).find((h) => h.classId === reg.id && h.date === key);
  return { startedAt: (a._meta && Number(a._meta.startedAt)) || null, finished: done ? { endAt: Date.now(), auto: !!done.autoCompleted, doneAt: Number(done.doneAt) || 0 } : null, timers, marks: mks };
}
/* Opened again after it was finished (app.js): Evia Portal takes the finish off (and the tutor's other devices open it
   too). Kept on the device till Evia Portal has heard; till then this device doesn't take the old finish back. */
function reopened(regId, key) {
  const k = regId + ":" + key, sent = read(K.sent, {}), fails = read(K.failed, {}), want = read(K.reopen, {});
  delete sent[k]; write(K.sent, sent); delete fails[k]; write(K.failed, fails);
  want[k] = Date.now(); write(K.reopen, want);
  sendReopen().then(syncLiveSoon);
}
async function sendReopen() {
  if (!signedIn || !online()) return;
  const want = read(K.reopen, {});
  for (const k of Object.keys(want)) {
    if (Date.now() - want[k] > 2 * 864e5) { delete want[k]; continue; }
    const at = k.lastIndexOf(":"), s = read(K.sessions, {})[k] || await ensureSession(k.slice(0, at), k.slice(at + 1)).catch(() => null);
    if (!s || !s.id) continue;
    try { await rpc("symi_reopen_register", { p_session: s.id }); delete want[k]; const known = read(LIVE_KEY, {}); if (known[s.id]) { known[s.id].finished = false; write(LIVE_KEY, known); } }
    catch (e) { console.warn("Symi: opening the register again in Evia Portal", e.message); }
  }
  write(K.reopen, want);
}
let liveBusy = false, liveAgain = false;
const liveTried = {};
async function syncLive() {
  if (!signedIn || !online()) return;
  if (liveBusy) { liveAgain = true; return; }
  liveBusy = true;
  try {
    await sendReopen();
    const st = App().getState(), key = App().today(), sessions = read(K.sessions, {}), known = read(LIVE_KEY, {}), items = [], regs = [], waiting = read(K.reopen, {});
    for (const reg of st.classes || []) {
      if (reg.archived || !App().occursOn(reg.id, key) || waiting[reg.id + ":" + key]) continue;
      if (!regLearners(st, reg).length) continue;
      /* Today's session in Evia Portal (made ahead, or now): the same one on every device. */
      let s = sessions[reg.id + ":" + key];
      if (!s && !(liveTried[reg.id] > Date.now() - 300000)) { liveTried[reg.id] = Date.now(); s = await ensureSession(reg.id, key).catch(() => null); }
      if (!s) continue;
      const loc = liveLocal(st, reg, key), k = known[s.id] || { timers: {}, marks: {} }, out = {};
      if (loc.startedAt && loc.startedAt !== k.startedAt) out.startedAt = loc.startedAt;
      if (loc.finished && !k.finished) out.finished = loc.finished;
      /* Only what changed on this device since it last heard from Evia Portal. */
      for (const part of ["timers", "marks"]) for (const [e, v] of Object.entries(loc[part])) if (sig(v) !== (k[part][e] || NONE[part])) (out[part] = out[part] || {})[e] = v;
      items.push({ session: s.id, state: out }); regs.push({ reg, s, loc });
    }
    if (!items.length) return;
    const res = await rpc("symi_registers_sync", { p_items: items }), next = {};
    for (const r of res || []) {
      const x = regs.find((y) => y.s.id === r.session);
      if (!x) continue;
      const sv = r.state || {}, k = { timers: {}, marks: {}, startedAt: Number(sv.startedAt) || null, finished: !!(sv.finished && sv.finished.at) };
      const idOf = Object.fromEntries(regLearners(App().getState(), x.reg).map((p) => [p.nisia.enrolmentId, p.id]));
      const timers = {}; let marked = false;
      for (const [e, v] of Object.entries(sv.timers || {})) { const t = timerOf(v); k.timers[e] = sig(t); if (idOf[e] && sig(t) !== sig(x.loc.timers[e] || timerOf(null))) timers[idOf[e]] = t; }
      for (const [e, v] of Object.entries(sv.marks || {})) { const m = markPart(v.mark); k.marks[e] = sig(m); if (idOf[e] && sig(m) !== sig(x.loc.marks[e] || markPart(null))) { setMark(x.reg.id, key, idOf[e], m.mark); marked = true; } }
      next[r.session] = k;
      /* Opened again on another device: this device's finish (made before then) comes off too. */
      if (!k.finished && sv.reopenedAt && x.loc.finished && x.loc.finished.doneAt <= Number(sv.reopenedAt)) {
        const sent = read(K.sent, {}); delete sent[x.reg.id + ":" + key]; write(K.sent, sent);
        App().reopen(x.reg.id, key); continue;
      }
      const started = k.startedAt && k.startedAt !== x.loc.startedAt, finished = k.finished && !x.loc.finished;
      if (Object.keys(timers).length || started || finished) App().applyLive(x.reg.id, key, { startedAt: k.startedAt, timers, finished: finished ? sv.finished : null });
      else if (marked) decorate();
    }
    write(LIVE_KEY, next);
  } catch (e) { console.warn("Symi: the register on your other devices", e.message); }
  finally { liveBusy = false; if (liveAgain) { liveAgain = false; setTimeout(syncLive, 300); } }
}
let liveSoon = null;
const syncLiveSoon = () => { clearTimeout(liveSoon); liveSoon = setTimeout(syncLive, 400); };
setInterval(() => { if (!document.hidden) syncLive(); }, 8000);
const comeBack = () => { if (!document.hidden) { syncLive(); pullAbsences().catch(() => {}); } };
document.addEventListener("visibilitychange", comeBack);
addEventListener("focus", comeBack);
addEventListener("pageshow", (e) => { if (e.persisted) comeBack(); });

/* ---------- The same Symi on every device ----------
   The tutor's own learners, registers, classes, finished registers and marks (including learners who aren't from
   Evia Portal) are kept with their Evia Portal account. Each device merges what's kept with its own (app.js keeps the
   newest change to each), then puts the result back: on opening, on coming back to Symi, a few seconds after a
   change, and every minute. Only what has changed is fetched. */
const BACKUP_AT = "symi.nisia.backup-at.v1";
function mergeMarks(remote, map) {
  if (!remote || typeof remote !== "object") return false;
  const all = marks(); let changed = false;
  for (const [k, one] of Object.entries(remote)) {
    if (!one || typeof one !== "object") continue;
    const mine = all[k] || {};
    for (const [id0, m] of Object.entries(one)) {
      const id = (map && map[id0]) || id0;
      if (m && (!mine[id] || (Number(m.at) || 0) > (Number(mine[id].at) || 0))) { mine[id] = m; changed = true; }
    }
    all[k] = mine;
  }
  if (changed) write(K.marks, all);
  return changed;
}
let backupBusy = false, backupAgain = false, backupSent = "";
async function syncBackup() {
  if (!signedIn || !online() || !App() || !App().exportSync) return;
  if (backupBusy) { backupAgain = true; return; }
  backupBusy = true;
  try {
    const got = await rpc("symi_backup_get", { p_since: read(BACKUP_AT, null) });
    let fresh = false;
    if (got && got.state) {
      const r = App().mergeSync(got.state);
      const mk = mergeMarks(got.state.marks, r.map);
      fresh = r.changed || mk;
      if (mk) decorate();
      write(BACKUP_AT, got.updated_at);
    }
    const mine = { ...App().exportSync(), marks: marks() }, text = sig(mine);
    /* Put back only when this device has something the account doesn't. */
    if (text !== backupSent && (!got || !got.state || sig({ ...got.state }) !== text || fresh)) {
      const at = await rpc("symi_backup_put", { p_state: mine });
      write(BACKUP_AT, at);
    }
    backupSent = text;
  } catch (e) { console.warn("Symi: your registers on your other devices", e.message); }
  finally { backupBusy = false; if (backupAgain) { backupAgain = false; setTimeout(syncBackup, 500); } }
}
let backupSoon = null;
const syncBackupSoon = () => { clearTimeout(backupSoon); backupSoon = setTimeout(syncBackup, 3000); };
setInterval(() => { if (!document.hidden) syncBackup(); }, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) syncBackup(); });

/* ---------- Start ---------- */
let queued = false;
window.addEventListener("symi:render", () => {
  chip();
  if (signedIn) { syncLiveSoon(); syncBackupSoon(); }
  if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; decorate(); if (signedIn) sendFinished(); });
});
/* Symi's ticker redraws the register every second during a session, without a render event: put the bar back. */
new MutationObserver(() => {
  const card = document.querySelector("#registerWorkspace .clean-register-card");
  const regId = card && App() && App().activeRegisterId(), mine = regId ? checked()[regId + ":" + App().today()] || {} : {};
  const bar = card && card.querySelector(".sn-bar");
  const lost = card && ((Object.keys(mine).length && !card.querySelector(".sn-tick")) || (signedIn && bar && bar.dataset.n !== "0" && !card.querySelector(".sn-mark, .sn-tick") && App().timing(regId) !== "outside-dates"));
  if (card && (!card.querySelector(".sn-bar") || lost) && !queued) { queued = true; requestAnimationFrame(() => { queued = false; decorate(); }); }
}).observe(document.body, { childList: true, subtree: true });
/* Coming back to Symi: any classes the college has set up or changed since (at most once a minute). */
let classesAt = 0;
document.addEventListener("visibilitychange", () => { if (!document.hidden && signedIn && Date.now() - classesAt > 60000) { classesAt = Date.now(); pullClasses().then(() => prepareAhead()).catch(() => {}); } });
addEventListener("online", () => { if (signedIn) { pullLearners(false).then(pullClasses).catch(() => {}); flush().then(sendFinished); prepareAhead(); } decorate(); });
addEventListener("offline", () => decorate());
setInterval(() => { if (signedIn && !document.hidden) { sendFinished(); flush(); prepareAhead(); } }, 60000);
setInterval(() => { if (signedIn && !document.hidden) pullAbsences().catch(() => {}); }, 5 * 60000);
(async () => {
  chip();
  if (inviteCode() || resetCode() || /[?&]reset=email/.test(location.search)) return openSignIn();
  if (await checkSession()) { decorate(); await syncBackup(); try { await pullLearners(false); await pullClasses(); await pullAbsences(); } catch (_) {} await flush(); sendFinished(); syncLive(); prepareAhead(); }
})();

/* ---------- The class quiz on learners' phones (symi-teach.js runs it) ----------
   The tutor starts it on the classroom screen; learners on the class answer in Evia. Needs Evia Portal and a signal: with
   neither, the quiz is the hands-up kind. */
window.SymiNisia = {
  live: () => signedIn && online(),
  reopened,
  /* Symi's past registers (app.js): each learner's mark, and changing it. */
  markInfo: (regId, key, id) => {
    const m = markOf(regId, key, id);
    if (m) return { mark: m.kind === "here" ? "Here" : m.kind === "late" ? "Late" : "Absent", reason: m.kind === "absent" ? m.reason || "No reason given" : "",
      leftReason: (m.kind === "here" || m.kind === "late") && m.left ? m.leftReason || "Not given" : "", label: markText(m), cls: markCls(m) };
    const n = nisiaOf(App().getState(), id), bk = n && bookedFor(n.enrolmentId, key);
    return bk ? { mark: "Absent", reason: bk.reason, leftReason: "", label: "Off · " + bk.reason, cls: "why" } : null;
  },
  canMark: (regId, id) => { const r = App().getState().classes.find((c) => c.id === regId); return !!(r && (r.learners || []).some((l) => l.id === id)) || !!nisiaOf(App().getState(), id); },
  openMark: (regId, id, key) => markSheet(regId, id, key),
  quizStart: async (regId, key, title, questions) => { const s = await ensureSession(regId, key); return A.send("quizStart", { p_session: s.id, p_title: String(title || "Class quiz").slice(0, 200), p_questions: questions }); },
  quizStep: (id, current, revealed, finished) => A.send("quizStep", { p_quiz: id, p_current: current, p_revealed: !!revealed, p_finished: !!finished }),
  quizState: (id) => A.send("quizState", { p_quiz: id }),
  /* The college's shared resources (Resources › College). */
  college: () => (tutorOrgs()[0] || null),
  resources: async () => { const o = tutorOrgs()[0]; if (!o) throw new Error("You’re not a tutor at a college in Evia Portal."); return A.send("collegeResources", { p_org: o.organisation_id }); },
  share: async (kind, title, opts) => { const o = tutorOrgs()[0]; if (!o) throw new Error("You’re not a tutor at a college in Evia Portal.");
    return A.send("shareResource", { p_org: o.organisation_id, p_kind: kind, p_title: title, p_course: (opts && opts.course) || null, p_unit: (opts && opts.unit) || null, p_content: (opts && opts.content) || {}, p_url: (opts && opts.url) || null }); },
  unshare: (id) => A.send("unshareResource", { p_id: id }),
};

/* ---------- Messages: the icon next to the profile button, with the unread count (packages/core/messages-ui.js) ---------- */
window.NisiaMessages.mount({ app: "symi", color: "#38A96B", ink: "#1e7a4c", soft: "#E3F4EA", group: true, rpc, ready: () => signedIn,
  place: (btn) => { const pb = document.getElementById("profileButton"); if (!pb) { btn.remove(); return; } if (btn.nextElementSibling !== pb) pb.parentElement.insertBefore(btn, pb); } });

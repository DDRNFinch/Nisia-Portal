/* Symi on Nisia. Symi still works on its own, offline, with everything on this device; signing in to Nisia adds:
   - Learners: the tutor's learners come from Nisia (their enrolments), matched to learners already in Symi by name,
     so existing registers keep their history.
   - Check-in: during a session, "Show check-in code" puts a QR on the classroom screen that changes every 20 seconds,
     with a 6-character code under it for phones without a camera. Learners scan it in Evia; Nisia checks it (only
     this Symi holds the session's key) and their timer here starts. A photo sent to a friend has expired before it
     can be used, and it only ticks the learner here: the tutor's register is the record.
   - Hours: when a register is finished (or Symi closes it at the end of the session), each Nisia learner's minutes go
     to Nisia with what was taught and its KSBs. They become the learner's college hours in Evia, confirmed by the
     tutor, and employers see them in Paros. Sent again later if there's no signal.
   Everything Nisia needs is sent from Symi's own records: its history rows and the lesson set for each session. */
import { db, me, rpc, esc, signOut } from "../../packages/core/nisia.js";
import { auth, inviteCode } from "../../packages/core/signin.js";

const App = () => window.SamosApp;
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch (_) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
const K = { who: "symi.nisia.who.v1", sessions: "symi.nisia.sessions.v1", sent: "symi.nisia.sent.v1", checked: "symi.nisia.checked.v1" };
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
  auth(layer.querySelector(".sn-auth-root"), { title: "Symi", subtitle: "Sign in with your Nisia account", onReady: async () => {
    try {
      who = await me(); write(K.who, who);
      if (!tutorOrgs().length) { layer.remove(); await signOut(); who = null; write(K.who, null); toast("That Nisia account isn’t a tutor"); return chip(); }
      layer.remove(); signedIn = true; chip();
      await pullLearners(true); sendFinished();
    } catch (e) { layer.remove(); toast("Couldn’t reach Nisia: " + e.message); }
  } }).catch((e) => { layer.querySelector(".sn-auth-root").innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
}
function account() {
  const layer = sheet('<h2>Nisia</h2><p class="sn-muted">Signed in as <b>' + esc(who && who.name || "") + '</b> · ' + esc(tutorOrgs().map((o) => o.organisation).join(", ")) + '</p>' +
    '<p class="sn-muted">Your learners come from Nisia. Learners check in with Evia, and finished registers become their college hours.</p>' +
    '<div class="sn-actions"><button type="button" class="blue-button" data-pull>Update learners from Nisia</button><button type="button" class="soft-button" data-out>Sign out of Nisia</button></div>');
  layer.querySelector("[data-pull]").onclick = async () => { layer.remove(); await pullLearners(true); };
  layer.querySelector("[data-out]").onclick = async () => { layer.remove(); await signOut(); who = null; write(K.who, null); signedIn = false; chip(); toast("Signed out of Nisia. Symi keeps working on this device."); };
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
/* The Nisia button in the header. */
function chip() {
  const nav = document.querySelector(".header-utility-actions");
  if (!nav) return;
  let b = document.getElementById("nisiaButton");
  if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "nisiaButton"; nav.insertBefore(b, nav.firstChild); }
  b.className = "sn-chip" + (signedIn ? " on" : "");
  b.innerHTML = '<i aria-hidden="true"></i>' + (signedIn ? "Nisia" : "Connect to Nisia");
  b.onclick = () => (signedIn ? account() : openSignIn());
}

/* ---------- Learners from Nisia ---------- */
async function pullLearners(say) {
  if (!signedIn || !navigator.onLine) return;
  const found = [];
  for (const o of tutorOrgs()) {
    const list = await rpc("nisia_college_learners", { p_org: o.organisation_id });
    const mine = o.roles.includes("admin") && !o.roles.includes("tutor") ? list : list.filter((l) => (l.assessors || []).some((a) => a.member_id === o.member_id));
    found.push(...mine.filter((l) => l.enrolment_id).map((l) => ({ ...l, org: o.organisation_id })));
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
  if (say) toast(found.length ? found.length + (found.length === 1 ? " learner" : " learners") + " from Nisia" + (added ? " (" + added + " new)" : "") : "No learners in Nisia for you yet");
}
const nisiaOf = (st, learnerId) => { const l = st.learners.find((x) => x.id === learnerId); return l && l.nisia || null; };
const regLearners = (st, reg) => (reg.learners || []).map((l) => ({ id: l.id, name: l.name, nisia: nisiaOf(st, l.id) })).filter((x) => x.nisia);

/* ---------- The session in Nisia ---------- */
function lessonFor(st, regId, key) {
  const id = (read("symi.session.lesson.v1", {}) || {})[regId + ":" + key];
  const r = id && (st.resources || []).find((x) => x.id === id);
  if (!r) return null;
  const f = r.fields || {};
  const ksbs = [...new Set((r.linkedKSBs || []).map((k) => typeof k === "string" ? k : k && k.code).filter(Boolean))];
  return { title: String(r.title || f.topic || "").slice(0, 200) || null, summary: String(f.learningOutcomes || f.topic || "").slice(0, 1000) || null, ksbs };
}
async function ensureSession(regId, key) {
  const st = App().getState(), reg = st.classes.find((c) => c.id === regId);
  if (!reg) throw new Error("That register has gone.");
  const people = regLearners(st, reg);
  if (!people.length) throw new Error("Add your Nisia learners to this register first.");
  const counts = {}; people.forEach((p) => { counts[p.nisia.org] = (counts[p.nisia.org] || 0) + 1; });
  const org = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0], m = tutorOrgs().find((o) => o.organisation_id === org);
  if (!m) throw new Error("You’re not a tutor at that college in Nisia.");
  const { data: cls, error: ce } = await db.from("classes").upsert({ organisation_id: org, tutor_member_id: m.member_id, client_ref: reg.id, title: String(reg.name || "Class").slice(0, 120),
    room: reg.room || null, schedule: { day: reg.day, start: reg.start, end: reg.end, recurrence: reg.recurrence || null }, updated_at: new Date().toISOString() }, { onConflict: "tutor_member_id,client_ref" }).select("id").single();
  if (ce) throw new Error(ce.message);
  const want = people.filter((p) => p.nisia.org === org).map((p) => p.nisia.enrolmentId);
  const { data: have, error: he } = await db.from("class_learners").select("enrolment_id").eq("class_id", cls.id);
  if (he) throw new Error(he.message);
  const had = new Set((have || []).map((x) => x.enrolment_id));
  const add = want.filter((e) => !had.has(e)), gone = [...had].filter((e) => !want.includes(e));
  if (add.length) { const { error } = await db.from("class_learners").insert(add.map((e) => ({ class_id: cls.id, enrolment_id: e, organisation_id: org }))); if (error) throw new Error(error.message); }
  if (gone.length) await db.from("class_learners").delete().eq("class_id", cls.id).in("enrolment_id", gone);
  const b = App().bounds(regId, key), lesson = lessonFor(st, regId, key) || {};
  const { data: ses, error: se } = await db.from("class_sessions").upsert({ organisation_id: org, class_id: cls.id, session_date: key,
    starts_at: b ? new Date(b.start).toISOString() : null, ends_at: b ? new Date(b.end).toISOString() : null,
    lesson_title: lesson.title || null, lesson_summary: lesson.summary || null, ksbs: lesson.ksbs || [] }, { onConflict: "class_id,session_date" }).select("id, status").single();
  if (se) throw new Error(se.message);
  const map = read(K.sessions, {}); map[regId + ":" + key] = { id: ses.id, org, member: m.member_id }; write(K.sessions, map);
  return { id: ses.id, org, member: m.member_id, status: ses.status, people };
}

/* ---------- The changing code ---------- */
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmacKey(sessionId) {
  const k = await rpc("symi_session_key", { p_session: sessionId });
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
  const { data, error } = await db.from("class_attendance").select("enrolment_id, checked_in_at, late").eq("session_id", sessionId).not("checked_in_at", "is", null);
  if (error) throw new Error(error.message);
  const all = checked(), mine = all[regId + ":" + key] || {};
  const fresh = [];
  for (const row of data || []) {
    const p = people.find((x) => x.nisia.enrolmentId === row.enrolment_id);
    if (!p || mine[p.id]) continue;
    mine[p.id] = { at: row.checked_in_at, late: row.late };
    fresh.push(p);
    App().startTimer(regId, p.id);
  }
  all[regId + ":" + key] = mine; write(K.checked, all);
  if (fresh.length) { toast(fresh.map((p) => p.name.split(" ")[0]).join(", ") + " checked in"); decorate(); }
  return mine;
}

let open = null;
async function showCheckIn(regId) {
  const key = App().today();
  const layer = document.createElement("div");
  layer.className = "sn-checkin"; layer.setAttribute("role", "dialog"); layer.setAttribute("aria-modal", "true"); layer.setAttribute("aria-label", "Check in");
  layer.innerHTML = '<p class="sn-wait">Getting the check-in code from Nisia…</p>';
  document.body.appendChild(layer);
  let s, hk;
  try { s = await ensureSession(regId, key); hk = await hmacKey(s.id); }
  catch (e) { layer.innerHTML = '<div class="sn-err"><p>' + esc(e.message) + '</p><button type="button" class="blue-button" data-close>Close</button></div>'; layer.querySelector("[data-close]").onclick = () => layer.remove(); return; }
  const st = App().getState(), reg = st.classes.find((c) => c.id === regId), lesson = lessonFor(st, regId, key);
  layer.innerHTML =
    '<header><div><small>CHECK IN · ' + esc(reg.name) + '</small><h2>' + esc(lesson && lesson.title || "Scan to check in") + '</h2></div><button type="button" class="sn-close" aria-label="Close">×</button></header>' +
    '<div class="sn-body"><div class="sn-qr" aria-label="Check-in QR code"></div>' +
      '<div class="sn-side"><ol><li>Open <b>Evia</b> and tap her</li><li>Tap <b>Check in to class</b></li><li>Scan this code</li></ol>' +
        '<p class="sn-or">No camera? Type</p><p class="sn-code" aria-live="polite"></p>' +
        '<div class="sn-timer"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5"/><circle class="sn-left" cx="18" cy="18" r="15.5"/></svg><span>Changes in <b class="sn-secs">20</b>s</span></div>' +
        '<p class="sn-note">It changes so a photo of it can’t be used later. Checking in ticks you on this register; your tutor confirms the hours.</p></div></div>' +
    '<footer><p class="sn-count"></p><ul class="sn-names"></ul></footer>';
  const qr = layer.querySelector(".sn-qr"), short = layer.querySelector(".sn-code"), secs = layer.querySelector(".sn-secs"), left = layer.querySelector(".sn-left");
  let lastW = null, stop = false;
  const tick = async () => {
    if (stop) return;
    const now = Date.now() / 1000, w = Math.floor(now / WINDOW), remain = WINDOW - (now % WINDOW);
    if (w !== lastW) {
      lastW = w;
      const c = await codeFor(s.id, hk, w);
      const size = Math.min(innerWidth * 0.52, innerHeight * 0.62, 460);
      if (window.SamosQR) window.SamosQR.render(qr, c.qr, Math.round(size)); else qr.textContent = c.qr;
      short.textContent = c.short.slice(0, 3) + " " + c.short.slice(3);
    }
    secs.textContent = Math.ceil(remain);
    left.style.strokeDashoffset = String(97.4 * (1 - remain / WINDOW));
  };
  const names = async () => {
    let mine = {};
    try { mine = await pollCheckIns(regId, key, s.id, s.people); } catch (_) { mine = (checked()[regId + ":" + key]) || {}; }
    const n = s.people.filter((p) => mine[p.id]).length;
    layer.querySelector(".sn-count").textContent = n + " of " + s.people.length + " checked in";
    layer.querySelector(".sn-names").innerHTML = s.people.map((p) => '<li class="' + (mine[p.id] ? "on" : "") + '">' + esc(p.name) + (mine[p.id] && mine[p.id].late ? ' <small>late</small>' : "") + '</li>').join("");
  };
  const t1 = setInterval(tick, 250), t2 = setInterval(names, 3000);
  const close = () => { stop = true; clearInterval(t1); clearInterval(t2); layer.remove(); open = null; decorate(); };
  layer.querySelector(".sn-close").onclick = close;
  layer.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  open = { regId, close };
  tick(); names();
}

/* ---------- The register: the check-in button and who's checked in ---------- */
let decorating = false, bgPoll = null;
function decorate() {
  if (decorating) return; decorating = true;
  try {
    const host = document.querySelector("#registerWorkspace .clean-register-card");
    document.querySelectorAll(".sn-bar").forEach((x) => x.remove());
    if (!host) return;
    const st = App().getState(), regId = App().activeRegisterId(), reg = st.classes.find((c) => c.id === regId);
    if (!reg) return;
    const key = App().today(), code = App().timing(regId), people = regLearners(st, reg), sent = read(K.sent, {})[regId + ":" + key];
    const bar = document.createElement("div"); bar.className = "sn-bar";
    if (!signedIn) bar.innerHTML = '<span>Sign in to Nisia so learners can check in with Evia and their hours count.</span><button type="button" class="soft-button" data-sn-connect>Connect to Nisia</button>';
    else if (!people.length) bar.innerHTML = '<span>None of this register’s learners are from Nisia. Add them with <b>+ Learner</b> so they can check in.</span>';
    else if (["open-early", "live", "break"].includes(code)) {
      const n = Object.keys(checked()[regId + ":" + key] || {}).length;
      bar.innerHTML = '<span><b>' + n + ' of ' + people.length + '</b> checked in with Evia</span><button type="button" class="blue-button" data-sn-show>Show check-in code</button>';
    } else if (code === "completed") bar.innerHTML = sent ? '<span class="sn-ok">Sent to Nisia. The hours are in your learners’ Evia.</span>' : '<span>Waiting to send to Nisia…</span>';
    else return;
    host.insertBefore(bar, host.children[1] || null);
    const c = bar.querySelector("[data-sn-connect]"); if (c) c.onclick = openSignIn;
    const sh = bar.querySelector("[data-sn-show]"); if (sh) sh.onclick = () => showCheckIn(regId);
    /* Checked in: a tick next to the name. */
    const mine = checked()[regId + ":" + key] || {};
    host.querySelectorAll("[data-attendance-learner]").forEach((row) => {
      const x = mine[row.dataset.attendanceLearner]; const n = row.querySelector(".attendance-name strong");
      if (x && n && !n.querySelector(".sn-tick")) n.insertAdjacentHTML("beforeend", ' <span class="sn-tick" title="Checked in with Evia">✓ ' + new Date(x.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + (x.late ? " · late" : "") + '</span>');
      const p = people.find((q) => q.id === row.dataset.attendanceLearner);
      if (p && n && !n.querySelector(".sn-tag")) n.insertAdjacentHTML("beforeend", ' <span class="sn-tag">Nisia</span>');
    });
    /* While the session's on, keep ticking learners in even with the code closed. */
    clearInterval(bgPoll); bgPoll = null;
    const s = read(K.sessions, {})[regId + ":" + key];
    if (s && ["open-early", "live", "break"].includes(code) && !open) bgPoll = setInterval(() => { if (navigator.onLine && !document.hidden) pollCheckIns(regId, key, s.id, regLearners(App().getState(), reg)).catch(() => {}); }, 15000);
  } finally { decorating = false; }
}

/* ---------- Finished registers → Nisia ---------- */
let sending = false;
async function sendFinished() {
  if (sending || !signedIn || !navigator.onLine) return;
  sending = true;
  try {
    const st = App().getState(), sent = read(K.sent, {}), cutoff = new Date(Date.now() - 42 * 864e5).toISOString().slice(0, 10);
    for (const row of st.history || []) {
      if (!row || !row.sessionKey || sent[row.sessionKey] || !row.date || row.date < cutoff) continue;
      const reg = st.classes.find((c) => c.id === row.classId);
      if (!reg) continue;
      /* Only learners linked to Nisia on or before that day (older history stays in Symi). */
      const rows = Object.entries(row.data || {}).map(([id, d]) => ({ id, d, n: nisiaOf(st, id) })).filter((x) => x.n && x.n.linkedAt <= row.date);
      if (!rows.length) continue;
      try {
        const s = await ensureSession(row.classId, row.date);
        const now = new Date().toISOString();
        const up = rows.filter((x) => x.n.org === s.org).map((x) => ({ organisation_id: s.org, session_id: s.id, enrolment_id: x.n.enrolmentId,
          minutes: Math.round((Number(x.d.attendedMs) || 0) / 60000), status: (Number(x.d.attendedMs) || 0) > 0 ? "present" : "absent", confirmed_at: now, confirmed_by_member_id: s.member }));
        const { error } = await db.from("class_attendance").upsert(up, { onConflict: "session_id,enrolment_id" });
        if (error) throw new Error(error.message);
        await db.from("class_sessions").update({ status: "finished", finished_at: now }).eq("id", s.id);
        sent[row.sessionKey] = now; write(K.sent, sent);
      } catch (e) { console.warn("Symi: Nisia", row.sessionKey, e.message); }
    }
  } finally { sending = false; decorate(); }
}

/* ---------- Start ---------- */
let queued = false;
window.addEventListener("symi:render", () => {
  chip();
  if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; decorate(); if (signedIn) sendFinished(); });
});
/* Symi's ticker redraws the register every second during a session, without a render event: put the bar back. */
new MutationObserver(() => {
  const card = document.querySelector("#registerWorkspace .clean-register-card");
  const regId = card && App() && App().activeRegisterId(), mine = regId ? checked()[regId + ":" + App().today()] || {} : {};
  const lost = card && Object.keys(mine).length && !card.querySelector(".sn-tick");
  if (card && (!card.querySelector(".sn-bar") || lost) && !queued) { queued = true; requestAnimationFrame(() => { queued = false; decorate(); }); }
}).observe(document.body, { childList: true, subtree: true });
addEventListener("online", () => { if (signedIn) { pullLearners(false).catch(() => {}); sendFinished(); } });
setInterval(() => { if (signedIn && !document.hidden) sendFinished(); }, 60000);
(async () => {
  chip();
  if (inviteCode()) return openSignIn();
  if (await checkSession()) { decorate(); try { await pullLearners(false); } catch (_) {} sendFinished(); }
})();

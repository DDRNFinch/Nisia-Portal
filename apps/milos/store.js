/* Milos offline: everything Milos shows is kept on this phone, and everything Milos saves goes through an outbox.
   - Sync (on opening, when the signal comes back, every 15 minutes while open, or "Sync now"): sends the outbox, then
     downloads your learners and, for each, what Evia and Nisia hold (progress, portfolio, reviews). Photos stay in
     Nisia and are opened when there's signal; photos you take in Milos are kept here until they're sent.
   - Offline, Milos opens from the last download. Observations, sign-offs and reviews are saved here straight away
     and sent the next time there's signal; each job is sent a step at a time and picks up where it stopped.
   - Signing out clears it all from the phone. */
import { db, rpc, me } from "../../packages/core/nisia.js";
/* Requests to Nisia go through the shared actions where there is one (packages/core/nisia-actions.js). */
const A = window.NisiaActions;
A.use(rpc, { app: "milos" });
import { hit } from "../../packages/core/usage.js";
import { loadLearner, reviewDue } from "./review.js";
import { loadPortfolio } from "./portfolio.js";

/* ---------- IndexedDB ---------- */
let dbp = null;
const open = () => dbp || (dbp = new Promise((res, rej) => {
  const r = indexedDB.open("milos", 1);
  r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("kv"); d.createObjectStore("learners"); d.createObjectStore("outbox", { keyPath: "id" }); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
const tx = async (store, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(store, mode), s = t.objectStore(store); let out; Promise.resolve(fn(s)).then((v) => { out = v; }); t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const get = (store, key) => tx(store, "readonly", (s) => req(s.get(key)));
const put = (store, val, key) => tx(store, "readwrite", (s) => req(key === undefined ? s.put(val) : s.put(val, key)));
const del = (store, key) => tx(store, "readwrite", (s) => req(s.delete(key)));
const all = (store) => tx(store, "readonly", (s) => req(s.getAll()));

/* ---------- Status, for the bar at the top ---------- */
const listeners = new Set();
let state = { online: navigator.onLine, syncing: false, syncedAt: null, waiting: 0, error: null };
export const status = () => state;
export const onStatus = (fn) => { listeners.add(fn); fn(state); return () => listeners.delete(fn); };
const set = (o) => { state = { ...state, ...o }; listeners.forEach((f) => f(state)); };
addEventListener("online", () => { set({ online: true }); sync().catch(() => {}); });
addEventListener("offline", () => set({ online: false }));
export const dismissNotice = () => set({ notice: null });
const countWaiting = async () => set({ waiting: (await all("outbox")).length });

/* ---------- What's kept ---------- */
export async function cached() {
  const [who, rows, syncedAt] = await Promise.all([get("kv", "who"), get("kv", "rows"), get("kv", "syncedAt")]);
  set({ syncedAt: syncedAt || null }); countWaiting();
  return who && rows ? { who, rows } : null;
}
export async function learnerData(r) { return (await get("learners", r.enrolment_id)) || null; }

/* Saved work not yet in Nisia, shown as if it were, so nothing seems to disappear while offline. */
async function pendingFor(enrolmentId) { return (await all("outbox")).filter((j) => j.enrolmentId === enrolmentId); }
export async function withPending(r, D) {
  if (!D) return D;
  const L = { ...D.L, evidence: D.L.evidence.slice(), reviews: D.L.reviews.slice() }, P = { files: { ...D.P.files }, assessed: { ...D.P.assessed } };
  for (const j of await pendingFor(r.enrolment_id)) {
    if (j.kind === "observation") {
      if (!L.evidence.some((e) => e.id === j.evidence.id)) L.evidence.unshift({ ...j.evidence, created_at: j.at, pending: true });
      P.files[j.evidence.id] = j.files.map((f) => ({ evidence_id: j.evidence.id, storage_path: f.path, mime_type: f.mime, blob: f.blob }));
      P.assessed[j.evidence.id] = [{ ...j.assessment, created_at: j.at, pending: true }].concat(P.assessed[j.evidence.id] || []);
    }
    if (j.kind === "assessment") P.assessed[j.row.evidence_id] = [{ ...j.row, created_at: j.at, pending: true }].concat(P.assessed[j.row.evidence_id] || []);
    if (j.kind === "review" && !L.reviews.some((v) => v.id === j.review.id)) L.reviews.push({ ...j.review, pending: true });
  }
  return { ...D, L, P };
}

/* ---------- Downloading from Nisia ---------- */
async function download() {
  const who = await me();
  const orgs = (who.memberships || []).filter((m) => m.roles.some((x) => ["assessor", "tutor", "admin"].includes(x)));
  const rows = [];
  for (const o of orgs) {
    const list = await rpc("nisia_college_learners", { p_org: o.organisation_id });
    const mine = o.roles.includes("admin") && !o.roles.includes("assessor") ? list : list.filter((l) => (l.assessors || []).some((a) => a.member_id === o.member_id));
    rows.push(...mine.map((l) => ({ ...l, org: o })));
  }
  const ids = rows.map((x) => x.enrolment_id).filter(Boolean);
  const { data: revs, error } = ids.length ? await db.from("reviews").select("enrolment_id, reviewed_at").in("enrolment_id", ids) : { data: [] };
  if (error) throw new Error(error.message);
  rows.forEach((x) => { x.lastReview = (revs || []).filter((v) => v.enrolment_id === x.enrolment_id).map((v) => v.reviewed_at).sort().pop() || null; x.due = reviewDue(x.start_date, x.lastReview); });
  rows.sort((a, b) => (a.due ? a.due.days : 1e9) - (b.due ? b.due.days : 1e9));
  await put("kv", who, "who"); await put("kv", rows, "rows");
  /* Each learner, a few at a time. One that fails is kept as it was and tried again next time. */
  const at = new Date().toISOString(), queue = rows.filter((x) => x.enrolment_id);
  await Promise.all([0, 1, 2].map(async () => {
    for (let x = queue.shift(); x; x = queue.shift()) {
      try { const L = await loadLearner(x), P = await loadPortfolio(L); await put("learners", { L, P, at }, x.enrolment_id); }
      catch (e) { console.warn("Milos: learner", x.enrolment_id, e.message); }
    }
  }));
  /* Learners no longer yours are removed from the phone. */
  const keep = new Set(ids);
  await tx("learners", "readwrite", (s) => req(s.getAllKeys()).then((ks) => ks.filter((k) => !keep.has(k)).forEach((k) => s.delete(k))));
  await put("kv", at, "syncedAt");
  return { who, rows };
}
/* What the employer sent from Paros: witness testimonies and behaviour ratings. */
async function loadEmployer(r) {
  const d = await A.send("employerFeedback", { p_enrolment: r.enrolment_id }) || {};
  return { witness: d.witness || [], ratings: d.ratings || [] };
}
export async function refreshLearner(r) {
  const L = await loadLearner(r), P = await loadPortfolio(L), E = await loadEmployer(r), D = { L, P, E, at: new Date().toISOString() };
  await put("learners", D, r.enrolment_id); return D;
}

let running = null;
/* Sends what's waiting, then downloads. Resolves with the fresh {who, rows}, or null if it couldn't. */
export function sync() {
  if (running) return running;
  running = (async () => {
    if (!navigator.onLine) { set({ online: false }); return null; }
    set({ syncing: true, error: null });
    try {
      const { data } = await db.auth.getSession();
      if (!data.session) throw Object.assign(new Error("Sign in again to sync."), { signedOut: true });
      /* Download even if something couldn't be sent, so the phone's copy stays current (evidence the learner deleted
         goes); what couldn't be sent stays waiting, and says why. */
      let unsent = null;
      try { await flush(); } catch (e) { unsent = e; }
      const out = await download();
      set({ syncedAt: new Date().toISOString(), online: true });
      synced.forEach((f) => { try { f(out); } catch (err) { console.warn("Milos: after sync", err); } });
      if (unsent) throw unsent;
      return out;
    } catch (e) { set({ error: e.message || String(e) }); throw e; }
    finally { set({ syncing: false }); countWaiting(); running = null; }
  })();
  return running;
}
/* By itself: every 5 minutes while Milos is open, and on coming back to it (from another app, or the phone waking)
   if it's been a minute. Each sync tells the screens (onSynced), so they show what's new without Sync now. */
const synced = [];
export const onSynced = (f) => synced.push(f);
const due = (ms) => navigator.onLine && !document.hidden && (!state.syncedAt || Date.now() - Date.parse(state.syncedAt) > ms);
setInterval(() => { if (due(4.5 * 60000)) sync().catch(() => {}); }, 5 * 60000);
document.addEventListener("visibilitychange", () => { if (due(60000)) sync().catch(() => {}); });

/* ---------- The outbox ---------- */
const uuid = () => crypto.randomUUID();
const dup = (error) => error && (error.code === "23505" || /duplicate key/i.test(error.message || ""));
async function insert(table, row) { const { error } = await db.from(table).insert(row); if (error && !dup(error)) throw new Error(error.message); }

async function send(j) {
  const step = async (name, fn) => { if (j.done[name]) return; await fn(); j.done[name] = true; await put("outbox", j); };
  if (j.kind === "observation") {
    await step("evidence", () => insert("evidence", j.evidence));
    for (let i = 0; i < j.files.length; i++) {
      const f = j.files[i];
      await step("file" + i, async () => {
        const up = await db.storage.from("evidence").upload(f.path, f.blob, { contentType: f.mime, upsert: false });
        if (up.error && !/exists|duplicate/i.test(up.error.message)) throw new Error(up.error.message);
        await insert("evidence_files", { id: f.id, organisation_id: j.evidence.organisation_id, evidence_id: j.evidence.id, uploaded_by_member_id: j.evidence.created_by_member_id, storage_path: f.path, mime_type: f.mime, size_bytes: f.blob.size });
      });
    }
    await step("assessment", () => insert("assessments", j.assessment));
  }
  if (j.kind === "assessment") await step("assessment", async () => {
    try { await insert("assessments", j.row); }
    catch (e) {
      /* The learner deleted this evidence in Evia before the assessment got to Nisia: there's nothing left to assess. */
      const { data, error } = await db.from("evidence").select("id").eq("id", j.row.evidence_id).maybeSingle();
      if (!error && !data) throw Object.assign(new Error("evidence gone"), { gone: true });
      throw e;
    }
  });
  if (j.kind === "review") {
    await step("review", () => insert("reviews", j.review));
    /* Signed as the role the member actually has (a college admin doing reviews has no assessor role). Reviews saved
       before this carry "assessor", so any role Nisia turns down is swapped for the next one. */
    await step("signoff", async () => {
      const roles = [j.signoff.signer_role, "assessor", "tutor", "admin"].filter((x, i, a) => x && a.indexOf(x) === i);
      for (let i = 0; ; i++) {
        try { await insert("review_signoffs", { ...j.signoff, signer_role: roles[i] }); return; }
        catch (e) { if (i === roles.length - 1 || !/row-level security/i.test(e.message)) throw e; }
      }
    });
    if (j.targets.length) await step("targets", () => insert("targets", j.targets));
  }
}
let flushing = null;
export function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    const jobs = (await all("outbox")).sort((a, b) => a.at.localeCompare(b.at)), sent = new Set(), gone = [];
    let failed = null;
    /* Each job on its own: one that can't go (yet) doesn't hold up the others. */
    try {
      for (const j of jobs) {
        if (!navigator.onLine) break;
        try { await send(j); await del("outbox", j.id); sent.add(j.enrolmentId); }
        catch (e) {
          if (!e.gone) { failed = failed || e; continue; }
          await del("outbox", j.id); sent.add(j.enrolmentId);
          const D = await get("learners", j.enrolmentId).catch(() => null), who = D && D.L && D.L.row && D.L.row.name;
          gone.push((who || "The learner") + " deleted a piece of evidence in Evia before your assessment of it was sent, so the assessment has been removed.");
        }
      }
      if (gone.length) set({ notice: gone.join(" ") });
      if (failed) throw failed;
    }
    finally {
      /* What's just gone to Nisia is fetched back, so the phone's copy of those learners includes it. */
      for (const id of sent) { const D = await get("learners", id); if (D) await refreshLearner(D.L.row).catch((e) => console.warn("Milos: refresh", e.message)); }
    }
  })().finally(() => { flushing = null; countWaiting(); });
  return flushing;
}
/* Saves a job here, then tries to send it now. Resolves true if it's already in Nisia, false if it's waiting. */
async function enqueue(j) {
  hit("save." + j.kind + (j.kind === "assessment" && j.row ? "." + j.row.decision : ""));
  j.id = uuid(); j.at = new Date().toISOString(); j.done = {};
  await put("outbox", j); countWaiting();
  if (!navigator.onLine) return false;
  try { await flush(); return !(await get("outbox", j.id)); } catch (e) { console.warn("Milos: sending", e.message); set({ error: e.message }); return false; }
}

/* An observation: the evidence, its photos, the sign-off, and a PDF of it all (observation.pdf), which Evia puts in
   the learner's Supporting evidence. */
export function saveObservation({ enrolmentId, evidence, photos, assessment, pdf }) {
  const id = evidence.id || uuid(), org = evidence.organisation_id;
  const files = photos.map((blob, i) => ({ id: uuid(), blob, mime: blob.type || "application/octet-stream",
    path: org + "/" + id + "/obs-" + (i + 1) + "-" + Math.random().toString(36).slice(2, 8) + "." + ((blob.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "").slice(0, 5)) }));
  if (pdf) files.push({ id: uuid(), blob: pdf, mime: "application/pdf", path: org + "/" + id + "/observation.pdf" });
  return enqueue({ kind: "observation", enrolmentId, evidence: { ...evidence, id, client_reference: "observation:" + id }, files, assessment: { id: uuid(), ...assessment, evidence_id: id } });
}
export const saveAssessment = ({ enrolmentId, row }) => enqueue({ kind: "assessment", enrolmentId, row: { id: uuid(), ...row } });
export function saveReview({ enrolmentId, review, signoff, targets }) {
  const id = uuid();
  return enqueue({ kind: "review", enrolmentId, review: { id, ...review }, signoff: { id: uuid(), ...signoff, review_id: id }, targets: targets.map((t) => ({ id: uuid(), ...t, review_id: id })) });
}

/* Signing out: nothing about learners stays on the phone. */
export async function clear() { await Promise.all(["kv", "learners", "outbox"].map((s) => tx(s, "readwrite", (x) => req(x.clear())))); set({ syncedAt: null, waiting: 0 }); }

/* Milos, the assessor's app: Evia's look, Milos blue. Four places, like Evia's own tabs: Learners, Assess (every
   learner's new evidence in one queue), Reviews (who's due, and drafts to finish) and Calendar (visits booked with
   learners, which show on their Evia calendar too). Milos's face in the middle is what needs doing; syncing with
   Nisia is on the line at the top. Each learner opens on Overview, Portfolio and Reviews, and
   everything the assessor does (observations, sign-offs, reviews) is saved on the phone first and sent when there's
   signal (store.js). Everything is read from Nisia under the college's own rules. */
import { db, rpc, AUTH_KEY, call, signOut, courseName, esc, ukDate, ago, qrSvg, pairLink, EVIA_URL } from "../../packages/core/nisia.js";
import { auth, inviteCode } from "../../packages/core/signin.js";
import { startUsage, hit } from "../../packages/core/usage.js";
import { dueText, facts, openReview, downloadPdf } from "./review.js";
import { groupByUnit, portfolioHtml, openEvidence, insightsHtml, consistencyHtml } from "./portfolio.js";
import { openObservation } from "./observe.js";
import { mountAbsences } from "../../packages/core/absences.js";
import { coursePack, packsLike, loadPacks } from "../../packages/core/packs.js";
import { buildPack, openPack, packPdf } from "./pack.js";
import { cached, sync, onStatus, onSynced, status, learnerData, refreshLearner, withPending, clear, flush, dismissNotice } from "./store.js";
import { reviewHtml } from "../../packages/core/reviewdoc.js";
import * as push from "./push.js";

const root = document.getElementById("app");
document.body.classList.add("milos");
/* What's on screen: view is "home" (one of the tabs) or a learner's row; IDX sums up every learner on the phone. */
let who = null, rows = [], filter = "all", query = "", tab = "today", lastTab = null, view = null, lTab = "overview", learnerBack = "learners", IDX = null;

/* ---------- Line icons, drawn like Evia's ---------- */
const svg = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
const IC = {
  today: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M8.5 14.5l2.2 2.2 4.8-4.8"/>'),
  learners: svg('<circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 19.5c.8-3.4 3.3-5.3 6.2-5.3s5.4 1.9 6.2 5.3"/><circle cx="17" cy="9.5" r="2.7"/><path d="M16.5 14.3c2.4.1 4.1 1.7 4.7 4.2"/>'),
  assess: svg('<path d="M9.5 3h5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8.5 5H7a2.5 2.5 0 0 0-2.5 2.5v11A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 17 5h-1.5"/><path d="M8.5 13.5l2.3 2.3 4.7-4.7"/>'),
  reviews: svg('<path d="M6 3.5h8.5l4 4v12a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5v-14.5A1.5 1.5 0 0 1 6 3.5z"/><path d="M14 3.5V8h4.5M8 12.5h8M8 16h5"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  chev: svg('<path d="M9 5l7 7-7 7"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  pack: svg('<path d="M3.5 7.5l8.5-4 8.5 4-8.5 4z"/><path d="M3.5 12l8.5 4 8.5-4M3.5 16.5l8.5 4 8.5-4"/>'),
  phone: svg('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'),
  sync: svg('<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v3.7h-3.7M6 21v-3.7h3.7"/>'),
  bell: svg('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  install: svg('<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5"/><path d="M4.5 16v2.5A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 2-2V16"/>'),
  out: svg('<path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3"/><path d="M10 16.5L5.5 12 10 7.5M5.5 12h10"/>'),
  clip: svg('<path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  cal: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 9.8h17M8 3v4M16 3v4"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>'),
  pin: svg('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  pen: svg('<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/>'),
};
IC.calendar = IC.cal;
const EYES = '<span class="av" aria-hidden="true"><i></i><i></i></span>';

/* ---------- Opening Milos ---------- */
/* With learners already on this phone, straight to them (signing in is only needed to sync); otherwise sign in,
   then download. Sign-in that can't reach Nisia (no signal) falls back to the phone's copy. */
const AUTH = { title: "Milos", subtitle: "For assessors", onReady: () => home(true) };
async function start() {
  let have = null; try { have = await withTimeout(cached(), 5000); } catch (_) {}
  if (have && localStorage.getItem(AUTH_KEY) && !inviteCode()) return home(true);
  try { await withTimeout(auth(root, AUTH), 15000); }
  catch (e) {
    root.innerHTML = '<div class="auth"><div class="box"><p class="err">' + esc(navigator.onLine ? "Milos couldn’t reach Nisia: " + e.message : "You’re offline, and there are no learners on this phone yet. Connect to the internet once to download them.") + '</p><button class="btn primary wide" id="retry">Try again</button></div></div>';
    root.querySelector("#retry").onclick = start;
  }
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("it took too long to answer.")), ms))]);
db.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") { visits = []; try { localStorage.removeItem("milos-visits-v1"); } catch (_) {} clear().finally(start); } });
start().catch((e) => { root.innerHTML = '<div class="auth"><p class="err">' + esc(e.message) + '</p></div>'; });

function toast(msg) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

/* ---------- Installing Milos as an app ---------- */
/* Chrome and Edge offer it directly; on iPhone and iPad it's Share, then Add to Home Screen. */
let installer = null;
const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const canInstall = () => !installed() && (!!installer || isIOS);
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installer = e; if (view === "home" && tab === "today") drawTab(); });
addEventListener("appinstalled", () => { installer = null; toast("Milos is installed"); if (view === "home" && tab === "today") drawTab(); });
async function install() {
  if (installer) { installer.prompt(); await installer.userChoice; installer = null; if (view === "home") drawTab(); return; }
  toast(isIOS ? "In Safari, tap Share, then Add to Home Screen." : "Open your browser’s menu and choose Install Milos (or Add to Home screen).");
}

/* ---------- The frame: a big title like Evia's, the sync line, and the floating tab bar ---------- */
const initials = (n) => String(n || "").trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "M";
const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const face = (name) => '<span class="m-face" style="--h:' + hue(name) + '" aria-hidden="true">' + esc(initials(name)) + '</span>';
const TABS = [["learners", "Learners"], ["assess", "Assess"], ["reviews", "Reviews"], ["calendar", "Calendar"]];
function frame({ title, sub, back, body }) {
  const w = status().waiting, fresh = IDX ? IDX.reduce((n, x) => n + (x.fresh ? x.fresh.length : 0), 0) : 0;
  const navBtn = ([k, t]) => '<button type="button" data-tab="' + k + '" class="' + (tab === k ? "on" : "") + '"' + (tab === k && view === "home" ? ' aria-current="page"' : "") + '>' + IC[k] +
    '<span>' + t + '</span>' + (k === "assess" && fresh ? '<b class="m-badge">' + fresh + '</b>' : "") + '</button>';
  root.innerHTML = '<div class="m-app">' +
    '<header class="m-head">' + (back ? '<button type="button" class="m-back" id="backBtn">' + IC.back + '<span>' + esc(back) + '</span></button>' : "") +
      '<div class="m-head-row"><div class="m-titles"><h1 class="m-title">' + esc(title) + '</h1>' + (sub ? '<p class="m-sub">' + sub + '</p>' : "") + '</div>' +
      '<button type="button" class="m-me" id="meBtn" aria-label="You and Milos">' + esc(initials(who && who.name)) + '</button></div>' +
      '<div class="m-sync" id="syncbar"></div></header>' +
    '<main class="m-main" id="main">' + body + '</main>' +
    '<nav class="m-nav" aria-label="Milos">' + navBtn(TABS[0]) + navBtn(TABS[1]) +
      '<button type="button" class="m-nav-milos' + (tab === "today" && view === "home" ? " on" : "") + '" id="navTodo" aria-label="What needs doing">' + EYES + '</button>' +
      navBtn(TABS[2]) + navBtn(TABS[3]) + '</nav></div>';
  root.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.tab; home(); scrollTo(0, 0); });
  root.querySelector("#navTodo").onclick = () => { tab = "today"; home(); scrollTo(0, 0); };
  root.querySelector("#meBtn").onclick = account;
  drawSync(status());
}
const pill = (d) => !d ? "" : '<span class="pill ' + (d.overdue ? "bad" : d.soon ? "warn" : "good") + '">' + esc(dueText(d)) + '</span>';

/* ---------- The sync line: when the learners were last downloaded, what's waiting to send, and Sync now ---------- */
const hhmm = (d) => { const t = new Date(d); return (t.toDateString() === new Date().toDateString() ? "today " : t.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " ") + t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
function drawSync(st) {
  const bar = document.getElementById("syncbar"); if (!bar) return;
  const msg = st.syncing ? "Syncing with Nisia…" : (!st.online ? "Offline · " : "") + (st.syncedAt ? "Synced " + hhmm(st.syncedAt) : "Not downloaded yet");
  bar.className = "m-sync" + (!st.online ? " off" : "") + (st.error && !st.syncing ? " err" : "") + (st.syncing ? " busy" : "");
  bar.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="msg">' + esc(msg) + (st.waiting ? ' · <b>' + st.waiting + ' waiting to send</b>' : "") +
    (st.error && !st.syncing && st.online ? '<small>' + esc(st.error) + '</small>' : "") +
    (st.notice ? '<small class="m-sync-note">' + esc(st.notice) + ' <button type="button" class="m-note-ok" id="noteOk">OK</button></small>' : "") + '</span><button type="button" class="m-sync-btn" id="syncNow"' + (st.syncing || !st.online ? " disabled" : "") + '>' + (st.syncing ? "Syncing…" : "Sync now") + '</button>';
  bar.querySelector("#syncNow").onclick = () => manualSync();
  const ok = bar.querySelector("#noteOk"); if (ok) ok.onclick = dismissNotice;
  const m = document.getElementById("syncNow"); if (m) m.classList.toggle("busy", !!st.syncing);
}
onStatus(drawSync);
/* Whatever started a sync (opening, the timer, coming back to Milos, the signal returning), the screen shows what's
   new. Not while something is open on top (an evidence piece being assessed, a review), so nothing moves mid-task. */
onSynced((out) => {
  if (!out) return;
  who = out.who; rows = out.rows; IDX = null;
  const busy = document.querySelector(".rv, .overlay") || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "");
  if (!busy && root.querySelector("#main")) redraw();
});
/* An assessment dropped because the learner deleted the evidence: redraw, so the piece doesn't still look assessed. */
let lastNotice = null;
onStatus((st) => { if (st.notice && st.notice !== lastNotice) { lastNotice = st.notice; setTimeout(redraw, 50); } else if (!st.notice) lastNotice = null; });
async function manualSync() {
  hit("sync.manual");
  if (status().syncing) return;
  try {
    const out = await sync();
    if (!out) return toast("You’re offline. Milos syncs by itself when the signal comes back.");
    who = out.who; rows = out.rows; IDX = null; toast("Up to date with Nisia");
    redraw();
  } catch (e) {
    if (e.signedOut) { toast("Sign in again to sync."); return clear().then(() => signOut()); }
    toast("Couldn’t sync: " + e.message);
  }
}
function redraw() {
  if (view === "home") drawTab();
  else if (view) { const r = rows.find((x) => x.enrolment_id === view.enrolment_id); if (r) learner(r, true); else home(); }
}

/* ---------- You and Milos: who's signed in, syncing, installing, signing out ---------- */
function sheet(html, label, wide) {
  const o = document.createElement("div"); o.className = "overlay";
  o.innerHTML = '<section class="sheet' + (wide ? " wide" : "") + '" role="dialog" aria-modal="true" aria-label="' + esc(label || "") + '"><span class="m-grab" aria-hidden="true"></span><button class="x" aria-label="Close">×</button>' + html + '</section>';
  o.onclick = (e) => { if (e.target === o) o.remove(); }; o.querySelector(".x").onclick = () => o.remove();
  document.body.appendChild(o); return o;
}
/* ---------- The learner's pack: the topics they're taught and evidenced in ---------- */
function packCard(r) {
  const C = coursePack(r.course_code, r.enrolment_id), p = C && C.pack, list = packsLike(r.course_code, r.enrolment_id);
  if (!p) return "";
  return '<section class="card m-card"><p class="label">Pack</p><p class="m-card-sub"><b>' + esc(p.title) + '</b> · ' + (p.college ? "the college’s own" : "Nisia’s") + ' · ' + C.units.length + ' topics</p>' +
    (list.length > 1 ? '<button class="btn" type="button" id="packBtn">Change pack</button>' : "") + '</section>';
}
function choosePack(r) {
  const first = firstName(r.name), list = packsLike(r.course_code, r.enrolment_id);
  const o = sheet('<h2>' + esc(first) + '’s pack</h2><p class="muted">The topics ' + esc(first) + ' is taught and evidenced in. Their evidence and sign-offs are kept by KSB, so changing pack never loses anything.</p>' +
    '<form id="pkF" style="display:grid;gap:8px;margin-top:10px">' + list.map((p) => '<label class="check"><input type="radio" name="p" value="' + esc(p.id) + '"' + (p.current ? " checked" : "") + '> <span><b>' + esc(p.title) + '</b><br><span class="small muted">' +
      (p.college ? "The college’s own" : "Nisia’s") + ' · ' + p.topics + ' topics</span></span></label>').join("") + '<p class="err" hidden></p><button class="btn primary wide" type="submit">Save</button></form>', "Pack");
  o.querySelector("#pkF").onsubmit = async (e) => {
    e.preventDefault(); const v = new FormData(e.target).get("p"), err = o.querySelector(".err"), b = e.target.querySelector("[type=submit]");
    b.disabled = true;
    try { await rpc("set_enrolment_pack", { p_enrolment: r.enrolment_id, p_pack: v }); await loadPacks(rpc); hit("learner.pack"); o.remove(); toast(first + "’s pack is changed. Evia follows on its next sync."); learner(r, true); }
    catch (x) { err.textContent = navigator.onLine ? x.message : "Changing a pack needs signal. Try again when you’re back online."; err.hidden = false; b.disabled = false; }
  };
}
/* ---------- Notifications ---------- */
const PUSH_WHAT = "New evidence to assess, and on Mondays the reviews to book. Weekdays only, 7:30am to 9pm.";
function pushRow() {
  const st = push.state();
  return '<button type="button" class="m-row" id="acPush"' + (push.WHY[st] ? " disabled" : "") + '><span class="m-ic">' + IC.bell + '</span><span class="m-row-main"><b>Notifications' + (st === "on" ? " · on" : "") + '</b><span class="sub">' +
    esc(push.WHY[st] || (st === "on" ? PUSH_WHAT + " Tap to turn off." : PUSH_WHAT)) + '</span></span>' + (st === "on" ? '<span class="pill good">On</span>' : "") + '</button>';
}
/* A tapped notification opens its tab: To assess, or Reviews. */
function pushOpen(what) {
  if (!["assess", "reviews", "today", "learners", "calendar"].includes(what) || !who) return;
  tab = what; filter = "all"; home(); scrollTo(0, 0);
}
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.type === "milos-open") pushOpen(e.data.open); });
let openFirst = "";
try { const q = new URLSearchParams(location.search); openFirst = q.get("open") || ""; if (openFirst) { q.delete("open"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); } } catch (_) {}

function account() {
  const st = status(), orgs = [...new Set(rows.map((r) => r.org && r.org.organisation).filter(Boolean))];
  const o = sheet('<div class="m-acct"><span class="m-me lg" aria-hidden="true">' + esc(initials(who && who.name)) + '</span><div><h2>' + esc(who && who.name || "Assessor") + '</h2><p class="muted small">' + esc(orgs.join(", ") || "Milos") + '</p></div></div>' +
    '<div class="card m-list">' +
      '<button type="button" class="m-row" id="acSync"><span class="m-ic">' + IC.sync + '</span><span class="m-row-main"><b>Sync with Nisia</b><span class="sub">' + esc(st.syncedAt ? "Last synced " + hhmm(st.syncedAt) : "Not synced yet") + (st.waiting ? " · " + st.waiting + " waiting to send" : "") + '</span></span></button>' +
      pushRow() +
      (installed() ? "" : '<button type="button" class="m-row" id="install"><span class="m-ic">' + IC.install + '</span><span class="m-row-main"><b>Install Milos</b><span class="sub">On your home screen, and it works offline</span></span></button>') +
      '<button type="button" class="m-row" id="signout"><span class="m-ic bad">' + IC.out + '</span><span class="m-row-main"><b>Sign out</b><span class="sub">Removes your learners from this phone</span></span></button>' +
    '</div><p class="small muted center">Milos keeps your learners on this phone so it works without signal. Anything you do goes to Nisia when there’s signal.</p>', "Account");
  o.querySelector("#acSync").onclick = () => { o.remove(); manualSync(); };
  const i = o.querySelector("#install"); if (i) i.onclick = () => { o.remove(); install(); };
  const pb = o.querySelector("#acPush");
  if (pb) pb.onclick = async () => {
    pb.disabled = true;
    try { if (push.state() === "on") { await push.off(); toast("Notifications off"); } else toast(await push.on() ? "Notifications on" : push.state() === "blocked" ? "Notifications are blocked in your settings" : "Notifications not turned on"); }
    catch (e) { toast("Couldn’t reach Nisia. Try again with signal."); }
    o.remove(); account();
  };
  o.querySelector("#signout").onclick = async () => {
    const w = status().waiting;
    if (w && !confirm(w + (w === 1 ? " thing hasn’t" : " things haven’t") + " been sent to Nisia yet, and signing out deletes them from this phone. Sign out anyway?")) return;
    if (w && navigator.onLine) { try { await flush(); } catch (_) {} }
    await clear(); signOut();
  };
}

/* ---------- Everything on the phone, summed up: per learner, their facts and their new evidence ---------- */
async function index() {
  if (IDX) return IDX;
  const out = [];
  for (const r of rows) {
    const x = { r };
    try {
      let D = await learnerData(r);
      if (D) { D = await withPending(r, D); x.D = D; x.F = facts({ ...D.L, P: D.P }); x.groups = groupByUnit(D.L, D.P); x.fresh = x.groups.flatMap((g) => g.items.filter((it) => !it.latest).map((it) => ({ it, g }))); }
    } catch (e) { console.warn("Milos: index", r.enrolment_id, e.message); }
    out.push(x);
  }
  return (IDX = out);
}
const quietFor = (r) => !r.last_activity ? Infinity : (Date.now() - Date.parse(r.last_activity)) / 864e5;
const drafts = () => rows.filter((r) => { try { return !!localStorage.getItem("milos-draft-" + r.enrolment_id); } catch (_) { return false; } });
const firstName = (n) => String(n || "").split(" ")[0];
const ring = (pct, label) => { const p = Math.max(0, Math.min(100, Math.round(pct || 0))); return '<span class="m-ring" style="--p:' + p + '" title="' + esc(label || p + "%") + '"><b>' + p + '<small>%</small></b></span>'; };
const empty = (h, p) => '<section class="card m-empty">' + EYES + '<h2>' + h + '</h2><p class="muted">' + p + '</p></section>';

/* ---------- The four tabs ---------- */
async function home(fresh) {
  view = "home";
  const have = await cached().catch(() => null);
  if (have) {
    who = have.who; rows = have.rows;
    if (openFirst) { tab = ["assess", "reviews", "today", "learners", "calendar"].includes(openFirst) ? openFirst : tab; openFirst = ""; }
    await drawTab(); if (fresh && navigator.onLine) { quietSync(); push.refresh(); } return;
  }
  frame({ title: "Milos", body: '<div class="m-loading">' + EYES + '<p class="muted">Downloading your learners from Nisia…</p></div>' });
  try { const out = await sync(); if (!out) throw new Error("You’re offline. Connect once to download your learners."); who = out.who; rows = out.rows; IDX = null; await drawTab(); }
  catch (e) { root.querySelector("#main").innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p><button class="btn primary" id="retry">Try again</button></div>'; root.querySelector("#retry").onclick = () => home(true); }
}
/* Background sync on opening: the screen updates when it's done, without a message. */
async function quietSync() {
  try { const out = await sync(); if (!out) return; who = out.who; rows = out.rows; IDX = null; if (view === "home") drawTab(); }
  catch (e) { if (e.signedOut) { await clear(); signOut(); } }
}
startUsage("milos", new URL(import.meta.url).searchParams.get("v") || "");
async function drawTab() {
  hit("tab." + tab);
  const X = await index();
  if (view !== "home") return;
  const y = scrollY, same = tab === lastTab;
  ({ today: drawToday, learners: drawLearners, assess: drawAssess, reviews: drawReviews, calendar: drawCalendar })[tab](X);
  root.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => learner(rows.find((r) => r.learner_id === b.dataset.id)));
  root.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { tab = b.dataset.go; filter = b.dataset.gf || "all"; home(); scrollTo(0, 0); });
  if (same && y) scrollTo(0, y);
  lastTab = tab;
}

/* Today: what needs the assessor, most urgent first. */
function drawToday(X) {
  const due = rows.filter((r) => r.due && (r.due.overdue || r.due.soon)), overdue = due.filter((r) => r.due.overdue);
  const fresh = X.flatMap((x) => (x.fresh || []).map((f) => ({ ...f, x }))), from = new Set(fresh.map((f) => f.x.r.learner_id)).size;
  const quiet = rows.filter((r) => quietFor(r) > 14), unpaired = rows.filter((r) => !r.paired), dr = drafts();
  const hour = new Date().getHours(), hi = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const card = ({ cls = "", label, big, sub, inner = "", go, gf }) => '<section class="card m-card ' + cls + '">' +
    (go ? '<button type="button" class="m-card-go" data-go="' + go + '"' + (gf ? ' data-gf="' + gf + '"' : "") + ' aria-label="' + esc(label) + '">' + IC.chev + '</button>' : "") +
    '<p class="label">' + esc(label) + '</p>' + big + (sub ? '<p class="m-card-sub">' + sub + '</p>' : "") + inner + '</section>';
  const mini = (r, right) => '<button type="button" class="m-mini" data-id="' + r.learner_id + '">' + face(r.name) + '<span class="m-mini-name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(courseName(r.course_code)) + '</span></span>' + right + '</button>';
  const oldest = fresh.map((f) => f.it.e.created_at).sort()[0];
  const week = Date.now() + 7 * 864e5, todayV = comingVisits().filter((v) => vDay(v) === dkey(new Date())), soonV = comingVisits().filter((v) => Date.parse(v.starts_at) < week);
  frame({ title: hi + " " + firstName(who.name), sub: esc(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })), body:
    (!rows.length ? empty("No learners yet", "Your college assigns learners to you in Nisia. They appear here after the next sync.") :
      (soonV.length ? card({ label: "Visits", go: "calendar", big: '<p class="m-big">' + (todayV.length ? todayV.length + '<small> today</small>' : soonV.length + '<small> this week</small>') + '</p>',
        sub: todayV.length ? "Open one to start the observation." : "Coming up in the next 7 days.", inner: '<div class="card m-list m-in-card">' + soonV.slice(0, 4).map((v) => visitRow(v, !todayV.includes(v))).join("") + '</div>' }) : "") +
      card({ cls: "m-hero" + (overdue.length ? " is-bad" : ""), label: "Progress reviews", go: "reviews",
        big: '<p class="m-big ' + (overdue.length ? "bad" : due.length ? "warn" : "good") + '">' + (overdue.length ? overdue.length + " overdue" : due.length ? due.length + " due soon" : "All up to date") + '</p>',
        sub: overdue.length ? "Funding rules need one every 12 weeks." + (due.length > overdue.length ? " " + (due.length - overdue.length) + " more due in the next 2 weeks." : "") : due.length ? "Due in the next 2 weeks." : "Nobody is due in the next 2 weeks.",
        inner: due.length ? '<div class="m-minis">' + due.slice(0, 4).map((r) => mini(r, pill(r.due))).join("") + '</div>' : "" }) +
      (dr.length ? card({ label: "Reviews in progress", big: '<p class="m-big">' + dr.length + '</p>', sub: "Pick up where you left off.", inner: '<div class="m-minis">' + dr.map((r) => mini(r, '<span class="pill accent">Draft</span>')).join("") + '</div>' }) : "") +
      card({ label: "To assess", go: fresh.length ? "assess" : "", big: '<p class="m-big">' + fresh.length + (fresh.length ? '<small> new</small>' : "") + '</p>',
        sub: fresh.length ? "From " + from + (from === 1 ? " learner" : " learners") + ". The oldest came in " + esc(ago(oldest)) + "." : "Everything has been assessed.",
        inner: fresh.length ? '<button type="button" class="btn primary wide" data-go="assess">Start assessing</button>' : "" }) +
      (quiet.length ? card({ label: "Gone quiet", go: "learners", gf: "quiet", big: '<p class="m-big">' + quiet.length + '</p>', sub: "No Evia activity for 14 days or more. A nudge helps.",
        inner: '<div class="m-minis">' + quiet.slice(0, 3).map((r) => mini(r, '<span class="small muted">' + esc(r.last_activity ? ago(r.last_activity) : "Never") + '</span>')).join("") + '</div>' }) : "") +
      (unpaired.length ? card({ label: "Evia not connected", go: "learners", gf: "unpaired", big: '<p class="m-big">' + unpaired.length + '</p>', sub: "Reviews can’t be filled in from Evia until it’s connected. Open the learner and tap Connect Evia." }) : "")) +
    (canInstall() ? '<button type="button" class="card m-install" id="installCard"><span class="m-ic">' + IC.install + '</span><span class="m-row-main"><b>Install Milos</b><span class="sub">On your home screen, and it works offline</span></span></button>' : "") +
    (rows.length && push.state() === "off" && !push.asked() ? '<button type="button" class="card m-install" id="pushCard"><span class="m-ic">' + IC.bell + '</span><span class="m-row-main"><b>Turn on notifications</b><span class="sub">Know when learners add evidence. Weekdays only, never in the evening.</span></span></button>' : "") });
  bindVisits();
  if (Date.now() - visitsAt > 60000 && navigator.onLine) loadVisits().then(() => { if (view === "home" && tab === "today") drawTab(); });
  const ic = root.querySelector("#installCard"); if (ic) ic.onclick = install;
  const pc = root.querySelector("#pushCard");
  if (pc) pc.onclick = async () => {
    pc.disabled = true;
    let ok = false; try { ok = await push.on(); } catch (_) {}
    toast(ok ? "Notifications on. Change this in Account." : push.state() === "blocked" ? "Notifications are blocked in your settings" : "Not turned on. You can do it later in Account.");
    drawTab();
  };
}

/* Learners: search, a few filters, and each learner with how far along they are. */
function drawLearners(X) {
  const by = Object.fromEntries(X.map((x) => [x.r.learner_id, x]));
  const F = { all: () => true, due: (r) => r.due && (r.due.overdue || r.due.soon), quiet: (r) => quietFor(r) > 14, unpaired: (r) => !r.paired };
  const q = query.trim().toLowerCase();
  const shown = rows.filter(F[filter] || F.all).filter((r) => !q || (r.name + " " + (r.employer_name || "") + " " + courseName(r.course_code)).toLowerCase().includes(q));
  const chip = (k, t) => { const n = rows.filter(F[k]).length; return k !== "all" && !n && filter !== k ? "" : '<button type="button" class="m-chip' + (filter === k ? " on" : "") + '" data-f="' + k + '">' + t + (k !== "all" ? " <b>" + n + "</b>" : "") + '</button>'; };
  frame({ title: "Learners", sub: rows.length + (rows.length === 1 ? " learner" : " learners"), body:
    '<label class="m-search">' + IC.search + '<input id="q" type="search" placeholder="Search by name, employer or course" value="' + esc(query) + '" autocomplete="off" aria-label="Search learners"></label>' +
    '<div class="m-chips" role="group" aria-label="Show">' + chip("all", "All") + chip("due", "Review due") + chip("quiet", "Gone quiet") + chip("unpaired", "Evia not connected") + '</div>' +
    (shown.length ? '<section class="card m-list" id="list">' + shown.map((r) => { const x = by[r.learner_id] || {}, Fx = x.F;
      return '<button type="button" class="m-row" data-id="' + r.learner_id + '">' + face(r.name) + '<span class="m-row-main"><b>' + esc(r.name) + '</b>' +
        '<span class="sub">' + esc(courseName(r.course_code)) + (r.employer_name ? " · " + esc(r.employer_name) : "") + '</span>' +
        '<span class="m-row-tags">' + pill(r.due) + (r.paired ? '<span class="small muted">Evia ' + esc(ago(r.last_activity)) + '</span>' : '<span class="pill warn">Evia not connected</span>') + (x.fresh && x.fresh.length ? '<span class="pill accent">' + x.fresh.length + ' to assess</span>' : "") + '</span></span>' +
        (Fx ? ring(Fx.ksb.pct, Fx.ksb.pct + "% of " + (Fx.nvq ? "criteria" : "KSBs") + " signed off") : "") + '<span class="m-chev">' + IC.chev + '</span></button>'; }).join("") + '</section>'
      : rows.length ? empty(q ? "Nobody matches" : "Nobody here", q ? "No learner matches “" + esc(query) + "”." : "Nobody here right now.") : empty("No learners yet", "No learners are assigned to you yet. Your college assigns them in Nisia.")) });
  root.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { filter = b.dataset.f; drawTab(); });
  const inp = root.querySelector("#q");
  inp.oninput = () => { query = inp.value; const pos = inp.selectionStart; drawTab().then(() => { const n = root.querySelector("#q"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); };
}

/* To assess: every learner's new evidence in one queue, oldest first within each learner. */
function drawAssess(X) {
  const withNew = X.filter((x) => x.fresh && x.fresh.length), total = withNew.reduce((n, x) => n + x.fresh.length, 0);
  const TYPE = { photo: "Photos", video: "Video", audio: "Voice note", document: "Document", written: "Write-up" };
  frame({ title: "To assess", sub: total ? total + " new " + (total === 1 ? "piece" : "pieces") + " from " + withNew.length + (withNew.length === 1 ? " learner" : " learners") : "All caught up", body:
    (withNew.length ? withNew.map((x) => '<section class="m-group"><button type="button" class="m-group-head" data-id="' + x.r.learner_id + '">' + face(x.r.name) + '<span class="m-row-main"><b>' + esc(x.r.name) + '</b><span class="sub">' + esc(courseName(x.r.course_code)) + '</span></span><span class="pill accent">' + x.fresh.length + ' new</span></button>' +
      '<div class="card m-list">' + x.fresh.slice().sort((a, b) => String(a.it.e.created_at).localeCompare(String(b.it.e.created_at))).map(({ it, g }) => {
        const m = it.e.source_metadata || {}, words = String(m.text || "").trim().split(/\s+/).filter(Boolean).length;
        return '<button type="button" class="m-row" data-q="' + x.r.enrolment_id + '|' + it.e.id + '"><span class="m-no">' + (g.no || (g.key === "supporting" ? IC.clip : IC.plus)) + '</span><span class="m-row-main"><b>' + esc(g.key === "supporting" || g.key === "other" ? it.e.title : g.name) + '</b>' +
          '<span class="sub">' + esc([ukDate(it.e.created_at), m.collection === "observation" ? "Observation" : TYPE[it.e.evidence_type] || it.e.evidence_type, it.files.length ? it.files.length + (it.files.length === 1 ? " file" : " files") : "", words ? words + " words" : ""].filter(Boolean).join(" · ")) + '</span></span>' +
          '<span class="m-chev">' + IC.chev + '</span></button>'; }).join("") + '</div></section>').join("")
      : empty("All caught up", "New evidence from your learners’ Evia shows here as soon as it syncs.")) });
  root.querySelectorAll("[data-q]").forEach((b) => b.onclick = () => {
    const [en, id] = b.dataset.q.split("|"), x = X.find((y) => y.r.enrolment_id === en), f = x && x.fresh.find((y) => y.it.e.id === id); if (!f) return;
    openEvidence({ L: x.D.L, groups: x.groups, me: { name: who.name, member_id: x.r.org.member_id }, college: x.r.org.organisation }, f.it, (it, sent) => { IDX = null; toast(sent ? "Saved to Nisia" : "Saved on this phone. It goes to Nisia when there’s signal."); if (view === "home") drawTab(); });
  });
}

/* Reviews: drafts to finish, then who's due, soonest first. */
function drawReviews() {
  const dr = drafts(), dated = rows.filter((r) => r.due).slice().sort((a, b) => a.due.days - b.due.days);
  const over = dated.filter((r) => r.due.overdue), soon = dated.filter((r) => r.due.soon), later = dated.filter((r) => !r.due.overdue && !r.due.soon);
  const row = (r, right) => '<button type="button" class="m-row" data-id="' + r.learner_id + '">' + face(r.name) + '<span class="m-row-main"><b>' + esc(r.name) + '</b><span class="sub">' +
    esc((r.lastReview ? "Last review " + ukDate(r.lastReview) : "No reviews yet") + (r.due ? " · due " + ukDate(r.due.due) : "")) + '</span></span>' + right + '<span class="m-chev">' + IC.chev + '</span></button>';
  const block = (label, list, right) => list.length ? '<p class="label m-sec">' + esc(label) + '</p><section class="card m-list">' + list.map((r) => row(r, right(r))).join("") + '</section>' : "";
  frame({ title: "Reviews", sub: "Every 12 weeks, filled in from Evia", body:
    block("In progress", dr, () => '<span class="pill accent">Draft</span>') +
    block("Overdue", over, (r) => pill(r.due)) + block("Due in the next 2 weeks", soon, (r) => pill(r.due)) + block("Later", later, (r) => pill(r.due)) +
    (!dated.length && !dr.length ? empty("No reviews to plan", "Reviews appear here once learners are assigned to you.") : "") });
}

/* ---------- Calendar: visits booked with learners ----------
   A visit (on site, an observation or a progress review) is booked in Nisia, so it shows on the learner's Evia
   calendar and the learner and their employer are told. Kept on the phone too, so the calendar works without signal;
   booking, moving and cancelling need signal. Review due dates show on the same calendar. */
const VKEY = "milos-visits-v1";
let visits = (() => { try { return JSON.parse(localStorage.getItem(VKEY) || "[]") || []; } catch (_) { return []; } })(), visitsAt = 0, calMonth = null, calDay = null;
const dkey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const vDay = (v) => dkey(new Date(v.starts_at));
const vTime = (v) => new Date(v.starts_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const vDate = (v) => new Date(v.starts_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const KIND = { visit: "Visit on site", observation: "Observation", review: "Progress review" };
const vLen = (m) => m < 60 ? m + " min" : (m % 60 ? (m / 60).toFixed(1).replace(".0", "") : m / 60) + (m === 60 ? " hour" : " hours");
const comingVisits = () => visits.filter((v) => Date.parse(v.starts_at) + (v.minutes || 60) * 6e4 > Date.now()).sort((a, b) => String(a.starts_at).localeCompare(b.starts_at));
async function loadVisits(force) {
  if (!navigator.onLine || (!force && Date.now() - visitsAt < 60000)) return visits;
  const from = new Date(), to = new Date(); from.setDate(from.getDate() - 62); to.setDate(to.getDate() + 370);
  try { visits = (await rpc("nisia_visits", { p_from: dkey(from), p_to: dkey(to) })) || []; visitsAt = Date.now(); try { localStorage.setItem(VKEY, JSON.stringify(visits)); } catch (_) {} }
  catch (e) { console.warn("Milos: visits", e.message); }
  return visits;
}
const visitRow = (v, withDate) => { const r = rows.find((x) => x.enrolment_id === v.enrolment_id);
  return '<button type="button" class="m-row" data-visit="' + esc(v.id) + '">' + face(v.learner || (r && r.name)) + '<span class="m-row-main"><b>' + esc(v.learner || (r && r.name) || "Learner") + '</b><span class="sub">' +
    esc([withDate ? vDate(v) : "", vTime(v), KIND[v.kind] || "Visit", v.place].filter(Boolean).join(" · ")) + '</span></span><span class="m-chev">' + IC.chev + '</span></button>'; };
function bindVisits(scope) {
  (scope || root).querySelectorAll("[data-visit]").forEach((b) => b.onclick = () => { const v = visits.find((x) => x.id === b.dataset.visit); if (v) visitSheet(v); });
}
function drawCalendar() {
  const now = new Date(), today = dkey(now);
  if (calMonth == null) calMonth = now.getFullYear() * 12 + now.getMonth();
  const y = Math.floor(calMonth / 12), m = calMonth % 12, first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), lead = (first.getDay() + 6) % 7;
  const byDay = {}; visits.forEach((v) => (byDay[vDay(v)] = byDay[vDay(v)] || []).push(v));
  const dueDay = {}; rows.forEach((r) => { if (r.due && r.due.due) (dueDay[String(r.due.due).slice(0, 10)] = dueDay[String(r.due.due).slice(0, 10)] || []).push(r); });
  let cells = ""; for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) { const k = dkey(new Date(y, m, d)), n = (byDay[k] || []).length;
    cells += '<button type="button" class="m-cal-d' + (n ? " has" : "") + (dueDay[k] ? " due" : "") + (k === today ? " today" : "") + (k === calDay ? " picked" : "") + '" data-day="' + k + '" aria-label="' +
      esc(new Date(k + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + (n ? ", " + n + (n === 1 ? " visit" : " visits") : "") + (dueDay[k] ? ", review due" : "")) + '">' + d + (n ? '<i>' + n + '</i>' : "") + '</button>'; }
  const pick = calDay && (byDay[calDay] || dueDay[calDay]);
  const dayList = calDay ? '<p class="label m-sec">' + esc(new Date(calDay + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })) + '</p>' +
    (pick ? '<section class="card m-list">' + (byDay[calDay] || []).map((v) => visitRow(v)).join("") + (dueDay[calDay] || []).map((r) => '<button type="button" class="m-row" data-id="' + r.learner_id + '">' + face(r.name) + '<span class="m-row-main"><b>' + esc(r.name) + '</b><span class="sub">Progress review due</span></span>' + pill(r.due) + '</button>').join("") + '</section>'
      : '<p class="muted small m-cal-none">Nothing booked. <button type="button" class="m-link" id="bookDay">Book a visit this day</button></p>') : "";
  const coming = comingVisits().slice(0, 8);
  frame({ title: "Calendar", sub: "Visits with your learners. Each one shows on their Evia calendar.", body:
    '<button type="button" class="btn primary wide" id="bookVisit">' + IC.plus + 'Book a visit</button>' +
    '<section class="card m-cal"><div class="m-cal-head"><button type="button" class="m-cal-nav" data-m="-1" aria-label="Previous month">‹</button><b>' + esc(first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })) + '</b><button type="button" class="m-cal-nav" data-m="1" aria-label="Next month">›</button></div>' +
      '<div class="m-cal-grid">' + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => '<span class="m-cal-dow">' + d + '</span>').join("") + cells + '</div>' +
      '<div class="m-cal-key"><span><i class="k-visit"></i>Visit booked</span><span><i class="k-due"></i>Review due</span></div></section>' +
    dayList +
    '<p class="label m-sec">Coming up</p>' + (coming.length ? '<section class="card m-list">' + coming.map((v) => visitRow(v, true)).join("") + '</section>' : empty("No visits booked", "Book a visit and it shows on the learner’s Evia calendar, so they know when you’re coming.")) });
  root.querySelector("#bookVisit").onclick = () => bookVisit({});
  const bd = root.querySelector("#bookDay"); if (bd) bd.onclick = () => bookVisit({ day: calDay });
  root.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { calMonth += +b.dataset.m; calDay = null; drawCalendar(); });
  root.querySelectorAll("[data-day]").forEach((b) => b.onclick = () => { calDay = calDay === b.dataset.day ? null : b.dataset.day; drawCalendar(); });
  root.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => learner(rows.find((r) => r.learner_id === b.dataset.id)));
  bindVisits();
  if (Date.now() - visitsAt > 60000 && navigator.onLine) loadVisits().then(() => { if (view === "home" && tab === "calendar") drawCalendar(); });
}
/* One visit: what, when and where, then start the observation, open the learner, move or cancel it. */
function visitSheet(v) {
  const r = rows.find((x) => x.enrolment_id === v.enrolment_id), name = v.learner || (r && r.name) || "Learner";
  const o = sheet('<p class="label">' + esc(KIND[v.kind] || "Visit") + '</p><h2>' + esc(name) + '</h2>' +
    '<p class="m-visit-when">' + IC.cal + '<span><b>' + esc(new Date(v.starts_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })) + '</b><br>' + esc(vTime(v) + " · " + vLen(v.minutes || 60)) + '</span></p>' +
    (v.place ? '<p class="m-visit-when">' + IC.pin + '<span>' + esc(v.place) + '</span></p>' : "") + (v.note ? '<p class="muted">' + esc(v.note) + '</p>' : "") +
    '<p class="small muted">' + esc(firstName(name)) + ' can see this on their Evia calendar' + (v.booked_by && !v.mine ? ". Booked by " + v.booked_by : "") + '.</p>' +
    '<div class="m-visit-acts">' + (r ? '<button type="button" class="btn primary wide" id="vObs">' + IC.eye + 'Start observation</button><button type="button" class="btn wide" id="vOpen">Open ' + esc(firstName(name)) + '</button>' : "") +
      (v.mine !== false ? '<button type="button" class="btn wide" id="vMove">Change day or time</button><button type="button" class="btn wide danger" id="vCancel">Cancel visit</button>' : "") + '</div><p class="err" hidden></p>', "Visit");
  const on = (id, fn) => { const b = o.querySelector("#" + id); if (b) b.onclick = fn; };
  on("vObs", async () => { o.remove(); hit("visit.observe"); await learner(r); const b = root.querySelector("#obs"); if (b) b.click(); });
  on("vOpen", () => { o.remove(); learner(r); });
  on("vMove", () => { o.remove(); bookVisit({ v }); });
  on("vCancel", async () => {
    if (!confirm("Cancel this visit? " + firstName(name) + " is told.")) return;
    const err = o.querySelector(".err");
    if (!navigator.onLine) { err.textContent = "Cancelling a visit needs signal."; err.hidden = false; return; }
    try { await rpc("nisia_cancel_visit", { p_id: v.id }); hit("visit.cancel"); visits = visits.filter((x) => x.id !== v.id); await loadVisits(true); o.remove(); toast("Visit cancelled. " + firstName(name) + " has been told."); redraw(); }
    catch (e) { err.textContent = e.message; err.hidden = false; }
  });
}
/* Book a visit (or move one): who, the day and time, how long, what for, and where. */
function bookVisit({ r, v, day }) {
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  const at = v ? new Date(v.starts_at) : null, who0 = v ? v.enrolment_id : r ? r.enrolment_id : "";
  const learnerOf = (id) => rows.find((x) => x.enrolment_id === id);
  const opts = rows.slice().sort((a, b) => a.name.localeCompare(b.name)).map((x) => '<option value="' + esc(x.enrolment_id) + '"' + (x.enrolment_id === who0 ? " selected" : "") + '>' + esc(x.name) + '</option>').join("");
  const sel = (name, list, cur) => '<select name="' + name + '">' + list.map(([k, t]) => '<option value="' + k + '"' + (String(k) === String(cur) ? " selected" : "") + '>' + t + '</option>').join("") + '</select>';
  const o = sheet('<h2>' + (v ? "Change the visit" : "Book a visit") + '</h2><p class="muted">It goes on the learner’s Evia calendar, and they and their employer are told.</p>' +
    '<form id="vF" class="m-form">' +
      '<label>Learner' + (v ? '<input type="text" value="' + esc(v.learner || "") + '" disabled>' : '<select name="who" required><option value="">Choose a learner</option>' + opts + '</select>') + '</label>' +
      '<div class="m-form-row"><label>Day<input type="date" name="day" required min="' + dkey(new Date()) + '" value="' + (at ? dkey(at) : day || dkey(tom)) + '"></label>' +
        '<label>Time<input type="time" name="time" required value="' + (at ? vTime(v) : "10:00") + '"></label></div>' +
      '<div class="m-form-row"><label>How long' + sel("len", [[30, "30 min"], [60, "1 hour"], [90, "1.5 hours"], [120, "2 hours"], [180, "3 hours"], [240, "4 hours"]], v ? v.minutes : 60) + '</label>' +
        '<label>What for' + sel("kind", [["visit", "Visit on site"], ["observation", "Observation"], ["review", "Progress review"]], v ? v.kind : "observation") + '</label></div>' +
      '<label>Where<input type="text" name="place" maxlength="200" placeholder="The site, or the employer’s address" value="' + esc(v ? v.place || "" : (learnerOf(who0) || {}).employer_name || "") + '"></label>' +
      '<label>Note for the learner <span class="muted small">(optional)</span><textarea name="note" maxlength="1000" rows="2" placeholder="For example: bring your PPE and photos of the wall">' + esc(v ? v.note || "" : "") + '</textarea></label>' +
      '<p class="err" hidden></p><button class="btn primary wide" type="submit">' + (v ? "Save" : "Book visit") + '</button></form>', "Book a visit");
  const f = o.querySelector("#vF"), err = o.querySelector(".err");
  const w = f.querySelector("[name=who]"), place = f.querySelector("[name=place]");
  if (w) w.onchange = () => { const x = learnerOf(w.value); if (x && !place.value) place.value = x.employer_name || ""; };
  f.onsubmit = async (e) => {
    e.preventDefault(); err.hidden = true;
    const d = new FormData(f), en = v ? v.enrolment_id : d.get("who"), when = new Date(d.get("day") + "T" + d.get("time"));
    if (!en) { err.textContent = "Choose a learner."; err.hidden = false; return; }
    if (isNaN(when)) { err.textContent = "Choose a day and time."; err.hidden = false; return; }
    if (when < new Date(Date.now() - 36e5)) { err.textContent = "That time has already gone."; err.hidden = false; return; }
    if (!navigator.onLine) { err.textContent = "Booking a visit needs signal, so the learner can be told. Try again when you’re back online."; err.hidden = false; return; }
    const b = f.querySelector("[type=submit]"); b.disabled = true;
    try {
      await rpc("nisia_book_visit", { p_enrolment: en, p_starts_at: when.toISOString(), p_minutes: +d.get("len"), p_kind: d.get("kind"), p_place: d.get("place") || null, p_note: d.get("note") || null, p_id: v ? v.id : null });
      hit(v ? "visit.move" : "visit.book"); await loadVisits(true); o.remove();
      const x = learnerOf(en); toast((v ? "Visit changed. " : "Visit booked. ") + "It’s on " + firstName(x ? x.name : "the learner") + "’s Evia calendar.");
      calMonth = when.getFullYear() * 12 + when.getMonth(); calDay = dkey(when); redraw();
    } catch (x) { err.textContent = x.message; err.hidden = false; b.disabled = false; }
  };
}

/* ---------- One learner: Overview, Portfolio and Reviews ---------- */
async function learner(r, keep) {
  if (!keep) { learnerBack = view === "home" ? tab : "learners"; lTab = "overview"; }
  view = r;
  const y = keep ? scrollY : 0, back = learnerBack;
  const head = { title: r.name, sub: esc(courseName(r.course_code)) + (r.employer_name ? " · " + esc(r.employer_name) : ""), back: ({ today: "What needs doing", learners: "Learners", assess: "To assess", reviews: "Reviews", calendar: "Calendar" })[back] || "Learners" };
  const goBack = () => { tab = back; home(); scrollTo(0, 0); };
  if (!keep) { frame({ ...head, body: '<div class="m-loading">' + EYES + '<p class="muted">Loading ' + esc(firstName(r.name)) + '…</p></div>' }); root.querySelector("#backBtn").onclick = goBack; }
  /* From the phone; downloaded now only if this learner hasn't been yet. */
  let D = await learnerData(r).catch(() => null);
  if (!D) {
    if (!navigator.onLine) { root.querySelector("#main").innerHTML = '<div class="card"><p class="err">' + esc(r.name) + '’s progress isn’t on this phone yet. Sync when you have signal.</p></div>'; return; }
    try { D = await refreshLearner(r); IDX = null; } catch (e) { root.querySelector("#main").innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
  }
  /* Downloaded before Milos showed the employer's feedback: fetch it once now. */
  if (!D.E && navigator.onLine) { try { D = await refreshLearner(r); } catch (_) {} }
  D = await withPending(r, D);
  if (view !== r) return;
  const L = D.L, P = D.P, F = facts({ ...L, P }), d = r.due;
  let groups = groupByUnit(L, P), onlyNew = false;
  const newCount = () => groups.reduce((n, g) => n + g.items.filter((it) => !it.latest).length, 0);
  const draft = (() => { try { return !!localStorage.getItem("milos-draft-" + r.enrolment_id); } catch (_) { return false; } })();
  const behind = F.timePct != null && F.ksb.pct < F.timePct - 10, word = F.nvq ? "criteria" : "KSBs";
  const dueBig = !d ? "Not scheduled" : d.overdue ? "Overdue" : d.days === 0 ? "Due today" : d.soon ? "Due in " + d.days + (d.days === 1 ? " day" : " days") : "Due " + ukDate(d.due);
  const stat = (b, s, warn) => '<div class="card m-stat"><b' + (warn ? ' class="warn"' : "") + '>' + esc(b) + '</b><span>' + esc(s) + '</span></div>';
  const act = (id, icon, t, s) => '<button type="button" class="card m-act" id="' + id + '"><span class="m-ic">' + icon + '</span><b>' + t + '</b><span class="sub">' + s + '</span></button>';
  const seg = [["overview", "Overview", ""], ["portfolio", "Portfolio", newCount() ? '<b class="m-badge">' + newCount() + '</b>' : ""], ["reviews", "Reviews", L.reviews.length ? " <small>" + L.reviews.length + "</small>" : ""]];
  frame({ ...head, body:
    '<div class="m-seg" role="tablist" aria-label="' + esc(r.name) + '">' + seg.map(([k, t, extra]) => '<button type="button" role="tab" id="tab-' + k + '" data-lt="' + k + '" aria-selected="' + (lTab === k) + '">' + t + extra + '</button>').join("") + '</div>' +
    /* Overview */
    '<div class="m-pane" data-pane="overview"' + (lTab === "overview" ? "" : " hidden") + '>' +
      '<section class="card m-card m-hero' + (d && d.overdue ? " is-bad" : "") + '"><p class="label">Progress review ' + F.reviewNo + '</p><p class="m-big ' + (!d ? "" : d.overdue ? "bad" : d.soon ? "warn" : "good") + '">' + esc(dueBig) + '</p>' +
        '<p class="m-card-sub">' + esc((d && d.overdue ? "It was due " + ukDate(d.due) + ". " : "") + (F.lastReview ? "Last review " + ukDate(F.lastReview) + "." : "No reviews yet.") + (F.hasEvia ? " Filled in from Evia as you go." : "")) + '</p>' +
        '<button type="button" class="btn primary wide" id="rev">' + IC.pen + (draft ? "Carry on with the review" : "Start progress review " + F.reviewNo) + '</button></section>' +
      (F.hasEvia ? "" : '<p class="note">Evia isn’t connected yet, so the review can’t be filled in from it. Tap <b>Connect Evia</b> below.</p>') +
      '<section class="card m-card"><p class="label">Where they are</p><p class="m-big">' + F.ksb.pct + '<small>%</small></p><p class="m-card-sub">of ' + word + ' signed off (' + F.ksb.met + ' of ' + F.ksb.total + ')' +
        (F.timePct != null ? ' · <b class="' + (behind ? "warn-t" : "good-t") + '">' + (behind ? "Behind for time" : "On track for time") + '</b>' : "") + '</p>' +
        (F.timePct != null ? '<div class="m-track" aria-hidden="true"><i style="width:' + Math.min(100, F.ksb.pct) + '%"></i><span class="m-now" style="left:' + Math.min(100, Math.max(0, F.timePct)) + '%"><em>Now · ' + F.timePct + '% through</em></span></div><div class="m-track-ends"><span>' + esc(ukDate(F.start)) + '</span><span>' + esc(ukDate(F.end)) + '</span></div>' : "") + '</section>' +
      '<div class="m-stats">' + stat(F.otj.total + " h", "off-the-job" + (F.otj.expected != null ? " · " + F.otj.expected + " h expected" : ""), F.otj.onTrack === false) +
        stat(String(F.evidencePeriod), "evidence since " + (F.lastReview ? "the last review" : "the start")) + stat(r.paired ? ago(r.last_activity) : "Not yet", r.paired ? "last in Evia" : "Evia connected", !r.paired) + '</div>' +
      (() => { const nv = comingVisits().find((x) => x.enrolment_id === r.enrolment_id); return nv ? '<section class="card m-list"><p class="label m-in">Next visit</p>' + visitRow(nv, true) + '</section>' : ""; })() +
      '<div class="m-acts">' + act("bookV", IC.cal, "Book a visit", "It shows on their Evia calendar") + act("obs", IC.eye, "New observation", "Capture it like Evia, then sign off") + act("pack", IC.pack, "IQA / EPA pack", "Everything, ready to download") +
        act("pair", IC.phone, r.paired ? "Connect a new phone" : "Connect Evia", r.paired ? "If they’ve changed phone" : "A code they scan") + '</div>' +
      employerHtml(D.E, r) +
      packCard(r) +
      '<div id="absBox"></div>' + '<div id="colBox"></div>' +
      insightsHtml(L.snapshot) + consistencyHtml(L.evidence) +
    '</div>' +
    /* Portfolio */
    '<div class="m-pane" data-pane="portfolio"' + (lTab === "portfolio" ? "" : " hidden") + '><div id="pfBox"></div></div>' +
    /* Reviews */
    '<div class="m-pane" data-pane="reviews"' + (lTab === "reviews" ? "" : " hidden") + '>' +
      (L.reviews.length ? '<section class="card m-list">' + L.reviews.slice().reverse().map((v, i) => { const rag = (v.content && v.content.answers && v.content.answers.overallRag) || "";
        return '<button type="button" class="m-row" data-rev="' + v.id + '"><span class="m-no">' + (L.reviews.length - i) + '</span><span class="m-row-main"><b>Review ' + (L.reviews.length - i) + '</b><span class="sub">' + esc(ukDate(v.reviewed_at)) + (v.pending ? " · waiting to send" : " · signed") + '</span></span>' +
          (rag ? '<span class="pill ' + (rag === "On track" ? "good" : rag === "At risk" ? "bad" : "warn") + '">' + esc(rag) + '</span>' : "") + '<span class="m-chev">' + IC.chev + '</span></button>'; }).join("") + '</section>'
        : empty("No reviews yet", "Start the first one from Overview. Milos fills it in from Evia.")) +
    '</div>' });
  root.querySelector("#backBtn").onclick = goBack;
  const pfBox = root.querySelector("#pfBox");
  const badge = () => { const t = root.querySelector("#tab-portfolio"), n = newCount(); if (!t) return; const b = t.querySelector(".m-badge"); if (n && b) b.textContent = n; else if (n) t.insertAdjacentHTML("beforeend", '<b class="m-badge">' + n + '</b>'); else if (b) b.remove(); };
  const drawPortfolio = () => {
    pfBox.innerHTML = portfolioHtml(groups, onlyNew, L.snapshot);
    pfBox.querySelector("#pfFilter").onclick = () => { onlyNew = !onlyNew; drawPortfolio(); };
    pfBox.querySelectorAll("[data-ev]").forEach((b) => b.onclick = () => {
      const item = groups.flatMap((g) => g.items).find((it) => it.e.id === b.dataset.ev);
      openEvidence({ L, groups, me: { name: who.name, member_id: r.org.member_id }, college: r.org.organisation }, item, (it, sent) => { IDX = null; drawPortfolio(); badge(); toast(sent ? "Saved to Nisia" : "Saved on this phone. It goes to Nisia when there’s signal."); });
    });
  };
  drawPortfolio();
  root.querySelectorAll("[data-lt]").forEach((b) => b.onclick = () => {
    lTab = b.dataset.lt; hit("learner." + lTab);
    root.querySelectorAll("[data-lt]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    root.querySelectorAll("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== lTab; });
  });
  scrollTo(0, y);
  const me = { name: who.name, member_id: r.org.member_id };
  root.querySelector("#rev").onclick = () => openReview({ ...L, P }, { ...me, roles: r.org.roles || [] }, (sent) => { IDX = null; toast(sent ? "Review saved to Nisia" : "Review saved on this phone. It goes to Nisia when there’s signal."); lTab = "reviews"; learner(r, true); });
  root.querySelector("#pair").onclick = () => pairing(r);
  root.querySelector("#bookV").onclick = () => bookVisit({ r });
  bindVisits();
  mountCollege(root.querySelector("#colBox"), r);
  mountAbsences(root.querySelector("#absBox"), { enrolment: r.enrolment_id, name: r.name, sheet: (h, l) => sheet(h, l), toast, hit });
  const pb = root.querySelector("#packBtn"); if (pb) pb.onclick = () => choosePack(r);
  root.querySelector("#pack").onclick = () => openPack(buildPack(L, { files: P.files, assessed: Object.fromEntries(groups.flatMap((g) => g.items).map((it) => [it.e.id, it.history])) }, me), (pk) => { try { packPdf(pk); } catch (e) { toast("Couldn’t make the PDF: " + e.message); } });
  root.querySelector("#obs").onclick = () => openObservation({ L, me }, (sent) => { IDX = null; toast(sent ? "Observation saved and signed off" : "Observation saved on this phone. It goes to Nisia when there’s signal."); learner(r, true); });
  root.querySelectorAll("[data-rev]").forEach((b) => b.onclick = () => { const v = L.reviews.find((x) => x.id === b.dataset.rev); showReview({ ...v.content, id: v.id, reviewedAt: String(v.reviewed_at).slice(0, 10) }); });
}
/* At college: each class the tutor finished in Symi, what was taught (and its KSBs) and whether the learner was
   there. Kept on the phone so it shows with no signal; brought up to date when there is. */
async function mountCollege(box, r) {
  if (!box) return;
  const KEY = "milos-college-" + r.enrolment_id;
  const draw = (data) => {
    const rows = Array.isArray(data) ? data : data && data.rows, quiz = (data && data.quiz) || [];
    if (!rows || !rows.length) { box.innerHTML = ""; return; }
    const quizOn = (d) => quiz.filter((x) => x.session_date === d);
    const here = rows.filter((x) => x.status === "present").length, taught = new Set(rows.flatMap((x) => x.ksbs || [])), mins = rows.reduce((n, x) => n + (x.status === "present" ? x.minutes || 0 : 0), 0);
    const pack = coursePack(r.course_code, r.enrolment_id), name = (k) => ((pack && pack.ksbs) || []).find((x) => x[0] === k)?.[1] || k;
    const tag = (x) => x.status === "present" ? (x.late ? '<span class="pill warn">Late</span>' : '<span class="pill good">Here</span>') : x.status === "absent" ? '<span class="pill ' + (x.reason ? "idle" : "bad") + '">' + esc(x.reason ? "Off: " + x.reason : "Absent") + '</span>' : '<span class="pill idle">Not marked</span>';
    box.innerHTML = '<section class="card m-list m-college"><p class="label m-in">At college</p>' +
      '<p class="m-card-sub m-in">' + here + ' of ' + rows.length + ' sessions · ' + Math.round(mins / 6) / 10 + ' h · ' + taught.size + (pack && pack.nvq ? " criteria" : " KSBs") + ' taught' +
        (quiz.length ? ' · class quizzes ' + Math.round(quiz.reduce((n, z) => n + z.right_answers, 0) / Math.max(1, quiz.reduce((n, z) => n + z.total, 0)) * 100) + '% right' : "") + '</p>' +
      rows.slice(0, 5).map((x) => '<div class="m-row"><span class="m-row-main"><b>' + esc(x.lesson || x.class) + '</b><span class="sub">' + esc(ukDate(x.session_date)) + ' · ' + esc(x.class) + '</span>' +
        '<span class="m-row-tags">' + tag(x) + quizOn(x.session_date).map((z) => '<span class="pill ' + (z.right_answers / z.total >= 0.7 ? "good" : z.right_answers / z.total >= 0.4 ? "warn" : "bad") + '">Quiz ' + z.right_answers + '/' + z.total + '</span>').join("") + ((x.ksbs || []).length ? '<span class="m-chips">' + x.ksbs.slice(0, 10).map((k) => '<span class="m-chip" title="' + esc(name(k)) + '">' + esc(k) + '</span>').join("") + '</span>' : "") + '</span></span></div>').join("") + '</section>';
  };
  try { draw(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (_) {}
  if (!navigator.onLine) return;
  try {
    const [rows, quiz] = await Promise.all([rpc("nisia_learner_college", { p_enrolment: r.enrolment_id }), rpc("nisia_learner_quizzes", { p_enrolment: r.enrolment_id }).catch(() => [])]);
    const data = { rows: rows || [], quiz: quiz || [] };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {} if (box.isConnected) draw(data);
  }
  catch (e) { console.warn("Milos: college", e.message); }
}
/* From the employer (Paros): their witness testimonies and how they rate the apprentice's behaviours. */
const WITNESS = ["", "Getting there", "Competent", "Excellent"], BEHAVE = ["", "Needs support", "Developing", "Good", "Excellent"];
function employerHtml(E, r) {
  if (!E || (!E.witness.length && !E.ratings.length)) return "";
  const C = coursePack(r.course_code, r.enrolment_id) || { ksbs: [] }, name = (k) => ((C.ksbs || []).find((x) => x[0] === k) || [k, ""])[1];
  const who = r.employer_name ? esc(r.employer_name) : "the employer", b = E.ratings[0];
  return '<section class="card m-card m-employer"><p class="label">From ' + who + '</p>' +
    (b ? '<div class="m-emp-head"><b>Behaviours</b><span class="sub">' + esc(ukDate(b.created_at)) + (E.ratings.length > 1 ? ' · ' + E.ratings.length + ' ratings so far' : '') + '</span></div>' +
      '<div class="m-beh">' + Object.entries(b.ratings || {}).sort().map(([k, v]) => '<div class="m-beh-row" title="' + esc(name(k)) + '"><span><b>' + esc(k) + '</b> ' + esc(name(k)) + '</span><i class="m-beh-bar"><i style="width:' + (Number(v) / 4 * 100) + '%" class="l' + Number(v) + '"></i></i><em>' + esc(BEHAVE[v] || v) + '</em></div>').join("") + '</div>' +
      (b.comment ? '<p class="m-quote">“' + esc(b.comment) + '”</p>' : "") : "") +
    (E.witness.length ? '<div class="m-emp-head"><b>Witness testimonies</b><span class="sub">' + E.witness.length + '</span></div>' + E.witness.map((w) =>
      '<div class="m-witness"><div class="m-emp-head"><b>' + esc(w.unit || "Witness testimony") + '</b><span class="pill ' + (w.rating >= 2 ? "good" : "warn") + '">' + esc(WITNESS[w.rating] || "") + '</span></div>' +
      '<p class="m-quote">“' + esc(w.statement) + '”</p><span class="sub">' + esc(ukDate(w.signed_at || w.created_at)) + (w.signed_at ? " · signed as seen first hand" : "") + '</span>' +
      ((w.ksbs || []).length ? '<span class="m-chips">' + w.ksbs.map((k) => '<span class="m-chip" title="' + esc(name(k)) + '">' + esc(k) + '</span>').join("") + '</span>' : "") + '</div>').join("") : "") +
  '</section>';
}
/* A completed review, kept in Nisia: read it here, or save a copy as a PDF. */
function showReview(c) {
  const o = sheet('<div class="sheet-head"><h2>Progress review</h2><button class="btn" id="rvPdf">' + IC.install + 'PDF</button></div>' + reviewHtml(c), "Progress review", true);
  o.querySelector("#rvPdf").onclick = async () => { try { await downloadPdf(c); } catch (e) { toast(e.message); } };
}
async function pairing(r) {
  if (!navigator.onLine) return toast("Connecting Evia needs signal: the code comes from Nisia.");
  const o = sheet('<div class="m-loading">' + EYES + '<p class="muted">Getting a code…</p></div>', "Connect Evia"), s = o.querySelector(".sheet");
  const x = () => { const b = s.querySelector(".x"); if (b) b.onclick = () => o.remove(); };
  try {
    const c = await call("nisia-admin", { action: "pairing_code", learner_id: r.learner_id });
    s.innerHTML = '<span class="m-grab" aria-hidden="true"></span><button class="x" aria-label="Close">×</button><h2>Connect ' + esc(firstName(r.name)) + '’s Evia</h2><p class="muted">They scan this with their phone’s camera, or open Evia and type the code underneath.</p><div class="qr">' + qrSvg(pairLink(c.code)) + '</div><p class="code">' + esc(c.code.slice(0, 3) + "-" + c.code.slice(3)) + '</p><p class="small muted center">Works once, for ' + c.expires_in_minutes + ' minutes. On a computer, open <a href="' + esc(EVIA_URL) + '" target="_blank" rel="noopener">' + esc(EVIA_URL.replace(/^https:\/\//, "")) + '</a>.</p>';
  } catch (e) { s.innerHTML = '<button class="x" aria-label="Close">×</button><p class="err">' + esc(e.message) + '</p>'; }
  x();
}

/* Milos, the assessor's app: Evia's look, Milos blue. Your learners (from Nisia), whose review is due, what Evia
   shows about each of them, their past reviews, connecting their Evia, and starting a review that's already filled
   in (review.js). Everything is read from Nisia under the college's own rules. */
import { db, AUTH_KEY, call, rpc, me, signOut, courseName, esc, ukDate, ago, qrSvg, pairLink, EVIA_URL } from "../../packages/core/nisia.js";
import { auth } from "../../packages/core/signin.js";
import { dueText, facts, openReview, downloadPdf } from "./review.js";
import { loadPortfolio, groupByUnit, portfolioHtml, openEvidence, insightsHtml } from "./portfolio.js";
import { openObservation } from "./observe.js";
import { cached, sync, onStatus, status, learnerData, refreshLearner, withPending, clear, flush } from "./store.js";
import { reviewHtml } from "../../packages/core/reviewdoc.js";

const root = document.getElementById("app");
let who = null, rows = [], filter = "all";
/* Opening Milos: with learners already on this phone, straight to them (signing in is only needed to sync);
   otherwise sign in, then download. Sign-in that can't reach Nisia (no signal) falls back to the phone's copy. */
const AUTH = { title: "Milos", subtitle: "For assessors", onReady: () => home(true) };
async function start() {
  let have = null; try { have = await withTimeout(cached(), 5000); } catch (_) {}
  /* Learners on the phone: open them straight away, whatever the sign-in is doing; syncing checks it later. */
  if (have && localStorage.getItem(AUTH_KEY)) return home(true);
  try { await withTimeout(auth(root, AUTH), 15000); }
  catch (e) {
    root.innerHTML = '<div class="auth"><div class="box"><p class="err">' + esc(navigator.onLine ? "Milos couldn’t reach Nisia: " + e.message : "You’re offline, and there are no learners on this phone yet. Connect to the internet once to download them.") + '</p><button class="btn primary wide" id="retry">Try again</button></div></div>';
    root.querySelector("#retry").onclick = start;
  }
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("it took too long to answer.")), ms))]);
db.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") clear().finally(start); });
start().catch((e) => { root.innerHTML = '<div class="auth"><p class="err">' + esc(e.message) + '</p></div>'; });

function toast(msg) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
/* Installing Milos as an app: Chrome and Edge offer it directly; on iPhone and iPad it's Share, then Add to Home Screen. */
let installer = null;
const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installer = e; const b = document.getElementById("install"); if (b) b.hidden = false; });
addEventListener("appinstalled", () => { installer = null; const b = document.getElementById("install"); if (b) b.hidden = true; toast("Milos is installed"); });
async function install() {
  if (installer) { installer.prompt(); await installer.userChoice; installer = null; document.getElementById("install").hidden = true; return; }
  toast(isIOS ? "In Safari, tap Share, then Add to Home Screen." : "Open your browser’s menu and choose Install Milos (or Add to Home screen).");
}
function shell(body, back) {
  root.innerHTML = '<div class="shell"><header class="top">' + (back ? '<button class="btn ghost" id="backBtn">‹ Learners</button>' : '<div class="brand"><span class="av" aria-hidden="true"><i></i><i></i></span><div>Milos<small>' + esc(who && who.name || "") + '</small></div></div>') +
    '<span class="spacer"></span><button class="btn" id="install"' + (installed() || (!installer && !isIOS) ? " hidden" : "") + '>Install app</button><button class="btn ghost" id="signout">Sign out</button></header><div class="syncbar" id="syncbar"></div><main class="main" id="main">' + body + '</main></div>';
  root.querySelector("#signout").onclick = async () => {
    const w = status().waiting;
    if (w && !confirm(w + (w === 1 ? " thing hasn’t" : " things haven’t") + " been sent to Nisia yet, and signing out deletes them from this phone. Sign out anyway?")) return;
    if (w && navigator.onLine) { try { await flush(); } catch (_) {} }
    await clear(); signOut();
  };
  drawSync(status());
  root.querySelector("#install").onclick = install;
  const b = root.querySelector("#backBtn"); if (b) b.onclick = home;
}
const pill = (d) => !d ? "" : d.overdue ? '<span class="pill bad">' + esc(dueText(d)) + '</span>' : d.soon ? '<span class="pill warn">' + esc(dueText(d)) + '</span>' : '<span class="pill good">' + esc(dueText(d)) + '</span>';

/* ---------- The sync bar: when the learners were last downloaded, what's waiting to send, and Sync now ---------- */
const hhmm = (d) => { const t = new Date(d); return (t.toDateString() === new Date().toDateString() ? "today " : t.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " ") + t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
function drawSync(st) {
  const bar = document.getElementById("syncbar"); if (!bar) return;
  const msg = st.syncing ? "Syncing with Nisia…" : (!st.online ? "Offline · " : "") + (st.syncedAt ? "Learners from " + hhmm(st.syncedAt) : "Not downloaded yet");
  bar.className = "syncbar" + (!st.online ? " off" : "") + (st.error && !st.syncing ? " err" : "");
  bar.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="msg">' + esc(msg) + (st.waiting ? ' · <b>' + st.waiting + ' waiting to send</b>' : "") +
    (st.error && !st.syncing && st.online ? '<small>' + esc(st.error) + '</small>' : "") + '</span><button class="btn ghost" id="syncNow"' + (st.syncing || !st.online ? " disabled" : "") + '>' + (st.syncing ? "Syncing…" : "Sync now") + '</button>';
  bar.querySelector("#syncNow").onclick = () => manualSync();
}
onStatus(drawSync);
let view = null;   /* what's on screen, so a sync can redraw it: "home" or the learner's row */
async function manualSync() {
  try {
    const out = await sync();
    if (!out) return toast("You’re offline. Milos syncs by itself when the signal comes back.");
    who = out.who; rows = out.rows; toast("Up to date with Nisia");
    if (view === "home") drawHome(); else if (view) { const r = rows.find((x) => x.enrolment_id === view.enrolment_id); if (r) learner(r, true); }
  } catch (e) {
    if (e.signedOut) { toast("Sign in again to sync."); return clear().then(() => signOut()); }
    toast("Couldn’t sync: " + e.message);
  }
}

/* ---------- Your learners ---------- */
async function home(fresh) {
  view = "home";
  const have = await cached().catch(() => null);
  if (have) { who = have.who; rows = have.rows; shell(""); drawHome(); if (fresh && navigator.onLine) manualSyncQuiet(); return; }
  shell('<p class="muted">Downloading your learners from Nisia…</p>');
  try { const out = await sync(); if (!out) throw new Error("You’re offline. Connect once to download your learners."); who = out.who; rows = out.rows; drawHome(); }
  catch (e) { root.querySelector("#main").innerHTML = '<div class="card"><p class="err">' + esc(e.message) + '</p><button class="btn primary" id="retry">Try again</button></div>'; root.querySelector("#retry").onclick = () => home(true); }
}
/* Background sync on opening: the screen updates when it's done, without a message. */
async function manualSyncQuiet() {
  try { const out = await sync(); if (!out) return; who = out.who; rows = out.rows; if (view === "home") drawHome(); }
  catch (e) { if (e.signedOut) { await clear(); signOut(); } }
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
async function learner(r, keepScroll) {
  view = r;
  const y = keepScroll ? scrollY : 0;
  shell('<p class="muted">Loading ' + esc(r.name) + '…</p>', true);
  /* From the phone; downloaded now only if this learner hasn't been yet. */
  let D = await learnerData(r).catch(() => null);
  if (!D) {
    if (!navigator.onLine) { root.querySelector("#main").innerHTML = '<div class="card"><p class="err">' + esc(r.name) + '’s progress isn’t on this phone yet. Sync when you have signal.</p></div>'; return; }
    try { D = await refreshLearner(r); } catch (e) { root.querySelector("#main").innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
  }
  D = await withPending(r, D);
  if (view !== r) return;
  const L = D.L, P = D.P;
  const F = facts(L), d = r.due;
  const stat = (b, s, warn) => '<div class="card stat"><b' + (warn ? ' style="color:var(--warn)"' : "") + '>' + esc(b) + '</b><span>' + esc(s) + '</span></div>';
  root.querySelector("#main").innerHTML =
    '<div class="between"><div><p class="label">' + esc(F.course) + '</p><h1>' + esc(r.name) + '</h1><p class="muted small">' + esc(F.employer || "") + ' · ' + esc(ukDate(F.start)) + ' to ' + esc(ukDate(F.end)) + '</p></div>' + pill(d) + '</div>' +
    (F.hasEvia ? "" : '<p class="note">Evia isn’t connected yet, so the review can’t be filled in from it. Connect it below.</p>') +
    '<div class="grid3 compact">' +
      stat(F.ksb.pct + "%", (F.nvq ? "criteria" : "KSBs") + " evidenced · " + (F.timePct ?? "–") + "% through", F.timePct != null && F.ksb.pct < F.timePct - 10) +
      stat(F.otj.total + " h", "off-the-job" + (F.otj.expected != null ? " · " + F.otj.expected + " h expected" : ""), F.otj.onTrack === false) +
      stat(F.evidencePeriod, "evidence since " + (F.lastReview ? "the last review" : "the start")) + '</div>' +
    insightsHtml(L.snapshot) +
    '<div class="row"><button class="btn primary" id="rev">' + (localStorage.getItem("milos-draft-" + r.enrolment_id) ? "Carry on with the review" : "Start progress review " + F.reviewNo) + '</button><button class="btn" id="obs">New observation</button><button class="btn" id="pair">' + (r.paired ? "Connect Evia on a new phone" : "Connect Evia") + '</button></div>' +
    '<h2>Reviews</h2><div class="card list">' + (L.reviews.length ? L.reviews.slice().reverse().map((v, i) =>
      '<button class="item" style="--cols:2" data-rev="' + v.id + '"><span class="name-cell"><span class="name">Review ' + (L.reviews.length - i) + '</span><span class="sub">' + esc(ukDate(v.reviewed_at)) + '</span></span><span class="small">' + esc((v.content && v.content.answers && v.content.answers.overallRag) || "") + '</span><span class="small">Signed</span><span class="chev">›</span></button>').join("") : '<p class="small muted" style="padding:10px 4px">None yet. The first one is started with the button above.</p>') + '</div>' +
    '<div id="pfBox"><p class="muted">Loading the portfolio…</p></div>';
  let onlyNew = false, groups = [];
  const pfBox = root.querySelector("#pfBox");
  const drawPortfolio = () => {
    pfBox.innerHTML = portfolioHtml(groups, onlyNew, L.snapshot);
    pfBox.querySelector("#pfFilter").onclick = () => { onlyNew = !onlyNew; drawPortfolio(); };
    pfBox.querySelectorAll("[data-ev]").forEach((b) => b.onclick = () => {
      const item = groups.flatMap((g) => g.items).find((it) => it.e.id === b.dataset.ev);
      openEvidence({ L, groups, me: { name: who.name, member_id: r.org.member_id }, college: r.org.organisation }, item, (it, sent) => { drawPortfolio(); toast(sent ? "Saved to Nisia" : "Saved on this phone. It goes to Nisia when there’s signal."); });
    });
  };
  groups = groupByUnit(L, P); drawPortfolio();
  if (y) scrollTo(0, y);
  root.querySelector("#rev").onclick = () => openReview({ ...L, P }, { name: who.name, member_id: r.org.member_id }, (sent) => { toast(sent ? "Review saved to Nisia" : "Review saved on this phone. It goes to Nisia when there’s signal."); learner(r); });
  root.querySelector("#pair").onclick = () => pairing(r);
  root.querySelector("#obs").onclick = () => openObservation({ L, me: { name: who.name, member_id: r.org.member_id } }, (sent) => { toast(sent ? "Observation saved and signed off" : "Observation saved on this phone. It goes to Nisia when there’s signal."); learner(r, true); });
  root.querySelectorAll("[data-rev]").forEach((b) => b.onclick = () => { const v = L.reviews.find((x) => x.id === b.dataset.rev); showReview({ ...v.content, id: v.id, reviewedAt: v.reviewed_at.slice(0, 10) }); });
}
/* A completed review, kept in Nisia: read it here, or save a copy as a PDF. */
function showReview(c) {
  const o = document.createElement("div"); o.className = "overlay";
  o.innerHTML = '<section class="sheet wide" role="dialog" aria-modal="true"><div class="sheet-head"><span style="flex:1"></span><button class="btn" id="rvPdf">PDF</button><button class="x" aria-label="Close">×</button></div>' + reviewHtml(c) + '</section>';
  o.onclick = (e) => { if (e.target === o) o.remove(); }; o.querySelector(".x").onclick = () => o.remove();
  o.querySelector("#rvPdf").onclick = async () => { try { await downloadPdf(c); } catch (e) { toast(e.message); } };
  document.body.appendChild(o);
}
async function pairing(r) {
  if (!navigator.onLine) return toast("Connecting Evia needs signal: the code comes from Nisia.");
  const o = document.createElement("div"); o.className = "overlay"; o.innerHTML = '<section class="sheet" role="dialog" aria-modal="true"><p class="muted">Getting a code…</p></section>';
  o.onclick = (e) => { if (e.target === o) o.remove(); }; document.body.appendChild(o);
  const s = o.querySelector(".sheet");
  try {
    const c = await call("nisia-admin", { action: "pairing_code", learner_id: r.learner_id });
    s.innerHTML = '<div class="sheet-head"><h2>Connect ' + esc(r.name.split(" ")[0]) + '’s Evia</h2><button class="x" aria-label="Close">×</button></div><p class="muted">They scan this with their phone’s camera, or open Evia and type the code underneath.</p><div class="qr">' + qrSvg(pairLink(c.code)) + '</div><p class="code">' + esc(c.code.slice(0, 3) + "-" + c.code.slice(3)) + '</p><p class="small muted" style="text-align:center">Works once, for ' + c.expires_in_minutes + ' minutes. On a computer, open <a href="' + esc(EVIA_URL) + '" target="_blank" rel="noopener">' + esc(EVIA_URL.replace(/^https:\/\//, "")) + '</a>.</p>';
    s.querySelector(".x").onclick = () => o.remove();
  } catch (e) { s.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
}

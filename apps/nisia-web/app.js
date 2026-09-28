/* Nisia portal, in the Nisia Portal mock-up's design: a sidebar, a stat strip, "Needs attention", progress against
   plan, and a page per learner. Real data from Nisia (Supabase), under each college's own rules.
   Master admin (the developer): every college, its seats and licence; create colleges and invite their admins.
   College portal: overview, learners, reviews, staff, courses and licence. Assessors and tutors see their own
   learners here and work in Milos. */
import { db, call, rpc, me, signOut, COURSES, courseName, esc, ukDate, qrSvg, pairLink, EVIA_URL } from "../../packages/core/nisia.js";
import { auth, MARK } from "../../packages/core/signin.js";
import { reviewHtml, reviewPdf } from "../../packages/core/reviewdoc.js";

const root = document.getElementById("app");
const BASE = location.origin + location.pathname;
const MILOS = new URL("milos/", BASE.replace(/apps\/nisia-web\/$/, "")).href;
const DAY = 864e5;
let who = null;
const S = { page: "overview", org: null, learner: null, filter: "all", q: "", data: null };

const start = () => auth(root, { title: "Nisia", subtitle: "For college and training provider staff.", split: true, onReady: home });
db.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") start(); });
start();

/* ---------- Helpers ---------- */
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  learners: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.3.2 3.9 1.8 4.5 4.8"/></svg>',
  review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v3H9zM8.5 11h7M8.5 14.5h7M8.5 18h4"/></svg>',
  staff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h3v-3"/></svg>',
  courses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5z"/><path d="M20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5a1.5 1.5 0 001.5-1.5z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2.5h5L16 6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  evia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
};
const COLORS = ["#0B6E78", "#6B4FD8", "#B86E00", "#1F8A4C", "#C0392B", "#2C85F7", "#8A5A44", "#4A5B6E"];
const colorFor = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return COLORS[Math.abs(h) % COLORS.length]; };
const initials = (n) => String(n || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const avatar = (n) => '<span class="av-i" style="background:' + colorFor(n) + '">' + esc(initials(n)) + '</span>';
const pillFor = (s) => s === "good" ? '<span class="pill good">On track</span>' : s === "warn" ? '<span class="pill warn">Needs a look</span>' : s === "bad" ? '<span class="pill bad">At risk</span>' : '<span class="pill idle">Not started</span>';
const stripeFor = (s) => s === "good" ? "var(--good)" : s === "warn" ? "var(--warn)" : "var(--bad)";
function pbar(value, expected) {
  if (value == null) return '<span class="small muted">No data yet</span>';
  const v = Math.max(0, Math.min(100, Math.round(value))), x = expected == null ? null : Math.max(0, Math.min(100, Math.round(expected)));
  const col = x == null || v >= x - 8 ? "var(--good)" : v >= x - 18 ? "var(--warn)" : "var(--bad)";
  return '<div class="pbar-row"><div class="pbar" style="flex:1" role="img" aria-label="' + v + '%' + (x != null ? " against " + x + "% expected" : "") + '"><div class="fill" style="width:' + v + '%;background:' + col + '"></div>' + (x != null ? '<div class="mark" style="left:calc(' + x + '% - 1px)"></div>' : "") + '</div><span class="num">' + v + '%' + (x != null ? ' <span style="color:var(--ink-3)">/ ' + x + '%</span>' : "") + '</span></div>';
}
const daysAgo = (d) => { const t = Date.parse(d); return isNaN(t) ? null : Math.floor((Date.now() - t) / DAY); };
const lastActive = (d) => { const n = daysAgo(d); return n == null ? "Never" : n <= 0 ? "Today" : n === 1 ? "Yesterday" : n + " days ago"; };
function toast(msg) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function modal(title, body, onOpen) {
  closeModal();
  const o = document.createElement("div"); o.className = "modal-back"; o.id = "modal";
  o.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="modal-head"><h2>' + esc(title) + '</h2><button class="x" aria-label="Close">×</button></div>' + body + '</div>';
  o.addEventListener("click", (e) => { if (e.target === o) closeModal(); });
  o.querySelector(".x").onclick = closeModal;
  document.body.appendChild(o);
  const m = o.querySelector(".modal"); if (onOpen) onOpen(m); return m;
}
const closeModal = () => { const m = document.getElementById("modal"); if (m) m.remove(); };
const busy = async (btn, label, fn) => { const was = btn.textContent; btn.disabled = true; btn.textContent = label; try { return await fn(); } finally { btn.disabled = false; btn.textContent = was; } };
const formData = (f) => Object.fromEntries(new FormData(f).entries());
const inviteUrl = (code) => BASE + "#invite=" + code;
function linkBox(url, email, name) {
  const body = encodeURIComponent("Hi" + (name ? " " + name : "") + ",\n\nYou’ve been invited to Nisia. Open this link to set up your sign-in (it works once, for 14 days):\n\n" + url + "\n\nIf the page asks you to sign in, tap “New here? I have an invite” and paste the link.\nYou’ll need an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator.");
  return '<div class="linkbox"><input class="input" readonly value="' + esc(url) + '" aria-label="Invite link"><button class="btn" type="button" data-copy="' + esc(url) + '">Copy</button></div>' +
    (email ? '<a class="btn wide" href="mailto:' + esc(email) + '?subject=' + encodeURIComponent("Your Nisia invite") + '&body=' + body + '">Email it to ' + esc(email) + '</a>' : "") +
    '<p class="small muted">Shown once. It works once, for 14 days.</p>';
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copy]"); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); toast("Copied"); } catch { toast("Select the link and copy it"); }
});

/* ---------- Shell ---------- */
function mine(org) { return (who.memberships || []).find((m) => m.organisation_id === org) || { roles: who.platform_admin ? ["admin"] : [], organisation: "" }; }
function navFor() {
  if (!S.org) return [["colleges", "Colleges", "home"]];
  const m = mine(S.org), admin = m.roles.includes("admin") || who.platform_admin, quality = m.roles.includes("quality");
  return [["overview", "Overview", "home"], ["learners", "Learners", "learners"], ["reviews", "Reviews", "review"]]
    .concat(admin ? [["staff", "Staff", "staff"], ["licence", "Courses and licence", "courses"]] : quality ? [["licence", "Courses and licence", "courses"]] : []);
}
function shell(content) {
  const m = S.org ? mine(S.org) : null, orgName = S.data && S.data.summary ? S.data.summary.name : m && m.organisation;
  const cur = S.page === "learner" ? "learners" : S.page;
  root.innerHTML =
    '<div class="mobile-head"><div style="display:flex;align-items:center;gap:8px">' + MARK + '<span class="brand-name" style="font-size:19px">Nisia</span></div><button class="btn" id="menuBtn" aria-label="Open menu">' + ICON.menu + '</button></div>' +
    '<div class="shell"><aside class="side" id="side">' +
      '<div class="brand">' + MARK + '<div><div class="brand-name">Nisia</div><div class="brand-sub">' + (S.org ? esc(orgName || "College") : "Master admin") + '</div></div></div>' +
      '<nav class="nav" aria-label="Main">' + (S.org && who.platform_admin ? '<button type="button" data-go="colleges">' + ICON.back + 'All colleges</button><div class="nav-sep"></div>' : "") +
        navFor().map(([id, label, ic]) => '<button type="button" data-go="' + id + '"' + (cur === id ? ' aria-current="page"' : "") + '>' + ICON[ic] + label + '</button>').join("") +
        (S.org && m.roles.some((r) => r === "assessor" || r === "tutor") ? '<div class="nav-sep"></div><a class="btn ghost" href="' + esc(MILOS) + '" style="justify-content:flex-start">Open Milos ›</a>' : "") + '</nav>' +
      '<div class="college"><span class="label">Signed in</span><b>' + esc(who.name || "") + '</b><span class="small muted">' + esc(who.platform_admin && !S.org ? "Master admin" : (m && m.roles.filter((r) => r !== "learner").join(", ")) || "") + '</span><button class="btn ghost small" type="button" id="signOut" style="align-self:flex-start;padding-left:0">Sign out</button></div>' +
    '</aside><main class="main" id="main">' + content + '</main></div>';
  root.querySelector("#signOut").onclick = () => signOut();
  root.querySelector("#menuBtn").onclick = () => root.querySelector("#side").classList.toggle("open");
  root.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => go(b.dataset.go));
}
/* Coming back to the tab: bring the page up to date, unless a window is open over it. */
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.org && S.data && Date.now() - S.data.at > 30000 && !document.getElementById("modal")) render(); });
function go(page, extra) {
  if (page === "colleges") { S.org = null; S.data = null; }
  S.page = page; Object.assign(S, extra || {}); window.scrollTo(0, 0); render();
}
const loading = () => shell('<p class="loading">Loading…</p>');

/* ---------- Where to go after signing in ---------- */
async function home() {
  try { who = await me(); } catch (e) { root.innerHTML = '<div class="auth"><p class="err">' + esc(e.message) + '</p></div>'; return; }
  const orgs = (who.memberships || []).filter((m) => m.roles.some((r) => r !== "learner"));
  if (who.platform_admin) { S.org = null; S.page = "colleges"; }
  else if (orgs.length) { S.org = orgs[0].organisation_id; S.page = "overview"; }
  else { root.innerHTML = '<div class="signin-form" style="min-height:100vh"><div class="form"><h2>You’re not part of a college yet</h2><p class="muted">Ask your college for an invite link.</p><button class="btn" id="so">Sign out</button></div></div>'; root.querySelector("#so").onclick = () => signOut(); return; }
  render();
}
async function render() {
  if (!S.org) return colleges();
  /* Fresh from Nisia whenever a page opens and what's held is over 30 seconds old, so new activity from Evia shows. */
  if (!S.data || S.data.org !== S.org) {
    loading();
    try { await loadCollege(); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  } else if (Date.now() - S.data.at > 30000) { try { await loadCollege(); } catch (_) { /* keep showing what we have */ } }
  ({ overview, learners: learnersPage, learner: learnerPage, reviews: reviewsPage, staff: staffPage, licence: licencePage }[S.page] || overview)();
}

/* ---------- College data, and each learner's status ---------- */
async function loadCollege() {
  const org = S.org, m = mine(org), admin = m.roles.includes("admin") || who.platform_admin, quality = m.roles.includes("quality");
  const [summary, learners, staff, activity] = await Promise.all([
    admin || quality ? rpc("nisia_college_summary", { p_org: org }) : null,
    rpc("nisia_college_learners", { p_org: org }),
    admin ? rpc("nisia_college_staff", { p_org: org }) : [],
    rpc("nisia_college_activity", { p_org: org }),
  ]);
  learners.forEach(assess);
  S.data = { org, summary, learners, staff, activity, admin, quality, at: Date.now() };
}
function assess(l) {
  const s = Date.parse(l.start_date), e = Date.parse(l.end_date), now = Date.now();
  l.through = e > s ? Math.round(Math.max(0, Math.min(1, (now - s) / (e - s))) * 100) : null;
  l.quiet = daysAgo(l.last_activity);
  const planned = l.planned_otj_hours != null ? Number(l.planned_otj_hours) : null;
  l.otjPct = planned ? Math.round(Number(l.otj_hours || 0) / planned * 100) : null;
  const lastRev = l.last_review ? Date.parse(l.last_review) : s;
  l.reviewIn = isNaN(lastRev) ? null : Math.ceil((lastRev + 84 * DAY - now) / DAY);
  l.reasons = []; let st = "good";
  const worse = (x) => { if (x === "bad" || st === "good") st = x; };
  if (!l.paired) { l.reasons.push("Evia not connected yet"); worse("warn"); }
  if (l.paired && (l.quiet == null || l.quiet > 14)) { l.reasons.push(l.quiet == null ? "Nothing from Evia yet" : "No activity for " + l.quiet + " days"); worse("bad"); }
  if (l.otjPct != null && l.through != null && l.otjPct < l.through - 15) { l.reasons.push("Learning hours " + (l.through - l.otjPct) + "% behind plan"); worse("warn"); }
  if (l.ksb_pct != null && l.through != null && l.ksb_pct < l.through - 18) { l.reasons.push("Evidence behind: " + l.ksb_pct + "% of KSBs at " + l.through + "% through"); worse("warn"); }
  if (l.reviewIn != null && l.reviewIn < 0) { l.reasons.push("Progress review overdue by " + -l.reviewIn + " days"); worse(l.reviewIn < -14 ? "bad" : "warn"); }
  else if (l.reviewIn != null && l.reviewIn <= 7) { l.reasons.push(l.reviewIn === 0 ? "Progress review due today" : "Progress review due in " + l.reviewIn + " days"); worse("warn"); }
  l.state = st;
}

/* ---------- Overview ---------- */
function barChart(rows) {
  const W = 460, H = 220, pl = 30, pb = 26, pt = 14, pr = 6, weeks = rows.length || 12, totals = rows.map((r) => r.evidence);
  const max = Math.max(4, Math.ceil(Math.max(0, ...totals) / 4) * 4), bw = (W - pl - pr) / weeks, y = (v) => pt + (H - pt - pb) * (1 - v / max);
  let grid = "", bars = "";
  for (let v = 0; v <= max; v += max / 4) grid += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>';
  rows.forEach((r, i) => {
    const x = pl + i * bw + bw * .18, w = bw * .64, last = i === weeks - 1;
    bars += '<rect x="' + x + '" y="' + y(r.evidence) + '" width="' + w + '" height="' + (y(0) - y(r.evidence)) + '" rx="3" fill="' + (last ? "var(--accent)" : "var(--accent-soft)") + '"><title>' + r.evidence + ' items</title></rect>';
    if (i % 3 === 2 || last) { const d = new Date(r.week_start); bars += '<text x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + d.getDate() + " " + d.toLocaleString("en-GB", { month: "short" }) + '</text>'; }
  });
  return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evidence added per week, last 12 weeks">' + grid + bars + '</svg></div>';
}
function overview() {
  const D = S.data, L = D.learners, sum = D.summary, name = (who.name || "").split(" ")[0];
  const joined = L.filter((l) => l.paired), active = joined.filter((l) => l.quiet != null && l.quiet < 7).length, quiet = joined.filter((l) => l.quiet == null || l.quiet > 14);
  const ev4 = L.reduce((n, l) => n + (l.evidence_4w || 0), 0), withPlan = L.filter((l) => l.otjPct != null && l.through != null), onTrack = withPlan.filter((l) => l.otjPct >= l.through - 8).length;
  const attention = L.filter((l) => l.state !== "good").sort((a, b) => (a.state === "bad" ? 0 : 1) - (b.state === "bad" ? 0 : 1)).slice(0, 6);
  const hour = new Date().getHours();
  shell(
    '<div class="topbar"><div><div class="label">' + esc(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })) + '</div><h1>Good ' + (hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening") + (name ? ", " + esc(name) : "") + '</h1></div>' +
      '<div class="actions">' + (D.admin ? '<button class="btn" type="button" id="invite">' + ICON.plus + 'Add learners</button>' : "") + '</div></div>' +
    '<section class="stats" aria-label="Summary">' +
      '<div class="stat"><span class="label">Learners</span><span class="big num">' + L.length + (sum ? '<small> / ' + sum.seats + ' seats</small>' : "") + '</span><span class="sub">' + (L.length - joined.length) + ' not using Evia yet</span></div>' +
      '<div class="stat"><span class="label">Active this week</span><span class="big num">' + (joined.length ? Math.round(active / joined.length * 100) + "%" : "–") + '</span><span class="sub">' + active + ' learners used Evia</span></div>' +
      '<div class="stat"><span class="label">Gone quiet</span><span class="big num" style="' + (quiet.length ? "color:var(--bad)" : "") + '">' + quiet.length + '</span><span class="sub">No activity for 14+ days</span></div>' +
      '<div class="stat"><span class="label">Evidence, last 4 weeks</span><span class="big num">' + ev4 + '</span><span class="sub">photos, videos and write-ups</span></div>' +
      '<div class="stat"><span class="label">Learning hours on track</span><span class="big num">' + (withPlan.length ? Math.round(onTrack / withPlan.length * 100) + "%" : "–") + '</span><span class="sub">' + onTrack + ' of ' + withPlan.length + ' learners</span></div>' +
    '</section>' +
    '<div class="grid cols-2">' +
      '<section class="panel"><div class="panel-head"><h2>Needs attention</h2><button class="btn ghost" data-go="learners" type="button">All learners</button></div><div class="attn">' +
        (attention.length ? attention.map((l) => '<button class="attn-row" type="button" data-learner="' + l.learner_id + '"><span class="stripe" style="background:' + stripeFor(l.state) + '"></span><span class="who"><span class="person">' + avatar(l.name) + '<span><b>' + esc(l.name) + '</b><br><span class="why">' + esc(l.reasons[0] || "") + '</span></span></span></span><span class="small muted">' + esc(courseName(l.course_code)) + '</span></button>').join("")
          : '<p class="muted">' + (L.length ? "Nobody needs attention right now." : "No learners yet." + (D.admin ? " Add your first apprentice on the Learners page." : "")) + '</p>') + '</div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Evidence added per week</h2><span class="small muted">' + (D.admin || D.quality ? "All learners" : "Your learners") + '</span></div>' + barChart(D.activity) +
        '<p class="small muted" style="margin-top:8px">Straight from Evia. Photos and files arrive when the learner is on WiFi.</p></section>' +
    '</div>');
  const inv = root.querySelector("#invite"); if (inv) inv.onclick = () => go("learners", { adding: true });
  root.querySelectorAll("[data-learner]").forEach((b) => b.onclick = () => go("learner", { learner: b.dataset.learner }));
  root.querySelectorAll("#main [data-go]").forEach((b) => b.onclick = () => go(b.dataset.go));
}

/* ---------- Learners ---------- */
function learnersPage() {
  const D = S.data, sum = D.summary;
  let list = D.learners.slice();
  if (S.filter !== "all") list = list.filter((l) => l.state === S.filter);
  if (S.q) list = list.filter((l) => (l.name || "").toLowerCase().includes(S.q.toLowerCase()));
  const count = (k) => D.learners.filter((l) => k === "all" || l.state === k).length;
  const full = sum && (sum.seats_used >= sum.seats || sum.status !== "active");
  shell(
    '<div class="topbar"><div><div class="label">' + esc(sum ? sum.name : "") + '</div><h1>Learners</h1></div><div class="actions">' + (D.admin ? '<button class="btn primary" type="button" id="add"' + (full ? " disabled" : "") + '>' + ICON.plus + 'Add a learner</button>' : "") + '</div></div>' +
    (D.admin && sum && sum.status !== "active" ? '<p class="err">This college’s licence is suspended. Existing learners carry on; new ones can’t be added.</p>' : D.admin && full ? '<p class="hint">All ' + sum.seats + ' seats are in use. Contact Nisia to add more.</p>' : "") +
    '<div class="filters"><input class="input search" id="q" type="search" placeholder="Search by name" value="' + esc(S.q) + '" aria-label="Search learners">' +
      '<div class="seg" role="group" aria-label="Filter by status">' + [["all", "All"], ["bad", "At risk"], ["warn", "Needs a look"], ["good", "On track"]].map(([k, t]) => '<button type="button" data-filter="' + k + '" aria-pressed="' + (S.filter === k) + '">' + t + ' <span class="num" style="opacity:.6">' + count(k) + '</span></button>').join("") + '</div></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Learner</th><th>Course</th><th>Last active</th><th>Evidence</th><th>KSB coverage vs plan</th><th>Learning hours vs plan</th><th>Status</th></tr></thead><tbody>' +
    (list.length ? list.map((l) => '<tr data-learner="' + l.learner_id + '" tabindex="0"><td><div class="person">' + avatar(l.name) + '<div><b>' + esc(l.name) + '</b>' + (l.employer_name ? '<br><span class="small muted">' + esc(l.employer_name) + '</span>' : "") + '</div></div></td>' +
      '<td class="small">' + esc(courseName(l.course_code)) + '</td>' +
      '<td class="num small" style="' + (l.quiet != null && l.quiet > 14 ? "color:var(--bad);font-weight:600" : "") + '">' + (l.paired ? lastActive(l.last_activity) : '<span class="muted">Evia not connected</span>') + '</td>' +
      '<td class="num">' + (l.evidence || 0) + '</td><td style="min-width:190px">' + pbar(l.ksb_pct, l.through) + '</td><td style="min-width:190px">' + pbar(l.otjPct, l.through) + '</td><td>' + pillFor(l.paired ? l.state : "none") + '</td></tr>').join("")
      : '<tr class="static"><td colspan="7" class="empty">' + (D.learners.length ? "No learners match these filters." : D.admin ? "No learners yet. Add your first apprentice." : "No learners are assigned to you yet.") + '</td></tr>') +
    '</tbody></table></div><p class="small muted">The dark mark on each bar shows where the learner should be by now, based on time through their programme.</p>');
  const q = root.querySelector("#q"); q.oninput = () => { S.q = q.value; learnersPage(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  root.querySelectorAll("[data-filter]").forEach((b) => b.onclick = () => { S.filter = b.dataset.filter; learnersPage(); });
  root.querySelectorAll("tr[data-learner]").forEach((r) => { const open = () => go("learner", { learner: r.dataset.learner }); r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
  const add = root.querySelector("#add"); if (add) add.onclick = addLearner;
  if (S.adding) { S.adding = false; if (add && !add.disabled) addLearner(); }
}
function staffPicker(chosen) {
  const people = (S.data.staff || []).filter((s) => s.active && (s.roles.includes("assessor") || s.roles.includes("tutor")));
  if (!people.length) return '<p class="small muted">Invite an assessor or tutor on the Staff page first; you can assign them later.</p>';
  return '<div class="choice">' + people.map((s) => '<label><input type="checkbox" name="staff" value="' + s.member_id + '"' + (chosen.includes(s.member_id) ? " checked" : "") + '> ' + esc(s.name || s.email) + ' <span class="small muted">' + esc(s.roles.filter((r) => r !== "admin").join(", ")) + '</span></label>').join("") + '</div>';
}
function addLearner() {
  const m = modal("Add a learner",
    '<form class="form-grid" id="f" novalidate>' +
    '<label class="field full">Full name<input name="name" autocomplete="off" required></label>' +
    '<label class="field full">Course<select name="course">' + COURSES.map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join("") + '</select></label>' +
    '<label class="field">Start date<input name="start_date" type="date" required></label>' +
    '<label class="field">Planned end date<input name="end_date" type="date" required></label>' +
    '<label class="field">Planned off-the-job hours<input name="planned_otj_hours" type="number" min="0" placeholder="e.g. 416"></label>' +
    '<label class="field">Learner’s email <small>(optional)</small><input name="email" type="email" autocomplete="off"></label>' +
    '<label class="field">Employer<input name="employer_name" autocomplete="off"></label>' +
    '<label class="field">Employer contact<input name="employer_contact_name" autocomplete="off"></label>' +
    '<label class="field full">Employer contact’s email<input name="employer_contact_email" type="email" autocomplete="off"></label>' +
    '<div class="field full"><span>Assessor and tutor</span>' + staffPicker([]) + '</div>' +
    '<p class="err full"></p><button class="btn primary wide full" type="submit">Add learner (uses 1 seat)</button></form>');
  const f = m.querySelector("#f");
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Adding…", async () => {
    try {
      const d = formData(f); delete d.staff;
      const r = await call("nisia-admin", { action: "add_learner", organisation_id: S.org, ...d, staff_member_ids: [...f.querySelectorAll("[name=staff]:checked")].map((x) => x.value) });
      closeModal(); toast(d.name + " added"); S.data = null; await render();
      pairing({ learner_id: r.learner_id, name: d.name });
    } catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}
/* One piece of evidence, as the learner saved it in Evia: what they wrote, the KSBs, and the photos or files. */
/* A completed review, as the college sees it (signatures included), with a PDF copy. */
async function showReview(id) {
  const m = modal("Progress review", '<p class="muted">Loading…</p>'); m.classList.add("wide-modal");
  try {
    const { data: v, error } = await db.from("reviews").select("id, content, reviewed_at").eq("id", id).single();
    if (error) throw error;
    const c = { ...v.content, id: v.id, reviewedAt: v.reviewed_at.slice(0, 10) };
    m.innerHTML = '<div class="modal-head"><button class="btn" type="button" id="rvPdf">PDF</button><button class="x" aria-label="Close">×</button></div>' + reviewHtml(c);
    m.querySelector(".x").onclick = closeModal;
    m.querySelector("#rvPdf").onclick = async () => { try { await reviewPdf(c); } catch (x) { toast(x.message); } };
  } catch (x) { m.innerHTML = '<p class="err">' + esc(x.message) + '</p>'; }
}
const assessedPill = (a) => !a ? '<span class="pill">Not yet</span>' : a.decision === "accepted" ? '<span class="pill good">Accepted</span>' : '<span class="pill warn">Changes needed</span>';
const EV_TYPE = { photo: "Photos", video: "Video", audio: "Recording", document: "Document", written: "Write-up" };
async function showEvidence(e) {
  if (!e) return;
  const m = modal(e.title,
    '<p class="small muted">' + esc([e.unit && e.unit !== e.title ? e.unit : "", EV_TYPE[e.type] || e.type, ukDate(e.at)].filter(Boolean).join(" · ")) + '</p>' +
    ((e.ksbs || []).length ? '<div class="chips">' + e.ksbs.map((k) => '<span class="pill">' + esc(k) + '</span>').join("") + '</div>' : "") +
    (e.text ? '<div class="quote"><span class="label">What they wrote</span><p style="white-space:pre-wrap;margin:6px 0 0">' + esc(e.text) + '</p></div>' : "") +
    '<div class="media" id="media"><p class="small muted">Loading files…</p></div>' +
    (e.assessment ? '<div class="quote"><span class="label">Assessment</span><p style="margin:6px 0 0">' + assessedPill(e.assessment) + ' ' + esc(ukDate(e.assessment.at)) + (e.assessment.by ? " by " + esc(e.assessment.by) : "") + '</p>' +
      (e.assessment.feedback ? '<p style="margin:6px 0 0">' + esc(e.assessment.feedback) + '</p>' : "") + ((e.assessment.ksbs || []).length ? '<p class="small" style="margin:6px 0 0"><b>KSBs signed off:</b> ' + esc(e.assessment.ksbs.join(", ")) + '</p>' : "") + '</div>' : '<p class="small muted">Not assessed yet. The assessor signs it off in Milos.</p>'));
  m.classList.add("wide-modal");
  const box = m.querySelector("#media");
  try {
    const { data: files, error } = await db.from("evidence_files").select("storage_path, mime_type").eq("evidence_id", e.id).order("created_at");
    if (error) throw error;
    if (!files.length) { box.innerHTML = '<p class="small muted">' + (e.photos_expected ? "The photos haven’t arrived yet. Evia sends them when the learner’s phone is on WiFi." : "No files with this one.") + '</p>'; return; }
    const { data: urls, error: ue } = await db.storage.from("evidence").createSignedUrls(files.map((f) => f.storage_path), 3600);
    if (ue) throw ue;
    box.innerHTML = files.map((f, i) => { const u = urls[i] && urls[i].signedUrl; if (!u) return "";
      return /^image\//.test(f.mime_type) ? '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="Photo ' + (i + 1) + ' of ' + files.length + '" loading="lazy"></a>'
        : /^video\//.test(f.mime_type) ? '<video src="' + esc(u) + '" controls playsinline preload="metadata"></video>'
        : /^audio\//.test(f.mime_type) ? '<audio src="' + esc(u) + '" controls></audio>'
        : '<a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">Open file ' + (i + 1) + '</a>'; }).join("");
  } catch (x) { box.innerHTML = '<p class="err">' + esc(who && who.platform_admin && !(who.memberships || []).some((x) => x.organisation_id === S.org) ? "Only the college’s own staff can open learners’ files." : x.message) + '</p>'; }
}
async function pairing(l) {
  const m = modal("Connect " + (l.name || "").split(" ")[0] + "’s Evia", '<p class="muted">Getting a code…</p>');
  try {
    const r = await call("nisia-admin", { action: "pairing_code", learner_id: l.learner_id });
    m.innerHTML = '<div class="modal-head"><h2>Connect ' + esc((l.name || "").split(" ")[0]) + '’s Evia</h2><button class="x" aria-label="Close">×</button></div>' +
      '<p class="muted">They scan this with their phone’s camera, or open Evia and type the code underneath.</p><div class="qr">' + qrSvg(pairLink(r.code)) + '</div><p class="big-code">' + esc(r.code.slice(0, 3) + "-" + r.code.slice(3)) + '</p><p class="small muted" style="text-align:center">Works once, for ' + r.expires_in_minutes + ' minutes. On a computer, open <a href="' + esc(EVIA_URL) + '" target="_blank" rel="noopener">' + esc(EVIA_URL.replace(/^https:\/\//, "")) + '</a>.</p>';
    m.querySelector(".x").onclick = closeModal;
    /* A learner connecting for the first time: say so here as soon as Evia joins, and update the page behind. */
    if (!l.paired) {
      const until = Date.now() + r.expires_in_minutes * 60000, org = S.org;
      const tick = async () => {
        if (!document.body.contains(m) || Date.now() > until) return;
        try { const now = (await rpc("nisia_college_learners", { p_org: org })).find((x) => x.learner_id === l.learner_id);
          if (now && now.paired) { m.querySelector(".qr").outerHTML = '<p class="connected">' + ICON.check + ' Evia is connected</p>'; S.data = null; toast((l.name || "").split(" ")[0] + "’s Evia is connected"); return; } } catch (_) {}
        setTimeout(tick, 5000);
      };
      setTimeout(tick, 5000);
    }
  } catch (x) { m.innerHTML = '<p class="err">' + esc(x.message) + '</p>'; }
}

/* ---------- One learner ---------- */
function sparkline(values) {
  const W = 300, H = 70, p = 6, max = Math.max(4, ...values), n = Math.max(2, values.length);
  const x = (i) => p + i * (W - 2 * p) / (n - 1), y = (v) => H - p - (H - 2 * p) * v / max;
  const pts = values.map((v, i) => x(i) + "," + y(v)).join(" "), last = values.length - 1;
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evidence per week, last 12 weeks"><line x1="' + p + '" x2="' + (W - p) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--line)"/>' +
    '<polygon points="' + p + ',' + y(0) + ' ' + pts + ' ' + x(last) + ',' + y(0) + '" fill="var(--accent-soft)"/><polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/><circle cx="' + x(last) + '" cy="' + y(values[last] || 0) + '" r="4" fill="var(--accent)"/></svg>';
}
async function learnerPage() {
  const l = S.data.learners.find((x) => x.learner_id === S.learner);
  if (!l) return go("learners");
  shell('<p class="loading">Loading ' + esc(l.name) + '…</p>');
  let d;
  try { d = await rpc("nisia_learner_detail", { p_learner: l.learner_id }); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  const snap = d.snapshot || null, first = (l.name || "").split(" ")[0];
  const ksbPct = l.ksb_pct ?? (snap && snap.ksb ? snap.ksb.pct : null);
  const units = snap && snap.units ? snap.units.map((u) => ({ name: u.name, pct: u.total ? Math.round((u.total - (u.missing || []).length) / u.total * 100) : 0 })) : [];
  const targets = (d.targets || []).map((t) => ({ t: t.title, s: t.status === "completed" ? "done" : t.due && Date.parse(t.due) < Date.now() ? "late" : "open", due: t.due, from: "Review" }))
    .concat((d.evia_targets || []).map((t) => ({ t: t.title, s: t.metAt ? "done" : t.due && Date.parse(t.due) < Date.now() ? "late" : "open", due: t.due, from: "Evia" })));
  const feed = (d.evidence || []).map((e) => ({ ev: e.id, ic: "photo", t: "Added " + (e.type === "written" ? "a write-up" : e.type === "document" ? "a document" : e.type === "video" ? "a video" : e.type === "audio" ? "a recording" : "photos") + " to " + e.title, at: e.at }))
    .concat((d.hours || []).map((h) => ({ ic: "clock", t: "Logged " + Number(h.hours) + " h: " + h.title, at: h.at }))).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);
  const planned = l.planned_otj_hours != null ? Number(l.planned_otj_hours) : null, otj = Math.round(Number(l.otj_hours || 0));
  shell(
    '<button class="btn ghost back" type="button" data-go="learners">' + ICON.back + 'All learners</button>' +
    '<div class="lhead">' + avatar(l.name) + '<div style="flex:1;min-width:220px"><h1>' + esc(l.name) + '</h1>' +
      '<div class="lmeta"><span class="tag">' + esc(courseName(l.course_code)) + '</span>' + (l.employer_name ? '<span class="tag">' + esc(l.employer_name) + '</span>' : "") + (l.assessors || []).map((a) => '<span class="tag">Assessor: ' + esc(a.name) + '</span>').join("") + pillFor(l.paired ? l.state : "none") + '</div>' +
      '<div style="margin-top:8px"><span class="sync ' + (!l.paired || l.quiet == null || l.quiet > 3 ? "stale" : "") + '">' + (l.paired ? "Last update from Evia: " + lastActive(d.snapshot_at || l.last_activity) : "Evia not connected yet") + '</span></div></div>' +
      '<div class="row-actions"><button class="btn primary" type="button" id="pair">' + ICON.evia + (l.paired ? "Connect Evia on a new phone" : "Connect Evia") + '</button>' + (S.data.admin ? '<button class="btn" type="button" id="assign">Assessor and tutor</button>' : "") + '</div></div>' +
    (l.reasons.length ? '<div class="panel" style="border-color:' + stripeFor(l.state) + ';display:flex;gap:10px;flex-direction:column"><span class="label">Why this learner is flagged</span>' + l.reasons.map((r) => '<span>• ' + esc(r) + '</span>').join("") + '</div>' : "") +
    '<section class="stats" aria-label="Learner summary">' +
      '<div class="stat"><span class="label">Through the course</span><span class="big num">' + (l.through ?? "–") + '%</span><span class="sub">' + esc(ukDate(l.start_date)) + ' to ' + esc(ukDate(l.end_date)) + '</span></div>' +
      '<div class="stat"><span class="label">KSB coverage</span><span class="big num">' + (ksbPct ?? "–") + (ksbPct != null ? "%" : "") + '</span><span class="sub">' + (snap ? snap.ksb.met + " of " + snap.ksb.total + " have evidence" : "Waiting for Evia") + '</span></div>' +
      '<div class="stat"><span class="label">Learning hours</span><span class="big num">' + otj + (planned ? '<small> / ' + planned + ' h</small>' : " h") + '</span><span class="sub">off-the-job' + (planned ? " target" : "") + '</span></div>' +
      '<div class="stat"><span class="label">Evidence items</span><span class="big num">' + (l.evidence || 0) + '</span><span class="sub">' + (l.evidence_4w || 0) + ' in the last 4 weeks</span></div>' +
      '<div class="stat"><span class="label">Last active</span><span class="big num" style="' + (l.quiet != null && l.quiet > 14 ? "color:var(--bad)" : "") + '">' + (l.quiet == null ? "–" : l.quiet <= 0 ? "Today" : l.quiet + "d") + '</span><span class="sub">' + (l.reviewIn == null ? "" : l.reviewIn < 0 ? "Review overdue" : "Review due in " + l.reviewIn + " days") + '</span></div>' +
    '</section>' +
    '<div class="grid cols-2">' +
      '<section class="panel"><div class="panel-head"><h2>Coverage by unit</h2><span class="small muted">% of each unit’s KSBs with evidence</span></div>' +
        (units.length ? '<div class="units">' + units.map((u) => '<div class="unit"><span>' + esc(u.name) + '</span><div class="ubar"><span style="width:' + u.pct + '%;' + (u.pct < 10 ? "background:var(--bad)" : "") + '"></span></div><span class="num small" style="text-align:right">' + u.pct + '%</span></div>').join("") + '</div>' : '<p class="muted small">This fills in once ' + esc(first) + '’s Evia is connected.</p>') + '</section>' +
      '<div class="grid" style="align-content:start">' +
        '<section class="panel"><div class="panel-head"><h2>Evidence per week</h2><span class="small muted">Last 12 weeks</span></div><div class="chart">' + sparkline((d.weekly || []).map(Number)) + '</div></section>' +
        '<section class="panel"><div class="panel-head"><h2>Learning hours</h2></div>' + pbar(l.otjPct, l.through) + '<p class="small muted" style="margin-top:8px">' + otj + (planned ? ' of ' + planned : "") + ' hours logged.' + (planned ? " The dark mark shows where " + esc(first) + " should be by now." : " Add planned hours to see this against plan.") + '</p></section>' +
      '</div></div>' +
    '<div class="grid cols-2">' +
      '<section class="panel"><div class="panel-head"><h2>Targets</h2><span class="small muted">Set in Evia and at reviews</span></div>' +
        (targets.length ? targets.map((g) => '<div class="target"><span class="tick ' + (g.s === "done" ? "done" : g.s === "late" ? "late" : "") + '"></span><span>' + esc(g.t) + '<br><span class="small muted">' + g.from + '</span></span><span class="small ' + (g.s === "late" ? "" : "muted") + '" style="' + (g.s === "late" ? "color:var(--bad);font-weight:600" : "") + '">' + (g.s === "done" ? "Done" : g.s === "late" ? "Overdue" : g.due ? "Due " + esc(ukDate(g.due)) : "") + '</span></div>').join("") : '<p class="muted small">No targets yet.</p>') + '</section>' +
      '<section class="panel"><div class="panel-head"><h2>Reviews</h2><span class="small muted">Done in Milos</span></div>' +
        '<div class="target"><span class="tick' + (l.reviewIn != null && l.reviewIn < 0 ? " late" : "") + '"></span><span><b>Next progress review</b><br><span class="small muted">' + (l.reviewIn == null ? "" : l.reviewIn < 0 ? "Overdue by " + -l.reviewIn + " days" : "Due in " + l.reviewIn + " days") + ' · filled in from Evia in Milos</span></span><span class="pill ' + (l.reviewIn != null && l.reviewIn < 0 ? "bad" : "warn") + '">' + (l.reviewIn != null && l.reviewIn < 0 ? "Overdue" : "Upcoming") + '</span></div>' +
        (d.reviews || []).map((r, i, a) => '<div class="target tap" role="button" tabindex="0" data-review="' + r.id + '"><span class="tick done"></span><span>Progress review ' + (a.length - i) + '<br><span class="small muted">Signed by all three, ' + esc(ukDate(r.at)) + '</span></span><span class="pill good">' + esc(r.overall || "Signed") + '</span></div>').join("") + '</section>' +
    '</div>' +
    '<section class="panel"><div class="panel-head"><h2>Evidence</h2><span class="small muted">' + (d.evidence || []).length + ' from Evia · tap one to see it</span></div>' +
      ((d.evidence || []).length ? '<div class="table-wrap flat"><table><thead><tr><th>Evidence</th><th>KSBs</th><th>Files</th><th>Added</th><th>Assessed</th></tr></thead><tbody>' + d.evidence.map((e) =>
        '<tr data-ev="' + e.id + '" tabindex="0"><td><b>' + esc(e.title) + '</b><br><span class="small muted">' + esc(EV_TYPE[e.type] || e.type) + '</span></td><td class="small">' + esc((e.ksbs || []).slice(0, 8).join(", ")) + '</td>' +
        '<td class="small">' + (e.files ? e.files + (e.files === 1 ? " file" : " files") : e.photos_expected ? '<span class="muted">Waiting for WiFi</span>' : "–") + '</td><td class="small num">' + esc(ukDate(e.at)) + '</td><td>' + assessedPill(e.assessment) + '</td></tr>').join("") + '</tbody></table></div>'
        : '<p class="muted small">Nothing yet. Evidence appears here as soon as ' + esc(first) + ' saves it in Evia.</p>') + '</section>' +
    '<div class="grid cols-2">' +
      '<section class="panel"><div class="panel-head"><h2>Recent activity in Evia</h2></div><div class="feed">' + (feed.length ? feed.map((f) => (f.ev ? '<button type="button" class="feed-item tap" data-ev="' + f.ev + '">' : '<div class="feed-item">') + '<span class="ficon">' + ICON[f.ic] + '</span><span>' + esc(f.t) + '</span><span class="small muted" style="white-space:nowrap">' + esc(lastActive(f.at)) + '</span>' + (f.ev ? '</button>' : '</div>')).join("") : '<p class="muted small">Nothing yet.</p>') + '</div></section>' +
      '<section class="panel"><div class="panel-head"><h2>What Nisia sees</h2>' + ICON.shield.replace("<svg", '<svg width="20" height="20" style="color:var(--accent)"') + '</div><div class="privacy">' +
        '<div><span class="label" style="color:var(--good)">From Evia</span><ul><li>Evidence, photos and write-ups</li><li>Learning hours</li><li>Targets and reviews</li><li>Lessons, tests and confidence</li><li>When Evia was last used</li></ul></div>' +
        '<div><span class="label">Kept safe</span><ul><li>Stored in the UK (London)</li><li>Only this college’s staff, and only their own learners</li><li>Photos upload on WiFi</li></ul></div></div></section>' +
    '</div>');
  root.querySelector("[data-go=learners].back").onclick = () => go("learners");
  root.querySelectorAll("[data-review]").forEach((r) => { const open = () => showReview(r.dataset.review); r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
  root.querySelectorAll("#main [data-ev]").forEach((r) => { const open = () => showEvidence(d.evidence.find((x) => x.id === r.dataset.ev)); r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
  root.querySelector("#pair").onclick = () => pairing(l);
  const as = root.querySelector("#assign");
  if (as) as.onclick = () => {
    const m = modal("Assessor and tutor for " + first, '<form id="f" style="display:flex;flex-direction:column;gap:14px">' + staffPicker((l.assessors || []).map((a) => a.member_id)) + '<p class="err"></p><button class="btn primary wide" type="submit">Save</button></form>');
    const f = m.querySelector("#f");
    f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button"), "Saving…", async () => {
      try { await call("nisia-admin", { action: "assign_staff", learner_id: l.learner_id, member_ids: [...f.querySelectorAll("[name=staff]:checked")].map((x) => x.value) }); closeModal(); toast("Saved"); S.data = null; S.page = "learner"; render(); }
      catch (x) { f.querySelector(".err").textContent = x.message; }
    }); };
  };
}

/* ---------- Reviews ---------- */
function reviewsPage() {
  const D = S.data, due = D.learners.filter((l) => l.reviewIn != null).sort((a, b) => a.reviewIn - b.reviewIn);
  shell(
    '<div class="topbar"><div><div class="label">' + esc(D.summary ? D.summary.name : "") + '</div><h1>Reviews</h1></div></div>' +
    '<p class="muted" style="max-width:72ch">A progress review is due at least every 12 weeks. The assessor opens it in Milos, already filled in from Evia; they add their judgement, the apprentice and employer add their comments, and all three sign.</p>' +
    '<div class="table-wrap"><table><thead><tr><th>Learner</th><th>Assessor</th><th>Last review</th><th>Due</th><th>Status</th></tr></thead><tbody>' +
    (due.length ? due.map((l) => '<tr data-learner="' + l.learner_id + '" tabindex="0"><td><div class="person">' + avatar(l.name) + '<b>' + esc(l.name) + '</b></div></td><td class="small">' + esc((l.assessors || []).map((a) => a.name).join(", ") || "Not assigned") + '</td>' +
      '<td class="small">' + (l.last_review ? esc(ukDate(l.last_review)) : '<span class="muted">None yet</span>') + '</td>' +
      '<td class="num small" style="' + (l.reviewIn < 0 ? "color:var(--bad);font-weight:600" : l.reviewIn < 7 ? "color:var(--warn);font-weight:600" : "") + '">' + (l.reviewIn < 0 ? "Overdue by " + -l.reviewIn + " days" : l.reviewIn === 0 ? "Today" : "In " + l.reviewIn + " days") + '</td>' +
      '<td>' + (l.reviewIn < 0 ? '<span class="pill bad">Overdue</span>' : l.reviewIn <= 14 ? '<span class="pill warn">Ready in Milos</span>' : '<span class="pill idle">Not due yet</span>') + '</td></tr>').join("")
      : '<tr class="static"><td colspan="5" class="empty">No learners yet.</td></tr>') + '</tbody></table></div>' +
    '<section class="panel"><div class="panel-head"><h2>Completed reviews</h2><span class="small muted">Signed by all three · open one to read it</span></div><div id="done"><p class="muted small">Loading…</p></div></section>');
  root.querySelectorAll("tr[data-learner]").forEach((r) => r.onclick = () => go("learner", { learner: r.dataset.learner }));
  const byEnrolment = Object.fromEntries(D.learners.map((l) => [l.enrolment_id, l]));
  db.from("reviews").select("id, enrolment_id, reviewed_at, overall:content->answers->>overallRag").eq("organisation_id", S.org).order("reviewed_at", { ascending: false }).limit(200).then(({ data, error }) => {
    const box = root.querySelector("#done"); if (!box) return;
    if (error) { box.innerHTML = '<p class="err">' + esc(error.message) + '</p>'; return; }
    const rows = (data || []).filter((r) => byEnrolment[r.enrolment_id]);
    box.innerHTML = rows.length ? '<div class="table-wrap flat"><table><thead><tr><th>Learner</th><th>Date</th><th>Overall</th></tr></thead><tbody>' + rows.map((r) =>
      '<tr data-review="' + r.id + '" tabindex="0"><td><div class="person">' + avatar(byEnrolment[r.enrolment_id].name) + '<b>' + esc(byEnrolment[r.enrolment_id].name) + '</b></div></td><td class="small">' + esc(ukDate(r.reviewed_at)) + '</td><td>' +
      (r.overall ? '<span class="pill ' + (r.overall === "On track" ? "good" : r.overall === "At risk" ? "bad" : "warn") + '">' + esc(r.overall) + '</span>' : "") + '</td></tr>').join("") + '</tbody></table></div>'
      : '<p class="muted small">None yet. Reviews done in Milos appear here.</p>';
    box.querySelectorAll("[data-review]").forEach((r) => { const open = () => showReview(r.dataset.review); r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
  });
}

/* ---------- Staff ---------- */
function staffPage() {
  const D = S.data;
  shell(
    '<div class="topbar"><div><div class="label">' + esc(D.summary ? D.summary.name : "") + '</div><h1>Staff</h1></div><div class="actions"><button class="btn primary" type="button" id="inv">' + ICON.plus + 'Invite staff</button></div></div>' +
    '<p class="muted" style="max-width:72ch">Assessors use Milos for reviews; tutors and quality staff see progress here. Everyone signs in with a password and an authenticator app.</p>' +
    '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Roles</th><th>Learners</th><th>Status</th><th></th></tr></thead><tbody>' +
    (D.staff.length ? D.staff.map((s) => '<tr class="static"><td><div class="person">' + avatar(s.name || s.email) + '<div><b>' + esc(s.name || s.email) + '</b><br><span class="small muted">' + esc(s.email) + '</span></div></div></td>' +
      '<td>' + s.roles.map((r) => '<span class="tag">' + esc(r) + '</span>').join(" ") + '</td><td class="num">' + s.learners + '</td>' +
      '<td>' + (s.active ? '<span class="pill good">Active</span>' : '<span class="pill idle">Switched off</span>') + '</td>' +
      '<td><button class="btn ghost" data-toggle="' + s.member_id + '">' + (s.active ? "Switch off" : "Switch on") + '</button></td></tr>').join("")
      : '<tr class="static"><td colspan="5" class="empty">No staff yet. Invite your assessors and tutors.</td></tr>') + '</tbody></table></div>');
  root.querySelector("#inv").onclick = () => inviteForm(S.org, "invite_staff");
  root.querySelectorAll("[data-toggle]").forEach((b) => b.onclick = () => {
    const s = D.staff.find((x) => x.member_id === b.dataset.toggle);
    busy(b, "Saving…", async () => { try { await call("nisia-admin", { action: "set_staff_active", member_id: s.member_id, active: !s.active }); S.data = null; S.page = "staff"; render(); } catch (x) { toast(x.message); } });
  });
}
function inviteForm(org, action, collegeName) {
  const admin = action === "invite_college_admin";
  const m = modal(admin ? "Invite a college admin" + (collegeName ? " to " + collegeName : "") : "Invite staff",
    '<form id="f" novalidate style="display:flex;flex-direction:column;gap:14px">' +
    '<label class="field">Name<input name="name" autocomplete="off"></label><label class="field">Email<input name="email" type="email" autocomplete="off"></label>' +
    (admin ? "" : '<div class="field"><span>Roles</span><div class="choice">' + [["assessor", "Assessor"], ["tutor", "Tutor"], ["admin", "College admin"], ["quality", "Quality (view only)"]].map(([v, t], i) => '<label><input type="checkbox" name="roles" value="' + v + '"' + (i === 0 ? " checked" : "") + '> ' + t + '</label>').join("") + '</div></div>') +
    '<p class="err"></p><button class="btn primary wide" type="submit">Create invite link</button></form>');
  const f = m.querySelector("#f");
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button"), "Creating…", async () => {
    try {
      const d = formData(f), roles = [...f.querySelectorAll("[name=roles]:checked")].map((x) => x.value);
      const r = await call("nisia-admin", { action, organisation_id: org, name: d.name, email: d.email, roles });
      modal("Invite ready", '<div style="display:flex;flex-direction:column;gap:12px">' + linkBox(inviteUrl(r.invite_code), d.email, d.name) + '</div>');
    } catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}

/* ---------- Courses and licence ---------- */
function licencePage() {
  const D = S.data, s = D.summary;
  shell(
    '<div class="topbar"><div><div class="label">' + esc(s.name) + '</div><h1>Courses and licence</h1></div></div>' +
    '<div class="grid cols-2e">' +
      '<section class="panel"><div class="panel-head"><h2>Licence</h2>' + (s.status === "active" ? '<span class="pill good">Active</span>' : '<span class="pill bad">Suspended</span>') + '</div>' +
        '<div style="display:flex;align-items:baseline;gap:8px"><span class="num" style="font-family:var(--display);font-size:34px;font-weight:700">' + s.seats_used + '</span><span class="muted">of ' + s.seats + ' seats in use</span></div>' +
        '<div class="seatbar"><span style="width:' + (s.seats ? Math.min(100, s.seats_used / s.seats * 100) : 0) + '%"></span></div>' +
        '<p class="small muted">' + (s.licence_ends ? "Licence runs until " + esc(ukDate(s.licence_ends)) + ". " : "") + 'Each learner uses a seat until they complete or withdraw. For more seats, contact Nisia.</p></section>' +
      '<section class="panel"><div class="panel-head"><h2>Courses</h2></div>' +
        COURSES.map((c) => '<div class="course"><div><b>' + esc(c.name) + '</b><br><span class="small muted">Units and KSBs, Teach me lessons, EPA guide and tests</span></div><span class="pill good">Included</span></div>').join("") + '</section>' +
    '</div>');
}

/* ---------- Master admin: colleges ---------- */
async function colleges() {
  shell('<p class="loading">Loading colleges…</p>');
  let list;
  try { list = await rpc("nisia_admin_colleges"); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  const sold = list.reduce((n, c) => n + c.seats, 0), used = list.reduce((n, c) => n + c.seats_used, 0), learners = list.reduce((n, c) => n + c.learners, 0);
  shell(
    '<div class="topbar"><div><div class="label">Master admin</div><h1>Colleges</h1></div><div class="actions"><button class="btn primary" type="button" id="new">' + ICON.plus + 'New college</button></div></div>' +
    '<section class="stats" aria-label="Summary" style="grid-template-columns:repeat(4,minmax(0,1fr))">' +
      '<div class="stat"><span class="label">Colleges</span><span class="big num">' + list.length + '</span><span class="sub">' + list.filter((c) => c.status === "active").length + ' active</span></div>' +
      '<div class="stat"><span class="label">Seats sold</span><span class="big num">' + sold + '</span><span class="sub">across all licences</span></div>' +
      '<div class="stat"><span class="label">Seats in use</span><span class="big num">' + used + '</span><span class="sub">' + (sold ? Math.round(used / sold * 100) : 0) + '% of seats sold</span></div>' +
      '<div class="stat"><span class="label">Learners</span><span class="big num">' + learners + '</span><span class="sub">on Nisia</span></div></section>' +
    '<div class="table-wrap"><table><thead><tr><th>College</th><th>Contact</th><th>Seats</th><th>Staff</th><th>Licence ends</th><th>Status</th></tr></thead><tbody>' +
    (list.length ? list.map((c) => '<tr data-id="' + c.id + '" tabindex="0"><td><div class="person">' + avatar(c.name) + '<b>' + esc(c.name) + '</b></div></td><td class="small">' + esc(c.contact_name || "") + (c.contact_email ? '<br><span class="muted">' + esc(c.contact_email) + '</span>' : "") + '</td>' +
      '<td style="min-width:170px"><div class="pbar-row"><div class="pbar" style="flex:1"><div class="fill" style="width:' + (c.seats ? Math.min(100, c.seats_used / c.seats * 100) : 0) + '%;background:' + (c.seats && c.seats_used >= c.seats ? "var(--bad)" : "var(--accent)") + '"></div></div><span class="num">' + c.seats_used + ' / ' + c.seats + '</span></div></td>' +
      '<td class="num">' + c.staff + '</td><td class="small">' + (c.licence_ends ? esc(ukDate(c.licence_ends)) : '<span class="muted">Not set</span>') + '</td><td>' + (c.status === "active" ? '<span class="pill good">Active</span>' : '<span class="pill bad">Suspended</span>') + '</td></tr>').join("")
      : '<tr class="static"><td colspan="6" class="empty">No colleges yet. Add the first one.</td></tr>') + '</tbody></table></div>');
  root.querySelector("#new").onclick = newCollege;
  root.querySelectorAll("tr[data-id]").forEach((r) => r.onclick = () => editCollege(list.find((c) => c.id === r.dataset.id)));
}
function newCollege() {
  const m = modal("New college",
    '<form class="form-grid" id="f" novalidate>' +
    '<label class="field full">College or provider name<input name="name" required></label>' +
    '<label class="field">Seats paid for<input name="seats" type="number" min="0" value="30"></label>' +
    '<label class="field">Licence ends<input name="licence_ends" type="date"></label>' +
    '<label class="field">College admin’s name<input name="admin_name" autocomplete="off"></label>' +
    '<label class="field">College admin’s email<input name="admin_email" type="email" autocomplete="off"></label>' +
    '<label class="field full">Notes (only you see these)<textarea name="notes" placeholder="e.g. invoice number, what they bought"></textarea></label>' +
    '<p class="err full"></p><button class="btn primary wide full" type="submit">Create college and invite its admin</button></form>');
  const f = m.querySelector("#f");
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Creating…", async () => {
    try {
      const d = formData(f), r = await call("nisia-admin", { action: "create_college", ...d });
      modal(d.name + " is set up", '<div style="display:flex;flex-direction:column;gap:12px"><p class="hint">Send this to ' + esc(d.admin_name || d.admin_email) + '. They choose a password, add Nisia to an authenticator app, and their college portal opens.</p>' + linkBox(inviteUrl(r.invite_code), d.admin_email, d.admin_name) + '</div>');
      colleges();
    } catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}
function editCollege(c) {
  const m = modal(c.name,
    '<section class="stats" style="grid-template-columns:1fr 1fr"><div class="stat"><span class="label">Seats</span><span class="big num">' + c.seats_used + '<small> / ' + c.seats + '</small></span><span class="sub">in use</span></div><div class="stat"><span class="label">People</span><span class="big num">' + c.learners + '</span><span class="sub">learners · ' + c.staff + ' staff</span></div></section>' +
    '<form class="form-grid" id="f">' +
    '<label class="field">Seats paid for<input name="seats" type="number" min="0" value="' + c.seats + '"><small>Can’t go below the ' + c.seats_used + ' in use.</small></label>' +
    '<label class="field">Licence ends<input name="licence_ends" type="date" value="' + esc(c.licence_ends || "") + '"></label>' +
    '<label class="field">Contact name<input name="contact_name" value="' + esc(c.contact_name || "") + '"></label>' +
    '<label class="field">Contact email<input name="contact_email" type="email" value="' + esc(c.contact_email || "") + '"></label>' +
    '<label class="field full">Status<select name="status"><option value="active"' + (c.status === "active" ? " selected" : "") + '>Active</option><option value="suspended"' + (c.status === "suspended" ? " selected" : "") + '>Suspended (no new learners)</option></select></label>' +
    '<p class="err full"></p><button class="btn primary wide full" type="submit">Save</button></form>' +
    '<div class="row-actions" style="justify-content:space-between"><button class="btn ghost" id="inv">Invite another college admin</button><button class="btn" id="open">Open their portal</button></div>');
  const f = m.querySelector("#f");
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Saving…", async () => {
    const d = formData(f);
    if (parseInt(d.seats) < c.seats_used) { f.querySelector(".err").textContent = c.seats_used + " seats are in use, so it can’t be fewer than that."; return; }
    try { await call("nisia-admin", { action: "update_college", organisation_id: c.id, ...d }); closeModal(); toast("Saved"); colleges(); }
    catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
  m.querySelector("#inv").onclick = () => inviteForm(c.id, "invite_college_admin", c.name);
  m.querySelector("#open").onclick = () => { closeModal(); S.org = c.id; S.data = null; S.page = "overview"; render(); };
}

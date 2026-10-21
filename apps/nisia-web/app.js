/* Evia Portal portal, in the Evia Portal Portal mock-up's design: a sidebar, a stat strip, "Needs attention", progress against
   plan, and a page per learner. Real data from Evia Portal (Supabase), under each college's own rules.
   Master admin (the developer): every college, its seats and licence; create colleges and invite their admins.
   College portal: overview, learners, reviews, staff, courses and licence. Assessors and tutors see their own
   learners here and work in Milos. */
import { db, call, rpc, me, signOut, COURSES, courseName, esc, ukDate, qrSvg, pairLink, EVIA_URL } from "../../packages/core/nisia.js";
import { auth, MARK } from "../../packages/core/signin.js";
import { startUsage, hit } from "../../packages/core/usage.js";
import { reviewHtml, reviewPdf } from "../../packages/core/reviewdoc.js";
import { coursePack, loadPacks, topicFor, packsLike } from "../../packages/core/packs.js";
import { unitStrength, strengthBars } from "../../packages/core/strength.js";
import { standardsPage } from "./standards.js";
import { collegePacksPage } from "./college-packs.js";
import { assistantsPage } from "./assistants.js";
import "../../packages/core/messages-ui.js";

const root = document.getElementById("app");
const BASE = location.origin + location.pathname;
/* The portal opened for a test account (?test): its own sign-in, and it stays in test mode. */
const TEST_PORTAL = BASE + "?test";
/* The other apps sit beside the portal: /nisia-app/milos/ next to /nisia-app/nisia/ when published,
   apps/milos/ next to apps/nisia-web/ here. Symi is published at symi/ (its short-lived addresses symi-app/ and tutor/ forward there). */
const SITE = BASE.replace(/[^/]*$/, "").replace(/(nisia-web|nisia)\/$/, "");
const MILOS = new URL("milos/", SITE).href, SYMI = new URL(/\/apps\/$/.test(SITE) ? "symi/" : "symi/", SITE).href, PAROS = new URL("paros/", SITE).href;
/* Every Evia Portal app, for everyone signed in to the portal (each app checks who can use it). */
const APPS = [["Evia", EVIA_URL, "Apprentices", "#E8B400"], ["Milos", MILOS, "Assessors", "#2C85F7"], ["Symi", SYMI, "Tutors, in the classroom", "#63C495"], ["Paros", PAROS, "Employers", "#E8781C"]];
const DAY = 864e5;
let who = null;
const S = { page: "overview", org: null, learner: null, filter: "all", q: "", data: null };
let msgUnread = 0; /* unread messages, for the Messages count in the menu */

const start = () => auth(root, { title: "Evia Portal", subtitle: "For college and training provider staff.", split: true, onReady: home });
db.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") start(); });
start();

/* ---------- Helpers ---------- */
const ICON = {
  message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12.2c0 4-3.6 7.1-8 7.1-1.1 0-2.2-.2-3.1-.6L4 20l1.3-3.7A6.6 6.6 0 0 1 4 12.2C4 8.3 7.6 5 12 5s8 3.3 8 7.2Z"/><path d="M8.5 11.5h7M8.5 14.3h4.5"/></svg>',
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
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  live: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.6"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 9.8h17M8 3v4M16 3v4"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  evia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
};
const COLORS = ["#0B6E78", "#6B4FD8", "#B86E00", "#1F8A4C", "#C0392B", "#2C85F7", "#8A5A44", "#4A5B6E"];
const colorFor = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return COLORS[Math.abs(h) % COLORS.length]; };
const initials = (n) => String(n || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const avatar = (n) => '<span class="av-i" style="background:' + colorFor(n) + '">' + esc(initials(n)) + '</span>';
const ENDED = (l) => l.status === "completed" || l.status === "withdrawn";
const endedPill = (l) => l.status === "completed" ? '<span class="pill good">Finished</span>' : '<span class="pill idle">Left</span>';
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
  const body = encodeURIComponent("Hi" + (name ? " " + name : "") + ",\n\nYou’ve been invited to Evia Portal. Open this link to set up your sign-in (it works once, for 14 days):\n\n" + url + "\n\nIf the page asks you to sign in, tap “New here? I have an invite” and paste the link.\nYou’ll need an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator.");
  return '<div class="linkbox"><input class="input" readonly value="' + esc(url) + '" aria-label="Invite link"><button class="btn" type="button" data-copy="' + esc(url) + '">Copy</button></div>' +
    (email ? '<a class="btn wide" href="mailto:' + esc(email) + '?subject=' + encodeURIComponent("Your Evia Portal invite") + '&body=' + body + '">Email it to ' + esc(email) + '</a>' : "") +
    '<p class="small muted">Shown once. It works once, for 14 days.</p>';
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copy]"); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); toast("Copied"); } catch { toast("Select the link and copy it"); }
});

/* ---------- Shell ---------- */
function mine(org) { return (who.memberships || []).find((m) => m.organisation_id === org) || { roles: who.platform_admin ? ["admin"] : [], organisation: "" }; }
function navFor() {
  if (!S.org) return [["colleges", "Colleges", "home"], ["standards", "Standards", "courses"], ["usage", "Usage", "chart"]];
  const m = mine(S.org), admin = m.roles.includes("admin") || who.platform_admin, quality = m.roles.includes("quality");
  return [["overview", "Overview", "home"], ["today", "Today", "live"], ["learners", "Learners", "learners"], ["messages", "Messages", "message"], ["classes", "Classes", "cal"], ["resources", "Resources", "courses"], ["reviews", "Reviews", "review"], ["registers", "Registers", "register"], ["attendance", "Attendance", "clock"]]
    .concat(admin || quality ? [["impact", "Impact", "chart"], ["packs", "Packs", "courses"], ["assistants", "Assistants", "spark"]] : [])
    .concat(admin ? [["staff", "Staff", "staff"], ["licence", "College", "courses"]] : quality ? [["licence", "College", "courses"]] : []);
}
function shell(content) {
  const m = S.org ? mine(S.org) : null, orgName = S.data && S.data.summary ? S.data.summary.name : m && m.organisation;
  const cur = S.page === "learner" ? "learners" : S.page;
  root.innerHTML =
    '<div class="mobile-head"><div style="display:flex;align-items:center;gap:8px">' + MARK + '<span class="brand-name" style="font-size:19px">Evia Portal</span></div><button class="btn" id="menuBtn" aria-label="Open menu">' + ICON.menu + '</button></div>' +
    '<div class="shell"><aside class="side" id="side">' +
      '<div class="brand">' + MARK + '<div><div class="brand-name">Evia Portal</div><div class="brand-sub">' + (S.org ? esc(orgName || "College") : "Master admin") + '</div></div></div>' +
      '<nav class="nav" aria-label="Main">' + (S.org && who.platform_admin ? '<button type="button" data-go="colleges">' + ICON.back + 'All colleges</button><div class="nav-sep"></div>' : "") +
        navFor().map(([id, label, ic]) => '<button type="button" data-go="' + id + '"' + (cur === id ? ' aria-current="page"' : "") + '>' + ICON[ic] + label + (id === "messages" ? '<span class="nav-count" id="navMsgCount"' + (msgUnread ? "" : " hidden") + '>' + msgUnread + '</span>' : "") + '</button>').join("") +
        '<div class="nav-sep"></div><span class="nav-label">Apps</span>' + APPS.map(([name, href, who, dot]) => '<a class="nav-app" href="' + esc(href) + '" target="_blank" rel="noopener" data-app="' + esc(name) + '"><i style="background:' + dot + '" aria-hidden="true"></i><span><b>' + name + '</b><small>' + who + '</small></span></a>').join("") + '</nav>' +
      '<div class="college"><span class="label">Signed in</span><b>' + esc(who.name || "") + '</b><span class="small muted">' + esc(who.platform_admin && !S.org ? "Master admin" : (m && m.roles.filter((r) => r !== "learner").join(", ")) || "") + '</span><button class="btn ghost small" type="button" id="signOut" style="align-self:flex-start;padding-left:0">Sign out</button></div>' +
    '</aside><main class="main" id="main">' + content + '</main></div>';
  root.querySelector("#signOut").onclick = () => signOut();
  root.querySelector("#menuBtn").onclick = () => root.querySelector("#side").classList.toggle("open");
  root.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => go(b.dataset.go));
}
/* Every "open this app" link in the portal (the menu, the Assistants page) goes the same way. */
document.addEventListener("click", (e) => { const a = e.target.closest && e.target.closest("a[data-app]"); if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return; e.preventDefault(); openApp(a.dataset.app); });
/* Getting an app, the same way every time, from the portal.
   On a phone: the app opens in the phone's own browser, which can install it. (Opened from inside the installed
   portal, or from a link in Gmail or WhatsApp, Android would use a small in-app window that can't install anything,
   so on Android it's sent to Chrome itself; if the app is already installed, Chrome offers to open it.)
   On a computer: a code to scan with the phone's camera, and the app on this computer too. */
const PHONE = /android|iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const ANDROID = /android/i.test(navigator.userAgent);
const inChrome = (url) => { const u = new URL(url); return "intent://" + u.host + u.pathname + u.search + "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" + encodeURIComponent(u.href) + ";end"; };
function openApp(name) {
  const a = APPS.find((x) => x[0] === name); if (!a) return;
  const [, href, who, dot] = a, url = new URL(href); url.searchParams.set("install", "");
  const link = url.href.replace(/=$/, "").replace("install=&", "install&");
  hit("app.open." + name.toLowerCase());
  if (PHONE) { location.href = ANDROID ? inChrome(link) : link; return; }
  modal("Get " + name, '<div style="display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center">' +
    '<p class="hint" style="margin:0">For ' + esc(who.toLowerCase()) + '. Point your phone’s camera at the code, open the link, and ' + esc(name) + ' shows how to install it on that phone. Sign in with your Evia Portal email and password.</p>' +
    '<div style="width:220px;padding:10px;border-radius:16px;background:#fff;box-shadow:inset 0 0 0 3px ' + dot + '">' + qrSvg(link, 5) + '</div>' +
    linkBox(link) +
    '<a class="btn primary wide" href="' + esc(link) + '" target="_blank" rel="noopener">Open ' + esc(name) + ' on this computer</a></div>');
}
/* The same account shows the same thing on every device: coming back to the tab brings the page up to date, and it
   keeps itself up to date every minute while it's on screen. Never under someone's fingers: not with a window open
   over it or while something's being typed. */
const refreshPage = (gap) => {
  if (document.hidden || !S.org || !S.data || Date.now() - S.data.at < gap || document.getElementById("modal")) return;
  if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
  S.data.at = 0; render();
};
document.addEventListener("visibilitychange", () => refreshPage(15000)); addEventListener("focus", () => refreshPage(15000));
setInterval(() => refreshPage(55000), 60000);
startUsage("portal", new URL(import.meta.url).searchParams.get("v") || "");
function go(page, extra) {
  hit("page." + page);
  if (page === "colleges" || page === "usage" || page === "standards") { S.org = null; S.data = null; }
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
  if (!S.org) return S.page === "usage" ? usagePage() : S.page === "standards" ? standardsPage({ shell, rpc, esc, modal, closeModal, busy, toast, hit, ukDate }) : colleges();
  /* Fresh from Evia Portal whenever a page opens and what's held is over 30 seconds old, so new activity from Evia shows. */
  if (!S.data || S.data.org !== S.org) {
    loading();
    try { await loadCollege(); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  } else if (Date.now() - S.data.at > 30000) { try { await loadCollege(); } catch (_) { /* keep showing what we have */ } }
  ({ overview, learners: learnersPage, learner: learnerPage, reviews: reviewsPage, today: () => todayPage(), classes: classesPage, resources: resourcesPage, staff: staffPage, licence: licencePage, impact: impactPage, attendance: attendancePage, registers: registersPage, messages: messagesPage,
    assistants: () => assistantsPage({ shell, esc, modal, closeModal, toast, hit, ukDate, summary: () => S.data.summary }),
    packs: () => collegePacksPage({ shell, rpc, esc, modal, closeModal, busy, toast, hit, org: () => S.org, refreshPacks: () => loadPacks(rpc), collegeName: () => (S.data && S.data.summary && S.data.summary.name) || mine(S.org).organisation }) }[S.page] || overview)();
}

/* ---------- College data, and each learner's status ---------- */
async function loadCollege() {
  await loadPacks(rpc).catch((e) => console.warn("Evia Portal: packs", e.message));
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
  if (ENDED(l)) { l.state = "ended"; l.reasons = []; }
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
  /* Learners who have left or finished are only under their own filter. */
  list = S.filter === "all" ? list.filter((l) => !ENDED(l)) : list.filter((l) => l.state === S.filter);
  if (S.q) list = list.filter((l) => (l.name || "").toLowerCase().includes(S.q.toLowerCase()));
  const count = (k) => D.learners.filter((l) => k === "all" ? !ENDED(l) : l.state === k).length;
  const full = sum && (sum.seats_used >= sum.seats || sum.status !== "active");
  shell(
    '<div class="topbar"><div><div class="label">' + esc(sum ? sum.name : "") + '</div><h1>Learners</h1></div><div class="actions">' + (D.admin ? '<button class="btn" type="button" id="guests">Meeting guests</button><button class="btn primary" type="button" id="add"' + (full ? " disabled" : "") + '>' + ICON.plus + 'Add a learner</button>' : "") + '</div></div>' +
    (D.admin && sum && sum.status !== "active" ? '<p class="err">This college’s licence is suspended. Existing learners carry on; new ones can’t be added.</p>' : D.admin && full ? '<p class="hint">All ' + sum.seats + ' seats are in use. Contact Evia to add more.</p>' : "") +
    '<div class="filters"><input class="input search" id="q" type="search" placeholder="Search by name" value="' + esc(S.q) + '" aria-label="Search learners">' +
      '<div class="seg" role="group" aria-label="Filter by status">' + [["all", "All"], ["bad", "At risk"], ["warn", "Needs a look"], ["good", "On track"]].concat(D.learners.some(ENDED) ? [["ended", "Left or finished"]] : []).map(([k, t]) => '<button type="button" data-filter="' + k + '" aria-pressed="' + (S.filter === k) + '">' + t + ' <span class="num" style="opacity:.6">' + count(k) + '</span></button>').join("") + '</div></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Learner</th><th>Course</th><th>Last active</th><th>Evidence</th><th>KSB coverage vs plan</th><th>Learning hours vs plan</th><th>Status</th></tr></thead><tbody>' +
    (list.length ? list.map((l) => '<tr data-learner="' + l.learner_id + '" tabindex="0"><td><div class="person">' + avatar(l.name) + '<div><b>' + esc(l.name) + '</b>' + (l.employer_name ? '<br><span class="small muted">' + esc(l.employer_name) + '</span>' : "") + '</div></div></td>' +
      '<td class="small">' + esc(courseName(l.course_code)) + '</td>' +
      '<td class="num small" style="' + (l.quiet != null && l.quiet > 14 ? "color:var(--bad);font-weight:600" : "") + '">' + (l.paired ? lastActive(l.last_activity) : '<span class="muted">Evia not connected</span>') + '</td>' +
      '<td class="num">' + (l.evidence || 0) + '</td><td style="min-width:190px">' + pbar(l.ksb_pct, l.through) + '</td><td style="min-width:190px">' + pbar(l.otjPct, l.through) + '</td><td>' + (ENDED(l) ? endedPill(l) + '<br><span class="small muted">' + esc(ukDate(l.ended_on || "")) + '</span>' : pillFor(l.paired ? l.state : "none")) + '</td></tr>').join("")
      : '<tr class="static"><td colspan="7" class="empty">' + (D.learners.length ? "No learners match these filters." : D.admin ? "No learners yet. Add your first apprentice." : "No learners are assigned to you yet.") + '</td></tr>') +
    '</tbody></table></div>' + (S.filter === "ended" && D.admin ? '<div class="row-actions" style="margin-top:12px"><button class="btn" type="button" id="leaversDl">Download the leavers list</button></div>' : "") + '<p class="small muted">The dark mark on each bar shows where the learner should be by now, based on time through their programme.</p>');
  const ld = root.querySelector("#leaversDl"); if (ld) ld.onclick = leaversCsv;
  const q = root.querySelector("#q"); q.oninput = () => { S.q = q.value; learnersPage(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  root.querySelectorAll("[data-filter]").forEach((b) => b.onclick = () => { S.filter = b.dataset.filter; learnersPage(); });
  root.querySelectorAll("tr[data-learner]").forEach((r) => { const open = () => go("learner", { learner: r.dataset.learner }); r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
  const add = root.querySelector("#add"); if (add) add.onclick = addLearner;
  const gu = root.querySelector("#guests"); if (gu) gu.onclick = meetingGuests;
  if (S.adding) { S.adding = false; if (add && !add.disabled) addLearner(); }
}
/* ---------- A learner leaves or finishes ----------
   Their seat frees up, they come off class registers (Symi) and their employer's list (Paros), and Evia tells them
   (with a copy of their portfolio to keep). Nothing is deleted, and it can be undone. (services/supabase/leavers.sql) */
const LEFT_WHY = ["Changed job", "Moved away", "Health", "Personal reasons", "The course wasn’t right for them", "Dismissed by the employer", "Other"];
function endSheet(l) {
  const pad = (n) => String(n).padStart(2, "0"), d = new Date(), today = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const m = modal(l.name + ": left or finished",
    '<form id="endF"><div class="field">What happened?<div class="seg" role="group" style="margin-top:6px"><button type="button" data-kind="finished" aria-pressed="false">Finished the course</button><button type="button" data-kind="left" aria-pressed="false">Left the course</button></div></div>' +
    '<label class="field">On<input class="input" type="date" name="on" value="' + today + '" max="' + today + '" required></label>' +
    '<label class="field" id="whyF" hidden>Why they left<select class="input" name="why"><option value="">Choose…</option>' + LEFT_WHY.map((x) => '<option>' + esc(x) + '</option>').join("") + '</select></label>' +
    '<label class="field" id="whyMore" hidden>A few words (optional)<input class="input" name="more" maxlength="120"></label>' +
    '<p class="hint">Their seat frees up straight away, and they come off class registers and their employer’s list. Their evidence, hours, reviews and attendance are all kept. You can undo this.</p>' +
    '<p class="err" hidden></p><div class="row-actions"><button class="btn primary" type="submit" disabled>Confirm</button></div></form>');
  const f = m.querySelector("#endF"), err = f.querySelector(".err"), sub = f.querySelector("[type=submit]"); let kind = "";
  const ok = () => { sub.disabled = !kind || (kind === "left" && !f.why.value); };
  f.querySelectorAll("[data-kind]").forEach((b) => b.onclick = () => { kind = b.dataset.kind; f.querySelectorAll("[data-kind]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); f.querySelector("#whyF").hidden = kind !== "left"; f.querySelector("#whyMore").hidden = kind !== "left"; ok(); });
  f.why.onchange = ok;
  f.onsubmit = async (e) => {
    e.preventDefault(); err.hidden = true; sub.disabled = true;
    const reason = kind === "left" ? [f.why.value, f.more.value.trim()].filter(Boolean).join(": ") : null;
    try { await rpc("nisia_end_enrolment", { p_enrolment: l.enrolment_id, p_kind: kind, p_on: f.on.value || today, p_reason: reason }); }
    catch (x) { err.textContent = x.message; err.hidden = false; sub.disabled = false; return; }
    hit("learner." + kind); closeModal(); toast(l.name + (kind === "left" ? " is marked as left." : " is marked as finished.") + " Their seat is free.");
    await loadCollege(); learnerPage();
  };
}
async function undoEnd(l) {
  if (!confirm("Put " + l.name + " back on the course? They go back on their classes and take a seat again.")) return;
  try { const r = await rpc("nisia_undo_end_enrolment", { p_enrolment: l.enrolment_id }); toast(l.name + " is back on the course" + (r && r.classes ? " and " + (r.classes === 1 ? "their class" : "their " + r.classes + " classes") : "") + "."); }
  catch (x) { toast(x.message); return; }
  await loadCollege(); learnerPage();
}
async function leaversCsv() {
  let rows;
  try { rows = (await rpc("nisia_leavers", { p_org: S.org })) || []; } catch (e) { toast(e.message); return; }
  const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const csv = "﻿" + [["Learner", "Course", "Left or finished", "On", "Reason", "Started", "Planned end", "Employer", "Marked by"].map(q).join(",")]
    .concat(rows.map((r) => [r.name, r.course, r.status === "completed" ? "Finished" : "Left", r.ended_on, r.reason, r.start_date, r.end_date, r.employer_name, r.ended_by].map(q).join(","))).join("\r\n");
  hit("leavers.download"); download(csv, fileSafe("Leavers " + new Date().toISOString().slice(0, 10)) + ".csv");
}
/* ---------- Meeting guests ----------
   People at a meeting (investors, visitors) added as learners for the day, so they can try Evia on their own phones:
   check in to the meeting class in Symi, take a photo, do the quiz. Each gets their own code to connect Evia. 24 hours
   after the meeting starts they're deleted, with everything they made, and their Evia shows "This demo has ended".
   (nisia-admin: meeting_guests, meeting_codes, meeting_end; the 10-minute job ends them on time.) */
const whenText = (t) => new Date(t).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
async function meetingGuests() {
  hit("meeting.open");
  let list = [];
  try { list = await rpc("nisia_meeting_guests", { p_org: S.org }) || []; } catch (e) { toast(e.message); }
  const meetings = [...new Set(list.map((g) => g.class_id + "|" + g.meeting))];
  const pad = (n) => String(n).padStart(2, "0"), now = new Date(), today = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  const m = modal("Meeting guests",
    '<p class="hint" style="margin-top:0">For people at a meeting who want to try Evia on their own phone. Each guest gets their own code. They appear on a class for the meeting in Symi, so you can take the register with them. <b>24 hours after the meeting starts, they’re deleted</b> with everything they added, and their Evia shows “This demo has ended”.</p>' +
    (meetings.length ? meetings.map((k) => { const [cid, title] = k.split("|"), gs = list.filter((g) => g.class_id + "|" + g.meeting === k);
      return '<div class="card" style="padding:14px;margin:0 0 12px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><b>' + esc(title) + '</b><span class="small muted">Ends ' + esc(whenText(gs[0].expires_at)) + '</span></div>' +
        '<p class="small" style="margin:8px 0">' + gs.map((g) => esc(g.name) + (g.paired ? ' <span class="small muted">(Evia connected)</span>' : "")).join(", ") + '</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-codes="' + esc(cid) + '">Show their codes</button><button class="btn ghost" type="button" data-end="' + esc(cid) + '">End now</button></div></div>'; }).join("") : "") +
    '<form id="gF" class="form" style="display:flex;flex-direction:column;gap:12px">' +
      '<h3 style="margin:6px 0 0">Add guests for a meeting</h3>' +
      '<label class="field"><span>Meeting</span><input class="input" name="title" value="Investor meeting" maxlength="80"></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px"><label class="field"><span>Date</span><input class="input" type="date" name="date" value="' + today + '" required></label>' +
        '<label class="field"><span>Starts</span><input class="input" type="time" name="start" value="10:00" required></label><label class="field"><span>Ends</span><input class="input" type="time" name="end" value="12:00" required></label></div>' +
      '<label class="field"><span>Their names, one per line</span><textarea class="input" name="names" rows="5" placeholder="Sam Jones&#10;Priya Patel" required></textarea></label>' +
      '<p class="err" id="gErr"></p><button class="btn primary wide" type="submit">Add guests and make their codes</button></form>');
  m.querySelectorAll("[data-codes]").forEach((b) => b.onclick = () => busy(b, "Making codes…", async () => {
    try { const r = await call("nisia-admin", { action: "meeting_codes", organisation_id: S.org, class_id: b.dataset.codes }); guestCodes(list.find((g) => g.class_id === b.dataset.codes).meeting, r.guests); } catch (e) { toast(e.message); }
  }));
  m.querySelectorAll("[data-end]").forEach((b) => b.onclick = () => {
    if (!confirm("End this meeting’s guests now? Their accounts and everything they added are deleted, and their Evia shows “This demo has ended”.")) return;
    busy(b, "Ending…", async () => { try { const r = await call("nisia-admin", { action: "meeting_end", organisation_id: S.org, class_id: b.dataset.end }); toast(r.ended + (r.ended === 1 ? " guest" : " guests") + " removed"); S.data = null; closeModal(); render(); } catch (e) { toast(e.message); } });
  });
  m.querySelector("#gF").onsubmit = (e) => {
    e.preventDefault();
    const v = formData(e.target), names = String(v.names || "").split(/\n+/).map((x) => x.trim()).filter(Boolean), err = m.querySelector("#gErr");
    if (!names.length) return (err.textContent = "Type at least one name.");
    if (!v.end || v.end <= v.start) return (err.textContent = "The meeting must end after it starts.");
    const startsAt = new Date(v.date + "T" + v.start);
    busy(e.target.querySelector("[type=submit]"), "Adding guests…", async () => {
      try {
        const r = await call("nisia-admin", { action: "meeting_guests", organisation_id: S.org, title: v.title, date: v.date, start: v.start, end: v.end, starts_at: startsAt.toISOString(), hours: 24, names });
        hit("meeting.add"); S.data = null; guestCodes(r.meeting, r.guests, r.expires_at);
      } catch (x) { err.textContent = x.message; }
    });
  };
}
/* One card per guest: their name, a code to scan with the phone's camera (it opens Evia and connects it), and the
   code to type. Codes work once each, until the guests' time is up; "Show their codes" makes fresh ones. */
function guestCodes(meeting, guests, endsAt) {
  const ends = endsAt || (guests[0] && guests[0].expires_at);
  modal("Codes: " + meeting,
    '<p class="hint" style="margin-top:0">Each guest scans their own code with their phone’s camera, and Evia opens as them. ' + (ends ? 'Their demo ends ' + esc(whenText(ends)) + '.' : "") + ' Each code works once.</p>' +
    '<div class="guest-codes" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">' + guests.map((g) =>
      '<div class="card" style="padding:14px;text-align:center;break-inside:avoid"><b style="display:block;margin-bottom:8px">' + esc(g.name) + '</b><div style="width:150px;margin:0 auto">' + qrSvg(pairLink(g.code), 4) + '</div>' +
      '<p class="big-code" style="font-size:20px;margin:8px 0 0">' + esc(g.code.slice(0, 3) + "-" + g.code.slice(3)) + '</p></div>').join("") + '</div>' +
    '<div style="display:flex;gap:8px;margin-top:14px"><button class="btn" type="button" id="gPrint">Print</button></div>',
    (mm) => { mm.querySelector("#gPrint").onclick = () => window.print(); });
}
function staffPicker(chosen) {
  const people = (S.data.staff || []).filter((s) => s.active && (s.roles.includes("assessor") || s.roles.includes("tutor") || s.roles.includes("employer")));
  if (!people.length) return '<p class="small muted">Invite an assessor, tutor or employer on the Staff page first; you can assign them later.</p>';
  return '<div class="choice">' + people.map((s) => '<label><input type="checkbox" name="staff" value="' + s.member_id + '"' + (chosen.includes(s.member_id) ? " checked" : "") + '> ' + esc(s.name || s.email) + ' <span class="small muted">' + esc(s.roles.filter((r) => r !== "admin").join(", ")) + '</span></label>').join("") + '</div>';
}
/* Each course's minimum off-the-job hours (set in Standards). A new learner starts from it, and the form says when a
   learner's planned hours are below it (allowed, for prior learning, but never below 187). */
async function courseMinimums() {
  if (!S.otjMins) { try { S.otjMins = (await rpc("nisia_course_minimums")) || {}; } catch (_) { S.otjMins = {}; } }
  return S.otjMins;
}
function otjMinimum(f, fresh) {
  const inp = f.planned_otj_hours, hint = f.querySelector(".otj-hint");
  if (!inp || !hint) return;
  let mins = {}, last = null;
  const show = () => {
    const min = Number(mins[f.course.value]) || null, v = inp.value.trim() === "" ? null : Number(inp.value);
    if (fresh && min && (v == null || v === last)) { inp.value = min; last = min; }
    const now = inp.value.trim() === "" ? null : Number(inp.value);
    hint.className = "otj-hint " + (min && now != null && now < min ? "warn" : "muted");
    hint.textContent = !min ? "" : now != null && now < 187 ? "Below 187 hours: no apprenticeship can plan less." :
      now != null && now < min ? "Below this course’s minimum of " + min + " hours. Only if prior learning shortens it." : "This course’s minimum is " + min + " hours.";
  };
  f.course.addEventListener("change", show); inp.addEventListener("input", show);
  courseMinimums().then((m) => { mins = m; show(); });
}
function addLearner() {
  const m = modal("Add a learner",
    '<form class="form-grid" id="f" novalidate>' +
    '<label class="field full">Full name<input name="name" autocomplete="off" required></label>' +
    '<label class="field full">Course<select name="course">' + COURSES.map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join("") + '</select></label>' +
    '<label class="field">Start date<input name="start_date" type="date" required></label>' +
    '<label class="field">Planned end date<input name="end_date" type="date" required></label>' +
    '<label class="field">Planned off-the-job hours<input name="planned_otj_hours" type="number" min="0" placeholder="e.g. 416"><small class="otj-hint muted"></small></label>' +
    '<label class="field">Learner’s email <small>(optional)</small><input name="email" type="email" autocomplete="off"></label>' +
    '<label class="field">Employer<input name="employer_name" autocomplete="off"></label>' +
    '<label class="field">Employer contact<input name="employer_contact_name" autocomplete="off"></label>' +
    '<label class="field full">Employer contact’s email<input name="employer_contact_email" type="email" autocomplete="off"></label>' +
    '<div class="field full"><span>Assessor, tutor and employer</span>' + staffPicker([]) + '</div>' +
    '<label class="field full">Class <small>(their register in Symi, and their college days in Evia)</small><select name="class_id"><option value="">Not yet</option>' +
      (S.classes || []).map((c) => '<option value="' + esc(c.id) + '">' + esc(c.title + " · " + classWhen(c)) + '</option>').join("") + '</select></label>' +
    '<p class="err full"></p><button class="btn primary wide full" type="submit">Add learner (uses 1 seat)</button></form>');
  if (!S.classes) loadClasses().then(() => { const sel = m.querySelector("[name=class_id]"); if (sel) sel.insertAdjacentHTML("beforeend", (S.classes || []).map((c) => '<option value="' + esc(c.id) + '">' + esc(c.title + " · " + classWhen(c)) + '</option>').join("")); }).catch(() => {});
  const f = m.querySelector("#f");
  otjMinimum(f, true);
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Adding…", async () => {
    try {
      const d = formData(f), cls = d.class_id; delete d.staff; delete d.class_id;
      const r = await call("nisia-admin", { action: "add_learner", organisation_id: S.org, ...d, staff_member_ids: [...f.querySelectorAll("[name=staff]:checked")].map((x) => x.value) });
      if (cls) { try { await rpc("nisia_add_to_class", { p_class: cls, p_learner: r.learner_id }); S.classes = null; } catch (x) { toast("Added, but not to the class: " + x.message); } }
      closeModal(); toast(d.name + " added" + (cls ? " and put on their class" : "")); S.data = null; await render();
      pairing({ learner_id: r.learner_id, name: d.name });
    } catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}
/* One piece of evidence, as the learner saved it in Evia: what they wrote, the KSBs, and the photos or files. */
/* The learner's portfolio, unit by unit in the course's order as in Evia and Milos: what's been added, and what the
   assessor has accepted. Each piece opens with its photos and the assessor's decision. */
const norm = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function portfolioPanel(l, evidence, first, snap) {
  const C = coursePack(l.course_code, l.enrolment_id) || { units: [] };
  const groups = C.units.map(([name, ksbs], i) => ({ no: i + 1, name, ksbs, items: [] })), other = { name: "Other units", ksbs: [], items: [] }, sup = { name: "Supporting evidence", ksbs: [], items: [] };
  evidence.forEach((e) => {
    if (e.collection === "supporting") return sup.items.push(e);
    /* By its topic's id, then its name, then the topic its KSBs fit best (so a college's own topics keep everything). */
    const t = topicFor(C, { title: e.title, source_metadata: { unit: e.unit, unitId: e.unit_id || e.unitId, ksbs: e.ksbs || [] } }), g = t >= 0 ? groups[t] : null; (g || other).items.push(e);
  });
  const all = groups.concat(other.items.length ? [other] : [], sup.items.length ? [sup] : []);
  const waiting = evidence.filter((e) => !e.assessment).length;
  return '<section class="panel"><div class="panel-head"><h2>Portfolio</h2><span class="small muted">' + evidence.length + ' from Evia' + (waiting ? ' · ' + waiting + ' waiting for the assessor' : "") + '</span></div>' +
    (evidence.length ? '<div class="pf-list">' + all.map((g) => {
      const met = new Set(); g.items.forEach((e) => { if (e.assessment && e.assessment.decision === "accepted") (e.assessment.ksbs || []).forEach((k) => met.add(k)); });
      return '<div class="pf-unit' + (g.items.length ? "" : " pf-none") + '"><div class="pf-row"><span class="pf-no">' + (g.no || "") + '</span><b>' + esc(g.name) + '</b><span class="small muted">' +
        (g.items.length ? g.items.length + (g.items.length === 1 ? " piece" : " pieces") : "No evidence yet") + '</span>' + (g.no ? strengthBars(unitStrength(snap, g.name, g.items.map((e) => ({ photos: e.files || e.photos_expected || 0, text: e.text })))) : "") + (g.ksbs.length ? '<span class="small num pf-met">' + g.ksbs.filter((k) => met.has(k)).length + '/' + g.ksbs.length + ' KSBs signed off</span>' : "") + '</div>' +
        g.items.map((e) => '<div class="pf-ev" role="button" tabindex="0" data-ev="' + e.id + '"><span>' + esc(g.no ? ukDate(e.at) : e.title) + '<span class="small muted"> · ' + esc(EV_TYPE[e.type] || e.type) + (e.files ? " · " + e.files + (e.files === 1 ? " file" : " files") : "") + '</span></span>' + assessedPill(e.assessment) + '</div>').join("") + '</div>';
    }).join("") + '</div>' : '<p class="muted small">Nothing yet. Evidence appears here as soon as ' + esc(first) + ' saves it in Evia.</p>') + '</section>';
}
/* Move a learner onto another pack built on the same standard (their evidence and sign-offs are kept by KSB). */
function choosePack(l) {
  const first = (l.name || "").split(" ")[0], list = packsLike(l.course_code, l.enrolment_id);
  const m = modal("Pack for " + l.name, '<p class="muted small" style="margin-top:-4px">The topics ' + esc(first) + ' is taught and evidenced in. Changing it never loses evidence or sign-offs: they’re kept by KSB and shown under the new topics.</p>' +
    '<form id="pkF" style="display:grid;gap:8px">' + list.map((p) => '<label class="check" style="border-radius:12px"><input type="radio" name="p" value="' + esc(p.id) + '"' + (p.current ? " checked" : "") + '> <span><b>' + esc(p.title) + '</b> <span class="small muted">' +
      (p.college ? "The college’s own" : "Yours (Evia)") + ' · ' + p.topics + ' topics</span></span></label>').join("") +
    '<p class="err" hidden></p><div class="row-actions"><button class="btn primary" type="submit">Save</button></div></form>');
  m.querySelector("#pkF").onsubmit = (e) => { e.preventDefault(); const v = new FormData(e.target).get("p"), err = m.querySelector(".err");
    busy(e.target.querySelector("[type=submit]"), "Saving…", async () => {
      try { await rpc("set_enrolment_pack", { p_enrolment: l.enrolment_id, p_pack: v }); await loadPacks(rpc); hit("learner.pack"); closeModal(); toast(first + "’s pack is changed. Evia follows on its next sync."); learnerPage(); }
      catch (x) { err.textContent = x.message; err.hidden = false; }
    }); };
}
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
    (e.text ? '<div class="quote"><span class="label">' + (e.collection === "observation" ? "What the assessor observed" : "What they wrote") + '</span><p style="white-space:pre-wrap;margin:6px 0 0">' + esc(e.text) + '</p></div>' : "") +
    '<div class="media" id="media"><p class="small muted">Loading files…</p></div>' +
    (e.assessment ? '<div class="quote"><span class="label">Assessment</span><p style="margin:6px 0 0">' + assessedPill(e.assessment) + ' ' + esc(ukDate(e.assessment.at)) + (e.assessment.by ? " by " + esc(e.assessment.by) : "") + '</p>' +
      (e.assessment.feedback ? '<p style="margin:6px 0 0">' + esc(e.assessment.feedback) + '</p>' : "") + ((e.assessment.ksbs || []).length ? '<p class="small" style="margin:6px 0 0"><b>KSBs signed off:</b> ' + esc(e.assessment.ksbs.join(", ")) + '</p>' : "") + '</div>' : '<p class="small muted">Not assessed yet. The assessor signs it off in Milos.</p>'));
  m.classList.add("wide-modal");
  const box = m.querySelector("#media");
  try {
    const { data: files, error } = await db.from("evidence_files").select("storage_path, mime_type").eq("evidence_id", e.id).order("created_at");
    if (error) throw error;
    const blocked = !files.length && (Array.isArray(e.files) ? e.files.length : +e.files || 0) > 0;
    if (blocked) { box.innerHTML = '<p class="err">' + (who && who.platform_admin && !(who.memberships || []).some((x) => x.organisation_id === S.org) ? "Only the college’s own staff can open learners’ files. Sign in with your college account to see them." : "This piece has files, but your account can’t open them. Check you’re signed in as active college staff.") + '</p>'; return; }
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
async function learnerPage() {
  const l = S.data.learners.find((x) => x.learner_id === S.learner);
  if (!l) return go("learners");
  shell('<p class="loading">Loading ' + esc(l.name) + '…</p>');
  let d;
  try { d = await rpc("nisia_learner_detail", { p_learner: l.learner_id }); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  const snap = d.snapshot || null, first = (l.name || "").split(" ")[0];
  const ksbPct = l.ksb_pct ?? (snap && snap.ksb ? snap.ksb.pct : null);
  const targets = (d.targets || []).map((t) => ({ t: t.title, s: t.status === "completed" ? "done" : t.due && Date.parse(t.due) < Date.now() ? "late" : "open", due: t.due, from: "Review" }))
    .concat((d.evia_targets || []).map((t) => ({ t: t.title, s: t.metAt ? "done" : t.due && Date.parse(t.due) < Date.now() ? "late" : "open", due: t.due, from: "Evia" })));
  const feed = (d.evidence || []).map((e) => ({ ev: e.id, ic: "photo", t: "Added " + (e.type === "written" ? "a write-up" : e.type === "document" ? "a document" : e.type === "video" ? "a video" : e.type === "audio" ? "a recording" : "photos") + " to " + e.title, at: e.at }))
    .concat((d.hours || []).map((h) => ({ ic: "clock", t: "Logged " + Number(h.hours) + " h: " + h.title, at: h.at }))).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);
  const planned = l.planned_otj_hours != null ? Number(l.planned_otj_hours) : null, otj = Math.round(Number(l.otj_hours || 0));
  shell(
    '<button class="btn ghost back" type="button" data-go="learners">' + ICON.back + 'All learners</button>' +
    '<div class="lhead">' + avatar(l.name) + '<div style="flex:1;min-width:220px"><h1>' + esc(l.name) + '</h1>' +
      '<div class="lmeta"><span class="tag">' + esc(courseName(l.course_code)) + '</span>' + ((coursePack(l.course_code, l.enrolment_id) || {}).pack ? '<span class="tag" title="The topics ' + esc(first) + ' is taught and evidenced in">Pack: ' + esc(coursePack(l.course_code, l.enrolment_id).pack.title) + '</span>' : "") + (l.employer_name ? '<span class="tag">' + esc(l.employer_name) + '</span>' : "") + (l.assessors || []).map((a) => '<span class="tag">' + ((a.roles || []).includes("employer") && !(a.roles || []).some((x) => x === "assessor" || x === "tutor") ? "Employer: " : (a.roles || []).includes("tutor") && !(a.roles || []).includes("assessor") ? "Tutor: " : "Assessor: ") + esc(a.name) + '</span>').join("") + (ENDED(l) ? endedPill(l) : pillFor(l.paired ? l.state : "none")) + '</div>' +
      '<div style="margin-top:8px"><span class="sync ' + (!l.paired || l.quiet == null || l.quiet > 3 ? "stale" : "") + '">' + (l.paired ? "Last update from Evia: " + lastActive(d.snapshot_at || l.last_activity) : "Evia not connected yet") + '</span></div></div>' +
      '<div class="row-actions"><button class="btn primary" type="button" id="pair">' + ICON.evia + (l.paired ? "Connect Evia on a new phone" : "Connect Evia") + '</button>' + (S.data.admin && packsLike(l.course_code, l.enrolment_id).length > 1 ? '<button class="btn" type="button" id="packL">Pack</button>' : "") + (S.data.admin ? '<button class="btn" type="button" id="editL">Edit details</button>' : "") + (S.data.admin ? (ENDED(l) ? '<button class="btn" type="button" id="undoEnd">Undo: back on the course</button>' : '<button class="btn" type="button" id="endL">Left or finished</button>') : "") + '</div></div>' +
    (ENDED(l) ? '<div class="panel" style="display:flex;gap:10px;align-items:center">' + endedPill(l) + '<span>' + esc(first) + (l.status === "completed" ? " finished the course" : " left the course") + (l.ended_on ? " on " + esc(ukDate(l.ended_on)) : "") + '. Their seat is free and they’re off the registers and lists. Everything they did is kept.</span></div>' : "") +
    (l.reasons.length ? '<div class="panel" style="border-color:' + stripeFor(l.state) + ';display:flex;gap:10px;flex-direction:column"><span class="label">Why this learner is flagged</span>' + l.reasons.map((r) => '<span>• ' + esc(r) + '</span>').join("") + '</div>' : "") +
    '<section class="stats" aria-label="Learner summary">' +
      '<div class="stat"><span class="label">Through the course</span><span class="big num">' + (l.through ?? "–") + '%</span><span class="sub">' + esc(ukDate(l.start_date)) + ' to ' + esc(ukDate(l.end_date)) + '</span></div>' +
      '<div class="stat"><span class="label">KSB coverage</span><span class="big num">' + (ksbPct ?? "–") + (ksbPct != null ? "%" : "") + '</span><span class="sub">' + (snap ? snap.ksb.met + " of " + snap.ksb.total + " have evidence" : "Waiting for Evia") + '</span></div>' +
      '<div class="stat"><span class="label">Learning hours</span><span class="big num">' + otj + (planned ? '<small> / ' + planned + ' h</small>' : " h") + '</span><span class="sub">off-the-job' + (planned ? " target" : "") + '</span></div>' +
      '<div class="stat"><span class="label">Evidence items</span><span class="big num">' + (l.evidence || 0) + '</span><span class="sub">' + (l.evidence_4w || 0) + ' in the last 4 weeks</span></div>' +
      '<div class="stat"><span class="label">Last active</span><span class="big num" style="' + (l.quiet != null && l.quiet > 14 ? "color:var(--bad)" : "") + '">' + (l.quiet == null ? "–" : l.quiet <= 0 ? "Today" : l.quiet + "d") + '</span><span class="sub">' + (l.reviewIn == null ? "" : l.reviewIn < 0 ? "Review overdue" : "Review due in " + l.reviewIn + " days") + '</span></div>' +
    '</section>' +
    portfolioPanel(l, d.evidence || [], first, d.snapshot) +
    '<div class="grid cols-2">' +
      '<section class="panel"><div class="panel-head"><h2>Targets</h2><span class="small muted">Set in Evia and at reviews</span></div>' +
        (targets.length ? targets.map((g) => '<div class="target"><span class="tick ' + (g.s === "done" ? "done" : g.s === "late" ? "late" : "") + '"></span><span>' + esc(g.t) + '<br><span class="small muted">' + g.from + '</span></span><span class="small ' + (g.s === "late" ? "" : "muted") + '" style="' + (g.s === "late" ? "color:var(--bad);font-weight:600" : "") + '">' + (g.s === "done" ? "Done" : g.s === "late" ? "Overdue" : g.due ? "Due " + esc(ukDate(g.due)) : "") + '</span></div>').join("") : '<p class="muted small">No targets yet.</p>') + '</section>' +
      '<section class="panel"><div class="panel-head"><h2>Reviews</h2><span class="small muted">Done in Milos</span></div>' +
        '<div class="target"><span class="tick' + (l.reviewIn != null && l.reviewIn < 0 ? " late" : "") + '"></span><span><b>Next progress review</b><br><span class="small muted">' + (l.reviewIn == null ? "" : l.reviewIn < 0 ? "Overdue by " + -l.reviewIn + " days" : "Due in " + l.reviewIn + " days") + ' · filled in from Evia in Milos</span></span><span class="pill ' + (l.reviewIn != null && l.reviewIn < 0 ? "bad" : "warn") + '">' + (l.reviewIn != null && l.reviewIn < 0 ? "Overdue" : "Upcoming") + '</span></div>' +
        (d.reviews || []).map((r, i, a) => '<div class="target tap" role="button" tabindex="0" data-review="' + r.id + '"><span class="tick done"></span><span>Progress review ' + (a.length - i) + '<br><span class="small muted">Signed by all three, ' + esc(ukDate(r.at)) + '</span></span><span class="pill good">' + esc(r.overall || "Signed") + '</span></div>').join("") + '</section>' +
    '</div>' +
    '<section class="panel"><div class="panel-head"><h2>Recent activity in Evia</h2></div><div class="feed">' + (feed.length ? feed.map((f) => (f.ev ? '<button type="button" class="feed-item tap" data-ev="' + f.ev + '">' : '<div class="feed-item">') + '<span class="ficon">' + ICON[f.ic] + '</span><span>' + esc(f.t) + '</span><span class="small muted" style="white-space:nowrap">' + esc(lastActive(f.at)) + '</span>' + (f.ev ? '</button>' : '</div>')).join("") : '<p class="muted small">Nothing yet.</p>') + '</div></section>' +
    '');
  root.querySelector("[data-go=learners].back").onclick = () => go("learners");
  root.querySelectorAll("[data-review]").forEach((r) => { const open = () => showReview(r.dataset.review); r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
  root.querySelectorAll("#main [data-ev]").forEach((r) => { const open = () => showEvidence(d.evidence.find((x) => x.id === r.dataset.ev)); r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
  root.querySelector("#pair").onclick = () => pairing(l);
  const en = root.querySelector("#endL"); if (en) en.onclick = () => endSheet(l);
  const un = root.querySelector("#undoEnd"); if (un) un.onclick = () => undoEnd(l);
  const ed = root.querySelector("#editL"); if (ed) ed.onclick = () => editLearner(l);
  const pk = root.querySelector("#packL"); if (pk) pk.onclick = () => choosePack(l);
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
      '<td><button class="btn ghost" data-edit="' + s.member_id + '">Edit</button></td></tr>').join("")
      : '<tr class="static"><td colspan="5" class="empty">No staff yet. Invite your assessors and tutors.</td></tr>') + '</tbody></table></div>');
  root.querySelector("#inv").onclick = () => inviteForm(S.org, "invite_staff");
  root.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => editStaff(D.staff.find((x) => x.member_id === b.dataset.edit)));
}
const ROLE_NAMES = [["assessor", "Assessor"], ["tutor", "Tutor"], ["admin", "College admin"], ["quality", "Quality (view only)"], ["employer", "Employer"]];
function editStaff(s) {
  const m = modal("Edit " + (s.name || s.email),
    '<form id="f" novalidate style="display:flex;flex-direction:column;gap:14px">' +
    '<label class="field">Name<input name="name" value="' + esc(s.name || "") + '" autocomplete="off"></label>' +
    '<div class="field"><span>Email</span><p class="small muted" style="margin:0">' + esc(s.email) + ' (their sign-in; to change it, invite them again with the new email)</p></div>' +
    '<div class="field"><span>Roles</span><div class="choice">' + ROLE_NAMES.map(([v, t]) => '<label><input type="checkbox" name="roles" value="' + v + '"' + (s.roles.includes(v) ? " checked" : "") + '> ' + t + '</label>').join("") + '</div></div>' +
    '<label class="choice-row"><input type="checkbox" name="active"' + (s.active ? " checked" : "") + '> Can sign in (untick to switch them off; their records stay)</label>' +
    '<p class="err"></p><button class="btn primary wide" type="submit">Save</button>' +
    '<div class="field" id="resetBox"><span>Forgotten their password?</span><button class="btn" type="button" id="resetPw">Make a reset link</button>' +
    '<small class="muted">A link to choose a new password, for you to send them (text, email or Teams). It works once, within 24 hours. They still use their authenticator app to sign in.</small></div></form>');
  const f = m.querySelector("#f");
  m.querySelector("#resetPw").onclick = (e) => busy(e.currentTarget, "Making it…", async () => {
    try {
      const r = await rpc("nisia_password_reset_link", { p_member: s.member_id });
      const link = location.origin + location.pathname + "#reset=" + r.code;
      m.querySelector("#resetBox").innerHTML = '<span>Reset link for ' + esc(r.email) + '</span><input class="input" readonly value="' + esc(link) + '" id="resetLink">' +
        '<button class="btn primary" type="button" id="copyReset">Copy the link</button><small class="muted">Send it to them. It works once, until ' + esc(new Date(r.expires_at).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })) + '.</small>';
      hit("staff.reset");
      m.querySelector("#copyReset").onclick = async () => { try { await navigator.clipboard.writeText(link); toast("Copied"); } catch (_) { m.querySelector("#resetLink").select(); } };
    } catch (x) { f.querySelector(".err").textContent = x.message; }
  });
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Saving…", async () => {
    try {
      await call("nisia-admin", { action: "update_staff", member_id: s.member_id, name: f.name.value, roles: [...f.querySelectorAll("[name=roles]:checked")].map((x) => x.value), active: f.active.checked });
      closeModal(); toast("Saved"); S.data = null; S.page = "staff"; render();
    } catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}
async function editLearner(l) {
  const m = modal("Edit " + l.name, '<p class="muted">Loading…</p>');
  let en = {};
  try { const { data, error } = await db.from("enrolments").select("employer_contact_name, employer_contact_email").eq("id", l.enrolment_id).single(); if (error) throw error; en = data || {}; } catch (_) { /* the form still works */ }
  m.innerHTML = '<div class="modal-head"><h2>Edit ' + esc(l.name) + '</h2><button class="x" aria-label="Close">×</button></div>' +
    '<form class="form-grid" id="f" novalidate>' +
    '<label class="field full">Full name<input name="name" value="' + esc(l.name) + '" autocomplete="off"></label>' +
    '<label class="field full">Course<select name="course">' + COURSES.map((c) => '<option value="' + c.id + '"' + (c.id === l.course_code ? " selected" : "") + '>' + esc(c.name) + '</option>').join("") + '</select></label>' +
    '<label class="field">Start date<input name="start_date" type="date" value="' + esc(l.start_date || "") + '"></label>' +
    '<label class="field">Planned end date<input name="end_date" type="date" value="' + esc(l.end_date || "") + '"></label>' +
    '<label class="field">Planned off-the-job hours<input name="planned_otj_hours" type="number" min="0" value="' + esc(l.planned_otj_hours ?? "") + '"><small class="otj-hint muted"></small></label>' +
    '<label class="field">Employer<input name="employer_name" value="' + esc(l.employer_name || "") + '" autocomplete="off"></label>' +
    '<label class="field">Employer contact<input name="employer_contact_name" value="' + esc(en.employer_contact_name || "") + '" autocomplete="off"></label>' +
    '<label class="field">Employer contact’s email<input name="employer_contact_email" type="email" value="' + esc(en.employer_contact_email || "") + '" autocomplete="off"></label>' +
    '<div class="field full"><span>Assessor, tutor and employer</span>' + staffPicker((l.assessors || []).map((x) => x.member_id)) + '</div>' +
    '<p class="small muted full">Evia picks up the new course and dates the next time the learner connects it.</p>' +
    '<p class="err full"></p><button class="btn primary wide full" type="submit">Save</button></form>';
  m.querySelector(".x").onclick = closeModal;
  const f = m.querySelector("#f");
  otjMinimum(f, false);
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Saving…", async () => {
    try {
      const d = formData(f); delete d.staff;
      await call("nisia-admin", { action: "update_learner", learner_id: l.learner_id, ...d });
      if (f.querySelector("[name=staff]")) await call("nisia-admin", { action: "assign_staff", learner_id: l.learner_id, member_ids: [...f.querySelectorAll("[name=staff]:checked")].map((x) => x.value) });
      closeModal(); toast("Saved"); S.data = null; S.page = "learner"; render();
    }
    catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}
function inviteForm(org, action, collegeName) {
  const admin = action === "invite_college_admin";
  const m = modal(admin ? "Invite a college admin" + (collegeName ? " to " + collegeName : "") : "Invite staff",
    '<form id="f" novalidate style="display:flex;flex-direction:column;gap:14px">' +
    '<label class="field">Name<input name="name" autocomplete="off"></label><label class="field">Email<input name="email" type="email" autocomplete="off"></label>' +
    (admin ? "" : '<div class="field"><span>Roles</span><div class="choice">' + [["assessor", "Assessor"], ["tutor", "Tutor"], ["employer", "Employer (Paros)"], ["admin", "College admin"], ["quality", "Quality (view only)"]].map(([v, t], i) => '<label><input type="checkbox" name="roles" value="' + v + '"' + (i === 0 ? " checked" : "") + '> ' + t + '</label>').join("") + '</div></div>') +
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
    '<div class="topbar"><div><div class="label">' + esc(s.name) + '</div><h1>College</h1></div></div>' +
    safeguardingPanel(s, D.admin) +
    '<div class="grid cols-2e">' +
      '<section class="panel"><div class="panel-head"><h2>Licence</h2>' + (s.status === "active" ? '<span class="pill good">Active</span>' : '<span class="pill bad">Suspended</span>') + '</div>' +
        '<div style="display:flex;align-items:baseline;gap:8px"><span class="num" style="font-family:var(--display);font-size:34px;font-weight:700">' + s.seats_used + '</span><span class="muted">of ' + s.seats + ' seats in use</span></div>' +
        '<div class="seatbar"><span style="width:' + (s.seats ? Math.min(100, s.seats_used / s.seats * 100) : 0) + '%"></span></div>' +
        '<p class="small muted">' + (s.licence_ends ? "Licence runs until " + esc(ukDate(s.licence_ends)) + ". " : "") + 'Each learner uses a seat until they complete or withdraw. For more seats, contact Evia.</p></section>' +
      '<section class="panel"><div class="panel-head"><h2>Courses</h2></div>' +
        COURSES.map((c) => '<div class="course"><div><b>' + esc(c.name) + '</b><br><span class="small muted">Units and KSBs, Teach me lessons, EPA guide and tests</span></div><span class="pill good">Included</span></div>').join("") + '</section>' +
    '</div>');
  wireSafeguarding();
}

/* The college's designated safeguarding lead: shown to every learner in Evia (profile, and wherever Evia points
   them for help), updated on their next sync. */
function safeguardingPanel(s, canEdit) {
  const g = s.safeguarding || {};
  return '<section class="panel"><div class="panel-head"><h2>Safeguarding lead</h2><span class="small muted">Shown to every learner in Evia</span></div>' +
    (canEdit ? '<form class="form-grid" id="dsl">' +
      '<label class="field">Name<input name="name" value="' + esc(g.name || "") + '" placeholder="e.g. Jo Smith" autocomplete="off"></label>' +
      '<label class="field">Phone<input name="phone" type="tel" value="' + esc(g.phone || "") + '" placeholder="e.g. 01234 567890"></label>' +
      '<label class="field full">Email<input name="email" type="email" value="' + esc(g.email || "") + '" placeholder="e.g. safeguarding@college.ac.uk"></label>' +
      '<p class="err full"></p><p class="small muted full" style="margin:0">Learners’ Evia updates the next time it connects.</p><button class="btn primary full" type="submit">Save</button></form>'
      : (g.name || g.phone || g.email ? '<p><b>' + esc(g.name || "") + '</b><br><span class="small">' + esc([g.phone, g.email].filter(Boolean).join(" · ")) + '</span></p>' : '<p class="muted small">Not set yet. A college admin adds it here.</p>')) +
    '</section>';
}
function wireSafeguarding() {
  const f = root.querySelector("#dsl"); if (!f) return;
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Saving…", async () => {
    const d = formData(f);
    if (!d.name.trim() || !(d.phone.trim() || d.email.trim())) { f.querySelector(".err").textContent = "Add a name, and a phone number or email."; return; }
    try { await rpc("nisia_set_safeguarding", { p_org: S.org, p_name: d.name, p_phone: d.phone, p_email: d.email });
      S.data.summary.safeguarding = { name: d.name.trim(), phone: d.phone.trim(), email: d.email.trim() }; f.querySelector(".err").textContent = ""; toast("Saved. Evia will update for every learner."); }
    catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}

/* ---------- Master admin: usage ----------
   Which features are used in each app, from the apps' daily counts (no names, no identifiers; the test college is
   left out). "Device-days" is one phone or computer using the app on one day: the fairest measure of how many people
   use a feature. The list under each app shows what nobody used in the period: the candidates to improve or retire. */
const APP_NAMES = { evia: "Evia", milos: "Milos", portal: "Portal", symi: "Symi", paros: "Paros" };
const KNOWN = {
  evia: ["evidence.guide", "evidence.free", "evidence.record", "evidence.catch-up", "evidence.check", "evidence.send-to-portfolio", "chat.open", "chat.question",
    "chat.log-hours", "chat.confidence", "chat.upskill", "chat.evidence", "chat.quick-review", "chat.review-prep", "chat.targets", "chat.epa", "teach.lesson",
    "teach.confidence", "epa.open", "epa.exam", "epa.discussion", "skills.open", "confidence.open", "hours.logs", "hours.pdf", "review.open", "review.reminder",
    "review.pdf", "college.check-in", "college.connect", "games.leaderboard", "rewards.item", "look.shape", "look.colour", "settings.accessibility",
    "data.backup", "data.restore", "profile.open"],
  milos: ["tab.today", "tab.learners", "tab.assess", "tab.reviews", "learner.overview", "learner.portfolio", "learner.reviews", "sync.manual", "save.assessment.accepted", "save.review"],
  portal: ["page.overview", "page.learners", "page.learner", "page.reviews", "page.staff", "page.licence", "page.impact", "page.colleges", "page.usage", "impact.pdf"],
  symi: ["check-in.code", "register.sent", "learners.pull"],
  paros: ["tab.today", "tab.apprentices", "tab.hours", "tab.feedback", "apprentice"],
};
const WORDS = { "evidence.guide": "Guided evidence", "evidence.free": "Free-range evidence", "evidence.record": "Record a video", "evidence.catch-up": "Catch-up evidence",
  "evidence.check": "Evidence check", "evidence.send-to-portfolio": "Send to portfolio", "chat.open": "Opened Evia chat", "chat.question": "Asked Evia a question",
  "chat.log-hours": "Chat: log hours", "chat.quick-review": "Chat: quick review", "chat.review-prep": "Chat: review prep", "teach.lesson": "Teach me lesson",
  "teach.confidence": "Teach me confidence check", "epa.exam": "EPA mock exam", "epa.discussion": "EPA discussion practice", "hours.logs": "Learning hours log",
  "hours.pdf": "Learning hours PDF", "review.open": "Progress review", "review.reminder": "Review reminder", "college.check-in": "Class check-in",
  "college.connect": "Connect to college", "saved.evidence": "Evidence saved", "saved.hours": "Learning hours entries", "saved.lessons-done": "Lessons finished",
  "saved.tests": "Tests taken", "chat.confidence": "Chat: confidence", "chat.upskill": "Chat: upskill", "chat.evidence": "Chat: evidence",
  "chat.targets": "Chat: targets", "chat.epa": "Chat: EPA", "epa.open": "EPA guide", "skills.open": "Skills practice", "confidence.open": "Confidence check",
  "review.pdf": "Review PDF", "games.leaderboard": "Leaderboard", "rewards.item": "Rewards", "look.shape": "Evia's shape", "look.colour": "Colours",
  "settings.accessibility": "Accessibility settings", "data.backup": "Backup", "data.restore": "Restore a backup", "profile.open": "Profile", "impact.pdf": "Impact report PDF",
  "apprentice": "Opened an apprentice", "save.review": "Review saved", "save.assessment.accepted": "Work signed off", "sync.manual": "Pressed sync", "check-in.code": "Showed check-in code", "register.sent": "Register sent", "learners.pull": "Updated learner list" };
const word = (k) => WORDS[k] || cap(k.replace(/^(tab|page|screen|learner)\./, (m, a) => ({ tab: "Tab: ", page: "Page: ", screen: "Screen: ", learner: "Learner: " }[a])).replace(/^saved\./, "Saved: ").replace(/[._-]/g, " ").replace(/:\s*/, ": "));
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function trend(rows, color) {
  const W = 460, H = 150, pl = 30, pb = 24, pt = 10, pr = 8, max = Math.max(4, ...rows.map((r) => r.n)), n = Math.max(rows.length, 2);
  const x = (i) => pl + (W - pl - pr) * i / (n - 1), y = (v) => pt + (H - pt - pb) * (1 - v / max);
  const pts = rows.map((r, i) => x(i) + "," + y(r.n)).join(" ");
  return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Device-days per week">' +
    [0, max / 2, max].map((v) => '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v) + '</text>').join("") +
    (rows.length ? '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round"/>' + rows.map((r, i) => '<circle cx="' + x(i) + '" cy="' + y(r.n) + '" r="3.5" fill="' + color + '"><title>' + r.n + '</title></circle>' + (i % 3 === 0 || i === rows.length - 1 ? '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(new Date(r.week).toLocaleDateString("en-GB", { day: "numeric", month: "short" })) + '</text>' : "")).join("") : "") +
    '</svg></div>';
}
async function usagePage() {
  shell('<p class="loading">Loading usage…</p>');
  S.days = S.days || 30; S.uapp = S.uapp || "evia";
  let u;
  try { u = await rpc("nisia_admin_usage", { p_days: S.days }); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  const apps = Object.keys(APP_NAMES), byApp = Object.fromEntries((u.apps || []).map((a) => [a.app, a])), A = S.uapp, dd = (byApp[A] || {}).device_days || 0;
  const feats = (u.features || []).filter((f) => f.app === A).sort((a, b) => b.device_days - a.device_days || b.uses - a.uses);
  const used = new Set(feats.map((f) => f.feature)), unused = (KNOWN[A] || []).filter((k) => !used.has(k));
  const weeks = (u.weeks || []).filter((w) => w.app === A).map((w) => ({ week: w.week, n: w.device_days }));
  const plats = (u.platforms || []).filter((p) => p.app === A);
  const platTotals = {}; plats.forEach((p) => platTotals[p.platform] = (platTotals[p.platform] || 0) + p.device_days);
  const versions = {}; plats.forEach((p) => versions[p.version] = (versions[p.version] || 0) + p.device_days);
  const share = (n) => dd ? Math.round(n / dd * 100) : 0;
  const bars = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => '<div class="pbar-row"><span class="small" style="min-width:110px">' + esc(k) + '</span><div class="pbar" style="flex:1"><div class="fill" style="width:' + share(n) + '%;background:var(--accent)"></div></div><span class="num">' + share(n) + '%</span></div>').join("") || '<p class="muted small">Nothing yet.</p>';
  shell(
    '<div class="topbar"><div><div class="label">Master admin</div><h1>Usage</h1></div><div class="actions"><div class="seg" role="group" aria-label="Period">' +
      [7, 30, 90, 365].map((d) => '<button type="button" data-days="' + d + '" aria-pressed="' + (S.days === d) + '">' + (d === 365 ? "12 months" : d + " days") + '</button>').join("") + '</div></div></div>' +
    '<section class="stats" aria-label="Apps">' + apps.map((a) => { const r = byApp[a] || { device_days: 0, connected: 0 };
      return '<button type="button" class="stat stat-btn" data-app="' + a + '" aria-pressed="' + (a === A) + '"><span class="label">' + APP_NAMES[a] + '</span><span class="big num">' + r.device_days + '</span><span class="sub">device-days' + (a === "evia" && r.device_days ? " · " + Math.round(r.connected / r.device_days * 100) + "% with a college" : "") + '</span></button>'; }).join("") + '</section>' +
    '<div class="grid cols-2">' +
      '<section class="panel"><div class="panel-head"><h2>' + APP_NAMES[A] + ': features used</h2><span class="small muted">Last ' + (S.days === 365 ? "12 months" : S.days + " days") + ' · real colleges only</span></div>' +
        (feats.length ? '<div class="table-wrap flat"><table><thead><tr><th>Feature</th><th>Reach</th><th>Uses</th></tr></thead><tbody>' + feats.map((f) =>
          '<tr class="static"><td>' + esc(word(f.feature)) + '<br><span class="small muted">' + esc(f.feature) + '</span></td><td style="min-width:160px"><div class="pbar-row"><div class="pbar" style="flex:1"><div class="fill" style="width:' + share(f.device_days) + '%;background:var(--accent)"></div></div><span class="num">' + share(f.device_days) + '%</span></div></td><td class="num">' + f.uses + '</td></tr>').join("") + '</tbody></table></div>'
          : '<p class="muted">No counts from ' + APP_NAMES[A] + ' yet. Apps send the day’s counts the next time they open, so allow a day or two.</p>') +
        '<p class="small muted" style="margin-top:8px">Reach: the share of ' + APP_NAMES[A] + '’s device-days that used the feature at least once.</p></section>' +
      '<div class="grid" style="align-content:start">' +
        '<section class="panel"><div class="panel-head"><h2>Not used</h2><span class="small muted">' + unused.length + ' of ' + (KNOWN[A] || []).length + '</span></div>' +
          (unused.length ? '<div class="chips">' + unused.map((k) => '<span class="chip">' + esc(word(k)) + '</span>').join("") + '</div><p class="small muted" style="margin-top:8px">Nobody used these in the period: improve them, make them easier to find, or retire them.</p>' : '<p class="muted small">Every feature was used.</p>') + '</section>' +
        '<section class="panel"><div class="panel-head"><h2>Weekly use</h2><span class="small muted">device-days, last 12 weeks</span></div>' + trend(weeks, "var(--accent)") + '</section>' +
        '<section class="panel"><div class="panel-head"><h2>Devices</h2></div>' + bars(platTotals) + '<h3 class="label" style="margin:14px 0 8px">Versions</h3>' + bars(versions) + '</section>' +
        (A === "evia" ? '<section class="panel"><div class="panel-head"><h2>Courses</h2></div>' + (u.courses || []).map((c) => '<div class="course"><span>' + esc(c.course === "?" || !c.course ? "No course chosen" : courseName(c.course)) + '</span><b class="num">' + c.device_days + '</b></div>').join("") + '</section>' : "") +
      '</div></div>' +
    '<p class="small muted" style="margin-top:14px">Counts only: no names, no work, no identifiers. Learners can switch it off in Evia’s profile. Copies running on this computer (localhost) never send.</p>');
  root.querySelectorAll("[data-days]").forEach((b) => b.onclick = () => { S.days = +b.dataset.days; usagePage(); });
  root.querySelectorAll("[data-app]").forEach((b) => b.onclick = () => { S.uapp = b.dataset.app; usagePage(); });
}

/* ---------- College: impact ----------
   How the college's apprentices, staff and employers are using Evia Portal and Evia, for a period set against the one
   before it: engagement, evidence, marking turnaround, learning hours against plan, reviews and attendance, and what
   learners did in Evia. For quality meetings, Ofsted and the employer-facing story; prints as a report. */
const PERIODS = [["30", "Last 30 days"], ["90", "Last 3 months"], ["year", "This academic year"], ["365", "Last 12 months"]];
const iso = (t) => { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
function periodDates(k) {
  const to = new Date(); to.setHours(0, 0, 0, 0); to.setDate(to.getDate() + 1);
  let from;
  if (k === "year") { from = new Date(to.getFullYear() - (to.getMonth() < 7 ? 1 : 0), 7, 1); }
  else { from = new Date(to); from.setDate(from.getDate() - Number(k)); }
  const len = to - from, prevFrom = new Date(from.getTime() - len);
  return { from: iso(from), to: iso(to), prevFrom: iso(prevFrom), prevTo: iso(from) };
}
async function impactPage() {
  const D = S.data, name = D.summary ? D.summary.name : mine(S.org).organisation, k = S.period || "90", P = periodDates(k);
  shell('<p class="loading">Working out the impact report…</p>');
  let now, before;
  try {
    [now, before] = await Promise.all([
      rpc("nisia_college_impact", { p_org: S.org, p_from: P.from, p_to: P.to }),
      rpc("nisia_college_impact", { p_org: S.org, p_from: P.prevFrom, p_to: P.prevTo })]);
  } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const months = (r) => Math.max(0.25, r.weeks / 4.345);
  const m = (r) => ({
    engaged: pct(r.engaged, r.learners),
    evidencePm: r.learners ? Math.round(r.evidence / r.learners / months(r) * 10) / 10 : null,
    turnaround: r.turnaround_days != null ? Number(r.turnaround_days) : null,
    accepted: pct(r.accepted, r.assessed),
    hoursPct: pct(Number(r.hours), Number(r.planned_hours)),
    hoursPl: r.learners ? Math.round(Number(r.hours) / r.learners * 10) / 10 : null,
  });
  const a = m(now), b = m(before);
  /* The change on the period before: green when it's better (lower is better for turnaround). */
  const delta = (x, y, unit, lowerBetter) => {
    if (x == null || y == null) return '<span class="delta">No earlier figure</span>';
    const d = Math.round((x - y) * 10) / 10;
    if (!d) return '<span class="delta">Same as the period before</span>';
    const good = lowerBetter ? d < 0 : d > 0;
    return '<span class="delta ' + (good ? "up" : "down") + '">' + (d > 0 ? "▲ " : "▼ ") + Math.abs(d) + (unit || "") + ' on the period before</span>';
  };
  const card = (label, big, sub, dl) => '<div class="icard"><span class="label">' + label + '</span><span class="big num">' + big + '</span><span class="sub">' + sub + '</span>' + (dl || "") + '</div>';
  const e = now.evia || {}, eb = before.evia || {}, n = (o, key) => Number(o[key] || 0);
  const EVIA = [["saved.evidence", "Pieces of evidence captured"], ["evidence.guide", "Guided evidence sessions"], ["saved.lessons-done", "Teach me lessons finished"],
    ["saved.tests", "Tests and mock exams taken"], ["saved.hours", "Learning hours entries"], ["chat.question", "Questions answered by Evia"], ["review.open", "Progress reviews opened"], ["college.check-in", "Class check-ins"]];
  const hrs = (mins) => Math.round(mins / 6) / 10;
  shell(
    '<div class="topbar"><div><div class="label">' + esc(name || "College") + '</div><h1>Impact</h1><p class="small muted print-only">' + esc(ukDate(P.from)) + ' to ' + esc(ukDate(iso(Date.parse(P.to) - DAY))) + ', compared with the period before</p></div>' +
      '<div class="actions no-print"><div class="seg" role="group" aria-label="Period">' + PERIODS.map(([id, t]) => '<button type="button" data-period="' + id + '" aria-pressed="' + (k === id) + '">' + t + '</button>').join("") + '</div>' +
      '<button class="btn" type="button" id="print">Download PDF</button></div></div>' +
    '<p class="muted no-print" style="margin:-4px 0 14px">' + esc(ukDate(P.from)) + ' to ' + esc(ukDate(iso(Date.parse(P.to) - DAY))) + ', compared with the ' + Math.round(now.weeks) + ' weeks before.</p>' +
    '<h2 class="ihead">Apprentices</h2><section class="icards">' +
      card("Engaged", a.engaged != null ? a.engaged + "%" : "–", now.engaged + " of " + now.learners + " apprentices added evidence or hours, or used Evia", delta(a.engaged, b.engaged, " pts")) +
      card("Evidence", now.evidence, (a.evidencePm != null ? a.evidencePm + " pieces a month per apprentice" : "pieces from apprentices"), delta(a.evidencePm, b.evidencePm, " a month")) +
      card("Learning hours", Number(now.hours), (a.hoursPct != null ? a.hoursPct + "% of the " + Number(now.planned_hours) + " planned for the period" : "hours logged"), delta(a.hoursPct, b.hoursPct, " pts")) +
      card("Hours per apprentice", a.hoursPl != null ? a.hoursPl : "–", "off-the-job hours in the period", delta(a.hoursPl, b.hoursPl, "h")) +
    '</section>' +
    '<h2 class="ihead">Assessment and reviews</h2><section class="icards">' +
      card("Marking turnaround", a.turnaround != null ? a.turnaround + "<small> days</small>" : "–", "median from upload to first assessment", delta(a.turnaround, b.turnaround, " days", true)) +
      card("Signed off first time", a.accepted != null ? a.accepted + "%" : "–", now.accepted + " of " + now.assessed + " assessments accepted", delta(a.accepted, b.accepted, " pts")) +
      card("Waiting over 7 days", now.waiting_over_7_days, "pieces from the period not yet assessed", "") +
      card("Progress reviews", now.reviews, now.reviews_overdue ? now.reviews_overdue + (now.reviews_overdue === 1 ? " apprentice" : " apprentices") + " overdue a review (12 weeks)" : "none overdue", delta(now.reviews, before.reviews, "")) +
    '</section>' +
    '<h2 class="ihead">Classroom</h2><section class="icards">' +
      card("Attendance", now.attendance, "confirmed class attendances", delta(now.attendance, before.attendance, "")) +
      card("Classroom hours", hrs(now.attendance_minutes), "hours of teaching attended", delta(hrs(now.attendance_minutes), hrs(before.attendance_minutes), "h")) +
    '</section>' +
    '<h2 class="ihead">Evia at work</h2><section class="panel"><div class="table-wrap flat"><table><thead><tr><th>In Evia</th><th>This period</th><th>Period before</th></tr></thead><tbody>' +
      '<tr class="static"><td>Days apprentices used Evia</td><td class="num">' + now.devices + '</td><td class="num muted">' + before.devices + '</td></tr>' +
      EVIA.map(([key, t]) => '<tr class="static"><td>' + t + '</td><td class="num">' + n(e, key) + '</td><td class="num muted">' + n(eb, key) + '</td></tr>').join("") + '</tbody></table></div>' +
      '<p class="small muted" style="margin-top:8px">From Evia’s anonymous counts, for connected apprentices who haven’t switched them off. No names or work are sent.</p></section>' +
    '<p class="small muted" style="margin-top:14px">Made by Evia on ' + esc(ukDate(iso(Date.now()))) + '. Apprentices on programme at any point in the period. Evidence counts pieces the apprentice added themselves.</p>');
  root.querySelectorAll("[data-period]").forEach((btn) => btn.onclick = () => { S.period = btn.dataset.period; impactPage(); });
  root.querySelector("#print").onclick = () => { hit("impact.pdf"); window.print(); };
}

/* ---------- Attendance: Symi's registers, learner by learner ----------
   Each learner over a period: sessions, here, late, absent with a reason, absent with none, and their attendance
   against the college's target; those below it first, with how many unexplained absences in a row. Admins set the
   college's own rules here: when a learner counts as late, the target, and how many unexplained absences in a row
   tell the admins (Evia Portal tells the learner, their tutor, assessor and employer about each one the same day). */
async function attendancePage() {
  const D = S.data, name = D.summary ? D.summary.name : mine(S.org).organisation, k = S.attPeriod || "30", P = periodDates(k);
  shell('<p class="loading">Working out attendance…</p>');
  let rows, set;
  try {
    [rows, set] = await Promise.all([
      rpc("nisia_attendance_report", { p_org: S.org, p_from: P.from, p_to: iso(Date.parse(P.to) - DAY) }),
      db.from("attendance_settings").select("late_minutes, target_pct, alert_after").eq("organisation_id", S.org).maybeSingle().then((r) => { if (r.error) throw new Error(r.error.message); return r.data; })]);
  } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  set = set || { late_minutes: 10, target_pct: 90, alert_after: 2 };
  const seen = rows.filter((r) => r.sessions > 0), sum = (f) => seen.reduce((n, r) => n + (r[f] || 0), 0);
  const all = sum("sessions"), here = sum("present"), pct = all ? Math.round(here / all * 100) : null, below = seen.filter((r) => r.below_target);
  const learnerOf = (e) => (D.learners.find((l) => l.enrolment_id === e) || {}).learner_id;
  const stat = (label, big, sub, cls) => '<div class="stat"><span class="label">' + label + '</span><span class="big num' + (cls ? " " + cls : "") + '">' + big + '</span><span class="small muted">' + sub + '</span></div>';
  shell(
    '<div class="topbar"><div><div class="label">' + esc(name || "College") + '</div><h1>Attendance</h1><p class="small muted print-only">' + esc(ukDate(P.from)) + ' to ' + esc(ukDate(iso(Date.parse(P.to) - DAY))) + '</p></div>' +
      '<div class="actions no-print"><div class="seg" role="group" aria-label="Period">' + [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 3 months"], ["year", "This academic year"]].map(([id, t]) => '<button type="button" data-period="' + id + '" aria-pressed="' + (k === id) + '">' + t + '</button>').join("") + '</div>' +
      '<button class="btn" type="button" id="print">Download PDF</button></div></div>' +
    '<section class="stats att-stats">' +
      stat("Attendance", pct != null ? pct + "%" : "–", "college target " + set.target_pct + "%", pct != null && pct < set.target_pct ? "bad" : "") +
      stat("Below target", below.length, below.length === 1 ? "learner" : "learners", below.length ? "bad" : "") +
      stat("No reason given", sum("no_reason"), "absences with no reason") +
      stat("With a reason", sum("with_reason"), "ill, holidays, appointments…") +
      stat("Late", sum("late"), "after " + set.late_minutes + " minutes") +
    '</section>' +
    (D.admin ? '<section class="panel att-rules no-print"><div class="panel-head"><h2>Your college’s rules</h2><span class="small muted">Used by Symi, Evia and these reports</span></div>' +
      '<form id="rules" class="att-form">' +
        '<label>Late after<span><input class="input num" type="number" name="late_minutes" min="0" max="120" value="' + set.late_minutes + '"> minutes</span></label>' +
        '<label>Attendance target<span><input class="input num" type="number" name="target_pct" min="50" max="100" value="' + set.target_pct + '"> %</span></label>' +
        '<label>Tell admins after<span><input class="input num" type="number" name="alert_after" min="1" max="10" value="' + set.alert_after + '"> absences in a row with no reason</span></label>' +
        '<button class="btn primary" type="submit">Save</button></form>' +
      '<p class="small muted">Each absence with no reason is sent the same day to the learner, their tutor, assessor and employer.</p></section>' : "") +
    '<div class="table-wrap"><table class="att-table"><thead><tr><th>Learner</th><th>Sessions</th><th>Here</th><th>Attendance</th><th>Late</th><th>Off, with reason</th><th>Off, no reason</th><th>In a row</th><th>Last off</th></tr></thead><tbody>' +
    (rows.length ? rows.map((r) => '<tr data-learner="' + esc(learnerOf(r.enrolment_id) || "") + '" tabindex="0"' + (r.below_target ? ' class="att-below"' : "") + '><td><div class="person">' + avatar(r.name) + '<div><b>' + esc(r.name) + '</b>' + (r.employer ? '<br><span class="small muted">' + esc(r.employer) + '</span>' : "") + '</div></div></td>' +
      '<td class="num">' + r.sessions + '</td><td class="num">' + r.present + '</td>' +
      '<td style="min-width:150px">' + (r.sessions ? pbar(r.pct, set.target_pct) : '<span class="small muted">No registers yet</span>') + '</td>' +
      '<td class="num">' + (r.late || "") + '</td><td class="num">' + (r.with_reason || "") + '</td><td class="num' + (r.no_reason ? " att-bad" : "") + '">' + (r.no_reason || "") + '</td>' +
      '<td>' + (r.run >= set.alert_after ? '<span class="pill bad">' + r.run + ' in a row</span>' : r.run ? '<span class="pill warn">' + r.run + '</span>' : "") + '</td>' +
      '<td class="small">' + (r.last_absent ? esc(ukDate(r.last_absent)) : "") + '</td></tr>').join("")
      : '<tr class="static"><td colspan="9" class="empty">No learners yet.</td></tr>') +
    '</tbody></table></div>' +
    '<p class="small muted">From the registers tutors finish in Symi. The dark mark on each bar is the college’s target. A reason comes from a day booked off (in Evia, Symi, Milos or Paros) or the tutor’s mark.</p>');
  root.querySelectorAll("[data-period]").forEach((b) => b.onclick = () => { S.attPeriod = b.dataset.period; attendancePage(); });
  root.querySelector("#print").onclick = () => { hit("attendance.pdf"); window.print(); };
  root.querySelectorAll("tr[data-learner]").forEach((r) => { if (!r.dataset.learner) return; const open = () => go("learner", { learner: r.dataset.learner }); r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
  const f = root.querySelector("#rules");
  if (f) f.onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(f), row = { organisation_id: S.org, late_minutes: Number(v.late_minutes), target_pct: Number(v.target_pct), alert_after: Number(v.alert_after), updated_at: new Date().toISOString() };
    if (!(row.late_minutes >= 0 && row.late_minutes <= 120) || !(row.target_pct >= 50 && row.target_pct <= 100) || !(row.alert_after >= 1 && row.alert_after <= 10)) return toast("Late 0–120 minutes, target 50–100%, alert after 1–10");
    await busy(f.querySelector("button"), "Saving…", async () => {
      const { error } = await db.from("attendance_settings").upsert(row, { onConflict: "organisation_id" });
      if (error) return toast(error.message);
      hit("attendance.rules"); toast("Saved. Symi and Evia use these from now on."); attendancePage();
    });
  };
}

/* ---------- Registers: every register the tutors have taken in Symi, to look back on and download ----------
   Each one learner by learner: their mark, when they came and went (the tutor can correct the times in Symi), why
   anyone wasn't there, and why anyone left early. Download gives a spreadsheet (CSV, opens in Excel) of one register
   or of every register in the period. Admins and quality see the whole college's; a tutor sees their own. */
ICON.register = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3h5a1 1 0 011 1v1.5a1 1 0 01-1 1h-5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M8.5 5H7a2.5 2.5 0 00-2.5 2.5v11A2.5 2.5 0 007 21h10a2.5 2.5 0 002.5-2.5v-11A2.5 2.5 0 0017 5h-1.5"/><path d="M8.5 13.5l2.3 2.3 4.7-4.7"/></svg>';
const clock = (t) => t ? new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
const hmm = (min) => { const m = Math.max(0, Math.round(Number(min) || 0)); return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0"); };
function regMark(l, finished) {
  if (l.status === "present") return [l.late ? "warn" : "good", (l.late ? "Late" : "Here") + (l.left_at ? " · left " + clock(l.left_at) : "")];
  if (l.status === "absent") return l.reason ? ["off", "Absent · " + l.reason] : ["bad", "Absent · no reason"];
  if (l.off) return ["off", OFF_NAMES[l.off] || "Booked off"];
  return finished ? ["bad", "Absent · no reason"] : ["idle", "Not marked"];
}
function regCsv(list) {
  const q = (v) => { const s = String(v == null ? "" : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const out = [["Date", "Class", "Tutor", "Learner", "Mark", "Arrived", "Left early at", "Time in class (h:mm)", "Why not here", "Why they left early", "Taught"]];
  for (const r of list) for (const l of r.learners) {
    const here = l.status === "present", mk = here ? (l.late ? "Late" : "Here") : l.status === "absent" || r.status === "finished" ? "Absent" : l.off ? "Booked off" : "Not marked";
    out.push([r.session_date, r.title, r.tutor, l.name, mk, here ? clock(l.arrived_at || l.checked_in_at) : "", here ? clock(l.left_at) : "", here ? hmm(l.minutes) : "",
      here ? "" : l.reason || (l.off ? OFF_NAMES[l.off] || "Booked off" : ""), here && l.left_at ? l.left_reason || "Not given" : "", r.lesson_title || ""]);
  }
  return "﻿" + out.map((x) => x.map(q).join(",")).join("\r\n");
}
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" })), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fileSafe = (s) => String(s || "").replace(/[^a-z0-9 _-]+/gi, "").trim().replace(/\s+/g, "-");
/* ---------- Messages ----------
   Everyone: their own conversations (the same screens as in Evia, Symi, Milos and Paros: packages/core/messages-ui.js).
   Admins, for safeguarding: every conversation in the college, reported ones first, in full (removed messages too). */
const msgs = window.NisiaMessages.mount({ app: "nisia", color: "#6D5BD0", soft: "#ECE9FB", group: true, rpc, ready: () => !!S.org,
  place: (btn) => { const mb = document.getElementById("menuBtn"); if (!mb) { btn.remove(); return; } if (btn.nextElementSibling !== mb) mb.parentElement.insertBefore(btn, mb); },
  onUnread: (n) => { msgUnread = n; const c = document.getElementById("navMsgCount"); if (c) { c.hidden = !n; c.textContent = n; } if (S.page === "messages" && S.msgShown !== n) messagesPage(); } });
const who2 = (n, r) => esc(n) + ' <span class="small muted">' + esc({ learner: "Apprentice", admin: "Admin", assessor: "Assessor", tutor: "Tutor", quality: "Quality", employer: "Employer" }[r] || "") + "</span>";
async function messagesPage() {
  const D = S.data, name = D.summary ? D.summary.name : mine(S.org).organisation, m = mine(S.org), admin = m.roles.includes("admin") || who.platform_admin;
  if (!root.querySelector("#msgNew")) shell('<p class="loading">Loading messages…</p>');
  let mineT = [], college = null;
  try { mineT = (await rpc("msg_threads")) || []; if (admin) college = (await rpc("msg_college", { p_org: S.org })) || []; } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  if (S.page !== "messages") return;
  S.msgShown = msgUnread;
  const when = (t) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  shell('<div class="topbar"><div><div class="label">' + esc(name || "College") + '</div><h1>Messages</h1><p class="small muted">Between apprentices, tutors, assessors and employers, in every app.</p></div>' +
      '<div class="actions"><button class="btn" type="button" id="msgGroup">Group message</button><button class="btn primary" type="button" id="msgNew">' + ICON.plus + 'New message</button></div></div>' +
    '<h2 class="section-h">Your conversations</h2><div class="table-wrap"><table><thead><tr><th>With</th><th>Last message</th><th>When</th><th></th></tr></thead><tbody>' +
    (mineT.length ? mineT.map((t, i) => '<tr data-mine="' + i + '" tabindex="0"><td><div class="person">' + avatar(t.name) + '<span><b>' + esc(t.name) + '</b><br><span class="small muted">' + esc(t.about) + '</span></span></div></td>' +
        '<td class="small">' + esc(t.last ? (t.last.mine ? "You: " : "") + t.last.body : "") + '</td><td class="small">' + (t.last ? esc(when(t.last.at)) : "") + '</td><td>' + (t.unread ? '<span class="pill warn">' + t.unread + ' new</span>' : "") + '</td></tr>').join("")
      : '<tr class="static"><td colspan="4" class="empty">No conversations yet. Press New message to start one.</td></tr>') + '</tbody></table></div>' +
    (college ? '<h2 class="section-h">Everyone’s messages</h2><p class="small muted">For safeguarding, admins can read every conversation in the college, including removed messages. Reported ones are first.</p>' +
      '<div class="table-wrap"><table><thead><tr><th>Between</th><th>And</th><th>Messages</th><th>Last</th><th></th></tr></thead><tbody>' +
      (college.length ? college.map((t, i) => '<tr data-col="' + i + '" tabindex="0"><td>' + who2(t.a, t.a_role) + '</td><td>' + who2(t.b, t.b_role) + '</td><td class="num">' + t.count + '</td><td class="small">' + esc(when(t.last_at)) + '</td><td>' +
          (t.reported ? '<span class="pill bad">' + t.reported + ' reported</span>' : "") + '</td></tr>').join("")
        : '<tr class="static"><td colspan="5" class="empty">Nobody has sent a message yet.</td></tr>') + '</tbody></table></div>' : ""));
  root.querySelector("#msgNew").onclick = () => msgs.open();
  root.querySelector("#msgGroup").onclick = () => msgs.open("group");
  root.querySelectorAll("tr[data-mine]").forEach((tr) => { const open = () => msgs.open(mineT[Number(tr.dataset.mine)].with); tr.onclick = open; tr.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
  root.querySelectorAll("tr[data-col]").forEach((tr) => { const open = () => collegeThread(college[Number(tr.dataset.col)]); tr.onclick = open; tr.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
}
async function collegeThread(t) {
  hit("messages.college");
  let full;
  try { full = await rpc("msg_college_thread", { p_thread: t.id }); } catch (e) { toast(e.message); return; }
  const m = modal(t.a + " and " + t.b,
    '<div class="msg-log">' + (full.messages || []).map((x) => '<div class="msg-line ' + (x.side === "a" ? "a" : "b") + (x.reported_at ? " reported" : "") + '"><div class="small muted">' + esc(x.from) + " · " + esc(new Date(x.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) + '</div>' +
      '<div class="msg-body">' + esc(x.body) + '</div>' +
      (x.removed_at ? '<div class="small muted">Removed by the sender ' + esc(new Date(x.removed_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) + '</div>' : "") +
      (x.reported_at ? '<div class="small" style="color:var(--bad)">Reported by ' + esc(x.reported_by || "") + (x.report_reason ? ": “" + esc(x.report_reason) + "”" : "") + '</div>' : "") + '</div>').join("") + '</div>' +
    '<p class="small muted">Read only. Messages are never deleted. If a message worries you, follow your college’s safeguarding policy.</p>');
  m.classList.add("wide-modal");
}
async function registersPage() {
  const D = S.data, name = D.summary ? D.summary.name : mine(S.org).organisation, k = S.regPeriod || "30", P = periodDates(k);
  shell('<p class="loading">Loading registers…</p>');
  let rows;
  try { rows = await rpc("nisia_registers", { p_org: S.org, p_from: P.from, p_to: iso(Date.parse(P.to) - DAY) }); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  if (S.page !== "registers") return;
  const classes = [...new Map(rows.map((r) => [r.class_id, r.title])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const cls = classes.some(([id]) => id === S.regClass) ? S.regClass : "", list = rows.filter((r) => !cls || r.class_id === cls);
  const count = (r, f) => r.learners.filter(f).length;
  shell('<div class="topbar"><div><div class="label">' + esc(name || "College") + '</div><h1>Registers</h1><p class="small muted">Every register taken in Symi. Open one to see it in full.</p></div>' +
      '<div class="actions"><div class="seg" role="group" aria-label="Period">' + [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 3 months"], ["year", "This academic year"]].map(([id, x]) => '<button type="button" data-period="' + id + '" aria-pressed="' + (k === id) + '">' + x + '</button>').join("") + '</div>' +
      '<button class="btn primary" type="button" id="dlAll"' + (list.length ? "" : " disabled") + '>Download spreadsheet</button></div></div>' +
    (classes.length > 1 ? '<label class="field reg-filter">Class<select class="input" id="regClass"><option value="">Every class</option>' + classes.map(([id, x]) => '<option value="' + esc(id) + '"' + (id === cls ? " selected" : "") + '>' + esc(x) + '</option>').join("") + '</select></label>' : "") +
    '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Class</th><th>Tutor</th><th>Here</th><th>Late</th><th>Left early</th><th>Absent</th><th>Register</th></tr></thead><tbody>' +
    (list.length ? list.map((r, i) => { const done = r.status === "finished";
      return '<tr data-reg="' + i + '" tabindex="0"><td><b>' + esc(new Date(r.session_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })) + '</b></td>' +
        '<td>' + esc(r.title) + '</td><td class="small">' + esc(r.tutor) + '</td>' +
        '<td class="num">' + count(r, (l) => l.status === "present") + ' of ' + r.learners.length + '</td><td class="num">' + (count(r, (l) => l.status === "present" && l.late) || "") + '</td>' +
        '<td class="num">' + (count(r, (l) => l.status === "present" && l.left_at) || "") + '</td><td class="num">' + (count(r, (l) => l.status !== "present" && (done || l.status === "absent")) || "") + '</td>' +
        '<td>' + (done ? '<span class="pill good">Finished</span>' : '<span class="pill warn">Not finished</span>') + '</td></tr>'; }).join("")
      : '<tr class="static"><td colspan="8" class="empty">No registers in this period yet. They appear here as tutors take them in Symi.</td></tr>') +
    '</tbody></table></div>' +
    '<p class="small muted">Times are when each learner arrived and, if they left early, when. The tutor can correct them in Symi, and every change to a finished register is kept.</p>');
  root.querySelectorAll("[data-period]").forEach((b) => b.onclick = () => { S.regPeriod = b.dataset.period; registersPage(); });
  const sel = root.querySelector("#regClass"); if (sel) sel.onchange = () => { S.regClass = sel.value; registersPage(); };
  root.querySelector("#dlAll").onclick = () => { hit("registers.download"); download(regCsv(list), fileSafe("Registers " + (cls ? classes.find(([id]) => id === cls)[1] + " " : "") + P.from + " to " + iso(Date.parse(P.to) - DAY)) + ".csv"); };
  root.querySelectorAll("tr[data-reg]").forEach((tr) => { const open = () => registerSheet(list[Number(tr.dataset.reg)]); tr.onclick = open; tr.onkeydown = (e) => { if (e.key === "Enter") open(); }; });
}
function registerSheet(r) {
  const done = r.status === "finished", when = new Date(r.session_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const m = modal(r.title + " · " + when,
    '<p class="small muted" style="margin-top:0">' + esc([r.tutor, r.room, r.lesson_title ? "Taught: " + r.lesson_title : ""].filter(Boolean).join(" · ")) + (done ? "" : " · Not finished yet") + '</p>' +
    '<div class="table-wrap"><table><thead><tr><th>Learner</th><th>Mark</th><th>Arrived</th><th>Left early</th><th>Time</th></tr></thead><tbody>' +
    (r.learners.length ? r.learners.map((l) => { const mk = regMark(l, done), here = l.status === "present";
      return '<tr class="static"><td><div class="person">' + avatar(l.name) + '<b>' + esc(l.name) + '</b></div></td><td><span class="pill ' + mk[0] + '">' + esc(mk[1]) + '</span>' +
        (here && l.left_at ? '<br><span class="small muted">Why: ' + esc(l.left_reason || "not given") + '</span>' : "") + '</td>' +
        '<td class="num">' + (here ? esc(clock(l.arrived_at || l.checked_in_at)) : "") + '</td><td class="num">' + (here ? esc(clock(l.left_at)) : "") + '</td><td class="num">' + (here ? hmm(l.minutes) : "") + '</td></tr>'; }).join("")
      : '<tr class="static"><td colspan="5" class="empty">No learners on this register.</td></tr>') +
    '</tbody></table></div><button class="btn primary wide" type="button" id="dlOne" style="margin-top:14px">Download this register</button>');
  m.classList.add("wide-modal");
  m.querySelector("#dlOne").onclick = () => { hit("registers.download"); download(regCsv([r]), fileSafe("Register " + r.title + " " + r.session_date) + ".csv"); };
}

/* ---------- Today: every class on today, with who's in as the registers come in from Symi ----------
   Which classes are on comes from each class's days and dates (as Evia works them out), or a register already opened.
   It refreshes itself every 20 seconds while it's open. */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function classOn(c, k) {
  const s = c.schedule || {}, r = s.recurrence || {}, type = r.type || "weekly", d = new Date(k + "T12:00:00");
  if (type === "once") return (r.onceDate || r.startDate) === k;
  if ((r.startDate && k < r.startDate) || (r.endDate && k > r.endDate)) return false;
  const every = Math.max(1, Number(r.interval) || 1), anchor = new Date((r.anchorDate || r.startDate || k) + "T12:00:00");
  if (type === "monthly") return (r.monthDays || []).map(Number).includes(d.getDate()) && ((d.getFullYear() - anchor.getFullYear()) * 12 + d.getMonth() - anchor.getMonth()) % every === 0;
  const days = (r.weekdays && r.weekdays.length ? r.weekdays : [s.day]).filter(Boolean);
  const monday = (x) => { const y = new Date(x); y.setDate(y.getDate() - (y.getDay() + 6) % 7); return y; };
  const weeks = Math.round((monday(d) - monday(anchor)) / (7 * DAY));
  return days.includes(WEEKDAYS[d.getDay()]) && ((weeks % every) + every) % every === 0;
}
const OFF_NAMES = { ill: "Sickness", holiday: "Holiday", appointment: "Appointment", work: "At work", other: "Booked off" };
function markOf(l, done) {
  if (l.status === "present") return l.late ? ["warn", "Late"] : ["good", "In"];
  if (l.off) return ["off", OFF_NAMES[l.off] || "Booked off"];
  if (l.status === "absent" || done) return ["bad", "Absent"];
  return ["idle", "Not in yet"];
}
let todayTimer = null;
async function todayPage(quiet) {
  const D = S.data, k = S.todayDay || iso(Date.now()), isToday = k === iso(Date.now());
  clearTimeout(todayTimer);
  if (isToday) todayTimer = setTimeout(() => { if (S.page === "today") todayPage(true); }, 20000);
  if (!quiet) shell('<p class="loading">Loading today…</p>');
  let rows;
  try { rows = await rpc("nisia_today", { p_org: S.org, p_day: k }); } catch (e) { if (!quiet) shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  if (S.page !== "today" || (quiet && document.getElementById("modal"))) return;
  const on = rows.filter((c) => c.session_status || classOn(c, k));
  const marks = on.flatMap((c) => c.learners.map((l) => markOf(l, c.session_status === "finished")));
  const n = (cls) => marks.filter((m) => m[0] === cls).length;
  const stat = (label, big, sub, cls) => '<div class="stat"><span class="label">' + label + '</span><span class="big num' + (cls ? " " + cls : "") + '">' + big + '</span><span class="small muted">' + sub + '</span></div>';
  const when = new Date(k + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const step = (days) => iso(Date.parse(k + "T12:00:00") + days * DAY), day = isToday ? "today" : "this day";
  shell('<div class="topbar"><div><div class="label">' + esc(D.summary ? D.summary.name : mine(S.org).organisation) + '</div><h1>' + (isToday ? "Today" : esc(when)) + '</h1>' +
      '<p class="small muted">' + (isToday ? esc(when) + ' · <span class="live-dot" aria-hidden="true"></span>Live from Symi' : "Registers for this day") + '</p></div>' +
      '<div class="actions"><button class="btn" type="button" data-day="' + step(-1) + '" aria-label="Day before">‹</button>' + (isToday ? "" : '<button class="btn" type="button" data-day="' + iso(Date.now()) + '">Today</button>') +
      '<button class="btn" type="button" data-day="' + step(1) + '" aria-label="Day after">›</button></div></div>' +
    '<section class="stats">' + stat("Classes", on.length, "on " + day) + stat("In", n("good") + n("warn"), n("warn") ? n("warn") + " late" : "on time") +
      stat("Booked off", n("off"), "ill, holiday, work…") + stat("Absent", n("bad"), "no reason given", n("bad") ? "bad" : "") + stat("Not in yet", n("idle"), "expected") + '</section>' +
    (on.length ? '<div class="today-grid">' + on.map((c) => {
      const done = c.session_status === "finished", open = c.session_status === "open", s = c.schedule || {};
      const list = c.learners.map((l) => [l, markOf(l, done)]), inN = list.filter(([, m]) => m[0] === "good" || m[0] === "warn").length;
      return '<section class="panel today-class"><div class="panel-head"><div><h2>' + esc(c.title) + '</h2><span class="small muted">' + esc([s.start && s.start + "–" + (s.end || ""), c.room, c.tutor].filter(Boolean).join(" · ")) + '</span></div>' +
        (done ? '<span class="pill good">Register done</span>' : open ? '<span class="pill warn">Register open</span>' : '<span class="pill idle">Not started</span>') + '</div>' +
        '<div class="today-count"><b class="num">' + inN + '</b> of ' + c.learners.length + ' in</div>' +
        (c.learners.length ? '<ul class="today-list">' + list.map(([l, m]) => '<li><span class="person">' + avatar(l.name) + '<b>' + esc(l.name) + '</b></span><span class="pill ' + m[0] + '">' + m[1] +
            (l.checked_in_at && l.status === "present" ? " " + new Date(l.checked_in_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "") + '</span></li>').join("") + '</ul>'
          : '<p class="small muted">No learners on this class yet.</p>') +
        (c.lesson_title ? '<p class="small muted">Taught: ' + esc(c.lesson_title) + (c.ksbs && c.ksbs.length ? " · " + esc(c.ksbs.join(", ")) : "") + '</p>' : "") + '</section>';
    }).join("") + '</div>'
      : '<section class="panel"><p class="empty">' + (rows.length ? "No classes on " + day + "." : D.admin ? 'No classes set up yet. <button class="btn primary" type="button" id="toClasses">Set up a class</button>' : "No classes yet.") + '</p></section>') +
    '<p class="small muted">Learners check in on Evia with the code on the tutor’s Symi screen, or the tutor marks them. Days booked off in Evia, Symi, Milos or Paros show here.</p>');
  root.querySelectorAll("[data-day]").forEach((b) => b.onclick = () => { S.todayDay = b.dataset.day; todayPage(); });
  const tc = root.querySelector("#toClasses"); if (tc) tc.onclick = () => go("classes");
}

/* ---------- Resources: what the college shares with its tutors (Symi › Resources › College) ----------
   Tutors share their own slides, quizzes and lesson plans from Symi; admins and tutors add links here to files the
   college keeps elsewhere. Whoever shared one, or an admin, can take it down. */
const KIND_NAMES = { slides: "Slides", quiz: "Quiz", lesson: "Lesson plan", link: "Link" };
async function resourcesPage() {
  const D = S.data;
  shell('<p class="loading">Loading resources…</p>');
  let rows;
  try { rows = await rpc("nisia_college_resources", { p_org: S.org }); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  const count = (k) => rows.filter((r) => r.kind === k).length;
  shell('<div class="topbar"><div><div class="label">' + esc(D.summary ? D.summary.name : mine(S.org).organisation) + '</div><h1>Resources</h1></div><div class="actions"><button class="btn primary" type="button" id="addRes">' + ICON.plus + 'Add a link</button></div></div>' +
    '<p class="hint">Your college’s own teaching resources, in every tutor’s Symi (Resources › College). Tutors share their slides, quizzes and lesson plans from Symi; add links here to files you keep elsewhere, like PowerPoints or videos. Every course also comes with its own lessons, slides and quizzes in Symi.</p>' +
    '<section class="stats" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + [["slides", "Slides"], ["quiz", "Quizzes"], ["lesson", "Lesson plans"], ["link", "Links"]].map(([k, t]) => '<div class="stat"><span class="label">' + t + '</span><span class="big num">' + count(k) + '</span></div>').join("") + '</section>' +
    '<div class="table-wrap" style="margin-top:18px"><table><thead><tr><th>Resource</th><th>Type</th><th>Course</th><th>Shared by</th><th>Added</th><th></th></tr></thead><tbody>' +
    (rows.length ? rows.map((r) => '<tr class="static"><td><b>' + esc(r.title) + '</b>' + (r.unit ? '<br><span class="small muted">' + esc(r.unit) + '</span>' : "") + (r.url ? '<br><a class="small" href="' + esc(r.url) + '" target="_blank" rel="noopener">Open link</a>' : "") + '</td>' +
      '<td><span class="pill idle">' + esc(KIND_NAMES[r.kind] || r.kind) + '</span></td><td class="small">' + esc(r.course_code ? courseName(r.course_code) : "Any") + '</td><td class="small">' + esc(r.shared_by || "") + '</td><td class="small">' + esc(ukDate(String(r.created_at).slice(0, 10))) + '</td>' +
      '<td>' + (r.can_remove ? '<button class="btn small" type="button" data-down="' + esc(r.id) + '">Take down</button>' : "") + '</td></tr>').join("")
      : '<tr class="static"><td colspan="6" class="empty">Nothing shared yet. Tutors share from Symi, or add a link here.</td></tr>') + '</tbody></table></div>');
  root.querySelector("#addRes").onclick = () => {
    const m = modal("Add a link", '<form class="form-grid" id="rf" novalidate><label class="field full">Name<input name="title" required maxlength="200" placeholder="e.g. Cavity walls PowerPoint"></label>' +
      '<label class="field full">Link<input name="url" type="url" required placeholder="https://"></label>' +
      '<label class="field">Course<select name="course"><option value="">Any course</option>' + COURSES.map((x) => '<option value="' + x.id + '">' + esc(x.name) + '</option>').join("") + '</select></label>' +
      '<label class="field">Unit <small>(optional)</small><input name="unit" maxlength="200"></label><p class="err full"></p><button class="btn primary wide full" type="submit">Share with your tutors</button></form>');
    const f = m.querySelector("#rf"), err = f.querySelector(".err");
    f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Sharing…", async () => {
      err.textContent = ""; const v = formData(f);
      try { await rpc("nisia_share_resource", { p_org: S.org, p_kind: "link", p_title: v.title, p_course: v.course || null, p_unit: v.unit || null, p_content: {}, p_url: (v.url || "").trim() }); hit("resource.link"); closeModal(); toast("Shared. It’s in every tutor’s Symi."); resourcesPage(); }
      catch (x) { err.textContent = x.message; }
    }); };
  };
  root.querySelectorAll("[data-down]").forEach((b) => b.onclick = () => { if (!confirm("Take this down? Tutors won’t see it any more.")) return;
    busy(b, "…", async () => { try { await rpc("nisia_unshare_resource", { p_id: b.dataset.down }); toast("Taken down"); resourcesPage(); } catch (x) { toast(x.message); } }); });
}

/* ---------- Classes: set up once here, they're the tutor's registers in Symi and the learners' college days in Evia ---------- */
const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
async function loadClasses() { S.classes = await rpc("nisia_classes", { p_org: S.org }); return S.classes; }
function classWhen(c) {
  const s = c.schedule || {}, r = s.recurrence || {}, days = (r.weekdays && r.weekdays.length ? r.weekdays : [s.day]).filter(Boolean);
  const teach = s.start && s.end ? mins(s.end) - mins(s.start) - (s.breaks || []).reduce((n, b) => n + Math.max(0, mins(b.end) - mins(b.start)), 0) : 0;
  return (r.interval > 1 ? "Every " + r.interval + " weeks · " : "") + days.map((d) => d.slice(0, 3)).join(", ") + (s.start ? " " + s.start + "–" + (s.end || "") : "") + (teach > 0 ? " · " + hm(teach) + " teaching" : "");
}
const classDates = (c) => { const r = (c.schedule || {}).recurrence || {}; return r.startDate ? ukDate(r.startDate) + (r.endDate ? " to " + ukDate(r.endDate) : " onwards") : ""; };
async function classesPage() {
  const D = S.data;
  shell('<p class="loading">Loading classes…</p>');
  try { await loadClasses(); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  const list = S.classes;
  shell('<div class="topbar"><div><div class="label">' + esc(D.summary ? D.summary.name : mine(S.org).organisation) + '</div><h1>Classes</h1></div><div class="actions">' +
      (D.admin ? '<button class="btn primary" type="button" id="newClass">' + ICON.plus + 'New class</button>' : "") + '</div></div>' +
    '<p class="hint">Set each class up once. It becomes the tutor’s register in Symi, every class day in each learner’s Evia, and the attendance reports. Tutors can still change their own classes in Symi.</p>' +
    '<div class="table-wrap"><table><thead><tr><th>Class</th><th>Course</th><th>Tutor</th><th>When</th><th>Dates</th><th>Learners</th><th>Registers taken</th>' + (D.admin ? '<th></th>' : "") + '</tr></thead><tbody>' +
    (list.length ? list.map((c) => '<tr class="static"><td><b>' + esc(c.title) + '</b>' + (c.room ? '<br><span class="small muted">' + esc(c.room) + '</span>' : "") + '</td>' +
      '<td class="small">' + esc(c.course_code ? courseName(c.course_code) : "") + '</td><td class="small">' + esc(c.tutor) + '</td>' +
      '<td class="small">' + esc(classWhen(c)) + '</td><td class="small">' + esc(classDates(c)) + '</td>' +
      '<td class="small">' + (c.learners.length ? '<b>' + c.learners.length + '</b> · ' + esc(c.learners.map((l) => l.name.split(" ")[0]).join(", ")) : '<span class="muted">None yet</span>') + '</td>' +
      '<td class="num">' + (c.sessions_done || 0) + (c.last_session ? '<br><span class="small muted">last ' + esc(ukDate(c.last_session)) + '</span>' : "") + '</td>' +
      (D.admin ? '<td><button class="btn" type="button" data-edit-class="' + esc(c.id) + '">Edit</button></td>' : "") + '</tr>').join("")
      : '<tr class="static"><td colspan="8" class="empty">' + (D.admin ? "No classes yet. Set up your first one: its register appears in the tutor’s Symi straight away." : "No classes for you yet.") + '</td></tr>') +
    '</tbody></table></div>');
  const nb = root.querySelector("#newClass"); if (nb) nb.onclick = () => classForm(null);
  root.querySelectorAll("[data-edit-class]").forEach((b) => b.onclick = () => classForm(S.classes.find((c) => c.id === b.dataset.editClass)));
}
/* Hours and minutes from "HH:MM", and a length of time in words. */
const mins = (t) => { const [h, m] = String(t || "").split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : NaN; };
const hm = (n) => { n = Math.max(0, Math.round(n)); const h = Math.floor(n / 60), m = n % 60; return (h ? h + "h" : "") + (m ? (h ? " " : "") + m + "m" : h ? "" : "0m"); };
function classForm(c) {
  const D = S.data, s = (c && c.schedule) || {}, r = s.recurrence || {}, days = c ? (r.weekdays && r.weekdays.length ? r.weekdays : [s.day]) : [];
  const tutors = (D.staff || []).filter((x) => x.active && (x.roles.includes("tutor") || x.roles.includes("admin")));
  const inClass = new Set(c ? c.learners.map((l) => l.enrolment_id) : []);
  /* Everyone at the college, the ones on this class first, then A to Z. Searchable, so it works with hundreds. */
  const learners = D.learners.filter((l) => l.enrolment_id).slice().sort((a, b) => (inClass.has(b.enrolment_id) - inClass.has(a.enrolment_id)) || a.name.localeCompare(b.name));
  const courses = [...new Set(learners.map((l) => l.course_code).filter(Boolean))];
  const breaks = c ? (Array.isArray(s.breaks) ? s.breaks : []) : [{ start: "10:30", end: "10:45" }, { start: "12:30", end: "13:00" }, { start: "14:30", end: "14:45" }];
  const breakRow = (b) => '<div class="brk-row"><label>From<input type="time" data-brk="start" value="' + esc(b.start || "") + '"></label><label>to<input type="time" data-brk="end" value="' + esc(b.end || "") + '"></label><button type="button" class="btn ghost small" data-brk-del aria-label="Remove this break">Remove</button></div>';
  const m = modal(c ? "Edit class" : "New class",
    '<form class="form-grid" id="cf" novalidate>' +
    '<label class="field full">Class name<input name="title" required maxlength="120" placeholder="e.g. L2 Bricklaying, Tuesday group" value="' + esc(c ? c.title : "") + '"></label>' +
    '<label class="field">Course<select name="course">' + COURSES.map((x) => '<option value="' + x.id + '"' + (c && c.course_code === x.id ? " selected" : "") + '>' + esc(x.name) + '</option>').join("") + '</select></label>' +
    '<label class="field">Tutor<select name="tutor" required>' + tutors.map((t) => '<option value="' + t.member_id + '"' + (c && c.tutor_member_id === t.member_id ? " selected" : "") + '>' + esc(t.name || t.email) + '</option>').join("") + '</select></label>' +
    '<div class="field full"><span>Days</span><div class="choice">' + WEEK.map((d) => '<label><input type="checkbox" name="day" value="' + d + '"' + (days.includes(d) ? " checked" : "") + '> ' + d.slice(0, 3) + '</label>').join("") + '</div></div>' +
    '<label class="field">Starts at<input name="start" type="time" required value="' + esc(s.start || "09:00") + '"></label>' +
    '<label class="field">Ends at<input name="end" type="time" required value="' + esc(s.end || "16:00") + '"></label>' +
    '<div class="field full"><span>Breaks <small class="muted">(not counted as teaching time)</small></span><div id="brks">' + breaks.map(breakRow).join("") + '</div>' +
      '<button type="button" class="btn small" id="brkAdd">' + ICON.plus + 'Add a break</button></div>' +
    '<label class="field">First day<input name="startDate" type="date" required value="' + esc(r.startDate || iso(Date.now())) + '"></label>' +
    '<label class="field">Last day<input name="endDate" type="date" value="' + esc(r.endDate || "") + '"></label>' +
    '<label class="field">How often<select name="interval"><option value="1">Every week</option><option value="2"' + (r.interval == 2 ? " selected" : "") + '>Every 2 weeks</option></select></label>' +
    '<label class="field">Room <small>(optional)</small><input name="room" maxlength="120" value="' + esc(c && c.room || "") + '"></label>' +
    '<div class="teach-sum full" id="teachSum" aria-live="polite"></div>' +
    '<div class="field full"><span>Learners <b class="lp-count" id="lpCount"></b></span>' + (learners.length ?
      '<div class="lpick"><div class="lp-tools"><input type="search" id="lpQ" placeholder="Search ' + learners.length + ' learners by name or employer" autocomplete="off">' +
        (courses.length > 1 ? '<select id="lpCourse"><option value="">All courses</option>' + courses.map((x) => '<option value="' + esc(x) + '">' + esc(courseName(x)) + '</option>').join("") + '</select>' : "") +
        '<button type="button" class="btn small" id="lpAll">Select all shown</button><button type="button" class="btn ghost small" id="lpNone">Clear</button></div>' +
      '<div class="lp-list" id="lpList">' + learners.map((l) => '<label class="lp-row" data-q="' + esc((l.name + " " + (l.employer_name || "") + " " + courseName(l.course_code)).toLowerCase()) + '" data-course="' + esc(l.course_code || "") + '"><input type="checkbox" name="learner" value="' + esc(l.enrolment_id) + '"' + (inClass.has(l.enrolment_id) ? " checked" : "") + '>' +
        '<span><b>' + esc(l.name) + '</b><small>' + esc([courseName(l.course_code), l.employer_name].filter(Boolean).join(" · ")) + '</small></span></label>').join("") +
      '<p class="lp-none small muted" hidden>No learners match. Try part of their name.</p></div></div>'
      : '<p class="small muted">Add learners first; you can put them on this class later.</p>') + '</div>' +
    '<p class="err full"></p><button class="btn primary wide full" type="submit">' + (c ? "Save class" : "Create class") + '</button>' +
    (c ? '<button class="btn wide full" type="button" id="endClass">End this class</button>' : "") + '</form>');
  m.classList.add("wide-modal");
  const f = m.querySelector("#cf"), err = f.querySelector(".err"), box = f.querySelector("#brks");
  const readBreaks = () => [...box.querySelectorAll(".brk-row")].map((x) => ({ start: x.querySelector('[data-brk=start]').value, end: x.querySelector('[data-brk=end]').value })).filter((b) => b.start || b.end);
  /* Teaching time: the day less its breaks, then over the whole class (or each week when it has no last day). */
  const summary = () => {
    const v = formData(f), picked = [...f.querySelectorAll("[name=day]:checked")].map((x) => x.value), day = mins(v.end) - mins(v.start);
    const out = readBreaks().reduce((n, b) => n + Math.max(0, Math.min(mins(b.end), mins(v.end)) - Math.max(mins(b.start), mins(v.start))), 0), teach = day - out;
    const el = f.querySelector("#teachSum");
    if (!(day > 0)) { el.innerHTML = ""; return; }
    let total = "";
    if (picked.length && v.startDate && v.endDate && v.endDate >= v.startDate) {
      const fake = { schedule: { day: picked[0], recurrence: { type: "weekly", interval: Number(v.interval) || 1, weekdays: picked, startDate: v.startDate, endDate: v.endDate, anchorDate: v.startDate } } };
      let n = 0; for (let t = Date.parse(v.startDate + "T12:00:00"); iso(t) <= v.endDate && n < 800; t += DAY) if (classOn(fake, iso(t))) n++;
      total = '<span><b>' + n + '</b> ' + (n === 1 ? "day" : "days") + '</span><span><b>' + hm(teach * n) + '</b> teaching in total</span>';
    } else if (picked.length) total = '<span><b>' + hm(teach * picked.length / (Number(v.interval) || 1)) + '</b> teaching a week</span>';
    el.innerHTML = '<span><b>' + hm(teach) + '</b> teaching a day</span><span>' + hm(day) + ' day · ' + hm(out) + ' breaks</span>' + total;
  };
  const lpCount = () => { const n = f.querySelectorAll("[name=learner]:checked").length, el = f.querySelector("#lpCount"); if (el) el.textContent = n ? n + " chosen" : ""; };
  const lpFilter = () => {
    const q = (f.querySelector("#lpQ").value || "").trim().toLowerCase(), cs = f.querySelector("#lpCourse"), cv = cs ? cs.value : "";
    let shown = 0;
    f.querySelectorAll(".lp-row").forEach((x) => { const ok = (!q || q.split(/\s+/).every((w) => x.dataset.q.includes(w))) && (!cv || x.dataset.course === cv); x.hidden = !ok; if (ok) shown++; });
    f.querySelector(".lp-none").hidden = shown > 0;
  };
  f.addEventListener("input", (e) => { if (e.target.id === "lpQ") lpFilter(); else summary(); });
  f.addEventListener("change", (e) => { if (e.target.id === "lpCourse") lpFilter(); else if (e.target.name === "learner") lpCount(); else summary(); });
  f.querySelector("#brkAdd").onclick = () => { box.insertAdjacentHTML("beforeend", breakRow({})); box.lastElementChild.querySelector("input").focus(); summary(); };
  box.addEventListener("click", (e) => { const b = e.target.closest("[data-brk-del]"); if (b) { b.parentElement.remove(); summary(); } });
  if (f.querySelector("#lpQ")) {
    f.querySelector("#lpAll").onclick = () => { f.querySelectorAll(".lp-row:not([hidden]) [name=learner]").forEach((x) => { x.checked = true; }); lpCount(); };
    f.querySelector("#lpNone").onclick = () => { f.querySelectorAll("[name=learner]").forEach((x) => { x.checked = false; }); lpCount(); };
  }
  summary(); lpCount();
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Saving…", async () => {
    err.textContent = "";
    const v = formData(f), picked = [...f.querySelectorAll("[name=day]:checked")].map((x) => x.value), chosen = [...f.querySelectorAll("[name=learner]:checked")].map((x) => x.value);
    if (!v.title.trim()) return (err.textContent = "Give the class a name.");
    if (!v.tutor) return (err.textContent = "Invite a tutor on the Staff page first.");
    if (!picked.length) return (err.textContent = "Choose the day or days the class is on.");
    if (!v.start || !v.end || v.end <= v.start) return (err.textContent = "Choose a start time and a later end time.");
    const brks = readBreaks().sort((a, b) => a.start.localeCompare(b.start));
    for (const b of brks) {
      if (!b.start || !b.end || b.end <= b.start) return (err.textContent = "Give each break a start and a later end, or remove it.");
      if (b.start < v.start || b.end > v.end) return (err.textContent = "Breaks must be inside the class times (" + v.start + "–" + v.end + ").");
    }
    for (let i = 1; i < brks.length; i++) if (brks[i].start < brks[i - 1].end) return (err.textContent = "Two breaks overlap. Change one of them.");
    if (!v.startDate) return (err.textContent = "Choose the first day.");
    if (v.endDate && v.endDate < v.startDate) return (err.textContent = "The last day is before the first day.");
    const schedule = { day: picked[0], start: v.start, end: v.end, breaks: brks, recurrence: { type: "weekly", interval: Number(v.interval) || 1, weekdays: picked, monthDays: [], startDate: v.startDate, endDate: v.endDate || "", anchorDate: v.startDate, onceDate: "" } };
    try {
      const id = await rpc("nisia_save_class", { p_org: S.org, p_title: v.title.trim(), p_tutor: v.tutor, p_schedule: schedule, p_course: v.course, p_room: v.room || null, p_enrolments: chosen, p_id: c ? c.id : null });
      /* Learners taken off the class: removed here, under the college's own rules. */
      const gone = c ? c.learners.map((l) => l.enrolment_id).filter((x) => !chosen.includes(x)) : [];
      if (gone.length) { const { error } = await db.from("class_learners").delete().eq("class_id", id).in("enrolment_id", gone); if (error) throw new Error(error.message); }
      hit(c ? "class.edit" : "class.new"); closeModal(); toast(c ? "Class saved. Symi and Evia follow on their next sync." : "Class created. It’s in the tutor’s Symi and the learners’ Evia."); classesPage();
    } catch (x) { err.textContent = x.message; }
  }); };
  const end = m.querySelector("#endClass");
  if (end) end.onclick = () => { if (!confirm("End " + c.title + "? It leaves Symi and the learners’ Evia. Its registers and attendance are kept.")) return;
    busy(end, "Ending…", async () => { try { await rpc("nisia_archive_class", { p_id: c.id }); hit("class.end"); closeModal(); toast("Class ended"); classesPage(); } catch (x) { err.textContent = x.message; } }); };
}

/* ---------- Master admin: colleges ---------- */
async function colleges() {
  shell('<p class="loading">Loading colleges…</p>');
  let list;
  try { list = await rpc("nisia_admin_colleges"); } catch (e) { shell('<p class="err">' + esc(e.message) + '</p>'); return; }
  const test = list.find((c) => c.is_test);
  list = list.filter((c) => !c.is_test);
  const sold = list.reduce((n, c) => n + c.seats, 0), used = list.reduce((n, c) => n + c.seats_used, 0), learners = list.reduce((n, c) => n + c.learners, 0);
  shell(
    '<div class="topbar"><div><div class="label">Master admin</div><h1>Colleges</h1></div><div class="actions"><button class="btn primary" type="button" id="new">' + ICON.plus + 'New college</button></div></div>' +
    '<section class="stats" aria-label="Summary" style="grid-template-columns:repeat(4,minmax(0,1fr))">' +
      '<div class="stat"><span class="label">Colleges</span><span class="big num">' + list.length + '</span><span class="sub">' + list.filter((c) => c.status === "active").length + ' active</span></div>' +
      '<div class="stat"><span class="label">Seats sold</span><span class="big num">' + sold + '</span><span class="sub">across all licences</span></div>' +
      '<div class="stat"><span class="label">Seats in use</span><span class="big num">' + used + '</span><span class="sub">' + (sold ? Math.round(used / sold * 100) : 0) + '% of seats sold</span></div>' +
      '<div class="stat"><span class="label">Learners</span><span class="big num">' + learners + '</span><span class="sub">on Evia Portal</span></div></section>' +
    '<div class="table-wrap"><table><thead><tr><th>College</th><th>Contact</th><th>Seats</th><th>Staff</th><th>Licence ends</th><th>Status</th></tr></thead><tbody>' +
    (list.length ? list.map((c) => '<tr data-id="' + c.id + '" tabindex="0"><td><div class="person">' + avatar(c.name) + '<b>' + esc(c.name) + '</b></div></td><td class="small">' + esc(c.contact_name || "") + (c.contact_email ? '<br><span class="muted">' + esc(c.contact_email) + '</span>' : "") + '</td>' +
      '<td style="min-width:170px"><div class="pbar-row"><div class="pbar" style="flex:1"><div class="fill" style="width:' + (c.seats ? Math.min(100, c.seats_used / c.seats * 100) : 0) + '%;background:' + (c.seats && c.seats_used >= c.seats ? "var(--bad)" : "var(--accent)") + '"></div></div><span class="num">' + c.seats_used + ' / ' + c.seats + '</span></div></td>' +
      '<td class="num">' + c.staff + '</td><td class="small">' + (c.licence_ends ? esc(ukDate(c.licence_ends)) : '<span class="muted">Not set</span>') + '</td><td>' + (c.status === "active" ? '<span class="pill good">Active</span>' : '<span class="pill bad">Suspended</span>') + '</td></tr>').join("")
      : '<tr class="static"><td colspan="6" class="empty">No colleges yet. Add the first one.</td></tr>') + '</tbody></table></div>' +
    '<section class="panel test-panel" id="testPanel" aria-label="Testing"></section>');
  testPanel(test);
  root.querySelector("#new").onclick = newCollege;
  root.querySelectorAll("tr[data-id]").forEach((r) => r.onclick = () => editCollege(list.find((c) => c.id === r.dataset.id)));
}
/* ---------- Testing: the master admin's test college ----------
   Fake accounts for every role in a college of their own ("Evia Test College"), so each app can be tried the way
   it's really used, without touching a real college. The staff accounts are ordinary ones: a password and an
   authenticator, set up once from an invite. Their emails are the master admin's with a +tag, so anything Evia Portal
   sends them lands in the master admin's inbox. The test learner connects Evia with a pairing code. */
const TEST_ROLES = { admin: ["College admin", "Portal", () => TEST_PORTAL], quality: ["Quality", "Portal", () => TEST_PORTAL], assessor: ["Assessor", "Milos", () => MILOS], tutor: ["Tutor", "Symi", () => SYMI], employer: ["Employer", "Paros", () => PAROS] };
async function testPanel(test) {
  const box = root.querySelector("#testPanel"); if (!box) return;
  const head = '<div class="panel-head"><div><h2>Test college</h2><span class="small muted">Fake accounts for every role, to try each app as it’s really used. Real colleges aren’t touched.</span></div></div>';
  if (!test) {
    box.innerHTML = head + '<p class="hint">Makes “Evia Test College” with a test learner on Bricklaying, then you set up a test college admin, assessor, tutor, quality person and employer.</p><div class="row-actions"><button class="btn primary" id="tcMake">Set up the test college</button></div>';
    box.querySelector("#tcMake").onclick = (e) => busy(e.target, "Setting up…", async () => { try { await call("nisia-admin", { action: "test_college" }); colleges(); } catch (x) { toast(x.message); } });
    return;
  }
  box.innerHTML = head + '<p class="loading">Checking the test accounts…</p>';
  let t;
  try { t = await call("nisia-admin", { action: "test_college" }); } catch (x) { box.innerHTML = head + '<p class="err">' + esc(x.message) + '</p>'; return; }
  const row = (a) => { const [title, app] = TEST_ROLES[a.role];
    return '<tr class="static"><td><b>' + esc(title) + '</b><br><span class="small muted">' + esc(a.email) + '</span></td><td>' + esc(app) + '</td><td>' +
      (a.joined ? '<span class="pill good">Ready</span>' : a.invited ? '<span class="pill warn">Invite waiting</span>' : '<span class="pill idle">Not set up</span>') + '</td><td><div class="row-actions" style="justify-content:flex-end">' +
      (a.joined ? '<a class="btn" href="' + esc(TEST_ROLES[a.role][2]()) + '" target="_blank" rel="noopener">Open ' + esc(app) + '</a><button class="btn ghost" data-phone="' + a.role + '">On a phone</button>'
        : '<button class="btn primary" data-setup="' + a.role + '">' + (a.invited ? "New invite" : "Set up") + '</button>') + '</div></td></tr>'; };
  box.innerHTML = head +
    '<div class="table-wrap"><table><thead><tr><th>Account</th><th>App</th><th>Status</th><th></th></tr></thead><tbody>' + t.accounts.map(row).join("") +
    '<tr class="static"><td><b>Learner</b><br><span class="small muted">Test Learner · Bricklaying</span></td><td>Evia</td><td><span class="pill good">Ready</span></td><td><div class="row-actions" style="justify-content:flex-end"><button class="btn primary" id="tcPair">Connect Evia</button></div></td></tr>' +
    '</tbody></table></div>' +
    '<div class="row-actions" style="justify-content:space-between;margin-top:10px"><span class="small muted">Sign in as each one with its email, the password you chose and your authenticator app. Test accounts show a red “Test account” badge.</span><button class="btn" id="tcOpen">Open the test college here</button></div>';
  box.querySelectorAll("[data-setup]").forEach((b) => b.onclick = () => busy(b, "Making an invite…", async () => {
    try { const r = await call("nisia-admin", { action: "test_invite", role: b.dataset.setup }); testInvite(b.dataset.setup, r); testPanel(test); } catch (x) { toast(x.message); }
  }));
  box.querySelectorAll("[data-phone]").forEach((b) => b.onclick = () => { const [title, app, url] = TEST_ROLES[b.dataset.phone], u = url();
    modal(app + " on a phone", '<div style="display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center"><div style="width:220px">' + qrSvg(u, 5) + '</div><p class="hint">Scan with the phone’s camera, sign in as the test ' + esc(title.toLowerCase()) + ', then add it to the home screen to install it.</p>' + linkBox(u) + '</div>'); });
  box.querySelector("#tcPair").onclick = () => pairing({ learner_id: t.learner_id, name: "Test Learner", paired: true });
  box.querySelector("#tcOpen").onclick = () => { S.org = t.organisation_id; S.data = null; S.page = "overview"; render(); };
}
function testInvite(role, r) {
  const [title, app, url] = TEST_ROLES[role], link = url() + "#invite=" + r.invite_code;
  modal("Set up the test " + title.toLowerCase(),
    '<div style="display:flex;flex-direction:column;gap:12px"><ol class="hint" style="margin:0;padding-left:20px;line-height:1.6">' +
    '<li>Open the invite in ' + esc(app) + ' (here, or scan the code with your phone).</li><li>Name: anything. Choose a password and keep it somewhere safe.</li>' +
    '<li>Sign in as <b>' + esc(r.email) + '</b>, then add it to your authenticator app. It shows as a separate account there.</li></ol>' +
    '<div class="row-actions"><a class="btn primary" href="' + esc(link) + '" target="_blank" rel="noopener">Open in ' + esc(app) + '</a></div>' +
    '<div style="width:200px;align-self:center">' + qrSvg(link, 4) + '</div>' + linkBox(link) + '</div>');
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
      modal(d.name + " is set up", '<div style="display:flex;flex-direction:column;gap:12px"><p class="hint">Send this to ' + esc(d.admin_name || d.admin_email) + '. They choose a password, add Evia Portal to an authenticator app, and their college portal opens.</p>' + linkBox(inviteUrl(r.invite_code), d.admin_email, d.admin_name) + '</div>');
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

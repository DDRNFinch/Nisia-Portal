/* Nisia portal.
   Master admin (the developer): every college, its seats and licence; create colleges and invite their admins.
   College portal (college admins, and quality staff read-only): seats, learners and staff; add learners, invite staff,
   and show an apprentice's Evia pairing code. Assessors and tutors see their own learners here and work in Milos. */
import { db, call, rpc, me, signOut, COURSES, courseName, esc, ukDate, ago, qrSvg } from "../../packages/core/nisia.js";
import { auth } from "../../packages/core/signin.js";

const root = document.getElementById("app");
const BASE = location.origin + location.pathname;
const MILOS = new URL("milos/", BASE.replace(/apps\/nisia-web\/$/, "")).href;
let who = null, view = { kind: "home" };

const start = () => auth(root, { title: "Nisia", subtitle: "For colleges and training providers", onReady: home });
db.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") start(); });
start();

/* ---------- Helpers ---------- */
function toast(msg) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function sheet(title, body, onOpen) {
  closeSheet();
  const o = document.createElement("div"); o.className = "overlay"; o.id = "sheet";
  o.innerHTML = '<section class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="sheet-head"><h2>' + esc(title) + '</h2><button class="x" aria-label="Close">×</button></div>' + body + '</section>';
  o.addEventListener("click", (e) => { if (e.target === o) closeSheet(); });
  o.querySelector(".x").onclick = closeSheet;
  document.body.appendChild(o);
  if (onOpen) onOpen(o.querySelector(".sheet"));
  return o.querySelector(".sheet");
}
const closeSheet = () => { const s = document.getElementById("sheet"); if (s) s.remove(); };
const busy = async (btn, label, fn) => { const was = btn.textContent; btn.disabled = true; btn.textContent = label; try { return await fn(); } finally { btn.disabled = false; btn.textContent = was; } };
const formData = (f) => Object.fromEntries(new FormData(f).entries());
function linkBox(url, email, who_) {
  const subject = encodeURIComponent("Your Nisia invite");
  const bodyText = encodeURIComponent("Hi" + (who_ ? " " + who_ : "") + ",\n\nYou’ve been invited to Nisia. Open this link to set up your sign-in (it works once, for 14 days):\n\n" + url + "\n\nYou’ll need an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator.");
  return '<div class="linkbox"><input readonly value="' + esc(url) + '" aria-label="Invite link"><button class="btn" type="button" data-copy="' + esc(url) + '">Copy</button></div>' +
    (email ? '<a class="btn wide" href="mailto:' + esc(email) + '?subject=' + subject + '&body=' + bodyText + '">Email it to ' + esc(email) + '</a>' : "") +
    '<p class="small muted">Only shown once. Send it to them; it works once and lasts 14 days.</p>';
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copy]"); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); toast("Copied"); } catch { toast("Select the link and copy it"); }
});
const bar = (used, total) => '<div class="bar' + (total && used >= total ? " full" : "") + '"><i style="width:' + (total ? Math.min(100, Math.round(used / total * 100)) : 0) + '%"></i></div>';
const inviteUrl = (code) => BASE + "#invite=" + code;

function shell(title, sub, body, extra) {
  root.innerHTML = '<div class="shell"><header class="top"><div class="brand"><span class="av" aria-hidden="true"><i></i><i></i></span><div>' + esc(title) + '<small>' + esc(sub) + '</small></div></div><span class="spacer"></span>' +
    (extra || "") + '<button class="btn ghost" id="signout">Sign out</button></header><main class="main" id="main">' + body + '</main></div>';
  root.querySelector("#signout").onclick = () => signOut();
}

/* ---------- Where to go after signing in ---------- */
async function home() {
  try { who = await me(); } catch (e) { root.innerHTML = '<div class="auth"><p class="err">' + esc(e.message) + '</p></div>'; return; }
  const orgs = who.memberships || [];
  if (who.platform_admin && view.kind !== "college") return adminHome();
  if (view.kind === "college") return collegeHome(view.org);
  if (orgs.length === 1) return collegeHome(orgs[0].organisation_id);
  if (orgs.length > 1) return pickCollege(orgs);
  shell("Nisia", who.name || "", '<div class="card"><h2>You’re not part of a college yet</h2><p class="muted">Ask your college for an invite link.</p></div>');
}
function pickCollege(orgs) {
  shell("Nisia", who.name || "", '<h1>Your colleges</h1><div class="card list">' + orgs.map((o) =>
    '<button class="item" style="--cols:1" data-org="' + o.organisation_id + '"><span class="name-cell"><span class="name">' + esc(o.organisation) + '</span><span class="sub">' + esc(o.roles.join(", ")) + '</span></span><span></span><span class="chev">›</span></button>').join("") + '</div>');
  root.querySelectorAll("[data-org]").forEach((b) => b.onclick = () => { view = { kind: "college", org: b.dataset.org }; home(); });
}

/* ---------- Master admin ---------- */
async function adminHome() {
  shell("Nisia", "Master admin", '<p class="muted">Loading…</p>', (who.memberships || []).length ? '<button class="btn ghost" id="mine">My college view</button>' : "");
  const m = root.querySelector("#mine"); if (m) m.onclick = () => { view = { kind: "college", org: who.memberships[0].organisation_id }; home(); };
  let colleges;
  try { colleges = await rpc("nisia_admin_colleges"); } catch (e) { root.querySelector("#main").innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
  const sold = colleges.reduce((n, c) => n + c.seats, 0), used = colleges.reduce((n, c) => n + c.seats_used, 0), learners = colleges.reduce((n, c) => n + c.learners, 0);
  root.querySelector("#main").innerHTML =
    '<div class="between"><div><p class="label">Master admin</p><h1>Colleges</h1></div><button class="btn primary" id="new">+ New college</button></div>' +
    '<div class="grid3">' +
      '<div class="card stat"><b>' + colleges.length + '</b><span>colleges</span></div>' +
      '<div class="card stat"><b>' + used + ' <small class="muted" style="font-size:16px">/ ' + sold + '</small></b><span>seats in use / sold</span></div>' +
      '<div class="card stat"><b>' + learners + '</b><span>learners</span></div>' +
    '</div>' +
    '<div class="card list"><div class="item head" style="--cols:3"><span>College</span><span>Seats</span><span>Licence</span><span>Status</span><span></span></div>' +
    (colleges.length ? colleges.map((c) =>
      '<button class="item" style="--cols:3" data-id="' + c.id + '"><span class="name-cell"><span class="name">' + esc(c.name) + '</span><span class="sub">' + esc([c.contact_name, c.contact_email].filter(Boolean).join(" · ")) + ' · ' + c.staff + ' staff</span></span>' +
      '<span><span class="small">' + c.seats_used + ' of ' + c.seats + '</span>' + bar(c.seats_used, c.seats) + '</span>' +
      '<span class="small">' + (c.licence_ends ? "Ends " + esc(ukDate(c.licence_ends)) : '<span class="muted">No end date</span>') + '</span>' +
      '<span class="keep">' + (c.status === "active" ? '<span class="pill good">Active</span>' : '<span class="pill bad">Suspended</span>') + '</span><span class="chev">›</span></button>').join("")
      : '<p class="empty">No colleges yet. Add the first one.</p>') + '</div>';
  root.querySelector("#new").onclick = newCollege;
  root.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => editCollege(colleges.find((c) => c.id === b.dataset.id)));
}
function newCollege() {
  const s = sheet("New college",
    '<form class="grid2" id="f" novalidate style="gap:14px">' +
    '<label class="field" style="grid-column:1/-1">College or provider name<input name="name" required></label>' +
    '<label class="field">Seats paid for<input name="seats" type="number" min="0" value="30"></label>' +
    '<label class="field">Licence ends<input name="licence_ends" type="date"></label>' +
    '<label class="field">College admin’s name<input name="admin_name" autocomplete="off"></label>' +
    '<label class="field">College admin’s email<input name="admin_email" type="email" autocomplete="off"></label>' +
    '<label class="field" style="grid-column:1/-1">Notes (only you see these)<textarea name="notes" placeholder="e.g. invoice number, what they bought"></textarea></label>' +
    '<p class="err" style="grid-column:1/-1"></p><button class="btn primary wide" style="grid-column:1/-1" type="submit">Create college and invite its admin</button></form>');
  const f = s.querySelector("#f");
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Creating…", async () => {
    try {
      const d = formData(f), r = await call("nisia-admin", { action: "create_college", ...d });
      sheet(d.name + " is set up", '<div class="note">Send this link to ' + esc(d.admin_name || d.admin_email) + '. They choose a password, add Nisia to their authenticator app, and their college portal opens.</div>' + linkBox(inviteUrl(r.invite_code), d.admin_email, d.admin_name));
      adminHome();
    } catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}
function editCollege(c) {
  const s = sheet(c.name,
    '<div class="grid2"><div class="card flat stat"><b>' + c.seats_used + ' / ' + c.seats + '</b><span>seats used</span></div><div class="card flat stat"><b>' + c.staff + '</b><span>staff · ' + c.learners + ' learners</span></div></div>' +
    '<form class="grid2" id="f" style="gap:14px">' +
    '<label class="field">Seats paid for<input name="seats" type="number" min="0" value="' + c.seats + '"><small>Can’t go below the ' + c.seats_used + ' in use.</small></label>' +
    '<label class="field">Licence ends<input name="licence_ends" type="date" value="' + esc(c.licence_ends || "") + '"></label>' +
    '<label class="field">Contact name<input name="contact_name" value="' + esc(c.contact_name || "") + '"></label>' +
    '<label class="field">Contact email<input name="contact_email" type="email" value="' + esc(c.contact_email || "") + '"></label>' +
    '<label class="field" style="grid-column:1/-1">Status<select name="status"><option value="active"' + (c.status === "active" ? " selected" : "") + '>Active</option><option value="suspended"' + (c.status === "suspended" ? " selected" : "") + '>Suspended (no new learners)</option></select></label>' +
    '<p class="err" style="grid-column:1/-1"></p><button class="btn primary wide" style="grid-column:1/-1" type="submit">Save</button></form>' +
    '<div class="between"><button class="btn ghost" id="inv">Invite another college admin</button><button class="btn ghost" id="open">Open their portal</button></div>');
  const f = s.querySelector("#f");
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Saving…", async () => {
    const d = formData(f);
    if (parseInt(d.seats) < c.seats_used) { f.querySelector(".err").textContent = c.seats_used + " seats are in use, so it can’t be fewer than that."; return; }
    try { await call("nisia-admin", { action: "update_college", organisation_id: c.id, ...d }); closeSheet(); toast("Saved"); adminHome(); }
    catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
  s.querySelector("#inv").onclick = () => inviteForm(c.id, "invite_college_admin", c.name);
  s.querySelector("#open").onclick = () => { closeSheet(); view = { kind: "college", org: c.id }; collegeHome(c.id); };
}

/* ---------- College portal ---------- */
let tab = "learners";
async function collegeHome(org) {
  const mine = (who.memberships || []).find((m) => m.organisation_id === org) || { roles: who.platform_admin ? ["admin"] : [] };
  const isAdmin = mine.roles.includes("admin") || who.platform_admin, isQuality = mine.roles.includes("quality");
  const staffOnly = !isAdmin && !isQuality;
  shell(mine.organisation || "College", isAdmin ? "College portal" : staffOnly ? "Your learners" : "Quality", '<p class="muted">Loading…</p>',
    (who.platform_admin ? '<button class="btn ghost" id="back">Master admin</button>' : "") + (staffOnly || mine.roles.includes("assessor") ? '<a class="btn ghost" href="' + esc(MILOS) + '">Open Milos</a>' : ""));
  const back = root.querySelector("#back"); if (back) back.onclick = () => { view = { kind: "home" }; adminHome(); };
  let sum = null, learners = [], staff = [];
  try {
    [sum, learners, staff] = await Promise.all([
      isAdmin || isQuality ? rpc("nisia_college_summary", { p_org: org }) : null,
      rpc("nisia_college_learners", { p_org: org }),
      isAdmin ? rpc("nisia_college_staff", { p_org: org }) : [],
    ]);
  } catch (e) { root.querySelector("#main").innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
  if (sum) root.querySelector(".brand div").firstChild.textContent = sum.name;
  const main = root.querySelector("#main");
  main.innerHTML =
    (sum ? '<div class="grid3">' +
      '<div class="card stat"><b>' + sum.seats_used + ' <small class="muted" style="font-size:16px">/ ' + sum.seats + '</small></b><span>seats in use</span>' + bar(sum.seats_used, sum.seats) + '</div>' +
      '<div class="card stat"><b>' + learners.filter((l) => l.paired).length + '</b><span>of ' + learners.length + ' learners using Evia</span></div>' +
      '<div class="card stat"><b>' + learners.filter((l) => !l.last_activity || Date.now() - Date.parse(l.last_activity) > 14 * 864e5).length + '</b><span>quiet for 14+ days</span></div></div>' : "") +
    (sum && sum.status !== "active" ? '<p class="err">This college’s licence is suspended. Existing learners carry on; new ones can’t be added.</p>' : "") +
    (isAdmin ? '<div class="row" role="tablist"><button class="btn' + (tab === "learners" ? " primary" : "") + '" data-tab="learners">Learners</button><button class="btn' + (tab === "staff" ? " primary" : "") + '" data-tab="staff">Staff</button></div>' : "") +
    '<div id="tabbody"></div>';
  main.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.tab; collegeHome(org); });
  const body = main.querySelector("#tabbody");
  if (isAdmin && tab === "staff") return staffTab(body, org, staff);
  learnersTab(body, org, learners, staff, isAdmin, sum);
}

function learnersTab(body, org, learners, staff, isAdmin, sum) {
  body.innerHTML = '<div class="between"><h2>Learners</h2>' + (isAdmin ? '<button class="btn primary" id="add"' + (sum && (sum.seats_used >= sum.seats || sum.status !== "active") ? " disabled" : "") + '>+ Add learner</button>' : "") + '</div>' +
    (isAdmin && sum && sum.seats_used >= sum.seats ? '<p class="note">All ' + sum.seats + ' seats are in use. Contact Nisia to add more.</p>' : "") +
    '<div class="card list"><div class="item head" style="--cols:4"><span>Learner</span><span>Assessor</span><span>Evia</span><span>Evidence · hours</span><span>Last active</span><span></span></div>' +
    (learners.length ? learners.map((l) =>
      '<button class="item" style="--cols:4" data-id="' + l.learner_id + '"><span class="name-cell"><span class="name">' + esc(l.name) + '</span><span class="sub">' + esc(courseName(l.course_code)) + (l.employer_name ? " · " + esc(l.employer_name) : "") + '</span></span>' +
      '<span class="small">' + esc((l.assessors || []).map((a) => a.name).join(", ") || "—") + '</span>' +
      '<span class="keep">' + (l.paired ? '<span class="pill good">Connected</span>' : '<span class="pill warn">Not yet</span>') + '</span>' +
      '<span class="small">' + l.evidence + ' · ' + Math.round(Number(l.otj_hours) || 0) + ' h</span>' +
      '<span class="small">' + esc(ago(l.last_activity)) + '</span><span class="chev">›</span></button>').join("")
      : '<p class="empty">' + (isAdmin ? "No learners yet. Add your first apprentice." : "No learners are assigned to you yet.") + '</p>') + '</div>';
  const add = body.querySelector("#add"); if (add) add.onclick = () => addLearner(org, staff);
  body.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => learnerSheet(org, learners.find((l) => l.learner_id === b.dataset.id), staff, isAdmin));
}

function staffPicker(staff, chosen) {
  const people = staff.filter((s) => s.active && (s.roles.includes("assessor") || s.roles.includes("tutor")));
  if (!people.length) return '<p class="small muted">Invite an assessor or tutor on the Staff tab first; you can assign them later.</p>';
  return '<div class="checks">' + people.map((s) => '<label class="check"><input type="checkbox" name="staff" value="' + s.member_id + '"' + (chosen.includes(s.member_id) ? " checked" : "") + '> ' + esc(s.name || s.email) + ' <span class="small muted">' + esc(s.roles.filter((r) => r !== "admin").join(", ")) + '</span></label>').join("") + '</div>';
}
function addLearner(org, staff) {
  const s = sheet("Add a learner",
    '<form class="grid2" id="f" novalidate style="gap:14px">' +
    '<label class="field" style="grid-column:1/-1">Full name<input name="name" autocomplete="off" required></label>' +
    '<label class="field" style="grid-column:1/-1">Course<select name="course">' + COURSES.map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join("") + '</select></label>' +
    '<label class="field">Start date<input name="start_date" type="date" required></label>' +
    '<label class="field">Planned end date<input name="end_date" type="date" required></label>' +
    '<label class="field">Planned off-the-job hours<input name="planned_otj_hours" type="number" min="0" placeholder="e.g. 416"></label>' +
    '<label class="field">Learner’s email <small>(optional)</small><input name="email" type="email" autocomplete="off"></label>' +
    '<label class="field">Employer<input name="employer_name" autocomplete="off"></label>' +
    '<label class="field">Employer contact<input name="employer_contact_name" autocomplete="off"></label>' +
    '<label class="field" style="grid-column:1/-1">Employer contact’s email<input name="employer_contact_email" type="email" autocomplete="off"></label>' +
    '<div class="field" style="grid-column:1/-1">Assessor and tutor' + staffPicker(staff, []) + '</div>' +
    '<p class="err" style="grid-column:1/-1"></p><button class="btn primary wide" style="grid-column:1/-1" type="submit">Add learner (uses 1 seat)</button></form>');
  const f = s.querySelector("#f");
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button[type=submit]"), "Adding…", async () => {
    try {
      const d = formData(f); delete d.staff;
      const r = await call("nisia-admin", { action: "add_learner", organisation_id: org, ...d, staff_member_ids: [...f.querySelectorAll("[name=staff]:checked")].map((x) => x.value) });
      toast(d.name + " added");
      await collegeHome(org);
      pairingSheet({ learner_id: r.learner_id, name: d.name });
    } catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}
function learnerSheet(org, l, staff, isAdmin) {
  const rows = [["Course", courseName(l.course_code)], ["Dates", [ukDate(l.start_date), ukDate(l.end_date)].filter(Boolean).join(" to ")], ["Employer", l.employer_name], ["Planned off-the-job hours", l.planned_otj_hours],
    ["Evidence", l.evidence], ["Off-the-job hours logged", Math.round(Number(l.otj_hours) || 0)], ["Last active", ago(l.last_activity)], ["Email", /nisia\.invalid$/.test(l.email) ? "" : l.email]].filter((r) => r[1] !== "" && r[1] != null);
  const s = sheet(l.name,
    '<div class="card flat">' + rows.map((r) => '<div class="between small" style="padding:6px 0;border-top:1px solid var(--line)"><span class="muted">' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>').join("") + '</div>' +
    '<button class="btn primary wide" id="pair">' + (l.paired ? "Connect Evia on a new phone" : "Connect Evia") + '</button>' +
    (isAdmin ? '<form id="f" class="box" style="display:flex;flex-direction:column;gap:10px"><div class="field">Assessor and tutor' + staffPicker(staff, (l.assessors || []).map((a) => a.member_id)) + '</div><button class="btn" type="submit">Save staff</button></form>' : ""));
  s.querySelector("#pair").onclick = () => pairingSheet(l);
  const f = s.querySelector("#f");
  if (f) f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button"), "Saving…", async () => {
    try { await call("nisia-admin", { action: "assign_staff", learner_id: l.learner_id, member_ids: [...f.querySelectorAll("[name=staff]:checked")].map((x) => x.value) }); closeSheet(); toast("Saved"); collegeHome(org); }
    catch (x) { toast(x.message); }
  }); };
}
/* The pairing QR: the apprentice scans it in Evia (or types the code under it). */
async function pairingSheet(l) {
  const s = sheet("Connect " + (l.name || "").split(" ")[0] + "’s Evia", '<p class="muted">Getting a code…</p>');
  try {
    const r = await call("nisia-admin", { action: "pairing_code", learner_id: l.learner_id });
    const svg = qrSvg(r.qr);
    s.innerHTML = '<div class="sheet-head"><h2>Connect ' + esc((l.name || "").split(" ")[0]) + '’s Evia</h2><button class="x" aria-label="Close">×</button></div>' +
      '<p class="muted">In Evia they tap <b>Scan the QR code</b>, or type the code underneath.</p><div class="qr">' + svg + '</div>' +
      '<p class="code">' + esc(r.code.slice(0, 3) + "-" + r.code.slice(3)) + '</p><p class="small muted" style="text-align:center">Works once, for ' + r.expires_in_minutes + ' minutes.</p>';
    s.querySelector(".x").onclick = closeSheet;
  } catch (x) { s.innerHTML = '<p class="err">' + esc(x.message) + '</p>'; }
}

function staffTab(body, org, staff) {
  body.innerHTML = '<div class="between"><h2>Staff</h2><button class="btn primary" id="inv">+ Invite staff</button></div>' +
    '<div class="card list"><div class="item head" style="--cols:3"><span>Name</span><span>Roles</span><span>Learners</span><span>Status</span><span></span></div>' +
    (staff.length ? staff.map((s) =>
      '<button class="item" style="--cols:3" data-id="' + s.member_id + '"><span class="name-cell"><span class="name">' + esc(s.name || s.email) + '</span><span class="sub">' + esc(s.email) + '</span></span>' +
      '<span class="small">' + s.roles.map((r) => '<span class="pill accent">' + esc(r) + '</span>').join(" ") + '</span><span class="small">' + s.learners + '</span>' +
      '<span class="keep">' + (s.active ? '<span class="pill good">Active</span>' : '<span class="pill">Switched off</span>') + '</span><span class="chev">›</span></button>').join("") : '<p class="empty">No staff yet.</p>') + '</div>';
  body.querySelector("#inv").onclick = () => inviteForm(org, "invite_staff");
  body.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => {
    const s = staff.find((x) => x.member_id === b.dataset.id);
    const sh = sheet(s.name || s.email, '<p class="muted">' + esc(s.email) + ' · ' + esc(s.roles.join(", ")) + '</p><button class="btn ' + (s.active ? "danger" : "primary") + ' wide" id="t">' + (s.active ? "Switch off their access" : "Switch their access back on") + '</button>');
    sh.querySelector("#t").onclick = () => busy(sh.querySelector("#t"), "Saving…", async () => {
      try { await call("nisia-admin", { action: "set_staff_active", member_id: s.member_id, active: !s.active }); closeSheet(); collegeHome(org); } catch (x) { toast(x.message); }
    });
  });
}
function inviteForm(org, action, collegeName) {
  const admin = action === "invite_college_admin";
  const s = sheet(admin ? "Invite a college admin" + (collegeName ? " to " + collegeName : "") : "Invite staff",
    '<form class="box" id="f" novalidate style="display:flex;flex-direction:column;gap:14px">' +
    '<label class="field">Name<input name="name" autocomplete="off"></label><label class="field">Email<input name="email" type="email" autocomplete="off"></label>' +
    (admin ? "" : '<div class="field">Roles<div class="checks">' + [["assessor", "Assessor"], ["tutor", "Tutor"], ["admin", "College admin"], ["quality", "Quality (view only)"]].map(([v, t], i) => '<label class="check"><input type="checkbox" name="roles" value="' + v + '"' + (i === 0 ? " checked" : "") + '> ' + t + '</label>').join("") + '</div></div>') +
    '<p class="err"></p><button class="btn primary wide" type="submit">Create invite link</button></form>');
  const f = s.querySelector("#f");
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector("button"), "Creating…", async () => {
    try {
      const d = formData(f), roles = [...f.querySelectorAll("[name=roles]:checked")].map((x) => x.value);
      const r = await call("nisia-admin", { action, organisation_id: org, name: d.name, email: d.email, roles });
      sheet("Invite ready", linkBox(inviteUrl(r.invite_code), d.email, d.name));
    } catch (x) { f.querySelector(".err").textContent = x.message; }
  }); };
}

/* Portal browser test with a stand-in Supabase (so it runs without the internet): accept an invite, set up the
   authenticator, the master admin creates a college, then a college admin adds a learner and shows the Evia QR.
   Run: node tests/portal.test.mjs   (exit code 0 = passed) */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { standardsFake, tinyPdf } from "./standards-fake.mjs";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
}).listen(0);
const url = "http://localhost:" + server.address().port + "/apps/nisia-web/";
const STD = standardsFake(root);

const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + detail)); };

/* ---------- The stand-in Supabase ---------- */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (sub, aal) => b64({ alg: "HS256", typ: "JWT" }) + "." + b64({ sub, aal, amr: [{ method: aal === "aal2" ? "totp" : "password", timestamp: 1 }], role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated", session_id: "s1" }) + ".sig";
function fakeSupabase(persona) {
  const S = { factors: persona.factors || [], aal: "aal1", colleges: [], learners: [], staff: persona.staff || [], calls: [] };
  const user = () => ({ id: persona.id, aud: "authenticated", role: "authenticated", email: persona.email, factors: S.factors, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
  const session = () => ({ access_token: jwt(persona.id, S.aal), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: user() });
  return { S, async handle(route) {
    const req = route.request(), u = new URL(req.url()), p = u.pathname, body = req.postData() ? JSON.parse(req.postData()) : {};
    const json = (d, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    S.calls.push(p + (body.action ? ":" + body.action : ""));
    if (p === "/auth/v1/token") return body.password === persona.password ? json(session()) : json({ error: "invalid_grant", error_description: "Invalid login credentials", msg: "Invalid login credentials" }, 400);
    if (p === "/auth/v1/user") return json(user());
    if (p === "/auth/v1/recover") { S.recover = { body, redirect: u.searchParams.get("redirect_to") || body.redirect_to || "" }; return json({}); }
    if (p === "/rest/v1/rpc/nisia_redeem_reset") { if (body.p_code !== "ABCD1234EFGH5678") return json({ code: "P0001", message: "That reset link has expired or been used. Ask your college admin for a new one." }, 400); persona.password = body.p_password; S.redeemed = body; return json(persona.email); }
    if (p === "/rest/v1/rpc/nisia_password_reset_link") { S.resetFor = body.p_member; return json({ code: "ABCD1234EFGH5678", email: "m.ellis@brookfield.example", expires_at: new Date(Date.now() + 864e5).toISOString() }); }
    if (p === "/auth/v1/logout") return S.sessionGone ? json({ code: 403, error_code: "session_not_found", msg: "Session not found" }, 403) : route.fulfill({ status: 204 });
    if (p === "/auth/v1/factors") { S.factors = [{ id: "f1", factor_type: "totp", status: "unverified", friendly_name: "Nisia" }]; return json({ id: "f1", type: "totp", totp: { qr_code: "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg'/>", secret: "ABCDEF", uri: "otpauth://x" } }); }
    if (/\/auth\/v1\/factors\/f1$/.test(p) && req.method() === "DELETE") { S.factors = []; return json({ id: "f1" }); }
    if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
    if (/\/verify$/.test(p)) { if (body.code !== "123456") return json({ msg: "Invalid TOTP code entered" }, 422); S.aal = "aal2"; S.factors = [{ id: "f1", factor_type: "totp", status: "verified", friendly_name: "Nisia" }]; return json(session()); }
    if (p === "/rest/v1/rpc/nisia_me") return json({ user_id: persona.id, aal: S.aal, platform_admin: !!persona.platform, memberships: persona.memberships || [], name: persona.name });
    if (STD.handles(p)) { const a = STD.answer(p, body); return json(a.data, a.status); }
    if (p === "/rest/v1/rpc/nisia_admin_colleges") return json(S.colleges);
    if (p === "/rest/v1/rpc/nisia_college_summary") return json({ name: "Brookfield College", status: "active", seats: 2, seats_used: S.learners.length, licence_ends: "2027-07-31" });
    if (p === "/rest/v1/rpc/nisia_college_learners") return json(S.learners);
    /* Classes set up here: they become the tutor's registers in Symi. */
    if (p === "/rest/v1/rpc/nisia_classes") return json(S.classes || []);
    if (p === "/rest/v1/rpc/nisia_college_resources") return json((S.res || []).concat([{ id: "R1", kind: "slides", title: "Brick bonds deck", course_code: "bricklayer", unit: "Build solid walling", content: {}, url: null, shared_by: "Priya Shah", mine: false, can_remove: true, created_at: "2026-10-01T10:00:00Z" }]));
    if (p === "/rest/v1/rpc/nisia_share_resource") { S.res = (S.res || []).concat([{ id: "R2", kind: body.p_kind, title: body.p_title, course_code: body.p_course, unit: body.p_unit, url: body.p_url, shared_by: "Sarah Mitchell", can_remove: true, created_at: "2026-10-08T10:00:00Z" }]); S.shared = body; return json("R2"); }
    if (p === "/rest/v1/rpc/nisia_today") return json([
      { id: "T1", title: "L2 Bricklaying Tuesday", room: "Workshop 2", tutor: "Priya Shah", schedule: { start: "09:00", end: "16:00", recurrence: { type: "weekly", weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], startDate: "2020-01-01" } },
        session_status: "open", ksbs: [], learners: [
          { enrolment_id: "e1", name: "Callum Hughes", status: "present", late: false, checked_in_at: "2026-10-06T08:58:00Z" },
          { enrolment_id: "e2", name: "Amira Khan", status: "present", late: true, checked_in_at: "2026-10-06T09:20:00Z" },
          { enrolment_id: "e3", name: "Jordan Pike", status: null, off: "ill" },
          { enrolment_id: "e4", name: "Sam Lee", status: null }] },
      { id: "T2", title: "Plastering Friday", tutor: "Priya Shah", schedule: { start: "09:00", end: "15:00", recurrence: { type: "once", onceDate: "2001-01-01" } }, session_status: null, ksbs: [], learners: [] }]);
    if (p === "/rest/v1/rpc/nisia_save_class") { S.classes = S.classes || []; S.calls.push({ t: "save_class", body });
      const t = S.staff.find((x) => x.member_id === body.p_tutor) || {}, row = { id: body.p_id || "cls" + S.classes.length, title: body.p_title, course_code: body.p_course, room: body.p_room, schedule: body.p_schedule, managed: true,
        tutor_member_id: body.p_tutor, tutor: t.name || "", learners: body.p_enrolments.map((e) => ({ enrolment_id: e, name: (S.learners.find((l) => l.enrolment_id === e) || {}).name || "" })), sessions_done: 0, last_session: null };
      S.classes = S.classes.filter((c) => c.id !== row.id).concat([row]); return json(row.id); }
    if (p === "/rest/v1/rpc/nisia_add_to_class") { S.calls.push({ t: "add_to_class", body }); return json(null); }
    if (p === "/rest/v1/rpc/nisia_set_safeguarding") { S.dsl = body; return json(null); }
    if (p === "/rest/v1/rpc/nisia_college_staff") return json(S.staff);
    if (p === "/rest/v1/rpc/nisia_admin_usage") { S.usageDays = body.p_days; return json({ from: "2026-09-01",
      apps: [{ app: "evia", device_days: 120, connected: 90 }, { app: "milos", device_days: 30, connected: 30 }],
      features: [{ app: "evia", feature: "saved.evidence", uses: 60, device_days: 48 }, { app: "evia", feature: "teach.lesson", uses: 140, device_days: 70 }, { app: "evia", feature: "evidence.guide", uses: 40, device_days: 36 }, { app: "milos", feature: "tab.assess", uses: 50, device_days: 25 }],
      weeks: [0, 1, 2, 3, 4, 5].map((i) => ({ week: new Date(Date.UTC(2026, 7, 17 + i * 7)).toISOString().slice(0, 10), app: "evia", device_days: 10 + i * 4 })),
      platforms: [{ app: "evia", platform: "ios-app", version: "evia7-v211", device_days: 80 }, { app: "evia", platform: "android-app", version: "evia7-v210", device_days: 40 }],
      courses: [{ course: "bricklayer", device_days: 70 }, { course: "site", device_days: 50 }] }); }
    if (p === "/rest/v1/rpc/nisia_college_impact") { const now = body.p_to > new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10); (S.impact = S.impact || []).push(body);
      return json(now ? { from: body.p_from, to: body.p_to, weeks: 12.9, learners: 20, engaged: 17, evidence: 180, assessed: 150, accepted: 132, turnaround_days: 2.5, waiting_over_7_days: 3, hours: 1210, planned_hours: 1300, reviews: 18, reviews_overdue: 1, attendance: 240, attendance_minutes: 43200, devices: 900, evia: { "saved.evidence": 180, "saved.lessons-done": 310, "saved.tests": 75, "chat.question": 420 } }
        : { from: body.p_from, to: body.p_to, weeks: 12.9, learners: 18, engaged: 12, evidence: 120, assessed: 110, accepted: 90, turnaround_days: 4.1, waiting_over_7_days: 9, hours: 900, planned_hours: 1170, reviews: 14, reviews_overdue: 4, attendance: 200, attendance_minutes: 36000, devices: 600, evia: { "saved.evidence": 120 } }); }
    if (p === "/rest/v1/reviews") {
      const sig = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      const content = { facts: { learner: "Callum Hughes", course: "Bricklayer", employer: "Hughes & Sons", reviewNo: 1, start: "2025-09-01", end: "2027-08-31", periodStart: "2025-09-01", periodEnd: "2025-11-24", timePct: 12, ksb: { met: 5, total: 59, pct: 8 }, evidencePeriod: 3, evidenceTotal: 3, otj: { total: 40, period: 40, expected: 38 }, maths: { on: false }, english: { on: false } },
        answers: { date: "2025-11-24", method: "In person", attendees: { apprentice: true, employer: true, assessor: true }, previous: [], progressRag: "On track", progressComment: "Strong start.", otjConfirmed: true, feelsSafe: "Yes", knowsReporting: "Yes", topicDiscussed: "Prevent", hsStatus: "No incidents or concerns", supportInPlace: "Not needed", changes: "None", iagGiven: "Yes", epaReady: "Too early", nextReview: "2026-02-16", overallRag: "On track" },
        targets: [{ title: "Finish Mixing mortar", how: "Photos and write-up", due: "2026-01-10" }], hash: "ab".repeat(32),
        signatures: { apprentice: { name: "Callum Hughes", at: "2025-11-24T10:00:00Z", image: sig }, employer: { name: "Dave Hughes", at: "2025-11-24T10:01:00Z", image: sig }, assessor: { name: "Mark Ellis", at: "2025-11-24T10:02:00Z", image: sig } } };
      const one = { id: "R1", enrolment_id: "e0", reviewed_at: "2025-11-24T12:00:00Z", content, overall: "On track" };
      return /vnd\.pgrst\.object/.test(req.headers()["accept"] || "") ? json(one) : json([one]);
    }
    if (p === "/rest/v1/evidence_files") return json([{ storage_path: "o1/ev1/a.jpeg", mime_type: "image/jpeg" }]);
    if (p === "/storage/v1/object/sign/evidence") return json(body.paths.map((x) => ({ path: x, signedURL: "/object/sign/evidence/" + x + "?token=t", error: null })));
    if (p.startsWith("/storage/v1/object/sign/evidence/")) return route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10' fill='#c96'/></svg>" });
    if (p === "/rest/v1/rpc/nisia_attendance_report") { S.attReport = body; return json([
      { enrolment_id: "e0", name: "Callum J Hughes", course: "Bricklayer", employer: "Build Co", sessions: 10, present: 7, late: 2, with_reason: 1, no_reason: 2, pct: 70, below_target: true, run: 2, last_absent: "2026-09-29" },
      { enrolment_id: "e9", name: "Amira Khan", course: "Bricklayer", employer: "", sessions: 10, present: 10, late: 0, with_reason: 0, no_reason: 0, pct: 100, below_target: false, run: 0, last_absent: null }]); }
    if (p === "/rest/v1/attendance_settings") {
      if (req.method() === "GET") { const row = S.attSet || null; return /object/.test(req.headers()["accept"] || "") ? (row ? json(row) : json({ code: "PGRST116", message: "none" }, 406)) : json(row ? [row] : []); }
      if (req.method() === "POST") { S.attSet = Array.isArray(body) ? body[0] : body; return json([S.attSet], 201); }
    }
    if (p === "/rest/v1/rpc/nisia_college_activity") return json([{ week_start: "2026-09-21", evidence: 3, hours: 6 }]);
    if (p === "/rest/v1/rpc/nisia_learner_detail") return json({ snapshot: { ksb: { met: 12, total: 59, pct: 20 }, units: [{ name: "Unit 201", total: 10, missing: ["K1", "K2"] }], otj: { total: 14 } }, snapshot_at: new Date().toISOString(), evia_targets: [{ title: "Upload the cavity wall photos", due: "2026-10-10" }], targets: [], reviews: [], evidence: [{ kind: "evidence", id: "ev1", title: "Laid a cavity wall", type: "photo", at: new Date().toISOString(), ksbs: ["K1", "S2"], text: "Ties every 450 mm.", files: 1, photos_expected: 1 }], hours: [{ kind: "hours", title: "Teach me: cavity walls", hours: 1.5, at: new Date().toISOString().slice(0, 10) }], weekly: [0, 0, 1, 2, 0, 3, 1, 0, 2, 4, 1, 1] });
    if (p === "/functions/v1/nisia-setup" && body.action === "accept") return String(body.code).toUpperCase().replace(/[^A-Z0-9]/g, "") === "GOODINVITECODE01" ? json({ ok: true, email: persona.email }) : json({ error: "This invite has already been used, or doesn’t exist. Ask for a new one." }, 400);
    if (p === "/functions/v1/nisia-admin") {
      if (body.action === "create_college") { S.colleges.push({ id: "c" + S.colleges.length, name: body.name, status: "active", seats: +body.seats, seats_used: 0, staff: 0, learners: 0, contact_name: body.admin_name, contact_email: body.admin_email, licence_ends: body.licence_ends || null }); return json({ organisation_id: "c0", invite_code: "COLLEGEADMINCODE" }); }
      if (body.action === "update_college") { const c = S.colleges.find((x) => x.id === body.organisation_id); c.seats = +body.seats; c.status = body.status; return json({ ok: true }); }
      if (body.action === "add_learner") { S.learners.push({ learner_id: "l" + S.learners.length, enrolment_id: "e" + S.learners.length, name: body.name, email: body.email || "x@learners.nisia.invalid", course_code: body.course, start_date: body.start_date, end_date: body.end_date, status: "active", employer_name: body.employer_name, planned_otj_hours: body.planned_otj_hours, assessors: S.staff.filter((s) => body.staff_member_ids.includes(s.member_id)).map((s) => ({ member_id: s.member_id, name: s.name })), paired: false, evidence: 0, otj_hours: 0, last_activity: null }); return json({ learner_id: "l0", enrolment_id: "e0" }); }
      if (body.action === "test_college") {
        if (!S.test) { S.test = { invited: {} }; S.colleges.push({ id: "t0", name: "Nisia Test College", status: "active", seats: 5, seats_used: 1, staff: 0, learners: 1, contact_name: "Master admin", contact_email: persona.email, licence_ends: null, is_test: true }); }
        return json({ organisation_id: "t0", learner_id: "tl", enrolment_id: "te", accounts: ["admin", "quality", "assessor", "tutor", "employer"].map((role) => ({ role, name: "Test " + role, email: "admin+nisia-test-" + role + "@example.com", joined: role === "tutor", invited: !!S.test.invited[role] })) });
      }
      if (body.action === "test_invite") { S.test.invited[body.role] = true; return json({ invite_code: "TESTINVITECODE01", email: "admin+nisia-test-" + body.role + "@example.com" }); }
      if (body.action === "pairing_code") return json({ code: "ABC2345", qr: "NISI:PAIR:2:ABC2345", expires_in_minutes: 30 });
      if (body.action === "invite_staff") return json({ invite_code: "STAFFINVITECODE1" });
      if (body.action === "update_staff") { const m = S.staff.find((x) => x.member_id === body.member_id); Object.assign(m, { name: body.name, roles: body.roles, active: body.active }); return json({ ok: true }); }
      if (body.action === "assign_staff") { const l = S.learners.find((x) => x.learner_id === body.learner_id); l.assessors = S.staff.filter((x) => body.member_ids.includes(x.member_id)).map((x) => ({ member_id: x.member_id, name: x.name })); S.lastAssign = body; return json({ ok: true }); }
      if (body.action === "update_learner") { const l = S.learners.find((x) => x.learner_id === body.learner_id); Object.assign(l, { name: body.name, course_code: body.course, start_date: body.start_date, end_date: body.end_date, employer_name: body.employer_name }); S.lastLearnerEdit = body; return json({ ok: true }); }
    }
    return json({ error: "not faked: " + p }, 404);
  } };
}

const browser = await pw.chromium.launch();
async function open(persona, hash) {
  const ctx = await browser.newContext({ viewport: persona.mobile ? { width: 390, height: 844 } : { width: 1280, height: 860 }, deviceScaleFactor: persona.mobile ? 2 : 1 });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const fake = fakeSupabase(persona);
  await page.route(/supabase\.co/, (r) => fake.handle(r));
  await page.goto(url + (hash || ""));
  return { page, ctx, errors, fake };
}
const shots = path.join(root, "tests", "shots"); fs.mkdirSync(shots, { recursive: true });

try {
  // 1. The master admin accepts their invite, sets up the authenticator, and creates a college.
  {
    const { page, ctx, errors, fake } = await open({ id: "u-admin", email: "admin@example.com", password: "Str0ng-pass!", name: "Nisia admin", platform: true }, "#invite=GOOD-INVITE-CODE-01");
    await page.waitForSelector("#f"); await page.screenshot({ path: shots + "/1-invite.png" });
    await page.fill("#name", "Nisia admin"); await page.fill("#pw", "Str0ng-pass!"); await page.click("button[type=submit]");
    await page.waitForSelector(".qr"); await page.screenshot({ path: shots + "/2-authenticator.png" });
    check("Invite → sign-in → add Nisia to an authenticator app", /authenticator app/.test(await page.textContent(".signin-form")) && !/invite=/.test(page.url()));
    await page.fill("#c", "111111"); await page.click("button[type=submit]"); await page.waitForTimeout(300);
    check("A wrong authenticator code is refused", /didn’t work/.test(await page.textContent(".err")));
    await page.fill("#c", "123 456");
    await page.waitForSelector("text=Colleges"); await page.screenshot({ path: shots + "/3-master-admin-empty.png" });
    await page.click("#new"); await page.fill("[name=name]", "Brookfield College"); await page.fill("[name=seats]", "30");
    await page.fill("[name=admin_name]", "Sarah Mitchell"); await page.fill("[name=admin_email]", "s.mitchell@brookfield.example"); await page.click("#f button[type=submit]");
    await page.waitForSelector(".linkbox"); await page.screenshot({ path: shots + "/4-college-invite.png" });
    const link = await page.inputValue(".linkbox input");
    check("Master admin creates a college and gets its admin's invite link", /#invite=COLLEGEADMINCODE$/.test(link) && fake.S.calls.includes("/functions/v1/nisia-admin:create_college"), link);
    await page.click(".x"); await page.waitForSelector("tr[data-id=c0]"); await page.screenshot({ path: shots + "/5-master-admin.png" });
    await page.click("tr[data-id=c0]"); await page.fill("#f [name=seats]", "40"); await page.click("#f button[type=submit]"); await page.waitForTimeout(400);
    check("Master admin changes a college's seats", fake.S.colleges[0].seats === 40 && /40/.test(await page.textContent("tr[data-id=c0]")));
    // The test college: fake accounts for every role, kept apart from the real colleges.
    await page.click("#tcMake"); await page.waitForSelector("#testPanel [data-setup=assessor]");
    check("Master admin sets up the test college: every role listed, and it's left out of the real colleges' list and totals",
      (await page.$$("#testPanel tbody tr")).length === 6 && !(await page.$("tr[data-id=t0]")) && /Colleges\s*1/.test(await page.textContent(".stats")) && /Ready/.test(await page.textContent("#testPanel")));
    await page.click("#testPanel [data-setup=assessor]"); await page.waitForSelector(".modal .linkbox");
    const tlink = await page.inputValue(".modal .linkbox input");
    check("…a test assessor's invite opens in Milos, for the master admin's own +nisia-test address", /\/milos\/#invite=TESTINVITECODE01$/.test(tlink) && /admin\+nisia-test-assessor@example\.com/.test(await page.textContent(".modal")), tlink);
    await page.click(".modal .x"); await page.waitForSelector("#testPanel [data-setup=admin]");
    await page.click("#testPanel [data-setup=admin]"); await page.waitForSelector(".modal .linkbox");
    check("…a test college admin's invite opens the portal in testing mode (?test)", /\/nisia-web\/\?test#invite=TESTINVITECODE01$/.test(await page.inputValue(".modal .linkbox input")));
    await page.click(".modal .x"); await page.waitForSelector("#tcPair"); await page.screenshot({ path: shots + "/5b-test-college.png", fullPage: true });
    await page.click("#tcPair"); await page.waitForSelector(".big-code");
    check("…and the test learner's Evia connects with a pairing code", /ABC-2345/.test(await page.textContent(".big-code")));
    await page.click(".modal .x");
    await page.click("nav [data-go=usage]"); await page.waitForSelector("[data-app=evia]"); await page.screenshot({ path: shots + "/5c-usage.png", fullPage: true });
    const usage = await page.textContent("#main");
    check("Master admin's Usage page: features ranked by reach, and what nobody used", fake.S.usageDays === 30 && /Teach me lesson[\s\S]*Evidence saved/.test(usage) && /58%/.test(usage) && /Not used/.test(usage) && /Record a video/.test(usage), usage.slice(0, 300));
    await page.click("[data-days='90']"); await page.waitForSelector("[data-days='90'][aria-pressed=true]"); await page.click("[data-app=milos]"); await page.waitForSelector("[data-app=milos][aria-pressed=true]");
    check("…the period and the app can be changed", fake.S.usageDays === 90 && /Tab: assess/.test(await page.textContent("#main")));
    /* The standards library: the source of truth, version by version, word for word. */
    const okAll = (d) => d.accept(); page.on("dialog", okAll);
    await page.click("nav [data-go=standards]"); await page.waitForSelector(".std-q");
    const lib = await page.textContent("#main"); await page.screenshot({ path: shots + "/5d-standards.png", fullPage: true });
    check("Master admin's Standards: Evia's three courses, version by version, and what each course is built on",
      /ST0095 · Bricklayer/.test(lib) && /31 K · 22 S · 6 B/.test(lib) && /ST0264 · Carpentry and joinery/.test(lib) && /Options: Site carpenter, Architectural joiner/.test(lib) &&
      /6570-05/.test(lib) && /12 units · 75 outcomes · 335 criteria/.test(lib) && /City & Guilds/.test(lib) && /Carpentry\s*carp\s*Not set/.test(lib), lib.slice(0, 600));
    await page.click(".std-q:has-text('ST0264') [data-open]"); await page.waitForSelector(".modal .std-row");
    const rows = () => page.$$eval(".modal .std-row", (r) => r.length);
    const all264 = await rows(); await page.click(".modal [data-f=site_carpenter]"); const site264 = await rows(); await page.click(".modal [data-f=core]"); const core264 = await rows();
    const k1 = await page.textContent(".modal .std-row");
    check("…a version opens word for word, and each option's KSBs can be shown on their own", all264 === 75 && site264 === 18 && core264 === 39 && /^K1\s*Health and safety|^K1/.test(k1.trim()) && !(await page.$(".modal #stdPublish")),
      JSON.stringify({ all264, site264, core264, k1: k1.slice(0, 80) }));
    await page.click(".modal .x");
    await page.click(".std-q:has-text('6570-05') [data-open]"); await page.waitForSelector(".modal .std-unit");
    await page.click(".modal .std-unit summary"); await page.screenshot({ path: shots + "/5e-standard-nvq.png" });
    const nvq = { units: await page.$$eval(".modal .std-unit", (u) => u.length), optional: await page.$$eval(".modal .std-unit summary .chip", (c) => c.length), crit: await page.$$eval(".modal .std-unit[open] .std-row", (r) => r.length) };
    check("…a qualification shows its units (optional ones marked), with their learning outcomes and assessment criteria", nvq.units === 12 && nvq.optional === 4 && nvq.crit > 5, JSON.stringify(nvq));
    await page.click(".modal .x");
    /* The packs: yours, each built on its standard, with its topics and their KSBs. */
    const packsText = await page.textContent("section.panel:has(h2:text-is('Packs'))");
    await page.click("[data-pack=kv0]"); await page.waitForSelector(".modal .std-unit");
    const pk = { topics: await page.$$eval(".modal .std-unit", (u) => u.length), first: await page.textContent(".modal .std-unit summary") };
    await page.click(".modal .std-unit summary"); pk.ksb = await page.textContent(".modal .std-unit[open] .std-row"); await page.screenshot({ path: shots + "/5g-pack.png" });
    check("…and the packs: yours, each built on its standard (and option), with its topics and their KSBs in the topic's own words",
      (packsText.match(/Yours(?! come)/g) || []).length === 4 && /Bricklayer[\s\S]*ST0095 v1\.2/.test(packsText) && /ST0264 v1\.4\s*· Site carpenter/.test(packsText) && pk.topics === 10 && /Mixing mortar/.test(pk.first) && /S14\s*Gauge and hand mix mortar to ratio\./.test(pk.ksb),
      JSON.stringify(pk).slice(0, 300) + " | " + packsText.slice(0, 300));
    await page.click(".modal .x");
    /* A new standard from its PDF: Nisia reads it, says what to check, it's saved as a draft, then published. */
    await page.click("#stdAdd"); await page.waitForSelector("#stdForm");
    await page.fill("#stdForm [name=code]", "st0400"); await page.fill("#stdForm [name=version]", "1.0"); await page.fill("#stdForm [name=title]", "Plasterer"); await page.fill("#stdForm [name=level]", "2");
    await page.setInputFiles("#stdFile", { name: "ST0400.pdf", mimeType: "application/pdf", buffer: tinyPdf(["Knowledge", "K1 Know the basics of", "safe working on site.", "K3 Know plaster types.", "Skills", "S1 Mix and apply plaster.", "Page 1 of 1", "Behaviours", "B1 Work safely."]) });
    await page.waitForFunction(() => /read\./.test(document.querySelector("#stdFileNote").textContent), null, { timeout: 15000 }).catch(() => {});
    const read = await page.textContent("#stdCheck"); await page.screenshot({ path: shots + "/5f-standard-add.png" });
    check("…a standard's PDF is read: its KSBs, wording over two lines joined, and gaps in the numbering to check", /Nisia read 4 items/.test(read) && /2 knowledge, 1 skills, 1 behaviours/.test(read) && /Missing in the numbering: K2/.test(read),
      read.slice(0, 300) + " | " + await page.textContent("#stdFileNote"));
    await page.click("#stdForm [type=submit]"); await page.waitForSelector(".modal #stdPublish");
    const saved = STD.S.saved || {};
    check("…saved as a draft, word for word", saved.code === "st0400" && saved.requirements.length === 4 && saved.requirements[0].title === "Know the basics of safe working on site." && STD.S.versions.some((v) => v.version === "1.0" && v.status === "draft"), JSON.stringify(saved).slice(0, 300));
    await page.click(".modal #stdPublish"); await page.waitForFunction(() => !document.querySelector(".modal") && /ST0400/.test(document.getElementById("main").textContent));
    check("…and published once checked", STD.S.versions.some((v) => v.version === "1.0" && v.status === "published") && /ST0400 · Plasterer[\s\S]*Published/.test(await page.textContent("#main")));
    /* What a course is built on. */
    await page.click("[data-course=cx]"); await page.waitForSelector("#cForm");
    await page.evaluate(() => { const s = document.querySelector("#cForm [name=version]"); s.value = [...s.options].find((o) => /ST0264/.test(o.textContent)).value; s.dispatchEvent(new Event("change")); });
    await page.selectOption("#cOpt", "architectural_joiner"); await page.check("#cForm [name=move]"); await page.click("#cForm [type=submit]");
    await page.waitForFunction(() => !document.querySelector(".modal"));
    check("…and the master admin sets what a course is built on (version and option), moving its learners across", STD.S.courseSet && STD.S.courseSet.p_option === "architectural_joiner" && STD.S.courseSet.p_move_learners === true &&
      /Carpentry\s*carp\s*ST0264 v1\.4\s*· Architectural joiner/.test(await page.textContent("#main")), JSON.stringify(STD.S.courseSet));
    page.off("dialog", okAll);
    await page.click("nav [data-go=colleges]"); await page.waitForSelector("#testPanel");
    fake.S.sessionGone = true; /* Nisia has already ended this sign-in (expired, or ended elsewhere) */
    await page.click("#signOut"); await page.waitForSelector("#email", { timeout: 5000 }).catch(() => {});
    check("Master admin signs out, even when Nisia has already ended the sign-in: back to the sign-in page, signed out", !!(await page.$("#email")) && !(await page.evaluate(() => localStorage.getItem("nisia-auth"))), await page.evaluate(() => document.body.innerText.slice(0, 200)));
    check("No script errors (master admin)", !errors.length, errors.join(" | "));
    await ctx.close();
  }
  // 1b. A test account in the portal: ?test keeps its own sign-in (the master admin's stays put), with a Test badge.
  {
    const { page, ctx, errors } = await open({ id: "u-tadmin", email: "admin+nisia-test-admin@example.com", password: "Str0ng-pass!", name: "Test College Admin", factors: [{ id: "f1", factor_type: "totp", status: "verified" }],
      memberships: [{ organisation_id: "t0", organisation: "Nisia Test College", status: "active", member_id: "tm1", roles: ["admin"] }] }, "?test");
    await page.fill("#email", "admin+nisia-test-admin@example.com"); await page.fill("#pw", "Str0ng-pass!"); await page.click("button[type=submit]");
    await page.waitForSelector("#c"); await page.fill("#c", "123456");
    await page.waitForSelector("#nisia-test-badge");
    const keys = await page.evaluate(() => Object.keys(localStorage));
    check("A test account signs in to the portal in testing mode: its own sign-in, and a Test account badge",
      keys.includes("nisia-auth-test") && !keys.includes("nisia-auth") && /college admin/i.test(await page.textContent("#nisia-test-badge")), keys.join(","));
    check("No script errors (test account)", !errors.length, errors.join(" | "));
    await ctx.close();
  }
  // 2. A college admin (already set up) adds a learner, which uses a seat, and shows the Evia QR.
  {
    const staff = [{ member_id: "m2", name: "Mark Ellis", email: "m.ellis@brookfield.example", roles: ["assessor"], active: true, learners: 0 }, { member_id: "m3", name: "Priya Shah", email: "p.shah@brookfield.example", roles: ["tutor"], active: true, learners: 0 }];
    const { page, ctx, errors, fake } = await open({ id: "u-col", email: "s.mitchell@brookfield.example", password: "Str0ng-pass!", name: "Sarah Mitchell", factors: [{ id: "f1", factor_type: "totp", status: "verified" }], staff,
      memberships: [{ organisation_id: "o1", organisation: "Brookfield College", status: "active", member_id: "m1", roles: ["admin"] }] });
    await page.fill("#email", "s.mitchell@brookfield.example"); await page.fill("#pw", "wrong"); await page.click("button[type=submit]"); await page.waitForTimeout(300);
    check("A wrong password is refused", /don’t match/.test(await page.textContent(".err")));
    await page.click("#haveInvite"); await page.fill("#code", "https://example.org/nisia-app/#invite=GOOD-INVITE-CODE-01");
    check("An invite can be pasted on the sign-in page", /invite=/.test(await page.inputValue("#code")) && !!(await page.$("#back")));
    /* Forgotten password: an email with a link back to this page. */
    await page.click("#back"); await page.waitForSelector("#forgot"); await page.click("#forgot"); await page.waitForSelector("#email");
    await page.fill("#email", "s.mitchell@brookfield.example"); await page.click("button[type=submit]"); await page.waitForTimeout(400);
    const forgot = await page.textContent("form"); await page.screenshot({ path: shots + "/5b-forgot.png" });
    check("Forgotten your password? sends a reset email that comes back to the app, and says to ask the college admin if it doesn't come",
      /on its way/.test(forgot) && /college’s Nisia admin/.test(forgot) && fake.S.recover && fake.S.recover.body.email === "s.mitchell@brookfield.example" && /reset=email/.test(fake.S.recover.redirect), JSON.stringify(fake.S.recover));
    await page.click("#back"); await page.waitForSelector("#email"); await page.fill("#email", "s.mitchell@brookfield.example");
    await page.fill("#pw", "Str0ng-pass!"); await page.click("button[type=submit]");
    await page.waitForSelector("#c"); await page.fill("#c", "123456"); /* goes by itself once 6 digits are in */
    await page.waitForSelector(".stats"); await page.screenshot({ path: shots + "/6-college-empty.png" });
    await page.click("nav [data-go=learners]"); await page.click("#add"); await page.fill("[name=name]", "Callum Hughes"); await page.selectOption("[name=course]", "bricklayer");
    await page.fill("[name=start_date]", "2025-09-01"); await page.fill("[name=end_date]", "2027-08-31"); await page.fill("[name=employer_name]", "Hughes & Sons Builders");
    await page.check("[name=staff][value=m2]"); await page.screenshot({ path: shots + "/7-add-learner.png" }); await page.click("#f button[type=submit]");
    await page.waitForSelector(".qr svg"); await page.screenshot({ path: shots + "/8-evia-qr.png" });
    check("College admin adds a learner with their assessor, then Evia's pairing QR shows", fake.S.learners.length === 1 && fake.S.learners[0].assessors[0].name === "Mark Ellis" && /ABC-2345/.test(await page.textContent(".big-code")));
    await page.click(".x"); await page.waitForTimeout(300); await page.screenshot({ path: shots + "/9-college.png", fullPage: true });
    check("The learner shows in the table", /Callum Hughes/.test(await page.textContent("table")));
    /* Classes: set up once in Nisia (here with the tutor, days, times, dates and learner); it becomes the tutor's register in Symi. */
    await page.click("nav [data-go=classes]"); await page.waitForSelector("#newClass"); await page.click("#newClass"); await page.waitForSelector("#cf");
    await page.fill("#cf [name=title]", "L2 Bricklaying Tuesday"); await page.selectOption("#cf [name=course]", "bricklayer");
    await page.check('#cf [name=day][value=Tuesday]'); await page.fill("#cf [name=start]", "09:00"); await page.fill("#cf [name=end]", "16:00");
    await page.fill("#cf [name=startDate]", "2026-10-06"); await page.fill("#cf [name=endDate]", "2026-12-22"); await page.fill("#cf [name=room]", "Workshop 2");
    /* Breaks are edited here and teaching time is worked out as you go; learners are searched, not scrolled. */
    await page.click("#brks .brk-row:last-child [data-brk-del]"); await page.fill('#brks .brk-row:nth-child(2) [data-brk=end]', "13:15");
    const teachText = await page.textContent("#teachSum");
    await page.fill("#lpQ", "zzz"); const noneShown = await page.isVisible(".lp-none");
    await page.fill("#lpQ", "callum"); const rowsShown = await page.$$eval(".lp-row:not([hidden])", (x) => x.length);
    await page.click("#lpAll"); const chosenText = await page.textContent("#lpCount");
    await page.screenshot({ path: shots + "/9b-new-class.png", fullPage: true });
    await page.click("#cf button[type=submit]"); await page.waitForFunction(() => !document.querySelector("#cf"));
    await page.waitForSelector("[data-edit-class]"); await page.screenshot({ path: shots + "/9c-classes.png", fullPage: true });
    const sc = (fake.S.calls.find((c) => c.t === "save_class") || {}).body || {};
    check("Classes: the admin sets up a class once (tutor, course, days, times, dates, room and learners) and it's listed with its learners",
      sc.p_title === "L2 Bricklaying Tuesday" && sc.p_course === "bricklayer" && sc.p_schedule.recurrence.weekdays.join() === "Tuesday" && sc.p_schedule.start === "09:00" && sc.p_schedule.recurrence.endDate === "2026-12-22" &&
      sc.p_room === "Workshop 2" && sc.p_enrolments.length === 1 && !!sc.p_tutor && /Callum/.test(await page.textContent("table")) && /Tue 09:00/.test(await page.textContent("table")), JSON.stringify(sc));
    check("…with its breaks (edited, not counted as teaching), teaching time per day and in total, and a learner search for big colleges",
      JSON.stringify(sc.p_schedule.breaks) === JSON.stringify([{ start: "10:30", end: "10:45" }, { start: "12:30", end: "13:15" }]) && /6h teaching a day/.test(teachText) && /12 days/.test(teachText) && /72h teaching in total/.test(teachText) &&
      noneShown && rowsShown === 1 && /1 chosen/.test(chosenText) && /6h teaching/.test(await page.textContent("table")), teachText + " | " + rowsShown + " | " + chosenText);
    /* Resources: what the college shares with its tutors in Symi; admins add links to files kept elsewhere. */
    await page.click("nav [data-go=resources]"); await page.waitForSelector("#addRes");
    await page.click("#addRes"); await page.waitForSelector("#rf");
    await page.fill("#rf [name=title]", "Cavity walls PowerPoint"); await page.fill("#rf [name=url]", "https://college.example/cavity.pptx"); await page.selectOption("#rf [name=course]", "bricklayer");
    await page.click("#rf button[type=submit]"); await page.waitForFunction(() => !document.querySelector("#rf")); await page.waitForTimeout(300);
    const resText = await page.textContent("#main"); await page.screenshot({ path: shots + "/9e-resources.png", fullPage: true });
    check("Resources: the college's shared slides, quizzes and links (in every tutor's Symi), and an admin adds a link to a file kept elsewhere",
      /Brick bonds deck/.test(resText) && /Cavity walls PowerPoint/.test(resText) && fake.S.shared && fake.S.shared.p_kind === "link" && fake.S.shared.p_url === "https://college.example/cavity.pptx" && fake.S.shared.p_course === "bricklayer", resText.slice(0, 300));
    /* Today: every class on today, with who's in, late, booked off and not in yet, live from Symi. */
    await page.click("nav [data-go=today]"); await page.waitForSelector(".today-class"); await page.screenshot({ path: shots + "/9d-today.png", fullPage: true });
    const tt = await page.textContent("#main");
    check("Today: the classes on today, live from Symi, with who's in, late, booked off (ill) and not in yet",
      (await page.$$eval(".today-class", (x) => x.length)) === 1 && /2 of 4 in/.test(tt) && /Late/.test(tt) && /Ill/.test(tt) && /Not in yet/.test(tt) && /Register open/.test(tt) && !/Plastering Friday/.test(tt), tt.slice(0, 400));
    await page.click("nav [data-go=overview]"); await page.waitForSelector(".stats"); await page.screenshot({ path: shots + "/10-overview.png", fullPage: true });
    check("The overview shows 1 of 2 seats used", /1\s*\/ 2/.test(await page.textContent(".stats")));
    await page.click("nav [data-go=learners]"); await page.click("tr[data-learner]"); await page.waitForSelector("text=Laid a cavity wall"); await page.screenshot({ path: shots + "/11-learner.png", fullPage: true });
    check("A learner's page shows what Evia sends", /Upload the cavity wall photos/.test(await page.textContent("#main")));
    await page.click(".pf-ev[data-ev=ev1]"); await page.waitForSelector(".media img"); await page.screenshot({ path: shots + "/11b-evidence.png" });
    check("Staff open a piece of evidence and see the write-up and photos", /Ties every 450/.test(await page.textContent(".modal")) && (await page.$$(".media img")).length === 1);
    await page.click(".modal .x");
    await page.click("#editL"); await page.waitForSelector(".modal [name=employer_name]");
    await page.fill(".modal [name=name]", "Callum J Hughes"); await page.fill(".modal [name=employer_name]", "Hughes Builders Ltd"); await page.fill(".modal [name=end_date]", "2027-12-31");
    await page.click(".modal button[type=submit]"); await page.waitForTimeout(500);
    check("College admin edits a learner's details (assessor and tutor in the same window)", fake.S.lastAssign && fake.S.lastAssign.member_ids.join() === "m2" && fake.S.lastLearnerEdit && fake.S.lastLearnerEdit.name === "Callum J Hughes" && fake.S.lastLearnerEdit.end_date === "2027-12-31" && /Callum J Hughes/.test(await page.textContent("#main")));
    await page.click("nav [data-go=reviews]"); await page.waitForSelector("#done [data-review]");
    await page.click("#done [data-review]"); await page.waitForSelector(".review-doc"); await page.screenshot({ path: shots + "/11c-review.png" });
    check("A completed review opens in Nisia, with all three signatures", /Strong start/.test(await page.textContent(".review-doc")) && (await page.$$(".review-doc .sig-box img")).length === 3);
    await page.click(".modal .x");
    await page.click("nav [data-go=staff]"); await page.waitForSelector("[data-edit=m2]");
    await page.click("[data-edit=m2]"); await page.click("#resetPw"); await page.waitForSelector("#resetLink");
    const resetLink = await page.inputValue("#resetLink");
    check("College admin makes a password reset link for a member of staff, to send them", /#reset=ABCD1234EFGH5678$/.test(resetLink) && fake.S.resetFor === "m2", resetLink);
    await page.click(".modal .x"); await page.click("[data-edit=m2]"); await page.fill(".modal [name=name]", "Mark T Ellis"); await page.check('.modal [name=roles][value="tutor"]');
    await page.click(".modal button[type=submit]"); await page.waitForTimeout(500);
    check("College admin edits a member of staff (name and roles), and switching off is inside that window", fake.S.staff[0].name === "Mark T Ellis" && fake.S.staff[0].roles.join() === "assessor,tutor" && fake.S.staff[0].active === true && !(await page.$("[data-toggle]"))); await page.waitForSelector("#inv"); await page.click("#inv");
    await page.fill("[name=name]", "Priya Shah"); await page.fill("[name=email]", "p.shah@brookfield.example"); await page.click("#f button[type=submit]");
    await page.waitForSelector(".linkbox");
    check("College admin invites staff", /#invite=STAFFINVITECODE1$/.test(await page.inputValue(".linkbox input")));
    await page.click(".x"); await page.click("[data-go=licence]"); await page.waitForSelector("#dsl");
    await page.fill("#dsl [name=name]", "Jo Smith"); await page.fill("#dsl [name=phone]", "01234 567890"); await page.click("#dsl button[type=submit]"); await page.waitForTimeout(400);
    check("College admin sets the safeguarding lead (it goes to Evia)", fake.S.dsl && fake.S.dsl.p_name === "Jo Smith" && fake.S.dsl.p_phone === "01234 567890");
    await page.click("nav [data-go=impact]"); await page.waitForSelector(".icards"); await page.screenshot({ path: shots + "/12b-impact.png", fullPage: true });
    const imp = await page.textContent("#main");
    check("College Impact report: this period against the one before", fake.S.impact.length === 2 && fake.S.impact.some((a) => fake.S.impact.some((b) => a.p_to === b.p_from)) && /85%/.test(imp) && /▲ 18 pts/.test(imp) && /▼ 1\.6 days/.test(imp) && /Teach me lessons finished\s*310/.test(imp), imp.slice(400, 1400) + " " + JSON.stringify(fake.S.impact));
    await page.click("[data-period=year]"); await page.waitForSelector("[data-period=year][aria-pressed=true]");
    check("…the period can be changed (this academic year starts on 1 August)", fake.S.impact.slice(2).some((a) => /-08-01$/.test(a.p_from) && a.p_to > a.p_from), JSON.stringify(fake.S.impact));
    await page.emulateMedia({ media: "print" }); await page.pdf({ path: shots + "/12c-impact.pdf" }).catch(() => {});
    check("…and it prints as a report without the menu", await page.evaluate(() => getComputedStyle(document.getElementById("side")).display === "none" && getComputedStyle(document.querySelector(".no-print")).display === "none"));
    await page.emulateMedia({ media: "screen" });
    await page.click("nav [data-go=attendance]"); await page.waitForSelector(".att-table"); await page.screenshot({ path: shots + "/12d-attendance.png", fullPage: true });
    const att = await page.textContent("#main");
    check("Attendance: each learner against the college's target, those below it first, with unexplained absences in a row", /70%/.test(att) && /2 in a row/.test(att) && !!(await page.$("tr.att-below")) && /85%/.test(await page.textContent(".att-stats")) && !!fake.S.attReport, att.slice(0, 500));
    await page.fill("#rules [name=late_minutes]", "15"); await page.fill("#rules [name=target_pct]", "95"); await page.click("#rules button[type=submit]"); await page.waitForSelector("#rules [name=late_minutes]");
    check("…the college sets its own rules (late after, target, when admins hear)", fake.S.attSet && fake.S.attSet.late_minutes === 15 && fake.S.attSet.target_pct === 95 && fake.S.attSet.alert_after === 2 && fake.S.attSet.organisation_id, JSON.stringify(fake.S.attSet));
    /* The college's own pack: a copy of yours, changed in the builder (coverage shown as it goes), published, given to
       the course, and one learner moved back onto yours. Your pack is never changed. */
    { const okAll = (d) => d.accept(); page.on("dialog", okAll);
      await page.click("nav [data-go=packs]"); await page.waitForSelector("[data-copy]");
      const packsPage = await page.textContent("#main");
      await page.click("[data-copy=kv0]"); await page.waitForSelector(".b-topic");
      const cover = async () => (await page.textContent(".b-cover .panel-head")).replace(/\s+/g, " ");
      const c0 = await cover();
      await page.fill(".b-name[data-i='0']", "Mortar: mixing and gauging");
      await page.click(".b-topic[data-i='0'] .b-x[data-k='S14']"); const c1 = await cover(), gap = await page.textContent(".b-cover");
      await page.click("#bAdd"); await page.fill(".b-name[data-i='10']", "Gauging boxes");
      await page.click("[data-pick='10']"); await page.check(".modal .b-pick input[value='S14']"); const also = await page.textContent(".modal .b-pick:has(input[value='K20'])"); await page.click("#pkDone");
      const c2 = await cover(); await page.click("[data-up='10']"); await page.screenshot({ path: shots + "/12e-pack-builder.png", fullPage: true });
      await page.click("#bSave"); await page.waitForSelector("[data-publish]");
      const saved = STD.S.collegeSaved || {}, t = (saved.p_content || {}).topics || [];
      check("College packs: a copy of your pack is changed in the builder, with KSB coverage shown as it goes, and saved as the college's own draft",
        /Yours \(Nisia\)/.test(packsPage) && /59 of 59/.test(c0) && /58 of 59/.test(c1) && /S14/.test(gap) && /59 of 59/.test(c2) && /Not in any other topic|Also in/.test(also) &&
        saved.p_pack === null && t.length === 11 && t[0].name === "Mortar: mixing and gauging" && t[0].from === "bricklayer/mixing-mortar" && t[9].name === "Gauging boxes" && t[9].ksbs[0].code === "S14" && !t[0].ksbs.some((k) => k.code === "S14"),
        JSON.stringify({ c0, c1, c2, n: t.length, t0: t[0] && t[0].name, t9: t[9] && t[9].name }));
      await page.click("[data-publish=kcv1]"); await page.waitForFunction(() => !document.querySelector("[data-publish]"));
      await page.selectOption("select[data-course=cb]", "kc"); await page.waitForFunction(() => /uses/.test((document.querySelector(".toast") || {}).textContent || ""));
      check("…published, and given to the college's Bricklayer course (your pack stays as it was)", STD.S.collegePublished === "kcv1" && STD.S.courseSet3 && STD.S.courseSet3.p_pack === "kc" &&
        JSON.stringify(STD.S.packs.find((k) => k.id === "k0").content.topics[0].name) === JSON.stringify("Mixing mortar"));
      await page.click("nav [data-go=learners]"); await page.click("tr[data-learner]"); await page.waitForSelector("#packL");
      const tag = await page.textContent(".lmeta"); await page.click("#packL"); await page.check(".modal input[value=k0]"); await page.click("#pkF [type=submit]");
      await page.waitForFunction(() => !document.querySelector(".modal"));
      check("…and a learner shows their pack, and can be moved back onto yours", /Pack: Bricklayer \(/.test(tag) && STD.S.enrolPack && STD.S.enrolPack.p_enrolment === "e0" && STD.S.enrolPack.p_pack === "k0", tag + " " + JSON.stringify(STD.S.enrolPack));
      page.off("dialog", okAll); }
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: "dark" }); await page.click("#menuBtn"); await page.click("#side [data-go=learners]");
    await page.waitForSelector("tr[data-learner]"); await page.screenshot({ path: shots + "/12-phone-dark.png" });
    check("On a phone the menu opens the learners list", /Callum J Hughes/.test(await page.textContent("table")));
    /* Signing out and back in: the email is remembered, so it's just the password (then the code, which goes by itself). */
    await page.evaluate(() => document.getElementById("signOut").click());
    await page.waitForSelector("#pw", { timeout: 8000 });
    const back = await page.evaluate(() => ({ email: document.getElementById("email").value, focus: document.activeElement && document.activeElement.id, notMe: !!document.getElementById("notMe") }));
    check("Signing back in on the same device: the email is filled in and the cursor is on the password", back.email === "s.mitchell@brookfield.example" && back.focus === "pw" && back.notMe, JSON.stringify(back));
    await page.click("#notMe"); const cleared = await page.evaluate(() => document.getElementById("email").value === "" && !localStorage.getItem("nisia-last-email"));
    check("…and “Not you?” forgets it", cleared);
    check("No script errors (college portal)", !errors.length, errors.join(" | "));
    await ctx.close();
  }
  // A reset link from the college admin: a new password, then signing in as usual (with the authenticator code).
  {
    const { page, ctx, errors, fake } = await open({ id: "u-mark", email: "m.ellis@brookfield.example", password: "Old-forgotten1!", name: "Mark Ellis", factors: [{ id: "f1", factor_type: "totp", status: "verified" }],
      memberships: [{ organisation_id: "o1", organisation: "Brookfield College", status: "active", member_id: "m2", roles: ["assessor"] }] }, "#reset=ABCD1234EFGH5678");
    await page.waitForSelector("#pw2"); await page.fill("#pw", "New-pass-2026!"); await page.fill("#pw2", "New-pass-2026?"); await page.click("button[type=submit]"); await page.waitForTimeout(200);
    const mismatch = await page.textContent(".err");
    await page.fill("#pw", "New-pass-2026!"); await page.fill("#pw2", "New-pass-2026!"); await page.click("button[type=submit]");
    await page.waitForSelector("#c");
    check("A reset link: choose a new password (typed twice), then straight on to the authenticator code; the link is gone from the address",
      /don’t match/.test(mismatch) && fake.S.redeemed && fake.S.redeemed.p_password === "New-pass-2026!" && !/reset=/.test(page.url()), page.url());
    check("No script errors (reset link)", !errors.length, errors.join(" | "));
    await ctx.close();
  }
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

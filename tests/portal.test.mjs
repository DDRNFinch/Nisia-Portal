/* Portal browser test with a stand-in Supabase (so it runs without the internet): accept an invite, set up the
   authenticator, the master admin creates a college, then a college admin adds a learner and shows the Evia QR.
   Run: node tests/portal.test.mjs   (exit code 0 = passed) */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
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
    if (p === "/auth/v1/logout") return S.sessionGone ? json({ code: 403, error_code: "session_not_found", msg: "Session not found" }, 403) : route.fulfill({ status: 204 });
    if (p === "/auth/v1/factors") { S.factors = [{ id: "f1", factor_type: "totp", status: "unverified", friendly_name: "Nisia" }]; return json({ id: "f1", type: "totp", totp: { qr_code: "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg'/>", secret: "ABCDEF", uri: "otpauth://x" } }); }
    if (/\/auth\/v1\/factors\/f1$/.test(p) && req.method() === "DELETE") { S.factors = []; return json({ id: "f1" }); }
    if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
    if (/\/verify$/.test(p)) { if (body.code !== "123456") return json({ msg: "Invalid TOTP code entered" }, 422); S.aal = "aal2"; S.factors = [{ id: "f1", factor_type: "totp", status: "verified", friendly_name: "Nisia" }]; return json(session()); }
    if (p === "/rest/v1/rpc/nisia_me") return json({ user_id: persona.id, aal: S.aal, platform_admin: !!persona.platform, memberships: persona.memberships || [], name: persona.name });
    if (p === "/rest/v1/rpc/nisia_admin_colleges") return json(S.colleges);
    if (p === "/rest/v1/rpc/nisia_college_summary") return json({ name: "Brookfield College", status: "active", seats: 2, seats_used: S.learners.length, licence_ends: "2027-07-31" });
    if (p === "/rest/v1/rpc/nisia_college_learners") return json(S.learners);
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
    const staff = [{ member_id: "m2", name: "Mark Ellis", email: "m.ellis@brookfield.example", roles: ["assessor"], active: true, learners: 0 }];
    const { page, ctx, errors, fake } = await open({ id: "u-col", email: "s.mitchell@brookfield.example", password: "Str0ng-pass!", name: "Sarah Mitchell", factors: [{ id: "f1", factor_type: "totp", status: "verified" }], staff,
      memberships: [{ organisation_id: "o1", organisation: "Brookfield College", status: "active", member_id: "m1", roles: ["admin"] }] });
    await page.fill("#email", "s.mitchell@brookfield.example"); await page.fill("#pw", "wrong"); await page.click("button[type=submit]"); await page.waitForTimeout(300);
    check("A wrong password is refused", /don’t match/.test(await page.textContent(".err")));
    await page.click("#haveInvite"); await page.fill("#code", "https://example.org/nisia-app/#invite=GOOD-INVITE-CODE-01");
    check("An invite can be pasted on the sign-in page", /invite=/.test(await page.inputValue("#code")) && !!(await page.$("#back")));
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
    await page.click("[data-edit=m2]"); await page.fill(".modal [name=name]", "Mark T Ellis"); await page.check('.modal [name=roles][value="tutor"]');
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
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

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
    if (p === "/auth/v1/logout") return route.fulfill({ status: 204 });
    if (p === "/auth/v1/factors") { S.factors = [{ id: "f1", factor_type: "totp", status: "unverified", friendly_name: "Nisia" }]; return json({ id: "f1", type: "totp", totp: { qr_code: "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg'/>", secret: "ABCDEF", uri: "otpauth://x" } }); }
    if (/\/auth\/v1\/factors\/f1$/.test(p) && req.method() === "DELETE") { S.factors = []; return json({ id: "f1" }); }
    if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
    if (/\/verify$/.test(p)) { if (body.code !== "123456") return json({ msg: "Invalid TOTP code entered" }, 422); S.aal = "aal2"; S.factors = [{ id: "f1", factor_type: "totp", status: "verified", friendly_name: "Nisia" }]; return json(session()); }
    if (p === "/rest/v1/rpc/nisia_me") return json({ user_id: persona.id, aal: S.aal, platform_admin: !!persona.platform, memberships: persona.memberships || [], name: persona.name });
    if (p === "/rest/v1/rpc/nisia_admin_colleges") return json(S.colleges);
    if (p === "/rest/v1/rpc/nisia_college_summary") return json({ name: "Brookfield College", status: "active", seats: 2, seats_used: S.learners.length, licence_ends: "2027-07-31" });
    if (p === "/rest/v1/rpc/nisia_college_learners") return json(S.learners);
    if (p === "/rest/v1/rpc/nisia_college_staff") return json(S.staff);
    if (p === "/rest/v1/rpc/nisia_college_activity") return json([{ week_start: "2026-09-21", evidence: 3, hours: 6 }]);
    if (p === "/rest/v1/rpc/nisia_learner_detail") return json({ snapshot: { ksb: { met: 12, total: 59, pct: 20 }, units: [{ name: "Unit 201", total: 10, missing: ["K1", "K2"] }], otj: { total: 14 } }, snapshot_at: new Date().toISOString(), evia_targets: [{ title: "Upload the cavity wall photos", due: "2026-10-10" }], targets: [], reviews: [], evidence: [{ kind: "evidence", title: "Laid a cavity wall", type: "photo", at: new Date().toISOString() }], hours: [{ kind: "hours", title: "Teach me: cavity walls", hours: 1.5, at: new Date().toISOString().slice(0, 10) }], weekly: [0, 0, 1, 2, 0, 3, 1, 0, 2, 4, 1, 1] });
    if (p === "/functions/v1/nisia-setup" && body.action === "accept") return String(body.code).toUpperCase().replace(/[^A-Z0-9]/g, "") === "GOODINVITECODE01" ? json({ ok: true, email: persona.email }) : json({ error: "This invite has already been used, or doesn’t exist. Ask for a new one." }, 400);
    if (p === "/functions/v1/nisia-admin") {
      if (body.action === "create_college") { S.colleges.push({ id: "c" + S.colleges.length, name: body.name, status: "active", seats: +body.seats, seats_used: 0, staff: 0, learners: 0, contact_name: body.admin_name, contact_email: body.admin_email, licence_ends: body.licence_ends || null }); return json({ organisation_id: "c0", invite_code: "COLLEGEADMINCODE" }); }
      if (body.action === "update_college") { const c = S.colleges.find((x) => x.id === body.organisation_id); c.seats = +body.seats; c.status = body.status; return json({ ok: true }); }
      if (body.action === "add_learner") { S.learners.push({ learner_id: "l" + S.learners.length, name: body.name, email: body.email || "x@learners.nisia.invalid", course_code: body.course, start_date: body.start_date, end_date: body.end_date, status: "active", employer_name: body.employer_name, planned_otj_hours: body.planned_otj_hours, assessors: S.staff.filter((s) => body.staff_member_ids.includes(s.member_id)).map((s) => ({ member_id: s.member_id, name: s.name })), paired: false, evidence: 0, otj_hours: 0, last_activity: null }); return json({ learner_id: "l0", enrolment_id: "e0" }); }
      if (body.action === "pairing_code") return json({ code: "ABC2345", qr: "NISI:PAIR:2:ABC2345", expires_in_minutes: 30 });
      if (body.action === "invite_staff") return json({ invite_code: "STAFFINVITECODE1" });
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
    await page.fill("#c", "123 456"); await page.click("button[type=submit]");
    await page.waitForSelector("text=Colleges"); await page.screenshot({ path: shots + "/3-master-admin-empty.png" });
    await page.click("#new"); await page.fill("[name=name]", "Brookfield College"); await page.fill("[name=seats]", "30");
    await page.fill("[name=admin_name]", "Sarah Mitchell"); await page.fill("[name=admin_email]", "s.mitchell@brookfield.example"); await page.click("#f button[type=submit]");
    await page.waitForSelector(".linkbox"); await page.screenshot({ path: shots + "/4-college-invite.png" });
    const link = await page.inputValue(".linkbox input");
    check("Master admin creates a college and gets its admin's invite link", /#invite=COLLEGEADMINCODE$/.test(link) && fake.S.calls.includes("/functions/v1/nisia-admin:create_college"), link);
    await page.click(".x"); await page.waitForSelector("tr[data-id=c0]"); await page.screenshot({ path: shots + "/5-master-admin.png" });
    await page.click("tr[data-id=c0]"); await page.fill("#f [name=seats]", "40"); await page.click("#f button[type=submit]"); await page.waitForTimeout(400);
    check("Master admin changes a college's seats", fake.S.colleges[0].seats === 40 && /40/.test(await page.textContent("tr[data-id=c0]")));
    check("No script errors (master admin)", !errors.length, errors.join(" | "));
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
    await page.waitForSelector("#c"); await page.fill("#c", "123456"); await page.click("button[type=submit]");
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
    await page.click("nav [data-go=staff]"); await page.waitForSelector("#inv"); await page.click("#inv");
    await page.fill("[name=name]", "Priya Shah"); await page.fill("[name=email]", "p.shah@brookfield.example"); await page.click("#f button[type=submit]");
    await page.waitForSelector(".linkbox");
    check("College admin invites staff", /#invite=STAFFINVITECODE1$/.test(await page.inputValue(".linkbox input")));
    await page.click(".x"); await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: "dark" }); await page.click("#menuBtn"); await page.click("#side [data-go=learners]");
    await page.waitForSelector("tr[data-learner]"); await page.screenshot({ path: shots + "/12-phone-dark.png" });
    check("On a phone the menu opens the learners list", /Callum Hughes/.test(await page.textContent("table")));
    check("No script errors (college portal)", !errors.length, errors.join(" | "));
    await ctx.close();
  }
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

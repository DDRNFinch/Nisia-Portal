/* Registers, end to end, the way people use them: a tutor runs a register in Symi, the learner checks in from Evia,
   the tutor finishes the register, the hours arrive in the learner's Evia, and the employer sees them in Paros.
   The apps run in real browsers; Nisia is a real Postgres with Nisia's own tables, rules and functions
   (services/supabase), so a wrong rule or a missing permission fails here before anyone tries it for real.
   Only the sign-in is pretend (any password; the code 123456 is the authenticator app).
   Run: node tests/e2e/registers.e2e.mjs   (needs Postgres 16 and Evia's repository beside this one, ../Evia7) */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
const globalRoot = execSync("npm root -g").toString().trim();
const need = (m) => { try { return require(m); } catch { return require(globalRoot + "/" + m); } };
const pw = need("playwright"), { Pool } = need("pg");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.."), evia = path.resolve(root, "../Evia7");
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + String(detail).slice(0, 600))); };

/* ---------- A fresh Nisia ---------- */
const DB = "nisia_e2e";
const sh = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString();
try { sh("pg_ctlcluster 16 main start"); } catch (_) { /* already running */ }
sh(`su postgres -c "psql -X -q -c \\"alter user postgres password 'e2e'\\""`);
sh(`su postgres -c "dropdb --if-exists ${DB} && createdb ${DB}"`);
for (const f of ["tests/e2e/schema.sql", "tests/sql/live-helpers.sql", "tests/e2e/live-functions.sql", "services/supabase/symi-paros.sql", "services/supabase/registers.sql",
  "services/supabase/classes-rls-fix.sql", "services/supabase/actions-registers.sql", "services/supabase/actions-feedback.sql", "tests/e2e/seed.sql"])
  { const out = sh(`su postgres -c "psql -X -q -v ON_ERROR_STOP=1 -d ${DB} -f ${path.join(root, f)}" 2>&1 | grep -v skipping || true`).trim(); if (/ERROR/.test(out)) throw new Error(f + ": " + out); }
const pool = new Pool({ host: "127.0.0.1", user: "postgres", password: "e2e", database: DB, max: 4 });
const q = async (sql, args) => (await pool.query(sql, args)).rows;

/* ---------- Pretend sign-in: a token that says who you are and whether you used the authenticator app ---------- */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (sub, aal) => b64({ alg: "HS256" }) + "." + b64({ sub, aal, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, session_id: "s-" + sub }) + ".sig";
const whoIs = (h) => { try { const p = JSON.parse(Buffer.from(String(h || "").replace(/^Bearer /, "").split(".")[1], "base64url").toString()); return p.sub ? p : null; } catch { return null; } };
const session = (sub, aal, email) => ({ access_token: token(sub, aal), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: b64({ sub, aal, email }), user: { id: sub, aud: "authenticated", role: "authenticated", email, factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });

/* ---------- Nisia's functions, called as the signed-in person ---------- */
const procs = new Map();
async function proc(name) {
  if (procs.has(name)) return procs.get(name);
  const [p] = await q(`select p.proretset retset, format_type(p.prorettype, null) rettype, coalesce(p.proargnames, '{}') names, coalesce(p.proargmodes::text[], '{}') modes,
      array(select format_type(t, null) from unnest(p.proargtypes) t) intypes
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`, [name]);
  if (!p) { procs.set(name, null); return null; }
  const inNames = p.names.filter((_, i) => !p.modes.length || ["i", "b"].includes(p.modes[i])), types = {};
  inNames.forEach((n, i) => { types[n] = p.intypes[i]; });
  const v = { retset: p.retset, rettype: p.rettype, types }; procs.set(name, v); return v;
}
const tableTouches = [];
async function rpc(name, args, who) {
  const p = await proc(name);
  if (!p) return { status: 404, body: { message: "Could not find the function public." + name } };
  const vals = [], parts = [];
  for (const [k, v] of Object.entries(args || {})) {
    const t = p.types[k]; if (!t) return { status: 400, body: { message: "Unknown argument " + k + " for " + name } };
    vals.push(t === "jsonb" || t === "json" ? JSON.stringify(v) : v); parts.push(k + " => $" + vals.length + "::" + t);
  }
  const call = "public." + name + "(" + parts.join(", ") + ")";
  const sql = p.retset ? `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) r from ${call} t` : p.rettype === "void" ? `select null::jsonb r from (select ${call}) x` : `select to_jsonb(${call}) r`;
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('test.uid', $1, true), set_config('test.aal', $2, true)", [who ? who.sub : "", who ? who.aal : "aal1"]);
    await c.query("set local role " + (who ? "authenticated" : "anon"));
    const r = await c.query(sql, vals);
    await c.query("commit");
    return { status: 200, body: r.rows[0] ? r.rows[0].r : null };
  } catch (e) { await c.query("rollback").catch(() => {}); return { status: 400, body: { message: e.message, code: e.code } }; }
  finally { c.release(); }
}

async function nisia(route) {
  const r = route.request(), u = new URL(r.url()), p = u.pathname; let body = {}; try { body = r.postData() ? JSON.parse(r.postData()) : {}; } catch (_) {}
  const json = (d, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (r.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  const who = whoIs(r.headers()["authorization"]);
  if (p === "/auth/v1/token") {
    if (u.searchParams.get("grant_type") === "refresh_token") { const t = JSON.parse(Buffer.from(body.refresh_token, "base64url").toString()); return json(session(t.sub, t.aal, t.email)); }
    const [user] = await q("select id from auth.users where email = $1", [String(body.email || "").toLowerCase()]);
    return user ? json(session(user.id, "aal1", body.email)) : json({ error: "invalid_grant", error_description: "Invalid login credentials" }, 400);
  }
  if (p === "/auth/v1/user") return who ? json({ id: who.sub, aud: "authenticated", role: "authenticated", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] }) : json({ message: "no user" }, 401);
  if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
  if (/\/verify$/.test(p)) return body.code === "123456" && who ? json(session(who.sub, "aal2")) : json({ message: "Invalid TOTP code" }, 400);
  if (p === "/auth/v1/logout") return route.fulfill({ status: 204 });
  if (p.startsWith("/rest/v1/rpc/")) { const out = await rpc(p.slice(13), body, who); return json(out.body, out.status); }
  if (p.startsWith("/rest/v1/")) {
    /* The apps' other syncing (Evia's records, targets…) isn't part of registers: accepted and ignored here. */
    if (/^\/rest\/v1\/class/.test(p)) tableTouches.push(r.method() + " " + p);
    return r.method() === "GET" ? json([]) : route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, body: "" });
  }
  if (p.startsWith("/storage/") || p.startsWith("/functions/")) return json({});
  return json({ message: "not in the test Nisia: " + p }, 404);
}

/* ---------- The apps, served as they are published (Evia beside the others) ---------- */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); const base = p.startsWith("/evia/") ? evia : root; if (base === evia) p = p.slice(5);
  const f = path.join(base, p.endsWith("/") ? p + "index.html" : p);
  if (!f.startsWith(base) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(0);
const site = "http://localhost:" + server.address().port;
const TEE = "0e2e0000-0000-0000-0000-0000000000a1", LEE = "0e2e0000-0000-0000-0000-0000000000a2", EM = "0e2e0000-0000-0000-0000-0000000000a3", ENROL = "0e2e0000-0000-0000-0000-0000000000e1";

const browser = await pw.chromium.launch();
const errors = [], warnings = [];
async function app(device) {
  const ctx = await browser.newContext({ viewport: device || { width: 1280, height: 860 }, locale: "en-GB", serviceWorkers: "block" }), page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message)); page.on("dialog", (d) => d.accept());
  page.on("console", (m) => { if (m.type() === "warning" && /Nisia/.test(m.text())) warnings.push(m.text()); });
  await page.route(/supabase\.co/, nisia);
  return { ctx, page };
}
async function signIn(page, email, scope = "") {
  await page.fill(scope + "#email", email); await page.fill(scope + "#pw", "Str0ng-pass!"); await page.click(scope + "button[type=submit]");
  await page.waitForSelector(scope + "#c"); await page.fill(scope + "#c", "123456");
}
try {
  /* 1. The tutor's Symi: a register for today with Lee on it, then connected to Nisia. */
  const symi = await app();
  await symi.page.goto(site + "/apps/symi/update.json");
  await symi.page.evaluate(() => {
    localStorage.clear();
    const d = new Date(), key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const L = [{ id: "x1", name: "Lee Erna", externalId: "" }];
    localStorage.setItem("symi-last-seen-release-v1", "9.9.9");
    localStorage.setItem("samos.classroom.data", JSON.stringify({ settings: { teacherName: "Tee", centre: "" }, learners: L, teachingClasses: [], attendance: {}, history: [], resources: [], courses: [],
      classes: [{ id: "reg1", name: "L2 Brickwork", day: "Monday", room: "Workshop 1", start: "00:01", end: "23:58", breaks: [], learners: L, recurrence: { type: "once", onceDate: key, startDate: key, endDate: key } }],
      activeClassId: "reg1", view: "registers" }));
  });
  await symi.page.goto(site + "/apps/symi/"); await symi.page.waitForTimeout(1200);
  await symi.page.evaluate(() => window.SamosApp.openRegisters());
  await symi.page.click("#nisiaButton"); await signIn(symi.page, "tee@e2e.test", ".sn-auth ");
  await symi.page.waitForFunction(() => document.querySelector("#nisiaButton.on"), null, { timeout: 10000 });
  await symi.page.waitForFunction(() => (window.SamosApp.getState().learners.find((l) => l.id === "x1") || {}).nisia, null, { timeout: 10000 });
  check("Symi: the tutor signs in and Lee comes from Nisia (Tee's own learner)", true);

  /* 2. The classroom screen: the class and today's session saved to Nisia, and the code drawn from Nisia's key. */
  await symi.page.click("[data-sn-show]");
  await symi.page.waitForSelector(".sn-checkin .sn-code:not(:empty)", { timeout: 10000 }).catch(() => {});
  const failed = await symi.page.$(".sn-checkin .sn-err");
  const code = failed ? "" : (await symi.page.textContent(".sn-checkin .sn-code")).replace(/\s/g, "");
  const [saved] = await q("select (select count(*) from public.classes where client_ref = 'reg1')::int classes, (select count(*) from public.class_learners)::int learners, (select count(*) from public.class_sessions)::int sessions");
  check("Symi: Show check-in code saves a brand-new class, its learner and today's session to Nisia (the bug from 3 October)", !failed && code.length === 6 && saved.classes === 1 && saved.sessions === 1,
    failed ? await failed.textContent() : JSON.stringify(saved));

  /* 3. Lee checks in from Evia with the code on the screen. */
  const ev = await app({ width: 412, height: 915 });
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(([tok, enrol]) => {
    localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1");
    ["evia7-theme-picked", "evia7-shape-picked"].forEach((k) => localStorage.setItem(k, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna", start: "2026-01-05", end: "2027-12-01" }));
    localStorage.setItem("evia7-enrolment", JSON.stringify({ course: "bricklayer", live: true, college: "E2E College", learnerId: "0e2e0000-0000-0000-0000-0000000000c1", organisationId: "0e2e0000-0000-0000-0000-000000000001",
      enrolmentId: enrol, courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: "0e2e0000-0000-0000-0000-0000000000b2", name: "Lee Erna", employer: "Ployer Builders", start: "2026-01-05", end: "2027-12-01", joinedAt: new Date().toISOString() }));
    localStorage.setItem("evia7-nisia-auth", JSON.stringify(tok));
  }, [session(LEE, "aal1", "lee@e2e.test"), ENROL]);
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); });
  await ev.page.evaluate(() => window.eviaNisia.sync()).catch(() => {}); await ev.page.waitForTimeout(500);
  const card = await ev.page.evaluate(() => (window.eviaTodo.list().find((x) => x.ic === "checkin") || {}).title || "");
  check("Evia: during the class, “Check in to L2 Brickwork” is top of Lee's list (from Nisia's one “what's new” request)", /Check in to L2 Brickwork/.test(card), card);
  await ev.page.evaluate(() => window.eviaCheckIn.open()); await ev.page.waitForSelector("#ci-view .ci-code");
  await ev.page.fill("#ci-view .ci-code", code); await ev.page.click('#ci-view .ci-form button[type=submit]');
  await ev.page.waitForFunction(() => /checked in|Not checked in/.test(document.getElementById("ci-view").textContent), null, { timeout: 10000 });
  const done = await ev.page.textContent("#ci-view");
  check("Evia: Lee types the code and is checked in by Nisia", /You’re checked in/.test(done) && /L2 Brickwork/.test(done), done);

  /* 4. Symi ticks Lee; the tutor finishes the register after a two-hour class. */
  await symi.page.waitForFunction(() => /1 of 1 checked in/.test((document.querySelector(".sn-count") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
  check("Symi: the classroom screen ticks Lee in", /1 of 1 checked in/.test(await symi.page.textContent(".sn-count")), await symi.page.textContent(".sn-count"));
  await symi.page.click(".sn-checkin .sn-close");
  await symi.page.evaluate(() => window.SamosApp.mutate((st) => { const k = Object.keys(st.attendance).find((x) => x.startsWith("reg1:")), r = st.attendance[k].x1; r.runningSince = Date.now() - 2 * 3600e3; }));
  await symi.page.click("[data-finish-register]");
  await symi.page.waitForFunction(() => /Sent to Nisia|Not sent/.test((document.querySelector(".sn-bar") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
  const [att] = await q("select status, minutes, confirmed_at is not null confirmed, (select hours from public.otj_entries where id = a.id) hours from public.class_attendance a where enrolment_id = $1", [ENROL]);
  check("Symi: Finish sends the register; Nisia keeps Lee present for 2 hours, confirmed by the tutor, as college learning hours",
    /Sent to Nisia/.test(await symi.page.textContent(".sn-bar")) && att && att.status === "present" && att.minutes >= 119 && att.confirmed && Number(att.hours) >= 1.98, (await symi.page.textContent(".sn-bar")) + " " + JSON.stringify(att));

  /* 5. Lee's Evia: the college hours arrive (locked: the learner can't change them). */
  await ev.page.evaluate(() => window.eviaNisia.sync()).catch(() => {}); await ev.page.waitForTimeout(500);
  const hrs = await ev.page.evaluate(() => window.eviaData.list("hours").filter((h) => h.source === "college").map((h) => ({ m: h.minutes, d: h.description })));
  check("Evia: Lee's learning log has the 2 hours from college, with the class", hrs.length === 1 && hrs[0].m >= 119 && /L2 Brickwork/.test(hrs[0].d), JSON.stringify(hrs));

  /* 6. The employer's Paros: Lee's college attendance. */
  const par = await app({ width: 400, height: 860 });
  await par.page.goto(site + "/apps/paros/"); await signIn(par.page, "em@e2e.test");
  await par.page.waitForSelector("[data-id]", { timeout: 15000 }).catch(() => {});
  await par.page.click("[data-id]").catch(() => {}); await par.page.waitForSelector("[data-lt=college]", { timeout: 10000 }).catch(() => {});
  await par.page.click("[data-lt=college]").catch(() => {}); await par.page.waitForTimeout(600);
  const col = await par.page.textContent("[data-pane=college]").catch(() => "");
  check("Paros: the employer sees Lee at college: L2 Brickwork, 2 hours", /L2 Brickwork/.test(col) && /2h/.test(col), col);

  /* 7. Stage 2: the employer's witness testimony and behaviour ratings from Paros reach Lee's Evia. */
  await par.page.click("[data-lt=overview]"); await par.page.click("#doWitness");
  await par.page.waitForSelector("#wText");
  await par.page.fill("#wText", "Lee built a garden wall at the Ploughman job on his own: set out, bonded and pointed it neatly and checked it was plumb and level throughout.");
  await par.page.click("#wKsbs [data-k]").catch(() => {}); await par.page.click('#wRate [data-v="3"]'); await par.page.check("#wSign"); await par.page.click("#wSave");
  await par.page.waitForFunction(() => !document.querySelector("#wSave"), null, { timeout: 10000 }).catch(() => {});
  await par.page.click("#doRate"); await par.page.waitForSelector(".p-beh");
  for (const k of await par.page.$$eval(".p-beh", (x) => x.map((b) => b.dataset.k))) await par.page.click('.p-beh[data-k="' + k + '"] [data-v="3"]');
  await par.page.fill("#bNote", "Reliable and keen."); await par.page.click("#bSave");
  await par.page.waitForFunction(() => !document.querySelector("#bSave"), null, { timeout: 10000 }).catch(() => {});
  const [fb] = await q("select (select count(*) from public.witness_testimonies where enrolment_id = $1)::int w, (select count(*) from public.behaviour_ratings where enrolment_id = $1)::int b, (select count(*) from public.notifications where notification_type in ('witness_testimony','behaviour_rated'))::int told", [ENROL]);
  check("Paros: the employer signs a witness testimony and rates Lee's behaviours (through Nisia's actions; Lee is told)", fb.w === 1 && fb.b === 1 && fb.told === 2, JSON.stringify(fb));
  /* (Evia may already be syncing from before the employer sent them: sync until they're in, at most a few times.) */
  for (let i = 0; i < 4; i++) { await ev.page.evaluate(() => window.eviaNisia.sync()).catch(() => {}); if (await ev.page.evaluate(() => window.eviaData.list("supporting").filter((x) => String(x.id).startsWith("emp-")).length >= 2)) break; await ev.page.waitForTimeout(500); }
  const sup = await ev.page.evaluate(() => window.eviaData.list("supporting").filter((x) => String(x.id).startsWith("emp-")).map((x) => x.title).sort());
  check("Evia: both arrive in Lee's Supporting evidence (from the one “what's new” request)", sup.length === 2 && sup.includes("Employer feedback: behaviours") && sup.some((t) => /^Witness testimony/.test(t)), JSON.stringify(sup) + " " + warnings.join(" | "));

  /* 8. Attendance in Lee's My progress: a percentage and a calendar. */
  await ev.page.evaluate(() => { window.eviaChatKit && window.eviaChatKit.closeChat(); nav("learning"); }); await ev.page.waitForTimeout(900);
  const tile = await ev.page.textContent("#pv-attendance").catch(() => "");
  await ev.page.evaluate(() => window.eviaProgressDeep("attendance")); await ev.page.waitForSelector(".pv-acal-d", { timeout: 5000 }).catch(() => {});
  const greenToday = await ev.page.evaluate(() => { const d = new Date(), k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); const c = document.querySelector('.pv-acal-d[data-day="' + k + '"]'); return c ? c.className : "no cell " + k + " " + document.querySelectorAll(".pv-acal-d").length; });
  /* (The register started at 00:01, so Lee's check-in was late: today shows amber.) */
  check("Evia: My progress shows Lee's attendance, 100% (1 of 1, late), and today is amber (late) on the calendar", /100%/.test(tile) && /1 of 1 session/.test(tile) && /pv-a-late/.test(greenToday), tile + " " + greenToday);
  await ev.page.evaluate(() => { document.getElementById("modal-root").innerHTML = ""; });

  /* 9. Lee books tomorrow off in Evia: the tutor's Symi and the employer's Paros both see it. */
  const tm = new Date(Date.now() + 864e5), tmk = tm.getFullYear() + "-" + String(tm.getMonth() + 1).padStart(2, "0") + "-" + String(tm.getDate()).padStart(2, "0");
  const booked = await ev.page.evaluate((d) => window.eviaNisia.bookAbsence(d, d, "appointment", "Dentist"), tmk).catch((e) => ({ error: e.message }));
  const symiSees = await rpc("symi_absences", { p_from: tmk, p_to: tmk }, { sub: TEE, aal: "aal2" });
  const parosSees = await rpc("paros_absences", { p_enrolment: ENROL }, { sub: EM, aal: "aal2" });
  check("Evia: Lee books tomorrow off; the tutor (Symi) and the employer (Paros) both see “Dentist”",
    booked && booked.sent && symiSees.status === 200 && symiSees.body.some((a) => a.reason === "Dentist") && parosSees.status === 200 && parosSees.body.absences.some((a) => a.reason === "Dentist"), JSON.stringify({ booked, symi: symiSees.body, paros: parosSees.body && parosSees.body.absences }));

  /* 10. The rules: nobody else can do the tutor's job, and no app touched the class tables. */
  const lee = { sub: LEE, aal: "aal1" }, em = { sub: EM, aal: "aal2" }, tee = { sub: TEE, aal: "aal2" }, teeNoApp = { sub: TEE, aal: "aal1" };
  const [ses] = await q("select id from public.class_sessions limit 1");
  const tries = {
    learnerFinishes: await rpc("symi_finish_register", { p_session: ses.id, p_marks: [{ enrolment_id: ENROL, minutes: 600, status: "present" }] }, lee),
    employerReadsCheckins: await rpc("symi_checkins", { p_session: ses.id }, em),
    tutorWithoutApp: await rpc("symi_checkins", { p_session: ses.id }, teeNoApp),
    nobodyWhatsNew: await rpc("nisia_whats_new", {}, null),
    learnerSavesClass: await rpc("symi_save_class", { p_org: "0e2e0000-0000-0000-0000-000000000001", p_client_ref: "x", p_title: "Mine" }, lee),
    strangerOnRegister: await rpc("symi_finish_register", { p_session: ses.id, p_marks: [{ enrolment_id: "0e2e0000-0000-0000-0000-0000000000ff", minutes: 60, status: "present" }] }, tee),
    learnerWritesWitness: await rpc("paros_add_witness", { p_enrolment: ENROL, p_statement: "I saw myself do a brilliant job on the wall today, honestly.", p_rating: 3 }, lee),
    employerReadsAsAssessor: await rpc("milos_employer_feedback", { p_enrolment: ENROL }, em),
    employerConfirmsCollege: await rpc("paros_confirm_hours", { p_otj: (await q("select id from public.otj_entries where activity_type = 'college' limit 1"))[0].id, p_decision: "rejected", p_comment: "no" }, em),
    tutorRatesBehaviours: await rpc("paros_rate_behaviours", { p_enrolment: ENROL, p_ratings: { B1: 4 } }, tee),
  };
  check("Nisia refuses: a learner finishing a register, an employer reading check-ins, the tutor without the authenticator app, anyone not signed in, a learner making a class, someone not on the class, a learner writing their own witness testimony, an employer reading the assessor's view, an employer overruling college hours, a tutor rating as the employer",
    Object.values(tries).every((t) => t.status === 400), JSON.stringify(Object.fromEntries(Object.entries(tries).map(([k, v]) => [k, v.status + " " + (v.body && v.body.message || "")]))));
  const [after] = await q("select minutes from public.class_attendance where enrolment_id = $1", [ENROL]);
  check("…and Lee's hours are still the tutor's 2 hours", after.minutes >= 119 && after.minutes < 600, JSON.stringify(after));
  check("No app read or wrote a class table: everything went through Nisia's named actions", !tableTouches.length, tableTouches.join(", "));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test finished", false, e.stack || e.message); }
await browser.close(); server.close(); await pool.end();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

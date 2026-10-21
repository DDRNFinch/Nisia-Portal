/* Symi on Evia Portal, in a browser with a stand-in Supabase: a tutor signs in to Evia Portal from Symi, their learners come
   from Evia Portal (matched to the register's learner by name), "Show check-in code" shows the changing code Evia Portal checks
   (the same signature the database makes), a learner checking in with Evia ticks them and starts their timer, and the
   finished register goes to Evia Portal for the Evia Portal learners only.   Run: node tests/symi.test.mjs */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import nc from "node:crypto";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { explore } from "./explore.mjs";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
}).listen(0);
const url = "http://localhost:" + server.address().port + "/apps/symi/";
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + detail)); };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (aal) => b64({ alg: "HS256" }) + "." + b64({ sub: "u-priya", aal, amr: [{ method: "totp", timestamp: 1 }], role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, session_id: "s" }) + ".x";
const KEY = Buffer.from("0123456789abcdef0123456789abcdef");
const expected = (w) => { const sig = nc.createHmac("sha256", KEY).update("SES1:" + w).digest(); return { qr: "NISI:IN:1:SES1:" + w + ":" + sig.toString("base64url"), short: [...sig.subarray(0, 6)].map((x) => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[x % 31]).join("") }; };
const learner = (id, name, mine = true) => ({ learner_id: "L" + id, member_id: "ML" + id, name, enrolment_id: "E" + id, course_code: "bricklayer", course_title: "Bricklayer", status: "active", assessors: [{ member_id: mine ? "MT" : "M9", name: "Tutor", roles: ["tutor"] }] });
const posted = [];
let checkins = [], refuse = false, endedRefs = [];
function handle(route) {
  const q = route.request(), u = new URL(q.url()), p = u.pathname; let body = null; try { body = q.postData() ? JSON.parse(q.postData()) : null; } catch (_) {}
  const json = (d, st = 200) => route.fulfill({ status: st, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (q.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (p === "/auth/v1/token") return json({ access_token: jwt("aal1"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-priya", aud: "authenticated", email: "p.shah@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/auth/v1/user") return json({ id: "u-priya", aud: "authenticated", email: "p.shah@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] });
  if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
  if (/\/verify$/.test(p)) return json({ access_token: jwt("aal2"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-priya", aud: "authenticated", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/rest/v1/rpc/nisia_me") return json({ user_id: "u-priya", name: "Priya Shah", memberships: [{ organisation_id: "O1", organisation: "Walsall College", member_id: "MT", roles: ["tutor"] }] });
  if (p === "/rest/v1/rpc/nisia_college_learners") return json([learner(1, "Callum Hughes"), learner(2, "Amira Khan"), learner(3, "Not Mine", false)]);
  /* Classes the college set up in the Evia Portal portal: one is Priya's. */
  if (p === "/rest/v1/rpc/symi_my_classes") return json([{ id: "C9", organisation_id: "O1", client_ref: "nisia-c9", title: "L2 Bricklaying Thursday", course_code: "bricklayer", room: "Workshop 3", managed: true, updated_at: "2026-10-07T10:00:00Z",
    schedule: { day: "Thursday", start: "09:00", end: "15:30", breaks: [{ start: "12:00", end: "12:30" }], recurrence: { type: "weekly", interval: 1, weekdays: ["Thursday"], monthDays: [], startDate: "2026-10-08", endDate: "2027-07-15", anchorDate: "2026-10-08", onceDate: "" } },
    learners: [{ enrolment_id: "E1", name: "Callum Hughes" }, { enrolment_id: "E2", name: "Amira Khan" }] }]);
  if (p === "/rest/v1/rpc/symi_session_key") return json(KEY.toString("base64"));
  if (p === "/rest/v1/rpc/symi_my_ended_classes") return json(endedRefs);
  if (p === "/rest/v1/rpc/symi_absences") return json([{ id: "A1", enrolment_id: "E2", starts_on: "2000-01-01", ends_on: "2100-01-01", kind: "ill", reason: "Sickness", booked_by: "Amira Khan", booked_by_role: "learner" }]);
  if (p === "/rest/v1/rpc/nisia_book_absence") { posted.push({ t: "book", body }); return json({ id: "A2", from: body.p_from, to: body.p_to, reason: body.p_reason || "Holiday" }); }
  /* Symi asks Evia Portal through named actions only; it never touches the class tables. */
  if (/^\/rest\/v1\/(classes|class_learners|class_sessions|class_attendance)/.test(p)) { posted.push({ t: "TABLE " + p.slice(9), m: q.method() }); return json({ message: "Symi touched a table" }, 403); }
  if (p === "/rest/v1/rpc/symi_save_class") { posted.push({ t: "saveClass", body }); return json("CLS1"); }
  if (p === "/rest/v1/rpc/symi_open_session") { posted.push({ t: "openSession", body }); return json({ id: "SES1", status: "open" }); }
  if (p === "/rest/v1/rpc/symi_checkins") return json(checkins);
  if (p === "/rest/v1/rpc/symi_finish_register") { if (refuse) { refuse = false; return json({ code: "42501", message: "That class isn’t yours in Evia Portal." }, 400); } posted.push({ t: "finish", body }); return json(body.p_marks.length); }
  if (p.startsWith("/rest/v1/")) { posted.push({ t: p.slice(9), m: q.method(), body, s: u.search }); return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, body: "" }); }
  return json({ error: "not faked " + p }, 404);
}

const browser = await pw.chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-GB" }), page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.route(/supabase\.co/, handle);
  await page.goto(url + "update.json");
  /* A tutor who already uses Symi: a class today with two learners, one of them an Evia Portal learner by name. */
  await page.evaluate(() => {
    localStorage.clear();
    const d = new Date(), key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const L = [{ id: "x1", name: "Callum Hughes", externalId: "" }, { id: "x2", name: "Local Only", externalId: "" }, { id: "x3", name: "Amira Khan", externalId: "" }];
    localStorage.setItem("symi-last-seen-release-v1", "0.34.27");
    localStorage.setItem("samos.classroom.data", JSON.stringify({ settings: { teacherName: "Priya", centre: "" }, learners: L, teachingClasses: [], attendance: {}, history: [], resources: [], courses: [],
      classes: [{ id: "r1", name: "L2 Brickwork", day: "Monday", room: "Workshop 2", start: "00:01", end: "23:58", breaks: [], learners: L, courseCode: "bricklayer", recurrence: { type: "once", onceDate: key, startDate: key, endDate: key } }],
      activeClassId: "r1", view: "registers" }));
  });
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => window.SamosApp.openRegisters()); await page.waitForTimeout(500);
  const before = { chip: /Connect to Evia Portal/.test(await page.textContent("#nisiaButton")), bar: /Sign in to Evia Portal/.test(await page.textContent(".sn-bar")) };
  check("Symi works as before, with Connect to Evia Portal in the header and on the register", before.chip && before.bar, JSON.stringify(before));
  /* Evia's look: the bar along the bottom goes to each screen, and Symi's face in the middle opens her menu. */
  const look = {};
  for (const [tab, view] of [["learners", "learners"], ["resources", "resources"], ["home", "home"], ["registers", "registers"]]) {
    await page.click('.sy-nav [data-sy-tab="' + tab + '"]'); await page.waitForTimeout(250);
    look[tab] = (await page.evaluate(() => window.SamosApp.getState().view)) === view && await page.$eval('.sy-nav [data-sy-tab="' + tab + '"]', (b) => b.classList.contains("on"));
  }
  /* Classes sit with the registers, one pill apart; Resources has its own tabs (Course, College, Community, My resources). */
  await page.click('.sy-pills [data-sy-pill="classes"]'); await page.waitForTimeout(250);
  look.classes = await page.evaluate(() => window.SamosApp.getState().view === "classes" && document.querySelector('.sy-nav [data-sy-tab="registers"]').classList.contains("on"));
  await page.click('.sy-nav [data-sy-tab="resources"]'); await page.waitForTimeout(250);
  await page.waitForSelector(".sl-tabs");
  look.library = await page.evaluate(() => [...document.querySelectorAll(".sl-tabs [data-sl-tab]")].map((b) => b.dataset.slTab).join() === "course,college,community,mine" && document.querySelector('.sy-nav [data-sy-tab="resources"]').classList.contains("on"));
  await page.click('.sy-nav [data-sy-tab="registers"]'); await page.waitForTimeout(250);
  /* The face: what needs doing, then ways to make something new. */
  await page.click(".sy-nav [data-sy-face]"); await page.waitForTimeout(400);
  look.menu = await page.evaluate(() => document.body.classList.contains("evia-open")) && !(await page.isVisible(".sy-nav"));
  look.todo = await page.evaluate(() => !!document.querySelector("#samosContent .sy-todo") && document.querySelectorAll("#samosContent .sy-todo-new button").length === 6);
  await page.click("#samosClose"); await page.waitForTimeout(300);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200);
  look.finishClear = await page.evaluate(async () => { window.scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 200));
    const f = document.querySelector("[data-finish-register]"), n = document.querySelector(".sy-nav"); return !!f && f.getBoundingClientRect().bottom <= n.getBoundingClientRect().top; });
  await page.setViewportSize({ width: 1280, height: 800 }); await page.evaluate(() => window.scrollTo(0, 0));
  check("Symi looks like Evia: the bar (Registers, Learners, Resources, Timetable) goes to each screen, classes sit with registers, Resources has its Course/College/Community/My resources tabs, the face opens what needs doing, and nothing is hidden behind the bar on a phone", Object.values(look).every(Boolean), JSON.stringify(look));

  await page.click("#nisiaButton");
  await page.fill(".sn-auth #email", "p.shah@x"); await page.fill(".sn-auth #pw", "Str0ng-pass!"); await page.click(".sn-auth button[type=submit]");
  await page.waitForSelector(".sn-auth #c"); await page.fill(".sn-auth #c", "123456");
  await page.waitForFunction(() => document.querySelector("#nisiaButton.on"), null, { timeout: 8000 });
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => window.SamosApp.getState());
  const callum = st.learners.find((l) => l.id === "x1"), amira = st.learners.find((l) => l.name === "Amira Khan");
  check("Signed in, the tutor's own learners come from Evia Portal: matched to the register's learner by name, nobody else's",
    !!(callum && callum.nisia && callum.nisia.enrolmentId === "E1") && !!(amira && amira.nisia && amira.id === "x3") && !st.learners.some((l) => l.name === "Not Mine") && !st.learners.find((l) => l.id === "x2").nisia);
  const fromNisia = await page.evaluate(() => { const c = window.SamosApp.getState().classes.find((x) => x.id === "nisia-c9");
    return !!c && c.name === "L2 Bricklaying Thursday" && c.room === "Workshop 3" && c.start === "09:00" && c.recurrence.weekdays.join() === "Thursday" && c.recurrence.endDate === "2027-07-15" &&
      c.learners.map((l) => l.id).sort().join() === "x1,x3" && c.managed && !c.archived && c.breaks.length === 1 && c.breaks[0].start === "12:00" && c.breaks[0].end === "12:30"; });
  check("A class the college set up in Evia Portal is in the tutor's registers straight away: its days, times, breaks, dates, room and learners (matched to Symi's own)", fromNisia);
  await page.waitForSelector('[data-attendance-learner="x3"] .sn-mark');
  const offMark = await page.textContent('[data-attendance-learner="x3"] .sn-mark'), barNow = await page.textContent(".sn-bar");
  check("A day Amira booked off (in Evia) shows on the register before anyone arrives, and isn't counted as expected",
    /Off · Sickness/.test(offMark) && /0 of 1/.test(barNow) && /1 booked off/.test(barNow) && (await page.textContent('[data-attendance-learner="x2"] .sn-mark')) === "Mark", JSON.stringify({ offMark, barNow }));

  await page.waitForSelector("[data-sn-show]");
  const barText = await page.textContent(".sn-bar");
  await page.click("[data-sn-show]");
  await page.waitForSelector(".sn-checkin .sn-code:not(:empty)");
  await page.waitForTimeout(400);
  const w = Math.floor(Date.now() / 1000 / 20), shown = (await page.textContent(".sn-checkin .sn-code")).replace(/\s/g, "");
  const ok = [w, w - 1].some((x) => expected(x).short === shown);
  const sess = posted.find((x) => x.t === "openSession"), cls = posted.find((x) => x.t === "saveClass");
  check("Today's session goes to Evia Portal with what's taught from the class's scheme of work, and its KSBs (they go with each learner's hours to Evia and Milos)",
    !!sess && /Mixing mortar/.test(sess.body.p_lesson || "") && (sess.body.p_ksbs || []).length >= 8 && (sess.body.p_ksbs || []).includes("S14"), JSON.stringify(sess && sess.body));
  check("Show check-in code: the class, its Evia Portal learners and today's session go to Evia Portal, and the code is the one Evia Portal checks (changing every 20 seconds)",
    /0 of 1 checked in/.test(barText) && ok && !!(await page.$(".sn-checkin .sn-qr canvas, .sn-checkin .sn-qr img, .sn-checkin .sn-qr svg")) && !!cls && cls.body.p_client_ref === "r1" && cls.body.p_org === "O1" &&
    cls.body.p_enrolments.length === 2 && cls.body.p_enrolments.includes("E1") && !!sess && sess.body.p_class === "CLS1" && !posted.some((x) => /^TABLE/.test(x.t)), JSON.stringify({ shown, exp: expected(w).short, cls: cls && cls.body }));
  fs.mkdirSync(path.join(root, "tests", "shots"), { recursive: true });
  await page.screenshot({ path: path.join(root, "tests", "shots", "symi-checkin.png") });

  /* Callum checks in with Evia. */
  checkins = [{ enrolment_id: "E1", checked_in_at: new Date().toISOString(), late: false }];
  await page.waitForFunction(() => /1 of 1 checked in/.test(document.querySelector(".sn-count").textContent), null, { timeout: 8000 });
  const running = await page.evaluate(() => { const s = window.SamosApp.getState(), a = Object.entries(s.attendance).find(([k]) => k.startsWith("r1:")); return !!(a && a[1].x1 && a[1].x1.runningSince) && !(a[1].x2 && a[1].x2.runningSince); });
  const ticked = await page.evaluate(() => [...document.querySelectorAll(".sn-names li.on")].map((x) => x.textContent).join());
  await page.click(".sn-checkin .sn-close"); await page.waitForTimeout(400);
  const rowTick = !!(await page.$('[data-attendance-learner="x1"] .sn-tick')) && !(await page.$('[data-attendance-learner="x2"] .sn-tick'));
  check("A learner checking in with Evia is ticked on the screen and the register, and their timer starts (nobody else's)", running && /Callum Hughes/.test(ticked) && rowTick, JSON.stringify({ running, ticked, rowTick }));

  /* One tap marks: Callum was late after all; Amira's reason is the dentist; the tutor books Amira next week off. */
  await page.click('[data-attendance-learner="x1"] .sn-tick'); await page.click('.sn-marks [data-m="late"]'); await page.waitForTimeout(200);
  await page.click('[data-attendance-learner="x3"] .sn-mark'); await page.fill(".sn-why input", "Dentist"); await page.click(".sn-why button"); await page.waitForTimeout(200);
  const marksShown = { c: await page.textContent('[data-attendance-learner="x1"] .sn-mark'), a: await page.textContent('[data-attendance-learner="x3"] .sn-mark') };
  check("One tap marks: late for Callum, and Amira absent with a reason in the tutor's own words", /Late/.test(marksShown.c) && /Absent · Dentist/.test(marksShown.a), JSON.stringify(marksShown));
  await page.click('[data-attendance-learner="x3"] .sn-mark'); await page.click("[data-book]");
  await page.click('.sn-reasons [data-k="holiday"]'); await page.click("[data-save]"); await page.waitForTimeout(400);
  const book = posted.find((x) => x.t === "book");
  check("The tutor books days off for a learner from the register (Evia Portal tells everyone)", !!book && book.body.p_enrolment === "E2" && book.body.p_kind === "holiday" && !(await page.$(".sn-sheet")), JSON.stringify(book));

  /* Times: Callum came in 20 minutes before the tutor got to mark him; the tutor puts in when he really arrived. Then he
     leaves early for his niece: the tutor puts in when, and why. */
  const hhmm = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dayStart = new Date(); dayStart.setHours(0, 2, 0, 0);
  const T1 = Math.max(dayStart.getTime(), Date.now() - 20 * 60000), T2 = Math.max(T1 + 60000, Date.now() - 2 * 60000);
  const minuteOf = (ms) => { const d = new Date(ms); d.setSeconds(0, 0); return d.getTime(); };
  await page.click('[data-attendance-learner="x1"] .sn-mark');
  await page.fill('.sn-times [name=in]', hhmm(T1)); await page.click("[data-times]"); await page.waitForTimeout(300);
  const came = await page.evaluate((k) => { const t = window.SamosApp.times("r1", window.SamosApp.today(), "x1"), s = window.SamosApp.getState(), a = s.attendance["r1:" + window.SamosApp.today()].x1;
    return { in: t.in, out: t.out, running: !!a.runningSince }; });
  check("The tutor can change when a learner arrived (Callum came before he was marked): his time counts from then and his timer keeps going",
    came.in === minuteOf(T1) && came.out === null && came.running, JSON.stringify({ came, want: minuteOf(T1) }));
  await page.click('[data-attendance-learner="x1"] .sn-mark');
  const sheetTimes = await page.evaluate(() => ({ in: document.querySelector(".sn-times [name=in]").value, whyHidden: document.querySelector(".sn-left-why").hidden }));
  await page.fill('.sn-times [name=out]', hhmm(T2)); await page.dispatchEvent('.sn-times [name=out]', "input");
  const whyShows = await page.isVisible(".sn-left-why");
  await page.click('.sn-left-why [data-l="family"]'); await page.click("[data-times]"); await page.waitForTimeout(300);
  const went = await page.evaluate(() => { const t = window.SamosApp.times("r1", window.SamosApp.today(), "x1"), a = window.SamosApp.getState().attendance["r1:" + window.SamosApp.today()].x1;
    return { out: t.out, running: !!a.runningSince, label: document.querySelector('[data-attendance-learner="x1"] .sn-mark').textContent }; });
  check("Left early: the tutor puts in when and why (Family), his timer stops then, and the register says so",
    sheetTimes.in === hhmm(T1) && sheetTimes.whyHidden && whyShows && went.out === minuteOf(T2) && !went.running && went.label === "Late · left " + hhmm(T2), JSON.stringify({ sheetTimes, whyShows, went }));
  await page.click('[data-attendance-learner="x1"] .sn-mark');
  await page.fill('.sn-times [name=out]', hhmm(T1 - 60000)); await page.click("[data-times]");
  const refused = await page.textContent(".sn-times .sn-err-line");
  await page.click(".sn-sheet .sn-x");
  check("Leaving before arriving is refused, in plain words", /can’t leave before they arrive/.test(refused), refused);
  /* A learner who's only in Symi (not from Evia Portal) has a mark and times too. */
  await page.click('[data-attendance-learner="x2"] .sn-mark'); await page.waitForSelector(".sn-times");
  await page.fill('.sn-times [name=in]', hhmm(T1)); await page.click("[data-times]"); await page.waitForTimeout(300);
  const local = await page.evaluate(() => ({ in: window.SamosApp.times("r1", window.SamosApp.today(), "x2").in, label: document.querySelector('[data-attendance-learner="x2"] .sn-mark').textContent }));
  check("A learner only in Symi (not from Evia Portal) can be marked and have their times changed too", local.in === minuteOf(T1) && local.label === "Here", JSON.stringify(local));
  /* No signal in the classroom: the code still shows, from the key kept on this device. */
  await ctx.setOffline(true);
  await page.click("[data-sn-show]");
  await page.waitForSelector(".sn-checkin .sn-code:not(:empty)", { timeout: 8000 });
  const w2 = Math.floor(Date.now() / 1000 / 20), shown2 = (await page.textContent(".sn-checkin .sn-code")).replace(/\s/g, "");
  const offlineOk = [w2, w2 - 1].some((x) => expected(x).short === shown2) && await page.isVisible(".sn-signal");
  const screen = await page.evaluate(() => ({ count: document.querySelector(".sn-count").textContent, off: [...document.querySelectorAll(".sn-names li.off")].map((x) => x.textContent).join() }));
  check("With no signal the classroom code still works (the key was kept), says so, and shows who's booked off", offlineOk && /Amira Khan/.test(screen.off) && /1 of 1/.test(screen.count), JSON.stringify({ shown2, screen }));
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(root, "tests", "shots", "symi-checkin-offline.png") });
  await page.click(".sn-checkin .sn-close"); await ctx.setOffline(false); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(root, "tests", "shots", "symi-register-marks.png") });

  /* The tutor finishes the register. */
  await page.waitForTimeout(1500);
  refuse = true;
  await page.click("[data-finish-register]");
  await page.waitForFunction(() => /Not sent to Evia Portal yet/.test((document.querySelector(".sn-bar") || {}).textContent || ""), null, { timeout: 10000 }).catch(() => {});
  const failBar = await page.textContent(".sn-bar");
  check("If Evia Portal refuses a finished register, Symi says so and why (not 'waiting'), keeps it, and Try again sends it", /Not sent to Evia Portal yet/.test(failBar) && /isn’t yours/.test(failBar), failBar);
  await page.click("[data-sn-retry]");
  await page.waitForFunction(() => /Sent to Evia Portal/.test((document.querySelector(".sn-bar") || {}).textContent || ""), null, { timeout: 10000 }).catch(() => {});
  const fin = posted.find((x) => x.t === "finish"), att = fin ? fin.body.p_marks : [];
  check("Finishing the register sends each Evia Portal learner's time, late mark and reason to Evia Portal in one action (only Evia Portal learners), and never touches a table",
    !!fin && fin.body.p_session === "SES1" && att.length === 2 && att[0].enrolment_id === "E1" && att[0].status === "present" && att[0].late === true &&
    att[1].enrolment_id === "E2" && att[1].status === "absent" && att[1].reason === "Dentist" && att[1].minutes === 0 &&
    !posted.some((x) => /^TABLE/.test(x.t)) && /Sent to Evia Portal/.test(await page.textContent(".sn-bar")), JSON.stringify({ att, tables: posted.filter((x) => /^TABLE/.test(x.t)) }));
  check("The finished register takes each learner's times to Evia Portal: when Callum arrived, when he left early, and why",
    !!fin && att[0].arrived_at === new Date(minuteOf(T1)).toISOString() && att[0].left_at === new Date(minuteOf(T2)).toISOString() && att[0].left_reason === "Family" &&
    att[0].minutes === Math.round((minuteOf(T2) - minuteOf(T1)) / 60000) && att[1].arrived_at === null && att[1].left_at === null, JSON.stringify(att));
  /* Past registers: the tutor opens today's from the list, sees it in full, corrects a time, and downloads it. */
  await page.click("[data-register-list]"); await page.waitForTimeout(300);
  await page.click("[data-past-register]"); await page.waitForSelector(".sy-past");
  const past = await page.evaluate(() => [...document.querySelectorAll(".sy-past-row")].map((r) => r.textContent.replace(/\s+/g, " ").trim()));
  const callumRow = past.find((x) => /Callum Hughes/.test(x)) || "", amiraRow = past.find((x) => /Amira Khan/.test(x)) || "";
  check("A finished register opens from the list: each learner with their times and mark (Callum late and left early, Amira absent with her reason)",
    callumRow.includes(hhmm(T1) + "–" + hhmm(T2)) && /Late · left/.test(callumRow) && /Absent · Dentist/.test(amiraRow) && /Not here/.test(amiraRow), JSON.stringify(past));
  const sentBefore = posted.filter((x) => x.t === "finish").length;
  await page.click('[data-past-learner="x1"]'); await page.waitForSelector(".sn-times");
  await page.fill('.sn-times [name=in]', hhmm(T1 - 5 * 60000)); await page.click("[data-times]");
  for (let i = 0; i < 40 && posted.filter((x) => x.t === "finish").length <= sentBefore; i++) await page.waitForTimeout(250);
  const again = posted.filter((x) => x.t === "finish").slice(sentBefore)[0], c2 = again && again.body.p_marks.find((x) => x.enrolment_id === "E1");
  const rowNow = await page.evaluate(() => (document.querySelector('[data-past-learner="x1"]') || {}).textContent || "");
  check("Changing a time on a finished register updates it in Symi and sends it to Evia Portal again (where the change is kept)",
    !!c2 && c2.arrived_at === new Date(minuteOf(T1 - 5 * 60000)).toISOString() && c2.minutes === att[0].minutes + 5 && c2.left_reason === "Family" && rowNow.includes(hhmm(T1 - 5 * 60000)) && await page.isVisible(".sy-past"),
    JSON.stringify({ c2, rowNow }));
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), page.click("[data-download-register]")]);
  const csv = fs.readFileSync(await dl.path(), "utf8").replace(/^﻿/, "").split(/\r\n/);
  check("Download gives a spreadsheet of the register (opens in Excel): every learner, mark, arrival, leaving time and reasons",
    /^Register-.*\.csv$/.test(dl.suggestedFilename()) && csv[0].startsWith("Date,Class,Learner,Mark,Arrived,Left") &&
    csv.some((l) => /Callum Hughes,Late,/.test(l) && l.includes(hhmm(T1 - 5 * 60000)) && l.endsWith(",Family")) && csv.some((l) => /Amira Khan,Absent,.*Dentist/.test(l)), csv.join(" | "));
  await page.screenshot({ path: path.join(root, "tests", "shots", "symi-past-register.png") });
  await page.click(".staff-back"); await page.waitForTimeout(200);
  const [dl2] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), page.click("[data-download-registers]")]);
  check("Download all gives every past register in one spreadsheet", /^Registers-.*\.csv$/.test(dl2.suggestedFilename()) && fs.readFileSync(await dl2.path(), "utf8").split(/\r\n/).length >= 3, dl2.suggestedFilename());
  await page.click('.sy-nav [data-sy-tab="registers"]'); await page.waitForTimeout(300);
  /* A register made in Symi and ended in Evia Portal is put away in Symi too; and a register the tutor taps stays chosen. */
  await page.evaluate(() => window.SamosApp.mutate((s) => { s.classes.push({ id: "old1", name: "Old test", day: "Monday", start: "09:00", end: "10:00", breaks: [], learners: [], recurrence: { type: "weekly", interval: 1, weekdays: ["Monday"], startDate: "2026-01-01", endDate: "2027-01-01", anchorDate: "2026-01-01" } }); }));
  await page.click('.sy-nav [data-sy-tab="registers"]'); await page.waitForTimeout(300);
  const chosen = await page.evaluate(() => { const b = document.querySelector('[data-select-register="old1"]'); if (!b) return "no chip"; b.click(); return window.SamosApp.activeRegisterId(); });
  await page.waitForTimeout(400);
  const stays = await page.evaluate(() => window.SamosApp.activeRegisterId());
  endedRefs = ["old1"];
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { value: false, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  for (let i = 0; i < 20 && !await page.evaluate(() => (window.SamosApp.getState().classes.find((c) => c.id === "old1") || {}).archived); i++) await page.waitForTimeout(250);
  const putAway = await page.evaluate(() => ({ archived: !!(window.SamosApp.getState().classes.find((c) => c.id === "old1") || {}).archived, chip: !!document.querySelector('[data-select-register="old1"]') }));
  endedRefs = [];
  check("A register the tutor taps stays chosen, and one made in Symi then ended in Evia Portal leaves Symi's registers", chosen === "old1" && stays === "old1" && putAway.archived && !putAway.chip, JSON.stringify({ chosen, stays, putAway }));
  /* The tutor changes the class (weekly now, a new finish time): Evia Portal hears within a minute, not the next day, so
     learners' Evia shows the classes coming up. */
  const savedBefore = posted.filter((x) => x.t === "saveClass").length;
  await page.evaluate(() => {
    const d = new Date(), wd = d.toLocaleDateString("en-GB", { weekday: "long" });
    const iso = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
    const end = new Date(d); end.setDate(end.getDate() + 21);
    window.SamosApp.mutate((s) => { const r = s.classes.find((c) => c.id === "r1"); r.end = "23:59"; r.day = wd; r.recurrence = { type: "weekly", interval: 1, weekdays: [wd], startDate: iso(d), endDate: iso(end), anchorDate: iso(d) }; });
    window.dispatchEvent(new Event("online"));
  });
  for (let i = 0; i < 20 && posted.filter((x) => x.t === "saveClass").length <= savedBefore; i++) await page.waitForTimeout(250);
  const changed = posted.filter((x) => x.t === "saveClass").slice(savedBefore);
  check("Changing a class reaches Evia Portal straight away (new times and weekly dates), so Evia can show the classes coming up",
    changed.some((x) => x.body.p_schedule && x.body.p_schedule.end === "23:59" && x.body.p_schedule.recurrence && x.body.p_schedule.recurrence.type === "weekly"), JSON.stringify(changed.map((x) => x.body.p_schedule)));
  /* With the class weekly now, the register shows days off booked for the coming classes (Amira's booking), before the day. */
  await page.waitForFunction(() => /Coming up: Amira off/.test((document.querySelector(".sn-bar") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
  const ahead = await page.evaluate(() => ((document.querySelector(".sn-ahead") || {}).textContent || ""));
  await page.evaluate(() => { const b = document.querySelector(".sn-bar"); if (b) b.scrollIntoView({ block: "center" }); });
  await page.screenshot({ path: path.join(root, "tests", "shots", "symi-coming-up.png") });
  check("The register shows days off booked for the coming classes, before the day", /^Coming up: Amira off \w{3} \d{1,2} \w{3}, \w{3} \d{1,2} \w{3} and \w{3} \d{1,2} \w{3} \(Sickness\)$/.test(ahead), ahead);
  /* Explore: every tab, every button, as a new tutor would. */
  { const xp = await explore(page, { app: "Symi", tabSel: ".sy-nav [data-sy-tab]", skip: /present|full screen|start class|start question/, perScreen: 15, max: 350 });
    check("Explore Symi: " + xp.taps + " buttons on " + xp.screens + " screens, none breaks anything", xp.taps > 30 && !xp.problems.length, xp.problems.join("\n")); }
  check("No script errors", !errors.length, errors.join(" | "));
  await ctx.close();
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

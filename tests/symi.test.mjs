/* Symi on Nisia, in a browser with a stand-in Supabase: a tutor signs in to Nisia from Symi, their learners come
   from Nisia (matched to the register's learner by name), "Show check-in code" shows the changing code Nisia checks
   (the same signature the database makes), a learner checking in with Evia ticks them and starts their timer, and the
   finished register goes to Nisia for the Nisia learners only.   Run: node tests/symi.test.mjs */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import nc from "node:crypto";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
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
let checkins = [];
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
  if (p === "/rest/v1/rpc/symi_session_key") return json(KEY.toString("base64"));
  if (p === "/rest/v1/classes") { posted.push({ t: "classes", m: q.method(), body }); return json({ id: "CLS1" }); }
  if (p === "/rest/v1/class_learners" && q.method() === "GET") return json([]);
  if (p === "/rest/v1/class_sessions" && q.method() === "POST") { posted.push({ t: "class_sessions", m: "POST", body }); return json({ id: "SES1", status: "open" }); }
  if (p === "/rest/v1/class_attendance" && q.method() === "GET") return json(checkins);
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
  /* A tutor who already uses Symi: a class today with two learners, one of them a Nisia learner by name. */
  await page.evaluate(() => {
    localStorage.clear();
    const d = new Date(), key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const L = [{ id: "x1", name: "Callum Hughes", externalId: "" }, { id: "x2", name: "Local Only", externalId: "" }];
    localStorage.setItem("symi-last-seen-release-v1", "0.28.2");
    localStorage.setItem("samos.classroom.data", JSON.stringify({ settings: { teacherName: "Priya", centre: "" }, learners: L, teachingClasses: [], attendance: {}, history: [], resources: [], courses: [],
      classes: [{ id: "r1", name: "L2 Brickwork", day: "Monday", room: "Workshop 2", start: "00:01", end: "23:58", breaks: [], learners: L, recurrence: { type: "once", onceDate: key, startDate: key, endDate: key } }],
      activeClassId: "r1", view: "registers" }));
  });
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => window.SamosApp.openRegisters()); await page.waitForTimeout(500);
  const before = { chip: /Connect to Nisia/.test(await page.textContent("#nisiaButton")), bar: /Sign in to Nisia/.test(await page.textContent(".sn-bar")) };
  check("Symi works as before, with Connect to Nisia in the header and on the register", before.chip && before.bar, JSON.stringify(before));

  await page.click("#nisiaButton");
  await page.fill(".sn-auth #email", "p.shah@x"); await page.fill(".sn-auth #pw", "Str0ng-pass!"); await page.click(".sn-auth button[type=submit]");
  await page.waitForSelector(".sn-auth #c"); await page.fill(".sn-auth #c", "123456");
  await page.waitForFunction(() => document.querySelector("#nisiaButton.on"), null, { timeout: 8000 });
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => window.SamosApp.getState());
  const callum = st.learners.find((l) => l.id === "x1"), amira = st.learners.find((l) => l.name === "Amira Khan");
  check("Signed in, the tutor's own learners come from Nisia: matched to the register's learner by name, others added, nobody else's",
    !!(callum && callum.nisia && callum.nisia.enrolmentId === "E1") && !!(amira && amira.nisia) && !st.learners.some((l) => l.name === "Not Mine") && !st.learners.find((l) => l.id === "x2").nisia);

  await page.waitForSelector("[data-sn-show]");
  const barText = await page.textContent(".sn-bar");
  await page.click("[data-sn-show]");
  await page.waitForSelector(".sn-checkin .sn-code:not(:empty)");
  await page.waitForTimeout(400);
  const w = Math.floor(Date.now() / 1000 / 20), shown = (await page.textContent(".sn-checkin .sn-code")).replace(/\s/g, "");
  const ok = [w, w - 1].some((x) => expected(x).short === shown);
  const sess = posted.find((x) => x.t === "class_sessions"), cls = posted.find((x) => x.t === "classes"), cl = posted.find((x) => x.t === "class_learners" && x.m === "POST");
  check("Show check-in code: the class, its Nisia learners and today's session go to Nisia, and the code is the one Nisia checks (changing every 20 seconds)",
    /0 of 1 checked in/.test(barText) && ok && !!(await page.$(".sn-checkin .sn-qr canvas, .sn-checkin .sn-qr img, .sn-checkin .sn-qr svg")) && !!cls && cls.body.client_ref === "r1" && cls.body.tutor_member_id === "MT" &&
    !!cl && cl.body.length === 1 && cl.body[0].enrolment_id === "E1" && !!sess && sess.body.class_id === "CLS1", JSON.stringify({ shown, exp: expected(w).short, cl: cl && cl.body }));
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

  /* The tutor finishes the register. */
  await page.waitForTimeout(1500);
  await page.click("[data-finish-register]");
  await page.waitForFunction(() => /Sent to Nisia/.test((document.querySelector(".sn-bar") || {}).textContent || ""), null, { timeout: 10000 }).catch(() => {});
  const att = posted.filter((x) => x.t === "class_attendance").map((x) => x.body).flat(), fin = posted.find((x) => x.t === "class_sessions" && x.m === "PATCH");
  check("Finishing the register sends each Nisia learner's time to Nisia, confirmed by the tutor (only Nisia learners), and the session is closed",
    att.length === 1 && att[0].enrolment_id === "E1" && att[0].session_id === "SES1" && att[0].status === "present" && att[0].confirmed_by_member_id === "MT" && !!att[0].confirmed_at &&
    !!fin && fin.body.status === "finished" && /Sent to Nisia/.test(await page.textContent(".sn-bar")), JSON.stringify({ att, fin: fin && fin.body }));
  check("No script errors", !errors.length, errors.join(" | "));
  await ctx.close();
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

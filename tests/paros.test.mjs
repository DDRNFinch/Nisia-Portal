/* Paros, in a browser with a stand-in Supabase: an employer signs in, sees their apprentices, what was taught at
   college and their attendance, their evidence and what's still needed, confirms and queries learning hours, writes a
   witness testimony and rates behaviours.   Run: node tests/paros.test.mjs   (PAROS_TALL=1700 for tall screenshots) */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
}).listen(0);
const url = "http://localhost:" + server.address().port + "/apps/paros/";
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + detail)); };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (aal) => b64({ alg: "HS256" }) + "." + b64({ sub: "u-dave", aal, amr: [{ method: "totp", timestamp: 1 }], role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, session_id: "s" }) + ".x";
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const ROWS = [
  { organisation_id: "O1", organisation: "Walsall College", member_id: "ME", learner_id: "L1", enrolment_id: "E1", name: "Callum Hughes", course_code: "bricklayer", course_title: "Bricklayer", start_date: day(-120), end_date: day(600),
    employer_name: "Hughes & Sons", planned_otj_hours: 416, evidence: 5, evidence_4w: 2, signed_off: ["S14", "K20", "S1", "K1", "S6", "K12", "S20", "B1", "S12"], otj_hours: 58.5, to_confirm: 2, sessions: 6, attended: 5,
    college_minutes: 1900, last_session: day(-2), last_review: null, witness: 0, last_rating: null },
  { organisation_id: "O1", organisation: "Walsall College", member_id: "ME", learner_id: "L2", enrolment_id: "E2", name: "Jordan Price", course_code: "joiner", course_title: "Bench Joiner", start_date: day(-40), end_date: day(700),
    employer_name: "Hughes & Sons", planned_otj_hours: 400, evidence: 1, evidence_4w: 1, signed_off: [], otj_hours: 6, to_confirm: 0, sessions: 0, attended: 0, college_minutes: 0, last_session: null, last_review: null, witness: 1, last_rating: day(-10) + "T10:00:00Z" },
];
const DETAIL = {
  college: [{ id: "A1", date: day(-2), class: "L2 Brickwork", lesson: "Cavity walls: ties and insulation", ksbs: ["S11", "K22", "K5"], minutes: 375, status: "present", late: false },
    { id: "A2", date: day(-9), class: "L2 Brickwork", lesson: "Setting out", ksbs: ["S10", "K21"], minutes: 0, status: "absent", late: false }],
  evidence: [{ id: "ev1", title: "Mixing mortar", unit: "Mixing mortar", type: "photo", at: day(-30) + "T09:00:00Z", ksbs: ["S14", "K20"], decision: "accepted", signed: ["S14", "K20"] },
    { id: "ev2", title: "Jointing Styles", unit: "Jointing Styles", type: "photo", at: day(-3) + "T09:00:00Z", ksbs: ["S12"], decision: null }],
  otj: [{ id: "OT1", date: day(-4), type: "manual", description: "Toolbox talk on working at height", hours: 1, decision: null },
    { id: "OT2", date: day(-6), type: "evia", description: "Researched cavity tray detailing", hours: 1.5, decision: null },
    { id: "A1", date: day(-2), type: "college", description: "College · L2 Brickwork", hours: 6.25, decision: "approved" }],
  witness: [], ratings: [], reviews: [],
};
const posted = [];
function handle(route) {
  const q = route.request(), u = new URL(q.url()), p = u.pathname; let body = null; try { body = q.postData() ? JSON.parse(q.postData()) : null; } catch (_) {}
  const json = (d, st = 200) => route.fulfill({ status: st, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (q.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (p === "/auth/v1/token") return json({ access_token: jwt("aal1"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-dave", aud: "authenticated", email: "dave@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/auth/v1/user") return json({ id: "u-dave", aud: "authenticated", email: "dave@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] });
  if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
  if (/\/verify$/.test(p)) return json({ access_token: jwt("aal2"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-dave", aud: "authenticated", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/rest/v1/rpc/nisia_me") return json({ user_id: "u-dave", name: "Dave Hughes", memberships: [{ organisation_id: "O1", organisation: "Walsall College", member_id: "ME", roles: ["employer"] }] });
  if (p === "/rest/v1/rpc/paros_learners") return json(ROWS);
  if (p === "/rest/v1/rpc/nisia_absences") return json([{ id: "AB1", enrolment_id: "E1", starts_on: day(5), ends_on: day(9), kind: "holiday", reason: "Holiday", booked_by: "Callum Hughes", booked_by_role: "learner" }]);
  if (p === "/rest/v1/rpc/paros_absences") return json({ absences: [], marks: [{ id: "A2", date: day(-9), class: "L2 Brickwork", late: false, reason: "Dentist", here: false }, { id: "A1", here: true }] });
  /* Paros asks Nisia through named actions; writing a table directly is refused here. */
  if (p === "/rest/v1/rpc/paros_add_witness") { posted.push({ t: "witness", body }); return json("W9"); }
  if (p === "/rest/v1/rpc/paros_rate_behaviours") { posted.push({ t: "rate", body }); return json("BR9"); }
  if (p === "/rest/v1/rpc/paros_confirm_hours") { posted.push({ t: "confirm", body }); return json(null); }
  if (/^\/rest\/v1\/(witness_testimonies|behaviour_ratings|otj_confirmations|enrolments)/.test(p)) { posted.push({ t: "TABLE " + p }); return json({ message: "Paros touched a table" }, 403); }
  if (p === "/rest/v1/rpc/nisia_book_absence") { posted.push({ t: "book", body }); return json({ id: "AB2", from: body.p_from, to: body.p_to, reason: "At work" }); }
  if (p === "/rest/v1/rpc/paros_learner") return json(body.p_enrolment === "E1" ? DETAIL : { college: [], evidence: [], otj: [], witness: [{ id: "W0", statement: "Hung two doors well.", rating: 2, at: day(-10), ksbs: [], unit: "Doors" }], ratings: [], reviews: [] });
  if (p === "/rest/v1/enrolments") return json({ course_id: "C1" });
  if (q.method() === "POST" && p.startsWith("/rest/v1/")) { posted.push({ t: p.slice(9), body }); return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, body: "" }); }
  return json({ error: "not faked " + p }, 404);
}

const browser = await pw.chromium.launch();
try {
  const tall = Number(process.env.PAROS_TALL) || 0;
  const ctx = await browser.newContext({ viewport: { width: 400, height: tall || 860 }, deviceScaleFactor: tall ? 2 : 1, locale: "en-GB", serviceWorkers: "block" }), page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route(/supabase\.co/, handle);
  await page.goto(url);
  await page.fill("#email", "dave@x"); await page.fill("#pw", "Str0ng-pass!"); await page.click("button[type=submit]");
  await page.waitForSelector("#c"); await page.fill("#c", "123456"); /* goes by itself once 6 digits are in */
  await page.waitForSelector("[data-id=E1]");
  const shots = path.join(root, "tests", "shots"); fs.mkdirSync(shots, { recursive: true });
  await page.waitForTimeout(3000); await page.screenshot({ path: shots + "/p1-today.png", fullPage: true });
  const today = await page.textContent("#main");
  check("An employer signs in and sees their apprentices, hours to confirm and who needs feedback", /Callum Hughes/.test(today) && /Jordan Price/.test(today) && /Learning hours to confirm/.test(today) && /Your feedback/.test(today) && (await page.textContent("[data-tab=hours] .m-badge")) === "2");

  await page.click("[data-id=E1]"); await page.waitForSelector(".p-prog");
  const ov = await page.textContent("#main");
  await page.waitForTimeout(700); await page.screenshot({ path: shots + "/p2-apprentice.png", fullPage: true });
  check("An apprentice's overview: KSBs signed off, attendance, hours, next review, and the units still needed", /9\s*of 59/.test(ov) && /50%/.test(ov) && /1 of 2/.test(ov) && /Still needed/.test(ov) && /Build solid walling/.test(ov) && /next progress review/.test(ov), ov.slice(0, 300));

  await page.click("[data-lt=college]");
  const col = await page.textContent("[data-pane=college]");
  await page.waitForTimeout(700); await page.screenshot({ path: shots + "/p3-college.png", fullPage: true });
  check("College: each session from the tutor's register, what was taught with its KSBs, time attended or absent", /Cavity walls: ties and insulation/.test(col) && /6h 15m/.test(col) && /Absent|Off · /.test(col) && /K22/.test(col));
  await page.waitForSelector("#absBox .ab-row"); await page.waitForTimeout(300);
  const off = { list: await page.textContent("#absBox"), why: await page.textContent('[data-att="A2"] .pill') };
  check("…the days the apprentice booked off, and why they weren't at college", /Holiday/.test(off.list) && /Booked by Callum/.test(off.list) && /Off · Dentist/.test(off.why), JSON.stringify(off));
  await page.click("#absBox [data-book]"); await page.click('.ab-kinds [data-k="work"]'); await page.fill(".sheet [name=reason]", "Needed on site"); await page.click(".sheet [data-save]"); await page.waitForTimeout(500);
  const bk = posted.find((x) => x.t === "book");
  check("…and the employer books them days off (Nisia tells the college)", !!bk && bk.body.p_enrolment === "E1" && bk.body.p_kind === "work" && bk.body.p_reason === "Needed on site" && !(await page.$(".sheet")), JSON.stringify(bk));
  await page.screenshot({ path: shots + "/p3b-days-off.png", fullPage: true });

  await page.click("[data-lt=evidence]");
  const ev = await page.textContent("[data-pane=evidence]");
  check("Evidence: every unit's progress, and each piece with the assessor's decision", /Mixing mortar/.test(ev) && /8 of 8 signed off/.test(ev) && /Signed off/.test(ev) && /With the assessor/.test(ev), ev.slice(0, 300));

  /* Witness testimony. */
  await page.click("[data-lt=feedback]"); await page.click("#doWitness2");
  await page.selectOption("#wUnit", "1");
  await page.fill("#wText", "Callum pointed a garden wall at the Oak Road job on his own: he raked out the joints, mixed a matching mortar and finished a neat bucket-handle joint, checking the line as he went.");
  await page.click("#wKsbs [data-k=S12]"); await page.click("#wKsbs [data-k=B6]");
  await page.click("#wRate [data-v='3']"); await page.click("#wSave");
  await page.waitForTimeout(300);
  const needSign = /Tick to confirm/.test(await page.textContent("#wErr"));
  await page.screenshot({ path: shots + "/p4-witness.png" });
  await page.check("#wSign"); await page.click("#wSave"); await page.waitForTimeout(800);
  const w = posted.find((x) => x.t === "witness");
  check("A witness testimony: the unit, what they saw, the KSBs ticked and how well, signed as seen first hand (one action; Nisia signs and checks it)", needSign && !!w && w.body.p_unit === "Jointing Styles" && w.body.p_ksbs.join() === "S12,B6" && w.body.p_rating === 3 && w.body.p_enrolment === "E1" && /Oak Road/.test(w.body.p_statement), JSON.stringify(w && w.body));

  /* Behaviours. */
  await page.click("#doRate2");
  await page.waitForSelector(".p-beh");
  const beh = await page.$$eval(".p-beh", (x) => x.map((b) => b.dataset.k));
  await page.click("#bSave"); const incomplete = /to go/.test(await page.textContent("#bErr"));
  for (const k of beh) await page.click('.p-beh[data-k="' + k + '"] [data-v="3"]');
  await page.fill("#bNote", "Reliable and safe on site."); await page.screenshot({ path: shots + "/p5-behaviours.png" });
  await page.click("#bSave"); await page.waitForTimeout(600);
  const br = posted.find((x) => x.t === "rate");
  check("Rating behaviours: each of the course's behaviours (all needed), with a comment", beh.join() === "B1,B2,B3,B4,B5,B6" && incomplete && !!br && Object.keys(br.body.p_ratings).length === 6 && br.body.p_ratings.B1 === 3 && /Reliable/.test(br.body.p_comment));

  /* Hours. */
  await page.click("#backBtn"); await page.click("[data-tab=hours]"); await page.waitForSelector("[data-ok]");
  const hoursText = await page.textContent("#main");
  await page.screenshot({ path: shots + "/p6-hours.png", fullPage: true });
  await page.click("[data-ok=OT1]"); await page.waitForTimeout(500);
  await page.click("[data-q=OT2]"); await page.fill("#qWhy", "He was on holiday that day."); await page.click("#qSend"); await page.waitForTimeout(500);
  const conf = posted.filter((x) => x.t === "confirm").map((x) => x.body);
  check("Learning hours: the apprentice's own hours to confirm (not college hours, already confirmed by the tutor), confirmed or queried with a reason",
    /Toolbox talk/.test(hoursText) && !/College · L2 Brickwork/.test(hoursText) && conf.length === 2 && conf[0].p_decision === "approved" && conf[0].p_otj === "OT1" && conf[1].p_decision === "rejected" && /holiday/.test(conf[1].p_comment) && !(await page.$("[data-ok]")), JSON.stringify(conf));
  check("Paros never wrote to a table: everything went through Nisia's named actions", !posted.some((x) => /^TABLE/.test(x.t)), JSON.stringify(posted.filter((x) => /^TABLE/.test(x.t))));
  check("No script errors", !errors.length, errors.join(" | "));
  await ctx.close();
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

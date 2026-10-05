/* Milos browser test with a stand-in Supabase: an assessor signs in, sees whose review is due, opens a learner,
   starts a progress review filled in from Evia, completes it with three signatures, and it's saved to Nisia with
   new targets and downloaded as a PDF.   Run: node tests/milos.test.mjs */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
}).listen(0);
const url = "http://localhost:" + server.address().port + "/apps/milos/";
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + detail)); };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (aal) => b64({ alg: "HS256" }) + "." + b64({ sub: "u-mark", aal, amr: [{ method: "totp", timestamp: 1 }], role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, session_id: "s" }) + ".x";
const day = (n) => new Date(Date.now() + n * 864e5).toISOString();
const start = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10), end = new Date(Date.now() + 330 * 864e5).toISOString().slice(0, 10);
const LEARNER = { learner_id: "L1", member_id: "ML", name: "Callum Hughes", email: "x@learners.nisia.invalid", enrolment_id: "E1", course_code: "bricklayer", course_title: "Bricklayer", start_date: start, end_date: end, status: "active", employer_name: "Hughes & Sons Builders", planned_otj_hours: 416, assessors: [{ member_id: "M2", name: "Mark Ellis" }], paired: true, evidence: 3, otj_hours: 120, last_activity: day(-2) };
const SNAPSHOT = { at: day(-1), course: "bricklayer", ksb: { met: 21, total: 59, pct: 36, timePct: 55 }, units: [{ name: "Cavity walling", total: 12, missing: ["K4", "K5", "S3"], started: true, packs: 1, strength: "weak" }, { name: "Setting out", total: 8, missing: [], started: true, packs: 2, strength: "strong" }, { name: "Mixing mortar", total: 8, missing: [], started: true, packs: 1, strength: "strong" }, { name: "Jointing Styles", total: 8, missing: [], started: true, packs: 1, strength: "good" }],
  packs: 3, otj: { total: 120, month: 12, week: 2 }, writeupCoverage: 64, tests: [{ type: "epa", name: "EPA mock", count: 2, best: 70, latest: { pct: 70 } }, { type: "maths", name: "Maths", count: 1, best: 60, latest: { pct: 60 } }],
  confidence: { practise: ["Reading drawings"], confident: ["Mixing mortar"], scores: [{ area: "Reading drawings", score: 2 }, { area: "Mixing mortar", score: 4 }] }, maths: true, english: false,
  teach: { medals: { gold: 3, silver: 2, bronze: 1 }, subjects: [{ id: "course", name: "Bricklayer", areasDone: 4, areas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], avg: 82 }, { id: "maths", name: "Maths", areasDone: 2, areas: [1, 2, 3, 4, 5, 6], avg: 71 }, { id: "edi", name: "EDI and safeguarding", areasDone: 3, areas: [1, 2, 3, 4], avg: 90 }] } };

const posted = [];
/* Nisia's packs: your Bricklayer pack, and the college's own copy of it, which Callum (E1) is on. */
let PACKMOVE = null;
const PACKS = (() => {
  const seed = fs.readFileSync(path.join(root, "services/supabase/packs-seed.sql"), "utf8"), std = fs.readFileSync(path.join(root, "services/supabase/standards-seed.sql"), "utf8");
  const brick = [...seed.matchAll(/save_pack\((\$[a-z]+\$)([\s\S]*?)\1::jsonb/g)].map((m) => JSON.parse(m[2])).find((x) => x.course === "bricklayer");
  const ksbs = [...std.matchAll(/save_standard\((\$[a-z]+\$)([\s\S]*?)\1::jsonb/g)].map((m) => JSON.parse(m[2])).find((x) => x.code === "ST0095").requirements.map((r) => [r.code, r.title]);
  const one = (id, code, title) => ({ id, code, title, course: "bricklayer", version: 1, hash: "h" + id, standard: { code: "ST0095", kind: "standard", version: "1.2", option: null }, topics: brick.content.topics, ksbs });
  return () => ({ packs: [one("k0", "nisia-bricklayer", "Bricklayer"), one("kc", "college-1", "Brookfield bricklaying")], courses: { bricklayer: "k0" }, enrolments: { E1: PACKMOVE ? PACKMOVE.p_pack : "kc" } });
})();
let GONE = false, EXTRA = false, NOEMP = false; /* NOEMP: a Nisia without milos_employer_feedback yet */ /* EXTRA: a learner added in Nisia while Milos is open */ /* the learner deleted ev3 in Evia after Milos downloaded it */
function handle(route) {
  const q = route.request(), u = new URL(q.url()), p = u.pathname; let body = null; try { body = q.postData() ? JSON.parse(q.postData()) : null; } catch (_) {}
  const json = (d, st = 200) => route.fulfill({ status: st, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (q.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  const one = /vnd\.pgrst\.object/.test(q.headers()["accept"] || "");
  if (p === "/auth/v1/token") return json({ access_token: jwt("aal1"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-mark", aud: "authenticated", email: "m.ellis@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/auth/v1/user") return json({ id: "u-mark", aud: "authenticated", email: "m.ellis@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] });
  if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
  if (/\/verify$/.test(p)) return json({ access_token: jwt("aal2"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-mark", aud: "authenticated", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/rest/v1/rpc/nisia_me") return json({ user_id: "u-mark", platform_admin: false, name: "Mark Ellis", memberships: [{ organisation_id: "O1", organisation: "Brookfield College", member_id: "M2", roles: ["assessor"] }] });
  if (p === "/rest/v1/rpc/nisia_packs") return json(PACKS());
  if (p === "/rest/v1/rpc/set_enrolment_pack") { PACKMOVE = body; return json(null); }
  if (p === "/rest/v1/rpc/milos_employer_feedback" && NOEMP) return json({ code: "PGRST202", message: "Could not find the function public.milos_employer_feedback" }, 404);
  if (p === "/rest/v1/rpc/milos_employer_feedback") return json({ witness: [{ id: "W1", unit: "Jointing Styles", statement: "Callum pointed a full elevation in a bucket handle joint.", rating: 3, ksbs: ["S12", "B6"], signed_at: "2026-09-30T10:00:00Z", created_at: "2026-09-30T10:00:00Z" }], ratings: [{ id: "BR1", ratings: { B1: 3, B2: 4, B3: 2 }, comment: "Reliable and keen.", created_at: "2026-09-30T10:00:00Z" }] });
  if (p === "/rest/v1/rpc/nisia_absences") return json([{ id: "AB1", enrolment_id: "E1", starts_on: "2099-01-05", ends_on: "2099-01-05", kind: "appointment", reason: "Hospital appointment", booked_by: "Sam Tutor", booked_by_role: "tutor" }]);
  if (p === "/rest/v1/rpc/nisia_college_learners") return json([LEARNER, { ...LEARNER, learner_id: "L2", enrolment_id: "E2", name: "Not Mine", assessors: [{ member_id: "M9", name: "Someone else" }] }].concat(EXTRA ? [{ ...LEARNER, learner_id: "L3", enrolment_id: "E3", name: "New Starter" }] : []));
  if (p === "/rest/v1/enrolments") return json(one ? { id: "E1", organisation_id: "O1", course_id: "C1", learner_id: "L1", start_date: start, end_date: end, status: "active", planned_otj_hours: 416, employer_name: "Hughes & Sons Builders", employer_contact_name: "Dave Hughes" } : []);
  if (p === "/rest/v1/evia_records") return json([
    { collection: "snapshot", record_id: "current", data: SNAPSHOT },
    { collection: "targets", record_id: "t1", data: { id: "t1", course: "bricklayer", title: "Log 10 learning hours", due: day(-5), metAt: null } },
    { collection: "reviews", record_id: "r1", data: { id: "r1", date: day(-3), reflection: { feelsSafe: "Yes", knowsReporting: "Yes", changes: "No", hsIncident: "Yes", hsDetail: "Cut my hand on a brick, first aid given.", otjHappening: "Mostly", learnerFeedback: "Enjoying the cavity work.", support: "Help with reading drawings.", nextSteps: "Level 3 next year." } } }]);
  if (p === "/rest/v1/reviews" && q.method() === "GET") return json(u.searchParams.get("select") === "enrolment_id,reviewed_at" ? [] : []);
  if (GONE && p === "/rest/v1/evidence" && u.searchParams.get("id") === "eq.ev3") return json([]);
  if (p === "/rest/v1/evidence" && q.method() === "POST") { posted.push({ table: "evidence", body }); return json(null, 201); }
  if (p === "/rest/v1/evidence_files" && q.method() === "POST") { posted.push({ table: "evidence_files", body }); return json(null, 201); }
  if (p.startsWith("/storage/v1/object/evidence/") && q.method() === "POST") { posted.push({ table: "storage", body: p }); return json({ Key: p }); }
  if (p === "/rest/v1/evidence") return json([
    { id: "ev1", organisation_id: "O1", title: "Construct Cavity Walling", evidence_type: "photo", created_at: day(-10), source_metadata: { collection: "evidence", unit: "Construct Cavity Walling", ksbs: ["S11", "K22", "S5"], text: "Built a cavity wall in stretcher bond with ties every 450 mm, fitted the insulation batts and fire stopping around the openings, and kept the cavity clean. I checked the drawings and specification first and wore my PPE the whole time.", photoIds: ["p1", "p2"] } },
    { id: "ev2", organisation_id: "O1", title: "Mixing mortar", evidence_type: "photo", created_at: day(-200), source_metadata: { collection: "evidence", unit: "Mixing mortar", ksbs: ["S14"] } },
    { id: "ev3", organisation_id: "O1", title: "Structural carcassing", evidence_type: "photo", created_at: day(-5), source_metadata: { collection: "evidence", unit: "Structural carcassing", ksbs: [] } },
    { id: "ev5", organisation_id: "O1", title: "Jointing Styles", evidence_type: "photo", created_at: day(-2), client_reference: "observation:ev5", source_metadata: { collection: "observation", unit: "Jointing Styles", observedBy: "Mark Ellis", observedOn: day(-2).slice(0, 10), ksbs: ["S12", "K17"], text: "Pointed the joints." } },
    { id: "ev4", organisation_id: "O1", title: "Site induction.pdf", evidence_type: "document", created_at: day(-3), client_reference: "supporting:s1", source_metadata: { collection: "supporting", ksbs: [] } }]);
  if (p === "/rest/v1/assessments" && q.method() === "GET") return json(posted.filter((x) => x.table === "assessments").map((x) => x.body).concat([{ id: "A0", evidence_id: "ev2", decision: "accepted", feedback: null, ksbs: ["S14", "K20"], created_at: day(-190), assessor_member_id: "M1" }, { id: "A5", evidence_id: "ev5", decision: "accepted", feedback: null, ksbs: ["S12", "K17"], created_at: day(-2), assessor_member_id: "M2" }]));
  if (GONE && p === "/rest/v1/assessments" && q.method() === "POST" && body.evidence_id === "ev3") return json({ code: "42501", message: 'new row violates row-level security policy for table "assessments"' }, 403);
  if (p === "/rest/v1/assessments" && q.method() === "POST") { posted.push({ table: "assessments", body }); return json({ id: "A1", ...body, created_at: new Date().toISOString() }, 201); }
  if (p === "/rest/v1/evidence_files") return json([{ evidence_id: "ev1", storage_path: "O1/ev1/a.jpeg", mime_type: "image/jpeg" }, { evidence_id: "ev1", storage_path: "O1/ev1/b.jpeg", mime_type: "image/jpeg" }]);
  if (p === "/storage/v1/object/sign/evidence") return json(body.paths.map((x) => ({ path: x, signedURL: "/object/sign/evidence/" + x + "?token=t", error: null })));
  if (p.startsWith("/storage/v1/object/sign/evidence/")) return route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10' fill='#c96'/></svg>" });
  if (p === "/rest/v1/otj_entries") return json([{ activity_date: day(-20).slice(0, 10), hours: 7.5 }, { activity_date: day(-150).slice(0, 10), hours: 112.5 }]);
  if (q.method() === "POST" && p.startsWith("/rest/v1/")) { posted.push({ table: p.slice(9), body }); return json(p === "/rest/v1/reviews" ? { id: "REV1" } : null, 201); }
  return json({ error: "not faked " + p }, 404);
}

/* Every file Milos loads is in its offline copy (sw.js), or Milos can't open without signal. */
{
  const dir = path.join(root, "apps", "milos"), sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
  const listed = new Set(sw.match(/FILES = \[([\s\S]*?)\];/)[1].match(/"([^"]+)"/g).map((x) => path.normalize(path.join(dir, x.slice(1, -1)))));
  const need = new Set(), seen = new Set();
  const walk = (f) => { if (seen.has(f)) return; seen.add(f); need.add(f); for (const m of fs.readFileSync(f, "utf8").matchAll(/from "(\.[^"]+)"/g)) walk(path.normalize(path.join(path.dirname(f), m[1]))); };
  walk(path.join(dir, "app.js"));
  for (const m of fs.readFileSync(path.join(dir, "index.html"), "utf8").matchAll(/(?:src|href)="(\.[^"]+\.(?:js|css))"/g)) need.add(path.normalize(path.join(dir, m[1])));
  const missing = [...need].filter((f) => !listed.has(f)).map((f) => path.relative(root, f));
  check("Every file Milos loads is in its offline copy", !missing.length, "missing from sw.js: " + missing.join(", "));
}
const browser = await pw.chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 400, height: Number(process.env.MILOS_TALL) || 860 }, deviceScaleFactor: process.env.MILOS_TALL ? 2 : 1, acceptDownloads: true, locale: "en-GB" });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route(/supabase\.co/, handle);
  await page.goto(url);
  await page.fill("#email", "m.ellis@x"); await page.fill("#pw", "Str0ng-pass!"); await page.click("button[type=submit]");
  await page.waitForSelector("#c"); await page.fill("#c", "123456"); /* goes by itself once 6 digits are in */
  await page.waitForSelector("[data-id=L1]");
  const shots = path.join(root, "tests", "shots"); fs.mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: shots + "/m1-home.png", fullPage: true });
  const homeText = await page.textContent("#main");
  check("Milos lists only the assessor's own learners, with the review overdue", /Callum Hughes/.test(homeText) && !/Not Mine/.test(homeText) && /Overdue by/.test(homeText));
  /* The other tabs: learners with search, one queue of new evidence across learners, and reviews by when they're due. */
  await page.click("[data-tab=learners]"); await page.waitForSelector("#q"); await page.fill("#q", "hug"); await page.waitForTimeout(300);
  await page.screenshot({ path: shots + "/m1b-learners.png", fullPage: true });
  const found = await page.$$eval("#list [data-id]", (b) => b.length), ringShown = !!(await page.$("#list .m-ring"));
  await page.fill("#q", "zzz"); await page.waitForTimeout(300); const none = /Nobody matches/.test(await page.textContent("#main")); await page.fill("#q", "");
  await page.click("[data-tab=assess]"); await page.waitForSelector("[data-q]"); await page.screenshot({ path: shots + "/m1c-assess.png", fullPage: true });
  const queue = await page.$$eval("[data-q]", (b) => b.map((x) => x.textContent)), badge = await page.textContent("[data-tab=assess] .m-badge");
  await page.click("[data-tab=reviews]"); await page.waitForTimeout(200); await page.screenshot({ path: shots + "/m1d-reviews.png", fullPage: true });
  const revText = await page.textContent("#main");
  check("Learners search, one To assess queue across learners, and reviews by when they're due", found === 1 && ringShown && none && queue.length === 3 && badge === "3" && queue.some((t) => /Construct Cavity Walling/.test(t)) && /Overdue/.test(revText) && /Callum Hughes/.test(revText), JSON.stringify({ found, ringShown, none, queue, badge }));
  await page.click("[data-tab=today]"); await page.waitForSelector("[data-id=L1]");
  await page.click("[data-id=L1]"); await page.waitForSelector("#rev"); await page.waitForTimeout(300);
  await page.screenshot({ path: shots + "/m2-learner.png", fullPage: true });
  const lt = await page.textContent("#main");
  const packCard = await page.textContent(".m-card:has(#packBtn)").catch(() => "");
  await page.click("#packBtn"); await page.check(".sheet input[value=k0]"); await page.click("#pkF [type=submit]"); await page.waitForFunction(() => !document.querySelector(".sheet #pkF"));
  check("A learner's pack shows on their Overview (here the college's own), and their assessor can move them onto Nisia's", /Brookfield bricklaying/.test(packCard) && /college’s own/.test(packCard) && PACKMOVE && PACKMOVE.p_enrolment === "E1" && PACKMOVE.p_pack === "k0" &&
    /Bricklayer · Nisia’s/.test(await page.textContent(".m-card:has(#packBtn)")), packCard + " " + JSON.stringify(PACKMOVE));
  check("The learner page shows what's signed off and hours", /KSBs signed off/.test(lt) && /120 h/.test(lt));
  await page.waitForSelector("#absBox .ab-row");
  const emp = await page.textContent(".m-employer").catch(() => "");
  check("…and what the employer sent from Paros: behaviours and witness testimonies", /From Hughes & Sons Builders/.test(emp) && /Reliable and keen/.test(emp) && /bucket handle joint/.test(emp) && /Excellent/.test(emp) && /Developing/.test(emp), emp.slice(0, 300));
  NOEMP = true;
  const noEmp = await page.evaluate(async () => { const m = await import("./store.js"); const D = await m.refreshLearner((await m.learnerData({ enrolment_id: "E1" })).L.row); return { pf: !!D.P, kept: D.E.witness.length === 1 && D.E.ratings.length === 1 }; }).catch((e) => ({ error: e.message }));
  NOEMP = false;
  check("If Nisia can't send the employer's feedback, the learner's work still downloads (and the last copy is kept)", noEmp.pf && noEmp.kept, JSON.stringify(noEmp));
  check("…and their days off, with who booked them", /Hospital appointment/.test(await page.textContent("#absBox")) && /Sam Tutor \(tutor\)/.test(await page.textContent("#absBox")));
  await page.click("#tab-portfolio"); await page.waitForSelector(".pf-unit"); await page.screenshot({ path: shots + "/m2a-portfolio.png", fullPage: true });
  check("Milos shows Evia's evidence strength on units, and a compact From Evia panel", await page.$$eval(".pf-unit .sbars", (b) => b.length) >= 2 && !!(await page.$(".pf-unit .sbars-strong")) &&
    /Evidence strength/.test(await page.textContent(".insights")) && /EPA mock\s*70%/.test(await page.textContent(".insights")) && /Reading drawings\s*2/.test(await page.textContent(".insights")));
  check("Milos shows how steadily evidence has come in over 12 weeks", await page.$$eval(".consistency .cs-w", (w) => w.length) === 12 && /of 12 weeks/.test(await page.textContent(".consistency")));
  /* An observation, captured the way Evia captures evidence, then signed off. */
  await page.click("#tab-overview"); await page.click("#obs"); await page.waitForSelector(".obs-units [data-u]");
  await page.click('.obs-units [data-u="0"]'); await page.waitForSelector("#obText");
  const obsPrompts = await page.textContent(".obs");
  await page.setInputFiles("#obPick", [0, 1].map((i) => ({ name: "p" + i + ".png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") })));
  await page.waitForSelector(".obs-photos figure:nth-child(2)");
  await page.fill("#obText", "Callum mixed mortar at a 4:1 ratio using the silo, gauging each batch, and wore his PPE throughout. He explained the safety signage to the labourer.");
  const mentionOn = await page.$$eval("#obMention .chip.on", (c) => c.map((x) => x.textContent));
  await page.screenshot({ path: shots + "/m2c-observation.png", fullPage: true });
  await page.click("#obNext"); await page.waitForSelector("#obSave");
  const obsTicks = await page.$$eval(".ksb-row input", (els) => els.filter((x) => x.checked).map((x) => x.value));
  await page.uncheck('.ksb-row input[value="B1"]'); await page.fill("#obFb", "Well-gauged mortar.");
  await page.click("#obSave"); await page.waitForSelector(".obs", { state: "detached", timeout: 8000 }); await page.waitForSelector(".pf-unit", { state: "attached" });
  const ev = posted.find((x) => x.table === "evidence"), a = posted.filter((x) => x.table === "assessments").pop();
  check("An observation is captured like Evia (unit prompts, photos, things to mention ticking off), then signed off and saved to Nisia",
    /Things to capture/.test(obsPrompts) && /silos/.test(obsPrompts) && mentionOn.some((t) => /ratio/.test(t)) && mentionOn.some((t) => /safety signage/.test(t)) &&
    obsTicks.join() === "S14,K20,S1,K1,S6,K12,S20,B1" && ev && ev.body.source_metadata.collection === "observation" && ev.body.created_by_member_id === "M2" && ev.body.source_metadata.unit === "Mixing mortar" &&
    posted.filter((x) => x.table === "storage").length === 3 && posted.some((x) => x.table === "storage" && /\/observation\.pdf$/.test(x.body)) &&
    posted.filter((x) => x.table === "evidence_files" && x.body.evidence_id === ev.body.id).length === 3 && posted.some((x) => x.table === "evidence_files" && x.body.mime_type === "application/pdf" && x.body.size_bytes > 1000) &&
    a && a.body.evidence_id === ev.body.id && a.body.decision === "accepted" && !a.body.ksbs.includes("B1") && a.body.ksbs.length === 7, JSON.stringify({ mentionOn, obsTicks, ev: ev && ev.body, a: a && a.body }));
  const units = await page.$$eval(".pf-unit .pf-name > b", (els) => els.map((x) => x.textContent));
  check("The portfolio lists the course's units in Evia's order, then other units and supporting evidence", units[0] === "Mixing mortar" && units[7] === "Construct Cavity Walling" && units.at(-2) === "Other units" && units.at(-1) === "Supporting evidence");
  check("New evidence is highlighted and counted; assessed evidence shows as signed off", /3 new to assess/.test(await page.textContent("#pfBox")) && !!(await page.$("[data-ev=ev1].is-new")) && /Accepted/.test(await page.textContent("[data-ev=ev2]")) && /2\/8/.test(await page.textContent(".pf-unit:first-child .pf-met")));
  await page.click("#tab-portfolio"); await page.click("[data-ev=ev1]"); await page.waitForSelector(".paper-media img"); await page.waitForTimeout(300);
  await page.screenshot({ path: shots + "/m2b-evidence.png" });
  const ticks = await page.$$eval(".ksb-row input", (els) => els.filter((x) => x.checked).map((x) => x.value));
  check("Evidence opens as a document: the learner's account, their KSBs and photos, with their KSBs ticked", /ties every 450/.test(await page.textContent(".paper")) && (await page.$$(".paper-media img")).length === 2 && ticks.join() === "S11,K22,S5");
  const hl = await page.evaluate(() => ({ marks: document.querySelectorAll("#acct mark.ev-hl").length, found: [...document.querySelectorAll(".ev-found")].map((b) => b.textContent), fb: document.querySelector("#fb").value, note: (document.querySelector("#acctNote") || {}).textContent }));
  check("Evidence: Evia's matched words are highlighted in the write-up and against each KSB, with feedback drafted to edit", hl.marks >= 3 && hl.found.length >= 1 && /Callum/.test(hl.fb) && /Covers \d+ of \d+ things to mention/.test(hl.note), JSON.stringify(hl).slice(0, 400));
  await page.locator("#paper section").first().screenshot({ path: shots + "/m2d-highlight.png" }).catch(() => {}); await page.locator("#assess").screenshot({ path: shots + "/m2e-assess.png" }).catch(() => {});
  const sp = await page.evaluate(() => [...document.querySelectorAll(".ev-spotted .ksb-row")].map((r) => ({ k: r.querySelector("input").value, on: r.querySelector("input").checked, marks: r.querySelectorAll("mark").length, found: (r.querySelector(".ev-found") || {}).textContent || "", from: (r.querySelector("em") || {}).textContent || "" })));
  await page.locator(".ev-spotted").screenshot({ path: shots + "/m2h-spotted.png" }).catch(() => {});
  console.log("   Spotted: " + JSON.stringify(sp));
  check("Evia suggests other KSBs whose words are in the write-up, unticked, with the matching words marked and the unit they're from", sp.length >= 1 && sp.every((x) => !x.on && x.marks >= 1 && /Evia found/.test(x.found) && /^Unit \d+/.test(x.from)), JSON.stringify(sp));
  if (sp.length) { await page.click('.ev-spotted .ev-found'); await page.waitForTimeout(150); }
  check("…and tapping the words highlights them in the write-up", sp.length > 0 && await page.evaluate(() => document.querySelectorAll("#acct mark").length >= 1 && /Showing the words for/.test(document.querySelector("#acctNote").textContent)));
  if (sp.length) { await page.click('.ev-spotted .ev-found'); await page.waitForTimeout(150); }
  await page.click("#hlOn"); const off = await page.evaluate(() => document.querySelectorAll("#acct mark").length === 0 && !document.querySelector(".ksbs:not(.ev-spotted .ksbs) .ev-found"));
  await page.click("#hlOn");
  await page.click('[data-d="changes_required"]'); const fbChanges = await page.inputValue("#fb"); await page.click('[data-d="accepted"]');
  check("…the highlight switch turns it off, and the draft follows the decision", off && /before I sign it off/.test(fbChanges), fbChanges);
  await page.uncheck('.ksb-row input[value="S5"]'); await page.check('.ksb-row input[value="B5"]'); await page.selectOption("#addKsb", "K2");
  await page.fill("#fb", "Good ties and a clean cavity.");
  await page.click("#save"); await page.waitForTimeout(500);
  const saved = posted.filter((x) => x.table === "assessments" && x.body.evidence_id === "ev1").pop();
  check("The assessor signs it off with their own KSB choice (one unticked, one ticked, one added from another unit)", !!saved && saved.body.decision === "accepted" && saved.body.ksbs.sort().join() === "B5,K2,K22,S11" && saved.body.assessor_member_id && /Good ties/.test(saved.body.feedback));
  check("The next new piece opens after saving", !!(await page.$(".paper")) && /Structural carcassing/.test(await page.textContent(".paper h1")));
  const [evDl] = await Promise.all([page.waitForEvent("download"), page.click("#evPdf")]);
  check("A piece of evidence downloads as a PDF", /\.pdf$/.test(evDl.suggestedFilename()));
  /* The learner deletes this piece in Evia, but the phone's copy still has it and the assessor marks it. */
  GONE = true;
  await page.click('[data-d="changes_required"]'); await page.fill("#fb", "Needs a photo of the finished wall."); await page.click("#save");
  await page.waitForSelector("#noteOk", { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(600);
  const gone = await page.evaluate(() => ({ note: (document.querySelector(".m-sync-note") || {}).textContent || "", bar: document.getElementById("syncbar").textContent }));
  check("An assessment of evidence the learner has deleted is dropped with a clear note, not left waiting to send for ever",
    /deleted a piece of evidence in Evia/.test(gone.note) && !/waiting to send/.test(gone.bar) && !/row-level security/.test(gone.bar), JSON.stringify(gone));
  await page.evaluate(() => document.getElementById("noteOk").click()); await page.waitForTimeout(150);
  check("…and OK clears the note", !(await page.$(".m-sync-note")));
  GONE = false;
  await page.click("#evBack"); await page.waitForTimeout(200);
  check("Back on the portfolio, the signed-off piece shows as accepted", /Accepted/.test(await page.textContent("[data-ev=ev1]")) && /2 new to assess/.test(await page.textContent("#pfBox")), (await page.textContent("#pfBox")).slice(0, 300));
  /* The pack for the IQA and end-point assessor. */
  await page.click("#tab-overview"); await page.click("#pack"); await page.waitForSelector(".pack");
  const pk = await page.evaluate(() => ({ rows: document.querySelectorAll(".pk-row").length, k22: (([...document.querySelectorAll(".pk-row")].find((r) => r.querySelector(".pk-code").textContent === "K22") || {}).textContent || ""), items: document.querySelectorAll(".pk-item").length, sum: document.querySelector(".pk-sum").textContent, months: document.querySelectorAll(".pk-months span").length }));
  await page.screenshot({ path: shots + "/m2f-pack.png", fullPage: true });
  check("The IQA / EPA pack lists every KSB with the evidence that covers it and who signed it off, and each piece of evidence", pk.rows === 59 && /Signed off/.test(pk.k22) && /E\d/.test(pk.k22) && pk.items >= 3 && /signed off/.test(pk.sum) && pk.months >= 1, JSON.stringify(pk).slice(0, 300));
  const [pkDl] = await Promise.all([page.waitForEvent("download"), page.click("#pkPdf")]);
  check("…and downloads as a PDF with a sampling record for the IQA", /portfolio-pack.*\.pdf$/.test(pkDl.suggestedFilename()), pkDl.suggestedFilename());
  await pkDl.saveAs(shots + "/m2g-pack.pdf").catch(() => {});
  await page.click("#pkBack");
  await page.click("#rev"); await page.waitForSelector(".rv");
  const next = async () => { await page.click("#next"); await page.waitForTimeout(150); };
  const texts = [];
  check("The review is four screens", /1\/4/.test(await page.textContent(".rv-top")));
  await page.screenshot({ path: shots + "/m3-review-progress.png", fullPage: true }); texts.push(await page.textContent(".rv-body"));
  const drafted = await page.inputValue("[name=progressComment]"), hintTxt = await page.textContent(".rag-hint");
  console.log("   Drafted progress: " + drafted + "\n   " + hintTxt);
  check("The review's progress is written from Evia and Nisia (where they are, this period, observations, strength, knowledge, what's next) with a suggested rating",
    /Callum is \d+% of the way through/.test(drafted) && /\d+ of 59 KSBs signed off/.test(drafted) && /more mapped in their evidence but not signed off yet/.test(drafted) && /I observed Callum at work/.test(drafted) && /strongest evidence is for [^.]*Mixing mortar/.test(drafted) && /priority now is/.test(drafted) && /off-the-job/.test(drafted) && /Evia suggests/.test(hintTxt));
  await next();
  check("A required answer stops the review moving on", /previous target|each previous target/i.test(await page.textContent("#stepErr")));
  await page.check('input[name=prev_0][value="Partly met"]'); await next();
  check("Progress against the plan comes pre-chosen from Evia (the assessor can change it)", await page.isChecked('input[name=progressRag][value="At risk"]') && !/Choose how they’re doing/.test(await page.textContent("#stepErr")));
  await page.check('input[name=progressRag][value="Slightly behind"]');
  check("A note box opens only when needed (off-the-job not confirmed)", await page.isVisible("textarea[name=otjComment]"));
  await page.check("input[name=otjConfirmed]");
  check("…and closes once it's confirmed", !(await page.isVisible("textarea[name=otjComment]")));
  await page.fill("textarea[name=progressComment]", "Good progress on cavity walls; drawings need work.");
  await next(); texts.push(await page.textContent(".rv-body"));
  const prefilled = await page.evaluate(() => ({ safe: (document.querySelector("input[name=feelsSafe]:checked") || {}).value, tell: (document.querySelector("input[name=knowsReporting]:checked") || {}).value,
    hs: (document.querySelector("input[name=hsStatus]:checked") || {}).value, hsText: (document.querySelector("textarea[name=healthSafety]") || {}).value, box: /Their answers in Evia/.test(document.querySelector(".rv-body").textContent) }));
  check("Wellbeing is filled in from the learner's check-in in Evia, to confirm", prefilled.safe === "Yes" && prefilled.tell === "Yes" && prefilled.hs === "Something to record" && /Cut my hand/.test(prefilled.hsText) && prefilled.box, JSON.stringify(prefilled));
  await page.check('input[name=feelsSafe][value="Yes"]'); await page.check('input[name=knowsReporting][value="Yes"]');
  await page.check('input[name=topics][value="British values"]'); await page.check('input[name=hsStatus][value="No incidents or concerns"]');
  await page.check('input[name=supportInPlace][value="Not needed"]'); await page.check('input[name=changes][value="Yes"]'); await next();
  check("A change in circumstances needs a note", /what’s changed/i.test(await page.textContent("#stepErr")) && await page.isVisible("textarea[name=changesDetail]"));
  await page.check('input[name=changes][value="None"]');
  await page.screenshot({ path: shots + "/m4-review-wellbeing.png", fullPage: true });
  await next(); texts.push(await page.textContent(".rv-body"));
  await page.check('input[name=iagGiven][value="Yes"]'); await page.check('input[name=epaReady][value="On track"]');
  await page.screenshot({ path: shots + "/m6-review-next.png", fullPage: true });
  const targetTitles = (await page.$$eval("input[name^=t_title_]", (els) => els.map((e) => e.value))).join(" | ");
  await next(); await page.screenshot({ path: shots + "/m7-review-sign.png", fullPage: true });
  await page.check('input[name=overallRag][value="Slightly behind"]');
  await next();
  check("It can't be completed until all three have signed", /Still to sign: apprentice, employer, assessor/.test(await page.textContent("#signErr")));
  for (const k of ["apprentice", "employer", "assessor"]) {
    const c = await page.$('canvas[data-sig="' + k + '"]'); await c.scrollIntoViewIfNeeded(); const b = await c.boundingBox();
    await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down(); await page.mouse.move(b.x + 120, b.y + 60, { steps: 6 }); await page.mouse.move(b.x + 200, b.y + 25, { steps: 6 }); await page.mouse.up();
  }
  const all = texts.join(" ");
  check("Evia's facts are filled in through the review", /Log 10 learning hours/.test(all) && /\d+ of 59/.test(all) && /Cavity walling: 3 of 12/.test(all) && /expected by now/i.test(all) && /Enjoying the cavity work/.test(all) && /Best 70%/.test(all), all.slice(0, 300));
  check("Targets are suggested from the gaps Evia found", /Evidence for Cavity walling/.test(targetTitles) && /Build confidence: Reading drawings/.test(targetTitles) && /Maths: 70% in a test/.test(targetTitles) && /Catch up on off-the-job/.test(targetTitles), targetTitles);
  let downloaded = false; page.on("download", () => { downloaded = true; });
  await next(); await page.waitForTimeout(600);
  const rev = posted.find((x) => x.table === "reviews"), sig = posted.find((x) => x.table === "review_signoffs"), tg = posted.find((x) => x.table === "targets");
  check("Targets are saved with what Evia measures, tied to the review", !!tg && tg.body.every((t) => t.review_id === rev.body.id) && tg.body.some((t) => t.measure && t.measure.kind === "ksb" && t.measure.target > 0) && tg.body.some((t) => t.measure && t.measure.kind === "otj"), JSON.stringify(tg && tg.body.map((t) => t.measure)));
  const outcomes = await page.evaluate(async () => {
    const { facts } = await import("./review.js");
    const L = { row: { name: "A B", course_code: "bricklayer" }, enrolment: { start_date: "2025-09-01", end_date: "2027-08-31" }, otj: [], evidence: [], eviaTargets: [], eviaReviews: [],
      reviews: [{ id: "RV0", reviewed_at: "2026-07-01T12:00:00Z", content: { targets: [{ title: "x" }] } }],
      snapshot: { targets: [{ reviewId: "RV0", title: "Evidence for Mixing mortar", pct: 100, done: true, text: "Done" }, { reviewId: "RV0", title: "Log hours", pct: 55, text: "20 of 36 hours" }, { reviewId: "RV0", title: "Maths: 70%", pct: 10, text: "Best since set: 45%" }] } };
    return facts(L).previousTargets.map((t) => t.source + ":" + t.pct);
  });
  const first = await page.evaluate(async () => {
    const { facts } = await import("./review.js");
    const L = { row: { name: "A B", course_code: "bricklayer" }, enrolment: { start_date: "2025-09-01", end_date: "2027-08-31" }, otj: [], evidence: [], eviaReviews: [], reviews: [],
      eviaTargets: [{ store: "legacy", title: "Gather 15 learning hours", course: "bricklayer" }],
      snapshot: { targets: [{ title: "Log 10 off-the-job hours", pct: 100, done: true, doneAt: Date.now(), text: "Done" }, { title: "Stay active 4 weeks in a row", pct: 50, text: "2 of 4 weeks" }, { title: "Try an EPA quick quiz", pct: 0, text: "Not done yet" }] } };
    const { outcomeOf } = await import("./review.js");
    return facts(L).previousTargets.map((t) => t.title + ":" + (outcomeOf ? outcomeOf(t) : t.pct));
  });
  check("Before any Milos review, Evia's own targets arrive marked Met, Partly met or Not met (old-style ones left out)", first.join() === "Log 10 off-the-job hours:Met,Stay active 4 weeks in a row:Partly met,Try an EPA quick quiz:Not met", first.join());
  check("Last review's targets arrive marked from Evia's tracking", outcomes.join() === "evia-tracked:100,evia-tracked:55,evia-tracked:10", outcomes.join());
  const A = rev && rev.body.content.answers;
  check("The signed review is saved to Nisia with everything the funding rules need, signatures and a hash", !!rev && rev.body.review_type === "progress" && rev.body.content.facts.ksb.met >= 1 && rev.body.content.facts.ksb.met < 21 && A.progressRag === "Slightly behind" && A.otjConfirmed === true &&
    A.feelsSafe === "Yes" && A.topicDiscussed === "British values" && A.changes === "None" && A.iagGiven === "Yes" && A.epaReady === "On track" && !!A.nextReview && A.previous[0].outcome === "Partly met" &&
    ["apprentice", "employer", "assessor"].every((k) => /^data:image\/png/.test(rev.body.content.signatures[k].image)) && /^[0-9a-f]{64}$/.test(rev.body.content.hash) && rev.body.created_by_member_id === "M2", JSON.stringify(A).slice(0, 300));
  check("The assessor's sign-off and the new targets are saved", !!sig && sig.body.signer_role === "assessor" && sig.body.review_id === rev.body.id && /^[0-9a-f-]{36}$/.test(rev.body.id) && !!tg && tg.body.length >= 2);
  check("Completing it doesn't download a file: it's kept in Nisia", !downloaded);
  const pdfOf = async (withSigs) => { const [d] = await Promise.all([page.waitForEvent("download"), page.evaluate(async ([c, w]) => { const m = await import("../../packages/core/reviewdoc.js"); await m.reviewPdf({ ...c, id: "REV1", reviewedAt: c.answers.date }, { signatures: w }); }, [rev.body.content, withSigs])]);
    const f = shots + "/review" + (withSigs ? "" : "-learner") + ".pdf"; await d.saveAs(f); return fs.readFileSync(f); };
  const staffPdf = await pdfOf(true), learnerPdf = await pdfOf(false);
  check("The staff PDF has the signatures; the learner's copy names the signers without them", staffPdf.slice(0, 4).toString() === "%PDF" && learnerPdf.slice(0, 4).toString() === "%PDF" && /\/Subtype \/Image/.test(staffPdf.toString("latin1")) && !/\/Subtype \/Image/.test(learnerPdf.toString("latin1")));
  const html = await page.evaluate(async (c) => { const m = await import("../../packages/core/reviewdoc.js"); return [m.reviewHtml(c), m.reviewHtml(c, { signatures: false })]; }, rev.body.content);
  check("On screen, staff see the signatures and the learner's view doesn't", (html[0].match(/<img/g) || []).length === 3 && !/<img/.test(html[1]) && /Callum Hughes/.test(html[1]));
  /* Offline: Milos opens from the phone, an observation waits on the phone, and Sync now sends it. */
  await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(800);
  const before = posted.length;
  await ctx.setOffline(true);
  await page.reload(); await page.waitForSelector("[data-id=L1]", { timeout: 10000 });
  const offBar = await page.textContent("#syncbar");
  await page.click("[data-id=L1]"); await page.waitForSelector("#obs");
  const offLearner = /KSBs signed off/.test(await page.textContent("#main"));
  await page.click("#obs"); await page.click('.obs-units [data-u="1"]'); await page.waitForSelector("#obText");
  await page.setInputFiles("#obPick", [{ name: "o.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") }]);
  await page.fill("#obText", "Pointed the joints with a half round finish, wearing PPE."); await page.click("#obNext"); await page.click("#obSave");
  await page.waitForSelector(".obs", { state: "detached" }); await page.waitForSelector("#pfBox .pf-unit", { state: "attached" });
  const waitingShown = /waiting to send/i.test(await page.textContent("#syncbar")) && /Waiting to send/.test(await page.textContent("#pfBox"));
  const nothingSent = posted.length === before;
  check("Offline, Milos opens from the phone with the learners and their progress, and an observation waits on the phone", /Offline/.test(offBar) && offLearner && waitingShown && nothingSent, JSON.stringify({ offBar, offLearner, waitingShown, nothingSent }));
  await ctx.setOffline(false); await page.evaluate(() => dispatchEvent(new Event("online"))); await page.waitForTimeout(300);
  await page.click("#syncNow"); await page.waitForFunction(() => !/waiting to send/i.test(document.getElementById("syncbar").textContent) && !/Syncing/.test(document.getElementById("syncbar").textContent), null, { timeout: 15000 });
  const ev2 = posted.slice(before).find((x) => x.table === "evidence"), up2 = posted.slice(before).filter((x) => x.table === "storage").length, as2 = posted.slice(before).find((x) => x.table === "assessments");
  check("Back online, Sync now sends it: the observation, its photo, its PDF for the learner's Evia, and the sign-off", !!ev2 && ev2.body.source_metadata.unit === "Jointing Styles" && up2 === 2 && !!as2 && as2.body.evidence_id === ev2.body.id);
  /* Syncing by itself shows what's new without Sync now: a learner added in Nisia appears after a background sync. */
  EXTRA = true;
  if (await page.$("#backBtn")) await page.click("#backBtn");
  await page.click("[data-tab=learners]"); await page.waitForSelector("#q");
  await page.evaluate(() => dispatchEvent(new Event("online")));
  const auto = await page.waitForFunction(() => /New Starter/.test(document.getElementById("main").textContent), null, { timeout: 15000 }).then(() => true).catch(() => false);
  check("A background sync updates the screen by itself (no Sync now): a learner added in Nisia appears", auto);
  EXTRA = false;
  check("No script errors", !errors.filter((x) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch|NetworkError/.test(x)).length, errors.join(" | "));
  await ctx.close();

  /* Notifications: Milos offers them once on Today, saves the device to Nisia, shows Nisia's push, and a tapped one
     opens To assess. (Headless Chromium has no push service or notification permission: stand-ins, as a phone gives.) */
  {
    const c2 = await browser.newContext({ viewport: { width: 400, height: 860 }, locale: "en-GB" }), p2 = await c2.newPage(), e2 = [];
    p2.on("pageerror", (e) => e2.push(e.message));
    await p2.addInitScript(() => {
      const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (_) {} };
      const fake = { endpoint: "https://web.push.apple.com/test-milos", keys: { p256dh: "BPk", auth: "au" } };
      const mk = () => ({ endpoint: fake.endpoint, toJSON: () => fake, unsubscribe: async () => { ls("__sub", null); return true; } });
      try { Object.defineProperty(Notification, "permission", { get: () => ls("__perm") || "default", configurable: true }); Notification.requestPermission = async () => { ls("__perm", "granted"); return "granted"; }; } catch (_) {}
      if (window.PushManager) { PushManager.prototype.getSubscription = async function () { return ls("__sub") ? mk() : null; }; PushManager.prototype.subscribe = async function (o) { window.__key = o && o.applicationServerKey && o.applicationServerKey.length; ls("__sub", "1"); return mk(); }; }
    });
    await p2.route(/supabase\.co/, handle);
    await p2.goto(url);
    await p2.fill("#email", "m.ellis@x"); await p2.fill("#pw", "Str0ng-pass!"); await p2.click("button[type=submit]");
    await p2.waitForSelector("#c"); await p2.fill("#c", "123456");
    await p2.waitForSelector("#pushCard");
    const n0 = posted.length;
    await p2.click("#pushCard"); await p2.waitForTimeout(1200);
    const tok = posted.slice(n0).find((x) => x.table.startsWith("device_tokens"));
    const saved = !!tok && tok.body.app === "milos" && tok.body.user_id === "u-mark" && tok.body.token === "https://web.push.apple.com/test-milos" && await p2.evaluate(() => window.__key === 65);
    const gone = !(await p2.$("#pushCard"));
    await p2.click("#meBtn"); await p2.waitForSelector("#acPush");
    const acct = /Notifications · on/.test(await p2.textContent("#acPush"));
    /* A push from Nisia, delivered to the service worker as the push service would (its display call is caught). */
    const cdp = await c2.newCDPSession(p2), regs = []; cdp.on("ServiceWorker.workerRegistrationUpdated", (e) => regs.push(...e.registrations));
    await cdp.send("ServiceWorker.enable"); await p2.waitForTimeout(800);
    const reg = regs.find((r) => !r.isDeleted && /milos/.test(r.scopeURL)), worker = c2.serviceWorkers().find((w) => /milos/.test(w.url()));
    if (worker) await worker.evaluate(() => { self.__shown = []; self.registration.showNotification = async (title, o) => { self.__shown.push(Object.assign({ title }, o)); }; });
    if (reg) await cdp.send("ServiceWorker.deliverPushMessage", { origin: new URL(url).origin, registrationId: reg.registrationId, data: JSON.stringify({ title: "Callum Hughes added 2 pieces of evidence", body: "Mixing mortar and Setting out. Ready to assess in Milos.", tag: "evidence-E1", open: "assess" }) });
    await p2.waitForTimeout(1200);
    const shown = !!worker && await worker.evaluate(() => self.__shown.some((x) => /Callum Hughes added 2/.test(x.title) && x.data.open === "assess"));
    await p2.goto(url + "?open=assess"); await p2.waitForSelector("nav [data-tab=assess].on", { timeout: 8000 }).catch(() => {});
    const opens = !!(await p2.$("nav [data-tab=assess].on")) && !/open=/.test(await p2.evaluate(() => location.search));
    check("Notifications: Milos offers them on Today, saves the device to Nisia, shows Nisia's push, and a tapped one opens To assess", saved && gone && acct && shown && opens && !e2.length, JSON.stringify({ saved, gone, acct, shown, opens, reg: !!reg, worker: !!worker }) + " " + e2.join(" | "));
    await c2.close();
  }
  /* The course from Nisia's pack: a renamed topic keeps its evidence (by its id), evidence filed under an old topic
     goes where its KSBs fit, and a KSB signed off in one topic counts in every topic that covers it. */
  {
    const seed = fs.readFileSync(path.join(root, "services/supabase/packs-seed.sql"), "utf8");
    const brick = [...seed.matchAll(/save_pack\((\$[a-z]+\$)([\s\S]*?)\1::jsonb/g)].map((m) => JSON.parse(m[2])).find((p) => p.course === "bricklayer");
    const std = fs.readFileSync(path.join(root, "services/supabase/standards-seed.sql"), "utf8");
    const ksbs = [...std.matchAll(/save_standard\((\$[a-z]+\$)([\s\S]*?)\1::jsonb/g)].map((m) => JSON.parse(m[2])).find((p) => p.code === "ST0095").requirements.map((r) => [r.code, r.title]);
    const topics = JSON.parse(JSON.stringify(brick.content.topics)); topics[0].name = "Mortar mixing";
    const pack = { id: "P1", code: "nisia-bricklayer", title: "Bricklayer", version: 2, hash: "h2", standard: { code: "ST0095", kind: "standard", version: "1.2" }, topics, ksbs };
    const c3 = await browser.newContext(), p3 = await c3.newPage(); await p3.goto(url + "milos.css"); await p3.addScriptTag({ url: url + "../../packages/vendor/supabase-2.45.4.js" }); await p3.addScriptTag({ url: url + "../../packages/core/nisia-actions.js" });
    const got = await p3.evaluate(async (pack) => {
      const P = await import("../../packages/core/packs.js"), F = await import("./portfolio.js");
      let asked = 0; await P.loadPacks(async (fn, args) => { asked++; return { packs: [args.p_have.P1 === "h2" ? { id: "P1", hash: "h2", unchanged: true } : pack], courses: { bricklayer: "P1" } }; });
      await P.loadPacks(async (fn, args) => ({ packs: [args.p_have.P1 === "h2" ? { id: "P1", hash: "h2", unchanged: true } : pack], courses: { bricklayer: "P1" } }));
      const C = P.coursePack("bricklayer");
      const ev = (id, unit, unitId, k) => ({ id, title: unit, created_at: "2026-10-01T10:00:00Z", evidence_type: "photo", source_metadata: { collection: "evidence", unit, unitId, ksbs: k } });
      const L = { row: { course_code: "bricklayer" }, evidence: [ev("a", "Mixing mortar", "bricklayer/mixing-mortar", ["S14", "K20"]), ev("b", "Pointing old work", null, ["S12", "K17", "S2"])] };
      const groups = F.groupByUnit(L, { files: {}, assessed: { b: [{ decision: "accepted", ksbs: ["K1", "S12"] }] } });
      const html = F.portfolioHtml(groups, false, {}), box = document.createElement("div"); box.innerHTML = html;
      const met = [...box.querySelectorAll(".pf-unit")].map((d) => [d.querySelector(".pf-name b").textContent, (d.querySelector(".pf-met") || {}).textContent || ""]);
      return { first: C.units[0][0], kept: localStorage.getItem("nisia-packs-v1") !== null, a: groups[0].name + ":" + groups[0].items.map((i) => i.e.id).join(), b: groups[1].items.map((i) => i.e.id + "|" + (i.movedFrom || "")).join(),
        other: groups.some((g) => g.key === "other"), filedAs: /Filed as Pointing old work/.test(html), metMix: (met.find((m) => m[0] === "Mortar mixing") || [])[1], fallback: Object.keys(P.allCoursePacks()).length };
    }, pack);
    check("Milos takes the course from Nisia's pack (kept for no signal): a renamed topic keeps its evidence, evidence under an old topic goes where its KSBs fit, and a KSB signed off anywhere counts everywhere",
      got.first === "Mortar mixing" && got.kept && got.a === "Mortar mixing:a" && got.b === "b|Pointing old work" && !got.other && got.filedAs && /^1\/8/.test(got.metMix) && got.fallback >= 4, JSON.stringify(got));
    await c3.close();
  }
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

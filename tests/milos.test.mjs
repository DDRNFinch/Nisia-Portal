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
const SNAPSHOT = { at: day(-1), course: "bricklayer", ksb: { met: 21, total: 59, pct: 36, timePct: 55 }, units: [{ name: "Cavity walling", total: 12, missing: ["K4", "K5", "S3"], started: true, packs: 1 }, { name: "Setting out", total: 8, missing: [], started: true, packs: 2 }],
  packs: 3, otj: { total: 120, month: 12, week: 2 }, writeupCoverage: 64, tests: [{ type: "epa", name: "EPA mock", count: 2, best: 70, latest: { pct: 70 } }, { type: "maths", name: "Maths", count: 1, best: 60, latest: { pct: 60 } }],
  confidence: { practise: ["Reading drawings"], confident: ["Mixing mortar"], scores: [] }, maths: true, english: false,
  teach: { medals: { gold: 3, silver: 2, bronze: 1 }, subjects: [{ id: "course", name: "Bricklayer", areasDone: 4, areas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], avg: 82 }, { id: "maths", name: "Maths", areasDone: 2, areas: [1, 2, 3, 4, 5, 6], avg: 71 }, { id: "edi", name: "EDI and safeguarding", areasDone: 3, areas: [1, 2, 3, 4], avg: 90 }] } };

const posted = [];
function handle(route) {
  const q = route.request(), u = new URL(q.url()), p = u.pathname, body = q.postData() ? JSON.parse(q.postData()) : null;
  const json = (d, st = 200) => route.fulfill({ status: st, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (q.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  const one = /vnd\.pgrst\.object/.test(q.headers()["accept"] || "");
  if (p === "/auth/v1/token") return json({ access_token: jwt("aal1"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-mark", aud: "authenticated", email: "m.ellis@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/auth/v1/user") return json({ id: "u-mark", aud: "authenticated", email: "m.ellis@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] });
  if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
  if (/\/verify$/.test(p)) return json({ access_token: jwt("aal2"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-mark", aud: "authenticated", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/rest/v1/rpc/nisia_me") return json({ user_id: "u-mark", platform_admin: false, name: "Mark Ellis", memberships: [{ organisation_id: "O1", organisation: "Brookfield College", member_id: "M2", roles: ["assessor"] }] });
  if (p === "/rest/v1/rpc/nisia_college_learners") return json([LEARNER, { ...LEARNER, learner_id: "L2", enrolment_id: "E2", name: "Not Mine", assessors: [{ member_id: "M9", name: "Someone else" }] }]);
  if (p === "/rest/v1/enrolments") return json(one ? { id: "E1", organisation_id: "O1", course_id: "C1", learner_id: "L1", start_date: start, end_date: end, status: "active", planned_otj_hours: 416, employer_name: "Hughes & Sons Builders", employer_contact_name: "Dave Hughes" } : []);
  if (p === "/rest/v1/evia_records") return json([
    { collection: "snapshot", record_id: "current", data: SNAPSHOT },
    { collection: "targets", record_id: "t1", data: { id: "t1", course: "bricklayer", title: "Log 10 learning hours", due: day(-5), metAt: null } },
    { collection: "reviews", record_id: "r1", data: { id: "r1", date: day(-3), reflection: { learnerFeedback: "Enjoying the cavity work.", support: "Help with reading drawings.", nextSteps: "Level 3 next year." } } }]);
  if (p === "/rest/v1/reviews" && q.method() === "GET") return json(u.searchParams.get("select") === "enrolment_id,reviewed_at" ? [] : []);
  if (p === "/rest/v1/evidence") return json([{ id: "ev1", title: "Cavity walling", evidence_type: "photo", created_at: day(-10), source_metadata: { ksbs: ["K1", "S2"] } }, { id: "ev2", title: "Setting out", evidence_type: "photo", created_at: day(-200), source_metadata: {} }]);
  if (p === "/rest/v1/otj_entries") return json([{ activity_date: day(-20).slice(0, 10), hours: 7.5 }, { activity_date: day(-150).slice(0, 10), hours: 112.5 }]);
  if (q.method() === "POST" && p.startsWith("/rest/v1/")) { posted.push({ table: p.slice(9), body }); return json(p === "/rest/v1/reviews" ? { id: "REV1" } : null, 201); }
  return json({ error: "not faked " + p }, 404);
}

const browser = await pw.chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, acceptDownloads: true, locale: "en-GB" });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route(/supabase\.co/, handle);
  await page.goto(url);
  await page.fill("#email", "m.ellis@x"); await page.fill("#pw", "Str0ng-pass!"); await page.click("button[type=submit]");
  await page.waitForSelector("#c"); await page.fill("#c", "123456"); await page.click("button[type=submit]");
  await page.waitForSelector("[data-id=L1]");
  const shots = path.join(root, "tests", "shots"); fs.mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: shots + "/m1-home.png", fullPage: true });
  const homeText = await page.textContent("#main");
  check("Milos lists only the assessor's own learners, with the review overdue", /Callum Hughes/.test(homeText) && !/Not Mine/.test(homeText) && /Overdue by/.test(homeText));
  await page.click("[data-id=L1]"); await page.waitForSelector("#rev");
  await page.screenshot({ path: shots + "/m2-learner.png", fullPage: true });
  const lt = await page.textContent("#main");
  check("The learner page shows Evia's coverage, hours and evidence", /36%/.test(lt) && /120 h/.test(lt) && /Cavity walling/.test(lt));
  await page.click("#rev"); await page.waitForSelector(".rv");
  const next = async () => { await page.click("#next"); await page.waitForTimeout(120); };
  const texts = [];
  await page.screenshot({ path: shots + "/m3-review-about.png" }); texts.push(await page.textContent(".rv-body"));
  await next(); texts.push(await page.textContent(".rv-body")); await page.check('input[name=prev_0][value="Partly met"]'); await page.screenshot({ path: shots + "/m4-review-previous.png" });
  await next(); texts.push(await page.textContent(".rv-body")); await next();
  check("A required answer stops the review moving on", /Choose how they’re doing/.test(await page.textContent("#stepErr")));
  await page.check('input[name=progressRag][value="Slightly behind"]'); await page.fill("textarea[name=progressComment]", "Good progress on cavity walls; drawings need work.");
  await page.screenshot({ path: shots + "/m5-review-progress.png", fullPage: true });
  await next(); texts.push(await page.textContent(".rv-body")); await page.check("input[name=otjConfirmed]");
  for (let i = 0; i < 2; i++) { await next(); texts.push(await page.textContent(".rv-body")); }
  await next(); texts.push(await page.textContent(".rv-body"));
  await page.check('input[name=feelsSafe][value="Yes"]'); await page.check('input[name=knowsReporting][value="Yes"]');
  for (let i = 0; i < 4; i++) { await next(); texts.push(await page.textContent(".rv-body")); }
  await next(); texts.push(await page.textContent(".rv-body")); await page.screenshot({ path: shots + "/m6-review-targets.png", fullPage: true });
  const targetTitles = (await page.$$eval("input[name^=t_title_]", (els) => els.map((e) => e.value))).join(" | ");
  await next(); await page.check('input[name=overallRag][value="Slightly behind"]');
  await next(); await page.screenshot({ path: shots + "/m7-review-sign.png", fullPage: true });
  await next();
  check("It can't be completed until all three have signed", /Still to sign: apprentice, employer, assessor/.test(await page.textContent("#signErr")));
  for (const k of ["apprentice", "employer", "assessor"]) {
    const c = await page.$('canvas[data-sig="' + k + '"]'); await c.scrollIntoViewIfNeeded(); const b = await c.boundingBox();
    await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down(); await page.mouse.move(b.x + 120, b.y + 60, { steps: 6 }); await page.mouse.move(b.x + 200, b.y + 25, { steps: 6 }); await page.mouse.up();
  }
  const all = texts.join(" ");
  check("Evia's facts are filled in through the review", /Callum Hughes/.test(all) && /Log 10 learning hours/.test(all) && /21 of 59/.test(all) && /Cavity walling: 3 of 12/.test(all) && /expected by now/i.test(all) && /Help with reading drawings/.test(all) && /Enjoying the cavity work/.test(all) && /Best 70%/.test(all), all.slice(0, 300));
  check("Targets are suggested from the gaps Evia found", /Evidence for Cavity walling/.test(targetTitles) && /Build confidence: Reading drawings/.test(targetTitles) && /Maths practice/.test(targetTitles), targetTitles);
  const [dl] = await Promise.all([page.waitForEvent("download"), next()]);
  await page.waitForTimeout(500);
  const rev = posted.find((x) => x.table === "reviews"), sig = posted.find((x) => x.table === "review_signoffs"), tg = posted.find((x) => x.table === "targets");
  check("The signed review is saved to Nisia with its facts, answers, signatures and a hash", !!rev && rev.body.review_type === "progress" && rev.body.content.facts.ksb.met === 21 && rev.body.content.answers.progressRag === "Slightly behind" &&
    ["apprentice", "employer", "assessor"].every((k) => /^data:image\/png/.test(rev.body.content.signatures[k].image)) && /^[0-9a-f]{64}$/.test(rev.body.content.hash) && rev.body.created_by_member_id === "M2", JSON.stringify(rev && rev.body.content.answers).slice(0, 200));
  check("The assessor's sign-off and the new targets are saved", !!sig && sig.body.signer_role === "assessor" && sig.body.review_id === "REV1" && !!tg && tg.body.length >= 2);
  const pdfPath = shots + "/review.pdf"; await dl.saveAs(pdfPath);
  check("The review downloads as a PDF", fs.statSync(pdfPath).size > 5000 && fs.readFileSync(pdfPath).slice(0, 4).toString() === "%PDF");
  check("No script errors", !errors.length, errors.join(" | "));
  await ctx.close();
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

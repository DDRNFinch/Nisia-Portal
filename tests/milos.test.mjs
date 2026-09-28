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
  if (p === "/rest/v1/rpc/nisia_college_learners") return json([LEARNER, { ...LEARNER, learner_id: "L2", enrolment_id: "E2", name: "Not Mine", assessors: [{ member_id: "M9", name: "Someone else" }] }]);
  if (p === "/rest/v1/enrolments") return json(one ? { id: "E1", organisation_id: "O1", course_id: "C1", learner_id: "L1", start_date: start, end_date: end, status: "active", planned_otj_hours: 416, employer_name: "Hughes & Sons Builders", employer_contact_name: "Dave Hughes" } : []);
  if (p === "/rest/v1/evia_records") return json([
    { collection: "snapshot", record_id: "current", data: SNAPSHOT },
    { collection: "targets", record_id: "t1", data: { id: "t1", course: "bricklayer", title: "Log 10 learning hours", due: day(-5), metAt: null } },
    { collection: "reviews", record_id: "r1", data: { id: "r1", date: day(-3), reflection: { learnerFeedback: "Enjoying the cavity work.", support: "Help with reading drawings.", nextSteps: "Level 3 next year." } } }]);
  if (p === "/rest/v1/reviews" && q.method() === "GET") return json(u.searchParams.get("select") === "enrolment_id,reviewed_at" ? [] : []);
  if (p === "/rest/v1/evidence" && q.method() === "POST") { posted.push({ table: "evidence", body }); return json(null, 201); }
  if (p === "/rest/v1/evidence_files" && q.method() === "POST") { posted.push({ table: "evidence_files", body }); return json(null, 201); }
  if (p.startsWith("/storage/v1/object/evidence/") && q.method() === "POST") { posted.push({ table: "storage", body: p }); return json({ Key: p }); }
  if (p === "/rest/v1/evidence") return json([
    { id: "ev1", organisation_id: "O1", title: "Construct Cavity Walling", evidence_type: "photo", created_at: day(-10), source_metadata: { collection: "evidence", unit: "Construct Cavity Walling", ksbs: ["S11", "K22", "S5"], text: "Built a cavity wall with ties every 450 mm.", photoIds: ["p1", "p2"] } },
    { id: "ev2", organisation_id: "O1", title: "Mixing mortar", evidence_type: "photo", created_at: day(-200), source_metadata: { collection: "evidence", unit: "Mixing mortar", ksbs: ["S14"] } },
    { id: "ev3", organisation_id: "O1", title: "Structural carcassing", evidence_type: "photo", created_at: day(-5), source_metadata: { collection: "evidence", unit: "Structural carcassing", ksbs: [] } },
    { id: "ev4", organisation_id: "O1", title: "Site induction.pdf", evidence_type: "document", created_at: day(-3), client_reference: "supporting:s1", source_metadata: { collection: "supporting", ksbs: [] } }]);
  if (p === "/rest/v1/assessments" && q.method() === "GET") return json([{ id: "A0", evidence_id: "ev2", decision: "accepted", feedback: null, ksbs: ["S14", "K20"], created_at: day(-190), assessor_member_id: "M1" }]);
  if (p === "/rest/v1/assessments" && q.method() === "POST") { posted.push({ table: "assessments", body }); return json({ id: "A1", ...body, created_at: new Date().toISOString() }, 201); }
  if (p === "/rest/v1/evidence_files") return json([{ evidence_id: "ev1", storage_path: "O1/ev1/a.jpeg", mime_type: "image/jpeg" }, { evidence_id: "ev1", storage_path: "O1/ev1/b.jpeg", mime_type: "image/jpeg" }]);
  if (p === "/storage/v1/object/sign/evidence") return json(body.paths.map((x) => ({ path: x, signedURL: "/object/sign/evidence/" + x + "?token=t", error: null })));
  if (p.startsWith("/storage/v1/object/sign/evidence/")) return route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10' fill='#c96'/></svg>" });
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
  check("The learner page shows Evia's coverage and hours", /36%/.test(lt) && /120 h/.test(lt));
  await page.waitForSelector(".pf-unit"); await page.screenshot({ path: shots + "/m2a-portfolio.png", fullPage: true });
  check("Milos shows Evia's evidence strength on units, and a compact From Evia panel", await page.$$eval(".pf-unit .sbars", (b) => b.length) >= 2 && !!(await page.$(".pf-unit .sbars-strong")) &&
    /Evidence strength/.test(await page.textContent(".insights")) && /EPA mock\s*70%/.test(await page.textContent(".insights")) && /Reading drawings\s*2/.test(await page.textContent(".insights")));
  /* An observation, captured the way Evia captures evidence, then signed off. */
  await page.click("#obs"); await page.waitForSelector(".obs-units [data-u]");
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
  await page.click("#obSave"); await page.waitForSelector(".obs", { state: "detached", timeout: 8000 }); await page.waitForSelector(".pf-unit");
  const ev = posted.find((x) => x.table === "evidence"), a = posted.filter((x) => x.table === "assessments").pop();
  check("An observation is captured like Evia (unit prompts, photos, things to mention ticking off), then signed off and saved to Nisia",
    /Things to capture/.test(obsPrompts) && /silos/.test(obsPrompts) && mentionOn.some((t) => /ratio/.test(t)) && mentionOn.some((t) => /safety signage/.test(t)) &&
    obsTicks.join() === "S14,K20,S1,K1,S6,K12,S20,B1" && ev && ev.body.source_metadata.collection === "observation" && ev.body.created_by_member_id === "M2" && ev.body.source_metadata.unit === "Mixing mortar" &&
    posted.filter((x) => x.table === "storage").length === 2 && posted.filter((x) => x.table === "evidence_files" && x.body.evidence_id === ev.body.id).length === 2 &&
    a && a.body.evidence_id === ev.body.id && a.body.decision === "accepted" && !a.body.ksbs.includes("B1") && a.body.ksbs.length === 7, JSON.stringify({ mentionOn, obsTicks, ev: ev && ev.body, a: a && a.body }));
  const units = await page.$$eval(".pf-unit .pf-name > b", (els) => els.map((x) => x.textContent));
  check("The portfolio lists the course's units in Evia's order, then other units and supporting evidence", units[0] === "Mixing mortar" && units[7] === "Construct Cavity Walling" && units.at(-2) === "Other units" && units.at(-1) === "Supporting evidence");
  check("New evidence is highlighted and counted; assessed evidence shows as signed off", /3 new to assess/.test(await page.textContent("#pfBox")) && !!(await page.$("[data-ev=ev1].is-new")) && /Accepted/.test(await page.textContent("[data-ev=ev2]")) && /2\/8/.test(await page.textContent(".pf-unit:first-child .pf-met")));
  await page.click("[data-ev=ev1]"); await page.waitForSelector(".paper-media img"); await page.waitForTimeout(300);
  await page.screenshot({ path: shots + "/m2b-evidence.png" });
  const ticks = await page.$$eval(".ksb-row input", (els) => els.filter((x) => x.checked).map((x) => x.value));
  check("Evidence opens as a document: the learner's account, their KSBs and photos, with their KSBs ticked", /ties every 450/.test(await page.textContent(".paper")) && (await page.$$(".paper-media img")).length === 2 && ticks.join() === "S11,K22,S5");
  await page.uncheck('.ksb-row input[value="S5"]'); await page.check('.ksb-row input[value="B5"]'); await page.selectOption("#addKsb", "K2");
  await page.fill("#fb", "Good ties and a clean cavity.");
  await page.click("#save"); await page.waitForTimeout(500);
  const saved = posted.filter((x) => x.table === "assessments" && x.body.evidence_id === "ev1").pop();
  check("The assessor signs it off with their own KSB choice (one unticked, one ticked, one added from another unit)", !!saved && saved.body.decision === "accepted" && saved.body.ksbs.sort().join() === "B5,K2,K22,S11" && saved.body.assessor_member_id && /Good ties/.test(saved.body.feedback));
  check("The next new piece opens after saving", !!(await page.$(".paper")) && /Structural carcassing/.test(await page.textContent(".paper h1")));
  const [evDl] = await Promise.all([page.waitForEvent("download"), page.click("#evPdf")]);
  check("A piece of evidence downloads as a PDF", /\.pdf$/.test(evDl.suggestedFilename()));
  await page.click("#evBack"); await page.waitForTimeout(200);
  check("Back on the portfolio, the signed-off piece shows as accepted", /Accepted/.test(await page.textContent("[data-ev=ev1]")) && /2 new to assess/.test(await page.textContent("#pfBox")));
  await page.click("#rev"); await page.waitForSelector(".rv");
  const next = async () => { await page.click("#next"); await page.waitForTimeout(150); };
  const texts = [];
  check("The review is four screens", /1\/4/.test(await page.textContent(".rv-top")));
  await page.screenshot({ path: shots + "/m3-review-progress.png", fullPage: true }); texts.push(await page.textContent(".rv-body"));
  await next();
  check("A required answer stops the review moving on", /previous target|each previous target/i.test(await page.textContent("#stepErr")));
  await page.check('input[name=prev_0][value="Partly met"]'); await next();
  check("Progress against the plan is required", /Choose how they’re doing/.test(await page.textContent("#stepErr")));
  await page.check('input[name=progressRag][value="Slightly behind"]');
  check("A note box opens only when needed (off-the-job not confirmed)", await page.isVisible("textarea[name=otjComment]"));
  await page.check("input[name=otjConfirmed]");
  check("…and closes once it's confirmed", !(await page.isVisible("textarea[name=otjComment]")));
  await page.fill("textarea[name=progressComment]", "Good progress on cavity walls; drawings need work.");
  await next(); texts.push(await page.textContent(".rv-body"));
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
  check("Evia's facts are filled in through the review", /Log 10 learning hours/.test(all) && /21 of 59/.test(all) && /Cavity walling: 3 of 12/.test(all) && /expected by now/i.test(all) && /Enjoying the cavity work/.test(all) && /Best 70%/.test(all), all.slice(0, 300));
  check("Targets are suggested from the gaps Evia found", /Evidence for Cavity walling/.test(targetTitles) && /Build confidence: Reading drawings/.test(targetTitles) && /Maths practice/.test(targetTitles), targetTitles);
  let downloaded = false; page.on("download", () => { downloaded = true; });
  await next(); await page.waitForTimeout(600);
  const rev = posted.find((x) => x.table === "reviews"), sig = posted.find((x) => x.table === "review_signoffs"), tg = posted.find((x) => x.table === "targets");
  const A = rev && rev.body.content.answers;
  check("The signed review is saved to Nisia with everything the funding rules need, signatures and a hash", !!rev && rev.body.review_type === "progress" && rev.body.content.facts.ksb.met === 21 && A.progressRag === "Slightly behind" && A.otjConfirmed === true &&
    A.feelsSafe === "Yes" && A.topicDiscussed === "British values" && A.changes === "None" && A.iagGiven === "Yes" && A.epaReady === "On track" && !!A.nextReview && A.previous[0].outcome === "Partly met" &&
    ["apprentice", "employer", "assessor"].every((k) => /^data:image\/png/.test(rev.body.content.signatures[k].image)) && /^[0-9a-f]{64}$/.test(rev.body.content.hash) && rev.body.created_by_member_id === "M2", JSON.stringify(A).slice(0, 300));
  check("The assessor's sign-off and the new targets are saved", !!sig && sig.body.signer_role === "assessor" && sig.body.review_id === "REV1" && !!tg && tg.body.length >= 2);
  check("Completing it doesn't download a file: it's kept in Nisia", !downloaded);
  const pdfOf = async (withSigs) => { const [d] = await Promise.all([page.waitForEvent("download"), page.evaluate(async ([c, w]) => { const m = await import("../../packages/core/reviewdoc.js"); await m.reviewPdf({ ...c, id: "REV1", reviewedAt: c.answers.date }, { signatures: w }); }, [rev.body.content, withSigs])]);
    const f = shots + "/review" + (withSigs ? "" : "-learner") + ".pdf"; await d.saveAs(f); return fs.readFileSync(f); };
  const staffPdf = await pdfOf(true), learnerPdf = await pdfOf(false);
  check("The staff PDF has the signatures; the learner's copy names the signers without them", staffPdf.slice(0, 4).toString() === "%PDF" && learnerPdf.slice(0, 4).toString() === "%PDF" && /\/Subtype \/Image/.test(staffPdf.toString("latin1")) && !/\/Subtype \/Image/.test(learnerPdf.toString("latin1")));
  const html = await page.evaluate(async (c) => { const m = await import("../../packages/core/reviewdoc.js"); return [m.reviewHtml(c), m.reviewHtml(c, { signatures: false })]; }, rev.body.content);
  check("On screen, staff see the signatures and the learner's view doesn't", (html[0].match(/<img/g) || []).length === 3 && !/<img/.test(html[1]) && /Callum Hughes/.test(html[1]));
  check("No script errors", !errors.length, errors.join(" | "));
  await ctx.close();
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

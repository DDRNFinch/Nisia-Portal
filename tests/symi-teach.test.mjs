/* Symi teaching, in a browser: a Bricklaying class gets its scheme of work on its own dates, today's lesson plan timed
   around its breaks, slides with Evia's pictures and a class quiz; a course added in Nisia with no Teach me lessons
   still gets a full plan from its KSBs.   Run: node tests/symi-teach.test.mjs */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const shots = path.join(root, "tests", "shots");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
}).listen(0);
const url = "http://localhost:" + server.address().port + "/apps/symi/";
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + detail)); };

const browser = await pw.chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-GB" }), page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.route(/supabase\.co/, (r) => r.fulfill({ status: 401, body: "{}" }));
  await page.goto(url + "update.json");
  const build = JSON.parse(await page.textContent("body")).version;
  /* A class on today's weekday that started three weeks ago, 09:00–16:00 with two breaks; and a Plastering course
     the college added in Nisia (no Teach me lessons for it yet). */
  await page.evaluate((build) => {
    localStorage.clear();
    const k = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const now = new Date(), from = new Date(now), to = new Date(now); from.setDate(from.getDate() - 21); to.setDate(to.getDate() + 70);
    const day = now.toLocaleDateString("en-GB", { weekday: "long" });
    const L = [{ id: "x1", name: "Callum Hughes", externalId: "" }, { id: "x2", name: "Amira Khan", externalId: "" }, { id: "x3", name: "Jordan Pike", externalId: "" }];
    localStorage.setItem("symi-last-seen-release-v1", build);
    localStorage.setItem("samos.classroom.data", JSON.stringify({ settings: { teacherName: "Priya", centre: "" }, learners: L, teachingClasses: [], attendance: {}, history: [], resources: [], courses: [],
      classes: [{ id: "t1", name: "L2 Bricklaying", day, room: "Workshop 2", start: "09:00", end: "16:00", courseCode: "bricklayer",
        breaks: [{ id: "b1", label: "Break 1", start: "10:30", end: "10:45" }, { id: "b2", label: "Break 2", start: "12:30", end: "13:00" }], learners: L,
        recurrence: { type: "weekly", interval: 1, weekdays: [day], monthDays: [], startDate: k(from), endDate: k(to), anchorDate: k(from), onceDate: "" } }],
      activeClassId: "t1", view: "registers" }));
    localStorage.setItem("nisia-packs-v1", JSON.stringify({ at: new Date().toISOString(), enrolments: {}, courses: { plasterer: "P1" }, packs: { P1: { id: "P1", code: "nisia-plasterer", title: "Plasterer", version: 1, hash: "h",
      standard: { code: "ST0097", version: "1.1", kind: "standard" },
      topics: [{ id: "t1", name: "Preparing backgrounds", ksbs: [{ code: "K1" }, { code: "S1" }, { code: "B1" }] }, { id: "t2", name: "Solid plastering", ksbs: [{ code: "K2" }, { code: "S2" }] }],
      ksbs: [["K1", "Types of background and how to prepare them."], ["S1", "Prepare backgrounds to receive plaster."], ["B1", "Put health and safety first."], ["K2", "Plaster types and mixes."], ["S2", "Apply two-coat plaster to walls."]] } } }));
  }, build);
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => window.SamosApp.openRegisters());
  await page.waitForSelector(".st-strip [data-st=slides]", { timeout: 15000 });
  const strip = await page.textContent(".st-strip");
  await page.screenshot({ path: shots + "/symi-teach-register.png" });
  check("The register shows today's session (session 4, three weeks in) with Start today's class, Teach, Lesson plan and Scheme of work", /Today · Session 4 of 1[34]/.test(strip) && /Start today’s class/.test(strip) && /Teach/.test(strip) && /Scheme of work/.test(strip), strip);

  /* Start today's class: register, teach, quiz, finish, in order, each ticked as it's done. */
  await page.click(".st-strip [data-st=today]"); await page.waitForSelector(".st-flow");
  const flow0 = await page.evaluate(() => ({ steps: [...document.querySelectorAll(".st-step b")].map((x) => x.textContent), next: (document.querySelector(".st-step.st-next b") || {}).textContent, finish: document.querySelectorAll(".st-step")[3].textContent }));
  await page.screenshot({ path: shots + "/symi-teach-today.png" });
  await page.click("#stSheet [data-step=teach]"); await page.waitForSelector(".st-slide h1");
  for (let i = 0; i < 60 && (await page.$("#stSheet [data-next]")); i++) await page.keyboard.press("ArrowRight");
  await page.click("#stSheet [data-done]"); await page.waitForSelector(".st-q");
  for (let i = 0; i < 20 && !(await page.$("#stSheet [data-again]")); i++) { await page.click("#stSheet [data-show]"); await page.click(i % 3 ? "#stSheet [data-y]" : "#stSheet [data-n]"); }
  await page.click("#stSheet [data-done]"); await page.waitForSelector(".st-flow");
  const flow1 = await page.evaluate(() => ({ done: [...document.querySelectorAll(".st-step.st-done b")].map((x) => x.textContent), quiz: document.querySelectorAll(".st-step")[2].textContent, dots: document.querySelectorAll(".st-flow-dots i.ok").length }));
  await page.screenshot({ path: shots + "/symi-teach-today-2.png" });
  const sent = await page.evaluate(async () => { const T = window.SymiTeach, s = await T.sessionFor("t1"); return { codes: T.codesOf(s), lessons: T.lessonsOf(s).map((l) => l.title) }; });
  check("Start today's class: four steps (register, teach, quiz, finish), teaching and the quiz ticked as they're done with the class score, and the KSBs taught named on Finish",
    flow0.steps.join("|") === "Take the register|Teach|Class quiz|Finish the class" && flow0.next === "Take the register" && /Evia/.test(flow0.finish) && /Milos/.test(flow0.finish) && /S12|K17/.test(flow0.finish) &&
    flow1.done.join("|") === "Teach|Class quiz" && / of \d+ right as a class/.test(flow1.quiz) && flow1.dots === 2 && sent.codes.length >= 4 && sent.lessons.length >= 1, JSON.stringify({ flow0, flow1, sent }));
  await page.click("#stSheet [data-step=reg]"); await page.waitForTimeout(200);
  const regStep = await page.evaluate(() => !document.querySelector("#stSheet") && !!document.querySelector(".sn-auth") && JSON.parse(localStorage.getItem("symi.teach.flow.v1"))[Object.keys(JSON.parse(localStorage.getItem("symi.teach.flow.v1")))[0]].reg === true);
  check("…Take the register shows the check-in code (here, not signed in yet, it asks to connect to Nisia first)", regStep);
  await page.evaluate(() => document.querySelectorAll(".sn-auth").forEach((x) => x.remove()));

  /* The scheme of work: every class day, the course's units spread over them, today's picked out. */
  await page.click(".st-strip [data-st=sow]"); await page.waitForSelector(".st-sow");
  const sow = await page.evaluate(() => ({ rows: document.querySelectorAll(".st-sow .st-row").length, now: (document.querySelector(".st-now .st-n") || {}).textContent, first: document.querySelector(".st-sow .st-row .st-what").textContent,
    units: [...document.querySelectorAll(".st-sow .st-what b")].map((x) => x.textContent), sum: document.querySelector(".st-sum").textContent, checks: document.querySelectorAll(".st-ksbs em").length }));
  await page.screenshot({ path: shots + "/symi-teach-sow.png", fullPage: true });
  const allUnits = ["Mixing mortar", "Jointing Styles", "Repair brick walling", "Basic Brick wall", "Set out solid walling", "Build solid walling", "Set out Cavity Walling", "Construct Cavity Walling", "Cavity opening", "Gable end/Raked wall"];
  check("Scheme of work: a session for every class day, today's marked, every Bricklayer unit in order with a unit check, 6h 15m teaching each",
    sow.rows >= 13 && sow.now === "4" && /Mixing mortar/.test(sow.first) && allUnits.every((u) => sow.units.some((x) => x.includes(u))) && sow.checks >= 10 && /6h 15m/.test(sow.sum), JSON.stringify(sow));

  /* Today's lesson plan, timed around the breaks. */
  await page.click(".st-now"); await page.waitForSelector(".st-doc .st-table");
  const plan = await page.evaluate(() => ({ text: document.querySelector("#stSheet .st-doc").textContent, rows: [...document.querySelectorAll("#stSheet .st-doc .st-table tr")].map((r) => r.textContent) }));
  await page.screenshot({ path: shots + "/symi-teach-plan.png", fullPage: true });
  check("Lesson plan: the day timed from 09:00 to 16:00 around both breaks, with aims, KSBs in full, a practical task, checks and the rest",
    plan.rows.some((r) => /^10:30–10:45Break/.test(r)) && plan.rows.some((r) => /^12:30–13:00Break/.test(r)) && /^09:00/.test(plan.rows[1]) && /16:00/.test(plan.rows[plan.rows.length - 1]) &&
    /KSBs/.test(plan.text) && /\b[KSB]\d+\b/.test(plan.text) && /Practical task/.test(plan.text) && /Checking understanding/.test(plan.text) && /Health and safety/.test(plan.text), plan.rows.join(" | "));
  await page.fill(".st-notes", "Bring the spare mixer"); await page.waitForTimeout(100);
  const note = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("symi.teach.notes.v1"))));
  check("The tutor can add their own notes to a session (kept on the phone)", /Bring the spare mixer/.test(note), note);

  /* Teach: the slides, with Evia's pictures. */
  await page.click("#stSheet [data-st-slides]"); await page.waitForSelector(".st-slide h1");
  const deck = { first: await page.textContent(".st-slide h1"), count: await page.textContent(".st-count") };
  let pics = 0;
  for (let i = 0; i < 40; i++) { if (await page.$(".st-pic svg")) { pics++; if (pics === 1) await page.screenshot({ path: shots + "/symi-teach-slide.png" }); } if (!(await page.$("#stSheet [data-next]"))) break; await page.keyboard.press("ArrowRight"); await page.waitForTimeout(40); }
  check("Teach: full-screen slides from the Teach me lessons, with their pictures, moved on with the arrow keys", !!deck.first && /^1 \/ \d+/.test(deck.count) && Number(deck.count.split("/")[1]) >= 8 && pics >= 2, JSON.stringify(deck) + " pics " + pics);

  /* The class quiz from the end of the slides. */
  await page.click("#stSheet [data-done]"); await page.waitForSelector(".st-q");
  const q1 = await page.textContent(".st-q h1"), opts = await page.$$eval(".st-opts li", (x) => x.length);
  await page.click("#stSheet [data-show]"); await page.waitForSelector(".st-right");
  await page.screenshot({ path: shots + "/symi-teach-quiz.png" });
  await page.click("#stSheet [data-y]"); await page.waitForTimeout(100);
  const moved = /^2 \//.test(await page.textContent(".st-count"));
  check("Class quiz: a question with lettered answers, the right one shown with why, and the class tally moves on", !!q1 && opts >= 2 && moved, q1 + " " + opts);

  /* Printing the scheme of work. */
  await page.evaluate(() => { window.print = () => { window.__printed = document.getElementById("stPrint").textContent; }; });
  await page.click("#stSheet [data-done]").catch(() => {}); await page.waitForTimeout(100);
  await page.evaluate(() => { const x = document.querySelector("#stSheet [data-st-close]"); if (x) x.click(); else { const b = document.querySelector("#stSheet [data-st-back]"); if (b) b.click(); } }); await page.waitForTimeout(150);
  if (await page.$("#stSheet")) await page.click("#stSheet [data-st-close]");
  await page.click(".st-strip [data-st=sow]"); await page.waitForSelector("#stSheet [data-st-print]"); await page.click("#stSheet [data-st-print]"); await page.waitForTimeout(200);
  const printed = await page.evaluate(() => window.__printed || "");
  check("The scheme of work prints as a document (dates, units, content, KSBs, assessment)", /Scheme of work/.test(printed) && /Mixing mortar/.test(printed) && /Unit check quiz/.test(printed), printed.slice(0, 200));
  await page.click("[data-st-close]");

  /* A course the college added in Nisia, with no Teach me lessons: still a full plan, from its KSB wording. */
  await page.evaluate(() => window.SamosApp.mutate((st) => { st.classes[0].courseCode = "plasterer"; }, true));
  await page.waitForFunction(() => /Preparing backgrounds|Solid plastering/.test((document.querySelector(".st-strip") || {}).textContent || ""), null, { timeout: 8000 });
  await page.click(".st-strip [data-st=lesson]"); await page.waitForSelector("#stSheet .st-doc");
  const plaster = await page.textContent("#stSheet .st-doc");
  await page.click("#stSheet [data-st-slides]"); await page.waitForSelector(".st-slide h1");
  const pslides = await page.textContent(".st-count");
  check("A new course added in Nisia (Plastering, no Teach me lessons yet) gets its plan, slides and quiz from its own KSBs",
    /Plasterer/.test(plaster) && /(K1|K2|S2)/.test(plaster) && Number(pslides.split("/")[1]) >= 2, plaster.slice(0, 200));
  for (let i = 0; i < 4 && (await page.$("#stSheet")); i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(120); }
  const closed = !(await page.$("#stSheet"));

  /* On a phone. */
  await page.evaluate(() => window.SamosApp.mutate((st) => { st.classes[0].courseCode = "bricklayer"; }, true));
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await page.waitForSelector(".st-strip [data-st=slides]"); await page.click(".st-strip [data-st=slides]"); await page.waitForSelector(".st-slide h1");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150); await page.screenshot({ path: shots + "/symi-teach-phone.png" });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.querySelector("#stSheet").scrollWidth <= window.innerWidth + 1);
  check("Escape steps back out of the teaching screens; slides fit a phone screen", closed && fits);
  check("No script errors", errors.length === 0, errors.join(" | "));
} finally { await browser.close(); server.close(); }
const bad = results.filter((x) => !x).length;
console.log(bad ? "\n" + bad + " of " + results.length + " checks failed." : "\nAll " + results.length + " checks passed.");
process.exit(bad ? 1 : 0);

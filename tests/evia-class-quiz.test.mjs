/* Evia's class quiz screen, with a stand-in Nisia: the question comes up on its own on a college day, the learner taps
   an answer (and can change it), sees if they were right once the tutor shows it, and gets their score and coins at
   the end.   Run: node tests/evia-class-quiz.test.mjs */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const shots = path.join(root, "tests", "shots");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const PAGE = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="ui.css"></head><body><p>Evia</p><script>' +
  'const k=(d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"))(new Date());' +
  'window.Q={sent:[],state:null};' +
  'window.eviaNisia={joined:()=>({live:true}),sessions:()=>[{session_date:k}],timetableDays:()=>[]};' +
  'window.NisiaActions={send:async(n,a)=>{Q.sent.push([n,a]);if(n==="quizNow")return Q.state&&JSON.parse(JSON.stringify(Q.state));if(n==="quizAnswer"){if(Q.late)throw new Error("Too late: your tutor has moved on.");Q.state.mine=a.p_choice;return{ok:true}}}};' +
  'window.eviaRewards={gameCoins:n=>n};</script><script src="class-quiz.js"></script></body></html>';
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  if (u === "/apps/evia/quiz-test.html") { r.writeHead(200, { "Content-Type": "text/html" }); return r.end(PAGE); }
  const f = path.join(root, u);
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
}).listen(0);
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + detail)); };

const browser = await pw.chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "en-GB" })).newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:" + server.address().port + "/apps/evia/quiz-test.html");
  await page.evaluate(() => { Q.state = { id: "QZ1", class: "L2 Bricklaying", title: "Class quiz", current: 0, total: 2, revealed: false, finished: false, q: "For a 1:4 mix with 3 buckets of cement, how much sand?", opts: ["12 buckets", "7 buckets", "4 buckets"], mine: null, right: 0, answered: 0 }; window.eviaClassQuiz.check(); });
  await page.waitForSelector("#cq-view .cq-opt");
  const asked = await page.textContent("#cq-view");
  check("On a college day the tutor's question comes up on its own, with big lettered answers", /Question 1 of 2/.test(asked) && /1:4 mix/.test(asked) && (await page.$$("#cq-view .cq-opt")).length === 3 && /Tap your answer/.test(asked), asked);
  await page.click('#cq-view [data-k="1"]'); await page.waitForTimeout(150);
  await page.click('#cq-view [data-k="0"]'); await page.waitForTimeout(150);
  await page.screenshot({ path: shots + "/evia-quiz-answer.png" });
  const sent = await page.evaluate(() => Q.sent.filter((x) => x[0] === "quizAnswer").map((x) => x[1]));
  check("Tapping an answer sends it (and they can change their mind until the answer's shown)", sent.length === 2 && sent[1].p_choice === 0 && sent[1].p_quiz === "QZ1" && sent[1].p_q === 0 &&
    !!(await page.$('#cq-view [data-k="0"].cq-mine')) && /change it/.test(await page.textContent("#cq-view")), JSON.stringify(sent));
  await page.evaluate(() => { Object.assign(Q.state, { revealed: true, a: 0, why: "4 of sand for every 1 of cement: 3 × 4 = 12.", right: 1, answered: 1 }); window.eviaClassQuiz.check(); });
  await page.waitForSelector("#cq-view .cq-yes"); await page.waitForTimeout(400);
  await page.screenshot({ path: shots + "/evia-quiz-right.png" });
  check("When the tutor shows the answer: right or not, and why", /Right!/.test(await page.textContent("#cq-view")) && /3 × 4 = 12/.test(await page.textContent("#cq-view")) && !!(await page.$("#cq-view .cq-opt[disabled]")));
  await page.evaluate(() => { Object.assign(Q.state, { current: 1, revealed: false, a: null, why: null, mine: null, q: "Wear gloves when handling cement?", opts: ["Yes", "No"] }); Q.late = true; window.eviaClassQuiz.check(); });
  await page.waitForSelector('#cq-view [data-k="1"]'); await page.click('#cq-view [data-k="1"]'); await page.waitForTimeout(150);
  check("Too late (the tutor moved on) says so, nothing lost", /Too late/.test(await page.textContent("#cq-view .cq-note")));
  await page.evaluate(() => { Object.assign(Q.state, { finished: true, right: 2, answered: 2 }); window.eviaClassQuiz.check(); });
  await page.waitForSelector("#cq-view .cq-done");
  const done = await page.textContent("#cq-view");
  await page.screenshot({ path: shots + "/evia-quiz-done.png" });
  check("At the end: their score and coins for the right answers (once only)", /2 of 2/.test(done) && /\+4 coins/.test(done) && /Brilliant/.test(done), done);
  await page.click("#cq-view [data-ok]"); await page.evaluate(() => window.eviaClassQuiz.check()); await page.waitForTimeout(150);
  check("Closed, it stays closed (until the next quiz)", !(await page.$("#cq-view")));
  await page.evaluate(() => { Q.state = null; window.eviaClassQuiz.check(); });
  check("No script errors", errors.length === 0, errors.join(" | "));
} finally { await browser.close(); server.close(); }
const bad = results.filter((x) => !x).length;
console.log(bad ? "\n" + bad + " of " + results.length + " checks failed." : "\nAll " + results.length + " checks passed.");
process.exit(bad ? 1 : 0);

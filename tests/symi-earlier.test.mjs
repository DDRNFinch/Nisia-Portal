/* Symi: earlier attendance brought forward counts in the learner's attendance straight away, everywhere Symi shows
   it, without reloading: the old hours plus the registers after their date (those on or before it are already in
   them).   Run: node tests/symi-earlier.test.mjs */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
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
const browser = await pw.chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: "block" })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(url); await page.waitForFunction(() => window.SamosApp && window.SymiCourseHub, null, { timeout: 20000 });
  /* Stanley, with two six-hour registers (16 and 23 October), all attended. */
  await page.evaluate(() => {
    const H = 6 * 3600000;
    window.SamosApp.mutate((st) => {
      st.learners.push({ id: "stan", name: "Stanley", externalId: "", attendance: { sessions: 0, expectedMs: 0, attendedMs: 0, percentage: 0 } });
      st.history = (st.history || []).concat([{ id: "h1", classId: "none", date: "2026-10-16", scheduledMs: H, data: { stan: { expectedMs: H, attendedMs: H } } },
        { id: "h2", classId: "none", date: "2026-10-23", scheduledMs: H, data: { stan: { expectedMs: H, attendedMs: H } } }]);
      st.selectedLearnerId = "stan"; st.view = "learner";
    });
    window.__still = 1;
  });
  const hero = () => page.evaluate(() => document.querySelector(".samos-attendance-hero").textContent.replace(/\s+/g, " ").trim());
  const before = await hero();
  /* Bring forward: 24 hours expected, 100%, up to 16 October. */
  await page.evaluate(() => window.SymiCourseHub.openMigration("stan"));
  await page.waitForSelector("[data-mig-build]");
  await page.fill("[data-mig-p]", "100"); await page.fill("[data-mig-eh]", "24"); await page.fill("[data-mig-date]", "2026-10-16");
  await page.click("[data-mig-build]"); await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector(".symi-course-dialog").close()); await page.waitForTimeout(800);
  const after = await hero(), still = await page.evaluate(() => window.__still === 1);
  check("Bring forward counts straight away on the learner's page, without reloading: 24h before 16 Oct plus the 23 Oct register (16 Oct is already in the old figures)",
    /12h/.test(before) && /100%/.test(after) && /30h \/ 30h/.test(after) && /Includes 24h \/ 24h brought forward, up to Fri, 16 Oct 2026/.test(after) && still, JSON.stringify({ before, after, still }));
  const same = await page.evaluate(() => { const a = window.SymiCourseHub.combinedAttendance("stan"); return a.percent === 100 && a.attendedMinutes === 1800 && a.expectedMinutes === 1800; });
  check("The course's attendance list shows the same figure (the old hours aren't added twice)", same);
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test ran to the end", false, e.stack + " | " + errors.join(" | ")); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

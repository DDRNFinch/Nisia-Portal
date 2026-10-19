/* Symi on every device: a tutor's own learners and finished registers (including learners who aren't from Evia Portal)
   follow them from their phone to their laptop, and both show the same attendance. Two browsers, one account, a
   stand-in Evia Portal that keeps the backup.   Run: node tests/symi-sync.test.mjs */
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
let backup = null, puts = 0;
function handle(route) {
  const q = route.request(), u = new URL(q.url()), p = u.pathname; let body = null; try { body = q.postData() ? JSON.parse(q.postData()) : null; } catch (_) {}
  const json = (d, st = 200) => route.fulfill({ status: st, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (q.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (p === "/auth/v1/token") return json({ access_token: jwt("aal1"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-priya", aud: "authenticated", email: "p.shah@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/auth/v1/user") return json({ id: "u-priya", aud: "authenticated", email: "p.shah@x", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] });
  if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
  if (/\/verify$/.test(p)) return json({ access_token: jwt("aal2"), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u-priya", aud: "authenticated", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });
  if (p === "/rest/v1/rpc/nisia_me") return json({ user_id: "u-priya", name: "Priya Shah", memberships: [{ organisation_id: "O1", organisation: "Walsall College", member_id: "MT", roles: ["tutor"] }] });
  if (p === "/rest/v1/rpc/symi_backup_get") { if (!backup) return json(null); if (body && body.p_since && body.p_since >= backup.updated_at) return json({ updated_at: backup.updated_at, same: true }); return json(backup); }
  if (p === "/rest/v1/rpc/symi_backup_put") { puts++; backup = { updated_at: new Date(Date.now() + puts).toISOString(), state: JSON.parse(JSON.stringify(body.p_state)) }; return json(backup.updated_at); }
  if (p === "/rest/v1/rpc/symi_registers_sync") return json([]);
  if (/\/rest\/v1\/rpc\/(nisia_college_learners|symi_my_classes|symi_absences|symi_checkins)$/.test(p)) return json([]);
  if (p.startsWith("/rest/v1/")) return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, body: "" });
  return json({ error: "not faked " + p }, 404);
}
const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const browser = await pw.chromium.launch();
async function device(seed) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-GB" }), page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message)); page.on("dialog", (d) => d.accept());
  await page.route(/supabase\.co/, handle);
  await page.goto(url + "update.json");
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("symi-last-seen-release-v1", "9.9.9"); if (s) localStorage.setItem("samos.classroom.data", JSON.stringify(s)); }, seed);
  await page.goto(url); await page.waitForTimeout(1200);
  await page.click("#nisiaButton");
  await page.fill(".sn-auth #email", "p.shah@x"); await page.fill(".sn-auth #pw", "Str0ng-pass!"); await page.click(".sn-auth button[type=submit]");
  await page.waitForSelector(".sn-auth #c"); await page.fill(".sn-auth #c", "123456");
  await page.waitForFunction(() => document.querySelector("#nisiaButton.on"), null, { timeout: 8000 });
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
const row = (id, cls, date, data, extra) => ({ id, sessionKey: cls + ":" + date, classId: cls, className: "BWK Apps", date, dateLabel: date, total: Object.keys(data).length, present: Object.values(data).filter((r) => r.attendedMs > 0).length, scheduledMs: 21600000, attendedMs: 0, autoCompleted: false, data, ...(extra || {}) });
const rec = (min) => ({ intervals: [], runningSince: null, attendedMs: min * 60000, expectedMs: 21600000, status: min ? "attended" : "absent" });
try {
  /* The phone: the tutor's own learners (not from Evia Portal), a register and two finished registers. */
  const L = [{ id: "b1", name: "Billy", externalId: "" }, { id: "f1", name: "Ferdinand", externalId: "" }];
  const phoneSeed = { settings: { teacherName: "Priya", centre: "" }, learners: L, teachingClasses: [], attendance: {}, resources: [], courses: [],
    classes: [{ id: "bwk", name: "BWK Apps", day: "Friday", start: "10:00", end: "16:00", breaks: [], learners: L, recurrence: { type: "weekly", interval: 1, weekdays: ["Friday"], startDate: day(30), endDate: day(-60), anchorDate: day(30) } }],
    history: [row("h1", "bwk", day(3), { b1: rec(360), f1: rec(300) }), row("h2", "bwk", day(10), { b1: rec(360), f1: rec(0) })], activeClassId: "bwk", view: "registers" };
  /* The laptop: the same register finished by itself at the end (so with less time), and a learner of its own called Billy too. */
  const laptopSeed = { settings: { teacherName: "Priya", centre: "" }, learners: [{ id: "b2", name: "Billy", externalId: "" }], teachingClasses: [], attendance: {}, resources: [], courses: [], classes: [],
    history: [row("h9", "bwk", day(3), { b2: rec(200) }, { autoCompleted: true })], activeClassId: null, view: "home" };
  const phone = await device(phoneSeed);
  await phone.page.waitForTimeout(1500);
  check("The phone keeps its registers with the tutor's account", !!backup && backup.state.learners.length === 2 && backup.state.history.length === 2, JSON.stringify(backup && backup.state.learners));
  const laptop = await device(laptopSeed);
  await laptop.page.waitForTimeout(1500);
  const lap = await laptop.page.evaluate(() => { const s = window.SamosApp.getState(); return { learners: s.learners.map((l) => l.name + ":" + l.id).sort(), classes: s.classes.map((c) => c.id), hist: s.history.map((h) => h.sessionKey + ":" + h.id) }; });
  check("Signed in on the laptop, the phone's own learners and register are there (Billy once, not twice)",
    lap.learners.join() === "Billy:b2,Ferdinand:f1" && lap.classes.join() === "bwk", JSON.stringify(lap));
  const stats = async (pg) => pg.evaluate(() => { const s = window.SamosApp.getState(); return s.learners.map((l) => l.name + " " + window.SamosApp.learnerAttendanceStats(l.id).percentage + "%").sort().join(", "); });
  await phone.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await phone.page.waitForTimeout(2000);
  const sp = await stats(phone.page), sl = await stats(laptop.page);
  check("The phone and the laptop show the same attendance for each learner (the register the tutor finished wins over the one Symi closed by itself)",
    sp === sl && /Billy 100%/.test(sl) && /Ferdinand 42%/.test(sl), JSON.stringify({ sp, sl }));
  /* A learner added on the laptop appears on the phone; one deleted on the phone doesn't come back. */
  await laptop.page.evaluate(() => window.SamosApp.mutate((s) => { s.learners.push({ id: "k1", name: "Kenzie", externalId: "", attendance: { sessions: 0, expectedMs: 0, attendedMs: 0, percentage: 0 } }); }));
  await laptop.page.waitForTimeout(4500);
  await phone.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await phone.page.waitForTimeout(2000);
  await phone.page.evaluate(() => window.SamosApp.mutate((s) => { s.learners = s.learners.filter((l) => l.name !== "Ferdinand"); }));
  await phone.page.waitForTimeout(4500);
  await laptop.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await laptop.page.waitForTimeout(2000);
  const names = async (pg) => pg.evaluate(() => window.SamosApp.getState().learners.map((l) => l.name).sort().join());
  const np = await names(phone.page), nl = await names(laptop.page);
  check("A learner added on one device appears on the other, and one deleted stays deleted", np === "Billy,Kenzie" && nl === "Billy,Kenzie", JSON.stringify({ np, nl }));
  check("No script errors", !phone.errors.length && !laptop.errors.length, phone.errors.concat(laptop.errors).join(" | "));
} catch (e) { check("Test run finished", false, e.message); }
await browser.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

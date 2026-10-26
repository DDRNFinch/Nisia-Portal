/* Send to my portfolio from Topics: pick the unit (only those with evidence), and My e-portfolio: save the web address
   of Aptem (or any e-portfolio), change it, and open it in one tap.   Run: node tests/e2e/zz-send.e2e.mjs */
import { site, check, errors, app, finish } from "./harness.mjs";
const SHOTS = new URL("../shots/", import.meta.url).pathname;
try {
  const ev = await app({ width: 412, height: 915 });
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(() => { localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1"); ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]'); localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna" })); });
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  const units = await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove();
    const u = data().u.map((x) => x[0]); const now = Date.now();
    evidence.push({ id: "a1", c: course, u: u[1], w: "Jointing the wall", k: [], p: [], savedAt: new Date(now - 864e5).toISOString() }, { id: "a2", c: course, u: u[3], w: "Brick wall", k: ["K4", "S2"], p: [], savedAt: new Date(now).toISOString() });
    persist(); nav("course"); return [u[1], u[3]]; });
  await ev.page.waitForSelector("#th-share"); await ev.page.click("#th-share"); await ev.page.waitForSelector("[data-sw]");
  const list = await ev.page.$$eval("[data-sw] strong", (x) => x.map((e) => e.textContent));
  await ev.page.screenshot({ path: SHOTS + "send-which.png" });
  check("Send to my portfolio asks which unit, listing only the units with evidence", JSON.stringify(list) === JSON.stringify(units), JSON.stringify(list));
  await ev.page.click('[data-sw="1"]'); await ev.page.waitForSelector("#eport-mine-url", { timeout: 8000 });
  const page1 = await ev.page.textContent("#screen");
  check("…and opens that unit's evidence, ready to send (not “no evidence”)", page1.includes(units[1]) && !/no evidence saved/i.test(page1), page1.slice(0, 200));
  await ev.page.fill("#eport-mine-url", "not a web address"); await ev.page.click("#eport-mine-save");
  const err = await ev.page.textContent("#eport-mine-err");
  await ev.page.fill("#eport-mine-url", "lincoln.aptem.co.uk/learner"); await ev.page.click("#eport-mine-save");
  await ev.page.waitForSelector("#eport-mine-go:not([disabled])", { timeout: 10000 });
  const btn = await ev.page.textContent("#eport-mine-go"), saved = await ev.page.evaluate(() => JSON.parse(localStorage.getItem("evia7-my-eportfolio")));
  await ev.page.screenshot({ path: SHOTS + "send-mine.png", fullPage: true });
  check("My e-portfolio: a bad address is explained; a good one is saved as Aptem", /doesn’t look like a web address/.test(err) && /Save and open Aptem/.test(btn) && saved.url === "https://lincoln.aptem.co.uk/learner" && saved.name === "Aptem", JSON.stringify({ err, btn, saved }));
  /* (The test computer can't reach Aptem, so it checks the address the new tab asked for.) */
  const asked = []; ev.page.context().on("request", (r) => asked.push(r.url()));
  await ev.page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const [pop, dl] = await Promise.all([ev.page.context().waitForEvent("page", { timeout: 5000 }).catch(() => null), ev.page.waitForEvent("download", { timeout: 5000 }).catch(() => null), ev.page.click("#eport-mine-go")]);
  await ev.page.waitForTimeout(800);
  const stayed = /\/evia\//.test(ev.page.url()) && !!(await ev.page.$("#eport-mine-go"));
  const next = await ev.page.textContent("#eport-mine-next"), clip = await ev.page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  await ev.page.screenshot({ path: SHOTS + "send-save-open.png", fullPage: true });
  check("Save and open Aptem: saves the unit's PDF, copies the KSB codes and opens Aptem in a new tab; Evia stays where it was",
    !!pop && asked.some((u) => /lincoln\.aptem\.co\.uk\/learner/.test(u)) && stayed && dl && /Lee-Erna_.*evidence.*\.pdf$|_evidence_.*\.pdf$/.test(dl.suggestedFilename()) && clip === "K4, S2", JSON.stringify({ pop: !!pop, stayed, file: dl && dl.suggestedFilename(), clip }));
  check("…and Evia shows what to do in Aptem: the file to pick and the KSBs to paste", new RegExp("pick " + (dl ? dl.suggestedFilename().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "x")).test(next) && /K4, S2/.test(next), next);
  if (pop) await pop.close();
  await ev.page.click("#eport-mine-edit"); await ev.page.fill("#eport-mine-url", "https://www.smartassessor.co.uk"); await ev.page.click("#eport-mine-save");
  check("…and it can be changed (Smart Assessor)", /Save and open Smart Assessor/.test(await ev.page.textContent("#eport-mine-go")));
  await ev.page.evaluate(() => nav("course")); await ev.page.waitForSelector("#th-share"); await ev.page.click("#th-share"); await ev.page.waitForSelector("#th-sw-mine");
  check("The unit list also offers Open Smart Assessor", /Open Smart Assessor/.test(await ev.page.textContent("#th-sw-mine")));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test ran to the end", false, e.stack + "\nERRORS: " + errors.join(" | ")); }
await finish();

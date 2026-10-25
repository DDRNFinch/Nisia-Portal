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
    evidence.push({ id: "a1", c: course, u: u[1], w: "Jointing the wall", k: [], p: [], savedAt: new Date(now - 864e5).toISOString() }, { id: "a2", c: course, u: u[3], w: "Brick wall", k: [], p: [], savedAt: new Date(now).toISOString() });
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
  await ev.page.waitForSelector("#eport-mine-open");
  const btn = await ev.page.textContent("#eport-mine-open"), saved = await ev.page.evaluate(() => JSON.parse(localStorage.getItem("evia7-my-eportfolio")));
  await ev.page.screenshot({ path: SHOTS + "send-mine.png", fullPage: true });
  check("My e-portfolio: a bad address is explained; a good one is saved as Aptem", /doesn’t look like a web address/.test(err) && /Open Aptem/.test(btn) && saved.url === "https://lincoln.aptem.co.uk/learner" && saved.name === "Aptem", JSON.stringify({ err, btn, saved }));
  /* (The test computer can't reach Aptem, so it checks the address the new tab asked for.) */
  const asked = []; ev.page.context().on("request", (r) => asked.push(r.url()));
  const [pop] = await Promise.all([ev.page.context().waitForEvent("page", { timeout: 5000 }).catch(() => null), ev.page.click("#eport-mine-open")]);
  await ev.page.waitForTimeout(800);
  const stayed = /\/evia\//.test(ev.page.url()) && !!(await ev.page.$("#eport-mine-open"));
  check("Open Aptem opens their e-portfolio in a new tab, to sign in there; Evia stays where it was", !!pop && asked.some((u) => /lincoln\.aptem\.co\.uk\/learner/.test(u)) && stayed, JSON.stringify({ pop: !!pop, asked: asked.slice(-3), stayed }));
  if (pop) await pop.close();
  await ev.page.click("#eport-mine-edit"); await ev.page.fill("#eport-mine-url", "https://www.smartassessor.co.uk"); await ev.page.click("#eport-mine-save");
  check("…and it can be changed (Smart Assessor)", /Open Smart Assessor/.test(await ev.page.textContent("#eport-mine-open")));
  await ev.page.evaluate(() => nav("course")); await ev.page.waitForSelector("#th-share"); await ev.page.click("#th-share"); await ev.page.waitForSelector("#th-sw-mine");
  check("The unit list also offers Open Smart Assessor", /Open Smart Assessor/.test(await ev.page.textContent("#th-sw-mine")));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test ran to the end", false, e.stack + "\nERRORS: " + errors.join(" | ")); }
await finish();

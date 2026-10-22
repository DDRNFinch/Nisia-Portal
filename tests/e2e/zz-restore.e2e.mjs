/* A wiped phone scans its code: "Is this you?", then its work comes back from the college and Evia restarts with it. */
import { check, site, LEE, errors, app, finish, session } from "./harness.mjs";
const ENR = "0e2e0000-0000-0000-0000-0000000000e1", H = { "access-control-allow-origin": "*" };
try {
  const ev = await app({ width: 412, height: 915 });
  ev.page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(m.type(), m.text().slice(0, 300)); });
  await ev.page.route(/functions\/v1\/nisia-setup/, (r) => r.fulfill({ status: 200, contentType: "application/json", headers: H, body: JSON.stringify({ token_hash: "th", learnerId: "0e2e0000-0000-0000-0000-0000000000c1", organisationId: "0e2e0000-0000-0000-0000-000000000001", enrolmentId: ENR, courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: "0e2e0000-0000-0000-0000-0000000000b2", name: "Lee Erna", course: "bricklayer", start: "2026-01-05", end: "2027-12-01", college: "E2E College", employer: "Ployer" }) }));
  await ev.page.route(/auth\/v1\/verify/, (r) => r.fulfill({ status: 200, contentType: "application/json", headers: H, body: JSON.stringify(session(LEE, "aal1", "lee@e2e.test")) }));
  const store = { "evia7-onboarding": JSON.stringify({ stage: "done", at: "2026-10-06T19:46:46Z", v: 3 }), "evia7-course": JSON.stringify("bricklayer"), "evia7-shape": "circle", "evia7-shape-picked": "1", "evia7-theme-picked": "1", "evia7-theme": "light",
    "evia7-profile": JSON.stringify({ name: "Lee Erna", start: "2026-01-05", end: "2027-12-01" }), "evia7-tips-seen": '["*"]' };
  await ev.page.route(/rest\/v1\/evia_records\?select=record_id/, (r) => r.fulfill({ status: 200, contentType: "application/json", headers: H, body: JSON.stringify(Object.entries(store).map(([k, raw]) => ({ record_id: k, data: { raw } }))) }));
  await ev.page.goto(site + "/evia/manifest.json"); await ev.page.evaluate(() => { localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1"); });
  await ev.page.goto(site + "/evia/?pair=ABC1234"); await ev.page.waitForTimeout(5000);
  await ev.page.screenshot({ path: new URL("../shots/restore-1.png", import.meta.url).pathname });
  const me = await ev.page.$('#ob-lesson [data-ob="1"]'); console.log("is this you:", !!me);
  if (me) { await me.click(); await ev.page.waitForTimeout(8000); }
  await ev.page.screenshot({ path: new URL("../shots/restore-2.png", import.meta.url).pathname });
  const st = await ev.page.evaluate(() => ({ url: location.href, main: (document.querySelector("main,#app")||{}).innerText?.slice(0, 200), active: document.querySelector(".page.active,.view.active,[data-page].active")?.id, cls: document.body.className, ob: localStorage.getItem("evia7-onboarding") }));
  console.log(JSON.stringify(st));
  check("Restored phone shows its pages", /Mixing mortar/.test(st.main || ""), JSON.stringify(st));
  await ev.page.waitForTimeout(3000); await ev.page.screenshot({ path: new URL("../shots/restore-3.png", import.meta.url).pathname }); check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("ran", false, e.stack); }
await finish();

/* A learner whose sign-in has gone (the server cancelled it): Evia asks them to reconnect, a new code from their
   assessor signs them back in as the same learner, and nothing on the phone is cleared. */
import { check, site, LEE, errors, app, finish, session } from "./harness.mjs";
const ENR = "0e2e0000-0000-0000-0000-0000000000e1";
try {
  const ev = await app({ width: 412, height: 915 });
  /* The college's side of a new code: this learner (or someone else for the wrong code). */
  await ev.page.route(/functions\/v1\/nisia-setup/, (r) => { const b = JSON.parse(r.request().postData() || "{}"); const mine = b.code !== "WRONG12";
    r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ token_hash: "th", learnerId: "0e2e0000-0000-0000-0000-0000000000c1", organisationId: "0e2e0000-0000-0000-0000-000000000001", enrolmentId: mine ? ENR : "0e2e0000-0000-0000-0000-0000000000e9", courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: "0e2e0000-0000-0000-0000-0000000000b2", name: "Lee Erna", course: "bricklayer", start: "2026-01-05", end: "2027-12-01", college: "E2E College" }) }); });
  await ev.page.route(/auth\/v1\/verify/, (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(session(LEE, "aal1", "lee@e2e.test")) }));
  const setUp = async () => { await ev.page.goto(site + "/evia/manifest.json"); await ev.page.evaluate(() => {
    localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1");
    ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna", start: "2026-01-05", end: "2027-12-01" }));
    localStorage.setItem("evia7-enrolment", JSON.stringify({ course: "bricklayer", live: true, college: "E2E College", learnerId: "0e2e0000-0000-0000-0000-0000000000c1", organisationId: "0e2e0000-0000-0000-0000-000000000001",
      enrolmentId: "0e2e0000-0000-0000-0000-0000000000e1", courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: "0e2e0000-0000-0000-0000-0000000000b2", name: "Lee Erna", employer: "Ployer Builders", start: "2026-01-05", end: "2027-12-01", joinedAt: "2026-01-05T09:00:00Z" }));
    localStorage.setItem("evia7-my-work", "kept"); }); };
  const res = {};
  /* 1. Opening Evia with no sign-in asks to reconnect; a wrong code says so; the right one reconnects. */
  await setUp(); await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(4000);
  await ev.page.evaluate(() => { const w = document.getElementById("welcome-screen"); if (w) w.remove(); document.getElementById("app").classList.remove("welcome-app-hidden"); });
  res.asked = await ev.page.evaluate(() => !!document.getElementById("rc-code"));
  await ev.page.screenshot({ path: new URL("../shots/reconnect.png", import.meta.url).pathname });
  if (res.asked) {
    await ev.page.fill("#rc-code", "WRONG-12"); await ev.page.click("#rc-go"); await ev.page.waitForTimeout(1200);
    res.wrong = await ev.page.evaluate(() => /someone else/.test(document.getElementById("rc-err").textContent));
    await ev.page.fill("#rc-code", "ABC-1234"); await ev.page.click("#rc-go"); await ev.page.waitForTimeout(2000);
    res.closed = await ev.page.evaluate(() => !document.getElementById("rc-code"));
  }
  res.signedIn = await ev.page.evaluate(() => !!JSON.parse(localStorage.getItem("evia7-nisia-auth") || "null"));
  res.kept = await ev.page.evaluate(() => localStorage.getItem("evia7-my-work") === "kept" && JSON.parse(localStorage.getItem("evia7-enrolment")).joinedAt === "2026-01-05T09:00:00Z");
  res.messages = await ev.page.evaluate(async () => Array.isArray(await window.eviaNisia.call("msg_threads", {})));
  /* 2. A new code scanned (?pair=) on a phone whose sign-in has gone: reconnects without clearing anything. */
  await setUp(); await ev.page.goto(site + "/evia/?pair=ABC1234"); await ev.page.waitForTimeout(5000);
  res.pairSignedIn = await ev.page.evaluate(() => !!JSON.parse(localStorage.getItem("evia7-nisia-auth") || "null"));
  res.pairKept = await ev.page.evaluate(() => localStorage.getItem("evia7-my-work") === "kept");
  check("Lost sign-in: Evia asks to reconnect, a new code signs back in, nothing is cleared", Object.values(res).every(Boolean), JSON.stringify(res));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("ran", false, e.stack); }
await finish();

/* Evia, explored: a learner connected to the test Evia Portal, with evidence, photos and hours, taps every tab, every
   button, and every button on the screens those open, then everything in Evia's chat. Anything that throws, logs an
   error, scrolls sideways, goes blank or shows "undefined"/"NaN" is a failure.
   Run: node tests/e2e/explore-evia.e2e.mjs   (needs Postgres 16) */
import { check, session, site, LEE, ENROL, errors, app, finish } from "./harness.mjs";
import { explore } from "../explore.mjs";

try {
  const ev = await app({ width: 412, height: 915 });
  await ev.ctx.grantPermissions(["camera", "microphone"]).catch(() => {});
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(([tok, enrol]) => {
    localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1");
    ["evia7-theme-picked", "evia7-shape-picked"].forEach((k) => localStorage.setItem(k, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    localStorage.setItem("evia7-home-tip", JSON.stringify({ day: new Date().toDateString(), id: "x" }));
    localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna", start: "2026-01-05", end: "2027-12-01" }));
    localStorage.setItem("evia7-enrolment", JSON.stringify({ course: "bricklayer", live: true, college: "E2E College", learnerId: "0e2e0000-0000-0000-0000-0000000000c1", organisationId: "0e2e0000-0000-0000-0000-000000000001",
      enrolmentId: enrol, courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: "0e2e0000-0000-0000-0000-0000000000b2", name: "Lee Erna", employer: "Ployer Builders", start: "2026-01-05", end: "2027-12-01", joinedAt: new Date().toISOString() }));
    localStorage.setItem("evia7-nisia-auth", JSON.stringify(tok));
  }, [session(LEE, "aal1", "lee@e2e.test"), ENROL]);
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); });
  /* Some of Lee's work: two pieces of evidence with photos, and learning hours. */
  await ev.page.evaluate(async () => {
    const cv = document.createElement("canvas"); cv.width = 300; cv.height = 220; const g = cv.getContext("2d");
    for (let i = 0; i < 2; i++) {
      const ids = [];
      for (let j = 0; j < 2; j++) { g.fillStyle = "hsl(" + (i * 90 + j * 30) + ",45%,55%)"; g.fillRect(0, 0, 300, 220); ids.push(await window.eviaStoreEvidencePhoto(await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.8)))); }
      const u = data().u[i];
      window.eviaData.put("evidence", { course, unit: u[0], text: "I set out the job from the drawings, checked it was plumb and level, and cleaned up after.", ksbs: u[1].map(code), photoIds: ids });
    }
    window.eviaData.put("hours", { minutes: 120, description: "College day" });
    nav("course");
  });
  await ev.page.evaluate(() => window.eviaNisia.sync()).catch(() => {});
  await ev.page.waitForTimeout(800);
  const start = Date.now();
  const xp = await explore(ev.page, { app: "Evia", tabSel: ".bottom-nav [data-nav], #evia-fab", skip: /camera|take a photo|record|video|voice note|scan|check in to class|find a battle/, max: 900, perScreen: 45,
    settle: (p) => p.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); }).catch(() => {}) });
  check("Explore Evia: " + xp.taps + " buttons on " + xp.screens + " screens (" + Math.round((Date.now() - start) / 60000) + " min), none breaks anything", xp.taps > 100 && !xp.problems.length, xp.problems.join("\n"));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test finished", false, e.stack || e.message); }
await finish();

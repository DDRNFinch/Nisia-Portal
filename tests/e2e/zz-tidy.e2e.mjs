import { check, q, rpc, site, LEE, TEE, errors, app, finish, session } from "./harness.mjs";
const TEE_M = "0e2e0000-0000-0000-0000-0000000000b1";
const out = (n) => new URL("../shots/tidy-" + n + ".png", import.meta.url).pathname;
try {
  await rpc("msg_send", { p_with: "0e2e0000-0000-0000-0000-0000000000b2", p_body: "See you Tuesday" }, { sub: TEE, aal: "aal2" });
  const ev = await app({ width: 412, height: 915 });
  ev.page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text().slice(0, 200)); });
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(([tok]) => {
    localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1");
    ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna", start: "2026-01-05", end: "2027-12-01" }));
    localStorage.setItem("evia7-enrolment", JSON.stringify({ course: "bricklayer", live: true, college: "E2E College", learnerId: "0e2e0000-0000-0000-0000-0000000000c1", organisationId: "0e2e0000-0000-0000-0000-000000000001",
      enrolmentId: "0e2e0000-0000-0000-0000-0000000000e1", courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: "0e2e0000-0000-0000-0000-0000000000b2", name: "Lee Erna", employer: "Ployer Builders", start: "2026-01-05", end: "2027-12-01", joinedAt: new Date().toISOString() }));
    localStorage.setItem("evia7-nisia-auth", JSON.stringify(tok));
  }, [session(LEE, "aal1", "lee@e2e.test")]);
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); nav("course"); });
  const res = {};
  for (const [tab, sel] of [["course", "#ui-course-head"], ["learning", "#th-log"], ["calendar", "#th-cal"], ["teach", ".tg-player"]]) {
    await ev.page.evaluate((t) => nav(t), tab); await ev.page.waitForTimeout(1500);
    res[tab] = await ev.page.evaluate((s) => !!document.querySelector(s) && !!document.getElementById("th-me"), sel);
    await ev.page.screenshot({ path: out(tab), fullPage: true });
  }
  await ev.page.evaluate(() => nav("calendar")); await ev.page.waitForTimeout(800); await ev.page.click("#th-cal"); await ev.page.waitForTimeout(1000);
  res.full = await ev.page.evaluate(() => !!document.getElementById("cal-month") && !!document.querySelector(".th-back"));
  await ev.page.screenshot({ path: out("calendar-full"), fullPage: true });
  await ev.page.click(".th-back"); await ev.page.waitForTimeout(500); res.back = await ev.page.evaluate(() => !!document.getElementById("th-cal"));
  await ev.page.evaluate(() => nav("course")); await ev.page.waitForTimeout(800); await ev.page.click("#th-me"); await ev.page.waitForTimeout(800);
  res.profile = await ev.page.evaluate(() => !!document.querySelector(".profile-sheet"));
  await ev.page.evaluate(() => { document.getElementById("modal-root").innerHTML = ""; }); await ev.page.click("[data-u='0']"); await ev.page.waitForTimeout(1200);
  res.unit = await ev.page.evaluate(() => !document.getElementById("ui-course-head"));
  res.label = await ev.page.evaluate(() => document.getElementById("nav-college").textContent);
  console.log("tops", await ev.page.evaluate(() => { nav("teach"); const h = document.querySelector(".th-head"); let e = h, out = []; while (e && e !== document.body) { const cs = getComputedStyle(e); out.push(e.tagName + "#" + e.id + "." + e.className + " pt=" + cs.paddingTop + " mt=" + cs.marginTop + " top=" + Math.round(e.getBoundingClientRect().top)); e = e.parentElement; } return out.join(" | "); }));
  check("Tidy layout: every tab has the header; Plan opens the full calendar and back; profile and units open", Object.values(res).every(Boolean) && res.label === "Plan", JSON.stringify(res));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("ran", false, e.stack); }
await finish();

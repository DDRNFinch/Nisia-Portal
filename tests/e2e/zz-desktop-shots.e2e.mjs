/* Desktop screenshots of every app signed in (1440 × 900), for checking the desktop layouts. Run: node tests/e2e/zz-desktop-shots.e2e.mjs */
import { check, site, errors, app, signIn, finish } from "./harness.mjs";
const SHOTS = new URL("../shots/", import.meta.url).pathname, desk = { width: 1440, height: 900 };
try {
  const ev = await app(desk); await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(() => { localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1"); ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]'); localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna", start: "2025-09-01", end: "2027-08-31" })); localStorage.setItem("view-evia", "desktop"); });
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); nav("course"); });
  await ev.page.waitForTimeout(800); await ev.page.screenshot({ path: SHOTS + "desk-evia.png" });
  for (const s of ["calendar", "learning", "teach"]) { await ev.page.evaluate((s) => nav(s), s); await ev.page.waitForTimeout(700); await ev.page.screenshot({ path: SHOTS + "desk-evia-" + s + ".png" }); }
  const pa = await app(desk); await pa.page.goto(site + "/apps/paros/"); await signIn(pa.page, "em@e2e.test"); await pa.page.waitForSelector("[data-tab=apprentices]"); await pa.page.waitForTimeout(1200);
  await pa.page.screenshot({ path: SHOTS + "desk-paros.png" });
  await pa.page.click("[data-tab=apprentices]"); await pa.page.waitForTimeout(700); await pa.page.screenshot({ path: SHOTS + "desk-paros-apprentices.png" });
  await pa.page.click(".m-list [data-id], [data-id]"); await pa.page.waitForTimeout(900); await pa.page.screenshot({ path: SHOTS + "desk-paros-apprentice.png" });
  const mi = await app(desk); await mi.page.goto(site + "/apps/milos/"); await signIn(mi.page, "tee@e2e.test"); await mi.page.waitForTimeout(3000);
  await mi.page.screenshot({ path: SHOTS + "desk-milos.png" });
  const sy = await app(desk); await sy.page.goto(site + "/apps/symi/update.json"); await sy.page.evaluate(() => { localStorage.clear(); localStorage.setItem("symi-last-seen-release-v1", "9.9.9"); localStorage.setItem("view-symi", "desktop"); });
  await sy.page.goto(site + "/apps/symi/"); await sy.page.waitForTimeout(2000); await sy.page.screenshot({ path: SHOTS + "desk-symi.png" });
  const po = await app(desk); await po.page.goto(site + "/apps/nisia-web/"); await signIn(po.page, "tee@e2e.test"); await po.page.waitForTimeout(2500); await po.page.screenshot({ path: SHOTS + "desk-portal.png" });
  check("Screenshots taken", true);
} catch (e) { check("The test ran to the end", false, e.stack + "\nERRORS: " + errors.join(" | ")); }
await finish();

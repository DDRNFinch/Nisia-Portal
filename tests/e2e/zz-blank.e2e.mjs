/* Evia breaks while starting (here: a damaged saved list): it says so, with the error, instead of a blank page. */
import { check, site, errors, app, finish } from "./harness.mjs";
try {
  const ev = await app({ width: 412, height: 915 });
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(() => { localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1"); ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]'); localStorage.setItem("evia7-hours", "{broken"); });
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(3000);
  await ev.page.evaluate(() => { const w = document.getElementById("welcome-screen"); if (w) w.remove(); document.getElementById("app").classList.remove("welcome-app-hidden"); });
  await ev.page.waitForTimeout(6000);
  await ev.page.screenshot({ path: new URL("../shots/blank.png", import.meta.url).pathname });
  const t = await ev.page.evaluate(() => document.getElementById("screen").innerText);
  check("A damaged saved list doesn't stop Evia starting", /Mixing mortar/.test(t), t.slice(0, 200));
  /* Something else breaks while starting: Evia says so instead of a blank page. */
  await ev.page.route(/\/evia\/app\.js/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()) + "\nthrow new Error('Test start problem');" }); });
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(3000);
  await ev.page.evaluate(() => { const w = document.getElementById("welcome-screen"); if (w) w.remove(); document.getElementById("app").classList.remove("welcome-app-hidden"); document.getElementById("screen").innerHTML = ""; });
  await ev.page.waitForTimeout(6000);
  await ev.page.screenshot({ path: new URL("../shots/blank.png", import.meta.url).pathname });
  const t2 = await ev.page.evaluate(() => document.getElementById("screen").innerText);
  check("A broken start shows what went wrong", /didn’t start properly/.test(t2) && /Test start problem/.test(t2), t2.slice(0, 300));
  errors.length = 0;
} catch (e) { check("ran", false, e.stack); }
await finish();

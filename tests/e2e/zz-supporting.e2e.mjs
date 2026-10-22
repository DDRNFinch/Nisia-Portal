/* Supporting evidence photos: several photos (camera or gallery) and an optional comment, saved as one PDF. */
import { site, check, errors, app, finish } from "./harness.mjs";
const png = (c) => Buffer.from(c, "base64");
const RED = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
try {
  const ev = await app({ width: 412, height: 915 });
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(() => { localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1"); ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]'); localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna" })); });
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); window.eviaCamera.supported = () => false; openSupportingEvidence(); });
  await ev.page.click('[data-supporting-type="photo"]'); await ev.page.waitForSelector("#supporting-choose-photo");
  const res = {};
  res.disabled = await ev.page.evaluate(() => document.getElementById("supporting-save-photo").disabled);
  for (const n of [2, 1]) {
    const [fc] = await Promise.all([ev.page.waitForEvent("filechooser"), ev.page.click("#supporting-choose-photo")]);
    await fc.setFiles(Array.from({ length: n }, (_, i) => ({ name: "p" + n + i + ".png", mimeType: "image/png", buffer: png(RED) }))); await ev.page.waitForTimeout(300);
  }
  res.three = await ev.page.evaluate(() => document.querySelectorAll(".sp-shot").length === 3 && /3 photos/.test(document.getElementById("supporting-save-photo").textContent));
  await ev.page.click('.sp-x[data-x="2"]'); await ev.page.waitForTimeout(100);
  res.removed = await ev.page.evaluate(() => document.querySelectorAll(".sp-shot").length === 2);
  await ev.page.fill("#sp-note", "Setting out the corner with a builder's square");
  await ev.page.screenshot({ path: new URL("../shots/supporting-photos.png", import.meta.url).pathname });
  await ev.page.click("#supporting-save-photo"); await ev.page.waitForTimeout(2500);
  await ev.page.screenshot({ path: new URL("../shots/supporting-about.png", import.meta.url).pathname });
  res.plain = await ev.page.evaluate(() => getComputedStyle(document.querySelector("label.sd-field")).backgroundImage === "none");
  const saved = await ev.page.evaluate(async () => { const r = supportingMeta().slice(-1)[0]; const f = await window.eviaSupportingFileGet(r.id); const b = f && (f.blob || f);
    const head = b ? await b.slice(0, 5).text() : ""; const b64 = b ? await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1]); fr.readAsDataURL(b); }) : ""; return { r, head, size: b ? b.size : 0, about: !!document.getElementById("sd-title"), b64 }; });
  (await import("node:fs")).writeFileSync(new URL("../shots/supporting-photos.pdf", import.meta.url).pathname, Buffer.from(saved.b64, "base64")); delete saved.b64;
  res.pdf = saved.r.mime === "application/pdf" && saved.head === "%PDF-" && saved.r.photos === 2 && /Setting out/.test(saved.r.text) && saved.about;
  check("Supporting photos: several photos from the camera or gallery, remove any, an optional comment, saved as one PDF", Object.values(res).every(Boolean), JSON.stringify({ res, saved }));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("ran", false, e.stack); }
await finish();

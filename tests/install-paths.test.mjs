/* Getting the apps works the same way every time, whatever phone or browser opens the link:
   - inside another app's browser (WhatsApp, Gmail…), which can't install: one button opens it in Chrome (Android)
     or copies the link for Safari (iPhone);
   - in Chrome with no install offer: the steps, and a button that opens it in Chrome itself;
   - Evia's "get the app" screen never traps anyone: "Can't install it?" carries on in the browser;
   - the portal's app links: on a computer, a code to scan and the app on the computer; on a phone, straight to it.
   Each app's install identity and start address never change between versions (a changing start address makes
   Android rebuild the installed app, which can leave a broken "already installed"). */
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html"; const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }).listen(0);
const site = "http://localhost:" + srv.address().port;
const results = []; const check = (n, ok, d) => { results.push(!!ok); console.log((ok ? "✓ " : "✗ ") + n + (ok || !d ? "" : " — " + String(d).slice(0, 400))); };

const UA = {
  whatsappAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 WhatsApp/2.24",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  instagramIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
};
const b = await pw.chromium.launch();
async function open(url, ua, phone = true) {
  const ctx = await b.newContext({ userAgent: ua, viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 860 }, hasTouch: phone, isMobile: phone, serviceWorkers: "block" });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(1500); return { p, ctx, errs };
}

/* 1. The install card (Symi, Milos, Paros and the portal share it). */
for (const [app, dir] of [["Symi", "apps/symi/"], ["Milos", "apps/milos/"], ["Paros", "apps/paros/"]]) {
  const w = await open(site + "/" + dir + "?install", UA.whatsappAndroid);
  await w.p.waitForSelector(".nisia-install", { timeout: 5000 }).catch(() => {});
  const a = await w.p.$eval(".nisia-install a.ni-go", (x) => ({ text: x.textContent, href: x.getAttribute("href") })).catch(() => null);
  check(app + ", opened inside WhatsApp on Android: one button opens it in Chrome", a && a.text === "Open in Chrome" && /^intent:\/\/localhost:\d+\/apps\/.*#Intent;scheme=https;package=com\.android\.chrome;/.test(a.href), JSON.stringify(a));
  await w.ctx.close();
}
{
  const w = await open(site + "/apps/symi/?install", UA.instagramIphone);
  await w.p.waitForSelector(".nisia-install", { timeout: 5000 }).catch(() => {});
  const t = await w.p.textContent(".nisia-install").catch(() => "");
  check("Symi, opened inside Instagram on an iPhone: says to open it in Safari, with Copy link", /Safari/.test(t) && /Copy link/.test(t), t);
  await w.ctx.close();
}
{
  const w = await open(site + "/apps/milos/?install", UA.chromeAndroid);
  await w.p.waitForSelector(".nisia-install", { timeout: 6000 }).catch(() => {});
  const t = await w.p.textContent(".nisia-install").catch(() => "");
  check("Milos in Chrome on Android with no install offer: the ⋮ steps, and Open in Chrome", /⋮/.test(t) && /Open in Chrome/.test(t), t);
  await w.ctx.close();
}

/* 2. Evia's "get the app" screen. */
{
  const w = await open(site + "/apps/evia/", UA.whatsappAndroid);
  const go = await w.p.textContent("#gi-go").catch(() => "");
  const why = await w.p.textContent("#get-app").catch(() => "");
  check("Evia, opened inside WhatsApp on Android: the button is Open in Chrome, and it says why", go === "Open in Chrome" && /can’t install apps/.test(why), go + " | " + why);
  await w.p.click("#gi-browser");
  const gone = !(await w.p.$("#get-app"));
  await w.p.reload(); await w.p.waitForTimeout(1200);
  const stillGone = !(await w.p.$("#get-app"));
  check("Evia: “Can’t install it? Use Evia in this browser” carries on, and doesn't ask again next time", gone && stillGone);
  await w.ctx.close();
}
{
  const w = await open(site + "/apps/evia/", UA.safariIphone);
  await w.p.click("#gi-go"); await w.p.waitForTimeout(300);
  const t = await w.p.textContent("#get-app").catch(() => "");
  check("Evia in Safari on an iPhone: Share at the bottom, then Add to Home Screen", /Share/.test(t) && /bottom of Safari/.test(t) && /Add to Home Screen/.test(t), t);
  await w.ctx.close();
}

/* 3. The portal's app links. (Signed out it shows the sign-in; the links are tested by opening the menu's handler directly.) */
{
  const w = await open(site + "/apps/nisia-web/", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", false);
  await w.p.evaluate(() => { const a = document.createElement("a"); a.href = "../tutor/"; a.dataset.app = "Symi"; a.id = "t-symi"; a.textContent = "Symi"; document.body.appendChild(a); });
  await w.p.click("#t-symi"); await w.p.waitForTimeout(500);
  const m = await w.p.textContent("#modal").catch(() => "");
  const qr = await w.p.$("#modal svg");
  check("Portal on a computer: an app link shows a code to scan with the phone, and opens it on the computer too", /Get Symi/.test(m) && !!qr && /Open Symi on this computer/.test(m), m.slice(0, 200));
  check("Portal: no script errors", !w.errs.length, w.errs.join(" | "));
  await w.ctx.close();
}

/* 4. Install identities and start addresses: fixed. */
const man = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const M = { Evia: man("apps/evia/manifest.json"), Symi: man("apps/symi/app.webmanifest"), Milos: man("apps/milos/app.webmanifest"), Paros: man("apps/paros/manifest.webmanifest"), Portal: man("apps/nisia-web/manifest.webmanifest") };
const ids = { Evia: "/nisia-app/evia/", Symi: "/nisia-app/tutor/", Milos: "/nisia-app/milos/app", Paros: "/nisia-app/paros/", Portal: "/nisia-app/nisia/" };
const bad = Object.entries(M).filter(([n, m]) => m.id !== ids[n] || m.start_url !== "./" || m.scope !== "./" || m.display !== "standalone");
check("Every app keeps the same install identity and start address, version after version", !bad.length, JSON.stringify(bad.map(([n, m]) => [n, m.id, m.start_url, m.scope])));

await b.close(); srv.close();
const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);

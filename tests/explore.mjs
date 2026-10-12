/* Explore: tap every tab, then every button on every screen, and every button on the screens those open (two levels
   deep), the way a curious new user would. Reports anything that throws, logs an error, scrolls sideways, goes blank
   or shows "undefined"/"NaN". Used at the end of each app's test, on its stand-in Nisia, so nothing real changes.
   Signing out, deleting and leaving the app are skipped.
   explore(page, { app, tabSel | tabs, skip, depth = 2, max = 700 }) → { screens, taps, problems: [..], lost: [..] } */
export async function explore(page, { app, tabs, tabSel, skip, depth = 2, max = 700, perScreen = 40, settle } = {}) {
  if (tabSel) { const n = await page.locator(tabSel).count(); tabs = [...Array(n).keys()].map((k) => tabSel + " >> nth=" + k); }
  if (process.env.XP_TABS && tabs) tabs = tabs.filter((_, k) => process.env.XP_TABS.split(",").includes(String(k)));
  page.on("crash", () => console.log("explore: the page crashed (" + app + ")"));
  if (process.env.XP_LOG) { page.on("close", () => console.log("explore: the page closed")); page.context().browser() && page.context().browser().on("disconnected", () => console.log("explore: the browser went away")); }
  /* lost: screens the explorer couldn't find its way back to (a label that changes, like a count or a month): not a fault in the app. */
  const problems = [], errs = [], lost = [];
  const onErr = (e) => errs.push(e.message || String(e));
  const onCon = (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|ERR_INTERNET_DISCONNECTED|Failed to fetch|NetworkError/.test(m.text())) errs.push(m.text()); };
  page.on("pageerror", onErr); page.on("console", onCon);
  const dlg = (d) => d.dismiss().catch(() => {}); page.on("dialog", dlg);
  const SKIP = new RegExp("sign out|log out|delete|remove|archive|end class|end the|reset|clear (all|data|everything)|uninstall|leave|switch off|turn off|disconnect|print|download|share|install" + (skip ? "|" + skip.source : ""), "i");
  const start = page.url();
  let taps = 0, screens = 0;
  const visible = () => page.evaluate((skipSrc) => {
    const SK = new RegExp(skipSrc, "i"), out = [], seen = {};
    document.querySelectorAll("[data-xp]").forEach((e) => e.removeAttribute("data-xp"));
    [...document.querySelectorAll('button, [role=button], a[href^="#"], a:not([href]), summary')].forEach((el, i) => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === "hidden" || cs.display === "none" || el.disabled || el.closest("[hidden],[inert]")) return;
      const label = (el.getAttribute("aria-label") || el.textContent || el.title || "").replace(/\s+/g, " ").trim().slice(0, 60);
      if (!label || SK.test(label)) return;
      const k = seen[label] = (seen[label] || 0) + 1;
      el.dataset.xp = String(i); out.push({ i, label: k > 1 ? label + " #" + k : label });
    });
    return out;
  }, SKIP.source);
  const state = () => page.evaluate(() => ({ sideways: document.documentElement.scrollWidth > innerWidth + 2, blank: document.body.innerText.trim().length < 20,
    oops: (document.body.innerText.match(/\b(undefined|NaN|\[object Object\])\b/) || [""])[0] }));
  const closeAll = async () => {
    for (let k = 0; k < 4; k++) {
      const shut = await page.evaluate(() => {
        for (const sel of ['[aria-label="Close"]', ".close", "[data-close]", ".sheet-close", ".modal-close", "[data-ci-close]", ".sn-x", ".sn-close"]) {
          const b = [...document.querySelectorAll(sel)].reverse().find((x) => x.offsetParent !== null); if (b) { b.click(); return true; }
        }
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return false;
      }).catch(() => false);
      if (!shut) break; await page.waitForTimeout(150);
    }
  };
  const tapLabel = async (label) => {
    const list = await visible().catch(() => []), b = list.find((x) => x.label === label);
    if (!b) return false;
    try { await page.click('[data-xp="' + b.i + '"]', { timeout: 1500 }); } catch (_) { return false; }
    await page.waitForTimeout(350); return true;
  };
  /* Back to a screen: the start page, the tab, then the buttons that led there. */
  const goTo = async (tab, path) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt || page.url() !== start) { await page.goto(start).catch(() => {}); await page.waitForTimeout(attempt ? 2500 : 900); if (settle) await settle(page); }
      await closeAll();
      if (tab) { try { await page.click(tab, { timeout: 2000 }); } catch (_) { continue; } await page.waitForTimeout(350); }
      let ok = true;
      for (const l of path) if (!(await tapLabel(l))) { ok = false; break; }
      if (ok) return true;
    }
    return false;
  };
  const tabName = async (tab) => tab ? ((await page.locator(tab).getAttribute("aria-label").catch(() => "")) || (await page.locator(tab).textContent().catch(() => "")) || tab).trim().slice(0, 30) : "home";
  async function screen(tab, path, name) {
    screens++;
    const tried = new Set();
    for (let n = 0; n < perScreen && taps < max; n++) {
      if (!(await goTo(tab, path))) { lost.push(name); return; }
      const list = await visible().catch(() => []), b = list.find((x) => !tried.has(x.label));
      if (!b) return;
      tried.add(b.label);
      errs.length = 0;
      const before = await page.evaluate(() => document.body.innerText.length + "|" + location.href).catch(() => "");
      if (process.env.XP_LOG) console.log("tap: " + name + " › " + b.label);
      try { await page.click('[data-xp="' + b.i + '"]', { timeout: 1500 }); taps++; } catch (_) { continue; }
      if (page.isClosed()) { problems.push(name + " › “" + b.label + "”: closed the app"); break; }
      await page.waitForTimeout(400);
      const st = await state().catch(() => ({})), where = name + " › “" + b.label + "”";
      if (errs.length) problems.push(where + ": " + errs.join(" | ").slice(0, 220));
      if (st.sideways) problems.push(where + ": the page scrolls sideways");
      if (st.oops) problems.push(where + ": shows “" + st.oops + "”");
      if (st.blank) problems.push(where + ": the screen is blank");
      const after = await page.evaluate(() => document.body.innerText.length + "|" + location.href).catch(() => "");
      if (path.length + 1 < depth && after !== before && !/back|cancel|close|done|no thanks|not now|later/i.test(b.label)) await screen(tab, path.concat(b.label), where);
    }
  }
  for (const tab of tabs || [null]) {
    if (taps >= max) break;
    /* A fresh start for each tab, as a person reopening the app would have. */
    await page.goto(start).catch(() => {}); await page.waitForTimeout(1500); if (settle) await settle(page);
    await screen(tab, [], app + " › " + (await tabName(tab)));
  }
  await goTo(null, []);
  page.off("pageerror", onErr); page.off("console", onCon); page.off("dialog", dlg);
  return { screens, taps, problems: [...new Set(problems)], lost };
}

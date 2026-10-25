/* Rate Evia (feedback.js, run-2026-10-25-feedback.sql): stars and words both needed, the learner's usage over time
   shared anonymously if they choose, and the master admin's Usage page showing the ratings and the results, with the
   testers left out.   Run: node tests/e2e/feedback.e2e.mjs   (needs Postgres 16) */
import fs from "node:fs";
import { check, q, rpc, root, site, TEE, LEE, errors, app, signIn, finish } from "./harness.mjs";
const SHOTS = new URL("../shots/", import.meta.url).pathname;
try {
  await q(fs.readFileSync(root + "/services/supabase/usage-impact.sql", "utf8"));
  await q(fs.readFileSync(root + "/services/supabase/run-2026-10-25-feedback.sql", "utf8"));
  const bad = [await rpc("nisia_feedback_send", { p: { stars: 6, comment: "Really good app overall" } }), await rpc("nisia_feedback_send", { p: { stars: 4, comment: "ok" } })];
  check("Feedback needs 1 to 5 stars and some words (anything else is dropped)", bad.every((r) => r.status < 300) && +(await q(`select count(*) n from public.evia_feedback`))[0].n === 0, JSON.stringify(bad));

  /* A learner 5 weeks in, with evidence and hours, rates Evia from the bottom of Review. */
  const ev = await app({ width: 412, height: 915 });
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(() => { localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1"); ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    const W = 7 * 864e5, now = Date.now(), start = new Date(now - 5 * W + 864e5).toISOString().slice(0, 10);
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna", start, end: new Date(now + 60 * W).toISOString().slice(0, 10) }));
    localStorage.setItem("evia7-evidence", JSON.stringify([1, 2, 9, 16].map((d, i) => ({ id: "e" + i, c: "", u: "Unit " + i, w: "Wall", k: [], p: [], savedAt: new Date(now - d * 864e5).toISOString() }))));
    localStorage.setItem("evia7-hours", JSON.stringify([[2, 3], [10, 2.5], [30, 4]].map(([d, h], i) => ({ id: "h" + i, n: h, mins: h * 60, description: "Site", createdAt: now - d * 864e5 })))); });
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); nav("learning"); });
  await ev.page.waitForSelector("#th-rate", { timeout: 8000 });
  const rowText = await ev.page.textContent("#th-rate");
  await ev.page.click("#th-rate"); await ev.page.waitForSelector(".er-wrap");
  const s0 = await ev.page.evaluate(() => document.getElementById("er-send").disabled && document.getElementById("er-just").disabled);
  await ev.page.click('.er-star[data-s="4"]');
  await ev.page.fill("#er-words", "Short");
  const s1 = await ev.page.evaluate(() => ({ off: document.getElementById("er-send").disabled, left: document.querySelector(".er-left").textContent, say: document.querySelector(".er-say").textContent, lit: document.querySelectorAll(".er-star.on").length }));
  await ev.page.fill("#er-words", "Really easy to log my evidence on site. Would like more maths lessons.");
  const s2 = await ev.page.evaluate(() => !document.getElementById("er-send").disabled);
  await ev.page.click(".er-what summary"); await ev.page.screenshot({ path: SHOTS + "rate-evia.png" });
  check("Rate Evia is at the bottom of Review; both buttons wait for stars and a few words", /Rate Evia/.test(rowText) && s0 && s1.off && /more letters/.test(s1.left) && s1.say === "Really good" && s1.lit === 4 && s2, JSON.stringify({ rowText, s0, s1, s2 }));
  await ev.page.click("#er-send"); await ev.page.waitForTimeout(1500);
  const [f] = await q(`select * from public.evia_feedback order by id desc limit 1`);
  const u = f && f.usage;
  check("Sent with their usage over time: week by week from their start, with totals and no name",
    f && f.stars === 4 && /maths lessons/.test(f.comment) && f.tester === true && !!f.fid && u && u.weeks === 5 && u.by_week.length === 5 && u.totals.evidence === 4 && u.totals.hours === 9.5 &&
    u.by_week[4].e === 2 && u.by_week[4].h === 3 && !/Lee|Erna/.test(JSON.stringify(f)), JSON.stringify(f));
  await ev.page.waitForTimeout(300);
  const after = await ev.page.textContent("#th-rate").catch(() => "");
  check("…and Review shows they rated it (they can rate again)", /You gave 4 stars/.test(after), after);
  /* Without usage. */
  await ev.page.click("#th-rate"); await ev.page.click('.er-star[data-s="5"]'); await ev.page.fill("#er-words", "Second go, still loving it."); await ev.page.click("#er-just"); await ev.page.waitForTimeout(1200);
  const [g] = await q(`select * from public.evia_feedback order by id desc limit 1`);
  check("“Send without my usage” sends just the stars and words", g && g.stars === 5 && g.usage === null && g.fid === f.fid, JSON.stringify(g));

  /* The master admin: refused for anyone else; testers left out unless asked. */
  await q(`insert into public.evia_feedback (stars, comment, course, fid, tester, usage) values (3, 'From a real learner at another college', 'bricklayer', 'real1', false,
    '{"weeks":3,"active_weeks":3,"aim_per_week":6,"totals":{"evidence":6,"hours":20},"ksbs":{"met":10,"total":40},"by_week":[{"w":1,"e":2,"s":0,"h":7,"l":0,"t":0},{"w":2,"e":2,"s":0,"h":6,"l":1,"t":0},{"w":3,"e":2,"s":0,"h":7,"l":0,"t":1}]}')`);
  await q(`insert into public.platform_admins values ($1) on conflict do nothing`, [TEE]);
  const no = await rpc("nisia_admin_feedback", {}, { sub: LEE, aal: "aal2" }), yes = await rpc("nisia_admin_feedback", {}, { sub: TEE, aal: "aal2" }), all = await rpc("nisia_admin_feedback", { p_testing: true }, { sub: TEE, aal: "aal2" });
  check("Only the master admin sees feedback, testers left out unless asked", no.status >= 400 && yes.status === 200 && yes.body.length === 1 && yes.body[0].fid === "real1" && all.body.length === 3, JSON.stringify([no.status, yes.body && yes.body.length, all.body && all.body.length]));
  await q(`insert into public.usage_daily (day, app, counts, tester) values (current_date - 1, 'evia', '{"saved.evidence":3}', false), (current_date - 1, 'evia', '{"saved.evidence":50}', true)`);
  const us = await rpc("nisia_admin_usage_by", { p_days: 30 }, { sub: TEE, aal: "aal2" });
  check("Usage leaves the testers out and says how many", us.status === 200 && us.body.apps.find((a) => a.app === "evia").device_days === 1 && us.body.left_out === 1, JSON.stringify(us.body && us.body.apps));

  /* The Usage page. */
  const po = await app({ width: 1280, height: 900 });
  await po.page.goto(site + "/apps/nisia-web/"); await signIn(po.page, "tee@e2e.test");
  await po.page.waitForTimeout(2500);
  await po.page.evaluate(() => { const b = [...document.querySelectorAll("button,a")].find((x) => /^\s*Usage\s*$/.test(x.textContent) || /Usage/.test(x.getAttribute("aria-label") || "")); if (b) b.click(); });
  await po.page.waitForSelector("text=Evia at a glance", { timeout: 10000 });
  await po.page.screenshot({ path: SHOTS + "portal-usage.png", fullPage: true });
  const pt = await po.page.textContent("#app");
  check("The portal's Usage page: what the numbers are, Evia at a glance with the rating, learners' results and what they say",
    /What these numbers are/.test(pt) && /Rating3\/5/.test(pt.replace(/\s+/g, "")) && /Learners who shared their usage/.test(pt) && /Evidence added a week\s*2/.test(pt) && /From a real learner/.test(pt) && !/maths lessons/.test(pt) && /left out \(1 line in/.test(pt), pt.slice(0, 900));
  await po.page.click("#uTest"); await po.page.waitForSelector("text=Leave them out");
  const pt2 = await po.page.textContent("#app");
  check("…and Include them shows the testers' feedback too", /maths lessons/.test(pt2) && /from 2 learners/.test(pt2), pt2.slice(0, 600));
  /* Connected or not: a learner joined to a college, with feedback sent while connected. */
  await q(`insert into public.usage_daily (day, app, counts, organisation_id) values (current_date - 2, 'evia', '{"saved.evidence":7}', '0e2e0000-0000-0000-0000-000000000001')`);
  await q(`insert into public.evia_feedback (stars, comment, fid, connected) values (5, 'Joined to my college and it is great', 'conn1', true)`);
  const cu = await rpc("nisia_admin_usage_by", { p_days: 30, p_who: "connected" }, { sub: TEE, aal: "aal2" }), nu = await rpc("nisia_admin_usage_by", { p_days: 30, p_who: "unconnected" }, { sub: TEE, aal: "aal2" });
  const ed = (r) => (r.body.apps.find((a) => a.app === "evia") || {}).device_days || 0;
  check("Usage for connected learners only, and for those on their own", cu.status === 200 && ed(cu) === 1 && ed(nu) === 1, JSON.stringify([cu.body && cu.body.apps, nu.body && nu.body.apps]));
  await po.page.click("#uTest"); await po.page.waitForSelector("text=Include them");
  await po.page.click('[data-who="unconnected"]'); await po.page.waitForSelector('[data-who="unconnected"][aria-pressed="true"]');
  const pu = await po.page.textContent("#app");
  await po.page.click('[data-who="connected"]'); await po.page.waitForSelector('[data-who="connected"][aria-pressed="true"]');
  const pc = await po.page.textContent("#app");
  await po.page.screenshot({ path: SHOTS + "portal-usage-connected.png" });
  check("The switch: Not connected shows learners on their own; Connected shows those joined to a college",
    /Using Evia on their own/.test(pu) && /From a real learner/.test(pu) && !/Joined to my college/.test(pu) && /Joined to a college/.test(pc) && /Joined to my college/.test(pc) && !/From a real learner/.test(pc), pu.slice(0, 300) + " ||| " + pc.slice(0, 300));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test ran to the end", false, e.stack + "\nERRORS: " + errors.join(" | ")); }
await finish();

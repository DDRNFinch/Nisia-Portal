/* Review prep: targets from the last review only (Evia's own when it set none), one checklist of everything since the
   last review with Do it now, a few quick taps, and a PDF with what the college, employer and assessor add left blank. */
import { site, check, errors, app, finish } from "./harness.mjs";
const shot = (p, n) => p.screenshot({ path: new URL("../shots/prep-" + n + ".png", import.meta.url).pathname });
try {
  const ev = await app({ width: 412, height: 915 });
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(() => { localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1"); ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    const s = new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10), e = new Date(Date.now() + 400 * 864e5).toISOString().slice(0, 10);
    localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna", start: s, end: e })); });
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); });
  const res = {};
  /* Not connected: the learner says when their last review was; Evia's own targets keep them on track until the next. */
  res.standalone = await ev.page.evaluate(() => {
    const T = window.eviaTargets, last = new Date(Date.now() - 40 * 864e5);
    window.eviaSetLastReview(last.toISOString());
    /* Old targets from a review before that one don't show. */
    window.eviaData.replace("targets", { course }, [{ id: "old1", course, kind: "otj", title: "Old target", target: 5, baseline: 0, due: "2026-01-01", createdAt: Date.now() - 300 * 864e5, reviewId: "r-old", reviewDate: "2026-01-01" }]);
    const before = T.mine().length, made = T.ensure(), rd = window.eviaReviewDue(), by = new Date(rd.due.getTime() - 3 * 864e5).toISOString().slice(0, 10);
    /* SMART and paced: KSBs and topics left shared over the months left, all due by the next review, none naming a topic. */
    const S = window.eviaStats.compute(), units = S.a.units.map((u) => u.name), k = made.list.find((t) => t.kind === "ksb"), u = made.list.find((t) => t.kind === "units");
    const monthsLeft = 400 / 30.44, share = Math.min(1, ((rd.due.getTime() - 3 * 864e5) - Date.now()) / (30.44 * 864e5) / monthsLeft);
    const paced = !!k && k.target === Math.max(1, Math.ceil((S.a.total - S.a.met) * share)) && !!u && u.target === Math.max(1, Math.ceil(S.unitsLeft * share)) && /finish by/.test(k.why);
    const generic = made.list.every((t) => / by \d+ \w+$/.test(t.title) && !units.some((n) => t.title.includes(n)));
    return { before, made: made.created && made.list.length > 0 && made.list.every((t) => !t.reviewId && t.due <= by), shown: T.mine().every((t) => t.id !== "old1"), kept: window.eviaData.list("targets", { store: "review-targets" }).some((t) => t.id === "old1"), paced, generic, titles: made.list.map((t) => t.title + " (" + t.why + ")") };
  });
  await ev.page.evaluate(() => window.eviaPrepPack.open()); await ev.page.waitForTimeout(500);
  res.page = await ev.page.evaluate(() => ({ rows: document.querySelectorAll(".rp-list li").length, todo: document.querySelectorAll(".rp-list li.todo .rp-do").length, info: [...document.querySelectorAll(".rp-list li.info")].map((x) => x.textContent), last: !!document.getElementById("rp-last") }));
  await shot(ev.page, "standalone");
  await ev.page.click('.rp-list li:last-child .rp-do'); await ev.page.waitForSelector(".rp-q");
  await ev.page.click('[data-q="feelsSafe"] [data-v="Yes"]'); await ev.page.click('[data-q="changes"] [data-v="Yes"]'); await ev.page.fill('[data-more="changes"]', "New site in Walsall");
  await ev.page.click('[data-q="hsIncident"] [data-v="No"]'); await ev.page.click('[data-q="supportNeeded"] [data-v="No"]'); await ev.page.fill("#rp-fb", "Going well, enjoying cavity work");
  await shot(ev.page, "questions");
  await ev.page.click("#rp-save"); await ev.page.waitForTimeout(600);
  res.answered = await ev.page.evaluate(() => ({ a: window.eviaPrepPack.answered(), back: !!document.querySelector(".rp-list"), notReview: window.eviaGetReviews().length === 0, dueSame: !!window.eviaReviewDue() }));
  const pdf = await ev.page.evaluate(async () => { const b = await window.eviaPrepPack.pdf(); const r = new FileReader(); return await new Promise((ok) => { r.onload = () => ok(r.result.split(",")[1]); r.readAsDataURL(b); }); });
  (await import("node:fs")).writeFileSync(new URL("../shots/prep-review.pdf", import.meta.url).pathname, Buffer.from(pdf, "base64"));
  res.pdf = pdf.length > 4000;
  /* Connected: the last review (from the college) set targets: only those show. When it set none, Evia makes her own. */
  res.connected = await ev.page.evaluate(() => {
    const T = window.eviaTargets, at = new Date(Date.now() - 10 * 864e5);
    window.eviaData.enrol({ course, live: true, college: "E2E College", enrolmentId: "x", lastReview: at.toISOString().slice(0, 10), reviewDue: new Date(Date.now() + 70 * 864e5).toISOString().slice(0, 10) });
    window.eviaData.replace("targets", { course }, [{ id: "nt-1", course, kind: "otj", title: "From Milos", target: 6, baseline: 0, due: "2027-01-01", createdAt: at.getTime(), reviewId: "rv1", reviewDate: at.toISOString().slice(0, 10) },
      { id: "mine-1", course, kind: "otj", title: "Evia's own", target: 6, baseline: 0, due: "2027-01-01", createdAt: Date.now() - 30 * 864e5 }]);
    const a = T.mine().map((t) => t.title).join();
    window.eviaData.enrol(Object.assign(window.eviaData.enrolment(), { lastReview: new Date().toISOString().slice(0, 10) }));
    const none = T.mine().length, made = T.ensure();
    return { fromMilos: a === "From Milos", noneAfterNewReview: none === 0, ownMade: made.created && T.mine().length > 0 && T.mine().every((t) => !t.reviewId) };
  });
  check("Targets: SMART and paced to finish the course on time, never one particular job; only the last review's; Evia's own (due before the next review) when it set none; older ones kept but hidden", res.standalone.before === 0 && res.standalone.made && res.standalone.shown && res.standalone.kept && res.standalone.paced && res.standalone.generic && Object.values(res.connected).every(Boolean), JSON.stringify(res));
  check("Review prep: one checklist with Do it now, college and employer parts left to them, a few quick taps that aren't a review, and a PDF",
    res.page.rows >= 9 && res.page.todo >= 1 && res.page.info.length >= 2 && res.page.last && res.answered.a && res.answered.back && res.answered.notReview && res.pdf, JSON.stringify(res));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("ran", false, e.stack); }
await finish();

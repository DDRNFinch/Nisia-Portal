/* Careers sessions and My future, end to end: staff add a session in Evia Portal and pick the goals it suits; the
   learner sees it in My future (the ones for their goal first) and on the College page's week, opens a step's guide,
   and says they're interested; staff see who's interested. Learners and employers can't add sessions.
   Run: node tests/e2e/careers.e2e.mjs   (needs Postgres 16) */
import { check, q, rpc, site, TEE, LEE, EM, errors, app, finish, session, signIn } from "./harness.mjs";
const ORG = "0e2e0000-0000-0000-0000-000000000001", ADA = "0e2e0000-0000-0000-0000-0000000003a0", ADA_M = "0e2e0000-0000-0000-0000-0000000003b0";
await q(`insert into auth.users values ('${ADA}', 'ada@e2e.test'); insert into public.profiles (id, display_name) values ('${ADA}', 'Ada Min');
  insert into public.organisation_members (id, organisation_id, user_id) values ('${ADA_M}', '${ORG}', '${ADA}');
  insert into public.organisation_member_roles select '${ADA_M}', id from public.roles where code = 'admin';`);
const tee = { sub: TEE, aal: "aal2" }, em = { sub: EM, aal: "aal2" }, lee = { sub: LEE, aal: "aal1" }, ada = { sub: ADA, aal: "aal2" };
const shot = (p, n) => p.screenshot({ path: new URL("../shots/careers-" + n + ".png", import.meta.url).pathname, fullPage: true });
const at = (days, h) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d.toISOString(); };
try {
  const open = await rpc("nisia_careers_save", { p_org: ORG, p_title: "Level 3 open evening", p_starts_at: at(2, 17), p_minutes: 90, p_place: "Room B12", p_details: "Meet the Level 3 tutors and see the workshop.", p_link: "https://example.org/book", p_goals: ["level3"] }, tee);
  const fair = await rpc("nisia_careers_save", { p_org: ORG, p_title: "Careers fair", p_starts_at: at(3, 12), p_goals: [] }, tee);
  const byLearner = await rpc("nisia_careers_save", { p_org: ORG, p_title: "Mine", p_starts_at: at(2, 9) }, lee);
  const byEmployer = await rpc("nisia_careers_save", { p_org: ORG, p_title: "Theirs", p_starts_at: at(2, 9) }, em);
  const badLink = await rpc("nisia_careers_save", { p_org: ORG, p_title: "X", p_starts_at: at(2, 9), p_link: "javascript:alert(1)" }, tee);
  const mine = await rpc("evia_careers", {}, lee);
  check("Staff add careers sessions; learners and employers can't; links must be web links; the learner sees their college's sessions",
    open.status === 200 && fair.status === 200 && byLearner.status >= 400 && byEmployer.status >= 400 && badLink.status >= 400 && mine.body.length === 2 && mine.body[0].title === "Level 3 open evening",
    JSON.stringify({ open: open.body, byLearner: byLearner.body, byEmployer: byEmployer.body, badLink: badLink.body, mine: mine.body }));

  const ev = await app({ width: 412, height: 915 });
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(([tok]) => {
    localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1");
    ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    localStorage.setItem("evia7-enrolment", JSON.stringify({ course: "bricklayer", live: true, college: "E2E College", learnerId: "0e2e0000-0000-0000-0000-0000000000c1", organisationId: "0e2e0000-0000-0000-0000-000000000001",
      enrolmentId: "0e2e0000-0000-0000-0000-0000000000e1", courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: "0e2e0000-0000-0000-0000-0000000000b2", name: "Lee Erna", employer: "Ployer Builders", start: "2026-01-05", end: "2027-12-01", joinedAt: new Date().toISOString() }));
    localStorage.setItem("evia7-nisia-auth", JSON.stringify(tok));
  }, [session(LEE, "aal1", "lee@e2e.test")]);
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove();
    window.eviaData.put("learner", { name: "Lee Erna", future: { key: "level3", goal: "Move on to a Level 3 or an advanced course", when: "In the next year", steps: [{ id: "s1", key: "topics" }, { id: "s2", key: "cscs" }, { id: "s3", key: "l3" }] } }); });
  const res = {};
  /* My future: sessions (for the goal first), steps with guides, useful links. */
  await ev.page.evaluate(() => window.eviaFuture.open()); await ev.page.waitForTimeout(2500);
  res.sessions = await ev.page.evaluate(() => [...document.querySelectorAll(".fu-sess")].map((b) => b.textContent));
  res.forGoal = /Level 3 open evening/.test(res.sessions[0] || "") && /For your goal/.test(res.sessions[0] || "") && /Careers fair/.test(res.sessions[1] || "");
  res.links = await ev.page.evaluate(() => document.querySelectorAll(".fu-links a").length);
  await shot(ev.page, "future");
  await ev.page.click('.fu-step-t >> text=CSCS'); await ev.page.waitForTimeout(400);
  res.guide = await ev.page.evaluate(() => ({ how: document.querySelectorAll(".fu-how li").length, link: [...document.querySelectorAll(".fu-links a")].some((a) => /cscs\.uk\.com/.test(a.href)) }));
  await shot(ev.page, "guide");
  await ev.page.click("#fu-done"); await ev.page.waitForTimeout(400);
  res.ticked = await ev.page.evaluate(() => window.eviaFuture.get().steps.find((s) => s.key === "cscs").done === true);
  await ev.page.click(".fu-sess"); await ev.page.waitForTimeout(400);
  await shot(ev.page, "session");
  await ev.page.click("#fu-int"); await ev.page.waitForTimeout(1200);
  res.interestedHere = await ev.page.evaluate(() => /You’re interested/.test(document.getElementById("fu-int").textContent));
  const staffView = await rpc("nisia_careers", { p_org: ORG }, tee);
  res.staffSees = (staffView.body.find((x) => x.title === "Level 3 open evening") || {}).interested?.[0] === "Lee Erna";
  /* The College page: a week, the careers session on its day, and tapping it opens it. */
  await ev.page.evaluate(() => { document.getElementById("modal-root").innerHTML = ""; nav("calendar"); }); await ev.page.waitForTimeout(1500);
  /* (The tester: the week is in the full calendar, from Time.) */
  if (await ev.page.$("#th-cal")) { await ev.page.click("#th-cal"); await ev.page.waitForTimeout(800); }
  res.week = await ev.page.evaluate(() => document.querySelectorAll("#cw-strip .cw-d").length === 7);
  await shot(ev.page, "college");
  const day = await ev.page.evaluate((iso) => { const d = new Date(iso); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }, at(2, 17));
  if (!(await ev.page.$('#cw-strip [data-day="' + day + '"]'))) await ev.page.click('[data-w="1"]');
  await ev.page.click('#cw-strip [data-day="' + day + '"]'); await ev.page.waitForTimeout(300);
  res.onDay = await ev.page.evaluate(() => /Level 3 open evening/.test(document.getElementById("cal-day").textContent) && /Interested/.test(document.getElementById("cal-day").textContent));
  await shot(ev.page, "college-day");
  await ev.page.click("#cal-day [data-career]"); await ev.page.waitForTimeout(400);
  res.opens = await ev.page.evaluate(() => !!document.getElementById("fu-int"));
  check("Evia: My future shows the college's sessions (the goal's first), step guides with links, and I'm interested reaches the college; the College page shows the week with the session on its day",
    Object.entries(res).every(([k, v]) => k === "sessions" || (k === "links" ? v >= 2 : v === true || (typeof v === "object" && v.how >= 3 && v.link))), JSON.stringify(res));

  /* Evia Portal: Careers, with who's interested. */
  await q(`create or replace function public.nisia_college_summary(p_org uuid) returns jsonb language sql as $$ select jsonb_build_object('name', o.name, 'status', o.status, 'seats', o.seats, 'seats_used', 2, 'licence_ends', null, 'safeguarding', jsonb_build_object('name', null, 'phone', null, 'email', null)) from public.organisations o where o.id = p_org $$;
    create or replace function public.nisia_college_staff(p_org uuid) returns table (member_id uuid, name text, email text, roles jsonb, active boolean, learners integer) language sql as $$ select null::uuid, null::text, null::text, null::jsonb, null::boolean, null::int where false $$;
    create or replace function public.nisia_college_activity(p_org uuid) returns table (week_start date, evidence integer, hours numeric) language sql as $$ select null::date, null::int, null::numeric where false $$;
    grant execute on function public.nisia_college_summary(uuid), public.nisia_college_staff(uuid), public.nisia_college_activity(uuid) to authenticated;`).catch(() => {});
  const po = await app({ width: 1280, height: 860 });
  await po.page.goto(site + "/apps/nisia-web/"); await signIn(po.page, "ada@e2e.test");
  await po.page.waitForSelector('[data-go="careers"]', { timeout: 15000 }); await po.page.click('[data-go="careers"]');
  await po.page.waitForSelector("table"); await po.page.waitForTimeout(500);
  const table = await po.page.textContent("table");
  await shot(po.page, "portal");
  await po.page.click("#addCar"); await po.page.waitForSelector("#cf");
  await po.page.fill('#cf [name="title"]', "SSSTS course"); await po.page.fill('#cf [name="day"]', at(9, 9).slice(0, 10)); await po.page.fill('#cf [name="time"]', "09:00");
  await po.page.check('#cf input[value="supervisor"]'); await po.page.click('#cf button[type="submit"]'); await po.page.waitForTimeout(1500);
  const added = (await rpc("evia_careers", {}, lee)).body.find((x) => x.title === "SSSTS course");
  check("Evia Portal: Careers lists the sessions with who's interested, and staff can add one for a goal",
    /Level 3 open evening/.test(table) && /Lee Erna/.test(table) && !!added && added.goals.join() === "supervisor", JSON.stringify({ table: table.slice(0, 300), added }));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("ran", false, e.stack); }
await finish();

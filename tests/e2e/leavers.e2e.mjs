/* A learner leaves or finishes, end to end: only the college's admins can mark it; the seat frees up; they come off
   their classes, their employer's list in Paros and messages; nothing they did is deleted; it can be undone (back on
   the same class); the leavers list has them; and Evia says goodbye with a copy of their portfolio to keep.
   Run: node tests/e2e/leavers.e2e.mjs   (needs Postgres 16) */
import { check, q, rpc, site, TEE, LEE, EM, ENROL, errors, app, finish, session, signIn } from "./harness.mjs";
const ORG = "0e2e0000-0000-0000-0000-000000000001", TEE_M = "0e2e0000-0000-0000-0000-0000000000b1", LEE_M = "0e2e0000-0000-0000-0000-0000000000b2";
const ADA = "0e2e0000-0000-0000-0000-0000000003a0", ADA_M = "0e2e0000-0000-0000-0000-0000000003b0";
await q(`insert into auth.users values ('${ADA}', 'ada@e2e.test'); insert into public.profiles (id, display_name) values ('${ADA}', 'Ada Min');
  insert into public.organisation_members (id, organisation_id, user_id) values ('${ADA_M}', '${ORG}', '${ADA}');
  insert into public.organisation_member_roles select '${ADA_M}', id from public.roles where code = 'admin';`);
const ada = { sub: ADA, aal: "aal2" }, tee = { sub: TEE, aal: "aal2" }, em = { sub: EM, aal: "aal2" }, lee = { sub: LEE, aal: "aal1" };
const pad = (n) => String(n).padStart(2, "0"), d = new Date(), today = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
try {
  /* Lee is on a class. */
  const schedule = { day: weekday, start: "00:01", end: "23:58", breaks: [], recurrence: { type: "weekly", interval: 1, weekdays: [weekday], monthDays: [], startDate: today, endDate: "", anchorDate: today, onceDate: "" } };
  const made = await rpc("nisia_save_class", { p_org: ORG, p_title: "L2 Walls", p_tutor: TEE_M, p_schedule: schedule, p_course: "bricklayer", p_room: "Workshop 1", p_enrolments: [ENROL] }, ada);
  const seats0 = (await q(`select private.seats_used('${ORG}') n`))[0].n;
  const parosBefore = ((await rpc("paros_learners", {}, em)).body || []).map((x) => x.name);

  /* Only admins; a reason is needed for leaving. */
  const byTutor = await rpc("nisia_end_enrolment", { p_enrolment: ENROL, p_kind: "finished" }, tee);
  const noReason = await rpc("nisia_end_enrolment", { p_enrolment: ENROL, p_kind: "left", p_on: today }, ada);
  const left = await rpc("nisia_end_enrolment", { p_enrolment: ENROL, p_kind: "left", p_on: today, p_reason: "Moved away: back to Wales" }, ada);
  const twice = await rpc("nisia_end_enrolment", { p_enrolment: ENROL, p_kind: "finished" }, ada);
  check("Only the college's admins can mark a learner as left or finished; leaving needs a reason; it can't be done twice",
    made.status === 200 && byTutor.status >= 400 && /Give a reason/.test(noReason.body.message) && left.status === 200 && left.body.status === "withdrawn" && left.body.classes === 1 && /already left/.test(twice.body.message),
    JSON.stringify({ made: made.body, byTutor: byTutor.body, noReason: noReason.body, left: left.body, twice: twice.body }));
  const seats1 = (await q(`select private.seats_used('${ORG}') n`))[0].n;
  const onClass = (await q(`select count(*)::int n from public.class_learners where enrolment_id = '${ENROL}'`))[0].n;
  const parosAfter = ((await rpc("paros_learners", {}, em)).body || []).map((x) => x.name);
  const kept = (await q(`select (select count(*) from public.enrolments where id = '${ENROL}')::int e, (select status from public.enrolments where id = '${ENROL}') s`))[0];
  check("Their seat frees up, they're off their class register and their employer's list in Paros, and their enrolment and records are kept",
    seats1 === seats0 - 1 && onClass === 0 && parosBefore.includes("Lee Erna") && !parosAfter.includes("Lee Erna") && kept.e === 1 && kept.s === "withdrawn", JSON.stringify({ seats0, seats1, onClass, parosBefore, parosAfter, kept }));
  const msg = await rpc("msg_send", { p_with: LEE_M, p_body: "Are you coming back?" }, tee);
  const details = (await rpc("nisia_my_details", {}, lee)).body;
  const staffTold = await q(`select title from public.notifications where notification_type = 'learner_ended'`);
  check("They can't be messaged any more; Evia hears they've left (and when); their tutor is told",
    msg.status >= 400 && details.status === "withdrawn" && details.endedOn === today && staffTold.some((x) => /Lee Erna has left the course/.test(x.title)), JSON.stringify({ msg: msg.body, details, staffTold }));
  const leavers = (await rpc("nisia_leavers", { p_org: ORG }, ada)).body, notAdmin = await rpc("nisia_leavers", { p_org: ORG }, tee);
  check("The leavers list has them, with the date, the reason and who marked it (admins only)",
    leavers.length === 1 && leavers[0].name === "Lee Erna" && leavers[0].reason === "Moved away: back to Wales" && leavers[0].ended_by === "Ada Min" && notAdmin.status >= 400, JSON.stringify({ leavers, notAdmin: notAdmin.body }));

  /* Evia: the goodbye, with a copy of the portfolio, and carrying on alone. */
  const ev = await app({ width: 412, height: 915 });
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
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2000);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); });
  await ev.page.evaluate(() => window.eviaNisia.sync()).catch(() => {});
  await ev.page.waitForSelector(".gb-sheet", { timeout: 15000 });
  const gb = await ev.page.textContent(".gb-sheet");
  await ev.page.screenshot({ path: new URL("../shots/evia-goodbye.png", import.meta.url).pathname }).catch(() => {});
  await ev.page.click("#gb-own"); await ev.page.waitForTimeout(400);
  const after = await ev.page.evaluate(() => ({ live: window.eviaData.enrolment().live, sheet: !!document.querySelector(".gb-sheet"), icon: (document.getElementById("nm-btn") || { hidden: true }).hidden,
    again: window.eviaGoodbye.show(), topics: window.eviaData.list("evidence").length >= 0 }));
  check("Evia: a kind goodbye (left the course, with the date), a copy of the portfolio to download, and carrying on alone ends the college connection (no message icon) without showing it again",
    /left your course/.test(gb) && /Download my portfolio/.test(gb) && /Keep using Evia on my own/.test(gb) && !after.live && !after.sheet && after.icon && after.again === false, JSON.stringify({ gb, after }));

  /* Undo: back on the course and the same class. */
  const undo = await rpc("nisia_undo_end_enrolment", { p_enrolment: ENROL }, ada);
  const back = (await q(`select (select status from public.enrolments where id = '${ENROL}') s, (select count(*)::int from public.class_learners where enrolment_id = '${ENROL}') c, private.seats_used('${ORG}') seats`))[0];
  const msg2 = await rpc("msg_send", { p_with: LEE_M, p_body: "Welcome back" }, tee);
  check("Undo puts them back on the course and their class, takes their seat again, and messages work again",
    undo.status === 200 && undo.body.classes === 1 && back.s === "active" && back.c === 1 && back.seats === seats0 && msg2.status === 200, JSON.stringify({ undo: undo.body, back, msg2: msg2.body }));

  /* Finishing, from the learner's page in Evia Portal (the college overview's own functions: stand-ins with the live shapes). */
  await q(`create or replace function public.nisia_college_summary(p_org uuid) returns jsonb language sql as $$ select jsonb_build_object('name', o.name, 'status', o.status, 'seats', o.seats, 'seats_used', private.seats_used(o.id), 'licence_ends', null, 'safeguarding', jsonb_build_object('name', null, 'phone', null, 'email', null)) from public.organisations o where o.id = p_org $$;
    create or replace function public.nisia_college_staff(p_org uuid) returns table (member_id uuid, name text, email text, roles jsonb, active boolean, learners integer) language sql as $$ select null::uuid, null::text, null::text, null::jsonb, null::boolean, null::int where false $$;
    create or replace function public.nisia_college_activity(p_org uuid) returns table (week_start date, evidence integer, hours numeric) language sql as $$ select null::date, null::int, null::numeric where false $$;
    create or replace function public.nisia_learner_detail(p_learner uuid) returns jsonb language sql as $$ select '{}'::jsonb $$;
    grant execute on function public.nisia_college_summary(uuid), public.nisia_college_staff(uuid), public.nisia_college_activity(uuid), public.nisia_learner_detail(uuid) to authenticated;`);
  const po = await app({ width: 1280, height: 860 });
  await po.page.goto(site + "/apps/nisia-web/"); await signIn(po.page, "ada@e2e.test");
  await po.page.waitForSelector('[data-go="learners"]', { timeout: 15000 }); await po.page.click('[data-go="learners"]');
  await po.page.click("tr[data-learner]"); await po.page.waitForSelector("#endL");
  await po.page.click("#endL"); await po.page.click('[data-kind="finished"]'); await po.page.click("#endF [type=submit]");
  await po.page.waitForSelector("#undoEnd", { timeout: 10000 });
  const banner = await po.page.textContent("#main");
  await po.page.screenshot({ path: new URL("../shots/portal-learner-finished.png", import.meta.url).pathname }).catch(() => {});
  await po.page.click('[data-go="learners"]'); await po.page.waitForSelector('[data-filter="ended"]');
  const allRows = await po.page.$$eval("tr[data-learner]", (x) => x.length);
  await po.page.click('[data-filter="ended"]'); await po.page.waitForSelector("#leaversDl");
  const endedRows = await po.page.$$eval("tr[data-learner]", (x) => x.map((y) => y.textContent.replace(/\s+/g, " ")));
  const [dl] = await Promise.all([po.page.waitForEvent("download", { timeout: 8000 }), po.page.click("#leaversDl")]);
  const csv = (await import("node:fs")).readFileSync(await dl.path(), "utf8");
  const det2 = (await rpc("nisia_my_details", {}, lee)).body;
  check("Evia Portal: an admin marks a learner as finished from their page (no reason needed); the page says so with an Undo; they leave the main list for a Left or finished filter; the leavers list downloads",
    /finished the course/.test(banner) && allRows === 0 && endedRows.length === 1 && /Finished/.test(endedRows[0]) && /Lee Erna,.*Finished/.test(csv.replace(/"/g, "")) && det2.status === "completed",
    JSON.stringify({ banner: banner.slice(0, 300), allRows, endedRows, csv: csv.slice(0, 300), det2 }));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("Leavers ran without crashing", false, e.stack || e.message); }
await finish();

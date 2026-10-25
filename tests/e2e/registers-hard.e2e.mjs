/* Registers on a bad day: the things that go wrong in a real classroom, end to end in real browsers.
   The college admin sets the class up in the Evia Portal portal; the tutor's Symi has never seen it before. Then: a
   mistyped code, a learner checking in twice, someone not on the class, a phone with no signal, college Wi-Fi that
   connects but carries nothing, the classroom screen reloaded mid-session, a reason for an absence, a mark changed
   after the register is finished, and a check-in that only reaches Evia Portal after that. Nothing may be lost or counted
   twice, and every message must say what to do.
   Run: node tests/e2e/registers-hard.e2e.mjs   (needs Postgres 16) */
import { check, q, session, rpc, site, TEE, LEE, ENROL, errors, app, signIn, finish } from "./harness.mjs";

const ORG = "0e2e0000-0000-0000-0000-000000000001", TUTOR_MEMBER = "0e2e0000-0000-0000-0000-0000000000b1";
const id = (n) => "0e2e0000-0000-0000-0000-0000000001" + n;
/* Ada runs the college in the portal; Kay, Ash and Zed are on Lee's class; Max is at the college but not on it. */
const ADA = id("a0"), PEOPLE = { kay: "1", ash: "2", zed: "3", max: "4" };
const user = (k) => id("a" + PEOPLE[k]), member = (k) => id("b" + PEOPLE[k]), learner = (k) => id("c" + PEOPLE[k]), enrol = (k) => id("e" + PEOPLE[k]);
await q(`insert into auth.users values ($1, 'ada@e2e.test'); insert into public.profiles (id, display_name) values ($1, 'Ada Min');
  insert into public.organisation_members (id, organisation_id, user_id) values ($2, $3, $1);
  insert into public.organisation_member_roles select $2, id from public.roles where code = 'admin'`.replace(/\$1/g, `'${ADA}'`).replace(/\$2/g, `'${id("b0")}'`).replace(/\$3/g, `'${ORG}'`));
for (const [k, name] of [["kay", "Kay Bee"], ["ash", "Ash Cee"], ["zed", "Zed Dee"], ["max", "Max Eff"]]) {
  await q(`insert into auth.users values ('${user(k)}', '${k}@e2e.test'); insert into public.profiles (id, display_name) values ('${user(k)}', '${name}');
    insert into public.organisation_members (id, organisation_id, user_id) values ('${member(k)}', '${ORG}', '${user(k)}');
    insert into public.organisation_member_roles select '${member(k)}', id from public.roles where code = 'learner';
    insert into public.learners (id, organisation_id, organisation_member_id) values ('${learner(k)}', '${ORG}', '${member(k)}');
    insert into public.learner_access (organisation_id, learner_id, organisation_member_id) values ('${ORG}', '${learner(k)}', '${TUTOR_MEMBER}');
    insert into public.enrolments (id, organisation_id, learner_id, course_id, start_date, end_date, employer_name, planned_otj_hours)
      values ('${enrol(k)}', '${ORG}', '${learner(k)}', '0e2e0000-0000-0000-0000-0000000000d1', current_date - 100, current_date + 400, 'Ployer Builders', 400)`);
}
const ada = { sub: ADA, aal: "aal2" }, tee = { sub: TEE, aal: "aal2" }, as = (k) => ({ sub: k === "lee" ? LEE : user(k), aal: "aal1" });
const pad = (n) => String(n).padStart(2, "0"), d = new Date(), today = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];

/* A learner's Evia, connected to Evia Portal (as it is after they join with their code). */
async function evia(k, name) {
  const ev = await app({ width: 412, height: 915 }), e = k === "lee" ? ENROL : enrol(k);
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(([tok, e, name, lid, mid]) => {
    localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1");
    ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    localStorage.setItem("evia7-profile", JSON.stringify({ name, start: "2026-01-05", end: "2027-12-01" }));
    localStorage.setItem("evia7-enrolment", JSON.stringify({ course: "bricklayer", live: true, college: "E2E College", learnerId: lid, organisationId: "0e2e0000-0000-0000-0000-000000000001",
      enrolmentId: e, courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: mid, name, employer: "Ployer Builders", start: "2026-01-05", end: "2027-12-01", joinedAt: new Date().toISOString() }));
    localStorage.setItem("evia7-nisia-auth", JSON.stringify(tok));
  }, [session(k === "lee" ? LEE : user(k), "aal1", k + "@e2e.test"), e, name, k === "lee" ? "0e2e0000-0000-0000-0000-0000000000c1" : learner(k), k === "lee" ? "0e2e0000-0000-0000-0000-0000000000b2" : member(k)]);
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2000);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); });
  await ev.page.evaluate(() => window.eviaNisia.sync()).catch(() => {});
  return ev;
}
/* Typing the code in Evia's check-in, as a learner does; returns what the screen then says. */
async function typeCode(ev, code, wait = 12000) {
  await ev.page.evaluate(() => { window.eviaCheckIn.close && window.eviaCheckIn.close(); window.eviaCheckIn.open(); }); await ev.page.waitForSelector("#ci-view .ci-code");
  await ev.page.fill("#ci-view .ci-code", code); await ev.page.click('#ci-view .ci-form button[type=submit]');
  await ev.page.waitForFunction(() => /checked in|Not checked in|Saved/.test(document.getElementById("ci-view").textContent), null, { timeout: wait }).catch(() => {});
  return (await ev.page.textContent("#ci-view")).replace(/\s+/g, " ");
}
const shortCode = async (symi) => (await symi.page.textContent(".sn-checkin .sn-code")).replace(/\s/g, "");

try {
  /* 1. The admin sets the class up in the portal: today, all day, with Lee, Kay, Ash and Zed. */
  const schedule = { day: weekday, start: "00:01", end: "23:58", breaks: [], recurrence: { type: "weekly", interval: 1, weekdays: [weekday], monthDays: [], startDate: today, endDate: "", anchorDate: today, onceDate: "" } };
  const made = await rpc("nisia_save_class", { p_org: ORG, p_title: "L3 Walls", p_tutor: TUTOR_MEMBER, p_schedule: schedule, p_course: "bricklayer", p_room: "Workshop 2", p_enrolments: [ENROL, enrol("kay"), enrol("ash"), enrol("zed")] }, ada);
  const notAdmin = await rpc("nisia_save_class", { p_org: ORG, p_title: "Mine", p_tutor: TUTOR_MEMBER, p_schedule: schedule, p_enrolments: [] }, tee);
  check("Portal: the admin creates “L3 Walls” with four learners; a tutor can't create classes", made.status === 200 && notAdmin.status === 400, JSON.stringify([made, notAdmin]));

  /* 2. The tutor's Symi has never seen this class: signing in brings it, with its learners, into the registers. */
  const symi = await app();
  await symi.page.goto(site + "/apps/symi/update.json");
  await symi.page.evaluate(() => { localStorage.clear(); localStorage.setItem("symi-last-seen-release-v1", "9.9.9"); });
  await symi.page.goto(site + "/apps/symi/"); await symi.page.waitForTimeout(1200);
  await symi.page.evaluate(() => window.SamosApp.openRegisters());
  await symi.page.click("#nisiaButton"); await signIn(symi.page, "tee@e2e.test", ".sn-auth ");
  await symi.page.waitForFunction(() => (window.SamosApp.getState().classes || []).some((c) => c.name === "L3 Walls" && (c.learners || []).length === 4), null, { timeout: 15000 }).catch(() => {});
  const reg = await symi.page.evaluate(() => { const c = (window.SamosApp.getState().classes || []).find((x) => x.name === "L3 Walls"); return c ? { id: c.id, n: c.learners.length, names: c.learners.map((l) => l.name).sort() } : null; });
  check("Symi: the portal's class arrives in the tutor's registers with all four learners", reg && reg.n === 4, JSON.stringify(reg));
  await symi.page.evaluate((rid) => { window.SamosApp.mutate((st) => { st.activeClassId = rid; st.view = "registers"; }); window.SamosApp.openRegisters(); }, reg && reg.id);
  await symi.page.waitForSelector("[data-sn-show]", { timeout: 15000 });
  await symi.page.click("[data-sn-show]");
  await symi.page.waitForSelector(".sn-checkin .sn-code:not(:empty)", { timeout: 15000 }).catch(() => {});
  let code = await shortCode(symi);
  check("Symi: the classroom screen shows a 6-character code for the portal's class", code.length === 6, code);

  /* 3. Lee mistypes it, then gets it right, then (unsure) does it again. */
  const lee = await evia("lee", "Lee Erna");
  const wrong = await typeCode(lee, code === "ABCDEF" ? "ABCDEG" : "ABCDEF");
  check("Evia: a mistyped code says “Not checked in” and what to do", /Not checked in/.test(wrong) && /code/i.test(wrong) && /Scan again/.test(wrong), wrong);
  code = await shortCode(symi);
  const right = await typeCode(lee, code);
  check("Evia: the right code checks Lee in to L3 Walls", /You’re checked in/.test(right) && /L3 Walls/.test(right), right);
  await lee.page.waitForTimeout(3000); code = await shortCode(symi);
  const again = await typeCode(lee, code);
  const [leeRows] = await q("select count(*)::int n from public.class_attendance where enrolment_id = $1", [ENROL]);
  check("Evia: checking in a second time says “already checked in”, and Evia Portal keeps one check-in", /already checked in/.test(again) && leeRows.n === 1, again + " rows " + leeRows.n);

  /* 4. Max isn't on the class: scanning the code tells him to ask his tutor. */
  const [full] = await q(`select 'NISI:IN:1:' || s.id || ':' || w.w || ':' || private.checkin_sig(k.secret, s.id, w.w) code
    from public.class_sessions s join private.class_session_keys k on k.session_id = s.id cross join (select floor(extract(epoch from now()) / 20)::bigint w) w where s.session_date = current_date limit 1`);
  const max = await rpc("nisia_check_in", { p_code: full.code }, as("max"));
  check("Evia Portal: Max, not on the class, is told “You’re not on this class’s register. Ask your tutor to add you.”", max.status === 400 && /not on this class/.test(max.body.message), JSON.stringify(max.body));

  /* 5. Kay's phone has no signal: the check-in is kept and reaches Evia Portal, at the time she scanned, when it's back. */
  const kay = await evia("kay", "Kay Bee");
  code = await shortCode(symi);
  await kay.ctx.setOffline(true);
  const kept = await typeCode(kay, code);
  check("Evia: with no signal, Kay's check-in is saved on her phone and she's told it will be sent", /Saved: no signal here/.test(kept), kept);
  await kay.ctx.setOffline(false);
  for (let i = 0; i < 30; i++) { await kay.page.evaluate(() => window.eviaNisia.sync()).catch(() => {}); if ((await q("select 1 from public.class_attendance where enrolment_id = $1 and checked_in_at is not null", [enrol("kay")])).length) break; await kay.page.waitForTimeout(3000); }
  const [kayRow] = await q("select checked_in_at is not null here, offline from public.class_attendance where enrolment_id = $1", [enrol("kay")]);
  const kayLeft = await kay.page.evaluate(() => window.eviaNisia.waitingCheckIns());
  /* (Sent once it's a minute old, so Evia Portal records it at the time it was scanned, marked "no signal".) */
  check("Evia: back in signal, Kay's check-in reaches Evia Portal (marked “no signal”) and nothing is left waiting", kayRow && kayRow.here && kayRow.offline && kayLeft === 0, JSON.stringify({ kayRow, kayLeft }));

  /* 6. Ash is on college Wi-Fi that connects but carries nothing: Evia gives up waiting and keeps it, then sends it. */
  const ash = await evia("ash", "Ash Cee");
  await ash.page.route(/rest\/v1\/rpc\/nisia_check_in/, () => { /* no answer, ever */ });
  code = await shortCode(symi);
  const t0 = Date.now(), hung = await typeCode(ash, code, 40000), took = Math.round((Date.now() - t0) / 1000);
  check("Evia: when Evia Portal doesn't answer, Ash isn't left on “Checking you in…”: within 30 seconds it's saved to send later", /Saved: no signal here/.test(hung) && took <= 32, took + "s: " + hung);
  await ash.page.unroute(/rest\/v1\/rpc\/nisia_check_in/);
  /* (A kept check-in goes once it's a minute old, so Evia Portal checks the code against when it was typed.) */
  for (let i = 0; i < 30; i++) { await ash.page.evaluate(() => window.eviaNisia.sync()).catch(() => {}); if ((await q("select 1 from public.class_attendance where enrolment_id = $1 and checked_in_at is not null", [enrol("ash")])).length) break; await ash.page.waitForTimeout(3000); }
  const [ashRow] = await q("select checked_in_at is not null here from public.class_attendance where enrolment_id = $1", [enrol("ash")]);
  check("Evia: once Evia Portal answers, Ash's kept check-in goes through", ashRow && ashRow.here, JSON.stringify(ashRow));

  /* 7. The classroom screen is reloaded mid-session: the register still shows who's in. */
  await symi.page.reload(); await symi.page.waitForTimeout(1500);
  await symi.page.evaluate((rid) => { window.SamosApp.mutate((st) => { st.activeClassId = rid; st.view = "registers"; }); window.SamosApp.openRegisters(); }, reg.id);
  await symi.page.waitForFunction(() => /3 of 4/.test((document.querySelector("[data-sn-show]") || {}).parentElement ? document.querySelector("[data-sn-show]").parentElement.textContent : ""), null, { timeout: 20000 }).catch(() => {});
  const bar = await symi.page.evaluate(() => { const b = document.querySelector("[data-sn-show]"); return b ? b.parentElement.textContent.replace(/\s+/g, " ") : ""; });
  const ticks = await symi.page.$$eval(".sn-tick", (x) => x.length);
  check("Symi: after a reload the register still shows 3 of 4 checked in, with their ticks", /3 of 4/.test(bar) && ticks === 3, bar + " ticks " + ticks);

  /* 8. Zed is ill: the tutor marks him, then finishes the register. */
  const zedMark = await symi.page.$('.sn-mark[aria-label^="Mark for Zed"]');
  if (zedMark) { await zedMark.click(); await symi.page.click('[data-r="ill"]'); await symi.page.waitForTimeout(400); }
  await symi.page.evaluate((rid) => window.SamosApp.mutate((st) => { const k = Object.keys(st.attendance || {}).find((x) => x.startsWith(rid + ":")); if (k) for (const r of Object.values(st.attendance[k])) if (r && r.runningSince) r.runningSince = Date.now() - 2 * 3600e3; }), reg.id);
  await symi.page.click("[data-finish-register]");
  await symi.page.waitForFunction(() => /Sent to Evia Portal|Not sent/.test((document.querySelector(".sn-bar") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
  const marks = await q(`select p.display_name n, a.status, a.reason, a.minutes, a.confirmed_at is not null c from public.class_attendance a join public.enrolments e on e.id = a.enrolment_id
    join public.learners l on l.id = e.learner_id join public.organisation_members m on m.id = l.organisation_member_id join public.profiles p on p.id = m.user_id order by 1`);
  const by = Object.fromEntries(marks.map((m) => [m.n.split(" ")[0], m]));
  check("Symi: Finish sends it: Lee, Kay and Ash present for about 2 hours, Zed absent (Sickness), all confirmed",
    ["Lee", "Kay", "Ash"].every((n) => by[n] && by[n].status === "present" && by[n].minutes >= 110 && by[n].c) && by.Zed && by.Zed.status === "absent" && /ill|sick/i.test(by.Zed.reason || "") && by.Zed.c, JSON.stringify(marks));

  /* 9. Zed was actually on holiday: the tutor changes the finished register. Kept, not doubled. */
  const zedAgain = await symi.page.$('.sn-mark[aria-label^="Mark for Zed"]');
  if (zedAgain) { await zedAgain.click(); await symi.page.click('[data-r="holiday"]'); }
  await symi.page.waitForTimeout(2500);
  const [zed2] = await q("select a.reason, (select count(*) from public.attendance_changes c where c.attendance_id = a.id)::int changes from public.class_attendance a where enrolment_id = $1", [enrol("zed")]);
  const [hours] = await q("select count(*)::int n, count(distinct enrolment_id)::int people from public.otj_entries where activity_type = 'college'");
  check("Symi: changing Zed to Holiday after Finish goes to Evia Portal and the change is kept; college hours stay one entry each", zed2 && /holiday/i.test(zed2.reason || "") && zed2.changes >= 1 && hours.n === hours.people, JSON.stringify({ zed2, hours }));

  /* 10. A check-in that only reaches Evia Portal after the register is finished: the tutor is told, the mark isn't changed. */
  /* (A code scanned 90 seconds ago with no signal, sent now.) */
  const [old] = await q(`select 'NISI:IN:1:' || s.id || ':' || w.w || ':' || private.checkin_sig(k.secret, s.id, w.w) code, to_timestamp(w.w * 20 + 5) at
    from public.class_sessions s join private.class_session_keys k on k.session_id = s.id cross join (select floor((extract(epoch from now()) - 90) / 20)::bigint w) w where s.session_date = current_date limit 1`);
  const late = await rpc("nisia_check_in", { p_code: old.code, p_scanned_at: old.at.toISOString() }, as("zed"));
  const [told] = await q("select count(*)::int n from public.notifications where notification_type = 'late_check_in'");
  const [zed3] = await q("select status from public.class_attendance where enrolment_id = $1", [enrol("zed")]);
  check("Evia Portal: Zed's no-signal check-in, arriving after Finish, tells the tutor and leaves the register as the tutor set it", late.status === 200 && late.body.offline && told.n === 1 && zed3.status === "absent", JSON.stringify({ late: late.body, told, zed3 }));

  /* 11. The portal's view of the day and the attendance report agree with the register. */
  const day = await rpc("nisia_today", { p_org: ORG, p_day: today }, ada);
  const report = await rpc("nisia_attendance_report", { p_org: ORG, p_from: today, p_to: today }, ada);
  const rows = report.status === 200 ? (Array.isArray(report.body) ? report.body : report.body.learners || report.body.rows || []) : [];
  check("Portal: today's board and the attendance report show the class and all four learners", day.status === 200 && /L3 Walls/.test(JSON.stringify(day.body)) && rows.length >= 4,
    JSON.stringify({ day: day.status, report: report.status, rows: rows.length, msg: report.body && report.body.message }));

  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test finished", false, e.stack || e.message); }
await finish();

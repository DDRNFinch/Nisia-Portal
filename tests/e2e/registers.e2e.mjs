/* Registers, end to end, the way people use them: a tutor runs a register in Symi, the learner checks in from Evia,
   the tutor finishes the register, the hours arrive in the learner's Evia, and the employer sees them in Paros.
   The apps run in real browsers; Evia Portal is a real Postgres with Evia Portal's own tables, rules and functions
   (services/supabase), so a wrong rule or a missing permission fails here before anyone tries it for real.
   Only the sign-in is pretend (any password; the code 123456 is the authenticator app).
   Run: node tests/e2e/registers.e2e.mjs   (needs Postgres 16) */
import { check, q, session, rpc, tableTouches, site, TEE, LEE, EM, ENROL, errors, warnings, app, signIn, finish } from "./harness.mjs";

try {
  /* 1. The tutor's Symi: a register for today with Lee on it, then connected to Evia Portal. */
  const symi = await app();
  await symi.page.goto(site + "/apps/symi/update.json");
  await symi.page.evaluate(() => {
    localStorage.clear();
    const d = new Date(), key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const L = [{ id: "x1", name: "Lee Erna", externalId: "" }];
    localStorage.setItem("symi-last-seen-release-v1", "9.9.9");
    localStorage.setItem("samos.classroom.data", JSON.stringify({ settings: { teacherName: "Tee", centre: "" }, learners: L, teachingClasses: [], attendance: {}, history: [], resources: [], courses: [],
      classes: [{ id: "reg1", name: "L2 Brickwork", day: "Monday", room: "Workshop 1", start: "00:01", end: "23:58", breaks: [], learners: L, recurrence: { type: "once", onceDate: key, startDate: key, endDate: key } }],
      activeClassId: "reg1", view: "registers" }));
  });
  await symi.page.goto(site + "/apps/symi/"); await symi.page.waitForTimeout(1200);
  await symi.page.evaluate(() => window.SamosApp.openRegisters());
  await symi.page.click("#nisiaButton"); await signIn(symi.page, "tee@e2e.test", ".sn-auth ");
  await symi.page.waitForFunction(() => document.querySelector("#nisiaButton.on"), null, { timeout: 10000 });
  await symi.page.waitForFunction(() => (window.SamosApp.getState().learners.find((l) => l.id === "x1") || {}).nisia, null, { timeout: 10000 });
  check("Symi: the tutor signs in and Lee comes from Evia Portal (Tee's own learner)", true);

  /* 2. The classroom screen: the class and today's session saved to Evia Portal, and the code drawn from Evia Portal's key. */
  await symi.page.click("[data-sn-show]");
  await symi.page.waitForSelector(".sn-checkin .sn-code:not(:empty)", { timeout: 10000 }).catch(() => {});
  const failed = await symi.page.$(".sn-checkin .sn-err");
  const code = failed ? "" : (await symi.page.textContent(".sn-checkin .sn-code")).replace(/\s/g, "");
  const [saved] = await q("select (select count(*) from public.classes where client_ref = 'reg1')::int classes, (select count(*) from public.class_learners)::int learners, (select count(*) from public.class_sessions)::int sessions");
  check("Symi: Show check-in code saves a brand-new class, its learner and today's session to Evia Portal (the bug from 3 October)", !failed && code.length === 6 && saved.classes === 1 && saved.sessions === 1,
    failed ? await failed.textContent() : JSON.stringify(saved));

  /* 3. Lee checks in from Evia with the code on the screen. */
  const ev = await app({ width: 412, height: 915 });
  await ev.page.goto(site + "/evia/manifest.json");
  await ev.page.evaluate(([tok, enrol]) => {
    localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1");
    ["evia7-theme-picked", "evia7-shape-picked"].forEach((k) => localStorage.setItem(k, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna", start: "2026-01-05", end: "2027-12-01" }));
    localStorage.setItem("evia7-enrolment", JSON.stringify({ course: "bricklayer", live: true, college: "E2E College", learnerId: "0e2e0000-0000-0000-0000-0000000000c1", organisationId: "0e2e0000-0000-0000-0000-000000000001",
      enrolmentId: enrol, courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: "0e2e0000-0000-0000-0000-0000000000b2", name: "Lee Erna", employer: "Ployer Builders", start: "2026-01-05", end: "2027-12-01", joinedAt: new Date().toISOString() }));
    localStorage.setItem("evia7-nisia-auth", JSON.stringify(tok));
  }, [session(LEE, "aal1", "lee@e2e.test"), ENROL]);
  await ev.page.goto(site + "/evia/"); await ev.page.waitForTimeout(2500);
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); });
  await ev.page.evaluate(() => window.eviaNisia.sync()).catch(() => {}); await ev.page.waitForTimeout(500);
  const card = await ev.page.evaluate(() => (window.eviaTodo.list().find((x) => x.ic === "checkin") || {}).title || "");
  check("Evia: during the class, “Check in to L2 Brickwork” is top of Lee's list (from Evia Portal's one “what's new” request)", /Check in to L2 Brickwork/.test(card), card);
  await ev.page.evaluate(() => window.eviaCheckIn.open()); await ev.page.waitForSelector("#ci-view .ci-code");
  await ev.page.fill("#ci-view .ci-code", code); await ev.page.click('#ci-view .ci-form button[type=submit]');
  await ev.page.waitForFunction(() => /checked in|Not checked in/.test(document.getElementById("ci-view").textContent), null, { timeout: 10000 });
  const done = await ev.page.textContent("#ci-view");
  check("Evia: Lee types the code and is checked in by Evia Portal", /You’re checked in/.test(done) && /L2 Brickwork/.test(done), done);

  /* 4. Symi ticks Lee; the tutor finishes the register after a two-hour class. */
  await symi.page.waitForFunction(() => /1 of 1 checked in/.test((document.querySelector(".sn-count") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
  check("Symi: the classroom screen ticks Lee in", /1 of 1 checked in/.test(await symi.page.textContent(".sn-count")), await symi.page.textContent(".sn-count"));
  await symi.page.click(".sn-checkin .sn-close");
  await symi.page.evaluate(() => window.SamosApp.mutate((st) => { const k = Object.keys(st.attendance).find((x) => x.startsWith("reg1:")), r = st.attendance[k].x1; r.runningSince = Date.now() - 2 * 3600e3; }));
  await symi.page.click("[data-finish-register]");
  await symi.page.waitForFunction(() => /Sent to Evia Portal|Not sent/.test((document.querySelector(".sn-bar") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
  const [att] = await q("select status, minutes, confirmed_at is not null confirmed, (select hours from public.otj_entries where id = a.id) hours from public.class_attendance a where enrolment_id = $1", [ENROL]);
  check("Symi: Finish sends the register; Evia Portal keeps Lee present for 2 hours, confirmed by the tutor, as college learning hours",
    /Sent to Evia Portal/.test(await symi.page.textContent(".sn-bar")) && att && att.status === "present" && att.minutes >= 119 && att.confirmed && Number(att.hours) >= 1.98, (await symi.page.textContent(".sn-bar")) + " " + JSON.stringify(att));

  /* 5. Lee's Evia: the college hours arrive (locked: the learner can't change them). */
  await ev.page.evaluate(() => window.eviaNisia.sync()).catch(() => {}); await ev.page.waitForTimeout(500);
  const hrs = await ev.page.evaluate(() => window.eviaData.list("hours").filter((h) => h.source === "college").map((h) => ({ m: h.minutes, d: h.description })));
  check("Evia: Lee's learning log has the 2 hours from college, with the class", hrs.length === 1 && hrs[0].m >= 119 && /L2 Brickwork/.test(hrs[0].d), JSON.stringify(hrs));

  /* 6. The employer's Paros: Lee's college attendance. */
  const par = await app({ width: 400, height: 860 });
  await par.page.goto(site + "/apps/paros/"); await signIn(par.page, "em@e2e.test");
  await par.page.waitForSelector("[data-id]", { timeout: 15000 }).catch(() => {});
  await par.page.click("[data-id]").catch(() => {}); await par.page.waitForSelector("[data-lt=college]", { timeout: 10000 }).catch(() => {});
  await par.page.click("[data-lt=college]").catch(() => {}); await par.page.waitForTimeout(600);
  const col = await par.page.textContent("[data-pane=college]").catch(() => "");
  check("Paros: the employer sees Lee at college: L2 Brickwork, 2 hours", /L2 Brickwork/.test(col) && /2h/.test(col), col);

  /* 7. Stage 2: the employer's witness testimony and behaviour ratings from Paros reach Lee's Evia. */
  await par.page.click("[data-lt=overview]"); await par.page.click("#doWitness");
  await par.page.waitForSelector("#wText");
  await par.page.fill("#wText", "Lee built a garden wall at the Ploughman job on his own: set out, bonded and pointed it neatly and checked it was plumb and level throughout.");
  await par.page.click("#wKsbs [data-k]").catch(() => {}); await par.page.click('#wRate [data-v="3"]'); await par.page.check("#wSign"); await par.page.click("#wSave");
  await par.page.waitForFunction(() => !document.querySelector("#wSave"), null, { timeout: 10000 }).catch(() => {});
  await par.page.click("#doRate"); await par.page.waitForSelector(".p-beh");
  for (const k of await par.page.$$eval(".p-beh", (x) => x.map((b) => b.dataset.k))) await par.page.click('.p-beh[data-k="' + k + '"] [data-v="3"]');
  await par.page.fill("#bNote", "Reliable and keen."); await par.page.click("#bSave");
  await par.page.waitForFunction(() => !document.querySelector("#bSave"), null, { timeout: 10000 }).catch(() => {});
  const [fb] = await q("select (select count(*) from public.witness_testimonies where enrolment_id = $1)::int w, (select count(*) from public.behaviour_ratings where enrolment_id = $1)::int b, (select count(*) from public.notifications where notification_type in ('witness_testimony','behaviour_rated'))::int told", [ENROL]);
  check("Paros: the employer signs a witness testimony and rates Lee's behaviours (through Evia Portal's actions; Lee is told)", fb.w === 1 && fb.b === 1 && fb.told === 2, JSON.stringify(fb));
  /* (Evia may already be syncing from before the employer sent them: sync until they're in, at most a few times.) */
  for (let i = 0; i < 4; i++) { await ev.page.evaluate(() => window.eviaNisia.sync()).catch(() => {}); if (await ev.page.evaluate(() => window.eviaData.list("supporting").filter((x) => String(x.id).startsWith("emp-")).length >= 2)) break; await ev.page.waitForTimeout(500); }
  const sup = await ev.page.evaluate(() => window.eviaData.list("supporting").filter((x) => String(x.id).startsWith("emp-")).map((x) => x.title).sort());
  check("Evia: both arrive in Lee's Supporting evidence (from the one “what's new” request)", sup.length === 2 && sup.includes("Employer feedback: behaviours") && sup.some((t) => /^Witness testimony/.test(t)), JSON.stringify(sup) + " " + warnings.join(" | "));

  /* 8. Attendance in Lee's My progress: a percentage and a calendar. */
  await ev.page.evaluate(() => { window.eviaChatKit && window.eviaChatKit.closeChat(); nav("learning"); }); await ev.page.waitForTimeout(900);
  const tile = await ev.page.textContent("#pv-attendance").catch(() => "");
  await ev.page.evaluate(() => window.eviaProgressDeep("attendance")); await ev.page.waitForSelector(".pv-acal-d", { timeout: 5000 }).catch(() => {});
  const greenToday = await ev.page.evaluate(() => { const d = new Date(), k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); const c = document.querySelector('.pv-acal-d[data-day="' + k + '"]'); return c ? c.className : "no cell " + k + " " + document.querySelectorAll(".pv-acal-d").length; });
  /* (The register started at 00:01, so Lee's check-in was late. The calendar has three kinds of day, so today is
     "present"; tapping it says "Present, late".) */
  const lateSaid = await ev.page.evaluate(async () => { const d = new Date(), k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); const c = document.querySelector('.pv-acal-d[data-day="' + k + '"]'); if (!c) return false; c.click(); await new Promise((r) => setTimeout(r, 200)); return /late/i.test((document.getElementById("pv-acal-day") || {}).textContent || ""); });
  check("Evia: My progress shows Lee's attendance, 100% (1 of 1, late), and today is present on the calendar, marked late", /100%/.test(tile) && /1 of 1 session/.test(tile) && /pv-a-present/.test(greenToday) && lateSaid, tile + " " + greenToday);
  await ev.page.evaluate(() => { document.getElementById("modal-root").innerHTML = ""; });

  /* 9. Lee books tomorrow off in Evia: the tutor's Symi and the employer's Paros both see it. */
  const tm = new Date(Date.now() + 864e5), tmk = tm.getFullYear() + "-" + String(tm.getMonth() + 1).padStart(2, "0") + "-" + String(tm.getDate()).padStart(2, "0");
  const booked = await ev.page.evaluate((d) => window.eviaNisia.bookAbsence(d, d, "appointment", "Dentist"), tmk).catch((e) => ({ error: e.message }));
  const symiSees = await rpc("symi_absences", { p_from: tmk, p_to: tmk }, { sub: TEE, aal: "aal2" });
  const parosSees = await rpc("paros_absences", { p_enrolment: ENROL }, { sub: EM, aal: "aal2" });
  check("Evia: Lee books tomorrow off; the tutor (Symi) and the employer (Paros) both see “Dentist”",
    booked && booked.sent && symiSees.status === 200 && symiSees.body.some((a) => a.reason === "Dentist") && parosSees.status === 200 && parosSees.body.absences.some((a) => a.reason === "Dentist"), JSON.stringify({ booked, symi: symiSees.body, paros: parosSees.body && parosSees.body.absences }));

  /* 10. The rules: nobody else can do the tutor's job, and no app touched the class tables. */
  const lee = { sub: LEE, aal: "aal1" }, em = { sub: EM, aal: "aal2" }, tee = { sub: TEE, aal: "aal2" }, teeNoApp = { sub: TEE, aal: "aal1" };
  const [ses] = await q("select id from public.class_sessions limit 1");
  const tries = {
    learnerFinishes: await rpc("symi_finish_register", { p_session: ses.id, p_marks: [{ enrolment_id: ENROL, minutes: 600, status: "present" }] }, lee),
    employerReadsCheckins: await rpc("symi_checkins", { p_session: ses.id }, em),
    tutorWithoutApp: await rpc("symi_checkins", { p_session: ses.id }, teeNoApp),
    nobodyWhatsNew: await rpc("nisia_whats_new", {}, null),
    learnerSavesClass: await rpc("symi_save_class", { p_org: "0e2e0000-0000-0000-0000-000000000001", p_client_ref: "x", p_title: "Mine" }, lee),
    strangerOnRegister: await rpc("symi_finish_register", { p_session: ses.id, p_marks: [{ enrolment_id: "0e2e0000-0000-0000-0000-0000000000ff", minutes: 60, status: "present" }] }, tee),
    learnerWritesWitness: await rpc("paros_add_witness", { p_enrolment: ENROL, p_statement: "I saw myself do a brilliant job on the wall today, honestly.", p_rating: 3 }, lee),
    employerReadsAsAssessor: await rpc("milos_employer_feedback", { p_enrolment: ENROL }, em),
    employerConfirmsCollege: await rpc("paros_confirm_hours", { p_otj: (await q("select id from public.otj_entries where activity_type = 'college' limit 1"))[0].id, p_decision: "rejected", p_comment: "no" }, em),
    tutorRatesBehaviours: await rpc("paros_rate_behaviours", { p_enrolment: ENROL, p_ratings: { B1: 4 } }, tee),
  };
  check("Evia Portal refuses: a learner finishing a register, an employer reading check-ins, the tutor without the authenticator app, anyone not signed in, a learner making a class, someone not on the class, a learner writing their own witness testimony, an employer reading the assessor's view, an employer overruling college hours, a tutor rating as the employer",
    Object.values(tries).every((t) => t.status === 400), JSON.stringify(Object.fromEntries(Object.entries(tries).map(([k, v]) => [k, v.status + " " + (v.body && v.body.message || "")]))));
  const [after] = await q("select minutes from public.class_attendance where enrolment_id = $1", [ENROL]);
  check("…and Lee's hours are still the tutor's 2 hours", after.minutes >= 119 && after.minutes < 600, JSON.stringify(after));
  check("No app read or wrote a class table: everything went through Evia Portal's named actions", !tableTouches.length, tableTouches.join(", "));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test finished", false, e.stack || e.message); }
await finish();

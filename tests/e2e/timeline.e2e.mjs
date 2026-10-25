/* A learner's timeline (nisia_learner_timeline): one date-ordered story with their evidence and the assessor's decision,
   learning hours and whether the employer confirmed them, visits, reviews and days off, the same for the tutor, the
   employer and the learner, and not for anyone else.   Run: node tests/e2e/timeline.e2e.mjs   (needs Postgres 16) */
import { check, q, rpc, site, TEE, LEE, EM, ENROL, errors, app, signIn, finish } from "./harness.mjs";
const SHOTS = new URL("../shots/", import.meta.url).pathname;

const ORG = "0e2e0000-0000-0000-0000-000000000001", COURSE = "0e2e0000-0000-0000-0000-0000000000d1", TUTOR = "0e2e0000-0000-0000-0000-0000000000b1", EMP = "0e2e0000-0000-0000-0000-0000000000b3", LEARNER = "0e2e0000-0000-0000-0000-0000000000b2";
try {
  const [ev] = await q(`insert into public.evidence (organisation_id, enrolment_id, course_id, created_by_member_id, evidence_type, title, created_at, source_metadata)
    values ($1, $2, $3, $4, 'photo', 'Cavity wall', now() - interval '5 days', '{"unit":"Cavity walls"}') returning id`, [ORG, ENROL, COURSE, LEARNER]);
  await q(`insert into public.assessments (organisation_id, evidence_id, assessor_member_id, decision) values ($1, $2, $3, 'accepted')`, [ORG, ev.id, TUTOR]);
  await q(`insert into public.evidence (organisation_id, enrolment_id, course_id, created_by_member_id, evidence_type, title, created_at, source_metadata)
    values ($1, $2, $3, $4, 'written', 'Mortar mixes', now() - interval '1 day', '{"unit":"Mixing mortar"}')`, [ORG, ENROL, COURSE, LEARNER]);
  const [ot] = await q(`insert into public.otj_entries (organisation_id, enrolment_id, created_by_member_id, activity_date, activity_type, description, hours)
    values ($1, $2, $3, current_date - 3, 'training', 'Toolbox talk on scaffolds', 1.5) returning id`, [ORG, ENROL, LEARNER]);
  await q(`insert into public.otj_confirmations (organisation_id, otj_entry_id, confirmer_member_id, decision) values ($1, $2, $3, 'approved')`, [ORG, ot.id, EMP]);
  await q(`insert into public.visits (organisation_id, enrolment_id, booked_by_member_id, starts_at, kind, place) values ($1, $2, $3, now() + interval '4 days', 'observation', 'Site office')`, [ORG, ENROL, TUTOR]);
  await q(`insert into public.visits (organisation_id, enrolment_id, booked_by_member_id, starts_at, kind) values ($1, $2, $3, now() + interval '60 days', 'visit')`, [ORG, ENROL, TUTOR]);
  await q(`insert into public.absences (organisation_id, enrolment_id, starts_on, ends_on, kind, booked_by_member_id, booked_by_role) values ($1, $2, current_date - 10, current_date - 9, 'holiday', $3, 'employer')`, [ORG, ENROL, EMP]);
  await q(`insert into public.reviews (organisation_id, enrolment_id, course_id, created_by_member_id, review_type, reviewed_at) values ($1, $2, $3, $4, 'progress_review', now() - interval '20 days')`, [ORG, ENROL, COURSE, TUTOR]);

  const tutor = await rpc("nisia_learner_timeline", { p_enrolment: ENROL }, { sub: TEE, aal: "aal2" });
  const T = tutor.body || [], kinds = T.map((x) => x.kind), at = T.map((x) => x.at);
  check("The tutor sees the learner's story: evidence (with the assessor's decision), learning hours (confirmed), the booked visit, the review and the days off",
    tutor.status === 200 && T.some((x) => x.kind === "evidence" && /Cavity walls/.test(x.title) && x.sub === "Signed off") && T.some((x) => x.kind === "evidence" && /Mixing mortar/.test(x.title) && /Waiting/.test(x.sub)) &&
    T.some((x) => x.kind === "hours" && /1\.5 hours/.test(x.title) && /Confirmed/.test(x.sub)) && T.some((x) => x.kind === "visit" && /Observation visit \(booked\)/.test(x.title) && /Site office/.test(x.sub)) &&
    T.some((x) => x.kind === "review") && T.some((x) => x.kind === "off" && /holiday/.test(x.title) && /employer/.test(x.sub)), JSON.stringify(tutor));
  check("Newest first, and visits more than 30 days away aren't on it yet", at.every((a, i) => !i || at[i - 1] >= a) && kinds.filter((k) => k === "visit").length === 1, JSON.stringify(at));
  const emp = await rpc("nisia_learner_timeline", { p_enrolment: ENROL }, { sub: EM, aal: "aal2" }), me = await rpc("nisia_learner_timeline", { p_enrolment: ENROL }, { sub: LEE, aal: "aal1" });
  check("The employer and the learner see the same story", emp.status === 200 && me.status === 200 && JSON.stringify(emp.body) === JSON.stringify(T) && JSON.stringify(me.body) === JSON.stringify(T), JSON.stringify([emp.status, me.status, emp.body && emp.body.length]));
  const nobody = await rpc("nisia_learner_timeline", { p_enrolment: ENROL }), aal1 = await rpc("nisia_learner_timeline", { p_enrolment: ENROL }, { sub: TEE, aal: "aal1" });
  check("Not for anyone else: signed out, or staff without their second sign-in step", nobody.status === 400 && aal1.status === 400, JSON.stringify([nobody, aal1]));
  /* On screen: the timeline in Paros (the apprentice's Timeline tab) and Symi (the learner's profile). */
  const phone = { width: 400, height: 860 };
  const pa = await app(phone); await pa.page.goto(site + "/apps/paros/"); await signIn(pa.page, "em@e2e.test");
  await pa.page.waitForSelector("[data-tab=apprentices]"); await pa.page.click("[data-tab=apprentices]"); await pa.page.waitForSelector(".m-list [data-id]"); await pa.page.click(".m-list [data-id]");
  await pa.page.waitForSelector("[data-lt=timeline]"); await pa.page.click("[data-lt=timeline]"); await pa.page.waitForSelector("#tlBox .tl-row", { timeout: 10000 });
  await pa.page.screenshot({ path: SHOTS + "tl-paros.png" });
  const paText = await pa.page.textContent("#tlBox");
  check("Paros shows the timeline on the apprentice's page: by month, with the evidence decision, hours, visit and days off (Milos: tests/milos.test.mjs)",
    [paText].every((t) => /Signed off/.test(t) && /1\.5 hours of learning/.test(t) && /Observation visit/.test(t) && /Day.? off/.test(t)), paText.slice(0, 300));
  const sy = await app(phone); await sy.page.goto(site + "/apps/symi/update.json");
  await sy.page.evaluate(() => { localStorage.clear(); localStorage.setItem("symi-last-seen-release-v1", "9.9.9"); });
  await sy.page.goto(site + "/apps/symi/"); await sy.page.waitForTimeout(1200);
  await sy.page.evaluate(() => document.getElementById("nisiaButton").click()); await signIn(sy.page, "tee@e2e.test", ".sn-auth ");
  await sy.page.waitForFunction(() => (window.SamosApp.getState().learners || []).some((l) => l.nisia && l.nisia.enrolmentId), null, { timeout: 15000 });
  await sy.page.evaluate(() => { const l = window.SamosApp.getState().learners.find((x) => x.nisia && x.nisia.enrolmentId); window.SamosApp.mutate((s) => { s.selectedLearnerId = l.id; s.view = "learner"; }); });
  await sy.page.waitForSelector(".se-tl .tl-row", { timeout: 10000 }); await sy.page.screenshot({ path: SHOTS + "tl-symi.png", fullPage: true });
  check("Symi shows the same timeline under a linked learner's profile", /Signed off/.test(await sy.page.textContent(".se-tl")));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test ran to the end", false, e.stack + "\nERRORS: " + errors.join(" | ")); }
await finish();

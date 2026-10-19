/* The same account shows the same thing on every device. A tutor has Symi on a phone and on a desktop: a register
   started on one shows as started on the other, a mark made on either shows on both, and finishing it on one
   finishes it on the other, without reloading either. */
import { check, site, app, signIn, finish, errors, session, LEE, ENROL, q } from "./harness.mjs";

const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
async function symiOn(device, seed) {
  const s = await app(device);
  await s.page.goto(site + "/apps/symi/update.json");
  await s.page.evaluate(([seed, key]) => {
    localStorage.clear();
    localStorage.setItem("symi-last-seen-release-v1", "9.9.9");
    if (!seed) return;
    const L = [{ id: "x1", name: "Lee Erna", externalId: "" }];
    localStorage.setItem("samos.classroom.data", JSON.stringify({ settings: { teacherName: "Tee", centre: "" }, learners: L, teachingClasses: [], attendance: {}, history: [], resources: [], courses: [],
      classes: [{ id: "reg1", name: "L2 Brickwork", day: "Monday", room: "Workshop 1", start: "00:01", end: "23:58", breaks: [], learners: L, recurrence: { type: "once", onceDate: key, startDate: key, endDate: key } }],
      activeClassId: "reg1", view: "registers" }));
  }, [seed, today()]);
  await s.page.goto(site + "/apps/symi/"); await s.page.waitForTimeout(1200);
  await s.page.evaluate(() => window.SamosApp.openRegisters());
  await s.page.click("#nisiaButton"); await signIn(s.page, "tee@e2e.test", ".sn-auth ");
  await s.page.waitForFunction(() => document.querySelector("#nisiaButton.on"), null, { timeout: 10000 });
  return s;
}
const leeTimer = (p) => p.evaluate((key) => { const a = window.SamosApp.getState().attendance["reg1:" + key] || {}; return Object.entries(a).filter(([k]) => k !== "_meta").map(([, r]) => r)[0] || null; }, today());

/* 1. The phone: the register, Lee checked in (timer running). */
const phone = await symiOn({ width: 390, height: 844 }, true);
await phone.page.waitForFunction(() => (window.SamosApp.getState().learners.find((l) => l.id === "x1") || {}).nisia, null, { timeout: 10000 });
await phone.page.evaluate(() => window.SamosApp.startTimer("reg1", "x1"));
await phone.page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem("symi.nisia.live.v1") || "{}")).length, null, { timeout: 15000 }).catch(() => {});
check("Phone: starting the register sends it to Evia Portal", await phone.page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("symi.nisia.live.v1") || "{}")).length === 1));

/* 2. The desktop, signed in as the same tutor, with nothing on it: the class comes from Evia Portal, already started. */
const desk = await symiOn({ width: 1280, height: 860 }, false);
await desk.page.waitForFunction((key) => { const a = window.SamosApp.getState().attendance["reg1:" + key]; return a && Object.entries(a).some(([k, r]) => k !== "_meta" && r.runningSince); }, today(), { timeout: 20000 }).catch(() => {});
const dt = await leeTimer(desk.page), pt = await leeTimer(phone.page);
check("Desktop: the register the phone started shows as started, with Lee's timer running from the same time", dt && pt && dt.runningSince === pt.runningSince, JSON.stringify({ dt, pt }));

/* 3. A mark made on the desktop shows on the phone, without a reload. */
await desk.page.evaluate(() => { window.SamosApp.mutate((st) => { st.activeClassId = "reg1"; st.view = "registers"; }); });
await desk.page.waitForSelector(".sn-tick, .sn-mark", { timeout: 10000 }).catch(() => {});
await desk.page.click(".sn-tick, .sn-mark").catch(() => {});
await desk.page.click('.sn-marks [data-m="late"]').catch(() => {});
await phone.page.waitForFunction((key) => Object.values(JSON.parse(localStorage.getItem("symi.nisia.marks.v1") || "{}")["reg1:" + key] || {}).some((m) => m.kind === "late"), today(), { timeout: 20000 }).catch(() => {});
check("Phone: Lee marked late on the desktop shows as late on the phone", await phone.page.evaluate((key) => Object.values(JSON.parse(localStorage.getItem("symi.nisia.marks.v1") || "{}")["reg1:" + key] || {}).some((m) => m.kind === "late"), today()));

/* 4. A timer stopped on the phone stops on the desktop. */
await phone.page.evaluate(() => window.SamosApp.mutate((st) => { const k = Object.keys(st.attendance).find((x) => x.startsWith("reg1:")), r = st.attendance[k].x1; r.intervals.push({ start: r.runningSince, end: Date.now() }); r.runningSince = null; }));
await desk.page.waitForFunction((key) => { const a = window.SamosApp.getState().attendance["reg1:" + key]; return a && Object.entries(a).some(([k, r]) => k !== "_meta" && !r.runningSince && r.intervals.length); }, today(), { timeout: 20000 }).catch(() => {});
const d2 = await leeTimer(desk.page);
check("Desktop: Lee's timer stopped on the phone stops on the desktop", d2 && !d2.runningSince && d2.intervals.length === 1, JSON.stringify(d2));

/* 5. Finished on the desktop: finished on the phone, with the same hours. */
await desk.page.evaluate(() => window.SamosApp.mutate((st) => { st.activeClassId = "reg1"; }));
await desk.page.click("[data-finish-register]");
await phone.page.waitForFunction(() => window.SamosApp.done("reg1"), null, { timeout: 20000 }).catch(() => {});
const hours = async (p) => p.evaluate(() => { const h = window.SamosApp.getState().history.find((x) => x.classId === "reg1"); return h ? h.attendedMs : null; });
const [ph, dh] = [await hours(phone.page), await hours(desk.page)];
check("Phone: the register finished on the desktop is finished on the phone, with the same hours", ph !== null && ph === dh, JSON.stringify({ ph, dh }));

/* 6. Evia: Lee on a phone and a computer. A day off booked on the phone and cancelled on the computer goes from the
   phone's calendar on its own, without closing or reloading Evia. */
async function eviaOn(device) {
  const ev = await app(device);
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
  return ev;
}
const tm = new Date(Date.now() + 864e5), day = tm.getFullYear() + "-" + String(tm.getMonth() + 1).padStart(2, "0") + "-" + String(tm.getDate()).padStart(2, "0");
const ePhone = await eviaOn({ width: 412, height: 915 });
/* Is the day shown as booked off on the phone's calendar? (Its square, when that month is on screen; else what Evia holds.) */
const offShown = (p, d, why) => p.evaluate(([d, why]) => { const c = document.querySelector('.pv-acal-d[data-day="' + d + '"]'); return c ? c.classList.contains("pv-a-booked") : window.eviaNisia.absences().some((a) => a.reason === why); }, [d, why]);
const booked = await ePhone.page.evaluate((d) => window.eviaNisia.bookAbsence(d, d, "appointment", "Dentist"), day).catch((e) => ({ error: e.message }));
await ePhone.page.evaluate(() => { screen = "calendar"; render(); });
await ePhone.page.waitForTimeout(800);
const shownBefore = await offShown(ePhone.page, day, "Dentist");
const eDesk = await eviaOn({ width: 1280, height: 860 });
await eDesk.page.waitForFunction(() => window.eviaNisia.absences().some((a) => a.reason === "Dentist" && !a.local), null, { timeout: 20000 }).catch(() => {});
const id = await eDesk.page.evaluate(() => (window.eviaNisia.absences().find((a) => a.reason === "Dentist") || {}).id);
const cancelled = await eDesk.page.evaluate((x) => window.eviaNisia.cancelAbsence(x).then(() => true), id).catch((e) => e.message);
/* The phone is left alone: it finds out by itself (it checks every 30 seconds while it's on screen). */
for (let i = 0; i < 45 && await offShown(ePhone.page, day, "Dentist"); i++) await ePhone.page.waitForTimeout(1000);
const shownAfter = await offShown(ePhone.page, day, "Dentist");
check("Evia: a day off booked on the phone and cancelled on the computer goes from the phone's calendar by itself", booked && booked.sent !== false && shownBefore && cancelled === true && !shownAfter,
  JSON.stringify({ booked, shownBefore, id, cancelled, shownAfter }));

/* 7. Coming back to Evia (switching apps, or a refresh) shows the change at once. */
const id2 = await eDesk.page.evaluate((d) => window.eviaNisia.bookAbsence(d, d, "ill", "Flu").then((r) => !!(r && r.sent)), day).catch(() => null);
await ePhone.page.evaluate(() => { Object.defineProperty(document, "hidden", { value: false, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
for (let i = 0; i < 8 && !await offShown(ePhone.page, day, "Flu"); i++) await ePhone.page.waitForTimeout(1000);
check("Evia: coming back to the app on the phone shows a day off just booked on the computer within seconds", !!id2 && await offShown(ePhone.page, day, "Flu"), JSON.stringify({ id2, abs: await ePhone.page.evaluate(() => window.eviaNisia.absences()), cell: await ePhone.page.evaluate((d) => (document.querySelector('.pv-acal-d[data-day="' + d + '"]') || {}).className, day) }));
await ePhone.page.reload(); await ePhone.page.waitForTimeout(2500);
await ePhone.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); screen = "calendar"; render(); });
const afterReload = await ePhone.page.evaluate(() => window.eviaNisia.absences().some((a) => a.reason === "Flu"));
check("Evia: after a refresh the phone still has it", afterReload);

/* 8. A meeting guest: Evia learns when their demo ends, and from then on shows "This demo has ended" and keeps nothing.
   (Lee stands in for a guest here: a meeting_guests row ending a few seconds from now.) */
const [lrow] = await q("select l.id as learner_id, l.organisation_id from public.learners l join public.organisation_members m on m.id = l.organisation_member_id where m.user_id = $1", [LEE]);
await q("insert into public.meeting_guests (learner_id, organisation_id, user_id, enrolment_id, name, meeting, expires_at) values ($1, $2, $3, $4, 'Lee Erna', 'Investor meeting', now() + interval '8 seconds')", [lrow.learner_id, lrow.organisation_id, LEE, ENROL]);
const gPhone = await eviaOn({ width: 412, height: 915 });
await gPhone.page.evaluate(() => window.eviaNisia.sync()).catch(() => {});
await gPhone.page.waitForFunction(() => Number(localStorage.getItem("evia-demo-ends") || 0) > 0, null, { timeout: 15000 }).catch(() => {});
const ends = await gPhone.page.evaluate(() => Number(localStorage.getItem("evia-demo-ends") || 0));
check("Guest: Evia knows when the demo ends", ends > Date.now() - 60000, String(ends));
const before = await gPhone.page.evaluate(() => /This demo has ended/.test(document.body.textContent));
await gPhone.page.waitForTimeout(Math.max(0, ends - Date.now()) + 1000);
await gPhone.page.reload(); await gPhone.page.waitForTimeout(2500);
const after = await gPhone.page.evaluate(async () => ({ text: document.body.textContent, keys: Object.keys(localStorage).filter((k) => /^evia7-/.test(k)), dbs: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name).filter((n) => /^evia7-/.test(n)) : [], app: !!window.eviaNisia }));
check("Guest: once the time is up, Evia shows “This demo has ended”, and nothing of Evia is left on the phone", !before && /This demo has ended/.test(after.text) && !after.keys.length && !after.dbs.length && !after.app, JSON.stringify(after).slice(0, 300));
await gPhone.page.goto(site + "/evia/"); await gPhone.page.waitForTimeout(1500);
check("Guest: it stays ended when Evia is opened again", /This demo has ended/.test(await gPhone.page.textContent("body")));
await gPhone.page.goto(site + "/evia/?pair=ABCDEFG"); await gPhone.page.waitForTimeout(1500);
check("Guest: a new code on the same phone starts afresh, so the phone isn't locked for the next meeting", !/This demo has ended/.test(await gPhone.page.textContent("body")));
await q("delete from public.meeting_guests where learner_id = $1", [lrow.learner_id]);

/* 9. Ended early from Evia Portal ("End now"): the guest's meeting has gone while Evia is open; it shows "This demo has ended"
   within seconds of being looked at, rather than carrying on as if it were never a demo. */
await q("insert into public.meeting_guests (learner_id, organisation_id, user_id, enrolment_id, name, meeting, expires_at) values ($1, $2, $3, $4, 'Lee Erna', 'Investor meeting', now() + interval '1 day')", [lrow.learner_id, lrow.organisation_id, LEE, ENROL]);
const g2 = await eviaOn({ width: 412, height: 915 });
await g2.page.evaluate(() => window.eviaNisia.sync()).catch(() => {});
await g2.page.waitForFunction(() => localStorage.getItem("evia-demo-guest") === "1", null, { timeout: 15000 }).catch(() => {});
const knew = await g2.page.evaluate(() => localStorage.getItem("evia-demo-guest") === "1" && !/This demo has ended/.test(document.body.textContent));
await q("delete from public.meeting_guests where learner_id = $1", [lrow.learner_id]);
await g2.page.evaluate(() => { Object.defineProperty(document, "hidden", { value: false, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
for (let i = 0; i < 15 && !await g2.page.evaluate(() => /This demo has ended/.test(document.body.textContent)).catch(() => false); i++) await g2.page.waitForTimeout(1000);
check("Guest: ended early with End now, the open Evia shows “This demo has ended” as soon as it's looked at", knew && await g2.page.evaluate(() => /This demo has ended/.test(document.body.textContent)));

check("No script errors", !errors.length, errors.join(" | "));
await finish();

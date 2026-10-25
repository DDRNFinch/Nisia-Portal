/* Symi registers linked to Evia Portal keep the tutor's own learners, and a register finished too early can be opened
   again: on this device, on Evia Portal (the session is open again for check-ins) and on the tutor's other devices
   (an old finish from another device doesn't close it again). From 23 October: a tutor's 15 own learners went from
   their register once it was linked to Evia Portal, and the register was finished early with no way back.
   Run: node tests/e2e/zz-reopen.e2e.mjs   (needs Postgres 16) */
import { check, q, rpc, site, TEE, LEE, errors, app, signIn, finish } from "./harness.mjs";

try {
  const symi = await app();
  await symi.page.goto(site + "/apps/symi/update.json");
  await symi.page.evaluate(() => {
    localStorage.clear();
    const d = new Date(), key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const L = [{ id: "x1", name: "Lee Erna", externalId: "" }, { id: "x2", name: "Sam Own", externalId: "" }, { id: "x3", name: "Kit Own", externalId: "" }];
    localStorage.setItem("symi-last-seen-release-v1", "9.9.9");
    localStorage.setItem("samos.classroom.data", JSON.stringify({ settings: { teacherName: "Tee", centre: "" }, learners: L, attendance: {}, history: [], resources: [], courses: [],
      teachingClasses: [{ id: "tc1", name: "L2 Brickwork", learnerIds: ["x1", "x2", "x3"], schedule: [], recurrence: { type: "weekly", interval: 1 } }],
      /* Kit is on the class but an older Symi took them off the register. */
      classes: [{ id: "reg1", name: "L2 Brickwork", day: "Monday", room: "Workshop 1", start: "00:01", end: "23:58", breaks: [], teachingClassId: "tc1", learners: L.slice(0, 2), recurrence: { type: "once", onceDate: key, startDate: key, endDate: key } }],
      activeClassId: "reg1", view: "registers" }));
  });
  await symi.page.goto(site + "/apps/symi/"); await symi.page.waitForTimeout(1200);
  await symi.page.evaluate(() => window.SamosApp.openRegisters());
  await symi.page.evaluate(() => document.getElementById("nisiaButton").click()); await signIn(symi.page, "tee@e2e.test", ".sn-auth ");
  await symi.page.waitForFunction(() => (window.SamosApp.getState().learners.find((l) => l.id === "x1") || {}).nisia, null, { timeout: 10000 });
  await symi.page.waitForSelector("[data-sn-show]", { timeout: 15000 });
  await symi.page.click("[data-sn-show]");
  await symi.page.waitForSelector(".sn-checkin .sn-code:not(:empty)", { timeout: 15000 });
  await symi.page.keyboard.press("Escape").catch(() => {});

  /* Evia Portal changes the class (as when it's linked or edited there): Symi takes its learners, and keeps its own. */
  await q("update public.classes set updated_at = now() + interval '1 minute' where client_ref = 'reg1'");
  await symi.page.reload(); await symi.page.waitForTimeout(2500);
  await symi.page.waitForFunction(() => { const r = window.SamosApp.getState().classes.find((c) => c.id === "reg1"); return r && r.nisiaUpdatedAt && r.learners.length >= 3; }, null, { timeout: 15000 }).catch(() => {});
  const names = await symi.page.evaluate(() => window.SamosApp.getState().classes.find((c) => c.id === "reg1").learners.map((l) => l.name).sort().join(", "));
  check("Symi: a register linked to Evia Portal keeps the tutor's own learners, and gets back the ones on its class", names === "Kit Own, Lee Erna, Sam Own", names);

  /* Finished too early. */
  await symi.page.evaluate(() => window.SamosApp.openRegisters()); await symi.page.waitForTimeout(400);
  await symi.page.click("[data-finish-register]");
  await symi.page.waitForFunction(() => window.SamosApp.done("reg1"), null, { timeout: 5000 });
  await symi.page.evaluate(() => window.SymiNisia && window.dispatchEvent(new Event("online")));
  for (let i = 0; i < 30; i++) { const [s] = await q("select status from public.class_sessions"); if (s && s.status === "finished") break; await symi.page.waitForTimeout(500); }
  const [before] = await q("select s.status, l.state -> 'finished' fin from public.class_sessions s left join private.register_live l on l.session_id = s.id");
  check("Symi: Finish sends the register to Evia Portal", before && before.status === "finished", JSON.stringify(before));
  for (let i = 0; i < 30; i++) { const [l] = await q("select state -> 'finished' f from private.register_live"); if (l && l.f) break; await symi.page.waitForTimeout(500); }

  /* Open again. */
  await symi.page.evaluate(() => window.SamosApp.openRegisters()); await symi.page.waitForTimeout(400);
  const button = await symi.page.$("[data-reopen-register]");
  check("Symi: a finished register shows Open again (till the end of the session)", !!button);
  if (button) await button.click();
  await symi.page.waitForTimeout(300);
  const local = await symi.page.evaluate(() => ({ done: window.SamosApp.done("reg1"), finish: !!document.querySelector("[data-finish-register]"), rows: window.SamosApp.getState().history.length }));
  check("Symi: Open again takes the finish off; timers and Finish are back", !local.done && local.finish && local.rows === 0, JSON.stringify(local));
  for (let i = 0; i < 30; i++) { const [s] = await q("select status from public.class_sessions"); if (s && s.status === "open") break; await symi.page.waitForTimeout(500); }
  const [after] = await q("select s.id, s.status, s.finished_at, l.state -> 'finished' fin, l.state ->> 'reopenedAt' rat from public.class_sessions s join private.register_live l on l.session_id = s.id");
  check("Evia Portal: the session is open again, with no finish on the live register", after && after.status === "open" && !after.finished_at && !after.fin && after.rat, JSON.stringify(after));

  /* The tutor's other device still has the old finish: it can't close the register again. A new finish can. */
  const tee = { sub: TEE, aal: "aal2" };
  const old = await rpc("symi_registers_sync", { p_items: [{ session: after.id, state: { finished: { endAt: Date.now(), auto: false, doneAt: Number(after.rat) - 5000 } } }] }, tee);
  const noId = await rpc("symi_registers_sync", { p_items: [{ session: after.id, state: { finished: { endAt: Date.now(), auto: false } } }] }, tee);
  check("Evia Portal: an old finish from another device (or an older Symi) doesn't close it again",
    old.status === 200 && !old.body[0].state.finished && !noId.body[0].state.finished && old.body[0].state.reopenedAt, JSON.stringify(old.body));
  await symi.page.waitForTimeout(9000);
  check("Symi: still open after syncing with Evia Portal", !(await symi.page.evaluate(() => window.SamosApp.done("reg1"))));
  await symi.page.click("[data-finish-register]");
  for (let i = 0; i < 40; i++) { const [s] = await q("select status from public.class_sessions"); if (s && s.status === "finished") break; await symi.page.waitForTimeout(500); }
  const [again] = await q("select s.status, l.state -> 'finished' fin from public.class_sessions s join private.register_live l on l.session_id = s.id");
  check("Symi: finishing it again sends it again", again.status === "finished" && !!again.fin, JSON.stringify(again));

  const other = { sub: LEE, aal: "aal1" };
  const nope = await rpc("symi_reopen_register", { p_session: after.id }, other);
  check("Evia Portal: only the class’s tutor can open it again", nope.status === 400 && /isn’t yours/.test(nope.body.message), JSON.stringify(nope));
  check("No page errors", errors.length === 0, errors.join(" | "));
} catch (e) { check("The test ran to the end", false, e.stack); }
await finish();

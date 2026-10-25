/* Messages between the people around an apprentice, end to end: who can message whom, sending and reading, the
   unread count, removing and reporting (never deleting), the college's view for admins, and the notification to the
   other person's phone. Then the same in the apps: Evia, Milos, Symi, Paros and Evia Portal each show the message
   icon at the top, with the unread count, and a conversation opens and sends from it.
   Run: node tests/e2e/messages.e2e.mjs   (needs Postgres 16) */
import { check, q, rpc, site, TEE, LEE, EM, errors, app, signIn, finish, session } from "./harness.mjs";
const ORG = "0e2e0000-0000-0000-0000-000000000001";
const id = (n) => "0e2e0000-0000-0000-0000-0000000002" + n;
const TEE_M = "0e2e0000-0000-0000-0000-0000000000b1", LEE_M = "0e2e0000-0000-0000-0000-0000000000b2", EM_M = "0e2e0000-0000-0000-0000-0000000000b3";
/* Ada runs the college; Sam is an assessor who doesn't work with Lee; Kim is another learner (not on Tee's list). */
const ADA = id("a0"), SAM = id("a1"), KIM = id("a2"), ADA_M = id("b0"), SAM_M = id("b1"), KIM_M = id("b2");
await q(`insert into auth.users values ('${ADA}', 'ada@e2e.test'), ('${SAM}', 'sam@e2e.test'), ('${KIM}', 'kim@e2e.test');
  insert into public.profiles (id, display_name) values ('${ADA}', 'Ada Min'), ('${SAM}', 'Sam Assessor'), ('${KIM}', 'Kim Other');
  insert into public.organisation_members (id, organisation_id, user_id) values ('${ADA_M}', '${ORG}', '${ADA}'), ('${SAM_M}', '${ORG}', '${SAM}'), ('${KIM_M}', '${ORG}', '${KIM}');
  insert into public.organisation_member_roles select '${ADA_M}', id from public.roles where code = 'admin';
  insert into public.organisation_member_roles select '${SAM_M}', id from public.roles where code = 'assessor';
  insert into public.organisation_member_roles select '${KIM_M}', id from public.roles where code = 'learner';
  insert into public.learners (id, organisation_id, organisation_member_id) values ('${id("c2")}', '${ORG}', '${KIM_M}');
  insert into public.enrolments (id, organisation_id, learner_id, course_id, start_date, end_date, employer_name, planned_otj_hours)
    values ('${id("e2")}', '${ORG}', '${id("c2")}', '0e2e0000-0000-0000-0000-0000000000d1', current_date - 50, current_date + 400, 'Other Ltd', 400);`);
const lee = { sub: LEE, aal: "aal1" }, tee = { sub: TEE, aal: "aal2" }, teeNoCode = { sub: TEE, aal: "aal1" }, em = { sub: EM, aal: "aal2" },
  ada = { sub: ADA, aal: "aal2" }, sam = { sub: SAM, aal: "aal2" }, kim = { sub: KIM, aal: "aal1" };
const names = (r) => (r.body || []).map((x) => x.name).sort().join(", ");
try {
  /* ---------- Who can message whom ---------- */
  const leeC = await rpc("msg_contacts", {}, lee), teeC = await rpc("msg_contacts", {}, tee), emC = await rpc("msg_contacts", {}, em),
    adaC = await rpc("msg_contacts", {}, ada), samC = await rpc("msg_contacts", {}, sam), kimC = await rpc("msg_contacts", {}, kim), noCode = await rpc("msg_contacts", {}, teeNoCode);
  check("A learner can message the people who work with them: their tutor and employer, not other learners or staff who don't",
    names(leeC) === "Em Ployer, Tee Rainer" && (leeC.body.find((x) => x.name === "Tee Rainer") || {}).about === "Your tutor", JSON.stringify(leeC.body));
  check("Staff can message the learners they work with and the rest of the college's staff; an admin, any learner",
    names(teeC) === "Ada Min, Em Ployer, Lee Erna, Sam Assessor" && names(adaC) === "Em Ployer, Kim Other, Lee Erna, Sam Assessor, Tee Rainer" && !names(samC).includes("Lee"),
    JSON.stringify({ tee: names(teeC), ada: names(adaC), sam: names(samC) }));
  check("An employer can message their own apprentice and the college staff who work with them (and admins), nobody else",
    names(emC) === "Ada Min, Lee Erna, Tee Rainer" && names(kimC) === "", JSON.stringify({ em: names(emC), kim: names(kimC) }));
  check("Staff need their authenticator code for messages, as for everything else", (noCode.body || []).length === 0, JSON.stringify(noCode.body));

  /* ---------- Sending, reading, unread ---------- */
  const s1 = await rpc("msg_send", { p_with: TEE_M, p_body: "  Running 10 minutes late, sorry  " }, lee);
  const s2 = await rpc("msg_send", { p_with: TEE_M, p_body: "Bus broke down" }, lee);
  const notTo = await rpc("msg_send", { p_with: KIM_M, p_body: "hi" }, lee), notSam = await rpc("msg_send", { p_with: LEE_M, p_body: "hi" }, sam);
  const blank = await rpc("msg_send", { p_with: TEE_M, p_body: "   " }, lee), long = await rpc("msg_send", { p_with: TEE_M, p_body: "x".repeat(2001) }, lee);
  check("A learner messages their tutor (trimmed); messages to people they can't message, blank ones and very long ones are refused in plain words",
    s1.status === 200 && s1.body.body === "Running 10 minutes late, sorry" && s2.status === 200 && notTo.status >= 400 && /can’t message/.test(notTo.body.message) &&
    notSam.status >= 400 && /Type a message/.test(blank.body.message) && /too long/.test(long.body.message), JSON.stringify({ notTo: notTo.body, blank: blank.body, long: long.body }));
  const unread1 = (await rpc("msg_unread", {}, tee)).body, threads = (await rpc("msg_threads", {}, tee)).body;
  check("The tutor has 2 unread, in one conversation with Lee showing the last message",
    unread1 === 2 && threads.length === 1 && threads[0].name === "Lee Erna" && threads[0].unread === 2 && threads[0].last.body === "Bus broke down" && !threads[0].last.mine && threads[0].about === "Apprentice at Ployer Builders",
    JSON.stringify({ unread1, threads }));
  const open = (await rpc("msg_open", { p_with: LEE_M }, tee)).body, unread2 = (await rpc("msg_unread", {}, tee)).body;
  await rpc("msg_send", { p_with: LEE_M, p_body: "No problem, see you soon" }, tee);
  const leeOpen = (await rpc("msg_open", { p_with: TEE_M }, lee)).body;
  check("Opening the conversation shows the messages in order and marks them read; the reply arrives for Lee, who sees the tutor has read theirs",
    open.messages.map((m) => m.body).join("|") === "Running 10 minutes late, sorry|Bus broke down" && !open.messages[0].mine && unread2 === 0 &&
    leeOpen.messages.length === 3 && leeOpen.messages[2].body === "No problem, see you soon" && !leeOpen.messages[2].mine && leeOpen.messages[0].mine && !!leeOpen.their_read_at,
    JSON.stringify({ open, leeOpen }));
  const note = await q(`select notification_type, title, body, data from public.notifications where recipient_user_id = '${TEE}' and notification_type = 'message' order by created_at`);
  check("Each message tells the other person's phone who it's from, but not what it says (it could show on a lock screen)",
    note.length === 2 && note[0].title === "Message from Lee Erna" && !/late/.test(note[0].body) && note[0].data.app === "milos" && note[0].data.open === "messages",
    JSON.stringify(note));

  /* ---------- Removing and reporting: never deleted ---------- */
  const mine = leeOpen.messages[1], theirs = leeOpen.messages[2];
  const notMine = await rpc("msg_remove", { p_message: theirs.id }, lee), removed = await rpc("msg_remove", { p_message: mine.id }, lee);
  const teeSees = (await rpc("msg_open", { p_with: LEE_M }, tee)).body.messages.find((m) => m.id === mine.id);
  const still = await q(`select body, removed_at from public.messages where id = '${mine.id}'`);
  check("Someone can remove their own message (both see “removed”, the words are kept for the college), not someone else's",
    notMine.status >= 400 && removed.status === 200 && teeSees.removed && teeSees.body == null && still[0].body === "Bus broke down" && !!still[0].removed_at, JSON.stringify({ notMine: notMine.body, teeSees, still }));
  const rep = await rpc("msg_report", { p_message: theirs.id, p_reason: "Testing the report button" }, lee), outsider = await rpc("msg_report", { p_message: theirs.id }, sam);
  const adaNote = await q(`select title from public.notifications where recipient_user_id = '${ADA}' and notification_type = 'message_reported'`);
  check("Either person can report a message; the college's admins are told; nobody else can report it", rep.status === 200 && outsider.status >= 400 && adaNote.length === 1, JSON.stringify({ rep: rep.body, outsider: outsider.body, adaNote }));
  const college = await rpc("msg_college", { p_org: ORG }, ada), notAdmin = await rpc("msg_college", { p_org: ORG }, tee), adaNoCode = await rpc("msg_college", { p_org: ORG }, { sub: ADA, aal: "aal1" });
  const full = (await rpc("msg_college_thread", { p_thread: college.body[0].id }, ada)).body;
  check("The college's admins (with their code) see every conversation, reported first, in full: removed words and who reported what",
    college.status === 200 && college.body.length === 1 && college.body[0].reported === 1 && notAdmin.status >= 400 && adaNoCode.status >= 400 &&
    full.messages.length === 3 && full.messages[1].body === "Bus broke down" && !!full.messages[1].removed_at && full.messages[2].reported_by === "Lee Erna" && full.messages[2].report_reason === "Testing the report button",
    JSON.stringify({ college: college.body, full }));
  const touch = await q(`select has_table_privilege('authenticated', 'public.messages', 'select') s, has_table_privilege('authenticated', 'public.message_threads', 'select') t`);
  check("Nobody can read the message tables directly, only through these actions", !touch[0].s && !touch[0].t, JSON.stringify(touch));

  /* ---------- Group messages ---------- */
  const g1 = await rpc("msg_send_many", { p_with: [LEE_M, EM_M, KIM_M], p_body: " Class moved to room 4 tomorrow " }, tee);
  const gLee = await rpc("msg_send_many", { p_with: [TEE_M, EM_M], p_body: "hi all" }, lee), gBlank = await rpc("msg_send_many", { p_with: [LEE_M], p_body: " " }, tee);
  const gRows = await q(`select m.body, m.group_id from public.messages m where m.group_id is not null`);
  const emSees = (await rpc("msg_threads", {}, em)).body.find((t) => t.name === "Tee Rainer");
  check("Group message: staff send one message to the people they pick, each in their own conversation; people they can't message are skipped; learners can't send groups",
    g1.status === 200 && g1.body.sent === 2 && g1.body.skipped === 1 && gRows.length === 2 && new Set(gRows.map((r) => r.group_id)).size === 1 && gRows[0].body === "Class moved to room 4 tomorrow" &&
    emSees && emSees.last.body === "Class moved to room 4 tomorrow" && gLee.status >= 400 && /staff and employers/.test(gLee.body.message) && gBlank.status >= 400,
    JSON.stringify({ g1: g1.body, gLee: gLee.body, gRows, emSees }));

  /* ---------- A learner who has left can't be messaged ---------- */
  await q(`update public.enrolments set status = 'withdrawn' where id = '${id("e2")}'`);
  const left = await rpc("msg_send", { p_with: KIM_M, p_body: "Hi Kim" }, ada);
  check("A learner who is no longer on a course can't be messaged", left.status >= 400, JSON.stringify(left.body));

  /* ---------- In the apps ---------- */
  await q(`update public.enrolments set status = 'active' where id = '${id("e2")}'`);
  const shot = (pg, n) => pg.screenshot({ path: new URL("../shots/" + n + ".png", import.meta.url).pathname }).catch(() => {});
  /* Paros (Em, the employer): the icon under the initials; a new message to their apprentice. */
  const par = await app({ width: 390, height: 844 });
  await par.page.goto(site + "/apps/paros/"); await signIn(par.page, "em@e2e.test");
  await par.page.waitForSelector("#nm-btn:not([hidden])", { timeout: 15000 });
  const parPlace = await par.page.evaluate(() => { const b = document.getElementById("nm-btn"), me = document.getElementById("meBtn"), r = b.getBoundingClientRect(), m = me.getBoundingClientRect();
    return { stacked: b.parentElement === me.parentElement && b.parentElement.classList.contains("nm-stack"), below: r.top >= m.bottom - 1 && Math.abs((r.left + r.right) / 2 - (m.left + m.right) / 2) < 3 }; });
  await shot(par.page, "msg-paros-home");
  await par.page.click("#nm-btn"); await par.page.waitForSelector(".nm-panel .nm-new");
  await par.page.click(".nm-new"); await par.page.waitForSelector('.nm-people [data-with="' + LEE_M + '"]');
  const parPeople = await par.page.$$eval(".nm-people .nm-row b", (x) => x.map((y) => y.textContent).sort().join(", "));
  await par.page.click('.nm-people [data-with="' + LEE_M + '"]'); await par.page.waitForSelector(".nm-compose textarea");
  await par.page.fill(".nm-compose textarea", "Great work on the wall today"); await par.page.click(".nm-send");
  await par.page.waitForFunction(() => [...document.querySelectorAll(".nm-msg.nm-mine")].some((m) => /Great work/.test(m.textContent) && !m.classList.contains("nm-sending")), null, { timeout: 10000 });
  await shot(par.page, "msg-paros-chat");
  /* The typing box stays put while the conversation checks for new messages (every 5 seconds). */
  await par.page.focus(".nm-compose textarea"); await par.page.keyboard.type("Half-typed");
  await par.page.evaluate(() => { window.__ta = document.querySelector(".nm-compose textarea"); });
  await par.page.waitForTimeout(6500);
  const steady = await par.page.evaluate(() => { const t = document.querySelector(".nm-compose textarea"); return { same: t === window.__ta, focused: document.activeElement === t, value: t.value, open: !!document.querySelector(".nm-overlay") }; });
  check("Paros: while typing, the conversation stays open and the typing box keeps its words and the keyboard (it isn't redrawn)",
    steady.same && steady.focused && steady.value === "Half-typed" && steady.open, JSON.stringify(steady));
  await par.page.fill(".nm-compose textarea", "");
  /* A group message from the employer to the college staff. */
  await par.page.click(".nm-panel [data-nm=back]"); await par.page.waitForSelector('[data-nm="group"]'); await par.page.click('[data-nm="group"]');
  await par.page.waitForSelector(".nm-pick"); await par.page.click('[data-all="staff"]');
  const gPicked = await par.page.$$eval(".nm-pick input:checked", (x) => x.length);
  await par.page.fill(".nm-gcompose textarea", "Site closed Friday"); const gWho = await par.page.textContent(".nm-gwho");
  await shot(par.page, "msg-paros-group");
  await par.page.click(".nm-gcompose .nm-send"); await par.page.waitForSelector(".nm-done", { timeout: 10000 });
  const gDone = await par.page.textContent(".nm-done");
  check("Paros: Group message picks all the staff in one tap, says who it's going to, sends, and says it went to 2 people",
    gPicked === 2 && /To 2 people/.test(gWho) && /Sent to 2 people/.test(gDone), JSON.stringify({ gPicked, gWho, gDone }));
  check("Paros: the message icon sits just below the employer's initials; New message lists their apprentice and the college staff who work with them; a message sends",
    parPlace.stacked && parPlace.below && parPeople === "Ada Min, Lee Erna, Tee Rainer", JSON.stringify({ parPlace, parPeople }));

  /* Evia (Lee): the icon under the profile button with the unread count, Evia's list mentions it, and Lee replies. */
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
  await ev.page.evaluate(() => { document.getElementById("app").classList.remove("welcome-app-hidden"); const w = document.getElementById("welcome-screen"); if (w) w.remove(); if (typeof nav === "function") nav("course"); });
  /* No icon in the corner: the College tab carries the unread number, and Messages is at the top of it. */
  /* (The tester: Messages is a button in every page's header, with the unread number.) */
  await ev.page.waitForFunction(() => { const b = document.querySelector("#th-msg em"); return b && !b.hidden && b.textContent === "2"; }, null, { timeout: 15000 });
  const evPlace = await ev.page.evaluate(() => ({ noIcon: !document.querySelector("#nm-btn:not([hidden])") || !document.getElementById("nm-btn").isConnected,
    tab: document.getElementById("nav-college").textContent === "Time", todo: (window.eviaTodo.list() || []).some((t) => /new message/.test(t.title)) }));
  const evRow = await ev.page.getAttribute("#th-msg", "aria-label");
  await ev.page.waitForTimeout(800); await shot(ev.page, "msg-evia-college");
  await ev.page.click("#th-msg"); await ev.page.waitForSelector(".nm-row.nm-unread");
  const evRows = await ev.page.$$eval(".nm-row", (x) => x.map((y) => y.textContent.replace(/\s+/g, " ").trim()));
  await ev.page.click(".nm-row.nm-unread:has-text(\"Em Ployer\")"); await ev.page.waitForSelector(".nm-compose textarea");
  await ev.page.fill(".nm-compose textarea", "Thanks Em!"); await ev.page.click(".nm-send");
  await ev.page.waitForFunction(() => [...document.querySelectorAll(".nm-msg.nm-mine")].some((m) => /Thanks Em/.test(m.textContent) && !m.classList.contains("nm-sending")), null, { timeout: 10000 });
  await shot(ev.page, "msg-evia-chat");
  /* Tapping a message of theirs offers a report; tapping mine, removing it. */
  await ev.page.click(".nm-msg.nm-theirs"); const offer = await ev.page.textContent(".nm-menu");
  await ev.page.click('[data-act="cancel"]');
  await ev.page.click(".nm-panel [data-nm=close]"); await ev.page.waitForTimeout(400);
  const evAfter = await ev.page.evaluate(() => (document.querySelector("#th-msg em") || {}).textContent === "1"); /* the tutor's group message is still unread */
  check("Evia: no message icon in the corner; the College tab shows the unread count, Messages at the top of it says how many are new, and Evia's list says there's a new message",
    evPlace.noIcon && evPlace.tab && evPlace.todo && /Messages, 2 new/.test(evRow || ""), JSON.stringify({ evPlace, evRow }));
  check("Evia: the conversation with the employer opens from the list, the learner replies, can report the employer's message, and the count goes down",
    evRows.some((r) => /Em Ployer/.test(r) && /Great work/.test(r)) && /Report to the college/.test(offer) && evAfter, JSON.stringify({ evRows, offer, evAfter }));

  /* Symi (Tee): the icon next to the profile button once signed in to Evia Portal; Lee's conversation is there. */
  const sy = await app({ width: 1280, height: 860 });
  await sy.page.goto(site + "/apps/symi/update.json");
  await sy.page.evaluate(() => { localStorage.clear(); localStorage.setItem("symi-last-seen-release-v1", "9.9.9"); });
  await sy.page.goto(site + "/apps/symi/"); await sy.page.waitForTimeout(1200);
  const syBefore = await sy.page.evaluate(() => { const b = document.getElementById("nm-btn"); return !b || b.hidden; });
  await sy.page.evaluate(() => window.SamosApp.openRegisters());
  await sy.page.evaluate(() => document.getElementById("nisiaButton").click()); await signIn(sy.page, "tee@e2e.test", ".sn-auth ");
  await sy.page.waitForSelector("#nm-btn:not([hidden])", { timeout: 15000 });
  const syPlace = await sy.page.evaluate(() => [document.getElementById("profileButton"), document.querySelector(".se-me")].includes(document.getElementById("nm-btn").nextElementSibling));
  await sy.page.click("#nm-btn"); await sy.page.waitForSelector(".nm-row");
  const syRows = await sy.page.$$eval(".nm-row b", (x) => x.map((y) => y.textContent));
  await shot(sy.page, "msg-symi-list");
  check("Symi: no message icon until the tutor signs in to Evia Portal; then it sits beside the profile button, and Lee's conversation is in the list",
    syBefore && syPlace && syRows.includes("Lee Erna"), JSON.stringify({ syBefore, syPlace, syRows }));

  /* The portal's college overview (not part of this test Evia Portal): stand-ins with the live shapes. */
  await q(`create or replace function public.nisia_college_summary(p_org uuid) returns jsonb language sql as $$ select jsonb_build_object('name', o.name, 'status', o.status, 'seats', o.seats, 'seats_used', 2, 'licence_ends', null, 'safeguarding', jsonb_build_object('name', null, 'phone', null, 'email', null)) from public.organisations o where o.id = p_org $$;
    create or replace function public.nisia_college_staff(p_org uuid) returns table (member_id uuid, name text, email text, roles jsonb, active boolean, learners integer) language sql as $$ select null::uuid, null::text, null::text, null::jsonb, null::boolean, null::int where false $$;
    create or replace function public.nisia_college_activity(p_org uuid) returns table (week_start date, evidence integer, hours numeric) language sql as $$ select null::date, null::int, null::numeric where false $$;
    grant execute on function public.nisia_college_summary(uuid), public.nisia_college_staff(uuid), public.nisia_college_activity(uuid) to authenticated;`);
  /* Evia Portal (Ada, admin): Messages in the menu; their own conversations and, for safeguarding, everyone's. */
  const po = await app({ width: 1280, height: 860 });
  await po.page.goto(site + "/apps/nisia-web/"); await signIn(po.page, "ada@e2e.test");
  await po.page.waitForSelector('[data-go="messages"]', { timeout: 15000 }); await po.page.click('[data-go="messages"]');
  await po.page.waitForSelector("tr[data-col]");
  const colRows = await po.page.$$eval("tr[data-col]", (x) => x.map((y) => y.textContent.replace(/\s+/g, " ").trim()));
  await po.page.click("tr[data-col]"); await po.page.waitForSelector(".msg-log");
  const log = await po.page.textContent(".msg-log");
  await shot(po.page, "msg-portal-college");
  check("Evia Portal: Messages is in the menu; an admin sees every conversation, the reported one first, and reads it in full (removed and reported messages marked)",
    colRows.length === 4 && /1 reported/.test(colRows[0]) && /Removed by the sender/.test(log) && /Reported by Lee Erna/.test(log) && /Bus broke down/.test(log), JSON.stringify({ colRows, log: log.slice(0, 400) }));
  check("No script errors in the apps", !errors.length, errors.join(" | "));
} catch (e) { check("Messages ran without crashing", false, e.stack || e.message); }
await finish();

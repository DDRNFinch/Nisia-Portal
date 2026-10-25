/* The Friday summaries, the gentle nudges and the monthly behaviours prompt (run-2026-10-25-weekly-nudges.sql): who
   gets what, worded right, in the right app, and never twice.   Run: node tests/e2e/nudges.e2e.mjs   (needs Postgres 16) */
import fs from "node:fs";
import { check, q, root, TEE, LEE, EM, ENROL, finish } from "./harness.mjs";

const ORG = "0e2e0000-0000-0000-0000-000000000001", COURSE = "0e2e0000-0000-0000-0000-0000000000d1", LEARNER = "0e2e0000-0000-0000-0000-0000000000b2";
try {
  /* What Evia Portal already has from push-notifications.sql (no pg_cron here). */
  await q(`create table if not exists public.device_tokens (id uuid primary key default gen_random_uuid(), user_id uuid, platform text, token text unique, app text check (app in ('evia', 'milos')), subscription jsonb);
    alter table public.notifications add column if not exists pushed_at timestamptz, add column if not exists push_status text;
    create unique index if not exists notifications_reminder_key on public.notifications ((data ->> 'key')) where data ? 'key';
    create table if not exists public.targets (id uuid primary key default gen_random_uuid(), organisation_id uuid, enrolment_id uuid, title text, due_date date, status text default 'open');
    create or replace function private.course_reminders() returns int language sql as $$ select 0 $$;`);
  await q(fs.readFileSync(root + "/services/supabase/run-2026-10-25-weekly-nudges.sql", "utf8"));
  check("Paros phones can take notifications now", !!(await q(`insert into public.device_tokens (user_id, platform, token, app) values ($1, 'web', 'x-paros', 'paros') returning id`, [EM])).length);

  /* A learner who started 10 weeks ago, with old hours their employer hasn't confirmed and no evidence for 3 weeks. */
  const fri = (await q(`select (date_trunc('week', current_date) + interval '4 days')::date d`))[0].d;
  const day = (n) => new Date(fri.getTime() + n * 864e5).toISOString().slice(0, 10);
  await q(`update public.enrolments set start_date = $2::date - 70, end_date = $2::date + 300, planned_otj_hours = 300, status = 'active' where id = $1`, [ENROL, day(0)]);
  await q(`delete from public.reviews where enrolment_id = $1`, [ENROL]);
  await q(`insert into public.otj_entries (organisation_id, enrolment_id, created_by_member_id, activity_date, activity_type, description, hours)
    values ($1, $2, $3, $4::date - 20, 'training', 'Old toolbox talk', 2), ($1, $2, $3, $4::date - 2, 'training', 'Scaffold talk', 1.5)`, [ORG, ENROL, LEARNER, day(0)]);
  await q(`insert into public.evidence (organisation_id, enrolment_id, course_id, created_by_member_id, evidence_type, title, created_at, source_metadata)
    values ($1, $2, $3, $4, 'photo', 'Old wall', $5::date - 30, '{"unit":"Cavity walls"}')`, [ORG, ENROL, COURSE, LEARNER, day(0)]);
  const sent = async () => q(`select recipient_user_id u, notification_type t, title, body, data from public.notifications where data ? 'key' order by created_at, notification_type`);

  /* A Thursday: the daily nudges only. */
  await q(`select private.course_reminders($1::date)`, [day(-1)]);
  let N = await sent(), of = (t) => N.filter((x) => x.t === t);
  check("Employer: hours waiting over 2 weeks, in Paros (the recent ones don't count)", of("hours_waiting").length === 1 && of("hours_waiting")[0].u === EM && of("hours_waiting")[0].data.app === "paros" &&
    /^1 entry from .+ has been waiting over 2 weeks/.test(of("hours_waiting")[0].body), JSON.stringify(of("hours_waiting")));
  check("Learner: nothing new for 3 weeks, in Evia", of("evidence_quiet").length === 1 && of("evidence_quiet")[0].u === LEE && of("evidence_quiet")[0].data.app === "evia", JSON.stringify(of("evidence_quiet")));
  check("No Friday summaries on a Thursday", !of("week_summary").length && !of("staff_week").length && !of("employer_week").length, JSON.stringify(N.map((x) => x.t)));

  /* The Friday: the summaries; the nudges aren't sent again the same week. */
  await q(`insert into public.evidence (organisation_id, enrolment_id, course_id, created_by_member_id, evidence_type, title, created_at, source_metadata)
    values ($1, $2, $3, $4, 'photo', 'New wall', $5::date - 1, '{"unit":"Mixing mortar"}')`, [ORG, ENROL, COURSE, LEARNER, day(0)]);
  await q(`select private.course_reminders($1::date)`, [day(0)]);
  await q(`select private.course_reminders($1::date)`, [day(0)]);
  N = await sent();
  const ws = of("week_summary");
  check("Learner, Friday: Your week (evidence, hours against this week's share), in Evia, once", ws.length === 1 && ws[0].u === LEE && /1 piece of evidence\./.test(ws[0].body) && /1\.5 of your \d/.test(ws[0].body) && ws[0].data.app === "evia" && ws[0].data.open === "hours", JSON.stringify(ws));
  check("…and the old Friday hours message isn't sent as well", !of("hours_week").length);
  const sw = of("staff_week");
  check("Assessor, Friday: who needs attention (evidence to assess), in Milos", sw.length === 1 && sw[0].u === TEE && /2 pieces of evidence to assess\./.test(sw[0].body) && sw[0].data.app === "milos", JSON.stringify(sw));
  const ew = of("employer_week");
  check("Employer, Friday: their apprentices' week (hours logged, entries to confirm), in Paros", ew.length === 1 && ew[0].u === EM && /1\.5 hours of learning logged\./.test(ew[0].body) && /2 entries waiting for you to confirm\./.test(ew[0].body) && ew[0].data.open === "hours", JSON.stringify(ew));
  check("Nudges aren't repeated in the same week", of("hours_waiting").length === 1 && of("evidence_quiet").length === 1, JSON.stringify(N.map((x) => x.t)));

  /* The review in 7 days: the employer hears too. Due = start + 84, so start it 77 days before the day. */
  await q(`update public.enrolments set start_date = $2::date - 77 where id = $1`, [ENROL, day(3)]);
  await q(`select private.course_reminders($1::date)`, [day(3)]);
  N = await sent();
  const re = of("review_due_employer");
  check("Employer: their apprentice's review is next week, in Paros (the learner hears as before)", re.length === 1 && re[0].u === EM && /progress review is next week/.test(re[0].title) && re[0].data.app === "paros" && of("review_due").some((x) => x.u === LEE), JSON.stringify(re));

  /* The first Monday of a month: rate behaviours, unless they did in the last 4 weeks. */
  const mon = (await q(`select d::date from generate_series(date_trunc('month', current_date) + interval '1 month', date_trunc('month', current_date) + interval '1 month 6 days', interval '1 day') d where extract(isodow from d) = 1`))[0].d;
  const m = mon.toISOString().slice(0, 10);
  await q(`update public.enrolments set start_date = $2::date - 40 where id = $1`, [ENROL, m]);
  await q(`select private.course_reminders($1::date)`, [m]);
  N = await sent();
  const bd = of("behaviours_due");
  check("Employer, first Monday of the month: rate how they're doing at work, in Paros", bd.length === 1 && bd[0].u === EM && /this month/.test(bd[0].body) && bd[0].data.open === "feedback" && bd[0].data.app === "paros", JSON.stringify(bd));
  await q(`delete from public.notifications where notification_type = 'behaviours_due'`);
  await q(`insert into public.behaviour_ratings (organisation_id, enrolment_id, rater_member_id, ratings, created_at) values ($1, $2, '0e2e0000-0000-0000-0000-0000000000b3', '{}'::jsonb, $3::date - 3)`, [ORG, ENROL, m]);
  await q(`select private.course_reminders($1::date)`, [m]);
  check("…but not if they rated them in the last 4 weeks", !(await sent()).some((x) => x.t === "behaviours_due"));
  check("Called with no day (as pg_cron does), it runs for today", typeof (await q(`select private.course_reminders() n`))[0].n === "number");
  if (process.env.SHOW) for (const x of await sent()) console.log("  [" + x.data.app + "] " + x.title + " — " + x.body);
} catch (e) { check("The test ran to the end", false, e.stack); }
await finish();

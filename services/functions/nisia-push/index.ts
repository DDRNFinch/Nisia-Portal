// nisia-push: sends what's waiting in notifications to people's phones, as Web Push. pg_cron calls it every 5 minutes
// when something is waiting (with the key from the vault); nobody else can.
//   Course things only: evidence signed off or sent back, new targets, reviews, observations and witness testimony
//   (learners, in Evia); new evidence to assess (assessors and tutors, in Milos); and the dated reminders that
//   private.course_reminders() writes (reviews and targets due, Friday learning hours, Monday reviews to book).
//   Bursts are grouped into one message ("3 pieces of evidence from Sam"). Nothing between 9pm and 7:30am (it waits
//   until the morning), nothing to staff at the weekend, and at most 4 a day to anyone (the rest stay in the app).
import { CORS, reply, fail, service } from "../_shared/nisia.ts";
import { sendPush, type Vapid } from "../_shared/webpush.ts";

type Row = {
  id: string; recipient_user_id: string; notification_type: string; title: string; body: string; data: Record<string, string>;
  created_at: string; unit: string | null; enrolment_id: string | null; decision: string | null; target_title: string | null;
  learner_name: string; sent_today: number;
};
type Message = { title: string; body: string; tag: string; open: string; app: "evia" | "milos" };

const STAFF = new Set(["evidence_submitted", "reviews_due", "witness_testimony_staff", "behaviour_rated_staff"]);
const DAILY_CAP = 4;
const plural = (n: number, one: string, many = one + "s") => n + " " + (n === 1 ? one : many);
const list = (xs: (string | null)[]) => {
  const u = [...new Set(xs.filter(Boolean) as string[])];
  return u.length <= 2 ? u.join(" and ") : u.slice(0, 2).join(", ") + " and " + plural(u.length - 2, "more", "more");
};

/* London time, for quiet hours and weekends. */
function london(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
    .formatToParts(now).map((x) => [x.type, x.value]));
  const mins = Number(p.hour) * 60 + Number(p.minute);
  return { quiet: mins < 7 * 60 + 30 || mins >= 21 * 60, weekend: p.weekday === "Sat" || p.weekday === "Sun" };
}

/* The words for one group of notifications (same person, same kind, same learner or decision). */
export function word(rows: Row[]): Message {
  const r = rows[0], n = rows.length, t = r.notification_type, app = STAFF.has(t) ? "milos" : "evia";
  const units = list(rows.map((x) => x.unit));
  switch (t) {
    case "evidence_submitted":
      return { app, open: "assess", tag: "evidence-" + (r.enrolment_id || "x"),
        title: r.learner_name + " added " + (n === 1 ? "new evidence" : plural(n, "piece") + " of evidence"),
        body: (units ? units + ". " : "") + "Ready to assess in Milos." };
    case "evidence_assessed":
      if (r.decision === "accepted") return { app, open: "feedback", tag: "signed-off",
        title: n === 1 ? "Signed off: " + (r.unit || "your evidence") : plural(n, "piece") + " of evidence signed off",
        body: n === 1 ? "Your assessor accepted it. Nice work." : units + ". Nice work." };
      if (r.decision === "changes_required") return { app, open: "feedback", tag: "more-needed",
        title: n === 1 ? (r.unit || "Your evidence") + ": a bit more needed" : "Your assessor wants a bit more on " + plural(n, "piece") + " of evidence",
        body: (n === 1 ? "" : units + ". ") + "Open Evia to see what to add." };
      return { app, open: "feedback", tag: "not-accepted",
        title: n === 1 ? (r.unit || "Your evidence") + " wasn’t accepted" : plural(n, "piece") + " of evidence weren’t accepted",
        body: "Open Evia to read your assessor’s feedback." };
    case "target_created":
      return { app, open: "targets", tag: "targets",
        title: n === 1 ? "New target from your assessor" : plural(n, "new target"),
        body: n === 1 ? (r.target_title || "Open Evia to see it.") : list(rows.map((x) => x.target_title)) + "." };
    case "review_added":
      return { app, open: "targets", tag: "review", title: "Your progress review is in", body: "See how you’re doing and what’s next in Evia." };
    case "observation_added":
      return { app, open: "feedback", tag: "observation", title: "Your assessor added an observation", body: "It’s in your supporting evidence." };
    case "witness_testimony":
      return { app, open: "feedback", tag: "witness", title: "Witness testimony added", body: "It counts towards your units." };
    default:
      /* The reminders are worded when they're made. */
      return { app, open: r.data?.open || "home", tag: t, title: r.title, body: r.body };
  }
}

/* Same person, same kind; evidence by learner, assessments by decision. Reminders are never merged. */
export function group(rows: Row[]) {
  const g = new Map<string, Row[]>();
  for (const r of rows) {
    const t = r.notification_type;
    const k = [r.recipient_user_id, t, t === "evidence_submitted" ? r.enrolment_id : t === "evidence_assessed" ? r.decision : r.data?.key ? r.id : ""].join("|");
    g.set(k, [...(g.get(k) || []), r]);
  }
  return [...g.values()];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("POST only", 405);
  const admin = service();
  const { data: cfg, error: ce } = await admin.rpc("push_config");
  if (ce || !cfg?.vapid || !cfg?.cron) return fail("Not set up", 500);
  if (req.headers.get("x-push-key") !== cfg.cron) return fail("Not allowed", 403);
  const vapid = cfg.vapid as Vapid;

  const when = london();
  if (when.quiet) return reply({ held: "quiet hours" });
  const { data: pending, error } = await admin.rpc("push_pending");
  if (error) return fail(error.message, 500);
  const rows = (pending || []) as Row[];
  if (!rows.length) return reply({ sent: 0 });

  const users = [...new Set(rows.map((r) => r.recipient_user_id))];
  const { data: devices } = await admin.from("device_tokens").select("id, user_id, app, subscription").in("user_id", users).not("subscription", "is", null);
  const sentToday = new Map(rows.map((r) => [r.recipient_user_id, r.sent_today]));
  const done: Record<string, string[]> = {};
  const mark = (status: string, ids: string[]) => { (done[status] ||= []).push(...ids); };
  let sent = 0;

  for (const g of group(rows)) {
    const m = word(g), who = g[0].recipient_user_id, ids = g.map((r) => r.id);
    if (m.app === "milos" && when.weekend) continue;            // waits for Monday
    const phones = (devices || []).filter((d) => d.user_id === who && d.app === m.app);
    if (!phones.length) { mark("no_device", ids); continue; }
    if ((sentToday.get(who) || 0) >= DAILY_CAP) { mark("capped", ids); continue; }
    let ok = false;
    for (const d of phones) {
      try {
        const res = await sendPush(d.subscription, { title: m.title, body: m.body, tag: m.tag, open: m.open }, vapid, { topic: m.tag, urgency: "normal" });
        if (res.ok) ok = true;
        else if (res.gone) await admin.from("device_tokens").delete().eq("id", d.id);
        else console.warn("nisia-push", res.status, res.text);
      } catch (e) { console.warn("nisia-push", (e as Error).message); }
    }
    if (ok) { sent++; sentToday.set(who, (sentToday.get(who) || 0) + 1); mark("sent", ids.slice(0, 1)); mark("grouped", ids.slice(1)); }
    else mark("failed", ids);
  }
  const at = new Date().toISOString();
  for (const [status, ids] of Object.entries(done)) await admin.from("notifications").update({ pushed_at: at, push_status: status }).in("id", ids);
  return reply({ sent, ...Object.fromEntries(Object.entries(done).map(([k, v]) => [k, v.length])) });
});

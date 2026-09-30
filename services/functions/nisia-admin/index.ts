// nisia-admin: actions for signed-in staff that need more than row-level security allows (creating sign-ins,
// invites and pairing codes). Every action checks the caller's own permission first, with their own token
// (so the college rules and the authenticator-app requirement apply), and only then uses the service client.
//   Master admin:  create_college, update_college, invite_college_admin
//   College admin: invite_staff, add_learner, set_staff_active, assign_staff, update_staff, update_learner
//   Staff with access to the learner (and the college admin): pairing_code
//   Master admin, for testing: test_college (makes or tops up the test college), test_invite (a test account's invite)
import { CORS, reply, fail, service, asCaller, makeCode, sha256, createInvite, roleIds, findUserByEmail } from "../_shared/nisia.ts";

const STAFF_ROLES = ["admin", "assessor", "tutor", "quality", "employer"];

/* The master admin's test college: fake staff for every role and a fake learner, to try each app as it's really used.
   The staff are ordinary accounts (a password and an authenticator, set up from an invite); their emails are the
   master admin's own with a +tag, so anything Nisia sends them arrives in the master admin's inbox. */
const TEST_NAMES: Record<string, string> = { admin: "Test College Admin", assessor: "Test Assessor", tutor: "Test Tutor", quality: "Test Quality", employer: "Test Employer", learner: "Test Learner" };
const testEmail = (mine: string, role: string) => { const [local, domain] = mine.toLowerCase().split("@"); return local.replace(/\+.*$/, "") + "+nisia-test-" + role + "@" + domain; };
async function testCollege(admin: any, mine: string, uid: string) {
  let { data: o } = await admin.from("organisations").select("id").eq("is_test", true).order("created_at").limit(1).maybeSingle();
  if (!o) {
    const r = await admin.from("organisations").insert({ name: "Nisia Test College", seats: 5, is_test: true, contact_name: "Master admin", contact_email: mine,
      notes: "The master admin’s test college, for trying the apps. Not a real college." }).select("id").single();
    if (r.error) throw r.error;
    o = r.data;
  }
  const org = o.id as string;
  const { data: members } = await admin.from("organisation_members").select("id, user_id, active, organisation_member_roles(roles(code))").eq("organisation_id", org);
  const rolesOf = (m: any) => (m.organisation_member_roles ?? []).map((x: any) => x.roles?.code);
  const byRole = (role: string) => (members ?? []).find((m: any) => m.active && rolesOf(m).includes(role));
  // The learner: made here (learners connect Evia with a pairing code, so no invite).
  let lm = byRole("learner"), learnerId: string, enrolmentId: string;
  if (!lm) {
    const email = testEmail(mine, "learner");
    let u = await findUserByEmail(admin, email);
    if (!u) { const c = await admin.auth.admin.createUser({ email, password: makeCode(24) + "!a1", email_confirm: true, user_metadata: { display_name: TEST_NAMES.learner } }); if (c.error) throw c.error; u = c.data.user; }
    await admin.from("profiles").upsert({ id: u.id, display_name: TEST_NAMES.learner });
    const m = await admin.from("organisation_members").insert({ organisation_id: org, user_id: u.id }).select("id").single();
    if (m.error) throw m.error;
    const [lr] = await roleIds(admin, ["learner"]);
    await admin.from("organisation_member_roles").insert({ organisation_member_id: m.data.id, role_id: lr.id });
    lm = { id: m.data.id };
  }
  let { data: l } = await admin.from("learners").select("id").eq("organisation_member_id", lm.id).maybeSingle();
  if (!l) { const r = await admin.from("learners").insert({ organisation_id: org, organisation_member_id: lm.id }).select("id").single(); if (r.error) throw r.error; l = r.data; }
  learnerId = l.id;
  const { data: course } = await admin.from("courses").select("id").eq("source_system", "evia").eq("source_id", "bricklayer").single();
  let { data: e } = await admin.from("enrolments").select("id").eq("learner_id", learnerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!e) {
    const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    const r = await admin.from("enrolments").insert({ organisation_id: org, learner_id: learnerId, course_id: course.id, start_date: day(-180), end_date: day(550), planned_otj_hours: 300,
      employer_name: "Test Employer Ltd", employer_contact_name: TEST_NAMES.employer, employer_contact_email: testEmail(mine, "employer") }).select("id").single();
    if (r.error) throw r.error;
    e = r.data;
  }
  enrolmentId = e.id;
  // Whoever has joined as the test assessor, tutor and employer works with the test learner, in the tutor's class.
  const linked = ["assessor", "tutor", "employer"].map(byRole).filter(Boolean).map((m: any) => m.id);
  const { data: acc } = await admin.from("learner_access").select("organisation_member_id").eq("learner_id", learnerId);
  const have = new Set((acc ?? []).map((x: any) => x.organisation_member_id));
  const add = linked.filter((id: string) => !have.has(id));
  if (add.length) await admin.from("learner_access").insert(add.map((id: string) => ({ organisation_id: org, learner_id: learnerId, organisation_member_id: id })));
  const tutor = byRole("tutor");
  if (tutor) {
    let { data: cls } = await admin.from("classes").select("id").eq("organisation_id", org).eq("client_ref", "nisia-test-class").maybeSingle();
    if (!cls) { const r = await admin.from("classes").insert({ organisation_id: org, tutor_member_id: tutor.id, client_ref: "nisia-test-class", title: "Test class: Bricklaying", course_id: course.id, room: "Workshop 1" }).select("id").single(); if (r.error) throw r.error; cls = r.data; }
    else await admin.from("classes").update({ tutor_member_id: tutor.id }).eq("id", cls.id);
    const { data: inClass } = await admin.from("class_learners").select("class_id").eq("class_id", cls.id).eq("enrolment_id", enrolmentId).maybeSingle();
    if (!inClass) await admin.from("class_learners").insert({ class_id: cls.id, enrolment_id: enrolmentId, organisation_id: org });
  }
  const { data: pending } = await admin.from("invites").select("roles").eq("organisation_id", org).is("used_at", null).gt("expires_at", new Date().toISOString());
  const invited = new Set((pending ?? []).flatMap((x: any) => x.roles ?? []));
  return { organisation_id: org, learner_id: learnerId, enrolment_id: enrolmentId,
    accounts: STAFF_ROLES.map((role) => ({ role, name: TEST_NAMES[role], email: testEmail(mine, role), joined: !!byRole(role), invited: invited.has(role) })) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("POST only", 405);
  let b: Record<string, any>;
  try { b = await req.json(); } catch { return fail("Bad request"); }
  const me = asCaller(req), admin = service();
  const { data: who } = await me.auth.getUser();
  if (!who?.user) return fail("Please sign in again.", 401);
  const uid = who.user.id;
  const isPlatform = async () => ((await me.rpc("nisia_is_platform_admin")).data === true);
  const canManage = async (org: string) => ((await me.rpc("nisia_can_manage", { p_org: org })).data === true) || await isPlatform();

  try {
    switch (b.action) {
      case "create_college": {
        if (!await isPlatform()) return fail("Only the master admin can do this.", 403);
        const name = String(b.name ?? "").trim(), email = String(b.admin_email ?? "").trim();
        if (!name) return fail("Give the college a name.");
        if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter the college admin’s email.");
        const { data: org, error } = await admin.from("organisations").insert({
          name, seats: Math.max(0, parseInt(b.seats) || 0), contact_name: b.admin_name || null, contact_email: email,
          licence_ends: b.licence_ends || null, notes: b.notes || null,
        }).select("id").single();
        if (error) throw error;
        const code = await createInvite(admin, { kind: "staff", organisation_id: org.id, email, display_name: b.admin_name, roles: ["admin"], created_by: uid });
        return reply({ organisation_id: org.id, invite_code: code });
      }
      case "update_college": {
        if (!await isPlatform()) return fail("Only the master admin can do this.", 403);
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ["name", "status", "licence_ends", "contact_name", "contact_email", "notes"]) if (k in b) patch[k] = b[k] || null;
        if ("seats" in b) patch.seats = Math.max(0, parseInt(b.seats) || 0);
        if (patch.status && !["active", "suspended"].includes(String(patch.status))) return fail("Unknown status.");
        const { error } = await admin.from("organisations").update(patch).eq("id", b.organisation_id);
        if (error) throw error;
        return reply({ ok: true });
      }
      case "invite_college_admin":
      case "invite_staff": {
        const org = String(b.organisation_id ?? "");
        if (b.action === "invite_college_admin" ? !await isPlatform() : !await canManage(org)) return fail("You can’t invite people to this college.", 403);
        const roles = b.action === "invite_college_admin" ? ["admin"] : (Array.isArray(b.roles) ? b.roles : []).filter((r: string) => STAFF_ROLES.includes(r));
        if (!roles.length) return fail("Pick at least one role.");
        if (!/^\S+@\S+\.\S+$/.test(String(b.email ?? ""))) return fail("Enter their email.");
        const code = await createInvite(admin, { kind: "staff", organisation_id: org, email: b.email, display_name: b.name, roles, created_by: uid });
        return reply({ invite_code: code });
      }
      case "set_staff_active": {
        const { data: m } = await admin.from("organisation_members").select("organisation_id,user_id").eq("id", b.member_id).single();
        if (!m || !await canManage(m.organisation_id)) return fail("Not allowed.", 403);
        if (m.user_id === uid && !b.active) return fail("You can’t switch yourself off.");
        if (!b.active) {
          // A college always keeps at least one admin who can sign in.
          const [ar] = await roleIds(admin, ["admin"]);
          const { data: act } = await admin.from("organisation_members").select("id").eq("organisation_id", m.organisation_id).eq("active", true);
          const { data: adm } = await admin.from("organisation_member_roles").select("organisation_member_id").eq("role_id", ar.id).in("organisation_member_id", (act ?? []).map((x) => x.id));
          const admins = (adm ?? []).map((x) => x.organisation_member_id);
          if (admins.length <= 1 && admins.includes(b.member_id)) return fail("This is the college’s only admin, so they can’t be switched off. Invite another admin first.");
        }
        await admin.from("organisation_members").update(b.active ? { active: true, deactivated_at: null } : { active: false, deactivated_at: new Date().toISOString() }).eq("id", b.member_id);
        return reply({ ok: true });
      }
      case "update_staff": {
        // Name, roles and on/off for one member of staff. A college always keeps an admin who's switched on.
        const { data: m } = await admin.from("organisation_members").select("id, organisation_id, user_id, active").eq("id", b.member_id).single();
        if (!m || !await canManage(m.organisation_id)) return fail("Not allowed.", 403);
        const name = String(b.name ?? "").trim(), roles: string[] = (Array.isArray(b.roles) ? b.roles : []).filter((r: string) => STAFF_ROLES.includes(r));
        const active = b.active !== false;
        if (!name) return fail("Enter their name.");
        if (!roles.length) return fail("Pick at least one role.");
        if (m.user_id === uid && (!active || !roles.includes("admin"))) return fail("You can’t switch yourself off or remove your own admin role.");
        const [ar] = await roleIds(admin, ["admin"]);
        if (!active || !roles.includes("admin")) {
          const { data: act } = await admin.from("organisation_members").select("id").eq("organisation_id", m.organisation_id).eq("active", true);
          const { data: adm } = await admin.from("organisation_member_roles").select("organisation_member_id").eq("role_id", ar.id).in("organisation_member_id", (act ?? []).map((x) => x.id));
          const others = (adm ?? []).map((x) => x.organisation_member_id).filter((id) => id !== m.id);
          if (!others.length && (adm ?? []).some((x) => x.organisation_member_id === m.id)) return fail("This is the college’s only admin. Make someone else an admin first.");
        }
        await admin.from("profiles").upsert({ id: m.user_id, display_name: name });
        const wanted = await roleIds(admin, roles), staffRoles = await roleIds(admin, STAFF_ROLES);
        await admin.from("organisation_member_roles").delete().eq("organisation_member_id", m.id).in("role_id", staffRoles.map((r) => r.id));
        const { error: re } = await admin.from("organisation_member_roles").insert(wanted.map((r) => ({ organisation_member_id: m.id, role_id: r.id })));
        if (re) throw re;
        if (active !== m.active) await admin.from("organisation_members").update(active ? { active: true, deactivated_at: null } : { active: false, deactivated_at: new Date().toISOString() }).eq("id", m.id);
        return reply({ ok: true });
      }
      case "update_learner": {
        // The learner's name and their enrolment: course, dates, planned hours and employer.
        const { data: l } = await admin.from("learners").select("id, organisation_id, organisation_member_id, organisation_members!inner(user_id)").eq("id", b.learner_id).single();
        if (!l || !await canManage(l.organisation_id)) return fail("Not allowed.", 403);
        const name = String(b.name ?? "").trim();
        if (!name) return fail("Enter the learner’s name.");
        if (!b.start_date || !b.end_date) return fail("Enter the start and planned end dates.");
        if (b.end_date <= b.start_date) return fail("The end date must be after the start date.");
        const { data: course } = await admin.from("courses").select("id").eq("source_system", "evia").eq("source_id", b.course).maybeSingle();
        if (!course) return fail("Pick a course.");
        const { data: e } = await admin.from("enrolments").select("id").eq("learner_id", l.id).order("created_at", { ascending: false }).limit(1).single();
        await admin.from("profiles").upsert({ id: (l as any).organisation_members.user_id, display_name: name });
        const { error: ee } = await admin.from("enrolments").update({
          course_id: course.id, start_date: b.start_date, end_date: b.end_date, planned_otj_hours: b.planned_otj_hours ? Number(b.planned_otj_hours) : null,
          employer_name: b.employer_name || null, employer_contact_name: b.employer_contact_name || null, employer_contact_email: b.employer_contact_email || null,
        }).eq("id", e!.id);
        if (ee) throw ee;
        return reply({ ok: true });
      }
      case "assign_staff": {
        const { data: l } = await admin.from("learners").select("organisation_id").eq("id", b.learner_id).single();
        if (!l || !await canManage(l.organisation_id)) return fail("Not allowed.", 403);
        const ids: string[] = Array.isArray(b.member_ids) ? b.member_ids : [];
        await admin.from("learner_access").delete().eq("learner_id", b.learner_id);
        if (ids.length) await admin.from("learner_access").insert(ids.map((id) => ({ organisation_id: l.organisation_id, learner_id: b.learner_id, organisation_member_id: id })));
        return reply({ ok: true });
      }
      case "add_learner": {
        const org = String(b.organisation_id ?? "");
        if (!await canManage(org)) return fail("Only the college admin can add learners.", 403);
        const name = String(b.name ?? "").trim();
        if (!name) return fail("Enter the learner’s name.");
        if (!b.start_date || !b.end_date) return fail("Enter the start and planned end dates.");
        const { data: course } = await admin.from("courses").select("id").eq("source_system", "evia").eq("source_id", b.course).maybeSingle();
        if (!course) return fail("Pick a course.");
        const { data: o } = await admin.from("organisations").select("seats,status").eq("id", org).single();
        const { data: used } = await admin.rpc("nisia_seats_used_service", { p_org: org });
        if (o!.status !== "active") return fail("This college’s licence is suspended.");
        if ((used ?? 0) >= o!.seats) return fail(`No seats left: all ${o!.seats} are in use. Ask Nisia for more.`);
        // Learners sign in through Evia's pairing code, so their sign-in needs no password; the email is optional.
        const email = String(b.email ?? "").trim().toLowerCase() || `learner-${crypto.randomUUID()}@learners.nisia.invalid`;
        const { data: cu, error: ce } = await admin.auth.admin.createUser({ email, password: makeCode(24) + "!a1", email_confirm: true, user_metadata: { display_name: name } });
        if (ce) return fail(ce.message.includes("already") ? "Someone with that email is already on Nisia." : ce.message);
        const userId = cu.user.id;
        try {
          await admin.from("profiles").upsert({ id: userId, display_name: name });
          const { data: m, error: me1 } = await admin.from("organisation_members").insert({ organisation_id: org, user_id: userId }).select("id").single();
          if (me1) throw me1;
          const [lr] = await roleIds(admin, ["learner"]);
          await admin.from("organisation_member_roles").insert({ organisation_member_id: m.id, role_id: lr.id });
          const { data: l, error: le } = await admin.from("learners").insert({ organisation_id: org, organisation_member_id: m.id }).select("id").single();
          if (le) throw le;
          const { data: e, error: ee } = await admin.from("enrolments").insert({
            organisation_id: org, learner_id: l.id, course_id: course.id, start_date: b.start_date, end_date: b.end_date,
            planned_otj_hours: b.planned_otj_hours ? Number(b.planned_otj_hours) : null, employer_name: b.employer_name || null,
            employer_contact_name: b.employer_contact_name || null, employer_contact_email: b.employer_contact_email || null,
            nvq_optional: Array.isArray(b.nvq_optional) ? b.nvq_optional : [],
          }).select("id").single();
          if (ee) throw ee;
          const staff: string[] = Array.isArray(b.staff_member_ids) ? b.staff_member_ids : [];
          if (staff.length) await admin.from("learner_access").insert(staff.map((id) => ({ organisation_id: org, learner_id: l.id, organisation_member_id: id })));
          return reply({ learner_id: l.id, enrolment_id: e.id });
        } catch (err) {
          await admin.auth.admin.deleteUser(userId);
          const msg = String((err as any)?.message ?? err);
          return fail(msg.includes("No seats") ? msg : "The learner couldn’t be added. " + msg);
        }
      }
      case "test_college": {
        if (!await isPlatform()) return fail("Only the master admin can do this.", 403);
        if (!who.user.email) return fail("Your account needs an email for the test accounts.");
        return reply(await testCollege(admin, who.user.email, uid));
      }
      case "test_invite": {
        if (!await isPlatform()) return fail("Only the master admin can do this.", 403);
        if (!STAFF_ROLES.includes(b.role)) return fail("Pick a role.");
        const t = await testCollege(admin, who.user.email!, uid), email = testEmail(who.user.email!, b.role);
        await admin.from("invites").delete().eq("organisation_id", t.organisation_id).eq("email", email).is("used_at", null);
        const code = await createInvite(admin, { kind: "staff", organisation_id: t.organisation_id, email, display_name: TEST_NAMES[b.role], roles: [b.role], created_by: uid });
        return reply({ invite_code: code, email });
      }
      case "pairing_code": {
        // Anyone who can see the learner and isn't the learner (their assessor, tutor or college admin), or the master admin.
        const platform = await isPlatform();
        const { data: l } = await (platform ? admin : me).from("learners").select("id, organisation_id, organisation_member_id").eq("id", b.learner_id).maybeSingle();
        if (!l) return fail("You can’t see this learner.", 403);
        const { data: mine } = await admin.from("organisation_members").select("id").eq("organisation_id", l.organisation_id).eq("user_id", uid).eq("active", true).maybeSingle();
        if (mine ? mine.id === l.organisation_member_id : !platform) return fail("Not allowed.", 403);
        await admin.from("evia_pairing_tokens").delete().eq("learner_id", l.id).is("used_at", null);
        const code = makeCode(7), minutes = 30;
        const { error } = await admin.from("evia_pairing_tokens").insert({
          organisation_id: l.organisation_id, learner_id: l.id, created_by_member_id: mine?.id ?? null, token_hash: await sha256(code),
          expires_at: new Date(Date.now() + minutes * 60000).toISOString(),
        });
        if (error) throw error;
        return reply({ code, qr: "NISI:PAIR:2:" + code, expires_in_minutes: minutes });
      }
    }
    return fail("Unknown action");
  } catch (e) {
    console.error(e);
    return fail("Something went wrong. Please try again.", 500);
  }
});

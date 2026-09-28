// nisia-setup: the things people do before they have a Nisia sign-in.
//   accept  {code, password, name}  An invite: sets the password (new sign-ins) and joins the college, or makes the
//                                   master admin. The invite code is single use.
//   pair    {code}                  Evia: the code under the assessor's QR. Returns a one-time sign-in token for the
//                                   learner and the details Nisia holds for them. The code is single use.
// The first master admin invite was created directly in the database (see services/supabase/README.md).
import { CORS, reply, fail, service, sha256, cleanCode, findUserByEmail, roleIds } from "../_shared/nisia.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("POST only", 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Bad request"); }
  const admin = service();
  try {
    if (body.action === "accept") {
      const code = cleanCode(body.code), password = String(body.password ?? ""), name = String(body.name ?? "").trim();
      if (code.length < 12) return fail("That invite link isn’t complete. Open it again from the message you were sent.");
      const { data: inv } = await admin.from("invites").select("*").eq("code_hash", await sha256(code)).maybeSingle();
      if (!inv || inv.used_at) return fail("This invite has already been used, or doesn’t exist. Ask for a new one.");
      if (new Date(inv.expires_at) < new Date()) return fail("This invite has expired. Ask for a new one.");
      let user = await findUserByEmail(admin, inv.email);
      if (!user) {
        if (password.length < 10) return fail("Choose a password of at least 10 characters.");
        const { data, error } = await admin.auth.admin.createUser({ email: inv.email, password, email_confirm: true, user_metadata: { display_name: name || inv.display_name || "" } });
        if (error) return fail(error.message);
        user = data.user;
      }
      if (name) await admin.from("profiles").update({ display_name: name }).eq("id", user.id);
      if (inv.kind === "platform_admin") {
        await admin.from("platform_admins").upsert({ user_id: user.id });
      } else {
        const { data: existing } = await admin.from("organisation_members").select("id").eq("organisation_id", inv.organisation_id).eq("user_id", user.id).maybeSingle();
        let memberId = existing?.id as string | undefined;
        if (memberId) await admin.from("organisation_members").update({ active: true, deactivated_at: null }).eq("id", memberId);
        else {
          const { data: m, error } = await admin.from("organisation_members").insert({ organisation_id: inv.organisation_id, user_id: user.id }).select("id").single();
          if (error) throw error;
          memberId = m.id;
        }
        const roles = await roleIds(admin, inv.roles);
        if (roles.length) await admin.from("organisation_member_roles").upsert(roles.map((r) => ({ organisation_member_id: memberId, role_id: r.id })), { onConflict: "organisation_member_id,role_id" });
      }
      await admin.from("invites").update({ used_at: new Date().toISOString() }).eq("id", inv.id);
      return reply({ ok: true, email: inv.email, existing: !password || undefined });
    }

    if (body.action === "pair") {
      const code = cleanCode(body.code);
      if (code.length < 6) return fail("That code looks too short. It’s under your assessor’s QR code.");
      const { data: tok } = await admin.from("evia_pairing_tokens").select("*").eq("token_hash", await sha256(code)).maybeSingle();
      if (!tok || tok.used_at || new Date(tok.expires_at) < new Date()) return fail("That code didn’t work. Codes only last a few minutes, so ask your assessor for a new one.");
      const { data: l } = await admin.from("learners").select("id, organisation_id, organisation_member_id, organisation_members!inner(user_id)").eq("id", tok.learner_id).single();
      const userId = (l as any).organisation_members.user_id as string;
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const email = u.user?.email;
      if (!email) return fail("This learner can’t be connected yet. Ask your college.");
      const { data: link, error: le } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (le) throw le;
      await admin.from("evia_pairing_tokens").update({ used_at: new Date().toISOString() }).eq("id", tok.id);
      const details = await learnerDetails(admin, l!.id, l!.organisation_id);
      return reply({ email, token_hash: link.properties.hashed_token, ...details });
    }
    return fail("Unknown action");
  } catch (e) {
    console.error(e);
    return fail("Something went wrong. Please try again.", 500);
  }
});

/* What Evia shows on "Is this you?" and fills in for the learner. */
async function learnerDetails(admin: ReturnType<typeof service>, learnerId: string, orgId: string) {
  const { data: org } = await admin.from("organisations").select("name").eq("id", orgId).single();
  const { data: l } = await admin.from("learners").select("organisation_member_id, organisation_members!inner(user_id)").eq("id", learnerId).single();
  const { data: prof } = await admin.from("profiles").select("display_name").eq("id", (l as any).organisation_members.user_id).single();
  const { data: e } = await admin.from("enrolments").select("id, start_date, end_date, status, planned_otj_hours, employer_name, employer_contact_name, nvq_optional, courses(source_id, title)").eq("learner_id", learnerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: staff } = await admin.from("learner_access").select("organisation_member_id, organisation_members!inner(user_id, organisation_member_roles(roles(code)))").eq("learner_id", learnerId);
  const people: { assessor?: string; tutor?: string } = {};
  for (const s of staff ?? []) {
    const m = (s as any).organisation_members;
    const { data: p } = await admin.from("profiles").select("display_name").eq("id", m.user_id).single();
    const codes = (m.organisation_member_roles ?? []).map((r: any) => r.roles?.code);
    if (codes.includes("assessor") && !people.assessor) people.assessor = p?.display_name ?? "";
    if (codes.includes("tutor") && !people.tutor) people.tutor = p?.display_name ?? "";
  }
  return {
    learnerId, organisationId: orgId, enrolmentId: e?.id ?? null, memberId: l!.organisation_member_id,
    name: prof?.display_name ?? "", college: org?.name ?? "", course: (e as any)?.courses?.source_id ?? "", courseTitle: (e as any)?.courses?.title ?? "",
    start: e?.start_date ?? "", end: e?.end_date ?? "", employer: e?.employer_name ?? "", employerContact: e?.employer_contact_name ?? "",
    plannedOtjHours: e?.planned_otj_hours ?? null, nvqOptional: e?.nvq_optional ?? [], ...people,
  };
}

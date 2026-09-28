// Shared helpers for Nisia's edge functions: CORS, JSON replies, codes and hashing, and the two Supabase clients
// (the caller's, which obeys row-level security, and the service one, used only after a permission check).
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
export const fail = (message: string, status = 400) => reply({ error: message }, status);

const URL_ = Deno.env.get("SUPABASE_URL")!;
export const service = (): SupabaseClient =>
  createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
export const asCaller = (req: Request): SupabaseClient =>
  createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

/* Codes people read and type: no 0/O, 1/I/L. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function makeCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const cleanCode = (s: unknown) => String(s ?? "").toUpperCase().replace(/^NISI:PAIR:\d+:/, "").replace(/[^A-Z0-9]/g, "");
export async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* Finds an existing sign-in by email (small numbers of users, so paging is fine). */
export async function findUserByEmail(admin: SupabaseClient, email: string) {
  const want = email.trim().toLowerCase();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === want);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

export async function roleIds(admin: SupabaseClient, codes: string[]) {
  const { data, error } = await admin.from("roles").select("id,code").in("code", codes);
  if (error) throw error;
  return data ?? [];
}

/* A staff invite: a one-time code, stored only as its hash. Valid for 14 days. */
export async function createInvite(admin: SupabaseClient, o: { kind: "platform_admin" | "staff"; organisation_id?: string | null; email: string; display_name?: string; roles?: string[]; created_by?: string | null }) {
  const code = makeCode(16);
  const { error } = await admin.from("invites").insert({
    kind: o.kind, organisation_id: o.organisation_id ?? null, email: o.email.trim().toLowerCase(), display_name: o.display_name ?? null,
    roles: o.roles ?? [], code_hash: await sha256(code), expires_at: new Date(Date.now() + 14 * 864e5).toISOString(), created_by: o.created_by ?? null,
  });
  if (error) throw error;
  return code;
}

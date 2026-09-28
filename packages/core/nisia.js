/* Nisia core for the web apps (the portal and Milos): the Supabase connection, signing in (password, then the
   authenticator app, which every staff sign-in needs), and the server actions. Plain ES module, no build step.
   The publishable key is meant to be public: what anyone can see is decided by the database's row-level security. */
/* supabase-js is bundled (packages/vendor/supabase-2.45.4.js, loaded by a script tag before this module). */
const { createClient } = window.supabase;

export const NISIA_URL = "https://ffgfigkeeeauzkifopei.supabase.co";
export const NISIA_KEY = "sb_publishable_w_R4Kqq3UqNKQuv6erQzAQ_bXBkw8Bc";

/* Two things that could leave a screen waiting for ever (seen on phones after an update):
   - supabase-js holds a cross-tab lock while it refreshes the sign-in; a frozen old page, or the portal open in
     another tab, could keep it. Each page manages its own sign-in instead (a lock that just runs).
   - a request with no answer. Every request now gives up after a while (longer for uploads), so it becomes an
     error the screen can show, and offline Milos carries on from the phone. */
const timedFetch = (url, o = {}) => {
  if (o.signal) return fetch(url, o);
  const c = new AbortController(), ms = /\/storage\/v1\/object\//.test(String(url)) && o.method && o.method !== "GET" ? 120000 : 25000;
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...o, signal: c.signal }).catch((e) => { throw e.name === "AbortError" ? new Error("Nisia didn’t answer in time. Check your signal and try again.") : e; }).finally(() => clearTimeout(t));
};
/* Each app keeps its own sign-in (they share a website): Milos sets window.NISIA_AUTH_KEY, so being signed in to
   Milos as an assessor doesn't sign the portal in as them too, and signing out of one leaves the other alone. */
export const AUTH_KEY = window.NISIA_AUTH_KEY || "nisia-auth";
export const db = createClient(NISIA_URL, NISIA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_KEY, lock: (_name, _timeout, fn) => fn() },
  global: { fetch: timedFetch },
});

/* An edge function; throws the function's own message on failure. */
export async function call(fn, body) {
  const { data: { session } } = await db.auth.getSession();
  const r = await fetch(NISIA_URL + "/functions/v1/" + fn, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: NISIA_KEY, ...(session ? { Authorization: "Bearer " + session.access_token } : {}) },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await r.json(); } catch { /* empty reply */ }
  if (!r.ok || data.error) throw new Error(data.error || data.msg || data.message || "Something went wrong (" + r.status + ")");
  return data;
}
export async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args || {});
  if (error) throw new Error(error.message);
  return data;
}

/* ---------- Signing in ----------
   state(): "signed-out" | "needs-setup" (no authenticator yet) | "needs-code" (authenticator code) | "ready" */
export async function state() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return { step: "signed-out" };
  const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel === "aal2") return { step: "ready", session };
  const { data: f } = await db.auth.mfa.listFactors();
  const totp = (f && f.totp || []).find((x) => x.status === "verified");
  return totp ? { step: "needs-code", factorId: totp.id } : { step: "needs-setup" };
}
export async function signIn(email, password) {
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "That email and password don’t match." : error.message);
}
/* First sign-in: add Nisia to the authenticator app. Returns the QR code (an SVG) and the key to type instead. */
export async function startAuthenticator() {
  const { data: f } = await db.auth.mfa.listFactors();
  for (const old of (f && f.all || []).filter((x) => x.status !== "verified")) await db.auth.mfa.unenroll({ factorId: old.id });
  const { data, error } = await db.auth.mfa.enroll({ factorType: "totp", friendlyName: "Nisia " + new Date().toISOString().slice(0, 10) });
  if (error) throw new Error(error.message);
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}
export async function verifyCode(factorId, code) {
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId, code: String(code).replace(/\D/g, "") });
  if (error) throw new Error(/invalid|expired/i.test(error.message) ? "That code didn’t work. Use the newest one in your authenticator app." : error.message);
}
export const signOut = () => db.auth.signOut();
export const me = () => rpc("nisia_me");

/* The courses Evia teaches (the ids match Evia's course packs). */
/* Where learners open Evia. The pairing QR is a link to it, so a phone's camera opens Evia with the code filled in. */
export const EVIA_URL = "https://ddrnfinch.github.io/nisia-app/evia/";
export const pairLink = (code) => EVIA_URL + "?pair=" + code;
export const COURSES = [
  { id: "bricklayer", name: "Bricklayer (ST0095)" },
  { id: "site", name: "Site Carpenter (ST0264)" },
  { id: "joiner", name: "Architectural Joiner (ST0264)" },
  { id: "trowel3", name: "Trowel Occupations L3 (6570-05)" },
];
export const courseName = (id) => (COURSES.find((c) => c.id === id) || {}).name || id || "";

/* Small helpers shared by the screens. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const ukDate = (d) => { const t = Date.parse(d); return isNaN(t) ? "" : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };
/* A QR code as SVG (packages/vendor/qrcode-generator-1.4.4.js). */
export function qrSvg(text, cell = 5) {
  const q = window.qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}
export const ago = (d) => {
  const t = Date.parse(d); if (isNaN(t)) return "Never";
  const days = Math.floor((Date.now() - t) / 864e5);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? days + " days ago" : ukDate(d);
};

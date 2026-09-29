/* Notifications in Milos (Web Push, no app store): new evidence from a learner, ready to assess, and on a Monday the
   progress reviews to book. Only if the assessor turns them on; Nisia sends them on weekdays, 7:30am to 9pm.
   iPhones and iPads need Milos added to the Home Screen first.
   state(): unsupported | install | blocked | off | on */
import { db } from "../../packages/core/nisia.js";

const VAPID = "BCvAqfno7ja_7c6SDkZXFkl37v0t7zrZ6RkqVvTGNhtB9pL_7fYN2wT9hwYQBp0Y_4QfiNFc2opCpVw4IAcyxLk", KEY = "milos-push";
const can = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const bytes = (k) => Uint8Array.from(atob(k.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((k.length + 3) % 4)), (c) => c.charCodeAt(0));
const today = () => new Date().toISOString().slice(0, 10);
function pref(v) {
  let p = {}; try { p = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (_) {}
  if (v) { p = { ...p, ...v }; try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (_) {} }
  return p;
}

export function state() {
  if (!can()) return ios() && !standalone() ? "install" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return Notification.permission === "granted" && pref().on ? "on" : "off";
}
export const asked = () => !!pref().asked;
export const WHY = {
  install: "On iPhone and iPad, add Milos to your Home Screen first (Share, then Add to Home Screen).",
  blocked: "They’re blocked for Milos in your settings. Allow them there, then come back.",
  unsupported: "This device or browser can’t get notifications from Milos.",
};

async function subscription() {
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(VAPID) });
}
async function save(sub) {
  const { data } = await db.auth.getSession();
  if (!data || !data.session) throw new Error("Sign in to Nisia first.");
  const j = sub.toJSON();
  const { error } = await db.from("device_tokens").upsert({ user_id: data.session.user.id, platform: "web", app: "milos", token: j.endpoint,
    subscription: { endpoint: j.endpoint, keys: j.keys }, last_seen_at: new Date().toISOString() }, { onConflict: "token" });
  if (error) throw error;
  pref({ saved: today() });
}
/* From a tap: browsers only ask for permission from one. */
export async function on() {
  if (!can()) return false;
  const perm = await Notification.requestPermission();
  pref({ asked: new Date().toISOString() });
  if (perm !== "granted") return false;
  await save(await subscription());
  pref({ on: true });
  return true;
}
export async function off() {
  pref({ on: false });
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub) { try { await db.from("device_tokens").delete().eq("token", sub.endpoint); } catch (_) {} await sub.unsubscribe(); }
  } catch (_) {}
}
/* Once a day while on: the subscription can change, so Nisia gets the current one. */
export async function refresh() {
  if (state() !== "on" || !navigator.onLine || pref().saved === today()) return;
  try { await save(await subscription()); } catch (e) { console.warn("Milos: notifications", e.message); }
}

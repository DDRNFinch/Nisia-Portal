/* Which features staff use in the Nisia apps (the portal, Milos, Symi, Paros), as counts: the same as Evia's
   usage.js. One row a day per device goes to Nisia (nisia_usage_ping): the counts, the app's version and the kind of
   device. No names, no text, no identifier; Nisia works out the college from the sign-in, for its impact report. */
import { db } from "./nisia.js";

let app = "", version = "", key = "", st = { days: {} }, saveT = null, sending = false;
const day = (t) => { const d = t ? new Date(t) : new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(key, JSON.stringify(st)); } catch (_) { /* full or blocked */ } }, 800); };
const platform = () => {
  const u = navigator.userAgent, installed = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
  return (/iP(hone|ad|od)/.test(u) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : /Android/.test(u) ? "android" : "desktop") + (installed ? "-app" : "-web");
};

/* Count one use of a feature today. */
export function hit(feature) {
  if (!key || !feature) return;
  const d = day(), c = (st.days[d] = st.days[d] || {});
  const k = String(feature).toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").slice(0, 48);
  c[k] = Math.min(5000, (c[k] || 0) + 1); save();
}

/* The days before today go to Nisia, once, when there's a signal (and never from a test copy on this computer). */
export async function send() {
  if (!key || sending || !navigator.onLine || /^(localhost|127\.)/.test(location.hostname)) return;
  const today = day(), days = Object.keys(st.days).filter((d) => d < today).sort().slice(-14);
  if (!days.length) return;
  sending = true;
  try {
    for (const d of days) {
      const { error } = await db.rpc("nisia_usage_ping", { p: { day: d, app, version, platform: platform(), counts: st.days[d] } });
      if (error) break;
      delete st.days[d];
    }
    Object.keys(st.days).filter((d) => d < day(Date.now() - 14 * 864e5)).forEach((d) => delete st.days[d]);
    try { localStorage.setItem(key, JSON.stringify(st)); } catch (_) { /* full or blocked */ }
  } catch (_) { /* try again later */ } finally { sending = false; }
}

/* Each app starts it once: its name and version. */
export function startUsage(name, ver) {
  app = name; version = String(ver || "").slice(0, 24); key = "nisia-usage-" + name;
  try { st = JSON.parse(localStorage.getItem(key) || "null") || { days: {} }; } catch (_) { st = { days: {} }; }
  setTimeout(send, 8000);
  addEventListener("online", () => setTimeout(send, 5000));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") setTimeout(send, 5000); });
}

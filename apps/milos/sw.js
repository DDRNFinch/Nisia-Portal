/* Milos works offline. The whole app is kept here as one version: every file is fetched fresh when a new version
   installs, and served from here after that, so an update always arrives complete (never new files mixed with old
   ones). Learners' data isn't kept here: store.js keeps it in IndexedDB, and Nisia's own requests go straight through.
   VERSION is stamped with the commit when the site is published. */
const VERSION = "dev";
const CACHE = "milos-" + VERSION;
const FILES = ["./", "index.html", "milos.css", "fonts/inter-latin-wght-normal.woff2", "app.js", "review.js", "portfolio.js", "observe.js", "pack.js", "store.js", "draft.js", "match.js", "push.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/badge-96.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png",
  "../../packages/core/nisia.js", "../../packages/core/signin.js", "../../packages/core/usage.js", "../../packages/core/courses.js", "../../packages/core/reviewdoc.js",
  "../../packages/core/strength.js", "../../packages/core/prompts.js", "../../packages/core/absences.js", "../../packages/ui/nisia.css",
  "../../packages/vendor/supabase-2.45.4.js", "../../packages/vendor/qrcode-generator-1.4.4.js", "../../packages/vendor/jspdf-2.umd.min.js"];

self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) =>
  Promise.all(FILES.map((f) => fetch(new Request(f, { cache: "reload" })).then((r) => { if (!r.ok) throw new Error(f + " " + r.status); return c.put(f, r); }))))));
/* The page asks for the new version to take over (its "Update" button), or it does so on its own next time Milos opens. */
self.addEventListener("message", (e) => { if (e.data === "update") self.skipWaiting(); });
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("milos-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => hit ||
    (e.request.mode === "navigate" ? c.match("./") : null)).then((hit) => hit || fetch(e.request))));
});

/* Notifications from Nisia (the assessor turned them on). Tapping one opens Milos on the right tab: the open Milos if
   there is one, otherwise a new one. */
self.addEventListener("push", (e) => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (_) { m = { title: "Milos", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(m.title || "Milos", { body: m.body || "", tag: m.tag || undefined, renotify: !!m.tag,
    icon: "icons/icon-192.png", badge: "icons/badge-96.png", lang: "en-GB", data: { open: m.open || "" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const open = (e.notification.data && e.notification.data.open) || "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    const w = wins.find((x) => x.url.startsWith(self.registration.scope));
    if (w) return w.focus().then(() => w.postMessage({ type: "milos-open", open }));
    return self.clients.openWindow(self.registration.scope + (open ? "?open=" + encodeURIComponent(open) : ""));
  }));
});

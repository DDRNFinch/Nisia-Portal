/* Paros works offline from its last download: the app is kept here as one version (fetched fresh when a new version
   installs). Apprentices' details are kept by the app itself; Evia Portal's own requests go straight through.
   VERSION is stamped with the commit when the site is published. */
const VERSION = "dev";
const CACHE = "paros-" + VERSION;
const FILES = ["./", "index.html", "paros.css", "app.js", "push.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png",
  "../milos/milos.css", "../milos/fonts/inter-latin-wght-normal.woff2",
  "../../packages/core/nisia.js", "../../packages/core/signin.js", "../../packages/core/usage.js", "../../packages/core/courses.js", "../../packages/core/packs.js", "../../packages/core/absences.js", "../../packages/core/timeline.js", "../../packages/core/nisia-actions.js", "../../packages/core/install-chip.js", "../../packages/core/messages-ui.js", "../../packages/ui/nisia.css", "../../packages/vendor/supabase-2.45.4.js"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) =>
  Promise.all(FILES.map((f) => fetch(new Request(f, { cache: "reload" })).then((r) => { if (!r.ok) throw new Error(f + " " + r.status); return c.put(f, r); }))))));
self.addEventListener("message", (e) => { if (e.data === "update") self.skipWaiting(); });
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("paros-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => hit ||
    (e.request.mode === "navigate" ? c.match("./") : null)).then((hit) => hit || fetch(e.request))));
});
/* Notifications from Evia Portal (push.js): the apprentices' week, learning hours to confirm, a prompt to rate. */
self.addEventListener("push", (e) => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (_) { m = { title: "Paros", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(m.title || "Paros", { body: m.body || "", tag: m.tag || undefined, renotify: !!m.tag,
    icon: "icons/icon-192.png", badge: "icons/icon-192.png", lang: "en-GB", data: { open: m.open || "" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const open = (e.notification.data && e.notification.data.open) || "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    const w = wins.find((x) => x.url.startsWith(self.registration.scope));
    if (w) return w.focus().then(() => w.postMessage({ type: "paros-open", open }));
    return self.clients.openWindow(self.registration.scope + (open ? "?open=" + encodeURIComponent(open) : ""));
  }));
});

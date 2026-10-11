/* Nisia portal: what makes it installable as an app. Pages and files of the portal itself come from the network when
   there's signal (so it's always up to date) and from the copy kept here when there isn't. The other apps live in their
   own folders with their own workers, so their requests are left alone. */
const CACHE = "nisia-portal-v2";
const OTHER_APPS = /\/(evia|milos|symi|paros|preview)\//;
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("nisia-portal-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || OTHER_APPS.test(url.pathname)) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
      if (hit) return hit;
      throw err;
    }
  })());
});

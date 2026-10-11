/* Retired: Nisia used to be installed from the site's top folder, and this worker ran there. Nisia now lives in nisia/.
   Any phone still running the old worker gets this one, which removes itself and its old copies, and reloads only the
   old top page (the other apps have their own workers and are left alone). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k === "nisia-portal-v1" || k === "nisia-portal-v2") await caches.delete(k);
  await self.registration.unregister();
  const top = new URL("./", self.registration.scope).pathname;
  for (const c of await self.clients.matchAll({ type: "window" })) { const p = new URL(c.url).pathname; if (p === top || p === top + "index.html") c.navigate(c.url); }
})()));

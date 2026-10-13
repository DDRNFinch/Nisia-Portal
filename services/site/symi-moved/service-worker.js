/* Retired: Symi moved to symi-app/. A phone still running Symi's old worker here gets this one, which removes itself
   and sends any open Symi window to the new address. (Symi's saved registers live with the website, so they come too.) */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  await self.registration.unregister();
  const to = new URL("../symi-app/", self.registration.scope).href;
  for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(to).catch(() => {});
})()));

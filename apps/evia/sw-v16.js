const VERSION = "2026-10-07-evia7-v225";
const CACHE_NAME = "evia7-offline-" + VERSION;

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./polish.css",
  "./ui.css",
  "./premium.css",
  "./accessibility.css",
  "./accessibility.js",
  "./vendor/fonts/lexend-latin-400-normal.woff2",
  "./vendor/fonts/lexend-latin-600-normal.woff2",
  "./vendor/fonts/inter-latin-wght-normal.woff2",
  "./errors.js","./install.js","./packs.js","./nisia-actions.js","./nisia.js","./checkin.js","./vendor/supabase-2.45.4.js",
  "./storage.js",
  "./app.js",
  "./data.js",
  "./polish.js",
  "./profile.js",
  "./eportfolio.js",
  "./vendor/jspdf.umd.min.js","./vendor/mp4-muxer-5.2.2.js",
  "./onboarding.js",
  "./theme.js",
  "./test-banks.js",
  "./review.js",
  "./repair.js",
  "./ui.js",
  "./progress.js",
  "./epa-guide.js",
  "./discussion.js",
  "./evia-coach.js","./evia-brain.js","./evia-todo.js",
  "./provider.js",
  "./practice-tasks.js",
  "./ksb-official.js",
  "./usage.js",
  "./otj-auto.js",
  "./teach-kit.js",
  "./teach-pics.js",
  "./teach-play.js",
  "./teach-maths.js",
  "./teach-english.js",
  "./teach-edi.js",
  "./strength.js",
  "./guide.js",
  "./teach.js",
  "./exam.js",
  "./stats.js",
  "./practice.js",
  "./reviews.js",
  "./camera.js",
  "./photo-tips.js",
  "./writing.js",
  "./evia-alive.js",
  "./tabs.js",
  "./rewards.js",
  "./orbs.js",
  "./tips.js",
  "./games.js",
  "./showdown-data.js",
  "./showdown.js",
  "./leaderboard.js",
  "./games/brickle.jpg","./guide-pics/build-1.jpg","./guide-pics/build-2.jpg","./guide-pics/build-3.jpg",
  "./games/crossword.jpg",
  "./games/flappy.jpg",
  "./games/showdown.jpg",
  "./manifest.json",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png","./badge-96.png",
  "./icon-512.png"
];

/* Offline-first: the app always opens from the copy saved on the phone, so it loads instantly with or without
   signal. Each release bumps VERSION; the browser then downloads the whole new version in the background, and
   it is used from the next time Evia opens. */
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.map(url => new Request(url, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith("evia7-offline-") && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    /* Version query strings (?v=...) are ignored so saved files always match. */
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response && response.ok) await cache.put(url.origin + url.pathname, response.clone());
      return response;
    } catch (_) {
      if (event.request.mode === "navigate") {
        const page = await cache.match("./index.html");
        if (page) return page;
      }
      return new Response("", { status: 504, statusText: "Offline" });
    }
  })());
});

/* Notifications from Nisia (course things only; the learner turned them on). Tapping one opens Evia at the right
   place: the open Evia if there is one, otherwise a new one. */
self.addEventListener("push", event => {
  let m = {};
  try { m = event.data ? event.data.json() : {}; } catch (_) { m = { title: "Evia", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(m.title || "Evia", {
    body: m.body || "",
    tag: m.tag || undefined,
    renotify: !!m.tag,
    icon: "./icon-192.png",
    badge: "./badge-96.png",
    lang: "en-GB",
    data: { open: m.open || "" }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const open = (event.notification.data && event.notification.data.open) || "";
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const win = wins.find(w => w.url.startsWith(self.registration.scope));
    if (win) {
      await win.focus();
      win.postMessage({ type: "evia-open", open });
      return;
    }
    await self.clients.openWindow(self.registration.scope + (open ? "?open=" + encodeURIComponent(open) : ""));
  })());
});

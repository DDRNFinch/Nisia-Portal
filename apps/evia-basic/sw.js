/* Evia Basic: works offline. A new version waits until Evia Basic is next opened; it never reloads by itself. */
const VERSION = "evia-basic-v2";
const CACHE = "eviabasic-" + VERSION;
const FILES = ["./", "./index.html", "./style.css?v=eb2", "./topics.js?v=eb2", "./app.js?v=eb2", "./vendor/jspdf.umd.min.js", "./vendor/pdfjs-3.11.174/pdf.min.js", "./vendor/pdfjs-3.11.174/pdf.worker.min.js", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-180.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n.startsWith("eviabasic-") && n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())));
self.addEventListener("message", e => { if (e.data === "update" || (e.data && e.data.type === "SKIP_WAITING")) self.skipWaiting(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => caches.match("./index.html"))));
});

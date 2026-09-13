const CACHE = "vipecam-shell-v1";
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"]))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("vipecam-shell-") && key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
// Never cache authenticated pages, API responses, prices or booking data.
self.addEventListener("fetch", event => { if (event.request.mode === "navigate" && event.request.method === "GET") event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html"))); });

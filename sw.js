
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open("letrasync-v20").then(cache => cache.addAll(["/", "/index.html", "/app.js", "/manifest.json"])));
});
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});

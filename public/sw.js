/* CrazyJam service worker - makes the studio installable (PWA) and fast on
   repeat visits. App shell is cached; API/auth calls always go to network. */
const CACHE = "crazyjam-shell-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never cache API or auth traffic - always hit the network.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return; // fall through to network
  }
  // Navigation requests: network-first, fall back to cached shell (offline app feel).
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }
  // Static assets: cache-first.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
      if (resp.ok && (url.origin === self.location.origin)) {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
      }
      return resp;
    }).catch(() => cached))
  );
});

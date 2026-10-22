/* Sparkle service worker (WBS 4.6). Static assets cache-first; pages network-first with an offline fallback.
   Never caches API responses or anything under /app data fetches (private student data, NFR privacy). */
const VERSION = "v2";
const STATIC = `sparkle-static-${VERSION}`;
const OFFLINE = "/offline";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll([OFFLINE, "/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(ks.filter((k) => k.startsWith("sparkle-") && k !== STATIC).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Video is streamed with Range requests (206 Partial Content); never cache it — let the browser/CDN handle it.
  if (req.headers.has("range") || /\.(mp4|webm)$/.test(url.pathname)) return;
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|woff2|jpg)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.status === 200) c.put(req, res.clone()); // only full responses (never 206/opaque)
        return res;
      }),
    );
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
  }
});

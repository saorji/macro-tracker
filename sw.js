/* Macro Tracker service worker.
   Built by build.sh, which stamps VERSION with a hash of the app's contents —
   a new build therefore produces a byte-different sw.js, which is what makes
   the browser notice an update at all.

   Strategy: cache-first for everything precached. The app is a single static
   file with no runtime fetches, so serving it from the cache makes the Home
   Screen icon open instantly and, more to the point, work with no signal —
   a gym or a restaurant is exactly where a food tracker is needed and the
   network is worst. Updates arrive through the service-worker lifecycle
   instead: the browser re-fetches this script, sees a new VERSION, precaches
   the new files, and the page then asks before reloading, so an update can
   never interrupt something half-logged. */
const VERSION = 'ca0db714c585';
const CACHE = 'macrotracker-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  // cache:'reload' so a stale HTTP cache can't seed the new version with old bytes
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .catch(err => console.warn('precache failed', err)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('macrotracker-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* The page sends this after the person accepts the update prompt. */
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // A navigation must always resolve to the app shell, even offline and even
  // for a URL we never cached (a hash route, say).
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      if (cached) return cached;
      try { return await fetch(req); }
      catch (err) { return new Response('Offline and no cached copy yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }
    })());
    return;
  }

  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const res = await fetch(req);
    // opaque and error responses are not worth persisting
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
    }
    return res;
  })());
});

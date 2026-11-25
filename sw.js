const CACHE = 'memofit-v4';
const SHELL = ['./', './index.html', './style.css?v=4', './app.js?v=4', './manifest.json', './impressum.html', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './fonts/InstrumentSerif-italic-latin-ext.woff2', './fonts/InstrumentSerif-italic-latin.woff2', './fonts/InstrumentSerif-normal-latin-ext.woff2', './fonts/InstrumentSerif-normal-latin.woff2', './fonts/Inter-normal-latin-ext.woff2', './fonts/Inter-normal-latin.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(cached => cached || fetch(e.request))
  );
});

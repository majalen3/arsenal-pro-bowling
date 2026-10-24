'use strict';
// Arsenal Pro 2.0 service worker.
// Network-first for the app shell (deploys show up on next load), cache fallback when offline. API calls are never cached.
// Updates: a new worker waits and the page shows "A new version is ready · Refresh" (message 'skip').
// Exception: upgrading from the v1 single-file app (cache 'arsenal-pro-v2'), which has no update prompt, activates immediately.
const CACHE = 'arsenal-pro-v23';
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icon.svg', 'icons/icon-192.png',
  'js/main.js', 'js/store.js', 'js/ui.js', 'js/router.js', 'js/engine.js', 'js/data.js', 'js/lane.js', 'js/deck.js', 'js/pinsim.js', 'js/ctl.js', 'js/labels.js', 'js/patdata.js',
  'js/screens/lane.js', 'js/screens/pickers.js', 'js/screens/arsenal.js', 'js/screens/insights.js', 'js/screens/ball.js', 'js/screens/compare.js',
  'js/screens/patterns.js', 'js/screens/pattern.js', 'js/screens/sessions.js', 'js/screens/more.js', 'js/screens/welcome.js', 'data/patterns-index.json',
  'js/hub.js', 'js/sync.js', 'js/screens/import.js', 'js/data/schema.js', 'js/data/events.js', 'js/data/project.js', 'js/data/scoring.js', 'js/data/validate.js',
  'js/data/migrate.js', 'js/data/idb.js', 'js/data/db.js', 'js/data/backup.js', 'js/data/seed.js',
  'js/data/csv.js', 'js/data/match.js', 'js/data/importer.js', 'js/data/lanetrax.js', 'js/data/sync.js',
  'js/cc/rank.js', 'js/cc/model.js', 'js/cc/quicklog.js', 'js/screens/tonight.js', 'js/cc/bag.js', 'js/screens/bag.js',
  'js/cc/cats.js', 'js/cc/addball.js', 'js/data/spec_catalog.js', 'js/screens/addball.js', 'js/cc/target.js', 'js/cc/strikeline.js', 'js/cc/geom.js', 'js/screens/target.js', 'js/cc/advisor.js', 'js/cc/card.js', 'js/screens/card.js', 'js/screens/session.js', 'js/cc/night.js', 'js/cc/line.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => caches.has('arsenal-pro-v2')).then((legacy) => { if (legacy) return self.skipWaiting(); }));
});
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});

'use strict';
// Arsenal Pro 2.0 service worker.
// Atomic cache-first shell: migration and UI modules stay in one installed release, online or offline. API calls are never cached.
// Updates: a new worker waits and the page shows "A new version is ready · Refresh" (message 'skip').
// Exception: upgrading from the v1 single-file app (cache 'arsenal-pro-v2'), which has no update prompt, activates immediately.
const CACHE = 'arsenal-pro-v76';
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icon.svg', 'icons/icon-192.png',
  'js/main.js', 'js/store.js', 'js/ui.js', 'js/router.js', 'js/engine.js', 'js/data.js', 'js/lane.js', 'js/deck.js', 'js/pinsim.js', 'js/ctl.js', 'js/laneseed.js', 'js/labels.js', 'js/patdata.js',
  'js/screens/lane.js', 'js/screens/pickers.js', 'js/screens/arsenal.js', 'js/screens/insights.js', 'js/screens/ball.js', 'js/screens/compare.js',
  'js/screens/patterns.js', 'js/screens/pattern.js', 'js/screens/sessions.js', 'js/screens/more.js', 'js/screens/learn.js', 'js/screens/welcome.js', 'data/patterns-index.json',
  'js/hub.js', 'js/sync.js', 'js/screens/import.js', 'js/data/schema.js', 'js/data/events.js', 'js/data/project.js', 'js/data/scoring.js', 'js/data/validate.js',
  'js/data/privacy.js', 'js/data/foundation.js', 'js/data/migrate.js', 'js/data/idb.js', 'js/data/db.js', 'js/data/backup.js', 'js/data/local_recovery.js', 'js/screens/recovery.js', 'js/data/seed.js',
  'js/account.js', 'js/data/account.js', 'js/screens/account.js',
  'js/data/csv.js', 'js/data/match.js', 'js/data/importer.js', 'js/data/lanetrax.js', 'js/data/sync.js',
  'js/cc/rank.js', 'js/cc/model.js', 'js/cc/quicklog.js', 'js/cc/fix.js', 'js/cc/center.js', 'js/cc/ownpat.js', 'js/cc/drill.js', 'js/screens/tonight.js', 'js/cc/bag.js', 'js/screens/bag.js', 'js/cc/status.js', 'js/screens/status.js',
  'js/cc/ownership.js', 'js/cc/cats.js', 'js/cc/addball.js', 'js/data/spec_catalog.js', 'js/screens/addball.js', 'js/cc/target.js', 'js/cc/strikeline.js', 'js/cc/geom.js', 'js/screens/target.js', 'js/cc/advisor.js', 'js/cc/bagedit.js', 'js/cc/gametotal.js', 'js/screens/gametotal.js', 'js/cc/corner.js', 'js/screens/corner.js', 'js/cc/export.js', 'js/screens/export.js', 'js/cc/card.js', 'js/screens/card.js', 'js/screens/session.js', 'js/screens/fixgame.js', 'js/cc/night.js', 'js/cc/line.js', 'js/cc/league.js', 'js/cc/protect.js', 'js/cc/wake.js', 'js/cc/aimbox.js', 'js/screens/overlays.js', 'js/cc/armory.js', 'js/cc/help.js', 'js/screens/help.js', 'data/glossary.json', 'js/cc/hand.js', 'js/screens/hand.js',
  // Community (2026-10-31): My Team, conduct, share cards, Season Wrapped, pro shop kit (vendored MIT QR encoder).
  'js/cc/community.js', 'js/data/team.js', 'js/screens/team.js', 'js/screens/conduct.js', 'js/screens/community.js', 'js/screens/cards.js', 'js/screens/wrapped.js',
  'js/cc/kit.js', 'js/screens/kit.js', 'js/vendor/qrcode.js',
  // Drill card import (2026-11-01). The ~5 MB on-device reader under js/vendor/tesseract/ is NOT precached: it loads only when the
  // bowler taps "Read the card", then the runtime cache below keeps it for offline use.
  'js/cc/drillcard.js', 'js/screens/drillscan.js',
  // Now items 2-6 (2026-11-02): on-device counters + local flags, Me > Tests and usage, earned badges.
  'js/cc/ux.js', 'js/cc/provenance.js', 'js/screens/usage.js', 'js/cc/nightdone.js', 'js/screens/strike.js', 'js/cc/pocketfit.js', 'js/cc/keep.js',
  // v75 (owner t134u): opt-in local perf marks (?perf=1), a no-op otherwise.
  'js/perf.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map(p => new Request(p, { cache:'reload' })))).then(() => caches.has('arsenal-pro-v2')).then((legacy) => { if (legacy) return self.skipWaiting(); }));
});
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('arsenal-pro-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || /\/api(?:\/|$)/.test(u.pathname)) return;
  const entry = [new URL('./', self.location.href).pathname, new URL('index.html', self.location.href).pathname].includes(u.pathname);
  const shell = entry || SHELL.some(p => new URL(p, self.location.href).pathname === u.pathname);
  e.respondWith(caches.open(CACHE).then(async cache => {
    if (shell) { const hit = await cache.match(entry ? 'index.html' : e.request, { ignoreSearch:true }); if (hit) return hit; }
    try { const r = await fetch(e.request); if (r.ok) await cache.put(e.request, r.clone()); return r; }
    catch (_) { return (await cache.match(e.request, { ignoreSearch:true })) || Response.error(); }
  }));
});

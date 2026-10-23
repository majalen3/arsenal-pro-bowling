import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { migrateV0 } from '../../js/data/migrate.js';
import { createDB } from '../../js/data/db.js';
import { memoryBackend, localStorageBackend } from '../../js/data/idb.js';
import { mkEvent, voidEvent, voidImport } from '../../js/data/events.js';
import { project } from '../../js/data/project.js';
import { check, checkDate, toMph, toFt } from '../../js/data/validate.js';
import { buildBackup, readBackup, restoreBackup } from '../../js/data/backup.js';
import { seedEvents, SEED_ID } from '../../js/data/seed.js';
import { chip } from '../../js/data/schema.js';
const v0 = JSON.parse(fs.readFileSync(new URL('./fixtures/v0-sample.json', import.meta.url)));
delete v0._note;
const NOW = Date.parse('2026-10-23T12:00:00Z');

test('migration golden: counts per key', () => {
  const r = migrateV0(v0, { now: NOW });
  assert.deepEqual({ lines: r.report.lines, surface: r.report.surface, notes: r.report.notes, shots: r.report.shots, sessions: r.report.sessions, profile: r.report.profile, owned: r.report.owned }, { lines: 2, surface: 1, notes: 2, shots: 3, sessions: 2, profile: 1, owned: 2 });
  assert.deepEqual(r.outbox.dels, [1003, 1004]);
  const P = project(r.events);
  assert.equal(Object.keys(P.lines).length, 2);
  assert.equal(P.lines['rattler-big-bite|Fresh 2nd arrow'].serverId, 7);
  assert.equal(P.lines['ice-storm|Spares'].note, '<b>x</b>', 'text kept verbatim (rendered as text)');
  assert.equal(P.notes.length, 2, 'identical notes are not deduped');
  assert.ok(P.notes.every(n => n.date === null));
  assert.equal(P.shots.length, 3); assert.equal(Object.keys(P.sessions).length, 2);
  assert.ok(Object.values(P.sessions).every(s => s.synthetic && s.kind === 'legacy'));
  assert.equal(P.bowler.hand, 'right'); assert.equal(P.bowler.speed.v, 15); assert.equal(P.bowler.speed.at, 'unknown');
  assert.equal(Object.keys(P.owned).length, 2);
  assert.equal(P.surface[0].type, 'surfaceChange');
});
test('migration is idempotent (re-run adds 0 events) and keeps the legacy snapshot', async () => {
  const db = await createDB(memoryBackend(), { deviceId: 'd-test0001' }).open();
  const a = await db.migrate(v0, NOW); assert.ok(a.ran); assert.equal(a.added, 13);
  const h = db.hash();
  const r2 = migrateV0(v0, { now: NOW + 5000 }); const add2 = await db.append(r2.events); assert.equal(add2.length, 0);
  const b = await db.migrate(v0, NOW + 9000); assert.equal(b.ran, false);
  assert.equal(db.hash(), h);
  assert.deepEqual(db.meta.legacySnapshot.keys, v0);
});
test('migration of empty / corrupt keys', () => {
  const r = migrateV0({ ap_lines: 'not json', ap_notes: null, ap_profile: '[]', ap_shots: '[null, 3, {"t":"x"}]' }, { now: NOW });
  assert.equal(r.report.lines, 0); assert.equal(r.report.profile, 0); assert.equal(r.report.shots, 1);
});
test('per-field last-writer-wins across devices', () => {
  const a = mkEvent('bowler.edited', 'me', { fields: { hand: 'right', style: 'stroker' } }, { ts: 100, deviceId: 'A' });
  const b = mkEvent('bowler.edited', 'me', { fields: { style: 'tweener' } }, { ts: 200, deviceId: 'B' });
  const c = mkEvent('bowler.edited', 'me', { fields: { hand: 'left' } }, { ts: 150, deviceId: 'B' });
  for (const order of [[a, b, c], [c, b, a], [b, a, c]]) { const P = project(order); assert.equal(P.bowler.hand, 'left'); assert.equal(P.bowler.style, 'tweener'); }
});
test('voids and import undo', () => {
  const imp = 'imp-1';
  const e1 = mkEvent('shot.logged', 's1', { sessionId: 's1' }, { ts: 1, importId: imp });
  const e2 = mkEvent('shot.logged', 's1', { sessionId: 's1' }, { ts: 2 });
  const e3 = mkEvent('import.created', imp, { kind: 'csv' }, { ts: 1, importId: imp });
  assert.equal(project([e1, e2, e3]).shots.length, 2);
  const P = project([e1, e2, e3, voidImport(imp, { ts: 3 })]); assert.equal(P.shots.length, 1);
  assert.equal(project([e1, e2, voidEvent(e2.id, { ts: 4 })]).shots.length, 1);
});
test('validators', () => {
  assert.equal(check('speed', 15).level, 'ok'); assert.equal(check('speed', 26).level, 'warn'); assert.equal(check('speed', 41).ok, false);
  assert.equal(check('rev', 700).level, 'warn'); assert.equal(check('rg', 2.95).ok, false); assert.equal(check('diff', 0.07).level, 'warn');
  assert.equal(check('board', 46).ok, false); assert.equal(check('patternFt', 55).level, 'warn'); assert.equal(check('rev', 'abc').ok, false);
  assert.equal(checkDate('2099-01-01', NOW).ok, false); assert.equal(checkDate('2026-10-24', NOW).ok, true);
  assert.ok(Math.abs(toMph(22.4, 'kph') - 13.92) < 0.01); assert.ok(Math.abs(toFt(10, 'm') - 32.81) < 0.01);
});
test('backup round trip: export → wipe → restore gives the identical projection hash', async () => {
  const db = await createDB(memoryBackend(), { deviceId: 'd-test0002' }).open();
  await db.migrate(v0, NOW); await db.append(seedEvents({ deviceId: 'd-test0002', now: NOW }));
  const h = db.hash(), n = db.events().length;
  const b = await buildBackup(db, { now: NOW });
  const text = JSON.stringify(b);
  await db.wipe(); assert.equal(db.events().length, 0);
  const parsed = await readBackup(text, db); assert.ok(parsed.ok); assert.ok(parsed.hashOk); assert.equal(parsed.counts.new, n);
  await restoreBackup(db, parsed); assert.equal(db.hash(), h);
  const again = await readBackup(text, db); assert.equal(again.counts.new, 0, 'restoring twice adds nothing');
  const tampered = JSON.parse(text); tampered.events[0].data = { x: 1 }; assert.equal((await readBackup(JSON.stringify(tampered), db)).hashOk, false);
  assert.equal((await readBackup('{"app":"other"}')).ok, false);
});
test('localStorage backend persists across reopen', async () => {
  const store = {}; const ls = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const db = await createDB(localStorageBackend(ls), { deviceId: 'd-x' }).open(); await db.append(seedEvents({ now: NOW }));
  const db2 = await createDB(localStorageBackend(ls)).open(); assert.equal(db2.events().length, db.events().length); assert.equal(db2.hash(), db.hash());
});
test('seed: owner arsenal is user-reported and undoable as one import', () => {
  const ev = seedEvents({ now: NOW }); const P = project(ev);
  assert.equal(Object.keys(P.owned).length, 10);
  assert.ok(ev.every(e => e.prov.ref === 'user-reported' && e.importId === SEED_ID));
  const ra = P.owned['own-rack-attack']; assert.equal(ra.catalogId, null); assert.equal(ra.note, 'type unverified'); assert.ok(!/urethane/i.test(JSON.stringify(ra)));
  assert.equal(P.bags['bag-league'].slots.length, 3); assert.equal(P.bags['bag-tournament'].slots.length, 6);
  assert.equal(P.bowler.speed.at, 'unknown'); assert.equal(chip(P.bowler.speed.prov), 'you (reported)');
  assert.equal(Object.keys(project([...ev, voidImport(SEED_ID, { ts: NOW + 99 })]).owned).length, 0);
});
test('no history truncation in store.js persistence (.slice(-N) removed)', () => {
  const src = fs.readFileSync(new URL('../../js/store.js', import.meta.url), 'utf8');
  assert.equal((src.match(/\.slice\(-/g) || []).length, 0);
});

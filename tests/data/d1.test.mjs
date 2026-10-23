// D1 import pipeline: RFC 4180 CSV, presets, score shapes, matcher, plans (preview → commit → undo), dedupe, privacy.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { parseCSV, sniffDelimiter, safeCell, toCSV, autoMap, headerFingerprint, presetFor, savePreset, RUBY_PRESET, parseScores, scoreShape, mapRows, parseDate, looksLikeFormula } from '../../js/data/csv.js';
import { matchBall, norm } from '../../js/data/match.js';
import { planCsv, findDuplicate } from '../../js/data/importer.js';
import { createDB } from '../../js/data/db.js';
import { memoryBackend } from '../../js/data/idb.js';
import { voidImport } from '../../js/data/events.js';
import { projectionHash } from '../../js/data/project.js';
import { seedEvents } from '../../js/data/seed.js';
const NOW = Date.parse('2026-10-23T12:00:00Z');
const memStore = () => { let v = {}; return { get: () => v, set: x => { v = JSON.parse(JSON.stringify(x)); } }; };

test('RFC 4180: quoted comma', () => assert.deepEqual(parseCSV('a,b\n"x,y",2\n').rows, [['a', 'b'], ['x,y', '2']]));
test('RFC 4180: escaped quotes', () => assert.deepEqual(parseCSV('a\n"he said ""hi"""\n').rows[1], ['he said "hi"']));
test('RFC 4180: newline inside quotes', () => assert.deepEqual(parseCSV('a,b\n"line1\nline2",z\n').rows[1], ['line1\nline2', 'z']));
test('RFC 4180: CRLF and lone CR line ends', () => { assert.deepEqual(parseCSV('a,b\r\n1,2\r\n').rows, [['a', 'b'], ['1', '2']]); assert.deepEqual(parseCSV('a,b\r1,2').rows, [['a', 'b'], ['1', '2']]); });
test('RFC 4180: no trailing newline, empty cells, empty quoted cell', () => assert.deepEqual(parseCSV('a,b,c\n1,,""').rows[1], ['1', '', '']));
test('RFC 4180: blank lines skipped', () => assert.equal(parseCSV('a\n\n1\n\n').rows.length, 2));
test('RFC 4180: unclosed quote is reported, not thrown', () => { const r = parseCSV('a,b\n"oops,1\n'); assert.ok(r.errors.length === 1 && /Unclosed quote/.test(r.errors[0])); });
test('BOM stripped and reported', () => { const r = parseCSV('\uFEFFDate,Score\n2026-10-18,200\n'); assert.equal(r.bom, true); assert.equal(r.rows[0][0], 'Date'); });
test('delimiter sniff: semicolon (EU), tab, and a comma inside quotes does not fool it', () => {
  assert.equal(sniffDelimiter('a;b;c\n1,5;2;3\n'), ';'); assert.equal(sniffDelimiter('a\tb\n1\t2\n'), '\t'); assert.equal(sniffDelimiter('"a,x";b\n"1,2";3\n'), ';');
  assert.deepEqual(parseCSV('Date;Score\n2026-10-18;201\n').rows[1], ['2026-10-18', '201']);
});
test('formula cells: parsed as plain text, flagged, and neutralised on export', () => {
  for (const f of ['=1+2', '+SUM(A1)', '-2+3', '@cmd']) { assert.equal(parseCSV('x\n' + f + '\n').rows[1][0], f); assert.equal(safeCell(f)[0], "'"); assert.ok(looksLikeFormula(f)); }
  assert.equal(looksLikeFormula('-12'), false, 'plain negative numbers are not formulas');
  assert.equal(toCSV([['=HYPERLINK("x")', 'a,b']]), `"'=HYPERLINK(""x"")","a,b"\r\n`);
  const m = mapRows([['=cmd|calc', '15']], { 1: 'rev' }); assert.ok(m.issues.some(i => /formula/.test(i.text)));
});
test('score shape: wide "Game N" columns', () => { const r = parseScores('Date,Game 1,Game 2,Game 3\n2026-10-18,201,188,222\n'); assert.equal(r.shape, 'wide'); assert.deepEqual(r.games.map(g => g.score), [201, 188, 222]); });
test('score shape: single score column', () => { const r = parseScores('date,score\n2026-10-18,190\n2026-10-18,abc\n'); assert.equal(r.shape, 'score'); assert.equal(r.games.length, 1); assert.equal(r.errors.length, 1); });
test('score shape: plain numbers', () => { const r = parseScores('190 205,177\n'); assert.equal(r.shape, 'plain'); assert.deepEqual(r.games.map(g => g.score), [190, 205, 177]); });
test('score shape: frame/shot rows are scored with USBC rules (perfect game = 300)', () => {
  const rows = ['game,frame,shot,pins']; for (let f = 1; f <= 9; f++) rows.push(`1,${f},1,10`); rows.push('1,10,1,10', '1,10,2,10', '1,10,3,10');
  const r = parseScores(rows.join('\n')); assert.equal(r.shape, 'frames'); assert.equal(r.games[0].score, 300); assert.equal(r.games[0].complete, true);
});
test('score shape: frame rows without frame numbers get them from the scorer; bad pins collected', () => {
  const r = parseScores('game,shot,pins\n1,1,9\n1,2,1\n1,1,11\n1,1,7\n'); assert.equal(r.errors.length, 1); assert.deepEqual(r.games[0].throws.map(t => t.frame), [1, 1, 2]);
});
test('scores out of range are row errors (0–300), never thrown', () => { const r = parseScores('score\n301\n-1\n250\n'); assert.deepEqual(r.games.map(g => g.score), [250]); assert.equal(r.errors.length, 2); });
test('auto-map headers + speed unit from header', () => {
  const a = autoMap(['Date', 'Ball used', 'Speed (km/h)', 'Rev Rate', 'Axis Rotation', 'Axis Tilt', 'Comments']);
  assert.deepEqual(Object.values(a.map), ['date', 'ball', 'speed', 'rev', 'axisRotation', 'axisTilt', 'note']); assert.equal(a.units.speed, 'kph');
});
test('mapRows: kph → mph, speed needs a measurement point, validators warn/error', () => {
  const m = mapRows([['2026-10-18', '27.36', '800']], { 0: 'date', 1: 'speed', 2: 'rev' }, { speedUnit: 'kph', speedAt: 'release' });
  assert.equal(m.rows[0].speed.v, 17); assert.equal(m.rows[0].speed.at, 'release'); assert.equal(m.rows[0].speed.orig.unit, 'kph');
  assert.ok(m.issues.some(i => i.field === 'rev'), 'rev 800 flagged'); assert.equal(m.rows[0].ok, m.issues.every(i => i.level !== 'error'));
  const n = mapRows([['16']], { 0: 'speed' }, {}); assert.equal(n.rows[0].ok, false);
  const ms = mapRows([['7.6']], { 0: 'speed' }, { speedUnit: 'm/s', speedAt: 'launch' }); assert.equal(Math.round(ms.rows[0].speed.v * 10) / 10, 17);
});
test('dates: ISO and US M/D/Y; anything else is a row error', () => { assert.equal(parseDate('10/18/2026'), '2026-10-18'); assert.equal(parseDate('2026-1-5'), '2026-01-05'); assert.equal(parseDate('18.10.2026'), null); });
test('presets: fingerprint ignores header order/case; second import is one tap', () => {
  assert.equal(headerFingerprint(['Date', 'Speed']), headerFingerprint(['speed', ' DATE']));
  const st = memStore(); assert.equal(presetFor(['a', 'b'], st), null); savePreset(['a', 'b'], { 0: 'date' }, st); assert.deepEqual(presetFor(['B', 'A'], st).mapping, { 0: 'date' });
});
test('Ruby preset is a stub awaiting a sample: no fingerprint, no columns', () => { assert.equal(RUBY_PRESET.status, 'awaiting-sample'); assert.equal(RUBY_PRESET.fingerprint, null); assert.ok(!('mapping' in RUBY_PRESET)); });
test('ball matcher: exact alias auto-fills, noise stripped, fuzzy needs confirmation', () => {
  assert.equal(norm('15LB Storm Hy-Road Pearl USED single drill'), 'storm hy road pearl');
  assert.equal(matchBall('Ice Storm').exact, 'ice-storm');
  const f = matchBall('Hy-Road'); assert.equal(f.exact, null); assert.ok(f.candidates.some(c => c.id === 'hy-road-pearl') && f.candidates.some(c => c.id === 'hy-road'));
  assert.equal(matchBall('Phaze II').candidates.length, 0, 'not in our catalog → no guess');
});
test('plan: fuzzy ball blocks commit until confirmed; picks resolve it', () => {
  const text = 'Date,Ball,Game 1\n2026-10-18,Big Bite,201\n';
  const a = planCsv({ text, now: NOW }); assert.deepEqual(a.unconfirmed, ['Big Bite']); assert.equal(a.canCommit, false);
  const b = planCsv({ text, now: NOW, picks: { 'Big Bite': 'rattler-big-bite' } }); assert.equal(b.canCommit, true);
  assert.equal(b.events.find(e => e.type === 'game.logged').data.ballId, 'rattler-big-bite');
});
test('nothing is persisted before commit; commit → projection; undo restores the prior projection exactly', async () => {
  const db = createDB(memoryBackend(), { deviceId: 'd1' }); await db.open();
  await db.append(seedEvents({ deviceId: 'd1', now: NOW - 1000 }));
  const dataHash = () => projectionHash(Object.assign({}, db.projection(), { imports: null }));
  const before = dataHash(), n0 = db.events().length;
  const plan = planCsv({ text: 'Date,Ball,Game 1,Game 2\n2026-10-18,Ice Storm,201,188\n', fileName: 's.csv', sha256: 'aa'.repeat(32), P: db.projection(), now: NOW });
  assert.equal(db.events().length, n0, 'planning wrote nothing');
  await db.append(plan.events); assert.equal(db.projection().scores.length, 2); assert.equal(db.projection().imports[plan.importId].fileName, 's.csv');
  assert.notEqual(dataHash(), before);
  await db.append([voidImport(plan.importId, { ts: NOW + 1 })]);
  assert.equal(dataHash(), before, 'everything except the import history entry is back exactly');
  assert.equal(db.projection().imports[plan.importId].undone, true);
});
test('re-import detection: same bytes (sha256) and same content re-saved (semantic key) both caught', async () => {
  const db = createDB(memoryBackend(), { deviceId: 'd1' }); await db.open();
  const text = 'Date,Game 1,Game 2\n2026-10-18,201,188\n';
  const p1 = planCsv({ text, sha256: 'ab'.repeat(32), P: db.projection(), now: NOW }); await db.append(p1.events);
  const p2 = planCsv({ text, sha256: 'ab'.repeat(32), P: db.projection(), now: NOW }); assert.equal(p2.dup.by, 'file'); assert.equal(p2.canCommit, false);
  const p3 = planCsv({ text: '\uFEFFDate;Game 1;Game 2\r\n2026-10-18;201;188\r\n', sha256: 'cd'.repeat(32), P: db.projection(), now: NOW }); assert.equal(p3.dup.by, 'content');
  await db.append([voidImport(p1.importId)]); assert.equal(findDuplicate(db.projection(), { sha256: 'ab'.repeat(32) }), null, 'after undo the file can be imported again');
});
test('release CSV → releaseMeasurement rows, not profile values (accept required)', () => {
  const p = planCsv({ text: 'Date,Ball,Speed (mph),Rev\n2026-10-18,Ice Storm,15.2,230\n', speedAt: 'release', now: NOW });
  assert.equal(p.mode, 'release'); assert.equal(p.canCommit, true);
  const m = p.events.filter(e => e.type === 'releaseMeasurement.created'); assert.equal(m.length, 1); assert.equal(m[0].data.accepted, false); assert.equal(m[0].data.speed.at, 'release');
  assert.ok(!p.events.some(e => e.type === 'bowler.edited'));
});
test('performance: 1 000-row CSV plan (parse + validate + match + dedupe) < 1.5 s (desktop budget 300 ms)', () => {
  const rows = ['Date,Ball,Speed (mph),Rev,Axis Rotation,Axis Tilt']; for (let i = 0; i < 1000; i++) rows.push(`2026-10-${String(1 + i % 28).padStart(2, '0')},Ice Storm,${(14 + (i % 30) / 10).toFixed(1)},${200 + i % 100},${30 + i % 30},${10 + i % 10}`);
  const t = performance.now(); const p = planCsv({ text: rows.join('\n'), speedAt: 'release', now: NOW }); const ms = performance.now() - t;
  assert.equal(p.counts.accepted, 1000); assert.ok(ms < 300, `took ${ms.toFixed(0)} ms`);
});
test('privacy: no PDF and no raw CSV under tests/fixtures except documented derived files', () => {
  const root = new URL('../fixtures/', import.meta.url).pathname, bad = [];
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(pdf|csv|xlsx?)$/i.test(f)) bad.push(p); } };
  walk(root); assert.deepEqual(bad, []);
});

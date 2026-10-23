// D2 LaneTrax Session Report PDF parser (DATA_SYSTEM §6.2). The real report is private and never in git:
// its decode test runs only with LANETRAX_SAMPLE=/path/to/report.pdf. Everything else uses the derived fixture.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { recordFromWords, parseLaneTrax, pdfWords, flipBoards, unitsOf, isLaneTraxReport } from '../../js/data/lanetrax.js';
import { planLaneTrax } from '../../js/data/importer.js';
import { createDB } from '../../js/data/db.js';
import { memoryBackend } from '../../js/data/idb.js';
import { voidImport, mkEvent } from '../../js/data/events.js';
import { projectionHash } from '../../js/data/project.js';
import { buildPdf } from './make_pdf.mjs';
const FX = new URL('../fixtures/lanetrax/', import.meta.url);
const WORDS = JSON.parse(fs.readFileSync(new URL('session-report.words.json', FX))).words;
const EXPECTED = JSON.parse(fs.readFileSync(new URL('session-report.expected.json', FX)));
const clone = x => JSON.parse(JSON.stringify(x));
const NOW = Date.parse('2026-10-23T12:00:00Z');

test('fixture words → expected record: exact match', () => assert.deepEqual(recordFromWords(WORDS), EXPECTED));
test('both expected warnings are produced and nothing else', () => assert.deepEqual(recordFromWords(WORDS).warnings.map(w => w.code), ['SHOT_COUNT_GAP', 'IMPACT_SPEED_KPI_VS_TABLE']));
test('full PDF path (Flate + ToUnicode + Td/Tj) via DecompressionStream reproduces the record', async () => {
  const r = await parseLaneTrax(buildPdf(WORDS)); assert.equal(r.ok, true); assert.deepEqual(r.record, EXPECTED); assert.equal(r.producer, 'jsPDF 3.0.4');
});
test('kph report: speeds converted to mph, printed value kept', () => {
  const w = clone(WORDS).map(x => { const m = x.t.match(/^([\d.]+) mph$/); return m ? Object.assign(x, { t: (+m[1] * 1.609344).toFixed(2) + ' kph' }) : x; });
  const r = recordFromWords(w);
  assert.equal(r.summary.launchSpeed.mean, 14); assert.equal(r.summary.launchSpeed.unit, 'mph'); assert.equal(r.summary.launchSpeed.orig.unit, 'kph');
  assert.equal(r.kpis.find(k => k.key === 'impactSpeed').value, 13.93); assert.equal(unitsOf(r).speed, 'kph');
  assert.deepEqual(r.warnings.map(x => x.code), ['SHOT_COUNT_GAP', 'IMPACT_SPEED_KPI_VS_TABLE']);
});
test('m/s and metres: converted to mph and ft', () => {
  const w = clone(WORDS).map(x => { let m = x.t.match(/^([\d.]+) mph$/); if (m) return Object.assign(x, { t: (+m[1] / 2.2369363).toFixed(3) + ' m/s' }); m = x.t.match(/^([\d.]+) ft$/); return m ? Object.assign(x, { t: (+m[1] / 3.2808399).toFixed(3) + ' m' }) : x; });
  const r = recordFromWords(w);
  assert.equal(r.summary.averageSpeed.mean, 13.5); assert.equal(r.summary.breakpointDistance.mean, 30.5); assert.equal(r.summary.breakpointDistance.unit, 'ft'); assert.equal(unitsOf(r).distance, 'm');
});
test('non-LaneTrax PDFs are refused, nothing parsed', async () => {
  const other = buildPdf([{ p: 1, x: 40, y: 700, t: 'Quarterly Report' }]);
  assert.equal((await parseLaneTrax(other)).ok, false);
  const wrongProducer = buildPdf(WORDS, { producer: 'Microsoft Word' });
  assert.equal((await parseLaneTrax(wrongProducer)).ok, false, 'title alone is not enough: producer must be jsPDF');
  assert.equal((await parseLaneTrax(new TextEncoder().encode('Date,Score\n'))).ok, false);
  assert.equal(isLaneTraxReport(WORDS, 'jsPDF 3.0.4'), true);
});
test('a refused file writes nothing', async () => {
  const db = createDB(memoryBackend(), { deviceId: 'd' }); await db.open(); const n = db.events().length;
  const r = await parseLaneTrax(buildPdf([{ p: 1, x: 40, y: 700, t: 'Invoice' }])); assert.equal(r.ok, false); assert.equal(db.events().length, n);
});
test('unknown summary column goes to extra with a warning (not dropped)', () => {
  const w = clone(WORDS); w.push({ p: 3, x: 560, y: 664.9, t: 'Axis Tilt' }, { p: 3, x: 562, y: 634.2, t: '9.0 °' }, { p: 3, x: 562, y: 610.4, t: '12.0 °' });
  const r = recordFromWords(w); assert.equal(r.extra['Axis Tilt'].mean, 12); assert.ok(r.warnings.some(x => x.code === 'UNKNOWN_LABEL'));
});
test('flip boards: positions b → 40 − b; hook boards and ranges unchanged', () => {
  const f = flipBoards(EXPECTED);
  assert.equal(f.summary.entryBoard.mean, 19.6); assert.equal(f.summary.arrows.mean, 25.4); assert.equal(f.summary.foulLine.mean, 25.5); assert.equal(f.summary.breakpointBoard.mean, 28.2);
  assert.equal(f.summary.hookBoards.mean, 10); assert.equal(f.summary.entryBoard.range, 36.7); assert.equal(EXPECTED.summary.entryBoard.mean, 20.4, 'input not mutated');
});
test('plan: session + device-provenance aggregate + 4 pending measurements; 0 per-shot values; profile untouched', () => {
  const p = planLaneTrax({ record: EXPECTED, now: NOW, deviceId: 'd' });
  const types = p.events.map(e => e.type);
  assert.deepEqual(types, ['import.created', 'session.created', 'sessionAggregate.created', 'releaseMeasurement.created', 'releaseMeasurement.created', 'releaseMeasurement.created', 'releaseMeasurement.created']);
  assert.equal(types.filter(t => t === 'shot.logged' || t === 'game.logged').length, 0);
  assert.ok(!types.includes('bowler.edited'));
  const agg = p.events[2]; assert.deepEqual([agg.prov.kind, agg.prov.device, agg.prov.method, agg.prov.n], ['device', 'LaneTrax', 'session-report-pdf', null]);
  assert.equal(agg.data.boardsReadAs, 'RH'); assert.equal(agg.data.units.hand, null);
  const kpiImp = agg.data.kpis.find(k => k.key === 'impactSpeed').value, tabImp = agg.data.summary.impactSpeed.mean; assert.deepEqual([kpiImp, tabImp], [13.93, 13], 'both impact speeds kept');
  assert.equal(agg.data.totalShots, 90); assert.equal(Object.values(agg.data.outcomes).reduce((a, o) => a + o.n, 0), 86, 'both shot counts kept');
  const ms = p.events.filter(e => e.type === 'releaseMeasurement.created').map(e => e.data);
  assert.deepEqual(ms.map(m => m.speed ? m.speed.at : 'rev'), ['launch', 'average', 'impact', 'rev']); assert.ok(ms.every(m => m.accepted === false && m.n === null));
});
test('commit → projection; same report again is detected; undo restores the prior projection exactly', async () => {
  const db = createDB(memoryBackend(), { deviceId: 'd' }); await db.open();
  const h0 = projectionHash(Object.assign({}, db.projection(), { imports: null }));
  const p = planLaneTrax({ record: EXPECTED, sha256: 'ee'.repeat(32), P: db.projection(), now: NOW }); assert.equal(db.events().length, 0, 'plan writes nothing');
  await db.append(p.events); const P = db.projection(); assert.equal(P.aggregates.length, 1); assert.equal(P.measurements.length, 4); assert.equal(P.shots.length, 0);
  const again = planLaneTrax({ record: clone(EXPECTED), sha256: 'ff'.repeat(32), P, now: NOW }); assert.equal(again.dup.by, 'content'); assert.equal(again.canCommit, false);
  assert.equal(planLaneTrax({ record: EXPECTED, P, allowDup: true }).canCommit, true, 'user may re-import as a new session');
  await db.append([voidImport(p.importId, { ts: NOW + 1 })]);
  assert.equal(projectionHash(Object.assign({}, db.projection(), { imports: null })), h0);
});
test('accepting a measurement is an event; the projection marks it accepted', async () => {
  const db = createDB(memoryBackend(), { deviceId: 'd' }); await db.open();
  const p = planLaneTrax({ record: EXPECTED, now: NOW }); await db.append(p.events);
  const m = db.projection().measurements[0]; await db.append([mkEvent('releaseMeasurement.accepted', m.id, { measurementId: m.id }, { ts: NOW + 5 })]);
  assert.equal(db.projection().measurements[0].accepted, true); assert.equal(db.projection().measurements[1].accepted, false);
});
const SAMPLE = process.env.LANETRAX_SAMPLE;
test('real sample decodes (LANETRAX_SAMPLE only; skipped in CI) in < 2 s', { skip: !SAMPLE && 'LANETRAX_SAMPLE not set' }, async () => {
  const bytes = new Uint8Array(fs.readFileSync(SAMPLE)); const t = performance.now(); const r = await parseLaneTrax(bytes); const ms = performance.now() - t;
  assert.equal(r.ok, true); assert.ok(ms < 2000, `${ms.toFixed(0)} ms`);
  const strip = rec => Object.assign(clone(rec), { date: null }); assert.deepEqual(strip(r.record), strip(EXPECTED), 'same record as the derived fixture except the date');
  const w = await pdfWords(bytes); assert.equal(w.words.length, 102, 'all 102 text runs recovered');
});

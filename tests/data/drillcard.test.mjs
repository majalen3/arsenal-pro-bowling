import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../../js/cc/drillcard.js';

test('fractions as pro shops write them', () => {
  assert.equal(D.parseFrac('5 1/8').v, 5.125);
  assert.equal(D.parseFrac('41/64').v, 41 / 64);
  const p = D.parseFrac('1/4+'); assert.equal(p.v, 0.25); assert.equal(p.plus, true); assert.equal(p.txt, '1/4+');
  assert.equal(D.parseFrac('.040').v, 0.04);
  assert.equal(D.parseFrac('- 1/4').v, -0.25);
  assert.equal(D.parseFrac('+3/8').v, 0.375);
  assert.equal(D.parseFrac('3 11/16').v, 3.6875);
  assert.equal(D.parseFrac('5\u20441\u20448'), null);
  for (const bad of ['', 'x', '1/0', '1//2', 'Hole']) assert.equal(D.parseFrac(bad), null, bad);
});

test('OCR mixed-number repairs are proper fractions only', () => {
  assert.equal(D.repairMixed('41/8'), '4 1/8');
  assert.equal(D.repairMixed('311/16'), '3 11/16');
  assert.equal(D.repairMixed('41/4+'), '4 1/4+');
  assert.equal(D.repairMixed('11/16'), null);     // a real proper fraction stays
  assert.equal(D.splitMixed('11/64'), '1 1/64');
});

test('PAP sign convention: over always positive, up +, down -', () => {
  const p = D.papOf('5 1/8', '+ 3/8'); assert.deepEqual([p.over, p.up], [5.125, 0.375]); assert.equal(D.papText(p), '5 1/8 x 3/8 up');
  const q = D.papOf('4 7/8', '- 1/4'); assert.equal(q.up, -0.25); assert.equal(D.papText(q), '4 7/8 x 1/4 down');
  assert.equal(D.papText(D.papOf('5', '0')), '5 x 0');
  assert.equal(D.papOf('-1', '0'), null);
  assert.equal(D.papOf('5', '4'), null);
  assert.deepEqual(D.papFromText('4 3/4 x 1/2 up'), { over: 4.75, up: 0.5, overTxt: '4 3/4', upTxt: '1/2' });
  assert.equal(D.papFromText('5 1/8 over 3/8 down').up, -0.375);
});

test('PAP comparison is plain info', () => {
  const c = D.papCompare('4 3/4 x 1/2 up', D.papOf('5 1/8', '3/8'));
  assert.equal(c.same, false);
  assert.match(c.lines[1], /3\/8" more over, 1\/8" lower/);
  assert.ok(!/should|better|worse|recommend/i.test(c.lines.join(' ')));
  assert.equal(D.papCompare('5 1/8 x 3/8 up', D.papOf('5 1/8', '3/8')).lines[1], 'They match.');
  assert.match(D.papCompare('', D.papOf('5', '0')).lines[1], /No PAP saved/);
});

test('every card field is in the form, with physical sanity checks only', () => {
  for (const k of ['name', 'hand', 'grip', 'notes', 'lf.size', 'lf.pitchFR', 'lf.pitchLR', 'lf.hole', 'lf.cut', 'lf.actual', 'rf.size', 'rf.actual', 'bridge',
    'th.size', 'th.hole', 'th.insert', 'th.pitchFR', 'th.pitchLR', 'th.ovalTo', 'th.ovalAngle', 'pap.over', 'pap.up', 'lay.pinPap', 'lay.drillAngle', 'lay.val', 'lay.vls', 'lay.mb', 'lay.surface'])
    assert.ok(D.FIELD[k], k);
  assert.equal(D.checkField('lf.size', '41/64').ok, true);
  assert.equal(D.checkField('lf.hole', '1 31/32').ok, false);
  assert.equal(D.checkField('hand', 'left').v, 'Left');
  assert.equal(D.checkField('pap.up', '-1/4').ok, true);
  assert.equal(D.checkField('th.size', 'abc').ok, false);
});

test('synthetic card: OCR words become the right guesses, none invented', () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/drillcard-synthetic.words.json', import.meta.url)));
  const { fields } = D.parseWords(fx.words, { width: fx.width });
  const want = { name: 'Sample - Test Card', hand: 'Right', grip: 'Finger', 'lf.size': '11/16', 'rf.size': '43/64', 'lf.pitchLR': '1/4', 'rf.pitchLR': '3/8',
    'lf.pitchFR': '1/8', 'rf.pitchFR': '1/16', 'lf.hole': '15/16', 'rf.hole': '15/16', 'lf.cut': '3 5/8', 'rf.cut': '3 11/16', 'lf.actual': '4 1/8', 'rf.actual': '4 3/16+',
    'th.size': '1 1/64', 'th.hole': '1 1/8', 'th.pitchFR': '1/8', 'th.pitchLR': '1/8', 'th.ovalTo': '.030', 'th.ovalAngle': '30', 'pap.over': '4 7/8', 'pap.up': '-1/4' };
  let hit = 0;
  for (const [k, e] of Object.entries(fields)) { if (k === 'notes' || k === 'th.insert') continue; assert.equal(e.v, want[k], `${k} read as ${e.v}`); hit++; }
  assert.ok(hit >= 20, `only ${hit} fields read`);
  assert.equal(fields['lf.actual'].low, true);          // repaired "41/8" is flagged for checking
  assert.equal(fields['lf.size'].low, false);
  assert.ok(!fields['lay.pinPap'] && !fields['lay.drillAngle']);   // no layout on this card: nothing guessed
  assert.ok(!fields['lf.pitchFRdir']);                                // arrows are left for the bowler
});

test('saved record keeps provenance and only confirmed valid values', () => {
  const r = D.cardRecord({ 'pap.over': { v: '4 7/8', src: 'card' }, 'pap.up': { v: '-1/4', src: 'typed' }, 'lf.size': { v: 'junk', src: 'card' }, 'lay.pinPap': { v: '', src: 'typed' } }, { now: 0 });
  assert.deepEqual(Object.keys(r.fields), ['pap.over', 'pap.up']);
  assert.equal(r.fields['pap.over'].src, 'card'); assert.equal(r.fields['pap.up'].src, 'typed');
  assert.equal(r.pap.text, '4 7/8 x 1/4 down'); assert.equal(r.pap.convention, 'up +, down -');
  assert.equal(D.provLabel('card'), 'read from card');
});

test('vendored OCR stays small enough and is never in the offline shell', () => {
  const dir = new URL('../../js/vendor/tesseract/', import.meta.url);
  const sizes = { 'tesseract.esm.min.js': 80e3, 'worker.min.js': 140e3, 'tesseract-core-simd-lstm.js': 120e3, 'tesseract-core-simd-lstm.wasm': 3.2e6, 'lang/eng.traineddata.gz': 2.2e6 };
  let total = 0;
  for (const [f, max] of Object.entries(sizes)) { const n = fs.statSync(new URL(f, dir)).size; assert.ok(n <= max, `${f} ${n} > ${max}`); total += n; }
  assert.ok(total <= 5.6e6, `total ${total}`);
  for (const f of ['LICENSE-tesseract.js.txt', 'LICENSE-tesseract.js-core.txt']) assert.match(fs.readFileSync(new URL(f, dir), 'utf8'), /Apache License/);
  const sw = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
  assert.ok(!/vendor\/tesseract/.test(sw), 'OCR files must not be precached');
  assert.ok(!fs.readdirSync(new URL('./fixtures/', import.meta.url)).some(f => /\.jpe?g$/i.test(f)), 'no real card photos in the repo');
});

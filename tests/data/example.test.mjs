// De-brand 2026-10-31: the app's one-tap demo data is a clearly labelled Example, not a real bowler's arsenal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedEvents, EXAMPLE_ID, EXAMPLE_LABEL, EXAMPLE_BALLS } from '../../js/data/seed.js';
import { project } from '../../js/data/project.js';
import { chip } from '../../js/data/schema.js';
import { balls } from '../../js/data.js';
import { voidImport } from '../../js/data/events.js';
test('example arsenal: labelled example, catalog balls only, no bowler numbers, one undoable import', () => {
  const ev = seedEvents({ now: 1000 }), P = project(ev), ids = new Set(balls.map(b => b.id));
  assert.match(EXAMPLE_LABEL, /^Example/); assert.match(EXAMPLE_LABEL, /not a real bowler/);
  assert.ok(ev.every(e => e.prov.ref === 'example' && e.importId === EXAMPLE_ID));
  assert.equal(ev.filter(e => e.type === 'bowler.edited').length, 0, 'no hand / speed / revs / PAP');
  assert.equal(Object.keys(P.owned).length, EXAMPLE_BALLS.length);
  assert.ok(Object.values(P.owned).every(o => ids.has(o.catalogId)), 'every example ball is a catalog ball with sourced specs');
  assert.ok(Object.values(P.bags).every(b => /^Example /.test(b.name)));
  assert.match(JSON.stringify(chip({ kind: 'user', ref: 'example' })), /example \(not yours\)/);
  assert.equal(Object.keys(project([...ev, voidImport(EXAMPLE_ID, { ts: 9999 })]).owned).length, 0);
});

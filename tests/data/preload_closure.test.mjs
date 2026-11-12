// v75 (owner t134u): a module that the first screen needs is hinted up front, so a cold phone fetches it in parallel instead of one
// round trip after its importer. Computed from the real static imports, so a new import cannot silently lengthen the chain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { report } from '../perf/preload_closure.mjs';
const r = report();
test('every boot module (main.js + hub.js static closure) has a modulepreload in index.html', () => assert.deepEqual(r.bootMissing, []));
for (const [route, miss] of Object.entries(r.routes)) test(`${route}: every static dependency of its screens is hinted (index.html or routePreloads)`, () => assert.deepEqual(miss, []));

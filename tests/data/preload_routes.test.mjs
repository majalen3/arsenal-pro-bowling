import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('native preload lookup has no inherited hash routes; unknown hashes retain router fallback',()=>{
 const source=readFileSync(new URL('../../js/main.js',import.meta.url),'utf8');
 const literal=source.match(/const routePreloads = (\{[\s\S]*?\n\});/)[1];
 const routes=vm.runInNewContext('('+literal+')');
 assert.equal(Object.getPrototypeOf(routes),null);
 for(const path of ['constructor','__proto__','toString','/missing'])assert.deepEqual([...(routes[path]||[])],[]);
 assert.ok(Array.isArray(routes['/me']));assert.ok(routes['/me'].includes('screens/more'));
 for(const names of Object.values(routes))assert.ok(names.every(n=>/^[\w/-]+$/.test(n)));
});

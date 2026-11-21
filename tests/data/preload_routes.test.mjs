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
// v81 speed: every route's preload list is exactly its screen's static import closure, minus what index.html already preloads
// (main.js's closure) and BOOT_REST. Missing entries cost a round trip per import level; extra entries fetch code the route never runs.
test('route preload lists match each screen module\u2019s import closure (no gaps, no extras)',()=>{
 const root=new URL('../../',import.meta.url),read=f=>{try{return readFileSync(new URL(f,root),'utf8')}catch(e){return null}};
 const re=/(?:from\s*|import\s+)['"](\.{1,2}\/[^'"]+\.js)['"]/g,norm=p=>{const o=[];for(const s of p.split('/')){if(s==='..')o.pop();else if(s!=='.')o.push(s)}return o.join('/')};
 const clo=starts=>{const seen=new Set(),q=[...starts];while(q.length){const f=q.pop();if(seen.has(f))continue;const s=read(f);if(s==null)continue;seen.add(f);
   const dir=f.split('/').slice(0,-1).join('/');for(const m of s.matchAll(re))q.push(norm(dir+'/'+m[1]))}return seen};
 const source=read('js/main.js'),routes=vm.runInNewContext('('+source.match(/const routePreloads = (\{[\s\S]*?\n\});/)[1]+')');
 const boot=vm.runInNewContext(source.match(/const BOOT_REST = (\[[^\]]*\])/)[1]);
 const have=new Set([...clo(['js/main.js']),...clo(boot.map(b=>'js/'+b+'.js'))]);
 const screen={'/me':'more','/welcome':'welcome','/tonight':'tonight','/arsenal':'arsenal','/bag':'bag','/lane':'lane','/target':'target','/results':'sessions','/learn':'learn','/team':'team'};
 assert.deepEqual(Object.keys(routes).sort(),Object.keys(screen).sort());
 const PARTIAL=new Set(['/lane','/target']);   // measured exception (main.js comment): a subset of the closure, never an extra
 for(const [r,s] of Object.entries(screen)){
  const want=[...clo(['js/screens/'+s+'.js'])].filter(f=>!have.has(f)).map(f=>f.replace(/^js\//,'').replace(/\.js$/,'')).sort();
  if(PARTIAL.has(r)){assert.deepEqual([...routes[r]].filter(n=>!want.includes(n)),[],r+': only modules the route imports');continue}
  assert.deepEqual([...routes[r]].sort(),want,r);
 }
});

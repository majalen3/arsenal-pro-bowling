import test from 'node:test';
import assert from 'node:assert/strict';
import { createDB } from '../../js/data/db.js';
import { memoryBackend } from '../../js/data/idb.js';
import { prepareFoundation } from '../../js/data/foundation.js';
import { selectionEvents } from '../../js/cc/ownership.js';
import { mkEvent, isEnvelope, voidImport } from '../../js/data/events.js';
import { project, projectionHash } from '../../js/data/project.js';
import { createSync } from '../../js/data/sync.js';
import { destination } from '../../js/data/privacy.js';
import { createAccount, KEY } from '../../js/data/account.js';
import { buildBackup, readBackup, restoreBackup } from '../../js/data/backup.js';
import { migrateV0 } from '../../js/data/migrate.js';
import { registerOwned, ballFor, ballKey } from '../../js/cc/cats.js';
import { balls } from '../../js/data.js';
import * as A from '../../js/cc/addball.js';
import { mockApi } from './mock_api.mjs';
const db0 = async () => { const d = createDB(memoryBackend(), { deviceId:'fictional-device' }); await d.open(); return d; };
const timer = { set: () => 1, clear() {} };
const session = id => ({ token:'fictional-token-' + id, user:{ id }, pending:false });

test('fresh installation remains empty; all shared catalog entries are available separately', async () => {
  const db = await db0(); await db.migrate({}); await prepareFoundation(db, {});
  assert.equal(Object.keys(db.projection().owned).length, 0); assert.equal(db.meta.ownershipReview.needed, false);
  assert.ok(A.catalog().length > balls.length); assert.ok(A.search('hyrd pearl').candidates.length);
});
test('legacy empty/all22 gets snapshot + review, not guessed ownership; preparation is idempotent and preserves every event', async () => {
  const db = await db0(), keys = { ap_profile:JSON.stringify({ owned:[], pap:'confirmed fictional PAP', speed:17, hand:'left' }), ap_state:'{"eyes":10}', ap_prefs:'{"myLines":{"x":{"lay":14,"eyes":10}}}' };
  await db.migrate(keys); await db.append([mkEvent('session.created', 'fictional-night', { kind:'tonight' }), mkEvent('ownedBall.created', 'kept', { catalogId:balls[0].id, drill:{ layout:'original' } })]);
  const before = structuredClone(db.events()), hash = db.hash();
  await prepareFoundation(db, keys, 50); const meta = structuredClone(db.meta.foundationSnapshot);
  assert.equal(db.meta.ownershipReview.needed, true); assert.deepEqual(db.events(), before); assert.equal(db.hash(), hash);
  assert.deepEqual(db.meta.foundationSnapshot.keys, keys); assert.equal(Object.keys(db.projection().owned).length, 1);
  await prepareFoundation(db, {}, 99); assert.deepEqual(db.meta.foundationSnapshot, meta); assert.deepEqual(db.events(), before);
});
test('review addition retries dedupe; append-only undo returns original projection and keeps layouts/history', async () => {
  const db = await db0(); await db.append([mkEvent('ownedBall.created','original',{ catalogId:balls[0].id, layout:'original-layout' }),mkEvent('session.created','old-night',{ aim:10 })]); const old = db.hash(), n = db.events().length;
  const copy = mkEvent('ownedBall.created','new-copy',{ catalogId:balls[0].id },{ id:'stable-review-copy', importId:'review-batch' });
  assert.equal((await db.append([copy])).length,1); assert.equal((await db.append([copy])).length,0);
  await db.append([voidImport('review-batch')]); assert.equal(db.hash(),old); assert.equal(db.events().length,n+2);
});
test('two copies resolve distinctly, unknown custom balls remain unmodeled, historical model health is not assigned to a first duplicate', () => {
  const id = balls[0].id, p = project([mkEvent('ownedBall.created','a',{catalogId:id,name:'Fictional shiny copy'}),mkEvent('ownedBall.created','b',{catalogId:id,name:'Fictional matte copy'}),mkEvent('ownedBall.created','manual',{name:'Fictional mystery ball'}),mkEvent('ball.gamesLogged','old',{ ballId:id,games:3 }),mkEvent('ball.gamesLogged','copy',{ballId:'b',games:2})]);
  registerOwned(p); assert.equal(ballKey(ballFor('a')),'a'); assert.equal(ballKey(ballFor('b')),'b'); assert.notEqual(ballFor('a').name,ballFor('b').name);
  assert.equal(ballFor('a').legacyLineKey,null); assert.equal(ballFor('manual').rg,null); assert.equal(p.health[id].games,3); assert.equal(p.health.b.games,2); assert.equal(p.health.a,undefined);
});
test('unknown profile numbers do not migrate as zeros', () => { const r=migrateV0({ap_profile:'{"speed":null,"rev":null,"pap":"","owned":[],"ownedVersion":1}'}); const fields=r.events.find(e=>e.type==='bowler.edited').data.fields; assert.equal(fields.speed,undefined); assert.equal(fields.rev,undefined); });
test('default sync is local-only, even with unsynced data; explicit anonymous backup consent can sync', async () => {
  const api=mockApi(),db=await db0();await db.append([mkEvent('ownedBall.created','x',{name:'Fictional'})]);
  let allowed=false;const s=createSync({db,base:'https://api.test',deviceId:'code-fictional',fetchFn:api.fetchFn,timer,allowLegacy:()=>allowed});
  assert.equal((await s.run()).paused,true);assert.equal(api.calls.length,0);assert.equal(s.outbox().length,1);
  allowed=true;assert.equal((await s.run()).ok,true);assert.equal(api.count('code-fictional'),1);
});
test('account signout, foreign account activation and backup code changes fail closed without moving data', async () => {
  const db=await db0();await db.setMeta('accountBinding','A');await db.setMeta('sync',{code:'acct:A'});await db.append([mkEvent('ownedBall.created','private-A',{name:'Fictional'})]);
  let a=null,calls=0;const s=createSync({db,base:'https://api.test',deviceId:()=> 'another-code',fetchFn:()=>{calls++;throw Error('must not send');},timer,auth:()=>a,allowLegacy:()=>true});
  assert.equal((await s.run()).paused,true);a=session('B');assert.equal((await s.run()).paused,true);assert.equal(calls,0);assert.equal(s.state().code,'acct:A');assert.equal(s.outbox().length,1);
  assert.equal(destination({session:a,bound:'A',allowLegacy:true,code:'code'}),null);
});
test('in-flight signout cannot mark private events synced or pull another stream', async () => {
  const db=await db0();await db.append([mkEvent('ownedBall.created','private',{name:'Fictional'})]);let a=session('A'),calls=0;
  const s=createSync({db,base:'https://api.test',deviceId:'code-fictional',timer,auth:()=>a,allowLegacy:()=>true,fetchFn:async()=>{calls++;a=null;return{status:200,headers:{get:()=>null},json:async()=>({events:[]})};}});
  assert.equal((await s.run()).ok,false);assert.equal(s.outbox().length,1);assert.equal((await s.run()).paused,true);assert.equal(calls,1);
});
test('foreign login is rejected before saving a session and its unused token is revoked (mock only)',async()=>{
  const api=mockApi(),m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
  const b=createAccount({base:'https://api.test',storage,fetchFn:api.fetchFn});await b.signup('fictional@example.test','fictional-pass');await b.logout();
  const a=createAccount({base:'https://api.test',storage,fetchFn:api.fetchFn,canUse:u=>u.id==='different-original'});const r=await a.login('fictional@example.test','fictional-pass');assert.equal(r.ok,false);assert.equal(r.status,409);assert.equal(storage.getItem(KEY),null);assert.equal(Object.keys(api.tokens).length,0);assert.ok(!api.calls.some(c=>c.path.includes('/events')));
});
test('old account stream is recovered as a binding, not silently sent to code; backup retains rollback evidence, no session credentials',async()=>{
  const db=await db0();await db.setMeta('sync',{code:'acct:original'});await prepareFoundation(db,{ap_profile:'{"owned":[]}'});assert.equal(db.meta.accountBinding,'original');
  const b=await buildBackup(db);assert.equal(b.foundation.snapshot.keys.ap_profile,'{"owned":[]}');assert.ok(!JSON.stringify(b).includes('ap_account'));
  const restored=await db0(),parsed=await readBackup(JSON.stringify(b),restored);assert.equal(parsed.hashOk,true);await restoreBackup(restored,parsed);assert.equal(projectionHash(restored.projection()),projectionHash(db.projection()));
});

test('real onboarding event IDs fit envelope and API limits, append durably, retries do not duplicate',async()=>{
 const db=await db0(),entry=A.catalog()[0],draft=[{id:'own-12345678-1234-1234-1234-123456789012',entry,name:'Fictional copy'}];
 const evs=selectionEvents(draft,'onboard-12345678-1234-1234-1234-123456789012');assert.ok(evs.every(isEnvelope));assert.ok(evs.every(e=>e.id.length<=80));
 assert.equal((await db.append(evs)).length,1);assert.equal((await db.append(selectionEvents(draft,'same-retry'))).length,0);assert.equal(Object.keys(db.projection().owned).length,1);
});

// A catalog number and a privately reported number must never share a provenance claim.
import { specSource } from '../../js/cc/provenance.js';
test('owned physics provenance respects maker/user/unknown facts',()=>{
 assert.deepEqual(specSource({rg:2.5,source:'https://manufacturer.test'},'rg'),['manufacturer','maker']);
 assert.deepEqual(specSource({rg:2.5,specFields:{rg:{prov:{kind:'user'}}}},'rg'),['user','you reported']);
 assert.deepEqual(specSource({rg:null},'rg'),['assumed','unverified']);
});

test('explicit prior owned selection and all existing physical/history records are preserved without a forced review',async()=>{
 const db=await db0(),keys={ap_profile:JSON.stringify({owned:balls.map(b=>b.id),hand:'left',pap:'confirmed fictional PAP'})};
 await db.migrate(keys);await db.append([mkEvent('bag.saved','old-bag',{slots:balls.map(b=>({owned:'own-'+b.id})),aim:12}),mkEvent('ownedBall.edited','own-'+balls[0].id,{fields:{layout:'original layout'}}),mkEvent('session.created','old-session',{aim:12}),mkEvent('ball.surfaceLogged','old-surface',{ballId:'own-'+balls[0].id,finish:'2000'})]);
 const before=structuredClone(db.events()),hash=db.hash();await prepareFoundation(db,keys);
 assert.equal(db.meta.ownershipReview.needed,false);assert.deepEqual(db.events(),before);assert.equal(db.hash(),hash);assert.equal(Object.keys(db.projection().owned).length,22);
});
test('failed backend append does not acknowledge ownership; the same reviewed IDs retry once without duplication',async()=>{
 const be=memoryBackend(),put=be.put;let fail=true;be.put=async a=>{if(fail)throw Error('quota');return put(a);};const db=createDB(be);await db.open();
 const e=selectionEvents([{id:'own-fictional-retry',entry:A.catalog()[0],name:'Fictional retry'}],'fictional-batch');
 await assert.rejects(db.append(e),/quota/);assert.equal(db.has(e[0].id),false);assert.equal(Object.keys(db.projection().owned).length,0);
 fail=false;assert.equal((await db.append(e)).length,1);assert.equal((await db.append(e)).length,0);
});

import { evidenceOf } from '../../js/cc/advisor.js';
import { checks } from '../../js/cc/bag.js';
test('ambiguous legacy model results and service counts never appear as either physical copy',()=>{
 const catalogId=balls[0].id,P={owned:{a:{catalogId},b:{catalogId}},shots:[{ballId:catalogId,sessionId:'old',frame:1,roll:1,down:10}],games:[],scores:[],aggregates:[]};
 assert.equal(evidenceOf(P,'a',catalogId).none,true);assert.equal(evidenceOf(P,'b',catalogId).none,true);
 const item={ownedId:'a',catalogId,name:'Fictional A',status:'inBag'};
 const health={[catalogId]:{games:100,since:{}}};assert.equal(checks([item],null,{health}).find(c=>c.n===8).warn,false);
});

import { advise } from '../../js/cc/advisor.js';
test('a first empty bag can explicitly Bring only At-home copies without treating the whole catalog as packed',()=>{
 const catalogId=balls[0].id,P={owned:{a:{id:'a',catalogId,status:'benched'},b:{id:'b',catalogId,status:'benched'}},shots:[],games:[],scores:[],aggregates:[]};
 assert.equal(advise(P).none,true);const a=advise(P,{fixed:{slots:['b']}});assert.deepEqual(a.slots,['b']);assert.equal(a.rows.length,1);assert.equal(a.rows[0].home,true);
});

test('conflicting privacy metadata pauses every destination, including explicitly consented code',async()=>{
 const db=await db0();await db.setMeta('privacyConflict',true);let calls=0;
 const sync=createSync({db,base:'https://api.test',deviceId:'fictional-code',auth:()=>session('A'),allowLegacy:()=>true,timer,fetchFn:async()=>{calls++;throw Error('must not send');}});
 assert.equal((await sync.run()).paused,true);assert.equal(calls,0);
});

test('migration drops only its captured queued prefix, preserving edits made while IndexedDB opens',async()=>{
 globalThis.location={search:''};const {record,setSink,pendingWrites}=await import('../../js/store.js');
 const calls=[];assert.equal(pendingWrites(),0);const original=record('test.original','old',{}),captured=pendingWrites(),later=record('test.later','new',{});
 setSink((...a)=>calls.push(a),{dropPending:captured});await Promise.all([original,later]);assert.deepEqual(calls.map(c=>c[1]),['new']);
 await record('test.after','after',{});assert.deepEqual(calls.map(c=>c[1]),['new','after']);
});

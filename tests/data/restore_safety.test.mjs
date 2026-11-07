import test from 'node:test';
import {stable,sha256Hex} from '../../js/data/schema.js';
import assert from 'node:assert/strict';
import { createDB } from '../../js/data/db.js';
import { memoryBackend } from '../../js/data/idb.js';
import { mkEvent } from '../../js/data/events.js';
import { buildBackup, readBackup, restoreBackup, recoverySupport } from '../../js/data/backup.js';
const fresh=async()=>{const db=createDB(memoryBackend());await db.open();return db;};
const parsed=async(source,target)=>readBackup(JSON.stringify(await buildBackup(source)),target);
test('bad checksum fails closed in core, not just a preview warning',async()=>{
 const source=await fresh(),target=await fresh();await source.append([mkEvent('ownedBall.created','copy',{name:'Fictional'})]);
 const b=await buildBackup(source);b.sha256='bad';const r=await readBackup(JSON.stringify(b),target);
 await assert.rejects(restoreBackup(target,r));assert.equal(target.events().length,0);
});
test('a newer backup cannot silently replace confirmed local profile',async()=>{
 const source=await fresh(),target=await fresh();await target.append([mkEvent('bowler.edited','me',{fields:{hand:'left'}},{ts:1})]);
 await source.append([mkEvent('bowler.edited','me',{fields:{hand:'right'}},{ts:2})]);const before=target.hash();
 await assert.rejects(restoreBackup(target,await parsed(source,target)));assert.equal(target.hash(),before);
});
test('same event id with different content is quarantined, not called a duplicate',async()=>{
 const source=await fresh(),target=await fresh();await target.append([mkEvent('ownedBall.created','copy',{name:'Local'},{id:'collision'})]);
 await source.append([mkEvent('ownedBall.created','copy',{name:'Other'},{id:'collision'})]);
 await assert.rejects(restoreBackup(target,await parsed(source,target)));assert.equal(target.projection().owned.copy.name,'Local');
});

test('distinct copies restore once, preserve original event/device identity and retain a nonrecursive private checkpoint',async()=>{
 const source=await fresh(),target=await fresh();target.deviceId='new-phone';
 await target.append([mkEvent('ownedBall.created','local-copy',{catalogId:'hy-road',name:'Local confirmed copy',layout:'Fictional layout'})]);
 await source.append([mkEvent('ownedBall.created','new-copy',{catalogId:'hy-road',name:'Second physical copy'})]);
 const r=await parsed(source,target),old=target.hash();await restoreBackup(target,r,{prefs:{hand:'left'},legacy:{ap_profile:'fictional'}});
 assert.equal(Object.keys(target.projection().owned).length,2);assert.equal(target.projection().owned['local-copy'].layout,'Fictional layout');
 assert.equal(target.meta.restoreCheckpoints.length,1);assert.equal(target.meta.restoreCheckpoints[0].backup.events.length,1);
 assert.equal(target.meta.restoreCheckpoints[0].backup.restoreCheckpoints,undefined);
 assert.equal((await restoreBackup(target,await parsed(source,target))).added,0);assert.equal(target.meta.restoreCheckpoints.length,1);
 assert.equal(target.events().find(e=>e.entityId==='new-copy').deviceId,null);assert.notEqual(target.hash(),old);
 const b=await buildBackup(target);assert.equal(b.restoreCheckpoints.length,1);assert.equal(b.restoreCheckpoints[0].backup.prefs.hand,'left');
 const recovery=await fresh();await restoreBackup(recovery,await readBackup(JSON.stringify(b.restoreCheckpoints[0].backup),recovery));assert.equal(recovery.hash(),old);
});
test('destructive event and import voids cannot hide existing saved history',async()=>{
 for (const mode of ['event','import']) {
  const source=await fresh(),target=await fresh(),e=mkEvent('line.created','line',{ballId:'local',eyes:10},{importId:'original-file'});await target.append([e]);
  await source.append([mode==='event'?mkEvent('event.voided',e.id,{target:e.id}):mkEvent('import.voided','original-file',{importId:'original-file'})]);
  await assert.rejects(restoreBackup(target,await parsed(source,target)));assert.ok(target.projection().lines.line);
 }
});
test('internal duplicate IDs and malformed records fail closed',async()=>{
 const source=await fresh(),target=await fresh();await source.append([mkEvent('ownedBall.created','copy',{name:'Fictional'})]);
 const b=await buildBackup(source);b.events.push(b.events[0]);await assert.rejects(restoreBackup(target,await readBackup(JSON.stringify(b),target)));
 b.events.push({id:'invalid'});await assert.rejects(restoreBackup(target,await readBackup(JSON.stringify(b),target)));assert.equal(target.events().length,0);
});
test('checkpoint persistence failure prevents all event writes',async()=>{
 const backend=memoryBackend(),target=createDB({...backend,setMeta:async()=>{throw Error('synthetic quota');}});await target.open();const source=await fresh();await source.append([mkEvent('ownedBall.created','copy',{name:'Fictional'})]);
 await assert.rejects(restoreBackup(target,await parsed(source,target)),/synthetic quota/);assert.equal(target.events().length,0);
});
test('change during checkpoint persistence aborts rather than using a stale preview',async()=>{
 const backend=memoryBackend();let release,started;const startedPromise=new Promise(r=>started=r);
 const target=createDB({...backend,setMeta:async(k,v)=>{started();await new Promise(r=>release=r);return backend.setMeta(k,v);}});await target.open();
 const source=await fresh();await source.append([mkEvent('ownedBall.created','copy',{name:'Fictional'})]);const pending=restoreBackup(target,await parsed(source,target));await startedPromise;
 await target.append([mkEvent('ownedBall.created','other',{name:'Local while reviewing'})]);release();await assert.rejects(pending,/changed after preview/);assert.equal(target.events().length,1);assert.ok(target.projection().owned.other);
});
test('unsigned backup preferences/foundation/checkpoints cannot rebind a local identity',async()=>{
 const source=await fresh(),target=await fresh();await target.setMeta('accountBinding','original');await source.append([mkEvent('ownedBall.created','copy',{name:'Fictional'})]);
 const b=await buildBackup(source);b.prefs={hand:'right',syncMode:'code'};b.foundation={snapshot:{accountBinding:{id:'foreign'}}};b.restoreCheckpoints=[{accountBinding:{id:'foreign'}}];
 await restoreBackup(target,await readBackup(JSON.stringify(b),target));assert.equal(target.meta.accountBinding,'original');assert.equal(target.meta.foundationSnapshot,undefined);
});

test('owned copy edit cannot replace a confirmed name or layout during restore',async()=>{
 const source=await fresh(),target=await fresh();await target.append([mkEvent('ownedBall.created','copy',{catalogId:'hy-road',name:'Original copy',layout:'Original fictional layout'},{ts:1})]);
 await source.append([mkEvent('ownedBall.edited','copy',{fields:{name:'Changed copy',layout:'Other fictional layout'}},{ts:2})]);
 const before=target.hash();await assert.rejects(restoreBackup(target,await parsed(source,target)));assert.equal(target.hash(),before);assert.equal(target.projection().owned.copy.layout,'Original fictional layout');
});

// Bounded recovery: additive event history, never a whole settings/account clone.
test('missing/string/future schemas and malformed modern files never use the legacy fallback',async()=>{
 const db=await fresh(),b=await buildBackup(db);
 for(const v of [undefined,null,'1',0,2]) {const r=await readBackup(JSON.stringify({...b,schemaV:v}),db);assert.equal(r.ok,false,String(v));await assert.rejects(restoreBackup(db,r));}
 assert.equal((await readBackup(JSON.stringify({...b,events:null,lines:[]}),db)).ok,false);
});
test('future event schemas, invalid ordering, arrays and reserved keys fail closed before projection',async()=>{
 const db=await fresh(),b=await buildBackup(db),normal=mkEvent('ownedBall.created','copy',{name:'Fictional'});
 const bad=[{...normal,schemaV:2},{...normal,seq:'bad'},{...normal,entityId:'__proto__'},{...normal,data:[]},{...normal,data:{fields:[]}},JSON.parse(JSON.stringify(normal).replace('"name":"Fictional"','"__proto__":{"polluted":true}'))];
 for(const e of bad){const file={...b,events:[e]};file.sha256=await sha256Hex(stable([{...e,synced:undefined}]));const r=await readBackup(JSON.stringify(file),db);assert.equal(r.hashOk,true);await assert.rejects(restoreBackup(db,r));assert.equal(db.events().length,0);}assert.equal({}.polluted,undefined);
});
test('account exports are explicitly unsupported archives, never unsigned identity imports',async()=>{
 const db=await fresh();await db.setMeta('accountBinding','original');const r=await readBackup(JSON.stringify({user:{id:'other'},events:[],teams:[]}),db);assert.equal(r.ok,false);assert.match(r.error,/archives.*not app-restorable/);assert.equal(db.meta.accountBinding,'original');
});
test('a harmless local addition after preview invalidates its counts before checkpoint or append',async()=>{
 const source=await fresh(),target=await fresh();await source.append([mkEvent('ownedBall.created','incoming',{name:'Incoming'})]);const r=await parsed(source,target);await target.append([mkEvent('ownedBall.created','local-after-preview',{name:'Kept'})]);await assert.rejects(restoreBackup(target,r),/changed after this preview/);assert.equal(target.meta.restoreCheckpoints,undefined);assert.equal(target.events().length,1);
});
test('new records over nonempty legacy mirrors block in core instead of partly invisible recovery',async()=>{
 for(const [key,type,data] of [['ap_lines','line.created',{ballId:'copy',eyes:11}],['ap_surface','ball.surfaceLogged',{ballId:'copy',finish:2000}],['ap_notes','patternNote.created',{note:'Fictional'}],['ap_shots','shot.logged',{ballId:'copy',miss:'left'}]]){
  const source=await fresh(),target=await fresh();await source.append([mkEvent(type,'incoming',data)]);const r=await parsed(source,target),snapshot={legacy:{[key]:'[{"fictional":"existing"}]'}};assert.equal(recoverySupport(target,r,snapshot).blockers.length,1);await assert.rejects(restoreBackup(target,r,snapshot),/unsupported/);assert.equal(target.events().length,0);assert.equal(target.meta.restoreCheckpoints,undefined);
 }
});
test('profile mirror does not hide new bowler facts and file preferences remain unapplied',async()=>{
 const source=await fresh(),target=await fresh();await source.append([mkEvent('bowler.edited','me',{fields:{hand:'left'}})]);const b=await buildBackup(source,{prefs:{theme:'light',myLines:{copy:{eyes:10}}}}),r=await readBackup(JSON.stringify(b),target),snapshot={prefs:{theme:'dark'},legacy:{ap_profile:'{"hand":null}'}};assert.match(recoverySupport(target,r,snapshot).notes.join(' '),/not a full phone recovery/);await assert.rejects(restoreBackup(target,r,snapshot),/existing profile/);assert.equal(snapshot.prefs.theme,'dark');assert.equal(target.events().length,0);
});
test('duplicate model copies/layouts/surfaces/history restore additively with checkpoint recovery and no preference or binding change',async()=>{
 const source=await fresh(),target=await fresh();await target.setMeta('accountBinding','original');await target.append([mkEvent('ownedBall.created','local',{catalogId:'hy-road',name:'Local',layout:'Local layout'}),mkEvent('game.logged','local-game',{ballId:'local',total:123})]);
 await source.append([mkEvent('ownedBall.created','copy-a',{catalogId:'hy-road',name:'Fictional A',layout:'Layout A'}),mkEvent('ownedBall.created','copy-b',{catalogId:'hy-road',name:'Fictional B',layout:'Layout B'}),mkEvent('line.created','line-a',{ballId:'copy-a',ownedId:'copy-a',eyes:10}),mkEvent('ball.surfaceLogged','surface-a',{ballId:'copy-a',date:'2026-11-07',finish:2000}),mkEvent('game.logged','game-b',{ballId:'copy-b',total:145})]);
 const before=target.hash(),oldEvents=JSON.stringify(target.events()),snapshot={prefs:{theme:'dark',myLines:{local:{eyes:9}}},legacy:{ap_lines:'[]'}},b=await buildBackup(source,{prefs:{theme:'light',myLines:{'copy-a':{eyes:10}}}});await restoreBackup(target,await readBackup(JSON.stringify(b),target),snapshot);const P=target.projection();assert.equal(Object.keys(P.owned).length,3);assert.equal(P.owned.local.layout,'Local layout');assert.equal(P.owned['copy-a'].layout,'Layout A');assert.equal(P.owned['copy-b'].layout,'Layout B');assert.equal(P.surface.length,1);assert.equal(P.scores.length,2);assert.equal(P.lines['line-a'].ownedId,'copy-a');assert.equal(snapshot.prefs.theme,'dark');assert.equal(target.meta.accountBinding,'original');const exported=await buildBackup(target),clean=await fresh();await restoreBackup(clean,await readBackup(JSON.stringify(exported.restoreCheckpoints[0].backup),clean));assert.equal(clean.hash(),before);assert.equal(JSON.stringify(target.events().slice(0,2)),oldEvents);
});
test('interrupted append retains durable checkpoint and all originals; restart/retry is idempotent',async()=>{
 const backend=memoryBackend();let fail=false;const target=createDB({...backend,put:async(e)=>{if(fail)throw Error('synthetic interrupted write');return backend.put(e);}});await target.open();await target.append([mkEvent('ownedBall.created','local',{name:'Original'})]);const source=await fresh();await source.append([mkEvent('ownedBall.created','incoming',{name:'Incoming'})]);const r=await parsed(source,target),before=target.hash();fail=true;await assert.rejects(restoreBackup(target,r),/interrupted/);assert.equal(target.hash(),before);assert.equal(target.meta.restoreCheckpoints.length,1);const reopened=createDB(backend);await reopened.open();assert.equal(reopened.hash(),before);assert.equal(reopened.meta.restoreCheckpoints.length,1);await restoreBackup(reopened,await parsed(source,reopened));assert.equal(Object.keys(reopened.projection().owned).length,2);assert.equal((await restoreBackup(reopened,await parsed(source,reopened))).added,0);
});
test('failed checkpoint persistence is not acknowledged in memory',async()=>{
 const db=createDB({...memoryBackend(),setMeta:async()=>{throw Error('synthetic quota');}});await db.open();await assert.rejects(db.setMeta('restoreCheckpoints',[{v:1}]),/quota/);assert.equal(db.meta.restoreCheckpoints,undefined);
});

test('synthetic legacy all22 survives additive restore, checkpoint recovery and repeated foundation initialization',async()=>{
 const {balls}=await import('../../js/data.js'),{prepareFoundation}=await import('../../js/data/foundation.js');const target=await fresh(),keys={ap_profile:JSON.stringify({owned:balls.map(b=>b.id),hand:'left',pap:'Fictional confirmed PAP'}),ap_prefs:JSON.stringify({theme:'dark',myLines:{'own-hy-road':{eyes:9}}})};await target.migrate(keys);await target.append([mkEvent('bag.saved','legacy-bag',{slots:balls.map(b=>({owned:'own-'+b.id})),aim:12}),mkEvent('ownedBall.edited','own-'+balls[0].id,{fields:{layout:'Fictional confirmed layout'}}),mkEvent('ball.surfaceLogged','legacy-surface',{ballId:'own-'+balls[0].id,finish:2000}),mkEvent('game.logged','legacy-game',{ballId:'own-'+balls[0].id,total:123})]);await prepareFoundation(target,keys);const before=target.hash(),ids=target.events().map(e=>e.id);const source=await fresh();await source.append([mkEvent('ownedBall.created','additional-copy',{catalogId:balls[0].id,name:'Fictional additional copy'})]);await restoreBackup(target,await parsed(source,target),{prefs:JSON.parse(keys.ap_prefs),legacy:keys});assert.equal(Object.keys(target.projection().owned).length,23);assert.ok(ids.every(id=>target.has(id)));const checkpoint=target.meta.restoreCheckpoints[0].backup,recovered=await fresh();await restoreBackup(recovered,await readBackup(JSON.stringify(checkpoint),recovered));assert.equal(recovered.hash(),before);assert.equal(Object.keys(recovered.projection().owned).length,22);assert.equal(checkpoint.prefs.myLines['own-hy-road'].eyes,9);await prepareFoundation(target,{});assert.equal(Object.keys(target.projection().owned).length,23);assert.ok(ids.every(id=>target.has(id)));
});

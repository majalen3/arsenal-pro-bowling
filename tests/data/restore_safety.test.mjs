import test from 'node:test';
import assert from 'node:assert/strict';
import { createDB } from '../../js/data/db.js';
import { memoryBackend } from '../../js/data/idb.js';
import { mkEvent } from '../../js/data/events.js';
import { buildBackup, readBackup, restoreBackup } from '../../js/data/backup.js';
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

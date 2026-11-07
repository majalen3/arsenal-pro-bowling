import test from 'node:test';
import assert from 'node:assert/strict';
import {createDB} from '../../js/data/db.js';
import {memoryBackend} from '../../js/data/idb.js';
import {mkEvent} from '../../js/data/events.js';
import {createSync} from '../../js/data/sync.js';
import {buildBackup} from '../../js/data/backup.js';
const timer={set:()=>1,clear(){}};
const fresh=async()=>{const d=createDB(memoryBackend());await d.open();return d;};
function fixture(db,events,extra={}){
 const calls=[];let auth={token:'public-synthetic',user:{id:'A'}};
 const sync=createSync({db,base:'https://api.test',deviceId:'never-code',timer,auth:()=>auth,allowLegacy:()=>true,...extra,fetchFn:async(url,o={})=>{calls.push({url,method:o.method||'GET'});return {status:200,headers:{get:()=>null},json:async()=>o.method==='POST'?{accepted:JSON.parse(o.body).events.length}:{events,cursor:'1',more:false}};}});
 return {sync,calls,end:()=>auth=null};
}
test('first account recovery stages conflicts before any upload, preserves originals and exports source/checkpoint without tokens',async()=>{
 const d=await fresh();await d.append([mkEvent('bowler.edited','me',{fields:{hand:'left'}},{ts:1}),mkEvent('ownedBall.created','local',{name:'Original',layout:'Original layout'})]);const before=d.hash();const f=fixture(d,[mkEvent('bowler.edited','me',{fields:{hand:'right'}},{ts:2})]);
 const r=await f.sync.run();assert.equal(r.ok,false);assert.equal(d.hash(),before);assert.ok(d.meta.sync.recoveryBlocked);assert.equal(d.meta.pendingAccountRecovery.events.length,1);assert.ok(d.meta.restoreCheckpoints.length);assert.ok(f.calls.every(c=>c.method==='GET'));const n=f.calls.length;assert.equal((await f.sync.run()).review,true);assert.equal(f.calls.length,n);
 const b=await buildBackup(d);assert.equal(b.pendingAccountRecovery.events.length,1);assert.ok(!JSON.stringify(b).includes('public-synthetic'));assert.equal(d.meta.accountBinding,'A');f.end();await f.sync.run();assert.equal(f.calls.length,n);assert.equal(d.meta.sync.code,'acct:A');
});
test('initial additive account recovery reads first, preserves distinct copies and only then uploads authorized local events',async()=>{
 const d=await fresh();await d.append([mkEvent('ownedBall.created','local',{catalogId:'hy-road',name:'Local'})]);const remote=[mkEvent('ownedBall.created','remote-a',{catalogId:'hy-road',name:'A',layout:'Layout A'}),mkEvent('ownedBall.created','remote-b',{catalogId:'hy-road',name:'B',layout:'Layout B'})];const f=fixture(d,remote);assert.equal((await f.sync.run()).ok,true);assert.equal(f.calls[0].method,'GET');assert.ok(f.calls.some(c=>c.method==='POST'));assert.equal(Object.keys(d.projection().owned).length,3);assert.equal(d.projection().owned['remote-b'].layout,'Layout B');assert.equal(d.events().filter(e=>remote.some(r=>r.id===e.id)&&e.synced).length,2);assert.equal(d.meta.pendingAccountRecovery,undefined);assert.ok(d.meta.restoreCheckpoints.length);
});
test('initial account recovery with nonempty mirror stages without an invisible partial restore or upload',async()=>{
 const d=await fresh();await d.append([mkEvent('ownedBall.created','local',{name:'Original'})]);const f=fixture(d,[mkEvent('line.created','remote',{ballId:'local',eyes:10})],{recoverySnapshot:()=>({legacy:{ap_lines:'[{"ballId":"local","eyes":9}]'},prefs:{theme:'dark'}})});const before=d.hash();assert.equal((await f.sync.run()).ok,false);assert.equal(d.hash(),before);assert.ok(d.meta.pendingAccountRecovery);assert.ok(!f.calls.some(c=>c.method==='POST'));
});
test('existing successful account sync keeps normal same-account convergence, not a speculative workspace migration',async()=>{
 const d=await fresh();await d.setMeta('accountBinding','A');await d.setMeta('sync',{code:'acct:A',lastPullAt:100,cursor:'1'});await d.append([mkEvent('bowler.edited','me',{fields:{hand:'left'}},{ts:1})]);const f=fixture(d,[mkEvent('bowler.edited','me',{fields:{hand:'right'}},{ts:2})]);assert.equal((await f.sync.run()).ok,true);assert.equal(d.projection().bowler.hand,'right');assert.equal(d.meta.pendingAccountRecovery,undefined);
});

test('signout during initial recovery checkpoint cannot append incoming account records or upload local data',async()=>{
 const backend=memoryBackend();let release,start;const started=new Promise(r=>start=r);const d=createDB({...backend,setMeta:async(k,v)=>{if(k==='restoreCheckpoints'){start();await new Promise(r=>release=r);}return backend.setMeta(k,v);}});await d.open();await d.append([mkEvent('ownedBall.created','local',{name:'Original'})]);const f=fixture(d,[mkEvent('ownedBall.created','remote',{name:'Remote'})]);const r=f.sync.run();await started;f.end();release();assert.equal((await r).ok,false);assert.equal(Object.keys(d.projection().owned).length,1);assert.equal(d.projection().owned.remote,undefined);assert.ok(f.calls.every(c=>c.method==='GET'));assert.equal(d.meta.accountBinding,'A');
});

test('bounded initial history stays staged when the server still reports more; no partial cursor or upload',async()=>{
 const d=await fresh();await d.append([mkEvent('ownedBall.created','local',{name:'Original'})]);const before=d.hash(),calls=[];
 const sync=createSync({db:d,base:'https://api.test',deviceId:'never-code',timer,auth:()=>({token:'public-synthetic',user:{id:'A'}}),fetchFn:async(url,o={})=>{calls.push(o.method||'GET');const n=calls.length;return {status:200,headers:{get:()=>null},json:async()=>({events:[mkEvent('ownedBall.created','remote-'+n,{name:'Fictional '+n})],cursor:String(n),more:true})};}});
 assert.equal((await sync.run()).ok,false);assert.equal(calls.length,40);assert.ok(calls.every(m=>m==='GET'));assert.equal(d.hash(),before);assert.equal(d.meta.sync.cursor,'0');assert.equal(d.meta.pendingAccountRecovery.events.length,40);assert.match(d.meta.pendingAccountRecovery.reason.join(' '),/bounded/);assert.equal((await sync.run()).review,true);assert.equal(calls.length,40);
});
test('future account event schema stages before append or upload, preserving the private source',async()=>{
 const d=await fresh();await d.append([mkEvent('ownedBall.created','local',{name:'Original'})]);const before=d.hash(),future={...mkEvent('ownedBall.created','future',{name:'Fictional'}),schemaV:2},f=fixture(d,[future]);assert.equal((await f.sync.run()).ok,false);assert.equal(d.hash(),before);assert.ok(f.calls.every(c=>c.method==='GET'));assert.equal(d.meta.pendingAccountRecovery.events[0].schemaV,2);assert.ok(d.meta.restoreCheckpoints.length);
});

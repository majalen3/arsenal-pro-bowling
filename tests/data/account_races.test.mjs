import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccount } from '../../js/data/account.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const reply=(status,token='fictional')=>({status,headers:{get:()=>null},json:async()=>({token,user:{id:'A',email:'fictional@example.test'}})});
test('signout while login is pending cannot resurrect a session or authorize sync',async()=>{
 let resolve;const calls=[];const a=createAccount({storage:storage(),base:'https://api.test',fetchFn:async(url)=>{calls.push(url);return url.endsWith('/login')?new Promise(r=>resolve=r):reply(200);}});
 const pending=a.login('fictional@example.test','fictional-password');await a.logout();resolve(reply(200));
 const result=await pending;assert.equal(result.ok,false);assert.equal(a.active(),null);
});
test('a stale 401 cannot end a newer explicitly chosen session',async()=>{
 let resolve,number=0;const a=createAccount({storage:storage(),base:'https://api.test',fetchFn:async(url)=>url.endsWith('/login')?reply(200,'fictional-'+(++number)):new Promise(r=>resolve=r)});
 await a.login('fictional@example.test','fictional-password');const old=a.request('/api/account');
 await a.login('fictional@example.test','fictional-password');resolve(reply(401));await old;
 assert.equal(a.active().token,'fictional-2');
});

for (const method of ['signup','recover']) test(method+' cancellation never saves a session or exposes a recovery key',async()=>{
 let resolve,revoked=0;const a=createAccount({storage:storage(),base:'https://api.test',fetchFn:async(url)=>url.endsWith('/logout')?(revoked++,reply(200)):new Promise(r=>resolve=r)});
 const pending=method==='signup'?a.signup('fictional@example.test','fictional-password'):a.recover('fictional@example.test','fictional-key','fictional-password');a.end();
 const r=reply(method==='signup'?201:200);r.json=async()=>({token:'fictional',user:{id:'A'},recoveryKey:'fictional-not-a-real-secret'});resolve(r);
 const result=await pending;assert.equal(result.ok,false);assert.equal(result.recoveryKey,undefined);assert.equal(a.active(),null);assert.equal(revoked,1);
});
test('only the latest login attempt may save; a cancelled response is revoked',async()=>{
 const pending=[];let revoked=0;const a=createAccount({storage:storage(),base:'https://api.test',fetchFn:async(url)=>url.endsWith('/logout')?(revoked++,reply(200)):new Promise(r=>pending.push(r))});
 const first=a.login('fictional@example.test','fictional-password'),second=a.login('fictional@example.test','fictional-password');pending[1](reply(200,'fictional-new'));assert.equal((await second).ok,true);
 pending[0](reply(200,'fictional-old'));assert.equal((await first).ok,false);assert.equal(a.active().token,'fictional-new');assert.equal(revoked,1);
});

test('a stale sync 401 cannot end a newer same-account session or fall back to code sync',async()=>{
 const {createSync}=await import('../../js/data/sync.js'),{createDB}=await import('../../js/data/db.js'),{memoryBackend}=await import('../../js/data/idb.js');
 const db=createDB(memoryBackend());await db.open();let session={user:{id:'A'},token:'fictional-old'},resolve,lost=0;const urls=[];
 const sync=createSync({db,base:'https://api.test',deviceId:'fictional-code',auth:()=>session,onAuthLost:()=>{lost++;session=null},timer:{set:()=>1,clear:()=>{}},fetchFn:async(url)=>{urls.push(url);return new Promise(r=>resolve=r)}});
 const pending=sync.run();while(!resolve) await new Promise(r=>setImmediate(r));session={user:{id:'A'},token:'fictional-new'};resolve(reply(401));await pending;sync.stop();
 assert.equal(lost,0);assert.equal(session.token,'fictional-new');assert.ok(urls.every(u=>u.includes('/account/events')));
});

// Explicit LOCAL-ONLY recovery. No remote requests, identity changes or deletion of events.
import {stable} from './schema.js';
import {order,project} from './project.js';
import {mkEvent} from './events.js';
import {restoreIssues,buildBackup} from './backup.js';
import {balls} from '../data.js';
export const RECOVERY_KEYS=['ap_prefs','ap_profile','ap_lines','ap_surface','ap_notes','ap_shots','ap_state','ap_dels'];
const clone=x=>JSON.parse(JSON.stringify(x));
const safe=(v,d=0)=>d<40 && (!v || typeof v!=='object' || Object.keys(v).every(k=>!['__proto__','constructor','prototype'].includes(k)&&safe(v[k],d+1)));
const number=(x,lo,hi)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
const text=(x,max=200)=>typeof x==='string'&&x.length<=max;
const plain=x=>x && typeof x==='object'&&!Array.isArray(x)&&safe(x);
export const revision=db=>stable(db.events().slice().sort(order).map(e=>({...e,synced:undefined})));
const eventRevision=events=>stable(events.slice().sort(order).map(e=>({...e,synced:undefined})));
const snapshot=io=>Object.fromEntries(RECOVERY_KEYS.map(k=>[k,io.read(k)]));
function read(raw,array=false){if(raw==null)return array?[]:{};const x=JSON.parse(raw);if(!safe(x)||(array?!Array.isArray(x):!plain(x)))throw Error('Existing local data has an unsupported shape. Keep a backup; nothing was replaced.');return x;}
const lineFields=['ballId','ownedId','catalogId','eyes','name','release','aim','speed','rev','oil','finish','pattern','note'];
const line=x=>Object.fromEntries(lineFields.filter(k=>x[k]!==undefined).map(k=>[k,x[k]]));
function lineOK(x){return plain(x)&&text(x.ballId)&&['name','note','pattern','finish','ownedId','catalogId'].every(k=>x[k]==null||text(x[k],k==='note'?2048:200))&&[['eyes',0,40],['release',0,40],['aim',-90,90],['speed',0,80],['rev',0,2000],['oil',0,10]].every(([k,l,h])=>x[k]==null||number(x[k],l,h));}
const date=x=>text(x,10)&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x));
const surfaceOK=x=>plain(x)&&text(x.ballId)&&date(x.date)&&(text(x.finish,80)||number(x.finish,0,10000));
const noteOK=x=>plain(x)&&['lane','oil','adjustment'].every(k=>text(x[k],2048));
function prefsOf(p,known){
 if(p==null)return {values:[],unsupported:[]};if(!plain(p))throw Error('Unsupported preferences object.');
 const checks={theme:x=>['dark','light','system'].includes(x),brand:x=>['pine','maple','night'].includes(x),textSize:x=>['normal','large','xl'].includes(x),help:x=>typeof x==='boolean',wakeLock:x=>typeof x==='boolean',onboarded:x=>typeof x==='boolean',handAsked:x=>typeof x==='boolean',spareRule:x=>typeof x==='boolean'};
 const values=[],unsupported=[];
 for(const [k,v] of Object.entries(p)){
  if(checks[k]){if(!checks[k](v))throw Error('Invalid preference: '+k);values.push({path:k,value:v});}
  else if(k==='myLines'){
   if(!plain(v)||Object.keys(v).length>5000)throw Error('Invalid saved aiming settings.');
   for(const [id,a] of Object.entries(v)){
    if(!plain(a)||!number(a.lay,0,40)||!number(a.eyes,0,40)||Object.keys(a).some(k=>!['lay','eyes','ts'].includes(k))||(a.ts!=null&&!number(a.ts,0,1e15)))throw Error('Invalid saved aiming setting.');
    if(known.has(id))values.push({path:'myLines.'+id,id,value:clone(a)});else unsupported.push('myLines: unmatched ball '+id);
   }
  }else unsupported.push(k);
 }
 return {values,unsupported};
}
// Plan has no writes, and every conflict defaults to retaining this phone's entire value/row.
export function planLocalRecovery(db,parsed,io,choices={}){
 const issues=restoreIssues(db,parsed),conflicts=[],changes=[],unsupported=[];
 if(issues.length)return {ok:false,issues,conflicts,changes,unsupported};
 try{
  io.guard();const before=snapshot(io),after={...before},evs=parsed.backup.events.filter(e=>!db.has(e.id));
  const P=project([...db.events(),...evs]),known=new Set([...balls.map(b=>b.id),...Object.keys(P.owned),...Object.values(P.owned).map(o=>o.catalogId)]);
  const prefs=read(before.ap_prefs),profile=read(before.ap_profile);
  prefsOf(prefs,known); // malformed existing supported settings must not be coerced by object spread
  if(profile.entered!=null&&!plain(profile.entered))throw Error('Existing profile provenance needs separate review.');
  const choose=(id,current,incoming,apply)=>{
   if(stable(current)===stable(incoming))return;
   const conflict=current!==undefined;
   if(conflict)conflicts.push({id,current:clone(current),incoming:clone(incoming),take:choices[id]===true});
   if(!conflict||choices[id]===true){apply(clone(incoming));changes.push(id);}
  };
  const pp=prefsOf(parsed.backup.prefs,known);unsupported.push(...pp.unsupported.map(k=>'Preference '+k+' (archive only)'));
  for(const p of pp.values){const id='prefs.'+p.path;
   choose(id,p.id?(prefs.myLines||{})[p.id]:prefs[p.path],p.value,v=>{if(p.id)prefs.myLines={...(prefs.myLines||{}),[p.id]:v};else prefs[p.path]=v;});
  }
  if(changes.some(x=>x.startsWith('prefs.')))after.ap_prefs=JSON.stringify(prefs);
  // Profiles come only from validated event facts, never unsigned legacy ownership/settings snapshots.
  const bow=P.bowler,localBow=db.projection().bowler,v=x=>plain(x)&&'v'in x?x.v:x;
  const checks={hand:x=>['left','right'].includes(x),style:x=>['stroker','tweener','cranker','two'].includes(x),speed:x=>number(x,0,80),rev:x=>number(x,0,2000),pap:x=>text(x,120),tilt:x=>text(x,120)||number(x,0,90)};
  for(const [k,valid] of Object.entries(checks))if(bow[k]!=null){
   const value=v(bow[k]);const unitOK=!['speed','rev'].includes(k)||(plain(bow[k])&&bow[k].unit===(k==='speed'?'mph':'rpm'));if(!unitOK||!valid(value)){unsupported.push('Profile '+k+' (unsupported value; kept in event log)');continue;}
   const incoming=['speed','rev'].includes(k)?{value,entered:!!bow[k]?.prov&&['user','device'].includes(bow[k].prov.kind)&&!['default','example'].includes(bow[k].prov.ref)}:value;
   const measured=['speed','rev'].includes(k),unset=profile[k]==null||profile[k]===''||profile[k]==='unknown'||(measured&&profile.entered?.[k]===false);
   const current=unset?undefined:(measured?{value:profile[k],entered:profile.entered?.[k]!==false}:profile[k]);
   if(current!==undefined&&localBow[k]===undefined&&stable(current)!==stable(incoming))throw Error('Incoming profile facts conflict with this phone’s existing profile mirror. Separate review is required; confirmed values were not replaced.');
   choose('profile.'+k,current,incoming,x=>{if(['speed','rev'].includes(k)){profile[k]=x.value;profile.entered={...(profile.entered||{}),[k]:x.entered};}else profile[k]=x;});
  }
  if(changes.some(x=>x.startsWith('profile.')))after.ap_profile=JSON.stringify(profile);
  const lines=read(before.ap_lines,true);if(!lines.every(lineOK))throw Error('Existing saved lines need separate review.');
  for(const x of Object.values(P.lines)){
   if(!lineOK(x))throw Error('Incoming saved lines have unsupported values.');
   const next=line(x),at=lines.findIndex(l=>l.ballId===x.ballId&&(l.name||'')===(x.name||'')),id='line.'+x.key;
   choose(id,at<0?undefined:line(lines[at]),next,y=>{if(at<0)lines.push({...y,updatedAt:x.ts,synced:false});else lines[at]={...lines[at],...y,updatedAt:x.ts,synced:false};});
  }
  if(changes.some(x=>x.startsWith('line.')))after.ap_lines=JSON.stringify(lines);
  // Append-only mirrors use a multiset so existing repeated rows are never collapsed/deleted.
  for(const [key,rows,fields,valid] of [['ap_surface',P.surface,['ballId','date','finish'],surfaceOK],['ap_notes',P.notes,['lane','oil','adjustment'],noteOK]]){
   const list=read(before[key],true);if(!list.every(valid))throw Error('Existing '+key+' needs separate review.');const used=new Set();
   for(const x of rows){if(!valid(x))throw Error('Incoming '+key+' has unsupported values.');const data=Object.fromEntries(fields.map(k=>[k,x[k]]));
    const i=list.findIndex((y,i)=>!used.has(i)&&fields.every(k=>stable(y[k])===stable(data[k])));
    if(i>=0)used.add(i);else{list.push({...data,synced:false});used.add(list.length-1);changes.push(key+'.'+x.id);}
   }
   if(changes.some(x=>x.startsWith(key+'.')))after[key]=JSON.stringify(list);
  }
  const oldMiss=new Set(db.projection().shots.filter(x=>x.frame==null&&x.miss).map(x=>x.id));
  if(P.shots.some(x=>x.frame==null&&x.miss&&!oldMiss.has(x.id)))throw Error('Older miss-shot mirror recovery remains unsupported; keep the source file for separate review.');
  if(parsed.backup.legacy)unsupported.push('Raw legacy snapshots (archive only; lists/profile use event facts)');
  unsupported.push('Account/team/sync targets, lane-control snapshot, feature flags and auxiliary archives are not applied.');
  return {ok:true,issues:[],before,after,events:evs,revision:revision(db),activity:db.activity(),conflicts,changes,unsupported,choices:clone(choices)};
 }catch(e){return {ok:false,issues:[e.message],conflicts,changes:[],unsupported};}
}
const sameSnapshot=(a,b)=>RECOVERY_KEYS.every(k=>a[k]===b[k]);
function assertFresh(db,plan,io,ticket=plan.activity){io.guard();if(db.activity()!==ticket||revision(db)!==plan.revision||!sameSnapshot(snapshot(io),plan.before))throw Error('This phone changed after preview. Choose the file again; no reviewed data was applied.');}
// Journal persisted BEFORE events/mirrors. Partial failure stays paused and offers guarded rollback.
export async function applyLocalRecovery(db,parsed,plan,io){
 if(!plan.ok)throw Error(plan.issues.join(' '));assertFresh(db,plan,io);
 if(db.meta.localRecovery&&!['undone','closed'].includes(db.meta.localRecovery.phase))throw Error('An earlier local recovery needs review first.');
 const verify=planLocalRecovery(db,parsed,io,plan.choices);if(!verify.ok||stable(verify)!==stable(plan))throw Error('Recovery preview changed. Review again.');
 const events=plan.events.map(e=>({...e,synced:false})),beforeBackup=await buildBackup(db,{prefs:read(plan.before.ap_prefs),legacy:plan.before,includeCheckpoints:false,includeRecovery:false});
 assertFresh(db,plan,io);
 const j={v:1,phase:'prepared',at:Date.now(),before:plan.before,after:plan.after,beforeRevision:plan.revision,beforeBackup,events,voids:events.map(e=>mkEvent('event.voided',e.id,{target:e.id},{deviceId:db.deviceId})),afterRevision:eventRevision([...db.events(),...events])};
 const previous=db.meta.localRecovery;
 if(previous?.beforeBackup){await db.setMeta('restoreCheckpoints',[...(db.meta.restoreCheckpoints||[]),{v:1,kind:'local-recovery',at:previous.at,backup:previous.beforeBackup}]);assertFresh(db,plan,io);}
 await db.setMeta('localRecovery',j);assertFresh(db,plan,io);
 await db.append(events,{preserveDevice:true,guard:ticket=>assertFresh(db,plan,io,ticket)});
 io.guard();if(db.activity()!==plan.activity+1||revision(db)!==j.afterRevision||!sameSnapshot(snapshot(io),j.before))throw Error('Recovery paused after concurrent activity. Keep the checkpoint; no existing values were overwritten.');
 for(const k of RECOVERY_KEYS)if(j.after[k]!==j.before[k])io.write(k,j.after[k]);
 await db.setMeta('localRecovery',{...j,phase:'committed'});return {added:events.length,changes:plan.changes.length};
}
// Conservative all-or-nothing eligibility: no later event or local edit can be rolled back.
export function undoLocalIssues(db,io){
 const j=db.meta.localRecovery;if(!j||!['prepared','committed'].includes(j.phase))return ['No pending local recovery to undo.'];
 try{io.guard();const expected=new Map([...j.beforeBackup.events,...j.events,...j.voids].map(e=>[e.id,e]));
  if(db.events().some(e=>!expected.has(e.id)||eventRevision([e])!==eventRevision([expected.get(e.id)])))return ['New events exist after recovery. Undo is blocked; export this phone and keep the checkpoint.'];
  if(j.beforeBackup.events.some(e=>!db.has(e.id)))return ['Original events are missing. Keep both backups for review.'];
  if(j.events.some(e=>db.events().some(x=>x.id===e.id&&x.synced)))return ['Recovered events were acknowledged remotely; local-only Undo is unsupported.'];
  const current=snapshot(io);if(RECOVERY_KEYS.some(k=>current[k]!==j.before[k]&&current[k]!==j.after[k]))return ['Local settings/lists changed after recovery. Undo will not overwrite your edits. Export for separate review.'];
  return [];
 }catch(e){return [e.message];}
}
export async function undoLocalRecovery(db,io){
 const issues=undoLocalIssues(db,io);if(issues.length)throw Error(issues.join(' '));const j=db.meta.localRecovery;const intent=db.activity()+1;
 await db.append(j.voids.filter(e=>j.events.some(x=>db.has(x.id)&&x.id===e.data.target)),{preserveDevice:true,guard:ticket=>{if(db.activity()!==ticket||ticket!==intent)throw Error('New writes arrived during Undo; nothing was rolled back.');const x=undoLocalIssues(db,io);if(x.length)throw Error(x.join(' '));}});
 if(db.activity()!==intent)throw Error('New activity arrived during Undo; settings were not rolled back. Keep the checkpoint.');const again=undoLocalIssues(db,io);if(again.length)throw Error(again.join(' '));
 for(const k of RECOVERY_KEYS)if(io.read(k)!==j.before[k])io.write(k,j.before[k]);
 await db.setMeta('localRecovery',{...j,phase:'undone',undoneAt:Date.now()});return true;
}
export async function finishLocalRecovery(db,io){
 io.guard();const j=db.meta.localRecovery;if(j?.phase!=='committed')throw Error('Only a completed local recovery can be kept.');
 // Explicit Keep ends Undo without changing any events or mirrors, including later edits.
 // Still requires local-only authorization; the checkpoint remains exportable.
 await db.setMeta('localRecovery',{...j,phase:'closed',closedAt:Date.now()});
}

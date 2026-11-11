// Deliberately local-only review, separate from event-only Import and account recovery.
import {h} from '../ui.js';
import {account} from '../account.js';
import {memMode,rawGet,prefs,emit} from '../store.js';
import {proj} from '../hub.js';
import {applyTextSize} from '../cc/wake.js';
import {planLocalRecovery,applyLocalRecovery,undoLocalIssues,undoLocalRecovery,finishLocalRecovery} from '../data/local_recovery.js';

export function recoveryIO(db){
 const identity=()=>JSON.stringify([db.meta.accountBinding||null,rawGet('ap_device'),rawGet('ap_sync_guard'),rawGet('ap_backup_sync')]);
 const initial=identity();
 return {read:k=>localStorage.getItem(k),write(k,v){if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);if(localStorage.getItem(k)!==v)throw Error('Storage did not retain a recovery value. Keep the checkpoint.');},guard(){
  if(memMode||db.backend.kind==='memory')throw Error('Durable browser storage is required. Download your backup; recovery is not available in temporary storage.');
  if(account.session()||rawGet('ap_backup_sync')==='true')throw Error('Local-only recovery requires signing out (keep data) and pausing backup-code sync first. No sync target is changed here.');
  if(db.meta.privacyConflict||db.meta.ownershipReview?.needed)throw Error('Resolve the privacy or older-bag review on Me first; existing data is kept.');
  if(identity()!==initial)throw Error('Identity or sync choice changed. Review again; no destination is rebound.');
  localStorage.getItem('ap_prefs'); // strict read: never silently fall back to a temporary mirror
 }};
}
async function refresh(){proj();emit('data');emit('prefs');applyTextSize(prefs().textSize);const m=await import('../main.js');m.applyTheme();}
function download(data){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.href=url;a.download='arsenal-before-local-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export function localRecoveryPanel(db,parsed=null){
 const root=h('div',{class:'stack',id:parsed?'localReview':'localRecoveryStatus'}),io=recoveryIO(db);let choices={},ack=false,busy=false,error='',expanded=false;
 const message=text=>h('p',{class:'small',text});
 async function run(fn){if(busy)return;busy=true;error='';draw();try{await fn();await refresh();const old=document.getElementById('impCommit');if(old)old.disabled=true;}catch(e){error=e.message||'Recovery paused. Keep both files.';}finally{busy=false;draw();}}
 function draw(){
  const prior=root.querySelector('#localReviewDetails'),focused=root.contains(document.activeElement)?document.activeElement.id:null;if(prior)expanded=prior.open;
  root.replaceChildren();const j=db.meta.localRecovery,pending=j&&['prepared','committed'].includes(j.phase);
  if(pending&&parsed&&document.querySelector('#localRecoveryStatus #localUndo')){root.append(message('A local recovery is pending. Use its review controls above before another restore.'));return;}
  if(pending){
   const issues=undoLocalIssues(db,io);
   root.append(h('h3',{class:'section-title',text:j.phase==='prepared'?'Local recovery needs review':'Local recovery saved — review now'}),message('Sync is paused. No account or backup-code destination was changed. Keep a private copy of the checkpoint before continuing. Undo is available only before later events/settings edits, and never removes event history.'),
    h('button',{class:'btn ghost block',id:'localCheckpoint',disabled:busy,onclick:()=>download(j.beforeBackup)},'Download pre-restore checkpoint'),
    ...(issues.length?[h('p',{class:'warn-box small',id:'localUndoBlocked',text:issues.join(' ')})]:[]),
    h('button',{class:'btn ghost block',id:'localUndo',disabled:busy||!!issues.length,onclick:()=>run(()=>undoLocalRecovery(db,io))},'Undo local recovery'),
    j.phase==='committed'?h('button',{class:'btn primary block',id:'localKeep',disabled:busy,onclick:()=>run(()=>finishLocalRecovery(db,io))},'Keep current data (end Undo)'):message('An interrupted restore keeps sync paused. Use guarded Undo. If later edits block it, export this phone and its checkpoint for separate review; do not clear storage.'));
  }else if(j){root.append(message(j.phase==='undone'?'Local recovery undone. Original values restored; event history and checkpoint retained. Undone event IDs cannot be re-added by the same file here; keep it for separate clean-profile recovery.':'Current data kept. Local recovery Undo has ended; checkpoint remains in backup files.'));
  }
  if(parsed&&!pending){
   const plan=planLocalRecovery(db,parsed,io,choices);
   const detail=h('details',{class:'tn-more',id:'localReviewDetails'},h('summary',{text:'Review settings and nonempty lists locally'}));
   detail.open=expanded;
   const content=h('div',{class:'stack'},message('This optional path adds non-conflicting events, reconciles saved lines/surfaces/notes and restores validated appearance, help, wake-lock, onboarding and saved aiming settings. Existing values win unless you choose otherwise. Account/team archives, unsupported preferences, raw snapshots and older miss-shot mirrors are not full-phone recovery.'),message('Use one Arsenal tab only. Close other tabs before preview; cross-tab recovery is not supported. Use only your own authorized backup. Same-account sync still uses last-write-wins; export before signing in. No upload occurs during this local review.'));
   if(!plan.ok)content.append(h('p',{class:'warn-box small',id:'localPlanBlocked',text:plan.issues.join(' ')}));
   else{
    content.append(message(`${plan.events.length} new events; ${plan.changes.length} settings/list additions or selected changes. Unchecked conflicts keep this phone’s value.`));
    plan.conflicts.forEach((c,i)=>{const id='localConflict'+i,input=h('input',{type:'checkbox',id,checked:c.take,onchange:()=>{choices[c.id]=input.checked;draw();}});content.append(h('label',{class:'recovery-choice',for:id},input,h('span',{},h('strong',{text:c.id}),h('span',{class:'small',text:' This phone: '+JSON.stringify(c.current)+'. File: '+JSON.stringify(c.incoming)+'. Use file value.'}))));});
    const box=h('input',{type:'checkbox',id:'localAck',checked:ack,onchange:()=>{ack=box.checked;apply.disabled=!ack||busy;}}),apply=h('button',{class:'btn primary block',id:'localApply',disabled:busy||!ack,onclick:()=>run(()=>applyLocalRecovery(db,parsed,plan,io))},'Apply reviewed local recovery');
    content.append(h('label',{class:'recovery-choice',for:'localAck'},box,h('span',{text:'This file is mine to restore. Other Arsenal tabs are closed. I will review before continuing.'})),apply);
   }
   if(plan.unsupported.length)content.append(h('details',{class:'tn-more',id:'localUnsupported'},h('summary',{text:'Not applied by this recovery'}),h('ul',{class:'plain small'},...plan.unsupported.map(text=>h('li',{text})))));
   detail.append(content);root.append(detail);
  }
  if(error)root.append(h('p',{class:'warn-box',id:'localRecoveryError',role:'alert',text:error}));
  if(focused)root.querySelector('#'+focused)?.focus({preventScroll:true});
 }
 draw();return root;
}

import { profile, setProfile, prefs, setPrefs, deviceId, useCode, status, on, API_BASE } from '../store.js';
import * as hub from '../hub.js';
const { ready } = hub;
import { buildBackup, BACKUP_NAME } from '../data/backup.js';
import { h, icon, toast, segmented, sheet } from '../ui.js';
import { adjust } from '../ctl.js';
import { profileForm, ownedPicker } from './welcome.js';
import { applyTheme } from '../main.js';
export const VERSION = '2.0.0';
export function render() {
  const p = Object.assign({ hand:'right', style:'tweener', speed:15, rev:220, pap:'', tilt:'', owned:[] }, profile() || {});
  const editProfile = () => {
    const q = { ...p }, f = profileForm(q);
    const s = sheet({ title:'Your profile', id:'profSheet', body:h('div', { class:'stack' }, f.hand, f.style, f.speed, f.rev, f.pap, f.tilt,
      h('button', { class:'btn primary block', id:'profSave', onclick:() => { setProfile(q); adjust({ speed:q.speed, rev:q.rev }); s.close(); toast('Profile saved'); draw(); } }, 'Save profile')) });
  };
  const editBag = () => { const q = { ...p }; const s = sheet({ title:'My bag', id:'bagSheet', body:h('div', { class:'stack' }, ownedPicker(q), h('button', { class:'btn primary block', onclick:() => { setProfile({ ...p, owned:q.owned }); s.close(); toast('Bag saved'); draw(); } }, 'Save bag')) }); };
  const code = h('code', { class:'code', id:'devCode', text:deviceId() });
  const codeIn = h('input', { id:'codeIn', placeholder:'Paste a backup code', 'aria-label':'Backup code', autocomplete:'off', spellcheck:'false' });
  const stat = h('span', { class:'muted small', id:'moreStatus', 'aria-live':'polite' });
  const paintStat = () => stat.textContent = status.text || 'Not synced yet';
  const body = h('div', { class:'stack' });
  async function downloadBackup() {
    const db = await ready(); const b = await buildBackup(db, { prefs:prefs(), legacy:db.meta.legacySnapshot || null });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(b)], { type:'application/json' })); a.download = BACKUP_NAME; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    await db.setMeta('backupDownloadedAt', Date.now()); toast(`Backup saved: ${b.events.length} events`); paintData();
  }
  const dataInfo = h('p', { class:'small', id:'dataInfo', text:'Loading your history\u2026' });
  function paintData() {
    const db = hub.db; if (!db) return; const P = db.projection(), m = db.meta;
    const unsynced = db.events().filter(e => !e.synced).length;
    dataInfo.textContent = `${db.events().length} events on this phone (${db.backend.kind}). ${Object.keys(P.owned).length} owned balls, ${P.games.length} games, ${P.aggregates.length} tracker sessions. ${syncLine(m.sync, unsynced)}${m.backupDownloadedAt ? '' : ' No v1 backup downloaded yet: your pre-2.1 data is kept as a snapshot until you download one.'}`;
  }
  // Server sync of the event log (D3). The quota message comes from the server; the phone keeps everything regardless.
  function syncLine(st, unsynced) {
    if (st && st.quota && st.quota.full) return `Server backup is full (${st.quota.limit} events); ${unsynced} newer events are kept only on this phone. Download a backup below.`;
    if (!unsynced) return st && st.lastPushAt ? 'All synced.' : 'Nothing to sync.';
    return `${unsynced} waiting to sync${st && st.lastError ? ' (offline, will retry)' : ''}.`;
  }
  ready().then(paintData);
  function draw() {
    const pr = profile();
    body.innerHTML = '';
    body.append(
      h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Bowler profile' }), h('button', { class:'btn sm ghost', id:'editProfile', onclick:editProfile }, h('span', { html:icon('edit') }), 'Edit')),
        pr ? h('p', { text:`${pr.hand === 'left' ? 'Left' : 'Right'}-handed ${pr.style === 'two' ? 'two-hander' : pr.style}, ${(+pr.speed).toFixed(1)} mph, ${pr.rev} rpm${pr.pap ? ', PAP ' + pr.pap : ''}${pr.tilt ? ', tilt ' + pr.tilt : ''}.` }) : h('p', { class:'muted', text:'Not set. The lane uses its defaults (15 mph, 220 rpm).' }),
        h('div', { class:'row between' }, h('span', { text:`My bag: ${pr && pr.owned && pr.owned.length ? pr.owned.length + ' balls' : 'all 22'}` }), h('button', { class:'btn sm ghost', id:'editBag', onclick:editBag }, 'Choose'))),
      h('div', { class:'card', id:'dataCard' }, h('h2', { class:'card-title', text:'Your data' }), dataInfo,
        h('div', { class:'btn-grid' }, h('a', { class:'btn ghost', href:'#/import', id:'goImport' }, 'Import a file'), h('a', { class:'btn ghost', href:'#/import?kind=lanetrax', id:'goLaneTrax' }, 'LaneTrax report'), h('a', { class:'btn ghost', href:'#/card', id:'goCardMore' }, 'My Bowler Card'), h('a', { class:'btn ghost', href:'#/sessions', id:'goNights' }, 'Past sessions'))),
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'Appearance' }), segmented('Theme', [['dark', 'Alley dark'], ['light', 'Light'], ['system', 'System']], prefs().theme || 'dark', v => { setPrefs({ theme:v }); applyTheme(v); }, 'wide')),
      h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Sync & backup' }), stat),
        h('p', { class:'small', text:'Your backup code links this device to your saved lines on the server. Keep it private; anyone with it can see your lines.' }),
        h('div', { class:'row gap wrap' }, code, h('button', { class:'btn sm ghost', id:'copyCode', onclick:async () => { try { await navigator.clipboard.writeText(deviceId()); toast('Code copied'); } catch (e) { toast('Copy failed. Select the code and copy it.', { kind:'bad' }); } } }, 'Copy'),
          h('button', { class:'btn sm ghost', id:'dlBackup', onclick:downloadBackup }, 'Download backup')),
        h('form', { class:'inline-form', onsubmit:e => { e.preventDefault(); if (useCode(codeIn.value)) { code.textContent = deviceId(); codeIn.value = ''; toast('Code set. Syncing\u2026'); } else toast('That code doesn\u2019t look right (8\u201364 letters, numbers, - or _).', { kind:'bad' }); } },
          h('label', { class:'fld grow' }, h('span', { text:'Restore from another device' }), codeIn), h('button', { class:'btn primary', type:'submit' }, 'Use code'))),
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'About' }),
        h('p', { class:'small', text:'Arsenal Pro models how each ball in your arsenal reads the lane, and coaches your next move. Ball specs come from manufacturer data (marked est. where estimated). Pattern library: Kegel Pattern Library via CarryDown.' }),
        h('p', { class:'small muted', text:`Version ${VERSION} \u00b7 API ${API_BASE.replace(/^https?:\/\//, '')}` }),
        h('p', { class:'small' }, h('a', { href:'#/welcome' }, 'Replay the welcome tour'))));
    paintStat();
  }
  draw();
  const off = on('status', paintStat), offD = on('data', paintData), offS = on('sync', paintData);
  const el = h('section', { class:'screen list-screen' }, h('header', { class:'appbar' }, h('h1', { class:'title', text:'More' })), body);
  return { el, title:'More', destroy:() => { off(); offD(); offS(); } };
}

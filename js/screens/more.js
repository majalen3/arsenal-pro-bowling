import { profile, setProfile, prefs, setPrefs, deviceId, useCode, status, on, API_BASE } from '../store.js';
import * as hub from '../hub.js';
const { ready } = hub;
import * as PR from '../cc/protect.js';
import * as WK from '../cc/wake.js';
import { h, icon, toast, segmented, sheet } from '../ui.js';
import { adjust } from '../ctl.js';
import { go } from '../router.js';
import * as HAND from '../cc/hand.js';
import { profileForm, ownedPicker } from './welcome.js';
import { gameTotalButton } from './gametotal.js';
import { applyTheme } from '../main.js';
export const VERSION = '2.0.0';
export function render() {
  const p = Object.assign({ hand:null, style:'tweener', speed:15, rev:220, pap:'', tilt:'', owned:[] }, profile() || {});
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
    const db = await ready(); await PR.saveBackupFile(db, prefs()); toast('Backup file saved.'); paintData();
  }
  const dataInfo = h('p', { class:'small', id:'dataInfo', text:'Loading your history\u2026' });
  const dataCounts = h('p', { class:'small', id:'dataCounts' });
  // GAP (a): one plain status chip; the why and the fixes sit behind "Keep it safe".
  const protChip = h('span', { class:'pill', id:'protChip', text:'Checking\u2026' });
  const lastBk = h('p', { class:'small', id:'lastBackup' });
  const protBody = h('div', { class:'stack', id:'protBody' });
  async function paintProtect() {
    const st = await PR.state(); protChip.textContent = st.label; protChip.className = 'pill' + (st.label === 'Protected' ? ' gold' : '');
    protBody.innerHTML = '';
    protBody.append(h('p', { class:'small', text: st.standalone ? 'Installed on this phone: Safari\u2019s 7-day clean-up does not apply.' : 'Safari can clear a website\u2019s data after 7 days without a visit. Apps added to the Home Screen are exempt.' }));
    if (!st.standalone) { const how = PR.installHow();
      protBody.append(how ? h('p', { class:'small', id:'installHow', text:how }) : h('button', { class:'btn ghost block', id:'installBtn', onclick:async () => { if (await PR.promptInstall()) toast('Installed.'); paintProtect(); } }, 'Install the app')); }
    if (!st.persisted && navigator.storage && navigator.storage.persist) protBody.append(h('button', { class:'btn ghost block', id:'askPersist', onclick:async () => { const ok = await PR.askPersist(); toast(ok ? 'This browser will keep your data.' : 'The browser said no. Install the app or keep a backup file.'); paintProtect(); } }, 'Ask the browser to keep my data'));
    protBody.append(h('p', { class:'small muted', text:'A backup file always works: Download backup, below.' }));
  }
  function paintData() {
    const db = hub.db; if (!db) return; const P = db.projection(), m = db.meta;
    const unsynced = db.events().filter(e => !e.synced).length;
    // Plain words (sim bug 8): what is safe and what to do, counts behind a tap. No developer terms.
    const legacy = !m.backupDownloadedAt && db.meta.legacySnapshot;
    dataInfo.textContent = syncLine(m.sync, unsynced) + (legacy ? ' Your data from the older app version is also kept here until you download a backup file.' : '');
    lastBk.textContent = PR.lastBackupText(PR.lastBackupAt(m));
    dataCounts.textContent = `On this phone: ${Object.keys(P.owned).length} balls, ${P.games.length} games, ${P.aggregates.length} LaneTrax reports (${db.events().length} saved changes).`;
  }
  // Server sync of the event log (D3). The quota message comes from the server; the phone keeps everything regardless.
  function syncLine(st, unsynced) {
    if (st && st.quota && st.quota.full) return `Server backup is full; your ${unsynced} newest ${unsynced === 1 ? 'change is' : 'changes are'} kept only on this phone. Download a backup file below.`;
    if (!unsynced) return st && st.lastPushAt ? 'Backed up to the server.' : 'Saved on this phone. Nothing to back up yet.';
    return `Saved on this phone; ${unsynced} ${unsynced === 1 ? 'change' : 'changes'} waiting to back up${st && st.lastError ? (navigator.onLine === false ? ' (offline, will retry)' : ' (server not reached, will retry)') : ''}.`;
  }
  ready().then(paintData); paintProtect();
  function draw() {
    const pr = profile();
    body.innerHTML = '';
    body.append(
      // IA_PLAN P1.7: until P2 moves Learn to its own tab, More opens with it (owner: "I thought we had a bowler's education").
      h('div', { class:'card', id:'helpCard' }, h('h2', { class:'card-title', id:'learnTitle', text:'Learn' }),
        h('div', { class:'btn-grid' }, h('a', { class:'btn primary', id:'goGuide', href:'#/guide' }, 'Bowling Guide'), h('a', { class:'btn ghost', id:'goGlossary', href:'#/glossary' }, 'Glossary')),
        h('div', { class:'fld', id:'helpFld' }, h('span', { text:'Help bubbles \u201c?\u201d' }), segmented('Help bubbles', [['off', 'Off'], ['on', 'On']], prefs().help === true ? 'on' : 'off', v => { setPrefs({ help: v === 'on' }); go(location.hash, { replace:true }); }, 'wide'),
          h('p', { class:'small muted', text:'Puts a \u201c?\u201d next to bowling words on every screen; tap it for a plain answer. Same switch as the \u201c?\u201d at the top. Never on the scoring pad.' }))),
      h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Bowler profile' }), h('button', { class:'btn sm ghost', id:'editProfile', onclick:editProfile }, h('span', { html:icon('edit') }), 'Edit')),
        pr ? h('p', { text:`${HAND.handOfProfile(pr) ? HAND.HAND_LABEL[HAND.handOfProfile(pr)] : 'Hand not set'}, ${pr.style === 'two' ? 'two-hander' : pr.style}, ${(+pr.speed).toFixed(1)} mph, ${pr.rev} rpm${pr.pap ? ', PAP ' + pr.pap : ''}${pr.tilt ? ', tilt ' + pr.tilt : ''}.` }) : h('p', { class:'muted', text:'Not set. The lane uses its defaults (15 mph, 220 rpm).' }),
        h('div', { class:'row between' }, h('span', { text:`My bag: ${pr && pr.owned && pr.owned.length ? pr.owned.length + ' balls' : 'all 22'}` }), h('button', { class:'btn sm ghost', id:'editBag', onclick:editBag }, 'Choose'))),
      h('div', { class:'card', id:'dataCard' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Your data' }), protChip), dataInfo, lastBk,
        h('details', { class:'tn-more', id:'protMore' }, h('summary', { text:'Keep it safe' }), protBody),
        h('details', { class:'tn-more', id:'dataMore' }, h('summary', { text:'What\u2019s saved' }), dataCounts),
        h('div', { class:'btn-grid' }, h('a', { class:'btn ghost', href:'#/import', id:'goImport' }, 'Import a file'), h('a', { class:'btn ghost', href:'#/import?kind=lanetrax', id:'goLaneTrax' }, 'LaneTrax report'), h('a', { class:'btn ghost', href:'#/card', id:'goCardMore' }, 'My Bowler Card'), h('a', { class:'btn ghost', href:'#/sessions', id:'goNights' }, 'Past sessions')),
        gameTotalButton('moreAddTotal', { onDone: sid => go('#/session/' + encodeURIComponent(sid)) })),
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'Appearance' }), segmented('Theme', [['dark', 'Alley dark'], ['light', 'Light'], ['system', 'System']], prefs().theme || 'dark', v => { setPrefs({ theme:v }); applyTheme(v); }, 'wide'),
        h('div', { class:'fld', id:'textSizeFld' }, h('span', { text:'Text size' }), segmented('Text size', [['normal', 'Normal'], ['large', 'Large'], ['xl', 'Extra large']], prefs().textSize || 'normal', v => { setPrefs({ textSize:v }); WK.applyTextSize(v); }, 'wide')),
        h('div', { class:'fld', id:'wakeFld' }, h('span', { text:'Keep the screen on during a game' }), segmented('Keep the screen on during a game', [['on', 'On'], ['off', 'Off']], prefs().wakeLock === false ? 'off' : 'on', v => setPrefs({ wakeLock: v === 'on' }), 'wide'),
          h('p', { class:'small muted', id:'wakeNote', text: WK.supported() ? 'Only while a game is open; off at the last frame or after 10 idle minutes.' : 'This browser can\u2019t keep the screen on; set Auto-Lock in your phone settings instead.' }))),
      h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Sync & backup' }), stat),
        h('p', { class:'small', text:'Your backup code links this device to your saved lines on the server. Keep it private; anyone with it can see your lines.' }),
        h('div', { class:'row gap wrap' }, code, h('button', { class:'btn sm ghost', id:'copyCode', onclick:async () => { try { await navigator.clipboard.writeText(deviceId()); toast('Code copied'); const db = await ready(); await db.setMeta('codeCopiedAt', Date.now()); paintData(); } catch (e) { toast('Copy failed. Select the code and copy it.', { kind:'bad' }); } } }, 'Copy'),
          h('button', { class:'btn sm ghost', id:'dlBackup', onclick:downloadBackup }, 'Download backup')),
        h('form', { class:'inline-form', onsubmit:e => { e.preventDefault(); if (useCode(codeIn.value)) { code.textContent = deviceId(); codeIn.value = ''; toast('Code set. Syncing\u2026'); } else toast('That code doesn\u2019t look right (8\u201364 letters, numbers, - or _).', { kind:'bad' }); } },
          h('label', { class:'fld grow' }, h('span', { text:'Restore from another device' }), codeIn), h('button', { class:'btn primary', type:'submit' }, 'Use code'))),
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'About' }),
        h('p', { class:'small', text:'Arsenal Pro models how each ball in your arsenal reads the lane, and coaches your next move. Ball specs come from manufacturer data (marked est. where estimated). Pattern library: Kegel Pattern Library via CarryDown.' }),
        h('p', { class:'small muted', text:`Version ${VERSION} \u00b7 API ${API_BASE.replace(/^https?:\/\//, '')}` }),
        h('a', { class:'btn ghost', href:'#/welcome', id:'replayTour' }, 'Replay the welcome tour')));
    paintStat();
  }
  draw();
  const off = on('status', paintStat), offD = on('data', paintData), offS = on('sync', paintData);
  const el = h('section', { class:'screen list-screen' }, h('header', { class:'appbar' }, h('h1', { class:'title', text:'More' })), body);
  return { el, title:'More', destroy:() => { off(); offD(); offS(); } };
}

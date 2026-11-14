import { profile, setProfile, prefs, setPrefs, deviceId, useCode, status, on, rawGet, rawSet, memMode } from '../store.js';
import * as hub from '../hub.js';
const { ready } = hub;
import * as PR from '../cc/protect.js';
import * as WK from '../cc/wake.js';
import { h, icon, toast, segmented, sheet } from '../ui.js';
import { adjust } from '../ctl.js';
import { go } from '../router.js';
import * as HAND from '../cc/hand.js';
import { gameTotalButton } from './gametotal.js';
import { applyTheme, BRANDS, DEFAULT_BRAND } from '../main.js';
import { helpDot } from './help.js';
import { START as S } from '../engine.js';
import { accountCard } from './account.js';
import { communityCard } from './community.js';
import { account } from '../account.js';
export const VERSION = '1.1.0';   // release version (CHANGELOG.md); the offline build id comes from the service worker cache name
// IA P2: the Me screen (header button on every tab): profile, data, appearance, sync, about. PRODUCT_SPINE: Learn, Glossary and patterns links live here (no Learn tab).
export function render() {
  const p = Object.assign({ hand:null, style:null, speed:null, rev:null, entered:{}, pap:'', tilt:'', owned:[] }, profile() || {});
  const editProfile = async () => {
    const { profileForm } = await import('./welcome.js');
    const current = profile() || p, q = { ...current, entered:current.entered ? { ...current.entered } : { speed:current.speed != null && current.speed !== '', rev:current.rev != null && current.rev !== '' } }, f = profileForm(q);
    const s = sheet({ title:'Your profile', id:'profSheet', body:h('div', { class:'stack' }, f.hand, f.style, f.speed, f.rev, f.pap, f.tilt,
      h('button', { class:'btn primary block', id:'profSave', onclick:() => { setProfile(q); adjust(Object.fromEntries(['speed','rev'].filter(k => q[k] != null && q[k] !== '').map(k => [k, +q[k]]))); s.close(); toast('Profile saved'); draw(); } }, 'Save profile')) });
  };
  const editBag = () => go('#/welcome' + (hub.db?.meta.ownershipReview?.needed ? '?review=1' : ''));
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
    const st = await PR.state(); protChip.textContent = st.label; protChip.className = 'pill' + (st.label === 'Retention requested' ? ' gold' : '');
    protBody.innerHTML = '';
    protBody.append(h('p', { class:'small', text: st.standalone ? 'Installed on this phone. Browser storage can still be lost; keep a separate backup.' : 'Browsers can clear website data. Home Screen installation may improve retention, but is not a backup.' }));
    if (!st.standalone) { const how = PR.installHow();
      protBody.append(how ? h('p', { class:'small', id:'installHow', text:how }) : h('button', { class:'btn ghost block', id:'installBtn', onclick:async () => { if (await PR.promptInstall()) toast('Installed.'); paintProtect(); } }, 'Install the app')); }
    if (!st.persisted && navigator.storage && navigator.storage.persist) protBody.append(h('button', { class:'btn ghost block', id:'askPersist', onclick:async () => { const ok = await PR.askPersist(); toast(ok ? 'Browser retention permission granted; this is not a backup guarantee.' : 'The browser said no. Install the app or keep a backup file.'); paintProtect(); } }, 'Ask the browser to keep my data'));
    protBody.append(h('p', { class:'small muted', text:'Download a backup file below and test restoring it. Keep the file private; loss, corruption or an incompatible version can prevent recovery.' }));
  }
  function paintData() {
    const db = hub.db; if (!db) return; const P = db.projection(), m = db.meta;
    const unsynced = db.events().filter(e => !e.synced).length;
    // Plain words (sim bug 8): what is safe and what to do, counts behind a tap. No developer terms.
    const legacy = !m.backupDownloadedAt && db.meta.legacySnapshot;
    dataInfo.textContent = (db.backend.kind === 'memory' || memMode ? 'Storage is unavailable: some changes last only until this tab closes. Download a backup now. ' : '') + syncLine(m.sync, unsynced) + (legacy ? ' Your data from the older app version is also kept here until you download a backup file.' : '');
    lastBk.textContent = PR.lastBackupText(PR.lastBackupAt(m));
    dataCounts.textContent = `On this phone: ${Object.keys(P.owned).length} balls, ${P.games.length} games, ${P.aggregates.length} LaneTrax reports (${db.events().length} saved changes).`;
  }
  // Server sync of the event log (D3). The quota message comes from the server; the phone keeps everything regardless.
  function syncLine(st, unsynced) {
    if (hub.db?.meta.localRecovery && !['undone','closed'].includes(hub.db.meta.localRecovery.phase)) return 'Local recovery needs review. Sync is paused; no destination changed. Open Import to download the checkpoint, Undo before later edits, or keep completed recovery.';
    if (st?.recoveryBlocked) return 'Account recovery is paused for separate review. Conflicting incoming records were not applied and this attempt uploaded no new local records. Keep this phone’s backup and your account export. Full settings/nonempty-mirror recovery is unsupported here; do not clear this phone.';
    if (!account.active() && (rawGet('ap_backup_sync') !== 'true' || hub.db?.meta.accountBinding)) return 'Saved on this phone only. Server sync is paused; no backup-code copy is made. Download a backup file below.';
    if (st && st.quota && st.quota.full) return `Server backup is full; your ${unsynced} newest ${unsynced === 1 ? 'change is' : 'changes are'} kept only on this phone. Download a backup file below.`;
    if (!unsynced) return st && st.lastPushAt ? 'Server acknowledged the latest sync to your chosen target.' : 'Saved on this phone. Nothing to back up yet.';
    return `Saved on this phone; ${unsynced} ${unsynced === 1 ? 'change' : 'changes'} waiting to back up${st && st.lastError ? (navigator.onLine === false ? ' (offline, will retry)' : ' (server not reached, will retry)') : ''}.`;
  }
  // Hydration often changes only data counts. Do not tear down unchanged account/privacy
  // text (or focused controls) a second time after the first paint.
  const viewKey = () => JSON.stringify([profile(), hub.db ? Object.keys(hub.db.projection().owned).length : 0,
    !!hub.db?.meta.ownershipReview?.needed, !!hub.db?.meta.ownershipReview?.confirmed, hub.db?.meta.accountBinding || null, !!hub.db?.meta.privacyConflict]);
  let paintedKey;
  ready().then(() => { paintData(); if (viewKey() !== paintedKey) draw(); }); paintProtect();
  function draw() {
    paintedKey = viewKey();
    const pr = profile();
    body.innerHTML = '';
    const build = h('p', { class:'small muted', id:'aboutVersion', text:`Version ${VERSION}` });
    // PRODUCT_SPINE: Learn left the tab bar; it lives here, first on Me (Me is in every spine screen's top bar): a word search
    // (Me -> type -> Enter opens the Glossary), Learn, Glossary and Oil patterns. Click map: docs/PRODUCT_SPINE.md.
    const lq = h('input', { type:'search', class:'search', id:'meSearch', placeholder:'Look up a bowling word', 'aria-label':'Search the Bowling Guide and Glossary', autocomplete:'off', enterkeyhint:'search' });
    body.append(
      h('div', { class:'card', id:'meLearn' }, h('h2', { class:'card-title', text:'Learn' }),
        h('form', { role:'search', id:'meSearchForm', onsubmit:e => { e.preventDefault(); const q = lq.value.trim(); go('#/glossary' + (q ? '?q=' + encodeURIComponent(q) : '')); } }, lq),
        h('div', { class:'btn-grid' }, h('a', { class:'btn ghost', href:'#/learn', id:'meLearnLink' }, 'Learn'), h('a', { class:'btn ghost', href:'#/glossary', id:'meGlossary' }, 'Glossary'), h('a', { class:'btn ghost', href:'#/learn/patterns', id:'mePatterns' }, 'Oil patterns'))),
      h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Bowler profile' }), h('button', { class:'btn sm ghost', id:'editProfile', onclick:editProfile }, h('span', { html:icon('edit') }), 'Edit')),
        pr ? h('p', { text:`${HAND.handOfProfile(pr) ? HAND.HAND_LABEL[HAND.handOfProfile(pr)] : 'Hand not set'}, ${pr.style === 'two' ? 'two-hander' : (pr.style || 'style not set')}, ${pr.speed != null && pr.speed !== '' ? (+pr.speed).toFixed(1) + ' mph' : 'speed not set'}, ${pr.rev != null && pr.rev !== '' ? pr.rev + ' rpm' : 'revs not set'}${pr.pap ? ', PAP ' + pr.pap : ''}${pr.tilt ? ', tilt ' + pr.tilt : ''}.` }) : h('p', { class:'muted', text:`Not set. The lane uses mid-range starting values (${S.speed} mph, ${S.rev} rpm) until you enter yours.` }),
        h('div', { class:'row between' }, h('span', { text:`Owned arsenal: ${hub.db ? Object.keys(hub.db.projection().owned).length : 0} physical balls` }), h('button', { class:'btn sm ghost', id:'editBag', onclick:editBag }, hub.db?.meta.ownershipReview?.needed ? 'Review older bag' : 'Add balls')),
        h('div', { class:'row between' }, h('span', { class:'small muted', text:'PAP from your drill card' }), h('a', { class:'btn sm ghost', id:'meDrillScan', href:'#/me/drill-card' }, 'Scan a drill card'))),
      ...(hub.db?.meta.ownershipReview?.needed ? [h('div', { class:'card', id:'legacyReview' }, h('p', { class:'small', text:'Your older catalog view is preserved. It did not prove which physical balls you own. Review your selections; saved balls, games, layouts and aims are not removed.' }), h('a', { class:'btn ghost block', href:'#/welcome?review=1' }, 'Review older bag'))] : []),
      ...(hub.db?.meta.ownershipReview?.confirmed ? [h('button', { class:'btn ghost block', id:'undoOwnershipReview', onclick:async () => { await hub.undoOwnershipReview(); draw(); } }, 'Undo older-bag review (keep all history)')] : []),
      accountCard(), communityCard(),
      h('div', { class:'card', id:'dataCard' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Your data' }), protChip), dataInfo, lastBk,
        h('p',{class:'small muted',id:'syncConflictLimit',text:'Same-account sync uses last-write-wins, not conflict review or server Undo. Export this phone before signing in or changing devices.'}),
        hub.db?.meta.localRecovery && !['undone','closed'].includes(hub.db.meta.localRecovery.phase) ? h('a',{class:'btn ghost block',href:'#/import',id:'reviewLocalRecovery'},'Review local recovery') : null,
        h('details', { class:'tn-more', id:'protMore' }, h('summary', { text:'Keep it safe' }), protBody),
        h('details', { class:'tn-more', id:'dataMore' }, h('summary', { text:'What\u2019s saved' }), dataCounts),
        h('div', { class:'btn-grid' }, h('a', { class:'btn ghost', href:'#/import', id:'goImport' }, 'Import a file'), h('a', { class:'btn ghost', href:'#/import?kind=lanetrax', id:'goLaneTrax' }, 'LaneTrax report'), h('a', { class:'btn ghost', href:'#/card', id:'goCardMore' }, 'My Bowler Card'), h('a', { class:'btn ghost', href:'#/results', id:'goNights' }, 'Log book'), h('button', { class:'btn ghost', id:'moreExport', onclick:async () => (await import('./export.js')).openExport() }, 'Export my arsenal')),
        gameTotalButton('moreAddTotal', { onDone: sid => go('#/session/' + encodeURIComponent(sid)) })),
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'Appearance' }), segmented('Mode', [['dark', 'Dark'], ['light', 'Light'], ['system', 'Auto']], prefs().theme || 'dark', v => { setPrefs({ theme:v }); applyTheme(v); markLook(); }, 'wide'),
        lookPicker(),
        h('div', { class:'fld', id:'textSizeFld' }, h('span', { text:'Text size' }), segmented('Text size', [['normal', 'Normal'], ['large', 'Large'], ['xl', 'Extra large']], prefs().textSize || 'normal', v => { setPrefs({ textSize:v }); WK.applyTextSize(v); }, 'wide')),
        h('div', { class:'fld', id:'wakeFld' }, h('span', { text:'Keep the screen on during a game' }), segmented('Keep the screen on during a game', [['on', 'On'], ['off', 'Off']], prefs().wakeLock === false ? 'off' : 'on', v => setPrefs({ wakeLock: v === 'on' }), 'wide'),
          h('p', { class:'small muted', id:'wakeNote', text: WK.supported() ? 'Only while a game is open; off at the last frame or after 10 idle minutes.' : 'This browser can\u2019t keep the screen on; set Auto-Lock in your phone settings instead.' }))),
      h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Sync & backup' }), stat),
        h('p', { class:'small', id:'codeNote', text: account.active() ? 'Chosen target: your account. Signing out pauses sync; it never switches to a backup code.' : hub.db?.meta.accountBinding ? 'Account sync paused. This private history stays local until you sign in to its original account. Backup-code copying and another account are blocked.' : rawGet('ap_backup_sync') === 'true' ? 'Chosen target: backup code. Anyone with that private code can access its copy. Download a file too.' : 'Local only. Backup-code sync is optional and is OFF until you enable it. Anyone with a code can access its copy.' }),
        h('button', { class:'btn ghost block', id:'dlBackup', onclick:downloadBackup }, 'Download backup'),
        !account.session() && !hub.db?.meta.accountBinding && (!hub.db?.meta.localRecovery || ['undone','closed'].includes(hub.db.meta.localRecovery.phase)) ? h('details', { class:'tn-more', id:'backupCodeTools' }, h('summary', { text:'Optional private backup-code sync' }),
          h('p', { class:'small', text:'Enabling this copies this phone’s history to the chosen code and brings its remote history here. Use only a private code you are authorized to use. It is not account sign-in.' }),
          h('div', { class:'row gap wrap' }, code, h('button', { class:'btn sm ghost', id:'copyCode', onclick:async () => { try { await navigator.clipboard.writeText(deviceId()); toast('Private code copied'); } catch (_) { toast('Copy failed', { kind:'bad' }); } } }, 'Copy code')),
          h('button', { class:'btn ghost block', id:'enableCodeSync', onclick:() => { if (useCode(deviceId())) { draw(); paintData(); toast('Backup-code sync enabled. Check server acknowledgement.'); } } }, 'Enable backup-code sync'),
          h('form', { class:'stack', onsubmit:e => { e.preventDefault(); if (useCode(codeIn.value)) { code.textContent = deviceId(); codeIn.value = ''; draw(); paintData(); toast('Chosen code set. Waiting for server acknowledgement.'); } else toast('Code not accepted. Account history cannot move to a backup code.', { kind:'bad' }); } },
            h('label', { class:'fld' }, h('span', { text:'Merge / restore with an authorized backup code' }), codeIn), h('button', { class:'btn primary', type:'submit' }, 'Use code and sync'))) : null),
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'About' }),
        h('p', { class:'small', text:'Arsenal Pro models how each ball in your arsenal reads the lane, and coaches your next move. Ball specs come from manufacturer data (marked est. where estimated). Pattern library: Kegel Pattern Library via CarryDown.' }),
        h('p', { class:'small', id:'aboutPrivacy', text:'Privacy: your games, balls and notes are saved on this phone first and work offline. No server copy is made by default. Choose optional backup-code sync or an account; account signout pauses sync, without copying to a code. A server copy is not a permanent retention guarantee. An account is optional and only needs an email and password; you can export or delete it on this screen. My Team is opt-in: teammates see only the items you choose to share (never your email), and leaving a team removes them. Share cards are made on this phone and are never posted for you. No ads, no tracking, and it is free.' }),
        h('div', { class:'row gap wrap' }, h('a', { class:'btn ghost', href:'https://github.com/majalen3/arsenal-pro-bowling/blob/main/CHANGELOG.md', target:'_blank', rel:'noopener', id:'aboutChanges' }, 'What\u2019s new'),
          h('a', { class:'btn ghost', href:'https://github.com/majalen3/arsenal-pro-bowling', target:'_blank', rel:'noopener', id:'aboutSource' }, 'Source code'),
          h('a', { class:'btn ghost', href:'#/me/usage', id:'aboutUsage' }, 'Tests and usage')),   // Now item 5: counts on this phone only
        build));
    if (self.caches) caches.keys().then(ks => { const k = ks.find(x => /^arsenal-pro-v\d+$/.test(x)); if (k) build.textContent += ` \u00b7 offline build ${k.replace('arsenal-pro-', '')}`; }).catch(() => {});
    paintStat();
  }
  draw();
  const offA = on('account', () => draw());
  const off = on('status', paintStat), offD = on('data', paintData), offS = on('sync', paintData);
  const el = h('section', { class:'screen list-screen' }, h('header', { class:'appbar' }, h('h1', { class:'title' }, 'Me', helpDot('bm-matchup', 'Speed / rev match'))), body);
  return { el, title:'Me', destroy:() => { offA(); off(); offD(); offS(); } };
}

// v79 (owner t144u): the look picker. Each option carries its own data-brand/data-theme, so its tokens (css/app.css (THEME TOKENS block)) preview the real colors.
const LOOKS = { pine:['Pine & Brass', 'Green and gold'], maple:['Maple & Copper', 'Warm wood'], night:['Night Pocket', 'Navy and ice'] };
function lookPicker() {
  const cur = () => BRANDS.includes(prefs().brand) ? prefs().brand : DEFAULT_BRAND, mode = () => document.documentElement.dataset.theme || 'dark';
  return h('div', { class:'fld', id:'lookFld' }, h('span', { text:'Look' }),
    h('div', { class:'theme-pick', role:'radiogroup', 'aria-label':'Look', id:'lookPick' }, BRANDS.map(b => h('button', { type:'button', role:'radio', class:'theme-opt', id:'look-' + b, 'data-look':b, 'data-brand':b, 'data-theme':mode(), 'aria-checked':String(b === cur()),
      onclick:() => { setPrefs({ brand:b }); applyTheme(); markLook(); } },
      h('span', { class:'theme-dots', 'aria-hidden':'true' }, h('i'), h('i'), h('i')), h('span', { text:LOOKS[b][0] }), h('small', { text:LOOKS[b][1] })))));
}
function markLook() {   // after a pick or a mode change: tick the chosen option and re-scope each preview to the current mode
  const cur = BRANDS.includes(prefs().brand) ? prefs().brand : DEFAULT_BRAND;
  document.querySelectorAll('#lookPick .theme-opt').forEach(b => { b.setAttribute('aria-checked', String(b.dataset.look === cur)); b.dataset.theme = document.documentElement.dataset.theme; });
}

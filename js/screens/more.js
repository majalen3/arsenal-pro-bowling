import { profile, setProfile, prefs, setPrefs, deviceId, useCode, backupBlob, status, on, API_BASE } from '../store.js';
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
  function draw() {
    const pr = profile();
    body.innerHTML = '';
    body.append(
      h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Bowler profile' }), h('button', { class:'btn sm ghost', id:'editProfile', onclick:editProfile }, h('span', { html:icon('edit') }), 'Edit')),
        pr ? h('p', { text:`${pr.hand === 'left' ? 'Left' : 'Right'}-handed ${pr.style === 'two' ? 'two-hander' : pr.style}, ${(+pr.speed).toFixed(1)} mph, ${pr.rev} rpm${pr.pap ? ', PAP ' + pr.pap : ''}${pr.tilt ? ', tilt ' + pr.tilt : ''}.` }) : h('p', { class:'muted', text:'Not set. The lane uses its defaults (15 mph, 220 rpm).' }),
        h('div', { class:'row between' }, h('span', { text:`My bag: ${pr && pr.owned && pr.owned.length ? pr.owned.length + ' balls' : 'all 22'}` }), h('button', { class:'btn sm ghost', id:'editBag', onclick:editBag }, 'Choose'))),
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'Appearance' }), segmented('Theme', [['dark', 'Alley dark'], ['light', 'Light'], ['system', 'System']], prefs().theme || 'dark', v => { setPrefs({ theme:v }); applyTheme(v); }, 'wide')),
      h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Sync & backup' }), stat),
        h('p', { class:'small', text:'Your backup code links this device to your saved lines on the server. Keep it private; anyone with it can see your lines.' }),
        h('div', { class:'row gap wrap' }, code, h('button', { class:'btn sm ghost', id:'copyCode', onclick:async () => { try { await navigator.clipboard.writeText(deviceId()); toast('Code copied'); } catch (e) { toast('Copy failed. Select the code and copy it.', { kind:'bad' }); } } }, 'Copy'),
          h('button', { class:'btn sm ghost', id:'dlBackup', onclick:() => { const a = document.createElement('a'); a.href = URL.createObjectURL(backupBlob()); a.download = 'arsenal-pro-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); } }, 'Download backup')),
        h('form', { class:'inline-form', onsubmit:e => { e.preventDefault(); if (useCode(codeIn.value)) { code.textContent = deviceId(); codeIn.value = ''; toast('Code set. Syncing\u2026'); } else toast('That code doesn\u2019t look right (8\u201364 letters, numbers, - or _).', { kind:'bad' }); } },
          h('label', { class:'fld grow' }, h('span', { text:'Restore from another device' }), codeIn), h('button', { class:'btn primary', type:'submit' }, 'Use code'))),
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'About' }),
        h('p', { class:'small', text:'Arsenal Pro models how each ball in your arsenal reads the lane, and coaches your next move. Ball specs come from manufacturer data (marked est. where estimated). Pattern library: Kegel Pattern Library via CarryDown.' }),
        h('p', { class:'small muted', text:`Version ${VERSION} \u00b7 API ${API_BASE.replace(/^https?:\/\//, '')}` }),
        h('p', { class:'small' }, h('a', { href:'#/welcome' }, 'Replay the welcome tour'))));
    paintStat();
  }
  draw();
  const off = on('status', paintStat);
  const el = h('section', { class:'screen list-screen' }, h('header', { class:'appbar' }, h('h1', { class:'title', text:'More' })), body);
  return { el, title:'More', destroy:off };
}

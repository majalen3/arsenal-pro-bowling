// Me → Account (optional; DECISIONS 2026-10-31). Never shown during scoring and never required: everything works signed out.
// Sign-in flow: credentials → (if this phone has data) a choice: add it to the account, or Not now (signs out again).
import { h, toast, sheet } from '../ui.js';
import { on } from '../store.js';
import * as hub from '../hub.js';
import { account } from '../account.js';
import { EMAIL_RE, passwordProblem } from '../data/account.js';

const localCounts = () => { const db = hub.db; if (!db) return { balls: 0, games: 0, events: 0, unsynced: 0 };
  const P = db.projection(), ev = db.events(); return { balls: Object.keys(P.owned).length, games: P.games.length, events: ev.length, unsynced: ev.filter(e => !e.synced).length }; };
const hasData = c => c.balls + c.games > 0;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function showRecoveryKey(key, done) {
  const s = sheet({ title: 'Save your recovery key', id: 'recKeySheet', onClose: done, body: h('div', { class: 'stack' },
    h('p', { text: 'If you forget your password, this key is the only way back in (there is no email reset). Keep it somewhere safe, like a password manager. It will not be shown again.' }),
    h('code', { class: 'code', id: 'recKey', text: key }),
    h('button', { class: 'btn ghost block', id: 'recCopy', onclick: async () => { try { await navigator.clipboard.writeText(key); toast('Recovery key copied'); } catch (e) { toast('Copy failed. Select the key and copy it.', { kind: 'bad' }); } } }, 'Copy key'),
    h('button', { class: 'btn primary block', id: 'recDone', onclick: () => s.close() }, 'I saved it')) });
}

// Shown right after sign-in when this phone has its own data, and again on Me if the app closed before a choice.
export function chooseMigration(after = () => {}) {
  const c = localCounts(), a = account.session(); if (!a) return;
  const s = sheet({ title: 'This phone\u2019s data', id: 'migSheet', body: h('div', { class: 'stack' },
    h('p', { text: `This phone has ${plural(c.balls, 'ball')} and ${plural(c.games, 'game')} saved. Add them to ${a.user.email}? They stay on this phone either way.` }),
    h('button', { class: 'btn primary block', id: 'migAdd', onclick: () => { account.confirm(); s.close(); toast('Signed in. Adding this phone\u2019s data to your account\u2026'); after(); } }, 'Add this phone\u2019s data to my account'),
    h('button', { class: 'btn ghost block', id: 'migNot', onclick: async () => { s.close(); await account.logout(); toast('Not signed in. Nothing was shared.'); after(); } }, 'Not now (stay signed out)')) });
}

function authSheet(mode0, after) {
  let mode = mode0;
  const err = h('p', { class: 'small fld-err', id: 'acctErr', role: 'alert' });
  const email = h('input', { id: 'acctEmail', type: 'email', inputmode: 'email', autocomplete: 'username', autocapitalize: 'off', spellcheck: 'false', required: '' });
  const pass = h('input', { id: 'acctPass', type: 'password', required: '', minlength: '8' });
  const key = h('input', { id: 'acctRecKey', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
  const form = h('form', { class: 'stack', id: 'acctForm', novalidate: '' });
  const submit = h('button', { class: 'btn primary block', type: 'submit', id: 'acctSubmit' });
  const title = { signin: 'Sign in', create: 'Create account', recover: 'Reset password' };
  const s = sheet({ title: 'Account', id: 'acctSheet', body: form });
  function paint() {
    form.innerHTML = ''; err.textContent = '';
    pass.autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    submit.textContent = title[mode];
    form.append(h('h3', { class: 'card-title', id: 'acctMode', text: title[mode] }),
      h('label', { class: 'fld' }, h('span', { text: 'Email' }), email));
    if (mode === 'recover') form.append(h('label', { class: 'fld' }, h('span', { text: 'Recovery key' }), key));
    form.append(h('label', { class: 'fld' }, h('span', { text: mode === 'signin' ? 'Password' : 'New password (8+ characters)' }), pass), err, submit);
    if (mode === 'create') form.append(h('p', { class: 'small muted', text: 'Your email is only your sign-in name: no newsletters, no sharing. Your password is stored scrambled (scrypt); nobody can read it.' }));
    const sw = (m, label, id) => h('button', { class: 'btn ghost block', type: 'button', id, onclick: () => { mode = m; paint(); } }, label);
    if (mode !== 'signin') form.append(sw('signin', 'I have an account: sign in', 'acctToSignin'));
    if (mode !== 'create') form.append(sw('create', 'Create an account', 'acctToCreate'));
    if (mode === 'signin') form.append(sw('recover', 'Forgot password? Use your recovery key', 'acctToRecover'));
  }
  form.onsubmit = async e => {
    e.preventDefault(); err.textContent = '';
    const em = email.value.trim().toLowerCase(), pw = pass.value;
    if (!EMAIL_RE.test(em)) { err.textContent = 'Enter your email address.'; email.focus(); return; }
    const pp = mode !== 'signin' && passwordProblem(pw); if (pp) { err.textContent = pp; pass.focus(); return; }
    if (mode === 'signin' && !pw) { err.textContent = 'Enter your password.'; pass.focus(); return; }
    if (mode === 'recover' && !key.value.trim()) { err.textContent = 'Enter your recovery key.'; key.focus(); return; }
    const pending = hasData(localCounts());
    submit.disabled = true; submit.textContent = 'Working\u2026';
    const r = mode === 'create' ? await account.signup(em, pw, { pending }) : mode === 'recover' ? await account.recover(em, key.value.trim(), pw, { pending }) : await account.login(em, pw, { pending });
    submit.disabled = false; submit.textContent = title[mode];
    if (!r.ok) { err.textContent = r.error; return; }
    pass.value = ''; s.close();
    const next = () => { if (pending) chooseMigration(after); else { toast(mode === 'create' ? 'Account created. Signed in.' : 'Signed in. Getting your data\u2026'); after(); } };
    if (r.recoveryKey) showRecoveryKey(r.recoveryKey, next); else next();
  };
  paint(); setTimeout(() => email.focus(), 50);
}

function signOutSheet(after) {
  const c = localCounts();
  const s = sheet({ title: 'Sign out', id: 'soSheet', body: h('div', { class: 'stack' },
    h('p', { text: 'Your data stays in your account. Choose what happens on this phone.' }),
    h('button', { class: 'btn primary block', id: 'soKeep', onclick: async () => { s.close(); await account.logout(); toast('Signed out. Your data is still on this phone.'); after(); } }, 'Sign out, keep data on this phone'),
    c.unsynced ? h('p', { class: 'small muted', id: 'soWait', text: `${plural(c.unsynced, 'change')} on this phone ${c.unsynced === 1 ? 'has' : 'have'} not reached your account yet. Connect to the internet, then you can also clear this phone.` })
      : h('button', { class: 'btn ghost block', id: 'soClear', onclick: async () => { s.close(); await account.logout(); try { await hub.db.wipe(); ['ap_profile', 'ap_lines', 'ap_surface', 'ap_notes', 'ap_shots'].forEach(k => localStorage.removeItem(k)); } catch (e) {} toast('Signed out and this phone was cleared. Sign in again to get your data back.'); after(); } }, 'Sign out and clear this phone')) });
}

function deleteSheet(after) {
  const pass = h('input', { id: 'delPass', type: 'password', autocomplete: 'current-password' });
  const err = h('p', { class: 'small fld-err', id: 'delErr', role: 'alert' });
  const btn = h('button', { class: 'btn danger block', type: 'submit', id: 'delConfirm' }, 'Delete my account');
  const s = sheet({ title: 'Delete account', id: 'delSheet', body: h('form', { class: 'stack', onsubmit: async e => {
    e.preventDefault(); if (!pass.value) { err.textContent = 'Enter your password to confirm.'; return; }
    btn.disabled = true; const r = await account.remove(pass.value); btn.disabled = false;
    if (!r.ok) { err.textContent = r.error; return; }
    s.close(); toast('Account and its server copy deleted. This phone still has your data.'); after(); } },
    h('p', { text: 'This deletes your account, every sign-in, and the copy of your data on the server. It cannot be undone. Data on this phone stays until you remove it.' }),
    h('label', { class: 'fld' }, h('span', { text: 'Password' }), pass), err, btn) });
}

async function exportData() {
  const r = await account.exportAll(); if (!r.ok) { toast(r.error, { kind: 'bad' }); return; }
  const blob = new Blob([JSON.stringify(r.data, null, 1)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `arsenal-pro-account-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Account export saved.');
}

export function accountCard() {
  const card = h('div', { class: 'card', id: 'accountCard' });
  function paint() {
    const s = account.session(); card.innerHTML = '';
    if (!s) {
      card.append(h('h2', { class: 'card-title', text: 'Account (optional)' }),
        h('p', { class: 'small', id: 'acctPitch', text: 'Sign in to keep your balls, profile and games private to you and on every phone you use. Everything works without an account.' }),
        h('div', { class: 'btn-grid' }, h('button', { class: 'btn primary', id: 'acctSignIn', onclick: () => authSheet('signin', paint) }, 'Sign in'),
          h('button', { class: 'btn ghost', id: 'acctCreate', onclick: () => authSheet('create', paint) }, 'Create account')));
      return;
    }
    card.append(h('div', { class: 'card-h' }, h('h2', { class: 'card-title', text: 'Account' }), h('span', { class: 'pill gold', id: 'acctPill', text: s.pending ? 'Waiting' : 'Signed in' })),
      h('p', { class: 'small', id: 'acctWho', text: `Signed in as ${s.user.email}. Your data syncs privately to this account; only you can see it.` }));
    if (s.pending) card.append(h('button', { class: 'btn primary block', id: 'acctFinish', onclick: () => chooseMigration(paint) }, 'Finish signing in'));
    card.append(h('div', { class: 'btn-grid' },
      h('button', { class: 'btn ghost', id: 'acctExport', onclick: exportData }, 'Export my data'),
      h('button', { class: 'btn ghost', id: 'acctSignOut', onclick: () => signOutSheet(paint) }, 'Sign out')),
      h('details', { class: 'tn-more', id: 'acctMore' }, h('summary', { text: 'Delete account' }),
        h('button', { class: 'btn ghost block', id: 'acctDelete', onclick: () => deleteSheet(paint) }, 'Delete account and server data')));
  }
  paint();
  const off = on('account', () => { if (card.isConnected) paint(); else off(); });
  return card;
}

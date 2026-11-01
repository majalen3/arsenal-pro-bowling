// My Team (owner 2026-10-31, docs/TEAM_PROMPT_COMMUNITY_DIRECTOR.md tactic 1). Lives under Bag (no new tab; DECISIONS 2026-10-31).
// A league team's hub: "Tonight I'm bringing" cards, opt-in plain counts, identity tags, the regular badge and lane-pair notes.
// Needs an account (the rest of the app does not). Every share is opt-in per team and per item; the secretary invites, removes,
// sets the league night and handles reports. Offline: the last synced view with an "Offline" chip. Never shown during scoring.
import { h, icon, toast, sheet, confirmSheet, segmented, emptyState } from '../ui.js';
import { back } from '../router.js';
import { ready, proj } from '../hub.js';
import { profile, prefs, setPrefs, on } from '../store.js';
import { account, team } from '../account.js';
import { accountCard } from './account.js';
import { helpDot } from './help.js';
import { catOf } from '../cc/cats.js';
import * as X from '../cc/export.js';
import * as C from '../cc/community.js';
import { NIGHTS, CODE_RE, normCode, joinLink, bagShare, tagsShare, regularShare } from '../data/team.js';

const NIGHT_LABEL = { Mon: 'Mondays', Tue: 'Tuesdays', Wed: 'Wednesdays', Thu: 'Thursdays', Fri: 'Fridays', Sat: 'Saturdays', Sun: 'Sundays' };
const KIND_LABEL = { bag: 'Tonight I\u2019m bringing', stats: 'My counts this season', tags: 'My tags', regular: 'My home center badge' };
const time12 = t => { if (!/^\d\d:\d\d$/.test(t || '')) return ''; let [hh, mm] = t.split(':').map(Number); const ap = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12; return `${hh}:${String(mm).padStart(2, '0')} ${ap}`; };
export const nightText = t => t && t.night ? `${NIGHT_LABEL[t.night]}${t.time ? ' at ' + time12(t.time) : ''}` : 'League night not set';
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const shareOn = (tid, k) => !!(((prefs().teamShare || {})[tid] || {})[k]);
const setShareOn = (tid, k, v) => { const all = { ...(prefs().teamShare || {}) }; all[tid] = { ...(all[tid] || {}), [k]: !!v }; setPrefs({ teamShare: all }); };

// What each item would send, built on this phone from your own data. Shown before anything is shared.
export function myShares(P, pr = profile(), pf = prefs()) {
  const m = P ? X.sheetModel(P, pr, { catOf }) : { bag: [] };
  const reg = pf.homeCenter ? C.regularOf(P, pf.homeCenter) : null;
  return {
    bag: m.bag.length ? bagShare(m.bag, pf.teamWhy || {}) : null,
    stats: (x => x && x.items.length ? x : null)(P ? C.statsShare(P) : null),
    tags: (t => t.length ? tagsShare(t) : null)(C.tagsOf(pr || {}, pf.tags || {})),
    regular: reg ? regularShare(reg) : null,
    bagRows: m.bag,
  };
}
// One bowler's card (yours or a teammate's): name, tags, badge, the balls with role and one reason, plain counts.
export function memberCard(m, { me = false, actions = null } = {}) {
  const s = m.shares || {}, kids = [];
  const head = h('div', { class: 'card-h' }, h('h3', { class: 'card-title', text: m.displayName + (me ? ' (you)' : '') }),
    m.role === 'secretary' ? h('span', { class: 'pill gold', text: 'Secretary' }) : null);
  kids.push(head);
  if (s.tags && s.tags.data.tags.length) kids.push(h('div', { class: 'chips tm-tags', 'aria-label': 'Tags' }, ...s.tags.data.tags.map(t => h('span', { class: 'pill', text: C.TAG_LABEL[t] || t }))));
  if (s.regular) { const r = s.regular.data; kids.push(h('p', { class: 'small tm-regular' }, h('span', { class: 'pill gold', text: r.nights >= C.REGULAR_NIGHTS ? `Regular at ${r.center}` : `${r.center}` }),
    ` ${r.nights} night${r.nights === 1 ? '' : 's'} there in the last ${r.days} days`)); }
  if (s.bag) { const b = s.bag.data;
    kids.push(h('p', { class: 'eyebrow', text: b.title || 'Tonight I\u2019m bringing' }),
      b.balls.length ? h('ul', { class: 'plain tm-balls' }, ...b.balls.map(x => h('li', { class: 'tm-ball' }, h('b', { text: x.name }), x.role ? h('span', { class: 'muted', text: ' \u00b7 ' + x.role }) : null,
        x.why ? h('div', { class: 'small', text: x.why }) : null))) : h('p', { class: 'small muted', text: 'No balls listed.' })); }
  if (s.stats && s.stats.data.items.length) kids.push(h('dl', { class: 'kv tm-stats' }, ...s.stats.data.items.flatMap(i => [h('dt', { text: i.label }), h('dd', { text: i.value + (i.src ? ` (${i.src})` : '') })])));
  if (!s.tags && !s.regular && !s.bag && !s.stats) kids.push(h('p', { class: 'small muted', text: me ? 'You are not sharing anything with this team yet.' : 'Not sharing anything yet.' }));
  const upd = Object.values(s).map(x => Date.parse(x.updatedAt)).filter(Number.isFinite);
  if (upd.length) kids.push(h('p', { class: 'small muted', text: `Updated ${ago(Math.max(...upd))}` }));
  if (actions) kids.push(actions);
  return h('div', { class: 'card tm-card', 'data-member': m.memberId }, ...kids);
}

export async function render({ query }) {
  await ready();
  const joinQ = query && query.get('join') ? normCode(query.get('join')) : null;
  if (joinQ && CODE_RE.test(joinQ)) setPrefs({ teamJoin: joinQ });
  const body = h('div', { class: 'stack', id: 'teamBody' });
  const chip = h('span', { class: 'pill net-chip', id: 'teamOffline', hidden: true, text: 'Offline' });
  let tid = (query && query.get('t')) || prefs().teamLast || null, busy = false;
  const err = r => toast(r.error || 'Something went wrong.', { kind: 'bad' });

  function signedOut() {
    body.append(h('div', { class: 'card', id: 'teamPitch' }, h('h2', { class: 'card-title', text: 'My Team' }),
      h('p', { text: 'Share what you are bringing tonight with your league team, keep lane-pair notes together, and see who is a regular. It needs a free account; your balls and games work without one.' }),
      prefs().teamJoin ? h('p', { class: 'small', id: 'teamJoinHeld', text: `Invite code ${prefs().teamJoin} is saved. Sign in and you can join.` }) : null,
      h('a', { class: 'btn ghost block', href: '#/conduct', id: 'teamConductOut' }, 'Code of conduct')), accountCard());
  }
  function startOrJoin() {
    const nm = h('input', { id: 'tmName', maxlength: '40', placeholder: 'e.g. Thursday Rollers', autocomplete: 'off' });
    const me1 = h('input', { id: 'tmMe1', maxlength: '30', placeholder: 'First name or nickname', autocomplete: 'nickname' });
    let night = '', time = '';
    const tIn = h('input', { id: 'tmTime', type: 'time', 'aria-label': 'Start time', onchange: e => { time = e.target.value; } });
    const code = h('input', { id: 'tmCode', maxlength: '9', placeholder: 'XXXX-XXXX', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', value: prefs().teamJoin || '' });
    const me2 = h('input', { id: 'tmMe2', maxlength: '30', placeholder: 'First name or nickname', autocomplete: 'nickname' });
    const joinCard = h('form', { class: 'card stack', id: 'tmJoin', onsubmit: async e => { e.preventDefault(); if (busy) return;
      const c = normCode(code.value); if (!CODE_RE.test(c)) return toast('Invite codes look like ABCD-EFGH.', { kind: 'bad' });
      if (!me2.value.trim()) return toast('Add the name your team knows you by.', { kind: 'bad' });
      busy = true; const r = await team.join(c, me2.value.trim()); busy = false;
      if (!r.ok) return r.status === 410 ? toast('That invite has expired or was turned off. Ask the secretary for a new one.', { kind: 'bad' }) : err(r);
      setPrefs({ teamJoin: null, teamLast: r.json.team.id }); tid = r.json.team.id; toast(r.json.already ? 'You are already on this team.' : `Joined ${r.json.team.name}.`); draw(); } },
      h('h2', { class: 'card-title', text: 'Join with an invite' }), h('label', { class: 'fld' }, h('span', { text: 'Invite code' }), code),
      h('label', { class: 'fld' }, h('span', { text: 'Your name on the team' }), me2),
      h('p', { class: 'small muted' }, 'Joining means you agree to the ', h('a', { href: '#/conduct', id: 'tmConduct1' }, 'code of conduct'), '.'),
      h('button', { class: 'btn block ' + (prefs().teamJoin ? 'primary' : 'ghost'), type: 'submit', id: 'tmJoinBtn' }, 'Join team'));
    const startCard = h('form', { class: 'card stack', id: 'tmStart', onsubmit: async e => { e.preventDefault(); if (busy) return;
      if (!nm.value.trim() || !me1.value.trim()) return toast('Add a team name and your name.', { kind: 'bad' });
      busy = true; const r = await team.create(nm.value.trim(), me1.value.trim(), night, time); busy = false;
      if (!r.ok) return err(r); tid = r.json.team.id; setPrefs({ teamLast: tid }); toast('Team started. You are the secretary: invite your teammates next.'); draw(); } },
      h('h2', { class: 'card-title', text: 'Start a team' }), h('label', { class: 'fld' }, h('span', { text: 'Team name' }), nm),
      h('label', { class: 'fld' }, h('span', { text: 'Your name on the team' }), me1),
      h('div', { class: 'fld' }, h('span', { text: 'League night (optional)' }), segmented('League night', NIGHTS.map(n => [n, n]), '', v => { night = v; }, 'wrap tm-nights')),
      h('label', { class: 'fld' }, h('span', { text: 'Start time (optional)' }), tIn),
      h('button', { class: 'btn block ' + (prefs().teamJoin ? 'ghost' : 'primary'), type: 'submit', id: 'tmStartBtn' }, 'Start team'));
    body.append(prefs().teamJoin ? joinCard : startCard, prefs().teamJoin ? startCard : joinCard);
  }

  let gen = 0;
  async function draw() {
    const my = ++gen; body.innerHTML = '';
    if (!account.active()) return signedOut();
    let list = team.cached(), fresh = await team.list();
    if (my !== gen) return;
    chip.hidden = !fresh.offline;
    if (fresh.ok) list = { teams: fresh.json.teams }; else if (!list) { body.append(emptyState('Could not load your teams', fresh.error)); return; }
    const teams = list.teams || [];
    if (!teams.length) return startOrJoin();
    if (!teams.find(t => t.id === tid)) tid = teams[0].id;
    if (teams.length > 1) body.append(h('div', { class: 'list-tools', id: 'tmPick' }, segmented('Team', teams.map(t => [t.id, t.name]), tid, v => { tid = v; setPrefs({ teamLast: v }); draw(); }, 'wide')));
    let v = team.cached(tid), r = await team.view(tid);
    if (my !== gen) return;
    if (r.ok) v = { at: Date.now(), view: r.json };
    else if (r.status === 404) { toast('You are no longer on that team.'); tid = null; return draw(); }
    chip.hidden = r.ok; if (!v) { body.append(emptyState('Could not load the team', r.error)); return; }
    if (!r.ok) body.append(h('p', { class: 'small warn-box', id: 'tmStale', text: `Showing the team as of ${ago(v.at)}. Changes need a connection.` }));
    teamView(v.view, r.ok);
  }

  function teamView(V, live) {
    const T = V.team, me = V.me, sec = me.role === 'secretary', P = proj(), mine = myShares(P);
    if (live) autoRefresh(T.id, mine, V);
    body.append(h('div', { class: 'card', id: 'tmHead' }, h('div', { class: 'card-h' }, h('h2', { class: 'card-title', text: T.name }), h('span', { class: 'pill', text: `${V.members.length} bowler${V.members.length === 1 ? '' : 's'}` })),
      h('p', { id: 'tmNight', text: nightText(T) })));
    // Me first, then teammates in join order (never sorted by any number).
    const meM = V.members.find(m => m.memberId === me.memberId), others = V.members.filter(m => m.memberId !== me.memberId);
    body.append(h('h2', { class: 'section-title', text: 'Bowlers' }));
    if (meM) body.append(memberCard(meM, { me: true, actions: h('button', { class: 'btn ghost block', id: 'tmShareBtn', disabled: !live, onclick: () => shareSheet(T.id, mine) }, 'Choose what I share') }));
    for (const m of others) body.append(memberCard(m, { actions: h('div', { class: 'row gap wrap' },
      sec ? h('button', { class: 'btn ghost', 'data-remove': m.memberId, disabled: !live, onclick: () => removeMember(T.id, m) }, 'Remove') : null,
      h('button', { class: 'btn ghost', 'data-report': m.memberId, disabled: !live, onclick: () => reportSheet(T.id, { memberId: m.memberId }, m.displayName) }, 'Report')) }));
    if (!others.length) body.append(h('p', { class: 'small muted', id: 'tmAlone', text: sec ? 'No teammates yet. Make an invite below and send it to them yourself.' : 'Your teammates will show here.' }));
    notesCard(T.id, V, live, sec);
    if (sec) secretaryCard(T, V, live);
    body.append(h('div', { class: 'card stack', id: 'tmMine' }, h('h2', { class: 'card-title', text: 'My place on the team' }),
      h('button', { class: 'btn ghost block', id: 'tmRename', disabled: !live, onclick: () => renameSheet(T.id, me.displayName) }, `Change my name (${me.displayName})`),
      h('a', { class: 'btn ghost block', href: '#/conduct', id: 'tmConduct' }, 'Code of conduct'),
      h('button', { class: 'btn ghost block', id: 'tmLeave', disabled: !live, onclick: () => leaveTeam(T) }, 'Leave team'),
      sec ? h('button', { class: 'btn danger block', id: 'tmDelete', disabled: !live, onclick: () => deleteTeam(T) }, 'Delete team') : null,
      h('p', { class: 'small muted', text: 'Leaving removes what you shared and your notes from this team.' })));
  }
  // Items that are switched on are re-sent when the hub opens, so the team sees tonight's bag, not last week's.
  async function autoRefresh(t, mine, V) {
    const meM = V.members.find(m => m.memberId === V.me.memberId) || { shares: {} };
    for (const k of ['bag', 'stats', 'tags', 'regular']) if (shareOn(t, k) && mine[k]) {
      const was = meM.shares[k] && JSON.stringify(meM.shares[k].data);
      if (was !== JSON.stringify(mine[k])) { const r = await team.share(t, k, mine[k]); if (!r.ok) return; }
    }
  }
  function shareSheet(t, mine) {
    const rows = ['bag', 'stats', 'tags', 'regular'].map(k => {
      const data = mine[k], prev = k === 'bag' && data ? data.balls.map(b => [b.name, b.role, b.why].filter(Boolean).join(' \u00b7 ')).join('; ')
        : k === 'stats' && data ? data.items.map(i => `${i.label}: ${i.value}`).join('; ')
        : k === 'tags' && data ? data.tags.map(x => C.TAG_LABEL[x]).join(', ')
        : k === 'regular' && data ? `${data.center}: ${data.nights} nights in 90 days` : null;
      const none = { bag: 'Pack tonight\u2019s bag first (Bag tab).', stats: 'No games logged this season yet.', tags: 'Pick your tags on Me.', regular: 'Set your home center on Me.' }[k];
      return h('div', { class: 'fld', 'data-share': k }, h('span', { text: KIND_LABEL[k] }), h('p', { class: 'small muted', text: prev || none }),
        segmented(KIND_LABEL[k], [['off', 'Not shared'], ['on', 'Shared']], shareOn(t, k) && data ? 'on' : 'off', async val => {
          if (val === 'on' && !data) { toast(none); return; }
          const r = val === 'on' ? await team.share(t, k, data) : await team.unshare(t, k);
          if (!r.ok) return err(r); setShareOn(t, k, val === 'on'); toast(val === 'on' ? 'Shared with this team.' : 'Stopped sharing.'); }, 'wide'));
    });
    const s = sheet({ title: 'What I share with this team', id: 'tmShareSheet', onClose: () => draw(), body: h('div', { class: 'stack' },
      h('p', { class: 'small', text: 'Only this team sees these, and only the items you switch on. Counts are plain counts: no averages, no rankings.' }), ...rows,
      mine.bagRows.length ? h('button', { class: 'btn ghost block', id: 'tmWhyBtn', onclick: () => { s.close(); whySheet(t, mine.bagRows); } }, 'Add a reason for each ball') : null,
      h('button', { class: 'btn primary block', id: 'tmShareDone', onclick: () => s.close() }, 'Done')) });
  }
  function whySheet(t, rows) {
    const why = { ...(prefs().teamWhy || {}) };
    const s = sheet({ title: 'One reason per ball', id: 'tmWhySheet', onClose: () => draw(), body: h('div', { class: 'stack' },
      h('p', { class: 'small muted', text: 'Optional, in your words, up to 80 characters. Example: \u201cfor when the fronts dry up.\u201d' }),
      ...rows.slice(0, 8).map(r => h('label', { class: 'fld' }, h('span', { text: r.name }), h('input', { 'data-why': r.id, maxlength: '80', value: why[r.id] || '', oninput: e => { why[r.id] = e.target.value; } }))),
      h('button', { class: 'btn primary block', id: 'tmWhySave', onclick: () => { setPrefs({ teamWhy: why }); s.close(); toast(shareOn(t, 'bag') ? 'Saved. Your team sees the new reasons.' : 'Saved on this phone.'); } }, 'Save')) });
  }
  function notesCard(t, V, live, sec) {
    const lanes = h('input', { id: 'tmNoteLanes', maxlength: '9', placeholder: '5-6', inputmode: 'numeric', 'aria-label': 'Lane pair' });
    const txt = h('input', { id: 'tmNoteText', maxlength: '200', placeholder: 'What the pair did tonight', 'aria-label': 'Note' });
    const name = id => (V.members.find(m => m.memberId === id) || {}).displayName || 'A former teammate';
    body.append(h('div', { class: 'card stack', id: 'tmNotes' }, h('h2', { class: 'card-title' }, 'Lane-pair notes', helpDot('team-notes', 'Lane-pair notes')),
      V.notes.length ? h('ul', { class: 'plain stack' }, ...V.notes.slice(0, 30).map(n => h('li', { class: 'tm-note', 'data-note': n.id },
        h('div', {}, n.lanes ? h('b', { text: 'Lanes ' + n.lanes + ': ' }) : null, h('span', { text: n.text })),
        h('div', { class: 'row between' }, h('span', { class: 'small muted', text: `${name(n.memberId)}, ${ago(Date.parse(n.createdAt))}` }),
          n.memberId === V.me.memberId || sec ? h('button', { class: 'btn ghost', 'data-del-note': n.id, disabled: !live, onclick: async () => { const r = await team.deleteNote(t, n.id); if (!r.ok) return err(r); toast('Note deleted.'); draw(); } }, 'Delete')
            : h('button', { class: 'btn ghost', 'data-report-note': n.id, disabled: !live, onclick: () => reportSheet(t, { noteId: n.id }, 'this note') }, 'Report'))))) : h('p', { class: 'small muted', text: 'No notes yet.' }),
      live ? h('form', { class: 'stack', id: 'tmNoteForm', onsubmit: async e => { e.preventDefault(); if (!txt.value.trim()) return;
        const r = await team.note(t, lanes.value.trim(), txt.value.trim()); if (!r.ok) return err(r); toast('Note added.'); draw(); } },
        h('div', { class: 'row gap' }, h('label', { class: 'fld', style: { flex: '0 0 6.5em' } }, h('span', { text: 'Lanes' }), lanes), h('label', { class: 'fld grow' }, h('span', { text: 'Note' }), txt)),
        h('button', { class: 'btn ghost block', type: 'submit', id: 'tmNoteAdd' }, 'Add note')) : null));
  }
  function secretaryCard(T, V, live) {
    const out = h('div', { class: 'stack', id: 'tmInviteOut' });
    const list = h('div', { class: 'stack', id: 'tmInvites' });
    const name = id => (V.members.find(m => m.memberId === id) || {}).displayName || 'someone who left';
    async function paintInvites() { const r = await team.invites(T.id); list.innerHTML = ''; if (!r.ok) return;
      const open = r.json.invites.filter(i => i.state === 'open');
      list.append(...open.map(i => h('div', { class: 'row between', 'data-invite': i.id }, h('span', { class: 'small', text: `Invite used ${i.uses} of ${i.maxUses}, ends ${new Date(i.expiresAt).toLocaleDateString()}` }),
        h('button', { class: 'btn ghost', 'data-revoke': i.id, onclick: async () => { const x = await team.revoke(T.id, i.id); if (!x.ok) return err(x); toast('Invite turned off.'); paintInvites(); } }, 'Turn off')))); }
    if (live) paintInvites();
    const reports = (V.reports || []).map(rp => h('div', { class: 'card tm-report', 'data-report-id': rp.id },
      h('p', { class: 'small', text: rp.noteId ? `A note was reported${rp.reason ? ': ' + rp.reason : '.'}` : `${name(rp.aboutMember)} was reported${rp.reason ? ': ' + rp.reason : '.'}` }),
      h('div', { class: 'row gap wrap' },
        rp.noteId ? h('button', { class: 'btn ghost', onclick: async () => { const r = await team.deleteNote(T.id, rp.noteId); if (!r.ok) return err(r); await team.dismiss(T.id, rp.id); toast('Note removed.'); draw(); } }, 'Remove the note') : null,
        rp.aboutMember ? h('button', { class: 'btn ghost', onclick: () => removeMember(T.id, { memberId: rp.aboutMember, displayName: name(rp.aboutMember) }) }, 'Remove the bowler') : null,
        h('button', { class: 'btn ghost', 'data-dismiss': rp.id, onclick: async () => { const r = await team.dismiss(T.id, rp.id); if (!r.ok) return err(r); toast('Report dismissed.'); draw(); } }, 'Dismiss'))));
    let night = T.night || '', time = T.time || '';
    body.append(h('div', { class: 'card stack', id: 'tmSec' }, h('div', { class: 'card-h' }, h('h2', { class: 'card-title' }, 'Secretary', helpDot('team-secretary', 'League secretary')),
      reports.length ? h('span', { class: 'pill', 'data-tone': 'warn', id: 'tmRepCount', text: `${reports.length} report${reports.length === 1 ? '' : 's'}` }) : null),
      h('button', { class: 'btn primary block', id: 'tmInvite', disabled: !live, onclick: async () => {
        const r = await team.invite(T.id); if (!r.ok) return err(r);
        const link = joinLink(r.json.code), text = `Join ${T.name} on Arsenal Pro: ${link} (code ${r.json.code}, good for 7 days)`;
        out.innerHTML = ''; out.append(h('p', { class: 'small', text: 'Send this to your teammates yourself (text, group chat). It works for 7 days; the code is shown only now.' }),
          h('code', { class: 'code', id: 'tmCodeOut', text: r.json.code }),
          h('div', { class: 'btn-grid' }, h('button', { class: 'btn ghost', id: 'tmInvShare', onclick: async () => { if (navigator.share) { try { await navigator.share({ title: T.name, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
            try { await navigator.clipboard.writeText(text); toast('Invite copied.'); } catch (e) { toast('Copy failed. Select the code and copy it.', { kind: 'bad' }); } } }, 'Share invite')));
        paintInvites(); } }, 'Make an invite'), out, list,
      reports.length ? h('div', { class: 'stack', id: 'tmReports' }, h('h3', { class: 'card-title', text: 'Reports' }), ...reports) : null,
      h('details', { class: 'tn-more', id: 'tmNightMore' }, h('summary', { text: 'League night' }),
        h('div', { class: 'stack' }, segmented('League night', NIGHTS.map(n => [n, n]), night, v => { night = v; }, 'wrap tm-nights'),
          h('label', { class: 'fld' }, h('span', { text: 'Start time' }), h('input', { id: 'tmNightTime', type: 'time', value: time, onchange: e => { time = e.target.value; } })),
          h('button', { class: 'btn ghost block', id: 'tmNightSave', disabled: !live, onclick: async () => { const r = await team.settings(T.id, { night, time }); if (!r.ok) return err(r); toast('League night saved.'); draw(); } }, 'Save league night')))));
  }
  function renameSheet(t, cur) {
    const i = h('input', { id: 'tmRenameIn', maxlength: '30', value: cur });
    const s = sheet({ title: 'Your name on this team', id: 'tmRenameSheet', body: h('div', { class: 'stack' }, h('label', { class: 'fld' }, h('span', { text: 'Name' }), i),
      h('button', { class: 'btn primary block', onclick: async () => { const r = await team.rename(t, i.value.trim()); if (!r.ok) return err(r); s.close(); toast('Name changed.'); draw(); } }, 'Save')) });
  }
  function reportSheet(t, target, label) {
    const why = h('input', { id: 'tmReportWhy', maxlength: '200', placeholder: 'What happened (optional)' });
    const s = sheet({ title: 'Report to the secretary', id: 'tmReportSheet', body: h('div', { class: 'stack' },
      h('p', { class: 'small', text: `Only your team\u2019s secretary sees reports. They can remove ${label} or dismiss the report.` }), h('label', { class: 'fld' }, h('span', { text: 'Reason' }), why),
      h('button', { class: 'btn primary block', id: 'tmReportSend', onclick: async () => { const r = await team.report(t, { ...target, reason: why.value.trim() }); if (!r.ok) return err(r); s.close(); toast('Sent to the secretary.'); } }, 'Send report')) });
  }
  async function removeMember(t, m) {
    if (!await confirmSheet({ title: `Remove ${m.displayName}?`, text: 'Their shared items and notes leave the team with them. They can rejoin only with a new invite.', confirm: 'Remove' })) return;
    const r = await team.remove(t, m.memberId); if (!r.ok) return err(r); toast(`${m.displayName} removed.`); draw();
  }
  async function leaveTeam(T) {
    if (!await confirmSheet({ title: `Leave ${T.name}?`, text: 'What you shared and your notes are removed from this team. If you are the secretary, the longest-standing teammate takes over.', confirm: 'Leave' })) return;
    const r = await team.leave(T.id); if (!r.ok) return err(r); const all = { ...(prefs().teamShare || {}) }; delete all[T.id]; setPrefs({ teamShare: all, teamLast: null }); tid = null; toast(`You left ${T.name}.`); draw();
  }
  async function deleteTeam(T) {
    if (!await confirmSheet({ title: `Delete ${T.name}?`, text: 'This deletes the team for everyone: members, shared items, notes, invites and reports. Your own balls and games are not touched.', confirm: 'Delete team' })) return;
    const r = await team.destroy(T.id); if (!r.ok) return err(r); setPrefs({ teamLast: null }); tid = null; toast('Team deleted.'); draw();
  }
  draw();
  const offA = on('account', () => { if (body.isConnected) draw(); });
  const el = h('section', { class: 'screen list-screen tm', id: 'team' },
    h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', id: 'teamBack', 'aria-label': 'Back', html: icon('back'), onclick: () => back('#/bag') }), h('h1', { class: 'title' }, 'My Team', helpDot('team', 'My Team')), chip), body);
  return { el, title: 'My Team', destroy: () => offA() };
}

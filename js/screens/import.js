// Import: pick a file → preview (nothing persisted) → commit → undo. Handlers sniff the file and build the preview.
import { h, icon, toast } from '../ui.js';
import { back } from '../router.js';
import { ready, addMany, undoImport, proj, hydrateMirror } from '../hub.js';
import { migrateV0 } from '../data/migrate.js';
import { deviceId } from '../store.js';
import { readBackup, restoreBackup } from '../data/backup.js';
const MAX = 10 * 1024 * 1024;
export const handlers = [];
handlers.push({
  id: 'backup', match: (f, head) => /\.json$/i.test(f.name) || /^\s*\{/.test(head),
  async preview(f, ctx) {
    const db = await ready(); const r = await readBackup(await f.text(), db);
    if (!r.ok) return { error: r.error };
    if (r.v0) {
      const b = r.backup, legacy = { ap_lines: JSON.stringify(b.lines || []), ap_surface: JSON.stringify(b.surfaceLog || []), ap_notes: JSON.stringify(b.patternNotes || []) };
      const evs = migrateV0(legacy, { deviceId: ctx.deviceId }).events.filter(e => !db.has(e.id));
      return { title: 'Restore older backup', kind: 'backup-v0', summary: [`${r.counts.lines} saved lines, ${r.counts.surface} surface changes, ${r.counts.notes} pattern notes`, `${evs.length} new on this device`],
        warnings: [], commitLabel: evs.length ? `Restore ${evs.length} records` : 'Nothing new to restore', canCommit: evs.length > 0,
        async commit() { const a = await db.append(evs); hydrateMirror(); return `${a.length} records restored`; } };
    }
    return {
      title: 'Restore backup', kind: 'backup',
      summary: [`${r.counts.events} events in the file`, `${r.counts.new} new on this device`, `${r.counts.dup} already here`],
      warnings: r.hashOk ? [] : [{ code: 'HASH_MISMATCH', detail: 'The file\u2019s checksum does not match its events. It may have been edited.' }],
      commitLabel: r.counts.new ? `Restore ${r.counts.new} events` : 'Nothing new to restore', canCommit: r.counts.new > 0,
      async commit() { const x = await restoreBackup(db, r); hydrateMirror(); return `${x.added} events restored`; },
    };
  },
});
export function render({ query }) {
  const kindHint = query.get('kind') || '';
  const out = h('div', { class: 'stack', id: 'impOut', 'aria-live': 'polite' });
  const input = h('input', { type: 'file', id: 'impFile', class: 'sr-only', accept: kindHint === 'lanetrax' ? '.pdf,application/pdf' : '.json,.csv,.txt,.pdf,application/json,text/csv,application/pdf', onchange: () => { const f = input.files[0]; input.value = ''; if (f) open(f); } });
  const pickLbl = kindHint === 'lanetrax' ? 'Import your LaneTrax session report (PDF)' : 'Choose a file';
  async function open(f) {
    out.innerHTML = '';
    if (f.size > MAX) { out.append(h('p', { class: 'warn-box', role: 'alert', text: 'That file is over 10 MB. Nothing was imported.' })); return; }
    if (!f.size) { out.append(h('p', { class: 'warn-box', role: 'alert', text: 'That file is empty. Nothing was imported.' })); return; }
    const headBytes = new Uint8Array(await f.slice(0, 1024).arrayBuffer()); const head = new TextDecoder('latin1').decode(headBytes);
    const hd = handlers.find(x => x.match(f, head));
    if (!hd) { out.append(h('p', { class: 'warn-box', role: 'alert', text: 'Arsenal Pro can read its own backup (.json), CSV files and LaneTrax session report PDFs. Nothing was imported.' })); return; }
    out.append(h('p', { class: 'muted', text: 'Reading ' + f.name + '\u2026' }));
    let pv; try { pv = await hd.preview(f, { deviceId: deviceId() }); } catch (e) { console.error(e); pv = { error: 'Could not read that file. Nothing was imported.' }; }
    out.innerHTML = '';
    if (pv.error) { out.append(h('p', { class: 'warn-box', role: 'alert', id: 'impErr', text: pv.error })); return; }
    paint(pv, f);
  }
  function paint(pv, f) {
    out.innerHTML = '';
    const card = h('div', { class: 'card', id: 'impPreview', 'data-kind': pv.kind },
      h('div', { class: 'card-h' }, h('h2', { class: 'card-title', text: pv.title }), h('span', { class: 'pill gold', text: 'Preview \u00b7 not saved yet' })),
      h('p', { class: 'small muted', text: f.name }),
      h('ul', { class: 'plain small' }, ...(pv.summary || []).map(s => h('li', { text: s }))));
    if (pv.warnings && pv.warnings.length) card.append(h('div', { class: 'warn-box', id: 'impWarn' }, h('strong', { text: `${pv.warnings.length} warning${pv.warnings.length > 1 ? 's' : ''}` }), h('ul', { class: 'plain small' }, ...pv.warnings.map(w => h('li', { 'data-code': w.code, text: w.text || w.detail })))));
    if (pv.body) card.append(pv.body(() => paint(pv, f)));
    const go = h('button', { class: 'btn primary block', id: 'impCommit', disabled: !pv.canCommit, onclick: async () => {
      go.disabled = true; try { const msg = await pv.commit(); out.innerHTML = ''; out.append(h('div', { class: 'card', id: 'impDone' }, h('p', { text: msg + '.' }), pv.importId ? h('button', { class: 'btn ghost', id: 'impUndo', onclick: async () => { await undoImport(pv.importId); toast('Import undone'); out.innerHTML = ''; out.append(h('p', { id: 'impUndone', text: 'Import undone. Its records are hidden everywhere; the file can be imported again.' })); } }, 'Undo this import') : null)); toast(msg); }
      catch (e) { console.error(e); go.disabled = false; toast('Import failed. Nothing was saved.', { kind: 'bad' }); }
    } }, pv.commitLabel || 'Import');
    card.append(go); out.append(card);
  }
  const imports = h('div', { class: 'stack', id: 'impList' });
  ready().then(() => { const P = proj(); const list = Object.values(P.imports).filter(i => i.kind !== 'seed' || !i.undone).sort((a, b) => b.ts - a.ts);
    if (!list.length) return; imports.append(h('h2', { class: 'section-title', text: 'Past imports' }), ...list.map(i => h('div', { class: 'row between card tight' }, h('span', { class: 'small', text: `${i.label || i.fileName || i.kind}${i.undone ? ' \u00b7 undone' : ''}` }), i.undone ? null : h('button', { class: 'btn sm ghost', 'data-undo': i.id, onclick: async (ev) => { await undoImport(i.id); ev.target.closest('.card').querySelector('span').textContent += ' \u00b7 undone'; ev.target.remove(); toast('Import undone'); } }, 'Undo')))); });
  const el = h('section', { class: 'screen list-screen' },
    h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', html: icon('back'), onclick: () => back('#/more') }), h('h1', { class: 'title', text: 'Import' })),
    h('div', { class: 'stack' },
      h('div', { class: 'card' },
        h('p', { class: 'small', text: 'Files are read on this phone. Nothing is saved until you tap Import, and every import can be undone.' }),
        h('label', { class: 'btn primary block', for: 'impFile', id: 'impPick', tabindex: '0', onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } } }, pickLbl), input,
        kindHint === 'lanetrax' ? null : h('button', { class: 'btn ghost block', id: 'impLT', onclick: () => { input.accept = '.pdf,application/pdf'; input.click(); } }, 'Import your LaneTrax session report (PDF)')),
      out, imports));
  return { el, title: 'Import', open };
}

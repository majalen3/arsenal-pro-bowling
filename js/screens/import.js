// Import: pick a file → preview (nothing persisted) → commit → undo. Handlers sniff the file and build the preview.
import { h, icon, toast } from '../ui.js';
import { back } from '../router.js';
import { ready, addMany, undoImport, proj, hydrateMirror } from '../hub.js';
import { migrateV0 } from '../data/migrate.js';
import { deviceId } from '../store.js';
import { readBackup, restoreBackup } from '../data/backup.js';
import { planCsv, planLaneTrax } from '../data/importer.js';
import { parseLaneTrax, BOARD_KEYS } from '../data/lanetrax.js';
import { FIELDS, RUBY_PRESET, presetFor, savePreset } from '../data/csv.js';
import { objGet, lsSet } from '../store.js';
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
export async function sha256Hex(buf) {
  if (!(globalThis.crypto && crypto.subtle)) return null;
  const d = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const PRESETS = 'ap_import_presets';
const presetStore = { get: () => objGet(PRESETS) || {}, set: v => lsSet(PRESETS, v) };
const AT = [['', 'Where was it measured?'], ['release', 'At release'], ['launch', 'At launch (first feet)'], ['average', 'Average down the lane'], ['impact', 'At the pins (impact)'], ['unknown', 'Not sure (kept as unknown)']];
const SHAPES = { wide: 'Game 1 / Game 2 \u2026 columns', score: 'One score per row', frames: 'Frame-by-frame rows (scored with USBC rules)', plain: 'Plain list of scores' };
handlers.push({
  id: 'csv', match: (f, head) => /\.(csv|txt|tsv)$/i.test(f.name) && !/^%PDF/.test(head),
  async preview(f, ctx) {
    const db = await ready(); const buf = await f.arrayBuffer();
    const text = new TextDecoder('utf-8').decode(buf), sha256 = await sha256Hex(buf);
    const st = { mapping: null, speedUnit: null, speedAt: null, picks: {}, preset: null };
    const first = planCsv({ text, fileName: f.name, size: f.size, sha256, P: proj(), deviceId: ctx.deviceId });
    if (!first.headers) return { error: first.errors[0] || 'That CSV has no rows. Nothing was imported.' };
    st.preset = presetFor(first.headers, presetStore); if (st.preset) st.mapping = Object.assign({}, st.preset.mapping);
    const pv = { title: 'Import CSV', kind: 'csv' };
    const build = () => {
      const plan = planCsv({ text, fileName: f.name, size: f.size, sha256, mapping: st.mapping, speedUnit: st.speedUnit, speedAt: st.speedAt, picks: st.picks, P: proj(), deviceId: ctx.deviceId, importId: first.importId });
      st.mapping = plan.mapping; st.speedUnit = plan.speedUnit;
      const c = plan.counts, warns = [];
      if (plan.dup) warns.push({ code: 'DUPLICATE', text: plan.dup.by === 'file' ? 'You already imported this exact file. Undo the earlier import first if you want to bring it in again.' : 'The same rows are already imported from another file. Importing again would double-count them.' });
      for (const e of plan.errors.slice(0, 5)) warns.push({ code: 'ROW', text: e });
      for (const i of plan.issues.slice(0, 5)) warns.push({ code: i.level === 'error' ? 'ROW' : 'CHECK', text: i.text });
      const more = plan.errors.length + plan.issues.length - 10; if (more > 0) warns.push({ code: 'MORE', text: `${more} more row notes not shown.` });
      if (plan.needsSpeedAt) warns.push({ code: 'SPEED_AT', text: 'Pick where the speed was measured. Release, launch and impact speeds differ by 1\u20133 mph.' });
      if (plan.unconfirmed.length) warns.push({ code: 'BALL_CONFIRM', text: `Confirm ${plan.unconfirmed.length} ball name${plan.unconfirmed.length > 1 ? 's' : ''} below.` });
      Object.assign(pv, {
        summary: plan.mode === 'release' ? [`${c.rows} rows \u00b7 ${c.accepted} ready \u00b7 ${c.rejected} with errors (skipped)`, 'Release numbers stay as measurements until you accept them on Tonight.']
          : [`${SHAPES[plan.shape] || plan.shape}`, `${c.games} games in ${c.sessions} session${c.sessions === 1 ? '' : 's'} \u00b7 ${c.rejected} row${c.rejected === 1 ? '' : 's'} skipped`],
        warnings: warns, canCommit: plan.canCommit, importId: plan.importId,
        commitLabel: plan.dup ? 'Already imported' : plan.canCommit ? `Import ${plan.mode === 'release' ? c.accepted + ' rows' : c.games + ' games'}` : 'Finish the checks above',
        async commit() { const a = await addMany(plan.events); return `${a.length - 1} records imported from ${f.name}`; },
        plan,
      });
    };
    pv.body = repaint => {
      const plan = pv.plan, wrap = h('div', { class: 'stack', id: 'csvMap' });
      wrap.append(h('div', { class: 'row between' }, h('h3', { class: 'section-title', text: 'Columns' }), st.preset ? h('span', { class: 'pill', id: 'csvPreset', text: 'Saved mapping applied' }) : null));
      if (plan.mode === 'scores' && !st.showMap) {
        wrap.append(h('p', { class: 'small', id: 'csvShape', text: `Read as: ${SHAPES[plan.shape] || plan.shape}. Columns: ${plan.headers.filter(Boolean).join(', ')}.` }),
          h('button', { class: 'btn sm ghost', id: 'csvShowMap', onclick: () => { st.showMap = true; repaint(); } }, 'These are release numbers, map columns'));
      } else {
      const opts = [['', 'Ignore']].concat(Object.entries(FIELDS).map(([k, v]) => [k, v.label]));
      plan.headers.forEach((hd, i) => {
        const id = 'csvCol' + i, sel = h('select', { id, 'data-col': i, onchange: () => { const m = Object.assign({}, st.mapping); if (sel.value) m[i] = sel.value; else delete m[i]; st.mapping = m; build(); repaint(); } }, ...opts.map(([v, t]) => h('option', { value: v, text: t, selected: (st.mapping[i] || '') === v })));
        wrap.append(h('div', { class: 'kv' }, h('label', { for: id, class: 'small', text: hd || `Column ${i + 1}` }), sel));
      });
      if (Object.values(st.mapping).includes('speed')) {
        const u = h('select', { id: 'csvUnit', onchange: () => { st.speedUnit = u.value; build(); repaint(); } }, ...['mph', 'kph', 'm/s'].map(x => h('option', { value: x, text: x, selected: st.speedUnit === x })));
        const at = h('select', { id: 'csvAt', 'aria-required': 'true', onchange: () => { st.speedAt = at.value || null; build(); repaint(); } }, ...AT.map(([v, t]) => h('option', { value: v, text: t, selected: (st.speedAt || '') === v })));
        wrap.append(h('div', { class: 'kv' }, h('label', { for: 'csvUnit', class: 'small', text: 'Speed unit' }), u), h('div', { class: 'kv' }, h('label', { for: 'csvAt', class: 'small', text: 'Speed measured' }), at));
      }
      }
      const names = Object.values(plan.balls);
      if (names.length) {
        wrap.append(h('h3', { class: 'section-title', text: 'Balls' }));
        names.forEach((b, i) => {
          const id = 'csvBall' + i, top = b.candidates[0];
          const sel = h('select', { id, 'data-ball': b.input, onchange: () => { st.picks[b.input] = sel.value === '-' ? undefined : sel.value; if (st.picks[b.input] === undefined) delete st.picks[b.input]; build(); repaint(); } },
            b.confirmed ? null : h('option', { value: '-', text: 'Confirm\u2026', selected: true }),
            ...b.candidates.map(c => h('option', { value: c.id, text: c.label, selected: b.confirmed && b.id === c.id })),
            h('option', { value: '', text: 'Not in the list (keep the name only)', selected: b.confirmed && !b.id }));
          const row = h('div', { class: 'stack', 'data-ball-row': b.input }, h('label', { for: id, class: 'small', text: b.confirmed ? `\u201c${b.input}\u201d` : `\u201c${b.input}\u201d \u2014 ${top ? top.label + '?' : 'no match in the catalog'}` }), sel);
          if (!b.confirmed && top) row.append(h('button', { class: 'btn sm', 'data-yes': b.input, onclick: () => { st.picks[b.input] = top.id; build(); repaint(); } }, `Yes, ${top.label}`));
          wrap.append(row);
        });
      }
      wrap.append(h('div', { class: 'row wrap' },
        h('button', { class: 'btn sm ghost', id: 'csvSavePreset', onclick: () => { savePreset(plan.headers, st.mapping, presetStore); st.preset = { mapping: st.mapping }; toast('Mapping saved for files with these columns'); repaint(); } }, 'Save this mapping'),
        h('span', { class: 'pill', id: 'csvRuby', title: RUBY_PRESET.note, text: 'Ruby preset: needs a sample file' })));
      return wrap;
    };
    build(); return pv;
  },
});
const LTX_TEXT = {
  SHOT_COUNT_GAP: d => `Shot count: ${d.replace(/^strikes\+leaves\+made\+missed spares = (\d+), Total Shots = (\d+)$/, 'strikes, leaves and spares add up to $1 but the report says $2 total shots')}. Both numbers are kept.`,
  IMPACT_SPEED_KPI_VS_TABLE: d => `Impact speed: ${d.replace(/^KPI ([\d.]+) vs summary mean ([\d.]+)$/, '$1 mph in Key Stats vs $2 mph in the Summary table')}. Both are kept; the Key Stats number may cover strike shots only.`,
};
const fmt = (v, u) => u === 'board' ? `bd ${v}` : u === '%' || u === '\u00b0' ? `${v}${u}` : `${v} ${u || ''}`.trim();
handlers.push({
  id: 'lanetrax', match: (f, head) => /\.pdf$/i.test(f.name) || /^%PDF-/.test(head),
  async preview(f, ctx) {
    await ready(); const buf = await f.arrayBuffer();
    const r = await parseLaneTrax(new Uint8Array(buf)); if (!r.ok) return { error: r.error };
    const sha256 = await sha256Hex(buf), st = { flip: false, allowDup: false }, pv = { title: 'LaneTrax session report', kind: 'lanetrax' };
    let importId = null;
    const build = () => {
      const plan = planLaneTrax({ record: r.record, fileName: f.name, size: f.size, sha256, flip: st.flip, allowDup: st.allowDup, P: proj(), deviceId: ctx.deviceId, importId });
      importId = plan.importId; const rec = plan.record, o = rec.outcomes;
      const warns = rec.warnings.map(w => ({ code: w.code, text: LTX_TEXT[w.code] ? LTX_TEXT[w.code](w.detail) : w.detail }));
      if (plan.dup) warns.unshift({ code: 'DUPLICATE', text: `Already imported on ${new Date(plan.dup.import.ts).toLocaleDateString()}.` });
      Object.assign(pv, { plan, importId: plan.importId, warnings: warns, canCommit: plan.canCommit,
        summary: [`Session ${rec.date} \u00b7 ${rec.totalShots} shots`, o.strikes ? `${o.strikes.n} strikes \u00b7 ${o.leaves.n} leaves \u00b7 ${o.madeSpares.n} made spares \u00b7 ${o.missedSpares.n} missed spares` : '', 'Session averages only. The per-shot charts in the PDF are pictures and are not read.'].filter(Boolean),
        commitLabel: plan.dup ? 'Already imported' : 'Import session averages',
        async commit() { await addMany(plan.events); return `LaneTrax session ${rec.date} imported (${plan.measurements.length} measurements waiting for you on Tonight)`; } });
    };
    pv.body = repaint => {
      const plan = pv.plan, rec = plan.record, wrap = h('div', { class: 'stack', id: 'ltxBody' });
      wrap.append(h('div', { class: 'row between' }, h('span', { class: 'prov', 'data-prov': 'device', text: `LaneTrax \u00b7 ${rec.date} \u00b7 n=?` }),
        h('button', { class: 'btn sm ghost', id: 'ltxFlip', 'aria-pressed': String(st.flip), onclick: () => { st.flip = !st.flip; build(); repaint(); } }, st.flip ? 'Boards flipped (40 \u2212 b)' : 'Flip boards')));
      wrap.append(h('p', { class: 'small muted', text: st.flip ? 'Board positions shown as 40 \u2212 board. Hook boards and ranges are not flipped.' : 'Boards read as right-handed, as printed. Flip them if this report is from the left side.' }));
      wrap.append(h('h3', { class: 'section-title', text: 'Key stats' }), h('div', { class: 'kv', id: 'ltxKpis' }, ...rec.kpis.flatMap(k => [h('span', { class: 'small', text: k.metric }), h('strong', { text: `${fmt(k.value, k.unit)} \u00b7 Level ${k.level}` })])));
      wrap.append(h('h3', { class: 'section-title', text: 'Session averages' }), h('div', { class: 'kv', id: 'ltxSummary' }, ...Object.entries(rec.summary).flatMap(([key, v]) => [h('span', { class: 'small', text: v.label + (st.flip && BOARD_KEYS.includes(key) ? ' (flipped)' : '') }), h('strong', { 'data-key': key, text: `${fmt(v.mean, v.unit)} \u00b7 range ${v.unit === 'board' ? v.range + ' boards' : fmt(v.range, v.unit)}` })])));
      wrap.append(h('h3', { class: 'section-title', text: 'Release numbers to review' }), h('ul', { class: 'plain small', id: 'ltxMeas' }, ...plan.measurements.map(m => h('li', { text: `${m.label}: ${m.data.speed ? m.data.speed.v + ' mph' : m.data.rev.v + ' rpm'}, waits for you to accept on Tonight` }))));
      if (plan.dup && !st.allowDup) wrap.append(h('button', { class: 'btn ghost block', id: 'ltxAgain', onclick: () => { st.allowDup = true; build(); repaint(); } }, 'Import again as a new session'));
      return wrap;
    };
    build(); return pv;
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
      go.disabled = true; try { const msg = await pv.commit(); out.innerHTML = ''; const sids = pv.plan && pv.plan.events ? pv.plan.events.filter(e => e.type === 'session.created').map(e => e.entityId) : [];
      out.append(h('div', { class: 'card', id: 'impDone' }, h('p', { text: msg + '.' }), sids.length ? h('a', { class: 'btn primary', id: 'impResults', href: sids.length === 1 ? '#/session/' + encodeURIComponent(sids[0]) : '#/sessions' }, sids.length === 1 ? 'See results' : `See ${sids.length} sessions`) : null, pv.importId ? h('button', { class: 'btn ghost', id: 'impUndo', onclick: async () => { await undoImport(pv.importId); toast('Import undone'); out.innerHTML = ''; out.append(h('p', { id: 'impUndone', text: 'Import undone. Its records are hidden everywhere; the file can be imported again.' })); } }, 'Undo this import') : null)); toast(msg); }
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

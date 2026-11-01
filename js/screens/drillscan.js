// #/drill-card?own=<owned id>  and  #/me/drill-card  (owner queue item 6, 2026-11-01): import a grip / layout spec card from a photo.
// The photo stays in memory on this phone (never saved, never uploaded). "Read the card" runs on-device OCR (lazy, js/cc/drillocr.js);
// every field can be typed instead, so handwritten cards work too. Each value shows where it came from (read from card / typed),
// shaky reads are highlighted, and nothing is saved until the bowler reviews it and taps Save. Layout values are the driller's
// measurements as written on the card; the app suggests no layout and gives no fitting advice.
import { h, toast, sheet, icon } from '../ui.js';
import { back, go } from '../router.js';
import { balls } from '../data.js';
import { profile, setProfile } from '../store.js';
import { ready, proj, add } from '../hub.js';
import * as D from '../cc/drillcard.js';
const SHORT = { lf: 'Left hole', rf: 'Right hole', th: 'Thumb' };
const GROUP_OF = Object.fromEntries(D.GROUPS.flatMap(([g, , fs]) => fs.map(([k]) => [k, SHORT[g] || ''])));
const ballName = o => { const b = o && balls.find(x => x.id === o.catalogId); return (b && b.name) || (o && (o.name || (o.spec && o.spec.name))) || 'this ball'; };
export async function render({ query }) {
  await ready();
  const P = proj(), forMe = location.hash.startsWith('#/me/'), ownId = query && query.get('own');
  const own = ownId && P ? P.owned[ownId] : null;
  const owned = P ? Object.values(P.owned).filter(o => !o.deleted) : [];
  const prev = (own && own.drill && own.drill.fields) || {};
  const vals = {};   // key -> { v, src: 'card'|'typed', conf, low }
  for (const [k, e] of Object.entries(prev)) vals[k] = { v: e.v, src: e.src };
  let photoUrl = null, photoFile = null, reading = false;
  const title = own ? 'Drill card' : 'Scan a drill card';
  const bar = h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', html: icon('back'), onclick: () => back(own ? '#/ball/' + own.catalogId : '#/me') }), h('h1', { class: 'title', text: title }));
  const img = h('img', { class: 'dc-img', id: 'dcImg', alt: 'Your card photo', hidden: true });
  const file = h('input', { type: 'file', accept: 'image/*', id: 'dcFile', class: 'dc-file', 'aria-label': 'Take or pick a photo of the card' });
  const msg = h('p', { class: 'small muted', id: 'dcMsg', 'aria-live': 'polite', text: 'The photo stays on this phone and is not saved.' });
  const readBtn = h('button', { class: 'btn primary', id: 'dcRead', disabled: true, onclick: () => readIt() }, 'Read the card');
  const hidePhoto = h('button', { class: 'btn sm ghost', id: 'dcHide', hidden: true, 'aria-label': 'Photo size', onclick: () => { const hid = img.classList.toggle('dc-min'); hidePhoto.textContent = hid ? 'Bigger photo' : 'Smaller photo'; } }, 'Smaller photo');
  // Only the photo is sticky (so it stays beside the fields while scrolling); the controls scroll away.
  const photoBar = h('div', { class: 'dc-photo', id: 'dcPhoto', hidden: true }, img, hidePhoto);
  const ctl = h('div', { class: 'card', id: 'dcCtl' }, own ? h('p', { class: 'small muted', id: 'dcFor', text: `For ${ballName(own)}` }) : null,
    h('div', { class: 'row gap wrap' }, h('label', { class: 'btn ghost', for: 'dcFile' }, 'Take or pick a photo'), file, readBtn), msg);
  file.onchange = () => {
    const f = file.files && file.files[0]; if (!f) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoFile = f; photoUrl = URL.createObjectURL(f); img.src = photoUrl; img.hidden = false; hidePhoto.hidden = false; photoBar.hidden = false;
    readBtn.disabled = false; msg.textContent = 'Photo ready. Tap Read the card, or type the values below while you look at it.';
  };
  // Phone photos are large; 2000 px on the long side reads as well and much faster. Hands the reader the File or a canvas,
  // never a blob: URL (fetching one would need connect-src blob:, which the CSP does not allow).
  async function shrink() {
    const im = new Image(); im.src = photoUrl; await im.decode();
    const s = Math.min(1, 2000 / Math.max(im.naturalWidth, im.naturalHeight)); if (s === 1) return photoFile;
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c;
  }
  async function readIt() {
    if (reading || !photoUrl) return; reading = true; readBtn.disabled = true;
    try {
      const O = await import('../cc/drillocr.js');
      if (!O.supported()) { msg.textContent = 'This phone\u2019s browser can\u2019t read cards on the device. Type the values below while you look at the photo.'; return; }
      msg.textContent = 'Reading on this phone\u2026 the first time downloads the reader (about 5 MB), then it works offline.';
      const r = await O.readCard(await shrink(), { onProgress: m => { if (m && m.status === 'recognizing text') msg.textContent = `Reading\u2026 ${Math.round((m.progress || 0) * 100)}%`; } });
      const g = D.parseWords(r.words, { width: r.width }).fields;
      let n = 0, low = 0;
      for (const [k, e] of Object.entries(g)) { if (vals[k] && vals[k].src === 'typed' && vals[k].v) continue; vals[k] = { v: e.v, src: 'card', conf: e.conf, low: e.low }; n++; if (e.low) low++; }
      msg.textContent = n ? `Read ${n} value${n === 1 ? '' : 's'} from the card${low ? `; ${low} highlighted to check` : ''}. Check each one against the photo; fill in anything missed.`
        : 'Could not read values from this photo (handwriting and glare are hard). Type them below while you look at it.';
      paint();
    } catch (e) { console.error(e); msg.textContent = 'The reader could not start here. Type the values below while you look at the photo.'; }
    finally { reading = false; readBtn.disabled = false; }
  }
  const form = h('div', { class: 'stack', id: 'dcForm' });
  const cmp = h('div', { class: 'note small', id: 'dcPapCmp', 'aria-live': 'polite' });
  const chipOf = e => !e || e.v === '' || e.v == null ? h('span', { class: 'dc-src muted', text: 'empty' })
    : h('span', { class: 'dc-src ' + (e.src === 'card' ? (e.low ? 'low' : 'card') : 'typed'), text: e.src === 'card' ? (e.low ? `read from card \u00b7 check this` : 'read from card') : 'typed' });
  function fieldEl(f) {
    const e = vals[f.k], id = 'dc_' + f.k.replace('.', '_'), chip = h('span', {}, chipOf(e)), err = h('span', { class: 'small dc-err', id: id + '_err' });
    const set = v => { const c = D.checkField(f.k, v); vals[f.k] = { v: String(v).trim(), src: 'typed' }; err.textContent = c.ok ? '' : c.why; chip.replaceChildren(chipOf(vals[f.k])); wrap.classList.remove('low'); paintCmp(); };
    let input;
    if (f.kind === 'pick') input = h('select', { id, onchange: ev => set(ev.target.value) }, h('option', { value: '', text: '\u2014' }), ...f.opts.map(o => h('option', { value: o, text: o, selected: e && e.v === o })));
    else input = h('input', { id, value: e ? e.v : '', inputmode: f.kind === 'text' ? 'text' : 'decimal', autocomplete: 'off', spellcheck: 'false', placeholder: f.kind === 'frac' ? 'e.g. 5 1/8' : '', oninput: ev => set(ev.target.value) });
    const wrap = h('label', { class: 'fld dc-fld' + (e && e.low ? ' low' : ''), 'data-k': f.k }, h('span', { class: 'row between' }, h('span', { text: f.label }), chip), input, err);
    return wrap;
  }
  function paintCmp() {
    const pap = D.papOf(vals['pap.over'] && vals['pap.over'].v, vals['pap.up'] && vals['pap.up'].v), pr = profile() || {};
    const c = pap ? D.papCompare(pr.pap || '', pap) : null;
    cmp.replaceChildren(...(c ? c.lines.map(t => h('div', { text: t })) : [h('div', { class: 'muted', text: 'Fill PAP over and up/down to compare with the PAP on your profile.' })]));
  }
  function paint() {
    form.replaceChildren(...D.GROUPS.map(([gid, label, fs]) => {
      const has = fs.some(([k]) => vals[k] && vals[k].v);
      const d = h('details', { class: 'card tn-more dc-group', id: 'dcG_' + gid, open: gid !== 'lay' || has }, h('summary', { text: label }));
      if (gid === 'card' || gid === 'lf') d.append(h('p', { class: 'small muted', text: gid === 'lf' ? 'Left and right are as drawn on the card, thumb at the bottom.' : 'From the top of the card.' }));
      if (gid === 'pap') d.append(h('p', { class: 'small muted', id: 'dcPapRule', text: 'Over: inches from the centre of your grip toward your bowling side. Up (+) is above the grip\u2019s midline, down (\u2212) below, as printed on the card. Type \u22121/4 for 1/4 down.' }));
      if (gid === 'lay') d.append(h('p', { class: 'small muted', text: 'Measured values: what your driller wrote on the card. The app does not suggest layouts.' }));
      d.append(...fs.map(([k]) => fieldEl(D.FIELD[k])));
      if (gid === 'pap') d.append(cmp);
      return d;
    }));
    paintCmp();
  }
  paint();
  const review = () => {
    const rec = D.cardRecord(vals), keys = Object.keys(rec.fields);
    const bad = Object.entries(vals).filter(([k, e]) => e && e.v && !D.checkField(k, e.v).ok).map(([k]) => D.FIELD[k].label);
    if (!keys.length) { toast('Nothing to save yet: read the card or type a value.'); return; }
    let target = own ? own.id : '', alsoPap = forMe && !!rec.pap;
    const pick = !own && owned.length ? h('label', { class: 'fld' }, h('span', { text: 'Save the card to a ball (optional)' }),
      h('select', { id: 'dcBall', onchange: ev => { target = ev.target.value; } }, h('option', { value: '', text: forMe ? 'No ball, just my PAP' : 'Choose a ball' }), ...owned.map(o => h('option', { value: o.id, text: ballName(o) })))) : null;
    const papBox = rec.pap ? h('label', { class: 'row gap dc-check' }, h('input', { type: 'checkbox', id: 'dcSetPap', checked: alsoPap, onchange: ev => { alsoPap = ev.target.checked; } }),
      h('span', { text: `Set my profile PAP to ${rec.pap.text}` })) : null;
    const list = h('ul', { class: 'dc-review', id: 'dcReview' }, ...D.FIELDS.filter(f => rec.fields[f.k]).map(f => h('li', {}, h('span', { text: `${GROUP_OF[f.k] ? GROUP_OF[f.k] + ', ' : ''}${GROUP_OF[f.k] ? f.label.toLowerCase() : f.label}: ` }), h('b', { text: rec.fields[f.k].v }), h('span', { class: 'muted small', text: ` (${D.provLabel(rec.fields[f.k].src)})` }))));
    const s = sheet({ title: 'Check and save', id: 'dcSheet', body: h('div', { class: 'stack' },
      h('p', { class: 'small', text: 'Check these against your card. Saved values keep where they came from.' }),
      bad.length ? h('p', { class: 'small dc-err', text: `Not saved (check the format): ${bad.join(', ')}.` }) : null,
      list, pick, papBox,
      h('button', { class: 'btn primary block', id: 'dcSave', onclick: async () => {
        if (!target && !(alsoPap && rec.pap)) { toast(forMe ? 'Pick a ball or tick the PAP box.' : 'Pick the ball this card belongs to.'); return; }
        if (target) await add('ownedBall.edited', target, { fields: { drill: rec } });
        if (alsoPap && rec.pap) setProfile({ ...(profile() || {}), pap: rec.pap.text });
        s.close(); toast(target ? `Drill card saved to ${ballName(P.owned[target])}.` : 'PAP saved to your profile.');
        go(target && !forMe ? '#/ball/' + P.owned[target].catalogId : forMe ? '#/me' : '#/bag');
      } }, 'Save'),
      h('button', { class: 'btn ghost block', onclick: () => s.close() }, 'Keep editing')) });
  };
  const foot = h('div', { class: 'dc-foot' }, h('button', { class: 'btn primary block', id: 'dcReviewBtn', onclick: review }, 'Review and save'));
  const el = h('section', { class: 'screen detail', id: 'drillScan' }, bar, photoBar, ctl, form, foot);
  return { el, title, destroy: () => { if (photoUrl) URL.revokeObjectURL(photoUrl); } };
}
// One line for the ball page: spans, PAP and where they came from.
export function drillSummary(d) {
  if (!d || !d.fields) return '';
  const f = d.fields, bits = [];
  if (f['lf.actual'] || f['rf.actual']) bits.push(`spans ${[f['lf.actual'], f['rf.actual']].map(x => (x ? x.v : '\u2014')).join(' / ')}`);
  if (d.pap) bits.push(`PAP ${d.pap.text}`);
  if (f['lay.pinPap']) bits.push(`pin to PAP ${f['lay.pinPap'].v}`);
  const n = Object.keys(f).length, card = Object.values(f).filter(x => x.src === 'card').length;
  return `${bits.join(', ') || n + ' values'} (${card === n ? 'read from card' : card ? `${card} read from card, ${n - card} typed` : 'typed'}, checked by you)`;
}

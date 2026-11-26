// Feedback sheet and post-game survey sheet (owner t163u, 2026-11-21). Loaded only when the bowler opens one.
import { h, sheet, toast, segmented } from '../ui.js';
import * as F from '../cc/feedback.js';
import * as FB from '../feedback.js';

// A screenshot the bowler picks (never captured automatically), redrawn on a canvas: smaller (<= 1000 px), JPEG, and without the
// photo's hidden details (location, camera) because only pixels are copied. Over 190 KB after two tries = not attached.
async function shrink(file) {
  if (!file || !/^image\//.test(file.type) || file.size > 25e6) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    for (const [side, q] of [[1000, 0.6], [760, 0.5], [560, 0.45]]) {
      const k = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const d = c.toDataURL('image/jpeg', q);
      if (d.length * 0.75 <= 190 * 1024) return d;
    }
    return null;
  } catch (e) { return null; } finally { URL.revokeObjectURL(url); }
}

export function openFeedback() {
  let type = null, shot = null;
  const where = FB.route(), dev = FB.device();
  const text = h('textarea', { id: 'fbText', rows: '4', maxlength: String(F.TEXT_MAX), placeholder: 'What happened, or what would help? (optional)', 'aria-label': 'Your feedback (optional)' });
  const left = h('span', { class: 'small muted', id: 'fbLeft', 'aria-live': 'polite', text: `${F.TEXT_MAX} characters left` });
  text.addEventListener('input', () => { left.textContent = `${F.TEXT_MAX - text.value.length} characters left`; });
  const send = h('button', { class: 'btn primary block', id: 'fbSend', type: 'button', disabled: true }, 'Send feedback');
  const kinds = segmented('Feedback type', F.KINDS, null, v => { type = v; send.disabled = false; }, 'wide');
  kinds.id = 'fbType';
  const file = h('input', { type: 'file', accept: 'image/*', id: 'fbFile', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' });
  const shotBox = h('div', { class: 'fb-shot', id: 'fbShotBox' });
  const pick = h('button', { class: 'btn ghost block', id: 'fbShot', type: 'button', onclick: () => file.click() }, 'Add a screenshot (optional)');
  const paintShot = () => {
    shotBox.replaceChildren();
    if (!shot) { pick.hidden = false; return; }
    pick.hidden = true;
    shotBox.append(h('img', { src: shot, alt: 'Screenshot to send', id: 'fbShotImg' }),
      h('div', { class: 'stack' }, h('p', { class: 'small', text: 'Check it first: a screenshot can show names, scores or teammates. It is resized and sent only with this note.' }),
        h('button', { class: 'btn ghost sm', id: 'fbShotRemove', type: 'button', onclick: () => { shot = null; file.value = ''; paintShot(); } }, 'Remove screenshot')));
  };
  file.addEventListener('change', async () => { const f = file.files && file.files[0]; if (!f) return; pick.disabled = true; shot = await shrink(f); pick.disabled = false; if (!shot) toast('That image could not be attached. Try a smaller screenshot.', { kind: 'bad' }); paintShot(); });
  const consent = h('p', { class: 'small muted', id: 'fbConsent', text: `Sends your note, the type, app version ${F.BUILD}, this screen (${where}) and the kind of device (${dev}), only to the Arsenal Pro server. No name, email, account, balls, scores or ids. Offline, it waits on this phone and sends later.` });
  const s = sheet({ title: 'Send feedback', id: 'fbSheet', body: h('div', { class: 'stack' }, kinds, text, left, pick, file, shotBox, consent, send,
    h('a', { class: 'small fb-link', href: 'privacy.html#feedback', id: 'fbPrivacy' }, 'What is collected and how to delete it')) });
  send.addEventListener('click', async () => {
    if (!type) return;
    send.disabled = true; send.setAttribute('aria-busy', 'true');
    const r = await FB.submit('feedback', F.feedbackBody({ type, text: text.value, screenshot: shot, route: where, device: dev }));
    s.close(); toast(r === 'sent' ? 'Thanks. Feedback sent.' : 'Thanks. Saved on this phone; it sends when you are back online.');
  });
  return s;
}

export function openSurvey({ onDone } = {}) {
  FB.surveyAsked();   // asked once, answered or not; the next ask waits for 3 more finished games and another night
  let useful = 0, sent = false;
  const note = h('input', { id: 'svNote', type: 'text', maxlength: String(F.NOTE_MAX), placeholder: 'Anything get in the way? (optional)', 'aria-label': 'Anything get in the way? (optional)', autocomplete: 'off' });
  const send = h('button', { class: 'btn primary grow', id: 'svSend', type: 'button', disabled: true }, 'Send');
  const rate = h('div', { class: 'sv-rate', role: 'radiogroup', 'aria-label': 'How useful was Arsenal Pro tonight? 1 not useful, 5 very useful', id: 'svRate' },
    ...[1, 2, 3, 4, 5].map(n => h('button', { type: 'button', role: 'radio', class: 'sv-opt', 'data-v': String(n), 'aria-checked': 'false', 'aria-label': String(n),
      onclick: () => { useful = n; send.disabled = false; rate.querySelectorAll('.sv-opt').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.v === n))); } }, String(n))));
  const s = sheet({ title: 'Quick question', id: 'svSheet', onClose: () => { onDone && onDone(); }, body: h('div', { class: 'stack' },
    h('p', { id: 'svQ', text: 'How useful was Arsenal Pro tonight?' }), rate,
    h('div', { class: 'row between small muted', 'aria-hidden': 'true' }, h('span', { text: 'Not useful' }), h('span', { text: 'Very useful' })),
    note,
    h('p', { class: 'small muted', id: 'svConsent', text: `Sends only your answer, app version ${F.BUILD} and the kind of device. Asked at most once every few games, never while you score.` }),
    h('div', { class: 'row gap' }, h('button', { class: 'btn ghost grow', id: 'svSkip', type: 'button', onclick: () => s.close() }, 'Not now'), send)) });
  send.addEventListener('click', async () => {
    if (sent || !useful) return; sent = true;
    const b = F.surveyBody({ useful, note: note.value, device: FB.device() });
    s.close(); const r = await FB.submit('survey', b);
    toast(r === 'sent' ? 'Thanks for the answer.' : 'Thanks. Saved; it sends when you are back online.');
    setTimeout(() => FB.offerOptIn('survey', { rating: useful }), 2900);   // v83: once ever, only after a 4 or 5; after the Thanks toast has gone
  });
  return s;
}

// v83 (owner t177u): the one-time opt-in offer. Plain words, both switches still OFF until the bowler taps; Me > Privacy changes it any time.
export function optInToast() {
  toast('Help make Arsenal Pro better? Anonymous counts, your choice.', { action: { label: 'Choose', run: () => openOptIn() }, ms: 7000 });
}
export function openOptIn() {
  const st = FB.settings();
  const done = (usage, crash, msg) => { if (usage && !st.usage) FB.setUsage(true); if (crash && !st.crash) FB.setCrash(true); s.close(); if (msg) toast(msg); };
  const s = sheet({ title: 'Help make it better', id: 'optSheet', body: h('div', { class: 'stack' },
    h('p', { id: 'optWhy', text: 'Arsenal Pro is free and has no ads or trackers. Two switches tell us what to fix next:' }),
    h('ul', { class: 'small stack', id: 'optList' },
      h('li', {}, h('b', { text: 'Usage counts: ' }), 'totals like bags packed, balls added, Optimize taps and games logged. No names, balls, scores or ids.'),
      h('li', {}, h('b', { text: 'Crash reports: ' }), 'the error and the screen when something breaks, with anything you typed removed.')),
    h('p', { class: 'small muted', id: 'optWhen', text: 'Sent only to the Arsenal Pro server, never during a game. Change it any time in Me \u203a Privacy. We will not ask again.' }),
    h('button', { class: 'btn primary block', id: 'optBoth', type: 'button', onclick: () => done(true, true, 'Thanks. Counts and crash reports are on.') }, 'Turn on both'),
    h('button', { class: 'btn ghost block', id: 'optCrash', type: 'button', onclick: () => done(false, true, 'Crash reports on.') }, 'Crash reports only'),
    h('button', { class: 'btn ghost block', id: 'optNo', type: 'button', onclick: () => done(false, false, '') }, 'No thanks'),
    h('a', { class: 'small fb-link', href: 'privacy.html#feedback', id: 'optPrivacy' }, 'Exactly what is sent')) });
  return s;
}

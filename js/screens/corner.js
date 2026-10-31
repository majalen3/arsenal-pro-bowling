// Item 3: the corner-pin insight block (recap and Insights). One line up front; why, options and sources behind a tap.
// Counts are labelled as from the bowler's frames; the options are labelled as coaching text, not a measurement.
import { h } from '../ui.js';
import { withHelp } from './help.js';
export function cornerBlock(id, ins) {
  if (!ins) return null;
  return h('div', { class: 'corner-ins', id },
    withHelp(h('p', { class: 'small', id: id + 'Lead' }, h('b', { text: ins.label + ': ' }), ins.lead), 'bm-flat10', 'Flat 10 and ring 10'),
    h('details', { class: 'corner-more', id: id + 'More' }, h('summary', { text: 'Why, and what to try' }),
      h('p', { class: 'small muted', text: ins.tags }),
      h('p', { class: 'small', text: ins.why }),
      h('p', { class: 'small' }, h('b', { text: ins.coachLabel + ':' })),
      h('ol', { class: 'small', id: id + 'Opts' }, ...ins.options.map(t => h('li', { text: t }))),
      ins.handNote ? h('p', { class: 'small muted', text: ins.handNote }) : null,
      h('p', { class: 'small muted', text: 'Sources:' }), h('ul', { class: 'plain small corner-src' }, ...ins.sources.map(s => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.title }))))));
}

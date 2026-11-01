// Code of conduct for My Team (owner 2026-10-31). Plain, short, warm. The team's secretary handles reports; there is no
// automatic word filter (DECISIONS 2026-10-31): people, not a list, decide what fits their team.
import { h, icon } from '../ui.js';
import { back } from '../router.js';
export const RULES = [
  ['Be kind', 'Cheer good shots and bad nights alike. Every bowler, every style, every average belongs here.'],
  ['Talk about bowling, not people', 'Notes are for lanes and balls. No comments on anyone\u2019s body, age, ability or background.'],
  ['Share only what is yours', 'Post your own balls and counts. Don\u2019t post someone else\u2019s details, contact info or photos.'],
  ['No selling or spam', 'Team notes are not ads. Pro shop tips are welcome; sales pitches are not.'],
  ['Keep it safe', 'No threats, harassment or hate. If anything feels wrong, tap Report: only your secretary sees it.'],
];
export async function render() {
  const el = h('section', { class: 'screen list-screen', id: 'conduct' },
    h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', html: icon('back'), onclick: () => back('#/team') }), h('h1', { class: 'title', text: 'Code of conduct' })),
    h('div', { class: 'stack' },
      h('p', { text: 'My Team is for league teammates to share what they are bringing and help each other read the lanes. Five simple rules:' }),
      ...RULES.map(([t, d], i) => h('div', { class: 'card', 'data-rule': i + 1 }, h('h2', { class: 'card-title', text: `${i + 1}. ${t}` }), h('p', { class: 'small', text: d }))),
      h('div', { class: 'card' }, h('h2', { class: 'card-title', text: 'What happens with a report' }),
        h('p', { class: 'small', text: 'Your team\u2019s secretary sees the report and can remove a note, remove a bowler from the team, or dismiss the report. The app does not read or filter your notes. Anyone can leave a team at any time, and leaving removes what they shared.' }))));
  return { el, title: 'Code of conduct' };
}

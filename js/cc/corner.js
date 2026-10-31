// Item 3 (owner 2026-10-24): the same-side corner pin left alone on a first ball ("flat 10" for right-handers, "flat 7"
// for left-handers). Pure, DOM-free (node --test). Counts come only from the bowler's own frames (real data); the
// explanation and options are coaching text with sources (BOWL.com / USBC Bowling Academy), never a measurement.
// The app cannot tell a flat 10 from a ringing 10, so the text names both and says so. No percentages are shown.
import { walk } from './card.js';

// Minimum samples before anything is shown: a night needs 3 corner leaves on at least 10 first balls; Insights (all
// scored games) needs 5 on at least 30. Below that the pattern is too thin to name.
export const MIN = { night: { n: 3, of: 10 }, all: { n: 5, of: 30 } };
export const cornerPin = hand => hand === 'left' ? 7 : 10;   // unset hand reads right-handed (USBC convention)

// Counts first balls (fresh rack, no foul) and those that left ONLY the corner pin with a pocket tag or no tag.
// High/light-tagged ones are counted apart: a light-hit 10 is a different miss.
export function cornerLeaves(games, hand) {
  const pin = cornerPin(hand); let first = 0, n = 0, pocket = 0, untagged = 0, offHit = 0;
  for (const g of games || []) for (const x of walk(g.throws || [])) {
    if (!x.rack || x.t.foul) continue; first++;
    if (x.strike || x.leave.length !== 1 || x.leave[0] !== pin) continue;
    const m = x.t.miss;
    if (m === 'high' || m === 'light') { offHit++; continue; }
    n++; if (m === 'pocket') pocket++; else untagged++;
  }
  return { pin, first, n, pocket, untagged, offHit };
}

export const enough = (c, scope = 'night') => !!c && c.n >= MIN[scope].n && c.first >= MIN[scope].of;

export const SOURCES = [
  { key: 'usbc_entry', url: 'https://bowl.com/adjusting-entry-angle', title: 'BOWL.com (USBC), Adjusting Entry Angle' },
  { key: 'btm_corners', url: 'https://www.bowlingthismonth.com/bowling-tips/kicking-out-the-corners-part-2/', title: 'Bowling This Month, Kicking Out the Corners, Part 2' }
];

// Text for a count that passed `enough`. Numbers first; one line up front, the rest behind a tap.
export function cornerInsight(c, { scope = 'night', hand = null } = {}) {
  if (!enough(c, scope)) return null;
  const pin = c.pin, side = pin === 10 ? 'right' : 'left', where = scope === 'night' ? 'this night' : 'your scored games';
  const lead = `${pin} pin alone on ${c.n} of ${c.first} first balls (${where}).`;
  const tags = c.pocket ? `${c.pocket} tagged pocket, ${c.untagged} not tagged.` : 'None tagged as a hit, so the count includes any hit that left it.';
  const why = `A ${pin} left alone after a hit in the pocket usually means the ball reached the pins too straight: the ${pin === 10 ? 6 : 4} pin slides in front of the ${pin} (flat) or wraps around it (ringing). The app counts the leave; it can't see which one, and a flat one can come from two different hits, so try one change at a time.`;
  const options = [
    `Ball still skidding at the pins? Match speed and revs so it is rolling as it gets there: change your tempo or your hand position.`,
    `More angle into the pocket: play the ball farther ${side} and add revs, or move feet and eyes ${side} and play more direct through the front.`,
    `A ball with a stronger back end.`
  ];
  return { lead, tags, why, options, label: 'From your frames', coachLabel: 'Coaching options (USBC), not a measurement', handNote: hand ? null : 'Read right-handed; set your hand on the Bowler profile.', sources: SOURCES };
}

// Explicit handedness (owner 2026-10-24, IA_PLAN P1.6): the bowler's hand comes ONLY from what they told us on the Bowler profile
// (welcome, More, or the one-time question). No guessing from imports, starter data, welcome defaults or the model.
// Unset = null; screens then read boards right-handed (the USBC / lane-diagram convention) and say so.
import { profile, setProfile, prefs, setPrefs } from '../store.js';
// p.entered (Sim2 #11) marks what the bowler actually touched on welcome; an untouched welcome default is not an answer.
export function handOfProfile(p) {
  if (!p || (p.hand !== 'left' && p.hand !== 'right')) return null;
  if (p.entered && !p.entered.hand) return null;
  return p.hand;
}
export const hand = () => handOfProfile(profile());
export const isLefty = () => hand() === 'left';
export const handOr = () => hand() || 'right';
export const HAND_LABEL = { right: 'Right-handed', left: 'Left-handed' };
// Ask once: until the bowler answers or taps "Not now".
export const needsAsk = (p = profile(), pr = prefs()) => !handOfProfile(p) && !pr.handAsked;
export function setHand(v) {
  if (v !== 'left' && v !== 'right') throw new Error('hand must be left or right');
  const p = Object.assign({}, profile() || {}); p.hand = v; p.handSource = 'user-reported';
  if (p.entered) p.entered = Object.assign({}, p.entered, { hand: true });
  setProfile(p); setPrefs({ handAsked: true });
}
export const dismissAsk = () => setPrefs({ handAsked: true });

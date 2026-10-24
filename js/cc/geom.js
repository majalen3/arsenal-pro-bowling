// Engine geometry helpers (Targeting investigation, DECISIONS #26). Read-only use of the UNCHANGED engine's constants:
// simulatePath launches at y = LH − 42 with vx = 0.85·sin(aim°) px/step and vy = −5.6 px/step, and the path is straight until
// the hook phase starts (≥ ~12 ft). So the board the model's ball crosses at d feet is release − sin(aim°)·0.85·steps(d)/pxPerBoard.
// This replaces the app's v1 label "target = release − aim" (1 board per aim unit), which was ~10× too large.
import { LW, LH, PX_FT, FOUL_Y } from '../engine.js';

export const AIM_MAX = 8;                                    // RANGES.aim in the app (−8…8); the engine's tested range
const PX_BOARD = (LW - 28) / 39, START_Y = LH - 42;
const steps = ft => (START_Y - (FOUL_Y - ft * PX_FT)) / 5.6;
export const shiftAt = (aim, ft = 15) => Math.sin(aim * Math.PI / 180) * 0.85 * steps(ft) / PX_BOARD;   // boards toward 1 (RH right)
export const arrowsBoard = (release, aim, ft = 15) => release - shiftAt(aim, ft);
export const REACH = shiftAt(AIM_MAX);
// Owner bug 2026-10-24 ("stand 25, aim 15, I can't drag that"): the bowler's stand and aim are independent, any board 1–39
// (aim in ½ boards). The engine can launch only ±REACH board off the laydown by the arrows, so a wider line is fed to the
// UNCHANGED engine the strikeline.js way: the rest of the arrows offset is a parallel laydown shift, so the model ball still
// crosses the arrows exactly at the bowler's aim (app estimate, DECISIONS #26). The bowler's stand/laydown is never changed.
export const BOARDS = [1, 39];
export const clampBoard = v => Math.max(BOARDS[0], Math.min(BOARDS[1], +v));
export const half = v => Math.round(+v * 2) / 2;
export function modelOf(lay, arrows, ft = 15) {
  const f = aimFor(lay, arrows, ft), release = f.clamped ? lay + (arrows - f.got) : lay;
  return { release: Math.round(release * 1000) / 1000, aim: f.aim, clamped: f.clamped, shift: Math.round((release - lay) * 10) / 10 };
}                      // ≈ 0.87 board: the farthest the model can cross the arrows from the laydown
// Requested arrows board → model aim. clamped = the request needs more launch angle than the model has.
export function aimFor(release, arrows, ft = 15) {
  const want = (release - arrows) / (0.85 * steps(ft) / PX_BOARD);
  const s = Math.max(-1, Math.min(1, want));
  let aim = Math.asin(s) * 180 / Math.PI;
  const clamped = Math.abs(aim) > AIM_MAX + 1e-9 || Math.abs(want) > 1;
  aim = Math.max(-AIM_MAX, Math.min(AIM_MAX, aim));
  return { aim: Math.round(aim * 1000) / 1000, clamped, got: arrowsBoard(release, aim, ft) };
}

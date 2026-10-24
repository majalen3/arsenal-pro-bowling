export const PATTERN_LABEL = { house:'House', sport:'Sport', cheetah:'Cheetah', scorpion:'Scorpion', shark:'Shark', dry:'Dry / burn' };
export const PATTERN_HINT = { house:'38 ft · wall to the inside', sport:'42 ft · flat', cheetah:'35 ft · short', scorpion:'42 ft · medium', shark:'45 ft · long', dry:'32 ft · burnt' };
export const FINISH_LABEL = { factory:'Factory', '500':'500 grit', '1000':'1000 grit', '2000':'2000 grit', '3000':'3000 grit', polished:'Polished' };
export const CALL_LABEL = { STRIKE:'Strike', ANGLE:'Low angle', LIGHT:'Light', HIGH:'High', GUTTER:'Gutter' };
export const CALL_TONE = { STRIKE:'good', ANGLE:'warn', LIGHT:'info', HIGH:'bad', GUTTER:'bad' };
export const f1 = v => v == null ? '\u2014' : (+v).toFixed(1);
// Bowler language: whole or half boards ("15", "15½").
export const fmtHalf = v => { const x = Math.round(+v * 2) / 2; return Number.isInteger(x) ? String(x) : Math.floor(x) + '\u00bd'; };
export const fmtBoard = v => (Number.isInteger(+v) ? String(+v) : (+v).toFixed(1));

// Import plans: parse → validate → match → dedupe → PREVIEW. A plan is pure data; nothing is written until the caller
// appends plan.events (commit). Undo = import.voided (events.js). The raw file is never stored: sha256, name and size only.
import { mkEvent } from './events.js';
import { fnv, uuid } from './schema.js';
import { parseCSV, autoMap, mapRows, parseScores, scoreShape, semanticKey, headerFingerprint, parseDate } from './csv.js';
import { matchBall, aliasIndex } from './match.js';
import { balls } from '../data.js';
const RELEASE = ['speed', 'rev', 'axisRotation', 'axisTilt'];
export function findDuplicate(P, { sha256, semKey }) {
  for (const i of Object.values((P && P.imports) || {})) { if (i.undone) continue; if (sha256 && i.sha256 === sha256) return { by: 'file', import: i }; if (semKey && i.semKey === semKey) return { by: 'content', import: i }; }
  return null;
}
// Resolve ball strings: exact alias → auto-filled (editable); fuzzy → must be confirmed (picks[name] = id or '' for none).
export function resolveBalls(names, picks = {}, owned = []) {
  const idx = aliasIndex(balls, owned), out = {}, byId = Object.fromEntries(balls.map(b => [b.id, b]));
  for (const n of names) { const m = matchBall(n, { idx }); if (m.exact && !m.candidates.some(c => c.id === m.exact)) m.candidates.unshift({ id: m.exact, label: [byId[m.exact] && byId[m.exact].brand, byId[m.exact] && byId[m.exact].name].filter(Boolean).join(' '), score: 1 });
    const pick = Object.prototype.hasOwnProperty.call(picks, n) ? picks[n] : undefined;
    out[n] = { input: n, exact: m.exact, candidates: m.candidates, id: pick !== undefined ? (pick || null) : m.exact, confirmed: pick !== undefined || !!m.exact }; }
  return out;
}
export function planCsv({ text, fileName = null, size = null, sha256 = null, mapping = null, speedUnit = null, speedAt = null, picks = {}, P = null, deviceId = null, now = Date.now(), importId = null }) {
  const parsed = parseCSV(text);
  const plan = { kind: 'csv', fileName, size, sha256, errors: [...parsed.errors], issues: [], rows: [], games: [], balls: {}, events: [], counts: {}, delimiter: parsed.delimiter, bom: parsed.bom };
  if (!parsed.rows.length) { plan.errors.push('The file has no rows.'); return plan; }
  const headers = parsed.rows[0], am = autoMap(headers); plan.headers = headers; plan.fingerprint = headerFingerprint(headers);
  plan.mapping = mapping || am.map; plan.speedUnit = speedUnit || am.units.speed || 'mph'; plan.speedAt = speedAt;
  const fields = new Set(Object.values(plan.mapping));
  plan.mode = RELEASE.some(f => fields.has(f)) ? 'release' : 'scores';
  importId = importId || 'imp-' + (sha256 ? sha256.slice(0, 16) : fnv(text)) + '-' + uuid().slice(0, 8);
  plan.importId = importId;
  const base = { deviceId, ts: now, importId };
  const ballNames = new Set();
  if (plan.mode === 'release') {
    const m = mapRows(parsed.rows.slice(1), plan.mapping, { speedUnit: plan.speedUnit, speedAt });
    plan.rows = m.rows; plan.issues = m.issues; m.rows.forEach(r => r.ball && ballNames.add(r.ball));
    plan.balls = resolveBalls([...ballNames], picks, Object.values((P && P.owned) || {}));
    plan.semKey = semanticKey(m.rows.filter(r => r.ok));
    const ok = m.rows.filter(r => r.ok);
    plan.events = ok.map((r, i) => mkEvent('releaseMeasurement.created', importId + '#' + i, { date: r.date || null, ballId: r.ball ? (plan.balls[r.ball].id || null) : null, ballName: r.ball || null,
      speed: r.speed || null, rev: r.rev != null ? { v: r.rev, unit: 'rpm' } : null, axisRotation: r.axisRotation != null ? { v: r.axisRotation, unit: 'deg' } : null, axisTilt: r.axisTilt != null ? { v: r.axisTilt, unit: 'deg' } : null,
      n: 1, source: 'csv', accepted: false }, Object.assign({ seq: i + 2, prov: { kind: 'user', method: 'csv-import', importId } }, base)));
    plan.counts = { rows: m.rows.length, accepted: ok.length, rejected: m.rows.length - ok.length };
  } else {
    const sc = parseScores(text); plan.shape = sc.shape; plan.errors.push(...sc.errors); plan.games = sc.games; sc.games.forEach(g => g.ball && ballNames.add(g.ball));
    plan.balls = resolveBalls([...ballNames], picks, Object.values((P && P.owned) || {}));
    plan.semKey = fnv(sc.games.map(g => [g.date || '', g.game || '', g.score, g.ball || '', (g.throws || []).map(t => t.down).join('')].join('|')).sort().join('\n'));
    const sessions = new Map(); let seq = 2;
    const sid = d => { const k = parseDate(d) || 'undated'; if (!sessions.has(k)) { const id = importId + '-s-' + k; sessions.set(k, id); plan.events.push(mkEvent('session.created', id, { date: k === 'undated' ? null : k, kind: 'import', label: fileName || 'CSV import' }, Object.assign({ seq: seq++, prov: { kind: 'user', method: 'csv-import', importId } }, base))); } return sessions.get(k); };
    sc.games.forEach((g, gi) => {
      const sessionId = sid(g.date), ballId = g.ball ? (plan.balls[g.ball].id || null) : null, gameNo = Number.isInteger(g.game) ? g.game : gi + 1;
      if (g.throws) g.throws.forEach(t => plan.events.push(mkEvent('shot.logged', sessionId, { sessionId, game: gameNo, frame: t.frame, roll: t.roll, down: t.down, ballId, source: 'csv' }, Object.assign({ seq: seq++, prov: { kind: 'user', method: 'csv-import', importId } }, base))));
      else plan.events.push(mkEvent('game.logged', sessionId, { sessionId, game: gameNo, score: g.score, ballId, date: parseDate(g.date) }, Object.assign({ seq: seq++, prov: { kind: 'user', method: 'csv-import', importId } }, base)));
    });
    plan.counts = { games: sc.games.length, rejected: sc.errors.length, sessions: sessions.size };
  }
  plan.unconfirmed = Object.values(plan.balls).filter(b => !b.confirmed).map(b => b.input);
  plan.needsSpeedAt = plan.mode === 'release' && fields.has('speed') && !speedAt;
  plan.dup = findDuplicate(P, { sha256, semKey: plan.semKey });
  const label = `${fileName || 'CSV'} · ${plan.mode === 'release' ? plan.counts.accepted + ' release rows' : plan.counts.games + ' games'}`;
  plan.events.unshift(mkEvent('import.created', importId, { kind: 'csv', label, fileName, size, sha256, semKey: plan.semKey, mode: plan.mode, shape: plan.shape || null, fingerprint: plan.fingerprint, counts: plan.counts }, Object.assign({ seq: 1, prov: { kind: 'user', method: 'csv-import', importId } }, base)));
  plan.canCommit = !plan.dup && !plan.needsSpeedAt && !plan.unconfirmed.length && plan.events.length > 1;
  return plan;
}

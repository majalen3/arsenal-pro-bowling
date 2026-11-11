// Live spot-check of the maker lookup (t123u). Not part of CI (it hits the real API and maker sites, which ask for a 10 s pace).
//   node tools/lookup_spotcheck.mjs [API_BASE]
// Each case says what a healthy answer looks like; exit 1 if any case comes back as a dead end (not-found without a next step).
const API = process.argv[2] || 'https://arsenal-pro-api.onrender.com';
const CASES = [['Storm', 'Phaze II'], ['900 Global', 'Zen 25'], ['900 Global', 'Sublime'], ['Roto Grip', 'Hustle Ink'], ['Hammer', 'Black Widow 3.0'], ['Motiv', 'Venom Shock'], ['Brunswick', 'Prism']];
let bad = 0;
for (const [brand, name] of CASES) {
  const r = await fetch(`${API}/api/spec-lookup?` + new URLSearchParams({ brand, name })).then(x => x.json()).catch(e => ({ status: 'error', why: e.message }));
  const next = r.status === 'found' || r.status === 'candidates' || r.source?.url || r.searchUrl;
  if (!next) bad++;
  console.log(`${next ? 'ok  ' : 'DEAD'} ${brand} ${name}: ${r.status}${r.why ? ' (' + r.why + ')' : ''}${r.source?.url ? ' ' + r.source.url : ''}${r.candidates ? ' ' + r.candidates.length + ' candidates' : ''}${r.searchUrl ? ' search ' + r.searchUrl : ''}`);
}
process.exit(bad ? 1 : 0);

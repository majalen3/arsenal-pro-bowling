"""Writes <out>/results.json and the storyboard report <out>/index.html (self-contained HTML + JPEG step shots)."""
import html, json, os

E = lambda s: html.escape(str(s if s is not None else ''))
COL = {'pass': '#1f8a4c', 'fail': '#c62828', 'known': '#b26a00', 'skip': '#777', 'new': '#1565c0', 'updated': '#1565c0'}


def probes(run):
    """Flow-quality probe failures; each can be listed in known_issues.json as probe/<screen>/<kind>."""
    out, seen = [], set()
    for r in run.screens:
        for kind, bad, detail in (('axe', r.get('axe'), r.get('axe')), ('dead-end', r.get('deadEnd'), 'no tab bar and no Back'),
                                  ('targets', r.get('small'), r.get('small')), ('truncation', r.get('trunc'), r.get('trunc')), ('hscroll', r.get('hscroll'), r.get('hscroll'))):
            key = f"probe/{r['screen']}/{kind}"
            if bad and key not in seen:
                seen.add(key); out.append(dict(key=key, journey=r['journey'], detail=detail if isinstance(detail, list) else [detail], known=run.known.get(key)))
    for jr in run.results:
        # ERR_INTERNET_DISCONNECTED is the harness going offline on purpose (J11), not an app error
        errs = sorted({c for s in jr['steps'] for c in s['console'] if 'ERR_INTERNET_DISCONNECTED' not in c}); key = f"probe/{jr['id']}/console"
        if errs: out.append(dict(key=key, journey=jr['id'], detail=errs[:8], known=run.known.get(key)))
        fails = sorted({c for s in jr['steps'] for c in s['failed']}); key = f"probe/{jr['id']}/requests"
        if fails: out.append(dict(key=key, journey=jr['id'], detail=fails[:8], known=run.known.get(key)))
    return out


def write(run):
    P = probes(run)
    mrel = os.path.relpath(run.media, run.out).replace(os.sep, '/')   # videos/traces live outside the report folder (kept out of git)
    st = [s for j in run.results for s in j['steps']]
    S = dict(base=run.base, started=run.started, live=run.live, journeys=len(run.results),
             passed=sum(s['status'] == 'pass' for s in st), failed=sum(s['status'] == 'fail' for s in st),
             known=sum(s['status'] == 'known' for s in st), skipped=sum(s['status'] == 'skip' for s in st),
             probe_fail=sum(1 for p in P if not p['known']), probe_known=sum(1 for p in P if p['known']),
             visual_fail=sum(v['status'] == 'fail' for v in run.visual),
             fixed=[f"{j['id']}/{s['name']}" for j in run.results for s in j['steps'] if s.get('fixed')])
    S['failed_total'] = S['failed'] + S['probe_fail']
    json.dump(dict(summary=S, journeys=run.results, screens=run.screens, probes=P, visual=run.visual), open(os.path.join(run.out, 'results.json'), 'w'), indent=1)
    h = [f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arsenal Pro · journey QA report</title><style>
body{{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f5f6f8;color:#1b1f24}}
header{{background:#14213d;color:#fff;padding:18px 22px}} header h1{{margin:0 0 4px;font-size:20px}} main{{padding:16px 22px;max-width:1500px}}
.kpis{{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}} .kpi{{background:#fff;border-radius:10px;padding:10px 14px;min-width:110px;box-shadow:0 1px 2px #0002}}
.kpi b{{display:block;font-size:22px}} section{{background:#fff;border-radius:12px;padding:14px 16px;margin:14px 0;box-shadow:0 1px 2px #0002}}
h2{{font-size:17px;margin:0 0 6px}} .strip{{display:flex;gap:10px;overflow-x:auto;padding:6px 0 10px}}
.card{{flex:0 0 190px;border:3px solid #ccc;border-radius:10px;overflow:hidden;background:#fafafa}} .card img{{width:100%;display:block;aspect-ratio:360/780;object-fit:cover;object-position:top}}
.card .t{{padding:6px 8px;font-size:12px}} .card .t b{{display:block;font-size:12.5px;margin-bottom:2px}} .badge{{display:inline-block;color:#fff;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:600}}
.x{{color:#c62828}} .ok{{color:#1f8a4c}} table{{border-collapse:collapse;width:100%;font-size:12.5px}} td,th{{border-bottom:1px solid #e3e5e8;padding:5px 6px;text-align:left;vertical-align:top}}
th{{background:#f0f2f5;position:sticky;top:0}} .muted{{color:#666}} details summary{{cursor:pointer;font-weight:600}} code{{font-size:12px}} .vis img{{width:120px;border:1px solid #ccc}}
</style></head><body><header><h1>Arsenal Pro · whole-night journey QA</h1>
<div>{E(S['base'])} · {E(S['started'])} · {'LIVE site' if S['live'] else 'local build'} · the production API is never written to (route mock)</div></header><main>
<div class="kpis"><div class="kpi"><b>{S['journeys']}</b>journeys</div><div class="kpi"><b class="ok">{S['passed']}</b>steps passed</div>
<div class="kpi"><b class="x">{S['failed']}</b>steps failed (new)</div><div class="kpi"><b style="color:#b26a00">{S['known']}</b>known app bugs</div>
<div class="kpi"><b>{S['skipped']}</b>skipped</div><div class="kpi"><b class="x">{S['probe_fail']}</b>flow probes failed</div><div class="kpi"><b class="x">{S['visual_fail']}</b>visual diffs</div></div>
<p class="muted">Times are Keystroke-Level-Model estimates (first tap 2.65 s, later taps 1.3 s, scroll 1 s, char 0.28 s), not real users. "Known" = fails because of an open finding listed in tests/journeys/known_issues.json.</p>"""]
    # storyboards
    for jr in run.results:
        h.append(f"<section id='{E(jr['id'])}'><h2>{E(jr['id'])} · {E(jr['title'])}</h2><div class='muted'>persona <b>{E(jr['persona'])}</b> · "
                 f"{jr['passed']} pass · {jr['failed']} fail · {jr['known']} known · {jr['skipped']} skip · {jr['taps']} taps · ≈{jr['klm_s']} s est. · {jr['seconds']} s wall"
                 + (f" · <a href='{E(mrel)}/{E(jr['video'])}'>video</a>" if jr.get('video') else '') + (f" · trace <code>{E(jr['trace'])}</code>" if jr.get('trace') else '')
                 + (f" · <span class='x'>{E(jr['aborted'])}</span>" if jr['aborted'] else '') + "</div><div class='strip'>")
        for i, s in enumerate(jr['steps'], 1):
            c = COL.get(s['status'], '#999'); img = f"<img loading='lazy' src='{E(s['shot'])}' alt=''>" if s.get('shot') else "<div style='height:120px'></div>"
            tgt = (f" / ≤{s['target_taps']}" if s['target_taps'] is not None else '')
            h.append(f"<div class='card' style='border-color:{c}'>{img}<div class='t'><span class='badge' style='background:{c}'>{i} · {E(s['status'])}</span>"
                     f"<b>{E(s['name'])}</b><span class='muted'>{s['taps']} taps{tgt} · ≈{s['klm_s']} s · #{E(s['url'])}</span>"
                     + (f"<div class='muted'>carries: {E(s['carry'])}</div>" if s.get('carry') else '')
                     + ''.join(f"<div class='x'>✗ {E(c2[1])}</div>" for c2 in s['checks'] if not c2[0]) + (f"<div class='x'>{E(s['error'])}</div>" if s['error'] else '')
                     + (f"<div style='color:#b26a00'>known: {E(s['known'])}</div>" if s.get('known') else '') + "</div></div>")
        h.append("</div>")
        if jr.get('state'):
            h.append(f"<details><summary>State carried between screens</summary><pre>{E(json.dumps(jr['state'], indent=1)[:2500])}</pre></details>")
        h.append("</section>")
    # tasks
    h.append("<section><h2>Tap count and time per task</h2><table><tr><th>Journey</th><th>Step</th><th>Task</th><th>Taps</th><th>Target</th><th>Est. s</th><th>Target s</th><th>Result</th></tr>")
    for jr in run.results:
        for s in jr['steps']:
            if s['target_taps'] is None and s['target_s'] is None: continue
            ok = s['status'] == 'pass'
            h.append(f"<tr><td>{E(jr['id'])}</td><td>{E(s['name'])}</td><td>{E(s['task'])}</td><td>{s['taps']}</td><td>{E(s['target_taps'])}</td><td>{s['klm_s']}</td><td>{E(s['target_s'])}</td><td class='{'ok' if ok else 'x'}'>{E(s['status'])}</td></tr>")
    h.append("</table></section>")
    # screens
    h.append("<section><h2>Flow quality per screen</h2><p class='muted'>Score 0-10 = usability (heading, action above fold, text ≥12 px, targets ≥44 px, no truncation) + applicability (a next step in words, ≤12 numbers above the fold, numbers carry a source, not a dead end, scoring view lean). An automated proxy for the owner's rule: every number readable at a glance and changes an action.</p>"
             "<table><tr><th>Screen</th><th>Journey</th><th>Score</th><th>Numbers above fold</th><th>Axe serious</th><th>Targets &lt;44px</th><th>Truncated at 360</th><th>Back / tabs</th><th>Missing</th></tr>")
    for r in sorted(run.screens, key=lambda r: r.get('score', 0)):
        h.append(f"<tr><td><b>{E(r['screen'])}</b><br><span class='muted'>{E(r.get('hash'))}</span></td><td>{E(r['journey'])}</td><td><b>{E(r.get('score'))}</b>/10</td><td>{E(r.get('numbersAboveFold'))}</td>"
                 f"<td class='{'x' if r.get('axe') else 'ok'}'>{E('; '.join(r.get('axe') or []) or '0')}</td><td class='{'x' if r.get('small') else 'ok'}'>{len(r.get('small') or [])} {E('; '.join((r.get('small') or [])[:4]))}</td>"
                 f"<td class='{'x' if r.get('trunc') else 'ok'}'>{len(r.get('trunc') or [])} {E('; '.join((r.get('trunc') or [])[:3]))}</td><td>{E(r.get('back'))} / {E(r.get('tabs'))}</td><td>{E(', '.join(r.get('why') or []))}{E(r.get('error', ''))}</td></tr>")
    h.append("</table></section>")
    # probes
    h.append("<section><h2>Flow probe failures</h2><table><tr><th>Probe</th><th>Journey</th><th>Detail</th><th>Status</th></tr>")
    for p in P:
        h.append(f"<tr><td><code>{E(p['key'])}</code></td><td>{E(p['journey'])}</td><td>{E('; '.join(map(str, p['detail']))[:500])}</td><td>{('known: ' + E(p['known'])) if p['known'] else '<b class=x>new</b>'}</td></tr>")
    h.append("</table></section>")
    # visual
    if run.visual:
        h.append("<section class='vis'><h2>Visual regression (360x780, 414x896)</h2><table><tr><th>Screen</th><th>Viewport</th><th>Diff ratio</th><th>Status</th><th>Now</th><th>Baseline</th><th>Diff</th></tr>")
        for v in run.visual:
            im = lambda k: f"<img loading='lazy' src='{E(v[k])}'>" if v.get(k) else ''
            h.append(f"<tr><td>{E(v['screen'])}</td><td>{E(v['vp'])}</td><td>{E(v.get('ratio'))}</td><td style='color:{COL.get(v['status'], '#000')}'>{E(v['status'])} {E(v.get('note', ''))}</td><td>{im('shot')}</td><td>{im('base')}</td><td>{im('diff')}</td></tr>")
        h.append("</table></section>")
    h.append("</main></body></html>")
    open(os.path.join(run.out, 'index.html'), 'w').write('\n'.join(h))
    return S

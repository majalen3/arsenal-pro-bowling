"""Persona fixtures and seeded data. Everything is written through the app's own event hub (js/hub.js), the same path
the UI uses, with ids prefixed 'qa-' so a seeded record is recognisable in a backup."""
import datetime

# Profiles. 'hand' is always set explicitly (owner, 2026-10-24: hand is chosen, never guessed).
PERSONAS = {
    'righty':   dict(label='Righty league bowler (the owner)', hand='right', style='tweener', speed=15.0, rev=300, pap='5 1/8 x 1/2 up', starter=True, avg=180),
    'lefty':    dict(label='Lefty stroker', hand='left', style='stroker', speed=14.5, rev=250, pap='', starter=True, avg=170),
    'beginner': dict(label='Beginner, two balls, help on', hand='right', style='stroker', speed=13.5, rev=200, pap='', starter=False, avg=120, help=True),
    'league4':  dict(label='League team of 4 (captain scores for the team)', hand='right', style='tweener', speed=15.5, rev=320, pap='', starter=True, avg=180,
                     team=[('Ann', 150, 'present'), ('Bo', 160, 'absent'), ('Cal', 170, 'total')]),
    'coach':    dict(label='Coach reviewing a bowler from their backup', hand='right', style='tweener', speed=16.0, rev=350, pap='', starter=False, avg=200),
}

NIGHT0 = datetime.datetime(2026, 10, 22, 18, 30)   # fixed clock for seeded / visual runs (a Thursday league night)


async def boot(j, persona, onboarded=True, clock=None):
    """Fresh device for a persona: wipe storage, optionally write the profile directly (journeys that are not about onboarding)."""
    P = PERSONAS[persona]; p = j.page
    if clock:
        await p.clock.install(time=clock)
    await j.wipe()
    if onboarded:
        prof = dict(hand=P['hand'], style=P['style'], speed=P['speed'], rev=P['rev'], pap=P['pap'], tilt='', owned=[], entered={'hand': True, 'style': True, 'speed': True, 'rev': True})
        prefs = dict(onboarded=True, help=bool(P.get('help')))
        await p.evaluate("([pr, pf]) => { localStorage.setItem('ap_profile', JSON.stringify(pr)); localStorage.setItem('ap_prefs', JSON.stringify(pf)); localStorage.setItem('ap_device', 'd-qa-' + Math.random().toString(36).slice(2, 10)); }", [prof, prefs])
    await p.goto(j.run.base + '?qa=' + persona + '#/tonight'); await j.settle(400)
    await p.wait_for_function("() => window.__apData", timeout=15000)
    if onboarded and P['starter']:
        await p.evaluate("async () => { const m = await import('./js/hub.js'); await m.ready(); if (!Object.keys(m.proj().owned || {}).length) await m.loadStarter(); }")
        await p.reload(); await j.settle(400)


def game_shots(sid, game, frames, ball=None, who=None):
    """frames: list of tokens per frame. 'X' strike; (first_down, leave_list, second_down) for open/spare;
    10th frame may add a 3rd item. Returns shot.logged payloads."""
    out = []
    for f, fr in enumerate(frames, 1):
        rolls = []
        if fr == 'X':
            rolls = [(10, [])]
        else:
            d1, leave, d2 = fr[0], fr[1], fr[2]
            rolls = [(d1, leave), (d2, [p for p in leave][d2:] if d2 < len(leave) else [])]
        if f == 10 and isinstance(fr, tuple) and len(fr) > 3:
            rolls.append((fr[3], []))
        if f == 10 and fr == 'X':
            rolls += [(10, []), (10, [])]
        for r, (down, leave) in enumerate(rolls, 1):
            d = dict(sessionId=sid, game=game, frame=f, roll=r, down=down, leave=leave, foul=False, split=False, ballId=ball, catalogId=None)
            if who: d['who'] = who
            out.append(d)
    return out


# A 10-pin-heavy right-hander's night: three flat 10s (9 count, 10 pin standing, pin carries flat), two converted.
FLAT10_GAME = ['X', (9, [10], 1), (9, [10], 0), 'X', (8, [7, 10], 2), (9, [10], 1), 'X', (7, [2, 4, 5], 3), 'X', ('X')]
CLEAN_GAME = ['X', 'X', (9, [7], 1), 'X', (8, [2, 8], 2), 'X', (9, [6], 1), 'X', 'X', 'X']


async def seed_history(j, nights=2, center='QA Sunset Lanes', lanes='21-22', pattern='2026 PBA Badger', note='Moved 2 left by game 3', flat10=True):
    """Past nights at one center (for center memory, Insights, Bowler Card and leave patterns)."""
    days = [(NIGHT0 - datetime.timedelta(days=7 * (i + 1))).strftime('%Y-%m-%d') for i in range(nights)][::-1]
    payload = dict(center=center, lanes=lanes, pattern=pattern, note=note, nights=[])
    for i, d in enumerate(days):
        sid = f'qa-night-{i + 1}'
        games = [game_shots(sid, 1, FLAT10_GAME if flat10 else CLEAN_GAME, ball='own-rattler-big-bite'),
                 game_shots(sid, 2, CLEAN_GAME, ball='own-rattler-big-bite')]
        payload['nights'].append(dict(id=sid, date=d, shots=[s for g in games for s in g]))
    return await j.page.evaluate("""async (P) => { const m = await import('./js/hub.js'); await m.ready();
      await m.add('center.created', 'center-qa-sunset-lanes', { fields: { name: P.center, surface: 'synthetic', note: P.note } });
      let n = 0;
      for (const N of P.nights) {
        await m.add('session.created', N.id, { kind: 'tonight', date: N.date, centerId: 'center-qa-sunset-lanes', patternSlug: 'qa', patternName: P.pattern, ft: 41, ml: null, ratio: null,
                                           surface: 'synthetic', lanePair: P.lanes, ended: true, event: 'league' });
        for (const s of N.shots) await m.add('shot.logged', N.id + '-s' + (n++), s);
      }
      return Object.keys(m.proj().sessions).length; }""", payload)

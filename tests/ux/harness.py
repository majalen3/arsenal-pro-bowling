"""Task-time harness: counts taps/scrolls/typing for a scripted user and estimates time with a
Keystroke-Level-Model (Card, Moran & Newell): tap = M(1.35s mental) on first act of a step + P(1.1s point) + 0.2s,
scroll/fling = 1.0s, typed char = 0.28s, plus measured UI wall-clock. These are model estimates, not real users."""
import time
class Job:
    def __init__(s, pg, name, vh):
        s.pg, s.name, s.vh = pg, name, vh; s.taps=0; s.scrolls=0; s.chars=0; s.drags=0; s.t0=time.time(); s.notes=[]
    def _vis(s, loc):
        b = loc.bounding_box()
        return b and b['y'] >= 0 and b['y'] + b['height'] <= s.vh
    def tap(s, sel, scroll_ok=True):
        loc = s.pg.locator(sel).first
        if not s._vis(loc):
            s.scrolls += 1; loc.scroll_into_view_if_needed()
        loc.click(); s.taps += 1; s.pg.wait_for_timeout(120)
    def type(s, sel, text):
        s.tap(sel); s.pg.locator(sel).first.fill(text); s.chars += len(text)
    def see(s, sel):
        loc = s.pg.locator(sel).first
        loc.wait_for(state='visible', timeout=5000)
        if not s._vis(loc): s.scrolls += 1; loc.scroll_into_view_if_needed()
    def drag(s, sel):  # a precise slider/lane drag: one tap plus 1.5 s fine-positioning (Fitts steering)
        s.tap(sel); s.drags += 1
    def result(s):
        wall = time.time() - s.t0
        klm = s.taps * (1.35 + 1.1 + 0.2) + s.scrolls * 1.0 + s.chars * 0.28 + s.drags * 1.5
        return dict(job=s.name, taps=s.taps, scrolls=s.scrolls, chars=s.chars, drags=s.drags, klm_s=round(klm, 1), wall_s=round(wall, 1), notes=s.notes)

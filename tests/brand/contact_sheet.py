"""One PNG that compares the looks: icon + Bag, Lane, Score, Arsenal in dark and light, and the Me > Look picker.
  python tests/brand/contact_sheet.py SHOTS_DIR OUT.png      (SHOTS_DIR from tests/brand/shots.py --brands pine,maple,night)
Icons: A is the built mark (v79); B and C are the same mark recolored as concepts (not shipped)."""
import sys, os, io, base64, asyncio
from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright
d, out = sys.argv[1], sys.argv[2]
BR = [('pine', 'A. Pine & Brass (default)'), ('maple', 'B. Maple & Copper'), ('night', 'C. Night Pocket')]
COLS = [('dark', 'bag'), ('dark', 'lane'), ('dark', 'score'), ('dark', 'arsenal'), ('light', 'bag'), ('light', 'lane'), ('light', 'score'), ('light', 'arsenal'), ('dark', 'me')]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SVG = open(os.path.join(ROOT, 'tools/brand/mark.svg')).read()
CONCEPT = {'pine': {}, 'maple': {'#17694A': '#4A3019', '#0B3A28': '#1E1510', '#F6DF8E': '#FFD2A0', '#DAAF37': '#F28C45', '#8E6B16': '#A8480F'},
           'night': {'#17694A': '#1E4FA0', '#0B3A28': '#0A1B33', '#F6DF8E': '#BFE0FF', '#DAAF37': '#5AA9FF', '#8E6B16': '#1F5FB5'}}
async def icons():
    res = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); pg = await b.new_page(viewport={'width': 300, 'height': 300})
        for k, m in CONCEPT.items():
            s = SVG
            for a, c in m.items(): s = s.replace(a, c)
            await pg.set_content(f'<body style="margin:0"><img src="data:image/svg+xml;base64,{base64.b64encode(s.encode()).decode()}" width=300 height=300 style="display:block;border-radius:64px"></body>')
            res[k] = Image.open(io.BytesIO(await pg.screenshot())).convert('RGB')
        await b.close()
    return res
IC = asyncio.run(icons())
W, H = 195, 422; GAP = 8; LAB = 30; ICON = 170
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15); F2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
top = 44
sheet = Image.new('RGB', (GAP + ICON + GAP + len(COLS) * (W + GAP), top + len(BR) * (H + LAB + GAP)), '#2b2b2b'); g = ImageDraw.Draw(sheet)
g.text((GAP, 8), 'Arsenal Pro looks at 390x844, half size.   Columns: dark Bag, Lane, Score, Arsenal  |  light Bag, Lane, Score, Arsenal  |  Me > Look picker.', fill='#ddd', font=F2)
g.text((GAP, 26), 'Icon A is the built v79 mark. B and C are the same mark recolored as concepts (not shipped).', fill='#aaa', font=F2)
for r, (b, label) in enumerate(BR):
    y = top + r * (H + LAB + GAP); g.text((GAP, y + LAB + ICON + 8), label.replace(' (default)', '\n(default)').replace('. ', '.\n'), fill='#fff', font=F)
    sheet.paste(IC[b].resize((ICON, ICON)), (GAP, y + LAB))
    for c, (mode, scr) in enumerate(COLS):
        x = GAP + ICON + GAP + c * (W + GAP); im = Image.open(os.path.join(d, f'{b}_{mode}_{scr}.png')).convert('RGB').resize((W, H), Image.LANCZOS)
        sheet.paste(im, (x, y + LAB)); g.text((x, y + 8), f'{mode} {scr}' if scr != 'me' else 'Me: Look', fill='#999', font=F2)
sheet.save(out, optimize=True); print(out, sheet.size)

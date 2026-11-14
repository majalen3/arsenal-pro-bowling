"""Render the app icons and the iOS launch image from tools/brand/mark.svg (paths only: no fonts, nothing fetched). Local, free, reproducible:
   python tools/brand/make_icons.py          (needs playwright + chromium)
Writes icon.svg, icons/icon-192.png, icon-512.png, icon-maskable-512.png (same art: the mark is already inside the 80% safe zone),
icons/apple-touch-icon.png (180), icons/splash-1170x2532.png (launch image for an iPhone 390x844 @3x; linked, not precached)."""
import asyncio, os, shutil, base64
from PIL import Image
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); SVG = open(os.path.join(ROOT, 'tools/brand/mark.svg')).read()
URI = 'data:image/svg+xml;base64,' + base64.b64encode(SVG.encode()).decode()
async def shot(b, html, w, h, out):
    pg = await b.new_page(viewport={'width': w, 'height': h}); await pg.set_content(html); await pg.wait_for_timeout(150)
    path = os.path.join(ROOT, out); await pg.screenshot(path=path); await pg.close()
    Image.open(path).convert('RGB').quantize(128, dither=Image.FLOYDSTEINBERG).save(path, optimize=True)   # gradients dither well; keeps the precache small
async def main():
    shutil.copy(os.path.join(ROOT, 'tools/brand/mark.svg'), os.path.join(ROOT, 'icon.svg'))
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for size, out in ((192, 'icons/icon-192.png'), (512, 'icons/icon-512.png'), (512, 'icons/icon-maskable-512.png'), (180, 'icons/apple-touch-icon.png')):
            await shot(b, f'<body style="margin:0"><img src="{URI}" width={size} height={size} style="display:block"></body>', size, size, out)
        # launch image: the dark first-paint color of the default theme (#0B0F0D) with the mark in its rounded tile and the name under it
        await shot(b, f'''<body style="margin:0;width:390px;height:844px;background:#0B0F0D;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;zoom:3">
          <img src="{URI}" width=132 height=132 style="border-radius:30px;box-shadow:0 8px 28px rgba(0,0,0,.5)">
          <div style="font:800 26px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#EEF2EF;letter-spacing:-.01em">Arsenal Pro</div>
          <div style="font:600 13px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#A9B5AE;letter-spacing:.04em">Free. Works offline.</div></body>''', 1170, 2532, 'icons/splash-1170x2532.png')
        await b.close()
asyncio.run(main())

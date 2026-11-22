// v83: apply the saved look (brand), mode and text size before the first paint, so someone who picked Maple, Night or Light no
// longer sees one frame of the default look. A classic same-origin script (CSP script-src 'self'; no inline script), loaded right
// after css/app.css so the colors are known, precached by sw.js. Mirrors applyTheme (js/main.js) and applyTextSize (js/cc/wake.js),
// which still run on start; if anything here fails the app simply behaves as before (one-frame flash). Keep the lists in step:
// tests/data/theme_boot.test.mjs checks BRANDS, DEFAULT_BRAND and TEXT_SIZES against those modules.
(function () {
  'use strict';
  var BRANDS = ['pine', 'maple', 'night'], DEFAULT_BRAND = 'pine', TEXT = ['normal', 'large', 'xl'];
  try {
    var p = JSON.parse(localStorage.getItem('ap_prefs'));
    if (!p || typeof p !== 'object' || Array.isArray(p)) p = {};
    var t = p.theme || 'dark', el = document.documentElement;
    var dark = t === 'system' ? !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) : t !== 'light';
    el.setAttribute('data-theme', dark ? 'dark' : 'light');
    el.setAttribute('data-brand', BRANDS.indexOf(p.brand) >= 0 ? p.brand : DEFAULT_BRAND);
    el.setAttribute('data-text', TEXT.indexOf(p.textSize) >= 0 ? p.textSize : 'normal');
    var m = document.querySelector('meta[name=theme-color]'), bg = getComputedStyle(el).getPropertyValue('--bg').trim();
    if (m && bg) m.setAttribute('content', bg);
  } catch (e) { /* storage blocked (private mode) or bad JSON: main.js applies the defaults as before */ }
})();

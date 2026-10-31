"""Objective clutter metrics on a screenshot (numpy only, no app code).
subband_entropy: after Rosenholtz, Li & Nakano (2007) "Measuring visual clutter", J. Vision 7(2):17 — CIELab, a multiscale
  oriented decomposition, Shannon entropy of each subband's coefficient histogram, averaged per channel and combined with
  weights L 0.84, a 0.08, b 0.08. Their reference code uses a steerable pyramid (3 scales x 4 orientations); this port uses
  a 3-level Haar wavelet (3 orientations per level), so absolute values differ from the paper — compare screens to each other only.
edge_density: share of pixels whose Sobel luminance gradient exceeds 0.08 (on a 0..1 scale) — the edge-density clutter proxy
  of Mack & Oliva (2004) / Rosenholtz et al. (2007)."""
import numpy as np
from PIL import Image

def _lab(img):
    a = np.asarray(img.convert('RGB'), dtype=np.float64) / 255.0
    a = np.where(a > 0.04045, ((a + 0.055) / 1.055) ** 2.4, a / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = a @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    L = 116 * f[..., 1] - 16; A = 500 * (f[..., 0] - f[..., 1]); B = 200 * (f[..., 1] - f[..., 2])
    return L, A, B

def _haar(x):
    h, w = x.shape[0] // 2 * 2, x.shape[1] // 2 * 2; x = x[:h, :w]
    a, b, c, d = x[0::2, 0::2], x[0::2, 1::2], x[1::2, 0::2], x[1::2, 1::2]
    return (a + b + c + d) / 2, [(a - b + c - d) / 2, (a + b - c - d) / 2, (a - b - c + d) / 2]

def _entropy(v, bins):
    hst, _ = np.histogram(v.ravel(), bins=bins); p = hst[hst > 0] / hst.sum()
    return float(-(p * np.log2(p)).sum())

def _chan_se(x, levels=3):
    ents = []; ll = x
    for _ in range(levels):
        ll, bands = _haar(ll)
        for bd in bands:
            ents.append(_entropy(bd, int(np.ceil(np.sqrt(bd.size)))))
    return float(np.mean(ents))

def subband_entropy(img):
    L, A, B = _lab(img)
    return round(0.84 * _chan_se(L) + 0.08 * _chan_se(A) + 0.08 * _chan_se(B), 3)

def edge_density(img, thr=0.08):
    g = np.asarray(img.convert('L'), dtype=np.float64) / 255.0
    gx = np.zeros_like(g); gy = np.zeros_like(g)
    gx[1:-1, 1:-1] = (g[:-2, 2:] + 2 * g[1:-1, 2:] + g[2:, 2:] - g[:-2, :-2] - 2 * g[1:-1, :-2] - g[2:, :-2]) / 8
    gy[1:-1, 1:-1] = (g[2:, :-2] + 2 * g[2:, 1:-1] + g[2:, 2:] - g[:-2, :-2] - 2 * g[:-2, 1:-1] - g[:-2, 2:]) / 8
    return round(float((np.hypot(gx, gy) > thr).mean()), 4)

def metrics(path):
    im = Image.open(path)
    return dict(subband_entropy=subband_entropy(im), edge_density=edge_density(im))

if __name__ == '__main__':
    import sys
    for p in sys.argv[1:]: print(p, metrics(p))

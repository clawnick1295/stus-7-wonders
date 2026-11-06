#!/usr/bin/env python3
"""Join the hero balloon's broken canopy ribs.

The approved drawing's outer silhouette is one smooth curve, but the painted
gore lines below a near-horizontal cut (around y=161 in the 569x761 asset)
are squeezed toward the center: left ribs step right, right ribs step left.
The crown and basket repairs never touched that interior. This expands the
interior of the lower envelope back onto the upper ribs and leaves the
silhouette, ropes, Stu, and basket where they are.

`assets/balloon.webp` is the unrepaired source this script reads. The site
serves `assets/balloon.png`.
"""
from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "assets", "balloon.webp")
DST = os.path.join(ROOT, "assets", "balloon.png")

# Last row whose ribs still match the crown. The next row is the step.
SEAM = 160
# Solid envelope ends and the rope gap begins just below this.
ENVELOPE_END = 396
# Measured squeeze of the lower gores about the center (1 = already aligned).
SCALE = 0.953
# Full correction inside this |u|; identity at the silhouette (|u|=0.5).
PIN0 = 0.40
PIN1 = 0.50
# Rows rebuilt after the shift so the old dark join cannot stay as a stripe.
HEAL_ABOVE = 157
HEAL_BELOW = 167


def silhouette(alpha: np.ndarray, y: int, thr: int = 140):
    xs = np.where(alpha[y] > thr)[0]
    if len(xs) < 10:
        return None
    return int(xs[0]), int(xs[-1])


def remap_row(row: np.ndarray, left: int, right: int, scale: float) -> np.ndarray:
    """Sample `row` so interior features spread out and the edges stay put."""
    out = row.copy()
    width = right - left
    if width < 8:
        return out
    xs = np.arange(left, right + 1, dtype=np.float64)
    u = (xs - left) / width - 0.5
    au = np.abs(u)
    t = np.clip((au - PIN0) / (PIN1 - PIN0), 0.0, 1.0)
    w = 1.0 - t * t * (3.0 - 2.0 * t)
    factor = 1.0 - (1.0 - scale) * w
    x_src = left + (u * factor + 0.5) * width
    x0 = np.floor(x_src).astype(np.int32)
    x1 = np.clip(x0 + 1, 0, row.shape[0] - 1)
    x0 = np.clip(x0, 0, row.shape[0] - 1)
    frac = (x_src - np.floor(x_src))[:, None]
    samp = row[x0] * (1.0 - frac) + row[x1] * frac
    out[left:right + 1] = samp
    return out


def heal_join(img: np.ndarray) -> np.ndarray:
    """Replace the dark stripe where the two canopy pieces were cut."""
    out = img.copy()
    span = HEAL_BELOW - HEAL_ABOVE
    for y in range(HEAL_ABOVE + 1, HEAL_BELOW):
        t = (y - HEAL_ABOVE) / span
        above = img[HEAL_ABOVE]
        below = img[HEAL_BELOW]
        blended = (1.0 - t) * above + t * below
        edges = silhouette(img[:, :, 3], y)
        if edges is None:
            continue
        left, right = edges
        # Keep the outline stroke; only the painted interior was torn.
        a, b = left + 8, right - 8
        if b <= a:
            continue
        out[y, a:b] = blended[a:b]
    return out


def repair(src: np.ndarray, scale: float = SCALE) -> np.ndarray:
    out = src.astype(np.float32).copy()
    alpha = src[:, :, 3]
    for y in range(SEAM + 1, min(ENVELOPE_END, src.shape[0])):
        edges = silhouette(alpha, y)
        if edges is None:
            continue
        out[y] = remap_row(src[y].astype(np.float32), edges[0], edges[1], scale)
    out = heal_join(out)
    return np.clip(np.rint(out), 0, 255).astype(np.uint8)


def highpass(lum: np.ndarray) -> np.ndarray:
    k = 41
    ker = np.ones(k) / k
    hp = np.empty_like(lum)
    for y in range(lum.shape[0]):
        hp[y] = lum[y] - np.convolve(lum[y], ker, mode="same")
    return hp


def rib_xs(hp: np.ndarray, alpha: np.ndarray, y: int):
    edges = silhouette(alpha, y)
    if edges is None:
        return None
    left, right = edges
    targets = (0.143, 0.382, 0.655, 0.880)
    found = []
    for frac in targets:
        pred = left + frac * (right - left)
        xa = int(max(left + 4, pred - 22))
        xb = int(min(right - 4, pred + 22))
        if xb <= xa + 2:
            found.append(None)
            continue
        found.append(xa + int(np.argmin(hp[y, xa:xb])))
    return found


def continuity_error(img: np.ndarray) -> float:
    """Mean absolute pixel miss of the four ribs just below the seam."""
    rgb = img[:, :, :3].astype(np.float32)
    lum = rgb.mean(2)
    hp = highpass(lum)
    alpha = img[:, :, 3]
    above = rib_xs(hp, alpha, SEAM - 2)
    errs = []
    for y in (SEAM + 8, SEAM + 16, SEAM + 28):
        below = rib_xs(hp, alpha, y)
        edges_a = silhouette(alpha, SEAM - 2)
        edges_b = silhouette(alpha, y)
        if not above or not below or not edges_a or not edges_b:
            continue
        wa = edges_a[1] - edges_a[0]
        wb = edges_b[1] - edges_b[0]
        for a, b in zip(above, below):
            if a is None or b is None:
                continue
            frac = (a - edges_a[0]) / wa
            target = edges_b[0] + frac * wb
            errs.append(abs(b - target))
    return float(np.mean(errs)) if errs else 99.0


def seam_step(img: np.ndarray) -> float:
    """Mean vertical jump across the old cut, inside the orange panels."""
    lum = img[:, :, :3].astype(np.float32).mean(2)
    alpha = img[:, :, 3]
    gy = np.abs(np.diff(lum, axis=0))
    y = SEAM
    xs = np.where((alpha[y] > 200) & (alpha[y + 1] > 200) & (lum[y] > 120))[0]
    xs = xs[(xs > 40) & (xs < img.shape[1] - 40)]
    return float(gy[y, xs].mean())


def main() -> None:
    check = "--check" in sys.argv
    if check:
        img = np.array(Image.open(DST).convert("RGBA"))
        err = continuity_error(img)
        step = seam_step(img)
        print(f"rib error {err:.2f}px  seam step {step:.2f}")
        if err > 2.0 or step > 1.0:
            raise SystemExit("balloon.png ribs are not continuous")
        return
    src = np.array(Image.open(SRC).convert("RGBA"))
    before = continuity_error(src)
    img = repair(src, SCALE)
    after = continuity_error(img)
    step = seam_step(img)
    print(f"before {before:.2f}px  scale {SCALE:.3f}  after {after:.2f}px  seam {step:.2f}")
    if after > 2.0 or step > 1.0:
        raise SystemExit("ribs still miss by more than 2px")
    Image.fromarray(img, "RGBA").save(DST, "PNG")
    print("wrote", DST, img.shape[1], img.shape[0])


if __name__ == "__main__":
    main()

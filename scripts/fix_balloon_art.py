#!/usr/bin/env python3
"""Fix Stu's rainbow balloon on the website.

The coloured file is the book balloon. Its canvas sliced the crown stroke and
the bottom of the basket. Line-art worksheets traced that same balloon badly:
the top and basket were cropped, rope weight didn't match Stu, and the panels
did not meet. This rebuilds those pages from the book balloon's measured
shape (ellipse, gore spacing, orange/green/blue bands, basket, Stu).
"""
from __future__ import annotations

import os
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INK = (36, 28, 52)


def repair_color(src_path: str) -> Image.Image:
    src = np.array(Image.open(src_path).convert("RGBA"))
    h, w = src.shape[:2]
    pad_t, pad_b, pad_x = 26, 72, 22
    out = np.zeros((h + pad_t + pad_b, w + 2 * pad_x, 4), np.uint8)
    out[pad_t:pad_t + h, pad_x:pad_x + w] = src
    alpha = src[:, :, 3] > 80

    # Crown: the envelope ellipse kisses y=0, so half of the outline was cut off.
    cx = 280.5 + pad_x
    cy = 152.0 + pad_t
    rx, ry = 277.6, 153.2
    ink = np.array([86, 46, 64], np.float32)
    orange_row = src[14, :, :3].astype(np.float32)
    yy, xx = np.mgrid[0:out.shape[0], 0:out.shape[1]]
    dx = (xx - cx) / rx
    dy = (yy - cy) / ry
    rad = np.sqrt(dx * dx + dy * dy)
    above = yy < pad_t + 4
    empty = out[:, :, 3] < 16
    inside = above & empty & (rad <= 1.0)
    sampled = orange_row[np.clip(xx - pad_x, 0, w - 1)]
    out[inside, :3] = np.clip(sampled[inside], 0, 255).astype(np.uint8)
    out[inside, 3] = 255
    dist = np.abs(rad - 1.0) * ((rx + ry) / 2)
    core = above & (dist <= 2.4)
    out[core, :3] = ink.astype(np.uint8)
    out[core, 3] = 255
    soft = above & (dist > 2.4) & (dist <= 4.2)
    t = ((4.2 - dist[soft]) / 1.8).clip(0, 1)
    base = out[soft, :3].astype(np.float32)
    out[soft, :3] = (base * (1 - t[:, None]) + ink * t[:, None]).astype(np.uint8)
    out[soft, 3] = np.maximum(out[soft, 3], (240 * t).astype(np.uint8))

    # Basket: continue the bowl and round it closed. The source stops mid-bowl.
    def edges(y):
        xs = np.where(alpha[y])[0]
        return int(xs[0]), int(xs[-1])

    y_from = h - 50
    l0, r0 = edges(y_from)
    l1, r1 = edges(h - 1)
    span = (h - 1) - y_from
    # quadratic bend so the sides meet instead of running on forever
    steps = 56
    basket = src[h - 8:h - 2, l1 + 16:r1 - 16, :3].mean(axis=(0, 1))
    side = src[h - 6, l1 + 3, :3].astype(np.float32)
    prev = None
    for i in range(1, steps + 1):
        t = i / steps
        curve = t * t
        l = l1 + (l1 - l0) / span * i * 0.35 + curve * 22
        r = r1 + (r1 - r0) / span * i * 0.35 - curve * 22
        if r - l < 70:
            break
        y = pad_t + h - 1 + i
        if y >= out.shape[0] - 2:
            break
        x0 = int(pad_x + l)
        x1 = int(pad_x + r)
        out[y, x0:x1, :3] = basket
        out[y, x0:x1, 3] = 255
        out[y, x0:x0 + 5, :3] = side
        out[y, x1 - 5:x1, :3] = side
        prev = (y, x0, x1)
    if prev:
        yb, x0, x1 = prev
        mid = (x0 + x1) / 2
        rad_b = (x1 - x0) / 2
        depth = max(10, rad_b * 0.28)
        for y in range(yb + 1, min(out.shape[0] - 1, int(yb + depth))):
            dy = (y - yb) / depth
            half = rad_b * np.sqrt(max(0.0, 1 - dy * dy))
            a0, a1 = int(mid - half), int(mid + half)
            if a1 - a0 < 4:
                break
            out[y, a0:a1, :3] = basket
            out[y, a0:a1, 3] = 255
            out[y, a0:a0 + 4, :3] = side
            out[y, max(a0, a1 - 4):a1, :3] = side
    im = Image.fromarray(out, "RGBA")
    # trim fully empty rows/cols but keep a small margin
    arr = np.array(im)
    ys, xs = np.where(arr[:, :, 3] > 8)
    m = 14
    im = im.crop((
        max(0, xs.min() - m),
        max(0, ys.min() - m),
        min(im.size[0], xs.max() + m),
        min(im.size[1], ys.max() + m),
    ))
    return im


def stu_silhouette() -> Image.Image:
    """Outer contour of the authorized Stu drawing, cap through the chest."""
    stu = Image.open(os.path.join(ROOT, "assets", "stu.webp")).convert("RGBA")
    body = np.array(stu.split()[-1]) > 40
    inv = ~body
    outline = np.zeros_like(body)
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0), (1, 1), (-1, 1), (1, -1), (-1, -1)):
        outline |= body & np.roll(np.roll(inv, dy, 0), dx, 1)
    thick = outline.copy()
    for _ in range(2):
        nxt = thick.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                nxt |= np.roll(np.roll(thick, dy, 0), dx, 1)
        thick = nxt
    crop = thick[:400]
    ys, xs = np.where(crop)
    crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rgba = np.zeros((*crop.shape, 4), np.uint8)
    rgba[crop, :3] = 32
    rgba[crop, 3] = 255
    return Image.fromarray(rgba, "RGBA")


def stu_line() -> Image.Image:
    stu = Image.open(os.path.join(ROOT, "assets", "stu.webp")).convert("RGBA")
    edges = np.array(stu.convert("RGB").filter(ImageFilter.FIND_EDGES).convert("L"))
    alpha = np.array(stu.split()[-1])
    body = alpha > 40
    inv = ~body
    outline = np.zeros_like(body)
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        outline |= body & np.roll(np.roll(inv, dy, 0), dx, 1)
    ink = outline | ((edges > 52) & body)
    h, w = ink.shape
    seen = np.zeros_like(ink)
    keep = np.zeros_like(ink)
    ys, xs = np.where(ink)
    for y, x in zip(ys, xs):
        if seen[y, x]:
            continue
        q = deque([(y, x)])
        seen[y, x] = True
        comp = [(y, x)]
        while q:
            cy, cx = q.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = cy + dy, cx + dx
                    if 0 <= yy < h and 0 <= xx < w and ink[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        q.append((yy, xx))
                        comp.append((yy, xx))
        if len(comp) > 50:
            for yy, xx in comp:
                keep[yy, xx] = True
    # cap through the chest, so the basket rim can cover the rest
    crop = keep[:340]
    ys, xs = np.where(crop)
    crop = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    thick = crop.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            thick |= np.roll(np.roll(crop, dy, 0), dx, 1)
    rgba = np.zeros((*thick.shape, 4), np.uint8)
    rgba[thick, :3] = 32
    rgba[thick, 3] = 255
    return Image.fromarray(rgba, "RGBA")


def half_width(y, cy, rx, ry, throat_y, throat_hw):
    if y <= cy:
        dy = (cy - y) / ry
        if dy >= 1:
            return 0.0
        return float(rx * np.sqrt(max(0.0, 1 - dy * dy)))
    if y >= throat_y:
        return float(throat_hw)
    t = (y - cy) / (throat_y - cy)
    return float(rx + (throat_hw - rx) * (t ** 1.45))


def draw_line_page(w, h, stu, clouds=False):
    im = Image.new("L", (w, h), 255)
    d = ImageDraw.Draw(im)
    cx = w / 2
    top = 64 if not clouds else 86
    rx = w * 0.40
    ry = rx * 0.56
    cy = top + ry
    throat_y = cy + ry * 0.92
    throat_hw = rx * 0.24
    stroke = max(7, int(w / 130))

    def X(theta, y):
        return cx + half_width(y, cy, rx, ry, throat_y, throat_hw) * np.sin(theta)

    # outer envelope, left throat -> crown -> right throat
    pts = []
    for y in np.linspace(throat_y, top + 2, 40):
        pts.append((X(-np.pi / 2, y), y))
    for y in np.linspace(top + 2, throat_y, 40):
        pts.append((X(np.pi / 2, y), y))
    d.line(pts, fill=0, width=stroke, joint="curve")
    # throat ring
    ring = [X(-np.pi / 2, throat_y), throat_y - 8, X(np.pi / 2, throat_y), throat_y + 12]
    d.ellipse(ring, outline=0, width=stroke)

    # 8 gores. Stop at the throat so a line cannot fall through the basket.
    n = 8
    for i in range(1, n):
        theta = -np.pi / 2 + np.pi * i / n
        gore = []
        for y in np.linspace(top + 16, throat_y - 2, 30):
            gore.append((X(theta, y), y))
        d.line(gore, fill=0, width=max(5, stroke - 2), joint="curve")

    def scallop(y_base, amp):
        band = []
        for i in range(97):
            theta = -np.pi / 2 + np.pi * i / 96
            frac = ((theta + np.pi / 2) / np.pi * n) % 1
            dy = amp * np.cos(2 * np.pi * frac)
            y = y_base + dy
            band.append((X(theta, y), y))
        d.line(band, fill=0, width=max(5, stroke - 2), joint="curve")

    # Bands sit where they do on the book balloon: below the widest point,
    # orange on top, then green, then blue into the taper.
    scallop(cy + ry * 0.08, ry * 0.07)
    scallop(cy + ry * 0.48, ry * 0.055)

    # basket and side ropes. Ropes stay outside Stu.
    gap = throat_y + (h * 0.11)
    rim_w = throat_hw * 2.35
    rim_top = gap
    rim_h = stroke * 3.2
    bowl_h = rim_w * 0.62
    bot_w = rim_w * 0.72
    rim_left, rim_right = cx - rim_w / 2, cx + rim_w / 2

    for t in (0.06, 0.20, 0.80, 0.94):
        x0 = X(-np.pi / 2 + np.pi * t, throat_y)
        x1 = rim_left + rim_w * t
        d.line([(x0, throat_y + 6), (x1, rim_top)], fill=0, width=max(5, stroke - 2))

    # The original activity drawing of Stu (cap, wave, binoculars), placed in the new basket.
    stu_src = Image.open(os.path.join(os.path.dirname(__file__), "stu-basket-line.png")).convert("L")
    stu_w = int(rim_w * 0.92)
    stu_h = int(stu_w * stu_src.size[1] / stu_src.size[0])
    stu_r = stu_src.resize((stu_w, stu_h), Image.Resampling.NEAREST)
    ink = np.array(stu_r) < 128
    page = np.array(im)
    x0 = int(cx - stu_w / 2)
    y0 = int(rim_top - stu_h * 0.78)
    y1, x1 = min(h, y0 + stu_h), min(w, x0 + stu_w)
    sy = 0 if y0 >= 0 else -y0
    y0 = max(0, y0)
    sub = ink[sy:sy + (y1 - y0), :x1 - x0]
    page[y0:y1, x0:x1][sub] = 0
    im = Image.fromarray(page, "L")
    d = ImageDraw.Draw(im)

    d.rounded_rectangle([rim_left, rim_top, rim_right, rim_top + rim_h], radius=6, outline=0, width=stroke)
    left_b = (rim_left + 10, rim_top + rim_h - 1)
    right_b = (rim_right - 10, rim_top + rim_h - 1)
    side_l = (cx - bot_w / 2, rim_top + rim_h + bowl_h * 0.78)
    side_r = (cx + bot_w / 2, rim_top + rim_h + bowl_h * 0.78)
    bottom = []
    for i in range(19):
        t = i / 18
        ang = np.pi * (1 - t)
        bottom.append((cx + (bot_w / 2) * np.cos(ang), side_l[1] + (bot_w * 0.16) * np.sin(ang)))
    d.line([left_b, side_l] + bottom + [side_r, right_b], fill=0, width=stroke, joint="curve")

    if clouds:
        def cloud(x, y, s):
            blob = []
            for i in range(28):
                a = 2 * np.pi * i / 28
                rad = s * (0.55 + 0.16 * np.sin(3 * a))
                blob.append((x + rad * np.cos(a) * 1.5, y + rad * np.sin(a)))
            d.line(blob + [blob[0]], fill=0, width=max(5, stroke - 2), joint="curve")
        cloud(78, 78, 54)
        cloud(w - 120, 90, 48)
        cloud(70, h - 110, 46)

    arr = np.array(im)
    arr = np.where(arr < 180, 0, 255).astype(np.uint8)
    ys, xs = np.where(arr < 250)
    m = 56
    x0, y0 = max(0, int(xs.min()) - m), max(0, int(ys.min()) - m)
    x1, y1 = min(arr.shape[1], int(xs.max()) + m), min(arr.shape[0], int(ys.max()) + m)
    return Image.fromarray(arr[y0:y1, x0:x1], "L").convert("RGB")


def save_webp(im: Image.Image, path: str) -> None:
    im.save(path, "WEBP", quality=92, method=6)


def fix_italy(line_page: Image.Image) -> None:
    path = os.path.join(ROOT, "worksheets", "rome", "art", "balloon-italy.webp")
    page = Image.open(path).convert("RGB")
    arr = np.array(page)
    # The old balloon is the linework in the upper-right. Cover that whole
    # block, including the cropped basket, then draw one complete balloon.
    arr[:, 640:] = 255
    page = Image.fromarray(arr, "RGB")
    balloon = line_page.copy()
    balloon.thumbnail((500, 640), Image.Resampling.NEAREST)
    b = np.array(balloon.convert("L"))
    mask = Image.fromarray(np.where(b < 200, 255, 0).astype(np.uint8), "L")
    x = 1100 - balloon.size[0] - 36
    page.paste(Image.fromarray(np.where(b < 200, 0, 255).astype(np.uint8), "L").convert("RGB"), (x, 28), mask)
    save_webp(page, path)


def main():
    import sys
    lines_only = "--lines-only" in sys.argv
    if not lines_only:
        color = repair_color(os.path.join(ROOT, "assets", "balloon.webp"))
        save_webp(color, os.path.join(ROOT, "assets", "balloon.webp"))
        print("color", color.size)
        icon = Image.new("RGBA", (400, 400), (207, 234, 245, 255))
        bal = color.copy()
        bal.thumbnail((360, 380), Image.Resampling.LANCZOS)
        icon.paste(bal, ((400 - bal.size[0]) // 2, (400 - bal.size[1]) // 2), bal)
        save_webp(icon.convert("RGB"), os.path.join(ROOT, "worksheets", "rome", "art", "m-balloon.webp"))

    stu = stu_line()
    title = draw_line_page(1100, 1400, stu, clouds=False)
    save_webp(title, os.path.join(ROOT, "worksheets", "rio", "art", "title-balloon.webp"))
    away = draw_line_page(1100, 1100, stu, clouds=True)
    save_webp(away, os.path.join(ROOT, "worksheets", "rio", "art", "up-up-away.webp"))
    outline = draw_line_page(1100, 1400, stu, clouds=False)
    save_webp(outline, os.path.join(ROOT, "worksheets", "rio", "art", "balloon-outline.webp"))

    fix_italy(title)
    print("pages written")


if __name__ == "__main__":
    main()

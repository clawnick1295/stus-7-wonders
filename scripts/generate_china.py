#!/usr/bin/env python3
"""Build web-sized China worksheet art and data.js.

Print-book files were not mounted in this environment, so scenes composite the
site's own Stu and balloon with code-drawn Great Wall, lantern, bamboo and
one panda. Swap any file in worksheets/china/art/ for final print art later.
"""
from __future__ import annotations

import os
import textwrap

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ART = os.path.join(ROOT, "worksheets", "china", "art")
os.makedirs(ART, exist_ok=True)
INK = (36, 28, 52)
S = 800
FONT = ImageFont.truetype(os.path.join(ROOT, "fonts", "NotoSansSC-subset.ttf"), 28)
STU = Image.open(os.path.join(ROOT, "assets", "stu.webp")).convert("RGBA")
BALLOON = Image.open(os.path.join(ROOT, "assets", "balloon.webp")).convert("RGBA")


def paste(base, sprite, x, y, height):
    h = int(height)
    w = max(1, int(h * sprite.size[0] / sprite.size[1]))
    sp = sprite.resize((w, h), Image.Resampling.LANCZOS)
    base.paste(sp, (int(x - w / 2), int(y - h)), sp)
    return w, h


def sky(w, h):
    im = Image.new("RGBA", (w, h), (207, 234, 245, 255))
    d = ImageDraw.Draw(im)
    for i, col in enumerate([(232, 214, 176), (214, 186, 140), (186, 154, 112)]):
        y = int(h * (0.62 + i * 0.08))
        d.polygon([(0, h), (0, y + 30), (w * 0.3, y), (w * 0.55, y + 40), (w, y - 10), (w, h)], fill=col)
    return im


def panda(draw_or_im, x, y, s, line=False):
    """One panda. x,y is the centre of the body."""
    if line:
        d = draw_or_im
        ink = 0
        d.ellipse([x - s * 0.55, y - s * 1.15, x + s * 0.55, y - s * 0.15], outline=ink, width=6)
        d.ellipse([x - s * 0.62, y - s * 1.25, x - s * 0.22, y - s * 0.85], outline=ink, width=6)
        d.ellipse([x + s * 0.22, y - s * 1.25, x + s * 0.62, y - s * 0.85], outline=ink, width=6)
        d.ellipse([x - s * 0.28, y - s * 0.85, x - s * 0.02, y - s * 0.58], outline=ink, width=5)
        d.ellipse([x + s * 0.02, y - s * 0.85, x + s * 0.28, y - s * 0.58], outline=ink, width=5)
        d.arc([x - s * 0.16, y - s * 0.55, x + s * 0.16, y - s * 0.32], 20, 160, fill=ink, width=4)
        d.ellipse([x - s * 0.48, y - s * 0.2, x + s * 0.48, y + s * 0.85], outline=ink, width=6)
        d.line([(x - s * 0.2, y + s * 0.15), (x - s * 0.55, y + s * 0.45)], fill=ink, width=5)
        return
    im = draw_or_im
    d = ImageDraw.Draw(im)
    d.ellipse([x - s * 0.7, y - s * 1.35, x - s * 0.15, y - s * 0.75], fill=(30, 24, 40))
    d.ellipse([x + s * 0.15, y - s * 1.35, x + s * 0.7, y - s * 0.75], fill=(30, 24, 40))
    d.ellipse([x - s * 0.55, y - s * 1.15, x + s * 0.55, y - s * 0.1], fill=(250, 248, 242))
    d.ellipse([x - s * 0.32, y - s * 0.85, x - s * 0.02, y - s * 0.5], fill=(30, 24, 40))
    d.ellipse([x + s * 0.02, y - s * 0.85, x + s * 0.32, y - s * 0.5], fill=(30, 24, 40))
    d.ellipse([x - s * 0.22, y - s * 0.72, x - s * 0.1, y - s * 0.58], fill=(255, 255, 255))
    d.ellipse([x + s * 0.1, y - s * 0.72, x + s * 0.22, y - s * 0.58], fill=(255, 255, 255))
    d.ellipse([x - s * 0.08, y - s * 0.48, x + s * 0.08, y - s * 0.38], fill=(30, 24, 40))
    d.arc([x - s * 0.16, y - s * 0.42, x + s * 0.16, y - s * 0.22], 20, 160, fill=(30, 24, 40), width=3)
    d.ellipse([x - s * 0.5, y - s * 0.15, x + s * 0.5, y + s * 0.9], fill=(250, 248, 242))
    d.ellipse([x - s * 0.55, y + s * 0.15, x - s * 0.15, y + s * 0.7], fill=(30, 24, 40))
    d.ellipse([x + s * 0.15, y + s * 0.15, x + s * 0.55, y + s * 0.7], fill=(30, 24, 40))


def lantern(d, x, y, s, fill=(214, 48, 48), line=False):
    ink = 0 if line else (90, 20, 24)
    body = [x - s * 0.35, y - s * 0.45, x + s * 0.35, y + s * 0.4]
    if line:
        d.ellipse(body, outline=ink, width=5)
        d.line([(x, y - s * 0.45), (x, y + s * 0.4)], fill=ink, width=3)
        d.line([(x, y - s * 0.62), (x, y - s * 0.45)], fill=ink, width=4)
        d.line([(x, y + s * 0.4), (x, y + s * 0.7)], fill=ink, width=3)
    else:
        d.line([(x, y - s * 0.62), (x, y - s * 0.48)], fill=(80, 50, 30), width=3)
        d.ellipse(body, fill=fill, outline=ink, width=3)
        d.line([(x, y - s * 0.2), (x, y + s * 0.25)], fill=(255, 210, 120), width=2)
        d.line([(x, y + s * 0.4), (x, y + s * 0.72)], fill=(212, 168, 64), width=3)


def bamboo(d, x, y, h, line=False):
    ink = 0 if line else (40, 90, 50)
    col = ink if line else (70, 150, 80)
    d.line([(x, y), (x, y - h)], fill=col, width=8 if not line else 6)
    for i in range(3):
        yy = y - h * (0.3 + i * 0.22)
        d.line([(x, yy), (x + (18 if i % 2 == 0 else -18), yy - 16)], fill=col, width=4)


def wall(d, y, w, line=False):
    col = 0 if line else (214, 196, 160)
    ink = 0 if line else (90, 70, 50)
    d.rectangle([0, y, w, y + 70], fill=None if line else col, outline=ink, width=6)
    for x in range(10, w, 36):
        d.rectangle([x, y - 18, x + 18, y + 4], outline=ink, width=4)


def line_page(draw_fn, w=900, h=1100):
    im = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(im)
    draw_fn(d, w, h)
    arr = np.array(im.convert("L"))
    return Image.fromarray(np.where(arr < 170, 0, 255).astype(np.uint8), "L").convert("RGB")


def save(im, name):
    path = os.path.join(ART, name)
    im.convert("RGB").save(path, "WEBP", quality=82, method=4)
    return name


def build():
    # icons
    icon = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
    panda(icon, 200, 230, 150)
    save(icon, "icon-panda.webp")
    ic = Image.new("RGB", (400, 400), (207, 234, 245))
    lantern(ImageDraw.Draw(ic), 200, 190, 220)
    save(ic, "icon-lantern.webp")
    ic = Image.new("RGB", (400, 280), (207, 234, 245))
    wall(ImageDraw.Draw(ic), 150, 400)
    save(ic, "icon-wall.webp")

    def balloon_page(d, w, h):
        d.ellipse([120, 40, w - 120, 620], outline=0, width=8)
        for i in range(1, 6):
            x = 120 + (w - 240) * i / 6
            d.line([(x, 80), (w / 2 + (x - w / 2) * 0.25, 560)], fill=0, width=5)
        d.arc([200, 430, w - 200, 640], 10, 170, fill=0, width=6)
        d.rounded_rectangle([w / 2 - 120, 700, w / 2 + 120, 760], radius=8, outline=0, width=7)
        d.polygon([(w / 2 - 100, 760), (w / 2 + 100, 760), (w / 2 + 70, 980), (w / 2 - 70, 980)], outline=0)
        lantern(d, 180, 220, 90, line=True)
        lantern(d, w - 180, 260, 80, line=True)

    save(line_page(balloon_page), "lantern-balloon.webp")

    def mountains(d, w, h):
        d.polygon([(0, 780), (180, 420), (360, 700), (520, 300), (760, 680), (w, 500), (w, h), (0, h)], outline=0, width=6)
        d.ellipse([w / 2 - 180, 40, w / 2 + 180, 360], outline=0, width=7)
        d.line([(w / 2, 330), (w / 2 - 40, 520), (w / 2 + 40, 520)], fill=0, width=5)

    save(line_page(mountains, 900, 1000), "mountains.webp")

    def panda_page(d, w, h):
        panda(d, w / 2, h * 0.55, 280, line=True)
        bamboo(d, 160, h - 80, 420, line=True)
        bamboo(d, w - 160, h - 60, 380, line=True)

    save(line_page(panda_page), "panda.webp")

    def lanterns_page(d, w, h):
        for i, x in enumerate((150, 320, 500, 700)):
            lantern(d, x, 280 + (i % 2) * 40, 160, line=True)
        d.line([(40, 120), (w - 40, 120)], fill=0, width=6)

    save(line_page(lanterns_page, 900, 900), "lanterns.webp")

    def wall_page(d, w, h):
        wall(d, 420, w, line=True)
        d.rectangle([80, 220, 220, 430], outline=0, width=7)
        d.polygon([(60, 220), (150, 80), (240, 220)], outline=0)
        d.ellipse([w - 220, h - 280, w - 80, h - 140], outline=0, width=5)

    save(line_page(wall_page, 1000, 800), "wall.webp")

    def friends(d, w, h):
        panda(d, w * 0.62, h * 0.55, 220, line=True)
        d.ellipse([180, 280, 420, 560], outline=0, width=6)
        d.arc([160, 180, 460, 360], 200, 340, fill=0, width=6)
        bamboo(d, w / 2, h - 40, 200, line=True)

    save(line_page(friends), "friends.webp")

    def lantern_outline(d, w, h):
        lantern(d, w / 2, h * 0.48, 420, line=True)
        d.ellipse([w / 2 - 80, h * 0.72, w / 2 + 80, h * 0.84], outline=0, width=6)

    save(line_page(lantern_outline, 800, 1000), "lantern-outline.webp")

    def signpost(d, w, h):
        d.line([(w / 2, 80), (w / 2, h - 40)], fill=0, width=10)
        for i, label in enumerate(("Home", "Rio", "Rome", "Next")):
            y = 160 + i * 140
            d.rounded_rectangle([w / 2 - 180, y, w / 2 + 160, y + 80], radius=10, outline=0, width=6)
            d.text((w / 2 - 140, y + 22), label, fill=0, font=FONT)

    save(line_page(signpost, 800, 900), "signpost.webp")

    # painted scenes with one panda and real Stu
    def find_lanterns():
        im = sky(S, S)
        d = ImageDraw.Draw(im)
        spots = {
            "Stu": (430, 690),
            "Panda": (250, 640),
            "Lantern": [(140, 180), (300, 150), (560, 170), (700, 220)],
            "Bamboo": [(80, 620), (740, 600)],
            "Moon": (680, 80),
            "Star": [(80, 70), (200, 120), (500, 60)],
        }
        d.ellipse([620, 40, 740, 150], fill=(255, 244, 200))
        for p in spots["Star"]:
            d.regular_polygon((p, 16), 5, fill=(246, 210, 80))
        for p in spots["Lantern"]:
            lantern(d, p[0], p[1], 70)
        for p in spots["Bamboo"]:
            bamboo(d, p[0], p[1], 220)
        panda(im, spots["Panda"][0], spots["Panda"][1], 90)
        paste(im, STU, spots["Stu"][0], spots["Stu"][1], 220)
        save(im, "find-lanterns.webp")
        return spots

    def diff_scene(changes, name_a, name_b):
        def draw(changed):
            im = sky(S, S)
            d = ImageDraw.Draw(im)
            wall(d, 430, S)
            d.rectangle([90, 250, 210, 450], fill=(180, 90, 70), outline=(60, 40, 30), width=4)
            if "window" not in changed:
                d.rectangle([120, 300, 170, 360], fill=(140, 190, 210))
            lantern(d, 620, 250, 80, fill=(180, 180, 190) if "lantern" in changed else (214, 48, 48))
            if "tassel" not in changed:
                d.line([(620, 290), (620, 330)], fill=(212, 168, 64), width=4)
            panda(im, 300, 560, 80)
            if "bamboo" not in changed:
                bamboo(d, 360, 600, 120)
            paste(im, STU, 500, 620, 180)
            if "cloud" in changed:
                d.ellipse([40, 40, 160, 100], fill=(255, 255, 255))
            if "bird" in changed:
                d.arc([700, 80, 760, 120], 200, 20, fill=INK, width=4)
            if "kite" in changed:
                d.polygon([(500, 120), (540, 170), (460, 170)], fill=(230, 70, 90))
            return im
        save(draw(set()), name_a)
        save(draw(changes), name_b)

    def find_wall():
        im = sky(S, S)
        d = ImageDraw.Draw(im)
        wall(d, 360, S)
        spots = {
            "Stu": (180, 560),
            "Panda": (420, 520),
            "Lantern": [(300, 200), (640, 180), (720, 300)],
            "Bird": [(80, 120), (500, 90), (200, 80)],
            "Kite": (600, 80),
            "Map": (700, 560),
        }
        for p in spots["Lantern"]:
            lantern(d, p[0], p[1], 60)
        d.polygon([(600, 80), (640, 130), (560, 130)], fill=(230, 70, 70))
        d.rounded_rectangle([680, 520, 740, 580], outline=INK, width=4, fill=(244, 220, 160))
        panda(im, 420, 520, 70)
        paste(im, STU, 180, 560, 180)
        save(im, "find-wall.webp")
        return spots

    def find_bamboo():
        im = sky(S, S)
        d = ImageDraw.Draw(im)
        stalks = [(80, 760), (180, 780), (560, 770), (680, 750), (760, 790)]
        for p in stalks:
            bamboo(d, p[0], p[1], 360)
        spots = {
            "Panda": (360, 560),
            "Stu": (520, 640),
            "Bamboo": stalks,
            "Butterfly": [(140, 200), (400, 160), (640, 220)],
            "Lantern": (300, 120),
            "Bird": [(80, 80), (700, 70)],
        }
        lantern(d, 300, 120, 50)
        for p in spots["Butterfly"]:
            d.ellipse([p[0] - 10, p[1] - 6, p[0] + 10, p[1] + 6], fill=(240, 140, 180))
        panda(im, 360, 560, 100)
        paste(im, STU, 520, 640, 200)
        save(im, "find-bamboo.webp")
        return spots

    def count_scene():
        im = sky(S, S)
        d = ImageDraw.Draw(im)
        lanterns = [(120, 160), (240, 140), (360, 170), (500, 150), (640, 180), (740, 150)]
        birds = [(80, 70), (200, 50), (600, 60), (720, 80)]
        stalks = [(100, 780), (400, 790), (700, 770)]
        for p in lanterns:
            lantern(d, p[0], p[1], 55)
        for p in birds:
            d.arc([p[0] - 16, p[1] - 8, p[0] + 16, p[1] + 8], 200, 20, fill=INK, width=3)
        for p in stalks:
            bamboo(d, p[0], p[1], 260)
        panda(im, 360, 560, 90)
        paste(im, STU, 560, 640, 190)
        save(im, "count.webp")
        return len(lanterns), len(birds), len(stalks)

    def story_map():
        w, h = 1000, 680
        im = sky(w, h)
        d = ImageDraw.Draw(im)
        d.ellipse([40, 80, 200, 200], fill=(255, 244, 210), outline=INK, width=3)
        d.text((70, 210), "Home", fill=INK, font=FONT)
        wall(d, 300, w)
        d.rectangle([760, 160, 900, 320], fill=(176, 90, 70), outline=INK, width=4)
        d.polygon([(740, 160), (830, 60), (920, 160)], fill=(150, 50, 40))
        d.text((760, 340), "Great Wall", fill=INK, font=FONT)
        path = [(120, 160), (250, 200), (380, 250), (520, 280), (660, 260), (800, 220)]
        d.line(path, fill=(214, 90, 70), width=6)
        for p in path:
            d.ellipse([p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8], fill=(255, 255, 255), outline=INK, width=3)
        paste(im, BALLOON, 120, 150, 90)
        save(im, "map.webp")
        return path

    spots1 = find_lanterns()
    diff_scene({"cloud", "tassel", "bamboo", "window", "bird"}, "diff1-a.webp", "diff1-b.webp")
    diff_scene({"cloud", "lantern", "bird", "bamboo", "window", "tassel", "kite"}, "diff2-a.webp", "diff2-b.webp")
    # third pair: festival, 8 changes encoded as extra flags via a dedicated draw
    im = sky(S, S)
    d = ImageDraw.Draw(im)
    for i, x in enumerate((100, 220, 340, 500, 660)):
        lantern(d, x, 160, 60)
    panda(im, 300, 560, 80)
    paste(im, STU, 520, 620, 180)
    bamboo(d, 80, 760, 200)
    save(im, "diff3-a.webp")
    d.ellipse([40, 40, 110, 90], fill="white")
    d.regular_polygon(((700, 80), 14), 5, fill=(246, 210, 80))
    d.ellipse([600, 400, 650, 440], fill=(240, 140, 180))
    lantern(d, 760, 300, 40)
    d.arc([150, 80, 190, 110], 200, 20, fill=INK, width=3)
    d.rectangle([400, 500, 440, 540], fill=(244, 220, 160), outline=INK)
    d.line([(520, 500), (560, 460)], fill=INK, width=4)
    d.ellipse([200, 200, 240, 230], fill=(255, 255, 255))
    save(im, "diff3-b.webp")
    spots2 = find_wall()
    spots3 = find_bamboo()
    n_lantern, n_bird, n_bamboo = count_scene()
    path = story_map()

    # cover for the homepage
    cover = sky(900, 900)
    wall(ImageDraw.Draw(cover), 520, 900)
    panda(cover, 250, 640, 120)
    paste(cover, BALLOON, 620, 420, 380)
    cover.convert("RGB").save(os.path.join(ROOT, "assets", "china-cover.webp"), "WEBP", quality=82, method=4)

    def flat(spots):
        out = {}
        for name, pos in spots.items():
            if isinstance(pos[0], (int, float)):
                out[name] = [list(pos)]
            else:
                out[name] = [list(p) for p in pos]
        return out

    return {
        "find1": flat(spots1),
        "find2": flat(spots2),
        "find3": flat(spots3),
        "path": [list(p) for p in path],
        "counts": (n_lantern, n_bird, n_bamboo),
    }


def js(meta):
    c_lantern, c_bird, c_bamboo = meta["counts"]
    # answer indexes
    def choice(n, options):
        return options.index(str(n))

    data = r'''/* China worksheet data. Art in art/ can be replaced with final print paintings. One panda only. */
window.WS_BOOK = {
  id: 'china',
  title: 'Discovering China',
  place: 'China',
  stamp: 'art/icon-wall.webp',
  theme: { '--coral': '#d64545', '--mint': '#2f9e57' },
  activities: [
    { id:'lantern-balloon', type:'color', title:'Colour Stu’s lantern balloon', age:'All ages', img:'art/lantern-balloon.webp', prompt:'Pick a colour, then tap a space to fill it. The balloon is dressed in lantern colours for China!', goal:8 },
    { id:'explorer-id', type:'idcard', title:'My Explorer ID card', age:'All ages', img:'../../assets/stu.webp', prompt:'Type your name, pick your favourite thing about this adventure, and draw your face!',
      favs:['🐼 My panda friend','🧱 The Great Wall','🏮 Lanterns','🎋 Bamboo'] },
    { id:'fly-to-china', type:'trace', title:'Fly Stu to China!', age:'Ages 4–5', img:'art/map.webp', win:'Stu made it to the Great Wall!', traceLabel:'Story map. Follow the path from Home to the Great Wall.', prompt:'Put your finger on the balloon at Home and follow the line to the Great Wall.',
      path: PATH },
    { id:'mountains', type:'color', title:'Up over the mountains!', age:'Ages 4–5', img:'art/mountains.webp', prompt:'Colour Stu’s balloon as it sails over the mountains toward China.', goal:6 },
    { id:'find-lanterns', type:'find', title:'Lantern look and find', age:'Ages 4–5', img:'art/find-lanterns.webp', scale:800, prompt:'Find Stu, his one panda friend, the lanterns, the bamboo, the moon and the stars. Tap each one!',
      items: FIND1 },
    { id:'diff-landing', type:'diff', title:'Spot 5 differences', age:'Ages 4–5', a:'art/diff1-a.webp', b:'art/diff1-b.webp', img:'art/diff1-a.webp', scale:800, prompt:'Look at both pictures. Tap each spot that has changed!',
      diffs:[[100,70],[620,310],[360,540],[145,330],[730,100]], desc:['An extra cloud','The lantern tassel is gone','The bamboo is gone','The watchtower window is gone','A bird is flying'] },
    { id:'panda', type:'color', title:'Colour the friendly panda', age:'Ages 4–5', img:'art/panda.webp', prompt:'Stu has one panda friend. Colour the panda, black and white, and the bamboo green.', goal:6,
      palette:['#2a2433','#ffffff','#3d9a5b','#7ec86a','#e9785a','#f6b84b','#f3c89b','#5bc0be'] },
    { id:'words-easy', type:'wordsearch', title:'China word search', age:'Ages 4–5', img:'art/icon-panda.webp', size:10, dirs:['across','down'], seed:11,
      words:['CHINA','STU','PANDA','WALL','LANTERN','BAMBOO','MOON','DRAGON'], prompt:'Find the words! Slide your finger across the letters, or tap the first and last letter.' },
    { id:'mandarin', type:'match', title:'Learn Mandarin words', age:'Ages 4–8', img:'art/icon-lantern.webp', lang:'zh-CN', win:'很好! (Very good!)', prompt:'Each card shows Chinese characters and pinyin. Tap a word to hear it, then match it to the English meaning.',
      pairs:[
        ['你好','Nǐ hǎo','👋','hello','你好'],
        ['谢谢','Xièxie','🙏','thank you','谢谢'],
        ['再见','Zàijiàn','✋','goodbye','再见'],
        ['是','Shì','👍','yes','是'],
        ['不是','Bú shì','👎','no','不是'],
        ['朋友','Péngyou','🤝','friend','朋友'],
        ['熊猫','Xióngmāo','🐼','panda','熊猫'],
        ['竹子','Zhúzi','🎋','bamboo','竹子']
      ] },
    { id:'maze-wall', type:'maze', title:'Walk the Great Wall', age:'Ages 4–5', img:'art/icon-wall.webp', rows:6, cols:6, seed:11, start:'../../assets/balloon.webp', end:'art/icon-wall.webp', prompt:'Slide Stu’s balloon along the wall to the watchtower. You can also use the arrow buttons.' },
    { id:'lanterns', type:'color', title:'Light the lanterns', age:'Ages 4–8', img:'art/lanterns.webp', prompt:'Colour the lanterns red and gold.', goal:8, palette:['#d64545','#f0b429','#fff4c2','#2a2433','#3d9a5b','#ffffff'] },
    { id:'find-wall', type:'find', title:'Hidden along the Wall', age:'Ages 6–8', img:'art/find-wall.webp', scale:800, prompt:'Find Stu, his one panda friend, the lanterns, the birds, the kite and the map.',
      items: FIND2 },
    { id:'dots-tower', type:'dots', title:'Dot-to-dot: the watchtower', age:'Ages 4–8', img:'art/icon-wall.webp', win:'You drew a Great Wall watchtower!', prompt:'Tap the dots in order, 1, 2, 3… and watch the tower appear!',
      dots:[[120,520],[120,360],[80,360],[80,300],[160,220],[220,140],[300,80],[380,140],[460,220],[540,300],[540,360],[500,360],[500,520],[360,520],[240,520]] },
    { id:'diff-path', type:'diff', title:'Spot 7 differences', age:'Ages 6–8', a:'art/diff2-a.webp', b:'art/diff2-b.webp', img:'art/diff2-a.webp', scale:800, prompt:'Seven things changed beside the watchtower. Tap each change.',
      diffs:[[100,70],[620,250],[730,100],[360,540],[145,330],[620,310],[500,145]], desc:['An extra cloud','The lantern changed colour','A bird appears','The bamboo is gone','The window is gone','The tassel is gone','A kite appears'] },
    { id:'wall-enormous', type:'color', title:'The Great Wall is ENORMOUS!', age:'Ages 4–8', img:'art/wall.webp', prompt:'Colour the long wall and the little watchtower. Stu and his panda friend are tiny beside it.', goal:6 },
    { id:'fun-facts', type:'quiz', title:'China fun facts quiz', age:'Ages 6–8', img:'art/icon-wall.webp', prompt:'Read or listen, then tap the answer.',
      qs:[
        ['The stone Great Wall many people walk on was built mostly during which time?',['The Ming dynasty, hundreds of years ago','Last summer','Ten years ago'],0,'Many rulers added to the wall. The famous stone parts are mostly from the Ming dynasty.'],
        ['About how long is that Ming wall?',['About 5,500 miles (8,850 km)','About 5 miles','Shorter than a school bus'],0,'It is long enough to cross mountains and deserts.'],
        ['Can you see the Great Wall from the Moon with just your eyes?',['No','Yes','Only on Tuesdays'],0,'That is a myth. The wall is long, but far too thin to see from the Moon.'],
        ['What does the giant panda eat most of the time?',['Bamboo','Pizza','Fish'],0,'A panda spends much of the day eating bamboo.'],
        ['Red lanterns are often lit for which celebration?',['Chinese New Year','Halloween','A school fire drill'],0,'Red lanterns shine at Chinese New Year and the Lantern Festival.'],
        ['What were the watchtowers on the wall used for?',['To watch the land and send signals','To sell ice cream','To park balloons'],0,'Guards could see a long way and signal from tower to tower.']
      ] },
    { id:'words-hard', type:'wordsearch', title:'Word search: explorer level', age:'Ages 6–8', img:'art/icon-lantern.webp', size:12, dirs:['across','down','diagonal'], seed:8,
      words:['GREATWALL','WATCHTOWER','LANTERN','BAMBOO','PANDA','CHINA','FESTIVAL','MOUNTAIN','EXPLORER','BALLOON','FRIEND','WONDER'], prompt:'Twelve words hide across, down and diagonally!' },
    { id:'friends', type:'color', title:'Stu and his panda friend', age:'Ages 4–8', img:'art/friends.webp', prompt:'Colour Stu and his one panda friend sharing bamboo.', goal:6 },
    { id:'find-bamboo', type:'find', title:'In the bamboo grove', age:'Ages 6–8', img:'art/find-bamboo.webp', scale:800, prompt:'Find the one panda, Stu, the bamboo, the butterflies, the lantern and the birds.',
      items: FIND3 },
    { id:'maze-path', type:'maze', title:'Follow the wall', age:'Ages 6–8', img:'art/icon-panda.webp', rows:10, cols:9, seed:23, start:'art/icon-panda.webp', end:'art/icon-wall.webp', prompt:'Help the panda lead Stu along the twisty wall. Use a swipe or the arrow buttons.' },
    { id:'diff-festival', type:'diff', title:'Spot 8 differences', age:'Ages 6–8', a:'art/diff3-a.webp', b:'art/diff3-b.webp', img:'art/diff3-a.webp', scale:800, prompt:'The festival picture has 8 changes. Find them all!',
      diffs:[[75,65],[700,80],[625,420],[760,300],[170,95],[420,520],[540,480],[220,215]], desc:['An extra cloud','A star appears','A butterfly appears','An extra lantern','A bird appears','A little map appears','A new rope','Another cloud'] },
    { id:'my-lantern', type:'draw', title:'Design your own lantern', age:'Ages 4–8', img:'art/lantern-outline.webp', win:'What a bright lantern!', prompt:'Draw patterns on your lantern, then tap Fill to pour in colour.' },
    { id:'next-wonder', type:'color', title:'Which Wonder next?', age:'Ages 4–8', img:'art/signpost.webp', prompt:'Colour the signpost. Stu has been to Rio, Rome and China. Where should the balloon fly next?', goal:6 },
    { id:'rhyme', type:'quiz', title:'Finish the rhyme', age:'Ages 6–8', img:'art/icon-lantern.webp', win:'Rhyme time champion!', prompt:'Tap the word that finishes the rhyme about Stu’s China trip.',
      qs:[
        ['Stu floated on and saw a sight, a wall of stone so long and ____.',['wide','cat'],0],
        ['One friendly panda chewed a shoot. Bamboo for lunch is quite a ____.',['treat','shoe'],0],
        ['Red lanterns glowed against the night and filled the street with gentle ____.',['light','snow'],0],
        ['The path was steep along the ridge. Stu held the basket on the ____.',['bridge','horse'],0],
        ['The moon was round and very bright. Stu whispered, “Xièxie, friend. Good ____.”',['night','day'],0]
      ] },
    { id:'count-lanterns', type:'quiz', title:'Count the lanterns', age:'Ages 4–5', img:'art/count.webp', scene:'art/count.webp', sceneAlt:'Lanterns, one panda, Stu, birds and bamboo', prompt:'Look closely at the picture and count. There is only one panda.',
      qs:[
        ['How many lanterns can you see?',['4','6','8'], LANTERN_I],
        ['How many birds are flying?',['2','4','7'], BIRD_I],
        ['How many bamboo stalks?',['1','3','5'], BAMBOO_I],
        ['How many panda friends can you see?',['1','3','5'],0]
      ] }
  ]
};
'''
    import json
    data = data.replace("PATH", json.dumps(meta["path"]))
    data = data.replace("FIND1", json.dumps(meta["find1"]))
    data = data.replace("FIND2", json.dumps(meta["find2"]))
    data = data.replace("FIND3", json.dumps(meta["find3"]))
    opts = ["4", "6", "8"]
    data = data.replace("LANTERN_I", str(opts.index(str(c_lantern)) if str(c_lantern) in opts else 1))
    opts_b = ["2", "4", "7"]
    data = data.replace("BIRD_I", str(opts_b.index(str(c_bird)) if str(c_bird) in opts_b else 1))
    opts_s = ["1", "3", "5"]
    data = data.replace("BAMBOO_I", str(opts_s.index(str(c_bamboo)) if str(c_bamboo) in opts_s else 1))
    open(os.path.join(ROOT, "worksheets", "china", "data.js"), "w").write(data)
    print("counts", meta["counts"])


if __name__ == "__main__":
    js(build())

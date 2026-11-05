/* Stu's 7 Wonders — shared worksheet activities. Same templates for every book. */
(() => {
'use strict';
const B = window.WS_BOOK;
const L = window.WSLogic;
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const KEY = 'stu-worksheets-' + B.id;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const live = $('#live');
const say = t => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};

if (B.theme) for (const [k, v] of Object.entries(B.theme)) document.documentElement.style.setProperty(k, v);

let routeToken = 0;
let timers = [];
const later = (fn, ms) => {
  const token = routeToken;
  const id = setTimeout(() => { if (token === routeToken) fn(); }, ms);
  timers.push(id);
  return id;
};

const load = () => { try { return L.normalizeProgress(JSON.parse(localStorage.getItem(KEY))) } catch { return L.normalizeProgress(null) } };
let prog = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)) } catch { /* private mode */ } };
const done = id => !!(prog.done || {})[id];

let ac;
const audio = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
let muted = localStorage.getItem('stu-ws-muted') === '1';
function tone(f, t0, d, type = 'triangle', v = .18) {
  if (muted) return;
  let a;
  try { a = audio(); } catch { return; }
  if (a.state === 'suspended') return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, a.currentTime + t0);
  g.gain.linearRampToValueAtTime(v, a.currentTime + t0 + .02);
  g.gain.exponentialRampToValueAtTime(.001, a.currentTime + t0 + d);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + d + .05);
}
const sfx = {
  good: () => { tone(880, 0, .18); tone(1320, .08, .22); },
  bad: () => { tone(220, 0, .2, 'sine', .12); },
  pop: () => tone(660, 0, .08, 'sine', .1),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * .11, i === 5 ? .6 : .18, 'triangle', .2))
};

function confetti() {
  if (reduce) return;
  const c = el('canvas', { class: 'confetti-c', 'aria-hidden': 'true' });
  document.body.append(c);
  const x = c.getContext('2d');
  const W = c.width = innerWidth, H = c.height = innerHeight;
  const cols = ['#f6b84b', '#e9785a', '#8fd0a8', '#5bc0be', '#e96aa0', '#8f7be6'];
  const ps = Array.from({ length: 120 }, () => ({ x: W / 2, y: H * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 6, r: Math.random() * 6.28, s: 6 + Math.random() * 7, c: cols[Math.random() * 6 | 0] }));
  let f = 0;
  (function step() {
    x.clearRect(0, 0, W, H);
    ps.forEach(p => {
      p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += .2;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore();
    });
    if (++f < 140 && routeToken) requestAnimationFrame(step); else c.remove();
  })();
}

let celebrated = false;
function complete(a, msg) {
  if (celebrated) return;
  celebrated = true;
  const first = !done(a.id);
  const marked = L.markDone(prog, a.id);
  prog = marked.progress;
  save();
  sfx.win(); confetti();
  const n = L.stickerCount(prog), total = B.activities.length;
  const nxt = L.nextIncomplete(B.activities, a.id, prog.done);
  const dlg = el('div', { class: 'cheer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cheer-t' },
    el('div', { class: 'cheer-card' },
      el('img', { src: '../../assets/stu.webp', alt: '', class: 'cheer-stu', width: 360, height: 781 }),
      el('div', { class: 'cheer-body' },
        el('p', { class: 'cheer-kick' }, first ? 'New sticker!' : 'Great job again!'),
        el('h2', { id: 'cheer-t' }, msg || 'Hooray! You did it, explorer!'),
        el('div', { class: 'sticker big', 'aria-hidden': 'true' }, el('img', { src: a.img, alt: '' })),
        el('p', {}, `${n} of ${total} stickers collected`),
        el('div', { class: 'row' },
          el('a', { class: 'btn', href: '#' }, 'My sticker map'),
          nxt ? el('a', { class: 'btn alt', href: '#' + nxt.id }, 'Next activity') : null))));
  document.body.append(dlg);
  say((msg || 'Hooray! You did it!') + ` ${n} of ${total} stickers.`);
  const close = () => { dlg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('a')) close(); });
  document.addEventListener('keydown', onKey);
  const focus = dlg.querySelector('a');
  if (focus) focus.focus();
}

function loadImg(src) {
  return new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error('image'));
    i.src = src;
  });
}
function pt(e, node, w, h) {
  const r = node.getBoundingClientRect();
  if (!r.width || !r.height) return [0, 0];
  return [(e.clientX - r.left) / r.width * w, (e.clientY - r.top) / r.height * h];
}
function speak(text, lang) {
  if (muted || !text || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'en-US';
    u.rate = .85;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* no voice available */ }
}
function missingPicture(a) {
  app.replaceChildren(shell(a, el('p', { class: 'prompt' }, 'This picture did not load. Go back and try the activity again.')));
}
const PALETTE = ['#e9785a', '#f6b84b', '#f6e27a', '#8fd0a8', '#2f9e57', '#5bc0be', '#4a7fd1', '#8f7be6', '#e96aa0', '#a86b45', '#f3c89b', '#ffffff'];

function shell(a, ...body) {
  const i = B.activities.indexOf(a);
  return el('article', { class: 'act', 'aria-labelledby': 'act-t' },
    el('header', { class: 'act-head' },
      el('a', { class: 'back', href: '#', 'aria-label': 'Back to all activities' }, '←'),
      el('div', {},
        el('p', { class: 'act-n' }, `Activity ${i + 1} of ${B.activities.length} · ${a.age}`),
        el('h1', { id: 'act-t' }, a.title)),
      done(a.id) ? el('span', { class: 'sticker sm', title: 'Sticker earned' }, el('img', { src: a.img, alt: 'Sticker earned' })) : null),
    el('p', { class: 'prompt' },
      el('button', { class: 'say', type: 'button', 'aria-label': 'Read the instructions aloud', onclick: () => speak(a.prompt) }, '🔊'),
      a.prompt),
    ...body);
}

function btn(label, onclick, extra) {
  return el('button', { class: 'tool', type: 'button', onclick, ...extra }, label);
}

/* ===== colour / draw ===== */
async function colorAct(a, drawMode) {
  const my = routeToken;
  const pal = a.palette || PALETTE;
  let col = pal[0], tool = drawMode ? 'brush' : 'fill', fills = 0;
  const cv = el('canvas', { class: 'paint', role: 'application', 'aria-label': (drawMode ? 'Drawing' : 'Colouring') + ': ' + a.title });
  const sw = el('div', { class: 'palette', role: 'radiogroup', 'aria-label': 'Colours' });
  pal.forEach((c, k) => {
    const b = el('button', {
      class: 'swatch', type: 'button', role: 'radio',
      'aria-checked': k === 0 ? 'true' : 'false',
      'aria-label': 'Colour ' + (k + 1) + (c.toLowerCase() === '#ffffff' ? ', white eraser' : ''),
      style: `--c:${c}`
    });
    b.onclick = () => {
      col = c;
      sw.querySelectorAll('.swatch').forEach(s => s.setAttribute('aria-checked', 'false'));
      b.setAttribute('aria-checked', 'true');
      sfx.pop();
    };
    sw.append(b);
  });
  const tools = el('div', { class: 'tools' });
  const tb = (t, label) => el('button', {
    class: 'tool' + (tool === t ? ' on' : ''), type: 'button',
    'aria-pressed': tool === t ? 'true' : 'false',
    onclick: e => {
      tool = t;
      tools.querySelectorAll('.tool').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
      e.currentTarget.classList.add('on');
      e.currentTarget.setAttribute('aria-pressed', 'true');
    }
  }, label);
  tools.append(tb('fill', 'Fill'), tb('brush', 'Crayon'), btn('Undo', () => undo()), btn('I’m done', () => finish()));
  app.replaceChildren(shell(a, el('div', { class: 'stage' }, cv), sw, tools));
  let img;
  try { img = await loadImg(a.img); } catch { if (my === routeToken) missingPicture(a); return; }
  if (my !== routeToken) return;
  const W = cv.width = img.naturalWidth, H = cv.height = img.naturalHeight;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const g = x.getImageData(0, 0, W, H).data, N = W * H;
  const lum = new Uint8Array(N), wall = new Uint8Array(N);
  for (let i = 0; i < N; i++) { lum[i] = g[i * 4]; wall[i] = g[i * 4] < 170 ? 1 : 0; }
  const w2 = wall.slice();
  for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
    const i = y * W + xx;
    if (!wall[i] && (wall[i - 1] || wall[i + 1] || wall[i - W] || wall[i + W])) w2[i] = 1;
  }
  const paint = new Uint32Array(N).fill(0xffffffff);
  const hist = [];
  const out = x.createImageData(W, H), o32 = new Uint32Array(out.data.buffer);
  const sk = KEY + '-ops-' + a.id;
  const ops = [];
  function render() {
    for (let i = 0; i < N; i++) {
      const p = paint[i], l = lum[i] / 255;
      const r = (p & 255) * l, gg = ((p >> 8) & 255) * l, b = ((p >> 16) & 255) * l;
      o32[i] = (255 << 24) | (b << 16) | (gg << 8) | (r & 255);
    }
    x.putImageData(out, 0, 0);
  }
  const hex = c => { const n = parseInt(c.slice(1), 16); return (255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255); };
  function searchPx() {
    const r = cv.getBoundingClientRect();
    return Math.max(8, Math.round(28 / Math.max(r.width, 1) * W));
  }
  function fill(px, py, record) {
    px |= 0; py |= 0;
    let s = py * W + px;
    if (s < 0 || s >= N) return;
    if (w2[s]) {
      const reach = searchPx();
      let best = -1, bestD = reach * reach;
      for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
        if (dx * dx + dy * dy > bestD) continue;
        const X = px + dx, Y = py + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const q = Y * W + X;
        if (!w2[q]) { best = q; bestD = dx * dx + dy * dy; }
      }
      if (best < 0) return;
      s = best;
    }
    const target = paint[s], c = hex(col);
    if (target === c) return;
    hist.push(paint.slice());
    if (hist.length > 12) hist.shift();
    const st = [s];
    while (st.length) {
      let i = st.pop();
      const y = (i / W) | 0;
      let lx = i;
      while (lx % W > 0 && !w2[lx - 1] && paint[lx - 1] === target) lx--;
      let up = false, dn = false;
      for (let j = lx; j < (y + 1) * W && !w2[j] && paint[j] === target; j++) {
        paint[j] = c;
        if (y > 0) {
          const u = j - W;
          if (!w2[u] && paint[u] === target) { if (!up) { st.push(u); up = true; } } else up = false;
        }
        if (y < H - 1) {
          const d = j + W;
          if (!w2[d] && paint[d] === target) { if (!dn) { st.push(d); dn = true; } } else dn = false;
        }
      }
    }
    render();
    if (record !== false) {
      fills++;
      ops.push({ t: 'f', x: px, y: py, c: col });
      persist();
      sfx.pop();
      if (!drawMode && a.goal && fills === a.goal) finish();
    }
  }
  let last = null, stroke = null;
  function brush(px, py) {
    const c = hex(col), R = Math.max(6, W / 100);
    const x0 = last ? last[0] : px, y0 = last ? last[1] : py;
    const steps = Math.max(1, Math.hypot(px - x0, py - y0) / 3);
    for (let k = 0; k <= steps; k++) {
      const cx = x0 + (px - x0) * k / steps, cy = y0 + (py - y0) * k / steps;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R) continue;
        const X = cx + dx | 0, Y = cy + dy | 0;
        if (X >= 0 && Y >= 0 && X < W && Y < H) paint[Y * W + X] = c;
      }
    }
    last = [px, py];
    if (stroke) stroke.push([px | 0, py | 0]);
    render();
  }
  function undo() {
    if (!hist.length) return;
    paint.set(hist.pop());
    ops.push({ t: 'u' });
    render();
    persist();
  }
  let tm;
  function persist() {
    clearTimeout(tm);
    tm = setTimeout(() => {
      try { localStorage.setItem(sk, JSON.stringify(ops.slice(-40))); } catch { /* quota */ }
    }, 400);
  }
  function finish() {
    complete(a, a.win || (drawMode ? 'Beautiful drawing!' : 'Beautiful colouring!'));
  }
  function replay(saved) {
    const prev = col;
    for (const op of saved) {
      if (op.t === 'f') { col = op.c; fill(op.x, op.y, false); }
      else if (op.t === 'b' && op.pts && op.pts.length) {
        col = op.c; last = null;
        op.pts.forEach(p => brush(p[0], p[1]));
        last = null;
      } else if (op.t === 'u' && hist.length) paint.set(hist.pop());
    }
    col = prev;
    render();
  }
  try {
    const saved = JSON.parse(localStorage.getItem(sk) || 'null');
    if (Array.isArray(saved)) replay(saved);
  } catch { /* ignore old picture saves */ }
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    const [px, py] = pt(e, cv, W, H);
    if (tool === 'fill') fill(px, py);
    else {
      hist.push(paint.slice());
      if (hist.length > 12) hist.shift();
      last = null;
      stroke = [[px | 0, py | 0]];
      brush(px, py);
    }
  });
  cv.addEventListener('pointermove', e => {
    if (tool !== 'brush' || !e.buttons || !stroke) return;
    const [px, py] = pt(e, cv, W, H);
    brush(px, py);
  });
  cv.addEventListener('pointerup', () => {
    if (tool === 'brush' && stroke) {
      const slim = stroke.filter((_, i) => i % 2 === 0).slice(0, 80);
      ops.push({ t: 'b', c: col, pts: slim });
      stroke = null; last = null; fills++; persist();
    }
  });
  cv.addEventListener('pointercancel', () => { stroke = null; last = null; });
  render();
}

/* ===== find & diff ===== */
function hotspotAct(a, isDiff) {
  const S = a.scale;
  const rad = a.rad || S * 0.068;
  const found = new Set();
  const targets = isDiff
    ? a.diffs.map((p, i) => ({ k: 'd' + i, name: a.desc[i], p }))
    : Object.entries(a.items).flatMap(([name, ps]) => ps.map((p, i) => ({ k: name + i, name, p })));
  const total = targets.length;
  const counter = el('p', { class: 'counter', 'aria-live': 'polite' });
  const mkLayer = (src, alt) => el('div', { class: 'scene' }, el('img', { src, alt, width: S, height: S, draggable: 'false' }));
  const list = el('ul', { class: 'checklist' });
  const upd = () => {
    counter.textContent = isDiff ? `${found.size} of ${total} differences found` : `${found.size} of ${total} found`;
    if (!isDiff) list.querySelectorAll('li').forEach(li => {
      const name = li.dataset.name;
      const all = targets.filter(t => t.name === name);
      const f = all.filter(t => found.has(t.k)).length;
      li.querySelector('b').textContent = `${f}/${all.length}`;
      li.classList.toggle('ok', f === all.length);
    });
  };
  if (!isDiff) {
    [...new Set(targets.map(t => t.name))].forEach(name => {
      const t = targets.find(x => x.name === name);
      const z = S * 0.13, s = 64;
      list.append(el('li', { 'data-name': name },
        el('span', { class: 'thumb', 'aria-hidden': 'true', style: `background-image:url(${a.img});background-size:${S / z * s}px;background-position:${-(t.p[0] - z / 2) / z * s}px ${-(t.p[1] - z / 2) / z * s}px` }),
        el('span', {}, name),
        el('b', {})));
    });
  }
  const A = isDiff ? mkLayer(a.a, 'Picture 1, the original') : null;
  const Bn = mkLayer(isDiff ? a.b : a.img, isDiff ? 'Picture 2, with changes. Tap a change.' : a.title + ' scene');
  let down = null;
  const tap = layer => e => {
    if (e.type === 'pointerdown') {
      down = { x: e.clientX, y: e.clientY, layer };
      return;
    }
    if (!down || down.layer !== layer) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 14) return;
    const [x, y] = pt(e, layer, S, S);
    const open = targets.map(t => ({ ...t, found: found.has(t.k) }));
    const hit = L.nearestHotspot(open, x, y, rad);
    if (hit) {
      found.add(hit.k);
      [A, Bn].filter(Boolean).forEach(node => node.append(el('span', { class: 'ring', style: `left:${hit.p[0] / S * 100}%;top:${hit.p[1] / S * 100}%` })));
      sfx.good();
      say(hit.name);
      upd();
      if (found.size === total) later(() => complete(a, isDiff ? 'You spotted every difference!' : 'You found them all!'), 450);
    } else {
      sfx.bad();
      const m = el('span', { class: 'miss', style: `left:${x / S * 100}%;top:${y / S * 100}%` });
      layer.append(m);
      setTimeout(() => m.remove(), 600);
    }
  };
  [A, Bn].filter(Boolean).forEach(node => {
    node.addEventListener('pointerdown', tap(node));
    node.addEventListener('pointerup', tap(node));
  });
  const hint = btn('Hint', () => {
    const t = targets.find(item => !found.has(item.k));
    if (!t) return;
    [A, Bn].filter(Boolean).forEach(node => {
      const h = el('span', { class: 'hint', style: `left:${t.p[0] / S * 100}%;top:${t.p[1] / S * 100}%` });
      node.append(h);
      setTimeout(() => h.remove(), 1800);
    });
    say('Look here: ' + t.name);
  });
  app.replaceChildren(shell(a,
    counter,
    isDiff ? el('div', { class: 'pair' }, A, Bn) : el('div', { class: 'stage' }, Bn),
    isDiff ? null : list,
    el('div', { class: 'tools' }, hint)));
  upd();
}

/* ===== word search ===== */
function wordsearchAct(a) {
  const built = L.buildWordSearch(a);
  if (!built) {
    app.replaceChildren(shell(a, el('p', { class: 'prompt' }, 'This word search could not be made. Try another activity.')));
    return;
  }
  const { grid, positions } = built;
  const N = a.size;
  const found = new Set();
  let drag = null, startCell = null;
  const box = el('div', { class: 'ws', style: `--n:${N}`, role: 'grid', 'aria-label': 'Word search letters' });
  const cells = [];
  grid.forEach((row, r) => row.forEach((ch, c) => {
    const b = el('button', { class: 'cell', type: 'button', 'data-r': r, 'data-c': c, 'aria-label': `${ch}, row ${r + 1}, column ${c + 1}` }, ch);
    cells.push(b);
    box.append(b);
  }));
  const words = el('ul', { class: 'words' }, a.words.map(w => el('li', { 'data-w': w }, w)));
  const cellAt = e => {
    const t = document.elementFromPoint(e.clientX, e.clientY);
    return t && t.closest ? t.closest('.cell') : null;
  };
  const lineEls = (s, t) => L.wordSearchLine(+s.dataset.r, +s.dataset.c, +t.dataset.r, +t.dataset.c, N).map(([r, c]) => cells[r * N + c]);
  const paint = arr => { cells.forEach(c => c.classList.remove('sel')); arr.forEach(c => c.classList.add('sel')); };
  function check(arr) {
    paint([]);
    if (!arr.length) return;
    const word = arr.map(c => c.textContent).join('');
    const rev = [...word].reverse().join('');
    const w = a.words.find(item => !found.has(item) && (item === word || item === rev) && positions[item].every(([r, c]) => arr.some(node => +node.dataset.r === r && +node.dataset.c === c)));
    if (w) {
      found.add(w);
      const hue = [20, 45, 140, 190, 260, 330][found.size % 6];
      arr.forEach(c => { c.classList.add('hit'); c.style.setProperty('--h', hue); });
      const li = words.querySelector(`[data-w="${w}"]`);
      if (li) li.classList.add('ok');
      sfx.good();
      say('You found ' + w);
      if (found.size === a.words.length) later(() => complete(a, a.win || 'Word search wizard!'), 400);
    } else if (arr.length > 1) sfx.bad();
  }
  box.addEventListener('pointerdown', e => {
    const c = cellAt(e);
    if (!c) return;
    e.preventDefault();
    box.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, cell: c, moved: false };
    if (!startCell) paint([c]);
  });
  box.addEventListener('pointermove', e => {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
    const c = cellAt(e);
    if (c && drag.moved) paint(lineEls(startCell || drag.cell, c));
  });
  box.addEventListener('pointerup', e => {
    if (!drag) return;
    const origin = startCell || drag.cell;
    const c = cellAt(e) || drag.cell;
    if (drag.moved) { check(lineEls(origin, c)); startCell = null; }
    else if (!startCell) { startCell = c; paint([c]); sfx.pop(); say('Now tap the last letter'); }
    else { check(lineEls(startCell, c)); startCell = null; }
    drag = null;
  });
  box.addEventListener('pointercancel', () => { drag = null; });
  box.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest('.cell');
    if (!c) return;
    e.preventDefault();
    if (!startCell) { startCell = c; paint([c]); }
    else { check(lineEls(startCell, c)); startCell = null; }
  });
  app.replaceChildren(shell(a, el('div', { class: 'ws-wrap' }, box, words)));
}

/* ===== maze ===== */
function mazeAct(a) {
  const maze = L.buildMaze(a.rows, a.cols, a.seed || 1);
  const { walls, rows: R, cols: C } = maze;
  const DV = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  const cs = 100, P = 10, Wd = C * cs + P * 2, Hd = R * cs + P * 2;
  let d = '';
  walls.forEach((w, i) => {
    const x = P + (i % C) * cs, y = P + (i / C | 0) * cs;
    if (w[0] && i >= C) d += `M${x} ${y}h${cs}`;
    if (w[1] && i % C < C - 1) d += `M${x + cs} ${y}v${cs}`;
  });
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${Wd} ${Hd}`);
  svg.setAttribute('class', 'maze');
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', `Maze, ${R} by ${C}. Swipe, use the arrows, or press the arrow keys.`);
  svg.tabIndex = 0;
  svg.innerHTML = `<rect x="${P}" y="${P}" width="${C * cs}" height="${R * cs}" rx="18" class="mz-bg"/><path d="${d}" class="mz-wall"/><rect x="${P}" y="${P}" width="${C * cs}" height="${R * cs}" rx="18" class="mz-frame"/>
    <polyline class="mz-trail" points=""/><image href="${a.end}" x="${P + (C - 1) * cs + 8}" y="${P + (R - 1) * cs + 4}" width="${cs - 16}" height="${cs - 8}" preserveAspectRatio="xMidYMid meet"/><image class="mz-me" href="${a.start}" width="${cs * .72}" height="${cs * .72}" preserveAspectRatio="xMidYMid meet"/>`;
  let cur = 0, trail = [0], won = false;
  const me = svg.querySelector('.mz-me'), tr = svg.querySelector('.mz-trail');
  const cxy = i => [P + (i % C) * cs + cs / 2, P + (i / C | 0) * cs + cs / 2];
  const draw = () => {
    const [x, y] = cxy(cur);
    me.setAttribute('x', x - cs * .36);
    me.setAttribute('y', y - cs * .4);
    tr.setAttribute('points', trail.map(cxy).map(p => p.join(',')).join(' '));
  };
  const move = dd => {
    if (won) return false;
    const r = cur / C | 0, c = cur % C;
    if (walls[cur][dd]) return false;
    const j = (r + DV[dd][0]) * C + c + DV[dd][1];
    if (j < 0 || j >= R * C) return false;
    const k = trail.lastIndexOf(j);
    if (k >= 0) trail = trail.slice(0, k + 1); else trail.push(j);
    cur = j;
    draw();
    if (cur === R * C - 1) {
      won = true;
      svg.classList.add('won');
      later(() => complete(a, a.win || 'You made it through the maze!'), 300);
    }
    return true;
  };
  let pointer = null;
  svg.addEventListener('pointerdown', e => {
    pointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointerup', e => {
    if (!pointer) return;
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    pointer = null;
    if (Math.hypot(dx, dy) < 18) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    move(dir) ? sfx.pop() : sfx.bad();
  });
  svg.addEventListener('pointercancel', () => { pointer = null; });
  svg.addEventListener('keydown', e => {
    const m = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key];
    if (m == null) return;
    e.preventDefault();
    move(m) ? sfx.pop() : sfx.bad();
  });
  const arrows = [['Up', 0, '↑'], ['Left', 3, '←'], ['Down', 2, '↓'], ['Right', 1, '→']];
  const pad = el('div', { class: 'dpad', role: 'group', 'aria-label': 'Move through the maze' },
    arrows.map(([name, dir, glyph]) => el('button', {
      class: 'tool', type: 'button', 'aria-label': 'Move ' + name.toLowerCase(),
      onclick: () => { move(dir) ? sfx.pop() : sfx.bad(); svg.focus(); }
    }, glyph)));
  app.replaceChildren(shell(a,
    el('div', { class: 'stage maze-stage' }, svg),
    pad,
    el('div', { class: 'tools' }, btn('Start again', () => { cur = 0; trail = [0]; won = false; svg.classList.remove('won'); draw(); }))));
  draw();
}

/* ===== trace ===== */
async function traceAct(a) {
  const my = routeToken;
  let img;
  try { img = await loadImg(a.img); } catch { if (my === routeToken) missingPicture(a); return; }
  if (my !== routeToken) return;
  const W = img.naturalWidth, H = img.naturalHeight, path = a.path;
  let next = 0, won = false;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'trace');
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', a.traceLabel || `Map. Follow the path with your finger to ${B.place}.`);
  svg.innerHTML = `<image href="${a.img}" width="${W}" height="${H}"/><polyline class="tr-ink" points=""/>${path.map((p, i) => `<circle class="tr-pt" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="${i === 0 ? 28 : 16}"/>`).join('')}`;
  const ink = svg.querySelector('.tr-ink');
  let pts = [], on = false, last = null;
  const hitR = () => {
    const box = svg.getBoundingClientRect();
    const fromScreen = box.width ? (30 / box.width) * W : 48;
    return Math.max(48, fromScreen);
  };
  function advanceAlong(x0, y0, x1, y1) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(len / 12));
    const r = hitR();
    for (let s = 1; s <= steps; s++) {
      const x = x0 + (x1 - x0) * s / steps, y = y0 + (y1 - y0) * s / steps;
      if (next < path.length && Math.hypot(x - path[next][0], y - path[next][1]) < r) {
        svg.querySelector(`[data-i="${next}"]`).classList.add('ok');
        next++;
        sfx.pop();
        if (next === path.length && !won) {
          won = true; on = false;
          later(() => complete(a, a.win || `Stu made it to ${B.place}!`), 300);
          return;
        }
      }
    }
  }
  svg.addEventListener('pointerdown', e => {
    if (won) return;
    const [x, y] = pt(e, svg, W, H);
    const r = hitR() * 1.35;
    const nearNext = next < path.length && Math.hypot(x - path[next][0], y - path[next][1]) < r;
    const nearInk = last && Math.hypot(x - last[0], y - last[1]) < r;
    if (nearNext || nearInk) {
      on = true;
      svg.setPointerCapture(e.pointerId);
      if (!last) { pts.push(`${x | 0},${y | 0}`); last = [x, y]; }
    }
  });
  svg.addEventListener('pointermove', e => {
    if (!on || won) return;
    const [x, y] = pt(e, svg, W, H);
    const prev = last || [x, y];
    pts.push(`${x | 0},${y | 0}`);
    ink.setAttribute('points', pts.join(' '));
    advanceAlong(prev[0], prev[1], x, y);
    last = [x, y];
  });
  svg.addEventListener('pointerup', () => { on = false; });
  svg.addEventListener('pointercancel', () => { on = false; });
  const win = () => { if (!won) { won = true; complete(a, a.win || `Stu made it to ${B.place}!`); } };
  app.replaceChildren(shell(a,
    el('div', { class: 'stage' }, svg),
    el('div', { class: 'tools' },
      btn('Start again', () => {
        next = 0; pts = []; last = null; on = false; won = false;
        ink.setAttribute('points', '');
        svg.querySelectorAll('.tr-pt').forEach(c => c.classList.remove('ok'));
      }),
      btn('Fly for me', () => {
        path.forEach((_, i) => svg.querySelector(`[data-i="${i}"]`).classList.add('ok'));
        ink.setAttribute('points', path.map(p => p.join(',')).join(' '));
        next = path.length;
        win();
      }))));
}

/* ===== dot-to-dot ===== */
function dotsAct(a) {
  const P = a.dots || B.dots;
  if (!P || !P.length) {
    app.replaceChildren(shell(a, el('p', { class: 'prompt' }, 'The dots for this picture are missing.')));
    return;
  }
  const view = L.dotViewBox(P, 80);
  let next = 0, won = false;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  svg.setAttribute('class', 'dots');
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', `Dot to dot with ${P.length} dots. Tap the highlighted number.`);
  svg.tabIndex = 0;
  svg.innerHTML = `<polygon class="dt-fill" points="${P.map(p => p.join(',')).join(' ')}"/><polyline class="dt-line" points=""/>` +
    P.map((p, i) => `<g class="dt" data-i="${i}"><circle cx="${p[0]}" cy="${p[1]}" r="18" class="dt-dot"/></g>`).join('');
  const line = svg.querySelector('.dt-line');
  const counter = el('p', { class: 'counter', 'aria-live': 'polite' });
  const layer = el('div', { class: 'stage dot-layer' }, svg, el('div', { class: 'dot-labels', 'aria-hidden': 'true' }));
  const labels = layer.querySelector('.dot-labels');
  const paintLabels = () => {
    counter.textContent = next >= P.length ? 'You joined every dot!' : `Next dot: ${next + 1} of ${P.length}`;
    labels.replaceChildren(...P.map((p, i) => {
      if (i < next - 1 || i > next + 3) return null;
      const x = (p[0] - view.x) / view.w * 100;
      const y = (p[1] - view.y) / view.h * 100;
      return el('span', { class: 'dot-n' + (i === next ? ' now' : i < next ? ' ok' : ''), style: `left:${x}%;top:${y}%` }, String(i + 1));
    }));
    svg.querySelectorAll('.dt').forEach(g => {
      g.classList.toggle('ok', +g.dataset.i < next);
      g.classList.toggle('now', +g.dataset.i === next);
    });
  };
  const hit = index => {
    if (won) return;
    if (index !== next) {
      sfx.bad();
      say('Find dot number ' + (next + 1));
      const g = svg.querySelector(`[data-i="${next}"]`);
      g.classList.add('pulse');
      setTimeout(() => g.classList.remove('pulse'), 700);
      return;
    }
    next++;
    line.setAttribute('points', P.slice(0, next).map(p => p.join(',')).join(' '));
    sfx.pop();
    if (next === P.length) {
      won = true;
      line.setAttribute('points', [...P, P[0]].map(p => p.join(',')).join(' '));
      svg.classList.add('won');
      paintLabels();
      later(() => complete(a, a.win || 'You joined every dot!'), 450);
      return;
    }
    paintLabels();
  };
  const pointerHit = e => {
    const [x, y] = pt(e, svg, view.w, view.h);
    const local = [view.x + x, view.y + y];
    const near = L.nearestIndex(P, local[0], local[1]);
    const box = svg.getBoundingClientRect();
    const unit = view.w / Math.max(box.width, 1);
    const slop = Math.max(36 * unit, 28);
    if (near.distance > slop && near.index !== next) return;
    hit(near.distance <= slop ? near.index : next);
  };
  svg.addEventListener('pointerup', pointerHit);
  svg.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(next); }
  });
  app.replaceChildren(shell(a, counter, layer));
  paintLabels();
}

/* ===== quiz ===== */
function quizAct(a) {
  let q = 0, locked = false;
  const box = el('div', { class: 'quiz', 'aria-live': 'polite' });
  const show = () => {
    locked = false;
    const [text, opts, ans, why] = a.qs[q];
    box.replaceChildren(
      el('p', { class: 'q-n' }, `Question ${q + 1} of ${a.qs.length}`),
      el('p', { class: 'q' },
        el('button', { class: 'say', type: 'button', 'aria-label': 'Read the question aloud', onclick: () => speak(String(text).replaceAll('____', 'blank')) }, '🔊'),
        text),
      el('div', { class: 'opts', role: 'group', 'aria-label': 'Answers' }, opts.map((o, k) => el('button', {
        class: 'opt', type: 'button',
        onclick: e => {
          if (locked) return;
          if (k === ans) {
            locked = true;
            e.currentTarget.classList.add('right');
            sfx.good();
            box.querySelectorAll('.opt').forEach(b => { b.disabled = true; });
            if (why) box.append(el('p', { class: 'why' }, why));
            later(() => {
              q++;
              if (q < a.qs.length) show();
              else complete(a, a.win || (a.id === 'rhyme' ? 'Rhyme time champion!' : 'Super smart explorer!'));
            }, why ? 1600 : 800);
          } else {
            e.currentTarget.classList.add('wrong');
            e.currentTarget.disabled = true;
            sfx.bad();
            say('Try again!');
          }
        }
      }, o))));
  };
  app.replaceChildren(shell(a,
    a.scene ? el('div', { class: 'stage' }, el('img', { src: a.scene, alt: a.sceneAlt || 'Picture to look at', width: 880, height: 880 })) : null,
    box));
  show();
}

/* ===== matching ===== */
function matchAct(a) {
  const R = L.rng(a.seed || 3);
  const order = a.pairs.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = R() * (i + 1) | 0; [order[i], order[j]] = [order[j], order[i]]; }
  let picked = null, matched = 0, won = false;
  const speakWord = i => speak(a.pairs[i][4] || a.pairs[i][0], a.lang);
  const chips = el('div', { class: 'chips' }, order.map(i => {
    const [w, sound] = a.pairs[i];
    const label = sound ? `${w}. ${sound}` : w;
    return el('button', { class: 'chip', type: 'button', 'data-i': i, 'aria-label': label }, el('b', {}, w), sound ? el('small', {}, sound) : null);
  }));
  const targets = el('div', { class: 'targets' }, a.pairs.map(([, , em, mean], i) => el('div', {
    class: 'tgt', 'data-i': i, role: 'button', tabindex: 0, 'aria-label': 'Match to ' + mean
  }, el('span', { class: 'em', 'aria-hidden': 'true' }, em), el('span', {}, mean))));
  const tryMatch = (chip, tgt) => {
    if (won || !chip || !tgt || tgt.classList.contains('ok')) return;
    if (chip.dataset.i === tgt.dataset.i) {
      const pair = a.pairs[+chip.dataset.i];
      tgt.classList.add('ok');
      tgt.append(el('b', { class: 'got' }, pair[0]));
      chip.remove();
      sfx.good();
      say(pair[0] + ' means ' + pair[3]);
      picked = null;
      if (++matched === a.pairs.length) {
        won = true;
        later(() => complete(a, a.win || 'You matched them all!'), 400);
      }
    } else {
      sfx.bad();
      tgt.classList.add('shake');
      setTimeout(() => tgt.classList.remove('shake'), 400);
    }
  };
  let ghost = null, from = null, moved = false, origin = null;
  chips.addEventListener('pointerdown', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    from = c; moved = false; origin = { x: e.clientX, y: e.clientY };
    c.setPointerCapture(e.pointerId);
    speakWord(+c.dataset.i);
  });
  chips.addEventListener('pointermove', e => {
    if (!from) return;
    if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) < 8) return;
    if (!ghost) { ghost = from.cloneNode(true); ghost.classList.add('ghost'); document.body.append(ghost); }
    moved = true;
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
  });
  chips.addEventListener('pointerup', e => {
    if (!from) return;
    if (ghost) { ghost.remove(); ghost = null; }
    if (moved) {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      tryMatch(from, t && t.closest('.tgt'));
    } else {
      chips.querySelectorAll('.chip').forEach(node => node.classList.remove('sel'));
      picked = from;
      from.classList.add('sel');
    }
    from = null;
  });
  chips.addEventListener('pointercancel', () => { if (ghost) ghost.remove(); ghost = null; from = null; });
  chips.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest('.chip');
    if (!c) return;
    e.preventDefault();
    chips.querySelectorAll('.chip').forEach(node => node.classList.remove('sel'));
    picked = c; c.classList.add('sel');
    speakWord(+c.dataset.i);
  });
  const onTarget = t => { if (picked && t) { tryMatch(picked, t); picked = null; chips.querySelectorAll('.chip').forEach(node => node.classList.remove('sel')); } };
  targets.addEventListener('click', e => onTarget(e.target.closest('.tgt')));
  targets.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && picked) { e.preventDefault(); onTarget(e.target.closest('.tgt')); }
  });
  app.replaceChildren(shell(a, chips, targets));
}

/* ===== story order ===== */
function orderAct(a) {
  const R = L.rng(a.seed || 9);
  const ord = a.pics.map((_, i) => i);
  const shuffle = () => { for (let i = ord.length - 1; i > 0; i--) { const j = R() * (i + 1) | 0; [ord[i], ord[j]] = [ord[j], ord[i]]; } };
  shuffle();
  if (ord.every((v, i) => v === i)) shuffle();
  let pick = null, won = false;
  const row = el('ol', { class: 'order' });
  const draw = () => {
    row.replaceChildren(...ord.map((p, pos) => el('li', {}, el('button', {
      class: 'ord' + (pick === pos ? ' sel' : ''),
      type: 'button',
      'aria-label': `Picture in spot ${pos + 1}: ${a.pics[p][1]}`,
      onclick: () => {
        if (won) return;
        if (pick === null) { pick = pos; sfx.pop(); draw(); }
        else if (pick === pos) { pick = null; draw(); }
        else {
          [ord[pick], ord[pos]] = [ord[pos], ord[pick]];
          pick = null;
          sfx.pop();
          draw();
          if (ord.every((v, i) => v === i)) {
            won = true;
            row.classList.add('won');
            later(() => complete(a, a.win || 'You told the story in order!'), 400);
          }
        }
      }
    }, el('span', { class: 'ord-n' }, String(pos + 1)), el('img', { src: a.pics[p][0], alt: '', width: 300, height: 300 }), el('span', { class: 'ord-t' }, a.pics[p][1])))));
  };
  app.replaceChildren(shell(a, row));
  draw();
}

/* ===== picture puzzle ===== */
function puzzleAct(a) {
  const n = a.n || 3, T = n * n;
  const R = L.rng(a.seed || 4);
  const ord = [...Array(T).keys()];
  const shuffle = () => { for (let i = ord.length - 1; i > 0; i--) { const j = R() * (i + 1) | 0; [ord[i], ord[j]] = [ord[j], ord[i]]; } };
  shuffle();
  if (ord.every((v, i) => v === i)) shuffle();
  let pick = null, won = false;
  const g = el('div', { class: 'puz', style: `--n:${n}`, role: 'grid', 'aria-label': 'Picture puzzle. Tap two tiles to swap them.' });
  const draw = () => {
    g.replaceChildren(...ord.map((t, pos) => el('button', {
      class: 'tile' + (pick === pos ? ' sel' : '') + (t === pos ? ' ok' : ''),
      type: 'button',
      'aria-label': `Tile ${pos + 1}${t === pos ? ', in the right place' : ''}`,
      style: `background-image:url(${a.img});background-size:${n * 100}% ${n * 100}%;background-position:${(t % n) / (n - 1) * 100}% ${((t / n) | 0) / (n - 1) * 100}%`,
      onclick: () => {
        if (won) return;
        if (pick === null) { pick = pos; sfx.pop(); }
        else if (pick === pos) pick = null;
        else {
          [ord[pick], ord[pos]] = [ord[pos], ord[pick]];
          const landed = ord[pos] === pos;
          pick = null;
          landed ? sfx.good() : sfx.pop();
          if (ord.every((v, i) => v === i)) {
            won = true;
            g.classList.add('won');
            draw();
            later(() => complete(a, a.win || 'Puzzle solved!'), 450);
            return;
          }
        }
        draw();
      }
    })));
  };
  app.replaceChildren(shell(a,
    el('div', { class: 'stage puz-stage' }, g),
    el('details', { class: 'peek' }, el('summary', {}, 'Peek at the picture'), el('img', { src: a.img, alt: 'The finished picture', width: 600, height: 600 }))));
  draw();
}

/* ===== memory ===== */
function memoryAct(a) {
  const R = L.rng(a.seed || 6);
  const deck = a.cards.flatMap((_, i) => [i, i]);
  for (let i = deck.length - 1; i > 0; i--) { const j = R() * (i + 1) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
  let open = [], got = 0, lock = false, won = false;
  const g = el('div', { class: 'mem', role: 'grid', 'aria-label': 'Memory cards' });
  deck.forEach((k, pos) => {
    const b = el('button', { class: 'mcard', type: 'button', 'aria-label': `Card ${pos + 1}, face down` },
      el('span', { class: 'mback', 'aria-hidden': 'true' }, '?'),
      el('img', { src: a.cards[k][0], alt: '', width: 200, height: 200 }));
    b.onclick = () => {
      if (lock || won || b.classList.contains('up')) return;
      b.classList.add('up');
      b.setAttribute('aria-label', a.cards[k][1]);
      say(a.cards[k][1]);
      speak(a.cards[k][1]);
      sfx.pop();
      open.push([b, k]);
      if (open.length === 2) {
        const [[b1, k1], [b2, k2]] = open;
        open = [];
        if (k1 === k2) {
          b1.classList.add('ok'); b2.classList.add('ok');
          sfx.good();
          if (++got === a.cards.length) {
            won = true;
            later(() => complete(a, a.win || 'What a memory!'), 450);
          }
        } else {
          lock = true;
          later(() => {
            [b1, b2].forEach((node, idx) => {
              node.classList.remove('up');
              node.setAttribute('aria-label', `Card, face down`);
            });
            lock = false;
          }, 900);
        }
      }
    };
    g.append(b);
  });
  app.replaceChildren(shell(a, g));
}

/* ===== explorer ID ===== */
function idAct(a) {
  const me = prog.me || {};
  const favs = a.favs || ['Toucan', 'Carnival', 'The statue', 'The beach'];
  const face = el('canvas', { class: 'face', width: 320, height: 200, 'aria-label': 'Draw your face here' });
  let color = '#4a2c48', drawing = false, last = null;
  const fx = face.getContext('2d');
  fx.fillStyle = '#fff';
  fx.fillRect(0, 0, 320, 200);
  fx.lineCap = 'round';
  fx.lineJoin = 'round';
  fx.lineWidth = 6;
  if (me.face) {
    const pic = new Image();
    pic.onload = () => fx.drawImage(pic, 0, 0, 320, 200);
    pic.src = me.face;
  }
  function stroke(x, y) {
    fx.strokeStyle = color;
    fx.beginPath();
    fx.moveTo(last ? last[0] : x, last ? last[1] : y);
    fx.lineTo(x, y);
    fx.stroke();
    last = [x, y];
  }
  face.addEventListener('pointerdown', e => { drawing = true; face.setPointerCapture(e.pointerId); last = null; const [x, y] = pt(e, face, 320, 200); stroke(x, y); });
  face.addEventListener('pointermove', e => { if (!drawing) return; const [x, y] = pt(e, face, 320, 200); stroke(x, y); });
  face.addEventListener('pointerup', () => { drawing = false; last = null; });
  face.addEventListener('pointercancel', () => { drawing = false; last = null; });
  const colours = ['#4a2c48', '#e9785a', '#f6b84b', '#4a7fd1', '#2f9e57', '#e96aa0'];
  const swatches = el('div', { class: 'palette', role: 'radiogroup', 'aria-label': 'Crayon colours' }, colours.map((c, i) => {
    const b = el('button', { class: 'swatch', type: 'button', role: 'radio', 'aria-checked': i === 0 ? 'true' : 'false', 'aria-label': 'Crayon ' + (i + 1), style: `--c:${c}` });
    b.onclick = () => { color = c; swatches.querySelectorAll('.swatch').forEach(s => s.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); };
    return b;
  }));
  const f = el('form', { class: 'idcard' },
    el('label', {}, 'My name is', el('input', { name: 'name', type: 'text', autocomplete: 'off', maxlength: 24, value: me.name || '' })),
    el('label', {}, 'I am', el('input', { name: 'age', type: 'text', inputmode: 'numeric', maxlength: 2, value: me.age || '', 'aria-label': 'Age in years' }), 'years old'),
    el('fieldset', {}, el('legend', {}, 'My favourite thing in ' + (B.place || B.title)), favs.map(o => el('label', { class: 'pick' }, el('input', { type: 'radio', name: 'fav', value: o, checked: me.fav === o ? true : null }), o))),
    el('fieldset', {}, el('legend', {}, 'Draw your face'), face, swatches, btn('Clear drawing', () => { fx.fillStyle = '#fff'; fx.fillRect(0, 0, 320, 200); })),
    el('p', { class: 'note' }, 'Your answers stay on this device only.'),
    el('button', { class: 'btn', type: 'submit' }, 'Save my ID card'));
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (celebrated) return;
    const d = new FormData(f);
    let faceUrl = '';
    try { faceUrl = face.toDataURL('image/webp', .7); } catch { faceUrl = ''; }
    prog.me = { name: String(d.get('name') || '').trim().slice(0, 24), age: String(d.get('age') || '').replace(/\D/g, '').slice(0, 2), fav: d.get('fav') || '', face: faceUrl };
    save();
    complete(a, prog.me.name ? `Welcome aboard, Explorer ${prog.me.name}!` : 'Welcome aboard, explorer!');
  });
  app.replaceChildren(shell(a, f));
}

/* ===== hub ===== */
function hub() {
  const n = L.stickerCount(prog), T = B.activities.length;
  const who = prog.me && prog.me.name ? `${prog.me.name}’s sticker map` : 'My sticker map';
  const map = el('section', { class: 'passport', 'aria-labelledby': 'pp-t' },
    el('h2', { id: 'pp-t' }, who),
    prog.me && prog.me.face ? el('img', { class: 'id-face', src: prog.me.face, alt: 'Your drawing' }) : null,
    el('p', {}, `${n} of ${T} stickers collected`),
    el('div', { class: 'trail', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': T, 'aria-valuenow': n, 'aria-label': 'Stickers collected' },
      el('div', { class: 'trail-fill', style: `width:${n / T * 100}%` }),
      el('img', { class: 'trail-balloon', src: '../../assets/balloon.webp', alt: '', style: `left:${Math.max(6, Math.min(94, n / T * 100))}%` }),
      el('img', { class: 'trail-end', src: B.stamp, alt: '' })),
    n === T ? el('p', { class: 'cert' }, `Certified ${B.place || ''} Explorer! You finished every activity.`) : null);
  const grid = el('ol', { class: 'cards' }, B.activities.map((a, i) => el('li', {}, el('a', {
    class: 'card' + (done(a.id) ? ' done' : ''),
    href: '#' + a.id
  },
    el('span', { class: 'card-img' }, el('img', { src: a.img, alt: '', loading: i > 5 ? 'lazy' : 'eager', decoding: 'async', width: 200, height: 200 })),
    el('span', { class: 'card-n' }, String(i + 1)),
    el('span', { class: 'card-t' }, a.title),
    el('span', { class: 'card-age' }, a.age),
    done(a.id) ? el('span', { class: 'sticker sm' }, el('img', { src: a.img, alt: 'Sticker earned' })) : null))));
  app.replaceChildren(el('div', { class: 'hub' }, map,
    el('h2', { class: 'acts-h' }, 'Pick an activity'),
    grid,
    el('p', { class: 'reset' }, el('button', {
      class: 'link', type: 'button',
      onclick: () => {
        if (confirm('Start over and clear all stickers on this device?')) {
          Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k));
          prog = L.normalizeProgress(null);
          hub();
        }
      }
    }, 'Start over'))));
}

const TYPES = {
  color: a => colorAct(a, false),
  draw: a => colorAct(a, true),
  find: a => hotspotAct(a, false),
  diff: a => hotspotAct(a, true),
  wordsearch: wordsearchAct,
  maze: mazeAct,
  trace: traceAct,
  dots: dotsAct,
  quiz: quizAct,
  match: matchAct,
  idcard: idAct,
  order: orderAct,
  puzzle: puzzleAct,
  memory: memoryAct
};

function route() {
  routeToken++;
  timers.forEach(clearTimeout);
  timers = [];
  celebrated = false;
  document.querySelectorAll('.cheer,.confetti-c').forEach(c => c.remove());
  const id = location.hash.slice(1);
  const activity = B.activities.find(x => x.id === id);
  const intro = document.querySelector('.intro');
  if (intro) intro.hidden = !!activity;
  if (activity && TYPES[activity.type]) {
    TYPES[activity.type](activity);
    document.title = `${activity.title} · ${B.title} worksheets · Stu’s 7 Wonders`;
  } else {
    if (activity && !TYPES[activity.type]) app.replaceChildren(el('p', { class: 'prompt' }, 'That activity is not ready yet.'));
    else hub();
    const title = document.querySelector('meta[name="ws-title"]');
    document.title = title ? title.content : B.title + ' worksheets';
  }
  scrollTo(0, 0);
  const h = app.querySelector('h1,h2');
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
}
addEventListener('hashchange', route);
const mb = $('#mute');
const setMute = () => { mb.setAttribute('aria-pressed', muted ? 'true' : 'false'); mb.textContent = muted ? 'Sound off' : 'Sound on'; };
mb.onclick = () => {
  muted = !muted;
  localStorage.setItem('stu-ws-muted', muted ? '1' : '0');
  setMute();
  if (!muted) { try { const a = audio(); if (a.state === 'suspended') a.resume(); } catch { /* ignore */ } sfx.pop(); }
};
setMute();
route();
})();

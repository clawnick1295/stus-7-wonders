/* Stu's 7 Wonders — interactive worksheet engine (no tracking, no network calls besides own assets). */
(() => {
'use strict';
const B = window.WS_BOOK, $ = (s, r = document) => r.querySelector(s), app = $('#app');
const KEY = 'stu-worksheets-' + B.id;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const live = $('#live');
const say = t => { live.textContent = ''; setTimeout(() => live.textContent = t, 30); };
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); return e; };

/* ---------- progress ---------- */
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } };
let prog = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)) } catch {} };
const done = id => !!(prog.done || {})[id];

/* ---------- sound (Web Audio, synthesized; nothing downloaded) ---------- */
let ac; const audio = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
let muted = localStorage.getItem('stu-ws-muted') === '1';
function tone(f, t0, d, type = 'triangle', v = .18) { if (muted) return; const a = audio(), o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, a.currentTime + t0); g.gain.linearRampToValueAtTime(v, a.currentTime + t0 + .02);
  g.gain.exponentialRampToValueAtTime(.001, a.currentTime + t0 + d); o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + d + .05); }
const sfx = {
  good: () => { tone(880, 0, .18); tone(1320, .08, .22) },
  bad: () => { tone(220, 0, .2, 'sine', .12) },
  pop: () => tone(660, 0, .08, 'sine', .1),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * .11, i === 5 ? .6 : .18, 'triangle', .2))
};

/* ---------- confetti ---------- */
function confetti() { if (reduce) return; const c = el('canvas', { class: 'confetti-c', 'aria-hidden': 'true' }); document.body.append(c);
  const x = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight, cols = ['#f6b84b', '#e9785a', '#8fd0a8', '#5bc0be', '#e96aa0', '#8f7be6'];
  const ps = Array.from({ length: 140 }, () => ({ x: W / 2, y: H * .55, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 6, r: Math.random() * 6.28, s: 6 + Math.random() * 7, c: cols[Math.random() * 6 | 0] }));
  let f = 0; (function step() { x.clearRect(0, 0, W, H); ps.forEach(p => { p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
    if (++f < 150) requestAnimationFrame(step); else c.remove(); })(); }

/* ---------- completion ---------- */
function complete(a, msg) {
  const first = !done(a.id);
  prog.done = prog.done || {}; prog.done[a.id] = Date.now(); save();
  sfx.win(); confetti();
  const n = Object.keys(prog.done).length, total = B.activities.length;
  const dlg = el('div', { class: 'cheer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cheer-t' },
    el('div', { class: 'cheer-card' },
      el('img', { src: '../../assets/stu.webp', alt: 'Explorer Stu cheering', class: 'cheer-stu', width: 360, height: 781 }),
      el('div', { class: 'cheer-body' },
        el('p', { class: 'cheer-kick' }, first ? 'New sticker!' : 'Great job again!'),
        el('h2', { id: 'cheer-t' }, msg || 'Hooray! You did it, explorer!'),
        el('div', { class: 'sticker big', 'aria-hidden': 'true' }, el('img', { src: a.img, alt: '' })),
        el('p', {}, `${n} of ${total} stickers collected`),
        el('div', { class: 'row' },
          el('a', { class: 'btn', href: '#' }, 'My sticker map'),
          nextOf(a) ? el('a', { class: 'btn alt', href: '#' + nextOf(a).id }, 'Next activity →') : null))));
  document.body.append(dlg); say((msg || 'Hooray! You did it!') + ` ${n} of ${total} stickers.`);
  const close = () => dlg.remove(); dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('a')) close() });
  addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); removeEventListener('keydown', k) } });
  dlg.querySelector('a').focus();
}
const nextOf = a => { const i = B.activities.indexOf(a); return B.activities.slice(i + 1).find(x => !done(x.id)) || B.activities.find(x => !done(x.id) && x !== a) };

/* ---------- helpers ---------- */
function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src }) }
function pt(e, node, w, h) { const r = node.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * w, (e.clientY - r.top) / r.height * h] }
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 }
function speak(text, lang) { if (muted || !('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(text); u.lang = lang || 'en-US'; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u) }
const PALETTE = ['#e9785a', '#f6b84b', '#f6e27a', '#8fd0a8', '#2f9e57', '#5bc0be', '#4a7fd1', '#8f7be6', '#e96aa0', '#a86b45', '#f3c89b', '#ffffff'];

/* ---------- views ---------- */
function shell(a, ...body) {
  const i = B.activities.indexOf(a);
  return el('article', { class: 'act', 'aria-labelledby': 'act-t' },
    el('header', { class: 'act-head' },
      el('a', { class: 'back', href: '#', 'aria-label': 'Back to all activities' }, '←'),
      el('div', {}, el('p', { class: 'act-n' }, `Activity ${i + 1} of ${B.activities.length} · ${a.age}`), el('h1', { id: 'act-t' }, a.title)),
      done(a.id) ? el('span', { class: 'sticker sm', title: 'Sticker earned' }, el('img', { src: a.img, alt: 'Sticker earned' })) : null),
    el('p', { class: 'prompt' }, el('button', { class: 'say', 'aria-label': 'Read the instructions aloud', onclick: () => speak(a.prompt) }, '🔊'), a.prompt),
    ...body);
}

/* ===== colour / draw ===== */
async function colorAct(a, drawMode) {
  const pal = a.palette || PALETTE; let col = pal[0], tool = drawMode ? 'brush' : 'fill', fills = 0;
  const cv = el('canvas', { class: 'paint', role: 'img', 'aria-label': 'Colouring picture: ' + a.title });
  const sw = el('div', { class: 'palette', role: 'radiogroup', 'aria-label': 'Colours' });
  pal.forEach((c, k) => { const b = el('button', { class: 'swatch', role: 'radio', 'aria-checked': k === 0 ? 'true' : 'false', 'aria-label': 'Colour ' + (k + 1) + (c === '#ffffff' ? ' (white / eraser)' : ''), style: `--c:${c}` });
    b.onclick = () => { col = c; sw.querySelectorAll('.swatch').forEach(s => s.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); sfx.pop() }; sw.append(b) });
  const tools = el('div', { class: 'tools' });
  const tb = (t, label) => el('button', { class: 'tool' + (tool === t ? ' on' : ''), 'aria-pressed': tool === t ? 'true' : 'false', onclick: e => { tool = t; tools.querySelectorAll('.tool').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false') }); e.currentTarget.classList.add('on'); e.currentTarget.setAttribute('aria-pressed', 'true') } }, label);
  tools.append(tb('fill', '🪣 Fill'), tb('brush', '🖍️ Crayon'), el('button', { class: 'tool', onclick: () => undo() }, '↩︎ Undo'), el('button', { class: 'tool', onclick: () => finish() }, '✅ I’m done'));
  app.replaceChildren(shell(a, el('div', { class: 'stage' }, cv), sw, tools));
  const img = await loadImg(a.img); const W = cv.width = img.naturalWidth, H = cv.height = img.naturalHeight;
  const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const g = x.getImageData(0, 0, W, H).data, N = W * H;
  const lum = new Uint8Array(N), wall = new Uint8Array(N);
  for (let i = 0; i < N; i++) { lum[i] = g[i * 4]; wall[i] = g[i * 4] < 170 ? 1 : 0 }
  // close hairline gaps: dilate walls by 1px
  const w2 = wall.slice(); for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) { const i = y * W + xx; if (!wall[i] && (wall[i - 1] || wall[i + 1] || wall[i - W] || wall[i + W])) w2[i] = 1 }
  const paint = new Uint32Array(N).fill(0xffffffff); const hist = [];
  const out = x.createImageData(W, H), o32 = new Uint32Array(out.data.buffer);
  const sk = cv.dataset.key = KEY + '-paint-' + a.id;
  function render() { for (let i = 0; i < N; i++) { const p = paint[i], l = lum[i] / 255; const r = (p & 255) * l, gg = ((p >> 8) & 255) * l, b = ((p >> 16) & 255) * l; o32[i] = 0xff000000 | (b << 16) | (gg << 8) | r } x.putImageData(out, 0, 0) }
  const hex = c => { const n = parseInt(c.slice(1), 16); return 0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16) };
  function fill(px, py) { px |= 0; py |= 0; let s = py * W + px; if (w2[s]) { // tapped a line: look for nearest open pixel
      let best = -1; for (let r = 1; r < 8 && best < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const q = (py + dy) * W + px + dx; if (q >= 0 && q < N && !w2[q]) { best = q; break } } if (best < 0) return; s = best }
    const target = paint[s], c = hex(col); if (target === c) return; hist.push(paint.slice()); if (hist.length > 15) hist.shift();
    const st = [s]; while (st.length) { let i = st.pop(); let y = (i / W) | 0, lx = i; while (lx % W > 0 && !w2[lx - 1] && paint[lx - 1] === target) lx--; let up = false, dn = false;
      for (let j = lx; j < (y + 1) * W && !w2[j] && paint[j] === target; j++) { paint[j] = c;
        if (y > 0) { const u = j - W; if (!w2[u] && paint[u] === target) { if (!up) { st.push(u); up = true } } else up = false }
        if (y < H - 1) { const d = j + W; if (!w2[d] && paint[d] === target) { if (!dn) { st.push(d); dn = true } } else dn = false } } }
    // paint line pixels touching the region lightly so anti-aliased edges don't leave white halos
    render(); fills++; sfx.pop(); persist(); if (!drawMode && a.goal && fills === a.goal) finish() }
  let last = null;
  function brush(px, py) { const c = hex(col), R = Math.max(5, W / 110); const x0 = last ? last[0] : px, y0 = last ? last[1] : py; const steps = Math.max(1, Math.hypot(px - x0, py - y0) / 2);
    for (let k = 0; k <= steps; k++) { const cx = x0 + (px - x0) * k / steps, cy = y0 + (py - y0) * k / steps; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R) { const X = cx + dx | 0, Y = cy + dy | 0; if (X >= 0 && Y >= 0 && X < W && Y < H) paint[Y * W + X] = c } }
    last = [px, py]; render() }
  function undo() { if (hist.length) { paint.set(hist.pop()); render(); persist() } }
  let pt0; cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); const [px, py] = pt(e, cv, W, H); pt0 = [px, py]; if (tool === 'fill') fill(px, py); else { hist.push(paint.slice()); last = null; brush(px, py) } });
  cv.addEventListener('pointermove', e => { if (tool === 'brush' && e.buttons) { const [px, py] = pt(e, cv, W, H); brush(px, py) } });
  cv.addEventListener('pointerup', () => { if (tool === 'brush') { last = null; fills++; persist() } });
  let tm; function persist() { clearTimeout(tm); tm = setTimeout(() => { try { const c2 = document.createElement('canvas'); c2.width = W / 2; c2.height = H / 2; c2.getContext('2d').drawImage(cv, 0, 0, W / 2, H / 2); localStorage.setItem(sk, c2.toDataURL('image/webp', .6)) } catch {} }, 600) }
  function finish() { complete(a, drawMode ? 'What a beautiful balloon!' : 'Beautiful colouring!') }
  render();
}

/* ===== find & diff ===== */
function hotspotAct(a, isDiff) {
  const S = a.scale, rad = a.rad || S * 0.068; let found = new Set(), total;
  const targets = isDiff ? a.diffs.map((p, i) => ({ k: 'd' + i, name: a.desc[i], p })) : Object.entries(a.items).flatMap(([name, ps]) => ps.map((p, i) => ({ k: name + i, name, p })));
  total = targets.length;
  const counter = el('p', { class: 'counter', 'aria-live': 'polite' });
  const mkLayer = src => { const wrap = el('div', { class: 'scene' }, el('img', { src, alt: isDiff ? '' : a.title + ' scene', width: 1100, height: 1100, draggable: 'false' })); return wrap };
  const list = el('ul', { class: 'checklist' });
  const upd = () => { counter.textContent = isDiff ? `${found.size} of ${total} differences found` : `${found.size} of ${total} found`;
    if (!isDiff) list.querySelectorAll('li').forEach(li => { const n = li.dataset.name, all = targets.filter(t => t.name === n), f = all.filter(t => found.has(t.k)).length; li.querySelector('b').textContent = `${f}/${all.length}`; li.classList.toggle('ok', f === all.length) }) };
  if (!isDiff) { [...new Set(targets.map(t => t.name))].forEach(name => { const t = targets.find(t => t.name === name); const z = S * 0.118, s = 64;
    list.append(el('li', { 'data-name': name }, el('span', { class: 'thumb', 'aria-hidden': 'true', style: `background-image:url(${a.img});background-size:${S / z * s}px;background-position:${-(t.p[0] - z / 2) / z * s}px ${-(t.p[1] - z / 2) / z * s}px` }), el('span', {}, name), el('b', {}))) }) }
  const A = isDiff ? mkLayer(a.a) : null, Bn = mkLayer(isDiff ? a.b : a.img);
  if (A) A.querySelector('img').alt = 'Picture 1: the original'; if (isDiff) Bn.querySelector('img').alt = 'Picture 2: with changes. Tap the changes.';
  const tap = (layer) => e => { const [x, y] = pt(e, layer, S, S); const hit = targets.find(t => !found.has(t.k) && Math.hypot(t.p[0] - x, t.p[1] - y) < rad);
    if (hit) { found.add(hit.k); [A, Bn].filter(Boolean).forEach(L => L.append(el('span', { class: 'ring', style: `left:${hit.p[0] / S * 100}%;top:${hit.p[1] / S * 100}%` }))); sfx.good(); say(hit.name + '!'); upd(); if (found.size === total) setTimeout(() => complete(a, isDiff ? 'You spotted every difference!' : 'You found them all!'), 500) }
    else { sfx.bad(); const m = el('span', { class: 'miss', style: `left:${x / S * 100}%;top:${y / S * 100}%` }); layer.append(m); setTimeout(() => m.remove(), 600) } };
  [A, Bn].filter(Boolean).forEach(L => L.addEventListener('pointerdown', tap(L)));
  const hint = el('button', { class: 'tool', onclick: () => { const t = targets.find(t => !found.has(t.k)); if (!t) return; [A, Bn].filter(Boolean).forEach(L => { const h = el('span', { class: 'hint', style: `left:${t.p[0] / S * 100}%;top:${t.p[1] / S * 100}%` }); L.append(h); setTimeout(() => h.remove(), 1800) }); say('Look here: ' + t.name) } }, '💡 Hint');
  app.replaceChildren(shell(a, counter, isDiff ? el('div', { class: 'pair' }, A, Bn) : el('div', { class: 'stage' }, Bn), isDiff ? null : list, el('div', { class: 'tools' }, hint)));
  upd();
}

/* ===== word search ===== */
function wsGrid(a) { const N = a.size, R = rng(a.seed), dirs = { across: [[0, 1]], down: [[1, 0]], diagonal: [[1, 1], [-1, 1]] };
  const D = a.dirs.flatMap(d => dirs[d]); for (let tries = 0; tries < 400; tries++) { const g = Array.from({ length: N }, () => Array(N).fill('')), pos = {}; let ok = true;
    for (const w of [...a.words].sort((p, q) => q.length - p.length)) { let placed = false;
      for (let t = 0; t < 300 && !placed; t++) { const [dr, dc] = D[R() * D.length | 0], r0 = R() * N | 0, c0 = R() * N | 0; const cells = [];
        for (let k = 0; k < w.length; k++) { const r = r0 + dr * k, c = c0 + dc * k; if (r < 0 || c < 0 || r >= N || c >= N || (g[r][c] && g[r][c] !== w[k])) { cells.length = 0; break } cells.push([r, c]) }
        if (cells.length === w.length) { cells.forEach(([r, c], k) => g[r][c] = w[k]); pos[w] = cells; placed = true } }
      if (!placed) { ok = false; break } }
    if (ok) { const L = 'ABCDEFGHIJKLMNOPRSTUVWY'; g.forEach(row => row.forEach((v, c) => { if (!v) row[c] = L[R() * L.length | 0] })); return { g, pos } } } }
function wordsearchAct(a) {
  const { g, pos } = wsGrid(a), N = a.size, found = new Set(); let sel = null, startCell = null;
  const grid = el('div', { class: 'ws', style: `--n:${N}`, role: 'grid', 'aria-label': 'Word search letters' });
  const cells = []; g.forEach((row, r) => row.forEach((ch, c) => { const b = el('button', { class: 'cell', 'data-r': r, 'data-c': c, 'aria-label': `${ch}, row ${r + 1}, column ${c + 1}` }, ch); cells.push(b); grid.append(b) }));
  const words = el('ul', { class: 'words' }, a.words.map(w => el('li', { 'data-w': w }, w)));
  const cellAt = e => { const t = document.elementFromPoint(e.clientX, e.clientY); return t && t.closest && t.closest('.cell') };
  const line = (s, t) => { const r0 = +s.dataset.r, c0 = +s.dataset.c, r1 = +t.dataset.r, c1 = +t.dataset.c, dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0), n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
    if (!(r0 === r1 || c0 === c1 || Math.abs(r1 - r0) === Math.abs(c1 - c0))) return [s]; return Array.from({ length: n + 1 }, (_, k) => cells[(r0 + dr * k) * N + c0 + dc * k]) };
  const paint = arr => { cells.forEach(c => c.classList.remove('sel')); arr.forEach(c => c.classList.add('sel')) };
  function check(arr) { const word = arr.map(c => c.textContent).join(''), rev = [...word].reverse().join('');
    const w = a.words.find(w => !found.has(w) && (w === word || w === rev) && pos[w].every(([r, c]) => arr.some(x => +x.dataset.r === r && +x.dataset.c === c)));
    paint([]); if (w) { found.add(w); const hue = [20, 45, 140, 190, 260, 330][found.size % 6]; arr.forEach(c => { c.classList.add('hit'); c.style.setProperty('--h', hue) }); words.querySelector(`[data-w="${w}"]`).classList.add('ok'); sfx.good(); say('You found ' + w);
      if (found.size === a.words.length) setTimeout(() => complete(a, 'Word search wizard!'), 400) } else if (arr.length > 1) sfx.bad() }
  let dragged = false;
  grid.addEventListener('pointerdown', e => { const c = cellAt(e); if (!c) return; e.preventDefault(); grid.setPointerCapture(e.pointerId); dragged = false; sel = [c]; if (!startCell) paint([c]) });
  grid.addEventListener('pointermove', e => { if (!sel) return; const c = cellAt(e); if (c && c !== sel[0]) { dragged = true; paint(line(sel[0], c)) } });
  grid.addEventListener('pointerup', e => { if (!sel) return; const c = cellAt(e) || sel[0];
    if (dragged) { check(line(sel[0], c)); startCell = null } else { // tap mode: first tap marks start, second tap marks end
      if (!startCell) { startCell = c; c.classList.add('sel'); sfx.pop() } else { check(line(startCell, c)); startCell = null } } sel = null });
  grid.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const c = e.target.closest('.cell'); if (!c) return; if (!startCell) { startCell = c; c.classList.add('sel') } else { check(line(startCell, c)); startCell = null } } });
  app.replaceChildren(shell(a, el('div', { class: 'ws-wrap' }, grid, words)));
}

/* ===== maze ===== */
function mazeAct(a) {
  const R = a.rows, C = a.cols, rnd = rng(a.seed), walls = Array.from({ length: R * C }, () => [1, 1, 1, 1]); // N E S W
  const seen = new Uint8Array(R * C), st = [0]; seen[0] = 1; const DV = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  while (st.length) { const i = st[st.length - 1], r = i / C | 0, c = i % C; const opts = [0, 1, 2, 3].filter(d => { const rr = r + DV[d][0], cc = c + DV[d][1]; return rr >= 0 && cc >= 0 && rr < R && cc < C && !seen[rr * C + cc] });
    if (!opts.length) { st.pop(); continue } const d = opts[rnd() * opts.length | 0], j = (r + DV[d][0]) * C + c + DV[d][1]; walls[i][d] = 0; walls[j][(d + 2) % 4] = 0; seen[j] = 1; st.push(j) }
  const cs = 100, P = 10, Wd = C * cs + P * 2, Hd = R * cs + P * 2; let d = '';
  walls.forEach((w, i) => { const x = P + (i % C) * cs, y = P + (i / C | 0) * cs; if (w[0] && i >= C) d += `M${x} ${y}h${cs}`; if (w[1] && i % C < C - 1) d += `M${x + cs} ${y}v${cs}`; });
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${Wd} ${Hd}`); svg.setAttribute('class', 'maze'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `Maze, ${R} by ${C}. Use the arrow keys or drag to move.`); svg.tabIndex = 0;
  svg.innerHTML = `<rect x="${P}" y="${P}" width="${C * cs}" height="${R * cs}" rx="18" class="mz-bg"/><path d="${d}" class="mz-wall"/><rect x="${P}" y="${P}" width="${C * cs}" height="${R * cs}" rx="18" class="mz-frame"/>
    <polyline class="mz-trail" points=""/><image href="${a.end}" x="${P + (C - 1) * cs + 8}" y="${P + (R - 1) * cs + 4}" width="${cs - 16}" height="${cs - 8}"/><image class="mz-me" href="${a.start}" width="${cs * .8}" height="${cs * .8}"/>`;
  let cur = 0, trail = [0]; const me = svg.querySelector('.mz-me'), tr = svg.querySelector('.mz-trail');
  const cxy = i => [P + (i % C) * cs + cs / 2, P + (i / C | 0) * cs + cs / 2];
  const draw = () => { const [x, y] = cxy(cur); me.setAttribute('x', x - cs * .4); me.setAttribute('y', y - cs * .45); tr.setAttribute('points', trail.map(cxy).map(p => p.join(',')).join(' ')) };
  const move = dd => { const r = cur / C | 0, c = cur % C; if (walls[cur][dd]) return false; const j = (r + DV[dd][0]) * C + c + DV[dd][1];
    const k = trail.lastIndexOf(j); if (k >= 0) trail = trail.slice(0, k + 1); else trail.push(j); cur = j; draw(); if (cur === R * C - 1) { svg.classList.add('won'); setTimeout(() => complete(a, 'You made it through the maze!'), 300) } return true };
  let drag = false; svg.addEventListener('pointerdown', e => { const [x, y] = pt(e, svg, Wd, Hd); const [mx, my] = cxy(cur); if (Math.hypot(x - mx, y - my) < cs * .9) { drag = true; svg.setPointerCapture(e.pointerId) } });
  svg.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = pt(e, svg, Wd, Hd); const c = Math.floor((x - P) / cs), r = Math.floor((y - P) / cs); if (r < 0 || c < 0 || r >= R || c >= C) return; const j = r * C + c; if (j === cur) return;
    const cr = cur / C | 0, cc = cur % C; const dd = r === cr - 1 && c === cc ? 0 : c === cc + 1 && r === cr ? 1 : r === cr + 1 && c === cc ? 2 : c === cc - 1 && r === cr ? 3 : -1; if (dd >= 0 && move(dd)) sfx.pop() });
  svg.addEventListener('pointerup', () => drag = false);
  svg.addEventListener('keydown', e => { const m = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (m != null) { e.preventDefault(); move(m) ? sfx.pop() : sfx.bad() } });
  app.replaceChildren(shell(a, el('div', { class: 'stage maze-stage' }, svg), el('div', { class: 'tools' }, el('button', { class: 'tool', onclick: () => { cur = 0; trail = [0]; draw() } }, '↺ Start again'))));
  draw();
}

/* ===== trace (map) ===== */
async function traceAct(a) {
  const img = await loadImg(a.img), W = img.naturalWidth, H = img.naturalHeight, path = a.path; let next = 0;
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'trace'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Map with a dotted flight path from Stu’s home to Rio');
  svg.innerHTML = `<image href="${a.img}" width="${W}" height="${H}"/><polyline class="tr-ink" points=""/>${path.map((p, i) => `<circle class="tr-pt" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="${i === 0 ? 26 : 14}"/>`).join('')}`;
  const ink = svg.querySelector('.tr-ink'); let pts = [], on = false;
  svg.addEventListener('pointerdown', e => { const [x, y] = pt(e, svg, W, H); if (Math.hypot(x - path[next][0], y - path[next][1]) < 60 || next > 0) { on = true; svg.setPointerCapture(e.pointerId) } });
  svg.addEventListener('pointermove', e => { if (!on) return; const [x, y] = pt(e, svg, W, H); pts.push(`${x | 0},${y | 0}`); ink.setAttribute('points', pts.join(' '));
    if (next < path.length && Math.hypot(x - path[next][0], y - path[next][1]) < 48) { svg.querySelector(`[data-i="${next}"]`).classList.add('ok'); next++; sfx.pop();
      if (next === path.length) { on = false; setTimeout(() => complete(a, a.win || 'Stu made it to Rio!'), 300) } } });
  svg.addEventListener('pointerup', () => on = false);
  const skip = el('button', { class: 'tool', onclick: () => { path.forEach((_, i) => svg.querySelector(`[data-i="${i}"]`).classList.add('ok')); ink.setAttribute('points', path.map(p => p.join(',')).join(' ')); complete(a, a.win || 'Stu made it to Rio!') } }, '⌨️ Fly for me');
  app.replaceChildren(shell(a, el('div', { class: 'stage' }, svg), el('div', { class: 'tools' }, el('button', { class: 'tool', onclick: () => { next = 0; pts = []; ink.setAttribute('points', ''); svg.querySelectorAll('.tr-pt').forEach(c => c.classList.remove('ok')) } }, '↺ Start again'), skip)));
}

/* ===== dot-to-dot ===== */
function dotsAct(a) {
  const P = a.dots || B.dots, xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min(...xs) - 90, y0 = Math.min(...ys) - 90, W = Math.max(...xs) - x0 + 90, H = Math.max(...ys) - y0 + 90; let next = 0;
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `${x0} ${y0} ${W} ${H}`); svg.setAttribute('class', 'dots');
  svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', `Dot to dot with ${P.length} dots`);
  svg.innerHTML = `<polygon class="dt-fill" points="${P.map(p => p.join(',')).join(' ')}"/><polyline class="dt-line" points=""/>` + P.map((p, i) => `<g class="dt" data-i="${i}" tabindex="0" role="button" aria-label="Dot ${i + 1}"><circle cx="${p[0]}" cy="${p[1]}" r="38" class="dt-hit"/><circle cx="${p[0]}" cy="${p[1]}" r="13" class="dt-dot"/><text x="${p[0] + 22}" y="${p[1] - 18}">${i + 1}</text></g>`).join('');
  const line = svg.querySelector('.dt-line');
  const hit = i => { if (i !== next) { sfx.bad(); say('Find dot number ' + (next + 1)); const g = svg.querySelector(`[data-i="${next}"]`); g.classList.add('pulse'); setTimeout(() => g.classList.remove('pulse'), 900); return }
    svg.querySelector(`[data-i="${i}"]`).classList.add('ok'); next++; line.setAttribute('points', P.slice(0, next).map(p => p.join(',')).join(' ')); sfx.pop();
    if (next === P.length) { line.setAttribute('points', [...P, P[0]].map(p => p.join(',')).join(' ')); svg.classList.add('won'); setTimeout(() => complete(a, a.win || 'You drew Christ the Redeemer!'), 500) } };
  svg.addEventListener('pointerdown', e => { const g = e.target.closest('.dt'); if (g) hit(+g.dataset.i) });
  svg.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.dt')) { e.preventDefault(); hit(+e.target.closest('.dt').dataset.i) } });
  app.replaceChildren(shell(a, el('div', { class: 'stage' }, svg)));
}

/* ===== quiz ===== */
function quizAct(a) {
  let q = 0, right = 0; const box = el('div', { class: 'quiz', 'aria-live': 'polite' });
  const show = () => { const [text, opts, ans, why] = a.qs[q];
    box.replaceChildren(el('p', { class: 'q-n' }, `Question ${q + 1} of ${a.qs.length}`), el('p', { class: 'q' }, el('button', { class: 'say', 'aria-label': 'Read the question aloud', onclick: () => speak(text.replace('____', 'blank')) }, '🔊'), text),
      el('div', { class: 'opts' }, opts.map((o, k) => el('button', { class: 'opt', onclick: e => {
        if (k === ans) { e.currentTarget.classList.add('right'); right++; sfx.good(); box.querySelectorAll('.opt').forEach(b => b.disabled = true);
          if (why) box.append(el('p', { class: 'why' }, '⭐ ' + why)); setTimeout(() => { q++; q < a.qs.length ? show() : complete(a, a.type === 'quiz' && a.id === 'rhyme' ? 'Rhyme time champion!' : 'Super smart explorer!') }, why ? 1700 : 900) }
        else { e.currentTarget.classList.add('wrong'); e.currentTarget.disabled = true; sfx.bad(); say('Try again!') } } }, o)))) };
  app.replaceChildren(shell(a, a.scene ? el('div', { class: 'stage' }, el('img', { src: a.scene, alt: 'The Carnival picture to count from', width: 1100, height: 1100 })) : null, box)); show();
}

/* ===== drag & drop matching ===== */
function matchAct(a) {
  const R = rng(3), order = a.pairs.map((_, i) => i).sort(() => R() - .5); let picked = null, matched = 0;
  const chips = el('div', { class: 'chips' }, order.map(i => { const [w, sound] = a.pairs[i]; return el('button', { class: 'chip', 'data-i': i, 'aria-label': `${w}, sounds like ${sound}` }, el('b', {}, w), el('small', {}, sound)) }));
  const targets = el('div', { class: 'targets' }, a.pairs.map(([, , em, mean], i) => el('div', { class: 'tgt', 'data-i': i, role: 'button', tabindex: 0, 'aria-label': 'Picture: ' + mean }, el('span', { class: 'em', 'aria-hidden': 'true' }, em), el('span', {}, mean))));
  const tryMatch = (chip, tgt) => { if (!chip || !tgt || tgt.classList.contains('ok')) return; if (chip.dataset.i === tgt.dataset.i) { tgt.classList.add('ok'); tgt.append(el('b', { class: 'got' }, a.pairs[+chip.dataset.i][0])); chip.remove(); sfx.good(); say('Yes! ' + a.pairs[+tgt.dataset.i][0] + ' means ' + a.pairs[+tgt.dataset.i][3]); if (++matched === a.pairs.length) setTimeout(() => complete(a, a.win || 'Muito bem! (Very good!)'), 400) } else { sfx.bad(); tgt.classList.add('shake'); setTimeout(() => tgt.classList.remove('shake'), 400) } };
  let ghost = null, from = null, moved = false;
  chips.addEventListener('pointerdown', e => { const c = e.target.closest('.chip'); if (!c) return; from = c; moved = false; c.setPointerCapture(e.pointerId); speak(a.pairs[+c.dataset.i][0], a.lang) });
  chips.addEventListener('pointermove', e => { if (!from) return; if (!ghost) { ghost = from.cloneNode(true); ghost.classList.add('ghost'); document.body.append(ghost) } moved = true; ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px' });
  chips.addEventListener('pointerup', e => { if (!from) return; if (ghost) { ghost.remove(); ghost = null } if (moved) { const t = document.elementFromPoint(e.clientX, e.clientY); tryMatch(from, t && t.closest('.tgt')) } else { chips.querySelectorAll('.chip').forEach(x => x.classList.remove('sel')); picked = from; from.classList.add('sel') } from = null });
  chips.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const c = e.target.closest('.chip'); if (c) { e.preventDefault(); picked = c; c.classList.add('sel'); speak(a.pairs[+c.dataset.i][0], a.lang) } } });
  targets.addEventListener('click', e => { const t = e.target.closest('.tgt'); if (picked) { tryMatch(picked, t); picked = null } });
  targets.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && picked) { e.preventDefault(); tryMatch(picked, e.target.closest('.tgt')); picked = null } });
  app.replaceChildren(shell(a, chips, targets));
}


/* ===== story order (tap two pictures to swap) ===== */
function orderAct(a) {
  const R = rng(a.seed || 9); let ord = a.pics.map((_, i) => i); do { ord.sort(() => R() - .5) } while (ord.every((v, i) => v === i));
  let pick = null; const row = el('ol', { class: 'order' });
  const draw = () => { row.replaceChildren(...ord.map((p, pos) => el('li', {}, el('button', { class: 'ord' + (pick === pos ? ' sel' : ''), 'aria-label': `Picture in spot ${pos + 1}: ${a.pics[p][1]}`, onclick: () => {
      if (pick === null) { pick = pos; sfx.pop(); draw() } else { [ord[pick], ord[pos]] = [ord[pos], ord[pick]]; pick = null; sfx.pop(); draw();
        if (ord.every((v, i) => v === i)) { row.classList.add('won'); setTimeout(() => complete(a, a.win || 'You told the story in order!'), 400) } } } },
      el('span', { class: 'ord-n' }, pos + 1), el('img', { src: a.pics[p][0], alt: '', loading: 'lazy', width: 300, height: 300 }), el('span', { class: 'ord-t' }, a.pics[p][1])))) ) };
  app.replaceChildren(shell(a, row)); draw();
}

/* ===== picture puzzle (tap two tiles to swap) ===== */
function puzzleAct(a) {
  const n = a.n || 3, T = n * n, R = rng(a.seed || 4); let ord = [...Array(T).keys()]; do { ord.sort(() => R() - .5) } while (ord.some((v, i) => v === i) && ord.filter((v, i) => v === i).length > 2);
  let pick = null; const g = el('div', { class: 'puz', style: `--n:${n}`, role: 'grid', 'aria-label': 'Picture puzzle' });
  const draw = () => { g.replaceChildren(...ord.map((t, pos) => el('button', { class: 'tile' + (pick === pos ? ' sel' : '') + (t === pos ? ' ok' : ''), 'aria-label': `Tile ${pos + 1}${t === pos ? ', in the right place' : ''}`,
      style: `background-image:url(${a.img});background-size:${n * 100}% ${n * 100}%;background-position:${(t % n) / (n - 1) * 100}% ${((t / n) | 0) / (n - 1) * 100}%`,
      onclick: () => { if (pick === null) { pick = pos; sfx.pop() } else { [ord[pick], ord[pos]] = [ord[pos], ord[pick]]; pick = null; ord[pos] === pos ? sfx.good() : sfx.pop();
        if (ord.every((v, i) => v === i)) { g.classList.add('won'); setTimeout(() => complete(a, a.win || 'Puzzle solved!'), 500) } } draw() } }))) };
  app.replaceChildren(shell(a, el('div', { class: 'stage puz-stage' }, g), el('details', { class: 'peek' }, el('summary', {}, 'Peek at the picture'), el('img', { src: a.img, alt: 'The finished picture', width: 600, height: 600, loading: 'lazy' })))); draw();
}

/* ===== memory match ===== */
function memoryAct(a) {
  const R = rng(a.seed || 6), deck = a.cards.flatMap((c, i) => [i, i]).sort(() => R() - .5); let open = [], got = 0, lock = false;
  const g = el('div', { class: 'mem', role: 'grid', 'aria-label': 'Memory cards' });
  deck.forEach((k, pos) => { const b = el('button', { class: 'mcard', 'aria-label': `Card ${pos + 1}, face down` }, el('span', { class: 'mback', 'aria-hidden': 'true' }, '?'), el('img', { src: a.cards[k][0], alt: '', width: 200, height: 200 }));
    b.onclick = () => { if (lock || b.classList.contains('up')) return; b.classList.add('up'); b.setAttribute('aria-label', a.cards[k][1]); say(a.cards[k][1]); speak(a.cards[k][1]); sfx.pop(); open.push([b, k]);
      if (open.length === 2) { const [[b1, k1], [b2, k2]] = open; open = []; if (k1 === k2) { b1.classList.add('ok'); b2.classList.add('ok'); sfx.good(); if (++got === a.cards.length) setTimeout(() => complete(a, a.win || 'What a memory!'), 500) }
        else { lock = true; setTimeout(() => { [b1, b2].forEach(x => { x.classList.remove('up'); x.setAttribute('aria-label', 'Card, face down') }); lock = false }, 900) } } }; g.append(b) });
  app.replaceChildren(shell(a, g));
}

/* ===== explorer ID ===== */
function idAct(a) {
  const me = prog.me || {}; const f = el('form', { class: 'idcard' },
    el('label', {}, 'My name is', el('input', { name: 'name', autocomplete: 'off', maxlength: 24, value: me.name || '' })),
    el('label', {}, 'I am', el('input', { name: 'age', inputmode: 'numeric', maxlength: 2, value: me.age || '', 'aria-label': 'Age in years' }), 'years old'),
    el('fieldset', {}, el('legend', {}, 'My favourite thing in ' + (B.place || B.title)), (a.favs || ['🦜 Toucan', '🥁 Carnival', '🗽 The statue', '🏖️ The beach']).map(o => el('label', { class: 'pick' }, el('input', { type: 'radio', name: 'fav', value: o, checked: me.fav === o }), o))),
    el('p', { class: 'note' }, 'Your answers stay on this device only.'),
    el('button', { class: 'btn', type: 'submit' }, 'Save my ID card'));
  f.addEventListener('submit', e => { e.preventDefault(); const d = new FormData(f); prog.me = { name: (d.get('name') || '').trim(), age: d.get('age'), fav: d.get('fav') }; save(); complete(a, prog.me.name ? `Welcome aboard, Explorer ${prog.me.name}!` : 'Welcome aboard, explorer!') });
  app.replaceChildren(shell(a, f));
}

/* ===== hub / sticker map ===== */
function hub() {
  const n = Object.keys(prog.done || {}).length, T = B.activities.length;
  const map = el('section', { class: 'passport', 'aria-labelledby': 'pp-t' },
    el('h2', { id: 'pp-t' }, prog.me && prog.me.name ? `${prog.me.name}’s sticker map` : 'My sticker map'),
    el('p', {}, `${n} of ${T} stickers collected`),
    el('div', { class: 'trail', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': T, 'aria-valuenow': n, 'aria-label': 'Stickers collected' },
      el('div', { class: 'trail-fill', style: `width:${n / T * 100}%` }), el('img', { class: 'trail-balloon', src: '../../assets/balloon.webp', alt: '', style: `left:${n / T * 100}%` }),
      el('img', { class: 'trail-end', src: B.stamp, alt: '' })),
    n === T ? el('p', { class: 'cert' }, `🏅 Certified ${B.place || ''} Explorer! You finished every activity.`) : null);
  const grid = el('ol', { class: 'cards' }, B.activities.map((a, i) => el('li', {}, el('a', { class: 'card' + (done(a.id) ? ' done' : ''), href: '#' + a.id },
    el('span', { class: 'card-img' }, el('img', { src: a.img, alt: '', loading: i > 5 ? 'lazy' : 'eager', decoding: 'async', width: 200, height: 200 })),
    el('span', { class: 'card-n' }, i + 1), el('span', { class: 'card-t' }, a.title), el('span', { class: 'card-age' }, a.age),
    done(a.id) ? el('span', { class: 'sticker sm' }, el('img', { src: a.img, alt: 'Sticker earned' })) : null))));
  app.replaceChildren(el('div', { class: 'hub' }, map, el('h2', { class: 'acts-h' }, 'Pick an activity'), grid,
    el('p', { class: 'reset' }, el('button', { class: 'link', onclick: () => { if (confirm('Start over and clear all stickers on this device?')) { Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k)); prog = {}; hub() } } }, 'Start over'))));
}

/* ---------- router ---------- */
const TYPES = { color: a => colorAct(a, false), draw: a => colorAct(a, true), find: a => hotspotAct(a, false), diff: a => hotspotAct(a, true), wordsearch: wordsearchAct, maze: mazeAct, trace: traceAct, dots: dotsAct, quiz: quizAct, match: matchAct, idcard: idAct, order: orderAct, puzzle: puzzleAct, memory: memoryAct };
function route() { document.querySelectorAll('.cheer').forEach(c => c.remove()); const id = location.hash.slice(1), a = B.activities.find(x => x.id === id);
  const intro = document.querySelector('.intro'); if (intro) intro.hidden = !!a;
  if (a) { TYPES[a.type](a); document.title = `${a.title} · ${B.title} worksheets · Stu’s 7 Wonders`; } else { hub(); document.title = document.querySelector('meta[name="ws-title"]').content }
  scrollTo(0, 0); const h = app.querySelector('h1,h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }) } }
addEventListener('hashchange', route);
const mb = $('#mute'); const setMute = () => { mb.setAttribute('aria-pressed', muted ? 'true' : 'false'); mb.textContent = muted ? '🔇 Sound off' : '🔊 Sound on' };
mb.onclick = () => { muted = !muted; localStorage.setItem('stu-ws-muted', muted ? '1' : '0'); setMute(); if (!muted) sfx.pop() }; setMute();
route();
})();

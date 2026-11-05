/* Pure worksheet rules shared by Rio, Rome and China. No DOM, no storage. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WSLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TYPES = ['color', 'draw', 'find', 'diff', 'wordsearch', 'maze', 'trace', 'dots', 'quiz', 'match', 'idcard', 'order', 'puzzle', 'memory'];

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildWordSearch(a) {
    const N = a.size;
    const R = rng(a.seed);
    const dirs = { across: [[0, 1]], down: [[1, 0]], diagonal: [[1, 1], [-1, 1]] };
    const D = a.dirs.flatMap(d => dirs[d] || []);
    if (!D.length) return null;
    for (let tries = 0; tries < 400; tries++) {
      const grid = Array.from({ length: N }, () => Array(N).fill(''));
      const positions = {};
      let ok = true;
      const words = [...a.words].sort((p, q) => q.length - p.length);
      for (const w of words) {
        let placed = false;
        for (let t = 0; t < 300 && !placed; t++) {
          const [dr, dc] = D[R() * D.length | 0];
          const r0 = R() * N | 0;
          const c0 = R() * N | 0;
          const cells = [];
          for (let k = 0; k < w.length; k++) {
            const r = r0 + dr * k, c = c0 + dc * k;
            if (r < 0 || c < 0 || r >= N || c >= N || (grid[r][c] && grid[r][c] !== w[k])) {
              cells.length = 0;
              break;
            }
            cells.push([r, c]);
          }
          if (cells.length === w.length) {
            cells.forEach(([r, c], k) => { grid[r][c] = w[k]; });
            positions[w] = cells;
            placed = true;
          }
        }
        if (!placed) { ok = false; break; }
      }
      if (ok) {
        const letters = 'ABCDEFGHIJKLMNOPRSTUVWY';
        for (const row of grid) {
          for (let c = 0; c < N; c++) if (!row[c]) row[c] = letters[R() * letters.length | 0];
        }
        return { grid, positions, tries };
      }
    }
    return null;
  }

  /** Cells from (r0,c0) toward (r1,c1), snapped to a row, column or diagonal. */
  function wordSearchLine(r0, c0, r1, c1, n) {
    let dr = r1 - r0, dc = c1 - c0;
    if (!dr && !dc) return [[r0, c0]];
    const adr = Math.abs(dr), adc = Math.abs(dc);
    if (adr > adc * 2) dc = 0;
    else if (adc > adr * 2) dr = 0;
    else {
      const len = Math.min(adr, adc);
      dr = Math.sign(dr) * len;
      dc = Math.sign(dc) * len;
    }
    const sdr = Math.sign(dr), sdc = Math.sign(dc);
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    const cells = [];
    for (let k = 0; k <= steps; k++) {
      const r = r0 + sdr * k, c = c0 + sdc * k;
      if (r < 0 || c < 0 || r >= n || c >= n) break;
      cells.push([r, c]);
    }
    return cells;
  }

  function wordOnLine(word, cells, grid) {
    const text = cells.map(([r, c]) => grid[r][c]).join('');
    const rev = [...text].reverse().join('');
    return text === word || rev === word;
  }

  function buildMaze(rows, cols, seed) {
    const rnd = rng(seed);
    const walls = Array.from({ length: rows * cols }, () => [1, 1, 1, 1]);
    const seen = new Uint8Array(rows * cols);
    const st = [0];
    seen[0] = 1;
    const DV = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    while (st.length) {
      const i = st[st.length - 1];
      const r = i / cols | 0, c = i % cols;
      const opts = [0, 1, 2, 3].filter(d => {
        const rr = r + DV[d][0], cc = c + DV[d][1];
        return rr >= 0 && cc >= 0 && rr < rows && cc < cols && !seen[rr * cols + cc];
      });
      if (!opts.length) { st.pop(); continue; }
      const d = opts[rnd() * opts.length | 0];
      const j = (r + DV[d][0]) * cols + c + DV[d][1];
      walls[i][d] = 0;
      walls[j][(d + 2) % 4] = 0;
      seen[j] = 1;
      st.push(j);
    }
    return { walls, rows, cols };
  }

  function mazeSolvable(maze) {
    const { walls, rows, cols } = maze;
    const DV = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    const seen = new Uint8Array(rows * cols);
    const st = [0];
    seen[0] = 1;
    while (st.length) {
      const i = st.pop();
      const r = i / cols | 0, c = i % cols;
      for (let d = 0; d < 4; d++) {
        if (walls[i][d]) continue;
        const rr = r + DV[d][0], cc = c + DV[d][1];
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) return false;
        const j = rr * cols + cc;
        if (!seen[j]) { seen[j] = 1; st.push(j); }
      }
    }
    if (seen.some(v => !v)) return false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const w = walls[r * cols + c];
        if (r === 0 && w[0] !== 1) return false;
        if (c === cols - 1 && w[1] !== 1) return false;
        if (r === rows - 1 && w[2] !== 1) return false;
        if (c === 0 && w[3] !== 1) return false;
      }
    }
    return !!seen[rows * cols - 1];
  }

  function nearestHotspot(targets, x, y, rad) {
    let best = null, bestD = rad;
    for (const t of targets) {
      if (t.found) continue;
      const d = Math.hypot(t.p[0] - x, t.p[1] - y);
      if (d < bestD || (d === bestD && !best)) {
        best = t;
        bestD = d;
      }
    }
    return best;
  }

  function normalizeProgress(raw) {
    const p = raw && typeof raw === 'object' ? raw : {};
    const done = {};
    if (p.done && typeof p.done === 'object') {
      for (const [k, v] of Object.entries(p.done)) if (v) done[k] = v;
    }
    return { done, me: p.me && typeof p.me === 'object' ? { ...p.me } : null };
  }

  function markDone(progress, id, now) {
    const p = normalizeProgress(progress);
    const first = !p.done[id];
    p.done[id] = now || Date.now();
    return { progress: p, first };
  }

  function stickerCount(progress) {
    return Object.keys(normalizeProgress(progress).done).length;
  }

  function nextIncomplete(activities, currentId, doneMap) {
    const done = doneMap || {};
    const i = Math.max(0, activities.findIndex(a => a.id === currentId));
    return activities.slice(i + 1).find(a => !done[a.id])
      || activities.find(a => a.id !== currentId && !done[a.id])
      || null;
  }

  function dotViewBox(points, pad) {
    const p = pad == null ? 70 : pad;
    const xs = points.map(q => q[0]), ys = points.map(q => q[1]);
    const x0 = Math.min(...xs) - p, y0 = Math.min(...ys) - p;
    return { x: x0, y: y0, w: Math.max(...xs) - x0 + p, h: Math.max(...ys) - y0 + p };
  }

  function screenPoint(node, svgX, svgY, view) {
    const r = node.getBoundingClientRect();
    return [
      r.left + (svgX - view.x) / view.w * r.width,
      r.top + (svgY - view.y) / view.h * r.height
    ];
  }

  function nearestIndex(points, x, y) {
    let best = 0, bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return { index: best, distance: bestD };
  }

  function activityIssues(a, book) {
    const issues = [];
    const need = (cond, msg) => { if (!cond) issues.push((a && a.id || '?') + ': ' + msg); };
    if (!a || typeof a !== 'object') return ['activity missing'];
    need(typeof a.id === 'string' && a.id, 'id');
    need(TYPES.includes(a.type), 'type ' + a.type);
    need(typeof a.title === 'string' && a.title.trim(), 'title');
    need(typeof a.prompt === 'string' && a.prompt.trim(), 'prompt');
    need(typeof a.age === 'string' && a.age.trim(), 'age');
    need(typeof a.img === 'string' && a.img.trim(), 'img');
    if (a.type === 'wordsearch') {
      need(a.size >= 4 && a.words && a.words.length >= 1, 'word list');
      need(a.words.every(w => /^[A-Z]+$/.test(w) && w.length <= a.size), 'words must be A–Z and fit the grid');
      const built = a.words ? buildWordSearch(a) : null;
      need(!!built, 'word search could not be placed');
      if (built) {
        for (const w of a.words) {
          const cells = built.positions[w];
          const text = cells.map(([r, c]) => built.grid[r][c]).join('');
          if (text !== w) issues.push(a.id + ': placed ' + w + ' as ' + text);
        }
      }
    }
    if (a.type === 'maze') {
      need(a.rows >= 4 && a.cols >= 4, 'maze size');
      need(typeof a.start === 'string' && typeof a.end === 'string', 'maze art');
      if (a.rows && a.cols) need(mazeSolvable(buildMaze(a.rows, a.cols, a.seed || 1)), 'maze is not solvable');
    }
    if (a.type === 'find') {
      const entries = Object.entries(a.items || {});
      need(entries.length > 0, 'find list');
      need(a.scale > 0, 'scale');
      for (const [name, ps] of entries) {
        need(Array.isArray(ps) && ps.length, 'spots for ' + name);
        for (const p of ps || []) need(p[0] >= 0 && p[1] >= 0 && p[0] <= a.scale && p[1] <= a.scale, name + ' inside the picture');
      }
    }
    if (a.type === 'diff') {
      need(a.a && a.b, 'diff pictures');
      need(Array.isArray(a.diffs) && a.diffs.length === (a.desc || []).length && a.diffs.length > 0, 'diff spots match descriptions');
      need(a.scale > 0, 'scale');
      for (const p of a.diffs || []) need(p[0] >= 0 && p[1] >= 0 && p[0] <= a.scale && p[1] <= a.scale, 'diff spot inside the picture');
    }
    if (a.type === 'dots') {
      const pts = a.dots || (book && book.dots);
      need(Array.isArray(pts) && pts.length >= 8, 'dots');
      if (pts && pts.length) {
        let min = Infinity;
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
          min = Math.min(min, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
        }
        need(min > 20, 'dots are piled on top of each other');
      }
    }
    if (a.type === 'quiz') {
      need(Array.isArray(a.qs) && a.qs.length >= 1, 'questions');
      for (const q of a.qs || []) {
        need(typeof q[0] === 'string' && Array.isArray(q[1]) && q[1].length >= 2, 'question choices');
        need(Number.isInteger(q[2]) && q[2] >= 0 && q[2] < (q[1] || []).length, 'answer index');
      }
    }
    if (a.type === 'match') {
      need(Array.isArray(a.pairs) && a.pairs.length >= 2, 'pairs');
      for (const pair of a.pairs || []) need(pair.length >= 4 && pair[0] && pair[3], 'pair fields');
    }
    if (a.type === 'trace') {
      need(Array.isArray(a.path) && a.path.length >= 2, 'path');
    }
    if (a.type === 'order') need(Array.isArray(a.pics) && a.pics.length >= 3, 'story pictures');
    if (a.type === 'puzzle') need(a.n >= 2, 'puzzle size');
    if (a.type === 'memory') need(Array.isArray(a.cards) && a.cards.length >= 2, 'cards');
    if (a.type === 'idcard') need(!a.favs || (a.favs.length >= 2 && a.favs.length <= 6), 'favourite choices');
    return issues;
  }

  function bookIssues(book) {
    const issues = [];
    if (!book) return ['book missing'];
    if (!book.id || !book.title) issues.push('book id/title');
    if (!Array.isArray(book.activities) || book.activities.length !== 25) issues.push(book.id + ' should have 25 activities');
    const ids = new Set();
    for (const a of book.activities || []) {
      if (ids.has(a.id)) issues.push('duplicate id ' + a.id);
      ids.add(a.id);
      issues.push(...activityIssues(a, book));
    }
    return issues;
  }

  return {
    TYPES, rng, buildWordSearch, wordSearchLine, wordOnLine, buildMaze, mazeSolvable,
    nearestHotspot, normalizeProgress, markDone, stickerCount, nextIncomplete,
    dotViewBox, screenPoint, nearestIndex, activityIssues, bookIssues
  };
});

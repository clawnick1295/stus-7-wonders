/**
 * Visit every Rio, Rome and China activity at 360px and desktop.
 * Also complete one activity of each type with pointer events.
 * Run: node test/routes.mjs
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const L = require('../worksheets/engine/logic.js');
const PORT = 8766;
const CDP = 9334;

function loadBook(id) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(`worksheets/${id}/data.js`, 'utf8'), ctx);
  return ctx.window.WS_BOOK;
}

const books = ['rio', 'rome', 'china'].map(loadBook);
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: process.cwd(), stdio: 'ignore' });
const chrome = spawn('google-chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, '--user-data-dir=/tmp/ws-cdp-routes', 'about:blank',
], { stdio: 'ignore' });

const fail = [];
function check(cond, msg) { if (!cond) fail.push(msg); }

async function waitFor(url) {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('timeout ' + url);
}

function cdp(ws) {
  let n = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) events.push(msg);
  });
  return {
    events,
    send(method, params = {}) {
      const id = ++n;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function main() {
  await waitFor(`http://127.0.0.1:${PORT}/worksheets/rio/`);
  await waitFor(`http://127.0.0.1:${CDP}/json/version`);
  const ver = await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  const c = cdp(ws);
  const { targetId } = await c.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await c.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params = {}) => {
    const id = ++nHack;
    return new Promise((resolve, reject) => {
      pendingHack.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  };
  let nHack = 1000;
  const pendingHack = new Map();
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pendingHack.has(msg.id)) {
      const { resolve, reject } = pendingHack.get(msg.id);
      pendingHack.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');
  const consoleErrors = [];
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.sessionId !== sessionId || !msg.method) return;
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails?.text + ' ' + (msg.params.exceptionDetails?.exception?.description || ''));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
    }
  });

  async function evalJson(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text + ' ' + (res.exceptionDetails.exception?.description || ''));
    return res.result.value;
  }

  async function go(url, width, height) {
    const before = consoleErrors.length;
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await send('Page.navigate', { url });
    for (let i = 0; i < 40; i++) {
      const ready = await evalJson('document.readyState === "complete" && !!document.querySelector("#app h1, #app h2")');
      if (ready) break;
      await new Promise(r => setTimeout(r, 50));
    }
    await new Promise(r => setTimeout(r, 30));
    const info = await evalJson(`(() => {
      const imgs = [...document.images];
      const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
      const h = document.querySelector('#app h1, #app h2');
      return { broken, overflow, scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, heading: h ? h.textContent : '', cards: document.querySelectorAll('.card').length };
    })()`);
    const errs = consoleErrors.slice(before).filter(e => !/favicon|AudioContext|speechSynthesis/i.test(e));
    return { ...info, errs };
  }

  for (const width of [1280, 360]) {
    for (const book of books) {
      const hub = await go(`http://127.0.0.1:${PORT}/worksheets/${book.id}/#`, width, width === 360 ? 780 : 900);
      check(hub.cards === 25, `${book.id} hub ${width} cards ${hub.cards}`);
      check(!hub.overflow, `${book.id} hub ${width} overflow ${hub.scroll}>${hub.client}`);
      check(hub.broken.length === 0, `${book.id} hub broken ${hub.broken}`);
      check(hub.errs.length === 0, `${book.id} hub errors ${hub.errs}`);
      for (const a of book.activities) {
        const page = await go(`http://127.0.0.1:${PORT}/worksheets/${book.id}/#${a.id}`, width, width === 360 ? 780 : 900);
        check(page.heading.includes(a.title), `${book.id} ${a.id} @${width} heading "${page.heading}"`);
        check(!page.overflow, `${book.id} ${a.id} @${width} overflow ${page.scroll}>${page.client}`);
        check(page.broken.length === 0, `${book.id} ${a.id} broken ${page.broken}`);
        check(page.errs.length === 0, `${book.id} ${a.id} errors ${page.errs}`);
      }
    }
  }

  // Interaction: one of each type on China, plus a Rio word search.
  await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 900, deviceScaleFactor: 1, mobile: false });
  const china = books.find(b => b.id === 'china');
  async function openAct(id) {
    await evalJson(`localStorage.clear()`);
    await go(`http://127.0.0.1:${PORT}/worksheets/china/#${id}`, 1100, 900);
  }
  async function doneCount() {
    return evalJson(`(() => { const p = JSON.parse(localStorage.getItem('stu-worksheets-china') || '{"done":{}}'); return Object.keys(p.done || {}).length })()`);
  }

  await openAct('lantern-balloon');
  await evalJson(`document.querySelectorAll('.tool').forEach(b => { if (b.textContent.includes('done')) b.click() })`);
  await new Promise(r => setTimeout(r, 50));
  check(await evalJson(`!!document.querySelector('.cheer')`), 'color complete dialog');
  check(await doneCount() === 1, 'color sticker saved');

  await openAct('words-easy');
  const wordAct = china.activities.find(a => a.id === 'words-easy');
  const built = L.buildWordSearch(wordAct);
  for (const word of wordAct.words) {
    const cells = built.positions[word];
    const [r0, c0] = cells[0];
    const [r1, c1] = cells[cells.length - 1];
    await evalJson(`(() => {
      const cell = (r,c) => document.querySelector(\`.cell[data-r="\${r}"][data-c="\${c}"]\`);
      const fire = (el, type) => {
        const b = el.getBoundingClientRect();
        const ev = new PointerEvent(type, { bubbles: true, clientX: b.x + b.width/2, clientY: b.y + b.height/2, pointerId: 1, pointerType: 'mouse', buttons: type === 'pointerup' ? 0 : 1 });
        document.querySelector('.ws').dispatchEvent(ev);
      };
      const a = cell(${r0}, ${c0}), b = cell(${r1}, ${c1});
      fire(a, 'pointerdown'); fire(a, 'pointerup');
      fire(b, 'pointerdown'); fire(b, 'pointerup');
    })()`);
  }
  await new Promise(r => setTimeout(r, 500));
  check(await evalJson(`!!document.querySelector('.cheer')`), 'word search completed');

  await openAct('fun-facts');
  const quiz = china.activities.find(a => a.id === 'fun-facts');
  for (const q of quiz.qs) {
    const answer = q[1][q[2]].replace(/'/g, "\\'");
    await evalJson(`(() => { const b = [...document.querySelectorAll('.opt')].find(x => x.textContent === '${answer}'); if (b) b.click(); })()`);
    await new Promise(r => setTimeout(r, q[3] ? 1700 : 900));
  }
  check(await evalJson(`!!document.querySelector('.cheer')`), 'quiz completed');

  await openAct('mandarin');
  const pairs = china.activities.find(a => a.id === 'mandarin').pairs;
  for (let i = 0; i < pairs.length; i++) {
    await evalJson(`(() => {
      const chip = document.querySelector('.chip');
      if (!chip) return;
      const b = chip.getBoundingClientRect();
      const fire = type => chip.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: b.x + 4, clientY: b.y + 4, pointerId: 1, pointerType: 'mouse' }));
      fire('pointerdown'); fire('pointerup');
      const tgt = document.querySelector('.tgt[data-i="' + chip.dataset.i + '"]');
      if (tgt) tgt.click();
    })()`);
  }
  await new Promise(r => setTimeout(r, 500));
  check(await evalJson(`!!document.querySelector('.cheer')`), 'mandarin match completed, characters visible ' + await evalJson(`document.body.innerText.includes('你好') && document.body.innerText.includes('Nǐ hǎo')`));

  await openAct('maze-wall');
  const maze = china.activities.find(a => a.id === 'maze-wall');
  const builtMaze = L.buildMaze(maze.rows, maze.cols, maze.seed);
  // Walk a BFS path with arrow keys.
  const path = bfs(builtMaze);
  const dirs = [];
  for (let i = 1; i < path.length; i++) {
    const d = path[i] - path[i - 1];
    dirs.push(d === -maze.cols ? 'ArrowUp' : d === 1 ? 'ArrowRight' : d === maze.cols ? 'ArrowDown' : 'ArrowLeft');
  }
  await evalJson(`document.querySelector('.maze').focus()`);
  for (const key of dirs) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: key === 'ArrowUp' ? 38 : key === 'ArrowRight' ? 39 : key === 'ArrowDown' ? 40 : 37 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key });
  }
  await new Promise(r => setTimeout(r, 400));
  check(await evalJson(`!!document.querySelector('.cheer')`), 'maze completed in ' + dirs.length + ' steps');

  await openAct('dots-tower');
  console.log('route failures before dots', fail.length, fail.slice(0, 12));
  const dots = china.activities.find(a => a.id === 'dots-tower').dots;
  console.log('dot layout', await evalJson(`(() => {
    const svg = document.querySelector('.dots');
    if (!svg) return 'missing';
    const vb = svg.viewBox.baseVal;
    const r = svg.getBoundingClientRect();
    return { w: r.width, h: r.height, vx: vb.x, vy: vb.y, vw: vb.width, vh: vb.height };
  })()`));
  for (let i = 0; i < dots.length; i++) {
    await evalJson(`(() => {
      const svg = document.querySelector('.dots');
      const vb = svg.viewBox.baseVal;
      const r = svg.getBoundingClientRect();
      const x = r.left + (${dots[i][0]} - vb.x) / vb.width * r.width;
      const y = r.top + (${dots[i][1]} - vb.y) / vb.height * r.height;
      if (!Number.isFinite(x) || !Number.isFinite(y) || r.width < 2) return;
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse' }));
    })()`);
  }
  await new Promise(r => setTimeout(r, 500));
  check(await evalJson(`!!document.querySelector('.cheer')`), 'dot-to-dot completed');

  await openAct('find-lanterns');
  const find = china.activities.find(a => a.id === 'find-lanterns');
  const pts = Object.values(find.items).flat();
  for (const p of pts) {
    await evalJson(`(() => {
      const scene = document.querySelector('.scene');
      const r = scene.getBoundingClientRect();
      const x = r.left + ${p[0]} / ${find.scale} * r.width;
      const y = r.top + ${p[1]} / ${find.scale} * r.height;
      scene.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
      scene.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
    })()`);
  }
  await new Promise(r => setTimeout(r, 600));
  check(await evalJson(`!!document.querySelector('.cheer')`), 'look and find completed');

  await openAct('fly-to-china');
  await evalJson(`document.querySelectorAll('.tool').forEach(b => { if (b.textContent.includes('Fly')) b.click() })`);
  check(await evalJson(`!!document.querySelector('.cheer') && document.body.innerText.includes('Great Wall')`), 'trace fly-for-me');

  await openAct('explorer-id');
  await evalJson(`(() => {
    const f = document.querySelector('form');
    f.name.value = 'Ada';
    f.age.value = '6';
    f.querySelector('input[type=radio]').checked = true;
    f.requestSubmit();
  })()`);
  check(await evalJson(`!!document.querySelector('.cheer') && document.body.innerText.includes('Ada')`), 'id card saved');
  check(await evalJson(`!!document.querySelector('.face')`), 'id card has a face canvas');

  console.log(JSON.stringify({ failures: fail, checkedRoutes: books.reduce((n, b) => n + b.activities.length + 1, 0) * 2 }, null, 2));
  ws.close();
  server.kill();
  chrome.kill();
  process.exit(fail.length ? 1 : 0);
}

function bfs(maze) {
  const { walls, rows, cols } = maze;
  const DV = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  const prev = new Array(rows * cols).fill(-1);
  const q = [0];
  const seen = new Set([0]);
  while (q.length) {
    const i = q.shift();
    if (i === rows * cols - 1) break;
    const r = Math.floor(i / cols), c = i % cols;
    for (let d = 0; d < 4; d++) {
      if (walls[i][d]) continue;
      const rr = r + DV[d][0], cc = c + DV[d][1];
      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
      const j = rr * cols + cc;
      if (seen.has(j)) continue;
      seen.add(j);
      prev[j] = i;
      q.push(j);
    }
  }
  const path = [];
  for (let i = rows * cols - 1; i >= 0; i = prev[i]) path.push(i);
  return path.reverse();
}

main().catch(err => {
  console.error(err);
  server.kill();
  chrome.kill();
  process.exit(1);
});

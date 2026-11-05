const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const L = require('../worksheets/engine/logic.js');

function load(p) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(p, 'utf8'), ctx);
  return ctx.window.WS_BOOK;
}

const books = {
  rio: load('worksheets/rio/data.js'),
  rome: load('worksheets/rome/data.js'),
  china: load('worksheets/china/data.js'),
};

const rioTitles = [
  'Colour Stu’s balloon', 'My Explorer ID card', 'Fly Stu to Rio!', 'Up, up and away!',
  'Carnival look and find', 'Spot 5 differences', 'Samba with Toucan', 'Rio word search',
  'Learn Portuguese words', 'Fly to the statue', 'The colourful hillside', 'Hidden in the houses',
  'Dot-to-dot: Christ the Redeemer', 'Spot 7 differences', 'The statue is ENORMOUS!',
  'Rio fun facts quiz', 'Word search: explorer level', 'Friends from two countries',
  'Climbing up, up, up!', 'Follow the winding path', 'Spot 8 differences',
  'Design your own balloon', 'Which Wonder next?', 'Finish the rhyme', 'Count at Carnival',
];

test('each book has 25 valid activities', () => {
  for (const [id, book] of Object.entries(books)) {
    const issues = L.bookIssues(book);
    assert.deepEqual(issues, [], id + ' ' + issues.join('; '));
    assert.equal(book.activities.length, 25);
  }
});

test('Rio titles stay the public sequence', () => {
  const norm = s => s.replace(/\u2019/g, "'");
  const got = books.rio.activities.map(a => norm(a.title));
  const exp = rioTitles.map(norm);
  assert.equal(got.join('\n'), exp.join('\n'));
});

test('China never treats pandas as a group', () => {
  const blob = JSON.stringify(books.china);
  assert.equal(/\bpandas\b/i.test(blob), false);
  const pandaHits = blob.match(/panda/gi) || [];
  assert.ok(pandaHits.length >= 1);
});

test('China Mandarin shows characters, pinyin and English', () => {
  const act = books.china.activities.find(a => a.id === 'mandarin');
  for (const [word, pinyin, , english, spoken] of act.pairs) {
    assert.match(word, /[\u3400-\u9fff]/);
    assert.match(pinyin, /[A-Za-zǎáàēéèīíìōóòūúùǚǘǜ]/);
    assert.ok(english.length > 1);
    assert.equal(spoken, word);
  }
  assert.equal(act.lang, 'zh-CN');
});

test('word searches place every word and a straight line can select it', () => {
  for (const book of Object.values(books)) {
    for (const a of book.activities.filter(x => x.type === 'wordsearch')) {
      const built = L.buildWordSearch(a);
      assert.ok(built, a.id);
      for (const word of a.words) {
        const cells = built.positions[word];
        const [r0, c0] = cells[0];
        const [r1, c1] = cells[cells.length - 1];
        const line = L.wordSearchLine(r0, c0, r1, c1, a.size);
        assert.equal(L.wordOnLine(word, line, built.grid), true, book.id + ' ' + word);
      }
    }
  }
});

test('mazes are solvable and progress helpers stick', () => {
  for (const book of Object.values(books)) {
    for (const a of book.activities.filter(x => x.type === 'maze')) {
      assert.equal(L.mazeSolvable(L.buildMaze(a.rows, a.cols, a.seed || 1)), true, a.id);
    }
  }
  let prog = L.normalizeProgress(null);
  const marked = L.markDone(prog, 'lantern-balloon', 5);
  assert.equal(marked.first, true);
  assert.equal(L.stickerCount(marked.progress), 1);
  const again = L.markDone(marked.progress, 'lantern-balloon', 9);
  assert.equal(again.first, false);
  const next = L.nextIncomplete(books.china.activities, 'lantern-balloon', again.progress.done);
  assert.equal(next.id, 'explorer-id');
});

test('nearest hotspot prefers the closer target', () => {
  const targets = [
    { k: 'a', p: [0, 0], found: false },
    { k: 'b', p: [30, 0], found: false },
  ];
  assert.equal(L.nearestHotspot(targets, 22, 0, 40).k, 'b');
  targets[1].found = true;
  assert.equal(L.nearestHotspot(targets, 22, 0, 40).k, 'a');
});

test('referenced local art files exist', () => {
  const missing = [];
  for (const [id, book] of Object.entries(books)) {
    const root = 'worksheets/' + id + '/';
    const texts = JSON.stringify(book);
    for (const rel of texts.match(/(?:\.\.\/)+assets\/[\w.-]+|art\/[\w.-]+/g) || []) {
      const path = rel.startsWith('art/') ? root + rel : rel.replace(/^(\.\.\/)+/, '');
      if (!fs.existsSync(path)) missing.push(id + ' ' + rel + ' -> ' + path);
    }
  }
  assert.deepEqual(missing, []);
});

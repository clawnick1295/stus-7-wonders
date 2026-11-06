const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { execFileSync } = require('node:child_process');

test('hero balloon is a continuous PNG, not the torn webp', () => {
  const buf = fs.readFileSync('assets/balloon.png');
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(buf.readUInt32BE(16), 569);
  assert.equal(buf.readUInt32BE(20), 761);
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /src="assets\/balloon\.png" width="569" height="761"/);
  assert.equal(html.includes('assets/balloon.webp'), false);
  const css = fs.readFileSync('style.css', 'utf8');
  assert.doesNotMatch(css, /\.balloon img\{[^}]*filter/);
  assert.doesNotMatch(css, /\.balloon\{[^}]*container-type/);
  const report = execFileSync('python3', ['scripts/repair_balloon_ribs.py', '--check'], {
    encoding: 'utf8',
  });
  assert.match(report, /rib error/);
});

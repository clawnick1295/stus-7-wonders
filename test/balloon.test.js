const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

test('hero balloon is one lossless image, not a lossy alpha plane', () => {
  const buf = fs.readFileSync('assets/balloon.webp');
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  // VP8L is lossless. The live tear was a lossy VP8X file with a separate alpha chunk.
  assert.equal(buf.toString('ascii', 12, 16), 'VP8L');
  assert.equal(buf.includes(Buffer.from('ALPH')), false);
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /src="assets\/balloon\.webp" width="569" height="761"/);
  const css = fs.readFileSync('style.css', 'utf8');
  assert.doesNotMatch(css, /\.balloon img\{[^}]*filter/);
  assert.doesNotMatch(css, /\.balloon\{[^}]*container-type/);
  assert.match(css, /@keyframes bob\{0%,100%\{transform:translateY\(0\)\}50%\{transform:translateY\(-18px\)\}/);
  assert.match(css, /@keyframes drift\{0%,100%\{transform:translateX\(-14px\) rotate\(-2\.2deg\)\}50%\{transform:translateX\(14px\) rotate\(2\.2deg\)\}/);
});

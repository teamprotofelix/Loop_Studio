import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
test('hero artwork, mascot and stickers are shipped as compact WebP images', () => {
  for (const name of ['cozy-studio.webp','marie-mascot.webp','music-stickers.webp']) {
    const path = new URL(`../assets/${name}`, import.meta.url);
    const data = readFileSync(path);
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    assert.ok(statSync(path).size < 110_000, `${name} must be <=110 KB`);
    assert.ok(html.includes(`assets/${name}`) || js.includes(`assets/${name}`));
  }
});
test('visual refresh preserves all functional control IDs and accessible form fields', () => {
  for (const id of ['videoForm','videoUrl','playerMount','playBtn','seekBar','inputA','inputB','markA','markB','savePresetBtn','presetList','saveDialog','shareBtn','notesArea','themeToggle'])
    assert.ok(html.includes(`id="${id}"`), `Missing ${id}`);
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /aria-label=/);
  assert.match(css, /prefers-reduced-motion/);
});
test('existing stored presets and notes survive upgrade', () => {
  assert.match(js, /marie-loop-studio-v1/);
  assert.match(js, /database\.settings\.theme==='dark'\?'dark':'light'/);
});

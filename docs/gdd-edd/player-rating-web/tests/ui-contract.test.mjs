import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../public/', import.meta.url);

test('player page exposes two labelled five-point groups and feedback controls', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /viewport/);
  assert.equal((html.match(/role="radiogroup"/g) || []).length, 2);
  assert.equal((html.match(/type="radio"/g) || []).length, 10);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /maxlength="300"/);
  assert.match(html, /id="submit-rating"[^>]*disabled/);
  assert.match(html, /核心玩法/);
  assert.match(html, /UI 视觉风格与可玩性/);
});

test('public assets contain no browser-based AI or admin workflow', async () => {
  await assert.rejects(access(new URL('admin.html', root)));
  await assert.rejects(access(new URL('admin.js', root)));
});

test('styles include focus, responsive, and stable target rules', async () => {
  const css = await readFile(new URL('styles.css', root), 'utf8');
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media.*max-width/s);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadIsolationManifest, validateIsolationManifest } from '../src/isolation.mjs';

const valid = {
  sessionId: 'gdd-run-20260827-001',
  freshSession: true,
  contextSources: [],
  enabledPlugins: ['keco'],
  createdAt: '2026-08-27T10:00:00.000Z',
};

test('accepts a fresh empty-context Keco-only session', () => {
  const manifest = validateIsolationManifest(valid);
  assert.deepEqual(manifest, valid);
  assert.ok(Object.isFrozen(manifest));
  assert.ok(Object.isFrozen(manifest.contextSources));
  assert.ok(Object.isFrozen(manifest.enabledPlugins));
});

test('rejects a reused session or inherited context', () => {
  assert.throws(() => validateIsolationManifest({ ...valid, freshSession: false }), /全新 session/);
  assert.throws(() => validateIsolationManifest({ ...valid, contextSources: ['run2-result.md'] }), /上下文来源必须为空/);
});

test('rejects missing or unrelated plugins', () => {
  assert.throws(() => validateIsolationManifest({ ...valid, enabledPlugins: [] }), /至少启用一个自研 MCP/);
  assert.throws(() => validateIsolationManifest({ ...valid, enabledPlugins: ['superpowers'] }), /只允许 Keco/);
  assert.throws(() => validateIsolationManifest({ ...valid, enabledPlugins: ['atlassian-rovo'] }), /只允许 Keco/);
  assert.deepEqual(validateIsolationManifest({ ...valid, enabledPlugins: ['keco:create-map'] }).enabledPlugins, ['keco:create-map']);
});

test('loads and validates a JSON isolation manifest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gdd-isolation-'));
  const path = join(root, 'isolation.json');
  await writeFile(path, `${JSON.stringify(valid)}\n`);
  assert.deepEqual(await loadIsolationManifest(path), valid);
  await writeFile(path, '{');
  await assert.rejects(loadIsolationManifest(path), /不是有效 JSON/);
});

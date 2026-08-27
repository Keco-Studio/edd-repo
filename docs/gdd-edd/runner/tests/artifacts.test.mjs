import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createRunPaths,
  verifyArtifact,
  writeAtomic,
  writeJsonEvidence,
} from '../src/artifacts.mjs';

test('creates the exact fixed Run paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gdd-runs-'));
  assert.deepEqual(createRunPaths(root, 'demo-run1'), {
    root: join(root, 'demo-run1'),
    progress: join(root, 'demo-run1', 'progress.md'),
    result: join(root, 'demo-run1', 'result.md'),
    problem: join(root, 'demo-run1', 'problem.md'),
    evidenceRoot: join(root, 'demo-run1', 'evidence'),
    request: join(root, 'demo-run1', 'evidence', 'request.json'),
    response: join(root, 'demo-run1', 'evidence', 'response.json'),
  });
  assert.throws(() => createRunPaths(root, '../escape'), /测评 ID/);
});

test('writes JSON atomically and verifies readback hashes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gdd-evidence-'));
  const path = join(root, 'evidence', 'request.json');
  const written = await writeJsonEvidence(path, { evaluationId: 'demo-run1', value: 1 });
  assert.equal(JSON.parse(await readFile(path, 'utf8')).value, 1);
  assert.equal(written.path, path);
  assert.match(written.sha256, /^[a-f0-9]{64}$/);
  assert.equal((await verifyArtifact(path, 'demo-run1')).sha256, written.sha256);
});

test('atomic text writes do not leave temporary files in content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gdd-atomic-'));
  const path = join(root, 'result.md');
  await writeAtomic(path, '# demo-run1\n');
  assert.equal(await readFile(path, 'utf8'), '# demo-run1\n');
});

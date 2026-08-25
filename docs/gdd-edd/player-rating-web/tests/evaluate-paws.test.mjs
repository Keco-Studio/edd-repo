import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluatePaws, nextEvaluationId } from '../src/evaluate-paws.mjs';
import { PAWS_SOURCE } from '../src/ai-evaluator.mjs';

const evaluation = {
  source: { projectId: PAWS_SOURCE.projectId, documentId: PAWS_SOURCE.documentId, revision: 97, title: 'Paws & Patience' },
  provider: 'codex',
  model: 'test-model',
  aiCoreScore: 45,
  aiExperienceScore: 50,
  metrics: { core: [], experience: [] },
  issues: [{ dimension: 'core', deduction: 5, evidence: '三、核心循环', description: '反馈不足', suggestion: '补充反馈' }],
};

test('creates run suffixes without overwriting an evaluation for the same revision', async () => {
  const root = await mkdtemp(join(tmpdir(), 'edd-id-'));
  await mkdir(root, { recursive: true });
  assert.equal(await nextEvaluationId(root, 97), 'paws-patience-gdd-r97');
  await writeFile(join(root, 'paws-patience-gdd-r97-评价结果.md'), 'existing');
  assert.equal(await nextEvaluationId(root, 97), 'paws-patience-gdd-r97-run2');
  await writeFile(join(root, 'paws-patience-gdd-r97-run2-评价结果.md'), 'existing');
  assert.equal(await nextEvaluationId(root, 97), 'paws-patience-gdd-r97-run3');
});

test('one local evaluation creates documents, starts the player server, and returns a link', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'edd-command-'));
  const roots = {
    progressRoot: join(root, 'progress'),
    problemRoot: join(root, 'problem'),
    resultRoot: join(root, 'result'),
  };
  const result = await evaluatePaws({
    provider: 'codex',
    evaluator: async ({ documents }) => {
      await Promise.all(Object.values(roots).map((root) => mkdir(root, { recursive: true })));
      await Promise.all([
        writeFile(documents.progress, '# Progression\n'),
        writeFile(documents.problem, '# Problem\n'),
        writeFile(documents.result, '# Result\n'),
      ]);
      return evaluation;
    },
    serverOptions: {
      ...roots,
      dataFile: join(root, 'data', 'store.json'),
      publicRoot: new URL('../public/', import.meta.url),
      host: '127.0.0.1',
      port: 0,
      rateLimit: 100,
    },
  });
  t.after(() => result.app.close());
  assert.match(result.playerUrl, /^http:\/\/127\.0\.0\.1:\d+\/\?session=/);
  await Promise.all([
    access(join(roots.progressRoot, result.documents.progress)),
    access(join(roots.problemRoot, result.documents.problem)),
    access(join(roots.resultRoot, result.documents.result)),
  ]);
  const page = await fetch(result.playerUrl);
  assert.equal(page.status, 200);
});

test('uses an automatically assigned port when the caller does not choose one', async () => {
  let receivedOptions;
  let receivedProvider;
  const app = {
    baseUrl: 'http://127.0.0.1:54321',
    createSessionForDocuments: async () => ({ session: { publicToken: 'token' }, documents: {} }),
    listen: async () => {},
  };
  await evaluatePaws({
    evaluator: async (options) => { receivedProvider = options.provider; return evaluation; },
    serverFactory: async (options) => { receivedOptions = options; return app; },
  });
  assert.equal(receivedOptions.port, 0);
  assert.equal(receivedProvider, 'claude');
});

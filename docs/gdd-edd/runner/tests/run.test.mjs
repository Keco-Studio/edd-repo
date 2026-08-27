import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateCase, nextEvaluationId, parseCliOptions } from '../src/run.mjs';

const evalCase = {
  id: 'demo-r1', title: 'Demo', revision: 1, outputStem: 'demo-r1',
  projectId: 'project-id', documentId: 'document-id',
  gddPath: 'gdd.md', rubricPath: 'rubric.md', promptPath: 'prompt.md', isolationManifestPath: 'isolation.json',
};

const isolation = {
  sessionId: 'session-new', freshSession: true, contextSources: [], enabledPlugins: ['keco'], createdAt: '2026-08-27T10:00:00.000Z',
};

const dimension = (score, label) => ({
  score,
  observations: [{ statement: `${label}观察`, evidence: '第 1 节' }],
  rationale: `${label}理由`,
  evidenceGaps: [],
});

const rawResponse = {
  source: { projectId: 'project-id', documentId: 'document-id', revision: 1, title: 'Demo' },
  dimensions: {
    experienceValue: dimension(24, '体验价值'),
    gameplaySystems: dimension(32, '玩法与系统'),
    contentPresentation: dimension(18, '内容与呈现'),
  },
};

const assets = {
  gdd: '# Demo GDD', rubric: '# Fixed rubric', promptTemplate: '评价 {{title}}\n{{rubric}}\n{{gdd}}', schema: { type: 'object' },
  hashes: { gdd: 'g'.repeat(64), rubric: 'r'.repeat(64), prompt: 'p'.repeat(64), schema: 's'.repeat(64), isolation: 'i'.repeat(64) },
  paths: { gdd: 'gdd.md', rubric: 'rubric.md', prompt: 'prompt.md', schema: 'schema.json', isolation: 'isolation.json' },
};

const execution = {
  provider: 'codex', requestedModel: 'gpt-test', observedModel: 'gpt-test', generationParameters: { reasoningEffort: 'medium' },
  startedAt: '2026-08-27T10:00:00.000Z', finishedAt: '2026-08-27T10:00:01.000Z', durationMs: 1000, events: [],
};

test('allocates stable run suffixes from directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gdd-next-run-'));
  assert.equal(await nextEvaluationId(root, 'demo-r1'), 'demo-r1');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(join(root, 'demo-r1')));
  assert.equal(await nextEvaluationId(root, 'demo-r1'), 'demo-r1-run2');
});

test('successful evaluation writes only the fixed required artifacts', async () => {
  const runsRoot = await mkdtemp(join(tmpdir(), 'gdd-success-'));
  const result = await evaluateCase({
    evalCase, runsRoot, assets,
    isolationLoader: async () => isolation,
    evaluator: async ({ messages }) => ({ rawResponse, execution, request: { messages, provider: 'codex', requestedModel: 'gpt-test', generationParameters: { reasoningEffort: 'medium' } } }),
    provider: 'codex', model: 'gpt-test',
  });
  assert.equal(result.evaluation.aiTotalScore, 74);
  assert.deepEqual((await readdir(result.paths.root)).sort(), ['evidence', 'progress.md', 'result.md']);
  assert.deepEqual((await readdir(result.paths.evidenceRoot)).sort(), ['request.json', 'response.json']);
  assert.match(await readFile(result.paths.result, 'utf8'), /人工评分/);
  await assert.rejects(access(result.paths.problem));
});

test('Cloud failure writes incomplete Result, Progress, Problem, and request evidence', async () => {
  const runsRoot = await mkdtemp(join(tmpdir(), 'gdd-failure-'));
  await assert.rejects(evaluateCase({
    evalCase, runsRoot, assets,
    isolationLoader: async () => isolation,
    evaluator: async () => { throw new Error('Cloud unavailable'); },
    provider: 'codex', model: 'gpt-test',
  }), /Cloud unavailable/);
  const runRoot = join(runsRoot, 'demo-r1');
  assert.match(await readFile(join(runRoot, 'progress.md'), 'utf8'), /failed/);
  assert.match(await readFile(join(runRoot, 'result.md'), 'utf8'), /测评未完成/);
  assert.match(await readFile(join(runRoot, 'problem.md'), 'utf8'), /Cloud 评价/);
  await access(join(runRoot, 'evidence', 'request.json'));
});

test('invalid Cloud response is preserved before Schema failure', async () => {
  const runsRoot = await mkdtemp(join(tmpdir(), 'gdd-invalid-'));
  await assert.rejects(evaluateCase({
    evalCase, runsRoot, assets,
    isolationLoader: async () => isolation,
    evaluator: async ({ messages }) => ({ rawResponse: { source: rawResponse.source, dimensions: {} }, execution, request: { messages } }),
  }), /三个固定维度/);
  const runRoot = join(runsRoot, 'demo-r1');
  assert.deepEqual(JSON.parse(await readFile(join(runRoot, 'evidence', 'response.json'), 'utf8')).rawResponse.dimensions, {});
  assert.match(await readFile(join(runRoot, 'problem.md'), 'utf8'), /Schema 校验/);
});

test('parses evaluation CLI options without Web or baseline modes', () => {
  assert.deepEqual(parseCliOptions(['--case', 'demo-r1', '--provider=codex', '--model', 'gpt-test', '--runs-root', '/tmp/gdd-runs']), {
    caseId: 'demo-r1', provider: 'codex', model: 'gpt-test', runsRoot: '/tmp/gdd-runs', listCases: false,
  });
  assert.throws(() => parseCliOptions(['--share']), /未知参数/);
});

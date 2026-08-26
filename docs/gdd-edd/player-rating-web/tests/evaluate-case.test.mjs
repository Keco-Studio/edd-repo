import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateCase, formatEvaluationScore, nextEvaluationId, parseCliOptions, runCli } from '../src/evaluate-case.mjs';

const evalCase = Object.freeze({
  id: 'paws-patience-r97',
  type: 'gold',
  title: 'Paws & Patience',
  gddPath: 'docs/gdd-edd/gdd/paws-patience-gdd-r97.md',
  projectId: 'project-id',
  documentId: 'document-id',
  revision: 97,
  promptPath: 'docs/gdd-edd/prompts/gdd-evaluation-v1.md',
  rubricPath: 'docs/gdd-edd/rubrics/two-dimension-v1.md',
  resultTemplatePath: 'docs/gdd-edd/result/评价模板-v6.md',
  outputStem: 'paws-patience-gdd-r97',
});

const evaluation = {
  source: { projectId: 'project-id', documentId: 'document-id', revision: 97, title: 'Paws & Patience' },
  provider: 'codex',
  aiCoreScore: 45,
  aiExperienceScore: 50,
  aiTotalScore: 95,
  dimensions: {
    core: { score: 45, observations: [{ statement: '核心观察', evidence: '第三章' }], rationale: '核心理由', evidenceGaps: [] },
    experience: { score: 50, observations: [{ statement: '体验观察', evidence: '第四章' }], rationale: '体验理由', evidenceGaps: [] },
  },
  issues: [],
};

test('creates run suffixes from the selected case output stem', async () => {
  const root = await mkdtemp(join(tmpdir(), 'edd-id-'));
  assert.equal(await nextEvaluationId(root, 'other-game-r3'), 'other-game-r3');
  await writeFile(join(root, 'other-game-r3-评价结果.md'), 'existing');
  assert.equal(await nextEvaluationId(root, 'other-game-r3'), 'other-game-r3-run2');
});

test('continues after the highest run when the base document was removed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'edd-id-gap-'));
  await writeFile(join(root, 'paws-patience-gdd-r97-run2-评价结果.md'), 'existing');
  assert.equal(await nextEvaluationId(root, 'paws-patience-gdd-r97'), 'paws-patience-gdd-r97-run3');
});

test('one selected case creates three documents and returns a human-rating link', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'edd-command-'));
  const roots = { progressRoot: join(root, 'progress'), problemRoot: join(root, 'problem'), resultRoot: join(root, 'result') };
  let receivedCase;
  let renderedInput;
  const result = await evaluateCase({
    evalCase,
    provider: 'codex',
    assets: { promptTemplate: '评价 {{title}} {{gddPath}} {{rubricPath}}', resultTemplate: 'template', hashes: {} },
    evaluator: async ({ evalCase: selected, prompt }) => {
      receivedCase = selected;
      assert.match(prompt, /Paws & Patience/);
      return { evaluation, execution: { provider: 'codex', requestedModel: 'test', observedModel: null, startedAt: 'x', finishedAt: 'y', durationMs: 1, status: 'completed', exitCode: 0, prompt, rawOutput: {}, events: [] } };
    },
    renderer: (input) => { renderedInput = input; return { progress: '# Progression\n', problem: '# Problem\n', result: '# Result\n' }; },
    serverOptions: { ...roots, dataFile: join(root, 'data', 'store.json'), publicRoot: new URL('../public/', import.meta.url), host: '127.0.0.1', port: 0, rateLimit: 100 },
  });
  t.after(() => result.app.close());

  assert.equal(receivedCase, evalCase);
  assert.equal(renderedInput.evaluation, evaluation);
  assert.equal(result.case.id, evalCase.id);
  assert.match(result.playerUrl, /^http:\/\/127\.0\.0\.1:\d+\/\?session=/);
  await Promise.all([
    access(join(roots.progressRoot, result.documents.progress)),
    access(join(roots.problemRoot, result.documents.problem)),
    access(join(roots.resultRoot, result.documents.result)),
  ]);
  assert.equal(formatEvaluationScore(result), `核心玩法：45.0/50
玩家体验：50.0/50
总分：95.0/100
人工评分：${result.playerUrl}`);
});

test('parses case, provider, and list options and rejects unknown arguments', () => {
  assert.deepEqual(parseCliOptions([]), { caseId: undefined, provider: 'claude', model: undefined, listCases: false });
  assert.deepEqual(parseCliOptions(['--case', 'other-r3', '--provider=codex', '--model', 'gpt-test']), { caseId: 'other-r3', provider: 'codex', model: 'gpt-test', listCases: false });
  assert.deepEqual(parseCliOptions(['--list-cases']), { caseId: undefined, provider: 'claude', model: undefined, listCases: true });
  assert.throws(() => parseCliOptions(['--case']), /--case.*值/);
  assert.throws(() => parseCliOptions(['--unknown']), /未知参数/);
});

test('list mode prints cases without starting evaluation', async () => {
  const lines = [];
  let evaluated = false;
  const result = await runCli({
    argv: ['--list-cases'],
    write: (line) => lines.push(line),
    listCases: async () => ['other-r3', 'paws-patience-r97'],
    evaluate: async () => { evaluated = true; },
  });
  assert.equal(evaluated, false);
  assert.deepEqual(lines, ['other-r3', 'paws-patience-r97']);
  assert.deepEqual(result, { listed: true, caseIds: ['other-r3', 'paws-patience-r97'] });
});

test('run mode passes the selected case and provider to evaluation', async () => {
  let received;
  const lines = [];
  const fake = { evaluation, playerUrl: 'http://127.0.0.1:1234/?session=x' };
  await runCli({
    argv: ['--case=paws-patience-r97', '--provider', 'codex', '--model=gpt-test'],
    write: (line) => lines.push(line),
    evaluate: async (options) => { received = options; return fake; },
  });
  assert.deepEqual(received, { caseId: 'paws-patience-r97', provider: 'codex', model: 'gpt-test' });
  assert.match(lines[0], /核心玩法：45\.0\/50/);
});

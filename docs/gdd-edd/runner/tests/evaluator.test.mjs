import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import {
  buildEvaluationMessages,
  buildProviderInvocation,
  normalizeObservableEvents,
  runCloudEvaluation,
} from '../src/evaluator.mjs';

const evalCase = Object.freeze({
  id: 'demo-r1',
  title: 'Demo',
  projectId: 'project-id',
  documentId: 'document-id',
  revision: 1,
});

const dimension = (score, label) => ({
  score,
  observations: [{ statement: `${label}观察`, evidence: '第 1 节' }],
  rationale: `${label}理由`,
  evidenceGaps: [],
});

const validResponse = {
  source: { projectId: 'project-id', documentId: 'document-id', revision: 1, title: 'Demo' },
  dimensions: {
    experienceValue: dimension(24, '体验价值'),
    gameplaySystems: dimension(32, '玩法与系统'),
    contentPresentation: dimension(18, '内容与呈现'),
  },
  additionalFindings: [{ evidence: '第 2 节', description: '术语不一致' }],
};

test('builds one exact message from only current GDD and fixed rubric', () => {
  const messages = buildEvaluationMessages({
    evalCase,
    gdd: '# Demo\nOnly current GDD',
    rubric: '# Fixed rubric',
    promptTemplate: '评价 {{title}}\n<GDD>\n{{gdd}}\n</GDD>\n<RUBRIC>\n{{rubric}}\n</RUBRIC>',
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'user');
  assert.match(messages[0].content, /Only current GDD/);
  assert.match(messages[0].content, /Fixed rubric/);
  assert.doesNotMatch(messages[0].content, /run2|run3|历史失败/);
  assert.throws(() => buildEvaluationMessages({ evalCase, gdd: 'x', rubric: 'y', promptTemplate: '{{unknown}}' }), /未知 Prompt 占位符/);
});

test('provider invocations use structured output without file-reading tools', () => {
  const codex = buildProviderInvocation('codex', {
    cwd: '/repo', schemaPath: '/repo/schema.json', outputPath: '/tmp/result.json', schema: {}, prompt: 'x', model: 'gpt-test',
  });
  assert.ok(codex.args.includes('--ephemeral'));
  assert.ok(codex.args.includes('--output-schema'));
  const claude = buildProviderInvocation('claude', {
    cwd: '/repo', schemaPath: '/repo/schema.json', outputPath: '/tmp/result.json', schema: { type: 'object' }, prompt: 'x', model: 'sonnet',
  });
  assert.ok(claude.args.includes('stream-json'));
  assert.equal(claude.args[claude.args.indexOf('--tools') + 1], '');
  assert.ok(!claude.args.includes('Read'));
});

test('filters hidden reasoning from observable events', () => {
  const events = normalizeObservableEvents([
    { type: 'item.completed', item: { type: 'reasoning', text: 'hidden chain' } },
    { type: 'thinking', text: 'hidden chain' },
    { type: 'turn.completed' },
  ]);
  assert.match(JSON.stringify(events), /turn.completed/);
  assert.doesNotMatch(JSON.stringify(events), /hidden chain|thinking/);
});

test('returns exact request metadata and validated Codex response', async () => {
  const messages = [{ role: 'user', content: 'fixed current input' }];
  const runner = async (_command, args) => {
    const outputPath = args[args.indexOf('--output-last-message') + 1];
    await writeFile(outputPath, JSON.stringify(validResponse));
    return {
      stdout: [
        JSON.stringify({ type: 'thread.started', thread_id: 'thread-1' }),
        JSON.stringify({ type: 'item.completed', item: { type: 'reasoning', text: 'hidden chain' } }),
        JSON.stringify({ type: 'turn.completed' }),
      ].join('\n'),
      stderr: '',
    };
  };
  const result = await runCloudEvaluation({
    provider: 'codex',
    model: 'gpt-test',
    evalCase,
    messages,
    runner,
  });
  assert.deepEqual(result.request.messages, messages);
  assert.equal(result.request.provider, 'codex');
  assert.equal(result.request.requestedModel, 'gpt-test');
  assert.deepEqual(result.rawResponse, validResponse);
  assert.doesNotMatch(JSON.stringify(result.execution), /hidden chain/);
});

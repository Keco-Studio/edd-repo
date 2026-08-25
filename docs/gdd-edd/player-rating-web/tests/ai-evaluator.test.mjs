import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PAWS_SOURCE,
  DEFAULT_EVALUATION_CWD,
  buildEvaluationPrompt,
  buildProviderInvocation,
  runAiEvaluation,
  validateAiEvaluation,
} from '../src/ai-evaluator.mjs';

const valid = {
  source: {
    projectId: PAWS_SOURCE.projectId,
    documentId: PAWS_SOURCE.documentId,
    revision: 97,
    title: 'Paws & Patience',
  },
  model: 'test-model',
  aiCoreScore: 45,
  aiExperienceScore: 47,
  metrics: {
    core: [{ name: '核心循环要素', value: '4/4', evidence: '三、核心循环' }],
    experience: [{ name: '已定义核心界面数', value: '0', evidence: '全文' }],
  },
  issues: [
    { dimension: 'core', deduction: 5, evidence: '三、核心循环', description: '反馈规则不完整', suggestion: '补充反馈规则' },
    { dimension: 'experience', deduction: 3, evidence: '全文', description: '界面规格缺失', suggestion: '补充界面规格' },
  ],
};

test('checks only the fixed Paws source and usable score fields', () => {
  const result = validateAiEvaluation(valid);
  assert.equal(result.source.revision, 97);
  assert.equal(result.metrics.core[0].name, '核心循环要素');
  assert.equal(validateAiEvaluation({ ...valid, aiCoreScore: 44 }).aiCoreScore, 44);
  assert.throws(() => validateAiEvaluation({ ...valid, aiCoreScore: 51 }), /0-50/);
  assert.throws(() => validateAiEvaluation({ ...valid, source: { ...valid.source, documentId: 'wrong' } }), /GDD 文档/);
  assert.throws(() => validateAiEvaluation({ ...valid, source: { ...valid.source, revision: 96 } }), /GDD 修订/);
  assert.throws(() => validateAiEvaluation({ ...valid, source: { ...valid.source, title: '无法评价' } }), /GDD 标题/);
});

test('builds bounded file-writing invocations for Codex and Claude', () => {
  assert.match(DEFAULT_EVALUATION_CWD, /edd-repo$/);
  const prompt = buildEvaluationPrompt({
    evaluationId: 'paws-patience-gdd-r97-run2',
    documents: { progress: '/repo/progress.md', problem: '/repo/problem.md', result: '/repo/result.md' },
  });
  assert.match(prompt, /paws-patience-gdd-r97\.md/);
  assert.match(prompt, /评价模板-v5\.md/);
  assert.match(prompt, /progress\/README\.md/);
  assert.match(prompt, /problem\/README\.md/);
  assert.match(prompt, /result\/README\.md/);
  assert.match(prompt, /输入材料/);
  assert.match(prompt, /最终执行结果/);
  assert.match(prompt, /创建且只创建.*progress\.md/s);

  const codex = buildProviderInvocation('codex', { cwd: '/repo', schemaPath: '/repo/schema.json', outputPath: '/tmp/result.json', schema: {}, prompt });
  assert.equal(codex.command, 'codex');
  assert.ok(codex.args.includes('workspace-write'));
  assert.ok(codex.args.includes('/repo/schema.json'));
  assert.ok(codex.args.includes('model_reasoning_effort="medium"'));
  assert.ok(codex.args.includes('/tmp/result.json'));

  const claude = buildProviderInvocation('claude', { cwd: '/repo', schemaPath: '/repo/schema.json', outputPath: '/tmp/result.json', schema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' }, prompt });
  assert.equal(claude.command, 'claude');
  assert.ok(claude.args.includes('acceptEdits'));
  assert.ok(claude.args.includes('sonnet'));
  assert.ok(claude.args.includes('medium'));
  assert.ok(claude.args.includes('Read,Write'));
  assert.ok(claude.args.includes('--safe-mode'));
  assert.ok(claude.args.includes(JSON.stringify({ type: 'object' })));
  assert.ok(!claude.args.some((argument) => argument.includes('$schema')));
  assert.throws(() => buildProviderInvocation('other', { cwd: '/repo', schemaPath: '/repo/schema.json', outputPath: '/tmp/result.json', schema: {}, prompt }), /provider/);
});

test('repository contains the complete pinned Paws GDD revision', async () => {
  const markdown = await readFile(new URL(`../../../../${PAWS_SOURCE.localPath}`, import.meta.url), 'utf8');
  assert.match(markdown, /keco_revision: 97/);
  assert.match(markdown, /## 三、核心循环/);
  assert.match(markdown, /## 七、概率体系/);
  assert.ok(markdown.length > 10_000);
});

test('accepts direct Codex JSON and Claude structured_output wrappers', async () => {
  const direct = await runAiEvaluation({ provider: 'codex', prompt: 'test', runner: async () => ({ stdout: JSON.stringify(valid) }) });
  assert.equal(direct.aiCoreScore, 45);

  const wrapped = await runAiEvaluation({ provider: 'claude', prompt: 'test', runner: async () => ({ stdout: JSON.stringify({ structured_output: valid }) }) });
  assert.equal(wrapped.aiExperienceScore, 47);
});

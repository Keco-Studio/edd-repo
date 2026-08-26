import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import {
  DEFAULT_EVALUATION_CWD,
  buildEvaluationPrompt,
  buildProviderInvocation,
  runAiEvaluation,
  validateAiEvaluation,
} from '../src/ai-evaluator.mjs';

const evalCase = Object.freeze({
  id: 'paws-patience-r97', type: 'gold', title: 'Paws & Patience',
  gddPath: 'docs/gdd-edd/gdd/paws-patience-gdd-r97.md',
  projectId: 'project-id', documentId: 'document-id', revision: 97,
  promptPath: 'docs/gdd-edd/prompts/gdd-evaluation-v1.md',
  rubricPath: 'docs/gdd-edd/rubrics/two-dimension-v1.md',
  resultTemplatePath: 'docs/gdd-edd/result/评价模板-v6.md', outputStem: 'paws-patience-gdd-r97',
});

const dimension = (score, label) => ({
  score,
  observations: [{ statement: `${label}客观观察`, evidence: '三、核心循环第 1-4 条' }],
  rationale: `${label}评分理由`,
  evidenceGaps: ['缺少运行证据'],
});

const valid = {
  source: { projectId: 'project-id', documentId: 'document-id', revision: 97, title: 'Paws & Patience' },
  dimensions: { core: dimension(34, '核心玩法'), experience: dimension(31, '玩家体验') },
  issues: [{ dimension: 'core', evidence: '三、核心循环', description: '规则冲突', suggestion: '统一规则' }],
};

test('validates two evidence-backed dimensions and derives all AI scores', () => {
  const result = validateAiEvaluation(valid, evalCase);
  assert.equal(result.aiCoreScore, 34);
  assert.equal(result.aiExperienceScore, 31);
  assert.equal(result.aiTotalScore, 65);
  assert.equal(result.dimensions.core.observations[0].statement, '核心玩法客观观察');
  assert.throws(() => validateAiEvaluation({ ...valid, dimensions: { ...valid.dimensions, core: { ...valid.dimensions.core, score: 51 } } }, evalCase), /0-50/);
  assert.throws(() => validateAiEvaluation({ ...valid, dimensions: { ...valid.dimensions, core: { ...valid.dimensions.core, observations: [] } } }, evalCase), /客观观察/);
  assert.throws(() => validateAiEvaluation({ ...valid, source: { ...valid.source, revision: 98 } }, evalCase), /GDD 修订/);
});

test('renders the short versioned prompt without document-writing instructions', () => {
  const prompt = buildEvaluationPrompt({
    evalCase,
    promptTemplate: '评价 {{title}}\nGDD={{gddPath}}\nRUBRIC={{rubricPath}}\n只返回 JSON。',
  });
  assert.match(prompt, /Paws & Patience/);
  assert.match(prompt, /paws-patience-gdd-r97\.md/);
  assert.match(prompt, /two-dimension-v1\.md/);
  assert.doesNotMatch(prompt, /Progression|Problem|Result|创建.*文档/);
  assert.throws(() => buildEvaluationPrompt({ evalCase, promptTemplate: '{{unknown}}' }), /未知 Prompt 占位符/);
});

test('uses machine-readable observable event modes for Codex and Claude', () => {
  assert.match(DEFAULT_EVALUATION_CWD, /edd-repo$/);
  const codex = buildProviderInvocation('codex', { cwd: '/repo', schemaPath: '/repo/schema.json', outputPath: '/tmp/result.json', schema: {}, prompt: 'x', model: 'gpt-test' });
  assert.ok(codex.args.includes('--json'));
  assert.ok(codex.args.includes('gpt-test'));
  const claude = buildProviderInvocation('claude', { cwd: '/repo', schemaPath: '/repo/schema.json', outputPath: '/tmp/result.json', schema: { type: 'object' }, prompt: 'x', model: 'sonnet' });
  assert.ok(claude.args.includes('stream-json'));
  assert.ok(claude.args.includes('--verbose'));
});

test('captures Codex JSONL events and final structured output without reasoning text', async () => {
  const runner = async (_command, args) => {
    const outputPath = args[args.indexOf('--output-last-message') + 1];
    await writeFile(outputPath, JSON.stringify(valid));
    return { stdout: [
      JSON.stringify({ type: 'thread.started', thread_id: 'thread-1' }),
      JSON.stringify({ type: 'item.completed', item: { type: 'reasoning', text: 'hidden chain of thought' } }),
      JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'sed -n 1,20p docs/gdd.md' } }),
      JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 20 } }),
    ].join('\n'), stderr: '' };
  };
  const result = await runAiEvaluation({ provider: 'codex', model: 'gpt-test', evalCase, prompt: 'fixed prompt', runner });
  assert.equal(result.evaluation.aiTotalScore, 65);
  assert.equal(result.execution.provider, 'codex');
  assert.equal(result.execution.requestedModel, 'gpt-test');
  assert.equal(result.execution.status, 'completed');
  assert.match(JSON.stringify(result.execution.events), /sed -n/);
  assert.doesNotMatch(JSON.stringify(result.execution), /hidden chain of thought/);
  assert.deepEqual(result.execution.rawOutput, valid);
});

test('captures Claude stream-json and observed model', async () => {
  const stdout = [
    JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-sonnet-test' }),
    JSON.stringify({ type: 'system', subtype: 'thinking_tokens', token_count: 100 }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'docs/gdd.md' } }] } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'StructuredOutput', input: valid }] } }),
    JSON.stringify({ type: 'result', subtype: 'success', structured_output: valid }),
  ].join('\n');
  const result = await runAiEvaluation({ provider: 'claude', evalCase, prompt: 'fixed prompt', runner: async () => ({ stdout, stderr: '' }) });
  assert.equal(result.evaluation.aiCoreScore, 34);
  assert.equal(result.execution.requestedModel, 'sonnet');
  assert.equal(result.execution.observedModel, 'claude-sonnet-test');
  assert.match(JSON.stringify(result.execution.events), /Read/);
  assert.doesNotMatch(JSON.stringify(result.execution.events), /thinking_tokens/);
  assert.doesNotMatch(JSON.stringify(result.execution.events), /StructuredOutput/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkflowDocuments, renderWorkflowDocuments, validateWorkflowInput } from '../src/workflow.mjs';

const input = {
  evaluationId: 'stray-cat-r1',
  gameTitle: '流浪猫收养记',
  gddReference: 'Keco:GDD-2026-08-25',
  runtimeEvidence: '试玩构建 build-01',
  aiCoreScore: 45,
  aiExperienceScore: 47,
  expiryDays: 7,
  provider: 'codex',
  model: 'test-model',
  sourceRevision: 97,
  metrics: {
    core: [{ name: '循环要素', value: '4/4', evidence: 'GDD/核心循环' }],
    experience: [{ name: '界面数量', value: '1', evidence: 'GDD/UI' }],
  },
  issues: [
    { dimension: 'core', deduction: 5, evidence: 'GDD/核心循环', description: '建房反馈不明确', suggestion: '补充反馈规则' },
    { dimension: 'experience', deduction: 3, evidence: '试玩截图 01', description: '按钮层级不清', suggestion: '强化主操作' },
  ],
};

test('validates IDs, issue fields, and deduction totals', () => {
  assert.equal(validateWorkflowInput(input).evaluationId, 'stray-cat-r1');
  assert.throws(() => validateWorkflowInput({ ...input, evaluationId: '../bad' }), /执行标识/);
  assert.throws(() => validateWorkflowInput({ ...input, aiCoreScore: 44 }), /扣分合计/);
  assert.throws(() => validateWorkflowInput({ ...input, issues: [{ ...input.issues[0], dimension: 'engineering' }] }), /维度/);
});

test('renders three linked documents with stable issue numbers', () => {
  const rendered = renderWorkflowDocuments(validateWorkflowInput(input), '2026-08-25T06:00:00.000Z');
  assert.equal(rendered.names.progress, 'stray-cat-r1-Progression.md');
  assert.equal(rendered.names.problem, 'stray-cat-r1-问题记录.md');
  assert.equal(rendered.names.result, 'stray-cat-r1-评价结果.md');
  assert.match(rendered.progress, /stray-cat-r1-问题记录\.md/);
  assert.match(rendered.problem, /P-01[\s\S]*P-02/);
  assert.match(rendered.result, /评价模板-v5\.md/);
  assert.match(rendered.result, /P-01[\s\S]*-5/);
  assert.match(rendered.result, /循环要素[\s\S]*4\/4/);
  assert.match(rendered.result, /provider: codex/);
  assert.match(rendered.result, /暂无玩家评分/);
});

test('creates only scoped files and rejects duplicate workflow IDs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'edd-workflow-'));
  const roots = { progressRoot: join(root, 'progress'), problemRoot: join(root, 'problem'), resultRoot: join(root, 'result') };
  const created = await createWorkflowDocuments(input, roots, '2026-08-25T06:00:00.000Z');
  await Promise.all([access(created.paths.progress), access(created.paths.problem), access(created.paths.result)]);
  assert.match(await readFile(created.paths.result, 'utf8'), /流浪猫收养记/);
  await assert.rejects(createWorkflowDocuments(input, roots), /已存在/);
  await writeFile(join(root, 'outside.md'), 'keep');
  assert.equal(await readFile(join(root, 'outside.md'), 'utf8'), 'keep');
});

test('escapes model text so Markdown tables keep their structure', () => {
  const unsafe = {
    ...input,
    aiCoreScore: 49,
    issues: [
      { dimension: 'core', deduction: 1, evidence: '章节 | 三', description: '第一行\n第二行', suggestion: '补充 | 规则' },
      input.issues[1],
    ],
  };
  const rendered = renderWorkflowDocuments(validateWorkflowInput(unsafe));
  assert.match(rendered.result, /章节 \\\| 三/);
  assert.match(rendered.result, /第一行 第二行/);
  assert.match(rendered.result, /补充 \\\| 规则/);
});

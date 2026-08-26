import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEvaluationAssets, renderEvaluationDocuments, writeEvaluationDocuments } from '../src/document-renderer.mjs';

const evalCase = {
  id: 'game-r1', type: 'gold', title: 'Game', gddPath: 'docs/gdd.md', projectId: 'p', documentId: 'd', revision: 1,
  promptPath: 'docs/prompt.md', rubricPath: 'docs/rubric.md', resultTemplatePath: 'docs/result.md', outputStem: 'game-r1',
};

const evaluation = {
  source: { projectId: 'p', documentId: 'd', revision: 1, title: 'Game' },
  dimensions: {
    core: { score: 34, observations: [{ statement: '循环闭环', evidence: '第三章' }], rationale: '基本达标', evidenceGaps: ['缺少实测'] },
    experience: { score: 31, observations: [{ statement: '反馈已定义', evidence: '第四章' }], rationale: '仍需补充', evidenceGaps: [] },
  },
  issues: [{ dimension: 'core', evidence: '第三章', description: '规则冲突', suggestion: '统一规则' }],
  aiCoreScore: 34, aiExperienceScore: 31, aiTotalScore: 65,
};

const execution = {
  provider: 'codex', requestedModel: 'gpt-test', observedModel: null,
  startedAt: '2026-08-26T00:00:00.000Z', finishedAt: '2026-08-26T00:00:02.000Z', durationMs: 2000,
  status: 'completed', exitCode: 0, prompt: '完整应用 Prompt', rawOutput: { source: evaluation.source, dimensions: evaluation.dimensions, issues: evaluation.issues },
  events: [{ type: 'tool', name: 'command_execution', detail: 'sed -n 1,20p docs/gdd.md' }],
};

const template = `# GDD EDD 评价结果
- 评价标识：{{evaluationId}}
- 模板版本：v6
- AI 核心玩法：{{aiCoreScore}}/50
- AI 玩家体验：{{aiExperienceScore}}/50
- AI 总分：{{aiTotalScore}}/100
- 玩家有效样本：0
- 最终核心玩法：暂无玩家评分
- 最终玩家体验：暂无玩家评分
- 最终总分：暂无玩家评分
{{coreObservations}}
{{coreRationale}}
{{coreEvidenceGaps}}
{{experienceObservations}}
{{experienceRationale}}
{{experienceEvidenceGaps}}
{{title}} {{revision}} {{provider}} {{requestedModel}} {{observedModel}} {{rubricPath}}
{{progressDocument}} {{problemDocument}} {{issueCount}}`;

test('loads fixed assets and computes SHA-256 hashes', async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), 'edd-assets-'));
  await mkdir(join(repositoryRoot, 'docs'), { recursive: true });
  await Promise.all([
    writeFile(join(repositoryRoot, 'docs/gdd.md'), 'gdd'), writeFile(join(repositoryRoot, 'docs/prompt.md'), 'prompt'),
    writeFile(join(repositoryRoot, 'docs/rubric.md'), 'rubric'), writeFile(join(repositoryRoot, 'docs/result.md'), template),
  ]);
  const schemaPath = join(repositoryRoot, 'schema.json');
  await writeFile(schemaPath, '{}');
  const assets = await loadEvaluationAssets(evalCase, { repositoryRoot, schemaPath });
  assert.equal(assets.promptTemplate, 'prompt');
  assert.match(assets.hashes.gdd, /^[a-f0-9]{64}$/);
  assert.notEqual(assets.hashes.gdd, assets.hashes.prompt);
});

test('renders concise non-overlapping Progression, Problem, and Result', () => {
  const documents = { progress: 'game-r1-Progression.md', problem: 'game-r1-问题记录.md', result: 'game-r1-评价结果.md' };
  const assets = { resultTemplate: template, hashes: { gdd: 'a', prompt: 'b', rubric: 'c', schema: 'd', resultTemplate: 'e' } };
  const rendered = renderEvaluationDocuments({ evalCase, evaluation, execution, evaluationId: 'game-r1', documents, assets });

  assert.match(rendered.progress, /完整应用 Prompt/);
  assert.match(rendered.progress, /sed -n 1,20p/);
  assert.match(rendered.progress, /"score": 34/);
  assert.match(rendered.progress, /SHA-256/);
  assert.doesNotMatch(rendered.progress, /统一分档|实际评价步骤|隐藏思维/);

  assert.match(rendered.problem, /规则冲突/);
  assert.match(rendered.problem, /统一规则/);
  assert.match(rendered.result, /循环闭环/);
  assert.match(rendered.result, /共记录|1/);
  assert.doesNotMatch(rendered.result, /规则冲突/);
  assert.doesNotMatch(rendered.result, /\{\{/);
});

test('writes the three rendered documents', async () => {
  const root = await mkdtemp(join(tmpdir(), 'edd-render-'));
  const paths = { progress: join(root, 'progress/p.md'), problem: join(root, 'problem/q.md'), result: join(root, 'result/r.md') };
  await writeEvaluationDocuments(paths, { progress: 'P', problem: 'Q', result: 'R' });
  assert.equal(await readFile(paths.progress, 'utf8'), 'P');
  assert.equal(await readFile(paths.problem, 'utf8'), 'Q');
  assert.equal(await readFile(paths.result, 'utf8'), 'R');
});

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
    experienceValue: { score: 22, observations: [{ statement: '目标玩家明确', evidence: '第二章' }], rationale: '基本达标', evidenceGaps: ['缺少实测'] },
    gameplaySystems: { score: 31, observations: [{ statement: '循环闭环', evidence: '第三章' }], rationale: '基本成立', evidenceGaps: [] },
    contentPresentation: { score: 20, observations: [{ statement: '反馈已定义', evidence: '第四章' }], rationale: '仍需补充', evidenceGaps: [] },
  },
  issues: [{ dimension: 'gameplaySystems', evidence: '第三章', description: '规则冲突', suggestion: '统一规则' }],
  aiExperienceValueScore: 22, aiGameplaySystemsScore: 31, aiContentPresentationScore: 20, aiTotalScore: 73,
};

const execution = {
  provider: 'codex', requestedModel: 'gpt-test', observedModel: null,
  startedAt: '2026-08-26T00:00:00.000Z', finishedAt: '2026-08-26T00:00:02.000Z', durationMs: 2000,
  status: 'completed', exitCode: 0, prompt: '完整应用 Prompt', rawOutput: { source: evaluation.source, dimensions: evaluation.dimensions, issues: evaluation.issues },
  events: [{ type: 'tool', name: 'command_execution', detail: 'sed -n 1,20p docs/gdd.md' }],
};

const audit = {
  goal: '根据固定 GDD 和标尺生成可人工复核的评价文档',
  evidence: { path: 'evidence/game-r1-ai-output.json', sha256: 'f'.repeat(64) },
  events: [
    { component: 'Node', action: '加载固定输入', status: 'completed', detail: 'Eval Case 与 5 项资产已校验' },
    { component: 'AI', action: '执行评价', status: 'completed', detail: 'Schema 校验通过' },
    { component: 'Provider', action: '请求', status: 'observed', detail: 'Authorization: Bearer visible-secret' },
  ],
  nextAction: '查看 Result 并分发人工评分链接',
};

const template = `# GDD EDD 评价结果
- 评价标识：{{evaluationId}}
- 模板版本：v7
- AI 体验价值：{{aiExperienceValueScore}}/30
- AI 玩法与系统：{{aiGameplaySystemsScore}}/40
- AI 内容与呈现：{{aiContentPresentationScore}}/30
- AI 总分：{{aiTotalScore}}/100
- 玩家有效样本：0
- 最终体验价值：暂无玩家评分
- 最终玩法与系统：暂无玩家评分
- 最终内容与呈现：暂无玩家评分
- 最终总分：暂无玩家评分
{{experienceValueObservations}}
{{experienceValueRationale}}
{{experienceValueEvidenceGaps}}
{{gameplaySystemsObservations}}
{{gameplaySystemsRationale}}
{{gameplaySystemsEvidenceGaps}}
{{contentPresentationObservations}}
{{contentPresentationRationale}}
{{contentPresentationEvidenceGaps}}
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
  const rendered = renderEvaluationDocuments({ evalCase, evaluation, execution, evaluationId: 'game-r1', documents, assets, audit });

  assert.match(rendered.progress, /完整应用 Prompt/);
  assert.match(rendered.progress, /加载固定输入/);
  assert.match(rendered.progress, /执行评价/);
  assert.match(rendered.progress, /evidence\/game-r1-ai-output\.json/);
  assert.match(rendered.progress, new RegExp('f{64}'));
  assert.match(rendered.progress, /查看 Result 并分发人工评分链接/);
  assert.match(rendered.progress, /SHA-256/);
  assert.doesNotMatch(rendered.progress, /"score"|AI 体验价值|AI 玩法与系统|AI 内容与呈现|AI 总分|最终总分/);
  assert.doesNotMatch(rendered.progress, /visible-secret/);
  assert.doesNotMatch(rendered.progress, /sed -n 1,20p/);
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

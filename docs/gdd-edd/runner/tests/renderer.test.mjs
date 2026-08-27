import test from 'node:test';
import assert from 'node:assert/strict';
import { renderProblem, renderProgress, renderResult } from '../src/renderer.mjs';

const input = {
  evaluationId: 'demo-run1',
  status: 'awaiting_human',
  evalCase: { id: 'demo-r1', title: 'Demo', revision: 1 },
  isolation: {
    sessionId: 'session-new', freshSession: true, contextSources: [], enabledPlugins: ['keco'], createdAt: '2026-08-27T10:00:00.000Z',
  },
  assets: {
    rubric: '# Fixed rubric\n严重缺失 / 清晰有效',
    promptTemplate: '你是评分器。\n<GDD>{{gdd}}</GDD>\n<RUBRIC>{{rubric}}</RUBRIC>',
    hashes: { gdd: 'g'.repeat(64), rubric: 'r'.repeat(64), prompt: 'p'.repeat(64), schema: 's'.repeat(64), isolation: 'i'.repeat(64) },
    paths: { gdd: 'gdd.md', rubric: 'rubric.md', prompt: 'prompt.md', schema: 'schema.json', isolation: 'isolation.json' },
  },
  messages: [{ role: 'user', content: 'exact cloud message' }],
  evaluation: {
    summary: '治愈养猫的情感定位鲜明，羁绊、天气与相遇系统形成了可执行的核心循环；但寿命规则与消失机制仍有矛盾，视觉、音频和 UI 规格也需要在制作前补齐。',
    aiTotalScore: 74,
    dimensions: {
      experienceValue: { score: 24, observations: [{ statement: '目标明确', evidence: '第 1 节' }], rationale: '价值证据充分', evidenceGaps: [] },
      gameplaySystems: { score: 32, observations: [{ statement: '循环完整', evidence: '第 2 节' }], rationale: '系统较清晰', evidenceGaps: [] },
      contentPresentation: { score: 18, observations: [{ statement: '叙事存在', evidence: '第 3 节' }], rationale: '呈现定义不足', evidenceGaps: ['音频未定义'] },
    },
    additionalFindings: [{ evidence: '第 4 节', description: '术语不一致' }],
  },
  execution: {
    provider: 'codex', requestedModel: 'gpt-test', observedModel: 'gpt-observed', generationParameters: { reasoningEffort: 'medium' },
    startedAt: '2026-08-27T10:00:00.000Z', finishedAt: '2026-08-27T10:00:01.000Z', durationMs: 1000,
    events: [{ type: 'status', name: 'turn.completed', detail: '' }],
  },
  evidence: {
    request: { path: 'evidence/request.json', sha256: 'a'.repeat(64) },
    response: { path: 'evidence/response.json', sha256: 'b'.repeat(64) },
  },
};

test('renders a visible User Prompt template with an accurate injection note', () => {
  const markdown = renderProgress(input);
  assert.match(markdown, /demo-run1/);
  assert.match(markdown, /session-new/);
  assert.match(markdown, /keco/);
  assert.match(markdown, /AI 40%.*人工 60%/);
  assert.match(markdown, /## 输入提示词/);
  assert.match(markdown, /### User Prompt/);
  assert.match(markdown, /运行时已注入本次 GDD 和固定 Rubric/);
  assert.match(markdown, /Progress 仅保留占位符版本/);
  assert.doesNotMatch(markdown, /### System Prompt|尚未注入/);
  assert.match(markdown, /你是评分器/);
  assert.match(markdown, /\{\{gdd\}\}/);
  assert.doesNotMatch(markdown, /<details>|<summary>/);
  assert.doesNotMatch(markdown, /exact cloud message|Fixed rubric\n严重缺失/);
  assert.match(markdown, /g{64}/);
  assert.match(markdown, /evidence\/request\.json/);
});

test('renders one user Result without full Prompt or Rubric', () => {
  const markdown = renderResult(input);
  assert.match(markdown, /暂定 AI 总分：74\.0\/100/);
  assert.match(markdown, /治愈养猫的情感定位鲜明，羁绊、天气与相遇系统形成了可执行的核心循环/);
  assert.match(markdown, /寿命规则与消失机制仍有矛盾，视觉、音频和 UI 规格也需要在制作前补齐/);
  assert.doesNotMatch(markdown, /整体方向清晰、基础扎实|人工完成同维度评分后/);
  assert.match(markdown, /体验价值.*24\.0\/30/s);
  assert.match(markdown, /价值证据充分/);
  assert.match(markdown, /音频未定义/);
  assert.match(markdown, /术语不一致/);
  assert.match(markdown, /评分人：`__`/);
  assert.match(markdown, /Provider：codex/);
  assert.match(markdown, /过程记录：progress\.md/);
  assert.match(markdown, /EDD_FINAL_START/);
  assert.doesNotMatch(markdown, /exact cloud message|Fixed rubric/);
});

test('renders incomplete Result and operational Problem on failure', () => {
  const failed = { ...input, status: 'failed', evaluation: null, error: new Error('Cloud unavailable'), failedStage: 'Cloud 评价' };
  const result = renderResult(failed);
  const problem = renderProblem(failed);
  assert.match(result, /测评未完成/);
  assert.doesNotMatch(result, /最终总分：\d/);
  assert.match(problem, /Cloud 评价/);
  assert.match(problem, /Cloud unavailable/);
  assert.match(problem, /npm run eval/);
});

test('renders a user-visible running Result', () => {
  const markdown = renderResult({ ...input, status: 'running', evaluation: null, failedStage: undefined });
  assert.match(markdown, /AI 评分中/);
  assert.doesNotMatch(markdown, /problem\.md/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  combineScores,
  DIMENSIONS,
  validateAiEvaluation,
  validateHumanScores,
} from '../src/contracts.mjs';

const evalCase = {
  projectId: 'p1',
  documentId: 'd1',
  revision: 1,
  title: 'Demo',
};

const raw = {
  source: {
    projectId: 'p1',
    documentId: 'd1',
    revision: 1,
    title: 'Demo',
  },
  summary: '核心循环和角色定位清楚；但内容规格与关键数值仍需补齐。',
  dimensions: {
    experienceValue: {
      score: 24,
      observations: [{ statement: '目标明确', evidence: '第 1 节' }],
      rationale: '证据充分',
      evidenceGaps: [],
    },
    gameplaySystems: {
      score: 32,
      observations: [{ statement: '循环完整', evidence: '第 2 节' }],
      rationale: '规则清楚',
      evidenceGaps: [],
    },
    contentPresentation: {
      score: 18,
      observations: [{ statement: '叙事存在', evidence: '第 3 节' }],
      rationale: '呈现不足',
      evidenceGaps: ['音频未定义'],
    },
  },
  additionalFindings: [{ evidence: '第 4 节', description: '术语不一致' }],
};

test('fixed dimensions are 30/40/30', () => {
  assert.deepEqual(DIMENSIONS.map(({ key, maximum }) => [key, maximum]), [
    ['experienceValue', 30],
    ['gameplaySystems', 40],
    ['contentPresentation', 30],
  ]);
});

test('AI validation accepts evidence-backed fixed dimensions', () => {
  const result = validateAiEvaluation(raw, evalCase);
  assert.equal(result.aiTotalScore, 74);
  assert.equal(result.summary, raw.summary);
  assert.deepEqual(result.additionalFindings, raw.additionalFindings);
});

test('AI validation rejects scoring workflow language in the customer summary', () => {
  assert.throws(
    () => validateAiEvaluation({ ...raw, summary: '设计基础不错，人工评分后按 AI 40%、人工 60% 计算最终分。' }, evalCase),
    /只能概括 GDD 优缺点/,
  );
});

test('AI validation rejects missing and extra dimensions', () => {
  assert.throws(
    () => validateAiEvaluation({ ...raw, dimensions: { experienceValue: raw.dimensions.experienceValue } }, evalCase),
    /三个固定维度/,
  );
  assert.throws(
    () => validateAiEvaluation({ ...raw, dimensions: { ...raw.dimensions, engineering: raw.dimensions.experienceValue } }, evalCase),
    /三个固定维度/,
  );
});

test('human scores use the same maxima', () => {
  assert.deepEqual(validateHumanScores({
    evaluator: 'Li',
    evaluatedAt: '2026-08-27',
    rationale: '人工复核',
    experienceValue: 20,
    gameplaySystems: 35,
    contentPresentation: 25,
  }).scores, {
    experienceValue: 20,
    gameplaySystems: 35,
    contentPresentation: 25,
  });
  assert.throws(() => validateHumanScores({
    evaluator: 'Li',
    evaluatedAt: '2026-08-27',
    rationale: '人工复核',
    experienceValue: 31,
    gameplaySystems: 35,
    contentPresentation: 25,
  }), /体验价值/);
});

test('combined score uses 40/60 and one-decimal rounding', () => {
  assert.deepEqual(combineScores(
    { experienceValue: 24, gameplaySystems: 32, contentPresentation: 18 },
    { experienceValue: 20, gameplaySystems: 35, contentPresentation: 25 },
  ), {
    dimensions: {
      experienceValue: 21.6,
      gameplaySystems: 33.8,
      contentPresentation: 22.2,
    },
    aiTotal: 74,
    humanTotal: 80,
    finalTotal: 77.6,
  });
});

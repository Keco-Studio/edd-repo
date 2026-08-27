const fail = (message) => { throw new Error(message); };
const round = (value) => Math.round((Number(value) + Number.EPSILON) * 10) / 10;

export const DIMENSIONS = Object.freeze([
  Object.freeze({ key: 'experienceValue', label: '体验价值', maximum: 30 }),
  Object.freeze({ key: 'gameplaySystems', label: '玩法与系统', maximum: 40 }),
  Object.freeze({ key: 'contentPresentation', label: '内容与呈现', maximum: 30 }),
]);

const DIMENSION_KEYS = DIMENSIONS.map(({ key }) => key);

function requiredText(value, label, maximum = 1000) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maximum) fail(`${label}必须为 1-${maximum} 字`);
  return text;
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label}必须为对象`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${label}字段必须严格为：${wanted.join('、')}`);
  }
}

function boundedScore(value, dimension) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > dimension.maximum) {
    fail(`${dimension.label}评分必须为 0-${dimension.maximum}`);
  }
  return round(score);
}

function validateDimension(raw, dimension) {
  exactKeys(raw, ['score', 'observations', 'rationale', 'evidenceGaps'], `${dimension.label}评价`);
  if (!Array.isArray(raw.observations) || raw.observations.length < 1 || raw.observations.length > 20) {
    fail(`${dimension.label}必须包含 1-20 条客观观察`);
  }
  const observations = raw.observations.map((item, index) => {
    exactKeys(item, ['statement', 'evidence'], `${dimension.label}客观观察 ${index + 1}`);
    return {
      statement: requiredText(item.statement, `${dimension.label}客观观察 ${index + 1}`, 500),
      evidence: requiredText(item.evidence, `${dimension.label}证据 ${index + 1}`, 300),
    };
  });
  if (!Array.isArray(raw.evidenceGaps) || raw.evidenceGaps.length > 20) {
    fail(`${dimension.label}证据缺口必须为最多 20 项的数组`);
  }
  return {
    score: boundedScore(raw.score, dimension),
    observations,
    rationale: requiredText(raw.rationale, `${dimension.label}评分理由`, 1000),
    evidenceGaps: raw.evidenceGaps.map((item, index) => (
      requiredText(item, `${dimension.label}证据缺口 ${index + 1}`, 500)
    )),
  };
}

function validateSource(raw, evalCase) {
  exactKeys(raw, ['projectId', 'documentId', 'revision', 'title'], '来源标识');
  if (raw.projectId !== evalCase.projectId) fail('AI 返回的项目 ID 不匹配');
  if (raw.documentId !== evalCase.documentId) fail('AI 返回的文档 ID 不匹配');
  if (!Number.isInteger(raw.revision) || raw.revision !== evalCase.revision) fail('AI 返回的 GDD 修订号不匹配');
  if (raw.title !== evalCase.title) fail('AI 返回的 GDD 标题不匹配');
  return {
    projectId: requiredText(raw.projectId, '项目 ID', 200),
    documentId: requiredText(raw.documentId, '文档 ID', 200),
    revision: raw.revision,
    title: requiredText(raw.title, 'GDD 标题', 100),
  };
}

function validateAdditionalFindings(raw = []) {
  if (!Array.isArray(raw) || raw.length > 20) fail('补充发现必须为最多 20 项的数组');
  return raw.map((item, index) => {
    exactKeys(item, ['evidence', 'description'], `补充发现 ${index + 1}`);
    return {
      evidence: requiredText(item.evidence, `补充发现 ${index + 1} 证据`, 300),
      description: requiredText(item.description, `补充发现 ${index + 1} 描述`, 500),
    };
  });
}

export function validateAiEvaluation(raw = {}, evalCase, options = {}) {
  if (!evalCase) fail('必须提供 Eval Case');
  const rootKeys = Object.keys(raw).sort();
  const legacySummary = options.allowLegacySummary === true && raw.summary === undefined;
  const allowedRootKeys = raw.additionalFindings === undefined
    ? legacySummary ? ['dimensions', 'source'] : ['dimensions', 'source', 'summary']
    : legacySummary ? ['additionalFindings', 'dimensions', 'source'] : ['additionalFindings', 'dimensions', 'source', 'summary'];
  if (rootKeys.length !== allowedRootKeys.length || rootKeys.some((key, index) => key !== allowedRootKeys[index])) {
    fail('AI 输出必须包含 source、summary、dimensions 和可选 additionalFindings');
  }
  const summary = legacySummary ? '' : requiredText(raw.summary, '客户简要总结', 600);
  if (summary && /AI\s*40%|人工\s*60%|人工评分|最终分|合并.*分|暂定\s*AI|维度排名|证据缺口.*\d+\s*项/i.test(summary)) {
    fail('客户简要总结只能概括 GDD 优缺点，不得包含评分流程、权重、排名或缺口数量');
  }
  exactKeys(raw.dimensions, DIMENSION_KEYS, 'AI 输出必须包含三个固定维度');
  const dimensions = Object.fromEntries(DIMENSIONS.map((dimension) => [
    dimension.key,
    validateDimension(raw.dimensions[dimension.key], dimension),
  ]));
  const scores = Object.fromEntries(DIMENSIONS.map(({ key }) => [key, dimensions[key].score]));
  return {
    source: validateSource(raw.source, evalCase),
    summary,
    dimensions,
    additionalFindings: validateAdditionalFindings(raw.additionalFindings),
    aiExperienceValueScore: scores.experienceValue,
    aiGameplaySystemsScore: scores.gameplaySystems,
    aiContentPresentationScore: scores.contentPresentation,
    aiTotalScore: round(Object.values(scores).reduce((sum, value) => sum + value, 0)),
  };
}

export function validateHumanScores(input = {}) {
  const evaluator = requiredText(input.evaluator, '人工评分者', 100);
  const evaluatedAt = requiredText(input.evaluatedAt, '人工评分时间', 100);
  if (Number.isNaN(Date.parse(evaluatedAt))) fail('人工评分时间必须为有效日期或 ISO 时间');
  const rationale = requiredText(input.rationale, '人工评分理由', 1000);
  const scores = Object.fromEntries(DIMENSIONS.map((dimension) => [
    dimension.key,
    boundedScore(input[dimension.key], dimension),
  ]));
  return { evaluator, evaluatedAt, rationale, scores };
}

export function combineScores(ai, human) {
  const dimensions = Object.fromEntries(DIMENSIONS.map((dimension) => {
    const aiScore = boundedScore(ai?.[dimension.key], dimension);
    const humanScore = boundedScore(human?.[dimension.key], dimension);
    return [dimension.key, round(aiScore * 0.4 + humanScore * 0.6)];
  }));
  return {
    dimensions,
    aiTotal: round(DIMENSIONS.reduce((sum, { key }) => sum + Number(ai[key]), 0)),
    humanTotal: round(DIMENSIONS.reduce((sum, { key }) => sum + Number(human[key]), 0)),
    finalTotal: round(DIMENSIONS.reduce((sum, { key }) => sum + dimensions[key], 0)),
  };
}

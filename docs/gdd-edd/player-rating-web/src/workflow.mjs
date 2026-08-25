import { randomBytes } from 'node:crypto';
import { access, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const fail = (message) => { throw new Error(message); };
const text = (value, label, max = 300) => {
  const result = String(value || '').trim();
  if (!result || result.length > max) fail(`${label}必须为 1-${max} 字`);
  return result;
};
const score = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 50) fail(`${label}必须为 0-50`);
  return Math.round(number * 10) / 10;
};

export function validateWorkflowInput(input = {}) {
  const evaluationId = text(input.evaluationId, '执行标识', 80);
  if (!/^[\p{L}\p{N}._-]+$/u.test(evaluationId)) fail('执行标识只能包含中英文、数字、点、短横线和下划线');
  const aiCoreScore = score(input.aiCoreScore, 'AI 核心玩法得分');
  const aiExperienceScore = score(input.aiExperienceScore, 'AI 玩家体验得分');
  if (!Array.isArray(input.issues) || input.issues.length > 100) fail('AI 问题必须为不超过 100 项的数组');
  const issues = input.issues.map((issue, index) => {
    if (!['core', 'experience'].includes(issue.dimension)) fail(`第 ${index + 1} 项问题维度无效`);
    const deduction = Number(issue.deduction);
    if (!Number.isFinite(deduction) || deduction <= 0 || deduction > 50) fail(`第 ${index + 1} 项扣分必须大于 0 且不超过 50`);
    return { dimension: issue.dimension, deduction: Math.round(deduction * 10) / 10, evidence: text(issue.evidence, `第 ${index + 1} 项证据`, 300), description: text(issue.description, `第 ${index + 1} 项问题`, 500), suggestion: text(issue.suggestion, `第 ${index + 1} 项建议`, 500) };
  });
  const total = (dimension) => Math.round(issues.filter((issue) => issue.dimension === dimension).reduce((sum, issue) => sum + issue.deduction, 0) * 10) / 10;
  if (total('core') !== Math.round((50 - aiCoreScore) * 10) / 10) fail('核心玩法问题扣分合计必须等于 50 减 AI 得分');
  if (total('experience') !== Math.round((50 - aiExperienceScore) * 10) / 10) fail('玩家体验问题扣分合计必须等于 50 减 AI 得分');
  const expiryDays = Number(input.expiryDays ?? 7);
  if (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 30) fail('有效期必须为 1-30 天整数');
  const metricList = (values, label) => {
    if (values == null) return [];
    if (!Array.isArray(values) || values.length > 50) fail(`${label}指标必须为不超过 50 项的数组`);
    return values.map((metric, index) => ({
      name: text(metric.name, `${label}第 ${index + 1} 项名称`, 100),
      value: text(metric.value, `${label}第 ${index + 1} 项数据`, 100),
      evidence: text(metric.evidence, `${label}第 ${index + 1} 项证据`, 300),
    }));
  };
  return {
    evaluationId,
    gameTitle: text(input.gameTitle, '游戏名称', 80),
    gddReference: text(input.gddReference, 'GDD 引用', 300),
    runtimeEvidence: String(input.runtimeEvidence || '').trim().slice(0, 1000),
    aiCoreScore,
    aiExperienceScore,
    expiryDays,
    issues,
    metrics: {
      core: metricList(input.metrics?.core, '核心玩法'),
      experience: metricList(input.metrics?.experience, '玩家体验'),
    },
    provider: input.provider ? text(input.provider, 'AI provider', 50) : 'unspecified',
    model: input.model ? text(input.model, '模型名称', 100) : 'unspecified',
    sourceRevision: Number.isInteger(input.sourceRevision) ? input.sourceRevision : null,
  };
}

const label = (dimension) => dimension === 'core' ? '核心玩法' : '玩家体验';
const cell = (value) => String(value).replace(/\r?\n/g, ' ').replaceAll('|', '\\|');
const issueRows = (issues) => issues.length ? issues.map((issue, index) => `| P-${String(index + 1).padStart(2, '0')} | ${label(issue.dimension)} | -${issue.deduction} | ${cell(issue.evidence)} | ${cell(issue.description)} | ${cell(issue.suggestion)} |`).join('\n') : '| 无 | - | 0 | - | 未发现有证据的问题 | - |';
const metricRows = (metrics) => metrics.length ? metrics.map((metric) => `| ${cell(metric.name)} | ${cell(metric.value)} | ${cell(metric.evidence)} |`).join('\n') : '| 无 | - | GDD 未提供可量化数据 |';

export function renderWorkflowDocuments(input, createdAt = new Date().toISOString()) {
  const names = { progress: `${input.evaluationId}-Progression.md`, problem: `${input.evaluationId}-问题记录.md`, result: `${input.evaluationId}-评价结果.md` };
  const rows = issueRows(input.issues);
  const progress = `# ${input.gameTitle} GDD EDD Progression

- 执行标识：${input.evaluationId}
- 执行时间：${createdAt}
- 目标：生成关联评价文档并创建玩家评分链接
- GDD：${input.gddReference}
- 评价模板：../result/评价模板-v5.md

## 输入材料

- AI 核心玩法：${input.aiCoreScore}/50
- AI 玩家体验：${input.aiExperienceScore}/50
- 运行证据：${input.runtimeEvidence || '未提供'}
- AI 问题数：${input.issues.length}
- AI provider：${input.provider}
- 模型：${input.model}
- GDD 修订：${input.sourceRevision ?? '未记录'}

## 执行顺序

1. 校验执行标识、AI 得分、问题扣分合计和目录边界。
2. 生成 ${names.progress}。
3. 生成 ../problem/${names.problem}。
4. 生成 ../result/${names.result}。
5. 创建绑定结果文档的匿名玩家评分会话，玩家链接由管理接口返回。

## 工具调用

| 工具 | 目的 | 状态 |
|---|---|---|
| 本地 GDD EDD 编排器 | 创建三份关联文档 | 已完成 |
| 玩家评分服务 | 创建匿名评分会话 | 管理接口返回后完成 |

## 疑惑点

- 详见 ../problem/${names.problem}。

## 最终结果

- Progression：${names.progress}
- Problem：../problem/${names.problem}
- Result：../result/${names.result}
- 下一步：分发管理接口返回的玩家评分链接。
`;
  const problemRows = input.issues.length ? input.issues.map((issue, index) => `## P-${String(index + 1).padStart(2, '0')} ${issue.description}

- 发现阶段：AI 评价
- 评价维度：${label(issue.dimension)}
- 证据：${issue.evidence}
- 影响：扣 ${issue.deduction} 分
- 当前状态：待人工判断
- 最小修改建议：${issue.suggestion}
`).join('\n') : '## 当前问题\n\n无。\n';
  const evidenceGap = input.runtimeEvidence ? '' : `
## E-01 缺少运行证据

- 发现阶段：工作流编排
- 评价维度：玩家体验
- 事实：未提供游戏构建或运行证据。
- 当前状态：证据不足
- 所需决定：补充实际试玩证据。
`;
  const problem = `# ${input.gameTitle} 问题记录

- 执行标识：${input.evaluationId}
- GDD：${input.gddReference}
- Progression：../progress/${names.progress}
- Result：../result/${names.result}

${problemRows}${evidenceGap}`;
  const result = `# ${input.gameTitle} GDD EDD 评价结果

- 评价标识：${input.evaluationId}
- 模板版本：[评价模板-v5.md](./评价模板-v5.md)
- GDD：${input.gddReference}
- Progression：../progress/${names.progress}
- 问题记录：../problem/${names.problem}
- AI 核心玩法：${input.aiCoreScore}/50
- AI 玩家体验：${input.aiExperienceScore}/50
- 玩家有效样本：0
- 最终总分：暂无玩家评分
- 结论：暂无玩家评分

## 指标数据

### 核心玩法

| 指标 | 数据 | 证据位置 |
|---|---:|---|
${metricRows(input.metrics.core)}

### 玩家体验

| 指标 | 数据 | 证据位置 |
|---|---:|---|
${metricRows(input.metrics.experience)}

## AI 全部问题与扣分

| 编号 | 维度 | 扣分 | 证据位置 | 问题与影响 | 最小修改建议 |
|---|---|---:|---|---|---|
${rows}

## AI 扣分核对

- 核心玩法：50 - ${50 - input.aiCoreScore} = ${input.aiCoreScore}
- 玩家体验：50 - ${50 - input.aiExperienceScore} = ${input.aiExperienceScore}
- 重复根因合并：由评价输入确认
- 跨维度重复扣分：无

## AI 评价元信息

\`\`\`yaml
provider: ${input.provider}
model: ${input.model}
gdd_revision: ${input.sourceRevision ?? 'unknown'}
\`\`\`
`;
  return { names, progress, problem, result };
}

export async function createWorkflowDocuments(rawInput, roots, createdAt = new Date().toISOString()) {
  const input = validateWorkflowInput(rawInput);
  const rendered = renderWorkflowDocuments(input, createdAt);
  const paths = { progress: join(roots.progressRoot, rendered.names.progress), problem: join(roots.problemRoot, rendered.names.problem), result: join(roots.resultRoot, rendered.names.result) };
  await Promise.all(Object.values(roots).map((root) => mkdir(root, { recursive: true })));
  for (const path of Object.values(paths)) {
    try { await access(path); fail(`工作流文件已存在：${path}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const contents = { progress: rendered.progress, problem: rendered.problem, result: rendered.result };
  const tempPaths = {};
  const created = [];
  try {
    for (const key of Object.keys(paths)) {
      tempPaths[key] = `${paths[key]}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
      await writeFile(tempPaths[key], contents[key], { encoding: 'utf8', flag: 'wx' });
    }
    for (const key of Object.keys(paths)) { await rename(tempPaths[key], paths[key]); created.push(paths[key]); }
  } catch (error) {
    await Promise.allSettled([...Object.values(tempPaths), ...created].map((path) => unlink(path)));
    throw error;
  }
  return { input, names: rendered.names, paths };
}

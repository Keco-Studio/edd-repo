import { DIMENSIONS } from './contracts.mjs';

const decimal = (value) => Number(value).toFixed(1);
const md = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const html = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function redact(value) {
  return String(value ?? '')
    .replace(/\bauthorization\s*[:=]\s*(?:Bearer\s+)?[^\s,;]+/gi, 'authorization=已脱敏')
    .replace(/\b(token|password|secret|cookie|api[-_]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=已脱敏')
    .replace(/([?&](?:token|key|signature|sig|auth)=)[^&\s]+/gi, '$1已脱敏');
}

function evidencePath(item, fallback) {
  if (!item?.path) return fallback;
  const index = item.path.lastIndexOf('/evidence/');
  return index >= 0 ? item.path.slice(index + 1) : item.path;
}

function hashRows(assets = {}) {
  return ['gdd', 'rubric', 'prompt', 'schema', 'isolation'].map((key) => (
    `| ${key} | ${md(assets.paths?.[key] || '未加载')} | ${assets.hashes?.[key] || '未获得'} |`
  )).join('\n');
}

function eventRows(events = []) {
  if (!events.length) return '| - | Runner | 尚无可观测事件 |';
  return events.map((event, index) => (
    `| ${index + 1} | ${md(event.name || event.type || 'event')} | ${md(redact(event.detail || ''))} |`
  )).join('\n');
}

export function renderProgress(input) {
  const execution = input.execution || {};
  const messages = input.messages || [];
  const messageBlocks = messages.length
    ? messages.map((message, index) => `<details>\n<summary>消息 ${index + 1}：${html(message.role)}</summary>\n\n<pre>${html(redact(message.content))}</pre>\n</details>`).join('\n\n')
    : 'Cloud 消息尚未生成。';
  const isolation = input.isolation || {};
  const evidence = input.evidence || {};
  return `# GDD EDD Progress

- 测评 ID：${input.evaluationId}
- 状态：${input.status}
- Eval Case：${input.evalCase?.id || '未加载'}
- 评价对象：${input.evalCase?.title || '未加载'}
- Provider：${execution.provider || input.provider || '未调用'}
- 请求模型：${execution.requestedModel || input.model || '未指定'}
- 可观测模型：${execution.observedModel || '未获得'}
- 开始时间：${execution.startedAt || input.startedAt || '未获得'}
- 结束时间：${execution.finishedAt || '未获得'}
- 耗时：${execution.durationMs ?? '未获得'} ms

## 隔离校验

- Session：${isolation.sessionId || '未通过校验'}
- 全新 Session：${isolation.freshSession === true ? '是' : '未确认'}
- 上下文来源：${isolation.contextSources?.length ? isolation.contextSources.join('；') : '空'}
- 启用插件：${isolation.enabledPlugins?.join('；') || '未确认'}
- 清单时间：${isolation.createdAt || '未获得'}

## 评分参数

- 固定维度：体验价值 30 分、玩法与系统 40 分、内容与呈现 30 分
- 合并权重：AI 40%，人工 60%
- 计算公式：合并维度分 = AI 维度分 * 0.40 + 人工维度分 * 0.60
- 最终总分：三个合并维度分之和

## 固定输入

| 输入 | 路径 | SHA-256 |
| --- | --- | --- |
${hashRows(input.assets)}

## 完整评价依据

<details>
<summary>查看固定 Rubric</summary>

<pre>${html(input.assets?.rubric || 'Rubric 尚未加载')}</pre>
</details>

## 实际 Cloud 输入

${messageBlocks}

## Cloud 参数

<pre>${html(JSON.stringify(execution.generationParameters || { reasoningEffort: 'medium' }, null, 2))}</pre>

## Evidence

| 类型 | 路径 | SHA-256 |
| --- | --- | --- |
| Request | ${md(evidencePath(evidence.request, 'evidence/request.json'))} | ${evidence.request?.sha256 || '未生成'} |
| Response | ${md(evidencePath(evidence.response, 'evidence/response.json'))} | ${evidence.response?.sha256 || '未生成'} |

## 可观测执行事件

| # | 事件 | 摘要 |
| --- | --- | --- |
${eventRows(execution.events)}
${input.error ? `\n## 失败\n\n- 阶段：${input.failedStage || '未知'}\n- 原因：${md(redact(input.error.message || input.error))}\n` : ''}`;
}

function renderDimension(evaluation, dimension) {
  const value = evaluation.dimensions[dimension.key];
  const observations = value.observations.map((item) => `- ${item.statement}（证据：${item.evidence}）`).join('\n');
  const gaps = value.evidenceGaps.length ? value.evidenceGaps.map((item) => `- ${item}`).join('\n') : '- 无';
  return `### ${dimension.label}：${decimal(value.score)}/${dimension.maximum}

${observations}

**评分理由：** ${value.rationale}

**证据缺口：**

${gaps}`;
}

function summaryText(evaluation) {
  const normalized = DIMENSIONS.map((dimension) => ({
    dimension,
    ratio: evaluation.dimensions[dimension.key].score / dimension.maximum,
    gaps: evaluation.dimensions[dimension.key].evidenceGaps.length,
  }));
  const strongestRatio = Math.max(...normalized.map((item) => item.ratio));
  const weakestRatio = Math.min(...normalized.map((item) => item.ratio));
  const strongest = normalized.filter((item) => item.ratio === strongestRatio).map((item) => item.dimension.label);
  const weakest = normalized.filter((item) => item.ratio === weakestRatio).map((item) => item.dimension.label);
  const gapCount = normalized.reduce((sum, item) => sum + item.gaps, 0);
  const strongestLabel = strongest.length > 1 ? `${strongest.join('和')}并列` : strongest[0];
  const weakestLabel = weakest.length > 1 ? `${weakest.join('和')}并列` : weakest[0];
  return `归一化表现最强的维度是${strongestLabel}，相对最弱的维度是${weakestLabel}；共 ${gapCount} 项证据缺口。`;
}

function humanSection(evaluation) {
  return `## 人工评分

直接修改反引号中的内容，然后运行 \`npm run finalize -- --run <测评 ID>\`。

- 评分人：\`__\`
- 评分时间：\`__\`
- 体验价值（0-30）：\`__\`
- 玩法与系统（0-40）：\`__\`
- 内容与呈现（0-30）：\`__\`
- 评分理由：\`__\`

<!-- EDD_FINAL_START -->
## 最终评分

人工评分尚未完成，当前没有最终分。暂定 AI 总分为 ${decimal(evaluation.aiTotalScore)}/100。
<!-- EDD_FINAL_END -->`;
}

export function renderResult(input) {
  if (!input.evaluation) {
    return `# GDD EDD 评价结果

- 测评 ID：${input.evaluationId}
- 状态：测评未完成
- 评价对象：${input.evalCase?.title || '未加载'}

## 简要说明

本次测评在“${input.failedStage || '未知阶段'}”停止，未生成有效 AI 评价，也没有最终分。具体恢复信息见同目录 \`problem.md\`。
`;
  }
  const evaluation = input.evaluation;
  const scoreRows = DIMENSIONS.map((dimension) => (
    `| ${dimension.label} | ${dimension.maximum} | ${decimal(evaluation.dimensions[dimension.key].score)} | 待填写 | 待计算 |`
  )).join('\n');
  const dimensions = DIMENSIONS.map((dimension) => renderDimension(evaluation, dimension)).join('\n\n');
  const findings = evaluation.additionalFindings?.length
    ? evaluation.additionalFindings.map((item) => `- ${item.description}（证据：${item.evidence}）`).join('\n')
    : '- 无';
  return `# GDD EDD 评价结果

- 测评 ID：${input.evaluationId}
- 状态：等待人工评分
- 评价对象：${input.evalCase.title}（revision ${input.evalCase.revision}）
- 暂定 AI 总分：${decimal(evaluation.aiTotalScore)}/100

## 简要总结

${summaryText(evaluation)} AI 已按固定三个维度完成证据评价。当前分数仅为暂定 AI 评价；人工完成同维度评分后，才按 AI 40%、人工 60% 生成最终分。

## 评分方式

| 维度 | 满分 | AI | 人工 | 合并 |
| --- | ---: | ---: | ---: | ---: |
${scoreRows}
| 总分 | 100 | ${decimal(evaluation.aiTotalScore)} | 自动计算 | 待计算 |

合并维度分 = AI 维度分 * 0.40 + 人工维度分 * 0.60；最终总分为三个合并维度分之和。

## AI 评价

${dimensions}

## 不计分的补充发现

${findings}

${humanSection(evaluation)}
`;
}

export function renderProblem(input) {
  return `# GDD EDD Problem

- 测评 ID：${input.evaluationId}
- 状态：阻断
- 失败阶段：${input.failedStage || '未知'}
- 错误摘要：${md(redact(input.error?.message || input.error || '未知错误'))}
- Result：result.md
- Progress：progress.md

## 恢复动作

修复上述操作性问题后重新运行：

\`npm run eval -- --case ${input.evalCase?.id || 'case-id'} --provider ${input.provider || 'codex'}${input.model ? ` --model ${input.model}` : ''}\`
`;
}

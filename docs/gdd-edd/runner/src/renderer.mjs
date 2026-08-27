import { DIMENSIONS } from './contracts.mjs';
import { readFileSync } from 'node:fs';

const TEMPLATES = Object.freeze({
  result: readFileSync(new URL('../../runs/_template/result.md', import.meta.url), 'utf8'),
  progress: readFileSync(new URL('../../runs/_template/progress.md', import.meta.url), 'utf8'),
  problem: readFileSync(new URL('../../runs/_template/problem.md', import.meta.url), 'utf8'),
});

function fillTemplate(name, values) {
  return TEMPLATES[name]
    .replace(/\{\{([a-z]+)\}\}/g, (_match, key) => values[key] ?? '')
    .replace(/\n?<!-- TEMPLATE_GUIDE_START -->[\s\S]*?<!-- TEMPLATE_GUIDE_END -->/g, '')
    .trimEnd() + '\n';
}

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
  const labels = { gdd: 'GDD', prompt: 'Prompt', rubric: 'Rubric', schema: 'Schema', isolation: 'Isolation' };
  return ['gdd', 'prompt', 'rubric', 'schema', 'isolation'].map((key) => (
    `| ${labels[key]} | ${md(assets.paths?.[key] || '未加载')} | ${assets.hashes?.[key] || '未获得'} |`
  )).join('\n');
}

function eventRows(events = []) {
  if (!events.length) return '| - | Runner | 尚无可观测事件 |';
  return events.map((event, index) => (
    `| ${index + 1} | ${md(event.name || event.type || 'event')} | ${md(redact(event.detail || ''))} |`
  )).join('\n');
}

function providerFactRows(events = []) {
  return events.map((event, index) => (
    `| ${index + 3} | Provider | ${md(event.name || event.type || 'event')} | observed | ${md(redact(event.detail || '-'))} |`
  )).join('\n');
}

export function renderProgress(input) {
  const execution = input.execution || {};
  const isolation = input.isolation || {};
  const evidence = input.evidence || {};
  const metadata = `- 测评 ID：${input.evaluationId}
- 状态：${input.status}
- Eval Case：${input.evalCase?.id || '未加载'}
- 评价对象：${input.evalCase?.title || '未加载'}
- 目标：根据固定 GDD、Prompt 和 Rubric 生成可人工复核的评价文档
- Provider：${execution.provider || input.provider || '未调用'}
- 请求模型：${execution.requestedModel || input.model || '未指定'}
- 可观测模型：${execution.observedModel || '未获得'}
- 开始时间：${execution.startedAt || input.startedAt || '未获得'}
- 结束时间：${execution.finishedAt || '未获得'}
- 耗时：${execution.durationMs ?? '未获得'} ms
- 退出码：${execution.exitCode ?? '未获得'}
- Schema 校验：${input.evaluation ? '通过' : input.error ? '未通过' : '等待中'}`;

  const providerRows = providerFactRows(execution.events);
  const aiState = input.evaluation ? 'completed' : input.error ? 'failed' : 'running';
  const aiSummary = input.evaluation
    ? `${execution.provider || input.provider || 'Provider'} 返回结构化结果，AI 总分 ${decimal(input.evaluation.aiTotalScore)}/100`
    : input.error ? md(redact(input.error.message || input.error)) : '等待 Provider 返回';
  const content = `## 评分参数

- 固定维度：体验价值 30 分、玩法与系统 40 分、内容与呈现 30 分
- 合并权重：AI 40%，人工 60%
- 计算公式：合并维度分 = AI 维度分 * 0.40 + 人工维度分 * 0.60
- 最终总分：三个合并维度分之和
- 推理强度：${execution.generationParameters?.reasoningEffort || 'low'}
- 隔离清单：${isolation.sessionId || '未获得'}
- 清单插件：${isolation.enabledPlugins?.join('；') || '未记录'}

## 固定输入

| 输入 | 路径 | SHA-256 |
| --- | --- | --- |
${hashRows(input.assets)}

## 执行事实

| # | 组件 | 动作 | 状态 | 结果摘要 |
| ---: | --- | --- | --- | --- |
| 1 | Node | 加载 Eval Case 与固定输入 | completed | ${md(input.evalCase?.id || '未加载')}；固定资产已读取并计算哈希 |
| 2 | AI | AI 评价 | ${aiState} | ${aiSummary} |
${providerRows}
| ${3 + (execution.events?.length || 0)} | Node | Schema 校验 | ${input.evaluation ? 'completed' : 'pending'} | ${input.evaluation ? '来源、三个维度、证据与问题结构通过校验' : '等待有效结构化结果'} |
| ${4 + (execution.events?.length || 0)} | Node | 写入评价文档 | ${input.error ? 'failed' : input.evaluation ? 'completed' : 'running'} | Result、Progress 与 Evidence 按固定结构写入 |

## 输入提示词

### User Prompt

下面展示本次使用的 User Prompt 模板。运行时已注入本次 GDD 和固定 Rubric；Progress 仅保留占位符版本：

<pre>${html(redact(input.assets?.promptTemplate || 'Prompt 尚未加载'))}</pre>

完整实际请求保存在 <code>evidence/request.json</code>。

## 审计证据与产物

| 类型 | 路径 | SHA-256 |
| --- | --- | --- |
| Request | ${md(evidencePath(evidence.request, 'evidence/request.json'))} | ${evidence.request?.sha256 || '未生成'} |
| Response | ${md(evidencePath(evidence.response, 'evidence/response.json'))} | ${evidence.response?.sha256 || '未生成'} |

- Progress：progress.md
- Problem：${input.error ? 'problem.md' : '未生成'}
- Result：result.md
- 下一人工动作：查看 Result，填写人工评分并运行 finalize
${input.error ? `\n## 失败\n\n- 阶段：${input.failedStage || '未知'}\n- 原因：${md(redact(input.error.message || input.error))}\n` : ''}`;
  return fillTemplate('progress', { metadata, content });
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
    const running = input.status === 'running';
    const metadata = `- 测评 ID：${input.evaluationId}\n- 状态：${running ? 'AI 评分中' : '测评未完成'}\n- 评价对象：${input.evalCase?.title || '未加载'}`;
    const content = running
      ? '## 简要说明\n\nAI 正在读取当前 GDD 并按固定三个维度评分。完成后本文件会自动替换为可读结果。'
      : `## 简要说明\n\n本次测评在“${input.failedStage || '未知阶段'}”停止，未生成有效 AI 评价，也没有最终分。具体恢复信息见同目录 \`problem.md\`。`;
    return fillTemplate('result', { metadata, content });
  }
  const evaluation = input.evaluation;
  const scoreRows = DIMENSIONS.map((dimension) => (
    `| ${dimension.label} | ${dimension.maximum} | ${decimal(evaluation.dimensions[dimension.key].score)} | 待填写 | 待计算 |`
  )).join('\n');
  const dimensions = DIMENSIONS.map((dimension) => renderDimension(evaluation, dimension)).join('\n\n');
  const findings = evaluation.additionalFindings?.length
    ? evaluation.additionalFindings.map((item) => `- ${item.description}（证据：${item.evidence}）`).join('\n')
    : '- 无';
  const metadata = `- 测评 ID：${input.evaluationId}
- 模板版本：v1
- 状态：等待人工评分
- 评价对象：${input.evalCase.title}（revision ${input.evalCase.revision}）
- 暂定 AI 总分：${decimal(evaluation.aiTotalScore)}/100
- Provider：${input.execution?.provider || input.provider || '未获得'}
- 请求模型：${input.execution?.requestedModel || input.model || '未获得'}
- 可观测模型：${input.execution?.observedModel || '未获得'}
- 固定标尺：${input.assets?.paths?.rubric || '未获得'}
- 过程记录：progress.md
- 问题记录：未生成`;

  const content = `## 简要总结

${evaluation.summary}

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

${humanSection(evaluation)}`;
  return fillTemplate('result', { metadata, content });
}

export function renderProblem(input) {
  const metadata = `- 测评 ID：${input.evaluationId}
- 状态：阻断
- 失败阶段：${input.failedStage || '未知'}
- 错误摘要：${md(redact(input.error?.message || input.error || '未知错误'))}
- Result：result.md
- Progress：progress.md`;
  const recovery = `修复上述操作性问题后重新运行：\n\n\`npm run eval -- --case ${input.evalCase?.id || 'case-id'} --provider ${input.provider || 'codex'}${input.model ? ` --model ${input.model}` : ''}\``;
  return fillTemplate('problem', { metadata, recovery });
}

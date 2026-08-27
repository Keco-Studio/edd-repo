import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const md = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function redactAuditText(value) {
  return String(value ?? '')
    .replace(/\bauthorization\s*[:=]\s*(?:Bearer\s+)?[^\s,;]+/gi, 'authorization=已脱敏')
    .replace(/\b(token|password|secret|cookie|authorization|api[-_]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=已脱敏')
    .replace(/([?&](?:token|key|signature|sig|auth)=)[^&\s]+/gi, '$1已脱敏');
}

export async function writeTextAtomic(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
}

export async function writeAiEvidence(progressRoot, evaluationId, rawOutput) {
  const relativePath = `evidence/${evaluationId}-ai-output.json`;
  const absolutePath = join(progressRoot, relativePath);
  const content = `${JSON.stringify(rawOutput, null, 2)}\n`;
  await writeTextAtomic(absolutePath, content);
  const readback = await readFile(absolutePath, 'utf8');
  JSON.parse(readback);
  if (readback !== content) throw new Error('AI 结构化输出回读不一致');
  return { path: relativePath, absolutePath, sha256: sha256(readback) };
}

export async function verifyEvaluationDocument(path, evaluationId) {
  const content = await readFile(path, 'utf8');
  if (!content.includes(evaluationId)) throw new Error(`文档回读缺少评价标识：${path}`);
  return { path, sha256: sha256(content) };
}

export function preserveProgressSyncBlocks(rendered, existing = '') {
  const blocks = existing.match(/<!-- EDD_PLAYER_PROGRESS_START:[^ ]+ -->[\s\S]*?<!-- EDD_PLAYER_PROGRESS_END:[^ ]+ -->/g) || [];
  return blocks.length ? `${rendered.trimEnd()}\n\n${blocks.join('\n\n')}\n` : rendered;
}

function inputRows(evalCase, assets) {
  return [
    ['GDD', evalCase.gddPath, assets.hashes?.gdd],
    ['Prompt', evalCase.promptPath, assets.hashes?.prompt],
    ['Rubric', evalCase.rubricPath, assets.hashes?.rubric],
    ['Schema', 'player-rating-web/src/ai-evaluation.schema.json', assets.hashes?.schema],
    ['Result Template', evalCase.resultTemplatePath, assets.hashes?.resultTemplate],
  ].map(([name, path, hash]) => `| ${name} | ${md(path)} | ${hash || '未获得'} |`).join('\n');
}

function eventRows(events) {
  return events.length
    ? events.map((event, index) => `| ${index + 1} | ${md(event.component)} | ${md(event.action)} | ${md(event.status)} | ${md(redactAuditText(event.detail || ''))} |`).join('\n')
    : '| - | Node | 尚无执行事实 | failed | 未开始 |';
}

export function renderFailureProgression(input) {
  const finishedAt = input.finishedAt || new Date().toISOString();
  const retryCommand = input.retryCommand || `npm run eval -- --case ${input.evalCase.id} --provider ${input.provider}`;
  return `# GDD EDD 执行记录

- 评价标识：${input.evaluationId}
- Eval Case：${input.evalCase.id}
- 目标：根据固定 GDD 和标尺生成可人工复核的评价文档
- Provider：${input.provider}
- 请求模型：${input.requestedModel || '本地默认配置'}
- 可观测模型：${input.observedModel || '执行失败，未获得'}
- 开始时间：${input.startedAt}
- 结束时间：${finishedAt}
- 状态：failed
- 退出码：${input.exitCode ?? '未获得'}
- Schema 校验：未完成

## 固定输入

| 资产 | 路径 | SHA-256 |
| --- | --- | --- |
${inputRows(input.evalCase, input.assets)}

## 执行事实

| # | 组件 | 动作 | 状态 | 结果摘要 |
| --- | --- | --- | --- | --- |
${eventRows(input.events || [])}

## 应用 Prompt

<details>
<summary>查看已应用 Prompt</summary>

\`\`\`text
${redactAuditText(input.prompt || 'Prompt 尚未生成')}
\`\`\`

</details>

## 异常与恢复

- 失败步骤：${input.failedStep || 'AI 评价'}
- 错误摘要：${redactAuditText(input.error?.message || input.error || '未知错误')}
- 已完成产物：${input.completedOutputs?.length ? input.completedOutputs.join('；') : '无'}
- 未完成事项：${input.incompleteOutputs?.length ? input.incompleteOutputs.join('；') : 'Problem、Result、人工评分会话'}
- 重试命令：${retryCommand}
`;
}

export async function writeFailureProgression(path, input) {
  const content = renderFailureProgression(input);
  await writeTextAtomic(path, content);
  return content;
}

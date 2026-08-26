import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redactAuditText } from './progress-audit.mjs';

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const DEFAULT_SCHEMA_PATH = fileURLToPath(new URL('./ai-evaluation.schema.json', import.meta.url));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const md = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export async function loadEvaluationAssets(evalCase, options = {}) {
  const repositoryRoot = options.repositoryRoot || DEFAULT_REPOSITORY_ROOT;
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  const paths = {
    gdd: resolve(repositoryRoot, evalCase.gddPath),
    prompt: resolve(repositoryRoot, evalCase.promptPath),
    rubric: resolve(repositoryRoot, evalCase.rubricPath),
    resultTemplate: resolve(repositoryRoot, evalCase.resultTemplatePath),
    schema: schemaPath,
  };
  const [gdd, promptTemplate, rubric, resultTemplate, schema] = await Promise.all(Object.values(paths).map((path) => readFile(path, 'utf8')));
  return {
    promptTemplate,
    resultTemplate,
    hashes: { gdd: sha256(gdd), prompt: sha256(promptTemplate), rubric: sha256(rubric), resultTemplate: sha256(resultTemplate), schema: sha256(schema) },
  };
}

function observations(items) {
  return items.map((item) => `- ${item.statement}（证据：${item.evidence}）`).join('\n');
}

function gaps(items) { return items.length ? items.join('；') : '无'; }

function applyTemplate(template, values) {
  const rendered = String(template).replace(/\{\{([A-Za-z0-9]+)\}\}/g, (_match, key) => {
    if (!(key in values)) throw new Error(`Result 模板包含未知占位符：${key}`);
    return String(values[key]);
  });
  if (/\{\{[^}]+\}\}/.test(rendered)) throw new Error('Result 模板仍有未替换占位符');
  return rendered.trimEnd() + '\n';
}

function renderProgression({ evalCase, execution, evaluationId, documents, assets, audit = {} }) {
  const hashRows = [
    ['GDD', evalCase.gddPath, assets.hashes.gdd],
    ['Prompt', evalCase.promptPath, assets.hashes.prompt],
    ['Rubric', evalCase.rubricPath, assets.hashes.rubric],
    ['Schema', 'player-rating-web/src/ai-evaluation.schema.json', assets.hashes.schema],
    ['Result Template', evalCase.resultTemplatePath, assets.hashes.resultTemplate],
  ].map(([name, path, hash]) => `| ${name} | ${md(path)} | ${hash || '未记录'} |`).join('\n');
  const eventRows = audit.events?.length
    ? audit.events.map((event, index) => `| ${index + 1} | ${md(event.component)} | ${md(event.action)} | ${md(event.status)} | ${md(redactAuditText(event.detail || ''))} |`).join('\n')
    : '| - | Node | 尚无执行事实 | pending | 等待执行 |';
  const evidence = audit.evidence || {};
  return `# GDD EDD 执行记录

- 评价标识：${evaluationId}
- Eval Case：${evalCase.id}
- 目标：${audit.goal || '根据固定 GDD 和标尺生成可人工复核的评价文档'}
- Provider：${execution.provider}
- 请求模型：${execution.requestedModel}
- 可观测模型：${execution.observedModel || 'CLI 事件未提供'}
- 开始时间：${execution.startedAt}
- 结束时间：${execution.finishedAt}
- 耗时：${execution.durationMs} ms
- 状态：${execution.status}
- 退出码：${execution.exitCode}
- Schema 校验：通过

## 固定输入

| 资产 | 路径 | SHA-256 |
| --- | --- | --- |
${hashRows}

## 执行事实

按 Node 与 Provider 的可观测顺序记录。

| # | 组件 | 动作 | 状态 | 结果摘要 |
| --- | --- | --- | --- | --- |
${eventRows}

## 应用 Prompt

<details>
<summary>查看完整 Prompt</summary>

\`\`\`text
${redactAuditText(execution.prompt)}
\`\`\`

</details>

## 审计证据与产物

- AI 结构化输出：${evidence.path || '尚未写入'}
- AI 输出 SHA-256：${evidence.sha256 || '尚未生成'}
- Progression：${documents.progress}
- Problem：../problem/${documents.problem}
- Result：../result/${documents.result}
- 下一人工动作：${audit.nextAction || '查看 Result 并分发人工评分链接'}
`;
}

function renderProblem({ evaluation, evaluationId, documents }) {
  const labels = { experienceValue: '体验价值', gameplaySystems: '玩法与系统', contentPresentation: '内容与呈现' };
  const rows = evaluation.issues.length
    ? evaluation.issues.map((issue, index) => `| ${index + 1} | ${labels[issue.dimension]} | ${md(issue.evidence)} | ${md(issue.description)} | ${md(issue.suggestion)} |`).join('\n')
    : '| - | - | - | 无 | - |';
  return `# GDD EDD 问题记录

- 评价标识：${evaluationId}
- 问题数量：${evaluation.issues.length}
- 评价结果：../result/${documents.result}
- 执行记录：../progress/${documents.progress}

| # | 维度 | GDD 证据 | 问题与影响 | 最小修改建议 |
| --- | --- | --- | --- | --- |
${rows}
`;
}

export function renderEvaluationDocuments(input) {
  const { evalCase, evaluation, execution, evaluationId, documents, assets } = input;
  const result = applyTemplate(assets.resultTemplate, {
    evaluationId,
    aiExperienceValueScore: evaluation.aiExperienceValueScore,
    aiGameplaySystemsScore: evaluation.aiGameplaySystemsScore,
    aiContentPresentationScore: evaluation.aiContentPresentationScore,
    aiTotalScore: evaluation.aiTotalScore,
    title: evalCase.title,
    revision: evalCase.revision,
    provider: execution.provider,
    requestedModel: execution.requestedModel,
    observedModel: execution.observedModel || 'CLI 事件未提供',
    rubricPath: evalCase.rubricPath,
    progressDocument: documents.progress,
    problemDocument: documents.problem,
    experienceValueObservations: observations(evaluation.dimensions.experienceValue.observations),
    experienceValueRationale: evaluation.dimensions.experienceValue.rationale,
    experienceValueEvidenceGaps: gaps(evaluation.dimensions.experienceValue.evidenceGaps),
    gameplaySystemsObservations: observations(evaluation.dimensions.gameplaySystems.observations),
    gameplaySystemsRationale: evaluation.dimensions.gameplaySystems.rationale,
    gameplaySystemsEvidenceGaps: gaps(evaluation.dimensions.gameplaySystems.evidenceGaps),
    contentPresentationObservations: observations(evaluation.dimensions.contentPresentation.observations),
    contentPresentationRationale: evaluation.dimensions.contentPresentation.rationale,
    contentPresentationEvidenceGaps: gaps(evaluation.dimensions.contentPresentation.evidenceGaps),
    issueCount: evaluation.issues.length,
  });
  return {
    progress: renderProgression(input),
    problem: renderProblem(input),
    result,
  };
}

async function atomicWrite(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
}

export async function writeEvaluationDocuments(paths, rendered) {
  await Promise.all(Object.keys(paths).map((key) => atomicWrite(paths[key], rendered[key])));
}

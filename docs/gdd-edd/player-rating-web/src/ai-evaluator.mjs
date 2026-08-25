import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
export const DEFAULT_EVALUATION_CWD = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\/$/, '');
const DEFAULT_SCHEMA_PATH = fileURLToPath(new URL('./ai-evaluation.schema.json', import.meta.url));

export const PAWS_SOURCE = Object.freeze({
  projectId: '5165dbe5-8570-46df-bb40-3224f8bef93e',
  documentId: '8d45eaa5-bb69-4d74-9d44-c9a93492b13f',
  minimumRevision: 97,
  title: 'Paws & Patience',
  localPath: 'docs/gdd-edd/gdd/paws-patience-gdd-r97.md',
});

const fail = (message) => { throw new Error(message); };
const round = (value) => Math.round(Number(value) * 10) / 10;
const text = (value, label, max) => {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result || result.length > max) fail(`${label}必须为 1-${max} 字`);
  return result;
};

export function validateAiEvaluation(raw = {}) {
  const source = raw.source || {};
  if (source.projectId !== PAWS_SOURCE.projectId) fail('AI 返回的 Keco 项目不匹配');
  if (source.documentId !== PAWS_SOURCE.documentId) fail('AI 返回的 GDD 文档不匹配');
  if (!Number.isInteger(source.revision) || source.revision < PAWS_SOURCE.minimumRevision) fail('AI 返回的 GDD 修订号无效');
  if (source.title !== PAWS_SOURCE.title) fail('AI 返回的 GDD 标题不匹配');

  const score = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 50) fail(`${label}必须为 0-50`);
    return round(number);
  };
  const aiCoreScore = score(raw.aiCoreScore, 'AI 核心玩法得分');
  const aiExperienceScore = score(raw.aiExperienceScore, 'AI 玩家体验得分');

  return {
    source: {
      projectId: source.projectId,
      documentId: source.documentId,
      revision: source.revision,
      title: text(source.title, 'GDD 标题', 100),
    },
    model: text(raw.model, '模型名称', 100),
    aiCoreScore,
    aiExperienceScore,
    metrics: raw.metrics,
    issues: raw.issues,
  };
}

export function buildEvaluationPrompt({ evaluationId, documents }) {
  return `你正在执行 Paws & Patience 的正式 GDD EDD AI 评价。

输入文件：
- GDD：${PAWS_SOURCE.localPath}
- 锁定模板：docs/gdd-edd/result/评价模板-v5.md
- Progression 规范：docs/gdd-edd/progress/README.md
- Problem 规范：docs/gdd-edd/problem/README.md
- Result 规范：docs/gdd-edd/result/README.md

你必须亲自读取以上五个文件，并创建且只创建以下三个文件：
- Progression：${documents.progress}
- Problem：${documents.problem}
- Result：${documents.result}

三个文件必须使用执行标识 ${evaluationId} 互相引用。Result 必须严格按 v5 模板字段顺序完整填写指标、全部问题、扣分核对、provider、model、GDD revision 和“待人工审核”状态。Problem 必须按 Problem 规范记录稳定编号、证据、影响、状态和恢复位置。Progression 必须按 Progression 规范完整记录执行身份、输入材料、人工指令、完整执行顺序、工具调用、决策与假设、疑惑点、最终执行结果、实际输出路径以及回读验证，不得只写步骤摘要和分数。不得修改任何其他文件。

评价要求：
- 只评价“核心玩法”和“玩家体验”，每维从 50 分起扣。
- 每个扣分问题必须引用 GDD 章节或可定位文字，并给出最小修改建议。
- 同一根因不得重复扣分，跨维度不得重复扣分。
- GDD 不是运行证据，不得据此断言游戏已经可玩或视觉效果已经达标。
- 返回当前实际使用的模型名称、两组指标数据、全部问题和精确得分。
- 三个文件写入成功后，最终响应只能是符合给定 JSON Schema 的对象。`;
}

export function buildProviderInvocation(provider, { cwd, schemaPath, outputPath, schema, prompt }) {
  if (provider === 'codex') {
    return {
      command: 'codex',
      args: ['exec', '--ephemeral', '--sandbox', 'workspace-write', '-c', 'model_reasoning_effort="medium"', '--output-schema', schemaPath, '--output-last-message', outputPath, '--color', 'never', '-C', cwd, prompt],
    };
  }
  if (provider === 'claude') {
    const { $schema: _draft, ...claudeSchema } = schema;
    return {
      command: 'claude',
      args: ['-p', '--safe-mode', '--tools', 'Read,Write', '--model', 'sonnet', '--effort', 'medium', '--permission-mode', 'acceptEdits', '--output-format', 'json', '--json-schema', JSON.stringify(claudeSchema), prompt],
    };
  }
  fail(`不支持的 provider：${provider}`);
}

function parseProviderOutput(stdout) {
  let parsed;
  try { parsed = JSON.parse(String(stdout).trim()); }
  catch { fail('AI 未返回有效 JSON'); }
  return parsed?.structured_output || parsed;
}

async function defaultRunner(command, args, options) {
  return execFileAsync(command, args, options);
}

export async function runAiEvaluation(options = {}) {
  const provider = options.provider || 'codex';
  const cwd = options.cwd || DEFAULT_EVALUATION_CWD;
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  const schema = options.schema || JSON.parse(await readFile(schemaPath, 'utf8'));
  const prompt = options.prompt || buildEvaluationPrompt({ evaluationId: options.evaluationId, documents: options.documents });
  const tempDir = await mkdtemp(join(tmpdir(), 'edd-ai-'));
  const outputPath = join(tempDir, 'result.json');
  const invocation = buildProviderInvocation(provider, { cwd, schemaPath, outputPath, schema, prompt });
  const runner = options.runner || defaultRunner;
  try {
    const result = await runner(invocation.command, invocation.args, {
      cwd,
      timeout: options.timeoutMs || 600_000,
      maxBuffer: 4 * 1024 * 1024,
      env: process.env,
    });
    let output = result.stdout;
    if (provider === 'codex') {
      try { output = await readFile(outputPath, 'utf8'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    return { ...validateAiEvaluation(parseProviderOutput(output)), provider };
  } catch (error) {
    const detail = String(error.stderr || error.message || '').trim();
    throw new Error(`${provider} 评价失败${detail ? `：${detail}` : ''}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

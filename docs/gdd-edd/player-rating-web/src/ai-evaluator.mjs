import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
export const DEFAULT_EVALUATION_CWD = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\/$/, '');
const DEFAULT_SCHEMA_PATH = fileURLToPath(new URL('./ai-evaluation.schema.json', import.meta.url));
const fail = (message) => { throw new Error(message); };
const round = (value) => Math.round(Number(value) * 10) / 10;

function requiredText(value, label, max = 1000) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result || result.length > max) fail(`${label}必须为 1-${max} 字`);
  return result;
}

function validateDimension(raw = {}, label) {
  const score = Number(raw.score);
  if (!Number.isFinite(score) || score < 0 || score > 50) fail(`${label}得分必须为 0-50`);
  if (!Array.isArray(raw.observations) || raw.observations.length < 1 || raw.observations.length > 20) fail(`${label}必须包含 1-20 条客观观察`);
  const observations = raw.observations.map((item, index) => ({
    statement: requiredText(item?.statement, `${label}客观观察 ${index + 1}`, 500),
    evidence: requiredText(item?.evidence, `${label}证据 ${index + 1}`, 300),
  }));
  if (!Array.isArray(raw.evidenceGaps) || raw.evidenceGaps.length > 20) fail(`${label}证据不足项必须为数组`);
  return {
    score: round(score),
    observations,
    rationale: requiredText(raw.rationale, `${label}评分理由`, 1000),
    evidenceGaps: raw.evidenceGaps.map((item, index) => requiredText(item, `${label}证据不足 ${index + 1}`, 500)),
  };
}

export function validateAiEvaluation(raw = {}, evalCase) {
  if (!evalCase) fail('必须提供 Eval Case');
  const source = raw.source || {};
  if (source.projectId !== evalCase.projectId) fail('AI 返回的 Keco 项目不匹配');
  if (source.documentId !== evalCase.documentId) fail('AI 返回的 GDD 文档不匹配');
  if (!Number.isInteger(source.revision) || source.revision !== evalCase.revision) fail('AI 返回的 GDD 修订号无效');
  if (source.title !== evalCase.title) fail('AI 返回的 GDD 标题不匹配');
  const core = validateDimension(raw.dimensions?.core, '核心玩法');
  const experience = validateDimension(raw.dimensions?.experience, '玩家体验');
  if (!Array.isArray(raw.issues) || raw.issues.length > 100) fail('问题列表无效');
  const issues = raw.issues.map((issue, index) => {
    if (!['core', 'experience'].includes(issue?.dimension)) fail(`问题 ${index + 1} 维度无效`);
    return {
      dimension: issue.dimension,
      evidence: requiredText(issue.evidence, `问题 ${index + 1} 证据`, 300),
      description: requiredText(issue.description, `问题 ${index + 1} 描述`, 500),
      suggestion: requiredText(issue.suggestion, `问题 ${index + 1} 建议`, 500),
    };
  });
  return {
    source: { projectId: source.projectId, documentId: source.documentId, revision: source.revision, title: requiredText(source.title, 'GDD 标题', 100) },
    dimensions: { core, experience },
    issues,
    aiCoreScore: core.score,
    aiExperienceScore: experience.score,
    aiTotalScore: round(core.score + experience.score),
  };
}

export function buildEvaluationPrompt({ evalCase, promptTemplate }) {
  if (!evalCase) fail('必须提供 Eval Case');
  const values = { title: evalCase.title, gddPath: evalCase.gddPath, rubricPath: evalCase.rubricPath, caseId: evalCase.id };
  return String(promptTemplate || '').replace(/\{\{([A-Za-z0-9]+)\}\}/g, (_match, key) => {
    if (!(key in values)) fail(`未知 Prompt 占位符：${key}`);
    return values[key];
  }).trim();
}

export function buildProviderInvocation(provider, { cwd, schemaPath, outputPath, schema, prompt, model }) {
  if (provider === 'codex') {
    const modelArgs = model ? ['--model', model] : [];
    return {
      command: 'codex',
      args: ['exec', '--ephemeral', '--sandbox', 'read-only', '-c', 'model_reasoning_effort="medium"', ...modelArgs, '--json', '--output-schema', schemaPath, '--output-last-message', outputPath, '--color', 'never', '-C', cwd, prompt],
    };
  }
  if (provider === 'claude') {
    const { $schema: _draft, ...claudeSchema } = schema;
    return {
      command: 'claude',
      args: ['-p', '--safe-mode', '--tools', 'Read', '--model', model || 'sonnet', '--effort', 'medium', '--permission-mode', 'dontAsk', '--no-session-persistence', '--verbose', '--output-format', 'stream-json', '--json-schema', JSON.stringify(claudeSchema), prompt],
    };
  }
  fail(`不支持的 provider：${provider}`);
}

function jsonLines(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => {
    try { return JSON.parse(line); }
    catch { return { type: 'unparsed', value: line.slice(0, 500) }; }
  });
}

function findObservedModel(events) {
  for (const event of events) {
    if (typeof event?.model === 'string') return event.model;
    if (typeof event?.message?.model === 'string') return event.message.model;
  }
  return null;
}

function eventDetail(value) {
  if (typeof value === 'string') return value.slice(0, 500);
  return JSON.stringify(value || {}).slice(0, 500);
}

export function normalizeObservableEvents(events = []) {
  const normalized = [];
  for (const event of events) {
    const item = event?.item;
    if (item?.type === 'reasoning' || event?.type === 'thinking' || (event?.type === 'system' && event?.subtype === 'thinking_tokens')) continue;
    if (item?.type === 'command_execution') normalized.push({ type: 'tool', name: 'command_execution', detail: eventDetail(item.command) });
    else if (item?.type === 'file_change') normalized.push({ type: 'tool', name: 'file_change', detail: eventDetail(item.changes) });
    else if (event?.type === 'assistant' && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (block?.type === 'tool_use' && block.name !== 'StructuredOutput') {
          normalized.push({ type: 'tool', name: block.name || 'tool', detail: eventDetail(block.input) });
        }
      }
    } else if (['thread.started', 'turn.started', 'turn.completed', 'system', 'result'].includes(event?.type)) {
      normalized.push({ type: 'status', name: event.type, detail: event.subtype || event.thread_id || '' });
    }
  }
  return normalized;
}

function parseClaudeOutput(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.structured_output) return event.structured_output;
    if (event?.type === 'result' && typeof event.result === 'string') {
      try { return JSON.parse(event.result); } catch { /* continue */ }
    }
  }
  fail('AI 未返回结构化 JSON');
}

async function defaultRunner(command, args, options) { return execFileAsync(command, args, options); }

export async function runAiEvaluation(options = {}) {
  const provider = options.provider || 'codex';
  const cwd = options.cwd || DEFAULT_EVALUATION_CWD;
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  const schema = options.schema || JSON.parse(await readFile(schemaPath, 'utf8'));
  const prompt = options.prompt;
  if (!prompt) fail('必须提供已渲染 Prompt');
  const requestedModel = options.model || (provider === 'claude' ? 'sonnet' : '本地默认配置');
  const tempDir = await mkdtemp(join(tmpdir(), 'edd-ai-'));
  const outputPath = join(tempDir, 'result.json');
  const invocation = buildProviderInvocation(provider, { cwd, schemaPath, outputPath, schema, prompt, model: options.model });
  const runner = options.runner || defaultRunner;
  const started = new Date();
  try {
    const result = await runner(invocation.command, invocation.args, { cwd, timeout: options.timeoutMs || 600_000, maxBuffer: 8 * 1024 * 1024, env: process.env });
    const events = jsonLines(result.stdout);
    let rawOutput;
    if (provider === 'codex') {
      try { rawOutput = JSON.parse(await readFile(outputPath, 'utf8')); }
      catch { fail('Codex 未写入有效结构化 JSON'); }
    } else rawOutput = parseClaudeOutput(events);
    const evaluation = validateAiEvaluation(rawOutput, options.evalCase);
    const finished = new Date();
    return {
      evaluation,
      execution: {
        provider,
        requestedModel,
        observedModel: findObservedModel(events),
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - started.getTime(),
        status: 'completed',
        exitCode: 0,
        prompt,
        rawOutput,
        events: normalizeObservableEvents(events),
      },
    };
  } catch (error) {
    const detail = String(error.stderr || error.message || '').trim();
    throw new Error(`${provider} 评价失败${detail ? `：${detail}` : ''}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

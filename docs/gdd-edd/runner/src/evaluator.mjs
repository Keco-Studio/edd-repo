import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validateAiEvaluation } from './contracts.mjs';

const execFileAsync = promisify(execFile);
const DEFAULT_SCHEMA_PATH = fileURLToPath(new URL('../../schemas/evaluation-v1.schema.json', import.meta.url));
const fail = (message) => { throw new Error(message); };

function requiredText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) fail(`${label}必须为非空字符串`);
  return text;
}

export function buildEvaluationMessages({ evalCase, gdd, rubric, promptTemplate }) {
  if (!evalCase) fail('必须提供 Eval Case');
  const values = {
    title: requiredText(evalCase.title, '评价标题'),
    gdd: requiredText(gdd, '本次 GDD'),
    rubric: requiredText(rubric, '固定 Rubric'),
  };
  const content = requiredText(promptTemplate, '评分 Prompt').replace(/\{\{([A-Za-z0-9]+)\}\}/g, (_match, key) => {
    if (!(key in values)) fail(`未知 Prompt 占位符：${key}`);
    return values[key];
  }).trim();
  if (/\{\{[^}]+\}\}/.test(content)) fail('评分 Prompt 仍有未替换占位符');
  return Object.freeze([Object.freeze({ role: 'user', content })]);
}

export function buildProviderInvocation(provider, { cwd, schemaPath, outputPath, schema, prompt, model }) {
  if (provider === 'codex') {
    const modelArgs = model ? ['--model', model] : [];
    return {
      command: 'codex',
      args: [
        'exec', '--ephemeral', '--sandbox', 'read-only', '-c', 'model_reasoning_effort="medium"',
        ...modelArgs, '--json', '--output-schema', schemaPath, '--output-last-message', outputPath,
        '--color', 'never', '-C', cwd, prompt,
      ],
    };
  }
  if (provider === 'claude') {
    const { $schema: _draft, ...claudeSchema } = schema;
    return {
      command: 'claude',
      args: [
        '-p', '--safe-mode', '--tools', '', '--model', model || 'sonnet', '--effort', 'medium',
        '--permission-mode', 'dontAsk', '--no-session-persistence', '--verbose', '--output-format',
        'stream-json', '--json-schema', JSON.stringify(claudeSchema), prompt,
      ],
    };
  }
  fail(`不支持的 Provider：${provider}`);
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
      try { return JSON.parse(event.result); } catch { /* keep searching */ }
    }
  }
  fail('Cloud 未返回结构化 JSON');
}

async function defaultRunner(command, args, options) {
  return execFileAsync(command, args, options);
}

export async function runCloudEvaluation(options = {}) {
  const provider = options.provider || 'codex';
  const messages = options.messages;
  if (!Array.isArray(messages) || messages.length !== 1 || messages[0]?.role !== 'user') {
    fail('Cloud 请求必须只有一条完整 user 消息');
  }
  const prompt = requiredText(messages[0].content, 'Cloud user 消息');
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  const schema = options.schema || JSON.parse(await readFile(schemaPath, 'utf8'));
  const requestedModel = options.model || (provider === 'claude' ? 'sonnet' : '本地默认配置');
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'gdd-edd-cloud-'));
  const outputPath = join(temporaryRoot, 'response.json');
  const invocation = buildProviderInvocation(provider, {
    cwd: temporaryRoot,
    schemaPath,
    outputPath,
    schema,
    prompt,
    model: options.model,
  });
  const runner = options.runner || defaultRunner;
  const started = new Date();
  try {
    const result = await runner(invocation.command, invocation.args, {
      cwd: temporaryRoot,
      timeout: options.timeoutMs || 600_000,
      maxBuffer: 8 * 1024 * 1024,
      env: process.env,
    });
    const events = jsonLines(result.stdout);
    let rawResponse;
    if (provider === 'codex') {
      try { rawResponse = JSON.parse(await readFile(outputPath, 'utf8')); }
      catch { fail('Codex 未写入有效结构化 JSON'); }
    } else {
      rawResponse = parseClaudeOutput(events);
    }
    const evaluation = validateAiEvaluation(rawResponse, options.evalCase);
    const finished = new Date();
    return {
      rawResponse,
      evaluation,
      request: {
        messages,
        provider,
        requestedModel,
        generationParameters: { reasoningEffort: 'medium' },
      },
      execution: {
        provider,
        requestedModel,
        observedModel: findObservedModel(events),
        generationParameters: { reasoningEffort: 'medium' },
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs: finished.getTime() - started.getTime(),
        status: 'completed',
        exitCode: 0,
        events: normalizeObservableEvents(events),
      },
    };
  } catch (error) {
    const detail = String(error.stderr || error.message || '').trim();
    throw new Error(`${provider} 评价失败${detail ? `：${detail}` : ''}`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

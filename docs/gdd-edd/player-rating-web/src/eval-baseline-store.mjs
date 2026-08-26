import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const safePart = (value, label) => {
  const input = String(value || '');
  if (label === '模型' && input === '本地默认配置') return 'local-default';
  if (!input || input.includes('..') || input.includes('/') && label === 'Case') throw new Error(`${label}标识无效`);
  const normalized = input.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!normalized) throw new Error(`${label}标识无效`);
  return normalized;
};

export function baselinePath(root, caseId, provider, requestedModel) {
  const safeCase = safePart(caseId, 'Case');
  const file = `${safePart(provider, 'Provider')}-${safePart(requestedModel, '模型')}.json`;
  return join(root, safeCase, file);
}

export async function readBaseline(path) {
  let content;
  try { content = await readFile(path, 'utf8'); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error(`基线不存在：${path}`);
    throw error;
  }
  try { return JSON.parse(content); }
  catch { throw new Error(`基线 JSON 无效：${path}`); }
}

export async function writeBaseline(path, baseline, options = {}) {
  await mkdir(dirname(path), { recursive: true });
  if (!options.force) {
    try { await access(path); throw new Error(`基线已存在：${path}；使用 --force 覆盖`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const content = `${JSON.stringify(baseline, null, 2)}\n`;
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
  const readback = await readBaseline(path);
  if (JSON.stringify(readback) !== JSON.stringify(baseline)) throw new Error('基线回读不一致');
  return readback;
}

export function compareConfiguration(baseline, current) {
  if (baseline.schemaVersion !== current.schemaVersion) throw new Error('基线 Schema 版本不兼容');
  if (baseline.case?.id !== current.case?.id) throw new Error('Eval Case 不兼容');
  if (baseline.provider !== current.provider) throw new Error('Provider 不兼容');
  if (baseline.requestedModel !== current.requestedModel) throw new Error('请求模型不兼容');
  if (baseline.hashes?.gdd !== current.hashes?.gdd) throw new Error('GDD 已变化，请建立独立基线');
  const labels = { prompt: 'Prompt hash', rubric: 'Rubric hash', schema: 'Schema hash', resultTemplate: 'Result Template hash' };
  const changes = Object.entries(labels)
    .filter(([key]) => baseline.hashes?.[key] !== current.hashes?.[key])
    .map(([, label]) => label);
  if (JSON.stringify(baseline.observedModels || []) !== JSON.stringify(current.observedModels || [])) changes.push('Observed model');
  return changes;
}

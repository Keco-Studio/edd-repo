import { readFile } from 'node:fs/promises';

const fail = (message) => { throw new Error(message); };
const APPROVED_PLUGIN = /^(?:keco|keco:[a-z0-9][a-z0-9-]*)$/;

function requiredText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) fail(`${label}必须为非空字符串`);
  return text;
}

export function validateIsolationManifest(raw = {}) {
  const expected = ['contextSources', 'createdAt', 'enabledPlugins', 'freshSession', 'sessionId'];
  const actual = Object.keys(raw).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`隔离清单字段必须严格为：${expected.join('、')}`);
  }
  if (raw.freshSession !== true) fail('被测运行必须使用全新 session');
  if (!Array.isArray(raw.contextSources) || raw.contextSources.length !== 0) fail('被测运行的上下文来源必须为空');
  if (!Array.isArray(raw.enabledPlugins) || raw.enabledPlugins.length < 1) fail('被测运行必须至少启用一个自研 MCP');
  const enabledPlugins = raw.enabledPlugins.map((name) => requiredText(name, '插件名称'));
  if (enabledPlugins.some((name) => !APPROVED_PLUGIN.test(name))) fail('被测运行只允许 Keco 自研 MCP 插件');
  if (new Set(enabledPlugins).size !== enabledPlugins.length) fail('启用插件列表不得重复');
  const createdAt = requiredText(raw.createdAt, '隔离清单创建时间');
  if (Number.isNaN(Date.parse(createdAt))) fail('隔离清单创建时间必须为有效 ISO 时间');
  return Object.freeze({
    sessionId: requiredText(raw.sessionId, 'Session ID'),
    freshSession: true,
    contextSources: Object.freeze([]),
    enabledPlugins: Object.freeze(enabledPlugins),
    createdAt,
  });
}

export async function loadIsolationManifest(path) {
  let raw;
  try {
    raw = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    fail(`隔离清单不是有效 JSON：${error.message}`);
  }
  return validateIsolationManifest(raw);
}

import { access, readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CORE_REASONS = ['unclear_goal', 'repetitive', 'weak_feedback', 'poor_pacing', 'low_agency'];
export const EXPERIENCE_REASONS = ['ui_clarity', 'visual_style', 'controls', 'difficulty', 'low_engagement'];

const fail = (message) => { throw new Error(message); };
const integer = (value, min, max, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) fail(`${label}必须为 ${min}-${max} 的整数`);
  return number;
};

export function validateRating(input = {}) {
  const coreScore = integer(input.coreScore, 1, 5, '核心玩法评分');
  const experienceScore = integer(input.experienceScore, 1, 5, '玩家体验评分');
  const validateReasons = (values, allowed) => {
    if (!Array.isArray(values) || values.length > allowed.length || values.some((value) => !allowed.includes(value))) fail('包含未知问题原因');
    return [...new Set(values)];
  };
  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
  if (comment.length > 300) fail('反馈最多 300 字');
  return {
    coreScore,
    experienceScore,
    coreReasons: validateReasons(input.coreReasons || [], CORE_REASONS),
    experienceReasons: validateReasons(input.experienceReasons || [], EXPERIENCE_REASONS),
    comment,
  };
}

export async function resolveResultDocument(name, root) {
  if (typeof name !== 'string' || basename(name) !== name || !name.endsWith('.md')) fail('结果文档无效');
  const rootPath = root instanceof URL ? fileURLToPath(root) : resolve(root);
  let files;
  try { files = await readdir(rootPath); } catch { fail('结果文档目录不可用'); }
  if (!files.includes(name)) fail('结果文档不在允许列表中');
  const path = resolve(rootPath, name);
  await access(path);
  return path;
}
